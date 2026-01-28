import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NestJSDTOConfig {
  enabled: boolean;
  generateValidation: boolean;
  generateSwagger: boolean;
  defaultDTOSuffix: string;
  createBaseDTO: boolean;
  includePartialDTO: boolean;
  generateExampleComments: boolean;
}

export interface NestJSDTOField {
  name: string;
  type: string;
  isOptional: boolean;
  validationRule?: {
    type:
      | 'IsString'
      | 'IsNumber'
      | 'IsBoolean'
      | 'IsEmail'
      | 'IsDate'
      | 'IsOptional'
      | 'Min'
      | 'Max'
      | 'MinLength'
      | 'MaxLength'
      | 'IsEnum'
      | 'IsArray'
      | 'IsNotEmpty';
    value?: number | string | string[];
  };
  description?: string;
  swaggerExample?: string;
  defaultValue?: string;
}

export interface NestJSDTOGenerationResult {
  entityName: string;
  createDTO: { name: string; code: string };
  updateDTO: { name: string; code: string };
  responseDTO?: { name: string; code: string };
  partialDTO?: { name: string; code: string };
  baseDTO?: { name: string; code: string };
}

/**
 * Service for generating NestJS Data Transfer Objects (DTOs) with validation decorators,
 * TypeScript typing, and Swagger documentation
 */
export class NestJSDTOGeneratorService {
  private static instance: NestJSDTOGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSDTOGeneratorService {
    NestJSDTOGeneratorService.instance ??= new NestJSDTOGeneratorService();
    return NestJSDTOGeneratorService.instance;
  }

  /**
   * Generates DTOs based on user input
   */
  public async generateDTOs(
    _workspacePath: string,
    config: NestJSDTOConfig,
  ): Promise<NestJSDTOGenerationResult | null> {
    // Get entity name
    const entityName = await this.getEntityName();
    if (!entityName) {
      return null;
    }

    // Collect fields for the DTO
    const fields = await this.collectFields();
    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. DTO generation cancelled.');
      return null;
    }

    // Generate base DTO if configured
    let baseDTO: { name: string; code: string } | undefined;
    if (config.createBaseDTO) {
      baseDTO = this.generateBaseDTO(entityName, fields, config);
    }

    // Generate Create DTO
    const createDTO = this.generateCreateDTO(entityName, fields, config, baseDTO);

    // Generate Update DTO
    const updateDTO = this.generateUpdateDTO(entityName, fields, config, baseDTO);

    // Generate Response DTO
    const responseDTO = this.generateResponseDTO(entityName, fields, config, baseDTO);

    // Generate Partial DTO if configured
    let partialDTO: { name: string; code: string } | undefined;
    if (config.includePartialDTO) {
      partialDTO = this.generatePartialDTO(entityName, fields, config, baseDTO);
    }

    this.logger.info('NestJS DTOs generated', {
      entity: entityName,
      fields: fields.length,
    });

