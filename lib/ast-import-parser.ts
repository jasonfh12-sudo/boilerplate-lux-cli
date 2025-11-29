/**
 * Parse imports recursively to find all components in a bundle
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

export interface ImportedComponent {
  name: string;
  filePath: string;
  importedFrom: string;
}

/**
 * Resolve an import path to an absolute file path
 */
function resolveImportPath(importPath: string, fromFile: string, projectRoot: string): string | null {
  try {
    let resolvedPath: string;

    // Handle @/ alias (maps to src/)
    if (importPath.startsWith('@/')) {
      resolvedPath = path.join(projectRoot, importPath.replace('@/', 'src/'));
    }
    // Handle relative imports
    else if (importPath.startsWith('.')) {
      // fromFile is absolute, so get its directory and resolve the relative import
      const dir = path.dirname(fromFile);
      resolvedPath = path.join(dir, importPath);
    }
    // Handle bare imports (shouldn't happen for local files, but just in case)
    else {
      resolvedPath = path.join(projectRoot, 'src', importPath);
    }

    // Try to find the file with various extensions
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // If no extension works, try as-is
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }

    return null;
  } catch (error) {
    console.error('Error resolving import path:', importPath, error);
    return null;
  }
}

/**
 * Extract component name from file path
 */
function getComponentNameFromPath(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));

  // Capitalize first letter
  if (fileName === 'index') {
    // For index files, use the directory name
    const dirName = path.basename(path.dirname(filePath));
    return dirName.charAt(0).toUpperCase() + dirName.slice(1);
  }

  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

/**
 * Parse a file and extract all its imports
 */
function extractImports(filePath: string): string[] {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const imports: string[] = [];

    traverse(ast, {
      ImportDeclaration(path) {
        const importSource = path.node.source.value;

        // Skip node_modules imports (only track local components)
        if (!importSource.startsWith('.') && !importSource.startsWith('@/')) {
          return;
        }

        imports.push(importSource);
      },
    });

    return imports;
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return [];
  }
}

/**
 * Recursively find all components imported by a file
 */
export function findAllImportedComponents(
  entryFilePath: string,
  projectRoot: string
): ImportedComponent[] {
  const visited = new Set<string>();
  const components: ImportedComponent[] = [];

  function traverse(filePath: string, importedFrom: string, depth = 0) {
    // Normalize path
    const normalizedPath = path.normalize(filePath);
    const indent = '  '.repeat(depth);

    console.log(`${indent}🔍 Traversing: ${path.relative(projectRoot, normalizedPath)}`);

    if (visited.has(normalizedPath)) {
      console.log(`${indent}⏭️  Already visited, skipping`);
      return;
    }

    visited.add(normalizedPath);

    // Extract imports from this file
    const imports = extractImports(normalizedPath);
    console.log(`${indent}📦 Found ${imports.length} imports:`, imports);

    imports.forEach((importPath) => {
      console.log(`${indent}  🔗 Resolving import: ${importPath}`);
      const resolvedPath = resolveImportPath(importPath, normalizedPath, projectRoot);

      if (resolvedPath && fs.existsSync(resolvedPath)) {
        const componentName = getComponentNameFromPath(resolvedPath);
        const relativePath = path.relative(projectRoot, resolvedPath);

        console.log(`${indent}  ✅ Resolved to: ${relativePath} (${componentName})`);

        components.push({
          name: componentName,
          filePath: relativePath,
          importedFrom: path.relative(projectRoot, normalizedPath),
        });

        // Recursively traverse this import
        traverse(resolvedPath, relativePath, depth + 1);
      } else {
        console.log(`${indent}  ❌ Could not resolve: ${importPath} -> ${resolvedPath}`);
      }
    });
  }

  traverse(entryFilePath, entryFilePath);

  return components;
}

/**
 * Get unique component names from the list
 */
export function getUniqueComponentNames(components: ImportedComponent[]): string[] {
  const names = new Set<string>();
  components.forEach(comp => names.add(comp.name));
  return Array.from(names).sort();
}
