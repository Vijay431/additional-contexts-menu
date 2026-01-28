import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

// OpenAPI 3.0 Specification Types
export interface OpenApiSpec {
  openapi: string;
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  paths: Record<string, OpenApiPathItem>;
  components?: OpenApiComponents;
  tags?: OpenApiTag[];
}

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
  contact?: OpenApiContact;
  license?: OpenApiLicense;
}

export interface OpenApiContact {
  name?: string;
  email?: string;
  url?: string;
}

export interface OpenApiLicense {
  name: string;
  url?: string;
}

export interface OpenApiServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenApiServerVariable>;
}

export interface OpenApiServerVariable {
  enum?: (string | number)[];
  default: string | number;
  description?: string;
}

export interface OpenApiPathItem {
  [method: string]: OpenApiOperation;
}

export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: OpenApiSecurityRequirement[];
  deprecated?: boolean;
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required: boolean;
  schema: OpenApiSchema;
  example?: unknown;
}

export interface OpenApiRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, OpenApiMediaType>;
}

export interface OpenApiMediaType {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, OpenApiExample>;
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  enum?: (string | number)[];
  $ref?: string;
  additionalProperties?: boolean | OpenApiSchema;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, OpenApiMediaType>;
  headers?: Record<string, OpenApiHeader>;
}

export interface OpenApiHeader {
  description?: string;
  schema: OpenApiSchema;
  required?: boolean;
}

export interface OpenApiComponents {
  schemas?: Record<string, OpenApiSchema>;
  responses?: Record<string, OpenApiResponse>;
  parameters?: Record<string, OpenApiParameter>;
  examples?: Record<string, OpenApiExample>;
  requestBodies?: Record<string, OpenApiRequestBody>;
  securitySchemes?: Record<string, OpenApiSecurityScheme>;
}

export interface OpenApiExample {
  summary?: string;
  description?: string;
  value: unknown;
  externalValue?: string;
}

export interface OpenApiSecurityRequirement {
  [name: string]: string[];
}

export interface OpenApiSecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenApiOAuthFlows;
  openIdConnectUrl?: string;
}

export interface OpenApiOAuthFlows {
  implicit?: OpenApiOAuthFlow;
  password?: OpenApiOAuthFlow;
  clientCredentials?: OpenApiOAuthFlow;
  authorizationCode?: OpenApiOAuthFlow;
}

export interface OpenApiOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenApiTag {
  name: string;
  description?: string;
  externalDocs?: { description?: string; url: string };
}

export interface OpenApiSpecGeneratorConfig {
  enabled: boolean;
  outputFormat: 'json' | 'yaml';
  includeDescriptions: boolean;
  includeExamples: boolean;
  excludePrivateRoutes: boolean;
  outputDirectory: string;
  defaultServerUrl: string;
  includeSecuritySchemes: boolean;
}

export interface RouteInfo {
  path: string;
  method: string;
  file: string;
  line: number;
  parameters?: RouteParameter[];
  requestBody?: RouteRequestBody;
  responses?: RouteResponse[];
  tags?: string[];
  summary?: string;
  description?: string;
  isPrivate?: boolean;
}

export interface RouteParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  type: string;
  required: boolean;
  description?: string;
}

export interface RouteRequestBody {
  contentType: string;
  schema: OpenApiSchema;
  example?: unknown;
}

export interface RouteResponse {
  statusCode: string;
  description: string;
  contentType?: string;
  schema?: OpenApiSchema;
  example?: unknown;
}

export interface GeneratedOpenApiSpec {
  spec: OpenApiSpec;
  routes: RouteInfo[];
  outputFile: string;
  format: 'json' | 'yaml';
}

/**
 * Service for analyzing API routes and generating OpenAPI 3.0 specifications.
 * Supports various frameworks including Express, NestJS, Next.js, and Nuxt.js.
 */
