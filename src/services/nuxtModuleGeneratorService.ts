import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NuxtModuleGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeConfigOptions: boolean;
  includeLifecycleHooks: boolean;
  includePluginRegistration: boolean;
  includeCompositionSupport: boolean;
  includeModuleTypes: boolean;
  defaultModulePath: string;
  addJSDocComments: boolean;
  generateModuleMeta: boolean;
  includeVersionValidation: boolean;
}

export interface NuxtModuleOption {
  name: string;
  type: string;
  defaultValue?: any;
  required: boolean;
  description?: string;
}

export interface NuxtModuleHook {
  name: string;
  type: 'build' | 'render' | 'ready' | 'listen' | 'close' | 'module' | 'custom';
  async: boolean;
  description?: string;
}

export interface GeneratedNuxtModule {
  name: string;
  moduleCode: string;
  typesCode?: string;
  filePath: string;
  typesFilePath?: string;
  options: NuxtModuleOption[];
  hooks: NuxtModuleHook[];
  hasPlugin: boolean;
  pluginCode?: string;
  meta?: {
    name: string;
    version?: string;
    configKey?: string;
  };
}

/**
 * Service for generating custom Nuxt modules with TypeScript typing,
 * configuration options, and lifecycle hooks. Generates module templates
 * with proper integration, plugin registration, and composition support.
 */
export class NuxtModuleGeneratorService {
  private static instance: NuxtModuleGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NuxtModuleGeneratorService {
    NuxtModuleGeneratorService.instance ??= new NuxtModuleGeneratorService();
    return NuxtModuleGeneratorService.instance;
  }

  /**
   * Main entry point for generating a Nuxt module
   */
  public async generateModule(
    workspacePath: string,
    config: NuxtModuleGeneratorConfig,
  ): Promise<GeneratedNuxtModule | null> {
    // Get module name
    const moduleName = await this.getModuleName();
    if (!moduleName) {
      return null;
    }

    // Get module meta information
    const meta = config.generateModuleMeta ? await this.collectModuleMeta(moduleName) : undefined;

    // Collect configuration options
    const options = config.includeConfigOptions ? await this.collectModuleOptions() : [];

    // Collect lifecycle hooks
    const hooks = config.includeLifecycleHooks ? await this.collectLifecycleHooks() : [];

    // Determine if plugin should be included
    const hasPlugin = config.includePluginRegistration && (await this.askForPlugin());

    // Generate module code
    const moduleCode = this.generateModuleCode(moduleName, options, hooks, hasPlugin, config, meta);

    // Generate types if enabled
    let typesCode: string | undefined;
    let typesFilePath: string | undefined;
    if (config.includeModuleTypes) {
      typesCode = this.generateModuleTypes(moduleName, options, config);
      typesFilePath = path.join(workspacePath, config.defaultModulePath, 'types');
    }

    // Generate plugin code if needed
    let pluginCode: string | undefined;
    if (hasPlugin) {
      pluginCode = this.generatePluginCode(moduleName, config);
    }

    // Calculate file path
    const filePath = path.join(
      workspacePath,
      config.defaultModulePath,
      `${this.kebabCase(moduleName)}.ts`,
    );

    this.logger.info('Nuxt module generated', {
      moduleName,
      hasOptions: options.length > 0,
      hasHooks: hooks.length > 0,
      hasPlugin,
      hasTypes: !!typesCode,
    });

    return {
      name: moduleName,
      moduleCode,
      typesCode,
      filePath,
      typesFilePath,
      options,
      hooks,
      hasPlugin,
      pluginCode,
      meta,
    };
  }

