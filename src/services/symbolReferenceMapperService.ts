import * as path from 'path';

import * as vscode from 'vscode';

import type {
  CallHierarchyDirection,
  CallHierarchyItem,
  ImportRelationship,
  ReferenceLocation,
  SymbolReferenceMap,
  SymbolReferenceMapOptions,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Symbol Reference Mapper Service
 *
 * Visualizes all references to a symbol across the codebase.
 * Shows call hierarchies, import relationships, and provides quick navigation to references.
 */
export class SymbolReferenceMapperService {
  private static instance: SymbolReferenceMapperService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SymbolReferenceMapperService {
    SymbolReferenceMapperService.instance ??= new SymbolReferenceMapperService();
    return SymbolReferenceMapperService.instance;
  }

  /**
   * Map all references for the symbol at the current cursor position
   */
  public async mapSymbolReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    options: SymbolReferenceMapOptions = {},
  ): Promise<SymbolReferenceMap | null> {
    const startTime = performance.now();

    try {
      // Get references using VS Code's LSP
      const references = await this.findReferences(document, position);

      // Get call hierarchy if available
      const callHierarchy = await this.getCallHierarchy(document, position, options.direction);

      // Get import relationships
      const imports = await this.getImportRelationships(document, position);

      // Get symbol info
      const symbolInfo = await this.getSymbolInfo(document, position);

      const result: SymbolReferenceMap = {
        symbol: symbolInfo,
        references,
        callHierarchy,
        imports,
        analysisDuration: performance.now() - startTime,
      };

      this.logger.debug(`Symbol reference mapping completed for: ${symbolInfo.name}`, {
        referenceCount: references.length,
        callHierarchyItems: callHierarchy?.length ?? 0,
        imports: imports.length,
        duration: result.analysisDuration,
      });

      return result;
    } catch (error) {
      this.logger.error('Error mapping symbol references', error);
      await vscode.window.showErrorMessage(`Failed to map symbol references: ${error}`);
      return null;
    }
  }

  /**
   * Find all references to the symbol at the given position
   */
  private async findReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<ReferenceLocation[]> {
    try {
      const references = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        document.uri,
        position,
      );

      if (!references || references.length === 0) {
        return [];
      }

      return references.map((ref) => ({
        uri: ref.uri.toString(),
        range: {
          start: {
            line: ref.range.start.line,
            character: ref.range.start.character,
          },
          end: {
            line: ref.range.end.line,
            character: ref.range.end.character,
          },
        },
        fileName: this.getFileName(ref.uri),
        workspaceFolder: this.getWorkspaceFolderName(ref.uri),
      }));
    } catch (error) {
      this.logger.error('Error finding references', error);
      return [];
    }
  }

  /**
   * Get call hierarchy for the symbol at the given position
   */
  private async getCallHierarchy(
    document: vscode.TextDocument,
    position: vscode.Position,
    direction: CallHierarchyDirection = 'incoming',
  ): Promise<CallHierarchyItem[] | null> {
    try {
      // Get call hierarchy items
      const items = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
        'vscode.prepareCallHierarchy',
        document.uri,
        position,
      );

      if (!items || items.length === 0) {
        return null;
      }

      const item = items[0];

      // Get incoming or outgoing calls
      const calls = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
        direction === 'incoming' ? 'vscode.provideIncomingCalls' : 'vscode.provideOutgoingCalls',
        item,
      );

      if (!calls || calls.length === 0) {
        return [];
      }

      return calls.map((call) => ({
        name: call.name,
        kind: this.convertSymbolKind(call.kind),
        uri: call.uri.toString(),
        range: {
          start: {
            line: call.range.start.line,
            character: call.range.start.character,
          },
          end: {
            line: call.range.end.line,
            character: call.range.end.character,
          },
        },
        detail: call.detail ?? undefined,
        fileName: this.getFileName(call.uri),
        workspaceFolder: this.getWorkspaceFolderName(call.uri),
        direction,
      }));
    } catch (error) {
      this.logger.debug('Call hierarchy not available for this symbol', error);
      return null;
    }
  }

  /**
   * Get import relationships for the symbol
   */
  private async getImportRelationships(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<ImportRelationship[]> {
    try {
      // Get the symbol definition
      const definition = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider',
        document.uri,
        position,
      );

      if (!definition || definition.length === 0) {
        return [];
      }

      const definitionUri = definition[0].uri;
      const imports: ImportRelationship[] = [];

      // Search for files that import this symbol
      const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx}', '**/node_modules/**');

      for (const file of files) {
        if (file.toString() === definitionUri.toString()) {
          continue;
        }

        const fileImports = await this.getImportsForFile(file, definitionUri);
        imports.push(...fileImports);
      }

      return imports;
    } catch (error) {
      this.logger.error('Error getting import relationships', error);
      return [];
    }
  }

  /**
   * Get imports for a specific file that reference the target definition
   */
  private async getImportsForFile(
    file: vscode.Uri,
    definitionUri: vscode.Uri,
  ): Promise<ImportRelationship[]> {
    const imports: ImportRelationship[] = [];

    try {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();
      const lines = text.split('\n');

      // Get the module name from the definition URI
      const definitionPath = definitionUri.fsPath;
      const definitionFileName = this.getFileName(definitionUri);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if line contains an import statement
        const importMatch = line.match(
          /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/,
        );

        if (importMatch) {
          const [, namedImports, namespaceImport, defaultImport, modulePath] = importMatch;

          // Resolve relative path
          let resolvedPath = modulePath;
          if (modulePath.startsWith('.')) {
            const fileDir = path.dirname(file.fsPath);
            resolvedPath = path.resolve(fileDir, modulePath);
          }

          // Check if this import references our definition
          const isRelevant =
            resolvedPath.includes(definitionPath.replace(/\.(ts|tsx|js|jsx)$/, '')) ||
            resolvedPath.includes(definitionFileName.replace(/\.(ts|tsx|js|jsx)$/, ''));

          if (isRelevant) {
            const importedSymbols: string[] = [];

            if (namedImports) {
              importedSymbols.push(
                ...namedImports.split(',').map((s) => s.trim().split(' as ')[0].trim()),
              );
            }
            if (namespaceImport) {
              importedSymbols.push(namespaceImport);
            }
            if (defaultImport) {
              importedSymbols.push(defaultImport);
            }

            imports.push({
              fromFile: this.getFileName(file),
              fromUri: file.toString(),
              importedSymbols,
              modulePath,
              lineNumber: i + 1,
            });
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }

    return imports;
  }

  /**
   * Get basic symbol information
   */
  private async getSymbolInfo(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<{ name: string; kind: string; uri: string; range: any }> {
    try {
      // Try to get the symbol at position
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri,
      );

      if (symbols) {
        const symbol = this.findSymbolAtPosition(symbols, position);
        if (symbol) {
          return {
            name: symbol.name,
            kind: this.convertSymbolKind(symbol.kind),
            uri: document.uri.toString(),
            range: {
              start: {
                line: symbol.range.start.line,
                character: symbol.range.start.character,
              },
              end: {
                line: symbol.range.end.line,
                character: symbol.range.end.character,
              },
            },
          };
        }
      }

      // Fallback: use word at position
      const wordRange = document.getWordRangeAtPosition(position);
      const word = wordRange ? document.getText(wordRange) : 'unknown';

      return {
        name: word,
        kind: 'variable',
        uri: document.uri.toString(),
        range: {
          start: {
            line: wordRange?.start.line ?? position.line,
            character: wordRange?.start.character ?? position.character,
          },
          end: {
            line: wordRange?.end.line ?? position.line,
            character: wordRange?.end.character ?? position.character,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error getting symbol info', error);
      return {
        name: 'unknown',
        kind: 'variable',
        uri: document.uri.toString(),
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
      };
    }
  }

  /**
   * Find the symbol at a given position from document symbols
   */
  private findSymbolAtPosition(
    symbols: vscode.DocumentSymbol[],
    position: vscode.Position,
  ): vscode.DocumentSymbol | undefined {
    for (const symbol of symbols) {
      if (symbol.range.contains(position)) {
        // Check children first (more specific)
        if (symbol.children.length > 0) {
          const childSymbol = this.findSymbolAtPosition(symbol.children, position);
          if (childSymbol) {
            return childSymbol;
          }
        }
        return symbol;
      }
    }
    return undefined;
  }

  /**
   * Show references in a quick pick for easy navigation
   */
  public async showReferencesQuickPick(references: ReferenceLocation[]): Promise<void> {
    if (references.length === 0) {
      await vscode.window.showInformationMessage('No references found.');
      return;
    }

    const items = references.map((ref) => ({
      label: ref.fileName,
      description: `Line ${ref.range.start.line + 1}`,
      detail: ref.workspaceFolder,
      reference: ref,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a reference to navigate (${references.length} found)`,
    });

    if (selected) {
      await this.navigateToReference(selected.reference);
    }
  }

  /**
   * Show call hierarchy in a tree view
   */
  public async showCallHierarchyTree(hierarchy: CallHierarchyItem[]): Promise<void> {
    if (!hierarchy || hierarchy.length === 0) {
      await vscode.window.showInformationMessage('No call hierarchy available.');
      return;
    }

    const items = hierarchy.map((item) => ({
      label: item.name,
      description: item.detail ?? item.kind,
      detail: `${item.fileName}:${item.range.start.line + 1}`,
      item,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a call to navigate (${hierarchy.length} found)`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      await this.navigateToCallHierarchyItem(selected.item);
    }
  }

  /**
   * Navigate to a reference location
   */
  public async navigateToReference(reference: ReferenceLocation): Promise<boolean> {
    try {
      const uri = vscode.Uri.parse(reference.uri);
      const position = new vscode.Position(
        reference.range.start.line,
        reference.range.start.character,
      );

      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        selection: new vscode.Range(position, position),
        preserveFocus: false,
      });

      this.logger.debug(`Navigated to reference in: ${reference.fileName}`, {
        file: uri.fsPath,
        line: position.line,
      });

      return true;
    } catch (error) {
      this.logger.error('Error navigating to reference', error);
      await vscode.window.showErrorMessage(`Failed to navigate: ${error}`);
      return false;
    }
  }

  /**
   * Navigate to a call hierarchy item
   */
  public async navigateToCallHierarchyItem(item: CallHierarchyItem): Promise<boolean> {
    try {
      const uri = vscode.Uri.parse(item.uri);
      const position = new vscode.Position(item.range.start.line, item.range.start.character);

      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        selection: new vscode.Range(position, position),
        preserveFocus: false,
      });

      this.logger.debug(`Navigated to call hierarchy item: ${item.name}`, {
        file: uri.fsPath,
        line: position.line,
      });

      return true;
    } catch (error) {
      this.logger.error('Error navigating to call hierarchy item', error);
      await vscode.window.showErrorMessage(`Failed to navigate: ${error}`);
      return false;
    }
  }

  /**
   * Convert VS Code SymbolKind to our string representation
   */
  private convertSymbolKind(kind: vscode.SymbolKind): string {
    const kindMap: Record<number, string> = {
      [vscode.SymbolKind.Class]: 'class',
      [vscode.SymbolKind.Constant]: 'constant',
      [vscode.SymbolKind.Constructor]: 'constructor',
      [vscode.SymbolKind.Enum]: 'enum',
      [vscode.SymbolKind.EnumMember]: 'enumMember',
      [vscode.SymbolKind.Event]: 'event',
      [vscode.SymbolKind.Field]: 'field',
      [vscode.SymbolKind.File]: 'file',
      [vscode.SymbolKind.Function]: 'function',
      [vscode.SymbolKind.Interface]: 'interface',
      [vscode.SymbolKind.Key]: 'key',
      [vscode.SymbolKind.Method]: 'method',
      [vscode.SymbolKind.Module]: 'module',
      [vscode.SymbolKind.Namespace]: 'namespace',
      [vscode.SymbolKind.Number]: 'number',
      [vscode.SymbolKind.Object]: 'object',
      [vscode.SymbolKind.Operator]: 'operator',
      [vscode.SymbolKind.Package]: 'package',
      [vscode.SymbolKind.Property]: 'property',
      [vscode.SymbolKind.String]: 'string',
      [vscode.SymbolKind.Struct]: 'struct',
      [vscode.SymbolKind.TypeParameter]: 'typeParameter',
      [vscode.SymbolKind.Variable]: 'variable',
    };

    return kindMap[kind] ?? 'unknown';
  }

  /**
   * Get the workspace folder name for a URI
   */
  private getWorkspaceFolderName(uri: vscode.Uri): string {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    return folder?.name ?? 'Unknown Workspace';
  }

  /**
   * Get the file name from a URI
   */
  private getFileName(uri: vscode.Uri): string {
    return path.basename(uri.fsPath);
  }
}
