import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NestJSControllerConfig {
  enabled: boolean;
  generateSwagger: boolean;
  generateValidation: boolean;
  includeGuards: boolean;
  includeInterceptors: boolean;
  includeFilters: boolean;
  defaultPathPrefix: string;
  dtoNamingConvention: 'suffix' | 'separate-folder';
}

export interface NestJSEndpoint {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete' | 'all';
  path: string;
  description?: string;
  params: NestJSParam[];
  returnType: string;
  statusCode?: number;
}

export interface NestJSParam {
  name: string;
  type: 'body' | 'query' | 'param' | 'file' | 'files' | 'headers';
  dataType: string;
  required: boolean;
  description?: string;
}

export interface GeneratedController {
  name: string;
  basePath: string;
  endpoints: NestJSEndpoint[];
  imports: string[];
  dtoFiles: Array<{ name: string; code: string }>;
  controllerCode: string;
}

/**
 * Service for generating NestJS controllers with proper decorators,
 * TypeScript typing, and Swagger documentation
 */
export class NestJSControllerGeneratorService {
  private static instance: NestJSControllerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSControllerGeneratorService {
    NestJSControllerGeneratorService.instance ??= new NestJSControllerGeneratorService();
    return NestJSControllerGeneratorService.instance;
  }

  /**
   * Generates a NestJS controller based on user input
   */
  public async generateController(
    workspacePath: string,
    config: NestJSControllerConfig,
  ): Promise<GeneratedController | null> {
    // Get controller name
    const controllerName = await this.getControllerName();
    if (!controllerName) {
      return null;
    }

    // Get base path
    const basePath = await this.getBasePath(controllerName, config);
    if (!basePath) {
      return null;
    }

    // Collect endpoint information
    const endpoints = await this.collectEndpoints();
    if (!endpoints || endpoints.length === 0) {
      vscode.window.showWarningMessage('No endpoints defined. Controller generation cancelled.');
      return null;
    }

    // Generate imports based on endpoints
    const imports = this.generateImports(endpoints, config);

    // Generate DTO files if needed
    const dtoFiles = this.generateDTOFiles(controllerName, endpoints, config, workspacePath);

    // Generate controller code
    const controllerCode = this.generateControllerCode(
      controllerName,
      basePath,
      endpoints,
      imports,
      config,
    );

    this.logger.info('NestJS controller generated', {
      name: controllerName,
      endpoints: endpoints.length,
    });

    return {
      name: controllerName,
      basePath,
      endpoints,
      imports,
      dtoFiles,
      controllerCode,
    };
  }

