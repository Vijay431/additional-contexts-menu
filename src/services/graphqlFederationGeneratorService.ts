import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface GraphQLFederationGeneratorConfig {
  enabled: boolean;
  federationVersion: '2.0' | '2.1';
  includeDescriptions: boolean;
  defaultSubgraphPath: string;
  generateEntityExtensions: boolean;
  generateReferenceResolvers: boolean;
  generateKeyDirectives: boolean;
  generateShareableDirectives: boolean;
}

export interface FederationEntity {
  name: string;
  keyFields: string[];
  extendable: boolean;
  description: string;
  fields: FederationField[];
}

export interface FederationField {
  name: string;
  type: string;
  description?: string;
  isNullable: boolean;
  isArray: boolean;
  isExternal: boolean;
  overrideFrom?: string; // For @override directive
  requiresFields?: string[]; // For @requires directive
  providesFields?: string[]; // For @provides directive
}

export interface FederationReferenceResolver {
  entityName: string;
  referenceField: string;
  targetSubgraph: string;
  requiredFields: string[];
  resolverCode: string;
}

export interface GeneratedFederationSubgraph {
  subgraphName: string;
  schemaCode: string;
  entities: FederationEntity[];
  referenceResolvers: FederationReferenceResolver[];
  imports: string[];
}

/**
 * Service for generating Apollo Federation subgraph schemas with
 * entity extensions, reference resolvers, and federated directives
 */
