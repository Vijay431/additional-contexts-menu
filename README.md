# Additional Context Menus - VS Code Extension

🚀 **Enhanced right-click context menus for Node.js development** with intelligent code operations for React, Angular, Express, Next.js, TypeScript, and JavaScript projects.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VijayGangatharan.additional-context-menus)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/VijayGangatharan.additional-context-menus)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus)

---

## 🎯 Quick Start

**New to Additional Context Menus?** Get productive in 2 minutes:

1. **Install** the extension from VS Code Marketplace
2. **Open** any Node.js project with `package.json`
3. **Right-click** in a TypeScript/JavaScript file to see new context menu options
4. **Try it out:** Select some code → Right-click → "Copy Lines to File"

### 💡 Common Workflows

| Workflow | Steps | When to Use |
|----------|-------|-------------|
| **Extract React Component** | Select JSX → Right-click → Copy/Move to File | Refactoring large components |
| **Share Utility Function** | Click in function → Right-click → Copy Function | Reusing helper functions |
| **Quick Terminal Access** | Right-click anywhere → Open in Terminal | Fast directory navigation |
| **Bulk Save Modified Files** | Right-click → Save All | Before commits or builds |

---

## ✨ Features Overview

### 🎯 Core Functionality

#### Main Features (Command Palette + Right-Click Menu)
- 🎯 **Copy Function** - AST-based function detection and copying with intelligent import handling
- 📋 **Copy Lines to File** - Smart code copying with import conflict resolution
- ✂️ **Move Lines to File** - Intelligent code moving with automatic cleanup
- 💾 **Save All** - Enhanced save functionality with progress feedback and read-only handling
- 🖥️ **Open in Terminal** - Cross-platform terminal integration

#### Extension Management (Command Palette Only)
- ⚙️ **Enable/Disable Extension** - Global extension control via command palette

### Project Intelligence

- 🔍 **Automatic Project Detection** - Detects React, Angular, Express, and Next.js projects
- 📁 **Smart File Discovery** - Finds compatible files for code operations
- 🔧 **Context-Aware Menus** - Shows relevant options based on file type and project
- 📝 **TypeScript & JavaScript Support** - Full support for .ts, .tsx, .js, .jsx files

### Code Operations

- 🧠 **AST-Based Analysis** - Uses Babel parser for accurate code parsing
- 🔀 **Import Management** - Merge, duplicate, or skip import statements
- 📍 **Smart Insertion** - Intelligent code placement (smart, end, beginning)
- 💬 **Comment Preservation** - Maintains code comments during operations

### Accessibility

- 🔍 **Dual Access Patterns** - Main features accessible via both command palette and right-click menu
- ⚙️ **Management Commands** - Enable/disable functionality available via command palette only
- 🎯 **Context-Aware Display** - Menus shown based on file type, project detection, and extension state
- 🌐 **Cross-Platform Terminal** - Intelligent terminal integration across Windows, macOS, and Linux

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
3. **Automatic detection** of function boundaries using AST analysis
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

