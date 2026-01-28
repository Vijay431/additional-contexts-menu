import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface GraphQLMiddlewareConfig {
  enabled: boolean;
  middlewarePath: string;
  includeAuthMiddleware: boolean;
  includeLoggingMiddleware: boolean;
  includeErrorHandling: boolean;
  includeRateLimiting: boolean;
  includeTypeScript: boolean;
  defaultMiddlewareName: string;
  enableFieldLevel: boolean;
  enableOperationLevel: boolean;
}

export interface GraphQLMiddlewareType {
  name: string;
  type: 'auth' | 'logging' | 'error-handling' | 'rate-limiting' | 'custom';
  scope: 'field' | 'operation' | 'global';
  description?: string;
}

export interface GraphQLMiddlewareField {
  name: string;
  appliesTo: 'query' | 'mutation' | 'subscription' | 'all';
  filterType: 'whitelist' | 'blacklist' | 'all' | 'none';
  fields: string[];
}

export interface GeneratedMiddleware {
  name: string;
  middlewareCode: string;
  types: GraphQLMiddlewareType[];
  imports: string[];
  config: GraphQLMiddlewareConfig;
}

/**
 * Service for generating GraphQL middleware for authentication, logging,
 * error handling, and rate limiting with field-level and operation-level filtering
 */
