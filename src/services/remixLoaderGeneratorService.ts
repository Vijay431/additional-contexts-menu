import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface RemixLoaderGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeCaching: boolean;
  includeValidation: boolean;
  databaseType: 'none' | 'prisma' | 'drizzle' | 'raw-sql' | 'mongodb';
  cachingStrategy: 'none' | 'memory' | 'redis' | 'vercel-kv' | 'cloudflare-kv';
  defaultLoaderPath: string;
  exportType: 'named' | 'default';
}

export interface RemixLoaderParam {
  name: string;
  type: 'url' | 'query' | 'param' | 'cookie' | 'header';
  dataType: string;
  required: boolean;
  description?: string;
  validationRule?: {
    type: 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
    value?: string | number;
    message?: string;
  };
}

export interface RemixLoaderDatabaseQuery {
  operation: 'findMany' | 'findFirst' | 'findUnique' | 'create' | 'update' | 'delete' | 'count' | 'aggregate' | 'custom';
  tableName?: string;
  modelName?: string;
  includeWhere?: boolean;
  includeOrderBy?: boolean;
  includePagination?: boolean;
  includeRelations?: boolean;
  customQuery?: string;
  queryDescription?: string;
}

export interface RemixLoaderCachingConfig {
  enabled: boolean;
  strategy: 'memory' | 'redis' | 'vercel-kv' | 'cloudflare-kv';
  ttl?: number;
  staleWhileRevalidate?: boolean;
  cacheKey?: string;
  cacheTags?: string[];
}

export interface RemixLoaderValidationConfig {
  enabled: boolean;
  validateParams?: boolean;
  validateResponse?: boolean;
  validationLibrary?: 'zod' | 'yup' | 'custom' | 'none';
}

export interface GeneratedRemixLoader {
  name: string;
  description?: string;
  params: RemixLoaderParam[];
  returnType: string;
  databaseQuery?: RemixLoaderDatabaseQuery;
  caching?: RemixLoaderCachingConfig;
  validation?: RemixLoaderValidationConfig;
  includeErrorHandling: boolean;
  imports: string[];
  loaderCode: string;
  exampleUsage?: string;
}

/**
 * Service for generating Remix loaders with TypeScript typing,
 * database queries, caching, validation, and error handling.
 * Creates loaders with proper caching, validation, and resource formatting.
 */
export class RemixLoaderGeneratorService {
  private static instance: RemixLoaderGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RemixLoaderGeneratorService {
    RemixLoaderGeneratorService.instance ??= new RemixLoaderGeneratorService();
    return RemixLoaderGeneratorService.instance;
  }

  /**
   * Generates a Remix loader based on user input
   */
  public async generateLoader(
    config: RemixLoaderGeneratorConfig,
  ): Promise<GeneratedRemixLoader | null> {
    // Get loader name
    const loaderName = await this.getLoaderName();
    if (!loaderName) {
      return null;
    }

    // Get loader description
    const description = await this.getLoaderDescription();

    // Collect parameters
    const params = await this.collectLoaderParams();

    // Get return type
    const returnType = await this.getReturnType(loaderName);

    // Collect database query configuration
    const databaseQuery = await this.collectDatabaseQuery(config);

    // Collect caching configuration
    const caching = await this.collectCachingConfig(config);

    // Collect validation configuration
    const validation = await this.collectValidationConfig(config);

    // Generate imports based on configuration
    const imports = this.generateImports({
      params,
      databaseQuery,
      caching,
      validation,
      config,
    });

    // Generate loader code
    const loaderCode = this.generateLoaderCode(
      loaderName,
      {
        description,
        params,
        returnType,
        databaseQuery,
        caching,
        validation,
        includeErrorHandling: config.includeErrorHandling,
      },
      imports,
      config,
    );

    // Generate example usage
    const exampleUsage = this.generateExampleUsage(loaderName, params);

    this.logger.info('Remix loader generated', {
      name: loaderName,
      hasDatabaseQuery: !!databaseQuery,
      hasCaching: !!caching?.enabled,
      hasValidation: !!validation?.enabled,
    });

    return {
      name: loaderName,
      description: description || undefined,
      params,
      returnType,
      databaseQuery,
      caching,
      validation,
      includeErrorHandling: config.includeErrorHandling,
      imports,
      loaderCode,
      exampleUsage,
    };
  }

