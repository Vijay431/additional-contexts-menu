import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface CircuitBreakerOptions {
  includeTypeScript: boolean;
  includeTimeout: boolean;
  includeRetry: boolean;
  includeFallback: boolean;
  breakerName: string;
  failureThreshold: number;
  resetTimeout: number;
  monitoringEnabled: boolean;
  halfOpenMaxCalls: number;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  fallbackResponse?: unknown;
}

export interface CircuitBreakerInfo {
  hasTimeout: boolean;
  hasRetry: boolean;
  hasFallback: boolean;
  hasMonitoring: boolean;
  failureThreshold: number;
  resetTimeout: number;
}

export interface GeneratedCircuitBreaker {
  breakerName: string;
  circuitBreakerCode: string;
  filePath: string;
  hasTypeScript: boolean;
}

/**
 * Service for generating circuit breaker pattern implementations
 */
export class CircuitBreakerGeneratorService {
  private static instance: CircuitBreakerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CircuitBreakerGeneratorService {
    CircuitBreakerGeneratorService.instance ??= new CircuitBreakerGeneratorService();
    return CircuitBreakerGeneratorService.instance;
  }

  /**
   * Gets generator options from user
   */
  public async getGeneratorOptions(): Promise<CircuitBreakerOptions | undefined> {
    // Step 1: Ask for circuit breaker name
    const breakerName = await vscode.window.showInputBox({
      prompt: 'Enter circuit breaker name',
      placeHolder: 'e.g., ApiCircuitBreaker, ServiceCircuitBreaker',
      value: 'ApiCircuitBreaker',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Circuit breaker name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Circuit breaker name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!breakerName) {
      return undefined;
    }

    // Step 2: Ask about TypeScript
    const includeTypeScript = await this.askYesNoQuestion('Use TypeScript?', true);

    // Step 3: Ask about features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Timeout Protection', description: 'Include timeout logic for requests', picked: true },
        { label: 'Retry Logic', description: 'Include automatic retry with exponential backoff', picked: true },
        { label: 'Fallback Response', description: 'Include fallback response when circuit is open', picked: true },
        { label: 'Monitoring/Metrics', description: 'Include statistics and event emission', picked: true },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    const includeTimeout = features.some((f) => f.label === 'Timeout Protection');
    const includeRetry = features.some((f) => f.label === 'Retry Logic');
    const includeFallback = features.some((f) => f.label === 'Fallback Response');
    const monitoringEnabled = features.some((f) => f.label === 'Monitoring/Metrics');

    // Step 4: Configure failure threshold
    const failureThresholdInput = await vscode.window.showInputBox({
      prompt: 'Enter failure threshold (number of failures before opening)',
      placeHolder: '5',
      value: '5',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1) {
          return 'Failure threshold must be a positive number';
        }
        return null;
      },
    });

    if (!failureThresholdInput) {
      return undefined;
    }
    const failureThreshold = parseInt(failureThresholdInput, 10);

