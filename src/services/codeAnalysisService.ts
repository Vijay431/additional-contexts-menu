import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { FunctionInfo } from '../types/extension';
import { Logger } from '../utils/logger';

export class CodeAnalysisService {
  private static instance: CodeAnalysisService;
  private logger: Logger;
  private sourceText?: string;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CodeAnalysisService {
    if (!CodeAnalysisService.instance) {
      CodeAnalysisService.instance = new CodeAnalysisService();
    }
    return CodeAnalysisService.instance;
  }

  public async findFunctionAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<FunctionInfo | null> {
    try {
      const text = document.getText();
      this.sourceText = text; // Store for offset calculations
      const offset = document.offsetAt(position);

      // Parse the document
      const ast = this.parseCode(text, document.languageId);
      if (!ast) {
        return null;
      }

      // Find function containing the cursor position
      const functionInfo = this.findFunctionContainingOffset(ast, text, offset);

      if (functionInfo) {
        this.logger.debug('Function found at position', {
          name: functionInfo.name,
          type: functionInfo.type,
          line: functionInfo.startLine,
        });
      }

      return functionInfo;
    } catch (error) {
      this.logger.error('Error finding function at position', error);
      return null;
    }
  }

  private parseCode(code: string, languageId: string): t.File | null {
    try {
      const plugins: any[] = ['jsx'];

      // Add TypeScript plugin for .ts and .tsx files
      if (languageId === 'typescript' || languageId === 'typescriptreact') {
        plugins.push('typescript');
      }

      // Add additional plugins for modern JavaScript/TypeScript features
      plugins.push(
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'asyncGenerators',
        'bigInt',
        'optionalCatchBinding'
      );

      const ast = parse(code, {
        sourceType: 'module',
        plugins,
        errorRecovery: true,
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
      });

      return ast;
    } catch (error) {
      this.logger.warn('Failed to parse code with full feature set, trying simpler parse', error);

      try {
        // Fallback with minimal plugins
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
          errorRecovery: true,
        });
        return ast;
      } catch (fallbackError) {
        this.logger.error('Failed to parse code', fallbackError);
        return null;
      }
    }
  }

  private findFunctionContainingOffset(
    ast: t.File,
    sourceCode: string,
    offset: number
  ): FunctionInfo | null {
    let foundFunction: FunctionInfo | null = null;

    const traverse = (node: any, parent?: any) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      // Check if this node represents a function
      const functionInfo = this.extractFunctionInfo(node, sourceCode, parent);

      if (functionInfo && this.isOffsetInRange(offset, functionInfo)) {
        // If we found a more specific function (nested), prefer it
        if (
          !foundFunction ||
          functionInfo.startLine > foundFunction.startLine ||
          (functionInfo.startLine === foundFunction.startLine &&
            functionInfo.startColumn > foundFunction.startColumn)
        ) {
          foundFunction = functionInfo;
        }
      }

      // Recursively traverse child nodes
      for (const key in node) {
        if (key === 'parent' || key === 'leadingComments' || key === 'trailingComments') {
          continue;
        }

        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((item) => traverse(item, node));
        } else if (child && typeof child === 'object') {
          traverse(child, node);
        }
      }
    };

    traverse(ast);
    return foundFunction;
  }

  private extractFunctionInfo(
    node: any,
    sourceCode: string,
    parent?: any
  ): FunctionInfo | null {
    let functionInfo: Partial<FunctionInfo> = {};

    // Function declarations
    if (t.isFunctionDeclaration(node)) {
      const isReactComponent = this.isReactComponent(node, parent);
      functionInfo = {
        name: node.id?.name || 'anonymous',
        type: isReactComponent ? 'component' : (node.async ? 'async' : 'function'),
        isExported: this.isExported(node, parent),
      };
    }
    // Arrow functions and function expressions
    else if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
      const name = this.getVariableName(node, parent);
      const isReactComponent = this.isReactComponent(node, parent);
      const isReactHook = this.isReactHook(node, parent);
      
      let type: FunctionInfo['type'] = 'arrow';
      if (isReactComponent) {
        type = 'component';
      } else if (isReactHook) {
        type = 'hook';
      } else if (node.async) {
        type = 'async';
      }
      
      functionInfo = {
        name: name || 'anonymous',
        type,
        isExported: this.isExported(parent, parent?.parent),
      };
    }
    // Class methods
    else if (t.isClassMethod(node) || t.isObjectMethod(node)) {
      functionInfo = {
        name: this.getMethodName(node),
        type: 'method',
        isExported: this.isExported(parent, parent?.parent),
      };
    }

    if (!functionInfo.name) {
      return null;
    }

    // Get position information
    if (node.loc) {
      const startPos = node.loc.start;
      const endPos = node.loc.end;

      functionInfo.startLine = startPos.line;
      functionInfo.startColumn = startPos.column;
      functionInfo.endLine = endPos.line;
      functionInfo.endColumn = endPos.column;

      // Extract the full function text
      functionInfo.fullText = this.extractFunctionText(node, sourceCode, parent);
    }

    functionInfo.hasDecorators = this.hasDecorators(node);

    return functionInfo as FunctionInfo;
  }

  private getVariableName(_node: any, parent: any): string | null {
    if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
      return parent.id.name;
    }

    if (t.isAssignmentExpression(parent) && t.isIdentifier(parent.left)) {
      return parent.left.name;
    }

    if (t.isProperty(parent) && t.isIdentifier(parent.key)) {
      return parent.key.name;
    }

    return null;
  }

  private getMethodName(node: any): string {
    if (t.isIdentifier(node.key)) {
      return node.key.name;
    }
    if (t.isStringLiteral(node.key)) {
      return node.key.value;
    }
    return 'method';
  }

  private isExported(node: any, parent: any): boolean {
    // Check for export declarations
    return (
      t.isExportNamedDeclaration(parent) ||
      t.isExportDefaultDeclaration(parent) ||
      (parent && parent.type === 'Program' && t.isExportNamedDeclaration(node))
    );
  }

  private isReactComponent(node: any, _parent: any): boolean {
    if (
      !t.isArrowFunctionExpression(node) &&
      !t.isFunctionExpression(node) &&
      !t.isFunctionDeclaration(node)
    ) {
      return false;
    }

    // Check if function returns JSX
    if (node.body && t.isBlockStatement(node.body)) {
      // Look for return statements with JSX
      return this.hasJSXReturn(node.body);
    } else if (node.body && t.isJSXElement(node.body)) {
      return true;
    }

    return false;
  }

  private isReactHook(node: any, parent: any): boolean {
    const name = this.getVariableName(node, parent);
    return name ? name.startsWith('use') && name.length > 3 : false;
  }

  private hasJSXReturn(blockStatement: any): boolean {
    if (!blockStatement.body) {
      return false;
    }

    for (const statement of blockStatement.body) {
      if (t.isReturnStatement(statement) && statement.argument) {
        if (t.isJSXElement(statement.argument) || t.isJSXFragment(statement.argument)) {
          return true;
        }
      }
    }
    return false;
  }

  private hasDecorators(node: any): boolean {
    return node.decorators && node.decorators.length > 0;
  }

  private isOffsetInRange(offset: number, functionInfo: FunctionInfo): boolean {
    if (!functionInfo.startLine || !functionInfo.endLine) {
      return false;
    }
    
    // Get the source code to calculate offsets
    const sourceLines = this.sourceText?.split('\n') || [];
    
    let startOffset = 0;
    for (let i = 0; i < functionInfo.startLine - 1; i++) {
      startOffset += (sourceLines[i]?.length || 0) + 1; // +1 for newline
    }
    startOffset += functionInfo.startColumn || 0;
    
    let endOffset = 0;
    for (let i = 0; i < functionInfo.endLine - 1; i++) {
      endOffset += (sourceLines[i]?.length || 0) + 1; // +1 for newline
    }
    endOffset += functionInfo.endColumn || 0;
    
    return offset >= startOffset && offset <= endOffset;
  }

  private extractFunctionText(node: any, sourceCode: string, _parent?: any): string {
    if (!node.loc) {
      return '';
    }

    const lines = sourceCode.split('\n');
    const startLine = node.loc.start.line - 1; // Convert to 0-based
    const endLine = node.loc.end.line - 1;
    const startCol = node.loc.start.column;
    const endCol = node.loc.end.column;

    if (startLine === endLine) {
      return lines[startLine]?.substring(startCol, endCol) || '';
    }

    const result = [];
    result.push(lines[startLine]?.substring(startCol) || '');

    for (let i = startLine + 1; i < endLine; i++) {
      result.push(lines[i] || '');
    }

    result.push(lines[endLine]?.substring(0, endCol) || '');

    return result.join('\n');
  }

  public extractImports(code: string, languageId: string): string[] {
    try {
      const ast = this.parseCode(code, languageId);
      if (!ast) {
        return [];
      }

      const imports: string[] = [];

      for (const statement of ast.program.body) {
        if (t.isImportDeclaration(statement)) {
          // Find the import statement in the source code
          if (statement.loc) {
            const lines = code.split('\n');
            const startLine = statement.loc.start.line - 1;
            const endLine = statement.loc.end.line - 1;
            const startCol = statement.loc.start.column;
            const endCol = statement.loc.end.column;

            if (startLine === endLine) {
              imports.push(lines[startLine]?.substring(startCol, endCol) || '');
            } else {
              const importLines = [];
              importLines.push(lines[startLine]?.substring(startCol) || '');
              for (let i = startLine + 1; i < endLine; i++) {
                importLines.push(lines[i] || '');
              }
              importLines.push(lines[endLine]?.substring(0, endCol) || '');
              imports.push(importLines.join('\n'));
            }
          }
        }
      }

      return imports;
    } catch (error) {
      this.logger.error('Error extracting imports', error);
      return [];
    }
  }
}
