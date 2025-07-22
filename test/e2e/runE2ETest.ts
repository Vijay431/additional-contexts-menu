import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    console.log('🚀 Starting Additional Context Menus E2E Tests...');

    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../../..').replace(/\\/g, '/');

    // The path to the E2E test runner (compiled JavaScript version)  
    const extensionTestsPath = path.resolve(__dirname, './index.js').replace(/\\/g, '/');

    console.log('📁 Extension path:', extensionDevelopmentPath);
    console.log('🧪 E2E tests path:', extensionTestsPath);

    // Download VS Code, unzip it and run the E2E tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions', // Disable other extensions during testing
        '--disable-workspace-trust', // Skip workspace trust dialog
        extensionDevelopmentPath // Open the extension's workspace folder
      ],
    });

    console.log('✅ All E2E tests completed successfully!');
  } catch (err) {
    console.error('❌ E2E tests failed:', err);
    process.exit(1);
  }
}

main();