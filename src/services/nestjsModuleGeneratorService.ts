import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NestJSModuleConfig {
  enabled: boolean;
  generateImports: boolean;
  generateControllers: boolean;
  generateProviders: boolean;
  generateExports: boolean;
  addGlobalImports: boolean;
  organizationPattern: 'feature-based' | 'layered';
}

export interface NestJSModuleImport {
  name: string;
  isGlobal: boolean;
}

export interface NestJSModuleController {
  name: string;
  path: string;
}

export interface NestJSModuleProvider {
  name: string;
  type: 'service' | 'guard' | 'interceptor' | 'pipe' | 'filter';
}

export interface GeneratedModule {
  name: string;
  fileName: string;
  imports: NestJSModuleImport[];
  controllers: NestJSModuleController[];
  providers: NestJSModuleProvider[];
  exports: string[];
  moduleCode: string;
}

/**
 * Service for generating NestJS modules that wire together controllers,
 * services, and providers with proper organization patterns
 */
export class NestJSModuleGeneratorService {
  private static instance: NestJSModuleGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSModuleGeneratorService {
    NestJSModuleGeneratorService.instance ??= new NestJSModuleGeneratorService();
    return NestJSModuleGeneratorService.instance;
  }

  /**
   * Generates a NestJS module based on user input
   */
  public async generateModule(
    _workspacePath: string,
    config: NestJSModuleConfig,
  ): Promise<GeneratedModule | null> {
    // Get module name
    const moduleName = await this.getModuleName();
    if (!moduleName) {
      return null;
    }

    // Collect module imports
    const imports = await this.collectModuleImports(config);

    // Collect controllers
    const controllers = await this.collectControllers(config);

    // Collect providers
    const providers = await this.collectProviders(config);

    // Determine exports
    const exports = await this.collectExports(controllers, providers, config);

    // Generate module code
    const moduleCode = this.generateModuleCode(
      moduleName,
      imports,
      controllers,
      providers,
      exports,
      config,
    );

    // Generate file name
    const fileName = this.kebabCase(moduleName);

    this.logger.info('NestJS module generated', {
      name: moduleName,
      imports: imports.length,
      controllers: controllers.length,
      providers: providers.length,
      exports: exports.length,
    });

    return {
      name: moduleName,
      fileName,
      imports,
      controllers,
      providers,
      exports,
      moduleCode,
    };
  }

  /**
   * Prompts user for module name
   */
  private async getModuleName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter module name (e.g., Users, Products, Auth)',
      placeHolder: 'Users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Module name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Module name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects module imports from user
   */
  private async collectModuleImports(config: NestJSModuleConfig): Promise<NestJSModuleImport[]> {
    const imports: NestJSModuleImport[] = [];

    if (!config.generateImports) {
      return imports;
    }

    let addMore = true;
    while (addMore) {
      const shouldAdd = await vscode.window.showQuickPick(
        [
          { label: 'Add module import', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add module imports' },
      );

      if (!shouldAdd || shouldAdd.value === 'finish') {
        break;
      }

      const importName = await vscode.window.showInputBox({
        prompt: 'Enter module name to import (e.g., DatabaseModule, AuthModule)',
        placeHolder: 'DatabaseModule',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Module name cannot be empty';
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
            return 'Module name must start with uppercase letter and contain only letters and numbers';
          }
          return null;
        },
      });

      if (!importName) {
        continue;
      }

      const isGlobalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Import as global', value: 'yes' },
          { label: 'No - Import normally', value: 'no' },
        ],
        { placeHolder: `Is ${importName} a global module?` },
      );