  /**
   * Prompts user for loader name
   */
  private async getLoaderName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter loader name (e.g., getUser, getPosts, loadDashboard)',
      placeHolder: 'loader',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Loader name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Loader name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Gets loader description
   */
  private async getLoaderDescription(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter loader description (optional)',
      placeHolder: 'Loads data for this route',
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects loader parameters
   */
  private async collectLoaderParams(): Promise<RemixLoaderParam[]> {
    const params: RemixLoaderParam[] = [];

    let addMore = true;
    while (addMore) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add URL parameter', value: 'url' },
          { label: 'Add query parameter', value: 'query' },
          { label: 'Add route parameter', value: 'param' },
          { label: 'Add cookie', value: 'cookie' },
          { label: 'Add header', value: 'header' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add loader parameters' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const param = await this.createLoaderParam(addParam.value as RemixLoaderParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single loader parameter
   */
  private async createLoaderParam(type: RemixLoaderParam['type']): Promise<RemixLoaderParam | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${type} parameter name`,
      placeHolder: type === 'param' ? 'id' : type,
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
      ['string', 'number', 'boolean', 'any', 'string[]', 'number[]'],
      { placeHolder: 'Select data type' },
    );

    const dataType = dataTypeInput || 'any';

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

    // Ask about validation
    const includeValidation = await vscode.window.showQuickPick(
      [
        { label: 'Yes, add validation', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Add validation for this parameter?' },
    );

    let validationRule: RemixLoaderParam['validationRule'] | undefined;
    if (includeValidation?.value === 'yes') {
      const validationType = await vscode.window.showQuickPick<
        Required<{ label: string; value: RemixLoaderParam['validationRule']['type'] }>
      >(
        [
          { label: 'Minimum value/length', value: 'min' },
          { label: 'Maximum value/length', value: 'max' },
          { label: 'Pattern match', value: 'pattern' },
          { label: 'Email format', value: 'email' },
          { label: 'URL format', value: 'url' },
          { label: 'Custom validation', value: 'custom' },
        ],
        { placeHolder: 'Select validation type' },
      );

      if (validationType) {
        let value: string | number | undefined;
        let message: string | undefined;

        if (validationType.value !== 'email' && validationType.value !== 'url') {
          const valueInput = await vscode.window.showInputBox({
            prompt: `Enter ${validationType.label.toLowerCase()} value`,
            placeHolder: validationType.value === 'pattern' ? '^[a-z]+$' : '10',
          });

          if (valueInput) {
            value = validationType.value === 'pattern' ? valueInput : Number.parseInt(valueInput, 10);
          }

          const messageInput = await vscode.window.showInputBox({
            prompt: 'Enter error message (optional)',
            placeHolder: 'Validation failed',
          });

          message = messageInput || undefined;
        }

        validationRule = {
          type: validationType.value,
          value,
          message,
        };
      }
    }

    return {
      name: nameInput.trim(),
      type,
      dataType,
      required,
      description: descriptionInput?.trim(),
      validationRule,
    };
  }

  /**
   * Gets the return type for the loader
   */
  private async getReturnType(loaderName: string): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter loader return type',
      placeHolder: `${loaderName}Data`,
      value: `${loaderName}Data`,
    });

    return input?.trim() || 'any';
  }

  /**
   * Collects database query configuration
   */
  private async collectDatabaseQuery(
    config: RemixLoaderGeneratorConfig,
  ): Promise<RemixLoaderDatabaseQuery | undefined> {
    if (config.databaseType === 'none') {
      return undefined;
    }

    const includeQuery = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include database query', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include database query in loader?' },
    );

    if (!includeQuery || includeQuery.value === 'no') {
      return undefined;
    }

    // Get operation type
    const operationChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: RemixLoaderDatabaseQuery['operation'] }>
    >(
      [
        { label: 'Find Many (list)', value: 'findMany' },
        { label: 'Find First (single)', value: 'findFirst' },
        { label: 'Find Unique (by ID)', value: 'findUnique' },
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Count', value: 'count' },
        { label: 'Aggregate', value: 'aggregate' },
        { label: 'Custom Query', value: 'custom' },
      ],
      { placeHolder: 'Select database operation' },
    );

    if (!operationChoice) {
      return undefined;
    }

    const operation = operationChoice.value;

    let tableName: string | undefined;
    let modelName: string | undefined;
    let customQuery: string | undefined;

    if (operation === 'custom') {
      const customQueryInput = await vscode.window.showInputBox({
        prompt: 'Enter custom SQL query',
        placeHolder: 'SELECT * FROM users WHERE id = $1',
      });
      customQuery = customQueryInput || undefined;
    } else {
      if (config.databaseType === 'prisma' || config.databaseType === 'drizzle') {
        const modelNameInput = await vscode.window.showInputBox({
          prompt: 'Enter model name',
          placeHolder: 'User',
        });
        modelName = modelNameInput || undefined;
      } else {
        const tableNameInput = await vscode.window.showInputBox({
          prompt: 'Enter table name',
          placeHolder: 'users',
        });
        tableName = tableNameInput || undefined;
      }
    }

    // Ask about additional features
    const features = await this.collectQueryFeatures(operation, config);

    return {
      operation,
      tableName,
      modelName,
      ...features,
    };
  }

  /**
   * Collects query features
   */
  private async collectQueryFeatures(
    operation: RemixLoaderDatabaseQuery['operation'],
    config: RemixLoaderGeneratorConfig,
  ): Promise<{
    includeWhere?: boolean;
    includeOrderBy?: boolean;
    includePagination?: boolean;
    includeRelations?: boolean;
    queryDescription?: string;
  }> {
    const features: {
      includeWhere?: boolean;
      includeOrderBy?: boolean;
      includePagination?: boolean;
      includeRelations?: boolean;
      queryDescription?: string;
    } = {};

    if (
      operation === 'findMany' ||
      operation === 'findFirst' ||
      operation === 'findUnique' ||
      operation === 'update' ||
      operation === 'delete'
    ) {
      const includeWhere = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include where/filter conditions?' },
      );
      features.includeWhere = includeWhere?.value === 'yes';
    }

    if (operation === 'findMany') {
      const includeOrderBy = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include order by?' },
      );
      features.includeOrderBy = includeOrderBy?.value === 'yes';

      const includePagination = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include pagination?' },
      );
      features.includePagination = includePagination?.value === 'yes';
    }

    if (
      config.databaseType === 'prisma' ||
      config.databaseType === 'drizzle' ||
      config.databaseType === 'mongodb'
    ) {
      const includeRelations = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include relations?' },
      );
      features.includeRelations = includeRelations?.value === 'yes';
    }

    return features;
  }

  /**
   * Collects caching configuration
   */
  private async collectCachingConfig(
    config: RemixLoaderGeneratorConfig,
  ): Promise<RemixLoaderCachingConfig | undefined> {
    if (config.cachingStrategy === 'none') {
      return undefined;
    }

    const includeCaching = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include caching', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include caching in loader?' },
    );

    if (!includeCaching || includeCaching.value === 'no') {
      return undefined;
    }

    const ttlInput = await vscode.window.showInputBox({
      prompt: 'Enter cache TTL in seconds',
      placeHolder: '3600',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'TTL must be a positive number';
        }
        return null;
      },
    });

    const ttl = ttlInput ? Number.parseInt(ttlInput, 10) : 3600;

    const staleWhileRevalidate = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Enable stale-while-revalidate?' },
    );

    const cacheKeyInput = await vscode.window.showInputBox({
      prompt: 'Enter cache key pattern (optional)',
      placeHolder: 'loader:${param}',
    });

    return {
      enabled: true,
      strategy: config.cachingStrategy,
      ttl,
      staleWhileRevalidate: staleWhileRevalidate?.value === 'yes',
      cacheKey: cacheKeyInput || undefined,
    };
  }

  /**
   * Collects validation configuration
   */
  private async collectValidationConfig(
    config: RemixLoaderGeneratorConfig,
  ): Promise<RemixLoaderValidationConfig | undefined> {
    if (!config.includeValidation) {
      return undefined;
    }

    const enabled = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include validation', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include validation in loader?' },
    );

    if (!enabled || enabled.value === 'no') {
      return undefined;
    }

    const validationLibrary = await vscode.window.showQuickPick<
      Required<{ label: string; value: RemixLoaderValidationConfig['validationLibrary'] }>
    >(
      [
        { label: 'Zod', value: 'zod' },
        { label: 'Yup', value: 'yup' },
        { label: 'Custom', value: 'custom' },
      ],
      { placeHolder: 'Select validation library' },
    );

    return {
      enabled: true,
      validateParams: true,
      validateResponse: false,
      validationLibrary: validationLibrary?.value || 'none',
    };
  }

  /**
   * Generates imports based on configuration
   */
  private generateImports(options: {
    params: RemixLoaderParam[];
    databaseQuery?: RemixLoaderDatabaseQuery;
    caching?: RemixLoaderCachingConfig;
    validation?: RemixLoaderValidationConfig;
    config: RemixLoaderGeneratorConfig;
  }): string[] {
    const imports: string[] = [];

    // Core Remix imports
    imports.push('type { LoaderFunctionArgs }');
    imports.push('from "@remix-run/node"');
    imports.push('{ json }');
    imports.push('from "@remix-run/node"');

    // Database imports
    if (options.databaseQuery) {
      if (options.config.databaseType === 'prisma') {
        imports.push('{ prisma }');
        imports.push('from "~/lib/prisma"');
      } else if (options.config.databaseType === 'drizzle') {
        imports.push('{ db }');
        imports.push('from "~/lib/db"');
      } else if (options.config.databaseType === 'mongodb') {
        imports.push('{ MongoClient }');
        imports.push('from "mongodb"');
      }
    }

    // Caching imports
    if (options.caching?.enabled) {
      if (options.caching.strategy === 'redis') {
        imports.push('{ redis }');
        imports.push('from "~/lib/redis"');
      } else if (options.caching.strategy === 'vercel-kv') {
        imports.push('{ kv }');
        imports.push('from "@vercel/kv"');
      } else if (options.caching.strategy === 'cloudflare-kv') {
        imports.push('type { Env }');
        imports.push('from "~/env"');
      }
    }

    // Validation imports
    if (options.validation?.enabled) {
      if (options.validation.validationLibrary === 'zod') {
        imports.push('{ z }');
        imports.push('from "zod"');
      } else if (options.validation.validationLibrary === 'yup') {
        imports.push('{ yup }');
        imports.push('from "yup"');
      }
    }

    // Add redirect if needed
    imports.push('{ redirect }');
    imports.push('from "@remix-run/node"');

    return imports;
  }

  /**
   * Generates the loader code
   */
  private generateLoaderCode(
    loaderName: string,
    loader: {
      description?: string;
      params: RemixLoaderParam[];
      returnType: string;
      databaseQuery?: RemixLoaderDatabaseQuery;
      caching?: RemixLoaderCachingConfig;
      validation?: RemixLoaderValidationConfig;
      includeErrorHandling: boolean;
    },
    imports: string[],
    config: RemixLoaderGeneratorConfig,
  ): string {
    let code = '';

    // Add imports
    if (imports.length > 0) {
      const importGroups = new Map<string, string[]>();
      for (let i = 0; i < imports.length; i += 2) {
        const item = imports[i];
        const from = imports[i + 1];
        if (!from) continue;

        if (!importGroups.has(from)) {
          importGroups.set(from, []);
        }
        importGroups.get(from)!.push(item);
      }

      for (const [from, items] of Array.from(importGroups.entries())) {
        const joined = items.join(', ');
        code += `import ${joined} ${from};\n`;
      }
      code += '\n';
    }

    // Add TypeScript interfaces if enabled
    if (config.includeTypeScript) {
      code += this.generateTypeInterfaces(loader);
    }

    // Add validation schema if using validation library
    if (loader.validation?.enabled && loader.params.length > 0) {
      code += this.generateValidationSchema(loader, loader.validation.validationLibrary!);
      code += '\n';
    }

    // JSDoc comment
    if (loader.description) {
      code += `/**\n`;
      code += ` * ${loader.description}\n`;
      code += ` */\n`;
    }

    // Loader function signature
    code += `export const loader = `;
    if (config.includeTypeScript) {
      code += `async ({ request, params }: LoaderFunctionArgs): Promise<${loader.returnType}> => {\n`;
    } else {
      code += `async ({ request, params }) => {\n`;
    }

    // Extract parameters
    if (loader.params.length > 0) {
      code += `  const { `;
      const paramNames = loader.params.map((p) => p.name);
      code += paramNames.join(', ');
      code += ` } = params;\n`;
      code += '\n';
    }

    // Add validation if enabled
    if (loader.validation?.enabled && loader.params.length > 0) {
      code += this.generateValidationCode(loader);
    }

    // Add caching if enabled
    if (loader.caching?.enabled) {
      code += this.generateCacheCheckCode(loader.caching);
      code += '\n';
    }

    // Add error handling wrapper
    if (loader.includeErrorHandling) {
      code += `  try {\n`;
    }

    // Add database query or custom logic
    if (loader.databaseQuery) {
      code += this.generateDatabaseQueryCode(loader.databaseQuery, config);
    } else {
      code += `    // TODO: Implement your data fetching logic\n`;
      code += `    const data = {} as ${loader.returnType};\n\n`;
    }

    // Add cache storage if caching is enabled
    if (loader.caching?.enabled) {
      code += this.generateCacheStoreCode(loader.caching);
      code += '\n';
    }

    code += `    return data;\n`;

    if (loader.includeErrorHandling) {
      code += `  } catch (error) {\n`;
      code += `    console.error('Error in ${loaderName} loader:', error);\n`;
      code += `    throw new Response('Failed to load data', { status: 500 });\n`;
      code += `  }\n`;
    }

    code += `};`;

    return code;
  }

  /**
   * Generates TypeScript interfaces
   */
  private generateTypeInterfaces(loader: {
    returnType: string;
    params: RemixLoaderParam[];
  }): string {
    let code = '';

    // Generate loader data interface
    code += `interface ${loader.returnType} {\n`;
    if (loader.params.length > 0) {
      for (const param of loader.params) {
        const optional = param.required ? '' : '?';
        code += `  ${param.name}${optional}: ${param.dataType};\n`;
      }
    } else {
      code += `  // Add your data properties here\n`;
      code += `  [key: string]: unknown;\n`;
    }
    code += `}\n\n`;

    return code;
  }

  /**
   * Generates validation schema
   */
  private generateValidationSchema(
    loader: {
      params: RemixLoaderParam[];
    },
    library: string,
  ): string {
    let code = '';

    if (library === 'zod') {
      code += `const paramsSchema = z.object({\n`;
      for (const param of loader.params) {
        let zodType = 'z.string()';
        if (param.dataType === 'number') zodType = 'z.number()';
        if (param.dataType === 'boolean') zodType = 'z.boolean()';
        if (param.dataType === 'any') zodType = 'z.any()';

        // Add optional
        if (!param.required) {
          zodType += '.optional()';
        }

        // Add validation rules
        if (param.validationRule) {
          if (param.validationRule.type === 'min') {
            zodType += `.min(${param.validationRule.value}${param.validationRule.message ? `, { message: "${param.validationRule.message}" }` : ''})`;
          } else if (param.validationRule.type === 'max') {
            zodType += `.max(${param.validationRule.value}${param.validationRule.message ? `, { message: "${param.validationRule.message}" }` : ''})`;
          } else if (param.validationRule.type === 'pattern') {
            zodType += `.regex(/${param.validationRule.value}/${param.validationRule.message ? `, "${param.validationRule.message}"` : ''})`;
          } else if (param.validationRule.type === 'email') {
            zodType = 'z.string().email()';
          } else if (param.validationRule.type === 'url') {
            zodType = 'z.string().url()';
          }
        }

        code += `  ${param.name}: ${zodType},\n`;
      }
      code += `});\n`;
    } else if (library === 'yup') {
      code += `const paramsSchema = yup.object().shape({\n`;
      for (const param of loader.params) {
        let yupType = 'yup.string()';
        if (param.dataType === 'number') yupType = 'yup.number()';
        if (param.dataType === 'boolean') yupType = 'yup.boolean()';
        if (param.dataType === 'any') yupType = 'yup.mixed()';

        // Add required
        if (param.required) {
          yupType += '.required()';
        } else {
          yupType += '.nullable()';
        }

        // Add validation rules
        if (param.validationRule) {
          if (param.validationRule.type === 'min') {
            yupType += `.min(${param.validationRule.value}${param.validationRule.message ? `, "${param.validationRule.message}"` : ''})`;
          } else if (param.validationRule.type === 'max') {
            yupType += `.max(${param.validationRule.value}${param.validationRule.message ? `, "${param.validationRule.message}"` : ''})`;
          } else if (param.validationRule.type === 'pattern') {
            yupType += `.matches(/${param.validationRule.value}/${param.validationRule.message ? `, "${param.validationRule.message}"` : ''})`;
          } else if (param.validationRule.type === 'email') {
            yupType = 'yup.string().email()';
          } else if (param.validationRule.type === 'url') {
            yupType = 'yup.string().url()';
          }
        }

        code += `  ${param.name}: ${yupType},\n`;
      }
      code += `});\n`;
    }

    return code;
  }

  /**
   * Generates validation code
   */
  private generateValidationCode(loader: {
    params: RemixLoaderParam[];
    validation?: RemixLoaderValidationConfig;
  }): string {
    let code = '';

    if (loader.validation?.validationLibrary === 'zod') {
      code += `  // Validate parameters\n`;
      code += `  const validatedParams = paramsSchema.parse({ `;
      code += loader.params.map((p) => p.name).join(', ');
      code += ` });\n\n`;
    } else if (loader.validation?.validationLibrary === 'yup') {
      code += `  // Validate parameters\n`;
      code += `  const validatedParams = await paramsSchema.validate({ `;
      code += loader.params.map((p) => p.name).join(', ');
      code += ` });\n\n`;
    } else if (loader.validation?.validationLibrary === 'custom') {
      code += `  // Validate parameters\n`;
      for (const param of loader.params.filter((p) => p.required)) {
        code += `  if (!${param.name}) {\n`;
        code += `    throw new Response('Missing required parameter: ${param.name}', { status: 400 });\n`;
        code += `  }\n`;
      }
      code += '\n';
    }

    return code;
  }

  /**
   * Generates cache check code
   */
  private generateCacheCheckCode(caching: RemixLoaderCachingConfig): string {
    let code = '';

    code += `  // Check cache\n`;
    const cacheKey = caching.cacheKey || 'loader:${params}';
    code += `  const cacheKey = "${cacheKey}";\n`;

    if (caching.strategy === 'redis') {
      code += `  const cached = await redis.get(cacheKey);\n`;
      code += `  if (cached) {\n`;
      code += `    return JSON.parse(cached);\n`;
      code += `  }\n`;
    } else if (caching.strategy === 'memory') {
      code += `  // Note: Implement in-memory cache based on your needs\n`;
      code += `  // const cached = memoryCache.get(cacheKey);\n`;
      code += `  // if (cached) return cached;\n`;
    } else if (caching.strategy === 'vercel-kv') {
      code += `  const cached = await kv.get(cacheKey);\n`;
      code += `  if (cached) {\n`;
      code += `    return cached as ${this.ucfirst(/* loader.returnType */ 'Data')};\n`;
      code += `  }\n`;
    } else if (caching.strategy === 'cloudflare-kv') {
      code += `  const cached = await env.CACHE.get(cacheKey);\n`;
      code += `  if (cached) {\n`;
      code += `    return JSON.parse(cached);\n`;
      code += `  }\n`;
    }

    return code;
  }

  /**
   * Generates database query code
   */
  private generateDatabaseQueryCode(
    query: RemixLoaderDatabaseQuery,
    config: RemixLoaderGeneratorConfig,
  ): string {
    let code = '';

    code += `    // Database query\n`;

    if (config.databaseType === 'prisma') {
      const model = query.modelName || 'Model';
      code += `    const data = await prisma.${this.lcfirst(model)}.${query.operation}(`;
      code += this.generatePrismaOptions(query);
      code += `);\n\n`;
    } else if (config.databaseType === 'drizzle') {
      const table = query.tableName || 'table';
      code += `    const data = await db.query.${this.lcfirst(table)}.find`;
      if (query.operation === 'findMany') {
        code += `Many(`;
      } else if (query.operation === 'findFirst') {
        code += `First(`;
      } else {
        code += `(`;
      }
      code += this.generateDrizzleOptions(query);
      code += `);\n\n`;
    } else if (config.databaseType === 'raw-sql') {
      code += `    const data = await db.query(\n`;
      code += `      '${query.customQuery || 'SELECT * FROM table WHERE id = $1'}',\n`;
      code += `      [params.id]\n`;
      code += `    );\n\n`;
    } else if (config.databaseType === 'mongodb') {
      const collection = query.tableName || 'collection';
      code += `    const client = new MongoClient(process.env.DATABASE_URL);\n`;
      code += `    await client.connect();\n`;
      code += `    const db = client.db();\n\n`;
      code += `    const data = await db.collection('${collection}').`;
      if (query.operation === 'findMany') {
        code += `find(`;
        if (query.includeWhere) code += `{ /* where clause */ }`;
        code += `).toArray()`;
      } else if (query.operation === 'findFirst') {
        code += `findOne(${query.includeWhere ? '{ /* where clause */ }' : ''})`;
      } else if (query.operation === 'findUnique') {
        code += `findOne({ _id: params.id })`;
      }
      code += `;\n\n`;
      code += `    await client.close();\n\n`;
    }

    return code;
  }

  /**
   * Generates Prisma query options
   */
  private generatePrismaOptions(query: RemixLoaderDatabaseQuery): string {
    const options: string[] = [];

    if (query.includeWhere && query.operation !== 'create') {
      options.push('where: { /* where conditions */ }');
    }

    if (query.includeOrderBy && query.operation === 'findMany') {
      options.push('orderBy: { /* sort order */ }');
    }

    if (query.includePagination && query.operation === 'findMany') {
      options.push('take: 10, skip: 0');
    }

    if (query.includeRelations) {
      options.push('include: { /* relations */ }');
    }

    return options.length > 0 ? `{\n      ${options.join(',\n      ')}\n    }` : '{}';
  }

  /**
   * Generates Drizzle query options
   */
  private generateDrizzleOptions(query: RemixLoaderDatabaseQuery): string {
    const options: string[] = [];

    if (query.includeWhere) {
      options.push('where: eq(table.id, params.id)');
    }

    if (query.includeOrderBy && query.operation === 'findMany') {
      options.push('orderBy: [desc(table.id)]');
    }

    if (query.includePagination && query.operation === 'findMany') {
      options.push('limit: 10, offset: 0');
    }

    if (query.includeRelations) {
      options.push('with: { /* relations */ }');
    }

    return options.length > 0 ? `{\n      ${options.join(',\n      ')}\n    }` : '{}';
  }

  /**
   * Generates cache store code
   */
  private generateCacheStoreCode(caching: RemixLoaderCachingConfig): string {
    let code = '';

    code += `    // Store in cache\n`;
    const cacheKey = caching.cacheKey || 'loader:${params}';
    code += `    const cacheKey = "${cacheKey}";\n`;

    if (caching.strategy === 'redis') {
      code += `    await redis.set(cacheKey, JSON.stringify(data), "EX", ${caching.ttl});\n`;
    } else if (caching.strategy === 'memory') {
      code += `    // memoryCache.set(cacheKey, data, { ttl: ${caching.ttl} });\n`;
    } else if (caching.strategy === 'vercel-kv') {
      code += `    await kv.set(cacheKey, data, { ex: ${caching.ttl} });\n`;
    } else if (caching.strategy === 'cloudflare-kv') {
      code += `    await env.CACHE.put(cacheKey, JSON.stringify(data), {\n`;
      code += `      expirationTtl: ${caching.ttl},\n`;
      code += `    });\n`;
    }

    return code;
  }

  /**
   * Generates example usage
   */
  private generateExampleUsage(loaderName: string, params: RemixLoaderParam[]): string {
    let code = '// Example component usage:\n\n';
    code += `export default function ${this.ucfirst(loaderName)}Page() {\n`;
    code += `  const data = useLoaderData<typeof loader>();\n\n`;
    code += `  return (\n`;
    code += `    <div>\n`;
    code += `      <h1>${this.ucfirst(loaderName)}</h1>\n`;
    if (params.length > 0) {
      code += `      {/* Data loaded with params: ${params.map((p) => p.name).join(', ')} */}\n`;
    }
    code += `      <pre>{JSON.stringify(data, null, 2)}</pre>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}`;

    return code;
  }

  /**
   * Converts string to lowercase first letter
   */
  private lcfirst(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the loader file at the specified path
   */
  public async createLoaderFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = filePath.substring(0, filePath.lastIndexOf('/'));

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write loader file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Remix loader file created', { filePath });
  }
}
