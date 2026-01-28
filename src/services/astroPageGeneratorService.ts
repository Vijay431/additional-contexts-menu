import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface AstroPageGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeMetadata: boolean;
  includeLayout: boolean;
  include404: boolean;
  includeSSR: boolean;
  defaultPagePath: string;
}

export interface AstroPageMetadata {
  title: string | undefined;
  description: string | undefined;
  keywords: string[] | undefined;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

export interface AstroPageRoute {
  name: string;
  routePath: string;
  isDynamic: boolean;
  params: string[] | undefined;
  metadata: AstroPageMetadata | undefined;
  hasLayout: boolean;
  has404: boolean;
  includeSSR: boolean;
}

export interface GeneratedAstroPage {
  name: string;
  routePath: string;
  files: {
    page: { path: string; code: string };
    layout?: { path: string; code: string };
    notFound?: { path: string; code: string };
  };
}

/**
 * Service for generating Astro pages with proper file-based routing,
 * metadata generation, TypeScript support, and SEO optimization.
 * Supports static generation, server-side rendering, and component composition.
 */
export class AstroPageGeneratorService {
  private static instance: AstroPageGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): AstroPageGeneratorService {
    AstroPageGeneratorService.instance ??= new AstroPageGeneratorService();
    return AstroPageGeneratorService.instance;
  }

