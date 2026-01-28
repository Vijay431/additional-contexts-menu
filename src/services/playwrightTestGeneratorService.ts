import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface FunctionSignature {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  isMethod: boolean;
  className?: string;
  description: string;
  fullText: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  hasDefault: boolean;
  defaultValue?: string;
}

export interface PageObjectInfo {
  name: string;
  selectors: SelectorInfo[];
  actions: ActionInfo[];
}

export interface SelectorInfo {
  name: string;
  selector: string;
  type:
    | 'getBy'
    | 'getByRole'
    | 'getByText'
    | 'getByLabel'
    | 'getByPlaceholder'
    | 'getByTestId'
    | 'getByTitle'
    | 'pageLocator';
  description?: string;
}

export interface ActionInfo {
  name: string;
  action:
    | 'click'
    | 'fill'
    | 'select'
    | 'check'
    | 'uncheck'
    | 'hover'
    | 'type'
    | 'upload'
    | 'waitFor';
  selector?: string;
  value?: string;
  description?: string;
}

export interface TestSpec {
  description: string;
  testSteps: TestStep[];
  expectedBehavior: string;
  testType: 'smoke' | 'happy-path' | 'edge-case' | 'error-case' | 'accessibility' | 'visual';
}

export interface TestStep {
  action: string;
  selector?: string;
  value?: string;
  waiting?: string;
}

export interface GeneratedTestSuite {
  featureName: string;
  testCode: string;
  testFilePath: string;
  pageObjectCode?: string;
  pageObjectFilePath?: string;
  fixtureCode?: string;
  testCount: number;
}

export interface TestGenerationOptions {
  includeEdgeCases: boolean;
  includeErrorCases: boolean;
  testDirectory: string;
  generatePageObjects: boolean;
  pageObjectsDirectory: string;
  useDataAttributes: boolean;
  waitingStrategy: 'waitForLoadState' | 'waitForSelector' | 'waitForResponse' | 'mixed';
  includeAccessibilityTests: boolean;
  includeVisualRegression: boolean;
  customFixturePath?: string;
}

/**
 * Service for generating Playwright E2E test suites with TypeScript typing, page objects, and assertions
 */
export class PlaywrightTestGeneratorService {
  private static instance: PlaywrightTestGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PlaywrightTestGeneratorService {
    PlaywrightTestGeneratorService.instance ??= new PlaywrightTestGeneratorService();
    return PlaywrightTestGeneratorService.instance;
  }

