import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SvelteKitServerGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeValidation: boolean;
  defaultRoutePath: string;
  exportPattern: 'named' | 'default';
}

export interface SvelteKitHttpMethod {
  type: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  description?: string;
  params: SvelteKitApiParam[];
  returnType: string;
  statusCode?: number;
}

export interface SvelteKitApiParam {
  name: string;
  type: 'query' | 'body' | 'header' | 'cookie';
  dataType: string;
  required: boolean;
  description?: string;
  validation?: string;
}

export interface GeneratedServerEndpoint {
  name: string;
  routePath: string;
  methods: SvelteKitHttpMethod[];
  imports: string[];
  endpointCode: string;
  filePath: string;
}

/**
 * Service for generating SvelteKit server endpoints with HTTP method handlers,
 * TypeScript types for request/response, and error handling.
 * Creates +server.ts files with proper Response handling.
 */
export class SvelteKitServerGeneratorService {
  private static instance: SvelteKitServerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SvelteKitServerGeneratorService {
    SvelteKitServerGeneratorService.instance ??= new SvelteKitServerGeneratorService();
    return SvelteKitServerGeneratorService.instance;
  }

  /**
   * Generates a SvelteKit server endpoint based on user input
   */
  public async generateServerEndpoint(
    workspacePath: string,
    config: SvelteKitServerGeneratorConfig,
  ): Promise<GeneratedServerEndpoint | null> {
    // Get endpoint name
    const endpointName = await this.getEndpointName();
    if (!endpointName) {
      return null;
    }

    // Get route path
    const routePath = await this.getRoutePath(endpointName, config);
    if (!routePath) {
      return null;
    }

    // Collect HTTP methods for this endpoint
    const methods = await this.collectHttpMethods();
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage(
        'No HTTP methods defined. Server endpoint generation cancelled.',
      );
      return null;
    }

    // Generate imports based on methods
    const imports = this.generateImports(methods, config);