      imports.push({
        name: importName.trim(),
        isGlobal: isGlobalChoice?.value === 'yes',
      });
    }

    return imports;
  }

  /**
   * Collects controllers from user
   */
  private async collectControllers(config: NestJSModuleConfig): Promise<NestJSModuleController[]> {
    const controllers: NestJSModuleController[] = [];

    if (!config.generateControllers) {
      return controllers;
    }

    let addMore = true;
    while (addMore) {
      const shouldAdd = await vscode.window.showQuickPick(
        [
          { label: 'Add controller', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add controllers to module' },
      );

      if (!shouldAdd || shouldAdd.value === 'finish') {
        break;
      }

      const controllerName = await vscode.window.showInputBox({
        prompt: 'Enter controller name (e.g., UsersController)',
        placeHolder: 'UsersController',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Controller name cannot be empty';
          }
          if (!/^[A-Z][a-zA-Z0-9]*Controller$/.test(value)) {
            return 'Controller name must end with "Controller" and start with uppercase letter';
          }
          return null;
        },
      });

      if (!controllerName) {
        continue;
      }

      controllers.push({
        name: controllerName.trim(),
        path: `./${this.kebabCase(controllerName.replace('Controller', ''))}.controller`,
      });
    }

    return controllers;
  }

  /**
   * Collects providers from user
   */
  private async collectProviders(config: NestJSModuleConfig): Promise<NestJSModuleProvider[]> {
    const providers: NestJSModuleProvider[] = [];

    if (!config.generateProviders) {
      return providers;
    }

    let addMore = true;
    while (addMore) {
      const shouldAdd = await vscode.window.showQuickPick(
        [
          { label: 'Add provider', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add providers to module' },
      );

      if (!shouldAdd || shouldAdd.value === 'finish') {
        break;
      }

      const providerType = await vscode.window.showQuickPick(
        [
          { label: 'Service', value: 'service', description: 'Business logic service' },
          { label: 'Guard', value: 'guard', description: 'Authentication/authorization guard' },
          {
            label: 'Interceptor',
            value: 'interceptor',
            description: 'Request/response interceptor',
          },
          { label: 'Pipe', value: 'pipe', description: 'Data validation pipe' },
          { label: 'Filter', value: 'filter', description: 'Exception filter' },
        ],
        { placeHolder: 'Select provider type' },
      );

      if (!providerType) {
        continue;
      }

      const suffixMap: Record<string, string> = {
        service: 'Service',
        guard: 'Guard',
        interceptor: 'Interceptor',
        pipe: 'Pipe',
        filter: 'Filter',
      };

      const suffix = suffixMap[providerType.value];
      if (!suffix) {
        continue;
      }

      const placeholder = `${this.ucfirst('users')}${suffix}`;

      const providerName = await vscode.window.showInputBox({
        prompt: `Enter ${providerType.label} name`,
        placeHolder: placeholder,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return `${providerType.label} name cannot be empty`;
          }
          if (!value.endsWith(suffix)) {
            return `${providerType.label} name must end with "${suffix}"`;
          }
          if (!/^[A-Z]/.test(value)) {
            return `${providerType.label} name must start with uppercase letter`;
          }
          return null;
        },
      });

      if (!providerName) {
        continue;
      }

      providers.push({
        name: providerName.trim(),
        type: providerType.value as NestJSModuleProvider['type'],
      });
    }

    return providers;
  }

  /**
   * Collects exports from user
   */
  private async collectExports(
    controllers: NestJSModuleController[],
    providers: NestJSModuleProvider[],
    config: NestJSModuleConfig,
  ): Promise<string[]> {
    const exports: string[] = [];

    if (!config.generateExports) {
      return exports;
    }

    // Build list of exportable items
    const exportableItems: Array<{ name: string; type: string }> = [];

    for (const controller of controllers) {
      exportableItems.push({ name: controller.name, type: 'controller' });
    }

    for (const provider of providers) {
      exportableItems.push({ name: provider.name, type: provider.type });
    }

    if (exportableItems.length === 0) {
      return exports;
    }

    const selectedItems = await vscode.window.showQuickPick(
      exportableItems.map((item) => ({
        label: item.name,
        description: `(${item.type})`,
        picked: true, // Default all to selected
      })),
      {
        placeHolder: 'Select items to export from this module',
        canPickMany: true,
      },
    );

    if (!selectedItems) {
      return exports;
    }

    return selectedItems.map((item) => item.label);
  }

  /**
   * Generates the module code
   */
  private generateModuleCode(
    moduleName: string,
    imports: NestJSModuleImport[],
    controllers: NestJSModuleController[],
    providers: NestJSModuleProvider[],
    exports: string[],
    config: NestJSModuleConfig,
  ): string {
    let code = '';

    // Standard imports
    code += `import { Module } from '@nestjs/common';\n`;
    code += `import { ${moduleName}Controller } from './${this.kebabCase(moduleName)}.controller';\n`;
    code += `import { ${moduleName}Service } from './${this.kebabCase(moduleName)}.service';\n\n`;

    // Add custom imports
    const customImports: string[] = [];

    for (const imp of imports) {
      const importPath = `../${this.kebabCase(imp.name.replace('Module', ''))}/${this.kebabCase(imp.name.replace('Module', ''))}.module`;
      customImports.push(`import { ${imp.name} } from '${importPath}';`);
    }

    for (const controller of controllers) {
      if (controller.name !== `${moduleName}Controller`) {
        customImports.push(`import { ${controller.name} } from '${controller.path}';`);
      }
    }

    for (const provider of providers) {
      if (provider.name !== `${moduleName}Service`) {
        customImports.push(
          `import { ${provider.name} } from './${this.kebabCase(provider.name.replace(/Service|Guard|Interceptor|Pipe|Filter$/, ''))}.${provider.type}';`,
        );
      }
    }

    if (customImports.length > 0) {
      code += customImports.join('\n');
      code += '\n\n';
    }

    // Module decorator
    code += `@Module({\n`;

    // Add imports
    code += `  imports: [`;
    if (imports.length === 0) {
      code += `],\n`;
    } else {
      code += `\n`;
      for (const imp of imports) {
        code += `    ${imp.isGlobal ? '' : '// '}${imp.name},`;
        if (imp.isGlobal && config.addGlobalImports) {
          code += ` // Global module\n`;
        } else {
          code += `\n`;
        }
      }
      code += `  ],\n`;
    }

    // Add controllers
    code += `  controllers: [`;
    if (controllers.length === 0) {
      code += `],\n`;
    } else {
      code += ` ${controllers.map((c) => c.name).join(', ')} ],\n`;
    }

    // Add providers
    code += `  providers: [`;
    if (providers.length === 0) {
      code += `],\n`;
    } else {
      code += ` ${providers.map((p) => p.name).join(', ')} ],\n`;
    }

    // Add exports
    code += `  exports: [`;
    if (exports.length === 0) {
      code += `],\n`;
    } else {
      code += ` ${exports.join(', ')} ],\n`;
    }

    code += `})\n`;
    code += `export class ${moduleName}Module {}\n`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
   * Creates the module file at the specified path
   */
  public async createModuleFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write module file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Module file created', { filePath });
  }
}
