import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface GraphQLResolverConfig {
  enabled: boolean;
  generateDataLoaders: boolean;
  includeErrorHandling: boolean;
  includeAuthGuard: boolean;
  generateSubscriptions: boolean;
  defaultResolverPath: string;
  generateInterfaces: boolean;
}

export interface GraphQLField {
  name: string;
  type: string;
  description?: string;
  args: GraphQLArgument[];
  isNullable: boolean;
  isArray: boolean;
}

export interface GraphQLArgument {
  name: string;
  type: string;
  description?: string;
  isNullable: boolean;
  defaultValue?: string;
}

export interface GraphQLResolver {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  fields: GraphQLField[];
  returnType: string;
  description?: string;
}

export interface GeneratedResolver {
  name: string;
  type: 'Query' | 'Mutation' | 'Subscription';
  resolvers: GraphQLResolver[];
  imports: string[];
  resolverCode: string;
  dataLoaderCode?: string;
}

/**
 * Service for generating GraphQL resolvers with TypeScript typing,
 * NestJS decorators, and data loader integration
 */
export class GraphQLResolverGeneratorService {
  private static instance: GraphQLResolverGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): GraphQLResolverGeneratorService {
    GraphQLResolverGeneratorService.instance ??= new GraphQLResolverGeneratorService();
    return GraphQLResolverGeneratorService.instance;
  }

  /**
   * Generates a GraphQL resolver based on user input
   */
  public async generateResolver(
    workspacePath: string,
    config: GraphQLResolverConfig,
  ): Promise<GeneratedResolver | null> {
    // Choose resolver type
    const resolverType = await this.getResolverType(config);
    if (!resolverType) {
      return null;
    }

    // Get resolver name
    const resolverName = await this.getResolverName(resolverType);
    if (!resolverName) {
      return null;
    }

    // Collect fields (queries/mutations/subscriptions)
    const fields = await this.collectFields(resolverType, config);
    if (!fields || fields.length === 0) {
      vscode.window.showWarningMessage('No fields defined. Resolver generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(fields, config);

    // Generate resolver code
    const resolverCode = this.generateResolverCode(
      resolverName,
      resolverType,
      fields,
      imports,
      config,
    );

    // Generate DataLoader code if needed
    let dataLoaderCode: string | undefined;
    if (
      config.generateDataLoaders &&
      (resolverType === 'Query' || resolverType === 'Subscription')
    ) {
      dataLoaderCode = this.generateDataLoaderCode(resolverName, fields);
    }

    this.logger.info('GraphQL resolver generated', {
      name: resolverName,
      type: resolverType,
      fields: fields.length,
    });

    return {
      name: resolverName,
      type: resolverType,
      resolvers: fields,
      imports,
      resolverCode,
      dataLoaderCode,
    };
  }

  /**
   * Gets the resolver type from user
   */
  private async getResolverType(
    config: GraphQLResolverConfig,
  ): Promise<'Query' | 'Mutation' | 'Subscription' | null> {
    const options = [
      { label: 'Query', value: 'Query', description: 'Read operations' },
      { label: 'Mutation', value: 'Mutation', description: 'Write operations' },
    ];

    if (config.generateSubscriptions) {
      options.push({
        label: 'Subscription',
        value: 'Subscription',
        description: 'Real-time updates',
      });
    }

    const choice = await vscode.window.showQuickPick(
      options as Required<{ label: string; value: 'Query' | 'Mutation' | 'Subscription' }>[],
      {
        placeHolder: 'Select resolver type',
        title: 'GraphQL Resolver Generator',
      },
    );

    return choice?.value ?? null;
  }

  /**
   * Gets resolver name from user
   */
  private async getResolverName(type: string): Promise<string | undefined> {
    const defaultName = type === 'Query' ? 'App' : type === 'Mutation' ? 'App' : 'App';

    const input = await vscode.window.showInputBox({
      prompt: `Enter ${type} resolver name (e.g., Users, Products)`,
      placeHolder: defaultName,
      value: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Resolver name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Resolver name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    return input?.trim();
  }

  /**
   * Collects fields for the resolver
   */
  private async collectFields(
    type: string,
    config: GraphQLResolverConfig,
  ): Promise<GraphQLResolver[] | null> {
    const fields: GraphQLResolver[] = [];

    let addMore = true;
    while (addMore) {
      const field = await this.createField(type, config);
      if (field) {
        fields.push(field);
      }

      if (fields.length > 0) {
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
      } else {
        addMore = false;
      }
    }

    return fields.length > 0 ? fields : null;
  }

  /**
   * Creates a single field through user interaction
   */
  private async createField(
    resolverType: string,
    config: GraphQLResolverConfig,
  ): Promise<GraphQLResolver | null> {
    // Get field name
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${resolverType.toLowerCase()} field name`,
      placeHolder: resolverType === 'Query' ? 'user' : 'createUser',
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

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional)',
      placeHolder: `${resolverType} ${fieldName}`,
    });

    // Get return type
    const returnType = await this.getReturnType(fieldName, resolverType);

    // Collect arguments
    const args = await this.collectArguments(resolverType, fieldName);

    return {
      name: fieldName,
      type: resolverType.toLowerCase() as 'query' | 'mutation' | 'subscription',
      fields: [
        {
          name: fieldName,
          type: returnType,
          description: description?.trim() || `${resolverType} ${fieldName}`,
          args,
          isNullable: returnType.endsWith('!') === false,
          isArray: returnType.startsWith('['),
          returnType,
        },
      ],
      returnType,
      description: description?.trim() || `${resolverType} ${fieldName}`,
    };
  }

  /**
   * Collects arguments for a field
   */
  private async collectArguments(
    resolverType: string,
    fieldName: string,
  ): Promise<GraphQLArgument[]> {
    const args: GraphQLArgument[] = [];

    // Add default arguments based on resolver type
    if (resolverType === 'Query') {
      // Ask for ID argument
      const addIdArg = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: `Add 'id' argument to ${fieldName}?` },
      );

      if (addIdArg?.value === 'yes') {
        args.push({
          name: 'id',
          type: 'ID!',
          description: 'The unique identifier',
          isNullable: false,
        });
      }
    }

    // Ask for more arguments
    let addMoreArgs = true;
    while (addMoreArgs) {
      const addArg = await vscode.window.showQuickPick(
        [
          { label: 'Add argument', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add arguments to field' },
      );

      if (!addArg || addArg.value === 'done') {
        break;
      }

      const arg = await this.createArgument();
      if (arg) {
        args.push(arg);
      }
    }

    return args;
  }

  /**
   * Creates a single argument
   */
  private async createArgument(): Promise<GraphQLArgument | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter argument name',
      placeHolder: 'input',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Argument name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Argument name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const argName = nameInput.trim();

    // Get argument type
    const typeInput = await vscode.window.showInputBox({
      prompt: 'Enter argument type',
      placeHolder: 'String',
      value: 'String',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Type cannot be empty';
        }
        return null;
      },
    });

    if (!typeInput) {
      return null;
    }

    const argType = typeInput.trim();

    // Ask if nullable
    const isNullable = await vscode.window.showQuickPick(
      [
        { label: 'Required (!)', value: false },
        { label: 'Optional', value: true },
      ],
      { placeHolder: `Is ${argName} required?` },
    );

    const fullType = isNullable?.value === false ? `${argType}!` : argType;

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter argument description (optional)',
      placeHolder: `The ${argName} argument`,
    });

    return {
      name: argName,
      type: fullType,
      description: descriptionInput?.trim() || `The ${argName} argument`,
      isNullable: isNullable?.value ?? true,
    };
  }

  /**
   * Gets the return type for a field
   */
  private async getReturnType(fieldName: string, resolverType: string): Promise<string> {
    const defaultTypes: Record<string, string> = {
      Query: 'Entity',
      Mutation: 'Entity',
      Subscription: 'Entity',
    };

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type (e.g., User, [User], UserResult)',
      placeHolder: defaultTypes[resolverType],
      value: defaultTypes[resolverType],
    });

    return input?.trim() || defaultTypes[resolverType];
  }

  /**
   * Generates imports based on fields and config
   */
  private generateImports(fields: GraphQLResolver[], config: GraphQLResolverConfig): string[] {
    const imports = new Set<string>([
      'Resolver, Query, Mutation, Subscription, Args, ResolveProperty, Parent, Context',
      'UseGuards',
    ]);

    if (config.generateDataLoaders) {
      imports.add('Loader');
      imports.add('LoaderFactory');
    }

    if (config.includeAuthGuard) {
      imports.add('GqlAuthGuard');
      imports.add('GqlAccessGuard');
    }

    // Check if any field has complex types
    const hasComplexArgs = fields.some((f) =>
      f.fields.some((field) =>
        field.args.some((arg) => arg.type.includes('Input') || arg.type.includes('Result')),
      ),
    );

    if (hasComplexArgs) {
      imports.add('ValidationPipe');
    }

    return Array.from(imports);
  }

  /**
   * Generates the resolver code
   */
  private generateResolverCode(
    resolverName: string,
    resolverType: string,
    resolvers: GraphQLResolver[],
    imports: string[],
    config: GraphQLResolverConfig,
  ): string {
    let code = '';

    // Imports
    code += `import {\n`;
    code += `  ${imports.join(',\n  ')}\n`;
    code += `} from '@nestjs/graphql';\n`;

    if (config.includeAuthGuard) {
      code += `import { CurrentUser } from '../auth/decorators/current-user.decorator';\n`;
    }

    if (config.generateDataLoaders) {
      code += `import { DataLoader } from '../dataloader/decorators/dataloader.decorator';\n`;
      code += `import * as DataLoader from 'dataloader';\n`;
    }

    if (config.generateInterfaces) {
      code += `import { ${resolverName}Service } from './${this.kebabCase(resolverName)}.service';\n`;
    }

    code += '\n';

    // Resolver decorator
    code += `@Resolver()\n`;

    if (config.includeAuthGuard) {
      code += `@UseGuards(GqlAuthGuard)\n`;
    }

    code += `export class ${resolverName}Resolver {\n`;
    code += `  constructor(\n`;

    if (config.generateInterfaces) {
      code += `    private readonly ${this.camelCase(resolverName)}Service: ${resolverName}Service,\n`;
    }

    code += `  ) {}\n\n`;

    // Generate methods
    for (const field of resolvers) {
      code += this.generateFieldMethod(resolverName, field, config);
      code += '\n';
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates a field method
   */
  private generateFieldMethod(
    resolverName: string,
    field: GraphQLResolver,
    config: GraphQLResolverConfig,
  ): string {
    let code = '';

    const fieldInfo = field.fields[0];
    const methodDecorator = this.ucfirst(field.type);

    // Method decorators
    code += `  @${methodDecorator}(() => ${this.unwrapType(fieldInfo.type)})\n`;

    if (config.includeAuthGuard) {
      code += `  @UseGuards(GqlAccessGuard)\n`;
    }

    if (fieldInfo.description) {
      code += `  // ${this.escapeString(fieldInfo.description)}\n`;
    }

    // Method signature
    const methodName = this.getMethodName(field);
    code += `  async ${methodName}(`;

    // Parameters
    const params: string[] = [];

    if (fieldInfo.args.length > 0) {
      for (const arg of fieldInfo.args) {
        const decorator = this.getParamDecorator(arg, config);
        params.push(`${decorator} ${arg.name}: ${this.graphqlTypeToTypeScript(arg.type)}`);
      }
    }

    if (config.includeAuthGuard) {
      params.push('@CurrentUser() user: any');
    }

    if (fieldInfo.args.length > 0 || config.includeAuthGuard) {
      code += `\n    ${params.join(',\n    ')},\n  `;
    }

    // Return type
    const tsReturnType = this.graphqlTypeToTypeScript(fieldInfo.type);
    code += `): Promise<${tsReturnType}> {\n`;

    // Method body with error handling
    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      // TODO: Implement ${methodDecorator.toLowerCase()} ${field.name}\n`;

      if (config.generateInterfaces) {
        const serviceName = this.camelCase(resolverName);
        if (field.type === 'query') {
          code += `      const result = await this.${serviceName}Service.findOne(/* params */);\n`;
        } else if (field.type === 'mutation') {
          code += `      const result = await this.${serviceName}Service.create(/* data */);\n`;
        } else if (field.type === 'subscription') {
          code += `      // Return a PubSub iterator\n`;
          code += `      return this.${serviceName}Service.${methodName}();\n`;
        } else {
          code += `      return this.${serviceName}Service.${methodName}();\n`;
        }
      } else {
        code += `      // Your implementation here\n`;
        if (field.type !== 'subscription') {
          code += `      return {} as ${tsReturnType};\n`;
        } else {
          code += `      // Subscription implementation\n`;
        }
      }

      code += `    } catch (error) {\n`;
      code += `      // Handle error appropriately\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
    } else {
      code += `    // TODO: Implement ${methodDecorator.toLowerCase()} ${field.name}\n`;

      if (config.generateInterfaces) {
        const serviceName = this.camelCase(resolverName);
        if (field.type === 'query') {
          code += `    return this.${serviceName}Service.findOne(/* params */);\n`;
        } else if (field.type === 'mutation') {
          code += `    return this.${serviceName}Service.create(/* data */);\n`;
        } else {
          code += `    return this.${serviceName}Service.${methodName}();\n`;
        }
      } else {
        code += `    return {} as ${tsReturnType};\n`;
      }
    }

    code += `  }\n`;

    return code;
  }

  /**
   * Generates DataLoader code
   */
  private generateDataLoaderCode(resolverName: string, resolvers: GraphQLResolver[]): string {
    let code = '';

    code += `import * as DataLoader from 'dataloader';\n`;
    code += `import { ${resolverName}Service } from './${this.kebabCase(resolverName)}.service';\n\n`;

    // Collect all types that need DataLoaders
    const typesNeedingLoaders = new Set<string>();

    for (const resolver of resolvers) {
      for (const field of resolver.fields) {
        // Check if return type is an entity that might need loading
        const baseType = this.unwrapType(field.returnType);
        if (baseType !== field.returnType && !baseType.includes('[')) {
          typesNeedingLoaders.add(baseType);
        }
      }
    }

    code += `/**\n`;
    code += ` * DataLoaders for ${resolverName}\n`;
    code += ` * Prevents N+1 queries by batching requests\n`;
    code += ` */\n`;

    for (const type of typesNeedingLoaders) {
      const loaderName = `${type}Loader`;
      code += `export const ${loaderName} = new DataLoader(async (ids: readonly string[]) => {\n`;
      code += `  const ${this.camelCase(type)}s = await ${resolverName}Service.findByIds(ids as string[]);\n`;
      code += `  return ids.map((id) => ${this.camelCase(type)}s.find((item) => item.id === id));\n`;
      code += `});\n\n`;
    }

    return code;
  }

  /**
   * Creates the resolver file at the specified path
   */
  public async createResolverFile(
    filePath: string,
    code: string,
    dataLoaderCode?: string,
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write resolver file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    // Create DataLoader file if provided
    if (dataLoaderCode) {
      const dataloaderDir = path.join(directory, 'dataloader');
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(dataloaderDir));
      } catch {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dataloaderDir));
      }

      const dataloaderPath = path.join(
        dataloaderDir,
        `${path.basename(filePath, '.ts')}.loaders.ts`,
      );
      const dataloaderUri = vscode.Uri.file(dataloaderPath);
      await vscode.workspace.fs.writeFile(dataloaderUri, Buffer.from(dataLoaderCode, 'utf-8'));
    }

    this.logger.info('Resolver file created', { filePath });
  }

  /**
   * Converts GraphQL type to TypeScript type
   */
  private graphqlTypeToTypeScript(graphqlType: string): string {
    const typeMap: Record<string, string> = {
      ID: 'string',
      String: 'string',
      Int: 'number',
      Float: 'number',
      Boolean: 'boolean',
    };

    // Remove non-null and list modifiers
    const baseType = graphqlType.replace(/[!]/g, '').replace(/[\[\]]/g, '');

    // Map scalar types
    const mappedType = typeMap[baseType] || baseType;

    // Handle array types
    if (graphqlType.startsWith('[')) {
      return `${mappedType}[]`;
    }

    return mappedType;
  }

  /**
   * Unwraps GraphQL type to get base type
   */
  private unwrapType(graphqlType: string): string {
    let type = graphqlType;

    // Remove non-null marker
    type = type.replace(/!$/, '');

    // Remove list wrapper
    if (type.startsWith('[') && type.endsWith(']')) {
      type = type.slice(1, -1);
    }

    // Remove non-null marker from inner type
    type = type.replace(/!$/, '');

    return type;
  }

  /**
   * Gets parameter decorator
   */
  private getParamDecorator(arg: GraphQLArgument, config: GraphQLResolverConfig): string {
    if (config.generateDataLoaders && arg.name.endsWith('Id')) {
      return `@DataLoader('${arg.name.replace('Id', '')}Loader')`;
    }
    return `@Args('${arg.name}')`;
  }

  /**
   * Gets method name from field
   */
  private getMethodName(field: GraphQLResolver): string {
    return field.name;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
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
   * Escapes string for use in template literals
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }
}
