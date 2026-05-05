/**
 * Minimal VS Code API mock for Vitest unit tests.
 * Only stubs what the infrastructure services actually use.
 * No real filesystem, network, or child_process access.
 */

export const workspace = {
  workspaceFolders: undefined as
    | Array<{ uri: { fsPath: string }; name: string; index: number }>
    | undefined,
  findFiles: async () => [],
  onDidCreateFiles: () => ({ dispose: () => {} }),
  onDidDeleteFiles: () => ({ dispose: () => {} }),
  onDidRenameFiles: () => ({ dispose: () => {} }),
  getConfiguration: () => ({
    get: (_key: string, defaultValue?: unknown) => defaultValue,
    update: async () => {},
    has: () => false,
    inspect: () => undefined,
  }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const commands = {
  executeCommand: async () => undefined,
  registerCommand: () => ({ dispose: () => {} }),
};

export const window = {
  showQuickPick: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showInformationMessage: async () => undefined,
  showInputBox: async () => undefined,
  activeTextEditor: undefined as unknown,
  createOutputChannel: () => ({
    appendLine: () => {},
    append: () => {},
    show: () => {},
    dispose: () => {},
    clear: () => {},
  }),
  createTerminal: () => ({
    show: () => {},
    sendText: () => {},
    dispose: () => {},
  }),
  terminals: [] as unknown[],
};

export const languages = {
  createDiagnosticCollection: () => ({
    set: () => {},
    clear: () => {},
    delete: () => {},
    dispose: () => {},
  }),
};

export const accessibility = {
  announce: async () => {},
};

export const env = {
  clipboard: {
    readText: async () => '',
    writeText: async () => {},
  },
};

export const extensions = {
  getExtension: () => undefined,
  all: [] as unknown[],
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  parse: (uri: string) => ({ fsPath: uri, scheme: 'file', path: uri }),
};

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export class EventEmitter<T = void> {
  private listeners: Array<(e: T) => unknown> = [];
  event = (listener: (e: T) => unknown) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter((l) => l !== listener); } };
  };
  fire(data: T) {
    this.listeners.forEach((l) => l(data));
  }
  dispose() {
    this.listeners = [];
  }
}

export class RelativePattern {
  constructor(
    public readonly base: string | { uri: { fsPath: string } },
    public readonly pattern: string,
  ) {}
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export class Selection extends Range {
  constructor(
    public readonly anchor: Position,
    public readonly active: Position,
  ) {
    super(anchor, active);
  }
  get isEmpty() {
    return (
      this.anchor.line === this.active.line && this.anchor.character === this.active.character
    );
  }
}

export class TextEdit {
  constructor(
    public readonly range: Range,
    public readonly newText: string,
  ) {}
  static replace(range: Range, newText: string) {
    return new TextEdit(range, newText);
  }
  static insert(position: Position, newText: string) {
    return new TextEdit(new Range(position, position), newText);
  }
  static delete(range: Range) {
    return new TextEdit(range, '');
  }
}

export class WorkspaceEdit {
  private edits: Array<{ uri: unknown; edit: TextEdit }> = [];
  replace(uri: unknown, range: Range, newText: string) {
    this.edits.push({ uri, edit: TextEdit.replace(range, newText) });
  }
  insert(uri: unknown, position: Position, newText: string) {
    this.edits.push({ uri, edit: TextEdit.insert(position, newText) });
  }
  delete(uri: unknown, range: Range) {
    this.edits.push({ uri, edit: TextEdit.delete(range) });
  }
  get size() {
    return this.edits.length;
  }
}

export class Diagnostic {
  public code?: string | number;
  public source?: string;
  constructor(
    public range: Range,
    public message: string,
    public severity?: DiagnosticSeverity,
  ) {}
}
