import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ZustandStateProperty {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
}

export interface ZustandAction {
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

export interface ZustandSelector {
  name: string;
  type: string;
  body?: string;
}

export interface ZustandStoreConfig {
  name: string;
  stateProperties: ZustandStateProperty[];
  actions: ZustandAction[];
  selectors: ZustandSelector[];
  includeDevtools: boolean;
  includePersist: boolean;
  persistenceType?: 'localStorage' | 'sessionStorage';
  persistenceKey?: string;
  persistencePartialize?: boolean;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  immerMiddleware: boolean;
}

export interface GeneratedZustandStore {
  name: string;
  storeCode: string;
  importPath: string;
  stateProperties: ZustandStateProperty[];
  actions: ZustandAction[];
  selectors: ZustandSelector[];
  hasDevtools: boolean;
  hasPersist: boolean;
  hasImmer: boolean;
}

/**
 * Service for creating Zustand stores with TypeScript typing,
 * middleware (devtools, persist, immer), actions, and selectors
 */
export class ZustandStoreGeneratorService {
  private static instance: ZustandStoreGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ZustandStoreGeneratorService {
    ZustandStoreGeneratorService.instance ??= new ZustandStoreGeneratorService();
    return ZustandStoreGeneratorService.instance;
  }

  /**
   * Creates a Zustand store based on the provided configuration
   */
  public async createStore(
    document: vscode.TextDocument,
    _selection: vscode.Selection,
  ): Promise<GeneratedZustandStore> {
    const config = await this.promptForStoreConfig();
    const storeCode = this.generateStoreCode(config);
    const importPath = this.calculateImportPath(document.fileName, config.name);

    this.logger.info('Zustand store created', {
      name: config.name,
      stateCount: config.stateProperties.length,
      actionCount: config.actions.length,
      selectorCount: config.selectors.length,
      hasDevtools: config.includeDevtools,
      hasPersist: config.includePersist,
      hasImmer: config.immerMiddleware,
    });

    return {
      name: config.name,
      storeCode,
      importPath,
      stateProperties: config.stateProperties,
      actions: config.actions,
      selectors: config.selectors,
      hasDevtools: config.includeDevtools,
      hasPersist: config.includePersist,
      hasImmer: config.immerMiddleware,
    };
  }

  /**
   * Prompts user for store configuration
   */
  private async promptForStoreConfig(): Promise<ZustandStoreConfig> {
    // Get store name
    const name = await this.getStoreName();

    // Get state properties
    const stateProperties = await this.getStateProperties();

    // Get actions
    const actions = await this.getActions();

    // Get selectors
    const selectors = await this.getSelectors();

    // Get middleware options
    const middlewareConfig = await this.getMiddlewareConfig();

    // Get TypeScript preference
    const includeTypeScript = await this.getTypeScriptPreference();

    // Get JSDoc preference
    const includeJSDoc = await this.getJSDocPreference();

    const config: ZustandStoreConfig = {
      name,
      stateProperties,
      actions,
      selectors,
      includeDevtools: middlewareConfig.devtools,
      includePersist: middlewareConfig.persist,
      immerMiddleware: middlewareConfig.immer,
      includeTypeScript,
      includeJSDoc,
    };

    if (middlewareConfig.persist) {
      if (middlewareConfig.persistenceType) {
        config.persistenceType = middlewareConfig.persistenceType;
      }
      if (middlewareConfig.persistenceKey) {
        config.persistenceKey = middlewareConfig.persistenceKey;
      }
      config.persistencePartialize = middlewareConfig.partialize ?? false;
    }

    return config;
  }

