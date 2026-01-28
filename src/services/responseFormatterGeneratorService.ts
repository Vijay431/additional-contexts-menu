import * as vscode from 'vscode';

import type {
  ResponseFormatterConfig,
  ResponseFormatterField,
  ResponseFormatterGenerationResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating standardized API response formatters with success/error handling,
 * pagination metadata, and HTTP status codes
 */
export class ResponseFormatterGeneratorService {
  private static instance: ResponseFormatterGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ResponseFormatterGeneratorService {
    ResponseFormatterGeneratorService.instance ??= new ResponseFormatterGeneratorService();
    return ResponseFormatterGeneratorService.instance;
  }

  /**
   * Generate response formatter based on user configuration
   */
  public async generate(
    workspacePath: string,
    config: ResponseFormatterConfig,
  ): Promise<ResponseFormatterGenerationResult | null> {
    // Choose formatter type
    const formatterType = await this.chooseFormatterType();
    if (!formatterType) {
      return null;
    }

    // Get formatter name
    const formatterName = await this.getFormatterName();
    if (!formatterName) {
      return null;
    }

    // Collect data fields
    const dataFields = await this.collectDataFields();
    if (!dataFields) {
      return null;
    }

    // Collect meta fields
    const metaFields = await this.collectMetaFields();

    // Generate formatter code based on type
    const formatterCode = this.generateFormatterCode(
      formatterType,
      formatterName,
      dataFields,
      metaFields,
      config,
    );

    this.logger.info('Response formatter generated', {
      name: formatterName,
      type: formatterType,
      dataFields: dataFields.length,
      metaFields: metaFields.length,
    });

    return {
      formatterName,
      formatterType,
      dataFields,
      metaFields,
      formatterCode,
    };
  }

  /**
   * Choose the type of formatter to generate
   */
  private async chooseFormatterType(): Promise<
    'class' | 'functions' | 'middleware' | null
  > {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Class-based Formatter',
          description: 'Generate a reusable class with static methods',
          value: 'class',
        },
        {
          label: 'Functional Formatter',
          description: 'Generate standalone utility functions',
          value: 'functions',
        },
        {
          label: 'Express Middleware',
          description: 'Generate Express middleware for response formatting',
          value: 'middleware',
        },
      ],
      { placeHolder: 'Select formatter type' },
    );

    return choice ? (choice.value as 'class' | 'functions' | 'middleware') : null;
  }

  /**
   * Get the name for the formatter
   */
  private async getFormatterName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter formatter name (e.g., ApiResponse, ResponseFormatter)',
      placeHolder: 'ApiResponse',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Formatter name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Formatter name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collect data fields for the response
   */
  private async collectDataFields(): Promise<ResponseFormatterField[] | null> {
    const fields: ResponseFormatterField[] = [];

    const addDataField = await vscode.window.showQuickPick(
      [
        { label: 'Yes, add data fields', value: 'yes' },
        { label: 'No, generic response only', value: 'no' },
      ],
      { placeHolder: 'Add specific data fields to the response?' },
    );

    if (addDataField?.value === 'yes') {
      let addMore = true;
      while (addMore) {
        const field = await this.createField('data');
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
    }

    return fields;
  }

  /**
   * Collect meta fields for the response
   */
  private async collectMetaFields(): Promise<ResponseFormatterField[]> {
    const fields: ResponseFormatterField[] = [];

    const commonMetaFields = [
      { name: 'timestamp', type: 'string', description: 'Response timestamp' },
      { name: 'requestId', type: 'string', description: 'Unique request identifier' },
      { name: 'version', type: 'string', description: 'API version' },
      { name: 'path', type: 'string', description: 'Request path' },
    ];

    const addMetaFields = await vscode.window.showQuickPick(
      [
        { label: 'Yes, add meta fields', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Add standard metadata fields to the response?' },
    );

    if (addMetaFields?.value === 'yes') {
      for (const field of commonMetaFields) {
        const shouldAdd = await vscode.window.showQuickPick(
          [
            { label: `Add ${field.name}`, value: 'yes' },
            { label: 'Skip', value: 'no' },
          ],
          { placeHolder: `Add ${field.name} field?` },
        );

        if (shouldAdd?.value === 'yes') {
          fields.push({
            name: field.name,
            type: field.type as 'string' | 'number' | 'boolean' | 'object' | 'array',
            description: field.description,
            optional: true,
          });
        }
      }
    }

    return fields;
  }

  /**
   * Create a single field through user interaction
   */
  private async createField(
    context: 'data' | 'meta',
  ): Promise<ResponseFormatterField | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${context} field name`,
      placeHolder: context === 'data' ? 'user' : 'timestamp',
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

    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'object', value: 'object' },
        { label: 'array', value: 'array' },
      ],
      { placeHolder: 'Select field type' },
    );

    const optionalChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'required' },
        { label: 'Optional', value: 'optional' },
      ],
      { placeHolder: 'Is this field required?' },
    );

    return {
      name: nameInput.trim(),
      type: (typeChoice?.value as 'string' | 'number' | 'boolean' | 'object' | 'array') || 'string',
      optional: optionalChoice?.value === 'optional',
    };
  }

  /**
   * Generate the formatter code
   */
  private generateFormatterCode(
    formatterType: 'class' | 'functions' | 'middleware',
    formatterName: string,
    dataFields: ResponseFormatterField[],
    metaFields: ResponseFormatterField[],
    config: ResponseFormatterConfig,
  ): string {
    switch (formatterType) {
      case 'class':
        return this.generateClassFormatter(formatterName, dataFields, metaFields, config);
      case 'functions':
        return this.generateFunctionalFormatter(formatterName, dataFields, metaFields, config);
      case 'middleware':
        return this.generateMiddlewareFormatter(formatterName, dataFields, metaFields, config);
    }
  }

  /**
   * Generate class-based formatter
   */
  private generateClassFormatter(
    formatterName: string,
    dataFields: ResponseFormatterField[],
    metaFields: ResponseFormatterField[],
    config: ResponseFormatterConfig,
  ): string {
    let code = '';

    // Type definitions
    code += this.generateTypeDefinitions(formatterName, dataFields, metaFields, config);

    // Class definition
    code += `\nexport class ${formatterName} {\n`;

    // Success method
    code += this.generateSuccessMethod(formatterName, dataFields, metaFields, config, 'class');

    // Error method
    code += this.generateErrorMethod(formatterName, config, 'class');

    // Pagination method
    code += this.generatePaginationMethod(formatterName, dataFields, metaFields, config, 'class');

    code += '}\n';

    // Usage example
    code += this.generateUsageExample(formatterName, config);

    return code;
  }

  /**
   * Generate functional formatter
   */
  private generateFunctionalFormatter(
    formatterName: string,
    dataFields: ResponseFormatterField[],
    metaFields: ResponseFormatterField[],
    config: ResponseFormatterConfig,
  ): string {
    let code = '';

    // Type definitions
    code += this.generateTypeDefinitions(formatterName, dataFields, metaFields, config);

    // Success function
    code += this.generateSuccessMethod(formatterName, dataFields, metaFields, config, 'function');

    // Error function
    code += this.generateErrorMethod(formatterName, config, 'function');

    // Pagination function
    code += this.generatePaginationMethod(formatterName, dataFields, metaFields, config, 'function');

    // Usage example
    code += this.generateUsageExample(formatterName, config);

    return code;
  }

  /**
   * Generate Express middleware formatter
   */
  private generateMiddlewareFormatter(
    formatterName: string,
    dataFields: ResponseFormatterField[],
    metaFields: ResponseFormatterField[],
    config: ResponseFormatterConfig,
  ): string {
    let code = "import { Request, Response, NextFunction } from 'express';\n\n";

    // Type definitions
    code += this.generateTypeDefinitions(formatterName, dataFields, metaFields, config);

    // Middleware function
    code += `\nexport const responseFormatterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Attach formatting methods to response object
  res.success = <T = unknown>(data: T, meta?: Record<string, unknown>) => {
    const response: ${formatterName}Success<T> = {
      success: true,
      data: data as T,
      ...(meta && { meta }),
    };

    return res.status(200).json(response);
  };

  res.error = (errorCode: string, message: string, details?: unknown) => {
    const response: ${formatterName}Error = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
    };

    return res.status(200).json(response);
  };

  res.paginated = <T = unknown>(
    data: T[],
    pagination: ${formatterName}PaginationMeta,
  ) => {
    const response: ${formatterName}Paginated<T> = {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages: Math.ceil(pagination.totalItems / pagination.pageSize),
        hasNextPage: pagination.page < Math.ceil(pagination.totalItems / pagination.pageSize),
        hasPrevPage: pagination.page > 1,
      },
    };

    return res.status(200).json(response);
  };

  next();
};

// Extend Express Response type
declare global {
  namespace Express {
    interface Response {
      success: <T = unknown>(data: T, meta?: Record<string, unknown>) => Response;
      error: (errorCode: string, message: string, details?: unknown) => Response;
      paginated: <T = unknown>(
        data: T[],
        pagination: ${formatterName}PaginationMeta,
      ) => Response;
    }
  }
}
`;

    // Usage example
    code += this.generateMiddlewareUsageExample(formatterName, config);

    return code;
  }

  /**
   * Generate TypeScript type definitions
   */
  private generateTypeDefinitions(
    formatterName: string,
    dataFields: ResponseFormatterField[],
    metaFields: ResponseFormatterField[],
    _config: ResponseFormatterConfig,
  ): string {
    let code = '';

    // Success response type
    code += `export interface ${formatterName}Success<T = unknown> {
  success: true;
  data: T;`;
    if (metaFields.length > 0) {
      code += '\n  meta?: {';
      for (const field of metaFields) {
        const optional = field.optional ? '?' : '';
        code += `\n    ${field.name}${optional}: ${field.type};`;
      }
      code += '\n  };';
    }
    code += '\n}\n\n';

    // Error response type
    code += `export interface ${formatterName}Error {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}\n\n`;

    // Pagination response type
    code += `export interface ${formatterName}Paginated<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}\n\n`;

    // Pagination meta type
    code += `export interface ${formatterName}PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
}\n\n`;

    // Data type if fields are defined
    if (dataFields.length > 0) {
      code += `export interface ${formatterName}Data {\n`;
      for (const field of dataFields) {
        const optional = field.optional ? '?' : '';
        code += `  ${field.name}${optional}: ${field.type};\n`;
      }
      code += '}\n';
    }

    return code;
  }

  /**
   * Generate success method
   */
  private generateSuccessMethod(
    formatterName: string,
    _dataFields: ResponseFormatterField[],
    _metaFields: ResponseFormatterField[],
    _config: ResponseFormatterConfig,
    style: 'class' | 'function',
  ): string {
    if (style === 'class') {
      return `  /**
   * Create a success response
   */
  static success<T = unknown>(data: T, meta?: Record<string, unknown>): ${formatterName}Success<T> {
    const response: ${formatterName}Success<T> = {
      success: true,
      data,
      ...(meta && { meta }),
    };

    return response;
  }

`;
    } else {
      return `/**
 * Create a success response
 */
export const createSuccessResponse = <T = unknown>(
  data: T,
  meta?: Record<string, unknown>,
): ${formatterName}Success<T> => {
  const response: ${formatterName}Success<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  return response;
};

`;
    }
  }

  /**
   * Generate error method
   */
  private generateErrorMethod(
    formatterName: string,
    _config: ResponseFormatterConfig,
    style: 'class' | 'function',
  ): string {
    if (style === 'class') {
      return `  /**
   * Create an error response
   */
  static error(
    errorCode: string,
    message: string,
    details?: unknown,
  ): ${formatterName}Error {
    const response: ${formatterName}Error = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
    };

    return response;
  }

