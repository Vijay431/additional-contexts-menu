import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ApiCacheMiddlewareConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeETag: boolean;
  includeStaleWhileRevalidate: boolean;
  includeCacheControl: boolean;
  includeVaryHeader: boolean;
  defaultTTL: number;
  staleTTL: number;
  sharedCacheMaxAge: number;
  privateCacheMaxAge: number;
  defaultCachePolicy: 'public' | 'private' | 'no-cache' | 'no-store';
  middlewareName: string;
  outputDirectory: string;
  generateInvalidationHelper: boolean;
  includeKeyGenerator: boolean;
  includeMetrics: boolean;
}

export interface CacheMiddlewareOptions {
  name: string;
  includeTypeScript: boolean;
  includeETag: boolean;
  includeStaleWhileRevalidate: boolean;
  includeCacheControl: boolean;
  includeVaryHeader: boolean;
  defaultTTL: number;
  staleTTL: number;
  sharedCacheMaxAge: number;
  privateCacheMaxAge: number;
  defaultCachePolicy: 'public' | 'private' | 'no-cache' | 'no-store';
  generateInvalidationHelper: boolean;
  includeKeyGenerator: boolean;
  includeMetrics: boolean;
}

export interface CacheRule {
  path: string;
  methods: string[];
  ttl: number;
  policy: 'public' | 'private' | 'no-cache' | 'no-store';
  varyBy?: string[];
  staleWhileRevalidate?: boolean;
  staleTTL?: number;
  description?: string;
}

export interface GeneratedCacheMiddleware {
  name: string;
  middlewareCode: string;
  invalidationHelperCode?: string;
  keyGeneratorCode?: string;
  metricsCode?: string;
  typesCode?: string;
  filePath: string;
  imports: string[];
}

/**
 * Service for generating HTTP caching middleware for APIs
 * Generates cache headers, ETag support, stale-while-revalidate, and cache invalidation logic
 */
export class ApiCacheMiddlewareService {
  private static instance: ApiCacheMiddlewareService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ApiCacheMiddlewareService {
    ApiCacheMiddlewareService.instance ??= new ApiCacheMiddlewareService();
    return ApiCacheMiddlewareService.instance;
  }

  /**
   * Generates API cache middleware based on user input
   */
  public async generateCacheMiddleware(
    workspacePath: string,
    config: ApiCacheMiddlewareConfig,
  ): Promise<GeneratedCacheMiddleware | null> {
    // Get middleware name
    const middlewareName = await this.getMiddlewareName(config);
    if (!middlewareName) {
      return null;
    }

    // Collect cache rules
    const rules = await this.collectCacheRules();
    if (!rules || rules.length === 0) {
      vscode.window.showWarningMessage('No cache rules defined. Middleware generation cancelled.');
      return null;
    }

    const options: CacheMiddlewareOptions = {
      name: middlewareName,
      includeTypeScript: config.includeTypeScript,
      includeETag: config.includeETag,
      includeStaleWhileRevalidate: config.includeStaleWhileRevalidate,
      includeCacheControl: config.includeCacheControl,
      includeVaryHeader: config.includeVaryHeader,
      defaultTTL: config.defaultTTL,
      staleTTL: config.staleTTL,
      sharedCacheMaxAge: config.sharedCacheMaxAge,
      privateCacheMaxAge: config.privateCacheMaxAge,
      defaultCachePolicy: config.defaultCachePolicy,
      generateInvalidationHelper: config.generateInvalidationHelper,
      includeKeyGenerator: config.includeKeyGenerator,
      includeMetrics: config.includeMetrics,
    };

    // Generate imports
    const imports = this.generateImports(options);

    // Generate types if TypeScript
    const typesCode = config.includeTypeScript ? this.generateTypesCode(options) : '';

    // Generate middleware code
    const middlewareCode = this.generateMiddlewareCode(rules, options);

    // Generate optional helpers
    const invalidationHelperCode = config.generateInvalidationHelper
      ? this.generateInvalidationHelper(options)
      : '';
    const keyGeneratorCode = config.includeKeyGenerator ? this.generateKeyGenerator(options) : '';
    const metricsCode = config.includeMetrics ? this.generateMetrics(options) : '';

    // Determine file path
    const fileName = this.kebabCase(middlewareName);
    const filePath = path.join(workspacePath, config.outputDirectory, `${fileName}.ts`);

    this.logger.info('API cache middleware generated', {
      name: middlewareName,
      rules: rules.length,
      includeETag: config.includeETag,
      includeStaleWhileRevalidate: config.includeStaleWhileRevalidate,
    });

    return {
      name: middlewareName,
      middlewareCode,
      invalidationHelperCode,
      keyGeneratorCode,
      metricsCode,
      typesCode,
      filePath,
      imports,
    };
  }

