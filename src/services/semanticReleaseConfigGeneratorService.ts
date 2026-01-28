import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { FileSaveService } from './fileSaveService';
import { ProjectDetectionService } from './projectDetectionService';
import { Logger } from '../utils/logger';

/**
 * semantic-release configuration types and interfaces
 */
interface SemanticReleaseConfig {
  branches?: string[] | Record<string, string[]>;
  plugins?: string[];
  preset?: string;
  tagFormat?: string;
  verifyConditions?: string[];
  analyzeCommits?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  verifyRelease?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  generateNotes?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  prepare?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  publish?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  success?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  fail?: (string | { path?: string; presetName?: string; [key: string]: unknown })[];
  ci?: boolean;
  npmPublish?: boolean;
  repositoryUrl?: string;
}

interface SemanticReleaseProjectInfo {
  hasPackageJson: boolean;
  hasGit: boolean;
  hasHusky: boolean;
  hasCommitlint: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  repoUrl?: string;
  packageName?: string;
  registry?: 'npm' | 'github';
  hasGitHubActions: boolean;
  configFormat: 'json' | 'js' | 'ts';
}

/**
 * Service for generating semantic-release configuration for automated versioning.
 * Generates release notes, changelog generation, and package publishing setup.
 */
export class SemanticReleaseConfigGeneratorService {
  private static instance: SemanticReleaseConfigGeneratorService | undefined;
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

