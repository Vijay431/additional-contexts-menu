import * as crypto from 'node:crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type {
  Snippet,
  SnippetFolder,
  SnippetPlaceholder,
  SnippetStorage,
} from '../types/extension';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

interface SnippetQuickPickItem extends vscode.QuickPickItem {
  snippet: Snippet;
}

export class SnippetManagerService {
  private static instance: SnippetManagerService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;
  private storage: SnippetStorage;
  private storageFilePath: string;
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.storage = { snippets: [], folders: [] };
    this.storageFilePath = '';
  }

  public static getInstance(): SnippetManagerService {
    SnippetManagerService.instance ??= new SnippetManagerService();
    return SnippetManagerService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing SnippetManagerService');

    // Determine storage file path
    await this.initializeStoragePath();

    // Load existing snippets
    await this.loadSnippets();

    this.logger.info('SnippetManagerService initialized successfully', {
      snippetCount: this.storage.snippets.length,
      folderCount: this.storage.folders.length,
    });
  }

  private async initializeStoragePath(): Promise<void> {
    const config = this.configService.getConfiguration();

    if (config.snippetManager.storageLocation === 'workspace') {
      // Workspace-specific storage
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const snippetsDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'snippets');
        await fs.mkdir(snippetsDir, { recursive: true });
        this.storageFilePath = path.join(snippetsDir, 'snippets.json');
      } else {
        // Fallback to global storage if no workspace
        const globalStorageUri = vscode.context.globalStorageUri;
        await fs.mkdir(globalStorageUri.fsPath, { recursive: true });
        this.storageFilePath = path.join(globalStorageUri.fsPath, 'snippets.json');
      }
    } else {
      // Global storage
      const globalStorageUri = vscode.context.globalStorageUri;
      await fs.mkdir(globalStorageUri.fsPath, { recursive: true });
      this.storageFilePath = path.join(globalStorageUri.fsPath, 'snippets.json');
    }
  }

  private async loadSnippets(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFilePath, 'utf-8');
      this.storage = JSON.parse(data) as SnippetStorage;
      this.logger.info('Snippets loaded successfully', {
        count: this.storage.snippets.length,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, create initial storage
        this.storage = { snippets: [], folders: [] };
        await this.saveSnippets();
        this.logger.info('Created new snippet storage');
      } else {
        this.logger.error('Error loading snippets', error);
        this.storage = { snippets: [], folders: [] };
      }
    }
  }

  private async saveSnippets(): Promise<void> {
    try {
      await fs.writeFile(this.storageFilePath, JSON.stringify(this.storage, null, 2), 'utf-8');
      this.logger.debug('Snippets saved successfully');
    } catch (error) {
      this.logger.error('Error saving snippets', error);
      throw error;
    }
  }

  /**
   * Create a new snippet from selected code
   */
  public async createSnippetFromSelection(
    code: string,
    language: string,
  ): Promise<Snippet | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter a name for the snippet',
      placeHolder: 'my-snippet',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Snippet name is required';
        }
        return null;
      },
    });

    if (!name) {
      return undefined;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Enter a description (optional)',
      placeHolder: 'A brief description of what this snippet does',
    });

    // Ask for folder
    const folders = this.storage.folders.filter((f) => !f.language || f.language === language);
    let folder: string | undefined;

    if (folders.length > 0) {
      const folderOptions = [
        { label: 'No Folder', description: 'Add to root level' },
        ...folders.map((f) => ({
          label: f.name,
          description: f.language ?? 'All languages',
        })),
      ];

      const selectedFolder = await vscode.window.showQuickPick(folderOptions, {
        placeHolder: 'Select a folder (optional)',
      });

      if (selectedFolder && selectedFolder.label !== 'No Folder') {
        folder = selectedFolder.label;
      }
    }

    // Detect placeholders
    const config = this.configService.getConfiguration();
    const placeholders = config.snippetManager.autoDetectPlaceholders
      ? this.detectPlaceholders(code, config.snippetManager.placeholderPattern)
      : [];

    // Create snippet
    const snippet: Snippet = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || undefined,
      language,
      folder,
      code,
      placeholders,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.storage.snippets.push(snippet);

    // Update folder if needed
    if (folder) {
      const folderData = this.storage.folders.find((f) => f.name === folder);
      if (folderData) {
        folderData.snippets.push(snippet.id);
      } else {
        this.storage.folders.push({
          name: folder,
          language,
          snippets: [snippet.id],
        });
      }
    }

    await this.saveSnippets();

    this.logger.info('Snippet created successfully', { id: snippet.id, name: snippet.name });

    return snippet;
  }

  /**
   * Detect placeholders in code using regex pattern
   */
  private detectPlaceholders(code: string, pattern: string): SnippetPlaceholder[] {
    const placeholders: SnippetPlaceholder[] = [];
    const regex = new RegExp(pattern, 'g');
    let match: RegExpExecArray | null;

    const seen = new Set<string>();

    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      if (name && !seen.has(name)) {
        seen.add(name);
        placeholders.push({
          name,
          defaultValue: undefined,
          isTabStop: true,
        });
      }
    }

    return placeholders;
  }

  /**
   * Interpolate variables in snippet code
   */
  private async interpolateVariables(code: string): Promise<string> {
    const config = this.configService.getConfiguration();
    if (!config.snippetManager.variableInterpolation.enabled) {
      return code;
    }

    const editor = vscode.window.activeTextEditor;
    let result = code;

    // Get file information
    const filename = editor?.document.fileName.split('/').pop()?.split('\\').pop() ?? 'file';
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // Get current date/time
    const now = new Date();
    const date = now.toISOString().split('T')[0]!; // YYYY-MM-DD
    const datetime = now.toISOString(); // Full ISO datetime
    const timestamp = now.getTime().toString();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.toTimeString().split(' ')[0]!; // HH:MM:SS

    // Built-in variables
    const variables: Record<string, string> = {
      filename: filename,
      filenameWithoutExt: filenameWithoutExt,
      date: date,
      datetime: datetime,
      timestamp: timestamp,
      year: year,
      month: month,
      day: day,
      time: time,
      ...config.snippetManager.variableInterpolation.customVariables,
    };

    // Get clipboard content
    try {
      const clipboardText = await vscode.env.clipboard.readText();
      if (clipboardText) {
        variables.clipboard = clipboardText;
      }
    } catch (_error) {
      // Clipboard access failed, skip
    }

    // Replace variables in code
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Show quick pick to select and insert a snippet
   */
  public async insertSnippet(language: string): Promise<void> {
    const config = this.configService.getConfiguration();
    if (!config.snippetManager.enabled) {
      vscode.window.showInformationMessage('Snippet Manager is disabled in settings');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    // Filter snippets by language or universal snippets
    const matchingSnippets = this.storage.snippets.filter(
      (s) => s.language === language || s.language === '*',
    );

    if (matchingSnippets.length === 0) {
      vscode.window.showInformationMessage(
        `No snippets found for ${language}. Create a snippet first.`,
      );
      return;
    }

    // Group by folder
    const groupedByFolder = new Map<string | undefined, Snippet[]>();
    for (const snippet of matchingSnippets) {
      const folder = snippet.folder;
      const snippets = groupedByFolder.get(folder) ?? [];
      snippets.push(snippet);
      groupedByFolder.set(folder, snippets);
    }

    // Create quick pick items
    const items: SnippetQuickPickItem[] = [];

    for (const [folder, snippets] of groupedByFolder) {
      if (folder) {
        items.push({
          label: folder,
          kind: vscode.QuickPickItemKind.Separator,
          snippet: snippets[0]!,
        });
      }
      for (const snippet of snippets) {
        items.push({
          label: snippet.name,
          description: snippet.description ?? '',
          detail: `${snippet.language}${snippet.placeholders.length > 0 ? ` • ${snippet.placeholders.length} placeholder(s)` : ''}`,
          snippet,
        });
      }
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a snippet to insert (${matchingSnippets.length} available)`,
    });

    if (!selected) {
      return;
    }

    // Process placeholders
    let code = selected.snippet.code;

    if (selected.snippet.placeholders.length > 0) {
      for (const placeholder of selected.snippet.placeholders) {
        const value = await vscode.window.showInputBox({
          prompt: `Enter value for ${placeholder.name}`,
          placeHolder: placeholder.defaultValue ?? '',
          value: placeholder.defaultValue ?? '',
        });

        if (value !== undefined) {
          const regex = new RegExp(`\\$\\{${placeholder.name}\\}`, 'g');
          code = code.replace(regex, value);
        }
      }
    }

    // Interpolate variables
    code = await this.interpolateVariables(code);

    // Insert code at cursor position
    const position = editor.selection.active;

    await editor.edit((editBuilder) => {
      editBuilder.insert(position, code);
    });

    vscode.window.showInformationMessage(`Snippet '${selected.snippet.name}' inserted`);
    this.logger.info('Snippet inserted', { id: selected.snippet.id, name: selected.snippet.name });
  }

  /**
   * Show all snippets for management
   */
  public async manageSnippets(): Promise<void> {
    const config = this.configService.getConfiguration();
    if (!config.snippetManager.enabled) {
      vscode.window.showInformationMessage('Snippet Manager is disabled in settings');
      return;
    }

    if (this.storage.snippets.length === 0) {
      const action = await vscode.window.showInformationMessage(
        'No snippets found. Would you like to create one?',
        'Create Snippet',
      );
      if (action === 'Create Snippet') {
        vscode.commands.executeCommand('additionalContextMenus.createSnippet');
      }
      return;
    }

    const items: SnippetQuickPickItem[] = this.storage.snippets.map((snippet) => ({
      label: snippet.name,
      description: snippet.description ?? '',
      detail: `${snippet.language}${snippet.folder ? ` • ${snippet.folder}` : ''}`,
      snippet,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a snippet to manage',
    });

    if (!selected) {
      return;
    }

    const actions = ['Insert', 'Edit', 'Delete', 'Copy Code'];
    const action = await vscode.window.showQuickPick(actions, {
      placeHolder: `What would you like to do with '${selected.snippet.name}'?`,
    });

    if (!action) {
      return;
    }

    switch (action) {
      case 'Insert':
        await this.insertSnippet(selected.snippet.language);
        break;
      case 'Edit':
        await this.editSnippet(selected.snippet);
        break;
      case 'Delete':
        await this.deleteSnippet(selected.snippet);
        break;
      case 'Copy Code':
        await vscode.env.clipboard.writeText(selected.snippet.code);
        vscode.window.showInformationMessage(
          `Snippet '${selected.snippet.name}' copied to clipboard`,
        );
        break;
    }
  }

  /**
   * Edit an existing snippet
   */
  private async editSnippet(snippet: Snippet): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Edit snippet name',
      value: snippet.name,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Snippet name is required';
        }
        return null;
      },
    });

    if (!name) {
      return;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Edit description (optional)',
      value: snippet.description ?? '',
    });

    // Find and update snippet
    const index = this.storage.snippets.findIndex((s) => s.id === snippet.id);
    if (index >= 0) {
      this.storage.snippets[index]!.name = name.trim();
      this.storage.snippets[index]!.description = description?.trim() || undefined;
      this.storage.snippets[index]!.updatedAt = Date.now();

      await this.saveSnippets();
      vscode.window.showInformationMessage(`Snippet '${name}' updated`);
    }
  }

  /**
   * Delete a snippet
   */
  private async deleteSnippet(snippet: Snippet): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete '${snippet.name}'?`,
      { modal: true },
      'Delete',
      'Cancel',
    );

    if (confirm !== 'Delete') {
      return;
    }

    // Remove from snippets array
    this.storage.snippets = this.storage.snippets.filter((s) => s.id !== snippet.id);

    // Remove from folders
    for (const folder of this.storage.folders) {
      folder.snippets = folder.snippets.filter((id) => id !== snippet.id);
    }

    await this.saveSnippets();
    vscode.window.showInformationMessage(`Snippet '${snippet.name}' deleted`);
    this.logger.info('Snippet deleted', { id: snippet.id, name: snippet.name });
  }

  /**
   * List all snippets
   */
  public listSnippets(): Snippet[] {
    return [...this.storage.snippets];
  }

  /**
   * Get snippet by ID
   */
  public getSnippet(id: string): Snippet | undefined {
    return this.storage.snippets.find((s) => s.id === id);
  }

  /**
   * Get snippets by language
   */
  public getSnippetsByLanguage(language: string): Snippet[] {
    return this.storage.snippets.filter((s) => s.language === language || s.language === '*');
  }

  /**
   * Get all folders
   */
  public getFolders(): SnippetFolder[] {
    return [...this.storage.folders];
  }

  /**
   * Create a new folder
   */
  public async createFolder(name: string, language?: string): Promise<void> {
    const existing = this.storage.folders.find((f) => f.name === name);
    if (existing) {
      vscode.window.showErrorMessage(`Folder '${name}' already exists`);
      return;
    }

    this.storage.folders.push({
      name,
      language,
      snippets: [],
    });

    await this.saveSnippets();
    vscode.window.showInformationMessage(`Folder '${name}' created`);
    this.logger.info('Folder created', { name, language });
  }

  public dispose(): void {
    this.logger.debug('Disposing SnippetManagerService');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
}
