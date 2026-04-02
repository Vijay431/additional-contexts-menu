---
layout: page
title: Adding Commands
nav_order: 1
---

# Adding Commands

## Overview

This guide explains how to add new commands to the extension using the command handler pattern. All command handlers implement the `ICommandHandler` interface and extend `BaseCommandHandler`.

## Step 1: Create the Command Handler Class

Create a new file `src/commands/MyNewCommand.ts`. Import from the barrel `index.ts` files to keep imports clean:

```typescript
import * as vscode from 'vscode';

// Use barrel imports from the di/interfaces index
import type { ICodeAnalysisService } from '../di/interfaces/ICodeAnalysisService';
import type { IAccessibilityService } from '../di/interfaces/IAccessibilityService';

// Import ICommandHandler and BaseCommandHandler from the commands barrel
import { BaseCommandHandler, type CommandResult } from './BaseCommandHandler';
import type { ICommandHandler } from './ICommandHandler';

export class MyNewCommand extends BaseCommandHandler implements ICommandHandler {
  constructor(
    codeAnalysisService: ICodeAnalysisService,
    accessibilityService: IAccessibilityService,
  ) {
    super(
      'MyNewCommand',
      codeAnalysisService as unknown as { debug: (msg: string, data?: unknown) => void },
      accessibilityService,
    );
    this.codeAnalysisService = codeAnalysisService;
  }

  public async execute(): Promise<CommandResult> {
    this.logInfo('My New Command triggered');

    try {
      const editor = this.getRequiredActiveEditor();
      const document = editor.document;
      const position = editor.selection.active;

      // Use injected services
      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position,
      );

      if (!functionInfo) {
        this.showWarning('No function found at cursor position');
        return this.error('No function found');
      }

      // Command logic here
      const message = `Function '${functionInfo.name}' detected`;
      this.showInfo(message);
      this.logDebug(`Function: ${functionInfo.name} detected`);
      await this.announceSuccess('My New Command', message);

      return this.success(message);
    } catch (error) {
      this.logError('Error in My New Command', error);
      return this.error('Failed to execute command', error);
    }
  }
}
```

## Step 2: Export from the Commands Barrel

Open `src/commands/index.ts` and add your new command to the exports:

```typescript
export { MyNewCommand } from './MyNewCommand';
```

This allows other modules to import your command via the barrel:

```typescript
// Clean barrel import — no need to know the exact file path
import { MyNewCommand } from '../commands';
```

## Step 3: Register the Command

1. Open `src/managers/CommandRegistry.ts`
2. Import your new command using the barrel import
3. Add the command to the registry

```typescript
// Use the barrel import from src/commands/index.ts
import { MyNewCommand } from '../commands';

commandRegistry.registerCommands([
  {
    id: 'additionalContextMenus.myNewCommand',
    title: 'My New Command',
    category: 'Additional Context Menus',
    handlerFactory: () =>
      new MyNewCommand(
        getService(TYPES.CodeAnalysisService),
        getService(TYPES.AccessibilityService),
      ),
  },
]);
```

## Step 4: Add Context Menu Entry (Optional)

If you want the command to appear in the editor context menu, add it to `package.json`:

```json
{
  "menus": {
    "editor/context": [
      {
        "when": "languageId == typescript || languageId == typescriptreact",
        "command": "additionalContextMenus.myNewCommand"
      }
    ]
  }
  }
}
```

## Best Practices

### 1. **Implement ICommandHandler**

Every command class must implement `ICommandHandler` in addition to extending `BaseCommandHandler`:

```typescript
export class MyNewCommand extends BaseCommandHandler implements ICommandHandler {
  public async execute(): Promise<CommandResult> { ... }
}
```

This makes the contract explicit and allows the DI container to treat all commands uniformly.

### 2. **Use Barrel Imports**

Each `src/` subdirectory has an `index.ts` barrel file. Prefer barrel imports over deep path imports:

```typescript
// Preferred — barrel import
import { MyNewCommand, BaseCommandHandler } from '../commands';
import { Logger, ConfigValidator } from '../utils';

// Avoid — deep path import
import { MyNewCommand } from '../commands/MyNewCommand';
```

### 3. **Single Responsibility**

Each command should do ONE thing:

- CopyFunctionCommand → copies function
- SaveAllCommand → saves files
- OpenTerminalCommand → opens terminal

### 4. **Dependency Injection**

Use constructor injection - services are passed to your command:

```typescript
constructor(
  codeAnalysisService: ICodeAnalysisService,
  accessibilityService: IAccessibilityService,
) {
  // Services injected by DI container
}
```

### 5. **Error Handling**

Use the base class methods:

```typescript
try {
  // ... command logic
} catch (error) {
  return this.error('Failed', error);
}
```

### 6. **Accessibility**

Always announce results:

```typescript
await this.announceSuccess('My New Command', 'Operation completed');
await this.announceError('My New Command', 'Operation failed');
```

### 7. **Logging**

Use appropriate log levels:

```typescript
this.logDebug('Debug info');
this.logInfo('Info message');
this.logWarn('Warning message');
this.logError('Error message');
```

## See Also

- [Command Handlers](/architecture/command-handlers)
- [Type Safety](/architecture/type-safety)
