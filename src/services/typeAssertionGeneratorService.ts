import * as vscode from 'vscode';

import {
  GeneratedAssertion,
  GeneratedTypeGuard,
  TypeAssertionGenerationOptions,
  TypeAssertionGenerationResult,
  TypeNarrowingPattern,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Type Assertion Generator Service
 *
 * Analyzes type-narrowing code and generates type assertion helpers.
 * Creates custom type guards and assertion functions for complex type conditions.
 */
export class TypeAssertionGeneratorService {
  private static instance: TypeAssertionGeneratorService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  // Patterns for detecting type narrowing
  private readonly patterns = {
    // typeof checks
    typeofCheck: /(?:if|while|&&|\|\||\?|\:)\s*\(\s*(\w+(?:\.\w+)*)\s+===?\s+(['"`])(string|number|boolean|symbol|bigint|undefined|object|function)\2/g,
    // instanceof checks
    instanceofCheck: /(?:if|while|&&|\|\||\?|\:)\s*\(\s*(\w+(?:\.\w+)*)\s+instanceof\s+([A-Z]\w*)/g,
    // in checks
    inCheck: /(?:if|while|&&|\|\||\?|\:)\s*\(\s*(['"`])(\w+)['"`"]\s+in\s+(\w+(?:\.\w+)*)\s*\)/g,
    // equality checks with specific types
    equalityCheck: /(?:if|while|&&|\|\||\?|\:)\s*\(\s*(\w+(?:\.\w+)*)\s+===?\s+(['"`])([^'"`]*)\2/g,
    // nullish checks
    nullishCheck: /(?:if|while|&&|\|\||\?|\:)\s*\(\s*(\w+(?:\.\w+)*)\s+==?\s+(null|undefined)\s*\)/g,
    // truthiness/falsiness checks
    truthinessCheck: /(?:if|while|&&|\|\||\?|\:)\s*\(\s*!?\s*(\w+(?:\.\w+)*)\s*\)/g,
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('typeAssertionGenerator');
  }

  public static getInstance(): TypeAssertionGeneratorService {
    TypeAssertionGeneratorService.instance ??= new TypeAssertionGeneratorService();
    return TypeAssertionGeneratorService.instance;
  }

  /**
   * Generate type assertions and guards from code
   */
  public async generateTypeAssertions(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: TypeAssertionGenerationOptions,
  ): Promise<TypeAssertionGenerationResult> {
    const startTime = Date.now();

    try {
      const text = document.getText(selection);
      const lines = text.split('\n');

      // Find type narrowing patterns
      const patterns = this.findTypeNarrowingPatterns(lines, selection.start.line);

      // Generate type guards from patterns
      const typeGuards: GeneratedTypeGuard[] = [];
      const assertions: GeneratedAssertion[] = [];

      if (options.includeTypeGuards) {
        const guardsFromPatterns = this.generateGuardsFromPatterns(patterns, options);
        typeGuards.push(...guardsFromPatterns);
      }

      if (options.includeAssertions) {
        const assertionsFromPatterns = this.generateAssertionsFromPatterns(
          patterns,
          options,
        );
        assertions.push(...assertionsFromPatterns);
      }

      // Generate combined code
      const generatedCode = this.generateCombinedCode(
        typeGuards,
        assertions,
        options,
      );

      const generationDuration = Date.now() - startTime;

      this.logger.info('Type assertion generation completed', {
        file: document.fileName,
        patternsFound: patterns.length,
        typeGuardsGenerated: typeGuards.length,
        assertionsGenerated: assertions.length,
        generationDuration,
      });

      return {
        file: document.fileName,
        generatedCode,
        typeGuards,
        assertions,
        patterns,
        generationDuration,
      };
    } catch (error) {
      this.logger.error('Error generating type assertions', error);
      return {
        file: document.fileName,
        generatedCode: '',
        typeGuards: [],
        assertions: [],
        patterns: [],
        generationDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Find type narrowing patterns in code lines
   */
  private findTypeNarrowingPatterns(
    lines: string[],
    startLine: number,
  ): TypeNarrowingPattern[] {
    const patterns: TypeNarrowingPattern[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (
        !trimmedLine ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('*') ||
        trimmedLine.startsWith('/*')
      ) {
        continue;
      }

      // Check for typeof patterns
      const typeofMatches = Array.from(trimmedLine.matchAll(this.patterns.typeofCheck));
      for (const match of typeofMatches) {
        const variable = match[1] ?? '';
        const type = match[3] ?? '';
        patterns.push({
          type: 'typeof',
          variable,
          targetType: type,
          checkExpression: match[0] ?? '',
          line: startLine + i + 1,
          column: (match.index ?? 0) + 1,
          codeSnippet: trimmedLine,
          suggestedGuardName: this.suggestGuardName(variable, type, 'typeof'),
        });
      }

      // Check for instanceof patterns
      const instanceofMatches = Array.from(trimmedLine.matchAll(this.patterns.instanceofCheck));
      for (const match of instanceofMatches) {
        const variable = match[1] ?? '';
        const className = match[2] ?? '';
        patterns.push({
          type: 'instanceof',
          variable,
          targetType: className,
          checkExpression: match[0] ?? '',
          line: startLine + i + 1,
          column: (match.index ?? 0) + 1,
          codeSnippet: trimmedLine,
          suggestedGuardName: this.suggestGuardName(variable, className, 'instanceof'),
        });
      }

      // Check for in patterns
      const inMatches = Array.from(trimmedLine.matchAll(this.patterns.inCheck));
      for (const match of inMatches) {
        const property = match[2] ?? '';
        const object = match[3] ?? '';
        patterns.push({
          type: 'in',
          variable: object,
          targetType: property,
          checkExpression: match[0] ?? '',
          line: startLine + i + 1,
          column: (match.index ?? 0) + 1,
          codeSnippet: trimmedLine,
          suggestedGuardName: this.suggestGuardName(object, property, 'in'),
        });
      }

      // Check for nullish patterns
      const nullishMatches = Array.from(trimmedLine.matchAll(this.patterns.nullishCheck));
      for (const match of nullishMatches) {
        const variable = match[1] ?? '';
        const nullishType = match[2] ?? '';
        patterns.push({
          type: 'nullish',
          variable,
          targetType: nullishType === 'null' ? 'null' : 'undefined',
          checkExpression: match[0] ?? '',
          line: startLine + i + 1,
          column: (match.index ?? 0) + 1,
          codeSnippet: trimmedLine,
          suggestedGuardName: this.suggestGuardName(variable, 'Defined', 'nullish'),
        });
      }
    }

    return patterns;
  }

  /**
   * Suggest a name for the type guard or assertion
   */
  private suggestGuardName(
    variable: string,
    type: string,
    patternType: string,
  ): string {
    const cleanVariable = this.capitalize(variable);
    const cleanType = this.capitalize(type);

    switch (patternType) {
      case 'typeof':
        return `is${cleanType}${cleanVariable}`;
      case 'instanceof':
        return `is${cleanType}`;
      case 'in':
        return `has${cleanType}`;
      case 'nullish':
        return `isDefined${cleanVariable}`;
      default:
        return `is${cleanType}${cleanVariable}`;
    }
  }

  /**
   * Capitalize the first letter of a string
   */
  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate type guards from patterns
   */
  private generateGuardsFromPatterns(
    patterns: TypeNarrowingPattern[],
    options: TypeAssertionGenerationOptions,
  ): GeneratedTypeGuard[] {
    const guards: GeneratedTypeGuard[] = [];
    const uniqueGuards = new Map<string, TypeNarrowingPattern[]>();

    // Group patterns by suggested guard name
    for (const pattern of patterns) {
      const guardName = pattern.suggestedGuardName;
      if (!uniqueGuards.has(guardName)) {
        uniqueGuards.set(guardName, []);
      }
      uniqueGuards.get(guardName)?.push(pattern);
    }

    // Generate guards for each unique pattern
    for (const [guardName, patternList] of Array.from(uniqueGuards.entries())) {
      const pattern = patternList[0]!;
      const guardCode = this.generateGuardCode(guardName, pattern, options);

      guards.push({
        name: guardName,
        code: guardCode,
        description: this.generateGuardDescription(pattern),
        usage: `if (${guardName}(${pattern.variable})) { /* narrowed type */ }`,
        patterns: patternList,
      });
    }

    return guards;
  }

  /**
   * Generate guard code for a pattern
   */
  private generateGuardCode(
    guardName: string,
    pattern: TypeNarrowingPattern,
    options: TypeAssertionGenerationOptions,
  ): string {
    const jsDoc = options.includeJSDoc
      ? `/**
 * Type guard to check if ${pattern.variable} is of type ${pattern.targetType}
 * @param value - The value to check
 * @returns True if the value is of type ${pattern.targetType}
 */
`
      : '';

    const exportKeyword = options.exportFunctions ? 'export ' : '';
    const typeParam = options.generateRuntimeChecks ? `<T>(value: T)` : `(value: unknown)`;

    switch (pattern.type) {
      case 'typeof':
        return `${jsDoc}${exportKeyword}function ${guardName}${typeParam}: value is ${pattern.targetType} {
  return typeof value === '${pattern.targetType}';
}`;
      case 'instanceof':
        return `${jsDoc}${exportKeyword}function ${guardName}(value: unknown): value is ${pattern.targetType} {
  return value instanceof ${pattern.targetType};
}`;
      case 'in':
        return `${jsDoc}${exportKeyword}function ${guardName}(obj: Record<string, unknown>): obj is Record<string, unknown> & { ${pattern.targetType}: unknown } {
  return '${pattern.targetType}' in obj;
}`;
      case 'nullish':
        return `${jsDoc}${exportKeyword}function ${guardName}<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}`;
      default:
        return `${jsDoc}${exportKeyword}function ${guardName}(value: unknown): value is ${pattern.targetType} {
  // TODO: Implement proper type checking for ${pattern.targetType}
  return typeof value === '${pattern.targetType}';
}`;
    }
  }

  /**
   * Generate description for a guard
   */
  private generateGuardDescription(pattern: TypeNarrowingPattern): string {
    switch (pattern.type) {
      case 'typeof':
        return `Type guard to check if value is of primitive type '${pattern.targetType}'`;
      case 'instanceof':
        return `Type guard to check if value is an instance of ${pattern.targetType}`;
      case 'in':
        return `Type guard to check if object has property '${pattern.targetType}'`;
      case 'nullish':
        return `Type guard to check if value is not null or undefined`;
      default:
        return `Type guard for ${pattern.targetType}`;
    }
  }

  /**
   * Generate assertion functions from patterns
   */
  private generateAssertionsFromPatterns(
    patterns: TypeNarrowingPattern[],
    options: TypeAssertionGenerationOptions,
  ): GeneratedAssertion[] {
    const assertions: GeneratedAssertion[] = [];
    const uniqueAssertions = new Map<string, TypeNarrowingPattern[]>();

    // Group patterns by suggested assertion name (use 'assert' prefix)
    for (const pattern of patterns) {
      const assertionName = pattern.suggestedGuardName.replace(/^is/, 'assert');
      if (!uniqueAssertions.has(assertionName)) {
        uniqueAssertions.set(assertionName, []);
      }
      uniqueAssertions.get(assertionName)?.push(pattern);
    }

    // Generate assertions for each unique pattern
    for (const [assertionName, patternList] of Array.from(uniqueAssertions.entries())) {
      const pattern = patternList[0]!;
      const assertionCode = this.generateAssertionCode(assertionName, pattern, options);

      assertions.push({
        name: assertionName,
        code: assertionCode,
        description: this.generateAssertionDescription(pattern),
        usage: `${assertionName}(${pattern.variable}); // Throws if condition fails`,
        errorType: `AssertionError: Expected ${pattern.variable} to be ${pattern.targetType}`,
      });
    }

    return assertions;
  }

  /**
   * Generate assertion code for a pattern
   */
  private generateAssertionCode(
    assertionName: string,
    pattern: TypeNarrowingPattern,
    options: TypeAssertionGenerationOptions,
  ): string {
    const jsDoc = options.includeJSDoc
      ? `/**
 * Asserts that ${pattern.variable} is of type ${pattern.targetType}
 * @param value - The value to check
 * @throws AssertionError if the value is not of type ${pattern.targetType}
 */
`
      : '';

    const exportKeyword = options.exportFunctions ? 'export ' : '';
    const condition = this.generateConditionExpression(pattern);
    const errorType = options.generateRuntimeChecks ? `${this.capitalize(pattern.targetType)}TypeError` : 'Error';

    return `${jsDoc}${exportKeyword}function ${assertionName}(value: unknown): asserts value is ${pattern.targetType} {
  if (!(${condition})) {
    throw new ${errorType}(\`Expected value to be ${pattern.targetType}, but got \${typeof value}\`);
  }
}`;
  }

  /**
   * Generate condition expression for assertion
   */
  private generateConditionExpression(pattern: TypeNarrowingPattern): string {
    switch (pattern.type) {
      case 'typeof':
        return `typeof value === '${pattern.targetType}'`;
      case 'instanceof':
        return `value instanceof ${pattern.targetType}`;
      case 'in':
        return `typeof value === 'object' && value !== null && '${pattern.targetType}' in value`;
      case 'nullish':
        return `value !== null && value !== undefined`;
      default:
        return `typeof value === '${pattern.targetType}'`;
    }
  }

  /**
   * Generate description for an assertion
   */
  private generateAssertionDescription(pattern: TypeNarrowingPattern): string {
    switch (pattern.type) {
      case 'typeof':
        return `Assertion function to validate value is of primitive type '${pattern.targetType}'`;
      case 'instanceof':
        return `Assertion function to validate value is an instance of ${pattern.targetType}`;
      case 'in':
        return `Assertion function to validate object has property '${pattern.targetType}'`;
      case 'nullish':
        return `Assertion function to validate value is not null or undefined`;
      default:
        return `Assertion function for ${pattern.targetType}`;
    }
  }

  /**
   * Generate combined code with all guards and assertions
   */
  private generateCombinedCode(
    typeGuards: GeneratedTypeGuard[],
    assertions: GeneratedAssertion[],
    options: TypeAssertionGenerationOptions,
  ): string {
    const parts: string[] = [];

    // Add header comment
    parts.push('// Generated Type Guards and Assertions');
    parts.push(`// Generated at: ${new Date().toISOString()}`);
    parts.push('');

    // Add type guards
    if (typeGuards.length > 0) {
      parts.push('// Type Guards');
      parts.push('');
      for (const guard of typeGuards) {
        parts.push(guard.code);
        parts.push('');
      }
    }

    // Add assertions
    if (assertions.length > 0) {
      parts.push('// Assertion Functions');
      parts.push('');
      for (const assertion of assertions) {
        parts.push(assertion.code);
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  /**
   * Display results in an output channel
   */
  public displayResults(result: TypeAssertionGenerationResult): void {
    const outputChannel = vscode.window.createOutputChannel('Type Assertion Generator');
    outputChannel.clear();

    // Header
    outputChannel.appendLine(`Type Assertion Generation for ${result.file}`);
    outputChannel.appendLine(`Generation completed in ${result.generationDuration}ms`);
    outputChannel.appendLine('─'.repeat(60));
    outputChannel.appendLine('');

    // Summary
    outputChannel.appendLine('Summary:');
    outputChannel.appendLine(`  Type Narrowing Patterns Found: ${result.patterns.length}`);
    outputChannel.appendLine(`  Type Guards Generated: ${result.typeGuards.length}`);
    outputChannel.appendLine(`  Assertion Functions Generated: ${result.assertions.length}`);
    outputChannel.appendLine('');

    // Patterns Found
    if (result.patterns.length > 0) {
      outputChannel.appendLine('Type Narrowing Patterns Found:');
      outputChannel.appendLine('');

      for (const pattern of result.patterns) {
        outputChannel.appendLine(`  Line ${pattern.line}: ${pattern.type} check`);
        outputChannel.appendLine(`    Variable: ${pattern.variable}`);
        outputChannel.appendLine(`    Target Type: ${pattern.targetType ?? 'unknown'}`);
        outputChannel.appendLine(`    Suggested Guard: ${pattern.suggestedGuardName}()`);
        outputChannel.appendLine('');
      }
    }

    // Generated Type Guards
    if (result.typeGuards.length > 0) {
      outputChannel.appendLine('Generated Type Guards:');
      outputChannel.appendLine('');

      for (const guard of result.typeGuards) {
        outputChannel.appendLine(`  ${guard.name}:`);
        outputChannel.appendLine(`    ${guard.description}`);
        outputChannel.appendLine(`    Usage: ${guard.usage}`);
        outputChannel.appendLine('');
      }
    }

    // Generated Assertions
    if (result.assertions.length > 0) {
      outputChannel.appendLine('Generated Assertion Functions:');
      outputChannel.appendLine('');

      for (const assertion of result.assertions) {
        outputChannel.appendLine(`  ${assertion.name}:`);
        outputChannel.appendLine(`    ${assertion.description}`);
        outputChannel.appendLine(`    Usage: ${assertion.usage}`);
        outputChannel.appendLine('');
      }
    }

    // Generated Code Preview
    if (result.generatedCode) {
      outputChannel.appendLine('Generated Code Preview:');
      outputChannel.appendLine('');
      outputChannel.appendLine('─'.repeat(60));
      const lines = result.generatedCode.split('\n');
      const previewLines = lines.slice(0, 50); // Show first 50 lines
      for (const line of previewLines) {
        outputChannel.appendLine(line);
      }
      if (lines.length > 50) {
        outputChannel.appendLine(`... (${lines.length - 50} more lines)`);
      }
      outputChannel.appendLine('─'.repeat(60));
    }

    outputChannel.show();
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
