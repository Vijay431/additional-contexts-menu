import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';

/**
 * Find the project root directory by looking for package.json
 */
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
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
    console.log('🚀 Starting Unit Tests...');

    // Find the project root dynamically
    const projectRoot = findProjectRoot(__dirname);

    // Use the minimal extension for testing
    const extensionDevelopmentPath = path.join(projectRoot, '.vscode-test', 'minimal-extension').replace(/\\/g, '/');

    // The path to the unit test runner (compiled JavaScript version)
    const extensionTestsPath = path.resolve(__dirname, './index.js').replace(/\\/g, '/');

    console.log('📁 Extension path:', extensionDevelopmentPath);
    console.log('🧪 Unit tests path:', extensionTestsPath);

    // Download VS Code, unzip it and run the unit tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    console.log('✅ All unit tests completed successfully!');
  } catch (err) {
    console.error('❌ Unit tests failed:', err);
    process.exit(1);
  }
}

main();
