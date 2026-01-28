import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface JotaiAtomProperty {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
  description?: string;
}

export interface JotaiDerivedAtom {
  name: string;
  type: string;
  dependencyAtoms: string[];
  computation: string;
  description?: string;
}

export interface JotaiAsyncAtom {
  name: string;
  type: string;
  dependencyAtoms: string[];
  asyncFunction: string;
  description?: string;
}

export interface JotaiAtomFamily {
  name: string;
  parameterName: string;
  parameterType: string;
  atomType: string;
  defaultValue?: string;
  description?: string;
}

export interface JotaiAtomGeneratorConfig {
  atomsDirectory: string;
  includeTypes: boolean;
  includeJSDoc: boolean;
  includeDefaultValues: boolean;
  makeAtomsReadOnly: boolean;
  generateAtomFamilies: boolean;
  generateAsyncAtoms: boolean;
  generateDerivedAtoms: boolean;
  enablePersistence: boolean;
  persistenceStorage?: 'localStorage' | 'sessionStorage';
}

export interface GeneratedJotaiAtoms {
  fileName: string;
  filePath: string;
  importPath: string;
  atomCode: string;
  primitiveAtoms: JotaiAtomProperty[];
  derivedAtoms: JotaiDerivedAtom[];
  asyncAtoms: JotaiAsyncAtom[];
  atomFamilies: JotaiAtomFamily[];
}

/**
 * Service for generating Jotai atoms with TypeScript typing,
 * derived atoms, async atoms, atom families, and persistence
 */