Access all features via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Additional Context Menus: Enable` - Enable the extension
- `Additional Context Menus: Disable` - Disable the extension
- `Additional Context Menus: Show Output Channel` - Open debug logs for troubleshooting
- `Additional Context Menus: Debug Context Variables` - Inspect extension state and context variables
- `Additional Context Menus: Refresh Context Variables` - Reload project detection and refresh context
- `Additional Context Menus: Check Keybinding Conflicts` - Detect potential keyboard shortcut conflicts
- `Additional Context Menus: Enable Keybindings` - Enable keyboard shortcuts for all commands
- `Additional Context Menus: Disable Keybindings` - Disable keyboard shortcuts for all commands

---

## ⌨️ Keyboard Shortcuts

**⚠️ Smart Conflict Prevention**: Keybindings are **disabled by default** to avoid conflicts with your existing shortcuts.

### Default Keybindings

| Command | Windows/Linux | macOS | Description |
|---------|---------------|-------|-------------|
| Copy Function | `Ctrl+Alt+Shift+F` | `Cmd+Alt+Shift+F` | Copy function at cursor position |
| Copy Code to File | `Ctrl+Alt+Shift+C` | `Cmd+Alt+Shift+C` | Copy selected code to another file |
| Move Code to File | `Ctrl+Alt+Shift+M` | `Cmd+Alt+Shift+M` | Move selected code to another file |
| Save All Files | `Ctrl+Alt+Shift+A` | `Cmd+Alt+Shift+A` | Save all open files with progress |

### Enabling Keyboard Shortcuts

⚠️ **Important**: Check for conflicts before enabling keybindings!

1. **Check for conflicts** (recommended):
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run `Additional Context Menus: Check Keybinding Conflicts`
   - Review any reported conflicts

2. **Enable keybindings**:
   - Use Command Palette: `Additional Context Menus: Enable Keybindings`
   - Or set `additionalContextMenus.enableKeybindings` to `true` in settings

3. **Customize shortcuts** (optional):
   - Open Keyboard Shortcuts (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
   - Search for "Additional Context Menus"
   - Modify shortcuts as needed

### Safety Features

- **Disabled by default** - Prevents conflicts with existing shortcuts
- **Conflict detection** - Built-in command to check for potential conflicts
- **Conditional activation** - Shortcuts only work when appropriate (e.g., with selected text)
- **Context-aware** - Keybindings respect file types and project detection

---

## 📋 Requirements

- **VS Code**: Version 1.102.0 or higher
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

### Keyboard Shortcut Settings

- `additionalContextMenus.enableKeybindings` (boolean, default: `false`) - Enable keyboard shortcuts for context menu commands
  - ⚠️ **Warning**: Check for conflicts with existing keybindings before enabling
- `additionalContextMenus.showKeybindingsInMenu` (boolean, default: `true`) - Show keyboard shortcuts in context menu items when keybindings are enabled

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
  "additionalContextMenus.enableKeybindings": false,
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

**Q: Why are keyboard shortcuts disabled by default?**
A: To prevent conflicts with existing VS Code shortcuts. Use `Check Keybinding Conflicts` command before enabling.

**Q: Can I use this extension in non-Node.js projects?**
A: The extension requires a Node.js project with `package.json` for smart detection. Basic file operations might work without it.

**Q: Does this work with other frameworks like Vue or Svelte?**
A: Yes! The extension detects Vue and Svelte projects and provides basic functionality. Full framework-specific features are planned.

**Q: How does the extension handle large files?**
A: The extension is optimized for performance and can handle large files. Progress indicators appear for operations with 5+ files.

**Q: Can I customize where code gets inserted?**
A: Yes! Configure `insertionPoint` to "smart" (default), "beginning", or "end" in settings.

### 🔍 Debugging Steps

1. **Enable Debug Output**: `Additional Context Menus: Show Output Channel`
2. **Check Extension State**: `Additional Context Menus: Debug Context Variables`
3. **Refresh Detection**: `Additional Context Menus: Refresh Context Variables`
4. **Review Configuration**: Check all settings in VS Code preferences
5. **Report Issues**: Use [GitHub Issues](https://github.com/Vijay431/file-insights/issues) with debug output

---

## 🐛 Known Issues & Limitations

- **Project Detection**: Context menus only appear in Node.js projects with `package.json`
- **Syntax Requirements**: Function detection requires valid JavaScript/TypeScript syntax
- **Import Merging**: Complex import scenarios may require manual adjustment
- **Large Files**: Very large files (>10MB) may experience slower function detection

**Reporting Issues**: Please report problems on our [GitHub repository](https://github.com/Vijay431/file-insights/issues) with:
- VS Code version
- Extension version
- Debug output from `Show Output Channel`
- Steps to reproduce

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

### [1.2.0] - Latest

- **🖥️ Cross-Platform Terminal Integration**: Right-click "Open in Terminal" with intelligent platform detection
- **🔧 Three Terminal Types**: Integrated, External, and System Default with automatic fallbacks
- **⚙️ Configurable Directory Behaviors**: Parent directory, workspace root, or current directory options
- **🌐 Robust Cross-Platform Support**: Windows (cmd/PowerShell), macOS (Terminal.app), Linux (auto-detection)
- **🛠️ Enhanced GitHub Infrastructure**: Updated templates, issue tracking, and comprehensive wiki
- **📚 Custom External Terminal Support**: User-configurable commands with directory placeholders

### [1.1.0] - Previous Release

- **⌨️ Keyboard Shortcuts System**: Complete keybinding support with conflict detection and safety features
- **📊 Status Bar Integration**: Visual project status indicators with framework-specific icons
- **🔧 Enhanced Command System**: New debug and management commands for better control
- **⚙️ Expanded Configuration**: Enhanced settings for keybinding and status bar management
- **🛡️ Safety First**: Keybindings disabled by default to prevent conflicts with existing shortcuts

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
- 📦 **Minimal Bundle Size**: 24.75KB production bundle (95.9% reduction from 601KB)
- 🔄 **Instant Rebuilds**: Near-instant watch mode for development
- 🎯 **Smart Bundling**: Tree-shaking eliminates unused dependencies

**Runtime Performance:**
- 🧠 **Intelligent Caching**: Project detection and file discovery results cached
- 📊 **Memory Efficient**: Optimized for large codebases and complex project structures
- ⚡ **Fast Function Detection**: Regex-based parsing for millisecond response times
- 🔄 **Background Processing**: Non-blocking operations don't interrupt coding

### 🛡️ Enterprise-Grade Quality Assurance

**Comprehensive Testing:**
- 🧪 **37 Comprehensive Tests**: Covers real-world production scenarios
- ✅ **100% Success Rate**: All tests pass consistently (37/37 passing)
- 🎯 **Edge Case Coverage**: Large files, special characters, rapid operations
- 📈 **Performance Testing**: Stress-tested with nested functions, concurrent operations
- ⚙️ **Configuration Validation**: Tested with invalid values and extreme configurations

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
- **CodeAnalysisService**: Parses JavaScript/TypeScript using optimized regex patterns
- **TerminalService**: Cross-platform terminal integration (v1.2.0+)
- **StatusBarService**: Real-time project status display (v1.1.0+)

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

```bash
# 1. Clone and setup
git clone https://github.com/Vijay431/additional-contexts-menu.git
cd additional-contexts-menu
npm install

