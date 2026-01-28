import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { ProjectDetectionService } from './projectDetectionService';

/**
 * Service for generating GitHub Actions CI/CD workflows for Node.js projects
 */
export class GitHubActionsWorkflowGeneratorService {
  private static instance: GitHubActionsWorkflowGeneratorService | undefined;
  private readonly projectDetectionService: ProjectDetectionService;
  private readonly fileDiscoveryService: FileDiscoveryService;
  private readonly configurationService: ConfigurationService;
  private readonly logger: Logger;

  private constructor(
    projectDetectionService: ProjectDetectionService,
    fileDiscoveryService: FileDiscoveryService,
    configurationService: ConfigurationService,
  ) {
    this.projectDetectionService = projectDetectionService;
    this.fileDiscoveryService = fileDiscoveryService;
    this.configurationService = configurationService;
    this.logger = Logger.getInstance();
  }

  static getInstance(): GitHubActionsWorkflowGeneratorService {
    if (!GitHubActionsWorkflowGeneratorService.instance) {
      GitHubActionsWorkflowGeneratorService.instance = new GitHubActionsWorkflowGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
      );
    }
    return GitHubActionsWorkflowGeneratorService.instance;
  }

  /**
   * Generate GitHub Actions workflow for the current workspace
   */
  async generateWorkflow(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating GitHub Actions workflow...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project to determine workflows
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 40 });

          // Generate workflow content
          const workflowContent = this.buildWorkflowContent(projectInfo);
          progress.report({ increment: 70 });

          // Write workflow file
          await this.writeWorkflow(workspaceFolder.uri, workflowContent);
          progress.report({ increment: 100 });

          this.logger.info('GitHub Actions workflow generated successfully');
        },
      );
    } catch (error) {
      this.logger.error('Error generating GitHub Actions workflow', error);
      void vscode.window.showErrorMessage(
        `Failed to generate GitHub Actions workflow: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for workflow generation
   */
  private async analyzeProject(projectPath: string): Promise<WorkflowProjectInfo> {
    const info: WorkflowProjectInfo = {
      name: '',
      nodeVersion: '20',
      packageManager: 'npm',
      hasTests: false,
      hasBuild: false,
      hasLint: false,
      testCommand: 'test',
      buildCommand: 'build',
      lintCommand: 'lint',
      framework: '',
      deployTarget: 'none',
      cacheDependencies: true,
      matrixStrategy: false,
      nodeVersions: ['18', '20', '22'],
      enableCache: true,
      workflows: [],
      secrets: [],
    };

    // Read package.json if it exists
    const packageJsonPath = `${projectPath}/package.json`;
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      if (packageJsonContent) {
        const packageJson = JSON.parse(packageJsonContent);
        info.name = packageJson.name || 'project';
        info.testCommand = packageJson.scripts?.test || 'test';
        info.buildCommand = packageJson.scripts?.build || 'build';
        info.lintCommand = packageJson.scripts?.lint || 'lint';

        // Detect scripts
        info.hasTests = !!packageJson.scripts?.test;
        info.hasBuild = !!packageJson.scripts?.build;
        info.hasLint = !!packageJson.scripts?.lint;

        // Detect package manager
        const lockFiles = await this.detectLockFiles(projectPath);
        if (lockFiles.hasPnpmLock) {
          info.packageManager = 'pnpm';
        } else if (lockFiles.hasYarnLock) {
          info.packageManager = 'yarn';
        } else if (lockFiles.hasNpmLock) {
          info.packageManager = 'npm';
        }

        // Detect Node version from engines
        if (packageJson.engines?.node) {
          const nodeVersion = packageJson.engines.node.replace(/[^0-9.]/g, '').split('.')[0];
          if (nodeVersion) {
            info.nodeVersion = nodeVersion;
          }
        }
      }
    } catch {
      // No package.json or unable to parse
    }

    // Detect project type and framework
    const projectType = await this.projectDetectionService.detectProjectType();
    info.framework = projectType.frameworks.length > 0 ? projectType.frameworks[0] : '';

    // Detect available workflows
    await this.detectWorkflows(projectPath, info);

    // Detect deployment target
    await this.detectDeploymentTarget(projectPath, info);

    return info;
  }

  /**
   * Detect lock files to determine package manager
   */
  private async detectLockFiles(projectPath: string): Promise<LockFileDetection> {
    const [hasNpmLock, hasYarnLock, hasPnpmLock, hasBunLock] = await Promise.all([
      fs.access(`${projectPath}/package-lock.json`).then(() => true, () => false),
      fs.access(`${projectPath}/yarn.lock`).then(() => true, () => false),
      fs.access(`${projectPath}/pnpm-lock.yaml`).then(() => true, () => false),
      fs.access(`${projectPath}/bun.lockb`).then(() => true, () => false),
    ]);

    return { hasNpmLock, hasYarnLock, hasPnpmLock, hasBunLock };
  }

  /**
   * Detect available workflows based on project structure
   */
  private async detectWorkflows(projectPath: string, info: WorkflowProjectInfo): Promise<void> {
    const workflows: WorkflowType[] = [];

    // Always include CI workflow
    workflows.push('ci');

    // Test workflow
    if (info.hasTests) {
      workflows.push('test');
    }

    // Lint workflow
    if (info.hasLint) {
      workflows.push('lint');
    }

    // Build workflow
    if (info.hasBuild) {
      workflows.push('build');
    }

    // Release workflow
    const hasReleaseConfig = await fs.access(`${projectPath}/.releaserc.json`).then(() => true, () => false);
    if (hasReleaseConfig) {
      workflows.push('release');
    }

    // Security audit workflow
    workflows.push('security');

    // Code quality workflow
    workflows.push('code-quality');

    info.workflows = workflows;
  }

  /**
   * Detect deployment target
   */
  private async detectDeploymentTarget(projectPath: string, info: WorkflowProjectInfo): Promise<void> {
    // Check for deployment configs
    const [
      hasVercel,
      hasNetlify,
      hasServerless,
      hasDockerfile,
    ] = await Promise.all([
      fs.access(`${projectPath}/vercel.json`).then(() => true, () => false),
      fs.access(`${projectPath}/netlify.toml`).then(() => true, () => false),
      fs.access(`${projectPath}/serverless.yml`).then(() => true, () => false),
      fs.access(`${projectPath}/Dockerfile`).then(() => true, () => false),
    ]);

    // Vercel
    if (hasVercel) {
      info.deployTarget = 'vercel';
      info.secrets.push('VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID');
    }
    // Netlify
    else if (hasNetlify) {
      info.deployTarget = 'netlify';
      info.secrets.push('NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID');
    }
    // AWS
    else if (hasServerless) {
      info.deployTarget = 'aws';
      info.secrets.push('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY');
    }
    // Docker
    else if (hasDockerfile) {
      info.deployTarget = 'docker';
      info.secrets.push('DOCKER_USERNAME', 'DOCKER_PASSWORD');
    }
    // npm
    else {
      info.deployTarget = 'npm';
      info.secrets.push('NPM_TOKEN');
    }
  }

  /**
   * Build the GitHub Actions workflow content
   */
  private buildWorkflowContent(info: WorkflowProjectInfo): string {
    const lines: string[] = [];

    // Header
    lines.push('name: CI/CD Pipeline');
    lines.push('');
    lines.push('on:');
    lines.push('  push:');
    lines.push('    branches: [main, develop]');
    lines.push('  pull_request:');
    lines.push('    branches: [main, develop]');
    lines.push('');

    // Jobs section
    lines.push('jobs:');

    // Lint job
    if (info.hasLint && info.workflows.includes('lint')) {
      lines.push(this.buildLintJob(info));
    }

    // Test job
    if (info.hasTests && info.workflows.includes('test')) {
      lines.push(this.buildTestJob(info));
    }

    // Build job
    if (info.hasBuild && info.workflows.includes('build')) {
      lines.push(this.buildBuildJob(info));
    }

    // Security job
    if (info.workflows.includes('security')) {
      lines.push(this.buildSecurityJob(info));
    }

    // Code quality job
    if (info.workflows.includes('code-quality')) {
      lines.push(this.buildCodeQualityJob(info));
    }

    // Deploy job
    if (info.deployTarget !== 'none') {
      lines.push(this.buildDeployJob(info));
    }

    return lines.join('\n');
  }

  /**
   * Build lint job
   */
  private buildLintJob(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('  lint:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout code');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');

    if (info.enableCache) {
      lines.push('      - name: Setup Node.js');
      lines.push(`        uses: actions/setup-node@v4`);
      lines.push(`        with:`);
      lines.push(`          node-version: ${info.nodeVersion}`);
      lines.push(`          cache: '${info.packageManager}'`);
      lines.push('');
    } else {
      lines.push('      - name: Setup Node.js');
      lines.push(`        uses: actions/setup-node@v4`);
      lines.push(`        with:`);
      lines.push(`          node-version: ${info.nodeVersion}`);
      lines.push('');
    }

    lines.push(`      - name: Install dependencies`);
    lines.push(`        run: ${this.getInstallCommand(info.packageManager)}`);
    lines.push('');

    lines.push(`      - name: Run lint`);
    lines.push(`        run: ${this.getRunCommand(info.packageManager, info.lintCommand)}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build test job with matrix strategy
   */
  private buildTestJob(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('  test:');
    lines.push('    runs-on: ubuntu-latest');

    if (info.matrixStrategy) {
      lines.push('    strategy:');
      lines.push('      matrix:');
      lines.push(`        node-version: [${info.nodeVersions.map((v) => `'${v}'`).join(', ')}]`);
      lines.push('');
    }

    lines.push('    steps:');
    lines.push('      - name: Checkout code');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');

    lines.push('      - name: Setup Node.js');
    lines.push('        uses: actions/setup-node@v4');
    if (info.matrixStrategy) {
      lines.push('        with:');
      lines.push('          node-version: ${{" matrix.node-version "}}');
      lines.push(`          cache: '${info.packageManager}'`);
    } else {
      lines.push('        with:');
      lines.push(`          node-version: ${info.nodeVersion}`);
      lines.push(`          cache: '${info.packageManager}'`);
    }
    lines.push('');

    lines.push(`      - name: Install dependencies`);
    lines.push(`        run: ${this.getInstallCommand(info.packageManager)}`);
    lines.push('');

    lines.push(`      - name: Run tests`);
    lines.push(`        run: ${this.getRunCommand(info.packageManager, info.testCommand)}`);
    lines.push('');

    lines.push('      - name: Upload coverage reports');
    lines.push('        if: always()');
    lines.push('        uses: actions/upload-artifact@v4');
    lines.push('        with:');
    lines.push('          name: coverage-${{ "matrix.node-version" }}');
    lines.push('          path: coverage/');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build job
   */
  private buildBuildJob(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('  build:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout code');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');

    lines.push('      - name: Setup Node.js');
    lines.push('        uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push(`          node-version: ${info.nodeVersion}`);
    lines.push(`          cache: '${info.packageManager}'`);
    lines.push('');

    lines.push(`      - name: Install dependencies`);
    lines.push(`        run: ${this.getInstallCommand(info.packageManager)}`);
    lines.push('');

    lines.push(`      - name: Build project`);
    lines.push(`        run: ${this.getRunCommand(info.packageManager, info.buildCommand)}`);
    lines.push('');

    lines.push('      - name: Upload build artifacts');
    lines.push('        uses: actions/upload-artifact@v4');
    lines.push('        with:');
    lines.push('          name: build');
    lines.push('          path: dist/');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Security job
   */
  private buildSecurityJob(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('  security:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout code');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');

    lines.push('      - name: Setup Node.js');
    lines.push('        uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push(`          node-version: ${info.nodeVersion}`);
    lines.push(`          cache: '${info.packageManager}'`);
    lines.push('');

    lines.push('      - name: Run security audit');
    lines.push(`        run: ${this.getAuditCommand(info.packageManager)}`);
    lines.push('');

    lines.push('      - name: Check for vulnerabilities');
    lines.push('        uses: securecodewarrior/github-action-add-sarif@v1');
    lines.push('        if: always()');
    lines.push('        with:');
    lines.push('          sarif-file: security-audit.sarif');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Code quality job
   */
  private buildCodeQualityJob(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('  code-quality:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout code');
    lines.push('        uses: actions/checkout@v4');
    lines.push('      - name: Setup Node.js');
    lines.push('        uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push(`          node-version: ${info.nodeVersion}`);
    lines.push(`          cache: '${info.packageManager}'`);
    lines.push('');

    lines.push(`      - name: Install dependencies`);
    lines.push(`        run: ${this.getInstallCommand(info.packageManager)}`);
    lines.push('');

    lines.push('      - name: Code quality check');
    lines.push('        run: |');
    lines.push('          echo "Running code quality checks..."');
    lines.push('          # Add your code quality tools here');
    lines.push('          # Example: eslint --ext .js,.ts .');
    lines.push('          # Example: prettier --check "src/**/*.{js,ts}"');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Deploy job
   */
  private buildDeployJob(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('  deploy:');
    lines.push('    needs: [lint, test, build]');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    if: github.ref == \'refs/heads/main\' && github.event_name == \'push\'');
    lines.push('');

    lines.push('    steps:');
    lines.push('      - name: Checkout code');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');

    lines.push('      - name: Setup Node.js');
    lines.push('        uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push(`          node-version: ${info.nodeVersion}`);
    lines.push(`          cache: '${info.packageManager}'`);
    lines.push('');

    lines.push(`      - name: Install dependencies`);
    lines.push(`        run: ${this.getInstallCommand(info.packageManager)}`);
    lines.push('');

    lines.push(`      - name: Build project`);
    lines.push(`        run: ${this.getRunCommand(info.packageManager, info.buildCommand)}`);
    lines.push('');

    // Deploy target specific steps
    switch (info.deployTarget) {
      case 'vercel':
        lines.push(this.buildVercelDeploySteps());
        break;
      case 'netlify':
        lines.push(this.buildNetlifyDeploySteps());
        break;
      case 'docker':
        lines.push(this.buildDockerDeploySteps(info));
        break;
      case 'npm':
        lines.push(this.buildNpmDeploySteps());
        break;
      default:
        lines.push('      - name: Deploy');
        lines.push('        run: echo "Add your deployment steps here"');
        lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Build Vercel deploy steps
   */
  private buildVercelDeploySteps(): string {
    const lines: string[] = [];
    lines.push('      - name: Deploy to Vercel');
    lines.push('        uses: amondnet/vercel-action@v25');
    lines.push('        with:');
    lines.push('          vercel-token: ${{" secrets.VERCEL_TOKEN "}}');
    lines.push('          vercel-org-id: ${{" secrets.VERCEL_ORG_ID "}}');
    lines.push('          vercel-project-id: ${{" secrets.VERCEL_PROJECT_ID "}}');
    lines.push('          vercel-args: \'--prod\'');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build Netlify deploy steps
   */
  private buildNetlifyDeploySteps(): string {
    const lines: string[] = [];
    lines.push('      - name: Deploy to Netlify');
    lines.push('        uses: nwtgck/actions-netlify@v2.1');
    lines.push('        with:');
    lines.push('          publish-dir: \'./dist\'');
    lines.push('          production-branch: main');
    lines.push('          github-token: ${{" secrets.GITHUB_TOKEN "}}');
    lines.push('          deploy-message: "Deploy from GitHub Actions"');
    lines.push('        env:');
    lines.push('          NETLIFY_AUTH_TOKEN: ${{" secrets.NETLIFY_AUTH_TOKEN "}}');
    lines.push('          NETLIFY_SITE_ID: ${{" secrets.NETLIFY_SITE_ID "}}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build Docker deploy steps
   */
  private buildDockerDeploySteps(info: WorkflowProjectInfo): string {
    const lines: string[] = [];
    lines.push('      - name: Set up Docker Buildx');
    lines.push('        uses: docker/setup-buildx-action@v3');
    lines.push('');

    lines.push('      - name: Login to Docker Hub');
    lines.push('        uses: docker/login-action@v3');
    lines.push('        with:');
    lines.push('          username: ${{" secrets.DOCKER_USERNAME "}}');
    lines.push('          password: ${{" secrets.DOCKER_PASSWORD "}}');
    lines.push('');

    lines.push('      - name: Build and push Docker image');
    lines.push('        uses: docker/build-push-action@v5');
    lines.push('        with:');
    lines.push('          context: .');
    lines.push('          push: true');
    lines.push(`          tags: \${{ secrets.DOCKER_USERNAME }}/${info.name}:latest`);
    lines.push('          cache-from: type=gha');
    lines.push('          cache-to: type=gha,mode=max');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build npm deploy steps
   */
  private buildNpmDeploySteps(): string {
    const lines: string[] = [];
    lines.push('      - name: Publish to npm');
    lines.push('        run: npm publish');
    lines.push('        env:');
    lines.push('          NODE_AUTH_TOKEN: ${{" secrets.NPM_TOKEN "}}');
    lines.push('');

    return lines.join('\n');
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
   * Get run command based on package manager
   */
  private getRunCommand(packageManager: string, script: string): string {
    switch (packageManager) {
      case 'yarn':
        return `yarn ${script}`;
      case 'pnpm':
        return `pnpm run ${script}`;
      case 'bun':
        return `bun run ${script}`;
      default:
        return `npm run ${script}`;
    }
  }

  /**
   * Get audit command based on package manager
   */
  private getAuditCommand(packageManager: string): string {
    switch (packageManager) {
      case 'yarn':
        return 'yarn audit';
      case 'pnpm':
        return 'pnpm audit';
      case 'bun':
        return 'bun audit';
      default:
        return 'npm audit';
    }
  }

  /**
   * Write workflow to file
   */
  private async writeWorkflow(workspaceUri: vscode.Uri, content: string): Promise<void> {
    const workflowsDir = vscode.Uri.joinPath(workspaceUri, '.github', 'workflows');

    // Create .github/workflows directory if it doesn't exist
    try {
      await vscode.workspace.fs.createDirectory(workflowsDir);
    } catch (error) {
      // Directory might already exist, ignore error
    }

    const workflowPath = vscode.Uri.joinPath(workflowsDir, 'ci.yml');

    // Check if workflow file already exists
    const workflowExists = await fs
      .access(workflowPath.fsPath)
      .then(() => true)
      .catch(() => false);

    if (workflowExists) {
      const choice = await vscode.window.showWarningMessage(
        'ci.yml workflow already exists. Do you want to overwrite it?',
        'Overwrite',
        'Cancel',
      );

      if (choice !== 'Overwrite') {
        return;
      }
    }

    // Write the workflow file
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(workflowPath, encoder.encode(content));

    // Open the workflow file
    const doc = await vscode.workspace.openTextDocument(workflowPath);
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage('GitHub Actions workflow generated successfully at .github/workflows/ci.yml');
  }
}

/**
 * Project information for workflow generation
 */
interface WorkflowProjectInfo {
  name: string;
  nodeVersion: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  hasTests: boolean;
  hasBuild: boolean;
  hasLint: boolean;
  testCommand: string;
  buildCommand: string;
  lintCommand: string;
  framework: string;
  deployTarget: 'vercel' | 'netlify' | 'docker' | 'npm' | 'aws' | 'none';
  cacheDependencies: boolean;
  matrixStrategy: boolean;
  nodeVersions: string[];
  enableCache: boolean;
  workflows: WorkflowType[];
  secrets: string[];
}

type WorkflowType = 'ci' | 'test' | 'build' | 'lint' | 'security' | 'code-quality' | 'release' | 'deploy';

interface LockFileDetection {
  hasNpmLock: boolean;
  hasYarnLock: boolean;
  hasPnpmLock: boolean;
  hasBunLock: boolean;
}
