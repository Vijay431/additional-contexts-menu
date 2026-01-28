import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface CriticalCssExtractorOptions {
  outputDirectory: string;
  criticalFileName: string;
  nonCriticalFileName: string;
  includeMediaQueries: boolean;
  includeKeyframes: boolean;
  minifyOutput: boolean;
  generateAsyncLoader: boolean;
  aboveFoldThreshold: number;
}

export interface ComponentUsage {
  componentName: string;
  className: string;
  usageCount: number;
  isAboveFold: boolean;
}

export interface ExtractedCriticalCss {
  criticalCss: string;
  nonCriticalCss: string;
  componentUsage: ComponentUsage[];
  asyncLoaderScript: string;
  statistics: {
    totalRules: number;
    criticalRules: number;
    nonCriticalRules: number;
    originalSize: number;
    criticalSize: number;
    estimatedSavings: number;
  };
}

/**
 * Service for analyzing component usage and extracting critical CSS
 * Generates above-the-fold CSS with async loading for non-critical styles
 */
export class CriticalCssExtractorService {
  private static instance: CriticalCssExtractorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CriticalCssExtractorService {
    CriticalCssExtractorService.instance ??= new CriticalCssExtractorService();
    return CriticalCssExtractorService.instance;
  }

  /**
   * Main entry point: Extracts critical CSS from selected CSS or component files
   */
  public async extractCriticalCss(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: CriticalCssExtractorOptions,
  ): Promise<ExtractedCriticalCss> {
    const selectedText = document.getText(selection);

    // Analyze component usage if available
    const componentUsage = await this.analyzeComponentUsage(document, selection);

    // Parse CSS rules
    const cssRules = this.parseCssRules(selectedText);

    // Classify rules as critical or non-critical
    const { criticalRules, nonCriticalRules } = this.classifyRules(
      cssRules,
      componentUsage,
      options,
    );

    // Generate output CSS
    const criticalCss = this.generateCssFromRules(criticalRules, options.minifyOutput);
    const nonCriticalCss = this.generateCssFromRules(nonCriticalRules, options.minifyOutput);

    // Generate async loader script if requested
    const asyncLoaderScript = options.generateAsyncLoader
      ? this.generateAsyncLoaderScript(options)
      : '';

    // Calculate statistics
    const statistics = this.calculateStatistics(
      selectedText,
      criticalCss,
      nonCriticalCss,
      cssRules.length,
      criticalRules.length,
    );

    this.logger.info('Critical CSS extracted', {
      criticalRules: criticalRules.length,
      nonCriticalRules: nonCriticalRules.length,
      estimatedSavings: statistics.estimatedSavings,
    });

    return {
      criticalCss,
      nonCriticalCss,
      componentUsage,
      asyncLoaderScript,
      statistics,
    };
  }

  /**
   * Analyzes component usage in the current document
   */
  private async analyzeComponentUsage(
    document: vscode.TextDocument,
    selection: vscode.Selection,
  ): Promise<ComponentUsage[]> {
    const componentUsage: ComponentUsage[] = [];
    const selectedText = document.getText(selection);
    const fileExtension = path.extname(document.fileName);

    // Only analyze for component files (JSX, TSX, Vue, Svelte)
    if (
      !['.tsx', '.jsx', '.vue', '.svelte'].includes(fileExtension) &&
      document.languageId !== 'typescriptreact' &&
      document.languageId !== 'javascriptreact'
    ) {
      return componentUsage;
    }

    // Extract class names and component usage
    const classNames = this.extractClassNames(selectedText);
    const componentNames = this.extractComponentNames(selectedText);

    // Mark as above-fold based on position
    const documentText = document.getText();
    const selectionOffset = document.offsetAt(selection.start);
    const aboveFoldThreshold = documentText.length * 0.3; // Top 30% considered above-fold

    for (const className of classNames) {
      const usageCount = this.countOccurrences(selectedText, `.${className}`);
      componentUsage.push({
        componentName: '',
        className,
        usageCount,
        isAboveFold: selectionOffset < aboveFoldThreshold,
      });
    }

    for (const componentName of componentNames) {
      const usageCount = this.countOccurrences(selectedText, `<${componentName}`);
      componentUsage.push({
        componentName,
        className: '',
        usageCount,
        isAboveFold: selectionOffset < aboveFoldThreshold,
      });
    }

    return componentUsage;
  }

