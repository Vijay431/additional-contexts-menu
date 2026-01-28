import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'yaml';

import { Logger } from '../utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AxiosClientGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeInterceptors: boolean;
  includeTransformers: boolean;
  includeErrorHandling: boolean;
  includeRetryLogic: boolean;
  includeRequestCancellation: boolean;
  includeCacheAdapter: boolean;
  outputDirectory: string;
  clientClassName: string;
  baseApiUrl?: string;
  timeout?: number;
  generateReactQueryHooks: boolean;
  generateSwaggerTypes: boolean;
}

export interface OpenAPIEndpoint {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required: boolean;
  schema: OpenAPISchema;
  example?: unknown;
}

export interface OpenAPIRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  schema: OpenAPISchema;
  example?: unknown;
  examples?: Record<string, { value: unknown }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  $ref?: string;
  enum?: unknown[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  additionalProperties?: boolean | OpenAPISchema;
  allOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  description?: string;
  example?: unknown;
  default?: unknown;
}

export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, OpenAPIEndpoint>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, unknown>;
    responses?: Record<string, OpenAPIResponse>;
    parameters?: Record<string, OpenAPIParameter>;
    requestBodies?: Record<string, OpenAPIRequestBody>;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
}

export interface GeneratedAxiosClient {
  clientCode: string;
  typesCode: string;
  interceptorsCode: string;
  transformersCode: string;
  hooksCode?: string;
  outputFile: string;
  endpoints: OpenAPIEndpoint[];
  hasAuthentication: boolean;
}

export interface TypeScriptType {
  name: string;
  definition: string;
  isExport: boolean;
}

// ============================================================================
// Main Service Class
// ============================================================================

/**
 * Service for generating typed Axios clients from OpenAPI specifications.
 * Includes interceptors, transformers, error handling, and optional React Query hooks.
 */
