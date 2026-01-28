import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface WebpackConfigGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeCodeSplitting: boolean;
  includeBundleAnalysis: boolean;
  includePerformanceTuning: boolean;
  includeOptimization: boolean;
  includeDevServer: boolean;
  includeLoaders: boolean;
  includePlugins: boolean;
  defaultConfigName: string;
  outputDirectory: string;
  targetEnvironment: 'web' | 'node' | 'electron' | 'auto';
  mode: 'development' | 'production' | 'none';
}

export interface WebpackLoader {
  name: string;
  test: string;
  use: (string | { name: string; options: Record<string, unknown> })[];
  options?: Record<string, unknown>;
  type?: string;
  include?: string[];
  exclude?: string[];
  parser?: Record<string, unknown>;
}

export interface WebpackPlugin {
  name: string;
  constructor: string;
  options?: Record<string, unknown>;
  description?: string;
}

export interface WebpackEntry {
  name: string;
  import: string[];
  filename?: string;
  dependOn?: string[];
}

export interface WebpackOptimization {
  minimize: boolean;
  splitChunks: boolean;
  runtimeChunk: boolean | 'single' | 'multiple';
  moduleIds: string;
  usedExports: boolean;
  sideEffects: boolean;
}

export interface GeneratedWebpackConfig {
  name: string;
  configCode: string;
  dependencies: string[];
  devDependencies: string[];
  imports: string[];
  filePath: string;
  loaders: WebpackLoader[];
  plugins: WebpackPlugin[];
  entries: WebpackEntry[];
  optimization: WebpackOptimization;
}

/**
 * Service for generating Webpack configurations with TypeScript typing for loaders,
 * plugins, and optimization. Generates configs with proper code splitting, bundle
 * analysis, and performance tuning.
 */