`;
    } else {
      return `/**
 * Create an error response
 */
export const createErrorResponse = (
  errorCode: string,
  message: string,
  details?: unknown,
): ${formatterName}Error => {
  const response: ${formatterName}Error = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
    },
  };

  return response;
};

`;
    }
  }

  /**
   * Generate pagination method
   */
  private generatePaginationMethod(
    formatterName: string,
    _dataFields: ResponseFormatterField[],
    _metaFields: ResponseFormatterField[],
    _config: ResponseFormatterConfig,
    style: 'class' | 'function',
  ): string {
    if (style === 'class') {
      return `  /**
   * Create a paginated response
   */
  static paginated<T = unknown>(
    data: T[],
    pagination: ${formatterName}PaginationMeta,
  ): ${formatterName}Paginated<T> {
    const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);

    const response: ${formatterName}Paginated<T> = {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
    };

    return response;
  }
`;
    } else {
      return `/**
 * Create a paginated response
 */
export const createPaginatedResponse = <T = unknown>(
  data: T[],
  pagination: ${formatterName}PaginationMeta,
): ${formatterName}Paginated<T> => {
  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);

  const response: ${formatterName}Paginated<T> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
  };

  return response;
};
`;
    }
  }

  /**
   * Generate usage example
   */
  private generateUsageExample(formatterName: string, _config: ResponseFormatterConfig): string {
    return `