    return {
      entityName,
      createDTO,
      updateDTO,
      responseDTO,
      partialDTO,
      baseDTO,
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
   * Collects fields from user
   */
  private async collectFields(): Promise<NestJSDTOField[] | null> {
    const fields: NestJSDTOField[] = [];

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

    return fields.length > 0 ? fields : null;
  }

  /**
   * Creates a single field through user interaction
   */
  private async createField(): Promise<NestJSDTOField | null> {
    // Get field name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter field name (camelCase)',
      placeHolder: 'email',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Field name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Field name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const fieldName = nameInput.trim();

    // Get field type
    const type = await this.getFieldType();

    // Check if field is optional
    const isOptionalChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'required' },
        { label: 'Optional', value: 'optional' },
      ],
      { placeHolder: 'Is this field required?' },
    );

    if (!isOptionalChoice) {
      return null;
    }

    const isOptional = isOptionalChoice.value === 'optional';

    // Get validation rules
    const validationRule = await this.getValidationRule(type);

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional, for Swagger)',
      placeHolder: `The ${fieldName} of the entity`,
    });

    // Get example value
    const swaggerExample = await vscode.window.showInputBox({
      prompt: 'Enter example value for Swagger (optional)',
      placeHolder: this.getDefaultExample(type),
    });

    return {
      name: fieldName,
      type,
      isOptional,
      validationRule,
      description: description?.trim(),
      swaggerExample: swaggerExample?.trim(),
    };
  }

  /**
   * Gets the field type from user
   */
  private async getFieldType(): Promise<string> {
    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string', description: 'Text data' },
        { label: 'number', value: 'number', description: 'Numeric data' },
        { label: 'boolean', value: 'boolean', description: 'True/false' },
        { label: 'Date', value: 'Date', description: 'Date and time' },
        { label: 'string[]', value: 'string[]', description: 'Array of strings' },
        { label: 'number[]', value: 'number[]', description: 'Array of numbers' },
        { label: 'enum', value: 'enum', description: 'Enumeration' },
      ],
      { placeHolder: 'Select field type' },
    );

    if (!typeChoice) {
      return 'string';
    }

    if (typeChoice.value === 'enum') {
      const enumValues = await vscode.window.showInputBox({
        prompt: 'Enter enum values (comma-separated)',
        placeHolder: 'ACTIVE, INACTIVE, PENDING',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Enum values cannot be empty';
          }
          return null;
        },
      });

      if (enumValues) {
        const values = enumValues.split(',').map((v) => v.trim());
        return `'${values.join("' | '")}'`;
      }
    }

    return typeChoice.value;
  }

  /**
   * Gets validation rule for a field
   */
  private async getValidationRule(
    type: string,
  ): Promise<NestJSDTOField['validationRule'] | undefined> {
    const addValidation = await vscode.window.showQuickPick(
      [
        { label: 'Add validation', value: 'yes' },
        { label: 'Skip validation', value: 'no' },
      ],
      { placeHolder: 'Add validation decorator for this field?' },
    );

    if (!addValidation || addValidation.value === 'no') {
      return undefined;
    }

    // Suggest appropriate validations based on type
    const validations: Array<{
      label: string;
      value: NestJSDTOField['validationRule']['type'];
      description: string;
    }> = [
      { label: 'IsString', value: 'IsString', description: 'Validates string' },
      { label: 'IsNumber', value: 'IsNumber', description: 'Validates number' },
      { label: 'IsBoolean', value: 'IsBoolean', description: 'Validates boolean' },
      { label: 'IsEmail', value: 'IsEmail', description: 'Validates email format' },
      { label: 'IsDate', value: 'IsDate', description: 'Validates date' },
      { label: 'IsOptional', value: 'IsOptional', description: 'Marks field as optional' },
      { label: 'IsNotEmpty', value: 'IsNotEmpty', description: 'Validates not empty' },
      { label: 'IsArray', value: 'IsArray', description: 'Validates array' },
      { label: 'Min', value: 'Min', description: 'Minimum value (number)' },
      { label: 'Max', value: 'Max', description: 'Maximum value (number)' },
      { label: 'MinLength', value: 'MinLength', description: 'Minimum length' },
      { label: 'MaxLength', value: 'MaxLength', description: 'Maximum length' },
    ];

    const validationChoice = await vscode.window.showQuickPick(validations, {
      placeHolder: 'Select validation rule',
    });

    if (!validationChoice) {
      return undefined;
    }

    let value: number | string | string[] | undefined;

    if (validationChoice.value === 'Min' || validationChoice.value === 'Max') {
      const numValue = await vscode.window.showInputBox({
        prompt: `Enter ${validationChoice.label} value`,
        placeHolder: '0',
        validateInput: (val) => {
          if (!val || isNaN(Number(val))) {
            return 'Please enter a valid number';
          }
          return null;
        },
      });
      if (numValue) {
        value = Number.parseInt(numValue, 10);
      }
    } else if (validationChoice.value === 'MinLength' || validationChoice.value === 'MaxLength') {
      const lenValue = await vscode.window.showInputBox({
        prompt: `Enter ${validationChoice.label} value`,
        placeHolder: '0',
        validateInput: (val) => {
          if (!val || isNaN(Number(val))) {
            return 'Please enter a valid number';
          }
          return null;
        },
      });
      if (lenValue) {
        value = Number.parseInt(lenValue, 10);
      }
    }

    return {
      type: validationChoice.value,
      value,
    };
  }

  /**
   * Gets default example value for a type
   */
  private getDefaultExample(type: string): string {
    switch (type) {
      case 'string':
        return 'example';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'Date':
        return '2024-01-01';
      case 'string[]':
        return 'item1, item2';
      case 'number[]':
        return '1, 2, 3';
      default:
        return 'example';
    }
  }

  /**
   * Generates base DTO class
   */
  private generateBaseDTO(
    entityName: string,
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
  ): { name: string; code: string } {
    const dtoName = `${entityName}BaseDTO`;
    let code = this.generateImports(fields, config);
    code += '\n';
    code += this.generateDTOClass(dtoName, fields, config, false);
    return { name: dtoName, code };
  }

  /**
   * Generates Create DTO class
   */
  private generateCreateDTO(
    entityName: string,
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
    baseDTO?: { name: string; code: string },
  ): { name: string; code: string } {
    const dtoName = `Create${entityName}${config.defaultDTOSuffix}`;
    let code = this.generateImports(fields, config);

    // Import base DTO if exists
    if (baseDTO) {
      code += `import { ${baseDTO.name} } from './${this.kebabCase(baseDTO.name)}';\n`;
    }

    code += '\n';

    if (baseDTO) {
      code += `export class ${dtoName} extends ${baseDTO.name} {\n`;
    } else {
      code += `export class ${dtoName} {\n`;
    }

    // Only include fields that don't exist in base
    const fieldsToAdd = baseDTO ? [] : fields;
    code += this.generateDTOFields(fieldsToAdd, config, !baseDTO);
    code += '}\n';

    return { name: dtoName, code };
  }

  /**
   * Generates Update DTO class
   */
  private generateUpdateDTO(
    entityName: string,
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
    baseDTO?: { name: string; code: string },
  ): { name: string; code: string } {
    const dtoName = `Update${entityName}${config.defaultDTOSuffix}`;

    // For Update DTO, make all fields optional
    const updateFields = fields.map((f) => ({ ...f, isOptional: true }));

    let code = this.generateImports(updateFields, config);

    // Import base DTO if exists
    if (baseDTO) {
      code += `import { ${baseDTO.name} } from './${this.kebabCase(baseDTO.name)}';\n`;
    }

    // Import Type for partial type
    code += `import { Type } from 'class-transformer';\n`;

    code += '\n';

    if (baseDTO) {
      code += `export class ${dtoName} extends ${baseDTO.name} {\n`;
    } else {
      code += `export class ${dtoName} {\n`;
    }

    // Only include fields that don't exist in base
    const fieldsToAdd = baseDTO ? [] : updateFields;
    code += this.generateDTOFields(fieldsToAdd, config, !baseDTO, true);
    code += '}\n';

    return { name: dtoName, code };
  }

  /**
   * Generates Response DTO class
   */
  private generateResponseDTO(
    entityName: string,
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
    baseDTO?: { name: string; code: string },
  ): { name: string; code: string } {
    const dtoName = `${entityName}ResponseDTO`;
    let code = this.generateImports(fields, config);

    // Import base DTO if exists
    if (baseDTO) {
      code += `import { ${baseDTO.name} } from './${this.kebabCase(baseDTO.name)}';\n`;
    }

    code += '\n';

    if (baseDTO) {
      code += `export class ${dtoName} extends ${baseDTO.name} {\n`;
    } else {
      code += `export class ${dtoName} {\n`;
    }

    // Add id field if not in base
    const fieldsToAdd = baseDTO ? [] : [...fields];

    // Add id field at the beginning
    if (!baseDTO) {
      code += `  @ApiProperty({ description: 'Unique identifier' })\n`;
      code += `  id: string;\n\n`;
    }

    code += this.generateDTOFields(fieldsToAdd, config, !baseDTO);
    code += '}\n';

    return { name: dtoName, code };
  }

  /**
   * Generates Partial DTO class
   */
  private generatePartialDTO(
    entityName: string,
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
    baseDTO?: { name: string; code: string },
  ): { name: string; code: string } {
    const dtoName = `Partial${entityName}${config.defaultDTOSuffix}`;

    // For Partial DTO, make all fields optional
    const partialFields = fields.map((f) => ({ ...f, isOptional: true }));

    let code = this.generateImports(partialFields, config);

    // Import base DTO if exists
    if (baseDTO) {
      code += `import { ${baseDTO.name} } from './${this.kebabCase(baseDTO.name)}';\n`;
    }

    // Import Partial type
    code += `import { Type } from 'class-transformer';\n`;

    code += '\n';

    if (baseDTO) {
      code += `export class ${dtoName} extends ${baseDTO.name} {\n`;
    } else {
      code += `export class ${dtoName} {\n`;
    }

    // Only include fields that don't exist in base
    const fieldsToAdd = baseDTO ? [] : partialFields;
    code += this.generateDTOFields(fieldsToAdd, config, !baseDTO, true);
    code += '}\n';

    return { name: dtoName, code };
  }

  /**
   * Generates imports for DTO
   */
  private generateImports(fields: NestJSDTOField[], config: NestJSDTOConfig): string {
    let imports = 'import { ';

    const validationImports: string[] = [];
    const swaggerImports: string[] = [];

    if (config.generateValidation) {
      const validationTypes = new Set<string>();
      for (const field of fields) {
        if (field.validationRule) {
          validationTypes.add(field.validationRule.type);
        }
      }

      if (validationTypes.size > 0) {
        validationImports.push(...Array.from(validationTypes));
      }

      // Always include common validators
      if (validationImports.length === 0) {
        validationImports.push('IsOptional', 'IsNotEmpty');
      }
    }

    if (config.generateSwagger) {
      swaggerImports.push('ApiProperty', 'ApiPropertyOptional');
    }

    if (validationImports.length > 0) {
      imports += validationImports.join(', ');
    }

    if (swaggerImports.length > 0) {
      if (validationImports.length > 0) {
        imports += ', ';
      }
      imports += `} from '@nestjs/swagger';\nimport { ${swaggerImports.join(', ')} } from '@nestjs/swagger';\n`;
      imports += `import { ${validationImports.join(', ')} } from 'class-validator';\n`;
    } else if (validationImports.length > 0) {
      imports += ` } from 'class-validator';\n`;
    } else {
      imports = "import { ApiProperty } from '@nestjs/swagger';\n";
    }

    return imports;
  }

  /**
   * Generates DTO class content
   */
  private generateDTOClass(
    name: string,
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
    includeId = false,
  ): string {
    let code = `export class ${name} {\n`;

    // Add id field
    if (includeId) {
      code += `  @ApiProperty({ description: 'Unique identifier' })\n`;
      code += `  id: string;\n\n`;
    }

    code += this.generateDTOFields(fields, config, true);
    code += '}\n';

    return code;
  }

  /**
   * Generates DTO fields
   */
  private generateDTOFields(
    fields: NestJSDTOField[],
    config: NestJSDTOConfig,
    includeComments = true,
    allOptional = false,
  ): string {
    let code = '';

    for (const field of fields) {
      const isFieldOptional = allOptional || field.isOptional;

      // Add comment if configured
      if (includeComments && config.generateExampleComments) {
        if (config.generateSwagger) {
          code += `  /**\n`;
          if (field.description) {
            code += `   * ${this.escapeString(field.description)}\n`;
          }
          if (field.swaggerExample) {
            code += `   * @example ${this.escapeString(field.swaggerExample)}\n`;
          }
          code += `   */\n`;
        }
      }

      // Add validation decorators
      if (config.generateValidation && field.validationRule) {
        const decorators = this.generateValidationDecorators(field, isFieldOptional);
        for (const decorator of decorators) {
          code += `  ${decorator}\n`;
        }
      } else if (isFieldOptional && config.generateValidation) {
        code += `  @IsOptional()\n`;
      }

      // Add Swagger decorator
      if (config.generateSwagger) {
        if (isFieldOptional) {
          code += `  @ApiPropertyOptional({\n`;
        } else {
          code += `  @ApiProperty({\n`;
        }
        code += `    type: '${field.type}',\n`;

        if (field.description) {
          code += `    description: '${this.escapeString(field.description)}',\n`;
        }
        if (field.swaggerExample) {
          code += `    example: ${this.formatExample(field.swaggerExample, field.type)},\n`;
        }
        code += `  })\n`;
      }

      // Add field property
      const optional = isFieldOptional ? '?' : '';
      code += `  ${field.name}${optional}: ${field.type};\n\n`;
    }

    return code;
  }

  /**
   * Generates validation decorators for a field
   */
  private generateValidationDecorators(field: NestJSDTOField, isOptional: boolean): string[] {
    const decorators: string[] = [];

    if (!field.validationRule) {
      if (isOptional) {
        decorators.push('@IsOptional()');
      }
      return decorators;
    }

    const rule = field.validationRule;

    switch (rule.type) {
      case 'IsString':
        decorators.push('@IsString()');
        break;
      case 'IsNumber':
        decorators.push('@IsNumber()');
        break;
      case 'IsBoolean':
        decorators.push('@IsBoolean()');
        break;
      case 'IsEmail':
        decorators.push('@IsEmail()');
        break;
      case 'IsDate':
        decorators.push('@IsDate()');
        break;
      case 'IsEnum':
        decorators.push(`@IsEnum(${rule.value})`);
        break;
      case 'IsArray':
        decorators.push('@IsArray()');
        break;
      case 'IsNotEmpty':
        decorators.push('@IsNotEmpty()');
        break;
      case 'Min':
        decorators.push(`@Min(${rule.value})`);
        break;
      case 'Max':
        decorators.push(`@Max(${rule.value})`);
        break;
      case 'MinLength':
        decorators.push(`@MinLength(${rule.value})`);
        break;
      case 'MaxLength':
        decorators.push(`@MaxLength(${rule.value})`);
        break;
      case 'IsOptional':
        decorators.push('@IsOptional()');
        break;
    }

    // Always add IsOptional at the end if field is optional
    if (isOptional && rule.type !== 'IsOptional') {
      decorators.push('@IsOptional()');
    }

    return decorators;
  }

  /**
   * Formats example value for Swagger
   */
  private formatExample(example: string, type: string): string {
    if (type === 'string') {
      return `'${example}'`;
    }
    if (type === 'number') {
      return example;
    }
    if (type === 'boolean') {
      return example.toLowerCase() === 'true' ? 'true' : 'false';
    }
    if (type === 'Date') {
      return `'${example}'`;
    }
    if (type.includes('[]')) {
      return `[${example}]`;
    }
    return `'${example}'`;
  }

  /**
   * Escapes string for use in template literals
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
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
   * Creates the DTO files at the specified path
   */
  public async createDTOFiles(filePath: string, dtos: NestJSDTOGenerationResult): Promise<void> {
    const directory = path.dirname(filePath);

    // Create DTO folder
    const dtoDir = path.join(directory, 'dto');
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(dtoDir));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(dtoDir));
    }

    const dtoFiles = [
      dtos.baseDTO,
      dtos.createDTO,
      dtos.updateDTO,
      dtos.responseDTO,
      dtos.partialDTO,
    ].filter((dto): dto is { name: string; code: string } => dto !== undefined);

    for (const dto of dtoFiles) {
      const dtoPath = path.join(dtoDir, `${this.kebabCase(dto.name)}.ts`);
      const dtoUri = vscode.Uri.file(dtoPath);
      await vscode.workspace.fs.writeFile(dtoUri, Buffer.from(dto.code, 'utf-8'));
    }

    // Create index file
    const indexCode = this.generateIndexFile(dtoFiles);
    const indexPath = path.join(dtoDir, 'index.ts');
    const indexUri = vscode.Uri.file(indexPath);
    await vscode.workspace.fs.writeFile(indexUri, Buffer.from(indexCode, 'utf-8'));

    this.logger.info('DTO files created', { count: dtoFiles.length });
  }

  /**
   * Generates index file for DTOs
   */
  private generateIndexFile(dtos: Array<{ name: string; code: string }>): string {
    let code = '// DTO exports\n\n';

    for (const dto of dtos) {
      code += `export { ${dto.name} } from './${this.kebabCase(dto.name)}';\n`;
    }

    return code;
  }
}
