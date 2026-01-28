import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NuxtServerRouteConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeValidation: boolean;
  includeEventStream: boolean;
  defaultRoutePath: string;
  returnHandlerType: 'handler' | 'eventHandler';
}

export interface NuxtHttpMethod {
  type: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  description?: string;
  params: NuxtApiParam[];
  returnType: string;
  statusCode: number;
  useEventStream: boolean;
}

export interface NuxtApiParam {
  name: string;
  type: 'query' | 'body' | 'header' | 'cookie';
  dataType: string;
  required: boolean;
  description?: string;
  validation?: string;
}

export interface GeneratedServerRoute {
  name: string;
  routePath: string;
  methods: NuxtHttpMethod[];
  imports: string[];
  routeCode: string;
  filePath: string;
  handlerType: 'handler' | 'eventHandler';
}

/**
 * Service for generating Nuxt server API routes with HTTP method handlers,
 * TypeScript types for request/response, and error handling.
 * Supports Nuxt 3 server routes with both handler and eventHandler patterns.
 */
export class NuxtServerRouteGeneratorService {
  private static instance: NuxtServerRouteGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NuxtServerRouteGeneratorService {
    NuxtServerRouteGeneratorService.instance ??= new NuxtServerRouteGeneratorService();
    return NuxtServerRouteGeneratorService.instance;
  }

  /**
   * Generates a Nuxt server API route based on user input
   */
  public async generateServerRoute(
    workspacePath: string,
    config: NuxtServerRouteConfig,
  ): Promise<GeneratedServerRoute | null> {
    // Get route name
    const routeName = await this.getRouteName();
    if (!routeName) {
      return null;
    }

    // Get route path
    const routePath = await this.getRoutePath(routeName, config);
    if (!routePath) {
      return null;
    }

    // Determine handler type
    const handlerType = await this.getHandlerType(config);

    // Collect HTTP methods for this route
    const methods = await this.collectHttpMethods(config);
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage(
        'No HTTP methods defined. Server route generation cancelled.',
      );
      return null;
    }

    // Generate imports based on methods
    const imports = this.generateImports(methods, handlerType, config);

