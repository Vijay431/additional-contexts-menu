import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SolidResourceFunction {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  description: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isQuery: boolean;
  isBody: boolean;
  isParam: boolean;
}

export interface SolidResource {
  resourceName: string;
  resourceCode: string;
  resourceFilePath: string;
  importPath: string;
  resourceKey: string[];
}

export interface SolidResourceGeneratorOptions {
  resourcesDirectory: string;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  includeErrorHandling: boolean;
  includeLoadingState: boolean;
  includeRefreshFunction: boolean;
  generateResourceFromFetcher: boolean;
}

/**
 * Service for generating SolidJS resources with TypeScript typing for async data fetching.
 * Generates resource wrappers with proper loading states, error handling, and reactivity.
 */
export class SolidResourceGeneratorService {
  private static instance: SolidResourceGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SolidResourceGeneratorService {
    SolidResourceGeneratorService.instance ??= new SolidResourceGeneratorService();
    return SolidResourceGeneratorService.instance;
  }

  /**
   * Main entry point: Generates SolidJS resources from selected code
   */
  public async generateSolidResource(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: SolidResourceGeneratorOptions,
  ): Promise<SolidResource> {
    const selectedText = document.getText(selection);

    // Parse the function signature
    const functions = this.parseFunctions(selectedText);

    if (functions.length === 0) {
      throw new Error('Could not parse any valid functions from selection');
    }

    // Generate resource for the primary function
    const primaryFunction = functions[0];
    if (!primaryFunction) {
      throw new Error('Could not extract primary function');
    }

    const resourceCode = this.generateResourceCode(primaryFunction, document.fileName, options);

    // Determine resource file path
    const resourceFilePath = this.calculateResourceFilePath(document.fileName, primaryFunction, options);

    // Generate resource key
    const resourceKey = this.generateResourceKey(primaryFunction);

    this.logger.info('SolidJS resource generated', {
      resourceName: primaryFunction.name,
      functionCount: functions.length,
    });

    return {
      resourceName: this.getResourceName(primaryFunction.name),
      resourceCode,
      resourceFilePath,
      importPath: this.calculateImportPath(document.fileName, primaryFunction, options),
      resourceKey,
    };
  }

  /**
   * Parses functions from code text
   */
  private parseFunctions(code: string): SolidResourceFunction[] {
    const functions: SolidResourceFunction[] = [];
    const trimmedCode = code.trim();

    // Match function declarations
    const functionPattern =
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?/g;

    // Match arrow functions
    const arrowPattern =
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?\s*=>/g;

    let match;
    let index = 0;

    while ((match = functionPattern.exec(trimmedCode)) !== null) {
      const func = this.createFunctionFromMatch(match, trimmedCode, index++, 'function');
      if (func) {
        functions.push(func);
      }
    }

    while ((match = arrowPattern.exec(trimmedCode)) !== null) {
      const func = this.createFunctionFromMatch(match, trimmedCode, index++, 'arrow');
      if (func) {
        functions.push(func);
      }
    }

    return functions;
  }

  /**
   * Creates a SolidResourceFunction from a regex match
   */
  private createFunctionFromMatch(
    match: RegExpExecArray,
    code: string,
    _index: number,
    _type: 'function' | 'arrow',
  ): SolidResourceFunction | null {
    const name = match[1];
    if (!name) {
      return null;
    }

    const paramsStr = match[2] ?? '';
    const returnType = match[3]?.trim() ?? 'unknown';
    const isAsync = /\basync\b/.test(code.substring(match.index, match.index + 100));
    const isExported = /\bexport\b/.test(code.substring(match.index, match.index + 100));

    const parameters = this.parseParameters(paramsStr);
    const httpMethod = this.inferHttpMethod(name);
    const endpoint = this.inferEndpoint(name);

    const result: SolidResourceFunction = {
      name,
      parameters,
      returnType,
      isAsync,
      isExported,
      description: `SolidJS resource for ${name}`,
    };

    if (httpMethod) {
      result.httpMethod = httpMethod;
    }

    if (endpoint) {
      result.endpoint = endpoint;
    }

    return result;
  }

  /**
   * Infers HTTP method from function name
   */
  private inferHttpMethod(
    name: string,
    _parameters?: ParameterInfo[],
  ): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | undefined {
    const lowerName = name.toLowerCase();

    if (
      lowerName.startsWith('get') ||
      lowerName.startsWith('fetch') ||
      lowerName.startsWith('list')
    ) {
      return 'GET';
    }
    if (
      lowerName.startsWith('create') ||
      lowerName.startsWith('add') ||
      lowerName.startsWith('post')
    ) {
      return 'POST';
    }
    if (lowerName.startsWith('update') || lowerName.startsWith('edit')) {
      return 'PUT';
    }
    if (lowerName.startsWith('patch') || lowerName.startsWith('modify')) {
      return 'PATCH';
    }
    if (lowerName.startsWith('delete') || lowerName.startsWith('remove')) {
      return 'DELETE';
    }

    return undefined;
  }