  /**
   * Extracts CSS class names from component code
   */
  private extractClassNames(code: string): string[] {
    const classNames = new Set<string>();

    // Match className="..." patterns
    const classAttrRegex = /className=(["'])((?:(?!\1).)*)\1/g;
    let match: RegExpExecArray | null;

    while ((match = classAttrRegex.exec(code)) !== null) {
      const classes = match[2]!.split(/\s+/);
      for (const cls of classes) {
        if (cls && cls.trim()) {
          classNames.add(cls.trim());
        }
      }
    }

    // Match class="..." patterns (HTML/Vue)
    const classRegex = /class=(["'])((?:(?!\1).)*)\1/g;
    while ((match = classRegex.exec(code)) !== null) {
      const classes = match[2]!.split(/\s+/);
      for (const cls of classes) {
        if (cls && cls.trim()) {
          classNames.add(cls.trim());
        }
      }
    }

    // Match dynamic class patterns: className={...}
    const dynamicClassRegex = /className=\{([^}]+)\}/g;
    while ((match = dynamicClassRegex.exec(code)) !== null) {
      // Extract string literals from the expression
      const strings = match[1]!.match(/(["'])((?:(?!\1).)*?)\1/g) || [];
      for (const str of strings) {
        const classes = str.slice(1, -1).split(/\s+/);
        for (const cls of classes) {
          if (cls && cls.trim()) {
            classNames.add(cls.trim());
          }
        }
      }
    }

    return Array.from(classNames);
  }

  /**
   * Extracts component names from JSX/TSX code
   */
  private extractComponentNames(code: string): string[] {
    const componentNames = new Set<string>();

    // Match self-closing components: <ComponentName />
    const selfClosingRegex = /<([A-Z][a-zA-Z0-9_]*)\s+[^>]*\/>/g;
    let match: RegExpExecArray | null;

    while ((match = selfClosingRegex.exec(code)) !== null) {
      componentNames.add(match[1]!);
    }

    // Match opening tags: <ComponentName ...>
    const openingTagRegex = /<([A-Z][a-zA-Z0-9_]*)\s[^/>]*(?!\/)>/g;
    while ((match = openingTagRegex.exec(code)) !== null) {
      componentNames.add(match[1]!);
    }

    return Array.from(componentNames);
  }

  /**
   * Counts occurrences of a pattern in text
   */
  private countOccurrences(text: string, pattern: string): number {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Parses CSS rules from CSS text
   */
  private parseCssRules(cssText: string): CssRule[] {
    const rules: CssRule[] = [];

    // Remove comments
    const cssWithoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

    // Match CSS rules: selector { properties }
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = ruleRegex.exec(cssWithoutComments)) !== null) {
      const selector = match[1]!.trim();
      const properties = match[2]!.trim();

      // Skip empty rules
      if (!selector || !properties) {
        continue;
      }

      const rule: CssRule = {
        selector,
        properties,
        isMediaQuery: selector.startsWith('@media'),
        isKeyframes: selector.startsWith('@keyframes') || selector.startsWith('@-webkit-keyframes'),
        isSupports: selector.startsWith('@supports'),
        position: match.index,
      };

      rules.push(rule);
    }

    return rules;
  }

  /**
   * Classifies CSS rules as critical or non-critical
   */
  private classifyRules(
    rules: CssRule[],
    componentUsage: ComponentUsage[],
    options: CriticalCssExtractorOptions,
  ): { criticalRules: CssRule[]; nonCriticalRules: CssRule[] } {
    const criticalRules: CssRule[] = [];
    const nonCriticalRules: CssRule[] = [];

    const criticalClassNames = new Set(
      componentUsage.filter((u) => u.isAboveFold).map((u) => u.className),
    );

    for (const rule of rules) {
      const isCritical = this.isRuleCritical(rule, criticalClassNames, options);

      if (isCritical) {
        criticalRules.push(rule);
      } else {
        nonCriticalRules.push(rule);
      }
    }

    return { criticalRules, nonCriticalRules };
  }

  /**
   * Determines if a CSS rule is critical
   */
  private isRuleCritical(
    rule: CssRule,
    criticalClassNames: Set<string>,
    options: CriticalCssExtractorOptions,
  ): boolean {
    // Always include element selectors (html, body, etc.)
    if (/^html|^body|^:root/.test(rule.selector)) {
      return true;
    }

    // Include above-fold classes
    for (const className of Array.from(criticalClassNames)) {
      if (rule.selector.includes(`.${className}`)) {
        return true;
      }
    }

    // Include immediate children selectors for above-fold content
    if (/^[.#]?[\w-]+>\s*[\w-]+/.test(rule.selector)) {
      return true;
    }

    // Handle media queries based on configuration
    if (rule.isMediaQuery) {
      return options.includeMediaQueries;
    }

    // Handle keyframes based on configuration
    if (rule.isKeyframes) {
      return options.includeKeyframes;
    }

    // Handle @supports
    if (rule.isSupports) {
      return true; // Usually critical for feature detection
    }

    // Include animation and transition properties (commonly above-fold)
    if (rule.properties.includes('animation') || rule.properties.includes('transition')) {
      return true;
    }

    return false;
  }

  /**
   * Generates CSS string from array of rules
   */
  private generateCssFromRules(rules: CssRule[], minify: boolean): string {
    if (rules.length === 0) {
      return '';
    }

    let css = '';

    for (const rule of rules) {
      if (minify) {
        // Minified version
        css += `${rule.selector}{${rule.properties}}`;
      } else {
        // Formatted version
        css += `${rule.selector} {\n  ${rule.properties.split(';').join(';\n  ')};\n}\n\n`;
      }
    }

    return css.trim();
  }

  /**
   * Generates async loader script for non-critical CSS
   */
  private generateAsyncLoaderScript(options: CriticalCssExtractorOptions): string {
    const criticalFileName = options.criticalFileName || 'critical.css';
    const nonCriticalFileName = options.nonCriticalFileName || 'non-critical.css';

    return `// Async loader for non-critical CSS
(function() {
  function loadAsyncCSS(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'only x';
    link.onload = function() {
      link.media = 'all';
    };
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  // Load non-critical CSS after page load
  window.addEventListener('load', function() {
    loadAsyncCSS('${nonCriticalFileName}');
  });
})();
`;
  }

  /**
   * Calculates extraction statistics
   */
  private calculateStatistics(
    originalCss: string,
    criticalCss: string,
    nonCriticalCss: string,
    totalRules: number,
    criticalRules: number,
  ): ExtractedCriticalCss['statistics'] {
    const originalSize = new Blob([originalCss]).size;
    const criticalSize = new Blob([criticalCss]).size;
    const nonCriticalRules = totalRules - criticalRules;

    return {
      totalRules,
      criticalRules,
      nonCriticalRules,
      originalSize,
      criticalSize,
      estimatedSavings: originalSize - criticalSize,
    };
  }

  /**
   * Gets extraction options from user configuration
   */
  public async getExtractionOptions(): Promise<CriticalCssExtractorOptions | undefined> {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');
    const extractorConfig = config.get<CriticalCssExtractorOptions>('criticalCssExtractor', {
      outputDirectory: './styles',
      criticalFileName: 'critical.css',
      nonCriticalFileName: 'non-critical.css',
      includeMediaQueries: false,
      includeKeyframes: false,
      minifyOutput: false,
      generateAsyncLoader: true,
      aboveFoldThreshold: 30,
    });

    // Quick pick for output directory
    const outputDirectory = await vscode.window.showInputBox({
      prompt: 'Enter output directory for CSS files',
      value: extractorConfig.outputDirectory || './styles',
      placeHolder: './styles',
    });

    if (!outputDirectory) {
      return undefined;
    }

    // Quick pick for options
    const includeMediaQueries = await vscode.window.showQuickPick(
      ['Yes', 'No'],
      {
        placeHolder: 'Include media queries in critical CSS?',
      },
    );

    if (!includeMediaQueries) {
      return undefined;
    }

    const includeKeyframes = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Include keyframes in critical CSS?',
    });

    if (!includeKeyframes) {
      return undefined;
    }

    const generateAsyncLoader = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Generate async loader script?',
    });

    if (!generateAsyncLoader) {
      return undefined;
    }

    return {
      outputDirectory,
      criticalFileName: extractorConfig.criticalFileName || 'critical.css',
      nonCriticalFileName: extractorConfig.nonCriticalFileName || 'non-critical.css',
      includeMediaQueries: includeMediaQueries === 'Yes',
      includeKeyframes: includeKeyframes === 'Yes',
      minifyOutput: extractorConfig.minifyOutput || false,
      generateAsyncLoader: generateAsyncLoader === 'Yes',
      aboveFoldThreshold: extractorConfig.aboveFoldThreshold || 30,
    };
  }

  /**
   * Creates CSS files from extracted critical CSS
   */
  public async createCssFiles(
    outputDirectory: string,
    criticalFileName: string,
    nonCriticalFileName: string,
    extracted: ExtractedCriticalCss,
    workspacePath: string,
  ): Promise<void> {
    const criticalPath = path.join(workspacePath, outputDirectory, criticalFileName);
    const nonCriticalPath = path.join(workspacePath, outputDirectory, nonCriticalFileName);
    const loaderPath = path.join(workspacePath, outputDirectory, 'css-async-loader.js');

    try {
      // Create output directory if it doesn't exist
      const dirUri = vscode.Uri.file(path.dirname(criticalPath));
      try {
        await vscode.workspace.fs.stat(dirUri);
      } catch {
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      // Write critical CSS
      const criticalUri = vscode.Uri.file(criticalPath);
      await vscode.workspace.fs.writeFile(
        criticalUri,
        Buffer.from(extracted.criticalCss, 'utf-8'),
      );

      // Write non-critical CSS
      const nonCriticalUri = vscode.Uri.file(nonCriticalPath);
      await vscode.workspace.fs.writeFile(
        nonCriticalUri,
        Buffer.from(extracted.nonCriticalCss, 'utf-8'),
      );

      // Write async loader script
      if (extracted.asyncLoaderScript) {
        const loaderUri = vscode.Uri.file(loaderPath);
        await vscode.workspace.fs.writeFile(
          loaderUri,
          Buffer.from(extracted.asyncLoaderScript, 'utf-8'),
        );
      }

      this.logger.info('CSS files created', {
        criticalPath,
        nonCriticalPath,
        loaderPath,
      });
    } catch (error) {
      this.logger.error('Error creating CSS files', error);
      throw error;
    }
  }

  /**
   * Generates HTML snippet for manual integration
   */
  public generateHtmlSnippet(
    criticalFileName: string,
    nonCriticalFileName: string,
    generateAsyncLoader: boolean,
  ): string {
    let snippet = `<!-- Critical CSS - Load synchronously -->\n`;
    snippet += `<link rel="stylesheet" href="${criticalFileName}">\n\n`;

    if (generateAsyncLoader) {
      snippet += `<!-- Async Loader for Non-Critical CSS -->\n`;
      snippet += `<script src="./styles/css-async-loader.js"></script>\n`;
    } else {
      snippet += `<!-- Non-Critical CSS - Load asynchronously -->\n`;
      snippet += `<link rel="preload" href="${nonCriticalFileName}" as="style" onload="this.onload=null;this.rel='stylesheet'">\n`;
      snippet += `<noscript><link rel="stylesheet" href="${nonCriticalFileName}"></noscript>\n`;
    }

    return snippet;
  }
}

interface CssRule {
  selector: string;
  properties: string;
  isMediaQuery: boolean;
  isKeyframes: boolean;
  isSupports: boolean;
  position: number;
}
