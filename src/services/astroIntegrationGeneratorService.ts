import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface AstroIntegrationGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeLifecycleHooks: boolean;
  includeConfigurationSchema: boolean;
  includeMarkdownDocumentation: boolean;
  includeTests: boolean;
  defaultIntegrationPath: string;
  supportedIntegrationTypes: string[];
}

export interface AstroIntegrationMetadata {
  name: string | undefined;
  description: string | undefined;
  author: string | undefined;
  version: string | undefined;
  integrationType: 'content' | 'renderer' | 'framework' | 'other';
}

export interface AstroIntegrationConfig {
  name: string;
  description: string | undefined;
  includeTypeScript: boolean;
  includeLifecycleHooks: boolean;
  includeConfigurationSchema: boolean;
  includeMarkdownDocumentation: boolean;
  includeTests: boolean;
  integrationType: 'content' | 'renderer' | 'framework' | 'other';
}

export interface GeneratedAstroIntegration {
  name: string;
  files: {
    main: { path: string; code: string };
    index?: { path: string; code: string };
    config?: { path: string; code: string };
    types?: { path: string; code: string };
    docs?: { path: string; code: string };
    tests?: { path: string; code: string };
  };
}

/**
 * Service for generating Astro integrations with TypeScript typing,
 * lifecycle hooks, and configuration. Supports multiple integration types
 * including content collections, renderers, and framework integrations.
 */
