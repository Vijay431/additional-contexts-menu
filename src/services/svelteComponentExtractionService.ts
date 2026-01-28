import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SvelteExtractedComponent {
  name: string;
  props: SveltePropInfo[];
  componentCode: string;
  importPath: string;
}

export interface SveltePropInfo {
  name: string;
  typeName: string;
  isRequired: boolean;
  isReactive: boolean;
}

/**
 * Service for extracting Svelte code into a new component with Svelte 5 runes support
 */
export class SvelteComponentExtractionService {
  private static instance: SvelteComponentExtractionService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SvelteComponentExtractionService {
    SvelteComponentExtractionService.instance ??= new SvelteComponentExtractionService();
    return SvelteComponentExtractionService.instance;
  }

  /**
   * Extracts selected Svelte code into a new component
   */
  public async extractToComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<SvelteExtractedComponent> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract props
    const props = this.extractProps(selectedText);

    // Generate component name
    const componentName = await this.getComponentName();

    // Generate component code
    const componentCode = this.generateComponentCode(componentName, selectedText, props);

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentName);

    this.logger.info('Svelte component extracted', { componentName, propsCount: props.length });

    return {
      name: componentName,
      props,
      componentCode,
      importPath,
    };
  }

  /**
   * Extracts props from Svelte code by looking for curly brace expressions and Svelte patterns
   */
  private extractProps(svelteCode: string): SveltePropInfo[] {
    const props: SveltePropInfo[] = [];
    const seenProps = new Set<string>();

    // Pattern 1: {variable} - reactive variables
    const standalonePattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = standalonePattern.exec(svelteCode)) !== null) {
      const propName = match[1];
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        props.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
          isReactive: true,
        });
      }
    }

    // Pattern 2: prop={value} or prop={variable}
    const propValuePattern = /(\w+)=\{([^}]+)\}/g;
    while ((match = propValuePattern.exec(svelteCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        const typeName = this.inferType(propValue);
        props.push({
          name: propName,
          typeName,
          isRequired: true,
          isReactive: false,
        });
      }
    }

    // Pattern 3: {variable.property} - reactive properties
    const reactivePropertyPattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\.[a-zA-Z_$][a-zA-Z0-9_$]*\}/g;
    while ((match = reactivePropertyPattern.exec(svelteCode)) !== null) {
      const propName = match[1];
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        props.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
          isReactive: true,
        });
      }
    }

    return props;
  }

  /**
   * Infers TypeScript type from a value expression
   */
  private inferType(value: string): string {
    value = value.trim();

    // String literals
    if (value.startsWith("'") || value.startsWith('"') || value.startsWith('`')) {
      return 'string';
    }

    // Number literals
    if (/^\d+(\.\d+)?$/.test(value)) {
      return 'number';
    }

    // Boolean literals
    if (value === 'true' || value === 'false') {
      return 'boolean';
    }

    // Array literals
    if (value.startsWith('[')) {
      return 'any[]';
    }

    // Object literals
    if (value.startsWith('{')) {
      return 'Record<string, any>';
    }

    // Function calls or complex expressions
    if (value.includes('(') || value.includes('=>')) {
      return 'any';
    }

    // Default to any
    return 'any';
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
   * Prompts user for component name
   */
  private async getComponentName(): Promise<string> {
    const defaultName = 'NewComponent';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter component name',
      placeHolder: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Component name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Component name must start with uppercase letter and contain only letters, numbers, $, or _';
        }
        return null;
      },
    });
    return input?.trim() || defaultName;
  }

  /**
   * Generates the Svelte component code with Svelte 5 runes syntax
   */
  private generateComponentCode(
    componentName: string,
    svelteCode: string,
    props: SveltePropInfo[],
  ): string {
    let code = '';

    // Start with script tag using TypeScript
    code += `<script lang="ts">\n`;

    // Generate props interface if props exist
    if (props.length > 0) {
      const interfaceName = `${componentName}Props`;
      code += `\tinterface ${interfaceName} {\n`;
      for (const prop of props) {
        const optional = prop.isRequired ? '' : '?';
        code += `\t\t${prop.name}${optional}: ${prop.typeName};\n`;
      }
      code += '\t}\n\n';

      // Use Svelte 5 runes with let for props
      code += `\tlet { ${props.map((p) => p.name).join(', ')} }: ${componentName}Props = $props();\n`;
    }

    // Close script tag
    code += '</script>\n\n';

    // Add the template/markup
    code += this.indentCode(svelteCode, 0);

    // Add a basic style section (empty, but present for conventions)
    code += '\n\n<style>\n\t/* Add component styles here */\n</style>\n';

    return code;
  }

  /**
   * Indents code by specified number of spaces
   */
  private indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code
      .split('\n')
      .map((line) => (line.trim().length > 0 ? `${indent}${line}` : line))
      .join('\n');
  }

  /**
   * Calculates the relative import path for the new component
   */
  private calculateImportPath(sourceFilePath: string, componentName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const componentsDir = path.join(sourceDir, 'components');
    return path.join(componentsDir, `${componentName}.svelte`);
  }

  /**
   * Creates the component file at the specified path
   */
  public async createComponentFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write component file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Svelte component file created', { filePath });
  }

  /**
   * Generates component usage for Svelte
   */
  public generateComponentUsage(
    componentName: string,
    props: SveltePropInfo[],
    originalCode: string,
  ): string {
    // Convert PascalCase to kebab-case for Svelte component usage
    const kebabName = this.pascalToKebab(componentName);

    if (props.length === 0) {
      return `<${kebabName} />`;
    }

    // Extract prop values from original code if possible
    const propValues = this.extractPropValues(originalCode, props);
    const propsString = props
      .map((prop) => {
        const value = propValues.get(prop.name);
        if (value !== undefined) {
          return `${prop.name}={${value}}`;
        }
        return prop.isRequired ? `${prop.name}={${prop.name}}` : `${prop.name}={undefined}`;
      })
      .join(' ');

    return `<${kebabName} ${propsString} />`;
  }

  /**
   * Converts PascalCase to kebab-case
   */
  private pascalToKebab(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Extracts prop values from original Svelte code
   */
  private extractPropValues(svelteCode: string, props: SveltePropInfo[]): Map<string, string> {
    const values = new Map<string, string>();

    // Match prop={value} patterns
    const propValuePattern = /(\w+)=\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = propValuePattern.exec(svelteCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && props.some((p) => p.name === propName)) {
        values.set(propName, propValue);
      }
    }

    // Match standalone {variable} patterns
    const standalonePattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
    while ((match = standalonePattern.exec(svelteCode)) !== null) {
      const varName = match[1];
      if (varName && props.some((p) => p.name === varName) && !values.has(varName)) {
        values.set(varName, varName);
      }
    }

    return values;
  }
}
