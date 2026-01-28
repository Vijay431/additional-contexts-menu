import * as path from 'path';
import * as vscode from 'vscode';

import type {
  ElectronMainProcessConfig,
  ElectronMainProcessMethod,
  ElectronMainProcessParameter,
  GeneratedMainProcess,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating Electron main process code with TypeScript typing,
 * window management, and IPC handlers
 */
export class ElectronMainProcessGeneratorService {
  private static instance: ElectronMainProcessGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ElectronMainProcessGeneratorService {
    ElectronMainProcessGeneratorService.instance ??= new ElectronMainProcessGeneratorService();
    return ElectronMainProcessGeneratorService.instance;
  }

  /**
   * Generates an Electron main process based on user input
   */
  public async generateMainProcess(
    workspacePath: string,
    config: ElectronMainProcessConfig,
  ): Promise<GeneratedMainProcess | null> {
    // Get app name
    const appName = await this.getAppName(config);
    if (!appName) {
      return null;
    }

    // Collect methods
    const methods = await this.collectMethods(config);
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage('No methods defined. Main process generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(methods, config);

    // Generate main process code
    const processCode = this.generateMainProcessCode(appName, methods, imports, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, appName, config);

    this.logger.info('Electron main process generated', {
      name: appName,
      methods: methods.length,
    });

    return {
      name: appName,
      filePath,
      methods,
      imports,
      processCode,
      config,
    };
  }

  /**
   * Prompts user for app name
   */
  private async getAppName(config: ElectronMainProcessConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Electron app name (e.g., MyApp, MyElectronApp)',
      placeHolder: config.defaultAppName || 'MyElectronApp',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'App name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'App name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects methods from user
   */
  private async collectMethods(config: ElectronMainProcessConfig): Promise<ElectronMainProcessMethod[] | null> {
    const methods: ElectronMainProcessMethod[] = [];

    let addMore = true;
    while (addMore) {
      const method = await this.createMethod(config);
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
  private async createMethod(config: ElectronMainProcessConfig): Promise<ElectronMainProcessMethod | null> {
    // Get method category
    const categoryChoice = await vscode.window.showQuickPick<
      Required<{ label: string; description: string; value: ElectronMainProcessMethod['category'] }>
    >(
      [
        { label: 'App', description: 'Application lifecycle methods', value: 'app' },
        { label: 'Window', description: 'Browser window management', value: 'window' },
        { label: 'IPC', description: 'Inter-process communication handlers', value: 'ipc' },
        { label: 'Security', description: 'Security configuration and validation', value: 'security' },
        { label: 'Lifecycle', description: 'Application lifecycle event handlers', value: 'lifecycle' },
      ],
      { placeHolder: 'Select method category' },
    );

    if (!categoryChoice) {
      return null;
    }

    // Get method name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter method name (camelCase)',
      placeHolder: 'createMainWindow',
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
      placeHolder: 'Creates the main application window',
    });

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

    // Collect parameters
    const parameters = await this.collectParameters();

    // Get return type
    const returnType = await this.getReturnType(isAsync);

    const method: ElectronMainProcessMethod = {
      name: methodName,
      parameters,
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
   * Collects parameters for a method
   */
  private async collectParameters(): Promise<ElectronMainProcessParameter[]> {
    const parameters: ElectronMainProcessParameter[] = [];

    let addMore = true;
    while (addMore) {
      const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name',
        placeHolder: 'event',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Parameter name must start with lowercase letter';
          }
          return null;
        },
      });

      if (!paramName) {
        break;
      }

      const paramType = await vscode.window.showInputBox({
        prompt: 'Enter parameter type',
        placeHolder: 'Electron.IpcMainInvokeEvent | string',
        value: 'any',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter type cannot be empty';
          }
          return null;
        },
      });

      const paramDescription = await vscode.window.showInputBox({
        prompt: 'Enter parameter description (optional)',
      });

      const optionalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: 'required' },
          { label: 'Optional', value: 'optional' },
        ],
        { placeHolder: 'Is this parameter required?' },
      );

      const defaultValueInput = await vscode.window.showInputBox({
        prompt: 'Enter default value (optional)',
        placeHolder: "undefined",
      });

      const parameter: ElectronMainProcessParameter = {
        name: paramName.trim(),
        type: paramType?.trim() || 'any',
        optional: optionalChoice?.value === 'optional',
      };

      const trimmedDescription = paramDescription?.trim();
      if (trimmedDescription && trimmedDescription.length > 0) {
        parameter.description = trimmedDescription;
      }

      const trimmedDefaultValue = defaultValueInput?.trim();
      if (trimmedDefaultValue && trimmedDefaultValue.length > 0) {
        parameter.defaultValue = trimmedDefaultValue;
      }

      parameters.push(parameter);

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another parameter', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another parameter?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return parameters;
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
   * Generates imports based on methods and config
   */
  private generateImports(methods: ElectronMainProcessMethod[], config: ElectronMainProcessConfig): string[] {
    const imports: string[] = [];

    // Core Electron imports
    imports.push("import { app, BrowserWindow, ipcMain } from 'electron';");

    // Path module for window paths
    imports.push("import * as path from 'path';");

    // TypeScript types
    if (config.includeTypeScript) {
      imports.push("import type { IpcMainInvokeEvent, IpcMainEvent } from 'electron';");
    }

    // Auto updater
    if (config.includeAutoUpdater) {
      imports.push("import { autoUpdater } from 'electron-updater';");
    }

    return imports;
  }

  /**
   * Generates the main process code
   */
  private generateMainProcessCode(
    appName: string,
    methods: ElectronMainProcessMethod[],
    imports: string[],
    config: ElectronMainProcessConfig,
  ): string {
    let code = '';

    // Add file header comment
    code += '/**\n';
    code += ` * ${appName} - Electron Main Process\n`;
    code += ' * Auto-generated with TypeScript support\n';
    code += ' */\n\n';

    // Imports
    code += imports.join('\n');
    code += '\n\n';

    // Add security constants if enabled
    if (config.includeSecurity) {
      code += this.generateSecurityConstants();
    }

    // Main process class
    code += `class ${appName} {\n`;
    code += '  private mainWindow: BrowserWindow | null = null;\n';
    code += '  private isDevelopment: boolean;\n\n';

    // Constructor
    code += '  constructor() {\n';
    code += "    this.isDevelopment = process.env.NODE_ENV === 'development';\n";
    code += '    this.setupAppEvents();\n';

    if (config.includeIPC) {
      code += '    this.setupIpcHandlers();\n';
    }

    if (config.includeAutoUpdater) {
      code += '    this.setupAutoUpdater();\n';
    }

    code += '  }\n\n';

    // Generate methods grouped by category
    const categories: ElectronMainProcessMethod['category'][] = ['app', 'window', 'ipc', 'security', 'lifecycle'];

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

    // Add lifecycle methods if not provided
    if (!methods.some((m) => m.category === 'lifecycle')) {
      code += '  // Lifecycle Methods\n';
      code += this.generateLifecycleMethods(config);
    }

    code += '}\n\n';

    // Initialize and export
    code += `// Initialize ${appName}\n`;
    code += `const ${this.camelCase(appName)} = new ${appName}();\n`;

    return code;
  }

  /**
   * Generates security constants
   */
  private generateSecurityConstants(): string {
    let code = '/**\n';
    code += ' * Security configuration\n';
    code += ' */\n';
    code += 'const SECURITY_OPTIONS = {\n';
    code += '  nodeIntegration: false,\n';
    code += '  contextIsolation: true,\n';
    code += '  sandbox: true,\n';
    code += '  webSecurity: true,\n';
    code += '  allowRunningInsecureContent: false,\n';
    code += '};\n\n';

    return code;
  }

  /**
   * Generates lifecycle methods
   */
  private generateLifecycleMethods(config: ElectronMainProcessConfig): string {
    let code = '';

    // App ready event
    code += '  private setupAppEvents(): void {\n';
    code += "    app.whenReady().then(() => {\n";
    code += '      this.createMainWindow();\n\n';
    code += "      app.on('activate', () => {\n";
    code += '        if (BrowserWindow.getAllWindows().length === 0) {\n';
    code += '          this.createMainWindow();\n';
    code += '        }\n';
    code += '      });\n';
    code += '    });\n\n';

    code += "    app.on('window-all-closed', () => {\n";
    code += "      if (process.platform !== 'darwin') {\n";
    code += '        app.quit();\n';
    code += '      }\n';
    code += '    });\n';
    code += '  }\n\n';

    // IPC handlers
    if (config.includeIPC) {
      code += '  private setupIpcHandlers(): void {\n';
      code += '    // Add your IPC handlers here\n';
      code += "    ipcMain.handle('get-app-version', () => {\n";
      code += "      return app.getVersion();\n";
      code += '    });\n';
      code += '  }\n\n';
    }

    // Auto updater
    if (config.includeAutoUpdater) {
      code += '  private setupAutoUpdater(): void {\n';
      code += '    if (this.isDevelopment) {\n';
      code += "      autoUpdater.setFeedURL({ provider: 'generic', url: 'http://localhost:3000' });\n";
      code += '    }\n\n';
      code += "    autoUpdater.on('update-available', () => {\n";
      code += "      console.log('Update available');\n";
      code += '    });\n\n';
      code += "    autoUpdater.on('update-downloaded', () => {\n";
      code += "      autoUpdater.quitAndInstall();\n";
      code += '    });\n';
      code += '  }\n\n';
    }

    return code;
  }

  /**
   * Generates a single method
   */
  private generateMethodCode(method: ElectronMainProcessMethod, _config: ElectronMainProcessConfig): string {
    let code = '';

    // JSDoc
    if (method.description || method.parameters.length > 0) {
      code += '  /**\n';
      if (method.description) {
        code += `   * ${this.escapeString(method.description)}\n`;
      }
      for (const param of method.parameters) {
        const optional = param.optional ? ' (optional)' : '';
        code += `   * @param {${param.type}} ${param.name}${optional}`;
        if (param.description) {
          code += ` - ${this.escapeString(param.description)}`;
        }
        code += '\n';
      }
      code += '   * @returns {' + method.returnType + '}\n';
      code += '   */\n';
    }

    // Method signature
    const asyncKeyword = method.isAsync ? 'async ' : '';
    code += `  ${asyncKeyword}${method.name}(`;

    // Parameters
    if (method.parameters.length > 0) {
      const params = method.parameters.map((p) => {
        const optional = p.optional ? '?' : '';
        const defaultValue = p.defaultValue ? ` = ${p.defaultValue}` : '';
        return `${p.name}${optional}: ${p.type}${defaultValue}`;
      });
      code += params.join(', ');
    }

    code += `): ${method.returnType} {\n`;

    // Method body
    if (method.isAsync) {
      code += `    // TODO: Implement ${method.name}\n`;
      code += '    throw new Error("Not implemented");\n';
    } else {
      code += `    // TODO: Implement ${method.name}\n`;
      code += '    throw new Error("Not implemented");\n';
    }

    code += '  }';

    return code;
  }

  /**
   * Calculates the file path for the main process
   */
  private calculateFilePath(workspacePath: string, appName: string, config: ElectronMainProcessConfig): string {
    const fileName = `${this.kebabCase(appName)}.main.ts`;
    return path.join(workspacePath, config.mainWindowPath || 'src', 'main', fileName);
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
   * Creates the main process file at the specified path
   */
  public async createMainProcessFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write main process file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Electron main process file created', { filePath });
  }
}
