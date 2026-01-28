import * as crypto from 'node:crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type {
  BookmarkCategory,
  BookmarkSearchOptions,
  BookmarkStorage,
  CodeBookmark,
} from '../types/extension';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

interface BookmarkQuickPickItem extends vscode.QuickPickItem {
  bookmark: CodeBookmark;
}

export class BookmarkManagerService {
  private static instance: BookmarkManagerService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;
  private storage: BookmarkStorage;
  private storageFilePath: string;
  private disposables: vscode.Disposable[] = [];
  private decorationType: vscode.TextEditorDecorationType;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.storage = { bookmarks: [], categories: [] };
    this.storageFilePath = '';

    // Create decoration type for bookmarks
    this.decorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: vscode.Uri.joinPath(
        vscode.Uri.file(__dirname),
        '../../assets/icons/bookmark.svg',
      ),
      overviewRulerColor: 'rgba(255, 165, 0, 0.7)',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });
  }

  public static getInstance(): BookmarkManagerService {
    BookmarkManagerService.instance ??= new BookmarkManagerService();
    return BookmarkManagerService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing BookmarkManagerService');

    // Determine storage file path
    await this.initializeStoragePath();

    // Load existing bookmarks
    await this.loadBookmarks();

    // Initialize default categories
    this.initializeDefaultCategories();

    // Update decorations when active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        void this.updateDecorations();
      }),
    );

    this.logger.info('BookmarkManagerService initialized successfully', {
      bookmarkCount: this.storage.bookmarks.length,
      categoryCount: this.storage.categories.length,
    });
  }

  private async initializeStoragePath(): Promise<void> {
    const config = this.configService.getConfiguration();

    if (config.bookmarkManager.storageLocation === 'workspace') {
      // Workspace-specific storage
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const bookmarksDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'bookmarks');
        await fs.mkdir(bookmarksDir, { recursive: true });
        this.storageFilePath = path.join(bookmarksDir, 'bookmarks.json');
      } else {
        // Fallback to global storage if no workspace
        const globalStorageUri = vscode.context.globalStorageUri;
        await fs.mkdir(globalStorageUri.fsPath, { recursive: true });
        this.storageFilePath = path.join(globalStorageUri.fsPath, 'bookmarks.json');
      }
    } else {
      // Global storage
      const globalStorageUri = vscode.context.globalStorageUri;
      await fs.mkdir(globalStorageUri.fsPath, { recursive: true });
      this.storageFilePath = path.join(globalStorageUri.fsPath, 'bookmarks.json');
    }
  }

  private async loadBookmarks(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFilePath, 'utf-8');
      this.storage = JSON.parse(data) as BookmarkStorage;
      this.logger.info('Bookmarks loaded successfully', {
        count: this.storage.bookmarks.length,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, create initial storage
        this.storage = { bookmarks: [], categories: [] };
        await this.saveBookmarks();
        this.logger.info('Created new bookmark storage');
      } else {
        this.logger.error('Error loading bookmarks', error);
        this.storage = { bookmarks: [], categories: [] };
      }
    }
  }

  private async saveBookmarks(): Promise<void> {
    try {
      await fs.writeFile(this.storageFilePath, JSON.stringify(this.storage, null, 2), 'utf-8');
      this.logger.debug('Bookmarks saved successfully');
    } catch (error) {
      this.logger.error('Error saving bookmarks', error);
      throw error;
    }
  }

  private initializeDefaultCategories(): void {
    const config = this.configService.getConfiguration();
    const defaultCategories = config.bookmarkManager.defaultCategories;

    for (const categoryName of defaultCategories) {
      const existing = this.storage.categories.find((c) => c.name === categoryName);
      if (!existing) {
        this.storage.categories.push({
          name: categoryName,
          color: this.getCategoryColor(categoryName),
          icon: 'bookmark',
        });
      }
    }
  }

  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      TODO: '#FFA500',
      FIXME: '#FF0000',
      Note: '#008000',
      Important: '#FFD700',
      Bug: '#DC143C',
      Enhancement: '#4169E1',
      Question: '#9932CC',
    };
    return colors[category] || '#808080';
  }

  /**
   * Create a new bookmark at the current cursor position
   */
  public async createBookmark(): Promise<CodeBookmark | undefined> {
    const config = this.configService.getConfiguration();
    if (!config.bookmarkManager.enabled) {
      vscode.window.showInformationMessage('Bookmark Manager is disabled in settings');
      return undefined;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return undefined;
    }

    const lineNumber = editor.selection.active.line;
    const filePath = editor.document.uri.fsPath;

    // Check max bookmarks per file limit
    const existingBookmarks = this.storage.bookmarks.filter(
      (b) => b.filePath === filePath,
    );
    if (existingBookmarks.length >= config.bookmarkManager.maxBookmarksPerFile) {
      vscode.window.showWarningMessage(
        `Maximum number of bookmarks (${config.bookmarkManager.maxBookmarksPerFile}) reached for this file`,
      );
      return undefined;
    }

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter a description for this bookmark',
      placeHolder: 'Important code section',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Description is required';
        }
        return null;
      },
    });

    if (!description) {
      return undefined;
    }

    // Get category
    const categoryOptions = this.storage.categories.map((c) => c.name);
    categoryOptions.push('No Category');

    const category = await vscode.window.showQuickPick(categoryOptions, {
      placeHolder: 'Select a category (optional)',
    });

    // Get tags
    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Enter tags separated by commas (optional)',
      placeHolder: 'important, refactor, bug',
    });

    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    // Create bookmark
    const bookmark: CodeBookmark = {
      id: crypto.randomUUID(),
      filePath,
      lineNumber,
      description: description.trim(),
      category: category === 'No Category' ? undefined : category,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.storage.bookmarks.push(bookmark);
    await this.saveBookmarks();

    // Update decorations
    void this.updateDecorations();

    this.logger.info('Bookmark created successfully', {
      id: bookmark.id,
      filePath: bookmark.filePath,
      lineNumber: bookmark.lineNumber,
    });

    vscode.window.showInformationMessage(`Bookmark created: ${description}`);
    return bookmark;
  }

  /**
   * Navigate to a bookmark
   */
  public async navigateToBookmark(bookmark: CodeBookmark): Promise<boolean> {
    try {
      const uri = vscode.Uri.file(bookmark.filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      const position = new vscode.Position(bookmark.lineNumber, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter,
      );

      this.logger.info('Navigated to bookmark', {
        id: bookmark.id,
        filePath: bookmark.filePath,
        lineNumber: bookmark.lineNumber,
      });

      return true;
    } catch (error) {
      this.logger.error('Error navigating to bookmark', error);
      vscode.window.showErrorMessage(`Failed to open bookmark: ${bookmark.description}`);
      return false;
    }
  }

  /**
   * List and manage bookmarks
   */
  public async manageBookmarks(): Promise<void> {
    const config = this.configService.getConfiguration();
    if (!config.bookmarkManager.enabled) {
      vscode.window.showInformationMessage('Bookmark Manager is disabled in settings');
      return;
    }

    if (this.storage.bookmarks.length === 0) {
      const action = await vscode.window.showInformationMessage(
        'No bookmarks found. Would you like to create one?',
        'Create Bookmark',
      );
      if (action === 'Create Bookmark') {
        await this.createBookmark();
      }
      return;
    }

    // Group bookmarks by file
    const groupedByFile = new Map<string, CodeBookmark[]>();
    for (const bookmark of this.storage.bookmarks) {
      const fileName = path.basename(bookmark.filePath);
      const bookmarks = groupedByFile.get(fileName) ?? [];
      bookmarks.push(bookmark);
      groupedByFile.set(fileName, bookmarks);
    }

    // Create quick pick items
    const items: BookmarkQuickPickItem[] = [];

    for (const [fileName, bookmarks] of groupedByFile) {
      items.push({
        label: fileName,
        kind: vscode.QuickPickItemKind.Separator,
        bookmark: bookmarks[0]!,
      });

      for (const bookmark of bookmarks) {
        items.push({
          label: `Line ${bookmark.lineNumber + 1}: ${bookmark.description}`,
          description: bookmark.category ?? '',
          detail: bookmark.tags.length > 0 ? bookmark.tags.join(', ') : undefined,
          bookmark,
        });
      }
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a bookmark (${this.storage.bookmarks.length} available)`,
    });

    if (!selected) {
      return;
    }

    const actions = ['Go to Bookmark', 'Edit', 'Delete', 'Copy Description'];
    const action = await vscode.window.showQuickPick(actions, {
      placeHolder: `What would you like to do with this bookmark?`,
    });

    if (!action) {
      return;
    }

    switch (action) {
      case 'Go to Bookmark':
        await this.navigateToBookmark(selected.bookmark);
        break;
      case 'Edit':
        await this.editBookmark(selected.bookmark);
        break;
      case 'Delete':
        await this.deleteBookmark(selected.bookmark);
        break;
      case 'Copy Description':
        await vscode.env.clipboard.writeText(selected.bookmark.description);
        vscode.window.showInformationMessage('Description copied to clipboard');
        break;
    }
  }

  /**
   * Search bookmarks
   */
  public async searchBookmarks(): Promise<void> {
    const config = this.configService.getConfiguration();
    if (!config.bookmarkManager.enabled) {
      vscode.window.showInformationMessage('Bookmark Manager is disabled in settings');
      return;
    }

    if (this.storage.bookmarks.length === 0) {
      vscode.window.showInformationMessage('No bookmarks found');
      return;
    }

    const searchQuery = await vscode.window.showInputBox({
      prompt: 'Search bookmarks',
      placeHolder: 'Enter search query',
    });

    if (!searchQuery) {
      return;
    }

    const results = this.filterBookmarks({ query: searchQuery });

    if (results.length === 0) {
      vscode.window.showInformationMessage('No matching bookmarks found');
      return;
    }

    const items: BookmarkQuickPickItem[] = results.map((bookmark) => ({
      label: `${path.basename(bookmark.filePath)}:${bookmark.lineNumber + 1}`,
      description: bookmark.description,
      detail: bookmark.category ?? '',
      bookmark,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a bookmark (${results.length} matches)`,
    });

    if (selected) {
      await this.navigateToBookmark(selected.bookmark);
    }
  }

  /**
   * Filter bookmarks based on search options
   */
  public filterBookmarks(options: BookmarkSearchOptions): CodeBookmark[] {
    let results = [...this.storage.bookmarks];

    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(
        (b) =>
          b.description.toLowerCase().includes(query) ||
          b.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    if (options.category) {
      results = results.filter((b) => b.category === options.category);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter((b) =>
        options.tags!.some((tag) => b.tags.includes(tag)),
      );
    }

    if (options.filePath) {
      results = results.filter((b) => b.filePath === options.filePath);
    }

    return results;
  }

  /**
   * Edit an existing bookmark
   */
  private async editBookmark(bookmark: CodeBookmark): Promise<void> {
    const description = await vscode.window.showInputBox({
      prompt: 'Edit description',
      value: bookmark.description,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Description is required';
        }
        return null;
      },
    });

    if (!description) {
      return;
    }

    // Update bookmark
    const index = this.storage.bookmarks.findIndex((b) => b.id === bookmark.id);
    if (index >= 0) {
      this.storage.bookmarks[index]!.description = description.trim();
      this.storage.bookmarks[index]!.updatedAt = Date.now();

      await this.saveBookmarks();
      vscode.window.showInformationMessage('Bookmark updated');
    }
  }

  /**
   * Delete a bookmark
   */
  private async deleteBookmark(bookmark: CodeBookmark): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete this bookmark?`,
      { modal: true },
      'Delete',
      'Cancel',
    );

    if (confirm !== 'Delete') {
      return;
    }

    this.storage.bookmarks = this.storage.bookmarks.filter((b) => b.id !== bookmark.id);

    await this.saveBookmarks();
    void this.updateDecorations();

    vscode.window.showInformationMessage('Bookmark deleted');
    this.logger.info('Bookmark deleted', { id: bookmark.id });
  }

  /**
   * Delete all bookmarks for the current file
   */
  public async clearFileBookmarks(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const fileBookmarks = this.storage.bookmarks.filter((b) => b.filePath === filePath);

    if (fileBookmarks.length === 0) {
      vscode.window.showInformationMessage('No bookmarks found for this file');
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Delete ${fileBookmarks.length} bookmark(s) from this file?`,
      { modal: true },
      'Delete',
      'Cancel',
    );

    if (confirm !== 'Delete') {
      return;
    }

    this.storage.bookmarks = this.storage.bookmarks.filter((b) => b.filePath !== filePath);

    await this.saveBookmarks();
    void this.updateDecorations();

    vscode.window.showInformationMessage(`${fileBookmarks.length} bookmark(s) deleted`);
  }

  /**
   * Update decorations for the current editor
   */
  private async updateDecorations(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const fileBookmarks = this.storage.bookmarks.filter((b) => b.filePath === filePath);

    const decorations = fileBookmarks.map((bookmark) => ({
      range: new vscode.Range(bookmark.lineNumber, 0, bookmark.lineNumber, 0),
      hoverMessage: new vscode.MarkdownString(
        `**${bookmark.description}**\n\n` +
          `${bookmark.category ? `Category: ${bookmark.category}\n` : ''}` +
          `${bookmark.tags.length > 0 ? `Tags: ${bookmark.tags.join(', ')}` : ''}`,
      ),
    }));

    editor.setDecorations(this.decorationType, decorations);
  }

  /**
   * Get all bookmarks
   */
  public getBookmarks(): CodeBookmark[] {
    return [...this.storage.bookmarks];
  }

  /**
   * Get bookmarks for a specific file
   */
  public getBookmarksForFile(filePath: string): CodeBookmark[] {
    return this.storage.bookmarks.filter((b) => b.filePath === filePath);
  }

  /**
   * Get all categories
   */
  public getCategories(): BookmarkCategory[] {
    return [...this.storage.categories];
  }

  public dispose(): void {
    this.logger.debug('Disposing BookmarkManagerService');
    this.decorationType.dispose();
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
}
