import * as path from 'path';
import * as vscode from 'vscode';

import type {
  MockDataGeneratorOptions,
  MockDataGeneratorResult,
  MockDataProperty,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type { MockDataGeneratorOptions, MockDataGeneratorResult, MockDataProperty };

/**
 * Service for generating realistic mock data based on TypeScript interfaces
 */
export class MockDataGeneratorService {
  private static instance: MockDataGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): MockDataGeneratorService {
    MockDataGeneratorService.instance ??= new MockDataGeneratorService();
    return MockDataGeneratorService.instance;
  }

  /**
   * Main entry point: Generates mock data from selected TypeScript interface
   */
  public async generateMockDataFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: MockDataGeneratorOptions,
  ): Promise<MockDataGeneratorResult> {
    const selectedText = document.getText(selection);

    // Parse the interface
    const interfaceInfo = this.parseInterface(selectedText, options);

    if (!interfaceInfo || interfaceInfo.properties.length === 0) {
      throw new Error(
        'Could not parse interface from selection. Please select a valid TypeScript interface.',
      );
    }

    // Generate the mock data
    const mockData = this.generateMockData(interfaceInfo.properties, options);

    // Generate the mock data code
    const mockDataCode = this.generateMockDataCode(
      options.dataStructureName,
      mockData,
      interfaceInfo.properties,
      options,
    );

    // Determine file path for the mock data
    const mockDataFilePath = this.calculateMockDataFilePath(
      document.fileName,
      options.dataStructureName,
    );

    this.logger.info('Mock data generated', {
      dataStructureName: options.dataStructureName,
      propertyCount: interfaceInfo.properties.length,
    });

    return {
      dataStructureName: options.dataStructureName,
      properties: interfaceInfo.properties,
      mockData,
      mockDataCode,
      filePath: mockDataFilePath,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a TypeScript interface to extract property information
   */
  private parseInterface(
    code: string,
    _options: MockDataGeneratorOptions,
  ): { properties: MockDataProperty[] } | null {
    const trimmedCode = code.trim();

    // Match interface declaration: interface Name { ... }
    const interfaceMatch = trimmedCode.match(/interface\s+(\w+)\s*\{([\s\S]*)\}/);
    if (!interfaceMatch) {
      // Try to match just the properties part { ... }
      const propertiesMatch = trimmedCode.match(/^\{([\s\S]*)\}$/);
      if (!propertiesMatch) {
        return null;
      }
      return this.parsePropertiesBlock(propertiesMatch[1] ?? '');
    }

    // Extract interface name (unused but extracted for potential future use)
    void (interfaceMatch[1] ?? '');
    const propertiesBlock = interfaceMatch[2] ?? '';

    return this.parsePropertiesBlock(propertiesBlock);
  }

  /**
   * Parses properties block to extract property information
   */
  private parsePropertiesBlock(propertiesStr: string): {
    properties: MockDataProperty[];
  } | null {
    const properties: MockDataProperty[] = [];

    // Split properties by semicolon, handling nested objects
    const propList = this.smartSplitProperties(propertiesStr);

    for (const prop of propList) {
      const propertyInfo = this.parseProperty(prop);
      if (propertyInfo) {
        properties.push(propertyInfo);
      }
    }

    return { properties };
  }

  /**
   * Parses a single property from an interface
   */
  private parseProperty(prop: string): MockDataProperty | null {
    const trimmed = prop.trim();

    // Skip empty lines
    if (!trimmed || trimmed.startsWith('//')) {
      return null;
    }

    // Extract JSDoc comment if present
    let description: string | undefined;
    const jsDocMatch = trimmed.match(/\/\*\*([^*]|\*(?!\/))*\*\/\s*/);
    if (jsDocMatch) {
      const comment = jsDocMatch[0] ?? '';
      const descMatch = comment.match(/\*\s*([^*]*)/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }
    }

    // Remove JSDoc from property for parsing
    const propWithoutComment = trimmed.replace(/\/\*\*([^*]|\*(?!\/))*\*\/\s*/, '');

    // Match: readonly name?: type, or name: type
    const readonlyMatch = propWithoutComment.match(/^readonly\s+(\w+)\s*:\s*(.+)$/);
    const optionalMatch = propWithoutComment.match(/^(\w+)\?\s*:\s*(.+)$/);
    const regularMatch = propWithoutComment.match(/^(\w+)\s*:\s*(.+)$/);

    let name: string;
    let typeExpression: string;
    let isReadonly = false;
    let isOptional = false;

    if (readonlyMatch) {
      name = readonlyMatch[1] ?? '';
      typeExpression = readonlyMatch[2] ?? '';
      isReadonly = true;
    } else if (optionalMatch) {
      name = optionalMatch[1] ?? '';
      typeExpression = optionalMatch[2] ?? '';
      isOptional = true;
    } else if (regularMatch) {
      name = regularMatch[1] ?? '';
      typeExpression = regularMatch[2] ?? '';
    } else {
      return null;
    }

    // Clean up type expression (remove trailing comma, semicolon, comments)
    typeExpression = typeExpression
      .replace(/[;,].*$/, '')
      .replace(/\/\/.*$/, '')
      .trim();

    const propertyInfo: MockDataProperty = {
      name,
      tsType: typeExpression,
      isRequired: !isOptional,
      isReadonly,
      isNullable: typeExpression.includes('null') || typeExpression.includes('undefined'),
      isArray: typeExpression.endsWith('[]') || typeExpression.startsWith('Array<'),
    };

    // Only add description if it's defined (to satisfy exactOptionalPropertyTypes)
    if (description !== undefined) {
      propertyInfo.description = description;
    }

    return propertyInfo;
  }

  /**
   * Splits properties by semicolon, handling nested objects/arrays
   */
  private smartSplitProperties(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let inComment = false;
    let inBlockComment = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const nextChar = str[i + 1];

      // Handle comments
      if (!inString && !inTemplate) {
        if (char === '/' && nextChar === '/' && !inBlockComment) {
          inComment = true;
          current += char;
          continue;
        }
        if (char === '/' && nextChar === '*' && !inComment) {
          inBlockComment = true;
          current += char;
          continue;
        }
        if (char === '\n' && inComment) {
          inComment = false;
        }
        if (char === '*' && nextChar === '/' && inBlockComment) {
          inBlockComment = false;
          current += char;
          continue;
        }
      }

      if (inComment || inBlockComment) {
        current += char;
        continue;
      }

      // Handle strings and template literals
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || str[i - 1] !== '\\')) {
        if (char === '`') {
          if (!inTemplate) {
            inTemplate = true;
          } else {
            inTemplate = false;
          }
        } else if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString && !inTemplate) {
        if (char === '(' || char === '{' || char === '[' || char === '<') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']' || char === '>') {
          depth--;
        }
      }

      if (char === ';' && depth === 0 && !inString && !inTemplate) {
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
   * Generates mock data based on property types
   */
  private generateMockData(
    properties: MockDataProperty[],
    options: MockDataGeneratorOptions,
  ): Record<string, unknown> {
    const mockData: Record<string, unknown> = {};

    for (const prop of properties) {
      // Skip optional properties if configured
      if (!prop.isRequired && !options.includeOptionalProperties) {
        continue;
      }

      // Skip readonly properties if configured
      if (prop.isReadonly && !options.includeReadonlyProperties) {
        continue;
      }

      mockData[prop.name] = this.generateMockValue(prop, options);
    }

    return mockData;
  }

  /**
   * Generates a mock value for a property based on its type
   */
  private generateMockValue(
    prop: MockDataProperty,
    options: MockDataGeneratorOptions,
  ): unknown {
    const tsType = prop.tsType.replace(/\?\s*$/, '').trim();
    const lowerType = tsType.toLowerCase();

    // Handle array types
    if (prop.isArray || lowerType.endsWith('[]')) {
      const elementType = tsType.replace(/\[\]$/, '').replace(/^Array<(.+)>$/, '$1');
      const arraySize = options.arraySize || 3;
      return Array.from({ length: arraySize }, () =>
        this.generateMockValueForType(elementType, prop.description, options),
      );
    }

    // Handle union types with null/undefined
    if (prop.isNullable) {
      // For nullable types, sometimes return null based on config
      if (options.includeNullValues && Math.random() > 0.8) {
        return null;
      }
      // Otherwise generate the actual value
      const baseType = tsType
        .replace(/\s*\|\s*null/g, '')
        .replace(/\s*\|\s*undefined/g, '')
        .trim();
      return this.generateMockValueForType(baseType, prop.description, options);
    }

    return this.generateMockValueForType(tsType, prop.description, options);
  }

  /**
   * Generates a mock value for a specific TypeScript type
   * Uses faker.js-like patterns for realistic data
   */
  private generateMockValueForType(
    type: string,
    description: string | undefined,
    options: MockDataGeneratorOptions,
  ): unknown {
    const lowerType = type.toLowerCase().trim();

    // Handle common types with realistic mock data
    switch (lowerType) {
      case 'string':
        return this.generateStringMock(description, options.useFakerPatterns);

      case 'number':
        return this.generateNumberMock(description, options.useFakerPatterns);

      case 'boolean':
        return Math.random() > 0.5;

      case 'date':
        return new Date().toISOString();

      case 'object':
        return {};

      case 'any':
      case 'unknown':
        return null;

      case 'bigint':
        return BigInt(Math.floor(Math.random() * 1000000));

      case 'symbol':
        return Symbol(description || 'mock');

      default:
        // For custom types or interfaces, return a placeholder object
        if (lowerType.startsWith('{') || lowerType.includes('interface')) {
          return {};
        }
        // Default fallback
        return this.generateStringMock(description, options.useFakerPatterns);
    }
  }

  /**
   * Generates a realistic string mock based on description/property name
   */
  private generateStringMock(description: string | undefined, useFaker: boolean): string {
    if (!useFaker || !description) {
      return 'example-string';
    }

    const desc = description.toLowerCase();

    // Generate realistic data based on property description
    if (desc.includes('name')) {
      return 'John Doe';
    }
    if (desc.includes('email')) {
      return 'john.doe@example.com';
    }
    if (desc.includes('phone')) {
      return '+1-555-0123-456';
    }
    if (desc.includes('address')) {
      return '123 Main Street, City, State 12345';
    }
    if (desc.includes('url') || desc.includes('website') || desc.includes('link')) {
      return 'https://example.com';
    }
    if (desc.includes('id') || desc.includes('uuid')) {
      return '550e8400-e29b-41d4-a716-446655440000';
    }
    if (desc.includes('date') || desc.includes('time')) {
      return new Date().toISOString();
    }
    if (desc.includes('color')) {
      return '#336699';
    }
    if (desc.includes('price') || desc.includes('cost') || desc.includes('amount')) {
      return '99.99';
    }
    if (desc.includes('company')) {
      return 'Acme Corporation';
    }
    if (desc.includes('username') || desc.includes('user')) {
      return 'johndoe';
    }
    if (desc.includes('password')) {
      return 'SecurePass123!';
    }
    if (desc.includes('title')) {
      return 'Example Title';
    }
    if (desc.includes('description')) {
      return 'This is a detailed description of the item.';
    }
    if (desc.includes('message')) {
      return 'This is a sample message.';
    }
    if (desc.includes('status')) {
      return 'active';
    }
    if (desc.includes('type') || desc.includes('category')) {
      return 'general';
    }
    if (desc.includes('locale') || desc.includes('language')) {
      return 'en-US';
    }
    if (desc.includes('currency')) {
      return 'USD';
    }
    if (desc.includes('country')) {
      return 'United States';
    }
    if (desc.includes('city')) {
      return 'San Francisco';
    }
    if (desc.includes('zip') || desc.includes('postal')) {
      return '94102';
    }

    // Default string
    return 'example-string';
  }

  /**
   * Generates a realistic number mock based on description/property name
   */
  private generateNumberMock(description: string | undefined, useFaker: boolean): number {
    if (!useFaker || !description) {
      return 42;
    }

    const desc = description.toLowerCase();

    // Generate realistic numbers based on property description
    if (desc.includes('id')) {
      return Math.floor(Math.random() * 1000000);
    }
    if (desc.includes('age')) {
      return Math.floor(Math.random() * 80) + 18;
    }
    if (desc.includes('price') || desc.includes('cost') || desc.includes('amount')) {
      return parseFloat((Math.random() * 1000 + 10).toFixed(2));
    }
    if (desc.includes('quantity') || desc.includes('count')) {
      return Math.floor(Math.random() * 100) + 1;
    }
    if (desc.includes('rating') || desc.includes('score')) {
      return parseFloat((Math.random() * 5 + 1).toFixed(1));
    }
    if (desc.includes('percentage') || desc.includes('percent') || desc.includes('rate')) {
      return parseFloat((Math.random() * 100).toFixed(2));
    }
    if (desc.includes('year')) {
      return new Date().getFullYear();
    }
    if (desc.includes('month')) {
      return Math.floor(Math.random() * 12) + 1;
    }
    if (desc.includes('day')) {
      return Math.floor(Math.random() * 31) + 1;
    }
    if (desc.includes('hour')) {
      return Math.floor(Math.random() * 24);
    }
    if (desc.includes('latitude') || desc.includes('lat')) {
      return parseFloat((Math.random() * 180 - 90).toFixed(6));
    }
    if (desc.includes('longitude') || desc.includes('lon') || desc.includes('lng')) {
      return parseFloat((Math.random() * 360 - 180).toFixed(6));
    }
    if (desc.includes('level') || desc.includes('tier')) {
      return Math.floor(Math.random() * 10) + 1;
    }
    if (desc.includes('priority')) {
      return Math.floor(Math.random() * 5) + 1;
    }
    if (desc.includes('index')) {
      return Math.floor(Math.random() * 100);
    }
    if (desc.includes('size')) {
      return Math.floor(Math.random() * 10000) + 100;
    }
    if (desc.includes('timeout') || desc.includes('duration')) {
      return Math.floor(Math.random() * 60000) + 1000;
    }

    // Default number
    return 42;
  }

  /**
   * Generates mock data code
   */
  private generateMockDataCode(
    dataStructureName: string,
    mockData: Record<string, unknown>,
    properties: MockDataProperty[],
    options: MockDataGeneratorOptions,
  ): string {
    let code = '';

    // Add header comment
    code += `// Auto-generated mock data for ${dataStructureName}\n`;
    code += `// Generated at: ${new Date().toISOString()}\n\n`;

    // Add export statement
    const exportKeyword = options.exportData ? 'export ' : '';
    const constKeyword = options.useConst ? 'const' : 'var';
    code += `${exportKeyword}${constKeyword} ${dataStructureName}Mock = `;

    // Format the mock data nicely
    code += JSON.stringify(mockData, null, 2);
    code += ';\n';

    // Add TypeScript type annotation if enabled
    if (options.includeTypeAnnotations) {
      code += `\n${exportKeyword}type ${dataStructureName} = {\n`;
      for (const prop of properties) {
        const optional = prop.isRequired ? '' : '?';
        const readonly = prop.isReadonly ? 'readonly ' : '';
        code += `  ${readonly}${prop.name}${optional}: ${prop.tsType};\n`;
      }
      code += '};\n';
    }

    // Add JSDoc if enabled
    if (options.includeJSDoc) {
      code += `\n/**\n`;
      code += ` * Mock data for ${dataStructureName}\n`;
      code += ` * ${properties.length} properties\n`;
      code += ` */\n`;
    }

    return code;
  }

  /**
   * Calculates the file path for the generated mock data
   */
  private calculateMockDataFilePath(sourceFilePath: string, dataStructureName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension from source file
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Create mock data file name
    const mockFileName = `${baseName}.mock.ts`;

    return path.join(sourceDir, mockFileName);
  }

  /**
   * Creates the mock data file at the specified path
   */
  public async createMockDataFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write mock data file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Mock data file created', { filePath });
  }

  /**
   * Checks if a mock data file already exists
   */
  public async mockDataFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends mock data to existing file
   */
  public async appendMockDataToFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const existingContent = await vscode.workspace.fs.readFile(uri);
    const existingText = Buffer.from(existingContent).toString('utf-8');

    const updatedText = existingText + '\n\n' + code;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(updatedText, 'utf-8'));
    this.logger.info('Mock data appended to file', { filePath });
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultDataStructureName?: string,
  ): Promise<MockDataGeneratorOptions | undefined> {
    // Ask for data structure name
    const dataStructureName = await vscode.window.showInputBox({
      prompt: 'Enter data structure name',
      placeHolder: 'MyData',
      value: defaultDataStructureName || 'MyData',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Data structure name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!dataStructureName) {
      return undefined;
    }

    // Ask about export
    const exportData = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Export the mock data', value: true },
        { label: 'No', description: 'Keep mock data local', value: false },
      ],
      {
        placeHolder: 'Export the mock data?',
      },
    );

    if (!exportData) {
      return undefined;
    }

    // Ask about using faker patterns
    const useFakerPatterns = await vscode.window.showQuickPick(
      [
        {
          label: 'Yes',
          description: 'Generate realistic data based on property names',
          value: true,
        },
        {
          label: 'No',
          description: 'Use simple placeholder values',
          value: false,
        },
      ],
      {
        placeHolder: 'Use realistic data patterns?',
      },
    );

    if (!useFakerPatterns) {
      return undefined;
    }

    return {
      dataStructureName: dataStructureName.trim(),
      exportData: exportData.value,
      useConst: true,
      includeTypeAnnotations: true,
      includeJSDoc: true,
      includeOptionalProperties: true,
      includeReadonlyProperties: true,
      includeNullValues: false,
      useFakerPatterns: useFakerPatterns.value,
      arraySize: 3,
    };
  }

  /**
   * Shows mock data preview and gets user confirmation
   */
  public async showMockDataPreview(result: MockDataGeneratorResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.mockDataCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new mock data file', value: 'create' },
        {
          label: 'Append to Existing',
          description: 'Append to existing mock data file',
          value: 'append',
        },
        {
          label: 'Copy to Clipboard',
          description: 'Copy mock data code to clipboard',
          value: 'copy',
        },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this mock data?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.mockDataCode);
      vscode.window.showInformationMessage('Mock data code copied to clipboard!');
      return false;
    }

    return true;
  }
}
