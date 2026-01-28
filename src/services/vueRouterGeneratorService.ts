import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface VueRouteConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeGuards: boolean;
  includeLazyLoading: boolean;
  includeMetaFields: boolean;
  generateNavigationHelpers: boolean;
  defaultRoutePath: string;
  historyMode: 'createWebHistory' | 'createMemoryHistory' | 'createHashHistory';
  exportType: 'named' | 'default';
  routeCompositionStyle: 'array' | 'object';
}

export interface VueRouteMeta {
  title?: string;
  requiresAuth?: boolean;
  roles?: string[];
  layout?: string;
  keepAlive?: boolean;
  transition?: string;
  icon?: string;
  hidden?: boolean;
  [key: string]: unknown;
}

export interface VueRoute {
  path: string;
  name: string;
  componentPath?: string;
  redirectPath?: string;
  alias?: string[];
  props: boolean | Record<string, unknown>;
  meta?: VueRouteMeta;
  children?: VueRoute[];
}

export interface VueRouteGuard {
  type: 'beforeEnter' | 'beforeEach' | 'beforeResolve' | 'afterEach';
  name: string;
  isAsync: boolean;
}

export interface NavigationHelper {
  name: string;
  description: string;
  returnType: string;
  body: string;
}

export interface GeneratedVueRouter {
  routerName: string;
  routerCode: string;
  importPath: string;
  routes: VueRoute[];
  guards: VueRouteGuard[];
  navigationHelpers: NavigationHelper[];
  hasLazyLoading: boolean;
  hasGuards: boolean;
}

/**
 * Service for generating Vue Router configuration with route definitions,
 * guards, lazy loading, typed route objects, and navigation helpers
 */
