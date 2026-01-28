import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NestJSEntityConfig {
  enabled: boolean;
  generateRepository: boolean;
  generateDto: boolean;
  generateValidation: boolean;
  databaseType: 'typeorm' | 'mongoose';
  defaultEntityPath: string;
  generateSwagger: boolean;
}

export interface NestJSEntityField {
  name: string;
  type: string;
  isRequired: boolean;
  isUnique: boolean;
  isPrimary: boolean;
  isIndexed: boolean;
  defaultValue?: string;
  description?: string;
  relation?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    targetEntity: string;
    cascade?: boolean;
    eager?: boolean;
  };
}

export interface GeneratedEntity {
  name: string;
  tableName?: string;
  databaseType: 'typeorm' | 'mongoose';
  fields: NestJSEntityField[];
  imports: string[];
  entityCode: string;
  repositoryCode?: string;
  dtoCode?: string;
}

/**
 * Service for generating NestJS entities (TypeORM or Mongoose) with proper decorators,
 * TypeScript typing, and relations
 */
export class NestJSEntityGeneratorService {
  private static instance: NestJSEntityGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSEntityGeneratorService {
    NestJSEntityGeneratorService.instance ??= new NestJSEntityGeneratorService();
    return NestJSEntityGeneratorService.instance;
  }

  /**
   * Generates a NestJS entity based on user input
   */
  public async generateEntity(
    _workspacePath: string,
    config: NestJSEntityConfig,
  ): Promise<GeneratedEntity | null> {
    // Get entity name
    const entityName = await this.getEntityName();
    if (!entityName) {
      return null;
    }

    // Get table/collection name
    const tableName = await this.getTableName(entityName, config);

    // Collect fields
    const fields = await this.collectFields(config);
    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. Entity generation cancelled.');
      return null;
    }

    // Generate imports based on fields and config
    const imports = this.generateImports(fields, config);

    // Generate entity code
    const entityCode = this.generateEntityCode(entityName, tableName, fields, imports, config);

    // Generate repository if needed
    let repositoryCode: string | undefined;
    if (config.generateRepository) {
      repositoryCode = this.generateRepositoryCode(entityName, config);
    }

    // Generate DTO if needed
    let dtoCode: string | undefined;
    if (config.generateDto) {
      dtoCode = this.generateDtoCode(entityName, fields, config);
    }

    this.logger.info('NestJS entity generated', {
      name: entityName,
      databaseType: config.databaseType,
      fields: fields.length,
    });

