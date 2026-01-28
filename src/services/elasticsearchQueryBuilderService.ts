import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

/**
 * Represents an Elasticsearch query clause
 */
export interface QueryClause {
  type: 'match' | 'term' | 'terms' | 'range' | 'bool' | 'exists' | 'prefix' | 'wildcard' | 'regexp';
  field?: string;
  value?: any;
  operator?: 'and' | 'or';
  boost?: number;
  clauses?: QueryClause[];
}

/**
 * Represents a filter condition
 */
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value?: any;
  values?: any[];
}

/**
 * Represents a sort option
 */
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
  mode?: 'min' | 'max' | 'sum' | 'avg' | 'median';
  nestedPath?: string;
  nestedFilter?: QueryClause;
}

/**
 * Represents pagination options
 */
export interface PaginationOptions {
  from: number;
  size: number;
  searchAfter?: any[];
}

/**
 * Represents an aggregation
 */
export interface Aggregation {
  name: string;
  type:
    | 'terms'
    | 'range'
    | 'date_range'
    | 'histogram'
    | 'date_histogram'
    | 'stats'
    | 'extended_stats'
    | 'cardinality'
    | 'avg'
    | 'sum'
    | 'min'
    | 'max'
    | 'filter'
    | 'nested'
    | 'reverse_nested'
    | 'top_hits';
  field?: string;
  script?: string;
  size?: number;
  order?: { field: string; order: 'asc' | 'desc' };
  ranges?: { from?: number | string; to?: number | string; key?: string }[];
  interval?: number | string;
  format?: string;
  minDocCount?: number;
  aggregations?: Aggregation[];
  filter?: QueryClause;
  nestedPath?: string;
}

/**
 * Represents field configuration for source filtering
 */
export interface SourceConfig {
  includes?: string[];
  excludes?: string[];
}

/**
 * Elasticsearch query builder options
 */
export interface ElasticsearchQueryBuilderOptions {
  index: string;
  query?: QueryClause;
  filters?: FilterCondition[];
  sort?: SortOption[];
  pagination?: PaginationOptions;
  aggregations?: Aggregation[];
  source?: SourceConfig;
  trackTotalHits?: boolean | number;
  timeout?: string;
  minimizeScoring?: boolean;
}

/**
 * Generated Elasticsearch query
 */
export interface GeneratedElasticsearchQuery {
  index: string;
  query: Record<string, any>;
  queryType: 'search' | 'count' | 'aggregate';
  description: string;
}

/**
 * Service for building typed Elasticsearch queries with aggregations
 */
export class ElasticsearchQueryBuilderService {
  private static instance: ElasticsearchQueryBuilderService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ElasticsearchQueryBuilderService {
    ElasticsearchQueryBuilderService.instance ??= new ElasticsearchQueryBuilderService();
    return ElasticsearchQueryBuilderService.instance;
  }

  /**
   * Main entry point: Builds an Elasticsearch query from options
   */
  public async buildQuery(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ElasticsearchQueryBuilderOptions,
  ): Promise<GeneratedElasticsearchQuery> {
    const selectedText = document.getText(selection);

    // If there's selected text, try to parse it as existing query or TypeScript
    if (selectedText.trim()) {
      this.logger.info('Parsing selected text for Elasticsearch query', {
        textLength: selectedText.length,
      });
    }

    // Determine query type based on options
    const queryType = this.determineQueryType(options);

    // Build the query
    const query = this.buildQueryObject(options, queryType);

    this.logger.info('Elasticsearch query built', {
      index: options.index,
      queryType,
    });

    return {
      index: options.index,
      query,
      queryType,
      description: this.generateDescription(options, queryType),
    };
  }

  /**
   * Determines the query type based on options
   */
  private determineQueryType(options: ElasticsearchQueryBuilderOptions): 'search' | 'count' | 'aggregate' {
    if (options.aggregations && options.aggregations.length > 0) {
      return 'aggregate';
    }
    if (options.pagination === undefined || options.pagination.size === 0) {
      return 'count';
    }
    return 'search';
  }

