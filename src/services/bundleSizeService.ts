import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import {
  BundleAnalysis,
  BundleInfo,
  CodeSplittingSuggestion,
  ModuleInfo,
} from '../types/extension';
import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

/**
 * Bundle Size Service
 *
 * Analyzes build output to visualize bundle composition, identify large modules,
 * and suggest code-splitting opportunities. Supports various bundlers including
 * webpack, Vite, Rollup, and esbuild.
 */
export class BundleSizeService {
  private static instance: BundleSizeService | undefined;
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;

  // Common build output directories and files
  private readonly buildPaths = [
    'dist',
    'build',
    'out',
    '.next',
    '.output',
    'public/build',
    'assets/dist',
  ];

  private readonly statsFiles = [
    'build-stats.json',
    'stats.json',
    'bundle-stats.json',
    'vite-stats.json',
    '.vite/stats.json',
    'webpack-stats.json',
    '.webpack-stats.json',
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.outputChannel = vscode.window.createOutputChannel('Bundle Size Analysis');
  }

  public static getInstance(): BundleSizeService {
    BundleSizeService.instance ??= new BundleSizeService();
    return BundleSizeService.instance;
  }

  /**
   * Analyze bundle size for the current workspace
   */
  public async analyzeBundleSize(): Promise<BundleAnalysis | null> {
    this.logger.info('Starting bundle size analysis');

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return null;
      }

      // Find build output directory
      const buildDir = await this.findBuildDirectory(workspaceFolder.uri.fsPath);
      if (!buildDir) {
        vscode.window.showWarningMessage(
          'No build output directory found. Please build your project first.',
        );
        return null;
      }

      this.logger.info(`Found build directory: ${buildDir}`);

      // Try to find stats file first
      const statsFile = await this.findStatsFile(buildDir);
      if (statsFile) {
        return await this.analyzeStatsFile(statsFile, buildDir);
      }