  /**
   * Infers API endpoint from function name
   */
  private inferEndpoint(name: string, _parameters?: ParameterInfo[]): string | undefined {
    const lowerName = name.toLowerCase();

    // Remove common prefixes
    const cleanName = lowerName
      .replace(/^(get|fetch|list|create|add|post|update|edit|put|patch|modify|delete|remove)/, '')
      .replace(/^(api|use|handle|process)/, '');

    if (cleanName) {
      // Convert camelCase to kebab-case
      const endpoint = cleanName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      return `/${endpoint}`;
    }

    return undefined;
  }

  /**
   * Parses parameters from parameter string
   */
  private parseParameters(paramsStr: string): ParameterInfo[] {
    const parameters: ParameterInfo[] = [];

    if (!paramsStr.trim()) {
      return parameters;
    }

    const paramList = this.smartSplit(paramsStr, ',');

    for (const param of paramList) {
      const trimmed = param.trim();

      // Match: name: type, or name?: type
      const optionalMatch = trimmed.match(/^(\w+)\s*\?\s*:\s*(.+)$/);
      const typedMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      const simpleMatch = trimmed.match(/^(\w+)$/);

      if (optionalMatch && optionalMatch[1] && optionalMatch[2]) {
        parameters.push({
          name: optionalMatch[1],
          type: optionalMatch[2].trim(),
          isOptional: true,
          isQuery: this.isQueryParam(optionalMatch[1]),
          isBody: this.isBodyParam(optionalMatch[1]),
          isParam: this.isPathParam(optionalMatch[1]),
        });
      } else if (typedMatch && typedMatch[1] && typedMatch[2]) {
        parameters.push({
          name: typedMatch[1],
          type: typedMatch[2].trim(),
          isOptional: false,
          isQuery: this.isQueryParam(typedMatch[1]),
          isBody: this.isBodyParam(typedMatch[1]),
          isParam: this.isPathParam(typedMatch[1]),
        });
      } else if (simpleMatch && simpleMatch[1]) {
        parameters.push({
          name: simpleMatch[1],
          type: 'any',
          isOptional: false,
          isQuery: this.isQueryParam(simpleMatch[1]),
          isBody: this.isBodyParam(simpleMatch[1]),
          isParam: this.isPathParam(simpleMatch[1]),
        });
      }
    }

    return parameters;
  }

  /**
   * Checks if a parameter is a query parameter
   */
  private isQueryParam(paramName: string): boolean {
    const lower = paramName.toLowerCase();
    return (
      lower.startsWith('query') ||
      lower.startsWith('filter') ||
      lower.startsWith('search') ||
      lower.includes('param')
    );
  }

  /**
   * Checks if a parameter is a body parameter
   */
  private isBodyParam(paramName: string): boolean {
    const lower = paramName.toLowerCase();
    return (
      lower === 'data' || lower === 'body' || lower === 'payload' || lower.startsWith('request')
    );
  }

  /**
   * Checks if a parameter is a path parameter
   */
  private isPathParam(paramName: string): boolean {
    const lower = paramName.toLowerCase();
    return lower === 'id' || lower.startsWith('path') || lower.includes('uuid');
  }

