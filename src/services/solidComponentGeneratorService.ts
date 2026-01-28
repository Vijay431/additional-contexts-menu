import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SolidComponentProps {
  name: string;
  typeName: string;
  isRequired: boolean;
}

export interface GeneratedSolidComponent {
  name: string;
  filePath: string;
  code: string;
  props: SolidComponentProps[];
  importPath: string;
}

/**
 * Service for generating SolidJS components with TypeScript typing, reactive signals, and JSX
 */
export class SolidComponentGeneratorService {
  private static instance: SolidComponentGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SolidComponentGeneratorService {
    SolidComponentGeneratorService.instance ??= new SolidComponentGeneratorService();
    return SolidComponentGeneratorService.instance;
  }

  /**
   * Generates a new SolidJS component with user-specified options
   */
  public async generateComponent(
    document?: vscode.TextDocument,
    selection?: vscode.Selection,
  ): Promise<GeneratedSolidComponent> {
    // Get component name from user
    const componentName = await this.getComponentName();

    // Ask if component should have props
    const includeProps = await this.askForProps();
    let props: SolidComponentProps[] = [];

    if (includeProps) {
      props = await this.collectProps();
    }

    // Ask if component should use signals
    const includeSignals = await this.askForSignals();
    const signals = includeSignals ? await this.collectSignals() : [];

    // Ask if component should have memos
    const includeMemos = await this.askForMemos();
    const memos = includeMemos ? await this.collectMemos() : [];

    // Ask if component should have event handlers
    const includeHandlers = await this.askForHandlers();
    const handlers = includeHandlers ? await this.collectHandlers() : [];

    // Ask if component should use lifecycle methods
    const includeLifecycle = await this.askForLifecycle();
    const lifecycleMethods = includeLifecycle ? await this.collectLifecycleMethods() : [];

    // Ask if component should use context
    const includeContext = await this.askForContext();
    const useContextValue = includeContext ? await this.askContextName() : undefined;

    // Generate component code
    const componentCode = this.generateComponentCode(
      componentName,
      props,
      signals,
      memos,
      handlers,
      lifecycleMethods,
      useContextValue,
    );

    // Calculate file path
    const sourcePath = document?.fileName || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.';
    const filePath = this.calculateFilePath(sourcePath, componentName);

    this.logger.info('SolidJS component generated', {
      componentName,
      propsCount: props.length,
      signalsCount: signals.length,
      memosCount: memos.length,
      handlersCount: handlers.length,
      lifecycleMethodsCount: lifecycleMethods.length,
      useContext: !!useContextValue,
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
   * Extracts selected code and creates a SolidJS component from it
   */
  public async extractToComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<GeneratedSolidComponent> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract props
    const props = this.extractPropsFromCode(selectedText);

    // Generate component name
    const componentName = await this.getComponentName();

    // Generate component code
    const componentCode = this.generateComponentCode(
      componentName,
      props,
      [], // No signals for extracted components
      [], // No memos for extracted components
      [], // No handlers for extracted components
      [], // No lifecycle for extracted components
      undefined, // No context for extracted components
      selectedText,
    );

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentName);
    const filePath = this.calculateFilePath(document.fileName, componentName);

    this.logger.info('SolidJS component extracted', {
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
  private extractPropsFromCode(code: string): SolidComponentProps[] {
    const props: SolidComponentProps[] = [];
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
  private async collectProps(): Promise<SolidComponentProps[]> {
    const props: SolidComponentProps[] = [];
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
   * Asks if component should use signals
   */
  private async askForSignals(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Add signals to the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Collects signals from user
   */
  private async collectSignals(): Promise<Array<{ name: string; typeName: string }>> {
    const signals: Array<{ name: string; typeName: string }> = [];
    let addingSignals = true;

    while (addingSignals) {
      const signalName = await vscode.window.showInputBox({
        prompt: 'Enter signal name',
        placeHolder: 'count',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Signal name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Signal name must start with lowercase letter';
          }
          if (signals.some((s) => s.name === value)) {
            return 'Signal name already exists';
          }
          return null;
        },
      });

      if (!signalName) {
        break;
      }

      const typeName = await vscode.window.showInputBox({
        prompt: 'Enter signal type',
        placeHolder: 'number',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Type cannot be empty';
          }
          return null;
        },
      });

      signals.push({
        name: signalName.trim(),
        typeName: typeName?.trim() || 'any',
      });

      const continueChoice = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Add another signal?',
      });

      addingSignals = continueChoice === 'Yes';
    }

    return signals;
  }

  /**
   * Asks if component should have memos
   */
  private async askForMemos(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Add memos to the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Collects memos from user
   */
  private async collectMemos(): Promise<string[]> {
    const memos: string[] = [];
    let addingMemos = true;

    while (addingMemos) {
      const memoName = await vscode.window.showInputBox({
        prompt: 'Enter memo name',
        placeHolder: 'doubledCount',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Memo name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Memo name must start with lowercase letter';
          }
          if (memos.some((m) => m === value)) {
            return 'Memo name already exists';
          }
          return null;
        },
      });

      if (!memoName) {
        break;
      }

      memos.push(memoName.trim());

      const continueChoice = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Add another memo?',
      });

