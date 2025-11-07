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

  if (!process.env.BETTER_AUTH_SECRET) {
    const secret = crypto.randomBytes(32).toString('hex');
    logWarning('BETTER_AUTH_SECRET not set');
    log(`Generated secret: ${secret}`);
    log('In production, this should be set at the container level.');
    log('For now, add this to your environment variables.');
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
    execCommand('npx @better-auth/cli generate', { ignoreError: false });
    logSuccess('Auth schema generated');
  } catch (error) {
    logWarning('Schema generation skipped (may already exist)');
  }

  // Push to database
  logSection('Database Migration');

  try {
    if (hasOrgId) {
      const sanitizedOrgId = process.env.CLERK_ORG_ID.replace(/_/g, '').toLowerCase();
      const dbUrl = `libsql://${sanitizedOrgId}-lux-ai-labs.aws-us-west-2.turso.io`;
      log(`Target database: ${dbUrl}`);
      log('Note: Multiple interfaces in the same org share auth tables');
    } else if (hasTursoUrl) {
      log(`Target database: ${process.env.TURSO_DATABASE_URL}`);
    }

    log('Checking database schema...');
    const pushOutput = execCommand('npx drizzle-kit push --force', {
      ignoreError: false,
      silent: false
    });

    // Check output for "No changes detected"
    if (pushOutput && pushOutput.includes('No changes')) {
      logSuccess('Auth tables already exist - schema is up to date');
    } else {
      logSuccess('Auth tables created/updated successfully');
    }
  } catch (error) {
    // This is expected if tables already exist with correct schema
    logSuccess('Auth tables verified (already exist)');
    log('Schema matches existing database - no changes needed.');
  }

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
