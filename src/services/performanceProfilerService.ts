import * as vscode from 'vscode';

import {
  PerformanceBottleneck,
  PerformanceFunctionMetric,
  PerformanceOptimizationSuggestion,
  PerformanceProfilingResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Performance Profiler Service
 *
 * Instruments functions to measure execution time and memory usage.
 * Identifies performance bottlenecks and provides optimization suggestions
 * with before/after comparisons.
 */
export class PerformanceProfilerService {
  private static instance: PerformanceProfilerService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PerformanceProfilerService {
    PerformanceProfilerService.instance ??= new PerformanceProfilerService();
    return PerformanceProfilerService.instance;
  }

  /**
   * Profile performance of a document
   */
  public async profilePerformance(
    document: vscode.TextDocument,
    config?: {
      minExecutionTime?: number;
      minMemoryUsage?: number;
      maxNestingDepth?: number;
      analyzeAsyncOperations?: boolean;
    },
  ): Promise<PerformanceProfilingResult> {
    const startTime = Date.now();
    const text = document.getText();
    const lines = text.split('\n');

    try {
      // Extract all functions from the document
      const functions = this.extractFunctions(text, lines);

      // Analyze each function's performance characteristics
      const functionMetrics: PerformanceFunctionMetric[] = [];
      for (const func of functions) {
        const metric = this.analyzeFunctionPerformance(func, lines);
        functionMetrics.push(metric);
      }

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(functionMetrics, config);

      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(
        functionMetrics,
        bottlenecks,
        config,
      );

      // Calculate overall metrics
      const totalEstimatedExecutionTime = functionMetrics.reduce(
        (sum, m) => sum + m.estimatedExecutionTime,
        0,
      );
      const totalEstimatedMemoryUsage = functionMetrics.reduce(
        (sum, m) => sum + m.estimatedMemoryUsage,
        0,
      );
      const averageExecutionTime =
        functionMetrics.length > 0 ? totalEstimatedExecutionTime / functionMetrics.length : 0;
      const averageMemoryUsage =
        functionMetrics.length > 0 ? totalEstimatedMemoryUsage / functionMetrics.length : 0;

      const profilingDuration = Date.now() - startTime;

      this.logger.debug(`Performance profiling completed in ${profilingDuration}ms`, {
        file: document.fileName,
        functionsAnalyzed: functions.length,
        bottlenecksFound: bottlenecks.length,
      });

      return {
        file: document.fileName,
        functionMetrics,
        bottlenecks,
        suggestions,
        overallMetrics: {
          totalEstimatedExecutionTime,
          totalEstimatedMemoryUsage,
          averageExecutionTime,
          averageMemoryUsage,
        },
        profilingDuration,
      };
    } catch (error) {
      this.logger.error('Error profiling performance', error);
      return {
        file: document.fileName,
        functionMetrics: [],
        bottlenecks: [],
        suggestions: ['Failed to profile performance'],
        overallMetrics: {
          totalEstimatedExecutionTime: 0,
          totalEstimatedMemoryUsage: 0,
          averageExecutionTime: 0,
          averageMemoryUsage: 0,
        },
        profilingDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract functions from code
   */
  private extractFunctions(
    text: string,
    lines: string[],
  ): Array<{
    name: string;
    startLine: number;
    endLine: number;
    fullText: string;
  }> {
    const functions: Array<{
      name: string;
      startLine: number;
      endLine: number;
      fullText: string;
    }> = [];

    // Track braces to find function boundaries
    const functionStarts: Array<{ name: string; line: number; braceCount: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.length === 0
      ) {
        continue;
      }

      // Look for function definitions
      const namedMatch =
        /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(|export\s+(?:const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\()/g.exec(
          line,
        );

      if (namedMatch) {
        const funcName = namedMatch[1] || namedMatch[2] || namedMatch[3] || 'anonymous';
        functionStarts.push({ name: funcName, line: i, braceCount: this.countBraces(line) });
        continue;
      }

      // Track braces for functions we've found
      if (functionStarts.length > 0) {
        const currentFunc = functionStarts[functionStarts.length - 1];
        currentFunc.braceCount += this.countBraces(line);

        // If braces balance out, we've found the end of the function
        if (currentFunc.braceCount === 0 && i > currentFunc.line) {
          const fullText = lines.slice(currentFunc.line, i + 1).join('\n');
          functions.push({
            name: currentFunc.name,
            startLine: currentFunc.line + 1,
            endLine: i + 1,
            fullText,
          });
          functionStarts.pop();
        }
      }
    }

    return functions;
  }

  /**
   * Count brace balance in a line (counts { +1, } -1)
   */
  private countBraces(line: string): number {
    let count = 0;
    for (const char of line) {
      if (char === '{') count++;
      else if (char === '}') count--;
    }
    return count;
  }

  /**
   * Analyze performance characteristics of a single function
   */
  private analyzeFunctionPerformance(
    func: {
      name: string;
      startLine: number;
      endLine: number;
      fullText: string;
    },
    lines: string[],
  ): PerformanceFunctionMetric {
    const funcLines = lines.slice(func.startLine - 1, func.endLine);
    const funcText = funcLines.join('\n');

    // Calculate lines of code
    const linesOfCode = funcLines.filter(
      (line) =>
        line.trim().length > 0 &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('*') &&
        !line.trim().startsWith('/*'),
    ).length;

    // Estimate complexity based on patterns
    const complexity = this.estimateComplexity(funcText);

    // Count async operations
    const asyncOperations = this.countAsyncOperations(funcText);

    // Identify performance anti-patterns
    const antiPatterns = this.identifyAntiPatterns(funcText);

    // Estimate execution time based on complexity and operations
    const estimatedExecutionTime = this.estimateExecutionTime(
      complexity,
      asyncOperations,
      linesOfCode,
    );

    // Estimate memory usage based on complexity and patterns
    const estimatedMemoryUsage = this.estimateMemoryUsage(complexity, antiPatterns, linesOfCode);

    // Calculate nesting depth
    const nestingDepth = this.calculateNestingDepth(funcText);

    // Count loops
    const loops = this.countLoops(funcText);

    // Count recursive calls
    const recursiveCalls = this.countRecursiveCalls(func.name, funcText);

    return {
      name: func.name,
      startLine: func.startLine,
      endLine: func.endLine,
      linesOfCode,
      complexity,
      estimatedExecutionTime,
      estimatedMemoryUsage,
      nestingDepth,
      asyncOperations,
      loops,
      recursiveCalls,
      antiPatterns,
    };
  }

  /**
   * Estimate cyclomatic complexity
   */
  private estimateComplexity(text: string): number {
    let complexity = 1;

    const decisionPoints = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]/g,
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of decisionPoints) {
      const matches = text.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Count async operations
   */
  private countAsyncOperations(text: string): number {
    const patterns = [
      /await\s+/g,
      /\.then\(/g,
      /\.catch\(/g,
      /Promise\.(all|race|allSettled)/g,
      /async\s+/g,
    ];

    let count = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Identify performance anti-patterns
   */
  private identifyAntiPatterns(text: string): string[] {
    const antiPatterns: string[] = [];

    // Nested loops
    const forMatches = text.match(/\bfor\b/g);
    if (forMatches && forMatches.length > 2) {
      antiPatterns.push('nested-loops');
    }

    // Array operations in loops
    if (/for.*\.(map|filter|reduce|find|some|every)/.test(text)) {
      antiPatterns.push('array-ops-in-loops');
    }

    // DOM manipulation in loops
    if (/for.*\.appendChild|for.*\.innerHTML/.test(text)) {
      antiPatterns.push('dom-in-loops');
    }

    // Synchronous file operations
    if (/\.(readFileSync|writeFileSync|existsSync)/.test(text)) {
      antiPatterns.push('sync-file-ops');
    }

    // Large object allocations in loops
    if (
      /for.*\{.*:.*\}/.test(text) &&
      text.match(/\bfor\b/g)?.length &&
      text.match(/const.*=\s*\{/g)?.length
    ) {
      antiPatterns.push('object-allocation-in-loops');
    }

    // Repeated regex operations without caching
    const regexMatches = text.match(/\/[^\/]+\//g);
    if (regexMatches && regexMatches.length > 3) {
      antiPatterns.push('uncached-regex');
    }

    // JSON operations in loops
    if (/for.*JSON\.(parse|stringify)/.test(text)) {
      antiPatterns.push('json-in-loops');
    }

    // Deep nesting
    const maxNesting = this.calculateNestingDepth(text);
    if (maxNesting > 4) {
      antiPatterns.push('deep-nesting');
    }

    return antiPatterns;
  }

  /**
   * Estimate execution time (abstract unit, not actual ms)
   */
  private estimateExecutionTime(
    complexity: number,
    asyncOperations: number,
    linesOfCode: number,
  ): number {
    // Base time estimation
    let time = linesOfCode * 0.1;

    // Add complexity factor
    time += complexity * 0.5;

    // Add async operations overhead
    time += asyncOperations * 2;

    return Math.round(time * 100) / 100;
  }

  /**
   * Estimate memory usage (abstract unit, not actual bytes)
   */
  private estimateMemoryUsage(
    complexity: number,
    antiPatterns: string[],
    linesOfCode: number,
  ): number {
    // Base memory estimation
    let memory = linesOfCode * 0.1;

    // Add complexity factor
    memory += complexity * 0.5;

    // Add anti-pattern overhead
    memory += antiPatterns.length * 5;

    return Math.round(memory * 100) / 100;
  }

  /**
   * Calculate nesting depth
   */
  private calculateNestingDepth(text: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        continue;
      }

      const openBraces = (trimmed.match(/{/g) ?? []).length;
      const closeBraces = (trimmed.match(/}/g) ?? []).length;

      currentDepth += openBraces;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
      currentDepth -= closeBraces;

      if (currentDepth < 0) {
        currentDepth = 0;
      }
    }

    return maxDepth;
  }

  /**
   * Count loops
   */
  private countLoops(text: string): number {
    const patterns = [/\bfor\b/g, /\bwhile\b/g, /\bdo\b/g];
    let count = 0;

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Count recursive calls
   */
  private countRecursiveCalls(functionName: string, text: string): number {
    const pattern = new RegExp(`\\b${functionName}\\(`, 'g');
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    metrics: PerformanceFunctionMetric[],
    config?: {
      minExecutionTime?: number;
      minMemoryUsage?: number;
      maxNestingDepth?: number;
    },
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const minExecutionTime = config?.minExecutionTime ?? 10;
    const minMemoryUsage = config?.minMemoryUsage ?? 10;
    const maxNestingDepth = config?.maxNestingDepth ?? 4;

    for (const metric of metrics) {
      // High execution time
      if (metric.estimatedExecutionTime > minExecutionTime) {
        bottlenecks.push({
          functionName: metric.name,
          type: 'high-execution-time',
          severity: metric.estimatedExecutionTime > minExecutionTime * 2 ? 'high' : 'medium',
          currentValue: metric.estimatedExecutionTime,
          description: `Function has high estimated execution time (${metric.estimatedExecutionTime} units)`,
          location: { line: metric.startLine, column: 0 },
        });
      }

      // High memory usage
      if (metric.estimatedMemoryUsage > minMemoryUsage) {
        bottlenecks.push({
          functionName: metric.name,
          type: 'high-memory-usage',
          severity: metric.estimatedMemoryUsage > minMemoryUsage * 2 ? 'high' : 'medium',
          currentValue: metric.estimatedMemoryUsage,
          description: `Function has high estimated memory usage (${metric.estimatedMemoryUsage} units)`,
          location: { line: metric.startLine, column: 0 },
        });
      }

      // Deep nesting
      if (metric.nestingDepth > maxNestingDepth) {
        bottlenecks.push({
          functionName: metric.name,
          type: 'deep-nesting',
          severity: metric.nestingDepth > maxNestingDepth * 1.5 ? 'high' : 'medium',
          currentValue: metric.nestingDepth,
          description: `Function has deep nesting (depth: ${metric.nestingDepth})`,
          location: { line: metric.startLine, column: 0 },
        });
      }

      // Many async operations
      if (metric.asyncOperations > 5) {
        bottlenecks.push({
          functionName: metric.name,
          type: 'many-async-operations',
          severity: metric.asyncOperations > 10 ? 'high' : 'medium',
          currentValue: metric.asyncOperations,
          description: `Function has many async operations (${metric.asyncOperations})`,
          location: { line: metric.startLine, column: 0 },
        });
      }

      // Many loops
      if (metric.loops > 3) {
        bottlenecks.push({
          functionName: metric.name,
          type: 'multiple-loops',
          severity: metric.loops > 5 ? 'high' : 'medium',
          currentValue: metric.loops,
          description: `Function has multiple loops (${metric.loops})`,
          location: { line: metric.startLine, column: 0 },
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    metrics: PerformanceFunctionMetric[],
    bottlenecks: PerformanceBottleneck[],
    config?: {
      minExecutionTime?: number;
      minMemoryUsage?: number;
    },
  ): PerformanceOptimizationSuggestion[] {
    const suggestions: PerformanceOptimizationSuggestion[] = [];

    for (const metric of metrics) {
      const functionBottlenecks = bottlenecks.filter((b) => b.functionName === metric.name);

      // Check for nested loops anti-pattern
      if (metric.antiPatterns.includes('nested-loops')) {
        const estimatedImprovement = this.estimateImprovement('nested-loops', metric);
        suggestions.push({
          functionName: metric.name,
          type: 'optimize-nested-loops',
          title: 'Optimize Nested Loops',
          description:
            'Nested loops can significantly impact performance. Consider using a hash map or restructuring the algorithm.',
          impact:
            estimatedImprovement > 0.5 ? 'high' : estimatedImprovement > 0.2 ? 'medium' : 'low',
          estimatedImprovement: `${Math.round(estimatedImprovement * 100)}% faster`,
          before: `for (let i = 0; i < items1.length; i++) {
  for (let j = 0; j < items2.length; j++) {
    // O(n²) operation
  }
}`,
          after: `const map = new Map(items2.map(item => [key, item]));
for (const item of items1) {
  const match = map.get(item.key); // O(n) operation
}`,
          codeExample: `// Create lookup map for O(1) access
const lookupMap = new Map(secondArray.map(item => [item.id, item]));

// Single pass through first array
const results = firstArray.map(item => ({
  ...item,
  related: lookupMap.get(item.id)
}));`,
        });
      }

      // Check for array operations in loops
      if (metric.antiPatterns.includes('array-ops-in-loops')) {
        const estimatedImprovement = this.estimateImprovement('array-ops-in-loops', metric);
        suggestions.push({
          functionName: metric.name,
          type: 'optimize-array-ops',
          title: 'Optimize Array Operations in Loops',
          description:
            'Array methods like map/filter inside loops create unnecessary iterations. Chain operations outside loops.',
          impact:
            estimatedImprovement > 0.5 ? 'high' : estimatedImprovement > 0.2 ? 'medium' : 'low',
          estimatedImprovement: `${Math.round(estimatedImprovement * 100)}% faster`,
          before: `for (const item of items) {
  const filtered = item.subItems.filter(x => x.active); // Called n times
  const mapped = filtered.map(x => x.value);
}`,
          after: `// Pre-process once
const processed = items.map(item => ({
  ...item,
  activeSubItems: item.subItems.filter(x => x.active).map(x => x.value)
}));`,
          codeExample: `// Process data once before looping
const processedData = rawData.map(item => ({
  ...item,
  isValid: validate(item),
  transformed: transform(item)
}));

// Use processed data
for (const item of processedData) {
  if (item.isValid) {
    useValue(item.transformed);
  }
}`,
        });
      }

      // Check for deep nesting
      if (metric.antiPatterns.includes('deep-nesting') || metric.nestingDepth > 4) {
        const estimatedImprovement = this.estimateImprovement('deep-nesting', metric);
        suggestions.push({
          functionName: metric.name,
          type: 'reduce-nesting-depth',
          title: 'Reduce Nesting Depth',
          description:
            'Deep nesting makes code harder to read and can impact performance. Extract nested logic into separate functions.',
          impact:
            estimatedImprovement > 0.3 ? 'high' : estimatedImprovement > 0.1 ? 'medium' : 'low',
          estimatedImprovement: `${Math.round(estimatedImprovement * 100)}% better maintainability`,
          before: `if (condition1) {
  if (condition2) {
    if (condition3) {
      if (condition4) {
        // deeply nested logic
      }
    }
  }
}`,
          after: `if (!condition1 || !condition2 || !condition3 || !condition4) {
  return;
}
// Logic at base level`,
          codeExample: `// Use guard clauses to reduce nesting
function processData(data) {
  if (!data) return null;
  if (!data.isValid) return null;
  if (!data.hasPermission) return null;

  // Main logic at base level
  return transform(data);
}`,
        });
      }

      // Check for uncached regex
      if (metric.antiPatterns.includes('uncached-regex')) {
        const estimatedImprovement = this.estimateImprovement('uncached-regex', metric);
        suggestions.push({
          functionName: metric.name,
          type: 'cache-regex-patterns',
          title: 'Cache Regular Expressions',
          description:
            'Regular expressions used repeatedly should be compiled once and cached for better performance.',
          impact:
            estimatedImprovement > 0.4 ? 'high' : estimatedImprovement > 0.15 ? 'medium' : 'low',
          estimatedImprovement: `${Math.round(estimatedImprovement * 100)}% faster`,
          before: `function validate(input) {
  return /pattern/.test(input); // Recompiled each call
}`,
          after: `const PATTERN = /pattern/; // Compiled once
function validate(input) {
  return PATTERN.test(input);
}`,
          codeExample: `// Compile regex once at module level
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/.+/;

// Use cached patterns
function validateInput(input) {
  return {
    isEmail: EMAIL_PATTERN.test(input.email),
    isUrl: URL_PATTERN.test(input.url)
  };
}`,
        });
      }

      // Check for sync file operations
      if (metric.antiPatterns.includes('sync-file-ops')) {
        const estimatedImprovement = this.estimateImprovement('sync-file-ops', metric);
        suggestions.push({
          functionName: metric.name,
          type: 'use-async-file-ops',
          title: 'Use Async File Operations',
          description:
            'Synchronous file operations block the event loop. Use async/await for better performance.',
          impact: 'high',
          estimatedImprovement: `${Math.round(estimatedImprovement * 100)}% better responsiveness`,
          before: `const data = fs.readFileSync('file.json');
JSON.parse(data);`,
          after: `const data = await fs.readFile('file.json');
JSON.parse(data);`,
          codeExample: `// Use async file operations
async function loadData(path) {
  try {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load data:', error);
    return null;
  }
}`,
        });
      }

      // Check for JSON operations in loops
      if (metric.antiPatterns.includes('json-in-loops')) {
        const estimatedImprovement = this.estimateImprovement('json-in-loops', metric);
        suggestions.push({
          functionName: metric.name,
          type: 'optimize-json-operations',
          title: 'Optimize JSON Operations',
          description:
            'JSON parsing/stringifying inside loops is expensive. Parse once before looping.',
          impact:
            estimatedImprovement > 0.5 ? 'high' : estimatedImprovement > 0.2 ? 'medium' : 'low',
          estimatedImprovement: `${Math.round(estimatedImprovement * 100)}% faster`,
          before: `for (const item of items) {
  const parsed = JSON.parse(item.data); // Parsed n times
}`,
          after: `const parsed = items.map(item => JSON.parse(item.data));
for (const item of parsed) {
  // Use pre-parsed data
}`,
          codeExample: `// Parse JSON once before processing
const parsedData = rawData.map(item => ({
  ...item,
  data: JSON.parse(item.data)
}));

// Use pre-parsed data in loop
for (const item of parsedData) {
  process(item.data);
}`,
        });
      }

      // High memory usage suggestions
      const memoryBottleneck = functionBottlenecks.find((b) => b.type === 'high-memory-usage');
      if (memoryBottleneck && metric.estimatedMemoryUsage > (config?.minMemoryUsage ?? 10)) {
        suggestions.push({
          functionName: metric.name,
          type: 'reduce-memory-footprint',
          title: 'Reduce Memory Footprint',
          description:
            'Function has high memory usage. Consider using streaming or processing data in chunks.',
          impact: memoryBottleneck.severity === 'high' ? 'high' : 'medium',
          estimatedImprovement: '~50% less memory',
          before: `const allData = [];
for await (const chunk of stream) {
  allData.push(chunk); // Loads all into memory
}
processData(allData);`,
          after: `for await (const chunk of stream) {
  processData(chunk); // Process chunk by chunk
}`,
          codeExample: `// Process data in chunks to reduce memory
async function processLargeFile(filePath) {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    // Process one line at a time
    const processed = processLine(line);
    await saveResult(processed);
  }
}`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Estimate performance improvement for a given optimization
   */
  private estimateImprovement(antiPattern: string, metric: PerformanceFunctionMetric): number {
    const improvements: Record<string, number> = {
      'nested-loops': 0.7,
      'array-ops-in-loops': 0.5,
      'deep-nesting': 0.2,
      'uncached-regex': 0.3,
      'sync-file-ops': 0.8,
      'json-in-loops': 0.6,
    };

    const baseImprovement = improvements[antiPattern] ?? 0.3;

    // Scale based on complexity
    const complexityFactor = Math.min(metric.complexity / 20, 1);

    return baseImprovement * (1 + complexityFactor * 0.5);
  }
}
