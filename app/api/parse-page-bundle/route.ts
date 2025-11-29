import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { findAllImportedComponents, getUniqueComponentNames } from '@/lib/ast-import-parser';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing required parameter: path' },
        { status: 400 }
      );
    }

    console.log('🔍 Parsing page bundle for:', filePath);

    // Get the project root
    const projectRoot = path.join(process.cwd());
    const absolutePath = path.join(projectRoot, filePath);

    console.log('📂 Project root:', projectRoot);
    console.log('📄 Absolute path:', absolutePath);

    // Find all imported components recursively
    const components = findAllImportedComponents(absolutePath, projectRoot);

    console.log(`✅ Found ${components.length} total component imports`);

    // Get unique component names
    const uniqueNames = getUniqueComponentNames(components);

    console.log(`📦 ${uniqueNames.length} unique components in bundle`);

    // Create a map of component name to file path (for the first occurrence)
    const componentFileMap: Record<string, string> = {};
    components.forEach((comp) => {
      if (!componentFileMap[comp.name]) {
        componentFileMap[comp.name] = comp.filePath;
      }
    });

    return NextResponse.json({
      success: true,
      components: components,
      uniqueNames: uniqueNames,
      componentFileMap: componentFileMap,
      count: components.length,
      uniqueCount: uniqueNames.length,
    });
  } catch (error) {
    console.error('❌ Error parsing page bundle:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse page bundle',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
