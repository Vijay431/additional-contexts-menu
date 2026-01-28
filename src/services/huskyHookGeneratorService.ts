import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { ProjectDetectionService } from './projectDetectionService';

/**
 * Service for generating Husky Git hooks with validation and test execution
 */
export class HuskyHookGeneratorService {
  private static instance: HuskyHookGeneratorService | undefined;
  private readonly projectDetectionService: ProjectDetectionService;
  private readonly logger: Logger;

  private constructor(
    projectDetectionService: ProjectDetectionService,
  ) {
    this.projectDetectionService = projectDetectionService;
    this.logger = Logger.getInstance();
  }

  static getInstance(): HuskyHookGeneratorService {
    if (!HuskyHookGeneratorService.instance) {
      HuskyHookGeneratorService.instance = new HuskyHookGeneratorService(
        ProjectDetectionService.getInstance(),
      );
    }
    return HuskyHookGeneratorService.instance;
  }

  /**
   * Checks if a file already exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads a file and returns its content
   */
  private async readFile(filePath: string): Promise<string> {
    const uri = vscode.Uri.file(filePath);
    const data = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(data).toString('utf8');
  }

  /**
   * Generate Husky Git hooks for the current workspace
   */
  async generateHuskyHooks(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating Husky Git hooks...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 20 });

          // Check if Husky is installed
          const hasHusky = await this.checkHuskyInstallation(workspaceFolder.uri.fsPath);
          if (!hasHusky) {
            const install = await vscode.window.showWarningMessage(
              'Husky is not installed. Would you like to install it now?',
              'Install',
              'Cancel',
            );
            if (install === 'Install') {
              await this.installHusky(workspaceFolder.uri.fsPath);
            } else {
              return;
            }
          }
          progress.report({ increment: 40 });

          // Ask which hooks to generate
          const selectedHooks = await this.selectHooksToGenerate();
          if (selectedHooks.length === 0) {
            return;
          }
          progress.report({ increment: 60 });

          // Generate the hooks
          await this.generateHooks(workspaceFolder.uri, selectedHooks, projectInfo);
          progress.report({ increment: 100 });

          this.logger.info('Husky Git hooks generated successfully');
        },
      );
    } catch (error) {
      this.logger.error('Error generating Husky Git hooks', error);
      void vscode.window.showErrorMessage(
        `Failed to generate Husky Git hooks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for hook generation
   */
  private async analyzeProject(projectPath: string): Promise<ProjectHookInfo> {
    const info: ProjectHookInfo = {
      hasTypeScript: false,
      hasTests: false,
      testCommand: 'npm test',
      lintCommand: 'npm run lint',
      formatCommand: 'npm run format',
      packageManager: 'npm',
    };

    // Detect project type
    const projectType = await this.projectDetectionService.detectProjectType();
    info.hasTypeScript = projectType.hasTypeScript;

    // Detect package manager
    if (await this.fileExists(`${projectPath}/pnpm-lock.yaml`)) {
      info.packageManager = 'pnpm';
    } else if (await this.fileExists(`${projectPath}/yarn.lock`)) {
      info.packageManager = 'yarn';
    }

    // Detect test setup
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await this.readFile(packageJsonPath));
      info.hasTests = !!(packageJson.scripts?.test || packageJson.scripts?.['test:watch']);
      info.testCommand = packageJson.scripts?.test || `${info.packageManager} test`;
      info.lintCommand = packageJson.scripts?.lint || `${info.packageManager} run lint`;
      info.formatCommand = packageJson.scripts?.format || `${info.packageManager} run format`;
    } catch {
      // Use defaults
    }

    // Detect lint-staged
    info.hasLintStaged = await this.fileExists(path.join(projectPath, '.lintstagedrc.json')) ||
      await this.fileExists(path.join(projectPath, '.lintstagedrc.cjs')) ||
      await this.fileExists(path.join(projectPath, 'lint-staged.config.js'));

    return info;
  }

  /**
   * Check if Husky is installed
   */
  private async checkHuskyInstallation(projectPath: string): Promise<boolean> {
    const huskyPath = path.join(projectPath, '.husky');
    const hasHuskyDir = await this.fileExists(huskyPath);
    const packageJsonPath = path.join(projectPath, 'package.json');

    try {
      const packageJson = JSON.parse(await this.readFile(packageJsonPath));
      const hasHuskyDep = !!(packageJson.devDependencies?.husky || packageJson.dependencies?.husky);
      return hasHuskyDir && hasHuskyDep;
    } catch {
      return false;
    }
  }

  /**
   * Install Husky
   */
  private async installHusky(projectPath: string): Promise<void> {
    const terminal = vscode.window.createTerminal('Husky Installation');
    terminal.sendText(`cd "${projectPath}"`);
    terminal.sendText('npm install -D husky');
    terminal.sendText('npx husky install');
    terminal.show();

    // Wait for user to complete installation
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Select which hooks to generate
   */
  private async selectHooksToGenerate(): Promise<string[]> {
    const options = [
      { label: 'pre-commit', description: 'Run linting and formatting before commit', picked: true },
      { label: 'pre-push', description: 'Run tests before pushing', picked: true },
      { label: 'commit-msg', description: 'Validate commit message format', picked: false },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      title: 'Select Git Hooks to Generate',
      canPickMany: true,
      placeHolder: 'Choose which hooks to generate',
    });

    return selected?.map(s => s.label) ?? [];
  }

  /**
   * Generate the selected hooks
   */
  private async generateHooks(
    workspaceUri: vscode.Uri,
    hooks: string[],
    projectInfo: ProjectHookInfo,
  ): Promise<void> {
    const huskyPath = vscode.Uri.joinPath(workspaceUri, '.husky');

    // Ensure .husky directory exists
    try {
      await vscode.workspace.fs.createDirectory(huskyPath);
    } catch {
      // Directory might already exist
    }

    for (const hook of hooks) {
      const hookPath = vscode.Uri.joinPath(huskyPath, hook);
      let content = '';

      switch (hook) {
        case 'pre-commit':
          content = this.generatePreCommitHook(projectInfo);
          break;
        case 'pre-push':
          content = this.generatePrePushHook(projectInfo);
          break;
        case 'commit-msg':
          content = this.generateCommitMsgHook();
          break;
      }

      if (content) {
        await vscode.workspace.fs.writeFile(hookPath, Buffer.from(content, 'utf8'));
        // Make hook executable
        const terminal = vscode.window.createTerminal('Make Hook Executable');
        terminal.sendText(`chmod +x "${hookPath.fsPath}"`);
        terminal.sendText('exit');
      }
    }

    void vscode.window.showInformationMessage(
      `Generated ${hooks.length} Husky hook(s): ${hooks.join(', ')}`,
    );
  }

  /**
   * Generate pre-commit hook
   */
  private generatePreCommitHook(info: ProjectHookInfo): string {
    let content = '#!/usr/bin/env sh\n';
    content += '. "$(dirname -- "$0")/_/husky.sh"\n\n';

    if (info.hasLintStaged) {
      content += '# Run lint-staged\n';
      content += `npx lint-staged\n`;
    } else {
      content += '# Run linter\n';
      content += `${info.lintCommand} || exit 1\n\n`;
      content += '# Run formatter\n';
      content += `${info.formatCommand} || exit 1\n`;
    }

    if (info.hasTests) {
      content += '\n# Run tests related to staged files\n';
      content += `npx lint-staged || ${info.testCommand}\n`;
    }

    return content;
  }

  /**
   * Generate pre-push hook
   */
  private generatePrePushHook(info: ProjectHookInfo): string {
    let content = '#!/usr/bin/env sh\n';
    content += '. "$(dirname -- "$0")/_/husky.sh"\n\n';
    content += '# Run full test suite before pushing\n';

    if (info.hasTests) {
      content += `${info.testCommand} || exit 1\n`;
    } else {
      content += '# No tests configured - add a test script to package.json\n';
      content += 'echo "⚠️  No tests configured"\n';
    }

    content += '\n# Check for TypeScript errors\n';
    if (info.hasTypeScript) {
      content += 'npx tsc --noEmit || exit 1\n';
    }

    content += '\necho "✅ Pre-push checks passed"\n';

    return content;
  }

  /**
   * Generate commit-msg hook
   */
  private generateCommitMsgHook(): string {
    let content = '#!/usr/bin/env sh\n';
    content += '. "$(dirname -- "$0")/_/husky.sh"\n\n';
    content += '# Validate commit message format\n';
    content += 'commit_regex="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(.+\\))?: .{1,50}"\n';
    content += 'msg=$(cat $1)\n';
    content += 'if ! echo "$msg" | grep -qE "$commit_regex"; then\n';
    content += '  echo "❌ Invalid commit message format"\n';
    content += '  echo "Expected format: type(scope): description"\n';
    content += '  echo "Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"\n';
    content += '  echo "Example: feat(auth): add user login"\n';
    content += '  exit 1\n';
    content += 'fi\n';
    content += '\necho "✅ Commit message validation passed"\n';

    return content;
  }

  /**
   * Generate a specific hook type
   */
  async generateHookType(hookType: 'pre-commit' | 'pre-push' | 'commit-msg'): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      // Check if Husky is installed
      const hasHusky = await this.checkHuskyInstallation(workspaceFolder.uri.fsPath);
      if (!hasHusky) {
        void vscode.window.showErrorMessage(
          'Husky is not installed. Please run the "Generate Husky Hooks" command first.',
        );
        return;
      }

      // Analyze project
      const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);

      // Generate the hook
      await this.generateHooks(workspaceFolder.uri, [hookType], projectInfo);
    } catch (error) {
      this.logger.error(`Error generating ${hookType} hook`, error);
      void vscode.window.showErrorMessage(
        `Failed to generate ${hookType} hook: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * Project information for Husky hook generation
 */
interface ProjectHookInfo {
  hasTypeScript: boolean;
  hasTests: boolean;
  testCommand: string;
  lintCommand: string;
  formatCommand: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  hasLintStaged?: boolean;
}
