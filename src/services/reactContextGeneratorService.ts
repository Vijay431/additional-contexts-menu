import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ContextProperty {
  name: string;
  type: string;
  isRequired: boolean;
  isReadonly: boolean;
  hasDefault?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface ReactContextGeneratorOptions {
  contextName: string;
  contextDirectory: string;
  includeHook: boolean;
  includeProvider: boolean;
  includeContextValue: boolean;
  includeDefaultValue: boolean;
  generateSeparateFiles: boolean;
  exportType: 'named' | 'default';
}

export interface GeneratedReactContext {
  contextName: string;
  contextCode: string;
  providerCode?: string;
  hookCode?: string;
  contextFilePath: string;
  providerFilePath?: string;
  hookFilePath?: string;
  properties: ContextProperty[];
}

/**
 * Service for generating typed React Context with custom hooks and providers
 */
export class ReactContextGeneratorService {
  private static instance: ReactContextGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactContextGeneratorService {
    ReactContextGeneratorService.instance ??= new ReactContextGeneratorService();
    return ReactContextGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React Context from selected code or user input
   */
  public async generateReactContext(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ReactContextGeneratorOptions,
  ): Promise<GeneratedReactContext> {
    const selectedText = document.getText(selection);

    // Parse the context properties from selection or prompt user
    const properties = selectedText.trim()
      ? this.parsePropertiesFromCode(selectedText)
      : await this.promptForProperties();

    if (properties.length === 0) {
      throw new Error('No context properties found or provided');
    }

    // Generate context code
    const contextCode = this.generateContextCode(options.contextName, properties, options);

    // Determine file paths
    const contextFilePath = this.calculateContextFilePath(
      document.fileName,
      options.contextName,
      options,
    );

    // Generate provider and hook if needed
    let providerCode: string | undefined;
    let hookCode: string | undefined;
    let providerFilePath: string | undefined;
    let hookFilePath: string | undefined;

    if (options.includeProvider) {
      providerCode = this.generateProviderCode(options.contextName, properties, options);
      providerFilePath = this.calculateProviderFilePath(document.fileName, options.contextName, options);
    }

    if (options.includeHook) {
      hookCode = this.generateHookCode(options.contextName, properties, options);
      hookFilePath = this.calculateHookFilePath(document.fileName, options.contextName, options);
    }

    this.logger.info('React Context generated', {
      contextName: options.contextName,
      propertyCount: properties.length,
    });

    return {
      contextName: options.contextName,
      contextCode,
      providerCode,
      hookCode,
      contextFilePath,
      providerFilePath,
      hookFilePath,
      properties,
    };
  }

  /**
   * Parses properties from selected code (interface, type, or object)
   */
  private parsePropertiesFromCode(code: string): ContextProperty[] {
    const properties: ContextProperty[] = [];
    const trimmedCode = code.trim();

    // Try to parse as TypeScript interface
    const interfaceMatch = trimmedCode.match(
      /(?:export\s+)?interface\s+(\w+)\s*{([^}]+)}/s,
    );
    if (interfaceMatch) {
      return this.parsePropertiesFromInterfaceBody(interfaceMatch[2]);
    }

    // Try to parse as TypeScript type
    const typeMatch = trimmedCode.match(/(?:export\s+)?type\s+(\w+)\s*=\s*{([^}]+)}/s);
    if (typeMatch) {
      return this.parsePropertiesFromInterfaceBody(typeMatch[2]);
    }

    // Try to parse as object literal
    const objectMatch = trimmedCode.match(/{([^}]+)}/s);
    if (objectMatch) {
      return this.parsePropertiesFromObjectLiteral(objectMatch[1]);
    }

    return properties;
  }

  /**
   * Parses properties from interface/type body
   */
  private parsePropertiesFromInterfaceBody(body: string): ContextProperty[] {
    const properties: ContextProperty[] = [];
    const lines = body.split(';').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('*')) {
        continue;
      }

      // Match: name: type, or name?: type, or readonly name: type
      const readonlyMatch = line.match(/readonly\s+(\w+)\s*\?\s*:\s*(.+)/);
      const optionalMatch = line.match(/(\w+)\s*\?\s*:\s*(.+)/);
      const requiredMatch = line.match(/(\w+)\s*:\s*(.+)/);

      if (readonlyMatch) {
        properties.push({
          name: readonlyMatch[1],
          type: readonlyMatch[2].trim(),
          isRequired: false,
          isReadonly: true,
        });
      } else if (optionalMatch) {
        properties.push({
          name: optionalMatch[1],
          type: optionalMatch[2].trim(),
          isRequired: false,
          isReadonly: false,
        });
      } else if (requiredMatch) {
        properties.push({
          name: requiredMatch[1],
          type: requiredMatch[2].trim(),
          isRequired: true,
          isReadonly: false,
        });
      }
    }

    return properties;
  }

  /**
   * Parses properties from object literal
   */
  private parsePropertiesFromObjectLiteral(body: string): ContextProperty[] {
    const properties: ContextProperty[] = [];
    const lines = body.split(',').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//')) {
        continue;
      }

      // Match: name: value or name: type
      const match = line.match(/(\w+)\s*:\s*(.+)/);
      if (match) {
        const name = match[1];
        const value = match[2].trim();

        // Try to infer type from value
        let type = 'unknown';
        if (value === 'true' || value === 'false') {
          type = 'boolean';
        } else if (value === 'null') {
          type = 'null';
        } else if (value === 'undefined') {
          type = 'undefined';
        } else if (!Number.isNaN(Number.parseFloat(value))) {
          type = 'number';
        } else if (value.startsWith("'") || value.startsWith('"') || value.startsWith('`')) {
          type = 'string';
        } else if (value.startsWith('[')) {
          type = 'unknown[]';
        } else if (value.startsWith('{')) {
          type = 'Record<string, unknown>';
        }

        properties.push({
          name,
          type,
          isRequired: true,
          isReadonly: false,
          hasDefault: true,
          defaultValue: value,
        });
      }
    }

    return properties;
  }

  /**
   * Prompts user to enter context properties manually
   */
  private async promptForProperties(): Promise<ContextProperty[]> {
    const properties: ContextProperty[] = [];

    const input = await vscode.window.showInputBox({
      prompt: 'Enter context properties (format: name:type, name2:type2)',
      placeHolder: 'user:UserInterface, theme:string',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Please enter at least one property';
        }
        return null;
      },
    });

    if (!input) {
      return properties;
    }

    const parts = input.split(',').map((p) => p.trim());
    for (const part of parts) {
      const match = part.match(/^(\w+):(.+)$/);
      if (match) {
        properties.push({
          name: match[1],
          type: match[2].trim(),
          isRequired: !match[1].endsWith('?'),
          isReadonly: false,
        });
      }
    }

    return properties;
  }

  /**
   * Generates the context code
   */
  private generateContextCode(
    contextName: string,
    properties: ContextProperty[],
    options: ReactContextGeneratorOptions,
  ): string {
    let code = this.generateImports();
    code += '\n';

    // Add JSDoc comment
    code += this.generateContextJSDoc(contextName, properties);

    // Define context value type
    const valueInterface = this.generateValueInterface(contextName, properties);
    code += valueInterface;
    code += '\n';

    // Generate default value if needed
    const defaultValue = options.includeDefaultValue
      ? this.generateDefaultValue(properties)
      : 'undefined';

    // Create context
    const contextDeclaration =
      options.exportType === 'default'
        ? `export default React.createContext<${contextName}Value | undefined>(${defaultValue});`
        : `export const ${contextName}Context = React.createContext<${contextName}Value | undefined>(${defaultValue});`;

    code += contextDeclaration;
    code += '\n';

    return code;
  }

  /**
   * Generates the provider component code
   */
  private generateProviderCode(
    contextName: string,
    properties: ContextProperty[],
    options: ReactContextGeneratorOptions,
  ): string {
    let code = this.generateImports();
    code += '\n';

    // Add provider props interface
    code += this.generateProviderPropsInterface(contextName, properties, options);
    code += '\n';

    // Add JSDoc comment
    code += this.generateProviderJSDoc(contextName, properties);

    // Generate provider component
    const providerName = `${contextName}Provider`;

    code += `export function ${providerName}({\n`;
    code += `  children,\n`;

    for (const prop of properties) {
      const readonly = prop.isReadonly ? 'readonly ' : '';
      const optional = prop.isRequired ? '' : '?';
      code += `  ${readonly}${prop.name}${optional},\n`;
    }

    code += `}: ${contextName}ProviderProps) {\n`;

    // Generate context value object
    code += `  const value: ${contextName}Value = {\n`;
    for (const prop of properties) {
      code += `    ${prop.name},\n`;
    }
    code += `  };\n\n`;

    code += `  return (\n`;
    if (options.exportType === 'default') {
      code += `    <${contextName}Context.Provider value={value}>\n`;
    } else {
      code += `    <${contextName}Context.Provider value={value}>\n`;
    }
    code += `      {children}\n`;
    code += `    </${contextName}Context.Provider>\n`;
    code += `  );\n`;
    code += `}\n`;

    // Add display name for better debugging
    code += `\n${providerName}.displayName = '${providerName}';\n`;

    return code;
  }

  /**
   * Generates the custom hook code
   */
  private generateHookCode(
    contextName: string,
    properties: ContextProperty[],
    options: ReactContextGeneratorOptions,
  ): string {
    let code = this.generateImports();
    code += '\n';

    // Add JSDoc comment
    code += this.generateHookJSDoc(contextName, properties);

    const hookName = `use${contextName}`;

    code += `export function ${hookName}(): ${contextName}Value {\n`;

    if (options.exportType === 'default') {
      code += `  const context = React.useContext(${contextName}Context);\n\n`;
    } else {
      code += `  const context = React.useContext(${contextName}Context);\n\n`;
    }

    // Add error check for undefined context
    code += `  if (context === undefined) {\n`;
    code += `    throw new Error('${hookName} must be used within a ${contextName}Provider');\n`;
    code += `  }\n\n`;

    code += `  return context;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(): string {
    return `import React from 'react';`;
  }

  /**
   * Generates JSDoc comment for context
   */
  private generateContextJSDoc(contextName: string, properties: ContextProperty[]): string {
    let code = `/**\n`;
    code += ` * ${contextName} context\n`;
    code += ` *\n`;

    if (properties.length > 0) {
      code += ` * @property {${contextName}Value} value - Context value\n`;
      for (const prop of properties) {
        const optional = prop.isRequired ? '' : ' (optional)';
        const readonly = prop.isReadonly ? ' (readonly)' : '';
        code += ` * @property {${prop.type}} ${prop.name}${optional}${readonly} - ${prop.description || prop.name}\n`;
      }
    }

    code += ` */\n`;
    return code;
  }

  /**
   * Generates JSDoc comment for provider
   */
  private generateProviderJSDoc(contextName: string, properties: ContextProperty[]): string {
    let code = `/**\n`;
    code += ` * ${contextName} provider component\n`;
    code += ` *\n`;
    code += ` * @param {React.PropsWithChildren<${contextName}ProviderProps>} props - Provider props\n`;
    code += ` * @returns {JSX.Element} Provider component\n`;
    code += ` */\n`;
    return code;
  }

  /**
   * Generates JSDoc comment for hook
   */
  private generateHookJSDoc(contextName: string, properties: ContextProperty[]): string {
    let code = `/**\n`;
    code += ` * Hook to access ${contextName} context\n`;
    code += ` *\n`;
    code += ` * @throws {Error} If used outside of ${contextName}Provider\n`;
    code += ` * @returns {${contextName}Value} Context value\n`;
    code += ` */\n`;
    return code;
  }

  /**
   * Generates value interface
   */
  private generateValueInterface(contextName: string, properties: ContextProperty[]): string {
    let code = `export interface ${contextName}Value {\n`;

    for (const prop of properties) {
      const readonly = prop.isReadonly ? 'readonly ' : '';
      const optional = prop.isRequired ? '' : '?';
      code += `  ${readonly}${prop.name}${optional}: ${prop.type};\n`;
    }

    code += `}\n`;
    return code;
  }

  /**
   * Generates provider props interface
   */
  private generateProviderPropsInterface(
    contextName: string,
    properties: ContextProperty[],
    options: ReactContextGeneratorOptions,
  ): string {
    let code = `export interface ${contextName}ProviderProps {\n`;
    code += `  children: React.ReactNode;\n`;

    for (const prop of properties) {
      const readonly = prop.isReadonly ? 'readonly ' : '';
      const optional = prop.isRequired ? '' : '?';
      code += `  ${readonly}${prop.name}${optional}: ${prop.type};\n`;
    }

    code += `}\n`;
    return code;
  }

  /**
   * Generates default value for context
   */
  private generateDefaultValue(properties: ContextProperty[]): string {
    const valueProps: string[] = [];

    for (const prop of properties) {
      if (prop.hasDefault && prop.defaultValue !== undefined) {
        valueProps.push(`${prop.name}: ${prop.defaultValue}`);
      } else if (!prop.isRequired) {
        // Use undefined for optional properties
        valueProps.push(`${prop.name}: undefined`);
      }
    }

    if (valueProps.length === 0) {
      return 'undefined';
    }

    return `{ ${valueProps.join(', ')} }`;
  }

  /**
   * Calculates context file path
   */
  private calculateContextFilePath(
    sourceFilePath: string,
    contextName: string,
    options: ReactContextGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const contextDirectory = options.contextDirectory || 'contexts';

    const contextFileName = `${contextName}.context.tsx`;
    return path.join(sourceDir, contextDirectory, contextFileName);
  }

  /**
   * Calculates provider file path
   */
  private calculateProviderFilePath(
    sourceFilePath: string,
    contextName: string,
    options: ReactContextGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const contextDirectory = options.contextDirectory || 'contexts';

    const providerFileName = `${contextName}.provider.tsx`;
    return path.join(sourceDir, contextDirectory, providerFileName);
  }

  /**
   * Calculates hook file path
   */
  private calculateHookFilePath(
    sourceFilePath: string,
    contextName: string,
    options: ReactContextGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const hooksDirectory = options.contextDirectory || 'contexts';

    const hookFileName = `use${contextName}.ts`;
    return path.join(sourceDir, hooksDirectory, hookFileName);
  }

  /**
   * Creates the context file at the specified path
   */
  public async createContextFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write context file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Context file created', { filePath });
  }

  /**
   * Checks if a context file already exists
   */
  public async contextFileExists(filePath: string): Promise<boolean> {
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
  public async getGeneratorOptions(
    defaultContextName?: string,
  ): Promise<ReactContextGeneratorOptions | undefined> {
    // Ask for context name
    const contextName = await vscode.window.showInputBox({
      prompt: 'Enter context name',
      placeHolder: 'User',
      value: defaultContextName || '',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Context name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Context name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!contextName) {
      return undefined;
    }

    // Ask for directory
    const contextDirectory = await vscode.window.showInputBox({
      prompt: 'Enter contexts directory name',
      placeHolder: 'contexts',
      value: 'contexts',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!contextDirectory) {
      return undefined;
    }

    // Ask for export type
    const exportType = await vscode.window.showQuickPick(
      [
        { label: 'Named Export', description: "export const ContextName = createContext()", value: 'named' },
        { label: 'Default Export', description: 'export default createContext()', value: 'default' },
      ],
      {
        placeHolder: 'Select export type',
      },
    );

    if (!exportType) {
      return undefined;
    }

    // Ask for file organization
    const fileOrganization = await vscode.window.showQuickPick(
      [
        {
          label: 'Single File',
          description: 'Context, provider, and hook in one file',
          value: 'single',
        },
        {
          label: 'Separate Files',
          description: 'Each component in its own file',
          value: 'separate',
        },
      ],
      {
        placeHolder: 'Select file organization',
      },
    );

    if (!fileOrganization) {
      return undefined;
    }

    const generateSeparateFiles = fileOrganization.value === 'separate';

    return {
      contextName: contextName.trim(),
      contextDirectory: contextDirectory.trim(),
      includeHook: true,
      includeProvider: true,
      includeContextValue: true,
      includeDefaultValue: true,
      generateSeparateFiles,
      exportType: exportType.value as 'named' | 'default',
    };
  }
}