// Usage example:
/*
import { ${formatterName} } from './responseFormatter';

// Success response
const successResponse = ${formatterName}.success({ id: 1, name: 'John' });
// Returns: { success: true, data: { id: 1, name: 'John' } }

// Error response
const errorResponse = ${formatterName}.error('NOT_FOUND', 'Resource not found');
// Returns: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } }

// Paginated response
const paginatedResponse = ${formatterName}.paginated(
  [{ id: 1 }, { id: 2 }],
  { page: 1, pageSize: 10, totalItems: 25 },
);
// Returns: {
//   success: true,
//   data: [{ id: 1 }, { id: 2 }],
//   pagination: { page: 1, pageSize: 10, totalItems: 25, totalPages: 3, hasNextPage: true, hasPrevPage: false }
// }
*/`;
  }

  /**
   * Generate middleware usage example
   */
  private generateMiddlewareUsageExample(formatterName: string, _config: ResponseFormatterConfig): string {
    return `
// Usage example:
/*
import express from 'express';
import { responseFormatterMiddleware } from './responseFormatter';

const app = express();

// Apply middleware globally
app.use(responseFormatterMiddleware);

// Use in routes
app.get('/users', (req, res) => {
  const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];

  // Use the formatted response methods
  res.success(users);
});

app.get('/users/:id', (req, res) => {
  const user = findUserById(req.params.id);

  if (!user) {
    return res.error('USER_NOT_FOUND', 'User not found');
  }

  res.success(user);
});

app.get('/users', (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const users = getPaginatedUsers(Number(page), Number(pageSize));
  const totalUsers = getTotalUserCount();

  res.paginated(users, { page: Number(page), pageSize: Number(pageSize), totalItems: totalUsers });
});
*/`;
  }

  /**
   * Creates the formatter file at the specified path
   */
  public async createFormatterFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = filePath.substring(0, filePath.lastIndexOf('/'));

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write formatter file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Formatter file created', { filePath });
  }
}
