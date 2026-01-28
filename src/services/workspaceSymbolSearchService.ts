import * as vscode from 'vscode';

import type {
  SymbolKind,
  SymbolSearchOptions,
  SymbolSearchResult,
  WorkspaceSymbol,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Workspace Symbol Search Service
 *
 * Provides fast symbol search with fuzzy matching, category filtering, and result preview.
 * Supports searching across multiple workspaces with result grouping.
 */
export class WorkspaceSymbolSearchService {
  private static instance: WorkspaceSymbolSearchService | undefined;
  private logger: Logger;

  // Mapping from LSP SymbolKind to our string representation
  private readonly symbolKindMap: Map<number, SymbolKind> = new Map([
    [vscode.SymbolKind.Class, 'class'],
    [vscode.SymbolKind.Constant, 'constant'],
    [vscode.SymbolKind.Constructor, 'constructor'],
    [vscode.SymbolKind.Enum, 'enum'],
    [vscode.SymbolKind.EnumMember, 'enumMember'],
    [vscode.SymbolKind.Event, 'event'],
    [vscode.SymbolKind.Field, 'field'],
    [vscode.SymbolKind.File, 'file'],
    [vscode.SymbolKind.Function, 'function'],
    [vscode.SymbolKind.Interface, 'interface'],
    [vscode.SymbolKind.Key, 'key'],
    [vscode.SymbolKind.Method, 'method'],
    [vscode.SymbolKind.Module, 'module'],
    [vscode.SymbolKind.Namespace, 'namespace'],
    [vscode.SymbolKind.Number, 'number'],
    [vscode.SymbolKind.Object, 'object'],
    [vscode.SymbolKind.Operator, 'operator'],
    [vscode.SymbolKind.Package, 'package'],
    [vscode.SymbolKind.Property, 'property'],
    [vscode.SymbolKind.String, 'string'],
    [vscode.SymbolKind.Struct, 'struct'],
    [vscode.SymbolKind.TypeParameter, 'typeParameter'],
    [vscode.SymbolKind.Variable, 'variable'],
  ]);

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): WorkspaceSymbolSearchService {
    WorkspaceSymbolSearchService.instance ??= new WorkspaceSymbolSearchService();
    return WorkspaceSymbolSearchService.instance;
  }

  /**
   * Search for symbols across all workspace folders
   */
  public async searchSymbols(options: SymbolSearchOptions): Promise<SymbolSearchResult> {
    const startTime = performance.now();
    const { query, maxResults = 100, kinds } = options;

    try {
      // Use VS Code's built-in workspace symbol provider
      const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        query,
      );

      if (!symbols || symbols.length === 0) {
        this.logger.debug(`No symbols found for query: ${query}`);
        return {
          symbols: [],
          totalFound: 0,
          groupedByWorkspace: {},
          groupedByKind: {} as Record<SymbolKind, WorkspaceSymbol[]>,
          searchDuration: performance.now() - startTime,
        };
      }

      // Convert VS Code symbols to our format
      let workspaceSymbols: WorkspaceSymbol[] = symbols.map((symbol) => ({
        name: symbol.name,
        kind: this.convertSymbolKind(symbol.kind),
        location: {
          uri: symbol.location.uri.toString(),
          range: {
            start: {
              line: symbol.location.range.start.line,
              character: symbol.location.range.start.character,
            },
            end: {
              line: symbol.location.range.end.line,
              character: symbol.location.range.end.character,
            },
          },
        },
        containerName: symbol.containerName,
        workspaceFolderName: this.getWorkspaceFolderName(symbol.location.uri),
      }));

      // Filter by kinds if specified
      if (kinds && kinds.length > 0) {
        workspaceSymbols = workspaceSymbols.filter((s) => kinds.includes(s.kind));
      }

      // Apply fuzzy matching scoring
      workspaceSymbols = this.applyFuzzyMatching(workspaceSymbols, query);

      // Sort by score (descending) and then by name
      workspaceSymbols.sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        return a.name.localeCompare(b.name);
      });

      // Limit results
      const limitedSymbols = workspaceSymbols.slice(0, maxResults);

      // Group results
      const groupedByWorkspace = this.groupByWorkspace(limitedSymbols);
      const groupedByKind = this.groupByKind(limitedSymbols);

      const result: SymbolSearchResult = {
        symbols: limitedSymbols,
        totalFound: workspaceSymbols.length,
        groupedByWorkspace,
        groupedByKind,
        searchDuration: performance.now() - startTime,
      };

      this.logger.debug(`Symbol search completed for query: ${query}`, {
        found: result.totalFound,
        returned: limitedSymbols.length,
        duration: result.searchDuration,
      });

      return result;
    } catch (error) {
      this.logger.error('Error searching workspace symbols', error);
      return {
        symbols: [],
        totalFound: 0,
        groupedByWorkspace: {},
        groupedByKind: {} as Record<SymbolKind, WorkspaceSymbol[]>,
        searchDuration: performance.now() - startTime,
      };
    }
  }

  /**
   * Get a preview of the symbol's code
   */
  public async getSymbolPreview(symbol: WorkspaceSymbol, maxLines = 10): Promise<string> {
    try {
      const uri = vscode.Uri.parse(symbol.location.uri);
      const document = await vscode.workspace.openTextDocument(uri);

      const startLine = symbol.location.range.start.line;
      const endLine = Math.min(
        startLine + maxLines,
        symbol.location.range.end.line + maxLines / 2,
        document.lineCount,
      );

      const lines: string[] = [];
      for (let i = startLine; i < endLine && i < document.lineCount; i++) {
        lines.push(document.lineAt(i).text);
      }

      return lines.join('\n');
    } catch (error) {
      this.logger.error('Error getting symbol preview', error);
      return '// Unable to load preview';
    }
  }

  /**
   * Navigate to a symbol's location
   */
  public async navigateToSymbol(symbol: WorkspaceSymbol): Promise<boolean> {
    try {
      const uri = vscode.Uri.parse(symbol.location.uri);
      const position = new vscode.Position(
        symbol.location.range.start.line,
        symbol.location.range.start.character,
      );

      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        selection: new vscode.Range(position, position),
        preserveFocus: false,
      });

      this.logger.debug(`Navigated to symbol: ${symbol.name}`, {
        file: uri.fsPath,
        line: position.line,
      });

      return true;
    } catch (error) {
      this.logger.error('Error navigating to symbol', error);
      await vscode.window.showErrorMessage(`Failed to navigate to symbol: ${error}`);
      return false;
    }
  }

  /**
   * Get available symbol kinds
   */
  public getAvailableSymbolKinds(): SymbolKind[] {
    return Array.from(this.symbolKindMap.values());
  }

  /**
   * Get all workspace folder names
   */
  public getWorkspaceFolders(): string[] {
    return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.name);
  }

  /**
   * Apply fuzzy matching scoring to symbols
   */
  private applyFuzzyMatching(symbols: WorkspaceSymbol[], query: string): WorkspaceSymbol[] {
    if (!query || query.trim().length === 0) {
      return symbols.map((s) => ({ ...s, score: 1 }));
    }

    const normalizedQuery = query.toLowerCase().trim();

    return symbols.map((symbol) => {
      const normalizedName = symbol.name.toLowerCase();
      const score = this.calculateFuzzyScore(normalizedName, normalizedQuery);
      return { ...symbol, score };
    });
  }

  /**
   * Calculate fuzzy match score
   * Returns a value between 0 and 1, where 1 is a perfect match
   */
  private calculateFuzzyScore(text: string, query: string): number {
    // Exact match gets highest score
    if (text === query) {
      return 1;
    }

    // Starts with query gets high score
    if (text.startsWith(query)) {
      return 0.9;
    }

    // Contains query gets good score
    if (text.includes(query)) {
      return 0.7;
    }

    // Fuzzy match: all characters in query appear in order in text
    let queryIndex = 0;
    let consecutiveMatches = 0;
    let maxConsecutiveMatches = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
        consecutiveMatches++;
        maxConsecutiveMatches = Math.max(maxConsecutiveMatches, consecutiveMatches);
      } else {
        consecutiveMatches = 0;
      }
    }

    // All characters matched
    if (queryIndex === query.length) {
      // Bonus for consecutive character matches
      const consecutiveBonus = maxConsecutiveMatches * 0.05;
      const baseScore = 0.5;
      return Math.min(1, baseScore + consecutiveBonus);
    }

    // Partial match - some characters didn't match
    const matchedRatio = queryIndex / query.length;
    return matchedRatio * 0.3;
  }

  /**
   * Convert VS Code SymbolKind to our string representation
   */
  private convertSymbolKind(kind: vscode.SymbolKind): SymbolKind {
    return this.symbolKindMap.get(kind) ?? 'variable';
  }

  /**
   * Get the workspace folder name for a URI
   */
  private getWorkspaceFolderName(uri: vscode.Uri): string {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    return folder?.name ?? 'Unknown Workspace';
  }

  /**
   * Group symbols by workspace
   */
  private groupByWorkspace(symbols: WorkspaceSymbol[]): Record<string, WorkspaceSymbol[]> {
    const grouped: Record<string, WorkspaceSymbol[]> = {};

    for (const symbol of symbols) {
      const workspace = symbol.workspaceFolderName;
      if (!grouped[workspace]) {
        grouped[workspace] = [];
      }
      grouped[workspace].push(symbol);
    }

    return grouped;
  }

  /**
   * Group symbols by kind
   */
  private groupByKind(symbols: WorkspaceSymbol[]): Record<SymbolKind, WorkspaceSymbol[]> {
    const grouped: Record<string, WorkspaceSymbol[]> = {};

    for (const symbol of symbols) {
      const kind = symbol.kind;
      if (!grouped[kind]) {
        grouped[kind] = [];
      }
      grouped[kind].push(symbol);
    }

    return grouped as Record<SymbolKind, WorkspaceSymbol[]>;
  }
}
