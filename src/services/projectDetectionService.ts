import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { ProjectType } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for detecting and analyzing project types in the workspace.
 *
 * Analyzes the workspace folder to determine:
 * - Whether it's a Node.js project
 * - What frameworks are being used (React, Angular, Vue, etc.)
 * - Whether TypeScript is present
 * - The level of support the extension can provide
 *
 * Caches detection results to avoid repeated file system operations
 * and updates VS Code context variables for conditional UI elements.
 */
export class ProjectDetectionService {
  private static instance: ProjectDetectionService;
  private logger: Logger;
  private projectTypeCache = new Map<string, ProjectType>();

  /**
   * Private constructor to enforce singleton pattern.
   *
   * Initializes the logger instance for project detection operations.
   */
  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Gets the singleton instance of the ProjectDetectionService.
   *
   * Creates a new instance on first call, returns the existing instance
   * on subsequent calls.
   *
   * @returns The singleton ProjectDetectionService instance
   */
  public static getInstance(): ProjectDetectionService {
    if (!ProjectDetectionService.instance) {
      ProjectDetectionService.instance = new ProjectDetectionService();
    }
    return ProjectDetectionService.instance;
  }

  /**
   * Detects the type of project in the given workspace folder.
   *
   * Analyzes package.json and tsconfig.json to determine the project type,
   * frameworks used, TypeScript presence, and support level. Results are
   * cached to avoid repeated file system operations.
   *
   * @param workspaceFolder - The workspace folder to analyze. If not provided,
   *                          uses the first workspace folder
   * @returns A ProjectType object containing detection results
   */
  public async detectProjectType(workspaceFolder?: vscode.WorkspaceFolder): Promise<ProjectType> {
    if (!workspaceFolder && vscode.workspace.workspaceFolders) {
      workspaceFolder = vscode.workspace.workspaceFolders[0];
    }

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

  /**
   * Analyzes the project at the given path to determine its type.
   *
   * Reads package.json to detect dependencies and frameworks, checks for
   * TypeScript configuration, and determines the appropriate support level.
   *
   * @param projectPath - The file system path to the project directory
   * @returns A ProjectType object with analysis results
   */
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
      const packageData = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageData);
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

  /**
   * Detects frameworks from project dependencies.
   *
   * Checks for known framework packages in the dependencies object and
   * returns a list of detected frameworks.
   *
   * Supported frameworks:
   * - React
   * - Angular
   * - Express
   * - Next.js
   * - Vue.js
   * - Svelte
   * - Nest.js
   *
   * @param dependencies - Object containing project dependencies from package.json
   * @returns An array of framework names found in the project
   */
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

    // Nest.js
    if (dependencies['@nestjs/core']) {
      frameworks.push('nestjs');
    }

    return frameworks;
  }

  /**
   * Determines if the project is a Node.js project based on dependencies.
   *
   * Checks for common Node.js project indicators such as frameworks,
   * build tools, and TypeScript packages.
   *
   * @param dependencies - Object containing project dependencies from package.json
   * @returns True if the project appears to be a Node.js project, false otherwise
   */
  private isNodeJsProject(dependencies: Record<string, string>): boolean {
    // Check for common Node.js indicators
    const nodeIndicators = [
      'express',
      'react',
      'angular',
      'next',
      'vue',
      'svelte',
      '@angular/core',
      '@nestjs/core',
      'typescript',
      '@types/node',
      'webpack',
      'vite',
      'rollup',
    ];

    return nodeIndicators.some((indicator) => dependencies[indicator] !== undefined);
  }

  /**
   * Determines the level of support the extension can provide.
   *
   * @param isNodeProject - Whether the project is identified as a Node.js project
   * @param frameworks - Array of detected framework names
   * @param hasTypeScript - Whether TypeScript is present in the project
   * @returns The support level: 'full' for frameworks with TypeScript,
   *          'partial' for frameworks or TypeScript alone, 'none' otherwise
   */
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

  /**
   * Creates a ProjectType object from the given parameters.
   *
   * Constructs a standardized project type object with all detected
   * information.
   *
   * @param isNodeProject - Whether the project is a Node.js project
   * @param frameworks - Array of detected framework names
   * @param hasTypeScript - Whether TypeScript is present
   * @param supportLevel - The level of support ('full', 'partial', or 'none')
   * @returns A complete ProjectType object
   */
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

  /**
   * Updates VS Code context variables based on the detected project type.
   *
   * Sets context variables that can be used in package.json for when clauses
   * to conditionally show/hide UI elements based on project characteristics.
   *
   * Context variables set:
   * - additionalContextMenus.isNodeProject
   * - additionalContextMenus.hasReact
   * - additionalContextMenus.hasAngular
   * - additionalContextMenus.hasExpress
   * - additionalContextMenus.hasNextjs
   * - additionalContextMenus.hasTypeScript
   */
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
      'additionalContextMenus.hasTypeScript',
      projectType.hasTypeScript,
    );

    this.logger.debug('Context variables updated', projectType);
  }

  /**
   * Clears the project type cache.
   *
   * Removes all cached project type information, forcing re-analysis
   * on the next detection request. Useful when projects have been
   * modified or dependencies have changed.
   */
  public clearCache(): void {
    this.projectTypeCache.clear();
    this.logger.debug('Project type cache cleared');
  }

  /**
   * Checks if a path exists on the file system.
   *
   * Uses fs.access() to check for file/directory existence without
   * throwing an error.
   *
   * @param path - The file system path to check
   * @returns True if the path exists, false otherwise
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Registers a callback to be invoked when the workspace folders change.
   *
   * When workspace folders are added or removed, clears the cache,
   * updates context variables, and invokes the provided callback.
   *
   * @param callback - Function to call when workspace changes occur
   * @returns A disposable that can be used to unregister the listener
   */
  public onWorkspaceChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.clearCache();
      void this.updateContextVariables();
      callback();
    });
  }
}
