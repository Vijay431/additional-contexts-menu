import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';
import { execSync } from 'child_process';

/**
 * Headless Mode Configuration
 *
 * The tests can run in headless mode (default) for faster execution in CI/CD environments.
 * To disable headless mode and run with UI visible, set HEADLESS=false:
 *
 *   HEADLESS=false pnpm test
 *
 * Available test scripts:
 * - pnpm test              (canonical: headless + optimized)
 * - pnpm test:headless     (alias for pnpm test)
 * - pnpm test:headless:full (alias for SKIP_OPTIMIZATION=true pnpm run test:full)
 * - pnpm test:ui           (alias for HEADLESS=false pnpm test)
 * - pnpm test:full         (canonical: full setup without minimal package)
 * - pnpm test:ci           (alias for HEADLESS=true SKIP_OPTIMIZATION=false pnpm test)
 *
 * Use environment variables for flexibility:
 * - HEADLESS=false         - Run with VS Code UI visible
 * - SKIP_OPTIMIZATION=true - Use full extension package (no minimal package)
 */

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
      } catch (_error) {
        // Continue searching if package.json is malformed
      }
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error('Could not find project root containing package.json');
}

/**
 * Creates minimal extension package for testing
 */
async function createMinimalExtension(projectRoot: string): Promise<string> {
  console.log('📦 Creating minimal extension package...');

  try {
    const scriptPath = path.join(projectRoot, 'scripts', 'create-minimal-extension.ts');
    execSync(`tsx "${scriptPath}"`, { cwd: projectRoot, stdio: 'inherit' });

    const minimalExtensionPath = path.join(projectRoot, '.vscode-test', 'minimal-extension');
    return minimalExtensionPath.replace(/\\/g, '/');
  } catch (_error) {
    console.error('❌ Failed to create minimal extension:', _error);
    throw _error;
  }
}

/**
 * Clean up old VS Code versions to save space
 */
function cleanupOldVSCodeVersions(projectRoot: string): void {
  console.log('🧹 Cleaning up old VS Code versions...');

  const vscodeTestPath = path.join(projectRoot, '.vscode-test');
  if (!fs.existsSync(vscodeTestPath)) {
    return;
  }

  try {
    const items = fs.readdirSync(vscodeTestPath);
    const vscodeVersions = items.filter((item) => item.startsWith('vscode-'));

    if (vscodeVersions.length > 1) {
      // Sort by creation time, keep only the latest
      const versionPaths = vscodeVersions.map((version) => ({
        name: version,
        path: path.join(vscodeTestPath, version),
        mtime: fs.statSync(path.join(vscodeTestPath, version)).mtime,
      }));

      versionPaths.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remove all but the most recent version
      for (let i = 1; i < versionPaths.length; i++) {
        console.log(`   🗑️  Removing old version: ${versionPaths[i]!.name}`);
        fs.rmSync(versionPaths[i]!.path, { recursive: true, force: true });
      }

      console.log(`   ✅ Kept latest version: ${versionPaths[0]!.name}`);
    }
  } catch (_error) {
    console.warn(
      '⚠️  Warning: Could not clean up old VS Code versions:',
      (_error as Error).message,
    );
  }
}

/**
 * Create isolated user data directory for testing
 */
function createIsolatedUserData(projectRoot: string): string {
  console.log('👤 Creating isolated user data directory...');

  const userDataPath = path.join(projectRoot, '.vscode-test', 'user-data-isolated');

  // Remove existing isolated user data
  if (fs.existsSync(userDataPath)) {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  }

  // Create fresh isolated user data directory
  fs.mkdirSync(userDataPath, { recursive: true });

  console.log(`   ✅ Created isolated user data: ${userDataPath}`);
  return userDataPath.replace(/\\/g, '/');
}

/**
 * Cleanup test artifacts after completion
 */
