---
title: Additional Context Menus - VS Code Extension for Node.js
description: Extract functions, generate code, and automate React, Angular, Express, and Next.js development with intelligent context menus
keywords: vscode extension, refactoring tool, code generation, react tools, typescript tools, nodejs development, extract function, context menu, developer productivity
author: Vijay Gangatharan
---

# Additional Context Menus - VS Code Extension

🚀 **Enhanced right-click context menus for Node.js development** with intelligent code operations for React, Angular, Express, Next.js, TypeScript, and JavaScript projects.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VijayGangatharan.additional-context-menus)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus) [![Open VSX Registry](https://img.shields.io/open-vsx/v/VijayGangatharan/additional-context-menus)](https://open-vsx.org/extension/VijayGangatharan/additional-context-menus) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/VijayGangatharan.additional-context-menus)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus)

<div align="center">

![Copy Function Demo](docs/images/screenshots/copy-function.gif)
_Extract functions in one click with intelligent import handling_

</div>

---

## 🎯 Quick Start

**New to Additional Context Menus?** Get productive in 2 minutes:

1. **Install** the extension from VS Code Marketplace
2. **Open** any Node.js project with `package.json`
3. **Right-click** in any file → look for **Additional Context Menus ▶** in the context menu
4. **Try it out:** Select some code → Right-click → Additional Context Menus → "Copy Selection to File"

### 💡 Common Workflows

| Workflow                     | Steps                                                    | When to Use                            |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------- |
| **Extract React Component**  | Select JSX → Right-click → Copy/Move to File             | Refactoring large components           |
| **Share Utility Function**   | Click in function → Right-click → Copy Function          | Reusing helper functions               |
| **Copy Function to File**    | Cursor in function → Right-click → Copy Function to File | Extracting functions to separate files |
| **Move Function to File**    | Cursor in function → Right-click → Move Function to File | Refactoring function extraction        |
| **Quick Terminal Access**    | Right-click anywhere → Open in Terminal                  | Fast directory navigation              |
| **Bulk Save Modified Files** | Right-click → Save All                                   | Before commits or builds               |

---

## 🎬 Feature Showcase

### Copy Function

![Copy Function Demo](docs/images/screenshots/copy-function.gif)

### Copy Function to File

![Copy Function to File Demo](docs/images/screenshots/copy-function-to-file.gif)

### Move Function to File

![Move Function to File Demo](docs/images/screenshots/move-function-to-file.gif)

### Copy Selection to File

![Copy Selection to File Demo](docs/images/screenshots/copy-selection-to-file.gif)

### Move Selection to File

![Move Selection to File Demo](docs/images/screenshots/move-selection-to-file.gif)

### Save All

![Save All Demo](docs/images/screenshots/save-all.gif)

### Open in Terminal

![Open in Terminal Demo](docs/images/screenshots/open-in-terminal.gif)

### Rename File to Convention

![Rename File to Convention Demo](docs/images/screenshots/rename-file-convention.gif)

---

## 🌟 Why Additional Context Menus?

**Stop wasting time on manual refactoring:**

| ❌ Manual Refactoring                                           | ✅ With Additional Context Menus   |
| --------------------------------------------------------------- | ---------------------------------- |
| Copy function → Find target file → Paste → Manually add imports | Right-click → Select target → Done |
| 30+ seconds per operation                                       | 3 seconds per operation            |
| Error-prone import management                                   | Automatic import resolution        |
| Lost flow state                                                 | Stay in the zone                   |

**Join developers saving hours weekly on routine code operations.**

---

## 📚 Features Documentation

Detailed documentation for all 11 features with usage guides and examples.

| Feature                | Documentation                                                                                               | Purpose                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Copy Function          | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/copyFunction.html)                 | Copy function at cursor                                                               |
| Copy Function to File  | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/copyFunctionToFile.html)           | Copy function to target file                                                          |
| Move Function to File  | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/moveFunctionToFile.html)           | Move function to target file                                                          |
| Copy Selection to File | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/copySelectionToFile.html)          | Copy selected code to file                                                            |
| Move Selection to File | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/moveSelectionToFile.html)          | Move selected code to file                                                            |
| Save All               | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/fileSaveService.html)              | Enhanced save operations                                                              |
| Open in Terminal       | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/terminalService.html)              | Terminal integration                                                                  |
| Rename File Convention | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/fileNamingConventionService.html)  | Rename files/folders to kebab-case, camelCase, or PascalCase via Explorer right-click |
| Generate Enum          | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/enumGeneratorService.html)         | Union type to enum                                                                    |
| Generate Cron          | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/cronJobTimerGeneratorService.html) | Cron expression generation                                                            |
| Generate .env File     | [View Docs](https://vijay431.github.io/additional-contexts-menu/services/envFileGeneratorService.html)      | .env file creation                                                                    |

[**View All Features** →](https://vijay431.github.io/additional-contexts-menu/services/)

---

## ✨ Features Overview

### 🎯 Core Functionality

#### Main Features (Right-Click Menu Only)

- 🎯 **Copy Function** - AST-based function detection and copying with intelligent import handling
- 📋 **Copy Function to File** - Copy function at cursor to a target file
- ✂️ **Move Function to File** - Move function at cursor to a target file (removes from source)
- 📋 **Copy Selection to File** - Smart code copying with import conflict resolution
- ✂️ **Move Selection to File** - Intelligent code moving with automatic cleanup
- 💾 **Save All** - Enhanced save functionality with progress feedback and read-only handling
- 🖥️ **Open in Terminal** - Cross-platform terminal integration
- 🔢 **Generate Enum from Union Type** - Convert TypeScript union types to enums
- ⏱️ **Generate Cron Expression** - Interactive cron expression builder

#### Extension Management (Command Palette Only)

- ⚙️ **Enable/Disable Extension** - Global extension control
- 🔍 **Show Output Channel** - View extension logs
- 🐛 **Debug Context Variables** - Inspect extension state
- 🔄 **Refresh Context Variables** - Force re-detection of project context
- ⌨️ **Check Keybinding Conflicts** - View keybinding configuration
- 🔛 **Enable/Disable Keybindings** - Toggle custom keybindings
- 🌿 **Generate .env File** - Generate environment file from usage patterns
- 🚶 **Open Walkthrough** - Open the getting started walkthrough

#### Explorer Right-Click Menu

- 🗂️ **Rename File to Convention** - Right-click any file or folder in the Explorer to rename to kebab-case, camelCase, or PascalCase. Processes a single file or recursively renames all files in a folder. Reports renamed, skipped (already compliant), and failed counts.

### Project Intelligence

- 🔍 **Automatic Project Detection** - Detects React, Angular, Express, and Next.js projects
- 📁 **Smart File Discovery** - Finds compatible files for code operations
- 🔧 **Context-Aware Menus** - Shows relevant options based on file type and project
- 📝 **TypeScript & JavaScript Support** - Full support for .ts, .tsx, .js, .jsx files

### Code Operations

- 🧠 **AST-Based Code Analysis** - Uses TypeScript Compiler API for accurate function detection
- 🔀 **Import Management** - Merge, duplicate, or skip import statements
- 📍 **Smart Insertion** - Intelligent code placement (smart, end, beginning)
- 💬 **Comment Preservation** - Maintains code comments during operations

### Accessibility

- 🔍 **Dual Access Patterns** - Main features accessible via both command palette and right-click menu
- ⚙️ **Management Commands** - Enable/disable functionality available via command palette only
- 🎯 **Context-Aware Display** - Menus shown based on file type, project detection, and extension state
- 🌐 **Cross-Platform Terminal** - Intelligent terminal integration across Windows, macOS, and Linux
- ♿ **Screen Reader Support** - ARIA labels and announcements for assistive technology users
- 🎹 **Keyboard Navigation** - All features fully keyboard accessible with enhanced hints
- ⚙️ **Configurable Verbosity** - Adjust screen reader announcement levels (minimal, normal, verbose)

#### Accessibility Settings

The extension provides comprehensive accessibility configuration options:

- `additionalContextMenus.accessibility.verbosity` - Control announcement verbosity
  - `minimal` - Only errors and critical operations
  - `normal` - All operations (default, recommended)
  - `verbose` - Detailed progress and contextual information

- `additionalContextMenus.accessibility.screenReaderMode` - Enable enhanced screen reader support with additional ARIA labels (default: `false` — announcements are opt-in)

- `additionalContextMenus.accessibility.keyboardNavigation` - Show keyboard navigation hints in Quick Pick dialogs

#### Keyboard Shortcuts

All commands are keyboard accessible:

| Command                | Windows/Linux      | macOS             |
| ---------------------- | ------------------ | ----------------- |
| Copy Function          | `Ctrl+Alt+Shift+F` | `Cmd+Alt+Shift+F` |
| Copy Function to File  | `Ctrl+Alt+Shift+E` | `Cmd+Alt+Shift+E` |
| Copy Selection to File | `Ctrl+Alt+Shift+C` | `Cmd+Alt+Shift+C` |
| Move Function to File  | `Ctrl+Alt+Shift+R` | `Cmd+Alt+Shift+R` |
| Move Selection to File | `Ctrl+Alt+Shift+M` | `Cmd+Alt+Shift+M` |
| Save All               | `Ctrl+Alt+Shift+A` | `Cmd+Alt+Shift+A` |
| Open in Terminal       | `Ctrl+Alt+Shift+T` | `Cmd+Alt+Shift+T` |

#### Screen Reader Support

The extension supports NVDA (Windows), VoiceOver (macOS), and Orca (Linux):

- **Quick Pick Dialogs**: All items include ARIA labels with position and description
- **File Lists**: Accessible file names, directory locations, and modification times
- **Input Validation**: Clear error messages with "Error:" prefix for easy identification
- **Progress Announcements**: Long-running operations announce progress percentage
- **Operation Feedback**: Success/failure announcements for all operations

For detailed accessibility documentation, see [Accessibility Guide](https://vijay431.github.io/additional-contexts-menu/accessibility.html).

---

## 📦 Installation

### From VS Code Marketplace

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install VijayGangatharan.additional-context-menus`
4. Press Enter

### From Command Line

```bash
code --install-extension VijayGangatharan.additional-context-menus
```

### Pre-release Versions

Pre-release builds are published to both VS Code Marketplace and Open VSX Registry for early access to new features before a stable release.

**VS Code Marketplace:**

1. Open the extension page in VS Code
2. Click the dropdown arrow next to **Uninstall**
3. Select **Switch to Pre-Release Version**

**Open VSX Registry:**
Pre-release versions are listed alongside stable versions on the extension page.

Pre-release tags follow the format `vX.ODD_MINOR.PATCH-suffix` (e.g. `v2.1.0-beta.1`, `v2.1.0-rc.1`). Stable releases use even minor versions (e.g. `v2.0.0`, `v2.2.0`).

---

## 🚀 Usage Guide

The extension automatically detects Node.js projects and enhances right-click context menus for supported file types.

### 🎬 Feature Demonstrations

#### Copy Function - Before & After

**Before:** Manual copy-paste with import management headaches

```typescript
// In ComponentA.tsx - you want to copy this function
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

**After:** One right-click, perfect function extraction

```typescript
// Automatically copied to ComponentB.tsx with imports resolved
import { validateEmail } from './utils/validation';

// Function is now properly imported and ready to use
const isValid = validateEmail(userEmail);
```

#### Code Migration - React Component Example

**Scenario:** Moving a custom hook from component to shared utilities

**Before:** Complex manual refactoring

```typescript
// Large component file with embedded hook
const UserProfile = () => {
  // Custom hook buried in component
  const useUserData = (userId: string) => {
    // Complex hook logic...
  };

  return <div>Profile Content</div>;
};
```

**After:** Clean separation with smart copy/move

```typescript
// hooks/useUserData.ts - Moved via context menu
export const useUserData = (userId: string) => {
  // Hook logic properly extracted
};

// UserProfile.tsx - Import automatically managed
import { useUserData } from '../hooks/useUserData';

const UserProfile = () => {
  const userData = useUserData(currentUser.id);
  return <div>Profile Content</div>;
};
```

### 🔧 Detailed Feature Usage

#### Copy Function

1. **Position cursor** inside any function (arrow, regular, method, React component)
2. **Right-click** → Select "Copy Function"
3. **Automatic detection** of function boundaries using AST-based parsing via TypeScript Compiler API
4. **Smart copying** includes function signature, body, and relevant comments

**Supported Function Types:**

- ✅ Regular functions: `function myFunc() {}`
- ✅ Arrow functions: `const myFunc = () => {}`
- ✅ Class methods: `methodName() {}`
- ✅ React components: `const MyComponent = () => {}`
- ✅ React hooks: `const useCustomHook = () => {}`
- ✅ Async functions: `async function fetchData() {}`

#### Copy/Move Code

1. **Select** the code block you want to transfer
2. **Right-click** → Choose "Copy to Existing File" or "Move to Existing File"
3. **Browse** compatible files (smart filtering by extension)
4. **Select target** from organized file list with last-modified timestamps
5. **Smart insertion** with configurable placement (smart/beginning/end)

**Smart Features:**

- 🧠 **Import Management**: Automatically merges, skips, or handles duplicate imports
- 📍 **Intelligent Placement**: Finds optimal insertion point after imports, before exports
- 💬 **Comment Preservation**: Maintains code comments during transfer
- 🔍 **File Discovery**: Shows only compatible files (.ts↔.tsx, .js↔.jsx)

#### Save All

- **Right-click anywhere** → Select "Save All"
- **Progress feedback** for operations with 5+ files
- **Smart filtering** skips read-only files (configurable)
- **Detailed reporting** shows success/failure/skipped counts
- **Error handling** continues operation even if some files fail

#### Open in Terminal (v1.2.0+)

1. **Right-click** on any file in the editor
2. **Select** "Open in Terminal" from context menu
3. **Smart directory selection** based on configuration:
   - **Parent Directory**: Opens folder containing the file
   - **Workspace Root**: Opens project root directory
   - **Current Directory**: Opens the file's exact location

**Cross-Platform Terminal Support:**

- 🪟 **Windows**: cmd, PowerShell, Windows Terminal
- 🍎 **macOS**: Terminal.app, iTerm2, custom terminals
- 🐧 **Linux**: gnome-terminal, konsole, xfce4-terminal, xterm
- ⚙️ **Custom**: Configure any terminal with command templates

#---

## 🎮 Commands & Shortcuts

### Command Palette Integration

Access management and utility features via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

**Right-Click Menu Only** (hidden from Command Palette):

- `additionalContextMenus.copyFunction` - Copy Function
- `additionalContextMenus.copyFunctionToFile` - Copy Function to File
- `additionalContextMenus.moveFunctionToFile` - Move Function to File
- `additionalContextMenus.copySelectionToFile` - Copy Selection to File
- `additionalContextMenus.moveSelectionToFile` - Move Selection to File
- `additionalContextMenus.generateEnum` - Generate Enum from Union Type
- `additionalContextMenus.generateCronTimer` - Generate Cron Expression

**Command Palette Accessible**:

- `Additional Context Menus: Enable` - Enable the extension
- `Additional Context Menus: Disable` - Disable the extension
- `Additional Context Menus: Save All` - Save all open files
- `Additional Context Menus: Open in Terminal` - Open terminal at file location
- `Additional Context Menus: Show Output Channel` - View extension logs
- `Additional Context Menus: Debug Context Variables` - Inspect extension state
- `Additional Context Menus: Refresh Context Variables` - Force re-detection
- `Additional Context Menus: Check Keybinding Conflicts` - View keybinding config
- `Additional Context Menus: Enable Keybindings` - Enable custom keybindings
- `Additional Context Menus: Disable Keybindings` - Disable custom keybindings
- `Additional Context Menus: Generate .env File` - Generate env file
- `Additional Context Menus: Open Walkthrough` - Open getting started guide

**Explorer Right-Click**:

- `Additional Context Menus: Rename File to Convention` - Right-click a file or folder in the Explorer to rename to a naming convention

**Keyboard Shortcuts** (active when extension is enabled):

- `Ctrl+Alt+Shift+F` (`Cmd+Alt+Shift+F` on Mac) - Copy Function
- `Ctrl+Alt+Shift+E` (`Cmd+Alt+Shift+E` on Mac) - Copy Function to File
- `Ctrl+Alt+Shift+C` (`Cmd+Alt+Shift+C` on Mac) - Copy Selection to File
- `Ctrl+Alt+Shift+R` (`Cmd+Alt+Shift+R` on Mac) - Move Function to File
- `Ctrl+Alt+Shift+M` (`Cmd+Alt+Shift+M` on Mac) - Move Selection to File
- `Ctrl+Alt+Shift+A` (`Cmd+Alt+Shift+A` on Mac) - Save All
- `Ctrl+Alt+Shift+T` (`Cmd+Alt+Shift+T` on Mac) - Open in Terminal

---

## 📋 Requirements

- **VS Code**: Version 1.110.0 or higher
- **Node.js**: Version 20+ required for development
- **PNPM**: Package manager for dependency management (install with `npm install -g pnpm`)
- **Project Type**: Node.js project with `package.json` (for smart detection)
- **File Types**: TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`)
- **Optional**: Framework dependencies (React, Angular, Express, Next.js) for enhanced features

---

## ⚙️ Extension Settings

### 🎛️ Complete Configuration Reference

Additional Context Menus provides extensive configuration options:

### Core Settings

- `additionalContextMenus.enabled` (boolean, default: `true`) - Enable or disable the extension
- `additionalContextMenus.autoDetectProjects` (boolean, default: `true`) - Automatically detect Node.js projects
- `additionalContextMenus.supportedExtensions` (array, default: `[".ts", ".tsx", ".js", ".jsx"]`) - File extensions where context menus will be shown

### Code Copy Settings

- `additionalContextMenus.copyCode.insertionPoint` (string, default: `"smart"`) - Where to insert copied code
  - `"smart"` - Intelligently choose the best location
  - `"end"` - Insert at the end of the file
  - `"beginning"` - Insert at the beginning of the file
- `additionalContextMenus.copyCode.handleImports` (string, default: `"merge"`) - How to handle import statements
  - `"merge"` - Merge with existing imports
  - `"duplicate"` - Allow duplicate imports
  - `"skip"` - Skip import statements
- `additionalContextMenus.copyCode.preserveComments` (boolean, default: `true`) - Preserve comments when copying code

### Save All Settings

- `additionalContextMenus.saveAll.showNotification` (boolean, default: `true`) - Show notification after saving all files
- `additionalContextMenus.saveAll.skipReadOnly` (boolean, default: `true`) - Skip read-only files when saving all

### Terminal Settings (v1.2.0+)

- `additionalContextMenus.terminal.type` (string, default: `"integrated"`) - Type of terminal to open
  - `"integrated"` - VS Code's built-in terminal
  - `"external"` - Custom external terminal application
  - `"system-default"` - Platform's default terminal
- `additionalContextMenus.terminal.externalTerminalCommand` (string, default: `""`) - Custom command for external terminal
  - Use `{{directory}}` as placeholder for directory path
  - Examples: `"wt -d {{directory}}"` (Windows Terminal), `"open -a iTerm {{directory}}"` (iTerm2)
- `additionalContextMenus.terminal.openBehavior` (string, default: `"parent-directory"`) - Which directory to open in terminal
  - `"parent-directory"` - Directory containing the file
  - `"workspace-root"` - Root of the workspace
  - `"current-directory"` - The file's directory

#### 🖥️ Terminal Configuration Examples

#### Power User Setups

**Windows Terminal (Recommended):**

```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "wt -d {{directory}}",
  "additionalContextMenus.terminal.openBehavior": "parent-directory"
}
```

**iTerm2 with Custom Profile (macOS):**

```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}",
  "additionalContextMenus.terminal.openBehavior": "workspace-root"
}
```

**Linux Development Setup:**

```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "gnome-terminal --working-directory={{directory}}",
  "additionalContextMenus.terminal.openBehavior": "parent-directory"
}
```

**Team/Workspace Recommended Settings:**

```json
{
  "additionalContextMenus.enabled": true,
  "additionalContextMenus.autoDetectProjects": true,
  "additionalContextMenus.copyCode.insertionPoint": "smart",
  "additionalContextMenus.copyCode.handleImports": "merge",
  "additionalContextMenus.copyCode.preserveComments": true,
  "additionalContextMenus.saveAll.showNotification": true,
  "additionalContextMenus.terminal.type": "integrated"
}
```

---

## 🚀 Supported Frameworks

### 🎯 Framework-Specific Intelligence

The extension automatically detects and provides enhanced functionality:

#### ⚛️ **React Projects**

- **Smart Component Detection**: Recognizes functional and class components
- **JSX Support**: Handles JSX syntax in function extraction and copying
- **Hook Extraction**: Specialized support for React hooks (functions starting with 'use')
- **Import Optimization**: Smart handling of React imports and dependencies

**Example Use Cases:**

- Extract custom hooks from components
- Move JSX components between files
- Copy utility functions with proper React imports

#### 🅰️ **Angular Projects**

- **Service Detection**: Identifies Angular services and components
- **Decorator Support**: Preserves Angular decorators during code operations
- **TypeScript Integration**: Full TypeScript support for Angular development
- **Module Awareness**: Understands Angular module structure

**Example Use Cases:**

- Extract services from components
- Move utility functions between Angular modules
- Copy component methods with proper typing

#### 🚂 **Express Projects**

- **Route Handler Detection**: Identifies Express route handlers and middleware
- **Server-side Logic**: Optimized for Node.js server development patterns
- **API Structure**: Understands REST API and middleware patterns

**Example Use Cases:**

- Extract middleware functions
- Move route handlers between files
- Copy utility functions for server logic

#### ▲ **Next.js Projects**

- **Full-Stack Support**: Handles both client and server-side code
- **API Routes**: Special handling for Next.js API route patterns
- **SSR/SSG Functions**: Supports `getServerSideProps`, `getStaticProps`
- **React Integration**: Combines React and Next.js specific features

**Example Use Cases:**

- Extract API route handlers
- Move page components and their data fetching logic
- Copy utility functions between client and server code

#### 📝 **TypeScript & JavaScript**

- **ES6+ Syntax**: Full support for modern JavaScript features
- **Type Safety**: Maintains TypeScript types during code operations
- **Import/Export**: Smart handling of ES modules and CommonJS
- **JSDoc Support**: Preserves documentation comments

---

## ❓ Troubleshooting & FAQ

### 🚨 Common Issues & Solutions

#### Context Menus Not Appearing

**Problem**: Right-click context menus don't show Additional Context Menus options

**Solutions:**

1. **Check Project Type**: Ensure you're in a Node.js project with `package.json`
2. **Verify File Type**: Context menus appear only in `.ts`, `.tsx`, `.js`, `.jsx` files
3. **Extension Status**: Run `Additional Context Menus: Debug Context Variables` to check status
4. **Refresh Detection**: Use `Additional Context Menus: Refresh Context Variables`

#### Function Detection Issues

**Problem**: "Copy Function" doesn't detect function at cursor

**Solutions:**

1. **Cursor Position**: Ensure cursor is inside the function body or name
2. **Valid Syntax**: Function must have valid JavaScript/TypeScript syntax
3. **Supported Types**: Check if your function type is supported (see usage guide)
4. **File Extension**: Ensure file has correct extension (`.ts`, `.tsx`, `.js`, `.jsx`)

#### Terminal Not Opening

**Problem**: "Open in Terminal" command fails

**Solutions:**

1. **Check Configuration**: Verify terminal settings in VS Code preferences
2. **Platform Support**: Ensure your OS is supported (Windows/macOS/Linux)
3. **External Terminal**: If using external terminal, verify command syntax
4. **Fallback**: Extension automatically falls back to integrated terminal

#### Import Handling Problems

**Problem**: Imports not merged correctly when copying code

**Solutions:**

1. **Configuration**: Check `additionalContextMenus.copyCode.handleImports` setting
2. **File Structure**: Ensure proper ES module or CommonJS structure
3. **Import Style**: Use consistent import style throughout project

### 📚 Frequently Asked Questions

**Q: Can I use this extension in non-Node.js projects?**
A: The extension requires a Node.js project with `package.json` for smart detection. Basic file operations might work without it.

**Q: Does this work with other frameworks like Vue or Svelte?**
A: The extension currently detects React, Angular, Express, and Next.js projects. Basic file operations work in any Node.js project, but framework-specific features are limited to supported frameworks.

**Q: How does the extension handle large files?**
A: The extension is optimized for performance and can handle large files. Progress indicators appear for operations with 5+ files.

**Q: Can I customize where code gets inserted?**
A: Yes! Configure `insertionPoint` to "smart" (default), "beginning", or "end" in settings.

### 🔍 Debugging Steps

1. **Enable Debug Output**: `Additional Context Menus: Show Output Channel`
2. **Check Extension State**: `Additional Context Menus: Debug Context Variables`
3. **Refresh Detection**: `Additional Context Menus: Refresh Context Variables`
4. **Review Configuration**: Check all settings in VS Code preferences
5. **Report Issues**: Use [GitHub Issues](https://github.com/Vijay431/additional-contexts-menu/issues) with debug output

---

## 🐛 Known Issues & Limitations

- **Project Detection**: Context menus only appear in Node.js projects with `package.json`
- **Syntax Requirements**: Function detection requires valid JavaScript/TypeScript syntax
- **Import Merging**: Complex import scenarios may require manual adjustment
- **Large Files**: Very large files (>10MB) may experience slower function detection

**Reporting Issues**: Please report problems on our [GitHub repository](https://github.com/Vijay431/additional-contexts-menu/issues) with:

- VS Code version
- Extension version
- Debug output from `Show Output Channel`
- Steps to reproduce

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

### [2.0.0] - Latest

- **📝 Copy Function to File**: Copy function at cursor position to target file
- **📝 Move Function to File**: Move function at cursor position to target file (removes from source)
- **⌨️ Keyboard Shortcuts**: Complete keybinding system with 7 shortcuts for core commands
- **🔧 Enhanced Context Menu Visibility**: All commands properly available in command palette and context menus
- **📦 Complete Command Palette Coverage**: All 20 commands registered in package.json
- **🎯 Function Detection Context**: Smart context variable for function-aware menu visibility
- **🔄 Command Renaming**: More accurate naming (Copy/Move Selection to File)
- **🏗️ Service Cleanup**: Removed unused services (BulkFileRenamer, Gitignore)
- **📚 Documentation Corrections**: Accurate service count (11)

### [1.2.0] - Previous Release

- **🖥️ Cross-Platform Terminal Integration**: Right-click "Open in Terminal" with intelligent platform detection
- **🔧 Three Terminal Types**: Integrated, External, and System Default with automatic fallbacks
- **⚙️ Configurable Directory Behaviors**: Parent directory, workspace root, or current directory options
- **🌐 Robust Cross-Platform Support**: Windows (cmd/PowerShell), macOS (Terminal.app), Linux (auto-detection)
- **🛠️ Enhanced GitHub Infrastructure**: Updated templates, issue tracking, and comprehensive wiki
- **📚 Custom External Terminal Support**: User-configurable commands with directory placeholders

### [1.1.0] - Previous Release

- **📊 Status Bar Integration**: Visual project status indicators with framework-specific icons
- **🔧 Enhanced Command System**: New debug and management commands for better control
- **⚙️ Expanded Configuration**: Enhanced settings for project detection and status management

### [1.0.0] - Initial Release

- Enhanced right-click context menus for Node.js development
- Support for React, Angular, Express, Next.js projects
- TypeScript and JavaScript intelligent code operations
- Copy Function feature with AST-based function detection
- Copy to Existing File with smart import handling
- Move to Existing File with conflict resolution
- Save All functionality with progress feedback

---

## ⚡ Performance & Reliability

### 🚀 Optimized for Professional Development

**Build Performance:**

- ⚡ **Lightning Fast Builds**: esbuild compilation in ~1 second (20x faster than webpack)
- 🔄 **Instant Rebuilds**: Near-instant watch mode for development
- 🎯 **Smart Bundling**: Tree-shaking eliminates unused dependencies

### 🚀 Performance Optimizations

- **Lazy-Loaded Services**: Generator services (Enum, Env, Cron) load only when needed
- **On-Demand Features**: Rarely-used generators load in small chunks when invoked

**Runtime Performance:**

- 🧠 **Intelligent Caching**: Project detection and file discovery results cached
- 📊 **Memory Efficient**: Optimized for large codebases and complex project structures
- ⚡ **Fast Function Detection**: AST-based parsing via TypeScript Compiler API for accurate results
- 🔄 **Background Processing**: Non-blocking operations don't interrupt coding

### 🛡️ Enterprise-Grade Quality Assurance

**Reliability Engineering:**

- 🛡️ **Error Boundary Protection**: Continues working with malformed code
- 🔄 **Graceful Degradation**: Handles unsupported files without crashes
- ⚡ **Concurrent Safety**: Multiple commands execute simultaneously without conflicts
- 🎛️ **Robust Configuration**: Validates and sanitizes all user settings

**Code Quality Standards:**

- 📝 **TypeScript Strict Mode**: Type safety and compile-time error detection
- 🎨 **ESLint Compliance**: Strict linting rules for code consistency
- ✨ **Prettier Formatting**: Consistent code style across entire codebase
- 🔬 **Production Tested**: Extensively validated in real-world environments

---

## 🏗️ Technical Architecture

### 🎯 Service-Oriented Design

Built with clear separation of concerns and enterprise-grade patterns:

#### 🎮 **Core Managers**

- **ExtensionManager**: Coordinates lifecycle and component initialization
- **ContextMenuManager**: Handles command registration and menu interactions

#### 🔧 **Specialized Services** (Singleton Pattern)

- **ProjectDetectionService**: Detects Node.js projects and frameworks (React, Angular, etc.)
- **ConfigurationService**: Manages settings and real-time configuration changes
- **FileDiscoveryService**: Discovers compatible files with smart filtering
- **FileSaveService**: Handles bulk save operations with progress feedback
- **CodeAnalysisService**: AST-based function detection using TypeScript Compiler API for accurate results
- **TerminalService**: Cross-platform terminal integration with three modes (integrated/external/system-default)

#### ⚡ **Performance Optimizations**

- **Intelligent Caching**: Project detection and file discovery results
- **Lazy Loading**: Services initialize only when needed
- **Background Processing**: Non-blocking operations
- **Memory Management**: Automatic cache cleanup on workspace changes

#### 🔒 **Reliability Patterns**

- **Error Boundaries**: Graceful handling of malformed code
- **Fallback Mechanisms**: Automatic degradation for unsupported scenarios
- **Event-Driven**: Reactive updates to workspace and configuration changes
- **Resource Cleanup**: Proper disposal of all resources and listeners

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### 🛠️ Development Setup

**Prerequisites**: Node.js 20+ required for development (20, 22, 24 supported)

```bash
# 1. Clone and setup
git clone https://github.com/Vijay431/additional-contexts-menu.git
cd additional-contexts-menu
pnpm install

