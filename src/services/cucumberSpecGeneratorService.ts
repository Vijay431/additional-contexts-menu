import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface CucumberFeature {
  name: string;
  description?: string;
  scenarios: CucumberScenario[];
  tags?: string[];
}

export interface CucumberScenario {
  name: string;
  description?: string;
  tags?: string[];
  steps: CucumberStep[];
}

export interface CucumberStep {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  docString?: string;
  dataTable?: string[][];
}

export interface FunctionInfo {
  name: string;
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
  isAsync: boolean;
  description?: string;
}

export interface CucumberGenerationOptions {
  featureDirectory: string;
  stepDefinitionsDirectory: string;
  includeExamples: boolean;
  includeBackground: boolean;
  generateTypeScript: boolean;
}

export interface GeneratedCucumberSpec {
  featureFile: string;
  featureCode: string;
  stepDefinitionFile: string;
  stepDefinitionCode: string;
  scenarioCount: number;
  stepCount: number;
}

/**
 * Service for generating Cucumber feature files with Gherkin syntax
 * and TypeScript step definitions
 */
export class CucumberSpecGeneratorService {
  private static instance: CucumberSpecGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CucumberSpecGeneratorService {
    CucumberSpecGeneratorService.instance ??= new CucumberSpecGeneratorService();
    return CucumberSpecGeneratorService.instance;
  }

  /**
   * Main entry point: Generates Cucumber spec from selected code
   */
  public async generateFromSelection(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: CucumberGenerationOptions,
  ): Promise<GeneratedCucumberSpec> {
    const selectedText = document.getText(selection);

    // Parse the function information
    const functionInfo = this.parseFunctionInfo(selectedText, document.fileName);

    if (!functionInfo) {
      throw new Error('Could not parse function from selection');
    }

    // Generate Cucumber feature
    const feature = this.generateFeature(functionInfo, options);

    // Generate feature file code
    const featureCode = this.generateFeatureFileCode(feature);

    // Generate step definitions
    const stepDefinitionCode = this.generateStepDefinitionsCode(
      functionInfo,
      feature,
      options,
    );

    // Determine file paths
    const featureFilePath = this.calculateFeatureFilePath(
      document.fileName,
      functionInfo,
      options.featureDirectory,
    );
    const stepDefinitionFilePath = this.calculateStepDefinitionFilePath(
      document.fileName,
      functionInfo,
      options.stepDefinitionsDirectory,
      options.generateTypeScript,
    );

    this.logger.info('Cucumber spec generated', {
      functionName: functionInfo.name,
      scenarioCount: feature.scenarios.length,
    });

    return {
      featureFile: featureFilePath,
      featureCode,
      stepDefinitionFile: stepDefinitionFilePath,
      stepDefinitionCode: stepDefinitionCode,
      scenarioCount: feature.scenarios.length,
      stepCount: feature.scenarios.reduce((sum, s) => sum + s.steps.length, 0),
    };
  }

  /**
   * Parses function information from code text
   */
  private parseFunctionInfo(code: string, fileName: string): FunctionInfo | null {
    const trimmedCode = code.trim();

    // Match function declaration
    const functionDeclMatch = trimmedCode.match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?/,
    );

