# Commands Documentation

## Table of Contents

- [Overview](#overview)
- [Available Commands](#available-commands)
- [Command Availability Matrix](#command-availability-matrix)
- [Detailed Command Reference](#detailed-command-reference)
  - [Copy Function](#copy-function)
  - [Copy Lines to File](#copy-lines-to-file)
  - [Move Lines to File](#move-lines-to-file)
  - [Save All](#save-all)
  - [Open in Terminal](#open-in-terminal)
  - [Enable Extension](#enable-extension)
  - [Disable Extension](#disable-extension)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## Overview

The Additional Context Menus extension provides enhanced right-click context menus for Node.js development with intelligent code operations. This document describes all available commands, their behaviors, configuration options, and practical usage examples.

## Available Commands

The extension provides seven commands that enhance your development workflow:

| Command | ID | Icon | Category |
|---------|-----|------|----------|
| Copy Function | `additionalContextMenus.copyFunction` | $(symbol-function) | Additional Context Menus |
| Copy Lines to File | `additionalContextMenus.copyLinesToFile` | $(copy) | Additional Context Menus |
| Move Lines to File | `additionalContextMenus.moveLinesToFile` | $(arrow-right) | Additional Context Menus |
| Save All | `additionalContextMenus.saveAll` | $(save-all) | Additional Context Menus |
| Open in Terminal | `additionalContextMenus.openInTerminal` | $(terminal) | Additional Context Menus |
| Enable Extension | `additionalContextMenus.enable` | - | Additional Context Menus |
| Disable Extension | `additionalContextMenus.disable` | - | Additional Context Menus |

## Command Availability Matrix

This table shows the conditions under which each command appears in the context menu:

| Command | Active Editor | Text Selection | Node.js Project | Compatible File | Extension Enabled |
|---------|---------------|----------------|-----------------|-----------------|-------------------|
| Copy Function | ✓ | - | ✓ | ✓ (.ts, .tsx, .js, .jsx) | ✓ |
| Copy Lines to File | ✓ | ✓ | ✓ | - | ✓ |
| Move Lines to File | ✓ | ✓ | ✓ | - | ✓ |
| Save All | ✓ | - | - | - | ✓ |
| Open in Terminal | ✓ | - | - | - | ✓ |
| Enable Extension | - | - | - | - | - |
| Disable Extension | - | - | - | - | - |

**Legend:**
- ✓ = Required
- \- = Not required

**Notes:**
- **Node.js Project**: Detected by the presence of a `package.json` file in the workspace (can be disabled via `autoDetectProjects` setting)
- **Compatible File**: Files with extensions `.ts`, `.tsx`, `.js`, or `.jsx` (configurable via `supportedExtensions` setting)
- **Extension Enabled**: The extension's enabled state (controlled by Enable/Disable commands)
- **Enable/Disable commands**: Always available through the command palette, regardless of context

## Detailed Command Reference

### Copy Function

**Command ID:** `additionalContextMenus.copyFunction`  
**Icon:** $(symbol-function)

#### Description

The Copy Function command identifies and copies the complete function at your cursor position to the clipboard. It intelligently detects various function types including regular functions, arrow functions, methods, and React components.

#### Availability

- Requires an active editor with focus
- Requires a Node.js project (detected by `package.json`)
- Requires a compatible file extension (`.ts`, `.tsx`, `.js`, `.jsx`)
- Requires the extension to be enabled
- Works only on saved files (rejects untitled files)

#### Behavior

1. Identifies the function at the current cursor position
2. Extracts the complete function text including comments (if `preserveComments` is enabled)
3. Copies the function text to the clipboard
4. Shows a success notification with the function type and name

#### Success Notification Format

```
Copied <function-type> '<function-name>' to clipboard
```

Examples:
- `Copied function 'calculateTotal' to clipboard`
- `Copied arrow function 'handleClick' to clipboard`
- `Copied method 'render' to clipboard`

#### Error Conditions

- **No active editor found**: No editor window is currently focused
- **Untitled file**: The file must be saved before using this command
- **No function found at cursor position**: The cursor is not positioned within a function

#### Related Configuration

- `additionalContextMenus.copyCode.preserveComments`: Whether to include comments when copying (default: `true`)
- `additionalContextMenus.supportedExtensions`: File extensions where this command is available

### Copy Lines to File

**Command ID:** `additionalContextMenus.copyLinesToFile`  
**Icon:** $(copy)

#### Description

The Copy Lines to File command copies selected text from the current file to a target file of your choice. The source file remains unchanged, making this ideal for duplicating code across files.

#### Availability

- Requires an active editor with focus
- Requires text to be selected
- Requires a Node.js project (detected by `package.json`)
- Requires the extension to be enabled
- Works only on saved files (rejects untitled files)
- Does not support multiple selections

#### Behavior

1. Validates that text is selected in the active editor
2. Determines the source file extension
3. Discovers compatible files in the workspace with matching extensions
4. Presents a file selector showing compatible target files
5. Validates that the target file is accessible and writable
6. Determines the insertion point based on configuration
7. Inserts the selected text at the insertion point
8. Handles imports according to configuration (if enabled)
9. Shows a success notification with the target file name

#### Insertion Point Determination

The insertion point is determined by the `copyCode.insertionPoint` configuration:

- **smart** (default): Inserts after import statements and before export statements
- **end**: Inserts at the end of the file
- **beginning**: Inserts at the beginning of the file

#### Error Conditions

- **No active editor found**: No editor window is currently focused
- **Untitled file**: The file must be saved before using this command
- **No code selected**: No text is selected in the editor
- **Multiple selections**: Only single selections are supported
- **Target file not accessible or writable**: The selected target file cannot be written to

#### Related Configuration

- `additionalContextMenus.copyCode.insertionPoint`: Where to insert copied code (default: `smart`)
- `additionalContextMenus.copyCode.handleImports`: How to handle import statements (default: `merge`)
- `additionalContextMenus.copyCode.preserveComments`: Whether to include comments (default: `true`)
- `additionalContextMenus.supportedExtensions`: File extensions for compatible files

### Move Lines to File

**Command ID:** `additionalContextMenus.moveLinesToFile`  
**Icon:** $(arrow-right)

#### Description

The Move Lines to File command transfers selected text from the current file to a target file and removes it from the source. This is useful for refactoring code by relocating it to different files.

#### Availability

- Requires an active editor with focus
- Requires text to be selected
- Requires a Node.js project (detected by `package.json`)
- Requires the extension to be enabled
- Works only on saved files (rejects untitled files)
- Does not support multiple selections
- Requires the source file to be writable (not read-only)

#### Behavior

1. Validates that text is selected in the active editor
2. Validates that the source file is writable (not read-only)
3. Determines the source file extension
4. Discovers compatible files in the workspace with matching extensions
5. Presents a file selector showing compatible target files
6. Validates that the target file is accessible and writable
7. **Phase 1 - Copy**: Copies the selected text to the target file at the determined insertion point
8. **Phase 2 - Delete**: Only if copy succeeds, removes the selected text from the source file
9. Shows a success notification with the target file name

#### Two-Phase Operation

The command uses a two-phase approach to ensure data integrity:

1. **Copy First**: The selected text is copied to the target file
2. **Delete Only If Copy Succeeds**: The text is removed from the source file only after successful copy

If the copy operation fails, the source file remains unchanged and an error message is shown. This prevents data loss.

#### Error Handling

The command preserves source file integrity through careful error handling:

- If the copy fails, the source file is not modified
- If the deletion fails after a successful copy, a warning is shown but the copy remains
- Read-only source files are rejected before any operations begin

#### Error Conditions

- **No active editor found**: No editor window is currently focused
- **Untitled file**: The file must be saved before using this command
- **No code selected**: No text is selected in the editor
- **Multiple selections**: Only single selections are supported
- **Source file is read-only or not writable**: Cannot move code from read-only files
- **Target file not accessible or writable**: The selected target file cannot be written to
- **Failed to copy code to target file**: Copy operation failed, source file preserved

#### Related Configuration

- `additionalContextMenus.copyCode.insertionPoint`: Where to insert moved code (default: `smart`)
- `additionalContextMenus.copyCode.handleImports`: How to handle import statements (default: `merge`)
- `additionalContextMenus.copyCode.preserveComments`: Whether to include comments (default: `true`)
- `additionalContextMenus.supportedExtensions`: File extensions for compatible files

### Save All

**Command ID:** `additionalContextMenus.saveAll`  
**Icon:** $(save-all)

#### Description

The Save All command saves all modified files in the workspace with a single action. This is useful when you've made changes across multiple files and want to save them all at once.

#### Availability

- Requires an active editor with focus
- Requires the extension to be enabled
- Available regardless of Node.js project detection

#### Behavior

1. Identifies all modified (dirty) files in the workspace
2. Optionally skips read-only files based on configuration
3. Saves each modified file
4. Optionally shows a notification with the count of saved files

#### Notification Configuration

The notification behavior is controlled by the `saveAll.showNotification` setting:

- **true** (default): Shows a notification like "Saved 5 file(s)"
- **false**: Saves files silently without notification

#### Read-Only File Handling

The `saveAll.skipReadOnly` setting controls how read-only files are handled:

- **true** (default): Skips read-only files and continues saving other files
- **false**: Attempts to save all files including read-only ones (may result in errors)

#### Error Conditions

- **No active editor found**: No editor window is currently focused
- **Failed to save files**: An error occurred during the save operation

#### Related Configuration

- `additionalContextMenus.saveAll.showNotification`: Show notification after saving (default: `true`)
- `additionalContextMenus.saveAll.skipReadOnly`: Skip read-only files when saving (default: `true`)

### Open in Terminal

**Command ID:** `additionalContextMenus.openInTerminal`  
**Icon:** $(terminal)

#### Description

The Open in Terminal command opens a terminal in the context of the active file's directory. It supports multiple terminal types and behaviors, making it easy to access a command line in the right location.

#### Availability

- Requires an active editor with focus
- Requires the extension to be enabled
- Available regardless of Node.js project detection

#### Behavior

1. Gets the active file's path
2. Determines the target directory based on the `openBehavior` configuration
3. Opens a terminal of the specified type at the target directory

#### Terminal Type Options

The `terminal.type` setting controls which type of terminal to open:

- **integrated** (default): Opens VSCode's integrated terminal
- **external**: Opens an external terminal application
- **system-default**: Opens the system's default terminal application

#### Open Behavior Options

The `terminal.openBehavior` setting controls which directory to open:

- **parent-directory** (default): Opens the directory containing the active file
- **workspace-root**: Opens the workspace root directory
- **current-directory**: Opens the current working directory

#### Custom External Terminal Command

When using `terminal.type: "external"`, you can specify a custom command via `terminal.externalTerminalCommand`. Use `{{directory}}` as a placeholder for the directory path.

**Examples:**

```json
// macOS - iTerm2
"additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"

// Windows - Windows Terminal
"additionalContextMenus.terminal.externalTerminalCommand": "wt.exe -d {{directory}}"

// Linux - GNOME Terminal
"additionalContextMenus.terminal.externalTerminalCommand": "gnome-terminal --working-directory={{directory}}"
```

#### Error Conditions

- **No active editor found**: No editor window is currently focused
- **Failed to open terminal**: An error occurred while opening the terminal

#### Related Configuration

- `additionalContextMenus.terminal.type`: Type of terminal to open (default: `integrated`)
- `additionalContextMenus.terminal.openBehavior`: Which directory to open (default: `parent-directory`)
- `additionalContextMenus.terminal.externalTerminalCommand`: Custom command for external terminal (default: empty)

### Enable Extension

**Command ID:** `additionalContextMenus.enable`

#### Description

The Enable Extension command activates the Additional Context Menus extension, making all context menu commands visible and available.

#### Availability

- Always available through the command palette
- Not shown in context menus

#### Behavior

1. Updates the `additionalContextMenus.enabled` configuration setting to `true`
2. Shows an information notification: "Additional Context Menus enabled"
3. Context menu commands become visible based on their individual availability conditions

#### Effect on Context Menu Visibility

When the extension is enabled, commands appear in context menus based on their specific requirements (active editor, text selection, Node.js project, etc.). The enabled state is checked via the `additionalContextMenus.enabled` when clause.

#### Related Configuration

- `additionalContextMenus.enabled`: Controls whether the extension is active (set to `true` by this command)

---

### Disable Extension

**Command ID:** `additionalContextMenus.disable`

#### Description

The Disable Extension command deactivates the Additional Context Menus extension, hiding all context menu commands.

#### Availability

- Always available through the command palette
- Not shown in context menus

#### Behavior

1. Updates the `additionalContextMenus.enabled` configuration setting to `false`
2. Shows an information notification: "Additional Context Menus disabled"
3. All context menu commands become hidden regardless of other conditions

#### Effect on Context Menu Visibility

When the extension is disabled, no commands appear in context menus, even if all other conditions (active editor, Node.js project, etc.) are met. This provides a quick way to temporarily hide all extension commands without uninstalling.

#### Related Configuration

- `additionalContextMenus.enabled`: Controls whether the extension is active (set to `false` by this command)

## Configuration Options

The extension provides several configuration options to customize its behavior. All settings are prefixed with `additionalContextMenus.`.

### General Settings

#### `additionalContextMenus.enabled`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable or disable the Additional Context Menus extension
- **Affects Commands:** All commands

When set to `false`, all context menu commands are hidden. Use the Enable/Disable commands to toggle this setting.

#### `additionalContextMenus.autoDetectProjects`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Automatically detect Node.js projects for context menu visibility
- **Affects Commands:** Copy Function, Copy Lines to File, Move Lines to File

When enabled, the extension looks for `package.json` files in the workspace to determine if it's a Node.js project. Code operation commands (Copy Function, Copy Lines to File, Move Lines to File) only appear in Node.js projects when this is enabled.

When disabled, these commands are always available regardless of project type.

#### `additionalContextMenus.supportedExtensions`

- **Type:** `array` of strings
- **Default:** `[".ts", ".tsx", ".js", ".jsx"]`
- **Description:** File extensions where context menus will be shown
- **Affects Commands:** Copy Function (directly), Copy Lines to File and Move Lines to File (for file discovery)

This setting controls which file types are considered compatible for code operations. The Copy Function command only appears in files with these extensions. The Copy/Move Lines to File commands use this setting to filter target files.

**Example:**

```json
{
  "additionalContextMenus.supportedExtensions": [".ts", ".tsx", ".js", ".jsx", ".vue"]
}
```

### Code Copying Settings

#### `additionalContextMenus.copyCode.insertionPoint`

- **Type:** `string` (enum)
- **Default:** `"smart"`
- **Possible Values:** `"smart"`, `"end"`, `"beginning"`
- **Description:** Where to insert copied code in target file
- **Affects Commands:** Copy Lines to File, Move Lines to File

**Options:**

- **smart**: Intelligently determines the insertion point based on file structure
  - Inserts after import statements if present
  - Otherwise inserts before export statements if present
  - Otherwise inserts at the end of the file
- **end**: Always inserts at the end of the file
- **beginning**: Always inserts at the beginning of the file

**Example:**

```json
{
  "additionalContextMenus.copyCode.insertionPoint": "end"
}
```

#### `additionalContextMenus.copyCode.handleImports`

- **Type:** `string` (enum)
- **Default:** `"merge"`
- **Possible Values:** `"merge"`, `"duplicate"`, `"skip"`
- **Description:** How to handle import statements when copying code
- **Affects Commands:** Copy Lines to File, Move Lines to File

**Options:**

- **merge**: Attempts to merge imports from copied code with existing imports in the target file (Note: Full implementation pending)
- **duplicate**: Includes import statements as-is in the copied code, potentially creating duplicates
- **skip**: Removes import statements from copied code

**Example:**

```json
{
  "additionalContextMenus.copyCode.handleImports": "skip"
}
```

#### `additionalContextMenus.copyCode.preserveComments`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Preserve comments when copying code
- **Affects Commands:** Copy Function, Copy Lines to File, Move Lines to File

When enabled, comments are included when copying or moving code. When disabled, comments are stripped from the copied code.

**Example:**

```json
{
  "additionalContextMenus.copyCode.preserveComments": false
}
```

### Save All Settings

#### `additionalContextMenus.saveAll.showNotification`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Show notification after saving all files
- **Affects Commands:** Save All

When enabled, displays a notification showing how many files were saved. When disabled, files are saved silently.

**Example:**

```json
{
  "additionalContextMenus.saveAll.showNotification": false
}
```

#### `additionalContextMenus.saveAll.skipReadOnly`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Skip read-only files when saving all
- **Affects Commands:** Save All

When enabled, read-only files are skipped during the save operation. When disabled, the command attempts to save all files including read-only ones, which may result in errors.

**Example:**

```json
{
  "additionalContextMenus.saveAll.skipReadOnly": false
}
```

### Terminal Settings

#### `additionalContextMenus.terminal.type`

- **Type:** `string` (enum)
- **Default:** `"integrated"`
- **Possible Values:** `"integrated"`, `"external"`, `"system-default"`
- **Description:** Type of terminal to open when using 'Open in Terminal' command
- **Affects Commands:** Open in Terminal

**Options:**

- **integrated**: Opens VSCode's built-in integrated terminal
- **external**: Opens an external terminal application using the custom command specified in `externalTerminalCommand`
- **system-default**: Opens the system's default terminal application

**Example:**

```json
{
  "additionalContextMenus.terminal.type": "external"
}
```

#### `additionalContextMenus.terminal.externalTerminalCommand`

- **Type:** `string`
- **Default:** `""` (empty string)
- **Description:** Custom command for external terminal. Use `{{directory}}` as placeholder for directory path
- **Affects Commands:** Open in Terminal (when `terminal.type` is `"external"`)

This setting is only used when `terminal.type` is set to `"external"`. The `{{directory}}` placeholder is replaced with the actual directory path.

**Examples:**

```json
// macOS - iTerm2
{
  "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"
}

// Windows - Windows Terminal
{
  "additionalContextMenus.terminal.externalTerminalCommand": "wt.exe -d {{directory}}"
}

// Linux - GNOME Terminal
{
  "additionalContextMenus.terminal.externalTerminalCommand": "gnome-terminal --working-directory={{directory}}"
}
```

#### `additionalContextMenus.terminal.openBehavior`

- **Type:** `string` (enum)
- **Default:** `"parent-directory"`
- **Possible Values:** `"parent-directory"`, `"workspace-root"`, `"current-directory"`
- **Description:** Which directory to open in terminal
- **Affects Commands:** Open in Terminal

**Options:**

- **parent-directory**: Opens the directory containing the active file
- **workspace-root**: Opens the root directory of the workspace
- **current-directory**: Opens the current working directory

**Example:**

```json
{
  "additionalContextMenus.terminal.openBehavior": "workspace-root"
}
```

## Usage Examples

### Example 1: Extracting a Function with Copy Function

**Scenario:** You have a utility function in a component file that you want to copy to a utilities file.

**Steps:**

1. Open the file containing the function (e.g., `UserProfile.tsx`)
2. Place your cursor anywhere within the function you want to copy
3. Right-click to open the context menu
4. Select **"Copy Function"**
5. The function is copied to your clipboard
6. Navigate to your target file (e.g., `utils/helpers.ts`)
7. Paste the function where needed

**Result:** The complete function, including its signature and body, is copied to the clipboard. You'll see a notification like "Copied function 'formatUserName' to clipboard".

---

### Example 2: Duplicating Code with Copy Lines to File

**Scenario:** You want to duplicate a React component's JSX structure to create a similar component in another file.

**Steps:**

1. Open the source file (e.g., `Button.tsx`)
2. Select the code you want to copy (e.g., the JSX return statement)
3. Right-click to open the context menu
4. Select **"Copy Lines to File"**
5. Choose the target file from the file selector (e.g., `IconButton.tsx`)
6. The selected code is inserted into the target file

**Result:** The selected code is copied to the target file at the smart insertion point (after imports, before exports). The source file remains unchanged. You'll see a notification like "Lines copied to IconButton.tsx".

**Configuration Impact:**

- With `insertionPoint: "smart"` (default): Code is inserted after imports
- With `insertionPoint: "end"`: Code is inserted at the end of the file
- With `insertionPoint: "beginning"`: Code is inserted at the start of the file

---

### Example 3: Refactoring with Move Lines to File

**Scenario:** You're refactoring a large component and want to move a helper function to a separate utilities file.

**Steps:**

1. Open the component file (e.g., `Dashboard.tsx`)
2. Select the helper function you want to move
3. Right-click to open the context menu
4. Select **"Move Lines to File"**
5. Choose the target utilities file from the file selector (e.g., `utils/dashboard-helpers.ts`)
6. The function is copied to the target file and removed from the source

**Result:** The selected code is moved to the target file and deleted from the source file. You'll see a notification like "Lines moved to dashboard-helpers.ts".

**Safety Features:**

- If the copy operation fails, the source file remains unchanged
- Read-only source files are rejected before any operations begin
- The two-phase operation (copy then delete) ensures data integrity

---

### Example 4: Saving Multiple Files with Save All

**Scenario:** You've made changes across multiple files in your project and want to save them all at once.

**Steps:**

1. Make changes to multiple files in your workspace
2. With any editor focused, right-click to open the context menu
3. Select **"Save All"**
4. All modified files are saved

**Result:** All modified files in the workspace are saved. With default settings, you'll see a notification like "Saved 5 file(s)".

**Configuration Impact:**

- With `showNotification: true` (default): Shows count of saved files
- With `showNotification: false`: Saves files silently
- With `skipReadOnly: true` (default): Skips read-only files
- With `skipReadOnly: false`: Attempts to save all files including read-only ones

---

### Example 5: Quick Terminal Access with Open in Terminal

**Scenario:** You're editing a file and need to run a command in that file's directory.

**Steps:**

1. Open the file you're working on (e.g., `src/components/Header.tsx`)
2. Right-click to open the context menu
3. Select **"Open in Terminal"**
4. A terminal opens in the appropriate directory

**Result:** A terminal opens based on your configuration. With default settings (`type: "integrated"`, `openBehavior: "parent-directory"`), VSCode's integrated terminal opens in the `src/components` directory.

**Configuration Impact:**

- With `type: "integrated"` (default): Opens VSCode's integrated terminal
- With `type: "external"`: Opens your configured external terminal application
- With `openBehavior: "parent-directory"` (default): Opens in the file's directory
- With `openBehavior: "workspace-root"`: Opens in the workspace root
- With `openBehavior: "current-directory"`: Opens in the current working directory

**Custom External Terminal Example:**

```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"
}
```

With this configuration, clicking "Open in Terminal" opens iTerm2 (on macOS) in the appropriate directory.

---

### Example 6: Controlling Extension Visibility with Enable/Disable

**Scenario:** You want to temporarily hide all extension commands from your context menus without uninstalling.

**Steps to Disable:**

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Additional Context Menus: Disable"
3. Select the command
4. All extension commands are hidden from context menus

**Steps to Re-enable:**

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Additional Context Menus: Enable"
3. Select the command
4. Extension commands reappear in context menus based on their availability conditions

**Result:** The extension's enabled state is toggled. You'll see a notification confirming the change: "Additional Context Menus enabled" or "Additional Context Menus disabled".

## Troubleshooting

### Commands Not Appearing in Context Menu

**Problem:** Extension commands don't appear when you right-click in the editor.

**Possible Causes and Solutions:**

1. **Extension is disabled**
   - **Check:** Open Command Palette and search for "Additional Context Menus: Enable"
   - **Solution:** Run the Enable command to activate the extension

2. **Not a Node.js project** (for Copy Function, Copy Lines to File, Move Lines to File)
   - **Check:** Look for a `package.json` file in your workspace
   - **Solution:** Either add a `package.json` file or disable project detection:
     ```json
     {
       "additionalContextMenus.autoDetectProjects": false
     }
     ```

3. **Incompatible file extension** (for Copy Function)
   - **Check:** Verify your file has a supported extension (.ts, .tsx, .js, .jsx)
   - **Solution:** Add your file extension to the supported extensions list:
     ```json
     {
       "additionalContextMenus.supportedExtensions": [".ts", ".tsx", ".js", ".jsx", ".vue"]
     }
     ```

4. **No text selected** (for Copy Lines to File, Move Lines to File)
   - **Check:** Ensure you have text selected in the editor
   - **Solution:** Select the code you want to copy or move before opening the context menu

5. **No active editor**
   - **Check:** Ensure an editor window has focus
   - **Solution:** Click into an editor window before using the commands

---

### "No Function Found at Cursor Position" Error

**Problem:** Copy Function command shows "No function found at cursor position" warning.

**Possible Causes and Solutions:**

1. **Cursor not inside a function**
   - **Solution:** Place your cursor anywhere within the function body, signature, or name

2. **Unsupported function syntax**
   - **Check:** The extension supports regular functions, arrow functions, methods, and React components
   - **Solution:** If your function uses unusual syntax, try selecting it manually and using Copy Lines to File instead

3. **File not saved**
   - **Check:** Look for the dot indicator on the file tab showing unsaved changes
   - **Solution:** Save the file (Ctrl+S / Cmd+S) before using Copy Function

---

### "Untitled File" Errors

**Problem:** Commands show errors like "Copy Function is not available for untitled files. Please save the file first."

**Cause:** The extension requires files to be saved to disk before performing operations.

**Solution:** Save the file with a name and location before using the command:
1. Press Ctrl+S / Cmd+S
2. Choose a file name and location
3. Try the command again

---

### "Source File is Read-Only" Error

**Problem:** Move Lines to File command shows "Source file is read-only or not writable. Cannot move code from this file."

**Possible Causes and Solutions:**

1. **File permissions**
   - **Check:** Verify the file's permissions in your file system
   - **Solution:** Change file permissions to make it writable, or use Copy Lines to File instead

2. **File opened from a read-only location**
   - **Check:** Verify the file isn't in a system directory or read-only mount
   - **Solution:** Copy the file to a writable location or use Copy Lines to File

3. **VSCode read-only mode**
   - **Check:** Look for read-only indicators in the editor
   - **Solution:** Close and reopen the file, or check VSCode's file permissions

---

### "Target File Not Accessible or Writable" Error

**Problem:** Copy/Move Lines to File commands show "Target file is not accessible or writable."

**Possible Causes and Solutions:**

1. **File permissions**
   - **Solution:** Verify the target file has write permissions

2. **File is open in another application**
   - **Solution:** Close the file in other applications and try again

3. **Path validation failure**
   - **Solution:** Ensure the target file path is valid and within the workspace

---

### "Multiple Selections Not Supported" Warning

**Problem:** Copy/Move Lines to File commands show "Copy Lines to File does not support multiple selections."

**Cause:** The extension currently only supports single text selections.

**Solution:** 
1. Click somewhere in the editor to clear multiple selections
2. Select only the code you want to copy/move
3. Try the command again

---

### Configuration Changes Not Taking Effect

**Problem:** Changes to extension settings don't seem to work.

**Possible Causes and Solutions:**

1. **Settings scope**
   - **Check:** Verify you're editing the correct settings scope (User vs Workspace)
   - **Solution:** Open Settings (Ctrl+, / Cmd+,) and check both User and Workspace tabs

2. **Settings syntax error**
   - **Check:** Look for syntax errors in settings.json (if editing manually)
   - **Solution:** Validate your JSON syntax or use the Settings UI instead

3. **VSCode needs reload**
   - **Solution:** Reload VSCode window (Command Palette → "Developer: Reload Window")

4. **Conflicting settings**
   - **Check:** Workspace settings override user settings
   - **Solution:** Check both settings levels for conflicts

---

### Import Merging Not Working as Expected

**Problem:** Imports aren't being merged when copying code between files.

**Current Status:** Import merging is partially implemented. The extension extracts imports from copied code but doesn't yet fully merge them with existing imports in the target file.

**Workaround:**
1. Use `handleImports: "duplicate"` to include all imports
2. Manually clean up duplicate imports after copying
3. Use `handleImports: "skip"` to exclude imports and add them manually

**Future Enhancement:** Full import merging functionality is planned for a future release.

---

### Terminal Not Opening in Expected Directory

**Problem:** Open in Terminal command opens in the wrong directory.

**Solution:** Check your `terminal.openBehavior` setting:

```json
{
  // Opens in the file's parent directory (default)
  "additionalContextMenus.terminal.openBehavior": "parent-directory",
  
  // Opens in workspace root
  "additionalContextMenus.terminal.openBehavior": "workspace-root",
  
  // Opens in current working directory
  "additionalContextMenus.terminal.openBehavior": "current-directory"
}
```

---

### External Terminal Not Opening

**Problem:** Open in Terminal with `type: "external"` doesn't work.

**Possible Causes and Solutions:**

1. **Missing external terminal command**
   - **Check:** Verify `terminal.externalTerminalCommand` is configured
   - **Solution:** Add the appropriate command for your system:
     ```json
     {
       "additionalContextMenus.terminal.type": "external",
       "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"
     }
     ```

2. **Incorrect placeholder syntax**
   - **Check:** Ensure you're using `{{directory}}` (not `{directory}` or `$directory`)
   - **Solution:** Use the exact placeholder: `{{directory}}`

3. **Terminal application not installed**
   - **Check:** Verify the terminal application is installed and in your PATH
   - **Solution:** Install the terminal application or use a different one

---

### Getting Help

If you encounter issues not covered in this troubleshooting guide:

1. **Check the extension logs:**
   - Open Output panel (View → Output)
   - Select "Additional Context Menus" from the dropdown

2. **Report an issue:**
   - Visit the [GitHub repository](https://github.com/Vijay431/additional-contexts-menu/issues)
   - Provide details about your environment, configuration, and the issue
   - Include relevant log output if available

3. **Review the documentation:**
   - Re-read the command descriptions and configuration options above
   - Check that your use case matches the command's intended behavior

