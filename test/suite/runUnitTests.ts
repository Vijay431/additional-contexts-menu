import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'fast-glob';

/**
 * Run unit tests for the extension
 */

async function main() {
  try {
    console.log('🚀 Starting Unit Tests...\n');

    // Create the mocha test
    const mocha = new Mocha({
      ui: 'tdd',
      color: true,
      timeout: 10000, // 10 seconds timeout for unit tests
    });

    const testsRoot = path.resolve(__dirname, '.');

    // Get grep pattern from command line arguments
    const grepArg = process.argv.find(arg => arg.startsWith('--grep='));
    if (grepArg) {
      const parts = grepArg.split('=');
      if (parts.length >= 2) {
        const grepPattern = parts.slice(1).join('=');
        console.log(`🔍 Filtering tests with pattern: ${grepPattern}`);
        mocha.grep(new RegExp(grepPattern));
      }
    }

    const files = await glob('**/**.test.js', { cwd: testsRoot });

    console.log(`📋 Found ${files.length} unit test file(s):`);

    // Add files to the test suite
    files.forEach((f) => {
      console.log(`  - ${f}`);
      mocha.addFile(path.resolve(testsRoot, f));
    });

    console.log('\n🏃 Running unit tests...\n');

    // Run the mocha test
    return new Promise<void>((resolve, reject) => {
      mocha.run((failures: number) => {
        if (failures > 0) {
          console.error(`\n❌ ${failures} test(s) failed.`);
          reject(new Error(`${failures} test(s) failed.`));
        } else {
          console.log('\n✅ All unit tests passed!');
          resolve();
        }
      });
    });

  } catch (err) {
    console.error('❌ Unit tests failed:', err);
    process.exit(1);
  }
}

main();
