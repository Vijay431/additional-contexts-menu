# Contributor Tutorial: Adding New Commands

This tutorial will guide you through the process of adding a new command to the Additional Context Menus extension. You'll learn about the extension's architecture, the command pattern, and step-by-step instructions for implementing your own command.

## Table of Contents

- [Overview](#overview)
- [Understanding the Architecture](#understanding-the-architecture)
- [Command Structure](#command-structure)
- [Step-by-Step Guide](#step-by-step-guide)
- [Common Patterns](#common-patterns)
- [Testing and Verification](#testing-and-verification)
- [Examples](#examples)

## Overview

Additional Context Menus is a VS Code extension that provides enhanced right-click context menus for Node.js development. The extension follows a **service-oriented architecture** with clear separation of concerns:

```
src/
├── extension.ts              # Entry point (activate/deactivate)
├── managers/
│   ├── extensionManager.ts   # Extension lifecycle management
│   └── contextMenuManager.ts # Command registration and handling
├── services/
│   ├── codeAnalysisService.ts    # AST parsing and code analysis
│   ├── configurationService.ts   # VS Code settings integration
│   ├── fileDiscoveryService.ts   # File system operations
│   ├── fileSaveService.ts        # File save operations
│   ├── projectDetectionService.ts # Node.js project detection
│   └── terminalService.ts        # Terminal operations
├── utils/
│   └── logger.ts             # Logging utility
└── types/
    └── extension.ts          # TypeScript type definitions
```

## Understanding the Architecture

### Key Components

1. **extension.ts**: Entry point that activates the extension and initializes the ExtensionManager
2. **ExtensionManager**: Manages the extension lifecycle and initializes all managers
3. **ContextMenuManager**: Registers all commands and handles their execution
4. **Services**: Reusable singleton services that provide specific functionality

### Command Flow

```
User Action (right-click)
    ↓
VS Code evaluates menu "when" clause
    ↓
Command becomes visible (if conditions met)
    ↓
User clicks command
    ↓
VS Code invokes registered command
    ↓
ContextMenuManager handler method executes
    ↓
Services perform operations
    ↓
Result shown to user
```

### Singleton Pattern

All services use the **Singleton Pattern** to ensure only one instance exists:

```typescript
// Getting a service instance
const configService = ConfigurationService.getInstance();
const logger = Logger.getInstance();
```

This pattern:
- Ensures consistency across the extension
- Reduces memory footprint
- Simplifies state management

## Command Structure

Every command in the extension consists of **four parts**:

### 1. Package.json Declaration

The command must be declared in `package.json` under the `contributes.commands` section:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "additionalContextMenus.myCommand",
        "title": "My Command",
        "category": "Additional Context Menus",
        "icon": "$(symbol-function)"
      }
    ]
  }
}
```

**Properties:**
- `command`: Unique identifier (use format: `additionalContextMenus.commandName`)
- `title`: Human-readable name shown to users
- `category`: Grouping in the Command Palette
- `icon`: (optional) VS Code codicon icon name

### 2. Command Registration

The command must be registered in `ContextMenuManager.ts` in the `registerCommands()` method:

```typescript
private registerCommands(): void {
  this.disposables.push(
    vscode.commands.registerCommand(
      'additionalContextMenus.myCommand',
      () => this.handleMyCommand()
    )
  );
}
```

### 3. Handler Method

Implement the command logic in a handler method within `ContextMenuManager.ts`:

```typescript
private async handleMyCommand(): Promise<void> {
  this.logger.info('My Command triggered');

  try {
    // 1. Validate prerequisites
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    // 2. Perform operation
    // ... your logic here ...

    // 3. Show success message
    vscode.window.showInformationMessage('Operation successful');
    this.logger.info('My Command completed successfully');
  } catch (error) {
    this.logger.error('Error in My Command', error);
    vscode.window.showErrorMessage('Operation failed');
  }
}
```

### 4. Menu Integration (Optional)

To add the command to a context menu, define it in `package.json` under `contributes.menus`:

```json
{
  "contributes": {
    "menus": {
      "editor/context": [
        {
          "when": "editorTextFocus && additionalContextMenus.enabled",
          "command": "additionalContextMenus.myCommand",
          "group": "1_modification@1"
        }
      ]
    }
  }
}
```

**Properties:**
- `when`: Condition for when the menu item should be visible
- `command`: The command ID
- `group`: Menu group and position (format: `groupName@position`)

## Step-by-Step Guide

Let's walk through adding a new command called "Copy Class" that copies a class definition to the clipboard.

### Step 1: Declare Command in package.json

Add your command to the `contributes.commands` array in `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "additionalContextMenus.copyClass",
        "title": "Copy Class",
        "category": "Additional Context Menus",
        "icon": "$(symbol-class)"
      }
    ]
  }
}
```

### Step 2: Add Menu Entry (Optional)

If you want the command in the editor context menu, add it to `contributes.menus`:

```json
{
  "contributes": {
    "menus": {
      "editor/context": [
        {
          "when": "editorTextFocus && additionalContextMenus.enabled && additionalContextMenus.isNodeProject && resourceExtname =~ /\\.(ts|tsx|js|jsx)$/",
          "command": "additionalContextMenus.copyClass",
          "group": "1_modification@2"
        }
      ]
    }
  }
}
```

**Common `when` clause conditions:**
- `editorTextFocus` - Editor has focus
- `editorHasSelection` - Text is selected
- `additionalContextMenus.enabled` - Extension is enabled
- `additionalContextMenus.isNodeProject` - In a Node.js project
- `resourceExtname =~ /\\.ts$ /` - File extension matches pattern

### Step 3: Register Command in ContextMenuManager

Add the registration in the `registerCommands()` method:

```typescript
private registerCommands(): void {
  this.disposables.push(
    // ... existing commands ...
    vscode.commands.registerCommand('additionalContextMenus.copyClass', () =>
      this.handleCopyClass(),
    )
  );
}
```

### Step 4: Implement Handler Method

Add your handler method to `ContextMenuManager.ts`:

```typescript
private async handleCopyClass(): Promise<void> {
  this.logger.info('Copy Class command triggered');

  try {
    // Step 1: Get active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    // Step 2: Get cursor position
    const document = editor.document;
    const position = editor.selection.active;

    // Step 3: Use service to find class
    const classInfo = await this.codeAnalysisService.findClassAtPosition(
      document,
      position,
    );

    if (!classInfo) {
      vscode.window.showWarningMessage('No class found at cursor position');
      return;
    }

    // Step 4: Copy to clipboard
    await vscode.env.clipboard.writeText(classInfo.fullText);

    // Step 5: Show success message
    vscode.window.showInformationMessage(
      `Copied class '${classInfo.name}' to clipboard`,
    );
    this.logger.info(`Class copied: ${classInfo.name}`);
  } catch (error) {
    this.logger.error('Error in Copy Class command', error);
    vscode.window.showErrorMessage('Failed to copy class');
  }
}
```

### Step 5: Add Service Methods (If Needed)

If your command requires new service methods, add them to the appropriate service:

```typescript
// In codeAnalysisService.ts
public async findClassAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<ClassInfo | null> {
  // Implementation using AST parsing
  // ... your logic here ...
}
```

### Step 6: Compile and Test

```bash
# Compile the extension
npm run compile

