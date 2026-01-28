import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SuspenseBoundaryOptions {
  boundaryType: 'simple' | 'nested' | 'progressive';
  includeTypeScript: boolean;
  includeErrorBoundary: boolean;
  includeFallbackComponent: boolean;
  includeLoadingIndicator: boolean;
  includeSuspenseList: boolean;
  boundaryName: string;
  fallbackComponentName?: string;
  loadingIndicatorType?: 'skeleton' | 'spinner' | 'progress' | 'custom';
  nestedLevels?: number;
}

export interface SuspenseBoundaryInfo {
  componentName: string;
  hasAsyncOperations: boolean;
  hasDataFetching: boolean;
  hasLazyLoading: boolean;
  recommendedPattern: 'simple' | 'nested' | 'progressive';
}

export interface GeneratedSuspenseBoundary {
  boundaryName: string;
  suspenseCode: string;
  fallbackCode?: string;
  filePath: string;
  hasTypeScript: boolean;
  boundaryType: 'simple' | 'nested' | 'progressive';
  includesErrorBoundary: boolean;
}

/**
 * Service for generating React Suspense boundaries with loading fallbacks
 */
export class ReactSuspenseBoundaryGeneratorService {
  private static instance: ReactSuspenseBoundaryGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactSuspenseBoundaryGeneratorService {
    ReactSuspenseBoundaryGeneratorService.instance ??= new ReactSuspenseBoundaryGeneratorService();
    return ReactSuspenseBoundaryGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React Suspense boundary
   */
  public async generateSuspenseBoundary(
    document: vscode.TextDocument,
    options: SuspenseBoundaryOptions,
  ): Promise<GeneratedSuspenseBoundary> {
    // Analyze current component to understand Suspense needs
    const suspenseInfo = this.analyzeSuspenseNeeds(document);

    // Generate the Suspense boundary code
    const suspenseCode = this.generateSuspenseCode(options, suspenseInfo);

    // Generate fallback component if requested
    let fallbackCode: string | undefined;
    if (options.includeFallbackComponent) {
      fallbackCode = this.generateFallbackComponent(options);
    }

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, options);

    this.logger.info('React Suspense Boundary generated', {
      boundaryName: options.boundaryName,
      boundaryType: options.boundaryType,
      hasTypeScript: options.includeTypeScript,
      includesErrorBoundary: options.includeErrorBoundary,
    });

    return {
      boundaryName: options.boundaryName,
      suspenseCode,
      fallbackCode,
      filePath,
      hasTypeScript: options.includeTypeScript,
      boundaryType: options.boundaryType,
      includesErrorBoundary: options.includeErrorBoundary,
    };
  }

