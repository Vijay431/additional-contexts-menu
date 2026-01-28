import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface PrismaClientGeneratorConfig {
  enabled: boolean;
  outputPath: string;
  includeTransactionMethods: boolean;
  includeErrorHandling: boolean;
  includeSoftDelete: boolean;
  includePagination: boolean;
  includeCaching: boolean;
  includeValidation: boolean;
  generateRepositoryInterface: boolean;
  prismaImportPath: string;
  errorHandlingType: 'try-catch' | 'result-type' | 'both';
}

export interface PrismaModelField {
  name: string;
  type: string;
  isOptional: boolean;
  isEnum: boolean;
  isRelation: boolean;
  relationType?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

export interface PrismaModelDefinition {
  name: string;
  fields: PrismaModelField[];
}

export interface GeneratedPrismaClientWrapper {
  fileName: string;
  code: string;
  interfaceCode?: string;
  repositoryCode?: string;
}

/**
 * Service for generating typed Prisma client wrappers with CRUD operations,
 * transaction handling, error management, and repository pattern
 */
export class PrismaClientGeneratorService {
  private static instance: PrismaClientGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PrismaClientGeneratorService {
    PrismaClientGeneratorService.instance ??= new PrismaClientGeneratorService();
    return PrismaClientGeneratorService.instance;
  }

  /**
   * Generates Prisma client wrapper based on user input
   */
  public async generateClientWrapper(
    workspacePath: string,
    config: PrismaClientGeneratorConfig,
  ): Promise<GeneratedPrismaClientWrapper | null> {
    // Get model name
    const modelName = await this.getModelName();
    if (!modelName) {
      return null;
    }

    // Collect fields for the model
    const fields = await this.collectFields(modelName);
    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. Client wrapper generation cancelled.');
      return null;
    }

    const modelDefinition: PrismaModelDefinition = {
      name: modelName,
      fields,
    };

    // Generate the wrapper code
    const wrapperCode = this.generateWrapperCode(modelDefinition, config);

    // Generate interface if enabled
    let interfaceCode: string | undefined;
    if (config.generateRepositoryInterface) {
      interfaceCode = this.generateInterfaceCode(modelDefinition, config);
    }

    // Generate repository if enabled
    let repositoryCode: string | undefined;
    if (config.generateRepositoryInterface) {
      repositoryCode = this.generateRepositoryCode(modelDefinition, config);
    }

    this.logger.info('Prisma client wrapper generated', {
      modelName,
      fieldCount: fields.length,
      hasTransactions: config.includeTransactionMethods,
    });

    return {
      fileName: `${modelName.toLowerCase()}.repository.ts`,
      code: wrapperCode,
      interfaceCode,
      repositoryCode,
    };
  }

  /**
   * Prompts user for model name
   */
  private async getModelName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Prisma model name (e.g., User, Post, Product)',
      placeHolder: 'User',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Model name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Model name must start with uppercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects fields for the model
   */
  private async collectFields(modelName: string): Promise<PrismaModelField[] | null> {
    const fields: PrismaModelField[] = [];

    // Always add id field
    fields.push({
      name: 'id',
      type: 'string',
      isOptional: false,
      isEnum: false,
      isRelation: false,
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
        isOptional: false,
        isEnum: false,
        isRelation: false,
      },
      {
        name: 'updatedAt',
        type: 'Date',
        isOptional: false,
        isEnum: false,
        isRelation: false,
      },
    );

    return fields.length > 3 ? fields : null;
  }

