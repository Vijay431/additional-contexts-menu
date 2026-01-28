import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SveltekitPageGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeMetadata: boolean;
  includeLoadFunction: boolean;
  includeServerLoad: boolean;
  includeActions: boolean;
  includeErrorHandling: boolean;
  defaultPagePath: string;
}

export interface SveltekitPageMetadata {
  title: string | undefined;
  description: string | undefined;
  keywords: string[] | undefined;
}

export interface SveltekitPageRoute {
  name: string;
  routePath: string;
  isDynamic: boolean;
  params: string[] | undefined;
  metadata: SveltekitPageMetadata | undefined;
  hasLoadFunction: boolean;
  hasServerLoad: boolean;
  hasActions: boolean;
  hasErrorHandling: boolean;
}

export interface GeneratedSveltekitPage {
  name: string;
  routePath: string;
  files: {
    page: { path: string; code: string };
    server?: { path: string; code: string };
    error?: { path: string; code: string };
  };
}

/**
 * Service for generating SvelteKit pages with proper routing structure,
 * load functions, form actions, and TypeScript support. Creates pages
 * with proper data fetching, form handling, and error handling patterns.
 */
export class SveltekitPageGeneratorService {
  private static instance: SveltekitPageGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SveltekitPageGeneratorService {
    SveltekitPageGeneratorService.instance ??= new SveltekitPageGeneratorService();
    return SveltekitPageGeneratorService.instance;
  }

  /**
   * Generates a SvelteKit page based on user input
   */
  public async generatePage(
    _workspacePath: string,
    config: SveltekitPageGeneratorConfig,
  ): Promise<GeneratedSveltekitPage | null> {
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

    // Get load function options
    const hasLoadFunction =
      config.includeLoadFunction && (await this.askForFeature('load function'));
    const hasServerLoad =
      config.includeServerLoad &&
      (await this.askForFeature('server load function (+page.server.ts)'));
    const hasActions = config.includeActions && (await this.askForFeature('form actions'));
    const hasErrorHandling =
      config.includeErrorHandling && (await this.askForFeature('error handling (+error.svelte)'));

    const pageRoute: SveltekitPageRoute = {
      name: pageName,
      routePath,
      isDynamic,
      params,
      metadata,
      hasLoadFunction,
      hasServerLoad,
      hasActions,
      hasErrorHandling,
    };

    // Generate files
    const files = this.generatePageFiles(pageRoute, config);

    this.logger.info('SvelteKit page generated', {
      name: pageName,
      path: routePath,
      hasLoadFunction,
      hasServerLoad,
      hasActions,
    });

    return {
      name: pageName,
      routePath,
      files,
    };
  }

