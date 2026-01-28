import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import { ProjectType } from '../types/extension';
import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

export class ProjectDetectionService {
  private static instance: ProjectDetectionService | undefined;
  private logger: Logger;
  private projectTypeCache = new Map<string, ProjectType>();
  private watchers: vscode.FileSystemWatcher[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ProjectDetectionService {
    ProjectDetectionService.instance ??= new ProjectDetectionService();
    return ProjectDetectionService.instance;
  }

  public initialize(): void {
    if (this.watchers.length > 0) {
      return;
    }

    const packageWatcher = vscode.workspace.createFileSystemWatcher('**/package.json');
    const tsconfigWatcher = vscode.workspace.createFileSystemWatcher('**/tsconfig.json');

    const handleChange = (): void => {
      this.logger.debug('Project file change detected, refreshing context');
      this.clearCache();
      void this.updateContextVariables();
    };

    packageWatcher.onDidChange(handleChange);
    packageWatcher.onDidCreate(handleChange);
    packageWatcher.onDidDelete(handleChange);

    tsconfigWatcher.onDidChange(handleChange);
    tsconfigWatcher.onDidCreate(handleChange);
    tsconfigWatcher.onDidDelete(handleChange);

    this.watchers.push(packageWatcher, tsconfigWatcher);
  }

  public async detectProjectType(workspaceFolder?: vscode.WorkspaceFolder): Promise<ProjectType> {
    workspaceFolder ??= vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return this.createProjectType(false, [], false, 'none');
    }

    const cacheKey = workspaceFolder.uri.fsPath;
    if (this.projectTypeCache.has(cacheKey)) {
      return this.projectTypeCache.get(cacheKey)!;
    }

    const projectType = await this.analyzeProject(workspaceFolder.uri.fsPath);
    this.projectTypeCache.set(cacheKey, projectType);

    return projectType;
  }

  private async analyzeProject(projectPath: string): Promise<ProjectType> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const tsConfigPath = path.join(projectPath, 'tsconfig.json');

      // Check if package.json exists
      const hasPackageJson = await this.pathExists(packageJsonPath);
      if (!hasPackageJson) {
        this.logger.debug('No package.json found, not a Node.js project');
        return this.createProjectType(false, [], false, 'none');
      }

      // Parse package.json
      if (!isSafeFilePath(packageJsonPath)) {
        this.logger.warn('Unsafe package.json path detected', { packageJsonPath });
        return this.createProjectType(false, [], false, 'none');
      }

      const packageUri = vscode.Uri.file(packageJsonPath);
      const packageBuffer = await vscode.workspace.fs.readFile(packageUri);
      const packageJson = JSON.parse(Buffer.from(packageBuffer).toString('utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for TypeScript
      const hasTypeScript =
        (await this.pathExists(tsConfigPath)) ||
        dependencies.typescript !== undefined ||
        dependencies['@types/node'] !== undefined;

      // Detect frameworks
      const frameworks = this.detectFrameworks(dependencies);

      // Check for Node.js indicators
      const isNodeProject = this.isNodeJsProject(dependencies);

      // Determine support level
      const supportLevel = this.determineSupportLevel(isNodeProject, frameworks, hasTypeScript);

      const result = this.createProjectType(isNodeProject, frameworks, hasTypeScript, supportLevel);

      this.logger.info('Project detected', {
        path: projectPath,
        isNodeProject,
        frameworks,
        hasTypeScript,
        supportLevel,
      });

      return result;
    } catch (error) {
      this.logger.error('Error analyzing project', error);
      return this.createProjectType(false, [], false, 'none');
    }
  }

  private detectFrameworks(dependencies: Record<string, string>): string[] {
    const frameworks: string[] = [];

    // React
    if (dependencies['react']) {
      frameworks.push('react');
    }

    // Angular
    if (dependencies['@angular/core']) {
      frameworks.push('angular');
    }

    // Express
    if (dependencies['express']) {
      frameworks.push('express');
    }

    // Next.js
    if (dependencies['next']) {
      frameworks.push('nextjs');
    }

    // Vue.js
    if (dependencies['vue']) {
      frameworks.push('vue');
    }

    // Svelte
    if (dependencies['svelte']) {
      frameworks.push('svelte');
    }

    // SolidJS
    if (dependencies['solid-js']) {
      frameworks.push('solid');
    }

    // Nest.js
    if (dependencies['@nestjs/core']) {
      frameworks.push('nestjs');
    }

    // Nuxt.js
    if (dependencies['nuxt']) {
      frameworks.push('nuxtjs');
    }

    return frameworks;
  }

  private isNodeJsProject(dependencies: Record<string, string>): boolean {
    // Check for common Node.js indicators
    const nodeIndicators = [
      'express',
      'react',
      'angular',
      'next',
      'vue',
      'svelte',
      'solid-js',
      '@angular/core',
      '@nestjs/core',
      'typescript',
      '@types/node',
      'webpack',
      'vite',
      'rollup',
    ];

    const dependencySet = new Set(Object.keys(dependencies));
    return nodeIndicators.some((indicator) => dependencySet.has(indicator));
  }

  private determineSupportLevel(
    isNodeProject: boolean,
    frameworks: string[],
    hasTypeScript: boolean,
  ): 'full' | 'partial' | 'none' {
    if (!isNodeProject) {
      return 'none';
    }

    if (frameworks.length > 0 && hasTypeScript) {
      return 'full';
    }

    if (frameworks.length > 0 || hasTypeScript) {
      return 'partial';
    }

    return 'partial'; // Basic Node.js project
  }

  private createProjectType(
    isNodeProject: boolean,
    frameworks: string[],
    hasTypeScript: boolean,
    supportLevel: 'full' | 'partial' | 'none',
  ): ProjectType {
    return {
      isNodeProject,
      frameworks,
      hasTypeScript,
      supportLevel,
    };
  }

  public async updateContextVariables(): Promise<void> {
    const projectType = await this.detectProjectType();

    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.isNodeProject',
      projectType.isNodeProject,
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasReact',
      projectType.frameworks.includes('react'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasAngular',
      projectType.frameworks.includes('angular'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasExpress',
      projectType.frameworks.includes('express'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasNextjs',
      projectType.frameworks.includes('nextjs'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasSvelte',
      projectType.frameworks.includes('svelte'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasVue',
      projectType.frameworks.includes('vue'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasSolid',
      projectType.frameworks.includes('solid'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasNuxtjs',
      projectType.frameworks.includes('nuxtjs'),
    );
    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.hasTypeScript',
      projectType.hasTypeScript,
    );

    this.logger.debug('Context variables updated', projectType);
  }

  public clearCache(): void {
    this.projectTypeCache.clear();
    this.logger.debug('Project type cache cleared');
  }

  public dispose(): void {
    this.watchers.forEach((watcher) => {
      try {
        watcher.dispose();
      } catch (error) {
        this.logger.warn('Failed to dispose project detection watcher', error);
      }
    });
    this.watchers = [];
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      if (!isSafeFilePath(filePath)) {
        this.logger.warn('Unsafe path detected during existence check', { filePath });
        return false;
      }

      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public onWorkspaceChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.clearCache();
      void this.updateContextVariables();
      callback();
    });
  }
}
