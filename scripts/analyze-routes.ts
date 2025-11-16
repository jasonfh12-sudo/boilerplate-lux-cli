import { Project, SyntaxKind, SourceFile } from 'ts-morph';
import { globSync } from 'glob';
import * as path from 'path';

interface TableSchema {
  tableName: string;
  columns: string[];
  operations: ('read' | 'write' | 'update' | 'delete')[];
}

interface ApiSchema {
  apiRoute: string;
  tables: TableSchema[];
}

interface PageAnalysis {
  page: string;
  filePath: string;
  apiFetches: string[];
  pageType: 'user-facing' | 'redirect' | 'flow';
  confidence: 'high' | 'medium' | 'low';
  schemas: ApiSchema[];
}

function detectPageType(route: string, sourceFile: SourceFile): { type: 'user-facing' | 'redirect' | 'flow', confidence: 'high' | 'medium' | 'low' } {
  const text = sourceFile.getText();

  // Count redirects and their positions
  const routerPushCount = (text.match(/router\.push/g) || []).length;
  const redirectCount = (text.match(/redirect\(/g) || []).length;
  const totalRedirects = routerPushCount + redirectCount;

  // Check for immediate redirect patterns
  const useEffectCalls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getExpression().getText() === 'useEffect');

  let hasImmediateRedirect = false;
  for (const useEffect of useEffectCalls) {
    const callback = useEffect.getArguments()[0];
    if (callback) {
      const effectText = callback.getText();
      const lines = effectText.split('\n').slice(0, 5).join('\n');
      if (lines.includes('router.push') || lines.includes('redirect(')) {
        hasImmediateRedirect = true;
        break;
      }
    }
  }

  // Count UI complexity
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).length;
  const jsxSelfClosing = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length;
  const totalJSX = jsxElements + jsxSelfClosing;

  // Check for loading/redirect text patterns
  const loadingPatterns = /Setting up|Redirecting|Processing|Please wait|Signing out|Accepting/i;
  const hasLoadingText = loadingPatterns.test(text);

  // Check for forms (indicates user interaction)
  const hasForms = /<form/i.test(text) || text.includes('onSubmit');
  const hasInputs = /<input/i.test(text) || /<textarea/i.test(text);

  // URL-based patterns
  const redirectPatterns = [
    /callback$/i,
    /\/logout$/i,
    /\/unauthorized$/i,
    /\/error$/i,
  ];
  const isRedirectRoute = redirectPatterns.some(pattern => pattern.test(route));

  // Decision logic

  // HIGH CONFIDENCE REDIRECT: URL pattern + immediate redirect
  if (isRedirectRoute && hasImmediateRedirect) {
    return { type: 'redirect', confidence: 'high' };
  }

  // HIGH CONFIDENCE REDIRECT: Loading text + immediate redirect + minimal UI + no forms
  if (hasLoadingText && hasImmediateRedirect && totalJSX < 15 && !hasForms) {
    return { type: 'redirect', confidence: 'high' };
  }

  // MEDIUM CONFIDENCE REDIRECT: Has redirect + loading text + minimal UI
  if (totalRedirects >= 1 && hasLoadingText && totalJSX < 10 && !hasForms) {
    return { type: 'redirect', confidence: 'medium' };
  }

  // FLOW PAGE: Has forms/inputs + redirects (auth flows, onboarding)
  if (hasForms && totalRedirects >= 1) {
    return { type: 'flow', confidence: 'medium' };
  }

  // USER-FACING: Complex UI, forms, or no immediate redirects
  if (totalJSX > 20 || (hasForms && !hasImmediateRedirect)) {
    return { type: 'user-facing', confidence: 'high' };
  }

  // Default to user-facing with low confidence
  return { type: 'user-facing', confidence: 'low' };
}

