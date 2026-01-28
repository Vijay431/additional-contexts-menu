import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface FunctionSignature {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  isMethod: boolean;
  className?: string;
  description: string;
  fullText: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  hasDefault: boolean;
  defaultValue?: string;
}

export interface TestCase {
  description: string;
  input: Record<string, unknown>;
  expectedOutput?: unknown;
  expectedError?: string;
  shouldThrow: boolean;
}

export interface GeneratedTestSuite {
  functionName: string;
  testSuiteCode: string;
  testFilePath: string;
  importPath: string;
  testCaseCount: number;
}

export interface TestGenerationOptions {
  includeEdgeCases: boolean;
  includeErrorCases: boolean;
  testDirectory: string;
  setupType: 'none' | 'basic' | 'custom';
  customSetupPath?: string;
}

/**
 * Service for generating Jest test suites from function signatures
 */
export class JestTestGeneratorService {
  private static instance: JestTestGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): JestTestGeneratorService {
    JestTestGeneratorService.instance ??= new JestTestGeneratorService();
    return JestTestGeneratorService.instance;
  }

  /**
   * Main entry point: Generates test suite from selected code
   */
  public async generateTestsFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: TestGenerationOptions,
  ): Promise<GeneratedTestSuite> {
    const selectedText = document.getText(selection);

    // Parse the function signature
    const functionSignature = this.parseFunctionSignature(selectedText, document.fileName);

    if (!functionSignature) {
      throw new Error('Could not parse function signature from selection');
    }

    // Generate test cases
    const testCases = this.generateTestCases(functionSignature, options);

    // Generate the test suite code
    const testSuiteCode = this.generateTestSuiteCode(
      functionSignature,
      testCases,
      document.fileName,
      options,
    );

    // Determine test file path
    const testFilePath = this.calculateTestFilePath(document.fileName, functionSignature, options);

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, functionSignature);

    this.logger.info('Test suite generated', {
      functionName: functionSignature.name,
      testCaseCount: testCases.length,
    });

    return {
      functionName: functionSignature.name,
      testSuiteCode,
      testFilePath,
      importPath,
      testCaseCount: testCases.length,
    };
  }

  /**
   * Parses function signature from code text
   */
  private parseFunctionSignature(code: string, fileName: string): FunctionSignature | null {
    const trimmedCode = code.trim();

    // Match function declaration: function name(params): return type
    const functionDeclMatch = trimmedCode.match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?/,
    );

    // Match arrow function: const name = (params): return type =>
    const arrowFunctionMatch = trimmedCode.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?\s*=>/,
    );

    // Match method declaration: name(params): return type {
    const methodDeclMatch = trimmedCode.match(
      /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?\s*{/,
    );

    let match: RegExpExecArray | null;
    let functionType: 'function' | 'arrow' | 'method' = 'function';

    if (functionDeclMatch) {
      match = functionDeclMatch;
      functionType = 'function';
    } else if (arrowFunctionMatch) {
      match = arrowFunctionMatch;
      functionType = 'arrow';
    } else if (methodDeclMatch) {
      match = methodDeclMatch;
      functionType = 'method';
    } else {
      return null;
    }

    if (!match) {
      return null;
    }

    const name = match[1];
    const paramsStr = match[2];
    const returnType = match[3]?.trim() || 'unknown';
    const isAsync = /\basync\b/.test(trimmedCode);
    const isExported = /\bexport\b/.test(trimmedCode);
    const isMethod = functionType === 'method';

    // Parse parameters
    const parameters = this.parseParameters(paramsStr);

    return {
      name,
      parameters,
      returnType,
      isAsync,
      isExported,
      isMethod,
      className: isMethod ? this.extractClassName(trimmedCode) : undefined,
      description: `Test suite for ${name}`,
      fullText: trimmedCode,
    };
  }

  /**
   * Extracts class name from method code if available
   */
  private extractClassName(code: string): string | undefined {
    // Look for class declaration before the method
    const classMatch = code.match(/class\s+(\w+)/);
    return classMatch ? classMatch[1] : undefined;
  }

  /**
   * Parses parameters from parameter string
   */
  private parseParameters(paramsStr: string): ParameterInfo[] {
    const parameters: ParameterInfo[] = [];

    if (!paramsStr.trim()) {
      return parameters;
    }

    // Split by comma, but handle nested types and generics
    const paramList = this.smartSplit(paramsStr, ',');

    for (const param of paramList) {
      const trimmed = param.trim();

      // Match: name: type, or name?: type, or name = default
      const optionalMatch = trimmed.match(/^(\w+)\s*\?\s*:\s*(.+)$/);
      const typedMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      const defaultMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      const simpleMatch = trimmed.match(/^(\w+)$/);

      if (optionalMatch) {
        parameters.push({
          name: optionalMatch[1],
          type: optionalMatch[2].trim(),
          isOptional: true,
          hasDefault: false,
        });
      } else if (typedMatch) {
        parameters.push({
          name: typedMatch[1],
          type: typedMatch[2].trim(),
          isOptional: false,
          hasDefault: false,
        });
      } else if (defaultMatch) {
        parameters.push({
          name: defaultMatch[1],
          type: 'any',
          isOptional: true,
          hasDefault: true,
          defaultValue: defaultMatch[2].trim(),
        });
      } else if (simpleMatch) {
        parameters.push({
          name: simpleMatch[1],
          type: 'any',
          isOptional: false,
          hasDefault: false,
        });
      }
    }

    return parameters;
  }

  /**
   * Smart split that respects nested brackets
   */
  private smartSplit(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if ((char === '"' || char === "'" || char === '`') && (i === 0 || str[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(' || char === '{' || char === '[') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']') {
          depth--;
        }
      }

      if (char === delimiter && depth === 0 && !inString) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result.filter((s) => s.length > 0);
  }

  /**
   * Generates test cases based on function signature
   */
  private generateTestCases(
    signature: FunctionSignature,
    options: TestGenerationOptions,
  ): TestCase[] {
    const testCases: TestCase[] = [];

    // Basic success case with valid parameters
    testCases.push({
      description: 'should work with valid parameters',
      input: this.generateValidInput(signature.parameters),
      expectedOutput: this.generateExpectedOutput(signature.returnType),
      shouldThrow: false,
    });

    // Test with minimal required parameters
    const requiredParams = signature.parameters.filter((p) => !p.isOptional);
    if (requiredParams.length > 0 && requiredParams.length < signature.parameters.length) {
      testCases.push({
        description: 'should work with only required parameters',
        input: this.generateValidInput(requiredParams),
        expectedOutput: this.generateExpectedOutput(signature.returnType),
        shouldThrow: false,
      });
    }

    // Edge cases
    if (options.includeEdgeCases) {
      testCases.push(...this.generateEdgeCases(signature));
    }

    // Error cases
    if (options.includeErrorCases) {
      testCases.push(...this.generateErrorCases(signature));
    }

    return testCases;
  }

  /**
   * Generates valid input object from parameters
   */
  private generateValidInput(parameters: ParameterInfo[]): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    for (const param of parameters) {
      input[param.name] = this.getMockValueForType(param.type, param.defaultValue);
    }

    return input;
  }

  /**
   * Generates a mock value based on type
   */
  private getMockValueForType(type: string, defaultValue?: string): unknown {
    if (defaultValue) {
      return this.parseDefaultValue(defaultValue);
    }

    const lowerType = type.toLowerCase();

    if (lowerType === 'string') {
      return 'test';
    } else if (lowerType === 'number') {
      return 42;
    } else if (lowerType === 'boolean') {
      return true;
    } else if (lowerType === 'array' || lowerType.endsWith('[]')) {
      return [];
    } else if (lowerType === 'object' || lowerType.startsWith('{')) {
      return {};
    } else if (lowerType === 'any' || lowerType === 'unknown') {
      return null;
    } else if (lowerType === 'date') {
      return new Date();
    } else if (lowerType.includes('function') || lowerType.includes('=>')) {
      return jest.fn();
    } else if (lowerType.includes('promise')) {
      return Promise.resolve(null);
    }

    return null;
  }

  /**
   * Parses a default value string
   */
  private parseDefaultValue(value: string): unknown {
    value = value.trim();

    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return Number.parseFloat(value);
    if (/^['"`]/.test(value)) return value.slice(1, -1);
    if (value.startsWith('[')) return [];
    if (value.startsWith('{')) return {};

    return null;
  }

  /**
   * Generates expected output based on return type
   */
  private generateExpectedOutput(returnType: string): unknown {
    const lowerType = returnType.toLowerCase();

    if (lowerType === 'void' || lowerType === 'undefined') {
      return undefined;
    } else if (lowerType === 'string') {
      return expect.any(String);
    } else if (lowerType === 'number') {
      return expect.any(Number);
    } else if (lowerType === 'boolean') {
      return expect.any(Boolean);
    } else if (lowerType === 'array' || lowerType.endsWith('[]')) {
      return expect.any(Array);
    } else if (lowerType === 'object') {
      return expect.any(Object);
    } else if (lowerType.includes('promise')) {
      return expect.any(Promise);
    }

    return expect.anything();
  }

  /**
   * Generates edge case tests
   */
  private generateEdgeCases(signature: FunctionSignature): TestCase[] {
    const testCases: TestCase[] = [];

    // Test with empty string for string parameters
    const stringParams = signature.parameters.filter((p) => p.type.toLowerCase() === 'string');
    if (stringParams.length > 0) {
      const input: Record<string, unknown> = {};
      for (const param of signature.parameters) {
        input[param.name] =
          param.type.toLowerCase() === 'string' ? '' : this.getMockValueForType(param.type);
      }
      testCases.push({
        description: 'should handle empty string input',
        input,
        expectedOutput: this.generateExpectedOutput(signature.returnType),
        shouldThrow: false,
      });
    }

    // Test with zero for number parameters
    const numberParams = signature.parameters.filter((p) => p.type.toLowerCase() === 'number');
    if (numberParams.length > 0) {
      const input: Record<string, unknown> = {};
      for (const param of signature.parameters) {
        input[param.name] =
          param.type.toLowerCase() === 'number' ? 0 : this.getMockValueForType(param.type);
      }
      testCases.push({
        description: 'should handle zero value input',
        input,
        expectedOutput: this.generateExpectedOutput(signature.returnType),
        shouldThrow: false,
      });
    }

    // Test with empty array for array parameters
    const arrayParams = signature.parameters.filter(
      (p) => p.type.toLowerCase().includes('array') || p.type.endsWith('[]'),
    );
    if (arrayParams.length > 0) {
      const input: Record<string, unknown> = {};
      for (const param of signature.parameters) {
        input[param.name] =
          param.type.toLowerCase().includes('array') || param.type.endsWith('[]')
            ? []
            : this.getMockValueForType(param.type);
      }
      testCases.push({
        description: 'should handle empty array input',
        input,
        expectedOutput: this.generateExpectedOutput(signature.returnType),
        shouldThrow: false,
      });
    }

    // Test async function with await
    if (signature.isAsync) {
      testCases.push({
        description: 'should resolve with valid data',
        input: this.generateValidInput(signature.parameters),
        expectedOutput: this.generateExpectedOutput(signature.returnType),
        shouldThrow: false,
      });
    }

    return testCases;
  }

  /**
   * Generates error case tests
   */
  private generateErrorCases(signature: FunctionSignature): TestCase[] {
    const testCases: TestCase[] = [];

    // Test with null/undefined for required parameters
    const requiredParams = signature.parameters.filter((p) => !p.isOptional);
    if (requiredParams.length > 0) {
      const input: Record<string, unknown> = {};
      for (const param of signature.parameters) {
        input[param.name] = !param.isOptional ? null : this.getMockValueForType(param.type);
      }
      testCases.push({
        description: 'should throw error when required parameter is null',
        input,
        expectedError: expect.any(Error),
        shouldThrow: true,
      });
    }

    // Test with invalid type for required parameters
    if (requiredParams.length > 0) {
      const input: Record<string, unknown> = {};
      for (const param of signature.parameters) {
        input[param.name] = !param.isOptional ? 'invalid' : this.getMockValueForType(param.type);
      }
      testCases.push({
        description: 'should throw error with invalid parameter type',
        input,
        expectedError: expect.any(Error),
        shouldThrow: true,
      });
    }

    return testCases;
  }

  /**
   * Generates the complete test suite code
   */
  private generateTestSuiteCode(
    signature: FunctionSignature,
    testCases: TestCase[],
    sourceFilePath: string,
    options: TestGenerationOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(signature, sourceFilePath, options);

    // Add describe block
    const describeTitle = this.generateDescribeTitle(signature);
    code += `\ndescribe('${describeTitle}', () => {\n`;

    // Add setup if needed
    if (options.setupType !== 'none') {
      code += this.generateSetup(options);
    }

    // Add test cases
    for (const testCase of testCases) {
      code += this.generateTestCase(signature, testCase);
    }

    code += '});\n';

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    signature: FunctionSignature,
    sourceFilePath: string,
    options: TestGenerationOptions,
  ): string {
    let imports = "import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';\n";

    // Import the function being tested
    const relativePath = this.calculateRelativeImportPath(sourceFilePath, options.testDirectory);
    const importStatement = `import { ${signature.name} } from '${relativePath}';\n`;
    imports += importStatement;

    // Add custom setup import if specified
    if (options.setupType === 'custom' && options.customSetupPath) {
      imports += `import { setup } from '${options.customSetupPath}';\n`;
    }

    return imports;
  }

  /**
   * Calculates relative import path for the test file
   */
  private calculateRelativeImportPath(sourceFilePath: string, testDirectory: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove .ts, .tsx, .js, .jsx extension
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Calculate relative path from test directory to source directory
    const testDirPath = path.join(path.dirname(sourceFilePath), testDirectory);
    const relativeDir = path.relative(testDirPath, sourceDir);
    const normalizedPath = relativeDir === '' ? '.' : relativeDir;

    return path.join(normalizedPath, baseName).split('\\').join('/');
  }

  /**
   * Generates describe block title
   */
  private generateDescribeTitle(signature: FunctionSignature): string {
    const prefix = signature.isAsync ? 'async ' : '';
    const methodPrefix = signature.isMethod ? `${signature.className}.` : '';
    return `${methodPrefix}${prefix}${signature.name}`;
  }

  /**
   * Generates setup code
   */
  private generateSetup(options: TestGenerationOptions): string {
    let setupCode = '';

    if (options.setupType === 'basic') {
      setupCode += '  beforeEach(() => {\n';
      setupCode += '    // Setup test environment\n';
      setupCode += '  });\n\n';

      setupCode += '  afterEach(() => {\n';
      setupCode += '    // Cleanup after test\n';
      setupCode += '  });\n\n';
    } else if (options.setupType === 'custom') {
      setupCode += '  beforeEach(async () => {\n';
      setupCode += '    await setup();\n';
      setupCode += '  });\n\n';
    }

    return setupCode;
  }

  /**
   * Generates a single test case
   */
  private generateTestCase(signature: FunctionSignature, testCase: TestCase): string {
    let code = '';

    const asyncPrefix = signature.isAsync ? 'async ' : '';

    if (testCase.shouldThrow) {
      code += `  it('${testCase.description}', ${asyncPrefix}() => {\n`;
      code += `    await expect(async () => {\n`;
      code += `      ${this.generateFunctionCall(signature, testCase.input)}\n`;
      code += `    }).rejects.toThrow();\n`;
      code += '  });\n\n';
    } else {
      code += `  it('${testCase.description}', ${asyncPrefix}() => {\n`;

      if (signature.isAsync) {
        code += `    const result = await ${this.generateFunctionCall(signature, testCase.input)};\n`;
      } else {
        code += `    const result = ${this.generateFunctionCall(signature, testCase.input)};\n`;
      }

      if (
        signature.returnType.toLowerCase() !== 'void' &&
        signature.returnType.toLowerCase() !== 'undefined'
      ) {
        code += `    expect(result).toEqual(${this.formatExpectedOutput(testCase.expectedOutput)});\n`;
      }

      code += '  });\n\n';
    }

    return code;
  }

  /**
   * Generates function call code
   */
  private generateFunctionCall(
    signature: FunctionSignature,
    input: Record<string, unknown>,
  ): string {
    const args = signature.parameters
      .map((p) => {
        const value = input[p.name];
        return JSON.stringify(value, (_key, val) =>
          typeof val === 'function' ? '[Function]' : val,
        );
      })
      .join(', ');

    return `${signature.name}(${args})`;
  }

  /**
   * Formats expected output for test assertion
   */
  private formatExpectedOutput(output: unknown): string {
    if (output === undefined) {
      return 'undefined';
    } else if (output === null) {
      return 'null';
    } else if (typeof output === 'string') {
      if (output.startsWith('expect.')) {
        return output;
      }
      return `'${output}'`;
    }
    return JSON.stringify(output);
  }

  /**
   * Calculates test file path
   */
  private calculateTestFilePath(
    sourceFilePath: string,
    signature: FunctionSignature,
    options: TestGenerationOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Determine test file name
    let testFileName: string;
    if (baseName.endsWith('.test') || baseName.endsWith('.spec')) {
      testFileName = `${baseName}.ts`;
    } else {
      testFileName = `${baseName}.test.ts`;
    }

    return path.join(sourceDir, options.testDirectory, testFileName);
  }

  /**
   * Calculates import path for the source file
   */
  private calculateImportPath(sourceFilePath: string, _signature: FunctionSignature): string {
    return sourceFilePath;
  }

  /**
   * Creates the test file at the specified path
   */
  public async createTestFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write test file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Test file created', { filePath });
  }

  /**
   * Checks if a test file already exists
   */
  public async testFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets test generation options from user
   */
  public async getTestGenerationOptions(): Promise<TestGenerationOptions | undefined> {
    // Ask for test directory
    const testDirectory = await vscode.window.showInputBox({
      prompt: 'Enter test directory name',
      placeHolder: '__tests__',
      value: '__tests__',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Test directory cannot be empty';
        }
        return null;
      },
    });

    if (!testDirectory) {
      return undefined;
    }

    // Ask for setup type
    const setupType = await vscode.window.showQuickPick(
      [
        { label: 'None', description: 'No setup/teardown', value: 'none' },
        { label: 'Basic', description: 'Basic beforeEach/afterEach', value: 'basic' },
        { label: 'Custom', description: 'Use custom setup function', value: 'custom' },
      ],
      {
        placeHolder: 'Select test setup type',
      },
    );

    if (!setupType) {
      return undefined;
    }

    let customSetupPath: string | undefined;
    if (setupType.value === 'custom') {
      customSetupPath = await vscode.window.showInputBox({
        prompt: 'Enter custom setup file path',
        placeHolder: 'test/setup',
      });
    }

    return {
      includeEdgeCases: true,
      includeErrorCases: true,
      testDirectory: testDirectory.trim(),
      setupType: setupType.value as 'none' | 'basic' | 'custom',
      customSetupPath,
    };
  }
}
