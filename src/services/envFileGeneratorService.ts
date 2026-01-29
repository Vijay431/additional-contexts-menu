import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

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
    const exampleContent = await fs.readFile(examplePath, 'utf-8');
    const variables = this.parseEnvVariables(exampleContent);
    const envContent = variables.map((variable) => `${variable.name}=`).join('\n');

    await fs.writeFile(targetPath, envContent, 'utf-8');
  }

  private parseEnvVariables(content: string): Array<{ name: string }> {
    const variables: Array<{ name: string }> = [];
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
