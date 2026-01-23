/**
 * Benchmark utility to measure findFunctionEnd performance
 *
 * This utility tests the performance of the brace counting algorithm
 * used in CodeAnalysisService.findFunctionEnd() to establish a baseline
 * before optimization.
 *
 * This is a standalone implementation that replicates the algorithm
 * to avoid vscode dependencies during benchmarking.
 */

/**
 * Replicated findFunctionEnd algorithm for benchmarking
 * This is the current O(n*m) implementation using character-by-character iteration
 */
function findFunctionEnd(
  lines: string[],
  startIndex: number
): { endLine: number; endColumn: number } {
  let braceCount = 0;
  let foundFirstBrace = false;
  let endLine = startIndex + 1;
  let endColumn = 0;

  // For arrow functions, look for the opening brace or single expression
  const startLine = lines[startIndex];
  const isArrowFunction = startLine?.includes('=>');

  if (isArrowFunction && !startLine?.includes('{')) {
    // Single expression arrow function
    return { endLine: startIndex + 1, endColumn: lines[startIndex]?.length ?? 0 };
  }

  // Track braces to find function end - O(n*m) complexity
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

interface BenchmarkResult {
  testName: string;
  lines: number;
  avgCharsPerLine: number;
  totalFunctions: number;
  totalTimeMs: number;
  avgTimePerFunctionMs: number;
  operationsPerSecond: number;
}

interface BenchmarkConfig {
  iterations: number;
  warmupRuns: number;
}

/**
 * Generate test code with specified number of functions
 */
function generateTestCode(functionsCount: number, linesPerFunction: number): string[] {
  const lines: string[] = [];

  for (let i = 0; i < functionsCount; i++) {
    lines.push(`export function testFunction${i}() {`);
    lines.push(`  const value = ${i};`);
    lines.push(`  const result = value * 2;`);

    // Add nested blocks to simulate real code
    for (let j = 0; j < Math.floor(linesPerFunction / 4); j++) {
      lines.push(`  if (result > ${j * 10}) {`);
      lines.push(`    const nested = result + ${j};`);
      lines.push(`    console.log(nested);`);
      lines.push(`  }`);
    }

    lines.push(`  return result;`);
    lines.push(`}`);
    lines.push(''); // Empty line between functions
  }

  return lines;
}

/**
 * Generate deeply nested function code for stress testing
 */
function generateNestedCode(nestingDepth: number): string[] {
  const lines: string[] = [];
  lines.push('export function deeplyNested() {');
  lines.push('  let result = 0;');

  let indent = '  ';
  for (let i = 0; i < nestingDepth; i++) {
    lines.push(`${indent}if (result >= 0) {`);
    lines.push(`${indent}  result += ${i};`);
    indent += '  ';
  }

  // Close all nested braces
  for (let i = 0; i < nestingDepth; i++) {
    indent = indent.slice(0, -2);
    lines.push(`${indent}}`);
  }

  lines.push('  return result;');
  lines.push('}');

  return lines;
}

/**
 * Generate code with mixed function types
 */
function generateMixedCode(linesCount: number): string[] {
  const lines: string[] = [];

  // Function declarations
  lines.push('function declarationFunction() {');
  lines.push('  const value = 1;');
  lines.push('  return value;');
  lines.push('}');

  // Arrow functions
  lines.push('const arrowFunction = () => {');
  lines.push('  const value = 2;');
  lines.push('  return value;');
  lines.push('};');

  // Class methods
  lines.push('export class TestClass {');
  lines.push('  constructor() {');
  lines.push('    this.value = 3;');
  lines.push('  }');
  lines.push('');
  lines.push('  methodOne() {');
  lines.push('    return this.value;');
  lines.push('  }');
  lines.push('');
  lines.push('  methodTwo() {');
  lines.push('    return this.value * 2;');
  lines.push('  }');
  lines.push('}');

  // Async functions
  lines.push('export async function asyncFunction() {');
  lines.push('  const result = await Promise.resolve(4);');
  lines.push('  return result;');
  lines.push('}');

  // React-style component
  lines.push('export const ReactComponent = () => {');
  lines.push('  const [state, setState] = useState(null);');
  lines.push('');
  lines.push('  useEffect(() => {');
  lines.push('    fetchData();');
  lines.push('  }, []);');
  lines.push('');
  lines.push('  return <div>{state}</div>;');
  lines.push('};');

  // Fill remaining lines with more functions
  const remainingLines = linesCount - lines.length;
  if (remainingLines > 0) {
    const additionalLines = generateTestCode(
      Math.floor(remainingLines / 10),
      10
    );
    lines.push(...additionalLines.slice(0, remainingLines));
  }

  return lines;
}

/**
 * Benchmark a specific code scenario
 */
function benchmarkScenario(
  testName: string,
  codeLines: string[],
  config: BenchmarkConfig
): BenchmarkResult {
  // Find function start lines (simplified pattern matching)
  const functionStarts: number[] = [];
  const functionPattern = /export function|export const|function |const \w+ = |async function/g;

  codeLines.forEach((line, index) => {
    if (functionPattern.test(line)) {
      functionStarts.push(index);
    }
    functionPattern.lastIndex = 0; // Reset regex
  });

  // Warmup runs
  for (let i = 0; i < config.warmupRuns; i++) {
    for (const startIndex of functionStarts) {
      findFunctionEnd(codeLines, startIndex);
    }
  }

  // Actual benchmark
  const startTime = performance.now();

  for (let i = 0; i < config.iterations; i++) {
    for (const startIndex of functionStarts) {
      findFunctionEnd(codeLines, startIndex);
    }
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;

  const totalFunctions = functionStarts.length * config.iterations;
  const avgTimePerFunctionMs = totalTimeMs / (totalFunctions || 1);
  const operationsPerSecond = (totalFunctions * 1000) / totalTimeMs;

  return {
    testName,
    lines: codeLines.length,
    avgCharsPerLine: Math.round(
      codeLines.reduce((sum, line) => sum + line.length, 0) / codeLines.length
    ),
    totalFunctions: functionStarts.length,
    totalTimeMs: Number(totalTimeMs.toFixed(4)),
    avgTimePerFunctionMs: Number(avgTimePerFunctionMs.toFixed(6)),
    operationsPerSecond: Number(operationsPerSecond.toFixed(2)),
  };
}

/**
 * Run all benchmark scenarios
 */
export function runBenchmark(config: BenchmarkConfig = {
  iterations: 100,
  warmupRuns: 10
}): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  console.log('\n=== Brace Counting Algorithm Benchmark ===');
  console.log(`Iterations: ${config.iterations}, Warmup runs: ${config.warmupRuns}\n`);

  // Test 1: Small file with simple functions
  console.log('Running: Small file (50 lines, simple functions)...');
  results.push(
    benchmarkScenario(
      'Small file - Simple functions',
      generateTestCode(5, 10),
      config
    )
  );

  // Test 2: Medium file with moderate complexity
  console.log('Running: Medium file (200 lines, moderate complexity)...');
  results.push(
    benchmarkScenario(
      'Medium file - Moderate complexity',
      generateTestCode(20, 10),
      config
    )
  );

  // Test 3: Large file with many functions
  console.log('Running: Large file (500 lines, many functions)...');
  results.push(
    benchmarkScenario(
      'Large file - Many functions',
      generateTestCode(50, 10),
      config
    )
  );

  // Test 4: Very large file (stress test)
  console.log('Running: Very large file (1000 lines, many functions)...');
  results.push(
    benchmarkScenario(
      'Very large file - Stress test',
      generateTestCode(100, 10),
      config
    )
  );

  // Test 5: Deeply nested function
  console.log('Running: Deeply nested function (50 levels deep)...');
  results.push(
    benchmarkScenario(
      'Deeply nested function',
      generateNestedCode(50),
      config
    )
  );

  // Test 6: Mixed function types
  console.log('Running: Mixed function types...');
  results.push(
    benchmarkScenario(
      'Mixed function types',
      generateMixedCode(200),
      config
    )
  );

  return results;
}

/**
 * Display benchmark results
 */
export function displayResults(results: BenchmarkResult[]): void {
  console.log('\n=== Benchmark Results ===\n');

  console.log(
    `${'Test Name'.padEnd(35)} ${'Lines'.padStart(6)} ${'Avg Chars'.padStart(10)} ${'Funcs'.padStart(8)} ${'Total (ms)'.padStart(12)} ${'Avg/Func (ms)'.padStart(14)} ${'Ops/sec'.padStart(12)}`
  );
  console.log(
    '-'.repeat(115)
  );

  for (const result of results) {
    console.log(
      `${result.testName.padEnd(35)} ` +
      `${String(result.lines).padStart(6)} ` +
      `${String(result.avgCharsPerLine).padStart(10)} ` +
      `${String(result.totalFunctions).padStart(8)} ` +
      `${String(result.totalTimeMs).padStart(12)} ` +
      `${String(result.avgTimePerFunctionMs).padStart(14)} ` +
      `${String(result.operationsPerSecond).padStart(12)}`
    );
  }

  console.log('\n=== Key Metrics ===\n');

  const largeFileResult = results.find(r => r.testName.includes('Very large'));
  if (largeFileResult) {
    console.log(`Performance for 1000-line file:`);
    console.log(`  Total time: ${largeFileResult.totalTimeMs}ms`);
    console.log(`  Average per function: ${largeFileResult.avgTimePerFunctionMs}ms`);
    console.log(`  Functions per second: ${largeFileResult.operationsPerSecond}`);
  }

  const nestedResult = results.find(r => r.testName.includes('Deeply nested'));
  if (nestedResult) {
    console.log(`\nPerformance for deeply nested functions:`);
    console.log(`  Total time: ${nestedResult.totalTimeMs}ms`);
    console.log(`  Average per function: ${nestedResult.avgTimePerFunctionMs}ms`);
  }

  console.log('\n=== Analysis ===\n');
  console.log('Current algorithm uses O(n*m) complexity where:');
  console.log('  n = number of lines');
  console.log('  m = average characters per line');
  console.log('');
  console.log('For a 1000-line file with 80-character lines:');
  console.log('  ~80,000 character checks required');
  console.log('  This is the baseline for optimization\n');
}

/**
 * Main entry point for running benchmarks
 */
export function main(): void {
  const config: BenchmarkConfig = {
    iterations: 100,
    warmupRuns: 10,
  };

  // Allow configuration via environment variables
  if (process.env.BENCHMARK_ITERATIONS) {
    config.iterations = parseInt(process.env.BENCHMARK_ITERATIONS, 10);
  }
  if (process.env.BENCHMARK_WARMUP) {
    config.warmupRuns = parseInt(process.env.BENCHMARK_WARMUP, 10);
  }

  try {
    const results = runBenchmark(config);
    displayResults(results);

    console.log('\n✓ Benchmark completed successfully\n');
  } catch (error) {
    console.error('\n✗ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run benchmark if executed directly
if (require.main === module) {
  main();
}
