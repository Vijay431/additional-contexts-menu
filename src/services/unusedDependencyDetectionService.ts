import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import { DependencyInfo, UnusedDependencyDetectionResult } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Unused Dependency Detection Service
 *
 * Scans codebase for dependencies that are installed but never imported.
 * Suggests safe removal and identifies devDependencies incorrectly listed as dependencies.
 */
export class UnusedDependencyDetectionService {
  private static instance: UnusedDependencyDetectionService | undefined;
  private logger: Logger;

  // Patterns for detecting imports
  private readonly importPatterns = {
    // ES6 imports: import ... from 'package'
    es6Import: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
    // CommonJS: require('package')
    commonjsRequire: /require\(['"]([^'"]+)['"]\)/g,
    // Dynamic imports: import('package')
    dynamicImport: /import\(['"]([^'"]+)['"]\)/g,
    // TypeScript import types: import type { ... } from 'package'
    typeImport: /import\s+type\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g,
    // @ts-expect-error with require: // @ts-expect-error require('package')
    tsExpectRequire: /\/\/\s*@ts-expect-error\s+require\(['"]([^'"]+)['"]\)/g,
  };

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): UnusedDependencyDetectionService {
    UnusedDependencyDetectionService.instance ??= new UnusedDependencyDetectionService();
    return UnusedDependencyDetectionService.instance;
  }

  /**
   * Detect unused dependencies in the workspace
   */
  public async detectUnusedDependencies(config?: {
    scanDevDependencies?: boolean;
    checkMisplacedDependencies?: boolean;
    ignorePatterns?: string[];
    maxFileCount?: number;
  }): Promise<UnusedDependencyDetectionResult> {
    const startTime = Date.now();
    const scanDevDependencies = config?.scanDevDependencies ?? true;
    const checkMisplacedDependencies = config?.checkMisplacedDependencies ?? true;
    const ignorePatterns = config?.ignorePatterns ?? [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      '.nuxt/**',
      'coverage/**',
      '**/*.min.js',
      '**/*.map',
    ];
    const maxFileCount = config?.maxFileCount ?? 200;

    try {
      // Find package.json
      const packageJsonPath = await this.findPackageJson();
      if (!packageJsonPath) {
        return {
          file: '',
          unusedDependencies: [],
          misplacedDependencies: [],
          totalDependencies: 0,
          totalUnused: 0,
          suggestions: [],
          analysisDuration: Date.now() - startTime,
        };
      }

      // Parse package.json
      const packageJson = await this.parsePackageJson(packageJsonPath);

      // Get all dependencies
      const allDependencies = new Map<string, DependencyInfo>();

      // Process regular dependencies
      for (const [name, version] of Object.entries(packageJson.dependencies ?? {})) {
        allDependencies.set(name, {
          name,
          version: String(version),
          type: 'dependency',
        });
      }

      // Process dev dependencies
      for (const [name, version] of Object.entries(packageJson.devDependencies ?? {})) {
        allDependencies.set(name, {
          name,
          version: String(version),
          type: 'devDependency',
        });
      }

      // Scan project files for imports
      const usedDependencies = await this.scanProjectFiles(
        packageJsonPath,
        ignorePatterns,
        maxFileCount,
      );

      // Find unused dependencies
      const unusedDependencies: DependencyInfo[] = [];
      for (const [name, dep] of allDependencies) {
        if (dep.type === 'dependency' || scanDevDependencies) {
          if (!usedDependencies.has(name)) {
            unusedDependencies.push(dep);
          }
        }
      }

      // Find misplaced dependencies (in dependencies but should be in devDependencies)
      const misplacedDependencies: DependencyInfo[] = [];
      if (checkMisplacedDependencies) {
        for (const [name, dep] of allDependencies) {
          if (dep.type === 'dependency' && this.isDevOnlyDependency(name, usedDependencies)) {
            misplacedDependencies.push(dep);
          }
        }
      }

      // Generate suggestions
      const suggestions = this.generateSuggestions(
        unusedDependencies,
        misplacedDependencies,
        packageJsonPath,
      );

      const analysisDuration = Date.now() - startTime;

      this.logger.info(`Unused dependency detection completed in ${analysisDuration}ms`, {
        totalDependencies: allDependencies.size,
        unusedDependencies: unusedDependencies.length,
        misplacedDependencies: misplacedDependencies.length,
      });

      return {
        file: packageJsonPath,
        unusedDependencies,
        misplacedDependencies,
        totalDependencies: allDependencies.size,
        totalUnused: unusedDependencies.length,
        suggestions,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error detecting unused dependencies', error);
      return {
        file: '',
        unusedDependencies: [],
        misplacedDependencies: [],
        totalDependencies: 0,
        totalUnused: 0,
        suggestions: ['Failed to detect unused dependencies'],
        analysisDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Find the package.json file in the workspace
   */
  private async findPackageJson(): Promise<string | null> {
    if (!vscode.workspace.workspaceFolders) {
      return null;
    }

    for (const folder of vscode.workspace.workspaceFolders) {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        return packageJsonPath;
      } catch {
        // package.json doesn't exist, continue to next folder
      }
    }

    return null;
  }

  /**
   * Parse package.json file
   */
  private async parsePackageJson(filePath: string): Promise<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Scan project files for import statements
   */
  private async scanProjectFiles(
    packageJsonPath: string,
    ignorePatterns: string[],
    maxFileCount: number,
  ): Promise<Set<string>> {
    const usedPackages = new Set<string>();
    const projectRoot = path.dirname(packageJsonPath);

    // Supported file extensions for scanning
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

    // Find all files
    const files: string[] = [];
    for (const ext of extensions) {
      const pattern = new vscode.RelativePattern(vscode.Uri.file(projectRoot), `**/*${ext}`);

      try {
        const uris = await vscode.workspace.findFiles(
          pattern,
          ignorePatterns.join(','),
          maxFileCount,
        );

        for (const uri of uris) {
          files.push(uri.fsPath);
          if (files.length >= maxFileCount) {
            break;
          }
        }
      } catch {
        // Ignore errors
      }

      if (files.length >= maxFileCount) {
        break;
      }
    }

    this.logger.debug(`Scanning ${files.length} files for imports`);

    // Scan each file
    for (const filePath of files) {
      try {
        const packages = await this.extractImportsFromFile(filePath);
        for (const pkg of packages) {
          usedPackages.add(pkg);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return usedPackages;
  }

  /**
   * Extract import/require statements from a file
   */
  private async extractImportsFromFile(filePath: string): Promise<string[]> {
    const packages: Set<string> = new Set();

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Try all import patterns
      for (const pattern of Object.values(this.importPatterns)) {
        let match: RegExpExecArray | null;
        // Reset regex state
        pattern.lastIndex = 0;

        // eslint-disable-next-line no-cond-assign
        while ((match = pattern.exec(content)) !== null) {
          const packageName = match[1];
          if (packageName) {
            // Add package name (handle scoped packages)
            packages.add(this.normalizePackageName(packageName));
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }

    return Array.from(packages);
  }

  /**
   * Normalize package name (remove sub-paths)
   */
  private normalizePackageName(importPath: string): string {
    // Remove relative paths
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      return importPath;
    }

    // For scoped packages like @babel/core
    const scopedMatch = importPath.match(/^(@[^/]+)[/]/);
    if (scopedMatch) {
      return scopedMatch[1] ?? importPath;
    }

    // For regular packages, get the first part
    const parts = importPath.split('/');
    if (parts[0]?.startsWith('@')) {
      // Scoped package with scope
      return parts.slice(0, 2).join('/');
    }

    return parts[0] ?? importPath;
  }

  /**
   * Check if a dependency is only used in dev context
   */
  private isDevOnlyDependency(packageName: string, usedDependencies: Set<string>): boolean {
    const devOnlyPrefixes = [
      '@types/',
      '@babel/',
      '@swc/',
      'eslint',
      'prettier',
      'typescript',
      'ts-node',
      'nodemon',
      'jest',
      'vitest',
      'cypress',
      'playwright',
      '@testing-library',
      'webpack',
      'rollup',
      'vite',
      '@vitejs/',
      ' Parcel',
    ];

    const name = packageName.toLowerCase();

    return devOnlyPrefixes.some((prefix) => name.startsWith(prefix.toLowerCase()));
  }

  /**
   * Generate suggestions for removing unused dependencies
   */
  private generateSuggestions(
    unusedDependencies: DependencyInfo[],
    misplacedDependencies: DependencyInfo[],
    packageJsonPath: string,
  ): string[] {
    const suggestions: string[] = [];

    if (unusedDependencies.length > 0) {
      suggestions.push(
        `Found ${unusedDependencies.length} unused ${unusedDependencies.length === 1 ? 'dependency' : 'dependencies'}`,
      );

      // Show first 5 unused dependencies
      const toShow = unusedDependencies.slice(0, 10);
      for (const dep of toShow) {
        suggestions.push(`  - ${dep.name} (${dep.version})`);
      }

      if (unusedDependencies.length > 10) {
        suggestions.push(`  - ... and ${unusedDependencies.length - 10} more`);
      }

      suggestions.push('');
      suggestions.push('To remove unused dependencies safely:');
      suggestions.push(`1. Review the list above`);
      suggestions.push(`2. Run tests to ensure they are truly unused`);
      suggestions.push(`3. Remove with: npm uninstall ${toShow.map((d) => d.name).join(' ')}`);
    }

    if (misplacedDependencies.length > 0) {
      if (suggestions.length > 0) {
        suggestions.push('');
      }

      suggestions.push(
        `Found ${misplacedDependencies.length} ${misplacedDependencies.length === 1 ? 'dependency' : 'dependencies'} that should be in devDependencies`,
      );

      const toShow = misplacedDependencies.slice(0, 10);
      for (const dep of toShow) {
        suggestions.push(`  - ${dep.name} (${dep.version})`);
      }

      if (misplacedDependencies.length > 10) {
        suggestions.push(`  - ... and ${misplacedDependencies.length - 10} more`);
      }

      suggestions.push('');
      suggestions.push('To move these to devDependencies:');
      suggestions.push(`npm install ${toShow.map((d) => d.name).join(' ')} --save-dev`);
    }

    if (suggestions.length === 0) {
      suggestions.push('No unused dependencies found!');
      suggestions.push('Your dependencies look clean.');
    }

    return suggestions;
  }

  /**
   * Display results in output channel
   */
  public displayResults(result: UnusedDependencyDetectionResult): void {
    const outputChannel = vscode.window.createOutputChannel('Unused Dependencies');
    outputChannel.clear();

    outputChannel.appendLine('Unused Dependencies Detection Results');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine(`Analysis completed in ${result.analysisDuration}ms`);
    outputChannel.appendLine(`Total dependencies: ${result.totalDependencies}`);
    outputChannel.appendLine('');

    // Summary
    outputChannel.appendLine('Summary:');
    outputChannel.appendLine(`  Unused Dependencies: ${result.totalUnused}`);
    outputChannel.appendLine(`  Misplaced Dependencies: ${result.misplacedDependencies.length}`);
    outputChannel.appendLine('');

    // Unused dependencies
    if (result.unusedDependencies.length > 0) {
      outputChannel.appendLine('Unused Dependencies:');
      outputChannel.appendLine('-'.repeat(60));

      for (const dep of result.unusedDependencies) {
        outputChannel.appendLine(`  • ${dep.name} (${dep.version})`);
      }
      outputChannel.appendLine('');
    }

    // Misplaced dependencies
    if (result.misplacedDependencies.length > 0) {
      outputChannel.appendLine('Dependencies that should be in devDependencies:');
      outputChannel.appendLine('-'.repeat(60));

      for (const dep of result.misplacedDependencies) {
        outputChannel.appendLine(`  • ${dep.name} (${dep.version})`);
      }
      outputChannel.appendLine('');
    }

    // Suggestions
    if (result.suggestions.length > 0) {
      outputChannel.appendLine('Suggestions:');
      outputChannel.appendLine('-'.repeat(60));
      for (const suggestion of result.suggestions) {
        outputChannel.appendLine(suggestion);
      }
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(60));

    outputChannel.show();
  }
}