  /**
   * Prompts user for store name
   */
  private async getStoreName(): Promise<string> {
    const defaultName = 'useStore';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Zustand store name (typically starts with "use")',
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
   * Prompts user for state properties
   */
  private async getStateProperties(): Promise<ZustandStateProperty[]> {
    const properties: ZustandStateProperty[] = [];
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

      const prop: ZustandStateProperty = {
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
  private async getActions(): Promise<ZustandAction[]> {
    const actions: ZustandAction[] = [];
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
   * Prompts user for selectors
   */
  private async getSelectors(): Promise<ZustandSelector[]> {
    const selectors: ZustandSelector[] = [];
    let addingSelectors = true;

    while (addingSelectors) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add selector', value: true },
          { label: 'No - Skip selectors', value: false },
        ],
        {
          placeHolder:
            selectors.length === 0 ? 'Add a selector to the store?' : 'Add another selector?',
          title: 'Store Selectors',
        },
      );

      if (!addAnother?.value) {
        addingSelectors = false;
        continue;
      }

      const selectorName = await vscode.window.showInputBox({
        prompt: 'Enter selector name',
        placeHolder: 'mySelector',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Selector name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Selector name can only contain letters, numbers, $, or _';
          }
          if (selectors.some((s) => s.name === value)) {
            return 'Selector name already exists';
          }
          return null;
        },
      });

      if (!selectorName || selectorName.trim().length === 0) {
        continue;
      }

      const selectorType = await vscode.window.showQuickPick(
        [
          { label: 'boolean', value: 'boolean' },
          { label: 'number', value: 'number' },
          { label: 'string', value: 'string' },
          { label: 'array', value: 'unknown[]' },
          { label: 'object', value: 'Record<string, unknown>' },
          { label: 'Custom type...', value: 'custom' },
        ],
        {
          placeHolder: `Select return type for ${selectorName}`,
          title: 'Selector Return Type',
        },
      );

      const type =
        selectorType?.value === 'custom'
          ? (await vscode.window.showInputBox({
              prompt: 'Enter custom return type',
              placeHolder: 'CustomType',
            })) || 'unknown'
          : selectorType?.value || 'unknown';

      selectors.push({
        name: selectorName.trim(),
        type,
      });
    }

    return selectors;
  }

