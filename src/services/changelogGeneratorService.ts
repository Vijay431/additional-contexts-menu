import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { ProjectDetectionService } from './projectDetectionService';

const execAsync = promisify(exec);

/**
 * Service for generating CHANGELOG files from git commit history
 * following Keep a Changelog format (https://keepachangelog.com/)
 */
export class ChangelogGeneratorService {
  private static instance: ChangelogGeneratorService | undefined;
  private readonly projectDetectionService: ProjectDetectionService;
  private readonly fileDiscoveryService: FileDiscoveryService;
  private readonly configurationService: ConfigurationService;

  private constructor(
    projectDetectionService: ProjectDetectionService,
    fileDiscoveryService: FileDiscoveryService,
    configurationService: ConfigurationService,
  ) {
    this.projectDetectionService = projectDetectionService;
    this.fileDiscoveryService = fileDiscoveryService;
    this.configurationService = configurationService;
  }

  static getInstance(): ChangelogGeneratorService {
    if (!ChangelogGeneratorService.instance) {
      ChangelogGeneratorService.instance = new ChangelogGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
      );
    }
    return ChangelogGeneratorService.instance;
  }

  /**
   * Generate a CHANGELOG for the current workspace
   */
  async generateChangelog(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      // Check if it's a git repository
      const gitRoot = await this.getGitRoot(workspaceFolder.uri.fsPath);
      if (!gitRoot) {
        void vscode.window.showWarningMessage(
          'This workspace is not a git repository. CHANGELOG generation requires git history.',
        );
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating CHANGELOG...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze git commits
          const commits = await this.analyzeGitHistory(gitRoot);
          progress.report({ increment: 40 });

          // Group commits by type and version
          const groupedCommits = this.groupCommits(commits);
          progress.report({ increment: 60 });

          // Generate CHANGELOG content
          const changelogContent = this.buildChangelogContent(groupedCommits, gitRoot);
          progress.report({ increment: 80 });

          // Write or update CHANGELOG
          await this.writeChangelog(workspaceFolder.uri, changelogContent);
          progress.report({ increment: 100 });

          Logger.info('CHANGELOG generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating CHANGELOG', error);
      void vscode.window.showErrorMessage(
        `Failed to generate CHANGELOG: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the git root directory
   */
  private async getGitRoot(workspacePath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel', {
        cwd: workspacePath,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Analyze git history to extract commit information
   */
  private async analyzeGitHistory(gitRoot: string): Promise<GitCommit[]> {
    const commits: GitCommit[] = [];

    try {
      // Get git log with formatted output
      // Format: %H|%an|%ae|%ad|%s|%b
      // %H = commit hash, %an = author name, %ae = author email
      // %ad = author date (ISO 8601), %s = subject, %b = body
      const { stdout } = await execAsync(
        'git log --pretty=format:"%H|%an|%ae|%ad|%s|%b" --date=iso',
        {
          cwd: gitRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large repos
        },
      );

      const lines = stdout.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 5) {
          const commit: GitCommit = {
            hash: parts[0],
            author: parts[1],
            email: parts[2],
            date: new Date(parts[3]),
            message: parts[4],
            body: parts[5] || '',
          };

          // Parse commit type and scope from conventional commits
          const parsed = this.parseConventionalCommit(commit.message);
          commit.type = parsed.type;
          commit.scope = parsed.scope;
          commit.breaking = parsed.breaking;
          commit.issue = this.extractIssueNumber(commit.message, commit.body);

          commits.push(commit);
        }
      }

      Logger.info(`Analyzed ${commits.length} commits`);
    } catch (error) {
      Logger.error('Error analyzing git history', error);
      throw new Error('Failed to analyze git history. Make sure git is installed and this is a valid git repository.');
    }

    return commits;
  }

  /**
   * Parse a conventional commit message
   * Format: type(scope)!: description
   */
  private parseConventionalCommit(message: string): {
    type: CommitType;
    scope?: string;
    breaking: boolean;
  } {
    // Conventional commit types
    const conventionalTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'];

    // Check for breaking change indicator (! or BREAKING CHANGE)
    const breaking =
      message.includes('!') ||
      message.includes('BREAKING CHANGE') ||
      message.includes('BREAKING-CHANGE');

    // Try to match conventional commit format
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?!?:/);

    if (conventionalMatch) {
      const type = conventionalMatch[1];
      const scope = conventionalMatch[2];

      return {
        type: (conventionalTypes.includes(type) ? type : 'chore') as CommitType,
        scope,
        breaking,
      };
    }

    // Try to infer type from keywords
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.startsWith('add') || lowerMessage.startsWith('new') || lowerMessage.includes('feature')) {
      return { type: 'feat', breaking };
    }
    if (lowerMessage.startsWith('fix') || lowerMessage.includes('bug')) {
      return { type: 'fix', breaking };
    }
    if (lowerMessage.startsWith('doc') || lowerMessage.includes('readme')) {
      return { type: 'docs', breaking };
    }
    if (lowerMessage.includes('refactor') || lowerMessage.includes('rewrite')) {
      return { type: 'refactor', breaking };
    }
    if (lowerMessage.includes('performance') || lowerMessage.includes('optimize')) {
      return { type: 'perf', breaking };
    }
    if (lowerMessage.includes('test') || lowerMessage.startsWith('spec')) {
      return { type: 'test', breaking };
    }
    if (lowerMessage.includes('build') || lowerMessage.includes('webpack') || lowerMessage.includes('compile')) {
      return { type: 'build', breaking };
    }
    if (lowerMessage.includes('ci') || lowerMessage.includes('github') || lowerMessage.includes('workflow')) {
      return { type: 'ci', breaking };
    }
    if (lowerMessage.includes('style') || lowerMessage.includes('format') || lowerMessage.includes('lint')) {
      return { type: 'style', breaking };
    }

    // Default to chore
    return { type: 'chore', breaking };
  }

  /**
   * Extract issue/PR number from commit message or body
   */
  private extractIssueNumber(subject: string, body: string): string | undefined {
    const combined = `${subject} ${body}`;

    // Match patterns like #123, closes #123, fixes #123
    const patterns = [
      /#(\d+)/,
      /closes\s+#(\d+)/i,
      /fixes\s+#(\d+)/i,
      /refs\s+#(\d+)/i,
      /fixes\s+(\d+)/i,
      /close\s+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = combined.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Group commits by type and version
   */
  private groupCommits(commits: GitCommit[]): GroupedCommits {
    const grouped: GroupedCommits = {
      unreleased: {
        added: [],
        changed: [],
        deprecated: [],
        removed: [],
        fixed: [],
        security: [],
        other: [],
      },
      versions: [],
    };

    // Try to detect version tags to separate releases
    let currentVersion: string | undefined;
    let versionCommits: GitCommit[] = [];

    for (const commit of commits) {
      // Check if this commit is a version tag
      const versionMatch = commit.message.match(/^(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        // Save previous version
        if (currentVersion && versionCommits.length > 0) {
          grouped.versions.push({
            version: currentVersion,
            date: versionCommits[0].date,
            ...this.categorizeCommits(versionCommits),
          });
        }

        currentVersion = versionMatch[1];
        versionCommits = [];
      } else {
        versionCommits.push(commit);
      }
    }

    // Add the last version
    if (currentVersion && versionCommits.length > 0) {
      grouped.versions.push({
        version: currentVersion,
        date: versionCommits[0].date,
        ...this.categorizeCommits(versionCommits),
      });
    }

    // All commits go into unreleased for now (in production, you'd compare with latest tag)
    grouped.unreleased = this.categorizeCommits(commits.slice(0, 50)); // Limit to recent 50 for unreleased

    return grouped;
  }

  /**
   * Categorize commits by Keep a Changelog categories
   */
  private categorizeCommits(commits: GitCommit[]): {
    added: string[];
    changed: string[];
    deprecated: string[];
    removed: string[];
    fixed: string[];
    security: string[];
    other: string[];
  } {
    const categories = {
      added: [] as string[],
      changed: [] as string[],
      deprecated: [] as string[],
      removed: [] as string[],
      fixed: [] as string[],
      security: [] as string[],
      other: [] as string[],
    };

    for (const commit of commits) {
      // Skip version bump commits
      if (commit.message.match(/^\d+\.\d+\.\d+/)) {
        continue;
      }

      const message = this.formatCommitMessage(commit);
      const breaking = commit.breaking ? ' **BREAKING CHANGE**' : '';

      switch (commit.type) {
        case 'feat':
          categories.added.push(message + breaking);
          break;
        case 'fix':
          categories.fixed.push(message + breaking);
          break;
        case 'refactor':
          categories.changed.push(message + breaking);
          break;
        case 'perf':
          categories.changed.push(message + breaking);
          break;
        case 'docs':
          categories.changed.push(message);
          break;
        case 'style':
          categories.other.push(message);
          break;
        case 'test':
          categories.other.push(message);
          break;
        case 'build':
          categories.changed.push(message);
          break;
        case 'ci':
          categories.other.push(message);
          break;
        case 'chore':
          categories.other.push(message);
          break;
        default:
          categories.other.push(message);
      }
    }

    return categories;
  }

  /**
   * Format a commit message for the changelog
   */
  private formatCommitMessage(commit: GitCommit): string {
    let message = commit.message
      .replace(/^(\w+)(\([^)]+\))?!?:\s*/, '') // Remove type and scope
      .replace(/^Merge branch .+ into .+/, 'Merged branch')
      .replace(/^Merge pull request #\d+ from .+/, 'Merged pull request')
      .trim();

    // Add scope if present
    if (commit.scope) {
      message = `**${commit.scope}**: ${message}`;
    }

    // Add issue/PR link if present
    if (commit.issue) {
      message = `${message} (#[${commit.issue}](https://github.com/${this.getRepoSlug()}/issues/${commit.issue}))`;
    }

    // Truncate long messages
    if (message.length > 100) {
      message = message.substring(0, 97) + '...';
    }

    return message;
  }

  /**
   * Get repository slug for GitHub issue links
   */
  private getRepoSlug(): string {
    // Try to get from git remote
    try {
      const { stdout } = execAsync.sync('git config --get remote.origin.url');
      const url = stdout.trim();

      // Parse GitHub URL
      const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/);
      if (match) {
        return match[1];
      }
    } catch {
      // Ignore
    }

    return 'owner/repo'; // Fallback
  }

  /**
   * Build the CHANGELOG content following Keep a Changelog format
   */
  private buildChangelogContent(grouped: GroupedCommits, gitRoot: string): string {
    const lines: string[] = [];

    // Header
    lines.push('# Changelog');
    lines.push('');
    lines.push('All notable changes to this project will be documented in this file.');
    lines.push('');
    lines.push('The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),');
    lines.push('and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).');
    lines.push('');

    // Unreleased section
    lines.push('## [Unreleased]');
    lines.push('');
    this.appendCategory(lines, 'Added', grouped.unreleased.added);
    this.appendCategory(lines, 'Changed', grouped.unreleased.changed);
    this.appendCategory(lines, 'Deprecated', grouped.unreleased.deprecated);
    this.appendCategory(lines, 'Removed', grouped.unreleased.removed);
    this.appendCategory(lines, 'Fixed', grouped.unreleased.fixed);
    this.appendCategory(lines, 'Security', grouped.unreleased.security);
    this.appendCategory(lines, 'Other', grouped.unreleased.other);
    lines.push('');

    // Version sections
    for (const version of grouped.versions) {
      const versionDate = version.date.toISOString().split('T')[0];
      lines.push(`## [${version.version}] - ${versionDate}`);
      lines.push('');
      this.appendCategory(lines, 'Added', version.added);
      this.appendCategory(lines, 'Changed', version.changed);
      this.appendCategory(lines, 'Deprecated', version.deprecated);
      this.appendCategory(lines, 'Removed', version.removed);
      this.appendCategory(lines, 'Fixed', version.fixed);
      this.appendCategory(lines, 'Security', version.security);
      this.appendCategory(lines, 'Other', version.other);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Append a category section to the changelog
   */
  private appendCategory(lines: string[], title: string, items: string[]): void {
    if (items.length === 0) {
      return;
    }

    lines.push(`### ${title}`);
    lines.push('');

    for (const item of items) {
      lines.push(`- ${item}`);
    }

    lines.push('');
  }

  /**
   * Write the CHANGELOG to file
   */
  private async writeChangelog(workspaceUri: vscode.Uri, content: string): Promise<void> {
    const changelogPath = vscode.Uri.joinPath(workspaceUri, 'CHANGELOG.md');

    // Check if CHANGELOG already exists
    const changelogExists = await this.fileDiscoveryService.fileExists(changelogPath.fsPath);

    if (changelogExists) {
      const choice = await vscode.window.showWarningMessage(
        'CHANGELOG.md already exists. Do you want to overwrite it?',
        'Overwrite',
        'Cancel',
      );

      if (choice !== 'Overwrite') {
        return;
      }
    }

    // Write the CHANGELOG
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(changelogPath, encoder.encode(content));

    // Open the CHANGELOG
    const doc = await vscode.workspace.openTextDocument(changelogPath);
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage('CHANGELOG.md generated successfully!');
  }
}

/**
 * Git commit information
 */
interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  body: string;
  type: CommitType;
  scope?: string;
  breaking: boolean;
  issue?: string;
}

/**
 * Conventional commit types
 */
type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore';

/**
 * Grouped commits by category
 */
interface CommitCategories {
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
  other: string[];
}

/**
 * Version release information
 */
interface VersionRelease extends CommitCategories {
  version: string;
  date: Date;
}

/**
 * Grouped commits structure
 */
interface GroupedCommits {
  unreleased: CommitCategories;
  versions: VersionRelease[];
}
