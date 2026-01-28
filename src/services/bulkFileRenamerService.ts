import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { CodeAnalysisService } from './codeAnalysisService';

/**
 * Information about a file to be renamed
 */
export interface FileRenameOperation {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

/**
 * Information about an import that needs to be updated
 */
export interface ImportUpdate {
  filePath: string;
  oldImportPath: string;
  newImportPath: string;
  lineNumber: number;
  importType: 'named' | 'default' | 'namespace';
}

/**
 * Result of analyzing the impact of a rename operation
 */
export interface RenameAnalysis {
  filesToRename: FileRenameOperation[];
  importsToUpdate: Map<string, ImportUpdate[]>; // filePath -> imports to update
  circularDependencies: string[][]; // Arrays of file paths forming cycles
  totalAffectedFiles: number;
  estimatedDuration: number;
}

/**
 * Result of a bulk rename operation
 */
export interface BulkRenameResult {
  success: boolean;
  renamedFiles: Array<{ oldPath: string; newPath: string }>;
  updatedImports: Array<{ filePath: string; updateCount: number }>;
  failedFiles: Array<{ path: string; error: string }>;
  failedUpdates: Array<{ filePath: string; error: string }>;
  totalFiles: number;
  totalImportsUpdated: number;
  duration: number;
}

/**
 * Options for bulk rename operation
 */
export interface BulkRenameOptions {
  dryRun?: boolean;
  recursive?: boolean;
  ignorePatterns?: RegExp[];
  fileExtensions?: string[];
  updateImports?: boolean;
  skipCircularDependencyHandling?: boolean;
}

/**
 * File dependency information
 */
interface FileDependency {
  filePath: string;
  imports: Set<string>;
  importedBy: Set<string>;
}

/**
 * Bulk File Renamer Service
 *
 * Renames multiple files simultaneously while updating import statements
 * across the codebase. Provides preview of changes and handles circular dependencies.
 */
export class BulkFileRenamerService {
  private static instance: BulkFileRenamerService | undefined;
  private logger: Logger;
  private codeAnalysisService: CodeAnalysisService;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.logger = Logger.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
    this.outputChannel = vscode.window.createOutputChannel('Bulk File Renamer');
  }

  public static getInstance(): BulkFileRenamerService {
    BulkFileRenamerService.instance ??= new BulkFileRenamerService();
    return BulkFileRenamerService.instance;
  }

  /**
   * Analyze the impact of renaming files before performing the operation
   */
  public async analyzeRename(
    dirPath: string,
    renameOperations: FileRenameOperation[],
    options: BulkRenameOptions = {},
  ): Promise<RenameAnalysis> {
    const startTime = Date.now();
    const importsToUpdate = new Map<string, ImportUpdate[]>();

    try {
      this.logger.info('Starting rename analysis', {
        directory: dirPath,
        filesToRename: renameOperations.length,
      });

      // Build a map of old paths to new paths
      const pathMapping = new Map<string, string>();
      for (const op of renameOperations) {
        pathMapping.set(op.oldPath, op.newPath);
      }

      // Get all files in the directory to scan for imports
      const files = await this.getFilesInDirectory(
        dirPath,
        options.recursive ?? true,
        options.fileExtensions ?? [],
      );

      // Analyze each file for imports that need updating
      for (const filePath of files) {
        // Skip files that are being renamed (we'll handle them separately)
        if (pathMapping.has(filePath)) {
          continue;
        }

        const fileImports = await this.analyzeImports(filePath, pathMapping);

        if (fileImports.length > 0) {
          importsToUpdate.set(filePath, fileImports);
        }
      }

      // Build dependency graph and detect circular dependencies
      const circularDependencies = options.skipCircularDependencyHandling
        ? []
        : await this.detectCircularDependencies(dirPath, renameOperations, options);

      const totalAffectedFiles = renameOperations.length + importsToUpdate.size;
      const estimatedDuration = this.estimateDuration(
        renameOperations.length,
        importsToUpdate.size,
      );

      this.logger.info('Rename analysis completed', {
        filesToRename: renameOperations.length,
        importsToUpdate: importsToUpdate.size,
        circularDependencies: circularDependencies.length,
        totalAffectedFiles,
      });

      return {
        filesToRename: renameOperations,
        importsToUpdate,
        circularDependencies,
        totalAffectedFiles,
        estimatedDuration,
      };
    } catch (error) {
      this.logger.error('Error during rename analysis', error);
      return {
        filesToRename: renameOperations,
        importsToUpdate: new Map(),
        circularDependencies: [],
        totalAffectedFiles: renameOperations.length,
        estimatedDuration: 0,
      };
    }
  }

