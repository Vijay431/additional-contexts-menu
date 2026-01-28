import * as path from 'path';
import * as vscode from 'vscode';

import type {
  ElectronPreloadApi,
  ElectronPreloadConfig,
  ElectronPreloadMethod,
  GeneratedPreload,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating Electron preload scripts with TypeScript typing
 * and context bridge exposure
 */
export class ElectronPreloadGeneratorService {
  private static instance: ElectronPreloadGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ElectronPreloadGeneratorService {
    ElectronPreloadGeneratorService.instance ??= new ElectronPreloadGeneratorService();
    return ElectronPreloadGeneratorService.instance;
  }

  /**
   * Generates an Electron preload script based on user input
   */
  public async generatePreload(
    workspacePath: string,
    config: ElectronPreloadConfig,
  ): Promise<GeneratedPreload | null> {
    // Get API name
    const apiName = await this.getApiName(config);
    if (!apiName) {
      return null;
    }

    // Collect API methods
    const methods = await this.collectMethods();
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage('No methods defined. Preload generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(config);

    // Generate preload code
    const preloadCode = this.generatePreloadCode(apiName, methods, imports, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, apiName, config);

    this.logger.info('Electron preload script generated', {
      name: apiName,
      methods: methods.length,
    });

    return {
      name: apiName,
      filePath,
      methods,
      imports,
      preloadCode,
      config,
    };
  }

  /**
   * Prompts user for API name
   */
  private async getApiName(config: ElectronPreloadConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter preload API name (e.g., AppAPI, ElectronAPI)',
      placeHolder: config.defaultApiName || 'ElectronAPI',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'API name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects API methods from user
   */
  private async collectMethods(): Promise<ElectronPreloadMethod[] | null> {
    const methods: ElectronPreloadMethod[] = [];

    let addMore = true;
    while (addMore) {
      const method = await this.createMethod();
      if (method) {
        methods.push(method);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another method', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another method or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return methods.length > 0 ? methods : null;
  }

  /**
   * Creates a single method through user interaction
   */
  private async createMethod(): Promise<ElectronPreloadMethod | null> {
    // Get method name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter method name (camelCase)',
      placeHolder: 'getVersion',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Method name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Method name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const methodName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter method description (optional, for JSDoc)',
      placeHolder: 'Gets the application version',
    });

    // Get method category
    const categoryChoice = await vscode.window.showQuickPick<
      Required<{ label: string; description: string; value: ElectronPreloadMethod['category'] }>
    >(
      [
        { label: 'App', description: 'Application information and methods', value: 'app' },
        { label: 'Window', description: 'Window management methods', value: 'window' },
        { label: 'System', description: 'System information and OS methods', value: 'system' },
        { label: 'IPC', description: 'IPC communication methods', value: 'ipc' },
        { label: 'File', description: 'File system operations', value: 'file' },
        { label: 'Custom', description: 'Custom application methods', value: 'custom' },
      ],
      { placeHolder: 'Select method category' },
    );

    if (!categoryChoice) {
      return null;
    }

    // Check if method should be async
    const isAsyncChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes (async/await)', value: 'yes', description: 'Method will be asynchronous' },
        { label: 'No (synchronous)', value: 'no', description: 'Method will be synchronous' },
      ],
      { placeHolder: 'Should this method be async?' },
    );

    if (!isAsyncChoice) {
      return null;
    }

    const isAsync = isAsyncChoice.value === 'yes';

    // Get return type
    const returnType = await this.getReturnType(isAsync);

    const method: ElectronPreloadMethod = {
      name: methodName,
      returnType,
      isAsync,
      category: categoryChoice.value,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      method.description = trimmedDescription;
    }

    return method;
  }

  /**
   * Gets the return type for a method
   */
  private async getReturnType(_isAsync: boolean): Promise<string> {
    const defaultType = 'Promise<void>';

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultType,
      value: defaultType,
    });

    return input?.trim() || defaultType;
  }

  /**
   * Generates imports based on config
   */
  private generateImports(config: ElectronPreloadConfig): string[] {
    const imports: string[] = [];

    // Context bridge and IPC imports
    imports.push("import { contextBridge, ipcRenderer } from 'electron';");

    // TypeScript types
    if (config.includeTypeScript) {
      imports.push("import type { IpcRendererEvent } from 'electron';");
    }

    return imports;
  }

  /**
   * Generates the preload code
   */
  private generatePreloadCode(
    apiName: string,
    methods: ElectronPreloadMethod[],
    imports: string[],
    config: ElectronPreloadConfig,
  ): string {
    let code = '';

    // Add file header comment
    code += '/**\n';
    code += ` * ${apiName} - Electron Preload Script\n`;
    code += ' * Auto-generated with TypeScript support and context bridge\n';
    code += ' */\n\n';

    // Imports
    code += imports.join('\n');
    code += '\n\n';

    // TypeScript interface if enabled
    if (config.includeTypeScript) {
      code += this.generateTypeScriptInterface(apiName, methods);
    }

    // Exposed API object type
    if (config.includeTypeScript) {
      code += `const api = {\n`;
    } else {
      code += `const api = {\n`;
    }

    // Generate methods grouped by category
    const categories: ElectronPreloadMethod['category'][] = ['app', 'window', 'system', 'ipc', 'file', 'custom'];

    for (const category of categories) {
      const categoryMethods = methods.filter((m) => m.category === category);
      if (categoryMethods.length > 0) {
        code += `  // ${this.ucfirst(category)} Methods\n`;
        for (const method of categoryMethods) {
          code += this.generateMethodCode(method, config);
          code += '\n';
        }
      }
    }

    code += `};\n\n`;

    // Context bridge exposure
    code += this.generateContextBridgeExposure(apiName, config);

    return code;
  }

  /**
   * Generates TypeScript interface for the exposed API
   */
  private generateTypeScriptInterface(apiName: string, methods: ElectronPreloadMethod[]): string {
    let code = '/**\n';
    code += ' * Interface for the exposed API in the renderer process\n';
    code += ' */\n';
    code += `export interface ${apiName} {\n`;

    // Generate methods grouped by category
    const categories: ElectronPreloadMethod['category'][] = ['app', 'window', 'system', 'ipc', 'file', 'custom'];

    for (const category of categories) {
      const categoryMethods = methods.filter((m) => m.category === category);
      if (categoryMethods.length > 0) {
        for (const method of categoryMethods) {
          code += `  ${method.name}: ${method.returnType};\n`;
        }
      }
    }

    code += '}\n\n';

    // Extend Window interface
    code += '/**\n';
    code += ' * Extend the Window interface to include our custom API\n';
    code += ' */\n';
    code += 'declare global {\n';
    code += '  interface Window {\n';
    code += `    ${this.camelCase(apiName)}: ${apiName};\n`;
    code += '  }\n';
    code += '}\n\n';

    return code;
  }

  /**
   * Generates context bridge exposure code
   */
  private generateContextBridgeExposure(apiName: string, config: ElectronPreloadConfig): string {
    let code = '/**\n';
    code += ' * Expose protected methods that allow the renderer process to use\n';
    code += ' * the ipcRenderer without exposing the entire object\n';
    code += ' */\n';
    code += `contextBridge.exposeInMainWorld('${this.camelCase(apiName)}', api);\n`;

    if (config.includeSandboxWarning) {
      code += '\n/**\n';
      code += ' * Sandbox warning: This preload script is running in a sandboxed context.\n';
      code += ' * Node.js integration is disabled for security.\n';
      code += ' */\n';
    }

    return code;
  }

  /**
   * Generates a single method
   */
  private generateMethodCode(method: ElectronPreloadMethod, config: ElectronPreloadConfig): string {
    let code = '';

    // JSDoc
    if (method.description) {
      code += '  /**\n';
      code += `   * ${this.escapeString(method.description)}\n`;
      code += '   */\n';
    }

    // Method signature
    code += `  ${method.name}: `;

    if (method.isAsync) {
      code += 'async ';
    }

    code += '(';

    // Add parameters based on category
    if (config.includeTypeScript) {
      switch (method.category) {
        case 'ipc':
          code += `...args: unknown[])`;
          break;
        case 'app':
        case 'window':
        case 'system':
        case 'file':
        case 'custom':
        default:
          code += `...args: unknown[])`;
          break;
      }
    } else {
      code += `...args)`;
    }

    code += ` => ${method.returnType} => {\n`;

    // Method body with IPC communication
    code += `    // TODO: Implement ${method.name}\n`;
    code += `    return ipcRenderer.invoke('${method.name}', ...args);\n`;

    code += '  },';

    return code;
  }

  /**
   * Calculates the file path for the preload script
   */
  private calculateFilePath(workspacePath: string, apiName: string, config: ElectronPreloadConfig): string {
    const fileName = `${this.kebabCase(apiName)}.preload.ts`;
    return path.join(workspacePath, config.preloadPath || 'src', 'preload', fileName);
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Escapes string for use in comments
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Creates the preload file at the specified path
   */
  public async createPreloadFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write preload file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Electron preload file created', { filePath });
  }
}
