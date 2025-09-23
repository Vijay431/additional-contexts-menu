import * as vscode from 'vscode';
import { ExtensionConfig } from '../../../types/extension';

/**
 * Test utilities and mocks for VS Code extension testing
 */

// Mock Terminal Implementation
export class MockTerminal implements vscode.Terminal {
  public readonly name: string;
  public readonly processId: Promise<number | undefined>;
  public readonly creationOptions: vscode.TerminalOptions;
  public exitStatus: vscode.TerminalExitStatus | undefined;
  public state: vscode.TerminalState;
  public shellIntegration: vscode.TerminalShellIntegration | undefined;

  private _disposed = false;

  constructor(options: vscode.TerminalOptions) {
    this.name = options.name || 'Mock Terminal';
    this.creationOptions = options;
    this.processId = Promise.resolve(12345);
    this.state = {
      isInteractedWith: false,
      shell: undefined
    };
    this.shellIntegration = undefined;
  }

  sendText(text: string, shouldExecute?: boolean): void {
    if (this._disposed) {
      throw new Error('Terminal has been disposed');
    }
    // Mock implementation - store sent text for verification
    (this as any)._lastSentText = text;
    (this as any)._shouldExecute = shouldExecute;
  }

  show(preserveFocus?: boolean): void {
    if (this._disposed) {
      throw new Error('Terminal has been disposed');
    }
    (this as any)._shown = true;
    (this as any)._preserveFocus = preserveFocus;
  }

  hide(): void {
    (this as any)._shown = false;
  }

  dispose(): void {
    this._disposed = true;
  }

  // Test helper methods
  isDisposed(): boolean {
    return this._disposed;
  }

  getLastSentText(): string {
    return (this as any)._lastSentText;
  }

  wasShown(): boolean {
    return (this as any)._shown;
  }
}

// Mock Workspace Folder
export class MockWorkspaceFolder implements vscode.WorkspaceFolder {
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly index: number;

  constructor(path: string, name?: string, index = 0) {
    this.uri = vscode.Uri.file(path);
    this.name = name || path.split('/').pop() || path;
    this.index = index;
  }
}

// Mock File System Stat
export class MockFileStat implements vscode.FileStat {
  public readonly type: vscode.FileType;
  public readonly ctime: number;
  public readonly mtime: number;
  public readonly size: number;

  constructor(type: vscode.FileType, size = 100) {
    this.type = type;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = size;
  }
}

// Mock Configuration Service
export class MockConfigurationService {
  private config: ExtensionConfig;

  constructor(config?: Partial<ExtensionConfig>) {
    this.config = {
      enabled: true,
      autoDetectProjects: true,
      supportedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      copyCode: {
        insertionPoint: 'smart',
        handleImports: 'merge',
        preserveComments: true,
      },
      saveAll: {
        showNotification: true,
        skipReadOnly: true,
      },
      enableKeybindings: false,
      showKeybindingsInMenu: true,
      terminal: {
        type: 'integrated',
        externalTerminalCommand: '',
        openBehavior: 'parent-directory',
      },
      ...config,
    };
  }

  getConfiguration(): ExtensionConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ExtensionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getSupportedExtensions(): string[] {
    return this.config.supportedExtensions;
  }

  shouldAutoDetectProjects(): boolean {
    return this.config.autoDetectProjects;
  }

  getCopyCodeConfig() {
    return this.config.copyCode;
  }

  getSaveAllConfig() {
    return this.config.saveAll;
  }

  onConfigurationChanged(_callback: () => void): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  async updateConfiguration<T>(_key: string, _value: T, _target?: vscode.ConfigurationTarget): Promise<void> {
    // Mock implementation
  }
}

// VS Code API Mocks
export class VSCodeMocks {
  private static _instance: VSCodeMocks;
  public terminals: MockTerminal[] = [];
  public workspaceFolders: MockWorkspaceFolder[] = [];
  public fileSystem: Map<string, MockFileStat> = new Map();

  private constructor() {}

