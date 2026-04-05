import * as ts from 'typescript';
import * as vscode from 'vscode';

import type {
  ICodeAnalysisService,
  FunctionInfo,
  ImportInfo,
} from '../di/interfaces/ICodeAnalysisService';
import type { ILogger } from '../di/interfaces/ILogger';
import { FunctionInfo as OldFunctionInfo } from '../types/extension';
import { Logger } from '../utils/logger';

export class CodeAnalysisService implements ICodeAnalysisService {
  private static instance: CodeAnalysisService | undefined = undefined;
  private logger: ILogger;

  private constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Get the singleton instance (legacy pattern)
   *
   * @deprecated Use DI injection instead
   */
  public static getInstance(): CodeAnalysisService {
    CodeAnalysisService.instance ??= new CodeAnalysisService(Logger.getInstance());
    return CodeAnalysisService.instance;
  }

  /**
   * Create a new CodeAnalysisService instance (DI pattern)
   *
   * This method is used by the DI container.
   *
   * @param logger - The logger instance to use
   * @returns A new CodeAnalysisService instance
   */
  public static create(logger: ILogger): CodeAnalysisService {
    return new CodeAnalysisService(logger);
  }

  public async findFunctionAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<FunctionInfo | undefined> {
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

      return undefined;
    } catch (error) {
      this.logger.error('Error finding function at position', error);
      return undefined;
    }
  }

  /**
   * @deprecated For backward compatibility, use findFunctionAtPosition instead
   */
  public async findFunctionAtPositionOld(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<OldFunctionInfo | null> {
    const result = await this.findFunctionAtPosition(document, position);
    if (!result) return null;

    return {
      name: result.name,
      startLine: result.startLine,
      endLine: result.endLine,
      startColumn: 0,
      endColumn: 0,
      type: result.type === 'arrow' ? 'arrow' : result.type === 'method' ? 'method' : 'function',
      isExported: false,
      hasDecorators: false,
      fullText: result.fullText,
    };
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
        if (!result) {
          if (
            ts.isFunctionDeclaration(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isFunctionExpression(node)
          ) {
            result = node as ts.FunctionLike;
          } else if (ts.isVariableStatement(node)) {
            const declaration = node.declarationList.declarations[0];
            if (
              declaration?.initializer &&
              (ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer))
            ) {
              result = declaration.initializer as ts.FunctionLike;
            }
          }
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

    // For arrow/function expressions assigned to a variable, capture the full `const foo = () => {}` statement
    const textNode =
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      ts.isVariableDeclaration(node.parent) &&
      ts.isVariableDeclarationList(node.parent.parent) &&
      ts.isVariableStatement(node.parent.parent.parent)
        ? node.parent.parent.parent
        : node;

    const startPos = sourceFile.getLineAndCharacterOfPosition(textNode.getStart());
    const endPos = sourceFile.getLineAndCharacterOfPosition(textNode.end);

    return {
      name,
      type,
      startLine: startPos.line + 1,
      endLine: endPos.line + 1,
      fullText: sourceFile.text.substring(textNode.pos, textNode.end).trimStart(),
      isAsync:
        ts.canHaveModifiers(node) &&
        ((node.modifiers as ts.ModifiersArray | undefined)?.some(
          (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
        ) ??
          false),
    };
  }

  private getFunctionName(node: ts.Node, sourceFile: ts.SourceFile): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }

    // Arrow/function expression assigned to a variable: `const foo = () => {}`
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      ts.isVariableDeclaration(node.parent) &&
      ts.isIdentifier(node.parent.name)
    ) {
      return node.parent.name.getText(sourceFile);
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

  public extractImports(code: string, _languageId: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    function extractImportNames(namedBindings: ts.NamedImportBindings | undefined): string[] {
      if (!namedBindings) return [];
      if (ts.isNamedImports(namedBindings)) {
        return namedBindings.elements.map((s) => s.name.getText());
      }
      return [];
    }

    try {
      const sourceFile = this.parseSourceFile(code, 'temp.ts');

      sourceFile.statements.forEach((statement) => {
        if (ts.isImportDeclaration(statement)) {
          const fullText = sourceFile.text.substring(statement.getStart(sourceFile), statement.end);

          // Determine import type
          let type: ImportInfo['type'] = 'side-effect';
          const moduleLiteral = statement.moduleSpecifier.getText();

          if (statement.importClause) {
            if (ts.isNamespaceImport(statement.importClause.namedBindings)) {
              type = 'namespace';
            } else if (statement.importClause.name) {
              type = 'default';
            } else if (
              statement.importClause.namedBindings &&
              ts.isNamedImports(statement.importClause.namedBindings)
            ) {
              type = 'named';
            }
          }

          imports.push({
            fullText: fullText.trim(),
            type,
            module: moduleLiteral.replace(/['"]/g, ''),
            names:
              type === 'named' || type === 'namespace'
                ? extractImportNames(statement.importClause?.namedBindings)
                : undefined,
          });
        }
      });
    } catch (error) {
      this.logger.warn('Error extracting imports', error);
    }

    return imports;
  }

  public containsPattern(code: string, pattern: RegExp): boolean {
    return pattern.test(code);
  }

  public extractAllFunctions(document: vscode.TextDocument): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const text = document.getText();
    const sourceFile = this.parseSourceFile(text, document.fileName);

    const visit = (node: ts.Node) => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isFunctionExpression(node)
      ) {
        functions.push(this.extractFunctionInfo(node as ts.FunctionLike, sourceFile));
      } else if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (
          declaration?.initializer &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer))
        ) {
          functions.push(
            this.extractFunctionInfo(declaration.initializer as ts.FunctionLike, sourceFile),
          );
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return functions;
  }

  public getLanguagePatterns(_languageId: string): {
    functionPattern: RegExp;
    importPattern: RegExp;
    exportPattern: RegExp;
  } {
    return {
      functionPattern: /function\s+\w+|=>\s*{|class\s+\w+/g,
      importPattern: /import\s+.*from\s+['"](.+)['"]/g,
      exportPattern: /\bexport\b\s*/,
    };
  }
}
