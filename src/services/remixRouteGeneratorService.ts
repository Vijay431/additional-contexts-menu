import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface RemixRouteGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeLoader: boolean;
  includeAction: boolean;
  includeMeta: boolean;
  includeErrorHandling: boolean;
  includeHeaders: boolean;
  includeLinks: boolean;
  defaultRoutePath: string;
  exportType: 'named' | 'default';
}

export interface RemixLoaderParam {
  name: string;
  type: 'url' | 'query' | 'param' | 'cookie' | 'header';
  dataType: string;
  required: boolean;
  description?: string;
}

export interface RemixLoaderFunction {
  includeLoader: boolean;
  returnType: string;
  params: RemixLoaderParam[];
  description?: string;
  includeDataFetching: boolean;
}

export interface RemixActionFunction {
  includeAction: boolean;
  returnType: string;
  formDataFields: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  description?: string;
  includeValidation: boolean;
}

export interface RemixMetaFunction {
  includeMeta: boolean;
  fields: Array<{
    name: string;
    type: 'title' | 'description' | 'og' | 'twitter' | 'custom';
    content?: string;
    property?: string;
  }>;
}

export interface RemixHeadersFunction {
  includeHeaders: boolean;
  headers: Array<{
    name: string;
    value: string;
  }>;
}

export interface RemixLinksFunction {
  includeLinks: boolean;
  links: Array<{
    rel: string;
    href: string;
    type?: string;
    media?: string;
  }>;
}

export interface GeneratedRemixRoute {
  name: string;
  routePath: string;
  filePath: string;
  loader?: RemixLoaderFunction;
  action?: RemixActionFunction;
  meta?: RemixMetaFunction;
  headers?: RemixHeadersFunction;
  links?: RemixLinksFunction;
  imports: string[];
  routeCode: string;
}

/**
 * Service for generating Remix routes with TypeScript typing,
 * loaders, actions, and meta functions
 */
export class RemixRouteGeneratorService {
  private static instance: RemixRouteGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RemixRouteGeneratorService {
    RemixRouteGeneratorService.instance ??= new RemixRouteGeneratorService();
    return RemixRouteGeneratorService.instance;
  }

  /**
   * Generates a Remix route based on user input
   */
  public async generateRoute(
    workspacePath: string,
    config: RemixRouteGeneratorConfig,
  ): Promise<GeneratedRemixRoute | null> {
    // Get route name
    const routeName = await this.getRouteName();
    if (!routeName) {
      return null;
    }

    // Get route path
    const routePath = await this.getRoutePath(routeName, config);
    if (!routePath) {
      return null;
    }

    // Collect route functions (loader, action, meta, headers, links)
    const loader = await this.collectLoaderFunction(config);
    const action = await this.collectActionFunction(config);
    const meta = await this.collectMetaFunction(config);
    const headers = await this.collectHeadersFunction(config);
    const links = await this.collectLinksFunction(config);

    if (
      !loader?.includeLoader &&
      !action?.includeAction &&
      !meta?.includeMeta &&
      !headers?.includeHeaders &&
      !links?.includeLinks
    ) {
      vscode.window.showWarningMessage(
        'No route functions selected. Route generation cancelled.',
      );
      return null;
    }

    // Generate imports based on selected functions
    const imports = this.generateImports({ loader, action, meta, headers, links }, config);

    // Generate route code
    const routeCode = this.generateRouteCode(
      routeName,
      routePath,
      { loader, action, meta, headers, links },
      imports,
      config,
    );

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, routePath);

    this.logger.info('Remix route generated', {
      name: routeName,
      path: routePath,
      hasLoader: !!loader?.includeLoader,
      hasAction: !!action?.includeAction,
      hasMeta: !!meta?.includeMeta,
    });