  /**
   * Creates a single field through user interaction
   */
  private async createField(): Promise<PrismaModelField | null> {
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
        { label: 'String', value: 'string', description: 'Text data' },
        { label: 'Int', value: 'number', description: 'Integer number' },
        { label: 'Float', value: 'number', description: 'Floating point number' },
        { label: 'Boolean', value: 'boolean', description: 'True/false' },
        { label: 'Date', value: 'Date', description: 'Date and time' },
        { label: 'Json', value: 'any', description: 'JSON data' },
        { label: 'Enum', value: 'enum', description: 'Enumerated type' },
      ],
      { placeHolder: 'Select field data type' },
    );

    if (!typeChoice) {
      return null;
    }

    // Ask if it's optional
    const optionalChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: false },
        { label: 'Optional', value: true },
      ],
      { placeHolder: 'Is this field required?' },
    );

    const isOptional = optionalChoice?.value ?? false;

    // Ask if it's a relation
    const relationChoice = await vscode.window.showQuickPick(
      [
        { label: 'No (regular field)', value: 'none' },
        { label: 'Relation field', value: 'relation' },
      ],
      { placeHolder: 'Is this a relation field?' },
    );

    const isRelation = relationChoice?.value === 'relation';

    let relationType: PrismaModelField['relationType'] | undefined;
    if (isRelation) {
      const relationTypeChoice = await vscode.window.showQuickPick(
        [
          { label: 'One-to-One', value: 'one-to-one' },
          { label: 'One-to-Many', value: 'one-to-many' },
          { label: 'Many-to-One', value: 'many-to-one' },
          { label: 'Many-to-Many', value: 'many-to-many' },
        ],
        { placeHolder: 'Select relation type' },
      );
      relationType = relationTypeChoice?.value as PrismaModelField['relationType'];
    }

    return {
      name: fieldName,
      type: typeChoice.value,
      isOptional,
      isEnum: typeChoice.value === 'enum',
      isRelation: isRelation ?? false,
      relationType,
    };
  }

  /**
   * Generates the main wrapper code
   */
  private generateWrapperCode(
    model: PrismaModelDefinition,
    config: PrismaClientGeneratorConfig,
  ): string {
    const modelName = model.name;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const fields = model.fields.filter((f) => !f.isRelation);
    const relationFields = model.fields.filter((f) => f.isRelation);

    let code = `// Auto-generated Prisma Client Wrapper for ${modelName}\n`;
    code += `import { PrismaClient, ${modelName}, Prisma } from '${config.prismaImportPath}';\n`;

    if (config.includeTransactionMethods) {
      code += `import { $Enums } from '${config.prismaImportPath}';\n`;
    }

    code += `\n`;
    code += this.generateErrorCode(config);
    code += `\n`;
    code += `/**\n`;
    code += ` * Repository class for ${modelName} model\n`;
    code += ` * Provides typed CRUD operations with error handling\n`;
    code += ` */\n`;
    code += `export class ${modelName}Repository {\n`;
    code += `  constructor(private readonly prisma: PrismaClient) {}\n\n`;

    // Create method
    code += this.generateCreateMethod(modelName, fields, config);

    // Find unique (by id)
    code += this.generateFindUniqueMethod(modelName, config);

    // Find many with filters
    code += this.generateFindManyMethod(modelName, fields, config);

    // Update method
    code += this.generateUpdateMethod(modelName, fields, config);

    // Delete method
    code += this.generateDeleteMethod(modelName, config);

    // Upsert method
    code += this.generateUpsertMethod(modelName, fields, config);

    // Count method
    code += this.generateCountMethod(modelName, config);

    // Pagination methods
    if (config.includePagination) {
      code += this.generatePaginatedFindMethod(modelName, fields, config);
    }

    // Transaction methods
    if (config.includeTransactionMethods) {
      code += this.generateTransactionMethods(modelName, fields, config);
    }

    // Batch operations
    code += this.generateBatchMethods(modelName, fields, config);

    // Soft delete
    if (config.includeSoftDelete) {
      code += this.generateSoftDeleteMethod(modelName, config);
    }

    // Helper methods
    code += this.generateHelperMethods(modelName, fields, config);

    code += `}\n\n`;

    // Export default instance
    code += `// Factory function to create repository with Prisma client\n`;
    code += `export function create${modelName}Repository(prisma: PrismaClient): ${modelName}Repository {\n`;
    code += `  return new ${modelName}Repository(prisma);\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates error handling code
   */
  private generateErrorCode(config: PrismaClientGeneratorConfig): string {
    if (!config.includeErrorHandling || config.errorHandlingType === 'try-catch') {
      return `// Error types\n`;
    }

    let code = `// Error types\n`;
    code += `export class RepositoryError extends Error {\n`;
    code += `  constructor(\n`;
    code += `    public readonly code: string,\n`;
    code += `    message: string,\n`;
    code += `    public readonly originalError?: unknown,\n`;
    code += `  ) {\n`;
    code += `    super(message);\n`;
    code += `    this.name = 'RepositoryError';\n`;
    code += `  }\n`;
    code += `}\n\n`;

    code += `export type Result<T, E = RepositoryError> =\n`;
    code += `  | { success: true; data: T }\n`;
    code += `  | { success: false; error: E };\n\n`;

    return code;
  }

  /**
   * Generates create method
   */
  private generateCreateMethod(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    const createFields = fields.filter(
      (f) => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt',
    );
    const inputType = `Prisma.${modelName}CreateInput`;

    let code = `  /**\n`;
    code += `   * Create a new ${modelName}\n`;
    code += `   */\n`;
    code += `  async create(data: ${inputType}): Promise<${modelName}> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'create',
        `await this.prisma.${modelName.toLowerCase()}.create({ data })`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.create({ data });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates find unique method
   */
  private generateFindUniqueMethod(modelName: string, config: PrismaClientGeneratorConfig): string {
    let code = `  /**\n`;
    code += `   * Find ${modelName} by ID\n`;
    code += `   */\n`;
    code += `  async findById(id: string): Promise<${modelName} | null> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'findById',
        `await this.prisma.${modelName.toLowerCase()}.findUnique({ where: { id } })`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.findUnique({ where: { id } });\n`;
    }

    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Find ${modelName} by unique constraints\n`;
    code += `   */\n`;
    code += `  async findByUnique(params: {\n`;
    code += `    where: Prisma.${modelName}WhereUniqueInput;\n`;
    code += `  }): Promise<${modelName} | null> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'findByUnique',
        `await this.prisma.${modelName.toLowerCase()}.findUnique({ where: params.where })`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.findUnique({ where: params.where });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates find many method
   */
  private generateFindManyMethod(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Find multiple ${modelName} records\n`;
    code += `   */\n`;
    code += `  async findMany(params?: {\n`;
    code += `    where?: Prisma.${modelName}WhereInput;\n`;
    code += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
    code += `    include?: Prisma.${modelName}Include;\n`;
    code += `  }): Promise<${modelName}[]> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'findMany',
        `await this.prisma.${modelName.toLowerCase()}.findMany(params)`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.findMany(params);\n`;
    }

    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Find first ${modelName} matching criteria\n`;
    code += `   */\n`;
    code += `  async findFirst(params?: {\n`;
    code += `    where?: Prisma.${modelName}WhereInput;\n`;
    code += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
    code += `  }): Promise<${modelName} | null> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'findFirst',
        `await this.prisma.${modelName.toLowerCase()}.findFirst(params)`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.findFirst(params);\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates update method
   */
  private generateUpdateMethod(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Update ${modelName} by ID\n`;
    code += `   */\n`;
    code += `  async update(id: string, data: Prisma.${modelName}UpdateInput): Promise<${modelName}> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'update',
        `await this.prisma.${modelName.toLowerCase()}.update({ where: { id }, data })`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.update({ where: { id }, data });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates delete method
   */
  private generateDeleteMethod(modelName: string, config: PrismaClientGeneratorConfig): string {
    let code = `  /**\n`;
    code += `   * Delete ${modelName} by ID\n`;
    code += `   */\n`;
    code += `  async delete(id: string): Promise<${modelName}> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'delete',
        `await this.prisma.${modelName.toLowerCase()}.delete({ where: { id } })`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.delete({ where: { id } });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates upsert method
   */
  private generateUpsertMethod(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Upsert ${modelName} (create or update)\n`;
    code += `   */\n`;
    code += `  async upsert(params: {\n`;
    code += `    where: Prisma.${modelName}WhereUniqueInput;\n`;
    code += `    create: Prisma.${modelName}CreateInput;\n`;
    code += `    update: Prisma.${modelName}UpdateInput;\n`;
    code += `  }): Promise<${modelName}> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'upsert',
        `await this.prisma.${modelName.toLowerCase()}.upsert(params)`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.upsert(params);\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates count method
   */
  private generateCountMethod(modelName: string, config: PrismaClientGeneratorConfig): string {
    let code = `  /**\n`;
    code += `   * Count ${modelName} records\n`;
    code += `   */\n`;
    code += `  async count(where?: Prisma.${modelName}WhereInput): Promise<number> {\n`;

    if (config.includeErrorHandling) {
      code += this.getErrorHandlingWrapper(
        'count',
        `await this.prisma.${modelName.toLowerCase()}.count({ where })`,
      );
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.count({ where });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates paginated find method
   */
  private generatePaginatedFindMethod(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Paginated find with metadata\n`;
    code += `   */\n`;
    code += `  async findPaginated(params: {\n`;
    code += `    where?: Prisma.${modelName}WhereInput;\n`;
    code += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
    code += `    page?: number;\n`;
    code += `    pageSize?: number;\n`;
    code += `  }): Promise<{\n`;
    code += `    data: ${modelName}[];\n`;
    code += `    metadata: {\n`;
    code += `      total: number;\n`;
    code += `      page: number;\n`;
    code += `      pageSize: number;\n`;
    code += `      totalPages: number;\n`;
    code += `      hasNext: boolean;\n`;
    code += `      hasPrevious: boolean;\n`;
    code += `    };\n`;
    code += `  }> {\n`;
    code += `    const page = params.page ?? 1;\n`;
    code += `    const pageSize = params.pageSize ?? 10;\n`;
    code += `    const skip = (page - 1) * pageSize;\n\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      const [data, total] = await Promise.all([\n`;
      code += `        this.prisma.${modelName.toLowerCase()}.findMany({\n`;
      code += `          where: params.where,\n`;
      code += `          orderBy: params.orderBy,\n`;
      code += `          skip,\n`;
      code += `          take: pageSize,\n`;
      code += `        }),\n`;
      code += `        this.prisma.${modelName.toLowerCase()}.count({ where: params.where }),\n`;
      code += `      ]);\n\n`;
      code += `      const totalPages = Math.ceil(total / pageSize);\n\n`;
      code += `      return {\n`;
      code += `        data,\n`;
      code += `        metadata: {\n`;
      code += `          total,\n`;
      code += `          page,\n`;
      code += `          pageSize,\n`;
      code += `          totalPages,\n`;
      code += `          hasNext: page < totalPages,\n`;
      code += `          hasPrevious: page > 1,\n`;
      code += `        },\n`;
      code += `      };\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('FIND_PAGINATED_FAILED', 'Failed to fetch paginated results', error);\n`;
      code += `    }\n`;
    } else {
      code += `    const [data, total] = await Promise.all([\n`;
      code += `      this.prisma.${modelName.toLowerCase()}.findMany({\n`;
      code += `        where: params.where,\n`;
      code += `        orderBy: params.orderBy,\n`;
      code += `        skip,\n`;
      code += `        take: pageSize,\n`;
      code += `      }),\n`;
      code += `      this.prisma.${modelName.toLowerCase()}.count({ where: params.where }),\n`;
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
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates transaction methods
   */
  private generateTransactionMethods(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Execute multiple operations in a transaction\n`;
    code += `   */\n`;
    code += `  async transaction<T>(\n`;
    code += `    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,\n`;
    code += `  ): Promise<T> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      return await this.prisma.$transaction(callback);\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('TRANSACTION_FAILED', 'Transaction failed', error);\n`;
      code += `    }\n`;
    } else {
      code += `    return await this.prisma.$transaction(callback);\n`;
    }

    code += `  }\n\n`;

    // Batch operations
    code += `  /**\n`;
    code += `   * Create multiple records in a transaction\n`;
    code += `   */\n`;
    code += `  async createMany(data: Prisma.${modelName}CreateManyInput[]): Promise<{ count: number }> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      return await this.prisma.${modelName.toLowerCase()}.createMany({ data });\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('CREATE_MANY_FAILED', 'Failed to create multiple records', error);\n`;
      code += `    }\n`;
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.createMany({ data });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates batch methods
   */
  private generateBatchMethods(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Update multiple records\n`;
    code += `   */\n`;
    code += `  async updateMany(\n`;
    code += `    where: Prisma.${modelName}WhereInput,\n`;
    code += `    data: Prisma.${modelName}UpdateInput,\n`;
    code += `  ): Promise<{ count: number }> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      return await this.prisma.${modelName.toLowerCase()}.updateMany({ where, data });\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('UPDATE_MANY_FAILED', 'Failed to update multiple records', error);\n`;
      code += `    }\n`;
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.updateMany({ where, data });\n`;
    }

    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Delete multiple records\n`;
    code += `   */\n`;
    code += `  async deleteMany(where: Prisma.${modelName}WhereInput): Promise<{ count: number }> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      return await this.prisma.${modelName.toLowerCase()}.deleteMany({ where });\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('DELETE_MANY_FAILED', 'Failed to delete multiple records', error);\n`;
      code += `    }\n`;
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.deleteMany({ where });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates soft delete method
   */
  private generateSoftDeleteMethod(modelName: string, config: PrismaClientGeneratorConfig): string {
    let code = `  /**\n`;
    code += `   * Soft delete ${modelName} by ID (sets deletedAt timestamp)\n`;
    code += `   */\n`;
    code += `  async softDelete(id: string): Promise<${modelName}> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      return await this.prisma.${modelName.toLowerCase()}.update({\n`;
      code += `        where: { id },\n`;
      code += `        data: { deletedAt: new Date() } as Prisma.InputType<Prisma.${modelName}UpdateInput>,\n`;
      code += `      });\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('SOFT_DELETE_FAILED', 'Failed to soft delete record', error);\n`;
      code += `    }\n`;
    } else {
      code += `    return await this.prisma.${modelName.toLowerCase()}.update({\n`;
      code += `      where: { id },\n`;
      code += `      data: { deletedAt: new Date() } as Prisma.InputType<Prisma.${modelName}UpdateInput>,\n`;
      code += `    });\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates helper methods
   */
  private generateHelperMethods(
    modelName: string,
    fields: PrismaModelField[],
    config: PrismaClientGeneratorConfig,
  ): string {
    let code = `  /**\n`;
    code += `   * Check if record exists\n`;
    code += `   */\n`;
    code += `  async exists(where: Prisma.${modelName}WhereUniqueInput): Promise<boolean> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      const count = await this.prisma.${modelName.toLowerCase()}.count({ where });\n`;
      code += `      return count > 0;\n`;
      code += `    } catch (error) {\n`;
      code += `      throw new RepositoryError('EXISTS_CHECK_FAILED', 'Failed to check if record exists', error);\n`;
      code += `    }\n`;
    } else {
      code += `    const count = await this.prisma.${modelName.toLowerCase()}.count({ where });\n`;
      code += `    return count > 0;\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Get error handling wrapper code
   */
  private getErrorHandlingWrapper(operation: string, operationCall: string): string {
    return `    try {
      return await ${operationCall};
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new RepositoryError(
          error.code,
          \`Database error: \${error.message}\`,
          error,
        );
      }
      throw new RepositoryError(
        '${operation.toUpperCase()}_FAILED',
        \`Failed to ${operation}\`,
        error,
      );
    }`;
  }

  /**
   * Generates interface code
   */
  private generateInterfaceCode(
    model: PrismaModelDefinition,
    config: PrismaClientGeneratorConfig,
  ): string {
    const modelName = model.name;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    let code = `// Repository Interface for ${modelName}\n\n`;
    code += `import { Prisma, ${modelName} } from '${config.prismaImportPath}';\n\n`;

    code += `export interface I${modelName}Repository {\n`;
    code += `  create(data: Prisma.${modelName}CreateInput): Promise<${modelName}>;\n`;
    code += `  findById(id: string): Promise<${modelName} | null>;\n`;
    code += `  findByUnique(params: { where: Prisma.${modelName}WhereUniqueInput }): Promise<${modelName} | null>;\n`;
    code += `  findMany(params?: {\n`;
    code += `    where?: Prisma.${modelName}WhereInput;\n`;
    code += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
    code += `    include?: Prisma.${modelName}Include;\n`;
    code += `  }): Promise<${modelName}[]>;\n`;
    code += `  findFirst(params?: {\n`;
    code += `    where?: Prisma.${modelName}WhereInput;\n`;
    code += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
    code += `  }): Promise<${modelName} | null>;\n`;
    code += `  update(id: string, data: Prisma.${modelName}UpdateInput): Promise<${modelName}>;\n`;
    code += `  delete(id: string): Promise<${modelName}>;\n`;
    code += `  upsert(params: {\n`;
    code += `    where: Prisma.${modelName}WhereUniqueInput;\n`;
    code += `    create: Prisma.${modelName}CreateInput;\n`;
    code += `    update: Prisma.${modelName}UpdateInput;\n`;
    code += `  }): Promise<${modelName}>;\n`;
    code += `  count(where?: Prisma.${modelName}WhereInput): Promise<number>;\n`;

    if (config.includePagination) {
      code += `  findPaginated(params: {\n`;
      code += `    where?: Prisma.${modelName}WhereInput;\n`;
      code += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
      code += `    page?: number;\n`;
      code += `    pageSize?: number;\n`;
      code += `  }): Promise<{\n`;
      code += `    data: ${modelName}[];\n`;
      code += `    metadata: {\n`;
      code += `      total: number;\n`;
      code += `      page: number;\n`;
      code += `      pageSize: number;\n`;
      code += `      totalPages: number;\n`;
      code += `      hasNext: boolean;\n`;
      code += `      hasPrevious: boolean;\n`;
      code += `    };\n`;
      code += `  }>;\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates repository implementation code
   */
  private generateRepositoryCode(
    model: PrismaModelDefinition,
    config: PrismaClientGeneratorConfig,
  ): string {
    const modelName = model.name;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    let code = `// Extended Repository with additional features for ${modelName}\n\n`;
    code += `import { PrismaClient, ${modelName}, Prisma } from '${config.prismaImportPath}';\n`;
    code += `import { I${modelName}Repository } from './${modelName}.interface';\n\n`;

    if (config.includeCaching) {
      code += `// Simple in-memory cache (consider using Redis for production)\n`;
      code += `class CacheManager {\n`;
      code += `  private cache = new Map<string, { data: unknown; expiry: number }>();\n`;
      code += `  private readonly DEFAULT_TTL = 60000; // 1 minute\n\n`;
      code += `  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {\n`;
      code += `    this.cache.set(key, { data: value, expiry: Date.now() + ttl });\n`;
      code += `  }\n\n`;
      code += `  get<T>(key: string): T | null {\n`;
      code += `    const item = this.cache.get(key);\n`;
      code += `    if (!item) return null;\n`;
      code += `    if (Date.now() > item.expiry) {\n`;
      code += `      this.cache.delete(key);\n`;
      code += `      return null;\n`;
      code += `    }\n`;
      code += `    return item.data as T;\n`;
      code += `  }\n\n`;
      code += `  clear(): void {\n`;
      code += `    this.cache.clear();\n`;
      code += `  }\n`;
      code += `}\n\n`;
    }

    code += `/**\n`;
    code += ` * Extended repository with caching and advanced features\n`;
    code += ` */\n`;
    code += `export class Extended${modelName}Repository extends ${modelName}Repository implements I${modelName}Repository {\n`;

    if (config.includeCaching) {
      code += `  private cache = new CacheManager();\n\n`;
    }

    code += `  constructor(prisma: PrismaClient) {\n`;
    code += `    super(prisma);\n`;
    code += `  }\n\n`;

    if (config.includeCaching) {
      code += `  /**\n`;
      code += `   * Find by ID with caching\n`;
      code += `   */\n`;
      code += `  async findById(id: string): Promise<${modelName} | null> {\n`;
      code += `    const cacheKey = \`${modelName}:\${id}\`;\n`;
      code += `    const cached = this.cache.get<${modelName}>(cacheKey);\n`;
      code += `    if (cached) return cached;\n\n`;
      code += `    const result = await super.findById(id);\n`;
      code += `    if (result) this.cache.set(cacheKey, result);\n`;
      code += `    return result;\n`;
      code += `  }\n\n`;

      code += `  /**\n`;
      code += `   * Clear cache for this model\n`;
      code += `   */\n`;
      code += `  clearCache(): void {\n`;
      code += `    this.cache.clear();\n`;
      code += `  }\n\n`;
    }

    if (config.includeValidation) {
      code += `  /**\n`;
      code += `   * Validate data before create\n`;
      code += `   */\n`;
      code += `  async createWithValidation(data: Prisma.${modelName}CreateInput): Promise<${modelName}> {\n`;
      code += `    // Add custom validation logic here\n`;
      code += `    // Example: email validation, unique constraints, etc.\n`;
      code += `    return this.create(data);\n`;
      code += `  }\n\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Creates the repository files at the specified path
   */
  public async createRepositoryFiles(
    outputPath: string,
    result: GeneratedPrismaClientWrapper,
  ): Promise<void> {
    const mainUri = vscode.Uri.file(path.join(outputPath, result.fileName));
    const directory = path.dirname(mainUri.fsPath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write main repository file
    await vscode.workspace.fs.writeFile(mainUri, Buffer.from(result.code, 'utf-8'));

    this.logger.info('Prisma repository files created', {
      mainFile: result.fileName,
      hasInterface: !!result.interfaceCode,
      hasRepository: !!result.repositoryCode,
    });

    // Write interface file if exists
    if (result.interfaceCode) {
      const interfacePath = result.fileName.replace('.repository.ts', '.interface.ts');
      const interfaceUri = vscode.Uri.file(path.join(outputPath, interfacePath));
      await vscode.workspace.fs.writeFile(interfaceUri, Buffer.from(result.interfaceCode, 'utf-8'));
    }

    // Write extended repository if exists
    if (result.repositoryCode) {
      const extendedPath = result.fileName.replace('.repository.ts', '.extended.ts');
      const extendedUri = vscode.Uri.file(path.join(outputPath, extendedPath));
      await vscode.workspace.fs.writeFile(extendedUri, Buffer.from(result.repositoryCode, 'utf-8'));
    }
  }
}
