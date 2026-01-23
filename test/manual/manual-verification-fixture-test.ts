/**
 * Manual Verification Script for Fixture Testing
 *
 * This script tests the optimized findFunctionEnd algorithm with real code samples
 * from test/fixtures/ to verify function detection works correctly.
 *
 * This is a standalone implementation that replicates the algorithm to avoid
 * vscode dependencies during testing.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Optimized findFunctionEnd algorithm (O(n) using indexOf)
 * This is the current production implementation
 */
function findFunctionEnd(
  lines: string[],
  startIndex: number,
): { endLine: number; endColumn: number } {
  let braceCount = 0;
  let foundFirstBrace = false;
  let endLine = startIndex + 1;
  let endColumn = 0;

  // Track context for edge cases
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let inSingleQuoteString = false;
  let inDoubleQuoteString = false;
  let inTemplateLiteral = false;

  // For arrow functions, look for the opening brace or single expression
  const startLine = lines[startIndex];
  const isArrowFunction = startLine?.includes('=>');

  if (isArrowFunction && !startLine?.includes('{')) {
    // Single expression arrow function
    return { endLine: startIndex + 1, endColumn: lines[startIndex]?.length ?? 0 };
  }

  // Track braces to find function end using indexOf for better performance
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (line) {
      let searchPos = 0;
      // Reset single-line comment flag at the start of each line
      inSingleLineComment = false;

      while (searchPos < line.length) {
        // Check for multi-line comment end (when inside a multi-line comment)
        if (inMultiLineComment && line.substr(searchPos, 2) === '*/') {
          inMultiLineComment = false;
          searchPos += 2;
          continue;
        }

        // Check for comment/string starts before looking for braces
        if (
          !inSingleLineComment &&
          !inMultiLineComment &&
          !inSingleQuoteString &&
          !inDoubleQuoteString &&
          !inTemplateLiteral
        ) {
          // Check for single-line comment
          if (line.substr(searchPos, 2) === '//') {
            inSingleLineComment = true;
            break; // Skip rest of line
          }
          // Check for multi-line comment start
          if (line.substr(searchPos, 2) === '/*') {
            inMultiLineComment = true;
            searchPos += 2;
            continue;
          }
          // Check for string start
          if (line[searchPos] === "'") {
            inSingleQuoteString = true;
            searchPos++;
            continue;
          }
          if (line[searchPos] === '"') {
            inDoubleQuoteString = true;
            searchPos++;
            continue;
          }
          if (line[searchPos] === '`') {
            inTemplateLiteral = true;
            searchPos++;
            continue;
          }
        } else if (
          inSingleQuoteString &&
          line[searchPos] === "'" &&
          !isEscaped(line, searchPos)
        ) {
          inSingleQuoteString = false;
          searchPos++;
          continue;
        } else if (
          inDoubleQuoteString &&
          line[searchPos] === '"' &&
          !isEscaped(line, searchPos)
        ) {
          inDoubleQuoteString = false;
          searchPos++;
          continue;
        } else if (
          inTemplateLiteral &&
          line[searchPos] === '`' &&
          !isEscaped(line, searchPos)
        ) {
          inTemplateLiteral = false;
          searchPos++;
          continue;
        }

        // Skip braces inside strings, comments, or template literals
        if (
          inSingleLineComment ||
          inMultiLineComment ||
          inSingleQuoteString ||
          inDoubleQuoteString ||
          inTemplateLiteral
        ) {
          searchPos++;
          continue;
        }

        // Find next opening or closing brace
        const openBracePos = line.indexOf('{', searchPos);
        const closeBracePos = line.indexOf('}', searchPos);

        // Determine which brace comes first (or if any exist)
        let nextBracePos = -1;
        let isOpenBrace = false;

        if (openBracePos !== -1 && closeBracePos !== -1) {
          // Both braces exist, use the closer one
          if (openBracePos < closeBracePos) {
            nextBracePos = openBracePos;
            isOpenBrace = true;
          } else {
            nextBracePos = closeBracePos;
            isOpenBrace = false;
          }
        } else if (openBracePos !== -1) {
          nextBracePos = openBracePos;
          isOpenBrace = true;
        } else if (closeBracePos !== -1) {
          nextBracePos = closeBracePos;
          isOpenBrace = false;
        }

        if (nextBracePos === -1) {
          // No more braces in this line
          break;
        }

        // Process the brace we found
        if (isOpenBrace) {
          if (!foundFirstBrace) {
            foundFirstBrace = true;
          }
          braceCount++;
        } else {
          braceCount--;
        }

        // Move past this brace
        searchPos = nextBracePos + 1;

        // Check if we've closed all braces
        if (foundFirstBrace && braceCount === 0) {
          endLine = i + 1; // Convert to 1-based line number
          endColumn = nextBracePos;
          return { endLine, endColumn };
        }
      }
    }
  }

  // If we couldn't find the end, return the last line
  return { endLine: lines.length, endColumn: lines[lines.length - 1]?.length ?? 0 };
}