    // Generate endpoint code
    const endpointCode = this.generateEndpointCode(
      endpointName,
      routePath,
      methods,
      imports,
      config,
    );

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, routePath);

    this.logger.info('SvelteKit server endpoint generated', {
      name: endpointName,
      path: routePath,
      methods: methods.length,
    });

    return {
      name: endpointName,
      routePath,
      methods,
      imports,
      endpointCode,
      filePath,
    };
  }

  /**
   * Prompts user for endpoint name
   */
  private async getEndpointName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter server endpoint name (e.g., users, posts, auth)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Endpoint name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Endpoint name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for route path
   */
  private async getRoutePath(
    endpointName: string,
    config: SvelteKitServerGeneratorConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter route path (e.g., api/users, api/v1/posts)',
      placeHolder: `${config.defaultRoutePath}${endpointName}`,
      value: `${config.defaultRoutePath}${endpointName}`,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route path cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_-]*$/.test(value)) {
          return 'Route path can only contain letters, numbers, slashes, hyphens, and underscores';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects HTTP methods from user
   */
  private async collectHttpMethods(): Promise<SvelteKitHttpMethod[] | null> {
    const methods: SvelteKitHttpMethod[] = [];

    let addMore = true;
    while (addMore) {
      const method = await this.createHttpMethod();
      if (method) {
        methods.push(method);
      }

      if (methods.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another HTTP method', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another HTTP method or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return methods.length > 0 ? methods : null;
  }

  /**
   * Creates a single HTTP method through user interaction
   */
  private async createHttpMethod(): Promise<SvelteKitHttpMethod | null> {
    // Choose HTTP method type
    const methodChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: SvelteKitHttpMethod['type'] }>
    >(
      [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'OPTIONS', value: 'OPTIONS' },
        { label: 'HEAD', value: 'HEAD' },
      ],
      { placeHolder: 'Select HTTP method' },
    );

    if (!methodChoice) {
      return null;
    }

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter method description (optional)',
      placeHolder: `${methodChoice.value} endpoint`,
    });

    // Collect parameters
    const params = await this.collectParams(methodChoice.value);

    // Get return type
    const returnType = await this.getReturnType(methodChoice.value);

    // Get status code
    const statusCode = await this.getStatusCode(methodChoice.value);

    return {
      type: methodChoice.value,
      description: description?.trim() || `${methodChoice.value} endpoint`,
      params,
      returnType,
      statusCode,
    };
  }

  /**
   * Collects parameters for an HTTP method
   */
  private async collectParams(method: SvelteKitHttpMethod['type']): Promise<SvelteKitApiParam[]> {
    const params: SvelteKitApiParam[] = [];

    // Ask if they want to add more params
    let addMoreParams = true;
    while (addMoreParams) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add query parameter', value: 'query' },
          { label: 'Add body parameter', value: 'body' },
          { label: 'Add header parameter', value: 'header' },
          { label: 'Add cookie parameter', value: 'cookie' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add parameters to HTTP method' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const param = await this.createParam(addParam.value as SvelteKitApiParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single parameter
   */
  private async createParam(type: SvelteKitApiParam['type']): Promise<SvelteKitApiParam | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${type} parameter name`,
      placeHolder: type === 'body' ? 'data' : type,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Parameter name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid parameter name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Get data type
    const dataTypeInput = await vscode.window.showInputBox({
      prompt: 'Enter data type',
      placeHolder: 'string',
      value: 'string',
    });

    const dataType = dataTypeInput?.trim() || 'string';

    // Get if required
    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'true' },
        { label: 'Optional', value: 'false' },
      ],
      { placeHolder: 'Is this parameter required?' },
    );

    const required = requiredChoice?.value === 'true';

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter parameter description (optional)',
      placeHolder: `The ${nameInput} ${type}`,
    });

    return {
      name: nameInput.trim(),
      type,
      dataType,
      required,
      description: descriptionInput?.trim() || `The ${nameInput} ${type}`,
    };
  }

  /**
   * Gets the return type for an HTTP method
   */
  private async getReturnType(method: SvelteKitHttpMethod['type']): Promise<string> {
    const defaultTypes: Record<string, string> = {
      GET: 'Response',
      POST: 'Response',
      PUT: 'Response',
      PATCH: 'Response',
      DELETE: 'Response',
      OPTIONS: 'Response',
      HEAD: 'Response',
    };

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultTypes[method] || 'Response',
      value: defaultTypes[method] || 'Response',
    });

    return input?.trim() || defaultTypes[method] || 'Response';
  }

  /**
   * Gets the status code for an HTTP method
   */
  private async getStatusCode(method: SvelteKitHttpMethod['type']): Promise<number | undefined> {
    const defaultCodes: Record<string, number> = {
      GET: 200,
      POST: 201,
      PUT: 200,
      PATCH: 200,
      DELETE: 204,
      OPTIONS: 200,
      HEAD: 200,
    };

    const input = await vscode.window.showInputBox({
      prompt: 'Enter status code (optional)',
      placeHolder: defaultCodes[method]?.toString() || '200',
      validateInput: (value) => {
        if (!value) return null;
        const num = Number.parseInt(value, 10);
        if (isNaN(num) || num < 100 || num > 599) {
          return 'Invalid status code';
        }
        return null;
      },
    });

    return input ? Number.parseInt(input, 10) : defaultCodes[method];
  }

  /**
   * Generates imports based on methods and config
   */
  private generateImports(
    methods: SvelteKitHttpMethod[],
    _config: SvelteKitServerGeneratorConfig,
  ): string[] {
    const imports = new Set<string>();

    // Check if any method uses body params
    const hasBodyParam = methods.some((m) => m.params.some((p) => p.type === 'body'));
    if (hasBodyParam) {
      imports.add("import { json } from '@sveltejs/kit';");
    }

    // Check if we need Request type
    const hasAnyParams = methods.some((m) => m.params.length > 0);
    if (hasAnyParams) {
      imports.add("import type { RequestEvent } from '@sveltejs/kit';");
    }

    return Array.from(imports);
  }

  /**
   * Calculates the file path for the server endpoint
   */
  private calculateFilePath(workspacePath: string, routePath: string): string {
    // SvelteKit server endpoints use +server.ts in the routes directory
    // e.g., src/routes/api/users/+server.ts
    return path.join(workspacePath, 'src', 'routes', routePath, '+server.ts');
  }

  /**
   * Generates the endpoint code
   */
  private generateEndpointCode(
    routeName: string,
    _routePath: string,
    methods: SvelteKitHttpMethod[],
    imports: string[],
    config: SvelteKitServerGeneratorConfig,
  ): string {
    let code = '';

    // Add imports
    if (imports.length > 0) {
      code += imports.join('\n');
      code += '\n\n';
    }

    // Add TypeScript interfaces if enabled
    if (config.includeTypeScript) {
      code += this.generateTypeInterfaces(methods, routeName);
      code += '\n';
    }

    // Generate HTTP method handlers
    for (const method of methods) {
      code += this.generateMethodHandler(method, config);
      code += '\n';
    }

    return code;
  }

  /**
   * Generates TypeScript interfaces for the endpoint
   */
  private generateTypeInterfaces(methods: SvelteKitHttpMethod[], routeName: string): string {
    let code = '';

    // Collect all unique body types
    const bodyParams = new Map<string, SvelteKitApiParam[]>();
    for (const method of methods) {
      const params = method.params.filter((p) => p.type === 'body');
      if (params.length > 0) {
        bodyParams.set(method.type, params);
      }
    }

    // Generate interfaces for body types
    for (const [methodType, params] of bodyParams) {
      const interfaceName = `${this.ucfirst(routeName)}${methodType}Body`;
      code += `interface ${interfaceName} {\n`;
      for (const param of params) {
        const optional = param.required ? '' : '?';
        code += `  ${param.name}${optional}: ${param.dataType};\n`;
      }
      code += '}\n\n';
    }

    // Generate query params interface if any query params exist
    const queryParams = methods.flatMap((m) => m.params.filter((p) => p.type === 'query'));
    if (queryParams.length > 0) {
      code += `interface ${this.ucfirst(routeName)}QueryParams {\n`;
      for (const param of queryParams) {
        const optional = param.required ? '' : '?';
        code += `  ${param.name}${optional}: ${param.dataType};\n`;
      }
      code += '}\n\n';
    }

    // Generate response types
    code += `interface ${this.ucfirst(routeName)}Response {\n`;
    code += `  success: boolean;\n`;
    code += `  data?: unknown;\n`;
    code += `  error?: string;\n`;
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates a single HTTP method handler
   */
  private generateMethodHandler(
    method: SvelteKitHttpMethod,
    config: SvelteKitServerGeneratorConfig,
  ): string {
    let code = '';

    const asyncKeyword = 'async ';
    const methodName = method.type.toLowerCase();

    code += `export ${config.exportPattern === 'named' ? 'const ' : ''}${methodName} = ${asyncKeyword}(`;

    // Add event parameter
    if (config.includeTypeScript && method.params.length > 0) {
      code += '{ locals, request }: RequestEvent';
    } else {
      code += '{ locals, request }';
    }

    code += ') => {\n';

    code += this.generateMethodBody(method, config);

    code += '};\n\n';

    return code;
  }

  /**
   * Generates the method body
   */
  private generateMethodBody(
    method: SvelteKitHttpMethod,
    config: SvelteKitServerGeneratorConfig,
  ): string {
    let code = '';

    code += '  try {\n';

    // Extract parameters
    if (method.params.length > 0) {
      for (const param of method.params) {
        if (param.type === 'query') {
          code += `    const url = new URL(request.url);\n`;
          code += `    const ${param.name} = url.searchParams.get('${param.name}');\n`;
        } else if (param.type === 'body') {
          code += `    const body = await request.json();\n`;
          code += `    const { ${param.name} } = body;\n`;
        } else if (param.type === 'header') {
          code += `    const ${param.name} = request.headers.get('${param.name}');\n`;
        } else if (param.type === 'cookie') {
          code += `    const ${param.name} = request.headers.get('cookie');\n`;
          code += `    // Parse cookies: const cookies = Object.fromEntries(${param.name}.split('; ').map(c => c.split('=')));\n`;
        }
      }
      code += '\n';
    }

    // Add validation if enabled
    if (config.includeValidation && method.params.length > 0) {
      code += '    // Validate input\n';
      for (const param of method.params.filter((p) => p.required)) {
        code += `    if (!${param.name}) {\n`;
        code += `      return json(\n`;
        code += `        { success: false, error: 'Missing required parameter: ${param.name}' },\n`;
        code += `        { status: 400 }\n`;
        code += `      );\n`;
        code += '    }\n';
      }
      code += '\n';
    }

    code += '    // TODO: Implement business logic\n';
    code += `    const data = { message: '${method.type} endpoint not yet implemented' };\n\n`;

    // Return response
    const statusCode = method.statusCode || (method.type === 'POST' ? 201 : 200);
    code += `    return json({ success: true, data }, { status: ${statusCode} });\n`;

    code += '  }';

    // Add error handling if enabled
    if (config.includeErrorHandling) {
      code += ' catch (error) {\n';
      code += `    console.error('Error in ${method.type} handler:', error);\n`;
      code += `    return json(\n`;
      code += `      { success: false, error: 'Internal server error' },\n`;
      code += `      { status: 500 }\n`;
      code += `    );\n`;
      code += '  }\n';
    } else {
      code += '\n';
    }

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the endpoint file at the specified path
   */
  public async createEndpointFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write endpoint file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('SvelteKit server endpoint file created', { filePath });
  }
}
