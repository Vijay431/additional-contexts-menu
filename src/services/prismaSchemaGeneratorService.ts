import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface PrismaSchemaGeneratorConfig {
  enabled: boolean;
  includeComments: boolean;
  includeIndexes: boolean;
  defaultSchemaPath: string;
  defaultDataSourceProvider:
    | 'postgresql'
    | 'mysql'
    | 'sqlite'
    | 'sqlserver'
    | 'mongodb'
    | 'cockroachdb';
  generateRelations: boolean;
  generateMigrations: boolean;
  idFieldType: 'Int' | 'String' | 'UUID';
}

export interface PrismaField {
  name: string;
  type: string;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  isIndexed: boolean;
  isList: boolean;
  hasDefault: boolean;
  defaultValue?: string;
  attributes?: string[];
  relation?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    targetModel: string;
    foreignKey?: string;
    references?: string;
    onDelete?: 'Cascade' | 'SetNull' | 'Restrict' | 'NoAction';
  };
  description?: string;
}

export interface PrismaModel {
  name: string;
  tableName?: string;
  fields: PrismaField[];
  description?: string;
  indexes?: Array<{
    name: string;
    fields: string[];
    isUnique: boolean;
  }>;
}

export interface PrismaDataSource {
  provider: string;
  url: string;
}

export interface PrismaSchemaResult {
  schemaCode: string;
  models: PrismaModel[];
  dataSource: PrismaDataSource;
}

/**
 * Service for generating Prisma schema files from TypeScript interfaces
 * or manual creation with proper field types, relations, indexes, and constraints
 */
export class PrismaSchemaGeneratorService {
  private static instance: PrismaSchemaGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PrismaSchemaGeneratorService {
    PrismaSchemaGeneratorService.instance ??= new PrismaSchemaGeneratorService();
    return PrismaSchemaGeneratorService.instance;
  }

  /**
   * Generates a Prisma schema based on user input
   */
  public async generateSchema(
    workspacePath: string,
    config: PrismaSchemaGeneratorConfig,
  ): Promise<PrismaSchemaResult | null> {
    // Setup data source
    const dataSource = await this.setupDataSource(config);

    // Collect models
    const models = await this.collectModels(config);

    if (!models || models.length === 0) {
      vscode.window.showWarningMessage('No models defined. Schema generation cancelled.');
      return null;
    }

    // Generate schema code
    const schemaCode = this.generateSchemaCode(models, dataSource, config);

    this.logger.info('Prisma schema generated', {
      modelCount: models.length,
      dataSourceProvider: dataSource.provider,
    });

    return {
      schemaCode,
      models,
      dataSource,
    };
  }

