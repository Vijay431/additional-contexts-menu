import * as path from 'path';
import * as vscode from 'vscode';

import type {
  DTOValidatorField,
  DTOValidatorGenerationResult,
  DTOValidatorOptions,
  DTOValidatorProperty,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type {
  DTOValidatorField,
  DTOValidatorGenerationResult,
  DTOValidatorOptions,
  DTOValidatorProperty,
};

type ValidationRule = DTOValidatorField['validationRules'][number];

/**
 * Service for generating runtime validation decorators for DTOs.
 * Generates class-validator decorators from TypeScript interfaces with custom error messages.
 */
export class DTOValidatorGeneratorService {
  private static instance: DTOValidatorGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): DTOValidatorGeneratorService {
    DTOValidatorGeneratorService.instance ??= new DTOValidatorGeneratorService();
    return DTOValidatorGeneratorService.instance;
  }

  /**
   * Main entry point: Generates validation decorators from TypeScript interface
   */
  public async generateDTOValidatorFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: DTOValidatorOptions,
  ): Promise<DTOValidatorGenerationResult> {
    const selectedText = document.getText(selection);

    // Parse the interface
    const interfaceInfo = this.parseInterface(selectedText);

    if (!interfaceInfo || interfaceInfo.properties.length === 0) {
      throw new Error(
        'Could not parse interface from selection. Please select a valid TypeScript interface.',
      );
    }

    // Convert properties to fields with validation rules
    const fields = await this.convertPropertiesToFields(
      interfaceInfo.properties,
      options,
    );

    // Generate the validator class code
    const classCode = this.generateValidatorClass(
      options.className,
      fields,
      options,
    );

    // Determine file path for the validator
    const classFilePath = this.calculateClassFilePath(document.fileName, options.className);

    this.logger.info('DTO Validator generated', {
      className: options.className,
      propertyCount: interfaceInfo.properties.length,
    });

    return {
      className: options.className,
      properties: interfaceInfo.properties,
      fields,
      classCode,
      filePath: classFilePath,
      originalInterface: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a TypeScript interface to extract property information
   */
  private parseInterface(code: string): { properties: DTOValidatorProperty[] } | null {
    const trimmedCode = code.trim();

    // Match interface declaration: interface Name { ... }
    const interfaceMatch = trimmedCode.match(/interface\s+(\w+)\s*\{([^}]*)\}/s);
    if (!interfaceMatch) {
      // Try to match just the properties part { ... }
      const propertiesMatch = trimmedCode.match(/^\{([^}]*)\}$/s);
      if (!propertiesMatch) {
        return null;
      }
      return this.parsePropertiesBlock(propertiesMatch[1] ?? '');
    }

    const propertiesBlock = interfaceMatch[2] ?? '';
    return this.parsePropertiesBlock(propertiesBlock);
  }

  /**
   * Parses properties block to extract property information
   */
  private parsePropertiesBlock(propertiesStr: string): { properties: DTOValidatorProperty[] } | null {
    const properties: DTOValidatorProperty[] = [];

    // Split properties by semicolon, handling nested objects
    const propList = this.smartSplitProperties(propertiesStr);

    for (const prop of propList) {
      const propertyInfo = this.parseProperty(prop);
      if (propertyInfo) {
        properties.push(propertyInfo);
      }
    }

    return { properties };
  }

  /**
   * Parses a single property from an interface
   */
  private parseProperty(_prop: string): DTOValidatorProperty | null {
    const trimmed = _prop.trim();

    // Skip empty lines
    if (!trimmed || trimmed.startsWith('//')) {
      return null;
    }

    // Extract JSDoc comment if present
    let description: string | undefined;
    const jsDocMatch = trimmed.match(/\/\*\*([^*]|\*(?!\/))*\*\/\s*/);
    if (jsDocMatch) {
      const comment = jsDocMatch[0] ?? '';
      const descMatch = comment.match(/\*\s*([^*]*)/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }
    }

    // Remove JSDoc from property for parsing
    const propWithoutComment = trimmed.replace(/\/\*\*([^*]|\*(?!\/))*\*\/\s*/, '');

    // Match: readonly name?: type, or name: type
    const readonlyMatch = propWithoutComment.match(/^readonly\s+(\w+)\s*:\s*(.+)$/);
    const optionalMatch = propWithoutComment.match(/^(\w+)\?\s*:\s*(.+)$/);
    const regularMatch = propWithoutComment.match(/^(\w+)\s*:\s*(.+)$/);

    let name: string;
    let typeExpression: string;
    let isReadonly = false;
    let isRequired = true;

    if (readonlyMatch) {
      name = readonlyMatch[1] ?? '';
      typeExpression = readonlyMatch[2] ?? '';
      isReadonly = true;
    } else if (optionalMatch) {
      name = optionalMatch[1] ?? '';
      typeExpression = optionalMatch[2] ?? '';
      isRequired = false;
    } else if (regularMatch) {
      name = regularMatch[1] ?? '';
      typeExpression = regularMatch[2] ?? '';
    } else {
      return null;
    }

    // Clean up type expression
    typeExpression = typeExpression
      .replace(/[;,].*$/, '')
      .replace(/\/\/.*$/, '')
      .trim();

    // Check for default value
    let defaultValue: string | undefined;
    const defaultMatch = propWithoutComment.match(/=\s*([^,;]+)[,;]?$/);
    if (defaultMatch && defaultMatch[1]) {
      defaultValue = defaultMatch[1].trim();
    }

    // Check if array
    const isArray = typeExpression.endsWith('[]') || typeExpression.startsWith('Array<');

    // Check if nullable
    const isNullable = typeExpression.includes('null') || typeExpression.includes('undefined');

    const propertyInfo: DTOValidatorProperty = {
      name,
      type: typeExpression,
      isRequired,
      isReadonly,
      isNullable,
      isArray,
    };

    if (description !== undefined) {
      propertyInfo.description = description;
    }

    if (defaultValue !== undefined) {
      propertyInfo.defaultValue = defaultValue;
    }

    return propertyInfo;
  }

  /**
   * Splits properties by semicolon, handling nested objects/arrays
   */
  private smartSplitProperties(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let inComment = false;
    let inBlockComment = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const nextChar = str[i + 1];

      // Handle comments
      if (!inString && !inTemplate) {
        if (char === '/' && nextChar === '/' && !inBlockComment) {
          inComment = true;
          current += char;
          continue;
        }
        if (char === '/' && nextChar === '*' && !inComment) {
          inBlockComment = true;
          current += char;
          continue;
        }
        if (char === '\n' && inComment) {
          inComment = false;
        }
        if (char === '*' && nextChar === '/' && inBlockComment) {
          inBlockComment = false;
          current += char;
          continue;
        }
      }

      if (inComment || inBlockComment) {
        current += char;
        continue;
      }

      // Handle strings and template literals
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || str[i - 1] !== '\\')) {
        if (char === '`') {
          if (!inTemplate) {
            inTemplate = true;
          } else {
            inTemplate = false;
          }
        } else if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString && !inTemplate) {
        if (char === '(' || char === '{' || char === '[' || char === '<') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']' || char === '>') {
          depth--;
        }
      }

      if (char === ';' && depth === 0 && !inString && !inTemplate) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result.filter((s) => s.length > 0);
  }

  /**
   * Converts properties to fields with validation rules
   */
  private async convertPropertiesToFields(
    properties: DTOValidatorProperty[],
    options: DTOValidatorOptions,
  ): Promise<DTOValidatorField[]> {
    const fields: DTOValidatorField[] = [];

    for (const prop of properties) {
      const field: DTOValidatorField = {
        name: prop.name,
        type: prop.type,
        isOptional: !prop.isRequired,
        validationRules: [],
        ...(prop.description !== undefined && { description: prop.description }),
        ...(prop.defaultValue !== undefined && { defaultValue: prop.defaultValue }),
      };

      // Auto-detect validation rules if enabled
      if (options.autoDetectValidations) {
        const detectedRules = this.detectValidationRules(prop, options);
        for (const rule of detectedRules) {
          field.validationRules.push(rule);
        }
      }

      // Allow user to customize validation rules interactively
      const customRules = await this.getCustomValidationRules(prop, options);
      if (customRules && customRules.length > 0) {
        field.validationRules = customRules;
      }

      fields.push(field);
    }

    return fields;
  }

  /**
   * Auto-detects validation rules based on property type and name
   */
  private detectValidationRules(
    prop: DTOValidatorProperty,
    options: DTOValidatorOptions,
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Type-based rules
    const baseType = prop.type.replace('[]', '').replace('Array<', '').replace('>', '').trim();

    switch (baseType) {
      case 'string':
        rules.push({ type: 'IsString' });
        break;
      case 'number':
        rules.push({ type: 'IsNumber' });
        rules.push({ type: 'IsFloat' });
        break;
      case 'boolean':
        rules.push({ type: 'IsBoolean' });
        break;
      case 'Date':
        rules.push({ type: 'IsDate' });
        break;
    }

    // Name-based patterns
    const lowerName = prop.name.toLowerCase();

    if (lowerName.includes('email')) {
      rules.push({ type: 'IsEmail' });
    } else if (lowerName.includes('phone') || lowerName.includes('mobile')) {
      rules.push({ type: 'IsPhoneNumber' });
    } else if (lowerName.includes('url') || lowerName.includes('website') || lowerName.includes('link')) {
      rules.push({ type: 'IsUrl' });
    } else if (lowerName.includes('id') && lowerName.includes('uuid')) {
      rules.push({ type: 'IsUUID' });
    } else if (lowerName.includes('password')) {
      rules.push({ type: 'MinLength', value: 8 });
      rules.push({ type: 'IsNotEmpty' });
    } else if (lowerName.includes('age')) {
      rules.push({ type: 'IsInt' });
      rules.push({ type: 'Min', value: 0 });
      rules.push({ type: 'Max', value: 150 });
    } else if (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('cost')) {
      rules.push({ type: 'IsPositive' });
    }

    // Array type
    if (prop.isArray) {
      rules.push({ type: 'IsArray' });
    }

    // Required fields
    if (prop.isRequired) {
      rules.push({ type: 'IsNotEmpty' });
    } else {
      rules.push({ type: 'IsOptional' });
    }

    // Add custom error messages if enabled
    if (options.customErrorMessage) {
      for (const rule of rules) {
        if (!rule.message) {
          rule.message = this.generateErrorMessage(prop.name, rule.type);
        }
      }
    }

    return rules;
  }

  /**
   * Gets custom validation rules from user
   */
  private async getCustomValidationRules(
    prop: DTOValidatorProperty,
    _options: DTOValidatorOptions,
  ): Promise<ValidationRule[] | undefined> {
    const addRules = await vscode.window.showQuickPick(
      [
        { label: `Add rules for "${prop.name}"`, value: 'yes' },
        { label: 'Skip', value: 'no' },
      ],
      { placeHolder: `Add validation rules for ${prop.name}?` },
    );

    if (!addRules || addRules.value === 'no') {
      return undefined;
    }

    const rules: ValidationRule[] = [];

    let addMore = true;
    while (addMore) {
      const rule = await this.selectValidationRule(prop);
      if (rule) {
        rules.push(rule);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another rule', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another validation rule?' },
      );

      if (!choice || choice.value === 'done') {
        addMore = false;
      }
    }

    return rules.length > 0 ? rules : undefined;
  }

  /**
   * Selects a validation rule
   */
  private async selectValidationRule(
    prop: DTOValidatorProperty,
  ): Promise<ValidationRule | null> {
    const validationOptions = [
      { label: 'IsString', value: 'IsString', description: 'Validates string' },
      { label: 'IsNumber', value: 'IsNumber', description: 'Validates number' },
      { label: 'IsBoolean', value: 'IsBoolean', description: 'Validates boolean' },
      { label: 'IsEmail', value: 'IsEmail', description: 'Validates email format' },
      { label: 'IsUrl', value: 'IsUrl', description: 'Validates URL' },
      { label: 'IsUUID', value: 'IsUUID', description: 'Validates UUID' },
      { label: 'IsDate', value: 'IsDate', description: 'Validates date' },
      { label: 'IsPhoneNumber', value: 'IsPhoneNumber', description: 'Validates phone number' },
      { label: 'IsOptional', value: 'IsOptional', description: 'Marks field as optional' },
      { label: 'IsNotEmpty', value: 'IsNotEmpty', description: 'Validates not empty' },
      { label: 'IsArray', value: 'IsArray', description: 'Validates array' },
      { label: 'Min', value: 'Min', description: 'Minimum value (number)' },
      { label: 'Max', value: 'Max', description: 'Maximum value (number)' },
      { label: 'MinLength', value: 'MinLength', description: 'Minimum length' },
      { label: 'MaxLength', value: 'MaxLength', description: 'Maximum length' },
      { label: 'IsPositive', value: 'IsPositive', description: 'Positive number' },
      { label: 'IsNegative', value: 'IsNegative', description: 'Negative number' },
      { label: 'IsInt', value: 'IsInt', description: 'Integer number' },
      { label: 'IsFloat', value: 'IsFloat', description: 'Float number' },
      { label: 'Matches', value: 'Matches', description: 'Regex pattern match' },
      { label: 'IsAlpha', value: 'IsAlpha', description: 'Letters only' },
      { label: 'IsAlphanumeric', value: 'IsAlphanumeric', description: 'Letters and numbers' },
      { label: 'IsAscii', value: 'IsAscii', description: 'ASCII characters only' },
      { label: 'IsBase64', value: 'IsBase64', description: 'Base64 encoded' },
      { label: 'IsCreditCard', value: 'IsCreditCard', description: 'Credit card number' },
      { label: 'IsCurrency', value: 'IsCurrency', description: 'Currency format' },
      { label: 'IsISO8601', value: 'IsISO8601', description: 'ISO 8601 date format' },
      { label: 'IsJSON', value: 'IsJSON', description: 'JSON string' },
      { label: 'IsLatitude', value: 'IsLatitude', description: 'Latitude coordinate' },
      { label: 'IsLongitude', value: 'IsLongitude', description: 'Longitude coordinate' },
      { label: 'IsMilitaryTime', value: 'IsMilitaryTime', description: 'Military time format' },
    ];

    const choice = await vscode.window.showQuickPick(validationOptions, {
      placeHolder: 'Select validation rule',
    });

    if (!choice) {
      return null;
    }

    let value: number | string | RegExp | undefined;
    let message: string | undefined;

    // Get value for certain validators
    if (choice.value === 'Min' || choice.value === 'Max') {
      const numValue = await vscode.window.showInputBox({
        prompt: `Enter ${choice.label} value`,
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
    } else if (choice.value === 'MinLength' || choice.value === 'MaxLength') {
      const lenValue = await vscode.window.showInputBox({
        prompt: `Enter ${choice.label} value`,
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
    } else if (choice.value === 'Matches') {
      const pattern = await vscode.window.showInputBox({
        prompt: 'Enter regex pattern',
        placeHolder: '^[a-z]+$',
      });
      if (pattern) {
        value = new RegExp(pattern);
      }
    }

    // Get custom error message
    const addMessage = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Add custom error message?' },
    );

    if (addMessage && addMessage.value === 'yes') {
      message = await vscode.window.showInputBox({
        prompt: 'Enter error message',
        placeHolder: this.generateErrorMessage(prop.name, choice.value),
      });
    }

    const result: ValidationRule = {
      type: choice.value as ValidationRule['type'],
      message: message ?? this.generateErrorMessage(prop.name, choice.value),
    };

    if (value !== undefined) {
      result.value = value;
    }

    return result;
  }

  /**
   * Generates error message for a validation rule
   */
  private generateErrorMessage(fieldName: string, ruleType: string): string {
    const readableName = fieldName.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    const readableRule = ruleType.replace(/([A-Z])/g, ' $1').toLowerCase().trim();

    switch (ruleType) {
      case 'IsString':
        return `${readableName} must be a string`;
      case 'IsNumber':
      case 'IsInt':
      case 'IsFloat':
        return `${readableName} must be a number`;
      case 'IsBoolean':
        return `${readableName} must be a boolean`;
      case 'IsEmail':
        return `${readableName} must be a valid email address`;
      case 'IsUrl':
        return `${readableName} must be a valid URL`;
      case 'IsUUID':
        return `${readableName} must be a valid UUID`;
      case 'IsDate':
        return `${readableName} must be a valid date`;
      case 'IsPhoneNumber':
        return `${readableName} must be a valid phone number`;
      case 'IsOptional':
        return `${readableName} is optional`;
      case 'IsNotEmpty':
        return `${readableName} cannot be empty`;
      case 'IsArray':
        return `${readableName} must be an array`;
      case 'Min':
        return `${readableName} must be at least {value}`;
      case 'Max':
        return `${readableName} must be at most {value}`;
      case 'MinLength':
        return `${readableName} must be at least {value} characters`;
      case 'MaxLength':
        return `${readableName} must not exceed {value} characters`;
      case 'IsPositive':
        return `${readableName} must be a positive number`;
      case 'IsNegative':
        return `${readableName} must be a negative number`;
      case 'Matches':
        return `${readableName} format is invalid`;
      case 'IsAlpha':
        return `${readableName} must contain only letters`;
      case 'IsAlphanumeric':
        return `${readableName} must contain only letters and numbers`;
      case 'IsAscii':
        return `${readableName} must contain only ASCII characters`;
      case 'IsBase64':
        return `${readableName} must be base64 encoded`;
      case 'IsCreditCard':
        return `${readableName} must be a valid credit card number`;
      case 'IsCurrency':
        return `${readableName} must be a valid currency amount`;
      case 'IsISO8601':
        return `${readableName} must be in ISO 8601 format`;
      case 'IsJSON':
        return `${readableName} must be a valid JSON string`;
      case 'IsLatitude':
        return `${readableName} must be a valid latitude`;
      case 'IsLongitude':
        return `${readableName} must be a valid longitude`;
      case 'IsMilitaryTime':
        return `${readableName} must be in military time format`;
      default:
        return `${readableName} failed ${readableRule} validation`;
    }
  }

  /**
   * Generates validator class code
   */
  private generateValidatorClass(
    className: string,
    fields: DTOValidatorField[],
    options: DTOValidatorOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(fields, options);

    code += '\n';

    // Add JSDoc for the class
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Data Transfer Object with runtime validation\n`;
      code += ` * Auto-generated with class-validator decorators\n`;
      code += ` */\n`;
    }

    // Generate class declaration
    const exportKeyword = options.exportClass ? 'export ' : '';
    code += `${exportKeyword}class ${className} {\n`;

    // Generate fields with decorators
    code += this.generateFields(fields, options);

    code += '}\n';

    return code;
  }

  /**
   * Generates imports for the validator class
   */
  private generateImports(fields: DTOValidatorField[], options: DTOValidatorOptions): string {
    let imports = "import { ";

    const validationImports = new Set<string>();
    const transformImports = new Set<string>();

    // Collect all validation decorators
    for (const field of fields) {
      for (const rule of field.validationRules) {
        validationImports.add(rule.type);
      }
    }

    // Add type transform decorators if enabled
    if (options.addTransforms) {
      transformImports.add('Type');
      transformImports.add('Transform');
    }

    const importsArray = Array.from(validationImports);

    if (importsArray.length === 0) {
      importsArray.push('IsOptional', 'IsNotEmpty');
    }

    imports += importsArray.join(', ');
    imports += ` } from 'class-validator';\n`;

    if (transformImports.size > 0) {
      imports += `import { ${Array.from(transformImports).join(', ')} } from 'class-transformer';\n`;
    }

    if (options.includeSwagger) {
      imports += `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';\n`;
    }

    return imports;
  }

  /**
   * Generates fields with decorators
   */
  private generateFields(fields: DTOValidatorField[], options: DTOValidatorOptions): string {
    let code = '';

    for (const field of fields) {
      // Add JSDoc for the field
      if (options.includeJSDoc && field.description) {
        code += `  /**\n`;
        code += `   * ${field.description}\n`;
        code += `   */\n`;
      }

      // Add validation decorators
      for (const rule of field.validationRules) {
        const decorator = this.generateValidationDecorator(rule, field.name);
        code += `  ${decorator}\n`;
      }

      // Add Swagger decorator
      if (options.includeSwagger) {
        if (field.isOptional) {
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

      // Add transform decorator if enabled
      if (options.addTransforms) {
        if (field.type === 'string') {
          code += `  @Transform(({ value }) => String(value))\n`;
        } else if (field.type === 'number') {
          code += `  @Transform(({ value }) => Number(value))\n`;
        } else if (field.type === 'boolean') {
          code += `  @Transform(({ value }) => Boolean(value))\n`;
        }
      }

      // Add field property
      const optional = field.isOptional ? '?' : '';
      code += `  ${field.name}${optional}: ${field.type};\n\n`;
    }

    return code;
  }

  /**
   * Generates a validation decorator
   */
  private generateValidationDecorator(
    rule: ValidationRule,
    _fieldName: string,
  ): string {
    let decorator = `@${rule.type}(`;

    // Add value parameter if exists
    if (rule.value !== undefined) {
      if (rule.value instanceof RegExp) {
        decorator += `${rule.value.toString()}`;
      } else if (typeof rule.value === 'string') {
        decorator += `'${rule.value}'`;
      } else {
        decorator += String(rule.value);
      }
    }

    // Add message parameter
    if (rule.message) {
      if (rule.value !== undefined) {
        decorator += ', ';
      }
      let message = rule.message;
      // Replace placeholder with actual value
      if (rule.value !== undefined) {
        message = message.replace('{value}', String(rule.value));
      }
      decorator += `{ message: '${this.escapeString(message)}' }`;
    }

    decorator += ')';

    return decorator;
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
   * Escapes string for use in code
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }

  /**
   * Calculates the file path for the generated validator class
   */
  private calculateClassFilePath(sourceFilePath: string, _className: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);

    // Remove extension from source file
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Create validator file name
    const validatorFileName = `${baseName}.validator.ts`;

    return path.join(sourceDir, validatorFileName);
  }

  /**
   * Creates the validator class file at the specified path
   */
  public async createValidatorFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write validator file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('DTO Validator file created', { filePath });
  }

  /**
   * Checks if a validator file already exists
   */
  public async validatorFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends validator class to existing file
   */
  public async appendValidatorToFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const existingContent = await vscode.workspace.fs.readFile(uri);
    const existingText = Buffer.from(existingContent).toString('utf-8');

    const updatedText = existingText + '\n\n' + code;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(updatedText, 'utf-8'));
    this.logger.info('DTO Validator appended to file', { filePath });
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultClassName?: string,
  ): Promise<DTOValidatorOptions | undefined> {
    // Ask for class name
    const className = await vscode.window.showInputBox({
      prompt: 'Enter DTO class name',
      placeHolder: 'CreateUserDTO',
      value: defaultClassName || 'CreateUserDTO',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Class name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Class name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!className) {
      return undefined;
    }

    // Ask for export option
    const exportClass = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Export the class', value: true },
        { label: 'No', description: 'Keep class local', value: false },
      ],
      {
        placeHolder: 'Export the class?',
      },
    );

    if (!exportClass) {
      return undefined;
    }

    const includeValidation = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include validation decorators', value: true },
        { label: 'No', description: 'Skip validation', value: false },
      ],
      {
        placeHolder: 'Include validation decorators?',
      },
    );

    if (!includeValidation) {
      return undefined;
    }

    return {
      className: className.trim(),
      exportClass: exportClass.value,
      includeValidation: includeValidation.value,
      includeSwagger: true,
      includeJSDoc: true,
      customErrorMessage: true,
      autoDetectValidations: true,
      addTransforms: false,
    };
  }

  /**
   * Shows validator preview and gets user confirmation
   */
  public async showValidatorPreview(result: DTOValidatorGenerationResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.classCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new validator file', value: 'create' },
        {
          label: 'Append to Existing',
          description: 'Append to existing validator file',
          value: 'append',
        },
        { label: 'Copy to Clipboard', description: 'Copy validator code to clipboard', value: 'copy' },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this validator?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.classCode);
      vscode.window.showInformationMessage('DTO Validator code copied to clipboard!');
      return false;
    }

    return true;
  }
}
