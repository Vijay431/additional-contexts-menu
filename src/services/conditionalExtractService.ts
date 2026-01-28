import * as vscode from 'vscode';

import { ConditionalExtractResult, ComplexConditional } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Conditional Extract Service
 *
 * Identifies complex conditional expressions and extracts them into named predicate functions.
 * Improves code readability by creating self-documenting condition checks.
 */
export class ConditionalExtractService {
  private static instance: ConditionalExtractService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  // Complexity thresholds
  private readonly DEFAULT_MAX_CONDITIONS = 3;
  private readonly DEFAULT_MAX_NESTING_DEPTH = 2;
  private readonly DEFAULT_MIN_OPERATORS = 3;

  // Patterns for detecting conditionals
  private readonly patterns = {
    // if/else statements
    ifStatement: /if\s*\((.+?)\)/gs,
    // ternary operators
    ternary: /(.+?)\s*\?\s*(.+?)\s*:\s*(.+?)(?:[;)\n]|$)/gs,
    // logical AND in condition
    logicalAnd: /(.+?)\s+&&\s+(.+)/gs,
    // logical OR in condition
    logicalOr: /(.+?)\s+\|\|\s+(.+)/gs,
    // complex comparison
    comparison: /(.+?)\s+(===|==|!==|!=|<=|>=|<|>)\s+(.+)/gs,
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('conditionalExtract');
  }

  public static getInstance(): ConditionalExtractService {
    ConditionalExtractService.instance ??= new ConditionalExtractService();
    return ConditionalExtractService.instance;
  }

  /**
   * Analyze a document for complex conditionals
   */
  public async analyzeConditionals(
    document: vscode.TextDocument,
    options?: {
      maxConditions?: number;
      maxNestingDepth?: number;
      minOperators?: number;
    },
  ): Promise<ConditionalExtractResult> {
    const startTime = Date.now();
    const text = document.getText();
    const lines = text.split('\n');

    const maxConditions = options?.maxConditions ?? this.DEFAULT_MAX_CONDITIONS;
    const maxNestingDepth = options?.maxNestingDepth ?? this.DEFAULT_MAX_NESTING_DEPTH;
    const minOperators = options?.minOperators ?? this.DEFAULT_MIN_OPERATORS;

    try {
      const conditionals: ComplexConditional[] = [];
      const suggestions: string[] = [];

      // Find all if statements and ternary operators
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineConditionals = this.findConditionalsInLine(
          line,
          i,
          text,
          maxConditions,
          maxNestingDepth,
          minOperators,
        );
        conditionals.push(...lineConditionals);
      }

      // Generate suggestions and predicate function names
      for (const conditional of conditionals) {
        const suggestion = this.generateSuggestion(conditional);
        suggestions.push(suggestion);

        // Suggest predicate function name
        const predicateName = this.generatePredicateName(conditional);
        conditional.suggestedPredicateName = predicateName;
      }

      const analysisDuration = Date.now() - startTime;

      // Create diagnostics for complex conditionals
      this.createDiagnostics(document, conditionals);

      this.logger.info('Conditional extraction analysis completed', {
        file: document.fileName,
        conditionalsFound: conditionals.length,
        analysisDuration,
      });

      return {
        file: document.fileName,
        conditionals,
        suggestions,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error analyzing conditionals', error);
      return {
        file: document.fileName,
        conditionals: [],
        suggestions: ['Failed to analyze conditionals'],
        analysisDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Find conditionals in a single line
   */
  private findConditionalsInLine(
    line: string,
    lineIndex: number,
    fullText: string,
    maxConditions: number,
    maxNestingDepth: number,
    minOperators: number,
  ): ComplexConditional[] {
    const conditionals: ComplexConditional[] = [];
    const trimmedLine = line.trim();

    // Skip comments
    if (
      trimmedLine.startsWith('//') ||
      trimmedLine.startsWith('*') ||
      trimmedLine.startsWith('/*') ||
      trimmedLine.startsWith('*/')
    ) {
      return conditionals;
    }

    // Check for if statements
    const ifMatches = [...trimmedLine.matchAll(this.patterns.ifStatement)];
    for (const match of ifMatches) {
      const condition = match[1];
      if (!condition) continue;

      const complexity = this.analyzeComplexity(condition, lineIndex, fullText);

      if (
        complexity.operators.length >= minOperators ||
        complexity.nestingDepth >= maxNestingDepth ||
        complexity.conditionCount >= maxConditions
      ) {
        conditionals.push({
          type: 'if-statement',
          condition,
          line: lineIndex + 1,
          column: trimmedLine.indexOf(condition) + 1,
          complexity: complexity.operators.length,
          nestingDepth: complexity.nestingDepth,
          conditionCount: complexity.conditionCount,
          operators: complexity.operators,
          suggestedPredicateName: '',
        });
      }
    }

    // Check for ternary operators
    const ternaryMatches = [...trimmedLine.matchAll(this.patterns.ternary)];
    for (const match of ternaryMatches) {
      const condition = match[1];
      if (!condition) continue;

      const complexity = this.analyzeComplexity(condition, lineIndex, fullText);

      if (
        complexity.operators.length >= minOperators ||
        complexity.nestingDepth >= maxNestingDepth ||
        complexity.conditionCount >= maxConditions
      ) {
        conditionals.push({
          type: 'ternary',
          condition,
          line: lineIndex + 1,
          column: trimmedLine.indexOf(condition) + 1,
          complexity: complexity.operators.length,
          nestingDepth: complexity.nestingDepth,
          conditionCount: complexity.conditionCount,
          operators: complexity.operators,
          suggestedPredicateName: '',
        });
      }
    }

    return conditionals;
  }

  /**
   * Analyze complexity of a condition
   */
  private analyzeComplexity(
    condition: string,
    lineIndex: number,
    fullText: string,
  ): {
    operators: string[];
    nestingDepth: number;
    conditionCount: number;
  } {
    const operators: string[] = [];

    // Count logical operators
    const andMatches = condition.match(/&&/g);
    const orMatches = condition.match(/\|\|/g);

    if (andMatches) operators.push(...Array(andMatches.length).fill('&&'));
    if (orMatches) operators.push(...Array(orMatches.length).fill('||'));

    // Count comparison operators
    const comparisonMatches = condition.match(/===|==|!==|!=|<=|>=|<|>/g);
    if (comparisonMatches) operators.push(...comparisonMatches);

    // Count condition count (number of comparisons/logical checks)
    const conditionCount = operators.length;

    // Calculate nesting depth (parentheses nesting)
    let nestingDepth = 0;
    let maxNesting = 0;
    for (const char of condition) {
      if (char === '(') {
        nestingDepth++;
        maxNesting = Math.max(maxNesting, nestingDepth);
      } else if (char === ')') {
        nestingDepth--;
      }
    }

    return {
      operators,
      nestingDepth: maxNesting,
      conditionCount,
    };
  }

  /**
   * Generate a predicate function name for a conditional
   */
  private generatePredicateName(conditional: ComplexConditional): string {
    const condition = conditional.condition.trim();
    const words: string[] = [];

    // Extract meaningful words from condition
    // Look for property names, function calls, and variable names
    const tokens = condition.split(/\s+&&\s+|\s+\|\|\s+/);

    for (const token of tokens) {
      // Extract variable/property names
      const variableMatch = token.match(/([a-z][a-zA-Z0-9]*)/);
      if (variableMatch && variableMatch[1] &&
          !['true', 'false', 'null', 'undefined'].includes(variableMatch[1])) {
        words.push(variableMatch[1]);
      }

      // Extract comparison values
      if (token.includes('===')) {
        const parts = token.split('===');
        if (parts[1]) {
          const value = parts[1].trim().replace(/['"`]/g, '');
          if (value) {
            words.push(value);
          }
        }
      }
    }

    // Limit to 3 meaningful words
    const meaningfulWords = words.slice(0, 3);

    if (meaningfulWords.length === 0) {
      return 'isValidCondition';
    }

    // Convert to camelCase with 'is' prefix for boolean predicates
    const predicateName =
      'is' +
      meaningfulWords
        .map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('And');

    return predicateName;
  }

  /**
   * Generate suggestion for a conditional
   */
  private generateSuggestion(conditional: ComplexConditional): string {
    const predicateName = conditional.suggestedPredicateName || 'isValidCondition';

    let suggestion = '';
    if (conditional.type === 'if-statement') {
      suggestion = `Extract condition to predicate function: \`${predicateName}()\``;
    } else {
      suggestion = `Extract ternary condition to predicate function: \`${predicateName}()\``;
    }

    suggestion += `\n  Current complexity: ${conditional.complexity} operators`;
    suggestion += `\n  Nesting depth: ${conditional.nestingDepth}`;

    return suggestion;
  }

  /**
   * Create diagnostics for complex conditionals
   */
  private createDiagnostics(
    document: vscode.TextDocument,
    conditionals: ComplexConditional[],
  ): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const conditional of conditionals) {
      const range = new vscode.Range(
        new vscode.Position(conditional.line - 1, conditional.column - 1),
        new vscode.Position(
          conditional.line - 1,
          conditional.column - 1 + conditional.condition.length,
        ),
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `Complex conditional expression detected (${conditional.complexity} operators). Consider extracting to a predicate function.`,
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.code = 'complex-conditional';
      diagnostic.source = 'Conditional Extract';

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Extract a conditional to a predicate function
   */
  public async extractConditional(
    document: vscode.TextDocument,
    conditional: ComplexConditional,
  ): Promise<string> {
    const predicateName = conditional.suggestedPredicateName || 'isValidCondition';

    // Generate the predicate function code
    const predicateFunction = `/**
 * Check if ${this.generateDescription(conditional)}
 */
function ${predicateName}(value: unknown): boolean {
  return ${conditional.condition};
}`;

    return predicateFunction;
  }

  /**
   * Generate a description for the conditional
   */
  private generateDescription(conditional: ComplexConditional): string {
    const predicateName = conditional.suggestedPredicateName || 'isValidCondition';

    // Convert camelCase to readable text
    return predicateName
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  }

  /**
   * Clear diagnostics
   */
  public clearDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