  /**
   * Prompts user for controller name
   */
  private async getControllerName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter controller name (e.g., Users, Products)',
      placeHolder: 'Users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Controller name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Controller name must start with uppercase letter and contain only letters and numbers';
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
    controllerName: string,
    config: NestJSControllerConfig,
  ): Promise<string | undefined> {
    const defaultPath = this.kebabCase(controllerName);
    const input = await vscode.window.showInputBox({
      prompt: 'Enter base path for this controller',
      placeHolder: defaultPath,
      value: config.defaultPathPrefix + defaultPath,
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
  private async collectEndpoints(): Promise<NestJSEndpoint[] | null> {
    const endpoints: NestJSEndpoint[] = [];

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
  private async createEndpoint(): Promise<NestJSEndpoint | null> {
    // Choose HTTP method
    const methodChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: NestJSEndpoint['method'] }>
    >(
      [
        { label: 'GET', value: 'get' },
        { label: 'POST', value: 'post' },
        { label: 'PATCH', value: 'patch' },
        { label: 'PUT', value: 'put' },
        { label: 'DELETE', value: 'delete' },
        { label: 'ALL', value: 'all' },
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
      prompt: 'Enter endpoint description (optional, for Swagger)',
      placeHolder: `${methodChoice.value.toUpperCase()} ${endpointPath}`,
    });

    // Collect parameters
    const params: NestJSParam[] = await this.collectParams(methodChoice.value, endpointPath);

    // Get return type
    const returnType = await this.getReturnType(methodChoice.value);

    // Get status code
    const statusCode = await this.getStatusCode(methodChoice.value);

    return {
      method: methodChoice.value,
      path: endpointPath,
      description: description?.trim() || `${methodChoice.value.toUpperCase()} ${endpointPath}`,
      params,
      returnType,
      statusCode,
    };
  }

  /**
   * Collects parameters for an endpoint
   */
  private async collectParams(
    method: NestJSEndpoint['method'],
    path: string,
  ): Promise<NestJSParam[]> {
    const params: NestJSParam[] = [];

    // Auto-detect path params
    const pathParamMatches = path.match(/:([a-zA-Z0-9_]+)/g);
    if (pathParamMatches) {
      for (const match of pathParamMatches) {
        const paramName = match.substring(1);
        params.push({
          name: paramName,
          type: 'param',
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
          { label: 'Add body parameter', value: 'body' },
          { label: 'Add query parameter', value: 'query' },
          { label: 'Add file upload', value: 'file' },
          { label: 'Add multiple files upload', value: 'files' },
          { label: 'Add header parameter', value: 'headers' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add parameters to endpoint' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const param = await this.createParam(addParam.value as NestJSParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single parameter
   */
  private async createParam(type: NestJSParam['type']): Promise<NestJSParam | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${type} parameter name`,
      placeHolder: type === 'body' ? 'dto' : type,
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

    let dataType = 'any';
    if (type === 'body') {
      // For body params, use DTO class
      dataType = 'CreateDto';
    } else if (type === 'param') {
      dataType = 'string';
    } else if (type === 'query') {
      dataType = 'string';
    }

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter parameter description (optional)',
      placeHolder: `The ${nameInput} ${type}`,
    });

    return {
      name: nameInput.trim(),
      type,
      dataType,
      required: true,
      description: descriptionInput?.trim() || `The ${nameInput} ${type}`,
    };
  }

  /**
   * Gets the return type for an endpoint
   */
  private async getReturnType(method: NestJSEndpoint['method']): Promise<string> {
    const defaultTypes: Record<string, string> = {
      get: 'any',
      post: 'any',
      patch: 'any',
      put: 'any',
      delete: 'void',
      all: 'any',
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
  private async getStatusCode(method: NestJSEndpoint['method']): Promise<number | undefined> {
    const defaultCodes: Record<string, number> = {
      get: 200,
      post: 201,
      patch: 200,
      put: 200,
      delete: 204,
      all: 200,
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
   * Generates imports based on endpoints and config
   */
  private generateImports(endpoints: NestJSEndpoint[], config: NestJSControllerConfig): string[] {
    const imports = new Set<string>([
      'Controller',
      config.generateSwagger
        ? 'ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery'
        : '',
      'Get, Post, Patch, Put, Delete, All',
      'Body, Query, Param, Headers, Res',
      'HttpStatus',
      'Response',
    ]);

    // Check for file uploads
    const hasFileUploads = endpoints.some((e) =>
      e.params.some((p) => p.type === 'file' || p.type === 'files'),
    );
    if (hasFileUploads) {
      imports.add('UseInterceptors');
      imports.add('UploadedFile');
      imports.add('UploadedFiles');
      imports.add('FileInterceptor');
      imports.add('FilesInterceptor');
    }

    if (config.includeGuards) {
      imports.add('UseGuards');
    }
    if (config.includeInterceptors) {
      imports.add('UseInterceptors');
    }
    if (config.includeFilters) {
      imports.add('UseFilters');
    }
    if (config.generateValidation) {
      imports.add('ValidationPipe');
    }

    return Array.from(imports).filter((i) => i.length > 0);
  }

  /**
   * Generates DTO files for endpoints
   */
  private generateDTOFiles(
    controllerName: string,
    endpoints: NestJSEndpoint[],
    config: NestJSControllerConfig,
    workspacePath: string,
  ): Array<{ name: string; code: string }> {
    const dtoFiles: Array<{ name: string; code: string }> = [];

    for (const endpoint of endpoints) {
      const bodyParam = endpoint.params.find((p) => p.type === 'body');
      if (bodyParam) {
        const dtoName = `${controllerName}${this.ucfirst(endpoint.method)}Dto`;
        const dtoCode = this.generateDTOClass(dtoName, endpoint, config);
        dtoFiles.push({ name: dtoName, code: dtoCode });
      }
    }

    return dtoFiles;
  }

  /**
   * Generates a DTO class
   */
  private generateDTOClass(
    name: string,
    endpoint: NestJSEndpoint,
    config: NestJSControllerConfig,
  ): string {
    let code = `import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail, Min, Max } from 'class-validator';\n`;
    if (config.generateSwagger) {
      code += `import { ApiProperty } from '@nestjs/swagger';\n`;
    }
    code += '\n';

    code += `export class ${name} {\n`;
    code += `  // Add your properties here\n`;
    code += `  // Example:\n`;
    code += `  // ${config.generateSwagger ? '@ApiProperty()' : ''}\n`;
    code += `  // ${config.generateValidation ? '@IsString()' : ''}\n`;
    code += `  // name: string;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates the controller code
   */
  private generateControllerCode(
    controllerName: string,
    basePath: string,
    endpoints: NestJSEndpoint[],
    imports: string[],
    config: NestJSControllerConfig,
  ): string {
    let code = '';

    // Imports
    code += `import {\n`;
    code += `  ${imports.join(',\n  ')}\n`;
    code += `} from '@nestjs/common';\n`;

    if (config.generateSwagger) {
      code += `import {\n`;
      code += `  ApiTags,\n`;
      code += `  ApiOperation,\n`;
      code += `  ApiResponse,\n`;
      code += `  ApiParam,\n`;
      code += `  ApiBody,\n`;
      code += `  ApiQuery,\n`;
      code += `} from '@nestjs/swagger';\n`;
    }

    // DTO imports
    const dtoNames = new Set<string>();
    for (const endpoint of endpoints) {
      const bodyParam = endpoint.params.find((p) => p.type === 'body');
      if (bodyParam) {
        dtoNames.add(`${controllerName}${this.ucfirst(endpoint.method)}Dto`);
      }
    }

    if (dtoNames.size > 0) {
      code += `import { ${Array.from(dtoNames).join(', ')} } from './dto';\n`;
    }

    code += '\n';

    // Controller decorator
    code += `@Controller('${basePath}')\n`;
    if (config.generateSwagger) {
      code += `@ApiTags('${controllerName}')\n`;
    }
    code += `export class ${controllerName}Controller {\n`;
    code += `  constructor() {}\n\n`;

    // Generate methods
    for (const endpoint of endpoints) {
      code += this.generateEndpointMethod(controllerName, endpoint, config);
      code += '\n';
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates an endpoint method
   */
  private generateEndpointMethod(
    controllerName: string,
    endpoint: NestJSEndpoint,
    config: NestJSControllerConfig,
  ): string {
    let code = '';

    // Method decorators
    const methodDecorator = this.ucfirst(endpoint.method);
    const route = endpoint.path.length > 0 ? `('${endpoint.path}')` : '()';

    code += `  @${methodDecorator}${route}\n`;

    if (config.generateSwagger && endpoint.description) {
      code += `  @ApiOperation({ summary: '${this.escapeString(endpoint.description)}' })\n`;
      code += `  @ApiResponse({ status: ${endpoint.statusCode || 200}, description: 'Success' })\n`;
      code += `  @ApiResponse({ status: ${this.getErrorStatusCode(endpoint.method)}, description: 'Error' })\n`;

      // Add API docs for params
      for (const param of endpoint.params) {
        if (param.type === 'param') {
          code += `  @ApiParam({ name: '${param.name}', required: ${param.required}, description: '${this.escapeString(param.description || '')}' })\n`;
        } else if (param.type === 'query') {
          code += `  @ApiQuery({ name: '${param.name}', required: ${param.required}, description: '${this.escapeString(param.description || '')}' })\n`;
        } else if (param.type === 'body') {
          code += `  @ApiBody({ type: ${controllerName}${this.ucfirst(endpoint.method)}Dto })\n`;
        }
      }
    }

    // File upload interceptors
    const fileParams = endpoint.params.filter((p) => p.type === 'file' || p.type === 'files');
    for (const param of fileParams) {
      if (param.type === 'file') {
        code += `  @UseInterceptors(FileInterceptor('${param.name}'))\n`;
      } else if (param.type === 'files') {
        code += `  @UseInterceptors(FilesInterceptor('${param.name}'))\n`;
      }
    }

    // Guards, filters, etc. (placeholders)
    if (config.includeGuards) {
      code += `  // @UseGuards(YourGuard)\n`;
    }
    if (config.includeInterceptors && fileParams.length === 0) {
      code += `  // @UseInterceptors(YourInterceptor)\n`;
    }
    if (config.includeFilters) {
      code += `  // @UseFilters(YourFilter)\n`;
    }

    // Method signature
    const methodName = this.getMethodName(endpoint);
    code += `  async ${methodName}(`;

    // Parameters
    const methodParams = endpoint.params.map((p) => {
      let decorator = '';
      switch (p.type) {
        case 'body':
          decorator = '@Body()';
          break;
        case 'query':
          decorator = '@Query()';
          break;
        case 'param':
          decorator = '@Param()';
          break;
        case 'headers':
          decorator = '@Headers()';
          break;
        case 'file':
          decorator = '@UploadedFile()';
          break;
        case 'files':
          decorator = '@UploadedFiles()';
          break;
      }
      return `${decorator} ${p.name}: ${p.dataType}`;
    });

    if (methodParams.length > 0) {
      code += `\n    ${methodParams.join(',\n    ')},\n`;
    }

    // Response parameter
    code += `    @Res() res: Response,\n  `;

    // Return type and opening brace
    code += `): Promise<${endpoint.returnType}> {\n`;

    // Method body
    code += `    // TODO: Implement ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
    code += `    return res.status(HttpStatus.${this.getStatusConstant(endpoint.statusCode || 200)}).json({\n`;
    code += `      message: 'Not implemented yet',\n`;
    code += `    });\n`;
    code += `  }\n`;

    return code;
  }

  /**
   * Gets method name from endpoint
   */
  private getMethodName(endpoint: NestJSEndpoint): string {
    const path = endpoint.path.replace(/[^a-zA-Z0-9]/g, '') || 'index';
    return `${endpoint.method}${this.ucfirst(path)}`;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
   * Escapes string for use in template literals
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Gets error status code for a method
   */
  private getErrorStatusCode(method: NestJSEndpoint['method']): number {
    const errorCodes: Record<string, number> = {
      get: 404,
      post: 400,
      patch: 400,
      put: 400,
      delete: 404,
      all: 500,
    };
    return errorCodes[method] || 500;
  }

  /**
   * Gets HTTP status constant name
   */
  private getStatusConstant(code: number): string {
    const statusMap: Record<number, string> = {
      200: 'OK',
      201: 'CREATED',
      204: 'NO_CONTENT',
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return statusMap[code] || 'OK';
  }

  /**
   * Creates the controller file at the specified path
   */
  public async createControllerFile(
    filePath: string,
    code: string,
    dtoFiles: Array<{ name: string; code: string }>,
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write controller file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    // Create DTO folder and files if needed
    if (dtoFiles.length > 0) {
      const dtoDir = path.join(directory, 'dto');
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(dtoDir));
      } catch {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dtoDir));
      }

      for (const dto of dtoFiles) {
        const dtoPath = path.join(dtoDir, `${this.kebabCase(dto.name)}.ts`);
        const dtoUri = vscode.Uri.file(dtoPath);
        await vscode.workspace.fs.writeFile(dtoUri, Buffer.from(dto.code, 'utf-8'));
      }
    }

    this.logger.info('Controller file created', { filePath });
  }
}
