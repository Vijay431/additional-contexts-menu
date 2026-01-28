import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface GraphQLDirectiveGeneratorConfig {
  enabled: boolean;
  directivePath: string;
  includeAuthDirectives: boolean;
  includeLoggingDirectives: boolean;
  includeFormattingDirectives: boolean;
  includeValidationDirectives: boolean;
  includeTypeScript: boolean;
  defaultDirectiveName: string;
}

export interface DirectiveArgument {
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
}

export interface GraphQLDirective {
  name: string;
  description?: string;
  locations: DirectiveLocation[];
  args?: DirectiveArgument[];
  isRepeatable: boolean;
  category: 'auth' | 'logging' | 'formatting' | 'validation' | 'custom';
}

export type DirectiveLocation =
  | 'QUERY'
  | 'MUTATION'
  | 'SUBSCRIPTION'
  | 'FIELD'
  | 'FRAGMENT_DEFINITION'
  | 'FRAGMENT_SPREAD'
  | 'INLINE_FRAGMENT'
  | 'VARIABLE_DEFINITION'
  | 'SCHEMA'
  | 'SCALAR'
  | 'OBJECT'
  | 'FIELD_DEFINITION'
  | 'ARGUMENT_DEFINITION'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'ENUM_VALUE'
  | 'INPUT_OBJECT'
  | 'INPUT_FIELD_DEFINITION';

export interface DirectiveGenerationResult {
  directives: GraphQLDirective[];
  schemaDefinitions: string;
  resolverImplementations: string;
  integrationCode: string;
  typesCode: string;
}

/**
 * Service for generating custom GraphQL directives with resolver implementations
 * for auth, logging, formatting, and validation
 */
