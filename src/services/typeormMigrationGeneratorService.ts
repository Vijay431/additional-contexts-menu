import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface TypeORMMigrationGeneratorConfig {
  enabled: boolean;
  generateDownSql: boolean;
  includeTransactionWrapper: boolean;
  includeComments: boolean;
  timestampNaming: boolean;
  outputDirectory: string;
  dataSourceName: string;
  safeMode: boolean;
  includeRollback: boolean;
}

export interface TypeORMField {
  name: string;
  type: string;
  isNullable: boolean;
  isUnique: boolean;
  isPrimary: boolean;
  isIndexed: boolean;
  isGenerated: boolean;
  default?: string;
  length?: number;
  isArray: boolean;
  enumValues?: string[];
  relation?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    targetEntity: string;
    cascade?: boolean;
    nullable?: boolean;
  };
}

export interface TypeORMEntityDefinition {
  name: string;
  tableName?: string;
  fields: TypeORMField[];
  indexes?: Array<{
    name: string;
    columns: string[];
    isUnique: boolean;
  }>;
}

export interface TypeORMMigrationResult {
  fileName: string;
  className: string;
  timestamp: string;
  migrationCode: string;
  upSql: string;
  downSql: string | undefined;
  rollbackSql: string | undefined;
}

/**
 * Service for generating TypeORM migrations with up/down SQL,
 * TypeScript typing, and rollback support
 */
