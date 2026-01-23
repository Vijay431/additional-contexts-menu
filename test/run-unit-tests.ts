import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'fast-glob';

/**
 * Run unit tests for the codeAnalysisService
 */
export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000, // 10 seconds timeout for unit tests
  });

  const testsRoot = path.resolve(__dirname, './suite');

  return new Promise((c, e) => {
    // Only run codeAnalysisService tests
    glob('services/codeAnalysisService.test.js', { cwd: testsRoot })
      .then((files) => {
        console.log(`📋 Found ${files.length} unit test file(s):`);

        if (files.length === 0) {
          console.log('⚠️  No unit test files found');
          c();
          return;
        }

        // Add files to the test suite
        files.forEach((f) => {
          console.log(`  - ${path.relative(testsRoot, f)}`);
          mocha.addFile(path.resolve(testsRoot, f));
        });

        try {
          console.log('\n🏃 Running unit tests...\n');

          // Run the mocha test
          mocha.run((failures: number) => {
            if (failures > 0) {
              e(new Error(`${failures} test(s) failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          console.error('Error running unit tests:', err);
          e(err);
        }
      })
      .catch((err) => {
        console.error('Error finding unit test files:', err);
        e(err);
      });
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  run().catch(err => {
    console.error('Unit tests failed:', err);
    process.exit(1);
  });
}
