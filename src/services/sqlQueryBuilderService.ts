import * as path from 'path';
import * as vscode from 'vscode';

import type {
  SQLQueryBuilderGenerationOptions,
  SQLQueryBuilderGenerationResult,
  SQLQueryField,
  SQLQueryJoin,
  SQLQueryOptions,
  SQLQueryWhere,
  GeneratedSQLQueries,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type {
  SQLQueryField,
  SQLQueryJoin,
  SQLQueryOptions,
  SQLQueryWhere,
  GeneratedSQLQueries,
  SQLQueryBuilderGenerationOptions,
  SQLQueryBuilderGenerationResult,
};

/**
 * Service for building SQL queries from TypeScript interfaces with type safety
 * Generates SELECT, INSERT, UPDATE, DELETE queries with proper parameterization and join support
 */
export class SQLQueryBuilderService {
  private static instance: SQLQueryBuilderService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SQLQueryBuilderService {
    SQLQueryBuilderService.instance ??= new SQLQueryBuilderService();
    return SQLQueryBuilderService.instance;
  }

  /**
   * Main entry point: Generates SQL queries from selected TypeScript interface
   */
  public async generateSQLQueriesFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: SQLQueryBuilderGenerationOptions,
  ): Promise<SQLQueryBuilderGenerationResult> {
    const selectedText = document.getText(selection);

    // Parse the interface
    const interfaceInfo = this.parseInterface(selectedText, options);

    if (!interfaceInfo || interfaceInfo.fields.length === 0) {
      throw new Error(
        'Could not parse interface from selection. Please select a valid TypeScript interface.',
      );
    }

    // Generate the SQL queries
    const queries = this.generateQueries(
      options.tableName,
      interfaceInfo.fields,
      options,
    );

    // Generate the code
    const queriesCode = this.generateQueriesCode(
      options.interfaceName,
      queries,
      options,
    );

    // Determine file path
    const queriesFilePath = this.calculateQueriesFilePath(document.fileName, options.tableName);

    this.logger.info('SQL queries generated', {
      tableName: options.tableName,
      fieldCount: interfaceInfo.fields.length,
      dialect: options.dialect,
    });

    return {
      interfaceName: options.interfaceName,
      tableName: options.tableName,
      queries,
      queriesCode,
      filePath: queriesFilePath,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a TypeScript interface to extract field information
   */
  private parseInterface(
    code: string,
    options: SQLQueryBuilderGenerationOptions,
  ): { fields: SQLQueryField[] } | null {
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
   * Parses properties block to extract field information
   */
  private parsePropertiesBlock(
    propertiesStr: string,
    _options: SQLQueryBuilderGenerationOptions,
  ): { fields: SQLQueryField[] } | null {
    const fields: SQLQueryField[] = [];

    // Split properties by semicolon, handling nested objects
    const propList = this.smartSplitProperties(propertiesStr);

    for (const prop of propList) {
      const fieldInfo = this.parseProperty(prop);
      if (fieldInfo) {
        fields.push(fieldInfo);
      }
    }

    return { fields };
  }

  /**
   * Parses a single property from an interface
   */
  private parseProperty(_prop: string): SQLQueryField | null {
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
    let isRequired = true;

    if (readonlyMatch) {
      name = readonlyMatch[1] ?? '';
      typeExpression = readonlyMatch[2] ?? '';
      isRequired = true;
    } else if (optionalMatch) {
      name = optionalMatch[1] ?? '';
      typeExpression = optionalMatch[2] ?? '';
      isRequired = false;
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

    const fieldInfo: SQLQueryField = {
      name,
      type: typeExpression,
      isRequired,
      isNullable: !isRequired,
      isArray: typeExpression.includes('[]') || typeExpression.startsWith('Array'),
    };

    // Only add description if it's defined (to satisfy exactOptionalPropertyTypes)
    if (description !== undefined) {
      fieldInfo.description = description;
    }

    return fieldInfo;
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
   * Generates SQL queries for a table
   */
  private generateQueries(
    tableName: string,
    fields: SQLQueryField[],
    options: SQLQueryBuilderGenerationOptions,
  ): GeneratedSQLQueries {
    const queries: GeneratedSQLQueries = {
      tableName,
      selectQuery: '',
      insertQuery: '',
      updateQuery: '',
      deleteQuery: '',
      fields,
      joins: [],
      whereClauses: [],
      queryOptions: {},
    };

    const columnNames = fields.map((f) => this.toSnakeCase(f.name));
    const paramPlaceholders = this.getParameterPlaceholders(fields.length, options.parameterStyle);

    // Generate SELECT query
    if (options.generateSelect) {
      queries.selectQuery = this.generateSelectQuery(tableName, columnNames, options);
    }

    // Generate INSERT query
    if (options.generateInsert) {
      queries.insertQuery = this.generateInsertQuery(
        tableName,
        columnNames,
        paramPlaceholders,
        options,
      );
    }

    // Generate UPDATE query
    if (options.generateUpdate) {
      queries.updateQuery = this.generateUpdateQuery(
        tableName,
        columnNames,
        options.parameterStyle,
        options,
      );
    }

    // Generate DELETE query
    if (options.generateDelete) {
      queries.deleteQuery = this.generateDeleteQuery(tableName, options);
    }

    // Generate TypeScript types if requested
    if (options.generateTypes) {
      queries.selectQueryType = this.generateSelectType(fields, options.interfaceName);
      queries.insertQueryType = this.generateInsertType(fields, options.interfaceName);
      queries.updateQueryType = this.generateUpdateType(fields, options.interfaceName);
      queries.deleteQueryType = this.generateDeleteType(options.interfaceName);
      queries.parameterTypes = this.generateParameterTypes(fields, options.interfaceName);
    }

    return queries;
  }

  /**
   * Generates SELECT query
   */
  private generateSelectQuery(
    tableName: string,
    columnNames: string[],
    options: SQLQueryBuilderGenerationOptions,
  ): string {
    let query = 'SELECT ';

    if (options.dialect === 'postgresql') {
      query += columnNames.map((c) => `"${c}"`).join(', ');
    } else {
      query += columnNames.join(', ');
    }

    query += ` FROM ${tableName}`;

    if (options.includeJoins) {
      query += '\n  /* Add JOINs here */';
    }

    if (options.includeWhere) {
      query += '\nWHERE /* Add conditions here */';
    }

    query += '\nLIMIT ?;';

    return query;
  }

  /**
   * Generates INSERT query
   */
  private generateInsertQuery(
    tableName: string,
    columnNames: string[],
    placeholders: string[],
    options: SQLQueryBuilderGenerationOptions,
  ): string {
    let query = `INSERT INTO ${tableName} (`;

    if (options.dialect === 'postgresql') {
      query += columnNames.map((c) => `"${c}"`).join(', ');
    } else {
      query += columnNames.join(', ');
    }

    query += ')\nVALUES (';
    query += placeholders.join(', ');
    query += ');';

    return query;
  }

  /**
   * Generates UPDATE query
   */
  private generateUpdateQuery(
    tableName: string,
    columnNames: string[],
    parameterStyle: SQLQueryBuilderGenerationOptions['parameterStyle'],
    options: SQLQueryBuilderGenerationOptions,
  ): string {
    let query = `UPDATE ${tableName}\nSET `;

    const setClauses: string[] = [];
    for (let i = 0; i < columnNames.length; i++) {
      const col = columnNames[i];
      const placeholder = this.getParameterPlaceholder(i + 1, parameterStyle);

      if (options.dialect === 'postgresql') {
        setClauses.push(`"${col}" = ${placeholder}`);
      } else {
        setClauses.push(`${col} = ${placeholder}`);
      }
    }

    query += setClauses.join(',\n    ');
    query += '\nWHERE id = ' + this.getParameterPlaceholder(columnNames.length + 1, parameterStyle) + ';';

    return query;
  }

  /**
   * Generates DELETE query
   */
  private generateDeleteQuery(
    tableName: string,
    options: SQLQueryBuilderGenerationOptions,
  ): string {
    const paramStyle = options.parameterStyle;
    const placeholder = this.getParameterPlaceholder(1, paramStyle);
    return `DELETE FROM ${tableName}\nWHERE id = ${placeholder};`;
  }

  /**
   * Generates parameter placeholders based on style
   */
  private getParameterPlaceholders(
    count: number,
    style: SQLQueryBuilderGenerationOptions['parameterStyle'],
  ): string[] {
    const placeholders: string[] = [];
    for (let i = 0; i < count; i++) {
      placeholders.push(this.getParameterPlaceholder(i + 1, style));
    }
    return placeholders;
  }

  /**
   * Gets a single parameter placeholder
   */
  private getParameterPlaceholder(
    index: number,
    style: SQLQueryBuilderGenerationOptions['parameterStyle'],
  ): string {
    switch (style) {
      case 'positional':
        return '?';
      case 'named':
        return `$${index}`;
      case 'numeric':
        return `$${index}`;
      default:
        return '?';
    }
  }

  /**
   * Generates SELECT return type
   */
  private generateSelectType(fields: SQLQueryField[], interfaceName: string): string {
    const properties = fields
      .map((f) => {
        const optional = !f.isRequired ? '?' : '';
        const nullable = f.isNullable ? ' | null' : '';
        return `  ${f.name}${optional}: ${f.type}${nullable};`;
      })
      .join('\n');

    return `export type ${interfaceName}SelectResult = {\n${properties}\n};`;
  }

  /**
   * Generates INSERT input type
   */
  private generateInsertType(fields: SQLQueryField[], interfaceName: string): string {
    const insertableFields = fields.filter((f) => f.name !== 'id');
    const properties = insertableFields
      .map((f) => {
        const optional = !f.isRequired ? '?' : '';
        return `  ${f.name}${optional}: ${f.type};`;
      })
      .join('\n');

    return `export type ${interfaceName}InsertInput = {\n${properties}\n};`;
  }

  /**
   * Generates UPDATE input type
   */
  private generateUpdateType(fields: SQLQueryField[], interfaceName: string): string {
    const updatableFields = fields.filter((f) => f.name !== 'id');
    const properties = updatableFields
      .map((f) => {
        return `  ${f.name}?: ${f.type};`;
      })
      .join('\n');

    return `export type ${interfaceName}UpdateInput = {\n${properties}\n};`;
  }

  /**
   * Generates DELETE input type
   */
  private generateDeleteType(interfaceName: string): string {
    return `export type ${interfaceName}DeleteInput = {\n  id: string | number;\n};`;
  }

  /**
   * Generates parameter types
   */
  private generateParameterTypes(fields: SQLQueryField[], interfaceName: string): string {
    const params = fields
      .map((f, index) => {
        const paramIndex = index + 1;
        return `  $${paramIndex}: ${f.type};`;
      })
      .join('\n');

    return `export type ${interfaceName}Parameters = {\n${params}\n};`;
  }

  /**
   * Generates the complete queries code
   */
  private generateQueriesCode(
    interfaceName: string,
    queries: GeneratedSQLQueries,
    options: SQLQueryBuilderGenerationOptions,
  ): string {
    let code = '';

    // Add JSDoc for the queries
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * SQL Queries for ${interfaceName}\n`;
      code += ` * Table: ${queries.tableName}\n`;
      code += ` * Dialect: ${options.dialect}\n`;
      code += ` * Generated from TypeScript interface\n`;
      code += ` */\n\n`;
    }

    // Export keyword
    const exportKeyword = options.exportQueries ? 'export ' : '';
    const constKeyword = options.includeTypeScript ? 'const' : '';

    // SELECT query
    if (queries.selectQuery) {
      code += `${exportKeyword}${constKeyword} select${interfaceName}Query = \`\n`;
      code += `${queries.selectQuery}\n`;
      code += `\`;\n\n`;
    }

    // INSERT query
    if (queries.insertQuery) {
      code += `${exportKeyword}${constKeyword} insert${interfaceName}Query = \`\n`;
      code += `${queries.insertQuery}\n`;
      code += `\`;\n\n`;
    }

    // UPDATE query
    if (queries.updateQuery) {
      code += `${exportKeyword}${constKeyword} update${interfaceName}Query = \`\n`;
      code += `${queries.updateQuery}\n`;
      code += `\`;\n\n`;
    }

    // DELETE query
    if (queries.deleteQuery) {
      code += `${exportKeyword}${constKeyword} delete${interfaceName}Query = \`\n`;
      code += `${queries.deleteQuery}\n`;
      code += `\`;\n\n`;
    }

    // Add TypeScript types if generated
    if (options.generateTypes) {
      code += '// TypeScript Types\n';
      if (queries.selectQueryType) {
        code += `${queries.selectQueryType}\n\n`;
      }
      if (queries.insertQueryType) {
        code += `${queries.insertQueryType}\n\n`;
      }
      if (queries.updateQueryType) {
        code += `${queries.updateQueryType}\n\n`;
      }
      if (queries.deleteQueryType) {
        code += `${queries.deleteQueryType}\n\n`;
      }
      if (queries.parameterTypes) {
        code += `${queries.parameterTypes}\n\n`;
      }
    }

    // Add helper function examples if validation is enabled
    if (options.includeValidation) {
      code += '// Helper Functions\n';
      code += this.generateValidationHelpers(interfaceName, queries.fields, options);
    }

    return code;
  }

  /**
   * Generates validation helper functions
   */
  private generateValidationHelpers(
    interfaceName: string,
    fields: SQLQueryField[],
    options: SQLQueryBuilderGenerationOptions,
  ): string {
    let code = '';

    // Generate validate function
    code += `${options.includeTypeScript ? 'export ' : ''}function validate${interfaceName}(data: any): boolean {\n`;
    code += `  // Add validation logic here\n`;
    for (const field of fields) {
      if (field.isRequired) {
        code += `  if (data.${field.name} === undefined || data.${field.name} === null) {\n`;
        code += `    throw new Error('${field.name} is required');\n`;
        code += `  }\n`;
      }
    }
    code += `  return true;\n`;
    code += `}\n\n`;

    // Generate sanitize function
    code += `${options.includeTypeScript ? 'export ' : ''}function sanitize${interfaceName}(data: any): any {\n`;
    code += `  // Add sanitization logic here\n`;
    code += `  const sanitized: any = {};\n`;
    for (const field of fields) {
      code += `  if (data.${field.name} !== undefined) {\n`;
      code += `    sanitized.${field.name} = data.${field.name};\n`;
      code += `  }\n`;
    }
    code += `  return sanitized;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Converts string to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  /**
   * Calculates the file path for the generated queries
   */
  private calculateQueriesFilePath(sourceFilePath: string, _tableName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension from source file
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Create queries file name
    const queriesFileName = `${baseName}.queries.sql.ts`;

    return path.join(sourceDir, queriesFileName);
  }

  /**
   * Creates the queries file at the specified path
   */
  public async createQueriesFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write queries file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('SQL queries file created', { filePath });
  }

  /**
   * Checks if a queries file already exists
   */
  public async queriesFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends queries to existing file
   */
  public async appendQueriesToFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const existingContent = await vscode.workspace.fs.readFile(uri);
    const existingText = Buffer.from(existingContent).toString('utf-8');

    const updatedText = existingText + '\n\n' + code;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(updatedText, 'utf-8'));
    this.logger.info('SQL queries appended to file', { filePath });
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultTableName?: string,
    defaultInterfaceName?: string,
  ): Promise<SQLQueryBuilderGenerationOptions | undefined> {
    // Ask for table name
    const tableName = await vscode.window.showInputBox({
      prompt: 'Enter database table name',
      placeHolder: 'users',
      value: defaultTableName || 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Table name cannot be empty';
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
          return 'Table name must start with letter or underscore and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!tableName) {
      return undefined;
    }

    // Ask for interface name
    const interfaceName = await vscode.window.showInputBox({
      prompt: 'Enter interface name',
      placeHolder: 'User',
      value: defaultInterfaceName || 'User',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Interface name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Interface name must start with uppercase letter';
        }
        return null;
      },
    });

    if (!interfaceName) {
      return undefined;
    }

    // Select dialect
    const dialectChoice = await vscode.window.showQuickPick(
      [
        { label: 'PostgreSQL', value: 'postgresql' as const, description: 'Use PostgreSQL syntax' },
        { label: 'MySQL', value: 'mysql' as const, description: 'Use MySQL syntax' },
        { label: 'SQLite', value: 'sqlite' as const, description: 'Use SQLite syntax' },
        { label: 'MSSQL', value: 'mssql' as const, description: 'Use SQL Server syntax' },
      ],
      {
        placeHolder: 'Select SQL dialect',
      },
    );

    if (!dialectChoice) {
      return undefined;
    }

    // Select parameter style
    const paramStyleChoice = await vscode.window.showQuickPick(
      [
        { label: '? (positional)', value: 'positional' as const, description: 'Use ? placeholders' },
        { label: '$1, $2 (numeric)', value: 'numeric' as const, description: 'Use $1, $2 placeholders' },
        { label: '@name (named)', value: 'named' as const, description: 'Use @name placeholders' },
      ],
      {
        placeHolder: 'Select parameter style',
      },
    );

    if (!paramStyleChoice) {
      return undefined;
    }

    return {
      tableName: tableName.trim(),
      interfaceName: interfaceName.trim(),
      includeJSDoc: true,
      includeTypeScript: true,
      dialect: dialectChoice.value,
      parameterStyle: paramStyleChoice.value,
      generateSelect: true,
      generateInsert: true,
      generateUpdate: true,
      generateDelete: true,
      generateTypes: true,
      exportQueries: true,
      includeJoins: false,
      includeWhere: true,
      includeValidation: true,
    };
  }

  /**
   * Shows queries preview and gets user confirmation
   */
  public async showQueriesPreview(result: SQLQueryBuilderGenerationResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.queriesCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new queries file', value: 'create' },
        {
          label: 'Append to Existing',
          description: 'Append to existing queries file',
          value: 'append',
        },
        { label: 'Copy to Clipboard', description: 'Copy queries code to clipboard', value: 'copy' },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with these queries?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.queriesCode);
      vscode.window.showInformationMessage('SQL queries code copied to clipboard!');
      return false;
    }

    return true;
  }
}
