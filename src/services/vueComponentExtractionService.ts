import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface VueExtractedComponent {
  name: string;
  props: VuePropInfo[];
  componentCode: string;
  importPath: string;
}

export interface VuePropInfo {
  name: string;
  typeName: string;
  isRequired: boolean;
  type: 'prop' | 'slot' | 'emit';
}

/**
 * Service for extracting Vue code into a new component with Vue 3 Composition API
 */
export class VueComponentExtractionService {
  private static instance: VueComponentExtractionService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): VueComponentExtractionService {
    VueComponentExtractionService.instance ??= new VueComponentExtractionService();
    return VueComponentExtractionService.instance;
  }

  /**
   * Extracts selected Vue code into a new component
   */
  public async extractToComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<VueExtractedComponent> {
    const selectedText = document.getText(selection);

    // Analyze the selected code to extract props
    const props = this.extractProps(selectedText);

    // Generate component name
    const componentName = await this.getComponentName();

    // Generate component code
    const componentCode = this.generateComponentCode(componentName, selectedText, props);

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentName);

    this.logger.info('Vue component extracted', { componentName, propsCount: props.length });

    return {
      name: componentName,
      props,
      componentCode,
      importPath,
    };
  }

  /**
   * Extracts props from Vue code by looking for template expressions and Vue patterns
   */
  private extractProps(vueCode: string): VuePropInfo[] {
    const props: VuePropInfo[] = [];
    const seenProps = new Set<string>();

    // Pattern 1: {{variable}} - template interpolation
    const interpolationPattern = /\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = interpolationPattern.exec(vueCode)) !== null) {
      const propName = match[1];
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        props.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
          type: 'prop',
        });
      }
    }

    // Pattern 2: :prop or v-bind:prop - bound attributes
    const bindPattern = /(?::|v-bind:)([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = bindPattern.exec(vueCode)) !== null) {
      const propName = match[1];
      if (propName && !seenProps.has(propName) && !this.isReservedWord(propName)) {
        seenProps.add(propName);
        props.push({
          name: propName,
          typeName: 'any',
          isRequired: true,
          type: 'prop',
        });
      }
    }

    // Pattern 3: @event or v-on:event - event emitters
    const eventPattern = /(?:(@)|v-on:)([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = eventPattern.exec(vueCode)) !== null) {
      const eventName = match[2];
      if (eventName && !seenProps.has(eventName)) {
        seenProps.add(eventName);
        props.push({
          name: eventName,
          typeName: 'any',
          isRequired: false,
          type: 'emit',
        });
      }
    }

    // Pattern 4: v-model - two-way binding
    const modelPattern = /v-model(?:\.[\w]+)?(?:="([^"]+)")?/g;
    while ((match = modelPattern.exec(vueCode)) !== null) {
      const modelName = match[1];
      if (modelName && !seenProps.has(modelName) && !this.isReservedWord(modelName)) {
        seenProps.add(modelName);
        props.push({
          name: modelName,
          typeName: 'any',
          isRequired: true,
          type: 'prop',
        });
      }
    }

    // Pattern 5: #slot or v-slot:slot - named slots
    const slotPattern = /(?:(#)|v-slot:)([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = slotPattern.exec(vueCode)) !== null) {
      const slotName = match[2];
      if (slotName && !seenProps.has(slotName)) {
        seenProps.add(slotName);
        props.push({
          name: slotName,
          typeName: 'any',
          isRequired: false,
          type: 'slot',
        });
      }
    }

    return props;
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
      'ref',
      'reactive',
      'computed',
      'watch',
      'onMounted',
      'onUnmounted',
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
   * Generates the Vue Single File Component code with Composition API
   */
  private generateComponentCode(
    componentName: string,
    vueCode: string,
    props: VuePropInfo[],
  ): string {
    let code = '<template';
    let hasDefaultSlot = vueCode.includes('<slot>');

    // Check if we have named slots
    const namedSlots = props.filter((p) => p.type === 'slot');
    if (namedSlots.length > 0 && !hasDefaultSlot) {
      code += '>';
    } else if (hasDefaultSlot) {
      code += '>';
    } else {
      code += '>\n';
    }

    // Add the template content
    if (!vueCode.trim().startsWith('<')) {
      // If the selected code is not a complete element, wrap it in a div
      code += '  <div>\n';
      code += this.indentCode(vueCode, 4);
      code += '\n  </div>\n';
    } else {
      code += this.indentCode(vueCode, 2);
      if (!vueCode.endsWith('\n')) {
        code += '\n';
      }
    }

    code += '</template>\n\n';

    // Add script setup with TypeScript
    code += '<script setup lang="ts">\n';

    // Separate props, emits, and slots
    const propDefs = props.filter((p) => p.type === 'prop');
    const emitDefs = props.filter((p) => p.type === 'emit');

    if (propDefs.length > 0) {
      const interfaceName = `${componentName}Props`;
      code += `interface ${interfaceName} {\n`;
      for (const prop of propDefs) {
        const optional = prop.isRequired ? '' : '?';
        code += `  ${prop.name}${optional}: ${prop.typeName};\n`;
      }
      code += '}\n\n';

      // Use defineProps with TypeScript interface
      code += `defineProps<${interfaceName}>();\n`;
    }

    if (emitDefs.length > 0) {
      code += `const emit = defineEmits<{ ${emitDefs.map((e) => `${e.name}: [value: any]`).join('; ')} }>();\n`;
    }

    code += '</script>\n\n';

    // Add style section (empty, but present for conventions)
    code += '<style scoped>\n';
    code += '/* Add component styles here */\n';
    code += '</style>\n';

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
    return path.join(componentsDir, `${componentName}.vue`);
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
    this.logger.info('Vue component file created', { filePath });
  }

  /**
   * Generates component usage for Vue
   */
  public generateComponentUsage(
    componentName: string,
    props: VuePropInfo[],
    originalCode: string,
  ): string {
    // Convert PascalCase to kebab-case for Vue component usage
    const kebabName = this.pascalToKebab(componentName);

    // Separate props by type
    const propDefs = props.filter((p) => p.type === 'prop');

    if (propDefs.length === 0) {
      return `<${kebabName} />`;
    }

    // Extract prop values from original code if possible
    const propValues = this.extractPropValues(originalCode, props);
    const propsString = propDefs
      .map((prop) => {
        const value = propValues.get(prop.name);
        if (value !== undefined) {
          return `:${prop.name}="${value}"`;
        }
        return prop.isRequired ? `:${prop.name}="${prop.name}"` : '';
      })
      .filter((s) => s.length > 0)
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
   * Extracts prop values from original Vue code
   */
  private extractPropValues(vueCode: string, props: VuePropInfo[]): Map<string, string> {
    const values = new Map<string, string>();

    // Match :prop="value" patterns
    const bindPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = bindPattern.exec(vueCode)) !== null) {
      const propName = match[1];
      const propValue = match[2];
      if (propName && propValue && props.some((p) => p.name === propName)) {
        values.set(propName, propValue);
      }
    }

    // Match {{variable}} patterns
    const interpolationPattern = /\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g;
    while ((match = interpolationPattern.exec(vueCode)) !== null) {
      const varName = match[1];
      if (varName && props.some((p) => p.name === varName) && !values.has(varName)) {
        values.set(varName, varName);
      }
    }

    return values;
  }
}