# 2. Build and test
npm run compile
npm test

# 3. Launch development environment
# Press F5 in VS Code to launch Extension Development Host
```

### 📋 Available Development Commands

| Command | Description | Performance |
|---------|-------------|-------------|
| `npm run compile` | Compile TypeScript using esbuild | ⚡ ~1 second |
| `npm run watch` | Watch mode for development | 🔄 Instant rebuilds |
| `npm run package` | Production build with optimizations | 📦 ~25KB output |
| `npm run lint` | Run ESLint on src directory | 🎨 Code quality |
| `npm run format` | Format code using Prettier | ✨ Consistent style |
| `npm test` | Run extension tests | 🧪 37 tests |
| `npm run test:watch` | Continuous testing during development | 🔄 Live feedback |

---

## 📄 License

This extension is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Developer

**Vijay Gangatharan**
- 📧 Email: <vijayanand431@gmail.com>
- 🐙 [GitHub Repository](https://github.com/Vijay431/file-insights)
- 🌐 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus)

---

## 🙏 Acknowledgments

Special thanks to:
- The VS Code Extension API team for excellent documentation
- The TypeScript and JavaScript developer communities
- All contributors and users who provide feedback and suggestions

---

<div align="center">

**🚀 Enjoy productive coding with Additional Context Menus! 🚀**

*If this extension helps your workflow, please consider [leaving a review](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus&ssr=false#review-details) ⭐*

</div>
