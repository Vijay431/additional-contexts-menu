import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ComponentProp {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
  description: string;
}

export interface ComponentHook {
  name: string;
  hookType:
    | 'useState'
    | 'useEffect'
    | 'useCallback'
    | 'useMemo'
    | 'useRef'
    | 'useContext'
    | 'useReducer'
    | 'custom';
  dependencies: string[];
  hasStateUpdate: boolean;
}

export interface UserInteraction {
  type: 'click' | 'change' | 'submit' | 'focus' | 'blur' | 'keydown' | 'hover';
  target: string;
  description: string;
}

export interface ComponentInfo {
  name: string;
  props: ComponentProp[];
  hooks: ComponentHook[];
  interactions: UserInteraction[];
  hasChildren: boolean;
  isAsync: boolean;
  hasFormElements: boolean;
  fileName: string;
}

export interface GeneratedTestSuite {
  componentName: string;
  testCode: string;
  testFilePath: string;
  importPath: string;
  testCount: number;
}

export interface ReactTestingLibraryGeneratorOptions {
  testDirectory: string;
  includeUserInteractionTests: boolean;
  includeAccessibilityTests: boolean;
  includeEdgeCaseTests: boolean;
  includeAsyncTests: boolean;
  includeSnapshotTests: boolean;
  customRenderPath?: string;
}

/**
 * Service for generating React Testing Library tests for React components
 */
export class ReactTestingLibraryGeneratorService {
  private static instance: ReactTestingLibraryGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactTestingLibraryGeneratorService {
    ReactTestingLibraryGeneratorService.instance ??= new ReactTestingLibraryGeneratorService();
    return ReactTestingLibraryGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React Testing Library tests from selected component code
   */
  public async generateTestsFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ReactTestingLibraryGeneratorOptions,
  ): Promise<GeneratedTestSuite> {
    const selectedText = document.getText(selection);

    // Parse the component
    const componentInfo = this.parseComponent(selectedText, document.fileName);

    if (!componentInfo) {
      throw new Error('Could not parse React component from selection');
    }

    // Generate the test suite code
    const testCode = this.generateTestSuiteCode(componentInfo, document.fileName, options);

    // Determine test file path
    const testFilePath = this.calculateTestFilePath(document.fileName, componentInfo, options);

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, componentInfo);

    this.logger.info('React Testing Library test suite generated', {
      componentName: componentInfo.name,
      testCount: this.countTests(testCode),
    });