  /**
   * Prompts user for middleware configuration
   */
  private async getMiddlewareConfig(): Promise<{
    devtools: boolean;
    persist: boolean;
    immer: boolean;
    persistenceType?: 'localStorage' | 'sessionStorage';
    persistenceKey?: string;
    partialize?: boolean;
  }> {
    const config: {
      devtools: boolean;
      persist: boolean;
      immer: boolean;
      persistenceType?: 'localStorage' | 'sessionStorage';
      persistenceKey?: string;
      partialize?: boolean;
    } = {
      devtools: false,
      persist: false,
      immer: false,
    };

    // Devtools
    const enableDevtools = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Enable Redux DevTools integration', value: true },
        { label: 'No - Skip devtools', value: false },
      ],
      {
        placeHolder: 'Enable Redux DevTools integration?',
        title: 'DevTools Middleware',
      },
    );

    if (enableDevtools?.value) {
      config.devtools = true;
    }

    // Persist
    const enablePersist = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Enable persistence', value: true },
        { label: 'No - Skip persistence', value: false },
      ],
      {
        placeHolder: 'Enable state persistence?',
        title: 'Persist Middleware',
      },
    );

    if (enablePersist?.value) {
      config.persist = true;

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
        prompt: 'Enter storage key (leave empty to use store name)',
        placeHolder: 'my-store-key',
      });

      const partialize = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Persist only specific state', value: true },
          { label: 'No - Persist entire state', value: false },
        ],
        {
          placeHolder: 'Partialize state for persistence?',
          title: 'Partialize',
        },
      );

      config.persistenceType = type?.value || 'localStorage';
      if (key?.trim()) {
        config.persistenceKey = key.trim();
      }
      config.partialize = partialize?.value ?? false;
    }

    // Immer
    const enableImmer = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Enable Immer for immutable updates', value: true },
        { label: 'No - Use manual state spreading', value: false },
      ],
      {
        placeHolder: 'Enable Immer middleware?',
        title: 'Immer Middleware',
      },
    );

    if (enableImmer?.value) {
      config.immer = true;
    }

    return config;
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
  private generateStoreCode(config: ZustandStoreConfig): string {
    let code = '';

    // Add imports
    const zustandImports: string[] = ['create'];
    const middlewareImports: string[] = [];

    if (config.includeDevtools) {
      middlewareImports.push('devtools');
    }
    if (config.includePersist) {
      middlewareImports.push('persist');
    }
    if (config.immerMiddleware) {
      middlewareImports.push('immer');
    }

    if (middlewareImports.length > 0) {
      zustandImports.push(`{ ${middlewareImports.join(', ')} }`);
    }

    code += `import { ${zustandImports.join(', ')} } from 'zustand';\n`;

    if (config.includeTypeScript) {
      code += '\n';
      // Generate interface for state
      if (config.stateProperties.length > 0) {
        code += `interface ${this.toPascalCase(config.name)}State {\n`;
        for (const prop of config.stateProperties) {
          const optional = prop.isRequired ? '' : '?';
          code += `  ${prop.name}${optional}: ${prop.type};\n`;
        }
        code += '}\n\n';
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
        code += `interface ${this.toPascalCase(config.name)}Actions {\n${actionsObj};\n}\n\n`;
      }

      // Generate combined type
      const storeType = this.generateStoreType(config);
      code += `type ${this.toPascalCase(config.name)}Store = ${storeType};\n\n`;
    }

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += this.generateJSDoc(config);
    }

    // Generate create call
    code += `export const ${config.name} = create<${this.toPascalCase(config.name)}Store>()(\n`;

    // Add middleware wrappers
    if (config.includeDevtools || config.includePersist || config.immerMiddleware) {
      const middlewares: string[] = [];

      if (config.includeDevtools) {
        const devtoolsConfig = config.persistenceKey
          ? ` { name: '${config.persistenceKey}' }`
          : ` { name: '${config.name}' }`;
        middlewares.push(`devtools(${devtoolsConfig})`);
      }

      if (config.includePersist) {
        const persistKey = config.persistenceKey || config.name;
        const storageType = config.persistenceType || 'localStorage';
        const partializeCode = config.persistencePartialize
          ? `,\n    partialize: (state) => ({ /* select properties to persist */ })`
          : '';
        middlewares.push(
          `persist(\n    {\n      name: '${persistKey}',\n      storage: ${this.getStorageImport(storageType)}${partializeCode}\n    }\n  )`,
        );
      }

      if (config.immerMiddleware) {
        middlewares.push('immer()');
      }

      // Apply middleware in reverse order (last middleware wraps first)
      for (let i = middlewares.length - 1; i >= 0; i--) {
        code += `  ${middlewares[i]}(\n`;
      }
    }

    code += '  (set, get) => ({\n';

    // Generate state
    code += this.generateState(config);

    // Generate actions
    if (config.actions.length > 0) {
      code += this.generateActions(config);
    }

    code += '  })\n';

    // Close middleware wrappers
    if (config.includeDevtools || config.includePersist || config.immerMiddleware) {
      const middlewareCount =
        (config.includeDevtools ? 1 : 0) +
        (config.includePersist ? 1 : 0) +
        (config.immerMiddleware ? 1 : 0);
      for (let i = 0; i < middlewareCount; i++) {
        code += ')\n';
      }
    }

    code += ');\n';

    // Add selector functions if provided
    if (config.selectors.length > 0) {
      code += '\n// Selectors\n';
      for (const selector of config.selectors) {
        const returnType = config.includeTypeScript ? `: ${selector.type}` : '';
        code += `export const ${selector.name}${returnType} = (state: ${this.toPascalCase(config.name)}Store) => {\n`;
        code += `  // TODO: Implement ${selector.name} selector logic\n`;
        code += `  return ${this.getDefaultPlaceholder(selector.type)} as any;\n`;
        code += '};\n';
      }
    }

    return code;
  }

  /**
   * Generates store type definition
   */
  private generateStoreType(config: ZustandStoreConfig): string {
    const parts: string[] = [];

    if (config.stateProperties.length > 0) {
      parts.push(`${this.toPascalCase(config.name)}State`);
    }

    if (config.actions.length > 0) {
      parts.push(`${this.toPascalCase(config.name)}Actions`);
    }

    if (parts.length === 0) {
      return 'object';
    }

    return parts.join(' & ');
  }

  /**
   * Generates JSDoc comment for the store
   */
  private generateJSDoc(config: ZustandStoreConfig): string {
    let jsdoc = '/**\n';
    jsdoc += ` * ${config.name} - Zustand store\n`;

    if (config.stateProperties.length > 0) {
      jsdoc += ' *\n';
      jsdoc += ' * @state\n';
      for (const prop of config.stateProperties) {
        jsdoc += ` * @property {${prop.type}} ${prop.name}\n`;
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

    const middlewares: string[] = [];
    if (config.includeDevtools) middlewares.push('devtools');
    if (config.includePersist) middlewares.push('persist');
    if (config.immerMiddleware) middlewares.push('immer');

    if (middlewares.length > 0) {
      jsdoc += ' *\n';
      jsdoc += ` * @middleware ${middlewares.join(', ')}\n`;
    }

    jsdoc += ' */\n';
    return jsdoc;
  }

  /**
   * Generates state section
   */
  private generateState(config: ZustandStoreConfig): string {
    let code = '    // State\n';

    for (const prop of config.stateProperties) {
      const defaultValue = prop.defaultValue ?? this.getDefaultPlaceholder(prop.type);
      const comment = config.includeJSDoc ? ` /** ${prop.type} */` : '';
      code += `    ${prop.name}: ${defaultValue}${comment},\n`;
    }

    return code + '\n';
  }

  /**
   * Generates actions section
   */
  private generateActions(config: ZustandStoreConfig): string {
    let code = '    // Actions\n';

    for (const action of config.actions) {
      const asyncKeyword = action.isAsync ? 'async ' : '';
      const params = action.parameters
        .map((p) => {
          const optional = p.isOptional ? '?' : '';
          return `${p.name}${optional}: ${p.type}`;
        })
        .join(', ');

      code += `    ${action.name}: ${asyncKeyword}(${params}) => {\n`;
      code += `      // TODO: Implement ${action.name} action logic\n`;

      if (action.isAsync) {
        code += `      try {\n`;
        code += `        // Async operation here\n`;
        if (config.immerMiddleware) {
          code += `        set((state) => {\n`;
          code += `          // Update state with draft (Immer handles immutability)\n`;
          code += `        });\n`;
        } else {
          code += `        set({ /* update state */ });\n`;
        }
        code += `      } catch (error) {\n`;
        code += `        console.error('Error in ${action.name}:', error);\n`;
        code += `        throw error;\n`;
        code += `      }\n`;
      } else if (config.immerMiddleware) {
        code += `      set((state) => {\n`;
        code += `        // Update state with draft (Immer handles immutability)\n`;
        code += `      });\n`;
      } else {
        code += `      set({ /* update state */ });\n`;
      }

      if (action.returnType !== 'void' && action.returnType !== 'Promise<void>') {
        code += `      return ${this.getDefaultPlaceholder(action.returnType.replace('Promise<', '').replace('>', ''))} as any;\n`;
      }

      code += `    },\n`;
    }

    return code + '\n';
  }

  /**
   * Gets storage import for persist middleware
   */
  private getStorageImport(type: 'localStorage' | 'sessionStorage'): string {
    return type;
  }

  /**
   * Converts a string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s/g, '');
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
    this.logger.info('Zustand store file created', { filePath });
  }

  /**
   * Generates store usage example
   */
  public generateStoreUsage(storeName: string): string {
    return `import { ${storeName} } from './stores/${storeName}';\n\n// In component:\nconst { stateProperty, action } = ${storeName}();\n\n// Or use selectors:\nconst value = ${storeName}(state => state.stateProperty);`;
  }

  /**
   * Checks if code contains Zustand imports
   */
  public containsZustandStores(code: string): boolean {
    const zustandPatterns = [/from\s+['"]zustand['"]/, /create\s*\(/];

    return zustandPatterns.some((pattern) => pattern.test(code));
  }
}