  /**
   * Prompts user for module name
   */
  private async getModuleName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter module name (e.g., Analytics, Auth, MyCustomModule)',
      placeHolder: 'MyModule',
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
   * Collects module meta information
   */
  private async collectModuleMeta(moduleName: string): Promise<
    | {
        name: string;
        version?: string;
        configKey?: string;
      }
    | undefined
  > {
    const version = await vscode.window.showInputBox({
      prompt: 'Enter module version (optional)',
      placeHolder: '1.0.0',
    });

    const configKeyInput = await vscode.window.showInputBox({
      prompt: 'Enter config key (optional)',
      placeHolder: this.kebabCase(moduleName),
      value: this.kebabCase(moduleName),
    });

    return {
      name: moduleName,
      version: version?.trim() || undefined,
      configKey: configKeyInput?.trim() || undefined,
    };
  }

  /**
   * Collects module configuration options
   */
  private async collectModuleOptions(): Promise<NuxtModuleOption[]> {
    const options: NuxtModuleOption[] = [];

    let addMore = true;
    while (addMore) {
      const option = await this.createModuleOption();
      if (option) {
        options.push(option);
      }

      if (options.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another option', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another option or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return options;
  }

  /**
   * Creates a single module option
   */
  private async createModuleOption(): Promise<NuxtModuleOption | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter option name',
      placeHolder: 'apiKey',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Option name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Option name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Array', value: 'array' },
        { label: 'Object', value: 'object' },
      ],
      { placeHolder: 'Select option type' },
    );

