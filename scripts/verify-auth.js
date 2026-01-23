#!/usr/bin/env node

/**
 * Verification script for Open VSX authentication setup
 * This script checks if the required environment variables are available
 * and validates the authentication configuration.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Open VSX Authentication Setup...\n');

// Check if OVSX_PAT environment variable is available
const ovxsPat = process.env.OVSX_PAT;
if (!ovxsPat) {
  console.error('❌ OVSX_PAT environment variable is not set');
  console.log('   Please set the OVSX_PAT environment variable with your Open VSX token');
  console.log('   For CI/CD: Add OVSX_PAT as a GitHub repository secret');
  console.log('   For local testing: export OVSX_PAT=your_token_here\n');
  process.exit(1);
}

console.log('✅ OVSX_PAT environment variable is set');

// Check if ovsx CLI is available
try {
  const ovxsVersion = execSync('npx ovsx --version', { encoding: 'utf8' }).trim();
  console.log(`✅ OVSX CLI is available (version: ${ovxsVersion})`);
} catch (error) {
  console.error('❌ OVSX CLI is not available');
  console.log('   Please install ovsx: npm install -g ovsx');
  console.log('   Or use npx: npx ovsx --version\n');
  process.exit(1);
}

// Check if package.json has required fields for Open VSX
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const requiredFields = ['name', 'version', 'publisher', 'license', 'repository'];
const missingFields = requiredFields.filter(field => !packageJson[field]);

if (missingFields.length > 0) {
  console.error(`❌ Missing required fields in package.json: ${missingFields.join(', ')}`);
  process.exit(1);
}

console.log('✅ package.json has all required fields for Open VSX');

// Check if VSIX file exists (for manual publishing verification)
const vsixFiles = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));
if (vsixFiles.length > 0) {
  console.log(`✅ Found VSIX file(s): ${vsixFiles.join(', ')}`);
  
  // Test authentication by attempting to verify (dry run)
  try {
    console.log('🔄 Testing Open VSX authentication...');
    // Note: This is a dry run that doesn't actually publish
    execSync(`npx ovsx verify ${vsixFiles[0]}`, { 
      encoding: 'utf8',
      env: { ...process.env, OVSX_PAT: ovxsPat }
    });
    console.log('✅ Open VSX authentication is working');
  } catch (error) {
    console.error('❌ Open VSX authentication failed');
    console.error('   Error:', error.message);
    console.log('   Please check your OVSX_PAT token and try again\n');
    process.exit(1);
  }
} else {
  console.log('ℹ️  No VSIX file found. Run "npm run package" to create one for testing');
}

console.log('\n🎉 Open VSX authentication setup is complete!');
console.log('   You can now publish to Open VSX Registry using:');
console.log('   - npm run publish:ovsx (Open VSX only)');
console.log('   - npm run publish (both marketplaces)');