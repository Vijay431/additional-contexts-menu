import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ReactErrorBoundaryOptions {
  boundaryType: 'class' | 'functional';
  includeTypeScript: boolean;
  includeErrorLogging: boolean;
  includeFallbackUI: boolean;
  includeStackTrace: boolean;
  includeErrorReporting: boolean;
  boundaryName: string;
  fallbackComponent?: string;
  onErrorCallback?: string;
}

export interface ErrorBoundaryInfo {
  componentName: string;
  hasErrorLogging: boolean;
  hasErrorReporting: boolean;
  hasFallbackUI: boolean;
  errorHandlingMethods: string[];
}

export interface GeneratedErrorBoundary {
  boundaryName: string;
  errorBoundaryCode: string;
  filePath: string;
  hasTypeScript: boolean;
  boundaryType: 'class' | 'functional';
}

/**
 * Service for generating React error boundary components
 */
export class ReactErrorBoundaryGeneratorService {
  private static instance: ReactErrorBoundaryGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactErrorBoundaryGeneratorService {
    ReactErrorBoundaryGeneratorService.instance ??= new ReactErrorBoundaryGeneratorService();
    return ReactErrorBoundaryGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React error boundary component
   */
  public async generateErrorBoundary(
    document: vscode.TextDocument,
    options: ReactErrorBoundaryOptions,
  ): Promise<GeneratedErrorBoundary> {
    // Analyze current component to understand error handling needs
    const errorBoundaryInfo = this.analyzeErrorBoundaryNeeds(document);

    // Generate the error boundary code
    const errorBoundaryCode = this.generateErrorBoundaryCode(options, errorBoundaryInfo);

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, options);

    this.logger.info('React Error Boundary component generated', {
      boundaryName: options.boundaryName,
      boundaryType: options.boundaryType,
      hasTypeScript: options.includeTypeScript,
    });

    return {
      boundaryName: options.boundaryName,
      errorBoundaryCode,
      filePath,
      hasTypeScript: options.includeTypeScript,
      boundaryType: options.boundaryType,
    };
  }

