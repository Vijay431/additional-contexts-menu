import * as path from 'path';
import * as vscode from 'vscode';

import {
  type GeneratedNuxtComposable,
  type NuxtComposableFunction,
  type NuxtComposableImport,
  type NuxtComposableReturn,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating Nuxt 3 composables with auto-imports, TypeScript typing, and SSR support
 */
export class NuxtComposableGeneratorService {
  private static instance: NuxtComposableGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NuxtComposableGeneratorService {
    NuxtComposableGeneratorService.instance ??= new NuxtComposableGeneratorService();
    return NuxtComposableGeneratorService.instance;
  }

  /**
   * Main entry point for generating a Nuxt composable
   */
  public async generateComposable(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<GeneratedNuxtComposable> {
    const config = vscode.workspace
      .getConfiguration('additionalContextMenus')
      .get<any>('nuxtComposableGenerator', {
        enabled: true,
        includeTypeScript: true,
        includeAutoImports: true,
        includeSSRSupport: true,
        includeContextHandling: true,
        generateReturnType: true,
        defaultComposableDirectory: 'composables',
        addJSDocComments: true,
        includeAsyncReturnType: true,
        generateHelpers: false,
      });

    const selectedText = document.getText(selection);

    // Get composable name from user
    const composableName = await this.getComposableName();

    // Analyze the selected code
    const imports = this.extractImports(selectedText);
    const functions = this.extractFunctions(selectedText);
    const returns = this.extractReturns(selectedText, functions);

    // Check for async operations
    const hasAsyncOperations = this.detectAsyncOperations(selectedText, functions);

    // Generate the composable code
    const composableCode = this.generateComposableCode(
      composableName,
      selectedText,
      imports,
      functions,
      returns,
      hasAsyncOperations,
      config,
    );

    // Calculate file path
    const workspaceRoot = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ?? '';
    const composablesDir = path.join(workspaceRoot, config.defaultComposableDirectory);
    const filePath = path.join(composablesDir, `${composableName}.ts`);

    this.logger.info('Nuxt composable generated', {
      composableName,
      hasSSRSupport: config.includeSSRSupport,
      hasAsyncOperations,
      functionCount: functions.length,
      returnCount: returns.length,
    });

    return {
      name: composableName,
      composableCode,
      filePath,
      imports,
      returns,
      functions,
      hasSSRSupport: config.includeSSRSupport,
      hasAsyncOperations,
    };
  }

  /**
   * Extracts imports from the selected code
   */
  private extractImports(code: string): NuxtComposableImport[] {
    const imports: NuxtComposableImport[] = [];
    const seenImports = new Set<string>();

    // Vue imports
    const vueImportPattern = /import\s*{([^}]+)}\s*from\s*['"]vue['"]/g;
    let match: RegExpExecArray | null;
    while ((match = vueImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (!seenImports.has(item)) {
          seenImports.add(item);
          imports.push({
            name: item,
            source: 'vue',
            type: this.getVueImportType(item),
            isNuxtSpecific: false,
          });
        }
      }
    }

    // Nuxt-specific imports (#app)
    const nuxtImportPattern = /import\s*{([^}]+)}\s*from\s*['"]#app['"]/g;
    while ((match = nuxtImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (!seenImports.has(item)) {
          seenImports.add(item);
          imports.push({
            name: item,
            source: '#app',
            type: this.getNuxtImportType(item),
            isNuxtSpecific: true,
          });
        }
      }
    }

    // @nuxt/kit imports
    const kitImportPattern = /import\s*{([^}]+)}\s*from\s*['"]@nuxt\/kit['"]/g;
    while ((match = kitImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (!seenImports.has(item)) {
          seenImports.add(item);
          imports.push({ name: item, source: '@nuxt/kit', type: 'custom', isNuxtSpecific: true });
        }
      }
    }

    // @vueuse/core imports
    const vueuseImportPattern = /import\s*{([^}]+)}\s*from\s*['"]@vueuse\/core['"]/g;
    while ((match = vueuseImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const items = importList.split(',').map((s) => s.trim());
      for (const item of items) {
        if (!seenImports.has(item)) {
          seenImports.add(item);
          imports.push({
            name: item,
            source: '@vueuse/core',
            type: 'custom',
            isNuxtSpecific: false,
          });
        }
      }
    }

    // Other custom imports
    const customImportPattern = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = customImportPattern.exec(code)) !== null) {
      const importList = match[1];
      const source = match[2];
      // Skip vue, #app, @nuxt/kit, @vueuse/core as they're already handled
      if (!['vue', '#app', '@nuxt/kit', '@vueuse/core'].includes(source)) {
        const items = importList.split(',').map((s) => s.trim());
        for (const item of items) {
          if (!seenImports.has(item)) {
            seenImports.add(item);
            imports.push({
              name: item,
              source: 'custom' as const,
              type: 'custom',
              isNuxtSpecific: false,
            });
          }
        }
      }
    }

    return imports;
  }

  /**
   * Determines the type of a Vue import
   */
  private getVueImportType(importName: string): NuxtComposableImport['type'] {
    const reactiveTypes = [
      'ref',
      'reactive',
      'computed',
      'watch',
      'watchEffect',
      'onMounted',
      'onUnmounted',
    ];

    if (reactiveTypes.includes(importName)) {
      if (importName === 'ref' || importName === 'reactive' || importName === 'computed') {
        return importName;
      }
      return importName === 'watch' || importName === 'watchEffect' ? importName : 'custom';
    }

    if (importName.startsWith('on')) {
      return importName as 'onMounted' | 'onUnmounted';
    }

    return 'custom';
  }

  /**
   * Determines the type of a Nuxt import
   */
  private getNuxtImportType(importName: string): NuxtComposableImport['type'] {
    const nuxtTypes = [
      'useAsyncData',
      'useFetch',
      'useState',
      'useLazyAsyncData',
      'useRoute',
      'useRouter',
    ];

    if (nuxtTypes.includes(importName)) {
      return importName as NuxtComposableImport['type'];
    }

    return 'custom';
  }

  /**
   * Extracts functions from the selected code
   */
  private extractFunctions(code: string): NuxtComposableFunction[] {
    const functions: NuxtComposableFunction[] = [];

    // Regular function declarations
    const funcDeclPattern = /function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = funcDeclPattern.exec(code)) !== null) {
      functions.push({
        name: match[1],
        parameters: this.parseParameters(match[2]),
        returnType: match[3] || 'void',
        isAsync: false,
        body: '',
      });
    }

    // Async function declarations
    const asyncFuncDeclPattern = /async\s+function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?\s*\{/g;
    while ((match = asyncFuncDeclPattern.exec(code)) !== null) {
      functions.push({
        name: match[1],
        parameters: this.parseParameters(match[2]),
        returnType: match[3] || 'Promise<void>',
        isAsync: true,
        body: '',
      });
    }

    // Const arrow functions
    const arrowFuncPattern =
      /const\s+(\w+)\s*(?::\s*([^=]+?))?\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*(\w+))?\s*=>/g;
    while ((match = arrowFuncPattern.exec(code)) !== null) {
      const fullMatch = match[0];
      const isAsync = fullMatch.includes('async ');
      functions.push({
        name: match[1],
        parameters: this.parseParameters(match[3]),
        returnType: match[4] || 'void',
        isAsync,
        body: '',
      });
    }

    return functions;
  }

  /**
   * Parses function parameters
   */
  private parseParameters(
    paramString: string,
  ): Array<{ name: string; type: string; isOptional: boolean; defaultValue?: string }> {
    if (!paramString.trim()) {
      return [];
    }

    const params: Array<{
      name: string;
      type: string;
      isOptional: boolean;
      defaultValue?: string;
    }> = [];

    // Split by comma, but handle complex types
    const paramList = paramString.split(',').map((p) => p.trim());

    for (const param of paramList) {
      if (!param) continue;

      // Match patterns like: name, name: type, name?: type, name = value, name: type = value
      const paramMatch = param.match(/^(\w+)(?:\s*:\s*([^\s=]+))?(?:\s*=\s*(.+))?$/);

      if (paramMatch) {
        const name = paramMatch[1];
        const type = paramMatch[2] || 'any';
        const defaultValue = paramMatch[3];
        const isOptional = param.includes('?') || param.includes('=');

        params.push({ name, type, isOptional, defaultValue });
      }
    }

    return params;
  }

  /**
   * Extracts return values from the code
   */
  private extractReturns(
    code: string,
    functions: NuxtComposableFunction[],
  ): NuxtComposableReturn[] {
    const returns: NuxtComposableReturn[] = [];
    const seenReturns = new Set<string>();

    // Extract ref/reactive/computed declarations
    const reactivePattern = /const\s+(\w+)\s*(?::\s*([^{=]+?))?\s*=\s*(ref|reactive|computed)</g;
    let match: RegExpExecArray | null;
    while ((match = reactivePattern.exec(code)) !== null) {
      const name = match[1];
      if (!seenReturns.has(name)) {
        seenReturns.add(name);
        returns.push({
          name,
          type: match[2]?.trim() || 'Ref<unknown>',
          isRequired: true,
        });
      }
    }

    // Extract useState declarations (Nuxt-specific)
    const useStatePattern = /const\s+(\w+)\s*=\s*useState\s*\(/g;
    while ((match = useStatePattern.exec(code)) !== null) {
      const name = match[1];
      if (!seenReturns.has(name)) {
        seenReturns.add(name);
        returns.push({
          name,
          type: 'Ref<unknown>',
          isRequired: true,
        });
      }
    }

    // Add all functions as returns
    for (const func of functions) {
      if (!seenReturns.has(func.name)) {
        seenReturns.add(func.name);
        returns.push({
          name: func.name,
          type: func.isAsync ? `Promise<${func.returnType}>` : func.returnType,
          isRequired: true,
        });
      }
    }

    return returns;
  }

  /**
   * Detects if the code contains async operations
   */
  private detectAsyncOperations(code: string, functions: NuxtComposableFunction[]): boolean {
    // Check for async functions
    if (functions.some((f) => f.isAsync)) {
      return true;
    }

    // Check for async keywords
    if (code.includes('await ')) {
      return true;
    }

    // Check for Promise-related patterns
    if (code.includes('.then(') || code.includes('Promise.') || code.includes('async ')) {
      return true;
    }

    // Check for Nuxt async composables
    if (
      code.includes('useAsyncData') ||
      code.includes('useFetch') ||
      code.includes('useLazyAsyncData')
    ) {
      return true;
    }

    return false;
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
    selectedCode: string,
    imports: NuxtComposableImport[],
    functions: NuxtComposableFunction[],
    returns: NuxtComposableReturn[],
    hasAsyncOperations: boolean,
    config: any,
  ): string {
    let code = '';

    // Add file header comment if JSDoc is enabled
    if (config.addJSDocComments) {
      code += `/**\n`;
      code += ` * ${composableName} - Nuxt 3 composable\n`;
      if (config.includeSSRSupport) {
        code += ` * @remarks This composable works on both client and server\n`;
      }
      if (hasAsyncOperations) {
        code += ` * @remarks Contains async operations\n`;
      }
      code += ` */\n`;
    }

    // Add imports
    const vueImports = imports.filter((imp) => imp.source === 'vue');
    const nuxtImports = imports.filter((imp) => imp.source === '#app');
    const otherImports = imports.filter((imp) => imp.source !== 'vue' && imp.source !== '#app');

    // Vue imports
    if (vueImports.length > 0 && config.includeAutoImports) {
      code += `import { ${vueImports.map((imp) => imp.name).join(', ')} } from 'vue';\n`;
    }

    // Nuxt imports
    if (nuxtImports.length > 0 && config.includeAutoImports) {
      code += `import { ${nuxtImports.map((imp) => imp.name).join(', ')} } from '#app';\n`;
    }

    // Other imports
    if (otherImports.length > 0) {
      const importsBySource = new Map<string, string[]>();
      for (const imp of otherImports) {
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

    // Generate return type if enabled
    let returnTypeAnnotation = '';
    if (config.generateReturnType && returns.length > 0) {
      const returnTypes = returns.map((r) => {
        const optional = r.isRequired ? '' : '?';
        return `  ${r.name}${optional}: ${r.type}`;
      });
      returnTypeAnnotation = `: {\n${returnTypes.join(',\n')}\n}`;
    }

    // Function signature
    code += `export function ${composableName}${returnTypeAnnotation} {\n`;

    // Add process.client check if SSR support is enabled and code needs it
    if (config.includeSSRSupport && config.includeContextHandling) {
      code += `  // Ensure code runs only on client side if needed\n`;
      code += `  // Remove this check if your composable should work on both sides\n`;
      code += `  if (import.meta.client) {\n`;
    }

    // Indent the user's code
    const indentedCode = selectedCode
      .split('\n')
      .map((line) =>
        config.includeSSRSupport && config.includeContextHandling ? `    ${line}` : `  ${line}`,
      )
      .join('\n');

    code += indentedCode;

    // Add process.client check closing
    if (config.includeSSRSupport && config.includeContextHandling) {
      code += `\n  }\n`;
    }

    // Add return statement if we have values to return
    if (returns.length > 0) {
      code += '\n';
      if (config.includeSSRSupport && config.includeContextHandling) {
        code += '  ';
      }
      code += 'return {\n';
      for (const ret of returns) {
        if (config.includeSSRSupport && config.includeContextHandling) {
          code += '    ';
        } else {
          code += '  ';
        }
        code += `${ret.name},\n`;
      }
      if (config.includeSSRSupport && config.includeContextHandling) {
        code += '  ';
      } else {
        code += '  ';
      }
      code += '};\n';
    }

    code += '}\n';

    return code;
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
    this.logger.info('Nuxt composable file created', { filePath });
  }

  /**
   * Generates composable usage for Nuxt components
   */
  public generateComposableUsage(composableName: string, returns: NuxtComposableReturn[]): string {
    if (returns.length === 0) {
      return `${composableName}();`;
    }

    const returnNames = returns.map((r) => r.name).join(', ');
    return `const { ${returnNames} } = ${composableName}();`;
  }

  /**
   * Validates if a composable name follows Nuxt conventions
   */
  public validateComposableName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Composable name cannot be empty' };
    }
    if (!/^use[A-Z]/.test(name)) {
      return {
        valid: false,
        error: 'Composable name must start with "use" followed by an uppercase letter',
      };
    }
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return { valid: false, error: 'Composable name can only contain letters, numbers, $, or _' };
    }
    return { valid: true };
  }
}
