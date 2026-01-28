import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface TrpcRouterGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeZodSchemas: boolean;
  includeErrorHandling: boolean;
  includeMiddleware: boolean;
  includeContext: boolean;
  includeInputValidation: boolean;
  includeMeta: boolean;
  exportType: 'named' | 'default';
  procedureType: 'query' | 'mutation' | 'subscription';
  routerPattern: 'app-router' | 'pages-router';
  contextType: 'async' | 'sync';
}

export interface TrpcProcedure {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  description?: string;
  inputs: TrpcInput[];
  returnType: string;
  includeErrorHandling: boolean;
  includeMiddleware: boolean;
  middleware?: string[] | undefined;
}

export interface TrpcInput {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string;
  validationRule?: {
    type: 'zod' | 'custom';
    rule?: string;
  };
}

export interface GeneratedTrpcRouter {
  name: string;
  procedures: TrpcProcedure[];
  imports: string[];
  routerCode: string;
  contextCode?: string | undefined;
  middlewareCode?: string | undefined;
}

/**
 * Service for generating tRPC routers with TypeScript typing,
 * procedures, middleware, and Zod validation
 */
export class TrpcRouterGeneratorService {
  private static instance: TrpcRouterGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): TrpcRouterGeneratorService {
    TrpcRouterGeneratorService.instance ??= new TrpcRouterGeneratorService();
    return TrpcRouterGeneratorService.instance;
  }

  /**
   * Generates a tRPC router based on user input
   */
  public async generateRouter(
    _workspacePath: string,
    config: TrpcRouterGeneratorConfig,
  ): Promise<GeneratedTrpcRouter | null> {
    // Get router name
    const routerName = await this.getRouterName();
    if (!routerName) {
      return null;
    }

    // Collect procedure information
    const procedures = await this.collectProcedures(config);
    if (!procedures || procedures.length === 0) {
      vscode.window.showWarningMessage('No procedures defined. Router generation cancelled.');
      return null;
    }

    // Generate imports based on procedures and config
    const imports = this.generateImports(procedures, config);

    // Generate router code
    const routerCode = this.generateRouterCode(routerName, procedures, imports, config);

    // Generate context code if needed
    const contextCode = config.includeContext ? this.generateContextCode(config) : undefined;

    // Generate middleware code if needed
    const middlewareCode = config.includeMiddleware ? this.generateMiddlewareCode(config) : undefined;

    this.logger.info('tRPC router generated', {
      name: routerName,
      procedures: procedures.length,
    });

    return {
      name: routerName,
      procedures,
      imports,
      routerCode,
      contextCode,
      middlewareCode,
    };
  }

  /**
   * Prompts user for router name
   */
  private async getRouterName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter router name (e.g., users, posts, auth)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Router name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Router name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects procedure information from user
   */
  private async collectProcedures(config: TrpcRouterGeneratorConfig): Promise<TrpcProcedure[] | null> {
    const procedures: TrpcProcedure[] = [];

    let addMore = true;
    while (addMore) {
      const procedure = await this.createProcedure(config);
      if (procedure) {
        procedures.push(procedure);
      }

      if (procedures.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another procedure', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another procedure or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return procedures.length > 0 ? procedures : null;
  }

  /**
   * Creates a single procedure through user interaction
   */
  private async createProcedure(config: TrpcRouterGeneratorConfig): Promise<TrpcProcedure | null> {
    // Choose procedure type
    const typeChoice = await vscode.window.showQuickPick<
      Required<{ label: string; value: TrpcProcedure['type'] }>
    >(
      [
        { label: 'Query', value: 'query' },
        { label: 'Mutation', value: 'mutation' },
        { label: 'Subscription', value: 'subscription' },
      ],
      { placeHolder: 'Select procedure type' },
    );

    if (!typeChoice) {
      return null;
    }

    // Get procedure name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter procedure name',
      placeHolder: typeChoice.value === 'query' ? 'getUser' : 'createUser',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Procedure name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid procedure name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const procedureName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter procedure description (optional)',
      placeHolder: `${typeChoice.value} ${procedureName}`,
    });

    // Collect inputs
    const inputs = await this.collectInputs(config);

    // Get return type
    const returnType = await this.getReturnType(typeChoice.value);

    // Ask if error handling is needed
    const includeErrorHandling = config.includeErrorHandling
      ? await this.askYesNo('Include error handling?', true)
      : false;

    // Ask if middleware is needed
    const includeMiddleware = config.includeMiddleware
      ? await this.askYesNo('Include middleware?', false)
      : false;

    let middleware: string[] | undefined;
    if (includeMiddleware) {
      middleware = await this.collectMiddleware();
    }

    return {
      name: procedureName,
      type: typeChoice.value,
      description: description?.trim() || `${typeChoice.value} ${procedureName}`,
      inputs,
      returnType,
      includeErrorHandling,
      includeMiddleware,
      middleware,
    };
  }

  /**
   * Collects inputs for a procedure
   */
  private async collectInputs(config: TrpcRouterGeneratorConfig): Promise<TrpcInput[]> {
    const inputs: TrpcInput[] = [];

    let addMore = true;
    while (addMore) {
      const input = await this.createInput(config);
      if (input) {
        inputs.push(input);
      }

      const addInput = await vscode.window.showQuickPick(
        [
          { label: 'Add another input', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another input or finish?' },
      );

      if (!addInput || addInput.value === 'done') {
        addMore = false;
      }
    }

    return inputs;
  }

  /**
   * Creates a single input
   */
  private async createInput(config: TrpcRouterGeneratorConfig): Promise<TrpcInput | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter input name',
      placeHolder: config.includeZodSchemas ? 'id' : 'data',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Input name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid input name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const dataTypeInput = await vscode.window.showQuickPick(
      ['string', 'number', 'boolean', 'any', 'string[]', 'number[]', 'object', 'unknown'],
      { placeHolder: 'Select data type' },
    );

    const dataType = dataTypeInput || 'any';

    const isRequired = await this.askYesNo('Is this input required?', true);

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter input description (optional)',
      placeHolder: `The ${nameInput} input`,
    });

    let validationRule: TrpcInput['validationRule'] | undefined;
    if (config.includeZodSchemas && config.includeInputValidation) {
      const addValidation = await this.askYesNo('Add validation rule?', false);
      if (addValidation) {
        validationRule = {
          type: 'zod',
          rule: '', // Will be generated based on type
        };
      }
    }

    return {
      name: nameInput.trim(),
      type: dataType,
      isRequired,
      description: descriptionInput?.trim() || `The ${nameInput} input`,
      ...(validationRule ? { validationRule } : {}),
    };
  }

  /**
   * Gets the return type for a procedure
   */
  private async getReturnType(type: TrpcProcedure['type']): Promise<string> {
    const defaultTypes: Record<string, string> = {
      query: 'any',
      mutation: 'any',
      subscription: 'any',
    };

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultTypes[type] || 'any',
      value: defaultTypes[type] || 'any',
    });

    return input?.trim() || defaultTypes[type] || 'any';
  }

  /**
   * Collects middleware for a procedure
   */
  private async collectMiddleware(): Promise<string[]> {
    const middleware: string[] = [];

    let addMore = true;
    while (addMore) {
      const middlewareInput = await vscode.window.showInputBox({
        prompt: 'Enter middleware function name (optional)',
        placeHolder: 'authMiddleware',
      });

      if (!middlewareInput) {
        addMore = false;
      } else {
        middleware.push(middlewareInput.trim());
      }
    }

    return middleware;
  }

  /**
   * Helper to ask yes/no questions
   */
  private async askYesNo(question: string, defaultValue: boolean): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: question },
    );

    if (!choice) {
      return defaultValue;
    }

    return choice.value === 'yes';
  }

  /**
   * Generates imports based on procedures and config
   */
  private generateImports(_procedures: TrpcProcedure[], config: TrpcRouterGeneratorConfig): string[] {
    const imports = new Set<string>();

    // Core tRPC imports
    imports.add('initTRPC');
    imports.add('TRPCError');

    // Context type if needed
    if (config.includeContext) {
      imports.add('Context');
    }

    // Zod imports if validation is enabled
    if (config.includeZodSchemas && config.includeInputValidation) {
      imports.add('z');
    }

    // Meta type if needed
    if (config.includeMeta) {
      imports.add('Meta');
    }

    return Array.from(imports);
  }

  /**
   * Generates the router code
   */
  private generateRouterCode(
    routerName: string,
    procedures: TrpcProcedure[],
    imports: string[],
    config: TrpcRouterGeneratorConfig,
  ): string {
    let code = '';

    // Imports
    code += `import { ${imports.join(', ')} } from './trpc';\n\n`;

    if (config.includeZodSchemas && config.includeInputValidation) {
      code += `import { z } from 'zod';\n\n`;
    }

    // Generate input schemas if using Zod
    const schemas = this.generateInputSchemas(procedures, config);
    if (schemas) {
      code += schemas;
      code += '\n';
    }

    // Initialize tRPC
    code += `const t = initTRPC\n`;
    code += `  .context<Context>()\n`;
    if (config.includeMeta) {
      code += `  .meta<Meta>()\n`;
    }
    code += `  .create();\n\n`;

    // Export helpers
    code += `export const router = t.router;\n`;
    code += `export const publicProcedure = t.procedure;\n\n`;

    // Generate router
    const routerVarName = this.camelCase(routerName) + 'Router';
    code += `export const ${routerVarName} = router({\n`;

    // Generate procedures
    for (const procedure of procedures) {
      code += this.generateProcedure(procedure, config);
      if (procedures.indexOf(procedure) < procedures.length - 1) {
        code += ',\n';
      }
    }

    code += '\n});\n';

    // Export type
    code += `\nexport type ${routerName}Router = typeof ${routerVarName};\n`;

    return code;
  }

  /**
   * Generates input schemas using Zod
   */
  private generateInputSchemas(procedures: TrpcProcedure[], config: TrpcRouterGeneratorConfig): string | null {
    if (!config.includeZodSchemas || !config.includeInputValidation) {
      return null;
    }

    let code = '';

    for (const procedure of procedures) {
      if (procedure.inputs.length === 0) {
        continue;
      }

      const schemaName = `${this.ucfirst(procedure.name)}Input`;

      code += `const ${schemaName} = z.object({\n`;

      for (const input of procedure.inputs) {
        let zodType = this.getZodType(input.type, input.isRequired);
        code += `  ${input.name}: ${zodType},`;

        if (input.description) {
          code += ` // ${input.description}`;
        }
        code += '\n';
      }

      code += `});\n\n`;
    }

    return code || null;
  }

  /**
   * Gets Zod type for a given TypeScript type
   */
  private getZodType(tsType: string, isRequired: boolean): string {
    const typeMap: Record<string, string> = {
      'string': 'z.string()',
      'number': 'z.number()',
      'boolean': 'z.boolean()',
      'any': 'z.any()',
      'unknown': 'z.unknown()',
      'string[]': 'z.array(z.string())',
      'number[]': 'z.array(z.number())',
      'object': 'z.object({})',
    };

    let zodType = typeMap[tsType] || 'z.any()';

    if (!isRequired) {
      zodType += '.optional()';
    }

    return zodType;
  }

  /**
   * Generates a procedure
   */
  private generateProcedure(procedure: TrpcProcedure, config: TrpcRouterGeneratorConfig): string {
    let code = '';

    // Procedure definition
    const procedureType = procedure.type; // query, mutation, or subscription
    const isPublic = !procedure.includeMiddleware;

    code += `  ${procedure.name}: ${isPublic ? 'publicProcedure' : 't.procedure'}.${procedureType}`;

    // Add input schema if using Zod
    if (config.includeZodSchemas && config.includeInputValidation && procedure.inputs.length > 0) {
      const schemaName = `${this.ucfirst(procedure.name)}Input`;
      code += `.input(${schemaName})`;
    } else if (procedure.inputs.length > 0) {
      // Add generic input type
      const inputType = this.generateInputType(procedure.inputs);
      code += `.input<${inputType}>()`;
    }

    // Add middleware if needed
    if (procedure.includeMiddleware && procedure.middleware) {
      for (const mw of procedure.middleware) {
        code += `.use(${mw})`;
      }
    }

    // Add output type
    code += `.output<${procedure.returnType}>()`;

    // Procedure implementation
    const isAsync = true; // tRPC procedures are typically async
    code += `\n    .${isAsync ? 'async ' : ''}resolve({ ${this.generateProcedureParams(procedure, config)} }) => {\n`;

    // Error handling
    if (procedure.includeErrorHandling) {
      code += `      try {\n`;
      code += `        // TODO: Implement ${procedure.type} ${procedure.name}\n`;
      code += `        throw new TRPCError({\n`;
      code += `          code: 'NOT_IMPLEMENTED',\n`;
      code += `          message: '${this.ucfirst(procedure.type)} ${procedure.name} not implemented yet',\n`;
      code += `        });\n`;
      code += `      } catch (error) {\n`;
      code += `        if (error instanceof TRPCError) {\n`;
      code += `          throw error;\n`;
      code += `        }\n`;
      code += `        throw new TRPCError({\n`;
      code += `          code: 'INTERNAL_SERVER_ERROR',\n`;
      code += `          message: 'An unexpected error occurred',\n`;
      code += `          cause: error,\n`;
      code += `        });\n`;
      code += `      }\n`;
    } else {
      code += `      // TODO: Implement ${procedure.type} ${procedure.name}\n`;
      code += `      throw new TRPCError({\n`;
      code += `        code: 'NOT_IMPLEMENTED',\n`;
      code += `        message: '${this.ucfirst(procedure.type)} ${procedure.name} not implemented yet',\n`;
      code += `      });\n`;
    }

    code += `    }`;

    return code;
  }

  /**
   * Generates procedure parameters
   */
  private generateProcedureParams(_procedure: TrpcProcedure, config: TrpcRouterGeneratorConfig): string {
    const params: string[] = ['input'];

    if (config.includeContext) {
      params.push('ctx');
    }

    if (config.includeMeta) {
      params.push('meta');
    }

    return params.join(', ');
  }

  /**
   * Generates input type from inputs array
   */
  private generateInputType(inputs: TrpcInput[]): string {
    if (inputs.length === 0) {
      return 'void';
    }

    const properties = inputs
      .map((input) => {
        const optional = input.isRequired ? '' : '?';
        return `    ${input.name}${optional}: ${input.type}`;
      })
      .join(';\n');

    return `{\n${properties}\n  }`;
  }

  /**
   * Generates context code
   */
  private generateContextCode(config: TrpcRouterGeneratorConfig): string {
    let code = '';

    code += `import type { CreateContextOptions } from './trpc';\n\n`;

    if (config.contextType === 'async') {
      code += `export const createContext = async ({ req, res }: CreateContextOptions) => {\n`;
    } else {
      code += `export const createContext = ({ req, res }: CreateContextOptions) => {\n`;
    }

    code += `  // TODO: Create your context here\n`;
    code += `  return {\n`;
    code += `    req,\n`;
    code += `    res,\n`;
    code += `    // Add your context properties\n`;
    code += `  };\n`;
    code += `};\n\n`;

    code += `export type Context = Awaited<ReturnType<typeof createContext>>;\n`;

    return code;
  }

  /**
   * Generates middleware code
   */
  private generateMiddlewareCode(_config: TrpcRouterGeneratorConfig): string {
    let code = '';

    code += `import { TRPCError } from '@trpc/server';\n`;
    code += `import type { Context } from './context';\n\n`;

    code += `export const isAuthed = t.middleware(({ ctx, next }) => {\n`;
    code += `  if (!ctx.user) {\n`;
    code += `    throw new TRPCError({ code: 'UNAUTHORIZED' });\n`;
    code += `  }\n`;
    code += `  return next();\n`;
    code += `});\n\n`;

    code += `export const protectedProcedure = t.procedure.use(isAuthed);\n`;

    return code;
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the router file at the specified path
   */
  public async createRouterFile(
    filePath: string,
    code: string,
    contextCode?: string,
    middlewareCode?: string,
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write router file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    // Create context file if needed
    if (contextCode) {
      const contextPath = path.join(directory, 'context.ts');
      const contextUri = vscode.Uri.file(contextPath);
      await vscode.workspace.fs.writeFile(contextUri, Buffer.from(contextCode, 'utf-8'));
    }

    // Create middleware file if needed
    if (middlewareCode) {
      const middlewarePath = path.join(directory, 'middleware.ts');
      const middlewareUri = vscode.Uri.file(middlewarePath);
      await vscode.workspace.fs.writeFile(middlewareUri, Buffer.from(middlewareCode, 'utf-8'));
    }

    this.logger.info('tRPC router file created', { filePath });
  }
}
