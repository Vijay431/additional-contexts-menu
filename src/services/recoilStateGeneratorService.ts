import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface RecoilAtomProperty {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
  description?: string;
}

export interface RecoilSelector {
  name: string;
  type: string;
  atomDependencies: string[];
  selectorFunction: string;
  description?: string;
  isAsync: boolean;
}

export interface RecoilAtomFamily {
  name: string;
  parameterName: string;
  parameterType: string;
  atomType: string;
  defaultValue?: string;
  description?: string;
}

export interface RecoilStateConfig {
  name: string;
  atoms: RecoilAtomProperty[];
  selectors: RecoilSelector[];
  atomFamilies: RecoilAtomFamily[];
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  includePersistence: boolean;
  persistenceKey?: string;
  includeAsyncSelectors: boolean;
}

export interface GeneratedRecoilState {
  fileName: string;
  filePath: string;
  importPath: string;
  stateCode: string;
  atoms: RecoilAtomProperty[];
  selectors: RecoilSelector[];
  atomFamilies: RecoilAtomFamily[];
}

/**
 * Service for creating Recoil atoms and selectors with TypeScript typing,
 * persistence, async selectors, and atom families
 */
export class RecoilStateGeneratorService {
  private static instance: RecoilStateGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RecoilStateGeneratorService {
    RecoilStateGeneratorService.instance ??= new RecoilStateGeneratorService();
    return RecoilStateGeneratorService.instance;
  }

  /**
   * Creates Recoil state based on the provided configuration
   */
  public async createRecoilState(
    document: vscode.TextDocument,
    _selection: vscode.Selection,
  ): Promise<GeneratedRecoilState> {
    const config = await this.promptForStateConfig();
    const stateCode = this.generateStateCode(config);
    const fileName = `${config.name}.ts`;
    const filePath = this.calculateFilePath(document.fileName, fileName);
    const importPath = this.calculateImportPath(document.fileName, fileName);

    this.logger.info('Recoil state created', {
      name: config.name,
      atomCount: config.atoms.length,
      selectorCount: config.selectors.length,
      atomFamilyCount: config.atomFamilies.length,
      hasPersistence: config.includePersistence,
      hasAsyncSelectors: config.includeAsyncSelectors,
    });

    return {
      fileName,
      filePath,
      importPath,
      stateCode,
      atoms: config.atoms,
      selectors: config.selectors,
      atomFamilies: config.atomFamilies,
    };
  }

  /**
   * Prompts user for state configuration
   */
  private async promptForStateConfig(): Promise<RecoilStateConfig> {
    // Get state name
    const name = await this.getStateName();

    // Get atoms
    const atoms = await this.getAtoms();

    // Get selectors
    const selectors = await this.getSelectors(atoms);

    // Get atom families
    const atomFamilies = await this.getAtomFamilies();

    // Get persistence preference
    const persistenceConfig = await this.getPersistenceConfig();

    // Get async selector preference
    const includeAsyncSelectors = await this.getAsyncSelectorPreference();

    // Get TypeScript preference
    const includeTypeScript = await this.getTypeScriptPreference();

    // Get JSDoc preference
    const includeJSDoc = await this.getJSDocPreference();

    const config: RecoilStateConfig = {
      name,
      atoms,
      selectors,
      atomFamilies,
      includeTypeScript,
      includeJSDoc,
      includePersistence: persistenceConfig.enabled,
      includeAsyncSelectors,
    };

    if (persistenceConfig.enabled && persistenceConfig.key) {
      config.persistenceKey = persistenceConfig.key;
    }

    return config;
  }

