import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

import { CommitMessage, CommitMessageType } from '../types/extension';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Service for generating conventional commit messages based on staged changes.
 * Analyzes git diff to suggest commit type, scope, and description.
 */
export class CommitMessageGeneratorService {
  private static instance: CommitMessageGeneratorService | undefined;
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;

  // Conventional commit types with their descriptions
  private readonly commitTypes: Record<CommitMessageType, { description: string; emoji: string }> =
    {
      feat: { description: 'A new feature', emoji: '✨' },
      fix: { description: 'A bug fix', emoji: '🐛' },
      docs: { description: 'Documentation only changes', emoji: '📝' },
      style: { description: 'Changes that do not affect the meaning of the code', emoji: '💄' },
      refactor: {
        description: 'A code change that neither fixes a bug nor adds a feature',
        emoji: '♻️',
      },
      perf: { description: 'A code change that improves performance', emoji: '⚡' },
      test: { description: 'Adding missing tests or correcting existing tests', emoji: '✅' },
      build: {
        description: 'Changes that affect the build system or external dependencies',
        emoji: '📦',
      },
      ci: { description: 'Changes to CI configuration files and scripts', emoji: '👷' },
      chore: { description: 'Other changes that do not modify src or test files', emoji: '🔧' },
      revert: { description: 'Reverts a previous commit', emoji: '⏪' },
    };