  /**
   * Generates an Astro page based on user input
   */
  public async generatePage(
    _workspacePath: string,
    config: AstroPageGeneratorConfig,
  ): Promise<GeneratedAstroPage | null> {
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

    // Get additional files
    const hasLayout = config.includeLayout && (await this.askForFile('layout'));
    const has404 = config.include404 && (await this.askForFile('404 page'));

    const pageRoute: AstroPageRoute = {
      name: pageName,
      routePath,
      isDynamic,
      params,
      metadata,
      hasLayout,
      has404,
      includeSSR: config.includeSSR,
    };

    // Generate files
    const files = this.generatePageFiles(pageRoute, config);

    this.logger.info('Astro page generated', {
      name: pageName,
      path: routePath,
      includeSSR: config.includeSSR,
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
      prompt: 'Enter page name (e.g., dashboard, user-profile, blog/[slug])',
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
    _config: AstroPageGeneratorConfig,
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
  private async collectMetadata(): Promise<AstroPageMetadata | undefined> {
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
      placeHolder: 'astro, typescript, web',
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
   * Generates page files
   */
  public generatePageFiles(
    route: AstroPageRoute,
    config: AstroPageGeneratorConfig,
  ): GeneratedAstroPage['files'] {
    const basePath = config.defaultPagePath || 'src/pages';

    // Page file
    const pagePath = this.calculatePageFilePath(basePath, route.routePath);
    const pageCode = this.generatePageCode(route, config);

    const files: GeneratedAstroPage['files'] = {
      page: { path: pagePath, code: pageCode },
    };

    // Layout file
    if (route.hasLayout) {
      const layoutPath = path.join('src/layouts', `${route.name}.astro`);
      const layoutCode = this.generateLayout(route, config);
      files.layout = { path: layoutPath, code: layoutCode };
    }

    // 404 file
    if (route.has404) {
      const notFoundPath = path.join(basePath, '404.astro');
      const notFoundCode = this.generateNotFound(route, config);
      files.notFound = { path: notFoundPath, code: notFoundCode };
    }

    return files;
  }

  /**
   * Calculates file path for page
   */
  private calculatePageFilePath(basePath: string, routePath: string): string {
    // Convert route path to file path
    // e.g., "blog/posts/[slug]" -> "src/pages/blog/posts/[slug].astro"
    // e.g., "index" -> "src/pages/index.astro"

    if (routePath === 'index' || routePath === '') {
      return path.join(basePath, 'index.astro');
    }
    return path.join(basePath, `${routePath}.astro`);
  }

  /**
   * Generates page code
   */
  private generatePageCode(route: AstroPageRoute, config: AstroPageGeneratorConfig): string {
    let code = '';

    // Frontmatter with TypeScript
    code += `---\n`;

    if (config.includeTypeScript) {
      code += `// Type definitions\n`;
      if (route.isDynamic) {
        code += `interface Props {\n`;
        for (const param of route.params || []) {
          code += `  ${param}: string;\n`;
        }
        code += `}\n\n`;
        code += `const { ${(route.params && route.params.join(', ')) || ''} }: Props = Astro.props;\n`;
      }
      code += `\n`;
    } else if (route.isDynamic) {
      code += `const { ${(route.params && route.params.join(', ')) || ''} } = Astro.props;\n`;
      code += `\n`;
    }

    // Add metadata
    if (route.metadata && config.includeMetadata) {
      code += this.generateMetadata(route.metadata);
      code += `\n`;
    }

    // SSR example
    if (route.includeSSR) {
      code += `// Example server-side data fetching\n`;
      code += `const data = await fetch('https://api.example.com/data').then(r => r.json());\n`;
      code += `\n`;
    }

    code += `---\n\n`;

    // Template section
    code += `<html lang="en">\n`;
    code += `<head>\n`;
    code += `  <meta charset="utf-8" />\n`;
    code += `  <meta name="viewport" content="width=device-width" />\n`;
    code += `  <meta name="generator" content={Astro.generator} />\n`;
    if (route.metadata?.title) {
      code += `  <title>${route.metadata.title}</title>\n`;
    }
    code += `</head>\n`;
    code += `<body>\n`;
    code += `  <h1>${this.ucfirst(route.name)}</h1>\n`;
    code += `  <p>Welcome to the ${route.name} page!</p>\n`;

    if (route.isDynamic) {
      code += `  <div>\n`;
      code += `    <p>Route parameters:</p>\n`;
      code += `    <ul>\n`;
      for (const param of route.params || []) {
        code += `      <li><strong>${param}:</strong> {${param}}</li>\n`;
      }
      code += `    </ul>\n`;
      code += `  </div>\n`;
    }

    if (route.includeSSR) {
      code += `  <div>\n`;
      code += `    <h2>Server-Side Data</h2>\n`;
      code += `    <pre>{JSON.stringify(data, null, 2)}</pre>\n`;
      code += `  </div>\n`;
    }

    code += `</body>\n`;
    code += `</html>\n`;

    return code;
  }

  /**
   * Generates metadata in frontmatter
   */
  private generateMetadata(metadata: AstroPageMetadata): string {
    let code = '';

    // SEO metadata
    if (metadata.title) {
      code += `const title = '${metadata.title}';\n`;
    }

    if (metadata.description) {
      code += `const description = '${metadata.description}';\n`;
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      code += `const keywords = [${metadata.keywords.map((k) => `'${k}'`).join(', ')}];\n`;
    }

    code += `\n`;
    code += `// SEO metadata\n`;
    code += `export const metadata = {\n`;

    if (metadata.title) {
      code += `  title,\n`;
    }

    if (metadata.description) {
      code += `  description,\n`;
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      code += `  keywords,\n`;
    }

    if (metadata.ogTitle) {
      code += `  openGraph: {\n`;
      code += `    title: '${metadata.ogTitle}',\n`;
      if (metadata.ogDescription) {
        code += `    description: '${metadata.ogDescription}',\n`;
      }
      if (metadata.ogImage) {
        code += `    image: '${metadata.ogImage}',\n`;
      }
      code += `  },\n`;
    }

    if (metadata.twitterCard) {
      code += `  twitter: {\n`;
      code += `    card: '${metadata.twitterCard}',\n`;
      if (metadata.twitterCard) {
        code += `    title: '${metadata.ogTitle || metadata.title}',\n`;
      }
      code += `  },\n`;
    }

    code += `};\n`;

    return code;
  }

  /**
   * Generates layout file
   */
  private generateLayout(route: AstroPageRoute, config: AstroPageGeneratorConfig): string {
    let code = '';

    code += `---\n`;
    code += `interface Props {\n`;
    code += `  title?: string;\n`;
    if (config.includeTypeScript) {
      code += `  [key: string]: any;\n`;
    }
    code += `}\n\n`;
    code += `const { title = '${this.ucfirst(route.name)}' }: Props = Astro.props;\n`;
    code += `---\n\n`;

    code += `<html lang="en">\n`;
    code += `<head>\n`;
    code += `  <meta charset="utf-8" />\n`;
    code += `  <meta name="viewport" content="width=device-width" />\n`;
    code += `  <title>{title}</title>\n`;
    code += `</head>\n`;
    code += `<body>\n`;
    code += `  <header>\n`;
    code += `    <nav>\n`;
    code += `      <a href="/">Home</a>\n`;
    code += `      <a href="/${route.name}">${this.ucfirst(route.name)}</a>\n`;
    code += `    </nav>\n`;
    code += `  </header>\n`;
    code += `  <main>\n`;
    code += `    <slot />\n`;
    code += `  </main>\n`;
    code += `  <footer>\n`;
    code += `    <p>&copy; {new Date().getFullYear()} My Site</p>\n`;
    code += `  </footer>\n`;
    code += `</body>\n`;
    code += `</html>\n`;

    return code;
  }

  /**
   * Generates 404 page
   */
  private generateNotFound(route: AstroPageRoute, _config: AstroPageGeneratorConfig): string {
    let code = '';

    code += `---\n`;
    code += `// 404 Page\n`;
    code += `---\n\n`;

    code += `<html lang="en">\n`;
    code += `<head>\n`;
    code += `  <meta charset="utf-8" />\n`;
    code += `  <meta name="viewport" content="width=device-width" />\n`;
    code += `  <title>404 - Page Not Found</title>\n`;
    code += `</head>\n`;
    code += `<body>\n`;
    code += `  <h1>404 - Page Not Found</h1>\n`;
    code += `  <p>Sorry, the page you're looking for doesn't exist.</p>\n`;
    code += `  <a href="/">Go back home</a>\n`;
    code += `</body>\n`;
    code += `</html>\n`;

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
  public async createPageFiles(files: GeneratedAstroPage['files']): Promise<void> {
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

      this.logger.info(`Astro ${fileType} file created`, { filePath: file.path });
    }
  }
}