  public static getInstance(): VSCodeMocks {
    if (!VSCodeMocks._instance) {
      VSCodeMocks._instance = new VSCodeMocks();
    }
    return VSCodeMocks._instance;
  }

  public static reset(): void {
    const instance = VSCodeMocks.getInstance();
    instance.terminals = [];
    instance.workspaceFolders = [];
    instance.fileSystem.clear();
  }

  // Mock window methods
  public createTerminal(options: vscode.TerminalOptions): MockTerminal {
    const terminal = new MockTerminal(options);
    this.terminals.push(terminal);
    return terminal;
  }

  public showInformationMessage(message: string): void {
    // Mock implementation - store message for verification
    (this as any)._lastInfoMessage = message;
  }

  public showErrorMessage(message: string): void {
    // Mock implementation - store message for verification
    (this as any)._lastErrorMessage = message;
  }

  // Mock workspace methods
  public setWorkspaceFolders(folders: MockWorkspaceFolder[]): void {
    this.workspaceFolders = folders;
  }

  public getWorkspaceFolders(): MockWorkspaceFolder[] {
    return this.workspaceFolders;
  }

  // Mock file system methods
  public async stat(uri: vscode.Uri): Promise<MockFileStat> {
    const path = uri.fsPath;
    const stat = this.fileSystem.get(path);
    if (!stat) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    return stat;
  }

  public addFile(path: string, isDirectory = false): void {
    const type = isDirectory ? vscode.FileType.Directory : vscode.FileType.File;
    this.fileSystem.set(path, new MockFileStat(type));
  }

  public addDirectory(path: string): void {
    this.addFile(path, true);
  }

  public removeFile(path: string): void {
    this.fileSystem.delete(path);
  }

  // Test helper methods
  public getLastInfoMessage(): string {
    return (this as any)._lastInfoMessage;
  }

  public getLastErrorMessage(): string {
    return (this as any)._lastErrorMessage;
  }

  public getTerminalCount(): number {
    return this.terminals.length;
  }

  public getLastCreatedTerminal(): MockTerminal | undefined {
    return this.terminals[this.terminals.length - 1];
  }
}

// Test Configuration Factory
export class TestConfigFactory {
  public static createDefault(): ExtensionConfig {
    return {
      enabled: true,
      autoDetectProjects: true,
      supportedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      copyCode: {
        insertionPoint: 'smart',
        handleImports: 'merge',
        preserveComments: true,
      },
      saveAll: {
        showNotification: true,
        skipReadOnly: true,
      },
      enableKeybindings: false,
      showKeybindingsInMenu: true,
      terminal: {
        type: 'integrated',
        externalTerminalCommand: '',
        openBehavior: 'parent-directory',
      },
    };
  }

  public static createForTerminalType(type: 'integrated' | 'external' | 'system-default'): ExtensionConfig {
    const config = TestConfigFactory.createDefault();
    config.terminal.type = type;
    return config;
  }

  public static createForOpenBehavior(behavior: 'parent-directory' | 'workspace-root' | 'current-directory'): ExtensionConfig {
    const config = TestConfigFactory.createDefault();
    config.terminal.openBehavior = behavior;
    return config;
  }

  public static createWithExternalTerminal(command: string): ExtensionConfig {
    const config = TestConfigFactory.createDefault();
    config.terminal.type = 'external';
    config.terminal.externalTerminalCommand = command;
    return config;
  }
}

// Test Data Factory
export class TestDataFactory {
  public static createWorkspaceFolder(path: string, name?: string): MockWorkspaceFolder {
    return new MockWorkspaceFolder(path, name);
  }

  public static createTypicalWorkspace(): MockWorkspaceFolder[] {
    return [
      new MockWorkspaceFolder('/home/user/project', 'project', 0),
    ];
  }

  public static createMultiWorkspace(): MockWorkspaceFolder[] {
    return [
      new MockWorkspaceFolder('/home/user/project1', 'project1', 0),
      new MockWorkspaceFolder('/home/user/project2', 'project2', 1),
    ];
  }

  public static createEmptyWorkspace(): MockWorkspaceFolder[] {
    return [];
  }
}