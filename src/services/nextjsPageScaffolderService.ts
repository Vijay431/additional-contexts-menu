import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NextjsPageScaffolderConfig {
  enabled: boolean;
  directoryPattern: 'app' | 'pages';
  includeTypeScript: boolean;
  includeMetadata: boolean;
  includeLayout: boolean;
  includeLoading: boolean;
  includeError: boolean;
  includeNotFound: boolean;
  defaultComponentType: 'server' | 'client';
  defaultPath: string;
}

export interface NextjsPageMetadata {
  title: string | undefined;
  description: string | undefined;
  keywords: string[] | undefined;
  openGraph?: {
    title?: string;
    description?: string;
    type?: 'website' | 'article';
    image?: string;
  };
  twitter?: {
    card?: 'summary' | 'summary_large_image';
    title?: string;
    description?: string;
    image?: string;
  };
}

export interface NextjsPageRoute {
  name: string;
  routePath: string;
  isDynamic: boolean;
  params: string[] | undefined;
  metadata: NextjsPageMetadata | undefined;
  componentType: 'server' | 'client';
  hasLayout: boolean;
  hasLoading: boolean;
  hasError: boolean;
  hasNotFound: boolean;
}

export interface GeneratedPage {
  name: string;
  routePath: string;
  componentType: 'server' | 'client';
  files: {
    page: { path: string; code: string };
    layout?: { path: string; code: string };
    loading?: { path: string; code: string };
    error?: { path: string; code: string };
    notFound?: { path: string; code: string };
  };
}

/**
 * Service for generating Next.js pages with proper routing structure,
 * metadata generation, and TypeScript support. Supports both app router
 * and pages router patterns.
 */
export class NextjsPageScaffolderService {
  private static instance: NextjsPageScaffolderService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NextjsPageScaffolderService {
    NextjsPageScaffolderService.instance ??= new NextjsPageScaffolderService();
    return NextjsPageScaffolderService.instance;
  }

  /**
   * Generates a Next.js page based on user input
   */
  public async generatePage(
    _workspacePath: string,
    config: NextjsPageScaffolderConfig,
  ): Promise<GeneratedPage | null> {
    // Get page name
    const pageName = await this.getPageName();
    if (!pageName) {
      return null;
    }

    // Get route path
    const routePath = await this.getRoutePath(pageName, config);
    if (!routePath) {
      return null;
    }

    // Check if route is dynamic
    const isDynamic = this.isDynamicRoute(routePath);
    const params = isDynamic ? this.extractDynamicParams(routePath) : undefined;

    // Get metadata
    const metadata = config.includeMetadata ? await this.collectMetadata() : undefined;

    // Get component type
    const componentType = await this.getComponentType(config);

    // Get additional files
    const hasLayout = config.includeLayout && (await this.askForFile('layout'));
    const hasLoading = config.includeLoading && (await this.askForFile('loading state'));
    const hasError = config.includeError && (await this.askForFile('error boundary'));
    const hasNotFound = config.includeNotFound && (await this.askForFile('not found page'));

    const pageRoute: NextjsPageRoute = {
      name: pageName,
      routePath,
      isDynamic,
      params,
      metadata,
      componentType,
      hasLayout,
      hasLoading,
      hasError,
      hasNotFound,
    };

    // Generate files based on directory pattern
    const files =
      config.directoryPattern === 'app'
        ? this.generateAppRouterFiles(pageRoute, config)
        : this.generatePagesRouterFiles(pageRoute, config);

    this.logger.info('Next.js page generated', {
      name: pageName,
      path: routePath,
      directoryPattern: config.directoryPattern,
      componentType,
    });

    return {
      name: pageName,
      routePath,
      componentType,
      files,
    };
  }

