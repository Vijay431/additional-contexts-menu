---
layout: default
title: 'Command Handlers'
description: 'Architecture guide for command handlers in Additional Context Menus - focused, testable command pattern.'
---

# Command Handlers

## Overview

The extension uses a `BaseCommandHandler` abstract class and `ICommandHandler` interface as the foundation for command handlers. A `CommandRegistry` class exists for centralized command lifecycle management. Currently, commands are registered inline in `ContextMenuManager.registerCommands()` — migration to use `CommandRegistry` as the sole registration point is in progress.

## Current State: Commands in ContextMenuManager

All commands are registered directly in `ContextMenuManager`:

```typescript
// src/managers/ContextMenuManager.ts
private registerCommands(): void {
  this.disposables.push(
    vscode.commands.registerCommand('additionalContextMenus.copyFunction', () =>
      this.handleCopyFunction(),
    ),
    vscode.commands.registerCommand('additionalContextMenus.copyFunctionToFile', () =>
      this.handleCopyFunctionToFile(),
    ),
    // ... all other commands registered here
  );
}
```

## Command Infrastructure

### BaseCommandHandler

An abstract base class providing common functionality for command handlers:

```typescript
export abstract class BaseCommandHandler implements ICommandHandler {
  constructor(
    protected readonly name: string,
    protected readonly logger: ILogger,
    protected readonly accessibilityService: IAccessibilityService,
  ) {}

  public abstract execute(): Promise<CommandResult>;

  // Helpers: showInfo(), showWarning(), showError()
  // Logging: logInfo(), logDebug(), logWarn(), logError()
  // Accessibility: announce(), announceSuccess(), announceError()
  // Results: success(), error()
}
```

Currently used by: `CopyFunctionCommand`, `SaveAllCommand`, `OpenInTerminalCommand`.

### CommandRegistry

A `CommandRegistry` class exists in `src/managers/CommandRegistry.ts` for centralized command registration and lifecycle management. It is not yet wired into the main activation path — commands are still registered directly in `ContextMenuManager`.

```typescript
export class CommandRegistry {
  registerCommand(metadata: CommandMetadata): this {
    const handler = metadata.handlerFactory();
    const disposable = vscode.commands.registerCommand(metadata.id, async () => {
      await handler.execute();
    });
    this.commands.set(metadata.id, { metadata, disposable });
    return this;
  }
}
```

## See Also

- [Dependency Injection](/architecture/dependency-injection)
- [Type Safety](/architecture/type-safety)