  /**
   * Prompts user for page name
   */
  private async getPageName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter page name (e.g., dashboard, user-profile, blog-[slug])',
      placeHolder: 'my-page',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Page name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-_]*$/i.test(value)) {
          return 'Page name must start with a letter and contain only letters, numbers, and hyphens';
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
    _config: SveltekitPageGeneratorConfig,
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
  private async collectMetadata(): Promise<SveltekitPageMetadata | undefined> {
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
      placeHolder: 'sveltekit, svelte, typescript',
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
   * Asks if user wants to include a specific feature
   */
  private async askForFeature(feature: string): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      {
        placeHolder: `Include ${feature}?`,
      },
    );

    return choice?.value === 'yes';
  }

  /**
   * Generates page files
   */
  public generatePageFiles(
    route: SveltekitPageRoute,
    config: SveltekitPageGeneratorConfig,
  ): GeneratedSveltekitPage['files'] {
    const basePath = config.defaultPagePath || 'src/routes';

    // Page file
    const pagePath = this.calculatePageFilePath(basePath, route.routePath);
    const pageCode = this.generatePageCode(route, config);

    const files: GeneratedSveltekitPage['files'] = {
      page: { path: pagePath, code: pageCode },
    };

    // Server load function file
    if (route.hasServerLoad) {
      const serverPath = this.calculateServerFilePath(basePath, route.routePath);
      const serverCode = this.generateServerCode(route, config);
      files.server = { path: serverPath, code: serverCode };
    }

    // Error handling file
    if (route.hasErrorHandling) {
      const errorPath = this.calculateErrorFilePath(basePath, route.routePath);
      const errorCode = this.generateErrorCode(route, config);
      files.error = { path: errorPath, code: errorCode };
    }

    return files;
  }

  /**
   * Calculates file path for page
   */
  private calculatePageFilePath(basePath: string, routePath: string): string {
    // Convert route path to file path
    // e.g., "blog/posts/[slug]" -> "src/routes/blog/posts/[slug]/+page.svelte"
    // e.g., "about" -> "src/routes/about/+page.svelte"
    if (routePath === '' || routePath === 'index') {
      return path.join(basePath, '+page.svelte');
    }
    return path.join(basePath, routePath, '+page.svelte');
  }

  /**
   * Calculates file path for server load function
   */
  private calculateServerFilePath(basePath: string, routePath: string): string {
    if (routePath === '' || routePath === 'index') {
      return path.join(basePath, '+page.server.ts');
    }
    return path.join(basePath, routePath, '+page.server.ts');
  }

  /**
   * Calculates file path for error page
   */
  private calculateErrorFilePath(basePath: string, routePath: string): string {
    if (routePath === '' || routePath === 'index') {
      return path.join(basePath, '+error.svelte');
    }
    return path.join(basePath, routePath, '+error.svelte');
  }

  /**
   * Generates page code
   */
  private generatePageCode(
    route: SveltekitPageRoute,
    config: SveltekitPageGeneratorConfig,
  ): string {
    let code = '';

    // Script section
    const langAttr = config.includeTypeScript ? 'lang="ts"' : '';
    code += `<script ${langAttr}>\n`;

    // Add exports for page data
    if (route.hasLoadFunction || route.hasServerLoad) {
      if (config.includeTypeScript) {
        code += `  import type { PageData } from './$types';\n\n`;
        code += `  export let data: PageData;\n`;
      } else {
        code += `  export let data;\n`;
      }
      code += '\n';
    }

    // Add form action exports
    if (route.hasActions) {
      if (config.includeTypeScript) {
        code += `  import type { Actions } from './$types';\n\n`;
        code += `  export const actions: Actions = {\n`;
      } else {
        code += `  export const actions = {\n`;
      }
      code += `    default: async ({ request }) => {\n`;
      code += `      const formData = await request.formData();\n`;
      code += `      // TODO: Process form data\n`;
      code += `      return { success: true };\n`;
      code += `    }\n`;
      code += `  };\n\n`;
    }

    code += `</script>\n\n`;

    // Add metadata with svelte:head
    if (route.metadata && config.includeMetadata) {
      code += `<svelte:head>\n`;
      if (route.metadata.title) {
        code += `  <title>${route.metadata.title}</title>\n`;
      }
      if (route.metadata.description) {
        code += `  <meta name="description" content="${route.metadata.description}" />\n`;
      }
      if (route.metadata.keywords && route.metadata.keywords.length > 0) {
        code += `  <meta name="keywords" content="${route.metadata.keywords.join(', ')}" />\n`;
      }
      code += `</svelte:head>\n\n`;
    }

    // Template section
    code += `<div class="${route.name}-page">\n`;
    code += `  <h1>${this.ucfirst(route.name)}</h1>\n`;
    code += `  <p>Welcome to the ${route.name} page!</p>\n`;

    if (route.isDynamic) {
      code += `  {#if data.params}\n`;
      code += `    <p>Params: {data.params}</p>\n`;
      code += `  {/if}\n`;
    }

    if (route.hasLoadFunction || route.hasServerLoad) {
      code += `  {#if data}\n`;
      code += `    <pre>{JSON.stringify(data, null, 2)}</pre>\n`;
      code += `  {/if}\n`;
    }

    if (route.hasActions) {
      code += `  <form method="POST">\n`;
      code += `    <button type="submit">Submit</button>\n`;
      code += `  </form>\n`;
    }

    code += `</div>\n`;

    return code;
  }

  /**
   * Generates server load function code
   */
  private generateServerCode(
    route: SveltekitPageRoute,
    _config: SveltekitPageGeneratorConfig,
  ): string {
    let code = '';

    code += `import type { PageServerLoad } from './$types';\n\n`;

    if (route.isDynamic) {
      code += `export const load: PageServerLoad = async ({ params }) => {\n`;
      code += `  // Access route parameters via params\n`;
      for (const param of route.params || []) {
        code += `  const ${param} = params.${param};\n`;
      }
      code += '\n';
    } else {
      code += `export const load: PageServerLoad = async () => {\n`;
    }

    code += `  // TODO: Fetch data from database or API\n`;
    code += `  const data = {\n`;
    code += `    message: 'Data from server load function',\n`;
    if (route.isDynamic && route.params) {
      code += `    params: {\n`;
      for (const param of route.params || []) {
        code += `      ${param},\n`;
      }
      code += `    },\n`;
    }
    code += `  };\n\n`;
    code += `  return data;\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates error page code
   */
  private generateErrorCode(
    route: SveltekitPageRoute,
    _config: SveltekitPageGeneratorConfig,
  ): string {
    let code = '';

    const langAttr = _config.includeTypeScript ? 'lang="ts"' : '';
    code += `<script ${langAttr}>\n`;
    if (_config.includeTypeScript) {
      code += `  import type { Load } from './$types';\n`;
      code += `  export let data: { status: number; error: Error };\n`;
    } else {
      code += `  export let data;\n`;
    }
    code += `</script>\n\n`;

    code += `<div class="error-page">\n`;
    code += `  <h1>{data.status}: {data.error?.message || 'An error occurred'}</h1>\n`;
    code += `  <p>Something went wrong in ${route.name} page.</p>\n`;
    code += `  <a href="/">Go back home</a>\n`;
    code += `</div>\n`;

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
  public async createPageFiles(files: GeneratedSveltekitPage['files']): Promise<void> {
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

      this.logger.info(`SvelteKit ${fileType} file created`, { filePath: file.path });
    }
  }
}
