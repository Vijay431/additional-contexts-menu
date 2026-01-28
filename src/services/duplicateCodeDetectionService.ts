import * as crypto from 'crypto';
import * as vscode from 'vscode';

import { CodeBlock, DuplicateCodeDetectionResult, DuplicateGroup } from '../types/extension';
import { Logger } from '../utils/logger';
import { FileDiscoveryService } from './fileDiscoveryService';

/**
 * Duplicate Code Detection Service
 *
 * Scans codebase for similar code blocks using AST-like comparison.
 * Identifies copy-pasted code and suggests extraction to shared functions or components.
 */
export class DuplicateCodeDetectionService {
  private static instance: DuplicateCodeDetectionService | undefined;
  private logger: Logger;
  private fileDiscoveryService: FileDiscoveryService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.fileDiscoveryService = FileDiscoveryService.getInstance();
  }

  public static getInstance(): DuplicateCodeDetectionService {
    DuplicateCodeDetectionService.instance ??= new DuplicateCodeDetectionService();
    return DuplicateCodeDetectionService.instance;
  }

  /**
   * Detect duplicate code across workspace files
   */
  public async detectDuplicates(config?: {
    minBlockLines?: number;
    minSimilarity?: number;
    ignoreComments?: boolean;
    ignoreWhitespace?: boolean;
    maxFileCount?: number;
  }): Promise<DuplicateCodeDetectionResult> {
    const startTime = Date.now();
    const minBlockLines = config?.minBlockLines ?? 5;
    const minSimilarity = config?.minSimilarity ?? 0.85;
    const ignoreComments = config?.ignoreComments ?? true;
    const ignoreWhitespace = config?.ignoreWhitespace ?? true;
    const maxFileCount = config?.maxFileCount ?? 50;

    try {
      // Get all compatible files in workspace
      const files = await this.getCompatibleFiles(maxFileCount);

      if (files.length === 0) {
        return {
          file: '',
          duplicateGroups: [],
          totalDuplicates: 0,
          totalDuplicateLines: 0,
          potentialSavings: 0,
          analysisDuration: Date.now() - startTime,
        };
      }

      this.logger.info(`Analyzing ${files.length} files for duplicates`);

      // Extract all code blocks from files
      const allBlocks: CodeBlock[] = [];
      for (const file of files) {
        const blocks = await this.extractCodeBlocks(file, ignoreComments, ignoreWhitespace);
        allBlocks.push(...blocks);
      }

      this.logger.debug(`Extracted ${allBlocks.length} code blocks`);

      // Filter blocks by minimum line count
      const filteredBlocks = allBlocks.filter(
        (block) => block.endLine - block.startLine + 1 >= minBlockLines,
      );

      // Group similar blocks by hash
      const groupedBlocks = this.groupSimilarBlocks(filteredBlocks, minSimilarity);

      // Convert to duplicate groups
      const duplicateGroups: DuplicateGroup[] = [];
      let totalDuplicateLines = 0;

      for (const [hash, blocks] of Object.entries(groupedBlocks)) {
        if (blocks.length > 1) {
          const group = this.createDuplicateGroup(hash, blocks, minSimilarity);
          if (group) {
            duplicateGroups.push(group);
            totalDuplicateLines += group.linesOfCode * (group.occurrenceCount - 1);
          }
        }
      }

      // Sort by occurrence count (most duplicates first)
      duplicateGroups.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

      const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.occurrenceCount - 1, 0);
      const potentialSavings = this.calculatePotentialSavings(duplicateGroups);

      const analysisDuration = Date.now() - startTime;

      this.logger.info(`Duplicate detection completed in ${analysisDuration}ms`, {
        filesAnalyzed: files.length,
        duplicateGroups: duplicateGroups.length,
        totalDuplicates,
        potentialSavings,
      });

      return {
        file: files[0] ?? '',
        duplicateGroups,
        totalDuplicates,
        totalDuplicateLines,
        potentialSavings,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error detecting duplicates', error);
      return {
        file: '',
        duplicateGroups: [],
        totalDuplicates: 0,
        totalDuplicateLines: 0,
        potentialSavings: 0,
        analysisDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get compatible files from workspace
   */
  private async getCompatibleFiles(maxFileCount: number): Promise<string[]> {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
    const files: string[] = [];

    if (!vscode.workspace.workspaceFolders) {
      return files;
    }

    for (const folder of vscode.workspace.workspaceFolders) {
      const pattern = new vscode.RelativePattern(folder, `**/*{${extensions.join(',')}}`);
      const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', maxFileCount);

      for (const uri of uris) {
        files.push(uri.fsPath);
      }

      if (files.length >= maxFileCount) {
        break;
      }
    }

    return files.slice(0, maxFileCount);
  }

  /**
   * Extract code blocks from a file
   */
  private async extractCodeBlocks(
    filePath: string,
    ignoreComments: boolean,
    ignoreWhitespace: boolean,
  ): Promise<CodeBlock[]> {
    const blocks: CodeBlock[] = [];

    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const lines = text.split('\n');

      // Extract functions and code blocks
      const extractedBlocks = this.extractFunctionsFromText(
        filePath,
        text,
        lines,
        ignoreComments,
        ignoreWhitespace,
      );

      // Extract code blocks within functions (loops, conditionals, etc.)
      const subBlocks = this.extractSubBlocks(
        filePath,
        text,
        lines,
        ignoreComments,
        ignoreWhitespace,
      );

      blocks.push(...extractedBlocks, ...subBlocks);
    } catch (error) {
      this.logger.warn(`Failed to extract blocks from ${filePath}`, error);
    }

    return blocks;
  }

  /**
   * Extract function definitions from text
   */
  private extractFunctionsFromText(
    file: string,
    text: string,
    lines: string[],
    ignoreComments: boolean,
    ignoreWhitespace: boolean,
  ): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const functionStarts: Array<{ name: string; line: number; braceCount: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        continue;
      }

      // Look for function definitions
      const funcMatch =
        /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(|export\s+(?:const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\()/g.exec(
          line,
        );

      if (funcMatch) {
        const funcName = funcMatch[1] || funcMatch[2] || funcMatch[3] || 'anonymous';
        functionStarts.push({ name: funcName, line: i, braceCount: this.countBraces(line) });
        continue;
      }

      // Track braces to find function ends
      if (functionStarts.length > 0) {
        const currentFunc = functionStarts[functionStarts.length - 1];
        currentFunc.braceCount += this.countBraces(line);

        if (currentFunc.braceCount === 0 && i > currentFunc.line) {
          const blockText = lines.slice(currentFunc.line, i + 1).join('\n');
          const normalizedText = this.normalizeCode(blockText, ignoreComments, ignoreWhitespace);
          const hash = this.generateHash(normalizedText);

          blocks.push({
            file,
            startLine: currentFunc.line + 1,
            endLine: i + 1,
            startColumn: 0,
            endColumn: lines[i]?.length ?? 0,
            text: blockText,
            normalizedText,
            hash,
          });

          functionStarts.pop();
        }
      }
    }

    return blocks;
  }

  /**
   * Extract sub-blocks (loops, conditionals, etc.) from functions
   */
  private extractSubBlocks(
    file: string,
    _text: string,
    lines: string[],
    ignoreComments: boolean,
    ignoreWhitespace: boolean,
  ): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Skip comments
      if (this.isCommentLine(trimmed)) {
        continue;
      }

      // Look for blocks (if, for, while, switch, try, catch)
      const blockStartPatterns = [
        /\bif\s*\(/g,
        /\bfor\s*\(/g,
        /\bwhile\s*\(/g,
        /\bswitch\s*\(/g,
        /\btry\s*{/g,
        /\bcatch\s*\(/g,
        /\bdo\s*{/g,
      ];

      let isBlockStart = false;
      for (const pattern of blockStartPatterns) {
        if (pattern.test(line)) {
          isBlockStart = true;
          break;
        }
      }

      if (isBlockStart) {
        // Find the end of this block
        let braceCount = this.countBraces(line);
        let endLine = i;

        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j] ?? '';
          braceCount += this.countBraces(nextLine);

          if (braceCount === 0) {
            endLine = j;
            break;
          }
        }

        // Only add if block spans multiple lines
        if (endLine > i + 2) {
          const blockText = lines.slice(i, endLine + 1).join('\n');
          const normalizedText = this.normalizeCode(blockText, ignoreComments, ignoreWhitespace);
          const hash = this.generateHash(normalizedText);

          blocks.push({
            file,
            startLine: i + 1,
            endLine: endLine + 1,
            startColumn: 0,
            endColumn: lines[endLine]?.length ?? 0,
            text: blockText,
            normalizedText,
            hash,
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Check if a line is a comment
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('<!--')
    );
  }

  /**
   * Count brace balance in a line
   */
  private countBraces(line: string): number {
    let count = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i] ?? '';

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || line[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '{') count++;
        else if (char === '}') count--;
      }
    }

    return count;
  }

  /**
   * Normalize code for comparison
   */
  private normalizeCode(code: string, ignoreComments: boolean, ignoreWhitespace: boolean): string {
    let normalized = code;

    // Remove comments
    if (ignoreComments) {
      // Remove single-line comments
      normalized = normalized.replace(/\/\/.*$/gm, '');
      // Remove multi-line comments
      normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove HTML comments
      normalized = normalized.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Normalize whitespace
    if (ignoreWhitespace) {
      // Remove leading/trailing whitespace from each line
      normalized = normalized.replace(/^\s+/gm, '');
      // Remove trailing whitespace from each line
      normalized = normalized.replace(/\s+$/gm, '');
      // Remove empty lines
      normalized = normalized.replace(/^\s*[\r\n]/gm, '');
      // Normalize internal whitespace to single space
      normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
  }

  /**
   * Generate hash for code block
   */
  private generateHash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);
  }

  /**
   * Group similar blocks by hash
   */
  private groupSimilarBlocks(
    blocks: CodeBlock[],
    minSimilarity: number,
  ): Record<string, CodeBlock[]> {
    const grouped: Record<string, CodeBlock[]> = {};

    for (const block of blocks) {
      // Try to find an existing group with similar code
      let matched = false;

      for (const [hash, existingBlocks] of Object.entries(grouped)) {
        const similarity = this.calculateSimilarity(
          block.normalizedText,
          existingBlocks[0]?.normalizedText ?? '',
        );
        if (similarity >= minSimilarity) {
          grouped[hash]!.push(block);
          matched = true;
          break;
        }
      }

      if (!matched) {
        grouped[block.hash] = [block];
      }
    }

    return grouped;
  }

  /**
   * Calculate similarity between two code blocks using Jaccard similarity
   */
  private calculateSimilarity(code1: string, code2: string): number {
    if (code1 === code2) return 1.0;

    // Split into tokens
    const tokens1 = new Set(code1.split(/\s+/));
    const tokens2 = new Set(code2.split(/\s+/));

    if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

    // Calculate Jaccard similarity
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Create a duplicate group from similar blocks
   */
  private createDuplicateGroup(
    id: string,
    blocks: CodeBlock[],
    minSimilarity: number,
  ): DuplicateGroup | null {
    if (blocks.length < 2) return null;

    // Calculate average similarity
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const similarity = this.calculateSimilarity(
          blocks[i]?.normalizedText ?? '',
          blocks[j]?.normalizedText ?? '',
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1.0;

    if (avgSimilarity < minSimilarity) return null;

    // Count lines of code
    const linesOfCode =
      blocks[0]?.endLine !== undefined && blocks[0]?.startLine !== undefined
        ? blocks[0].endLine - blocks[0].startLine + 1
        : 0;

    // Generate suggestions
    const suggestions = this.generateSuggestions(blocks, linesOfCode);

    return {
      id,
      blocks,
      similarity: Math.round(avgSimilarity * 100) / 100,
      linesOfCode,
      occurrenceCount: blocks.length,
      suggestions,
    };
  }

  /**
   * Generate refactoring suggestions for duplicate code
   */
  private generateSuggestions(blocks: CodeBlock[], linesOfCode: number): string[] {
    const suggestions: string[] = [];

    if (linesOfCode < 10) {
      suggestions.push(`Extract the duplicate logic into a shared utility function`);
    } else if (linesOfCode < 30) {
      suggestions.push(`Extract the duplicate logic into a reusable function or component`);
    } else {
      suggestions.push(`Extract the duplicate logic into a separate module/component`);
    }

    // Find common patterns
    const commonLocations = new Set<string>();
    for (const block of blocks) {
      const location = block.file.split('/').at(-2) ?? block.file;
      commonLocations.add(location);
    }

    if (commonLocations.size === 1) {
      suggestions.push(
        `All duplicates are in '${Array.from(commonLocations)[0]}' - consider local extraction`,
      );
    } else {
      suggestions.push(
        `Duplicates span ${commonLocations.size} locations - use a shared utility module`,
      );
    }

    // Suggest naming
    const firstBlock = blocks[0];
    if (firstBlock) {
      const funcMatch =
        /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/.exec(
          firstBlock.text,
        );
      if (funcMatch) {
        const funcName = funcMatch[1] || funcMatch[2];
        if (funcName) {
          suggestions.push(`Consider naming the shared function similar to '${funcName}'`);
        }
      }
    }

    return suggestions;
  }

  /**
   * Calculate potential code savings
   */
  private calculatePotentialSavings(groups: DuplicateGroup[]): number {
    let savings = 0;

    for (const group of groups) {
      // Each duplicate after the first represents potential savings
      savings += group.linesOfCode * (group.occurrenceCount - 1);
    }

    return savings;
  }

  /**
   * Display duplicate detection results in output channel
   */
  public displayResults(result: DuplicateCodeDetectionResult): void {
    const outputChannel = vscode.window.createOutputChannel('Duplicate Code Detection');
    outputChannel.clear();

    // Header
    outputChannel.appendLine('Duplicate Code Detection Results');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine(`Analysis completed in ${result.analysisDuration}ms`);
    outputChannel.appendLine(
      `Files analyzed: ${result.duplicateGroups.length > 0 ? new Set(result.duplicateGroups.flatMap((g) => g.blocks.map((b) => b.file))).size : 0}`,
    );
    outputChannel.appendLine('');

    // Summary
    outputChannel.appendLine('Summary:');
    outputChannel.appendLine(`  Duplicate Groups Found: ${result.duplicateGroups.length}`);
    outputChannel.appendLine(`  Total Duplicate Instances: ${result.totalDuplicates}`);
    outputChannel.appendLine(`  Total Duplicate Lines: ${result.totalDuplicateLines}`);
    outputChannel.appendLine(`  Potential Code Savings: ${result.potentialSavings} lines`);
    outputChannel.appendLine('');

    // Duplicate groups
    if (result.duplicateGroups.length > 0) {
      outputChannel.appendLine('Duplicate Code Groups:');
      outputChannel.appendLine('-'.repeat(60));

      for (let i = 0; i < Math.min(result.duplicateGroups.length, 20); i++) {
        const group = result.duplicateGroups[i];
        if (!group) continue;

        outputChannel.appendLine('');
        outputChannel.appendLine(
          `${i + 1}. ${group.linesOfCode} lines duplicated ${group.occurrenceCount} times (${Math.round(group.similarity * 100)}% similar)`,
        );
        outputChannel.appendLine(`   Hash: ${group.id}`);

        // Show file locations
        const locations = group.blocks.map((b) => {
          const fileName = b.file.split('/').at(-1) ?? b.file;
          return `${fileName}:${b.startLine}`;
        });
        outputChannel.appendLine(`   Locations: ${locations.join(', ')}`);

        // Show suggestions
        if (group.suggestions.length > 0) {
          outputChannel.appendLine(`   Suggestions:`);
          for (const suggestion of group.suggestions) {
            outputChannel.appendLine(`     • ${suggestion}`);
          }
        }
      }

      if (result.duplicateGroups.length > 20) {
        outputChannel.appendLine('');
        outputChannel.appendLine(
          `... and ${result.duplicateGroups.length - 20} more duplicate groups`,
        );
      }
    } else {
      outputChannel.appendLine('No duplicate code found!');
      outputChannel.appendLine('Your codebase looks clean.');
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(60));

    outputChannel.show();
  }

  /**
   * Navigate to a specific duplicate block
   */
  public async navigateToBlock(block: CodeBlock): Promise<void> {
    const uri = vscode.Uri.file(block.file);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(block.startLine - 1, block.startColumn);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(
        new vscode.Position(block.startLine - 1, 0),
        new vscode.Position(block.endLine - 1, 0),
      ),
      vscode.TextEditorRevealType.InCenter,
    );
  }
}
