import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ExpressMiddlewarePipelineConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeJSDoc: boolean;
  defaultRoutePath: string;
  exportType: 'named' | 'default';
  allowCustomMiddleware: boolean;
}

export interface ExpressMiddlewareDefinition {
  name: string;
  type: 'built-in' | 'custom' | 'error-handler';
  importPath?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface GeneratedMiddlewarePipeline {
  name: string;
  filePath: string;
  middleware: ExpressMiddlewareDefinition[];
  imports: string[];
  pipelineCode: string;
  routerCode: string;
}

/**
 * Service for building Express middleware pipelines with visual drag-and-drop interface
 * Generates proper middleware code with next() calls and error handling patterns
 */
export class ExpressMiddlewarePipelineService {
  private static instance: ExpressMiddlewarePipelineService | undefined;
  private logger: Logger;

  private readonly BUILTIN_MIDDLEWARE = [
    {
      label: 'express.json()',
      description: 'Parse JSON request bodies',
      name: 'json',
      type: 'built-in' as const,
      importPath: 'express',
      code: 'express.json()',
    },
    {
      label: 'express.urlencoded()',
      description: 'Parse URL-encoded request bodies',
      name: 'urlencoded',
      type: 'built-in' as const,
      importPath: 'express',
      code: 'express.urlencoded({ extended: true })',
    },
    {
      label: 'cors',
      description: 'Enable Cross-Origin Resource Sharing',
      name: 'cors',
      type: 'built-in' as const,
      importPath: 'cors',
      code: 'cors()',
    },
    {
      label: 'helmet',
      description: 'Secure HTTP headers',
      name: 'helmet',
      type: 'built-in' as const,
      importPath: 'helmet',
      code: 'helmet()',
    },
    {
      label: 'morgan',
      description: 'HTTP request logger',
      name: 'morgan',
      type: 'built-in' as const,
      importPath: 'morgan',
      code: "morgan('dev')",
    },
    {
      label: 'compression',
      description: 'Compress response bodies',
      name: 'compression',
      type: 'built-in' as const,
      importPath: 'compression',
      code: 'compression()',
    },
    {
      label: 'cookie-parser',
      description: 'Parse Cookie header',
      name: 'cookieParser',
      type: 'built-in' as const,
      importPath: 'cookie-parser',
      code: 'cookieParser()',
    },
    {
      label: 'express.static',
      description: 'Serve static files',
      name: 'static',
      type: 'built-in' as const,
      importPath: 'express',
      code: "express.static('public')",
    },
    {
      label: 'rate-limit',
      description: 'Rate limiting middleware',
      name: 'rateLimit',
      type: 'built-in' as const,
      importPath: 'express-rate-limit',
      code: 'rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })',
    },
    {
      label: 'Custom Middleware',
      description: 'Add your own middleware function',
      name: 'custom',
      type: 'custom' as const,
    },
  ];

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ExpressMiddlewarePipelineService {
    ExpressMiddlewarePipelineService.instance ??= new ExpressMiddlewarePipelineService();
    return ExpressMiddlewarePipelineService.instance;
  }

  /**
   * Builds a middleware pipeline through interactive UI
   */
  public async buildMiddlewarePipeline(
    workspacePath: string,
    config: ExpressMiddlewarePipelineConfig,
  ): Promise<GeneratedMiddlewarePipeline | null> {
    // Get pipeline name
    const pipelineName = await this.getPipelineName();
    if (!pipelineName) {
      return null;
    }

    // Collect middleware through interactive selection
    const middleware = await this.collectMiddleware(config);
    if (!middleware || middleware.length === 0) {
      vscode.window.showWarningMessage('No middleware selected. Pipeline creation cancelled.');
      return null;
    }

    // Ask if user wants to create a router with this pipeline
    const createRouter = await vscode.window.showQuickPick(
      [
        { label: 'Yes, create a router', value: true },
        { label: 'No, just the middleware chain', value: false },
      ],
      { placeHolder: 'Create a router with this middleware pipeline?' },
    );

    if (!createRouter) {
      return null;
    }

    // Generate imports
    const imports = this.generateImports(middleware, config);

    // Generate pipeline code
    const pipelineCode = this.generatePipelineCode(pipelineName, middleware, imports, config);

    // Generate router code if requested
    const routerCode = createRouter.value
      ? this.generateRouterCode(pipelineName, middleware, config)
      : '';

    // Determine file path
    const fileName = this.kebabCase(pipelineName);
    const filePath = path.join(workspacePath, 'src', 'middleware', `${fileName}.ts`);

    this.logger.info('Middleware pipeline generated', {
      name: pipelineName,
      middleware: middleware.length,
    });

    return {
      name: pipelineName,
      filePath,
      middleware,
      imports,
      pipelineCode,
      routerCode,
    };
  }

