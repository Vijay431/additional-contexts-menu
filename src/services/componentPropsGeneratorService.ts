import * as vscode from 'vscode';

import { ComponentUsageAnalysis, GeneratedProp, PropsGeneratorConfig } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for analyzing React component usage and generating TypeScript interfaces for props
 */
export class ComponentPropsGeneratorService {
  private static instance: ComponentPropsGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ComponentPropsGeneratorService {
    ComponentPropsGeneratorService.instance ??= new ComponentPropsGeneratorService();
    return ComponentPropsGeneratorService.instance;
  }

  /**
   * Analyzes component usage and generates TypeScript interface
   */
  public async analyzeComponentUsage(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    config: PropsGeneratorConfig,
  ): Promise<ComponentUsageAnalysis> {
    const selectedText = document.getText(selection);

    // Extract component name
    const componentName = this.extractComponentName(selectedText);
    if (!componentName) {
      throw new Error('Could not find a valid component name in selection');
    }

    // Extract props from usage
    const props = this.extractPropsFromUsage(selectedText, config);

    // Determine if component has children
    const hasChildren = this.hasChildren(selectedText);

    // Determine usage pattern
    const usagePattern = this.determineUsagePattern(selectedText, props);

    // Generate interface code
    const interfaceCode = this.generateInterfaceCode(componentName, props, hasChildren, config);

    this.logger.info('Component usage analyzed', {
      componentName,
      propsCount: props.length,
      hasChildren,
      usagePattern,
    });

    return {
      componentName,
      props,
      interfaceCode,
      usagePattern,
      hasChildren,
    };
  }

  /**
   * Extracts component name from JSX usage
   */
  private extractComponentName(jsxCode: string): string | null {
    // Match opening tag: <ComponentName or <ComponentName
    const match = jsxCode.match(/<([A-Z][a-zA-Z0-9_]*)/);
    return match ? match[1] : null;
  }

