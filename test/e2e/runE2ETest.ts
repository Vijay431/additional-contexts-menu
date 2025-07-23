import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';

/**
 * Find the project root directory by looking for package.json
 * This works regardless of where the compiled test files are located
 */
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      // Verify this is our extension's package.json by checking the name
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name === 'additional-context-menus') {
          return currentDir;
        }
      } catch (error) {
        // Continue searching if package.json is malformed
      }
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error('Could not find project root containing package.json');
}

async function main() {
  try {
    console.log('🚀 Starting Additional Context Menus E2E Tests...');

    // Find the project root dynamically
    const projectRoot = findProjectRoot(__dirname);
    const extensionDevelopmentPath = projectRoot.replace(/\\/g, '/');

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
        extensionDevelopmentPath, // Open the extension's workspace folder
      ],
    });

    console.log('✅ All E2E tests completed successfully!');
  } catch (err) {
    console.error('❌ E2E tests failed:', err);
    process.exit(1);
  }
}

main();
