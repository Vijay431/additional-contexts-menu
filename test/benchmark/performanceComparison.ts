/**
 * Performance comparison benchmark
 *
 * Compares the old O(n*m) algorithm with the new optimized O(n) algorithm
 */

/**
 * OLD O(n*m) algorithm - character-by-character iteration
 */
function findFunctionEndOld(
  lines: string[],
  startIndex: number
): { endLine: number; endColumn: number } {
  let braceCount = 0;
  let foundFirstBrace = false;
  let endLine = startIndex + 1;
  let endColumn = 0;

  const startLine = lines[startIndex];
  const isArrowFunction = startLine?.includes('=>');

  if (isArrowFunction && !startLine?.includes('{')) {
    return { endLine: startIndex + 1, endColumn: lines[startIndex]?.length ?? 0 };
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') {
          braceCount++;
          foundFirstBrace = true;
        } else if (line[j] === '}') {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) {
            return { endLine: i + 1, endColumn: j + 1 };
          }
        }
      }
    }
    endLine = i + 1;
    endColumn = line?.length ?? 0;
  }

  return { endLine, endColumn };
}

/**
 * NEW optimized algorithm - uses indexOf
 */
function findFunctionEndNew(
  lines: string[],
  startIndex: number
): { endLine: number; endColumn: number } {
  let braceCount = 0;
  let foundFirstBrace = false;
  let endLine = startIndex + 1;
  let endColumn = 0;

  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let inSingleQuoteString = false;
  let inDoubleQuoteString = false;
  let inTemplateLiteral = false;

  const startLine = lines[startIndex];
  const isArrowFunction = startLine?.includes('=>');

  if (isArrowFunction && !startLine?.includes('{')) {
    return { endLine: startIndex + 1, endColumn: lines[startIndex]?.length ?? 0 };
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (line) {
      let searchPos = 0;
      inSingleLineComment = false;

      while (searchPos < line.length) {
        if (!inSingleLineComment && !inMultiLineComment &&
            !inSingleQuoteString && !inDoubleQuoteString && !inTemplateLiteral) {
          if (line.substr(searchPos, 2) === '//') {
            inSingleLineComment = true;
            break;
          }
          if (line.substr(searchPos, 2) === '/*') {
            inMultiLineComment = true;
            searchPos += 2;
            continue;
          }
          if (inMultiLineComment && line.substr(searchPos, 2) === '*/') {
            inMultiLineComment = false;
            searchPos += 2;
            continue;
          }
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
        } else if (inSingleQuoteString && line[searchPos] === "'" && !isEscaped(line, searchPos)) {
          inSingleQuoteString = false;
          searchPos++;
          continue;
        } else if (inDoubleQuoteString && line[searchPos] === '"' && !isEscaped(line, searchPos)) {
          inDoubleQuoteString = false;
          searchPos++;
          continue;
        } else if (inTemplateLiteral && line[searchPos] === '`' && !isEscaped(line, searchPos)) {
          inTemplateLiteral = false;
          searchPos++;
          continue;
        }

        if (inSingleLineComment || inMultiLineComment ||
            inSingleQuoteString || inDoubleQuoteString || inTemplateLiteral) {
          searchPos++;
          continue;
        }

        const openBracePos = line.indexOf('{', searchPos);
        const closeBracePos = line.indexOf('}', searchPos);

        let nextBracePos = -1;
        let isOpenBrace = false;

        if (openBracePos !== -1 && closeBracePos !== -1) {
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
          break;
        }

        if (isOpenBrace) {
          braceCount++;
          foundFirstBrace = true;
        } else {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) {
            return { endLine: i + 1, endColumn: nextBracePos + 1 };
          }
        }

        searchPos = nextBracePos + 1;
      }
    }

    endLine = i + 1;
    endColumn = line?.length ?? 0;
  }

  return { endLine, endColumn };
}

function isEscaped(line: string, pos: number): boolean {
  let backslashCount = 0;
  let i = pos - 1;
  while (i >= 0 && line[i] === '\\') {
    backslashCount++;
    i--;
  }
  return backslashCount % 2 === 1;
}