# Launch Extension Development Host
# Press F5 in VS Code
```

### Step 7: Test Your Command

1. In the Extension Development Host, open a TypeScript/JavaScript file
2. Right-click in the editor
3. Verify your command appears in the context menu
4. Click the command and verify it works as expected
5. Check the output logs for any errors

## Common Patterns

### Pattern 1: Editor Validation

Always validate the active editor before proceeding:

```typescript
const editor = vscode.window.activeTextEditor;
if (!editor) {
  vscode.window.showErrorMessage('No active editor found');
  return;
}
```

### Pattern 2: Selection Validation

For commands requiring text selection:

```typescript
const selection = editor.selection;
if (selection.isEmpty) {
  vscode.window.showWarningMessage('No text selected');
  return;
}
```

### Pattern 3: File Type Validation

Check if the file type is supported:

```typescript
const supportedExtensions = this.configService.getSupportedExtensions();
const fileExtension = this.getFileExtension(editor.document.fileName);

if (!supportedExtensions.includes(fileExtension)) {
  vscode.window.showWarningMessage(
    `File type '${fileExtension}' is not supported`
  );
  return;
}
```

### Pattern 4: Error Handling

Wrap command logic in try-catch and provide user feedback:

```typescript
try {
  // Command logic here
  this.logger.info('Command completed successfully');
} catch (error) {
  this.logger.error('Error in command', error);
  vscode.window.showErrorMessage('Operation failed');
}
```

### Pattern 5: User Confirmation

For destructive operations, ask for confirmation:

```typescript
const confirmation = await vscode.window.showWarningMessage(
  'This will modify your files. Continue?',
  { modal: true },
  'Yes',
  'No'
);

if (confirmation !== 'Yes') {
  return;
}
```

### Pattern 6: Progress Indication

For long-running operations, use progress API:

```typescript
await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: 'Processing...',
    cancellable: false,
  },
  async () => {
    // Your operation here
  }
);
```

### Pattern 7: File Operations

When working with files, use the FileDiscoveryService:

```typescript
// Get compatible files
const compatibleFiles = await this.fileDiscoveryService.getCompatibleFiles('.ts');

// Show file selector
const targetFile = await this.fileDiscoveryService.showFileSelector(compatibleFiles);

// Validate file
const isValid = await this.fileDiscoveryService.validateTargetFile(targetFile);
```

### Pattern 8: Configuration Access

Access configuration using ConfigurationService:

```typescript
const config = this.configService.getConfiguration();

