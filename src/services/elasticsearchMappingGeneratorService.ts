import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ElasticsearchMappingGeneratorConfig {
  enabled: boolean;
  includeIndexSettings: boolean;
  includeAnalyzers: boolean;
  includeDynamicTemplates: boolean;
  defaultNumberOfShards: number;
  defaultNumberOfReplicas: number;
  defaultRefreshInterval: string;
  defaultIndexName: string;
}

export interface ElasticsearchFieldMapping {
  type: string;
  index?: boolean;
  store?: boolean;
  analyzer?: string;
  searchAnalyzer?: string;
  norms?: boolean;
  doc_values?: boolean;
  fielddata?: boolean;
  format?: string;
  ignore_above?: number;
  ignore_malformed?: boolean;
  index_options?: string;
  index_phrases?: boolean;
  normalizer?: string;
  scaling_factor?: number;
  boost?: number;
  coerce?: boolean;
  copy_to?: string[];
  fields?: Record<string, ElasticsearchFieldMapping>;
  dynamic?: boolean | 'true' | 'false' | 'strict';
}

export interface ElasticsearchProperty {
  name: string;
  tsType: string;
  isRequired: boolean;
  isArray: boolean;
  isNullable: boolean;
  description?: string;
}

export interface ElasticsearchIndexSettings {
  number_of_shards: number;
  number_of_replicas: number;
  refresh_interval?: string;
  analysis?: {
    analyzer?: Record<string, {
      type?: string;
      tokenizer?: string;
      filter?: string[];
      char_filter?: string[];
    }>;
    tokenizer?: Record<string, {
      type: string;
      [key: string]: unknown;
    }>;
    filter?: Record<string, {
      type: string;
      [key: string]: unknown;
    }>;
    char_filter?: Record<string, {
      type: string;
      [key: string]: unknown;
    }>;
  };
}

export interface ElasticsearchMappingResult {
  indexName: string;
  properties: ElasticsearchProperty[];
  mappingCode: string;
  filePath: string;
  originalCode: string;
  generatedAt: number;
}

/**
 * Service for generating Elasticsearch index mappings from TypeScript interfaces
 * Generates mapping definitions with analyzers, field types, and index settings
 */
export class ElasticsearchMappingGeneratorService {
  private static instance: ElasticsearchMappingGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ElasticsearchMappingGeneratorService {
    ElasticsearchMappingGeneratorService.instance ??= new ElasticsearchMappingGeneratorService();
    return ElasticsearchMappingGeneratorService.instance;
  }

