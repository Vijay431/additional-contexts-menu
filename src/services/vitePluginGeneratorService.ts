import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface VitePluginGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeBuildOptimizations: boolean;
  includeDevServer: boolean;
  includePlugins: boolean;
  defaultPluginName: string;
  outputDirectory: string;
  includeRollupConfig: boolean;
  includeViteConfig: boolean;
}

export interface VitePluginHook {
  name: string;
  include: boolean;
  description?: string;
}

export interface VitePluginOption {
  name: string;
  type: string;
  defaultValue?: unknown;
  required: boolean;
  description?: string;
}

export interface GeneratedVitePlugin {
  name: string;
  pluginCode: string;
  configCode: string;
  rollupConfig?: string;
  dependencies: string[];
  imports: string[];
  filePath: string;
  hooks: VitePluginHook[];
  options: VitePluginOption[];
}

/**
 * Service for generating Vite plugins with TypeScript typing, hooks,
 * and configuration. Creates plugin templates with proper transform handling,
 * build integration, and error management.
 */
export class VitePluginGeneratorService {
  private static instance: VitePluginGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): VitePluginGeneratorService {
    VitePluginGeneratorService.instance ??= new VitePluginGeneratorService();
    return VitePluginGeneratorService.instance;
  }

  /**
   * Generates a Vite plugin based on user input
   */
  public async generateVitePlugin(
    workspacePath: string,
    config: VitePluginGeneratorConfig,
  ): Promise<GeneratedVitePlugin | null> {
    // Get plugin name
    const pluginName = await this.getPluginName(config);
    if (!pluginName) {
      return null;
    }

    // Collect hook information
    const hooks = await this.collectHooks();
    if (!hooks || hooks.length === 0) {
      vscode.window.showWarningMessage('No hooks selected. Plugin generation cancelled.');
      return null;
    }

    // Collect plugin options
    const options = await this.collectOptions();
    if (!options) {
      return null;
    }

    // Generate imports based on hooks and config
    const imports = this.generateImports(hooks, config);

    // Generate plugin code
    const pluginCode = this.generatePluginCode(pluginName, hooks, options, imports, config);

    // Generate config code
    const configCode = this.generateConfigCode(pluginName, config);

    // Generate Rollup config if needed
    const rollupConfig = config.includeRollupConfig ? this.generateRollupConfig(pluginName, hooks, config) : undefined;

    // Calculate dependencies
    const dependencies = this.calculateDependencies(hooks, options, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, pluginName, config);

    this.logger.info('Vite plugin generated', {
      name: pluginName,
      hooks: hooks.length,
      options: options.length,
    });

    return {
      name: pluginName,
      pluginCode,
      configCode,
      rollupConfig,
      dependencies,
      imports,
      filePath,
      hooks,
      options,
    };
  }

  /**
   * Prompts user for plugin name
   */
  private async getPluginName(config: VitePluginGeneratorConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Vite plugin name (e.g., virtualModule, customTransform)',
      placeHolder: config.defaultPluginName || 'myPlugin',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Plugin name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Plugin name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects hook information from user
   */
  private async collectHooks(): Promise<VitePluginHook[] | null> {
    const availableHooks: VitePluginHook[] = [
      { name: 'name', include: true, description: 'Plugin name' },
      { name: 'config', include: false, description: 'Modify Vite config' },
      { name: 'configResolved', include: false, description: 'Called after Vite config is resolved' },
      { name: 'configureServer', include: false, description: 'Configure dev server' },
      { name: 'transformIndexHtml', include: false, description: 'Transform HTML index' },
      { name: 'handleHotUpdate', include: false, description: 'Custom HMR update handling' },
      { name: 'buildStart', include: false, description: 'Build start hook' },
      { name: 'buildEnd', include: false, description: 'Build end hook' },
      { name: 'transform', include: false, description: 'Transform each module' },
      { name: 'resolveId', include: false, description: 'Custom module resolution' },
      { name: 'load', include: false, description: 'Custom module loading' },
      { name: 'writeBundle', include: false, description: 'Called after bundle write' },
    ];

    const selectedHooks = await vscode.window.showQuickPick(
      availableHooks.map((hook) => ({
        label: hook.name,
        description: hook.description || '',
        picked: hook.include,
        hook,
      })),
      {
        placeHolder: 'Select Vite hooks to implement',
        canPickMany: true,
      },
    );

    if (!selectedHooks || selectedHooks.length === 0) {
      return null;
    }

    return selectedHooks.map((item) => ({ ...item.hook, include: true }));
  }

  /**
   * Collects plugin options from user
   */
  private async collectOptions(): Promise<VitePluginOption[] | null> {
    const options: VitePluginOption[] = [];

    let addMore = true;
    while (addMore) {
      const option = await this.createOption();
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
   * Creates a single option through user interaction
   */
  private async createOption(): Promise<VitePluginOption | null> {
    // Get option name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter option name',
      placeHolder: 'enabled',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Option name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid option name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Get type
    const typeInput = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'object', value: 'Record<string, unknown>' },
        { label: 'array', value: 'unknown[]' },
        { label: 'function', value: '(...args: unknown[]) => unknown' },
      ],
      { placeHolder: 'Select option type' },
    );

    const type = typeInput?.value || 'unknown';

    // Get if required
    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'true' },
        { label: 'Optional', value: 'false' },
      ],
      { placeHolder: 'Is this option required?' },
    );

    const required = requiredChoice?.value === 'true';

    // Get default value
    let defaultValue: unknown = undefined;
    if (!required) {
      const defaultInput = await vscode.window.showInputBox({
        prompt: 'Enter default value (optional)',
        placeHolder: type === 'boolean' ? 'false' : type === 'string' ? "''" : 'undefined',
      });

      if (defaultInput !== undefined) {
        try {
          defaultValue = this.parseDefaultValue(defaultInput, type);
        } catch {
          defaultValue = undefined;
        }
      }
    }

    // Get description
    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter option description (optional)',
      placeHolder: `The ${nameInput} option`,
    });

    return {
      name: nameInput.trim(),
      type,
      defaultValue,
      required,
      description: descriptionInput?.trim() || `The ${nameInput} option`,
    };
  }

  /**
   * Parses default value based on type
   */
  private parseDefaultValue(value: string, type: string): unknown {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return Number.parseInt(value, 10);
      default:
        return value;
    }
  }

  /**
   * Generates imports based on hooks and config
   */
  private generateImports(hooks: VitePluginHook[], config: VitePluginGeneratorConfig): string[] {
    const imports: string[] = [];

    if (config.includeTypeScript) {
      imports.push('Plugin');
      imports.push('UserConfig');
    }

    // Add specific types based on hooks
    for (const hook of hooks) {
      if (hook.name === 'transform' && config.includeTypeScript) {
        imports.push('TransformResult');
      } else if (hook.name === 'resolveId' && config.includeTypeScript) {
        imports.push('ResolvedId');
      } else if (hook.name === 'load' && config.includeTypeScript) {
        imports.push('LoadResult');
      } else if (hook.name === 'configureServer' && config.includeTypeScript) {
        imports.push('ViteDevServer');
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(imports));
  }

  /**
   * Generates the plugin code
   */
  private generatePluginCode(
    pluginName: string,
    hooks: VitePluginHook[],
    options: VitePluginOption[],
    imports: string[],
    config: VitePluginGeneratorConfig,
  ): string {
    let code = '';

    // Add imports
    if (config.includeTypeScript) {
      code += `import { ${imports.join(', ')} } from 'vite';\n`;
      if (hooks.some((h) => h.name === 'handleHotUpdate')) {
        code += `import { ModuleNode } from 'vite';\n`;
      }
    } else {
      code += `// @ts-check\n\n`;
    }

    code += '\n';

    // Generate options interface if TypeScript
    if (config.includeTypeScript && options.length > 0) {
      const interfaceName = `${this.ucfirst(pluginName)}Options`;
      code += `interface ${interfaceName} {\n`;
      for (const option of options) {
        const optional = option.required ? '' : '?';
        code += `  ${option.name}${optional}: ${option.type}`;
        if (option.defaultValue !== undefined) {
          code += ` // default: ${JSON.stringify(option.defaultValue)}`;
        }
        code += ';\n';
      }
      code += '}\n\n';
    }

    // Generate plugin function
    const functionName = this.ucfirst(pluginName);
    code += `export function ${functionName}(`;

    if (config.includeTypeScript && options.length > 0) {
      code += `options: ${this.ucfirst(pluginName)}Options = {}`;
    } else if (options.length > 0) {
      code += 'options = {}';
    }

    code += `): Plugin {\n`;

    // Return plugin object
    code += `  return {\n`;
    code += `    name: '${pluginName}',\n`;

    // Add hooks
    for (const hook of hooks) {
      if (hook.name === 'name') continue;

      code += this.generateHookImplementation(hook, config);
    }

    code += `  };\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates hook implementation
   */
  private generateHookImplementation(hook: VitePluginHook, config: VitePluginGeneratorConfig): string {
    let code = '';

    switch (hook.name) {
      case 'config':
        code += `    config(config: UserConfig, { command }) {\n`;
        code += `      // TODO: Modify Vite config based on options\n`;
        code += `      return config;\n`;
        code += `    },\n`;
        break;

      case 'configResolved':
        code += `    configResolved(config) {\n`;
        code += `      // TODO: Access resolved config\n`;
        code += `    },\n`;
        break;

      case 'configureServer':
        code += `    configureServer(server) {\n`;
        code += `      // TODO: Configure dev server\n`;
        code += `      // server.middlewares.use((req, res, next) => {\n`;
        code += `      //   // Custom middleware\n`;
        code += `      //   next();\n`;
        code += `      // });\n`;
        code += `    },\n`;
        break;

      case 'transformIndexHtml':
        code += `    transformIndexHtml(html) {\n`;
        code += `      // TODO: Transform HTML\n`;
        code += `      return html;\n`;
        code += `    },\n`;
        break;

      case 'handleHotUpdate':
        code += `    async handleHotUpdate({ file, modules, read }) {\n`;
        code += `      // TODO: Custom HMR handling\n`;
        code += `      return modules;\n`;
        code += `    },\n`;
        break;

      case 'buildStart':
        code += `    buildStart(options) {\n`;
        code += `      // TODO: Handle build start\n`;
        code += `    },\n`;
        break;

      case 'buildEnd':
        code += `    buildEnd() {\n`;
        code += `      // TODO: Handle build end\n`;
        code += `    },\n`;
        break;

      case 'transform':
        code += `    transform(code, id) {\n`;
        code += `      // TODO: Transform module code\n`;
        code += `      // Check file extension or pattern\n`;
        code += `      // if (id.endsWith('.ext')) {\n`;
        code += `      //   return {\n`;
        code += `      //     code: transformedCode,\n`;
        code += `      //     map: null,\n`;
        code += `      //   };\n`;
        code += `      // }\n`;
        code += `    },\n`;
        break;

      case 'resolveId':
        code += `    resolveId(source, importer) {\n`;
        code += `      // TODO: Custom module resolution\n`;
        code += `      // if (source === 'virtual-module') {\n`;
        code += `      //   return source;\n`;
        code += `      // }\n`;
        code += `    },\n`;
        break;

      case 'load':
        code += `    load(id) {\n`;
        code += `      // TODO: Custom module loading\n`;
        code += `      // if (id === 'virtual-module') {\n`;
        code += `      //   return 'export const content = "hello";';\n`;
        code += `      // }\n`;
        code += `    },\n`;
        break;

      case 'writeBundle':
        code += `    writeBundle() {\n`;
        code += `      // TODO: Handle post-build\n`;
        code += `    },\n`;
        break;
    }

    return code;
  }

  /**
   * Generates Vite config code
   */
  private generateConfigCode(pluginName: string, config: VitePluginGeneratorConfig): string {
    const functionName = this.ucfirst(pluginName);
    let code = `// vite.config.ts\n\n`;

    if (config.includeTypeScript) {
      code += `import { defineConfig } from 'vite';\n`;
    } else {
      code += `import { defineConfig } from 'vite';\n`;
    }

    code += `import { ${functionName} } from './plugins/${pluginName}';\n\n`;
    code += `export default defineConfig({\n`;
    code += `  plugins: [\n`;
    code += `    ${functionName}({\n`;

    // Add example options
    if (config.includeTypeScript) {
      code += `      // Add your options here\n`;
    }

    code += `    }),\n`;
    code += `  ],\n`;
    code += `});\n`;

    return code;
  }

  /**
   * Generates Rollup config code
   */
  private generateRollupConfig(pluginName: string, hooks: VitePluginHook[], config: VitePluginGeneratorConfig): string {
    const functionName = this.ucfirst(pluginName);
    let code = `// rollup.config.js\n\n`;
    code += `import { ${functionName} } from './plugins/${pluginName}';\n\n`;
    code += `export default {\n`;
    code += `  plugins: [\n`;
    code += `    ${functionName}(),\n`;
    code += `  ],\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Calculates dependencies based on hooks and options
   */
  private calculateDependencies(hooks: VitePluginHook[], options: VitePluginOption[], config: VitePluginGeneratorConfig): string[] {
    const dependencies: string[] = [];

    // Vite is always a dependency
    dependencies.push('vite');

    // Add TypeScript types if needed
    if (config.includeTypeScript) {
      dependencies.push('@types/node');
    }

    // Remove duplicates
    return Array.from(new Set(dependencies));
  }

  /**
   * Calculates the file path for the plugin
   */
  private calculateFilePath(workspacePath: string, pluginName: string, config: VitePluginGeneratorConfig): string {
    const fileName = config.includeTypeScript ? `${pluginName}.ts` : `${pluginName}.js`;
    return path.join(workspacePath, config.outputDirectory, fileName);
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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

    this.logger.info('Vite plugin file created', { filePath });
  }
}
