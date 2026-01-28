import * as crypto from 'crypto';

import {
  CacheEntry,
  CacheInvalidationOptions,
  CacheOperationResult,
  CacheStats,
} from '../types/extension';
import { ConfigurationService } from './configurationService';
import { Logger } from '../utils/logger';

/**
 * Redis Cache Management Service
 *
 * Provides a Redis-like caching layer with TypeScript typing,
 * key generation strategies, and TTL management.
 *
 * Features:
 * - In-memory cache with Redis-like API
 * - Key generation with prefix and hashing
 * - TTL management with auto-cleanup
 * - Cache decorators for methods
 * - Multi-get operations
 * - Tag-based cache invalidation
 * - Pattern-based key matching
 *
 * Note: This is an in-memory implementation. For production use,
 * consider connecting to an actual Redis instance.
 */
export class RedisCacheService {
  private static instance: RedisCacheService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;
  private cache: Map<string, CacheEntry>;
  private tagIndex: Map<string, Set<string>>;
  private hitCount: number;
  private missCount: number;
  private operationsCount: number;
  private cleanupTimer: NodeJS.Timeout | null;
  private isInitialized: boolean;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.cache = new Map();
    this.tagIndex = new Map();
    this.hitCount = 0;
    this.missCount = 0;
    this.operationsCount = 0;
    this.cleanupTimer = null;
    this.isInitialized = false;
  }

  public static getInstance(): RedisCacheService {
    RedisCacheService.instance ??= new RedisCacheService();
    return RedisCacheService.instance;
  }

  /**
   * Initialize the cache service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const config = this.configService.getRedisCacheConfig();

    if (!config.enabled) {
      this.logger.info('Redis cache service is disabled');
      return;
    }

    this.isInitialized = true;
    this.logger.info('Redis cache service initialized', {
      url: config.url,
      keyPrefix: config.keyPrefix,
      defaultTTL: config.defaultTTL,
    });

    // Start cleanup timer if auto-cleanup is enabled
    if (config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Generate a cache key with prefix and optional hashing
   */
  public generateKey(key: string, hash: boolean = false): string {
    const config = this.configService.getRedisCacheConfig();
    const prefix = config.keyPrefix;

    // Validate key length
    if (key.length > config.maxKeyLength) {
      if (hash) {
        // Hash long keys
        const hashSum = crypto.createHash('sha256').update(key).digest('hex');
        return `${prefix}:${hashSum.substring(0, 16)}`;
      } else {
        throw new Error(
          `Key length exceeds maximum of ${config.maxKeyLength} characters`,
        );
      }
    }

    return `${prefix}:${key}`;
  }

  /**
   * Set a value in the cache
   */
  public async set(
    key: string,
    value: unknown,
    ttl?: number,
    tags?: string[],
  ): Promise<CacheOperationResult> {
    try {
      const config = this.configService.getRedisCacheConfig();
      const cacheKey = this.generateKey(key);
      const now = Date.now();
      const effectiveTTL = ttl ?? config.defaultTTL;

      const entry: CacheEntry = {
        key: cacheKey,
        value,
        ttl: effectiveTTL,
        createdAt: now,
        ...(effectiveTTL > 0 && { expiresAt: now + effectiveTTL * 1000 }),
        ...(tags && { tags }),
      };

      this.cache.set(cacheKey, entry);

      // Update tag index
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(cacheKey);
        }
      }

      this.operationsCount++;

      this.logger.debug(`Cache set: ${cacheKey}`, {
        ttl: effectiveTTL,
        tags,
      });

      return {
        success: true,
        key: cacheKey,
        value,
        ttl: effectiveTTL,
      };
    } catch (error) {
      this.logger.error(`Cache set failed: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a value from the cache
   */
  public async get(key: string): Promise<CacheOperationResult> {
    try {
      const cacheKey = this.generateKey(key);
      this.operationsCount++;

      const entry = this.cache.get(cacheKey);

      if (!entry) {
        this.missCount++;
        return {
          success: false,
          key: cacheKey,
          error: 'Key not found',
        };
      }

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.cache.delete(cacheKey);
        this.missCount++;
        return {
          success: false,
          key: cacheKey,
          error: 'Key expired',
        };
      }

      this.hitCount++;
      return {
        success: true,
        key: cacheKey,
        value: entry.value,
        ...(entry.ttl !== undefined && { ttl: entry.ttl }),
      };
    } catch (error) {
      this.logger.error(`Cache get failed: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a key from the cache
   */
  public async delete(key: string): Promise<CacheOperationResult> {
    try {
      const cacheKey = this.generateKey(key);
      this.operationsCount++;

      const entry = this.cache.get(cacheKey);
      if (!entry) {
        return {
          success: false,
          key: cacheKey,
          error: 'Key not found',
        };
      }

      // Remove from tag index
      if (entry.tags) {
        for (const tag of entry.tags) {
          const keys = this.tagIndex.get(tag);
          if (keys) {
            keys.delete(cacheKey);
            if (keys.size === 0) {
              this.tagIndex.delete(tag);
            }
          }
        }
      }

      this.cache.delete(cacheKey);

      return {
        success: true,
        key: cacheKey,
      };
    } catch (error) {
      this.logger.error(`Cache delete failed: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<CacheOperationResult> {
    try {
      this.operationsCount++;
      const count = this.cache.size;
      this.cache.clear();
      this.tagIndex.clear();

      this.logger.info(`Cache cleared: ${count} entries removed`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Cache clear failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a key exists in the cache
   */
  public async has(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key);
      const entry = this.cache.get(cacheKey);

      if (!entry) {
        return false;
      }

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.cache.delete(cacheKey);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Cache has check failed: ${key}`, error);
      return false;
    }
  }

  /**
   * Get multiple values from the cache
   */
  public async mget(keys: string[]): Promise<CacheOperationResult[]> {
    const results: CacheOperationResult[] = [];

    for (const key of keys) {
      const result = await this.get(key);
      results.push(result);
    }

    return results;
  }

  /**
   * Set multiple values in the cache
   */
  public async mset(
    entries: Array<{ key: string; value: unknown; ttl?: number; tags?: string[] }>,
  ): Promise<CacheOperationResult[]> {
    const results: CacheOperationResult[] = [];

    for (const entry of entries) {
      const result = await this.set(entry.key, entry.value, entry.ttl, entry.tags);
      results.push(result);
    }

    return results;
  }

  /**
   * Invalidate cache entries by keys, tags, or pattern
   */
  public async invalidate(
    options: CacheInvalidationOptions,
  ): Promise<CacheOperationResult> {
    try {
      let deletedCount = 0;

      // Invalidate by keys
      if (options.byKey && options.byKey.length > 0) {
        for (const key of options.byKey) {
          const result = await this.delete(key);
          if (result.success) {
            deletedCount++;
          }
        }
      }

      // Invalidate by tags
      if (options.byTag && options.byTag.length > 0) {
        for (const tag of options.byTag) {
          const keys = this.tagIndex.get(tag);
          if (keys) {
            const keyArray = Array.from(keys);
            for (const cacheKey of keyArray) {
              this.cache.delete(cacheKey);
              deletedCount++;
            }
            this.tagIndex.delete(tag);
          }
        }
      }

      // Invalidate by pattern
      if (options.byPattern) {
        const regex = new RegExp(options.byPattern);
        const cacheKeys = Array.from(this.cache.keys());
        for (const cacheKey of cacheKeys) {
          if (regex.test(cacheKey)) {
            const entry = this.cache.get(cacheKey);
            if (entry) {
              // Remove from tag index
              if (entry.tags) {
                for (const tag of entry.tags) {
                  const keys = this.tagIndex.get(tag);
                  if (keys) {
                    keys.delete(cacheKey);
                  }
                }
              }
            }
            this.cache.delete(cacheKey);
            deletedCount++;
          }
        }
      }

      this.operationsCount++;
      this.logger.info(`Cache invalidated: ${deletedCount} entries removed`, {
        options,
      });

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Cache invalidate failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<CacheStats> {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      totalKeys: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRate,
      operationsCount: this.operationsCount,
    };
  }

  /**
   * Clean up expired entries
   */
  public async cleanup(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [cacheKey, entry] of entries) {
      if (entry.expiresAt && entry.expiresAt < now) {
        // Remove from tag index
        if (entry.tags) {
          for (const tag of entry.tags) {
            const keys = this.tagIndex.get(tag);
            if (keys) {
              keys.delete(cacheKey);
              if (keys.size === 0) {
                this.tagIndex.delete(tag);
              }
            }
          }
        }

        this.cache.delete(cacheKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cache cleanup: ${cleanedCount} expired entries removed`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of the cache service
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cache.clear();
    this.tagIndex.clear();
    this.isInitialized = false;

    this.logger.info('Redis cache service disposed');
  }

  /**
   * Start the automatic cleanup timer
   */
  private startCleanupTimer(): void {
    const config = this.configService.getRedisCacheConfig();

    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, config.cleanupInterval * 1000);

    this.logger.debug(`Cleanup timer started: ${config.cleanupInterval}s interval`);
  }

  /**
   * Estimate memory usage of the cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + value size + metadata
      totalSize += key.length * 2; // UTF-16
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 100; // Metadata overhead
    }

    return totalSize;
  }
}

/**
 * Cache decorator for caching method results
 *
 * Usage:
 * ```typescript
 * class MyService {
 *   @Cacheable({ keyPrefix: 'user', ttl: 3600 })
 *   async getUser(id: string) {
 *     // Expensive operation
 *   }
 * }
 * ```
 */
export function Cacheable(options: {
  keyPrefix?: string;
  ttl?: number;
  tags?: string[];
  condition?: (...args: unknown[]) => boolean;
}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheService = RedisCacheService.getInstance();

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = `${options.keyPrefix || _propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cacheService.get(key);
      if (cached.success) {
        return cached.value;
      }

      // Execute method and cache result
      const result = await originalMethod.apply(this, args);
      await cacheService.set(key, result, options.ttl, options.tags);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator for methods that modify data
 *
 * Usage:
 * ```typescript
 * class MyService {
 *   @CacheInvalidate({ byTag: ['users'] })
 *   async updateUser(id: string, data: any) {
 *     // Update operation
 *   }
 * }
 * ```
 */
export function CacheInvalidate(options: CacheInvalidationOptions) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheService = RedisCacheService.getInstance();

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache
      await cacheService.invalidate(options);

      return result;
    };

    return descriptor;
  };
}
