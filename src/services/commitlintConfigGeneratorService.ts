import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { FileSaveService } from './fileSaveService';
import { ProjectDetectionService } from './projectDetectionService';
import { Logger } from '../utils/logger';

/**
 * CommitLint configuration types and interfaces
 */
interface CommitLintConfig {
  extends?: string[];
  rules?: Record<string, RuleConfig>;
  parserPreset?: string;
  formatter?: string;
}

type RuleConfig = [number, ...unknown[]];

interface CommitlintProjectInfo {
  hasConventionalChangelog: boolean;
  hasHusky: boolean;
  hasPackageJson: boolean;
  commitMessageTypes: CommitMessageType[];
  configFormat: 'json' | 'js' | 'ts';
  scopes: string[];
}

type CommitMessageType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

/**
 * Service for generating CommitLint configuration for commit message validation.
 * Generates conventional commit rules with custom pattern support.
 */
export class CommitlintConfigGeneratorService {
  private static instance: CommitlintConfigGeneratorService | undefined;
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

  static getInstance(): CommitlintConfigGeneratorService {
    if (!CommitlintConfigGeneratorService.instance) {
      CommitlintConfigGeneratorService.instance = new CommitlintConfigGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
        FileSaveService.getInstance(),
      );
    }
    return CommitlintConfigGeneratorService.instance;
  }

  /**
   * Generate CommitLint configuration for the current workspace
   */
  async generateCommitlintConfig(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating CommitLint configuration...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 30 });

          // Generate CommitLint configuration
          const config = this.buildCommitlintConfig(projectInfo);
          progress.report({ increment: 60 });

          // Write configuration file
          await this.writeCommitlintConfig(workspaceFolder.uri, config, projectInfo);
          progress.report({ increment: 90 });

          // Show next steps
          this.showNextSteps(projectInfo);
          progress.report({ increment: 100 });

          Logger.info('CommitLint configuration generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating CommitLint configuration', error);
      void vscode.window.showErrorMessage(
        `Failed to generate CommitLint configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for CommitLint configuration
   */
  private async analyzeProject(projectPath: string): Promise<CommitlintProjectInfo> {
    const info: CommitlintProjectInfo = {
      hasConventionalChangelog: false,
      hasHusky: false,
      hasPackageJson: false,
      commitMessageTypes: [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
      configFormat: 'json',
      scopes: [],
    };

    try {
      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonExists = await this.fileExists(packageJsonPath);

      if (packageJsonExists) {
        info.hasPackageJson = true;

        try {
          const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);

          // Check for conventional-changelog dependency
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };
          info.hasConventionalChangelog = Object.keys(deps).some(
            (dep) => dep.includes('conventional-changelog') || dep.includes('@commitlint'),
          );
          info.hasHusky = Object.keys(deps).some((dep) => dep.includes('husky'));

          // Extract scopes from package.json if available
          if (packageJson.commitlint && packageJson.commitlint.rules) {
            // This could be extended to parse existing commitlint config
          }
        } catch (error) {
          Logger.warn('Error parsing package.json', error);
        }
      }

      // Check for existing commitlint config to determine format
      const existingConfig = await this.findExistingCommitlintConfig(projectPath);
      if (existingConfig) {
        info.configFormat = this.getConfigFormat(existingConfig);
      }
    } catch (error) {
      Logger.warn('Error analyzing project for CommitLint', error);
    }

    return info;
  }

  /**
   * Find existing CommitLint configuration file
   */
  private async findExistingCommitlintConfig(
    projectPath: string,
  ): Promise<string | null> {
    const configFiles = [
      'commitlint.config.js',
      'commitlint.config.ts',
      'commitlint.config.cjs',
      '.commitlintrc',
      '.commitlintrc.json',
      '.commitlintrc.yaml',
      '.commitlintrc.yml',
      '.commitlintrc.js',
      '.commitlintrc.cjs',
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  /**
   * Determine config format from filename
   */
  private getConfigFormat(filePath: string): 'json' | 'js' | 'ts' {
    if (filePath.endsWith('.json') || filePath.endsWith('.rc') || filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
      return 'json';
    }
    if (filePath.endsWith('.ts')) {
      return 'ts';
    }
    return 'js';
  }

  /**
   * Build CommitLint configuration object
   */
  private buildCommitlintConfig(projectInfo: CommitlintProjectInfo): CommitLintConfig {
    const config: CommitLintConfig = {
      extends: ['@commitlint/config-conventional'],
    };

    config.rules = {
      // Type rules
      'type-enum': [2, 'always', projectInfo.commitMessageTypes],
      'type-case': [2, 'always', 'lower-case'],
      'type-empty': [2, 'never'],
      'type-min-length': [2, 'always', 2],

      // Scope rules
      'scope-enum': projectInfo.scopes.length > 0 ? [2, 'always', projectInfo.scopes] : [0],
      'scope-case': [2, 'always', 'lower-case'],
      'scope-empty': [0, 'always'], // Allow empty scope

      // Subject rules
      'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
      'subject-empty': [2, 'never'],
      'subject-full-stop': [2, 'never', '.'],
      'subject-min-length': [2, 'always', 3],
      'subject-max-length': [2, 'always', 72],

      // Body rules
      'body-max-line-length': [2, 'always', 100],

      // Footer rules
      'footer-max-line-length': [2, 'always', 100],

      // Header rules
      'header-max-length': [2, 'always', 100],
    };

    return config;
  }

  /**
   * Format config as JSON string
   */
  private formatConfigAsJson(config: CommitLintConfig): string {
    return JSON.stringify(config, null, 2) + '\n';
  }

  /**
   * Format config as JavaScript module
   */
  private formatConfigAsJs(config: CommitLintConfig): string {
    return `module.exports = ${JSON.stringify(config, null, 2)};\n`;
  }

  /**
   * Format config as TypeScript module
   */
  private formatConfigAsTs(config: CommitLintConfig): string {
    return `import type { UserConfig } from '@commitlint/types';

const config: UserConfig = ${JSON.stringify(config, null, 2)};

export default config;\n`;
  }

  /**
   * Write CommitLint configuration file
   */
  private async writeCommitlintConfig(
    workspaceUri: vscode.Uri,
    config: CommitLintConfig,
    projectInfo: CommitlintProjectInfo,
  ): Promise<void> {
    const workspacePath = workspaceUri.fsPath;

    // Determine filename based on format
    let configFileName: string;
    let configContent: string;

    switch (projectInfo.configFormat) {
      case 'ts':
        configFileName = 'commitlint.config.ts';
        configContent = this.formatConfigAsTs(config);
        break;
      case 'js':
        configFileName = 'commitlint.config.js';
        configContent = this.formatConfigAsJs(config);
        break;
      default:
        configFileName = 'commitlint.config.js';
        configContent = this.formatConfigAsJs(config);
    }

    const configFilePath = path.join(workspacePath, configFileName);

    // Check if file already exists
    const fileExists = await this.fileExists(configFilePath);

    if (fileExists) {
      const overwrite = await vscode.window.showWarningMessage(
        `CommitLint configuration file (${configFileName}) already exists. Overwrite?`,
        'Yes',
        'No',
      );

      if (overwrite !== 'Yes') {
        Logger.info('CommitLint configuration generation cancelled by user');
        return;
      }
    }

    // Write the configuration file
    await fs.writeFile(configFilePath, configContent, 'utf-8');

    Logger.info(`CommitLint configuration written to: ${configFilePath}`);
    void vscode.window.showInformationMessage(`CommitLint configuration created: ${configFileName}`);
  }

  /**
   * Show next steps to the user
   */
  private showNextSteps(projectInfo: CommitlintProjectInfo): void {
    const steps: string[] = [];

    if (!projectInfo.hasHusky) {
      steps.push('1. Install husky: npm install -D husky');
      steps.push('2. Initialize husky: npx husky install');
      steps.push('3. Add commitlint hook: npx husky add .husky/commit-msg "npx --no -- commitlint --edit $1"');
    } else {
      steps.push('1. Add commit-msg hook to .husky folder: npx husky add .husky/commit-msg "npx --no -- commitlint --edit $1"');
    }

    if (!projectInfo.hasConventionalChangelog) {
      steps.push('2. Install commitlint CLI: npm install -D @commitlint/cli @commitlint/config-conventional');
    }

    if (steps.length > 0) {
      void vscode.window.showInformationMessage(
        `CommitLint configuration generated! Next steps:\n${steps.join('\n')}`,
      );
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
