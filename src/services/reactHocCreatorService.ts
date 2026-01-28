import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface HocProperty {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string;
}

export interface ReactHocCreatorOptions {
  hocName: string;
  hocType: 'authentication' | 'theming' | 'data-fetching' | 'custom';
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  includeHooks: boolean;
  forwardRef: boolean;
  displayName: boolean;
  propsToInject?: HocProperty[];
  customLogic?: string;
}

export interface HocTypeInfo {
  typeName: string;
  defaultProps: HocProperty[];
  exampleUsage: string;
}

export interface GeneratedHoc {
  hocName: string;
  hocCode: string;
  hookCode?: string;
  typesCode?: string;
  filePath: string;
  hasTypeScript: boolean;
  hocType: 'authentication' | 'theming' | 'data-fetching' | 'custom';
}

/**
 * Service for generating React Higher-Order Components with TypeScript typing
 */
export class ReactHocCreatorService {
  private static instance: ReactHocCreatorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactHocCreatorService {
    ReactHocCreatorService.instance ??= new ReactHocCreatorService();
    return ReactHocCreatorService.instance;
  }

  /**
   * Main entry point: Generates React HOC from user input
   */
  public async generateHoc(
    document: vscode.TextDocument,
    options: ReactHocCreatorOptions,
  ): Promise<GeneratedHoc> {
    // Get type-specific defaults if not provided
    const typeInfo = this.getHocTypeInfo(options.hocType);
    const propsToInject = options.propsToInject ?? typeInfo.defaultProps;

    // Generate the HOC code
    const hocCode = this.generateHocCode(options, propsToInject);

    // Generate additional code if needed
    let hookCode: string | undefined;
    let typesCode: string | undefined;

    if (options.includeHooks && this.shouldGenerateHook(options.hocType)) {
      hookCode = this.generateHookCode(options, propsToInject);
    }

    if (options.includeTypeScript && this.shouldGenerateTypes(options.hocType)) {
      typesCode = this.generateTypesCode(options, propsToInject);
    }

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, options);

    this.logger.info('React HOC generated', {
      hocName: options.hocName,
      hocType: options.hocType,
      hasTypeScript: options.includeTypeScript,
    });