# 2. Build
pnpm run build

# 3. Launch development environment
# Press F5 in VS Code to launch Extension Development Host
```

### 📋 Available Development Commands

| Command             | Description                                     | Performance         |
| ------------------- | ----------------------------------------------- | ------------------- |
| `pnpm run build`    | Build extension using TypeScript esbuild config | ⚡ ~1 second        |
| `pnpm run watch`    | Watch mode for development                      | 🔄 Instant rebuilds |
| `pnpm run package`  | Production build with optimizations             | 📦 Optimized        |
| `pnpm run lint`     | Run ESLint on src directory                     | 🎨 Code quality     |
| `pnpm run lint:fix` | Auto-fix ESLint issues                          | 🔧 Auto-fix         |
| `pnpm run format`   | Format code using Prettier                      | ✨ Consistent style |

---

## 📄 License

This extension is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Developer

**Vijay Gangatharan**

- 📧 Email: <vijayanand431@gmail.com>
- 🐙 [GitHub Repository](https://github.com/Vijay431/additional-contexts-menu)
- 🌐 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus)

---

## 🙏 Acknowledgments

Special thanks to:

- The VS Code Extension API team for excellent documentation
- The TypeScript and JavaScript developer communities
- All contributors and users who provide feedback and suggestions

---

## 💬 What Developers Say

> "Cut my refactoring time by 80%. Can't imagine working without it now."
> — _React Developer at Tech Startup_

> "The enum generation alone saves me hours every week."
> — _Full-Stack TypeScript Developer_

> "Finally, a context menu that understands my Angular projects!"
> — _Angular Enterprise Developer_

---

## 📈 Extension Stats

- 🔄 **Lazy-Loaded Services** - Generators load on demand
- ⚡ **~1 Second Builds** - esbuild powered

[**Rate this extension on Marketplace** →](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus&ssr=false#review-details)

---

<div align="center">

**🚀 Enjoy productive coding with Additional Context Menus! 🚀**

_If this extension helps your workflow, please consider [leaving a review](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus&ssr=false#review-details) ⭐_

</div>