  // Patterns for detecting commit types based on file paths and diff content
  private readonly typePatterns = {
    feat: [
      /src\/components\//,
      /src\/views\//,
      /src\/routes\//,
      /\.component\./,
      /new\s+feature/i,
      /add\s+\w+/i,
    ],
    fix: [/fix/i, /bug/i, /issue/i, /patch/i, /correct/i, /resolve/i],
    docs: [/\.md$/, /\/docs\//, /\/documentation\//, /readme/i, /changelog/i],
    style: [/\.css$/, /\.scss$/, /\.sass$/, /\.less$/, /formatting/i, /whitespace/i, /indent/i],
    refactor: [/refactor/i, /restructure/i, /reorganize/i, /clean\s*up/i, /optimize/i],
    perf: [/performance/i, /optimization/i, /cache/i, /lazy\s*load/i, /debounce/i, /throttle/i],
    test: [/\.test\./, /\.spec\./, /\/tests?\//, /\/__tests__\//, /\/spec\//, /mock/i, /stub/i],
    build: [
      /package\.json$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /\.eslintrc/,
      /\.prettierrc/,
      /tsconfig\.json$/,
      /webpack\./,
      /vite\./,
      /rollup\./,
      /\.config\./,
    ],
    ci: [/\.github\//, /\.gitlab-ci\./, /travis\.yml/, /jenkins/, /docker/, /\.ci\./],
    chore: [/clean/i, /update\s+deps/i, /upgrade/i, /dependency/i],
  };

  // Scope detection patterns
  private readonly scopePatterns = [
    { pattern: /src\/components/, scope: 'components' },
    { pattern: /src\/views|src\/pages/, scope: 'views' },
    { pattern: /src\/services/, scope: 'services' },
    { pattern: /src\/utils|src\/helpers/, scope: 'utils' },
    { pattern: /src\/hooks/, scope: 'hooks' },
    { pattern: /src\/store|src\/redux/, scope: 'state' },
    { pattern: /src\/routes/, scope: 'routing' },
    { pattern: /src\/api/, scope: 'api' },
    { pattern: /src\/types|src\/interfaces/, scope: 'types' },
    { pattern: /public|assets/, scope: 'assets' },
    { pattern: /\.css|\.scss|\.sass/, scope: 'styles' },
    { pattern: /tests?|__tests__|spec/, scope: 'tests' },
    { pattern: /package\.json/, scope: 'deps' },
    { pattern: /webpack|vite|rollup|esbuild/, scope: 'build' },
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.outputChannel = vscode.window.createOutputChannel('Commit Message Generator');
  }

  public static getInstance(): CommitMessageGeneratorService {
    CommitMessageGeneratorService.instance ??= new CommitMessageGeneratorService();
    return CommitMessageGeneratorService.instance;
  }

  /**
   * Generate commit message suggestions based on staged changes
   */
  public async generateCommitMessage(): Promise<CommitMessage[]> {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder found');
      }

      // Check if we're in a git repository
      const gitResult = await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: workspaceRoot,
      }).catch(() => ({ stdout: '' }));

      if (gitResult.stdout.trim() !== 'true') {
        throw new Error('Not in a git repository');
      }

      // Get staged changes
      const stagedResult = await execAsync('git diff --cached --name-status', {
        cwd: workspaceRoot,
      });

      const stagedFiles = this.parseStagedFiles(stagedResult.stdout);

      if (stagedFiles.length === 0) {
        throw new Error('No staged changes found. Stage some changes first using `git add`');
      }

      // Get diff content for analysis
      const diffResult = await execAsync('git diff --cached', {
        cwd: workspaceRoot,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const diffContent = diffResult.stdout;

      // Generate suggestions
      const suggestions = this.generateSuggestions(stagedFiles, diffContent);

      this.logger.info('Generated commit message suggestions', {
        count: suggestions.length,
        files: stagedFiles.length,
      });

      return suggestions;
    } catch (error) {
      this.logger.error('Error generating commit message', error);
      throw error;
    }
  }

  /**
   * Show commit message suggestions and let user choose or copy
   */
  public async showCommitMessageSuggestions(): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Analyzing staged changes...',
          cancellable: false,
        },
        async () => {
          const suggestions = await this.generateCommitMessage();

          if (suggestions.length === 0) {
            vscode.window.showInformationMessage('Could not generate commit message suggestions');
            return;
          }

          // Show quick pick with suggestions
          const items = suggestions.map((suggestion, index) => ({
            label: `${suggestion.emoji} ${suggestion.type}${suggestion.scope ? `(${suggestion.scope})` : ''}: ${suggestion.description}`,
            description: suggestion.body ? 'Has body' : '',
            suggestion,
            index,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a commit message (will be copied to clipboard)',
          });

          if (selected) {
            const message = this.formatCommitMessage(selected.suggestion);
            await vscode.env.clipboard.writeText(message);

            const copyAgain = 'Copy Again';
            const action = await vscode.window.showInformationMessage(
              `Commit message copied to clipboard:\n\n${message}`,
              copyAgain,
            );

            if (action === copyAgain) {
              await vscode.env.clipboard.writeText(message);
            }
          }
        },
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate commit message: ${errorMessage}`);
    }
  }

  /**
   * Display detailed analysis in output channel
   */
  public displayAnalysis(suggestions: CommitMessage[]): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('Commit Message Analysis');
    this.outputChannel.appendLine('═'.repeat(60));
    this.outputChannel.appendLine('');

    suggestions.forEach((suggestion, index) => {
      this.outputChannel.appendLine(`Option ${index + 1}:`);
      this.outputChannel.appendLine(`  Type: ${suggestion.type}`);
      if (suggestion.scope) {
        this.outputChannel.appendLine(`  Scope: ${suggestion.scope}`);
      }
      this.outputChannel.appendLine(`  Description: ${suggestion.description}`);
      if (suggestion.body) {
        this.outputChannel.appendLine(`  Body: ${suggestion.body}`);
      }
      this.outputChannel.appendLine('');
    });

    this.outputChannel.show();
  }

  private parseStagedFiles(output: string): Array<{ path: string; status: string }> {
    const files: Array<{ path: string; status: string }> = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const status = parts[0] ?? '';
        const path = parts.slice(1).join(' ');
        files.push({ path, status });
      }
    }

    return files;
  }

  private generateSuggestions(
    files: Array<{ path: string; status: string }>,
    diffContent: string,
  ): CommitMessage[] {
    const suggestions: CommitMessage[] = [];

    // Analyze files and diff to determine commit type
    const typeScores = this.calculateTypeScores(files, diffContent);

    // Detect scope from file paths
    const scope = this.detectScope(files);

    // Generate description based on changes
    const descriptions = this.generateDescriptions(files, diffContent);

    // Generate body with file list
    const body = this.generateBody(files);

    // Create suggestions for top-scoring types
    const sortedTypes = Object.entries(typeScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type as CommitMessageType);

    for (const type of sortedTypes) {
      const description =
        descriptions[type] || descriptions[sortedTypes[0] ?? 'feat'] || 'Update code';

      const suggestion: CommitMessage = {
        type,
        description,
        emoji: this.commitTypes[type].emoji,
      };

      if (scope) {
        suggestion.scope = scope;
      }

      if (body.length > 0) {
        suggestion.body = body;
      }

      suggestions.push(suggestion);
    }

    // Always include a generic "chore" suggestion as fallback
    if (suggestions.length === 0 || !suggestions.some((s) => s.type === 'chore')) {
      const choreSuggestion: CommitMessage = {
        type: 'chore',
        description: `Update ${files.length} file${files.length > 1 ? 's' : ''}`,
        emoji: this.commitTypes.chore.emoji,
      };

      if (body.length > 0) {
        choreSuggestion.body = body;
      }

      suggestions.push(choreSuggestion);
    }

    return suggestions;
  }

  private calculateTypeScores(
    files: Array<{ path: string; status: string }>,
    diffContent: string,
  ): Partial<Record<CommitMessageType, number>> {
    const scores: Partial<Record<CommitMessageType, number>> = {};

    for (const [type, patterns] of Object.entries(this.typePatterns)) {
      let score = 0;

      for (const file of files) {
        for (const pattern of patterns) {
          if (pattern.test(file.path) || pattern.test(diffContent)) {
            score += 1;
          }
        }
      }

      scores[type as CommitMessageType] = score;
    }

    return scores;
  }

  private detectScope(files: Array<{ path: string; status: string }>): string | null {
    const scopeCounts = new Map<string, number>();

    for (const file of files) {
      for (const { pattern, scope } of this.scopePatterns) {
        if (pattern.test(file.path)) {
          scopeCounts.set(scope, (scopeCounts.get(scope) ?? 0) + 1);
        }
      }
    }

    // Find the most common scope
    let maxScope: string | null = null;
    let maxCount = 0;

    for (const [scope, count] of scopeCounts.entries()) {
      if (count > maxCount) {
        maxScope = scope;
        maxCount = count;
      }
    }

    return maxScope;
  }

  private generateDescriptions(
    files: Array<{ path: string; status: string }>,
    diffContent: string,
  ): Partial<Record<CommitMessageType, string>> {
    const descriptions: Partial<Record<CommitMessageType, string>> = {};

    // Analyze diff content for keywords
    const addedLines = diffContent.match(/^\+.*$/gm) ?? [];
    const removedLines = diffContent.match(/^-.*/gm) ?? [];
    const allChanges = [...addedLines, ...removedLines].join('\n').toLowerCase();

    // feat descriptions
    if (/add|create|new|implement/.test(allChanges)) {
      descriptions.feat = this.capitalizeFirstMatch(
        /add\s+([a-z\s]+)|create\s+([a-z\s]+)|new\s+([a-z\s]+)/i,
        allChanges,
        'Add new feature',
      );
    }

    // fix descriptions
    if (/fix|bug|issue|correct|resolve/.test(allChanges)) {
      descriptions.fix = this.capitalizeFirstMatch(
        /fix\s+([a-z\s]+)|resolve\s+([a-z\s]+)/i,
        allChanges,
        'Fix bug',
      );
    }

    // docs descriptions
    descriptions.docs =
      files.length > 0
        ? `Update documentation for ${files.length} file${files.length > 1 ? 's' : ''}`
        : 'Update documentation';

    // style descriptions
    descriptions.style = 'Update code formatting';

    // refactor descriptions
    descriptions.refactor = 'Refactor code';

    // perf descriptions
    descriptions.perf = 'Improve performance';

    // test descriptions
    descriptions.test = `Update tests for ${files.length} file${files.length > 1 ? 's' : ''}`;

    // build descriptions
    descriptions.build = 'Update build configuration';

    // ci descriptions
    descriptions.ci = 'Update CI configuration';

    // chore descriptions
    descriptions.chore = `Update ${files.length} file${files.length > 1 ? 's' : ''}`;

    return descriptions;
  }

  private capitalizeFirstMatch(pattern: RegExp, text: string, fallback: string): string {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1]
        .trim()
        .split(' ')
        .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
        .join(' ');
    }
    return fallback;
  }

  private generateBody(files: Array<{ path: string; status: string }>): string {
    const lines: string[] = [];

    // Group files by status
    const byStatus = new Map<string, string[]>();
    for (const file of files) {
      const filesForStatus = byStatus.get(file.status) ?? [];
      filesForStatus.push(file.path);
      byStatus.set(file.status, filesForStatus);
    }

    // Status descriptions
    const statusDescriptions: Record<string, string> = {
      M: 'Modified',
      A: 'Added',
      D: 'Deleted',
      R: 'Renamed',
      C: 'Copied',
    };

    for (const [status, filePaths] of byStatus.entries()) {
      const desc = statusDescriptions[status] ?? status;
      lines.push(`${desc} ${filePaths.length} file${filePaths.length > 1 ? 's' : ''}:`);
      for (const path of filePaths) {
        lines.push(`  - ${path}`);
      }
    }

    return lines.join('\n');
  }

  private formatCommitMessage(message: CommitMessage): string {
    let result = `${message.type}`;

    if (message.scope) {
      result += `(${message.scope})`;
    }

    result += `: ${message.description}`;

    if (message.body) {
      result += `\n\n${message.body}`;
    }

    return result;
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
