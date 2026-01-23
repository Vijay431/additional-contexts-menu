import { constants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { CacheConfig, CompatibleFile, LRUCacheEntry } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * LRU (Least Recently Used) Cache with size tracking and eviction logic.
 * Tracks entry access time and count to determine which entries to evict when size limit is reached.
 */
class LRUCache<K, V> {
  private cache: Map<K, LRUCacheEntry<V>>;
  private maxSize: number;
  private logger: Logger;

  constructor(maxSize: number, logger: Logger) {
    this.maxSize = maxSize;
    this.logger = logger;
    this.cache = new Map<K, LRUCacheEntry<V>>();
  }

  /**
   * Get a value from the cache. Updates access tracking for LRU eviction.
   * Returns undefined if the key doesn't exist or has expired.
   */
  public get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.logger.debug('LRU cache entry expired and removed', {
        key: String(key),
        createdAt: new Date(entry.createdAt).toISOString(),
        ttl: entry.ttl,
      });
      return undefined;
    }

    // Update access tracking for LRU
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    return entry.value;
  }

  /**
   * Set a value in the cache. Enforces size limit by evicting least recently used entries.
   * Also cleans up expired entries before adding new ones.
   */
  public set(key: K, value: V, ttl?: number): void {
    const now = Date.now();

    // If key already exists, update it and move to most recently used
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.lastAccessedAt = now;
      entry.accessCount++;
      if (ttl !== undefined) {
        entry.ttl = ttl;
      }
      return;
    }

    // Clean up expired entries before adding new one
    this.cleanupExpired();

    // Check if we need to evict entries before adding new one
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    // Add new entry
    const entry: LRUCacheEntry<V> = {
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      ttl,
    };
    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists in the cache and has not expired.
   */
  public has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.logger.debug('LRU cache entry expired and removed during has check', {
        key: String(key),
        createdAt: new Date(entry.createdAt).toISOString(),
        ttl: entry.ttl,
      });
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache.
   * Returns true if the key existed and was deleted, false otherwise.
   */
  public delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache.
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache.
   */
  public keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Evict the least recently used entry from the cache.
   * This is called automatically when the cache reaches its size limit.
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: K | undefined;
    let lruTime = Infinity;

    // Find the entry with the oldest lastAccessedAt time
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      const deleted = this.cache.delete(lruKey);
      if (deleted) {
        this.logger.debug('LRU cache evicted least recently used entry', {
          key: String(lruKey),
          lastAccessedAt: new Date(lruTime).toISOString(),
        });
      }
    }
  }

  /**
   * Check if a cache entry has expired based on its TTL.
   * An entry expires if the current time is greater than createdAt + ttl.
   */
  private isExpired(entry: LRUCacheEntry<V>): boolean {
    if (entry.ttl === undefined) {
      return false;
    }
    const now = Date.now();
    const expirationTime = entry.createdAt + entry.ttl;
    return now > expirationTime;
  }

  /**
   * Remove all expired entries from the cache.
   * This is called automatically during set operations and can be called manually.
   */
  public cleanupExpired(): void {
    const expiredKeys: K[] = [];
    const entries = Array.from(this.cache.entries());

    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      this.cache.delete(key);
      if (entry) {
        this.logger.debug('LRU cache cleaned up expired entry', {
          key: String(key),
          createdAt: new Date(entry.createdAt).toISOString(),
          ttl: entry.ttl,
        });
      }
    }
  }
}

export class FileDiscoveryService {
  private static instance: FileDiscoveryService;
  private logger: Logger;
  private fileCache: LRUCache<string, CompatibleFile[]>;
  private cacheConfig: CacheConfig;

  private constructor() {
    this.logger = Logger.getInstance();
    this.cacheConfig = {
      enabled: true,
      maxSize: 100,
      ttl: 300000, // 5 minutes in milliseconds
    };
    this.fileCache = new LRUCache<string, CompatibleFile[]>(
      this.cacheConfig.maxSize,
      this.logger,
    );
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

    // Try to get from cache
    const cachedFiles = this.fileCache.get(cacheKey);
    if (cachedFiles !== undefined) {
      this.logger.debug(`Cache hit for ${sourceExtension} files`);
      return cachedFiles;
    }

    // Cache miss - scan workspace
    try {
      const compatibleFiles = await this.scanWorkspaceForCompatibleFiles(
        workspaceFolder,
        sourceExtension,
      );

      // Store in cache with TTL
      this.fileCache.set(cacheKey, compatibleFiles, this.cacheConfig.ttl);

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

    const compatibleExtensions = compatibilityRules[sourceExt] ?? [sourceExt];
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