  /**
   * Prompts user for page name
   */
  private async getPageName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter page name (e.g., dashboard, user-profile, blog/[slug])',
      placeHolder: 'my-page',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Page name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-_/[\]]*$/i.test(value)) {
          return 'Page name must start with a letter and contain only letters, numbers, hyphens, slashes, and square brackets for dynamic routes';
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
    pageName: string,
    _config: NextjsPageScaffolderConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter route path (e.g., dashboard, users/[id], blog/posts/[slug])',
      placeHolder: pageName,
      value: pageName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route path cannot be empty';
        }
        if (!/^[a-z0-9-_/[\]]*$/i.test(value)) {
          return 'Route path can only contain letters, numbers, hyphens, slashes, and square brackets';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Checks if route is dynamic
   */
  private isDynamicRoute(routePath: string): boolean {
    return routePath.includes('[') && routePath.includes(']');
  }

  /**
   * Extracts dynamic params from route path
   */
  private extractDynamicParams(routePath: string): string[] {
    const matches = routePath.matchAll(/\[([^\]]+)\]/g);
    return Array.from(matches, (match) => match[1] || '');
  }

  /**
   * Collects metadata from user
   */
  private async collectMetadata(): Promise<NextjsPageMetadata | undefined> {
    const title = await vscode.window.showInputBox({
      prompt: 'Enter page title (optional)',
      placeHolder: 'My Page',
    });

    const description = await vscode.window.showInputBox({
      prompt: 'Enter page description (optional)',
      placeHolder: 'A brief description of the page',
    });

    const keywordsInput = await vscode.window.showInputBox({
      prompt: 'Enter keywords (comma-separated, optional)',
      placeHolder: 'nextjs, react, typescript',
    });

    const keywords = keywordsInput?.trim()
      ? keywordsInput
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;

    return {
      title: title?.trim() || undefined,
      description: description?.trim() || undefined,
      keywords,
    };
  }

  /**
   * Gets component type from user
   */
  private async getComponentType(config: NextjsPageScaffolderConfig): Promise<'server' | 'client'> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Server Component (default)',
          value: 'server',
          description: 'Renders on the server, can be async',
        },
        { label: 'Client Component', value: 'client', description: 'Uses React hooks and state' },
      ],
      {
        placeHolder: 'Select component type',
      },
    );

    return (choice?.value as 'server' | 'client') || config.defaultComponentType;
  }

  /**
   * Asks if user wants to include a specific file
   */
  private async askForFile(fileType: string): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      {
        placeHolder: `Include ${fileType}?`,
      },
    );

    return choice?.value === 'yes';
  }

  /**
   * Generates files for App Router pattern
   */
  public generateAppRouterFiles(
    route: NextjsPageRoute,
    config: NextjsPageScaffolderConfig,
  ): GeneratedPage['files'] {
    const basePath = config.directoryPattern === 'app' ? 'app' : 'pages';

    // Page file
    const pagePath = this.calculateAppFilePath(basePath, route.routePath, 'page.tsx');
    const pageCode = this.generateAppRouterPage(route, config);

    const files: GeneratedPage['files'] = {
      page: { path: pagePath, code: pageCode },
    };

    // Layout file
    if (route.hasLayout) {
      const layoutPath = this.calculateAppFilePath(basePath, route.routePath, 'layout.tsx');
      const layoutCode = this.generateLayout(route, config);
      files.layout = { path: layoutPath, code: layoutCode };
    }

    // Loading file
    if (route.hasLoading) {
      const loadingPath = this.calculateAppFilePath(basePath, route.routePath, 'loading.tsx');
      const loadingCode = this.generateLoading(route, config);
      files.loading = { path: loadingPath, code: loadingCode };
    }

    // Error file
    if (route.hasError) {
      const errorPath = this.calculateAppFilePath(basePath, route.routePath, 'error.tsx');
      const errorCode = this.generateError(route, config);
      files.error = { path: errorPath, code: errorCode };
    }

    // Not found file
    if (route.hasNotFound) {
      const notFoundPath = this.calculateAppFilePath(basePath, route.routePath, 'not-found.tsx');
      const notFoundCode = this.generateNotFound(route, config);
      files.notFound = { path: notFoundPath, code: notFoundCode };
    }

    return files;
  }

  /**
   * Generates files for Pages Router pattern
   */
  public generatePagesRouterFiles(
    route: NextjsPageRoute,
    config: NextjsPageScaffolderConfig,
  ): GeneratedPage['files'] {
    const basePath = 'pages';

    // Page file
    const pagePath = this.calculatePagesFilePath(basePath, route.routePath, 'index.tsx');
    const pageCode = this.generatePagesRouterPage(route, config);

    const files: GeneratedPage['files'] = {
      page: { path: pagePath, code: pageCode },
    };

    // Note: Pages router doesn't have layout/loading/error/notFound files in the same way
    // These are handled through _app.js, _error.js, and 404.js at the root level

    return files;
  }

  /**
   * Calculates file path for App Router
   */
  private calculateAppFilePath(basePath: string, routePath: string, fileName: string): string {
    if (routePath === '') {
      // Root route
      return path.join(basePath, fileName);
    }
    return path.join(basePath, routePath, fileName);
  }

  /**
   * Calculates file path for Pages Router
   */
  private calculatePagesFilePath(basePath: string, routePath: string, fileName: string): string {
    if (routePath === '' || routePath === 'index') {
      return path.join(basePath, fileName);
    }
    return path.join(basePath, `${routePath}.tsx`);
  }

  /**
   * Generates App Router page code
   */
  private generateAppRouterPage(
    route: NextjsPageRoute,
    config: NextjsPageScaffolderConfig,
  ): string {
    let code = '';

    // Add imports
    if (route.componentType === 'client') {
      code += `'use client';\n\n`;
    }

    // Add metadata
    if (route.metadata && config.includeMetadata) {
      code += this.generateMetadata(route.metadata);
      code += '\n';
    }

    // Add props interface for TypeScript
    if (config.includeTypeScript && route.isDynamic) {
      code += `interface PageProps {\n`;
      code += `  params: {\n`;
      for (const param of route.params || []) {
        code += `    ${param}: string;\n`;
      }
      code += `  };\n`;
      code += `  searchParams?: Record<string, string | string[]>;\n`;
      code += `}\n\n`;
    }

    // Generate component
    const asyncKeyword = route.componentType === 'server' ? 'async ' : '';
    code += `export ${asyncKeyword}default function ${this.ucfirst(route.name)}Page`;

    if (config.includeTypeScript) {
      if (route.isDynamic) {
        code += `({ params, searchParams }: PageProps)`;
      } else {
        code += '()';
      }
    } else {
      code += '()';
    }

    code += ` {\n`;
    code += `  return (\n`;
    code += `    <div className="${route.name}">\n`;
    code += `      <h1>${this.ucfirst(route.name)}</h1>\n`;
    code += `      <p>Welcome to the ${route.name} page!</p>\n`;
    if (route.isDynamic) {
      code += `      {/* Dynamic route parameters available in params */}\n`;
    }
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates Pages Router page code
   */
  private generatePagesRouterPage(
    route: NextjsPageRoute,
    config: NextjsPageScaffolderConfig,
  ): string {
    let code = '';

    // Add imports
    code += `import { NextPage } from 'next';\n`;
    if (route.componentType === 'client') {
      code += `\n'use client';\n`;
    }
    code += `\nimport Head from 'next/head';\n\n`;

    // Add props interface for TypeScript
    if (config.includeTypeScript && route.isDynamic) {
      code += `interface PageProps {\n`;
      code += `  query: {\n`;
      for (const param of route.params || []) {
        code += `    ${param}: string;\n`;
      }
      code += `  };\n`;
      code += `}\n\n`;
    }

    // Generate component
    code += `const ${this.ucfirst(route.name)}Page: NextPage`;

    if (config.includeTypeScript && route.isDynamic) {
      code += `<PageProps> = ({ query })`;
    } else {
      code += ' = ()';
    }

    code += ` => {\n`;
    code += `  return (\n`;
    code += `    <>\n`;
    code += `      <Head>\n`;
    code += `        <title>${this.ucfirst(route.name)}</title>\n`;
    code += `        <meta name="description" content="${route.metadata?.description || ''}" />\n`;
    if (route.metadata?.keywords) {
      code += `        <meta name="keywords" content="${route.metadata.keywords.join(', ')}" />\n`;
    }
    code += `      </Head>\n`;
    code += `      <div className="${route.name}">\n`;
    code += `        <h1>${this.ucfirst(route.name)}</h1>\n`;
    code += `        <p>Welcome to the ${route.name} page!</p>\n`;
    if (route.isDynamic) {
      code += `        {/* Query parameters: ${route.params?.join(', ') || ''} */}\n`;
    }
    code += `      </div>\n`;
    code += `    </>\n`;
    code += `  );\n`;
    code += `};\n\n`;
    code += `export default ${this.ucfirst(route.name)}Page;\n`;

    return code;
  }

  /**
   * Generates metadata export for App Router
   */
  public generateMetadata(metadata: NextjsPageMetadata): string {
    let code = 'export const metadata = {\n';

    if (metadata.title) {
      code += `  title: '${metadata.title}',\n`;
    }

    if (metadata.description) {
      code += `  description: '${metadata.description}',\n`;
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      code += `  keywords: [${metadata.keywords.map((k) => `'${k}'`).join(', ')}],\n`;
    }

    if (metadata.openGraph) {
      code += `  openGraph: {\n`;
      if (metadata.openGraph.title) {
        code += `    title: '${metadata.openGraph.title}',\n`;
      }
      if (metadata.openGraph.description) {
        code += `    description: '${metadata.openGraph.description}',\n`;
      }
      if (metadata.openGraph.type) {
        code += `    type: '${metadata.openGraph.type}',\n`;
      }
      code += `  },\n`;
    }

    code += '};\n';

    return code;
  }

  /**
   * Generates layout file
   */
  private generateLayout(route: NextjsPageRoute, config: NextjsPageScaffolderConfig): string {
    let code = '';

    // Layouts are always server components by default
    code += `export default function ${this.ucfirst(route.name)}Layout({\n`;
    code += `  children,\n`;
    if (config.includeTypeScript) {
      code += `}: {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `}) {\n`;
    } else {
      code += '}) {\n';
    }

    code += `  return (\n`;
    code += `    <div className="${route.name}-layout">\n`;
    code += `      <header>\n`;
    code += `        <nav>\n`;
    code += `          {/* Add navigation here */}\n`;
    code += `        </nav>\n`;
    code += `      </header>\n`;
    code += `      <main>{children}</main>\n`;
    code += `      <footer>\n`;
    code += `        {/* Add footer here */}\n`;
    code += `      </footer>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates loading file
   */
  private generateLoading(route: NextjsPageRoute, _config: NextjsPageScaffolderConfig): string {
    let code = '';

    // Loading can use Suspense
    code += `export default function ${this.ucfirst(route.name)}Loading() {\n`;
    code += `  return (\n`;
    code += `    <div className="loading">\n`;
    code += `      <p>Loading ${route.name}...</p>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates error file
   */
  private generateError(route: NextjsPageRoute, config: NextjsPageScaffolderConfig): string {
    let code = '';

    // Error components need 'use client' for better error handling
    code += `'use client';\n\n`;

    if (config.includeTypeScript) {
      code += `interface ErrorProps {\n`;
      code += `  error: Error & { digest?: string };\n`;
      code += `  reset: () => void;\n`;
      code += `}\n\n`;
    }

    code += `export default function ${this.ucfirst(route.name)}Error`;

    if (config.includeTypeScript) {
      code += `({ error, reset }: ErrorProps)`;
    } else {
      code += `({ error, reset })`;
    }

    code += ` {\n`;
    code += `  return (\n`;
    code += `    <div className="error">\n`;
    code += `      <h2>Something went wrong!</h2>\n`;
    code += `      <p>{error?.message || 'An error occurred'}</p>\n`;
    code += `      <button onClick={reset}>Try again</button>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates not-found file
   */
  private generateNotFound(route: NextjsPageRoute, _config: NextjsPageScaffolderConfig): string {
    let code = '';

    code += `export default function ${this.ucfirst(route.name)}NotFound() {\n`;
    code += `  return (\n`;
    code += `    <div className="not-found">\n`;
    code += `      <h2>Not Found</h2>\n`;
    code += `      <p>Could not find requested ${route.name} resource</p>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return (
      str.charAt(0).toUpperCase() +
      str.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    );
  }

  /**
   * Creates the page files at the specified paths
   */
  public async createPageFiles(files: GeneratedPage['files']): Promise<void> {
    for (const [fileType, file] of Object.entries(files)) {
      const uri = vscode.Uri.file(file.path);
      const directory = path.dirname(file.path);

      // Create directory if it doesn't exist
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(directory));
      } catch {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
      }

      // Write file
      await vscode.workspace.fs.writeFile(uri, Buffer.from(file.code, 'utf-8'));

      this.logger.info(`Next.js ${fileType} file created`, { filePath: file.path });
    }
  }
}