export class AxiosClientGeneratorService {
  private static instance: AxiosClientGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): AxiosClientGeneratorService {
    AxiosClientGeneratorService.instance ??= new AxiosClientGeneratorService();
    return AxiosClientGeneratorService.instance;
  }

  /**
   * Main entry point: Generate typed Axios client from OpenAPI spec
   */
  public async generateAxiosClient(
    openApiSpecContent: string,
    specFormat: 'json' | 'yaml',
    workspacePath: string,
    config: AxiosClientGeneratorConfig,
  ): Promise<GeneratedAxiosClient> {
    // Parse OpenAPI spec
    const openApiDoc = this.parseOpenAPISpec(openApiSpecContent, specFormat);

    if (!openApiDoc) {
      throw new Error('Failed to parse OpenAPI specification');
    }

    this.logger.info('OpenAPI spec parsed', {
      title: openApiDoc.info.title,
      version: openApiDoc.info.version,
      endpointCount: Object.keys(openApiDoc.paths).length,
    });

    // Extract endpoints from paths
    const endpoints = this.extractEndpoints(openApiDoc);

    // Generate TypeScript types from schemas
    const typesCode = this.generateTypesCode(openApiDoc, config);

    // Generate main client code
    const clientCode = this.generateClientCode(openApiDoc, endpoints, config);

    // Generate interceptors
    const interceptorsCode = config.includeInterceptors
      ? this.generateInterceptorsCode(openApiDoc, config)
      : '';

    // Generate transformers
    const transformersCode = config.includeTransformers
      ? this.generateTransformersCode(config)
      : '';

    // Generate React Query hooks (optional)
    const hooksCode =
      config.generateReactQueryHooks ? this.generateReactQueryHooks(endpoints, config) : '';

    // Determine output file path
    const outputFile = this.getOutputFilePath(workspacePath, config.outputDirectory, config);

    this.logger.info('Axios client generated', {
      endpointCount: endpoints.length,
      hasTypes: config.includeTypeScript,
      hasInterceptors: config.includeInterceptors,
      hasHooks: config.generateReactQueryHooks,
      outputFile,
    });

    return {
      clientCode,
      typesCode,
      interceptorsCode,
      transformersCode,
      hooksCode,
      outputFile,
      endpoints,
      hasAuthentication: this.hasAuthentication(openApiDoc),
    };
  }

  /**
   * Parse OpenAPI specification from JSON or YAML
   */
  private parseOpenAPISpec(
    content: string,
    format: 'json' | 'yaml',
  ): OpenAPIDocument | null {
    try {
      if (format === 'json') {
        return JSON.parse(content) as OpenAPIDocument;
      } else {
        return yaml.parse(content) as OpenAPIDocument;
      }
    } catch (error) {
      this.logger.error('Failed to parse OpenAPI spec', { error });
      return null;
    }
  }

  /**
   * Extract all endpoints from OpenAPI paths object
   */
  private extractEndpoints(openApiDoc: OpenAPIDocument): OpenAPIEndpoint[] {
    const endpoints: OpenAPIEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(openApiDoc.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (this.isValidHttpMethod(method)) {
          const endpoint = operation as OpenAPIEndpoint;
          endpoint.path = path;
          endpoint.method = method as OpenAPIEndpoint['method'];
          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  /**
   * Check if string is a valid HTTP method
   */
  private isValidHttpMethod(method: string): boolean {
    return ['get', 'post', 'put', 'patch', 'delete'].includes(method);
  }

  /**
   * Check if OpenAPI spec has authentication requirements
   */
  private hasAuthentication(openApiDoc: OpenAPIDocument): boolean {
    return !!(
      openApiDoc.security ||
      openApiDoc.components?.securitySchemes ||
      Object.values(openApiDoc.paths).some((path) =>
        Object.values(path).some((op) => op.security && op.security.length > 0),
      )
    );
  }

  /**
   * Generate TypeScript types from OpenAPI schemas
   */
  private generateTypesCode(
    openApiDoc: OpenAPIDocument,
    config: AxiosClientGeneratorConfig,
  ): string {
    if (!config.includeTypeScript) {
      return '';
    }

    let code = `// Auto-generated TypeScript types from ${openApiDoc.info.title} OpenAPI spec\n\n`;
    code += `// Base API Response type\nexport interface ApiResponse<T> {\n`;
    code += `  data: T;\n`;
    code += `  status: number;\n`;
    code += `  statusText: string;\n`;
    code += `}\n\n`;

    code += `// API Error type\nexport interface ApiError {\n`;
    code += `  message: string;\n`;
    code += `  status?: number;\n`;
    code += `  code?: string;\n`;
    code += `  details?: unknown;\n`;
    code += `}\n\n`;

    // Generate types from components/schemas
    if (openApiDoc.components?.schemas) {
      code += `// Schema Types\n`;
      for (const [schemaName, schema] of Object.entries(openApiDoc.components.schemas)) {
        const typeDefinition = this.generateTypeDefinition(schemaName, schema, openApiDoc);
        code += typeDefinition;
        code += '\n';
      }
    }

    // Generate request/response types for each endpoint
    code += `// Endpoint Request/Response Types\n`;
    for (const [path, pathItem] of Object.entries(openApiDoc.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (this.isValidHttpMethod(method)) {
          const endpoint = operation as OpenAPIEndpoint;
          const operationName = endpoint.operationId || this.generateOperationId(path, method);
          code += this.generateEndpointTypes(endpoint, operationName, openApiDoc);
        }
      }
    }

    return code;
  }

  /**
   * Generate TypeScript type definition from OpenAPI schema
   */
  private generateTypeDefinition(
    name: string,
    schema: OpenAPISchema,
    openApiDoc: OpenAPIDocument,
    indent = 0,
  ): string {
    const indentStr = '  '.repeat(indent);

    // Handle $ref
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return refName || 'any';
    }

    // Handle enum
    if (schema.enum) {
      const values = schema.enum.map((v) => JSON.stringify(v)).join(' | ');
      return `${indentStr}export type ${name} = ${values};\n`;
    }

    // Handle array
    if (schema.type === 'array' && schema.items) {
      const itemType = this.generateTypeDefinition('Item', schema.items, openApiDoc, 0);
      const itemTypeName = this.extractTypeName(itemType);
      return `${indentStr}export type ${name} = ${itemTypeName}[];\n`;
    }

    // Handle object
    if (schema.type === 'object' || schema.properties) {
      let code = `${indentStr}export interface ${name} {\n`;

      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const isRequired = schema.required?.includes(propName);
          const propType = this.openAPITypeToTypeScript(propName, propSchema, openApiDoc);
          const optional = isRequired ? '' : '?';
          code += `${indentStr}  ${propName}${optional}: ${propType};\n`;
        }
      }

      if (schema.additionalProperties) {
        const addPropsType =
          typeof schema.additionalProperties === 'boolean'
            ? 'any'
            : this.openAPITypeToTypeScript('Additional', schema.additionalProperties, openApiDoc);
        code += `${indentStr}  [key: string]: ${addPropsType};\n`;
      }

      code += `${indentStr}}\n`;
      return code;
    }

    // Handle primitive types
    const tsType = this.openAPITypeToTypeScript(name, schema, openApiDoc);
    return `${indentStr}export type ${name} = ${tsType};\n`;
  }

  /**
   * Convert OpenAPI type to TypeScript type
   */
  private openAPITypeToTypeScript(
    name: string,
    schema: OpenAPISchema,
    openApiDoc: OpenAPIDocument,
  ): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return refName || 'any';
    }

    if (schema.enum) {
      return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
    }

    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      integer: 'number',
      boolean: 'boolean',
      array: 'any[]',
      object: 'object',
    };

    if (schema.type && typeMap[schema.type]) {
      let tsType = typeMap[schema.type];

      // Handle format
      if (schema.format === 'date-time') {
        tsType = 'Date | string';
      } else if (schema.format === 'date') {
        tsType = 'Date | string';
      } else if (schema.format === 'binary') {
        tsType = 'Blob';
      }

      // Handle arrays
      if (schema.type === 'array' && schema.items) {
        const itemType = this.openAPITypeToTypeScript('Item', schema.items, openApiDoc);
        return `${itemType}[]`;
      }

      return tsType;
    }

    // Handle allOf, anyOf, oneOf
    if (schema.allOf && schema.allOf.length > 0) {
      const types = schema.allOf
        .map((s, i) => this.openAPITypeToTypeScript(`${name}${i}`, s, openApiDoc))
        .join(' & ');
      return `(${types})`;
    }

    if (schema.anyOf && schema.anyOf.length > 0) {
      const types = schema.anyOf
        .map((s, i) => this.openAPITypeToTypeScript(`${name}${i}`, s, openApiDoc))
        .join(' | ');
      return `(${types})`;
    }

    if (schema.oneOf && schema.oneOf.length > 0) {
      const types = schema.oneOf
        .map((s, i) => this.openAPITypeToTypeScript(`${name}${i}`, s, openApiDoc))
        .join(' | ');
      return `(${types})`;
    }

    return 'any';
  }

  /**
   * Extract type name from type definition
   */
  private extractTypeName(typeDef: string): string {
    const match = typeDef.match(/export (?:interface|type) (\w+)/);
    return match ? match[1] : 'any';
  }

  /**
   * Generate request/response types for an endpoint
   */
  private generateEndpointTypes(
    endpoint: OpenAPIEndpoint,
    operationName: string,
    openApiDoc: OpenAPIDocument,
  ): string {
    let code = '';

    // Request parameters type
    const pathParams = endpoint.parameters?.filter((p) => p.in === 'path') || [];
    const queryParams = endpoint.parameters?.filter((p) => p.in === 'query') || [];
    const headerParams = endpoint.parameters?.filter((p) => p.in === 'header') || [];

    if (pathParams.length > 0 || queryParams.length > 0 || headerParams.length > 0) {
      code += `// ${operationName} request parameters\n`;
      code += `export interface ${this.capitalize(operationName)}Params {\n`;

      for (const param of pathParams) {
        const paramType = this.openAPITypeToTypeScript(param.name, param.schema, openApiDoc);
        code += `  ${param.name}: ${paramType};\n`;
      }

      for (const param of queryParams) {
        const paramType = this.openAPITypeToTypeScript(param.name, param.schema, openApiDoc);
        const optional = param.required ? '' : '?';
        code += `  ${param.name}${optional}: ${paramType};\n`;
      }

      for (const param of headerParams) {
        const paramType = this.openAPITypeToTypeScript(param.name, param.schema, openApiDoc);
        const optional = param.required ? '' : '?';
        code += `  ${param.name}${optional}: ${paramType};\n`;
      }

      code += `}\n\n`;
    }

    // Request body type
    if (endpoint.requestBody) {
      const contentTypes = Object.keys(endpoint.requestBody.content);
      const mainContentType = contentTypes[0] || 'application/json';
      const bodySchema = endpoint.requestBody.content[mainContentType]?.schema;

      if (bodySchema) {
        const bodyType = this.openAPITypeToTypeScript(
          `${operationName}Body`,
          bodySchema,
          openApiDoc,
        );
        code += `// ${operationName} request body\n`;
        code += `export type ${this.capitalize(operationName)}Body = ${bodyType};\n\n`;
      }
    }

    // Response type
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    if (successResponse?.content) {
      const contentTypes = Object.keys(successResponse.content);
      const mainContentType = contentTypes[0] || 'application/json';
      const responseSchema = successResponse.content[mainContentType]?.schema;

      if (responseSchema) {
        const responseType = this.openAPITypeToTypeScript(
          `${operationName}Response`,
          responseSchema,
          openApiDoc,
        );
        code += `// ${operationName} response\n`;
        code += `export type ${this.capitalize(operationName)}Response = ${responseType};\n\n`;
      }
    }

    return code;
  }

  /**
   * Generate main Axios client code
   */
  private generateClientCode(
    openApiDoc: OpenAPIDocument,
    endpoints: OpenAPIEndpoint[],
    config: AxiosClientGeneratorConfig,
  ): string {
    const className = config.clientClassName || 'ApiClient';
    const baseUrl =
      config.baseApiUrl || openApiDoc.servers?.[0]?.url || 'http://localhost:3000';

    let code = `// Auto-generated Axios client from ${openApiDoc.info.title} OpenAPI spec\n\n`;
    code += `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';\n`;

    if (config.includeTypeScript) {
      code += `import { ApiResponse, ApiError`;
      if (config.includeTransformers) {
        code += ', RequestTransformer, ResponseTransformer';
      }
      code += ` } from './types';\n`;

      // Import interceptor types if they exist
      if (config.includeInterceptors) {
        code += `import { setupInterceptors } from './interceptors';\n`;
      }

      // Import transformer types if they exist
      if (config.includeTransformers) {
        code += `import { requestTransformer, responseTransformer } from './transformers';\n`;
      }

      // Import React Query hooks if enabled
      if (config.generateReactQueryHooks) {
        code += `import * as ReactQueryHooks from './hooks';\n`;
      }
    } else {
      if (config.includeInterceptors) {
        code += `import { setupInterceptors } from './interceptors';\n`;
      }
      if (config.includeTransformers) {
        code += `import { requestTransformer, responseTransformer } from './transformers';\n`;
      }
    }

    code += `\n`;

    // Client class definition
    code += `/**\n`;
    code += ` * Axios API client for ${openApiDoc.info.title}\n`;
    code += ` * Version: ${openApiDoc.info.version}\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;
    code += `  private client: AxiosInstance;\n`;
    code += `  private baseUrl: string;\n\n`;

    // Constructor
    code += `  constructor(config?: { baseUrl?: string; timeout?: number }) {\n`;
    code += `    this.baseUrl = config?.baseUrl || '${baseUrl}';\n\n`;
    code += `    this.client = axios.create({\n`;
    code += `      baseURL: this.baseUrl,\n`;
    if (config.timeout) {
      code += `      timeout: config?.timeout || ${config.timeout},\n`;
    }
    code += `      headers: {\n`;
    code += `        'Content-Type': 'application/json',\n`;
    code += `      },\n`;
    code += `    });\n\n`;

    // Setup interceptors
    if (config.includeInterceptors) {
      code += `    // Setup interceptors\n`;
      code += `    setupInterceptors(this.client`;
      if (config.includeErrorHandling) {
        code += `, { includeErrorHandling: true }`;
      }
      code += `);\n\n`;
    }

    // Setup transformers
    if (config.includeTransformers) {
      code += `    // Setup transformers\n`;
      code += `    this.client.defaults.transformRequest = [\n`;
      code += `      requestTransformer,\n`;
      code += `      ...((this.client.defaults.transformRequest as any) || []),\n`;
      code += `    ];\n`;
      code += `    this.client.defaults.transformResponse = [\n`;
      code += `      ...((this.client.defaults.transformResponse as any) || []),\n`;
      code += `      responseTransformer,\n`;
      code += `    ];\n\n`;
    }

    code += `  }\n\n`;

    // Generate API methods
    for (const endpoint of endpoints) {
      const operationName = endpoint.operationId || this.generateOperationId(endpoint.path, endpoint.method);
      code += this.generateEndpointMethod(endpoint, operationName, className, config);
    }

    // Export React Query hooks if enabled
    if (config.generateReactQueryHooks) {
      code += `  /**\n`;
      code += `   * React Query hooks\n`;
      code += `   */\n`;
      code += `  public get hooks() {\n`;
      code += `    return ReactQueryHooks;\n`;
      code += `  }\n\n`;
    }

    code += `}\n\n`;

    // Export singleton instance
    code += `// Default export - singleton instance\n`;
    code += `export const apiClient = new ${className}();\n`;

    return code;
  }

  /**
   * Generate a method for an endpoint
   */
  private generateEndpointMethod(
    endpoint: OpenAPIEndpoint,
    operationName: string,
    className: string,
    config: AxiosClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * ${endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`}\n`;
    if (endpoint.tags && endpoint.tags.length > 0) {
      code += `   * Tags: ${endpoint.tags.join(', ')}\n`;
    }
    code += `   */\n`;

    const methodParams = this.getMethodParameters(endpoint, config);
    const returnType = this.getMethodReturnType(endpoint, config);
    const camelCaseName = this.toCamelCase(operationName);

    code += `  public async ${camelCaseName}(`;

    if (methodParams.length > 0) {
      code += methodParams.join(', ');
    }

    if (config.includeTypeScript) {
      code += `): Promise<${returnType}> {\n`;
    } else {
      code += `) {\n`;
    }

    // Build request config
    code += `    const config: AxiosRequestConfig = {\n`;
    code += `      method: '${endpoint.method.toUpperCase()}',\n`;
    code += `      url: this.buildUrl('${endpoint.path}'`;

    const pathParams = endpoint.parameters?.filter((p) => p.in === 'path') || [];
    if (pathParams.length > 0) {
      code += `, { `;
      code += pathParams.map((p) => `${p.name}`).join(', ');
      code += ` }`;
    }

    code += `),\n`;

    // Query parameters
    const queryParams = endpoint.parameters?.filter((p) => p.in === 'query') || [];
    if (queryParams.length > 0) {
      code += `      params: { `;
      code += queryParams.map((p) => p.name).join(', ');
      code += ` },\n`;
    }

    // Request body
    if (endpoint.requestBody && endpoint.method !== 'get' && endpoint.method !== 'delete') {
      code += `      data: body,\n`;
    }

    code += `    };\n\n`;

    // Make request
    code += `    const response = await this.client.request(config);\n`;
    code += `    return response${config.includeTypeScript ? '.data' : ''};\n`;
    code += `  }\n\n`;

    return code;
  }

  /**
   * Get method parameters for TypeScript signature
   */
  private getMethodParameters(endpoint: OpenAPIEndpoint, config: AxiosClientGeneratorConfig): string[] {
    const params: string[] = [];

    if (!config.includeTypeScript) {
      return params;
    }

    // Path parameters
    const pathParams = endpoint.parameters?.filter((p) => p.in === 'path') || [];
    for (const param of pathParams) {
      const paramType = this.openAPITypeToTypeScript(param.name, param.schema, {} as OpenAPIDocument);
      params.push(`${param.name}: ${paramType}`);
    }

    // Query parameters
    const queryParams = endpoint.parameters?.filter((p) => p.in === 'query') || [];
    for (const param of queryParams) {
      const paramType = this.openAPITypeToTypeScript(param.name, param.schema, {} as OpenAPIDocument);
      const optional = param.required ? '' : '?';
      params.push(`${param.name}${optional}: ${paramType}`);
    }

    // Request body
    if (endpoint.requestBody) {
      params.push(`body: any`);
    }

    return params;
  }

  /**
   * Get method return type
   */
  private getMethodReturnType(endpoint: OpenAPIEndpoint, config: AxiosClientGeneratorConfig): string {
    if (!config.includeTypeScript) {
      return 'any';
    }

    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    if (successResponse?.content) {
      const contentTypes = Object.keys(successResponse.content);
      const mainContentType = contentTypes[0] || 'application/json';
      const responseSchema = successResponse.content[mainContentType]?.schema;

      if (responseSchema) {
        return this.openAPITypeToTypeScript('Response', responseSchema, {} as OpenAPIDocument);
      }
    }

    return endpoint.method === 'delete' ? 'void' : 'any';
  }

  /**
   * Generate interceptors code
   */
  private generateInterceptorsCode(
    openApiDoc: OpenAPIDocument,
    config: AxiosClientGeneratorConfig,
  ): string {
    let code = `// Axios interceptors for ${openApiDoc.info.title}\n\n`;
    code += `import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';\n\n`;

    if (config.includeTypeScript) {
      code += `export interface InterceptorConfig {\n`;
      code += `  includeErrorHandling?: boolean;\n`;
      code += `  includeAuth?: boolean;\n`;
      code += `  includeLogging?: boolean;\n`;
      code += `  authHeaderName?: string;\n`;
      code += `  getAuthToken?: () => string | Promise<string>;\n`;
      code += `}\n\n`;
    }

    // Setup function
    code += `/**\n`;
    code += ` * Setup axios interceptors\n`;
    code += ` */\n`;
    code += `export function setupInterceptors(\n`;
    code += `  axiosInstance: AxiosInstance,\n`;
    code += `  config${config.includeTypeScript ? `?: InterceptorConfig` : ''} = {}\n`;
    code += `): void {\n`;
    code += `  const {\n`;
    code += `    includeErrorHandling = true,\n`;
    code += `    includeAuth = ${this.hasAuthentication(openApiDoc)},\n`;
    code += `    includeLogging = true,\n`;
    code += `    authHeaderName = 'Authorization',\n`;
    code += `  } = config || {};\n\n`;

    // Request interceptor
    code += `  // Request interceptor\n`;
    code += `  axiosInstance.interceptors.request.use(\n`;
    code += `    (config) => {\n`;

    // Logging
    code += `      if (includeLogging) {\n`;
    code += `        console.log(\`[API Request] \${config.method?.toUpperCase()} \${config.url}\`, config.data);\n`;
    code += `      }\n\n`;

    // Auth
    code += `      // Add authentication header\n`;
    code += `      if (includeAuth) {\n`;
    code += `        const token = typeof window !== 'undefined'\n`;
    code += `          ? localStorage.getItem('authToken')\n`;
    code += `          : null;\n`;
    code += `        if (token) {\n`;
    code += `          config.headers = config.headers || {};\n`;
    code += `          config.headers[authHeaderName] = \`Bearer \${token}\`;\n`;
    code += `        }\n`;
    code += `      }\n\n`;

    code += `      return config;\n`;
    code += `    },\n`;
    code += `    (error) => {\n`;
    code += `      return Promise.reject(error);\n`;
    code += `    }\n`;
    code += `  );\n\n`;

    // Response interceptor
    code += `  // Response interceptor\n`;
    code += `  axiosInstance.interceptors.response.use(\n`;
    code += `    (response) => {\n`;
    code += `      if (includeLogging) {\n`;
    code += `        console.log(\`[API Response] \${response.config.url}\`, response.status, response.data);\n`;
    code += `      }\n`;
    code += `      return response;\n`;
    code += `    },\n\n`;

    // Error handling
    if (config.includeErrorHandling) {
      code += `    // Error handler\n`;
      code += `    async (error: AxiosError) => {\n`;
      code += `      if (includeLogging) {\n`;
      code += `        console.error('[API Error]', error.response?.data, error.response?.status);\n`;
      code += `      }\n\n`;

      code += `      // Handle specific error codes\n`;
      code += `      if (error.response?.status === 401) {\n`;
      code += `        // Unauthorized - redirect to login or refresh token\n`;
      code += `        if (typeof window !== 'undefined') {\n`;
      code += `          window.location.href = '/login';\n`;
      code += `        }\n`;
      code += `      }\n\n`;

      code += `      if (error.response?.status === 403) {\n`;
      code += `        // Forbidden - show error message\n`;
      code += `        console.error('Access forbidden');\n`;
      code += `      }\n\n`;

      code += `      if (error.response?.status === 500) {\n`;
      code += `        // Server error - show user-friendly message\n`;
      code += `        console.error('Server error occurred');\n`;
      code += `      }\n\n`;

      if (config.includeRetryLogic) {
        code += `      // Retry logic for network errors\n`;
        code += `      if (!error.response && error.config) {\n`;
        code += `        const retryConfig = error.config as any;\n`;
        code += `        retryConfig.retryCount = retryConfig.retryCount || 0;\n`;
        code += `        if (retryConfig.retryCount < 3) {\n`;
        code += `          retryConfig.retryCount++;\n`;
        code += `          return axiosInstance.request(retryConfig);\n`;
        code += `        }\n`;
        code += `      }\n\n`;
      }

      code += `      return Promise.reject(error);\n`;
      code += `    }\n`;
    } else {
      code += `    (error) => {\n`;
      code += `      return Promise.reject(error);\n`;
      code += `    }\n`;
    }

    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generate transformers code
   */
  private generateTransformersCode(config: AxiosClientGeneratorConfig): string {
    let code = `// Axios request/response transformers\n\n`;

    if (config.includeTypeScript) {
      code += `export type RequestTransformer = (data: any, headers?: any) => any;\n`;
      code += `export type ResponseTransformer = (data: any, headers?: any) => any;\n\n`;
    }

    // Request transformer
    code += `/**\n`;
    code += ` * Transform request data before sending\n`;
    code += ` */\n`;
    code += `export const requestTransformer`;
    if (config.includeTypeScript) {
      code += `: RequestTransformer`;
    }
    code += ` = (data, headers) => {\n`;
    code += `  // Convert dates to ISO strings\n`;
    code += `  const serializedData = JSON.stringify(data, (key, value) => {\n`;
    code += `    if (value instanceof Date) {\n`;
    code += `      return value.toISOString();\n`;
    code += `    }\n`;
    code += `    return value;\n`;
    code += `  });\n\n`;
    code += `  return serializedData;\n`;
    code += `};\n\n`;

    // Response transformer
    code += `/**\n`;
    code += ` * Transform response data after receiving\n`;
    code += ` */\n`;
    code += `export const responseTransformer`;
    if (config.includeTypeScript) {
      code += `: ResponseTransformer`;
    }
    code += ` = (data, headers) => {\n`;
    code += `  // Parse JSON dates\n`;
    code += `  if (typeof data === 'string') {\n`;
    code += `    try {\n`;
    code += `      const parsed = JSON.parse(data, (key, value) => {\n`;
    code += `        // Check if value is an ISO date string\n`;
    code += `        if (typeof value === 'string' && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(value)) {\n`;
    code += `          const date = new Date(value);\n`;
    code += `          if (!isNaN(date.getTime())) {\n`;
    code += `            return date;\n`;
    code += `          }\n`;
    code += `        }\n`;
    code += `        return value;\n`;
    code += `      });\n`;
    code += `      return parsed;\n`;
    code += `    } catch {\n`;
    code += `      return data;\n`;
    code += `    }\n`;
    code += `  }\n\n`;
    code += `  return data;\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generate React Query hooks
   */
  private generateReactQueryHooks(
    endpoints: OpenAPIEndpoint[],
    config: AxiosClientGeneratorConfig,
  ): string {
    let code = `// React Query hooks for auto-generated API client\n\n`;
    code += `import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';\n`;
    code += `import { apiClient } from './client';\n`;
    code += `import { ApiResponse, ApiError } from './types';\n\n`;

    // Generate hooks for GET endpoints (queries)
    const getEndpoints = endpoints.filter((e) => e.method === 'get');
    if (getEndpoints.length > 0) {
      code += `// Query hooks\n`;
      for (const endpoint of getEndpoints) {
        const operationName = endpoint.operationId || this.generateOperationId(endpoint.path, endpoint.method);
        const hookName = `use${this.capitalize(this.toCamelCase(operationName))}`;

        code += `/**\n`;
        code += ` * Hook for ${endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`}\n`;
        code += ` */\n`;
        code += `export function ${hookName}(\n`;
        code += `  params`;
        if (config.includeTypeScript) {
          const queryParams = endpoint.parameters?.filter((p) => p.in === 'query') || [];
          if (queryParams.length > 0) {
            const paramTypes = queryParams
              .map((p) => {
                const paramType = this.openAPITypeToTypeScript(p.name, p.schema, {} as OpenAPIDocument);
                return `${p.name}${p.required ? '' : '?'}: ${paramType}`;
              })
              .join(', ');
            code += `: { ${paramTypes} }, `;
          }
          code += `options?: Omit<UseQueryOptions<unknown, ApiError, ${this.getMethodReturnType(endpoint, config)}>, 'queryKey' | 'queryFn'>`;
        }
        code += `\n`;
        code += `) {\n`;
        code += `  return useQuery({\n`;
        code += `    queryKey: ['${operationName}', params],\n`;
        code += `    queryFn: () => apiClient.${this.toCamelCase(operationName)}(params),\n`;
        code += `    ...options,\n`;
        code += `  });\n`;
        code += `}\n\n`;
      }
    }

    // Generate hooks for POST/PUT/PATCH/DELETE endpoints (mutations)
    const mutationEndpoints = endpoints.filter(
      (e) => ['post', 'put', 'patch', 'delete'].includes(e.method),
    );
    if (mutationEndpoints.length > 0) {
      code += `// Mutation hooks\n`;
      for (const endpoint of mutationEndpoints) {
        const operationName = endpoint.operationId || this.generateOperationId(endpoint.path, endpoint.method);
        const hookName = `use${this.capitalize(this.toCamelCase(operationName))}Mutation`;

        code += `/**\n`;
        code += ` * Hook for ${endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`}\n`;
        code += ` */\n`;
        code += `export function ${hookName}(\n`;
        code += `  options`;
        if (config.includeTypeScript) {
          code += `?: UseMutationOptions<${this.getMethodReturnType(endpoint, config)}, ApiError, any>`;
        }
        code += `\n`;
        code += `) {\n`;
        code += `  const queryClient = useQueryClient();\n\n`;
        code += `  return useMutation({\n`;
        code += `    mutationFn: (data) => apiClient.${this.toCamelCase(operationName)}(data),\n`;
        code += `    onSuccess: (data, variables, context) => {\n`;
        code += `      options?.onSuccess?.(data, variables, context);\n`;
        code += `      // Invalidate related queries\n`;
        code += `      queryClient.invalidateQueries({ queryKey: ['${operationName}'] });\n`;
        code += `    },\n`;
        code += `    ...options,\n`;
        code += `  });\n`;
        code += `}\n\n`;
      }
    }

    return code;
  }

  /**
   * Generate operation ID from path and method
   */
  private generateOperationId(path: string, method: string): string {
    const cleanPath = path
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/:/g, '')
      .replace(/\{([^}]+)\}/g, '$1');
    return `${method}-${cleanPath}`.replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  }

  /**
   * Capitalize a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get output file path
   */
  private getOutputFilePath(workspacePath: string, outputDir: string, config: AxiosClientGeneratorConfig): string {
    const dir = path.join(workspacePath, outputDir, 'api-client');
    const ext = config.includeTypeScript ? 'ts' : 'js';
    return path.join(dir, `index.${ext}`);
  }

  /**
   * Create the Axios client files at the specified path
   */
  public async createAxiosClientFiles(
    outputDir: string,
    files: { name: string; content: string }[],
  ): Promise<void> {
    const dirUri = vscode.Uri.file(outputDir);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      await vscode.workspace.fs.createDirectory(dirUri);
    }

    // Write each file
    for (const file of files) {
      const fileUri = vscode.Uri.file(path.join(outputDir, file.name));
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(file.content, 'utf-8'));
      this.logger.info('Axios client file created', { filePath: fileUri.fsPath });
    }
  }
}
