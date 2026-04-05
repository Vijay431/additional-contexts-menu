---
layout: default
title: 'Command Handlers'
description: 'Architecture guide for command handlers in Additional Context Menus - focused, testable command pattern.'
---

# Command Handlers

## Overview

Commands have been extracted from the monolithic ContextMenuManager (843 lines) into separate, focused handler classes.

## Before: Monolithic Manager

```typescript
// ContextMenuManager - 843 lines with mixed concerns
export class ContextMenuManager {
  // 17 services injected via getInstance()
  private async handleCopyFunction() {
    /* 30 lines */
  }
  private async handleSaveAll() {
    /* 20 lines */
  }
  private async handleOpenInTerminal() {
    /* 15 lines */
  }
  // ... 14 more command handlers
}
```

**Problems:**

1. **Mixed Responsibilities**: Command logic mixed with registration
2. **Hard to Test**: Can't mock individual services
3. **Code Duplication**: Command patterns repeated for each handler
4. **No Separation**: Business logic mixed with command handling

## After: Focused Command Handlers

```typescript
// Each command has a single, well-defined purpose
export class CopyFunctionCommand extends BaseCommandHandler {
  constructor(codeAnalysisService: ICodeAnalysisService, ...) {
    super('CopyFunction', codeAnalysisService as unknown, ...);
    this.codeAnalysisService = codeAnalysisService;
  }

  public async execute(): Promise<CommandResult> {
    const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(...);
    // ... focused logic for copying function
  }
}
```

**Benefits:**

1. **Single Responsibility**: Each command has one clear purpose
2. **Easy Testing**: Commands can be tested in isolation
3. **Consistent Patterns**: All commands follow same structure
4. **Better Error Handling**: Centralized error handling in BaseCommandHandler

## Command Registry

The **CommandRegistry** manages all command lifecycle:

```typescript
export class CommandRegistry {
  private readonly commands = new Map<string, CommandMetadata>();

  registerCommand(metadata: CommandMetadata): CommandRegistry {
    const handler = metadata.handlerFactory();
    const disposable = vscode.commands.registerCommand(metadata.id, async () => {
      await handler.execute();
    });
    this.commands.set(metadata.id, { metadata, disposable });
  }
}
```

**Features:**

- Centralized command registration
- Command metadata management
- Lifecycle management (dispose all at once)
- Type-safe command execution

## Usage Example

```typescript
// Register a command in extension.ts
import { getService } from './di';
import { CopyFunctionCommand } from './commands';

const commandRegistry = getService('CommandRegistry');

commandRegistry.registerCommands([
  {
    id: 'additionalContextMenus.copyFunction',
    title: 'Copy Function',
    category: 'Additional Context Menus',
    handlerFactory: () =>
      new CopyFunctionCommand(
        getService(TYPES.CodeAnalysisService),
        getService(TYPES.AccessibilityService),
      ),
  },
]);
```

## See Also

- [Dependency Injection](/architecture/dependency-injection)
- [Type Safety](/architecture/type-safety)