  /**
   * Gets middleware name from user
   */
  private async getMiddlewareName(
    config: ApiCacheMiddlewareConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter cache middleware name (e.g., cache, apiCache)',
      placeHolder: 'cache',
      value: config.middlewareName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Middleware name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Middleware name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects cache rules through interactive selection
   */
  private async collectCacheRules(): Promise<CacheRule[] | null> {
    const rules: CacheRule[] = [];

    let addMore = true;
    while (addMore) {
      const rule = await this.createCacheRule(rules.length);
      if (rule) {
        rules.push(rule);
      }

      if (rules.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another rule', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another cache rule or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return rules.length > 0 ? rules : null;
  }

  /**
   * Creates a single cache rule through user interaction
   */
  private async createCacheRule(index: number): Promise<CacheRule | null> {
    // Get path pattern
    const pathInput = await vscode.window.showInputBox({
      prompt: 'Enter route path pattern (e.g., /api/users, /api/products/*)',
      placeHolder: index === 0 ? '/api/*' : '/api/resources',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Path cannot be empty';
        }
        return null;
      },
    });

    if (!pathInput) {
      return null;
    }

    // Select HTTP methods
    const methodsChoice = await vscode.window.showQuickPick(
      [
        { label: 'GET only', value: ['GET'], description: 'Cache only GET requests' },
        { label: 'GET and HEAD', value: ['GET', 'HEAD'], description: 'Cache GET and HEAD requests' },
        { label: 'All safe methods', value: ['GET', 'HEAD', 'OPTIONS'], description: 'Cache GET, HEAD, and OPTIONS' },
      ],
      { placeHolder: 'Select which HTTP methods to cache' },
    );

    if (!methodsChoice) {
      return null;
    }

    // Select cache policy
    const policyChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'public',
          value: 'public' as const,
          description: 'Cacheable by both public and private caches',
        },
        {
          label: 'private',
          value: 'private' as const,
          description: 'Cacheable only by private caches (e.g., browser)',
        },
        {
          label: 'no-cache',
          value: 'no-cache' as const,
          description: 'Must revalidate before using cached content',
        },
        {
          label: 'no-store',
          value: 'no-store' as const,
          description: 'Do not cache any part of the request',
        },
      ],
      { placeHolder: 'Select cache policy' },
    );

    if (!policyChoice) {
      return null;
    }

    // Get TTL
    const ttlInput = await vscode.window.showInputBox({
      prompt: 'Enter TTL in seconds (e.g., 300 = 5 minutes, 3600 = 1 hour)',
      placeHolder: '300',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          return 'TTL must be a positive number';
        }
        return null;
      },
    });

    const ttl = ttlInput ? Number.parseInt(ttlInput, 10) : 300;

    // Ask for stale-while-revalidate
    const staleChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true, description: 'Serve stale content while revalidating in background' },
        { label: 'No', value: false, description: 'Do not use stale-while-revalidate' },
      ],
      { placeHolder: 'Enable stale-while-revalidate?' },
    );

    const staleWhileRevalidate = staleChoice?.value ?? false;
    let staleTTL: number | undefined;

    if (staleWhileRevalidate) {
      const staleTtlInput = await vscode.window.showInputBox({
        prompt: 'Enter stale TTL in seconds (how long to serve stale content)',
        placeHolder: '86400',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (isNaN(num) || num < 0) {
            return 'Stale TTL must be a positive number';
          }
          return null;
        },
      });
      staleTTL = staleTtlInput ? Number.parseInt(staleTtlInput, 10) : 86400;
    }

    // Ask for Vary header
    const varyChoice = await vscode.window.showQuickPick(
      [
        { label: 'No Vary header', value: undefined },
        { label: 'Vary: Accept-Encoding', value: ['Accept-Encoding'] },
        { label: 'Vary: Accept, Accept-Encoding', value: ['Accept', 'Accept-Encoding'] },
        { label: 'Vary: Authorization', value: ['Authorization'] },
        { label: 'Custom Vary headers', value: 'custom' },
      ],
      { placeHolder: 'Select Vary header configuration' },
    );

    let varyBy: string[] | undefined;
    if (varyChoice?.value === 'custom') {
      const customVary = await vscode.window.showInputBox({
        prompt: 'Enter comma-separated header names for Vary',
        placeHolder: 'Accept, Accept-Encoding, Accept-Language',
      });
      if (customVary) {
        varyBy = customVary.split(',').map((h) => h.trim());
      }
    } else if (varyChoice?.value && typeof varyChoice.value !== 'string') {
      varyBy = varyChoice.value;
    }

    return {
      path: pathInput.trim(),
      methods: methodsChoice.value,
      ttl,
      policy: policyChoice.value,
      ...(varyBy && { varyBy }),
      ...(staleWhileRevalidate !== undefined && { staleWhileRevalidate }),
      ...(staleTTL !== undefined && { staleTTL }),
      description: `${methodsChoice.value.join(', ')} ${pathInput.trim()}`,
    };
  }

  /**
   * Generates imports based on options
   */
  private generateImports(options: CacheMiddlewareOptions): string[] {
    const imports: string[] = [];

    if (options.includeTypeScript) {
      imports.push("import { Request, Response, NextFunction } from 'express';");
      if (options.includeETag) {
        imports.push("import { createHash } from 'crypto';");
      }
    } else {
      if (options.includeETag) {
        imports.push("const { createHash } = require('crypto');");
      }
    }

    if (options.includeMetrics) {
      if (options.includeTypeScript) {
        imports.push("import { EventEmitter } from 'events';");
      } else {
        imports.push("const { EventEmitter } = require('events');");
      }
    }

    return imports;
  }

  /**
   * Generates TypeScript types
   */
  private generateTypesCode(options: CacheMiddlewareOptions): string {
    let code = '\n// Types\n';

    code += `interface CacheOptions {\n`;
    code += `  ttl?: number;\n`;
    code += `  policy?: 'public' | 'private' | 'no-cache' | 'no-store';\n`;
    if (options.includeStaleWhileRevalidate) {
      code += `  staleWhileRevalidate?: boolean;\n`;
      code += `  staleTTL?: number;\n`;
    }
    if (options.includeVaryHeader) {
      code += `  varyBy?: string[];\n`;
    }
    code += `  skipCache?: boolean;\n`;
    code += `}\n\n`;

    code += `interface CacheRule {\n`;
    code += `  path: string | RegExp;\n`;
    code += `  methods: string[];\n`;
    code += `  ttl: number;\n`;
    code += `  policy: 'public' | 'private' | 'no-cache' | 'no-store';\n`;
    if (options.includeVaryHeader) {
      code += `  varyBy?: string[];\n`;
    }
    if (options.includeStaleWhileRevalidate) {
      code += `  staleWhileRevalidate?: boolean;\n`;
      code += `  staleTTL?: number;\n`;
    }
    code += `  description?: string;\n`;
    code += `}\n\n`;

    if (options.includeMetrics) {
      code += `interface CacheMetrics {\n`;
      code += `  hits: number;\n`;
      code += `  misses: number;\n`;
      code += `  staleHits: number;\n`;
      code += `  bypasses: number;\n`;
      code += `  evictions: number;\n`;
      code += `  hitRate: number;\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates the middleware code
   */
  private generateMiddlewareCode(rules: CacheRule[], options: CacheMiddlewareOptions): string {
    let code = '';

    // Add cache rules array
    code += `// Cache rules configuration\n`;
    code += `const cacheRules: CacheRule[] = [\n`;
    for (const rule of rules) {
      const pathPattern = rule.path.includes('*')
        ? `new RegExp('^${rule.path.replace(/\*/g, '.*')}$')`
        : `'${rule.path}'`;
      code += `  {\n`;
      code += `    path: ${pathPattern},\n`;
      code += `    methods: [${rule.methods.map((m) => `'${m}'`).join(', ')}],\n`;
      code += `    ttl: ${rule.ttl},\n`;
      code += `    policy: '${rule.policy}',\n`;
      if (rule.varyBy && rule.varyBy.length > 0) {
        code += `    varyBy: [${rule.varyBy.map((v) => `'${v}'`).join(', ')}],\n`;
      }
      if (rule.staleWhileRevalidate) {
        code += `    staleWhileRevalidate: true,\n`;
        code += `    staleTTL: ${rule.staleTTL || options.staleTTL},\n`;
      }
      code += `    description: '${rule.description}',\n`;
      code += `  },\n`;
    }
    code += `];\n\n`;

    // Generate cache store (in-memory)
    code += `// In-memory cache store\n`;
    code += `const cacheStore = new Map<string, { data: string; headers: Record<string, string>; timestamp: number; etag?: string }>();\n\n`;

    if (options.includeMetrics) {
      code += `// Cache metrics\n`;
      code += `const metrics = {\n`;
      code += `  hits: 0,\n`;
      code += `  misses: 0,\n`;
      code += `  staleHits: 0,\n`;
      code += `  bypasses: 0,\n`;
      code += `  evictions: 0,\n`;
      code += `};\n\n`;
    }

    // Generate cache key function
    if (options.includeKeyGenerator) {
      code += `/**\n`;
      code += ` * Generates a cache key for the request\n`;
      code += ` */\n`;
      if (options.includeTypeScript) {
        code += `function generateCacheKey(req: Request): string {\n`;
      } else {
        code += `function generateCacheKey(req) {\n`;
      }
      code += `  const url = req.originalUrl || req.url;\n`;
      code += `  const method = req.method;\n`;
      code += `  return createHash('sha256')\n`;
      code += `    .update(\`\${method}:\${url}\`)\n`;
      code += `    .digest('hex');\n`;
      code += `}\n\n`;
    }

    // Generate ETag function
    if (options.includeETag) {
      code += `/**\n`;
      code += ` * Generates an ETag for the response body\n`;
      code += ` */\n`;
      if (options.includeTypeScript) {
        code += `function generateETag(body: string): string {\n`;
      } else {
        code += `function generateETag(body) {\n`;
      }
      code += `  return ${options.includeTypeScript ? `createHash` : `createHash`}('sha256')\n`;
      code += `    .update(body)\n`;
      code += `    .digest('hex');\n`;
      code += `}\n\n`;
    }

    // Generate find rule function
    code += `/**\n`;
    code += ` * Finds matching cache rule for the request\n`;
    code += ` */\n`;
    if (options.includeTypeScript) {
      code += `function findCacheRule(req: Request): CacheRule | null {\n`;
    } else {
      code += `function findCacheRule(req) {\n`;
    }
    code += `  for (const rule of cacheRules) {\n`;
    code += `    if (!rule.methods.includes(req.method)) {\n`;
    code += `      continue;\n`;
    code += `    }\n`;
    code += `    const matches = typeof rule.path === 'string'\n`;
    code += `      ? req.path === rule.path\n`;
    code += `      : rule.path.test(req.path);\n`;
    code += `    if (matches) {\n`;
    code += `      return rule;\n`;
    code += `    }\n`;
    code += `  }\n`;
    code += `  return null;\n`;
    code += `}\n\n`;

    // Generate Cache-Control header function
    if (options.includeCacheControl) {
      code += `/**\n`;
      code += ` * Generates Cache-Control header value\n`;
      code += ` */\n`;
      if (options.includeTypeScript) {
        code += `function generateCacheControl(rule: CacheRule): string {\n`;
      } else {
        code += `function generateCacheControl(rule) {\n`;
      }
      code += `  const directives: string[] = [];\n`;
      code += `  directives.push(rule.policy);\n`;
      code += `  directives.push(\`max-age=\${rule.ttl}\`);\n\n`;
      if (options.includeStaleWhileRevalidate) {
        code += `  if (rule.staleWhileRevalidate && rule.staleTTL) {\n`;
        code += `    directives.push(\`stale-while-revalidate=\${rule.staleTTL}\`);\n`;
        code += `    directives.push(\`stale-if-error=\${rule.staleTTL}\`);\n`;
        code += `  }\n\n`;
      }
      code += `  if (rule.policy === 'private') {\n`;
      code += `    directives.push('immutable');\n`;
      code += `  }\n\n`;
      code += `  return directives.join(', ');\n`;
      code += `}\n\n`;
    }

    // Main middleware function
    code += `/**\n`;
    code += ` * Cache middleware\n`;
    code += ` */\n`;
    if (options.includeTypeScript) {
      code += `export function ${this.camelCase(options.name)}Middleware(`;
      code += `req: Request, res: Response, next: NextFunction`;
      code += `): void {\n`;
    } else {
      code += `module.exports = function ${this.camelCase(options.name)}Middleware(req, res, next) {\n`;
    }

    code += `  const rule = findCacheRule(req);\n`;
    code += `  if (!rule) {\n`;
    if (options.includeMetrics) {
      code += `    metrics.bypasses++;\n`;
    }
    code += `    return next();\n`;
    code += `  }\n\n`;

    // Check for no-cache policies
    code += `  if (rule.policy === 'no-store') {\n`;
    if (options.includeCacheControl) {
      code += `    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');\n`;
    }
    if (options.includeMetrics) {
      code += `    metrics.bypasses++;\n`;
    }
    code += `    return next();\n`;
    code += `  }\n\n`;

    // Generate cache key
    const cacheKeyVar = options.includeKeyGenerator
      ? `const cacheKey = generateCacheKey(req);`
      : `const cacheKey = req.path;`;
    code += `  ${cacheKeyVar}\n\n`;

    // Check for If-None-Match header (ETag support)
    if (options.includeETag) {
      code += `  // Check ETag for conditional requests\n`;
      code += `  const cachedItem = cacheStore.get(cacheKey);\n`;
      code += `  const ifNoneMatch = req.get('If-None-Match');\n\n`;
      code += `  if (cachedItem && ifNoneMatch && cachedItem.etag === ifNoneMatch) {\n`;
      if (options.includeMetrics) {
        code += `    metrics.hits++;\n`;
      }
      code += `    return res.status(304).end();\n`;
      code += `  }\n\n`;
    }

    // Check cache with stale-while-revalidate
    if (options.includeStaleWhileRevalidate) {
      code += `  // Check for stale content while revalidating\n`;
      code += `  const now = Date.now();\n`;
      code += `  const item = cacheStore.get(cacheKey);\n\n`;
      code += `  if (item && rule.staleWhileRevalidate && rule.staleTTL) {\n`;
      code += `    const age = (now - item.timestamp) / 1000;\n`;
      code += `    const isFresh = age < rule.ttl;\n`;
      code += `    const isStale = age >= rule.ttl && age < rule.ttl + rule.staleTTL;\n\n`;
      code += `    if (isFresh || isStale) {\n`;
      code += `      // Serve cached content\n`;
      if (options.includeMetrics) {
        code += `      if (isStale) metrics.staleHits++;\n`;
        code += `      metrics.hits++;\n`;
      }
      code += `      if (item.etag) res.setHeader('ETag', item.etag);\n`;
      if (options.includeCacheControl) {
        code += `      res.setHeader('Cache-Control', generateCacheControl(rule));\n`;
      }
      code += `      Object.entries(item.headers).forEach(([key, value]) => {\n`;
      code += `        res.setHeader(key, value);\n`;
      code += `      });\n\n`;
      code += `      if (isStale) {\n`;
      code += `        // Revalidate in background\n`;
      code += `        setImmediate(() => {\n`;
      code += `          // Trigger revalidation by calling next with a flag\n`;
      code += `          req.headers['x-cache-revalidate'] = cacheKey;\n`;
      code += `          next();\n`;
      code += `        });\n`;
      code += `      }\n\n`;
      code += `      return res.send(item.data);\n`;
      code += `    }\n`;
      code += `  }\n`;
    } else {
      // Simple cache check
      code += `  // Check cache\n`;
      code += `  const item = cacheStore.get(cacheKey);\n`;
      code += `  if (item) {\n`;
      if (options.includeMetrics) {
        code += `    metrics.hits++;\n`;
      }
      code += `    if (item.etag) res.setHeader('ETag', item.etag);\n`;
      if (options.includeCacheControl) {
        code += `    res.setHeader('Cache-Control', generateCacheControl(rule));\n`;
      }
      code += `    Object.entries(item.headers).forEach(([key, value]) => {\n`;
      code += `      res.setHeader(key, value);\n`;
      code += `    });\n`;
      code += `    return res.send(item.data);\n`;
      code += `  }\n`;
    }

    code += `\n`;
    if (options.includeMetrics) {
      code += `  metrics.misses++;\n`;
    }
    code += `  next();\n`;
    code += `};\n\n`;

    // Cache response interceptor
    code += `/**\n`;
    code += ` * Cache response interceptor - must be used after routes\n`;
    code += ` */\n`;
    if (options.includeTypeScript) {
      code += `export function ${this.camelCase(options.name)}ResponseInterceptor(`;
      code += `req: Request, res: Response, next: NextFunction`;
      code += `): void {\n`;
    } else {
      code += `module.exports.${this.camelCase(options.name)}ResponseInterceptor = function(req, res, next) {\n`;
    }
    code += `  const rule = findCacheRule(req);\n`;
    code += `  if (!rule || rule.policy === 'no-store') {\n`;
    code += `    return next();\n`;
    code += `  }\n\n`;

    const cacheKeyVar2 = options.includeKeyGenerator
      ? `const cacheKey = generateCacheKey(req);`
      : `const cacheKey = req.path;`;
    code += `  ${cacheKeyVar2}\n\n`;

    code += `  // Store original send\n`;
    code += `  const originalSend = res.send;\n\n`;

    code += `  res.send = function(this: Response, body: any) {\n`;
    code += `    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);\n\n`;
    if (options.includeETag) {
      code += `    // Generate ETag\n`;
      code += `    const etag = generateETag(bodyStr);\n`;
      code += `    res.setHeader('ETag', etag);\n`;
    }
    if (options.includeCacheControl) {
      code += `    res.setHeader('Cache-Control', generateCacheControl(rule));\n`;
    }
    if (options.includeVaryHeader && rules.some((r) => r.varyBy && r.varyBy.length > 0)) {
      code += `    if (rule.varyBy && rule.varyBy.length > 0) {\n`;
      code += `      res.setHeader('Vary', rule.varyBy.join(', '));\n`;
      code += `    }\n`;
    }

    code += `    // Store in cache\n`;
    code += `    const headers: Record<string, string> = {};\n`;
    code += `    const cacheHeaders = ['Cache-Control', 'ETag', 'Vary', 'Content-Type', 'Content-Encoding'];\n`;
    code += `    cacheHeaders.forEach(header => {\n`;
    code += `      const value = res.getHeader(header);\n`;
    code += `      if (value) headers[header] = String(value);\n`;
    code += `    });\n\n`;

    code += `    cacheStore.set(cacheKey, {\n`;
    code += `      data: bodyStr,\n`;
    code += `      headers,\n`;
    code += `      timestamp: Date.now(),\n`;
    if (options.includeETag) {
      code += `      etag,\n`;
    }
    code += `    });\n\n`;

    code += `    return originalSend.call(this, body);\n`;
    code += `  };\n\n`;

    code += `  next();\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates cache invalidation helper
   */
  private generateInvalidationHelper(options: CacheMiddlewareOptions): string {
    let code = `\n// Cache Invalidation Helper\n\n`;

    code += `/**\n`;
    code += ` * Cache invalidation helper functions\n`;
    code += ` */\n`;
    if (options.includeTypeScript) {
      code += `export class ${this.pascalCase(options.name)}Invalidation {\n\n`;
    } else {
      code += `class ${this.pascalCase(options.name)}Invalidation {\n\n`;
    }

    code += `  /**\n`;
    code += `   * Invalidate cache by pattern\n`;
    code += `   */\n`;
    if (options.includeTypeScript) {
      code += `  static invalidatePattern(pattern: string | RegExp): number {\n`;
    } else {
      code += `  static invalidatePattern(pattern) {\n`;
    }
    code += `    let count = 0;\n`;
    code += `    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;\n\n`;
    code += `    for (const key of cacheStore.keys()) {\n`;
    code += `      if (regex.test(key)) {\n`;
    code += `        cacheStore.delete(key);\n`;
    code += `        count++;\n`;
    if (options.includeMetrics) {
      code += `        metrics.evictions++;\n`;
    }
    code += `      }\n`;
    code += `    }\n\n`;
    code += `    return count;\n`;
    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Invalidate cache by tags (if you implement tag-based caching)\n`;
    code += `   */\n`;
    if (options.includeTypeScript) {
      code += `  static invalidateByTag(tag: string): number {\n`;
    } else {
      code += `  static invalidateByTag(tag) {\n`;
    }
    code += `    // Implementation depends on how you store tags\n`;
    code += `    // This is a placeholder for tag-based invalidation\n`;
    code += `    return 0;\n`;
    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Clear all cache\n`;
    code += `   */\n`;
    if (options.includeTypeScript) {
      code += `  static clearAll(): number {\n`;
    } else {
      code += `  static clearAll() {\n`;
    }
    code += `    const count = cacheStore.size;\n`;
    code += `    cacheStore.clear();\n`;
    if (options.includeMetrics) {
      code += `    metrics.evictions += count;\n`;
    }
    code += `    return count;\n`;
    code += `  }\n\n`;

    code += `  /**\n`;
    code += `   * Get cache statistics\n`;
    code += `   */\n`;
    if (options.includeTypeScript) {
      code += `  static getStats() {\n`;
    } else {
      code += `  static getStats() {\n`;
    }
    if (options.includeMetrics) {
      code += `    const totalRequests = metrics.hits + metrics.misses + metrics.bypasses;\n`;
      code += `    return {\n`;
      code += `      size: cacheStore.size,\n`;
      code += `      hits: metrics.hits,\n`;
      code += `      misses: metrics.misses,\n`;
      code += `      staleHits: metrics.staleHits,\n`;
      code += `      bypasses: metrics.bypasses,\n`;
      code += `      evictions: metrics.evictions,\n`;
      code += `      hitRate: totalRequests > 0 ? (metrics.hits / totalRequests * 100).toFixed(2) + '%' : '0%',\n`;
      code += `    };\n`;
    } else {
      code += `    return {\n`;
      code += `      size: cacheStore.size,\n`;
      code += `    };\n`;
    }
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates custom cache key generator
   */
  private generateKeyGenerator(options: CacheMiddlewareOptions): string {
    let code = `\n// Custom Cache Key Generator\n\n`;

    code += `/**\n`;
    code += ` * Advanced cache key generation with support for:\n`;
    code += ` * - Query parameters\n`;
    code += ` * - Request headers\n`;
    code += ` * - User-specific caching\n`;
    code += ` */\n`;
    if (options.includeTypeScript) {
      code += `export interface KeyGeneratorOptions {\n`;
      code += `  includeQuery?: boolean;\n`;
      code += `  includeHeaders?: string[];\n`;
      code += `  includeUser?: boolean;\n`;
      code += `  customKey?: string;\n`;
      code += `}\n\n`;
      code += `export function generateAdvancedCacheKey(\n`;
      code += `  req: Request,\n`;
      code += `  options: KeyGeneratorOptions = {}\n`;
      code += `): string {\n`;
    } else {
      code += `function generateAdvancedCacheKey(req, options) {\n`;
      code += `  options = options || {};\n`;
    }
    code += `  const {\n`;
    code += `    includeQuery = true,\n`;
    code += `    includeHeaders = [],\n`;
    code += `    includeUser = false,\n`;
    code += `    customKey,\n`;
    code += `  } = options;\n\n`;

    code += `  let key = req.method + ':' + req.path;\n\n`;

    code += `  if (includeQuery && Object.keys(req.query).length > 0) {\n`;
    code += `    const sortedQuery = Object.keys(req.query)\n`;
    code += `      .sort()\n`;
    code += `      .map(k => \`\${k}=\${req.query[k]}\`)\n`;
    code += `      .join('&');\n`;
    code += `    key += '?q=' + Buffer.from(sortedQuery).toString('base64');\n`;
    code += `  }\n\n`;

    code += `  if (includeHeaders.length > 0) {\n`;
    code += `    const headers = includeHeaders\n`;
    code += `      .map(h => req.get(h) || '')\n`;
    code += `      .join('|');\n`;
    code += `    key += ';h=' + Buffer.from(headers).toString('base64');\n`;
    code += `  }\n\n`;

    code += `  if (includeUser && req.user?.id) {\n`;
    code += `    key += ';u=' + req.user.id;\n`;
    code += `  }\n\n`;

    code += `  if (customKey) {\n`;
    code += `    key += ';c=' + customKey;\n`;
    code += `  }\n\n`;

    code += `  return ${options.includeTypeScript ? `crypto` : `crypto`}.createHash('sha256')\n`;
    code += `    .update(key)\n`;
    code += `    .digest('hex');\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates cache metrics tracking
   */
  private generateMetrics(options: CacheMiddlewareOptions): string {
    let code = `\n// Cache Metrics Tracking\n\n`;

    code += `/**\n`;
    code += ` * Cache metrics with event emission\n`;
    code += ` */\n`;
    if (options.includeTypeScript) {
      code += `export class ${this.pascalCase(options.name)}Metrics extends EventEmitter {\n`;
    } else {
      code += `class ${this.pascalCase(options.name)}Metrics extends EventEmitter {\n`;
    }

    code += `  private metrics = {\n`;
    code += `    hits: 0,\n`;
    code += `    misses: 0,\n`;
    code += `    staleHits: 0,\n`;
    code += `    bypasses: 0,\n`;
    code += `    evictions: 0,\n`;
    code += `  };\n\n`;

    code += `  recordHit() {\n`;
    code += `    this.metrics.hits++;\n`;
    code += `    this.emit('hit', this.getStats());\n`;
    code += `  }\n\n`;

    code += `  recordMiss() {\n`;
    code += `    this.metrics.misses++;\n`;
    code += `    this.emit('miss', this.getStats());\n`;
    code += `  }\n\n`;

    code += `  recordStaleHit() {\n`;
    code += `    this.metrics.staleHits++;\n`;
    code += `    this.emit('stale-hit', this.getStats());\n`;
    code += `  }\n\n`;

    code += `  recordBypass() {\n`;
    code += `    this.metrics.bypasses++;\n`;
    code += `    this.emit('bypass', this.getStats());\n`;
    code += `  }\n\n`;

    code += `  recordEviction() {\n`;
    code += `    this.metrics.evictions++;\n`;
    code += `    this.emit('eviction', this.getStats());\n`;
    code += `  }\n\n`;

    code += `  getStats() {\n`;
    code += `    const total = this.metrics.hits + this.metrics.misses + this.metrics.bypasses;\n`;
    code += `    return {\n`;
    code += `      ...this.metrics,\n`;
    code += `      hitRate: total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + '%' : '0%',\n`;
    code += `      totalRequests: total,\n`;
    code += `    };\n`;
    code += `  }\n\n`;

    code += `  reset() {\n`;
    code += `    this.metrics = {\n`;
    code += `      hits: 0,\n`;
    code += `      misses: 0,\n`;
    code += `      staleHits: 0,\n`;
    code += `      bypasses: 0,\n`;
    code += `      evictions: 0,\n`;
    code += `    };\n`;
    code += `    this.emit('reset');\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  }

  /**
   * Converts string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toUpperCase());
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
   * Creates the middleware file at the specified path
   */
  public async createMiddlewareFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write middleware file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('API cache middleware file created', { filePath });
  }

  /**
   * Generates usage example code
   */
  public generateUsageExample(middlewareName: string, includeTypeScript: boolean): string {
    const name = this.camelCase(middlewareName);
    let code = `// Usage Example\n\n`;

    if (includeTypeScript) {
      code += `import { ${name}Middleware, ${name}ResponseInterceptor } from './middleware/${this.kebabCase(middlewareName)}';\n`;
      code += `import express, { Request, Response } from 'express';\n\n`;
      code += `const app = express();\n\n`;
      code += `// Apply cache middleware before routes\n`;
      code += `app.use(${name}Middleware);\n\n`;
      code += `// Your routes\n`;
      code += `app.get('/api/users', async (req: Request, res: Response) => {\n`;
      code += `  const users = await fetchUsers();\n`;
      code += `  res.json(users);\n`;
      code += `});\n\n`;
      code += `// Apply response interceptor after routes\n`;
      code += `app.use(${name}ResponseInterceptor);\n`;
    } else {
      code += `const express = require('express');\n`;
      code += `const { ${name}Middleware, ${name}ResponseInterceptor } = require('./middleware/${this.kebabCase(middlewareName)}');\n\n`;
      code += `const app = express();\n\n`;
      code += `// Apply cache middleware before routes\n`;
      code += `app.use(${name}Middleware);\n\n`;
      code += `// Your routes\n`;
      code += `app.get('/api/users', async (req, res) => {\n`;
      code += `  const users = await fetchUsers();\n`;
      code += `  res.json(users);\n`;
      code += `});\n\n`;
      code += `// Apply response interceptor after routes\n`;
      code += `app.use(${name}ResponseInterceptor);\n`;
    }

    return code;
  }
}