  /**
   * Builds the query object
   */
  private buildQueryObject(
    options: ElasticsearchQueryBuilderOptions,
    queryType: 'search' | 'count' | 'aggregate',
  ): Record<string, any> {
    const queryObj: Record<string, any> = {};

    // Add query
    if (options.query || options.filters?.length) {
      queryObj.query = this.buildQueryClause(options);
    }

    // Add aggregations if present
    if (options.aggregations && options.aggregations.length > 0) {
      queryObj.aggs = {};
      for (const agg of options.aggregations) {
        queryObj.aggs[agg.name] = this.buildAggregation(agg);
      }
    }

    // Add sort if present and not count query
    if (options.sort && options.sort.length > 0 && queryType !== 'count') {
      queryObj.sort = options.sort.map((s) => this.buildSortOption(s));
    }

    // Add pagination if present and not count query
    if (options.pagination && queryType !== 'count') {
      queryObj.from = options.pagination.from;
      queryObj.size = options.pagination.size;
      if (options.pagination.searchAfter) {
        queryObj.search_after = options.pagination.searchAfter;
      }
    }

    // Add source filtering
    if (options.source) {
      queryObj._source = {};
      if (options.source.includes) {
        queryObj._source.includes = options.source.includes;
      }
      if (options.source.excludes) {
        queryObj._source.excludes = options.source.excludes;
      }
    }

    // Add track total hits
    if (options.trackTotalHits !== undefined) {
      queryObj.track_total_hits = options.trackTotalHits;
    }

    // Add timeout
    if (options.timeout) {
      queryObj.timeout = options.timeout;
    }

    // Add minimize scoring
    if (options.minimizeScoring) {
      queryObj.min_score = 0.001;
    }

    // For count queries, limit size
    if (queryType === 'count') {
      queryObj.size = 0;
    }

    return queryObj;
  }

  /**
   * Builds the main query clause
   */
  private buildQueryClause(options: ElasticsearchQueryBuilderOptions): Record<string, any> {
    const must: Record<string, any>[] = [];
    const filter: Record<string, any>[] = [];
    const should: Record<string, any>[] = [];
    const mustNot: Record<string, any>[] = [];

    // Add main query
    if (options.query) {
      const clause = this.buildQueryClauseObject(options.query);
      must.push(clause);
    }

    // Add filters
    if (options.filters) {
      for (const cond of options.filters) {
        const filterClause = this.buildFilterCondition(cond);
        filter.push(filterClause);
      }
    }

    // Build bool query if we have any clauses
    if (must.length === 0 && filter.length === 0 && should.length === 0 && mustNot.length === 0) {
      return { match_all: {} };
    }

    const boolQuery: Record<string, any> = {};
    if (must.length > 0) {
      boolQuery.must = must;
    }
    if (filter.length > 0) {
      boolQuery.filter = filter;
    }
    if (should.length > 0) {
      boolQuery.should = should;
    }
    if (mustNot.length > 0) {
      boolQuery.must_not = mustNot;
    }

    return { bool: boolQuery };
  }

  /**
   * Builds a query clause object
   */
  private buildQueryClauseObject(clause: QueryClause): Record<string, any> {
    const baseClause: Record<string, any> = {};

    if (clause.boost !== undefined) {
      baseClause.boost = clause.boost;
    }

    switch (clause.type) {
      case 'match':
        return {
          match: {
            [clause.field || '_all']: {
              query: clause.value,
              ...(clause.operator && { operator: clause.operator }),
              ...baseClause,
            },
          },
        };

      case 'term':
        return {
          term: {
            [clause.field || '_all']: { value: clause.value, ...baseClause },
          },
        };

      case 'terms':
        return {
          terms: {
            [clause.field || '_all']: clause.value,
            ...baseClause,
          },
        };

      case 'range':
        return {
          range: {
            [clause.field || '_all']: {
              ...clause.value,
              ...baseClause,
            },
          },
        };

      case 'bool':
        const boolClauses: Record<string, any> = {};
        if (clause.clauses) {
          const must: Record<string, any>[] = [];
          const filter: Record<string, any>[] = [];
          const should: Record<string, any>[] = [];
          const mustNot: Record<string, any>[] = [];

          for (const subClause of clause.clauses) {
            const obj = this.buildQueryClauseObject(subClause);
            if (clause.operator === 'or') {
              should.push(obj);
            } else {
              must.push(obj);
            }
          }

          if (must.length > 0) {
            boolClauses.must = must;
          }
          if (filter.length > 0) {
            boolClauses.filter = filter;
          }
          if (should.length > 0) {
            boolClauses.should = should;
          }
          if (mustNot.length > 0) {
            boolClauses.must_not = mustNot;
          }
        }
        return { bool: boolClauses, ...baseClause };

      case 'exists':
        return {
          exists: {
            field: clause.field || '_all',
            ...baseClause,
          },
        };

      case 'prefix':
        return {
          prefix: {
            [clause.field || '_all']: { value: clause.value, ...baseClause },
          },
        };

      case 'wildcard':
        return {
          wildcard: {
            [clause.field || '_all']: { value: clause.value, ...baseClause },
          },
        };

      case 'regexp':
        return {
          regexp: {
            [clause.field || '_all']: { value: clause.value, ...baseClause },
          },
        };

      default:
        return { match_all: {} };
    }
  }