  /**
   * Main entry point: Generates Elasticsearch mapping from selected TypeScript interface
   */
  public async generateMappingFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    config: ElasticsearchMappingGeneratorConfig,
  ): Promise<ElasticsearchMappingResult> {
    const selectedText = document.getText(selection);

    // Parse the interface
    const interfaceInfo = this.parseInterface(selectedText);

    if (!interfaceInfo || interfaceInfo.properties.length === 0) {
      throw new Error(
        'Could not parse interface from selection. Please select a valid TypeScript interface.',
      );
    }

    // Get index name
    const indexName = await this.getIndexName(config.defaultIndexName);
    if (!indexName) {
      throw new Error('Index name is required.');
    }

    // Get index settings if enabled
    const indexSettings = config.includeIndexSettings
      ? await this.getIndexSettings(config)
      : undefined;

    // Generate the mapping code
    const mappingCode = this.generateMappingCode(
      indexName,
      interfaceInfo.properties,
      config,
      indexSettings,
    );

    // Determine file path for the mapping
    const mappingFilePath = this.calculateMappingFilePath(document.fileName, indexName);

    this.logger.info('Elasticsearch mapping generated', {
      indexName,
      propertyCount: interfaceInfo.properties.length,
    });

    return {
      indexName,
      properties: interfaceInfo.properties,
      mappingCode,
      filePath: mappingFilePath,
      originalCode: selectedText,
      generatedAt: Date.now(),
    };
  }

  /**
   * Parses a TypeScript interface to extract property information
   */
  private parseInterface(
    code: string,
  ): { properties: ElasticsearchProperty[] } | null {
    const trimmedCode = code.trim();

    // Match interface declaration: interface Name { ... }
    // Use [^]* instead of .* with /s flag for ES5 compatibility
    const interfaceMatch = trimmedCode.match(/interface\s+(\w+)\s*\{([^}]*)\}/);
    if (!interfaceMatch) {
      // Try to match just the properties part { ... }
      const propertiesMatch = trimmedCode.match(/^\{([^}]*)\}$/);
      if (!propertiesMatch) {
        return null;
      }
      return this.parsePropertiesBlock(propertiesMatch[1] ?? '');
    }

    const propertiesBlock = interfaceMatch[2] ?? '';
    return this.parsePropertiesBlock(propertiesBlock);
  }

  /**
   * Parses properties block to extract property information
   */
  private parsePropertiesBlock(propertiesStr: string): { properties: ElasticsearchProperty[] } | null {
    const properties: ElasticsearchProperty[] = [];

    // Split properties by semicolon, handling nested objects
    const propList = this.smartSplitProperties(propertiesStr);

    for (const prop of propList) {
      const propertyInfo = this.parseProperty(prop);
      if (propertyInfo) {
        properties.push(propertyInfo);
      }
    }

    return { properties };
  }

  /**
   * Parses a single property from an interface
   */
  private parseProperty(prop: string): ElasticsearchProperty | null {
    const trimmed = prop.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) {
      return null;
    }

    // Extract JSDoc comment if present
    let description: string | undefined;
    const jsDocMatch = trimmed.match(/\/\*\*([^*]|\*(?!\/))*\*\/\s*/);
    if (jsDocMatch) {
      const comment = jsDocMatch[0] ?? '';
      const descMatch = comment.match(/\*\s*([^*]*)/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }
    }

    // Remove JSDoc from property for parsing
    const propWithoutComment = trimmed.replace(/\/\*\*([^*]|\*(?!\/))*\*\/\s*/, '');

    // Match: readonly name?: type, or name: type
    const readonlyMatch = propWithoutComment.match(/^readonly\s+(\w+)\s*:\s*(.+)$/);
    const optionalMatch = propWithoutComment.match(/^(\w+)\?\s*:\s*(.+)$/);
    const regularMatch = propWithoutComment.match(/^(\w+)\s*:\s*(.+)$/);

    let name: string;
    let typeExpression: string;
    let isRequired = true;

    if (readonlyMatch) {
      name = readonlyMatch[1] ?? '';
      typeExpression = readonlyMatch[2] ?? '';
    } else if (optionalMatch) {
      name = optionalMatch[1] ?? '';
      typeExpression = optionalMatch[2] ?? '';
      isRequired = false;
    } else if (regularMatch) {
      name = regularMatch[1] ?? '';
      typeExpression = regularMatch[2] ?? '';
    } else {
      return null;
    }

    // Clean up type expression (remove trailing comma, semicolon, comments)
    typeExpression = typeExpression
      .replace(/[;,].*$/, '')
      .replace(/\/\/.*$/, '')
      .trim();

    // Check for array
    const isArray =
      typeExpression.endsWith('[]') ||
      /^Array<.+>$/.test(typeExpression);

    // Check for nullable
    const isNullable = typeExpression.includes('null') || typeExpression.includes('undefined');

    const propertyInfo: ElasticsearchProperty = {
      name,
      tsType: typeExpression,
      isRequired,
      isArray,
      isNullable,
    };

    if (description !== undefined) {
      propertyInfo.description = description;
    }

    return propertyInfo;
  }

  /**
   * Splits properties by semicolon, handling nested objects/arrays
   */
  private smartSplitProperties(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let inComment = false;
    let inBlockComment = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const nextChar = str[i + 1];

      // Handle comments
      if (!inString && !inTemplate) {
        if (char === '/' && nextChar === '/' && !inBlockComment) {
          inComment = true;
          current += char;
          continue;
        }
        if (char === '/' && nextChar === '*' && !inComment) {
          inBlockComment = true;
          current += char;
          continue;
        }
        if (char === '\n' && inComment) {
          inComment = false;
        }
        if (char === '*' && nextChar === '/' && inBlockComment) {
          inBlockComment = false;
          current += char;
          continue;
        }
      }

      if (inComment || inBlockComment) {
        current += char;
        continue;
      }

      // Handle strings and template literals
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || str[i - 1] !== '\\')) {
        if (char === '`') {
          if (!inTemplate) {
            inTemplate = true;
          } else {
            inTemplate = false;
          }
        } else if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString && !inTemplate) {
        if (char === '(' || char === '{' || char === '[' || char === '<') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']' || char === '>') {
          depth--;
        }
      }

      if (char === ';' && depth === 0 && !inString && !inTemplate) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result.filter((s) => s.length > 0);
  }

  /**
   * Gets index name from user
   */
  private async getIndexName(defaultName: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter Elasticsearch index name',
      placeHolder: 'my-index',
      value: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Index name cannot be empty';
        }
        if (!/^[a-z][a-z0-9_-]*$/.test(value)) {
          return 'Index name must be lowercase and can only contain letters, numbers, hyphens, and underscores';
        }
        if (value.length > 255) {
          return 'Index name cannot exceed 255 characters';
        }
        return null;
      },
    });
  }

  /**
   * Gets index settings from user
   */
  private async getIndexSettings(
    config: ElasticsearchMappingGeneratorConfig,
  ): Promise<ElasticsearchIndexSettings> {
    const settings: ElasticsearchIndexSettings = {
      number_of_shards: config.defaultNumberOfShards,
      number_of_replicas: config.defaultNumberOfReplicas,
      refresh_interval: config.defaultRefreshInterval,
    };

    // Ask if user wants to include analysis
    const includeAnalysis = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include custom analyzers', value: true },
        { label: 'No', description: 'Use default analyzers', value: false },
      ],
      { placeHolder: 'Include custom analyzers for text analysis?' },
    );

    if (includeAnalysis?.value && config.includeAnalyzers) {
      settings.analysis = await this.getAnalyzers();
    }

    return settings;
  }

  /**
   * Gets analyzer configuration from user
   */
  private async getAnalyzers(): Promise<ElasticsearchIndexSettings['analysis']> {
    const analysis: ElasticsearchIndexSettings['analysis'] = {
      analyzer: {},
      tokenizer: {},
      filter: {},
      char_filter: {},
    };

    // Add common standard analyzer
    analysis.analyzer!['standard'] = {
      type: 'standard',
    };

    // Add whitespace analyzer
    analysis.analyzer!['whitespace'] = {
      type: 'whitespace',
    };

    // Add keyword analyzer
    analysis.analyzer!['keyword'] = {
      type: 'keyword',
    };

    return analysis;
  }

  /**
   * Converts TypeScript type to Elasticsearch field mapping
   */
  private tsTypeToEsMapping(
    tsType: string,
    property: ElasticsearchProperty,
  ): ElasticsearchFieldMapping {
    // Remove array/optional markers
    const baseType = tsType
      .replace(/\[\]$/, '')
      .replace(/^Array<.+>$/, '')
      .replace(/\?$/, '')
      .replace(/\s*\|\s*null/g, '')
      .replace(/\s*\|\s*undefined/g, '')
      .trim()
      .toLowerCase();

    // Initialize with required type field
    const mapping: ElasticsearchFieldMapping = {
      type: 'text',
    };

    // Map TypeScript types to Elasticsearch field types
    switch (baseType) {
      case 'string':
        mapping.type = property.isArray ? 'text' : 'text';
        // Add keyword sub-field for string types
        mapping.fields = {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        };
        break;
      case 'number':
      case 'int':
      case 'integer':
        mapping.type = 'integer';
        break;
      case 'float':
      case 'double':
        mapping.type = 'double';
        break;
      case 'bigint':
      case 'long':
        mapping.type = 'long';
        break;
      case 'short':
        mapping.type = 'short';
        break;
      case 'byte':
        mapping.type = 'byte';
        break;
      case 'boolean':
      case 'bool':
        mapping.type = 'boolean';
        break;
      case 'date':
        mapping.type = 'date';
        mapping.format = 'strict_date_optional_time||epoch_millis';
        break;
      case 'object':
        mapping.type = 'object';
        mapping.dynamic = true;
        break;
      case 'uuid':
      case 'id':
        mapping.type = 'keyword';
        break;
      case 'url':
      case 'email':
        mapping.type = 'keyword';
        break;
      case 'any':
      default:
        mapping.type = 'text';
        mapping.fields = {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        };
        break;
    }

    // Handle array types
    if (property.isArray) {
      // Elasticsearch doesn't require special array handling
      // Arrays are handled automatically
    }

    return mapping;
  }

  /**
   * Generates Elasticsearch mapping code
   */
  private generateMappingCode(
    indexName: string,
    properties: ElasticsearchProperty[],
    config: ElasticsearchMappingGeneratorConfig,
    indexSettings?: ElasticsearchIndexSettings,
  ): string {
    const mapping: Record<string, unknown> = {};

    // Add index settings if provided
    if (indexSettings) {
      const settings: Record<string, unknown> = {};
      settings.number_of_shards = indexSettings.number_of_shards;
      settings.number_of_replicas = indexSettings.number_of_replicas;

      if (indexSettings.refresh_interval) {
        settings.refresh_interval = indexSettings.refresh_interval;
      }

      if (indexSettings.analysis) {
        settings.analysis = indexSettings.analysis;
      }

      mapping.settings = settings;
    }

    // Add mappings
    const mappingsObj: Record<string, unknown> = {
      properties: {},
    };

    // Generate property mappings
    for (const prop of properties) {
      const esMapping = this.tsTypeToEsMapping(prop.tsType, prop);
      (mappingsObj.properties as Record<string, unknown>)[prop.name] = esMapping;
    }

    mapping.mappings = mappingsObj;

    // Format as JSON with proper indentation
    return JSON.stringify(mapping, null, 2);
  }

  /**
   * Calculates the file path for the generated mapping
   */
  private calculateMappingFilePath(sourceFilePath: string, indexName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const mappingFileName = `${indexName}.mapping.json`;
    return path.join(sourceDir, mappingFileName);
  }

  /**
   * Creates the mapping file at the specified path
   */
  public async createMappingFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write mapping file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Elasticsearch mapping file created', { filePath });
  }

  /**
   * Gets generation options from user
   */
  public async getGenerationOptions(
    defaultIndexName?: string,
  ): Promise<ElasticsearchMappingGeneratorConfig | undefined> {
    const indexName = await vscode.window.showInputBox({
      prompt: 'Enter Elasticsearch index name',
      placeHolder: 'my-index',
      value: defaultIndexName || 'my-index',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Index name cannot be empty';
        }
        if (!/^[a-z][a-z0-9_-]*$/.test(value)) {
          return 'Index name must be lowercase';
        }
        return null;
      },
    });

    if (!indexName) {
      return undefined;
    }

    const includeIndexSettings = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include index settings', value: true },
        { label: 'No', description: 'Skip index settings', value: false },
      ],
      { placeHolder: 'Include index settings?' },
    );

    if (!includeIndexSettings) {
      return undefined;
    }

    return {
      enabled: true,
      includeIndexSettings: includeIndexSettings.value,
      includeAnalyzers: true,
      includeDynamicTemplates: false,
      defaultNumberOfShards: 1,
      defaultNumberOfReplicas: 1,
      defaultRefreshInterval: '1s',
      defaultIndexName: indexName.trim(),
    };
  }

  /**
   * Shows mapping preview and gets user confirmation
   */
  public async showMappingPreview(result: ElasticsearchMappingResult): Promise<boolean> {
    const document = await vscode.workspace.openTextDocument({
      content: result.mappingCode,
      language: 'json',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Create File', description: 'Create a new mapping file', value: 'create' },
        {
          label: 'Copy to Clipboard',
          description: 'Copy mapping code to clipboard',
          value: 'copy',
        },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this mapping?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(result.mappingCode);
      vscode.window.showInformationMessage('Elasticsearch mapping code copied to clipboard!');
      return false;
    }

    return true;
  }
}