    return {
      hocName: options.hocName,
      hocCode,
      hookCode,
      typesCode,
      filePath,
      hasTypeScript: options.includeTypeScript,
      hocType: options.hocType,
    };
  }

  /**
   * Gets type-specific information for the HOC
   */
  private getHocTypeInfo(hocType: ReactHocCreatorOptions['hocType']): HocTypeInfo {
    switch (hocType) {
      case 'authentication':
        return {
          typeName: 'WithAuthenticationProps',
          defaultProps: [
            { name: 'isAuthenticated', type: 'boolean', isRequired: true, description: 'Whether user is authenticated' },
            { name: 'user', type: 'User | null', isRequired: true, description: 'Current user object' },
            { name: 'login', type: '() => Promise<void>', isRequired: true, description: 'Login function' },
            { name: 'logout', type: '() => Promise<void>', isRequired: true, description: 'Logout function' },
          ],
          exampleUsage: `export default withAuthentication(MyComponent);`,
        };

      case 'theming':
        return {
          typeName: 'WithThemeProps',
          defaultProps: [
            { name: 'theme', type: 'Theme', isRequired: true, description: 'Current theme object' },
            { name: 'toggleTheme', type: '() => void', isRequired: true, description: 'Toggle theme function' },
            { name: 'setTheme', type: '(theme: string) => void', isRequired: true, description: 'Set theme function' },
          ],
          exampleUsage: `export default withTheme(MyComponent);`,
        };

      case 'data-fetching':
        return {
          typeName: 'WithDataProps',
          defaultProps: [
            { name: 'data', type: 'T | null', isRequired: true, description: 'Fetched data' },
            { name: 'loading', type: 'boolean', isRequired: true, description: 'Loading state' },
            { name: 'error', type: 'Error | null', isRequired: true, description: 'Error state' },
            { name: 'refetch', type: '() => Promise<void>', isRequired: true, description: 'Refetch data function' },
          ],
          exampleUsage: `export default withData(MyComponent);`,
        };

      case 'custom':
        return {
          typeName: 'CustomHocProps',
          defaultProps: [],
          exampleUsage: `export default ${'withCustom'}(MyComponent);`,
        };
    }
  }

  /**
   * Determines if a hook should be generated for this HOC type
   */
  private shouldGenerateHook(hocType: ReactHocCreatorOptions['hocType']): boolean {
    return ['authentication', 'theming', 'data-fetching'].includes(hocType);
  }

  /**
   * Determines if types should be generated separately for this HOC type
   */
  private shouldGenerateTypes(hocType: ReactHocCreatorOptions['hocType']): boolean {
    return ['authentication', 'data-fetching'].includes(hocType);
  }

  /**
   * Generates the HOC code
   */
  private generateHocCode(
    options: ReactHocCreatorOptions,
    propsToInject: HocProperty[],
  ): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Add JSDoc comment
    if (options.includeJSDoc) {
      code += this.generateHocJSDoc(options, propsToInject);
    }

    // Generate imports
    code += this.generateImports(options);

    // Generate type definitions for TypeScript
    if (ts) {
      code += this.generateHocTypes(options, propsToInject);
    }

    // Generate the HOC function
    code += this.generateHocFunction(options, propsToInject);

    return code;
  }

  /**
   * Generates JSDoc comment for HOC
   */
  private generateHocJSDoc(options: ReactHocCreatorOptions, propsToInject: HocProperty[]): string {
    let jsDoc = '/**\n';
    jsDoc += ` * ${options.hocName} - Higher-Order Component\n`;
    jsDoc += ` *\n`;
    jsDoc += ` * @description A ${options.hocType} HOC that injects additional props into components\n`;
    jsDoc += ` *\n`;

    if (propsToInject.length > 0) {
      jsDoc += ` * @template P - Original component props\n`;
      jsDoc += ` * @template {[key: string]: unknown} InjectedProps - Props to be injected\n`;
      jsDoc += ` *\n`;
      jsDoc += ` * Injected props:\n`;
      for (const prop of propsToInject) {
        const optional = prop.isRequired ? '' : ' (optional)';
        jsDoc += ` * @property {${prop.type}} ${prop.name}${optional} - ${prop.description || prop.name}\n`;
      }
    }

    jsDoc += ` *\n`;
    jsDoc += ` * @example\n`;
    jsDoc += ` * ${this.getHocTypeInfo(options.hocType).exampleUsage}\n`;
    jsDoc += ` */\n`;

    return jsDoc;
  }

  /**
   * Generates import statements
   */
  private generateImports(options: ReactHocCreatorOptions): string {
    let imports = "import React from 'react';\n";

    if (options.forwardRef) {
      imports += "import { forwardRef } from 'react';\n";
    }

    if (options.includeHooks && this.shouldGenerateHook(options.hocType)) {
      // Hooks will be imported in the hook code
    }

    return imports + '\n';
  }

  /**
   * Generates TypeScript type definitions for the HOC
   */
  private generateHocTypes(options: ReactHocCreatorOptions, propsToInject: HocProperty[]): string {
    let types = '';

    // Generate injected props interface
    const injectedPropsName = `Injected${options.hocName}Props`;
    types += `interface ${injectedPropsName} {\n`;

    for (const prop of propsToInject) {
      const optional = prop.isRequired ? '' : '?';
      types += `  ${prop.name}${optional}: ${prop.type};\n`;
    }

    types += `}\n\n`;

    // Generate HOC-specific types based on type
    switch (options.hocType) {
      case 'authentication':
        types += `interface User {\n`;
        types += `  id: string;\n`;
        types += `  username: string;\n`;
        types += `  email: string;\n`;
        types += `  [key: string]: unknown;\n`;
        types += `}\n\n`;
        break;

      case 'theming':
        types += `interface Theme {\n`;
        types += `  colors: Record<string, string>;\n`;
        types += `  spacing: Record<string, number>;\n`;
        types += `  [key: string]: unknown;\n`;
        types += `}\n\n`;
        break;

      case 'data-fetching':
        types += `type DataStatus = 'idle' | 'loading' | 'success' | 'error';\n\n`;
        break;
    }

    // Generate config options interface for the HOC
    types += `interface ${options.hocName}Config {\n`;
    types += `  // Add configuration options here\n`;
    types += `  [key: string]: unknown;\n`;
    types += `}\n\n`;

    return types;
  }

  /**
   * Generates the HOC function
   */
  private generateHocFunction(options: ReactHocCreatorOptions, propsToInject: HocProperty[]): string {
    const ts = options.includeTypeScript;
    let hoc = '';

    // Generate function signature
    const injectedPropsName = `Injected${options.hocName}Props`;

    if (ts) {
      hoc += `function ${options.hocName}<P extends object>(\n`;
      hoc += `  WrappedComponent: React.ComponentType<P & ${injectedPropsName}>,\n`;
      hoc += `  config?: ${options.hocName}Config,\n`;
      hoc += `): React.ComponentType<Omit<P, keyof ${injectedPropsName}>> {\n`;
    } else {
      hoc += `function ${options.hocName}(\n`;
      hoc += `  WrappedComponent,\n`;
      hoc += `  config = {},\n`;
      hoc += `) {\n`;
    }

    // Generate function body
    const componentName = options.forwardRef ? 'ForwardedComponent' : 'WithHOC';

    if (options.displayName) {
      hoc += `  ${componentName}.displayName = \`with${options.hocName}(\${WrappedComponent.name || 'Component'})\`;\n\n`;
    }

    if (options.forwardRef) {
      hoc += `  const ForwardedComponent = forwardRef<${ts ? 'unknown' : 'any'}, P>((props, ref) => {\n`;
    } else {
      hoc += `  const ${componentName} = (props) => {\n`;
    }

    // Inject the props based on HOC type
    hoc += this.generatePropInjection(options, propsToInject, ts);

    // Handle ref forwarding
    if (options.forwardRef) {
      hoc += `    return <WrappedComponent ref={ref} {...injectedProps} {...props} />;\n`;
      hoc += `  });\n\n`;
      hoc += `  return ForwardedComponent;\n`;
    } else {
      hoc += `    return <WrappedComponent {...injectedProps} {...props} />;\n`;
      hoc += `  };\n\n`;
      hoc += `  return ${componentName};\n`;
    }

    hoc += `}\n\n`;

    // Add export
    hoc += `export ${ts ? `type { ${injectedPropsName} };\n\n` : ''}`;
    hoc += `export { ${options.forwardRef ? 'ForwardedComponent' : componentName} as ${options.hocName} };\n`;
    hoc += `export default ${options.hocName};\n`;

    return hoc;
  }

  /**
   * Generates prop injection logic based on HOC type
   */
  private generatePropInjection(options: ReactHocCreatorOptions, propsToInject: HocProperty[], ts: boolean): string {
    let injection = '';

    switch (options.hocType) {
      case 'authentication':
        injection = this.generateAuthInjection(options, propsToInject, ts);
        break;

      case 'theming':
        injection = this.generateThemeInjection(options, propsToInject, ts);
        break;

      case 'data-fetching':
        injection = this.generateDataFetchingInjection(options, propsToInject, ts);
        break;

      case 'custom':
        injection = this.generateCustomInjection(options, propsToInject, ts);
        break;
    }

    return injection;
  }

  /**
   * Generates authentication prop injection
   */
  private generateAuthInjection(options: ReactHocCreatorOptions, propsToInject: HocProperty[], ts: boolean): string {
    let injection = `    // Authentication logic\n`;
    injection += `    // Replace with your actual authentication implementation\n`;
    injection += `    const ${ts ? 'injectedProps' : ''}: ${ts ? `Partial<Injected${options.hocName}Props>` : 'any'} = {\n`;

    for (const prop of propsToInject) {
      if (prop.name === 'isAuthenticated') {
        injection += `      ${prop.name}: false, // Replace with actual auth state\n`;
      } else if (prop.name === 'user') {
        injection += `      ${prop.name}: null, // Replace with actual user object\n`;
      } else if (prop.name === 'login') {
        injection += `      ${prop.name}: async () => { /* Implement login logic */ },\n`;
      } else if (prop.name === 'logout') {
        injection += `      ${prop.name}: async () => { /* Implement logout logic */ },\n`;
      } else {
        injection += `      ${prop.name}: ${ts ? `undefined as ${prop.type}` : 'undefined'},\n`;
      }
    }

    injection += `    };\n\n`;

    return injection;
  }

  /**
   * Generates theming prop injection
   */
  private generateThemeInjection(options: ReactHocCreatorOptions, propsToInject: HocProperty[], ts: boolean): string {
    let injection = `    // Theming logic\n`;
    injection += `    // Replace with your actual theme context implementation\n`;
    injection += `    const ${ts ? 'injectedProps' : ''}: ${ts ? `Partial<Injected${options.hocName}Props>` : 'any'} = {\n`;

    for (const prop of propsToInject) {
      if (prop.name === 'theme') {
        injection += `      ${prop.name}: {\n`;
        injection += `        colors: {},\n`;
        injection += `        spacing: {},\n`;
        injection += `      }, // Replace with actual theme\n`;
      } else if (prop.name === 'toggleTheme') {
        injection += `      ${prop.name}: () => { /* Implement toggle theme */ },\n`;
      } else if (prop.name === 'setTheme') {
        injection += `      ${prop.name}: (theme: ${ts ? 'string' : 'any'}) => { /* Implement set theme */ },\n`;
      } else {
        injection += `      ${prop.name}: ${ts ? `undefined as ${prop.type}` : 'undefined'},\n`;
      }
    }

    injection += `    };\n\n`;

    return injection;
  }

  /**
   * Generates data fetching prop injection
   */
  private generateDataFetchingInjection(options: ReactHocCreatorOptions, propsToInject: HocProperty[], ts: boolean): string {
    let injection = `    // Data fetching logic\n`;
    injection += `    // Replace with your actual data fetching implementation\n`;
    injection += `    const [data, setData] = React.useState(null);\n`;
    injection += `    const [loading, setLoading] = React.useState(false);\n`;
    injection += `    const [error, setError] = React.useState(null);\n\n`;
    injection += `    const fetchData = async () => {\n`;
    injection += `      setLoading(true);\n`;
    injection += `      setError(null);\n`;
    injection += `      try {\n`;
    injection += `        // Replace with actual API call\n`;
    injection += `        const response = await fetch('/api/data');\n`;
    injection += `        const result = await response.json();\n`;
    injection += `        setData(result);\n`;
    injection += `      } catch (err) {\n`;
    injection += `        setError(err);\n`;
    injection += `      } finally {\n`;
    injection += `        setLoading(false);\n`;
    injection += `      }\n`;
    injection += `    };\n\n`;
    injection += `    React.useEffect(() => {\n`;
    injection += `      fetchData();\n`;
    injection += `    }, []);\n\n`;
    injection += `    const ${ts ? 'injectedProps' : ''}: ${ts ? `Partial<Injected${options.hocName}Props>` : 'any'} = {\n`;
    injection += `      data,\n`;
    injection += `      loading,\n`;
    injection += `      error,\n`;
    injection += `      refetch: fetchData,\n`;
    injection += `    };\n\n`;

    return injection;
  }

  /**
   * Generates custom prop injection
   */
  private generateCustomInjection(options: ReactHocCreatorOptions, propsToInject: HocProperty[], ts: boolean): string {
    if (options.customLogic) {
      return `    ${options.customLogic}\n\n`;
    }

    let injection = `    // Custom injection logic\n`;
    injection += `    const ${ts ? 'injectedProps' : ''}: ${ts ? `Partial<Injected${options.hocName}Props>` : 'any'} = {\n`;

    for (const prop of propsToInject) {
      injection += `      ${prop.name}: ${ts ? `undefined as ${prop.type}` : 'undefined'}, // Add your implementation\n`;
    }

    injection += `    };\n\n`;

    return injection;
  }

  /**
   * Generates hook code for the HOC
   */
  private generateHookCode(options: ReactHocCreatorOptions, propsToInject: HocProperty[]): string {
    const hookName = `use${options.hocName}`;
    let code = `// Custom hook for ${options.hocName}\n`;
    code += `import { ${hookName} } from './${options.hocName}.hook';\n\n`;
    return code;
  }

  /**
   * Generates separate types code
   */
  private generateTypesCode(options: ReactHocCreatorOptions, propsToInject: HocProperty[]): string {
    let code = `// Type definitions for ${options.hocName}\n`;
    code += `export type { Injected${options.hocName}Props, ${options.hocName}Config } from './${options.hocName}';\n`;
    return code;
  }

  /**
   * Calculates file path for the HOC
   */
  private calculateFilePath(sourceFilePath: string, options: ReactHocCreatorOptions): string {
    const sourceDir = path.dirname(sourceFilePath);
    const hocDirectory = 'hocs';

    const ext = options.includeTypeScript ? '.ts' : '.js';
    const fileName = `${options.hocName}.${this.toKebabCase(options.hocType)}${ext}`;

    return path.join(sourceDir, hocDirectory, fileName);
  }

  /**
   * Converts PascalCase to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Creates the HOC file at the specified path
   */
  public async createHocFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('HOC file created', { filePath });
  }

  /**
   * Checks if an HOC file already exists
   */
  public async hocFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generator options from user
   */
  public async getGeneratorOptions(): Promise<ReactHocCreatorOptions | undefined> {
    // Step 1: Ask for HOC type
    const hocType = await vscode.window.showQuickPick(
      [
        { label: 'Authentication', description: 'HOC for authentication/authorization', value: 'authentication' },
        { label: 'Theming', description: 'HOC for theme injection', value: 'theming' },
        { label: 'Data Fetching', description: 'HOC for data fetching with loading/error states', value: 'data-fetching' },
        { label: 'Custom', description: 'Create a custom HOC', value: 'custom' },
      ],
      {
        placeHolder: 'Select HOC type',
      },
    );

    if (!hocType) {
      return undefined;
    }

    // Step 2: Ask for HOC name
    const typeInfo = this.getHocTypeInfo(hocType.value as ReactHocCreatorOptions['hocType']);
    const defaultName = `with${hocType.label.replace(' ', '')}`;

    const hocName = await vscode.window.showInputBox({
      prompt: 'Enter HOC name',
      placeHolder: defaultName,
      value: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'HOC name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'HOC name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!hocName) {
      return undefined;
    }

    // Step 3: Ask about TypeScript
    const includeTypeScript = await this.askYesNoQuestion(
      'Use TypeScript?',
      true,
    );

    // Step 4: Ask about features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Include JSDoc comments', description: 'Add JSDoc documentation', picked: true },
        { label: 'Include custom hooks', description: 'Generate related custom hooks', picked: true },
        { label: 'Forward refs', description: 'Forward refs to wrapped component', picked: true },
        { label: 'Display name', description: 'Set display name for debugging', picked: true },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    // Step 5: For custom HOC, ask for custom logic or props
    let customLogic: string | undefined;
    let propsToInject: HocProperty[] | undefined;

    if (hocType.value === 'custom') {
      const addCustomLogic = await this.askYesNoQuestion(
        'Add custom injection logic?',
        false,
      );

      if (addCustomLogic) {
        customLogic = await vscode.window.showInputBox({
          prompt: 'Enter custom injection logic (JavaScript code)',
          placeHolder: 'const customValue = computeValue();',
        });
      }

      const addCustomProps = await this.askYesNoQuestion(
        'Define custom props to inject?',
        false,
      );

      if (addCustomProps) {
        const propsInput = await vscode.window.showInputBox({
          prompt: 'Enter props to inject (format: name:type, name2:type2)',
          placeHolder: 'customValue:string, isEnabled:boolean',
        });

        if (propsInput) {
          propsToInject = this.parsePropsInput(propsInput);
        }
      }
    }

    return {
      hocName: hocName.trim(),
      hocType: hocType.value as ReactHocCreatorOptions['hocType'],
      includeTypeScript,
      includeJSDoc: features.some((f) => f.label === 'Include JSDoc comments'),
      includeHooks: features.some((f) => f.label === 'Include custom hooks'),
      forwardRef: features.some((f) => f.label === 'Forward refs'),
      displayName: features.some((f) => f.label === 'Display name'),
      propsToInject,
      customLogic,
    };
  }

  /**
   * Parses props input string into HocProperty array
   */
  private parsePropsInput(input: string): HocProperty[] {
    const props: HocProperty[] = [];
    const parts = input.split(',').map((p) => p.trim());

    for (const part of parts) {
      const match = part.match(/^(\w+):(.+)$/);
      if (match) {
        props.push({
          name: match[1],
          type: match[2].trim(),
          isRequired: !match[1].endsWith('?'),
        });
      }
    }

    return props;
  }

  /**
   * Helper to ask yes/no questions
   */
  private async askYesNoQuestion(question: string, defaultValue: boolean): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: '', value: true },
        { label: 'No', description: '', value: false },
      ],
      {
        placeHolder: question,
      },
    );

    return choice?.value ?? defaultValue;
  }
}