  /**
   * Gets pipeline name from user
   */
  private async getPipelineName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter middleware pipeline name (e.g., api, app, auth)',
      placeHolder: 'api',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Pipeline name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Pipeline name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects middleware through interactive selection
   */
  private async collectMiddleware(
    config: ExpressMiddlewarePipelineConfig,
  ): Promise<ExpressMiddlewareDefinition[] | null> {
    const selected: ExpressMiddlewareDefinition[] = [];

    let addMore = true;
    while (addMore) {
      const choice = await vscode.window.showQuickPick(
        [
          ...this.BUILTIN_MIDDLEWARE.map((mw) => ({
            label: mw.label,
            description: mw.description,
            value: mw,
          })),
          { label: '$(plus) Add custom middleware', description: 'Define your own middleware', value: 'custom' },
          { label: 'Done', description: 'Finish adding middleware', value: 'done' },
        ],
        {
          placeHolder: 'Select middleware to add to the pipeline',
        },
      );

      if (!choice || choice.value === 'done') {
        addMore = false;
        continue;
      }

      if (choice.value === 'custom') {
        const custom = await this.createCustomMiddleware(config);
        if (custom) {
          selected.push(custom);
        }
      } else if (typeof choice.value === 'object' && choice.value.type !== 'custom') {
        const mw = choice.value;
        selected.push({
          name: mw.name,
          type: mw.type,
          importPath: mw.importPath,
          description: mw.description,
          config: mw.name === 'rateLimit' ? { windowMs: 15 * 60 * 1000, max: 100 } : undefined,
        });
      }

      if (selected.length > 0) {
        const currentList = selected.map((m) => m.name).join(', ');
        const continueChoice = await vscode.window.showQuickPick(
          [
            { label: 'Add more middleware', value: 'add' },
            { label: 'Done', value: 'done' },
          ],
          {
            placeHolder: `Current pipeline: ${currentList}`,
          },
        );

        if (!continueChoice || continueChoice.value === 'done') {
          addMore = false;
        }
      }
    }

    return selected.length > 0 ? selected : null;
  }

