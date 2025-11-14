import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface WebhookMapping {
  [endpoint: string]: {
    token: string;
    webhookUrl: string;
  };
}

// Recursively scan directory for route.ts files
function scanDirectory(dir: string, baseDir: string): WebhookMapping {
  const mapping: WebhookMapping = {};

  if (!fs.existsSync(dir)) {
    return mapping;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      Object.assign(mapping, scanDirectory(fullPath, baseDir));
    } else if (item === 'route.ts' || item === 'route.js') {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Look for webhook URLs
        const webhookRegex = /webhook\.uselux\.ai\/flow\/([a-f0-9-]+)/gi;
        const matches = content.matchAll(webhookRegex);

        for (const match of matches) {
          const token = match[1]; // This is the webhook token, not the flow ID
          const webhookUrl = match[0];

          // Extract endpoint path
          const relativePath = path.relative(baseDir, path.dirname(fullPath));
          const endpoint = '/api/' + relativePath.replace(/\\/g, '/');

          mapping[endpoint] = {
            token,
            webhookUrl: `https://${webhookUrl}`
          };
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }
  }

  return mapping;
}

export async function GET() {
  try {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    const webhookMapping = scanDirectory(apiDir, apiDir);

    return NextResponse.json({
      success: true,
      webhooks: webhookMapping,
      count: Object.keys(webhookMapping).length
    });
  } catch (error) {
    console.error('Error scanning for webhooks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        webhooks: {}
      },
      { status: 500 }
    );
  }
}
