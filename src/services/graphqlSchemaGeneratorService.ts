import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface GraphQLSchemaGeneratorConfig {
  enabled: boolean;
  includeDescriptions: boolean;
  includeDirectives: boolean;
  defaultSchemaPath: string;
  federationEnabled: boolean;
  federationVersion: '2.0' | '2.1';
  generateInputs: boolean;
  generateEnums: boolean;
  generateInterfaces: boolean;
  generateUnions: boolean;
}

export interface GraphQLSchemaField {
  name: string;
  type: string;
  description?: string;
  isNullable: boolean;
  isArray: boolean;
  args?: GraphQLSchemaField[];
  defaultValue?: string;
  directives?: string[];
}

export interface GraphQLSchemaType {
  name: string;
  kind: 'type' | 'interface' | 'input' | 'enum' | 'union';
  description?: string;
  fields: GraphQLSchemaField[];
  directives?: string[];
}

export interface GraphQLSchemaResult {
  schemaCode: string;
  types: GraphQLSchemaType[];
}

/**
 * Service for generating GraphQL schemas from TypeScript interfaces
 * with proper types, inputs, enums, and directive usage
 */
export class GraphQLSchemaGeneratorService {
  private static instance: GraphQLSchemaGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): GraphQLSchemaGeneratorService {
    GraphQLSchemaGeneratorService.instance ??= new GraphQLSchemaGeneratorService();
    return GraphQLSchemaGeneratorService.instance;
  }

  /**
   * Generates a GraphQL schema based on user input
   */
  public async generateSchema(
    workspacePath: string,
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaResult | null> {
    // Collect type definitions
    const types = await this.collectTypes(config);

    if (!types || types.length === 0) {
      vscode.window.showWarningMessage('No types defined. Schema generation cancelled.');
      return null;
    }

    // Generate schema code
    const schemaCode = this.generateSchemaCode(types, config);

    this.logger.info('GraphQL schema generated', {
      typeCount: types.length,
      federation: config.federationEnabled,
    });

    return {
      schemaCode,
      types,
    };
  }

  /**
   * Collects type definitions through user interaction
   */
  private async collectTypes(
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaType[] | null> {
    const types: GraphQLSchemaType[] = [];

    let addMore = true;
    while (addMore) {
      const type = await this.createType(config);
      if (type) {
        types.push(type);
      }

      if (types.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another type', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another type or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return types.length > 0 ? types : null;
  }

  /**
   * Creates a single type through user interaction
   */
  private async createType(
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaType | null> {
    // Get type kind
    const kindChoice = await vscode.window.showQuickPick(
      [
        { label: 'Type', value: 'type', description: 'Standard object type' },
        { label: 'Input', value: 'input', description: 'Input type for mutations' },
        { label: 'Interface', value: 'interface', description: 'Interface type' },
        { label: 'Enum', value: 'enum', description: 'Enumeration type' },
        { label: 'Union', value: 'union', description: 'Union type' },
      ],
      {
        placeHolder: 'Select type kind',
      },
    );

    if (!kindChoice) {
      return null;
    }

    const kind = kindChoice.value as GraphQLSchemaType['kind'];

    // Get type name
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${kind} name`,
      placeHolder: kind === 'enum' ? 'Status' : this.capitalize(kind),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Type name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Type name must start with uppercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const typeName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter type description (optional)',
      placeHolder: `The ${typeName} ${kind}`,
    });

    // Get fields or values based on type kind
    let fields: GraphQLSchemaField[] = [];

    if (kind === 'enum') {
      fields = await this.collectEnumValues(config);
    } else if (kind === 'union') {
      fields = await this.collectUnionTypes(config);
    } else {
      fields = await this.collectFields(kind, config);
    }

    return {
      name: typeName,
      kind,
      description: description?.trim() || `The ${typeName} ${kind}`,
      fields,
      directives: config.includeDirectives ? this.getDefaultDirectives(kind) : [],
    };
  }

  /**
   * Collects fields for a type
   */
  private async collectFields(
    typeKind: GraphQLSchemaType['kind'],
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaField[]> {
    const fields: GraphQLSchemaField[] = [];

    let addMore = true;
    while (addMore) {
      const field = await this.createField(typeKind, config);
      if (field) {
        fields.push(field);
      }

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add field', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another field?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return fields;
  }

  /**
   * Creates a single field
   */
  private async createField(
    typeKind: GraphQLSchemaType['kind'],
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaField | null> {
    // Get field name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter field name',
      placeHolder: 'id',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Field name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Field name must start with lowercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const fieldName = nameInput.trim();

    // Get field type
    const typeInput = await vscode.window.showInputBox({
      prompt: 'Enter field type (e.g., String, Int, User, [User])',
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

    const fieldType = typeInput.trim();

    // Check if nullable
    const isNullable = await vscode.window.showQuickPick(
      [
        { label: 'Required (!)', value: false },
        { label: 'Optional', value: true },
      ],
      { placeHolder: `Is ${fieldName} required?` },
    );

    // Get description
    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional)',
      placeHolder: `The ${fieldName} field`,
    });

    const field: GraphQLSchemaField = {
      name: fieldName,
      type: fieldType,
      description: descriptionInput?.trim() || `The ${fieldName} field`,
      isNullable: isNullable?.value ?? true,
      isArray: fieldType.startsWith('['),
    };

    // For non-input types, ask for arguments if it's a field that might need them
    if (typeKind === 'type' || typeKind === 'interface') {
      const addArgs = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: `Add arguments to ${fieldName}?` },
      );

      if (addArgs?.value === 'yes') {
        field.args = await this.collectArguments(config);
      }
    }

    return field;
  }

  /**
   * Collects arguments for a field
   */
  private async collectArguments(
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaField[]> {
    const args: GraphQLSchemaField[] = [];

    let addMore = true;
    while (addMore) {
      const arg = await this.createArgument(config);
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
   * Creates a single argument
   */
  private async createArgument(
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaField | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter argument name',
      placeHolder: 'input',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Argument name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Argument name must start with lowercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const argName = nameInput.trim();

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

    const isNullable = await vscode.window.showQuickPick(
      [
        { label: 'Required (!)', value: false },
        { label: 'Optional', value: true },
      ],
      { placeHolder: `Is ${argName} required?` },
    );

    const defaultValueInput = await vscode.window.showInputBox({
      prompt: 'Enter default value (optional)',
      placeHolder: 'null',
    });

    return {
      name: argName,
      type: argType,
      description: `The ${argName} argument`,
      isNullable: isNullable?.value ?? true,
      isArray: argType.startsWith('['),
      defaultValue: defaultValueInput?.trim(),
    };
  }

  /**
   * Collects enum values
   */
  private async collectEnumValues(
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaField[]> {
    const values: GraphQLSchemaField[] = [];

    let addMore = true;
    while (addMore) {
      const valueInput = await vscode.window.showInputBox({
        prompt: 'Enter enum value name',
        placeHolder: 'ACTIVE',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Value name cannot be empty';
          }
          if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
            return 'Enum value must be uppercase and contain only letters, numbers, and underscores';
          }
          return null;
        },
      });

      if (!valueInput) {
        break;
      }

      const valueName = valueInput.trim();

      const descriptionInput = await vscode.window.showInputBox({
        prompt: 'Enter value description (optional)',
        placeHolder: `The ${valueName} state`,
      });

      values.push({
        name: valueName,
        type: 'String',
        description: descriptionInput?.trim() || `The ${valueName} state`,
        isNullable: false,
        isArray: false,
      });

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add value', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another value?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return values;
  }

  /**
   * Collects union types
   */
  private async collectUnionTypes(
    config: GraphQLSchemaGeneratorConfig,
  ): Promise<GraphQLSchemaField[]> {
    const unionTypes: GraphQLSchemaField[] = [];

    let addMore = true;
    while (addMore) {
      const typeInput = await vscode.window.showInputBox({
        prompt: 'Enter union member type name',
        placeHolder: 'User',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Type name cannot be empty';
          }
          if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
            return 'Type name must start with uppercase letter and contain only letters, numbers, and underscores';
          }
          return null;
        },
      });

      if (!typeInput) {
        break;
      }

      const typeName = typeInput.trim();

      const descriptionInput = await vscode.window.showInputBox({
        prompt: 'Enter type description (optional)',
        placeHolder: `The ${typeName} type`,
      });

      unionTypes.push({
        name: typeName,
        type: typeName,
        description: descriptionInput?.trim() || `The ${typeName} type`,
        isNullable: false,
        isArray: false,
      });

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add type', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another union type?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return unionTypes;
  }

  /**
   * Generates the schema code from types
   */
  private generateSchemaCode(
    types: GraphQLSchemaType[],
    config: GraphQLSchemaGeneratorConfig,
  ): string {
    let code = '';

    // Add federation imports if enabled
    if (config.federationEnabled) {
      code += `# Apollo Federation ${config.federationVersion} Specification\n`;
      code += `extend schema\n`;
      code += `  @link(url: "https://specs.apollo.dev/federation/v${config.federationVersion.replace('.', '')}",\n`;
      code += `        import: ["@key", "@shareable", "@inaccessible"])\n\n`;
    }

    code += `# Auto-generated GraphQL schema\n`;
    code += `# Generated by Additional Context Menus extension\n\n`;

    // Generate each type
    for (const type of types) {
      code += this.generateTypeCode(type, config);
      code += '\n';
    }

    return code;
  }

  /**
   * Generates code for a single type
   */
  private generateTypeCode(type: GraphQLSchemaType, config: GraphQLSchemaGeneratorConfig): string {
    let code = '';

    // Add description
    if (config.includeDescriptions && type.description) {
      code += `"""\n${type.description}\n"""\n`;
    }

    // Add directives for the type
    if (type.directives && type.directives.length > 0) {
      for (const directive of type.directives) {
        code += `${directive}\n`;
      }
    }

    // Type declaration
    if (type.kind === 'enum') {
      code += `enum ${type.name} {\n`;
      for (const field of type.fields) {
        if (config.includeDescriptions && field.description) {
          code += `  """\n  ${field.description}\n  """\n`;
        }
        code += `  ${field.name}`;
        if (field.directives && field.directives.length > 0) {
          code += ' ' + field.directives.join(' ');
        }
        code += '\n';
      }
      code += '}\n';
    } else if (type.kind === 'union') {
      const members = type.fields.map((f) => f.name).join(' | ');
      code += `union ${type.name} = ${members}\n`;
    } else {
      const typeKeyword =
        type.kind === 'input' ? 'input' : type.kind === 'interface' ? 'interface' : 'type';
      code += `${typeKeyword} ${type.name} {\n`;

      for (const field of type.fields) {
        if (config.includeDescriptions && field.description) {
          code += `  """\n  ${field.description}\n  """\n`;
        }

        // Field declaration
        code += `  ${field.name}`;

        // Arguments
        if (field.args && field.args.length > 0) {
          code += '(';
          const argStrings: string[] = [];
          for (const arg of field.args) {
            let argStr = arg.name;
            if (!arg.isNullable) {
              argStr += '!';
            }
            argStr += ': ' + arg.type;
            if (arg.defaultValue) {
              argStr += ` = ${arg.defaultValue}`;
            }
            argStrings.push(argStr);
          }
          code += argStrings.join(', ');
          code += ')';
        }

        // Field type
        code += ': ' + field.type;
        if (!field.isNullable) {
          code += '!';
        }

        // Field directives
        if (field.directives && field.directives.length > 0) {
          code += ' ' + field.directives.join(' ');
        }

        code += '\n';
      }

      code += '}\n';
    }

    return code;
  }

  /**
   * Gets default directives for a type kind
   */
  private getDefaultDirectives(kind: GraphQLSchemaType['kind']): string[] {
    if (kind === 'type') {
      return ['@shareable'];
    }
    return [];
  }

  /**
   * Capitalizes a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the schema file at the specified path
   */
  public async createSchemaFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write schema file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Schema file created', { filePath });
  }
}
