import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export type SvelteStoreType = 'writable' | 'readable' | 'derived';

export interface SvelteStoreProperty {
  name: string;
  typeName: string;
  isRequired: boolean;
  defaultValue?: string;
}

export interface SvelteStoreConfig {
  storeType: SvelteStoreType;
  name: string;
  genericType?: string;
  initialValue?: string;
  dependencies?: string[]; // For derived stores
  includePersistence: boolean;
  persistenceType?: 'localStorage' | 'sessionStorage';
  persistenceKey?: string;
  includeJSDoc: boolean;
}

export interface GeneratedSvelteStore {
  name: string;
  storeType: SvelteStoreType;
  storeCode: string;
  importPath: string;
  properties: SvelteStoreProperty[];
  hasPersistence: boolean;
}

/**
 * Service for creating custom Svelte stores with TypeScript typing,
 * derived values, and persistence options
 */
export class SvelteStoreCreatorService {
  private static instance: SvelteStoreCreatorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SvelteStoreCreatorService {
    SvelteStoreCreatorService.instance ??= new SvelteStoreCreatorService();
    return SvelteStoreCreatorService.instance;
  }

  /**
   * Creates a custom Svelte store based on the provided configuration
   */
  public async createStore(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<GeneratedSvelteStore> {
    const config = await this.promptForStoreConfig();
    const storeCode = this.generateStoreCode(config);
    const importPath = this.calculateImportPath(document.fileName, config.name);

    this.logger.info('Svelte store created', {
      name: config.name,
      type: config.storeType,
      hasPersistence: config.includePersistence,
    });

    return {
      name: config.name,
      storeType: config.storeType,
      storeCode,
      importPath,
      properties: [],
      hasPersistence: config.includePersistence,
    };
  }

  /**
   * Prompts user for store configuration
   */
  private async promptForStoreConfig(): Promise<SvelteStoreConfig> {
    // Get store type
    const storeType = await this.getStoreType();

    // Get store name
    const name = await this.getStoreName(storeType);

    // Get generic type if needed
    let genericType: string | undefined;
    if (storeType === 'writable' || storeType === 'readable') {
      genericType = await this.getGenericType();
    }

    // Get initial value for writable/readable stores
    let initialValue: string | undefined;
    if (storeType === 'writable' || storeType === 'readable') {
      initialValue = await this.getInitialValue(storeType);
    }

    // Get dependencies for derived stores
    let dependencies: string[] | undefined;
    if (storeType === 'derived') {
      dependencies = await this.getDerivedDependencies();
    }

    // Get persistence options
    const persistenceConfig = await this.getPersistenceConfig();

    // Get JSDoc preference
    const includeJSDoc = await this.getJSDocPreference();

    return {
      storeType,
      name,
      genericType,
      initialValue,
      dependencies,
      includePersistence: persistenceConfig.enabled,
      persistenceType: persistenceConfig.type,
      persistenceKey: persistenceConfig.key,
      includeJSDoc,
    };
  }

  /**
   * Prompts user for store type
   */
  private async getStoreType(): Promise<SvelteStoreType> {
    const options = [
      { label: 'Writable - Store with set/update methods', value: 'writable' as const },
      { label: 'Readable - Read-only store with derived values', value: 'readable' as const },
      { label: 'Derived - Store derived from other stores', value: 'derived' as const },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select store type',
      title: 'Svelte Store Type',
    });

    return selected?.value ?? 'writable';
  }

  /**
   * Prompts user for store name
   */
  private async getStoreName(storeType: SvelteStoreType): Promise<string> {
    const defaultName =
      storeType === 'writable' ? 'myStore' : storeType === 'readable' ? 'myReadable' : 'myDerived';
    const prefix = storeType === 'derived' ? '' : '';

    const input = await vscode.window.showInputBox({
      prompt: `Enter ${storeType} store name`,
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
   * Prompts user for generic type
   */
  private async getGenericType(): Promise<string | undefined> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'object', value: 'Record<string, unknown>' },
        { label: 'array', value: 'unknown[]' },
        { label: 'Custom type...', value: 'custom' },
        { label: 'No type annotation (any)', value: '' },
      ],
      {
        placeHolder: 'Select generic type for the store',
        title: 'Store Type Annotation',
      },
    );

