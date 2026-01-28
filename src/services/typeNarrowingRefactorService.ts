import * as vscode from 'vscode';

import { TypeNarrowingRefactorResult } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Type Assertion Info
 * Tracks location and details of type assertions in code
 */
interface TypeAssertionInfo {
  assertion: string;
  type: 'as' | 'angle-bracket' | 'non-null';
  targetType: string;
  line: number;
  column: number;
  codeSnippet: string;
  suggestedGuard: string;
}

/**
 * Type Guard Suggestion
 * Suggested type guard function
 */
interface TypeGuardSuggestion {
  name: string;
  code: string;
  description: string;
  usage: string;
}

/**
 * Type Narrowing Refactor Service
 *
 * Identifies code using type assertions and suggests proper type guards.
 * Generates type guard functions and refactors conditional checks for type safety.
 */
export class TypeNarrowingRefactorService {
  private static instance: TypeNarrowingRefactorService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  // Patterns for detecting type assertions
  private readonly patterns = {
    // Type assertion with 'as': value as Type
    asAssertion: /(\w+(?:\.\w+)*)\s+as\s+([A-Z]\w*(?:<[^>]+>)?)/g,
    // Angle bracket assertion: <Type>value
    angleBracketAssertion: /<([A-Z]\w*(?:<[^>]+>)?)>\s*(\w+(?:\.\w+)*)/g,
    // Non-null assertion: value!
    nonNullAssertion: /(\w+(?:\.\w+)*)!/g,
    // Type assertion in object properties
    objectPropertyAssertion: /(\w+)\s*:\s*\w+\s+as\s+([A-Z]\w+)/g,
    // Variable declaration with type assertion
    variableAssertion: /(?:const|let|var)\s+(\w+)\s*=\s*(.+?)\s+as\s+([A-Z]\w+)/g,
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('typeNarrowingRefactor');
  }

  public static getInstance(): TypeNarrowingRefactorService {
    TypeNarrowingRefactorService.instance ??= new TypeNarrowingRefactorService();
    return TypeNarrowingRefactorService.instance;
  }