export class GraphQLDirectiveGeneratorService {
  private static instance: GraphQLDirectiveGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): GraphQLDirectiveGeneratorService {
    GraphQLDirectiveGeneratorService.instance ??= new GraphQLDirectiveGeneratorService();
    return GraphQLDirectiveGeneratorService.instance;
  }

  /**
   * Generates GraphQL directives based on user configuration
   */
  public async generateDirectives(
    _workspacePath: string,
    config: GraphQLDirectiveGeneratorConfig,
  ): Promise<DirectiveGenerationResult | null> {
    // Collect directive definitions
    const directives = await this.collectDirectives(config);

    if (!directives || directives.length === 0) {
      vscode.window.showWarningMessage('No directives defined. Generation cancelled.');
      return null;
    }

    // Generate schema definitions
    const schemaDefinitions = this.generateSchemaDefinitions(directives);

    // Generate resolver implementations
    const resolverImplementations = this.generateResolverImplementations(directives, config);

    // Generate integration code
    const integrationCode = this.generateIntegrationCode(directives, config);

    // Generate types
    const typesCode = this.generateTypesCode(directives, config);

    this.logger.info('GraphQL directives generated', {
      directiveCount: directives.length,
      categories: Array.from(new Set(directives.map((d) => d.category))),
    });

    return {
      directives,
      schemaDefinitions,
      resolverImplementations,
      integrationCode,
      typesCode,
    };
  }

  /**
   * Collects directive definitions through user interaction
   */
  private async collectDirectives(
    config: GraphQLDirectiveGeneratorConfig,
  ): Promise<GraphQLDirective[] | null> {
    const directives: GraphQLDirective[] = [];

    // First, offer preset directives based on config
    await this.offerPresetDirectives(directives, config);

    // Then allow custom directives
    let addMore = true;
    while (addMore) {
      const directive = await this.createDirective();
      if (directive) {
        directives.push(directive);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another directive', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another directive or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return directives.length > 0 ? directives : null;
  }

  /**
   * Offers preset directives based on configuration
   */
  private async offerPresetDirectives(
    directives: GraphQLDirective[],
    config: GraphQLDirectiveGeneratorConfig,
  ): Promise<void> {
    const presetOptions: Array<{ label: string; description: string; directive: GraphQLDirective }> =
      [];

    if (config.includeAuthDirectives) {
      presetOptions.push({
        label: '@authenticated',
        description: 'Require authentication for fields',
        directive: {
          name: 'authenticated',
          description: 'Restricts field access to authenticated users',
          locations: ['FIELD_DEFINITION', 'OBJECT'],
          args: [],
          isRepeatable: false,
          category: 'auth',
        },
      });

      presetOptions.push({
        label: '@hasRole',
        description: 'Require specific role for access',
        directive: {
          name: 'hasRole',
          description: 'Restricts field access to users with specific roles',
          locations: ['FIELD_DEFINITION', 'OBJECT'],
          args: [
            {
              name: 'roles',
              type: '[String!]!',
              description: 'Allowed roles for accessing this field',
            },
          ],
          isRepeatable: false,
          category: 'auth',
        },
      });

      presetOptions.push({
        label: '@hasPermission',
        description: 'Require specific permission',
        directive: {
          name: 'hasPermission',
          description: 'Restricts field access to users with specific permissions',
          locations: ['FIELD_DEFINITION', 'OBJECT'],
          args: [
            {
              name: 'permission',
              type: 'String!',
              description: 'Required permission',
            },
          ],
          isRepeatable: false,
          category: 'auth',
        },
      });
    }

    if (config.includeLoggingDirectives) {
      presetOptions.push({
        label: '@log',
        description: 'Log field execution',
        directive: {
          name: 'log',
          description: 'Logs field execution with optional message',
          locations: ['FIELD_DEFINITION', 'FIELD'],
          args: [
            {
              name: 'message',
              type: 'String',
              description: 'Custom log message',
              defaultValue: "'Field executed'",
            },
            {
              name: 'level',
              type: 'String',
              description: 'Log level (info, warn, error)',
              defaultValue: "'info'",
            },
          ],
          isRepeatable: false,
          category: 'logging',
        },
      });

      presetOptions.push({
        label: '@track',
        description: 'Track field usage metrics',
        directive: {
          name: 'track',
          description: 'Tracks field usage for analytics',
          locations: ['FIELD_DEFINITION', 'FIELD'],
          args: [
            {
              name: 'event',
              type: 'String!',
              description: 'Event name for tracking',
            },
          ],
          isRepeatable: false,
          category: 'logging',
        },
      });
    }

    if (config.includeFormattingDirectives) {
      presetOptions.push({
        label: '@formatDate',
        description: 'Format date fields',
        directive: {
          name: 'formatDate',
          description: 'Formats date fields according to specified format',
          locations: ['FIELD_DEFINITION', 'FIELD'],
          args: [
            {
              name: 'format',
              type: 'String!',
              description: 'Date format string (e.g., "YYYY-MM-DD")',
            },
          ],
          isRepeatable: false,
          category: 'formatting',
        },
      });

      presetOptions.push({
        label: '@uppercase',
        description: 'Convert string to uppercase',
        directive: {
          name: 'uppercase',
          description: 'Converts string field values to uppercase',
          locations: ['FIELD_DEFINITION', 'FIELD'],
          args: [],
          isRepeatable: false,
          category: 'formatting',
        },
      });

      presetOptions.push({
        label: '@lowercase',
        description: 'Convert string to lowercase',
        directive: {
          name: 'lowercase',
          description: 'Converts string field values to lowercase',
          locations: ['FIELD_DEFINITION', 'FIELD'],
          args: [],
          isRepeatable: false,
          category: 'formatting',
        },
      });

      presetOptions.push({
        label: '@truncate',
        description: 'Truncate string to max length',
        directive: {
          name: 'truncate',
          description: 'Truncates string values to maximum length',
          locations: ['FIELD_DEFINITION', 'FIELD'],
          args: [
            {
              name: 'length',
              type: 'Int!',
              description: 'Maximum length',
            },
            {
              name: 'suffix',
              type: 'String',
              description: 'Suffix to add when truncated',
              defaultValue: "'...'",
            },
          ],
          isRepeatable: false,
          category: 'formatting',
        },
      });
    }

    if (config.includeValidationDirectives) {
      presetOptions.push({
        label: '@validate',
        description: 'Validate field value',
        directive: {
          name: 'validate',
          description: 'Validates field values against rules',
          locations: ['FIELD_DEFINITION', 'ARGUMENT_DEFINITION', 'INPUT_FIELD_DEFINITION'],
          args: [
            {
              name: 'pattern',
              type: 'String',
              description: 'Regex pattern for validation',
            },
            {
              name: 'min',
              type: 'Int',
              description: 'Minimum value/length',
            },
            {
              name: 'max',
              type: 'Int',
              description: 'Maximum value/length',
            },
          ],
          isRepeatable: false,
          category: 'validation',
        },
      });

      presetOptions.push({
        label: '@email',
        description: 'Validate email format',
        directive: {
          name: 'email',
          description: 'Validates email format',
          locations: ['FIELD_DEFINITION', 'ARGUMENT_DEFINITION', 'INPUT_FIELD_DEFINITION'],
          args: [],
          isRepeatable: false,
          category: 'validation',
        },
      });

      presetOptions.push({
        label: '@length',
        description: 'Validate string length',
        directive: {
          name: 'length',
          description: 'Validates string length',
          locations: ['FIELD_DEFINITION', 'ARGUMENT_DEFINITION', 'INPUT_FIELD_DEFINITION'],
          args: [
            {
              name: 'min',
              type: 'Int',
              description: 'Minimum length',
            },
            {
              name: 'max',
              type: 'Int',
              description: 'Maximum length',
            },
          ],
          isRepeatable: false,
          category: 'validation',
        },
      });
    }

    if (presetOptions.length === 0) {
      return;
    }

    // Ask if user wants to include preset directives
    const includePresets = await vscode.window.showQuickPick(
      [
        { label: 'Yes, let me choose', value: 'choose' },
        { label: 'No, create custom only', value: 'custom' },
        { label: 'No, cancel', value: 'cancel' },
      ],
      { placeHolder: 'Include preset directives?' },
    );

    if (!includePresets || includePresets.value === 'cancel') {
      return;
    }

    if (includePresets.value === 'choose') {
      // Allow user to select from preset options
      const selected = await vscode.window.showQuickPick(presetOptions, {
        placeHolder: 'Select preset directives to include',
        canPickMany: true,
      });

      if (selected) {
        for (const item of selected) {
          directives.push(item.directive);
        }
      }
    }
  }

  /**
   * Creates a custom directive through user interaction
   */
  private async createDirective(): Promise<GraphQLDirective | null> {
    // Get directive name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter directive name (without @ symbol)',
      placeHolder: 'myDirective',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directive name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Directive name must start with lowercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const directiveName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter directive description (optional)',
      placeHolder: `Custom ${directiveName} directive`,
    });

    // Get category
    const categoryChoice = await vscode.window.showQuickPick(
      [
        { label: 'Auth', value: 'auth', description: 'Authentication/authorization' },
        { label: 'Logging', value: 'logging', description: 'Logging/tracking' },
        { label: 'Formatting', value: 'formatting', description: 'Data formatting' },
        { label: 'Validation', value: 'validation', description: 'Data validation' },
        { label: 'Custom', value: 'custom', description: 'Custom directive' },
      ],
      { placeHolder: 'Select directive category' },
    );

    if (!categoryChoice) {
      return null;
    }

    const category = categoryChoice.value as GraphQLDirective['category'];

    // Get locations
    const locations = await this.selectDirectiveLocations();

    if (!locations || locations.length === 0) {
      return null;
    }

    // Ask for arguments
    const args = await this.collectDirectiveArguments();

    // Ask if repeatable
    const isRepeatableChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      { placeHolder: 'Is this directive repeatable?' },
    );

    const isRepeatable = isRepeatableChoice?.value ?? false;

    return {
      name: directiveName,
      description: description?.trim() || `Custom ${directiveName} directive`,
      locations,
      args,
      isRepeatable,
      category,
    };
  }

  /**
   * Selects directive locations
   */
  private async selectDirectiveLocations(): Promise<DirectiveLocation[] | null> {
    const allLocations: DirectiveLocation[] = [
      'QUERY',
      'MUTATION',
      'SUBSCRIPTION',
      'FIELD',
      'FRAGMENT_DEFINITION',
      'FRAGMENT_SPREAD',
      'INLINE_FRAGMENT',
      'VARIABLE_DEFINITION',
      'SCHEMA',
      'SCALAR',
      'OBJECT',
      'FIELD_DEFINITION',
      'ARGUMENT_DEFINITION',
      'INTERFACE',
      'UNION',
      'ENUM',
      'ENUM_VALUE',
      'INPUT_OBJECT',
      'INPUT_FIELD_DEFINITION',
    ];

    const selected = await vscode.window.showQuickPick(
      allLocations.map((loc) => ({
        label: loc,
        value: loc,
        description: this.getLocationDescription(loc),
      })),
      {
        placeHolder: 'Select directive locations',
        canPickMany: true,
      },
    );

    return selected ? selected.map((s) => s.value) : null;
  }

  /**
   * Gets description for a directive location
   */
  private getLocationDescription(location: DirectiveLocation): string {
    const descriptions: Record<DirectiveLocation, string> = {
      QUERY: 'Operation definition (Query)',
      MUTATION: 'Operation definition (Mutation)',
      SUBSCRIPTION: 'Operation definition (Subscription)',
      FIELD: 'Field selection',
      FRAGMENT_DEFINITION: 'Fragment definition',
      FRAGMENT_SPREAD: 'Fragment spread',
      INLINE_FRAGMENT: 'Inline fragment',
      VARIABLE_DEFINITION: 'Variable definition',
      SCHEMA: 'Schema definition',
      SCALAR: 'Scalar type',
      OBJECT: 'Object type',
      FIELD_DEFINITION: 'Field definition in type',
      ARGUMENT_DEFINITION: 'Argument definition',
      INTERFACE: 'Interface type',
      UNION: 'Union type',
      ENUM: 'Enum type',
      ENUM_VALUE: 'Enum value',
      INPUT_OBJECT: 'Input object type',
      INPUT_FIELD_DEFINITION: 'Field in input object',
    };

    return descriptions[location] || location;
  }

  /**
   * Collects directive arguments
   */
  private async collectDirectiveArguments(): Promise<DirectiveArgument[]> {
    const args: DirectiveArgument[] = [];

    let addMore = true;
    while (addMore) {
      const arg = await this.createDirectiveArgument();
      if (arg) {
        args.push(arg);
      }

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add argument', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another argument?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return args;
  }

  /**
   * Creates a single directive argument
   */
  private async createDirectiveArgument(): Promise<DirectiveArgument | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter argument name',
      placeHolder: 'role',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Argument name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Argument name must start with lowercase letter';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const argName = nameInput.trim();

    const typeInput = await vscode.window.showInputBox({
      prompt: 'Enter argument type (e.g., String, Int, [String!]!)',
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

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter argument description (optional)',
      placeHolder: `The ${argName} argument`,
    });

    const defaultValueInput = await vscode.window.showInputBox({
      prompt: 'Enter default value (optional)',
      placeHolder: 'null',
    });

    const result: DirectiveArgument = {
      name: argName,
      type: argType,
    };

    if (descriptionInput?.trim()) {
      result.description = descriptionInput.trim();
    }

    if (defaultValueInput?.trim()) {
      result.defaultValue = defaultValueInput.trim();
    }

    return result;
  }

  /**
   * Generates GraphQL schema definitions for directives
   */
  private generateSchemaDefinitions(directives: GraphQLDirective[]): string {
    let code = '';

    code += `# GraphQL Directive Definitions\n`;
    code += `# Auto-generated by Additional Context Menus extension\n`;
    code += `# Generated at: ${new Date().toISOString()}\n\n`;

    for (const directive of directives) {
      code += this.generateDirectiveDefinition(directive);
      code += '\n';
    }

    return code;
  }

  /**
   * Generates a single directive definition
   */
  private generateDirectiveDefinition(directive: GraphQLDirective): string {
    let code = '';

    // Add description
    if (directive.description) {
      code += `"""\n${directive.description}\n"""\n`;
    }

    // Directive definition
    code += `directive @${directive.name}`;

    // Arguments
    if (directive.args && directive.args.length > 0) {
      code += '(';
      const argStrings = directive.args.map((arg) => {
        let argStr = arg.name;
        if (arg.defaultValue) {
          argStr += `: ${arg.type} = ${arg.defaultValue}`;
        } else {
          argStr += `: ${arg.type}`;
        }
        return argStr;
      });
      code += argStrings.join(', ');
      code += ')';
    }

    // Locations
    code += ' on ';
    code += directive.locations.join(' | ');

    // Repeatable
    if (directive.isRepeatable) {
      code += ' repeatable';
    }

    return code;
  }

  /**
   * Generates TypeScript resolver implementations
   */
  private generateResolverImplementations(
    directives: GraphQLDirective[],
    config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `import { SchemaDirectiveVisitor } from '@graphql-tools/utils';\n`;
    code += `import { defaultFieldResolver, GraphQLField } from 'graphql';\n\n`;

    // Group by category
    const byCategory = this.groupByCategory(directives);

    // Generate implementations for each category
    for (const [category, categoryDirectives] of Object.entries(byCategory)) {
      code += this.generateCategoryImplementations(category, categoryDirectives, config);
      code += '\n';
    }

    return code;
  }

  /**
   * Groups directives by category
   */
  private groupByCategory(
    directives: GraphQLDirective[],
  ): Record<string, GraphQLDirective[]> {
    const grouped: Record<string, GraphQLDirective[]> = {};

    for (const directive of directives) {
      const category = directive.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category]!.push(directive);
    }

    return grouped;
  }

  /**
   * Generates implementations for a category
   */
  private generateCategoryImplementations(
    category: string,
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    switch (category) {
      case 'auth':
        code += this.generateAuthDirectives(directives, _config);
        break;
      case 'logging':
        code += this.generateLoggingDirectives(directives, _config);
        break;
      case 'formatting':
        code += this.generateFormattingDirectives(directives, _config);
        break;
      case 'validation':
        code += this.generateValidationDirectives(directives, _config);
        break;
      default:
        code += this.generateCustomDirectives(directives, _config);
    }

    return code;
  }

  /**
   * Generates auth directive implementations
   */
  private generateAuthDirectives(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Auth Directive Implementations\n\n`;

    for (const directive of directives) {
      const className = this.pascalCase(directive.name) + 'Directive';

      code += `export class ${className} extends SchemaDirectiveVisitor {\n`;

      if (directive.locations.includes('FIELD_DEFINITION')) {
        code += `  public visitFieldDefinition(field: GraphQLField<any, any>) {\n`;
        code += `    const { resolve = defaultFieldResolver } = field;\n\n`;
        code += `    field.resolve = async function (...args: any[]) {\n`;
        code += `      // TODO: Implement auth logic for @${directive.name}\n`;
        code += `      const context = args[2];\n`;
        code += `      const user = context?.user;\n\n`;

        if (directive.name === 'authenticated') {
          code += `      if (!user) {\n`;
          code += `        throw new Error('You must be logged in to access this field');\n`;
          code += `      }\n`;
        } else if (directive.name === 'hasRole') {
          code += `      const requiredRoles = this.args?.roles;\n`;
          code += `      if (!requiredRoles || !user.roles?.some((role: string) => requiredRoles.includes(role))) {\n`;
          code += `        throw new Error('You do not have permission to access this field');\n`;
          code += `      }\n`;
        } else if (directive.name === 'hasPermission') {
          code += `      const requiredPermission = this.args?.permission;\n`;
          code += `      if (!user.permissions?.includes(requiredPermission)) {\n`;
          code += `        throw new Error('You do not have permission to access this field');\n`;
          code += `      }\n`;
        } else {
          code += `      // Custom auth logic\n`;
        }

        code += `      return resolve.apply(this, args);\n`;
        code += `    };\n`;
        code += `  }\n\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates logging directive implementations
   */
  private generateLoggingDirectives(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Logging Directive Implementations\n\n`;

    for (const directive of directives) {
      const className = this.pascalCase(directive.name) + 'Directive';

      code += `export class ${className} extends SchemaDirectiveVisitor {\n`;

      if (directive.locations.includes('FIELD_DEFINITION') || directive.locations.includes('FIELD')) {
        code += `  public visitFieldDefinition(field: GraphQLField<any, any>) {\n`;
        code += `    const { resolve = defaultFieldResolver } = field;\n\n`;
        code += `    field.resolve = async function (...args: any[]) {\n`;
        code += `      const startTime = Date.now();\n`;
        code += `      const result = await resolve.apply(this, args);\n`;
        code += `      const duration = Date.now() - startTime;\n\n`;

        if (directive.name === 'log') {
          code += `      const message = args[1]?.${directive.name}?.message || 'Field executed';\n`;
          code += `      const level = args[1]?.${directive.name}?.level || 'info';\n`;
          code += `      console[level](\`[GraphQL] \${message}: \${field.name} (\${duration}ms)\`);\n`;
        } else if (directive.name === 'track') {
          code += `      const event = args[1]?.${directive.name}?.event || 'field_access';\n`;
          code += `      // TODO: Send to analytics service\n`;
          code += `      console.log(\`[Analytics] Event: \${event}, Field: \${field.name}, Duration: \${duration}ms\`);\n`;
        }

        code += `      return result;\n`;
        code += `    };\n`;
        code += `  }\n\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates formatting directive implementations
   */
  private generateFormattingDirectives(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Formatting Directive Implementations\n\n`;

    for (const directive of directives) {
      const className = this.pascalCase(directive.name) + 'Directive';

      code += `export class ${className} extends SchemaDirectiveVisitor {\n`;

      if (directive.locations.includes('FIELD_DEFINITION') || directive.locations.includes('FIELD')) {
        code += `  public visitFieldDefinition(field: GraphQLField<any, any>) {\n`;
        code += `    const { resolve = defaultFieldResolver } = field;\n\n`;
        code += `    field.resolve = async function (...args: any[]) {\n`;
        code += `      const result = await resolve.apply(this, args);\n\n`;

        if (directive.name === 'formatDate') {
          code += `      const format = args[1]?.${directive.name}?.format || 'YYYY-MM-DD';\n`;
          code += `      // TODO: Implement date formatting using a library like date-fns or moment\n`;
          code += `      return result; // Placeholder for formatted date\n`;
        } else if (directive.name === 'uppercase') {
          code += `      if (typeof result === 'string') {\n`;
          code += `        return result.toUpperCase();\n`;
          code += `      }\n`;
          code += `      return result;\n`;
        } else if (directive.name === 'lowercase') {
          code += `      if (typeof result === 'string') {\n`;
          code += `        return result.toLowerCase();\n`;
          code += `      }\n`;
          code += `      return result;\n`;
        } else if (directive.name === 'truncate') {
          code += `      const length = args[1]?.${directive.name}?.length || 100;\n`;
          code += `      const suffix = args[1]?.${directive.name}?.suffix || '...';\n`;
          code += `      if (typeof result === 'string' && result.length > length) {\n`;
          code += `        return result.substring(0, length) + suffix;\n`;
          code += `      }\n`;
          code += `      return result;\n`;
        }

        code += `    };\n`;
        code += `  }\n\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates validation directive implementations
   */
  private generateValidationDirectives(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Validation Directive Implementations\n\n`;

    for (const directive of directives) {
      const className = this.pascalCase(directive.name) + 'Directive';

      code += `export class ${className} extends SchemaDirectiveVisitor {\n`;

      if (directive.locations.includes('FIELD_DEFINITION') || directive.locations.includes('ARGUMENT_DEFINITION')) {
        code += `  public visitFieldDefinition(field: GraphQLField<any, any>) {\n`;
        code += `    // TODO: Implement validation for @${directive.name}\n`;
        code += `    // This would typically be handled in the resolver or by a validation library\n`;
        code += `  }\n\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates custom directive implementations
   */
  private generateCustomDirectives(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Custom Directive Implementations\n\n`;

    for (const directive of directives) {
      const className = this.pascalCase(directive.name) + 'Directive';

      code += `export class ${className} extends SchemaDirectiveVisitor {\n`;
      code += `  // TODO: Implement custom logic for @${directive.name}\n`;
      code += `  // Locations: ${directive.locations.join(', ')}\n`;

      if (directive.args && directive.args.length > 0) {
        code += `  // Args: ${directive.args.map((a) => a.name).join(', ')}\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates integration code
   */
  private generateIntegrationCode(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Directive Integration Code\n\n`;
    code += `import { makeExecutableSchema } from '@graphql-tools/schema';\n`;
    code += `import {\n`;

    const classNames = directives.map((d) => this.pascalCase(d.name) + 'Directive');
    code += classNames.join(',\n  ');

    code += `\n} from './directives';\n\n`;

    code += `export function createSchemaWithDirectives(typeDefs: string, resolvers: any) {\n`;
    code += `  const schema = makeExecutableSchema({\n`;
    code += `    typeDefs,\n`;
    code += `    resolvers,\n`;
    code += `  });\n\n`;

    code += `  // Apply directives\n`;
    code += `  const directives = [\n`;
    for (const directive of directives) {
      code += `    new ${this.pascalCase(directive.name)}Directive(),\n`;
    }
    code += `  ];\n\n`;

    code += `  // TODO: Visit schema with directives\n`;
    code += `  // This typically requires using SchemaDirectiveVisitor from @graphql-tools/utils\n\n`;

    code += `  return schema;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates types code
   */
  private generateTypesCode(
    directives: GraphQLDirective[],
    _config: GraphQLDirectiveGeneratorConfig,
  ): string {
    let code = '';

    code += `// Directive Types\n\n`;

    for (const directive of directives) {
      code += `export interface ${this.pascalCase(directive.name)}DirectiveConfig {\n`;

      if (directive.args && directive.args.length > 0) {
        for (const arg of directive.args) {
          const tsType = this.graphqlTypeToTypeScript(arg.type);
          code += `  ${arg.name}`;
          if (arg.defaultValue) {
            code += `?: ${tsType};\n`;
          } else if (!arg.type.endsWith('!')) {
            code += `?: ${tsType};\n`;
          } else {
            code += `: ${tsType};\n`;
          }
        }
      }

      code += `}\n\n`;
    }

    return code;
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
   * Converts string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Creates the directive files at the specified path
   */
  public async createDirectiveFiles(
    workspacePath: string,
    directivePath: string,
    result: DirectiveGenerationResult,
  ): Promise<void> {
    const fullDirectivePath = path.join(workspacePath, directivePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(fullDirectivePath));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(fullDirectivePath));
    }

    // Write schema definitions file
    const schemaUri = vscode.Uri.file(path.join(fullDirectivePath, 'directives.graphql'));
    await vscode.workspace.fs.writeFile(schemaUri, Buffer.from(result.schemaDefinitions, 'utf-8'));

    // Write resolver implementations file
    const resolverUri = vscode.Uri.file(path.join(fullDirectivePath, 'directives.ts'));
    await vscode.workspace.fs.writeFile(resolverUri, Buffer.from(result.resolverImplementations, 'utf-8'));

    // Write integration file
    const integrationUri = vscode.Uri.file(path.join(fullDirectivePath, 'integration.ts'));
    await vscode.workspace.fs.writeFile(integrationUri, Buffer.from(result.integrationCode, 'utf-8'));

    // Write types file
    const typesUri = vscode.Uri.file(path.join(fullDirectivePath, 'types.ts'));
    await vscode.workspace.fs.writeFile(typesUri, Buffer.from(result.typesCode, 'utf-8'));

    this.logger.info('Directive files created', {
      path: fullDirectivePath,
      files: ['directives.graphql', 'directives.ts', 'integration.ts', 'types.ts'],
    });
  }
}