  /**
   * Prompts user for state name
   */
  private async getStateName(): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter state name (e.g., "userState", "appState")',
      placeHolder: 'myState',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'State name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'State name can only contain letters, numbers, $, or _';
        }
        return null;
      },
    });

    return input?.trim() || 'myState';
  }

  /**
   * Prompts user for atoms
   */
  private async getAtoms(): Promise<RecoilAtomProperty[]> {
    const atoms: RecoilAtomProperty[] = [];
    let addingAtoms: boolean = true;

    while (addingAtoms) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add atom', value: true },
          { label: 'No - Skip atoms', value: false },
        ],
        {
          placeHolder: atoms.length === 0 ? 'Add an atom to the state?' : 'Add another atom?',
          title: 'State Atoms',
        },
      );

      if (!addAnother?.value) {
        if (atoms.length === 0) {
          // Add default atom if none provided
          atoms.push({
            name: 'defaultAtom',
            type: 'string',
            isRequired: true,
            defaultValue: "''",
          });
        }
        addingAtoms = false;
        continue;
      }

      const atomName = await vscode.window.showInputBox({
        prompt: 'Enter atom name',
        placeHolder: 'myAtom',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Atom name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Atom name can only contain letters, numbers, $, or _';
          }
          if (atoms.some((a) => a.name === value)) {
            return 'Atom name already exists';
          }
          return null;
        },
      });

      if (!atomName || atomName.trim().length === 0) {
        continue;
      }

      const atomType = await this.getAtomType(atomName);
      const isRequired = await this.getIsRequired(atomName);
      const defaultValue = await this.getDefaultValue(atomName, atomType);
      const description = await this.getDescription(atomName, false);

      const atom: RecoilAtomProperty = {
        name: atomName.trim(),
        type: atomType,
        isRequired,
      };
      if (defaultValue !== undefined) {
        atom.defaultValue = defaultValue;
      }
      if (description !== undefined) {
        atom.description = description;
      }

      atoms.push(atom);
    }

    return atoms;
  }

  /**
   * Prompts user for atom type
   */
  private async getAtomType(atomName: string): Promise<string> {
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
        placeHolder: `Select type for ${atomName}`,
        title: 'Atom Type',
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
   * Prompts user if atom/selector is required
   */
  private async getIsRequired(name: string): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: true },
        { label: 'Optional', value: false },
      ],
      {
        placeHolder: `Is ${name} required?`,
        title: 'Requirement',
      },
    );

    return selected?.value ?? true;
  }

  /**
   * Prompts user for default value
   */
  private async getDefaultValue(name: string, type: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter default value for ${name} (optional)`,
      placeHolder: this.getDefaultPlaceholder(type),
    });

    return input?.trim() || undefined;
  }

  /**
   * Gets a placeholder based on type
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
   * Prompts user for description
   */
  private async getDescription(name: string, isSelector: boolean): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter description for ${name} (optional)`,
      placeHolder: isSelector ? 'Derived state from...' : 'Stores...',
    });

    return input?.trim() || undefined;
  }

  /**
   * Prompts user for selectors
   */
  private async getSelectors(atoms: RecoilAtomProperty[]): Promise<RecoilSelector[]> {
    const selectors: RecoilSelector[] = [];
    let addingSelectors = true;

    while (addingSelectors) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add selector', value: true },
          { label: 'No - Skip selectors', value: false },
        ],
        {
          placeHolder: selectors.length === 0 ? 'Add a selector to the state?' : 'Add another selector?',
          title: 'State Selectors',
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

      const selectorType = await this.getAtomType(selectorName);
      const isAsync = await this.getSelectorAsyncPreference();
      const dependencies = await this.getSelectorDependencies(atoms);
      const description = await this.getDescription(selectorName, true);

      const selector: RecoilSelector = {
        name: selectorName.trim(),
        type: selectorType,
        atomDependencies: dependencies,
        selectorFunction: `// TODO: Implement ${selectorName} logic`,
        isAsync,
      };

      if (description !== undefined) {
        selector.description = description;
      }

      selectors.push(selector);
    }

    return selectors;
  }

  /**
   * Prompts user if selector is async
   */
  private async getSelectorAsyncPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Async - For async operations', value: true },
        { label: 'Sync - For synchronous operations', value: false },
      ],
      {
        placeHolder: 'Is this selector async?',
        title: 'Selector Type',
      },
    );

    return selected?.value ?? false;
  }

  /**
   * Prompts user for selector dependencies
   */
  private async getSelectorDependencies(atoms: RecoilAtomProperty[]): Promise<string[]> {
    if (atoms.length === 0) {
      return [];
    }

    const selected = await vscode.window.showQuickPick(
      atoms.map((atom) => ({
        label: atom.name,
        value: atom.name,
        picked: false,
      })),
      {
        placeHolder: 'Select atom dependencies',
        title: 'Selector Dependencies',
        canPickMany: true,
      },
    );

    return selected?.map((s) => s.value) || [];
  }

  /**
   * Prompts user for atom families
   */
  private async getAtomFamilies(): Promise<RecoilAtomFamily[]> {
    const families: RecoilAtomFamily[] = [];
    let addingFamilies = true;

    while (addingFamilies) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add atom family', value: true },
          { label: 'No - Skip atom families', value: false },
        ],
        {
          placeHolder: families.length === 0 ? 'Add an atom family to the state?' : 'Add another atom family?',
          title: 'Atom Families',
        },
      );

      if (!addAnother?.value) {
        addingFamilies = false;
        continue;
      }

      const familyName = await vscode.window.showInputBox({
        prompt: 'Enter atom family name',
        placeHolder: 'myAtomFamily',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Atom family name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Atom family name can only contain letters, numbers, $, or _';
          }
          if (families.some((f) => f.name === value)) {
            return 'Atom family name already exists';
          }
          return null;
        },
      });

      if (!familyName || familyName.trim().length === 0) {
        continue;
      }

      const paramName = await this.getParameterName();
      const paramType = await this.getParameterType();
      const atomType = await this.getAtomType(familyName);
      const defaultValue = await this.getDefaultValue(familyName, atomType);
      const description = await this.getDescription(familyName, false);

      const family: RecoilAtomFamily = {
        name: familyName.trim(),
        parameterName: paramName,
        parameterType: paramType,
        atomType,
      };

      if (defaultValue !== undefined) {
        family.defaultValue = defaultValue;
      }
      if (description !== undefined) {
        family.description = description;
      }

      families.push(family);
    }

    return families;
  }

  /**
   * Prompts user for parameter name
   */
  private async getParameterName(): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter parameter name (e.g., "id", "key")',
      placeHolder: 'param',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Parameter name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Parameter name can only contain letters, numbers, $, or _';
        }
        return null;
      },
    });

    return input?.trim() || 'param';
  }

  /**
   * Prompts user for parameter type
   */
  private async getParameterType(): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: 'Select parameter type',
        title: 'Parameter Type',
      },
    );

    if (!quickPick) {
      return 'string';
    }

    if (quickPick.value === 'custom') {
      return (
        (await vscode.window.showInputBox({
          prompt: 'Enter custom parameter type',
          placeHolder: 'CustomType',
        })) || 'string'
      );
    }

    return quickPick.value;
  }

  /**
   * Prompts user for persistence configuration
   */
  private async getPersistenceConfig(): Promise<{ enabled: boolean; key?: string }> {
    const enabled = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Enable persistence', value: true },
        { label: 'No - Skip persistence', value: false },
      ],
      {
        placeHolder: 'Enable state persistence?',
        title: 'Persistence',
      },
    );

    if (!enabled?.value) {
      return { enabled: false };
    }

    const key = await vscode.window.showInputBox({
      prompt: 'Enter persistence key (optional)',
      placeHolder: 'Leave empty to use default',
    });

    const result: { enabled: boolean; key?: string } = {
      enabled: true,
    };

    if (key?.trim()) {
      result.key = key.trim();
    }

    return result;
  }

  /**
   * Prompts user for async selector preference
   */
  private async getAsyncSelectorPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include async selector utilities', value: true },
        { label: 'No - Skip async selectors', value: false },
      ],
      {
        placeHolder: 'Include async selector utilities?',
        title: 'Async Selectors',
      },
    );

    return selected?.value ?? false;
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
   * Generates the state code
   */
  private generateStateCode(config: RecoilStateConfig): string {
    let code = '';

    // Add imports
    const recoilImports: string[] = ['atom'];

    if (config.selectors.length > 0 || config.includeAsyncSelectors) {
      recoilImports.push('selector');
    }
    if (config.atomFamilies.length > 0) {
      recoilImports.push('atomFamily');
    }

    code += `import { ${recoilImports.join(', ')} } from 'recoil';\n`;

    if (config.includePersistence) {
      code += "import { recoilPersist } from 'recoil-persist';\n";
    }

    if (config.includeTypeScript) {
      code += '\n';
      // Generate types for atoms
      if (config.atoms.length > 0) {
        code += `// Atom types\n`;
        for (const atom of config.atoms) {
          const optional = atom.isRequired ? '' : ' | null | undefined';
          code += `type ${this.toPascalCase(atom.name)}Type = ${atom.type}${optional};\n`;
        }
        code += '\n';
      }
    }

    // Add persistence effect if enabled
    if (config.includePersistence) {
      const persistKey = config.persistenceKey || config.name;
      code += `const { persistAtom } = recoilPersist({\n`;
      code += `  key: '${persistKey}',\n`;
      code += `  storage: localStorage,\n`;
      code += `});\n\n`;
    }

    // Generate atoms
    if (config.atoms.length > 0) {
      code += '// Atoms\n';
      for (const atom of config.atoms) {
        code += this.generateAtom(atom, config);
      }
    }

    // Generate selectors
    if (config.selectors.length > 0) {
      code += '\n// Selectors\n';
      for (const selector of config.selectors) {
        code += this.generateSelector(selector, config);
      }
    }

    // Generate atom families
    if (config.atomFamilies.length > 0) {
      code += '\n// Atom Families\n';
      for (const family of config.atomFamilies) {
        code += this.generateAtomFamily(family, config);
      }
    }

    return code;
  }

  /**
   * Generates an atom
   */
  private generateAtom(atom: RecoilAtomProperty, config: RecoilStateConfig): string {
    let code = '';

    if (config.includeJSDoc && atom.description) {
      code += `/**\n * ${atom.description}\n */\n`;
    }

    const defaultValue = atom.defaultValue ?? this.getDefaultPlaceholder(atom.type);
    const typeParam = config.includeTypeScript ? `<${atom.type}>` : '';

    code += `export const ${atom.name} = atom${typeParam}({\n`;
    code += `  key: '${atom.name}',\n`;
    code += `  default: ${defaultValue},\n`;

    if (config.includePersistence) {
      code += `  effects_UNSTABLE: [persistAtom],\n`;
    }

    code += `});\n`;

    return code;
  }

  /**
   * Generates a selector
   */
  private generateSelector(selector: RecoilSelector, config: RecoilStateConfig): string {
    let code = '';

    if (config.includeJSDoc && selector.description) {
      code += `/**\n * ${selector.description}\n */\n`;
    }

    const asyncKeyword = selector.isAsync ? 'async ' : '';
    const typeParam = config.includeTypeScript ? `<${selector.type}>` : '';

    code += `export const ${selector.name} = selector${typeParam}({\n`;
    code += `  key: '${selector.name}',\n`;
    code += `  get: ${asyncKeyword}({ get }) => {\n`;

    if (selector.atomDependencies.length > 0) {
      code += `    // Dependencies\n`;
      for (const dep of selector.atomDependencies) {
        code += `    const ${dep} = get(${dep});\n`;
      }
      code += `\n`;
    }

    code += `    ${selector.selectorFunction}\n`;
    code += `    return ${this.getDefaultPlaceholder(selector.type)} as any;\n`;
    code += `  },\n`;
    code += `});\n`;

    return code;
  }

  /**
   * Generates an atom family
   */
  private generateAtomFamily(family: RecoilAtomFamily, config: RecoilStateConfig): string {
    let code = '';

    if (config.includeJSDoc && family.description) {
      code += `/**\n * ${family.description}\n */\n`;
    }

    const defaultValue = family.defaultValue ?? this.getDefaultPlaceholder(family.atomType);
    const typeParam = config.includeTypeScript ? `<[${family.parameterType}, ${family.atomType}]>` : '';

    code += `export const ${family.name} = atomFamily${typeParam}({\n`;
    code += `  key: '${family.name}',\n`;
    code += `  default: ${defaultValue},\n`;

    if (config.includePersistence) {
      code += `  effects_UNSTABLE: [persistAtom],\n`;
    }

    code += `});\n`;

    return code;
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
   * Calculates the file path for the state file
   */
  private calculateFilePath(sourceFilePath: string, fileName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const stateDir = path.join(sourceDir, 'state');
    return path.join(stateDir, fileName);
  }

  /**
   * Calculates the relative import path for the new state
   */
  private calculateImportPath(sourceFilePath: string, fileName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const stateDir = path.join(sourceDir, 'state');
    return path.join(stateDir, fileName);
  }

  /**
   * Creates the state file at the specified path
   */
  public async createStateFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write state file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Recoil state file created', { filePath });
  }

  /**
   * Generates state usage example
   */
  public generateStateUsage(stateName: string, atoms: RecoilAtomProperty[]): string {
    const atomUsage = atoms.map((a) => `${a.name}`).join(', ');
    return `import { ${atomUsage} } from './state/${stateName}';

// In component:
import { useRecoilState } from 'recoil';

const [value, setValue] = useRecoilState(${atoms[0]?.name || 'atom'});

// Or use Recoil hooks:
// useRecoilValue - Read value
// useSetRecoilState - Get setter
// useResetRecoilState - Reset to default`;
  }

  /**
   * Checks if code contains Recoil imports
   */
  public containsRecoilState(code: string): boolean {
    const recoilPatterns = [/from\s+['"]recoil['"]/, /atom\s*\(/, /selector\s*\(/];

    return recoilPatterns.some((pattern) => pattern.test(code));
  }
}