  /**
   * Creates a custom middleware definition
   */
  private async createCustomMiddleware(
    config: ExpressMiddlewarePipelineConfig,
  ): Promise<ExpressMiddlewareDefinition | null> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter custom middleware name',
      placeHolder: 'authenticate',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Middleware name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid middleware name';
        }
        return null;
      },
    });

    if (!name) {
      return null;
    }

    const importPath = await vscode.window.showInputBox({
      prompt: 'Enter import path for this middleware',
      placeHolder: '../middleware/auth',
    });

    const description = await vscode.window.showInputBox({
      prompt: 'Enter description (optional)',
      placeHolder: `Custom ${name} middleware`,
    });

    const isErrorHandler = await vscode.window.showQuickPick(
      [
        { label: 'Yes, this is an error handler', value: true },
        { label: 'No, regular middleware', value: false },
      ],
      { placeHolder: 'Is this an error handling middleware?' },
    );

    return {
      name: name.trim(),
      type: isErrorHandler?.value ? 'error-handler' : 'custom',
      importPath: importPath?.trim() || `../middleware/${name.trim()}`,
      description: description?.trim() || `Custom ${name} middleware`,
    };
  }

  /**
   * Generates imports based on middleware and config
   */
  private generateImports(
    middleware: ExpressMiddlewareDefinition[],
    config: ExpressMiddlewarePipelineConfig,
  ): string[] {
    const imports: string[] = [];

    // Collect all unique imports
    const importMap = new Map<string, Set<string>>();

    for (const mw of middleware) {
      if (mw.type === 'built-in' && mw.importPath) {
        const names = importMap.get(mw.importPath) || new Set();
        if (mw.name === 'json' || mw.name === 'urlencoded' || mw.name === 'static') {
          // Express built-ins don't need separate import
          continue;
        }
        names.add(mw.name);
        importMap.set(mw.importPath, names);
      } else if (mw.type === 'custom' || mw.type === 'error-handler') {
        if (mw.importPath) {
          const names = importMap.get(mw.importPath) || new Set();
          names.add(mw.name);
          importMap.set(mw.importPath, names);
        }
      }
    }

    // Generate import statements
    if (config.includeTypeScript) {
      for (const [importPath, names] of importMap.entries()) {
        if (importPath === 'express') {
          imports.push(`import ${Array.from(names).join(', ')} from 'express';`);
        } else {
          imports.push(`import { ${Array.from(names).join(', ')} } from '${importPath}';`);
        }
      }
      if (middleware.some((m) => m.type === 'built-in' && ['json', 'urlencoded', 'static'].includes(m.name))) {
        imports.push("import express from 'express';");
      }
    } else {
      for (const [importPath, names] of importMap.entries()) {
        if (importPath === 'express') {
          imports.push(`const { ${Array.from(names).join(', ')} } = require('express');`);
        } else {
          imports.push(`const { ${Array.from(names).join(', ')} } = require('${importPath}');`);
        }
      }
      if (middleware.some((m) => m.type === 'built-in' && ['json', 'urlencoded', 'static'].includes(m.name))) {
        imports.push("const express = require('express');");
      }
    }

    return imports;
  }

  /**
   * Generates the middleware pipeline code
   */
  private generatePipelineCode(
    pipelineName: string,
    middleware: ExpressMiddlewareDefinition[],
    imports: string[],
    config: ExpressMiddlewarePipelineConfig,
  ): string {
    let code = '';
    const pipelineFunctionName = this.camelCase(pipelineName) + 'Middleware';

    // Add imports
    if (imports.length > 0) {
      code += imports.join('\n');
      code += '\n\n';
    }

    // Add type imports if TypeScript
    if (config.includeTypeScript && config.includeErrorHandling) {
      code += "import { Request, Response, NextFunction } from 'express';\n\n";
    } else if (config.includeTypeScript) {
      code += "import { Request, Response } from 'express';\n\n";
    }

    // Add JSDoc
    if (config.includeJSDoc) {
      code += `/**\n`;
      code += ` * ${pipelineName} middleware pipeline\n`;
      code += ` * Applies ${middleware.length} middleware functions in sequence\n`;
      code += ` */\n`;
    }

    // Export middleware chain
    if (config.exportType === 'named') {
      code += `export function ${pipelineFunctionName}() {\n`;
    } else {
      code += `export default function ${pipelineFunctionName}() {\n`;
    }

    code += '  return [\n';

    // Add each middleware to the array
    for (let i = 0; i < middleware.length; i++) {
      const mw = middleware[i];
      code += '    ';

      if (mw.type === 'built-in') {
        if (mw.name === 'json') {
          code += 'express.json()';
        } else if (mw.name === 'urlencoded') {
          code += 'express.urlencoded({ extended: true })';
        } else if (mw.name === 'static') {
          code += "express.static('public')";
        } else if (mw.name === 'rateLimit') {
          const config = mw.config as { windowMs: number; max: number };
          code += `rateLimit({ windowMs: ${config.windowMs}, max: ${config.max} })`;
        } else {
          code += `${mw.name}()`;
        }
      } else {
        code += mw.name;
      }

      if (i < middleware.length - 1) {
        code += ',';
      }
      code += ` // ${mw.description || mw.name}\n`;
    }

    code += '  ];\n';

    // Add error handler if present
    const errorHandler = middleware.find((m) => m.type === 'error-handler');
    if (errorHandler) {
      code += '\n';
      if (config.includeJSDoc) {
        code += `  /**\n`;
        code += `   * Error handler middleware\n`;
        code += `   */\n`;
      }
      code += `  return [\n`;
      code += `    ...chain,\n`;
      code += `    ${errorHandler.name}\n`;
      code += '  ];\n';
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates router code using the middleware pipeline
   */
  private generateRouterCode(
    pipelineName: string,
    middleware: ExpressMiddlewareDefinition[],
    config: ExpressMiddlewarePipelineConfig,
  ): string {
    let code = '';
    const routerVar = this.camelCase(pipelineName) + 'Router';
    const pipelineFunctionName = this.camelCase(pipelineName) + 'Middleware';

    code += `\n// Example router usage\n\n`;

    if (config.includeTypeScript) {
      code += `import { Router } from 'express';\n`;
      code += `import { ${pipelineFunctionName} } from './middleware/${this.kebabCase(pipelineName)}';\n\n`;
      code += `const ${routerVar} = Router();\n\n`;
      code += `// Apply middleware pipeline\n`;
      code += `${routerVar}.use(...${pipelineFunctionName}());\n\n`;
      code += `// Example routes\n`;
      code += `${routerVar}.get('/', (req, res) => {\n`;
      code += `  res.json({ message: 'Hello from ${pipelineName}' });\n`;
      code += `});\n\n`;
      code += `export default ${routerVar};\n`;
    } else {
      code += `const express = require('express');\n`;
      code += `const { ${pipelineFunctionName} } = require('./middleware/${this.kebabCase(pipelineName)}');\n\n`;
      code += `const ${routerVar} = express.Router();\n\n`;
      code += `// Apply middleware pipeline\n`;
      code += `${routerVar}.use(...${pipelineFunctionName}());\n\n`;
      code += `// Example routes\n`;
      code += `${routerVar}.get('/', (req, res) => {\n`;
      code += `  res.json({ message: 'Hello from ${pipelineName}' });\n`;
      code += `});\n\n`;
      code += `module.exports = ${routerVar};\n`;
    }

    return code;
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  }

  /**
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Creates the middleware file at the specified path
   */
  public async createMiddlewareFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write middleware file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Middleware pipeline file created', { filePath });
  }

  /**
   * Generates app registration code to add to main app file
   */
  public generateAppRegistration(
    pipelineName: string,
    basePath: string,
    config: ExpressMiddlewarePipelineConfig,
  ): string {
    const routerVar = this.camelCase(pipelineName) + 'Router';
    const fileName = this.kebabCase(pipelineName);

    let code = '';
    if (config.includeTypeScript) {
      if (config.exportType === 'named') {
        code += `import { ${routerVar} } from './routes/${fileName}';\n`;
      } else {
        code += `import ${routerVar} from './routes/${fileName}';\n`;
      }
    } else {
      code += `const ${routerVar} = require('./routes/${fileName}');\n`;
    }
    code += `app.use('/${basePath}', ${routerVar});\n`;

    return code;
  }

  /**
   * Shows a visual representation of the middleware pipeline
   */
  public async showPipelineVisualization(middleware: ExpressMiddlewareDefinition[]): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'middlewarePipeline',
      'Middleware Pipeline',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    const html = this.getWebviewContent(middleware);
    panel.webview.html = html;
  }

  /**
   * Generates webview HTML for pipeline visualization
   */
  private getWebviewContent(middleware: ExpressMiddlewareDefinition[]): string {
    const items = middleware
      .map(
        (mw, index) => `
        <div class="middleware-item" draggable="true" data-index="${index}">
          <div class="middleware-icon ${mw.type}">
            ${mw.type === 'error-handler' ? '⚠️' : mw.type === 'custom' ? '🔧' : '📦'}
          </div>
          <div class="middleware-info">
            <div class="middleware-name">${mw.name}</div>
            <div class="middleware-description">${mw.description || ''}</div>
            ${mw.importPath ? `<div class="middleware-import">from: ${mw.importPath}</div>` : ''}
          </div>
        </div>
      `,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Middleware Pipeline</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
    }
    .pipeline-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .pipeline-header {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 10px;
      color: var(--vscode-textLink-foreground);
    }
    .middleware-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--vscode-editor-selectionBackground);
      border-radius: 4px;
      border-left: 3px solid var(--vscode-textLink-foreground);
      cursor: move;
    }
    .middleware-item.built-in {
      border-left-color: #007acc;
    }
    .middleware-item.custom {
      border-left-color: #4ec9b0;
    }
    .middleware-item.error-handler {
      border-left-color: #f14c4c;
    }
    .middleware-icon {
      font-size: 1.5em;
      min-width: 30px;
      text-align: center;
    }
    .middleware-info {
      flex: 1;
    }
    .middleware-name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .middleware-description {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
    }
    .middleware-import {
      font-size: 0.8em;
      color: var(--vscode-textBlockQuote-background);
      font-family: var(--vscode-editor-font-family);
    }
    .arrow {
      text-align: center;
      color: var(--vscode-textLink-foreground);
      font-size: 1.5em;
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="pipeline-container">
    <div class="pipeline-header">Middleware Pipeline Flow</div>
    ${items.split('\n').join('<div class="arrow">↓</div>\n')}
  </div>
  <script>
    // Add drag-and-drop functionality
    const items = document.querySelectorAll('.middleware-item');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.index);
        item.style.opacity = '0.5';
      });
      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = parseInt(item.dataset.index);
        // Note: Reordering would need to communicate back to extension
      });
    });
  </script>
</body>
</html>`;
  }
}