  /**
   * Main entry point: Generates E2E test suite from selected code
   */
  public async generateTestsFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: TestGenerationOptions,
  ): Promise<GeneratedTestSuite> {
    const selectedText = document.getText(selection);

    // Analyze the code to extract feature information
    const featureInfo = this.analyzeFeature(selectedText, document.fileName);

    if (!featureInfo) {
      throw new Error('Could not analyze feature from selection');
    }

    // Generate test specifications
    const testSpecs = this.generateTestSpecs(featureInfo, options);

    // Generate page object if enabled
    let pageObjectCode: string | undefined;
    let pageObjectFilePath: string | undefined;
    if (options.generatePageObjects) {
      const pageObject = this.generatePageObject(featureInfo, options);
      pageObjectCode = pageObject.code;
      pageObjectFilePath = pageObject.filePath;
    }

    // Generate the test suite code
    const testCode = this.generateTestSuiteCode(featureInfo, testSpecs, document.fileName, options);

    // Determine test file path
    const testFilePath = this.calculateTestFilePath(document.fileName, featureInfo, options);

    // Determine fixture code if needed
    let fixtureCode: string | undefined;
    if (options.customFixturePath) {
      fixtureCode = this.generateFixtureReference(options.customFixturePath);
    }

    this.logger.info('Playwright test suite generated', {
      featureName: featureInfo.name,
      testCount: testSpecs.length,
    });

    return {
      featureName: featureInfo.name,
      testCode,
      testFilePath,
      pageObjectCode,
      pageObjectFilePath,
      fixtureCode,
      testCount: testSpecs.length,
    };
  }

  /**
   * Analyzes code to extract feature information
   */
  private analyzeFeature(
    code: string,
    fileName: string,
  ): { name: string; type: string; description: string; selectors: SelectorInfo[] } | null {
    const trimmedCode = code.trim();

    // Extract function/component name
    const functionMatch = trimmedCode.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    const arrowMatch = trimmedCode.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
    );
    const classMatch = trimmedCode.match(/class\s+(\w+)/);
    const componentMatch = trimmedCode.match(/(?:export\s+)?(?:default\s+)?function\s+(\w+)/);

    let name = 'Feature';
    let type = 'component';

    if (functionMatch) {
      name = functionMatch[1];
      type = 'function';
    } else if (arrowMatch) {
      name = arrowMatch[1];
      type = 'function';
    } else if (classMatch) {
      name = classMatch[1];
      type = 'class';
    } else if (componentMatch) {
      name = componentMatch[1];
      type = 'component';
    } else {
      // Fallback to filename
      name = path.basename(fileName).replace(/\.(ts|tsx|js|jsx)$/, '');
    }

    // Extract potential selectors from the code
    const selectors = this.extractSelectors(trimmedCode);

    return {
      name,
      type,
      description: `E2E tests for ${name}`,
      selectors,
    };
  }

  /**
   * Extracts selectors from code
   */
  private extractSelectors(code: string): SelectorInfo[] {
    const selectors: SelectorInfo[] = [];

    // Look for data-testid attributes
    const testIdMatches = code.matchAll(/data-testid=["']([^"']+)["']/g);
    for (const match of testIdMatches) {
      selectors.push({
        name: match[1],
        selector: match[1],
        type: 'getByTestId',
        description: `Element with test id ${match[1]}`,
      });
    }

    // Look for aria-label attributes
    const ariaLabelMatches = code.matchAll(/aria-label=["']([^"']+)["']/g);
    for (const match of ariaLabelMatches) {
      selectors.push({
        name: this.toCamelCase(match[1]),
        selector: match[1],
        type: 'getByLabel',
        description: `Element with label ${match[1]}`,
      });
    }

    // Look for placeholder attributes
    const placeholderMatches = code.matchAll(/placeholder=["']([^"']+)["']/g);
    for (const match of placeholderMatches) {
      selectors.push({
        name: this.toCamelCase(match[1]),
        selector: match[1],
        type: 'getByPlaceholder',
        description: `Input with placeholder ${match[1]}`,
      });
    }

    // Look for role attributes
    const roleMatches = code.matchAll(/role=["']([^"']+)["']/g);
    for (const match of roleMatches) {
      selectors.push({
        name: match[1],
        selector: match[1],
        type: 'getByRole',
        description: `Element with role ${match[1]}`,
      });
    }

    return selectors;
  }

  /**
   * Converts string to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join('');
  }

  /**
   * Generates test specifications
   */
  private generateTestSpecs(
    feature: { name: string; type: string; description: string; selectors: SelectorInfo[] },
    options: TestGenerationOptions,
  ): TestSpec[] {
    const specs: TestSpec[] = [];

    // Happy path test
    specs.push({
      description: `should render ${feature.name} component`,
      testSteps: [
        { action: 'navigate', selector: '/', waiting: 'load' },
        { action: 'waitForSelector', selector: this.getDefaultSelector(feature) },
      ],
      expectedBehavior: 'Component should be visible',
      testType: 'happy-path',
    });

    specs.push({
      description: `should interact with ${feature.name} correctly`,
      testSteps: [
        { action: 'navigate', selector: '/', waiting: 'load' },
        { action: 'waitForSelector', selector: this.getDefaultSelector(feature) },
        { action: 'click', selector: this.getDefaultSelector(feature) },
      ],
      expectedBehavior: 'Interaction should work as expected',
      testType: 'smoke',
    });

    // Edge cases
    if (options.includeEdgeCases) {
      specs.push({
        description: `should handle empty state in ${feature.name}`,
        testSteps: [{ action: 'navigate', selector: '/', waiting: 'load' }],
        expectedBehavior: 'Should display empty state message',
        testType: 'edge-case',
      });

      specs.push({
        description: `should handle loading state in ${feature.name}`,
        testSteps: [{ action: 'navigate', selector: '/', waiting: 'response' }],
        expectedBehavior: 'Should display loading indicator',
        testType: 'edge-case',
      });
    }

    // Error cases
    if (options.includeErrorCases) {
      specs.push({
        description: `should handle API errors in ${feature.name}`,
        testSteps: [
          { action: 'navigate', selector: '/', waiting: 'load' },
          { action: 'mockResponse', selector: '/api/**', value: '500' },
        ],
        expectedBehavior: 'Should display error message',
        testType: 'error-case',
      });

      specs.push({
        description: `should handle network errors in ${feature.name}`,
        testSteps: [
          { action: 'navigate', selector: '/', waiting: 'load' },
          { action: 'offline', value: 'true' },
        ],
        expectedBehavior: 'Should display offline message',
        testType: 'error-case',
      });
    }

    // Accessibility tests
    if (options.includeAccessibilityTests) {
      specs.push({
        description: `should meet accessibility standards for ${feature.name}`,
        testSteps: [
          { action: 'navigate', selector: '/', waiting: 'load' },
          { action: 'waitForSelector', selector: this.getDefaultSelector(feature) },
          { action: 'accessibilityCheck' },
        ],
        expectedBehavior: 'Should have no accessibility violations',
        testType: 'accessibility',
      });
    }

    // Visual regression tests
    if (options.includeVisualRegression) {
      specs.push({
        description: `should match visual snapshot for ${feature.name}`,
        testSteps: [
          { action: 'navigate', selector: '/', waiting: 'load' },
          { action: 'waitForSelector', selector: this.getDefaultSelector(feature) },
        ],
        expectedBehavior: 'Should match baseline screenshot',
        testType: 'visual',
      });
    }

    return specs;
  }

  /**
   * Gets default selector for a feature
   */
  private getDefaultSelector(feature: {
    name: string;
    type: string;
    selectors: SelectorInfo[];
  }): string {
    if (feature.selectors.length > 0) {
      const selector = feature.selectors[0];
      return `${selector.type}('${selector.selector}')`;
    }
    return `page.getByTestId('${this.kebabCase(feature.name)}')`;
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
   * Generates page object
   */
  private generatePageObject(
    feature: { name: string; type: string; selectors: SelectorInfo[] },
    options: TestGenerationOptions,
  ): { code: string; filePath: string } {
    const className = `${feature.name}Page`;
    let code = `import { type Page, Locator, expect } from '@playwright/test';\n\n`;

    code += `/**\n`;
    code += ` * Page Object for ${feature.name}\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;
    code += `  readonly page: Page;\n\n`;

    // Define locators
    code += `  // Locators\n`;
    if (feature.selectors.length > 0) {
      for (const selector of feature.selectors) {
        code += `  readonly ${selector.name}: Locator;\n`;
      }
    } else {
      code += `  readonly container: Locator;\n`;
      code += `  readonly title: Locator;\n`;
    }
    code += `\n`;

    // Constructor
    code += `  constructor(page: Page) {\n`;
    code += `    this.page = page;\n\n`;

    // Initialize locators
    code += `    // Initialize locators\n`;
    if (feature.selectors.length > 0) {
      for (const selector of feature.selectors) {
        code += `    this.${selector.name} = this.page.${selector.type}('${selector.selector}');\n`;
      }
    } else {
      code += `    this.container = this.page.getByTestId('${this.kebabCase(feature.name)}');\n`;
      code += `    this.title = this.container.getByRole('heading');\n`;
    }
    code += `  }\n\n`;

    // Actions
    code += `  // Actions\n`;
    code += `  async goto() {\n`;
    code += `    await this.page.goto('/');\n`;
    code += `  }\n\n`;

    code += `  async isVisible(): Promise<boolean> {\n`;
    const locator = feature.selectors.length > 0 ? feature.selectors[0].name : 'container';
    code += `    return await this.${locator}.isVisible();\n`;
    code += `  }\n\n`;

    // Add waiting strategy based on configuration
    code += `  async waitForVisible() {\n`;
    if (options.waitingStrategy === 'waitForLoadState') {
      code += `    await this.page.waitForLoadState('networkidle');\n`;
    } else if (options.waitingStrategy === 'waitForSelector') {
      code += `    await this.${locator}.waitFor({ state: 'visible' });\n`;
    } else if (options.waitingStrategy === 'waitForResponse') {
      code += `    await this.page.waitForResponse(/api/);\n`;
    } else {
      code += `    await this.${locator}.waitFor({ state: 'visible' });\n`;
    }
    code += `  }\n\n`;

    code += `  async click() {\n`;
    code += `    await this.${locator}.click();\n`;
    code += `  }\n\n`;

    code += `  async getText(): Promise<string> {\n`;
    code += `    return await this.${locator}.textContent() || '';\n`;
    code += `  }\n`;

    code += `}\n`;

    // Calculate file path
    const filePath = path.join(options.pageObjectsDirectory, `${feature.name}.page.ts`);

    return { code, filePath };
  }

  /**
   * Generates the complete test suite code
   */
  private generateTestSuiteCode(
    feature: { name: string; type: string; description: string; selectors: SelectorInfo[] },
    testSpecs: TestSpec[],
    _sourceFilePath: string,
    options: TestGenerationOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(feature, options);

    // Add test block
    const featureTitle = this.generateTestTitle(feature);
    code += `\ntest.describe('${featureTitle}', () => {\n`;

    // Add setup if using custom fixture
    if (options.customFixturePath) {
      code += this.generateTestFixtureSetup(options);
    }

    // Initialize page object if enabled
    if (options.generatePageObjects) {
      code += `  let ${this.camelCase(feature.name)}Page: ${feature.name}Page;\n\n`;
      code += `  test.beforeEach(async ({ page }) => {\n`;
      code += `    ${this.camelCase(feature.name)}Page = new ${feature.name}Page(page);\n`;
      code += `  });\n\n`;
    }

    // Add test cases
    for (const spec of testSpecs) {
      code += this.generateTestSpec(feature, spec, options);
    }

    code += '});\n';

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    feature: { name: string; type: string; selectors: SelectorInfo[] },
    options: TestGenerationOptions,
  ): string {
    let imports = `import { test, expect } from '@playwright/test';\n`;

    // Import page object if enabled
    if (options.generatePageObjects) {
      const relativePath = this.calculatePageObjectImportPath(options.pageObjectsDirectory);
      imports += `import { ${feature.name}Page } from '${relativePath}/${feature.name}.page';\n`;
    }

    // Add accessibility imports if needed
    if (options.includeAccessibilityTests) {
      imports += `import { injectAxe, checkA11y } from 'axe-playwright';\n`;
    }

    return imports;
  }

  /**
   * Generates test title
   */
  private generateTestTitle(feature: { name: string; type: string }): string {
    return feature.name;
  }

  /**
   * Generates test fixture setup
   */
  private generateTestFixtureSetup(options: TestGenerationOptions): string {
    if (options.customFixturePath) {
      return `  test.use({\n    // Custom fixture options from ${options.customFixturePath}\n  });\n\n`;
    }
    return '';
  }

  /**
   * Generates a single test spec
   */
  private generateTestSpec(
    feature: { name: string; selectors: SelectorInfo[] },
    spec: TestSpec,
    options: TestGenerationOptions,
  ): string {
    let code = '';

    const testName = spec.description;
    code += `  test('${testName}', async ({ page }) => {\n`;

    // Generate test steps
    for (const step of spec.testSteps) {
      code += this.generateTestStep(feature, step, options);
    }

    // Add assertions based on expected behavior
    code += this.generateAssertion(feature, spec, options);

    code += '  });\n\n';

    return code;
  }

  /**
   * Generates a test step
   */
  private generateTestStep(
    feature: { name: string; selectors: SelectorInfo[] },
    step: TestStep,
    options: TestGenerationOptions,
  ): string {
    const pageObjectName = `${this.camelCase(feature.name)}Page`;
    const defaultSelector = this.getDefaultSelector(feature);

    switch (step.action) {
      case 'navigate':
        if (options.generatePageObjects) {
          return `    await ${pageObjectName}.goto();\n`;
        }
        return `    await page.goto('${step.selector || '/'}');\n`;

      case 'waitForSelector':
        if (options.generatePageObjects) {
          return `    await ${pageObjectName}.waitForVisible();\n`;
        }
        return `    await page.waitForSelector(${step.selector || defaultSelector});\n`;

      case 'click':
        if (options.generatePageObjects) {
          return `    await ${pageObjectName}.click();\n`;
        }
        return `    await page.${step.selector || defaultSelector}.click();\n`;

      case 'fill':
        if (options.generatePageObjects) {
          return `    await ${pageObjectName}.page.fill('${step.selector || defaultSelector}', '${step.value || ''}');\n`;
        }
        return `    await page.fill('${step.selector || defaultSelector}', '${step.value || ''}');\n`;

      case 'accessibilityCheck':
        return `    await injectAxe(page);\n    await checkA11y(page);\n`;

      case 'mockResponse':
        return `    await page.route('**${step.selector}/**', route => route.fulfill({ status: ${step.value || 500} }));\n`;

      case 'offline':
        return `    await page.context().setOffline(true);\n`;

      default:
        return `    // ${step.action}\n`;
    }
  }

  /**
   * Generates assertion for a test spec
   */
  private generateAssertion(
    feature: { name: string; selectors: SelectorInfo[] },
    spec: TestSpec,
    options: TestGenerationOptions,
  ): string {
    const pageObjectName = `${this.camelCase(feature.name)}Page`;
    const defaultSelector = this.getDefaultSelector(feature);

    switch (spec.testType) {
      case 'happy-path':
      case 'smoke':
        if (options.generatePageObjects) {
          return `    await expect(${pageObjectName}).toBeVisible();\n`;
        }
        return `    await expect(page.${defaultSelector}).toBeVisible();\n`;

      case 'accessibility':
        return `    // Accessibility checks already performed\n`;

      case 'visual':
        return `    await expect(page).toHaveScreenshot('${this.kebabCase(feature.name)}-snapshot.png');\n`;

      case 'edge-case':
        return `    await expect(page.${defaultSelector}).toBeVisible();\n`;

      case 'error-case':
        return `    await expect(page.locator('text=Error')).toBeVisible();\n`;

      default:
        return `    await expect(page.${defaultSelector}).toBeVisible();\n`;
    }
  }

  /**
   * Calculates test file path
   */
  private calculateTestFilePath(
    sourceFilePath: string,
    feature: { name: string },
    options: TestGenerationOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const baseName = feature.name;
    const testFileName = `${baseName}.spec.ts`;

    return path.join(sourceDir, options.testDirectory, testFileName);
  }

  /**
   * Calculates page object import path
   */
  private calculatePageObjectImportPath(pageObjectsDirectory: string): string {
    // Calculate relative path from test directory to page objects directory
    return `../${path.basename(pageObjectsDirectory)}`;
  }

  /**
   * Generates fixture reference
   */
  private generateFixtureReference(customFixturePath: string): string {
    return `// Custom fixture from ${customFixturePath}\n`;
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Creates the test file at the specified path
   */
  public async createTestFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write test file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Playwright test file created', { filePath });
  }

  /**
   * Creates the page object file at the specified path
   */
  public async createPageObjectFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write page object file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Playwright page object file created', { filePath });
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
   * Checks if a page object file already exists
   */
  public async pageObjectFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets test generation options from user
   */
  public async getTestGenerationOptions(): Promise<TestGenerationOptions | undefined> {
    // Ask for test directory
    const testDirectory = await vscode.window.showInputBox({
      prompt: 'Enter test directory name',
      placeHolder: 'e2e',
      value: 'e2e',
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

    // Ask if page objects should be generated
    const generatePageObjects = await vscode.window.showQuickPick(
      [
        {
          label: 'Yes',
          description: 'Generate page objects for better maintainability',
          value: true,
        },
        { label: 'No', description: 'Generate tests without page objects', value: false },
      ],
      {
        placeHolder: 'Generate page objects?',
      },
    );

    if (!generatePageObjects) {
      return undefined;
    }

    // Ask for page objects directory
    let pageObjectsDirectory = 'pages';
    if (generatePageObjects.value) {
      const pageObjDir = await vscode.window.showInputBox({
        prompt: 'Enter page objects directory name',
        placeHolder: 'pages',
        value: 'pages',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Page objects directory cannot be empty';
          }
          return null;
        },
      });

      if (!pageObjDir) {
        return undefined;
      }
      pageObjectsDirectory = pageObjDir.trim();
    }

    // Ask for waiting strategy
    const waitingStrategy = await vscode.window.showQuickPick(
      [
        {
          label: 'Wait for load state',
          description: 'Wait for network idle',
          value: 'waitForLoadState',
        },
        {
          label: 'Wait for selector',
          description: 'Wait for specific selector',
          value: 'waitForSelector',
        },
        {
          label: 'Wait for response',
          description: 'Wait for API response',
          value: 'waitForResponse',
        },
        { label: 'Mixed', description: 'Use combination of strategies', value: 'mixed' },
      ],
      {
        placeHolder: 'Select waiting strategy',
      },
    );

    if (!waitingStrategy) {
      return undefined;
    }

    // Ask about accessibility tests
    const includeAccessibility = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include accessibility tests', value: true },
        { label: 'No', description: 'Skip accessibility tests', value: false },
      ],
      {
        placeHolder: 'Include accessibility tests?',
      },
    );

    if (!includeAccessibility) {
      return undefined;
    }

    // Ask about visual regression tests
    const includeVisual = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include visual regression tests', value: true },
        { label: 'No', description: 'Skip visual regression tests', value: false },
      ],
      {
        placeHolder: 'Include visual regression tests?',
      },
    );

    if (!includeVisual) {
      return undefined;
    }

    return {
      includeEdgeCases: true,
      includeErrorCases: true,
      testDirectory: testDirectory.trim(),
      generatePageObjects: generatePageObjects.value,
      pageObjectsDirectory,
      useDataAttributes: false,
      waitingStrategy: waitingStrategy.value,
      includeAccessibilityTests: includeAccessibility.value,
      includeVisualRegression: includeVisual.value,
    };
  }
}
