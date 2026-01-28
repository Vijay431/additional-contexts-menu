import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NuxtjsPageGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeMetadata: boolean;
  includeAsyncData: boolean;
  includeUseFetch: boolean;
  includeLayout: boolean;
  includeMiddleware: boolean;
  defaultPagePath: string;
}

export interface NuxtjsPageMetadata {
  title: string | undefined;
  description: string | undefined;
  keywords: string[] | undefined;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

export interface NuxtjsPageRoute {
  name: string;
  routePath: string;
  isDynamic: boolean;
  params: string[] | undefined;
  metadata: NuxtjsPageMetadata | undefined;
  useAsyncData: boolean;
  useUseFetch: boolean;
  hasLayout: boolean;
  hasMiddleware: boolean;
}

export interface GeneratedNuxtPage {
  name: string;
  routePath: string;
  files: {
    page: { path: string; code: string };
    layout?: { path: string; code: string };
    middleware?: { path: string; code: string };
  };
}

/**
 * Service for generating Nuxt 3 pages with proper file-based routing,
 * metadata generation, and TypeScript support. Supports asyncData,
 * useFetch, and SEO optimization patterns.
 */
export class NuxtjsPageGeneratorService {
  private static instance: NuxtjsPageGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NuxtjsPageGeneratorService {
    NuxtjsPageGeneratorService.instance ??= new NuxtjsPageGeneratorService();
    return NuxtjsPageGeneratorService.instance;
  }