export class OpenApiSpecGeneratorService {
  private static instance: OpenApiSpecGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): OpenApiSpecGeneratorService {
    OpenApiSpecGeneratorService.instance ??= new OpenApiSpecGeneratorService();
    return OpenApiSpecGeneratorService.instance;
  }

  /**
   * Main entry point for generating OpenAPI specification
   */
  public async generateOpenApiSpec(
    workspacePath: string,
    config: OpenApiSpecGeneratorConfig,
  ): Promise<GeneratedOpenApiSpec | null> {
    // Get project info
    const projectName = await this.getProjectName(workspacePath);
    if (!projectName) {
      vscode.window.showWarningMessage('Could not determine project name.');
      return null;
    }

    // Get API routes
    const routes = await this.analyzeApiRoutes(workspacePath);
    if (routes.length === 0) {
      vscode.window.showWarningMessage('No API routes found in the project.');
      return null;
    }

    // Filter private routes if needed
    const filteredRoutes = config.excludePrivateRoutes
      ? routes.filter((r) => !r.isPrivate)
      : routes;

    // Generate OpenAPI spec
    const spec = await this.buildOpenApiSpec(projectName, filteredRoutes, config);

    // Determine output file path
    const outputFile = path.join(
      workspacePath,
      config.outputDirectory,
      `openapi.${config.outputFormat}`,
    );

    this.logger.info('OpenAPI specification generated', {
      routes: filteredRoutes.length,
      format: config.outputFormat,
      outputFile,
    });

    return {
      spec,
      routes: filteredRoutes,
      outputFile,
      format: config.outputFormat,
    };
  }

  /**
   * Get project name from package.json or directory name
   */
  private async getProjectName(workspacePath: string): Promise<string | null> {
    try {
      const packageJsonPath = path.join(workspacePath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      return packageJson.name || path.basename(workspacePath);
    } catch {
      return path.basename(workspacePath);
    }
  }

  /**
   * Analyze API routes in the project
   */
  private async analyzeApiRoutes(workspacePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    // Check for different framework patterns
    const hasExpress = await this.hasExpressRoutes(workspacePath);
    const hasNestJS = await this.hasNestJSRoutes(workspacePath);
    const hasNextJS = await this.hasNextJSRoutes(workspacePath);
    const hasNuxtJS = await this.hasNuxtJSRoutes(workspacePath);

    if (hasExpress) {
      const expressRoutes = await this.analyzeExpressRoutes(workspacePath);
      routes.push(...expressRoutes);
    }

    if (hasNestJS) {
      const nestjsRoutes = await this.analyzeNestJSRoutes(workspacePath);
      routes.push(...nestjsRoutes);
    }

    if (hasNextJS) {
      const nextjsRoutes = await this.analyzeNextJSRoutes(workspacePath);
      routes.push(...nextjsRoutes);
    }

    if (hasNuxtJS) {
      const nuxtjsRoutes = await this.analyzeNuxtJSRoutes(workspacePath);
      routes.push(...nuxtjsRoutes);
    }

    return routes;
  }

  /**
   * Check if project has Express routes
   */
  private async hasExpressRoutes(workspacePath: string): Promise<boolean> {
    const files = await this.findFiles(workspacePath, ['**/*.ts', '**/*.js']);
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (
        content.includes('express()') ||
        content.includes('Router()') ||
        content.includes('.get(') ||
        content.includes('.post(')
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if project has NestJS routes
   */
  private async hasNestJSRoutes(workspacePath: string): Promise<boolean> {
    const controllerFiles = await this.findFiles(workspacePath, ['**/*.controller.ts']);
    return controllerFiles.length > 0;
  }

  /**
   * Check if project has Next.js API routes
   */
  private async hasNextJSRoutes(workspacePath: string): Promise<boolean> {
    const appRoutes = await this.findFiles(workspacePath, ['**/app/api/**/route.ts']);
    const pagesRoutes = await this.findFiles(workspacePath, ['**/pages/api/**/*.ts']);
    return appRoutes.length > 0 || pagesRoutes.length > 0;
  }

  /**
   * Check if project has Nuxt.js server routes
   */
  private async hasNuxtJSRoutes(workspacePath: string): Promise<boolean> {
    const serverRoutes = await this.findFiles(workspacePath, ['**/server/api/**/*.{ts,js}']);
    return serverRoutes.length > 0;
  }

  /**
   * Analyze Express routes
   */
  private async analyzeExpressRoutes(workspacePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const files = await this.findFiles(workspacePath, ['**/*.ts', '**/*.js']);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const routeMatches = content.matchAll(
        /(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      );

      for (const match of routeMatches) {
        const method = match[1]?.toUpperCase();
        const routePath = match[2];
        const line = this.getLineNumber(content, match.index ?? 0);

        routes.push({
          path: routePath ?? '/',
          method: method ?? 'GET',
          file: path.relative(workspacePath, file),
          line,
          tags: ['Express'],
        });
      }
    }

    return routes;
  }

  /**
   * Analyze NestJS routes from controllers
   */
  private async analyzeNestJSRoutes(workspacePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const controllerFiles = await this.findFiles(workspacePath, ['**/*.controller.ts']);

    for (const file of controllerFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Extract controller path
      const controllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]+)['"`]/);
      const controllerPath = controllerMatch?.[1] ?? '';

      // Find all decorator methods
      const methodMatches = content.matchAll(
        /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/g,
      );

      for (const match of methodMatches) {
        const method = this.mapNestJSMethodToHttp(match[1] ?? 'Get');
        const routePath = match[2]?.trim() || '';
        const line = this.getLineNumber(content, match.index ?? 0);
        const fullPath = controllerPath + routePath;

        // Extract method name (function below decorator)
        const methodStart = match.index ?? 0 + (match[0]?.length ?? 0);
        const methodMatch = content.slice(methodStart).match(/async\s+(\w+)/);
        const operationId = methodMatch?.[1];

        routes.push({
          path: fullPath || '/',
          method,
          file: path.relative(workspacePath, file),
          line,
          tags: ['NestJS'],
          operationId,
        });
      }
    }

    return routes;
  }

  /**
   * Analyze Next.js API routes
   */
  private async analyzeNextJSRoutes(workspacePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    // App directory routes
    const appRouteFiles = await this.findFiles(workspacePath, ['**/app/api/**/route.ts']);
    for (const file of appRouteFiles) {
      const relativePath = path.relative(workspacePath, file);
      const routePath = this.extractNextJSAppRoutePath(relativePath);

      // Find HTTP methods in the file
      const content = await fs.readFile(file, 'utf-8');
      const methods = this.extractNextJSRouteMethods(content);

      for (const method of methods) {
        routes.push({
          path: routePath,
          method: method.toUpperCase(),
          file: relativePath,
          line: 1,
          tags: ['Next.js'],
        });
      }
    }

    // Pages directory routes
    const pagesRouteFiles = await this.findFiles(workspacePath, ['**/pages/api/**/*.ts']);
    for (const file of pagesRouteFiles) {
      const relativePath = path.relative(workspacePath, file);
      const routePath = this.extractNextJSPagesRoutePath(relativePath);

      routes.push({
        path: routePath,
        method: 'GET', // Pages API routes typically handle all methods
        file: relativePath,
        line: 1,
        tags: ['Next.js'],
      });
    }

    return routes;
  }

  /**
   * Analyze Nuxt.js server routes
   */
  private async analyzeNuxtJSRoutes(workspacePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const routeFiles = await this.findFiles(workspacePath, [
      '**/server/api/**/*.ts',
      '**/server/api/**/*.js',
    ]);

    for (const file of routeFiles) {
      const relativePath = path.relative(workspacePath, file);
      const routePath = this.extractNuxtRoutePath(relativePath);

      // Detect HTTP method from filename or content
      const content = await fs.readFile(file, 'utf-8');
      const method = this.extractNuxtHTTPMethod(content, file);

      routes.push({
        path: routePath,
        method,
        file: relativePath,
        line: 1,
        tags: ['Nuxt.js'],
      });
    }

    return routes;
  }

  /**
   * Build the OpenAPI specification
   */
  private async buildOpenApiSpec(
    projectName: string,
    routes: RouteInfo[],
    config: OpenApiSpecGeneratorConfig,
  ): Promise<OpenApiSpec> {
    // Group routes by path
    const pathsMap = new Map<string, OpenApiPathItem>();

    for (const route of routes) {
      const normalizedPath = this.normalizePath(route.path);

      if (!pathsMap.has(normalizedPath)) {
        pathsMap.set(normalizedPath, {});
      }

      const pathItem = pathsMap.get(normalizedPath)!;
      const operation: OpenApiOperation = {
        tags: route.tags || ['api'],
        responses: this.buildDefaultResponses(route),
      };

      if (config.includeDescriptions && route.summary) {
        operation.summary = route.summary;
      }

      if (config.includeDescriptions && route.description) {
        operation.description = route.description;
      }

      if (route.operationId) {
        operation.operationId = route.operationId;
      }

      // Add parameters if available
      if (route.parameters && route.parameters.length > 0) {
        operation.parameters = route.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          description: config.includeDescriptions ? p.description : undefined,
          required: p.required,
          schema: { type: p.type },
        }));
      }

      // Add request body if available
      if (route.requestBody) {
        operation.requestBody = {
          description: config.includeDescriptions ? 'Request body' : undefined,
          required: true,
          content: {
            [route.requestBody.contentType]: {
              schema: route.requestBody.schema,
              ...(config.includeExamples && route.requestBody.example
                ? { example: route.requestBody.example }
                : {}),
            },
          },
        };
      }

      // Add responses if available
      if (route.responses && route.responses.length > 0) {
        operation.responses = {};
        for (const response of route.responses) {
          operation.responses[response.statusCode] = {
            description: response.description,
            ...(response.contentType
              ? {
                  content: {
                    [response.contentType]: {
                      ...(response.schema ? { schema: response.schema } : {}),
                      ...(config.includeExamples && response.example
                        ? { example: response.example }
                        : {}),
                    },
                  },
                }
              : {}),
          };
        }
      }

      pathItem[route.method.toLowerCase()] = operation;
    }

    // Build spec
    const spec: OpenApiSpec = {
      openapi: '3.0.0',
      info: {
        title: projectName,
        version: '1.0.0',
        description: config.includeDescriptions
          ? `Auto-generated OpenAPI specification for ${projectName}`
          : undefined,
      },
      paths: Object.fromEntries(pathsMap),
    };

    // Add servers if configured
    if (config.defaultServerUrl) {
      spec.servers = [
        {
          url: config.defaultServerUrl,
          description: 'API server',
        },
      ];
    }

    // Add security schemes if configured
    if (config.includeSecuritySchemes) {
      spec.components = {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      };
      // Apply to all operations
      for (const pathItem of Object.values(spec.paths)) {
        for (const operation of Object.values(pathItem)) {
          operation.security = [{ bearerAuth: [] }];
        }
      }
    }

    // Extract unique tags
    const uniqueTags = new Set<string>();
    for (const route of routes) {
      if (route.tags) {
        route.tags.forEach((tag) => uniqueTags.add(tag));
      }
    }
    if (uniqueTags.size > 0) {
      spec.tags = Array.from(uniqueTags).map((tag) => ({ name: tag }));
    }

    return spec;
  }

  /**
   * Build default responses for a route
   */
  private buildDefaultResponses(route: RouteInfo): Record<string, OpenApiResponse> {
    const responses: Record<string, OpenApiResponse> = {
      '200': {
        description: 'Successful response',
      },
    };

    if (route.method === 'POST' || route.method === 'PUT' || route.method === 'PATCH') {
      responses['201'] = { description: 'Created' };
    }

    responses['400'] = { description: 'Bad request' };
    responses['500'] = { description: 'Internal server error' };

    return responses;
  }

  /**
   * Normalize path for OpenAPI spec
   */
  private normalizePath(path: string): string {
    // Convert path parameters to OpenAPI format
    return path.replace(/:(\w+)/g, '{$1}').replace(/\*$/, '');
  }

  /**
   * Extract Next.js app directory route path
   */
  private extractNextJSAppRoutePath(filePath: string): string {
    const match = filePath.match(/app\/api(.+)\/route\.ts/);
    if (match) {
      return '/api' + match[1].replace(/\[\.{3}\w+\]/g, '*').replace(/\[(\w+)\]/g, '{$1}');
    }
    return '/';
  }

  /**
   * Extract Next.js pages directory route path
   */
  private extractNextJSPagesRoutePath(filePath: string): string {
    const match = filePath.match(/pages\/api(.+)\.ts/);
    if (match) {
      return '/api' + match[1].replace(/\[\.{3}\w+\]/g, '*').replace(/\[(\w+)\]/g, '{$1}');
    }
    return '/';
  }

  /**
   * Extract Next.js route HTTP methods from file content
   */
  private extractNextJSRouteMethods(content: string): string[] {
    const methods: string[] = [];
    const methodNames = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

    for (const method of methodNames) {
      if (
        content.includes(`export async function ${method}`) ||
        content.includes(`export const ${method}`)
      ) {
        methods.push(method);
      }
    }

    return methods.length > 0 ? methods : ['GET'];
  }

  /**
   * Extract Nuxt route path
   */
  private extractNuxtRoutePath(filePath: string): string {
    const match = filePath.match(/server\/api(.+)\.\w+$/);
    if (match) {
      return '/api' + match[1].replace(/\[\.{3}\w+\]/g, '*').replace(/\[(\w+)\]/g, '{$1}');
    }
    return '/';
  }

  /**
   * Extract Nuxt HTTP method from file or content
   */
  private extractNuxtHTTPMethod(content: string, filePath: string): string {
    // Check filename for method suffix
    const filename = path.basename(filePath, path.extname(filePath));
    const methodMatch = filename.match(new RegExp('\\.(get|post|put|patch|delete)$'));
    if (methodMatch) {
      return methodMatch[1]!.toUpperCase();
    }

    // Check content for eventHandler method
    if (content.includes('eventHandler(') || content.includes('defineEventHandler')) {
      return 'GET'; // Default to GET
    }

    return 'GET';
  }

  /**
   * Map NestJS decorator method to HTTP method
   */
  private mapNestJSMethodToHttp(method: string): string {
    const mapping: Record<string, string> = {
      Get: 'GET',
      Post: 'POST',
      Put: 'PUT',
      Patch: 'PATCH',
      Delete: 'DELETE',
      Options: 'OPTIONS',
      Head: 'HEAD',
    };
    return mapping[method] || 'GET';
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

  /**
   * Find files matching patterns
   */
  private async findFiles(workspacePath: string, patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      const globFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspacePath, pattern),
        '**/node_modules/**',
      );
      for (const file of globFiles) {
        files.push(file.fsPath);
      }
    }

    return files;
  }

  /**
   * Write the OpenAPI spec to a file
   */
  public async writeSpecToFile(
    spec: OpenApiSpec,
    outputPath: string,
    format: 'json' | 'yaml',
  ): Promise<void> {
    const directory = path.dirname(outputPath);

    // Create directory if it doesn't exist
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }

    let content: string;

    if (format === 'json') {
      content = JSON.stringify(spec, null, 2);
    } else {
      // Simple YAML conversion (for production, use a proper YAML library)
      content = this.jsonToYaml(spec);
    }

    await fs.writeFile(outputPath, content, 'utf-8');

    this.logger.info('OpenAPI specification written', { outputPath, format });
  }

  /**
   * Simple JSON to YAML converter
   * Note: For production use, consider using a proper YAML library
   */
  private jsonToYaml(obj: unknown, indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (obj === null) {
      return 'null';
    }

    if (typeof obj === 'undefined') {
      return '~';
    }

    if (typeof obj === 'string') {
      return `"${obj}"`;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      return obj.map((item) => `${spaces}- ${this.jsonToYaml(item, indent + 1).trim()}`).join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return '{}';
      }
      return entries
        .map(([key, value]) => {
          const yamlValue = this.jsonToYaml(value, indent + 1);
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return `${spaces}${key}:\n${yamlValue}`;
          }
          return `${spaces}${key}: ${yamlValue.trim()}`;
        })
        .join('\n');
    }

    return String(obj);
  }
}
