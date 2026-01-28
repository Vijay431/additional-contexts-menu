import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface DockerfileGeneratorConfig {
  enabled: boolean;
  includeHealthcheck: boolean;
  includeEntrypoint: boolean;
  includeEnvironment: boolean;
  includeVolumes: boolean;
  includeExpose: boolean;
  defaultNodeVersion: string;
  includeMultiStage: boolean;
  includeDockerignore: boolean;
  includeDockerCompose: boolean;
  targetPort: number;
}

export interface DockerfileOptions {
  appName: string;
  nodeVersion: string;
  port: number;
  environment: 'production' | 'development';
  framework: 'express' | 'nextjs' | 'nestjs' | 'react' | 'vue' | 'svelte' | 'nuxtjs' | 'sveltekit' | 'general';
  includeHealthcheck: boolean;
  includeEntrypoint: boolean;
  includeVolumes: boolean;
  includeDockerignore: boolean;
  includeDockerCompose: boolean;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
}

export interface GeneratedDockerfile {
  name: string;
  framework: string;
  files: {
    dockerfile: { path: string; code: string };
    dockerignore?: { path: string; code: string };
    dockerCompose?: { path: string; code: string };
    entrypoint?: { path: string; code: string };
  };
}

/**
 * Service for generating optimized Dockerfiles for Node.js projects.
 * Supports multi-stage builds, development and production configurations,
 * and framework-specific optimizations.
 */
