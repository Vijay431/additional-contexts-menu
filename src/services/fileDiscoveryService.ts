import { constants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { CompatibleFile } from '../types/extension';
import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

/**
 * File Discovery Service
 *
 * Discovers and filters files in the workspace for code operations.
 * Provides caching for performance and handles file system changes.
 *
 * @description
 * This service scans the workspace for compatible files based on file extensions,
 * filters them appropriately, and provides a convenient interface for file selection.
 * Uses VS Code's file search API for optimal performance.
 *
 * Key Features:
 * - Workspace file scanning with pattern matching
 * - File extension compatibility rules (.ts ↔ .tsx, .js ↔ .jsx)
 * - Last-modified sorting for easy file selection
 * - Result caching for improved performance
 * - File system change monitoring (create, delete, rename)
 * - File accessibility validation
 * - QuickPick integration for user-friendly file selection
 *
 * Compatibility Rules:
 * - TypeScript (.ts/.tsx) ↔ TypeScript (.ts/.tsx)
 * - JavaScript (.js/.jsx) ↔ JavaScript (.js/.jsx)
 * - Cross-compatibility between TS and JS (limited)
 *
 * Use Cases:
 * - Finding target files for Copy/Move operations
 * - Filtering files by extension compatibility
 * - Getting most recently modified files
 * - Validating target file accessibility
 *
 * @example
 * // Get service instance
 * const discoveryService = FileDiscoveryService.getInstance();
 *
 * // Find compatible files for TypeScript
 * const files = await discoveryService.getCompatibleFiles('.ts');
 * console.log(`Found ${files.length} compatible files`);
 *
 * // Show file selector to user
 * const selectedPath = await discoveryService.showFileSelector(files);
 * if (selectedPath) {
 *   console.log(`User selected: ${selectedPath}`);
 * }
 *
 * // Check if extension is compatible
 * const isCompatible = discoveryService.isCompatibleExtension('.ts', '.tsx');
 * console.log(`.ts is compatible with .tsx: ${isCompatible}`);
 *
 * @see CodeAnalysisService - Used together for file operations
 * @see ContextMenuManager - Uses this service for file selection
 *
 * @category File Operations
 * @subcategory File Discovery
 *
 * @author Vijay Gangatharan <vijayanand431@gmail.com>
 * @since 1.0.0
 */
export class FileDiscoveryService {
  private static instance: FileDiscoveryService | undefined = undefined;
  private logger: Logger;
  private fileCache = new Map<string, CompatibleFile[]>();

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): FileDiscoveryService {
    return FileDiscoveryService.instance ?? new FileDiscoveryService();
  }

  public async getCompatibleFiles(sourceExtension: string): Promise<CompatibleFile[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [];
    }

    const cacheKey = `${workspaceFolder.uri.fsPath}:${sourceExtension}`;
    if (this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey)!;
    }

    try {
      const compatibleFiles = await this.scanWorkspaceForCompatibleFiles(
        workspaceFolder,
        sourceExtension,
      );
      this.fileCache.set(cacheKey, compatibleFiles);

      this.logger.debug(
        `Found ${compatibleFiles.length} compatible files for extension ${sourceExtension}`,
      );
      return compatibleFiles;
    } catch (error) {
      this.logger.error('Error scanning workspace for compatible files', error);
      return [];
    }
  }

  private async scanWorkspaceForCompatibleFiles(
    workspaceFolder: vscode.WorkspaceFolder,
    sourceExtension: string,
  ): Promise<CompatibleFile[]> {
    const compatibleFiles: CompatibleFile[] = [];
    const workspacePath = workspaceFolder.uri.fsPath;

    // Use VS Code's file search API for better performance
    const filePattern = this.getSearchPattern(sourceExtension);
    const files = await vscode.workspace.findFiles(filePattern, '**/node_modules/**');

    for (const fileUri of files) {
      try {
        const filePath = path.resolve(fileUri.fsPath);
        if (!isSafeFilePath(filePath)) {
          continue;
        }
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- path validated by isSafeFilePath()
        const stats = await fs.stat(filePath);
        const extension = path.extname(filePath);

        if (this.isCompatibleExtension(sourceExtension, extension)) {
          const relativePath = path.relative(workspacePath, filePath);
          const fileName = path.basename(filePath);

          compatibleFiles.push({
            path: filePath,
            name: fileName,
            extension,
            isCompatible: true,
            lastModified: stats.mtime,
            relativePath,
          });
        }
      } catch (error) {
        this.logger.warn(`Error processing file ${fileUri.fsPath}`, error);
      }
    }

    // Sort by last modified (most recent first)
    compatibleFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return compatibleFiles;
  }

  private getSearchPattern(sourceExtension: string): string {
    switch (sourceExtension) {
      case '.ts':
        return '**/*.{ts,tsx}';
      case '.tsx':
        return '**/*.{ts,tsx}';
      case '.js':
        return '**/*.{js,jsx}';
      case '.jsx':
        return '**/*.{js,jsx}';
      default:
        return `**/*${sourceExtension}`;
    }
  }

  public isCompatibleExtension(source: string, target: string): boolean {
    // Normalize extensions (remove leading dot if present)
    const sourceExt = source.startsWith('.') ? source : `.${source}`;
    const targetExt = target.startsWith('.') ? target : `.${target}`;

    // Define compatibility rules
    const compatibilityRules: Record<string, string[]> = {
      '.ts': ['.ts', '.tsx'],
      '.tsx': ['.ts', '.tsx'],
      '.js': ['.js', '.jsx'],
      '.jsx': ['.js', '.jsx'],
    };

    const compatibleExtensions = compatibilityRules[
      sourceExt as keyof typeof compatibilityRules
    ] ?? [sourceExt];
    return compatibleExtensions.includes(targetExt);
  }

  public async validateTargetFile(filePath: string): Promise<boolean> {
    try {
      // Check if file exists and is writable
      await fs.access(filePath, constants.F_OK | constants.W_OK);
      return true;
    } catch (error) {
      this.logger.warn(`File validation failed for ${filePath}`, error);
      return false;
    }
  }

  public async showFileSelector(compatibleFiles: CompatibleFile[]): Promise<string | undefined> {
    if (compatibleFiles.length === 0) {
      vscode.window.showWarningMessage('No compatible files found in workspace');
      return undefined;
    }

    const quickPickItems = this.formatFileList(compatibleFiles);

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select target file',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    return selected?.filePath;
  }

  private formatFileList(files: CompatibleFile[]): (vscode.QuickPickItem & { filePath: string })[] {
    return files.map((file) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const workspaceName = workspaceFolder?.name ?? 'workspace';

      return {
        label: file.name,
        description: path.dirname(file.relativePath),
        detail: `${workspaceName} • Modified: ${file.lastModified.toLocaleString()}`,
        filePath: file.path,
      };
    });
  }

  public clearCache(): void {
    this.fileCache.clear();
    this.logger.debug('File discovery cache cleared');
  }

  public onWorkspaceChanged(): vscode.Disposable {
    return vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.clearCache();
    });
  }

  public onFileSystemChanged(): vscode.Disposable {
    // Clear cache when files are created, deleted, or renamed
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}');

    const clearCache = () => this.clearCache();

    watcher.onDidCreate(clearCache);
    watcher.onDidDelete(clearCache);
    watcher.onDidChange(clearCache);

    return watcher;
  }
}