  /**
   * Analyzes the current document to determine error boundary needs
   */
  private analyzeErrorBoundaryNeeds(document: vscode.TextDocument): ErrorBoundaryInfo {
    const code = document.getText();
    const componentName = path.basename(document.fileName).replace(/\.(tsx?|jsx?)$/, '');

    // Detect if component already has error handling
    const hasTryCatch = /try\s*\{/.test(code);
    const hasErrorHandling =
      /catch\s*\([^)]*\)\s*\{/.test(code) || /onError\s*=/i.test(code);
    const hasAsyncOperation = /useEffect|useCallback|fetch\(|axios\.|\.then\(/.test(code);
    const hasStateUpdates = /useState|set[A-Z]\w+|dispatch\(/.test(code);

    const errorHandlingMethods: string[] = [];
    if (hasTryCatch) errorHandlingMethods.push('try-catch');
    if (hasErrorHandling) errorHandlingMethods.push('error-handlers');
    if (hasAsyncOperation) errorHandlingMethods.push('async-operations');
    if (hasStateUpdates) errorHandlingMethods.push('state-updates');

    return {
      componentName,
      hasErrorLogging: true, // Always include logging for error boundaries
      hasErrorReporting: hasErrorHandling,
      hasFallbackUI: true,
      errorHandlingMethods,
    };
  }

  /**
   * Generates the complete error boundary code
   */
  private generateErrorBoundaryCode(
    options: ReactErrorBoundaryOptions,
    info: ErrorBoundaryInfo,
  ): string {
    if (options.boundaryType === 'class') {
      return this.generateClassBasedErrorBoundary(options, info);
    } else {
      return this.generateFunctionalErrorBoundary(options, info);
    }
  }

  /**
   * Generates class-based error boundary component
   */
  private generateClassBasedErrorBoundary(
    options: ReactErrorBoundaryOptions,
    info: ErrorBoundaryInfo,
  ): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Generate imports
    code += this.generateImports(options, info);

    // Generate props interface for TypeScript
    if (ts) {
      code += `\ninterface ${options.boundaryName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `  fallback?: React.ReactNode;\n`;
      if (options.includeErrorReporting && options.onErrorCallback) {
        code += `  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;\n`;
      }
      code += `}\n\n`;

      code += `interface ${options.boundaryName}State {\n`;
      code += `  hasError: boolean;\n`;
      if (options.includeStackTrace) {
        code += `  error?: Error;\n`;
        code += `  errorInfo?: React.ErrorInfo;\n`;
      }
      code += `}\n\n`;
    }

    // Generate class component
    code += `export class ${options.boundaryName} extends${ts ? ` React.Component<${options.boundaryName}Props, ${options.boundaryName}State>` : ' React.Component'} {\n`;

    // Generate state initialization
    if (ts) {
      code += `  public constructor(props: ${options.boundaryName}Props) {\n`;
    } else {
      code += `  constructor(props) {\n`;
    }
    code += `    super(props);\n`;
    code += `    this.state = {\n`;
    code += `      hasError: false,\n`;
    if (options.includeStackTrace) {
      code += `      error: undefined,\n`;
      code += `      errorInfo: undefined,\n`;
    }
    code += `    };\n`;
    code += `  }\n\n`;

    // Generate static getDerivedStateFromError
    code += `  public static getDerivedStateFromError${ts ? '<Error>' : ''}(error: ${ts ? 'Error' : 'any'}) {\n`;
    code += `    return { hasError: true };\n`;
    code += `  }\n\n`;

    // Generate componentDidCatch
    if (options.includeErrorLogging || options.includeErrorReporting) {
      code += `  public componentDidCatch(error: ${ts ? 'Error' : 'any'}, errorInfo: ${ts ? 'React.ErrorInfo' : 'any'}) {\n`;
      if (options.includeErrorLogging) {
        code += this.generateErrorLoggingCode(options, 'class');
      }
      if (options.includeErrorReporting && options.onErrorCallback) {
        code += `    if (${options.onErrorCallback}) {\n`;
        code += `      ${options.onErrorCallback}(error, errorInfo);\n`;
        code += `    }\n`;
      }
      code += `  }\n\n`;
    }

    // Generate render method
    code += `  public render() {\n`;
    code += `    if (this.state.hasError) {\n`;
    if (options.includeFallbackUI) {
      code += `      return ${this.generateFallbackUICode(options, 'class')};\n`;
    } else {
      code += `      return <div>Something went wrong.</div>;\n`;
    }
    code += `    }\n\n`;
    code += `    return this.props.children;\n`;
    code += `  }\n`;

    code += `}\n`;

    return code;
  }

  /**
   * Generates functional error boundary component using hooks
   */
  private generateFunctionalErrorBoundary(
    options: ReactErrorBoundaryOptions,
    info: ErrorBoundaryInfo,
  ): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Generate imports
    code += this.generateImports(options, info);

    // Generate props type/interface
    if (ts) {
      code += `\ninterface ${options.boundaryName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `  fallback?: React.ReactNode;\n`;
      if (options.includeErrorReporting && options.onErrorCallback) {
        code += `  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;\n`;
      }
      code += `}\n\n`;
    }

    // Generate functional component
    code += `export const ${options.boundaryName}: ${ts ? `React.FC<${options.boundaryName}Props>` : 'React.FC'} = ({\n`;
    code += `  children,\n`;
    code += `  fallback,\n`;
    if (options.includeErrorReporting && options.onErrorCallback) {
      code += `  onError,\n`;
    }
    code += `}) => {\n`;

    // Note: Functional error boundaries are not natively supported in React
    // This generates a component that uses a class-based error boundary internally
    code += `  // Functional components cannot be error boundaries in React\n`;
    code += `  // This component wraps children in a class-based error boundary\n\n`;

    if (ts) {
      code += `  interface ErrorBoundaryState {\n`;
      code += `    hasError: boolean;\n`;
      if (options.includeStackTrace) {
        code += `    error?: Error;\n`;
        code += `    errorInfo?: React.ErrorInfo;\n`;
      }
      code += `  }\n\n`;

      code += `  class InternalErrorBoundary extends${ts ? ` React.Component<${options.boundaryName}Props, ErrorBoundaryState>` : ' React.Component'} {\n`;
    } else {
      code += `  class InternalErrorBoundary extends React.Component {\n`;
    }

    code += `    constructor(props) {\n`;
    code += `      super(props);\n`;
    code += `      this.state = { hasError: false };\n`;
    code += `    }\n\n`;

    code += `    static getDerivedStateFromError(error) {\n`;
    code += `      return { hasError: true };\n`;
    code += `    }\n\n`;

    if (options.includeErrorLogging || options.includeErrorReporting) {
      code += `    componentDidCatch(error, errorInfo) {\n`;
      if (options.includeErrorLogging) {
        code += this.generateErrorLoggingCode(options, 'functional');
      }
      if (options.includeErrorReporting && options.onErrorCallback) {
        code += `      if (onError) {\n`;
        code += `        onError(error, errorInfo);\n`;
        code += `      }\n`;
      }
      code += `    }\n\n`;
    }

    code += `    render() {\n`;
    code += `      if (this.state.hasError) {\n`;
    if (options.includeFallbackUI) {
      code += `        return ${this.generateFallbackUICode(options, 'functional', true)};\n`;
    } else {
      code += `        return <div>Something went wrong.</div>;\n`;
    }
    code += `      }\n`;
    code += `      return children;\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    code += `  return <InternalErrorBoundary>${children}</InternalErrorBoundary>;\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(options: ReactErrorBoundaryOptions, info: ErrorBoundaryInfo): string {
    let imports = "import React from 'react';\n";

    if (options.includeErrorLogging) {
      imports += "import { logger } from './logger'; // Update import path as needed\n";
    }

    if (options.includeErrorReporting) {
      // Could add reporting service imports here
      imports += "// Import error reporting service as needed\n";
    }

    return imports;
  }

  /**
   * Generates error logging code
   */
  private generateErrorLoggingCode(
    options: ReactErrorBoundaryOptions,
    boundaryType: 'class' | 'functional',
  ): string {
    let code = '';

    if (options.includeStackTrace) {
      code += `    console.error('Error caught by ${options.boundaryName}:', error);\n`;
      code += `    console.error('Error Info:', errorInfo);\n`;
    } else {
      code += `    console.error('Error caught by ${options.boundaryName}:', error.message || error);\n`;
    }

    if (options.includeErrorLogging) {
      code += `    logger.error('Error boundary caught an error', {\n`;
      code += `      error: error.message,\n`;
      if (options.includeStackTrace) {
        code += `      stack: error.stack,\n`;
        code += `      componentStack: errorInfo.componentStack,\n`;
      }
      code += `      boundary: '${options.boundaryName}',\n`;
      code += `    });\n`;
    }

    return code;
  }

  /**
   * Generates fallback UI code
   */
  private generateFallbackUICode(
    options: ReactErrorBoundaryOptions,
    boundaryType: 'class' | 'functional',
    nested = false,
  ): string {
    const customFallback = options.fallbackComponent;

    if (customFallback) {
      return nested ? `fallback || <${customFallback} />` : `this.props.fallback || <${customFallback} />`;
    }

    // Generate default fallback UI
    let fallback = nested ? 'fallback || (' : 'this.props.fallback || (';
    fallback += '<div style={{\n';
    fallback += '  padding: "20px",\n';
    fallback += '  margin: "20px",\n';
    fallback += '  border: "1px solid #ff6b6b",\n';
    fallback += '  borderRadius: "4px",\n';
    fallback += '  backgroundColor: "#fff5f5",\n';
    fallback += '  color: "#c53030",\n';
    fallback += '}}>\n';
    fallback += '<h2>Something went wrong</h2>\n';

    if (options.includeStackTrace) {
      fallback += '{this.state.error && <p>{this.state.error.toString()}</p>}\n';
      fallback += '{this.state.errorInfo && (\n';
      fallback += '<details style={{ marginTop: "10px" }}>\n';
      fallback += '<summary>Component Stack</summary>\n';
      fallback += '<pre style={{ marginTop: "10px", fontSize: "12px" }}>\n';
      fallback += '{this.state.errorInfo.componentStack}\n';
      fallback += '</pre>\n';
      fallback += '</details>\n';
      fallback += ')}\n';
    } else {
      fallback += '<p>An error occurred while rendering this component.</p>\n';
    }

    fallback += '<button\n';
    fallback += 'onClick={() => window.location.reload()}\n';
    fallback += 'style={{\n';
    fallback += 'padding: "8px 16px",\n';
    fallback += 'marginTop: "10px",\n';
    fallback += 'cursor: "pointer",\n';
    fallback += 'backgroundColor: "#c53030",\n';
    fallback += 'color: "white",\n';
    fallback += 'border: "none",\n';
    fallback += 'borderRadius: "4px",\n';
    fallback += '}}\n';
    fallback += '>\n';
    fallback += 'Reload Page\n';
    fallback += '</button>\n';
    fallback += '</div>';

    if (nested) {
      fallback += ')';
    } else {
      fallback += ')';
    }

    return fallback;
  }

  /**
   * Calculates file path for the error boundary component
   */
  private calculateFilePath(sourceFilePath: string, options: ReactErrorBoundaryOptions): string {
    const sourceDir = path.dirname(sourceFilePath);

    // Determine file extension
    const ext = options.includeTypeScript ? '.tsx' : '.jsx';

    // Create filename from boundary name
    const fileName = `${options.boundaryName}${ext}`;

    return path.join(sourceDir, fileName);
  }

  /**
   * Creates the error boundary file at the specified path
   */
  public async createErrorBoundaryFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Error boundary file created', { filePath });
  }

  /**
   * Checks if an error boundary file already exists
   */
  public async errorBoundaryFileExists(filePath: string): Promise<boolean> {
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
  public async getGeneratorOptions(): Promise<ReactErrorBoundaryOptions | undefined> {
    // Step 1: Ask for boundary type
    const boundaryType = await vscode.window.showQuickPick(
      [
        { label: 'Class-based', description: 'Traditional class component error boundary', value: 'class' },
        {
          label: 'Functional (wraps class internally)',
          description: 'Functional component that uses class-based boundary',
          value: 'functional',
        },
      ],
      {
        placeHolder: 'Select error boundary type',
      },
    );

    if (!boundaryType) {
      return undefined;
    }

    // Step 2: Ask for boundary name
    const boundaryName = await vscode.window.showInputBox({
      prompt: 'Enter error boundary component name',
      placeHolder: 'ErrorBoundary',
      value: 'ErrorBoundary',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Error boundary name cannot be empty';
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
    const includeTypeScript = await this.askYesNoQuestion(
      'Use TypeScript?',
      true,
    );

    // Step 4: Ask about features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Error Logging', description: 'Include console and logger error logging', picked: true },
        { label: 'Fallback UI', description: 'Include styled fallback error UI', picked: true },
        { label: 'Stack Trace', description: 'Include error stack trace in fallback', picked: false },
        { label: 'Error Reporting Callback', description: 'Add onError callback prop', picked: false },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    // Step 5: Optionally ask for custom fallback component
    let fallbackComponent: string | undefined;
    const customFallback = await vscode.window.showQuickPick(
      [
        { label: 'Use default fallback UI', description: 'Built-in styled error display', value: 'default' },
        { label: 'Use custom fallback component', description: 'Specify a custom component', value: 'custom' },
      ],
      {
        placeHolder: 'Select fallback UI option',
      },
    );

    if (customFallback?.value === 'custom') {
      fallbackComponent = await vscode.window.showInputBox({
        prompt: 'Enter custom fallback component name',
        placeHolder: 'ErrorFallback',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Component name cannot be empty';
          }
          return null;
        },
      });
    }

    // Step 6: Optionally ask for error callback name
    let onErrorCallback: string | undefined;
    if (features.some((f) => f.label === 'Error Reporting Callback')) {
      onErrorCallback = await vscode.window.showInputBox({
        prompt: 'Enter error callback prop name',
        placeHolder: 'onError',
        value: 'onError',
      });
    }

    return {
      boundaryType: boundaryType.value as 'class' | 'functional',
      includeTypeScript,
      includeErrorLogging: features.some((f) => f.label === 'Error Logging'),
      includeFallbackUI: features.some((f) => f.label === 'Fallback UI'),
      includeStackTrace: features.some((f) => f.label === 'Stack Trace'),
      includeErrorReporting: features.some((f) => f.label === 'Error Reporting Callback'),
      boundaryName: boundaryName.trim(),
      fallbackComponent,
      onErrorCallback,
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
