import * as vscode from 'vscode';

import {
  ComplexityAnalysisResult,
  ComplexityMetric,
  FunctionComplexityInfo,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Complexity Analysis Service
 *
 * Analyzes function complexity and identifies overly complex code.
 * Calculates cyclomatic complexity, nesting depth, and other metrics.
 * Provides suggestions for refactoring opportunities.
 */
export class ComplexityAnalysisService {
  private static instance: ComplexityAnalysisService | undefined;
  private logger: Logger;

  // Patterns for detecting functions and code blocks
  private readonly functionPatterns = {
    // Named function: function name() {}
    namedFunction: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    // Arrow function with name: const name = () => {}
    arrowFunction:
      /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
    // Method: methodName() {}
    method: /(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    // Class method
    classMethod: /(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    // React/functional component
    component: /(?:const|let|var)\s+([A-Z][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
    // Exported function
    exportFunction: /export\s+(?:const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  };

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ComplexityAnalysisService {
    ComplexityAnalysisService.instance ??= new ComplexityAnalysisService();
    return ComplexityAnalysisService.instance;
  }

  /**
   * Analyze complexity of a document
   */
  public async analyzeComplexity(
    document: vscode.TextDocument,
    config?: {
      maxFunctionLength?: number;
      maxCyclomaticComplexity?: number;
      maxNestingDepth?: number;
      maxParameters?: number;
    },
  ): Promise<ComplexityAnalysisResult> {
    const startTime = Date.now();
    const text = document.getText();
    const lines = text.split('\n');

    try {
      // Extract all functions from the document
      const functions = this.extractFunctions(text, lines);

      // Analyze each function's complexity
      const functionComplexityInfos: FunctionComplexityInfo[] = [];
      for (const func of functions) {
        const complexity = this.analyzeFunctionComplexity(func, text, lines);
        functionComplexityInfos.push(complexity);
      }

      // Calculate overall metrics
      const metrics = this.calculateMetrics(functionComplexityInfos, config);

      // Generate suggestions
      const suggestions = this.generateSuggestions(functionComplexityInfos, metrics, config);

      // Calculate overall score and grade
      const overallScore = this.calculateOverallScore(metrics);
      const overallGrade = this.calculateGrade(overallScore);

      const analysisDuration = Date.now() - startTime;

      this.logger.debug(`Complexity analysis completed in ${analysisDuration}ms`, {
        file: document.fileName,
        functionsAnalyzed: functions.length,
        overallScore,
        overallGrade,
      });

      return {
        file: document.fileName,
        overallScore,
        overallGrade,
        metrics,
        functions: functionComplexityInfos,
        suggestions,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error analyzing complexity', error);
      return {
        file: document.fileName,
        overallScore: 0,
        overallGrade: 'F',
        metrics: [],
        functions: [],
        suggestions: ['Failed to analyze code complexity'],
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
   * Analyze complexity of a single function
   */
  private analyzeFunctionComplexity(
    func: {
      name: string;
      startLine: number;
      endLine: number;
      fullText: string;
    },
    _fullText: string,
    lines: string[],
  ): FunctionComplexityInfo {
    const funcLines = lines.slice(func.startLine - 1, func.endLine);
    const funcText = funcLines.join('\n');

    // Calculate cyclomatic complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(funcText);

    // Calculate maximum nesting depth
    const nestingDepth = this.calculateNestingDepth(funcText);

    // Calculate lines of code (excluding blank lines and comments)
    const linesOfCode = funcLines.filter(
      (line) =>
        line.trim().length > 0 &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('*') &&
        !line.trim().startsWith('/*'),
    ).length;

    // Count parameters
    const parameters = this.countParameters(funcLines[0] ?? '');

    return {
      name: func.name,
      startLine: func.startLine,
      endLine: func.endLine,
      cyclomaticComplexity,
      nestingDepth,
      linesOfCode,
      parameters,
    };
  }

  /**
   * Calculate cyclomatic complexity
   * Based on decision points: if, for, while, case, catch, &&, ||, ?:
   */
  private calculateCyclomaticComplexity(text: string): number {
    // Base complexity is 1
    let complexity = 1;

    // Decision point patterns
    const decisionPoints = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]/g, // ternary operator
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
   * Calculate maximum nesting depth
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

      // Count opening braces that increase nesting
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
   * Count parameters in a function signature
   */
  private countParameters(signature: string): number {
    // Match parameters inside parentheses
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) {
      return 0;
    }

    const paramsString = match[1] ?? '';

    // Handle empty parameter list
    if (!paramsString.trim()) {
      return 0;
    }

    // Split by comma and filter out empty strings
    const params = paramsString.split(',').filter((p) => p.trim().length > 0);

    return params.length;
  }

  /**
   * Calculate overall metrics
   */
  private calculateMetrics(
    functions: FunctionComplexityInfo[],
    config?: {
      maxFunctionLength?: number;
      maxCyclomaticComplexity?: number;
      maxNestingDepth?: number;
      maxParameters?: number;
    },
  ): ComplexityMetric[] {
    const metrics: ComplexityMetric[] = [];

    const maxFunctionLength = config?.maxFunctionLength ?? 50;
    const maxCyclomaticComplexity = config?.maxCyclomaticComplexity ?? 10;
    const maxNestingDepth = config?.maxNestingDepth ?? 4;
    const maxParameters = config?.maxParameters ?? 5;

    // Calculate average complexity
    if (functions.length > 0) {
      const avgCyclomatic =
        functions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) / functions.length;
      const avgNestingDepth =
        functions.reduce((sum, f) => sum + f.nestingDepth, 0) / functions.length;
      const avgLinesOfCode =
        functions.reduce((sum, f) => sum + f.linesOfCode, 0) / functions.length;

      metrics.push({
        name: 'Average Cyclomatic Complexity',
        value: Math.round(avgCyclomatic * 10) / 10,
        threshold: maxCyclomaticComplexity,
        status:
          avgCyclomatic <= maxCyclomaticComplexity
            ? 'good'
            : avgCyclomatic <= maxCyclomaticComplexity * 1.5
              ? 'warning'
              : 'error',
      });

      metrics.push({
        name: 'Average Nesting Depth',
        value: Math.round(avgNestingDepth * 10) / 10,
        threshold: maxNestingDepth,
        status:
          avgNestingDepth <= maxNestingDepth
            ? 'good'
            : avgNestingDepth <= maxNestingDepth * 1.5
              ? 'warning'
              : 'error',
      });

      metrics.push({
        name: 'Average Function Length',
        value: Math.round(avgLinesOfCode),
        threshold: maxFunctionLength,
        status:
          avgLinesOfCode <= maxFunctionLength
            ? 'good'
            : avgLinesOfCode <= maxFunctionLength * 1.5
              ? 'warning'
              : 'error',
      });

      // Count complex functions
      const complexFunctions = functions.filter(
        (f) => f.cyclomaticComplexity > maxCyclomaticComplexity,
      ).length;
      metrics.push({
        name: 'Complex Functions',
        value: complexFunctions,
        threshold: Math.max(1, Math.floor(functions.length * 0.2)),
        status:
          complexFunctions === 0
            ? 'good'
            : complexFunctions <= functions.length * 0.2
              ? 'warning'
              : 'error',
      });

      // Count long functions
      const longFunctions = functions.filter((f) => f.linesOfCode > maxFunctionLength).length;
      metrics.push({
        name: 'Long Functions',
        value: longFunctions,
        threshold: Math.max(1, Math.floor(functions.length * 0.2)),
        status:
          longFunctions === 0
            ? 'good'
            : longFunctions <= functions.length * 0.2
              ? 'warning'
              : 'error',
      });

      // Count deeply nested functions
      const deeplyNestedFunctions = functions.filter(
        (f) => f.nestingDepth > maxNestingDepth,
      ).length;
      metrics.push({
        name: 'Deeply Nested Functions',
        value: deeplyNestedFunctions,
        threshold: Math.max(1, Math.floor(functions.length * 0.2)),
        status:
          deeplyNestedFunctions === 0
            ? 'good'
            : deeplyNestedFunctions <= functions.length * 0.2
              ? 'warning'
              : 'error',
      });
    }

    return metrics;
  }

  /**
   * Generate suggestions for refactoring
   */
  private generateSuggestions(
    functions: FunctionComplexityInfo[],
    metrics: ComplexityMetric[],
    config?: {
      maxFunctionLength?: number;
      maxCyclomaticComplexity?: number;
      maxNestingDepth?: number;
      maxParameters?: number;
    },
  ): string[] {
    const suggestions: string[] = [];

    const maxFunctionLength = config?.maxFunctionLength ?? 50;
    const maxCyclomaticComplexity = config?.maxCyclomaticComplexity ?? 10;
    const maxNestingDepth = config?.maxNestingDepth ?? 4;
    const maxParameters = config?.maxParameters ?? 5;

    // Find functions with high cyclomatic complexity
    const complexFunctions = functions.filter(
      (f) => f.cyclomaticComplexity > maxCyclomaticComplexity,
    );
    if (complexFunctions.length > 0) {
      suggestions.push(
        `${complexFunctions.length} function(s) exceed cyclomatic complexity threshold of ${maxCyclomaticComplexity}`,
      );
      for (const func of complexFunctions.slice(0, 3)) {
        suggestions.push(
          `  - "${func.name}" (line ${func.startLine}): complexity ${func.cyclomaticComplexity}`,
        );
      }
      if (complexFunctions.length > 3) {
        suggestions.push(`  - and ${complexFunctions.length - 3} more...`);
      }
    }

    // Find long functions
    const longFunctions = functions.filter((f) => f.linesOfCode > maxFunctionLength);
    if (longFunctions.length > 0) {
      suggestions.push(
        `${longFunctions.length} function(s) exceed length threshold of ${maxFunctionLength} lines`,
      );
      for (const func of longFunctions.slice(0, 3)) {
        suggestions.push(`  - "${func.name}" (line ${func.startLine}): ${func.linesOfCode} lines`);
      }
      if (longFunctions.length > 3) {
        suggestions.push(`  - and ${longFunctions.length - 3} more...`);
      }
    }

    // Find deeply nested functions
    const deeplyNestedFunctions = functions.filter((f) => f.nestingDepth > maxNestingDepth);
    if (deeplyNestedFunctions.length > 0) {
      suggestions.push(
        `${deeplyNestedFunctions.length} function(s) exceed nesting depth threshold of ${maxNestingDepth}`,
      );
      for (const func of deeplyNestedFunctions.slice(0, 3)) {
        suggestions.push(`  - "${func.name}" (line ${func.startLine}): depth ${func.nestingDepth}`);
      }
      if (deeplyNestedFunctions.length > 3) {
        suggestions.push(`  - and ${deeplyNestedFunctions.length - 3} more...`);
      }
    }

    // Find functions with many parameters
    const manyParamFunctions = functions.filter((f) => f.parameters > maxParameters);
    if (manyParamFunctions.length > 0) {
      suggestions.push(
        `${manyParamFunctions.length} function(s) have more than ${maxParameters} parameters`,
      );
      for (const func of manyParamFunctions.slice(0, 3)) {
        suggestions.push(
          `  - "${func.name}" (line ${func.startLine}): ${func.parameters} parameters`,
        );
      }
      if (manyParamFunctions.length > 3) {
        suggestions.push(`  - and ${manyParamFunctions.length - 3} more...`);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('All functions are within acceptable complexity thresholds!');
    }

    return suggestions;
  }

  /**
   * Calculate overall score (0-100)
   */
  private calculateOverallScore(metrics: ComplexityMetric[]): number {
    if (metrics.length === 0) {
      return 100;
    }

    let totalScore = 0;
    let weightSum = 0;

    for (const metric of metrics) {
      const weight = 1;
      let score = 100;

      if (metric.status === 'good') {
        score = 100;
      } else if (metric.status === 'warning') {
        score = 70;
      } else if (metric.status === 'error') {
        // Scale error score based on how far over threshold
        const ratio = metric.value / metric.threshold;
        score = Math.max(0, 50 - (ratio - 1) * 20);
      }

      totalScore += score * weight;
      weightSum += weight;
    }

    return Math.round(totalScore / weightSum);
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}
