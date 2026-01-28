import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface RateLimiterGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeJSDoc: boolean;
  backend: 'memory' | 'redis' | 'both';
  slidingWindow: boolean;
  windowSize: number;
  maxRequests: number;
  penaltyBoxEnabled: boolean;
  penaltyDuration: number;
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
  defaultLimiterName: string;
  outputDirectory: string;
  middlewarePattern: 'express' | 'fastify' | 'nestjs' | 'generic';
  exportType: 'named' | 'default';
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: string;
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
  handler?: string;
  headersEnabled: boolean;
}

export interface PenaltyBoxOptions {
  enabled: boolean;
  threshold: number;
  duration: number;
  penaltyMultiplier: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratedRateLimiter {
  name: string;
  pattern: 'express' | 'fastify' | 'nestjs' | 'generic';
  backend: 'memory' | 'redis' | 'both';
  options: RateLimiterOptions;
  penaltyBox?: PenaltyBoxOptions;
  imports: string[];
  dependencies: string[];
  middlewareCode: string;
  usageExample: string;
  files: GeneratedFile[];
  mainFilePath: string;
}

/**
 * Service for generating rate limiting middleware for APIs.
 * Supports multiple backends (memory, Redis), sliding window counters,
 * and penalty strategies for abusive clients.
 */
export class RateLimiterGeneratorService {
  private static instance: RateLimiterGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RateLimiterGeneratorService {
    RateLimiterGeneratorService.instance ??= new RateLimiterGeneratorService();
    return RateLimiterGeneratorService.instance;
  }

  /**
   * Generates a rate limiter middleware based on user input
   */
  public async generateRateLimiter(
    workspacePath: string,
    config: RateLimiterGeneratorConfig,
  ): Promise<GeneratedRateLimiter | null> {
    // Get limiter name
    const limiterName = await this.getLimiterName(config);
    if (!limiterName) {
      return null;
    }

    // Get rate limit options
    const options = await this.getRateLimitOptions(config);
    if (!options) {
      return null;
    }

    // Get penalty box options if enabled
    let penaltyBox: PenaltyBoxOptions | undefined;
    if (config.penaltyBoxEnabled) {
      penaltyBox = await this.getPenaltyBoxOptions(config);
      if (!penaltyBox) {
        return null;
      }
    }

    // Generate imports
    const imports = this.generateImports(config, penaltyBox !== undefined);

    // Generate dependencies
    const dependencies = this.generateDependencies(config);

    // Generate middleware code
    const middlewareCode = this.generateMiddlewareCode(
      limiterName,
      options,
      penaltyBox,
      imports,
      config,
    );

    // Generate usage example
    const usageExample = this.generateUsageExample(limiterName, config);

    this.logger.info('Rate limiter generated', {
      name: limiterName,
      pattern: config.middlewarePattern,
      backend: config.backend,
    });

    // Determine output file path
    const outputDir = config.outputDirectory || 'src/middleware';
    const fileName = `${limiterName}.ts`;
    const mainFilePath = path.join(workspacePath, outputDir, fileName);

    // Create files array
    const files: GeneratedFile[] = [
      {
        path: mainFilePath,
        content: middlewareCode,
      },
    ];

    // Add usage example file if enabled
    if (config.includeJSDoc || config.includeTypeScript) {
      const examplePath = path.join(workspacePath, outputDir, `${limiterName}.example.ts`);
      files.push({
        path: examplePath,
        content: usageExample,
      });
    }

    return {
      name: limiterName,
      pattern: config.middlewarePattern,
      backend: config.backend,
      options,
      penaltyBox,
      imports,
      dependencies,
      middlewareCode,
      usageExample,
      files,
      mainFilePath,
    };
  }