if (config.enabled) {
  // Proceed with operation
}
```

## Testing and Verification

### Manual Testing Checklist

- [ ] Command appears in Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
- [ ] Command appears in context menu (if applicable)
- [ ] Menu visibility conditions work correctly
- [ ] Command executes without errors
- [ ] Success/error messages display correctly
- [ ] Operation produces expected results
- [ ] Edge cases are handled (no editor, no selection, etc.)
- [ ] Extension doesn't crash on error

### Logging

Use the Logger to debug your command:

```typescript
this.logger.info('Informational message');
this.logger.debug('Debug message');
this.logger.warn('Warning message');
this.logger.error('Error message', error);
```

View logs in the "Additional Context Menus" output channel.

### Common Issues and Solutions

#### Issue: Command doesn't appear in context menu

**Solution:** Check the `when` clause in `package.json`. Ensure all context variables are set correctly.

```typescript
// Check if context variable is set
await vscode.commands.executeCommand('setContext', 'additionalContextMenus.enabled', true);
```

#### Issue: Command throws error on execution

**Solution:**
1. Check the Developer Tools Console (Help > Toggle Developer Tools)
2. Check the "Additional Context Menus" output channel
3. Add error logging in your handler method

#### Issue: Changes don't appear after rebuild

**Solution:**
1. Run `npm run compile` to rebuild
2. Reload the Extension Development Host (Ctrl+R / Cmd+R)
3. Or restart the Extension Development Host entirely

## Examples

### Example 1: Simple Command

A command that shows a notification with the current file name:

```typescript
// package.json
{
  "command": "additionalContextMenus.showFileName",
  "title": "Show File Name"
}

// ContextMenuManager.ts
private async handleShowFileName(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const fileName = editor.document.fileName;
  vscode.window.showInformationMessage(`Current file: ${fileName}`);
}
```

### Example 2: Command with Configuration

A command that respects user configuration:

```typescript
// Add configuration to package.json
{
  "configuration": {
    "properties": {
      "additionalContextMenus.myCommand.maxResults": {
        "type": "number",
        "default": 10,
        "description": "Maximum results to show"
      }
    }
  }
}

// Use configuration in handler
private async handleMyCommand(): Promise<void> {
  const config = vscode.workspace.getConfiguration('additionalContextMenus');
  const maxResults = config.get<number>('myCommand.maxResults', 10);

  // Use maxResults in logic
}
```

### Example 3: Command with User Input

A command that prompts for user input:

```typescript
private async handleCreateFile(): Promise<void> {
  const fileName = await vscode.window.showInputBox({
    prompt: 'Enter file name',
    placeHolder: 'my-file.ts',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'File name is required';
      }
      if (!value.endsWith('.ts')) {
        return 'File must have .ts extension';
      }
      return null;
    },
  });

  if (!fileName) {
    return; // User cancelled
  }

  // Create file with fileName
  const uri = vscode.Uri.file(fileName);
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(''));
  await vscode.window.showTextDocument(uri);
}
```

### Example 4: Command with Quick Pick

A command that shows a selection menu:

```typescript
private async handleQuickAction(): Promise<void> {
  const options: vscode.QuickPickOptions = {
    placeHolder: 'Select an action',
  };

  const items = [
    { label: 'Option 1', description: 'Description 1' },
    { label: 'Option 2', description: 'Description 2' },
    { label: 'Option 3', description: 'Description 3' },
  ];

  const selected = await vscode.window.showQuickPick(items, options);

  if (!selected) {
    return; // User cancelled
  }

  // Perform action based on selection
  vscode.window.showInformationMessage(`You selected: ${selected.label}`);
}
```

## Best Practices

### DO ✅

- Follow the existing code structure and patterns
- Use TypeScript for all new code
- Add proper error handling with try-catch
- Log important events using the Logger
- Provide user feedback via notifications
- Validate prerequisites before executing
- Use services for reusable functionality
- Add JSDoc comments for public methods
- Test on different file types and scenarios
- Handle edge cases gracefully

### DON'T ❌

- Don't use console.log (use Logger instead)
- Don't hardcode values that should be configurable
- Don't skip error handling
- Don't modify files directly (use VS Code API)
- Don't forget to dispose resources
- Don't break existing functionality
- Don't ignore TypeScript errors
- Don't add commands without testing

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Commands](https://code.visualstudio.com/api/references/commands)
- [VS Code When Clause Contexts](https://code.visualstudio.com/api/references/when-clause-contexts)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - General contribution guidelines

## Getting Help

If you encounter issues while adding your command:

1. Check existing commands for similar patterns
2. Review VS Code Extension API documentation
3. Search existing [GitHub Issues](https://github.com/Vijay431/additional-contexts-menu/issues)
4. Create a new issue with the "question" label
5. Email maintainer: <vijayanand431@gmail.com>

---

**Happy contributing! 🚀**

Thank you for taking the time to add a new command to Additional Context Menus. Your contributions help make this extension better for everyone!
