import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export type ConversionMode =
  | 'promise-to-async'
  | 'async-to-promise'
  | 'callback-to-promise';

export interface ConversionResult {
  originalCode: string;
  convertedCode: string;
  mode: ConversionMode;
  changes: string[];
}

/**
 * Service for converting between Promise chains, async/await syntax,
 * and callback-based code while maintaining error handling.
 */
export class AsyncAwaitConverterService {
  private static instance: AsyncAwaitConverterService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): AsyncAwaitConverterService {
    AsyncAwaitConverterService.instance ??= new AsyncAwaitConverterService();
    return AsyncAwaitConverterService.instance;
  }

  /**
   * Converts Promise chains to async/await syntax
   * @param code The code to convert
   * @returns The converted code
   */
  public async convertToAsyncAwait(code: string): Promise<string> {
    const result = this.convertPromiseToAsyncAwait(code);
    return result.code;
  }

  /**
   * Converts async/await syntax to Promise chains
   * @param code The code to convert
   * @returns The converted code
   */
  public async convertToPromiseChain(code: string): Promise<string> {
    const result = this.convertAsyncAwaitToPromise(code);
    return result.code;
  }

  /**
   * Converts the selected code based on the specified mode
   */
  public async convertCode(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    mode: ConversionMode,
  ): Promise<ConversionResult> {
    const selectedText = document.getText(selection);

    let convertedCode: string;
    let changes: string[] = [];

    switch (mode) {
      case 'promise-to-async':
        ({ code: convertedCode, changes } = this.convertPromiseToAsyncAwait(selectedText));
        break;
      case 'async-to-promise':
        ({ code: convertedCode, changes } = this.convertAsyncAwaitToPromise(selectedText));
        break;
      case 'callback-to-promise':
        ({ code: convertedCode, changes } = this.convertCallbackToPromise(selectedText));
        break;
      default:
        // Fallback: auto-detect and convert
        ({ code: convertedCode, changes, mode } = this.autoDetectAndConvert(selectedText));
    }

    this.logger.info('Code conversion completed', { mode, changeCount: changes.length });

    return {
      originalCode: selectedText,
      convertedCode,
      mode,
      changes,
    };
  }

  /**
   * Converts Promise chain (.then/.catch) to async/await syntax
   */
  private convertPromiseToAsyncAwait(code: string): { code: string; changes: string[] } {
    const changes: string[] = [];
    let converted = code;

    // Check if code contains Promise chains
    const hasPromiseChain = /\.then\s*\(/.test(code) || /\.catch\s*\(/.test(code);

    if (!hasPromiseChain) {
      return { code, changes: ['No Promise chains found to convert'] };
    }

    // Extract the function wrapper if present
    const functionMatch = code.match(/^(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)\s*\{?/);
    const isAsyncFunction = code.startsWith('async ');
    const functionName = functionMatch?.[1];

    // Track variable names from .then() chains
    const thenVariables = this.extractThenVariables(code);

    // Step 1: Replace .then() chains with await statements
    // Pattern: .then(result => { ... }) or .then(result => ...)
    const thenPattern = /\.then\s*\(\s*(\w+)\s*(?:=>\s*)?(\{?)/g;
    let matchCount = 0;

    converted = converted.replace(thenPattern, (_, varName, brace) => {
      matchCount++;
      const hasBrace = brace === '{';

      if (hasBrace) {
        // For multi-line then blocks, we'll handle differently
        return `\n    const ${varName} =`;
      } else {
        return `\n    const ${varName} =`;
      }
    });

    if (matchCount > 0) {
      changes.push(`Converted ${matchCount} .then() chain(s) to await`);
    }

    // Step 2: Replace .catch() with try/catch
    const catchPattern = /\.catch\s*\(\s*(\w+)\s*(?:=>\s*)?(\{?)/;
    if (catchPattern.test(converted)) {
      converted = converted.replace(catchPattern, '} catch ($1) {');
      changes.push('Converted .catch() to try/catch block');
    }

    // Step 3: Add async to function declaration if not present
    if (!isAsyncFunction && functionMatch) {
      converted = converted.replace(/^(function\s+)?/, 'async $1');
      changes.push('Added async keyword to function');
    }

    // Step 4: Add try block at the beginning if we have catch
    if (converted.includes('catch')) {
      const firstAwait = converted.indexOf('await');
      if (firstAwait > 0) {
        const beforeAwait = converted.substring(0, firstAwait);
        if (!beforeAwait.includes('try {')) {
          // Find the first statement and wrap with try
          const firstStatementStart = converted.indexOf('{', converted.indexOf(functionName ?? ''));
          if (firstStatementStart > 0) {
            converted =
              converted.substring(0, firstStatementStart + 1) +
              '  try {' +
              converted.substring(firstStatementStart + 1);
            changes.push('Added try block for error handling');
          }
        }
      }
    }

    // Step 5: Clean up nested parentheses and chains
    converted = this.cleanupPromiseChain(converted);

    return { code: converted, changes };
  }

  /**
   * Converts async/await syntax back to Promise chains
   */
  private convertAsyncAwaitToPromise(code: string): { code: string; changes: string[] } {
    const changes: string[] = [];
    let converted = code;

    // Check if code contains async/await
    const hasAsyncAwait = /\bawait\s+/.test(code);

    if (!hasAsyncAwait) {
      return { code, changes: ['No async/await found to convert'] };
    }

    // Track all await statements with their variable assignments
    const awaitStatements = this.extractAwaitStatements(code);

    if (awaitStatements.length === 0) {
      return { code, changes: ['No await statements found'] };
    }

    // Remove async keyword from function
    if (code.startsWith('async ')) {
      converted = converted.replace(/^async\s+/, '');
      changes.push('Removed async keyword from function');
    }

    // Convert await statements to .then() chains
    let previousVar = '';
    let chainBuilt = '';

    for (let i = 0; i < awaitStatements.length; i++) {
      const stmt = awaitStatements[i];
      const isLast = i === awaitStatements.length - 1;

      if (i === 0) {
        // First statement - start the chain
        if (stmt.variable) {
          chainBuilt = `const ${stmt.variable} = ${stmt.expression}`;
        } else {
          chainBuilt = stmt.expression;
        }
      } else {
        // Subsequent statements - add .then()
        if (stmt.variable) {
          chainBuilt += `\n    .then(${previousVar} => ${stmt.expression.replace('await ', '')})`;
        } else {
          chainBuilt += `\n    .then(() => ${stmt.expression.replace('await ', '')})`;
        }
      }

      previousVar = stmt.variable || previousVar;
    }

    // Handle try/catch blocks - convert to .catch()
    if (code.includes('try {') && code.includes('catch')) {
      const catchMatch = code.match(/catch\s*\(\s*(\w+)\s*\)\s*\{/);
      if (catchMatch) {
        const errorVar = catchMatch[1];
        chainBuilt += `\n    .catch(${errorVar} => {\n      // Handle error\n    })`;
        changes.push('Converted try/catch to .catch()');
      }
    }

    converted = this.replaceAwaitBlock(code, chainBuilt);
    changes.push(`Converted ${awaitStatements.length} await statement(s) to .then() chain`);

    return { code: converted, changes };
  }

  /**
   * Converts callback-based code to Promise-based code
   */
  private convertCallbackToPromise(code: string): { code: string; changes: string[] } {
    const changes: string[] = [];
    let converted = code;

    // Check if code contains callbacks
    const hasCallback =
      /,\s*\(\s*\w+\s*(?:,\s*\w+\s*)?\)\s*=>\s*\{/.test(code) ||
      /,\s*function\s*\(\s*\w+\s*(?:,\s*\w+\s*)?\)/.test(code);

    if (!hasCallback) {
      return { code, changes: ['No callbacks found to convert'] };
    }

    // Pattern 1: Node-style callback (err, result) => {}
    const nodeCallbackPattern =
      /(\w+)\s*\(\s*[^)]*\s*,\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\{/g;

    let matchCount = 0;
    converted = converted.replace(nodeCallbackPattern, (_, funcName, errVar, resultVar) => {
      matchCount++;
      return `const ${resultVar} = await new Promise((resolve, reject) => {
        ${funcName}((err, ${resultVar}) => {
          if (err) reject(err);
          resolve(${resultVar});
        });
      })`;
    });

    if (matchCount > 0) {
      changes.push(`Converted ${matchCount} Node-style callback(s) to Promise`);
    }

    // Pattern 2: Simple callback (result) => {}
    const simpleCallbackPattern =
      /(\w+)\s*\(\s*[^)]*\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*\{/g;

    let simpleCount = 0;
    converted = converted.replace(simpleCallbackPattern, (_, funcName, resultVar) => {
      simpleCount++;
      return `const ${resultVar} = await new Promise((resolve) => {
        ${funcName}(${resultVar} => resolve(${resultVar}));
      })`;
    });

    if (simpleCount > 0) {
      changes.push(`Converted ${simpleCount} simple callback(s) to Promise`);
    }

    // Pattern 3: Error-first callback without arrow function
    const errorFirstPattern = /,\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;

    let errorFirstCount = 0;
    converted = converted.replace(errorFirstPattern, (_, errVar, resultVar) => {
      errorFirstCount++;
      return `, (err, ${resultVar}) => { if (err) throw err; return ${resultVar}; }`;
    });

    if (errorFirstCount > 0) {
      changes.push(`Converted ${errorFirstCount} error-first callback(s)`);
    }

    // Add async to function if we made conversions
    if (matchCount + simpleCount > 0) {
      if (!code.startsWith('async ')) {
        converted = converted.replace(/^(function\s+)?/, 'async $1');
        changes.push('Added async keyword to function');
      }
    }

    return { code: converted, changes };
  }

  /**
   * Auto-detects the code pattern and converts accordingly
   */
  private autoDetectAndConvert(code: string): {
    code: string;
    changes: string[];
    mode: ConversionMode;
  } {
    // Check for Promise chains
    if (/.then\s*\(/.test(code)) {
      const result = this.convertPromiseToAsyncAwait(code);
      return { ...result, mode: 'promise-to-async' };
    }

    // Check for async/await
    if (/\bawait\s+/.test(code)) {
      const result = this.convertAsyncAwaitToPromise(code);
      return { ...result, mode: 'async-to-promise' };
    }

    // Check for callbacks
    if (/,\s*\(\s*\w+\s*\)\s*=>/.test(code) || /,\s*function\s*\(/.test(code)) {
      const result = this.convertCallbackToPromise(code);
      return { ...result, mode: 'callback-to-promise' };
    }

    // Nothing detected
    return {
      code,
      changes: ['No convertible patterns detected'],
      mode: 'promise-to-async',
    };
  }

  /**
   * Extracts variable names from .then() chains
   */
  private extractThenVariables(code: string): string[] {
    const variables: string[] = [];
    const pattern = /\.then\s*\(\s*(\w+)\s*(?:=>|\,)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(code)) !== null) {
      variables.push(match[1]);
    }

    return variables;
  }

  /**
   * Extracts await statements with their variable assignments
   */
  private extractAwaitStatements(code: string): Array<{
    variable?: string;
    expression: string;
    line: number;
  }> {
    const statements: Array<{ variable?: string; expression: string; line: number }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';

      // Pattern: const x = await something
      const constMatch = line.match(/const\s+(\w+)\s*=\s*(await\s+.+)/);
      if (constMatch) {
        statements.push({
          variable: constMatch[1],
          expression: constMatch[2],
          line: i,
        });
        continue;
      }

      // Pattern: let x = await something
      const letMatch = line.match(/let\s+(\w+)\s*=\s*(await\s+.+)/);
      if (letMatch) {
        statements.push({
          variable: letMatch[1],
          expression: letMatch[2],
          line: i,
        });
        continue;
      }

      // Pattern: await something (without assignment)
      if (line.startsWith('await ')) {
        statements.push({
          expression: line,
          line: i,
        });
      }
    }

    return statements;
  }

  /**
   * Replaces the await block with the Promise chain
   */
  private replaceAwaitBlock(originalCode: string, chainCode: string): string {
    const lines = originalCode.split('\n');
    const start = lines.findIndex((line) => line.includes('await'));

    if (start === -1) {
      return originalCode;
    }

    // Find last index of await (manual implementation for ES compatibility)
    let end = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i]?.includes('await')) {
        end = i;
        break;
      }
    }

    // Find function opening
    const funcStart = lines.findIndex((line) => /\{/.test(line));

    if (funcStart === -1) {
      return originalCode;
    }

    // Rebuild the code
    const before = lines.slice(0, funcStart + 1).join('\n');
    const after = lines.slice(end + 1).join('\n');

    return `${before}\n  ${chainCode}\n${after}`;
  }

  /**
   * Cleans up Promise chain artifacts after conversion
   */
  private cleanupPromiseChain(code: string): string {
    let cleaned = code;

    // Remove unnecessary parentheses
    cleaned = cleaned.replace(/\(\s*\(\s*([^(]+)\s*\)\s*\)/g, '($1)');

    // Fix multiple consecutive await keywords
    cleaned = cleaned.replace(/await\s+await\s+/g, 'await ');

    // Fix indentation issues
    cleaned = cleaned.replace(/\n\s+\n\s*\./g, '\n    .');

    return cleaned;
  }

  /**
   * Applies the converted code to the document
   */
  public async applyConversion(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    result: ConversionResult,
  ): Promise<void> {
    const editor = await vscode.window.showTextDocument(document);

    await editor.edit((editBuilder) => {
      editBuilder.replace(selection, result.convertedCode);
    });

    this.logger.info('Applied code conversion', {
      mode: result.mode,
      changes: result.changes.length,
    });
  }

  /**
   * Shows a quick pick dialog for selecting conversion mode
   */
  public async selectConversionMode(): Promise<ConversionMode | undefined> {
    const options: Array<{ label: string; description: string; mode: ConversionMode }> = [
      {
        label: 'Promise → Async/Await',
        description: 'Convert .then()/.catch() chains to async/await syntax',
        mode: 'promise-to-async',
      },
      {
        label: 'Async/Await → Promise',
        description: 'Convert async/await to .then()/.catch() chains',
        mode: 'async-to-promise',
      },
      {
        label: 'Callback → Promise',
        description: 'Convert callback-based code to Promise-based code',
        mode: 'callback-to-promise',
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select conversion mode',
    });

    return selected?.mode;
  }
}
