import * as vscode from 'vscode';

import type {
  MemoDecoratorGenerationOptions,
  MemoDecoratorGenerationResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type { MemoDecoratorGenerationOptions, MemoDecoratorGenerationResult };

/**
 * Service for generating memoization decorators for expensive function calls
 */
export class MemoDecoratorGeneratorService {
  private static instance: MemoDecoratorGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): MemoDecoratorGeneratorService {
    MemoDecoratorGeneratorService.instance ??= new MemoDecoratorGeneratorService();
    return MemoDecoratorGeneratorService.instance;
  }

  /**
   * Main entry point: Generates memoization decorator from selected function
   */
  public async generateMemoDecoratorFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: MemoDecoratorGenerationOptions,
  ): Promise<MemoDecoratorGenerationResult> {
    const selectedText = document.getText(selection);

    // Parse the function to extract signature information
    const functionInfo = this.parseFunction(selectedText, options);

    if (!functionInfo) {
      throw new Error(
        'Could not parse function from selection. Please select a valid function.',
      );
    }

    // Generate the memoization decorator code
    const decoratorCode = this.generateMemoDecoratorCode(functionInfo, options);

    // Generate the decorated function code
    const decoratedFunctionCode = this.generateDecoratedFunctionCode(
      selectedText,
      functionInfo,
      options,
    );

    this.logger.info('Memo decorator generated', {
      functionName: functionInfo.name,
      cacheStrategy: options.cacheStrategy,
    });

    return {
      functionName: functionInfo.name,
      decoratorCode,
      decoratedFunctionCode,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a function to extract signature information
   */
  private parseFunction(
    code: string,
    options: MemoDecoratorGenerationOptions,
  ): { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean } | null {
    const trimmedCode = code.trim();

    // Match function declaration: function name(...) or const name = (...) or name: (...)
    const functionMatch = trimmedCode.match(
      /(?:function\s+|(?:const|let|var)\s+)?(\w+)?\s*(?::\s*)?(?:=\s*)?(async\s+)?(?:function\s+)?(\w+)\s*\(([^)]*)\)/,
    );

    if (!functionMatch) {
      // Try to match method declaration: methodName(...) {...}
      const methodMatch = trimmedCode.match(
        /(?:async\s+)?(\w+)\s*\(([^)]*)\)/s,
      );
      if (!methodMatch) {
        return null;
      }
      const methodName = methodMatch[1] ?? '';
      const paramsStr = methodMatch[2] ?? '';
      const parameters = this.extractParameters(paramsStr);
      return {
        name: methodName,
        parameters,
        isAsync: trimmedCode.includes('async '),
        isStatic: trimmedCode.includes('static '),
      };
    }

    // Extract function information
    const isAsync = (functionMatch[2] !== undefined) || trimmedCode.includes('async ');
    const name = functionMatch[3] ?? functionMatch[1] ?? 'anonymous';
    const paramsStr = functionMatch[4] ?? '';
    const parameters = this.extractParameters(paramsStr);

    return {
      name,
      parameters,
      isAsync,
      isStatic: trimmedCode.includes('static '),
    };
  }

  /**
   * Extracts parameter names from parameter string
   */
  private extractParameters(paramsStr: string): string[] {
    if (!paramsStr.trim()) {
      return [];
    }

    const parameters: string[] = [];
    const params = paramsStr.split(',').map((p) => p.trim());

    for (const param of params) {
      // Extract parameter name (before colon or equals)
      const paramMatch = param.match(/^(\w+)/);
      if (paramMatch) {
        parameters.push(paramMatch[1] ?? '');
      }
    }

    return parameters;
  }

  /**
   * Generates memoization decorator code
   */
  private generateMemoDecoratorCode(
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: MemoDecoratorGenerationOptions,
  ): string {
    let code = '';

    // Add import statement if enabled
    if (options.importHelper) {
      code += this.getHelperImport(options);
    }

    // Add JSDoc for the decorator
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Memoization decorator for ${functionInfo.name}\n`;
      if (options.cacheStrategy === 'ttl') {
        code += ` * Cache expires after ${options.ttlMs}ms\n`;
      }
      code += ` */\n`;
    }

    // Generate decorator factory function
    code += this.generateDecoratorFactory(functionInfo, options);

    return code;
  }

  /**
   * Gets the helper import statement based on cache strategy
   */
  private getHelperImport(options: MemoDecoratorGenerationOptions): string {
    switch (options.cacheStrategy) {
      case 'lru':
        return `import { LRUCache } from 'lru-cache';\n\n`;
      case 'ttl':
        return `import { LRUCache } from 'lru-cache';\n\n`;
      default:
        return '';
    }
  }

  /**
   * Generates the decorator factory function
   */
  private generateDecoratorFactory(
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: MemoDecoratorGenerationOptions,
  ): string {
    const exportKeyword = options.exportDecorator ? 'export ' : '';
    const decoratorName = options.decoratorName || `memo${functionInfo.name}`;

    let code = `${exportKeyword}function ${decoratorName}`;

    if (options.cacheStrategy === 'ttl') {
      code += `(ttlMs: number = ${options.ttlMs})`;
    } else if (options.cacheStrategy === 'lru') {
      code += `(maxSize: number = ${options.maxSize})`;
    } else {
      code += '()';
    }

    code += ' {\n';
    code += '  return function (\n';
    code += '    target: any,\n';
    code += '    propertyKey: string,\n';
    code += '    descriptor: PropertyDescriptor,\n';
    code += '  ): PropertyDescriptor {\n';
    code += '    const originalMethod = descriptor.value;\n\n';

    // Generate cache initialization
    code += this.generateCacheInitialization(options);

    // Generate cache key generation
    code += this.generateCacheKeyGeneration(functionInfo.parameters);

    // Generate the wrapper function
    code += this.generateWrapperFunction(functionInfo, options);

    code += '    return descriptor;\n';
    code += '  };\n';
    code += '}\n';

    return code;
  }

  /**
   * Generates cache initialization code
   */
  private generateCacheInitialization(options: MemoDecoratorGenerationOptions): string {
    let code = '    const cache = ';

    switch (options.cacheStrategy) {
      case 'lru':
        code += `new LRUCache({ max: maxSize });\n\n`;
        break;
      case 'ttl':
        code += `new LRUCache({ max: 1000, ttl: ttlMs });\n\n`;
        break;
      case 'weak':
        code += `new WeakMap<object, any>();\n\n`;
        break;
      default:
        code += `new Map<string, any>();\n\n`;
        break;
    }

    return code;
  }

  /**
   * Generates cache key generation code
   */
  private generateCacheKeyGeneration(parameters: string[]): string {
    let code = '    const generateCacheKey = (';

    if (parameters.length > 0) {
      code += parameters.join(', ');
    }

    code += '): string => {\n';
    code += `      return JSON.stringify([${parameters.join(', ')}]);\n`;
    code += '    };\n\n';

    return code;
  }

  /**
   * Generates the wrapper function
   */
  private generateWrapperFunction(
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: MemoDecoratorGenerationOptions,
  ): string {
    let code = '    descriptor.value = ';

    if (functionInfo.isAsync) {
      code += 'async function (';
    } else {
      code += 'function (';
    }

    if (functionInfo.parameters.length > 0) {
      code += functionInfo.parameters.join(', ');
    }

    code += ') {\n';

    // Generate cache key
    if (functionInfo.parameters.length > 0) {
      code += `      const key = generateCacheKey(${functionInfo.parameters.join(', ')});\n\n`;
    } else {
      code += '      const key = "_singleton_";\n\n';
    }

    // Check cache
    code += this.generateCacheCheck(functionInfo.isAsync, options);

    // Call original method and cache result
    code += this.generateCacheSet(functionInfo.isAsync, options);

    code += '    };\n\n';

    return code;
  }

  /**
   * Generates cache check code
   */
  private generateCacheCheck(isAsync: boolean, options: MemoDecoratorGenerationOptions): string {
    let code = '';

    switch (options.cacheStrategy) {
      case 'weak':
        code += '      if (cache.has(this)) {\n';
        code += '        return cache.get(this);\n';
        code += '      }\n';
        break;
      default:
        code += '      if (cache.has(key)) {\n';
        code += '        return cache.get(key);\n';
        code += '      }\n';
        break;
    }

    return code;
  }

  /**
   * Generates cache set code
   */
  private generateCacheSet(isAsync: boolean, options: MemoDecoratorGenerationOptions): string {
    let code = '      const result = await originalMethod.apply(this, arguments);\n\n';

    code += '      cache';
    if (options.cacheStrategy === 'weak') {
      code += '.set(this, result);\n';
    } else {
      code += `.set(key, result);\n`;
    }

    code += '\n      return result;\n';

    return code;
  }

  /**
   * Generates the decorated function code
   */
  private generateDecoratedFunctionCode(
    originalCode: string,
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: MemoDecoratorGenerationOptions,
  ): string {
    const decoratorName = options.decoratorName || `memo${functionInfo.name}`;

    let code = '';

    // Find the position to insert the decorator
    const lines = originalCode.split('\n');
    let insertIndex = 0;

    // Skip leading whitespace
    while (insertIndex < lines.length && lines[insertIndex]!.trim() === '') {
      insertIndex++;
    }

    // Get indentation
    const indent = lines[insertIndex]?.match(/^(\s*)/)?.[1] ?? '';

    // Build decorated function
    if (options.cacheStrategy === 'ttl') {
      code += `${indent}@${decoratorName}(${options.ttlMs})\n`;
    } else if (options.cacheStrategy === 'lru') {
      code += `${indent}@${decoratorName}(${options.maxSize})\n`;
    } else {
      code += `${indent}@${decoratorName}()\n`;
    }

    code += originalCode;

    return code;
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultFunctionName?: string,
  ): Promise<MemoDecoratorGenerationOptions | undefined> {
    // Ask for cache strategy
    const cacheStrategy = await vscode.window.showQuickPick(
      [
        {
          label: 'Map (Simple)',
          description: 'Use Map for caching (unlimited size)',
          value: 'map',
        },
        {
          label: 'LRU Cache',
          description: 'Use LRU cache with size limit',
          value: 'lru',
        },
        {
          label: 'TTL Cache',
          description: 'Use time-based cache expiration',
          value: 'ttl',
        },
        {
          label: 'WeakMap',
          description: 'Use WeakMap for automatic garbage collection',
          value: 'weak',
        },
      ],
      {
        placeHolder: 'Select cache strategy',
      },
    );

    if (!cacheStrategy) {
      return undefined;
    }

    const options: MemoDecoratorGenerationOptions = {
      cacheStrategy: cacheStrategy.value as 'map' | 'lru' | 'ttl' | 'weak',
      decoratorName: defaultFunctionName ? `memo${defaultFunctionName}` : 'Memoize',
      exportDecorator: true,
      includeJSDoc: true,
      importHelper: true,
      ttlMs: 60000,
      maxSize: 100,
    };

    // Ask for TTL if TTL strategy is selected
    if (cacheStrategy.value === 'ttl') {
      const ttlInput = await vscode.window.showInputBox({
        prompt: 'Enter cache TTL in milliseconds',
        placeHolder: '60000',
        value: '60000',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num <= 0) {
            return 'Please enter a valid positive number';
          }
          return null;
        },
      });

      if (ttlInput) {
        options.ttlMs = Number.parseInt(ttlInput, 10);
      }
    }

    // Ask for max size if LRU strategy is selected
    if (cacheStrategy.value === 'lru') {
      const maxSizeInput = await vscode.window.showInputBox({
        prompt: 'Enter maximum cache size',
        placeHolder: '100',
        value: '100',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num <= 0) {
            return 'Please enter a valid positive number';
          }
          return null;
        },
      });

      if (maxSizeInput) {
        options.maxSize = Number.parseInt(maxSizeInput, 10);
      }
    }

    // Ask for decorator name
    const decoratorName = await vscode.window.showInputBox({
      prompt: 'Enter decorator name',
      placeHolder: options.decoratorName,
      value: options.decoratorName,
    });

    if (decoratorName) {
      options.decoratorName = decoratorName;
    }

    return options;
  }

  /**
   * Shows decorator preview and gets user confirmation
   */
  public async showDecoratorPreview(result: MemoDecoratorGenerationResult): Promise<{
    shouldInsert: boolean;
    action: 'replace' | 'copy' | 'cancel';
  }> {
    const document = await vscode.workspace.openTextDocument({
      content: result.decoratorCode + '\n\n' + result.decoratedFunctionCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Replace Function',
          description: 'Replace the original function with decorated version',
          value: 'replace',
        },
        {
          label: 'Copy to Clipboard',
          description: 'Copy decorator code to clipboard',
          value: 'copy',
        },
        {
          label: 'Cancel',
          description: 'Cancel the operation',
          value: 'cancel',
        },
      ],
      {
        placeHolder: 'What would you like to do with this decorator?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return { shouldInsert: false, action: 'cancel' };
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(
        result.decoratorCode + '\n\n' + result.decoratedFunctionCode,
      );
      vscode.window.showInformationMessage('Memo decorator code copied to clipboard!');
      return { shouldInsert: false, action: 'copy' };
    }

    return { shouldInsert: true, action: 'replace' };
  }
}