  static getInstance(): SemanticReleaseConfigGeneratorService {
    if (!SemanticReleaseConfigGeneratorService.instance) {
      SemanticReleaseConfigGeneratorService.instance = new SemanticReleaseConfigGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
        FileSaveService.getInstance(),
      );
    }
    return SemanticReleaseConfigGeneratorService.instance;
  }

  /**
   * Generate semantic-release configuration for the current workspace
   */
  async generateSemanticReleaseConfig(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating semantic-release configuration...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 30 });

          // Generate semantic-release configuration
          const config = this.buildSemanticReleaseConfig(projectInfo);
          progress.report({ increment: 60 });

          // Write configuration file
          await this.writeSemanticReleaseConfig(workspaceFolder.uri, config, projectInfo);
          progress.report({ increment: 80 });

          // Generate CI workflow if needed
          await this.generateCIWorkflow(workspaceFolder.uri, projectInfo);
          progress.report({ increment: 90 });

          // Show next steps
          this.showNextSteps(projectInfo);
          progress.report({ increment: 100 });

          Logger.info('semantic-release configuration generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating semantic-release configuration', error);
      void vscode.window.showErrorMessage(
        `Failed to generate semantic-release configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for semantic-release configuration
   */
  private async analyzeProject(projectPath: string): Promise<SemanticReleaseProjectInfo> {
    const info: SemanticReleaseProjectInfo = {
      hasPackageJson: false,
      hasGit: false,
      hasHusky: false,
      hasCommitlint: false,
      packageManager: 'npm',
      registry: 'npm',
      hasGitHubActions: false,
      configFormat: 'js',
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

          info.packageName = packageJson.name;

          // Detect package manager from lock files
          const lockFiles = await this.detectLockFiles(projectPath);
          if (lockFiles.hasPnpmLock) {
            info.packageManager = 'pnpm';
          } else if (lockFiles.hasYarnLock) {
            info.packageManager = 'yarn';
          } else if (lockFiles.hasBunLock) {
            info.packageManager = 'bun';
          } else if (lockFiles.hasNpmLock) {
            info.packageManager = 'npm';
          }

          // Check for existing semantic-release plugins
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };
          info.hasHusky = Object.keys(deps).some((dep) => dep.includes('husky'));
          info.hasCommitlint = Object.keys(deps).some((dep) => dep.includes('@commitlint'));

          // Check if it's a GitHub package (publishes to GitHub Packages)
          if (packageJson.publishConfig?.registry) {
            info.registry = packageJson.publishConfig.registry.includes('github') ? 'github' : 'npm';
          }

          // Try to get repository URL
          if (packageJson.repository) {
            if (typeof packageJson.repository === 'string') {
              info.repoUrl = packageJson.repository;
            } else if (packageJson.repository.url) {
              info.repoUrl = packageJson.repository.url;
            }
          }
        } catch (error) {
          Logger.warn('Error parsing package.json', error);
        }
      }

      // Check for git repository
      const gitDir = path.join(projectPath, '.git');
      info.hasGit = await this.fileExists(gitDir);

      // Check for GitHub Actions workflow
      const githubActionsDir = path.join(projectPath, '.github', 'workflows');
      const githubActionsExists = await this.fileExists(githubActionsDir);
      if (githubActionsExists) {
        info.hasGitHubActions = true;
      }

      // Check for existing semantic-release config to determine format
      const existingConfig = await this.findExistingSemanticReleaseConfig(projectPath);
      if (existingConfig) {
        info.configFormat = this.getConfigFormat(existingConfig);
      }
    } catch (error) {
      Logger.warn('Error analyzing project for semantic-release', error);
    }

    return info;
  }

  /**
   * Detect lock files to determine package manager
   */
  private async detectLockFiles(projectPath: string): Promise<{
    hasNpmLock: boolean;
    hasYarnLock: boolean;
    hasPnpmLock: boolean;
    hasBunLock: boolean;
  }> {
    const [hasNpmLock, hasYarnLock, hasPnpmLock, hasBunLock] = await Promise.all([
      this.fileExists(path.join(projectPath, 'package-lock.json')),
      this.fileExists(path.join(projectPath, 'yarn.lock')),
      this.fileExists(path.join(projectPath, 'pnpm-lock.yaml')),
      this.fileExists(path.join(projectPath, 'bun.lockb')),
    ]);

    return { hasNpmLock, hasYarnLock, hasPnpmLock, hasBunLock };
  }

  /**
   * Find existing semantic-release configuration file
   */
  private async findExistingSemanticReleaseConfig(projectPath: string): Promise<string | null> {
    const configFiles = [
      '.releaserc.json',
      '.releaserc',
      '.releaserc.yaml',
      '.releaserc.yml',
      '.releaserc.js',
      '.releaserc.cjs',
      'release.config.json',
      'release.config.js',
      'release.config.cjs',
      'release.config.ts',
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
    if (
      filePath.endsWith('.json') ||
      filePath.endsWith('.rc') ||
      filePath.endsWith('.yml') ||
      filePath.endsWith('.yaml')
    ) {
      return 'json';
    }
    if (filePath.endsWith('.ts')) {
      return 'ts';
    }
    return 'js';
  }

  /**
   * Build semantic-release configuration object
   */
  private buildSemanticReleaseConfig(projectInfo: SemanticReleaseProjectInfo): SemanticReleaseConfig {
    const config: SemanticReleaseConfig = {};

    // Branches configuration
    config.branches = ['main', 'master', 'next', 'beta', { name: 'alpha', prerelease: true }];

    // Plugins
    config.plugins = [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      '@semantic-release/changelog',
      '@semantic-release/npm',
      '@semantic-release/github',
      '@semantic-release/git',
    ];

    // Tag format
    config.tagFormat = 'v${version}';

    // Changelog file config
    const changelogConfig = {
      changelogFile: 'CHANGELOG.md',
      changelogTitle: '# Changelog\n\nAll notable changes to this project will be documented in this file.',
    };

    // Add changelog config to plugins
    if (config.generateNotes) {
      config.generateNotes.push(changelogConfig as any);
    }

    // CI=true ensures semantic-release runs in CI environments
    config.ci = true;

    // Configure publishing
    config.npmPublish = projectInfo.registry === 'npm';

    // Set repository URL if available
    if (projectInfo.repoUrl) {
      config.repositoryUrl = projectInfo.repoUrl;
    }

    return config;
  }

  /**
   * Format config as JSON string
   */
  private formatConfigAsJson(config: SemanticReleaseConfig): string {
    return JSON.stringify(config, null, 2) + '\n';
  }

  /**
   * Format config as JavaScript module
   */
  private formatConfigAsJs(config: SemanticReleaseConfig): string {
    return `module.exports = ${JSON.stringify(config, null, 2)};\n`;
  }

  /**
   * Format config as TypeScript module
   */
  private formatConfigAsTs(config: SemanticReleaseConfig): string {
    return `import type { Configuration } from 'semantic-release';

const config: Configuration = ${JSON.stringify(config, null, 2)};

export default config;\n`;
  }

  /**
   * Write semantic-release configuration file
   */
  private async writeSemanticReleaseConfig(
    workspaceUri: vscode.Uri,
    config: SemanticReleaseConfig,
    projectInfo: SemanticReleaseProjectInfo,
  ): Promise<void> {
    const workspacePath = workspaceUri.fsPath;

    // Determine filename based on format
    let configFileName: string;
    let configContent: string;

    switch (projectInfo.configFormat) {
      case 'ts':
        configFileName = '.releaserc.ts';
        configContent = this.formatConfigAsTs(config);
        break;
      case 'json':
        configFileName = '.releaserc.json';
        configContent = this.formatConfigAsJson(config);
        break;
      default:
        configFileName = '.releaserc.js';
        configContent = this.formatConfigAsJs(config);
    }

    const configFilePath = path.join(workspacePath, configFileName);

    // Check if file already exists
    const fileExists = await this.fileExists(configFilePath);

    if (fileExists) {
      const overwrite = await vscode.window.showWarningMessage(
        `semantic-release configuration file (${configFileName}) already exists. Overwrite?`,
        'Yes',
        'No',
      );

      if (overwrite !== 'Yes') {
        Logger.info('semantic-release configuration generation cancelled by user');
        return;
      }
    }

    // Write the configuration file
    await fs.writeFile(configFilePath, configContent, 'utf-8');

    Logger.info(`semantic-release configuration written to: ${configFilePath}`);
    void vscode.window.showInformationMessage(`semantic-release configuration created: ${configFileName}`);
  }

  /**
   * Generate GitHub Actions workflow for semantic-release
   */
  private async generateCIWorkflow(
    workspaceUri: vscode.Uri,
    projectInfo: SemanticReleaseProjectInfo,
  ): Promise<void> {
    if (projectInfo.hasGitHubActions) {
      Logger.info('GitHub Actions workflow already exists, skipping generation');
      return;
    }

    const workflowsDir = path.join(workspaceUri.fsPath, '.github', 'workflows');

    // Create .github/workflows directory if it doesn't exist
    try {
      await fs.mkdir(workflowsDir, { recursive: true });
    } catch (error) {
      Logger.warn('Error creating .github/workflows directory', error);
    }

    const workflowContent = this.buildGitHubActionsWorkflow(projectInfo);
    const workflowPath = path.join(workflowsDir, 'release.yml');

    // Check if workflow already exists
    const workflowExists = await this.fileExists(workflowPath);

    if (!workflowExists) {
      await fs.writeFile(workflowPath, workflowContent, 'utf-8');
      Logger.info(`GitHub Actions release workflow created: ${workflowPath}`);
    }
  }

  /**
   * Build GitHub Actions workflow content
   */
  private buildGitHubActionsWorkflow(projectInfo: SemanticReleaseProjectInfo): string {
    const installCommand = this.getInstallCommand(projectInfo.packageManager);

    return `name: Release

on:
  push:
    branches:
      - main
      - master
      - next
      - beta
      - alpha

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: '${projectInfo.packageManager}'

      - name: Install dependencies
        run: ${installCommand}

      - name: Release
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
`;
  }

  /**
   * Get install command based on package manager
   */
  private getInstallCommand(packageManager: string): string {
    switch (packageManager) {
      case 'yarn':
        return 'yarn install --frozen-lockfile';
      case 'pnpm':
        return 'pnpm install --frozen-lockfile';
      case 'bun':
        return 'bun install';
      default:
        return 'npm ci';
    }
  }

  /**
   * Show next steps to the user
   */
  private showNextSteps(projectInfo: SemanticReleaseProjectInfo): void {
    const steps: string[] = [];

    // Install semantic-release
    steps.push(`1. Install semantic-release: ${this.getInstallCommand(projectInfo.packageManager).replace('install', 'install -D semantic-release @semantic-release/git @semantic-release/changelog')}`);

    // GitHub token setup
    if (projectInfo.registry === 'npm') {
      steps.push('2. Create NPM_TOKEN secret in GitHub repository settings');
    } else {
      steps.push('2. Ensure GITHUB_TOKEN has correct permissions in GitHub repository settings');
    }

    // Initial release
    steps.push('3. Push to main branch to trigger first release');

    // Notes
    if (projectInfo.registry === 'npm') {
      steps.push('');
      steps.push('Note: For npm packages, you must:');
      steps.push('- Create an npm account');
      steps.push('- Create an npm token (automation token)');
      steps.push('- Add NPM_TOKEN as a secret in GitHub repository settings');
    }

    if (steps.length > 0) {
      void vscode.window.showInformationMessage(
        `semantic-release configuration generated! Next steps:\n${steps.join('\n')}`,
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
