import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

interface NpmScript {
  name: string;
  script: string;
  description?: string;
  isTemplate: boolean;
}

interface ScriptTemplate {
  name: string;
  script: string;
  description: string;
  category: string;
}

interface PackageJson {
  scripts?: Record<string, string>;
}

interface ScriptQuickPickItem extends vscode.QuickPickItem {
  script: NpmScript;
}

export class PackagejsonScriptsManagerService {
  private static instance: PackagejsonScriptsManagerService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;
  private disposables: vscode.Disposable[] = [];

  // Predefined script templates
  private readonly templates: ScriptTemplate[] = [
    // Development
    {
      name: 'dev',
      script: 'vite',
      description: 'Start development server (Vite)',
      category: 'Development',
    },
    {
      name: 'dev',
      script: 'next dev',
      description: 'Start development server (Next.js)',
      category: 'Development',
    },
    {
      name: 'dev',
      script: 'nuxt dev',
      description: 'Start development server (Nuxt)',
      category: 'Development',
    },
    {
      name: 'dev',
      script: 'webpack serve --mode development',
      description: 'Start development server (Webpack)',
      category: 'Development',
    },
    {
      name: 'serve',
      script: 'vue-cli-service serve',
      description: 'Start development server (Vue CLI)',
      category: 'Development',
    },
    {
      name: 'start',
      script: 'react-scripts start',
      description: 'Start development server (Create React App)',
      category: 'Development',
    },
    {
      name: 'dev',
      script: 'nest start --watch',
      description: 'Start development server (NestJS)',
      category: 'Development',
    },

    // Build
    {
      name: 'build',
      script: 'vite build',
      description: 'Build for production (Vite)',
      category: 'Build',
    },
    {
      name: 'build',
      script: 'next build',
      description: 'Build for production (Next.js)',
      category: 'Build',
    },
    {
      name: 'build',
      script: 'nuxt build',
      description: 'Build for production (Nuxt)',
      category: 'Build',
    },
    {
      name: 'build',
      script: 'webpack --mode production',
      description: 'Build for production (Webpack)',
      category: 'Build',
    },
    {
      name: 'build',
      script: 'vue-cli-service build',
      description: 'Build for production (Vue CLI)',
      category: 'Build',
    },
    {
      name: 'build',
      script: 'react-scripts build',
      description: 'Build for production (Create React App)',
      category: 'Build',
    },
    {
      name: 'build',
      script: 'nest build',
      description: 'Build for production (NestJS)',
      category: 'Build',
    },
    { name: 'tsc', script: 'tsc', description: 'Compile TypeScript', category: 'Build' },

    // Test
    { name: 'test', script: 'vitest', description: 'Run tests (Vitest)', category: 'Test' },
    { name: 'test', script: 'jest', description: 'Run tests (Jest)', category: 'Test' },
    { name: 'test', script: 'mocha', description: 'Run tests (Mocha)', category: 'Test' },
    {
      name: 'test:watch',
      script: 'vitest --watch',
      description: 'Run tests in watch mode (Vitest)',
      category: 'Test',
    },
    {
      name: 'test:watch',
      script: 'jest --watch',
      description: 'Run tests in watch mode (Jest)',
      category: 'Test',
    },
    {
      name: 'test:coverage',
      script: 'vitest --coverage',
      description: 'Run tests with coverage (Vitest)',
      category: 'Test',
    },
    {
      name: 'test:coverage',
      script: 'jest --coverage',
      description: 'Run tests with coverage (Jest)',
      category: 'Test',
    },

    // Lint & Format
    {
      name: 'lint',
      script: 'eslint . --ext .ts,.tsx,.js,.jsx',
      description: 'Lint code (ESLint)',
      category: 'Lint & Format',
    },
    {
      name: 'lint',
      script: 'biome lint .',
      description: 'Lint code (Biome)',
      category: 'Lint & Format',
    },
    {
      name: 'lint:fix',
      script: 'eslint . --ext .ts,.tsx,.js,.jsx --fix',
      description: 'Fix linting issues (ESLint)',
      category: 'Lint & Format',
    },
    {
      name: 'lint:fix',
      script: 'biome check --write .',
      description: 'Fix linting issues (Biome)',
      category: 'Lint & Format',
    },
    {
      name: 'format',
      script: 'prettier --write .',
      description: 'Format code (Prettier)',
      category: 'Lint & Format',
    },
    {
      name: 'format',
      script: 'biome format --write .',
      description: 'Format code (Biome)',
      category: 'Lint & Format',
    },
    {
      name: 'format:check',
      script: 'prettier --check .',
      description: 'Check code formatting (Prettier)',
      category: 'Lint & Format',
    },

    // Database
    {
      name: 'db:migrate',
      script: 'prisma migrate dev',
      description: 'Run database migrations (Prisma)',
      category: 'Database',
    },
    {
      name: 'db:generate',
      script: 'prisma generate',
      description: 'Generate Prisma client',
      category: 'Database',
    },
    {
      name: 'db:push',
      script: 'prisma db push',
      description: 'Push schema to database (Prisma)',
      category: 'Database',
    },
    {
      name: 'db:seed',
      script: 'prisma db seed',
      description: 'Seed database (Prisma)',
      category: 'Database',
    },
    {
      name: 'typeorm:migrate',
      script: 'typeorm migration:run -d src/data-source',
      description: 'Run migrations (TypeORM)',
      category: 'Database',
    },
    {
      name: 'typeorm:generate',
      script: 'typeorm migration:generate -d src/data-source',
      description: 'Generate migration (TypeORM)',
      category: 'Database',
    },

    // Clean
    {
      name: 'clean',
      script: 'rm -rf dist node_modules/.cache',
      description: 'Clean build artifacts',
      category: 'Utilities',
    },
    {
      name: 'clean:all',
      script: 'rm -rf dist node_modules',
      description: 'Clean everything including node_modules',
      category: 'Utilities',
    },

    // Deploy
    {
      name: 'deploy',
      script: 'vercel --prod',
      description: 'Deploy to Vercel',
      category: 'Deploy',
    },
    {
      name: 'deploy',
      script: 'netlify deploy --prod',
      description: 'Deploy to Netlify',
      category: 'Deploy',
    },
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): PackagejsonScriptsManagerService {
    PackagejsonScriptsManagerService.instance ??= new PackagejsonScriptsManagerService();
    return PackagejsonScriptsManagerService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing PackagejsonScriptsManagerService');
    this.logger.info('PackagejsonScriptsManagerService initialized successfully');
  }

