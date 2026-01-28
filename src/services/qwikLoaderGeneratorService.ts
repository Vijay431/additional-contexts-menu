import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface QwikLoaderConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeJSDocComments: boolean;
  includeErrorHandling: boolean;
  includeStreamingSupport: boolean;
  defaultLoaderDirectory: string;
  generateRouteLoader: boolean;
  exportType: 'named' | 'default';
}

export interface QwikLoaderParam {
  name: string;
  type: 'url' | 'body' | 'query' | 'cookie' | 'header' | 'param';
  dataType: string;
  required: boolean;
  description?: string;
}

export interface QwikLoaderFunction {
  name: string;
  returnType: string;
  params: QwikLoaderParam[];
  description?: string;
  hasContextAccess: boolean;
  isStreaming: boolean;
}

export interface GeneratedQwikLoader {
  name: string;
  loaderCode: string;
  componentExample: string;
  filePath: string;
  imports: string[];
  functions: QwikLoaderFunction[];
  interfaces: string[];
}

/**
 * Service for generating QwikCity loaders with TypeScript typing for server-side data fetching.
 * Generates loaders with proper $ symbols, streaming support, and component integration.
 */
export class QwikLoaderGeneratorService {
  private static instance: QwikLoaderGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): QwikLoaderGeneratorService {
    QwikLoaderGeneratorService.instance ??= new QwikLoaderGeneratorService();
    return QwikLoaderGeneratorService.instance;
  }

  /**
   * Main entry point for generating a Qwik loader
   */
  public async generateLoader(
    workspacePath: string,
    config: QwikLoaderConfig,
  ): Promise<GeneratedQwikLoader | null> {
    // Get loader name
    const loaderName = await this.getLoaderName();
    if (!loaderName) {
      return null;
    }

    // Get loader description
    const description = await this.getLoaderDescription(loaderName);

    // Collect loader functions
    const functions = await this.collectLoaderFunctions();
    if (!functions || functions.length === 0) {
      vscode.window.showWarningMessage('No loader functions defined. Loader generation cancelled.');
      return null;
    }

    // Determine if loader needs context access
    const hasContextAccess = await this.askAboutContextAccess();
    if (hasContextAccess) {
      functions.forEach((f) => (f.hasContextAccess = true));
    }

    // Generate TypeScript interfaces
    const interfaces = this.generateInterfaces(functions, loaderName, config);

    // Generate imports
    const imports = this.generateImports(functions, config);

    // Generate loader code
    const loaderCode = this.generateLoaderCode(
      loaderName,
      functions,
      imports,
      interfaces,
      description,
      config,
    );

    // Generate component usage example
    const componentExample = this.generateComponentExample(loaderName, functions, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, loaderName, config);

    this.logger.info('Qwik loader generated', {
      name: loaderName,
      functionCount: functions.length,
      hasContextAccess,
      isStreaming: functions.some((f) => f.isStreaming),
    });

    return {
      name: loaderName,
      loaderCode,
      componentExample,
      filePath,
      imports,
      functions,
      interfaces,
    };
  }

  /**
   * Prompts user for loader name following Qwik conventions
   */
  private async getLoaderName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter loader name (e.g., useProducts, useUserData)',
      placeHolder: 'useProducts',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Loader name cannot be empty';
        }
        if (!/^use[A-Z]/.test(value)) {
          return 'Loader name must start with "use" followed by an uppercase letter (e.g., useProducts, useUserData)';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Loader name can only contain letters, numbers, $, or _';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for loader description
   */
  private async getLoaderDescription(loaderName: string): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter loader description (optional)',
      placeHolder: `Loads data for ${loaderName}`,
    });
    return input?.trim() || `Loads data for ${loaderName}`;
  }

  /**
   * Asks if loader needs access to RequestEvent context
   */
  private async askAboutContextAccess(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes, need access to URL, params, cookies, etc.', value: 'yes' },
        { label: 'No, simple data fetching only', value: 'no' },
      ],
      { placeHolder: 'Does this loader need access to request context (url, params, cookies)?' },
    );

    return choice?.value === 'yes';
  }

  /**
   * Collects loader functions from user
   */
  private async collectLoaderFunctions(): Promise<QwikLoaderFunction[] | null> {
    const functions: QwikLoaderFunction[] = [];

    let addMore = true;
    while (addMore) {
      const func = await this.createLoaderFunction();
      if (func) {
        functions.push(func);
      }

      if (functions.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another loader function', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another loader function or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return functions.length > 0 ? functions : null;
  }

  /**
   * Creates a single loader function through user interaction
   */
  private async createLoaderFunction(): Promise<QwikLoaderFunction | null> {
    // Get function name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter function name (without "use" prefix)',
      placeHolder: 'Products',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Function name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Function name must start with uppercase letter and contain only letters, numbers, $, or _';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Get return type
    const returnType = await this.getReturnType(nameInput);

    // Collect parameters
    const params = await this.collectParams();

    // Get description
    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter function description (optional)',
      placeHolder: `Loads ${nameInput} data`,
    });

    return {
      name: nameInput.trim(),
      returnType,
      params,
      description: descriptionInput?.trim() || `Loads ${nameInput} data`,
      hasContextAccess: false,
      isStreaming: false,
    };
  }

  /**
   * Collects parameters for a loader function
   */
  private async collectParams(): Promise<QwikLoaderParam[]> {
    const params: QwikLoaderParam[] = [];

    let addMoreParams = true;
    while (addMoreParams) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add URL parameter', value: 'url' },
          { label: 'Add body parameter', value: 'body' },
          { label: 'Add query parameter', value: 'query' },
          { label: 'Add cookie parameter', value: 'cookie' },
          { label: 'Add header parameter', value: 'header' },
          { label: 'Add route parameter', value: 'param' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add parameters to loader function' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const param = await this.createParam(addParam.value as QwikLoaderParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single parameter
   */
  private async createParam(type: QwikLoaderParam['type']): Promise<QwikLoaderParam | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${type} parameter name`,
      placeHolder: type === 'body' ? 'data' : type,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Parameter name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid parameter name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Get data type
    const dataTypeInput = await vscode.window.showInputBox({
      prompt: 'Enter data type',
      placeHolder: 'string',
      value: 'string',
    });

    const dataType = dataTypeInput?.trim() || 'string';

    // Get if required
    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'true' },
        { label: 'Optional', value: 'false' },
      ],
      { placeHolder: 'Is this parameter required?' },
    );

    const required = requiredChoice?.value === 'true';

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter parameter description (optional)',
      placeHolder: `The ${nameInput} ${type}`,
    });

    return {
      name: nameInput.trim(),
      type,
      dataType,
      required,
      description: descriptionInput?.trim() || `The ${nameInput} ${type}`,
    };
  }

  /**
   * Gets the return type for a loader function
   */
  private async getReturnType(functionName: string): Promise<string> {
    const defaultTypes: Record<string, string> = {
      Product: 'Product[]',
      User: 'User',
      Data: 'Data',
    };

    const defaultType = defaultTypes[functionName] || 'any';

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultType,
      value: defaultType,
    });

    return input?.trim() || defaultType;
  }

  /**
   * Generates TypeScript interfaces for the loader
   */
  private generateInterfaces(functions: QwikLoaderFunction[], _loaderName: string, config: QwikLoaderConfig): string[] {
    const interfaces: string[] = [];

    if (!config.includeTypeScript) {
      return interfaces;
    }

    // Generate interfaces for each function's return type
    for (const func of functions) {
      // Check if return type is a complex type that needs an interface
      if (
        !['string', 'number', 'boolean', 'void', 'any', 'unknown'].includes(
          func.returnType.toLowerCase(),
        )
      ) {
        // Generate interface based on return type
        if (func.returnType.endsWith('[]')) {
          const baseType = func.returnType.slice(0, -2);
          interfaces.push(this.generateInterface(baseType, func.params));
        } else {
          interfaces.push(this.generateInterface(func.returnType, func.params));
        }
      }
    }

    return interfaces;
  }

  /**
   * Generates a single interface definition
   */
  private generateInterface(typeName: string, _params: QwikLoaderParam[]): string {
    let code = `export interface ${typeName} {\n`;
    code += `  id: string | number;\n`;
    code += `  [key: string]: unknown;\n`;
    code += `}\n`;
    return code;
  }

  /**
   * Generates imports based on functions and config
   */
  private generateImports(functions: QwikLoaderFunction[], _config: QwikLoaderConfig): string[] {
    const imports: string[] = [];

    // QwikCity imports for loaders
    if (functions.some((f) => f.hasContextAccess)) {
      imports.push("import { type RequestEvent } from '@builder.io/qwik-city';");
    }

    imports.push("import { loader$ } from '@builder.io/qwik-city';");
    imports.push("import { component$ } from '@builder.io/qwik';");

    return imports;
  }

  /**
   * Calculates the file path for the loader
   */
  private calculateFilePath(workspacePath: string, loaderName: string, config: QwikLoaderConfig): string {
    const loadersDir = path.join(workspacePath, config.defaultLoaderDirectory, 'loaders');
    return path.join(loadersDir, `${loaderName}.ts`);
  }

  /**
   * Generates the loader code
   */
  private generateLoaderCode(
    loaderName: string,
    functions: QwikLoaderFunction[],
    imports: string[],
    interfaces: string[],
    description: string,
    config: QwikLoaderConfig,
  ): string {
    let code = '';

    // Add file header comment if JSDoc is enabled
    if (config.includeJSDocComments) {
      code += `/**\n`;
      code += ` * ${loaderName} - QwikCity loader\n`;
      code += ` * ${description}\n`;
      code += ` */\n\n`;
    }

    // Add imports
    if (imports.length > 0) {
      code += imports.join('\n');
      code += '\n\n';
    }

    // Add interfaces
    if (interfaces.length > 0) {
      code += interfaces.join('\n');
      code += '\n\n';
    }

    // Generate loader functions
    for (const func of functions) {
      const funcName = `${loaderName}${func.name}`;

      code += `export const ${funcName} = loader$(`;

      // Add parameters based on context access
      if (func.hasContextAccess) {
        code += `({ url, params, cookie, request }: RequestEvent)`;
      } else {
        code += '()';
      }

      code += ` => {\n`;

      // Add JSDoc comment for function
      if (config.includeJSDocComments && func.description) {
        code += `  /** ${func.description} */\n`;
      }

      // Add error handling wrapper if enabled
      if (config.includeErrorHandling) {
        code += `  try {\n`;
        code += this.generateLoaderBody(func, config, true);
        code += `  } catch (error) {\n`;
        code += `    console.error('Error in ${funcName}:', error);\n`;
        code += `    throw error;\n`;
        code += `  }\n`;
      } else {
        code += this.generateLoaderBody(func, config, false);
      }

      code += `});\n\n`;
    }

    return code;
  }

  /**
   * Generates the loader function body
   */
  private generateLoaderBody(func: QwikLoaderFunction, _config: QwikLoaderConfig, withErrorHandling: boolean): string {
    const indent = withErrorHandling ? '    ' : '  ';
    let code = '';

    // Extract parameters if needed
    if (func.params.length > 0 && func.hasContextAccess) {
      code += `${indent}// Extract parameters\n`;
      for (const param of func.params) {
        switch (param.type) {
          case 'url':
            code += `${indent}const ${param.name} = url.${param.name};\n`;
            break;
          case 'query':
            code += `${indent}const ${param.name} = url.searchParams.get('${param.name}');\n`;
            break;
          case 'param':
            code += `${indent}const ${param.name} = params['${param.name}'];\n`;
            break;
          case 'cookie':
            code += `${indent}const ${param.name} = cookie.get('${param.name}')?.value;\n`;
            break;
          case 'header':
            code += `${indent}const ${param.name} = request.headers.get('${param.name}');\n`;
            break;
          case 'body':
            code += `${indent}const body = await request.json();\n`;
            code += `${indent}const ${param.name} = body.${param.name};\n`;
            break;
        }
      }
      code += '\n';
    }

    // Add streaming comment if enabled
    if (_config.includeStreamingSupport && func.isStreaming) {
      code += `${indent}// Data will be streamed to the client\n`;
    }

    // Add TODO comment for implementation
    code += `${indent}// TODO: Implement data fetching logic\n`;
    code += `${indent}const data: ${func.returnType} = [];\n`;

    // Return statement
    if (_config.includeStreamingSupport && func.isStreaming) {
      code += `\n${indent}return data;`;
    } else {
      code += `\n${indent}return data;`;
    }

    return code;
  }

  /**
   * Generates component usage example
   */
  private generateComponentExample(loaderName: string, functions: QwikLoaderFunction[], _config: QwikLoaderConfig): string {
    let code = `/**\n`;
    code += ` * Component example using ${loaderName}\n`;
    code += ` */\n`;
    code += `export const ${loaderName.replace('use', '')}Component = component$(() => {\n`;

    // Add loader usage for each function
    for (const func of functions) {
      const funcName = `${loaderName}${func.name}`;
      code += `  const ${func.name.toLowerCase()}Data = ${funcName}();\n`;
      code += `  const ${func.name.toLowerCase()} = ${func.name.toLowerCase()}Data.value;\n\n`;
    }

    code += `  return (\n`;
    code += `    <div>\n`;
    code += `      {/* Use your data here */}\n`;
    code += `      <div>{JSON.stringify(${functions[0]?.name.toLowerCase() || 'data'})}</div>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `});\n`;

    return code;
  }

  /**
   * Creates the loader file at the specified path
   */
  public async createLoaderFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write loader file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Qwik loader file created', { filePath });
  }

  /**
   * Validates if a loader name follows Qwik conventions
   */
  public validateLoaderName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Loader name cannot be empty' };
    }
    if (!/^use[A-Z]/.test(name)) {
      return {
        valid: false,
        error: 'Loader name must start with "use" followed by an uppercase letter',
      };
    }
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return { valid: false, error: 'Loader name can only contain letters, numbers, $, or _' };
    }
    return { valid: true };
  }
}
