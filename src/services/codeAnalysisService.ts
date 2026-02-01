import * as ts from 'typescript';
import * as vscode from 'vscode';

import { FunctionInfo } from '../types/extension';
import { Logger } from '../utils/logger';

export class CodeAnalysisService {
  private static instance: CodeAnalysisService | undefined = undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CodeAnalysisService {
    return CodeAnalysisService.instance ?? new CodeAnalysisService();
  }

  public async findFunctionAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<FunctionInfo | null> {
    try {
      const text = document.getText();
      const sourceFile = this.parseSourceFile(text, document.fileName);
      const offset = document.offsetAt(position);

      const containingNode = this.findFunctionNodeContainingPosition(sourceFile, offset);

      if (containingNode) {
        const functionInfo = this.extractFunctionInfo(containingNode, sourceFile);

        this.logger.debug('Function found at position', {
          name: functionInfo.name,
          type: functionInfo.type,
          line: functionInfo.startLine,
        });

        return functionInfo;
      }

      return null;
    } catch (error) {
      this.logger.error('Error finding function at position', error);
      return null;
    }
  }

  private parseSourceFile(code: string, fileName: string): ts.SourceFile {
    return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  }

  private findFunctionNodeContainingPosition(
    sourceFile: ts.SourceFile,
    position: number,
  ): ts.FunctionLike | null {
    let result: ts.FunctionLike | null = null;

    const visit = (node: ts.Node) => {
      if (position >= node.pos && position <= node.end) {
        if (this.isFunctionNode(node) && !result) {
          result = node as ts.FunctionLike;
        }
        ts.forEachChild(node, visit);
      }
    };

    visit(sourceFile);
    return result;
  }

  private isFunctionNode(node: ts.Node): boolean {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      this.isVariableFunctionDeclaration(node)
    );
  }

  private isVariableFunctionDeclaration(node: ts.Node): boolean {
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration?.initializer) {
        return (
          ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer)
        );
      }
      return false;
    }
    return false;
  }

  private extractFunctionInfo(node: ts.FunctionLike, sourceFile: ts.SourceFile): FunctionInfo {
    const name = this.getFunctionName(node, sourceFile);
    const type = this.getFunctionType(node, sourceFile);
    const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const endPos = sourceFile.getLineAndCharacterOfPosition(node.end);

    return {
      name,
      type,
      startLine: startPos.line + 1,
      endLine: endPos.line + 1,
      startColumn: startPos.character,
      endColumn: endPos.character,
      isExported: this.isExported(node),
      hasDecorators: this.hasDecorators(node),
      fullText: sourceFile.text.substring(node.pos, node.end),
    };
  }

  private getFunctionName(node: ts.Node, sourceFile: ts.SourceFile): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }

    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration?.name) {
        return declaration.name.getText(sourceFile);
      }
      return 'anonymous';
    }

    if (ts.isMethodDeclaration(node)) {
      return node.name.getText(sourceFile);
    }

    if (ts.isFunctionExpression(node) && node.name) {
      return node.name.text;
    }

    return 'anonymous';
  }

  private getFunctionType(node: ts.Node, sourceFile: ts.SourceFile): FunctionInfo['type'] {
    const name = this.getFunctionName(node, sourceFile);

    if (name.length === 0) {
      return 'function';
    }

    const firstChar = name[0]!;

    // React hook detection
    if (name.startsWith('use')) {
      return 'hook';
    }

    // React component detection (capital letter start)
    if (firstChar === firstChar.toUpperCase() && firstChar >= 'A' && firstChar <= 'Z') {
      return 'component';
    }

    // Async function detection
    if (
      ts.canHaveModifiers(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
    ) {
      return 'async';
    }

    // Arrow function
    if (ts.isArrowFunction(node)) {
      return 'arrow';
    }

    // Method
    if (ts.isMethodDeclaration(node)) {
      return 'method';
    }

    return 'function';
  }

  private isExported(node: ts.Node): boolean {
    if (ts.canHaveModifiers(node)) {
      return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }
    return false;
  }

  private hasDecorators(node: ts.Node): boolean {
    if ('decorators' in node) {
      const decorators = (node as { decorators?: ts.NodeArray<ts.Decorator> }).decorators;
      return decorators !== undefined && decorators.length > 0;
    }
    return false;
  }

  public extractImports(code: string, _languageId: string): string[] {
    const imports: string[] = [];

    try {
      const sourceFile = this.parseSourceFile(code, 'temp.ts');

      sourceFile.statements.forEach((statement) => {
        if (ts.isImportDeclaration(statement)) {
          const importText = sourceFile.text.substring(
            statement.getStart(sourceFile),
            statement.end,
          );
          imports.push(importText.trim());
        }
      });
    } catch (error) {
      this.logger.warn('Error extracting imports', error);
    }

    return imports;
  }
}