export class GraphQLFederationGeneratorService {
  private static instance: GraphQLFederationGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): GraphQLFederationGeneratorService {
    GraphQLFederationGeneratorService.instance ??= new GraphQLFederationGeneratorService();
    return GraphQLFederationGeneratorService.instance;
  }

  /**
   * Generates a Federation subgraph schema
   */
  public async generateSubgraph(
    _workspacePath: string,
    config: GraphQLFederationGeneratorConfig,
  ): Promise<GeneratedFederationSubgraph | null> {
    // Get subgraph name
    const subgraphName = await this.getSubgraphName();
    if (!subgraphName) {
      return null;
    }

    // Collect entities
    const entities = await this.collectEntities(config);
    if (!entities || entities.length === 0) {
      vscode.window.showWarningMessage('No entities defined. Subgraph generation cancelled.');
      return null;
    }

    // Collect reference resolvers if enabled
    const referenceResolvers = config.generateReferenceResolvers
      ? await this.collectReferenceResolvers(entities)
      : [];

    // Generate schema code
    const schemaCode = this.generateSchemaCode(subgraphName, entities, config);

    // Generate imports
    const imports = this.generateImports(entities, referenceResolvers);

    this.logger.info('GraphQL Federation subgraph generated', {
      subgraphName,
      entityCount: entities.length,
      federationVersion: config.federationVersion,
    });

    return {
      subgraphName,
      schemaCode,
      entities,
      referenceResolvers,
      imports,
    };
  }

  /**
   * Gets the subgraph name from user
   */
  private async getSubgraphName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter subgraph name (e.g., users, products, orders)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Subgraph name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Subgraph name must start with lowercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    return input?.trim();
  }

  /**
   * Collects entity definitions
   */
  private async collectEntities(
    config: GraphQLFederationGeneratorConfig,
  ): Promise<FederationEntity[] | null> {
    const entities: FederationEntity[] = [];

    let addMore = true;
    while (addMore) {
      const entity = await this.createEntity(config);
      if (entity) {
        entities.push(entity);
      }

      if (entities.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another entity', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another entity or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return entities.length > 0 ? entities : null;
  }

  /**
   * Creates a single entity through user interaction
   */
  private async createEntity(
    config: GraphQLFederationGeneratorConfig,
  ): Promise<FederationEntity | null> {
    // Get entity name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter entity name',
      placeHolder: 'User',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Entity name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Entity name must start with uppercase letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const entityName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter entity description (optional)',
      placeHolder: `The ${entityName} entity`,
    });

    // Ask if this entity extends another subgraph
    const isExtendable = await vscode.window.showQuickPick(
      [
        { label: 'Yes, extends another subgraph', value: true },
        { label: 'No, defined in this subgraph', value: false },
      ],
      { placeHolder: `Does ${entityName} extend another subgraph?` },
    );

    // Collect key fields for @key directive
    const keyFields = await this.collectKeyFields(entityName);

    // Collect fields
    const fields = await this.collectFields(config, entityName);

    return {
      name: entityName,
      keyFields,
      extendable: isExtendable?.value ?? false,
      description: description?.trim() || `The ${entityName} entity`,
      fields,
    };
  }

  /**
   * Collects key fields for @key directive
   */
  private async collectKeyFields(entityName: string): Promise<string[]> {
    const keyFields: string[] = [];

    const addKeyField = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: `Add @key directive to ${entityName}?` },
    );

    if (addKeyField?.value === 'yes') {
      let addMore = true;
      while (addMore) {
        const fieldInput = await vscode.window.showInputBox({
          prompt: 'Enter key field name (e.g., id, or combination like "id userId")',
          placeHolder: 'id',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Key field cannot be empty';
            }
            return null;
          },
        });

        if (fieldInput) {
          keyFields.push(fieldInput.trim());
        }

        const addAnother = await vscode.window.showQuickPick(
          [
            { label: 'Add another key field', value: 'add' },
            { label: 'Done', value: 'done' },
          ],
          { placeHolder: 'Add another key field?' },
        );

        if (!addAnother || addAnother.value === 'done') {
          addMore = false;
        }
      }
    }

    return keyFields;
  }

  /**
   * Collects fields for an entity
   */
  private async collectFields(
    config: GraphQLFederationGeneratorConfig,
    entityName: string,
  ): Promise<FederationField[]> {
    const fields: FederationField[] = [];

    let addMore = true;
    while (addMore) {
      const field = await this.createField(config, entityName);
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
    _config: GraphQLFederationGeneratorConfig,
    _entityName: string,
  ): Promise<FederationField | null> {
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

    // Ask if field is external (from another subgraph)
    const isExternal = await vscode.window.showQuickPick(
      [
        { label: 'Yes, @external', value: true },
        { label: 'No', value: false },
      ],
      { placeHolder: `Is ${fieldName} external (from another subgraph)?` },
    );

    // Ask for @override if external
    let overrideFrom: string | undefined;
    if (isExternal?.value) {
      const overrideInput = await vscode.window.showInputBox({
        prompt: 'Enter subgraph name to override (optional)',
        placeHolder: 'original-subgraph',
      });
      overrideFrom = overrideInput?.trim() || undefined;
    }

    // Ask for @requires
    let requiresFields: string[] | undefined;
    if (!isExternal?.value) {
      const addRequires = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: `Add @requires directive to ${fieldName}?` },
      );

      if (addRequires?.value === 'yes') {
        requiresFields = [];
        let addMore = true;
        while (addMore) {
          const fieldInput = await vscode.window.showInputBox({
            prompt: 'Enter required field name',
            placeHolder: 'userId',
          });
          if (fieldInput) {
            requiresFields.push(fieldInput.trim());
          }

          const addAnother = await vscode.window.showQuickPick(
            [
              { label: 'Add another field', value: 'add' },
              { label: 'Done', value: 'done' },
            ],
            { placeHolder: 'Add another required field?' },
          );

          if (!addAnother || addAnother.value === 'done') {
            addMore = false;
          }
        }
      }
    }

    // Ask for @provides if field is an object type
    let providesFields: string[] | undefined;
    if (fieldType.charAt(0) === fieldType.charAt(0).toUpperCase() && !fieldType.startsWith('[')) {
      const addProvides = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: `Add @provides directive to ${fieldName}?` },
      );

      if (addProvides?.value === 'yes') {
        providesFields = [];
        let addMore = true;
        while (addMore) {
          const fieldInput = await vscode.window.showInputBox({
            prompt: 'Enter provided field name',
            placeHolder: 'name',
          });
          if (fieldInput) {
            providesFields.push(fieldInput.trim());
          }

          const addAnother = await vscode.window.showQuickPick(
            [
              { label: 'Add another field', value: 'add' },
              { label: 'Done', value: 'done' },
            ],
            { placeHolder: 'Add another provided field?' },
          );

          if (!addAnother || addAnother.value === 'done') {
            addMore = false;
          }
        }
      }
    }

    // Get description
    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional)',
      placeHolder: `The ${fieldName} field`,
    });

    const field: FederationField = {
      name: fieldName,
      type: fieldType,
      description: descriptionInput?.trim() || `The ${fieldName} field`,
      isNullable: isNullable?.value ?? true,
      isArray: fieldType.startsWith('['),
      isExternal: isExternal?.value ?? false,
    };

    if (overrideFrom) {
      field.overrideFrom = overrideFrom;
    }
    if (requiresFields && requiresFields.length > 0) {
      field.requiresFields = requiresFields;
    }
    if (providesFields && providesFields.length > 0) {
      field.providesFields = providesFields;
    }

    return field;
  }

  /**
   * Collects reference resolvers for entities
   */
  private async collectReferenceResolvers(
    entities: FederationEntity[],
  ): Promise<FederationReferenceResolver[]> {
    const resolvers: FederationReferenceResolver[] = [];

    for (const entity of entities) {
      const externalFields = entity.fields.filter((f) => f.isExternal);

      for (const field of externalFields) {
        if (field.requiresFields && field.requiresFields.length > 0) {
          const targetSubgraph = await this.getTargetSubgraph(field.name);
          if (targetSubgraph) {
            const resolverCode = this.generateReferenceResolverCode(
              entity.name,
              field,
              targetSubgraph,
            );
            resolvers.push({
              entityName: entity.name,
              referenceField: field.name,
              targetSubgraph,
              requiredFields: field.requiresFields,
              resolverCode,
            });
          }
        }
      }
    }

    return resolvers;
  }

  /**
   * Gets target subgraph name for a reference resolver
   */
  private async getTargetSubgraph(fieldName: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter target subgraph for ${fieldName} reference resolver`,
      placeHolder: 'original-subgraph',
    });
    return input?.trim();
  }

  /**
   * Generates reference resolver code
   */
  private generateReferenceResolverCode(
    entityName: string,
    field: FederationField,
    targetSubgraph: string,
  ): string {
    let code = `  /**\n`;
    code += `   * Reference resolver for ${entityName}.${field.name}\n`;
    code += `   * Fetches required fields from ${targetSubgraph}\n`;
    code += `   */\n`;
    code += `  ${field.name}: async (${this.camelCase(entityName)}) => {\n`;
    code += `    // TODO: Implement reference resolver\n`;
    code += `    // Call ${targetSubgraph} to fetch required fields\n`;

    if (field.requiresFields) {
      code += `    const { ${field.requiresFields.join(', ')} } = ${this.camelCase(entityName)};\n`;
      code += `    \n`;
      code += `    // Make request to ${targetSubgraph}\n`;
      code += `    return fetchFrom${this.capitalize(targetSubgraph)}(${field.requiresFields.join(', ')});\n`;
    } else {
      code += `    return null;\n`;
    }

    code += `  },\n`;

    return code;
  }

  /**
   * Generates the schema code
   */
  private generateSchemaCode(
    subgraphName: string,
    entities: FederationEntity[],
    config: GraphQLFederationGeneratorConfig,
  ): string {
    let code = '';

    // Add federation specification link
    code += `# Apollo Federation ${config.federationVersion} Specification\n`;
    code += `# Subgraph: ${subgraphName}\n\n`;

    code += `extend schema\n`;
    code += `  @link(url: "https://specs.apollo.dev/federation/v${config.federationVersion.replace('.', '')}",\n`;
    code += `        import: ["@key", "@shareable"`;

    // Add additional directives based on config
    if (entities.some((e) => e.fields.some((f) => f.isExternal))) {
      code += ', "@external"';
    }
    if (entities.some((e) => e.fields.some((f) => f.requiresFields))) {
      code += ', "@requires"';
    }
    if (entities.some((e) => e.fields.some((f) => f.providesFields))) {
      code += ', "@provides"';
    }
    if (entities.some((e) => e.fields.some((f) => f.overrideFrom))) {
      code += ', "@override"';
    }

    code += '])\n\n';

    // Auto-generated comment
    code += `# Auto-generated Federation subgraph schema\n`;
    code += `# Generated by Additional Context Menus extension\n\n`;

    // Generate each entity
    for (const entity of entities) {
      code += this.generateEntityCode(entity, config);
      code += '\n';
    }

    return code;
  }

  /**
   * Generates code for a single entity
   */
  private generateEntityCode(
    entity: FederationEntity,
    config: GraphQLFederationGeneratorConfig,
  ): string {
    let code = '';

    // Add description
    if (config.includeDescriptions && entity.description) {
      code += `"""\n${entity.description}\n"""\n`;
    }

    // Type declaration with extend keyword
    code += entity.extendable ? 'extend ' : '';
    code += `type ${entity.name}`;

    // Add @key directives
    if (config.generateKeyDirectives && entity.keyFields.length > 0) {
      code += ' ';
      for (let i = 0; i < entity.keyFields.length; i++) {
        code += `@key(fields: "${entity.keyFields[i]}")`;
        if (i < entity.keyFields.length - 1) {
          code += '\n  ';
        }
      }
    }

    code += ' {\n';

    // Generate fields
    for (const field of entity.fields) {
      code += this.generateFieldCode(field, config);
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates code for a single field
   */
  private generateFieldCode(field: FederationField, config: GraphQLFederationGeneratorConfig): string {
    let code = '';

    // Add description
    if (config.includeDescriptions && field.description) {
      code += `  """\n  ${field.description}\n  """\n`;
    }

    // Field declaration
    code += `  ${field.name}`;

    // Add directives
    const directives: string[] = [];
    if (field.isExternal) {
      directives.push('@external');
    }
    if (field.requiresFields) {
      directives.push(`@requires(fields: "${field.requiresFields.join(' ')}")`);
    }
    if (field.providesFields) {
      directives.push(`@provides(fields: "${field.providesFields.join(' ')}")`);
    }
    if (field.overrideFrom) {
      directives.push(`@override(from: "${field.overrideFrom}")`);
    }
    if (config.generateShareableDirectives && !field.isExternal) {
      directives.push('@shareable');
    }

    if (directives.length > 0) {
      code += ' ' + directives.join(' ');
    }

    // Field type
    code += ': ' + field.type;
    if (!field.isNullable) {
      code += '!';
    }

    code += '\n';

    return code;
  }

  /**
   * Generates imports for the resolver file
   */
  private generateImports(
    _entities: FederationEntity[],
    referenceResolvers: FederationReferenceResolver[],
  ): string[] {
    const imports = new Set<string>([
      'Resolver, Query, Mutation, Parent, Context',
    ]);

    // Add Federation-specific imports if needed
    if (referenceResolvers.length > 0) {
      imports.add('ResolveReference');
    }

    return Array.from(imports);
  }

  /**
   * Generates the resolver code with reference resolvers
   */
  public generateResolverFile(
    subgraphName: string,
    entities: FederationEntity[],
    referenceResolvers: FederationReferenceResolver[],
    imports: string[],
  ): string {
    let code = '';

    // Imports
    code += `import {\n`;
    code += `  ${imports.join(',\n  ')}\n`;
    code += `} from '@nestjs/graphql';\n\n`;

    // Resolver decorator
    code += `@Resolver()\n`;
    code += `export class ${this.capitalize(subgraphName)}Resolver {\n`;

    // Generate __resolveReference for entities with @key
    for (const entity of entities) {
      if (entity.keyFields.length > 0) {
        code += this.generateResolveReferenceMethod(entity);
        code += '\n';
      }
    }

    // Generate reference resolvers
    if (referenceResolvers.length > 0) {
      code += '\n  // Reference Resolvers\n';
      for (const resolver of referenceResolvers) {
        code += resolver.resolverCode;
        code += '\n';
      }
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates __resolveReference method for an entity
   */
  private generateResolveReferenceMethod(entity: FederationEntity): string {
    let code = '';

    code += `  /**\n`;
    code += `   * Resolver reference for ${entity.name}\n`;
    code += `   */\n`;
    code += `  @ResolveReference()\n`;
    code += `  async resolveReference(@Parent() ${this.camelCase(entity.name)}: any) {\n`;
    code += `    // TODO: Implement reference resolution\n`;
    code += `    const { __typename, ${entity.keyFields.join(', ')} } = ${this.camelCase(entity.name)};\n`;
    code += `    return this.${this.camelCase(entity.name)}Service.findOne(\n`;
    code += `      ${entity.keyFields.map((f) => `${f}`).join(', ')}\n`;
    code += `    );\n`;
    code += `  }\n`;

    return code;
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

    this.logger.info('Federation schema file created', { filePath });
  }

  /**
   * Creates the resolver file at the specified path
   */
  public async createResolverFile(filePath: string, code: string): Promise<void> {
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

    this.logger.info('Federation resolver file created', { filePath });
  }

  /**
   * Capitalizes a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}
