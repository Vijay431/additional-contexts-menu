import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface TrpcContextGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeSession: boolean;
  includeDatabase: boolean;
  includeUser: boolean;
  includeRequest: boolean;
  includeResponse: boolean;
  contextType: 'async' | 'sync';
  dependencyInjection: 'manual' | 'inversify' | 'custom';
  includeHelpers: boolean;
  includeValidators: boolean;
}

export interface ContextProperty {
  name: string;
  type: string;
  description?: string;
  isRequired: boolean;
  isNullable: boolean;
  defaultValue?: string;
}

export interface ContextDependency {
  name: string;
  type: string;
  injectAs: string;
  description?: string;
}

export interface GeneratedTrpcContext {
  name: string;
  properties: ContextProperty[];
  dependencies: ContextDependency[];
  imports: string[];
  contextCode: string;
  helpersCode?: string;
  typesCode?: string;
  validatorsCode?: string;
}

/**
 * Service for generating tRPC context creation with TypeScript typing,
 * session management, database connections, and user authentication
 */
export class TrpcContextGeneratorService {
  private static instance: TrpcContextGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): TrpcContextGeneratorService {
    TrpcContextGeneratorService.instance ??= new TrpcContextGeneratorService();
    return TrpcContextGeneratorService.instance;
  }

  /**
   * Generates a tRPC context based on user input
   */
  public async generateContext(
    _workspacePath: string,
    config: TrpcContextGeneratorConfig,
  ): Promise<GeneratedTrpcContext | null> {
    // Get context name
    const contextName = await this.getContextName();
    if (!contextName) {
      return null;
    }

    // Collect context properties
    const properties = await this.collectProperties(config);
    if (!properties || properties.length === 0) {
      vscode.window.showWarningMessage('No properties defined. Context generation cancelled.');
      return null;
    }

    // Collect dependencies
    const dependencies = await this.collectDependencies(config);

    // Generate imports
    const imports = this.generateImports(properties, dependencies, config);

    // Generate context code
    const contextCode = this.generateContextCode(contextName, properties, dependencies, config);

    // Generate helpers code if needed
    const helpersCode = config.includeHelpers
      ? this.generateHelpersCode(properties, config)
      : undefined;

    // Generate types code if TypeScript is enabled
    const typesCode = config.includeTypeScript
      ? this.generateTypesCode(contextName, properties, config)
      : undefined;

    // Generate validators code if needed
    const validatorsCode = config.includeValidators
      ? this.generateValidatorsCode(properties, config)
      : undefined;

    this.logger.info('tRPC context generated', {
      name: contextName,
      properties: properties.length,
      dependencies: dependencies.length,
    });

    return {
      name: contextName,
      properties,
      dependencies,
      imports,
      contextCode,
      helpersCode,
      typesCode,
      validatorsCode,
    };
  }

  /**
   * Prompts user for context name
   */
  private async getContextName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter context name (e.g., App, Auth, User)',
      placeHolder: 'App',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Context name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Context name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects context properties from user
   */
  private async collectProperties(config: TrpcContextGeneratorConfig): Promise<ContextProperty[] | null> {
    const properties: ContextProperty[] = [];

    // Add default properties based on config
    if (config.includeSession) {
      properties.push({
        name: 'session',
        type: 'Session | null',
        description: 'User session data',
        isRequired: false,
        isNullable: true,
      });
    }

    if (config.includeDatabase) {
      properties.push({
        name: 'db',
        type: 'PrismaClient',
        description: 'Database client',
        isRequired: true,
        isNullable: false,
      });
    }

    if (config.includeUser) {
      properties.push({
        name: 'user',
        type: 'User | null',
        description: 'Authenticated user',
        isRequired: false,
        isNullable: true,
      });
    }

    if (config.includeRequest) {
      properties.push({
        name: 'req',
        type: 'Request',
        description: 'HTTP request object',
        isRequired: true,
        isNullable: false,
      });
    }

    if (config.includeResponse) {
      properties.push({
        name: 'res',
        type: 'Response',
        description: 'HTTP response object',
        isRequired: true,
        isNullable: false,
      });
    }

    // Allow user to add custom properties
    let addMore = true;
    while (addMore) {
      const property = await this.createProperty();
      if (property) {
        properties.push(property);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another property', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another property or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return properties.length > 0 ? properties : null;
  }

  /**
   * Creates a single property through user interaction
   */
  private async createProperty(): Promise<ContextProperty | null> {
    // Get property name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter property name',
      placeHolder: 'logger',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Property name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid property name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Get property type
    const typeInput = await vscode.window.showInputBox({
      prompt: 'Enter property type',
      placeHolder: 'Logger',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Property type cannot be empty';
        }
        return null;
      },
    });

    if (!typeInput) {
      return null;
    }

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter property description (optional)',
      placeHolder: `The ${nameInput} property`,
    });

    // Ask if property is required
    const isRequired = await this.askYesNo('Is this property required?', true);

    // Ask if property is nullable
    const isNullable = await this.askYesNo('Can this property be null?', false);

    // Get default value
    let defaultValue: string | undefined;
    if (!isRequired) {
      const defaultInput = await vscode.window.showInputBox({
        prompt: 'Enter default value (optional)',
        placeHolder: 'null',
      });
      defaultValue = defaultInput?.trim() || undefined;
    }

    return {
      name: nameInput.trim(),
      type: typeInput.trim(),
      description: description?.trim() || `The ${nameInput} property`,
      isRequired,
      isNullable,
      defaultValue,
    };
  }

  /**
   * Collects dependencies for context creation
   */
  private async collectDependencies(
    config: TrpcContextGeneratorConfig,
  ): Promise<ContextDependency[]> {
    const dependencies: ContextDependency[] = [];

    // Add default dependencies based on config
    if (config.includeDatabase) {
      dependencies.push({
        name: 'PrismaClient',
        type: 'class',
        injectAs: 'prisma',
        description: 'Prisma database client',
      });
    }

    // Allow user to add custom dependencies
    let addMore = true;
    while (addMore) {
      const dependency = await this.createDependency();
      if (dependency) {
        dependencies.push(dependency);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another dependency', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another dependency or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return dependencies;
  }

  /**
   * Creates a single dependency through user interaction
   */
  private async createDependency(): Promise<ContextDependency | null> {
    // Get dependency name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter dependency name/type',
      placeHolder: 'Logger',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Dependency name cannot be empty';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Get inject as name
    const injectAsInput = await vscode.window.showInputBox({
      prompt: 'Enter variable name to inject as',
      placeHolder: this.camelCase(nameInput.trim()),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Inject as name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid variable name';
        }
        return null;
      },
    });

    if (!injectAsInput) {
      return null;
    }

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter dependency description (optional)',
      placeHolder: `The ${nameInput} dependency`,
    });

    return {
      name: nameInput.trim(),
      type: 'service',
      injectAs: injectAsInput.trim(),
      description: description?.trim() || `The ${nameInput} dependency`,
    };
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
   * Generates imports based on properties and dependencies
   */
  private generateImports(
    _properties: ContextProperty[],
    dependencies: ContextDependency[],
    config: TrpcContextGeneratorConfig,
  ): string[] {
    const imports = new Set<string>();

    // Core imports
    imports.add('type CreateContextOptions');

    // Add dependency-specific imports
    for (const dep of dependencies) {
      if (dep.name === 'PrismaClient') {
        imports.add('PrismaClient');
      }
    }

    // Session imports
    if (config.includeSession) {
      imports.add('type Session');
    }

    // User imports
    if (config.includeUser) {
      imports.add('type User');
    }

    return Array.from(imports);
  }

  /**
   * Generates the context code
   */
  private generateContextCode(
    contextName: string,
    properties: ContextProperty[],
    dependencies: ContextDependency[],
    config: TrpcContextGeneratorConfig,
  ): string {
    let code = '';

    // Generate imports
    code += this.generateImportStatements(dependencies, config);
    code += '\n';

    // Generate interface if TypeScript
    if (config.includeTypeScript) {
      code += this.generateContextInterface(contextName, properties);
      code += '\n';
    }

    // Generate create context function
    code += this.generateCreateContextFunction(contextName, properties, dependencies, config);

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImportStatements(dependencies: ContextDependency[], config: TrpcContextGeneratorConfig): string {
    let code = '';

    // tRPC imports
    code += `import { initTRPC, type CreateContextOptions } from '@trpc/server';\n`;

    // Dependency imports
    for (const dep of dependencies) {
      if (dep.name === 'PrismaClient') {
        code += `import { PrismaClient } from '@prisma/client';\n`;
      } else {
        code += `import { ${dep.name} } from './${this.kebabCase(dep.name)}';\n`;
      }
    }

    // Type imports
    if (config.includeSession) {
      code += `import type { Session } from 'next-auth';\n`;
    }

    if (config.includeUser) {
      code += `import type { User } from './types';\n`;
    }

    return code;
  }

  /**
   * Generates context interface
   */
  private generateContextInterface(contextName: string, properties: ContextProperty[]): string {
    let code = `export interface ${contextName}Context {\n`;

    for (const property of properties) {
      const optional = !property.isRequired ? '?' : '';
      const nullable = property.isNullable ? ' | null' : '';
      code += `  ${property.name}${optional}: ${property.type}${nullable};`;

      if (property.description) {
        code += ` // ${property.description}`;
      }

      code += '\n';
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates create context function
   */
  private generateCreateContextFunction(
    contextName: string,
    properties: ContextProperty[],
    dependencies: ContextDependency[],
    config: TrpcContextGeneratorConfig,
  ): string {
    let code = '';

    const asyncKeyword = config.contextType === 'async' ? 'async ' : '';

    code += `export const create${contextName}Context = ${asyncKeyword}({\n`;
    code += `  req, res,\n`;
    code += `}: CreateContextOptions): ${contextName}Context => {\n`;

    // Generate dependency initialization
    for (const dep of dependencies) {
      if (dep.name === 'PrismaClient') {
        code += `  const ${dep.injectAs} = new PrismaClient();\n`;
      } else {
        code += `  const ${dep.injectAs} = new ${dep.name}();\n`;
      }
    }

    if (dependencies.length > 0) {
      code += '\n';
    }

    code += `  return {\n`;

    // Generate context properties
    for (const property of properties) {
      if (property.name === 'req' || property.name === 'res') {
        code += `    ${property.name},\n`;
      } else if (property.name === 'session') {
        code += `    session: null, // TODO: Implement session extraction\n`;
      } else if (property.name === 'user') {
        code += `    user: null, // TODO: Implement user authentication\n`;
      } else if (property.name === 'db') {
        code += `    db: prisma,\n`;
      } else {
        const defaultValue = property.defaultValue ?? 'null';
        code += `    ${property.name}: ${defaultValue},\n`;
      }
    }

    code += `  };\n`;
    code += `};\n\n`;

    // Generate type alias for context
    code += `export type ${contextName}Context = Awaited<ReturnType<typeof create${contextName}Context>>;\n`;

    return code;
  }

  /**
   * Generates helper functions
   */
  private generateHelpersCode(properties: ContextProperty[], config: TrpcContextGeneratorConfig): string {
    let code = '// Helper functions for context management\n\n';

    if (config.includeSession) {
      code += `export async function getSessionFromRequest(\n`;
      code += `  req: Request\n`;
      code += `): Promise<Session | null> {\n`;
      code += `  // TODO: Implement session extraction logic\n`;
      code += `  // Example: return await getServerSession(authOptions);\n`;
      code += `  return null;\n`;
      code += `}\n\n`;
    }

    if (config.includeUser) {
      code += `export async function getUserFromSession(\n`;
      code += `  session: Session | null\n`;
      code += `): Promise<User | null> {\n`;
      code += `  if (!session?.user?.id) {\n`;
      code += `    return null;\n`;
      code += `  }\n`;
      code += `  // TODO: Implement user fetching logic\n`;
      code += `  // Example: return await prisma.user.findUnique({ where: { id: session.user.id } });\n`;
      code += `  return null;\n`;
      code += `}\n\n`;
    }

    // Generate property helpers
    for (const property of properties) {
      if (!['session', 'user', 'req', 'res', 'db'].includes(property.name)) {
        code += `export function get${this.ucfirst(property.name)}(\n`;
        code += `  context: ${config.includeTypeScript ? 'any' : 'Context'}\n`;
        code += `): ${property.type} {\n`;
        code += `  return context.${property.name};\n`;
        code += `}\n\n`;
      }
    }

    return code;
  }

  /**
   * Generates TypeScript types
   */
  private generateTypesCode(contextName: string, properties: ContextProperty[], _config: TrpcContextGeneratorConfig): string {
    let code = '// TypeScript type definitions\n\n';

    code += `export type ${contextName}ContextShape = {\n`;

    for (const property of properties) {
      const optional = !property.isRequired ? '?' : '';
      const nullable = property.isNullable ? ' | null' : '';
      code += `  ${property.name}${optional}: ${property.type}${nullable};\n`;
    }

    code += `};\n\n`;

    // Generate individual property types
    for (const property of properties) {
      code += `export type ${this.ucfirst(contextName)}${this.ucfirst(property.name)} = ${property.type};\n`;
    }

    return code;
  }

  /**
   * Generates validation functions
   */
  private generateValidatorsCode(properties: ContextProperty[], _config: TrpcContextGeneratorConfig): string {
    let code = '// Context validation functions\n\n';

    code += `export function validateContext(\n`;
    code += `  context: any,\n`;
    code += `  requiredProperties: string[] = []\n`;
    code += `): boolean {\n`;

    const requiredProps = properties.filter((p) => p.isRequired).map((p) => `'${p.name}'`);

    code += `  const defaults = [${requiredProps.join(', ')}];\n`;
    code += `  const required = requiredProperties.length > 0 ? requiredProperties : defaults;\n\n`;
    code += `  for (const prop of required) {\n`;
    code += `    if (context[prop] === undefined || context[prop] === null) {\n`;
    code += `      throw new Error(\`Missing required context property: \${prop}\`);\n`;
    code += `    }\n`;
    code += `  }\n\n`;
    code += `  return true;\n`;
    code += `}\n\n`;

    // Generate individual property validators
    for (const property of properties) {
      if (property.isRequired) {
        code += `export function validate${this.ucfirst(property.name)}(\n`;
        code += `  value: ${property.type}\n`;
        code += `): void {\n`;
        code += `  if (!value) {\n`;
        code += `    throw new Error('${property.name} is required');\n`;
        code += `  }\n`;
        code += `}\n\n`;
      }
    }

    return code;
  }

  /**
   * Creates the context file at the specified path
   */
  public async createContextFile(
    filePath: string,
    generated: GeneratedTrpcContext,
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Combine all code sections
    let fullCode = '';
    fullCode += generated.contextCode;

    if (generated.typesCode) {
      fullCode += '\n' + generated.typesCode;
    }

    if (generated.helpersCode) {
      fullCode += '\n' + generated.helpersCode;
    }

    if (generated.validatorsCode) {
      fullCode += '\n' + generated.validatorsCode;
    }

    // Write context file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(fullCode, 'utf-8'));

    this.logger.info('tRPC context file created', { filePath });
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
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
