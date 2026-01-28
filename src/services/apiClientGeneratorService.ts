import * as path from 'path';
import * as vscode from 'vscode';

import {
  ApiClientFunction,
  ExpressRouteDefinition,
  GeneratedApiClient,
  RouteParameterDefinition,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for analyzing Express route definitions and generating frontend API client code.
 * Supports React, Vue, Angular, and Svelte frameworks with TypeScript or JavaScript.
 */
export class ApiClientGeneratorService {
  private static instance: ApiClientGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ApiClientGeneratorService {
    ApiClientGeneratorService.instance ??= new ApiClientGeneratorService();
    return ApiClientGeneratorService.instance;
  }

  /**
   * Main entry point: Generates API client code from Express route definitions
   */
  public async generateApiClient(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    config: {
      enabled: boolean;
      targetFramework: 'react' | 'vue' | 'angular' | 'svelte';
      includeTypeScript: boolean;
      generateFetchClient: boolean;
      generateAxiosClient: boolean;
      outputDirectory: string;
      baseApiUrl?: string;
    },
  ): Promise<GeneratedApiClient> {
    const selectedText = document.getText(selection);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    // Parse Express routes from selected text
    const routes = this.parseExpressRoutes(selectedText, document.fileName);

    if (routes.length === 0) {
      throw new Error('No Express routes found in selection');
    }

    this.logger.info('Express routes parsed', {
      routeCount: routes.length,
      framework: config.targetFramework,
    });

    // Generate API client functions
    const apiFunctions = this.generateApiFunctions(routes, config.baseApiUrl);

    // Generate client code based on framework
    const clientCode = this.generateClientCode(apiFunctions, config);

    // Determine output file path
    const outputFile = this.getOutputFilePath(
      workspaceFolder.uri.fsPath,
      config.outputDirectory,
      config.targetFramework,
      config.includeTypeScript,
    );

    this.logger.info('API client generated', {
      functionCount: apiFunctions.length,
      outputFile,
    });

    return {
      clientCode,
      functions: apiFunctions,
      outputFile,
      framework: config.targetFramework,
      language: config.includeTypeScript ? 'typescript' : 'javascript',
    };
  }

  /**
   * Parse Express route definitions from selected text
   */
  private parseExpressRoutes(code: string, filePath: string): ExpressRouteDefinition[] {
    const routes: ExpressRouteDefinition[] = [];
    const lines = code.split('\n');

    // Pattern to match Express route definitions
    // Matches: app.get('/path', handler), router.post('/path', handler), etc.
    const routePattern =
      /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?(?:function\s+)?(\w+)?/g;

    let match;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const matches = line.matchAll(routePattern);

      for (const m of matches) {
        const method = m[1]?.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        const routePath = m[2];
        const functionName = m[3];

        if (routePath) {
          // Extract parameters from the route path
          const parameters = this.extractPathParameters(routePath);

          routes.push({
            path: routePath,
            method,
            functionName,
            parameters,
            filePath,
            lineNumber,
          });
        }
      }
    }

    return routes;
  }

  /**
   * Extract path parameters from route path (e.g., /users/:id -> {id})
   */
  private extractPathParameters(routePath: string): RouteParameterDefinition[] {
    const parameters: RouteParameterDefinition[] = [];

    // Match :param style parameters
    const pathParamRegex = /:(\w+)/g;
    let match;

    while ((match = pathParamRegex.exec(routePath)) !== null) {
      parameters.push({
        name: match[1]!,
        type: 'string | number',
        location: 'path',
        required: true,
      });
    }

    return parameters;
  }

  /**
   * Generate API client functions from route definitions
   */
  private generateApiFunctions(
    routes: ExpressRouteDefinition[],
    baseApiUrl?: string,
  ): ApiClientFunction[] {
    const functions: ApiClientFunction[] = [];

    for (const route of routes) {
      // Generate function name from route path and method
      const functionName = this.generateFunctionName(route);

      // Determine return type based on method
      const returnType = this.inferReturnType(route);

      functions.push({
        name: functionName,
        httpMethod: route.method,
        endpoint: baseApiUrl ? baseApiUrl + route.path : route.path,
        parameters: route.parameters,
        returnType,
        description: `${route.method} request to ${route.path}`,
      });
    }

    return functions;
  }

  /**
   * Generate a function name from route path and method
   */
  private generateFunctionName(route: ExpressRouteDefinition): string {
    // Remove leading slash and convert path to camelCase
    const cleanPath = route.path.replace(/^\//, '').replace(/\//g, '_');

    // Convert route parameters :id to withId
    const convertedPath = cleanPath.replace(
      /:(\w+)/g,
      (_match, param) => `by${this.capitalize(param)}`,
    );

    const methodName = this.getMethodPrefix(route.method);
    const pathName = convertedPath || 'root';

    return `${methodName}${this.capitalize(pathName)}`;
  }

  /**
   * Get method prefix for function naming
   */
  private getMethodPrefix(method: string): string {
    const prefixes: Record<string, string> = {
      GET: 'get',
      POST: 'create',
      PUT: 'update',
      PATCH: 'patch',
      DELETE: 'delete',
    };
    return prefixes[method] || 'request';
  }

  /**
   * Infer return type based on HTTP method
   */
  private inferReturnType(route: ExpressRouteDefinition): string {
    if (route.method === 'GET') {
      return route.path.includes('/:') || route.path.includes('/:') ? 'T' : 'T[]';
    }
    if (route.method === 'POST') {
      return 'T';
    }
    if (route.method === 'PUT' || route.method === 'PATCH') {
      return 'T';
    }
    if (route.method === 'DELETE') {
      return 'void';
    }
    return 'any';
  }

  /**
   * Generate client code based on framework and language
   */
  private generateClientCode(
    functions: ApiClientFunction[],
    config: {
      targetFramework: 'react' | 'vue' | 'angular' | 'svelte';
      includeTypeScript: boolean;
      generateFetchClient: boolean;
      generateAxiosClient: boolean;
      baseApiUrl?: string;
    },
  ): string {
    const useTypeScript = config.includeTypeScript;

    if (config.targetFramework === 'react') {
      return this.generateReactClient(
        functions,
        useTypeScript,
        config.generateFetchClient,
        config.generateAxiosClient,
      );
    }
    if (config.targetFramework === 'vue') {
      return this.generateVueClient(
        functions,
        useTypeScript,
        config.generateFetchClient,
        config.generateAxiosClient,
      );
    }
    if (config.targetFramework === 'angular') {
      return this.generateAngularClient(functions, useTypeScript);
    }
    if (config.targetFramework === 'svelte') {
      return this.generateSvelteClient(
        functions,
        useTypeScript,
        config.generateFetchClient,
        config.generateAxiosClient,
      );
    }

    throw new Error(`Unsupported framework: ${config.targetFramework}`);
  }

  /**
   * Generate React API client
   */
  private generateReactClient(
    functions: ApiClientFunction[],
    useTypeScript: boolean,
    generateFetchClient: boolean,
    generateAxiosClient: boolean,
  ): string {
    let code = `// Auto-generated API client for React\n\n`;

    // Add imports
    if (generateAxiosClient) {
      code += `import axios from 'axios';\n\n`;
    }

    if (useTypeScript) {
      code += `// API Base URL\nconst API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';\n\n`;
      code += `// Types\nexport interface ApiResponse<T> {\n  data: T;\n  status: number;\n  message?: string;\n}\n\n`;
      code += `export interface ApiError {\n  message: string;\n  status?: number;\n  code?: string;\n}\n\n`;
    } else {
      code += `// API Base URL\nconst API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';\n\n`;
    }

    // Generate fetch-based client
    if (generateFetchClient) {
      code += `// Fetch-based API client\n`;
      code += this.generateFetchFunctions(functions, useTypeScript);
    }

    // Generate axios-based client
    if (generateAxiosClient) {
      code += `\n// Axios-based API client\n`;
      code += `const apiClient = axios.create({\n  baseURL: API_BASE_URL,\n  headers: {\n    'Content-Type': 'application/json',\n  },\n});\n\n`;
      code += this.generateAxiosFunctions(functions, useTypeScript);
    }

    return code;
  }

  /**
   * Generate Vue API client
   */
  private generateVueClient(
    functions: ApiClientFunction[],
    useTypeScript: boolean,
    generateFetchClient: boolean,
    generateAxiosClient: boolean,
  ): string {
    let code = `// Auto-generated API client for Vue\n\n`;

    // Add imports
    if (generateAxiosClient) {
      code += `import axios from 'axios';\n\n`;
    }

    if (useTypeScript) {
      code += `// API Base URL\nconst API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\n\n`;
      code += `// Types\nexport interface ApiResponse<T> {\n  data: T;\n  status: number;\n  message?: string;\n}\n\n`;
      code += `export interface ApiError {\n  message: string;\n  status?: number;\n  code?: string;\n}\n\n`;
    } else {
      code += `// API Base URL\nconst API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\n\n`;
    }

    // Generate fetch-based client
    if (generateFetchClient) {
      code += `// Fetch-based API client\n`;
      code += this.generateFetchFunctions(functions, useTypeScript);
    }

    // Generate axios-based client
    if (generateAxiosClient) {
      code += `\n// Axios-based API client\n`;
      code += `const apiClient = axios.create({\n  baseURL: API_BASE_URL,\n  headers: {\n    'Content-Type': 'application/json',\n  },\n});\n\n`;
      code += this.generateAxiosFunctions(functions, useTypeScript);
    }

    return code;
  }

  /**
   * Generate Angular API client
   */
  private generateAngularClient(functions: ApiClientFunction[], useTypeScript: boolean): string {
    let code = `// Auto-generated API client for Angular\n\n`;
    code += `import { Injectable } from '@angular/core';\n`;
    code += `import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';\n`;
    code += `import { Observable } from 'rxjs';\n\n`;

    if (useTypeScript) {
      code += `// Types\nexport interface ApiResponse<T> {\n  data: T;\n  status: number;\n  message?: string;\n}\n\n`;
      code += `export interface ApiError {\n  message: string;\n  status?: number;\n  code?: string;\n}\n\n`;
    }

    code += `@Injectable({\n  providedIn: 'root',\n})\n`;
    code += `export class ApiClientService {\n  private apiUrl = 'http://localhost:3000';\n\n`;
    code += `  constructor(private http: HttpClient) {}\n\n`;

    // Generate HTTP methods
    for (const func of functions) {
      code += `  /**\n   * ${func.description}\n   */\n`;

      if (func.httpMethod === 'GET') {
        const queryParams = func.parameters.filter((p) => p.location === 'query');
        if (queryParams.length > 0) {
          const params = queryParams
            .map((p) => `${p.name}?${useTypeScript ? `: string | number` : ''}`)
            .join(', ');
          code += `  ${func.name}(${params}): Observable<${func.returnType}> {\n`;
          code += `    let params = new HttpParams();\n`;
          for (const param of queryParams) {
            code += `    if (${param.name}) params = params.set('${param.name}', ${param.name});\n`;
          }
          code += `    return this.http.get<${func.returnType}>(\`\${this.apiUrl}${func.endpoint}\`, { params });\n`;
          code += `  }\n\n`;
        } else {
          code += `  ${func.name}(): Observable<${func.returnType}> {\n`;
          code += `    return this.http.get<${func.returnType}>(\`\${this.apiUrl}${func.endpoint}\`);\n`;
          code += `  }\n\n`;
        }
      } else if (
        func.httpMethod === 'POST' ||
        func.httpMethod === 'PUT' ||
        func.httpMethod === 'PATCH'
      ) {
        code += `  ${func.name}(data${useTypeScript ? ': any' : ''}): Observable<${func.returnType}> {\n`;
        code += `    return this.http.${func.httpMethod.toLowerCase()}<${func.returnType}>(\`\${this.apiUrl}${func.endpoint}\`, data);\n`;
        code += `  }\n\n`;
      } else if (func.httpMethod === 'DELETE') {
        code += `  ${func.name}(): Observable<void> {\n`;
        code += `    return this.http.delete(\`\${this.apiUrl}${func.endpoint}\`);\n`;
        code += `  }\n\n`;
      }
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generate Svelte API client
   */
  private generateSvelteClient(
    functions: ApiClientFunction[],
    useTypeScript: boolean,
    generateFetchClient: boolean,
    generateAxiosClient: boolean,
  ): string {
    let code = `// Auto-generated API client for Svelte\n\n`;

    // Add imports
    if (generateAxiosClient) {
      code += `import axios from 'axios';\n\n`;
    }

    if (useTypeScript) {
      code += `// API Base URL\nconst API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\n\n`;
      code += `// Types\nexport interface ApiResponse<T> {\n  data: T;\n  status: number;\n  message?: string;\n}\n\n`;
      code += `export interface ApiError {\n  message: string;\n  status?: number;\n  code?: string;\n}\n\n`;
    } else {
      code += `// API Base URL\nconst API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\n\n`;
    }

    // Generate fetch-based client
    if (generateFetchClient) {
      code += `// Fetch-based API client\n`;
      code += this.generateFetchFunctions(functions, useTypeScript);
    }

    // Generate axios-based client
    if (generateAxiosClient) {
      code += `\n// Axios-based API client\n`;
      code += `const apiClient = axios.create({\n  baseURL: API_BASE_URL,\n  headers: {\n    'Content-Type': 'application/json',\n  },\n});\n\n`;
      code += this.generateAxiosFunctions(functions, useTypeScript);
    }

    return code;
  }

  /**
   * Generate fetch-based API functions
   */
  private generateFetchFunctions(functions: ApiClientFunction[], useTypeScript: boolean): string {
    let code = '';

    for (const func of functions) {
      code += `/**\n * ${func.description}\n */\n`;
      code += `export async function ${func.name}(`;

      // Add parameters
      const params = func.parameters.map((p) => {
        const optional = p.required ? '' : '?';
        return `${p.name}${optional}${useTypeScript ? `: ${p.type}` : ''}`;
      });
      code += params.join(', ');

      code += `)${useTypeScript ? `: Promise<${func.returnType}>` : ''} {\n`;

      // Build endpoint with path parameters
      let endpoint = `\`\${API_BASE_URL}${func.endpoint}\``;
      if (func.parameters.some((p) => p.location === 'path')) {
        endpoint = `\`\${API_BASE_URL}${func.endpoint}\``.replace(
          /:\w+/g,
          (match) => `\${${match.slice(1)}}`,
        );
      }

      // Generate fetch call
      code += `  const response = await fetch(${endpoint}, {\n`;
      code += `    method: '${func.httpMethod}',\n`;

      if (func.httpMethod !== 'GET' && func.httpMethod !== 'DELETE') {
        code += `    headers: {\n      'Content-Type': 'application/json',\n    },\n`;
        code += `    body: JSON.stringify(data),\n`;
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
   * Generate axios-based API functions
   */
  private generateAxiosFunctions(functions: ApiClientFunction[], useTypeScript: boolean): string {
    let code = '';

    for (const func of functions) {
      code += `/**\n * ${func.description}\n */\n`;
      code += `export async function ${func.name}(`;

      // Add parameters
      const params = func.parameters.map((p) => {
        const optional = p.required ? '' : '?';
        return `${p.name}${optional}${useTypeScript ? `: ${p.type}` : ''}`;
      });

      // Add data/body parameter for POST/PUT/PATCH
      if (func.httpMethod === 'POST' || func.httpMethod === 'PUT' || func.httpMethod === 'PATCH') {
        params.push(`data${useTypeScript ? ': any' : ''}`);
      }

      code += params.join(', ');

      code += `)${useTypeScript ? `: Promise<${func.returnType}>` : ''} {\n`;

      // Build endpoint with path parameters
      let endpoint = `\`${func.endpoint}\``;
      if (func.parameters.some((p) => p.location === 'path')) {
        endpoint = `\`${func.endpoint}\``.replace(/:\w+/g, (match) => `\${${match.slice(1)}}`);
      }

      // Generate axios call
      if (func.httpMethod === 'GET') {
        code += `  const response = await apiClient.get<${func.returnType}>(${endpoint}`;
        if (func.parameters.some((p) => p.location === 'query')) {
          const queryParams = func.parameters
            .filter((p) => p.location === 'query')
            .map((p) => p.name)
            .join(', ');
          code += `, { params: { ${queryParams} } }`;
        }
        code += `);\n`;
      } else {
        code += `  const response = await apiClient.${func.httpMethod.toLowerCase()}<${func.returnType}>(${endpoint}, data);\n`;
      }

      code += `  return response.data;\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Get output file path for the generated API client
   */
  private getOutputFilePath(
    workspacePath: string,
    outputDirectory: string,
    framework: string,
    useTypeScript: boolean,
  ): string {
    const ext = useTypeScript ? 'ts' : 'js';
    const fileName = `api-client.${ext}`;
    return path.join(workspacePath, outputDirectory, framework, fileName);
  }

  /**
   * Capitalize a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Create the API client file at the specified path
   */
  public async createApiClientFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('API client file created', { filePath });
  }

  /**
   * Checks if an API client file already exists
   */
  public async apiClientFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