    return {
      componentName: componentInfo.name,
      testCode,
      testFilePath,
      importPath,
      testCount: this.countTests(testCode),
    };
  }

  /**
   * Parses React component from code text
   */
  private parseComponent(code: string, fileName: string): ComponentInfo | null {
    const trimmedCode = code.trim();

    // Match function component declaration
    const functionComponentMatch = trimmedCode.match(
      /(?:export\s+)?(?:function|const)\s+(\w+)\s*(?::\s*\w+\[\s*\{\s*([^}]*)\s*\}\s*\])?\s*(?:=\s*)?(?:\(([^)]*)\)|\(\s*\{([^}]*)\}\s*\))?\s*(?::\s*JSX\.Element)?/,
    );

    // Match arrow function component
    const arrowComponentMatch = trimmedCode.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*\w+\[\s*\{\s*([^}]*)\s*\}\s*\])?\s*=\s*(?:\(([^)]*)\)|\(\s*\{([^}]*)\}\s*\))\s*=>/,
    );

    let match: RegExpExecArray | null;
    let propsStr = '';

    if (functionComponentMatch) {
      match = functionComponentMatch;
      propsStr =
        functionComponentMatch[2] || functionComponentMatch[3] || functionComponentMatch[4] || '';
    } else if (arrowComponentMatch) {
      match = arrowComponentMatch;
      propsStr = arrowComponentMatch[2] || arrowComponentMatch[3] || arrowComponentMatch[4] || '';
    } else {
      return null;
    }

    if (!match) {
      return null;
    }

    const name = match[1];

    // Parse props
    const props = this.parseProps(propsStr);

    // Extract hooks
    const hooks = this.extractHooks(trimmedCode);

    // Detect user interactions
    const interactions = this.detectInteractions(trimmedCode);

    // Check for various component characteristics
    const hasChildren = trimmedCode.includes('children') || trimmedCode.includes('props.children');
    const isAsync = hooks.some((h) => h.hookType === 'useEffect' && h.hasStateUpdate);
    const hasFormElements = this.hasFormElements(trimmedCode);

    return {
      name,
      props,
      hooks,
      interactions,
      hasChildren,
      isAsync,
      hasFormElements,
      fileName,
    };
  }

  /**
   * Parses props interface or parameter list
   */
  private parseProps(propsStr: string): ComponentProp[] {
    const props: ComponentProp[] = [];

    if (!propsStr.trim()) {
      return props;
    }

    // Try to parse as interface-like syntax
    const interfaceProps = this.extractInterfaceProps(propsStr);
    if (interfaceProps.length > 0) {
      return interfaceProps;
    }

    // Parse as destructured parameters
    const paramList = this.smartSplit(propsStr, ',');

    for (const param of paramList) {
      const trimmed = param.trim();

      // Match: name?: type, or name: type
      const optionalMatch = trimmed.match(/^(\w+)\s*\?\s*:\s*(.+)$/);
      const typedMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      const simpleMatch = trimmed.match(/^(\w+)$/);

      if (optionalMatch) {
        props.push({
          name: optionalMatch[1],
          type: optionalMatch[2].trim(),
          isRequired: false,
          description: `Prop ${optionalMatch[1]}`,
        });
      } else if (typedMatch) {
        props.push({
          name: typedMatch[1],
          type: typedMatch[2].trim(),
          isRequired: true,
          description: `Prop ${typedMatch[1]}`,
        });
      } else if (simpleMatch) {
        props.push({
          name: simpleMatch[1],
          type: 'any',
          isRequired: true,
          description: `Prop ${simpleMatch[1]}`,
        });
      }
    }

    return props;
  }

  /**
   * Extracts props from an interface definition
   */
  private extractInterfaceProps(propsStr: string): ComponentProp[] {
    const props: ComponentProp[] = [];

    // Match interface property patterns
    const propPattern = /(\w+)(\?)?\s*:\s*([^;\n]+)/g;
    let match: RegExpExecArray | null;

    while ((match = propPattern.exec(propsStr)) !== null) {
      const [, name, optional, type] = match;
      props.push({
        name,
        type: type.trim(),
        isRequired: !optional,
        description: `Prop ${name}`,
      });
    }

    return props;
  }

  /**
   * Extracts hooks used in the component
   */
  private extractHooks(code: string): ComponentHook[] {
    const hooks: ComponentHook[] = [];

    // Match standard React hooks
    const hookPatterns = [
      { pattern: /useState\s*<([^>]+)>/g, type: 'useState' as const },
      { pattern: /useState\s*\(/g, type: 'useState' as const },
      { pattern: /useEffect\s*\(([^,]+),/g, type: 'useEffect' as const },
      { pattern: /useCallback\s*\(/g, type: 'useCallback' as const },
      { pattern: /useMemo\s*\(/g, type: 'useMemo' as const },
      { pattern: /useRef\s*<([^>]+)>/g, type: 'useRef' as const },
      { pattern: /useRef\s*\(/g, type: 'useRef' as const },
      { pattern: /useContext\s*\(/g, type: 'useContext' as const },
      { pattern: /useReducer\s*\(/g, type: 'useReducer' as const },
    ];

    for (const { pattern, type } of hookPatterns) {
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(code)) !== null) {
        const dependencies = this.extractHookDependencies(code, match.index);
        const hasStateUpdate = this.hasStateUpdate(code, match.index);

        hooks.push({
          name: type,
          hookType: type,
          dependencies,
          hasStateUpdate,
        });
      }
    }

    // Extract custom hooks (starts with 'use')
    const customHookPattern = /use[A-Z]\w+\s*\(/g;
    let customMatch: RegExpExecArray | null;
    customHookPattern.lastIndex = 0;

    while ((customMatch = customHookPattern.exec(code)) !== null) {
      const hookName = customMatch[0].replace('(', '').trim();
      const dependencies = this.extractHookDependencies(code, customMatch.index);
      const hasStateUpdate = this.hasStateUpdate(code, customMatch.index);

      hooks.push({
        name: hookName,
        hookType: 'custom',
        dependencies,
        hasStateUpdate,
      });
    }

    return hooks;
  }

  /**
   * Extracts hook dependencies
   */
  private extractHookDependencies(code: string, matchIndex: number): string[] {
    // Look for dependency array after the match
    const afterMatch = code.substring(matchIndex, matchIndex + 200);
    const depArrayMatch = afterMatch.match(/\[([^\]]*)\]/);

    if (depArrayMatch && depArrayMatch[1]) {
      return depArrayMatch[1]
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
    }

    return [];
  }

  /**
   * Checks if code has state update after this point
   */
  private hasStateUpdate(code: string, matchIndex: number): boolean {
    const afterMatch = code.substring(matchIndex, matchIndex + 300);
    return /setState|set[A-Z]\w+|dispatch\(/.test(afterMatch);
  }

  /**
   * Detects user interactions in component
   */
  private detectInteractions(code: string): UserInteraction[] {
    const interactions: UserInteraction[] = [];

    // Detect onClick handlers
    const onClickMatches = code.matchAll(/onClick\s*=\s*{([^}]+)}/g);
    for (const match of onClickMatches) {
      interactions.push({
        type: 'click',
        target: match[1] || 'element',
        description: `Click interaction for ${match[1] || 'element'}`,
      });
    }

    // Detect onChange handlers
    const onChangeMatches = code.matchAll(/onChange\s*=\s*{([^}]+)}/g);
    for (const match of onChangeMatches) {
      interactions.push({
        type: 'change',
        target: match[1] || 'input',
        description: `Change interaction for ${match[1] || 'input'}`,
      });
    }

    // Detect onSubmit handlers
    const onSubmitMatches = code.matchAll(/onSubmit\s*=\s*{([^}]+)}/g);
    for (const match of onSubmitMatches) {
      interactions.push({
        type: 'submit',
        target: match[1] || 'form',
        description: `Submit interaction for ${match[1] || 'form'}`,
      });
    }

    // Detect form elements
    if (code.includes('<input') || code.includes('<select') || code.includes('<textarea')) {
      interactions.push({
        type: 'change',
        target: 'form input',
        description: 'Form input change',
      });
    }

    return interactions;
  }

  /**
   * Checks if component has form elements
   */
  private hasFormElements(code: string): boolean {
    return /<(input|select|textarea|form)\b/.test(code);
  }

  /**
   * Smart split that respects nested brackets
   */
  private smartSplit(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if ((char === '"' || char === "'" || char === '`') && (i === 0 || str[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(' || char === '{' || char === '[') {
          depth++;
        } else if (char === ')' || char === '}' || char === ']') {
          depth--;
        }
      }

      if (char === delimiter && depth === 0 && !inString) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result.filter((s) => s.length > 0);
  }

  /**
   * Generates the complete test suite code
   */
  private generateTestSuiteCode(
    componentInfo: ComponentInfo,
    sourceFilePath: string,
    options: ReactTestingLibraryGeneratorOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(componentInfo, sourceFilePath, options);

    // Add describe block
    code += `\ndescribe('${componentInfo.name}', () => {\n`;

    // Add basic render test
    code += this.generateRenderTest(componentInfo);

    // Add user interaction tests
    if (options.includeUserInteractionTests && componentInfo.interactions.length > 0) {
      code += this.generateInteractionTests(componentInfo);
    }

    // Add props tests
    code += this.generatePropsTests(componentInfo);

    // Add accessibility tests
    if (options.includeAccessibilityTests) {
      code += this.generateAccessibilityTests(componentInfo);
    }

    // Add edge case tests
    if (options.includeEdgeCaseTests) {
      code += this.generateEdgeCaseTests(componentInfo);
    }

    // Add async tests
    if (options.includeAsyncTests && componentInfo.isAsync) {
      code += this.generateAsyncTests(componentInfo);
    }

    // Add snapshot tests
    if (options.includeSnapshotTests) {
      code += this.generateSnapshotTests(componentInfo);
    }

    code += '});\n';

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    componentInfo: ComponentInfo,
    sourceFilePath: string,
    options: ReactTestingLibraryGeneratorOptions,
  ): string {
    let imports = `import { render, screen, waitFor, fireEvent, userEvent } from '@testing-library/react';\n`;
    imports += `import { ${componentInfo.name} } from '${this.calculateRelativeImportPath(sourceFilePath, options.testDirectory)}';\n`;

    if (options.customRenderPath) {
      imports += `import { render } from '${options.customRenderPath}';\n`;
    }

    imports += '\n';
    return imports;
  }

  /**
   * Calculates relative import path for the test file
   */
  private calculateRelativeImportPath(sourceFilePath: string, testDirectory: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');
    const testDirPath = path.join(path.dirname(sourceFilePath), testDirectory);
    const relativeDir = path.relative(testDirPath, sourceDir);
    const normalizedPath = relativeDir === '' ? '.' : relativeDir;
    return path.join(normalizedPath, baseName).split('\\').join('/');
  }

  /**
   * Generates basic render test
   */
  private generateRenderTest(componentInfo: ComponentInfo): string {
    let code = `  it('should render successfully', () => {\n`;
    const props = this.generateDefaultProps(componentInfo.props);
    code += `    render(<${componentInfo.name}${props.length > 0 ? ' ' + props : ''} />);\n`;
    code += `  });\n\n`;
    return code;
  }

  /**
   * Generates user interaction tests
   */
  private generateInteractionTests(componentInfo: ComponentInfo): string {
    let code = '';

    for (const interaction of componentInfo.interactions) {
      code += `  it('should handle ${interaction.description}', async () => {\n`;
      const props = this.generateDefaultProps(componentInfo.props);
      code += `    render(<${componentInfo.name}${props.length > 0 ? ' ' + props : ''} />);\n`;

      switch (interaction.type) {
        case 'click':
          code += `    await userEvent.click(screen.getByRole('button'));\n`;
          break;
        case 'change':
          code += `    const input = screen.getByRole('textbox');\n`;
          code += `    await userEvent.type(input, 'test value');\n`;
          break;
        case 'submit':
          code += `    const form = screen.getByRole('form');\n`;
          code += `    fireEvent.submit(form);\n`;
          break;
        default:
          code += `    // Handle ${interaction.type} interaction\n`;
      }

      code += `  });\n\n`;
    }

    return code;
  }

  /**
   * Generates props tests
   */
  private generatePropsTests(componentInfo: ComponentInfo): string {
    let code = '';

    if (componentInfo.props.length === 0) {
      return code;
    }

    code += `  it('should render with props correctly', () => {\n`;
    const testProps = this.generateTestProps(componentInfo.props);
    code += `    const { container } = render(<${componentInfo.name}${testProps.length > 0 ? ' ' + testProps : ''} />);\n`;
    code += `    expect(container).toMatchSnapshot();\n`;
    code += `  });\n\n`;

    // Test with children if applicable
    if (componentInfo.hasChildren) {
      code += `  it('should render children correctly', () => {\n`;
      const props = this.generateDefaultProps(componentInfo.props);
      code += `    render(<${componentInfo.name}${props.length > 0 ? ' ' + props : ''}>\n`;
      code += `      <span>Test child</span>\n`;
      code += `    </${componentInfo.name}>);\n`;
      code += `    expect(screen.getByText('Test child')).toBeInTheDocument();\n`;
      code += `  });\n\n`;
    }

    return code;
  }

  /**
   * Generates accessibility tests
   */
  private generateAccessibilityTests(componentInfo: ComponentInfo): string {
    let code = '';

    code += `  it('should have proper accessibility attributes', () => {\n`;
    const props = this.generateDefaultProps(componentInfo.props);
    code += `    render(<${componentInfo.name}${props.length > 0 ? ' ' + props : ''} />);\n`;
    code += `    // Add accessibility assertions based on component structure\n`;
    code += `  });\n\n`;

    if (componentInfo.interactions.some((i) => i.type === 'click')) {
      code += `  it('should be keyboard accessible', () => {\n`;
      code += `    const { container } = render(<${componentInfo.name} />);\n`;
      code += `    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');\n`;
      code += `    interactiveElements.forEach(el => {\n`;
      code += `      expect(el).toHaveAttribute('tabindex');\n`;
      code += `    });\n`;
      code += `  });\n\n`;
    }

    return code;
  }

  /**
   * Generates edge case tests
   */
  private generateEdgeCaseTests(componentInfo: ComponentInfo): string {
    let code = '';

    // Test with empty props
    if (componentInfo.props.some((p) => !p.isRequired)) {
      code += `  it('should render with minimal props', () => {\n`;
      code += `    render(<${componentInfo.name} />);\n`;
      code += `  });\n\n`;
    }

    // Test with undefined children if applicable
    if (componentInfo.hasChildren) {
      code += `  it('should handle missing children gracefully', () => {\n`;
      const props = this.generateDefaultProps(componentInfo.props);
      code += `    render(<${componentInfo.name}${props.length > 0 ? ' ' + props : ''} />);\n`;
      code += `  });\n\n`;
    }

    // Test error boundaries
    code += `  it('should handle error states', () => {\n`;
    code += `    // Add error state testing logic\n`;
    code += `  });\n\n`;

    return code;
  }

  /**
   * Generates async tests
   */
  private generateAsyncTests(componentInfo: ComponentInfo): string {
    let code = '';

    code += `  it('should handle async operations', async () => {\n`;
    const props = this.generateDefaultProps(componentInfo.props);
    code += `    render(<${componentInfo.name}${props.length > 0 ? ' ' + props : ''} />);\n`;
    code += `    await waitFor(() => {\n`;
    code += `      expect(screen.getByText(/loaded|success|complete/i)).toBeInTheDocument();\n`;
    code += `    });\n`;
    code += `  });\n\n`;

    return code;
  }

  /**
   * Generates snapshot tests
   */
  private generateSnapshotTests(componentInfo: ComponentInfo): string {
    let code = '';

    code += `  it('should match snapshot', () => {\n`;
    const testProps = this.generateTestProps(componentInfo.props);
    code += `    const { container } = render(<${componentInfo.name}${testProps.length > 0 ? ' ' + testProps : ''} />);\n`;
    code += `    expect(container).toMatchSnapshot();\n`;
    code += `  });\n\n`;

    return code;
  }

  /**
   * Generates default props for component
   */
  private generateDefaultProps(props: ComponentProp[]): string {
    if (props.length === 0) {
      return '';
    }

    const propPairs: string[] = [];

    for (const prop of props) {
      const value = this.getMockValueForProp(prop);
      propPairs.push(`${prop.name}={${value}}`);
    }

    return propPairs.join(' ');
  }

  /**
   * Generates test props with realistic values
   */
  private generateTestProps(props: ComponentProp[]): string {
    if (props.length === 0) {
      return '';
    }

    const propPairs: string[] = [];

    for (const prop of props) {
      const value = this.getTestValueForProp(prop);
      propPairs.push(`${prop.name}={${value}}`);
    }

    return propPairs.join(' ');
  }

  /**
   * Gets a mock value for a prop
   */
  private getMockValueForProp(prop: ComponentProp): string {
    const lowerType = prop.type.toLowerCase();

    if (lowerType === 'string') {
      return "'test'";
    } else if (lowerType === 'number') {
      return '42';
    } else if (lowerType === 'boolean') {
      return 'true';
    } else if (lowerType === 'array' || lowerType.endsWith('[]')) {
      return '[]';
    } else if (lowerType === 'object' || lowerType.startsWith('{')) {
      return '{{}}';
    } else if (
      lowerType === 'function' ||
      lowerType.includes('=>') ||
      lowerType.includes('react.node')
    ) {
      return '{() => {}}';
    }

    return 'undefined';
  }

  /**
   * Gets a test value for a prop
   */
  private getTestValueForProp(prop: ComponentProp): string {
    const lowerType = prop.type.toLowerCase();

    if (lowerType === 'string') {
      return "'Test Value'";
    } else if (lowerType === 'number') {
      return '100';
    } else if (lowerType === 'boolean') {
      return 'false';
    } else if (lowerType === 'array' || lowerType.endsWith('[]')) {
      return '[1, 2, 3]';
    } else if (lowerType === 'object' || lowerType.startsWith('{')) {
      return '{ key: "value" }';
    } else if (lowerType === 'function' || lowerType.includes('=>')) {
      return '{() => {}}';
    }

    return 'undefined';
  }

  /**
   * Calculates test file path
   */
  private calculateTestFilePath(
    sourceFilePath: string,
    _componentInfo: ComponentInfo,
    options: ReactTestingLibraryGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath);
    const baseName = sourceFileName.replace(/\.(ts|tsx|js|jsx)$/, '');

    const testFileName = `${baseName}.test.tsx`;
    return path.join(sourceDir, options.testDirectory, testFileName);
  }

  /**
   * Calculates import path for the source file
   */
  private calculateImportPath(sourceFilePath: string, _componentInfo: ComponentInfo): string {
    return sourceFilePath;
  }

  /**
   * Counts the number of test cases in generated code
   */
  private countTests(testCode: string): number {
    const matches = testCode.match(/it\('/g);
    return matches ? matches.length : 0;
  }

  /**
   * Creates the test file at the specified path
   */
  public async createTestFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Test file created', { filePath });
  }

  /**
   * Checks if a test file already exists
   */
  public async testFileExists(filePath: string): Promise<boolean> {
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
  public async getGeneratorOptions(): Promise<ReactTestingLibraryGeneratorOptions | undefined> {
    const testDirectory = await vscode.window.showInputBox({
      prompt: 'Enter test directory name',
      placeHolder: '__tests__',
      value: '__tests__',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Test directory cannot be empty';
        }
        return null;
      },
    });

    if (!testDirectory) {
      return undefined;
    }

    const features = await vscode.window.showQuickPick(
      [
        {
          label: 'User Interaction Tests',
          description: 'Generate tests for user interactions',
          picked: true,
        },
        { label: 'Accessibility Tests', description: 'Generate accessibility tests', picked: true },
        { label: 'Edge Case Tests', description: 'Generate edge case tests', picked: true },
        { label: 'Async Tests', description: 'Generate async operation tests', picked: true },
        { label: 'Snapshot Tests', description: 'Generate snapshot tests', picked: false },
      ],
      {
        placeHolder: 'Select test types to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    const customRenderPath = await vscode.window.showInputBox({
      prompt: 'Enter custom render function path (optional)',
      placeHolder: 'test-utils',
    });

    return {
      testDirectory: testDirectory.trim(),
      includeUserInteractionTests: features.some((f) => f.label === 'User Interaction Tests'),
      includeAccessibilityTests: features.some((f) => f.label === 'Accessibility Tests'),
      includeEdgeCaseTests: features.some((f) => f.label === 'Edge Case Tests'),
      includeAsyncTests: features.some((f) => f.label === 'Async Tests'),
      includeSnapshotTests: features.some((f) => f.label === 'Snapshot Tests'),
      customRenderPath: customRenderPath?.trim(),
    };
  }
}
