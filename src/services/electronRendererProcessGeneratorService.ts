import * as path from 'path';
import * as vscode from 'vscode';

import type {
  ElectronRendererComponent,
  ElectronRendererProcessConfig,
  ElectronRendererIPCHandler,
  GeneratedRendererProcess,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating Electron renderer process code with TypeScript typing,
 * IPC communication, and framework integration
 */
export class ElectronRendererProcessGeneratorService {
  private static instance: ElectronRendererProcessGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ElectronRendererProcessGeneratorService {
    ElectronRendererProcessGeneratorService.instance ??= new ElectronRendererProcessGeneratorService();
    return ElectronRendererProcessGeneratorService.instance;
  }

  /**
   * Generates an Electron renderer process based on user input
   */
  public async generateRendererProcess(
    workspacePath: string,
    config: ElectronRendererProcessConfig,
  ): Promise<GeneratedRendererProcess | null> {
    // Get component name
    const componentName = await this.getComponentName(config);
    if (!componentName) {
      return null;
    }

    // Get framework type
    const frameworkType = await this.getFrameworkType(config);
    if (!frameworkType) {
      return null;
    }

    // Collect IPC handlers
    const ipcHandlers = await this.collectIPCHandlers();

    // Generate imports
    const imports = this.generateImports(frameworkType, config, ipcHandlers);

    // Generate renderer codes
    const templateCode = this.generateTemplate(componentName, frameworkType, ipcHandlers, config);
    const scriptCode = this.generateScript(componentName, frameworkType, ipcHandlers, config);
    const styleCode = this.generateStyle(componentName, config);
    const preloadCode = this.generatePreload(componentName, ipcHandlers, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, componentName, frameworkType, config);

    // Create component object
    const component: ElectronRendererComponent = {
      name: componentName,
      template: {
        type: frameworkType === 'react' ? 'jsx' : frameworkType === 'svelte' ? 'svelte' : 'html',
        content: templateCode,
      },
      script: {
        language: config.includeTypeScript ? 'typescript' : 'javascript',
        content: scriptCode,
      },
      style: {
        type: 'css',
        content: styleCode,
      },
      imports,
      ipcHandlers,
    };

    this.logger.info('Electron renderer process generated', {
      name: componentName,
      framework: frameworkType,
      handlers: ipcHandlers.length,
    });

    return {
      name: componentName,
      filePath,
      component,
      imports,
      templateCode,
      scriptCode,
      styleCode,
      preloadCode,
      config,
    };
  }

  /**
   * Prompts user for component name
   */
  private async getComponentName(config: ElectronRendererProcessConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter renderer component name (e.g., MainWindow, AppRenderer)',
      placeHolder: config.defaultComponentName || 'AppRenderer',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Component name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Component name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Gets the framework type for the renderer
   */
  private async getFrameworkType(_config: ElectronRendererProcessConfig): Promise<
    'html' | 'react' | 'vue' | 'svelte' | null
  > {
    const choice = await vscode.window.showQuickPick<
      Required<{ label: string; description: string; value: 'html' | 'react' | 'vue' | 'svelte' }>
    >(
      [
        {
          label: 'HTML/JavaScript',
          description: 'Plain HTML with vanilla JavaScript',
          value: 'html',
        },
        {
          label: 'React',
          description: 'React with TypeScript support',
          value: 'react',
        },
        {
          label: 'Vue',
          description: 'Vue 3 with TypeScript support',
          value: 'vue',
        },
        {
          label: 'Svelte',
          description: 'Svelte with TypeScript support',
          value: 'svelte',
        },
      ],
      { placeHolder: 'Select framework for renderer process' },
    );

    return choice?.value ?? null;
  }

  /**
   * Collects IPC handlers from user
   */
  private async collectIPCHandlers(): Promise<ElectronRendererIPCHandler[]> {
    const handlers: ElectronRendererIPCHandler[] = [];

    let addMore = true;
    while (addMore) {
      const handler = await this.createIPCHandler();
      if (handler) {
        handlers.push(handler);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another handler', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another IPC handler or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return handlers;
  }

  /**
   * Creates a single IPC handler through user interaction
   */
  private async createIPCHandler(): Promise<ElectronRendererIPCHandler | null> {
    // Get channel name
    const channelInput = await vscode.window.showInputBox({
      prompt: 'Enter IPC channel name (e.g., app-version, get-data)',
      placeHolder: 'my-channel',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Channel name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Channel name must be lowercase with hyphens allowed';
        }
        return null;
      },
    });

    if (!channelInput) {
      return null;
    }

    const channel = channelInput.trim();

    // Get method name
    const methodName = await vscode.window.showInputBox({
      prompt: 'Enter method name (camelCase)',
      placeHolder: 'getAppVersion',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Method name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Method name must be camelCase';
        }
        return null;
      },
    });

    if (!methodName) {
      return null;
    }

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter handler description (optional)',
      placeHolder: 'Gets the application version',
    });

    // Collect parameters
    const parameters = await this.collectHandlerParameters();

    // Get return type
    const returnType = await this.getHandlerReturnType();

    const handler: ElectronRendererIPCHandler = {
      channel,
      methodName: methodName.trim(),
      parameters,
      returnType,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      handler.description = trimmedDescription;
    }

    return handler;
  }

  /**
   * Collects parameters for an IPC handler
   */
  private async collectHandlerParameters(): Promise<
    Array<{ name: string; type: string; optional: boolean }>
  > {
    const parameters: Array<{ name: string; type: string; optional: boolean }> = [];

    let addMore = true;
    while (addMore) {
      const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name',
        placeHolder: 'data',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Parameter name must be camelCase';
          }
          return null;
        },
      });

      if (!paramName) {
        break;
      }

      const paramType = await vscode.window.showInputBox({
        prompt: 'Enter parameter type',
        placeHolder: 'string',
        value: 'any',
      });

      const optionalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: 'required' },
          { label: 'Optional', value: 'optional' },
        ],
        { placeHolder: 'Is this parameter required?' },
      );

      parameters.push({
        name: paramName.trim(),
        type: paramType?.trim() || 'any',
        optional: optionalChoice?.value === 'optional',
      });

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another parameter', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another parameter?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return parameters;
  }

  /**
   * Gets the return type for an IPC handler
   */
  private async getHandlerReturnType(): Promise<string> {
    const defaultType = 'Promise<any>';

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultType,
      value: defaultType,
    });

    return input?.trim() || defaultType;
  }

  /**
   * Generates imports based on framework and config
   */
  private generateImports(
    frameworkType: string,
    config: ElectronRendererProcessConfig,
    ipcHandlers: ElectronRendererIPCHandler[],
  ): string[] {
    const imports: string[] = [];

    if (frameworkType === 'react') {
      imports.push("import React, { useState, useEffect } from 'react';");
      if (config.includeIPC) {
        imports.push("import { ipcRenderer } from 'electron';");
      }
    } else if (frameworkType === 'vue') {
      imports.push("import { defineComponent, ref, onMounted } from 'vue';");
      if (config.includeIPC) {
        imports.push("import { ipcRenderer } from 'electron';");
      }
    } else if (frameworkType === 'svelte') {
      if (config.includeIPC) {
        imports.push("import { ipcRenderer } from 'electron';");
      }
    } else {
      if (config.includeIPC) {
        imports.push("const { ipcRenderer } = require('electron');");
      }
    }

    if (config.includeTypeScript && ipcHandlers.length > 0) {
      // Type imports will be added in the generated code
    }

    return imports;
  }

  /**
   * Generates template code based on framework
   */
  private generateTemplate(
    componentName: string,
    frameworkType: string,
    _ipcHandlers: ElectronRendererIPCHandler[],
    _config: ElectronRendererProcessConfig,
  ): string {
    if (frameworkType === 'html') {
      return this.generateHTMLTemplate(componentName);
    } else if (frameworkType === 'react') {
      return this.generateReactTemplate(componentName);
    } else if (frameworkType === 'vue') {
      return this.generateVueTemplate(componentName);
    } else if (frameworkType === 'svelte') {
      return this.generateSvelteTemplate(componentName);
    }

    return '';
  }

  /**
   * Generates HTML template
   */
  private generateHTMLTemplate(componentName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${componentName}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div id="app">
    <h1>${componentName}</h1>
    <div id="content"></div>
  </div>
  <script src="./renderer.js"></script>
</body>
</html>`;
  }

  /**
   * Generates React template
   */
  private generateReactTemplate(componentName: string): string {
    return `import React from 'react';
import ReactDOM from 'react-dom';
import ${componentName} from './${componentName}';

ReactDOM.render(
  <React.StrictMode>
    <${componentName} />
  </React.StrictMode>,
  document.getElementById('root')
);`;
  }

  /**
   * Generates Vue template
   */
  private generateVueTemplate(componentName: string): string {
    return `<template>
  <div class="${this.kebabCase(componentName)}">
    <h1>${componentName}</h1>
    <div id="content"></div>
  </div>
</template>

<script setup lang="ts">
// Script content will be in the script section
</script>

<style scoped>
/* Styles will be in the style section */
</style>`;
  }

  /**
   * Generates Svelte template
   */
  private generateSvelteTemplate(componentName: string): string {
    return `<script lang="ts">
// Script content
export let name = '${componentName}';
</script>

<div class="${this.kebabCase(componentName)}">
  <h1>{name}</h1>
  <slot></slot>
</div>

<style>
/* Styles */
</style>`;
  }

  /**
   * Generates script code based on framework
   */
  private generateScript(
    componentName: string,
    frameworkType: string,
    ipcHandlers: ElectronRendererIPCHandler[],
    config: ElectronRendererProcessConfig,
  ): string {
    const ts = config.includeTypeScript;

    if (frameworkType === 'html') {
      return this.generateHTMLScript(componentName, ipcHandlers, ts);
    } else if (frameworkType === 'react') {
      return this.generateReactScript(componentName, ipcHandlers, ts);
    } else if (frameworkType === 'vue') {
      return this.generateVueScript(componentName, ipcHandlers, ts);
    } else if (frameworkType === 'svelte') {
      return this.generateSvelteScript(componentName, ipcHandlers, ts);
    }

    return '';
  }

  /**
   * Generates HTML/JavaScript script
   */
  private generateHTMLScript(
    _componentName: string,
    ipcHandlers: ElectronRendererIPCHandler[],
    ts: boolean,
  ): string {
    let code = ts ? '// TypeScript types\n' : '// JavaScript code\n';

    if (ipcHandlers.length > 0) {
      code += '\n// IPC Handlers\n';
      for (const handler of ipcHandlers) {
        if (ts) {
          code += `async function ${handler.methodName}(`;
          const params = handler.parameters.map((p) => {
            const opt = p.optional ? '?' : '';
            return `${p.name}${opt}: ${p.type}`;
          });
          code += params.join(', ');
          code += `): ${handler.returnType} {\n`;
          if (handler.description) {
            code += `  /** ${handler.description} */\n`;
          }
          code += `  return await ipcRenderer.invoke('${handler.channel}'`;
          if (handler.parameters.length > 0) {
            const args = handler.parameters.map((p) => p.name).join(', ');
            code += `, ${args}`;
          }
          code += `);\n}\n\n`;
        } else {
          code += `async function ${handler.methodName}(`;
          const params = handler.parameters.map((p) => p.name).join(', ');
          code += params;
          code += `) {\n`;
          if (handler.description) {
            code += `  // ${handler.description}\n`;
          }
          code += `  return await ipcRenderer.invoke('${handler.channel}'`;
          if (handler.parameters.length > 0) {
            const args = handler.parameters.map((p) => p.name).join(', ');
            code += `, ${args}`;
          }
          code += `);\n}\n\n`;
        }
      }
    }

    code += '// Initialize renderer\ndocument.addEventListener(\'DOMContentLoaded\', () => {\n';
    code += '  console.log(\'Renderer initialized\');\n';
    code += '});\n';

    return code;
  }

  /**
   * Generates React script
   */
  private generateReactScript(
    componentName: string,
    ipcHandlers: ElectronRendererIPCHandler[],
    ts: boolean,
  ): string {
    let code = `import React, { useState, useEffect } from 'react';\n`;
    code += `import { ipcRenderer } from 'electron';\n\n`;

    if (ts) {
      code += `interface ${componentName}Props {}\n\n`;
      code += `export const ${componentName}: React.FC<${componentName}Props> = () => {\n`;
    } else {
      code += `export const ${componentName} = () => {\n`;
    }

    // Generate state and handlers
    if (ipcHandlers.length > 0) {
      code += '  // IPC Handlers\n';
      for (const handler of ipcHandlers) {
        if (ts) {
          code += `  const ${handler.methodName} = async `;
          const params = handler.parameters.map((p) => {
            const opt = p.optional ? '?' : '';
            return `${p.name}${opt}: ${p.type}`;
          });
          code += `(${params.join(', ')}): ${handler.returnType} => {\n`;
        } else {
          code += `  const ${handler.methodName} = async `;
          const params = handler.parameters.map((p) => p.name).join(', ');
          code += `(${params}) => {\n`;
        }
        if (handler.description) {
          code += `    /** ${handler.description} */\n`;
        }
        code += `    return await ipcRenderer.invoke('${handler.channel}'`;
        if (handler.parameters.length > 0) {
          const args = handler.parameters.map((p) => p.name).join(', ');
          code += `, ${args}`;
        }
        code += `);\n  };\n\n`;
      }
    }

    code += '  useEffect(() => {\n';
    code += '    console.log(\'Renderer component mounted\');\n';
    code += '  }, []);\n\n';

    code += `  return (\n`;
    code += `    <div className="${this.kebabCase(componentName)}">\n`;
    code += `      <h1>${componentName}</h1>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates Vue script
   */
  private generateVueScript(
    componentName: string,
    ipcHandlers: ElectronRendererIPCHandler[],
    ts: boolean,
  ): string {
    let code = ts ? '<script setup lang="ts">\n' : '<script setup>\n';
    code += `import { ref, onMounted } from 'vue';\n`;
    code += `import { ipcRenderer } from 'electron';\n\n`;

    if (ipcHandlers.length > 0) {
      code += '// IPC Handlers\n';
      for (const handler of ipcHandlers) {
        if (ts) {
          code += `const ${handler.methodName} = async `;
          const params = handler.parameters.map((p) => {
            const opt = p.optional ? '?' : '';
            return `${p.name}${opt}: ${p.type}`;
          });
          code += `(${params.join(', ')}): ${handler.returnType} => {\n`;
        } else {
          code += `const ${handler.methodName} = async `;
          const params = handler.parameters.map((p) => p.name).join(', ');
          code += `(${params}) => {\n`;
        }
        if (handler.description) {
          code += `  /** ${handler.description} */\n`;
        }
        code += `  return await ipcRenderer.invoke('${handler.channel}'`;
        if (handler.parameters.length > 0) {
          const args = handler.parameters.map((p) => p.name).join(', ');
          code += `, ${args}`;
        }
        code += `);\n};\n\n`;
      }
    }

    code += 'onMounted(() => {\n';
    code += '  console.log(\'Renderer component mounted\');\n';
    code += '});\n';
    code += '</script>\n';

    return code;
  }

  /**
   * Generates Svelte script
   */
  private generateSvelteScript(
    _componentName: string,
    ipcHandlers: ElectronRendererIPCHandler[],
    ts: boolean,
  ): string {
    let code = ts ? '<script lang="ts">\n' : '<script>\n';
    code += `import { onMount } from 'svelte';\n`;
    code += `import { ipcRenderer } from 'electron';\n\n`;

    if (ipcHandlers.length > 0) {
      code += '// IPC Handlers\n';
      for (const handler of ipcHandlers) {
        if (ts) {
          code += `export async function ${handler.methodName}(`;
          const params = handler.parameters.map((p) => {
            const opt = p.optional ? '?' : '';
            return `${p.name}${opt}: ${p.type}`;
          });
          code += `${params.join(', ')}): ${handler.returnType} {\n`;
        } else {
          code += `export async function ${handler.methodName}(`;
          const params = handler.parameters.map((p) => p.name).join(', ');
          code += `${params}) {\n`;
        }
        if (handler.description) {
          code += `  /** ${handler.description} */\n`;
        }
        code += `  return await ipcRenderer.invoke('${handler.channel}'`;
        if (handler.parameters.length > 0) {
          const args = handler.parameters.map((p) => p.name).join(', ');
          code += `, ${args}`;
        }
        code += `);\n}\n\n`;
      }
    }

    code += 'onMount(() => {\n';
    code += '  console.log(\'Renderer component mounted\');\n';
    code += '});\n';
    code += '</script>\n';

    return code;
  }

  /**
   * Generates style code
   */
  private generateStyle(componentName: string, _config: ElectronRendererProcessConfig): string {
    return `.${this.kebabCase(componentName)} {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.${this.kebabCase(componentName)} h1 {
  margin-bottom: 20px;
  color: #333;
}

#content {
  margin-top: 20px;
}
`;
  }

  /**
   * Generates preload script
   */
  private generatePreload(
    componentName: string,
    ipcHandlers: ElectronRendererIPCHandler[],
    config: ElectronRendererProcessConfig,
  ): string {
    let code = `const { contextBridge, ipcRenderer } = require('electron');\n\n`;

    code += `// Expose protected methods that allow the renderer process to use\n`;
    code += `// the ipcRenderer without exposing the entire object\n`;
    code += `contextBridge.exposeInMainWorld('${this.camelCase(componentName)}API', {\n`;

    if (ipcHandlers.length > 0) {
      for (const handler of ipcHandlers) {
        code += `  ${handler.methodName}: `;
        const params = handler.parameters.map((p) => p.name).join(', ');
        code += `(${params}) => ipcRenderer.invoke('${handler.channel}'`;
        if (handler.parameters.length > 0) {
          code += `, ${params}`;
        }
        code += `),\n`;
      }
    } else {
      code += `  // Add your IPC methods here\n`;
      code += `  getAppVersion: () => ipcRenderer.invoke('get-app-version'),\n`;
    }

    code += `});\n`;

    if (config.includeTypeScript) {
      // Add TypeScript declarations
      code += `\n// TypeScript declarations\n`;
      code += `declare global {\n`;
      code += `  interface Window {\n`;
      code += `    ${this.camelCase(componentName)}API: {\n`;
      for (const handler of ipcHandlers) {
        const params = handler.parameters
          .map((p) => {
            const opt = p.optional ? '?' : '';
            return `${p.name}${opt}: ${p.type}`;
          })
          .join(', ');
        code += `      ${handler.methodName}: (${params}) => ${handler.returnType};\n`;
      }
      code += `    };\n`;
      code += `  }\n`;
      code += `}\n`;
    }

    return code;
  }

  /**
   * Calculates the file path for the renderer process
   */
  private calculateFilePath(
    workspacePath: string,
    componentName: string,
    frameworkType: string,
    config: ElectronRendererProcessConfig,
  ): string {
    const baseDir = path.join(workspacePath, config.rendererPath || 'src', 'renderer');

    let fileName: string;
    if (frameworkType === 'react') {
      fileName = `${componentName}.tsx`;
    } else if (frameworkType === 'vue') {
      fileName = `${componentName}.vue`;
    } else if (frameworkType === 'svelte') {
      fileName = `${componentName}.svelte`;
    } else {
      fileName = `${this.kebabCase(componentName)}.js`;
    }

    return path.join(baseDir, fileName);
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
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
   * Creates the renderer process file at the specified path
   */
  public async createRendererProcessFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write renderer file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Electron renderer process file created', { filePath });
  }

  /**
   * Creates the preload script file
   */
  public async createPreloadFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write preload file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Electron preload file created', { filePath });
  }
}