function analyzeApiRoute(apiPath: string, project: Project): TableSchema[] {
  // Convert API path to file path
  // /api/auth/forget-password -> app/api/auth/forget-password/route.ts
  const routeFilePath = path.join(process.cwd(), 'app', apiPath, 'route.ts');

  try {
    const sourceFile = project.addSourceFileAtPath(routeFilePath);
    const text = sourceFile.getText();

    const tablesMap = new Map<string, TableSchema>();

    // Find imports from schema files
    const importDeclarations = sourceFile.getImportDeclarations();
    const schemaImports = new Map<string, string>(); // localName -> importedName

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier.includes('schema')) {
        const namedImports = importDecl.getNamedImports();
        for (const namedImport of namedImports) {
          const name = namedImport.getName();
          const alias = namedImport.getAliasNode()?.getText() || name;
          schemaImports.set(alias, name);
        }
      }
    }

    // Detect table queries and operations
    for (const [localName, importedName] of schemaImports) {
      // Find .from(tableName) patterns
      const fromPattern = new RegExp(`\\.from\\(${localName}\\)`, 'g');
      const hasFrom = fromPattern.test(text);

      if (hasFrom) {
        if (!tablesMap.has(importedName)) {
          tablesMap.set(importedName, {
            tableName: importedName,
            columns: [],
            operations: []
          });
        }

        const tableSchema = tablesMap.get(importedName)!;

        // Detect operations
        if (text.includes('.select()')) tableSchema.operations.push('read');
        if (text.includes('.insert(') || text.includes('.values(')) tableSchema.operations.push('write');
        if (text.includes('.update(') || text.includes('.set(')) tableSchema.operations.push('update');
        if (text.includes('.delete()')) tableSchema.operations.push('delete');

        // Detect column access patterns: tableName.columnName
        const columnPattern = new RegExp(`${localName}\\.(\\w+)`, 'g');
        let match;
        while ((match = columnPattern.exec(text)) !== null) {
          const columnName = match[1];
          // Filter out common method names
          if (!['select', 'insert', 'update', 'delete', 'from', 'where'].includes(columnName)) {
            if (!tableSchema.columns.includes(columnName)) {
              tableSchema.columns.push(columnName);
            }
          }
        }

        // Deduplicate operations
        tableSchema.operations = [...new Set(tableSchema.operations)];
      }
    }

    return Array.from(tablesMap.values());
  } catch (error) {
    // API route file doesn't exist or can't be parsed
    console.log(`   ⚠️  Could not analyze API route: ${apiPath}`);
    return [];
  }
}

