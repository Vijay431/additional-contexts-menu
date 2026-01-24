import { constants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { CompatibleFile } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for discovering and managing compatible files in the workspace.
 *
 * Provides functionality to:
 * - Scan workspace for files compatible with a given source extension
 * - Cache discovered files for performance
 * - Validate file accessibility and writability
 * - Display file selection UI
 * - Monitor workspace and file system changes
 *
 * Compatibility rules:
 * - TypeScript (.ts) files are compatible with .ts and .tsx
 * - TypeScript React (.tsx) files are compatible with .ts and .tsx
 * - JavaScript (.js) files are compatible with .js and .jsx
 * - JavaScript React (.jsx) files are compatible with .js and .jsx
 *
 * Files are sorted by last modified date (most recent first) and
 * results are cached per workspace/extension combination.
 */
export class FileDiscoveryService {
  private static instance: FileDiscoveryService;
  private logger: Logger;
  private fileCache = new Map<string, CompatibleFile[]>();

  /**
   * Private constructor to enforce singleton pattern.
   *
   * Initializes the logger instance for file discovery operations.
   */
  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Gets the singleton instance of the FileDiscoveryService.
   *
   * Creates a new instance on first call, returns the existing instance
   * on subsequent calls.
   *
   * @returns The singleton FileDiscoveryService instance
   */
  public static getInstance(): FileDiscoveryService {
    if (!FileDiscoveryService.instance) {
      FileDiscoveryService.instance = new FileDiscoveryService();
    }
    return FileDiscoveryService.instance;
  }

  /**
   * Gets all compatible files for a given source extension in the workspace.
   *
   * Returns cached results if available, otherwise scans the workspace.
   * Files are sorted by last modified date (most recent first).
   * Returns an empty array if no workspace is open or an error occurs.
   *
   * @param sourceExtension - The file extension to find compatible files for (e.g., '.ts', '.js')
   * @returns A promise resolving to an array of compatible file information
   */
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

  /**
   * Scans the workspace for files compatible with the given extension.
   *
   * Uses VS Code's file search API to find files matching the extension pattern,
   * filters them based on compatibility rules, and sorts by last modified date.
   * Excludes node_modules directory from the search.
   *
   * @param workspaceFolder - The workspace folder to scan
   * @param sourceExtension - The source file extension to find compatible files for
   * @returns A promise resolving to an array of compatible file information
   */
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
        const filePath = fileUri.fsPath;
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

  /**
   * Gets the search pattern for VS Code's file search API.
   *
   * Returns a glob pattern that matches files compatible with the source extension.
   * TypeScript and TypeScript React files are searched together, as are
   * JavaScript and JavaScript React files.
   *
   * @param sourceExtension - The source file extension
   * @returns A glob pattern string for file searching
   */
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

  /**
   * Checks if two file extensions are compatible for context sharing.
   *
   * Compatibility rules:
   * - .ts and .tsx are mutually compatible
   * - .js and .jsx are mutually compatible
   * - Other extensions are only compatible with themselves
   *
   * Extensions are normalized to include a leading dot before comparison.
   *
   * @param source - The source file extension (e.g., '.ts', 'js', 'tsx')
   * @param target - The target file extension to check compatibility against
   * @returns True if the extensions are compatible, false otherwise
   */
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

    const compatibleExtensions = compatibilityRules[sourceExt] ?? [sourceExt];
    return compatibleExtensions.includes(targetExt);
  }

  /**
   * Validates that a target file exists and is writable.
   *
   * Checks both file existence (F_OK) and write permission (W_OK) using
   * the fs.access method. Logs a warning if validation fails.
   *
   * @param filePath - The absolute path to the file to validate
   * @returns A promise resolving to true if the file is valid, false otherwise
   */
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

  /**
   * Displays a QuickPick UI for selecting a target file from compatible files.
   *
   * Shows a warning message if no compatible files are available.
   * The QuickPick displays file name, relative path, workspace name,
   * and last modified timestamp for each file.
   *
   * @param compatibleFiles - Array of compatible file information to display
   * @returns A promise resolving to the selected file path, or undefined if cancelled
   */
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

  /**
   * Formats an array of file information into QuickPick items for display.
   *
   * Creates QuickPick items with:
   * - label: File name
   * - description: Directory path relative to workspace
   * - detail: Workspace name and last modified timestamp
   * - filePath: Full absolute path (custom property)
   *
   * @param files - Array of compatible file information to format
   * @returns Array of QuickPick items with file paths attached
   */
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

  /**
   * Clears the file discovery cache.
   *
   * Removes all cached file lists, forcing the next call to getCompatibleFiles
   * to rescan the workspace. Useful when workspace contents change externally.
   */
  public clearCache(): void {
    this.fileCache.clear();
    this.logger.debug('File discovery cache cleared');
  }

  /**
   * Sets up a listener for workspace folder changes.
   *
   * Automatically clears the file discovery cache when workspace folders
   * are added or removed to ensure fresh results.
   *
   * @returns A disposable that stops listening when disposed
   */
  public onWorkspaceChanged(): vscode.Disposable {
    return vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.clearCache();
    });
  }

  /**
   * Sets up a file system watcher for TypeScript and JavaScript files.
   *
   * Monitors the workspace for file creation, deletion, and modification
   * of .ts, .tsx, .js, and .jsx files. Automatically clears the cache
   * when changes are detected to ensure results stay current.
   *
   * @returns A disposable that stops watching when disposed
   */
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
