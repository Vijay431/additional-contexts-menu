import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

// Configuration interface
export interface PaginatedQueryBuilderConfig {
  enabled: boolean;
  defaultPageSize: number;
  maxPageSize: number;
  defaultStrategy: 'offset' | 'cursor';
  includeTypeScriptTypes: boolean;
  includeErrorHandling: boolean;
  includeValidation: boolean;
  outputDirectory: string;
  generateRepositoryMethods: boolean;
  generateServiceMethods: boolean;
}

// Field information
export interface QueryField {
  name: string;
  type: string;
  isRequired: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  relation?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    targetEntity: string;
  };
}

// Pagination strategy types
export interface OffsetPaginationConfig {
  strategy: 'offset';
  defaultLimit: number;
  maxLimit: number;
}

export interface CursorPaginationConfig {
  strategy: 'cursor';
  cursorField: string;
  defaultLimit: number;
  maxLimit: number;
  order: 'asc' | 'desc';
}

// Result types
export interface PaginatedQueryResult {
  queryCode: string;
  serviceCode?: string | undefined;
  repositoryCode?: string | undefined;
  interfaceCode?: string | undefined;
  config: PaginatedQueryBuilderConfig;
}

export interface QueryBuilderOptions {
  tableName: string;
  fields: QueryField[];
  paginationConfig: OffsetPaginationConfig | CursorPaginationConfig;
  filters?: QueryFilter[] | undefined;
  sorts?: QuerySort[] | undefined;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'between';
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Service for generating database queries with pagination support.
 * Creates cursor-based and offset-based pagination with metadata and filtering.
 */
export class PaginatedQueryBuilderService {
  private static instance: PaginatedQueryBuilderService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PaginatedQueryBuilderService {
    PaginatedQueryBuilderService.instance ??= new PaginatedQueryBuilderService();
    return PaginatedQueryBuilderService.instance;
  }

  /**
   * Generates paginated query based on user input
   */
  public async generatePaginatedQuery(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _workspacePath: string,
    config: PaginatedQueryBuilderConfig,
  ): Promise<PaginatedQueryResult | null> {
    // Get table name
    const tableName = await this.getTableName();
    if (!tableName) {
      return null;
    }

    // Collect fields for the table
    const fields = await this.collectFields(tableName);
    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. Query generation cancelled.');
      return null;
    }

    // Choose pagination strategy
    const paginationStrategy = await this.choosePaginationStrategy();
    if (!paginationStrategy) {
      return null;
    }

    // Collect filters if needed
    const filters = await this.collectFilters(fields);

    // Collect sorts if needed
    const sorts = await this.collectSorts(fields);

    const options: QueryBuilderOptions = {
      tableName,
      fields,
      paginationConfig: paginationStrategy,
      filters: filters.length > 0 ? filters : undefined,
      sorts: sorts.length > 0 ? sorts : undefined,
    };

    // Generate the query code
    const queryCode = this.generateQueryCode(options, config);

    // Generate interface code if enabled
    let interfaceCode: string | undefined;
    if (config.includeTypeScriptTypes) {
      interfaceCode = this.generateInterfaceCode(options, config);
    }

    // Generate repository code if enabled
    let repositoryCode: string | undefined;
    if (config.generateRepositoryMethods) {
      repositoryCode = this.generateRepositoryCode(options, config);
    }

    // Generate service code if enabled
    let serviceCode: string | undefined;
    if (config.generateServiceMethods) {
      serviceCode = this.generateServiceCode(options, config);
    }

    this.logger.info('Paginated query generated', {
      tableName,
      fieldCount: fields.length,
      strategy: paginationStrategy.strategy,
      hasFilters: filters.length > 0,
      hasSorts: sorts.length > 0,
    });

    return {
      queryCode,
      interfaceCode,
      repositoryCode,
      serviceCode,
      config,
    };
  }

