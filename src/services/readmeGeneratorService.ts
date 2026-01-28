import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { ProjectDetectionService } from './projectDetectionService';

/**
 * Service for generating comprehensive README files from project analysis
 */
export class ReadmeGeneratorService {
  private static instance: ReadmeGeneratorService | undefined;
  private readonly projectDetectionService: ProjectDetectionService;
  private readonly fileDiscoveryService: FileDiscoveryService;
  private readonly configurationService: ConfigurationService;

  private constructor(
    projectDetectionService: ProjectDetectionService,
    fileDiscoveryService: FileDiscoveryService,
    configurationService: ConfigurationService,
  ) {
    this.projectDetectionService = projectDetectionService;
    this.fileDiscoveryService = fileDiscoveryService;
    this.configurationService = configurationService;
  }

  static getInstance(): ReadmeGeneratorService {
    if (!ReadmeGeneratorService.instance) {
      ReadmeGeneratorService.instance = new ReadmeGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
      );
    }
    return ReadmeGeneratorService.instance;
  }

  /**
   * Generate a comprehensive README for the current workspace
   */
  async generateReadme(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating README...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 50 });

          // Generate README content
          const readmeContent = this.buildReadmeContent(projectInfo);
          progress.report({ increment: 80 });

          // Write or update README
          await this.writeReadme(workspaceFolder.uri, readmeContent);
          progress.report({ increment: 100 });

          Logger.info('README generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating README', error);
      void vscode.window.showErrorMessage(
        `Failed to generate README: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for README generation
   */
  private async analyzeProject(projectPath: string): Promise<ProjectReadmeInfo> {
    const info: ProjectReadmeInfo = {
      name: '',
      description: '',
      version: '',
      author: '',
      license: '',
      repository: '',
      features: [],
      framework: '',
      buildTool: '',
      testFramework: '',
      language: '',
      hasBadges: false,
      scripts: {},
    };

    // Read package.json if it exists
    const packageJsonPath = `${projectPath}/package.json`;
    try {
      const packageJsonContent = await this.fileDiscoveryService.readFile(packageJsonPath);
      if (packageJsonContent) {
        const packageJson = JSON.parse(packageJsonContent);
        info.name = packageJson.name || '';
        info.description = packageJson.description || '';
        info.version = packageJson.version || '';
        info.author = packageJson.author || '';
        info.license = packageJson.license || '';
        info.repository = packageJson.repository?.url || '';
        info.scripts = packageJson.scripts || {};
      }
    } catch {
      // No package.json or unable to parse
    }

    // Detect project type and framework
    const projectType = await this.projectDetectionService.detectProjectType(projectPath);
    info.framework = projectType.primaryType;
    info.language = projectType.language;

    // Detect build tools
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/webpack.config.js`)) {
      info.buildTool = 'Webpack';
    } else if (
      (await this.fileDiscoveryService.fileExists(`${projectPath}/vite.config.js`)) ||
      (await this.fileDiscoveryService.fileExists(`${projectPath}/vite.config.ts`))
    ) {
      info.buildTool = 'Vite';
    } else if (await this.fileDiscoveryService.fileExists(`${projectPath}/rollup.config.js`)) {
      info.buildTool = 'Rollup';
    } else if (await this.fileDiscoveryService.fileExists(`${projectPath}/tsconfig.json`)) {
      info.buildTool = 'TypeScript';
    }

    // Detect test frameworks
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/jest.config.js`)) {
      info.testFramework = 'Jest';
    } else if (await this.fileDiscoveryService.fileExists(`${projectPath}/vitest.config.ts`)) {
      info.testFramework = 'Vitest';
    } else if (await this.fileDiscoveryService.fileExists(`${projectPath}/playwright.config.ts`)) {
      info.testFramework = 'Playwright';
    }

    // Detect features based on dependencies and files
    await this.detectFeatures(projectPath, info);

    return info;
  }

  /**
   * Detect features based on project structure and dependencies
   */
  private async detectFeatures(projectPath: string, info: ProjectReadmeInfo): Promise<void> {
    const features: string[] = [];

    // Check for common feature indicators
    const featureChecks: Record<string, string[]> = {
      Authentication: ['src/auth/', 'src/middleware/auth.ts', 'auth/'],
      'Database Integration': ['src/db/', 'prisma/', 'drizzle/', 'src/database/'],
      'API Routes': ['src/api/', 'pages/api/', 'src/routes/'],
      Testing: ['test/', 'tests/', '__tests__/', '*.test.ts', '*.spec.ts'],
      Documentation: ['docs/', 'README.md', 'CONTRIBUTING.md'],
      'Docker Support': ['Dockerfile', 'docker-compose.yml'],
      'CI/CD': ['.github/workflows/', '.gitlab-ci.yml', 'Jenkinsfile'],
      Linting: ['.eslintrc', '.biomeirc', 'prettier.config.js'],
      TypeScript: ['tsconfig.json'],
    };

    for (const [feature, patterns] of Object.entries(featureChecks)) {
      for (const pattern of patterns) {
        const files = await this.fileDiscoveryService.findFiles(pattern, projectPath);
        if (files.length > 0) {
          features.push(feature);
          break;
        }
      }
    }

    info.features = features;
    info.hasBadges = features.length > 0;
  }

  /**
   * Build the README content from project information
   */
  private buildReadmeContent(info: ProjectReadmeInfo): string {
    const lines: string[] = [];

    // Title and description
    if (info.name) {
      lines.push(`# ${info.name}`);
      lines.push('');
    }

    if (info.description) {
      lines.push(info.description);
      lines.push('');
    }

    // Badges section
    if (info.hasBadges) {
      lines.push('## Badges');
      lines.push('');
      lines.push(this.buildBadgesSection(info));
      lines.push('');
    }

    // Features section
    if (info.features.length > 0) {
      lines.push('## Features');
      lines.push('');
      for (const feature of info.features) {
        lines.push(`- ${feature}`);
      }
      lines.push('');
    }

    // Installation section
    lines.push('## Installation');
    lines.push('');
    lines.push(this.buildInstallationSection(info));
    lines.push('');

    // Usage section
    lines.push('## Usage');
    lines.push('');
    lines.push(this.buildUsageSection(info));
    lines.push('');

    // Scripts section
    if (Object.keys(info.scripts).length > 0) {
      lines.push('## Available Scripts');
      lines.push('');
      for (const [name, script] of Object.entries(info.scripts)) {
        lines.push(`### \`${name}\``);
        lines.push('');
        lines.push(`\`\`\`bash`);
        lines.push(`npm run ${name}`);
        lines.push(`\`\`\``);
        lines.push('');
      }
      lines.push('');
    }

    // Contributing section
    lines.push('## Contributing');
    lines.push('');
    lines.push('Contributions are welcome! Please feel free to submit a Pull Request.');
    lines.push('');

    // License section
    if (info.license) {
      lines.push('## License');
      lines.push('');
      lines.push(`This project is licensed under the ${info.license} License.`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Build the badges section
   */
  private buildBadgesSection(info: ProjectReadmeInfo): string {
    const badges: string[] = [];

    // Version badge
    if (info.version) {
      badges.push(
        `![Version](https://img.shields.io/badge/version-${encodeURIComponent(info.version)}-blue.svg)`,
      );
    }

    // License badge
    if (info.license) {
      badges.push(
        `![License](https://img.shields.io/badge/license-${encodeURIComponent(info.license)}-green.svg)`,
      );
    }

    // Framework badge
    if (info.framework) {
      badges.push(
        `![Framework](https://img.shields.io/badge/framework-${encodeURIComponent(info.framework)}-brightgreen.svg)`,
      );
    }

    // Language badge
    if (info.language) {
      badges.push(
        `![Language](https://img.shields.io/badge/language-${encodeURIComponent(info.language)}-yellow.svg)`,
      );
    }

    // Test framework badge
    if (info.testFramework) {
      badges.push(
        `![Tests](https://img.shields.io/badge/tests-${encodeURIComponent(info.testFramework)}-orange.svg)`,
      );
    }

    return badges.join(' ');
  }

  /**
   * Build the installation section
   */
  private buildInstallationSection(info: ProjectReadmeInfo): string {
    const lines: string[] = [];

    lines.push('Clone the repository:');
    lines.push('');
    lines.push('```bash');
    lines.push('git clone <repository-url>');
    lines.push('cd <project-directory>');
    lines.push('```');
    lines.push('');

    lines.push('Install dependencies:');
    lines.push('');
    lines.push('```bash');
    lines.push('npm install');
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Build the usage section
   */
  private buildUsageSection(info: ProjectReadmeInfo): string {
    const lines: string[] = [];

    lines.push('To start the development server:');
    lines.push('');
    lines.push('```bash');
    if (info.scripts.dev) {
      lines.push('npm run dev');
    } else if (info.scripts.start) {
      lines.push('npm start');
    } else {
      lines.push('npm run dev');
    }
    lines.push('```');
    lines.push('');

    lines.push('To build the project:');
    lines.push('');
    lines.push('```bash');
    if (info.scripts.build) {
      lines.push('npm run build');
    } else {
      lines.push('npm run build');
    }
    lines.push('```');
    lines.push('');

    lines.push('To run tests:');
    lines.push('');
    lines.push('```bash');
    if (info.scripts.test) {
      lines.push('npm test');
    } else {
      lines.push('npm test');
    }
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Write the README to file
   */
  private async writeReadme(workspaceUri: vscode.Uri, content: string): Promise<void> {
    const readmePath = vscode.Uri.joinPath(workspaceUri, 'README.md');

    // Check if README already exists
    const readmeExists = await this.fileDiscoveryService.fileExists(readmePath.fsPath);

    if (readmeExists) {
      const choice = await vscode.window.showWarningMessage(
        'README.md already exists. Do you want to overwrite it?',
        'Overwrite',
        'Cancel',
      );

      if (choice !== 'Overwrite') {
        return;
      }
    }

    // Write the README
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(readmePath, encoder.encode(content));

    // Open the README
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage('README.md generated successfully!');
  }
}

/**
 * Project information for README generation
 */
interface ProjectReadmeInfo {
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  repository: string;
  features: string[];
  framework: string;
  buildTool: string;
  testFramework: string;
  language: string;
  hasBadges: boolean;
  scripts: Record<string, string>;
}