export class JotaiAtomGeneratorService {
  private static instance: JotaiAtomGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): JotaiAtomGeneratorService {
    JotaiAtomGeneratorService.instance ??= new JotaiAtomGeneratorService();
    return JotaiAtomGeneratorService.instance;
  }

  /**
   * Main entry point: Generates Jotai atoms from user input
   */
  public async generateAtoms(
    document: vscode.TextDocument,
    _selection: vscode.Selection,
  ): Promise<GeneratedJotaiAtoms> {
    const config = await this.promptForConfig();

    // Collect atoms
    const primitiveAtoms = await this.getPrimitiveAtoms();
    const derivedAtoms = config.generateDerivedAtoms ? await this.getDerivedAtoms(primitiveAtoms) : [];
    const asyncAtoms = config.generateAsyncAtoms ? await this.getAsyncAtoms(primitiveAtoms) : [];
    const atomFamilies = config.generateAtomFamilies ? await this.getAtomFamilies() : [];

    // Generate code
    const atomCode = this.generateAtomCode(primitiveAtoms, derivedAtoms, asyncAtoms, atomFamilies, config);

    // Calculate file paths
    const fileName = await this.getFileName();
    const filePath = this.calculateFilePath(document.fileName, fileName, config.atomsDirectory);
    const importPath = this.calculateImportPath(document.fileName, fileName, config.atomsDirectory);

    this.logger.info('Jotai atoms generated', {
      primitiveCount: primitiveAtoms.length,
      derivedCount: derivedAtoms.length,
      asyncCount: asyncAtoms.length,
      familyCount: atomFamilies.length,
    });

    return {
      fileName,
      filePath,
      importPath,
      atomCode,
      primitiveAtoms,
      derivedAtoms,
      asyncAtoms,
      atomFamilies,
    };
  }

  /**
   * Prompts user for configuration
   */
  private async promptForConfig(): Promise<JotaiAtomGeneratorConfig> {
    // Atoms directory
    const atomsDirectory = await vscode.window.showInputBox({
      prompt: 'Enter atoms directory name',
      placeHolder: 'atoms',
      value: 'atoms',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory name cannot be empty';
        }
        return null;
      },
    });

    if (!atomsDirectory) {
      throw new Error('Configuration cancelled');
    }

    // Feature selection
    const features = await vscode.window.showQuickPick(
      [
        { label: 'TypeScript typing', description: 'Include TypeScript types', picked: true },
        { label: 'JSDoc comments', description: 'Include JSDoc documentation', picked: true },
        { label: 'Default values', description: 'Include default values for atoms', picked: true },
        { label: 'Read-only atoms', description: 'Make primitive atoms read-only with wrapped setters', picked: false },
        { label: 'Atom families', description: 'Generate parameterized atom families', picked: true },
        { label: 'Async atoms', description: 'Generate async atoms for data fetching', picked: true },
        { label: 'Derived atoms', description: 'Generate computed/derived atoms', picked: true },
        { label: 'Persistence', description: 'Enable atom persistence with storage', picked: false },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      throw new Error('Configuration cancelled');
    }

    const featureLabels = features.map((f) => f.label);

    let persistenceStorage: 'localStorage' | 'sessionStorage' | undefined;
    if (featureLabels.includes('Persistence')) {
      const storageType = await vscode.window.showQuickPick(
        [
          { label: 'localStorage', value: 'localStorage' as const },
          { label: 'sessionStorage', value: 'sessionStorage' as const },
        ],
        {
          placeHolder: 'Select storage type for persistence',
        },
      );
      persistenceStorage = storageType?.value;
    }

    return {
      atomsDirectory: atomsDirectory.trim(),
      includeTypes: featureLabels.includes('TypeScript typing'),
      includeJSDoc: featureLabels.includes('JSDoc comments'),
      includeDefaultValues: featureLabels.includes('Default values'),
      makeAtomsReadOnly: featureLabels.includes('Read-only atoms'),
      generateAtomFamilies: featureLabels.includes('Atom families'),
      generateAsyncAtoms: featureLabels.includes('Async atoms'),
      generateDerivedAtoms: featureLabels.includes('Derived atoms'),
      enablePersistence: featureLabels.includes('Persistence'),
      persistenceStorage,
    };
  }

  /**
   * Prompts user for primitive atoms
   */
  private async getPrimitiveAtoms(): Promise<JotaiAtomProperty[]> {
    const atoms: JotaiAtomProperty[] = [];
    let addingAtoms = true;

    while (addingAtoms) {
      const atomName = await vscode.window.showInputBox({
        prompt: `Enter atom name (${atoms.length + 1}) (leave empty to finish)`,
        placeHolder: 'myAtom',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return atoms.length === 0 ? 'At least one atom is required' : null;
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
        if (atoms.length > 0) {
          addingAtoms = false;
          continue;
        }
        // Default atom if none provided
        return [
          {
            name: 'count',
            type: 'number',
            isRequired: true,
            defaultValue: '0',
          },
        ];
      }

      const atomType = await this.getAtomType(atomName);
      const isOptional = await this.getIsRequired(atomName);
      const defaultValue = await this.getDefaultValue(atomName, atomType);
      const description = await this.getDescription(atomName);

      atoms.push({
        name: atomName.trim(),
        type: atomType,
        isRequired: !isOptional,
        defaultValue,
        description,
      });
    }

    return atoms;
  }

  /**
   * Gets atom type from user
   */
  private async getAtomType(atomName: string): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'array', value: 'unknown[]' },
        { label: 'object', value: 'Record<string, unknown>' },
        { label: 'null', value: 'null' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: `Select type for ${atomName}`,
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
   * Checks if atom is required
   */
  private async getIsRequired(atomName: string): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: false },
        { label: 'Optional (can be null/undefined)', value: true },
      ],
      {
        placeHolder: `Is ${atomName} required?`,
      },
    );

    return selected?.value ?? false;
  }

  /**
   * Gets default value for atom
   */
  private async getDefaultValue(atomName: string, atomType: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter default value for ${atomName} (optional)`,
      placeHolder: this.getDefaultPlaceholder(atomType),
    });

    return input?.trim() || undefined;
  }

  /**
   * Gets description for atom
   */
  private async getDescription(atomName: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: `Enter description for ${atomName} (optional)`,
      placeHolder: 'A brief description...',
    });

    return input?.trim() || undefined;
  }

  /**
   * Gets default placeholder based on type
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
      case 'null':
        return 'null';
      default:
        return 'undefined';
    }
  }

  /**
   * Prompts user for derived atoms
   */
  private async getDerivedAtoms(primitiveAtoms: JotaiAtomProperty[]): Promise<JotaiDerivedAtom[]> {
    const derivedAtoms: JotaiDerivedAtom[] = [];

    if (primitiveAtoms.length === 0) {
      return derivedAtoms;
    }

    let addingDerived = true;
    while (addingDerived) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add derived atom', value: true },
          { label: 'No - Skip derived atoms', value: false },
        ],
        {
          placeHolder: derivedAtoms.length === 0 ? 'Add a derived atom?' : 'Add another derived atom?',
        },
      );

      if (!addAnother?.value) {
        break;
      }

      const derivedName = await vscode.window.showInputBox({
        prompt: 'Enter derived atom name',
        placeHolder: 'derivedAtom',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Derived atom name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Name can only contain letters, numbers, $, or _';
          }
          if (derivedAtoms.some((a) => a.name === value)) {
            return 'Name already exists';
          }
          return null;
        },
      });

      if (!derivedName || derivedName.trim().length === 0) {
        continue;
      }

      // Select dependencies
      const dependencies = await vscode.window.showQuickPick(
        primitiveAtoms.map((atom) => ({
          label: atom.name,
          value: atom.name,
          picked: false,
        })),
        {
          placeHolder: 'Select dependency atoms',
          canPickMany: true,
        },
      );

      if (!dependencies || dependencies.length === 0) {
        continue;
      }

      const derivedType = await this.getAtomType(derivedName);
      const computation = await this.getComputation(derivedName, dependencies.map((d) => d.value));
      const description = await this.getDescription(derivedName);

      derivedAtoms.push({
        name: derivedName.trim(),
        type: derivedType,
        dependencyAtoms: dependencies.map((d) => d.value),
        computation,
        description,
      });
    }

    return derivedAtoms;
  }

  /**
   * Gets computation for derived atom
   */
  private async getComputation(atomName: string, dependencies: string[]): Promise<string> {
    const placeholder = `return (${dependencies.join(', ')}) => {\n  // Compute ${atomName}\n  return result;\n}`;

    const input = await vscode.window.showInputBox({
      prompt: 'Enter computation (simplified)',
      placeHolder: '// computation',
      value: placeholder,
    });

    return input?.trim() || placeholder;
  }

  /**
   * Prompts user for async atoms
   */
  private async getAsyncAtoms(primitiveAtoms: JotaiAtomProperty[]): Promise<JotaiAsyncAtom[]> {
    const asyncAtoms: JotaiAsyncAtom[] = [];

    if (primitiveAtoms.length === 0) {
      return asyncAtoms;
    }

    let addingAsync = true;
    while (addingAsync) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add async atom', value: true },
          { label: 'No - Skip async atoms', value: false },
        ],
        {
          placeHolder: asyncAtoms.length === 0 ? 'Add an async atom?' : 'Add another async atom?',
        },
      );

      if (!addAnother?.value) {
        break;
      }

      const asyncName = await vscode.window.showInputBox({
        prompt: 'Enter async atom name',
        placeHolder: 'asyncData',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Async atom name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Name can only contain letters, numbers, $, or _';
          }
          if (asyncAtoms.some((a) => a.name === value)) {
            return 'Name already exists';
          }
          return null;
        },
      });

      if (!asyncName || asyncName.trim().length === 0) {
        continue;
      }

      // Select dependencies
      const dependencies = await vscode.window.showQuickPick(
        primitiveAtoms.map((atom) => ({
          label: atom.name,
          value: atom.name,
          picked: false,
        })),
        {
          placeHolder: 'Select dependency atoms (optional)',
          canPickMany: true,
        },
      );

      const asyncType = await this.getAtomType(asyncName);
      const asyncFunction = await this.getAsyncFunction(asyncName);
      const description = await this.getDescription(asyncName);

      asyncAtoms.push({
        name: asyncName.trim(),
        type: asyncType,
        dependencyAtoms: dependencies?.map((d) => d.value) || [],
        asyncFunction,
        description,
      });
    }

    return asyncAtoms;
  }

  /**
   * Gets async function for async atom
   */
  private async getAsyncFunction(atomName: string): Promise<string> {
    const placeholder = `async (get) => {\n  // Fetch ${atomName}\n  const response = await fetch('/api/${atomName}');\n  return await response.json();\n}`;

    const input = await vscode.window.showInputBox({
      prompt: 'Enter async function (simplified)',
      placeHolder: '// async function',
      value: placeholder,
    });

    return input?.trim() || placeholder;
  }

  /**
   * Prompts user for atom families
   */
  private async getAtomFamilies(): Promise<JotaiAtomFamily[]> {
    const atomFamilies: JotaiAtomFamily[] = [];
    let addingFamilies = true;

    while (addingFamilies) {
      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Yes - Add atom family', value: true },
          { label: 'No - Skip atom families', value: false },
        ],
        {
          placeHolder: atomFamilies.length === 0 ? 'Add an atom family?' : 'Add another atom family?',
        },
      );

      if (!addAnother?.value) {
        break;
      }

      const familyName = await vscode.window.showInputBox({
        prompt: 'Enter atom family name',
        placeHolder: 'itemsFamily',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Atom family name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Name can only contain letters, numbers, $, or _';
          }
          if (atomFamilies.some((f) => f.name === value)) {
            return 'Name already exists';
          }
          return null;
        },
      });

      if (!familyName || familyName.trim().length === 0) {
        continue;
      }

      const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name',
        placeHolder: 'id',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Name can only contain letters, numbers, $, or _';
          }
          return null;
        },
      });

      if (!paramName || paramName.trim().length === 0) {
        continue;
      }

      const paramType = await this.getAtomType(paramName);
      const atomType = await this.getAtomType(familyName);
      const defaultValue = await this.getDefaultValue(familyName, atomType);
      const description = await this.getDescription(familyName);

      atomFamilies.push({
        name: familyName.trim(),
        parameterName: paramName.trim(),
        parameterType: paramType,
        atomType,
        defaultValue,
        description,
      });
    }

    return atomFamilies;
  }

  /**
   * Gets file name from user
   */
  private async getFileName(): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter file name (without extension)',
      placeHolder: 'atoms',
      value: 'atoms',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'File name cannot be empty';
        }
        return null;
      },
    });

    return input?.trim() || 'atoms';
  }

  /**
   * Generates the complete atom code
   */
  private generateAtomCode(
    primitiveAtoms: JotaiAtomProperty[],
    derivedAtoms: JotaiDerivedAtom[],
    asyncAtoms: JotaiAsyncAtom[],
    atomFamilies: JotaiAtomFamily[],
    config: JotaiAtomGeneratorConfig,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(config);

    // Generate primitive atoms
    if (primitiveAtoms.length > 0) {
      code += '\n// Primitive Atoms\n';
      for (const atom of primitiveAtoms) {
        code += this.generatePrimitiveAtom(atom, config);
      }
    }

    // Generate derived atoms
    if (derivedAtoms.length > 0) {
      code += '\n// Derived Atoms\n';
      for (const derived of derivedAtoms) {
        code += this.generateDerivedAtom(derived, config);
      }
    }

    // Generate async atoms
    if (asyncAtoms.length > 0) {
      code += '\n// Async Atoms\n';
      for (const asyncAtom of asyncAtoms) {
        code += this.generateAsyncAtom(asyncAtom, config);
      }
    }

    // Generate atom families
    if (atomFamilies.length > 0) {
      code += '\n// Atom Families\n';
      for (const family of atomFamilies) {
        code += this.generateAtomFamily(family, config);
      }
    }

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(config: JotaiAtomGeneratorConfig): string {
    let imports = "import { atom";

    const helperFunctions: string[] = [];

    if (config.generateDerivedAtoms) {
      helperFunctions.push('atomWithComputed');
    }

    if (config.generateAsyncAtoms) {
      helperFunctions.push('atomWithReset', 'loadable');
    }

    if (config.generateAtomFamilies) {
      helperFunctions.push('atomFamily');
    }

    if (config.enablePersistence) {
      helperFunctions.push('atomWithStorage');
    }

    if (helperFunctions.length > 0) {
      imports += `, ${helperFunctions.join(', ')}`;
    }

    imports += " } from 'jotai';\n";

    if (config.enablePersistence) {
      imports += `import { ${config.persistenceStorage || 'localStorage'} } from '../storage';\n`;
    }

    return imports;
  }

  /**
   * Generates a primitive atom
   */
  private generatePrimitiveAtom(atom: JotaiAtomProperty, config: JotaiAtomGeneratorConfig): string {
    let code = '';

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += '/**\n';
      if (atom.description) {
        code += ` * ${atom.description}\n`;
      }
      code += ` * @type {${atom.type}}\n`;
      code += ' */\n';
    }

    // Generate atom
    const atomType = config.includeTypes ? `<${atom.type}>` : '';
    const defaultValue = config.includeDefaultValues && atom.defaultValue ? atom.defaultValue : this.getDefaultPlaceholder(atom.type);

    if (config.makeAtomsReadOnly) {
      // Generate read-only atom pattern
      code += `const ${atom.name}AtomState${atomType} = atom${atomType}(${defaultValue});\n\n`;
      code += `export const ${atom.name}Atom = atom${atomType}((get) => get(${atom.name}AtomState));\n`;
      code += `export const set${this.capitalize(atom.name)}Atom = (newValue: ${atom.type}) => (${atom.name}AtomState.value = newValue);\n\n`;
    } else if (config.enablePersistence) {
      // Generate persistent atom
      const storageKey = `'${atom.name}-storage'`;
      code += `export const ${atom.name}Atom = atomWithStorage${atomType}(${storageKey}, ${defaultValue});\n\n`;
    } else {
      // Regular atom
      code += `export const ${atom.name}Atom = atom${atomType}(${defaultValue});\n\n`;
    }

    return code;
  }

  /**
   * Generates a derived atom
   */
  private generateDerivedAtom(derived: JotaiDerivedAtom, config: JotaiAtomGeneratorConfig): string {
    let code = '';

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += '/**\n';
      if (derived.description) {
        code += ` * ${derived.description}\n`;
      }
      code += ` * @type {${derived.type}}\n`;
      code += ' */\n';
    }

    const atomType = config.includeTypes ? `<${derived.type}>` : '';

    // Build dependency list
    const dependencies = derived.dependencyAtoms.map((dep) => `${dep}Atom`).join(', ');

    code += `export const ${derived.name}Atom = atomWithComputed${atomType}((get) => {\n`;
    code += `  ${derived.computation}\n`;
    code += `}, [${dependencies}]);\n\n`;

    return code;
  }

  /**
   * Generates an async atom
   */
  private generateAsyncAtom(asyncAtom: JotaiAsyncAtom, config: JotaiAtomGeneratorConfig): string {
    let code = '';

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += '/**\n';
      if (asyncAtom.description) {
        code += ` * ${asyncAtom.description}\n`;
      }
      code += ` * @type {${asyncAtom.type}}\n`;
      code += ' */\n';
    }

    const atomType = config.includeTypes ? `<${asyncAtom.type}>` : '';

    // Initial value
    const initialValue = this.getDefaultPlaceholder(asyncAtom.type);

    code += `export const ${asyncAtom.name}Atom = atomWithReset${atomType}(${initialValue});\n`;
    code += `export const ${asyncAtom.name}AtomWithAsync = atom${atomType}(async (get) => {\n`;
    code += `  ${asyncAtom.asyncFunction}\n`;
    code += `});\n\n`;
    code += `export const ${asyncAtom.name}Loadable = () => loadable(${asyncAtom.name}AtomWithAsync);\n\n`;

    return code;
  }

  /**
   * Generates an atom family
   */
  private generateAtomFamily(family: JotaiAtomFamily, config: JotaiAtomGeneratorConfig): string {
    let code = '';

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += '/**\n';
      if (family.description) {
        code += ` * ${family.description}\n`;
      }
      code += ` * @param {${family.parameterType}} ${family.parameterName}\n`;
      code += ` * @type {${family.atomType}}\n`;
      code += ' */\n';
    }

    const atomType = config.includeTypes ? `<${family.atomType}>` : '';
    const defaultValue = config.includeDefaultValues && family.defaultValue ? family.defaultValue : this.getDefaultPlaceholder(family.atomType);

    code += `export const ${family.name} = atomFamily${atomType}((${family.parameterName}: ${family.parameterType}) => atom${atomType}(${defaultValue}));\n\n`;

    return code;
  }

  /**
   * Capitalizes a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Calculates the file path for the atoms file
   */
  private calculateFilePath(sourceFilePath: string, fileName: string, atomsDirectory: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const dir = path.join(sourceDir, atomsDirectory);
    return path.join(dir, `${fileName}.ts`);
  }

  /**
   * Calculates the relative import path
   */
  private calculateImportPath(sourceFilePath: string, fileName: string, atomsDirectory: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    return path.join(atomsDirectory, fileName);
  }

  /**
   * Creates the atoms file at the specified path
   */
  public async createAtomsFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write atoms file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Jotai atoms file created', { filePath });
  }

  /**
   * Checks if an atoms file already exists
   */
  public async atomsFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if code contains Jotai imports
   */
  public containsJotaiAtoms(code: string): boolean {
    const jotaiPatterns = [/from\s+['"]jotai['"]/, /atom\s*\(/, /atomFamily\s*\(/];

    return jotaiPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * Generates usage example
   */
  public generateUsageExample(atoms: GeneratedJotaiAtoms): string {
    let example = `// Import atoms\nimport { `;

    const imports: string[] = [];
    for (const atom of atoms.primitiveAtoms) {
      imports.push(`${atom.name}Atom`);
    }
    for (const derived of atoms.derivedAtoms) {
      imports.push(`${derived.name}Atom`);
    }
    for (const asyncAtom of atoms.asyncAtoms) {
      imports.push(`${asyncAtom.name}Atom`, `${asyncAtom.name}Loadable`);
    }
    for (const family of atoms.atomFamilies) {
      imports.push(family.name);
    }

    example += `${imports.join(', ')} } from '${atoms.importPath}';\n\n`;

    example += `// In component:\n`;
    example += `const [value, setValue] = useAtom(${atoms.primitiveAtoms[0]?.name || 'myAtom'}Atom);\n\n`;

    if (atoms.atomFamilies.length > 0) {
      example += `// Atom family usage:\n`;
      example += `const familyAtom = ${atoms.atomFamilies[0].name}(paramValue);\n`;
      example += `const [familyValue, setFamilyValue] = useAtom(familyAtom);\n\n`;
    }

    if (atoms.asyncAtoms.length > 0) {
      example += `// Async atom usage:\n`;
      example += `const loadable = useLoadable(${atoms.asyncAtoms[0].name}AtomWithAsync);\n`;
      example += `if (loadable.state === 'hasData') { console.log(loadable.data); }\n\n`;
    }

    return example;
  }
}
