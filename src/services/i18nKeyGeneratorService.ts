import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

// Types for the i18n key generator
export interface I18nKeyGeneratorOptions {
  baseNamespace: string;
  outputDirectory: string;
  fileFormat: 'json' | 'ts' | 'js';
  keyPrefix: string;
  includeHelpers: boolean;
  extractFromStrings: boolean;
  extractFromTemplates: boolean;
  generateNamespaces: boolean;
  generateScopedHelpers: boolean;
}

export interface ExtractedStringInfo {
  text: string;
  line: number;
  key: string;
  namespace: string;
  context?: string;
  placeholders?: string[];
}

export interface I18nGenerationResult {
  namespace: string;
  strings: ExtractedStringInfo[];
  translationFileCode: string;
  helperFileCode?: string;
  translationFilePath: string;
  helperFilePath?: string;
  generatedAt: number;
}

/**
 * Service for extracting hardcoded strings and generating i18n keys
 */
export class I18nKeyGeneratorService {
  private static instance: I18nKeyGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): I18nKeyGeneratorService {
    I18nKeyGeneratorService.instance ??= new I18nKeyGeneratorService();
    return I18nKeyGeneratorService.instance;
  }

  /**
   * Main entry point: Extracts strings and generates i18n files
   */
  public async generateI18nKeys(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: I18nKeyGeneratorOptions,
  ): Promise<I18nGenerationResult> {
    const selectedText = document.getText(selection);

    // Extract strings from selection
    const extractedStrings = this.extractStringsFromCode(
      selectedText,
      document.fileName,
      options,
    );

    if (extractedStrings.length === 0) {
      throw new Error('No extractable strings found in selection. Select code with hardcoded strings.');
    }

    // Generate i18n keys for extracted strings
    const stringsWithKeys = this.generateI18nKeysForStrings(
      extractedStrings,
      options,
    );

    // Group by namespace
    const groupedStrings = this.groupStringsByNamespace(stringsWithKeys, options);

    // For now, we'll use the first namespace (or base namespace)
    const namespace = Object.keys(groupedStrings)[0] || options.baseNamespace;
    const stringsForNamespace = groupedStrings[namespace] || [];

    // Generate translation file code
    const translationFileCode = this.generateTranslationFileCode(
      namespace,
      stringsForNamespace,
      options,
    );

    // Calculate file paths
    const translationFilePath = this.calculateTranslationFilePath(
      document.fileName,
      namespace,
      options,
    );

    // Generate helper code if enabled
    let helperFileCode: string | undefined;
    let helperFilePath: string | undefined;

    if (options.includeHelpers && options.generateScopedHelpers) {
      helperFileCode = this.generateHelperFileCode(
        namespace,
        stringsForNamespace,
        options,
      );
      helperFilePath = this.calculateHelperFilePath(
        document.fileName,
        namespace,
        options,
      );
    }

    this.logger.info('I18n keys generated', {
      namespace,
      stringCount: stringsForNamespace.length,
    });

    const result: I18nGenerationResult = {
      namespace,
      strings: stringsForNamespace,
      translationFileCode,
      translationFilePath,
      generatedAt: Date.now(),
    };

    if (helperFileCode !== undefined && helperFilePath !== undefined) {
      result.helperFileCode = helperFileCode;
      result.helperFilePath = helperFilePath;
    }

    return result;
  }

  /**
   * Extracts hardcoded strings from code
   */
  private extractStringsFromCode(
    code: string,
    _filePath: string,
    options: I18nKeyGeneratorOptions,
  ): ExtractedStringInfo[] {
    const extracted: ExtractedStringInfo[] = [];
    const lines = code.split('\n');

    // Patterns for string extraction
    const patterns: Array<{
      regex: RegExp;
      context: string;
    }> = [];

    if (options.extractFromStrings) {
      patterns.push(
        { regex: /(['"`])((?:(?!\1)[^\\]|\\.)*?)\1/g, context: 'stringLiteral' },
        { regex: /(['"`])((?:(?!\1)[^\\]|\\.)*?)\1\s*\+/g, context: 'stringConcatenation' },
      );
    }

    if (options.extractFromTemplates) {
      patterns.push(
        { regex: /\{([^}]+)\}/g, context: 'templateExpression' },
        { regex: />`([^`]*)`/g, context: 'templateLiteral' },
      );
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';

      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags ?? '');

        while ((match = regex.exec(line)) !== null) {
          const text = match[2] || match[1] || '';
          const trimmedText = text.trim();

          // Skip empty strings or single characters
          if (trimmedText.length <= 1) {
            continue;
          }

          // Skip strings that look like code (variables, imports, etc.)
          if (this.looksLikeCode(trimmedText)) {
            continue;
          }

          extracted.push({
            text: trimmedText,
            line: lineIndex + 1,
            key: '',
            namespace: options.baseNamespace,
            context: pattern.context,
            placeholders: this.extractPlaceholders(trimmedText),
          });
        }
      }
    }

    return extracted;
  }

  /**
   * Checks if a string looks like code rather than user-facing text
   */
  private looksLikeCode(text: string): boolean {
    // Skip if it's just a number
    if (/^\d+$/.test(text)) {
      return true;
    }

    // Skip if it looks like a variable name (camelCase)
    if (/^[a-z][a-zA-Z0-9]*$/.test(text)) {
      return true;
    }

    // Skip if it's an import path or URL
    if (text.includes('./') || text.includes('../') || text.startsWith('http')) {
      return true;
    }

    // Skip if it's a file extension
    if (/^\.\w+$/.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Extracts placeholder patterns from template strings
   */
  private extractPlaceholders(text: string): string[] {
    const placeholders: string[] = [];
    const placeholderPattern = /\$\{([^}]+)\}/g;

    let match: RegExpExecArray | null;
    while ((match = placeholderPattern.exec(text)) !== null) {
      if (match[1] !== undefined) {
        placeholders.push(match[1].trim());
      }
    }

    return placeholders;
  }

  /**
   * Generates i18n keys for extracted strings
   */
  private generateI18nKeysForStrings(
    strings: ExtractedStringInfo[],
    options: I18nKeyGeneratorOptions,
  ): ExtractedStringInfo[] {
    return strings.map((strInfo) => {
      // Generate key from the string content
      const baseKey = this.stringToKey(strInfo.text);
      const key = options.keyPrefix ? `${options.keyPrefix}.${baseKey}` : baseKey;

      return {
        ...strInfo,
        key,
      };
    });
  }

  /**
   * Converts a string to an i18n key
   */
  private stringToKey(text: string): string {
    // Convert to kebab-case or camelCase
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/([a-z])([0-9])/g, '$1_$2');
  }

  /**
   * Groups strings by namespace
   */
  private groupStringsByNamespace(
    strings: ExtractedStringInfo[],
    options: I18nKeyGeneratorOptions,
  ): Record<string, ExtractedStringInfo[]> {
    const grouped: Record<string, ExtractedStringInfo[]> = {};

    if (!options.generateNamespaces) {
      grouped[options.baseNamespace] = strings;
      return grouped;
    }

    for (const strInfo of strings) {
      const namespace = strInfo.namespace || options.baseNamespace;
      if (!grouped[namespace]) {
        grouped[namespace] = [];
      }
      grouped[namespace].push(strInfo);
    }

    return grouped;
  }

  /**
   * Generates translation file code
   */
  private generateTranslationFileCode(
    namespace: string,
    strings: ExtractedStringInfo[],
    options: I18nKeyGeneratorOptions,
  ): string {
    let code = '';

    if (options.fileFormat === 'json') {
      code = this.generateJsonTranslationFile(namespace, strings, options);
    } else if (options.fileFormat === 'ts') {
      code = this.generateTypeScriptTranslationFile(namespace, strings, options);
    } else {
      code = this.generateJavaScriptTranslationFile(namespace, strings, options);
    }

    return code;
  }

  /**
   * Generates JSON translation file
   */
  private generateJsonTranslationFile(
    _namespace: string,
    strings: ExtractedStringInfo[],
    _options: I18nKeyGeneratorOptions,
  ): string {
    const translations: Record<string, string> = {};

    for (const strInfo of strings) {
      translations[strInfo.key] = strInfo.text;
    }

    return JSON.stringify(translations, null, 2);
  }

  /**
   * Generates TypeScript translation file
   */
  private generateTypeScriptTranslationFile(
    namespace: string,
    strings: ExtractedStringInfo[],
    _options: I18nKeyGeneratorOptions,
  ): string {
    let code = `// Translations for ${namespace}\n`;
    code += `// Generated at ${new Date().toISOString()}\n\n`;
    code += `export const ${this.toPascalCase(namespace)}Translations = {\n`;

    for (const strInfo of strings) {
      code += `  '${strInfo.key}': '${this.escapeString(strInfo.text)}',\n`;
    }

    code += `} as const;\n\n`;

    // Generate type definition
    code += `export type ${this.toPascalCase(namespace)}TranslationsType = typeof ${this.toPascalCase(namespace)}Translations;\n`;

    return code;
  }

  /**
   * Generates JavaScript translation file
   */
  private generateJavaScriptTranslationFile(
    namespace: string,
    strings: ExtractedStringInfo[],
    _options: I18nKeyGeneratorOptions,
  ): string {
    let code = `// Translations for ${namespace}\n`;
    code += `// Generated at ${new Date().toISOString()}\n\n`;
    code += `export const ${this.toPascalCase(namespace)}Translations = {\n`;

    for (const strInfo of strings) {
      code += `  '${strInfo.key}': '${this.escapeString(strInfo.text)}',\n`;
    }

    code += `};\n`;

    return code;
  }

  /**
   * Generates helper file with key-scoped functions
   */
  private generateHelperFileCode(
    namespace: string,
    strings: ExtractedStringInfo[],
    options: I18nKeyGeneratorOptions,
  ): string {
    const pascalNamespace = this.toPascalCase(namespace);
    let code = '';

    if (options.fileFormat === 'ts') {
      code += `import { ${pascalNamespace}Translations, ${pascalNamespace}TranslationsType } from './${namespace}.translations';\n\n`;
      code += `/**\n`;
      code += ` * Key-scoped translation helpers for ${namespace}\n`;
      code += ` */\n\n`;

      for (const strInfo of strings) {
        const functionName = this.keyToFunctionName(strInfo.key);

        code += `/**\n`;
        code += ` * Translation: ${strInfo.text}\n`;

        if (strInfo.placeholders && strInfo.placeholders.length > 0) {
          code += ` * @param {${this.getPlaceholderTypes(strInfo.placeholders)}} params - Translation parameters\n`;
          for (const placeholder of strInfo.placeholders) {
            code += ` * @param {${this.inferType(placeholder)}} ${this.getParamName(placeholder)} - ${placeholder} parameter\n`;
          }
        }

        code += ` */\n`;

        if (strInfo.placeholders && strInfo.placeholders.length > 0) {
          const params = strInfo.placeholders.map(p => this.getParamName(p)).join(', ');
          code += `export function ${functionName}(${params}: Record<string, string | number>): string {\n`;
          code += `  const t = ${pascalNamespace}Translations['${strInfo.key}'] as string;\n`;
          code += `  let result = t;\n`;
          for (const placeholder of strInfo.placeholders) {
            const paramName = this.getParamName(placeholder);
            code += `  result = result.replace('\\$\\{${placeholder}\\}', String(${paramName}));\n`;
          }
          code += `  return result;\n`;
          code += `}\n\n`;
        } else {
          code += `export function ${functionName}(): string {\n`;
          code += `  return ${pascalNamespace}Translations['${strInfo.key}'] as string;\n`;
          code += `}\n\n`;
        }
      }
    } else {
      // JavaScript version
      code += `import { ${pascalNamespace}Translations } from './${namespace}.translations.js';\n\n`;
      code += `/**\n`;
      code += ` * Key-scoped translation helpers for ${namespace}\n`;
      code += ` */\n\n`;

      for (const strInfo of strings) {
        const functionName = this.keyToFunctionName(strInfo.key);

        code += `/**\n`;
        code += ` * Translation: ${strInfo.text}\n`;

        if (strInfo.placeholders && strInfo.placeholders.length > 0) {
          code += ` * @param {Object} params - Translation parameters\n`;
        }

        code += ` */\n`;

        if (strInfo.placeholders && strInfo.placeholders.length > 0) {
          const params = strInfo.placeholders.map(p => this.getParamName(p)).join(', ');
          code += `export function ${functionName}(${params}) {\n`;
          code += `  let t = ${pascalNamespace}Translations['${strInfo.key}'];\n`;
          code += `  let result = t;\n`;
          for (const placeholder of strInfo.placeholders) {
            const paramName = this.getParamName(placeholder);
            code += `  result = result.replace('\\$\\{${placeholder}\\}', String(${paramName}));\n`;
          }
          code += `  return result;\n`;
          code += `}\n\n`;
        } else {
          code += `export function ${functionName}() {\n`;
          code += `  return ${pascalNamespace}Translations['${strInfo.key}'];\n`;
          code += `}\n\n`;
        }
      }
    }

    return code;
  }

  /**
   * Converts key to function name
   */
  private keyToFunctionName(key: string): string {
    return 't' + this.toPascalCase(key.replace(/\./g, '-'));
  }

  /**
   * Converts string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Escapes string for use in code
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Gets parameter name from placeholder expression
   */
  private getParamName(placeholder: string): string {
    // Extract variable name from expressions like "user.name" or "items.length"
    const firstPart = placeholder.split('.')[0];
    if (!firstPart) return placeholder;
    const parts = firstPart.split(/[\s\[\]]+/);
    return parts[0] ?? firstPart;
  }

  /**
   * Infers type from placeholder expression
   */
  private inferType(placeholder: string): string {
    // Simple type inference
    if (placeholder.includes('.length') || placeholder.includes('.size')) {
      return 'number';
    }
    return 'string | number';
  }

  /**
   * Gets placeholder types for TypeScript
   */
  private getPlaceholderTypes(placeholders: string[]): string {
    const types = placeholders.map(p => this.inferType(p));
    return `Record<string, ${types.join(' | ')}>`;
  }

  /**
   * Calculates translation file path
   */
  private calculateTranslationFilePath(
    sourceFilePath: string,
    namespace: string,
    options: I18nKeyGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const relativePath = path.join(sourceDir, options.outputDirectory);

    let fileName: string;
    if (options.fileFormat === 'json') {
      fileName = `${namespace}.json`;
    } else if (options.fileFormat === 'ts') {
      fileName = `${namespace}.translations.ts`;
    } else {
      fileName = `${namespace}.translations.js`;
    }

    return path.join(relativePath, fileName);
  }

  /**
   * Calculates helper file path
   */
  private calculateHelperFilePath(
    sourceFilePath: string,
    namespace: string,
    options: I18nKeyGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const relativePath = path.join(sourceDir, options.outputDirectory);

    let extension: string;
    if (options.fileFormat === 'ts') {
      extension = '.ts';
    } else {
      extension = '.js';
    }

    return path.join(relativePath, `${namespace}.helpers${extension}`);
  }

  /**
   * Creates the translation file at the specified path
   */
  public async createTranslationFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Translation file created', { filePath });
  }

  /**
   * Creates the helper file at the specified path
   */
  public async createHelperFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Helper file created', { filePath });
  }

  /**
   * Checks if a translation file already exists
   */
  public async translationFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generation options from user
   */
  public async getGeneratorOptions(
    defaultNamespace?: string,
  ): Promise<I18nKeyGeneratorOptions | undefined> {
    // Ask for namespace
    const namespace = await vscode.window.showInputBox({
      prompt: 'Enter i18n namespace',
      placeHolder: 'common',
      value: defaultNamespace || 'common',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Namespace cannot be empty';
        }
        if (!/^[a-z][a-z0-9_-]*$/i.test(value)) {
          return 'Namespace must start with a letter and contain only alphanumeric characters, hyphens, and underscores';
        }
        return null;
      },
    });

    if (!namespace) {
      return undefined;
    }

    // Ask for file format
    const fileFormat = await vscode.window.showQuickPick(
      [
        { label: 'JSON', description: 'Generate JSON translation files', value: 'json' },
        { label: 'TypeScript', description: 'Generate TypeScript translation files', value: 'ts' },
        { label: 'JavaScript', description: 'Generate JavaScript translation files', value: 'js' },
      ],
      {
        placeHolder: 'Select file format',
      },
    );

    if (!fileFormat) {
      return undefined;
    }

    // Ask for output directory
    const outputDirectory = await vscode.window.showInputBox({
      prompt: 'Enter output directory (relative to file)',
      placeHolder: 'locales',
      value: 'locales',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!outputDirectory) {
      return undefined;
    }

    // Ask for key prefix
    const keyPrefix = await vscode.window.showInputBox({
      prompt: 'Enter key prefix (optional)',
      placeHolder: 'app',
      value: '',
    });

    // Note: We don't early return on undefined for optional fields

    // Ask about helpers
    const includeHelpers = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Generate scoped helper functions', value: true },
        { label: 'No', description: 'Only generate translation files', value: false },
      ],
      {
        placeHolder: 'Generate helper functions?',
      },
    );

    if (!includeHelpers) {
      return undefined;
    }

    return {
      baseNamespace: namespace.trim(),
      outputDirectory: outputDirectory.trim(),
      fileFormat: fileFormat.value as 'json' | 'ts' | 'js',
      keyPrefix: keyPrefix?.trim() || '',
      includeHelpers: includeHelpers.value,
      extractFromStrings: true,
      extractFromTemplates: true,
      generateNamespaces: false,
      generateScopedHelpers: true,
    };
  }

  /**
   * Shows preview and gets user confirmation
   */
  public async showPreview(result: I18nGenerationResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.translationFileCode,
      language: result.translationFilePath.endsWith('.json') ? 'json' : 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create Files', description: 'Create translation and helper files', value: 'create' },
        { label: 'Copy to Clipboard', description: 'Copy code to clipboard', value: 'copy' },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this i18n code?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.translationFileCode);
      vscode.window.showInformationMessage('Translation code copied to clipboard!');
      return false;
    }

    return true;
  }
}