    if (!quickPick) {
      return undefined;
    }

    if (quickPick.value === 'custom') {
      return await vscode.window.showInputBox({
        prompt: 'Enter custom type (e.g., User, Config, etc.)',
        placeHolder: 'CustomType',
      });
    }

    return quickPick.value || undefined;
  }

  /**
   * Prompts user for initial value
   */
  private async getInitialValue(storeType: SvelteStoreType): Promise<string | undefined> {
    const defaultInitialValue = storeType === 'writable' ? 'undefined' : '0';

    const input = await vscode.window.showInputBox({
      prompt: `Enter initial value for ${storeType} store`,
      placeHolder: defaultInitialValue,
    });

    return input?.trim() || defaultInitialValue;
  }

  /**
   * Prompts user for derived store dependencies
   */
  private async getDerivedDependencies(): Promise<string[] | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter store dependencies (comma-separated)',
      placeHolder: 'store1, store2, store3',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'At least one dependency is required for derived stores';
        }
        return null;
      },
    });

    if (!input) {
      return undefined;
    }

    return input
      .split(',')
      .map((dep) => dep.trim())
      .filter((dep) => dep.length > 0);
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
      prompt: 'Enter storage key (leave empty to use store name)',
      placeHolder: 'my-store-key',
    });

    return {
      enabled: true,
      type: type?.value || 'localStorage',
      key: key?.trim() || undefined,
    };
  }

  /**
   * Prompts user for JSDoc preference
   */
  private async getJSDocPreference(): Promise<boolean> {
    const selection = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include JSDoc comments', value: true },
        { label: 'No - Skip JSDoc comments', value: false },
      ],
      {
        placeHolder: 'Include JSDoc documentation?',
        title: 'JSDoc Comments',
      },
    );

    return selection?.value ?? true;
  }

  /**
   * Generates the store TypeScript code
   */
  private generateStoreCode(config: SvelteStoreConfig): string {
    let code = '';

    // Add imports
    if (config.storeType === 'derived') {
      code += "import { derived, type Readable } from 'svelte/store';\n";
    } else {
      code += `import { ${config.storeType}, type ${this.getReadableTypeName(config.storeType)} } from 'svelte/store';\n`;
    }

    if (config.includePersistence) {
      code += "import { browser } from '$app/environment';\n\n";
    } else {
      code += '\n';
    }

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += this.generateJSDoc(config);
    }

    // Generate store based on type
    switch (config.storeType) {
      case 'writable':
        code += this.generateWritableStore(config);
        break;
      case 'readable':
        code += this.generateReadableStore(config);
        break;
      case 'derived':
        code += this.generateDerivedStore(config);
        break;
    }

    return code;
  }

  /**
   * Gets the readable type name for a store type
   */
  private getReadableTypeName(storeType: SvelteStoreType): string {
    return storeType === 'writable' ? 'Writable' : 'Readable';
  }

  /**
   * Generates JSDoc comment for the store
   */
  private generateJSDoc(config: SvelteStoreConfig): string {
    let jsdoc = '/**\n';

    switch (config.storeType) {
      case 'writable':
        jsdoc += ` * Writable store for managing ${config.name} state\n`;
        jsdoc += " * @type {import('svelte/store').Writable}";
        if (config.genericType) {
          jsdoc += `<${config.genericType}>`;
        }
        jsdoc += '\n';
        if (config.includePersistence) {
          jsdoc += ` * Persists to ${config.persistenceType}\n`;
        }
        break;
      case 'readable':
        jsdoc += ` * Readable store for ${config.name} with derived values\n`;
        jsdoc += " * @type {import('svelte/store').Readable}";
        if (config.genericType) {
          jsdoc += `<${config.genericType}>`;
        }
        jsdoc += '\n';
        break;
      case 'derived':
        jsdoc += ` * Derived store computed from ${config.dependencies?.join(', ') || 'other stores'}\n`;
        jsdoc += " * @type {import('svelte/store').Readable<any>}\n";
        break;
    }

    jsdoc += ' */\n';
    return jsdoc;
  }

  /**
   * Generates a writable store
   */
  private generateWritableStore(config: SvelteStoreConfig): string {
    const typeParam = config.genericType ? `<${config.genericType}>` : '';
    const initialValue = config.initialValue || 'undefined';

    if (!config.includePersistence) {
      // Simple writable store
      return `export const ${config.name} = writable${typeParam}(${initialValue});\n`;
    }

    // Writable store with persistence
    const storageType = config.persistenceType || 'localStorage';
    const storageKey = config.persistenceKey || config.name;

    return `function createPersistedStore${typeParam}(key: string, initialValue: ${config.genericType || 'any'}) {
	const storedValue = browser
		? ${storageType}.getItem(key)
			? JSON.parse(${storageType}.getItem(key)!)
			: initialValue
		: initialValue;

	const store = writable${typeParam}((${config.genericType || ''} storedValue));

	if (browser) {
		store.subscribe((value) => {
			${storageType}.setItem(key, JSON.stringify(value));
		});
	}

	return store;
}

export const ${config.name} = createPersistedStore${typeParam}('${storageKey}', ${initialValue});
`;
  }

  /**
   * Generates a readable store
   */
  private generateReadableStore(config: SvelteStoreConfig): string {
    const typeParam = config.genericType ? `<${config.genericType}>` : '';
    const initialValue = config.initialValue || '0';

    if (!config.includePersistence) {
      // Simple readable store
      return `export const ${config.name} = readable${typeParam}(${initialValue}, (set) => {
	// Add custom logic here (e.g., intervals, subscriptions, etc.)
	// set(newValue); // Update the store value

	return () => {
		// Cleanup function
	};
});
`;
    }

    // Readable store with persistence
    const storageType = config.persistenceType || 'localStorage';
    const storageKey = config.persistenceKey || config.name;

    return `function createPersistedReadable${typeParam}(key: string, initialValue: ${config.genericType || 'any'}) {
	const storedValue = browser
		? ${storageType}.getItem(key)
			? JSON.parse(${storageType}.getItem(key)!)
			: initialValue
		: initialValue;

	const store = readable${typeParam}((${config.genericType || ''} storedValue, (set) => {
		if (browser) {
			const interval = setInterval(() => {
				const value = ${storageType}.getItem(key);
				if (value) {
					set(JSON.parse(value));
				}
			}, 1000);

			return () => clearInterval(interval);
		}
	});

	return store;
}

export const ${config.name} = createPersistedReadable${typeParam}('${storageKey}', ${initialValue});
`;
  }

  /**
   * Generates a derived store
   */
  private generateDerivedStore(config: SvelteStoreConfig): string {
    const deps = config.dependencies || [];

    if (deps.length === 0) {
      return `// No dependencies specified for derived store\n// export const ${config.name} = derived(store, ($store) => $store);\n`;
    }

    const depsParams = deps.join(', ');
    const depsArray = `[${deps.join(', ')}]`;

    return `export const ${config.name} = derived(\n\t${depsArray},\n\t($${depsParams.replace(/, /g, ', $')}, set) => {\n\t\t// Compute derived value from dependencies\n\t\tconst result = { /* your derived logic here */ };\n\t\treturn result;\n\t}\n);\n`;
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
    this.logger.info('Svelte store file created', { filePath });
  }

  /**
   * Generates store usage for Svelte
   */
  public generateStoreUsage(storeName: string, storeType: SvelteStoreType): string {
    // Svelte automatically stores are imported and used with $ prefix
    return `import { ${storeName} } from './stores/${storeName}';\n\n// In component: ${storeType === 'writable' ? `$${storeName} to read, ${storeName}.set() or ${storeName}.update() to write` : `$${storeName} to read`}`;
  }

  /**
   * Checks if code contains Svelte store imports
   */
  public containsSvelteStores(code: string): boolean {
    const storePatterns = [
      /from\s+['"]svelte\/store['"]/,
      /writable\s*\(/,
      /readable\s*\(/,
      /derived\s*\(/,
    ];

    return storePatterns.some((pattern) => pattern.test(code));
  }
}