    // Match arrow function
    const arrowFunctionMatch = trimmedCode.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?\s*=>/,
    );

    // Match method declaration
    const methodDeclMatch = trimmedCode.match(
      /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*({[^}]+}|[\w<>[\]|,\s]+))?\s*{/,
    );

    let match: RegExpExecArray | null;

    if (functionDeclMatch) {
      match = functionDeclMatch;
    } else if (arrowFunctionMatch) {
      match = arrowFunctionMatch;
    } else if (methodDeclMatch) {
      match = methodDeclMatch;
    } else {
      return null;
    }

    if (!match) {
      return null;
    }

    const name = match[1];
    const paramsStr = match[2];
    const returnType = match[3]?.trim() || 'void';
    const isAsync = /\basync\b/.test(trimmedCode);

    // Parse parameters
    const parameters = this.parseParameters(paramsStr);

    // Extract description from JSDoc if available
    const description = this.extractJSDocDescription(trimmedCode);

    return {
      name,
      parameters,
      returnType,
      isAsync,
      description,
    };
  }

  /**
   * Parses parameters from parameter string
   */
  private parseParameters(paramsStr: string): Array<{ name: string; type: string }> {
    const parameters: Array<{ name: string; type: string }> = [];

    if (!paramsStr.trim()) {
      return parameters;
    }

    const paramList = this.smartSplit(paramsStr, ',');

    for (const param of paramList) {
      const trimmed = param.trim();

      // Match: name: type
      const typedMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      const simpleMatch = trimmed.match(/^(\w+)$/);

      if (typedMatch) {
        parameters.push({
          name: typedMatch[1],
          type: typedMatch[2].trim(),
        });
      } else if (simpleMatch) {
        parameters.push({
          name: simpleMatch[1],
          type: 'any',
        });
      }
    }

    return parameters;
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
   * Extracts JSDoc description from code
   */
  private extractJSDocDescription(code: string): string | undefined {
    const jsDocMatch = code.match(/\/\*\*\s*\n([^*]|\*[^/])*\*\//);
    if (jsDocMatch) {
      const jsDoc = jsDocMatch[0];
      const descriptionMatch = jsDoc.match(/\*\s*([^\n@]+)/);
      if (descriptionMatch) {
        return descriptionMatch[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Generates Cucumber feature from function info
   */
  private generateFeature(
    functionInfo: FunctionInfo,
    options: CucumberGenerationOptions,
  ): CucumberFeature {
    const featureName = this.toFeatureName(functionInfo.name);
    const scenarios: CucumberScenario[] = [];

    // Main success scenario
    scenarios.push(this.generateSuccessScenario(functionInfo));

    // Edge case scenarios
    scenarios.push(...this.generateEdgeCaseScenarios(functionInfo));

    // Error scenarios
    scenarios.push(...this.generateErrorScenarios(functionInfo));

    return {
      name: featureName,
      description: functionInfo.description || `Testing ${functionInfo.name}`,
      scenarios,
      tags: ['test', 'automation'],
    };
  }

  /**
   * Converts function name to feature name
   */
  private toFeatureName(functionName: string): string {
    return functionName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Generates success scenario
   */
  private generateSuccessScenario(functionInfo: FunctionInfo): CucumberScenario {
    const steps: CucumberStep[] = [];

    // Given steps - setup
    if (functionInfo.parameters.length > 0) {
      steps.push({
        keyword: 'Given',
        text: `I have valid ${this.formatParameterList(functionInfo.parameters)}`,
      });
    }

    // When step - action
    steps.push({
      keyword: 'When',
      text: `I call ${functionInfo.name}`,
    });

    // Then step - assertion
    steps.push({
      keyword: 'Then',
      text: `the result should be ${this.getResultExpectation(functionInfo.returnType)}`,
    });

    return {
      name: `Successfully execute ${functionInfo.name}`,
      steps,
      tags: ['happy-path'],
    };
  }

  /**
   * Generates edge case scenarios
   */
  private generateEdgeCaseScenarios(functionInfo: FunctionInfo): CucumberScenario[] {
    const scenarios: CucumberScenario[] = [];

    // Test with minimal parameters
    if (functionInfo.parameters.length > 0) {
      const steps: CucumberStep[] = [];

      steps.push({
        keyword: 'Given',
        text: `I have minimal valid parameters`,
      });

      steps.push({
        keyword: 'When',
        text: `I call ${functionInfo.name}`,
      });

      steps.push({
        keyword: 'Then',
        text: `the operation should succeed`,
      });

      scenarios.push({
        name: `Handle minimal parameters for ${functionInfo.name}`,
        steps,
        tags: ['edge-case'],
      });
    }

    // Test with empty/null values
    if (functionInfo.parameters.some((p) => p.type.toLowerCase() === 'string')) {
      const steps: CucumberStep[] = [];

      steps.push({
        keyword: 'Given',
        text: `I have empty string parameters`,
      });

      steps.push({
        keyword: 'When',
        text: `I call ${functionInfo.name}`,
      });

      steps.push({
        keyword: 'Then',
        text: `the result should handle empty values gracefully`,
      });

      scenarios.push({
        name: `Handle empty string values for ${functionInfo.name}`,
        steps,
        tags: ['edge-case'],
      });
    }

    return scenarios;
  }

  /**
   * Generates error scenarios
   */
  private generateErrorScenarios(functionInfo: FunctionInfo): CucumberScenario[] {
    const scenarios: CucumberScenario[] = [];

    // Test with invalid parameters
    if (functionInfo.parameters.length > 0) {
      const steps: CucumberStep[] = [];

      steps.push({
        keyword: 'Given',
        text: `I have invalid parameters`,
      });

      steps.push({
        keyword: 'When',
        text: `I call ${functionInfo.name}`,
      });

      steps.push({
        keyword: 'Then',
        text: `an error should be thrown`,
      });

      scenarios.push({
        name: `Handle invalid parameters for ${functionInfo.name}`,
        steps,
        tags: ['error-case'],
      });
    }

    // Test with null parameters
    const steps: CucumberStep[] = [];

    steps.push({
      keyword: 'Given',
      text: `I have null parameters`,
    });

    steps.push({
      keyword: 'When',
      text: `I call ${functionInfo.name}`,
    });

    steps.push({
      keyword: 'Then',
      text: `an error should be thrown`,
    });

    scenarios.push({
      name: `Handle null parameters for ${functionInfo.name}`,
      steps,
      tags: ['error-case'],
    });

    return scenarios;
  }

  /**
   * Formats parameter list for Gherkin
   */
  private formatParameterList(parameters: Array<{ name: string; type: string }>): string {
    if (parameters.length === 0) {
      return 'parameters';
    }

    if (parameters.length === 1) {
      return `${parameters[0].name}`;
    }

    const paramNames = parameters.map((p) => p.name);
    return paramNames.join(', ');
  }

  /**
   * Gets result expectation based on return type
   */
  private getResultExpectation(returnType: string): string {
    const lowerType = returnType.toLowerCase();

    if (lowerType === 'void' || lowerType === 'undefined') {
      return 'successful';
    } else if (lowerType === 'string') {
      return 'a string';
    } else if (lowerType === 'number') {
      return 'a number';
    } else if (lowerType === 'boolean') {
      return 'a boolean';
    } else if (lowerType.includes('array') || lowerType.endsWith('[]')) {
      return 'an array';
    } else if (lowerType === 'object') {
      return 'an object';
    } else if (lowerType.includes('promise')) {
      return 'a promise';
    }

    return 'valid';
  }

  /**
   * Generates feature file code
   */
  private generateFeatureFileCode(feature: CucumberFeature): string {
    let code = '';

    // Add feature tag
    if (feature.tags && feature.tags.length > 0) {
      code += `@${feature.tags.join(' @')}\n`;
    }

    // Add feature declaration
    code += `Feature: ${feature.name}\n`;

    // Add description
    if (feature.description) {
      code += `  ${feature.description}\n`;
    }

    code += '\n';

    // Add background if needed (optional)
    // This could be added based on options.includeBackground

    // Add scenarios
    for (const scenario of feature.scenarios) {
      code += this.generateScenarioCode(scenario);
    }

    return code;
  }

  /**
   * Generates scenario code
   */
  private generateScenarioCode(scenario: CucumberScenario): string {
    let code = '';

    // Add scenario tags
    if (scenario.tags && scenario.tags.length > 0) {
      code += `  @${scenario.tags.join(' @')}\n`;
    }

    // Add scenario declaration
    code += `  Scenario: ${scenario.name}\n`;

    // Add description
    if (scenario.description) {
      code += `    ${scenario.description}\n`;
    }

    // Add steps
    for (const step of scenario.steps) {
      code += `    ${step.keyword} ${step.text}\n`;

      // Add data table if present
      if (step.dataTable) {
        for (const row of step.dataTable) {
          code += `      | ${row.join(' | ')} |\n`;
        }
      }

      // Add doc string if present
      if (step.docString) {
        code += `      """\n`;
        code += `      ${step.docString}\n`;
        code += `      """\n`;
      }
    }

    code += '\n';

    return code;
  }

  /**
   * Generates step definitions code
   */
  private generateStepDefinitionsCode(
    functionInfo: FunctionInfo,
    feature: CucumberFeature,
    options: CucumberGenerationOptions,
  ): string {
    let code = '';

    if (options.generateTypeScript) {
      code += this.generateTypeScriptStepDefinitions(functionInfo, feature);
    } else {
      code += this.generateJavaScriptStepDefinitions(functionInfo, feature);
    }

    return code;
  }

  /**
   * Generates TypeScript step definitions
   */
  private generateTypeScriptStepDefinitions(
    functionInfo: FunctionInfo,
    feature: CucumberFeature,
  ): string {
    let code = '';

    // Add imports
    code += `import { Given, When, Then } from '@cucumber/cucumber';\n`;
    code += `import { expect } from 'chai';\n`;
    code += `import { ${functionInfo.name} } from '../src/${this.getRelativeImportPath(functionInfo.name)}';\n`;
    code += '\n';

    // Collect all unique steps
    const allSteps = new Map<string, CucumberStep[]>();

    for (const scenario of feature.scenarios) {
      for (const step of scenario.steps) {
        const stepKey = `${step.keyword} ${step.text}`;
        if (!allSteps.has(stepKey)) {
          allSteps.set(stepKey, []);
        }
        allSteps.get(stepKey)!.push(step);
      }
    }

    // Generate step definitions
    for (const [stepKey, steps] of allSteps) {
      const [keyword, text] = stepKey.split(' ', 2);
      const stepDef = this.generateStepDefinition(keyword as 'Given' | 'When' | 'Then', text, functionInfo);
      code += stepDef + '\n';
    }

    return code;
  }

  /**
   * Generates JavaScript step definitions
   */
  private generateJavaScriptStepDefinitions(
    functionInfo: FunctionInfo,
    feature: CucumberFeature,
  ): string {
    let code = '';

    // Add imports
    code += `const { Given, When, Then } = require('@cucumber/cucumber');\n`;
    code += `const { expect } = require('chai');\n`;
    code += `const { ${functionInfo.name} } = require('../src/${this.getRelativeImportPath(functionInfo.name)}');\n`;
    code += '\n';

    // Collect all unique steps
    const allSteps = new Map<string, CucumberStep[]>();

    for (const scenario of feature.scenarios) {
      for (const step of scenario.steps) {
        const stepKey = `${step.keyword} ${step.text}`;
        if (!allSteps.has(stepKey)) {
          allSteps.set(stepKey, []);
        }
        allSteps.get(stepKey)!.push(step);
      }
    }

    // Generate step definitions
    for (const [stepKey, steps] of allSteps) {
      const [keyword, text] = stepKey.split(' ', 2);
      const stepDef = this.generateStepDefinition(keyword as 'Given' | 'When' | 'Then', text, functionInfo);
      code += stepDef + '\n';
    }

    return code;
  }

  /**
   * Generates a single step definition
   */
  private generateStepDefinition(
    keyword: 'Given' | 'When' | 'Then',
    text: string,
    functionInfo: FunctionInfo,
  ): string {
    let code = '';

    // Convert step text to regex pattern
    const pattern = this.textToRegexPattern(text);

    code += `${keyword}('${pattern}', `;
    code += `async function(`;

    // Extract parameters from pattern
    const params = this.extractParametersFromPattern(pattern);
    code += params.join(', ');

    code += ') {\n';

    // Add implementation
    code += this.generateStepImplementation(keyword, text, functionInfo, params);

    code += '});\n';

    return code;
  }

  /**
   * Converts step text to regex pattern
   */
  private textToRegexPattern(text: string): string {
    // Replace parameter placeholders with capture groups
    let pattern = text.replace(/{([^}]+)}/g, '([^"]+)');
    pattern = pattern.replace(/'/g, "\\'");
    return pattern;
  }

  /**
   * Extracts parameters from regex pattern
   */
  private extractParametersFromPattern(pattern: string): string[] {
    const matches = pattern.match(/\([^)]+\)/g);
    if (!matches) {
      return [];
    }

    return matches.map((_, index) => `param${index + 1}`);
  }

  /**
   * Generates step implementation
   */
  private generateStepImplementation(
    keyword: 'Given' | 'When' | 'Then',
    text: string,
    functionInfo: FunctionInfo,
    params: string[],
  ): string {
    let implementation = '';

    if (keyword === 'Given') {
      implementation += '  // Setup test data\n';
      if (params.length > 0) {
        implementation += `  console.log('Setup with:', ${params.join(', ')});\n`;
      }
    } else if (keyword === 'When') {
      implementation += '  // Execute the function\n';
      if (text.includes(functionInfo.name)) {
        implementation += `  const result = await ${functionInfo.name}(`;
        implementation += functionInfo.parameters.map((p) => p.name).join(', ');
        implementation += ');\n';
        implementation += '  this.result = result;\n';
      }
    } else if (keyword === 'Then') {
      implementation += '  // Assert the result\n';
      implementation += '  expect(this.result).to.exist;\n';
    }

    return implementation;
  }

  /**
   * Gets relative import path for step definitions
   */
  private getRelativeImportPath(functionName: string): string {
    // Simple implementation - could be improved to calculate actual relative path
    return `path/to/${functionName}`;
  }

  /**
   * Calculates feature file path
   */
  private calculateFeatureFilePath(
    sourceFilePath: string,
    functionInfo: FunctionInfo,
    featureDirectory: string,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const featureFileName = `${this.toFileName(functionInfo.name)}.feature`;
    return path.join(sourceDir, featureDirectory, featureFileName);
  }

  /**
   * Calculates step definition file path
   */
  private calculateStepDefinitionFilePath(
    sourceFilePath: string,
    functionInfo: FunctionInfo,
    stepDefinitionsDirectory: string,
    generateTypeScript: boolean,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const extension = generateTypeScript ? '.ts' : '.js';
    const stepFileName = `${this.toFileName(functionInfo.name)}.steps${extension}`;
    return path.join(sourceDir, stepDefinitionsDirectory, stepFileName);
  }

  /**
   * Converts function name to file name
   */
  private toFileName(functionName: string): string {
    return functionName
      .replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
      .replace(/^-/, '')
      .toLowerCase();
  }

  /**
   * Creates the feature file at the specified path
   */
  public async createFeatureFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write feature file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Feature file created', { filePath });
  }

  /**
   * Creates the step definition file at the specified path
   */
  public async createStepDefinitionFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write step definition file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Step definition file created', { filePath });
  }

  /**
   * Gets Cucumber generation options from user
   */
  public async getCucumberGenerationOptions(): Promise<
    CucumberGenerationOptions | undefined
  > {
    // Ask for feature directory
    const featureDirectory = await vscode.window.showInputBox({
      prompt: 'Enter feature files directory name',
      placeHolder: 'features',
      value: 'features',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!featureDirectory) {
      return undefined;
    }

    // Ask for step definitions directory
    const stepDefinitionsDirectory = await vscode.window.showInputBox({
      prompt: 'Enter step definitions directory name',
      placeHolder: 'features/step-definitions',
      value: 'features/step-definitions',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!stepDefinitionsDirectory) {
      return undefined;
    }

    // Ask if TypeScript should be generated
    const generateTypeScriptChoice = await vscode.window.showQuickPick(
      [
        { label: 'TypeScript', description: 'Generate TypeScript step definitions', value: true },
        { label: 'JavaScript', description: 'Generate JavaScript step definitions', value: false },
      ],
      {
        placeHolder: 'Select step definition language',
      },
    );

    if (!generateTypeScriptChoice) {
      return undefined;
    }

    // Ask for additional options
    const includeExamples = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include example tables in scenarios', value: true },
        { label: 'No', description: 'Do not include examples', value: false },
      ],
      {
        placeHolder: 'Include example tables?',
      },
    );

    if (!includeExamples) {
      return undefined;
    }

    const includeBackground = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include background section', value: true },
        { label: 'No', description: 'Do not include background', value: false },
      ],
      {
        placeHolder: 'Include background section?',
      },
    );

    if (!includeBackground) {
      return undefined;
    }

    return {
      featureDirectory: featureDirectory.trim(),
      stepDefinitionsDirectory: stepDefinitionsDirectory.trim(),
      includeExamples: includeExamples.value,
      includeBackground: includeBackground.value,
      generateTypeScript: generateTypeScriptChoice.value,
    };
  }
}
