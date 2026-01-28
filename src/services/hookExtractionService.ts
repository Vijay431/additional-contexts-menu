import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface HookImport {
  name: string;
  source: string;
  type:
    | 'useState'
    | 'useEffect'
    | 'useContext'
    | 'useReducer'
    | 'useMemo'
    | 'useCallback'
    | 'useRef'
    | 'useCallback'
    | 'custom';
}

export interface ExtractedHook {
  name: string;
  imports: HookImport[];
  hookCode: string;
  importPath: string;
  parameters: HookParameter[];
  returnedValues: string[];
}

export interface HookParameter {
  name: string;
  typeName: string;
  isRequired: boolean;
  defaultValue?: string;
}

export interface StateVariable {
  name: string;
  type: 'state' | 'ref' | 'memo' | 'reducer';
  typeAnnotation?: string;
}

export interface EffectHook {
  dependencyCount: number;
  cleanupPresent: boolean;
}

/**
 * Service for extracting React stateful logic into custom hooks
 */
export class HookExtractionService {
  private static instance: HookExtractionService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): HookExtractionService {
    HookExtractionService.instance ??= new HookExtractionService();
    return HookExtractionService.instance;
  }

  /**
   * Extracts selected React code into a custom hook
   */
  public async extractToHook(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<ExtractedHook> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract imports
    const imports = this.extractImports(selectedText);

    // Extract state variables (useState, useRef, useMemo)
    const stateVars = this.extractStateVariables(selectedText);

    // Extract effect hooks (useEffect, useLayoutEffect)
    const effects = this.extractEffects(selectedText);

    // Extract callbacks and memos (useCallback, useMemo)
    const callbacks = this.extractCallbacks(selectedText);

    // Extract context usage
    const contexts = this.extractContexts(selectedText);

    // Extract custom hook calls
    const customHooks = this.extractCustomHooks(selectedText);

    // Infer hook parameters from dependencies and props
    const parameters = this.inferParameters(selectedText, stateVars, effects);

    // Determine what values to return from the hook
    const returnedValues = this.determineReturnedValues(stateVars, callbacks, customHooks);

    // Generate hook name
    const hookName = await this.getHookName();

    // Generate hook code
    const hookCode = this.generateHookCode(
      hookName,
      selectedText,
      imports,
      stateVars,
      effects,
      callbacks,
      contexts,
      customHooks,
      parameters,
      returnedValues,
    );

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, hookName);

    this.logger.info('React hook extracted', {
      hookName,
      stateCount: stateVars.length,
      effectCount: effects.length,
      callbackCount: callbacks.length,
      contextCount: contexts.length,
    });

    return {
      name: hookName,
      imports,
      hookCode,
      importPath,
      parameters,
      returnedValues,
    };
  }

  /**
   * Extracts imports from the selected code
   */
  private extractImports(code: string): HookImport[] {
    const imports: HookImport[] = [];
    const seenImports = new Set<string>();

    // Pattern 1: Import from 'react'
    const reactImportPattern = /import\s*{([^}]+)}\s*from\s*['"]react['"]/g;
    let match: RegExpExecArray | null;
    while ((match = reactImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (!seenImports.has(item)) {
          seenImports.add(item);
          const type = this.getReactImportType(item);
          imports.push({ name: item, source: 'react', type });
        }
      }
    }

    // Pattern 2: Named imports that might be custom hooks
    const namedImportPattern = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = namedImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const source = match[2];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (source !== 'react' && !seenImports.has(item)) {
          seenImports.add(item);
          // Check if it's a custom hook
          const type = item.startsWith('use') ? 'custom' : 'custom';
          imports.push({ name: item, source, type });
        }
      }
    }

    return imports;
  }

  /**
   * Determines the type of a React import
   */
  private getReactImportType(importName: string): HookImport['type'] {
    const hookTypes = [
      'useState',
      'useEffect',
      'useContext',
      'useReducer',
      'useMemo',
      'useCallback',
      'useRef',
      'useLayoutEffect',
      'useImperativeHandle',
      'useDebugValue',
      'useDeferredValue',
      'useTransition',
      'useId',
      'useSyncExternalStore',
    ];

    if (hookTypes.includes(importName)) {
      if (importName === 'useState') {
        return 'useState';
      }
      if (importName === 'useEffect' || importName === 'useLayoutEffect') {
        return 'useEffect';
      }
      if (importName === 'useContext') {
        return 'useContext';
      }
      if (importName === 'useReducer') {
        return 'useReducer';
      }
      if (importName === 'useMemo' || importName === 'useCallback') {
        return importName;
      }
      if (importName === 'useRef') {
        return 'useRef';
      }
    }

    return 'custom';
  }

  /**
   * Extracts state variables from the code
   */
  private extractStateVariables(code: string): StateVariable[] {
    const vars: StateVariable[] = [];
    const seenVars = new Set<string>();

    // Pattern: const [state, setState] = useState(...) or const ref = useRef(...)
    const statePattern =
      /const\s+(\[?)(\w+)(\]?)\s*(?::\s*([^{=]+?))?\s*=\s*(useState|useRef|useMemo|useReducer)/g;
    let match: RegExpExecArray | null;
    while ((match = statePattern.exec(code)) !== null) {
      const isArray = match[1] === '[';
      const varName = match[2];
      const hasClosing = match[3] === ']';
      const typeAnnotation = match[4]?.trim();
      const hookType = match[5];

      if (varName && !seenVars.has(varName) && !this.isReservedWord(varName)) {
        seenVars.add(varName);

        let type: 'state' | 'ref' | 'memo' | 'reducer' = 'state';
        if (hookType === 'useRef') {
          type = 'ref';
        } else if (hookType === 'useMemo') {
          type = 'memo';
        } else if (hookType === 'useReducer') {
          type = 'reducer';
        }

        vars.push({
          name: varName,
          type,
          typeAnnotation: isArray ? undefined : typeAnnotation,
        });
      }
    }

    return vars;
  }

  /**
   * Extracts effect hooks from the code
   */
  private extractEffects(code: string): EffectHook[] {
    const effects: EffectHook[] = [];

    // Pattern: useEffect(() => {}, [...]) or useLayoutEffect(() => {}, [...])
    const effectPattern =
      /use(?:Effect|LayoutEffect)\s*\(\s*\([^)]*\)\s*=>\s*{[^}]*}\s*,\s*\[([^\]]*)\]/g;
    let match: RegExpExecArray | null;
    while ((match = effectPattern.exec(code)) !== null) {
      const dependencies = match[1];
      const depArray = dependencies ? dependencies.split(',').map((d) => d.trim()) : [];
      effects.push({
        dependencyCount: depArray.length,
        cleanupPresent: code.includes('return ()'),
      });
    }

    return effects;
  }

  /**
   * Extracts callbacks and memos from the code
   */
  private extractCallbacks(code: string): string[] {
    const callbacks: string[] = [];
    const seenCallbacks = new Set<string>();

    // Pattern: const callback = useCallback(...) or const value = useMemo(...)
    const callbackPattern = /const\s+(\w+)\s*(?::\s*[^=]+?)?\s*=\s*(useCallback|useMemo)/g;
    let match: RegExpExecArray | null;
    while ((match = callbackPattern.exec(code)) !== null) {
      const name = match[1];
      if (name && !seenCallbacks.has(name)) {
        seenCallbacks.add(name);
        callbacks.push(name);
      }
    }

    return callbacks;
  }

  /**
   * Extracts context usage from the code
   */
  private extractContexts(code: string): string[] {
    const contexts: string[] = [];
    const seenContexts = new Set<string>();

    // Pattern: const context = useContext(ContextName)
    const contextPattern = /const\s+(\w+)\s*(?::\s*[^=]+?)?\s*=\s*useContext\s*\(\s*(\w+)\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = contextPattern.exec(code)) !== null) {
      const name = match[1];
      const contextName = match[2];
      if (name && contextName && !seenContexts.has(contextName)) {
        seenContexts.add(contextName);
        contexts.push(contextName);
      }
    }

    return contexts;
  }

  /**
   * Extracts custom hook calls from the code
   */
  private extractCustomHooks(code: string): string[] {
    const hooks: string[] = [];
    const seenHooks = new Set<string>();

    // Pattern: const value = useCustomHook(...)
    const hookPattern = /const\s+(\[?\w+\]?)\s*(?::\s*[^=]+?)?\s*=\s*(use[A-Z]\w+)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = hookPattern.exec(code)) !== null) {
      const hookName = match[3];
      if (hookName && !seenHooks.has(hookName)) {
        seenHooks.add(hookName);
        hooks.push(hookName);
      }
    }

    return hooks;
  }

  /**
   * Infers hook parameters from dependencies and external references
   */
  private inferParameters(
    code: string,
    _stateVars: StateVariable[],
    effects: EffectHook[],
  ): HookParameter[] {
    const params: HookParameter[] = [];
    const seenParams = new Set<string>();

    // Extract potential parameters from dependency arrays
    const depPattern = /\[([^\]]+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = depPattern.exec(code)) !== null) {
      const deps = match[1].split(',').map((d) => d.trim());
      for (const dep of deps) {
        // Skip if it's a primitive value or not a valid identifier
        if (!dep || /['"`]|^\d+$/.test(dep) || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(dep)) {
          continue;
        }

        // Skip if it's a React hook or reserved word
        if (dep.startsWith('use') || this.isReservedWord(dep)) {
          continue;
        }

        // Add as a parameter
        if (!seenParams.has(dep)) {
          seenParams.add(dep);
          params.push({
            name: dep,
            typeName: 'any',
            isRequired: true,
          });
        }
      }
    }

    // If there are effects with dependencies, the hook might need parameters
    if (effects.length > 0 && params.length === 0) {
      // Add a generic dependency parameter if none were found
      params.push({
        name: 'deps',
        typeName: 'any[]',
        isRequired: false,
        defaultValue: '[]',
      });
    }

    return params;
  }

  /**
   * Determines which values should be returned from the hook
   */
  private determineReturnedValues(
    stateVars: StateVariable[],
    callbacks: string[],
    customHooks: string[],
  ): string[] {
    const values: string[] = [];

    // Return all state variables
    for (const v of stateVars) {
      values.push(v.name);
    }

    // Return all callbacks
    for (const c of callbacks) {
      values.push(c);
    }

    // Return custom hook results (simplified - just return the hook names)
    for (const h of customHooks) {
      values.push(h);
    }

    return values;
  }

  /**
   * Prompts user for hook name
   */
  private async getHookName(): Promise<string> {
    const defaultName = 'useCustomHook';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter custom hook name (should start with "use")',
      placeHolder: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Hook name cannot be empty';
        }
        if (!/^use[A-Z]/.test(value)) {
          return 'Hook name must start with "use" followed by an uppercase letter (e.g., useFeature, useData)';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Hook name can only contain letters, numbers, $, or _';
        }
        return null;
      },
    });
    return input?.trim() || defaultName;
  }

  /**
   * Generates the custom hook TypeScript code
   */
  private generateHookCode(
    hookName: string,
    selectedCode: string,
    imports: HookImport[],
    stateVars: StateVariable[],
    effects: EffectHook[],
    callbacks: string[],
    contexts: string[],
    customHooks: string[],
    parameters: HookParameter[],
    returnedValues: string[],
  ): string {
    let code = '';

    // Add imports
    const reactImports = imports.filter((imp) => imp.source === 'react');
    const customImports = imports.filter((imp) => imp.source !== 'react');

    if (reactImports.length > 0) {
      code += `import { ${reactImports.map((imp) => imp.name).join(', ')} } from 'react';\n`;
    }

    if (customImports.length > 0) {
      // Group custom imports by source
      const importsBySource = new Map<string, string[]>();
      for (const imp of customImports) {
        const items = importsBySource.get(imp.source) ?? [];
        items.push(imp.name);
        importsBySource.set(imp.source, items);
      }

      for (const [source, items] of importsBySource) {
        code += `import { ${items.join(', ')} } from '${source}';\n`;
      }
    }

    if (imports.length > 0) {
      code += '\n';
    }

    // Add TypeScript type for parameters if there are any
    if (parameters.length > 0) {
      const interfaceName = `${hookName}Params`;
      code += `interface ${interfaceName} {\n`;
      for (const param of parameters) {
        const optional = param.isRequired ? '' : '?';
        const defaultVal = param.defaultValue ? ` = ${param.defaultValue}` : '';
        code += `  ${param.name}${optional}: ${param.typeName};\n`;
      }
      code += '}\n\n';
    }

    // Add function signature
    if (parameters.length > 0) {
      const interfaceName = `${hookName}Params`;
      const paramsStr = parameters.map((p) => p.name).join(', ');
      code += `export function ${hookName}(${paramsStr}: ${interfaceName}) {\n`;
    } else {
      code += `export function ${hookName}() {\n`;
    }

    // Add the user's code with proper indentation
    // Preserve the original selected code
    const indentedCode = this.indentCode(selectedCode, 2);
    code += indentedCode + '\n';

    // Add return statement if we have values to return
    if (returnedValues.length > 0) {
      // Build return object
      if (returnedValues.length === 1) {
        code += `\n  return ${returnedValues[0]};\n`;
      } else {
        code += '\n  return {\n';
        for (const value of returnedValues) {
          code += `    ${value},\n`;
        }
        code += '  };\n';
      }
    }

    code += '}\n';

    return code;
  }

  /**
   * Checks if a word is a reserved JavaScript keyword
   */
  private isReservedWord(word: string): boolean {
    const reserved = new Set([
      'undefined',
      'null',
      'true',
      'false',
      'NaN',
      'Infinity',
      'this',
      'super',
      'class',
      'extends',
      'import',
      'export',
      'return',
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'break',
      'continue',
      'try',
      'catch',
      'finally',
      'throw',
      'new',
      'typeof',
      'instanceof',
      'void',
      'delete',
      'in',
      'of',
      'const',
      'let',
      'var',
      'function',
      'async',
      'await',
      'yield',
    ]);
    return reserved.has(word);
  }

  /**
   * Indents code by specified number of spaces
   */
  private indentCode(code: string, spaces: number): string {
    const lines = code.split('\n');
    const indent = ' '.repeat(spaces);
    return lines
      .map((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 ? `${indent}${line}` : line;
      })
      .join('\n');
  }

  /**
   * Calculates the relative import path for the new hook
   */
  private calculateImportPath(sourceFilePath: string, hookName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const hooksDir = path.join(sourceDir, 'hooks');
    return path.join(hooksDir, `${hookName}.ts`);
  }

  /**
   * Creates the hook file at the specified path
   */
  public async createHookFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write hook file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Hook file created', { filePath });
  }

  /**
   * Generates hook usage for React
   */
  public generateHookUsage(
    hookName: string,
    returnedValues: string[],
    _originalCode: string,
  ): string {
    if (returnedValues.length === 0) {
      return `${hookName}();`;
    }

    if (returnedValues.length === 1) {
      return `const ${returnedValues[0]} = ${hookName}();`;
    }

    return `const { ${returnedValues.join(', ')} } = ${hookName}();`;
  }

  /**
   * Checks if code contains React hooks
   */
  public containsReactHooks(code: string): boolean {
    const hookPatterns = [
      /\buseState\s*\(/,
      /\buseEffect\s*\(/,
      /\buseContext\s*\(/,
      /\buseReducer\s*\(/,
      /\buseMemo\s*\(/,
      /\buseCallback\s*\(/,
      /\buseRef\s*\(/,
      /\buseLayoutEffect\s*\(/,
      /\buseImperativeHandle\s*\(/,
      /\buseDebugValue\s*\(/,
      /\buseDeferredValue\s*\(/,
      /\buseTransition\s*\(/,
      /\buseId\s*\(/,
      /\buseSyncExternalStore\s*\(/,
    ];

    return hookPatterns.some((pattern) => pattern.test(code));
  }
}