function analyzePages(): PageAnalysis[] {
  const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  });

  // Find all page.tsx files in the app directory
  const pageFiles = globSync('app/**/page.tsx', { cwd: process.cwd() });

  const results: PageAnalysis[] = [];

  for (const pageFile of pageFiles) {
    const fullPath = path.join(process.cwd(), pageFile);
    const sourceFile = project.addSourceFileAtPath(fullPath);

    // Convert file path to route
    // app/page.tsx -> /
    // app/settings/page.tsx -> /settings
    // app/app/interfaces/[id]/page.tsx -> /app/interfaces/[id]
    const route = pageFile
      .replace(/^app/, '')
      .replace(/\/page\.tsx$/, '')
      .replace(/^$/, '/');

    // Detect page type
    const { type, confidence } = detectPageType(route, sourceFile);

    const apiFetches: string[] = [];

    // Find all fetch() calls
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(callExpr => {
      const expr = callExpr.getExpression();

      // Check if it's a fetch() call
      if (expr.getText() === 'fetch') {
        const args = callExpr.getArguments();
        if (args.length > 0) {
          let url = args[0].getText();

          // Clean up the URL (remove quotes, template literals)
          url = url.replace(/^['"`]|['"`]$/g, '');

          // Only include API routes (starts with /api or contains /api/)
          if (url.startsWith('/api') || url.includes('/api/')) {
            apiFetches.push(url);
          }
        }
      }
    });

    // Remove duplicates
    const uniqueFetches = [...new Set(apiFetches)];

    // Analyze schemas for each API fetch
    const schemas: ApiSchema[] = [];
    for (const apiFetch of uniqueFetches) {
      const tables = analyzeApiRoute(apiFetch, project);
      if (tables.length > 0) {
        schemas.push({
          apiRoute: apiFetch,
          tables: tables,
        });
      }
    }

    results.push({
      page: route,
      filePath: pageFile,
      apiFetches: uniqueFetches,
      pageType: type,
      confidence: confidence,
      schemas: schemas,
    });
  }

  return results;
}

function printResults(results: PageAnalysis[]) {
  console.log('\n📊 Page & API Fetch Analysis\n');
  console.log('='.repeat(80));

  // Group by page type
  const byType = {
    'user-facing': results.filter(r => r.pageType === 'user-facing'),
    'redirect': results.filter(r => r.pageType === 'redirect'),
    'flow': results.filter(r => r.pageType === 'flow'),
  };

  // Print user-facing pages
  console.log('\n✨ USER-FACING PAGES');
  console.log('-'.repeat(80));
  for (const result of byType['user-facing']) {
    const confidenceBadge = result.confidence === 'high' ? '🟢' : result.confidence === 'medium' ? '🟡' : '🔴';
    console.log(`\n${confidenceBadge} ${result.page}`);
    console.log(`   File: ${result.filePath}`);
    if (result.apiFetches.length > 0) {
      console.log(`   API Fetches:`);
      result.apiFetches.forEach(fetch => {
        console.log(`      → ${fetch}`);
      });
    }
    if (result.schemas.length > 0) {
      console.log(`   Database Schema:`);
      result.schemas.forEach(schema => {
        console.log(`      API: ${schema.apiRoute}`);
        schema.tables.forEach(table => {
          const ops = table.operations.join(', ');
          console.log(`         📊 Table: ${table.tableName} (${ops})`);
          if (table.columns.length > 0) {
            console.log(`            Columns: ${table.columns.join(', ')}`);
          }
        });
      });
    }
  }

  // Print redirect pages
  if (byType['redirect'].length > 0) {
    console.log('\n\n🔄 REDIRECT PAGES (internal flow)');
    console.log('-'.repeat(80));
    for (const result of byType['redirect']) {
      const confidenceBadge = result.confidence === 'high' ? '🟢' : result.confidence === 'medium' ? '🟡' : '🔴';
      console.log(`\n${confidenceBadge} ${result.page}`);
      console.log(`   File: ${result.filePath}`);
      if (result.apiFetches.length > 0) {
        console.log(`   API Fetches:`);
        result.apiFetches.forEach(fetch => {
          console.log(`      → ${fetch}`);
        });
      }
      if (result.schemas.length > 0) {
        console.log(`   Database Schema:`);
        result.schemas.forEach(schema => {
          console.log(`      API: ${schema.apiRoute}`);
          schema.tables.forEach(table => {
            const ops = table.operations.join(', ');
            console.log(`         📊 Table: ${table.tableName} (${ops})`);
            if (table.columns.length > 0) {
              console.log(`            Columns: ${table.columns.join(', ')}`);
            }
          });
        });
      }
    }
  }

  // Print flow pages
  if (byType['flow'].length > 0) {
    console.log('\n\n🌊 FLOW PAGES (interactive flows)');
    console.log('-'.repeat(80));
    for (const result of byType['flow']) {
      const confidenceBadge = result.confidence === 'high' ? '🟢' : result.confidence === 'medium' ? '🟡' : '🔴';
      console.log(`\n${confidenceBadge} ${result.page}`);
      console.log(`   File: ${result.filePath}`);
      if (result.apiFetches.length > 0) {
        console.log(`   API Fetches:`);
        result.apiFetches.forEach(fetch => {
          console.log(`      → ${fetch}`);
        });
      }
      if (result.schemas.length > 0) {
        console.log(`   Database Schema:`);
        result.schemas.forEach(schema => {
          console.log(`      API: ${schema.apiRoute}`);
          schema.tables.forEach(table => {
            const ops = table.operations.join(', ');
            console.log(`         📊 Table: ${table.tableName} (${ops})`);
            if (table.columns.length > 0) {
              console.log(`            Columns: ${table.columns.join(', ')}`);
            }
          });
        });
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✓ Analyzed ${results.length} pages`);
  console.log(`   - ${byType['user-facing'].length} user-facing`);
  console.log(`   - ${byType['redirect'].length} redirects`);
  console.log(`   - ${byType['flow'].length} flows`);
  console.log('\n🟢 High confidence  🟡 Medium confidence  🔴 Low confidence\n');
}

// Run the analysis
const results = analyzePages();
printResults(results);

// Optionally save to JSON
import * as fs from 'fs';
const outputPath = path.join(process.cwd(), 'lib', 'routes-analysis.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n💾 Results saved to: ${outputPath}\n`);