    return {
      name: entityName,
      tableName,
      databaseType: config.databaseType,
      fields,
      imports,
      entityCode,
      repositoryCode,
      dtoCode,
    };
  }

  /**
   * Prompts user for entity name
   */
  private async getEntityName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter entity name (e.g., User, Product, Order)',
      placeHolder: 'User',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Entity name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Entity name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for table/collection name
   */
  private async getTableName(
    entityName: string,
    config: NestJSEntityConfig,
  ): Promise<string | undefined> {
    const defaultName = this.snakeCase(entityName);
    const placeholder = config.databaseType === 'typeorm' ? 'users' : 'users';

    const input = await vscode.window.showInputBox({
      prompt:
        config.databaseType === 'typeorm'
          ? 'Enter table name (optional)'
          : 'Enter collection name (optional)',
      placeHolder: placeholder,
      value: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return null; // Allow empty for default
        }
        if (!/^[a-zA-Z0-9_]*$/.test(value)) {
          return config.databaseType === 'typeorm'
            ? 'Table name can only contain letters, numbers, and underscores'
            : 'Collection name can only contain letters, numbers, and underscores';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects entity fields from user
   */
  private async collectFields(config: NestJSEntityConfig): Promise<NestJSEntityField[] | null> {
    const fields: NestJSEntityField[] = [];

    // Auto-add id field as primary
    const idField: NestJSEntityField = {
      name: 'id',
      type: config.databaseType === 'typeorm' ? 'number' : 'string',
      isRequired: true,
      isUnique: true,
      isPrimary: true,
      isIndexed: false,
      description: 'Primary key',
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

    return fields.length > 1 ? fields : null;
  }

  /**
   * Creates a single field through user interaction
   */
  private async createField(config: NestJSEntityConfig): Promise<NestJSEntityField | null> {
    // Get field name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter field name (camelCase)',
      placeHolder: 'email',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Field name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
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
        { label: 'string', value: 'string', description: 'Text data' },
        { label: 'number', value: 'number', description: 'Numeric data' },
        { label: 'boolean', value: 'boolean', description: 'True/false' },
        { label: 'Date', value: 'Date', description: 'Date and time' },
        { label: 'Buffer', value: 'Buffer', description: 'Binary data (Mongoose)' },
        { label: 'Object', value: 'Object', description: 'JSON/object data (Mongoose)' },
        { label: 'array', value: 'array', description: 'Array of values' },
      ],
      { placeHolder: 'Select field data type' },
    );

    if (!typeChoice) {
      return null;
    }

    // Ask if required
    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'yes' },
        { label: 'Optional', value: 'no' },
      ],
      { placeHolder: 'Is this field required?' },
    );

    if (!requiredChoice) {
      return null;
    }

    const isRequired = requiredChoice.value === 'yes';

    // Ask if unique
    const uniqueChoice = await vscode.window.showQuickPick(
      [
        { label: 'Unique', value: 'yes' },
        { label: 'Not unique', value: 'no' },
      ],
      { placeHolder: 'Should this field be unique?' },
    );

    if (!uniqueChoice) {
      return null;
    }

    const isUnique = uniqueChoice.value === 'yes';

    // Ask if indexed
    const indexedChoice = await vscode.window.showQuickPick(
      [
        { label: 'Indexed', value: 'yes' },
        { label: 'Not indexed', value: 'no' },
      ],
      { placeHolder: 'Should this field be indexed?' },
    );

    if (!indexedChoice) {
      return null;
    }

    const isIndexed = indexedChoice.value === 'yes';

    // Get default value
    const defaultValue = await vscode.window.showInputBox({
      prompt: 'Enter default value (optional)',
      placeHolder: 'e.g., "", 0, false, null',
    });

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional)',
    });

    // Ask if this is a relation field
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

    let relation: NestJSEntityField['relation'] | undefined;
    if (relationChoice && relationChoice.value !== 'none') {
      const targetEntity = await vscode.window.showInputBox({
        prompt: 'Enter target entity name',
        placeHolder: 'Profile',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Target entity cannot be empty';
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
            return 'Entity name must start with uppercase letter';
          }
          return null;
        },
      });

      if (!targetEntity) {
        return null;
      }

      relation = {
        type: relationChoice.value as NestJSEntityField['relation']['type'],
        targetEntity: targetEntity.trim(),
        cascade: false,
        eager: false,
      };

      if (relationChoice.value !== 'many-to-many') {
        const cascade = await vscode.window.showQuickPick(
          [
            { label: 'Yes (cascade operations)', value: 'yes' },
            { label: 'No', value: 'no' },
          ],
          { placeHolder: 'Cascade operations?' },
        );

        if (cascade) {
          relation.cascade = cascade.value === 'yes';
        }

        const eager = await vscode.window.showQuickPick(
          [
            { label: 'Yes (always load)', value: 'yes' },
            { label: 'No', value: 'no' },
          ],
          { placeHolder: 'Eager load relation?' },
        );

        if (eager) {
          relation.eager = eager.value === 'yes';
        }
      }
    }

    return {
      name: fieldName,
      type: typeChoice.value,
      isRequired,
      isUnique,
      isPrimary: false,
      isIndexed,
      defaultValue: defaultValue?.trim(),
      description: description?.trim(),
      relation,
    };
  }

  /**
   * Generates imports based on fields and config
   */
  private generateImports(fields: NestJSEntityField[], config: NestJSEntityConfig): string[] {
    const imports = new Set<string>();

    if (config.databaseType === 'typeorm') {
      imports.add('Entity');
      imports.add('Column');
      imports.add('PrimaryGeneratedColumn');

      // Check for relations
      if (fields.some((f) => f.relation)) {
        imports.add('OneToOne');
        imports.add('ManyToOne');
        imports.add('OneToMany');
        imports.add('ManyToMany');
        imports.add('JoinTable');
        imports.add('JoinColumn');
      }

      // Check for indexes
      if (fields.some((f) => f.isIndexed)) {
        imports.add('Index');
      }

      if (config.generateSwagger) {
        imports.add('ApiProperty');
      }
    } else {
      // Mongoose
      imports.add('Prop');
      imports.add('Schema');
      imports.add('SchemaFactory');

      if (fields.some((f) => f.relation)) {
        imports.add('Ref');
        imports.add('Type');
      }

      if (config.generateSwagger) {
        imports.add('ApiProperty');
      }
    }

    if (config.generateValidation) {
      imports.add('IsString');
      imports.add('IsNumber');
      imports.add('IsBoolean');
      imports.add('IsOptional');
      imports.add('IsEmail');
      imports.add('IsDate');
      imports.add('IsEnum');
    }

    return Array.from(imports);
  }

  /**
   * Generates the entity code
   */
  private generateEntityCode(
    entityName: string,
    tableName: string | undefined,
    fields: NestJSEntityField[],
    imports: string[],
    config: NestJSEntityConfig,
  ): string {
    let code = '';

    // Imports
    if (config.databaseType === 'typeorm') {
      code += `import { ${imports.join(', ')} } from '@nestjs/typeorm';\n`;
    } else {
      code += `import { ${imports.join(', ')} } from '@nestjs/mongoose';\n`;
    }

    if (config.generateSwagger) {
      code += `import { ApiProperty } from '@nestjs/swagger';\n`;
    }

    if (config.generateValidation && config.databaseType === 'mongoose') {
      code += `import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail, IsDate } from 'class-validator';\n`;
    }

    if (config.databaseType === 'mongoose') {
      code += `import { Document, ObjectId } from 'mongoose';\n`;
    }

    code += '\n';

    // Schema/Entity decorator
    if (config.databaseType === 'typeorm') {
      code += `@Entity('${tableName || this.snakeCase(entityName)}')\n`;
      if (fields.some((f) => f.isIndexed)) {
        const indexedFields = fields
          .filter((f) => f.isIndexed && !f.isPrimary)
          .map((f) => `'${f.name}'`);
        if (indexedFields.length > 0) {
          code += `@Index([${indexedFields.join(', ')}])\n`;
        }
      }
    } else {
      code += `@Schema({ _id: true })\n`;
    }

    if (config.generateSwagger) {
      code += `@ApiProperty()\n`;
    }

    code += `export class ${entityName}`;

    if (config.databaseType === 'mongoose') {
      code += ` extends Document {\n`;
    } else {
      code += ` {\n`;
    }

    // Generate fields
    for (const field of fields) {
      code += this.generateFieldCode(field, config, entityName);
      code += '\n';
    }

    code += '}\n';

    if (config.databaseType === 'mongoose') {
      code += `\nexport type ${entityName}Document = ${entityName} & Document;\n`;
      code += `export const ${entityName}Schema = SchemaFactory.createForClass(${entityName});\n`;
    }

    return code;
  }

  /**
   * Generates a single field
   */
  private generateFieldCode(
    field: NestJSEntityField,
    config: NestJSEntityConfig,
    entityName: string,
  ): string {
    let code = '';

    // Add Swagger decorator if enabled
    if (config.generateSwagger) {
      const swaggerType = this.getSwaggerType(field.type, config.databaseType);
      const required = field.isRequired ? '' : 'required: false, ';
      const description = field.description
        ? `description: '${this.escapeString(field.description)}', `
        : '';
      code += `  @ApiProperty({ ${required}${description}type: '${swaggerType}' })\n`;
    }

    if (config.databaseType === 'typeorm') {
      // TypeORM decorators
      if (field.isPrimary) {
        code += `  @PrimaryGeneratedColumn()\n`;
      } else if (field.relation) {
        code += this.generateRelationDecorator(field, entityName);
      } else {
        const columnOptions: string[] = [];

        if (!field.isRequired) {
          columnOptions.push('nullable: true');
        }

        if (field.isUnique && !field.isPrimary) {
          columnOptions.push('unique: true');
        }

        if (field.defaultValue !== undefined) {
          columnOptions.push(`default: ${field.defaultValue}`);
        }

        const typeormType = this.getTypeormType(field.type);
        code += `  @Column({ type: '${typeormType}'${columnOptions.length > 0 ? ', ' + columnOptions.join(', ') : ''} })\n`;
      }
    } else {
      // Mongoose decorators
      if (field.relation) {
        code += `  @Prop({ type: ${field.relation.type === 'many-to-many' ? '[String]' : 'mongoose.Schema.Types.ObjectId'}, ref: '${field.relation.targetEntity}' })\n`;
        code += `  ${field.name}: Ref<${field.relation.targetEntity}>;\n`;
        return code;
      } else {
        const propOptions: string[] = [];

        if (!field.isRequired) {
          propOptions.push('required: false');
        }

        if (field.isUnique) {
          propOptions.push('unique: true');
        }

        if (field.defaultValue !== undefined) {
          propOptions.push(`default: ${field.defaultValue}`);
        }

        const propOptionsStr = propOptions.length > 0 ? `{ ${propOptions.join(', ')} }` : '';
        code += `  @Prop(${propOptionsStr})\n`;
      }
    }

    // Field declaration
    if (!field.relation || config.databaseType === 'typeorm') {
      const optional = !field.isRequired ? '?' : '';
      let fieldType = field.type;

      // For arrays, add []
      if (field.relation?.type === 'one-to-many' || field.relation?.type === 'many-to-many') {
        fieldType = field.relation.targetEntity + '[]';
      } else if (field.relation) {
        fieldType = field.relation.targetEntity;
      }

      code += `  ${field.name}${optional}: ${fieldType};`;
    }

    return code;
  }

  /**
   * Generates relation decorators
   */
  private generateRelationDecorator(field: NestJSEntityField, entityName: string): string {
    let code = '';
    const targetEntity = field.relation!.targetEntity;
    const relationType = field.relation!.type;

    if (relationType === 'one-to-one') {
      code += `  @OneToOne(() => ${targetEntity}`;
      if (field.relation!.cascade) {
        code += `, { cascade: true }`;
      }
      code += `)\n`;
      code += `  @JoinColumn()\n`;
    } else if (relationType === 'many-to-one') {
      code += `  @ManyToOne(() => ${targetEntity}`;
      if (field.relation!.cascade) {
        code += `, { cascade: true, eager: ${field.relation!.eager} }`;
      }
      code += `)\n`;
    } else if (relationType === 'one-to-many') {
      code += `  @OneToMany(() => ${targetEntity}, (${targetEntity.toLowerCase()}) => ${targetEntity.toLowerCase()}.${entityName.toLowerCase()})\n`;
    } else if (relationType === 'many-to-many') {
      code += `  @ManyToMany(() => ${targetEntity})\n`;
      code += `  @JoinTable()\n`;
    }

    return code;
  }

  /**
   * Generates repository code
   */
  private generateRepositoryCode(entityName: string, config: NestJSEntityConfig): string {
    let code = '';

    if (config.databaseType === 'typeorm') {
      code += `import { EntityRepository, Repository } from 'typeorm';\n`;
      code += `import { ${entityName} } from './${this.kebabCase(entityName)}.entity';\n\n`;
      code += `@EntityRepository(${entityName})\n`;
      code += `export class ${entityName}Repository extends Repository<${entityName}> {\n`;
      code += `  // Custom repository methods can be added here\n`;
      code += `}\n`;
    } else {
      code += `import { Injectable } from '@nestjs/common';\n`;
      code += `import { InjectModel } from '@nestjs/mongoose';\n`;
      code += `import { Model } from 'mongoose';\n`;
      code += `import { ${entityName}, ${entityName}Document } from './${this.kebabCase(entityName)}.schema';\n\n`;
      code += `@Injectable()\n`;
      code += `export class ${entityName}Repository {\n`;
      code += `  constructor(\n`;
      code += `    @InjectModel(${entityName}.name) private readonly model: Model<${entityName}Document>,\n`;
      code += `  ) {}\n\n`;
      code += `  async create(data: Partial<${entityName}>): Promise<${entityName}Document> {\n`;
      code += `    const created = new this.model(data);\n`;
      code += `    return await created.save();\n`;
      code += `  }\n\n`;
      code += `  async findAll(): Promise<${entityName}Document[]> {\n`;
      code += `    return await this.model.find().exec();\n`;
      code += `  }\n\n`;
      code += `  async findOne(id: string): Promise<${entityName}Document | null> {\n`;
      code += `    return await this.model.findById(id).exec();\n`;
      code += `  }\n\n`;
      code += `  async update(id: string, data: Partial<${entityName}>): Promise<${entityName}Document | null> {\n`;
      code += `    return await this.model.findByIdAndUpdate(id, data, { new: true }).exec();\n`;
      code += `  }\n\n`;
      code += `  async remove(id: string): Promise<${entityName}Document | null> {\n`;
      code += `    return await this.model.findByIdAndDelete(id).exec();\n`;
      code += `  }\n`;
      code += `}\n`;
    }

    return code;
  }

  /**
   * Generates DTO code
   */
  private generateDtoCode(
    entityName: string,
    fields: NestJSEntityField[],
    config: NestJSEntityConfig,
  ): string {
    let code = '';

    // Validation imports
    if (config.generateValidation) {
      code += `import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail, IsDate, IsEnum } from 'class-validator';\n`;
    }

    if (config.generateSwagger) {
      code += `import { ApiProperty } from '@nestjs/swagger';\n`;
    }

    code += '\n';

    // Create DTO
    code += `export class Create${entityName}Dto {\n`;
    for (const field of fields) {
      if (field.isPrimary) continue; // Skip primary key

      const swaggerLine = config.generateSwagger
        ? `  @ApiProperty({ ${field.isRequired ? '' : 'required: false, '}type: '${this.getSwaggerType(field.type, config.databaseType)}' })\n`
        : '';

      const validationLine = config.generateValidation ? this.getValidationDecorator(field) : '';

      const optional = !field.isRequired ? '?' : '';
      code += `${swaggerLine}${validationLine}  ${field.name}${optional}: ${field.type};\n`;
    }
    code += `}\n\n`;

    // Update DTO
    code += `export class Update${entityName}Dto {\n`;
    for (const field of fields) {
      if (field.isPrimary) continue;

      const swaggerLine = config.generateSwagger
        ? `  @ApiProperty({ required: false, type: '${this.getSwaggerType(field.type, config.databaseType)}' })\n`
        : '';

      const validationLine = config.generateValidation
        ? this.getValidationDecorator(field, true)
        : '';

      code += `${swaggerLine}${validationLine}  ${field.name}?: ${field.type};\n`;
    }
    code += `}\n`;

    return code;
  }

  /**
   * Gets validation decorator for a field
   */
  private getValidationDecorator(field: NestJSEntityField, optional = false): string {
    let decorators = '';

    if (optional || !field.isRequired) {
      decorators += `  @IsOptional()\n`;
    }

    switch (field.type) {
      case 'string':
        if (field.name === 'email' || field.name.includes('Email')) {
          decorators += `  @IsEmail()\n`;
        } else {
          decorators += `  @IsString()\n`;
        }
        break;
      case 'number':
        decorators += `  @IsNumber()\n`;
        break;
      case 'boolean':
        decorators += `  @IsBoolean()\n`;
        break;
      case 'Date':
        decorators += `  @IsDate()\n`;
        break;
    }

    return decorators;
  }

  /**
   * Gets Swagger type for a field type
   */
  private getSwaggerType(fieldType: string, databaseType: 'typeorm' | 'mongoose'): string {
    if (databaseType === 'mongoose' && fieldType === 'Buffer') {
      return 'string';
    }
    return fieldType;
  }

  /**
   * Gets TypeORM column type for a field type
   */
  private getTypeormType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      string: 'varchar',
      number: 'int',
      boolean: 'boolean',
      Date: 'timestamp',
      Buffer: 'bytea',
      Object: 'json',
      array: 'simple-array',
    };
    return typeMap[fieldType] || 'varchar';
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
   * Escapes string for use in code
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Creates the entity file at the specified path
   */
  public async createEntityFile(
    filePath: string,
    entityCode: string,
    repositoryCode?: string,
    dtoCode?: string,
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write entity file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(entityCode, 'utf-8'));

    // Create repository file if needed
    if (repositoryCode) {
      const repoPath = filePath.replace(/\.entity\.ts$/, '.repository.ts');
      const repoUri = vscode.Uri.file(repoPath);
      await vscode.workspace.fs.writeFile(repoUri, Buffer.from(repositoryCode, 'utf-8'));
    }

    // Create DTO file if needed
    if (dtoCode) {
      const dtoPath = filePath.replace(/\.entity\.ts$/, '.dto.ts');
      const dtoUri = vscode.Uri.file(dtoPath);
      await vscode.workspace.fs.writeFile(dtoUri, Buffer.from(dtoCode, 'utf-8'));
    }

    this.logger.info('Entity file created', { filePath });
  }
}