function generateTestCode(functionsCount: number, linesPerFunction: number): string[] {
  const lines: string[] = [];

  for (let i = 0; i < functionsCount; i++) {
    lines.push(`export function testFunction${i}() {`);
    lines.push(`  const value = ${i};`);
    lines.push(`  const result = value * 2;`);

    for (let j = 0; j < Math.floor(linesPerFunction / 4); j++) {
      lines.push(`  if (result > ${j * 10}) {`);
      lines.push(`    const nested = result + ${j};`);
      lines.push(`    console.log(nested);`);
      lines.push(`  }`);
    }

    lines.push(`  return result;`);
    lines.push(`}`);
    lines.push('');
  }

  return lines;
}

function benchmark(name: string, fn: typeof findFunctionEndOld, codeLines: string[], iterations: number) {
  const functionStarts: number[] = [];
  const functionPattern = /export function|export const|function |const \w+ = |async function/g;

  codeLines.forEach((line, index) => {
    if (functionPattern.test(line)) {
      functionStarts.push(index);
    }
    functionPattern.lastIndex = 0;
  });

  // Warmup
  for (let i = 0; i < 10; i++) {
    for (const startIndex of functionStarts) {
      fn(codeLines, startIndex);
    }
  }

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    for (const startIndex of functionStarts) {
      fn(codeLines, startIndex);
    }
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;
  const totalFunctions = functionStarts.length * iterations;
  const avgTimePerFunctionMs = totalTimeMs / totalFunctions;
  const operationsPerSecond = (totalFunctions * 1000) / totalTimeMs;

  return {
    name,
    totalTimeMs: Number(totalTimeMs.toFixed(4)),
    avgTimePerFunctionMs: Number(avgTimePerFunctionMs.toFixed(6)),
    operationsPerSecond: Number(operationsPerSecond.toFixed(2)),
  };
}

export function main(): void {
  const iterations = 100;

  console.log('\n=== Performance Comparison: Old vs New Algorithm ===\n');
  console.log(`Iterations: ${iterations}, Warmup: 10 runs\n`);

  const testSizes = [
    { name: 'Small (70 lines, 25 functions)', lines: 70 },
    { name: 'Medium (280 lines, 100 functions)', lines: 280 },
    { name: 'Large (700 lines, 250 functions)', lines: 700 },
    { name: 'Very Large (1400 lines, 500 functions)', lines: 1400 },
  ];

  for (const size of testSizes) {
    console.log(`\n--- ${size.name} ---`);

    const codeLines = generateTestCode(Math.floor(size.lines / 14), 10);

    const oldResult = benchmark('OLD (char-by-char)', findFunctionEndOld, codeLines, iterations);
    const newResult = benchmark('NEW (indexOf)', findFunctionEndNew, codeLines, iterations);

    console.log(`OLD Algorithm:`);
    console.log(`  Time: ${oldResult.totalTimeMs}ms`);
    console.log(`  Avg/Function: ${oldResult.avgTimePerFunctionMs}ms`);
    console.log(`  Ops/sec: ${oldResult.operationsPerSecond}`);

    console.log(`\nNEW Algorithm:`);
    console.log(`  Time: ${newResult.totalTimeMs}ms`);
    console.log(`  Avg/Function: ${newResult.avgTimePerFunctionMs}ms`);
    console.log(`  Ops/sec: ${newResult.operationsPerSecond}`);

    const speedup = oldResult.totalTimeMs / newResult.totalTimeMs;
    const opsImprovement = ((newResult.operationsPerSecond - oldResult.operationsPerSecond) / oldResult.operationsPerSecond) * 100;

    console.log(`\nImprovement:`);
    console.log(`  Speedup: ${speedup.toFixed(2)}x`);
    console.log(`  Ops/sec improvement: ${opsImprovement.toFixed(1)}%`);
  }

  console.log('\n=== Summary ===\n');
  console.log('The optimization uses indexOf() instead of character iteration.');
  console.log('Expected benefit: 2-3x faster for large files.');
  console.log('Actual results may vary based on:');
  console.log('  - File size and complexity');
  console.log('  - Number of functions per file');
  console.log('  - Presence of edge cases (strings, comments, nested braces)');
  console.log('  - System load and CPU performance');
  console.log('');
}

if (require.main === module) {
  main();
}
