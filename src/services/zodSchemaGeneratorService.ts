import * as path from 'path';
import * as vscode from 'vscode';

import type {
  ZodSchemaGenerationOptions,
  ZodSchemaGenerationResult,
  ZodSchemaProperty,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type { ZodSchemaProperty, ZodSchemaGenerationResult, ZodSchemaGenerationOptions };

/**
 * Service for generating Zod validation schemas from TypeScript interfaces
 */
export class ZodSchemaGeneratorService {
  private static instance: ZodSchemaGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ZodSchemaGeneratorService {
    ZodSchemaGeneratorService.instance ??= new ZodSchemaGeneratorService();
    return ZodSchemaGeneratorService.instance;
  }

  /**
   * Main entry point: Generates Zod schema from selected TypeScript interface
   */
  public async generateZodSchemaFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ZodSchemaGenerationOptions,
  ): Promise<ZodSchemaGenerationResult> {
    const selectedText = document.getText(selection);

    // Parse the interface
    const interfaceInfo = this.parseInterface(selectedText, options);

    if (!interfaceInfo || interfaceInfo.properties.length === 0) {
      throw new Error(
        'Could not parse interface from selection. Please select a valid TypeScript interface.',
      );
    }

    // Generate the Zod schema code
    const schemaCode = this.generateZodSchemaCode(
      options.schemaName,
      interfaceInfo.properties,
      options,
    );

    // Determine file path for the schema
    const schemaFilePath = this.calculateSchemaFilePath(document.fileName, options.schemaName);

    this.logger.info('Zod schema generated', {
      schemaName: options.schemaName,
      propertyCount: interfaceInfo.properties.length,
    });

    return {
      schemaName: options.schemaName,
      properties: interfaceInfo.properties,
      schemaCode,
      filePath: schemaFilePath,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a TypeScript interface to extract property information
   */
  private parseInterface(
    code: string,
    options: ZodSchemaGenerationOptions,
  ): { properties: ZodSchemaProperty[] } | null {
    const trimmedCode = code.trim();

    // Match interface declaration: interface Name { ... }
    const interfaceMatch = trimmedCode.match(/interface\s+(\w+)\s*\{([^}]*)\}/s);
    if (!interfaceMatch) {
      // Try to match just the properties part { ... }
      const propertiesMatch = trimmedCode.match(/^\{([^}]*)\}$/s);
      if (!propertiesMatch) {
        return null;
      }
      return this.parsePropertiesBlock(propertiesMatch[1] ?? '', options);
    }

    // Extract interface name (unused but extracted for potential future use)
    void (interfaceMatch[1] ?? '');
    const propertiesBlock = interfaceMatch[2] ?? '';

    return this.parsePropertiesBlock(propertiesBlock, options);
  }

  /**
   * Parses properties block to extract property information
   */
  private parsePropertiesBlock(
    propertiesStr: string,
    options: ZodSchemaGenerationOptions,
  ): { properties: ZodSchemaProperty[] } | null {
    const properties: ZodSchemaProperty[] = [];

    // Split properties by semicolon, handling nested objects
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
   * Parses a single property from an interface
   */
  private parseProperty(
    _prop: string,
    _options: ZodSchemaGenerationOptions,
  ): ZodSchemaProperty | null {
    const trimmed = _prop.trim();

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

    // Check for default value
    let defaultValue: string | undefined;
    const defaultMatch = propWithoutComment.match(/=\s*([^,;]+)[,;]?$/);
    if (defaultMatch && defaultMatch[1]) {
      defaultValue = defaultMatch[1].trim();
    }

    const propertyInfo: ZodSchemaProperty = {
      name,
      tsType: typeExpression,
      isRequired: !isOptional,
      isReadonly,
      isNullable: typeExpression.includes('null') || typeExpression.includes('undefined'),
      hasDefault: defaultValue !== undefined,
    };

    // Only add description if it's defined (to satisfy exactOptionalPropertyTypes)
    if (description !== undefined) {
      propertyInfo.description = description;
    }

    if (defaultValue !== undefined) {
      propertyInfo.defaultValue = defaultValue;
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
   * Converts TypeScript type to Zod schema type
   */
  private tsTypeToZodType(tsType: string, options: ZodSchemaGenerationOptions): string {
    const cleanedType = tsType.trim();

    // Remove null/undefined from type for processing (they're handled separately in schema generation)
    let baseType = cleanedType
      .replace(/\s*\|\s*null/g, '')
      .replace(/\s*\|\s*undefined/g, '')
      .replace(/null\|\s*/g, '')
      .replace(/undefined\|\s*/g, '')
      .trim();

    // Handle union types (excluding null/undefined)
    if (baseType.includes('|') && !this.isSimpleUnion(baseType)) {
      const unionTypes = baseType.split('|').map((t) => t.trim());
      const zodUnion = unionTypes.map((t) => this.tsTypeToZodType(t, options)).join(', ');
      return `z.union([${zodUnion}])`;
    }

    // Handle simple types
    switch (baseType) {
      case 'string':
        return 'z.string()';
      case 'number':
        return 'z.number()';
      case 'boolean':
        return 'z.boolean()';
      case 'any':
        return 'z.any()';
      case 'unknown':
        return 'z.unknown()';
      case 'never':
        return 'z.never()';
      case 'void':
        return 'z.void()';
      case 'Date':
        return options.useDateCoerce ? 'z.coerce.date()' : 'z.date()';
      case 'object':
        return 'z.object({})';
      case 'bigint':
        return 'z.bigint()';
      case 'symbol':
        return 'z.symbol()';
    }

    // Handle arrays: Type[] or Array<Type>
    const arrayMatch = baseType.match(/^(.+?)\[\]$/);
    if (arrayMatch) {
      const elementType = this.tsTypeToZodType(arrayMatch[1] ?? 'any', options);
      return `${elementType}.array()`;
    }

    const arrayGenericMatch = baseType.match(/^Array<(.+)>$/);
    if (arrayGenericMatch) {
      const elementType = this.tsTypeToZodType(arrayGenericMatch[1] ?? 'any', options);
      return `${elementType}.array()`;
    }

    // Handle tuples: [Type1, Type2]
    if (baseType.startsWith('[') && baseType.endsWith(']')) {
      const tupleTypes = baseType
        .slice(1, -1)
        .split(',')
        .map((t) => this.tsTypeToZodType(t.trim(), options));
      return `z.tuple([${tupleTypes.join(', ')}])`;
    }

    // Handle Records/Maps: Record<string, Type>
    const recordMatch = baseType.match(/^Record<(.+),\s*(.+)>$/);
    if (recordMatch) {
      const valueType = this.tsTypeToZodType(recordMatch[2] ?? 'any', options);
      return `z.record(${valueType})`;
    }

    // Handle Promise: Promise<Type>
    const promiseMatch = baseType.match(/^Promise<(.+)>$/);
    if (promiseMatch) {
      const returnType = this.tsTypeToZodType(promiseMatch[1] ?? 'any', options);
      return `z.promise(${returnType})`;
    }

    // Handle literals
    if (baseType.startsWith("'") || baseType.startsWith('"')) {
      return `z.literal(${baseType})`;
    }

    // Handle enums (capitalized words typically)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(baseType)) {
      if (options.importZod) {
        return `z.nativeEnum(${baseType})`;
      }
      return `z.any()`; // Fallback for enums without import
    }

    // Default: treat as custom zod schema or interface reference
    return `z.any()`;
  }

  /**
   * Checks if a union type is simple (literals only)
   */
  private isSimpleUnion(type: string): boolean {
    const cleaned = type.replace(/\s*\|\s*null/g, '').replace(/\s*\|\s*undefined/g, '');
    const parts = cleaned.split('|').map((t) => t.trim());
    return parts.every((p) => p.startsWith("'") || p.startsWith('"'));
  }

  /**
   * Generates Zod schema code
   */
  private generateZodSchemaCode(
    schemaName: string,
    properties: ZodSchemaProperty[],
    options: ZodSchemaGenerationOptions,
  ): string {
    let code = '';

    // Add import statement if enabled
    if (options.importZod) {
      code += `import { z } from 'zod';\n\n`;
    }

    // Add JSDoc for the schema
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Zod schema for ${schemaName}\n`;
      code += ` * Generated from TypeScript interface\n`;
      code += ` */\n`;
    }

    // Generate schema name
    const exportKeyword = options.exportSchema ? 'export ' : '';
    const constKeyword = options.useConst ? 'const' : 'export';
    code += `${exportKeyword}${constKeyword} ${schemaName}Schema = z.object({\n`;

    // Generate properties
    for (const prop of properties) {
      // Add description as error message if enabled
      if (options.includeErrorMessages && prop.description) {
        code += `  /**\n   * ${prop.description}\n   */\n`;
      }

      const zodType = this.tsTypeToZodType(prop.tsType, options);

      // Build property line
      let propertyLine = `  ${prop.name}: ${zodType}`;

      // Handle optional
      if (!prop.isRequired) {
        propertyLine += '.optional()';
      }

      // Handle nullable
      if (prop.isNullable) {
        propertyLine += '.nullable()';
      }

      // Handle default value
      if (prop.hasDefault && prop.defaultValue !== undefined) {
        propertyLine += `.default(${this.formatDefaultValue(prop.defaultValue)})`;
      }

      // Add custom error message if enabled
      if (options.includeErrorMessages) {
        const errorMsg = prop.description || prop.name;
        propertyLine += `;\n`;
        // Add refinement for custom error message
        if (options.includeRefinements) {
          propertyLine = propertyLine.slice(0, -1); // Remove semicolon
          propertyLine += `.refine((val) => val !== undefined && val !== null, {\n`;
          propertyLine += `    message: '${errorMsg} is required',\n`;
          propertyLine += `  })`;
        }
      }

      propertyLine += ',';

      // Add readonly comment if needed
      if (prop.isReadonly) {
        propertyLine += ' // readonly';
      }

      code += propertyLine + '\n';
    }

    code += '});\n';

    // Generate inferred type if enabled
    if (options.generateInferredType) {
      code += `\nexport type ${schemaName} = z.infer<typeof ${schemaName}Schema>;\n`;
    }

    // Add input/output types if enabled
    if (options.generateInputOutputTypes) {
      code += `\nexport type ${schemaName}Input = z.ZodInput<typeof ${schemaName}Schema>;\n`;
      code += `export type ${schemaName}Output = z.ZodOutput<typeof ${schemaName}Schema>;\n`;
    }

    return code;
  }

  /**
   * Formats default value for Zod schema
   */
  private formatDefaultValue(value: string): string {
    const trimmed = value.trim();

    // Handle strings
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      return trimmed;
    }

    // Handle numbers
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return trimmed;
    }

    // Handle booleans
    if (trimmed === 'true' || trimmed === 'false') {
      return trimmed;
    }

    // Handle arrays
    if (trimmed.startsWith('[')) {
      return trimmed;
    }

    // Handle objects
    if (trimmed.startsWith('{')) {
      return trimmed;
    }

    // Handle undefined/null
    if (trimmed === 'undefined') {
      return 'undefined';
    }

    if (trimmed === 'null') {
      return 'null';
    }

    // Default: treat as identifier
    return trimmed;
  }

  /**
   * Calculates the file path for the generated schema
   */
  private calculateSchemaFilePath(sourceFilePath: string, _schemaName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension from source file
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Create schema file name
    const schemaFileName = `${baseName}.schema.ts`;

    return path.join(sourceDir, schemaFileName);
  }

  /**
   * Creates the schema file at the specified path
   */
  public async createSchemaFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write schema file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Zod schema file created', { filePath });
  }

  /**
   * Checks if a schema file already exists
   */
  public async schemaFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends schema to existing file
   */
  public async appendSchemaToFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const existingContent = await vscode.workspace.fs.readFile(uri);
    const existingText = Buffer.from(existingContent).toString('utf-8');

    const updatedText = existingText + '\n\n' + code;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(updatedText, 'utf-8'));
    this.logger.info('Zod schema appended to file', { filePath });
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultSchemaName?: string,
  ): Promise<ZodSchemaGenerationOptions | undefined> {
    // Ask for schema name
    const schemaName = await vscode.window.showInputBox({
      prompt: 'Enter Zod schema name',
      placeHolder: 'MySchema',
      value: defaultSchemaName || 'MySchema',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Schema name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Schema name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!schemaName) {
      return undefined;
    }

    // Ask for export option
    const exportSchema = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Export the schema', value: true },
        { label: 'No', description: 'Keep schema local', value: false },
      ],
      {
        placeHolder: 'Export the schema?',
      },
    );

    if (!exportSchema) {
      return undefined;
    }

    const includeErrorMessages = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include custom error messages', value: true },
        { label: 'No', description: 'Use default error messages', value: false },
      ],
      {
        placeHolder: 'Include custom error messages?',
      },
    );

    if (!includeErrorMessages) {
      return undefined;
    }

    const includeRefinements = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include validation refinements', value: true },
        { label: 'No', description: 'Skip refinements', value: false },
      ],
      {
        placeHolder: 'Include validation refinements?',
      },
    );

    if (!includeRefinements) {
      return undefined;
    }

    return {
      schemaName: schemaName.trim(),
      exportSchema: exportSchema.value,
      includeJSDoc: true,
      includeErrorMessages: includeErrorMessages.value,
      includeRefinements: includeRefinements.value,
      generateInferredType: true,
      generateInputOutputTypes: false,
      importZod: true,
      useConst: true,
      useDateCoerce: true,
    };
  }

  /**
   * Shows schema preview and gets user confirmation
   */
  public async showSchemaPreview(result: ZodSchemaGenerationResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.schemaCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new schema file', value: 'create' },
        {
          label: 'Append to Existing',
          description: 'Append to existing schema file',
          value: 'append',
        },
        { label: 'Copy to Clipboard', description: 'Copy schema code to clipboard', value: 'copy' },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this schema?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.schemaCode);
      vscode.window.showInformationMessage('Zod schema code copied to clipboard!');
      return false;
    }

    return true;
  }
}
