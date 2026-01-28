import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { ProjectDetectionService } from './projectDetectionService';

/**
 * Service for generating .gitignore files based on project type and detected frameworks
 */
export class GitignoreGeneratorService {
  private static instance: GitignoreGeneratorService | undefined;
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

  static getInstance(): GitignoreGeneratorService {
    if (!GitignoreGeneratorService.instance) {
      GitignoreGeneratorService.instance = new GitignoreGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
      );
    }
    return GitignoreGeneratorService.instance;
  }

  /**
   * Generate a .gitignore file for the current workspace
   */
  async generateGitignore(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating .gitignore...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project
          const projectInfo = await this.analyzeProject(workspaceFolder.uri.fsPath);
          progress.report({ increment: 50 });

          // Generate .gitignore content
          const gitignoreContent = this.buildGitignoreContent(projectInfo);
          progress.report({ increment: 80 });

          // Write or update .gitignore
          await this.writeGitignore(workspaceFolder.uri, gitignoreContent);
          progress.report({ increment: 100 });

          Logger.info('.gitignore generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating .gitignore', error);
      void vscode.window.showErrorMessage(
        `Failed to generate .gitignore: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the project to extract information for .gitignore generation
   */
  private async analyzeProject(projectPath: string): Promise<ProjectGitignoreInfo> {
    const info: ProjectGitignoreInfo = {
      languages: [],
      frameworks: [],
      tools: [],
      operatingSystems: [],
      editors: [],
      customRules: [],
    };

    // Detect project type and framework
    const projectType = await this.projectDetectionService.detectProjectType(projectPath);
    info.frameworks = projectType.frameworks;
    info.languages = [projectType.language || 'javascript'];

    // Detect build tools and package managers
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/node_modules`)) {
      info.tools.push('node');
    }

    if (await this.fileDiscoveryService.fileExists(`${projectPath}/package-lock.json`)) {
      info.tools.push('npm');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/yarn.lock`)) {
      info.tools.push('yarn');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/pnpm-lock.yaml`)) {
      info.tools.push('pnpm');
    }

    // Detect build tools
    if (
      (await this.fileDiscoveryService.fileExists(`${projectPath}/webpack.config.js`)) ||
      (await this.fileDiscoveryService.fileExists(`${projectPath}/webpack.config.ts`))
    ) {
      info.tools.push('webpack');
    }
    if (
      (await this.fileDiscoveryService.fileExists(`${projectPath}/vite.config.js`)) ||
      (await this.fileDiscoveryService.fileExists(`${projectPath}/vite.config.ts`))
    ) {
      info.tools.push('vite');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/rollup.config.js`)) {
      info.tools.push('rollup');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/.next`)) {
      info.tools.push('next');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/.nuxt`)) {
      info.tools.push('nuxt');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/dist`)) {
      info.tools.push('dist');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/build`)) {
      info.tools.push('build');
    }

    // Detect test frameworks
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/coverage`)) {
      info.tools.push('coverage');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/.nyc_output`)) {
      info.tools.push('nyc');
    }

    // Detect databases
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/prisma`)) {
      info.tools.push('prisma');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/drizzle`)) {
      info.tools.push('drizzle');
    }

    // Detect editors and IDEs
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/.vscode`)) {
      info.editors.push('vscode');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/.idea`)) {
      info.editors.push('jetbrains');
    }

    // Detect OS-specific files
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/.DS_Store`)) {
      info.operatingSystems.push('macos');
    }
    if (await this.fileDiscoveryService.fileExists(`${projectPath}/Thumbs.db`)) {
      info.operatingSystems.push('windows');
    }

    // Read existing .gitignore to preserve custom rules
    const existingGitignore = await this.readExistingGitignore(projectPath);
    if (existingGitignore) {
      info.customRules = this.extractCustomRules(existingGitignore);
    }

    return info;
  }

  /**
   * Read existing .gitignore file
   */
  private async readExistingGitignore(projectPath: string): Promise<string | null> {
    try {
      const gitignorePath = `${projectPath}/.gitignore`;
      const content = await this.fileDiscoveryService.readFile(gitignorePath);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Extract custom rules from existing .gitignore (non-standard rules)
   */
  private extractCustomRules(gitignoreContent: string): string[] {
    const lines = gitignoreContent.split('\n');
    const customRules: string[] = [];

    const standardRules = new Set([
      'node_modules',
      'dist',
      'build',
      '.next',
      '.nuxt',
      'coverage',
      '.nyc_output',
      '.DS_Store',
      'Thumbs.db',
      '.vscode',
      '.idea',
      '*.log',
      '.env',
      '.env.local',
      '.env.*.local',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ]);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !standardRules.has(trimmed)) {
        customRules.push(trimmed);
      }
    }

    return customRules;
  }

  /**
   * Build the .gitignore content from project information
   */
  private buildGitignoreContent(info: ProjectGitignoreInfo): string {
    const lines: string[] = [];

    // Header
    lines.push('# Generated .gitignore file');
    lines.push('# Add your custom rules below this line');
    lines.push('');

    // Dependencies
    if (info.tools.includes('node')) {
      lines.push('# Dependencies');
      lines.push('node_modules/');
      lines.push('jspm_packages/');
      lines.push('');
    }

    // Build outputs
    if (info.tools.includes('dist') || info.tools.includes('build') || info.tools.includes('webpack') || info.tools.includes('vite') || info.tools.includes('rollup')) {
      lines.push('# Build outputs');
      if (info.tools.includes('dist')) {
        lines.push('dist/');
      }
      if (info.tools.includes('build')) {
        lines.push('build/');
      }
      if (info.tools.includes('next')) {
        lines.push('.next/');
        lines.push('out/');
      }
      if (info.tools.includes('nuxt')) {
        lines.push('.nuxt/');
      }
      lines.push('');
    }

    // Framework specific
    if (info.frameworks.includes('react') || info.frameworks.includes('vue') || info.frameworks.includes('svelte')) {
      lines.push('# Framework');
      if (info.frameworks.includes('react')) {
        lines.push('.env.development.local');
        lines.push('.env.test.local');
        lines.push('.env.production.local');
      }
      lines.push('');
    }

    // Testing
    if (info.tools.includes('coverage') || info.tools.includes('nyc')) {
      lines.push('# Testing');
      if (info.tools.includes('coverage')) {
        lines.push('coverage/');
        lines.push('.nyc_output/');
      }
      lines.push('');
    }

    // Database
    if (info.tools.includes('prisma') || info.tools.includes('drizzle')) {
      lines.push('# Database');
      if (info.tools.includes('prisma')) {
        lines.push('prisma/*.db');
        lines.push('prisma/*.db-journal');
      }
      lines.push('*.db');
      lines.push('*.db-journal');
      lines.push('');
    }

    // Logs
    lines.push('# Logs');
    lines.push('npm-debug.log*');
    lines.push('yarn-debug.log*');
    lines.push('yarn-error.log*');
    lines.push('pnpm-debug.log*');
    lines.push('lerna-debug.log*');
    lines.push('');

    // Environment variables
    lines.push('# Environment variables');
    lines.push('.env');
    lines.push('.env.local');
    lines.push('.env.development.local');
    lines.push('.env.test.local');
    lines.push('.env.production.local');
    lines.push('.env.*.local');
    lines.push('');

    // OS specific
    if (info.operatingSystems.includes('macos') || info.operatingSystems.includes('windows')) {
      lines.push('# OS specific');
      if (info.operatingSystems.includes('macos')) {
        lines.push('.DS_Store');
        lines.push('.DS_Store?');
        lines.push('._*');
        lines.push('.Spotlight-V100');
        lines.push('.Trashes');
        lines.push('ehthumbs.db');
        lines.push('Thumbs.db');
      }
      if (info.operatingSystems.includes('windows')) {
        lines.push('Thumbs.db');
        lines.push('ehthumbs.db');
        lines.push('Desktop.ini');
        lines.push('$RECYCLE.BIN/');
      }
      lines.push('');
    }

    // Editors/IDEs
    if (info.editors.includes('vscode') || info.editors.includes('jetbrains')) {
      lines.push('# Editors/IDEs');
      if (info.editors.includes('vscode')) {
        lines.push('.vscode/*');
        lines.push('!.vscode/settings.json');
        lines.push('!.vscode/tasks.json');
        lines.push('!.vscode/launch.json');
        lines.push('!.vscode/extensions.json');
        lines.push('*.code-workspace');
      }
      if (info.editors.includes('jetbrains')) {
        lines.push('.idea/');
        lines.push('*.iml');
      }
      lines.push('');
    }

    // Package manager locks
    if (info.tools.includes('npm') || info.tools.includes('yarn') || info.tools.includes('pnpm')) {
      lines.push('# Package manager locks (optional - remove if you commit them)');
      if (info.tools.includes('npm')) {
        lines.push('# package-lock.json');
      }
      if (info.tools.includes('yarn')) {
        lines.push('# yarn.lock');
      }
      if (info.tools.includes('pnpm')) {
        lines.push('# pnpm-lock.yaml');
      }
      lines.push('');
    }

    // TypeScript
    if (info.languages.includes('typescript')) {
      lines.push('# TypeScript');
      lines.push('*.tsbuildinfo');
      lines.push('');
    }

    // Cache directories
    lines.push('# Cache');
    lines.push('.cache/');
    lines.push('.parcel-cache/');
    lines.push('.eslintcache');
    lines.push('.stylelintcache');
    lines.push('');

    // Misc
    lines.push('# Misc');
    lines.push('.sass-cache/');
    lines.push('.fusebox/');
    lines.push('.dynamodb/');
    lines.push('.surface/');
    lines.push('.vercel');
    lines.push('.netlify');
    lines.push('');

    // Debug
    lines.push('# Debug');
    lines.push('npm-debug.log');
    lines.push('yarn-error.log');
    lines.push('');

    // Custom rules from existing .gitignore
    if (info.customRules.length > 0) {
      lines.push('# Custom rules (preserved from existing .gitignore)');
      for (const rule of info.customRules) {
        lines.push(rule);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Write the .gitignore to file
   */
  private async writeGitignore(workspaceUri: vscode.Uri, content: string): Promise<void> {
    const gitignorePath = vscode.Uri.joinPath(workspaceUri, '.gitignore');

    // Check if .gitignore already exists
    const gitignoreExists = await this.fileDiscoveryService.fileExists(gitignorePath.fsPath);

    if (gitignoreExists) {
      const choice = await vscode.window.showWarningMessage(
        '.gitignore already exists. Do you want to overwrite it?',
        'Overwrite',
        'Cancel',
      );

      if (choice !== 'Overwrite') {
        return;
      }
    }

    // Write the .gitignore
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(gitignorePath, encoder.encode(content));

    // Open the .gitignore
    const doc = await vscode.workspace.openTextDocument(gitignorePath);
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage('.gitignore generated successfully!');
  }

  /**
   * Generate .gitignore for a specific project type/template
   */
  async generateGitignoreFromTemplate(template: GitignoreTemplate): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      const content = this.getTemplateContent(template);
      await this.writeGitignore(workspaceUri, content);
    } catch (error) {
      Logger.error('Error generating .gitignore from template', error);
      void vscode.window.showErrorMessage(
        `Failed to generate .gitignore: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get predefined template content
   */
  private getTemplateContent(template: GitignoreTemplate): string {
    switch (template) {
      case 'node':
        return this.getNodeTemplate();
      case 'python':
        return this.getPythonTemplate();
      case 'go':
        return this.getGoTemplate();
      case 'rust':
        return this.getRustTemplate();
      case 'java':
        return this.getJavaTemplate();
      case 'dotnet':
        return this.getDotnetTemplate();
      case 'docker':
        return this.getDockerTemplate();
      case 'general':
      default:
        return this.getGeneralTemplate();
    }
  }

  private getNodeTemplate(): string {
    return `# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Build
dist/
build/
out/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
`;
  }

  private getPythonTemplate(): string {
    return `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/
cover/

# Translations
*.mo
*.pot

# Django stuff:
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal

# Flask stuff:
instance/
.webassets-cache

# Scrapy stuff:
.scrapy

# Sphinx documentation
docs/_build/

# PyBuilder
.pybuilder/
target/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# pipenv
Pipfile.lock

# poetry
poetry.lock

# pdm
.pdm.toml

# PEP 582
__pypackages__/

# Celery stuff
celerybeat-schedule
celerybeat.pid

# SageMath parsed files
*.sage.py

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Spyder project settings
.spyderproject
.spyproject

# Rope project settings
.ropeproject

# mkdocs documentation
/site

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# Pyre type checker
.pyre/

# pytype static type analyzer
.pytype/

# Cython debug symbols
cython_debug/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
`;
  }

  private getGoTemplate(): string {
    return `# Binaries for programs and plugins
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary, built with \`go test -c\`
*.test

# Output of the go coverage tool
*.out

# Go workspace file
go.work

# Dependency directories
vendor/

# Build output
/bin/
/dist/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
`;
  }

  private getRustTemplate(): string {
    return `# Rust
/target/
**/*.rs.bk
*.pdb

# Cargo
Cargo.lock

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
`;
  }

  private getJavaTemplate(): string {
    return `# Java
*.class
*.log
*.jar
*.war
*.nar
*.ear
*.zip
*.tar.gz
*.rar
hs_err_pid*

# Maven
target/
pom.xml.tag
pom.xml.releaseBackup
pom.xml.versionsBackup
pom.xml.next
release.properties
dependency-reduced-pom.xml
buildNumber.properties
.mvn/timing.properties
.mvn/wrapper/maven-wrapper.jar

# Gradle
.gradle
build/
!gradle/wrapper/gradle-wrapper.jar
!**/src/main/**/build/
!**/src/test/**/build/

# IDE
.idea/
*.iws
*.iml
*.ipr
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
`;
  }

  private getDotnetTemplate(): string {
    return `# .NET
bin/
obj/
out/
.vscode/

# User-specific files
*.suo
*.user
*.userosscache
*.sln.docstates

# Build results
[Dd]ebug/
[Dd]ebugPublic/
[Rr]elease/
[Rr]eleases/
x64/
x86/
[Ww][Ii][Nn]32/
[Aa][Rr][Mm]/
[Aa][Rr][Mm]64/
bld/
[Bb]in/
[Oo]bj/
[Ll]og/
[Ll]ogs/

# Visual Studio cache/options directory
.vs/

# MSTest test Results
[Tt]est[Rr]esult*/
[Bb]uild[Ll]og.*

# NUnit
*.VisualState.xml
TestResult.xml
nunit-*.xml

# Build Results of an ATL Project
[Dd]ebugPS/
[Rr]eleasePS/
dlldata.c

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
`;
  }

  private getDockerTemplate(): string {
    return `# Docker
*.log

# Environment
.env
.env.local
.env.*.local

# Docker volumes
/data

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
`;
  }

  private getGeneralTemplate(): string {
    return `# General
*.log
*.tmp
*.temp
*.bak
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
Desktop.ini
$RECYCLE.BIN/

# IDE
.vscode/
.idea/
*.iml
*.ipr
*.iws

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
out/

# Dependencies
node_modules/
vendor/

# Testing
coverage/
.nyc_output/

# Cache
.cache/
.parcel-cache/
.eslintcache
.stylelintcache

# Misc
.sass-cache/
.fusebox/
.dynamodb/
.surface/
`;
  }
}

/**
 * Project information for .gitignore generation
 */
interface ProjectGitignoreInfo {
  languages: string[];
  frameworks: string[];
  tools: string[];
  operatingSystems: string[];
  editors: string[];
  customRules: string[];
}

/**
 * Predefined .gitignore templates
 */
type GitignoreTemplate =
  | 'node'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'dotnet'
  | 'docker'
  | 'general';