export class AstroIntegrationGeneratorService {
  private static instance: AstroIntegrationGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): AstroIntegrationGeneratorService {
    AstroIntegrationGeneratorService.instance ??= new AstroIntegrationGeneratorService();
    return AstroIntegrationGeneratorService.instance;
  }

  /**
   * Generates an Astro integration based on user input
   */
  public async generateIntegration(
    _workspacePath: string,
    config: AstroIntegrationGeneratorConfig,
  ): Promise<GeneratedAstroIntegration | null> {
    // Get integration name
    const integrationName = await this.getIntegrationName();
    if (!integrationName) {
      return null;
    }

    // Get metadata
    const metadata = await this.collectMetadata();
    if (!metadata) {
      return null;
    }

    // Get integration type
    const integrationType = await this.getIntegrationType(config);
    if (!integrationType) {
      return null;
    }

    // Ask for additional files
    const includeConfig =
      config.includeConfigurationSchema && (await this.askForFile('configuration schema'));
    const includeDocs =
      config.includeMarkdownDocumentation && (await this.askForFile('Markdown documentation'));
    const includeTests = config.includeTests && (await this.askForFile('test file'));

    const integrationConfig: AstroIntegrationConfig = {
      name: integrationName,
      description: metadata.description,
      includeTypeScript: config.includeTypeScript,
      includeLifecycleHooks: config.includeLifecycleHooks,
      includeConfigurationSchema: includeConfig,
      includeMarkdownDocumentation: includeDocs,
      includeTests,
      integrationType,
    };

    // Generate files
    const files = this.generateIntegrationFiles(
      integrationConfig,
      config.defaultIntegrationPath,
      metadata,
    );

    this.logger.info('Astro integration generated', {
      name: integrationName,
      type: integrationType,
      includeTypeScript: config.includeTypeScript,
    });

    return {
      name: integrationName,
      files,
    };
  }

  /**
   * Prompts user for integration name
   */
  private async getIntegrationName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter integration name (e.g., my-integration, sitemap, partytown)',
      placeHolder: 'my-integration',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Integration name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Integration name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects metadata from user
   */
  private async collectMetadata(): Promise<AstroIntegrationMetadata | undefined> {
    const description = await vscode.window.showInputBox({
      prompt: 'Enter integration description (optional)',
      placeHolder: 'A brief description of what this integration does',
    });

    const author = await vscode.window.showInputBox({
      prompt: 'Enter author name (optional)',
      placeHolder: 'Your name',
    });

    const version = await vscode.window.showInputBox({
      prompt: 'Enter initial version (optional)',
      placeHolder: '0.1.0',
      value: '0.1.0',
    });

    return {
      name: undefined,
      description: description?.trim() || undefined,
      author: author?.trim() || undefined,
      version: version?.trim() || '0.1.0',
      integrationType: 'other',
    };
  }

  /**
   * Gets integration type from user
   */
  private async getIntegrationType(
    config: AstroIntegrationGeneratorConfig,
  ): Promise<'content' | 'renderer' | 'framework' | 'other' | undefined> {
    const types = config.supportedIntegrationTypes || ['content', 'renderer', 'framework', 'other'];
    const options = types.map((type) => ({
      label: this.ucfirst(type),
      value: type,
    }));

    const choice = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select integration type',
    });

    return choice?.value as 'content' | 'renderer' | 'framework' | 'other';
  }

  /**
   * Asks if user wants to include a specific file
   */
  private async askForFile(fileType: string): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      {
        placeHolder: `Include ${fileType}?`,
      },
    );

    return choice?.value === 'yes';
  }

  /**
   * Generates integration files
   */
  public generateIntegrationFiles(
    config: AstroIntegrationConfig,
    defaultPath: string,
    metadata: AstroIntegrationMetadata,
  ): GeneratedAstroIntegration['files'] {
    const basePath = defaultPath || 'integrations';
    const integrationDir = path.join(basePath, config.name);

    // Main integration file
    const mainPath = path.join(integrationDir, 'index.ts');
    const mainCode = this.generateMainIntegrationFile(config, metadata);

    const files: GeneratedAstroIntegration['files'] = {
      main: { path: mainPath, code: mainCode },
    };

    // Index file (re-export)
    const indexPath = path.join(basePath, `${config.name}.ts`);
    files.index = { path: indexPath, code: this.generateIndexFile(config.name) };

    // Configuration schema
    if (config.includeConfigurationSchema) {
      const configPath = path.join(integrationDir, 'config.ts');
      const configCode = this.generateConfigSchema(config);
      files.config = { path: configPath, code: configCode };
    }

    // TypeScript types
    if (config.includeTypeScript) {
      const typesPath = path.join(integrationDir, 'types.ts');
      const typesCode = this.generateTypesFile(config);
      files.types = { path: typesPath, code: typesCode };
    }

    // Documentation
    if (config.includeMarkdownDocumentation) {
      const docsPath = path.join(integrationDir, 'README.md');
      const docsCode = this.generateDocumentation(config, metadata);
      files.docs = { path: docsPath, code: docsCode };
    }

    // Tests
    if (config.includeTests) {
      const testPath = path.join(integrationDir, `${config.name}.test.ts`);
      const testCode = this.generateTestFile(config);
      files.tests = { path: testPath, code: testCode };
    }

    return files;
  }

  /**
   * Generates main integration file
   */
  private generateMainIntegrationFile(
    config: AstroIntegrationConfig,
    metadata: AstroIntegrationMetadata,
  ): string {
    let code = '';

    // File header
    code += `/**\n`;
    code += ` * ${this.ucfirst(config.name)} Integration\n`;
    if (metadata.description) {
      code += ` * ${metadata.description}\n`;
    }
    if (metadata.author) {
      code += ` * @author ${metadata.author}\n`;
    }
    if (metadata.version) {
      code += ` * @version ${metadata.version}\n`;
    }
    code += ` */\n\n`;

    // Imports
    code += `import type { AstroIntegration } from 'astro';\n`;
    if (config.includeTypeScript) {
      code += `import type { ${this.ucfirst(config.name)}Options } from './types';\n`;
      code += `import { ${this.ucfirst(config.name)}Config } from './config';\n`;
    }
    code += `\n`;

    // Main function
    code += `export function ${config.name}(\n`;
    code += `  options?: ${config.includeTypeScript ? `${this.ucfirst(config.name)}Options` : 'Record<string, any>'},\n`;
    code += `): AstroIntegration {\n`;
    code += `  return {\n`;
    code += `    name: '@astronaut/${config.name}',\n`;
    code += `    \n`;

    // Hooks
    if (config.includeLifecycleHooks) {
      code += this.generateLifecycleHooks(config, metadata);
    }

    code += `  };\n`;
    code += `}\n\n`;

    // Default export
    code += `export default ${config.name};\n`;

    return code;
  }

  /**
   * Generates lifecycle hooks
   */
  private generateLifecycleHooks(
    config: AstroIntegrationConfig,
    _metadata: AstroIntegrationMetadata,
  ): string {
    let code = '';

    // astro:config:setup hook
    code += `    // Update Astro config, add custom Vite plugins, inject scripts\n`;
    code += `    'astro:config:setup': async ({ config, updateConfig, injectScript }) => {\n`;
    code += `      // Your setup logic here\n`;
    code += `      console.log('[${config.name}] Setting up integration');\n\n`;
    code += `      // Example: Update config\n`;
    code += `      // updateConfig({\n`;
    code += `      //   vite: {\n`;
    code += `      //     plugins: [/* your Vite plugins */],\n`;
    code += `      //   },\n`;
    code += `      // });\n\n`;
    code += `      // Example: Inject script\n`;
    code += `      // injectScript('page', 'console.log("${config.name} loaded");');\n`;
    code += `    },\n\n`;

    // astro:config:done hook
    code += `    // Called after Astro config is finalized\n`;
    code += `    'astro:config:done': ({ config }) => {\n`;
    code += `      console.log('[${config.name}] Astro config finalized');\n`;
    code += `    },\n\n`;

    // astro:server:setup hook
    code += `    // Called when the Vite server is created (dev mode)\n`;
    code += `    'astro:server:setup': ({ server }) => {\n`;
    code += `      server.middlewares.use((req, res, next) => {\n`;
    code += `        // Add custom server middleware\n`;
    code += `        next();\n`;
    code += `      });\n`;
    code += `    },\n\n`;

    // astro:server:start hook
    code += `    // Called when the Vite server is fully started\n`;
    code += `    'astro:server:start': ({ server, address }) => {\n`;
    code += `      console.log(\`[${config.name}] Server started on \${address.port}\`);\n`;
    code += `    },\n\n`;

    // astro:build:start hook
    code += `    // Called when the build starts\n`;
    code += `    'astro:build:start': ({ logging }) => {\n`;
    code += `      logging.info('[${config.name}] Build started');\n`;
    code += `    },\n\n`;

    // astro:build:done hook
    code += `    // Called when the build is complete\n`;
    code += `    'astro:build:done': ({ pages, routes }) => {\n`;
    code += `      console.log(\`[${config.name}] Build complete: \${pages.size} pages, \${routes.size} routes\`);\n`;
    code += `    },\n\n`;

    // astro:server:done hook
    code += `    // Called when the dev server is closed\n`;
    code += `    'astro:server:done': () => {\n`;
    code += `      console.log('[${config.name}] Server closed');\n`;
    code += `    },\n`;

    return code;
  }

  /**
   * Generates index re-export file
   */
  private generateIndexFile(integrationName: string): string {
    let code = '';

    code += `/**\n`;
    code += ` * ${this.ucfirst(integrationName)} Integration - Re-export\n`;
    code += ` */\n\n`;
    code += `export { ${integrationName} as default } from './integrations/${integrationName}';\n`;
    code += `export * from './integrations/${integrationName}';\n`;

    return code;
  }

  /**
   * Generates configuration schema
   */
  private generateConfigSchema(config: AstroIntegrationConfig): string {
    let code = '';

    code += `/**\n`;
    code += ` * Configuration schema for ${this.ucfirst(config.name)} integration\n`;
    code += ` */\n\n`;

    if (config.includeTypeScript) {
      code += `import type { ${this.ucfirst(config.name)}Options } from './types';\n\n`;
    }

    code += `export class ${this.ucfirst(config.name)}Config {\n`;
    code += `  private options: ${config.includeTypeScript ? `${this.ucfirst(config.name)}Options` : 'Record<string, any>'};\n\n`;

    code += `  constructor(\n`;
    code += `    options: ${config.includeTypeScript ? `${this.ucfirst(config.name)}Options` : 'Record<string, any>'} = {}\n`;
    code += `  ) {\n`;
    code += `    this.options = {\n`;
    code += `      // Default options\n`;
    code += `      enabled: true,\n`;
    code += `      ...options,\n`;
    code += `    };\n`;
    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Validates the configuration\n`;
    code += `   */\n`;
    code += `  public validate(): boolean {\n`;
    code += `    // Your validation logic here\n`;
    code += `    return true;\n`;
    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Gets a configuration value\n`;
    code += `   */\n`;
    code += `  public get<T = any>(key: string): T {\n`;
    code += `    return this.options[key as keyof typeof this.options] as T;\n`;
    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Sets a configuration value\n`;
    code += `   */\n`;
    code += `  public set(key: string, value: any): void {\n`;
    code += `    this.options[key as keyof typeof this.options] = value;\n`;
    code += `  }\n`;

    code += `}\n`;

    return code;
  }

  /**
   * Generates TypeScript types file
   */
  private generateTypesFile(config: AstroIntegrationConfig): string {
    let code = '';

    code += `/**\n`;
    code += ` * TypeScript types for ${this.ucfirst(config.name)} integration\n`;
    code += ` */\n\n`;

    code += `/**\n`;
    code += ` * Options for the ${this.ucfirst(config.name)} integration\n`;
    code += ` */\n`;
    code += `export interface ${this.ucfirst(config.name)}Options {\n`;
    code += `  /**\n`;
    code += `   * Whether the integration is enabled\n`;
    code += `   * @default true\n`;
    code += `   */\n`;
    code += `  enabled?: boolean;\n\n`;

    code += `  /**\n`;
    code += `   * Custom configuration options\n`;
    code += `   */\n`;
    code += `  [key: string]: any;\n`;
    code += `}\n\n`;

    code += `/**\n`;
    code += ` * Runtime context for the integration\n`;
    code += ` */\n`;
    code += `export interface ${this.ucfirst(config.name)}Context {\n`;
    code += `  config: ${this.ucfirst(config.name)}Options;\n`;
    code += `  timestamp: number;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates documentation
   */
  private generateDocumentation(
    config: AstroIntegrationConfig,
    metadata: AstroIntegrationMetadata,
  ): string {
    let code = '';

    code += `# ${this.ucfirst(config.name)} Integration\n\n`;

    if (metadata.description) {
      code += `${metadata.description}\n\n`;
    }

    code += `## Installation\n\n`;
    code += `\`\`\`bash\n`;
    code += `npx astro add ${config.name}\n`;
    code += `\`\`\`\n\n`;

    code += `## Usage\n\n`;
    code += `In your \`astro.config.mjs\` file:\n\n`;
    code += `\`\`\`js\n`;
    code += `import { defineConfig } from 'astro';\n`;
    code += `import ${config.name} from '@astronaut/${config.name}';\n\n`;
    code += `export default defineConfig({\n`;
    code += `  integrations: [\n`;
    code += `    ${config.name}(),\n`;
    code += `  ],\n`;
    code += `});\n`;
    code += `\`\`\`\n\n`;

    code += `## Configuration\n\n`;
    code += `You can configure the integration by passing options:\n\n`;
    code += `\`\`\`js\n`;
    code += `${config.name}({\n`;
    code += `  enabled: true,\n`;
    code += `  // your options here\n`;
    code += `})\n`;
    code += `\`\`\`\n\n`;

    code += `## Options\n\n`;
    code += `| Option | Type | Default | Description |\n`;
    code += `|--------|------|---------|-------------|\n`;
    code += `| \`enabled\` | \`boolean\` | \`true\` | Whether the integration is enabled |\n\n`;

    code += `## Examples\n\n`;
    code += `### Basic Setup\n\n`;
    code += `\`\`\`js\n`;
    code += `// astro.config.mjs\n`;
    code += `import ${config.name} from '@astronaut/${config.name}';\n\n`;
    code += `export default defineConfig({\n`;
    code += `  integrations: [${config.name}],\n`;
    code += `});\n`;
    code += `\`\`\`\n\n`;

    code += `## Contributing\n\n`;
    code += `Contributions are welcome! Please open an issue or submit a pull request.\n`;

    return code;
  }

  /**
   * Generates test file
   */
  private generateTestFile(config: AstroIntegrationConfig): string {
    let code = '';

    code += `/**\n`;
    code += ` * Tests for ${this.ucfirst(config.name)} integration\n`;
    code += ` */\n\n`;

    code += `import { describe, it, expect, vi } from 'vitest';\n`;
    code += `import { ${config.name} } from './index';\n\n`;

    code += `describe('${this.ucfirst(config.name)} Integration', () => {\n`;
    code += `  it('should create an integration with the correct name', () => {\n`;
    code += `    const integration = ${config.name}();\n`;
    code += `    expect(integration.name).toBe('@astronaut/${config.name}');\n`;
    code += `  });\n\n`;

    code += `  it('should accept options', () => {\n`;
    code += `    const options = { enabled: false };\n`;
    code += `    const integration = ${config.name}(options);\n`;
    code += `    expect(integration.name).toBe('@astronaut/${config.name}');\n`;
    code += `  });\n\n`;

    code += `  it('should have lifecycle hooks', () => {\n`;
    code += `    const integration = ${config.name}();\n`;
    code += `    expect(integration.hooks).toBeDefined();\n`;
    code += `  });\n\n`;

    code += `  it('should call setup hook', async () => {\n`;
    code += `    const integration = ${config.name}();\n`;
    code += `    const mockLogger = {\n`;
    code += `      info: vi.fn(),\n`;
    code += `    };\n\n`;
    code += `    if (integration.hooks['astro:config:setup']) {\n`;
    code += `      await integration.hooks['astro:config:setup']({\n`;
    code += `        config: {},\n`;
    code += `        updateConfig: vi.fn(),\n`;
    code += `        injectScript: vi.fn(),\n`;
    code += `        logger: mockLogger,\n`;
    code += `      } as any);\n`;
    code += `    }\n`;
    code += `  });\n`;

    code += `});\n`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return (
      str.charAt(0).toUpperCase() +
      str.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    );
  }

  /**
   * Creates the integration files at the specified paths
   */
  public async createIntegrationFiles(files: GeneratedAstroIntegration['files']): Promise<void> {
    for (const [fileType, file] of Object.entries(files)) {
      const uri = vscode.Uri.file(file.path);
      const directory = path.dirname(file.path);

      // Create directory if it doesn't exist
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(directory));
      } catch {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
      }

      // Write file
      await vscode.workspace.fs.writeFile(uri, Buffer.from(file.code, 'utf-8'));

      this.logger.info(`Astro integration ${fileType} file created`, { filePath: file.path });
    }
  }
}
