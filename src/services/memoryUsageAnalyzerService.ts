import * as vscode from 'vscode';

import {
  MemoryLeakInfo,
  MemoryAllocationInfo,
  MemoryOptimizationSuggestion,
  MemoryUsageAnalysisResult,
  MemoryPatternType,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Memory Usage Analyzer Service
 *
 * Tracks memory allocation patterns in code.
 * Identifies potential memory leaks, large object allocations,
 * and suggests memory optimization strategies.
 */
export class MemoryUsageAnalyzerService {
  private static instance: MemoryUsageAnalyzerService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): MemoryUsageAnalyzerService {
    MemoryUsageAnalyzerService.instance ??= new MemoryUsageAnalyzerService();
    return MemoryUsageAnalyzerService.instance;
  }

  /**
   * Analyze memory usage patterns in a document
   */
  public async analyzeMemoryUsage(
    document: vscode.TextDocument,
    config?: {
      maxArraySize?: number;
      maxObjectDepth?: number;
      checkEventListeners?: boolean;
      checkTimers?: boolean;
      checkClosures?: boolean;
    },
  ): Promise<MemoryUsageAnalysisResult> {
    const startTime = Date.now();
    const text = document.getText();
    const lines = text.split('\n');

    try {
      // Extract all functions from the document
      const functions = this.extractFunctions(text, lines);

      // Analyze memory allocations
      const allocations = this.analyzeMemoryAllocations(functions, lines, text, config);

      // Detect potential memory leaks
      const leaks = this.detectMemoryLeaks(text, lines, config);

      // Analyze memory patterns
      const patterns = this.analyzeMemoryPatterns(text, lines, config);

      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(
        allocations,
        leaks,
        patterns,
        config,
      );

      // Calculate overall metrics
      const totalAllocations = allocations.length;
      const highRiskAllocations = allocations.filter(
        (a) => a.riskLevel === 'high' || a.riskLevel === 'medium',
      ).length;
      const leakCount = leaks.length;
      const patternCount = patterns.length;

      const analysisDuration = Date.now() - startTime;

      this.logger.debug(`Memory usage analysis completed in ${analysisDuration}ms`, {
        file: document.fileName,
        allocations: totalAllocations,
        leaks: leakCount,
        patterns: patternCount,
      });

      return {
        file: document.fileName,
        allocations,
        leaks,
        patterns,
        suggestions,
        overallMetrics: {
          totalAllocations,
          highRiskAllocations,
          leakCount,
          patternCount,
        },
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error analyzing memory usage', error);
      return {
        file: document.fileName,
        allocations: [],
        leaks: [],
        patterns: [],
        suggestions: [
          {
            priority: 'high',
            title: 'Analysis Failed',
            description: 'Failed to analyze memory usage',
            estimatedImpact: 'N/A',
          },
        ],
        overallMetrics: {
          totalAllocations: 0,
          highRiskAllocations: 0,
          leakCount: 0,
          patternCount: 0,
        },
        analysisDuration: Date.now() - startTime,
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

    const functionStarts: Array<{ name: string; line: number; braceCount: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.length === 0
      ) {
        continue;
      }

      const namedMatch =
        /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(|export\s+(?:const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\()/g.exec(
          line,
        );

      if (namedMatch) {
        const funcName = namedMatch[1] || namedMatch[2] || namedMatch[3] || 'anonymous';
        functionStarts.push({ name: funcName, line: i, braceCount: this.countBraces(line) });
        continue;
      }

      if (functionStarts.length > 0) {
        const currentFunc = functionStarts[functionStarts.length - 1];
        currentFunc.braceCount += this.countBraces(line);

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
   * Count brace balance in a line
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
   * Analyze memory allocations in functions
   */
  private analyzeMemoryAllocations(
    functions: Array<{
      name: string;
      startLine: number;
      endLine: number;
      fullText: string;
    }>,
    lines: string[],
    fullText: string,
    config?: {
      maxArraySize?: number;
      maxObjectDepth?: number;
      checkEventListeners?: boolean;
      checkTimers?: boolean;
      checkClosures?: boolean;
    },
  ): MemoryAllocationInfo[] {
    const allocations: MemoryAllocationInfo[] = [];

    for (const func of functions) {
      const funcLines = lines.slice(func.startLine - 1, func.endLine);
      const funcText = funcLines.join('\n');

      // Detect large array allocations
      const arrayMatches = funcText.match(
        /(?:const|let|var)\s+\w+\s*=\s*(?:new Array\(|\[)/g,
      );
      if (arrayMatches && arrayMatches.length > 0) {
        const arraySizes = this.extractArraySizes(funcText);
        for (const size of arraySizes) {
          if (size > 1000) {
            allocations.push({
              type: 'array-allocation',
              functionName: func.name,
              line: func.startLine,
              size,
              riskLevel: size > 10000 ? 'high' : 'medium',
              description: `Large array allocation (${size} elements)`,
            });
          }
        }
      }

      // Detect large object allocations
      const objectMatches = funcText.match(
        /(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]*?\}/g,
      );
      if (objectMatches) {
        for (const match of objectMatches) {
          const depth = this.calculateObjectDepth(match);
          if (depth > 5) {
            allocations.push({
              type: 'object-allocation',
              functionName: func.name,
              line: func.startLine,
              size: depth,
              riskLevel: depth > 10 ? 'high' : 'medium',
              description: `Deep object allocation (depth: ${depth})`,
            });
          }
        }
      }

      // Detect repeated allocations in loops
      const loops = this.findLoops(funcText);
      for (const loop of loops) {
        const allocationsInLoop = this.countAllocationsInLoop(loop, funcText);
        if (allocationsInLoop > 5) {
          allocations.push({
            type: 'repeated-allocation',
            functionName: func.name,
            line: func.startLine + loop.lineOffset,
            size: allocationsInLoop,
            riskLevel: 'high',
            description: `Repeated allocations in loop (${allocationsInLoop} allocations)`,
          });
        }
      }

      // Detect buffer allocations
      const bufferMatches = funcText.match(
        /(?:Buffer\.alloc|Buffer\.from|new ArrayBuffer|new SharedArrayBuffer)/g,
      );
      if (bufferMatches && bufferMatches.length > 0) {
        const bufferSizes = this.extractBufferSizes(funcText);
        for (const size of bufferSizes) {
          if (size > 1024 * 1024) {
            // > 1MB
            allocations.push({
              type: 'buffer-allocation',
              functionName: func.name,
              line: func.startLine,
              size,
              riskLevel: size > 10 * 1024 * 1024 ? 'high' : 'medium',
              description: `Large buffer allocation (${this.formatBytes(size)})`,
            });
          }
        }
      }

      // Detect closure allocations
      if (config?.checkClosures !== false) {
        const closures = this.detectClosures(funcText, func.startLine);
        allocations.push(...closures);
      }
    }

    return allocations;
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(
    text: string,
    lines: string[],
    config?: {
      checkEventListeners?: boolean;
      checkTimers?: boolean;
      checkClosures?: boolean;
    },
  ): MemoryLeakInfo[] {
    const leaks: MemoryLeakInfo[] = [];
    const checkEventListeners = config?.checkEventListeners !== false;
    const checkTimers = config?.checkTimers !== false;

    // Check for event listeners without cleanup
    if (checkEventListeners) {
      const addEventListenerMatches = text.match(/\.addEventListener\s*\(/g);
      const removeEventListenerMatches = text.match(/\.removeEventListener\s*\(/g);

      if (addEventListenerMatches && !removeEventListenerMatches) {
        leaks.push({
          type: 'event-listener-leak',
          line: this.findLineNumber(lines, '.addEventListener'),
          severity: addEventListenerMatches.length > 5 ? 'high' : 'medium',
          description: `Event listeners added (${addEventListenerMatches.length}) without explicit removal`,
          suggestion: 'Ensure event listeners are removed when no longer needed',
          codeExample: `// Add listener
const handler = () => { /* ... */ };
element.addEventListener('event', handler);

// Remember to remove
element.removeEventListener('event', handler);`,
        });
      }
    }

    // Check for timers without cleanup
    if (checkTimers) {
      const setIntervalMatches = text.match(/setInterval\s*\(/g);
      const setTimeoutMatches = text.match(/setTimeout\s*\(/g);
      const clearIntervalMatches = text.match(/clearInterval\s*\(/g);
      const clearTimeoutMatches = text.match(/clearTimeout\s*\(/g);

      if (setIntervalMatches && !clearIntervalMatches) {
        leaks.push({
          type: 'timer-leak',
          line: this.findLineNumber(lines, 'setInterval'),
          severity: 'high',
          description: `Intervals created (${setIntervalMatches.length}) without clear calls`,
          suggestion: 'Store timer IDs and clear them when done',
          codeExample: `// Store timer ID
const timerId = setInterval(() => { /* ... */ }, 1000);

// Clear when done
clearInterval(timerId);`,
        });
      }

      if (setTimeoutMatches && setTimeoutMatches.length > 5 && !clearTimeoutMatches) {
        leaks.push({
          type: 'timer-leak',
          line: this.findLineNumber(lines, 'setTimeout'),
          severity: 'medium',
          description: `Multiple timeouts (${setTimeoutMatches.length}) without clear calls`,
          suggestion: 'Consider clearing timeouts if they may be called before execution',
        });
      }
    }

    // Check for global variable pollution
    const globalVarMatches = text.match(/(?:window\.|global\.)\w+\s*=/g);
    if (globalVarMatches && globalVarMatches.length > 0) {
      leaks.push({
        type: 'global-variable-leak',
        line: this.findLineNumber(lines, 'window.'),
        severity: 'medium',
        description: `Global variables assigned (${globalVarMatches.length})`,
        suggestion: 'Avoid global variables which persist for the lifetime of the application',
        codeExample: `// Instead of:
window.myData = { /* large object */ };

// Use module scope:
const myData = { /* large object */ };`,
      });
    }

    // Check for DOM references in long-lived objects
    const domRefInClass =
      /class\s+\w+.*\{[\s\S]*?(?:element|node|dom)\s*:\s*[\s\S]*?\}/gim;
    const domRefMatches = text.match(domRefInClass);
    if (domRefMatches) {
      leaks.push({
        type: 'dom-reference-leak',
        line: this.findLineNumber(lines, 'class'),
        severity: 'medium',
        description: 'DOM references stored in class properties',
        suggestion: 'Clear DOM references when components unmount or are destroyed',
        codeExample: `class MyClass {
  private element: HTMLElement;

  cleanup() {
    // Clear reference to DOM node
    this.element = null;
  }
}`,
      });
    }

    // Check for detached DOM elements
    const createElementMatches = text.match(/document\.createElement\s*\(/g);
    const appendChildMatches = text.match(/\.appendChild\s*\(/g);

    if (createElementMatches && createElementMatches.length > appendChildMatches.length) {
      leaks.push({
        type: 'detached-dom-leak',
        line: this.findLineNumber(lines, 'createElement'),
        severity: 'low',
        description: 'Elements created but potentially not attached to DOM',
        suggestion: 'Ensure created elements are either attached or properly discarded',
      });
    }

    return leaks;
  }

  /**
   * Analyze memory usage patterns
   */
  private analyzeMemoryPatterns(
    text: string,
    lines: string[],
    config?: {
      maxArraySize?: number;
      maxObjectDepth?: number;
      checkEventListeners?: boolean;
      checkTimers?: boolean;
      checkClosures?: boolean;
    },
  ): MemoryPatternType[] {
    const patterns: MemoryPatternType[] = [];

    // Check for caching patterns (good)
    const cacheMatches = text.match(/(?:cache|memo)\w*\s*[:=]/gi);
    if (cacheMatches && cacheMatches.length > 0) {
      patterns.push({
        type: 'caching',
        category: 'optimization',
        description: `Caching patterns detected (${cacheMatches.length})`,
        impact: 'positive',
      });
    }

    // Check for object pooling patterns (good)
    const poolMatches = text.match(/(?:pool)\w*\s*[:=]/gi);
    if (poolMatches && poolMatches.length > 0) {
      patterns.push({
        type: 'object-pooling',
        category: 'optimization',
        description: 'Object pooling detected',
        impact: 'positive',
      });
    }

    // Check for lazy loading patterns (good)
    const lazyMatches =
      text.match(/(?:lazy|defer|async)\s*\(\s*function|\(\)\s*=>/g) ||
      text.match(/import\s*\(/g);
    if (lazyMatches && lazyMatches.length > 0) {
      patterns.push({
        type: 'lazy-loading',
        category: 'optimization',
        description: `Lazy loading patterns detected (${lazyMatches.length})`,
        impact: 'positive',
      });
    }

    // Check for memory-intensive patterns (bad)
    const deepCopyMatches = text.match(/JSON\.parse\(JSON\.stringify/g);
    if (deepCopyMatches && deepCopyMatches.length > 0) {
      patterns.push({
        type: 'deep-copy',
        category: 'anti-pattern',
        description: `Deep copy operations detected (${deepCopyMatches.length}) - expensive for large objects`,
        impact: 'negative',
        suggestion: 'Consider structured clone or shallow copy where appropriate',
      });
    }

    // Check for string concatenation in loops (bad)
    const loopStringMatches =
      text.match(/for\s*\([^)]*\)\s*\{[^}]*\+\s*=/g) ||
      text.match(/while\s*\([^)]*\)\s*\{[^}]*\+\s*=/g);
    if (loopStringMatches && loopStringMatches.length > 0) {
      patterns.push({
        type: 'string-concatenation-loop',
        category: 'anti-pattern',
        description: 'String concatenation in loops detected',
        impact: 'negative',
        suggestion: 'Use array join or template literals instead',
      });
    }

    // Check for streaming patterns (good)
    const streamMatches = text.match(/\.on\s*\(\s*['"]data['"]/g);
    if (streamMatches && streamMatches.length > 0) {
      patterns.push({
        type: 'streaming',
        category: 'optimization',
        description: 'Stream processing detected',
        impact: 'positive',
      });
    }

    // Check for pagination/chunking patterns (good)
    const chunkMatches = text.match(/(?:chunk|page|batch)\w*\s*[:=]/gi);
    if (chunkMatches && chunkMatches.length > 0) {
      patterns.push({
        type: 'chunking',
        category: 'optimization',
        description: 'Data chunking/pagination detected',
        impact: 'positive',
      });
    }

    return patterns;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    allocations: MemoryAllocationInfo[],
    leaks: MemoryLeakInfo[],
    patterns: MemoryPatternType[],
    config?: {
      maxArraySize?: number;
      maxObjectDepth?: number;
    },
  ): MemoryOptimizationSuggestion[] {
    const suggestions: MemoryOptimizationSuggestion[] = [];

    // Suggest fixes for large arrays
    const largeArrays = allocations.filter((a) => a.type === 'array-allocation');
    if (largeArrays.length > 0) {
      suggestions.push({
        priority: 'high',
        title: 'Optimize Large Array Allocations',
        description: `${largeArrays.length} large array(s) detected. Consider lazy loading or pagination.`,
        codeExample: `// Instead of loading all at once
const allData = new Array(100000); // Potentially large

// Use pagination or lazy loading
async function loadData(page: number, size: number) {
  const response = await fetch(\`/api/data?page=\${page}&size=\${size}\`);
  return response.json();
}`,
        estimatedImpact: 'Reduces memory footprint by 50-90%',
      });
    }

    // Suggest fixes for repeated allocations in loops
    const repeatedAllocations = allocations.filter((a) => a.type === 'repeated-allocation');
    if (repeatedAllocations.length > 0) {
      suggestions.push({
        priority: 'high',
        title: 'Move Allocations Outside Loops',
        description: `${repeatedAllocations.length} allocation(s) inside loops. Pre-allocate or reuse objects.`,
        codeExample: `// Instead of allocating in each iteration
for (let i = 0; i < 1000; i++) {
  const temp = new Array(100); // Allocates 1000 times
}

// Allocate once and reuse
const temp = new Array(100);
for (let i = 0; i < 1000; i++) {
  // Reuse temp array
  temp.fill(0);
}`,
        estimatedImpact: 'Reduces memory pressure and GC pauses',
      });
    }

    // Suggest fixes for memory leaks
    if (leaks.length > 0) {
      const eventListenerLeaks = leaks.filter((l) => l.type === 'event-listener-leak');
      if (eventListenerLeaks.length > 0) {
        suggestions.push({
          priority: 'high',
          title: 'Implement Event Listener Cleanup',
          description: 'Event listeners are not being removed, causing memory leaks',
          codeExample: `class Component {
  private handler: () => void;

  constructor(element: HTMLElement) {
    this.handler = () => this.handleEvent();
    element.addEventListener('event', this.handler);
  }

  destroy() {
    element.removeEventListener('event', this.handler);
  }
}`,
          estimatedImpact: 'Prevents memory leaks from accumulated listeners',
        });
      }

      const timerLeaks = leaks.filter((l) => l.type === 'timer-leak');
      if (timerLeaks.length > 0) {
        suggestions.push({
          priority: 'high',
          title: 'Clear Timers Properly',
          description: 'Timers are not being cleared, causing memory and performance issues',
          codeExample: `class TimerManager {
  private timers: Set<NodeJS.Timeout> = new Set();

  setInterval(callback: () => void, ms: number) {
    const timerId = setInterval(callback, ms);
    this.timers.add(timerId);
    return timerId;
  }

  cleanup() {
    this.timers.forEach(timerId => clearInterval(timerId));
    this.timers.clear();
  }
}`,
          estimatedImpact: 'Prevents runaway timer accumulation',
        });
      }
    }

    // Suggest using weak references
    const domRefLeaks = leaks.filter((l) => l.type === 'dom-reference-leak');
    if (domRefLeaks.length > 0) {
      suggestions.push({
        priority: 'medium',
        title: 'Use WeakMap/WeakSet for DOM References',
        description: 'Consider using WeakMap or WeakSet to store DOM references',
        codeExample: `// Instead of:
const domData = new Map<HTMLElement, Data>();
domData.set(element, data); // Holds element reference forever

// Use WeakMap:
const domData = new WeakMap<HTMLElement, Data>();
domData.set(element, data); // Allows GC when element is removed`,
        estimatedImpact: 'Allows garbage collection of DOM nodes',
      });
    }

    // Suggest object pooling for frequently created objects
    if (allocations.filter((a) => a.type === 'object-allocation').length > 3) {
      suggestions.push({
        priority: 'medium',
        title: 'Implement Object Pooling',
        description: 'Frequent object allocations detected. Consider object pooling.',
        codeExample: `class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.factory();
  }

  release(obj: T) {
    this.reset(obj);
    this.pool.push(obj);
  }
}`,
        estimatedImpact: 'Reduces allocation overhead and GC pressure',
      });
    }

    // Suggest streaming for large data processing
    const largeBuffers = allocations.filter((a) => a.type === 'buffer-allocation');
    if (largeBuffers.length > 0) {
      suggestions.push({
        priority: 'medium',
        title: 'Use Streaming for Large Data',
        description: 'Large buffer allocations detected. Consider streaming.',
        codeExample: `// Instead of loading entire file
const data = fs.readFileSync('large-file.txt'); // Loads all into memory

// Use streams
const stream = fs.createReadStream('large-file.txt');
stream.on('data', (chunk) => {
  processChunk(chunk); // Process piece by piece
});`,
        estimatedImpact: 'Constant memory usage regardless of file size',
      });
    }

    return suggestions;
  }

  /**
   * Extract array sizes from code
   */
  private extractArraySizes(text: string): number[] {
    const sizes: number[] = [];

    // Match new Array(size)
    const newArrayMatches = text.match(/new Array\s*\(\s*(\d+)\s*\)/g);
    if (newArrayMatches) {
      for (const match of newArrayMatches) {
        const sizeMatch = /new Array\s*\(\s*(\d+)\s*\)/.exec(match);
        if (sizeMatch) {
          sizes.push(Number.parseInt(sizeMatch[1] ?? '0', 10));
        }
      }
    }

    // Match array literals with estimated size
    const arrayLiteralMatches = text.match(/\[\s*\{[^}]*\}(?:\s*,\s*\{[^}]*\}){10,}\s*\]/g);
    if (arrayLiteralMatches) {
      for (const match of arrayLiteralMatches) {
        const itemCount = (match.match(/\{/g) ?? []).length;
        sizes.push(itemCount);
      }
    }

    return sizes;
  }

  /**
   * Calculate object nesting depth
   */
  private calculateObjectDepth(text: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of text) {
      if (char === '{') {
        currentDepth++;
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth;
        }
      } else if (char === '}') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Find loops in function text
   */
  private findLoops(text: string): Array<{ type: string; lineOffset: number }> {
    const loops: Array<{ type: string; lineOffset: number }> = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (/\b(?:for|while|do)\b/.test(line)) {
        loops.push({ type: 'loop', lineOffset: i });
      }
    }

    return loops;
  }

  /**
   * Count allocations within a loop
   */
  private countAllocationsInLoop(loop: { type: string; lineOffset: number }, text: string): number {
    const lines = text.split('\n');
    let count = 0;
    let braceCount = 0;
    let inLoop = false;

    for (let i = loop.lineOffset; i < lines.length; i++) {
      const line = lines[i] ?? '';

      if (i === loop.lineOffset) {
        inLoop = true;
      }

      if (inLoop) {
        braceCount += this.countBraces(line);

        // Count allocations
        if (
          /(?:const|let|var)\s+\w+\s*=\s*(?:new Array|new Object|\{|\[)/.test(line)
        ) {
          count++;
        }

        if (braceCount === 0 && i > loop.lineOffset) {
          break;
        }
      }
    }

    return count;
  }

  /**
   * Extract buffer sizes from code
   */
  private extractBufferSizes(text: string): number[] {
    const sizes: number[] = [];

    // Match Buffer.alloc(size)
    const allocMatches = text.match(/Buffer\.alloc\s*\(\s*(\d+)\s*\)/g);
    if (allocMatches) {
      for (const match of allocMatches) {
        const sizeMatch = /Buffer\.alloc\s*\(\s*(\d+)\s*\)/.exec(match);
        if (sizeMatch) {
          sizes.push(Number.parseInt(sizeMatch[1] ?? '0', 10));
        }
      }
    }

    // Match new ArrayBuffer(size)
    const arrayBufferMatches = text.match(/new ArrayBuffer\s*\(\s*(\d+)\s*\)/g);
    if (arrayBufferMatches) {
      for (const match of arrayBufferMatches) {
        const sizeMatch = /new ArrayBuffer\s*\(\s*(\d+)\s*\)/.exec(match);
        if (sizeMatch) {
          sizes.push(Number.parseInt(sizeMatch[1] ?? '0', 10));
        }
      }
    }

    return sizes;
  }

  /**
   * Detect closures that might capture large scopes
   */
  private detectClosures(text: string, startLine: number): MemoryAllocationInfo[] {
    const closures: MemoryAllocationInfo[] = [];

    // Detect functions inside loops
    const loopClosureMatches = text.match(
      /for\s*\([^)]*\)\s*\{[^}]*function\s*\(|for\s*\([^)]*\)\s*\{[^}]*\([^)]*\)\s*=>/g,
    );

    if (loopClosureMatches && loopClosureMatches.length > 0) {
      closures.push({
        type: 'closure-allocation',
        functionName: 'closure',
        line: startLine,
        size: loopClosureMatches.length,
        riskLevel: 'medium',
        description: `Closures created in loops (${loopClosureMatches.length})`,
      });
    }

    return closures;
  }

  /**
   * Find line number for a pattern
   */
  private findLineNumber(lines: string[], pattern: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.includes(pattern)) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  }
}
