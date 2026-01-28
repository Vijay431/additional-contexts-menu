import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface QwikComponentProps {
  name: string;
  typeName: string;
  isRequired: boolean;
}

export interface GeneratedQwikComponent {
  name: string;
  filePath: string;
  code: string;
  props: QwikComponentProps[];
  importPath: string;
}

/**
 * Service for generating Qwik components with TypeScript typing, $ symbols, and resumability
 */
export class QwikComponentGeneratorService {
  private static instance: QwikComponentGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): QwikComponentGeneratorService {
    QwikComponentGeneratorService.instance ??= new QwikComponentGeneratorService();
    return QwikComponentGeneratorService.instance;
  }

  /**
   * Generates a new Qwik component with user-specified options
   */
  public async generateComponent(
    document?: vscode.TextDocument,
    selection?: vscode.Selection,
  ): Promise<GeneratedQwikComponent> {
    // Get component name from user
    const componentName = await this.getComponentName();

    // Ask if component should have props
    const includeProps = await this.askForProps();
    let props: QwikComponentProps[] = [];

    if (includeProps) {
      props = await this.collectProps();
    }

    // Ask if component should use state
    const includeState = await this.askForState();
    const stateVars = includeState ? await this.collectStateVars() : [];

    // Ask if component should have event handlers
    const includeHandlers = await this.askForHandlers();
    const handlers = includeHandlers ? await this.collectHandlers() : [];

    // Generate component code
    const componentCode = this.generateComponentCode(
      componentName,
      props,
      stateVars,
      handlers,
    );

    // Calculate file path
    const sourcePath = document?.fileName || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.';
    const filePath = this.calculateFilePath(sourcePath, componentName);

    this.logger.info('Qwik component generated', {
      componentName,
      propsCount: props.length,
      stateVarsCount: stateVars.length,
      handlersCount: handlers.length,
    });

    return {
      name: componentName,
      filePath,
      code: componentCode,
      props,
      importPath: this.calculateImportPath(sourcePath, componentName),
    };
  }

  /**
   * Extracts selected code and creates a Qwik component from it
   */
  public async extractToComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<GeneratedQwikComponent> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract props
    const props = this.extractPropsFromCode(selectedText);

    // Generate component name
    const componentName = await this.getComponentName();

    // Generate component code
    const componentCode = this.generateComponentCode(
      componentName,
      props,
      [], // No state vars for extracted components
      [], // No handlers for extracted components
      selectedText,
    );

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentName);
    const filePath = this.calculateFilePath(document.fileName, componentName);

    this.logger.info('Qwik component extracted', {
      componentName,
      propsCount: props.length,
    });

    return {
      name: componentName,
      filePath,
      code: componentCode,
      props,
      importPath,
    };
  }

  /**
   * Extracts props from JSX/TSX code by looking for curly brace expressions
   */
  private extractPropsFromCode(code: string): QwikComponentProps[] {
    const props: QwikComponentProps[] = [];
    const seenProps = new Set<string>();

    // Pattern for {variable} or {prop.name}
    const standalonePattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = standalonePattern.exec(code)) !== null) {
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

    // Pattern for prop={value}
    const propValuePattern = /(\w+)=\{([^}]+)\}/g;
    while ((match = propValuePattern.exec(code)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
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
    const defaultName = 'MyComponent';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter component name (PascalCase)',
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
   * Asks if component should have props
   */
  private async askForProps(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Add props to the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Collects props from user
   */
  private async collectProps(): Promise<QwikComponentProps[]> {
    const props: QwikComponentProps[] = [];
    let addingProps = true;

    while (addingProps) {
      const propName = await vscode.window.showInputBox({
        prompt: 'Enter prop name',
        placeHolder: 'myProp',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Prop name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Prop name must start with lowercase letter';
          }
          if (props.some((p) => p.name === value)) {
            return 'Prop name already exists';
          }
          return null;
        },
      });

      if (!propName) {
        break;
      }

      const typeName = await vscode.window.showInputBox({
        prompt: 'Enter prop type',
        placeHolder: 'string',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Type cannot be empty';
          }
          return null;
        },
      });

      const isRequiredChoice = await vscode.window.showQuickPick(['Required', 'Optional'], {
        placeHolder: 'Is this prop required?',
      });

      props.push({
        name: propName.trim(),
        typeName: typeName?.trim() || 'any',
        isRequired: isRequiredChoice === 'Required',
      });

      const continueChoice = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Add another prop?',
      });

      addingProps = continueChoice === 'Yes';
    }

    return props;
  }

  /**
   * Asks if component should use state
   */
  private async askForState(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Add state to the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Collects state variables from user
   */
  private async collectStateVars(): Promise<string[]> {
    const stateVars: string[] = [];
    let addingVars = true;

    while (addingVars) {
      const varName = await vscode.window.showInputBox({
        prompt: 'Enter state variable name',
        placeHolder: 'count',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Variable name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Variable name must start with lowercase letter';
          }
          if (stateVars.some((v) => v === value)) {
            return 'Variable name already exists';
          }
          return null;
        },
      });

      if (!varName) {
        break;
      }

      stateVars.push(varName.trim());

      const continueChoice = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Add another state variable?',
      });

      addingVars = continueChoice === 'Yes';
    }

    return stateVars;
  }

  /**
   * Asks if component should have event handlers
   */
  private async askForHandlers(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Add event handlers to the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Collects event handlers from user
   */
  private async collectHandlers(): Promise<string[]> {
    const handlers: string[] = [];
    let addingHandlers = true;

    while (addingHandlers) {
      const handlerName = await vscode.window.showInputBox({
        prompt: 'Enter handler name (e.g., onClick, onSubmit)',
        placeHolder: 'onClick',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Handler name cannot be empty';
          }
          if (!/^on[A-Z][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Handler name must start with "on" followed by uppercase letter (e.g., onClick, onSubmit)';
          }
          if (handlers.some((h) => h === value)) {
            return 'Handler name already exists';
          }
          return null;
        },
      });

      if (!handlerName) {
        break;
      }

      handlers.push(handlerName.trim());

      const continueChoice = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Add another handler?',
      });

      addingHandlers = continueChoice === 'Yes';
    }

    return handlers;
  }

  /**
   * Generates the Qwik component code with proper $ symbols and resumability
   */
  private generateComponentCode(
    componentName: string,
    props: QwikComponentProps[],
    stateVars: string[],
    handlers: string[],
    extractedCode?: string,
  ): string {
    let code = '';

    // Start with imports
    code += `import { component$ } from '@builder.io/qwik';\n`;
    if (props.length > 0) {
      code += `import type { PropsOf } from '@builder.io/qwik';\n`;
    }
    if (stateVars.length > 0) {
      code += `import { useSignal } from '@builder.io/qwik';\n`;
    }
    if (handlers.length > 0) {
      code += `import { $ } from '@builder.io/qwik';\n`;
    }
    code += '\n';

    // Generate props interface if props exist
    if (props.length > 0) {
      const interfaceName = `${componentName}Props`;
      code += `export interface ${interfaceName} {\n`;
      for (const prop of props) {
        const optional = prop.isRequired ? '' : '?';
        code += `  ${prop.name}${optional}: ${prop.typeName};\n`;
      }
      code += '}\n\n';
    }

    // Generate component with $ symbol for component$
    code += `export const ${componentName} = component$((`;
    if (props.length > 0) {
      code += `props: ${componentName}Props`;
    }
    code += `) => {\n`;

    // Add state variables with useSignal
    if (stateVars.length > 0) {
      code += '\n';
      for (const stateVar of stateVars) {
        code += `  const ${stateVar} = useSignal(${this.getDefaultValueForType('any')});\n`;
      }
    }

    // Add event handlers with $ wrapper
    if (handlers.length > 0) {
      code += '\n';
      for (const handler of handlers) {
        const handlerFunc = handler.replace(/^on/, '');
        const camelCase = handlerFunc.charAt(0).toLowerCase() + handlerFunc.slice(1);
        code += `  const ${handler} = $(() => {\n`;
        code += `    // TODO: Implement ${handler} logic\n`;
        code += `    console.log('${handler} triggered');\n`;
        code += `  });\n`;
      }
    }

    // Generate JSX/TSX return
    code += '\n  return (\n';
    code += '    <div>\n';

    if (extractedCode) {
      // Use extracted code
      const indentedCode = this.indentCode(extractedCode, 6);
      code += indentedCode + '\n';
    } else {
      // Default template
      code += '      <h1>' + componentName + '</h1>\n';

      // Display props if any
      if (props.length > 0) {
        code += '      {/* Props */}\n';
        for (const prop of props) {
          code += `      <div>{props.${prop.name}}</div>\n`;
        }
      }

      // Display state if any
      if (stateVars.length > 0) {
        code += '      {/* State */}\n';
        for (const stateVar of stateVars) {
          code += `      <div>{${stateVar}.value}</div>\n`;
        }
      }

      // Add button handlers if any
      if (handlers.some((h) => h.startsWith('onClick'))) {
        code += '      {/* Event Handlers */}\n';
        code += '      <button onClick$={onClick}>Click me</button>\n';
      }
    }

    code += '    </div>\n';
    code += '  );\n';
    code += '});\n';

    return code;
  }

  /**
   * Gets default value for a type
   */
  private getDefaultValueForType(typeName: string): string {
    switch (typeName.toLowerCase()) {
      case 'string':
        return "''";
      case 'number':
        return '0';
      case 'boolean':
        return 'false';
      case 'array':
      case 'any[]':
        return '[]';
      case 'object':
      case 'record':
        return '{}';
      default:
        return 'undefined';
    }
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
   * Calculates the file path for the new component
   */
  private calculateFilePath(sourcePath: string, componentName: string): string {
    const sourceDir = path.dirname(sourcePath);
    const componentsDir = path.join(sourceDir, 'components');
    return path.join(componentsDir, `${componentName}.tsx`);
  }

  /**
   * Calculates the relative import path for the new component
   */
  private calculateImportPath(sourceFilePath: string, componentName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const componentsDir = path.join(sourceDir, 'components');
    return path.join(componentsDir, `${componentName}`);
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
    this.logger.info('Qwik component file created', { filePath });
  }

  /**
   * Generates component usage for Qwik
   */
  public generateComponentUsage(
    componentName: string,
    props: QwikComponentProps[],
  ): string {
    if (props.length === 0) {
      return `<${componentName} />`;
    }

    const propsString = props
      .map((prop) => {
        const value = prop.isRequired ? `{${prop.name}}` : `{${prop.name}=undefined}`;
        return `    ${prop.name}=${value}`;
      })
      .join('\n');

    return `<${componentName}\n${propsString}\n  />`;
  }
}
