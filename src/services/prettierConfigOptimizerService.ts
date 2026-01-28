import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import type {
  ConfigSuggestion,
  FormattingPattern,
  PrettierConfigOptimizationResult,
  PrettierConfigPreview,
  StyleConsistencyReport,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for analyzing codebase formatting patterns and suggesting optimal Prettier configuration.
 * Provides preview of formatting changes and team style consistency reports.
 */
export class PrettierConfigOptimizerService {
  private static instance: PrettierConfigOptimizerService | undefined;
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;

  // Common Prettier config file names
  private readonly configFiles = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.yaml',
    '.prettierrc.yml',
    '.prettierrc.toml',
    'prettier.config.js',
    'prettier.config.cjs',
    '.prettierrc.js',
    '.prettierrc.cjs',
  ];

  // Default Prettier options
  private readonly defaultOptions = {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    quoteProps: 'as-needed',
    jsxSingleQuote: false,
    trailingComma: 'es5',
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'always',
    proseWrap: 'preserve',
    htmlWhitespaceSensitivity: 'css',
    endOfLine: 'lf',
    embeddedLanguageFormatting: 'auto',
    singleAttributePerLine: false,
  };

  // File extensions to analyze
  private readonly analyzableExtensions = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.vue',
    '.svelte',
    '.json',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.md',
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.outputChannel = vscode.window.createOutputChannel('Prettier Config Optimizer');
  }

  public static getInstance(): PrettierConfigOptimizerService {
    PrettierConfigOptimizerService.instance ??= new PrettierConfigOptimizerService();
    return PrettierConfigOptimizerService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing PrettierConfigOptimizerService');
  }

  /**
   * Analyze codebase and generate Prettier config optimization suggestions
   */
  public async analyzeCodebase(): Promise<PrettierConfigOptimizationResult> {
    const startTime = Date.now();

    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder found');
      }

      this.outputChannel.appendLine('Analyzing codebase formatting patterns...');
      this.outputChannel.show();

      // Find existing Prettier config
      const existingConfig = await this.findExistingConfig(workspaceRoot);

      // Scan files for formatting patterns
      const analyzableFiles = await this.findAnalyzableFiles(workspaceRoot);

      this.outputChannel.appendLine(`Found ${analyzableFiles.length} files to analyze`);

      // Detect patterns
      const detectedPatterns = await this.detectFormattingPatterns(analyzableFiles);

      // Generate consistency report
      const consistencyReport = this.generateConsistencyReport(
        detectedPatterns,
        analyzableFiles.length,
      );

      // Generate suggestions
      const suggestedConfig = this.generateConfigSuggestions(
        detectedPatterns,
        existingConfig,
      );

      // Create optimized config
      const optimizedConfig = this.createOptimizedConfig(
        existingConfig,
        suggestedConfig,
      );

      const analysisDuration = Date.now() - startTime;

      this.outputChannel.appendLine(`Analysis completed in ${analysisDuration}ms`);

      return {
        workspacePath: workspaceRoot,
        existingConfig,
        detectedPatterns,
        consistencyReport,
        suggestedConfig,
        optimizedConfig,
        analysisDuration,
        filesAnalyzed: analyzableFiles.length,
      };
    } catch (error) {
      this.logger.error('Error analyzing codebase', error);
      throw error;
    }
  }

  /**
   * Preview formatting changes for a specific file
   */
  public async previewFormattingChanges(
    filePath: string,
    config: Record<string, unknown>,
  ): Promise<PrettierConfigPreview> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      const originalContent = document.getText();

      // Try to use prettier if available
      let formattedContent = originalContent;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
        const prettier = require('prettier');

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        formattedContent = await prettier.format(originalContent, {
          filepath: filePath,
          ...config,
        });
      } catch {
        // Prettier not available, return original
        this.outputChannel.appendLine('Prettier not available, showing original content');
      }

      const diff = this.generateDiff(originalContent, formattedContent);

      return {
        filePath,
        originalContent,
        formattedContent,
        diff,
        hasChanges: originalContent !== formattedContent,
      };
    } catch (error) {
      this.logger.error('Error previewing formatting changes', error);
      throw error;
    }
  }

  /**
   * Display analysis results in output channel
   */
  public displayAnalysisResults(result: PrettierConfigOptimizationResult): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('Prettier Config Optimization Analysis');
    this.outputChannel.appendLine('═'.repeat(80));
    this.outputChannel.appendLine('');

    // Display existing config
    this.outputChannel.appendLine('Existing Configuration:');
    if (result.existingConfig) {
      this.outputChannel.appendLine(JSON.stringify(result.existingConfig, null, 2));
    } else {
      this.outputChannel.appendLine('  No existing configuration found');
    }
    this.outputChannel.appendLine('');

    // Display consistency report
    this.outputChannel.appendLine('Style Consistency Report:');
    this.outputChannel.appendLine(`  Overall Score: ${result.consistencyReport.overallScore.toFixed(1)}%`);
    this.outputChannel.appendLine(
      `  Total Files: ${result.consistencyReport.totalFiles}`,
    );
    this.outputChannel.appendLine(
      `  Consistent: ${result.consistencyReport.consistentFiles}`,
    );
    this.outputChannel.appendLine(
      `  Inconsistent: ${result.consistencyReport.inconsistentFiles}`,
    );
    this.outputChannel.appendLine('');

    // Display detected patterns
    this.outputChannel.appendLine('Detected Formatting Patterns:');
    for (const pattern of result.detectedPatterns) {
      this.outputChannel.appendLine(`  ${pattern.name}:`);
      this.outputChannel.appendLine(`    Description: ${pattern.description}`);
      this.outputChannel.appendLine(
        `    Consistency: ${(pattern.consistency * 100).toFixed(1)}%`,
      );
      this.outputChannel.appendLine(`    Recommendation: ${pattern.recommendation}`);
      this.outputChannel.appendLine('');
    }

    // Display suggested config
    this.outputChannel.appendLine('Suggested Configuration:');
    this.outputChannel.appendLine(JSON.stringify(result.optimizedConfig, null, 2));
    this.outputChannel.appendLine('');

    this.outputChannel.show();
  }

  /**
   * Show quick pick for applying suggested config
   */
  public async showConfigSuggestions(
    result: PrettierConfigOptimizationResult,
  ): Promise<void> {
    const items = result.suggestedConfig.map((suggestion) => ({
      label: suggestion.rule,
      description: `${suggestion.currentValue} → ${suggestion.suggestedValue}`,
      detail: suggestion.reason,
      suggestion,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a configuration suggestion to apply',
      canPickMany: false,
    });

    if (selected) {
      const apply = await vscode.window.showInformationMessage(
        `Apply suggested value for ${selected.label}?`,
        'Apply',
        'Cancel',
      );

      if (apply === 'Apply') {
        await this.applyConfigSuggestion(selected.suggestion);
      }
    }
  }

  private async findExistingConfig(
    workspaceRoot: string,
  ): Promise<Record<string, unknown> | null> {
    for (const configFile of this.configFiles) {
      const configPath = path.join(workspaceRoot, configFile);
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');

          // Try to parse JSON config
          if (
            configFile.endsWith('.json') ||
            configFile === '.prettierrc' ||
            configFile.endsWith('rc')
          ) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return JSON.parse(content);
          }

          // For JS configs, try to require them
          if (configFile.endsWith('.js') || configFile.endsWith('.cjs')) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return require(configPath);
          }
        } catch (error) {
          this.logger.error(`Error reading config file ${configFile}`, error);
        }
      }
    }

    // Check package.json
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.prettier) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return packageJson.prettier;
        }
      } catch {
        // Ignore
      }
    }

    return null;
  }

  private async findAnalyzableFiles(workspaceRoot: string): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');
    const maxFiles = config.get('prettierConfigOptimizer.maxFilesToScan', 100);
    const excludedDirs = config.get(
      'prettierConfigOptimizer.excludedDirectories',
      ['node_modules', 'dist', 'build', '.git', 'coverage'],
    );

    const files: string[] = [];

    // Use vscode.workspace.findFiles with appropriate patterns
    const pattern = `**/*{${this.analyzableExtensions.join(',')}}`;
    const excludePattern = `{${excludedDirs.map((d) => `${d}/**`).join(',')}}`;

    try {
      const uris = await vscode.workspace.findFiles(pattern, `**/${excludePattern}`);

      for (const uri of uris) {
        if (files.length >= maxFiles) {
          break;
        }
        files.push(uri.fsPath);
      }
    } catch (error) {
      this.logger.error('Error finding analyzable files', error);
    }

    return files;
  }

  private async detectFormattingPatterns(
    files: string[],
  ): Promise<FormattingPattern[]> {
    const patterns: FormattingPattern[] = [];

    // Analyze files for patterns
    let totalLines = 0;
    let filesWithSemicolons = 0;
    let filesWithSingleQuotes = 0;
    let filesWithDoubleQuotes = 0;
    let filesWithTrailingCommas = 0;
    let totalTabWidth = 0;
    let tabWidthCount = 0;
    let maxLineLength = 0;
    let lineLengths: number[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        totalLines += lines.length;

        // Detect semicolons
        if (this.detectSemicolons(content)) {
          filesWithSemicolons++;
        }

        // Detect quote style
        const quoteStyle = this.detectQuoteStyle(content);
        if (quoteStyle === 'single') {
          filesWithSingleQuotes++;
        } else if (quoteStyle === 'double') {
          filesWithDoubleQuotes++;
        }

        // Detect trailing commas
        if (this.detectTrailingCommas(content)) {
          filesWithTrailingCommas++;
        }

        // Detect tab width
        const detectedTabWidth = this.detectTabWidth(content);
        if (detectedTabWidth > 0) {
          totalTabWidth += detectedTabWidth;
          tabWidthCount++;
        }

        // Analyze line lengths
        for (const line of lines) {
          const length = line.trimEnd().length;
          if (length > maxLineLength) {
            maxLineLength = length;
          }
          lineLengths.push(length);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    const totalFiles = files.length;

    // Semicolons pattern
    patterns.push({
      name: 'semi',
      description: 'Use semicolons',
      currentValue: null,
      detectedValue: filesWithSemicolons / totalFiles > 0.5,
      consistency: filesWithSemicolons / totalFiles,
      recommendation:
        filesWithSemicolons / totalFiles > 0.5
          ? 'Enable semicolons based on codebase patterns'
          : 'Disable semicolons based on codebase patterns',
      priority: 'high',
    });

    // Quote style pattern
    const singleQuoteRatio = filesWithSingleQuotes / totalFiles;
    const doubleQuoteRatio = filesWithDoubleQuotes / totalFiles;
    const preferredQuote = singleQuoteRatio > doubleQuoteRatio ? 'single' : 'double';

    patterns.push({
      name: 'singleQuote',
      description: 'Use single quotes instead of double quotes',
      currentValue: null,
      detectedValue: preferredQuote === 'single',
      consistency: Math.max(singleQuoteRatio, doubleQuoteRatio),
      recommendation: `Use ${preferredQuote} quotes based on codebase patterns`,
      priority: 'high',
    });

    // Trailing commas pattern
    patterns.push({
      name: 'trailingComma',
      description: 'Add trailing commas where valid',
      currentValue: null,
      detectedValue: filesWithTrailingCommas / totalFiles > 0.5,
      consistency: filesWithTrailingCommas / totalFiles,
      recommendation:
        filesWithTrailingCommas / totalFiles > 0.5
          ? 'Enable trailing commas based on codebase patterns'
          : 'Disable trailing commas based on codebase patterns',
      priority: 'medium',
    });

    // Tab width pattern
    const avgTabWidth = tabWidthCount > 0 ? totalTabWidth / tabWidthCount : 2;
    patterns.push({
      name: 'tabWidth',
      description: 'Number of spaces per indentation level',
      currentValue: null,
      detectedValue: Math.round(avgTabWidth),
      consistency: tabWidthCount / totalFiles,
      recommendation: `Use tab width of ${Math.round(avgTabWidth)} based on codebase patterns`,
      priority: 'high',
    });

    // Print width pattern
    const p95LineLength = this.percentile(lineLengths, 95);
    const suggestedPrintWidth = Math.min(Math.ceil(p95LineLength / 10) * 10, 120);

    patterns.push({
      name: 'printWidth',
      description: 'Maximum line length',
      currentValue: null,
      detectedValue: suggestedPrintWidth,
      consistency: 0.8,
      recommendation: `Use print width of ${suggestedPrintWidth} to cover 95% of lines`,
      priority: 'medium',
    });

    return patterns;
  }

  private detectSemicolons(content: string): boolean {
    // Count statements that end with semicolons vs those that don't
    const statements = content.split(/;|\n/);
    let withSemicolon = 0;
    let withoutSemicolon = 0;

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      // Skip empty lines, comments, and control structures
      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        /^(if|else|for|while|switch|case|break|continue|return|throw|try|catch|finally)/.test(
          trimmed,
        )
      ) {
        continue;
      }

      // Check if it looks like a statement
      if (/[a-zA-Z0-9_)]\s*$/.test(trimmed)) {
        withoutSemicolon++;
      } else if (trimmed.endsWith(';')) {
        withSemicolon++;
      }
    }

    return withSemicolon > withoutSemicolon;
  }

  private detectQuoteStyle(content: string): 'single' | 'double' | 'mixed' {
    let singleCount = 0;
    let doubleCount = 0;

    // Count quotes in strings (simplified)
    const singleQuoteMatches = content.match(/'/g);
    const doubleQuoteMatches = content.match(/"/g);

    if (singleQuoteMatches) {
      singleCount = singleQuoteMatches.length;
    }
    if (doubleQuoteMatches) {
      doubleCount = doubleQuoteMatches.length;
    }

    if (singleCount > doubleCount * 1.5) {
      return 'single';
    } else if (doubleCount > singleCount * 1.5) {
      return 'double';
    }
    return 'mixed';
  }

  private detectTrailingCommas(content: string): boolean {
    // Look for trailing commas in objects and arrays
    const objectTrailingCommas = content.match(/,\s*[}\]]/g);
    return objectTrailingCommas !== null && objectTrailingCommas.length > 10;
  }

  private detectTabWidth(content: string): number {
    // Detect indentation by looking at leading whitespace
    const lines = content.split('\n');
    const indentationSizes: number[] = [];

    for (const line of lines) {
      const match = line.match(/^(\s+)/);
      if (match && match[1]) {
        const spaces = match[1].length;
        if (spaces > 0 && spaces < 10) {
          indentationSizes.push(spaces);
        }
      }
    }

    if (indentationSizes.length === 0) {
      return 0;
    }

    // Find the most common indentation size
    const counts = new Map<number, number>();
    for (const size of indentationSizes) {
      counts.set(size, (counts.get(size) ?? 0) + 1);
    }

    let maxSize = 2;
    let maxCount = 0;
    for (const [size, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxSize = size;
      }
    }

    return maxSize;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) {
      return 0;
    }
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private generateConsistencyReport(
    patterns: FormattingPattern[],
    totalFiles: number,
  ): StyleConsistencyReport {
    const avgConsistency =
      patterns.reduce((sum, p) => sum + p.consistency, 0) / patterns.length;

    const consistentFiles = Math.round(totalFiles * avgConsistency);
    const inconsistentFiles = totalFiles - consistentFiles;

    return {
      overallScore: avgConsistency * 100,
      totalFiles,
      consistentFiles,
      inconsistentFiles,
      patterns,
      fileBreakdown: [],
    };
  }

  private generateConfigSuggestions(
    patterns: FormattingPattern[],
    existingConfig: Record<string, unknown> | null,
  ): ConfigSuggestion[] {
    const suggestions: ConfigSuggestion[] = [];

    for (const pattern of patterns) {
      const currentValue = existingConfig?.[pattern.name] ?? null;
      const suggestedValue = pattern.detectedValue;

      if (currentValue !== suggestedValue && pattern.consistency > 0.6) {
        suggestions.push({
          rule: pattern.name,
          currentValue,
          suggestedValue,
          reason: pattern.recommendation,
          impact: pattern.priority,
          previewBefore: JSON.stringify({ [pattern.name]: currentValue }),
          previewAfter: JSON.stringify({ [pattern.name]: suggestedValue }),
        });
      }
    }

    return suggestions;
  }

  private createOptimizedConfig(
    existingConfig: Record<string, unknown> | null,
    suggestions: ConfigSuggestion[],
  ): Record<string, unknown> {
    const optimized: Record<string, unknown> = {
      ...this.defaultOptions,
      ...(existingConfig ?? {}),
    };

    for (const suggestion of suggestions) {
      optimized[suggestion.rule] = suggestion.suggestedValue;
    }

    return optimized;
  }

  private generateDiff(original: string, formatted: string): string {
    const originalLines = original.split('\n');
    const formattedLines = formatted.split('\n');
    const diff: string[] = [];

    const maxLines = Math.max(originalLines.length, formattedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] ?? '';
      const formattedLine = formattedLines[i] ?? '';

      if (originalLine !== formattedLine) {
        if (originalLine) {
          diff.push(`- ${originalLine}`);
        }
        if (formattedLine) {
          diff.push(`+ ${formattedLine}`);
        }
      }
    }

    return diff.join('\n');
  }

  private async applyConfigSuggestion(
    suggestion: ConfigSuggestion,
  ): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    // Find existing config file
    let configPath: string | null = null;
    for (const configFile of this.configFiles) {
      const path = workspaceRoot + '/' + configFile;
      if (fs.existsSync(path)) {
        configPath = path;
        break;
      }
    }

    // Create new config if none exists
    if (!configPath) {
      configPath = path.join(workspaceRoot, '.prettierrc.json');
    }

    try {
      let config: Record<string, unknown> = {};

      // Read existing config
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          config = JSON.parse(content);
        } catch {
          // Invalid JSON, start fresh
          config = {};
        }
      }

      // Apply suggestion
      config[suggestion.rule] = suggestion.suggestedValue;

      // Write config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      vscode.window.showInformationMessage(
        `Applied configuration: ${suggestion.rule} = ${JSON.stringify(suggestion.suggestedValue)}`,
      );
    } catch (error) {
      this.logger.error('Error applying config suggestion', error);
      throw error;
    }
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