  /**
   * Prompts user for table name
   */
  private async getTableName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter table name (e.g., users, posts, products)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Table name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Table name must start with lowercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects fields for the table
   */
  private async collectFields(_tableName: string): Promise<QueryField[] | null> {
    const fields: QueryField[] = [];

    // Always add id field
    fields.push({
      name: 'id',
      type: 'number',
      isRequired: true,
      isSortable: true,
      isFilterable: true,
    });

    let addMore = true;
    while (addMore) {
      const field = await this.createField();
      if (field) {
        fields.push(field);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another field', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another field or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    // Add timestamps
    fields.push(
      {
        name: 'createdAt',
        type: 'Date',
        isRequired: true,
        isSortable: true,
        isFilterable: true,
      },
      {
        name: 'updatedAt',
        type: 'Date',
        isRequired: true,
        isSortable: true,
        isFilterable: true,
      },
    );

    return fields.length > 3 ? fields : null;
  }

  /**
   * Creates a single field through user interaction
   */
  private async createField(): Promise<QueryField | null> {
    // Get field name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter field name (camelCase)',
      placeHolder: 'email',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Field name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Field name must start with lowercase letter';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const fieldName = nameInput.trim();

    // Choose data type
    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Date', value: 'Date' },
      ],
      { placeHolder: 'Select field data type' },
    );

    if (!typeChoice) {
      return null;
    }

    // Ask if it's required
    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: true },
        { label: 'Optional', value: false },
      ],
      { placeHolder: 'Is this field required?' },
    );

    const isRequired = requiredChoice?.value ?? true;

    // Ask if it's sortable
    const sortableChoice = await vscode.window.showQuickPick(
      [
        { label: 'Sortable', value: true },
        { label: 'Not sortable', value: false },
      ],
      { placeHolder: 'Can this field be used for sorting?' },
    );

    const isSortable = sortableChoice?.value ?? false;

    // Ask if it's filterable
    const filterableChoice = await vscode.window.showQuickPick(
      [
        { label: 'Filterable', value: true },
        { label: 'Not filterable', value: false },
      ],
      { placeHolder: 'Can this field be used for filtering?' },
    );

    const isFilterable = filterableChoice?.value ?? false;

    return {
      name: fieldName,
      type: typeChoice.value,
      isRequired,
      isSortable,
      isFilterable,
    };
  }

  /**
   * Chooses pagination strategy
   */
  private async choosePaginationStrategy(): Promise<
    OffsetPaginationConfig | CursorPaginationConfig | null
  > {
    const strategyChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'Offset-based (LIMIT/OFFSET)',
          value: 'offset',
          description: 'Traditional pagination using page numbers',
        },
        {
          label: 'Cursor-based (optimized)',
          value: 'cursor',
          description: 'Efficient pagination using cursors',
        },
      ],
      { placeHolder: 'Select pagination strategy' },
    );

    if (!strategyChoice) {
      return null;
    }

    const defaultLimit = await this.getDefaultLimit();
    const maxLimit = await this.getMaxLimit();

    if (strategyChoice.value === 'offset') {
      return {
        strategy: 'offset',
        defaultLimit,
        maxLimit,
      };
    } else {
      const cursorField = await this.getCursorField();
      if (!cursorField) {
        return null;
      }

      const orderChoice = await vscode.window.showQuickPick(
        [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' },
        ],
        { placeHolder: 'Select cursor order' },
      );

      return {
        strategy: 'cursor',
        cursorField,
        defaultLimit,
        maxLimit,
        order: (orderChoice?.value ?? 'asc') as 'asc' | 'desc',
      };
    }
  }

  private async getDefaultLimit(): Promise<number> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter default page size',
      placeHolder: '10',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 1) {
          return 'Must be a positive number';
        }
        return null;
      },
    });
    return input ? Number.parseInt(input, 10) : 10;
  }

  private async getMaxLimit(): Promise<number> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter maximum page size',
      placeHolder: '100',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 1) {
          return 'Must be a positive number';
        }
        return null;
      },
    });
    return input ? Number.parseInt(input, 10) : 100;
  }

  private async getCursorField(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter cursor field name (e.g., id, created_at)',
      placeHolder: 'id',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Cursor field cannot be empty';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects filters
   */
  private async collectFilters(fields: QueryField[]): Promise<QueryFilter[]> {
    const filters: QueryFilter[] = [];
    const filterableFields = fields.filter((f) => f.isFilterable);

    if (filterableFields.length === 0) {
      return filters;
    }

    let addMore = true;
    while (addMore) {
      const fieldChoice = await vscode.window.showQuickPick(
        filterableFields.map((f) => ({ label: f.name, value: f.name })),
        { placeHolder: 'Select field to filter by' },
      );

      if (!fieldChoice) {
        break;
      }

      const operatorChoice = await vscode.window.showQuickPick(
        [
          { label: 'Equals (=)', value: 'eq' },
          { label: 'Not Equals (!=)', value: 'ne' },
          { label: 'Greater Than (>)', value: 'gt' },
          { label: 'Less Than (<)', value: 'lt' },
          { label: 'Greater or Equal (>=)', value: 'gte' },
          { label: 'Less or Equal (<=)', value: 'lte' },
          { label: 'Like (LIKE)', value: 'like' },
          { label: 'In (IN)', value: 'in' },
          { label: 'Between (BETWEEN)', value: 'between' },
        ],
        { placeHolder: 'Select filter operator' },
      );

      if (operatorChoice) {
        filters.push({
          field: fieldChoice.value,
          operator: operatorChoice.value as QueryFilter['operator'],
        });
      }

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
    }

    return filters;
  }

  /**
   * Collects sorts
   */
  private async collectSorts(fields: QueryField[]): Promise<QuerySort[]> {
    const sorts: QuerySort[] = [];
    const sortableFields = fields.filter((f) => f.isSortable);

    if (sortableFields.length === 0) {
      return sorts;
    }

    let addMore = true;
    while (addMore) {
      const fieldChoice = await vscode.window.showQuickPick(
        sortableFields.map((f) => ({ label: f.name, value: f.name })),
        { placeHolder: 'Select field to sort by' },
      );

      if (!fieldChoice) {
        break;
      }

      const directionChoice = await vscode.window.showQuickPick(
        [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' },
        ],
        { placeHolder: 'Select sort direction' },
      );

      if (directionChoice) {
        sorts.push({ field: fieldChoice.value, direction: directionChoice.value as 'asc' | 'desc' });
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another sort', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another sort or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return sorts;
  }

  /**
   * Generates the main query code
   */
  private generateQueryCode(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: QueryBuilderOptions,
    config: PaginatedQueryBuilderConfig,
  ): string {
    const { paginationConfig } = options;

    if (paginationConfig.strategy === 'offset') {
      return this.generateOffsetQueryCode(options, config);
    } else {
      return this.generateCursorQueryCode(options, config);
    }
  }

  /**
   * Generates offset-based query code
   */
  private generateOffsetQueryCode(
    _options: QueryBuilderOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: PaginatedQueryBuilderConfig,
  ): string {
    const { tableName } = _options;

    let code = `-- Paginated query for ${tableName} (Offset-based pagination)\n\n`;

    // Generate query function
    code += this.generateOffsetFunction(_options, config, _options.fields);

    // Generate count query
    code += `\n${this.generateCountQuery(_options, config)}`;

    return code;
  }

  /**
   * Generates cursor-based query code
   */
  private generateCursorQueryCode(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: QueryBuilderOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: PaginatedQueryBuilderConfig,
  ): string {
    const { tableName } = _options;

    let code = `-- Paginated query for ${tableName} (Cursor-based pagination)\n\n`;

    // Generate query function
    code += this.generateCursorFunction(_options, _config, _options.sorts ?? []);

    return code;
  }

  /**
   * Generates offset-based function
   */
  private generateOffsetFunction(
    options: QueryBuilderOptions,
    config: PaginatedQueryBuilderConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _fields: QueryField[],
  ): string {
    const { tableName, paginationConfig, filters, sorts } = options;
    const offsetConfig = paginationConfig as OffsetPaginationConfig;
    const entityName = this.toPascalCase(tableName);

    let code = `async function get${entityName}Paginated(params: {\n`;
    code += `  page?: number;\n`;
    code += `  pageSize?: number;\n`;

    if (filters && filters.length > 0) {
      filters.forEach((f) => {
        code += `  ${f.field}?: ${this.getFilterType(f)};\n`;
      });
    }

    code += `}) {\n`;
    code += `  const page = Math.max(1, params.page ?? 1);\n`;
    code += `  const pageSize = Math.min(${offsetConfig.maxLimit}, params.pageSize ?? ${offsetConfig.defaultLimit});\n`;
    code += `  const offset = (page - 1) * pageSize;\n\n`;

    code += `  const query = \`\`\nsql\n`;
    code += `    SELECT *\n`;
    code += `    FROM ${tableName}\n`;

    // Add WHERE clause for filters
    if (filters && filters.length > 0) {
      code += `    WHERE 1=1\n`;
      filters.forEach((f) => {
        code += `    AND ${f.field} = \${params.${f.field}}\n`;
      });
    }

    // Add ORDER BY clause for sorts
    if (sorts && sorts.length > 0) {
      code += `    ORDER BY ${sorts.map((s) => `${s.field} ${s.direction.toUpperCase()}`).join(', ')}\n`;
    }

    code += `    LIMIT \${pageSize} OFFSET \${offset}\n`;
    code += `  \`\`\`\n\n`;

    if (config.includeErrorHandling) {
      code += `  try {\n`;
      code += `    const result = await db.query(query);\n`;
      code += `    return result.rows;\n`;
      code += `  } catch (error) {\n`;
      code += `    console.error('Error fetching paginated ${tableName}:', error);\n`;
      code += `    throw error;\n`;
      code += `  }\n`;
    } else {
      code += `  const result = await db.query(query);\n`;
      code += `  return result.rows;\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates cursor-based function
   */
  private generateCursorFunction(
    options: QueryBuilderOptions,
    config: PaginatedQueryBuilderConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _sorts: QuerySort[],
  ): string {
    const { tableName, paginationConfig, filters } = options;
    const cursorConfig = paginationConfig as CursorPaginationConfig;
    const entityName = this.toPascalCase(tableName);
    const cursorColumn = cursorConfig.cursorField;

    let code = `async function get${entityName}ByCursor(params: {\n`;
    code += `  cursor?: string | number;\n`;
    code += `  limit?: number;\n`;

    if (filters && filters.length > 0) {
      filters.forEach((f) => {
        code += `  ${f.field}?: ${this.getFilterType(f)};\n`;
      });
    }

    code += `}) {\n`;
    code += `  const limit = Math.min(${cursorConfig.maxLimit}, params.limit ?? ${cursorConfig.defaultLimit});\n`;
    code += `  const order = '${cursorConfig.order.toUpperCase()}';\n\n`;

    code += `  const query = \`\`\nsql\n`;
    code += `    SELECT *\n`;
    code += `    FROM ${tableName}\n`;

    // Build WHERE clause
    const whereConditions: string[] = [];
    if (filters && filters.length > 0) {
      filters.forEach((f) => {
        whereConditions.push(`${f.field} = \${params.${f.field}}`);
      });
    }
    if (cursorConfig.order === 'desc') {
      whereConditions.push(`${cursorColumn} < \${params.cursor}`);
    } else {
      whereConditions.push(`${cursorColumn} > \${params.cursor}`);
    }

    if (whereConditions.length > 0) {
      code += `    WHERE ${whereConditions.join('\n    AND ')}\n`;
    }

    // Add ORDER BY for cursor
    code += `    ORDER BY ${cursorColumn} ${cursorConfig.order.toUpperCase()}\n`;
    code += `    LIMIT \${limit}\n`;
    code += `  \`\`\`\n\n`;

    if (config.includeErrorHandling) {
      code += `  try {\n`;
      code += `    const result = await db.query(query);\n`;
      code += `    const data = result.rows;\n`;
      code += `    const nextCursor = data.length > 0 ? data[data.length - 1].${cursorColumn} : null;\n`;
      code += `    return { data, nextCursor, hasMore: data.length === limit };\n`;
      code += `  } catch (error) {\n`;
      code += `    console.error('Error fetching cursor-paginated ${tableName}:', error);\n`;
      code += `    throw error;\n`;
      code += `  }\n`;
    } else {
      code += `  const result = await db.query(query);\n`;
      code += `  const data = result.rows;\n`;
      code += `  const nextCursor = data.length > 0 ? data[data.length - 1].${cursorColumn} : null;\n`;
      code += `  return { data, nextCursor, hasMore: data.length === limit };\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates count query
   */
  private generateCountQuery(
    options: QueryBuilderOptions,
    _config: PaginatedQueryBuilderConfig,
  ): string {
    const { tableName, filters } = options;
    const entityName = this.toPascalCase(tableName);

    let code = `async function get${entityName}Count(params: {\n`;

    if (filters && filters.length > 0) {
      filters.forEach((f) => {
        code += `  ${f.field}?: ${this.getFilterType(f)};\n`;
      });
    }

    code += `}): Promise<number> {\n`;
    code += `  const query = \`\`\nsql\n`;
    code += `    SELECT COUNT(*) as total\n`;
    code += `    FROM ${tableName}\n`;

    if (filters && filters.length > 0) {
      code += `    WHERE 1=1\n`;
      filters.forEach((f) => {
        code += `    AND ${f.field} = \${params.${f.field}}\n`;
      });
    }

    code += `  \`\`\`\n\n`;
    code += `  const result = await db.query(query);\n`;
    code += `  return Number.parseInt(result.rows[0].total, 10);\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates TypeScript interface code
   */
  private generateInterfaceCode(
    options: QueryBuilderOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: PaginatedQueryBuilderConfig,
  ): string {
    const { tableName, fields, paginationConfig } = options;
    const entityName = this.toPascalCase(tableName);

    let code = `// TypeScript interfaces for ${tableName}\n\n`;

    // Entity interface
    code += `export interface ${entityName} {\n`;
    fields.forEach((f) => {
      const optional = f.isRequired ? '' : '?';
      code += `  ${f.name}${optional}: ${f.type};\n`;
    });
    code += `}\n\n`;

    // Pagination metadata interface
    if (paginationConfig.strategy === 'offset') {
      code += `export interface ${entityName}PaginationParams {\n`;
      code += `  page?: number;\n`;
      code += `  pageSize?: number;\n`;
      code += `}\n\n`;

      code += `export interface ${entityName}PaginatedResult {\n`;
      code += `  data: ${entityName}[];\n`;
      code += `  metadata: {\n`;
      code += `    total: number;\n`;
      code += `    page: number;\n`;
      code += `    pageSize: number;\n`;
      code += `    totalPages: number;\n`;
      code += `    hasNext: boolean;\n`;
      code += `    hasPrevious: boolean;\n`;
      code += `  };\n`;
      code += `}\n`;
    } else {
      const cursorConfig = paginationConfig as CursorPaginationConfig;
      code += `export interface ${entityName}CursorParams {\n`;
      code += `  cursor?: ${this.getFieldType(fields, cursorConfig.cursorField)};\n`;
      code += `  limit?: number;\n`;
      code += `}\n\n`;

      code += `export interface ${entityName}CursorResult {\n`;
      code += `  data: ${entityName}[];\n`;
      code += `  nextCursor: ${this.getFieldType(fields, cursorConfig.cursorField)} | null;\n`;
      code += `  hasMore: boolean;\n`;
      code += `}\n`;
    }

    return code;
  }

  /**
   * Generates repository code
   */
  private generateRepositoryCode(
    options: QueryBuilderOptions,
    config: PaginatedQueryBuilderConfig,
  ): string {
    const { tableName, paginationConfig } = options;
    const entityName = this.toPascalCase(tableName);

    let code = `// Repository class for ${tableName} with pagination\n\n`;

    if (config.includeTypeScriptTypes) {
      code += `import { ${entityName}`;
      if (paginationConfig.strategy === 'offset') {
        code += `, ${entityName}PaginationParams, ${entityName}PaginatedResult`;
      } else {
        code += `, ${entityName}CursorParams, ${entityName}CursorResult`;
      }
      code += ` } from './${tableName}.interfaces';\n\n`;
    }

    code += `export class ${entityName}Repository {\n`;
    code += `  constructor(private readonly db: any) {}\n\n`;

    if (paginationConfig.strategy === 'offset') {
      code += `  async findPaginated(params: ${entityName}PaginationParams): Promise<${entityName}PaginatedResult> {\n`;
      code += `    const page = Math.max(1, params.page ?? 1);\n`;
      code += `    const pageSize = params.pageSize ?? ${paginationConfig.defaultLimit};\n\n`;
      code += `    const [data, total] = await Promise.all([\n`;
      code += `      this.getPaginatedData(page, pageSize),\n`;
      code += `      this.count(),\n`;
      code += `    ]);\n\n`;
      code += `    const totalPages = Math.ceil(total / pageSize);\n\n`;
      code += `    return {\n`;
      code += `      data,\n`;
      code += `      metadata: {\n`;
      code += `        total,\n`;
      code += `        page,\n`;
      code += `        pageSize,\n`;
      code += `        totalPages,\n`;
      code += `        hasNext: page < totalPages,\n`;
      code += `        hasPrevious: page > 1,\n`;
      code += `      },\n`;
      code += `    };\n`;
      code += `  }\n`;
    } else {
      code += `  async findByCursor(params: ${entityName}CursorParams): Promise<${entityName}CursorResult> {\n`;
      code += `    return this.getCursorData(params.cursor, params.limit);\n`;
      code += `  }\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates service code
   */
  private generateServiceCode(
    options: QueryBuilderOptions,
    _config: PaginatedQueryBuilderConfig,
  ): string {
    const { tableName, paginationConfig } = options;
    const entityName = this.toPascalCase(tableName);

    let code = `// Service class for ${tableName} with business logic\n\n`;
    code += `export class ${entityName}Service {\n`;
    code += `  constructor(private readonly repository: ${entityName}Repository) {}\n\n`;

    if (paginationConfig.strategy === 'offset') {
      code += `  async get${entityName}List(page: number = 1, pageSize: number = ${paginationConfig.defaultLimit}) {\n`;
      code += `    return this.repository.findPaginated({ page, pageSize });\n`;
      code += `  }\n`;
    } else {
      code += `  async get${entityName}List(cursor?: string, limit: number = ${paginationConfig.defaultLimit}) {\n`;
      code += `    return this.repository.findByCursor({ cursor, limit });\n`;
      code += `  }\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Helper to get filter type
   */
  private getFilterType(filter: QueryFilter): string {
    switch (filter.operator) {
      case 'in':
      case 'between':
        return 'any[]';
      default:
        return 'any';
    }
  }

  /**
   * Helper to get field type
   */
  private getFieldType(fields: QueryField[], fieldName: string): string {
    const field = fields.find((f) => f.name === fieldName);
    return field?.type ?? 'any';
  }

  /**
   * Helper to convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Creates the query files at the specified path
   */
  public async createQueryFiles(
    outputPath: string,
    result: PaginatedQueryResult,
  ): Promise<void> {
    const fileName = `${result.config.defaultStrategy}-pagination-query.ts`;
    const mainUri = vscode.Uri.file(path.join(outputPath, fileName));
    const directory = path.dirname(mainUri.fsPath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write main query file
    await vscode.workspace.fs.writeFile(mainUri, Buffer.from(result.queryCode, 'utf-8'));

    this.logger.info('Paginated query files created', {
      mainFile: fileName,
      hasInterface: !!result.interfaceCode,
      hasRepository: !!result.repositoryCode,
      hasService: !!result.serviceCode,
    });

    // Write interface file if exists
    if (result.interfaceCode) {
      const interfacePath = `${result.config.defaultStrategy}-pagination.interfaces.ts`;
      const interfaceUri = vscode.Uri.file(path.join(outputPath, interfacePath));
      await vscode.workspace.fs.writeFile(
        interfaceUri,
        Buffer.from(result.interfaceCode, 'utf-8'),
      );
    }

    // Write repository file if exists
    if (result.repositoryCode) {
      const repositoryPath = `${result.config.defaultStrategy}-pagination.repository.ts`;
      const repositoryUri = vscode.Uri.file(path.join(outputPath, repositoryPath));
      await vscode.workspace.fs.writeFile(
        repositoryUri,
        Buffer.from(result.repositoryCode, 'utf-8'),
      );
    }

    // Write service file if exists
    if (result.serviceCode) {
      const servicePath = `${result.config.defaultStrategy}-pagination.service.ts`;
      const serviceUri = vscode.Uri.file(path.join(outputPath, servicePath));
      await vscode.workspace.fs.writeFile(
        serviceUri,
        Buffer.from(result.serviceCode, 'utf-8'),
      );
    }
  }
}
