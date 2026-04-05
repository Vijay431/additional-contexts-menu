---
layout: default
title: 'Services Documentation'
description: 'Comprehensive documentation for all Additional Context Menus services.'
---

# Services Documentation

Complete documentation for all 11 services in Additional Context Menus extension.

## Service Categories

### Code Analysis Services

- [Code Analysis Service](/services/codeAnalysisService.html) - Function detection and code parsing
- [File Discovery Service](/services/fileDiscoveryService.html) - File scanning and filtering

### Configuration & State

- [Configuration Service](/services/configurationService.html) - Extension settings management
- [Project Detection Service](/services/projectDetectionService.html) - Framework detection

### File Operations

- [File Save Service](/services/fileSaveService.html) - Enhanced save operations
- [File Naming Convention Service](/services/fileNamingConventionService.html) - Naming convention enforcement

### Code Generation

- [Cron Job Timer Generator Service](/services/cronJobTimerGeneratorService.html) - Cron expression generation
- [Enum Generator Service](/services/enumGeneratorService.html) - Union type to enum conversion
- [Env File Generator Service](/services/envFileGeneratorService.html) - .env file generation

### Project Operations

- [Terminal Service](/services/terminalService.html) - Cross-platform terminal

### Accessibility

- [Accessibility Service](/services/accessibilityService.html) - Screen reader support and announcements

## Quick Reference

| Service           | Purpose               | Icon                |
| ----------------- | --------------------- | ------------------- |
| Code Analysis     | Function detection    | fa-code             |
| Configuration     | Settings management   | fa-cog              |
| File Discovery    | File scanning         | fa-search           |
| File Save         | Save operations       | fa-save             |
| Terminal          | Terminal integration  | fa-terminal         |
| Cron Generator    | Cron expressions      | fa-clock            |
| Enum Generator    | Enum generation       | fa-list-ol          |
| Env Generator     | .env generation       | fa-file-alt         |
| Naming Convention | File naming           | fa-font             |
| Project Detection | Framework detection   | fa-project-diagram  |
| Accessibility     | Screen reader support | fa-universal-access |

## Architecture

All services are managed through the Dependency Injection (DI) container:

- **DI Container**: Services resolved via `getService<T>(TYPES.ServiceName)`
- **Factory Methods**: Services use static `create()` methods for DI instantiation
- **Logger Integration**: All services use injected Logger instance
- **Error Handling**: Try-catch with proper logging
- **Type Safety**: Strong TypeScript typing with interfaces
- **Disposal**: Proper resource cleanup via Disposable interface

## Navigation

- [Back to Home](/)
- [Features Overview](/features.html)
- [Code Operations](/code-operations.html)
