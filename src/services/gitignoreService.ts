import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

export interface GitignorePattern {
  name: string;
  description: string;
  pattern: string;
}

export class GitignoreService {
  private static instance: GitignoreService | undefined;
  private logger: Logger;
  private commonPatterns: GitignorePattern[];

  private constructor() {
    this.logger = Logger.getInstance();
    this.commonPatterns = this.initializeCommonPatterns();
  }

  public static getInstance(): GitignoreService {
    GitignoreService.instance ??= new GitignoreService();
    return GitignoreService.instance;
  }

  public async generateGitignore(): Promise<void> {
    this.logger.info('Generate .gitignore command triggered');

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const gitignorePath = path.join(workspaceRoot, '.gitignore');
      const gitignoreExists = await this.fileExists(gitignorePath);

      const patterns = await this.selectPatterns();
      if (!patterns || patterns.length === 0) {
        vscode.window.showInformationMessage('No patterns selected');
        return;
      }

      const existingContent = gitignoreExists ? await fs.readFile(gitignorePath, 'utf-8') : '';

      const newContent = this.appendPatterns(existingContent, patterns);
      await fs.writeFile(gitignorePath, newContent, 'utf-8');

      vscode.window.showInformationMessage(
        `Generated .gitignore file with ${patterns.length} pattern(s)`,
      );
      this.logger.info(`Generated .gitignore`, {
        path: gitignorePath,
        patternCount: patterns.length,
        overwritten: gitignoreExists,
      });
    } catch (error) {
      this.logger.error('Error generating .gitignore', error);
      vscode.window.showErrorMessage(`Failed to generate .gitignore: ${(error as Error).message}`);
    }
  }

  private async selectPatterns(): Promise<GitignorePattern[]> {
    const selectedPatterns = await vscode.window.showQuickPick(
      this.commonPatterns.map((pattern) => ({
        label: pattern.name,
        description: pattern.description,
        picked: false,
      })),
      {
        placeHolder: 'Select patterns to include in .gitignore',
        canPickMany: true,
        ignoreFocusOut: true,
      },
    );

    if (!selectedPatterns) {
      return [];
    }

    return selectedPatterns;
  }

  private appendPatterns(existingContent: string, patterns: GitignorePattern[]): string {
    if (existingContent.trim().length === 0) {
      return patterns.map((p) => p.pattern).join('\n');
    }

    let content = existingContent.trim();

    if (!content.endsWith('\n')) {
      content += '\n';
    }

    for (const pattern of patterns) {
      content += `${pattern.pattern}\n`;
    }

    return content;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    if (!isSafeFilePath(filePath)) {
      return false;
    }

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private initializeCommonPatterns(): GitignorePattern[] {
    return [
      {
        name: 'Node.js',
        description: 'Node.js dependencies and build files',
        pattern: 'node_modules/',
      },
      {
        name: 'Node.js',
        description: 'NPM logs',
        pattern: '*.log',
      },
      {
        name: 'Node.js',
        description: 'NPM error logs',
        pattern: 'npm-debug.log*',
      },
      {
        name: 'Node.js',
        description: 'NPM package lock files',
        pattern: 'package-lock.json',
      },
      {
        name: 'Node.js',
        description: 'Yarn lock file',
        pattern: 'yarn.lock',
      },
      {
        name: 'Node.js',
        description: 'Environment files',
        pattern: '.env',
      },
      {
        name: 'Node.js',
        description: 'Environment local files',
        pattern: '.env.local',
      },
      {
        name: 'Node.js',
        description: 'Dist build directories',
        pattern: 'dist/',
      },
      {
        name: 'Node.js',
        description: 'Build output directories',
        pattern: 'build/',
      },
      {
        name: 'IDE',
        description: 'VSCode settings',
        pattern: '.vscode/',
      },
      {
        name: 'IDE',
        description: 'JetBrains IDE settings',
        pattern: '.idea/',
      },
      {
        name: 'OS',
        description: 'macOS files',
        pattern: '.DS_Store',
      },
      {
        name: 'OS',
        description: 'Windows files',
        pattern: 'Thumbs.db',
      },
      {
        name: 'Testing',
        description: 'Test coverage',
        pattern: 'coverage/',
      },
      {
        name: 'Testing',
        description: 'Test output',
        pattern: '.nyc_output/',
      },
      {
        name: 'Logs',
        description: 'Log files',
        pattern: '*.log',
      },
    ];
  }
}
