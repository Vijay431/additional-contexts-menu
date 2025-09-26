import * as vscode from 'vscode';

import { FunctionInfo } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Lightweight code analysis service that replaces Babel AST parsing
 * with regex-based function detection for significant bundle size reduction.
 *
 * Trade-offs:
 * - Much smaller bundle size (eliminates 500+ KB of Babel dependencies)
 * - Faster parsing for simple use cases
 * - Less accurate for complex nested functions and edge cases
 * - No full AST analysis capabilities
 */
export class CodeAnalysisService {
  private static instance: CodeAnalysisService;
  private logger: Logger;

  // Very simple, safe regex patterns for different function types
  private readonly patterns = {
    // Function declarations: function name() { ... }
    functionDeclaration: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,

    // Arrow functions: const name = () => ... | const name = async () => ...
    arrowFunction: /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,

    // Method definitions in classes/objects: methodName() { ... }
    methodDefinition: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,

    // Class methods: async methodName() { ... } or methodName() { ... }
    classMethod: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,

    // React components (functions that return JSX or have JSX in body)
    reactComponent: /(?:const|function)\s+([A-Z][a-zA-Z0-9_$]*)/g,

    // React hooks (functions starting with 'use')
    reactHook: /const\s+(use[A-Z][a-zA-Z0-9_$]*)\s*=/g,
  };

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
    position: vscode.Position,
  ): Promise<FunctionInfo | null> {
    try {
      const text = document.getText();

      // Find all functions in the document
      const functions = this.findAllFunctions(text, document.languageId);

      // Find the function that contains the cursor position
      const containingFunction = functions.find((func) =>
        this.isPositionInFunction(position, func, document),
      );

      if (containingFunction) {
        this.logger.debug('Function found at position', {
          name: containingFunction.name,
          type: containingFunction.type,
          line: containingFunction.startLine,
        });
      }

      return containingFunction ?? null;
    } catch (error) {
      this.logger.error('Error finding function at position', error);
      return null;
    }
  }

  private findAllFunctions(
    text: string,
    _languageId: string,
  ): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = text.split('\n');

    // Check each line for function patterns
    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;

      // Try each pattern type
      this.tryPatternMatch(
        this.patterns.functionDeclaration,
        line,
        lineNumber,
        'function',
        functions,
        lines,
      );
      this.tryPatternMatch(
        this.patterns.arrowFunction,
        line,
        lineNumber,
        'arrow',
        functions,
        lines,
      );
      this.tryPatternMatch(
        this.patterns.methodDefinition,
        line,
        lineNumber,
        'method',
        functions,
        lines,
      );
      this.tryPatternMatch(this.patterns.classMethod, line, lineNumber, 'method', functions, lines);

      // Check for React components (start with capital letter)
      if (this.isReactComponent(line, lines, lineIndex)) {
        const match = this.patterns.reactComponent.exec(line);
        if (match?.[2]) {
          functions.push(
            this.createFunctionInfo(
              match[2],
              'component',
              lineNumber,
              match[1] ?? '',
              lines,
              lineIndex,
            ),
          );
        }
      }

      // Check for React hooks (start with 'use')
      const hookMatch = this.patterns.reactHook.exec(line);
      if (hookMatch?.[2]) {
        functions.push(
          this.createFunctionInfo(
            hookMatch[2],
            'hook',
            lineNumber,
            hookMatch[1] ?? '',
            lines,
            lineIndex,
          ),
        );
      }

      // Reset regex state
      Object.values(this.patterns).forEach((pattern) => (pattern.lastIndex = 0));
    });

    return functions;
  }

  private tryPatternMatch(
    pattern: RegExp,
    line: string,
    lineNumber: number,
    type: FunctionInfo['type'],
    functions: FunctionInfo[],
    allLines: string[],
  ): void {
    pattern.lastIndex = 0; // Reset regex state
    const match = pattern.exec(line);

    if (match) {
      const indent = match[1] ?? '';
      const isAsync = match[2] === 'async' || match[3] === 'async';
      const functionName = match[3] ?? match[2];

      if (functionName) {
        const actualType = isAsync ? 'async' : type;
        functions.push(
          this.createFunctionInfo(
            functionName,
            actualType,
            lineNumber,
            indent,
            allLines,
            lineNumber - 1,
          ),
        );
      }
    }
  }

  private createFunctionInfo(
    name: string,
    type: FunctionInfo['type'],
    startLine: number,
    indent: string,
    allLines: string[],
    startIndex: number,
  ): FunctionInfo {
    // Find the end of the function by tracking braces
    const endInfo = this.findFunctionEnd(allLines, startIndex, indent.length);

    return {
      name,
      type,
      startLine,
      startColumn: indent.length,
      endLine: endInfo.endLine,
      endColumn: endInfo.endColumn,
      isExported: this.isExported(allLines[startIndex] ?? ''),
      hasDecorators: this.hasDecorators(allLines[startIndex] ?? ''),
      fullText: this.extractFunctionText(allLines, startIndex, endInfo.endLine),
    };
  }

  private findFunctionEnd(
    lines: string[],
    startIndex: number,
    _indentLevel: number,
  ): { endLine: number; endColumn: number } {
    let braceCount = 0;
    let foundFirstBrace = false;
    let endLine = startIndex + 1;
    let endColumn = 0;

    // For arrow functions, look for the opening brace or single expression
    const startLine = lines[startIndex];
    const isArrowFunction = startLine?.includes('=>');

    if (isArrowFunction && !startLine?.includes('{')) {
      // Single expression arrow function
      return { endLine: startIndex + 1, endColumn: lines[startIndex]?.length ?? 0 };
    }

    // Track braces to find function end
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (line) {
        for (let j = 0; j < line.length; j++) {
          if (line[j] === '{') {
            braceCount++;
            foundFirstBrace = true;
          } else if (line[j] === '}') {
            braceCount--;
            if (foundFirstBrace && braceCount === 0) {
              return { endLine: i + 1, endColumn: j + 1 };
            }
          }
        }
      }

      endLine = i + 1;
      endColumn = line?.length ?? 0;
    }

    return { endLine, endColumn };
  }

  private isPositionInFunction(
    position: vscode.Position,
    func: FunctionInfo,
    _document: vscode.TextDocument,
  ): boolean {
    const startPos = new vscode.Position(func.startLine - 1, func.startColumn ?? 0);
    const endPos = new vscode.Position((func.endLine ?? func.startLine) - 1, func.endColumn ?? 0);

    return position.isAfterOrEqual(startPos) && position.isBeforeOrEqual(endPos);
  }

  private isReactComponent(line: string, allLines: string[], lineIndex: number): boolean {
    // Check if function name starts with capital letter (React convention)
    const hasCapitalName = /(?:function|const)\s+[A-Z]\w+/.test(line);
    if (!hasCapitalName) {
      return false;
    }

    // Look for JSX return in the next few lines (simple heuristic)
    const searchLines = Math.min(allLines.length, lineIndex + 10);
    for (let i = lineIndex; i < searchLines; i++) {
      const currentLine = allLines[i];
      const nextLine = allLines[i + 1];
      if (
        currentLine?.includes('return') &&
        (currentLine.includes('<') || nextLine?.includes('<'))
      ) {
        return true;
      }
    }

    return false;
  }

  private isExported(line: string): boolean {
    return line.trim().startsWith('export');
  }

  private hasDecorators(line: string): boolean {
    // Look for decorators in the line or previous lines (simple check)
    return line.includes('@');
  }

  private extractFunctionText(lines: string[], startIndex: number, endLine: number): string {
    const functionLines = lines.slice(startIndex, endLine);
    return functionLines.join('\n');
  }

  public extractImports(
    code: string,
    _languageId: string,
  ): string[] {
    const imports: string[] = [];

    // Simple regex-based import extraction
    const importPattern = /^(\s*import\s+.+?;?\s*)$/gm;
    let match;

    while ((match = importPattern.exec(code)) !== null) {
      if (match[1]) {
        imports.push(match[1].trim());
      }
    }

    return imports;
  }
}