export class TypeORMMigrationGeneratorService {
  private static instance: TypeORMMigrationGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): TypeORMMigrationGeneratorService {
    TypeORMMigrationGeneratorService.instance ??= new TypeORMMigrationGeneratorService();
    return TypeORMMigrationGeneratorService.instance;
  }

  /**
   * Generates a TypeORM migration based on entity changes
   */
  public async generateMigration(
    _workspacePath: string,
    config: TypeORMMigrationGeneratorConfig,
  ): Promise<TypeORMMigrationResult | null> {
    // Get migration name/description
    const migrationName = await this.getMigrationName();
    if (!migrationName) {
      return null;
    }

    // Collect entity information
    const entities = await this.collectEntities(config);
    if (!entities || entities.length === 0) {
      vscode.window.showWarningMessage('No entities defined. Migration generation cancelled.');
      return null;
    }

    // Generate migration details
    const timestamp = this.generateTimestamp();
    const className = this.generateClassName(migrationName, timestamp, config);
    const fileName = this.generateFileName(migrationName, timestamp, config);

    // Generate SQL
    const upSql = this.generateUpSql(entities, config);
    let downSql: string | undefined;
    if (config.generateDownSql) {
      downSql = this.generateDownSql(entities, config);
    }

    let rollbackSql: string | undefined;
    if (config.includeRollback) {
      rollbackSql = downSql || this.generateDownSql(entities, config);
    }

    // Generate migration code
    const migrationCode = this.generateMigrationCode(
      className,
      upSql,
      downSql,
      rollbackSql,
      config,
    );

    this.logger.info('TypeORM migration generated', {
      className,
      fileName,
      entityCount: entities.length,
      hasDownSql: !!downSql,
    });

    return {
      fileName,
      className,
      timestamp,
      migrationCode,
      upSql,
      downSql,
      rollbackSql,
    };
  }

  /**
   * Prompts user for migration name
   */
  private async getMigrationName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter migration name (e.g., AddUsersTable, AddEmailColumnToPosts)',
      placeHolder: 'AddUsersTable',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Migration name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Migration name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects entity definitions from user
   */
  private async collectEntities(
    config: TypeORMMigrationGeneratorConfig,
  ): Promise<TypeORMEntityDefinition[] | null> {
    const entities: TypeORMEntityDefinition[] = [];

    let addMore = true;
    while (addMore) {
      const entity = await this.createEntity(config);
      if (entity) {
        entities.push(entity);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another entity', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another entity or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return entities.length > 0 ? entities : null;
  }

  /**
   * Creates a single entity definition
   */
  private async createEntity(
    config: TypeORMMigrationGeneratorConfig,
  ): Promise<TypeORMEntityDefinition | null> {
    // Get entity name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter entity name (e.g., User, Post, Comment)',
      placeHolder: 'User',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Entity name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Entity name must start with uppercase letter';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const entityName = nameInput.trim();

    // Get table name
    const tableName = await vscode.window.showInputBox({
      prompt: 'Enter table name in database',
      placeHolder: this.snakeCase(entityName),
    });

    // Collect fields
    const fields = await this.collectFields(config);
    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. Entity creation cancelled.');
      return null;
    }

    // Collect indexes
    let indexes: TypeORMEntityDefinition['indexes'] = [];
    const shouldAddIndexes = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Add indexes to this table?' },
    );

    if (shouldAddIndexes?.value === 'yes') {
      indexes = await this.collectIndexes(fields);
    }

    return {
      name: entityName,
      tableName: tableName?.trim() || this.snakeCase(entityName),
      fields,
      indexes,
    };
  }

  /**
   * Collects fields for an entity
   */
  private async collectFields(
    config: TypeORMMigrationGeneratorConfig,
  ): Promise<TypeORMField[] | null> {
    const fields: TypeORMField[] = [];

    // Auto-add id field as primary
    const idField: TypeORMField = {
      name: 'id',
      type: 'int',
      isNullable: false,
      isUnique: true,
      isPrimary: true,
      isIndexed: false,
      isGenerated: true,
      isArray: false,
    };
    fields.push(idField);

    let addMore = true;
    while (addMore) {
      const field = await this.createField(config);
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

    // Add timestamps by default
    const createdAtField: TypeORMField = {
      name: 'createdAt',
      type: 'timestamp',
      isNullable: false,
      isUnique: false,
      isPrimary: false,
      isIndexed: false,
      isGenerated: false,
      default: 'CURRENT_TIMESTAMP',
      isArray: false,
    };
    fields.push(createdAtField);

    const updatedAtField: TypeORMField = {
      name: 'updatedAt',
      type: 'timestamp',
      isNullable: false,
      isUnique: false,
      isPrimary: false,
      isIndexed: false,
      isGenerated: false,
      default: 'CURRENT_TIMESTAMP',
      isArray: false,
    };
    fields.push(updatedAtField);

    return fields.length > 3 ? fields : null;
  }

  /**
   * Creates a single field
   */
  private async createField(
    _config: TypeORMMigrationGeneratorConfig,
  ): Promise<TypeORMField | null> {
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
        { label: 'string/varchar', value: 'varchar', description: 'Text data' },
        { label: 'int/integer', value: 'int', description: 'Integer number' },
        { label: 'bigint', value: 'bigint', description: 'Large integer' },
        { label: 'decimal/numeric', value: 'decimal', description: 'Decimal number' },
        { label: 'float/double', value: 'float', description: 'Floating point number' },
        { label: 'boolean', value: 'boolean', description: 'True/false' },
        { label: 'date', value: 'date', description: 'Date without time' },
        { label: 'datetime/timestamp', value: 'timestamp', description: 'Date and time' },
        { label: 'text', value: 'text', description: 'Long text' },
        { label: 'json', value: 'json', description: 'JSON data' },
        { label: 'enum', value: 'enum', description: 'Enumerated type' },
        { label: 'uuid', value: 'uuid', description: 'UUID identifier' },
        { label: 'array', value: 'array', description: 'Array of values' },
      ],
      { placeHolder: 'Select field data type' },
    );

    if (!typeChoice) {
      return null;
    }

    let fieldType = typeChoice.value;
    let enumValues: string[] | undefined;
    let isArray = false;

    // Handle enum values
    if (fieldType === 'enum') {
      const enumInput = await vscode.window.showInputBox({
        prompt: 'Enter enum values (comma-separated)',
        placeHolder: 'active,inactive,pending',
      });
      if (enumInput) {
        enumValues = enumInput.split(',').map((v) => v.trim());
      }
    }

    // Handle array
    if (fieldType === 'array') {
      isArray = true;
      const arrayTypeChoice = await vscode.window.showQuickPick(
        [
          { label: 'string', value: 'varchar' },
          { label: 'int', value: 'int' },
          { label: 'text', value: 'text' },
        ],
        { placeHolder: 'Select array element type' },
      );
      if (arrayTypeChoice) {
        fieldType = arrayTypeChoice.value;
      }
    }

    // Ask if nullable
    const nullableChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required (NOT NULL)', value: 'no' },
        { label: 'Optional (NULL)', value: 'yes' },
      ],
      { placeHolder: 'Is this field nullable?' },
    );

    const isNullable = nullableChoice?.value === 'yes';

    // Ask if unique
    const uniqueChoice = await vscode.window.showQuickPick(
      [
        { label: 'Unique', value: 'yes' },
        { label: 'Not unique', value: 'no' },
      ],
      { placeHolder: 'Should this field be unique?' },
    );

    const isUnique = uniqueChoice?.value === 'yes';

    // Ask if indexed
    const indexedChoice = await vscode.window.showQuickPick(
      [
        { label: 'Indexed', value: 'yes' },
        { label: 'Not indexed', value: 'no' },
      ],
      { placeHolder: 'Should this field be indexed?' },
    );

    const isIndexed = indexedChoice?.value === 'yes';

    // Get default value
    const defaultValue = await vscode.window.showInputBox({
      prompt: 'Enter default value (optional)',
      placeHolder: 'e.g., NULL, \'\', 0, false, CURRENT_TIMESTAMP',
    });

    // Get column length for varchar types
    let length: number | undefined;
    if (fieldType === 'varchar') {
      const lengthInput = await vscode.window.showInputBox({
        prompt: 'Enter varchar length (optional)',
        placeHolder: '255',
        validateInput: (value) => {
          if (value && !/^\d+$/.test(value)) {
            return 'Length must be a number';
          }
          return null;
        },
      });
      if (lengthInput) {
        length = Number.parseInt(lengthInput, 10);
      }
    }

    return {
      name: fieldName,
      type: fieldType,
      isNullable,
      isUnique,
      isPrimary: false,
      isIndexed,
      isGenerated: false,
      default: defaultValue?.trim(),
      length,
      isArray,
      enumValues,
    } as TypeORMField;
  }

  /**
   * Collects indexes for an entity
   */
  private async collectIndexes(
    fields: TypeORMField[],
  ): Promise<Array<{ name: string; columns: string[]; isUnique: boolean }>> {
    const indexes: Array<{ name: string; columns: string[]; isUnique: boolean }> = [];

    const indexableFields = fields.filter((f) => !f.isPrimary);

    if (indexableFields.length === 0) {
      return indexes;
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
          placeHolder: `IDX_${selectedFields[0]?.value?.toUpperCase() || 'FIELD'}`,
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
            columns: selectedFields.map((f) => f.value),
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

    return indexes;
  }

  /**
   * Generates UP SQL for creating tables
   */
  private generateUpSql(
    entities: TypeORMEntityDefinition[],
    config: TypeORMMigrationGeneratorConfig,
  ): string {
    let sql = '';

    if (config.includeComments) {
      sql += '-- Migration UP SQL\n';
      sql += '-- This section contains the SQL to apply the migration\n\n';
    }

    if (config.includeTransactionWrapper) {
      sql += 'BEGIN TRANSACTION;\n\n';
    }

    for (const entity of entities) {
      sql += this.generateCreateTableSql(entity, config);

      // Generate indexes
      if (entity.indexes) {
        for (const index of entity.indexes) {
          sql += this.generateCreateIndexSql(entity.tableName || entity.name, index, config);
        }
      }

      sql += '\n';
    }

    if (config.includeTransactionWrapper) {
      sql += 'COMMIT;\n';
    }

    return sql;
  }

  /**
   * Generates DOWN SQL for rolling back migrations
   */
  private generateDownSql(
    entities: TypeORMEntityDefinition[],
    config: TypeORMMigrationGeneratorConfig,
  ): string {
    let sql = '';

    if (config.includeComments) {
      sql += '-- Migration DOWN SQL\n';
      sql += '-- This section contains the SQL to rollback the migration\n\n';
    }

    if (config.includeTransactionWrapper) {
      sql += 'BEGIN TRANSACTION;\n\n';
    }

    // Drop in reverse order
    for (const entity of [...entities].reverse()) {
      const tableName = entity.tableName || this.snakeCase(entity.name);

      // Drop indexes first
      if (entity.indexes) {
        for (const index of entity.indexes) {
          sql += `DROP INDEX ${index.name};\n`;
        }
      }

      // Drop table
      sql += `DROP TABLE ${tableName};\n\n`;
    }

    if (config.includeTransactionWrapper) {
      sql += 'COMMIT;\n';
    }

    return sql;
  }

  /**
   * Generates CREATE TABLE SQL
   */
  private generateCreateTableSql(
    entity: TypeORMEntityDefinition,
    config: TypeORMMigrationGeneratorConfig,
  ): string {
    const tableName = entity.tableName || this.snakeCase(entity.name);
    let sql = `CREATE TABLE "${tableName}" (\n`;

    const columnDefinitions: string[] = [];

    for (const field of entity.fields) {
      columnDefinitions.push(this.generateColumnDefinition(field, config));
    }

    // Primary key constraint
    const primaryFields = entity.fields.filter((f) => f.isPrimary);
    if (primaryFields.length > 0) {
      const pkNames = primaryFields.map((f) => `"${this.snakeCase(f.name)}"`).join(', ');
      columnDefinitions.push(`PRIMARY KEY (${pkNames})`);
    }

    // Unique constraints
    const uniqueFields = entity.fields.filter((f) => f.isUnique && !f.isPrimary);
    for (const field of uniqueFields) {
      columnDefinitions.push(`CONSTRAINT "UQ_${tableName}_${field.name}" UNIQUE ("${this.snakeCase(field.name)}")`);
    }

    sql += columnDefinitions.map((def) => `  ${def}`).join(',\n');
    sql += `\n);\n\n`;

    return sql;
  }

  /**
   * Generates column definition SQL
   */
  private generateColumnDefinition(field: TypeORMField, config: TypeORMMigrationGeneratorConfig): string {
    const columnName = this.snakeCase(field.name);
    let definition = `"${columnName}" `;

    // Data type
    definition += this.getSqlType(field, config);

    // Array type
    if (field.isArray) {
      definition += '[]';
    }

    // Nullable
    if (!field.isNullable && !field.isPrimary) {
      definition += ' NOT NULL';
    } else if (field.isNullable) {
      definition += ' NULL';
    }

    // Unique
    if (field.isUnique && !field.isPrimary) {
      definition += ' UNIQUE';
    }

    // Default value
    if (field.default !== undefined) {
      definition += ` DEFAULT ${field.default}`;
    }

    // Generated/auto-increment
    if (field.isGenerated && field.isPrimary) {
      definition += ' GENERATED ALWAYS AS IDENTITY';
    }

    return definition;
  }

  /**
   * Gets SQL type for a field
   */
  private getSqlType(field: TypeORMField, _config: TypeORMMigrationGeneratorConfig): string {
    if (field.enumValues && field.enumValues.length > 0) {
      const enumName = `"${field.name}_enum"`;
      return `${enumName}`;
    }

    const typeMap: Record<string, string> = {
      varchar: 'VARCHAR',
      int: 'INTEGER',
      bigint: 'BIGINT',
      decimal: 'DECIMAL',
      float: 'DOUBLE PRECISION',
      boolean: 'BOOLEAN',
      date: 'DATE',
      timestamp: 'TIMESTAMP',
      text: 'TEXT',
      json: 'JSONB',
      uuid: 'UUID',
    };

    let sqlType = typeMap[field.type] || 'VARCHAR';

    // Add length for varchar
    if (field.type === 'varchar' && field.length) {
      sqlType += `(${field.length})`;
    } else if (field.type === 'varchar') {
      sqlType += '(255)';
    }

    return sqlType;
  }

  /**
   * Generates CREATE INDEX SQL
   */
  private generateCreateIndexSql(
    tableName: string,
    index: { name: string; columns: string[]; isUnique: boolean },
    _config: TypeORMMigrationGeneratorConfig,
  ): string {
    const unique = index.isUnique ? 'UNIQUE ' : '';
    const columns = index.columns.map((c) => `"${this.snakeCase(c)}"`).join(', ');
    return `CREATE ${unique}INDEX "${index.name}" ON "${tableName}" (${columns});\n`;
  }

  /**
   * Generates the migration class code
   */
  private generateMigrationCode(
    className: string,
    upSql: string,
    downSql: string | undefined,
    rollbackSql: string | undefined,
    config: TypeORMMigrationGeneratorConfig,
  ): string {
    let code = `import { MigrationInterface, QueryRunner } from 'typeorm';\n\n`;

    if (config.includeComments) {
      code += `/**\n`;
      code += ` * Auto-generated TypeORM migration.\n`;
      code += ` *\n`;
      code += ` * Generated: ${new Date().toISOString()}\n`;
      code += ` */\n`;
    }

    code += `export class ${className} implements MigrationInterface {\n`;
    code += `  name = '${className}';\n\n`;

    // Up method
    code += `  public async up(queryRunner: QueryRunner): Promise<void> {\n`;
    code += this.indentSql(upSql, 4);
    code += `  }\n\n`;

    // Down method
    if (downSql) {
      code += `  public async down(queryRunner: QueryRunner): Promise<void> {\n`;
      code += this.indentSql(downSql, 4);
      code += `  }\n\n`;
    }

    // Rollback method (if enabled)
    if (rollbackSql && config.includeRollback) {
      code += `  /**\n`;
      code += `   * Rollback method (alias for down)\n`;
      code += `   */\n`;
      code += `  public async rollback(queryRunner: QueryRunner): Promise<void> {\n`;
      code += `    await this.down(queryRunner);\n`;
      code += `  }\n\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Indents SQL code for use in TypeScript
   */
  private indentSql(sql: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    const lines = sql.split('\n');

    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed === '') {
          return '';
        }
        return `${indent}await queryRunner.query(\`${trimmed}\`);`;
      })
      .filter((line) => line !== '')
      .join('\n') + '\n';
  }

  /**
   * Generates migration class name
   */
  private generateClassName(migrationName: string, timestamp: string, config: TypeORMMigrationGeneratorConfig): string {
    if (config.timestampNaming) {
      return `${timestamp}${migrationName}`;
    }
    return migrationName;
  }

  /**
   * Generates migration file name
   */
  private generateFileName(migrationName: string, timestamp: string, config: TypeORMMigrationGeneratorConfig): string {
    void this.generateClassName(migrationName, timestamp, config);
    return `${timestamp}-${this.kebabCase(migrationName)}.ts`;
  }

  /**
   * Generates timestamp for migration
   */
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
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
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Creates the migration file at the specified path
   */
  public async createMigrationFile(
    outputPath: string,
    result: TypeORMMigrationResult,
  ): Promise<void> {
    const uri = vscode.Uri.file(path.join(outputPath, result.fileName));
    const directory = path.dirname(uri.fsPath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write migration file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(result.migrationCode, 'utf-8'));

    this.logger.info('TypeORM migration file created', {
      filePath: uri.fsPath,
      className: result.className,
    });
  }

  /**
   * Analyzes entity changes between two states and generates migration
   */
  public async generateMigrationFromDiff(
    oldEntities: TypeORMEntityDefinition[],
    newEntities: TypeORMEntityDefinition[],
    config: TypeORMMigrationGeneratorConfig,
  ): Promise<TypeORMMigrationResult | null> {
    // Find new tables
    const newTables = newEntities.filter(
      (newEntity) => !oldEntities.some((old) => old.name === newEntity.name),
    );

    // Find modified tables
    const modifiedTables = newEntities
      .filter((newEntity) => oldEntities.some((old) => old.name === newEntity.name))
      .map((newEntity) => {
        const oldEntity = oldEntities.find((old) => old.name === newEntity.name)!;
        return {
          old: oldEntity,
          new: newEntity,
        };
      });

    if (newTables.length === 0 && modifiedTables.length === 0) {
      vscode.window.showInformationMessage('No changes detected between entity states.');
      return null;
    }

    const migrationName = await this.getMigrationName();
    if (!migrationName) {
      return null;
    }

    const timestamp = this.generateTimestamp();
    const className = this.generateClassName(migrationName, timestamp, config);
    const fileName = this.generateFileName(migrationName, timestamp, config);

    // Generate ALTER TABLE SQL for modified tables
    let alterSql = '';
    for (const { old, new: newEntity } of modifiedTables) {
      alterSql += this.generateAlterTableSql(old, newEntity, config);
    }

    const upSql = this.generateUpSql(newTables, config) + alterSql;
    const downSql = config.generateDownSql ? this.generateDownSql(newTables, config) : undefined;

    const migrationCode = this.generateMigrationCode(className, upSql, downSql, downSql, config);

    return {
      fileName,
      className,
      timestamp,
      migrationCode,
      upSql,
      downSql,
      rollbackSql: downSql,
    };
  }

  /**
   * Generates ALTER TABLE SQL for schema changes
   */
  private generateAlterTableSql(
    oldEntity: TypeORMEntityDefinition,
    newEntity: TypeORMEntityDefinition,
    config: TypeORMMigrationGeneratorConfig,
  ): string {
    const tableName = newEntity.tableName || this.snakeCase(newEntity.name);
    let sql = '';

    if (config.includeComments) {
      sql += `-- Modify table: ${tableName}\n`;
    }

    // Find new columns
    const oldColumnNames = oldEntity.fields.map((f) => f.name);
    const newColumns = newEntity.fields.filter((f) => !oldColumnNames.includes(f.name));

    for (const column of newColumns) {
      if (column.isPrimary && !oldEntity.fields.some((f) => f.isPrimary)) {
        // Skip primary key in ALTER TABLE (complex operation)
        continue;
      }

      sql += `ALTER TABLE "${tableName}" ADD COLUMN ${this.generateColumnDefinition(column, config)};\n`;
    }

    // Find dropped columns
    const newColumnNames = newEntity.fields.map((f) => f.name);
    const droppedColumns = oldEntity.fields.filter((f) => !newColumnNames.includes(f.name));

    for (const column of droppedColumns) {
      const columnName = this.snakeCase(column.name);
      sql += `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}";\n`;
    }

    // Find modified columns
    const modifiedColumns = newEntity.fields.filter((newField) => {
      const oldField = oldEntity.fields.find((f) => f.name === newField.name);
      if (!oldField) return false;

      return (
        newField.type !== oldField.type ||
        newField.isNullable !== oldField.isNullable ||
        newField.isUnique !== oldField.isUnique ||
        newField.default !== oldField.default
      );
    });

    for (const column of modifiedColumns) {
      const columnName = this.snakeCase(column.name);
      sql += `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${this.getSqlType(column, config)};\n`;

      if (column.isNullable) {
        sql += `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" DROP NOT NULL;\n`;
      } else {
        sql += `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET NOT NULL;\n`;
      }

      if (column.default !== undefined) {
        sql += `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT ${column.default};\n`;
      } else if (!column.isNullable) {
        sql += `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" DROP DEFAULT;\n`;
      }
    }

    return sql + '\n';
  }
}