export class VueRouterGeneratorService {
  private static instance: VueRouterGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): VueRouterGeneratorService {
    VueRouterGeneratorService.instance ??= new VueRouterGeneratorService();
    return VueRouterGeneratorService.instance;
  }

  /**
   * Generates a Vue Router configuration based on user input
   */
  public async generateRouter(
    workspacePath: string,
    config: VueRouteConfig,
  ): Promise<GeneratedVueRouter | null> {
    // Get router name
    const routerName = await this.getRouterName();
    if (!routerName) {
      return null;
    }

    // Collect routes
    const routes = await this.collectRoutes();
    if (!routes || routes.length === 0) {
      vscode.window.showWarningMessage('No routes defined. Router generation cancelled.');
      return null;
    }

    // Collect guards if enabled
    const guards = config.includeGuards ? await this.collectGuards() : [];

    // Collect navigation helpers if enabled
    const navigationHelpers = config.generateNavigationHelpers
      ? await this.collectNavigationHelpers()
      : [];

    // Generate router code
    const routerCode = this.generateRouterCode(
      routerName,
      routes,
      guards,
      navigationHelpers,
      config,
    );

    // Calculate import path
    const importPath = this.calculateImportPath(workspacePath, routerName);

    this.logger.info('Vue Router generated', {
      name: routerName,
      routes: routes.length,
      guards: guards.length,
      navigationHelpers: navigationHelpers.length,
      historyMode: config.historyMode,
    });

    return {
      routerName,
      routerCode,
      importPath,
      routes,
      guards,
      navigationHelpers,
      hasLazyLoading: config.includeLazyLoading,
      hasGuards: guards.length > 0,
    };
  }

  /**
   * Prompts user for router name
   */
  private async getRouterName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter router name (e.g., router, appRouter)',
      placeHolder: 'router',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Router name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Router name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects route information from user
   */
  private async collectRoutes(): Promise<VueRoute[] | null> {
    const routes: VueRoute[] = [];

    let addMore = true;
    while (addMore) {
      const route = await this.createRoute();
      if (route) {
        routes.push(route);
      }

      if (routes.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another route', value: 'add' },
            { label: 'Add child route to last route', value: 'child' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another route, add child route, or finish?' },
        );

        if (!choice) {
          addMore = false;
        } else if (choice.value === 'finish') {
          addMore = false;
        } else if (choice.value === 'child') {
          // Add child routes to the last route
          const children = await this.collectChildRoutes();
          if (children && children.length > 0) {
            const lastRoute = routes[routes.length - 1];
            if (lastRoute) {
              lastRoute.children = children;
            }
          }
        }
      } else {
        addMore = false;
      }
    }

    return routes.length > 0 ? routes : null;
  }

  /**
   * Creates a single route through user interaction
   */
  private async createRoute(): Promise<VueRoute | null> {
    // Get path
    const pathInput = await vscode.window.showInputBox({
      prompt: 'Enter route path (e.g., /users, /users/:id)',
      placeHolder: '/',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Path cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_\-:*?]*$/.test(value)) {
          return 'Path can only contain letters, numbers, slashes, hyphens, colons, asterisks, and question marks';
        }
        return null;
      },
    });

    if (!pathInput) {
      return null;
    }

    const routePath = pathInput.trim();

    // Get route name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter route name',
      placeHolder: this.pathToName(routePath),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Route name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Route name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });

    const routeName = nameInput?.trim() || this.pathToName(routePath);

    // Ask if this is a redirect route
    const isRedirect = await vscode.window.showQuickPick(
      [
        { label: 'Component route', value: false },
        { label: 'Redirect route', value: true },
      ],
      { placeHolder: 'Is this a redirect route?' },
    );

    if (isRedirect?.value) {
      // Get redirect path
      const redirectPath = await vscode.window.showInputBox({
        prompt: 'Enter redirect path',
        placeHolder: '/home',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Redirect path cannot be empty';
          }
          return null;
        },
      });

      if (!redirectPath?.trim()) {
        return null;
      }

      return {
        path: routePath,
        name: routeName,
        redirectPath: redirectPath.trim(),
        props: false,
      };
    }

    // Get component path
    const componentPath = await vscode.window.showInputBox({
      prompt: 'Enter component path (e.g., @/views/UsersView.vue or ./views/UsersView.vue)',
      placeHolder: '@/views/HomeView.vue',
    });

    // If no component path, return null (this is invalid for component routes)
    if (!componentPath?.trim()) {
      return null;
    }

    // Get props configuration
    const propsChoice = await vscode.window.showQuickPick(
      [
        { label: 'No props', value: false },
        { label: 'Pass route params as props', value: true },
        { label: 'Custom props object', value: 'custom' },
      ],
      { placeHolder: 'Configure props for this route?' },
    );

    let props: boolean | Record<string, unknown> = false;
    if (propsChoice?.value === 'custom') {
      const propsObject = await this.getCustomProps();
      props = propsObject;
    } else if (propsChoice?.value === true) {
      props = true;
    }

    // Get alias if any
    const aliasInput = await vscode.window.showInputBox({
      prompt: 'Enter alias paths (comma-separated, optional)',
      placeHolder: '/users-old, /u',
    });

    const alias = aliasInput
      ?.trim()
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    // Get meta fields
    const meta = await this.collectMetaFields();

    const route: VueRoute = {
      path: routePath,
      name: routeName,
      componentPath: componentPath.trim(),
      props,
    };

    if (alias && alias.length > 0) {
      route.alias = alias;
    }

    if (Object.keys(meta).length > 0) {
      route.meta = meta;
    }

    return route;
  }

  /**
   * Collects child routes for a parent route
   */
  private async collectChildRoutes(): Promise<VueRoute[]> {
    const children: VueRoute[] = [];

    let addMore = true;
    while (addMore) {
      const child = await this.createRoute();
      if (child) {
        children.push(child);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another child route', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another child route or done?' },
      );

      if (!choice || choice.value === 'done') {
        addMore = false;
      }
    }

    return children;
  }

  /**
   * Collects meta fields for a route
   */
  private async collectMetaFields(): Promise<VueRouteMeta> {
    const meta: VueRouteMeta = {};

    // Title
    const title = await vscode.window.showInputBox({
      prompt: 'Enter page title (optional)',
      placeHolder: 'My Page',
    });
    if (title) {
      meta.title = title.trim();
    }

    // Requires auth
    const requiresAuth = await vscode.window.showQuickPick(
      [
        { label: 'Public - No authentication required', value: false },
        { label: 'Protected - Requires authentication', value: true },
      ],
      { placeHolder: 'Is this route protected?' },
    );
    if (requiresAuth?.value) {
      meta.requiresAuth = true;
    }

    // Layout
    const layout = await vscode.window.showInputBox({
      prompt: 'Enter layout name (optional)',
      placeHolder: 'Default',
    });
    if (layout) {
      meta.layout = layout.trim();
    }

    // Keep alive
    const keepAlive = await vscode.window.showQuickPick(
      [
        { label: 'No - Do not cache component', value: false },
        { label: 'Yes - Keep component alive in cache', value: true },
      ],
      { placeHolder: 'Should the component be cached with keep-alive?' },
    );
    if (keepAlive?.value) {
      meta.keepAlive = true;
    }

    // Hidden
    const hidden = await vscode.window.showQuickPick(
      [
        { label: 'Visible - Show in menu/sidebar', value: false },
        { label: 'Hidden - Hide from menu/sidebar', value: true },
      ],
      { placeHolder: 'Should this route be hidden from navigation?' },
    );
    if (hidden?.value) {
      meta.hidden = true;
    }

    // Icon
    const icon = await vscode.window.showInputBox({
      prompt: 'Enter icon name (optional)',
      placeHolder: 'home',
    });
    if (icon) {
      meta.icon = icon.trim();
    }

    // Transition
    const transition = await vscode.window.showInputBox({
      prompt: 'Enter transition name (optional)',
      placeHolder: 'fade',
    });
    if (transition) {
      meta.transition = transition.trim();
    }

    return meta;
  }

  /**
   * Collects custom props for a route
   */
  private async getCustomProps(): Promise<Record<string, unknown>> {
    const props: Record<string, unknown> = {};

    let addMore = true;
    while (addMore) {
      const propName = await vscode.window.showInputBox({
        prompt: 'Enter prop name',
        placeHolder: 'myProp',
      });

      if (!propName) {
        addMore = false;
        continue;
      }

      const propValue = await vscode.window.showInputBox({
        prompt: `Enter value for ${propName}`,
        placeHolder: 'true',
      });

      if (propValue) {
        // Try to parse as JSON, otherwise use as string
        try {
          props[propName.trim()] = JSON.parse(propValue.trim());
        } catch {
          props[propName.trim()] = propValue.trim();
        }
      }

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another prop', value: true },
          { label: 'Done', value: false },
        ],
        { placeHolder: 'Add another prop?' },
      );

      if (!addAnother?.value) {
        addMore = false;
      }
    }

    return props;
  }

  /**
   * Collects route guards
   */
  private async collectGuards(): Promise<VueRouteGuard[]> {
    const guards: VueRouteGuard[] = [];

    let addMore = true;
    while (addMore) {
      const guardType = await vscode.window.showQuickPick(
        [
          { label: 'beforeEnter - Guard for specific route', value: 'beforeEnter' as const },
          { label: 'beforeEach - Global before guard', value: 'beforeEach' as const },
          { label: 'beforeResolve - Global resolve guard', value: 'beforeResolve' as const },
          { label: 'afterEach - Global after guard', value: 'afterEach' as const },
        ],
        { placeHolder: 'Select guard type' },
      );

      if (!guardType) {
        addMore = false;
        continue;
      }

      const guardName = await vscode.window.showInputBox({
        prompt: 'Enter guard name',
        placeHolder: `${guardType.value}Guard`,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Guard name cannot be empty';
          }
          return null;
        },
      });

      if (!guardName) {
        continue;
      }

      const isAsync = await vscode.window.showQuickPick(
        [
          { label: 'Sync guard', value: false },
          { label: 'Async guard', value: true },
        ],
        { placeHolder: 'Is this an async guard?' },
      );

      guards.push({
        type: guardType.value,
        name: guardName.trim(),
        isAsync: isAsync?.value ?? false,
      });

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another guard', value: true },
          { label: 'Done', value: false },
        ],
        { placeHolder: 'Add another guard?' },
      );

      if (!addAnother?.value) {
        addMore = false;
      }
    }

    return guards;
  }

  /**
   * Collects navigation helpers
   */
  private async collectNavigationHelpers(): Promise<NavigationHelper[]> {
    const helpers: NavigationHelper[] = [];

    let addMore = true;
    while (addMore) {
      const helperName = await vscode.window.showInputBox({
        prompt: 'Enter helper name',
        placeHolder: 'navigateToUsers',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Helper name cannot be empty';
          }
          return null;
        },
      });

      if (!helperName) {
        addMore = false;
        continue;
      }

      const description = await vscode.window.showInputBox({
        prompt: 'Enter helper description',
        placeHolder: 'Navigate to users page',
      });

      const isAsync = await vscode.window.showQuickPick(
        [
          { label: 'Sync helper', value: false },
          { label: 'Async helper (returns Promise)', value: true },
        ],
        { placeHolder: 'Is this an async helper?' },
      );

      const returnType = isAsync?.value ? 'Promise<void>' : 'void';

      helpers.push({
        name: helperName.trim(),
        description: description?.trim() || '',
        returnType,
        body: `// TODO: Implement ${helperName.trim()}`,
      });

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another helper', value: true },
          { label: 'Done', value: false },
        ],
        { placeHolder: 'Add another helper?' },
      );

      if (!addAnother?.value) {
        addMore = false;
      }
    }

    return helpers;
  }

  /**
   * Generates the router code
   */
  private generateRouterCode(
    routerName: string,
    routes: VueRoute[],
    guards: VueRouteGuard[],
    navigationHelpers: NavigationHelper[],
    config: VueRouteConfig,
  ): string {
    let code = '';

    // Imports
    code += this.generateImports(config);

    // Generate route type definitions if TypeScript
    if (config.includeTypeScript) {
      code += this.generateTypeDefinitions(routes, guards);
    }

    // Generate routes array
    code += this.generateRoutesArray(routes, config);

    // Generate router instance
    code += this.generateRouterInstance(routerName, guards, config);

    // Generate navigation helpers if enabled
    if (navigationHelpers.length > 0) {
      code += this.generateNavigationHelpers(navigationHelpers, routerName, config);
    }

    // Export
    if (config.exportType === 'named') {
      code += `\nexport { ${routerName} };\n`;
    } else {
      code += `\nexport default ${routerName};\n`;
    }

    return code;
  }

  /**
   * Generates imports section
   */
  private generateImports(config: VueRouteConfig): string {
    let code = 'import { ';
    const imports = ['createRouter'];

    // Add history mode import
    imports.push(config.historyMode);

    // Add route record type if TypeScript
    if (config.includeTypeScript) {
      imports.push('RouteRecordRaw');
    }

    code += imports.join(', ');
    code += " } from 'vue-router';\n";

    return code + '\n';
  }

  /**
   * Generates TypeScript type definitions
   */
  private generateTypeDefinitions(_routes: VueRoute[], _guards: VueRouteGuard[]): string {
    let code = '// Route meta interface\n';
    code += 'interface RouteMeta {\n';
    code += '  title?: string;\n';
    code += '  requiresAuth?: boolean;\n';
    code += '  roles?: string[];\n';
    code += '  layout?: string;\n';
    code += '  keepAlive?: boolean;\n';
    code += '  transition?: string;\n';
    code += '  icon?: string;\n';
    code += '  hidden?: boolean;\n';
    code += '  [key: string]: unknown;\n';
    code += '}\n\n';

    // Route record type
    code += '// Custom route record type\n';
    code += 'type AppRouteRecordRaw = RouteRecordRaw & {\n';
    code += '  meta?: RouteMeta;\n';
    code += '};\n\n';

    return code;
  }

  /**
   * Generates routes array
   */
  private generateRoutesArray(routes: VueRoute[], config: VueRouteConfig): string {
    let code = '// Routes\n';
    const typeParam = config.includeTypeScript ? ': AppRouteRecordRaw[]' : '';

    code += `const routes${typeParam} = [\n`;

    for (const route of routes) {
      code += this.generateRouteObject(route, config, '  ');
    }

    code += '];\n\n';

    return code;
  }

  /**
   * Generates a single route object
   */
  private generateRouteObject(route: VueRoute, config: VueRouteConfig, indent: string): string {
    let code = `${indent}{\n`;

    // Path
    code += `${indent}  path: '${route.path}',\n`;

    // Name
    code += `${indent}  name: '${route.name}',\n`;

    // Redirect or component
    if (route.redirectPath) {
      code += `${indent}  redirect: '${route.redirectPath}',\n`;
    } else if (route.componentPath) {
      code += `${indent}  component: () => import('${route.componentPath}'),\n`;
    }

    // Props
    if (route.props !== false) {
      if (typeof route.props === 'boolean') {
        code += `${indent}  props: ${route.props},\n`;
      } else {
        code += `${indent}  props: ${JSON.stringify(route.props)},\n`;
      }
    }

    // Alias
    if (route.alias && route.alias.length > 0) {
      if (route.alias.length === 1) {
        code += `${indent}  alias: '${route.alias[0]}',\n`;
      } else {
        code += `${indent}  alias: [${route.alias.map((a) => `'${a}'`).join(', ')}],\n`;
      }
    }

    // Meta
    if (route.meta && Object.keys(route.meta).length > 0) {
      code += `${indent}  meta: ${JSON.stringify(route.meta, null, 2)
        .split('\n')
        .join('\n' + indent + '  ')},\n`;
    }

    // Children
    if (route.children && route.children.length > 0) {
      code += `${indent}  children: [\n`;
      for (const child of route.children) {
        code += this.generateRouteObject(child, config, indent + '    ');
      }
      code += `${indent}  ],\n`;
    }

    code += `${indent}},\n`;

    return code;
  }

  /**
   * Generates router instance
   */
  private generateRouterInstance(
    routerName: string,
    guards: VueRouteGuard[],
    config: VueRouteConfig,
  ): string {
    let code = `// Create router instance\n`;
    code += `const ${routerName} = createRouter({\n`;
    code += `  history: ${config.historyMode}(),\n`;
    code += `  routes,\n`;
    code += `});\n\n`;

    // Add guards
    for (const guard of guards) {
      if (guard.type === 'beforeEnter') {
        // These are added to individual routes, not the router
        continue;
      }

      code += `// ${guard.type} guard\n`;
      const asyncKeyword = guard.isAsync ? 'async ' : '';
      code += `${routerName}.${guard.type}(${asyncKeyword}(`;

      if (guard.type === 'afterEach') {
        code += 'to, from';
      } else {
        code += 'to, from, next';
      }

      code += ') => {\n';
      code += `  // ${guard.name}\n`;
      code += `  // TODO: Implement guard logic\n`;

      if (guard.type !== 'afterEach') {
        code += `  next();\n`;
      }

      code += '});\n\n';
    }

    return code;
  }

  /**
   * Generates navigation helpers
   */
  private generateNavigationHelpers(
    helpers: NavigationHelper[],
    _routerName: string,
    config: VueRouteConfig,
  ): string {
    let code = '// Navigation helpers\n';

    for (const helper of helpers) {
      const typeAnnotation = config.includeTypeScript ? `: ${helper.returnType}` : '';
      code += `function ${helper.name}()${typeAnnotation} {\n`;
      code += `  // ${helper.description}\n`;
      code += `  ${helper.body}\n`;
      code += '}\n\n';
    }

    return code;
  }

  /**
   * Converts a path to a name (e.g., /users/:id -> users, /user-profile -> userProfile)
   */
  private pathToName(pathInput: string): string {
    return pathInput
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        if (segment.startsWith(':')) {
          return 'id';
        }
        return segment
          .split(/[-_]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');
      })
      .join('');
  }

  /**
   * Calculates the import path for the new router
   */
  private calculateImportPath(sourceFilePath: string, routerName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const routerDir = path.join(sourceDir, 'router');
    return path.join(routerDir, `${routerName}.ts`);
  }

  /**
   * Creates the router file at the specified path
   */
  public async createRouterFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write router file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Vue Router file created', { filePath });
  }

  /**
   * Generates router usage example
   */
  public generateRouterUsage(routerName: string): string {
    return `// In main.ts or main.js:\nimport { createApp } from 'vue';\nimport App from './App.vue';\nimport { ${routerName} } from './router/${routerName}';\n\nconst app = createApp(App);\n\napp.use(${routerName});\n\napp.mount('#app');`;
  }

  /**
   * Generates router registration code
   */
  public generateRouterRegistration(routerName: string): string {
    return `// In main.ts:\nimport { ${routerName} } from './router/${routerName}';\n\napp.use(${routerName});`;
  }
}
