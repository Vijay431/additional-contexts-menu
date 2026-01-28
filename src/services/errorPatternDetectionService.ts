import * as vscode from 'vscode';

import {
  ErrorPatternDetectionResult,
  ErrorPatternMatch,
  ErrorPatternType,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Error Pattern Detection Service
 *
 * Detects common error patterns in code including:
 * - Unhandled promises
 * - Missing error handlers
 * - Race conditions
 * - Empty catch blocks
 * - Forgotten await
 *
 * Provides fixes and preventive suggestions for detected issues.
 */
export class ErrorPatternDetectionService {
  private static instance: ErrorPatternDetectionService | undefined;
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;
  private diagnosticCollection: vscode.DiagnosticCollection;

  private constructor() {
    this.logger = Logger.getInstance();
    this.outputChannel = vscode.window.createOutputChannel('Error Pattern Detection');
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('errorPatternDetection');
  }

  public static getInstance(): ErrorPatternDetectionService {
    ErrorPatternDetectionService.instance ??= new ErrorPatternDetectionService();
    return ErrorPatternDetectionService.instance;
  }

  /**
   * Detect error patterns in a document
   */
  public async detectErrorPatterns(
    document: vscode.TextDocument,
    config?: {
      includeUnhandledPromises?: boolean;
      includeMissingErrorHandlers?: boolean;
      includeRaceConditions?: boolean;
      includeEmptyCatchBlocks?: boolean;
      includeForgottenAwait?: boolean;
    },
  ): Promise<ErrorPatternDetectionResult> {
    const startTime = Date.now();
    const matches: ErrorPatternMatch[] = [];

    const enabledConfig = {
      includeUnhandledPromises: config?.includeUnhandledPromises ?? true,
      includeMissingErrorHandlers: config?.includeMissingErrorHandlers ?? true,
      includeRaceConditions: config?.includeRaceConditions ?? true,
      includeEmptyCatchBlocks: config?.includeEmptyCatchBlocks ?? true,
      includeForgottenAwait: config?.includeForgottenAwait ?? true,
    };

    try {
      const text = document.getText();
      const languageId = document.languageId;

      // Only support JavaScript/TypeScript for now
      if (
        !['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)
      ) {
        return this.createResult(document.fileName, matches, startTime);
      }

      const lines = text.split('\n');

      // Detect unhandled promises
      if (enabledConfig.includeUnhandledPromises) {
        const unhandledPromises = this.detectUnhandledPromises(lines, text);
        matches.push(...unhandledPromises);
      }

      // Detect missing error handlers
      if (enabledConfig.includeMissingErrorHandlers) {
        const missingHandlers = this.detectMissingErrorHandlers(lines, text);
        matches.push(...missingHandlers);
      }

      // Detect race conditions
      if (enabledConfig.includeRaceConditions) {
        const raceConditions = this.detectRaceConditions(lines);
        matches.push(...raceConditions);
      }

      // Detect empty catch blocks
      if (enabledConfig.includeEmptyCatchBlocks) {
        const emptyCatchBlocks = this.detectEmptyCatchBlocks(lines);
        matches.push(...emptyCatchBlocks);
      }

      // Detect forgotten await
      if (enabledConfig.includeForgottenAwait) {
        const forgottenAwaits = this.detectForgottenAwait(lines);
        matches.push(...forgottenAwaits);
      }

      // Update diagnostics
      this.updateDiagnostics(document, matches);

      return this.createResult(document.fileName, matches, startTime);
    } catch (error) {
      this.logger.error('Error detecting error patterns', error);
      return this.createResult(document.fileName, matches, startTime);
    }
  }

  /**
   * Display the error pattern detection results
   */
  public displayResults(result: ErrorPatternDetectionResult): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('🔍 Error Pattern Detection Results');
    this.outputChannel.appendLine('='.repeat(50));
    this.outputChannel.appendLine(`File: ${result.file}`);
    this.outputChannel.appendLine(`Analysis Duration: ${result.analysisDuration}ms`);
    this.outputChannel.appendLine(`Total Issues Found: ${result.matches.length}`);
    this.outputChannel.appendLine(`  Errors: ${result.totalErrors}`);
    this.outputChannel.appendLine(`  Warnings: ${result.totalWarnings}`);
    this.outputChannel.appendLine('');

    if (result.matches.length === 0) {
      this.outputChannel.appendLine('✅ No error patterns detected!');
    } else {
      // Group by type
      const grouped = this.groupByType(result.matches);

      for (const [type, matchesOfType] of Object.entries(grouped)) {
        this.outputChannel.appendLine(
          `\n${this.getTypeIcon(type as ErrorPatternType)} ${this.getTypeLabel(type as ErrorPatternType)} (${matchesOfType.length})`,
        );
        this.outputChannel.appendLine('-'.repeat(50));

        for (const match of matchesOfType) {
          this.outputChannel.appendLine(`  Line ${match.line}: ${match.description}`);
          if (match.suggestion) {
            this.outputChannel.appendLine(`  💡 ${match.suggestion}`);
          }
          this.outputChannel.appendLine('');
        }
      }

      if (result.suggestions.length > 0) {
        this.outputChannel.appendLine('\n📋 General Suggestions:');
        this.outputChannel.appendLine('-'.repeat(50));
        for (const suggestion of result.suggestions) {
          this.outputChannel.appendLine(`  • ${suggestion}`);
        }
      }
    }

    this.outputChannel.show(true);
  }

  /**
   * Clear diagnostics for a document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Clear all diagnostics
   */
  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.outputChannel.dispose();
    this.diagnosticCollection.dispose();
  }

  /**
   * Detect unhandled promise chains
   */
  private detectUnhandledPromises(lines: string[], text: string): ErrorPatternMatch[] {
    const matches: ErrorPatternMatch[] = [];
    const patterns = [
      // Promise chains without .catch() or await
      {
        pattern: /\.then\([^)]*\)(?!\s*\.catch)(?!\s*\n\s*\.catch)/g,
        type: 'unhandled-promise' as const,
        description: 'Promise chain without error handler',
        severity: 'warning' as const,
        suggestion: 'Add a .catch() handler or use await with try/catch',
      },
      // Direct Promise call without await or catch
      {
        pattern:
          /(?:Promise\.(resolve|reject|all|race)|fetch\([^)]+\)|axios\.(get|post|put|delete)\([^)]+\))(?!\s*\.then)(?!\s*\.catch)(?!\s*\n)/g,
        type: 'unhandled-promise' as const,
        description: 'Promise created without error handling',
        severity: 'warning' as const,
        suggestion: 'Add .catch() or use await with try/catch',
      },
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        continue;
      }

      for (const { pattern, type, description, severity, suggestion } of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;

        // eslint-disable-next-line no-cond-assign
        while ((match = regex.exec(line)) !== null) {
          // Exclude if the line already has await or catch
          if (line.includes('await') || line.includes('.catch(') || line.includes('try {')) {
            continue;
          }

          matches.push({
            type,
            line: lineIndex + 1,
            column: (match.index ?? 0) + 1,
            description,
            severity,
            suggestion,
            codeSnippet: trimmed,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect missing error handlers
   */
  private detectMissingErrorHandlers(lines: string[], text: string): ErrorPatternMatch[] {
    const matches: ErrorPatternMatch[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        continue;
      }

      // Check for async function without try/catch when using await
      if (trimmed.includes('async') && trimmed.includes('await')) {
        // Look ahead to see if there's a try block
        let hasTryBlock = false;
        for (let i = lineIndex; i < Math.min(lineIndex + 20, lines.length); i++) {
          const lookaheadLine = lines[i]?.trim() ?? '';
          if (lookaheadLine.includes('try {') || lookaheadLine.startsWith('try{')) {
            hasTryBlock = true;
            break;
          }
        }

        if (!hasTryBlock && trimmed.includes('await') && !trimmed.includes('try')) {
          matches.push({
            type: 'missing-error-handler',
            line: lineIndex + 1,
            column: trimmed.indexOf('await') + 1,
            description: 'Async function with await but no try/catch',
            severity: 'warning',
            suggestion: 'Wrap await calls in try/catch blocks to handle potential errors',
            codeSnippet: trimmed,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect potential race conditions
   */
  private detectRaceConditions(lines: string[]): ErrorPatternMatch[] {
    const matches: ErrorPatternMatch[] = [];

    // Pattern 1: Multiple setState calls in sequence (React)
    const setStatePattern = /setState\([^)]*\)/g;
    const setStateCalls: { line: number; count: number }[] = [];
    let consecutiveCalls = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        consecutiveCalls = 0;
        continue;
      }

      const stateCalls = trimmed.match(setStatePattern);
      if (stateCalls) {
        consecutiveCalls += stateCalls.length;
        if (consecutiveCalls > 1) {
          matches.push({
            type: 'race-condition',
            line: lineIndex + 1,
            column: 1,
            description: 'Multiple state updates in sequence may cause race condition',
            severity: 'warning',
            suggestion: 'Use functional updates or batch state updates to avoid race conditions',
            codeSnippet: trimmed,
          });
        }
      } else {
        consecutiveCalls = 0;
      }
    }

    // Pattern 2: Unawaited async operations followed by dependent code
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        continue;
      }

      // Check for async call without await followed by usage
      if (
        (trimmed.match(/fetch\(/) || trimmed.match(/\.get\(/) || trimmed.match(/\.post\(/)) &&
        !trimmed.includes('await')
      ) {
        // Look ahead for potential usage of the result
        for (let i = lineIndex + 1; i < Math.min(lineIndex + 5, lines.length); i++) {
          const lookaheadLine = lines[i]?.trim() ?? '';
          if (lookaheadLine && !this.isCommentLine(lookaheadLine)) {
            // If the next non-comment line uses the result without await, that's a race condition
            if (lookaheadLine && !lookaheadLine.includes('await')) {
              matches.push({
                type: 'race-condition',
                line: lineIndex + 1,
                column: 1,
                description: 'Async operation called without await, followed by dependent code',
                severity: 'warning',
                suggestion:
                  'Use await to ensure the async operation completes before using its result',
                codeSnippet: trimmed,
              });
              break;
            }
            break;
          }
        }
      }
    }

    return matches;
  }

  /**
   * Detect empty catch blocks
   */
  private detectEmptyCatchBlocks(lines: string[]): ErrorPatternMatch[] {
    const matches: ErrorPatternMatch[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const trimmed = line.trim();

      if (trimmed.startsWith('catch')) {
        // Look ahead to see if catch block is empty or only has a comment
        let isEmpty = true;
        for (let i = lineIndex + 1; i < Math.min(lineIndex + 10, lines.length); i++) {
          const lookaheadLine = lines[i]?.trim() ?? '';
          if (!lookaheadLine) {
            continue;
          }
          if (lookaheadLine === '}' || lookaheadLine.startsWith('}')) {
            break;
          }
          if (!this.isCommentLine(lookaheadLine) && lookaheadLine !== '' && lookaheadLine !== '{') {
            isEmpty = false;
            break;
          }
        }

        if (isEmpty) {
          matches.push({
            type: 'empty-catch-block',
            line: lineIndex + 1,
            column: 1,
            description: 'Empty catch block swallows errors',
            severity: 'warning',
            suggestion: 'Add error handling, logging, or re-throw the error with context',
            codeSnippet: trimmed,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect forgotten await
   */
  private detectForgottenAwait(lines: string[]): ErrorPatternMatch[] {
    const matches: ErrorPatternMatch[] = [];

    const asyncPatterns = [
      { pattern: /fetch\(/, name: 'fetch' },
      { pattern: /\.get\(/, name: 'http get' },
      { pattern: /\.post\(/, name: 'http post' },
      { pattern: /Promise\.(all|race)/, name: 'Promise' },
      { pattern: /\.then\(/, name: 'Promise chain' },
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        continue;
      }

      for (const { pattern, name } of asyncPatterns) {
        if (pattern.test(trimmed)) {
          // Check if await is missing
          if (!trimmed.includes('await')) {
            // But not if it's being returned directly or assigned to a variable with .then()
            if (!trimmed.startsWith('return ') && !trimmed.match(/=\s*\w+\.then/)) {
              matches.push({
                type: 'forgotten-await',
                line: lineIndex + 1,
                column: trimmed.search(pattern) + 1,
                description: `Potential forgotten await before ${name} call`,
                severity: 'info',
                suggestion: 'Add await before the async call or handle the promise properly',
                codeSnippet: trimmed,
              });
            }
          }
        }
      }
    }

    return matches;
  }

  /**
   * Check if a line is a comment
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('<!')
    );
  }

  /**
   * Create detection result
   */
  private createResult(
    file: string,
    matches: ErrorPatternMatch[],
    startTime: number,
  ): ErrorPatternDetectionResult {
    const totalErrors = matches.filter((m) => m.severity === 'error').length;
    const totalWarnings = matches.filter((m) => m.severity === 'warning').length;
    const analysisDuration = Date.now() - startTime;

    // Generate general suggestions based on matches
    const suggestions = this.generateSuggestions(matches);

    return {
      file,
      matches,
      totalErrors,
      totalWarnings,
      analysisDuration,
      suggestions,
    };
  }

  /**
   * Generate general suggestions based on detected issues
   */
  private generateSuggestions(matches: ErrorPatternMatch[]): string[] {
    const suggestions: string[] = [];
    const types = new Set(matches.map((m) => m.type));

    if (types.has('unhandled-promise')) {
      suggestions.push('Consider using async/await with try/catch for better error handling');
    }
    if (types.has('missing-error-handler')) {
      suggestions.push('Ensure all async operations have proper error handling');
    }
    if (types.has('race-condition')) {
      suggestions.push('Review async operations for potential race conditions');
    }
    if (types.has('empty-catch-block')) {
      suggestions.push('Add meaningful error handling in catch blocks or re-throw with context');
    }
    if (types.has('forgotten-await')) {
      suggestions.push('Use async/await consistently to avoid forgotten promises');
    }

    if (matches.length > 0) {
      suggestions.push(
        'Consider enabling strict TypeScript mode to catch more errors at compile time',
      );
      suggestions.push('Use ESLint with @typescript-eslint plugin for additional error detection');
    }

    return suggestions;
  }

  /**
   * Group matches by type
   */
  private groupByType(matches: ErrorPatternMatch[]): Record<ErrorPatternType, ErrorPatternMatch[]> {
    const grouped: Record<string, ErrorPatternMatch[]> = {};

    for (const match of matches) {
      if (!grouped[match.type]) {
        grouped[match.type] = [];
      }
      grouped[match.type].push(match);
    }

    return grouped as Record<ErrorPatternType, ErrorPatternMatch[]>;
  }

  /**
   * Get icon for error pattern type
   */
  private getTypeIcon(type: ErrorPatternType): string {
    const icons: Record<ErrorPatternType, string> = {
      'unhandled-promise': '⚠️',
      'missing-error-handler': '❌',
      'race-condition': '🔄',
      'empty-catch-block': '🕳️',
      'forgotten-await': '⏳',
    };
    return icons[type] ?? '•';
  }

  /**
   * Get label for error pattern type
   */
  private getTypeLabel(type: ErrorPatternType): string {
    const labels: Record<ErrorPatternType, string> = {
      'unhandled-promise': 'Unhandled Promises',
      'missing-error-handler': 'Missing Error Handlers',
      'race-condition': 'Race Conditions',
      'empty-catch-block': 'Empty Catch Blocks',
      'forgotten-await': 'Forgotten Await',
    };
    return labels[type] ?? type;
  }

  /**
   * Update VS Code diagnostics with error pattern matches
   */
  private updateDiagnostics(document: vscode.TextDocument, matches: ErrorPatternMatch[]): void {
    if (matches.length === 0) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = matches.map((match) => {
      const range = new vscode.Range(
        new vscode.Position(match.line - 1, match.column - 1),
        new vscode.Position(match.line - 1, match.column - 1 + (match.codeSnippet?.length ?? 20)),
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `${match.description}${match.suggestion ? `\n💡 ${match.suggestion}` : ''}`,
        this.convertSeverity(match.severity),
      );

      diagnostic.code = match.type;
      diagnostic.source = 'Error Pattern Detection';
      return diagnostic;
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Convert severity to VS Code diagnostic severity
   */
  private convertSeverity(severity: 'error' | 'warning' | 'info'): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
    }
  }
}
