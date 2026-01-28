import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface InfiniteScrollGeneratorOptions {
  componentName: string;
  componentDirectory: string;
  includeTypeScript: boolean;
  includeIntersectionObserver: boolean;
  includeLoadingState: boolean;
  includeErrorHandling: boolean;
  includeFetchMore: boolean;
  generateHook: boolean;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export interface InfiniteScrollProperty {
  name: string;
  type: string;
  isRequired: boolean;
  isReadonly: boolean;
  description?: string;
}

export interface GeneratedInfiniteScrollComponent {
  componentName: string;
  hookName: string;
  componentCode: string;
  hookCode?: string;
  componentFilePath: string;
  hookFilePath?: string;
  properties: InfiniteScrollProperty[];
}

/**
 * Service for generating infinite scroll components with data fetching
 * Generates intersection observer hooks with loading states and error handling
 */
export class InfiniteScrollGeneratorService {
  private static instance: InfiniteScrollGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): InfiniteScrollGeneratorService {
    InfiniteScrollGeneratorService.instance ??= new InfiniteScrollGeneratorService();
    return InfiniteScrollGeneratorService.instance;
  }

  /**
   * Main entry point: Generates infinite scroll component from selected code or user input
   */
  public async generateInfiniteScrollComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: InfiniteScrollGeneratorOptions,
  ): Promise<GeneratedInfiniteScrollComponent> {
    const selectedText = document.getText(selection);

    // Parse properties from selection or use defaults
    const properties = selectedText.trim()
      ? this.parsePropertiesFromCode(selectedText)
      : this.getDefaultProperties();

    // Generate component code
    const componentCode = this.generateComponentCode(options.componentName, properties, options);

    // Determine component file path
    const componentFilePath = this.calculateComponentFilePath(
      document.fileName,
      options.componentName,
      options,
    );

    // Generate hook if needed
    let hookCode: string | undefined;
    let hookFilePath: string | undefined;

    if (options.generateHook) {
      hookCode = this.generateHookCode(options.componentName, properties, options);
      hookFilePath = this.calculateHookFilePath(document.fileName, options.componentName, options);
    }

    this.logger.info('Infinite scroll component generated', {
      componentName: options.componentName,
      propertyCount: properties.length,
    });

    const result: GeneratedInfiniteScrollComponent = {
      componentName: options.componentName,
      hookName: `use${options.componentName}InfiniteScroll`,
      componentCode,
      componentFilePath,
      properties,
    };

    if (hookCode !== undefined) {
      result.hookCode = hookCode;
    }
    if (hookFilePath !== undefined) {
      result.hookFilePath = hookFilePath;
    }

    return result;
  }

  /**
   * Parses properties from selected code (interface, type, or props)
   */
  private parsePropertiesFromCode(code: string): InfiniteScrollProperty[] {
    const properties: InfiniteScrollProperty[] = [];
    const trimmedCode = code.trim();

    // Try to parse as TypeScript interface
    const interfaceMatch = trimmedCode.match(
      /(?:export\s+)?interface\s+(\w+)\s*{([^}]+)}/s,
    );
    if (interfaceMatch) {
      return this.parsePropertiesFromInterfaceBody(interfaceMatch[2]!);
    }

    // Try to parse as TypeScript type
    const typeMatch = trimmedCode.match(/(?:export\s+)?type\s+(\w+)\s*=\s*{([^}]+)}/s);
    if (typeMatch) {
      return this.parsePropertiesFromInterfaceBody(typeMatch[2]!);
    }

    return properties;
  }

  /**
   * Parses properties from interface/type body
   */
  private parsePropertiesFromInterfaceBody(body: string): InfiniteScrollProperty[] {
    const properties: InfiniteScrollProperty[] = [];
    const lines = body.split(';').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('*')) {
        continue;
      }

      // Match: name: type, or name?: type, or readonly name: type
      const readonlyMatch = line.match(/readonly\s+(\w+)\s*\?\s*:\s*(.+)/);
      const optionalMatch = line.match(/(\w+)\s*\?\s*:\s*(.+)/);
      const requiredMatch = line.match(/(\w+)\s*:\s*(.+)/);

      if (readonlyMatch) {
        properties.push({
          name: readonlyMatch[1]!,
          type: readonlyMatch[2]!.trim(),
          isRequired: false,
          isReadonly: true,
        });
      } else if (optionalMatch) {
        properties.push({
          name: optionalMatch[1]!,
          type: optionalMatch[2]!.trim(),
          isRequired: false,
          isReadonly: false,
        });
      } else if (requiredMatch) {
        properties.push({
          name: requiredMatch[1]!,
          type: requiredMatch[2]!.trim(),
          isRequired: true,
          isReadonly: false,
        });
      }
    }

    return properties;
  }

  /**
   * Gets default properties for infinite scroll component
   */
  private getDefaultProperties(): InfiniteScrollProperty[] {
    return [
      {
        name: 'data',
        type: 'T[]',
        isRequired: true,
        isReadonly: false,
        description: 'Array of data items',
      },
      {
        name: 'isLoading',
        type: 'boolean',
        isRequired: true,
        isReadonly: false,
        description: 'Whether data is being loaded',
      },
      {
        name: 'hasMore',
        type: 'boolean',
        isRequired: true,
        isReadonly: false,
        description: 'Whether there are more items to load',
      },
      {
        name: 'onLoadMore',
        type: '() => void | Promise<void>',
        isRequired: true,
        isReadonly: false,
        description: 'Callback to load more data',
      },
      {
        name: 'error',
        type: 'Error | null',
        isRequired: false,
        isReadonly: false,
        description: 'Error object if loading failed',
      },
    ];
  }

  /**
   * Generates the infinite scroll component code
   */
  private generateComponentCode(
    componentName: string,
    properties: InfiniteScrollProperty[],
    options: InfiniteScrollGeneratorOptions,
  ): string {
    let code = this.generateImports(options);
    code += '\n';

    // Add JSDoc comment
    code += this.generateComponentJSDoc(componentName, properties);

    // Define props interface
    const propsInterface = this.generatePropsInterface(componentName, properties, options);
    code += propsInterface;
    code += '\n';

    // Generate component
    code += this.generateComponentFunction(componentName, properties, options);

    return code;
  }

  /**
   * Generates the intersection observer hook code
   */
  private generateHookCode(
    componentName: string,
    _properties: InfiniteScrollProperty[],
    options: InfiniteScrollGeneratorOptions,
  ): string {
    let code = this.generateImports(options);
    code += '\n';

    // Add JSDoc comment
    code += this.generateHookJSDoc(componentName);

    const hookName = `use${componentName}InfiniteScroll`;
    const returnType = this.generateHookReturnType(options);

    code += `export function ${hookName}<T>(\n`;
    code += `  options: InfiniteScrollOptions<T>\n`;
    code += `): ${returnType} {\n`;

    // Generate hook body
    code += `  const [data, setData] = React.useState<T[]>([]);\n`;
    code += `  const [isLoading, setIsLoading] = React.useState(false);\n`;
    code += `  const [error, setError] = React.useState<Error | null>(null);\n`;
    code += `  const [hasMore, setHasMore] = React.useState(true);\n\n`;

    // Add intersection observer ref
    if (options.includeIntersectionObserver) {
      code += `  const ${this.lowercaseFirstLetter(componentName)}Ref = React.useRef<HTMLDivElement>(null);\n\n`;
      code += `  React.useEffect(() => {\n`;
      code += `    const observer = new IntersectionObserver(\n`;
      code += `      (entries) => {\n`;
      code += `        if (entries[0].isIntersecting && hasMore && !isLoading) {\n`;
      code += `          loadMore();\n`;
      code += `        }\n`;
      code += `      },\n`;
      code += `      {\n`;
      code += `        threshold: ${options.threshold ?? 0.1},\n`;
      code += `        rootMargin: '${options.rootMargin ?? '0px'}',\n`;
      if (options.triggerOnce) {
        code += `        triggerOnce: true,\n`;
      }
      code += `      }\n`;
      code += `    );\n\n`;
      code += `    const currentRef = ${this.lowercaseFirstLetter(componentName)}Ref.current;\n`;
      code += `    if (currentRef) {\n`;
      code += `      observer.observe(currentRef);\n`;
      code += `    }\n\n`;
      code += `    return () => {\n`;
      code += `      if (currentRef) {\n`;
      code += `        observer.unobserve(currentRef);\n`;
      code += `      }\n`;
      code += `    };\n`;
      code += `  }, [hasMore, isLoading]);\n\n`;
    }

    // Generate load more function
    code += `  const loadMore = async () => {\n`;
    code += `    if (isLoading || !hasMore) return;\n\n`;
    code += `    setIsLoading(true);\n`;
    code += `    setError(null);\n\n`;

    if (options.includeErrorHandling) {
      code += `    try {\n`;
      code += `      const newItems = await options.fetchFn(data.length);\n`;
      code += `      setData([...data, ...newItems]);\n`;
      code += `      setHasMore(newItems.length >= (options.pageSize || 10));\n`;
      code += `    } catch (err) {\n`;
      code += `      setError(err instanceof Error ? err : new Error('Failed to load more data'));\n`;
      code += `    } finally {\n`;
      code += `      setIsLoading(false);\n`;
      code += `    }\n`;
    } else {
      code += `    const newItems = await options.fetchFn(data.length);\n`;
      code += `    setData([...data, ...newItems]);\n`;
      code += `    setHasMore(newItems.length >= (options.pageSize || 10));\n`;
      code += `    setIsLoading(false);\n`;
    }
    code += `  };\n\n`;

    // Generate return object
    code += `  return {\n`;
    code += `    data,\n`;
    code += `    isLoading,\n`;
    code += `    error,\n`;
    code += `    hasMore,\n`;
    code += `    loadMore,\n`;
    if (options.includeIntersectionObserver) {
      code += `    ${this.lowercaseFirstLetter(componentName)}Ref,\n`;
    }
    code += `  };\n`;
    code += `}\n`;

    // Add options interface
    code += `\n`;
    code += `export interface InfiniteScrollOptions<T> {\n`;
    code += `  fetchFn: (offset: number) => Promise<T[]>;\n`;
    code += `  pageSize?: number;\n`;
    code += `  initialData?: T[];\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates hook return type
   */
  private generateHookReturnType(_options: InfiniteScrollGeneratorOptions): string {
    let type = '{\n';
    type += '    data: T[];\n';
    type += '    isLoading: boolean;\n';
    type += '    error: Error | null;\n';
    type += '    hasMore: boolean;\n';
    type += '    loadMore: () => void;\n';

    return type + '  }';
  }

  /**
   * Generates import statements
   */
  private generateImports(options: InfiniteScrollGeneratorOptions): string {
    let imports = "import React from 'react';\n";

    if (options.includeIntersectionObserver) {
      // Intersection Observer is available globally, no import needed
      // But we can add a comment for clarity
      imports += '\n// IntersectionObserver is available globally\n';
    }

    return imports;
  }

  /**
   * Generates JSDoc comment for component
   */
  private generateComponentJSDoc(
    componentName: string,
    properties: InfiniteScrollProperty[],
  ): string {
    let code = `/**\n`;
    code += ` * Infinite scroll component for ${componentName}\n`;
    code += ` *\n`;

    if (properties.length > 0) {
      for (const prop of properties) {
        const optional = prop.isRequired ? '' : ' (optional)';
        const readonly = prop.isReadonly ? ' (readonly)' : '';
        const desc = prop.description || prop.name;
        code += ` * @property {${prop.type}} ${prop.name}${optional}${readonly} - ${desc}\n`;
      }
    }

    code += ` */\n`;
    return code;
  }

  /**
   * Generates JSDoc comment for hook
   */
  private generateHookJSDoc(componentName: string): string {
    let code = `/**\n`;
    code += ` * Hook to manage infinite scroll functionality for ${componentName}\n`;
    code += ` *\n`;
    code += ` * @template T - Type of data items\n`;
    code += ` * @param {InfiniteScrollOptions<T>} options - Infinite scroll options\n`;
    code += ` * @returns {InfiniteScrollResult<T>} Infinite scroll state and callbacks\n`;
    code += ` */\n`;
    return code;
  }

  /**
   * Generates props interface
   */
  private generatePropsInterface(
    componentName: string,
    properties: InfiniteScrollProperty[],
    _options: InfiniteScrollGeneratorOptions,
  ): string {
    let code = `export interface ${componentName}Props<T = any> {\n`;

    for (const prop of properties) {
      const readonly = prop.isReadonly ? 'readonly ' : '';
      const optional = prop.isRequired ? '' : '?';
      const comment = prop.description ? ` // ${prop.description}` : '';
      code += `  ${readonly}${prop.name}${optional}: ${prop.type};${comment}\n`;
    }

    // Add render prop or children
    code += `  children?: (item: T, index: number) => React.ReactNode;\n`;
    code += `  render?: (item: T, index: number) => React.ReactNode;\n`;
    code += `  loadingComponent?: React.ReactNode;\n`;
    code += `  errorComponent?: React.ReactNode;\n`;
    code += `  endMessage?: React.ReactNode;\n`;

    code += `}\n`;
    return code;
  }

  /**
   * Generates the component function
   */
  private generateComponentFunction(
    componentName: string,
    _properties: InfiniteScrollProperty[],
    options: InfiniteScrollGeneratorOptions,
  ): string {
    const refName = this.lowercaseFirstLetter(componentName);

    let code = `export function ${componentName}<T = any>({\n`;
    code += `  data,\n`;
    code += `  isLoading,\n`;
    code += `  hasMore,\n`;
    code += `  onLoadMore,\n`;
    code += `  error,\n`;
    code += `  children,\n`;
    code += `  render,\n`;
    code += `  loadingComponent,\n`;
    code += `  errorComponent,\n`;
    code += `  endMessage,\n`;
    code += `}: ${componentName}Props<T>) {\n`;

    // Add ref if intersection observer is included
    if (options.includeIntersectionObserver) {
      code += `  const ${refName}Ref = React.useRef<HTMLDivElement>(null);\n\n`;
      code += `  React.useEffect(() => {\n`;
      code += `    const observer = new IntersectionObserver(\n`;
      code += `      (entries) => {\n`;
      code += `        if (entries[0].isIntersecting && hasMore && !isLoading) {\n`;
      code += `          onLoadMore();\n`;
      code += `        }\n`;
      code += `      },\n`;
      code += `      {\n`;
      code += `        threshold: ${options.threshold ?? 0.1},\n`;
      code += `        rootMargin: '${options.rootMargin ?? '0px'}',\n`;
      if (options.triggerOnce) {
        code += `        triggerOnce: true,\n`;
      }
      code += `      }\n`;
      code += `    );\n\n`;
      code += `    const currentRef = ${refName}Ref.current;\n`;
      code += `    if (currentRef) {\n`;
      code += `      observer.observe(currentRef);\n`;
      code += `    }\n\n`;
      code += `    return () => {\n`;
      code += `      if (currentRef) {\n`;
      code += `        observer.unobserve(currentRef);\n`;
      code += `      }\n`;
      code += `    };\n`;
      code += `  }, [hasMore, isLoading, onLoadMore]);\n\n`;
    }

    // Add error handling
    if (options.includeErrorHandling) {
      code += `  if (error && errorComponent) {\n`;
      code += `    return <>{errorComponent}</>;\n`;
      code += `  }\n\n`;
    }

    // Render function for items
    code += `  const renderItem = render || children;\n\n`;

    code += `  return (\n`;
    code += `    <div className="infinite-scroll-container">\n`;
    code += `      {data.map((item, index) => (\n`;
    code += `        <React.Fragment key={index}>\n`;
    code += `          {renderItem?.(item, index)}\n`;
    code += `        </React.Fragment>\n`;
    code += `      ))}\n\n`;

    // Loading state
    if (options.includeLoadingState) {
      code += `      {isLoading && (\n`;
      code += `        <div className="infinite-scroll-loading">\n`;
      code += `          {loadingComponent || <p>Loading...</p>}\n`;
      code += `        </div>\n`;
      code += `      )}\n\n`;
    }

    // End message or trigger element
    code += `      {hasMore && !isLoading && (\n`;
    if (options.includeIntersectionObserver) {
      code += `        <div ref={${refName}Ref} className="infinite-scroll-trigger" />\n`;
    } else {
      code += `        <button\n`;
      code += `          onClick={onLoadMore}\n`;
      code += `          className="infinite-scroll-load-more"\n`;
      code += `        >\n`;
      code += `          Load More\n`;
      code += `        </button>\n`;
    }
    code += `      )}\n\n`;

    code += `      {!hasMore && endMessage && (\n`;
    code += `        <div className="infinite-scroll-end">\n`;
    code += `          {endMessage}\n`;
    code += `        </div>\n`;
    code += `      )}\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Calculates component file path
   */
  private calculateComponentFilePath(
    sourceFilePath: string,
    componentName: string,
    options: InfiniteScrollGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const componentDirectory = options.componentDirectory || 'components';

    const componentFileName = `${componentName}.tsx`;
    return path.join(sourceDir, componentDirectory, componentFileName);
  }

  /**
   * Calculates hook file path
   */
  private calculateHookFilePath(
    sourceFilePath: string,
    componentName: string,
    options: InfiniteScrollGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const hooksDirectory = options.componentDirectory || 'hooks';

    const hookFileName = `use${componentName}InfiniteScroll.ts`;
    return path.join(sourceDir, hooksDirectory, hookFileName);
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
    this.logger.info('Infinite scroll component file created', { filePath });
  }

  /**
   * Creates the hook file at the specified path
   */
  public async createHookFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write hook file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Infinite scroll hook file created', { filePath });
  }

  /**
   * Checks if a component file already exists
   */
  public async componentFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generation options from user
   */
  public async getGeneratorOptions(
    defaultComponentName?: string,
  ): Promise<InfiniteScrollGeneratorOptions | undefined> {
    // Ask for component name
    const componentName = await vscode.window.showInputBox({
      prompt: 'Enter component name',
      placeHolder: 'InfiniteScrollList',
      value: defaultComponentName || 'InfiniteScrollList',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Component name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Component name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!componentName) {
      return undefined;
    }

    // Ask for directory
    const componentDirectory = await vscode.window.showInputBox({
      prompt: 'Enter components directory name',
      placeHolder: 'components',
      value: 'components',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!componentDirectory) {
      return undefined;
    }

    // Ask for features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Include TypeScript', description: 'Generate TypeScript code', picked: true },
        {
          label: 'Include Intersection Observer',
          description: 'Use Intersection Observer API for auto-loading',
          picked: true,
        },
        {
          label: 'Include Loading State',
          description: 'Show loading indicator while fetching',
          picked: true,
        },
        {
          label: 'Include Error Handling',
          description: 'Handle and display errors',
          picked: true,
        },
        {
          label: 'Generate Hook',
          description: 'Generate custom hook for infinite scroll',
          picked: true,
        },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    const featureLabels = features.map((f) => f.label);

    // Ask for threshold
    const thresholdInput = await vscode.window.showInputBox({
      prompt: 'Enter Intersection Observer threshold (0-1)',
      placeHolder: '0.1',
      value: '0.1',
      validateInput: (value) => {
        const num = Number.parseFloat(value);
        if (Number.isNaN(num) || num < 0 || num > 1) {
          return 'Threshold must be a number between 0 and 1';
        }
        return null;
      },
    });

    const threshold = thresholdInput ? Number.parseFloat(thresholdInput) : 0.1;

    // Ask for root margin
    const rootMargin = await vscode.window.showInputBox({
      prompt: 'Enter root margin (CSS format)',
      placeHolder: '0px',
      value: '0px',
    });

    return {
      componentName: componentName.trim(),
      componentDirectory: componentDirectory.trim(),
      includeTypeScript: featureLabels.includes('Include TypeScript'),
      includeIntersectionObserver: featureLabels.includes('Include Intersection Observer'),
      includeLoadingState: featureLabels.includes('Include Loading State'),
      includeErrorHandling: featureLabels.includes('Include Error Handling'),
      includeFetchMore: true,
      generateHook: featureLabels.includes('Generate Hook'),
      threshold,
      rootMargin: rootMargin?.trim() || '0px',
      triggerOnce: false,
    };
  }

  /**
   * Converts first letter to lowercase
   */
  private lowercaseFirstLetter(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}
