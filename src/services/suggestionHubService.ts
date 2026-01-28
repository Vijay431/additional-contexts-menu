import * as vscode from 'vscode';

import type {
  Suggestion,
  SuggestionCategory,
  SuggestionFixResult,
  SuggestionGroup,
  SuggestionHubConfig,
  SuggestionHubResult,
  SuggestionSeverity,
  SuggestionSourceType,
} from '../types/extension';
import { Logger } from '../utils/logger';
import { ComplexityAnalysisService } from './complexityAnalysisService';
import { ConfigurationService } from './configurationService';
import { DuplicateCodeDetectionService } from './duplicateCodeDetectionService';
import { ErrorPatternDetectionService } from './errorPatternDetectionService';
import { SecretDetectionService } from './secretDetectionService';
import { UnusedDependencyDetectionService } from './unusedDependencyDetectionService';
import { UnusedImportDetectionService } from './unusedImportDetectionService';

/**
 * Suggestion Hub Service
 *
 * Aggregates code improvement suggestions from all analysis tools.
 * Provides prioritized list of refactorings, quick-fixes, and optimizations
 * with one-click application.
 */
export class SuggestionHubService {
  private static instance: SuggestionHubService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;

  // Analysis services
  private secretDetectionService: SecretDetectionService;
  private unusedImportDetectionService: UnusedImportDetectionService;
  private unusedDependencyDetectionService: UnusedDependencyDetectionService;
  private complexityAnalysisService: ComplexityAnalysisService;
  private errorPatternDetectionService: ErrorPatternDetectionService;
  private duplicateCodeDetectionService: DuplicateCodeDetectionService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();