export class DockerfileGeneratorService {
  private static instance: DockerfileGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): DockerfileGeneratorService {
    DockerfileGeneratorService.instance ??= new DockerfileGeneratorService();
    return DockerfileGeneratorService.instance;
  }

  /**
   * Generates a Dockerfile based on user input and project configuration
   */
  public async generateDockerfile(
    workspacePath: string,
    config: DockerfileGeneratorConfig,
    detectedFramework?: string,
  ): Promise<GeneratedDockerfile | null> {
    // Get application name
    const appName = await this.getAppName(path.basename(workspacePath));
    if (!appName) {
      return null;
    }

    // Get framework type
    const framework = await this.getFramework(detectedFramework);
    if (!framework) {
      return null;
    }

    // Get Node.js version
    const nodeVersion = await this.getNodeVersion(config.defaultNodeVersion);

    // Get port
    const port = await this.getPort(config.targetPort);

    // Get environment type
    const environment = await this.getEnvironment();

    // Get build commands based on framework
    const commands = this.getFrameworkCommands(framework);
    const installCommand = await this.getInstallCommand(commands.install);
    const buildCommand = await this.getBuildCommand(commands.build);
    const startCommand = await this.getStartCommand(commands.start);

    // Ask about optional features
    const includeHealthcheck = config.includeHealthcheck && (await this.askForFeature('healthcheck'));
    const includeEntrypoint = config.includeEntrypoint && (await this.askForFeature('custom entrypoint script'));
    const includeVolumes = config.includeVolumes && (await this.askForFeature('volume mounts'));
    const includeDockerignore = config.includeDockerignore && (await this.askForFeature('.dockerignore file'));
    const includeDockerCompose = config.includeDockerCompose && (await this.askForFeature('docker-compose.yml'));

    const options: DockerfileOptions = {
      appName,
      nodeVersion,
      port,
      environment,
      framework,
      includeHealthcheck,
      includeEntrypoint,
      includeVolumes,
      includeDockerignore,
      includeDockerCompose,
      installCommand,
      buildCommand,
      startCommand,
    };

    // Generate files
    const files = this.generateFiles(options, workspacePath);

    this.logger.info('Dockerfile generated', {
      appName,
      framework,
      nodeVersion,
      port,
      environment,
    });

    return {
      name: appName,
      framework,
      files,
    };
  }

  /**
   * Prompts user for application name
   */
  private async getAppName(defaultName: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter application name',
      placeHolder: defaultName,
      value: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Application name cannot be empty';
        }
        if (!/^[a-z0-9-]*$/i.test(value)) {
          return 'Application name must contain only letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for framework type
   */
  private async getFramework(detectedFramework?: string): Promise<
    'express' | 'nextjs' | 'nestjs' | 'react' | 'vue' | 'svelte' | 'nuxtjs' | 'sveltekit' | 'general' | undefined
  > {
    const frameworks = [
      { label: 'Express', value: 'express', description: 'Express.js backend application' },
      { label: 'Next.js', value: 'nextjs', description: 'Next.js full-stack framework' },
      { label: 'NestJS', value: 'nestjs', description: 'NestJS backend framework' },
      { label: 'React', value: 'react', description: 'React frontend application' },
      { label: 'Vue', value: 'vue', description: 'Vue.js frontend application' },
      { label: 'Svelte', value: 'svelte', description: 'Svelte frontend application' },
      { label: 'Nuxt.js', value: 'nuxtjs', description: 'Nuxt.js full-stack framework' },
      { label: 'SvelteKit', value: 'sveltekit', description: 'SvelteKit full-stack framework' },
      { label: 'General Node.js', value: 'general', description: 'Generic Node.js application' },
    ];

    // If framework was detected, suggest it first
    const sortedFrameworks = detectedFramework
      ? [
          ...frameworks.filter((f) => f.value === detectedFramework.toLowerCase()),
          ...frameworks.filter((f) => f.value !== detectedFramework.toLowerCase()),
        ]
      : frameworks;

    const choice = await vscode.window.showQuickPick(sortedFrameworks, {
      placeHolder: detectedFramework ? `Detected: ${detectedFramework}. Select framework type:` : 'Select framework type:',
    });

    return choice?.value as
      | 'express'
      | 'nextjs'
      | 'nestjs'
      | 'react'
      | 'vue'
      | 'svelte'
      | 'nuxtjs'
      | 'sveltekit'
      | 'general';
  }

  /**
   * Prompts user for Node.js version
   */
  private async getNodeVersion(defaultVersion: string): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Node.js version',
      placeHolder: defaultVersion,
      value: defaultVersion,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Node.js version cannot be empty';
        }
        if (!/^(\d+|\d+\.\d+|\d+\.\d+\.\d+)(-alpine)?$/.test(value)) {
          return 'Invalid Node.js version format (e.g., 20, 20-alpine, 20.11, 20.11.0)';
        }
        return null;
      },
    });
    return input?.trim() || defaultVersion;
  }

  /**
   * Prompts user for application port
   */
  private async getPort(defaultPort: number): Promise<number> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter application port',
      placeHolder: defaultPort.toString(),
      value: defaultPort.toString(),
      validateInput: (value) => {
        const port = Number.parseInt(value, 10);
        if (Number.isNaN(port)) {
          return 'Port must be a number';
        }
        if (port < 1 || port > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return null;
      },
    });
    return Number.parseInt(input || defaultPort.toString(), 10);
  }

  /**
   * Prompts user for environment type
   */
  private async getEnvironment(): Promise<'production' | 'development'> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Production', value: 'production', description: 'Optimized for production deployment' },
        { label: 'Development', value: 'development', description: 'Includes development tools' },
      ],
      {
        placeHolder: 'Select environment type:',
      },
    );

    return (choice?.value as 'production' | 'development') || 'production';
  }

  /**
   * Gets default commands for a framework
   */
  private getFrameworkCommands(
    framework: string,
  ): { install: string; build: string; start: string } {
    const commands: Record<string, { install: string; build: string; start: string }> = {
      express: {
        install: 'npm ci --only=production',
        build: 'echo "Skip build"',
        start: 'node server.js',
      },
      nextjs: {
        install: 'npm ci',
        build: 'npm run build',
        start: 'npm start',
      },
      nestjs: {
        install: 'npm ci --only=production',
        build: 'npm run build',
        start: 'node dist/main',
      },
      react: {
        install: 'npm ci',
        build: 'npm run build',
        start: 'npx serve -s build -l $PORT',
      },
      vue: {
        install: 'npm ci',
        build: 'npm run build',
        start: 'npx serve -s dist -l $PORT',
      },
      svelte: {
        install: 'npm ci',
        build: 'npm run build',
        start: 'npx serve -s public -l $PORT',
      },
      nuxtjs: {
        install: 'npm ci',
        build: 'npm run build',
        start: 'npm run start',
      },
      sveltekit: {
        install: 'npm ci',
        build: 'npm run build',
        start: 'node build/index',
      },
      general: {
        install: 'npm ci',
        build: 'echo "Skip build"',
        start: 'node index.js',
      },
    };

    return commands[framework] || commands.general;
  }

  /**
   * Prompts user for install command
   */
  private async getInstallCommand(defaultCommand: string): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter install command',
      placeHolder: defaultCommand,
      value: defaultCommand,
    });
    return input?.trim() || defaultCommand;
  }

  /**
   * Prompts user for build command
   */
  private async getBuildCommand(defaultCommand: string): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter build command',
      placeHolder: defaultCommand,
      value: defaultCommand,
    });
    return input?.trim() || defaultCommand;
  }

  /**
   * Prompts user for start command
   */
  private async getStartCommand(defaultCommand: string): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter start command',
      placeHolder: defaultCommand,
      value: defaultCommand,
    });
    return input?.trim() || defaultCommand;
  }

  /**
   * Asks if user wants to include a specific feature
   */
  private async askForFeature(feature: string): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      {
        placeHolder: `Include ${feature}?`,
      },
    );

    return choice?.value === 'yes';
  }

  /**
   * Generates all Docker-related files
   */
  private generateFiles(options: DockerfileOptions, workspacePath: string): GeneratedDockerfile['files'] {
    const files: GeneratedDockerfile['files'] = {
      dockerfile: {
        path: path.join(workspacePath, 'Dockerfile'),
        code: this.generateDockerfileContent(options),
      },
    };

    if (options.includeDockerignore) {
      files.dockerignore = {
        path: path.join(workspacePath, '.dockerignore'),
        code: this.generateDockerignore(options),
      };
    }

    if (options.includeDockerCompose) {
      files.dockerCompose = {
        path: path.join(workspacePath, 'docker-compose.yml'),
        code: this.generateDockerCompose(options),
      };
    }

    if (options.includeEntrypoint) {
      files.entrypoint = {
        path: path.join(workspacePath, 'docker-entrypoint.sh'),
        code: this.generateEntrypoint(options),
      };
    }

    return files;
  }

  /**
   * Generates Dockerfile content
   */
  private generateDockerfileContent(options: DockerfileOptions): string {
    let content = '';

    const useMultiStage = options.environment === 'production' && options.buildCommand !== 'echo "Skip build"';

    if (useMultiStage) {
      content += this.generateMultiStageDockerfile(options);
    } else {
      content += this.generateSingleStageDockerfile(options);
    }

    return content;
  }

  /**
   * Generates multi-stage Dockerfile for production
   */
  private generateMultiStageDockerfile(options: DockerfileOptions): string {
    let content = `# Multi-stage build for ${options.appName}\n`;
    content += `# Stage 1: Build\n`;
    content += `FROM node:${options.nodeVersion} AS builder\n\n`;

    content += `# Set working directory\n`;
    content += `WORKDIR /app\n\n`;

    content += `# Install dependencies\n`;
    content += `COPY package*.json ./\n`;
    content += `RUN ${options.installCommand}\n\n`;

    content += `# Copy source code\n`;
    content += `COPY . .\n\n`;

    content += `# Build application\n`;
    content += `RUN ${options.buildCommand}\n\n`;

    content += `# Stage 2: Production\n`;
    content += `FROM node:${options.nodeVersion}-alpine\n\n`;

    content += `# Set working directory\n`;
    content += `WORKDIR /app\n\n`;

    content += `# Install dumb-init for proper signal handling\n`;
    content += `RUN apk add --no-cache dumb-init\n\n`;

    // Copy dependencies from builder stage
    if (options.framework === 'nextjs' || options.framework === 'nuxtjs' || options.framework === 'nestjs') {
      content += `# Copy dependencies from builder\n`;
      content += `COPY --from=builder /app/node_modules ./node_modules\n`;
    }

    // Copy built artifacts
    content += `# Copy built artifacts from builder\n`;
    if (options.framework === 'react' || options.framework === 'vue' || options.framework === 'svelte') {
      content += `COPY --from=builder /app/build ./build\n`;
      content += `COPY --from=builder /app/node_modules ./node_modules\n`;
    } else if (options.framework === 'nextjs') {
      content += `COPY --from=builder /app/.next ./.next\n`;
      content += `COPY --from=builder /app/node_modules ./node_modules\n`;
      content += `COPY --from=builder /app/package.json ./package.json\n`;
      content += `COPY --from=builder /app/public ./public\n`;
    } else if (options.framework === 'nuxtjs') {
      content += `COPY --from=builder /app/.output ./.output\n`;
      content += `COPY --from=builder /app/package.json ./package.json\n`;
    } else if (options.framework === 'nestjs') {
      content += `COPY --from=builder /app/dist ./dist\n`;
    } else {
      content += `COPY --from=builder /app/dist ./dist\n`;
      content += `COPY --from=builder /app/node_modules ./node_modules\n`;
    }
    content += `\n`;

    // Add non-root user
    content += `# Create non-root user\n`;
    content += `RUN addgroup -g 1001 -S nodejs && \\\n`;
    content += `    adduser -S nodejs -u 1001\n\n`;

    content += `# Change ownership\n`;
    content += `RUN chown -R nodejs:nodejs /app\n\n`;

    content += `# Switch to non-root user\n`;
    content += `USER nodejs\n\n`;

    // Add expose
    content += `# Expose port\n`;
    content += `EXPOSE ${options.port}\n\n`;

    // Add healthcheck
    if (options.includeHealthcheck) {
      content += `# Health check\n`;
      content += `HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\\n`;
      content += `    CMD node -e "require('http').get('http://localhost:${options.port}', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1\n\n`;
    }

    // Add environment
    content += `# Set environment to production\n`;
    content += `ENV NODE_ENV=production\n`;
    if (options.framework === 'nextjs') {
      content += `ENV PORT=${options.port}\n`;
    }
    content += `\n`;

    // Add volumes
    if (options.includeVolumes) {
      content += `# Mount volumes\n`;
      content += `VOLUME ["/app/node_modules", "/app/.next", "/app/uploads"]\n\n`;
    }

    // Add entrypoint
    if (options.includeEntrypoint) {
      content += `# Copy entrypoint script\n`;
      content += `COPY --chown=nodejs:nodejs docker-entrypoint.sh /usr/local/bin/\n`;
      content += `RUN chmod +x /usr/local/bin/docker-entrypoint.sh\n\n`;
      content += `ENTRYPOINT ["docker-entrypoint.sh"]\n\n`;
    }

    content += `# Start application\n`;
    content += `CMD ["${this.getStartCommandArray(options).join('", "')}"]\n`;

    return content;
  }

  /**
   * Generates single-stage Dockerfile
   */
  private generateSingleStageDockerfile(options: DockerfileOptions): string {
    let content = `# Dockerfile for ${options.appName}\n`;
    content += `FROM node:${options.nodeVersion}${options.environment === 'production' ? '-alpine' : ''}\n\n`;

    content += `# Set working directory\n`;
    content += `WORKDIR /app\n\n`;

    if (options.environment === 'production') {
      content += `# Install dumb-init for proper signal handling\n`;
      content += `RUN apk add --no-cache dumb-init\n\n`;
    }

    content += `# Copy package files\n`;
    content += `COPY package*.json ./\n\n`;

    content += `# Install dependencies\n`;
    content += `RUN ${options.installCommand}\n\n`;

    content += `# Copy application code\n`;
    content += `COPY . .\n\n`;

    if (options.environment === 'production') {
      content += `# Build application\n`;
      content += `RUN ${options.buildCommand}\n\n`;
    }

    // Add non-root user for production
    if (options.environment === 'production') {
      content += `# Create non-root user\n`;
      content += `RUN addgroup -g 1001 -S nodejs && \\\n`;
      content += `    adduser -S nodejs -u 1001\n\n`;

      content += `# Change ownership\n`;
      content += `RUN chown -R nodejs:nodejs /app\n\n`;

      content += `# Switch to non-root user\n`;
      content += `USER nodejs\n\n`;
    }

    content += `# Expose port\n`;
    content += `EXPOSE ${options.port}\n\n`;

    if (options.includeHealthcheck && options.environment === 'production') {
      content += `# Health check\n`;
      content += `HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\\n`;
      content += `    CMD node -e "require('http').get('http://localhost:${options.port}', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1\n\n`;
    }

    content += `# Set environment\n`;
    content += `ENV NODE_ENV=${options.environment}\n`;
    if (options.framework === 'nextjs') {
      content += `ENV PORT=${options.port}\n`;
    }
    content += `\n`;

    if (options.includeVolumes) {
      content += `# Mount volumes\n`;
      content += `VOLUME ["/app/node_modules", "/app/uploads"]\n\n`;
    }

    if (options.includeEntrypoint) {
      content += `# Copy entrypoint script\n`;
      content += `COPY docker-entrypoint.sh /usr/local/bin/\n`;
      if (options.environment === 'production') {
        content += `RUN chmod +x /usr/local/bin/docker-entrypoint.sh\n\n`;
      }
      content += `ENTRYPOINT ["docker-entrypoint.sh"]\n\n`;
    }

    content += `# Start application\n`;
    content += `CMD ["${this.getStartCommandArray(options).join('", "')}"]\n`;

    return content;
  }

  /**
   * Converts start command to array format
   */
  private getStartCommandArray(options: DockerfileOptions): string[] {
    const cmd = options.startCommand;
    if (cmd.startsWith('npm ') || cmd.startsWith('npx ')) {
      const parts = cmd.split(' ');
      return parts;
    }
    if (cmd.startsWith('node ')) {
      const parts = cmd.split(' ');
      return parts;
    }
    return ['npm', 'run', 'start'];
  }

  /**
   * Generates .dockerignore content
   */
  private generateDockerignore(options: DockerfileOptions): string {
    let content = `# Dependencies\n`;
    content += `node_modules\n`;
    content += `npm-debug.log*\n`;
    content += `yarn-debug.log*\n`;
    content += `yarn-error.log*\n\n`;

    content += `# Testing\n`;
    content += `coverage\n`;
    content += `.nyc_output\n\n`;

    content += `# Next.js\n`;
    content += `.next/\n`;
    content += `out/\n\n`;

    content += `# Production\n`;
    content += `build\n`;
    content += `dist\n\n`;

    content += `# Misc\n`;
    content += `.DS_Store\n`;
    content += `.env*.local\n`;
    content += `.env.development\n`;
    content += `.env.test\n`;
    content += `*.log\n\n`;

    content += `# VCS\n`;
    content += `.git\n`;
    content += `.gitignore\n\n`;

    content += `# Docker\n`;
    content += `Dockerfile\n`;
    content += `.dockerignore\n`;
    content += `docker-compose.yml\n`;
    content += `docker-entrypoint.sh\n\n`;

    content += `# IDE\n`;
    content += `.vscode\n`;
    content += `.idea\n`;
    content += `*.swp\n`;
    content += `*.swo\n`;

    return content;
  }

  /**
   * Generates docker-compose.yml content
   */
  private generateDockerCompose(options: DockerfileOptions): string {
    let content = `version: '3.8'\n\n`;
    content += `services:\n`;
    content += `  ${options.appName}:\n`;
    content += `    build:\n`;
    content += `      context: .\n`;
    content += `      dockerfile: Dockerfile\n`;
    content += `    container_name: ${options.appName}\n`;
    content += `    ports:\n`;
    content += `      - "${options.port}:${options.port}"\n`;
    if (options.includeVolumes) {
      content += `    volumes:\n`;
      content += `      - ./node_modules:/app/node_modules\n`;
      content += `      - ./uploads:/app/uploads\n`;
    }
    content += `    environment:\n`;
    content += `      - NODE_ENV=${options.environment}\n`;
    if (options.framework === 'nextjs' || options.framework === 'nuxtjs') {
      content += `      - PORT=${options.port}\n`;
    }
    content += `    restart: unless-stopped\n`;
    if (options.includeHealthcheck) {
      content += `    healthcheck:\n`;
      content += `      test: ["CMD", "node", "-e", "require('http').get('http://localhost:${options.port}', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]\n`;
      content += `      interval: 30s\n`;
      content += `      timeout: 3s\n`;
      content += `      retries: 3\n`;
      content += `      start_period: 40s\n`;
    }

    return content;
  }

  /**
   * Generates docker-entrypoint.sh content
   */
  private generateEntrypoint(options: DockerfileOptions): string {
    let content = `#!/bin/sh\n`;
    content += `set -e\n\n`;

    content += `# Handle SIGTERM and SIGINT\n`;
    content += `trap "echo 'Received signal to terminate'; exit 0" TERM INT\n\n`;

    content += `# Run any custom startup scripts\n`;
    content += `if [ -d /docker-entrypoint.d ]; then\n`;
    content += `    for f in /docker-entrypoint.d/*; do\n`;
    content += `        case "$f" in\n`;
    content += `            *.sh) echo "$0: running $f"; . "$f" ;;\n`;
    content += `            *) echo "$0: ignoring $f" ;;\n`;
    content += `        esac\n`;
    content += `    done\n`;
    content += `fi\n\n`;

    content += `# Execute the command\n`;
    content += `exec dumb-init "$@"\n`;

    return content;
  }

  /**
   * Creates the Docker files at the specified paths
   */
  public async createDockerFiles(files: GeneratedDockerfile['files']): Promise<void> {
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

      this.logger.info(`Docker ${fileType} file created`, { filePath: file.path });
    }
  }
}
