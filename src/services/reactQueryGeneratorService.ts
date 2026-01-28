import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ReactQueryFunction {
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

export interface ReactQueryHook {
  hookName: string;
  hookCode: string;
  hookFilePath: string;
  queryKey: string[];
  mutationKey: string[];
}

export interface ReactQueryGeneratorOptions {
  hooksDirectory: string;
  useInfiniteQuery: boolean;
  includeOptimisticUpdates: boolean;
  includeCacheInvalidation: boolean;
  generateApiService: boolean;
}

/**
 * Service for generating React Query hooks with TypeScript typing, cache management, and invalidation
 */
export class ReactQueryGeneratorService {
  private static instance: ReactQueryGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactQueryGeneratorService {
    ReactQueryGeneratorService.instance ??= new ReactQueryGeneratorService();
    return ReactQueryGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React Query hooks from selected code
   */
  public async generateReactQueryHooks(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ReactQueryGeneratorOptions,
  ): Promise<ReactQueryHook> {
    const selectedText = document.getText(selection);

    // Parse the function signature
    const functions = this.parseFunctions(selectedText);

    if (functions.length === 0) {
      throw new Error('Could not parse any valid functions from selection');
    }

    // Generate hooks for all functions
    const primaryFunction = functions[0];
    const hookCode = this.generateHookCode(primaryFunction, functions, document.fileName, options);

    // Determine hook file path
    const hookFilePath = this.calculateHookFilePath(document.fileName, primaryFunction, options);

    // Generate query keys
    const queryKey = this.generateQueryKey(primaryFunction);
    const mutationKey = this.generateMutationKey(primaryFunction);

    this.logger.info('React Query hooks generated', {
      hookName: primaryFunction.name,
      functionCount: functions.length,
    });

    return {
      hookName: this.getHookName(primaryFunction.name),
      hookCode,
      hookFilePath,
      queryKey,
      mutationKey,
    };
  }

  /**
   * Parses functions from code text
   */
  private parseFunctions(code: string): ReactQueryFunction[] {
    const functions: ReactQueryFunction[] = [];
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
   * Creates a ReactQueryFunction from a regex match
   */
  private createFunctionFromMatch(
    match: RegExpExecArray,
    code: string,
    index: number,
    type: 'function' | 'arrow',
  ): ReactQueryFunction | null {
    const name = match[1];
    const paramsStr = match[2];
    const returnType = match[3]?.trim() || 'unknown';
    const isAsync = /\basync\b/.test(code.substring(match.index, match.index + 100));
    const isExported = /\bexport\b/.test(code.substring(match.index, match.index + 100));

    const parameters = this.parseParameters(paramsStr);
    const httpMethod = this.inferHttpMethod(name, parameters);
    const endpoint = this.inferEndpoint(name, parameters);

    return {
      name,
      parameters,
      returnType,
      isAsync,
      isExported,
      description: `React Query hook for ${name}`,
      httpMethod,
      endpoint,
    };
  }

  /**
   * Infers HTTP method from function name
   */
  private inferHttpMethod(
    name: string,
    parameters: ParameterInfo[],
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
  private inferEndpoint(name: string, parameters: ParameterInfo[]): string | undefined {
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

      if (optionalMatch) {
        parameters.push({
          name: optionalMatch[1],
          type: optionalMatch[2].trim(),
          isOptional: true,
          isQuery: this.isQueryParam(optionalMatch[1]),
          isBody: this.isBodyParam(optionalMatch[1]),
          isParam: this.isPathParam(optionalMatch[1]),
        });
      } else if (typedMatch) {
        parameters.push({
          name: typedMatch[1],
          type: typedMatch[2].trim(),
          isOptional: false,
          isQuery: this.isQueryParam(typedMatch[1]),
          isBody: this.isBodyParam(typedMatch[1]),
          isParam: this.isPathParam(typedMatch[1]),
        });
      } else if (simpleMatch) {
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
   * Generates hook name from function name
   */
  private getHookName(functionName: string): string {
    const lowerName = functionName.charAt(0).toLowerCase() + functionName.slice(1);

    if (lowerName.startsWith('use')) {
      return lowerName;
    }

    return `use${functionName.charAt(0).toUpperCase() + functionName.slice(1)}`;
  }

  /**
   * Generates query key for the hook
   */
  private generateQueryKey(func: ReactQueryFunction): string[] {
    const baseKey = func.name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    return [baseKey];
  }

  /**
   * Generates mutation key for the hook
   */
  private generateMutationKey(func: ReactQueryFunction): string[] {
    const baseKey = func.name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    return [baseKey, 'mutate'];
  }

  /**
   * Generates the complete hook code
   */
  private generateHookCode(
    primaryFunction: ReactQueryFunction,
    allFunctions: ReactQueryFunction[],
    sourceFilePath: string,
    options: ReactQueryGeneratorOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(primaryFunction, sourceFilePath, options);

    // Generate query keys
    code += this.generateQueryKeys(primaryFunction, allFunctions);

    // Generate the hook
    const hookName = this.getHookName(primaryFunction.name);
    const isMutation = this.isMutationFunction(primaryFunction);

    if (isMutation) {
      code += this.generateMutationHook(primaryFunction, hookName, options);
    } else {
      code += this.generateQueryHook(primaryFunction, hookName, options);
      if (options.useInfiniteQuery) {
        code += this.generateInfiniteQueryHook(primaryFunction, hookName, options);
      }
    }

    // Generate API service if enabled
    if (options.generateApiService) {
      code += this.generateApiService(allFunctions);
    }

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    func: ReactQueryFunction,
    sourceFilePath: string,
    options: ReactQueryGeneratorOptions,
  ): string {
    let imports =
      "import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';\n";

    if (options.includeOptimisticUpdates) {
      imports += "import { useContext } from 'react';\n";
    }

    // Import the API types if needed
    if (func.returnType !== 'unknown' && func.returnType !== 'void') {
      imports += `\n// Types\n`;
      imports += `export type ${this.capitalize(func.name)}Response = ${func.returnType};\n`;

      for (const param of func.parameters) {
        if (param.type !== 'any') {
          imports += `export type ${this.capitalize(func.name)}${this.capitalize(param.name)} = ${param.type};\n`;
        }
      }
    }

    imports += '\n';

    return imports;
  }

  /**
   * Capitalizes a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generates query keys
   */
  private generateQueryKeys(
    primaryFunction: ReactQueryFunction,
    allFunctions: ReactQueryFunction[],
  ): string {
    let code = '// Query Keys\n';
    code += `export const ${this.getKeysName(primaryFunction.name)} = {\n`;
    code += `  all: () => ['${this.getBaseKeyName(primaryFunction.name)}'] as const,\n`;
    code += `  lists: () => ['${this.getBaseKeyName(primaryFunction.name)}', 'list'] as const,\n`;
    code += `  details: () => ['${this.getBaseKeyName(primaryFunction.name)}', 'detail'] as const,\n`;

    const queryParams = primaryFunction.parameters.filter(
      (p) => p.isQuery || (!p.isBody && !p.isParam),
    );
    if (queryParams.length > 0) {
      const params = queryParams.map((p) => p.name).join(', ');
      code += `  detail: (${params}) => ['${this.getBaseKeyName(primaryFunction.name)}', 'detail', ${params}] as const,\n`;
    }

    code += `} as const;\n\n`;

    return code;
  }

  /**
   * Gets base key name from function name
   */
  private getBaseKeyName(functionName: string): string {
    return functionName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Gets keys object name
   */
  private getKeysName(functionName: string): string {
    return `${functionName}Keys`;
  }

  /**
   * Checks if function is a mutation
   */
  private isMutationFunction(func: ReactQueryFunction): boolean {
    const method = func.httpMethod;
    return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  }

  /**
   * Generates a query hook
   */
  private generateQueryHook(
    func: ReactQueryFunction,
    hookName: string,
    options: ReactQueryGeneratorOptions,
  ): string {
    let code = `/**\n`;
    code += ` * ${func.description}\n`;
    code += ` */\n`;
    code += `export function ${hookName}(\n`;
    code += `  ${this.generateHookParameters(func, options)}\n`;
    code += `) {\n`;

    // Generate query options
    code += `  const queryOptions: UseQueryOptions<${func.returnType}, Error> = {\n`;
    code += `    queryKey: ${this.getKeysName(func.name)}.detail(${func.parameters.map((p) => p.name).join(', ')}),\n`;
    code += `    queryFn: async () => {\n`;
    code += `      const response = await ${func.name}(${func.parameters.map((p) => p.name).join(', ')});\n`;
    code += `      return response;\n`;
    code += `    },\n`;
    code += `    staleTime: 1000 * 60 * 5, // 5 minutes\n`;
    code += `    ...options,\n`;
    code += `  };\n\n`;

    code += `  return useQuery(queryOptions);\n`;
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates an infinite query hook
   */
  private generateInfiniteQueryHook(
    func: ReactQueryFunction,
    hookName: string,
    options: ReactQueryGeneratorOptions,
  ): string {
    const infiniteHookName = hookName.replace('use', 'useInfinite');

    let code = `/**\n`;
    code += ` * Infinite query version of ${hookName}\n`;
    code += ` */\n`;
    code += `export function ${infiniteHookName}(\n`;
    code += `  ${this.generateHookParameters(func, options, true)}\n`;
    code += `) {\n`;

    code += `  const queryOptions = {\n`;
    code += `    queryKey: ${this.getKeysName(func.name)}.all(),\n`;
    code += `    queryFn: async ({ pageParam = 0 }) => {\n`;
    code += `      const response = await ${func.name}(${func.parameters.map((p) => p.name).join(', ')}, { page: pageParam });\n`;
    code += `      return response;\n`;
    code += `    },\n`;
    code += `    initialPageParam: 0,\n`;
    code += `    getNextPageParam: (lastPage: any, allPages: any) => {\n`;
    code += `      if (lastPage.hasMore) {\n`;
    code += `        return allPages.length;\n`;
    code += `      }\n`;
    code += `      return undefined;\n`;
    code += `    },\n`;
    code += `    ...options,\n`;
    code += `  };\n\n`;

    code += `  return useInfiniteQuery(queryOptions);\n`;
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates a mutation hook
   */
  private generateMutationHook(
    func: ReactQueryFunction,
    hookName: string,
    options: ReactQueryGeneratorOptions,
  ): string {
    let code = `/**\n`;
    code += ` * ${func.description}\n`;
    code += ` */\n`;
    code += `export function ${hookName}(\n`;
    code += `  options?: UseMutationOptions<${func.returnType}, Error${func.parameters.length > 0 ? ', ' + func.parameters.map((p) => p.type).join(', ') : ''}>\n`;
    code += `) {\n`;
    code += `  const queryClient = useQueryClient();\n\n`;

    code += `  const mutation = useMutation({\n`;
    code += `    mutationFn: async (${func.parameters.map((p) => `${p.name}: ${p.type}${p.isOptional ? '?' : ''}`).join(', ')}) => {\n`;
    code += `      const response = await ${func.name}(${func.parameters.map((p) => p.name).join(', ')});\n`;
    code += `      return response;\n`;
    code += `    },\n`;
    code += `    onSuccess: (data, variables, context) => {\n`;
    code += `      options?.onSuccess?.(data, variables, context);\n`;

    // Add cache invalidation if enabled
    if (options.includeCacheInvalidation) {
      code += `      // Invalidate related queries\n`;
      code += `      queryClient.invalidateQueries({ queryKey: ${this.getKeysName(func.name)}.all() });\n`;
    }

    code += `    },\n`;
    code += `    ...options,\n`;
    code += `  });\n\n`;

    code += `  return mutation;\n`;
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates hook parameters
   */
  private generateHookParameters(
    func: ReactQueryFunction,
    options: ReactQueryGeneratorOptions,
    includePageParam = false,
  ): string {
    const params: string[] = [];

    // Add function parameters
    for (const param of func.parameters) {
      if (!param.isBody && !param.isParam) {
        const optional = param.isOptional ? '?' : '';
        params.push(`${param.name}${optional}: ${param.type}`);
      }
    }

    // Add page parameter for infinite queries
    if (includePageParam) {
      params.push('pageParam?: number');
    }

    // Add options parameter
    params.push(
      `options?: Omit<UseQueryOptions<${func.returnType}, Error>, 'queryKey' | 'queryFn'>`,
    );

    return params.join(',\n  ');
  }

  /**
   * Generates API service functions
   */
  private generateApiService(functions: ReactQueryFunction[]): string {
    let code = '\n// API Service\n';
    code += `const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';\n\n`;

    for (const func of functions) {
      code += `/**\n`;
      code += ` * API function for ${func.name}\n`;
      code += ` */\n`;
      code += `async function ${func.name}(\n`;
      code += `  ${func.parameters.map((p) => `${p.name}: ${p.type}${p.isOptional ? '?' : ''}`).join(',\n  ')}\n`;
      code += `): Promise<${func.returnType}> {\n`;

      const method = func.httpMethod || 'GET';
      code += `  const response = await fetch(\`\${API_BASE_URL}${func.endpoint || ''}\`, {\n`;
      code += `    method: '${method}',\n`;

      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const bodyParam = func.parameters.find((p) => p.isBody);
        if (bodyParam) {
          code += `    headers: {\n`;
          code += `      'Content-Type': 'application/json',\n`;
          code += `    },\n`;
          code += `    body: JSON.stringify(${bodyParam.name}),\n`;
        }
      }

      code += `  });\n\n`;
      code += `  if (!response.ok) {\n`;
      code += `    throw new Error(\`${func.name} failed: \${response.statusText}\`);\n`;
      code += `  }\n\n`;
      code += `  return response.json();\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Calculates hook file path
   */
  private calculateHookFilePath(
    sourceFilePath: string,
    func: ReactQueryFunction,
    options: ReactQueryGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const hooksDirectory = options.hooksDirectory || 'hooks';

    const hookFileName = `${this.getHookName(func.name)}.ts`;
    return path.join(sourceDir, hooksDirectory, hookFileName);
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
    this.logger.info('Hook file created', { filePath });
  }

  /**
   * Checks if a hook file already exists
   */
  public async hookFileExists(filePath: string): Promise<boolean> {
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
  public async getGeneratorOptions(): Promise<ReactQueryGeneratorOptions | undefined> {
    // Ask for hooks directory
    const hooksDirectory = await vscode.window.showInputBox({
      prompt: 'Enter hooks directory name',
      placeHolder: 'hooks',
      value: 'hooks',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Hooks directory cannot be empty';
        }
        return null;
      },
    });

    if (!hooksDirectory) {
      return undefined;
    }

    // Ask for features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Basic', description: 'Generate basic hooks only', picked: true },
        {
          label: 'With Infinite Query',
          description: 'Include infinite query hooks',
          picked: false,
        },
        {
          label: 'With Optimistic Updates',
          description: 'Include optimistic updates',
          picked: false,
        },
        {
          label: 'With Cache Invalidation',
          description: 'Include cache invalidation',
          picked: true,
        },
        { label: 'With API Service', description: 'Generate API service functions', picked: true },
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
      hooksDirectory: hooksDirectory.trim(),
      useInfiniteQuery: featureLabels.includes('With Infinite Query'),
      includeOptimisticUpdates: featureLabels.includes('With Optimistic Updates'),
      includeCacheInvalidation: featureLabels.includes('With Cache Invalidation'),
      generateApiService: featureLabels.includes('With API Service'),
    };
  }
}