      // Fallback to analyzing bundle files directly
      return await this.analyzeBundleFiles(buildDir);
    } catch (error) {
      this.logger.error('Error analyzing bundle size', error);
      vscode.window.showErrorMessage(`Failed to analyze bundle size: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Find the build output directory
   */
  private async findBuildDirectory(workspacePath: string): Promise<string | null> {
    for (const buildPath of this.buildPaths) {
      const fullPath = path.join(workspacePath, buildPath);
      if (!isSafeFilePath(fullPath)) {
        continue;
      }

      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          return fullPath;
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }

    return null;
  }

  /**
   * Find a stats file from various bundlers
   */
  private async findStatsFile(buildDir: string): Promise<string | null> {
    for (const statsFile of this.statsFiles) {
      const fullPath = path.join(buildDir, statsFile);
      if (!isSafeFilePath(fullPath)) {
        continue;
      }

      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        // File doesn't exist, continue
      }
    }

    return null;
  }

  /**
   * Analyze a stats file (webpack, Vite, etc.)
   */
  private async analyzeStatsFile(statsFilePath: string, buildDir: string): Promise<BundleAnalysis> {
    if (!isSafeFilePath(statsFilePath)) {
      throw new Error('Invalid stats file path');
    }

    const content = await fs.readFile(statsFilePath, 'utf-8');
    const stats = JSON.parse(content);

    // Detect stats format and parse accordingly
    if (this.isWebpackStats(stats)) {
      return this.parseWebpackStats(stats, buildDir);
    } else if (this.isViteStats(stats)) {
      return this.parseViteStats(stats, buildDir);
    }

    // Generic stats parsing
    return this.parseGenericStats(stats, buildDir);
  }

  /**
   * Analyze bundle files directly (fallback)
   */
  private async analyzeBundleFiles(buildDir: string): Promise<BundleAnalysis> {
    const bundles: BundleInfo[] = [];
    let totalSize = 0;
    const modules: ModuleInfo[] = [];
    const moduleMap = new Map<string, ModuleInfo>();

    try {
      const files = await this.getAllBundleFiles(buildDir);

      for (const file of files) {
        const stat = await fs.stat(file);
        const size = stat.size;
        const relativePath = path.relative(buildDir, file);

        const bundleInfo: BundleInfo = {
          name: path.basename(file),
          path: relativePath,
          size,
          gzipSize: await this.estimateGzipSize(size),
          modules: [],
        };

        bundles.push(bundleInfo);
        totalSize += size;

        // For JS files, try to estimate modules
        if (file.endsWith('.js')) {
          const estimatedModules = await this.estimateModules(file, buildDir);
          for (const module of estimatedModules) {
            const existing = moduleMap.get(module.name);
            if (existing) {
              existing.size += module.size;
            } else {
              moduleMap.set(module.name, module);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error analyzing bundle files', error);
    }

    // Convert module map to array and sort by size
    const sortedModules = Array.from(moduleMap.values()).sort((a, b) => b.size - a.size);

    return {
      bundles,
      totalSize,
      totalGzipSize: bundles.reduce((sum, b) => sum + b.gzipSize, 0),
      modules: sortedModules,
      codeSplittingSuggestions: this.generateCodeSplittingSuggestions(bundles, sortedModules),
    };
  }

  /**
   * Get all bundle files in directory
   */
  private async getAllBundleFiles(dir: string): Promise<string[]> {
    const bundleFiles: string[] = [];

    if (!isSafeFilePath(dir)) {
      return bundleFiles;
    }

    async function traverse(currentPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (!isSafeFilePath(fullPath)) {
            continue;
          }

          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (
            entry.isFile() &&
            (/\.(js|mjs|cjs)$/.test(entry.name) ||
              /\.css$/.test(entry.name) ||
              entry.name.includes('bundle') ||
              entry.name.includes('chunk'))
          ) {
            // Skip source maps and manifest files
            if (!entry.name.endsWith('.map') && !entry.name.includes('manifest')) {
              bundleFiles.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    await traverse(dir);
    return bundleFiles;
  }

  /**
   * Estimate gzip size (rough approximation)
   */
  private async estimateGzipSize(originalSize: number): Promise<number> {
    // Rough approximation: gzip typically reduces to 20-30% of original
    // This is a simplified calculation
    return Math.floor(originalSize * 0.25);
  }

  /**
   * Estimate modules from a bundle file (basic heuristic)
   */
  private async estimateModules(bundlePath: string, buildDir: string): Promise<ModuleInfo[]> {
    const modules: ModuleInfo[] = [];

    try {
      const content = await fs.readFile(bundlePath, 'utf-8');

      // Look for common patterns that indicate module boundaries
      // This is a simplified approach - real module parsing would require AST analysis

      // Pattern: __webpack_require__, require(), import statements
      const importPatterns = [
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /require\(['"]([^'"]+)['"]\)/g,
        /__webpack_require__\(\d+\)/g,
      ];

      const modulePaths = new Set<string>();

      for (const pattern of importPatterns) {
        let match: RegExpExecArray | null;
        // eslint-disable-next-line no-cond-assign
        while ((match = pattern.exec(content)) !== null) {
          const modulePath = match[1] ?? '';
          if (modulePath && !modulePath.startsWith('.')) {
            // External dependency
            const parts = modulePath.split('/');
            const packageName = parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
            if (packageName) {
              modulePaths.add(packageName);
            }
          }
        }
      }

      // Estimate module sizes based on content length / number of modules
      const estimatedModuleSize = Math.floor(content.length / (modulePaths.size || 1));

      for (const modulePath of modulePaths) {
        modules.push({
          name: modulePath,
          size: estimatedModuleSize,
          path: modulePath,
        });
      }
    } catch {
      // File might be binary or unreadable
    }

    return modules;
  }

  /**
   * Parse webpack stats format
   */
  private parseWebpackStats(stats: any, buildDir: string): BundleAnalysis {
    const bundles: BundleInfo[] = [];
    const modules: ModuleInfo[] = [];
    const moduleMap = new Map<string, ModuleInfo>();
    let totalSize = 0;

    // Parse assets (bundles)
    if (stats.assets && Array.isArray(stats.assets)) {
      for (const asset of stats.assets) {
        if (asset.name.endsWith('.js') || asset.name.endsWith('.css')) {
          const size = asset.size || 0;
          const bundleInfo: BundleInfo = {
            name: asset.name,
            path: asset.name,
            size,
            gzipSize: 0, // Would need additional calculation
            modules: [],
          };

          bundles.push(bundleInfo);
          totalSize += size;
        }
      }
    }

    // Parse modules
    if (stats.modules && Array.isArray(stats.modules)) {
      for (const module of stats.modules) {
        const moduleInfo: ModuleInfo = {
          name: module.name || module.identifier || 'unknown',
          size: module.size || 0,
          path: module.name || '',
        };

        modules.push(moduleInfo);

        // Aggregate by package name
        const packageName = this.extractPackageName(moduleInfo.name);
        const existing = moduleMap.get(packageName);
        if (existing) {
          existing.size += moduleInfo.size;
        } else {
          moduleMap.set(packageName, { ...moduleInfo, name: packageName });
        }
      }
    }

    const sortedModules = Array.from(moduleMap.values()).sort((a, b) => b.size - a.size);

    return {
      bundles,
      totalSize,
      totalGzipSize: Math.floor(totalSize * 0.25),
      modules: sortedModules,
      codeSplittingSuggestions: this.generateCodeSplittingSuggestions(bundles, sortedModules),
    };
  }

  /**
   * Parse Vite stats format
   */
  private parseViteStats(stats: any, buildDir: string): BundleAnalysis {
    const bundles: BundleInfo[] = [];
    const modules: ModuleInfo[] = [];
    let totalSize = 0;

    // Vite stats structure
    if (stats.output && Array.isArray(stats.output)) {
      for (const output of stats.output) {
        if (output.type === 'chunk' && output.fileName.match(/\.(js|css)$/)) {
          const size = output.size || 0;
          const bundleInfo: BundleInfo = {
            name: output.fileName,
            path: output.fileName,
            size,
            gzipSize: 0,
            modules: [],
          };

          bundles.push(bundleInfo);
          totalSize += size;

          // Parse modules in chunk
          if (output.modules && Array.isArray(output.modules)) {
            for (const module of output.modules) {
              const moduleInfo: ModuleInfo = {
                name: module.id || 'unknown',
                size: 0, // Vite doesn't always include module size
                path: module.id || '',
              };
              modules.push(moduleInfo);
            }
          }
        }
      }
    }

    return {
      bundles,
      totalSize,
      totalGzipSize: Math.floor(totalSize * 0.25),
      modules,
      codeSplittingSuggestions: this.generateCodeSplittingSuggestions(bundles, modules),
    };
  }

  /**
   * Parse generic stats format
   */
  private parseGenericStats(stats: any, buildDir: string): BundleAnalysis {
    return this.analyzeBundleFiles(buildDir);
  }

  /**
   * Extract package name from module path
   */
  private extractPackageName(modulePath: string): string {
    // Match node_modules/package_name or package_name patterns
    const nodeModulesMatch = /node_modules\/([^/]+)/.exec(modulePath);
    if (nodeModulesMatch) {
      return nodeModulesMatch[1] ?? modulePath;
    }

    // For scoped packages
    const scopedMatch = /node_modules\/(@[^/]+\/[^/]+)/.exec(modulePath);
    if (scopedMatch) {
      return scopedMatch[1] ?? modulePath;
    }

    // Return the first segment for local modules
    const segments = modulePath.split('/');
    return segments[0] ?? modulePath;
  }

  /**
   * Generate code-splitting suggestions
   */
  private generateCodeSplittingSuggestions(
    bundles: BundleInfo[],
    modules: ModuleInfo[],
  ): CodeSplittingSuggestion[] {
    const suggestions: CodeSplittingSuggestion[] = [];

    // Check for large bundles (> 200KB)
    const largeBundles = bundles.filter((b) => b.size > 200_000);
    for (const bundle of largeBundles) {
      suggestions.push({
        type: 'split-large-bundle',
        description: `Large bundle detected: ${bundle.name} (${this.formatSize(bundle.size)})`,
        suggestion: `Consider splitting ${bundle.name} into smaller chunks using dynamic imports`,
        impact: 'high',
      });
    }

    // Check for large modules (> 50KB)
    const largeModules = modules.filter((m) => m.size > 50_000);
    for (const module of largeModules.slice(0, 5)) {
      suggestions.push({
        type: 'lazy-load-module',
        description: `Large module: ${module.name} (${this.formatSize(module.size)})`,
        suggestion: `Consider lazy-loading ${module.name} with dynamic import()`,
        impact: module.size > 100_000 ? 'high' : 'medium',
      });
    }

    // Check for duplicate dependencies
    const moduleCount = new Map<string, number>();
    for (const module of modules) {
      const name = this.extractPackageName(module.name);
      moduleCount.set(name, (moduleCount.get(name) ?? 0) + 1);
    }

    for (const [name, count] of moduleCount.entries()) {
      if (count > 1) {
        suggestions.push({
          type: 'deduplicate-dependency',
          description: `Duplicate dependency: ${name} appears ${count} times`,
          suggestion: `Consider deduplicating ${name} to reduce bundle size`,
          impact: 'medium',
        });
      }
    }

    // Check for missing code splitting
    if (bundles.length <= 2 && bundles.some((b) => b.size > 100_000)) {
      suggestions.push({
        type: 'enable-code-splitting',
        description: 'No code splitting detected',
        suggestion:
          'Enable code splitting in your bundler configuration to improve initial load time',
        impact: 'high',
      });
    }

    return suggestions;
  }

  /**
   * Format size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
  }

  /**
   * Check if stats object is webpack format
   */
  private isWebpackStats(stats: any): boolean {
    return (
      stats &&
      (stats.assets !== undefined || stats.chunks !== undefined || stats.modules !== undefined)
    );
  }

  /**
   * Check if stats object is Vite format
   */
  private isViteStats(stats: any): boolean {
    return stats && stats.output !== undefined;
  }

  /**
   * Display analysis results in output channel
   */
  public displayResults(analysis: BundleAnalysis): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('╔════════════════════════════════════════════════════════╗');
    this.outputChannel.appendLine('║          Bundle Size Analysis Results                   ║');
    this.outputChannel.appendLine('╚════════════════════════════════════════════════════════╝');
    this.outputChannel.appendLine('');

    // Summary
    this.outputChannel.appendLine('📊 SUMMARY');
    this.outputChannel.appendLine('─'.repeat(60));
    this.outputChannel.appendLine(`Total Bundle Size: ${this.formatSize(analysis.totalSize)}`);
    this.outputChannel.appendLine(`Estimated Gzip: ${this.formatSize(analysis.totalGzipSize)}`);
    this.outputChannel.appendLine(`Number of Bundles: ${analysis.bundles.length}`);
    this.outputChannel.appendLine(`Number of Modules: ${analysis.modules.length}`);
    this.outputChannel.appendLine('');

    // Bundles
    this.outputChannel.appendLine('📦 BUNDLES');
    this.outputChannel.appendLine('─'.repeat(60));
    for (const bundle of analysis.bundles.sort((a, b) => b.size - a.size)) {
      const sizeBar = this.generateSizeBar(bundle.size, analysis.totalSize);
      this.outputChannel.appendLine(
        `${bundle.name.padEnd(30)} ${this.formatSize(bundle.size).padStart(10)} ${sizeBar}`,
      );
    }
    this.outputChannel.appendLine('');

    // Top modules
    this.outputChannel.appendLine('📄 TOP MODULES (by size)');
    this.outputChannel.appendLine('─'.repeat(60));
    const topModules = analysis.modules.slice(0, 15);
    for (const module of topModules) {
      const sizeBar = this.generateSizeBar(module.size, analysis.totalSize);
      const name = module.name.length > 30 ? `${module.name.slice(0, 27)}...` : module.name;
      this.outputChannel.appendLine(
        `${name.padEnd(30)} ${this.formatSize(module.size).padStart(10)} ${sizeBar}`,
      );
    }
    this.outputChannel.appendLine('');

    // Code splitting suggestions
    if (analysis.codeSplittingSuggestions.length > 0) {
      this.outputChannel.appendLine('💡 CODE-SPLITTING SUGGESTIONS');
      this.outputChannel.appendLine('─'.repeat(60));
      for (const suggestion of analysis.codeSplittingSuggestions.slice(0, 10)) {
        const impactIcon =
          suggestion.impact === 'high' ? '🔴' : suggestion.impact === 'medium' ? '🟡' : '🟢';
        this.outputChannel.appendLine(`${impactIcon} ${suggestion.description}`);
        this.outputChannel.appendLine(`   → ${suggestion.suggestion}`);
        this.outputChannel.appendLine('');
      }
    }

    this.outputChannel.show(true);
  }

  /**
   * Generate a visual size bar
   */
  private generateSizeBar(size: number, total: number): string {
    const percentage = Math.max(0, Math.min(100, (size / total) * 100));
    const barLength = Math.floor(percentage / 5);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    return `[${bar}] ${percentage.toFixed(1)}%`;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}