  /**
   * Builds a filter condition
   */
  private buildFilterCondition(condition: FilterCondition): Record<string, any> {
    switch (condition.operator) {
      case 'eq':
        return { term: { [condition.field]: { value: condition.value } } };

      case 'ne':
        return { bool: { must_not: { term: { [condition.field]: { value: condition.value } } } } };

      case 'gt':
        return { range: { [condition.field]: { gt: condition.value } } };

      case 'gte':
        return { range: { [condition.field]: { gte: condition.value } } };

      case 'lt':
        return { range: { [condition.field]: { lt: condition.value } } };

      case 'lte':
        return { range: { [condition.field]: { lte: condition.value } } };

      case 'in':
        return { terms: { [condition.field]: condition.values } };

      case 'not_in':
        return { bool: { must_not: { terms: { [condition.field]: condition.values } } } };

      case 'exists':
        return { exists: { field: condition.field } };

      case 'not_exists':
        return { bool: { must_not: { exists: { field: condition.field } } } };

      default:
        return { match_all: {} };
    }
  }

  /**
   * Builds a sort option
   */
  private buildSortOption(option: SortOption): Record<string, any> {
    const sortObj: Record<string, any> = {
      [option.field]: {
        order: option.order,
      },
    };

    if (option.mode) {
      sortObj[option.field].mode = option.mode;
    }

    if (option.nestedPath) {
      sortObj[option.field].nested = {
        path: option.nestedPath,
      };
      if (option.nestedFilter) {
        sortObj[option.field].nested.filter = this.buildQueryClauseObject(option.nestedFilter);
      }
    }

    return sortObj;
  }

  /**
   * Builds an aggregation
   */
  private buildAggregation(agg: Aggregation): Record<string, any> {
    const aggObj: Record<string, any> = {};

    switch (agg.type) {
      case 'terms':
        aggObj.terms = {
          field: agg.field,
          size: agg.size || 10,
          ...(agg.order && { order: { [agg.order.field]: agg.order.order } }),
          ...(agg.script && { script: agg.script }),
        };
        break;

      case 'range':
        aggObj.range = {
          field: agg.field,
          ranges: agg.ranges || [],
          ...(agg.script && { script: agg.script }),
        };
        break;

      case 'date_range':
        aggObj.date_range = {
          field: agg.field,
          ranges: agg.ranges || [],
          format: agg.format || 'yyyy-MM-dd',
          ...(agg.script && { script: agg.script }),
        };
        break;

      case 'histogram':
        aggObj.histogram = {
          field: agg.field,
          interval: agg.interval,
          min_doc_count: agg.minDocCount ?? 1,
          ...(agg.script && { script: agg.script }),
        };
        break;

      case 'date_histogram':
        aggObj.date_histogram = {
          field: agg.field,
          calendar_interval: typeof agg.interval === 'string' ? agg.interval : undefined,
          fixed_interval: typeof agg.interval === 'number' ? `${agg.interval}ms` : undefined,
          format: agg.format || 'yyyy-MM-dd',
          min_doc_count: agg.minDocCount ?? 1,
          ...(agg.script && { script: agg.script }),
        };
        break;

      case 'stats':
        aggObj.stats = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'extended_stats':
        aggObj.extended_stats = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'cardinality':
        aggObj.cardinality = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'avg':
        aggObj.avg = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'sum':
        aggObj.sum = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'min':
        aggObj.min = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'max':
        aggObj.max = { field: agg.field, ...(agg.script && { script: agg.script }) };
        break;

      case 'filter':
        aggObj.filter = agg.filter ? this.buildQueryClauseObject(agg.filter) : { match_all: {} };
        break;

      case 'nested':
        aggObj.nested = { path: agg.nestedPath || '' };
        break;

      case 'reverse_nested':
        aggObj.reverse_nested = {};
        if (agg.nestedPath) {
          aggObj.reverse_nested.path = agg.nestedPath;
        }
        break;

      case 'top_hits':
        aggObj.top_hits = {
          size: agg.size || 10,
          _source: agg.field ? { includes: [agg.field] } : undefined,
        };
        break;
    }

    // Add nested aggregations
    if (agg.aggregations && agg.aggregations.length > 0) {
      aggObj.aggs = {};
      for (const subAgg of agg.aggregations) {
        aggObj.aggs[subAgg.name] = this.buildAggregation(subAgg);
      }
    }

    return aggObj;
  }