  /**
   * Extracts props from component usage by analyzing patterns
   */
  private extractPropsFromUsage(jsxCode: string, config: PropsGeneratorConfig): GeneratedProp[] {
    const props: Map<string, GeneratedProp> = new Map();
    const reservedWords = new Set([
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
      'key',
      'ref',
    ]);

    // Pattern 1: prop={value} or prop="value" or prop='value'
    const propValuePatterns = [
      /(\w+)=\{([^}]+)\}/g, // prop={value}
      /(\w+)="([^"]*)"/g, // prop="value"
      /(\w+)='([^']*)'/g, // prop='value'
    ];

    for (const pattern of propValuePatterns) {
      let match: RegExpExecArray | null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      while ((match = pattern.exec(jsxCode)) !== null) {
        const propName = match[1];
        const propValue = match[2];

        if (!propName || reservedWords.has(propName)) {
          continue;
        }

        if (props.has(propName)) {
          const existing = props.get(propName);
          if (existing) {
            existing.usageCount++;
          }
        } else {
          const inferredType = config.inferTypesFromUsage
            ? this.inferTypeFromValue(propValue)
            : 'any';

          props.set(propName, {
            name: propName,
            typeName: inferredType,
            isRequired: true, // Will be updated later based on default values
            hasDefaultValue: false,
            usageCount: 1,
          });
        }
      }
    }

    // Pattern 2: Boolean props (prop without value, e.g., disabled, hidden)
    const booleanPropPattern = /<\w+([^>]*)\s+(\w+)(?=[=\s>])/g;
    let match: RegExpExecArray | null;
    while ((match = booleanPropPattern.exec(jsxCode)) !== null) {
      const propName = match[2];
      if (!propName || reservedWords.has(propName)) {
        continue;
      }

      if (!props.has(propName)) {
        props.set(propName, {
          name: propName,
          typeName: 'boolean',
          isRequired: false, // Boolean props are typically optional
          hasDefaultValue: false,
          usageCount: 1,
        });
      }
    }

    // Convert map to array
    const propsArray = Array.from(props.values());

    // Determine required/optional based on usage patterns
    return this.determineRequiredProps(propsArray, config);
  }

  /**
   * Infers TypeScript type from a value
   */
  private inferTypeFromValue(value: string): string {
    const trimmed = value.trim();

    // String literals
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('`') && trimmed.endsWith('`'))
    ) {
      return 'string';
    }

    // Number literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return 'number';
    }

    // Boolean literals
    if (trimmed === 'true' || trimmed === 'false') {
      return 'boolean';
    }

    // Array literals
    if (trimmed.startsWith('[')) {
      return 'unknown[]';
    }

    // Object literals
    if (trimmed.startsWith('{') && !trimmed.includes('{(')) {
      return 'Record<string, unknown>';
    }

    // Arrow functions
    if (trimmed.includes('=>')) {
      // Try to parse parameters
      const arrowMatch = trimmed.match(/\(([^)]*)\)\s*=>/);
      if (arrowMatch) {
        const params = arrowMatch[1].trim();
        if (params === '' || params === '_') {
          return '() => void';
        }
        return `(...args: ${params
          .split(',')
          .map(() => 'unknown')
          .join(', ')}) => unknown`;
      }
      return '(...args: unknown[]) => unknown';
    }

    // Function calls (likely event handlers)
    if (trimmed.includes('(') && trimmed.endsWith(')')) {
      const funcMatch = trimmed.match(/(\w+)\s*\(/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        if (this.isEventHandlerName(funcName)) {
          return '(event: unknown) => void';
        }
      }
      return '(...args: unknown[]) => unknown';
    }

    // React-specific patterns
    if (trimmed.startsWith('{') && trimmed.includes('map')) {
      return 'unknown[]';
    }

    // JSX elements (for render props)
    if (trimmed.startsWith('<')) {
      return 'React.ReactNode';
    }

    // Variables/identifiers - try to infer from naming conventions
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
      if (trimmed.startsWith('is') || trimmed.startsWith('has') || trimmed.startsWith('should')) {
        return 'boolean';
      }
      if (trimmed.startsWith('on') && trimmed.length > 2) {
        return '(...args: unknown[]) => unknown';
      }
      if (trimmed.endsWith('Count') || trimmed.endsWith('Index') || trimmed.endsWith('Size')) {
        return 'number';
      }
      if (trimmed.endsWith('Props') || trimmed.endsWith('Config') || trimmed.endsWith('Options')) {
        return 'Record<string, unknown>';
      }
    }

    return 'unknown';
  }

  /**
   * Checks if a function name looks like an event handler
   */
  private isEventHandlerName(name: string): boolean {
    return name.startsWith('handle') || (name.startsWith('on') && name.length > 2);
  }

  /**
   * Determines which props are required vs optional based on usage patterns
   */
  private determineRequiredProps(
    props: GeneratedProp[],
    config: PropsGeneratorConfig,
  ): GeneratedProp[] {
    return props.map((prop) => {
      // If prop has a default value, it's optional
      if (prop.hasDefaultValue) {
        return { ...prop, isRequired: false };
      }

      // Boolean props are typically optional
      if (prop.typeName === 'boolean') {
        return { ...prop, isRequired: false };
      }

      // Functions starting with "on" are typically optional callbacks
      if (prop.name.startsWith('on') && prop.typeName.includes('=>')) {
        return { ...prop, isRequired: false };
      }

      // In strict mode, assume all non-boolean props are required
      if (config.strictTypeInference) {
        return prop;
      }

      // Otherwise, infer from common naming patterns
      const optionalPatterns = ['className', 'style', 'id', 'title', 'aria', 'data-'];
      const isLikelyOptional = optionalPatterns.some((pattern) => prop.name.includes(pattern));

      return { ...prop, isRequired: !isLikelyOptional };
    });
  }

  /**
   * Determines if component has children
   */
  private hasChildren(jsxCode: string): boolean {
    // Check if there's content between opening and closing tags
    const contentMatch = jsxCode.match(/^<\w+[^>]*>([\s\S]+)<\/\w+>$/);
    if (contentMatch) {
      const content = contentMatch[1].trim();
      // Check if content is not just whitespace
      return content.length > 0 && !content.startsWith('{');
    }

    return false;
  }

  /**
   * Determines the usage pattern of the component
   */
  private determineUsagePattern(
    jsxCode: string,
    props: GeneratedProp[],
  ): 'controlled' | 'uncontrolled' | 'hybrid' {
    const hasValueProp = props.some(
      (p) =>
        (p.name === 'value' || p.name === 'checked' || p.name === 'selected') &&
        p.typeName !== 'undefined',
    );

    const hasOnChangeProp = props.some((p) => p.name.startsWith('on') && p.typeName.includes('=>'));

    if (hasValueProp && hasOnChangeProp) {
      return 'controlled';
    }
    if (hasValueProp || hasOnChangeProp) {
      return 'hybrid';
    }
    return 'uncontrolled';
  }

  /**
   * Generates TypeScript interface code
   */
  private generateInterfaceCode(
    componentName: string,
    props: GeneratedProp[],
    hasChildren: boolean,
    config: PropsGeneratorConfig,
  ): string {
    const interfaceName = `${componentName}Props`;
    const exportKeyword = config.generateExportedInterfaces ? 'export ' : '';

    let code = `${exportKeyword}interface ${interfaceName} {\n`;

    // Add children prop if applicable
    if (hasChildren) {
      const jsdocComment = config.includeJSDocComments ? '  /** Child elements */\n' : '';
      code += jsdocComment;
      code += '  children?: React.ReactNode;\n\n';
    }

    for (const prop of props) {
      // Skip if it's 'children' (already added)
      if (prop.name === 'children') {
        continue;
      }

      // Add JSDoc comment if enabled
      if (config.includeJSDocComments) {
        const comment = this.generatePropJSDoc(prop);
        if (comment) {
          code += `  ${comment}\n`;
        }
      }

      const optional = prop.isRequired ? '' : '?';
      code += `  ${prop.name}${optional}: ${prop.typeName};\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates JSDoc comment for a prop
   */
  private generatePropJSDoc(prop: GeneratedProp): string {
    const parts: string[] = ['/**'];

    if (prop.hasDefaultValue && prop.defaultValue) {
      parts.push(` * @default ${prop.defaultValue}`);
    }

    if (prop.usageCount > 1) {
      parts.push(` * Used ${prop.usageCount} times in analyzed code`);
    }

    parts.push(' */');

    if (parts.length === 2) {
      return ''; // No useful comments
    }

    return parts.join('\n');
  }

  /**
   * Scans the entire document for component usage to build comprehensive props
   */
  public async scanDocumentForComponentUsage(
    document: vscode.TextDocument,
    componentName: string,
    config: PropsGeneratorConfig,
  ): Promise<ComponentUsageAnalysis> {
    const text = document.getText();
    const allProps = new Map<string, GeneratedProp>();

    // Find all usages of the component
    const componentUsageRegex = new RegExp(`<${componentName}\\s+([^>]*)>`, 'g');
    let match: RegExpExecArray | null;

    while ((match = componentUsageRegex.exec(text)) !== null) {
      const propsStr = match[1];

      // Extract props from this usage
      const propPatterns = [/(\w+)=\{([^}]+)\}/g, /(\w+)="([^"]*)"/g, /(\w+)='([^']*)'/g];

      for (const pattern of propPatterns) {
        let propMatch: RegExpExecArray | null;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        while ((propMatch = pattern.exec(propsStr)) !== null) {
          const propName = propMatch[1];
          const propValue = propMatch[2];

          if (!propName || propName === 'key' || propName === 'ref') {
            continue;
          }

          if (allProps.has(propName)) {
            const existing = allProps.get(propName);
            if (existing) {
              existing.usageCount++;
            }
          } else {
            const inferredType = config.inferTypesFromUsage
              ? this.inferTypeFromValue(propValue)
              : 'unknown';

            allProps.set(propName, {
              name: propName,
              typeName: inferredType,
              isRequired: true,
              hasDefaultValue: false,
              usageCount: 1,
            });
          }
        }
      }
    }

    const props = this.determineRequiredProps(Array.from(allProps.values()), config);
    const hasChildren = new RegExp(`<${componentName}[^>]*>([\\s\\S]+?)</${componentName}>`).test(
      text,
    );
    const usagePattern = this.determineUsagePattern(text, props);
    const interfaceCode = this.generateInterfaceCode(componentName, props, hasChildren, config);

    return {
      componentName,
      props,
      interfaceCode,
      usagePattern,
      hasChildren,
    };
  }
}