  /**
   * Sets up the data source configuration
   */
  private async setupDataSource(config: PrismaSchemaGeneratorConfig): Promise<PrismaDataSource> {
    // Get database URL or use default
    const urlInput = await vscode.window.showInputBox({
      prompt: 'Enter database connection URL',
      placeHolder: 'postgresql://user:password@localhost:5432/mydb',
      value: this.getDefaultDbUrl(config.defaultDataSourceProvider),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Database URL cannot be empty';
        }
        return null;
      },
    });

    const url = urlInput?.trim() || this.getDefaultDbUrl(config.defaultDataSourceProvider);

    return {
      provider: config.defaultDataSourceProvider,
      url,
    };
  }

  /**
   * Gets default database URL for provider
   */
  private getDefaultDbUrl(provider: string): string {
    const defaults: Record<string, string> = {
      postgresql: 'postgresql://user:password@localhost:5432/mydb',
      mysql: 'mysql://user:password@localhost:3306/mydb',
      sqlite: 'file:./dev.db',
      sqlserver: 'sqlserver://localhost:1433;database=mydb;user=sa;password=password',
      mongodb: 'mongodb://localhost:27017/mydb',
      cockroachdb: 'postgresql://user:password@localhost:26257/mydb',
    };
    return defaults[provider] || 'postgresql://user:password@localhost:5432/mydb';
  }

  /**
   * Collects model definitions through user interaction
   */
  private async collectModels(config: PrismaSchemaGeneratorConfig): Promise<PrismaModel[] | null> {
    const models: PrismaModel[] = [];

    let addMore = true;
    while (addMore) {
      const model = await this.createModel(config);
      if (model) {
        models.push(model);
      }

      if (models.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another model', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another model or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return models.length > 0 ? models : null;
  }

  /**
   * Creates a single model through user interaction
   */
  private async createModel(config: PrismaSchemaGeneratorConfig): Promise<PrismaModel | null> {
    // Get model name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter model name (e.g., User, Post, Comment)',
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

    if (!nameInput) {
      return null;
    }

    const modelName = nameInput.trim();

    // Get table name (optional)
    const tableName = await vscode.window.showInputBox({
      prompt: 'Enter table name in database (optional)',
      placeHolder: this.snakeCase(modelName),
    });

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter model description (optional)',
      placeHolder: `The ${modelName} model`,
    });

    // Collect fields
    const fields = await this.collectFields(modelName, config);

    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. Model creation cancelled.');
      return null;
    }

    // Collect indexes
    let indexes: PrismaModel['indexes'] = [];
    if (config.includeIndexes) {
      indexes = await this.collectIndexes(modelName, fields);
    }

    return {
      name: modelName,
      tableName: tableName?.trim() || undefined,
      fields,
      description: description?.trim(),
      indexes,
    };
  }

  /**
   * Collects fields for a model
   */
  private async collectFields(
    modelName: string,
    config: PrismaSchemaGeneratorConfig,
  ): Promise<PrismaField[] | null> {
    const fields: PrismaField[] = [];

    // Auto-add id field as primary
    const idField: PrismaField = {
      name: 'id',
      type: config.idFieldType,
      isRequired: true,
      isUnique: true,
      isId: true,
      isIndexed: false,
      isList: false,
      hasDefault: true,
      defaultValue: config.idFieldType === 'UUID' ? 'uuid()' : 'autoincrement()',
      description: 'Primary key',
    };
    fields.push(idField);

    // Add timestamps by default
    const createdAtField: PrismaField = {
      name: 'createdAt',
      type: 'DateTime',
      isRequired: true,
      isUnique: false,
      isId: false,
      isIndexed: false,
      isList: false,
      hasDefault: true,
      defaultValue: 'now()',
      description: 'Creation timestamp',
    };
    fields.push(createdAtField);

    const updatedAtField: PrismaField = {
      name: 'updatedAt',
      type: 'DateTime',
      isRequired: true,
      isUnique: false,
      isId: false,
      isIndexed: false,
      isList: false,
      hasDefault: true,
      defaultValue: 'now()',
      attributes: ['@updatedAt'],
      description: 'Last update timestamp',
    };
    fields.push(updatedAtField);

    let addMore = true;
    while (addMore) {
      const field = await this.createField(modelName, config);
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

    return fields.length > 3 ? fields : null;
  }

  /**
   * Creates a single field through user interaction
   */
  private async createField(
    modelName: string,
    config: PrismaSchemaGeneratorConfig,
  ): Promise<PrismaField | null> {
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
        { label: 'String', value: 'String', description: 'Text data' },
        { label: 'Int', value: 'Int', description: 'Integer number' },
        { label: 'BigInt', value: 'BigInt', description: 'Large integer' },
        { label: 'Float', value: 'Float', description: 'Floating point number' },
        { label: 'Decimal', value: 'Decimal', description: 'Decimal number' },
        { label: 'Boolean', value: 'Boolean', description: 'True/false' },
        { label: 'DateTime', value: 'DateTime', description: 'Date and time' },
        { label: 'Json', value: 'Json', description: 'JSON data' },
        { label: 'Bytes', value: 'Bytes', description: 'Binary data' },
      ],
      { placeHolder: 'Select field data type' },
    );

    if (!typeChoice) {
      return null;
    }

    // Ask if it's a list
    const isListChoice = await vscode.window.showQuickPick(
      [
        { label: 'Single value', value: false },
        { label: 'List (array)', value: true },
      ],
      { placeHolder: 'Is this field a list?' },
    );

    const isList = isListChoice?.value ?? false;

    // Ask if required
    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: true },
        { label: 'Optional', value: false },
      ],
      { placeHolder: 'Is this field required?' },
    );

    const isRequired = requiredChoice?.value ?? false;

    // Ask if unique
    const uniqueChoice = await vscode.window.showQuickPick(
      [
        { label: 'Unique', value: true },
        { label: 'Not unique', value: false },
      ],
      { placeHolder: 'Should this field be unique?' },
    );

    const isUnique = uniqueChoice?.value ?? false;

    // Ask if indexed
    const indexedChoice = await vscode.window.showQuickPick(
      [
        { label: 'Indexed', value: true },
        { label: 'Not indexed', value: false },
      ],
      { placeHolder: 'Should this field be indexed?' },
    );

    const isIndexed = indexedChoice?.value ?? false;

    // Get default value
    const defaultValue = await vscode.window.showInputBox({
      prompt: 'Enter default value (optional)',
      placeHolder: 'e.g., "", false, 0, uuid(), autoincrement(), now()',
    });

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional)',
    });

    // Ask if this is a relation field
    let relation: PrismaField['relation'] | undefined;
    if (config.generateRelations) {
      const relationChoice = await vscode.window.showQuickPick(
        [
          { label: 'No (regular field)', value: 'none' },
          { label: 'One-to-One', value: 'one-to-one' },
          { label: 'Many-to-One', value: 'many-to-one' },
          { label: 'One-to-Many', value: 'one-to-many' },
          { label: 'Many-to-Many', value: 'many-to-many' },
        ],
        { placeHolder: 'Is this a relation field?' },
      );

      if (relationChoice && relationChoice.value !== 'none') {
        const targetModel = await vscode.window.showInputBox({
          prompt: 'Enter target model name',
          placeHolder: 'Profile',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Target model cannot be empty';
            }
            if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
              return 'Model name must start with uppercase letter';
            }
            return null;
          },
        });

        if (!targetModel) {
          return null;
        }

        relation = {
          type: relationChoice.value as PrismaField['relation']['type'],
          targetModel: targetModel.trim(),
        };

        // For one-to-one and many-to-one, ask for foreign key
        if (relationChoice.value === 'one-to-one' || relationChoice.value === 'many-to-one') {
          const foreignKey = await vscode.window.showInputBox({
            prompt: 'Enter foreign key field name',
            placeHolder: `${targetModel.trim().toLowerCase()}Id`,
          });

          if (foreignKey) {
            relation.foreignKey = foreignKey.trim();
          }

          const onDelete = await vscode.window.showQuickPick(
            [
              { label: 'Cascade (delete related)', value: 'Cascade' },
              { label: 'SetNull (set to null)', value: 'SetNull' },
              { label: 'Restrict (prevent deletion)', value: 'Restrict' },
              { label: 'NoAction', value: 'NoAction' },
            ],
            { placeHolder: 'On delete behavior' },
          );

          if (onDelete) {
            relation.onDelete = onDelete.value;
          }
        }
      }
    }

    // Collect attributes
    const attributes: string[] = [];
    if (typeChoice.value === 'String' && !isList) {
      const addAttribute = await vscode.window.showQuickPick(
        [
          { label: '@db.Text', value: '@db.Text', description: 'Use TEXT type' },
          { label: 'None', value: 'none' },
        ],
        { placeHolder: 'Add database-specific attribute?' },
      );

      if (addAttribute && addAttribute.value !== 'none') {
        attributes.push(addAttribute.value);
      }
    }

    return {
      name: fieldName,
      type: typeChoice.value,
      isRequired,
      isUnique,
      isId: false,
      isIndexed,
      isList,
      hasDefault: !!defaultValue,
      defaultValue: defaultValue?.trim(),
      attributes: attributes.length > 0 ? attributes : undefined,
      relation,
      description: description?.trim(),
    };
  }

  /**
   * Collects indexes for a model
   */
  private async collectIndexes(
    modelName: string,
    fields: PrismaField[],
  ): Promise<Array<{ name: string; fields: string[]; isUnique: boolean }> | undefined> {
    const indexes: Array<{ name: string; fields: string[]; isUnique: boolean }> = [];

    const indexableFields = fields.filter((f) => !f.isId && !f.relation);

    if (indexableFields.length === 0) {
      return undefined;
    }

    let addMore = true;
    while (addMore) {
      const fieldChoices = indexableFields.map((f) => ({
        label: f.name,
        value: f.name,
        picked: false,
      }));

      const selectedFields = await vscode.window.showQuickPick(fieldChoices, {
        placeHolder: 'Select fields for index',
        canPickMany: true,
      });

      if (selectedFields && selectedFields.length > 0) {
        const indexName = await vscode.window.showInputBox({
          prompt: 'Enter index name',
          placeHolder: `${modelName}_${selectedFields[0].value}_idx`,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Index name cannot be empty';
            }
            return null;
          },
        });

        if (indexName) {
          const isUniqueChoice = await vscode.window.showQuickPick(
            [
              { label: 'Unique index', value: true },
              { label: 'Non-unique index', value: false },
            ],
            { placeHolder: 'Is this a unique index?' },
          );

          indexes.push({
            name: indexName.trim(),
            fields: selectedFields.map((f) => f.value),
            isUnique: isUniqueChoice?.value ?? false,
          });
        }

        const addAnother = await vscode.window.showQuickPick(
          [
            { label: 'Add another index', value: 'add' },
            { label: 'Done', value: 'done' },
          ],
          { placeHolder: 'Add another index?' },
        );

        if (!addAnother || addAnother.value === 'done') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return indexes.length > 0 ? indexes : undefined;
  }

  /**
   * Generates the schema code from models
   */
  private generateSchemaCode(
    models: PrismaModel[],
    dataSource: PrismaDataSource,
    config: PrismaSchemaGeneratorConfig,
  ): string {
    let code = '';

    // Header
    code += `// This is your Prisma schema file,\n`;
    code += `// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n`;

    // Data source
    code += `datasource db {\n`;
    code += `  provider = "${dataSource.provider}"\n`;
    code += `  url      = env("DATABASE_URL")\n`;
    code += `}\n\n`;

    // Generator
    code += `generator client {\n`;
    code += `  provider = "prisma-client-js"\n`;
    if (config.generateMigrations) {
      code += `  previewFeatures = ["migrations"]\n`;
    }
    code += `}\n\n`;

    // Generate each model
    for (const model of models) {
      code += this.generateModelCode(model, config);
      code += '\n';
    }

    return code;
  }

  /**
   * Generates code for a single model
   */
  private generateModelCode(model: PrismaModel, config: PrismaSchemaGeneratorConfig): string {
    let code = '';

    // Add description
    if (config.includeComments && model.description) {
      code += `/// ${model.description}\n`;
    }

    // Model declaration
    code += `model ${model.name}`;
    if (model.tableName) {
      code += ` {\n`;
      code += `  @@map("${model.tableName}")\n`;
    } else {
      code += ` {\n`;
    }

    // Generate fields
    for (const field of model.fields) {
      code += this.generateFieldCode(field, model.name, config);
    }

    // Add indexes
    if (model.indexes && model.indexes.length > 0) {
      code += '\n';
      for (const index of model.indexes) {
        const fieldsStr = index.fields.join(', ');
        if (index.isUnique) {
          code += `  @@unique([${fieldsStr}], map: "${index.name}")\n`;
        } else {
          code += `  @@index([${fieldsStr}], map: "${index.name}")\n`;
        }
      }
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates a single field
   */
  private generateFieldCode(
    field: PrismaField,
    modelName: string,
    config: PrismaSchemaGeneratorConfig,
  ): string {
    let code = '';

    // Add description
    if (config.includeComments && field.description) {
      code += `  /// ${field.description}\n`;
    }

    // Field declaration
    code += `  ${field.name} `;

    // Field type with relation if applicable
    if (field.relation) {
      code += field.relation.targetModel;
    } else {
      code += field.type;
    }

    // List type
    if (field.isList) {
      code += '[]';
    }

    // Optional
    if (!field.isRequired && !field.isList) {
      code += '?';
    }

    // Attributes
    const attributes: string[] = [];

    if (field.isId) {
      attributes.push('@id');
    }

    if (field.isUnique && !field.isId) {
      attributes.push('@unique');
    }

    if (field.isDefault) {
      attributes.push('@default(' + (field.defaultValue || '""') + ')');
    } else if (field.hasDefault && field.defaultValue) {
      attributes.push(`@default(${field.defaultValue})`);
    }

    if (field.attributes) {
      attributes.push(...field.attributes);
    }

    // Relation attributes
    if (field.relation) {
      const relationName = `${modelName}_${field.name}`;
      if (field.relation.type === 'one-to-one') {
        attributes.push(`@relation("${relationName}")`);
        if (field.relation.foreignKey) {
          attributes.push(`@fields(${field.relation.foreignKey})`);
          attributes.push(`@references([id])`);
        }
        if (field.relation.onDelete) {
          attributes.push(`@onDelete(${field.relation.onDelete})`);
        }
      } else if (field.relation.type === 'many-to-one') {
        attributes.push(
          `@relation("${relationName}", fields: [${field.relation.foreignKey || field.relation.targetModel.toLowerCase() + 'Id'}], references: [id])`,
        );
      } else if (field.relation.type === 'one-to-many') {
        attributes.push(
          `@relation("${field.relation.targetModel}_${field.relation.targetModel.toLowerCase()}s")`,
        );
      } else if (field.relation.type === 'many-to-many') {
        attributes.push(`@relation("${relationName}")`);
      }
    }

    // Add attributes to field
    if (attributes.length > 0) {
      code += ' ' + attributes.join(' ');
    }

    code += '\n';

    return code;
  }

  /**
   * Converts string to snake_case
   */
  private snakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  /**
   * Creates the schema file at the specified path
   */
  public async createSchemaFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write schema file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Prisma schema file created', { filePath });
  }

  /**
   * Parses a TypeScript interface to extract fields for Prisma schema
   */
  public async parseInterfaceToSchema(
    interfaceCode: string,
    interfaceName: string,
    config: PrismaSchemaGeneratorConfig,
  ): Promise<PrismaModel | null> {
    const fields: PrismaField[] = [];

    // Add default id field
    fields.push({
      name: 'id',
      type: config.idFieldType,
      isRequired: true,
      isUnique: true,
      isId: true,
      isIndexed: false,
      isList: false,
      hasDefault: true,
      defaultValue: config.idFieldType === 'UUID' ? 'uuid()' : 'autoincrement()',
      description: 'Primary key',
    });

    // Parse interface properties
    const propertyRegex = /(\w+)\s*:\s*([A-Z][\w<>[\],\s]*)\s*[;|]?/g;
    let match;

    while ((match = propertyRegex.exec(interfaceCode)) !== null) {
      const [, name, type] = match;
      const tsType = type.trim();

      const prismaField = this.tsTypeToPrismaField(name, tsType);
      if (prismaField) {
        fields.push(prismaField);
      }
    }

    if (fields.length <= 1) {
      return null;
    }

    return {
      name: interfaceName,
      fields,
      description: `Model generated from ${interfaceName} interface`,
    };
  }

  /**
   * Converts TypeScript type to Prisma field
   */
  private tsTypeToPrismaField(name: string, tsType: string): PrismaField | null {
    const typeMap: Record<string, string> = {
      string: 'String',
      number: 'Int',
      boolean: 'Boolean',
      Date: 'DateTime',
      object: 'Json',
    };

    let prismaType = 'String';
    let isList = false;
    let isRequired = true;

    // Handle arrays
    if (tsType.includes('[]')) {
      isList = true;
      tsType = tsType.replace('[]', '').trim();
    }

    // Handle optional
    if (tsType.endsWith('|') || tsType.includes(' | ')) {
      isRequired = false;
    }

    // Handle common types
    const baseType = tsType.split('|')[0].split('<')[0].trim().toLowerCase();
    prismaType = typeMap[baseType] || 'String';

    // Handle specific types
    if (tsType.includes('UUID')) {
      prismaType = 'String';
    }

    return {
      name,
      type: prismaType,
      isRequired,
      isUnique: false,
      isId: false,
      isIndexed: false,
      isList,
      hasDefault: false,
    };
  }
}