  /**
   * Smart split that respects nested brackets
   */
  private smartSplit(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if ((char === '"' || char === "'" || char === '`') && (i === 0 || str[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(' || char === '{' || char === '[') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']') {
          depth--;
        }
      }

      if (char === delimiter && depth === 0 && !inString) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result.filter((s) => s.length > 0);
  }

  /**
   * Generates resource name from function name
   */
  private getResourceName(functionName: string): string {
    const lowerName = functionName.charAt(0).toLowerCase() + functionName.slice(1);

    if (lowerName.startsWith('use')) {
      return lowerName;
    }

    return `use${functionName.charAt(0).toUpperCase() + functionName.slice(1)}`;
  }

  /**
   * Generates resource key for the resource
   */
  private generateResourceKey(func: SolidResourceFunction): string[] {
    const baseKey = func.name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    return [baseKey];
  }

  /**
   * Generates the complete resource code
   */
  private generateResourceCode(
    func: SolidResourceFunction,
    _sourceFilePath: string,
    options: SolidResourceGeneratorOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(func, options);

    // Add types if TypeScript is enabled
    if (options.includeTypeScript) {
      code += this.generateTypes(func);
    }

    // Generate the resource
    const resourceName = this.getResourceName(func.name);
    code += this.generateResource(func, resourceName, options);

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    func: SolidResourceFunction,
    options: SolidResourceGeneratorOptions,
  ): string {
    let imports = "import { createResource } from 'solid-js';\n";
    imports += "import { createStore, produce } from 'solid-js/store';\n";

    if (options.includeLoadingState) {
      imports += "import { Show, For, Suspense } from 'solid-js';\n";
    }

    imports += '\n';

    // Import the original function if needed
    if (options.generateResourceFromFetcher) {
      const relativePath = this.getRelativeImportPath(func);
      imports += `import { ${func.name} } from '${relativePath}';\n\n`;
    }

    return imports;
  }

  /**
   * Generates TypeScript types
   */
  private generateTypes(func: SolidResourceFunction): string {
    let types = '// Types\n';

    if (func.returnType !== 'unknown' && func.returnType !== 'void') {
      types += `export type ${this.capitalize(func.name)}Response = ${func.returnType};\n`;
    }

    for (const param of func.parameters) {
      if (param.type !== 'any') {
        types += `export type ${this.capitalize(func.name)}${this.capitalize(param.name)} = ${param.type};\n`;
      }
    }

    types += '\n';

    return types;
  }

  /**
   * Generates a SolidJS resource
   */
  private generateResource(
    func: SolidResourceFunction,
    resourceName: string,
    options: SolidResourceGeneratorOptions,
  ): string {
    let code = '';

    // Add JSDoc if enabled
    if (options.includeJSDoc) {
      code += '/**\n';
      code += ` * ${func.description}\n`;
      if (func.parameters.length > 0) {
        code += ' *\n';
        for (const param of func.parameters) {
          const optional = param.isOptional ? '?' : '';
          code += ` * @param {${param.type}} ${param.name}${optional}\n`;
        }
      }
      code += ` * @returns {Resource<${func.returnType}>} SolidJS resource\n`;
      code += ' */\n';
    }

    // Generate resource function
    code += `export function ${resourceName}(\n`;
    code += `  ${this.generateResourceParameters(func, options)}\n`;
    code += `) {\n`;

    // Generate fetcher function
    const fetcherName = `fetch${this.capitalize(func.name)}`;
    code += `  const ${fetcherName} = async (${func.parameters
      .map((p) => `${p.name}: ${p.type}${p.isOptional ? '?' : ''}`)
      .join(', ')}): Promise<${func.returnType}> => {\n`;

    if (options.includeErrorHandling) {
      code += `    try {\n`;
      code += `      const response = await ${func.name}(${func.parameters.map((p) => p.name).join(', ')});\n`;
      code += `      return response;\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error('Error fetching ${func.name}:', error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
    } else {
      code += `    return await ${func.name}(${func.parameters.map((p) => p.name).join(', ')});\n`;
    }

    code += `  };\n\n`;

    // Generate the resource
    code += `  const [resource, { refetch, mutate }] = createResource(${func.parameters.length > 0 ? `{ ${func.parameters.map(p => p.name).join(', ')} }` : ''}, ${fetcherName});\n\n`;

    // Add refresh function if enabled
    if (options.includeRefreshFunction) {
      code += `  const refresh = () => {\n`;
      code += `    refetch();\n`;
      code += `  };\n\n`;
    }

    // Return statement
    code += `  return {\n`;
    code += `    resource,\n`;
    code += `    refetch,\n`;
    code += `    mutate,\n`;
    if (options.includeRefreshFunction) {
      code += `    refresh,\n`;
    }
    code += `  };\n`;
    code += `}\n\n`;

    // Generate usage example component
    if (options.includeLoadingState) {
      code += this.generateUsageExample(func, resourceName, options);
    }

    return code;
  }

  /**
   * Generates resource parameters
   */
  private generateResourceParameters(
    func: SolidResourceFunction,
    options: SolidResourceGeneratorOptions,
  ): string {
    const params: string[] = [];

    // Add function parameters
    for (const param of func.parameters) {
      const optional = param.isOptional ? '?' : '';
      params.push(`${param.name}${optional}: ${param.type}`);
    }

    // Add options parameter
    if (options.includeTypeScript) {
      params.push(`options?: { initialValue?: ${func.returnType} }`);
    } else {
      params.push('options?: any');
    }

    return params.join(',\n  ');
  }

  /**
   * Generates usage example component
   */
  private generateUsageExample(
    func: SolidResourceFunction,
    resourceName: string,
    options: SolidResourceGeneratorOptions,
  ): string {
    let code = '// Usage Example Component\n';
    const componentName = `${this.capitalize(func.name)}Viewer`;

    code += `export function ${componentName}(\n`;
    code += `  props: { ${func.parameters.map(p => `${p.name}: ${p.type}`).join(', ')} }\n`;
    code += `) {\n`;
    code += `  const { resource } = ${resourceName}(${func.parameters.map(p => p.name).join(', ')});\n\n`;

    if (options.includeLoadingState) {
      code += `  return (\n`;
      code += `    <Suspense fallback={<div>Loading...</div>}>\n`;
      code += `      <Show when={resource()} fallback={<div>Error loading data</div>}>\n`;
      code += `        {(data) => (\n`;
      code += `          <div>\n`;
      code += `            {/* Render your data here */}\n`;
      code += `            <pre>{JSON.stringify(data(), null, 2)}</pre>\n`;
      code += `          </div>\n`;
      code += `        )}\n`;
      code += `      </Show>\n`;
      code += `    </Suspense>\n`;
      code += `  );\n`;
    }

    code += `}\n\n`;

    return code;
  }

  /**
   * Capitalizes a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Calculates resource file path
   */
  private calculateResourceFilePath(
    sourceFilePath: string,
    func: SolidResourceFunction,
    options: SolidResourceGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const resourcesDirectory = options.resourcesDirectory || 'resources';

    const resourceFileName = `${this.getResourceName(func.name)}.ts`;
    return path.join(sourceDir, resourcesDirectory, resourceFileName);
  }

  /**
   * Calculates import path
   */
  private calculateImportPath(
    _sourceFilePath: string,
    func: SolidResourceFunction,
    options: SolidResourceGeneratorOptions,
  ): string {
    const resourcesDirectory = options.resourcesDirectory || 'resources';
    return path.join(resourcesDirectory, `${this.getResourceName(func.name)}`);
  }

  /**
   * Gets relative import path
   */
  private getRelativeImportPath(func: SolidResourceFunction): string {
    // This would be calculated based on actual file structure
    return `../api/${func.name}`;
  }

  /**
   * Creates the resource file at the specified path
   */
  public async createResourceFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write resource file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('SolidJS resource file created', { filePath });
  }

  /**
   * Checks if a resource file already exists
   */
  public async resourceFileExists(filePath: string): Promise<boolean> {
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
  public async getGeneratorOptions(): Promise<SolidResourceGeneratorOptions | undefined> {
    // Ask for resources directory
    const resourcesDirectory = await vscode.window.showInputBox({
      prompt: 'Enter resources directory name',
      placeHolder: 'resources',
      value: 'resources',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Resources directory cannot be empty';
        }
        return null;
      },
    });

    if (!resourcesDirectory) {
      return undefined;
    }

    // Ask for features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'TypeScript typing', description: 'Include TypeScript types', picked: true },
        { label: 'JSDoc comments', description: 'Include JSDoc documentation', picked: true },
        { label: 'Error handling', description: 'Include try-catch blocks', picked: true },
        { label: 'Loading states', description: 'Include loading state components', picked: true },
        { label: 'Refresh function', description: 'Include refresh helper', picked: true },
        {
          label: 'Import fetcher',
          description: 'Import the original fetcher function',
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

    return {
      resourcesDirectory: resourcesDirectory.trim(),
      includeTypeScript: featureLabels.includes('TypeScript typing'),
      includeJSDoc: featureLabels.includes('JSDoc comments'),
      includeErrorHandling: featureLabels.includes('Error handling'),
      includeLoadingState: featureLabels.includes('Loading states'),
      includeRefreshFunction: featureLabels.includes('Refresh function'),
      generateResourceFromFetcher: featureLabels.includes('Import fetcher'),
    };
  }

  /**
   * Generates usage example
   */
  public generateUsageExampleText(resourceName: string, func: SolidResourceFunction): string {
    let example = `// Import the resource\n`;
    example += `import { ${resourceName} } from './resources/${resourceName}';\n\n`;
    example += `// In your component:\n`;
    example += `function MyComponent() {\n`;
    example += `  const { resource, refetch } = ${resourceName}(${func.parameters.map(p => `${p.name}: ${p.type}`).join(', ')});\n\n`;
    example += `  return (\n`;
    example += `    <Show when={resource()} fallback={<div>Loading...</div>}>\n`;
    example += `      {(data) => <div>{/* Render data */}</div>}\n`;
    example += `    </Show>\n`;
    example += `  );\n`;
    example += `}\n`;

    return example;
  }

  /**
   * Checks if code contains SolidJS imports
   */
  public containsSolidJSResources(code: string): boolean {
    const solidPatterns = [/from\s+['"]solid-js['"]/, /createResource\s*\(/];

    return solidPatterns.some((pattern) => pattern.test(code));
  }
}