    // Initialize analysis services
    this.secretDetectionService = SecretDetectionService.getInstance();
    this.unusedImportDetectionService = UnusedImportDetectionService.getInstance();
    this.unusedDependencyDetectionService = UnusedDependencyDetectionService.getInstance();
    this.complexityAnalysisService = ComplexityAnalysisService.getInstance();
    this.errorPatternDetectionService = ErrorPatternDetectionService.getInstance();
    this.duplicateCodeDetectionService = DuplicateCodeDetectionService.getInstance();
  }

  public static getInstance(): SuggestionHubService {
    SuggestionHubService.instance ??= new SuggestionHubService();
    return SuggestionHubService.instance;
  }

  /**
   * Analyze a document and aggregate all suggestions
   */
  public async analyzeDocument(
    document: vscode.TextDocument,
    config?: Partial<SuggestionHubConfig>,
  ): Promise<SuggestionHubResult> {
    const startTime = Date.now();

    try {
      const fullConfig = this.getConfig(config);
      const suggestions: Suggestion[] = [];

      // Run all enabled analysis services
      if (this.isSourceEnabled('secret-detection', fullConfig)) {
        const secretSuggestions = await this.analyzeSecrets(document, fullConfig);
        suggestions.push(...secretSuggestions);
      }

      if (this.isSourceEnabled('unused-imports', fullConfig)) {
        const importSuggestions = await this.analyzeUnusedImports(document, fullConfig);
        suggestions.push(...importSuggestions);
      }

      if (this.isSourceEnabled('unused-dependencies', fullConfig)) {
        const depSuggestions = await this.analyzeUnusedDependencies(document, fullConfig);
        suggestions.push(...depSuggestions);
      }

      if (this.isSourceEnabled('complexity-analysis', fullConfig)) {
        const complexitySuggestions = await this.analyzeComplexity(document, fullConfig);
        suggestions.push(...complexitySuggestions);
      }

      if (this.isSourceEnabled('error-patterns', fullConfig)) {
        const errorSuggestions = await this.analyzeErrorPatterns(document, fullConfig);
        suggestions.push(...errorSuggestions);
      }

      if (this.isSourceEnabled('duplicate-code', fullConfig)) {
        const duplicateSuggestions = await this.analyzeDuplicateCode(document, fullConfig);
        suggestions.push(...duplicateSuggestions);
      }

      // Filter by severity and category
      const filteredSuggestions = this.filterSuggestions(suggestions, fullConfig);

      // Sort suggestions
      const sortedSuggestions = this.sortSuggestions(filteredSuggestions, fullConfig);

      // Limit suggestions per category
      const limitedSuggestions = this.limitSuggestions(sortedSuggestions, fullConfig);

      // Group suggestions if enabled
      const groups = fullConfig.groupByCategory ? this.groupSuggestions(limitedSuggestions) : [];

      // Calculate summary
      const summary = this.calculateSummary(limitedSuggestions);

      const analysisDuration = Date.now() - startTime;

      this.logger.info(
        `Suggestion Hub analysis completed: ${limitedSuggestions.length} suggestions found`,
        { file: document.fileName, duration: analysisDuration },
      );

      return {
        file: document.fileName,
        suggestions: limitedSuggestions,
        groups,
        summary,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error analyzing document for suggestions', error);
      return {
        file: document.fileName,
        suggestions: [],
        groups: [],
        summary: {
          total: 0,
          bySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
          },
          byCategory: {
            security: 0,
            'code-quality': 0,
            performance: 0,
            maintainability: 0,
            'best-practices': 0,
            'error-prevention': 0,
          },
          canAutoFix: 0,
        },
        analysisDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Apply a suggestion fix
   */
  public async applySuggestionFix(
    document: vscode.TextDocument,
    suggestion: Suggestion,
  ): Promise<SuggestionFixResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let fixedCount = 0;

    try {
      // Route to appropriate service based on source
      switch (suggestion.source) {
        case 'unused-imports':
          if (suggestion.canAutoFix && suggestion.fixCommand) {
            const unusedImports = [
              {
                name: suggestion.title.split("'")[1] || '',
                module: suggestion.description.split('from ')[1] || '',
                importType: 'named' as const,
                line: suggestion.line || 1,
                column: suggestion.column || 0,
                isTypeImport: false,
                fullImportStatement: suggestion.codeSnippet || '',
              },
            ];
            await this.unusedImportDetectionService.removeUnusedImports(document, unusedImports);
            fixedCount++;
          }
          break;

        default:
          errors.push(`Auto-fix not implemented for source: ${suggestion.source}`);
      }

      return {
        success: errors.length === 0,
        fixedCount,
        failedCount: errors.length,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error applying suggestion fix', error);
      return {
        success: false,
        fixedCount,
        failedCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Show suggestions in a QuickPick UI
   */
  public async showSuggestionsQuickPick(
    result: SuggestionHubResult,
  ): Promise<Suggestion | undefined> {
    if (result.suggestions.length === 0) {
      vscode.window.showInformationMessage('No suggestions found for this file.');
      return undefined;
    }

    const items: vscode.QuickPickItem & { suggestion: Suggestion }[] = result.suggestions.map(
      (suggestion) => ({
        label: this.formatSuggestionLabel(suggestion),
        description: suggestion.description,
        detail: `Priority: ${suggestion.priority} | ${suggestion.estimatedImpact}`,
        suggestion,
      }),
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${result.suggestions.length} suggestions - Select one to view details`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    return selected?.suggestion;
  }

  /**
   * Get default configuration
   */
  public getDefaultConfig(): SuggestionHubConfig {
    return {
      enabled: true,
      autoAnalyzeOnOpen: false,
      maxSuggestionsPerCategory: 10,
      severityFilter: ['critical', 'high', 'medium', 'low', 'info'],
      categoryFilter: [
        'security',
        'code-quality',
        'performance',
        'maintainability',
        'best-practices',
        'error-prevention',
      ],
      showQuickActions: true,
      groupByCategory: true,
      sortBy: 'priority',
      enableAutoFix: true,
    };
  }

  /**
   * Analyze secrets in document
   */
  private async analyzeSecrets(
    document: vscode.TextDocument,
    config: SuggestionHubConfig,
  ): Promise<Suggestion[]> {
    try {
      const extConfig = this.configService.getConfiguration();
      const result = await this.secretDetectionService.scanDocument(
        document,
        extConfig.secretDetection.excludedPatterns,
      );

      if (!result.hasSecrets) {
        return [];
      }

      return result.matches.map((match, index) => ({
        id: `secret-${Date.now()}-${index}`,
        title: `Secret detected: ${match.type}`,
        description: match.suggestion || 'Potential secret found in code',
        severity: this.mapSecretSeverity(match.severity),
        category: 'security' as SuggestionCategory,
        source: 'secret-detection' as SuggestionSourceType,
        file: document.fileName,
        line: match.line,
        column: match.column,
        canAutoFix: false,
        codeSnippet: match.matchedText,
        priority: this.calculatePriority('critical', 'security'),
        estimatedImpact: 'High security risk - should be removed immediately',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Analyze unused imports
   */
  private async analyzeUnusedImports(
    document: vscode.TextDocument,
    config: SuggestionHubConfig,
  ): Promise<Suggestion[]> {
    try {
      const extConfig = this.configService.getConfiguration();
      const result = await this.unusedImportDetectionService.detectUnusedImports(
        document,
        extConfig.unusedImportDetection,
      );

      if (result.totalUnused === 0) {
        return [];
      }

      return result.unusedImports.map((imp, index) => ({
        id: `unused-import-${Date.now()}-${index}`,
        title: `Unused import: '${imp.name}'`,
        description: `from '${imp.module}' is unused`,
        severity: 'low' as SuggestionSeverity,
        category: 'code-quality' as SuggestionCategory,
        source: 'unused-imports' as SuggestionSourceType,
        file: document.fileName,
        line: imp.line,
        column: imp.column,
        canAutoFix: true,
        fixCommand: 'remove-unused-import',
        codeSnippet: imp.fullImportStatement,
        priority: this.calculatePriority('low', 'code-quality'),
        estimatedImpact: 'Minor - reduces bundle size slightly',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Analyze unused dependencies
   */
  private async analyzeUnusedDependencies(
    document: vscode.TextDocument,
    config: SuggestionHubConfig,
  ): Promise<Suggestion[]> {
    try {
      const extConfig = this.configService.getConfiguration();
      const result = await this.unusedDependencyDetectionService.detectUnusedDependencies(
        document,
        extConfig.unusedDependencyDetection,
      );

      if (result.totalUnused === 0) {
        return [];
      }

      return result.unusedDependencies.map((dep, index) => ({
        id: `unused-dep-${Date.now()}-${index}`,
        title: `Unused dependency: '${dep.name}'`,
        description: `Package '${dep.name}@${dep.version}' is not used in the project`,
        severity: 'medium' as SuggestionSeverity,
        category: 'maintainability' as SuggestionCategory,
        source: 'unused-dependencies' as SuggestionSourceType,
        file: document.fileName,
        canAutoFix: false,
        priority: this.calculatePriority('medium', 'maintainability'),
        estimatedImpact: 'Medium - reduces install time and bundle size',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Analyze code complexity
   */
  private async analyzeComplexity(
    document: vscode.TextDocument,
    config: SuggestionHubConfig,
  ): Promise<Suggestion[]> {
    try {
      const extConfig = this.configService.getConfiguration();
      const result = await this.complexityAnalysisService.analyzeComplexity(
        document,
        extConfig.complexityAnalysis,
      );

      const suggestions: Suggestion[] = [];

      for (const func of result.functions) {
        const severity = this.getComplexitySeverity(func, result);

        if (severity !== 'info') {
          suggestions.push({
            id: `complexity-${Date.now()}-${func.name}`,
            title: `High complexity: ${func.name}()`,
            description: `Cyclomatic complexity: ${func.cyclomaticComplexity}, lines: ${func.linesOfCode}`,
            severity,
            category: 'maintainability' as SuggestionCategory,
            source: 'complexity-analysis' as SuggestionSourceType,
            file: document.fileName,
            line: func.startLine,
            canAutoFix: false,
            priority: this.calculatePriority(severity, 'maintainability'),
            estimatedImpact: this.getComplexityImpact(severity),
          });
        }
      }

      return suggestions;
    } catch {
      return [];
    }
  }

  /**
   * Analyze error patterns
   */
  private async analyzeErrorPatterns(
    document: vscode.TextDocument,
    config: SuggestionHubConfig,
  ): Promise<Suggestion[]> {
    try {
      const extConfig = this.configService.getConfiguration();
      const result = await this.errorPatternDetectionService.detectErrorPatterns(
        document,
        extConfig.errorPatternDetection,
      );

      return result.matches.map((match, index) => ({
        id: `error-pattern-${Date.now()}-${index}`,
        title: `Error pattern: ${match.type}`,
        description: match.description,
        severity: this.mapErrorSeverity(match.severity),
        category: 'error-prevention' as SuggestionCategory,
        source: 'error-patterns' as SuggestionSourceType,
        file: document.fileName,
        line: match.line,
        column: match.column,
        canAutoFix: false,
        codeSnippet: match.codeSnippet,
        priority: this.calculatePriority(this.mapErrorSeverity(match.severity), 'error-prevention'),
        estimatedImpact: match.suggestion,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Analyze duplicate code
   */
  private async analyzeDuplicateCode(
    document: vscode.TextDocument,
    config: SuggestionHubConfig,
  ): Promise<Suggestion[]> {
    try {
      const extConfig = this.configService.getConfiguration();
      const result = await this.duplicateCodeDetectionService.detectDuplicateCode(
        document,
        extConfig.duplicateCodeDetection,
      );

      const suggestions: Suggestion[] = [];

      for (const group of result.duplicateGroups) {
        suggestions.push({
          id: `duplicate-${Date.now()}-${group.id}`,
          title: `Duplicate code detected`,
          description: `${group.linesOfCode} lines duplicated ${group.occurrenceCount} times`,
          severity: 'medium' as SuggestionSeverity,
          category: 'maintainability' as SuggestionCategory,
          source: 'duplicate-code' as SuggestionSourceType,
          file: document.fileName,
          line: group.blocks[0]?.startLine,
          canAutoFix: false,
          priority: this.calculatePriority('medium', 'maintainability'),
          estimatedImpact: `Could save ~${group.potentialSavings} lines of code`,
        });
      }

      return suggestions;
    } catch {
      return [];
    }
  }

  /**
   * Filter suggestions by severity and category
   */
  private filterSuggestions(suggestions: Suggestion[], config: SuggestionHubConfig): Suggestion[] {
    return suggestions.filter((s) => {
      const severityMatch = config.severityFilter.includes(s.severity);
      const categoryMatch = config.categoryFilter.includes(s.category);
      return severityMatch && categoryMatch;
    });
  }

  /**
   * Sort suggestions based on configuration
   */
  private sortSuggestions(suggestions: Suggestion[], config: SuggestionHubConfig): Suggestion[] {
    const sorted = [...suggestions];

    switch (config.sortBy) {
      case 'severity':
        return sorted.sort((a, b) => {
          const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
          return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        });

      case 'category':
        return sorted.sort((a, b) => a.category.localeCompare(b.category));

      case 'file':
        return sorted.sort((a, b) => a.file.localeCompare(b.file));

      case 'priority':
        return sorted.sort((a, b) => b.priority - a.priority);

      default:
        return sorted;
    }
  }

  /**
   * Limit suggestions per category
   */
  private limitSuggestions(suggestions: Suggestion[], config: SuggestionHubConfig): Suggestion[] {
    const counts = new Map<SuggestionCategory, number>();
    const limited: Suggestion[] = [];

    for (const suggestion of suggestions) {
      const count = counts.get(suggestion.category) || 0;
      if (count < config.maxSuggestionsPerCategory) {
        limited.push(suggestion);
        counts.set(suggestion.category, count + 1);
      }
    }

    return limited;
  }

  /**
   * Group suggestions by category and severity
   */
  private groupSuggestions(suggestions: Suggestion[]): SuggestionGroup[] {
    const groupMap = new Map<string, SuggestionGroup>();

    for (const suggestion of suggestions) {
      const key = `${suggestion.category}-${suggestion.severity}`;

      let group = groupMap.get(key);
      if (!group) {
        group = {
          category: suggestion.category,
          severity: suggestion.severity,
          suggestions: [],
          count: 0,
        };
        groupMap.set(key, group);
      }

      group.suggestions.push(suggestion);
      group.count++;
    }

    return Array.from(groupMap.values());
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(suggestions: Suggestion[]) {
    const bySeverity: Record<SuggestionSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byCategory: Record<SuggestionCategory, number> = {
      security: 0,
      'code-quality': 0,
      performance: 0,
      maintainability: 0,
      'best-practices': 0,
      'error-prevention': 0,
    };

    let canAutoFix = 0;

    for (const suggestion of suggestions) {
      bySeverity[suggestion.severity]++;
      byCategory[suggestion.category]++;
      if (suggestion.canAutoFix) {
        canAutoFix++;
      }
    }

    return {
      total: suggestions.length,
      bySeverity,
      byCategory,
      canAutoFix,
    };
  }

  /**
   * Format suggestion label for QuickPick
   */
  private formatSuggestionLabel(suggestion: Suggestion): string {
    const icon = this.getSeverityIcon(suggestion.severity);
    return `${icon} ${suggestion.title}`;
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: SuggestionSeverity): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      case 'info':
        return '🔵';
    }
  }

  /**
   * Map secret severity to suggestion severity
   */
  private mapSecretSeverity(severity: 'error' | 'warning' | 'info'): SuggestionSeverity {
    switch (severity) {
      case 'error':
        return 'critical';
      case 'warning':
        return 'high';
      case 'info':
        return 'info';
    }
  }

  /**
   * Map error pattern severity to suggestion severity
   */
  private mapErrorSeverity(severity: 'error' | 'warning' | 'info'): SuggestionSeverity {
    switch (severity) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
    }
  }

  /**
   * Get complexity severity
   */
  private getComplexitySeverity(
    func: { cyclomaticComplexity: number; linesOfCode: number },
    result: { overallGrade: string },
  ): SuggestionSeverity {
    if (result.overallGrade === 'F' || func.cyclomaticComplexity > 20) {
      return 'critical';
    }
    if (result.overallGrade === 'D' || func.cyclomaticComplexity > 15) {
      return 'high';
    }
    if (result.overallGrade === 'C' || func.cyclomaticComplexity > 10) {
      return 'medium';
    }
    if (result.overallGrade === 'B') {
      return 'low';
    }
    return 'info';
  }

  /**
   * Get complexity impact description
   */
  private getComplexityImpact(severity: SuggestionSeverity): string {
    switch (severity) {
      case 'critical':
        return 'High - function is very hard to understand and maintain';
      case 'high':
        return 'High - function is difficult to test and debug';
      case 'medium':
        return 'Medium - consider refactoring for better readability';
      case 'low':
        return 'Low - minor complexity issue';
      case 'info':
        return 'Informational - complexity is within acceptable range';
    }
  }

  /**
   * Calculate priority score
   */
  private calculatePriority(severity: SuggestionSeverity, category: SuggestionCategory): number {
    const severityScore = {
      critical: 100,
      high: 80,
      medium: 60,
      low: 40,
      info: 20,
    };

    const categoryBonus = {
      security: 20,
      'error-prevention': 15,
      performance: 10,
      'code-quality': 5,
      maintainability: 0,
      'best-practices': 0,
    };

    return severityScore[severity] + categoryBonus[category];
  }

  /**
   * Check if a source is enabled
   */
  private isSourceEnabled(source: SuggestionSourceType, config: SuggestionHubConfig): boolean {
    // All sources are enabled by default when Suggestion Hub is enabled
    return config.enabled;
  }

  /**
   * Get configuration with defaults
   */
  private getConfig(config?: Partial<SuggestionHubConfig>): SuggestionHubConfig {
    return {
      ...this.getDefaultConfig(),
      ...config,
    };
  }
}
