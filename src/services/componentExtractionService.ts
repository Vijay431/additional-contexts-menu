import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ExtractedComponent {
  name: string;
  props: PropInfo[];
  componentCode: string;
  importPath: string;
}

export interface PropInfo {
  name: string;
  typeName: string;
  isRequired: boolean;
}

/**
 * Service for extracting JSX/TSX code into a new React component
 */
export class ComponentExtractionService {
  private static instance: ComponentExtractionService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ComponentExtractionService {
    ComponentExtractionService.instance ??= new ComponentExtractionService();
    return ComponentExtractionService.instance;
  }

  /**
   * Extracts selected JSX code into a new component
   */
  public async extractToComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<ExtractedComponent> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract props
    const props = this.extractProps(selectedText);

    // Generate component name
    const componentName = await this.getComponentName();

    // Generate component code
    const componentCode = this.generateComponentCode(componentName, selectedText, props);

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentName);

    this.logger.info('Component extracted', { componentName, propsCount: props.length });

    return {
      name: componentName,
      props,
      componentCode,
      importPath,
    };
  }

  /**
   * Extracts props from JSX code by looking for curly brace expressions
   */
  private extractProps(jsxCode: string): PropInfo[] {
    const props: PropInfo[] = [];
    const propPattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;

    let match: RegExpExecArray | null;
    const seenProps = new Set<string>();

    while ((match = propPattern.exec(jsxCode)) !== null) {
      const propName = match[1];
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        props.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
        });
      }
    }

    // Also look for prop={value} patterns
    const propValuePattern = /(\w+)=\{([^}]+)\}/g;
    while ((match = propValuePattern.exec(jsxCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        // Try to infer type from the value
        const typeName = this.inferType(propValue);
        props.push({
          name: propName,
          typeName,
          isRequired: true,
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
   * Generates the component code with TypeScript interfaces
   */
  private generateComponentCode(componentName: string, jsxCode: string, props: PropInfo[]): string {
    let code = '';

    // Generate props interface if props exist
    if (props.length > 0) {
      const interfaceName = `${componentName}Props`;
      code += `interface ${interfaceName} {\n`;
      for (const prop of props) {
        const optional = prop.isRequired ? '' : '?';
        code += `  ${prop.name}${optional}: ${prop.typeName};\n`;
      }
      code += '}\n\n';
    }

    // Generate component function
    const interfaceName = props.length > 0 ? `${componentName}Props` : '';
    const generics = props.length > 0 ? `<${interfaceName}>` : '';

    code += `export const ${componentName}${generics} = (${props.length > 0 ? `{ ${props.map((p) => p.name).join(', ')} }` : ''}) => {\n`;
    code += `  return (\n${this.indentCode(jsxCode, 4)}\n  );\n`;
    code += '};\n';

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
    return path.join(componentsDir, `${componentName}.tsx`);
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
    this.logger.info('Component file created', { filePath });
  }

  /**
   * Replaces selection with component usage
   */
  public generateComponentUsage(
    componentName: string,
    props: PropInfo[],
    originalCode: string,
  ): string {
    if (props.length === 0) {
      return `<${componentName} />`;
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

    return `<${componentName} ${propsString} />`;
  }

  /**
   * Extracts prop values from original JSX code
   */
  private extractPropValues(jsxCode: string, props: PropInfo[]): Map<string, string> {
    const values = new Map<string, string>();

    // Match prop={value} patterns
    const propValuePattern = /(\w+)=\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = propValuePattern.exec(jsxCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && props.some((p) => p.name === propName)) {
        values.set(propName, propValue);
      }
    }

    // Match standalone {variable} patterns
    const standalonePattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
    while ((match = standalonePattern.exec(jsxCode)) !== null) {
      const varName = match[1];
      if (varName && props.some((p) => p.name === varName) && !values.has(varName)) {
        values.set(varName, varName);
      }
    }

    return values;
  }
}
