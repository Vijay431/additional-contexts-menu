import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

/**
 * Represents a parsed import statement with metadata
 */
interface ParsedImport {
  fullText: string;
  type: 'default' | 'named' | 'namespace' | 'side-effect' | 'type-only';
  category: 'external' | 'internal' | 'relative' | 'type' | 'unknown';
  modulePath: string;
  namedImports?: string[];
  commentBefore?: string;
  commentAfter?: string;
  lineNumber: number;
}

/**
 * Configuration for import sorting behavior
 */
export interface ImportSortingConfig {
  enabled: boolean;
  groupOrder: ('external' | 'internal' | 'relative' | 'type')[];
  sortAlphabetically: boolean;
  groupSeparators: boolean;
  separateTypeImports: boolean;
  newlinesBetweenGroups: number;
}

/**
 * Service for automatically sorting and organizing import statements
 * according to configurable rules.
 */
export class ImportSortingService {
  private static instance: ImportSortingService | undefined;
  private logger: Logger;

  // Regex patterns for different import styles
  private readonly patterns = {
    // Type-only imports: import type { X } from 'module'
    typeOnly: /^import\s+type\s+(?:(\*)|(\{[^}]+\})|(\w+))\s+from\s+(['"][^'"]+['"])/,

    // Namespace imports: import * as name from 'module'
    namespace: /^import\s+\*\s+as\s+(\w+)\s+from\s+(['"][^'"]+['"])/,

    // Default imports: import name from 'module'
    default: /^import\s+(\w+)\s+from\s+(['"][^'"]+['"])/,