      addingMemos = continueChoice === 'Yes';
    }

    return memos;
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
   * Asks if component should use lifecycle methods
   */
  private async askForLifecycle(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Add lifecycle methods to the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Collects lifecycle methods from user
   */
  private async collectLifecycleMethods(): Promise<string[]> {
    const options = [
      'onMount',
      'onCleanup',
      'onError',
    ];
    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select lifecycle methods',
      canPickMany: true,
    });
    return selected || [];
  }

  /**
   * Asks if component should use context
   */
  private async askForContext(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Use context in the component?',
    });
    return choice === 'Yes';
  }

  /**
   * Asks for context name
   */
  private async askContextName(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter context name',
      placeHolder: 'MyContext',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Context name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Context name must start with uppercase letter';
        }
        return null;
      },
    });
  }

  /**
   * Generates the SolidJS component code with proper reactivity
   */
  private generateComponentCode(
    componentName: string,
    props: SolidComponentProps[],
    signals: Array<{ name: string; typeName: string }>,
    memos: string[],
    handlers: string[],
    lifecycleMethods: string[],
    useContextValue?: string,
    extractedCode?: string,
  ): string {
    let code = '';

    // Start with imports
    code += `import { `;
    const imports: string[] = ['Component'];
    if (signals.length > 0) {
      imports.push('createSignal');
    }
    if (memos.length > 0) {
      imports.push('createMemo');
    }
    if (lifecycleMethods.includes('onMount')) {
      imports.push('onMount');
    }
    if (lifecycleMethods.includes('onCleanup')) {
      imports.push('onCleanup');
    }
    if (lifecycleMethods.includes('onError')) {
      imports.push('onError');
    }
    if (useContextValue) {
      imports.push('useContext');
    }
    code += imports.join(', ');
    code += ` } from 'solid-js';\n`;

    if (useContextValue) {
      code += `import { ${useContextValue} } from '../context/${useContextValue}';\n`;
    }
    code += '\n';

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
    code += `const ${componentName}: Component<`;
    if (props.length > 0) {
      code += `${componentName}Props`;
    } else {
      code += '{}';
    }
    code += `> = (`;
    if (props.length > 0) {
      code += `props`;
    }
    code += `) => {\n`;

    // Add context usage
    if (useContextValue) {
      code += `  const context = useContext(${useContextValue});\n\n`;
    }

    // Add signals
    if (signals.length > 0) {
      code += '  // Signals\n';
      for (const signal of signals) {
        code += `  const [${signal.name}, set${this.capitalize(signal.name)}] = createSignal(${this.getDefaultValueForType(signal.typeName)});\n`;
      }
      code += '\n';
    }

    // Add memos
    if (memos.length > 0) {
      code += '  // Memos\n';
      for (const memo of memos) {
        code += `  const ${memo} = createMemo(() => {\n`;
        code += `    // TODO: Implement ${memo} logic\n`;
        code += `    return ${signals.length > 0 ? signals[0].name + '()' : 'undefined'};\n`;
        code += `  });\n`;
      }
      code += '\n';
    }

    // Add lifecycle methods
    if (lifecycleMethods.length > 0) {
      code += '  // Lifecycle\n';
      for (const method of lifecycleMethods) {
        if (method === 'onMount') {
          code += `  onMount(() => {\n`;
          code += `    console.log('${componentName} mounted');\n`;
          code += `    // TODO: Setup effects, subscriptions, etc.\n`;
          code += `  });\n\n`;
        } else if (method === 'onCleanup') {
          code += `  onCleanup(() => {\n`;
          code += `    console.log('${componentName} cleanup');\n`;
          code += `    // TODO: Cleanup resources\n`;
          code += `  });\n\n`;
        } else if (method === 'onError') {
          code += `  onError((err) => {\n`;
          code += `    console.error('${componentName} error:', err);\n`;
          code += `  });\n\n`;
        }
      }
    }

    // Add event handlers
    if (handlers.length > 0) {
      code += '  // Event Handlers\n';
      for (const handler of handlers) {
        code += `  const ${handler} = (event: Event) => {\n`;
        code += `    // TODO: Implement ${handler} logic\n`;
        code += `    console.log('${handler} triggered');\n`;
        code += `  };\n`;
      }
      code += '\n';
    }

    // Generate JSX return
    code += '  return (\n';
    code += '    <div>\n';

    if (extractedCode) {
      // Use extracted code
      const indentedCode = this.indentCode(extractedCode, 6);
      code += indentedCode + '\n';
    } else {
      // Default template
      code += `      <h1>${componentName}</h1>\n`;

      // Display props if any
      if (props.length > 0) {
        code += '      {/* Props */}\n';
        for (const prop of props) {
          code += `      <div>{props.${prop.name}}</div>\n`;
        }
      }

      // Display signals if any
      if (signals.length > 0) {
        code += '      {/* Signals */}\n';
        for (const signal of signals) {
          code += `      <div>{${signal.name}()}</div>\n`;
        }
      }

      // Display memos if any
      if (memos.length > 0) {
        code += '      {/* Memos */}\n';
        for (const memo of memos) {
          code += `      <div>{${memo}()}</div>\n`;
        }
      }

      // Add button handlers if any
      if (handlers.some((h) => h.startsWith('onClick'))) {
        code += '      {/* Event Handlers */}\n';
        code += '      <button onClick={onClick}>Click me</button>\n';
      }
    }

    code += '    </div>\n';
    code += '  );\n';
    code += '};\n\n';

    code += `export default ${componentName};\n`;

    return code;
  }

  /**
   * Capitalizes the first letter of a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    this.logger.info('SolidJS component file created', { filePath });
  }

  /**
   * Generates component usage for SolidJS
   */
  public generateComponentUsage(
    componentName: string,
    props: SolidComponentProps[],
  ): string {
    if (props.length === 0) {
      return `<${componentName} />`;
    }

    const propsString = props
      .map((prop) => {
        const value = prop.isRequired ? `{props.${prop.name}}` : `{props.${prop.name}=undefined}`;
        return `    ${prop.name}=${value}`;
      })
      .join('\n');

    return `<${componentName}\n${propsString}\n  />`;
  }
}
