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

  /**
   * Private constructor to enforce singleton pattern.
   *
   * Initializes the logger instance for code analysis operations.
   */
  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Gets the singleton instance of the CodeAnalysisService.
   *
   * Creates a new instance on first call, returns the existing instance
   * on subsequent calls.
   *
   * @returns The singleton CodeAnalysisService instance
   */
  public static getInstance(): CodeAnalysisService {
    if (!CodeAnalysisService.instance) {
      CodeAnalysisService.instance = new CodeAnalysisService();
    }
    return CodeAnalysisService.instance;
  }

  /**
   * Finds the function containing the specified cursor position in a document.
   *
   * Parses the document to identify all functions and determines which function
   * contains the given position. Supports various function types including regular
   * functions, arrow functions, methods, React components, and React hooks.
   *
   * @param document - The VS Code text document to analyze
   * @param position - The cursor position to check
   * @returns The function information if found, null otherwise
   */
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

  /**
   * Finds all functions in the given text using regex pattern matching.
   *
   * Scans each line of the text for various function patterns including
   * function declarations, arrow functions, method definitions, React components,
   * and React hooks.
   *
   * @param text - The source code text to analyze
   * @param _languageId - The language identifier (currently unused)
   * @returns An array of function information objects
   */
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

  /**
   * Attempts to match a regex pattern against a line and create function info.
   *
   * If the pattern matches, extracts function details and creates a FunctionInfo
   * object, adding it to the functions array.
   *
   * @param pattern - The regex pattern to match
   * @param line - The line of text to check
   * @param lineNumber - The line number (1-indexed)
   * @param type - The function type to assign if matched
   * @param functions - Array to append found functions to
   * @param allLines - All lines in the document for context
   */
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

  /**
   * Creates a FunctionInfo object with complete function metadata.
   *
   * Determines the function's boundaries, checks for exports and decorators,
   * and extracts the full function text.
   *
   * @param name - The function name
   * @param type - The function type (e.g., 'function', 'arrow', 'method', 'component')
   * @param startLine - The starting line number (1-indexed)
   * @param indent - The indentation string at the start of the function
   * @param allLines - All lines in the document for context
   * @param startIndex - The starting line index (0-indexed)
   * @returns A complete FunctionInfo object
   */
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

  /**
   * Finds the end position of a function by tracking braces.
   *
   * Handles both regular functions with braces and single-expression arrow functions.
   * Tracks brace counting to determine the closing brace of the function.
   *
   * @param lines - All lines in the document
   * @param startIndex - The starting line index (0-indexed)
   * @param _indentLevel - The indentation level (currently unused)
   * @returns Object containing endLine and endColumn
   */
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

  /**
   * Checks if a position is within a function's boundaries.
   *
   * Compares the given position against the function's start and end
   * positions to determine if it falls within the function.
   *
   * @param position - The position to check
   * @param func - The function information to compare against
   * @param _document - The text document (currently unused)
   * @returns True if the position is within the function, false otherwise
   */
  private isPositionInFunction(
    position: vscode.Position,
    func: FunctionInfo,
    _document: vscode.TextDocument,
  ): boolean {
    const startPos = new vscode.Position(func.startLine - 1, func.startColumn ?? 0);
    const endPos = new vscode.Position((func.endLine ?? func.startLine) - 1, func.endColumn ?? 0);

    return position.isAfterOrEqual(startPos) && position.isBeforeOrEqual(endPos);
  }

  /**
   * Determines if a line represents a React component.
   *
   * Checks if the function name starts with a capital letter (React convention)
   * and looks for JSX return statements in the following lines.
   *
   * @param line - The line to check
   * @param allLines - All lines in the document
   * @param lineIndex - The index of the line to check
   * @returns True if this appears to be a React component, false otherwise
   */
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

  /**
   * Checks if a line contains an export statement.
   *
   * Determines if the function is exported by checking if the line
   * starts with 'export'.
   *
   * @param line - The line to check
   * @returns True if the line contains an export statement, false otherwise
   */
  private isExported(line: string): boolean {
    return line.trim().startsWith('export');
  }

  /**
   * Checks if a line contains decorators.
   *
   * Performs a simple check for the '@' character which indicates
   * the presence of decorators (TypeScript/ESNext feature).
   *
   * @param line - The line to check
   * @returns True if decorators are present, false otherwise
   */
  private hasDecorators(line: string): boolean {
    // Look for decorators in the line or previous lines (simple check)
    return line.includes('@');
  }

  /**
   * Extracts the full text of a function from the document.
   *
   * Joins all lines from the start index to the end line to create
   * the complete function text.
   *
   * @param lines - All lines in the document
   * @param startIndex - The starting line index (0-indexed)
   * @param endLine - The ending line number (1-indexed)
   * @returns The complete function text as a string
   */
  private extractFunctionText(lines: string[], startIndex: number, endLine: number): string {
    const functionLines = lines.slice(startIndex, endLine);
    return functionLines.join('\n');
  }

  /**
   * Extracts all import statements from the given code.
   *
   * Uses regex pattern matching to find all import statements in the code,
   * returning them as an array of strings.
   *
   * @param code - The source code to extract imports from
   * @param _languageId - The language identifier (currently unused)
   * @returns An array of import statement strings
   */
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
