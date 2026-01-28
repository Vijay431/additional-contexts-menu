import * as vscode from 'vscode';

import type {
  RetryDecoratorGenerationOptions,
  RetryDecoratorGenerationResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type { RetryDecoratorGenerationOptions, RetryDecoratorGenerationResult };

/**
 * Service for generating retry logic decorators for unreliable operations
 */
export class RetryDecoratorGeneratorService {
  private static instance: RetryDecoratorGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RetryDecoratorGeneratorService {
    RetryDecoratorGeneratorService.instance ??= new RetryDecoratorGeneratorService();
    return RetryDecoratorGeneratorService.instance;
  }

  /**
   * Main entry point: Generates retry decorator from selected function
   */
  public async generateRetryDecoratorFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: RetryDecoratorGenerationOptions,
  ): Promise<RetryDecoratorGenerationResult> {
    const selectedText = document.getText(selection);

    // Parse the function to extract signature information
    const functionInfo = this.parseFunction(selectedText, options);

    if (!functionInfo) {
      throw new Error(
        'Could not parse function from selection. Please select a valid function.',
      );
    }

    // Generate the retry decorator code
    const decoratorCode = this.generateRetryDecoratorCode(functionInfo, options);

    // Generate the decorated function code
    const decoratedFunctionCode = this.generateDecoratedFunctionCode(
      selectedText,
      functionInfo,
      options,
    );

    this.logger.info('Retry decorator generated', {
      functionName: functionInfo.name,
      maxRetries: options.maxRetries,
      backoffType: options.backoffType,
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
    _options: RetryDecoratorGenerationOptions,
  ): { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean } | null {
    const trimmedCode = code.trim();

    // Match function declaration: function name(...) or const name = (...) or name: (...)
    const functionMatch = trimmedCode.match(
      /(?:function\s+|(?:const|let|var)\s+)?(\w+)?\s*(?::\s*)?(?:=\s*)?(async\s+)?(?:function\s+)?(\w+)\s*\(([^)]*)\)/,
    );

    if (!functionMatch) {
      // Try to match method declaration: methodName(...) {...}
      const methodMatch = trimmedCode.match(
        /(?:async\s+)?(\w+)\s*\(([^)]*)\)/,
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
   * Generates retry decorator code
   */
  private generateRetryDecoratorCode(
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: RetryDecoratorGenerationOptions,
  ): string {
    let code = '';

    // Add import statement if enabled
    if (options.importHelper) {
      code += this.getHelperImport(options);
    }

    // Add JSDoc for the decorator
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Retry decorator for ${functionInfo.name}\n`;
      code += ` * Max retries: ${options.maxRetries}\n`;
      code += ` * Backoff: ${options.backoffType}\n`;
      if (options.jitterEnabled) {
        code += ` * Jitter: enabled\n`;
      }
      code += ` */\n`;
    }

    // Generate decorator factory function
    code += this.generateDecoratorFactory(functionInfo, options);

    return code;
  }

  /**
   * Gets the helper import statement based on backoff type
   */
  private getHelperImport(options: RetryDecoratorGenerationOptions): string {
    if (options.includeCircuitBreaker) {
      return `import { CircuitBreaker } from 'opossum';\n\n`;
    }
    return '';
  }

  /**
   * Generates the decorator factory function
   */
  private generateDecoratorFactory(
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: RetryDecoratorGenerationOptions,
  ): string {
    const exportKeyword = options.exportDecorator ? 'export ' : '';
    const decoratorName = options.decoratorName || `retry${functionInfo.name}`;

    let code = `${exportKeyword}function ${decoratorName}(options: { maxRetries?: number; initialDelay?: number; backoffType?: '${options.backoffType}'; jitterEnabled?: boolean } = {}) {\n`;

    // Destructure options with defaults
    code += `  const {\n`;
    code += `    maxRetries = ${options.maxRetries},\n`;
    code += `    initialDelay = ${options.initialDelay},\n`;
    code += `    backoffType = '${options.backoffType}',\n`;
    if (options.jitterEnabled) {
      code += `    jitterEnabled = true,\n`;
    }
    code += `  } = options;\n\n`;

    code += '  return function (\n';
    code += '    target: any,\n';
    code += '    propertyKey: string,\n';
    code += '    descriptor: PropertyDescriptor,\n';
    code += '  ): PropertyDescriptor {\n';
    code += '    const originalMethod = descriptor.value;\n\n';

    // Generate backoff calculation
    code += this.generateBackoffCalculation(options);

    // Generate jitter function if enabled
    if (options.jitterEnabled) {
      code += this.generateJitterFunction();
    }

    // Generate the wrapper function
    code += this.generateWrapperFunction(functionInfo, options);

    code += '    return descriptor;\n';
    code += '  };\n';
    code += '}\n';

    return code;
  }

  /**
   * Generates backoff calculation code
   */
  private generateBackoffCalculation(options: RetryDecoratorGenerationOptions): string {
    let code = '    const calculateDelay = (attempt: number): number => {\n';
    code += '      let delay: number;\n\n';

    switch (options.backoffType) {
      case 'exponential':
        code += `      // Exponential backoff: delay = initialDelay * 2^attempt\n`;
        code += '      delay = initialDelay * Math.pow(2, attempt);\n';
        break;
      case 'linear':
        code += `      // Linear backoff: delay = initialDelay * (attempt + 1)\n`;
        code += '      delay = initialDelay * (attempt + 1);\n';
        break;
      case 'fixed':
        code += `      // Fixed delay\n`;
        code += '      delay = initialDelay;\n';
        break;
      case 'custom':
        code += `      // Custom backoff formula\n`;
        code += '      delay = initialDelay * Math.sqrt(attempt + 1);\n';
        break;
    }

    if (options.jitterEnabled) {
      code += '\n';
      code += '      // Add jitter to prevent thundering herd\n';
      code += '      if (jitterEnabled) {\n';
      code += '        delay = addJitter(delay);\n';
      code += '      }\n';
    }

    code += '\n      return delay;\n';
    code += '    };\n\n';

    return code;
  }

  /**
   * Generates jitter function
   */
  private generateJitterFunction(): string {
    let code = '    const addJitter = (delay: number): number => {\n';
    code += '      // Add random jitter: +/- 25% of delay\n';
    code += '      const jitter = delay * 0.25;\n';
    code += '      const randomJitter = Math.random() * jitter * 2 - jitter;\n';
    code += '      return Math.max(0, delay + randomJitter);\n';
    code += '    };\n\n';

    return code;
  }

  /**
   * Generates the wrapper function
   */
  private generateWrapperFunction(
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: RetryDecoratorGenerationOptions,
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

    // Generate retry loop
    code += this.generateRetryLoop(functionInfo.isAsync, options);

    code += '    };\n\n';

    return code;
  }

  /**
   * Generates retry loop
   */
  private generateRetryLoop(isAsync: boolean, options: RetryDecoratorGenerationOptions): string {
    let code = '      let lastError: Error | undefined;\n\n';
    code += '      for (let attempt = 0; attempt <= maxRetries; attempt++) {\n';
    code += '        try {\n';

    if (isAsync) {
      code += '          const result = await originalMethod.apply(this, arguments);\n';
      code += '          return result;\n';
    } else {
      code += '          const result = originalMethod.apply(this, arguments);\n';
      code += '          return result;\n';
    }

    code += '        } catch (error) {\n';
    code += '          lastError = error as Error;\n\n';
    code += '          // Check if we should retry\n';
    code += '          const shouldRetry = attempt < maxRetries && ';
    code += this.generateRetryCondition(options);
    code += ';\n\n';
    code += '          if (!shouldRetry) {\n';
    code += '            break;\n';
    code += '          }\n\n';
    code += '          // Calculate delay and wait before retry\n';
    code += '          const delay = calculateDelay(attempt);\n';

    if (isAsync) {
      code += '          await new Promise(resolve => setTimeout(resolve, delay));\n';
    } else {
      code += '          // Synchronous retry - note: this will block\n';
      code += '          // For sync functions, consider making them async for proper retry\n';
    }

    code += '        }\n';
    code += '      }\n\n';
    code += '      throw lastError || new Error("Max retries exceeded");\n';

    return code;
  }

  /**
   * Generates retry condition based on options
   */
  private generateRetryCondition(options: RetryDecoratorGenerationOptions): string {
    if (options.retryableErrors.length > 0) {
      const errorNames = options.retryableErrors.map((e) => `'${e}'`).join(' | ');
      return `lastError.name === (${errorNames})`;
    }

    if (options.retryableStatusCodes.length > 0) {
      const codes = options.retryableStatusCodes.join(', ');
      return `lastError.name === 'StatusCodeError' && [${codes}].includes((lastError as any).statusCode)`;
    }

    return 'true';
  }

  /**
   * Generates the decorated function code
   */
  private generateDecoratedFunctionCode(
    originalCode: string,
    functionInfo: { name: string; parameters: string[]; isAsync: boolean; isStatic: boolean },
    options: RetryDecoratorGenerationOptions,
  ): string {
    const decoratorName = options.decoratorName || `retry${functionInfo.name}`;

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
    code += `${indent}@${decoratorName}({\n`;
    code += `${indent}  maxRetries: ${options.maxRetries},\n`;
    code += `${indent}  initialDelay: ${options.initialDelay},\n`;
    code += `${indent}  backoffType: '${options.backoffType}'`;

    if (options.jitterEnabled) {
      code += ',\n';
      code += `${indent}  jitterEnabled: true`;
    }

    if (options.retryableErrors.length > 0) {
      code += ',\n';
      code += `${indent}  retryableErrors: [${options.retryableErrors.map((e) => `'${e}'`).join(', ')}]`;
    }

    code += '\n';
    code += `${indent}})\n`;

    code += originalCode;

    return code;
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultFunctionName?: string,
  ): Promise<RetryDecoratorGenerationOptions | undefined> {
    // Step 1: Ask for backoff type
    const backoffType = await vscode.window.showQuickPick(
      [
        {
          label: 'Exponential',
          description: 'Exponential backoff (delay * 2^attempt)',
          value: 'exponential',
        },
        {
          label: 'Linear',
          description: 'Linear backoff (delay * (attempt + 1))',
          value: 'linear',
        },
        {
          label: 'Fixed',
          description: 'Fixed delay between retries',
          value: 'fixed',
        },
        {
          label: 'Custom',
          description: 'Custom backoff formula (sqrt-based)',
          value: 'custom',
        },
      ],
      {
        placeHolder: 'Select backoff type',
      },
    );

    if (!backoffType) {
      return undefined;
    }

    // Step 2: Configure max retries
    const maxRetriesInput = await vscode.window.showInputBox({
      prompt: 'Enter maximum number of retry attempts',
      placeHolder: '3',
      value: '3',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          return 'Max retries must be a non-negative number';
        }
        return null;
      },
    });

    if (!maxRetriesInput) {
      return undefined;
    }
    const maxRetries = parseInt(maxRetriesInput, 10);

    // Step 3: Configure initial delay
    const initialDelayInput = await vscode.window.showInputBox({
      prompt: 'Enter initial retry delay in milliseconds',
      placeHolder: '1000',
      value: '1000',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 100) {
          return 'Delay must be at least 100ms';
        }
        return null;
      },
    });

    if (!initialDelayInput) {
      return undefined;
    }
    const initialDelay = parseInt(initialDelayInput, 10);

    // Step 4: Ask about jitter
    const jitterEnabled = await this.askYesNoQuestion('Enable jitter to prevent thundering herd?', true);

    // Step 5: Ask about circuit breaker integration
    const includeCircuitBreaker = await this.askYesNoQuestion('Include circuit breaker integration?', false);

    // Step 6: Ask about retryable errors
    const retryableErrors: string[] = [];
    const useRetryableErrors = await this.askYesNoQuestion('Specify retryable error types?', false);

    if (useRetryableErrors) {
      const errors = await vscode.window.showInputBox({
        prompt: 'Enter comma-separated error names to retry (e.g., NetworkError, TimeoutError)',
        placeHolder: 'NetworkError,TimeoutError',
      });

      if (errors) {
        retryableErrors.push(...errors.split(',').map((e) => e.trim()).filter((e) => e.length > 0));
      }
    }

    // Step 7: Ask for decorator name
    const decoratorNameInput = await vscode.window.showInputBox({
      prompt: 'Enter decorator name',
      placeHolder: defaultFunctionName ? `retry${defaultFunctionName}` : 'Retry',
      value: defaultFunctionName ? `retry${defaultFunctionName}` : 'Retry',
    });

    const options: RetryDecoratorGenerationOptions = {
      maxRetries,
      initialDelay,
      backoffType: backoffType.value as 'exponential' | 'linear' | 'fixed' | 'custom',
      jitterEnabled,
      includeCircuitBreaker,
      retryableErrors,
      retryableStatusCodes: [],
      decoratorName: decoratorNameInput || (defaultFunctionName ? `retry${defaultFunctionName}` : 'Retry'),
      exportDecorator: true,
      includeJSDoc: true,
      importHelper: true,
    };

    return options;
  }

  /**
   * Helper to ask yes/no questions
   */
  private async askYesNoQuestion(question: string, defaultValue: boolean): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: '', value: true },
        { label: 'No', description: '', value: false },
      ],
      {
        placeHolder: question,
      },
    );

    return choice?.value ?? defaultValue;
  }

  /**
   * Shows decorator preview and gets user confirmation
   */
  public async showDecoratorPreview(result: RetryDecoratorGenerationResult): Promise<{
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
      vscode.window.showInformationMessage('Retry decorator code copied to clipboard!');
      return { shouldInsert: false, action: 'copy' };
    }

    return { shouldInsert: true, action: 'replace' };
  }
}