    // Step 5: Configure reset timeout
    const resetTimeoutInput = await vscode.window.showInputBox({
      prompt: 'Enter reset timeout in milliseconds (how long to stay open before attempting reset)',
      placeHolder: '60000',
      value: '60000',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1000) {
          return 'Reset timeout must be at least 1000ms';
        }
        return null;
      },
    });

    if (!resetTimeoutInput) {
      return undefined;
    }
    const resetTimeout = parseInt(resetTimeoutInput, 10);

    // Step 6: Configure half-open max calls
    const halfOpenMaxCallsInput = await vscode.window.showInputBox({
      prompt: 'Enter maximum calls in half-open state',
      placeHolder: '3',
      value: '3',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1) {
          return 'Half-open max calls must be a positive number';
        }
        return null;
      },
    });

    if (!halfOpenMaxCallsInput) {
      return undefined;
    }
    const halfOpenMaxCalls = parseInt(halfOpenMaxCallsInput, 10);

    // Step 7: Optionally configure timeout duration
    let timeout: number | undefined;
    if (includeTimeout) {
      const timeoutInput = await vscode.window.showInputBox({
        prompt: 'Enter request timeout in milliseconds',
        placeHolder: '5000',
        value: '5000',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 100) {
            return 'Timeout must be at least 100ms';
          }
          return null;
        },
      });
      if (timeoutInput) {
        timeout = parseInt(timeoutInput, 10);
      }
    }

    // Step 8: Optionally configure retry settings
    let maxRetries: number | undefined;
    let retryDelay: number | undefined;
    if (includeRetry) {
      const maxRetriesInput = await vscode.window.showInputBox({
        prompt: 'Enter maximum retry attempts',
        placeHolder: '3',
        value: '3',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 0) {
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
          if (isNaN(num) || num < 100) {
            return 'Retry delay must be at least 100ms';
          }
          return null;
        },
      });
      if (retryDelayInput) {
        retryDelay = parseInt(retryDelayInput, 10);
      }
    }

    // Step 9: Optionally configure fallback response
    let fallbackResponse: unknown;
    if (includeFallback) {
      const useFallback = await this.askYesNoQuestion('Use default null fallback?', true);
      if (!useFallback) {
        const fallbackInput = await vscode.window.showInputBox({
          prompt: 'Enter fallback response (JSON or leave empty for null)',
          placeHolder: '{}',
        });
        if (fallbackInput) {
          try {
            fallbackResponse = JSON.parse(fallbackInput);
          } catch {
            // If not valid JSON, use as string
            fallbackResponse = fallbackInput;
          }
        }
      }
    }

    return {
      breakerName: breakerName.trim(),
      includeTypeScript,
      includeTimeout,
      includeRetry,
      includeFallback,
      monitoringEnabled,
      failureThreshold,
      resetTimeout,
      halfOpenMaxCalls,
      timeout,
      maxRetries,
      retryDelay,
      fallbackResponse,
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
   * Main entry point: Generates circuit breaker implementation
   */
  public async generateCircuitBreaker(
    document: vscode.TextDocument,
    options: CircuitBreakerOptions,
  ): Promise<GeneratedCircuitBreaker> {
    // Analyze current document to understand circuit breaker needs
    const circuitBreakerInfo = this.analyzeCircuitBreakerNeeds(document);

    // Generate the circuit breaker code
    const circuitBreakerCode = this.generateCircuitBreakerCode(options, circuitBreakerInfo);

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, options);

    this.logger.info('Circuit breaker generated', {
      breakerName: options.breakerName,
      hasTypeScript: options.includeTypeScript,
      hasTimeout: options.includeTimeout,
      hasRetry: options.includeRetry,
      hasFallback: options.includeFallback,
    });

    return {
      breakerName: options.breakerName,
      circuitBreakerCode,
      filePath,
      hasTypeScript: options.includeTypeScript,
    };
  }

  /**
   * Analyzes the current document to determine circuit breaker needs
   */
  private analyzeCircuitBreakerNeeds(document: vscode.TextDocument): CircuitBreakerInfo {
    const code = document.getText();

    // Detect if code already has timeout, retry, or fallback mechanisms
    const hasTimeout = /timeout|setTimeout/i.test(code);
    const hasRetry = /retry|attempts\s*[>:]\s*\d+/i.test(code);
    const hasFallback = /fallback|catch\s*\([^)]*\)\s*\{[^}]*return/i.test(code);
    const hasMonitoring = /metrics|statistics|monitoring/i.test(code);

    return {
      hasTimeout,
      hasRetry,
      hasFallback,
      hasMonitoring,
      failureThreshold: 5,
      resetTimeout: 60000,
    };
  }

  /**
   * Generates the complete circuit breaker code
   */
  private generateCircuitBreakerCode(
    options: CircuitBreakerOptions,
    info: CircuitBreakerInfo,
  ): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Generate imports
    code += this.generateImports(options);

    // Generate state enum
    code += this.generateStateEnum(ts);

    // Generate circuit breaker class/interface
    if (ts) {
      code += this.generateTypeScriptClass(options);
    } else {
      code += this.generateJavaScriptClass(options);
    }

    return code;
  }

  /**
   * Generate imports
   */
  private generateImports(options: CircuitBreakerOptions): string {
    const imports: string[] = [];

    if (options.includeTypeScript) {
      imports.push("import { EventEmitter } from 'events';");
    } else {
      imports.push("const EventEmitter = require('events');");
    }

    if (imports.length > 0) {
      return imports.join('\n') + '\n\n';
    }
    return '';
  }

  /**
   * Generate state enum
   */
  private generateStateEnum(includeTypeScript: boolean): string {
    if (includeTypeScript) {
      return `/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

`;
    } else {
      return `/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

`;
    }
  }

  /**
   * Generate TypeScript circuit breaker class
   */
  private generateTypeScriptClass(
    options: CircuitBreakerOptions,
  ): string {
    const timeout = options.timeout ?? 5000;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    let code = `/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  halfOpenMaxCalls?: number;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  fallbackResponse?: unknown;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

`;

    code += `/**
 * ${options.breakerName}
 *
 * Circuit breaker pattern for external service calls.
 * Provides automatic failure detection, state transitions, and fallback mechanisms.
 */
export class ${options.breakerName} extends EventEmitter {
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests: number;
  private totalFailures: number;
  private totalSuccesses: number;
  private halfOpenCallCount: number;
  private resetTimer?: NodeJS.Timeout;
  private monitoringFailures: number[];

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly halfOpenMaxCalls: number;
`;

    if (options.includeTimeout) {
      code += `  private readonly timeout: number;\n`;
    }
    if (options.includeRetry) {
      code += `  private readonly maxRetries: number;\n`;
      code += `  private readonly retryDelay: number;\n`;
    }
    if (options.includeFallback) {
      code += `  private readonly fallbackResponse?: unknown;\n`;
    }

    code += `
  constructor(config: CircuitBreakerConfig = {}) {
    super();
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.halfOpenCallCount = 0;
    this.monitoringFailures = [];

    this.failureThreshold = config.failureThreshold ?? ${options.failureThreshold};
    this.resetTimeout = config.resetTimeout ?? ${options.resetTimeout};
    this.monitoringPeriod = config.monitoringPeriod ?? 10000;
    this.halfOpenMaxCalls = config.halfOpenMaxCalls ?? ${options.halfOpenMaxCalls};
`;

    if (options.includeTimeout) {
      code += `    this.timeout = config.timeout ?? ${timeout};\n`;
    }
    if (options.includeRetry) {
      code += `    this.maxRetries = config.maxRetries ?? ${maxRetries};\n`;
      code += `    this.retryDelay = config.retryDelay ?? ${retryDelay};\n`;
    }
    if (options.includeFallback) {
      code += `    this.fallbackResponse = config.fallbackResponse;\n`;
    }

    code += `  }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.halfOpenCallCount = 0;
      } else {
        this.emit('requestFailed', new Error('Circuit breaker is OPEN'));
        if (fallback) {
          return fallback();
        }
`;

    if (options.includeFallback) {
      code += `        return this.fallbackResponse as T;\n`;
    } else {
      code += `        throw new Error('Circuit breaker is OPEN');\n`;
    }

    code += `      }
    }

    try {
      // Execute with timeout and retry
      const result = await this.executeWithRetry(fn);
      this.onSuccess();
      this.emit('requestSuccess', result);
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      this.emit('requestFailed', error);

      if (fallback) {
        return fallback();
      }
`;

    if (options.includeFallback) {
      code += `      return this.fallbackResponse as T;\n`;
    } else {
      code += `      throw error;\n`;
    }

    code += `    }
  }
`;

    // Add executeWithRetry method
    if (options.includeRetry || options.includeTimeout) {
      code += `
  /**
   * Execute function with timeout and retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    const maxAttempts = ${options.includeRetry ? 'this.maxRetries' : '0'};
    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
`;
      if (options.includeTimeout) {
        code += `        return await this.withTimeout(fn(), this.timeout);\n`;
      } else {
        code += `        return await fn();\n`;
      }

      code += `      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts) {
`;
      if (options.includeRetry) {
        code += `          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));\n`;
      }

      code += `        }
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }
`;
    }

    // Add withTimeout method
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

    // Add onSuccess, onFailure, and other state management methods
    code += `
  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCallCount++;

      if (this.halfOpenCallCount >= this.halfOpenMaxCalls) {
        this.transitionTo(CircuitState.CLOSED);
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(error: Error): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const now = Date.now();
    this.monitoringFailures.push(now);

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately trip back to open on failure in half-open state
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.failureThreshold
    ) {
      // Trip to open state if threshold exceeded
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChanged', oldState, newState);
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }

    const now = Date.now();
    return now - this.lastFailureTime >= this.resetTimeout;
  }

  /**
   * Schedule circuit reset
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.halfOpenCallCount = 0;
      }
    }, this.resetTimeout);
  }

  /**
   * Get current state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Reset the circuit breaker to closed state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
    this.monitoringFailures = [];

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    this.emit('circuitClosed');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.reset();
    this.removeAllListeners();
  }
}
`;

    // Add factory function and decorator
    code += `/**
 * Factory function to create a circuit breaker instance
 */
export function create${options.breakerName}(config?: CircuitBreakerConfig): ${options.breakerName} {
  return new ${options.breakerName}(config);
}

/**
 * Decorator for circuit breaker protection
 */
export function CircuitBreakerProtection(config: CircuitBreakerConfig = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const breaker = new ${options.breakerName}(config);

    descriptor.value = async function (...args: unknown[]) {
      return breaker.execute(
        () => originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
`;

    return code;
  }

  /**
   * Generate JavaScript circuit breaker class
   */
  private generateJavaScriptClass(
    options: CircuitBreakerOptions,
  ): string {
    const timeout = options.timeout ?? 5000;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    let code = `/**
 * ${options.breakerName}
 *
 * Circuit breaker pattern for external service calls.
 * Provides automatic failure detection, state transitions, and fallback mechanisms.
 */
class ${options.breakerName} extends EventEmitter {
  constructor(config = {}) {
    super();
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.halfOpenCallCount = 0;
    this.monitoringFailures = [];

    this.failureThreshold = config.failureThreshold ?? ${options.failureThreshold};
    this.resetTimeout = config.resetTimeout ?? ${options.resetTimeout};
    this.monitoringPeriod = config.monitoringPeriod ?? 10000;
    this.halfOpenMaxCalls = config.halfOpenMaxCalls ?? ${options.halfOpenMaxCalls};
`;

    if (options.includeTimeout) {
      code += `    this.timeout = config.timeout ?? ${timeout};\n`;
    }
    if (options.includeRetry) {
      code += `    this.maxRetries = config.maxRetries ?? ${maxRetries};\n`;
      code += `    this.retryDelay = config.retryDelay ?? ${retryDelay};\n`;
    }
    if (options.includeFallback) {
      code += `    this.fallbackResponse = config.fallbackResponse;\n`;
    }

    code += `  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, fallback) {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.halfOpenCallCount = 0;
      } else {
        this.emit('requestFailed', new Error('Circuit breaker is OPEN'));
        if (fallback) {
          return fallback();
        }
`;
    if (options.includeFallback) {
      code += `        return this.fallbackResponse;\n`;
    } else {
      code += `        throw new Error('Circuit breaker is OPEN');\n`;
    }

    code += `      }
    }

    try {
      // Execute with timeout and retry
      const result = await this.executeWithRetry(fn);
      this.onSuccess();
      this.emit('requestSuccess', result);
      return result;
    } catch (error) {
      this.onFailure(error);
      this.emit('requestFailed', error);

      if (fallback) {
        return fallback();
      }
`;
    if (options.includeFallback) {
      code += `      return this.fallbackResponse;\n`;
    } else {
      code += `      throw error;\n`;
    }

    code += `    }
  }
`;

    // Add executeWithRetry method
    if (options.includeRetry || options.includeTimeout) {
      code += `
  /**
   * Execute function with timeout and retry logic
   */
  async executeWithRetry(fn) {
    let lastError;

    const maxAttempts = ${options.includeRetry ? 'this.maxRetries' : '0'};
    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
`;
      if (options.includeTimeout) {
        code += `        return await this.withTimeout(fn(), this.timeout);\n`;
      } else {
        code += `        return await fn();\n`;
      }

      code += `      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
`;
      if (options.includeRetry) {
        code += `          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));\n`;
      }

      code += `        }
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }
`;
    }

    // Add withTimeout method
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

    // Add state management methods
    code += `
  /**
   * Handle successful request
   */
  onSuccess() {
    this.totalSuccesses++;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCallCount++;

      if (this.halfOpenCallCount >= this.halfOpenMaxCalls) {
        this.transitionTo(CircuitState.CLOSED);
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed request
   */
  onFailure(error) {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const now = Date.now();
    this.monitoringFailures.push(now);

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.failureThreshold
    ) {
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
    }
  }

  /**
   * Transition to a new state
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChanged', oldState, newState);
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  shouldAttemptReset() {
    if (!this.lastFailureTime) {
      return true;
    }

    const now = Date.now();
    return now - this.lastFailureTime >= this.resetTimeout;
  }

  /**
   * Schedule circuit reset
   */
  scheduleReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.halfOpenCallCount = 0;
      }
    }, this.resetTimeout);
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
    this.monitoringFailures = [];

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    this.emit('circuitClosed');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.reset();
    this.removeAllListeners();
  }
}

/**
 * Factory function to create a circuit breaker instance
 */
function create${options.breakerName}(config) {
  return new ${options.breakerName}(config);
}

/**
 * Decorator for circuit breaker protection
 */
function CircuitBreakerProtection(config = {}) {
  return function (_target, _propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const breaker = new ${options.breakerName}(config);

    descriptor.value = async function (...args) {
      return breaker.execute(
        () => originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}

module.exports = {
  CircuitState,
  ${options.breakerName},
  create${options.breakerName},
  CircuitBreakerProtection,
};
`;

    return code;
  }

  /**
   * Calculates file path for the circuit breaker
   */
  public calculateFilePath(sourceFilePath: string, options: CircuitBreakerOptions): string {
    const ext = options.includeTypeScript ? '.ts' : '.js';
    const sourceDir = path.dirname(sourceFilePath);
    return path.join(sourceDir, `${options.breakerName}${ext}`);
  }

  /**
   * Creates the circuit breaker file at the specified path
   */
  public async createCircuitBreakerFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info(`Circuit breaker file created: ${filePath}`);
  }

  /**
   * Checks if a circuit breaker file already exists
   */
  public async circuitBreakerFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
