import * as path from 'path';
import * as vscode from 'vscode';

import type {
  EnumCreatorOptions,
  EnumCreatorResult,
  StringLiteralUnion,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type { EnumCreatorOptions, EnumCreatorResult, StringLiteralUnion };

/**
 * Service for creating TypeScript enums from string literal unions
 * with bidirectional mappings and validation utilities
 */
export class EnumCreatorService {
  private static instance: EnumCreatorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): EnumCreatorService {
    EnumCreatorService.instance ??= new EnumCreatorService();
    return EnumCreatorService.instance;
  }

  /**
   * Main entry point: Generates enum from selected string literal union
   */
  public async generateEnumFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: EnumCreatorOptions,
  ): Promise<EnumCreatorResult> {
    const selectedText = document.getText(selection);

    // Parse the string literal union
    const unionInfo = this.parseStringLiteralUnion(selectedText);

    if (!unionInfo || unionInfo.values.length === 0) {
      throw new Error(
        'Could not parse string literal union from selection. Please select a valid string literal union type (e.g., type Status = "pending" | "approved" | "rejected").',
      );
    }

    // Generate the enum code
    const enumCode = this.generateEnumCode(unionInfo, options);

    // Generate additional utilities if requested
    let validationCode: string | undefined;
    let reverseMappingCode: string | undefined;
    let typeGuardCode: string | undefined;

    if (options.includeValidationUtils) {
      validationCode = this.generateValidationUtils(unionInfo, options);
    }

    if (options.includeReverseMapping) {
      reverseMappingCode = this.generateReverseMapping(unionInfo, options);
    }

    if (options.includeTypeGuards) {
      typeGuardCode = this.generateTypeGuards(unionInfo, options);
    }

    // Determine file path for the enum
    const enumFilePath = this.calculateEnumFilePath(document.fileName, options.enumName);

    this.logger.info('Enum generated', {
      enumName: options.enumName,
      valueCount: unionInfo.values.length,
    });

    return {
      enumName: options.enumName,
      enumCode,
      validationCode,
      reverseMappingCode,
      typeGuardCode,
      filePath: enumFilePath,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a string literal union type
   */
  private parseStringLiteralUnion(code: string): StringLiteralUnion | null {
    const trimmedCode = code.trim();

    // Match type alias with string literal union: type Name = 'a' | 'b' | 'c'
    const typeAliasMatch = trimmedCode.match(
      /type\s+(\w+)\s*=\s*(['"`](?:[^'"`\\]|\\.)*['"`](?:\s*\|\s*['"`](?:[^'"`\\]|\\.)*['"`])*)/,
    );

    if (typeAliasMatch) {
      const typeName = typeAliasMatch[1] ?? '';
      const unionPart = typeAliasMatch[2] ?? '';
      const values = this.extractStringLiterals(unionPart);

      return { typeName, values };
    }

    // Try to match just the union part: 'a' | 'b' | 'c'
    const unionMatch = trimmedCode.match(
      /^(['"`](?:[^'"`\\]|\\.)*['"`](?:\s*\|\s*['"`](?:[^'"`\\]|\\.)*['"`])*)$/,
    );

    if (unionMatch) {
      const unionPart = unionMatch[1] ?? '';
      const values = this.extractStringLiterals(unionPart);

      return { typeName: '', values };
    }

    return null;
  }

  /**
   * Extracts string literal values from a union expression
   */
  private extractStringLiterals(unionStr: string): string[] {
    // Split by pipe, handling edge cases
    const literals: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < unionStr.length; i++) {
      const char = unionStr[i];

      if (!inString) {
        if (char === "'" || char === '"' || char === '`') {
          inString = true;
          stringChar = char;
          current += char;
        } else if (!char.trim() && char !== '|') {
          // Skip whitespace
          continue;
        } else if (char === '|') {
          // Skip pipe
          continue;
        }
      } else {
        current += char;
        if (char === stringChar && (i === 0 || unionStr[i - 1] !== '\\')) {
          inString = false;
          literals.push(current);
          current = '';
        }
      }
    }

    if (current) {
      literals.push(current);
    }

    return literals;
  }

  /**
   * Generates enum code from string literal union
   */
  private generateEnumCode(union: StringLiteralUnion, options: EnumCreatorOptions): string {
    let code = '';

    // Add JSDoc for the enum
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Enum for ${union.typeName || options.enumName}\n`;
      code += ` * Generated from string literal union\n`;
      code += ` */\n`;
    }

    // Generate enum or const object
    const exportKeyword = options.exportEnum ? 'export ' : '';
    const values = union.values.map((v) => this.formatEnumValue(v));

    if (options.useStringLiteral) {
      // Generate as const object (modern approach)
      code += `${exportKeyword}const ${options.enumName} = {\n`;
      for (const value of values) {
        const key = this.toPascalCase(value);
        code += `  ${key}: ${value},\n`;
      }
      code += `} as const;\n`;

      // Generate type from const object
      code += `\n${exportKeyword}type ${options.enumName}Value = typeof ${options.enumName}[keyof typeof ${options.enumName}];\n`;
    } else {
      // Generate traditional enum
      code += `${exportKeyword}enum ${options.enumName} {\n`;
      for (const value of values) {
        const key = this.toPascalCase(value);
        code += `  ${key} = ${value},\n`;
      }
      code += `}\n`;
    }

    return code;
  }

  /**
   * Generates validation utilities
   */
  private generateValidationUtils(union: StringLiteralUnion, options: EnumCreatorOptions): string {
    let code = '\n';

    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Validation utilities for ${options.enumName}\n`;
      code += ` */\n`;
    }

    const values = union.values.map((v) => this.formatEnumValue(v));
    const valueArray = `[${values.join(', ')}]`;

    // Generate isValid function
    code += `\nexport const ${options.enumName}Values = ${valueArray} as const;\n\n`;
    code += `export function isValid${options.enumName}(value: string): value is ${options.enumName}Value {\n`;
    code += `  return ${options.enumName}Values.includes(value as any);\n`;
    code += `}\n`;

    // Generate validate function that throws
    code += `\nexport function validate${options.enumName}(value: string): ${options.enumName}Value {\n`;
    code += `  if (!isValid${options.enumName}(value)) {\n`;
    code += `    throw new Error(\`Invalid ${options.enumName} value: \${value}. Expected one of: \${${options.enumName}Values.join(', ')}\`);\n`;
    code += `  }\n`;
    code += `  return value;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates reverse mapping utilities
   */
  private generateReverseMapping(union: StringLiteralUnion, options: EnumCreatorOptions): string {
    let code = '\n';

    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Reverse mapping utilities for ${options.enumName}\n`;
      code += ` */\n`;
    }

    const values = union.values.map((v) => this.formatEnumValue(v));

    // Generate key-to-value and value-to-key mappings
    code += `\nexport const ${options.enumName}KeyToValue: Record<string, ${options.enumName}Value> = {\n`;
    for (const value of values) {
      const key = this.toPascalCase(value);
      code += `  ${key}: ${options.enumName}.${key},\n`;
    }
    code += `};\n\n`;

    code += `export const ${options.enumName}ValueToKey: Record<${options.enumName}Value, string> = {\n`;
    for (const value of values) {
      const key = this.toPascalCase(value);
      code += `  [${options.enumName}.${key}]: '${key}',\n`;
    }
    code += `};\n`;

    // Generate helper functions
    code += `\nexport function get${options.enumName}Key(value: ${options.enumName}Value): string {\n`;
    code += `  return ${options.enumName}ValueToKey[value];\n`;
    code += `}\n`;

    code += `\nexport function get${options.enumName}Value(key: string): ${options.enumName}Value | undefined {\n`;
    code += `  return ${options.enumName}KeyToValue[key];\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates type guards
   */
  private generateTypeGuards(union: StringLiteralUnion, options: EnumCreatorOptions): string {
    let code = '\n';

    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Type guards for ${options.enumName}\n`;
      code += ` */\n`;
    }

    const values = union.values.map((v) => this.formatEnumValue(v));

    // Generate individual type guards for each value
    for (const value of values) {
      const key = this.toPascalCase(value);
      const guardName = `is${options.enumName}${key}`;

      code += `\nexport function ${guardName}(value: ${options.enumName}Value): value is ${options.enumName}Value {\n`;
      code += `  return value === ${options.enumName}.${key};\n`;
      code += `}\n`;
    }

    // Generate switch-case type guard
    code += `\nexport function get${options.enumName}Type<T extends ${options.enumName}Value>(\n`;
    code += `  value: ${options.enumName}Value,\n`;
    code += `  cases: { [K in ${options.enumName}Value]?: () => T },\n`;
    code += `  defaultCase?: () => T\n`;
    code += `): T {\n`;
    code += `  const handler = cases[value] || defaultCase;\n`;
    code += `  if (!handler) {\n`;
    code += `    throw new Error(\`No handler defined for ${options.enumName} value: \${value}\`);\n`;
    code += `  }\n`;
    code += `  return handler();\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Formats a string literal value
   */
  private formatEnumValue(value: string): string {
    const trimmed = value.trim();

    // If already quoted, return as-is
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('`') && trimmed.endsWith('`'))
    ) {
      return trimmed;
    }

    // Default to single quotes
    return `'${trimmed}'`;
  }

  /**
   * Converts a string value to PascalCase for enum keys
   */
  private toPascalCase(value: string): string {
    // Remove quotes
    const unquoted = value.replace(/^['"`]|['"`]$/g, '');

    // Split by common separators and spaces
    const words = unquoted
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    // Convert to PascalCase
    return words
      .map((word) => {
        // Handle special cases like kebab-case, snake_case, etc.
        if (word.toUpperCase() === word && word.length > 1) {
          // All caps acronym - keep as is
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * Calculates the file path for the generated enum
   */
  private calculateEnumFilePath(sourceFilePath: string, enumName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension from source file
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Create enum file name
    const enumFileName = `${baseName}.enum.ts`;

    return path.join(sourceDir, enumFileName);
  }

  /**
   * Creates the enum file at the specified path
   */
  public async createEnumFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write enum file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Enum file created', { filePath });
  }

  /**
   * Checks if an enum file already exists
   */
  public async enumFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultEnumName?: string,
  ): Promise<EnumCreatorOptions | undefined> {
    // Ask for enum name
    const enumName = await vscode.window.showInputBox({
      prompt: 'Enter enum name',
      placeHolder: 'Status',
      value: defaultEnumName || 'Status',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Enum name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Enum name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!enumName) {
      return undefined;
    }

    // Ask for enum type (traditional vs const assertion)
    const enumType = await vscode.window.showQuickPick(
      [
        {
          label: 'Traditional Enum',
          description: 'Generate a traditional TypeScript enum',
          value: false,
        },
        {
          label: 'Const Object (as const)',
          description: 'Generate a const object with as const assertion (modern approach)',
          value: true,
        },
      ],
      {
        placeHolder: 'Select enum type',
      },
    );

    if (!enumType) {
      return undefined;
    }

    // Ask for validation utilities
    const includeValidationUtils = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include validation functions', value: true },
        { label: 'No', description: 'Skip validation utilities', value: false },
      ],
      {
        placeHolder: 'Include validation utilities?',
      },
    );

    if (!includeValidationUtils) {
      return undefined;
    }

    // Ask for reverse mapping
    const includeReverseMapping = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include bidirectional mapping utilities', value: true },
        { label: 'No', description: 'Skip reverse mapping', value: false },
      ],
      {
        placeHolder: 'Include reverse mapping utilities?',
      },
    );

    if (!includeReverseMapping) {
      return undefined;
    }

    // Ask for type guards
    const includeTypeGuards = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include type guard functions', value: true },
        { label: 'No', description: 'Skip type guards', value: false },
      ],
      {
        placeHolder: 'Include type guard utilities?',
      },
    );

    if (!includeTypeGuards) {
      return undefined;
    }

    return {
      enumName: enumName.trim(),
      includeValidationUtils: includeValidationUtils.value,
      includeReverseMapping: includeReverseMapping.value,
      includeTypeGuards: includeTypeGuards.value,
      useStringLiteral: enumType.value,
      exportEnum: true,
      includeJSDoc: true,
    };
  }

  /**
   * Shows enum preview and gets user confirmation
   */
  public async showEnumPreview(result: EnumCreatorResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.enumCode +
        (result.validationCode || '') +
        (result.reverseMappingCode || '') +
        (result.typeGuardCode || ''),
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new enum file', value: 'create' },
        {
          label: 'Copy to Clipboard',
          description: 'Copy enum code to clipboard',
          value: 'copy',
        },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this enum?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      const fullCode =
        result.enumCode +
        (result.validationCode || '') +
        (result.reverseMappingCode || '') +
        (result.typeGuardCode || '');
      await vscode.env.clipboard.writeText(fullCode);
      vscode.window.showInformationMessage('Enum code copied to clipboard!');
      return false;
    }

    return true;
  }
}
