import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface AngularExtractedComponent {
  name: string;
  inputs: AngularPropInfo[];
  outputs: AngularPropInfo[];
  componentFiles: AngularComponentFiles;
  importPath: string;
  selector: string;
}

export interface AngularPropInfo {
  name: string;
  typeName: string;
  isRequired: boolean;
  alias?: string;
}

export interface AngularComponentFiles {
  typescript: string;
  template: string;
  styles: string;
}

/**
 * Service for extracting Angular template code into a new component
 * Supports both standalone and module-based components
 */
export class AngularComponentExtractionService {
  private static instance: AngularComponentExtractionService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): AngularComponentExtractionService {
    AngularComponentExtractionService.instance ??= new AngularComponentExtractionService();
    return AngularComponentExtractionService.instance;
  }

  /**
   * Extracts selected Angular template code into a new component
   */
  public async extractToComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<AngularExtractedComponent> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract inputs and outputs
    const { inputs, outputs } = this.extractProps(selectedText);

    // Generate component name
    const componentName = await this.getComponentName();

    // Ask if standalone or module-based
    const isStandalone = await this.askComponentType();

    // Generate selector
    const selector = this.generateSelector(componentName);

    // Generate component files
    const componentFiles = this.generateComponentFiles(
      componentName,
      selector,
      selectedText,
      inputs,
      outputs,
      isStandalone,
    );

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentName);

    this.logger.info('Angular component extracted', {
      componentName,
      inputsCount: inputs.length,
      outputsCount: outputs.length,
      isStandalone,
    });

    return {
      name: componentName,
      inputs,
      outputs,
      componentFiles,
      importPath,
      selector,
    };
  }

  /**
   * Extracts inputs and outputs from Angular template code
   */
  private extractProps(angularCode: string): {
    inputs: AngularPropInfo[];
    outputs: AngularPropInfo[];
  } {
    const inputs: AngularPropInfo[] = [];
    const outputs: AngularPropInfo[] = [];
    const seenProps = new Set<string>();

    // Pattern 1: [property]="value" - property binding (inputs)
    const propBindingPattern = /\[([a-zA-Z_$][a-zA-Z0-9_$]*)\](?:\s*=\s*"([^"]*)")?/g;
    let match: RegExpExecArray | null;
    while ((match = propBindingPattern.exec(angularCode)) !== null) {
      const propName = match[1];
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        inputs.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
        });
      }
    }

    // Pattern 2: [(ngModel)]="value" - two-way binding (both input and output)
    const twoWayPattern = /\[\([a-zA-Z_$][a-zA-Z0-9_$]*\)\](?:\s*=\s*"([^"]*)")?/g;
    while ((match = twoWayPattern.exec(angularCode)) !== null) {
      const fullMatch = match[0];
      const propName = fullMatch.slice(2, -2); // Extract between [( and )]
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        inputs.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
        });
        outputs.push({
          name: `${propName}Change`,
          typeName: 'any',
          isRequired: false,
        });
        seenProps.add(`${propName}Change`);
      }
    }

    // Pattern 3: (event)="handler" - event binding (outputs)
    const eventBindingPattern = /\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)(?:\s*=\s*"([^"]*)")?/g;
    while ((match = eventBindingPattern.exec(angularCode)) !== null) {
      const eventName = match[1];
      if (eventName && !seenProps.has(eventName)) {
        seenProps.add(eventName);
        outputs.push({
          name: eventName,
          typeName: 'any',
          isRequired: false,
        });
      }
    }

    // Pattern 4: *ngIf, *ngFor, *ngSwitch, etc. - structural directives (inputs)
    const structuralDirectivePattern = /\*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = structuralDirectivePattern.exec(angularCode)) !== null) {
      const directiveName = match[1];
      if (directiveName && !seenProps.has(directiveName)) {
        seenProps.add(directiveName);
        inputs.push({
          name: directiveName,
          typeName: 'any',
          isRequired: false,
        });
      }
    }

    // Pattern 5: {{variable}} - interpolation (potential inputs)
    const interpolationPattern = /\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g;
    while ((match = interpolationPattern.exec(angularCode)) !== null) {
      const varName = match[1];
      if (varName && !seenProps.has(varName) && !this.isReservedWord(varName)) {
        seenProps.add(varName);
        inputs.push({
          name: varName,
          typeName: 'any',
          isRequired: true,
        });
      }
    }

    return { inputs, outputs };
  }

  /**
   * Checks if a word is a reserved TypeScript/JavaScript keyword
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
      'ngIf',
      'ngFor',
      'ngForOf',
      'ngForTrackBy',
      'ngSwitch',
      'ngSwitchCase',
      'ngSwitchDefault',
      'ngTemplateOutlet',
      'ngComponentOutlet',
    ]);
    return reserved.has(word);
  }

  /**
   * Prompts user for component name
   */
  private async getComponentName(): Promise<string> {
    const defaultName = 'NewComponent';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter component name (e.g., UserProfile, DataTable)',
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
   * Asks user whether to create a standalone or module-based component
   */
  private async askComponentType(): Promise<boolean> {
    const standalone = await vscode.window.showQuickPick(
      [
        {
          label: 'Standalone Component',
          description: 'Recommended for Angular 15+. No module required.',
          value: true,
        },
        {
          label: 'Module-based Component',
          description: 'Traditional approach. Requires module declaration.',
          value: false,
        },
      ],
      {
        placeHolder: 'Select component type',
        title: 'Angular Component Type',
      },
    );

    return standalone?.value ?? true; // Default to standalone
  }

  /**
   * Generates Angular component selector from component name
   * Converts PascalCase to kebab-case with app- prefix
   */
  private generateSelector(componentName: string): string {
    const kebabCase = componentName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    return `app-${kebabCase}`;
  }

  /**
   * Generates Angular component files (TypeScript, template, and styles)
   */
  private generateComponentFiles(
    componentName: string,
    selector: string,
    templateCode: string,
    inputs: AngularPropInfo[],
    outputs: AngularPropInfo[],
    isStandalone: boolean,
  ): AngularComponentFiles {
    // Generate TypeScript component file
    const typescript = this.generateTypeScriptFile(
      componentName,
      selector,
      inputs,
      outputs,
      isStandalone,
    );

    // Generate template file
    const template = this.generateTemplateFile(templateCode);

    // Generate styles file
    const styles = this.generateStylesFile();

    return {
      typescript,
      template,
      styles,
    };
  }

  /**
   * Generates the TypeScript component file
   */
  private generateTypeScriptFile(
    componentName: string,
    selector: string,
    inputs: AngularPropInfo[],
    outputs: AngularPropInfo[],
    isStandalone: boolean,
  ): string {
    let code = `import { Component${inputs.length > 0 ? ', Input' : ''}${outputs.length > 0 ? ', Output' : ''}${outputs.length > 0 ? ', EventEmitter' : ''} } from '@angular/core';\n`;

    if (isStandalone) {
      code += `import { CommonModule } from '@angular/common';\n\n`;
    }

    code += `@Component({\n`;
    code += `  selector: '${selector}',\n`;
    code += `  standalone: ${isStandalone},\n`;
    if (isStandalone) {
      code += `  imports: [CommonModule],\n`;
    }
    code += `  templateUrl: './${componentName}.component.html',\n`;
    code += `  styleUrl: './${componentName}.component.css',\n`;
    code += `})\n`;
    code += `export class ${componentName}Component {\n`;

    // Add inputs
    if (inputs.length > 0) {
      code += '\n';
      for (const input of inputs) {
        const optional = input.isRequired ? '' : '?';
        const alias = input.alias ? `, { alias: '${input.alias}' }` : '';
        code += `  @Input()${alias} ${input.name}${optional}: ${input.typeName};\n`;
      }
    }

    // Add outputs
    if (outputs.length > 0) {
      code += '\n';
      for (const output of outputs) {
        code += `  @Output() ${output.name} = new EventEmitter<any>();\n`;
      }
    }

    code += '\n';
    code += `  constructor() {}\n`;
    code += '\n';
    code += `  ngOnInit(): void {}\n`;
    code += '}\n';

    return code;
  }

  /**
   * Generates the template HTML file
   */
  private generateTemplateFile(templateCode: string): string {
    // Check if template already has proper root element
    const trimmed = templateCode.trim();
    if (trimmed.startsWith('<') && !trimmed.startsWith('{{')) {
      // Looks like a proper template already
      return `${trimmed}\n`;
    }

    // Wrap in a div if not a complete element
    return `<div class="component-container">\n${this.indentCode(templateCode, 2)}\n</div>\n`;
  }

  /**
   * Generates the CSS file
   */
  private generateStylesFile(): string {
    return `/* Component styles */\n:host {\n  display: block;\n}\n\n.component-container {\n  /* Add your styles here */\n}\n`;
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
    return path.join(componentsDir, `${componentName}.component`);
  }

  /**
   * Creates all component files at the specified paths
   */
  public async createComponentFiles(basePath: string, files: AngularComponentFiles): Promise<void> {
    // Create TypeScript file
    const tsPath = `${basePath}.ts`;
    const tsUri = vscode.Uri.file(tsPath);
    const directory = path.dirname(tsPath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write TypeScript file
    await vscode.workspace.fs.writeFile(tsUri, Buffer.from(files.typescript, 'utf-8'));
    this.logger.info('Angular component TypeScript file created', { filePath: tsPath });

    // Write template file
    const htmlPath = `${basePath}.html`;
    const htmlUri = vscode.Uri.file(htmlPath);
    await vscode.workspace.fs.writeFile(htmlUri, Buffer.from(files.template, 'utf-8'));
    this.logger.info('Angular component template file created', { filePath: htmlPath });

    // Write styles file
    const cssPath = `${basePath}.css`;
    const cssUri = vscode.Uri.file(cssPath);
    await vscode.workspace.fs.writeFile(cssUri, Buffer.from(files.styles, 'utf-8'));
    this.logger.info('Angular component styles file created', { filePath: cssPath });
  }

  /**
   * Generates component usage for Angular templates
   */
  public generateComponentUsage(
    selector: string,
    inputs: AngularPropInfo[],
    outputs: AngularPropInfo[],
    originalCode: string,
  ): string {
    if (inputs.length === 0 && outputs.length === 0) {
      return `<${selector}></${selector}>`;
    }

    // Extract input/output values from original code if possible
    const inputValues = this.extractInputValues(originalCode, inputs);
    const outputValues = this.extractOutputValues(originalCode, outputs);

    // Build attributes string
    const attributes: string[] = [];

    for (const input of inputs) {
      const value = inputValues.get(input.name);
      if (value !== undefined) {
        attributes.push(`[${input.name}]="${value}"`);
      } else if (input.isRequired) {
        attributes.push(`[${input.name}]="${input.name}"`);
      }
    }

    for (const output of outputs) {
      const value = outputValues.get(output.name);
      if (value !== undefined) {
        attributes.push(`(${output.name})="${value}"`);
      }
    }

    if (attributes.length === 0) {
      return `<${selector}></${selector}>`;
    }

    const attrsString = attributes.join(' ');
    return `<${selector} ${attrsString}></${selector}>`;
  }

  /**
   * Extracts input values from original Angular template code
   */
  private extractInputValues(angularCode: string, inputs: AngularPropInfo[]): Map<string, string> {
    const values = new Map<string, string>();

    // Match [property]="value" patterns
    const propBindingPattern = /\[([a-zA-Z_$][a-zA-Z0-9_$]*)\]\s*=\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = propBindingPattern.exec(angularCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && inputs.some((p) => p.name === propName)) {
        values.set(propName, propValue);
      }
    }

    // Match [(ngModel)]="value" patterns
    const twoWayPattern = /\[\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\]\s*=\s*"([^"]*)"/g;
    while ((match = twoWayPattern.exec(angularCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && inputs.some((p) => p.name === propName)) {
        values.set(propName, propValue);
      }
    }

    // Match {{variable}} patterns
    const interpolationPattern = /\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g;
    while ((match = interpolationPattern.exec(angularCode)) !== null) {
      const varName = match[1];
      if (varName && inputs.some((p) => p.name === varName) && !values.has(varName)) {
        values.set(varName, varName);
      }
    }

    return values;
  }

  /**
   * Extracts output values from original Angular template code
   */
  private extractOutputValues(
    angularCode: string,
    outputs: AngularPropInfo[],
  ): Map<string, string> {
    const values = new Map<string, string>();

    // Match (event)="handler" patterns
    const eventBindingPattern = /\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = eventBindingPattern.exec(angularCode)) !== null) {
      const eventName = match[1];
      const eventValue = match[2];
      if (eventName && eventValue && outputs.some((p) => p.name === eventName)) {
        values.set(eventName, eventValue);
      }
    }

    return values;
  }
}
