import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CompatibleFile } from '../types/extension';
import { Logger } from '../utils/logger';

export class FileDiscoveryService {
  private static instance: FileDiscoveryService;
  private logger: Logger;
  private fileCache = new Map<string, CompatibleFile[]>();

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): FileDiscoveryService {
    if (!FileDiscoveryService.instance) {
      FileDiscoveryService.instance = new FileDiscoveryService();
    }
    return FileDiscoveryService.instance;
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
        sourceExtension
      );
      this.fileCache.set(cacheKey, compatibleFiles);

      this.logger.debug(
        `Found ${compatibleFiles.length} compatible files for extension ${sourceExtension}`
      );
      return compatibleFiles;
    } catch (error) {
      this.logger.error('Error scanning workspace for compatible files', error);
      return [];
    }
  }

  private async scanWorkspaceForCompatibleFiles(
    workspaceFolder: vscode.WorkspaceFolder,
    sourceExtension: string
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

    const compatibleExtensions = compatibilityRules[sourceExt] || [sourceExt];
    return compatibleExtensions.includes(targetExt);
  }

  public async validateTargetFile(filePath: string): Promise<boolean> {
    try {
      // Check if file exists
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return false;
      }

      // Check if file is writable
      await fs.access(filePath, fs.constants.W_OK);
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
      const workspaceName = workspaceFolder?.name || 'workspace';

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
