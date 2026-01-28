import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface MongoAggregationStage {
  name: string;
  operator: string;
  code: string;
  description?: string;
}

export interface MongoAggregationField {
  name: string;
  type: string;
  path: string;
  isRequired: boolean;
}

export interface MongoAggregationBuilderConfig {
  enabled: boolean;
  includeComments: boolean;
  includeTypeScriptTypes: boolean;
  defaultOutputPath: string;
  generatePipelineBuilder: boolean;
  generateHelperMethods: boolean;
}

export interface MongoAggregationResult {
  pipelineCode: string;
  builderCode: string;
  stages: MongoAggregationStage[];
  fields: MongoAggregationField[];
  collectionName: string;
}

/**
 * Service for building MongoDB aggregation pipelines with type safety
 */
export class MongoAggregationBuilderService {
  private static instance: MongoAggregationBuilderService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): MongoAggregationBuilderService {
    MongoAggregationBuilderService.instance ??= new MongoAggregationBuilderService();
    return MongoAggregationBuilderService.instance;
  }

  /**
   * Main entry point: Builds MongoDB aggregation pipeline from user input
   */
  public async buildAggregation(
    workspacePath: string,
    config: MongoAggregationBuilderConfig,
  ): Promise<MongoAggregationResult | null> {
    // Get collection name
    const collectionName = await this.getCollectionName();
    if (!collectionName) {
      return null;
    }

    // Collect fields for type safety
    const fields = await this.collectFields();

    // Build aggregation stages
    const stages = await this.collectStages();

    if (!stages || stages.length === 0) {
      vscode.window.showWarningMessage('No stages defined. Aggregation builder cancelled.');
      return null;
    }

    // Generate pipeline code
    const pipelineCode = this.generatePipelineCode(collectionName, stages, fields, config);

    // Generate builder code if enabled
    const builderCode = config.generatePipelineBuilder
      ? this.generateBuilderCode(collectionName, stages, fields, config)
      : '';

    this.logger.info('MongoDB aggregation pipeline built', {
      collectionName,
      stageCount: stages.length,
      fieldCount: fields.length,
    });

    return {
      pipelineCode,
      builderCode,
      stages,
      fields,
      collectionName,
    };
  }

  /**
   * Gets the collection name from user input
   */
  private async getCollectionName(): Promise<string | undefined> {
    const collectionName = await vscode.window.showInputBox({
      prompt: 'Enter MongoDB collection name',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Collection name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
          return 'Collection name must start with a letter and contain only letters, numbers, and underscores';
        }
        return null;
      },
    });

    return collectionName?.trim();
  }

  /**
   * Collects fields for type-safe aggregation
   */
  private async collectFields(): Promise<MongoAggregationField[]> {
    const fields: MongoAggregationField[] = [];

    let addMore = true;
    while (addMore) {
      const field = await this.createField();
      if (field) {
        fields.push(field);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another field', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another field or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return fields;
  }

  /**
   * Creates a single field definition
   */
  private async createField(): Promise<MongoAggregationField | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter field name (e.g., name, email, age)',
      placeHolder: 'name',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Field name cannot be empty';
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(value)) {
          return 'Field name must start with a letter or underscore';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const fieldName = nameInput.trim();

    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'String', value: 'string', description: 'Text data' },
        { label: 'Number', value: 'number', description: 'Numeric data' },
        { label: 'Boolean', value: 'boolean', description: 'True/false' },
        { label: 'Date', value: 'Date', description: 'Date and time' },
        { label: 'ObjectId', value: 'ObjectId', description: 'MongoDB ObjectId' },
        { label: 'Array', value: 'Array', description: 'Array of values' },
        { label: 'Object', value: 'object', description: 'Nested object' },
        { label: 'any', value: 'any', description: 'Any type' },
      ],
      { placeHolder: 'Select field type' },
    );

    if (!typeChoice) {
      return null;
    }

    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: true },
        { label: 'Optional', value: false },
      ],
      { placeHolder: 'Is this field required?' },
    );

    const isRequired = requiredChoice?.value ?? false;

    return {
      name: fieldName,
      type: typeChoice.value,
      path: fieldName,
      isRequired,
    };
  }

  /**
   * Collects aggregation stages
   */
  private async collectStages(): Promise<MongoAggregationStage[]> {
    const stages: MongoAggregationStage[] = [];

    const availableStages = [
      { label: '$match - Filter documents', value: '$match', description: 'Filter documents' },
      { label: '$group - Group documents', value: '$group', description: 'Group documents' },
      { label: '$sort - Sort documents', value: '$sort', description: 'Sort documents' },
      { label: '$project - Reshape documents', value: '$project', description: 'Reshape documents' },
      { label: '$limit - Limit results', value: '$limit', description: 'Limit results' },
      { label: '$skip - Skip documents', value: '$skip', description: 'Skip documents' },
      { label: '$lookup - Join collection', value: '$lookup', description: 'Join collection' },
      { label: '$unwind - Unwind arrays', value: '$unwind', description: 'Unwind arrays' },
      {
        label: '$addFields - Add computed fields',
        value: '$addFields',
        description: 'Add computed fields',
      },
      { label: '$count - Count documents', value: '$count', description: 'Count documents' },
      {
        label: '$facet - Multiple pipelines',
        value: '$facet',
        description: 'Create multiple pipelines',
      },
      {
        label: '$bucket - Categorize documents',
        value: '$bucket',
        description: 'Categorize documents',
      },
      {
        label: '$bucketAuto - Auto categorize',
        value: '$bucketAuto',
        description: 'Automatically categorize documents',
      },
      {
        label: '$replaceRoot - Replace document',
        value: '$replaceRoot',
        description: 'Replace document with nested document',
      },
      { label: '$redact - Restrict content', value: '$redact', description: 'Restrict content' },
      { label: '$sample - Sample documents', value: '$sample', description: 'Sample random documents' },
    ];

    let addMore = true;
    while (addMore) {
      const stageChoice = await vscode.window.showQuickPick(availableStages, {
        placeHolder: 'Select aggregation stage',
      });

      if (!stageChoice) {
        addMore = false;
        continue;
      }

      const stage = await this.buildStage(stageChoice.value, stageChoice.description);
      if (stage) {
        stages.push(stage);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another stage', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another stage or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return stages;
  }

  /**
   * Builds a single aggregation stage
   */
  private async buildStage(
    operator: string,
    description: string | undefined,
  ): Promise<MongoAggregationStage | null> {
    let code = '';
    let stageName = operator;

    switch (operator) {
      case '$match':
        code = await this.buildMatchStage();
        break;
      case '$group':
        code = await this.buildGroupStage();
        break;
      case '$sort':
        code = await this.buildSortStage();
        break;
      case '$project':
        code = await this.buildProjectStage();
        break;
      case '$limit':
        code = await this.buildLimitStage();
        break;
      case '$skip':
        code = await this.buildSkipStage();
        break;
      case '$lookup':
        code = await this.buildLookupStage();
        break;
      case '$unwind':
        code = await this.buildUnwindStage();
        break;
      case '$addFields':
        code = await this.buildAddFieldsStage();
        break;
      case '$count':
        code = await this.buildCountStage();
        break;
      case '$facet':
        code = await this.buildFacetStage();
        break;
      case '$bucket':
        code = await this.buildBucketStage();
        break;
      case '$bucketAuto':
        code = await this.buildBucketAutoStage();
        break;
      case '$replaceRoot':
        code = await this.buildReplaceRootStage();
        break;
      case '$sample':
        code = await this.buildSampleStage();
        break;
      default:
        code = '{}';
    }

    if (!code) {
      return null;
    }

    return {
      name: stageName,
      operator,
      code,
      description,
    };
  }

  /**
   * Builds $match stage
   */
  private async buildMatchStage(): Promise<string> {
    const field = await vscode.window.showInputBox({
      prompt: 'Enter field name to match',
      placeHolder: 'status',
    });

    if (!field) {
      return '';
    }

    const operatorChoice = await vscode.window.showQuickPick(
      [
        { label: '$eq - Equal', value: '$eq' },
        { label: '$ne - Not equal', value: '$ne' },
        { label: '$gt - Greater than', value: '$gt' },
        { label: '$gte - Greater or equal', value: '$gte' },
        { label: '$lt - Less than', value: '$lt' },
        { label: '$lte - Less or equal', value: '$lte' },
        { label: '$in - In array', value: '$in' },
        { label: '$nin - Not in array', value: '$nin' },
        { label: '$and - Logical AND', value: '$and' },
        { label: '$or - Logical OR', value: '$or' },
        { label: 'Direct value (no operator)', value: 'direct' },
      ],
      { placeHolder: 'Select comparison operator' },
    );

    if (!operatorChoice) {
      return '';
    }

    let value: string;
    if (operatorChoice.value === 'direct') {
      value = await vscode.window.showInputBox({
        prompt: 'Enter value',
        placeHolder: '"active"',
      }) ?? '""';
    } else {
      value = await vscode.window.showInputBox({
        prompt: 'Enter value to compare',
        placeHolder: '"active"',
      }) ?? '""';
    }

    if (operatorChoice.value === 'direct') {
      return `  { ${field}: ${value} }`;
    }
    return `  { ${field}: { ${operatorChoice.value}: ${value} } }`;
  }

  /**
   * Builds $group stage
   */
  private async buildGroupStage(): Promise<string> {
    const idField = await vscode.window.showInputBox({
      prompt: 'Enter field to group by (or _id for no grouping)',
      placeHolder: '$category',
    });

    if (!idField) {
      return '';
    }

    const addAccumulator = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      { placeHolder: 'Add accumulator fields?' },
    );

    let accumulators = '';
    if (addAccumulator?.value) {
      const accumulatorChoice = await vscode.window.showQuickPick(
        [
          { label: '$sum - Sum values', value: '$sum' },
          { label: '$avg - Average values', value: '$avg' },
          { label: '$min - Minimum value', value: '$min' },
          { label: '$max - Maximum value', value: '$max' },
          { label: '$first - First value', value: '$first' },
          { label: '$last - Last value', value: '$last' },
          { label: '$push - Array of values', value: '$push' },
          { label: '$addToSet - Array of unique values', value: '$addToSet' },
        ],
        { placeHolder: 'Select accumulator operator' },
      );

      if (accumulatorChoice) {
        const outputField = await vscode.window.showInputBox({
          prompt: 'Enter output field name',
          placeHolder: 'total',
        });

        const inputField = await vscode.window.showInputBox({
          prompt: 'Enter input field',
          placeHolder: '$amount',
        });

        if (outputField && inputField) {
          accumulators = `\n    ${outputField}: { ${accumulatorChoice.value}: ${inputField} },`;
        }
      }
    }

    return `  { _id: ${idField},${accumulators}\n  }`;
  }

  /**
   * Builds $sort stage
   */
  private async buildSortStage(): Promise<string> {
    const field = await vscode.window.showInputBox({
      prompt: 'Enter field to sort by',
      placeHolder: 'createdAt',
    });

    if (!field) {
      return '';
    }

    const orderChoice = await vscode.window.showQuickPick(
      [
        { label: 'Ascending (1)', value: '1' },
        { label: 'Descending (-1)', value: '-1' },
      ],
      { placeHolder: 'Select sort order' },
    );

    if (!orderChoice) {
      return '';
    }

    return `  { ${field}: ${orderChoice.value} }`;
  }

  /**
   * Builds $project stage
   */
  private async buildProjectStage(): Promise<string> {
    const includeFields = await vscode.window.showInputBox({
      prompt: 'Enter fields to include (comma-separated)',
      placeHolder: 'name, email, status',
    });

    if (!includeFields) {
      return '';
    }

    const fields = includeFields.split(',').map((f) => f.trim());
    const fieldObj = fields.map((f) => `    ${f}: 1`).join(',\n');

    return `  {\n${fieldObj}\n  }`;
  }

  /**
   * Builds $limit stage
   */
  private async buildLimitStage(): Promise<string> {
    const limit = await vscode.window.showInputBox({
      prompt: 'Enter limit',
      placeHolder: '10',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid positive number';
        }
        return null;
      },
    });

    if (!limit) {
      return '';
    }

    return `  ${limit}`;
  }

  /**
   * Builds $skip stage
   */
  private async buildSkipStage(): Promise<string> {
    const skip = await vscode.window.showInputBox({
      prompt: 'Enter number to skip',
      placeHolder: '0',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid positive number';
        }
        return null;
      },
    });

    if (!skip) {
      return '';
    }

    return `  ${skip}`;
  }

  /**
   * Builds $lookup stage
   */
  private async buildLookupStage(): Promise<string> {
    const from = await vscode.window.showInputBox({
      prompt: 'Enter collection to join',
      placeHolder: 'users',
    });

    if (!from) {
      return '';
    }

    const localField = await vscode.window.showInputBox({
      prompt: 'Enter local field',
      placeHolder: 'userId',
    });

    if (!localField) {
      return '';
    }

    const foreignField = await vscode.window.showInputBox({
      prompt: 'Enter foreign field',
      placeHolder: '_id',
    });

    if (!foreignField) {
      return '';
    }

    const as = await vscode.window.showInputBox({
      prompt: 'Enter output array field name',
      placeHolder: 'user',
    });

    if (!as) {
      return '';
    }

    return `  {
    from: '${from}',
    localField: '${localField}',
    foreignField: '${foreignField}',
    as: '${as}'
  }`;
  }

  /**
   * Builds $unwind stage
   */
  private async buildUnwindStage(): Promise<string> {
    const field = await vscode.window.showInputBox({
      prompt: 'Enter array field to unwind',
      placeHolder: 'items',
    });

    if (!field) {
      return '';
    }

    return `  '$${field}'`;
  }

  /**
   * Builds $addFields stage
   */
  private async buildAddFieldsStage(): Promise<string> {
    const fieldName = await vscode.window.showInputBox({
      prompt: 'Enter new field name',
      placeHolder: 'fullName',
    });

    if (!fieldName) {
      return '';
    }

    const expression = await vscode.window.showInputBox({
      prompt: 'Enter field expression',
      placeHolder: '{ $concat: ["$firstName", " ", "$lastName"] }',
    });

    if (!expression) {
      return '';
    }

    return `  {\n    ${fieldName}: ${expression}\n  }`;
  }

  /**
   * Builds $count stage
   */
  private async buildCountStage(): Promise<string> {
    const fieldName = await vscode.window.showInputBox({
      prompt: 'Enter count field name',
      placeHolder: 'total',
    });

    if (!fieldName) {
      return '';
    }

    return `  '${fieldName}'`;
  }

  /**
   * Builds $facet stage
   */
  private async buildFacetStage(): Promise<string> {
    return `  {
    // Define multiple pipelines here
    pipeline1: [],
    pipeline2: []
  }`;
  }

  /**
   * Builds $bucket stage
   */
  private async buildBucketStage(): Promise<string> {
    const groupBy = await vscode.window.showInputBox({
      prompt: 'Enter field to bucket by',
      placeHolder: '$price',
    });

    if (!groupBy) {
      return '';
    }

    const boundaries = await vscode.window.showInputBox({
      prompt: 'Enter bucket boundaries (comma-separated)',
      placeHolder: '0, 50, 100, 200',
    });

    if (!boundaries) {
      return '';
    }

    const defaultBucket = await vscode.window.showInputBox({
      prompt: 'Enter default bucket name',
      placeHolder: 'Other',
    });

    if (!defaultBucket) {
      return '';
    }

    return `  {
    groupBy: ${groupBy},
    boundaries: [${boundaries}],
    default: '${defaultBucket}'
  }`;
  }

  /**
   * Builds $bucketAuto stage
   */
  private async buildBucketAutoStage(): Promise<string> {
    const groupBy = await vscode.window.showInputBox({
      prompt: 'Enter field to bucket by',
      placeHolder: '$price',
    });

    if (!groupBy) {
      return '';
    }

    const buckets = await vscode.window.showInputBox({
      prompt: 'Enter number of buckets',
      placeHolder: '5',
    });

    if (!buckets) {
      return '';
    }

    const output = await vscode.window.showInputBox({
      prompt: 'Enter output field name',
      placeHolder: 'bucket',
    });

    if (!output) {
      return '';
    }

    return `  {
    groupBy: ${groupBy},
    buckets: ${buckets},
    output: {
      ${output}: '$_id'
    }
  }`;
  }

  /**
   * Builds $replaceRoot stage
   */
  private async buildReplaceRootStage(): Promise<string> {
    const newRoot = await vscode.window.showInputBox({
      prompt: 'Enter new root document',
      placeHolder: '$nested',
    });

    if (!newRoot) {
      return '';
    }

    return `  { newRoot: ${newRoot} }`;
  }

  /**
   * Builds $sample stage
   */
  private async buildSampleStage(): Promise<string> {
    const size = await vscode.window.showInputBox({
      prompt: 'Enter sample size',
      placeHolder: '10',
    });

    if (!size) {
      return '';
    }

    return `  { size: ${size} }`;
  }

  /**
   * Generates pipeline code
   */
  private generatePipelineCode(
    collectionName: string,
    stages: MongoAggregationStage[],
    fields: MongoAggregationField[],
    config: MongoAggregationBuilderConfig,
  ): string {
    let code = '';

    // Add header
    if (config.includeComments) {
      code += `/**\n`;
      code += ` * MongoDB Aggregation Pipeline for ${collectionName}\n`;
      code += ` * Generated with type safety\n`;
      code += ` */\n\n`;
    }

    // Generate interface for document type
    if (config.includeTypeScriptTypes) {
      code += this.generateDocumentInterface(collectionName, fields);
    }

    // Generate pipeline array
    code += `const pipeline: Array<Record<string, any>> = [\n`;

    for (const stage of stages) {
      if (config.includeComments && stage.description) {
        code += `  // ${stage.description}\n`;
      }
      code += `  { '${stage.operator}':\n${stage.code}\n  },\n\n`;
    }

    code += `];\n\n`;

    // Generate execution code
    code += `const result = await db.collection('${collectionName}').aggregate(pipeline).toArray();\n`;

    return code;
  }

  /**
   * Generates document interface for type safety
   */
  private generateDocumentInterface(
    collectionName: string,
    fields: MongoAggregationField[],
  ): string {
    let code = `interface ${this.capitalize(collectionName)}Document {\n`;
    code += `  _id: ObjectId;\n`;

    for (const field of fields) {
      const optional = field.isRequired ? '' : '?';
      code += `  ${field.name}${optional}: ${field.type};\n`;
    }

    code += `}\n\n`;

    return code;
  }

  /**
   * Generates builder class for chaining aggregation stages
   */
  private generateBuilderCode(
    collectionName: string,
    stages: MongoAggregationStage[],
    fields: MongoAggregationField[],
    config: MongoAggregationBuilderConfig,
  ): string {
    const className = `${this.capitalize(collectionName)}AggregationBuilder`;

    let code = '';

    if (config.includeComments) {
      code += `/**\n`;
      code += ` * Aggregation builder for ${collectionName}\n`;
      code += ` * Provides type-safe methods for building aggregation pipelines\n`;
      code += ` */\n`;
    }

    code += `class ${className} {\n`;
    code += `  private pipeline: Array<Record<string, any>> = [];\n\n`;

    // Generate methods for each stage type
    const stageMethods = this.generateStageMethods(className);
    code += stageMethods;

    // Generate exec method
    code += `  async exec(db: Db): Promise<any[]> {\n`;
    code += `    return db.collection('${collectionName}').aggregate(this.pipeline).toArray();\n`;
    code += `  }\n\n`;

    code += `  getPipeline(): Array<Record<string, any>> {\n`;
    code += `    return this.pipeline;\n`;
    code += `  }\n`;

    code += `}\n\n`;

    // Generate usage example
    code += `// Usage example:\n`;
    code += `// const builder = new ${className}();\n`;
    code += `// const result = await builder.exec(db);\n`;

    return code;
  }

  /**
   * Generates stage methods for builder
   */
  private generateStageMethods(className: string): string {
    let code = '';

    const methods = [
      {
        name: 'match',
        description: 'Filter documents',
        params: 'filter: Record<string, any>',
        stage: '$match',
      },
      {
        name: 'group',
        description: 'Group documents',
        params: 'group: Record<string, any>',
        stage: '$group',
      },
      {
        name: 'sort',
        description: 'Sort documents',
        params: 'sort: Record<string, 1 | -1>',
        stage: '$sort',
      },
      {
        name: 'project',
        description: 'Reshape documents',
        params: 'projection: Record<string, any>',
        stage: '$project',
      },
      {
        name: 'limit',
        description: 'Limit results',
        params: 'n: number',
        stage: '$limit',
      },
      {
        name: 'skip',
        description: 'Skip documents',
        params: 'n: number',
        stage: '$skip',
      },
      {
        name: 'lookup',
        description: 'Join collection',
        params: 'lookup: { from: string; localField: string; foreignField: string; as: string }',
        stage: '$lookup',
      },
      {
        name: 'unwind',
        description: 'Unwind arrays',
        params: 'path: string',
        stage: '$unwind',
      },
      {
        name: 'addFields',
        description: 'Add computed fields',
        params: 'fields: Record<string, any>',
        stage: '$addFields',
      },
      {
        name: 'count',
        description: 'Count documents',
        params: 'field: string',
        stage: '$count',
      },
    ];

    for (const method of methods) {
      code += `  /**\n`;
      code += `   * ${method.description}\n`;
      code += `   */\n`;
      code += `  ${method.name}(${method.params}): ${className} {\n`;
      code += `    this.pipeline.push({ '${method.stage}`;

      if (method.params.includes('Record')) {
        code += `': ${method.name === 'lookup' ? '{ ...lookup }' : `{ ...${method.name} }`});\n`;
      } else {
        code += `': ${method.name} });\n`;
      }

      code += `    return this;\n`;
      code += `  }\n\n`;
    }

    return code;
  }

  /**
   * Capitalizes first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the aggregation file at the specified path
   */
  public async createAggregationFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write aggregation file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('MongoDB aggregation file created', { filePath });
  }

  /**
   * Gets builder config from user
   */
  public async getBuilderConfig(): Promise<MongoAggregationBuilderConfig | undefined> {
    const includeTypes = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include TypeScript types', value: true },
        { label: 'No', description: 'Skip TypeScript types', value: false },
      ],
      { placeHolder: 'Include TypeScript types for type safety?' },
    );

    if (!includeTypes) {
      return undefined;
    }

    const generateBuilder = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Generate builder class', value: true },
        { label: 'No', description: 'Skip builder class', value: false },
      ],
      { placeHolder: 'Generate aggregation builder class?' },
    );

    if (!generateBuilder) {
      return undefined;
    }

    return {
      enabled: true,
      includeComments: true,
      includeTypeScriptTypes: includeTypes.value,
      defaultOutputPath: './aggregations',
      generatePipelineBuilder: generateBuilder.value,
      generateHelperMethods: true,
    };
  }

  /**
   * Shows aggregation preview and gets user confirmation
   */
  public async showAggregationPreview(result: MongoAggregationResult): Promise<boolean> {
    const fullCode = result.builderCode ? result.builderCode + '\n\n' + result.pipelineCode : result.pipelineCode;

    const document = await vscode.workspace.openTextDocument({
      content: fullCode,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Save File', description: 'Save aggregation to file', value: 'save' },
        { label: 'Copy to Clipboard', description: 'Copy code to clipboard', value: 'copy' },
        { label: 'Cancel', description: 'Cancel the operation', value: 'cancel' },
      ],
      {
        placeHolder: 'What would you like to do with this aggregation?',
      },
    );

    if (!choice || choice.value === 'cancel') {
      return false;
    }

    if (choice.value === 'copy') {
      await vscode.env.clipboard.writeText(fullCode);
      vscode.window.showInformationMessage('Aggregation code copied to clipboard!');
      return false;
    }

    return true;
  }
}