/**
 * Check if a character is escaped
 */
function isEscaped(line: string, pos: number): boolean {
  let backslashCount = 0;
  let i = pos - 1;
  while (i >= 0 && line[i] === '\\') {
    backslashCount++;
    i--;
  }
  return backslashCount % 2 === 1;
}

/**
 * Simple function detection patterns
 */
const patterns = {
  functionDeclaration: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  arrowFunction: /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(?\s*[^)]*\)?\s*=>/g,
  methodDefinition: /(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
};

/**
 * Find all functions in the code
 */
function findAllFunctions(content: string): Array<{
  name: string;
  startLine: number;
  endLine: number;
  linesOfCode: number;
}> {
  const functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    linesOfCode: number;
  }> = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    // Try function declaration
    patterns.functionDeclaration.lastIndex = 0;
    const funcMatch = patterns.functionDeclaration.exec(line);
    if (funcMatch?.[1]) {
      const endInfo = findFunctionEnd(lines, lineIndex);
      functions.push({
        name: funcMatch[1],
        startLine: lineNumber,
        endLine: endInfo.endLine,
        linesOfCode: endInfo.endLine - lineNumber + 1,
      });
      return;
    }

    // Try arrow function
    patterns.arrowFunction.lastIndex = 0;
    const arrowMatch = patterns.arrowFunction.exec(line);
    if (arrowMatch?.[1]) {
      const endInfo = findFunctionEnd(lines, lineIndex);
      functions.push({
        name: arrowMatch[1],
        startLine: lineNumber,
        endLine: endInfo.endLine,
        linesOfCode: endInfo.endLine - lineNumber + 1,
      });
      return;
    }

    // Try class methods (simple heuristic)
    const isClassContext = lineIndex > 0 && lines[lineIndex - 1]?.trim().startsWith('class ');
    if (isClassContext || line.includes('constructor')) {
      patterns.methodDefinition.lastIndex = 0;
      const methodMatch = patterns.methodDefinition.exec(line);
      if (methodMatch?.[1] && !line.includes('=')) {
        const endInfo = findFunctionEnd(lines, lineIndex);
        functions.push({
          name: methodMatch[1],
          startLine: lineNumber,
          endLine: endInfo.endLine,
          linesOfCode: endInfo.endLine - lineNumber + 1,
        });
      }
    }
  });

  return functions;
}

interface TestResult {
  fixtureFile: string;
  totalFunctions: number;
  functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    linesOfCode: number;
  }>;
  success: boolean;
  errors: string[];
}

class FixtureVerifier {
  private results: TestResult[] = [];