function cleanupTestArtifacts(projectRoot: string): void {
  console.log('🧹 Cleaning up test artifacts...');

  try {
    const userDataPath = path.join(projectRoot, '.vscode-test', 'user-data-isolated');
    if (fs.existsSync(userDataPath)) {
      fs.rmSync(userDataPath, { recursive: true, force: true });
      console.log('   ✅ Cleaned isolated user data');
    }
  } catch (_error) {
    console.warn('⚠️  Warning: Could not clean up test artifacts:', (_error as Error).message);
  }
}

async function main() {
  let projectRoot: string | undefined;

  try {
    // Check if optimization should be skipped
    const skipOptimization = process.env['SKIP_OPTIMIZATION'] === 'true';
    // Check if running in headless mode (default: true)
    const headless = process.env['HEADLESS'] !== 'false';

    if (skipOptimization) {
      console.log('🚀 Starting Additional Context Menus E2E Tests (Full Setup)...');
    } else {
      console.log('🚀 Starting Optimized Additional Context Menus E2E Tests...');
    }

    if (headless) {
      console.log('🖥️  Running in headless mode');
    } else {
      console.log('🖼️  Running with UI visible');
    }

    // Find the project root dynamically
    projectRoot = findProjectRoot(__dirname);

    let extensionDevelopmentPath: string;
    let isolatedUserDataPath: string | undefined;

    if (skipOptimization) {
      // Use full project directory (traditional approach)
      extensionDevelopmentPath = projectRoot.replace(/\\/g, '/');
      console.log('📁 Using full project directory for testing');
    } else {
      // Step 1: Clean up old VS Code versions to save space
      cleanupOldVSCodeVersions(projectRoot);

      // Step 2: Create minimal extension package for testing
      extensionDevelopmentPath = await createMinimalExtension(projectRoot);

      // Step 3: Create isolated user data directory
      isolatedUserDataPath = createIsolatedUserData(projectRoot);
    }

    // The path to the E2E test runner (compiled JavaScript version)
    const extensionTestsPath = path.resolve(__dirname, './index.js').replace(/\\/g, '/');

    console.log('📁 Extension path:', extensionDevelopmentPath);
    if (isolatedUserDataPath) {
      console.log('👤 Isolated user data path:', isolatedUserDataPath);
    }
    console.log('🧪 E2E tests path:', extensionTestsPath);

    // Build launch args based on optimization mode
    const launchArgs: string[] = [
      '--disable-extensions', // Disable other extensions during testing
      '--disable-workspace-trust', // Skip workspace trust dialog
      extensionDevelopmentPath, // Open the extension workspace
    ];

    // Add headless-specific flags
    if (headless) {
      launchArgs.push(
        '--disable-gpu', // Disable GPU acceleration for headless
        '--no-sandbox', // Required for headless environments
      );
    }

    if (!skipOptimization) {
      // Add optimization flags only for optimized mode
      launchArgs.push(
        '--disable-dev-shm-usage', // Lower memory usage
        '--disable-background-timer-throttling', // Consistent test timing
        '--disable-backgrounding-occluded-windows', // Performance optimization
        '--disable-renderer-backgrounding', // Prevent background throttling
        '--disable-features=TranslateUI', // Disable unnecessary features
        '--disable-component-extensions-with-background-pages', // Memory optimization
      );

      if (isolatedUserDataPath) {
        launchArgs.push(`--user-data-dir=${isolatedUserDataPath}`);
      }
    }

    // Download VS Code, unzip it and run the E2E tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
    });

    console.log('✅ All E2E tests completed successfully!');

    if (!skipOptimization) {
      console.log(
        '📊 Resource optimization active: minimal extension package + isolated user data',
      );
    } else {
      console.log('📊 Full setup mode: using complete project directory');
    }

    if (headless) {
      console.log('🖥️  Tests ran in headless mode');
    } else {
      console.log('🖼️  Tests ran with UI visible');
    }
  } catch (err) {
    console.error('❌ E2E tests failed:', err);
    process.exit(1);
  } finally {
    // Clean up test artifacts only in optimized mode
    if (projectRoot && !process.env['SKIP_OPTIMIZATION']) {
      cleanupTestArtifacts(projectRoot);
    }
  }
}

main();