    // Generate route code
    const routeCode = this.generateRouteCode(
      routeName,
      routePath,
      methods,
      imports,
      handlerType,
      config,
    );

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, routePath);

    this.logger.info('Nuxt server route generated', {
      name: routeName,
      path: routePath,
      methods: methods.length,
      handlerType,
    });

    return {
      name: routeName,
      routePath,
      methods,
      imports,
      routeCode,
      filePath,
      handlerType,
    };
  }

  /**
   * Prompts user for route name
   */
  private async getRouteName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter server route name (e.g., users, posts, auth)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Route name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
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
    routeName: string,
    config: NuxtServerRouteConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter route path (e.g., api/users, api/v1/posts)',
      placeHolder: `${config.defaultRoutePath}${routeName}`,
      value: `${config.defaultRoutePath}${routeName}`,
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
   * Gets the handler type from user
   */
  private async getHandlerType(config: NuxtServerRouteConfig): Promise<'handler' | 'eventHandler'> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Handler (Standard)',
          description: 'Standard request handler with H3 compatibility',
          value: 'handler',
        },
        {
          label: 'Event Handler',
          description: 'Event-based handler for more control over the request lifecycle',
          value: 'eventHandler',
        },
      ],
      {
        placeHolder: `Select handler type (default: ${config.returnHandlerType})`,
      },
    );

    return (choice?.value as 'handler' | 'eventHandler') || config.returnHandlerType;
  }

  /**
   * Collects HTTP methods from user
   */
  private async collectHttpMethods(
    config: NuxtServerRouteConfig,
  ): Promise<NuxtHttpMethod[] | null> {
    const methods: NuxtHttpMethod[] = [];

    let addMore = true;
    while (addMore) {
      const method = await this.createHttpMethod(config);
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
  private async createHttpMethod(config: NuxtServerRouteConfig): Promise<NuxtHttpMethod | null> {
    // Choose HTTP method type
    const methodChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: NuxtHttpMethod['type'] }>
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

    // Check if event stream is needed (for server-sent events)
    let useEventStream = false;
    if (
      config.includeEventStream &&
      (methodChoice.value === 'GET' || methodChoice.value === 'POST')
    ) {
      const useStream = await vscode.window.showQuickPick(
        [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ],
        {
          placeHolder: 'Use event stream for server-sent events (SSE)?',
        },
      );
      useEventStream = useStream?.value === 'true';
    }

    return {
      type: methodChoice.value,
      description: description?.trim() || `${methodChoice.value} endpoint`,
      params,
      returnType,
      statusCode: statusCode ?? 200,
      useEventStream,
    };
  }

  /**
   * Collects parameters for an HTTP method
   */
  private async collectParams(_method: NuxtHttpMethod['type']): Promise<NuxtApiParam[]> {
    const params: NuxtApiParam[] = [];

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

      const param = await this.createParam(addParam.value as NuxtApiParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single parameter
   */
  private async createParam(type: NuxtApiParam['type']): Promise<NuxtApiParam | null> {
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
  private async getReturnType(method: NuxtHttpMethod['type']): Promise<string> {
    const defaultTypes: Record<string, string> = {
      GET: 'any',
      POST: 'any',
      PUT: 'any',
      PATCH: 'any',
      DELETE: 'void',
      OPTIONS: 'any',
      HEAD: 'any',
    };

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultTypes[method] || 'any',
      value: defaultTypes[method] || 'any',
    });

    return input?.trim() || defaultTypes[method] || 'any';
  }

  /**
   * Gets the status code for an HTTP method
   */
  private async getStatusCode(method: NuxtHttpMethod['type']): Promise<number | undefined> {
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
    methods: NuxtHttpMethod[],
    handlerType: 'handler' | 'eventHandler',
    _config: NuxtServerRouteConfig,
  ): string[] {
    const imports = new Set<string>();

    // Nuxt 3 server handler imports
    if (handlerType === 'eventHandler') {
      imports.add("import { eventHandler } from 'h3'");
    }

    // Check if any method uses event stream
    const hasEventStream = methods.some((m) => m.useEventStream);
    if (hasEventStream) {
      imports.add("import { eventStream } from 'h3'");
    }

    // Check if we need readBody
    const hasBodyParam = methods.some((m) => m.params.some((p) => p.type === 'body'));
    if (hasBodyParam) {
      imports.add("import { readBody } from 'h3'");
    }

    // Check if we need getRouterParam, getQuery, etc.
    const hasQueryParam = methods.some((m) => m.params.some((p) => p.type === 'query'));
    if (hasQueryParam) {
      imports.add("import { getQuery } from 'h3'");
    }

    const hasHeaderParam = methods.some((m) => m.params.some((p) => p.type === 'header'));
    if (hasHeaderParam) {
      imports.add("import { getHeaders } from 'h3'");
    }

    const hasCookieParam = methods.some((m) => m.params.some((p) => p.type === 'cookie'));
    if (hasCookieParam) {
      imports.add("import { parseCookies } from 'h3'");
    }

    return Array.from(imports);
  }

  /**
   * Calculates the file path for the server route
   */
  private calculateFilePath(workspacePath: string, routePath: string): string {
    // Nuxt 3 server routes: server/api/route.ts
    return path.join(workspacePath, 'server', `${routePath}.ts`);
  }

  /**
   * Generates the route code
   */
  private generateRouteCode(
    routeName: string,
    _routePath: string,
    methods: NuxtHttpMethod[],
    imports: string[],
    handlerType: 'handler' | 'eventHandler',
    config: NuxtServerRouteConfig,
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

    // Generate handlers
    code += this.generateHandlers(routeName, methods, handlerType, config);

    return code;
  }

  /**
   * Generates TypeScript interfaces for the route
   */
  private generateTypeInterfaces(methods: NuxtHttpMethod[], routeName: string): string {
    let code = '';

    // Collect all unique body types
    const bodyParams = new Map<string, NuxtApiParam[]>();
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
   * Generates handlers for the route
   */
  private generateHandlers(
    _routeName: string,
    methods: NuxtHttpMethod[],
    handlerType: 'handler' | 'eventHandler',
    config: NuxtServerRouteConfig,
  ): string {
    let code = '';

    for (const method of methods) {
      const methodName = this.getMethodHandlerName(method.type);
      const exportKeyword = 'export ';

      if (handlerType === 'eventHandler') {
        // Event handler pattern
        code += `${exportKeyword}const ${methodName} = eventHandler(async (event) => {\n`;
        code += this.generateMethodBody(method, config);
        code += '});\n\n';
      } else {
        // Default handler pattern
        code += `${exportKeyword}const ${methodName} = async (event) => {\n`;
        code += this.generateMethodBody(method, config);
        code += '};\n\n';
      }
    }

    return code;
  }

  /**
   * Generates the method body
   */
  private generateMethodBody(method: NuxtHttpMethod, config: NuxtServerRouteConfig): string {
    let code = '';

    code += '  try {\n';

    // Extract parameters
    if (method.params.length > 0) {
      for (const param of method.params) {
        if (param.type === 'query') {
          code += `    const query = getQuery(event);\n`;
          code += `    const ${param.name} = query.${param.name};\n`;
        } else if (param.type === 'body') {
          code += `    const body = await readBody(event);\n`;
          if (param.name !== 'body') {
            code += `    const { ${param.name} } = body;\n`;
          }
        } else if (param.type === 'header') {
          code += `    const headers = getHeaders(event);\n`;
          code += `    const ${param.name} = headers.${param.name};\n`;
        } else if (param.type === 'cookie') {
          code += `    const cookies = parseCookies(event);\n`;
          code += `    const ${param.name} = cookies.${param.name};\n`;
        }
      }
      code += '\n';
    }

    // Add validation if enabled
    if (config.includeValidation && method.params.length > 0) {
      code += '    // Validate input\n';
      for (const param of method.params.filter((p) => p.required)) {
        code += `    if (!${param.name}) {\n`;
        code += `      throw createError({\n`;
        code += `        statusCode: 400,\n`;
        code += `        statusMessage: 'Missing required parameter: ${param.name}',\n`;
        code += `      });\n`;
        code += '    }\n';
      }
      code += '\n';
    }

    // Event stream handler
    if (method.useEventStream) {
      code += '    // Set up server-sent events\n';
      code += `    return eventStream(event, async (emit) => {\n`;
      code += '      // TODO: Implement event stream logic\n';
      code += `      emit({ event: 'connected', data: { message: 'Connected' } });\n\n`;
      code += '      // Keep connection open\n';
      code += '      // Emit events as needed\n';
      code += '    });\n';
    } else {
      code += '    // TODO: Implement business logic\n';
      code += `    const data = { message: '${method.type} endpoint not yet implemented' };\n\n`;

      // Return response
      // Status code can be set using: setResponseStatus(event, statusCode)
      code += `    return { success: true, data };\n`;
    }

    code += '  }';

    // Add error handling if enabled
    if (config.includeErrorHandling && !method.useEventStream) {
      code += ' catch (error) {\n';
      code += `    console.error('Error in ${method.type} ${this.getMethodHandlerName(method.type)}:', error);\n`;
      code += `    throw createError({\n`;
      code += `      statusCode: 500,\n`;
      code += `      statusMessage: 'Internal server error',\n`;
      code += `    });\n`;
      code += '  }\n';
    } else if (config.includeErrorHandling && method.useEventStream) {
      code += ' catch (error) {\n';
      code += `    console.error('Error in ${method.type} event stream:', error);\n`;
      code += `    emit({ event: 'error', data: { message: 'Internal server error' } });\n`;
      code += '  }\n';
    } else {
      code += '\n';
    }

    return code;
  }

  /**
   * Gets method handler name from HTTP method type
   */
  private getMethodHandlerName(methodType: NuxtHttpMethod['type']): string {
    return methodType.toLowerCase();
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the route file at the specified path
   */
  public async createRouteFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write route file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Nuxt server route file created', { filePath });
  }
}
