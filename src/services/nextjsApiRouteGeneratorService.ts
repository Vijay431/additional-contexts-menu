import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NextjsApiRouteConfig {
  enabled: boolean;
  directoryPattern: 'app' | 'pages';
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeValidation: boolean;
  defaultRoutePath: string;
  exportType: 'named' | 'default';
}

export interface NextjsHttpMethod {
  type: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  description?: string;
  params: NextjsApiParam[];
  returnType: string;
  statusCode?: number;
}

export interface NextjsApiParam {
  name: string;
  type: 'query' | 'body' | 'header' | 'cookie';
  dataType: string;
  required: boolean;
  description?: string;
  validation?: string;
}

export interface GeneratedApiRoute {
  name: string;
  routePath: string;
  methods: NextjsHttpMethod[];
  imports: string[];
  routeCode: string;
  filePath: string;
}

/**
 * Service for generating Next.js API routes with HTTP method handlers,
 * TypeScript types for request/response, and error handling.
 * Supports both app and pages directory patterns.
 */
export class NextjsApiRouteGeneratorService {
  private static instance: NextjsApiRouteGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NextjsApiRouteGeneratorService {
    NextjsApiRouteGeneratorService.instance ??= new NextjsApiRouteGeneratorService();
    return NextjsApiRouteGeneratorService.instance;
  }

  /**
   * Generates a Next.js API route based on user input
   */
  public async generateApiRoute(
    workspacePath: string,
    config: NextjsApiRouteConfig,
  ): Promise<GeneratedApiRoute | null> {
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

    // Collect HTTP methods for this route
    const methods = await this.collectHttpMethods();
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage('No HTTP methods defined. API route generation cancelled.');
      return null;
    }

    // Generate imports based on methods
    const imports = this.generateImports(methods, config);

    // Generate route code
    const routeCode = this.generateRouteCode(routeName, routePath, methods, imports, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, routePath, config);

    this.logger.info('Next.js API route generated', {
      name: routeName,
      path: routePath,
      methods: methods.length,
      directoryPattern: config.directoryPattern,
    });

