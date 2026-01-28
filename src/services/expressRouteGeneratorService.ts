import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ExpressRouteGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeValidation: boolean;
  includeAsyncAwait: boolean;
  includeMiddleware: boolean;
  includeJSDoc: boolean;
  defaultRoutePath: string;
  routerPattern: 'router' | 'app' | 'express-router';
  exportType: 'named' | 'default';
  parameterStyle: 'destructured' | 'properties';
  responsePattern: 'res-send' | 'res-json' | 'res-status';
}

export interface ExpressEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  description?: string;
  params: ExpressParam[];
  returnType: string;
  statusCode?: number;
  middleware?: string[];
}

export interface ExpressParam {
  name: string;
  type: 'params' | 'query' | 'body';
  dataType: string;
  required: boolean;
  description?: string;
}

export interface GeneratedExpressRoute {
  name: string;
  basePath: string;
  endpoints: ExpressEndpoint[];
  imports: string[];
  routeCode: string;
}

/**
 * Service for generating Express route boilerplate with middleware,
 * error handling, and TypeScript types
 */
export class ExpressRouteGeneratorService {
  private static instance: ExpressRouteGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ExpressRouteGeneratorService {
    ExpressRouteGeneratorService.instance ??= new ExpressRouteGeneratorService();
    return ExpressRouteGeneratorService.instance;
  }

  /**
   * Generates an Express route based on user input
   */
  public async generateRoute(
    workspacePath: string,
    config: ExpressRouteGeneratorConfig,
  ): Promise<GeneratedExpressRoute | null> {
    // Get route name
    const routeName = await this.getRouteName();
    if (!routeName) {
      return null;
    }

    // Get base path
    const basePath = await this.getBasePath(routeName, config);
    if (!basePath) {
      return null;
    }

    // Collect endpoint information
    const endpoints = await this.collectEndpoints();
    if (!endpoints || endpoints.length === 0) {
      vscode.window.showWarningMessage('No endpoints defined. Route generation cancelled.');
      return null;
    }

    // Generate imports based on endpoints and config
    const imports = this.generateImports(endpoints, config);

    // Generate route code
    const routeCode = this.generateRouteCode(routeName, basePath, endpoints, imports, config);

    this.logger.info('Express route generated', {
      name: routeName,
      endpoints: endpoints.length,
    });

    return {
      name: routeName,
      basePath,
      endpoints,
      imports,
      routeCode,
    };
  }

  /**
   * Prompts user for route name
   */
  private async getRouteName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter route name (e.g., users, products, orders)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Route name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for base path
   */
  private async getBasePath(
    routeName: string,
    config: ExpressRouteGeneratorConfig,
  ): Promise<string | undefined> {
    const defaultPath = this.kebabCase(routeName);
    const input = await vscode.window.showInputBox({
      prompt: 'Enter base path for this route',
      placeHolder: defaultPath,
      value: config.defaultRoutePath + defaultPath,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Base path cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_-]*$/.test(value)) {
          return 'Base path can only contain letters, numbers, slashes, hyphens, and underscores';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects endpoint information from user
   */
  private async collectEndpoints(): Promise<ExpressEndpoint[] | null> {
    const endpoints: ExpressEndpoint[] = [];

    let addMore = true;
    while (addMore) {
      const endpoint = await this.createEndpoint();
      if (endpoint) {
        endpoints.push(endpoint);
      }

      if (endpoints.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another endpoint', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another endpoint or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return endpoints.length > 0 ? endpoints : null;
  }

  /**
   * Creates a single endpoint through user interaction
   */
  private async createEndpoint(): Promise<ExpressEndpoint | null> {
    // Choose HTTP method
    const methodChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: ExpressEndpoint['method'] }>
    >(
      [
        { label: 'GET', value: 'get' },
        { label: 'POST', value: 'post' },
        { label: 'PUT', value: 'put' },
        { label: 'PATCH', value: 'patch' },
        { label: 'DELETE', value: 'delete' },
      ],
      { placeHolder: 'Select HTTP method' },
    );

    if (!methodChoice) {
      return null;
    }

    // Get path
    const pathInput = await vscode.window.showInputBox({
      prompt: 'Enter endpoint path (e.g., :id, list, create)',
      placeHolder: '',
      validateInput: (value) => {
        if (!/^[a-zA-Z0-9/_:-]*$/.test(value)) {
          return 'Path can only contain letters, numbers, slashes, hyphens, underscores, and colons';
        }
        return null;
      },
    });

    if (pathInput === undefined) {
      return null;
    }

    const endpointPath = pathInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter endpoint description (optional)',
      placeHolder: `${methodChoice.value.toUpperCase()} ${endpointPath}`,
    });

    // Collect parameters
    const params = await this.collectParams(methodChoice.value, endpointPath);

    // Get return type
    const returnType = await this.getReturnType(methodChoice.value);

    // Get status code
    const statusCode = await this.getStatusCode(methodChoice.value);

    // Ask for middleware
    const middleware = await this.collectMiddleware();

    return {
      method: methodChoice.value,
      path: endpointPath,
      description: description?.trim() || `${methodChoice.value.toUpperCase()} ${endpointPath}`,
      params,
      returnType,
      statusCode,
      middleware: middleware.length > 0 ? middleware : undefined,
    };
  }

  /**
   * Collects parameters for an endpoint
   */
  private async collectParams(
    method: ExpressEndpoint['method'],
    path: string,
  ): Promise<ExpressParam[]> {
    const params: ExpressParam[] = [];

    // Auto-detect path params
    const pathParamMatches = path.match(/:([a-zA-Z0-9_]+)/g);
    if (pathParamMatches) {
      for (const match of pathParamMatches) {
        const paramName = match.substring(1);
        params.push({
          name: paramName,
          type: 'params',
          dataType: 'string',
          required: true,
          description: `${paramName} parameter`,
        });
      }
    }

    // Ask if they want to add more params
    let addMoreParams = true;
    while (addMoreParams) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add query parameter', value: 'query' },
          { label: 'Add body parameter', value: 'body' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add parameters to endpoint' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const param = await this.createParam(addParam.value as ExpressParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single parameter
   */
  private async createParam(type: ExpressParam['type']): Promise<ExpressParam | null> {
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

    const dataTypeInput = await vscode.window.showQuickPick(
      ['string', 'number', 'boolean', 'any', 'string[]', 'number[]', 'object'],
      { placeHolder: 'Select data type' },
    );

    const dataType = dataTypeInput || 'any';

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter parameter description (optional)',
      placeHolder: `The ${nameInput} ${type}`,
    });

    return {
      name: nameInput.trim(),
      type,
      dataType,
      required: type !== 'body',
      description: descriptionInput?.trim() || `The ${nameInput} ${type}`,
    };
  }

  /**
   * Gets the return type for an endpoint
   */
  private async getReturnType(method: ExpressEndpoint['method']): Promise<string> {
    const defaultTypes: Record<string, string> = {
      get: 'any',
      post: 'any',
      patch: 'any',
      put: 'any',
      delete: 'void',
    };

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultTypes[method] || 'any',
      value: defaultTypes[method] || 'any',
    });