export class WebpackConfigGeneratorService {
  private static instance: WebpackConfigGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): WebpackConfigGeneratorService {
    WebpackConfigGeneratorService.instance ??= new WebpackConfigGeneratorService();
    return WebpackConfigGeneratorService.instance;
  }

  /**
   * Generates a Webpack configuration based on user input
   */
  public async generateWebpackConfig(
    workspacePath: string,
    config: WebpackConfigGeneratorConfig,
  ): Promise<GeneratedWebpackConfig | null> {
    // Get config name
    const configName = await this.getConfigName(config);
    if (!configName) {
      return null;
    }

    // Collect entry points
    const entries = await this.collectEntries();
    if (!entries || entries.length === 0) {
      vscode.window.showWarningMessage('No entry points defined. Configuration generation cancelled.');
      return null;
    }

    // Collect loaders
    const loaders = await this.collectLoaders();

    // Collect plugins
    const plugins = await this.collectPlugins();

    // Configure optimization
    const optimization = await this.configureOptimization(config);

    // Generate imports
    const imports = this.generateImports(loaders, plugins, config);

    // Generate config code
    const configCode = this.generateConfigCode(configName, entries, loaders, plugins, optimization, imports, config);

    // Calculate dependencies
    const dependencies = this.calculateDependencies(loaders, plugins, config);
    const devDependencies = this.calculateDevDependencies(config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, configName, config);

    this.logger.info('Webpack config generated', {
      name: configName,
      entries: entries.length,
      loaders: loaders.length,
      plugins: plugins.length,
    });

    return {
      name: configName,
      configCode,
      dependencies,
      devDependencies,
      imports,
      filePath,
      loaders,
      plugins,
      entries,
      optimization,
    };
  }

  /**
   * Prompts user for config name
   */
  private async getConfigName(config: WebpackConfigGeneratorConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter webpack configuration name (e.g., prod, dev, base)',
      placeHolder: config.defaultConfigName || 'webpack.config',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Configuration name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
          return 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects entry points from user
   */
  private async collectEntries(): Promise<WebpackEntry[] | null> {
    const entries: WebpackEntry[] = [];

    // Add main entry
    const mainEntry = await this.createEntry('main', './src/index.ts');
    if (mainEntry) {
      entries.push(mainEntry);
    }

    // Ask for additional entries
    let addMore = true;
    while (addMore) {
      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another entry point', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another entry point or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      } else {
        const entryName = await vscode.window.showInputBox({
          prompt: 'Enter entry point name',
          placeHolder: 'vendor',
        });

        if (entryName) {
          const entryPath = await vscode.window.showInputBox({
            prompt: 'Enter entry point path',
            placeHolder: './src/vendor.ts',
          });

          if (entryPath) {
            const entry = await this.createEntry(entryName.trim(), entryPath.trim());
            if (entry) {
              entries.push(entry);
            }
          }
        }
      }
    }

    return entries.length > 0 ? entries : null;
  }

  /**
   * Creates a single entry
   */
  private async createEntry(name: string, defaultPath: string): Promise<WebpackEntry | null> {
    const entryPath = await vscode.window.showInputBox({
      prompt: `Enter path for ${name} entry`,
      placeHolder: defaultPath,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Entry path cannot be empty';
        }
        return null;
      },
    });

    if (!entryPath) {
      return null;
    }

    return {
      name,
      import: [entryPath.trim()],
    };
  }

  /**
   * Collects loaders from user
   */
  private async collectLoaders(): Promise<WebpackLoader[]> {
    const loaders: WebpackLoader[] = [];

    const availableLoaders: Array<{ label: string; value: string; description: string }> = [
      { label: 'babel-loader', value: 'babel-loader', description: 'Transpile JavaScript/TypeScript' },
      { label: 'ts-loader', value: 'ts-loader', description: 'TypeScript loader' },
      { label: 'css-loader', value: 'css-loader', description: 'CSS loader' },
      { label: 'style-loader', value: 'style-loader', description: 'Style loader' },
      { label: 'sass-loader', value: 'sass-loader', description: 'SASS/SCSS loader' },
      { label: 'less-loader', value: 'less-loader', description: 'LESS loader' },
      { label: 'stylus-loader', value: 'stylus-loader', description: 'Stylus loader' },
      { label: 'file-loader', value: 'file-loader', description: 'File loader' },
      { label: 'url-loader', value: 'url-loader', description: 'URL loader' },
      { label: 'asset-loader', value: 'asset-loader', description: 'Asset module' },
      { label: 'raw-loader', value: 'raw-loader', description: 'Raw loader' },
      { label: 'html-loader', value: 'html-loader', description: 'HTML loader' },
      { label: 'svg-loader', value: 'svg-loader', description: 'SVG loader' },
      { label: 'vue-loader', value: 'vue-loader', description: 'Vue.js loader' },
      { label: 'ts-loader', value: 'ts-loader', description: 'TypeScript loader' },
    ];

    const selectedLoaders = await vscode.window.showQuickPick(availableLoaders, {
      placeHolder: 'Select loaders to include',
      canPickMany: true,
    });

    if (selectedLoaders) {
      for (const loader of selectedLoaders) {
        const loaderConfig = this.getLoaderConfig(loader.value);
        if (loaderConfig) {
          loaders.push(loaderConfig);
        }
      }
    }

    return loaders;
  }

  /**
   * Gets loader configuration
   */
  private getLoaderConfig(loaderName: string): WebpackLoader | null {
    const loaderConfigs: Record<string, WebpackLoader> = {
      'babel-loader': {
        name: 'babel-loader',
        test: '/\\.(js|jsx|ts|tsx)$/',
        use: ['babel-loader'],
        exclude: ['/node_modules/'],
      },
      'ts-loader': {
        name: 'ts-loader',
        test: '/\\.tsx?$/',
        use: ['ts-loader'],
        exclude: ['/node_modules/'],
      },
      'css-loader': {
        name: 'css-loader',
        test: '/\\.css$/',
        use: ['style-loader', 'css-loader'],
      },
      'style-loader': {
        name: 'style-loader',
        test: '/\\.css$/',
        use: ['style-loader', 'css-loader'],
      },
      'sass-loader': {
        name: 'sass-loader',
        test: '/\\.(scss|sass)$/',
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      'less-loader': {
        name: 'less-loader',
        test: '/\\.less$/',
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
      'stylus-loader': {
        name: 'stylus-loader',
        test: '/\\.styl$/',
        use: ['style-loader', 'css-loader', 'stylus-loader'],
      },
      'file-loader': {
        name: 'file-loader',
        test: '/\\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot)$/i',
        use: [
          {
            name: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              outputPath: 'assets/',
            },
          },
        ] as unknown as string[],
      },
      'url-loader': {
        name: 'url-loader',
        test: '/\\.(png|jpe?g|gif|svg)$/i',
        use: [
          {
            name: 'url-loader',
            options: {
              limit: 8192,
            },
          },
        ] as unknown as string[],
      },
      'asset-loader': {
        name: 'asset-loader',
        test: '/\\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot)$/i',
        use: [],
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192,
          },
        },
      },
      'raw-loader': {
        name: 'raw-loader',
        test: '/\\.txt$/',
        use: ['raw-loader'],
      },
      'html-loader': {
        name: 'html-loader',
        test: '/\\.html$/',
        use: ['html-loader'],
      },
      'svg-loader': {
        name: 'svg-loader',
        test: '/\\.svg$/i',
        use: ['svg-loader'],
      },
      'vue-loader': {
        name: 'vue-loader',
        test: '/\\.vue$/',
        use: ['vue-loader'],
      },
    };

    return loaderConfigs[loaderName] || null;
  }

  /**
   * Collects plugins from user
   */
  private async collectPlugins(): Promise<WebpackPlugin[]> {
    const plugins: WebpackPlugin[] = [];

    const availablePlugins: Array<{ label: string; value: string; description: string }> = [
      { label: 'HtmlWebpackPlugin', value: 'HtmlWebpackPlugin', description: 'Generate HTML files' },
      { label: 'MiniCssExtractPlugin', value: 'MiniCssExtractPlugin', description: 'Extract CSS to separate files' },
      { label: 'CleanWebpackPlugin', value: 'CleanWebpackPlugin', description: 'Clean output directory' },
      { label: 'DefinePlugin', value: 'DefinePlugin', description: 'Define compile-time constants' },
      { label: 'HotModuleReplacementPlugin', value: 'HotModuleReplacementPlugin', description: 'Enable HMR' },
      { label: 'BundleAnalyzerPlugin', value: 'BundleAnalyzerPlugin', description: 'Analyze bundle size' },
      { label: 'ForkTsCheckerWebpackPlugin', value: 'ForkTsCheckerWebpackPlugin', description: 'TypeScript type checking' },
      { label: 'EsLintPlugin', value: 'EsLintPlugin', description: 'ESLint integration' },
      { label: 'ProgressPlugin', value: 'ProgressPlugin', description: 'Build progress' },
      { label: 'CopyPlugin', value: 'CopyPlugin', description: 'Copy files and directories' },
      { label: 'ProvidePlugin', value: 'ProvidePlugin', description: 'Provide globals' },
      { label: 'IgnorePlugin', value: 'IgnorePlugin', description: 'Ignore modules' },
      { label: 'EnvironmentPlugin', value: 'EnvironmentPlugin', description: 'Environment variables' },
    ];

    const selectedPlugins = await vscode.window.showQuickPick(availablePlugins, {
      placeHolder: 'Select plugins to include',
      canPickMany: true,
    });

    if (selectedPlugins) {
      for (const plugin of selectedPlugins) {
        const pluginConfig = this.getPluginConfig(plugin.value);
        if (pluginConfig) {
          plugins.push(pluginConfig);
        }
      }
    }

    return plugins;
  }

  /**
   * Gets plugin configuration
   */
  private getPluginConfig(pluginName: string): WebpackPlugin | null {
    const pluginConfigs: Record<string, WebpackPlugin> = {
      HtmlWebpackPlugin: {
        name: 'HtmlWebpackPlugin',
        constructor: 'html-webpack-plugin',
        description: 'Generates HTML files',
      },
      MiniCssExtractPlugin: {
        name: 'MiniCssExtractPlugin',
        constructor: 'mini-css-extract-plugin',
        description: 'Extracts CSS to separate files',
      },
      CleanWebpackPlugin: {
        name: 'CleanWebpackPlugin',
        constructor: 'clean-webpack-plugin',
        description: 'Cleans output directory',
      },
      DefinePlugin: {
        name: 'DefinePlugin',
        constructor: 'webpack',
        description: 'Defines compile-time constants',
      },
      HotModuleReplacementPlugin: {
        name: 'HotModuleReplacementPlugin',
        constructor: 'webpack',
        description: 'Enables Hot Module Replacement',
      },
      BundleAnalyzerPlugin: {
        name: 'BundleAnalyzerPlugin',
        constructor: 'webpack-bundle-analyzer',
        description: 'Analyzes bundle size',
      },
      ForkTsCheckerWebpackPlugin: {
        name: 'ForkTsCheckerWebpackPlugin',
        constructor: 'fork-ts-checker-webpack-plugin',
        description: 'TypeScript type checker',
      },
      EsLintPlugin: {
        name: 'EsLintPlugin',
        constructor: 'eslint-webpack-plugin',
        description: 'ESLint integration',
      },
      ProgressPlugin: {
        name: 'ProgressPlugin',
        constructor: 'webpack',
        description: 'Build progress indicator',
      },
      CopyPlugin: {
        name: 'CopyPlugin',
        constructor: 'copy-webpack-plugin',
        description: 'Copies files and directories',
      },
      ProvidePlugin: {
        name: 'ProvidePlugin',
        constructor: 'webpack',
        description: 'Provides global variables',
      },
      IgnorePlugin: {
        name: 'IgnorePlugin',
        constructor: 'webpack',
        description: 'Ignores specified modules',
      },
      EnvironmentPlugin: {
        name: 'EnvironmentPlugin',
        constructor: 'webpack',
        description: 'Environment variables plugin',
      },
    };

    return pluginConfigs[pluginName] || null;
  }

  /**
   * Configures optimization settings
   */
  private async configureOptimization(config: WebpackConfigGeneratorConfig): Promise<WebpackOptimization> {
    const optimization: WebpackOptimization = {
      minimize: config.mode === 'production',
      splitChunks: config.includeCodeSplitting,
      runtimeChunk: config.includeCodeSplitting ? 'single' : false,
      moduleIds: config.mode === 'production' ? 'deterministic' : 'named',
      usedExports: true,
      sideEffects: true,
    };

    return optimization;
  }

  /**
   * Generates imports based on loaders and plugins
   */
  private generateImports(_loaders: WebpackLoader[], plugins: WebpackPlugin[], config: WebpackConfigGeneratorConfig): string[] {
    const imports: string[] = [];

    // Always import webpack
    if (config.includeTypeScript) {
      imports.push('Configuration');
    }

    // Import path
    imports.push('path');

    // Import plugin constructors
    for (const plugin of plugins) {
      if (plugin.constructor === 'webpack') {
        // webpack is already imported
        continue;
      }
      if (!imports.includes(plugin.constructor)) {
        imports.push(plugin.constructor);
      }
    }

    return imports;
  }

  /**
   * Generates the webpack configuration code
   */
  private generateConfigCode(
    configName: string,
    entries: WebpackEntry[],
    loaders: WebpackLoader[],
    plugins: WebpackPlugin[],
    optimization: WebpackOptimization,
    imports: string[],
    config: WebpackConfigGeneratorConfig,
  ): string {
    let code = '';

    // Add file header
    code += `/**
 * Webpack Configuration: ${configName}
 * Generated with TypeScript support
 * Mode: ${config.mode}
 * Target: ${config.targetEnvironment}
 */\n\n`;

    // Add imports
    code += this.generateImportStatements(imports, plugins, loaders, config);

    // Generate configuration object
    const configInterface = config.includeTypeScript ? ': Configuration' : '';
    code += `\nconst config${configInterface} = {\n`;

    // Add mode
    code += `  mode: '${config.mode}',\n`;

    // Add target
    code += `  target: '${config.targetEnvironment}',\n`;

    // Add entry points
    code += `  entry: ${this.generateEntryCode(entries)},\n`;

    // Add output
    code += `  output: {\n`;
    code += `    path: path.resolve(__dirname, 'dist'),\n`;
    code += `    filename: '[name].[contenthash].js',\n`;
    code += `    clean: true,\n`;
    code += `  },\n`;

    // Add devtool
    if (config.mode === 'development') {
      code += `  devtool: 'eval-source-map',\n`;
    } else {
      code += `  devtool: 'source-map',\n`;
    }

    // Add dev server if enabled
    if (config.includeDevServer) {
      code += `  devServer: {\n`;
      code += `    static: {\n`;
      code += `      directory: path.join(__dirname, 'dist'),\n`;
      code += `    },\n`;
      code += `    compress: true,\n`;
      code += `    port: 9000,\n`;
      code += `    hot: true,\n`;
      code += `  },\n`;
    }

    // Add module/loaders
    if (loaders.length > 0) {
      code += `  module: {\n`;
      code += `    rules: [\n`;
      for (const loader of loaders) {
        code += this.generateLoaderCode(loader);
      }
      code += `    ],\n`;
      code += `  },\n`;
    }

    // Add plugins
    if (plugins.length > 0) {
      code += `  plugins: [\n`;
      for (const plugin of plugins) {
        code += this.generatePluginCode(plugin);
      }
      code += `  ],\n`;
    }

    // Add optimization
    if (config.includeOptimization || config.includeCodeSplitting || config.includePerformanceTuning) {
      code += `  optimization: {\n`;
      code += `    minimize: ${optimization.minimize},\n`;
      if (optimization.splitChunks) {
        code += `    splitChunks: {\n`;
        code += `      chunks: 'all',\n`;
        code += `      cacheGroups: {\n`;
        code += `        vendor: {\n`;
        code += `          test: /node_modules/,\n`;
        code += `          name: 'vendors',\n`;
        code += `          chunks: 'all',\n`;
        code += `        },\n`;
        code += `      },\n`;
        code += `    },\n`;
      }
      if (optimization.runtimeChunk) {
        code += `    runtimeChunk: ${typeof optimization.runtimeChunk === 'string' ? `'${optimization.runtimeChunk}'` : optimization.runtimeChunk},\n`;
      }
      code += `    moduleIds: '${optimization.moduleIds}',\n`;
      code += `    usedExports: ${optimization.usedExports},\n`;
      code += `  },\n`;
    }

    // Add performance tuning if enabled
    if (config.includePerformanceTuning) {
      code += `  performance: {\n`;
      code += `    hints: 'warning',\n`;
      code += `    maxEntrypointSize: 512000,\n`;
      code += `    maxAssetSize: 512000,\n`;
      code += `  },\n`;
    }

    // Add resolve extensions
    code += `  resolve: {\n`;
    code += `    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],\n`;
    code += `  },\n`;

    code += `};\n\n`;

    // Export configuration
    code += `export default config;\n`;

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImportStatements(imports: string[], plugins: WebpackPlugin[], _loaders: WebpackLoader[], config: WebpackConfigGeneratorConfig): string {
    let code = '';

    if (config.includeTypeScript) {
      code += `import { ${imports.includes('Configuration') ? 'Configuration, ' : ''}webpack } from 'webpack';\n`;
    } else {
      code += `const webpack = require('webpack');\n`;
    }

    code += `import * as path from 'path';\n`;

    // Import plugins
    for (const plugin of plugins) {
      if (plugin.constructor === 'webpack') {
        continue;
      }

      const importName = this.getPluginImportName(plugin.name);
      if (config.includeTypeScript) {
        code += `import ${importName} from '${plugin.constructor}';\n`;
      } else {
        code += `const ${importName} = require('${plugin.constructor}');\n`;
      }
    }

    return code;
  }

  /**
   * Generates entry code
   */
  private generateEntryCode(entries: WebpackEntry[]): string {
    if (entries.length === 1 && entries[0]!.name === 'main') {
      return `'${entries[0]!.import[0]}'`;
    }

    let code = '{\n';
    for (const entry of entries) {
      code += `    '${entry.name}: '${entry.import[0]}',\n`;
    }
    code += '  }';

    return code;
  }

  /**
   * Generates loader code
   */
  private generateLoaderCode(loader: WebpackLoader): string {
    let code = `      {\n`;
    code += `        test: ${loader.test},\n`;

    if (loader.exclude) {
      code += `        exclude: ${loader.exclude},\n`;
    }

    if (loader.type) {
      code += `        type: '${loader.type}',\n`;
    }

    if (loader.use) {
      if (loader.use.length === 1) {
        code += `        use: '${loader.use[0]}',\n`;
      } else {
        code += `        use: [\n`;
        for (const use of loader.use) {
          if (typeof use === 'string') {
            code += `          '${use}',\n`;
          } else {
            code += `          ${JSON.stringify(use)},\n`;
          }
        }
        code += `        ],\n`;
      }
    }

    if (loader.options) {
      code += `        options: ${JSON.stringify(loader.options, null, 10)},\n`;
    }

    code += `      },\n`;

    return code;
  }

  /**
   * Generates plugin code
   */
  private generatePluginCode(plugin: WebpackPlugin): string {
    let code = '';
    const importName = this.getPluginImportName(plugin.name);

    // Handle webpack built-in plugins
    if (plugin.constructor === 'webpack') {
      code += `    new webpack.${plugin.name}(),\n`;
    } else {
      if (plugin.options) {
        code += `    new ${importName}(${JSON.stringify(plugin.options, null, 6)}),\n`;
      } else {
        code += `    new ${importName}(),\n`;
      }
    }

    return code;
  }

  /**
   * Gets plugin import name
   */
  private getPluginImportName(pluginName: string): string {
    const importNames: Record<string, string> = {
      HtmlWebpackPlugin: 'HtmlWebpackPlugin',
      MiniCssExtractPlugin: 'MiniCssExtractPlugin',
      CleanWebpackPlugin: 'CleanWebpackPlugin',
      DefinePlugin: 'webpack.DefinePlugin',
      HotModuleReplacementPlugin: 'webpack.HotModuleReplacementPlugin',
      BundleAnalyzerPlugin: 'BundleAnalyzerPlugin',
      ForkTsCheckerWebpackPlugin: 'ForkTsCheckerWebpackPlugin',
      EsLintPlugin: 'EsLintPlugin',
      ProgressPlugin: 'webpack.ProgressPlugin',
      CopyPlugin: 'CopyPlugin',
      ProvidePlugin: 'webpack.ProvidePlugin',
      IgnorePlugin: 'webpack.IgnorePlugin',
      EnvironmentPlugin: 'webpack.EnvironmentPlugin',
    };

    return importNames[pluginName] || pluginName;
  }

  /**
   * Calculates dependencies based on loaders and plugins
   */
  private calculateDependencies(loaders: WebpackLoader[], plugins: WebpackPlugin[], _config: WebpackConfigGeneratorConfig): string[] {
    const dependencies: string[] = [];

    // Add loader dependencies
    for (const loader of loaders) {
      if (loader.name.includes('-loader')) {
        dependencies.push(loader.name);
      }
    }

    // Add plugin dependencies (excluding webpack built-ins)
    for (const plugin of plugins) {
      if (plugin.constructor !== 'webpack') {
        dependencies.push(plugin.constructor);
      }
    }

    // Remove duplicates
    return Array.from(new Set(dependencies));
  }

  /**
   * Calculates dev dependencies
   */
  private calculateDevDependencies(config: WebpackConfigGeneratorConfig): string[] {
    const devDependencies: string[] = [];

    // Always include webpack
    devDependencies.push('webpack');
    devDependencies.push('webpack-cli');

    // Add webpack dev server if enabled
    if (config.includeDevServer) {
      devDependencies.push('webpack-dev-server');
    }

    // Add TypeScript if enabled
    if (config.includeTypeScript) {
      devDependencies.push('typescript');
      devDependencies.push('ts-node');
      devDependencies.push('@types/node');
    }

    // Add bundle analyzer if enabled
    if (config.includeBundleAnalysis) {
      devDependencies.push('webpack-bundle-analyzer');
    }

    return Array.from(new Set(devDependencies));
  }

  /**
   * Calculates the file path for the config
   */
  private calculateFilePath(workspacePath: string, configName: string, config: WebpackConfigGeneratorConfig): string {
    const extension = config.includeTypeScript ? '.ts' : '.js';
    const fileName = configName === 'webpack.config' ? `webpack.config${extension}` : `webpack.${configName}.config${extension}`;
    return path.join(workspacePath, config.outputDirectory, fileName);
  }

  /**
   * Creates the webpack configuration file at the specified path
   */
  public async createConfigFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write config file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Webpack config file created', { filePath });
  }
}
