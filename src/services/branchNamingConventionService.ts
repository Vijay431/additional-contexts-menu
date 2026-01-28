import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

/**
 * Branch prefix pattern definition
 */
export interface BranchPattern {
  prefix: string;
  description: string;
  regex: RegExp;
  examples: string[];
}

/**
 * Validation result for a branch name
 */
export interface BranchValidationResult {
  isValid: boolean;
  branchName: string;
  matchedPattern?: string;
  message: string;
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
}

/**
 * Configuration for branch naming conventions
 */
export interface BranchNamingConfig {
  enabled: boolean;
  validateOnCheckout: boolean;
  validateOnCreate: boolean;
  enabledPatterns: string[];
  severity: 'error' | 'warning' | 'info';
  excludedBranches: string[];
  customPatterns: Record<string, string>;
  allowIssueNumbers: boolean;
  issueNumberPattern: string;
  maxLength: number;
  minLength: number;
  suggestBranchNames: boolean;
}

/**
 * Branch Naming Convention Service
 *
 * Validates branch names against configurable conventions (feature/, bugfix/, hotfix/, etc.).
 * Provides branch creation with proper naming and issue tracker integration.
 */
export class BranchNamingConventionService {
  private static instance: BranchNamingConventionService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  // Default branch patterns
  private readonly defaultPatterns: Record<string, BranchPattern> = {
    feature: {
      prefix: 'feature',
      description: 'New features and functionality',
      regex: /^feature\/[a-z0-9-]+$/,
      examples: [
        'feature/user-authentication',
        'feature/add-dashboard',
        'feature/payment-integration',
      ],
    },
    bugfix: {
      prefix: 'bugfix',
      description: 'Bug fixes for existing functionality',
      regex: /^bugfix\/[a-z0-9-]+$/,
      examples: ['bugfix/login-error', 'bugfix/memory-leak', 'bugfix/display-issue'],
    },
    hotfix: {
      prefix: 'hotfix',
      description: 'Urgent production fixes',
      regex: /^hotfix\/[a-z0-9-]+$/,
      examples: ['hotfix/security-patch', 'hotfix/critical-bug', 'hotfix/data-corruption'],
    },
    release: {
      prefix: 'release',
      description: 'Release preparation',
      regex: /^release\/[a-z0-9.-]+$/,
      examples: ['release/v1.0.0', 'release/2.1.0', 'release/2024.01'],
    },
    fix: {
      prefix: 'fix',
      description: 'General fixes (alternative to bugfix)',
      regex: /^fix\/[a-z0-9-]+$/,
      examples: ['fix/typo-correction', 'fix/styling-issue', 'fix/formatting'],
    },
    chore: {
      prefix: 'chore',
      description: 'Maintenance tasks and refactoring',
      regex: /^chore\/[a-z0-9-]+$/,
      examples: ['chore/update-dependencies', 'chore/cleanup-code', 'chore/refactor'],
    },
    docs: {
      prefix: 'docs',
      description: 'Documentation changes',
      regex: /^docs\/[a-z0-9-]+$/,
      examples: ['docs/update-readme', 'docs/api-documentation', 'docs/guides'],
    },
    test: {
      prefix: 'test',
      description: 'Test additions and updates',
      regex: /^test\/[a-z0-9-]+$/,
      examples: ['test/add-unit-tests', 'test/e2e-tests', 'test/integration-tests'],
    },
    refactor: {
      prefix: 'refactor',
      description: 'Code refactoring without behavior change',
      regex: /^refactor\/[a-z0-9-]+$/,
      examples: [
        'refactor/optimize-function',
        'refactor/clean-architecture',
        'refactor/improve-performance',
      ],
    },
    style: {
      prefix: 'style',
      description: 'Code style changes (formatting, etc.)',
      regex: /^style\/[a-z0-9-]+$/,
      examples: ['style/code-formatting', 'style/linting-fixes', 'style/indentation'],
    },
    perf: {
      prefix: 'perf',
      description: 'Performance improvements',
      regex: /^perf\/[a-z0-9-]+$/,
      examples: ['perf/optimize-queries', 'perf/caching', 'perf/reduce-bundle-size'],
    },
    ci: {
      prefix: 'ci',
      description: 'CI/CD configuration changes',
      regex: /^ci\/[a-z0-9-]+$/,
      examples: ['ci/github-actions', 'ci/deployment-config', 'ci/build-optimization'],
    },
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('branchNamingConvention');
  }

  public static getInstance(): BranchNamingConventionService {
    BranchNamingConventionService.instance ??= new BranchNamingConventionService();
    return BranchNamingConventionService.instance;
  }