    const defaultValueInput = await vscode.window.showInputBox({
      prompt: 'Enter default value (optional)',
      placeHolder: 'undefined',
    });

    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'true' },
        { label: 'Optional', value: 'false' },
      ],
      { placeHolder: 'Is this option required?' },
    );

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter option description (optional)',
      placeHolder: `The ${nameInput} option`,
    });

    return {
      name: nameInput.trim(),
      type: typeChoice?.value || 'string',
      defaultValue: defaultValueInput?.trim(),
      required: requiredChoice?.value === 'true',
      description: descriptionInput?.trim() || `The ${nameInput} option`,
    };
  }

  /**
   * Collects lifecycle hooks
   */
  private async collectLifecycleHooks(): Promise<NuxtModuleHook[]> {
    const hooks: NuxtModuleHook[] = [];

    // List of common Nuxt lifecycle hooks
    const commonHooks = [
      { name: 'build:before', type: 'build' as const, async: true },
      { name: 'build:done', type: 'build' as const, async: true },
      { name: 'render:island', type: 'render' as const, async: true },
      { name: 'render:setup', type: 'render' as const, async: true },
      { name: 'ready', type: 'ready' as const, async: true },
      { name: 'listen', type: 'listen' as const, async: true },
      { name: 'close', type: 'close' as const, async: true },
      { name: 'modules:done', type: 'module' as const, async: true },
    ];

    let addMore = true;
    while (addMore) {
      const hookChoice = await vscode.window.showQuickPick(
        [
          ...commonHooks.map((h) => ({ label: h.name, value: h })),
          { label: 'Custom hook...', value: 'custom' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Select a lifecycle hook' },
      );

      if (!hookChoice || hookChoice.value === 'finish') {
        addMore = false;
      } else if (hookChoice.value === 'custom') {
        const customName = await vscode.window.showInputBox({
          prompt: 'Enter custom hook name',
          placeHolder: 'custom:hook',
        });
        if (customName) {
          hooks.push({
            name: customName.trim(),
            type: 'custom',
            async: true,
            description: `Custom hook: ${customName}`,
          });
        }
      } else {
        hooks.push(hookChoice.value);
      }

      if (hooks.length > 0 && addMore) {
        const continueChoice = await vscode.window.showQuickPick(
          [
            { label: 'Add another hook', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another hook or finish?' },
        );

        if (!continueChoice || continueChoice.value === 'finish') {
          addMore = false;
        }
      }
    }

    return hooks;
  }

  /**
   * Asks if user wants to include a plugin
   */
  private async askForPlugin(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
      { placeHolder: 'Include a Nuxt plugin with this module?' },
    );

    return choice?.value === 'true';
  }

  /**
   * Generates the module TypeScript code
   */
  private generateModuleCode(
    moduleName: string,
    options: NuxtModuleOption[],
    hooks: NuxtModuleHook[],
    hasPlugin: boolean,
    config: NuxtModuleGeneratorConfig,
    meta?: { name: string; version?: string; configKey?: string },
  ): string {
    let code = '';

    // Add file header comment if JSDoc is enabled
    if (config.addJSDocComments) {
      code += `/**\n`;
      code += ` * ${moduleName} - Nuxt 3 Module\n`;
      if (meta?.version) {
        code += ` * @version ${meta.version}\n`;
      }
      if (options.length > 0) {
        code += ` * @remarks Configurable with ${options.length} options\n`;
      }
      if (hooks.length > 0) {
        code += ` * @remarks Includes ${hooks.length} lifecycle hooks\n`;
      }
      if (hasPlugin) {
        code += ` * @remarks Includes plugin registration\n`;
      }
      code += ` */\n\n`;
    }

    // Add imports
    const imports = new Set<string>([
      "import { defineNuxtModule, createResolver, addPlugin, addComponent, addServerHandler, addImports } from '@nuxt/kit'",
    ]);

    if (options.length > 0) {
      imports.add("import { defu } from 'defu'");
    }

    if (hasPlugin) {
      imports.add("import { fileURLToPath } from 'url'");
    }

    for (const imp of imports) {
      code += `${imp}\n`;
    }
    code += '\n';

    // Generate module options interface if TypeScript is enabled
    if (config.includeTypeScript && options.length > 0) {
      code += this.generateOptionsInterface(moduleName, options);
      code += '\n';
    }

    // Generate module meta
    if (meta) {
      code += this.generateModuleMeta(meta);
      code += '\n';
    }

    // Generate module definition
    code += `export default defineNuxtModule${config.includeTypeScript && options.length > 0 ? `<ModuleOptions>` : ''}({\n`;

    // Add meta property
    if (meta) {
      code += `  meta: {\n`;
      code += `    name: '${meta.name}',\n`;
      if (meta.version) {
        code += `    version: '${meta.version}',\n`;
      }
      if (meta.configKey) {
        code += `    configKey: '${meta.configKey}',\n`;
      }
      code += `  },\n`;
      code += `\n`;
    }

    // Add defaults
    if (options.length > 0) {
      code += `  defaults: {\n`;
      for (const option of options) {
        const defaultValue =
          option.defaultValue !== undefined
            ? option.defaultValue
            : this.getDefaultValueForType(option.type);
        code += `    ${option.name}: ${JSON.stringify(defaultValue)},\n`;
      }
      code += `  },\n`;
      code += `\n`;
    }

    // Add setup function
    code += `  setup${config.includeTypeScript && options.length > 0 ? `<ModuleOptions>` : ''}(options, nuxt) {\n`;
    code += `    const resolver = createResolver(import.meta.url);\n\n`;

    // Add version validation if enabled
    if (config.includeVersionValidation && meta?.version) {
      code += `    // Validate Nuxt version compatibility\n`;
      code += `    if (nuxt.options.dev) {\n`;
      code += `      console.log('${moduleName} module initialized');\n`;
      code += `    }\n\n`;
    }

    // Add options merging
    if (options.length > 0) {
      code += `    // Merge module options with defaults\n`;
      code += `    const mergedOptions = defu(options, {});\n\n`;
    }

    // Add plugin registration
    if (hasPlugin) {
      const pluginName = this.kebabCase(moduleName);
      code += `    // Register plugin\n`;
      code += `    addPlugin({\n`;
      code += `      src: resolver.resolve('./plugins/${pluginName}'),\n`;
      code += `    });\n\n`;
    }

    // Add lifecycle hooks
    if (hooks.length > 0) {
      code += `    // Lifecycle hooks\n`;
      for (const hook of hooks) {
        const asyncKeyword = hook.async ? 'async ' : '';
        code += `    nuxt.hook('${hook.name}', ${asyncKeyword}() => {\n`;
        code += `      // TODO: Implement ${hook.name} hook\n`;
        if (hook.description) {
          code += `      // ${hook.description}\n`;
        }
        code += `    });\n`;
      }
      code += '\n';
    }

    // Add composition support if enabled
    if (config.includeCompositionSupport && options.length > 0) {
      code += `    // Add composables/auto-imports\n`;
      code += `    // TODO: Register composables using addImports\n\n`;
    }

    code += `  },\n`;
    code += `});\n`;

    return code;
  }

  /**
   * Generates the module options interface
   */
  private generateOptionsInterface(_moduleName: string, options: NuxtModuleOption[]): string {
    let code = `interface ModuleOptions {\n`;
    for (const option of options) {
      const optional = option.required ? '' : '?';
      code += `  ${option.name}${optional}: ${option.type};\n`;
    }
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates module meta definition
   */
  private generateModuleMeta(meta: { name: string; version?: string; configKey?: string }): string {
    let code = `const moduleMeta = {\n`;
    code += `  name: '${meta.name}',\n`;
    if (meta.version) {
      code += `  version: '${meta.version}',\n`;
    }
    if (meta.configKey) {
      code += `  configKey: '${meta.configKey}',\n`;
    }
    code += `};\n`;

    return code;
  }

  /**
   * Generates the module TypeScript types definition
   */
  private generateModuleTypes(
    moduleName: string,
    options: NuxtModuleOption[],
    config: NuxtModuleGeneratorConfig,
  ): string {
    let code = '';

    if (config.addJSDocComments) {
      code += `/**\n`;
      code += ` * Type definitions for ${moduleName} module\n`;
      code += ` */\n\n`;
    }

    code += `declare module '@nuxt/schema' {\n`;
    code += `  interface NuxtConfig {\n`;
    code += `    ['${this.kebabCase(moduleName)}']?: Partial<ModuleOptions>\n`;
    code += `  }\n`;
    code += `}\n\n`;

    code += `declare module '@nuxt/schema' {\n`;
    code += `  interface NuxtOptions {\n`;
    code += `    ['${this.kebabCase(moduleName)}']?: ModuleOptions\n`;
    code += `  }\n`;
    code += `}\n\n`;

    if (options.length > 0) {
      code += `export interface ModuleOptions {\n`;
      for (const option of options) {
        const optional = option.required ? '' : '?';
        code += `  ${option.name}${optional}: ${option.type};\n`;
      }
      code += `}\n`;
    }

    return code;
  }

  /**
   * Generates the plugin code
   */
  private generatePluginCode(moduleName: string, config: NuxtModuleGeneratorConfig): string {
    let code = '';

    if (config.addJSDocComments) {
      code += `/**\n`;
      code += ` * ${moduleName} Plugin\n`;
      code += ` * \n`;
      code += ` * This plugin is automatically registered by the ${moduleName} module\n`;
      code += ` */\n\n`;
    }

    code += `export default defineNuxtPlugin((nuxtApp) => {\n`;
    code += `  // TODO: Implement plugin logic\n`;
    code += `  // You can access module options via nuxtApp.$config\n\n`;
    code += `  if (import.meta.server) {\n`;
    code += `    // Server-side plugin logic\n`;
    code += `  }\n\n`;
    code += `  if (import.meta.client) {\n`;
    code += `    // Client-side plugin logic\n`;
    code += `  }\n`;
    code += `});\n`;

    return code;
  }

  /**
   * Gets default value for a given type
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return undefined;
    }
  }

  /**
   * Converts PascalCase to kebab-case
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
    this.logger.info('Nuxt module file created', { filePath });
  }

  /**
   * Creates the plugin file at the specified path
   */
  public async createPluginFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write plugin file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Nuxt plugin file created', { filePath });
  }

  /**
   * Validates if a module name follows Nuxt conventions
   */
  public validateModuleName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Module name cannot be empty' };
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return {
        valid: false,
        error: 'Module name must start with uppercase letter and contain only letters and numbers',
      };
    }
    return { valid: true };
  }
}