  /**
   * Find package.json in workspace
   */
  private async findPackageJson(): Promise<string | undefined> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return undefined;
    }

    const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
      return packageJsonPath;
    } catch {
      return undefined;
    }
  }

  /**
   * Read package.json and extract scripts
   */
  private async readPackageJson(packageJsonPath: string): Promise<PackageJson> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch (error) {
      this.logger.error('Error reading package.json', error);
      throw error;
    }
  }

  /**
   * Write package.json
   */
  private async writePackageJson(packageJsonPath: string, data: PackageJson): Promise<void> {
    try {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(packageJsonPath, content + '\n', 'utf-8');
      this.logger.info('package.json updated successfully');
    } catch (error) {
      this.logger.error('Error writing package.json', error);
      throw error;
    }
  }

  /**
   * Get all scripts from package.json
   */
  public async getScripts(): Promise<NpmScript[]> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      return [];
    }

    const packageJson = await this.readPackageJson(packageJsonPath);
    const scripts: NpmScript[] = [];

    if (packageJson.scripts) {
      for (const [name, script] of Object.entries(packageJson.scripts)) {
        scripts.push({ name, script, description: undefined, isTemplate: false });
      }
    }

    return scripts.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Show main menu for script management
   */
  public async manageScripts(): Promise<void> {
    const config = this.configService.getConfiguration();
    if (!config.packagejsonScriptsManager?.enabled) {
      vscode.window.showInformationMessage('Package.json Scripts Manager is disabled in settings');
      return;
    }

    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      vscode.window.showErrorMessage('No package.json found in workspace');
      return;
    }

    const scripts = await this.getScripts();

    const options: vscode.QuickPickItem[] = [
      { label: '$(play) Run Script', description: 'Execute an npm script' },
      { label: '$(plus) Add Script', description: 'Add a new script to package.json' },
      { label: '$(edit) Edit Script', description: 'Edit an existing script' },
      { label: '$(trash) Delete Script', description: 'Delete a script from package.json' },
      {
        label: '$(template) Add from Template',
        description: 'Add a script from predefined templates',
      },
      { label: '$(list-flat) View All Scripts', description: 'View all scripts in package.json' },
      {
        label: '$(arrow-right) Quick Run Common Tasks',
        description: 'Quick buttons for common npm tasks',
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: `Package.json Scripts Manager (${scripts.length} scripts)`,
    });

    if (!selected) {
      return;
    }

    switch (selected.label) {
      case '$(play) Run Script':
        await this.runScript();
        break;
      case '$(plus) Add Script':
        await this.addScript();
        break;
      case '$(edit) Edit Script':
        await this.editScript();
        break;
      case '$(trash) Delete Script':
        await this.deleteScript();
        break;
      case '$(template) Add from Template':
        await this.addFromTemplate();
        break;
      case '$(list-flat) View All Scripts':
        await this.viewAllScripts();
        break;
      case '$(arrow-right) Quick Run Common Tasks':
        await this.quickRunCommonTasks();
        break;
    }
  }

  /**
   * Run a script via terminal
   */
  public async runScript(scriptName?: string): Promise<void> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      vscode.window.showErrorMessage('No package.json found in workspace');
      return;
    }

    const scripts = await this.getScripts();

    if (scripts.length === 0) {
      vscode.window.showInformationMessage('No scripts found in package.json');
      return;
    }

    let targetScript: NpmScript | undefined;

    if (scriptName) {
      targetScript = scripts.find((s) => s.name === scriptName);
    } else {
      // Create quick pick items with script names
      const items: ScriptQuickPickItem[] = scripts.map((script) => ({
        label: script.name,
        description: script.script,
        script,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a script to run',
      });

      targetScript = selected?.script;
    }

    if (!targetScript) {
      return;
    }

    // Run the script in terminal
    const terminalName = `npm: ${targetScript.name}`;
    const terminal =
      vscode.window.terminals.find((t) => t.name === terminalName) ??
      vscode.window.createTerminal(terminalName);

    terminal.sendText(`npm run ${targetScript.name}`);
    terminal.show();

    vscode.window.showInformationMessage(`Running script: ${targetScript.name}`);
    this.logger.info('Script executed', { name: targetScript.name, script: targetScript.script });
  }

  /**
   * Add a new script
   */
  private async addScript(): Promise<void> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      vscode.window.showErrorMessage('No package.json found in workspace');
      return;
    }

    const scripts = await this.getScripts();
    const existingNames = new Set(scripts.map((s) => s.name));

    const name = await vscode.window.showInputBox({
      prompt: 'Enter script name',
      placeHolder: 'build',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Script name is required';
        }
        if (existingNames.has(value)) {
          return `Script '${value}' already exists`;
        }
        if (!/^[a-z0-9:-]+$/i.test(value)) {
          return 'Script name can only contain letters, numbers, hyphens, and colons';
        }
        return null;
      },
    });

    if (!name) {
      return;
    }

    // Show script templates as suggestions
    const matchingTemplates = this.templates.filter((t) => t.name === name);

    let script = '';
    if (matchingTemplates.length > 0) {
      const templateOptions = matchingTemplates.map((t) => ({
        label: t.script,
        description: t.description,
      }));

      const selected = await vscode.window.showQuickPick(
        [
          ...templateOptions,
          { label: 'Enter custom script', description: 'Write your own script command' },
        ],
        {
          placeHolder: 'Select a template or enter custom script',
        },
      );

      if (selected?.label === 'Enter custom script') {
        script = await this.getScriptInput(name);
      } else if (selected) {
        script = selected.label;
      }
    } else {
      script = await this.getScriptInput(name);
    }

    if (!script) {
      return;
    }

    // Add to package.json
    const packageJson = await this.readPackageJson(packageJsonPath);
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    packageJson.scripts[name] = script;

    await this.writePackageJson(packageJsonPath, packageJson);

    vscode.window.showInformationMessage(`Script '${name}' added successfully`);
    this.logger.info('Script added', { name, script });

    // Ask if user wants to run it now
    const run = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: `Run '${name}' now?`,
    });

    if (run === 'Yes') {
      await this.runScript(name);
    }
  }

  /**
   * Get script input from user with auto-completion
   */
  private async getScriptInput(scriptName: string): Promise<string | undefined> {
    // Show common npm script patterns as suggestions
    const suggestions = [
      'npm run',
      'node',
      'vite',
      'webpack',
      'next',
      'nuxt',
      'nest',
      'jest',
      'vitest',
      'eslint',
      'prettier',
      'biome',
      'tsc',
      'prisma',
      'typeorm',
    ];

    return await vscode.window.showInputBox({
      prompt: 'Enter script command',
      placeHolder: 'vite build',
      value: '',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Script command is required';
        }
        return null;
      },
    });
  }

  /**
   * Edit an existing script
   */
  private async editScript(): Promise<void> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      vscode.window.showErrorMessage('No package.json found in workspace');
      return;
    }

    const scripts = await this.getScripts();

    if (scripts.length === 0) {
      vscode.window.showInformationMessage('No scripts found in package.json');
      return;
    }

    const items: ScriptQuickPickItem[] = scripts.map((script) => ({
      label: script.name,
      description: script.script,
      script,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a script to edit',
    });

    if (!selected) {
      return;
    }

    const newScript = await vscode.window.showInputBox({
      prompt: 'Edit script command',
      value: selected.script.script,
      placeHolder: 'vite build',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Script command is required';
        }
        return null;
      },
    });

    if (!newScript) {
      return;
    }

    // Update package.json
    const packageJson = await this.readPackageJson(packageJsonPath);
    if (packageJson.scripts) {
      packageJson.scripts[selected.script.name] = newScript;
      await this.writePackageJson(packageJsonPath, packageJson);

      vscode.window.showInformationMessage(`Script '${selected.script.name}' updated successfully`);
      this.logger.info('Script updated', { name: selected.script.name, script: newScript });
    }
  }

  /**
   * Delete a script
   */
  private async deleteScript(): Promise<void> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      vscode.window.showErrorMessage('No package.json found in workspace');
      return;
    }

    const scripts = await this.getScripts();

    if (scripts.length === 0) {
      vscode.window.showInformationMessage('No scripts found in package.json');
      return;
    }

    const items: ScriptQuickPickItem[] = scripts.map((script) => ({
      label: script.name,
      description: script.script,
      script,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a script to delete',
    });

    if (!selected) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete '${selected.script.name}'?`,
      { modal: true },
      'Delete',
      'Cancel',
    );

    if (confirm !== 'Delete') {
      return;
    }

    // Delete from package.json
    const packageJson = await this.readPackageJson(packageJsonPath);
    if (packageJson.scripts) {
      delete packageJson.scripts[selected.script.name];
      await this.writePackageJson(packageJsonPath, packageJson);

      vscode.window.showInformationMessage(`Script '${selected.script.name}' deleted successfully`);
      this.logger.info('Script deleted', { name: selected.script.name });
    }
  }

  /**
   * Add script from templates
   */
  private async addFromTemplate(): Promise<void> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      vscode.window.showErrorMessage('No package.json found in workspace');
      return;
    }

    const existingScripts = await this.getScripts();
    const existingNames = new Set(existingScripts.map((s) => s.name));

    // Group templates by category
    const categories = [...new Set(this.templates.map((t) => t.category))];

    // Show category selection
    const categoryOptions = [
      { label: 'All Templates', description: 'Show all available templates' },
      ...categories.map((cat) => ({ label: cat, description: `Templates for ${cat}` })),
    ];

    const selectedCategory = await vscode.window.showQuickPick(categoryOptions, {
      placeHolder: 'Select a template category',
    });

    if (!selectedCategory) {
      return;
    }

    // Filter templates by category
    let filteredTemplates = this.templates;
    if (selectedCategory.label !== 'All Templates') {
      filteredTemplates = this.templates.filter((t) => t.category === selectedCategory.label);
    }

    // Show templates grouped by script name
    const groupedTemplates = new Map<string, ScriptTemplate[]>();
    for (const template of filteredTemplates) {
      const templates = groupedTemplates.get(template.name) ?? [];
      templates.push(template);
      groupedTemplates.set(template.name, templates);
    }

    // Show quick pick with template options
    const templateItems: vscode.QuickPickItem[] = [];
    for (const [name, templates] of groupedTemplates) {
      templateItems.push({
        label: name,
        description: `${name} ${templates.length > 1 ? `(${templates.length} variants)` : ''}`,
        detail: templates[0]!.description,
      });
    }

    const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
      placeHolder: 'Select a template to add',
    });

    if (!selectedTemplate) {
      return;
    }

    const name = selectedTemplate.label;
    const variants = groupedTemplates.get(name)!;

    let template: ScriptTemplate;

    if (variants.length === 1) {
      template = variants[0]!;
    } else {
      // Show variants
      const variantItems = variants.map((v) => ({
        label: v.script,
        description: v.description,
      }));

      const selectedVariant = await vscode.window.showQuickPick(variantItems, {
        placeHolder: `Select a variant for '${name}'`,
      });

      if (!selectedVariant) {
        return;
      }

      template = variants.find((v) => v.script === selectedVariant.label)!;
    }

    // Check if script already exists
    if (existingNames.has(name)) {
      const overwrite = await vscode.window.showWarningMessage(
        `Script '${name}' already exists. Overwrite?`,
        'Overwrite',
        'Cancel',
      );

      if (overwrite !== 'Overwrite') {
        return;
      }
    }

    // Add to package.json
    const packageJson = await this.readPackageJson(packageJsonPath);
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    packageJson.scripts[name] = template.script;

    await this.writePackageJson(packageJsonPath, packageJson);

    vscode.window.showInformationMessage(`Script '${name}' added from template`);
    this.logger.info('Script added from template', {
      name,
      script: template.script,
      template: template.description,
    });
  }

  /**
   * View all scripts
   */
  private async viewAllScripts(): Promise<void> {
    const scripts = await this.getScripts();

    if (scripts.length === 0) {
      vscode.window.showInformationMessage('No scripts found in package.json');
      return;
    }

    // Create a webview panel to display all scripts
    const panel = vscode.window.createWebviewPanel(
      'packagejsonScripts',
      'Package.json Scripts',
      vscode.ViewColumn.One,
      { enableScripts: false },
    );

    // Generate HTML content
    const scriptsHtml = scripts
      .map(
        (s) => `
        <tr>
          <td><code>${this.escapeHtml(s.name)}</code></td>
          <td><code>${this.escapeHtml(s.script)}</code></td>
        </tr>
      `,
      )
      .join('');

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Package.json Scripts</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 1rem;
          }
          h1 {
            color: var(--vscode-foreground);
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            text-align: left;
            padding: 0.5rem;
            border-bottom: 1px solid var(--vscode-widget-border);
          }
          th {
            background-color: var(--vscode-editor-selectionBackground);
          }
          code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
          }
        </style>
      </head>
      <body>
        <h1>Package.json Scripts (${scripts.length})</h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Script</th>
            </tr>
          </thead>
          <tbody>
            ${scriptsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Quick run common tasks
   */
  private async quickRunCommonTasks(): Promise<void> {
    const commonScripts = [
      { name: 'dev', icon: '$(play)' },
      { name: 'build', icon: '$(package)' },
      { name: 'test', icon: '$(beaker)' },
      { name: 'lint', icon: '$(check)' },
      { name: 'format', icon: '$(edit)' },
      { name: 'clean', icon: '$(clear-all)' },
    ];

    const scripts = await this.getScripts();
    const availableScripts = commonScripts.filter((cs) => scripts.some((s) => s.name === cs.name));

    if (availableScripts.length === 0) {
      vscode.window.showInformationMessage('No common scripts found in package.json');
      return;
    }

    const items = availableScripts.map((cs) => ({
      label: `${cs.icon} ${cs.name}`,
      description: scripts.find((s) => s.name === cs.name)!.script,
      scriptName: cs.name,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Quick run common tasks',
    });

    if (!selected) {
      return;
    }

    await this.runScript(selected.scriptName);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]!);
  }

  public dispose(): void {
    this.logger.debug('Disposing PackagejsonScriptsManagerService');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
}
