import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'fast-glob';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000, // 60 seconds timeout for E2E tests
  });

  const testsRoot = path.resolve(__dirname, '.');
  const suiteRoot = path.resolve(__dirname, '../suite');

  return new Promise((c, e) => {
    // Find both E2E tests and unit tests
    Promise.all([
      glob('**/**.test.js', { cwd: testsRoot }),
      glob('**/**.test.js', { cwd: suiteRoot })
    ])
      .then(([e2eFiles, unitFiles]) => {
        const totalFiles = e2eFiles.length + unitFiles.length;
        console.log(`📋 Found ${totalFiles} test file(s):`);
        
        if (e2eFiles.length > 0) {
          console.log(`  E2E tests (${e2eFiles.length}):`);
          e2eFiles.forEach((f) => {
            console.log(`    - ${f}`);
            mocha.addFile(path.resolve(testsRoot, f));
          });
        }
        
        if (unitFiles.length > 0) {
          console.log(`  Unit tests (${unitFiles.length}):`);
          unitFiles.forEach((f) => {
            console.log(`    - ${f}`);
            mocha.addFile(path.resolve(suiteRoot, f));
          });
        }

        try {
          console.log('\n🏃 Running E2E tests...\n');

          // Run the mocha test
          mocha.run((failures: number) => {
            if (failures > 0) {
              e(new Error(`${failures} test(s) failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          console.error('Error running E2E tests:', err);
          e(err);
        }
      })
      .catch((err) => {
        console.error('Error finding E2E test files:', err);
        e(err);
      });
  });
}