  /**
   * Generates a description for the query
   */
  private generateDescription(
    options: ElasticsearchQueryBuilderOptions,
    queryType: 'search' | 'count' | 'aggregate',
  ): string {
    const parts: string[] = [];

    parts.push(`Query for index: ${options.index}`);

    if (queryType === 'search') {
      parts.push('Type: Search query');
      if (options.pagination) {
        parts.push(`Pagination: from ${options.pagination.from}, size ${options.pagination.size}`);
      }
    } else if (queryType === 'count') {
      parts.push('Type: Count query');
    } else if (queryType === 'aggregate') {
      parts.push('Type: Aggregation query');
      if (options.aggregations) {
        parts.push(`Aggregations: ${options.aggregations.map((a) => a.name).join(', ')}`);
      }
    }

    if (options.filters && options.filters.length > 0) {
      parts.push(`Filters: ${options.filters.length} filter(s)`);
    }

    if (options.sort && options.sort.length > 0) {
      parts.push(`Sort: ${options.sort.map((s) => `${s.field} ${s.order}`).join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Generates TypeScript code for the query builder
   */
  public generateQueryBuilderCode(options: ElasticsearchQueryBuilderOptions): string {
    let code = `// Elasticsearch Query Builder for ${options.index}\n\n`;
    code += `interface ${this.toPascalCase(options.index)}QueryOptions {\n`;

    // Add fields from filters
    if (options.filters) {
      for (const filter of options.filters) {
        const tsType = this.inferType(filter.value);
        code += `  ${filter.field}?: ${tsType};\n`;
      }
    }

    code += `  pagination?: {\n`;
    code += `    from?: number;\n`;
    code += `    size?: number;\n`;
    code += `  };\n`;
    code += `  sort?: {\n`;
    code += `    field: string;\n`;
    code += `    order: 'asc' | 'desc';\n`;
    code += `  }[];\n`;
    code += `}\n\n`;

    // Build query function
    code += `export async function search${this.toPascalCase(options.index)}(\n`;
    code += `  options: ${this.toPascalCase(options.index)}QueryOptions\n`;
    code += `): Promise<any> {\n`;
    code += `  const query: Record<string, any> = {\n`;

    if (options.query || options.filters?.length) {
      code += `    query: ${JSON.stringify(this.buildQueryClause(options), null, 6)},\n`;
    }

    if (options.sort && options.sort.length > 0) {
      code += `    sort: ${JSON.stringify(options.sort.map((s) => this.buildSortOption(s)), null, 6)},\n`;
    }

    if (options.pagination) {
      code += `    from: options.pagination?.from || ${options.pagination.from},\n`;
      code += `    size: options.pagination?.size || ${options.pagination.size},\n`;
    }

    if (options.aggregations && options.aggregations.length > 0) {
      code += `    aggs: {\n`;
      for (const agg of options.aggregations) {
        code += `      ${agg.name}: ${JSON.stringify(this.buildAggregation(agg), null, 8)},\n`;
      }
      code += `    },\n`;
    }

    code += `  };\n\n`;
    code += `  // Execute query with your Elasticsearch client\n`;
    code += `  // const response = await client.search({\n`;
    code += `  //   index: '${options.index}',\n`;
    code += `  //   body: query,\n`;
    code += `  // });\n\n`;
    code += `  return query;\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Infers TypeScript type from value
   */
  private inferType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'any[]';
    return 'any';
  }

  /**
   * Converts string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s/g, '');
  }

  /**
   * Gets query builder options from user
   */
  public async getQueryBuilderOptions(): Promise<ElasticsearchQueryBuilderOptions | undefined> {
    // Ask for index name
    const index = await vscode.window.showInputBox({
      prompt: 'Enter Elasticsearch index name',
      placeHolder: 'my-index',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Index name cannot be empty';
        }
        return null;
      },
    });

    if (!index) {
      return undefined;
    }

    // Ask for query type
    const queryType = await vscode.window.showQuickPick(
      [
        { label: 'Search Query', description: 'Build a search query with results', picked: true },
        { label: 'Count Query', description: 'Build a count query', picked: false },
        {
          label: 'Aggregation Query',
          description: 'Build an aggregation query',
          picked: false,
        },
      ],
      {
        placeHolder: 'Select query type',
      },
    );

    if (!queryType) {
      return undefined;
    }

    const options: ElasticsearchQueryBuilderOptions = {
      index: index.trim(),
    };

    // Set default pagination based on query type
    if (queryType.label === 'Search Query') {
      options.pagination = { from: 0, size: 10 };
    } else if (queryType.label === 'Aggregation Query') {
      options.pagination = { from: 0, size: 0 };
      options.aggregations = await this.getAggregationsFromUser();
    } else {
      options.pagination = { from: 0, size: 0 };
    }

    // Ask if they want to add filters
    const addFilters = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Add filters to the query', picked: false },
        { label: 'No', description: 'No filters', picked: true },
      ],
      {
        placeHolder: 'Add filters to the query?',
      },
    );

    if (addFilters && addFilters.label === 'Yes') {
      options.filters = await this.getFiltersFromUser();
    }

    // Ask if they want to add sorting
    const addSort = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Add sorting to the query', picked: false },
        { label: 'No', description: 'No sorting', picked: true },
      ],
      {
        placeHolder: 'Add sorting to the query?',
      },
    );

    if (addSort && addSort.label === 'Yes') {
      options.sort = await this.getSortFromUser();
    }

    return options;
  }

  /**
   * Gets aggregations from user input
   */
  private async getAggregationsFromUser(): Promise<Aggregation[]> {
    const aggregations: Aggregation[] = [];

    // Keep asking for aggregations until user stops
    let addMore = true;
    while (addMore) {
      const aggName = await vscode.window.showInputBox({
        prompt: 'Enter aggregation name',
        placeHolder: 'my-aggregation',
      });

      if (!aggName) {
        break;
      }

      const aggType = await vscode.window.showQuickPick(
        [
          { label: 'Terms', description: 'Group by unique values', picked: true },
          { label: 'Range', description: 'Group by ranges' },
          { label: 'Date Range', description: 'Group by date ranges' },
          { label: 'Histogram', description: 'Group by numeric intervals' },
          { label: 'Date Histogram', description: 'Group by date intervals' },
          { label: 'Stats', description: 'Statistical calculations' },
          { label: 'Cardinality', description: 'Count unique values' },
          { label: 'Average', description: 'Calculate average' },
          { label: 'Sum', description: 'Calculate sum' },
          { label: 'Min', description: 'Find minimum' },
          { label: 'Max', description: 'Find maximum' },
          { label: 'Filter', description: 'Filter aggregation' },
          { label: 'Top Hits', description: 'Top documents' },
        ],
        {
          placeHolder: 'Select aggregation type',
        },
      );

      if (!aggType) {
        break;
      }

      const field = await vscode.window.showInputBox({
        prompt: 'Enter field name for aggregation',
        placeHolder: 'field_name',
      });

      aggregations.push({
        name: aggName.trim(),
        type: aggType.label.toLowerCase().replace(/ /g, '_') as Aggregation['type'],
        field: field?.trim() || '_all',
      });

      const continueAdding = await vscode.window.showQuickPick(
        [
          { label: 'Yes', description: 'Add another aggregation' },
          { label: 'No', description: 'Done adding aggregations', picked: true },
        ],
        {
          placeHolder: 'Add another aggregation?',
        },
      );

      addMore = continueAdding?.label === 'Yes';
    }

    return aggregations;
  }

  /**
   * Gets filters from user input
   */
  private async getFiltersFromUser(): Promise<FilterCondition[]> {
    const filters: FilterCondition[] = [];

    let addMore = true;
    while (addMore) {
      const field = await vscode.window.showInputBox({
        prompt: 'Enter filter field name',
        placeHolder: 'field_name',
      });

      if (!field) {
        break;
      }

      const operator = await vscode.window.showQuickPick(
        [
          { label: 'Equals', value: 'eq' },
          { label: 'Not Equals', value: 'ne' },
          { label: 'Greater Than', value: 'gt' },
          { label: 'Greater Than or Equal', value: 'gte' },
          { label: 'Less Than', value: 'lt' },
          { label: 'Less Than or Equal', value: 'lte' },
          { label: 'In', value: 'in' },
          { label: 'Not In', value: 'not_in' },
          { label: 'Exists', value: 'exists' },
          { label: 'Not Exists', value: 'not_exists' },
        ],
        {
          placeHolder: 'Select filter operator',
        },
      );

      if (!operator) {
        break;
      }

      let value: any;
      let values: any[] = [];

      if (operator.value !== 'exists' && operator.value !== 'not_exists') {
        if (operator.value === 'in' || operator.value === 'not_in') {
          const valueInput = await vscode.window.showInputBox({
            prompt: 'Enter comma-separated values',
            placeHolder: 'value1, value2, value3',
          });
          values = valueInput?.split(',').map((v) => v.trim()) || [];
        } else {
          const valueInput = await vscode.window.showInputBox({
            prompt: 'Enter filter value',
            placeHolder: 'value',
          });
          value = valueInput?.trim();
        }
      }

      filters.push({
        field: field.trim(),
        operator: operator.value as FilterCondition['operator'],
        value,
        values: operator.value === 'in' || operator.value === 'not_in' ? values : undefined,
      });

      const continueAdding = await vscode.window.showQuickPick(
        [
          { label: 'Yes', description: 'Add another filter' },
          { label: 'No', description: 'Done adding filters', picked: true },
        ],
        {
          placeHolder: 'Add another filter?',
        },
      );

      addMore = continueAdding?.label === 'Yes';
    }

    return filters;
  }

  /**
   * Gets sort options from user input
   */
  private async getSortFromUser(): Promise<SortOption[]> {
    const sortOptions: SortOption[] = [];

    let addMore = true;
    while (addMore) {
      const field = await vscode.window.showInputBox({
        prompt: 'Enter sort field name',
        placeHolder: 'field_name',
      });

      if (!field) {
        break;
      }

      const order = await vscode.window.showQuickPick(
        [
          { label: 'Ascending', value: 'asc', picked: true },
          { label: 'Descending', value: 'desc' },
        ],
        {
          placeHolder: 'Select sort order',
        },
      );

      if (!order) {
        break;
      }

      sortOptions.push({
        field: field.trim(),
        order: order.value as 'asc' | 'desc',
      });

      const continueAdding = await vscode.window.showQuickPick(
        [
          { label: 'Yes', description: 'Add another sort option' },
          { label: 'No', description: 'Done adding sort options', picked: true },
        ],
        {
          placeHolder: 'Add another sort option?',
        },
      );

      addMore = continueAdding?.label === 'Yes';
    }

    return sortOptions;
  }

  /**
   * Creates the query builder file at the specified path
   */
  public async createQueryBuilderFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = require('path').dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Query builder file created', { filePath });
  }

  /**
   * Checks if a file already exists
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