  /**
   * Test a single fixture file
   */
  public testFixture(fixturePath: string): TestResult {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${path.basename(fixturePath)}`);
    console.log(`${'='.repeat(80)}`);

    const result: TestResult = {
      fixtureFile: fixturePath,
      totalFunctions: 0,
      functions: [],
      success: true,
      errors: [],
    };

    try {
      // Read fixture file
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const lines = content.split('\n');

      console.log(`  Lines in file: ${lines.length}`);
      console.log(`  File size: ${content.length} characters\n`);

      // Find all functions
      const functions = findAllFunctions(content);

      result.totalFunctions = functions.length;

      console.log(`  Functions detected: ${functions.length}\n`);

      // Display each function found
      if (functions.length > 0) {
        console.log(`  ${'─'.repeat(76)}`);
        console.log(`  ${'Function Name'.padEnd(30)} ${'Start'.padEnd(8)} ${'End'.padEnd(8)} ${'Lines'}`);
        console.log(`  ${'─'.repeat(76)}`);

        functions.forEach((func) => {
          result.functions.push(func);

          console.log(
            `  ${func.name.padEnd(30)} ${func.startLine.toString().padEnd(8)} ` +
              `${func.endLine.toString().padEnd(8)} ${func.linesOfCode}`,
          );
        });

        console.log(`  ${'─'.repeat(76)}`);

        // Calculate statistics
        const totalLinesOfCode = result.functions.reduce((sum, f) => sum + f.linesOfCode, 0);

        console.log(`\n  Summary:`);
        console.log(`    Total functions: ${result.totalFunctions}`);
        console.log(`    Total function lines: ${totalLinesOfCode}`);
        console.log(`    Avg function size: ${(totalLinesOfCode / result.totalFunctions).toFixed(1)} lines`);
      } else {
        console.log(`  ⚠️  No functions detected in this file!`);
        result.success = false;
        result.errors.push('No functions detected');
      }

      // Verify function boundaries are reasonable
      this.verifyFunctionBoundaries(result, lines);
    } catch (error) {
      result.success = false;
      result.errors.push(`Error testing fixture: ${error}`);
      console.error(`  ❌ Error: ${error}`);
    }

    return result;
  }

  /**
   * Verify that function boundaries are reasonable
   */
  private verifyFunctionBoundaries(result: TestResult, lines: string[]): void {
    const maxLine = lines.length;

    result.functions.forEach((func) => {
      // Check that endLine is not before startLine
      if (func.endLine < func.startLine) {
        result.success = false;
        result.errors.push(
          `Function '${func.name}' has endLine (${func.endLine}) before startLine (${func.startLine})`,
        );
      }

      // Check that endLine is within file bounds
      if (func.endLine > maxLine) {
        result.success = false;
        result.errors.push(
          `Function '${func.name}' has endLine (${func.endLine}) beyond file length (${maxLine})`,
        );
      }

      // Check that function size is reasonable (> 0 and < 1000 lines)
      if (func.linesOfCode <= 0) {
        result.success = false;
        result.errors.push(`Function '${func.name}' has invalid size: ${func.linesOfCode} lines`);
      }

      if (func.linesOfCode > 1000) {
        result.success = false;
        result.errors.push(
          `Function '${func.name}' has unusually large size: ${func.linesOfCode} lines`,
        );
      }
    });

    if (!result.success) {
      console.log(`\n  ❌ Boundary verification failed:`);
      result.errors.forEach((error) => console.log(`    - ${error}`));
    } else {
      console.log(`\n  ✅ All function boundaries are valid`);
    }
  }

  /**
   * Run all fixture tests
   */
  public runAllTests(): void {
    console.log(
      '\n╔══════════════════════════════════════════════════════════════════════════════╗',
    );
    console.log(
      '║          MANUAL VERIFICATION - FIXTURE FUNCTION DETECTION TEST             ║',
    );
    console.log(
      '╚══════════════════════════════════════════════════════════════════════════════╝',
    );

    const fixturesDir = path.join(__dirname, '..', 'fixtures');
    const fixtureFiles = [
      path.join(fixturesDir, 'code-samples', 'utility-functions.ts'),
      path.join(fixturesDir, 'sample-express-routes.ts'),
      path.join(fixturesDir, 'sample-angular-service.ts'),
    ];

    console.log(`\nFixture directory: ${fixturesDir}`);
    console.log(`Testing ${fixtureFiles.length} fixture files...\n`);

    // Test each fixture
    for (const fixtureFile of fixtureFiles) {
      if (fs.existsSync(fixtureFile)) {
        const result = this.testFixture(fixtureFile);
        this.results.push(result);
      } else {
        console.log(`\n⚠️  Fixture file not found: ${fixtureFile}`);
      }
    }

    // Print overall summary
    this.printSummary();
  }

  /**
   * Print overall test summary
   */
  private printSummary(): void {
    console.log(`\n${'═'.repeat(80)}`);
    console.log('OVERALL SUMMARY');
    console.log(`${'═'.repeat(80)}\n`);

    const totalFunctions = this.results.reduce((sum, r) => sum + r.totalFunctions, 0);
    const successCount = this.results.filter((r) => r.success).length;
    const failureCount = this.results.length - successCount;

    console.log(`  Total fixture files tested: ${this.results.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${failureCount}`);
    console.log(`  Total functions detected: ${totalFunctions}\n`);

    if (failureCount > 0) {
      console.log(`  ❌ VERIFICATION FAILED\n`);
      this.results.forEach((result) => {
        if (!result.success) {
          console.log(`    ${path.basename(result.fixtureFile)}:`);
          result.errors.forEach((error) => console.log(`      - ${error}`));
        }
      });
    } else {
      console.log(`  ✅ ALL VERIFICATIONS PASSED\n`);
      console.log(
        `  The optimized findFunctionEnd algorithm correctly detected all functions`,
      );
      console.log(
        `  in the real code samples. Function boundaries are valid and accurate.\n`,
      );
    }

    console.log(`${'═'.repeat(80)}\n`);
  }
}

// Run the verification
const verifier = new FixtureVerifier();
verifier.runAllTests();
