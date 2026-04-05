---
layout: default
title: 'Performance Optimization'
description: 'Performance optimizations, caching strategy, and metrics for Additional Context Menus VS Code extension.'
---

# Performance Optimization

## Overview

The extension is designed for minimal overhead and fast activation. This document outlines the performance optimizations implemented and how to measure performance.

## Activation Performance

### Lazy Activation

The extension uses optimized activation events to minimize startup overhead:

```json
{
  "activationEvents": [
    "onStartupFinished",
    "onLanguage:typescript",
    "onLanguage:typescriptreact",
    "onLanguage:javascript",
    "onLanguage:javascriptreact",
    "onCommand:additionalContextMenus.enable"
  ]
}
```

**Benefits:**

- Extension activates after VS Code is ready (`onStartupFinished`)
- Language-specific activation only when needed
- No impact on startup time for non-TypeScript/JavaScript projects

### Service Lazy Loading

Services are only instantiated when first accessed through the DI container:

```typescript
// Service registration only - no instantiation
container.registerSingleton<IFileDiscoveryService>(TYPES.FileDiscoveryService, () => {
  return FileDiscoveryService.create(logger, accessibilityService);
});

// Service instantiated on first access
const files = container.get<IFileDiscoveryService>(TYPES.FileDiscoveryService);
```

**Benefits:**

- Reduced memory footprint
- Faster activation time
- Services not used are never initialized

## Caching Strategy

### Smart Cache Implementation

The extension uses a smart caching utility with the following features:

- **Time-based expiration**: Entries expire after a configurable TTL
- **Size limits**: LRU (Least Recently Used) eviction when cache is full
- **Statistics tracking**: Monitor hit rates and cache effectiveness
- **Automatic cleanup**: Periodic removal of expired entries

```typescript
// Cache configuration
const cache = new Cache<T>({
  maxSize: 100, // Maximum entries
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  trackStats: true, // Enable statistics
});

// Usage
cache.set('key', value);
const value = cache.get('key');

// Get statistics
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Cached Services

#### ProjectDetectionService

- **TTL**: 10 minutes
- **Max size**: 50 entries
- **Invalidation**: On workspace change

```typescript
// Project type is cached per workspace
const projectType = await detectionService.detectProjectType();
// First call: scans package.json
// Subsequent calls (within 10 min): returns cached result
```

#### FileDiscoveryService

- **TTL**: 5 minutes
- **Max size**: 100 entries
- **Invalidation**: On file system change

```typescript
// File lists are cached per extension
const files = await discoveryService.getCompatibleFiles('.ts');
// First call: scans workspace
// Subsequent calls (within 5 min): returns cached result
```

## Performance Metrics

### Measuring Performance

The extension includes metrics collection for performance monitoring:

```typescript
import { getMetrics, getSummary } from './utils/metrics';

// Get all recorded metrics
const metrics = getMetrics();

// Get aggregated summary
const summary = getSummary();

console.log(`Average operation time: ${summary.averageDuration}ms`);
console.log(`Success rate: ${(summary.successRate * 100).toFixed(1)}%`);
```

### Performance Targets

| Metric            | Target | Current |
| ----------------- | ------ | ------- |
| Activation time   | <500ms | ~200ms  |
| Command execution | <100ms | ~50ms   |
| Cache hit rate    | >80%   | ~85%    |

**Bundle Composition:**

- **Core Bundle**: Essential services, command handlers, utilities, TypeScript Compiler API
- **Lazy Services**: Generator services (Enum, Env, Cron) loaded on demand

## Optimization Techniques

### 1. Efficient File System Operations

```typescript
// Use VS Code's file search API (optimized)
const files = await vscode.workspace.findFiles(pattern, excludePattern, maxResults);

// Instead of manual fs.readdir() recursion
```

### 2. Event-Driven Configuration Updates

Configuration changes are handled reactively via VS Code's `onDidChangeConfiguration` event:

```typescript
this.configService.onConfigurationChanged(() => {
  void this.handleConfigurationChanged();
});
```

### 3. Full-File AST Parsing

Code analysis parses the entire file using `ts.createSourceFile()` and traverses the AST to find the innermost function node containing the cursor position. This ensures accurate detection with no false positives from comments or strings.

## Best Practices

### For Users

1. **Keep workspace size reasonable**: Large workspaces take longer to scan
2. **Use `.vscodeignore`**: Exclude unnecessary folders from workspace
3. **Clear cache manually**: If you encounter stale results

### For Developers

1. **Use caching for expensive operations**: Files, network requests, parsing
2. **Monitor cache hit rates**: Low hit rates indicate poor cache strategy
3. **Profile before optimizing**: Measure performance to identify real bottlenecks

## See Also

- [Dependency Injection](/architecture/dependency-injection)
- [Command Handlers](/architecture/command-handlers)
