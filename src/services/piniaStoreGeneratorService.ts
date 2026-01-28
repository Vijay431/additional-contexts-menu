import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface PiniaStateProperty {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
}

export interface PiniaAction {
  name: string;
  description?: string;
  isAsync: boolean;
  parameters: Array<{
    name: string;
    type: string;
    isOptional: boolean;
  }>;
  returnType: string;
  body?: string;
}

export interface PiniaGetter {
  name: string;
  type: string;
  body?: string;
}

export interface PiniaStoreConfig {
  name: string;
  id: string;
  stateProperties: PiniaStateProperty[];
  actions: PiniaAction[];
  getters: PiniaGetter[];
  includePersistence: boolean;
  persistenceType?: 'localStorage' | 'sessionStorage';
  persistenceKey?: string;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
}

export interface GeneratedPiniaStore {
  name: string;
  storeId: string;
  storeCode: string;
  importPath: string;
  stateProperties: PiniaStateProperty[];
  actions: PiniaAction[];
  getters: PiniaGetter[];
  hasPersistence: boolean;
}

/**
 * Service for creating Pinia stores with TypeScript typing,
 * state management, actions, getters, and persistence support
 */
export class PiniaStoreGeneratorService {
  private static instance: PiniaStoreGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PiniaStoreGeneratorService {
    PiniaStoreGeneratorService.instance ??= new PiniaStoreGeneratorService();
    return PiniaStoreGeneratorService.instance;
  }

  /**
   * Creates a Pinia store based on the provided configuration
   */
  public async createStore(
    document: vscode.TextDocument,
    _selection: vscode.Selection,
  ): Promise<GeneratedPiniaStore> {
    const config = await this.promptForStoreConfig();
    const storeCode = this.generateStoreCode(config);
    const importPath = this.calculateImportPath(document.fileName, config.name);

    this.logger.info('Pinia store created', {
      name: config.name,
      id: config.id,
      stateCount: config.stateProperties.length,
      actionCount: config.actions.length,
      getterCount: config.getters.length,
      hasPersistence: config.includePersistence,
    });

    return {
      name: config.name,
      storeId: config.id,
      storeCode,
      importPath,
      stateProperties: config.stateProperties,
      actions: config.actions,
      getters: config.getters,
      hasPersistence: config.includePersistence,
    };
  }

  /**
   * Prompts user for store configuration
   */
  private async promptForStoreConfig(): Promise<PiniaStoreConfig> {
    // Get store name
    const name = await this.getStoreName();

    // Get store ID (defaults to kebab-case of name)
    const id = await this.getStoreId(name);

    // Get state properties
    const stateProperties = await this.getStateProperties();

    // Get actions
    const actions = await this.getActions();

    // Get getters
    const getters = await this.getGetters();

    // Get persistence options
    const persistenceConfig = await this.getPersistenceConfig();

    // Get TypeScript preference
    const includeTypeScript = await this.getTypeScriptPreference();

    // Get JSDoc preference
    const includeJSDoc = await this.getJSDocPreference();

    const config: PiniaStoreConfig = {
      name,
      id,
      stateProperties,
      actions,
      getters,
      includePersistence: persistenceConfig.enabled,
      includeTypeScript,
      includeJSDoc,
    };

    if (persistenceConfig.type) {
      config.persistenceType = persistenceConfig.type;
    }
    if (persistenceConfig.key) {
      config.persistenceKey = persistenceConfig.key;
    }

    return config;
  }