    return {
      name: routeName,
      routePath,
      methods,
      imports,
      routeCode,
      filePath,
    };
  }

  /**
   * Prompts user for route name
   */
  private async getRouteName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter API route name (e.g., users, posts, auth)',
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
    config: NextjsApiRouteConfig,
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
   * Collects HTTP methods from user
   */
  private async collectHttpMethods(): Promise<NextjsHttpMethod[] | null> {
    const methods: NextjsHttpMethod[] = [];

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
  private async createHttpMethod(): Promise<NextjsHttpMethod | null> {
    // Choose HTTP method type
    const methodChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: NextjsHttpMethod['type'] }>
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
  private async collectParams(method: NextjsHttpMethod['type']): Promise<NextjsApiParam[]> {
    const params: NextjsApiParam[] = [];

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

      const param = await this.createParam(addParam.value as NextjsApiParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single parameter
   */
  private async createParam(type: NextjsApiParam['type']): Promise<NextjsApiParam | null> {
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
  private async getReturnType(method: NextjsHttpMethod['type']): Promise<string> {
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
  private async getStatusCode(method: NextjsHttpMethod['type']): Promise<number | undefined> {
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
  private generateImports(methods: NextjsHttpMethod[], config: NextjsApiRouteConfig): string[] {
    const imports: string[] = [];

    // Next.js imports based on directory pattern
    if (config.directoryPattern === 'app') {
      imports.add('{ NextRequest, NextResponse }');
      imports.add('from "next/server"');
    }

    // Type imports for TypeScript
    if (config.includeTypeScript) {
      for (const method of methods) {
        for (const param of method.params) {
          if (param.type === 'query') {
            // No specific import needed for query params
          } else if (param.type === 'body') {
            // Add interface for body type if it's a complex type
            if (
              param.dataType !== 'string' &&
              param.dataType !== 'number' &&
              param.dataType !== 'boolean'
            ) {
              // Could add import for custom types here
            }
          }
        }
      }
    }

    return Array.from(imports);
  }

  /**
   * Calculates the file path for the API route
   */
  private calculateFilePath(
    workspacePath: string,
    routePath: string,
    config: NextjsApiRouteConfig,
  ): string {
    if (config.directoryPattern === 'app') {
      // App directory: app/api/route/route.ts
      return path.join(workspacePath, 'app', routePath, 'route.ts');
    } else {
      // Pages directory: pages/api/route.ts
      return path.join(workspacePath, 'pages', `${routePath}.ts`);
    }
  }

  /**
   * Generates the route code
   */
  private generateRouteCode(
    routeName: string,
    routePath: string,
    methods: NextjsHttpMethod[],
    imports: string[],
    config: NextjsApiRouteConfig,
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

    // Generate HTTP method handlers based on directory pattern
    if (config.directoryPattern === 'app') {
      code += this.generateAppDirectoryHandlers(methods, config);
    } else {
      code += this.generatePagesDirectoryHandlers(methods, config);
    }

    return code;
  }

  /**
   * Generates TypeScript interfaces for the route
   */
  private generateTypeInterfaces(methods: NextjsHttpMethod[], routeName: string): string {
    let code = '';

    // Collect all unique body types
    const bodyParams = new Map<string, NextjsApiParam[]>();
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

    // Generate response types
    code += `interface ${this.ucfirst(routeName)}Response {\n`;
    code += `  success: boolean;\n`;
    code += `  data?: unknown;\n`;
    code += `  error?: string;\n`;
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates handlers for app directory pattern
   */
  private generateAppDirectoryHandlers(
    methods: NextjsHttpMethod[],
    config: NextjsApiRouteConfig,
  ): string {
    let code = '';

    for (const method of methods) {
      const methodName = this.getMethodHandlerName(method.type);
      const asyncKeyword = 'async ';

      code += `export ${config.exportType === 'named' ? 'const ' : ''}${methodName} = ${asyncKeyword}(`;
      code += 'request: NextRequest';
      if (config.includeTypeScript && method.params.length > 0) {
        // Add context/params type if needed
        code += ', { params }: { params?: Record<string, string> }';
      }
      code += ') => {\n';

      code += this.generateMethodBody(method, config, true);

      code += '};\n\n';
    }

    return code;
  }

  /**
   * Generates handlers for pages directory pattern
   */
  private generatePagesDirectoryHandlers(
    methods: NextjsHttpMethod[],
    config: NextjsApiRouteConfig,
  ): string {
    let code = '';

    // For pages directory, we need a single export with all methods
    code += `import type { NextApiRequest, NextApiResponse } from 'next';\n\n`;

    code += 'export default async function handler(\n';
    code += '  req: NextApiRequest,\n';
    code += '  res: NextApiResponse,\n';
    code += ') {\n';
    code += '  const { method } = req;\n\n';

    code += '  switch (method) {\n';

    for (const method of methods) {
      code += `    case '${method.type}':\n`;
      code += `      return await handle${method.type}(req, res);\n`;
    }

    code += '    default:\n';
    code +=
      '      res.setHeader("Allow", [' + methods.map((m) => `'${m.type}'`).join(', ') + ']);\n';
    code += '      return res.status(405).json({ error: `Method ${method} Not Allowed` });\n';
    code += '  }\n';
    code += '}\n\n';

    // Generate individual handlers
    for (const method of methods) {
      const methodName = `handle${method.type}`;
      code += `${config.includeTypeScript ? 'async ' : ''}function ${methodName}(\n`;
      code += '  req: NextApiRequest,\n';
      code += '  res: NextApiResponse,\n';
      code += ') {\n';

      code += this.generateMethodBody(method, config, false);

      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generates the method body
   */
  private generateMethodBody(
    method: NextjsHttpMethod,
    config: NextjsApiRouteConfig,
    isAppDir: boolean,
  ): string {
    let code = '';

    code += '  try {\n';

    // Extract parameters
    if (method.params.length > 0) {
      for (const param of method.params) {
        if (isAppDir) {
          // App directory pattern
          if (param.type === 'query') {
            code += `    const ${param.name} = request.nextUrl.searchParams.get('${param.name}');\n`;
          } else if (param.type === 'body') {
            code += `    const body = await request.json();\n`;
            code += `    const { ${param.name} } = body;\n`;
          } else if (param.type === 'header') {
            code += `    const ${param.name} = request.headers.get('${param.name}');\n`;
          } else if (param.type === 'cookie') {
            code += `    const ${param.name} = request.cookies.get('${param.name}');\n`;
          }
        } else {
          // Pages directory pattern
          if (param.type === 'query') {
            code += `    const { ${param.name} } = req.query;\n`;
          } else if (param.type === 'body') {
            code += `    const body = req.body;\n`;
            code += `    const { ${param.name} } = body;\n`;
          } else if (param.type === 'header') {
            code += `    const ${param.name} = req.headers['${param.name}'];\n`;
          } else if (param.type === 'cookie') {
            code += `    const ${param.name} = req.cookies['${param.name}'];\n`;
          }
        }
      }
      code += '\n';
    }

    // Add validation if enabled
    if (config.includeValidation && method.params.length > 0) {
      code += '    // Validate input\n';
      for (const param of method.params.filter((p) => p.required)) {
        code += `    if (!${param.name}) {\n`;
        code += `      return ${isAppDir ? 'NextResponse.json' : 'res.json'}({ error: 'Missing required parameter: ${param.name}' }, { status: 400 });\n`;
        code += '    }\n';
      }
      code += '\n';
    }

    code += '    // TODO: Implement business logic\n';
    code += `    const data = { message: '${method.type} endpoint not yet implemented' };\n\n`;

    // Return response
    const statusCode = method.statusCode || (method.type === 'POST' ? 201 : 200);
    if (isAppDir) {
      code += `    return NextResponse.json({ success: true, data }, { status: ${statusCode} });\n`;
    } else {
      code += `    return res.status(${statusCode}).json({ success: true, data });\n`;
    }

    code += '  }';

    // Add error handling if enabled
    if (config.includeErrorHandling) {
      code += ' catch (error) {\n';
      code += `    console.error('Error in ${method.type} ${this.getMethodHandlerName(method.type)}:', error);\n`;
      if (isAppDir) {
        code += `    return NextResponse.json(\n`;
        code += `      { success: false, error: 'Internal server error' },\n`;
        code += `      { status: 500 }\n`;
        code += `    );\n`;
      } else {
        code += `    return res.status(500).json({ success: false, error: 'Internal server error' });\n`;
      }
      code += '  }\n';
    } else {
      code += '\n';
    }

    return code;
  }

  /**
   * Gets method handler name from HTTP method type
   */
  private getMethodHandlerName(methodType: NextjsHttpMethod['type']): string {
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

    this.logger.info('Next.js API route file created', { filePath });
  }
}