  /**
   * Execute the bulk rename operation
   */
  public async executeRename(
    dirPath: string,
    renameOperations: FileRenameOperation[],
    options: BulkRenameOptions = {},
  ): Promise<BulkRenameResult> {
    const startTime = Date.now();
    const renamedFiles: Array<{ oldPath: string; newPath: string }> = [];
    const failedFiles: Array<{ path: string; error: string }> = [];
    const updatedImports: Array<{ filePath: string; updateCount: number }> = [];
    const failedUpdates: Array<{ filePath: string; error: string }> = [];

    try {
      this.logger.info('Starting bulk rename operation', {
        directory: dirPath,
        filesToRename: renameOperations.length,
        dryRun: options.dryRun,
        updateImports: options.updateImports,
      });

      // First, analyze the rename if we need to update imports
      let analysis: RenameAnalysis | null = null;
      if (options.updateImports) {
        analysis = await this.analyzeRename(dirPath, renameOperations, options);

        // Check for circular dependencies
        if (analysis.circularDependencies.length > 0) {
          this.logger.warn('Circular dependencies detected', {
            cycles: analysis.circularDependencies,
          });

          if (!options.skipCircularDependencyHandling) {
            this.showCircularDependencyWarning(analysis.circularDependencies);
          }
        }
      }

      // Order the renames to handle dependencies correctly
      const orderedRenames =
        analysis && !options.skipCircularDependencyHandling
          ? this.orderRenamesByDependency(renameOperations, analysis.circularDependencies)
          : renameOperations;

      // Execute renames
      for (const operation of orderedRenames) {
        try {
          if (options.dryRun) {
            renamedFiles.push({
              oldPath: operation.oldPath,
              newPath: operation.newPath,
            });
          } else {
            await this.renameSingleFile(operation.oldPath, operation.newPath);
            renamedFiles.push({
              oldPath: operation.oldPath,
              newPath: operation.newPath,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failedFiles.push({
            path: operation.oldPath,
            error: errorMessage,
          });
          this.logger.error('Failed to rename file', {
            oldPath: operation.oldPath,
            newPath: operation.newPath,
            error: errorMessage,
          });
        }
      }

      // Update imports if requested and not a dry run
      if (options.updateImports && !options.dryRun && analysis) {
        for (const [filePath, imports] of analysis.importsToUpdate) {
          try {
            const updateCount = await this.updateImportsInFile(filePath, imports);
            updatedImports.push({
              filePath,
              updateCount,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            failedUpdates.push({
              filePath,
              error: errorMessage,
            });
            this.logger.error('Failed to update imports', {
              filePath,
              error: errorMessage,
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      const totalImportsUpdated = updatedImports.reduce((sum, item) => sum + item.updateCount, 0);

      this.logger.info('Bulk rename operation completed', {
        duration,
        renamedFiles: renamedFiles.length,
        failedFiles: failedFiles.length,
        updatedImports: updatedImports.length,
        failedUpdates: failedUpdates.length,
        totalImportsUpdated,
      });

      return {
        success: failedFiles.length === 0 && failedUpdates.length === 0,
        renamedFiles,
        updatedImports,
        failedFiles,
        failedUpdates,
        totalFiles: renameOperations.length,
        totalImportsUpdated,
        duration,
      };
    } catch (error) {
      this.logger.error('Error during bulk rename', error);
      return {
        success: false,
        renamedFiles,
        updatedImports,
        failedFiles,
        failedUpdates,
        totalFiles: renameOperations.length,
        totalImportsUpdated: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Display the analysis results in the output channel
   */
  public displayAnalysis(analysis: RenameAnalysis, dryRun: boolean): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine(`Bulk File Rename ${dryRun ? '(Dry Run)' : ''}`);
    this.outputChannel.appendLine('─'.repeat(60));
    this.outputChannel.appendLine('');

    // Files to rename
    this.outputChannel.appendLine(`Files to Rename (${analysis.filesToRename.length}):`);
    for (const op of analysis.filesToRename) {
      const oldName = path.basename(op.oldPath);
      const newName = path.basename(op.newPath);
      this.outputChannel.appendLine(`  ${oldName} → ${newName}`);
      this.outputChannel.appendLine(`    ${op.oldPath}`);
      this.outputChannel.appendLine(`    → ${op.newPath}`);
    }
    this.outputChannel.appendLine('');

    // Imports to update
    this.outputChannel.appendLine(`Imports to Update (${analysis.importsToUpdate.size} files):`);
    for (const [filePath, imports] of analysis.importsToUpdate) {
      this.outputChannel.appendLine(
        `  ${path.relative(vscode.workspace.rootPath ?? '', filePath)}:`,
      );
      for (const imp of imports) {
        this.outputChannel.appendLine(
          `    Line ${imp.lineNumber}: ${imp.oldImportPath} → ${imp.newImportPath}`,
        );
      }
    }
    this.outputChannel.appendLine('');

    // Circular dependencies
    if (analysis.circularDependencies.length > 0) {
      this.outputChannel.appendLine(
        `Circular Dependencies Detected (${analysis.circularDependencies.length}):`,
      );
      for (let i = 0; i < analysis.circularDependencies.length; i++) {
        const cycle = analysis.circularDependencies[i];
        this.outputChannel.appendLine(`  Cycle ${i + 1}:`);
        for (const filePath of cycle) {
          this.outputChannel.appendLine(
            `    ${path.relative(vscode.workspace.rootPath ?? '', filePath)}`,
          );
        }
      }
      this.outputChannel.appendLine('');
    }

    // Summary
    this.outputChannel.appendLine('Summary:');
    this.outputChannel.appendLine(`  Files to rename: ${analysis.filesToRename.length}`);
    this.outputChannel.appendLine(
      `  Files with imports to update: ${analysis.importsToUpdate.size}`,
    );
    this.outputChannel.appendLine(
      `  Circular dependencies: ${analysis.circularDependencies.length}`,
    );
    this.outputChannel.appendLine(`  Total affected files: ${analysis.totalAffectedFiles}`);
    this.outputChannel.appendLine(`  Estimated duration: ${analysis.estimatedDuration}ms`);
    this.outputChannel.appendLine('');

    this.outputChannel.show();
  }

  /**
   * Display the results of a bulk rename operation
   */
  public displayResults(result: BulkRenameResult, dryRun: boolean): void {
    this.outputChannel.clear();

    const action = dryRun ? 'Would rename' : 'Renamed';
    this.outputChannel.appendLine(`Bulk Rename Results ${dryRun ? '(Dry Run)' : ''}`);
    this.outputChannel.appendLine('─'.repeat(60));
    this.outputChannel.appendLine('');

    this.outputChannel.appendLine(`Operation completed in ${result.duration}ms`);
    this.outputChannel.appendLine('');

    // Renamed files
    this.outputChannel.appendLine(`${action} files (${result.renamedFiles.length}):`);
    for (const file of result.renamedFiles) {
      const oldName = path.basename(file.oldPath);
      const newName = path.basename(file.newPath);
      this.outputChannel.appendLine(`  ${oldName} → ${newName}`);
    }
    this.outputChannel.appendLine('');

    // Updated imports
    if (result.updatedImports.length > 0) {
      this.outputChannel.appendLine(
        `Updated imports (${result.updatedImports.length} files, ${result.totalImportsUpdated} total):`,
      );
      for (const item of result.updatedImports) {
        this.outputChannel.appendLine(
          `  ${path.relative(vscode.workspace.rootPath ?? '', item.filePath)}: ${item.updateCount} update(s)`,
        );
      }
      this.outputChannel.appendLine('');
    }

    // Failed files
    if (result.failedFiles.length > 0) {
      this.outputChannel.appendLine(`Failed renames (${result.failedFiles.length}):`);
      for (const file of result.failedFiles) {
        this.outputChannel.appendLine(
          `  ${path.relative(vscode.workspace.rootPath ?? '', file.path)}: ${file.error}`,
        );
      }
      this.outputChannel.appendLine('');
    }

    // Failed updates
    if (result.failedUpdates.length > 0) {
      this.outputChannel.appendLine(`Failed import updates (${result.failedUpdates.length}):`);
      for (const item of result.failedUpdates) {
        this.outputChannel.appendLine(
          `  ${path.relative(vscode.workspace.rootPath ?? '', item.filePath)}: ${item.error}`,
        );
      }
      this.outputChannel.appendLine('');
    }

    // Summary
    this.outputChannel.appendLine('Summary:');
    this.outputChannel.appendLine(`  ${action} files: ${result.renamedFiles.length}`);
    this.outputChannel.appendLine(`  Failed: ${result.failedFiles.length}`);
    this.outputChannel.appendLine(`  Import updates: ${result.totalImportsUpdated}`);
    this.outputChannel.appendLine(`  Failed updates: ${result.failedUpdates.length}`);
    this.outputChannel.appendLine(`  Success: ${result.success ? 'Yes' : 'No'}`);
    this.outputChannel.appendLine('');

    this.outputChannel.show();
  }

  /**
   * Dispose the output channel
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }

  /**
   * Rename a single file
   */
  private async renameSingleFile(oldPath: string, newPath: string): Promise<void> {
    // Check if source file exists
    try {
      await fs.access(oldPath);
    } catch {
      throw new Error(`Source file does not exist: ${oldPath}`);
    }

    // Check if target file already exists
    try {
      await fs.access(newPath);
      throw new Error(`Target file already exists: ${newPath}`);
    } catch {
      // File doesn't exist, proceed with rename
    }

    // Perform the rename
    await fs.rename(oldPath, newPath);

    this.logger.debug('File renamed successfully', {
      oldPath,
      newPath,
    });
  }

  /**
   * Analyze imports in a file that need to be updated
   */
  private async analyzeImports(
    filePath: string,
    pathMapping: Map<string, string>,
  ): Promise<ImportUpdate[]> {
    const updates: ImportUpdate[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const importMatch = this.matchImportStatement(line);

        if (importMatch) {
          // Resolve the import path to an absolute path
          const importPath = importMatch.path;
          const resolvedPath = this.resolveImportPath(filePath, importPath);

          // Check if this import refers to a file being renamed
          if (resolvedPath && pathMapping.has(resolvedPath)) {
            const newResolvedPath = pathMapping.get(resolvedPath);
            if (newResolvedPath) {
              // Calculate the new import path
              const newImportPath = this.calculateRelativeImportPath(filePath, newResolvedPath);
              const oldImportPath = importPath;

              updates.push({
                filePath,
                oldImportPath,
                newImportPath,
                lineNumber: i + 1,
                importType: importMatch.type,
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error analyzing imports in file', {
        filePath,
        error,
      });
    }

    return updates;
  }

  /**
   * Match an import statement and extract the path and type
   */
  private matchImportStatement(
    line: string,
  ): { path: string; type: 'named' | 'default' | 'namespace' } | null {
    // Match various import statement patterns
    const patterns = [
      // Named imports: import { Foo } from './bar'
      /import\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/,
      // Default imports: import Foo from './bar'
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,
      // Namespace imports: import * as Foo from './bar'
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,
      // Side effect imports: import './bar'
      /import\s+['"]([^'"]+)['"]/,
      // Export from: export { Foo } from './bar'
      /export\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const importPath = match[1] ?? match[2] ?? '';
        const type = line.includes('* as') ? 'namespace' : line.includes('{') ? 'named' : 'default';
        return { path: importPath, type };
      }
    }

    return null;
  }

  /**
   * Resolve an import path to an absolute file path
   */
  private resolveImportPath(sourceFile: string, importPath: string): string | null {
    // Only handle relative imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    const sourceDir = path.dirname(sourceFile);
    let resolvedPath = path.resolve(sourceDir, importPath);

    // Try to resolve with different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];

    // First, try without extension (the import might not include it)
    for (const ext of extensions) {
      try {
        const pathWithExt = resolvedPath + ext;
        if (pathWithExt === sourceFile) {
          continue; // Skip the source file itself
        }
        fs.access(pathWithExt);
        return pathWithExt;
      } catch {
        // File doesn't exist, try next extension
      }
    }

    // Try with index files
    for (const ext of extensions) {
      try {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        fs.access(indexPath);
        return indexPath;
      } catch {
        // File doesn't exist, try next
      }
    }

    return null;
  }

  /**
   * Calculate a relative import path from source to target
   */
  private calculateRelativeImportPath(sourceFile: string, targetFile: string): string {
    const sourceDir = path.dirname(sourceFile);
    const targetDir = path.dirname(targetFile);
    const targetFileName = path.basename(targetFile, path.extname(targetFile));

    let relativePath = path.relative(sourceDir, targetDir);

    // Convert to POSIX-style path (forward slashes)
    relativePath = relativePath.split(path.sep).join('/');

    // Add './' prefix if needed
    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`;
    }

    // Remove file extension for imports
    return path.join(relativePath, targetFileName).split(path.sep).join('/');
  }

  /**
   * Update imports in a file
   */
  private async updateImportsInFile(filePath: string, imports: ImportUpdate[]): Promise<number> {
    if (imports.length === 0) {
      return 0;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let updateCount = 0;

    // Process imports in reverse order to maintain line numbers
    const sortedImports = [...imports].sort((a, b) => b.lineNumber - a.lineNumber);

    for (const imp of sortedImports) {
      const lineIndex = imp.lineNumber - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex] ?? '';
        lines[lineIndex] = line.replace(imp.oldImportPath, imp.newImportPath);
        updateCount++;
      }
    }

    // Write the updated content back to the file
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');

    this.logger.debug('Updated imports in file', {
      filePath,
      updateCount,
    });

    return updateCount;
  }

  /**
   * Detect circular dependencies in the rename operations
   */
  private async detectCircularDependencies(
    dirPath: string,
    renameOperations: FileRenameOperation[],
    options: BulkRenameOptions,
  ): Promise<string[][]> {
    const cycles: string[][] = [];

    try {
      // Build dependency graph
      const dependencies = new Map<string, FileDependency>();

      // Initialize graph with files being renamed
      for (const op of renameOperations) {
        dependencies.set(op.oldPath, {
          filePath: op.oldPath,
          imports: new Set(),
          importedBy: new Set(),
        });
      }

      // Get all files to scan for imports
      const files = await this.getFilesInDirectory(
        dirPath,
        options.recursive ?? true,
        options.fileExtensions ?? [],
      );

      // Build the dependency graph
      for (const filePath of files) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const importMatch = this.matchImportStatement(line);
          if (importMatch) {
            const resolvedPath = this.resolveImportPath(filePath, importMatch.path);
            if (resolvedPath && dependencies.has(resolvedPath)) {
              const dep = dependencies.get(resolvedPath);
              if (dep) {
                dep.importedBy.add(filePath);
              }
            }
          }
        }
      }

      // Detect cycles using depth-first search
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      const currentPath: string[] = [];

      const dfs = (node: string): void => {
        visited.add(node);
        recursionStack.add(node);
        currentPath.push(node);

        const dep = dependencies.get(node);
        if (dep) {
          for (const importer of dep.importedBy) {
            if (!visited.has(importer)) {
              dfs(importer);
            } else if (recursionStack.has(importer)) {
              // Found a cycle
              const cycleStart = currentPath.indexOf(importer);
              if (cycleStart >= 0) {
                cycles.push([...currentPath.slice(cycleStart), importer]);
              }
            }
          }
        }

        currentPath.pop();
        recursionStack.delete(node);
      };

      for (const [filePath] of dependencies) {
        if (!visited.has(filePath)) {
          dfs(filePath);
        }
      }
    } catch (error) {
      this.logger.error('Error detecting circular dependencies', error);
    }

    return cycles;
  }

  /**
   * Order renames to handle dependencies correctly
   */
  private orderRenamesByDependency(
    renameOperations: FileRenameOperation[],
    circularDependencies: string[][],
  ): FileRenameOperation[] {
    // If there are circular dependencies, we need to use a temporary intermediate name
    if (circularDependencies.length > 0) {
      this.logger.warn('Circular dependencies detected, using intermediate rename strategy');
      // For now, return the original order
      // A more sophisticated approach would rename to temporary names first
      return renameOperations;
    }

    // Order files by dependency (files with fewer dependencies first)
    return [...renameOperations].sort((a, b) => {
      // Sort by file depth (rename shallower files first)
      const aDepth = a.oldPath.split(path.sep).length;
      const bDepth = b.oldPath.split(path.sep).length;
      return aDepth - bDepth;
    });
  }

  /**
   * Get all files in a directory
   */
  private async getFilesInDirectory(
    dirPath: string,
    recursive: boolean,
    fileExtensions: string[],
  ): Promise<string[]> {
    const files: string[] = [];

    async function traverse(currentPath: string) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory() && recursive) {
            await traverse(fullPath);
          } else if (entry.isFile()) {
            // Filter by extension if specified
            if (fileExtensions.length === 0 || fileExtensions.includes(path.extname(fullPath))) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * Estimate the duration of the rename operation
   */
  private estimateDuration(fileCount: number, importUpdateCount: number): number {
    // Rough estimate: 10ms per file rename + 5ms per import update
    return fileCount * 10 + importUpdateCount * 5;
  }

  /**
   * Show a warning about circular dependencies
   */
  private showCircularDependencyWarning(cycles: string[][]): void {
    const message = `Circular dependencies detected (${cycles.length} cycle(s)). The rename operation may require multiple passes to update all imports correctly. Continue?`;

    vscode.window
      .showWarningMessage(message, 'View Details', 'Continue', 'Cancel')
      .then((selection) => {
        if (selection === 'View Details') {
          this.outputChannel.clear();
          this.outputChannel.appendLine('Circular Dependencies Detected:');
          this.outputChannel.appendLine('─'.repeat(60));
          this.outputChannel.appendLine('');

          for (let i = 0; i < cycles.length; i++) {
            const cycle = cycles[i];
            this.outputChannel.appendLine(`Cycle ${i + 1}:`);
            for (const filePath of cycle) {
              this.outputChannel.appendLine(
                `  ${path.relative(vscode.workspace.rootPath ?? '', filePath)}`,
              );
            }
            this.outputChannel.appendLine('');
          }

          this.outputChannel.show();
        }
      });
  }
}
