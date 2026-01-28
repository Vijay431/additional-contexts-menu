import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { ProjectDetectionService } from './projectDetectionService';
import { FileSaveService } from './fileSaveService';

/**
 * Service for generating lint-staged configuration for pre-commit hooks.
 * Supports ESLint, Prettier, and custom scripts with file-specific linting commands.
 */
export class LintStagedConfigGeneratorService {
  private static instance: LintStagedConfigGeneratorService | undefined;
  private readonly projectDetectionService: ProjectDetectionService;
  private readonly fileDiscoveryService: FileDiscoveryService;
  private readonly configurationService: ConfigurationService;
  private readonly fileSaveService: FileSaveService;

  private constructor(
    projectDetectionService: ProjectDetectionService,
    fileDiscoveryService: FileDiscoveryService,
    configurationService: ConfigurationService,
    fileSaveService: FileSaveService,
  ) {
    this.projectDetectionService = projectDetectionService;
    this.fileDiscoveryService = fileDiscoveryService;
    this.configurationService = configurationService;
    this.fileSaveService = fileSaveService;
  }

  static getInstance(): LintStagedConfigGeneratorService {
    if (!LintStagedConfigGeneratorService.instance) {
      LintStagedConfigGeneratorService.instance = new LintStagedConfigGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
        FileSaveService.getInstance(),
      );
    }
    return LintStagedConfigGeneratorService.instance;
  }

  /**
   * Generate lint-staged configuration for the current workspace
   */
  async generateLintStagedConfig(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating lint-staged configuration...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 50 });

          // Generate lint-staged configuration content
          const configContent = this.buildLintStagedConfig(projectInfo);
          progress.report({ increment: 80 });

          // Write configuration file
          await this.writeLintStagedConfig(workspaceFolder.uri, configContent, projectInfo);
          progress.report({ increment: 100 });

          Logger.info('lint-staged configuration generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating lint-staged configuration', error);
      void vscode.window.showErrorMessage(
        `Failed to generate lint-staged configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for lint-staged configuration
   */
  private async analyzeProject(projectPath: string): Promise<ProjectLintStagedInfo> {
    const info: ProjectLintStagedInfo = {
      hasTypeScript: false,
      hasJavaScript: false,
      hasJsx: false,
      hasTsx: false,
      hasVue: false,
      hasSvelte: false,
      hasAstro: false,
      hasCss: false,
      hasScss: false,
      hasLess: false,
      hasMarkdown: false,
      hasYaml: false,
      hasJson: false,
      linters: {
        eslint: false,
        prettier: false,
        biome: false,
        stylelint: false,
      },
      formatters: {
        prettier: false,
        biome: false,
      },
      packageManager: 'npm',
    };

    // Detect project type and framework
    const projectType = await this.projectDetectionService.detectProjectType();
    info.hasTypeScript = projectType.hasTypeScript;
    info.hasJavaScript = !info.hasTypeScript;

    // Detect frameworks
    if (projectType.frameworks.includes('react')) {
      info.hasJsx = true;
    }
    if (projectType.frameworks.includes('vue')) {
      info.hasVue = true;
    }
    if (projectType.frameworks.includes('svelte')) {
      info.hasSvelte = true;
    }
    if (projectType.frameworks.includes('astro')) {
      info.hasAstro = true;
    }

    // Detect linters and formatters via package.json
    try {
      const packageJsonPath = `${projectPath}/package.json`;
      const packageJsonContent = await this.fileDiscoveryService.readFile(packageJsonPath);
      const packageJson = JSON.parse(packageJsonContent);

      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for linters
      if (deps.eslint || deps['@typescript-eslint/parser']) {
        info.linters.eslint = true;
      }
      if (deps.prettier) {
        info.formatters.prettier = true;
        info.linters.prettier = true;
      }
      if (deps['@biomejs/biome']) {
        info.linters.biome = true;
        info.formatters.biome = true;
      }
      if (deps.stylelint) {
        info.linters.stylelint = true;
      }

      // Detect package manager
      if (await this.fileDiscoveryService.fileExists(`${projectPath}/pnpm-lock.yaml`)) {
        info.packageManager = 'pnpm';
      } else if (await this.fileDiscoveryService.fileExists(`${projectPath}/yarn.lock`)) {
        info.packageManager = 'yarn';
      }
    } catch {
      // Use defaults if package.json can't be read
    }

    // Detect file types by scanning the project
    const sourceFiles = await this.fileDiscoveryService.findFiles(
      `${projectPath}/**/*.{ts,tsx,js,jsx,vue,svelte,astro,css,scss,less,md,mdx,yaml,yml,json}`,
      projectPath,
    );

    for (const file of sourceFiles) {
      if (file.endsWith('.tsx')) {
        info.hasTsx = true;
      }
      if (file.endsWith('.css')) {
        info.hasCss = true;
      }
      if (file.endsWith('.scss') || file.endsWith('.sass')) {
        info.hasScss = true;
      }
      if (file.endsWith('.less')) {
        info.hasLess = true;
      }
      if (file.endsWith('.md') || file.endsWith('.mdx')) {
        info.hasMarkdown = true;
      }
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        info.hasYaml = true;
      }
      if (file.endsWith('.json')) {
        info.hasJson = true;
      }
    }

    return info;
  }

  /**
   * Build the lint-staged configuration content from project information
   */
  private buildLintStagedConfig(info: ProjectLintStagedInfo): string {
    const config: LintStagedConfig = {};

    // TypeScript files
    if (info.hasTypeScript) {
      const tsPatterns = ['*.ts'];
      if (info.hasTsx) {
        tsPatterns.push('*.tsx');
      }

      const tsCommands: string[] = [];

      if (info.linters.biome) {
        tsCommands.push('biome check --write --no-errors-on-unmatched');
      } else if (info.linters.eslint) {
        tsCommands.push('eslint --fix');
        if (info.formatters.prettier) {
          tsCommands.push('prettier --write');
        }
      } else if (info.formatters.prettier) {
        tsCommands.push('prettier --write');
      }

      if (tsCommands.length > 0) {
        config[tsPatterns.join(' ')] = tsCommands;
      }
    }

    // JavaScript files
    if (info.hasJavaScript) {
      const jsPatterns = ['*.js'];
      if (info.hasJsx) {
        jsPatterns.push('*.jsx');
      }

      const jsCommands: string[] = [];

      if (info.linters.biome) {
        jsCommands.push('biome check --write --no-errors-on-unmatched');
      } else if (info.linters.eslint) {
        jsCommands.push('eslint --fix');
        if (info.formatters.prettier) {
          jsCommands.push('prettier --write');
        }
      } else if (info.formatters.prettier) {
        jsCommands.push('prettier --write');
      }

      if (jsCommands.length > 0) {
        config[jsPatterns.join(' ')] = jsCommands;
      }
    }

    // Vue files
    if (info.hasVue) {
      const vueCommands: string[] = [];

      if (info.linters.eslint) {
        vueCommands.push('eslint --fix');
      }
      if (info.formatters.prettier) {
        vueCommands.push('prettier --write');
      }

      if (vueCommands.length > 0) {
        config['*.vue'] = vueCommands;
      }
    }

    // Svelte files
    if (info.hasSvelte) {
      const svelteCommands: string[] = [];

      if (info.linters.eslint) {
        svelteCommands.push('eslint --fix');
      }
      if (info.formatters.prettier) {
        svelteCommands.push('prettier --write');
      }

      if (svelteCommands.length > 0) {
        config['*.svelte'] = svelteCommands;
      }
    }

    // Astro files
    if (info.hasAstro) {
      const astroCommands: string[] = [];

      if (info.linters.eslint) {
        astroCommands.push('eslint --fix');
      }
      if (info.formatters.prettier) {
        astroCommands.push('prettier --write');
      }

      if (astroCommands.length > 0) {
        config['*.astro'] = astroCommands;
      }
    }

    // CSS files
    if (info.hasCss) {
      const cssCommands: string[] = [];

      if (info.linters.stylelint) {
        cssCommands.push('stylelint --fix');
      }
      if (info.formatters.prettier) {
        cssCommands.push('prettier --write');
      }

      if (cssCommands.length > 0) {
        config['*.css'] = cssCommands;
      }
    }

    // SCSS files
    if (info.hasScss) {
      const scssCommands: string[] = [];

      if (info.linters.stylelint) {
        scssCommands.push('stylelint --fix');
      }
      if (info.formatters.prettier) {
        scssCommands.push('prettier --write');
      }

      if (scssCommands.length > 0) {
        config['*.{scss,sass}'] = scssCommands;
      }
    }

    // LESS files
    if (info.hasLess) {
      const lessCommands: string[] = [];

      if (info.linters.stylelint) {
        lessCommands.push('stylelint --fix');
      }
      if (info.formatters.prettier) {
        lessCommands.push('prettier --write');
      }

      if (lessCommands.length > 0) {
        config['*.less'] = lessCommands;
      }
    }

    // Markdown files
    if (info.hasMarkdown && info.formatters.prettier) {
      config['*.{md,mdx}'] = ['prettier --write'];
    }

    // YAML files
    if (info.hasYaml && info.formatters.prettier) {
      config['*.{yml,yaml}'] = ['prettier --write'];
    }

    // JSON files
    if (info.hasJson) {
      const jsonCommands: string[] = [];

      if (info.linters.biome) {
        jsonCommands.push('biome check --write --no-errors-on-unmatched');
      } else if (info.formatters.prettier) {
        jsonCommands.push('prettier --write');
      }

      if (jsonCommands.length > 0) {
        config['*.json'] = jsonCommands;
      }
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Write the lint-staged configuration to file
   */
  private async writeLintStagedConfig(
    workspaceUri: vscode.Uri,
    content: string,
    projectInfo: ProjectLintStagedInfo,
  ): Promise<void> {
    // Determine the best location for the config file
    const configOptions = ['.lintstagedrc', '.lint-staged.config.js', 'lint-staged.config.js'];

    // Check if any config file already exists
    let existingConfig: string | null = null;
    for (const configFile of configOptions) {
      const configPath = vscode.Uri.joinPath(workspaceUri, configFile);
      if (await this.fileDiscoveryService.fileExists(configPath.fsPath)) {
        existingConfig = configFile;
        break;
      }
    }

    let chosenConfig: string;
    if (existingConfig) {
      const overwriteChoice = await vscode.window.showQuickPick(
        ['Overwrite existing config', 'Use different file name', 'Cancel'],
        {
          placeHolder: `Configuration file ${existingConfig} already exists. What would you like to do?`,
        },
      );

      if (!overwriteChoice || overwriteChoice === 'Cancel') {
        return;
      }

      if (overwriteChoice === 'Use different file name') {
        const fileNameInput = await vscode.window.showInputBox({
          placeHolder: '.lintstagedrc.json',
          prompt: 'Enter the configuration file name:',
          value: '.lintstagedrc.json',
        });

        if (!fileNameInput) {
          return;
        }
        chosenConfig = fileNameInput;
      } else {
        chosenConfig = existingConfig;
      }
    } else {
      // Default to .lintstagedrc.json for new configs
      chosenConfig = '.lintstagedrc.json';
    }

    const configPath = vscode.Uri.joinPath(workspaceUri, chosenConfig);

    // Write the configuration
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(configPath, encoder.encode(content));

    // Open the configuration file
    const doc = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(doc);

    // Offer to add npm script
    const shouldAddScript = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: `Would you like to add a 'lint-staged' script to package.json?`,
    });

    if (shouldAddScript === 'Yes') {
      await this.addLintStagedScript(workspaceUri);
    }

    void vscode.window.showInformationMessage(`lint-staged configuration generated at ${chosenConfig}!`);
  }

  /**
   * Add lint-staged script to package.json
   */
  private async addLintStagedScript(workspaceUri: vscode.Uri): Promise<void> {
    try {
      const packageJsonPath = vscode.Uri.joinPath(workspaceUri, 'package.json');

      const content = await this.fileDiscoveryService.readFile(packageJsonPath.fsPath);
      const packageJson = JSON.parse(content);

      // Add the lint-staged script
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      // Detect if project uses husky for pre-commit hooks
      const hasHusky =
        packageJson.devDependencies?.husky ||
        packageJson.dependencies?.husky ||
        (await this.fileDiscoveryService.fileExists(vscode.Uri.joinPath(workspaceUri, '.husky').fsPath));

      if (hasHusky) {
        packageJson.scripts['lint-staged'] = 'lint-staged';
        void vscode.window.showInformationMessage(
          "Added 'lint-staged' script. Don't forget to add it to your husky pre-commit hook!",
        );
      } else {
        packageJson.scripts['prepare'] =
          'husky install && npx husky set .husky/pre-commit "npx lint-staged"';
        void vscode.window.showInformationMessage(
          "Added scripts for lint-staged with husky. Run 'npm run prepare' to set up the git hook.",
        );
      }

      // Write updated package.json
      const updatedContent = JSON.stringify(packageJson, null, 2);
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(packageJsonPath, encoder.encode(updatedContent));
    } catch (error) {
      Logger.error('Error adding lint-staged script', error);
      void vscode.window.showWarningMessage(
        `Could not add lint-staged script to package.json: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate lint-staged configuration from a predefined template
   */
  async generateLintStagedConfigFromTemplate(template: LintStagedTemplate): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      const content = this.getTemplateContent(template);
      await this.writeConfigFromTemplate(workspaceFolder.uri, content, template);
    } catch (error) {
      Logger.error('Error generating lint-staged configuration from template', error);
      void vscode.window.showErrorMessage(
        `Failed to generate lint-staged configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get predefined template content
   */
  private getTemplateContent(template: LintStagedTemplate): string {
    switch (template) {
      case 'javascript':
        return this.getJavaScriptTemplate();
      case 'typescript':
        return this.getTypeScriptTemplate();
      case 'react':
        return this.getReactTemplate();
      case 'vue':
        return this.getVueTemplate();
      case 'svelte':
        return this.getSvelteTemplate();
      case 'astro':
        return this.getAstroTemplate();
      case 'nextjs':
        return this.getNextjsTemplate();
      case 'nuxt':
        return this.getNuxtTemplate();
      case 'minimal':
        return this.getMinimalTemplate();
      case 'comprehensive':
      default:
        return this.getComprehensiveTemplate();
    }
  }

  private getJavaScriptTemplate(): string {
    return JSON.stringify(
      {
        '*.js': ['eslint --fix', 'prettier --write'],
        '*.jsx': ['eslint --fix', 'prettier --write'],
        '*.{json,md,yml,yaml}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getTypeScriptTemplate(): string {
    return JSON.stringify(
      {
        '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
        '*.{js,jsx}': ['eslint --fix', 'prettier --write'],
        '*.{json,md,yml,yaml}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getReactTemplate(): string {
    return JSON.stringify(
      {
        '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
        '*.css': ['stylelint --fix', 'prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getVueTemplate(): string {
    return JSON.stringify(
      {
        '*.vue': ['eslint --fix', 'prettier --write'],
        '*.{js,ts}': ['eslint --fix', 'prettier --write'],
        '*.{css,scss,sass,less}': ['stylelint --fix', 'prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getSvelteTemplate(): string {
    return JSON.stringify(
      {
        '*.svelte': ['eslint --fix', 'prettier --write'],
        '*.{js,ts}': ['eslint --fix', 'prettier --write'],
        '*.{css,scss,sass,less}': ['stylelint --fix', 'prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getAstroTemplate(): string {
    return JSON.stringify(
      {
        '*.astro': ['eslint --fix', 'prettier --write'],
        '*.{js,ts,tsx,jsx}': ['eslint --fix', 'prettier --write'],
        '*.{css,scss,sass}': ['stylelint --fix', 'prettier --write'],
        '*.{json,md,mdx}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getNextjsTemplate(): string {
    return JSON.stringify(
      {
        '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
        '*.css': ['prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getNuxtTemplate(): string {
    return JSON.stringify(
      {
        '*.{js,ts,vue}': ['eslint --fix', 'prettier --write'],
        '*.{css,scss,sass,less}': ['stylelint --fix', 'prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getMinimalTemplate(): string {
    return JSON.stringify(
      {
        '*.{js,ts,jsx,tsx}': ['prettier --write'],
        '*.{json,md}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  private getComprehensiveTemplate(): string {
    return JSON.stringify(
      {
        '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
        '*.vue': ['eslint --fix', 'prettier --write'],
        '*.svelte': ['eslint --fix', 'prettier --write'],
        '*.astro': ['eslint --fix', 'prettier --write'],
        '*.{css,scss,sass,less}': ['stylelint --fix', 'prettier --write'],
        '*.{json,md,mdx,yml,yaml}': ['prettier --write'],
      },
      null,
      2,
    );
  }

  /**
   * Write configuration from template
   */
  private async writeConfigFromTemplate(
    workspaceUri: vscode.Uri,
    content: string,
    template: LintStagedTemplate,
  ): Promise<void> {
    const configPath = vscode.Uri.joinPath(workspaceUri, '.lintstagedrc.json');

    // Check if config already exists
    const configExists = await this.fileDiscoveryService.fileExists(configPath.fsPath);

    if (configExists) {
      const choice = await vscode.window.showWarningMessage(
        'lint-staged configuration already exists. Do you want to overwrite it?',
        'Overwrite',
        'Cancel',
      );

      if (choice !== 'Overwrite') {
        return;
      }
    }

    // Write the configuration
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(configPath, encoder.encode(content));

    // Open the configuration file
    const doc = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage(
      `lint-staged configuration generated from ${template} template!`,
    );
  }
}

/**
 * Project information for lint-staged configuration
 */
interface ProjectLintStagedInfo {
  hasTypeScript: boolean;
  hasJavaScript: boolean;
  hasJsx: boolean;
  hasTsx: boolean;
  hasVue: boolean;
  hasSvelte: boolean;
  hasAstro: boolean;
  hasCss: boolean;
  hasScss: boolean;
  hasLess: boolean;
  hasMarkdown: boolean;
  hasYaml: boolean;
  hasJson: boolean;
  linters: {
    eslint: boolean;
    prettier: boolean;
    biome: boolean;
    stylelint: boolean;
  };
  formatters: {
    prettier: boolean;
    biome: boolean;
  };
  packageManager: 'npm' | 'yarn' | 'pnpm';
}

/**
 * Lint-staged configuration structure
 */
type LintStagedConfig = Record<string, string | string[]>;

/**
 * Predefined lint-staged configuration templates
 */
type LintStagedTemplate =
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'astro'
  | 'nextjs'
  | 'nuxt'
  | 'minimal'
  | 'comprehensive';
