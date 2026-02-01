import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

/**
 * Env File Generator Service
 *
 * Generates .env files from .env.example templates with
 * variable extraction and custom file naming support.
 *
 * @description
 * This service creates environment variable files (.env, .env.local, etc.)
 * based on .env.example templates found in the workspace. Parses variable names
 * and generates empty .env files ready for user configuration.
 *
 * Key Features:
 * - .env.example file parsing and validation
 * - Variable name extraction (supports comments)
 * - Custom .env file naming (.env, .env.local, .env.development, .env.production)
 * - Automatic file creation in workspace root
 * - Editor integration for immediate editing
 * - File name validation
 *
 * .env.example Format:
 * # Comment lines are preserved for documentation
 * VAR_NAME=value → Creates empty VAR_NAME= in .env
 * Empty lines are preserved
 * Complex values are supported
 *
 * Supported File Names:
 * - .env - Default production/staging environment
 * - .env.local - Local overrides (never committed)
 * - .env.development - Development environment
 * - .env.production - Production environment
 * - .env.test - Test environment
 * - Custom names (validated to start with '.')
 *
 * Use Cases:
 * - Setting up environment variables for new projects
 * - Creating multiple environment configs (dev, staging, prod)
 * - Quick .env file generation from templates
 * - Environment configuration management
 * - Security (keeping .env.example in repo, .env local)
 *
 * @example
 * // Get service instance
 * const envService = EnvFileGeneratorService.getInstance();
 *
 * // Generate .env file
 * await envService.generateEnvFile();
 * // User prompted for file name (default: .env)
 * // If .env.example exists, variables extracted and .env created
 * // .env automatically opened in editor
 *
 * // Requires .env.example in workspace root:
 * // NODE_ENV=production
 * // PORT=3000
 * // DB_HOST=localhost
 *
 * // Creates .env:
 * // NODE_ENV=
 * // PORT=
 * // DB_HOST=
 *
 * @see ConfigurationService - Not used directly but follows patterns
 *
 * @category Code Generation
 * @subpackage Environment Configuration
 *
 * @author Vijay Gangatharan <vijayanand431@gmail.com>
 * @since 1.3.0
 */

export class EnvFileGeneratorService {
  private static instance: EnvFileGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): EnvFileGeneratorService {
    EnvFileGeneratorService.instance ??= new EnvFileGeneratorService();
    return EnvFileGeneratorService.instance;
  }

  public async generateEnvFile(): Promise<void> {
    this.logger.info('Generate .env File command triggered');

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const envExamplePath = path.join(workspaceRoot, '.env.example');

      if (!isSafeFilePath(envExamplePath)) {
        this.logger.warn('Rejected unsafe .env.example path', { path: envExamplePath });
        vscode.window.showErrorMessage('Path to .env.example is not allowed.');
        return;
      }

      const envExampleExists = await this.fileExists(envExamplePath);
      if (!envExampleExists) {
        vscode.window.showWarningMessage('.env.example file not found in workspace root.');
        return;
      }

      const envFileName = await this.promptForEnvFileName();
      if (!envFileName) {
        return;
      }

      const envFilePath = path.join(workspaceRoot, envFileName);
      await this.generateEnvFileFromExample(envExamplePath, envFilePath);

      const envUri = vscode.Uri.file(envFilePath);
      await vscode.window.showTextDocument(envUri, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false,
      });

      vscode.window.showInformationMessage(`Created ${envFileName} file successfully`);
      this.logger.info(`Generated ${envFileName} from .env.example`, {
        examplePath: envExamplePath,
        targetPath: envFilePath,
      });
    } catch (error) {
      this.logger.error('Error generating .env file', error);
      vscode.window.showErrorMessage(`Failed to generate .env file: ${(error as Error).message}`);
    }
  }

  private async promptForEnvFileName(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter .env file name',
      placeHolder: '.env',
      value: '.env',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'File name cannot be empty';
        }
        if (!value.startsWith('.')) {
          return 'File name must start with a dot (.)';
        }
        return null;
      },
    });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async generateEnvFileFromExample(examplePath: string, targetPath: string): Promise<void> {
    const resolvedExamplePath = path.resolve(examplePath);
    const resolvedTargetPath = path.resolve(targetPath);
    if (!isSafeFilePath(resolvedExamplePath) || !isSafeFilePath(resolvedTargetPath)) {
      throw new Error('Invalid file path');
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- paths validated by isSafeFilePath()
    const exampleContent = await fs.readFile(resolvedExamplePath, 'utf-8');
    const variables = this.parseEnvVariables(exampleContent);
    const envContent = variables.map((variable) => `${variable.name}=`).join('\n');

    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path validated by isSafeFilePath()
    await fs.writeFile(resolvedTargetPath, envContent, 'utf-8');
  }

  private parseEnvVariables(content: string): { name: string }[] {
    const variables: { name: string }[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
        continue;
      }

      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }

      const name = trimmedLine.slice(0, equalIndex).trim();
      if (name.length > 0) {
        variables.push({ name });
      }
    }

    return variables;
  }
}