  /**
   * Generates a Nuxt 3 page based on user input
   */
  public async generatePage(
    _workspacePath: string,
    config: NuxtjsPageGeneratorConfig,
  ): Promise<GeneratedNuxtPage | null> {
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

    // Get async data options
    const useAsyncData = config.includeAsyncData && (await this.askForFeature('asyncData'));
    const useUseFetch = config.includeUseFetch && (await this.askForFeature('useFetch'));

    // Get additional files
    const hasLayout = config.includeLayout && (await this.askForFile('layout'));
    const hasMiddleware = config.includeMiddleware && (await this.askForFile('middleware'));

    const pageRoute: NuxtjsPageRoute = {
      name: pageName,
      routePath,
      isDynamic,
      params,
      metadata,
      useAsyncData,
      useUseFetch,
      hasLayout,
      hasMiddleware,
    };

    // Generate files
    const files = this.generatePageFiles(pageRoute, config);

    this.logger.info('Nuxt 3 page generated', {
      name: pageName,
      path: routePath,
      useAsyncData,
      useUseFetch,
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
    _config: NuxtjsPageGeneratorConfig,
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
  private async collectMetadata(): Promise<NuxtjsPageMetadata | undefined> {
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
      placeHolder: 'nuxtjs, vue, typescript',
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
    route: NuxtjsPageRoute,
    config: NuxtjsPageGeneratorConfig,
  ): GeneratedNuxtPage['files'] {
    const basePath = config.defaultPagePath || 'pages';

    // Page file
    const pagePath = this.calculatePageFilePath(basePath, route.routePath);
    const pageCode = this.generatePageCode(route, config);

    const files: GeneratedNuxtPage['files'] = {
      page: { path: pagePath, code: pageCode },
    };

    // Layout file
    if (route.hasLayout) {
      const layoutPath = path.join(basePath, 'layouts', `${route.name}.vue`);
      const layoutCode = this.generateLayout(route, config);
      files.layout = { path: layoutPath, code: layoutCode };
    }

    // Middleware file
    if (route.hasMiddleware) {
      const middlewarePath = path.join(basePath, 'middleware', `${route.name}.ts`);
      const middlewareCode = this.generateMiddleware(route, config);
      files.middleware = { path: middlewarePath, code: middlewareCode };
    }

    return files;
  }

  /**
   * Calculates file path for page
   */
  private calculatePageFilePath(basePath: string, routePath: string): string {
    // Convert route path to file path
    // e.g., "blog/posts/[slug]" -> "pages/blog/posts/[slug].vue"
    // e.g., "index" -> "pages/index.vue"

    if (routePath === 'index' || routePath === '') {
      return path.join(basePath, 'index.vue');
    }
    return path.join(basePath, `${routePath}.vue`);
  }

  /**
   * Generates page code
   */
  private generatePageCode(route: NuxtjsPageRoute, config: NuxtjsPageGeneratorConfig): string {
    let code = '';

    // Script setup section
    code += `<script setup lang="${config.includeTypeScript ? 'ts' : 'js'}">\n`;

    // Add imports
    code += this.generateImports(route, config);

    // Add props interface for TypeScript dynamic routes
    if (config.includeTypeScript && route.isDynamic) {
      code += `interface PageProps {\n`;
      for (const param of route.params || []) {
        code += `  ${param}: string;\n`;
      }
      code += `}\n\n`;
    }

    // Add props for dynamic routes
    if (route.isDynamic) {
      code += `const props = defineProps<${config.includeTypeScript ? 'PageProps' : '{}'}>();\n\n`;
    }

    // Get route params
    if (route.isDynamic) {
      code += `const route = useRoute();\n`;
      code += `const ${(route.params && route.params[0]) || 'param'} = route.params.${(route.params && route.params[0]) || 'param'};\n\n`;
    }

    // Add asyncData or useFetch
    if (route.useAsyncData) {
      code += this.generateAsyncData(route, config);
    } else if (route.useUseFetch) {
      code += this.generateUseFetch(route, config);
    }

    // Add metadata
    if (route.metadata && config.includeMetadata) {
      code += this.generateUseHead(route.metadata);
    }

    code += `</script>\n\n`;

    // Template section
    code += `<template>\n`;
    code += `  <div class="${route.name}-page">\n`;
    code += `    <h1>${this.ucfirst(route.name)}</h1>\n`;
    code += `    <p>Welcome to the ${route.name} page!</p>\n`;

    if (route.isDynamic) {
      code += `    <p>Param: {{ ${(route.params && route.params[0]) || 'param'} }}</p>\n`;
    }

    if (route.useAsyncData) {
      code += `    <div v-if="pending">Loading...</div>\n`;
      code += `    <div v-else-if="error">Error: {{ error.message }}</div>\n`;
      code += `    <div v-else>\n`;
      code += `      <pre>{{ data }}</pre>\n`;
      code += `    </div>\n`;
    } else if (route.useUseFetch) {
      code += `    <div v-if="pending">Loading...</div>\n`;
      code += `    <div v-else-if="error">Error: {{ error.message }}</div>\n`;
      code += `    <div v-else>\n`;
      code += `      <pre>{{ data }}</pre>\n`;
      code += `    </div>\n`;
    }

    code += `  </div>\n`;
    code += `</template>\n`;

    // Style section
    code += `\n<style scoped>\n`;
    code += `.${route.name}-page {\n`;
    code += `  padding: 20px;\n`;
    code += `}\n`;
    code += `</style>\n`;

    return code;
  }

  /**
   * Generates imports
   */
  private generateImports(route: NuxtjsPageRoute, _config: NuxtjsPageGeneratorConfig): string {
    let code = '';

    // Nuxt composables
    if (route.isDynamic) {
      code += `const { useRoute } = await import('#app');\n`;
    }

    if (route.useAsyncData || route.useUseFetch || route.metadata) {
      code += `const { useAsyncData, useFetch, useHead } = await import('#app');\n`;
    }

    if (code) {
      code += '\n';
    }

    return code;
  }

  /**
   * Generates asyncData code
   */
  private generateAsyncData(route: NuxtjsPageRoute, _config: NuxtjsPageGeneratorConfig): string {
    let code = '';

    code += `const { data, pending, error } = await useAsyncData(\n`;
    code += `  '${route.name}',\n`;
    code += `  async () => {\n`;
    code += `    // TODO: Implement your data fetching logic here\n`;
    code += `    return { message: 'Data from asyncData' };\n`;
    code += `  }\n`;
    code += `);\n\n`;

    return code;
  }

  /**
   * Generates useFetch code
   */
  private generateUseFetch(route: NuxtjsPageRoute, _config: NuxtjsPageGeneratorConfig): string {
    let code = '';

    code += `const { data, pending, error } = await useFetch(\n`;
    code += `  '/api/${route.name}',\n`;
    code += `  {\n`;
    code += `    // TODO: Add fetch options\n`;
    code += `  }\n`;
    code += `);\n\n`;

    return code;
  }

  /**
   * Generates useHead metadata
   */
  private generateUseHead(metadata: NuxtjsPageMetadata): string {
    let code = '';

    code += `useHead({\n`;

    if (metadata.title) {
      code += `  title: '${metadata.title}',\n`;
    }

    code += `  meta: [\n`;

    if (metadata.description) {
      code += `    { name: 'description', content: '${metadata.description}' },\n`;
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      code += `    { name: 'keywords', content: '${metadata.keywords.join(', ')}' },\n`;
    }

    if (metadata.ogTitle) {
      code += `    { property: 'og:title', content: '${metadata.ogTitle}' },\n`;
    }

    if (metadata.ogDescription) {
      code += `    { property: 'og:description', content: '${metadata.ogDescription}' },\n`;
    }

    if (metadata.ogImage) {
      code += `    { property: 'og:image', content: '${metadata.ogImage}' },\n`;
    }

    if (metadata.twitterCard) {
      code += `    { name: 'twitter:card', content: '${metadata.twitterCard}' },\n`;
    }

    code += `  ]\n`;
    code += `});\n\n`;

    return code;
  }

  /**
   * Generates layout file
   */
  private generateLayout(route: NuxtjsPageRoute, _config: NuxtjsPageGeneratorConfig): string {
    let code = '';

    code += `<template>\n`;
    code += `  <div class="${route.name}-layout">\n`;
    code += `    <header>\n`;
    code += `      <nav>\n`;
    code += `        <!-- Add navigation here -->\n`;
    code += `      </nav>\n`;
    code += `    </header>\n`;
    code += `    <main>\n`;
    code += `      <slot />\n`;
    code += `    </main>\n`;
    code += `    <footer>\n`;
    code += `      <!-- Add footer here -->\n`;
    code += `    </footer>\n`;
    code += `  </div>\n`;
    code += `</template>\n\n`;

    code += `<style scoped>\n`;
    code += `.${route.name}-layout {\n`;
    code += `  min-height: 100vh;\n`;
    code += `  display: flex;\n`;
    code += `  flex-direction: column;\n`;
    code += `}\n\n`;
    code += `main {\n`;
    code += `  flex: 1;\n`;
    code += `}\n`;
    code += `</style>\n`;

    return code;
  }

  /**
   * Generates middleware file
   */
  private generateMiddleware(route: NuxtjsPageRoute, _config: NuxtjsPageGeneratorConfig): string {
    let code = '';

    code += `export default defineNuxtRouteMiddleware((to, from) => {\n`;
    code += `  // TODO: Implement your middleware logic here\n`;
    code += `  console.log('Navigating to:', to.path);\n`;
    code += `  console.log('Navigating from:', from.path);\n\n`;
    code += `  // Example: Authentication check\n`;
    code += `  // const { authenticated } = useAuth();\n`;
    code += `  // if (!authenticated) {\n`;
    code += `  //   return navigateTo('/login');\n`;
    code += `  // }\n`;
    code += `});\n`;

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
  public async createPageFiles(files: GeneratedNuxtPage['files']): Promise<void> {
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

      this.logger.info(`Nuxt 3 ${fileType} file created`, { filePath: file.path });
    }
  }
}
