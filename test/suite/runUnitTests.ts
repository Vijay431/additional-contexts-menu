import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'fast-glob';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000, // 10 seconds timeout for unit tests
  });

  const testsRoot = path.resolve(__dirname, '.');

  return new Promise((c, e) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files) => {
        console.log(`📋 Found ${files.length} unit test file(s):`);

        // Add files to the test suite
        files.forEach((f) => {
          console.log(`  - ${f}`);
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