    return input?.trim() || defaultTypes[method] || 'any';
  }

  /**
   * Gets the status code for an endpoint
   */
  private async getStatusCode(method: ExpressEndpoint['method']): Promise<number | undefined> {
    const defaultCodes: Record<string, number> = {
      get: 200,
      post: 201,
      patch: 200,
      put: 200,
      delete: 204,
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
   * Collects middleware for an endpoint
   */
  private async collectMiddleware(): Promise<string[]> {
    const middleware: string[] = [];

    let addMore = true;
    while (addMore) {
      const middlewareInput = await vscode.window.showInputBox({
        prompt: 'Enter middleware function name (optional)',
        placeHolder: 'authenticate',
      });

      if (!middlewareInput) {
        addMore = false;
      } else {
        middleware.push(middlewareInput.trim());
      }
    }

    return middleware;
  }

  /**
   * Generates imports based on endpoints and config
   */
  private generateImports(
    endpoints: ExpressEndpoint[],
    config: ExpressRouteGeneratorConfig,
  ): string[] {
    const imports: string[] = [];

    if (config.routerPattern === 'router' || config.routerPattern === 'express-router') {
      imports.push('Router', 'Request', 'Response');
    }

    if (config.includeErrorHandling) {
      imports.push('NextFunction');
    }

    return imports;
  }

  /**
   * Generates the route code
   */
  private generateRouteCode(
    routeName: string,
    basePath: string,
    endpoints: ExpressEndpoint[],
    imports: string[],
    config: ExpressRouteGeneratorConfig,
  ): string {
    let code = '';

    // Imports
    if (config.includeTypeScript) {
      code += `import { ${imports.join(', ')} } from 'express';\n`;
    } else {
      code += `const express = require('express');\n`;
    }

    // Add middleware imports if any endpoint has middleware
    const allMiddleware = new Set<string>();
    for (const endpoint of endpoints) {
      if (endpoint.middleware) {
        for (const mw of endpoint.middleware) {
          allMiddleware.add(mw);
        }
      }
    }

    if (allMiddleware.size > 0) {
      code += `import { ${Array.from(allMiddleware).join(', ')} } from '../middleware';\n`;
    }

    code += '\n';

    // Router creation
    if (config.routerPattern === 'router' || config.routerPattern === 'express-router') {
      const routerVar = this.camelCase(routeName) + 'Router';
      code += `const ${routerVar} = Router();\n\n`;
    }

    // Generate methods
    for (const endpoint of endpoints) {
      code += this.generateEndpointMethod(routeName, endpoint, config);
      code += '\n';
    }

    // Export
    if (config.exportType === 'named') {
      const routerVar = this.camelCase(routeName) + 'Router';
      code += `export { ${routerVar} };\n`;
    } else {
      const routerVar = this.camelCase(routeName) + 'Router';
      code += `export default ${routerVar};\n`;
    }

    return code;
  }

  /**
   * Generates an endpoint method
   */
  private generateEndpointMethod(
    routeName: string,
    endpoint: ExpressEndpoint,
    config: ExpressRouteGeneratorConfig,
  ): string {
    let code = '';
    const routerVar = this.camelCase(routeName) + 'Router';
    const fullPath = endpoint.path ? `'${endpoint.path}'` : '"/"';

    // JSDoc comment
    if (config.includeJSDoc) {
      code += `/**\n`;
      code += ` * ${endpoint.description}\n`;
      if (endpoint.params.length > 0) {
        code += ` * @param req - Express request object\n`;
        code += ` * @param res - Express response object\n`;
        if (config.includeErrorHandling) {
          code += ` * @param next - Express next function\n`;
        }
      }
      code += ` */\n`;
    }

    // Route definition
    code += `${routerVar}.${endpoint.method}(${fullPath}`;

    // Add middleware if present
    if (endpoint.middleware && endpoint.middleware.length > 0) {
      for (const mw of endpoint.middleware) {
        code += `, ${mw}`;
      }
    }

    // Handler function
    if (config.includeTypeScript) {
      code += `, `;
      if (config.includeAsyncAwait) {
        code += 'async ';
      }
      code += `(req: Request`;
      if (config.includeErrorHandling) {
        code += `, res: Response, next: NextFunction`;
      } else {
        code += `, res: Response`;
      }
      code += `): Promise<${endpoint.returnType}> => {\n`;
    } else {
      code += `, `;
      if (config.includeAsyncAwait) {
        code += 'async ';
      }
      code += `(req, res`;
      if (config.includeErrorHandling) {
        code += `, next`;
      }
      code += `) => {\n`;
    }

    // Extract parameters
    if (endpoint.params.length > 0) {
      code += `  const { `;
      const paramNames = endpoint.params.map((p) => p.name);
      code += paramNames.join(', ');
      code += ` } = req.`;

      // Group params by type
      const paramsByType: Record<string, string[]> = { params: [], query: [], body: [] };
      for (const param of endpoint.params) {
        paramsByType[param.type].push(param.name);
      }

      // Add destructuring for each type
      if (paramsByType.params.length > 0) {
        code += `params`;
      }
      if (paramsByType.query.length > 0) {
        if (paramsByType.params.length > 0) code += ', ';
        code += `query`;
      }
      if (paramsByType.body.length > 0) {
        if (paramsByType.params.length > 0 || paramsByType.query.length > 0) code += ', ';
        code += `body`;
      }
      code += `;\n`;
    }

    // Error handling wrapper
    if (config.includeErrorHandling) {
      code += `  try {\n`;
      code += `    // TODO: Implement ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
      code += this.generateResponseCode(endpoint, config, '    ');
      if (config.includeErrorHandling) {
        code += `  } catch (error) {\n`;
        code += `    next(error);\n`;
        code += `  }\n`;
      }
    } else {
      code += `  // TODO: Implement ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
      code += this.generateResponseCode(endpoint, config, '  ');
    }

    code += `});\n`;

    return code;
  }

  /**
   * Generates response code based on pattern
   */
  private generateResponseCode(
    endpoint: ExpressEndpoint,
    config: ExpressRouteGeneratorConfig,
    indent: string,
  ): string {
    const statusCode = endpoint.statusCode || this.getDefaultStatusCode(endpoint.method);

    if (config.responsePattern === 'res-json') {
      if (endpoint.returnType === 'void') {
        return `${indent}return res.status(${statusCode}).json({ message: 'Success' });\n`;
      }
      return `${indent}return res.status(${statusCode}).json({ data: null });\n`;
    } else if (config.responsePattern === 'res-status') {
      return `${indent}return res.status(${statusCode}).send();\n`;
    } else {
      // res-send (default)
      if (endpoint.returnType === 'void') {
        return `${indent}return res.send('Success');\n`;
      }
      return `${indent}return res.send(null);\n`;
    }
  }

  /**
   * Gets default status code for HTTP method
   */
  private getDefaultStatusCode(method: ExpressEndpoint['method']): number {
    const codes: Record<string, number> = {
      get: 200,
      post: 201,
      patch: 200,
      put: 200,
      delete: 204,
    };
    return codes[method] || 200;
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  }

  /**
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
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

    this.logger.info('Express route file created', { filePath });
  }

  /**
   * Generates router registration code to add to main app file
   */
  public generateRouterRegistration(
    routeName: string,
    basePath: string,
    config: ExpressRouteGeneratorConfig,
  ): string {
    const routerVar = this.camelCase(routeName) + 'Router';
    const fileName = this.kebabCase(routeName);

    let code = '';
    if (config.includeTypeScript) {
      if (config.exportType === 'named') {
        code += `import { ${routerVar} } from './routes/${fileName}';\n`;
      } else {
        code += `import ${routerVar} from './routes/${fileName}';\n`;
      }
    } else {
      code += `const ${routerVar} = require('./routes/${fileName}');\n`;
    }
    code += `app.use('/${basePath}', ${routerVar});\n`;

    return code;
  }
}