  /**
   * Validate a branch name against configured patterns
   */
  public validateBranchName(branchName: string): BranchValidationResult {
    const config = this.getConfig();

    // Check if branch is excluded
    if (config.excludedBranches.includes(branchName)) {
      return {
        isValid: true,
        branchName,
        message: 'Branch is excluded from validation',
        suggestions: [],
        severity: 'info',
      };
    }

    // Check length constraints
    if (branchName.length < config.minLength) {
      return {
        isValid: false,
        branchName,
        message: `Branch name is too short (minimum ${config.minLength} characters)`,
        suggestions: this.generateSuggestions(branchName, config),
        severity: config.severity,
      };
    }

    if (branchName.length > config.maxLength) {
      return {
        isValid: false,
        branchName,
        message: `Branch name is too long (maximum ${config.maxLength} characters)`,
        suggestions: this.generateSuggestions(branchName, config),
        severity: config.severity,
      };
    }

    // Get all patterns (default + custom)
    const allPatterns = this.getAllPatterns(config);

    // Check against each enabled pattern
    for (const patternKey of config.enabledPatterns) {
      const pattern = allPatterns[patternKey];
      if (!pattern) {
        continue;
      }

      if (pattern.regex.test(branchName)) {
        return {
          isValid: true,
          branchName,
          matchedPattern: patternKey,
          message: `Branch follows '${patternKey}' pattern: ${pattern.description}`,
          suggestions: [],
          severity: 'info',
        };
      }
    }

    // No pattern matched
    return {
      isValid: false,
      branchName,
      message: `Branch name does not follow any configured naming convention. Expected patterns: ${config.enabledPatterns.join(', ')}`,
      suggestions: this.generateSuggestions(branchName, config),
      severity: config.severity,
    };
  }

  /**
   * Get suggestions for a branch name
   */
  public generateSuggestions(branchName: string, config: BranchNamingConfig): string[] {
    if (!config.suggestBranchNames) {
      return [];
    }

    const suggestions: string[] = [];
    const allPatterns = this.getAllPatterns(config);

    // Extract potential meaningful name from branch
    const meaningfulPart = this.extractMeaningfulName(branchName);

    // Generate suggestions for each enabled pattern
    for (const patternKey of config.enabledPatterns) {
      const pattern = allPatterns[patternKey];
      if (!pattern) {
        continue;
      }

      const suggestedBranch = `${pattern.prefix}/${meaningfulPart}`;
      if (suggestedBranch !== branchName && meaningfulPart.length > 0) {
        suggestions.push(suggestedBranch);
      }
    }

    return suggestions;
  }