  /**
   * Prompts user for store name
   */
  private async getStoreName(): Promise<string> {
    const defaultName = 'useStore';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Pinia store name',
      placeHolder: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Store name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Store name can only contain letters, numbers, $, or _';
        }
        return null;
      },
    });

    return input?.trim() || defaultName;
  }

  /**
   * Prompts user for store ID
   */
  private async getStoreId(defaultName: string): Promise<string> {
    const defaultId = this.toKebabCase(defaultName);
    const input = await vscode.window.showInputBox({
      prompt: 'Enter store ID (used for persistence and devtools)',
      placeHolder: defaultId,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Store ID cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Store ID must be lowercase and can contain hyphens';
        }
        return null;
      },
    });

    return input?.trim() || defaultId;
  }

  /**
   * Prompts user for state properties
   */
  private async getStateProperties(): Promise<PiniaStateProperty[]> {
    const properties: PiniaStateProperty[] = [];
    let addingProperties = true;

    while (addingProperties) {
      const propName = await vscode.window.showInputBox({
        prompt: `Enter state property name (${properties.length + 1}) (leave empty to finish)`,
        placeHolder: 'myProperty',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return properties.length === 0 ? 'At least one state property is required' : null;
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Property name can only contain letters, numbers, $, or _';
          }
          if (properties.some((p) => p.name === value)) {
            return 'Property name already exists';
          }
          return null;
        },
      });

      if (!propName || propName.trim().length === 0) {
        if (properties.length > 0) {
          addingProperties = false;
          continue;
        }
        return [
          {
            name: 'count',
            type: 'number',
            isRequired: true,
            defaultValue: '0',
          },
        ];
      }

      const propType = await this.getPropertyType(propName);
      const isOptional = await this.getIsOptional(propName);
      const defaultValue = await this.getDefaultValue(propName, propType);

      const prop: PiniaStateProperty = {
        name: propName.trim(),
        type: propType,
        isRequired: !isOptional,
      };
      if (defaultValue !== undefined) {
        prop.defaultValue = defaultValue;
      }
      properties.push(prop);
    }

    return properties;
  }

  /**
   * Prompts user for property type
   */
  private async getPropertyType(propName: string): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'array', value: 'unknown[]' },
        { label: 'object', value: 'Record<string, unknown>' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: `Select type for ${propName}`,
        title: 'Property Type',
      },
    );

    if (!quickPick) {
      return 'unknown';
    }

    if (quickPick.value === 'custom') {
      return (
        (await vscode.window.showInputBox({
          prompt: 'Enter custom type',
          placeHolder: 'CustomType',
        })) || 'unknown'
      );
    }

    return quickPick.value;
  }

  /**
   * Prompts user if property is optional
   */
  private async getIsOptional(propName: string): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: false },
        { label: 'Optional (can be null/undefined)', value: true },
      ],
      {
        placeHolder: `Is ${propName} required?`,
        title: 'Property Requirement',
      },
    );

    return selected?.value ?? false;
  }

  /**
   * Prompts user for default value
   */
  private async getDefaultValue(propName: string, propType: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter default value for ${propName} (optional)`,
      placeHolder: this.getDefaultPlaceholder(propType),
    });

    return input?.trim() || undefined;
  }

  /**
   * Gets a placeholder based on property type
   */
  private getDefaultPlaceholder(type: string): string {
    switch (type) {
      case 'string':
        return "''";
      case 'number':
        return '0';
      case 'boolean':
        return 'false';
      case 'array':
        return '[]';
      case 'object':
        return '{}';
      default:
        return 'undefined';
    }
  }

  /**
   * Prompts user for actions
   */
  private async getActions(): Promise<PiniaAction[]> {
    const actions: PiniaAction[] = [];
    let addingActions = true;

    while (addingActions) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add action', value: true },
          { label: 'No - Skip actions', value: false },
        ],
        {
          placeHolder: actions.length === 0 ? 'Add an action to the store?' : 'Add another action?',
          title: 'Store Actions',
        },
      );

      if (!addAnother?.value) {
        addingActions = false;
        continue;
      }

      const actionName = await vscode.window.showInputBox({
        prompt: 'Enter action name',
        placeHolder: 'myAction',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Action name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Action name can only contain letters, numbers, $, or _';
          }
          if (actions.some((a) => a.name === value)) {
            return 'Action name already exists';
          }
          return null;
        },
      });

      if (!actionName || actionName.trim().length === 0) {
        continue;
      }

      const isAsync = await this.getActionAsyncPreference();
      const parameters = await this.getActionParameters();
      const returnType = await this.getReturnType(isAsync);

      actions.push({
        name: actionName.trim(),
        isAsync,
        parameters,
        returnType,
      });
    }

    return actions;
  }

  /**
   * Prompts user if action is async
   */
  private async getActionAsyncPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Async - For async operations', value: true },
        { label: 'Sync - For synchronous operations', value: false },
      ],
      {
        placeHolder: 'Is this action async?',
        title: 'Action Type',
      },
    );

    return selected?.value ?? false;
  }

  /**
   * Prompts user for action parameters
   */
  private async getActionParameters(): Promise<
    Array<{ name: string; type: string; isOptional: boolean }>
  > {
    const parameters: Array<{ name: string; type: string; isOptional: boolean }> = [];
    let addingParameters = true;

    while (addingParameters) {
      const paramName = await vscode.window.showInputBox({
        prompt: `Enter parameter name (${parameters.length + 1}) (leave empty to finish)`,
        placeHolder: 'myParam',
      });

      if (!paramName || paramName.trim().length === 0) {
        addingParameters = false;
        continue;
      }

      const paramType = await vscode.window.showInputBox({
        prompt: `Enter type for ${paramName}`,
        placeHolder: 'string',
      });

      const isOptional = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: false },
          { label: 'Optional', value: true },
        ],
        {
          placeHolder: `Is ${paramName} required?`,
        },
      );

      parameters.push({
        name: paramName.trim(),
        type: paramType?.trim() || 'unknown',
        isOptional: isOptional?.value ?? false,
      });
    }

    return parameters;
  }

  /**
   * Prompts user for return type
   */
  private async getReturnType(isAsync: boolean): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'void', value: 'void' },
        { label: 'boolean', value: 'boolean' },
        { label: 'number', value: 'number' },
        { label: 'string', value: 'string' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: 'Select return type',
        title: 'Return Type',
      },
    );

    if (!quickPick) {
      return isAsync ? 'Promise<void>' : 'void';
    }

    if (quickPick.value === 'custom') {
      const customType =
        (await vscode.window.showInputBox({
          prompt: 'Enter custom return type',
          placeHolder: 'CustomType',
        })) || 'void';
      return isAsync ? `Promise<${customType}>` : customType;
    }

    return isAsync ? `Promise<${quickPick.value}>` : quickPick.value;
  }

  /**
   * Prompts user for getters
   */
  private async getGetters(): Promise<PiniaGetter[]> {
    const getters: PiniaGetter[] = [];
    let addingGetters = true;

    while (addingGetters) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add getter', value: true },
          { label: 'No - Skip getters', value: false },
        ],
        {
          placeHolder: getters.length === 0 ? 'Add a getter to the store?' : 'Add another getter?',
          title: 'Store Getters',
        },
      );

      if (!addAnother?.value) {
        addingGetters = false;
        continue;
      }

      const getterName = await vscode.window.showInputBox({
        prompt: 'Enter getter name',
        placeHolder: 'myGetter',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Getter name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Getter name can only contain letters, numbers, $, or _';
          }
          if (getters.some((g) => g.name === value)) {
            return 'Getter name already exists';
          }
          return null;
        },
      });

      if (!getterName || getterName.trim().length === 0) {
        continue;
      }

      const getterType = await vscode.window.showQuickPick(
        [
          { label: 'boolean', value: 'boolean' },
          { label: 'number', value: 'number' },
          { label: 'string', value: 'string' },
          { label: 'array', value: 'unknown[]' },
          { label: 'object', value: 'Record<string, unknown>' },
          { label: 'Custom type...', value: 'custom' },
        ],
        {
          placeHolder: `Select return type for ${getterName}`,
          title: 'Getter Return Type',
        },
      );

      const type =
        getterType?.value === 'custom'
          ? (await vscode.window.showInputBox({
              prompt: 'Enter custom return type',
              placeHolder: 'CustomType',
            })) || 'unknown'
          : getterType?.value || 'unknown';

      getters.push({
        name: getterName.trim(),
        type,
      });
    }

    return getters;
  }

  /**
   * Prompts user for persistence configuration
   */
  private async getPersistenceConfig(): Promise<{
    enabled: boolean;
    type?: 'localStorage' | 'sessionStorage';
    key?: string;
  }> {
    const enablePersistence = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Enable persistence', value: true },
        { label: 'No - No persistence', value: false },
      ],
      {
        placeHolder: 'Enable persistence for this store?',
        title: 'Store Persistence',
      },
    );

    if (!enablePersistence?.value) {
      return { enabled: false };
    }

    const type = await vscode.window.showQuickPick(
      [
        { label: 'localStorage - Persists across sessions', value: 'localStorage' as const },
        { label: 'sessionStorage - Cleared on browser close', value: 'sessionStorage' as const },
      ],
      {
        placeHolder: 'Select persistence type',
        title: 'Persistence Type',
      },
    );

    const key = await vscode.window.showInputBox({
      prompt: 'Enter storage key (leave empty to use store ID)',
      placeHolder: 'my-store-key',
    });

    const result: {
      enabled: boolean;
      type?: 'localStorage' | 'sessionStorage';
      key?: string;
    } = {
      enabled: true,
      type: type?.value || 'localStorage',
    };

    const trimmedKey = key?.trim();
    if (trimmedKey && trimmedKey.length > 0) {
      result.key = trimmedKey;
    }

    return result;
  }

  /**
   * Prompts user for TypeScript preference
   */
  private async getTypeScriptPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include TypeScript types', value: true },
        { label: 'No - Use plain JavaScript', value: false },
      ],
      {
        placeHolder: 'Include TypeScript typing?',
        title: 'TypeScript Support',
      },
    );

    return selected?.value ?? true;
  }

  /**
   * Prompts user for JSDoc preference
   */
  private async getJSDocPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include JSDoc comments', value: true },
        { label: 'No - Skip JSDoc comments', value: false },
      ],
      {
        placeHolder: 'Include JSDoc documentation?',
        title: 'JSDoc Comments',
      },
    );

    return selected?.value ?? true;
  }

  /**
   * Generates the store TypeScript code
   */
  private generateStoreCode(config: PiniaStoreConfig): string {
    let code = '';

    // Add imports
    const vueImports = ['ref', 'computed'];
    if (config.includePersistence) {
      vueImports.push('watch');
    }

    code += `import { defineStore } from 'pinia';\n`;
    code += `import { ${vueImports.join(', ')} } from 'vue';\n`;

    if (config.includeTypeScript) {
      code += '\n';

      // Generate interface for state
      if (config.stateProperties.length > 0) {
        code += `interface ${config.name}State {\n`;
        for (const prop of config.stateProperties) {
          const optional = prop.isRequired ? '' : '?';
          const nullable = !prop.isRequired ? ' | null' : '';
          code += `  ${prop.name}${optional}: ${prop.type}${nullable};\n`;
        }
        code += '}\n\n';
      }

      // Generate type for getters
      if (config.getters.length > 0) {
        const gettersObj = config.getters.map((g) => `    ${g.name}: ${g.type}`).join(';\n');
        code += `interface ${config.name}Getters {\n${gettersObj};\n}\n\n`;
      }

      // Generate type for actions
      if (config.actions.length > 0) {
        const actionsObj = config.actions
          .map((a) => {
            const params = a.parameters
              .map((p) => {
                const optional = p.isOptional ? '?' : '';
                return `${p.name}${optional}: ${p.type}`;
              })
              .join(', ');
            return `    ${a.name}: (${params}) => ${a.returnType}`;
          })
          .join(';\n');
        code += `interface ${config.name}Actions {\n${actionsObj};\n}\n\n`;
      }
    }

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += this.generateJSDoc(config);
    }

    // Generate defineStore call
    const stateType =
      config.includeTypeScript && config.stateProperties.length > 0 ? `<${config.name}State>` : '';

    const returnType = config.includeTypeScript ? this.generateReturnType(config) : '';

    code += `export const use${config.name} = defineStore${returnType}('${config.id}'${stateType}, () => {\n`;

    // Generate state
    code += this.generateState(config);

    // Generate getters
    if (config.getters.length > 0) {
      code += this.generateGetters(config);
    }

    // Generate actions
    if (config.actions.length > 0) {
      code += this.generateActions(config);
    }

    // Generate persistence
    if (config.includePersistence) {
      code += this.generatePersistence(config);
    }

    // Return state and actions
    code += this.generateReturnStatement(config);

    code += '});\n';

    return code;
  }

  /**
   * Generates JSDoc comment for the store
   */
  private generateJSDoc(config: PiniaStoreConfig): string {
    let jsdoc = '/**\n';
    jsdoc += ` * ${config.name} store\n`;

    if (config.stateProperties.length > 0) {
      jsdoc += ' *\n';
      jsdoc += ' * @state\n';
      for (const prop of config.stateProperties) {
        jsdoc += ` * @property {${prop.type}} ${prop.name}\n`;
      }
    }

    if (config.getters.length > 0) {
      jsdoc += ' *\n';
      jsdoc += ' * @getters\n';
      for (const getter of config.getters) {
        jsdoc += ` * @property {${getter.type}} ${getter.name}\n`;
      }
    }

    if (config.actions.length > 0) {
      jsdoc += ' *\n';
      jsdoc += ' * @actions\n';
      for (const action of config.actions) {
        const params = action.parameters.map((p) => p.name).join(', ');
        jsdoc += ` * @property {function} ${action.name}(${params})${action.isAsync ? ' - async' : ''}\n`;
      }
    }

    jsdoc += ' */\n';
    return jsdoc;
  }

  /**
   * Generates return type for defineStore
   */
  private generateReturnType(config: PiniaStoreConfig): string {
    if (!config.includeTypeScript) {
      return '';
    }

    const parts: string[] = [];

    if (config.stateProperties.length > 0) {
      parts.push(`${config.name}State`);
    }

    if (config.getters.length > 0) {
      parts.push(`${config.name}Getters`);
    }

    if (config.actions.length > 0) {
      parts.push(`${config.name}Actions`);
    }

    if (parts.length === 0) {
      return '';
    }

    return `<${parts.join(', ')}>`;
  }

  /**
   * Generates state section
   */
  private generateState(config: PiniaStoreConfig): string {
    let code = '  // State\n';

    for (const prop of config.stateProperties) {
      const defaultValue = prop.defaultValue ?? this.getDefaultPlaceholder(prop.type);
      const nullable = !prop.isRequired ? ' | null' : '';
      const type = config.includeTypeScript ? `: Ref<${prop.type}${nullable}>` : '';

      code += `  const ${prop.name}${type} = ref(${defaultValue});\n`;
    }

    return code + '\n';
  }

  /**
   * Generates getters section
   */
  private generateGetters(config: PiniaStoreConfig): string {
    let code = '  // Getters\n';

    for (const getter of config.getters) {
      const type = config.includeTypeScript ? `: ${getter.type}` : '';
      code += `  const ${getter.name}${type} = computed(() => {\n`;
      code += `    // TODO: Implement ${getter.name} getter logic\n`;
      code += `    return ${this.getDefaultPlaceholder(getter.type)};\n`;
      code += '  });\n\n';
    }

    return code + '\n';
  }

  /**
   * Generates actions section
   */
  private generateActions(config: PiniaStoreConfig): string {
    let code = '  // Actions\n';

    for (const action of config.actions) {
      const asyncKeyword = action.isAsync ? 'async ' : '';
      const params = action.parameters
        .map((p) => {
          const optional = p.isOptional ? '?' : '';
          return `${p.name}${optional}: ${p.type}`;
        })
        .join(', ');
      const returnType = config.includeTypeScript ? `: ${action.returnType}` : '';

      code += `  ${asyncKeyword}function ${action.name}(${params})${returnType} {\n`;
      code += `    // TODO: Implement ${action.name} action logic\n`;
      if (action.returnType !== 'void' && action.returnType !== 'Promise<void>') {
        code += `    return ${this.getDefaultPlaceholder(action.returnType.replace('Promise<', '').replace('>', ''))} as any;\n`;
      }
      code += '  }\n\n';
    }

    return code + '\n';
  }

  /**
   * Generates persistence section
   */
  private generatePersistence(config: PiniaStoreConfig): string {
    const storageType = config.persistenceType || 'localStorage';
    const storageKey = config.persistenceKey || config.id;

    let code = '  // Persistence\n';

    if (config.stateProperties.length > 0) {
      const stateList = config.stateProperties.map((p) => `    ${p.name},`).join('\n');

      code += `  watch(\n    () => [${config.stateProperties.map((p) => p.name).join(', ')}],\n    ([${config.stateProperties.map((p) => p.name).join(', ')}]) => {\n`;
      code += `      const state = {\n${stateList}\n      };\n`;
      code += `      ${storageType}.setItem('${storageKey}', JSON.stringify(state));\n`;
      code += '    },\n';
      code += '    { deep: true },\n';
      code += '  );\n\n';
    }

    return code + '\n';
  }

  /**
   * Generates return statement
   */
  private generateReturnStatement(config: PiniaStoreConfig): string {
    const items: string[] = [];

    for (const prop of config.stateProperties) {
      items.push(`    ${prop.name},`);
    }

    for (const getter of config.getters) {
      items.push(`    ${getter.name},`);
    }

    for (const action of config.actions) {
      items.push(`    ${action.name},`);
    }

    if (items.length === 0) {
      return '  return {};\n';
    }

    return '  return {\n' + items.join('\n') + '\n  };\n';
  }

  /**
   * Converts a string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Calculates the relative import path for the new store
   */
  private calculateImportPath(sourceFilePath: string, storeName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const storesDir = path.join(sourceDir, 'stores');
    return path.join(storesDir, `${storeName}.ts`);
  }

  /**
   * Creates the store file at the specified path
   */
  public async createStoreFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write store file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Pinia store file created', { filePath });
  }

  /**
   * Generates store usage for Vue
   */
  public generateStoreUsage(storeName: string, _storeId: string): string {
    return `import { use${storeName} } from './stores/${storeName}';\n\n// In component setup:\nconst store = use${storeName}();\n// store.stateProperty\n// store.action()`;
  }

  /**
   * Checks if code contains Pinia imports
   */
  public containsPiniaStores(code: string): boolean {
    const piniaPatterns = [/from\s+['"]pinia['"]/, /defineStore\s*\(/];

    return piniaPatterns.some((pattern) => pattern.test(code));
  }
}