  /**
   * Analyzes the current document to determine Suspense boundary needs
   */
  private analyzeSuspenseNeeds(document: vscode.TextDocument): SuspenseBoundaryInfo {
    const code = document.getText();
    const componentName = path.basename(document.fileName).replace(/\.(tsx?|jsx?)$/, '');

    // Detect async patterns
    const hasAsyncOperations = /useEffect|useCallback|fetch\(|axios\.|\.then\(|async\s+function/.test(code);
    const hasDataFetching = /useQuery|useSuspenseQuery|fetch\(|axios\.|useFetch|useLazyLoad/.test(code);
    const hasLazyLoading = /React\.lazy|lazy\(|Suspense/.test(code);

    // Determine recommended pattern
    let recommendedPattern: 'simple' | 'nested' | 'progressive' = 'simple';
    if (hasLazyLoading && hasDataFetching) {
      recommendedPattern = 'progressive';
    } else if (hasDataFetching) {
      recommendedPattern = 'nested';
    }

    return {
      componentName,
      hasAsyncOperations,
      hasDataFetching,
      hasLazyLoading,
      recommendedPattern,
    };
  }

  /**
   * Generates the complete Suspense boundary code
   */
  private generateSuspenseCode(
    options: SuspenseBoundaryOptions,
    info: SuspenseBoundaryInfo,
  ): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Generate imports
    code += this.generateImports(options);

    if (options.boundaryType === 'simple') {
      code += this.generateSimpleSuspense(options, ts);
    } else if (options.boundaryType === 'nested') {
      code += this.generateNestedSuspense(options, ts);
    } else {
      code += this.generateProgressiveSuspense(options, ts);
    }

    return code;
  }

  /**
   * Generates simple Suspense boundary
   */
  private generateSimpleSuspense(options: SuspenseBoundaryOptions, ts: boolean): string {
    let code = '\n';

    if (ts) {
      code += `interface ${options.boundaryName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `  fallback?: React.ReactNode;\n`;
      code += `}\n\n`;
    }

    code += `export const ${options.boundaryName}: ${ts ? `React.FC<${options.boundaryName}Props>` : 'React.FC'} = ({\n`;
    code += `  children,\n`;
    code += `  fallback,\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <Suspense fallback={fallback || <${this.getFallbackComponentName(options)} />}>\n`;
    code += `      {children}\n`;
    if (options.includeErrorBoundary) {
      code += `      {/* Wrap with ErrorBoundary for error handling */}\n`;
      code += `      {/* <ErrorBoundary>{children}</ErrorBoundary> */}\n`;
    }
    code += `    </Suspense>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates nested Suspense boundaries for progressive data loading
   */
  private generateNestedSuspense(options: SuspenseBoundaryOptions, ts: boolean): string {
    let code = '\n';
    const levels = options.nestedLevels || 3;

    if (ts) {
      code += `interface ${options.boundaryName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `  fallback?: React.ReactNode;\n`;
      code += `}\n\n`;
    }

    code += `export const ${options.boundaryName}: ${ts ? `React.FC<${options.boundaryName}Props>` : 'React.FC'} = ({\n`;
    code += `  children,\n`;
    code += `  fallback,\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <Suspense fallback={fallback || <${this.getFallbackComponentName(options)} />}>\n`;

    for (let i = 0; i < levels; i++) {
      const indent = '      '.repeat(i + 1);
      code += `${indent} {/* Nested Suspense boundary level ${i + 1} */}\n`;
      code += `${indent} <Suspense fallback={<${this.getFallbackComponentName(options, i)} />}>\n`;
    }

    code += `${'      '.repeat(levels + 1)}{children}\n`;

    for (let i = levels - 1; i >= 0; i--) {
      const indent = '      '.repeat(i + 1);
      code += `${indent} </Suspense>\n`;
    }

    code += `    </Suspense>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates progressive Suspense boundaries with SuspenseList
   */
  private generateProgressiveSuspense(options: SuspenseBoundaryOptions, ts: boolean): string {
    let code = '\n';

    if (ts) {
      code += `interface ${options.boundaryName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `  fallback?: React.ReactNode;\n`;
      code += `}\n\n`;
    }

    code += `export const ${options.boundaryName}: ${ts ? `React.FC<${options.boundaryName}Props>` : 'React.FC'} = ({\n`;
    code += `  children,\n`;
    code += `  fallback,\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <Suspense fallback={fallback || <${this.getFallbackComponentName(options)} />}>\n`;

    if (options.includeSuspenseList) {
      code += `      <SuspenseList revealOrder="forwards" tail="hidden">\n`;
      code += `        {/* Items load progressively in order */}\n`;
      code += `        {children}\n`;
      code += `      </SuspenseList>\n`;
    } else {
      code += `      {children}\n`;
    }

    code += `    </Suspense>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(options: SuspenseBoundaryOptions): string {
    let imports = "import React, { Suspense } from 'react';\n";

    if (options.includeSuspenseList) {
      imports += "import { SuspenseList } from 'react';\n";
    }

    if (options.includeLoadingIndicator) {
      imports += "// Import your loading component\n";
      imports += `// import ${this.getFallbackComponentName(options)} from './${this.getFallbackComponentName(options)}';\n`;
    }

    return imports;
  }

  /**
   * Generates fallback component
   */
  private generateFallbackComponent(options: SuspenseBoundaryOptions): string {
    const componentName = this.getFallbackComponentName(options);
    const ts = options.includeTypeScript;

    let code = `\n// ${componentName} - Fallback loading component\n`;

    if (options.loadingIndicatorType === 'skeleton') {
      code += this.generateSkeletonFallback(componentName, ts);
    } else if (options.loadingIndicatorType === 'spinner') {
      code += this.generateSpinnerFallback(componentName, ts);
    } else if (options.loadingIndicatorType === 'progress') {
      code += this.generateProgressFallback(componentName, ts);
    } else {
      code += this.generateCustomFallback(componentName, ts);
    }

    return code;
  }

  /**
   * Generates skeleton fallback component
   */
  private generateSkeletonFallback(componentName: string, ts: boolean): string {
    let code = '';

    if (ts) {
      code += `interface ${componentName}Props {\n`;
      code += `  className?: string;\n`;
      code += `}\n\n`;
    }

    code += `export const ${componentName}: ${ts ? `React.FC<${componentName}Props>` : 'React.FC'} = ({\n`;
    code += `  className = '',\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <div className={\`skeleton ${className}\`} style={{\n`;
    code += `      animation: 'pulse 1.5s ease-in-out infinite',\n`;
    code += `      backgroundColor: '#e0e0e0',\n`;
    code += `      borderRadius: '4px',\n`;
    code += `      height: '100px',\n`;
    code += `      width: '100%',\n`;
    code += `    }}>\n`;
    code += `      {/* Add skeleton elements matching your content structure */}\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates spinner fallback component
   */
  private generateSpinnerFallback(componentName: string, ts: boolean): string {
    let code = '';

    if (ts) {
      code += `interface ${componentName}Props {\n`;
      code += `  size?: number;\n`;
      code += `  color?: string;\n`;
      code += `}\n\n`;
    }

    code += `export const ${componentName}: ${ts ? `React.FC<${componentName}Props>` : 'React.FC'} = ({\n`;
    code += `  size = 40,\n`;
    code += `  color = '#007bff',\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <div style={{\n`;
    code += `      display: 'flex',\n`;
    code += `      justifyContent: 'center',\n`;
    code += `      alignItems: 'center',\n`;
    code += `      padding: '20px',\n`;
    code += `    }}>\n`;
    code += `      <div style={{\n`;
    code += `        width: size,\n`;
    code += `        height: size,\n`;
    code += `        border: \`4px solid rgba(0, 0, 0, 0.1)\`,\n`;
    code += `        borderTopColor: color,\n`;
    code += `        borderRadius: '50%',\n`;
    code += `        animation: 'spin 1s linear infinite',\n`;
    code += `      }} />\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates progress bar fallback component
   */
  private generateProgressFallback(componentName: string, ts: boolean): string {
    let code = '';

    if (ts) {
      code += `interface ${componentName}Props {\n`;
      code += `  progress?: number;\n`;
      code += `}\n\n`;
    }

    code += `export const ${componentName}: ${ts ? `React.FC<${componentName}Props>` : 'React.FC'} = ({\n`;
    code += `  progress = 50,\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <div style={{\n`;
    code += `      width: '100%',\n`;
    code += `      height: '4px',\n`;
    code += `      backgroundColor: '#e0e0e0',\n`;
    code += `      borderRadius: '2px',\n`;
    code += `      overflow: 'hidden',\n`;
    code += `      margin: '20px 0',\n`;
    code += `    }}>\n`;
    code += `      <div\n`;
    code += `        style={{\n`;
    code += `          width: \`\${progress}%\`,\n`;
    code += `          height: '100%',\n`;
    code += `          backgroundColor: '#007bff',\n`;
    code += `          transition: 'width 0.3s ease',\n`;
    code += `        }}\n`;
    code += `      />\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates custom fallback component
   */
  private generateCustomFallback(componentName: string, ts: boolean): string {
    let code = '';

    if (ts) {
      code += `interface ${componentName}Props {\n`;
      code += `  message?: string;\n`;
      code += `}\n\n`;
    }

    code += `export const ${componentName}: ${ts ? `React.FC<${componentName}Props>` : 'React.FC'} = ({\n`;
    code += `  message = 'Loading...',\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <div style={{\n`;
    code += `      display: 'flex',\n`;
    code += `      justifyContent: 'center',\n`;
    code += `      alignItems: 'center',\n`;
    code += `      padding: '20px',\n`;
    code += `      flexDirection: 'column',\n`;
    code += `      gap: '12px',\n`;
    code += `    }}>\n`;
    code += `      <div style={{\n`;
    code += `        fontSize: '16px',\n`;
    code += `        color: '#666',\n`;
    code += `      }}>\n`;
    code += `        {message}\n`;
    code += `      </div>\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Gets fallback component name
   */
  private getFallbackComponentName(options: SuspenseBoundaryOptions, level = 0): string {
    if (options.fallbackComponentName) {
      return level > 0 ? `${options.fallbackComponentName}Level${level + 1}` : options.fallbackComponentName;
    }
    return level > 0 ? `LoadingFallbackLevel${level + 1}` : 'LoadingFallback';
  }

  /**
   * Calculates file path for the Suspense boundary component
   */
  private calculateFilePath(sourceFilePath: string, options: SuspenseBoundaryOptions): string {
    const sourceDir = path.dirname(sourceFilePath);

    // Determine file extension
    const ext = options.includeTypeScript ? '.tsx' : '.jsx';

    // Create filename from boundary name
    const fileName = `${options.boundaryName}${ext}`;

    return path.join(sourceDir, fileName);
  }

  /**
   * Creates the Suspense boundary file at the specified path
   */
  public async createSuspenseBoundaryFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Suspense boundary file created', { filePath });
  }

  /**
   * Checks if a Suspense boundary file already exists
   */
  public async suspenseBoundaryFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generator options from user
   */
  public async getGeneratorOptions(): Promise<SuspenseBoundaryOptions | undefined> {
    // Step 1: Ask for boundary type
    const boundaryType = await vscode.window.showQuickPick(
      [
        {
          label: 'Simple',
          description: 'Basic Suspense boundary with a single fallback',
          value: 'simple',
        },
        {
          label: 'Nested',
          description: 'Multiple nested Suspense boundaries for progressive loading',
          value: 'nested',
        },
        {
          label: 'Progressive',
          description: 'Suspense boundaries with SuspenseList for ordered loading',
          value: 'progressive',
        },
      ],
      {
        placeHolder: 'Select Suspense boundary type',
      },
    );

    if (!boundaryType) {
      return undefined;
    }

    // Step 2: Ask for boundary name
    const boundaryName = await vscode.window.showInputBox({
      prompt: 'Enter Suspense boundary component name',
      placeHolder: 'SuspenseBoundary',
      value: 'SuspenseBoundary',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Boundary name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Component name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!boundaryName) {
      return undefined;
    }

    // Step 3: Ask about TypeScript
    const includeTypeScript = await this.askYesNoQuestion('Use TypeScript?', true);

    // Step 4: Ask about features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Error Boundary Integration', description: 'Include ErrorBoundary wrapper', picked: true },
        { label: 'Fallback Component', description: 'Generate separate fallback component', picked: true },
        { label: 'Loading Indicator', description: 'Include loading indicator in fallback', picked: true },
        { label: 'SuspenseList Support', description: 'Use SuspenseList for ordered loading', picked: false },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    // Step 5: Ask for nested levels if nested type
    let nestedLevels: number | undefined;
    if (boundaryType.value === 'nested') {
      const levels = await vscode.window.showInputBox({
        prompt: 'Enter number of nested levels',
        placeHolder: '3',
        value: '3',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < 1 || num > 10) {
            return 'Please enter a number between 1 and 10';
          }
          return null;
        },
      });

      if (levels) {
        nestedLevels = Number.parseInt(levels, 10);
      }
    }

    // Step 6: Ask for fallback component name if including fallback
    let fallbackComponentName: string | undefined;
    if (features.some((f) => f.label === 'Fallback Component')) {
      fallbackComponentName = await vscode.window.showInputBox({
        prompt: 'Enter fallback component name',
        placeHolder: 'LoadingFallback',
        value: 'LoadingFallback',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Component name cannot be empty';
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
            return 'Component name must start with uppercase letter';
          }
          return null;
        },
      });
    }

    // Step 7: Ask for loading indicator type if including loading indicator
    let loadingIndicatorType: 'skeleton' | 'spinner' | 'progress' | 'custom' | undefined;
    if (features.some((f) => f.label === 'Loading Indicator')) {
      const indicatorType = await vscode.window.showQuickPick(
        [
          { label: 'Skeleton', description: 'Animated skeleton placeholder', value: 'skeleton' },
          { label: 'Spinner', description: 'Rotating loading spinner', value: 'spinner' },
          { label: 'Progress Bar', description: 'Linear progress indicator', value: 'progress' },
          { label: 'Custom', description: 'Custom loading message', value: 'custom' },
        ],
        {
          placeHolder: 'Select loading indicator type',
        },
      );

      loadingIndicatorType = indicatorType?.value as 'skeleton' | 'spinner' | 'progress' | 'custom';
    }

    return {
      boundaryType: boundaryType.value as 'simple' | 'nested' | 'progressive',
      includeTypeScript,
      includeErrorBoundary: features.some((f) => f.label === 'Error Boundary Integration'),
      includeFallbackComponent: features.some((f) => f.label === 'Fallback Component'),
      includeLoadingIndicator: features.some((f) => f.label === 'Loading Indicator'),
      includeSuspenseList: features.some((f) => f.label === 'SuspenseList Support'),
      boundaryName: boundaryName.trim(),
      fallbackComponentName,
      loadingIndicatorType,
      nestedLevels,
    };
  }

  /**
   * Helper to ask yes/no questions
   */
  private async askYesNoQuestion(question: string, defaultValue: boolean): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: '', value: true },
        { label: 'No', description: '', value: false },
      ],
      {
        placeHolder: question,
      },
    );

    return choice?.value ?? defaultValue;
  }
}
