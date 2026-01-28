import * as vscode from 'vscode';

export enum ValidationLibrary {
  Joi = 'joi',
  Zod = 'zod',
}

export interface ValidationField {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
  description?: string;
}

export interface RequestValidatorGeneratorOptions {
  library: ValidationLibrary;
  middlewareName?: string;
  fields: ValidationField[];
  includeBody?: boolean;
  includeQuery?: boolean;
  includeParams?: boolean;
  includeHeaders?: boolean;
  errorStatusCode?: number;
  customErrorMessage?: string;
}

export interface ValidationResultInfo {
  imports: string[];
  middlewareCode: string;
  schemas: string;
  usageExample: string;
  middlewareName: string;
  library: ValidationLibrary;
}

export class RequestValidatorGeneratorService {
  private static instance: RequestValidatorGeneratorService | undefined;

  private constructor() {}

  public static getInstance(): RequestValidatorGeneratorService {
    RequestValidatorGeneratorService.instance ??= new RequestValidatorGeneratorService();
    return RequestValidatorGeneratorService.instance;
  }

  /**
   * Show quick pick to select validation library
   */
  public async selectValidationLibrary(): Promise<ValidationLibrary | undefined> {
    const libraries = [
      {
        label: 'Zod',
        description: 'TypeScript-first schema validation with excellent type inference',
        value: ValidationLibrary.Zod,
      },
      {
        label: 'Joi',
        description: 'Powerful object schema description and validation',
        value: ValidationLibrary.Joi,
      },
    ];

    const selected = await vscode.window.showQuickPick(libraries, {
      placeHolder: 'Select validation library',
      title: 'Validation Library',
    });

    return selected?.value;
  }

