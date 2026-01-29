import * as vscode from 'vscode';
import * as fs from 'fs/promises';

import { Logger } from '../utils/logger';

export class EnumGeneratorService {
  private static instance: EnumGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): EnumGeneratorService {
    EnumGeneratorService.instance ??= new EnumGeneratorService();
    return EnumGeneratorService.instance;
  }

  public async generateEnumFromSelection(): Promise<void> {
    this.logger.info('Generate Enum from Selection command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;

      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Cannot generate enum from untitled file. Please save the file first.',
        );
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('No code selected. Please select a type definition.');
        return;
      }

      const selectedText = document.getText(selection);
      const unionType = this.parseUnionType(selectedText);

      if (!unionType) {
        vscode.window.showWarningMessage(
          'Selected code does not appear to be a TypeScript union type.',
        );
        return;
      }

      const enumName = await this.promptForEnumName(unionType.variableName);
      if (!enumName) {
        return;
      }

      const enumCode = this.generateEnumCode(enumName, unionType.values);
      const insertPosition = new vscode.Position(selection.start.line, 0);

      await editor.edit((editBuilder) => {
        editBuilder.insert(insertPosition, `${enumCode}\n\n`);
      });

      await document.save();

      vscode.window.showInformationMessage(`Generated enum '${enumName}' successfully`);
      this.logger.info(`Enum generated successfully: ${enumName}`, {
        variableName: unionType.variableName,
        valueCount: unionType.values.length,
      });
    } catch (error) {
      this.logger.error('Error generating enum', error);
      vscode.window.showErrorMessage(`Failed to generate enum: ${(error as Error).message}`);
    }
  }

  public parseUnionType(text: string): { variableName: string; values: string[] } | null {
    const trimmedText = text.trim();

    const typeAliasMatch = trimmedText.match(/^type\s+(\w+)\s*=\s*(.+);?$/);
    if (typeAliasMatch) {
      const variableName = typeAliasMatch[1] ?? '';
      const typeDefinition = typeAliasMatch[2] ?? '';

      const values = this.extractStringLiterals(typeDefinition);
      if (values.length > 0) {
        return { variableName, values };
      }
    }

    const inlineMatch = trimmedText.match(/(\w+)\s*:\s*(.+);?$/);
    if (inlineMatch) {
      const variableName = inlineMatch[1] ?? '';
      const typeDefinition = inlineMatch[2] ?? '';

      const values = this.extractStringLiterals(typeDefinition);
      if (values.length > 0) {
        return { variableName, values };
      }
    }

    return null;
  }

  private extractStringLiterals(text: string): string[] {
    const values: string[] = [];

    const patterns = [/(['"])([^'"]*)\1/g, /(['])([^]]*)\1/g, /(['`])([^'`]*)\1/g];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[2]?.trim() ?? '';
        if (value && !values.includes(value)) {
          values.push(value);
        }
      }
    }

    return values;
  }

  private async promptForEnumName(defaultName: string): Promise<string | undefined> {
    const enumName = await vscode.window.showInputBox({
      prompt: 'Enter enum name',
      placeHolder: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Enum name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Enum name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    return enumName;
  }

  private generateEnumCode(enumName: string, values: string[]): string {
    const lines: string[] = [`export enum ${enumName} {`, ''];

    for (const value of values) {
      const enumValueName = this.convertToEnumValueName(value);
      lines.push(`  ${enumValueName} = '${value}',`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  private convertToEnumValueName(value: string): string {
    return value
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+(.)/g, (match, letter) => letter.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1_$2');
  }
}