  /**
   * Analyze a document for type assertion usage and suggest type guards
   */
  public async analyzeTypeNarrowing(
    document: vscode.TextDocument,
  ): Promise<TypeNarrowingRefactorResult> {
    const startTime = Date.now();
    const text = document.getText();
    const lines = text.split('\n');

    try {
      const assertions: TypeAssertionInfo[] = [];
      const suggestions: string[] = [];
      const typeGuards: TypeGuardSuggestion[] = [];

      // Find all type assertions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineAssertions = this.findAssertionsInLine(line, i);
        assertions.push(...lineAssertions);
      }

      // Generate suggestions based on findings
      for (const assertion of assertions) {
        const suggestion = this.generateSuggestionForAssertion(assertion);
        suggestions.push(suggestion);

        // Generate type guard function
        const guard = this.generateTypeGuard(assertion);
        if (guard && !typeGuards.find((g) => g.name === guard.name)) {
          typeGuards.push(guard);
        }
      }

      const analysisDuration = Date.now() - startTime;

      // Create diagnostics for type assertions
      this.createDiagnostics(document, assertions);

      this.logger.info('Type narrowing analysis completed', {
        file: document.fileName,
        assertionsFound: assertions.length,
        typeGuardsGenerated: typeGuards.length,
        analysisDuration,
      });

      return {
        file: document.fileName,
        totalAssertions: assertions.length,
        assertionsByType: this.categorizeAssertions(assertions),
        assertions,
        typeGuards,
        suggestions,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error analyzing type narrowing', error);
      return {
        file: document.fileName,
        totalAssertions: 0,
        assertionsByType: {
          as: 0,
          angleBracket: 0,
          nonNull: 0,
        },
        assertions: [],
        typeGuards: [],
        suggestions: ['Failed to analyze type narrowing'],
        analysisDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Find type assertions in a single line
   */
  private findAssertionsInLine(line: string, lineIndex: number): TypeAssertionInfo[] {
    const assertions: TypeAssertionInfo[] = [];
    const trimmedLine = line.trim();

    // Skip comments
    if (
      trimmedLine.startsWith('//') ||
      trimmedLine.startsWith('*') ||
      trimmedLine.startsWith('/*')
    ) {
      return assertions;
    }

    // Check for 'as' assertions
    const asMatches = [...trimmedLine.matchAll(this.patterns.asAssertion)];
    for (const match of asMatches) {
      const value = match[1] ?? '';
      const type = match[2] ?? '';
      assertions.push({
        assertion: match[0] ?? '',
        type: 'as',
        targetType: type,
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        codeSnippet: trimmedLine,
        suggestedGuard: this.suggestGuardName(value, type),
      });
    }

    // Check for non-null assertions
    const nonNullMatches = [...trimmedLine.matchAll(this.patterns.nonNullAssertion)];
    for (const match of nonNullMatches) {
      const value = match[1] ?? '';
      assertions.push({
        assertion: match[0] ?? '',
        type: 'non-null',
        targetType: 'non-null',
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        codeSnippet: trimmedLine,
        suggestedGuard: `isDefined${this.capitalize(value)}`,
      });
    }

    // Check for angle bracket assertions (only if not in JSX/TSX)
    if (!trimmedLine.includes('<') && !trimmedLine.match(/^\s*</)) {
      const angleMatches = [...trimmedLine.matchAll(this.patterns.angleBracketAssertion)];
      for (const match of angleMatches) {
        const type = match[1] ?? '';
        const value = match[2] ?? '';
        assertions.push({
          assertion: match[0] ?? '',
          type: 'angle-bracket',
          targetType: type,
          line: lineIndex + 1,
          column: (match.index ?? 0) + 1,
          codeSnippet: trimmedLine,
          suggestedGuard: this.suggestGuardName(value, type),
        });
      }
    }

    return assertions;
  }

  /**
   * Generate a suggestion for a specific assertion
   */
  private generateSuggestionForAssertion(assertion: TypeAssertionInfo): string {
    const { assertion: assert, type, targetType, line, suggestedGuard } = assertion;

    switch (type) {
      case 'as':
        return `Line ${line}: Consider replacing '${assert}' (as ${targetType}) with a type guard function like '${suggestedGuard}()' for safer type narrowing`;

      case 'angle-bracket':
        return `Line ${line}: Angle bracket assertion '${assert}' (${targetType}) is less readable than 'as'. Consider using a type guard function like '${suggestedGuard}()' instead`;

      case 'non-null':
        return `Line ${line}: Non-null assertion '${assert}' bypasses TypeScript's null checks. Consider using a null check or ${suggestedGuard}() type guard`;

      default:
        return `Line ${line}: Type assertion detected - consider using a type guard for better type safety`;
    }
  }

  /**
   * Generate a type guard function for an assertion
   */
  private generateTypeGuard(assertion: TypeAssertionInfo): TypeGuardSuggestion | null {
    const { targetType, suggestedGuard } = assertion;

    // Skip if we already have a guard for this type
    if (targetType === 'non-null') {
      return {
        name: suggestedGuard,
        code: `function ${suggestedGuard}<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}`,
        description: 'Type guard to check if a value is not null or undefined',
        usage: `if (${suggestedGuard}(value)) { /* value is narrowed to non-nullable */ }`,
      };
    }

    // Generate type-specific guard
    const guardCode = this.generateGuardForType(targetType, suggestedGuard);
    if (guardCode) {
      return {
        name: suggestedGuard,
        code: guardCode.code,
        description: guardCode.description,
        usage: guardCode.usage,
      };
    }

    return null;
  }

  /**
   * Generate guard code for specific types
   */
  private generateGuardForType(
    type: string,
    guardName: string,
  ): { code: string; description: string; usage: string } | null {
    const commonGuards: Record<string, { code: string; description: string; usage: string }> = {
      String: {
        code: `function ${guardName}(value: unknown): value is string {
  return typeof value === 'string';
}`,
        description: 'Type guard to check if a value is a string',
        usage: `if (${guardName}(value)) { /* value is string */ }`,
      },
      Number: {
        code: `function ${guardName}(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}`,
        description: 'Type guard to check if a value is a number',
        usage: `if (${guardName}(value)) { /* value is number */ }`,
      },
      Boolean: {
        code: `function ${guardName}(value: unknown): value is boolean {
  return typeof value === 'boolean';
}`,
        description: 'Type guard to check if a value is a boolean',
        usage: `if (${guardName}(value)) { /* value is boolean */ }`,
      },
      Array: {
        code: `function ${guardName}(value: unknown): value is unknown[] {
  return Array.isArray(value);
}`,
        description: 'Type guard to check if a value is an array',
        usage: `if (${guardName}(value)) { /* value is array */ }`,
      },
      Object: {
        code: `function ${guardName}(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}`,
        description: 'Type guard to check if a value is a plain object',
        usage: `if (${guardName}(value)) { /* value is object */ }`,
      },
      Function: {
        code: `function ${guardName}(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}`,
        description: 'Type guard to check if a value is a function',
        usage: `if (${guardName}(value)) { /* value is function */ }`,
      },
    };

    // Check for generic types
    if (type.includes('<')) {
      const baseType = type.split('<')[0] ?? '';
      if (commonGuards[baseType]) {
        return commonGuards[baseType];
      }
    }

    // Check for exact matches
    if (commonGuards[type]) {
      return commonGuards[type];
    }

    // Generate custom interface/class guard
    return {
      code: `function ${guardName}(value: unknown): value is ${type} {
  // TODO: Add proper type checking logic for ${type}
  // Consider using discriminators, property checks, or instanceof
  return value instanceof ${type} || (typeof value === 'object' && value !== null && '${type}' in value);
}`,
      description: `Type guard to check if a value is of type ${type}`,
      usage: `if (${guardName}(value)) { /* value is ${type} */ }`,
    };
  }

  /**
   * Suggest a name for the type guard function
   */
  private suggestGuardName(value: string, type: string): string {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
    const cleanType = type.replace(/[^a-zA-Z0-9]/g, '');
    return `is${cleanType}${cleanValue ? this.capitalize(cleanValue) : ''}`;
  }

  /**
   * Capitalize the first letter of a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Categorize assertions by type
   */
  private categorizeAssertions(assertions: TypeAssertionInfo[]): {
    as: number;
    angleBracket: number;
    nonNull: number;
  } {
    return {
      as: assertions.filter((a) => a.type === 'as').length,
      angleBracket: assertions.filter((a) => a.type === 'angle-bracket').length,
      nonNull: assertions.filter((a) => a.type === 'non-null').length,
    };
  }

  /**
   * Create diagnostics for type assertions
   */
  private createDiagnostics(document: vscode.TextDocument, assertions: TypeAssertionInfo[]): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const assertion of assertions) {
      const range = new vscode.Range(
        new vscode.Position(assertion.line - 1, assertion.column - 1),
        new vscode.Position(assertion.line - 1, assertion.column - 1 + assertion.assertion.length),
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `Type assertion '${assertion.assertion}' could be replaced with a type guard`,
        vscode.DiagnosticSeverity.Warning,
      );

      diagnostic.code = 'type-assertion-warning';
      diagnostic.source = 'Type Narrowing Refactor';
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          `Consider using '${assertion.suggestedGuard}()' type guard instead`,
        ),
      ];

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Clear diagnostics
   */
  public clearDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Display results in an output channel
   */
  public displayResults(result: TypeNarrowingRefactorResult): void {
    const outputChannel = vscode.window.createOutputChannel('Type Narrowing Refactor');
    outputChannel.clear();

    // Header
    outputChannel.appendLine(`Type Narrowing Analysis for ${result.file}`);
    outputChannel.appendLine(`Analysis completed in ${result.analysisDuration}ms`);
    outputChannel.appendLine('─'.repeat(60));
    outputChannel.appendLine('');

    // Summary
    outputChannel.appendLine('Summary:');
    outputChannel.appendLine(`  Total Type Assertions: ${result.totalAssertions}`);
    outputChannel.appendLine(`  'as' Assertions: ${result.assertionsByType.as}`);
    outputChannel.appendLine(`  Angle Bracket Assertions: ${result.assertionsByType.angleBracket}`);
    outputChannel.appendLine(`  Non-null Assertions: ${result.assertionsByType.nonNull}`);
    outputChannel.appendLine('');

    // Type Assertions Found
    if (result.assertions.length > 0) {
      outputChannel.appendLine('Type Assertions Found:');
      outputChannel.appendLine('');

      for (const assertion of result.assertions) {
        outputChannel.appendLine(`  Line ${assertion.line}: ${assertion.assertion}`);
        outputChannel.appendLine(`    Type: ${assertion.type}`);
        outputChannel.appendLine(`    Target: ${assertion.targetType}`);
        outputChannel.appendLine(`    Suggested Guard: ${assertion.suggestedGuard}()`);
        outputChannel.appendLine('');
      }
    }

    // Suggested Type Guards
    if (result.typeGuards.length > 0) {
      outputChannel.appendLine('Suggested Type Guard Functions:');
      outputChannel.appendLine('');

      for (const guard of result.typeGuards) {
        outputChannel.appendLine(`  ${guard.name}:`);
        outputChannel.appendLine(`    ${guard.description}`);
        outputChannel.appendLine(`    Usage: ${guard.usage}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('    Code:');
        for (const codeLine of guard.code.split('\n')) {
          outputChannel.appendLine(`      ${codeLine}`);
        }
        outputChannel.appendLine('');
      }
    }

    // Suggestions
    if (result.suggestions.length > 0) {
      outputChannel.appendLine('Refactoring Suggestions:');
      outputChannel.appendLine('');

      for (const suggestion of result.suggestions) {
        outputChannel.appendLine(`  • ${suggestion}`);
      }
      outputChannel.appendLine('');
    }

    outputChannel.show();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
