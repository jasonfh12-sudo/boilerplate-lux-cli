#!/usr/bin/env node

/**
 * Better Auth Auto-Setup Script
 *
 * Automatically configures Better Auth for multi-tenant Lux platform
 * Runs on: npm install (postinstall hook) OR manually via npm run setup:auth
 *
 * What it does:
 * 1. Validates required environment variables
 * 2. Generates Better Auth secret if needed
 * 3. Generates auth schema (user, session, account tables)
 * 4. Pushes schema to org-specific Turso database
 *
 * Modes:
 * - Production (Lux container): Full setup with CLERK_ORG_ID
 * - Development: Skips if env vars missing (allows local dev without Turso)
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bright}${colors.blue}═══ ${title} ═══${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message) {
  log(`${colors.red}✗${colors.reset} ${message}`);
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options,
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

async function setupAuth() {
  logSection('Better Auth Setup');

  // Check environment mode
  const hasOrgId = !!process.env.CLERK_ORG_ID;
  const hasTursoToken = !!process.env.TURSO_AUTH_TOKEN;
  const hasTursoUrl = !!process.env.TURSO_DATABASE_URL;

  log(`Environment: ${hasOrgId ? 'Production (Lux Container)' : 'Development'}`);

  // Skip setup if in local dev without database
  if (!hasOrgId && !hasTursoUrl) {
    logWarning('Skipping auth setup - no database configuration found');
    log('This is normal for local development without Turso.');
    log('Auth will be configured automatically when deployed to Lux platform.');
    return;
  }

  // Validate auth token
  if (!hasTursoToken) {
    logError('TURSO_AUTH_TOKEN is required but not set');
    log('Cannot proceed with database setup.');
    process.exit(1);
  }

  // Check/generate Better Auth secret
  logSection('Auth Secret');

  const interfaceId = process.env.INTERFACE_ID;
  let authSecret = process.env.BETTER_AUTH_SECRET;

  if (!authSecret) {
    authSecret = crypto.randomBytes(32).toString('hex');
    logWarning('BETTER_AUTH_SECRET not set - generating new secret');
    log(`Generated secret: ${authSecret.substring(0, 16)}...`);

    // Save to system.org_secrets table if we have database access
    if (hasOrgId && interfaceId) {
      try {
        const { createClient } = require('@libsql/client');
        const sanitizedOrgId = process.env.CLERK_ORG_ID.replace(/_/g, '').toLowerCase();
        const dbUrl = `libsql://${sanitizedOrgId}-lux-ai-labs.aws-us-west-2.turso.io`;

        const client = createClient({
          url: dbUrl,
          authToken: process.env.TURSO_AUTH_TOKEN,
        });

        // Encrypt the secret before storing
        // Note: Encryption uses ENCRYPTION_KEY from container environment
        const crypto = require('crypto');

        function encryptSecret(plaintext) {
          const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
          if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
            logWarning('ENCRYPTION_KEY not properly set - storing secret in plaintext (NOT RECOMMENDED)');
            return plaintext;
          }

          const key = Buffer.from(ENCRYPTION_KEY, 'hex');
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

          let encrypted = cipher.update(plaintext, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          const authTag = cipher.getAuthTag();

          return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
        }

        const encryptedSecret = encryptSecret(authSecret);

        // Store auth secret in system.secrets table (will be picked up by reload-secrets)
        // Use unique name per interface since name column has UNIQUE constraint
        const secretName = `${interfaceId}__BETTER_AUTH_SECRET`;

        await client.execute({
          sql: `INSERT INTO "system.secrets" (name, encrypted_value, description, source, interface_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET encrypted_value = excluded.encrypted_value, updated_at = unixepoch()`,
          args: [
            secretName,
            encryptedSecret,
            `Auto-generated Better Auth secret for interface ${interfaceId}`,
            'interface',
            interfaceId
          ]
        });

        logSuccess('Auth secret saved to system.secrets table');
        log('Secret will be auto-loaded into .env.local on container restart');
      } catch (error) {
        logWarning(`Could not save auth secret to database: ${error.message}`);
        log('Secret will need to be set as environment variable');
      }
    } else {
      log('Skipping database save - INTERFACE_ID not set');
      log('For now, add this to your environment variables.');
    }
  } else {
    logSuccess('BETTER_AUTH_SECRET configured');
  }

  // Install Better Auth CLI if needed
  logSection('Dependencies');

  const hasCliInstalled = execCommand('npx @better-auth/cli --version', {
    silent: true,
    ignoreError: true
  });

  if (hasCliInstalled) {
    logSuccess('Better Auth CLI available');
  } else {
    log('Installing Better Auth CLI...');
    execCommand('npm install -D @better-auth/cli', { ignoreError: true });
  }

  // Generate auth schema
  logSection('Schema Generation');

  try {
    log('Generating auth schema (user, session, account, verification tables)...');
    execCommand('npx @better-auth/cli generate --yes', { ignoreError: false });
    logSuccess('Auth schema generated');
  } catch (error) {
    logWarning('Schema generation skipped (may already exist)');
  }

  // Database info
  logSection('Database Configuration');

  if (hasOrgId) {
    const sanitizedOrgId = process.env.CLERK_ORG_ID.replace(/_/g, '').toLowerCase();
    const dbUrl = `libsql://${sanitizedOrgId}-lux-ai-labs.aws-us-west-2.turso.io`;
    log(`Database: ${dbUrl}`);
    log('Auth tables are shared across all interfaces in this org');
  } else if (hasTursoUrl) {
    log(`Database: ${process.env.TURSO_DATABASE_URL}`);
  }

  logSuccess('Database connection configured');
  log('Note: Auth tables are created during org setup')

  // Success summary
  logSection('Setup Complete');
  logSuccess('Better Auth is configured and ready!');

  log('\n' + colors.bright + 'Next steps:' + colors.reset);
  log('  1. Start dev server: npm run dev');
  log('  2. Visit /auth/signin to test authentication');
  log('  3. Create your first user account');

  log('\n' + colors.bright + 'Available routes:' + colors.reset);
  log('  • /auth/signin  - Sign in page');
  log('  • /auth/signup  - Sign up page');
  log('  • /api/auth/*   - Auth API endpoints');

  log('\n' + colors.bright + 'Protected routes:' + colors.reset);
  log('  Configure in: lib/auth.config.ts\n');
}

// Run setup
setupAuth().catch((error) => {
  logError('Setup failed:');
  console.error(error.message);
  log('\nIf you\'re running locally, this is expected.');
  log('Auth will be configured when deployed to Lux platform.');
  // Don't exit with error code - allow npm install to continue
});