  /**
   * Prompts user for rate limiter name
   */
  private async getLimiterName(
    config: RateLimiterGeneratorConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter rate limiter name (e.g., apiLimiter, authLimiter)',
      placeHolder: 'apiLimiter',
      value: config.defaultLimiterName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Limiter name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Limiter name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects rate limiting options from user
   */
  private async getRateLimitOptions(
    config: RateLimiterGeneratorConfig,
  ): Promise<RateLimiterOptions | undefined> {
    // Use defaults from config or prompt user
    const windowSizeInput = await vscode.window.showInputBox({
      prompt: 'Enter time window in milliseconds (e.g., 60000 for 1 minute)',
      placeHolder: '60000',
      value: config.windowSize.toString(),
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'Window size must be a positive number';
        }
        return null;
      },
    });

    if (!windowSizeInput) {
      return undefined;
    }

    const maxRequestsInput = await vscode.window.showInputBox({
      prompt: 'Enter maximum number of requests per window',
      placeHolder: '100',
      value: config.maxRequests.toString(),
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'Max requests must be a positive number';
        }
        return null;
      },
    });

    if (!maxRequestsInput) {
      return undefined;
    }

    const skipFailed = await this.promptBoolean(
      'Skip counting failed requests (4xx/5xx responses)?',
      config.skipFailedRequests,
    );

    const skipSuccessful = await this.promptBoolean(
      'Skip counting successful requests (2xx responses)?',
      config.skipSuccessfulRequests,
    );

    const headersEnabled = await this.promptBoolean(
      'Enable rate limit headers (X-RateLimit-*)?',
      true,
    );

    return {
      windowMs: parseInt(windowSizeInput, 10),
      maxRequests: parseInt(maxRequestsInput, 10),
      skipFailedRequests: skipFailed ?? config.skipFailedRequests,
      skipSuccessfulRequests: skipSuccessful ?? config.skipSuccessfulRequests,
      headersEnabled,
      keyGenerator: undefined,
      handler: undefined,
    };
  }

  /**
   * Collects penalty box options from user
   */
  private async getPenaltyBoxOptions(
    config: RateLimiterGeneratorConfig,
  ): Promise<PenaltyBoxOptions | undefined> {
    const thresholdInput = await vscode.window.showInputBox({
      prompt: 'Enter penalty box threshold (number of violations before penalty)',
      placeHolder: '5',
      value: '5',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'Threshold must be a positive number';
        }
        return null;
      },
    });

    if (!thresholdInput) {
      return undefined;
    }

    const durationInput = await vscode.window.showInputBox({
      prompt: 'Enter penalty duration in milliseconds',
      placeHolder: config.penaltyDuration.toString(),
      value: config.penaltyDuration.toString(),
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'Duration must be a positive number';
        }
        return null;
      },
    });

    if (!durationInput) {
      return undefined;
    }

    const multiplierInput = await vscode.window.showInputBox({
      prompt: 'Enter penalty multiplier (how much to increase wait time)',
      placeHolder: '2',
      value: '2',
      validateInput: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 1) {
          return 'Multiplier must be greater than 1';
        }
        return null;
      },
    });

    if (!multiplierInput) {
      return undefined;
    }

    return {
      enabled: true,
      threshold: parseInt(thresholdInput, 10),
      duration: parseInt(durationInput, 10),
      penaltyMultiplier: parseFloat(multiplierInput),
    };
  }

  /**
   * Generates import statements
   */
  private generateImports(
    config: RateLimiterGeneratorConfig,
    hasPenaltyBox: boolean,
  ): string[] {
    const imports: string[] = [];

    const ts = config.includeTypeScript;

    if (config.backend === 'memory') {
      imports.push(ts ? "import { rateLimit } from 'express-rate-limit';" : "const rateLimit = require('express-rate-limit');");
    } else if (config.backend === 'redis') {
      imports.push(ts ? "import { RedisStore } from 'rate-limit-redis';" : "const { RedisStore } = require('rate-limit-redis');");
      imports.push(ts ? "import { rateLimit } from 'express-rate-limit';" : "const rateLimit = require('express-rate-limit');");
      imports.push(ts ? "import Redis from 'ioredis';" : "const Redis = require('ioredis');");
    } else if (config.backend === 'both') {
      imports.push(ts ? "import { rateLimit } from 'express-rate-limit';" : "const rateLimit = require('express-rate-limit');");
      imports.push(ts ? "import { RedisStore } from 'rate-limit-redis';" : "const { RedisStore } = require('rate-limit-redis');");
      imports.push(ts ? "import Redis from 'ioredis';" : "const Redis = require('ioredis');");
    }

    if (config.middlewarePattern === 'nestjs') {
      imports.push(ts ? "import { Injectable, NestMiddleware } from '@nestjs/common';" : "const { Injectable, NestMiddleware } = require('@nestjs/common');");
      imports.push(ts ? "import { Request, Response, NextFunction } from 'express';" : "const { Request, Response, NextFunction } = require('express');");
    }

    if (hasPenaltyBox) {
      imports.push(ts ? "import { LRUCache } from 'lru-cache';" : "const { LRUCache } = require('lru-cache');");
    }

    return imports;
  }

  /**
   * Generates npm dependencies list
   */
  private generateDependencies(config: RateLimiterGeneratorConfig): string[] {
    const deps: string[] = ['express-rate-limit'];

    if (config.backend === 'redis' || config.backend === 'both') {
      deps.push('rate-limit-redis');
      deps.push('ioredis');
    }

    if (config.penaltyBoxEnabled) {
      deps.push('lru-cache');
    }

    return deps;
  }

  /**
   * Generates the rate limiter middleware code
   */
  private generateMiddlewareCode(
    limiterName: string,
    options: RateLimiterOptions,
    penaltyBox: PenaltyBoxOptions | undefined,
    imports: string[],
    config: RateLimiterGeneratorConfig,
  ): string {
    const ts = config.includeTypeScript;
    const jsDoc = config.includeJSDoc;
    const errorHandling = config.includeErrorHandling;

    let code = '';

    // Add imports
    code += imports.join('\n');
    code += '\n\n';

    // Add penalty box code if enabled
    if (penaltyBox) {
      code += this.generatePenaltyBoxCode(penaltyBox, ts, jsDoc);
      code += '\n\n';
    }

    // Generate the rate limiter based on pattern
    switch (config.middlewarePattern) {
      case 'express':
        code += this.generateExpressLimiter(limiterName, options, penaltyBox, ts, jsDoc, errorHandling, config);
        break;
      case 'fastify':
        code += this.generateFastifyLimiter(limiterName, options, penaltyBox, ts, jsDoc, errorHandling, config);
        break;
      case 'nestjs':
        code += this.generateNestJSLimiter(limiterName, options, penaltyBox, ts, jsDoc, errorHandling, config);
        break;
      case 'generic':
        code += this.generateGenericLimiter(limiterName, options, penaltyBox, ts, jsDoc, errorHandling, config);
        break;
    }

    return code;
  }

  /**
   * Generates penalty box code
   */
  private generatePenaltyBoxCode(
    penaltyBox: PenaltyBoxOptions,
    ts: boolean,
    jsDoc: boolean,
  ): string {
    let code = '';

    if (jsDoc) {
      code += `/**
 * Penalty box for tracking abusive clients
 * Tracks violations and applies penalties to repeat offenders
 */
`;
    }

    const penaltyBoxType = ts ? ': LRUCache<string, number>' : '';
    const cacheOptions = ts
      ? `{
      max: 10000,
      ttl: ${penaltyBox.duration},
    }`
      : `{
      max: 10000,
      ttl: ${penaltyBox.duration},
    }`;

    code += `const penaltyBox${ts ? '<string, number>' : ''} = new LRUCache${penaltyBoxType}(${cacheOptions});

`;

    if (jsDoc) {
      code += `/**
 * Checks if a client is in the penalty box
 * @param key - Client identifier
 * @returns Penalty count or 0 if not in penalty box
 */
`;
    }

    const functionType = ts ? '(key: string): number' : '';
    code += `export const checkPenaltyBox${functionType} = (key) => {
  const violations = penaltyBox.get(key) || 0;
  return violations;
};

`;

    if (jsDoc) {
      code += `/**
 * Adds a violation to the penalty box
 * @param key - Client identifier
 */
`;
    }

    code += `export const addToPenaltyBox${ts ? '(key: string): void' : ''} = (key) => {
  const current = penaltyBox.get(key) || 0;
  penaltyBox.set(key, current + 1);
};

`;

    if (jsDoc) {
      code += `/**
 * Resets the penalty box for a client
 * @param key - Client identifier
 */
`;
    }

    code += `export const resetPenaltyBox${ts ? '(key: string): void' : ''} = (key) => {
  penaltyBox.delete(key);
};
`;

    return code;
  }

  /**
   * Generates Express-style rate limiter
   */
  private generateExpressLimiter(
    limiterName: string,
    options: RateLimiterOptions,
    penaltyBox: PenaltyBoxOptions | undefined,
    ts: boolean,
    jsDoc: boolean,
    errorHandling: boolean,
    config: RateLimiterGeneratorConfig,
  ): string {
    let code = '';

    if (jsDoc) {
      code += `/**
 * Rate limiter middleware for Express
 * Limits requests based on IP address and custom key generator
 * @windowMs - Time window in milliseconds
 * @max - Maximum requests per window
 */
`;
    }

    const limiterOptions = this.getLimiterOptionsCode(options, penaltyBox, ts, config);

    if (config.backend === 'memory') {
      code += `export const ${limiterName} = rateLimit(${limiterOptions});`;
    } else if (config.backend === 'redis' || config.backend === 'both') {
      code += `// Redis client initialization
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

${ts ? 'const store: RedisStore = ' : 'const store = '}'new RedisStore({
  client: redis,
  prefix: 'rate-limit:',
  sendCommands: true,
});

export const ${limiterName} = rateLimit({
  ...${limiterOptions},
  store,
});`;
    }

    return code;
  }

  /**
   * Generates Fastify-style rate limiter
   */
  private generateFastifyLimiter(
    limiterName: string,
    options: RateLimiterOptions,
    penaltyBox: PenaltyBoxOptions | undefined,
    ts: boolean,
    jsDoc: boolean,
    errorHandling: boolean,
    config: RateLimiterGeneratorConfig,
  ): string {
    let code = '';

    if (jsDoc) {
      code += `/**
 * Rate limiter plugin for Fastify
 * Limits requests based on IP address with sliding window counter
 */
`;
    }

    code += `export const ${limiterName}Plugin = async (fastify${ts ? ': any' : ''}, opts${ts ? ': any' : ''}) => {
  const windows${ts ? ': Map<string, {count: number; resetTime: number}>' : ''} = new Map();

  fastify.addHook('onRequest', async (request${ts ? ': any' : ''}, reply${ts ? ': any' : ''}) => {
    const key = request.ip || request.socket.remoteAddress;
    const now = Date.now();

    // Check penalty box first
    ${penaltyBox ? `const violations = checkPenaltyBox(key);
    if (violations >= ${penaltyBox.threshold}) {
      return reply.code(429).send({
        error: 'Too many requests - temporarily blocked due to repeated violations',
        retryAfter: Math.ceil(${penaltyBox.duration} / 1000),
      });
    }` : ''}

    // Get or create window
    let window = windows.get(key);

    if (!window || now > window.resetTime) {
      window = { count: 0, resetTime: now + ${options.windowMs} };
      windows.set(key, window);
    }

    // Increment counter
    window.count++;

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', '${options.maxRequests}');
    reply.header('X-RateLimit-Remaining', Math.max(0, ${options.maxRequests} - window.count));
    reply.header('X-RateLimit-Reset', new Date(window.resetTime).toISOString());

    // Check if limit exceeded
    if (window.count > ${options.maxRequests}) {
      ${penaltyBox ? `addToPenaltyBox(key);` : ''}
      return reply.code(429).send({
        error: 'Too many requests',
        retryAfter: Math.ceil((window.resetTime - now) / 1000),
      });
    }
  });
};
`;

    return code;
  }

  /**
   * Generates NestJS-style rate limiter
   */
  private generateNestJSLimiter(
    limiterName: string,
    options: RateLimiterOptions,
    penaltyBox: PenaltyBoxOptions | undefined,
    ts: boolean,
    jsDoc: boolean,
    errorHandling: boolean,
    config: RateLimiterGeneratorConfig,
  ): string {
    let code = '';

    if (jsDoc) {
      code += `/**
 * Rate limiter middleware for NestJS
 * Injectable service that implements NestMiddleware interface
 */
`;
    }

    code += `@Injectable()
export class ${this.pascalCase(limiterName)} implements NestMiddleware {
  private readonly windows${ts ? `: Map<string, {count: number; resetTime: number}>` : ''} = new Map();

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    // Check penalty box first
    ${penaltyBox ? `const violations = checkPenaltyBox(key);
    if (violations >= ${penaltyBox.threshold}) {
      return res.status(429).json({
        error: 'Too many requests - temporarily blocked due to repeated violations',
        retryAfter: Math.ceil(${penaltyBox.duration} / 1000),
      });
    }` : ''}

    // Get or create window
    let window = this.windows.get(key);

    if (!window || now > window.resetTime) {
      window = { count: 0, resetTime: now + ${options.windowMs} };
      this.windows.set(key, window);
    }

    // Increment counter
    window.count++;

    // Skip based on response status
    ${options.skipFailedRequests ? `res.on('finish', () => {
      if (res.statusCode >= 400) {
        window.count--;
      }
    });` : ''}

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', '${options.maxRequests}');
    res.setHeader('X-RateLimit-Remaining', Math.max(0, ${options.maxRequests} - window.count));
    res.setHeader('X-RateLimit-Reset', new Date(window.resetTime).toISOString());

    // Check if limit exceeded
    if (window.count > ${options.maxRequests}) {
      ${penaltyBox ? `addToPenaltyBox(key);` : ''}
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((window.resetTime - now) / 1000),
      });
    }

    next();
  }
}
`;

    return code;
  }

  /**
   * Generates generic rate limiter
   */
  private generateGenericLimiter(
    limiterName: string,
    options: RateLimiterOptions,
    penaltyBox: PenaltyBoxOptions | undefined,
    ts: boolean,
    jsDoc: boolean,
    errorHandling: boolean,
    config: RateLimiterGeneratorConfig,
  ): string {
    let code = '';

    if (jsDoc) {
      code += `/**
 * Generic rate limiter class
 * Can be used with any HTTP framework or standalone
 */
`;
    }

    const typeImports = ts ? `<T = any>` : '';

    code += `export class ${this.pascalCase(limiterName)}${typeImports} {
  private windows${ts ? `: Map<string, {count: number; resetTime: number}>` : ''} = new Map();

  constructor(private options${ts ? ': RateLimiterOptions' : ''} = {}${ts ? ': RateLimiterOptions' : ''}) {}

  /**
   * Checks if a request should be rate limited
   * @param key - Unique identifier for the client (e.g., IP, API key)
   * @returns true if request should be allowed, false if rate limited
   */
  checkLimit(key: string)${ts ? ': boolean' : ''} {
    const now = Date.now();

    // Check penalty box first
    ${penaltyBox ? `const violations = checkPenaltyBox(key);
    if (violations >= ${penaltyBox.threshold}) {
      return false;
    }` : ''}

    // Get or create window
    let window = this.windows.get(key);

    if (!window || now > window.resetTime) {
      window = { count: 0, resetTime: now + ${options.windowMs} };
      this.windows.set(key, window);
    }

    // Increment counter
    window.count++;

    // Check if limit exceeded
    if (window.count > ${options.maxRequests}) {
      ${penaltyBox ? `addToPenaltyBox(key);` : ''}
      return false;
    }

    return true;
  }

  /**
   * Gets rate limit information for a client
   * @param key - Unique identifier for the client
   * @returns Rate limit info
   */
  getLimitInfo(key: string)${ts ? ': {limit: number; remaining: number; resetAt: Date}' : ''} {
    const window = this.windows.get(key);
    const remaining = window ? Math.max(0, ${options.maxRequests} - window.count) : ${options.maxRequests};
    const resetAt = window ? new Date(window.resetTime) : new Date(Date.now() + ${options.windowMs});

    return {
      limit: ${options.maxRequests},
      remaining,
      resetAt,
    };
  }

  /**
   * Resets the rate limit for a client
   * @param key - Unique identifier for the client
   */
  resetLimit(key: string)${ts ? ': void' : ': string'} {
    this.windows.delete(key);
    ${penaltyBox ? `resetPenaltyBox(key);` : ''}
  }
}
`;

    return code;
  }

  /**
   * Generates the options object code
   */
  private getLimiterOptionsCode(
    options: RateLimiterOptions,
    penaltyBox: PenaltyBoxOptions | undefined,
    ts: boolean,
    config: RateLimiterGeneratorConfig,
  ): string {
    const parts: string[] = [];

    parts.push(`windowMs: ${options.windowMs}`);
    parts.push(`max: ${options.maxRequests}`);

    if (config.slidingWindow) {
      parts.push(`standardHeaders: true`);
      parts.push(`legacyHeaders: false`);
    }

    if (options.skipFailedRequests) {
      parts.push(`skipFailedRequests: true`);
    }

    if (options.skipSuccessfulRequests) {
      parts.push(`skipSuccessfulRequests: true`);
    }

    if (penaltyBox) {
      const handlerCode = `handler: (req, res) => {
        const key = req.ip || req.socket.remoteAddress;
        addToPenaltyBox(key);
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.round(${options.windowMs} / 1000),
          message: 'Rate limit exceeded. Try again in ' + Math.round((${options.windowMs}) / 1000) + ' seconds',
        });
      }`;
      parts.push(handlerCode);
    }

    return `{\n    ${parts.join(',\n    ')}\n  }`;
  }

  /**
   * Generates usage example
   */
  private generateUsageExample(limiterName: string, config: RateLimiterGeneratorConfig): string {
    let example = '';

    switch (config.middlewarePattern) {
      case 'express':
        example = `// Usage in Express app
import express from 'express';
import { ${limiterName} } from './${config.outputDirectory}/${limiterName}';

const app = express();

// Apply rate limiter to all routes
app.use(${limiterName});

// Or apply to specific routes
app.use('/api', ${limiterName});

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

app.listen(3000);`;
        break;

      case 'fastify':
        example = `// Usage in Fastify app
import Fastify from 'fastify';
import { ${limiterName}Plugin } from './${config.outputDirectory}/${limiterName}';

const fastify = Fastify({ logger: true });

// Register rate limiter plugin
fastify.register(${limiterName}Plugin);

fastify.get('/api/data', async (request, reply) => {
  return { message: 'Hello, world!' };
});

fastify.listen({ port: 3000 });`;
        break;

      case 'nestjs':
        example = `// Usage in NestJS module
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ${this.pascalCase(limiterName)} } from './${config.outputDirectory}/${limiterName}';

@Module({
  // ... your module configuration
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(${this.pascalCase(limiterName)})
      .forRoutes('*'); // Apply to all routes
      // Or specific routes: .forRoutes({ path: 'api/*', method: RequestMethod.ALL });
  }
}`;
        break;

      case 'generic':
        example = `// Generic usage
import { ${this.pascalCase(limiterName)} } from './${config.outputDirectory}/${limiterName}';

const limiter = new ${this.pascalCase(limiterName)}();

// In your request handler
function handleRequest(req, res) {
  const clientId = req.ip || req.socket.remoteAddress;

  if (!limiter.checkLimit(clientId)) {
    const info = limiter.getLimitInfo(clientId);
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((info.resetAt.getTime() - Date.now()) / 1000),
    });
  }

  // Process request
  res.json({ message: 'Success' });
}`;
        break;
    }

    return example;
  }

  /**
   * Helper method to prompt user for boolean input
   */
  private async promptBoolean(
    prompt: string,
    defaultValue: boolean,
  ): Promise<boolean | undefined> {
    const result = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: `${prompt} (default: ${defaultValue ? 'Yes' : 'No'})`,
    });

    if (result === undefined) {
      return defaultValue;
    }

    return result === 'Yes';
  }

  /**
   * Converts string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase());
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
   * Checks if a file exists
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a file with the given content
   */
  public async createFile(filePath: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
  }
}
