import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface VueComposableImport {
  name: string;
  source: string;
  type:
    | 'ref'
    | 'reactive'
    | 'computed'
    | 'watch'
    | 'watchEffect'
    | 'onMounted'
    | 'onUnmounted'
    | 'onUpdated'
    | 'onBeforeMount'
    | 'onBeforeUnmount'
    | 'onBeforeUpdate'
    | 'custom';
}

export interface VueComposableExtracted {
  name: string;
  imports: VueComposableImport[];
  composableCode: string;
  importPath: string;
  returnedValues: string[];
}

export interface ReactiveVariable {
  name: string;
  type: 'ref' | 'reactive' | 'computed';
  initialValue?: string;
  typeAnnotation?: string;
}

export interface ComposableFunction {
  name: string;
  params: string[];
  body: string;
}

/**
 * Service for extracting Vue composition logic into composables
 */
export class VueComposableExtractionService {
  private static instance: VueComposableExtractionService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): VueComposableExtractionService {
    VueComposableExtractionService.instance ??= new VueComposableExtractionService();
    return VueComposableExtractionService.instance;
  }

  /**
   * Extracts selected Vue code into a composable
   */
  public async extractToComposable(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<VueComposableExtracted> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract imports
    const imports = this.extractImports(selectedText);

    // Extract reactive variables (refs, reactives, computeds)
    const reactiveVars = this.extractReactiveVariables(selectedText);

    // Extract functions
    const functions = this.extractFunctions(selectedText);

    // Extract lifecycle hooks
    const lifecycleHooks = this.extractLifecycleHooks(selectedText);

    // Extract watchers
    const watchers = this.extractWatchers(selectedText);

    // Determine what values to return from the composable
    const returnedValues = this.determineReturnedValues(reactiveVars, functions);

    // Generate composable name
    const composableName = await this.getComposableName();

    // Generate composable code
    const composableCode = this.generateComposableCode(
      composableName,
      selectedText,
      imports,
      reactiveVars,
      functions,
      lifecycleHooks,
      watchers,
      returnedValues,
    );

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, composableName);

    this.logger.info('Vue composable extracted', {
      composableName,
      refCount: reactiveVars.filter((v) => v.type === 'ref').length,
      reactiveCount: reactiveVars.filter((v) => v.type === 'reactive').length,
      computedCount: reactiveVars.filter((v) => v.type === 'computed').length,
      functionCount: functions.length,
      watcherCount: watchers.length,
    });

    return {
      name: composableName,
      imports,
      composableCode,
      importPath,
      returnedValues,
    };
  }

  /**
   * Extracts imports from the selected code
   */
  private extractImports(code: string): VueComposableImport[] {
    const imports: VueComposableImport[] = [];
    const seenImports = new Set<string>();

    // Pattern 1: Import from 'vue'
    const vueImportPattern = /import\s*{([^}]+)}\s*from\s*['"]vue['"]/g;
    let match: RegExpExecArray | null;
    while ((match = vueImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (!seenImports.has(item)) {
          seenImports.add(item);
          const type = this.getVueImportType(item);
          imports.push({ name: item, source: 'vue', type });
        }
      }
    }

    // Pattern 2: Named imports that might be Vue composables
    const namedImportPattern = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = namedImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const source = match[2];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (source !== 'vue' && !seenImports.has(item)) {
          seenImports.add(item);
          imports.push({ name: item, source, type: 'custom' });
        }
      }
    }

    return imports;
  }

  /**
   * Determines the type of a Vue import
   */
  private getVueImportType(importName: string): VueComposableImport['type'] {
    const reactiveTypes = ['ref', 'reactive', 'computed', 'watch', 'watchEffect'];
    const lifecycleTypes = [
      'onMounted',
      'onUnmounted',
      'onUpdated',
      'onBeforeMount',
      'onBeforeUnmount',
      'onBeforeUpdate',
      'onActivated',
      'onDeactivated',
      'onRenderTracked',
      'onRenderTriggered',
    ];

    if (reactiveTypes.includes(importName)) {
      if (importName === 'ref' || importName === 'reactive' || importName === 'computed') {
        return importName;
      }
      return importName === 'watch' || importName === 'watchEffect' ? importName : 'watch';
    }

    if (lifecycleTypes.includes(importName)) {
      return importName;
    }

    return 'custom';
  }

  /**
   * Extracts reactive variables from the code
   */
  private extractReactiveVariables(code: string): ReactiveVariable[] {
    const vars: ReactiveVariable[] = [];
    const seenVars = new Set<string>();

    // Pattern: const name = ref(...) or const name = reactive(...)
    const refPattern = /const\s+(\w+)\s*(?::\s*([^{=]+?))?\s*=\s*(ref|reactive|computed)</g;
    let match: RegExpExecArray | null;
    while ((match = refPattern.exec(code)) !== null) {
      const varName = match[1];
      const typeAnnotation = match[2]?.trim();
      const refType = match[3] as 'ref' | 'reactive' | 'computed';

      if (varName && !seenVars.has(varName) && !this.isReservedWord(varName)) {
        seenVars.add(varName);
        vars.push({
          name: varName,
          type: refType,
          typeAnnotation,
        });
      }
    }

    return vars;
  }

  /**
   * Extracts function definitions from the code
   */
  private extractFunctions(code: string): ComposableFunction[] {
    const functions: ComposableFunction[] = [];

    // Pattern 1: Regular function declarations
    const funcDeclPattern = /function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = funcDeclPattern.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: match[2] ? match[2].split(',').map((p) => p.trim()) : [],
        body: '',
      });
    }

    // Pattern 2: Const arrow functions
    const arrowFuncPattern =
      /const\s+(\w+)\s*(?::\s*([^=]+?))?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*(\w+))?\s*=>/g;
    while ((match = arrowFuncPattern.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: match[3] ? match[3].split(',').map((p) => p.trim()) : [],
        body: '',
      });
    }

    return functions;
  }

  /**
   * Extracts lifecycle hooks from the code
   */
  private extractLifecycleHooks(code: string): string[] {
    const hooks: string[] = [];
    const hookPattern =
      /on(Mounted|Unmounted|Updated|BeforeMount|BeforeUnmount|BeforeUpdate|Activated|Deactivated)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = hookPattern.exec(code)) !== null) {
      hooks.push(`on${match[1]}`);
    }
    return hooks;
  }

  /**
   * Extracts watchers from the code
   */
  private extractWatchers(code: string): string[] {
    const watchers: string[] = [];
    const seenWatchers = new Set<string>();

    // Pattern: watch(() => ..., ...) or watchEffect(...)
    const watchPattern = /(watch|watchEffect)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = watchPattern.exec(code)) !== null) {
      const watcher = match[1];
      if (!seenWatchers.has(watcher)) {
        seenWatchers.add(watcher);
        watchers.push(watcher);
      }
    }
    return watchers;
  }

  /**
   * Determines which values should be returned from the composable
   */
  private determineReturnedValues(
    reactiveVars: ReactiveVariable[],
    functions: ComposableFunction[],
  ): string[] {
    const values: string[] = [];

    // Return all reactive variables
    for (const v of reactiveVars) {
      values.push(v.name);
    }

    // Return all functions
    for (const f of functions) {
      values.push(f.name);
    }

    return values;
  }

  /**
   * Prompts user for composable name
   */
  private async getComposableName(): Promise<string> {
    const defaultName = 'useFeature';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter composable name (should start with "use")',
      placeHolder: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Composable name cannot be empty';
        }
        if (!/^use[A-Z]/.test(value)) {
          return 'Composable name must start with "use" followed by an uppercase letter (e.g., useFeature, useData)';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Composable name can only contain letters, numbers, $, or _';
        }
        return null;
      },
    });
    return input?.trim() || defaultName;
  }

  /**
   * Generates the composable TypeScript code
   */
  private generateComposableCode(
    composableName: string,
    _selectedCode: string,
    imports: VueComposableImport[],
    reactiveVars: ReactiveVariable[],
    _functions: ComposableFunction[],
    _lifecycleHooks: string[],
    _watchers: string[],
    returnedValues: string[],
  ): string {
    let code = '';

    // Add imports
    const vueImports = imports.filter((imp) => imp.source === 'vue');
    const customImports = imports.filter((imp) => imp.source !== 'vue');

    if (vueImports.length > 0) {
      code += `import { ${vueImports.map((imp) => imp.name).join(', ')} } from 'vue';\n`;
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

    // Add function signature with return type
    if (returnedValues.length > 0) {
      const returnTypes = returnedValues.join(', ');
      code += `export function ${composableName}(): { ${returnTypes} } {\n`;
    } else {
      code += `export function ${composableName}() {\n`;
    }

    // Add the user's code with proper indentation
    // Note: The actual extraction logic would preserve the original code
    // For now, we add a placeholder
    code += '  // Your extracted code here\n';

    // Add return statement if we have values to return
    if (returnedValues.length > 0) {
      code += '\n  return {\n';
      for (const value of returnedValues) {
        code += `    ${value},\n`;
      }
      code += '  };\n';
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
   * Calculates the relative import path for the new composable
   */
  private calculateImportPath(sourceFilePath: string, composableName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const composablesDir = path.join(sourceDir, 'composables');
    return path.join(composablesDir, `${composableName}.ts`);
  }

  /**
   * Creates the composable file at the specified path
   */
  public async createComposableFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write composable file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Vue composable file created', { filePath });
  }

  /**
   * Generates composable usage for Vue
   */
  public generateComposableUsage(
    composableName: string,
    returnedValues: string[],
    _originalCode: string,
  ): string {
    if (returnedValues.length === 0) {
      return `const { } = ${composableName}();`;
    }

    return `const { ${returnedValues.join(', ')} } = ${composableName}();`;
  }
}