  /**
   * Show branch naming rules in a QuickPick
   */
  public async showBranchNamingRules(): Promise<void> {
    const config = this.getConfig();
    const allPatterns = this.getAllPatterns(config);

    const items = Object.entries(allPatterns)
      .filter(([key]) => config.enabledPatterns.includes(key))
      .map(([key, pattern]) => ({
        label: pattern.prefix + '/',
        description: pattern.description,
        detail: `Examples: ${pattern.examples.slice(0, 2).join(', ')}`,
      }));

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Branch Naming Conventions',
      title: 'Available Branch Patterns',
    });

    if (selection) {
      // Copy the pattern to clipboard
      await vscode.env.clipboard.writeText(selection.label);
      vscode.window.showInformationMessage(
        `Branch pattern '${selection.label}' copied to clipboard`,
      );
    }
  }

  /**
   * Suggest a branch name based on user input
   */
  public async suggestBranchName(): Promise<void> {
    const config = this.getConfig();
    const allPatterns = this.getAllPatterns(config);

    // Get branch type from user
    const patternItems = config.enabledPatterns
      .filter((key) => allPatterns[key])
      .map((key) => ({
        label: allPatterns[key].prefix,
        description: allPatterns[key].description,
      }));

    const selectedPattern = await vscode.window.showQuickPick(patternItems, {
      placeHolder: 'Select branch type',
    });

    if (!selectedPattern) {
      return;
    }

    // Get branch description from user
    const description = await vscode.window.showInputBox({
      placeHolder: 'Enter a brief description (e.g., user-authentication)',
      prompt: 'Enter a brief description for the branch',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Description cannot be empty';
        }
        if (value.length < 3) {
          return 'Description is too short (minimum 3 characters)';
        }
        const formatted = this.formatBranchName(value);
        if (!/^[a-z0-9-]+$/.test(formatted)) {
          return 'Description must contain only lowercase letters, numbers, and hyphens';
        }
        return null;
      },
    });

    if (!description) {
      return;
    }

    const formattedName = this.formatBranchName(description);
    const suggestedBranch = `${selectedPattern.label}/${formattedName}`;

    // Show suggestion and offer to create or copy
    const action = await vscode.window.showQuickPick(
      [
        {
          label: 'Copy to Clipboard',
          description: 'Copy the branch name to clipboard',
          action: 'copy',
        },
        {
          label: 'Create Branch',
          description: 'Create the branch using git',
          action: 'create',
        },
      ],
      {
        placeHolder: `Suggested branch name: ${suggestedBranch}`,
      },
    );

    if (action?.action === 'copy') {
      await vscode.env.clipboard.writeText(suggestedBranch);
      vscode.window.showInformationMessage(`Branch name '${suggestedBranch}' copied to clipboard`);
    } else if (action?.action === 'create') {
      await this.createBranch(suggestedBranch);
    }
  }

  /**
   * Validate the current git branch
   */
  public async validateCurrentBranch(): Promise<void> {
    const currentBranch = await this.getCurrentBranch();

    if (!currentBranch) {
      vscode.window.showWarningMessage('Not currently in a git repository');
      return;
    }

    const result = this.validateBranchName(currentBranch);

    if (result.isValid) {
      vscode.window.showInformationMessage(`✓ Branch name is valid: ${currentBranch}`);
    } else {
      const showError = config.severity === 'error';
      const message = `✗ ${result.message}`;

      if (showError) {
        vscode.window.showErrorMessage(message, ...result.suggestions).then((selection) => {
          if (selection) {
            vscode.env.clipboard.writeText(selection);
          }
        });
      } else {
        vscode.window.showWarningMessage(message, 'Show Suggestions').then((selection) => {
          if (selection === 'Show Suggestions' && result.suggestions.length > 0) {
            vscode.window
              .showQuickPick(
                result.suggestions.map((s) => ({ label: s })),
                {
                  placeHolder: 'Suggested branch names',
                  title: 'Branch Name Suggestions',
                },
              )
              .then((suggestion) => {
                if (suggestion) {
                  vscode.env.clipboard.writeText(suggestion.label);
                  vscode.window.showInformationMessage(`Copied: ${suggestion.label}`);
                }
              });
          }
        });
      }
    }
  }

  /**
   * Create a new branch with the given name
   */
  public async createBranch(branchName: string): Promise<boolean> {
    // First validate the branch name
    const validation = this.validateBranchName(branchName);

    if (!validation.isValid) {
      const proceed = await vscode.window.showWarningMessage(
        `Branch name does not follow conventions. Create anyway?`,
        'Yes',
        'No',
      );

      if (proceed !== 'Yes') {
        return false;
      }
    }

    try {
      // Execute git command to create branch
      const terminal = vscode.window.createTerminal('Git Branch Creation');
      terminal.sendText(`git checkout -b ${branchName}`);
      terminal.show();

      vscode.window.showInformationMessage(`Creating branch: ${branchName}`);
      return true;
    } catch (error) {
      this.logger.error('Error creating branch', error);
      vscode.window.showErrorMessage(
        `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Clear all diagnostics
   */
  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose the diagnostic collection
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }

  /**
   * Get the current git branch name
   */
  private async getCurrentBranch(): Promise<string | null> {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        return null;
      }

      const gitAPI = gitExtension.exports.getAPI(1);
      if (!gitAPI) {
        return null;
      }

      const repository = gitAPI.repositories[0];
      if (!repository) {
        return null;
      }

      return repository.state.HEAD?.name || null;
    } catch (error) {
      this.logger.error('Error getting current branch', error);
      return null;
    }
  }

  /**
   * Format a description into a valid branch name
   */
  private formatBranchName(description: string): string {
    return description
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Extract a meaningful name from a branch name
   */
  private extractMeaningfulName(branchName: string): string {
    // Remove prefix if present
    const parts = branchName.split('/');
    const meaningfulPart = parts.length > 1 ? parts.slice(1).join('/') : branchName;

    // Format it properly
    return this.formatBranchName(meaningfulPart);
  }

  /**
   * Get all patterns (default + custom)
   */
  private getAllPatterns(config: BranchNamingConfig): Record<string, BranchPattern> {
    const patterns: Record<string, BranchPattern> = { ...this.defaultPatterns };

    // Add custom patterns
    for (const [key, patternStr] of Object.entries(config.customPatterns)) {
      try {
        patterns[key] = {
          prefix: key,
          description: `Custom pattern: ${key}`,
          regex: new RegExp(patternStr),
          examples: [`${key}/example-name`],
        };
      } catch (error) {
        this.logger.error(`Invalid custom pattern for ${key}`, error);
      }
    }

    return patterns;
  }

  /**
   * Get configuration from settings
   */
  private getConfig(): BranchNamingConfig {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');

    return {
      enabled: config.get<boolean>('branchNamingConvention.enabled', true),
      validateOnCheckout: config.get<boolean>('branchNamingConvention.validateOnCheckout', true),
      validateOnCreate: config.get<boolean>('branchNamingConvention.validateOnCreate', true),
      enabledPatterns: config.get<string[]>('branchNamingConvention.enabledPatterns', [
        'feature',
        'bugfix',
        'hotfix',
      ]),
      severity: config.get<'error' | 'warning' | 'info'>(
        'branchNamingConvention.severity',
        'warning',
      ),
      excludedBranches: config.get<string[]>('branchNamingConvention.excludedBranches', [
        'main',
        'master',
        'develop',
        'dev',
        'staging',
        'production',
      ]),
      customPatterns: config.get<Record<string, string>>(
        'branchNamingConvention.customPatterns',
        {},
      ),
      allowIssueNumbers: config.get<boolean>('branchNamingConvention.allowIssueNumbers', true),
      issueNumberPattern: config.get<string>(
        'branchNamingConvention.issueNumberPattern',
        '^(JIRA|GH|ABC)-[0-9]+',
      ),
      maxLength: config.get<number>('branchNamingConvention.maxLength', 100),
      minLength: config.get<number>('branchNamingConvention.minLength', 3),
      suggestBranchNames: config.get<boolean>('branchNamingConvention.suggestBranchNames', true),
    };
  }
}
