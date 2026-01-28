import * as vscode from 'vscode';

import type {
  ImportType,
  UnusedImport,
  UnusedImportDetectionConfig,
  UnusedImportDetectionResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

interface ParsedImport {
  fullText: string;
  type: ImportType;
  modulePath: string;
  namedImports?: string[];
  defaultImport?: string;
  namespaceImport?: string;
  isTypeOnly: boolean;
  lineNumber: number;
  startColumn: number;
  endColumn: number;
}

interface SymbolUsage {
  name: string;
  used: boolean;
  import: ParsedImport;
  isType: boolean;
}

/**
 * Service for detecting unused imports in TypeScript and JavaScript files
 */
export class UnusedImportDetectionService {
  private static instance: UnusedImportDetectionService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('unusedImports');
  }

  public static getInstance(): UnusedImportDetectionService {
    UnusedImportDetectionService.instance ??= new UnusedImportDetectionService();
    return UnusedImportDetectionService.instance;
  }

  /**
   * Detect unused imports in a document
   */
  public async detectUnusedImports(
    document: vscode.TextDocument,
    config: UnusedImportDetectionConfig,
  ): Promise<UnusedImportDetectionResult> {
    const startTime = Date.now();

    try {
      const text = document.getText();
      const lines = text.split('\n');

      // Parse all imports
      const imports = this.parseImports(lines);

      if (imports.length === 0) {
        return {
          file: document.uri.fsPath,
          unusedImports: [],
          totalUnused: 0,
          byType: { named: 0, default: 0, namespace: 0, typeOnly: 0 },
          suggestions: [],
          canAutoFix: false,
          analysisDuration: Date.now() - startTime,
        };
      }

      // Track usage of imported symbols
      const usageMap = this.trackSymbolUsage(imports, lines, text, config);

      // Find unused imports
      const unusedImports = this.findUnusedImports(usageMap, config);

      // Group by type
      const byType = this.groupByType(unusedImports);

      // Generate suggestions
      const suggestions = this.generateSuggestions(unusedImports, config);

      // Clear previous diagnostics
      this.diagnosticCollection.delete(document.uri);

      // Show diagnostics if enabled
      if (config.showDiagnostics && unusedImports.length > 0) {
        this.showDiagnostics(document, unusedImports);
      }

      this.logger.info(`Found ${unusedImports.length} unused import(s) in ${document.uri.fsPath}`);

      return {
        file: document.uri.fsPath,
        unusedImports,
        totalUnused: unusedImports.length,
        byType,
        suggestions,
        canAutoFix: unusedImports.length > 0,
        analysisDuration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error detecting unused imports', error);
      throw error;
    }
  }

  /**
   * Remove unused imports from a document
   */
  public async removeUnusedImports(
    document: vscode.TextDocument,
    unusedImports: UnusedImport[],
  ): Promise<void> {
    try {
      const editor = await vscode.window.showTextDocument(document);
      const text = document.getText();
      const lines = text.split('\n');

      // Sort by line number in reverse order to avoid shifting positions
      const sortedImports = [...unusedImports].sort((a, b) => b.line - a.line);

      await editor.edit((editBuilder) => {
        for (const imp of sortedImports) {
          const lineIndex = imp.line - 1;
          const line = lines[lineIndex] ?? '';

          // Check if this is the only import on the line
          const importMatches = this.getAllImportsInLine(line);

          if (importMatches.length === 1) {
            // Remove the entire line
            const startPos = new vscode.Position(imp.line - 1, 0);
            const endPos = new vscode.Position(imp.line - 1, line.length);
            const range = new vscode.Range(startPos, endPos);

            // Check if we should remove the trailing newline
            const nextLine = lines[lineIndex + 1];
            if (nextLine?.trim() === '') {
              // Remove the line and the empty line after it
              const endPosWithNewline = new vscode.Position(imp.line, 0);
              const rangeWithNewline = new vscode.Range(startPos, endPosWithNewline);
              editBuilder.delete(rangeWithNewline);
            } else if (lineIndex > 0 && lines[lineIndex - 1]?.trim() === '') {
              // Remove the line and the empty line before it
              const startPosWithNewline = new vscode.Position(imp.line - 2, 0);
              const rangeWithNewline = new vscode.Range(startPosWithNewline, endPos);
              editBuilder.delete(rangeWithNewline);
            } else {
              editBuilder.delete(range);
            }
          } else if (importMatches.length > 1) {
            // Remove only the specific named import from the list
            const newLine = this.removeNamedImportFromLine(line, imp.name, imp.isTypeImport);
            if (newLine !== line) {
              const startPos = new vscode.Position(imp.line - 1, 0);
              const endPos = new vscode.Position(imp.line - 1, line.length);
              const range = new vscode.Range(startPos, endPos);
              editBuilder.replace(range, newLine);
            }
          }
        }
      });

      // Clear diagnostics after fixing
      this.diagnosticCollection.delete(document.uri);

      this.logger.info(`Removed ${unusedImports.length} unused import(s)`);
    } catch (error) {
      this.logger.error('Error removing unused imports', error);
      throw error;
    }
  }

  /**
   * Clear diagnostics for a document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Clear all diagnostics
   */
  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Parse all import statements from the given lines
   */
  private parseImports(lines: string[]): ParsedImport[] {
    const imports: ParsedImport[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      if (!trimmed.startsWith('import ')) {
        continue;
      }

      const parsed = this.parseImportLine(trimmed, i, line);
      if (parsed) {
        imports.push(parsed);
      }
    }

    return imports;
  }

  /**
   * Parse a single import line
   */
  private parseImportLine(
    line: string,
    lineNumber: number,
    originalLine: string,
  ): ParsedImport | null {
    // Find start and end columns
    const startColumn = originalLine.indexOf(line);
    const endColumn = startColumn + line.length;

    // Type-only imports: import type { X } from 'module'
    const typeOnlyMatch = line.match(
      /^import\s+type\s+(\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+(['"][^'"]+['"])/,
    );
    if (typeOnlyMatch) {
      const modulePath = typeOnlyMatch[4]?.replace(/['"]/g, '') ?? '';
      const namedBlock = typeOnlyMatch[1];

      if (namedBlock.startsWith('{')) {
        const namedImports = this.parseNamedImports(namedBlock);
        return {
          fullText: line,
          type: 'type-only' as ImportType,
          modulePath,
          namedImports,
          isTypeOnly: true,
          lineNumber,
          startColumn,
          endColumn,
        };
      } else if (namedBlock.includes('* as')) {
        const namespaceImport = namedBlock.replace('* as', '').trim();
        return {
          fullText: line,
          type: 'namespace' as ImportType,
          modulePath,
          namespaceImport,
          isTypeOnly: true,
          lineNumber,
          startColumn,
          endColumn,
        };
      } else {
        return {
          fullText: line,
          type: 'default' as ImportType,
          modulePath,
          defaultImport: namedBlock,
          isTypeOnly: true,
          lineNumber,
          startColumn,
          endColumn,
        };
      }
    }

    // Namespace imports: import * as name from 'module'
    const namespaceMatch = line.match(/^import\s+\*\s+as\s+(\w+)\s+from\s+(['"][^'"]+['"])/);
    if (namespaceMatch) {
      return {
        fullText: line,
        type: 'namespace' as ImportType,
        modulePath: namespaceMatch[2]?.replace(/['"]/g, '') ?? '',
        namespaceImport: namespaceMatch[1],
        isTypeOnly: false,
        lineNumber,
        startColumn,
        endColumn,
      };
    }

    // Mixed default + named: import name, { named } from 'module'
    const mixedMatch = line.match(/^import\s+(\w+),\s*\{([^}]+)\}\s+from\s+(['"][^'"]+['"])/);
    if (mixedMatch) {
      return {
        fullText: line,
        type: 'named' as ImportType,
        modulePath: mixedMatch[3]?.replace(/['"]/g, '') ?? '',
        defaultImport: mixedMatch[1],
        namedImports: this.parseNamedImports(mixedMatch[2] ?? ''),
        isTypeOnly: false,
        lineNumber,
        startColumn,
        endColumn,
      };
    }

    // Default imports: import name from 'module'
    const defaultMatch = line.match(/^import\s+(\w+)\s+from\s+(['"][^'"]+['"])/);
    if (defaultMatch) {
      return {
        fullText: line,
        type: 'default' as ImportType,
        modulePath: defaultMatch[2]?.replace(/['"]/g, '') ?? '',
        defaultImport: defaultMatch[1],
        isTypeOnly: false,
        lineNumber,
        startColumn,
        endColumn,
      };
    }

    // Named imports: import { name1, name2 } from 'module'
    const namedMatch = line.match(/^import\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])/);
    if (namedMatch) {
      return {
        fullText: line,
        type: 'named' as ImportType,
        modulePath: namedMatch[2]?.replace(/['"]/g, '') ?? '',
        namedImports: this.parseNamedImports(namedMatch[1] ?? ''),
        isTypeOnly: false,
        lineNumber,
        startColumn,
        endColumn,
      };
    }

    // Side-effect imports: import 'module'
    const sideEffectMatch = line.match(/^import\s+(['"][^'"]+['"])/);
    if (sideEffectMatch) {
      return {
        fullText: line,
        type: 'named' as ImportType,
        modulePath: sideEffectMatch[1]?.replace(/['"]/g, '') ?? '',
        isTypeOnly: false,
        lineNumber,
        startColumn,
        endColumn,
      };
    }

    return null;
  }

  /**
   * Parse named imports from { ... } block
   */
  private parseNamedImports(namedBlock: string): string[] {
    return namedBlock
      .split(',')
      .map((s) => {
        let trimmed = s.trim();
        // Handle 'import type { X }' - remove 'type' keyword
        if (trimmed.startsWith('type ')) {
          trimmed = trimmed.substring(5).trim();
        }
        // Handle aliases: import { X as Y }
        if (trimmed.includes(' as ')) {
          trimmed = trimmed.split(' as ')[0] ?? trimmed;
        }
        return trimmed;
      })
      .filter((s) => s.length > 0);
  }

  /**
   * Track usage of imported symbols in the code
   */
  private trackSymbolUsage(
    imports: ParsedImport[],
    lines: string[],
    _fullText: string,
    _config: UnusedImportDetectionConfig,
  ): Map<string, SymbolUsage> {
    const usageMap = new Map<string, SymbolUsage>();

    // Skip imports section (first ~50 lines or until we hit non-import code)
    let importSectionEnd = 0;
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('import ') &&
        !trimmed.startsWith('export ') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('/*')
      ) {
        importSectionEnd = i;
        break;
      }
    }

    // Build usage map from imports
    for (const imp of imports) {
      if (imp.namedImports) {
        for (const name of imp.namedImports) {
          usageMap.set(name, {
            name,
            used: false,
            import: imp,
            isType: imp.isTypeOnly,
          });
        }
      }
      if (imp.defaultImport) {
        usageMap.set(imp.defaultImport, {
          name: imp.defaultImport,
          used: false,
          import: imp,
          isType: imp.isTypeOnly,
        });
      }
      if (imp.namespaceImport) {
        usageMap.set(imp.namespaceImport, {
          name: imp.namespaceImport,
          used: false,
          import: imp,
          isType: imp.isTypeOnly,
        });
      }
    }

    // Scan code for usage (excluding import section)
    const codeText = lines.slice(importSectionEnd).join('\n');

    // Build regex patterns for each symbol
    const pattern = this.buildUsagePattern(Array.from(usageMap.keys()));

    if (pattern) {
      const regex = new RegExp(pattern, 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(codeText)) !== null) {
        const matchedName = match[0];
        const usage = usageMap.get(matchedName);
        if (usage) {
          usage.used = true;
        }
      }
    }

    return usageMap;
  }

  /**
   * Build a regex pattern to match symbol usage
   */
  private buildUsagePattern(symbols: string[]): string {
    if (symbols.length === 0) {
      return '';
    }

    // Escape special regex characters and sort by length (longest first)
    const escaped = symbols
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);

    // Match as word boundaries (not part of other identifiers)
    return `\\b(?:${escaped.join('|')})\\b`;
  }

  /**
   * Find unused imports based on usage tracking
   */
  private findUnusedImports(
    usageMap: Map<string, SymbolUsage>,
    config: UnusedImportDetectionConfig,
  ): UnusedImport[] {
    const unused: UnusedImport[] = [];

    for (const usage of usageMap.values()) {
      if (usage.used) {
        continue;
      }

      // Skip type-only imports if configured
      if (config.ignoreTypeOnlyImports && usage.isType) {
        continue;
      }

      // Skip unused in type definitions if configured
      if (config.ignoreUnusedInTypes && usage.isType) {
        continue;
      }

      const imp = usage.import;

      // Create UnusedImport entry
      unused.push({
        name: usage.name,
        module: imp.modulePath,
        importType: imp.type,
        line: imp.lineNumber + 1,
        column: imp.startColumn,
        isTypeImport: imp.isTypeOnly,
        fullImportStatement: imp.fullText,
      });
    }

    return unused;
  }

  /**
   * Group unused imports by type
   */
  private groupByType(unusedImports: UnusedImport[]): UnusedImportDetectionResult['byType'] {
    return {
      named: unusedImports.filter((imp) => imp.importType === 'named').length,
      default: unusedImports.filter((imp) => imp.importType === 'default').length,
      namespace: unusedImports.filter((imp) => imp.importType === 'namespace').length,
      typeOnly: unusedImports.filter((imp) => imp.importType === 'type-only').length,
    };
  }

  /**
   * Generate suggestions for fixing unused imports
   */
  private generateSuggestions(
    unusedImports: UnusedImport[],
    config: UnusedImportDetectionConfig,
  ): string[] {
    const suggestions: string[] = [];

    if (unusedImports.length === 0) {
      return suggestions;
    }

    const total = unusedImports.length;
    suggestions.push(`Found ${total} unused import${total > 1 ? 's' : ''} in this file.`);

    if (config.autoFixOnSave) {
      suggestions.push('Imports will be automatically removed when you save the file.');
    } else {
      suggestions.push('Use the quick fix to remove unused imports.');
    }

    // Group by module for better suggestions
    const byModule = new Map<string, UnusedImport[]>();
    for (const imp of unusedImports) {
      let list = byModule.get(imp.module);
      if (!list) {
        list = [];
        byModule.set(imp.module, list);
      }
      list.push(imp);
    }

    if (byModule.size > 3) {
      suggestions.push('Consider reviewing if these imports are needed from multiple modules.');
    }

    return suggestions;
  }

  /**
   * Show diagnostics in the editor
   */
  private showDiagnostics(document: vscode.TextDocument, unusedImports: UnusedImport[]): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const imp of unusedImports) {
      const range = new vscode.Range(
        new vscode.Position(imp.line - 1, imp.column),
        new vscode.Position(imp.line - 1, imp.column + imp.name.length),
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `'${imp.name}' from '${imp.module}' is unused`,
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = 'Unused Imports';
      diagnostic.code = 'unused-import';

      // Provide quick fix
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          'Remove this import',
        ),
      ];

      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Get all imports in a line
   */
  private getAllImportsInLine(line: string): string[] {
    const matches = line.match(/import\s+.*?from\s+['"][^'"]+['"]/g);
    return matches ?? [];
  }

  /**
   * Remove a named import from an import line
   */
  private removeNamedImportFromLine(
    line: string,
    importName: string,
    _isTypeImport: boolean,
  ): string {
    // Match named imports block
    const namedMatch = line.match(/\{([^}]+)\}/);
    if (!namedMatch) {
      return line;
    }

    let namedBlock = namedMatch[1];
    const imports = this.parseNamedImports(namedBlock);

    // Remove the specified import
    const filtered = imports.filter((imp) => imp !== importName);

    if (filtered.length === 0) {
      // No imports left, this would be handled by removing the entire line
      return line;
    }

    // Rebuild the named imports block
    const newNamedBlock = `{ ${filtered.join(', ')} }`;
    return line.replace(/\{[^}]+\}/, newNamedBlock);
  }

  /**
   * Get default configuration
   */
  public getDefaultConfig(): UnusedImportDetectionConfig {
    return {
      enabled: true,
      detectOnSave: false,
      showDiagnostics: true,
      ignoreTypeOnlyImports: true,
      ignoreUnusedInTypes: false,
      includeDefaultImports: true,
      includeNamespaceImports: true,
      autoFixOnSave: false,
      excludePatterns: [],
    };
  }
}