    return {
      name: routeName,
      routePath,
      filePath,
      loader: loader ?? undefined,
      action: action ?? undefined,
      meta: meta ?? undefined,
      headers: headers ?? undefined,
      links: links ?? undefined,
      imports,
      routeCode,
    };
  }

  /**
   * Prompts user for route name
   */
  private async getRouteName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter route name (e.g., users, posts/$id, dashboard)',
      placeHolder: 'users',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route name cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_$-]*$/.test(value)) {
          return 'Route name can only contain letters, numbers, slashes, hyphens, underscores, and dollar signs';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for route path
   */
  private async getRoutePath(
    routeName: string,
    config: RemixRouteGeneratorConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter route path (e.g., routes/users, routes/posts/$id)',
      placeHolder: `${config.defaultRoutePath}${routeName}`,
      value: `${config.defaultRoutePath}${routeName}`,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route path cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_$-]*$/.test(value)) {
          return 'Route path can only contain letters, numbers, slashes, hyphens, underscores, and dollar signs';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects loader function configuration
   */
  private async collectLoaderFunction(
    config: RemixRouteGeneratorConfig,
  ): Promise<RemixLoaderFunction | null> {
    const includeLoader = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include loader', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include a loader function for data fetching?' },
    );

    if (!includeLoader || includeLoader.value === 'no') {
      return null;
    }

    // Collect parameters
    const params = await this.collectLoaderParams();

    // Get return type
    const returnType = await this.getReturnType('loader');

    // Ask about data fetching
    const includeDataFetching = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include data fetching logic?' },
    );

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter loader description (optional)',
      placeHolder: 'Loads data for this route',
    });

    return {
      includeLoader: true,
      returnType,
      params,
      description: description?.trim(),
      includeDataFetching: includeDataFetching?.value === 'yes',
    };
  }

  /**
   * Collects action function configuration
   */
  private async collectActionFunction(
    config: RemixRouteGeneratorConfig,
  ): Promise<RemixActionFunction | null> {
    const includeAction = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include action', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include an action function for form handling?' },
    );

    if (!includeAction || includeAction.value === 'no') {
      return null;
    }

    // Collect form data fields
    const formDataFields = await this.collectFormDataFields();

    // Get return type
    const returnType = await this.getReturnType('action');

    // Ask about validation
    const includeValidation = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include form validation?' },
    );

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter action description (optional)',
      placeHolder: 'Handles form submissions',
    });

    return {
      includeAction: true,
      returnType,
      formDataFields,
      description: description?.trim(),
      includeValidation: includeValidation?.value === 'yes',
    };
  }

  /**
   * Collects meta function configuration
   */
  private async collectMetaFunction(
    config: RemixRouteGeneratorConfig,
  ): Promise<RemixMetaFunction | null> {
    const includeMeta = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include meta', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include a meta function for SEO?' },
    );

    if (!includeMeta || includeMeta.value === 'no') {
      return null;
    }

    // Collect meta fields
    const fields = await this.collectMetaFields();

    return {
      includeMeta: true,
      fields,
    };
  }

  /**
   * Collects headers function configuration
   */
  private async collectHeadersFunction(
    config: RemixRouteGeneratorConfig,
  ): Promise<RemixHeadersFunction | null> {
    const includeHeaders = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include headers', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include a headers function?' },
    );

    if (!includeHeaders || includeHeaders.value === 'no') {
      return null;
    }

    // Collect headers
    const headers = await this.collectHeaders();

    return {
      includeHeaders: true,
      headers,
    };
  }

  /**
   * Collects links function configuration
   */
  private async collectLinksFunction(
    config: RemixRouteGeneratorConfig,
  ): Promise<RemixLinksFunction | null> {
    const includeLinks = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include links', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include a links function?' },
    );

    if (!includeLinks || includeLinks.value === 'no') {
      return null;
    }

    // Collect links
    const links = await this.collectLinks();

    return {
      includeLinks: true,
      links,
    };
  }

  /**
   * Collects loader parameters
   */
  private async collectLoaderParams(): Promise<RemixLoaderParam[]> {
    const params: RemixLoaderParam[] = [];

    let addMore = true;
    while (addMore) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add URL parameter', value: 'url' },
          { label: 'Add query parameter', value: 'query' },
          { label: 'Add route parameter', value: 'param' },
          { label: 'Add cookie', value: 'cookie' },
          { label: 'Add header', value: 'header' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add loader parameters' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const param = await this.createLoaderParam(addParam.value as RemixLoaderParam['type']);
      if (param) {
        params.push(param);
      }
    }

    return params;
  }

  /**
   * Creates a single loader parameter
   */
  private async createLoaderParam(type: RemixLoaderParam['type']): Promise<RemixLoaderParam | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${type} parameter name`,
      placeHolder: type === 'param' ? 'id' : type,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Parameter name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid parameter name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const dataTypeInput = await vscode.window.showQuickPick(
      ['string', 'number', 'boolean', 'any', 'string[]', 'number[]'],
      { placeHolder: 'Select data type' },
    );

    const dataType = dataTypeInput || 'any';

    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'true' },
        { label: 'Optional', value: 'false' },
      ],
      { placeHolder: 'Is this parameter required?' },
    );

    const required = requiredChoice?.value === 'true';

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter parameter description (optional)',
      placeHolder: `The ${nameInput} ${type}`,
    });

    return {
      name: nameInput.trim(),
      type,
      dataType,
      required,
      description: descriptionInput?.trim(),
    };
  }

  /**
   * Collects form data fields for action
   */
  private async collectFormDataFields(): Promise<Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>> {
    const fields: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }> = [];

    let addMore = true;
    while (addMore) {
      const nameInput = await vscode.window.showInputBox({
        prompt: 'Enter form field name',
        placeHolder: 'email',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Field name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Invalid field name';
          }
          return null;
        },
      });

      if (!nameInput) {
        addMore = false;
        break;
      }

      const typeInput = await vscode.window.showQuickPick(
        ['string', 'number', 'boolean', 'any'],
        { placeHolder: 'Select data type' },
      );

      const requiredChoice = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: 'true' },
          { label: 'Optional', value: 'false' },
        ],
        { placeHolder: 'Is this field required?' },
      );

      const descriptionInput = await vscode.window.showInputBox({
        prompt: 'Enter field description (optional)',
        placeHolder: `The ${nameInput} field`,
      });

      fields.push({
        name: nameInput.trim(),
        type: typeInput || 'string',
        required: requiredChoice?.value === 'true',
        description: descriptionInput?.trim(),
      });

      const continueChoice = await vscode.window.showQuickPick(
        [
          { label: 'Add another field', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another field or finish?' },
      );

      if (continueChoice?.value === 'done') {
        addMore = false;
      }
    }

    return fields;
  }

  /**
   * Collects meta fields
   */
  private async collectMetaFields(): Promise<Array<{
    name: string;
    type: 'title' | 'description' | 'og' | 'twitter' | 'custom';
    content?: string;
    property?: string;
  }>> {
    const fields: Array<{
      name: string;
      type: 'title' | 'description' | 'og' | 'twitter' | 'custom';
      content?: string;
      property?: string;
    }> = [];

    let addMore = true;
    while (addMore) {
      const typeChoice = await vscode.window.showQuickPick<
        Required<{ label: string; value: RemixMetaFunction['fields'][0]['type'] }>
      >(
        [
          { label: 'Title', value: 'title' },
          { label: 'Description', value: 'description' },
          { label: 'Open Graph', value: 'og' },
          { label: 'Twitter Card', value: 'twitter' },
          { label: 'Custom', value: 'custom' },
        ],
        { placeHolder: 'Select meta field type' },
      );

      if (!typeChoice) {
        addMore = false;
        break;
      }

      const nameInput = await vscode.window.showInputBox({
        prompt: 'Enter meta field name',
        placeHolder: typeChoice.value === 'title' ? 'title' : 'fieldName',
      });

      if (!nameInput) {
        addMore = false;
        break;
      }

      let property: string | undefined;
      if (typeChoice.value === 'og' || typeChoice.value === 'twitter') {
        property = await vscode.window.showInputBox({
          prompt: 'Enter property name',
          placeHolder: typeChoice.value === 'og' ? 'og:title' : 'twitter:card',
        });
      }

      const contentInput = await vscode.window.showInputBox({
        prompt: 'Enter default content (optional)',
        placeHolder: 'Default value',
      });

      fields.push({
        name: nameInput.trim(),
        type: typeChoice.value,
        property: property?.trim(),
        content: contentInput?.trim(),
      });

      const continueChoice = await vscode.window.showQuickPick(
        [
          { label: 'Add another field', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another meta field or finish?' },
      );

      if (continueChoice?.value === 'done') {
        addMore = false;
      }
    }

    return fields;
  }

  /**
   * Collects headers
   */
  private async collectHeaders(): Promise<Array<{ name: string; value: string }>> {
    const headers: Array<{ name: string; value: string }> = [];

    let addMore = true;
    while (addMore) {
      const nameInput = await vscode.window.showInputBox({
        prompt: 'Enter header name',
        placeHolder: 'Cache-Control',
      });

      if (!nameInput) {
        addMore = false;
        break;
      }

      const valueInput = await vscode.window.showInputBox({
        prompt: 'Enter header value',
        placeHolder: 'max-age=3600',
      });

      if (!valueInput) {
        addMore = false;
        break;
      }

      headers.push({
        name: nameInput.trim(),
        value: valueInput.trim(),
      });

      const continueChoice = await vscode.window.showQuickPick(
        [
          { label: 'Add another header', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another header or finish?' },
      );

      if (continueChoice?.value === 'done') {
        addMore = false;
      }
    }

    return headers;
  }

  /**
   * Collects links
   */
  private async collectLinks(): Promise<Array<{
    rel: string;
    href: string;
    type?: string;
    media?: string;
  }>> {
    const links: Array<{
      rel: string;
      href: string;
      type?: string;
      media?: string;
    }> = [];

    let addMore = true;
    while (addMore) {
      const relInput = await vscode.window.showInputBox({
        prompt: 'Enter link relation',
        placeHolder: 'stylesheet',
      });

      if (!relInput) {
        addMore = false;
        break;
      }

      const hrefInput = await vscode.window.showInputBox({
        prompt: 'Enter link href',
        placeHolder: '/styles/main.css',
      });

      if (!hrefInput) {
        addMore = false;
        break;
      }

      const typeInput = await vscode.window.showInputBox({
        prompt: 'Enter link type (optional)',
        placeHolder: 'text/css',
      });

      const mediaInput = await vscode.window.showInputBox({
        prompt: 'Enter link media (optional)',
        placeHolder: 'print',
      });

      links.push({
        rel: relInput.trim(),
        href: hrefInput.trim(),
        type: typeInput?.trim(),
        media: mediaInput?.trim(),
      });

      const continueChoice = await vscode.window.showQuickPick(
        [
          { label: 'Add another link', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another link or finish?' },
      );

      if (continueChoice?.value === 'done') {
        addMore = false;
      }
    }

    return links;
  }

  /**
   * Gets the return type for a function
   */
  private async getReturnType(functionType: 'loader' | 'action'): Promise<string> {
    const defaultTypes: Record<string, string> = {
      loader: 'any',
      action: 'any',
    };

    const input = await vscode.window.showInputBox({
      prompt: `Enter ${functionType} return type`,
      placeHolder: defaultTypes[functionType] || 'any',
      value: defaultTypes[functionType] || 'any',
    });

    return input?.trim() || defaultTypes[functionType] || 'any';
  }

  /**
   * Generates imports based on selected functions
   */
  private generateImports(
    functions: {
      loader?: RemixLoaderFunction | null;
      action?: RemixActionFunction | null;
      meta?: RemixMetaFunction | null;
      headers?: RemixHeadersFunction | null;
      links?: RemixLinksFunction | null;
    },
    config: RemixRouteGeneratorConfig,
  ): string[] {
    const imports: string[] = [];

    // Remix core imports
    if (functions.loader || functions.action) {
      imports.push('type { LoaderFunctionArgs }');
      imports.push('type { ActionFunctionArgs }');
      imports.push('from "@remix-run/node"');

      // Add hooks for component
      imports.push('{ useLoaderData, useActionData }');
      imports.push('from "@remix-run/react"');
    }

    if (functions.meta) {
      imports.push('type { MetaFunction }');
      imports.push('from "@remix-run/node"');
    }

    if (functions.links) {
      imports.push('type { LinksFunction }');
      imports.push('from "@remix-run/node"');
    }

    // Add json helper if action returns JSON
    if (functions.action && config.includeTypeScript) {
      imports.push('{ json }');
      imports.push('from "@remix-run/node"');
    }

    // Add redirect if included
    if (functions.loader || functions.action) {
      imports.push('{ redirect }');
      imports.push('from "@remix-run/node"');
    }

    return imports;
  }

  /**
   * Calculates the file path for the route
   */
  private calculateFilePath(workspacePath: string, routePath: string): string {
    // Convert route path to file path
    // routes/users -> app/routes/users.tsx
    // routes/posts/$id -> app/routes/posts.$id.tsx
    const fileName = routePath
      .replace(/^routes\//, '')
      .replace(/\/\$/g, '.$')
      .replace(/\//g, '.') + '.tsx';

    return path.join(workspacePath, 'app', 'routes', fileName);
  }

  /**
   * Generates the route code
   */
  private generateRouteCode(
    routeName: string,
    routePath: string,
    functions: {
      loader?: RemixLoaderFunction | null;
      action?: RemixActionFunction | null;
      meta?: RemixMetaFunction | null;
      headers?: RemixHeadersFunction | null;
      links?: RemixLinksFunction | null;
    },
    imports: string[],
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    // Add imports
    if (imports.length > 0) {
      // Group imports by source
      const importGroups = new Map<string, string[]>();
      for (let i = 0; i < imports.length; i += 2) {
        const item = imports[i];
        const from = imports[i + 1];
        if (!from) continue;

        if (!importGroups.has(from)) {
          importGroups.set(from, []);
        }
        importGroups.get(from)!.push(item);
      }

      for (const [from, items] of importGroups) {
        const joined = items.join(', ');
        code += `import ${joined} ${from};\n`;
      }
      code += '\n';
    }

    // Add TypeScript interfaces if enabled
    if (config.includeTypeScript) {
      code += this.generateTypeInterfaces(routeName, functions);
    }

    // Generate loader function
    if (functions.loader?.includeLoader) {
      code += this.generateLoaderFunction(routeName, functions.loader, config);
      code += '\n\n';
    }

    // Generate action function
    if (functions.action?.includeAction) {
      code += this.generateActionFunction(routeName, functions.action, config);
      code += '\n\n';
    }

    // Generate meta function
    if (functions.meta?.includeMeta) {
      code += this.generateMetaFunction(routeName, functions.meta, config);
      code += '\n\n';
    }

    // Generate headers function
    if (functions.headers?.includeHeaders) {
      code += this.generateHeadersFunction(routeName, functions.headers, config);
      code += '\n\n';
    }

    // Generate links function
    if (functions.links?.includeLinks) {
      code += this.generateLinksFunction(routeName, functions.links, config);
      code += '\n\n';
    }

    // Generate default component export
    code += this.generateComponent(routeName, functions, config);

    return code;
  }

  /**
   * Generates TypeScript interfaces for the route
   */
  private generateTypeInterfaces(
    routeName: string,
    functions: {
      loader?: RemixLoaderFunction | null;
      action?: RemixActionFunction | null;
    },
  ): string {
    let code = '';

    // Generate loader data interface
    if (functions.loader?.includeLoader) {
      const interfaceName = `${this.ucfirst(routeName)}LoaderData`;
      code += `interface ${interfaceName} {\n`;
      if (functions.loader.params.length > 0) {
        for (const param of functions.loader.params) {
          const optional = param.required ? '' : '?';
          code += `  ${param.name}${optional}: ${param.dataType};\n`;
        }
      } else {
        code += `  // Add your loader data properties here\n`;
        code += `  [key: string]: unknown;\n`;
      }
      code += '}\n\n';
    }

    // Generate action data interface
    if (functions.action?.includeAction) {
      const interfaceName = `${this.ucfirst(routeName)}ActionData`;
      code += `interface ${interfaceName} {\n`;
      if (functions.action.formDataFields.length > 0) {
        for (const field of functions.action.formDataFields) {
          const optional = field.required ? '' : '?';
          code += `  ${field.name}${optional}: ${field.type};\n`;
        }
      } else {
        code += `  // Add your action data properties here\n`;
        code += `  [key: string]: unknown;\n`;
      }
      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generates the loader function
   */
  private generateLoaderFunction(
    routeName: string,
    loader: RemixLoaderFunction,
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    // JSDoc comment
    if (loader.description) {
      code += `/**\n`;
      code += ` * ${loader.description}\n`;
      code += ` */\n`;
    }

    const dataInterface = loader.includeLoader ? `${this.ucfirst(routeName)}LoaderData` : loader.returnType;

    code += `export const loader = `;
    if (config.includeTypeScript) {
      code += `async ({ request, params }: LoaderFunctionArgs): Promise<${dataInterface}> => {\n`;
    } else {
      code += `async ({ request, params }) => {\n`;
    }

    // Extract parameters
    if (loader.params.length > 0) {
      code += `  const { `;
      const paramNames = loader.params.map((p) => p.name);
      code += paramNames.join(', ');
      code += ` } = params;\n`;
      code += '\n';
    }

    if (config.includeErrorHandling) {
      code += `  try {\n`;
    }

    if (loader.includeDataFetching) {
      code += `    // TODO: Implement data fetching logic\n`;
      code += `    // Example: const data = await fetchData(params.${loader.params[0]?.name || 'id'});\n`;
      code += `    const data = {} as ${dataInterface};\n\n`;
    } else {
      code += `    // TODO: Implement loader logic\n`;
      code += `    const data = {} as ${dataInterface};\n\n`;
    }

    code += `    return data;\n`;

    if (config.includeErrorHandling) {
      code += `  } catch (error) {\n`;
      code += `    console.error('Error loading ${routeName} data:', error);\n`;
      code += `    throw new Response('Failed to load data', { status: 500 });\n`;
      code += `  }\n`;
    }

    code += `};`;

    return code;
  }

  /**
   * Generates the action function
   */
  private generateActionFunction(
    routeName: string,
    action: RemixActionFunction,
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    // JSDoc comment
    if (action.description) {
      code += `/**\n`;
      code += ` * ${action.description}\n`;
      code += ` */\n`;
    }

    const dataInterface = action.includeAction ? `${this.ucfirst(routeName)}ActionData` : action.returnType;

    code += `export const action = `;
    if (config.includeTypeScript) {
      code += `async ({ request }: ActionFunctionArgs): Promise<${dataInterface}> => {\n`;
    } else {
      code += `async ({ request }) => {\n`;
    }

    if (config.includeErrorHandling) {
      code += `  try {\n`;
    }

    code += `    const formData = await request.formData();\n`;

    // Extract form fields
    if (action.formDataFields.length > 0) {
      code += `    const { `;
      const fieldNames = action.formDataFields.map((f) => f.name);
      code += fieldNames.join(', ');
      code += ` } = Object.fromEntries(formData);\n`;
      code += '\n';

      // Add validation if enabled
      if (action.includeValidation) {
        code += `    // Validate form data\n`;
        for (const field of action.formDataFields.filter((f) => f.required)) {
          code += `    if (!${field.name}) {\n`;
          code += `      return json({ error: 'Missing required field: ${field.name}' }, { status: 400 });\n`;
          code += `    }\n`;
        }
        code += '\n';
      }
    }

    code += `    // TODO: Implement action logic\n`;
    code += `    // Example: await createOrUpdateEntry(formData);\n`;
    code += `    const result = {} as ${dataInterface};\n\n`;

    code += `    return result;\n`;

    if (config.includeErrorHandling) {
      code += `  } catch (error) {\n`;
      code += `    console.error('Error processing ${routeName} action:', error);\n`;
      code += `    return json({ error: 'Failed to process request' }, { status: 500 });\n`;
      code += `  }\n`;
    }

    code += `};`;

    return code;
  }

  /**
   * Generates the meta function
   */
  private generateMetaFunction(
    routeName: string,
    meta: RemixMetaFunction,
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    code += `export const meta: MetaFunction = `;
    if (config.includeTypeScript) {
      code += `({ data, location }) => {\n`;
    } else {
      code += `({ data, location }) => {\n`;
    }

    code += `  return [\n`;

    for (const field of meta.fields) {
      if (field.type === 'title') {
        code += `    { title: "${field.content || routeName}" },\n`;
      } else if (field.type === 'description') {
        code += `    { name: "description", content: "${field.content || ''}" },\n`;
      } else if (field.type === 'og' || field.type === 'twitter') {
        code += `    { property: "${field.property || 'og:title'}", content: "${field.content || ''}" },\n`;
      } else if (field.type === 'custom') {
        code += `    { name: "${field.name}", content: "${field.content || ''}" },\n`;
      }
    }

    code += `  ];\n`;
    code += `};`;

    return code;
  }

  /**
   * Generates the headers function
   */
  private generateHeadersFunction(
    routeName: string,
    headers: RemixHeadersFunction,
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    code += `export const headers = () => {\n`;
    code += `  return {\n`;

    for (const header of headers.headers) {
      code += `    "${header.name}": "${header.value}",\n`;
    }

    code += `  };\n`;
    code += `};`;

    return code;
  }

  /**
   * Generates the links function
   */
  private generateLinksFunction(
    routeName: string,
    links: RemixLinksFunction,
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    code += `export const links: LinksFunction = () => {\n`;
    code += `  return [\n`;

    for (const link of links.links) {
      code += `    { rel: "${link.rel}", href: "${link.href}"`;
      if (link.type) {
        code += `, type: "${link.type}"`;
      }
      if (link.media) {
        code += `, media: "${link.media}"`;
      }
      code += ` },\n`;
    }

    code += `  ];\n`;
    code += `};`;

    return code;
  }

  /**
   * Generates the default component
   */
  private generateComponent(
    routeName: string,
    functions: {
      loader?: RemixLoaderFunction | null;
      action?: RemixActionFunction | null;
    },
    config: RemixRouteGeneratorConfig,
  ): string {
    let code = '';

    code += `export default function ${this.ucfirst(routeName)}() {\n`;

    // Get loader data hook if loader exists
    if (functions.loader?.includeLoader) {
      code += `  const data = useLoaderData<typeof loader>();\n`;
    }

    // Get action data hook if action exists
    if (functions.action?.includeAction) {
      code += `  const actionData = useActionData<typeof action>();\n`;
    }

    if (functions.loader || functions.action) {
      code += '\n';
    }

    code += `  return (\n`;
    code += `    <div>\n`;
    code += `      <h1>${this.ucfirst(routeName)}</h1>\n`;
    code += `      {/* TODO: Implement your route component */}\n`;
    if (functions.loader?.includeLoader) {
      code += `      {/* Data is available in the 'data' variable */}\n`;
    }
    if (functions.action?.includeAction) {
      code += `      {/* Form submissions can be handled here */}\n`;
    }
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Creates the route file at the specified path
   */
  public async createRouteFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write route file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Remix route file created', { filePath });
  }
}