    // Named imports: import { name1, name2 } from 'module'
    named: /^import\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])/,

    // Side-effect imports: import 'module'
    sideEffect: /^import\s+(['"][^'"]+['"])/,

    // Mixed default + named: import name, { named } from 'module'
    mixed: /^import\s+(\w+),\s*\{([^}]+)\}\s+from\s+(['"][^'"]+['"])/,
  };

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ImportSortingService {
    ImportSortingService.instance ??= new ImportSortingService();
    return ImportSortingService.instance;
  }

  /**
   * Sort and organize imports in the given document
   */
  public async sortImports(
    document: vscode.TextDocument,
    config: ImportSortingConfig,
  ): Promise<void> {
    try {
      const text = document.getText();
      const lines = text.split('\n');

      // Find all import lines
      const imports = this.parseImports(lines);

      if (imports.length === 0) {
        this.logger.debug('No imports found to sort');
        return;
      }

      // Sort and group imports
      const sortedImports = this.sortImportsByConfig(imports, config);

      // Generate the new import text
      const newImportText = this.generateImportText(sortedImports, config, lines);

      // Get the range to replace (from first to last import line)
      const firstImport = imports[0] as ParsedImport;
      const lastImport = imports[imports.length - 1] as ParsedImport;

      const startPos = new vscode.Position(firstImport.lineNumber, 0);
      const endPos = new vscode.Position(
        lastImport.lineNumber,
        lines[lastImport.lineNumber]?.length ?? 0,
      );

      const range = new vscode.Range(startPos, endPos);

      // Apply the edit
      const editor = await vscode.window.showTextDocument(document);
      await editor.edit((editBuilder) => {
        editBuilder.replace(range, newImportText);
      });

      this.logger.info(`Sorted ${imports.length} import(s)`);
    } catch (error) {
      this.logger.error('Error sorting imports', error);
      throw error;
    }
  }

  /**
   * Parse all import statements from the given lines
   */
  private parseImports(lines: string[]): ParsedImport[] {
    const imports: ParsedImport[] = [];
    let commentBuffer: string[] = [];
    let inImportSection = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Stop processing when we hit code after imports
      if (
        inImportSection &&
        trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('import ') &&
        !trimmed.startsWith('export ')
      ) {
        break;
      }

      // Collect comments before imports
      if (trimmed.startsWith('//')) {
        commentBuffer.push(line);
        continue;
      }

      // Check if this is an import statement
      if (trimmed.startsWith('import ')) {
        const parsed = this.parseImportLine(trimmed, i, commentBuffer);
        if (parsed) {
          imports.push(parsed);
          commentBuffer = [];
        }
      } else if (commentBuffer.length > 0 && trimmed.length === 0) {
        // Reset comment buffer if we hit an empty line
        commentBuffer = [];
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
    comments: string[],
  ): ParsedImport | null {
    let match: RegExpExecArray | null;
    let type: ParsedImport['type'];
    let modulePath = '';
    let namedImports: string[] | undefined;

    // Try each pattern
    if ((match = this.patterns.typeOnly.exec(line))) {
      type = 'type-only';
      modulePath = match[4]?.replace(/['"]/g, '') ?? '';
      if (match[2]) {
        namedImports = this.parseNamedImports(match[2]);
      }
    } else if ((match = this.patterns.namespace.exec(line))) {
      type = 'namespace';
      modulePath = match[2]?.replace(/['"]/g, '') ?? '';
    } else if ((match = this.patterns.mixed.exec(line))) {
      type = 'named';
      modulePath = match[3]?.replace(/['"]/g, '') ?? '';
      namedImports = [match[1] ?? '', ...this.parseNamedImports(match[2])];
    } else if ((match = this.patterns.default.exec(line))) {
      type = 'default';
      modulePath = match[2]?.replace(/['"]/g, '') ?? '';
    } else if ((match = this.patterns.named.exec(line))) {
      type = 'named';
      modulePath = match[2]?.replace(/['"]/g, '') ?? '';
      namedImports = this.parseNamedImports(match[1]);
    } else if ((match = this.patterns.sideEffect.exec(line))) {
      type = 'side-effect';
      modulePath = match[1]?.replace(/['"]/g, '') ?? '';
    } else {
      return null;
    }

    return {
      fullText: line,
      type,
      category: this.categorizeImport(modulePath),
      modulePath,
      namedImports,
      commentBefore: comments.length > 0 ? comments.join('\n') + '\n' : undefined,
      lineNumber,
    };
  }

  /**
   * Parse named imports from { ... } block
   */
  private parseNamedImports(namedBlock: string): string[] {
    return namedBlock
      .split(',')
      .map((s) => {
        const trimmed = s.trim();
        // Handle 'import type { X }' - remove 'type' keyword
        if (trimmed.startsWith('type ')) {
          return trimmed.substring(5).trim();
        }
        return trimmed;
      })
      .filter((s) => s.length > 0);
  }

  /**
   * Categorize an import based on its module path
   */
  private categorizeImport(modulePath: string): ParsedImport['category'] {
    // Type imports
    if (modulePath.startsWith('type:')) {
      return 'type';
    }

    // Relative imports
    if (modulePath.startsWith('.') || modulePath.startsWith('~')) {
      return 'relative';
    }

    // Node.js built-ins
    const nodeBuiltins = [
      'fs',
      'path',
      'http',
      'https',
      'url',
      'querystring',
      'util',
      'events',
      'stream',
      'buffer',
      'crypto',
      'os',
      'child_process',
      'cluster',
      'net',
      'dgram',
      'dns',
      'tls',
      'zlib',
      'readline',
      'repl',
      'vm',
      'worker_threads',
      'assert',
      'async_hooks',
      'timers',
      'console',
    ];

    if (nodeBuiltins.includes(modulePath.split('/')[0] ?? '')) {
      return 'external';
    }

    // Check for scoped packages (@scope/package)
    const firstSegment = modulePath.split('/')[0];

    // Scoped package starting with @
    if (firstSegment?.startsWith('@')) {
      return 'external';
    }

    // External packages (no relative path and not built-in)
    if (!modulePath.startsWith('.') && !modulePath.startsWith('~')) {
      return 'external';
    }

    return 'internal';
  }

  /**
   * Sort imports according to the configuration
   */
  private sortImportsByConfig(
    imports: ParsedImport[],
    config: ImportSortingConfig,
  ): ParsedImport[] {
    const grouped = new Map<ParsedImport['category'], ParsedImport[]>();

    // Initialize groups
    for (const category of config.groupOrder) {
      grouped.set(category, []);
    }

    // Separate type imports if configured
    const typeImports = config.separateTypeImports
      ? imports.filter((imp) => imp.type === 'type-only')
      : [];

    const nonTypeImports = config.separateTypeImports
      ? imports.filter((imp) => imp.type !== 'type-only')
      : imports;

    // Group imports
    for (const imp of nonTypeImports) {
      // Use 'type' category for type-only imports if not separating
      const category =
        imp.type === 'type-only' && !config.separateTypeImports ? 'type' : imp.category;

      let group = grouped.get(category);
      if (!group) {
        group = [];
        grouped.set(category, group);
      }
      group.push(imp);
    }

    // Sort within each group
    const sorted: ParsedImport[] = [];

    for (const category of config.groupOrder) {
      const group = grouped.get(category);
      if (!group) continue;

      const sortedGroup = config.sortAlphabetically
        ? group.sort((a, b) => {
            // Sort by module path first
            const pathCompare = a.modulePath.localeCompare(b.modulePath);
            if (pathCompare !== 0) return pathCompare;

            // Then by named imports if available
            if (a.namedImports && b.namedImports) {
              return a.namedImports.join(', ').localeCompare(b.namedImports.join(', '));
            }

            return 0;
          })
        : group;

      sorted.push(...sortedGroup);
    }

    // Add type imports at the end if separating
    if (typeImports.length > 0) {
      const sortedTypeImports = config.sortAlphabetically
        ? typeImports.sort((a, b) => a.modulePath.localeCompare(b.modulePath))
        : typeImports;

      sorted.push(...sortedTypeImports);
    }

    return sorted;
  }

  /**
   * Generate the formatted import text
   */
  private generateImportText(
    imports: ParsedImport[],
    config: ImportSortingConfig,
    originalLines: string[],
  ): string {
    const lines: string[] = [];
    let previousCategory: ParsedImport['category'] | null = null;

    for (const imp of imports) {
      // Add separator newlines between groups
      if (
        config.groupSeparators &&
        previousCategory !== null &&
        imp.category !== previousCategory
      ) {
        for (let i = 0; i < config.newlinesBetweenGroups; i++) {
          lines.push('');
        }
      }

      // Add comment before import if present
      if (imp.commentBefore) {
        lines.push(imp.commentBefore.trimEnd());
      }

      // Format and add the import line
      lines.push(this.formatImport(imp));

      previousCategory = imp.category;
    }

    return lines.join('\n');
  }

  /**
   * Format a single import statement
   */
  private formatImport(imp: ParsedImport): string {
    let formatted = imp.fullText;

    // If we have named imports, ensure they're sorted alphabetically
    if (imp.namedImports && imp.namedImports.length > 0) {
      const sorted = [...imp.namedImports].sort();
      const namedBlock = `{ ${sorted.join(', ')} }`;
      formatted = formatted.replace(/\{[^}]+\}/, namedBlock);
    }

    return formatted;
  }

  /**
   * Get default configuration
   */
  public getDefaultConfig(): ImportSortingConfig {
    return {
      enabled: true,
      groupOrder: ['external', 'internal', 'relative', 'type'],
      sortAlphabetically: true,
      groupSeparators: true,
      separateTypeImports: false,
      newlinesBetweenGroups: 1,
    };
  }
}