  /**
   * Prompt user for middleware name
   */
  public async promptForMiddlewareName(
    defaultName: string = 'validateRequest',
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      placeHolder: 'Enter middleware name',
      value: defaultName,
      title: 'Middleware Name',
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Middleware name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid JavaScript identifier';
        }
        return null;
      },
    });

    return input?.trim();
  }

  /**
   * Show quick pick to select which parts of the request to validate
   */
  public async selectRequestParts(): Promise<
    | {
        includeBody: boolean;
        includeQuery: boolean;
        includeParams: boolean;
        includeHeaders: boolean;
      }
    | undefined
  > {
    const options = [
      { label: 'Body (req.body)', description: 'Validate request body', picked: true },
      { label: 'Query (req.query)', description: 'Validate query parameters', picked: false },
      { label: 'Params (req.params)', description: 'Validate route parameters', picked: false },
      { label: 'Headers (req.headers)', description: 'Validate request headers', picked: false },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select request parts to validate',
      title: 'Request Parts',
      canPickMany: true,
    });

    if (!selected) {
      return undefined;
    }

    const includeBody = selected.some((s) => s.label.includes('Body'));
    const includeQuery = selected.some((s) => s.label.includes('Query'));
    const includeParams = selected.some((s) => s.label.includes('Params'));
    const includeHeaders = selected.some((s) => s.label.includes('Headers'));

    if (!includeBody && !includeQuery && !includeParams && !includeHeaders) {
      await vscode.window.showWarningMessage('Please select at least one request part to validate');
      return undefined;
    }

    return { includeBody, includeQuery, includeParams, includeHeaders };
  }

  /**
   * Prompt user to add validation fields
   */
  public async promptForFields(): Promise<ValidationField[] | undefined> {
    const fields: ValidationField[] = [];

    const addField = async (): Promise<boolean> => {
      const name = await vscode.window.showInputBox({
        placeHolder: 'field_name',
        prompt: 'Enter field name',
        title: 'Field Name',
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return 'Field name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Invalid JavaScript identifier';
          }
          return null;
        },
      });

      if (!name) {
        return false;
      }

      const types = [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Array', value: 'array' },
        { label: 'Object', value: 'object' },
        { label: 'Date', value: 'date' },
        { label: 'Email', value: 'email' },
        { label: 'UUID', value: 'uuid' },
      ];

      const typeSelected = await vscode.window.showQuickPick(types, {
        placeHolder: 'Select field type',
        title: 'Field Type',
      });

      if (!typeSelected) {
        return false;
      }

      const required = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: true, description: 'Field must be present' },
          { label: 'Optional', value: false, description: 'Field is optional' },
        ],
        {
          placeHolder: 'Is this field required?',
          title: 'Required',
        },
      );

      if (!required) {
        return false;
      }

      const validation = await vscode.window.showInputBox({
        placeHolder: 'e.g., min:3, max:50 (leave empty for no additional validation)',
        prompt: 'Enter additional validation rules',
        title: 'Validation Rules',
      });

      const description = await vscode.window.showInputBox({
        placeHolder: 'Field description for error messages',
        prompt: 'Enter field description (optional)',
        title: 'Description',
      });

      const field: ValidationField = {
        name: name.trim(),
        type: typeSelected.value as string,
        required: required.value as boolean,
      };

      const trimmedValidation = validation?.trim();
      if (trimmedValidation) {
        field.validation = trimmedValidation;
      }

      const trimmedDescription = description?.trim();
      if (trimmedDescription) {
        field.description = trimmedDescription;
      }

      fields.push(field);

      return true;
    };

    let keepAdding = true;
    while (keepAdding) {
      const added = await addField();
      if (!added) {
        break;
      }

      const action = await vscode.window.showQuickPick(
        [
          { label: 'Add Another Field', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        {
          placeHolder: 'Add another field or finish',
          title: 'Add Fields',
        },
      );

      if (!action || action.value === 'done') {
        keepAdding = false;
      }
    }

    if (fields.length === 0) {
      await vscode.window.showWarningMessage('At least one field is required');
      return undefined;
    }

    return fields;
  }

  /**
   * Generate validation middleware
   */
  public generateValidator(
    options: RequestValidatorGeneratorOptions,
  ): ValidationResultInfo {
    const {
      library,
      middlewareName = 'validateRequest',
      fields,
      includeBody = true,
      includeQuery = false,
      includeParams = false,
      includeHeaders = false,
      errorStatusCode = 400,
      customErrorMessage,
    } = options;

    if (library === ValidationLibrary.Joi) {
      const joiOptions: Omit<RequestValidatorGeneratorOptions, 'library'> = {
        middlewareName,
        fields,
        includeBody,
        includeQuery,
        includeParams,
        includeHeaders,
        errorStatusCode,
      };
      if (customErrorMessage !== undefined) {
        joiOptions.customErrorMessage = customErrorMessage;
      }
      return this.generateJoiValidator(joiOptions);
    }

    const zodOptions: Omit<RequestValidatorGeneratorOptions, 'library'> = {
      middlewareName,
      fields,
      includeBody,
      includeQuery,
      includeParams,
      includeHeaders,
      errorStatusCode,
    };
    if (customErrorMessage !== undefined) {
      zodOptions.customErrorMessage = customErrorMessage;
    }
    return this.generateZodValidator(zodOptions);
  }

  /**
   * Generate Joi validation middleware
   */
  private generateJoiValidator(options: Omit<RequestValidatorGeneratorOptions, 'library'>): ValidationResultInfo {
    const {
      middlewareName = 'validateRequest',
      fields,
      includeBody = true,
      includeQuery = false,
      includeParams = false,
      includeHeaders = false,
      errorStatusCode = 400,
      customErrorMessage,
    } = options;

    const imports: string[] = ["import Joi from 'joi';"];

    const schemasParts: string[] = [];

    // Generate schemas for each request part
    if (includeBody) {
      const bodySchema = this.generateJoiSchema(fields, 'body');
      schemasParts.push(`// Body validation schema
const bodySchema = ${bodySchema};`);
    }

    if (includeQuery) {
      const querySchema = this.generateJoiSchema(fields, 'query');
      schemasParts.push(`// Query validation schema
const querySchema = ${querySchema};`);
    }

    if (includeParams) {
      const paramsSchema = this.generateJoiSchema(fields, 'params');
      schemasParts.push(`// Parameters validation schema
const paramsSchema = ${paramsSchema};`);
    }

    if (includeHeaders) {
      const headersSchema = this.generateJoiSchema(fields, 'headers');
      schemasParts.push(`// Headers validation schema
const headersSchema = ${headersSchema};`);
    }

    const schemas = schemasParts.join('\n\n');

    // Build middleware validation code
    const validationParts: string[] = [];

    if (includeBody) {
      validationParts.push(`  // Validate request body
  const { error: bodyError, value: bodyValue } = bodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (bodyError) {
    validationErrors.body = bodyError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));\n}`);
    }

    if (includeQuery) {
      validationParts.push(`  // Validate query parameters
  const { error: queryError, value: queryValue } = querySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (queryError) {
    validationErrors.query = queryError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));\n}`);
    }

    if (includeParams) {
      validationParts.push(`  // Validate route parameters
  const { error: paramsError, value: paramsValue } = paramsSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (paramsError) {
    validationErrors.params = paramsError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));\n}`);
    }

    if (includeHeaders) {
      validationParts.push(`  // Validate request headers
  const { error: headersError, value: headersValue } = headersSchema.validate(req.headers, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (headersError) {
    validationErrors.headers = headersError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));\n}`);
    }

    const middlewareCode = `/**
 * ${middlewareName} middleware
 * Validates incoming request data using Joi schemas
${customErrorMessage ? ` * @returns {Function} Express middleware function\n */\n` : ` */\n`}${schemas}

export const ${middlewareName} = (req, res, next) => {
  const validationErrors = {};
${validationParts.join('\n\n')}

  // Check if there are any validation errors
  if (Object.keys(validationErrors).length > 0) {
    return res.status(${errorStatusCode}).json({
      success: false,
      error: '${customErrorMessage || 'Validation failed'}',
      details: validationErrors,
    });
  }

  // Replace request data with validated/transformed values
${includeBody ? '  req.body = bodyValue;' : ''}
${includeQuery ? '  req.query = queryValue;' : ''}
${includeParams ? '  req.params = paramsValue;' : ''}
${includeHeaders ? '  req.headers = headersValue;' : ''}

  next();
};`;

    const usageExample = `// Example usage in Express route
import { ${middlewareName} } from './validators/${middlewareName}';

router.post('/users', ${middlewareName}, (req, res) => {
  // Request data is validated and available in req.body, req.query, etc.
  const { email, name } = req.body;
  // Your route handler logic here
});

// Or with specific route
app.post('/api/users', ${middlewareName}, userController.create);`;

    return {
      imports,
      middlewareCode,
      schemas,
      usageExample,
      middlewareName,
      library: ValidationLibrary.Joi,
    };
  }

  /**
   * Generate Joi schema from fields
   */
  private generateJoiSchema(fields: ValidationField[], _location: string): string {
    const fieldSchemas = fields.map((field) => {
      let schema = this.getJoiFieldType(field.type, field.required);

      if (field.validation) {
        schema = this.applyJoiValidationRules(schema, field.validation);
      }

      if (!field.required) {
        schema += '.optional()';
      }

      if (field.description) {
        schema += `.description('${field.description}')`;
      }

      return `  ${field.name}: ${schema},`;
    });

    return `Joi.object({
${fieldSchemas.join('\n')}
})`;
  }

  /**
   * Get Joi field type
   */
  private getJoiFieldType(type: string, required: boolean): string {
    const baseTypes: Record<string, string> = {
      string: 'Joi.string()',
      number: 'Joi.number()',
      boolean: 'Joi.boolean()',
      array: 'Joi.array()',
      object: 'Joi.object()',
      date: 'Joi.date()',
      email: 'Joi.string().email()',
      uuid: 'Joi.string().uuid()',
    };

    let schema = baseTypes[type] || 'Joi.any()';

    if (required) {
      schema += '.required()';
    }

    return schema;
  }

  /**
   * Apply validation rules to Joi schema
   */
  private applyJoiValidationRules(schema: string, rules: string): string {
    const rulePairs = rules
      .split(',')
      .map((r) => r.trim().split(':'))
      .filter((parts) => parts.length === 2) as [string, string][];
    const ruleMap = new Map(rulePairs);

    if (ruleMap.has('min')) {
      schema += `.min(${ruleMap.get('min')})`;
    }

    if (ruleMap.has('max')) {
      schema += `.max(${ruleMap.get('max')})`;
    }

    if (ruleMap.has('pattern')) {
      schema += `.pattern(${ruleMap.get('pattern')})`;
    }

    if (ruleMap.has('alphanum')) {
      schema += '.alphanum()';
    }

    if (ruleMap.has('email')) {
      if (!schema.includes('.email()')) {
        schema += '.email()';
      }
    }

    return schema;
  }

  /**
   * Generate Zod validation middleware
   */
  private generateZodValidator(options: Omit<RequestValidatorGeneratorOptions, 'library'>): ValidationResultInfo {
    const {
      middlewareName = 'validateRequest',
      fields,
      includeBody = true,
      includeQuery = false,
      includeParams = false,
      includeHeaders = false,
      errorStatusCode = 400,
      customErrorMessage,
    } = options;

    const imports: string[] = ["import { z } from 'zod';"];

    const schemasParts: string[] = [];

    // Generate schemas for each request part
    if (includeBody) {
      const bodySchema = this.generateZodSchema(fields, 'Body');
      schemasParts.push(`// Body validation schema
const ${bodySchema.name} = ${bodySchema.code};`);
    }

    if (includeQuery) {
      const querySchema = this.generateZodSchema(fields, 'Query');
      schemasParts.push(`// Query validation schema
const ${querySchema.name} = ${querySchema.code};`);
    }

    if (includeParams) {
      const paramsSchema = this.generateZodSchema(fields, 'Params');
      schemasParts.push(`// Parameters validation schema
const ${paramsSchema.name} = ${paramsSchema.code};`);
    }

    if (includeHeaders) {
      const headersSchema = this.generateZodSchema(fields, 'Headers');
      schemasParts.push(`// Headers validation schema
const ${headersSchema.name} = ${headersSchema.code};`);
    }

    const schemas = schemasParts.join('\n\n');

    // Build middleware validation code
    const validationParts: string[] = [];

    if (includeBody) {
      const bodySchemaName = this.generateZodSchema(fields, 'Body').name;
      validationParts.push(`  // Validate request body
  const bodyResult = ${bodySchemaName}.safeParse(req.body);
  if (!bodyResult.success) {
    validationErrors.body = bodyResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));\n}`);
    }

    if (includeQuery) {
      const querySchemaName = this.generateZodSchema(fields, 'Query').name;
      validationParts.push(`  // Validate query parameters
  const queryResult = ${querySchemaName}.safeParse(req.query);
  if (!queryResult.success) {
    validationErrors.query = queryResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));\n}`);
    }

    if (includeParams) {
      const paramsSchemaName = this.generateZodSchema(fields, 'Params').name;
      validationParts.push(`  // Validate route parameters
  const paramsResult = ${paramsSchemaName}.safeParse(req.params);
  if (!paramsResult.success) {
    validationErrors.params = paramsResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));\n}`);
    }

    if (includeHeaders) {
      const headersSchemaName = this.generateZodSchema(fields, 'Headers').name;
      validationParts.push(`  // Validate request headers
  const headersResult = ${headersSchemaName}.safeParse(req.headers);
  if (!headersResult.success) {
    validationErrors.headers = headersResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));\n}`);
    }

    const middlewareCode = `/**
 * ${middlewareName} middleware
 * Validates incoming request data using Zod schemas
${customErrorMessage ? ` * @returns {Function} Express middleware function\n */\n` : ` */\n`}${schemas}

export const ${middlewareName} = (req, res, next) => {
  const validationErrors = {};
${validationParts.join('\n\n')}

  // Check if there are any validation errors
  if (Object.keys(validationErrors).length > 0) {
    return res.status(${errorStatusCode}).json({
      success: false,
      error: '${customErrorMessage || 'Validation failed'}',
      details: validationErrors,
    });
  }

  // Replace request data with validated/transformed values
${includeBody ? `  req.body = bodyResult.data;` : ''}
${includeQuery ? `  req.query = queryResult.data;` : ''}
${includeParams ? `  req.params = paramsResult.data;` : ''}
${includeHeaders ? `  req.headers = headersResult.data;` : ''}

  next();
};`;

    const usageExample = `// Example usage in Express route
import { ${middlewareName} } from './validators/${middlewareName}';

router.post('/users', ${middlewareName}, (req, res) => {
  // Request data is validated and type-safe
  const { email, name } = req.body;
  // Your route handler logic here
});

// Or with specific route
app.post('/api/users', ${middlewareName}, userController.create);

// TypeScript types are automatically inferred
interface CreateUserInput {
  email: string;
  name: string;
}`;

    return {
      imports,
      middlewareCode,
      schemas,
      usageExample,
      middlewareName,
      library: ValidationLibrary.Zod,
    };
  }

  /**
   * Generate Zod schema from fields
   */
  private generateZodSchema(fields: ValidationField[], location: string): { name: string; code: string } {
    const schemaName = `${location}Schema`;

    const fieldSchemas = fields.map((field) => {
      let schema = this.getZodFieldType(field.type);

      if (field.validation) {
        schema = this.applyZodValidationRules(schema, field.validation);
      }

      if (!field.required) {
        schema = `z.optional(${schema})`;
      }

      if (field.description) {
        schema += `.describe('${field.description}')`;
      }

      return `  ${field.name}: ${schema},`;
    });

    const code = `z.object({
${fieldSchemas.join('\n')
}})`;

    return { name: schemaName, code };
  }

  /**
   * Get Zod field type
   */
  private getZodFieldType(type: string): string {
    const types: Record<string, string> = {
      string: 'z.string()',
      number: 'z.number()',
      boolean: 'z.boolean()',
      array: 'z.array(z.any())',
      object: 'z.object({})',
      date: 'z.date()',
      email: 'z.string().email()',
      uuid: 'z.string().uuid()',
    };

    return types[type] || 'z.any()';
  }

  /**
   * Apply validation rules to Zod schema
   */
  private applyZodValidationRules(schema: string, rules: string): string {
    const rulePairs = rules
      .split(',')
      .map((r) => r.trim().split(':'))
      .filter((parts) => parts.length === 2) as [string, string][];
    const ruleMap = new Map(rulePairs);

    if (ruleMap.has('min')) {
      const minVal = ruleMap.get('min');
      schema = schema.includes('z.string()')
        ? `${schema}.min(${minVal})`
        : `${schema}.min(${minVal})`;
    }

    if (ruleMap.has('max')) {
      const maxVal = ruleMap.get('max');
      schema = schema.includes('z.string()')
        ? `${schema}.max(${maxVal})`
        : `${schema}.max(${maxVal})`;
    }

    if (ruleMap.has('pattern')) {
      schema += `.regex(new RegExp('${ruleMap.get('pattern')}'))`;
    }

    if (ruleMap.has('email')) {
      if (!schema.includes('.email()')) {
        schema = 'z.string().email()';
      }
    }

    if (ruleMap.has('url')) {
      schema = schema.includes('z.string()') ? `${schema}.url()` : 'z.string().url()';
    }

    return schema;
  }
}
