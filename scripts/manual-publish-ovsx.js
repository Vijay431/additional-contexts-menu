#!/usr/bin/env node

/**
 * Manual Open VSX Publishing Script
 * 
 * This script provides a manual fallback for Open VSX publishing
 * when the automated CI/CD process fails.
 * 
 * Usage: node scripts/manual-publish-ovsx.js [token]
 * 
 * Requirements: 9.4, 11.2, 11.3
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 */
function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

/**
 * Find VSIX file in current directory
 */
function findVsixFile() {
  const files = fs.readdirSync('.');
  const vsixFiles = files.filter(file => file.endsWith('.vsix'));
  
  if (vsixFiles.length === 0) {
    throw new Error('No VSIX file found in current directory');
  }
  
  if (vsixFiles.length > 1) {
    console.log(`Multiple VSIX files found:`);
    vsixFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    return vsixFiles; // Return all for user selection
  }
  
  return vsixFiles[0];
}

/**
 * Validate Open VSX token format
 */
function validateToken(token) {
  if (!token || token.length < 10) {
    return false;
  }
  
  // Basic format validation - Open VSX tokens are typically UUIDs or similar
  const tokenPattern = /^[a-zA-Z0-9\-_]{10,}$/;
  return tokenPattern.test(token);
}

/**
 * Main manual publishing function
 */
async function manualPublish() {
  console.log('🔧 Manual Open VSX Publishing Tool');
  console.log('==================================');
  console.log('');
  
  try {
    // Find VSIX file(s)
    console.log('📁 Looking for VSIX files...');
    const vsixResult = findVsixFile();
    let vsixFile;
    
    if (Array.isArray(vsixResult)) {
      console.log('');
      const selection = await prompt('Select VSIX file (enter number): ');
      const index = parseInt(selection) - 1;
      
      if (index < 0 || index >= vsixResult.length) {
        console.error('❌ Invalid selection');
        process.exit(1);
      }
      
      vsixFile = vsixResult[index];
    } else {
      vsixFile = vsixResult;
    }
    
    console.log(`📦 Selected VSIX file: ${vsixFile}`);
    console.log('');
    
    // Get token
    let token = process.argv[2] || process.env.OVSX_PAT;
    
    if (!token) {
      console.log('🔐 Open VSX Personal Access Token required');
      console.log('   Get your token from: https://open-vsx.org/user-settings/tokens');
      console.log('');
      token = await prompt('Enter your OVSX_PAT token: ');
    }
    
    if (!validateToken(token)) {
      console.error('❌ Invalid token format');
      console.error('   Token should be at least 10 characters long');
      console.error('   Get a valid token from: https://open-vsx.org/user-settings/tokens');
      process.exit(1);
    }
    
    console.log('✅ Token format looks valid');
    console.log('');
    
    // Confirm publication
    console.log(`📋 Ready to publish:`);
    console.log(`   File: ${vsixFile}`);
    console.log(`   Registry: Open VSX Registry (open-vsx.org)`);
    console.log(`   Publisher: VijayGangatharan`);
    console.log('');
    
    const confirm = await prompt('Proceed with publication? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Publication cancelled by user');
      process.exit(0);
    }
    
    console.log('');
    console.log('🚀 Starting publication...');
    
    // Attempt publication
    try {
      const result = execSync(`npx ovsx publish "${vsixFile}" -p "${token}"`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      console.log('✅ Publication successful!');
      console.log('');
      console.log('📋 Output:');
      console.log(result);
      console.log('');
      console.log('🎉 Extension is now available on Open VSX Registry!');
      console.log('   URL: https://open-vsx.org/extension/VijayGangatharan/additional-context-menus');
      console.log('');
      console.log('📱 Users can now install from:');
      console.log('  • VSCodium Extensions panel');
      console.log('  • Gitpod workspace configuration');
      console.log('  • Eclipse Theia extensions');
      
    } catch (error) {
      console.error('❌ Publication failed:');
      console.error('');
      console.error('Exit code:', error.status);
      console.error('Error output:', error.stderr);
      console.error('Standard output:', error.stdout);
      console.error('');
      
      // Provide troubleshooting guidance
      const errorMessage = error.stderr || error.stdout || error.message;
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.error('🔐 Authentication Error:');
        console.error('   • Check that your OVSX_PAT token is valid');
        console.error('   • Verify token has publishing permissions');
        console.error('   • Get a new token from: https://open-vsx.org/user-settings/tokens');
      } else if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
        console.error('📦 Version Conflict:');
        console.error('   • This version may already be published');
        console.error('   • Check: https://open-vsx.org/extension/VijayGangatharan/additional-context-menus');
        console.error('   • Consider incrementing version in package.json');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        console.error('🌐 Network Error:');
        console.error('   • Check internet connection');
        console.error('   • Try again in a few minutes');
        console.error('   • Open VSX Registry may be temporarily unavailable');
      } else {
        console.error('❓ Unknown Error:');
        console.error('   • Check Open VSX Registry status');
        console.error('   • Verify VSIX file is valid');
        console.error('   • Contact Open VSX support if issue persists');
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  manualPublish().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { manualPublish };