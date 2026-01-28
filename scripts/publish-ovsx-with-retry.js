#!/usr/bin/env node

/**
 * Open VSX Publishing Script with Retry Logic
 *
 * This script implements robust Open VSX publishing with:
 * - Exponential backoff retry mechanism
 * - Detailed error logging
 * - Graceful failure handling
 *
 * Requirements: 4.1, 9.1, 9.2, 9.3, 9.5
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // 2 seconds
const BACKOFF_MULTIPLIER = 2;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find VSIX file in current directory
 */
function findVsixFile() {
  const files = fs.readdirSync('.');
  const vsixFiles = files.filter((file) => file.endsWith('.vsix'));

  if (vsixFiles.length === 0) {
    throw new Error('No VSIX file found in current directory');
  }

  if (vsixFiles.length > 1) {
    console.warn(`Multiple VSIX files found: ${vsixFiles.join(', ')}`);
    console.warn(`Using: ${vsixFiles[0]}`);
  }

  return vsixFiles[0];
}

/**
 * Attempt to publish to Open VSX with detailed error handling
 */
async function attemptPublish(vsixFile, attempt) {
  console.log(`📦 Attempt ${attempt}/${MAX_RETRIES}: Publishing ${vsixFile} to Open VSX...`);

  try {
    const result = execSync(`npx ovsx publish "${vsixFile}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      env: {
        ...process.env,
        OVSX_PAT: process.env.OVSX_PAT,
      },
    });

    console.log('✅ Open VSX publication successful!');
    console.log('Output:', result);
    return { success: true, output: result };
  } catch (error) {
    console.error(`❌ Attempt ${attempt} failed:`);
    console.error('Exit code:', error.status);
    console.error('Error output:', error.stderr);
    console.error('Standard output:', error.stdout);

    // Analyze error type for better handling
    const errorMessage = error.stderr || error.stdout || error.message;

    if (
      errorMessage.includes('401') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Invalid access token')
    ) {
      console.error('🔐 Authentication error - check OVSX_PAT token');
      return { success: false, error: 'AUTHENTICATION_ERROR', message: errorMessage, retry: false };
    }

    if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
      console.error('📦 Version already exists in Open VSX Registry');
      return { success: false, error: 'VERSION_EXISTS', message: errorMessage, retry: false };
    }

    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ETIMEDOUT')
    ) {
      console.error('🌐 Network/timeout error - will retry');
      return { success: false, error: 'NETWORK_ERROR', message: errorMessage, retry: true };
    }

    if (
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503')
    ) {
      console.error('🔧 Server error - will retry');
      return { success: false, error: 'SERVER_ERROR', message: errorMessage, retry: true };
    }

    // Unknown error - retry once more
    console.error('❓ Unknown error - will retry');
    return { success: false, error: 'UNKNOWN_ERROR', message: errorMessage, retry: true };
  }
}

/**
 * Main publishing function with retry logic
 */
async function publishWithRetry() {
  console.log('🚀 Starting Open VSX publication with retry logic...');

  // Validate environment
  if (!process.env.OVSX_PAT) {
    console.error('❌ OVSX_PAT environment variable is not set');
    process.exit(1);
  }

  // Find VSIX file
  let vsixFile;
  try {
    vsixFile = findVsixFile();
    console.log(`📁 Found VSIX file: ${vsixFile}`);
  } catch (error) {
    console.error('❌ Error finding VSIX file:', error.message);
    process.exit(1);
  }

  // Attempt publication with retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await attemptPublish(vsixFile, attempt);

    if (result.success) {
      console.log('🎉 Open VSX publication completed successfully!');
      process.exit(0);
    }

    // Handle non-retryable errors
    if (!result.retry) {
      console.error(`💥 Non-retryable error (${result.error}): ${result.message}`);

      if (result.error === 'VERSION_EXISTS') {
        console.log(
          'ℹ️  This is not necessarily a failure - the version may have been published previously',
        );
        process.exit(0); // Exit successfully for version conflicts
      }

      process.exit(1);
    }

    // Calculate delay for next attempt
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  console.error(`💥 All ${MAX_RETRIES} attempts failed. Open VSX publication unsuccessful.`);
  console.error('🔧 Manual intervention required. Try running:');
  console.error(`   npx ovsx publish "${vsixFile}" -p $OVSX_PAT`);
  process.exit(1);
}

// Run the script
if (require.main === module) {
  publishWithRetry().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { publishWithRetry, findVsixFile };
