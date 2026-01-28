import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ComponentProp {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
  description: string;
}

export interface ComponentInfo {
  name: string;
  props: ComponentProp[];
  framework: 'react' | 'vue' | 'svelte' | 'solid';
  importPath: string;
  isDefaultExport: boolean;
  isTypeExport: boolean;
  hasTypeScript: boolean;
}

export interface StorybookStoryOptions {
  includeControls: boolean;
  includeArgsTypes: boolean;
  storyDirectory: string;
  framework: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  storyFormat: 'csf' | 'mdx';
  autoGenerateVariants: boolean;
}

export interface GeneratedStory {
  storyCode: string;
  storyPath: string;
  componentPath: string;
  componentName: string;
}

/**
 * Service for generating Storybook stories from component definitions
 */
export class StorybookStoryGeneratorService {
  private static instance: StorybookStoryGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): StorybookStoryGeneratorService {
    StorybookStoryGeneratorService.instance ??= new StorybookStoryGeneratorService();
    return StorybookStoryGeneratorService.instance;
  }

  /**
   * Main entry point: Generates Storybook story from selected component
   */
  public async generateStoryFromComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: StorybookStoryOptions,
  ): Promise<GeneratedStory> {
    const selectedText = document.getText(selection);
    const fileName = document.fileName;

    // Detect framework if auto
    const framework =
      options.framework === 'auto' ? this.detectFramework(fileName, document) : options.framework;

    // Parse component information
    const componentInfo = this.parseComponent(selectedText, fileName, framework);

    if (!componentInfo) {
      throw new Error('Could not parse component from selection');
    }

    // Generate the story code
    const storyCode = this.generateStoryCode(componentInfo, document.fileName, options);

    // Determine story file path
    const storyPath = this.calculateStoryPath(document.fileName, componentInfo, options);

    this.logger.info('Storybook story generated', {
      componentName: componentInfo.name,
      framework: componentInfo.framework,
    });

    return {
      storyCode,
      storyPath,
      componentPath: document.fileName,
      componentName: componentInfo.name,
    };
  }

  /**
   * Detects the framework based on file name and content
   */
  private detectFramework(
    fileName: string,
    document: vscode.TextDocument,
  ): 'react' | 'vue' | 'svelte' | 'solid' {
    const ext = path.extname(fileName).toLowerCase();
    const content = document.getText();

    if (ext === '.vue') {
      return 'vue';
    } else if (ext === '.svelte') {
      return 'svelte';
    } else if (content.includes('createSignal') || content.includes('solid-js')) {
      return 'solid';
    } else {
      return 'react';
    }
  }

  /**
   * Parses component information from selected code
   */
  private parseComponent(
    code: string,
    fileName: string,
    framework: 'react' | 'vue' | 'svelte' | 'solid',
  ): ComponentInfo | null {
    const trimmedCode = code.trim();
    const hasTypeScript = fileName.endsWith('.tsx') || fileName.endsWith('.ts') || fileName.endsWith('.jsx');

    let componentInfo: ComponentInfo | null = null;

    switch (framework) {
      case 'react':
        componentInfo = this.parseReactComponent(trimmedCode, hasTypeScript);
        break;
      case 'vue':
        componentInfo = this.parseVueComponent(trimmedCode, hasTypeScript);
        break;
      case 'svelte':
        componentInfo = this.parseSvelteComponent(trimmedCode, hasTypeScript);
        break;
      case 'solid':
        componentInfo = this.parseSolidComponent(trimmedCode, hasTypeScript);
        break;
    }

    if (componentInfo) {
      componentInfo.framework = framework;
      componentInfo.importPath = this.calculateImportPath(fileName);
      componentInfo.hasTypeScript = hasTypeScript;
    }

    return componentInfo;
  }

  /**
   * Parses React component
   */
  private parseReactComponent(code: string, hasTypeScript: boolean): ComponentInfo | null {
    // Match function component: export function/const ComponentName
    const functionMatch = code.match(
      /export\s+(?:default\s+)?(?:function|const)\s+(\w+)(?:<[^>]+>)?\s*(?:\([^)]*\))?\s*[:\s]*React(?:\.)?FC/,
    );

    // Match arrow function component: export const ComponentName = (props) =>
    const arrowMatch = code.match(
      /export\s+(?:default\s+)?const\s+(\w+)(?:<[^>]+>)?\s*=\s*(?:\([^)]*\)|\w+)\s*(?::\s*\{[^}]+\})?\s*=>/,
    );

    const nameMatch = functionMatch || arrowMatch;
    if (!nameMatch) {
      return null;
    }

    const componentName = nameMatch[1];
    const isDefaultExport = /export\s+default/.test(code);
    const isTypeExport = /export\s+type\s+\w+Props/.test(code);

    // Extract props interface/type
    const props = this.extractPropsFromCode(code, hasTypeScript);

    return {
      name: componentName,
      props,
      framework: 'react',
      importPath: '',
      isDefaultExport,
      isTypeExport,
      hasTypeScript,
    };
  }

  /**
   * Parses Vue component
   */
  private parseVueComponent(code: string, hasTypeScript: boolean): ComponentInfo | null {
    // Match component name in script setup or options API
    const nameMatch = code.match(/name\s*:\s*['"`](\w+)['"`]/);
    const fileNameMatch = path.basename(code, '.vue');

    const componentName = nameMatch ? nameMatch[1] : fileNameMatch;

    // Extract props from defineProps or props option
    const props = this.extractVueProps(code, hasTypeScript);

    return {
      name: componentName,
      props,
      framework: 'vue',
      importPath: '',
      isDefaultExport: true,
      isTypeExport: false,
      hasTypeScript,
    };
  }

  /**
   * Parses Svelte component
   */
  private parseSvelteComponent(code: string, hasTypeScript: boolean): ComponentInfo | null {
    const fileNameMatch = path.basename(code, '.svelte');
    const componentName = fileNameMatch;

    // Extract props from export let declarations
    const props = this.extractSvelteProps(code, hasTypeScript);

    return {
      name: componentName,
      props,
      framework: 'svelte',
      importPath: '',
      isDefaultExport: true,
      isTypeExport: false,
      hasTypeScript,
    };
  }

  /**
   * Parses Solid component
   */
  private parseSolidComponent(code: string, hasTypeScript: boolean): ComponentInfo | null {
    // Match function component: export function ComponentName
    const functionMatch = code.match(/export\s+(?:default\s+)?function\s+(\w+)/);

    // Match arrow function: export const ComponentName = () =>
    const arrowMatch = code.match(/export\s+(?:default\s+)?const\s+(\w+)\s*=\s*\(\)\s*=>/);

    const nameMatch = functionMatch || arrowMatch;
    if (!nameMatch) {
      return null;
    }

    const componentName = nameMatch[1];
    const isDefaultExport = /export\s+default/.test(code);

    // Extract props interface/type
    const props = this.extractPropsFromCode(code, hasTypeScript);

    return {
      name: componentName,
      props,
      framework: 'solid',
      importPath: '',
      isDefaultExport,
      isTypeExport: false,
      hasTypeScript,
    };
  }

  /**
   * Extracts props from TypeScript interface/type or prop destructuring
   */
  private extractPropsFromCode(code: string, hasTypeScript: boolean): ComponentProp[] {
    const props: ComponentProp[] = [];

    if (!hasTypeScript) {
      return props;
    }

    // Match interface Props { ... }
    const interfaceMatch = code.match(/interface\s+(\w*Props?\w*)\s*\{([^}]+)\}/s);
    if (interfaceMatch) {
      const propsBody = interfaceMatch[2];
      props.push(...this.parsePropsInterface(propsBody));
    }

    // Match type Props = { ... }
    const typeMatch = code.match(/type\s+(\w*Props?\w*)\s*=\s*\{([^}]+)\}/s);
    if (typeMatch) {
      const propsBody = typeMatch[2];
      props.push(...this.parsePropsInterface(propsBody));
    }

    return props;
  }

  /**
   * Parses props from interface body
   */
  private parsePropsInterface(propsBody: string): ComponentProp[] {
    const props: ComponentProp[] = [];
    const lines = propsBody.split(';').filter((line) => line.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match: name: type, or name?: type, or readonly name: type
      const propMatch = trimmed.match(
        /^(?:readonly\s+)?(\w+)(\??)\s*:\s*([^,\n=]+?)(?:\s*=\s*([^,\n]+))?$/,
      );

      if (propMatch) {
        const [, name, optional, type, defaultValue] = propMatch;
        props.push({
          name,
          type: type.trim(),
          isRequired: optional !== '?',
          defaultValue: defaultValue?.trim(),
          description: this.generateDescriptionFromType(type.trim()),
        });
      }
    }

    return props;
  }

  /**
   * Extracts props from Vue component
   */
  private extractVueProps(code: string, _hasTypeScript: boolean): ComponentProp[] {
    const props: ComponentProp[] = [];

    // Match defineProps<{ ... }>()
    const definePropsMatch = code.match(/defineProps<\{([^}]+)\}>/s);
    if (definePropsMatch) {
      props.push(...this.parsePropsInterface(definePropsMatch[1]));
    }

    // Match props: { ... }
    const propsOptionMatch = code.match(/props\s*:\s*\{([^}]+)\}/s);
    if (propsOptionMatch) {
      const propsBody = propsOptionMatch[1];
      const propDeclarations = propsBody.split(',').filter((p) => p.trim());

      for (const declaration of propDeclarations) {
        const trimmed = declaration.trim();
        const match = trimmed.match(/^(\w+)(?:\s*:\s*\{[^}]*\})?\s*(?:\|\s*[^,]+)?$/);
        if (match) {
          props.push({
            name: match[1],
            type: 'any',
            isRequired: !trimmed.includes('| undefined') && !trimmed.includes('| null'),
            description: '',
          });
        }
      }
    }

    return props;
  }

  /**
   * Extracts props from Svelte component
   */
  private extractSvelteProps(code: string, _hasTypeScript: boolean): ComponentProp[] {
    const props: ComponentProp[] = [];

    // Match export let declarations
    const exportLetMatches = code.matchAll(/export\s+let\s+(\w+)(?:\s*[:=]\s*([^,\n]+))?/g);

    for (const match of exportLetMatches) {
      const [, name, typeOrDefault] = match;
      let type = 'any';
      let defaultValue: string | undefined;
      let isRequired = true;

      if (typeOrDefault) {
        if (typeOrDefault.includes('=')) {
          const parts = typeOrDefault.split('=');
          type = parts[0].trim().replace(/:/g, '');
          defaultValue = parts[1].trim();
          isRequired = false;
        } else if (typeOrDefault.includes(':')) {
          type = typeOrDefault.split(':')[1].trim();
        } else {
          defaultValue = typeOrDefault;
          isRequired = false;
        }
      }

      props.push({
        name,
        type,
        isRequired,
        defaultValue,
        description: '',
      });
    }

    return props;
  }

  /**
   * Generates description from type name
   */
  private generateDescriptionFromType(type: string): string {
    const lowerType = type.toLowerCase();

    if (lowerType === 'string') {
      return 'Text content';
    } else if (lowerType === 'number') {
      return 'Numeric value';
    } else if (lowerType === 'boolean') {
      return 'Toggle control';
    } else if (lowerType.includes('[]') || lowerType === 'array') {
      return 'List of items';
    } else if (lowerType.includes('reactnode')) {
      return 'React children';
    } else if (lowerType.includes('function') || lowerType.includes('=>')) {
      return 'Event handler callback';
    }

    return '';
  }

  /**
   * Calculates import path for the component
   */
  private calculateImportPath(componentFilePath: string): string {
    // Return the relative path that will be resolved in the story
    return componentFilePath;
  }

  /**
   * Generates story code based on framework and options
   */
  private generateStoryCode(
    componentInfo: ComponentInfo,
    sourceFilePath: string,
    options: StorybookStoryOptions,
  ): string {
    if (options.storyFormat === 'mdx') {
      return this.generateMdxStory(componentInfo, sourceFilePath, options);
    }
    return this.generateCsfStory(componentInfo, sourceFilePath, options);
  }

  /**
   * Generates CSF (Component Story Format) story
   */
  private generateCsfStory(
    componentInfo: ComponentInfo,
    sourceFilePath: string,
    options: StorybookStoryOptions,
  ): string {
    let code = '';
    const { framework, name, props, hasTypeScript } = componentInfo;

    // Generate import statement based on framework
    const relativeImportPath = this.calculateRelativeImportPath(sourceFilePath, options);

    switch (framework) {
      case 'react':
        code += this.generateReactImports(name, relativeImportPath, options, hasTypeScript);
        break;
      case 'vue':
        code += this.generateVueImports(name, relativeImportPath, options, hasTypeScript);
        break;
      case 'svelte':
        code += this.generateSvelteImports(name, relativeImportPath, options, hasTypeScript);
        break;
      case 'solid':
        code += this.generateSolidImports(name, relativeImportPath, options, hasTypeScript);
        break;
    }

    // Generate meta
    code += `\nconst meta = {\n`;
    code += `  title: '${this.generateTitle(name)}',\n`;
    code += `  component: ${name},\n`;
    if (options.includeArgsTypes) {
      code += `  tags: ['autodocs'],\n`;
    }
    code += `};\n`;
    code += `export default meta;\n\n`;

    // Generate TypeScript types if enabled
    if (options.includeArgsTypes && hasTypeScript && props.length > 0) {
      code += `type ${name}Story = StoryObj<typeof ${name}>;\n\n`;
    }

    // Generate base story
    code += this.generateBaseStory(name, props, framework, options);

    // Generate variant stories if enabled
    if (options.autoGenerateVariants) {
      code += this.generateVariantStories(name, props, framework, options);
    }

    return code;
  }

  /**
   * Generates React imports
   */
  private generateReactImports(
    componentName: string,
    importPath: string,
    options: StorybookStoryOptions,
     _hasTypeScript: boolean,
  ): string {
    let imports = `import type { StoryObj, Meta } from '@storybook/${hasTypeScript ?'react' :'react'}';\n`;
    imports += `import { ${componentName} } from '${importPath}';\n`;

    if (options.includeControls) {
      imports += `import { ${componentName} as ${componentName}Controls } from '${importPath}';\n`;
    }

    return imports;
  }

  /**
   * Generates Vue imports
   */
  private generateVueImports(
    componentName: string,
    importPath: string,
    _options: StorybookStoryOptions,
    _hasTypeScript: boolean,
  ): string {
    let imports = `import type { StoryObj, Meta } from '@storybook/vue3';\n`;
    imports += `import ${componentName} from '${importPath}';\n`;

    return imports;
  }

  /**
   * Generates Svelte imports
   */
  private generateSvelteImports(
    componentName: string,
    importPath: string,
    _options: StorybookStoryOptions,
    _hasTypeScript: boolean,
  ): string {
    let imports = `import type { StoryObj, Meta } from '@storybook/svelte';\n`;
    imports += `import ${componentName} from '${importPath}.svelte';\n`;

    return imports;
  }

  /**
   * Generates Solid imports
   */
  private generateSolidImports(
    componentName: string,
    importPath: string,
    _options: StorybookStoryOptions,
    _hasTypeScript: boolean,
  ): string {
    let imports = `import type { StoryObj, Meta } from '@storybook/solid';\n`;
    imports += `import { ${componentName} } from '${importPath}';\n`;

    return imports;
  }

  /**
   * Generates story title
   */
  private generateTitle(componentName: string): string {
    // Convert PascalCase to kebab-case and create category
    const category = componentName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    return `${category}/${componentName}`;
  }

  /**
   * Generates base story
   */
  private generateBaseStory(
    componentName: string,
    props: ComponentProp[],
    _framework: string,
    options: StorybookStoryOptions,
  ): string {
    let code = '';
    const storyName = `Primary${componentName}`;
    const typeAnnotation = options.includeArgsTypes ? `: ${componentName}Story` : '';

    code += `export const ${storyName}${typeAnnotation} = {\n`;
    code += `  args: {\n`;

    for (const prop of props) {
      const defaultValue = this.getDefaultValueForProp(prop);
      code += `    ${prop.name}: ${defaultValue},\n`;
    }

    code += `  },\n`;

    if (options.includeControls) {
      code += `  argTypes: {\n`;
      for (const prop of props) {
        code += `    ${prop.name}: {\n`;
        code += `      control: '${this.getControlTypeForProp(prop)}',\n`;
        if (prop.description) {
          code += `      description: '${prop.description}',\n`;
        }
        code += `    },\n`;
      }
      code += `  },\n`;
    }

    code += `};\n\n`;

    return code;
  }

  /**
   * Generates variant stories
   */
  private generateVariantStories(
    componentName: string,
    props: ComponentProp[],
    _framework: string,
    _options: StorybookStoryOptions,
  ): string {
    let code = '';

    // Generate stories for different states
    const variants = this.generateVariantsForProps(props, componentName);

    for (const variant of variants) {
      const typeAnnotation = _options.includeArgsTypes ? `: ${componentName}Story` : '';
      code += `export const ${variant.name}${typeAnnotation} = {\n`;
      code += `  args: {\n`;

      for (const [key, value] of Object.entries(variant.args)) {
        code += `    ${key}: ${JSON.stringify(value)},\n`;
      }

      code += `  },\n`;
      code += `};\n\n`;
    }

    return code;
  }

  /**
   * Generates variant stories based on props
   */
  private generateVariantsForProps(props: ComponentProp[], _componentName: string): Array<{
    name: string;
    args: Record<string, unknown>;
  }> {
    const variants: Array<{ name: string; args: Record<string, unknown> }> = [];

    // Generate args with minimal props
    const requiredProps = props.filter((p) => p.isRequired);
    if (requiredProps.length > 0 && requiredProps.length < props.length) {
      const minimalArgs: Record<string, unknown> = {};
      for (const prop of requiredProps) {
        minimalArgs[prop.name] = this.parseDefaultValue(this.getDefaultValueForProp(prop));
      }
      variants.push({
        name: `WithRequiredProps`,
        args: minimalArgs,
      });
    }

    // Generate empty state for string props
    const stringProps = props.filter((p) => p.type.toLowerCase() === 'string');
    if (stringProps.length > 0) {
      const emptyArgs: Record<string, unknown> = {};
      for (const prop of props) {
        emptyArgs[prop.name] =
          prop.type.toLowerCase() === 'string' ? '' : this.parseDefaultValue(this.getDefaultValueForProp(prop));
      }
      variants.push({
        name: `Empty`,
        args: emptyArgs,
      });
    }

    // Generate disabled/off state for boolean props
    const booleanProps = props.filter((p) => p.type.toLowerCase() === 'boolean');
    if (booleanProps.length > 0) {
      const disabledArgs: Record<string, unknown> = {};
      for (const prop of props) {
        disabledArgs[prop.name] =
          prop.type.toLowerCase() === 'boolean' ? false : this.parseDefaultValue(this.getDefaultValueForProp(prop));
      }
      variants.push({
        name: `Disabled`,
        args: disabledArgs,
      });
    }

    return variants;
  }

  /**
   * Gets default value for a prop
   */
  private getDefaultValueForProp(prop: ComponentProp): string {
    if (prop.defaultValue) {
      return prop.defaultValue;
    }

    const lowerType = prop.type.toLowerCase();

    if (lowerType === 'string') {
      return `'Hello World'`;
    } else if (lowerType === 'number') {
      return '42';
    } else if (lowerType === 'boolean') {
      return 'true';
    } else if (lowerType === 'array' || lowerType.endsWith('[]')) {
      return '[]';
    } else if (lowerType === 'object') {
      return '{}';
    } else if (lowerType.includes('reactnode')) {
      return "'Content'";
    } else if (lowerType.includes('function') || lowerType.includes('=>')) {
      return '() => {}';
    }

    return 'undefined';
  }

  /**
   * Parses a default value string
   */
  private parseDefaultValue(value: string): unknown {
    value = value.trim();

    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return Number.parseFloat(value);
    if (/^['"`]/.test(value)) return value.slice(1, -1);
    if (value === '[]') return [];
    if (value === '{}') return {};

    return value;
  }

  /**
   * Gets control type for a prop
   */
  private getControlTypeForProp(prop: ComponentProp): string {
    const lowerType = prop.type.toLowerCase();

    if (lowerType === 'string') {
      return 'text';
    } else if (lowerType === 'number') {
      return 'number';
    } else if (lowerType === 'boolean') {
      return 'boolean';
    } else if (lowerType.includes('color')) {
      return 'color';
    } else if (lowerType === 'date') {
      return 'date';
    } else if (lowerType === 'array' || lowerType.endsWith('[]')) {
      return 'object';
    } else if (lowerType === 'object') {
      return 'object';
    }

    return 'text';
  }

  /**
   * Generates MDX story
   */
  private generateMdxStory(
    componentInfo: ComponentInfo,
    sourceFilePath: string,
    options: StorybookStoryOptions,
  ): string {
    let mdx = `import { Meta, Story, Canvas, ArgsTable } from '@storybook/blocks';\n`;
    mdx += `import { ${componentInfo.name} } from '${this.calculateRelativeImportPath(sourceFilePath, options)}';\n\n`;

    mdx += `<Meta of={${componentInfo.name}} />\n\n`;

    mdx += `# ${componentInfo.name}\n\n`;
    mdx += `Storybook story for ${componentInfo.name} component.\n\n`;

    if (componentInfo.props.length > 0) {
      mdx += `## Props\n\n`;
      mdx += `<ArgsTable of={${componentInfo.name}} />\n\n`;
    }

    mdx += `## Stories\n\n`;
    mdx += `### Primary\n\n`;
    mdx += `<Canvas>\n`;
    mdx += `  <Story name="Primary" args={{\n`;

    for (const prop of componentInfo.props) {
      const defaultValue = this.getDefaultValueForProp(prop);
      mdx += `    ${prop.name}: ${defaultValue},\n`;
    }

    mdx += `  }} />\n`;
    mdx += `</Canvas>\n`;

    return mdx;
  }

  /**
   * Calculates relative import path for story file
   */
  private calculateRelativeImportPath(sourceFilePath: string, options: StorybookStoryOptions): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension
    const baseName = sourceFileName.replace(/\.(tsx|ts|jsx|js|vue|svelte)$/, '');

    // Calculate relative path from story directory to source directory
    const storyDirPath = path.join(path.dirname(sourceFilePath), options.storyDirectory);
    const relativeDir = path.relative(storyDirPath, sourceDir);
    const normalizedPath = relativeDir === '' ? '.' : relativeDir;

    // Add extension based on framework
    let extension = '';
    if (sourceFilePath.endsWith('.tsx') || sourceFilePath.endsWith('.ts')) {
      extension = '.ts';
    } else if (sourceFilePath.endsWith('.jsx') || sourceFilePath.endsWith('.js')) {
      extension = '.js';
    } else if (sourceFilePath.endsWith('.vue')) {
      extension = '.vue';
    } else if (sourceFilePath.endsWith('.svelte')) {
      extension = '.svelte';
    }

    return path.join(normalizedPath, baseName + extension).split('\\').join('/');
  }

  /**
   * Calculates story file path
   */
  private calculateStoryPath(
    sourceFilePath: string,
    _componentInfo: ComponentInfo,
    options: StorybookStoryOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);
    const baseName = sourceFileName.replace(/\.(tsx|ts|jsx|js|vue|svelte)$/, '');

    // Determine story file name
    let storyFileName: string;
    if (options.storyFormat === 'mdx') {
      storyFileName = `${baseName}.stories.mdx`;
    } else {
      const tsExtension = sourceFilePath.endsWith('.tsx') || sourceFilePath.endsWith('.ts') ? 'ts' : 'js';
      storyFileName = `${baseName}.stories.${tsExtension}x`;
    }

    return path.join(sourceDir, options.storyDirectory, storyFileName);
  }

  /**
   * Checks if a story file already exists
   */
  public async storyFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates the story file at the specified path
   */
  public async createStoryFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write story file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Story file created', { filePath });
  }
}
