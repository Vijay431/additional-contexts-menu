import * as path from 'path';
import * as vscode from 'vscode';

import type {
  InterfaceExtractionOptions,
  InterfaceExtractionResult,
  PropertyTypeInfo,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type { PropertyTypeInfo, InterfaceExtractionResult, InterfaceExtractionOptions };

/**
 * Service for extracting TypeScript interfaces from object literals
 */
export class TypeScriptInterfaceExtractorService {
  private static instance: TypeScriptInterfaceExtractorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): TypeScriptInterfaceExtractorService {
    TypeScriptInterfaceExtractorService.instance ??= new TypeScriptInterfaceExtractorService();
    return TypeScriptInterfaceExtractorService.instance;
  }

  /**
   * Main entry point: Extracts interface from selected code
   */
  public async extractInterfaceFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: InterfaceExtractionOptions,
  ): Promise<InterfaceExtractionResult> {
    const selectedText = document.getText(selection);

    // Parse the object literal
    const objectInfo = this.parseObjectLiteral(selectedText, options);

    if (!objectInfo || objectInfo.properties.length === 0) {
      throw new Error(
        'Could not extract interface from selection. Please select a valid object literal.',
      );
    }

    // Generate the interface code
    const interfaceCode = this.generateInterfaceCode(
      options.interfaceName,
      objectInfo.properties,
      options,
    );

    // Determine file path for the interface
    const interfaceFilePath = this.calculateInterfaceFilePath(
      document.fileName,
      options.interfaceName,
    );

    this.logger.info('Interface extracted', {
      interfaceName: options.interfaceName,
      propertyCount: objectInfo.properties.length,
    });

    return {
      interfaceName: options.interfaceName,
      properties: objectInfo.properties,
      interfaceCode,
      filePath: interfaceFilePath,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses an object literal to extract property information
   */
  private parseObjectLiteral(
    code: string,
    options: InterfaceExtractionOptions,
  ): { properties: PropertyTypeInfo[] } | null {
    const trimmedCode = code.trim();

    // Match object literal: { ... }
    const objectMatch = trimmedCode.match(/^\{([^}]*)\}$/s);
    if (!objectMatch) {
      return null;
    }

    const properties: PropertyTypeInfo[] = [];
    const propertiesStr = objectMatch[1] ?? '';

    // Split properties by comma, handling nested objects
    const propList = this.smartSplitProperties(propertiesStr);

    for (const prop of propList) {
      const propertyInfo = this.parseProperty(prop, options);
      if (propertyInfo) {
        properties.push(propertyInfo);
      }
    }

    return { properties };
  }

  /**
   * Parses a single property from an object literal
   */
  private parseProperty(
    prop: string,
    options: InterfaceExtractionOptions,
  ): PropertyTypeInfo | null {
    const trimmed = prop.trim();

    // Skip if empty
    if (!trimmed) {
      return null;
    }

    // Match: key: value, or key?: value, or 'key': value, or "key": value
    const quotedKeyMatch = trimmed.match(/^(['"`])(\w+)\1\s*:\s*(.+)$/);
    const shorthandMatch = trimmed.match(/^(\w+)$/);
    const computedMatch = trimmed.match(/^\[\s*(.+)\s*\]\s*:\s*(.+)$/);
    const regularMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);

    let name: string;
    let value: string;

    if (quotedKeyMatch) {
      name = quotedKeyMatch[2] ?? '';
      value = quotedKeyMatch[3] ?? '';
    } else if (shorthandMatch) {
      // Shorthand property { name } -> type is any or inferred
      name = shorthandMatch[1] ?? '';
      value = 'undefined';
    } else if (computedMatch) {
      // Computed property - skip
      return null;
    } else if (regularMatch) {
      name = regularMatch[1] ?? '';
      value = regularMatch[2] ?? '';
    } else {
      return null;
    }

    // Infer type from value
    const typeName = this.inferType(value, options);

    // Check if optional (undefined value or has ?)
    const isRequired =
      !options.detectOptional ||
      (!trimmed.includes('?') && value !== 'undefined' && !value.includes('void'));

    // Check if readonly
    const isReadonly = options.includeReadonly && trimmed.startsWith('readonly ');

    // Check nullable
    const isNullable = value === 'null' || (options.treatNullAsOptional && value.includes('null'));

    // Extract default value if present
    let defaultValue: string | undefined;
    if (trimmed.includes('=')) {
      const defaultMatch = trimmed.match(/\=\s*(.+)$/);
      if (defaultMatch && defaultMatch[1]) {
        defaultValue = defaultMatch[1].trim();
      }
    }

    const propertyInfo: PropertyTypeInfo = {
      name,
      typeName,
      isRequired,
      isReadonly,
      isNullable,
      hasDefault: defaultValue !== undefined,
    };

    // Only add defaultValue if it exists (to satisfy exactOptionalPropertyTypes)
    if (defaultValue !== undefined) {
      propertyInfo.defaultValue = defaultValue;
    }

    return propertyInfo;
  }

  /**
   * Infers TypeScript type from a value
   */
  private inferType(value: string, options: InterfaceExtractionOptions): string {
    const trimmed = value.trim();

    // Handle null/undefined
    if (trimmed === 'null') return 'null';
    if (trimmed === 'undefined') return 'undefined';

    // Handle primitives
    if (trimmed === 'true' || trimmed === 'false') return 'boolean';
    if (/^\d+$/.test(trimmed)) return 'number';
    if (/^\d+\.\d+$/.test(trimmed)) return 'number';
    if (/^['"`]/.test(trimmed)) return 'string';

    // Handle arrays
    if (trimmed.startsWith('[')) {
      // Try to infer array element type
      const arrayContent = trimmed.slice(1, -1).trim();
      if (!arrayContent) return 'any[]';

      // Sample first element to infer type
      const firstElement = this.smartSplitProperties(arrayContent)[0];
      if (firstElement) {
        const elementType = this.inferType(firstElement, options);
        return `${elementType}[]`;
      }
      return 'any[]';
    }

    // Handle objects (nested)
    if (trimmed.startsWith('{')) {
      return 'object';
    }

    // Handle functions
    if (trimmed.includes('=>') || trimmed.includes('function')) {
      return 'Function';
    }

    // Handle class instances (starts with uppercase)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
      return trimmed;
    }

    // Handle specific TypeScript types
    if (/^(string|number|boolean|any|unknown|never|void|object|symbol|bigint)$/.test(trimmed)) {
      return trimmed;
    }

    // Handle generic types
    if (trimmed.includes('<') && trimmed.includes('>')) {
      return trimmed;
    }

    // Handle union types
    if (trimmed.includes('|')) {
      return trimmed;
    }

    // Handle array type syntax
    if (trimmed.endsWith('[]')) {
      return trimmed;
    }

    // Default to any or unknown
    return options.useExplicitAny ? 'any' : 'unknown';
  }

  /**
   * Splits properties by comma, handling nested objects/arrays
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
        if (char === '(' || char === '{' || char === '[') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']') {
          depth--;
        }
      }

      if (char === ',' && depth === 0 && !inString && !inTemplate) {
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
   * Generates TypeScript interface code
   */
  private generateInterfaceCode(
    interfaceName: string,
    properties: PropertyTypeInfo[],
    options: InterfaceExtractionOptions,
  ): string {
    let code = '';

    // Add export keyword if needed
    if (options.exportInterface) {
      code += 'export ';
    }

    code += `interface ${interfaceName} {\n`;

    for (const prop of properties) {
      // Add JSDoc comment if enabled and description exists
      if (options.includeJSDoc && prop.description) {
        code += `  /**\n   * ${prop.description}\n   */\n`;
      }

      // Add readonly modifier if needed
      const readonly = options.includeReadonly && prop.isReadonly ? 'readonly ' : '';

      // Add optional marker
      const optional = prop.isRequired ? '' : '?';

      // Build the property line
      let propertyLine = `  ${readonly}${prop.name}${optional}: ${prop.typeName}`;

      // Add nullable annotation
      if (prop.isNullable) {
        propertyLine += ' | null';
      }

      propertyLine += ';';

      // Add default value comment if present
      if (prop.hasDefault && prop.defaultValue) {
        propertyLine += ` // = ${prop.defaultValue}`;
      }

      code += propertyLine + '\n';
    }

    code += '}';

    return code;
  }

  /**
   * Calculates the file path for the generated interface
   */
  private calculateInterfaceFilePath(sourceFilePath: string, _interfaceName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension from source file
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Create interface file name
    const interfaceFileName = `${baseName}.interfaces.ts`;

    return path.join(sourceDir, interfaceFileName);
  }

  /**
   * Creates the interface file at the specified path
   */
  public async createInterfaceFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write interface file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Interface file created', { filePath });
  }

  /**
   * Checks if an interface file already exists
   */
  public async interfaceFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends interface to existing file
   */
  public async appendInterfaceToFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const existingContent = await vscode.workspace.fs.readFile(uri);
    const existingText = Buffer.from(existingContent).toString('utf-8');

    const updatedText = existingText + '\n\n' + code;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(updatedText, 'utf-8'));
    this.logger.info('Interface appended to file', { filePath });
  }

  /**
   * Gets extraction options from user
   */
  public async getExtractionOptions(
    defaultInterfaceName?: string,
  ): Promise<InterfaceExtractionOptions | undefined> {
    // Ask for interface name
    const interfaceName = await vscode.window.showInputBox({
      prompt: 'Enter interface name',
      placeHolder: 'MyInterface',
      value: defaultInterfaceName || 'MyInterface',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Interface name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Interface name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!interfaceName) {
      return undefined;
    }

    // Ask for options
    const includeReadonly = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include readonly modifiers', value: true },
        { label: 'No', description: 'Do not include readonly modifiers', value: false },
      ],
      {
        placeHolder: 'Include readonly modifiers?',
      },
    );

    if (!includeReadonly) {
      return undefined;
    }

    const includeJSDoc = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include JSDoc comments', value: true },
        { label: 'No', description: 'Do not include JSDoc comments', value: false },
      ],
      {
        placeHolder: 'Include JSDoc comments?',
      },
    );

    if (!includeJSDoc) {
      return undefined;
    }

    const exportInterface = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Export the interface', value: true },
        { label: 'No', description: 'Keep interface local', value: false },
      ],
      {
        placeHolder: 'Export the interface?',
      },
    );

    if (!exportInterface) {
      return undefined;
    }

    return {
      interfaceName: interfaceName.trim(),
      includeReadonly: includeReadonly.value,
      includeJSDoc: includeJSDoc.value,
      exportInterface: exportInterface.value,
      inferTypesFromValues: true,
      detectOptional: true,
      treatNullAsOptional: true,
      useExplicitAny: false,
    };
  }

  /**
   * Shows interface preview and gets user confirmation
   */
  public async showInterfacePreview(result: InterfaceExtractionResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.interfaceCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new interface file', value: 'create' },
        {
          label: 'Append to Existing',
          description: 'Append to existing interface file',
          value: 'append',
        },
        {
          label: 'Copy to Clipboard',
          description: 'Copy interface code to clipboard',
          value: 'copy',
        },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this interface?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.interfaceCode);
      vscode.window.showInformationMessage('Interface code copied to clipboard!');
      return false;
    }

    return true;
  }
}