export class GraphQLMiddlewareGeneratorService {
  private static instance: GraphQLMiddlewareGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): GraphQLMiddlewareGeneratorService {
    GraphQLMiddlewareGeneratorService.instance ??= new GraphQLMiddlewareGeneratorService();
    return GraphQLMiddlewareGeneratorService.instance;
  }

  /**
   * Generates GraphQL middleware based on user input
   */
  public async generateMiddleware(
    _workspacePath: string,
    config: GraphQLMiddlewareConfig,
  ): Promise<GeneratedMiddleware | null> {
    // Collect middleware types
    const middlewareTypes = await this.collectMiddlewareTypes(config);

    if (!middlewareTypes || middlewareTypes.length === 0) {
      vscode.window.showWarningMessage('No middleware types defined. Generation cancelled.');
      return null;
    }

    // Collect field filters if field-level is enabled
    const fieldFilters = config.enableFieldLevel ? await this.collectFieldFilters() : [];

    // Generate imports
    const imports = this.generateImports(middlewareTypes, config);

    // Generate middleware code
    const middlewareCode = this.generateMiddlewareCode(
      middlewareTypes,
      fieldFilters,
      imports,
      config,
    );

    const middlewareName = await this.getMiddlewareName(config);
    if (!middlewareName) {
      return null;
    }

    this.logger.info('GraphQL middleware generated', {
      name: middlewareName,
      types: middlewareTypes.length,
      fieldFilters: fieldFilters.length,
    });

    return {
      name: middlewareName,
      middlewareCode,
      types: middlewareTypes,
      imports,
      config,
    };
  }

  /**
   * Collects middleware types from user
   */
  private async collectMiddlewareTypes(
    _config: GraphQLMiddlewareConfig,
  ): Promise<GraphQLMiddlewareType[] | null> {
    const types: GraphQLMiddlewareType[] = [];

    const availableTypes = [
      {
        label: 'Authentication',
        value: 'auth',
        description: 'Verify user身份 before resolving',
      },
      {
        label: 'Logging',
        value: 'logging',
        description: 'Log requests and responses',
      },
      {
        label: 'Error Handling',
        value: 'error-handling',
        description: 'Catch and format errors',
      },
      {
        label: 'Rate Limiting',
        value: 'rate-limiting',
        description: 'Limit request frequency',
      },
    ];

    const selected = await vscode.window.showQuickPick(availableTypes, {
      placeHolder: 'Select middleware types to generate',
      canPickMany: true,
      title: 'GraphQL Middleware Generator',
    });

    if (!selected || selected.length === 0) {
      return null;
    }

    for (const item of selected) {
      const scope = await this.getMiddlewareScope(item.label);
      const description = await this.getMiddlewareDescription(item.label);

      types.push({
        name: item.label,
        type: item.value as GraphQLMiddlewareType['type'],
        scope: scope || 'global',
        description: description || `${item.label} middleware`,
      });
    }

    // Ask if user wants to add custom middleware
    const addCustom = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Add custom middleware?' },
    );

    if (addCustom?.value === 'yes') {
      const customName = await vscode.window.showInputBox({
        prompt: 'Enter custom middleware name',
        placeHolder: 'CustomMiddleware',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Name cannot be empty';
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
            return 'Name must start with uppercase letter and contain only letters and numbers';
          }
          return null;
        },
      });

      if (customName) {
        const scope = await this.getMiddlewareScope(customName);
        const description = await this.getMiddlewareDescription(customName);

        types.push({
          name: customName,
          type: 'custom',
          scope: scope || 'global',
          description: description || `Custom ${customName} middleware`,
        });
      }
    }

    return types;
  }

  /**
   * Gets middleware scope
   */
  private async getMiddlewareScope(
    middlewareName: string,
  ): Promise<GraphQLMiddlewareType['scope'] | null> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Global (applies to all operations)', value: 'global' },
        { label: 'Operation level (Query/Mutation/Subscription)', value: 'operation' },
        { label: 'Field level (specific fields)', value: 'field' },
      ],
      {
        placeHolder: `Select scope for ${middlewareName}`,
      },
    );

    return (choice?.value as GraphQLMiddlewareType['scope']) ?? null;
  }

  /**
   * Gets middleware description
   */
  private async getMiddlewareDescription(middlewareName: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter description for ${middlewareName} (optional)`,
      placeHolder: `${middlewareName} middleware for GraphQL`,
    });

    return input?.trim() || undefined;
  }

  /**
   * Collects field filters for field-level middleware
   */
  private async collectFieldFilters(): Promise<GraphQLMiddlewareField[]> {
    const filters: GraphQLMiddlewareField[] = [];

    let addMore = true;
    while (addMore) {
      const filter = await this.createFieldFilter();
      if (filter) {
        filters.push(filter);
      }

      if (filters.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another filter', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another filter or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return filters;
  }

  /**
   * Creates a single field filter
   */
  private async createFieldFilter(): Promise<GraphQLMiddlewareField | null> {
    const appliesTo = await vscode.window.showQuickPick(
      [
        { label: 'Queries', value: 'query' },
        { label: 'Mutations', value: 'mutation' },
        { label: 'Subscriptions', value: 'subscription' },
        { label: 'All operations', value: 'all' },
      ],
      { placeHolder: 'Select operation type to filter' },
    );

    if (!appliesTo) {
      return null;
    }

    const filterType = await vscode.window.showQuickPick(
      [
        { label: 'Whitelist (only specified fields)', value: 'whitelist' },
        { label: 'Blacklist (exclude specified fields)', value: 'blacklist' },
        { label: 'All fields', value: 'all' },
        { label: 'No fields', value: 'none' },
      ],
      { placeHolder: 'Select filter type' },
    );

    if (!filterType) {
      return null;
    }

    let fields: string[] = [];
    if (filterType.value === 'whitelist' || filterType.value === 'blacklist') {
      const fieldsInput = await vscode.window.showInputBox({
        prompt: 'Enter field names (comma-separated)',
        placeHolder: 'user, users, posts',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Field names cannot be empty';
          }
          return null;
        },
      });

      if (fieldsInput) {
        fields = fieldsInput.split(',').map((f) => f.trim());
      }
    }

    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter filter name',
      placeHolder: `${filterType.value}-${appliesTo.value}`,
    });

    return {
      name: nameInput?.trim() || `${filterType.value}-${appliesTo.value}`,
      appliesTo: appliesTo.value as GraphQLMiddlewareField['appliesTo'],
      filterType: filterType.value as GraphQLMiddlewareField['filterType'],
      fields,
    };
  }

  /**
   * Gets middleware name from user
   */
  private async getMiddlewareName(config: GraphQLMiddlewareConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter middleware name',
      placeHolder: config.defaultMiddlewareName || 'GraphQLMiddleware',
      value: config.defaultMiddlewareName || 'GraphQLMiddleware',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Middleware name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    return input?.trim();
  }

  /**
   * Generates imports based on middleware types and config
   */
  private generateImports(
    middlewareTypes: GraphQLMiddlewareType[],
    config: GraphQLMiddlewareConfig,
  ): string[] {
    const imports = new Set<string>();

    if (config.includeTypeScript) {
      imports.add('GraphQLResolveInfo');
    }

    if (config.includeAuthMiddleware) {
      imports.add('AuthenticationError');
      imports.add('ForbiddenError');
    }

    if (config.includeErrorHandling) {
      imports.add('GraphQLError');
      imports.add('ApolloError');
    }

    if (config.includeRateLimiting) {
      imports.add('rateLimit');
    }

    // Check for logging
    const hasLogging = middlewareTypes.some((t) => t.type === 'logging');
    if (hasLogging) {
      imports.add('logger');
    }

    return Array.from(imports);
  }

  /**
   * Generates the middleware code
   */
  private generateMiddlewareCode(
    middlewareTypes: GraphQLMiddlewareType[],
    fieldFilters: GraphQLMiddlewareField[],
    imports: string[],
    config: GraphQLMiddlewareConfig,
  ): string {
    let code = '';

    // Add file header
    code += `/**\n`;
    code += ` * GraphQL Middleware\n`;
    code += ` * Auto-generated by Additional Context Menus extension\n`;
    code += ` *\n`;
    code += ` * Includes:\n`;
    for (const type of middlewareTypes) {
      code += ` * - ${type.name} (${type.scope})\n`;
    }
    code += ` */\n\n`;

    // Add imports
    if (imports.length > 0) {
      code += `import {\n`;
      code += `  ${imports.join(',\n  ')}\n`;
      code += `} from '../utils';\n\n`;
    }

    // Add interfaces if TypeScript
    if (config.includeTypeScript) {
      code += this.generateTypeScriptInterfaces(middlewareTypes, config);
    }

    // Generate middleware functions for each type
    for (const middlewareType of middlewareTypes) {
      code += this.generateMiddlewareFunction(middlewareType, fieldFilters, config);
      code += '\n\n';
    }

    // Generate combined middleware
    code += this.generateCombinedMiddleware(middlewareTypes, fieldFilters, config);

    return code;
  }

  /**
   * Generates TypeScript interfaces
   */
  private generateTypeScriptInterfaces(
    _middlewareTypes: GraphQLMiddlewareType[],
    config: GraphQLMiddlewareConfig,
  ): string {
    let code = '';

    code += `interface GraphQLContext {\n`;
    code += `  user?: {\n`;
    code += `    id: string;\n`;
    code += `    role?: string;\n`;
    code += `    permissions?: string[];\n`;
    code += `  };\n`;
    code += `  request?: {\n`;
    code += `    ip?: string;\n`;
    code += `    headers?: Record<string, string>;\n`;
    code += `  };\n`;
    code += `}\n\n`;

    if (config.includeRateLimiting) {
      code += `interface RateLimitInfo {\n`;
      code += `  limit: number;\n`;
      code += `  remaining: number;\n`;
      code += `  reset: Date;\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates a middleware function
   */
  private generateMiddlewareFunction(
    middlewareType: GraphQLMiddlewareType,
    fieldFilters: GraphQLMiddlewareField[],
    config: GraphQLMiddlewareConfig,
  ): string {
    let code = '';

    const functionName = this.middlewareNameToFunctionName(middlewareType.name);

    // Add description
    if (middlewareType.description) {
      code += `/**\n`;
      code += ` * ${middlewareType.description}\n`;
      code += ` * Scope: ${middlewareType.scope}\n`;
      code += ` */\n`;
    }

    // Function signature
    code += `export async function ${functionName}(`;

    const params: string[] = [];
    if (config.includeTypeScript) {
      params.push('root: any');
      params.push('args: any');
      params.push('context: GraphQLContext');
      params.push('info: GraphQLResolveInfo');
    } else {
      params.push('root');
      params.push('args');
      params.push('context');
      params.push('info');
    }

    code += `${params.join(', ')})`;

    // Return type
    if (config.includeTypeScript) {
      code += `: Promise<any>`;
    }

    code += ` {\n`;

    // Generate function body based on type
    code += this.generateMiddlewareBody(middlewareType, fieldFilters, config);

    code += `}\n`;

    return code;
  }

  /**
   * Generates middleware function body
   */
  private generateMiddlewareBody(
    middlewareType: GraphQLMiddlewareType,
    fieldFilters: GraphQLMiddlewareField[],
    config: GraphQLMiddlewareConfig,
  ): string {
    let body = '';

    switch (middlewareType.type) {
      case 'auth':
        body = this.generateAuthMiddlewareBody(middlewareType, fieldFilters, config);
        break;
      case 'logging':
        body = this.generateLoggingMiddlewareBody(middlewareType, fieldFilters, config);
        break;
      case 'error-handling':
        body = this.generateErrorHandlingMiddlewareBody(middlewareType, fieldFilters, config);
        break;
      case 'rate-limiting':
        body = this.generateRateLimitingMiddlewareBody(middlewareType, fieldFilters, config);
        break;
      case 'custom':
        body = this.generateCustomMiddlewareBody(middlewareType, fieldFilters, config);
        break;
    }

    return body;
  }

  /**
   * Generates authentication middleware body
   */
  private generateAuthMiddlewareBody(
    middlewareType: GraphQLMiddlewareType,
    fieldFilters: GraphQLMiddlewareField[],
    _config: GraphQLMiddlewareConfig,
  ): string {
    let body = '';

    // Check if user is authenticated
    body += `  // Check authentication\n`;
    body += `  if (!context.user) {\n`;
    body += `    throw new AuthenticationError('You must be logged in to perform this action');\n`;
    body += `  }\n\n`;

    // Add field-level filtering if configured
    if (middlewareType.scope === 'field' && fieldFilters.length > 0) {
      body += `  // Field-level auth check\n`;
      body += `  const fieldName = info.fieldName;\n`;
      body += `  const operationType = info.operation.operation;\n\n`;

      for (const filter of fieldFilters) {
        body += `  // ${filter.name}\n`;
        if (filter.filterType === 'whitelist') {
          body += `  if (${filter.appliesTo === 'all' || filter.appliesTo === 'query' ? "operationType === 'query'" : filter.appliesTo === 'mutation' ? "operationType === 'mutation'" : "operationType === 'subscription'"}) {\n`;
          body += `    const allowedFields = [${filter.fields.map((f) => `'${f}'`).join(', ')}];\n`;
          body += `    if (!allowedFields.includes(fieldName)) {\n`;
          body += `      throw new ForbiddenError('You do not have permission to access this field');\n`;
          body += `    }\n`;
          body += `  }\n\n`;
        } else if (filter.filterType === 'blacklist') {
          body += `  if (${filter.appliesTo === 'all' || filter.appliesTo === 'query' ? "operationType === 'query'" : filter.appliesTo === 'mutation' ? "operationType === 'mutation'" : "operationType === 'subscription'"}) {\n`;
          body += `    const restrictedFields = [${filter.fields.map((f) => `'${f}'`).join(', ')}];\n`;
          body += `    if (restrictedFields.includes(fieldName)) {\n`;
          body += `      throw new ForbiddenError('You do not have permission to access this field');\n`;
          body += `    }\n`;
          body += `  }\n\n`;
        }
      }
    }

    // Add role-based check
    body += `  // Check roles/permissions if needed\n`;
    body += `  // if (context.user.role !== 'admin' && requiresAdmin) {\n`;
    body += `  //   throw new ForbiddenError('Admin access required');\n`;
    body += `  // }\n\n`;

    body += `  // Proceed to next middleware/resolver\n`;
    body += `  return true;\n`;

    return body;
  }

  /**
   * Generates logging middleware body
   */
  private generateLoggingMiddlewareBody(
    middlewareType: GraphQLMiddlewareType,
    fieldFilters: GraphQLMiddlewareField[],
    _config: GraphQLMiddlewareConfig,
  ): string {
    let body = '';

    body += `  // Log incoming request\n`;
    body += `  const startTime = Date.now();\n`;
    body += `  const operationType = info.operation.operation;\n`;
    body += `  const fieldName = info.fieldName;\n\n`;

    body += `  logger.info({\n`;
    body += `    type: 'graphql-request',\n`;
    body += `    operation: operationType,\n`;
    body += `    field: fieldName,\n`;
    body += `    args: JSON.stringify(args),\n`;
    body += `    userId: context.user?.id,\n`;
    body += `  }, 'GraphQL request received');\n\n`;

    // Add field-level filtering
    if (middlewareType.scope === 'field' && fieldFilters.length > 0) {
      body += `  // Apply field-level logging filters\n`;
      body += `  const shouldLog = ${this.generateFieldFilterCondition(fieldFilters)};\n\n`;
      body += `  if (shouldLog) {\n`;
      body += `    logger.debug({\n`;
      body += `      field: fieldName,\n`;
      body += `      args,\n`;
      body += `    }, 'Field-level details');\n`;
      body += `  }\n\n`;
    }

    body += `  try {\n`;
    body += `    // Proceed to next middleware/resolver\n`;
    body += `    const result = await true;\n\n`;

    body += `    // Log successful response\n`;
    body += `    const duration = Date.now() - startTime;\n`;
    body += `    logger.info({\n`;
    body += `      type: 'graphql-response',\n`;
    body += `      operation: operationType,\n`;
    body += `      field: fieldName,\n`;
    body += `      duration,\n`;
    body += `      success: true,\n`;
    body += `    }, 'GraphQL request completed');\n\n`;

    body += `    return result;\n`;
    body += `  } catch (error) {\n`;
    body += `    // Log error\n`;
    body += `    const duration = Date.now() - startTime;\n`;
    body += `    logger.error({\n`;
    body += `      type: 'graphql-error',\n`;
    body += `      operation: operationType,\n`;
    body += `      field: fieldName,\n`;
    body += `      duration,\n`;
    body += `      error: error instanceof Error ? error.message : 'Unknown error',\n`;
    body += `    }, 'GraphQL request failed');\n\n`;

    body += `    throw error;\n`;
    body += `  }\n`;

    return body;
  }

  /**
   * Generates error handling middleware body
   */
  private generateErrorHandlingMiddlewareBody(
    _middlewareType: GraphQLMiddlewareType,
    _fieldFilters: GraphQLMiddlewareField[],
    _config: GraphQLMiddlewareConfig,
  ): string {
    let body = '';

    body += `  try {\n`;
    body += `    // Proceed to next middleware/resolver\n`;
    body += `    return await true;\n`;
    body += `  } catch (error) {\n`;
    body += `    // Handle different error types\n`;
    body += `    if (error instanceof ApolloError) {\n`;
    body += `      // Already formatted ApolloError\n`;
    body += `      throw error;\n`;
    body += `    }\n\n`;

    body += `    if (error instanceof Error) {\n`;
    body += `      // Wrap in ApolloError with appropriate code\n`;
    body += `      throw new ApolloError(error.message, 'INTERNAL_SERVER_ERROR', {\n`;
    body += `        originalError: error.name,\n`;
    body += `      });\n`;
    body += `    }\n\n`;

    body += `    // Unknown error type\n`;
    body += `    throw new GraphQLError('An unknown error occurred');\n`;
    body += `  }\n`;

    return body;
  }

  /**
   * Generates rate limiting middleware body
   */
  private generateRateLimitingMiddlewareBody(
    middlewareType: GraphQLMiddlewareType,
    fieldFilters: GraphQLMiddlewareField[],
    _config: GraphQLMiddlewareConfig,
  ): string {
    let body = '';

    body += `  // Implement rate limiting logic\n`;
    body += `  // This is a placeholder - integrate with your rate limiting service\n`;
    body += `  const userId = context.user?.id || context.request?.ip || 'anonymous';\n`;
    body += `  const fieldName = info.fieldName;\n\n`;

    body += `  // Check rate limit\n`;
    body += `  // const limit = await rateLimitChecker.check(userId, fieldName);\n\n`;

    // Add field-level filtering
    if (middlewareType.scope === 'field' && fieldFilters.length > 0) {
      body += `  // Apply field-specific rate limits\n`;
      body += `  const shouldRateLimit = ${this.generateFieldFilterCondition(fieldFilters)};\n\n`;
      body += `  if (shouldRateLimit) {\n`;
      body += `    // Check if rate limit exceeded\n`;
      body += `    // if (limit.remaining <= 0) {\n`;
      body += `    //   throw new ApolloError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', {\n`;
      body += `    //     retryAfter: Math.ceil((limit.reset.getTime() - Date.now()) / 1000),\n`;
      body += `    //   });\n`;
      body += `    // }\n`;
      body += `  }\n\n`;
    }

    body += `  // Proceed to next middleware/resolver\n`;
    body += `  return true;\n`;

    return body;
  }

  /**
   * Generates custom middleware body
   */
  private generateCustomMiddlewareBody(
    middlewareType: GraphQLMiddlewareType,
    fieldFilters: GraphQLMiddlewareField[],
    _config: GraphQLMiddlewareConfig,
  ): string {
    let body = '';

    body += `  // Custom middleware: ${middlewareType.name}\n`;
    body += `  // TODO: Implement your custom logic here\n\n`;

    if (middlewareType.scope === 'field' && fieldFilters.length > 0) {
      body += `  // Field-level filtering\n`;
      body += `  const fieldName = info.fieldName;\n`;
      body += `  const shouldApply = ${this.generateFieldFilterCondition(fieldFilters)};\n\n`;
      body += `  if (shouldApply) {\n`;
      body += `    // Apply custom logic to specified fields\n`;
      body += `    console.log('Applying ${middlewareType.name} to field:', fieldName);\n`;
      body += `  }\n\n`;
    }

    body += `  // Proceed to next middleware/resolver\n`;
    body += `  return true;\n`;

    return body;
  }

  /**
   * Generates field filter condition
   */
  private generateFieldFilterCondition(fieldFilters: GraphQLMiddlewareField[]): string {
    const conditions: string[] = [];

    for (const filter of fieldFilters) {
      if (filter.filterType === 'whitelist') {
        conditions.push(
          `[${filter.fields.map((f) => `'${f}'`).join(', ')}].includes(fieldName)`,
        );
      } else if (filter.filterType === 'blacklist') {
        conditions.push(
          `![${filter.fields.map((f) => `'${f}'`).join(', ')}].includes(fieldName)`,
        );
      } else if (filter.filterType === 'all') {
        conditions.push('true');
      } else if (filter.filterType === 'none') {
        conditions.push('false');
      }
    }

    return conditions.length > 0 ? conditions.join(' || ') : 'true';
  }

  /**
   * Generates combined middleware function
   */
  private generateCombinedMiddleware(
    middlewareTypes: GraphQLMiddlewareType[],
    _fieldFilters: GraphQLMiddlewareField[],
    config: GraphQLMiddlewareConfig,
  ): string {
    let code = '';

    code += `/**\n`;
    code += ` * Combined middleware function that applies all middleware in sequence\n`;
    code += ` */\n`;
    code += `export function applyMiddleware(`;

    if (config.includeTypeScript) {
      code += `...middleware: Array<(root: any, args: any, context: GraphQLContext, info: GraphQLResolveInfo) => Promise<any>>\n`;
    } else {
      code += `...middleware: Array<Function>\n`;
    }

    code += `) {\n`;
    code += `  return async (\n`;
    code += `    root: any,\n`;
    code += `    args: any,\n`;
    code += `    context: any,\n`;
    code += `    info: any,\n`;
    code += `  ) => {\n`;
    code += `    // Apply middleware in sequence\n`;
    code += `    for (const mw of middleware) {\n`;
    code += `      await mw(root, args, context, info);\n`;
    code += `    }\n`;
    code += `    \n`;
    code += `    // All middleware passed, proceed to resolver\n`;
    code += `    return true;\n`;
    code += `  };\n`;
    code += `}\n\n`;

    // Export middleware composition
    code += `/**\n`;
    code += ` * Default middleware composition\n`;
    code += ` */\n`;
    code += `export const defaultMiddleware = applyMiddleware(\n`;
    for (const type of middlewareTypes) {
      const fnName = this.middlewareNameToFunctionName(type.name);
      code += `  ${fnName},\n`;
    }
    code += `);\n`;

    return code;
  }

  /**
   * Converts middleware name to function name
   */
  private middlewareNameToFunctionName(name: string): string {
    // Remove spaces and convert to camelCase
    return (
      name
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .map((word, index) => {
          if (index === 0) {
            return word.toLowerCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('') + 'Middleware'
    );
  }

  /**
   * Creates the middleware file at the specified path
   */
  public async createMiddlewareFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write middleware file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Middleware file created', { filePath });
  }
}
