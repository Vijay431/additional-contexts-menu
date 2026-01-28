import * as path from 'path';

import * as vscode from 'vscode';

import type {
  SagaOrchestratorGenerationResult,
  SagaOrchestratorOptions,
  SagaStep,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating saga orchestrators for distributed transactions
 * with compensation actions and state management
 */
export class SagaPatternGeneratorService {
  private static instance: SagaPatternGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SagaPatternGeneratorService {
    SagaPatternGeneratorService.instance ??= new SagaPatternGeneratorService();
    return SagaPatternGeneratorService.instance;
  }

  /**
   * Gets generator options from user
   */
  public async getGeneratorOptions(): Promise<SagaOrchestratorOptions | undefined> {
    // Step 1: Ask for orchestrator name
    const orchestratorName = await vscode.window.showInputBox({
      prompt: 'Enter saga orchestrator name',
      placeHolder: 'e.g., OrderSaga, PaymentSaga, BookingSaga',
      value: 'OrderSaga',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Orchestrator name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Orchestrator name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!orchestratorName) {
      return undefined;
    }

    // Step 2: Ask about TypeScript
    const includeTypeScript = await this.askYesNoQuestion('Use TypeScript?', true);

    // Step 3: Ask about state management
    const stateManagement = await vscode.window.showQuickPick(
      [
        { label: 'In-Memory State', description: 'Simple in-memory state object', value: 'memory' },
        {
          label: 'Redis State',
          description: 'Redis-backed state for distributed scenarios',
          value: 'redis',
        },
        {
          label: 'Database State',
          description: 'Database-backed state persistence',
          value: 'database',
        },
      ],
      {
        placeHolder: 'Select state management approach',
      },
    );

    if (!stateManagement) {
      return undefined;
    }

    // Step 4: Ask about logging
    const includeLogging = await this.askYesNoQuestion('Include logging?', true);

    // Step 5: Ask about metrics/monitoring
    const includeMetrics = await this.askYesNoQuestion('Include metrics/monitoring?', true);

    // Step 6: Ask about timeout support
    const includeTimeout = await this.askYesNoQuestion('Include timeout support?', true);

    // Step 7: Ask about retry logic
    const includeRetry = await this.askYesNoQuestion('Include retry logic for steps?', true);

    // Step 8: Optionally configure timeout
    let defaultTimeout: number | undefined;
    if (includeTimeout) {
      const timeoutInput = await vscode.window.showInputBox({
        prompt: 'Enter default timeout in milliseconds',
        placeHolder: '30000',
        value: '30000',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (Number.isNaN(num) || num < 1000) {
            return 'Timeout must be at least 1000ms';
          }
          return null;
        },
      });
      if (timeoutInput) {
        defaultTimeout = parseInt(timeoutInput, 10);
      }
    }

    // Step 9: Optionally configure retry
    let maxRetries: number | undefined;
    let retryDelay: number | undefined;
    if (includeRetry) {
      const maxRetriesInput = await vscode.window.showInputBox({
        prompt: 'Enter maximum retry attempts',
        placeHolder: '3',
        value: '3',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (Number.isNaN(num) || num < 0) {
            return 'Max retries must be a non-negative number';
          }
          return null;
        },
      });
      if (maxRetriesInput) {
        maxRetries = parseInt(maxRetriesInput, 10);
      }

      const retryDelayInput = await vscode.window.showInputBox({
        prompt: 'Enter initial retry delay in milliseconds',
        placeHolder: '1000',
        value: '1000',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (Number.isNaN(num) || num < 100) {
            return 'Retry delay must be at least 100ms';
          }
          return null;
        },
      });
      if (retryDelayInput) {
        retryDelay = parseInt(retryDelayInput, 10);
      }
    }

    return {
      orchestratorName: orchestratorName.trim(),
      includeTypeScript,
      stateManagement: stateManagement.value as 'memory' | 'redis' | 'database',
      includeLogging,
      includeMetrics,
      includeTimeout,
      includeRetry,
      defaultTimeout,
      maxRetries,
      retryDelay,
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

  /**
   * Main entry point: Generates saga orchestrator implementation
   */
  public async generateSagaOrchestrator(
    document: vscode.TextDocument,
    options: SagaOrchestratorOptions,
  ): Promise<SagaOrchestratorGenerationResult> {
    // Collect saga steps from user
    const steps = await this.collectSagaSteps();

    if (!steps || steps.length === 0) {
      throw new Error('At least one saga step is required');
    }

    // Generate the orchestrator code
    const orchestratorCode = this.generateOrchestratorCode(options, steps);

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, options);

    this.logger.info('Saga orchestrator generated', {
      orchestratorName: options.orchestratorName,
      stepCount: steps.length,
      hasTypeScript: options.includeTypeScript,
      stateManagement: options.stateManagement,
    });

    return {
      orchestratorName: options.orchestratorName,
      orchestratorCode,
      filePath,
      steps,
      hasTypeScript: options.includeTypeScript,
    };
  }

  /**
   * Collects saga steps from user
   */
  private async collectSagaSteps(): Promise<SagaStep[] | null> {
    const steps: SagaStep[] = [];

    let addMore = true;
    let stepOrder = 1;

    while (addMore) {
      const step = await this.createSagaStep(stepOrder);
      if (step) {
        steps.push(step);
        stepOrder++;
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another step', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another step or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return steps.length > 0 ? steps : null;
  }

  /**
   * Creates a single saga step through user interaction
   */
  private async createSagaStep(order: number): Promise<SagaStep | null> {
    // Get step name
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter step ${order} name (e.g., reserveInventory, processPayment)`,
      placeHolder: 'reserveInventory',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Step name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Step name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const stepName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter step description (optional)',
    });

    // Ask if async
    const isAsync = await this.askYesNoQuestion('Is this step asynchronous?', true);

    // Get return type
    const returnType = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: isAsync ? 'Promise<void>' : 'void',
      value: isAsync ? 'Promise<void>' : 'void',
    });

    // Get parameters
    const parameters = await this.collectStepParameters();

    // Get compensation action
    const hasCompensation = await this.askYesNoQuestion(
      'Does this step have a compensation action?',
      true,
    );

    let compensationName: string | undefined;
    let compensationParameters: string[] | undefined;

    if (hasCompensation) {
      const compNameInput = await vscode.window.showInputBox({
        prompt: `Enter compensation action name for ${stepName}`,
        placeHolder: `compensate${this.ucfirst(stepName)}`,
        value: `compensate${this.ucfirst(stepName)}`,
      });

      if (compNameInput) {
        compensationName = compNameInput.trim();
      }

      const compensationParams = await vscode.window.showInputBox({
        prompt: 'Enter compensation parameters (comma-separated, optional)',
        placeHolder: 'context: SagaContext, result: StepResult',
      });

      if (compensationParams) {
        compensationParameters = compensationParams
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }
    }

    return {
      name: stepName,
      description: description?.trim(),
      isAsync,
      returnType: returnType?.trim() || (isAsync ? 'Promise<void>' : 'void'),
      parameters,
      hasCompensation,
      compensationName,
      compensationParameters,
    };
  }

  /**
   * Collects parameters for a step
   */
  private async collectStepParameters(): Promise<string[]> {
    const parameters: string[] = [];

    let addMore = true;
    while (addMore) {
      const param = await vscode.window.showInputBox({
        prompt: 'Enter parameter (e.g., context: SagaContext, orderId: string)',
        placeHolder: 'context: SagaContext',
      });

      if (!param) {
        break;
      }

      parameters.push(param.trim());

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
   * Generates the complete orchestrator code
   */
  private generateOrchestratorCode(options: SagaOrchestratorOptions, steps: SagaStep[]): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Generate imports
    code += this.generateImports(options);

    // Generate interfaces if TypeScript
    if (ts) {
      code += this.generateInterfaces(options, steps);
    }

    // Generate orchestrator class
    if (ts) {
      code += this.generateTypeScriptClass(options, steps);
    } else {
      code += this.generateJavaScriptClass(options, steps);
    }

    return code;
  }

  /**
   * Generate imports
   */
  private generateImports(options: SagaOrchestratorOptions): string {
    const imports: string[] = [];

    if (options.includeTypeScript) {
      imports.push("import { EventEmitter } from 'events';");
    } else {
      imports.push("const EventEmitter = require('events');");
    }

    if (options.stateManagement === 'redis') {
      imports.push(
        options.includeTypeScript
          ? "import { createClient } from 'redis';"
          : "const { createClient } = require('redis');",
      );
    }

    if (imports.length > 0) {
      return imports.join('\n') + '\n\n';
    }
    return '';
  }

  /**
   * Generate TypeScript interfaces
   */
  private generateInterfaces(options: SagaOrchestratorOptions, _steps: SagaStep[]): string {
    let code = '';

    // Saga State interface
    code += `/**
 * Saga state interface
 */
export interface ${options.orchestratorName}State {
  currentStep: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'compensating';
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: Error;
  stepResults: Map<string, unknown>;
`;

    if (options.includeTimeout && options.defaultTimeout) {
      code += `  timeout?: number;\n`;
    }

    code += `}

`;

    // Saga Context interface
    code += `/**
 * Saga execution context
 */
export interface ${options.orchestratorName}Context {
  sagaId: string;
  state: ${options.orchestratorName}State;
  metadata: Record<string, unknown>;
`;

    if (options.includeRetry && options.maxRetries) {
      code += `  retryCount: number;\n`;
    }

    code += `}

`;

    // Step interfaces
    code += `/**
 * Saga step definition
 */
export interface ${options.orchestratorName}Step {
  name: string;
  execute: (context: ${options.orchestratorName}Context) => Promise<unknown>;
  compensate?: (context: ${options.orchestratorName}Context) => Promise<void>;
}

`;

    // Orchestrator config interface
    code += `/**
 * Orchestrator configuration
 */
export interface ${options.orchestratorName}Config {
`;

    if (options.includeTimeout) {
      code += `  timeout?: number;\n`;
    }

    if (options.includeRetry) {
      code += `  maxRetries?: number;\n`;
      code += `  retryDelay?: number;\n`;
    }

    if (options.stateManagement === 'redis') {
      code += `  redisUrl?: string;\n`;
      code += `  stateKeyPrefix?: string;\n`;
    }

    code += `}
`;

    return code;
  }

  /**
   * Generate TypeScript orchestrator class
   */
  private generateTypeScriptClass(options: SagaOrchestratorOptions, steps: SagaStep[]): string {
    const defaultTimeout = options.defaultTimeout ?? 30000;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    let code = `/**
 * ${options.orchestratorName}
 *
 * Saga orchestrator for managing distributed transactions with compensation actions.
 * Provides automatic rollback, state management, and error handling.
 */
export class ${options.orchestratorName} extends EventEmitter {
`;

    // Properties
    code += `  private steps: ${options.orchestratorName}Step[];
`;

    if (options.stateManagement === 'redis') {
      code += `  private redisClient: ReturnType<typeof createClient>;\n`;
      code += `  private stateKeyPrefix: string;\n`;
    } else if (options.stateManagement === 'memory') {
      code += `  private state: Map<string, ${options.orchestratorName}State>;\n`;
    } else {
      code += `  private stateRepository: ${options.orchestratorName}StateRepository;\n`;
    }

    if (options.includeMetrics) {
      code += `  private metrics: {\n`;
      code += `    totalExecutions: number;\n`;
      code += `    successfulExecutions: number;\n`;
      code += `    failedExecutions: number;\n`;
      code += `    compensatedExecutions: number;\n`;
      code += `    averageExecutionTime: number;\n`;
      code += `  };\n`;
    }

    code += `
  constructor(config: ${options.orchestratorName}Config = {}) {
    super();
    this.steps = [
`;

    for (const step of steps) {
      code += `      {\n`;
      code += `        name: '${step.name}',\n`;
      code += `        execute: async (context) => this.${step.name}(${step.parameters.length > 0 ? step.parameters.join(', ') : 'context'}),\n`;
      if (step.hasCompensation) {
        code += `        compensate: async (context) => this.${step.compensationName}(${step.compensationParameters?.length > 0 ? step.compensationParameters.join(', ') : 'context'}),\n`;
      }
      code += `      },\n`;
    }

    code += `    ];
`;

    if (options.stateManagement === 'memory') {
      code += `    this.state = new Map();\n`;
    } else if (options.stateManagement === 'redis') {
      code += `    this.redisClient = createClient({ url: config.redisUrl ?? 'redis://localhost:6379' });\n`;
      code += `    this.stateKeyPrefix = config.stateKeyPrefix ?? 'saga:${this.constructor.name}:';\n`;
      code += `    this.redisClient.connect().catch(console.error);\n`;
    }

    if (options.includeMetrics) {
      code += `    this.metrics = {\n`;
      code += `      totalExecutions: 0,\n`;
      code += `      successfulExecutions: 0,\n`;
      code += `      failedExecutions: 0,\n`;
      code += `      compensatedExecutions: 0,\n`;
      code += `      averageExecutionTime: 0,\n`;
      code += `    };\n`;
    }

    code += `  }

  /**
   * Execute the saga orchestrator
   */
  public async execute(context: ${options.orchestratorName}Context): Promise<${options.orchestratorName}Context> {
    const startTime = Date.now();
    context.state.status = 'in-progress';
    context.state.startedAt = startTime;
    context.state.currentStep = 0;

    ${options.includeMetrics ? 'this.metrics.totalExecutions++;' : ''}
    ${options.includeLogging ? "this.log('info', `Starting saga ${context.sagaId}`);" : ''}

    try {
      // Execute each step in sequence
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        context.state.currentStep = i;

        ${options.includeLogging ? "this.log('info', `Executing step: ${step.name}`);" : ''}
        ${options.includeMetrics ? "this.emit('stepStarted', { step: step.name, sagaId: context.sagaId });" : ''}

        const result = await this.executeStepWithRetry(step, context);
        context.state.stepResults.set(step.name, result);

        ${options.includeMetrics ? "this.emit('stepCompleted', { step: step.name, sagaId: context.sagaId });" : ''}
      }

      // All steps completed successfully
      context.state.status = 'completed';
      context.state.completedAt = Date.now();
      const executionTime = context.state.completedAt - startTime;

      ${
        options.includeMetrics
          ? `this.metrics.successfulExecutions++;
      this.updateAverageExecutionTime(executionTime);`
          : ''
      }
      ${options.includeLogging ? "this.log('info', `Saga completed successfully in ${executionTime}ms`);" : ''}
      ${options.includeMetrics ? "this.emit('sagaCompleted', { sagaId: context.sagaId, executionTime });" : ''}

      return context;
    } catch (error) {
      // Step failed, initiate compensation
      context.state.status = 'failed';
      context.state.failedAt = Date.now();
      context.state.error = error as Error;

      ${options.includeLogging ? "this.log('error', `Saga failed at step ${context.state.currentStep}: ${error}`);" : ''}
      ${options.includeMetrics ? "this.emit('sagaFailed', { sagaId: context.sagaId, error, step: context.state.currentStep });" : ''}

      // Compensate completed steps
      await this.compensate(context);

      ${options.includeMetrics ? 'this.metrics.compensatedExecutions++;' : ''}
      throw error;
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStepWithRetry(
    step: ${options.orchestratorName}Step,
    context: ${options.orchestratorName}Context,
  ): Promise<unknown> {
    const maxAttempts = ${options.includeRetry ? `${maxRetries}` : '1'};
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        ${options.includeTimeout ? `return await this.withTimeout(step.execute(context), ${defaultTimeout});` : 'return await step.execute(context);'}
      } catch (error) {
        lastError = error as Error;

        ${options.includeLogging ? "this.log('warn', `Step ${step.name} failed (attempt ${attempt + 1}/${maxAttempts}): ${error}`);" : ''}

        if (attempt < maxAttempts - 1) {
          ${
            options.includeRetry
              ? `const delay = ${retryDelay} * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));`
              : 'break;'
          }
        }
      }
    }

    throw lastError || new Error(\`Step \${step.name} failed after \${maxAttempts} attempts\`);
  }

  /**
   * Compensate completed steps in reverse order
   */
  private async compensate(context: ${options.orchestratorName}Context): Promise<void> {
    context.state.status = 'compensating';

    ${options.includeLogging ? "this.log('info', 'Starting compensation for saga ' + context.sagaId);" : ''}
    ${options.includeMetrics ? "this.emit('compensationStarted', { sagaId: context.sagaId });" : ''}

    // Compensate steps in reverse order
    for (let i = context.state.currentStep - 1; i >= 0; i--) {
      const step = this.steps[i];

      if (step.compensate) {
        ${options.includeLogging ? "this.log('info', `Compensating step: ${step.name}`);" : ''}

        try {
          await step.compensate(context);
          ${options.includeMetrics ? "this.emit('stepCompensated', { step: step.name, sagaId: context.sagaId });" : ''}
        } catch (error) {
          ${options.includeLogging ? "this.log('error', `Compensation failed for step ${step.name}: ${error}`);" : ''}
          ${options.includeMetrics ? "this.emit('compensationFailed', { step: step.name, sagaId: context.sagaId, error });" : ''}
          // Continue compensating other steps even if one fails
        }
      }
    }

    ${options.includeLogging ? "this.log('info', 'Compensation completed for saga ' + context.sagaId);" : ''}
    ${options.includeMetrics ? "this.emit('compensationCompleted', { sagaId: context.sagaId });" : ''}
  }
`;

    // Add withTimeout method if needed
    if (options.includeTimeout) {
      code += `
  /**
   * Wrap a promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(\`Timeout after \${timeoutMs}ms\`)), timeoutMs),
      ),
    ]);
  }
`;
    }

    // Add log method if needed
    if (options.includeLogging) {
      code += `
  /**
   * Log saga events
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    const timestamp = new Date().toISOString();
    console[level](\`[\${timestamp}] [${options.orchestratorName}] \${message}\`);
    this.emit('log', { level, message, timestamp });
  }
`;
    }

    // Add metrics method if needed
    if (options.includeMetrics) {
      code += `
  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const total = this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1);
    this.metrics.averageExecutionTime = (total + executionTime) / this.metrics.totalExecutions;
  }

  /**
   * Get orchestrator metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }
`;
    }

    // Generate step methods
    for (const step of steps) {
      code += `
  /**
   * ${step.description || step.name}
   */
  private async ${step.name}(${step.parameters.length > 0 ? step.parameters.join(', ') : 'context'}): ${step.returnType} {
    // TODO: Implement ${step.name}
    throw new Error('Not implemented');
  }
`;

      if (step.hasCompensation) {
        code += `
  /**
   * Compensation action for ${step.name}
   */
  private async ${step.compensationName}(${step.compensationParameters?.length > 0 ? step.compensationParameters.join(', ') : 'context'}): Promise<void> {
    // TODO: Implement compensation for ${step.name}
    throw new Error('Not implemented');
  }
`;
      }
    }

    code += `}

/**
 * Factory function to create a saga orchestrator instance
 */
export function create${options.orchestratorName}(config?: ${options.orchestratorName}Config): ${options.orchestratorName} {
  return new ${options.orchestratorName}(config);
}
`;

    return code;
  }

  /**
   * Generate JavaScript orchestrator class
   */
  private generateJavaScriptClass(options: SagaOrchestratorOptions, steps: SagaStep[]): string {
    const defaultTimeout = options.defaultTimeout ?? 30000;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    let code = `/**
 * ${options.orchestratorName}
 *
 * Saga orchestrator for managing distributed transactions with compensation actions.
 * Provides automatic rollback, state management, and error handling.
 */
class ${options.orchestratorName} extends EventEmitter {
  constructor(config = {}) {
    super();
    this.steps = [
`;

    for (const step of steps) {
      code += `      {
        name: '${step.name}',
        execute: async (context) => this.${step.name}(${step.parameters.length > 0 ? step.parameters.join(', ') : 'context'}),
        ${step.hasCompensation ? `compensate: async (context) => this.${step.compensationName}(${step.compensationParameters?.length > 0 ? step.compensationParameters.join(', ') : 'context'}),` : ''}
      },
`;
    }

    code += `    ];
`;

    if (options.stateManagement === 'memory') {
      code += `    this.state = new Map();\n`;
    } else if (options.stateManagement === 'redis') {
      code += `    this.redisClient = createClient({ url: config.redisUrl ?? 'redis://localhost:6379' });\n`;
      code += `    this.stateKeyPrefix = config.stateKeyPrefix ?? 'saga:${this.constructor.name}:';\n`;
      code += `    this.redisClient.connect().catch(console.error);\n`;
    }

    if (options.includeMetrics) {
      code += `    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      compensatedExecutions: 0,
      averageExecutionTime: 0,
    };\n`;
    }

    code += `  }

  /**
   * Execute the saga orchestrator
   */
  async execute(context) {
    const startTime = Date.now();
    context.state.status = 'in-progress';
    context.state.startedAt = startTime;
    context.state.currentStep = 0;

    ${options.includeMetrics ? 'this.metrics.totalExecutions++;' : ''}
    ${options.includeLogging ? "this.log('info', `Starting saga ${context.sagaId}`);" : ''}

    try {
      // Execute each step in sequence
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        context.state.currentStep = i;

        ${options.includeLogging ? "this.log('info', `Executing step: ${step.name}`);" : ''}
        ${options.includeMetrics ? "this.emit('stepStarted', { step: step.name, sagaId: context.sagaId });" : ''}

        const result = await this.executeStepWithRetry(step, context);
        context.state.stepResults.set(step.name, result);

        ${options.includeMetrics ? "this.emit('stepCompleted', { step: step.name, sagaId: context.sagaId });" : ''}
      }

      // All steps completed successfully
      context.state.status = 'completed';
      context.state.completedAt = Date.now();
      const executionTime = context.state.completedAt - startTime;

      ${
        options.includeMetrics
          ? `this.metrics.successfulExecutions++;
      this.updateAverageExecutionTime(executionTime);`
          : ''
      }
      ${options.includeLogging ? "this.log('info', `Saga completed successfully in ${executionTime}ms`);" : ''}
      ${options.includeMetrics ? "this.emit('sagaCompleted', { sagaId: context.sagaId, executionTime });" : ''}

      return context;
    } catch (error) {
      // Step failed, initiate compensation
      context.state.status = 'failed';
      context.state.failedAt = Date.now();
      context.state.error = error;

      ${options.includeLogging ? "this.log('error', `Saga failed at step ${context.state.currentStep}: ${error}`);" : ''}
      ${options.includeMetrics ? "this.emit('sagaFailed', { sagaId: context.sagaId, error, step: context.state.currentStep });" : ''}

      // Compensate completed steps
      await this.compensate(context);

      ${options.includeMetrics ? 'this.metrics.compensatedExecutions++;' : ''}
      throw error;
    }
  }

  /**
   * Execute a single step with retry logic
   */
  async executeStepWithRetry(step, context) {
    const maxAttempts = ${options.includeRetry ? `${maxRetries}` : '1'};
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        ${options.includeTimeout ? `return await this.withTimeout(step.execute(context), ${defaultTimeout});` : 'return await step.execute(context);'}
      } catch (error) {
        lastError = error;

        ${options.includeLogging ? "this.log('warn', `Step ${step.name} failed (attempt ${attempt + 1}/${maxAttempts}): ${error}`);" : ''}

        if (attempt < maxAttempts - 1) {
          ${
            options.includeRetry
              ? `const delay = ${retryDelay} * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));`
              : 'break;'
          }
        }
      }
    }

    throw lastError || new Error(\`Step \${step.name} failed after \${maxAttempts} attempts\`);
  }

  /**
   * Compensate completed steps in reverse order
   */
  async compensate(context) {
    context.state.status = 'compensating';

    ${options.includeLogging ? "this.log('info', 'Starting compensation for saga ' + context.sagaId);" : ''}
    ${options.includeMetrics ? "this.emit('compensationStarted', { sagaId: context.sagaId });" : ''}

    // Compensate steps in reverse order
    for (let i = context.state.currentStep - 1; i >= 0; i--) {
      const step = this.steps[i];

      if (step.compensate) {
        ${options.includeLogging ? "this.log('info', `Compensating step: ${step.name}`);" : ''}

        try {
          await step.compensate(context);
          ${options.includeMetrics ? "this.emit('stepCompensated', { step: step.name, sagaId: context.sagaId });" : ''}
        } catch (error) {
          ${options.includeLogging ? "this.log('error', `Compensation failed for step ${step.name}: ${error}`);" : ''}
          ${options.includeMetrics ? "this.emit('compensationFailed', { step: step.name, sagaId: context.sagaId, error });" : ''}
          // Continue compensating other steps even if one fails
        }
      }
    }

    ${options.includeLogging ? "this.log('info', 'Compensation completed for saga ' + context.sagaId);" : ''}
    ${options.includeMetrics ? "this.emit('compensationCompleted', { sagaId: context.sagaId });" : ''}
  }
`;

    // Add withTimeout method if needed
    if (options.includeTimeout) {
      code += `
  /**
   * Wrap a promise with timeout
   */
  async withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(\`Timeout after \${timeoutMs}ms\`)), timeoutMs),
      ),
    ]);
  }
`;
    }

    // Add log method if needed
    if (options.includeLogging) {
      code += `
  /**
   * Log saga events
   */
  log(level, message) {
    const timestamp = new Date().toISOString();
    console[level](\`[\${timestamp}] [${options.orchestratorName}] \${message}\`);
    this.emit('log', { level, message, timestamp });
  }
`;
    }

    // Add metrics method if needed
    if (options.includeMetrics) {
      code += `
  /**
   * Update average execution time
   */
  updateAverageExecutionTime(executionTime) {
    const total = this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1);
    this.metrics.averageExecutionTime = (total + executionTime) / this.metrics.totalExecutions;
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
`;
    }

    // Generate step methods
    for (const step of steps) {
      code += `
  /**
   * ${step.description || step.name}
   */
  async ${step.name}(${step.parameters.length > 0 ? step.parameters.join(', ') : 'context'}) {
    // TODO: Implement ${step.name}
    throw new Error('Not implemented');
  }
`;

      if (step.hasCompensation) {
        code += `
  /**
   * Compensation action for ${step.name}
   */
  async ${step.compensationName}(${step.compensationParameters?.length > 0 ? step.compensationParameters.join(', ') : 'context'}) {
    // TODO: Implement compensation for ${step.name}
    throw new Error('Not implemented');
  }
`;
      }
    }

    code += `}

/**
 * Factory function to create a saga orchestrator instance
 */
function create${options.orchestratorName}(config) {
  return new ${options.orchestratorName}(config);
}

module.exports = {
  ${options.orchestratorName},
  create${options.orchestratorName},
};
`;

    return code;
  }

  /**
   * Calculates file path for the saga orchestrator
   */
  public calculateFilePath(sourceFilePath: string, options: SagaOrchestratorOptions): string {
    const ext = options.includeTypeScript ? '.ts' : '.js';
    const sourceDir = path.dirname(sourceFilePath);
    return path.join(sourceDir, `${options.orchestratorName}${ext}`);
  }

  /**
   * Creates the orchestrator file at the specified path
   */
  public async createOrchestratorFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info(`Saga orchestrator file created: ${filePath}`);
  }

  /**
   * Checks if an orchestrator file already exists
   */
  public async orchestratorFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
