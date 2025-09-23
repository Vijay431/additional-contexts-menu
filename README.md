# Additional Context Menus - VS Code Extension

Enhanced right-click context menus for Node.js development with intelligent code operations for React, Angular, Express, Next.js, TypeScript, and JavaScript projects.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VijayGangatharan.additional-context-menus)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

### Smart Context Menus

- 🎯 **Copy Function** - AST-based function detection and copying with intelligent import handling
- 📋 **Copy to Existing File** - Smart code copying with import conflict resolution
- ✂️ **Move to Existing File** - Intelligent code moving with automatic cleanup
- 💾 **Save All** - Enhanced save functionality with progress feedback and read-only handling
- 🖥️ **Open in Terminal** - Cross-platform terminal integration (NEW in v1.2.0)

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

### Status Bar Integration

- 📊 **Visual Project Status** - Real-time display of extension and project state in VS Code status bar
- 🎯 **Framework Detection** - Shows detected frameworks with specific icons:
  - ⚛️ **React** projects
  - 🅰️ **Angular** projects  
  - 🚂 **Express** projects
  - ▲ **Next.js** projects
- 🔍 **Project State Indicators** - Clear visual feedback for:
  - Extension enabled/disabled status
  - Node.js project detection
  - Multi-framework project support
- 🖱️ **Interactive Debug** - Click status bar item to debug context variables
- 🎨 **Color-Coded Status** - Different background colors for various states:
  - Prominent background for active projects
  - Warning background when extension is disabled
  - Normal background for non-Node.js projects

## Installation

### From VS Code Marketplace

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install VijayGangatharan.additional-context-menus`
4. Press Enter

### From Command Line

```bash
code --install-extension VijayGangatharan.additional-context-menus
```

## Usage

The extension automatically detects Node.js projects and enhances right-click context menus for supported file types.

### Copy Function

1. Right-click in a TypeScript/JavaScript file
2. Select "Copy Function" from the context menu
3. The extension will detect and copy the function at your cursor position

### Copy/Move Code

1. Select the code you want to copy or move
2. Right-click on the selection
3. Choose "Copy to Existing File" or "Move to Existing File"
4. Select the target file from the quick pick menu
5. The code will be intelligently inserted with proper import handling

### Save All

- Right-click anywhere in the editor
- Select "Save All" to save all modified files with progress feedback

### Open in Terminal (v1.2.0+)

1. Right-click on any file in the editor
2. Select "Open in Terminal" from the context menu
3. Terminal opens in the appropriate directory based on your configuration
4. Works across Windows, macOS, and Linux with intelligent platform detection

**Terminal Types:**
- **Integrated** - VS Code's built-in terminal (default)
- **External** - Custom external terminal application
- **System Default** - Platform's default terminal (cmd/PowerShell, Terminal.app, gnome-terminal, etc.)

### Commands

Additional Context Menus provides command palette integration (accessible via `Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Additional Context Menus: Enable` - Enable the extension
- `Additional Context Menus: Disable` - Disable the extension
- `Additional Context Menus: Show Output Channel` - Open debug logs for troubleshooting
- `Additional Context Menus: Debug Context Variables` - Inspect extension state and context variables
- `Additional Context Menus: Refresh Context Variables` - Reload project detection and refresh context
- `Additional Context Menus: Check Keybinding Conflicts` - Detect potential keyboard shortcut conflicts
- `Additional Context Menus: Enable Keybindings` - Enable keyboard shortcuts for all commands
- `Additional Context Menus: Disable Keybindings` - Disable keyboard shortcuts for all commands

## Keyboard Shortcuts

Additional Context Menus provides optional keyboard shortcuts for all core operations. **Keybindings are disabled by default** to prevent conflicts with existing shortcuts.

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

## Requirements

- Visual Studio Code version 1.102.0 or higher
- Node.js project with package.json (for project detection)
- TypeScript/JavaScript files (.ts, .tsx, .js, .jsx)

## Extension Settings

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

#### Terminal Configuration Examples

**Windows Terminal:**
```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "wt -d {{directory}}"
}
```

**iTerm2 (macOS):**
```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"
}
```

**System Default with Workspace Root:**
```json
{
  "additionalContextMenus.terminal.type": "system-default",
  "additionalContextMenus.terminal.openBehavior": "workspace-root"
}
```

## Supported Frameworks

The extension automatically detects and provides enhanced functionality for:

- **React** - Component-based development with JSX support
- **Angular** - Service and component development
- **Express** - Server-side routing and middleware
- **Next.js** - Full-stack React framework
- **TypeScript** - Enhanced type checking and IntelliSense
- **JavaScript** - ES6+ syntax support

## Known Issues

Please report any issues on our [GitHub repository](https://github.com/Vijay431/file-insights/issues).

- Context menus only appear in Node.js projects with package.json
- Function detection requires valid JavaScript/TypeScript syntax

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

## Performance & Reliability

Additional Context Menus is optimized for speed, efficiency, and production-ready reliability:

- **⚡ Lightning Fast Builds**: esbuild compilation in ~1 second (20x faster than webpack)
- **📦 Minimal Bundle Size**: 24.75KB production bundle (95.9% reduction from 601KB)
- **🔄 Instant Rebuilds**: Near-instant watch mode for development
- **🧪 Enterprise-Grade Testing**: 37 comprehensive tests with 100% success rate
- **🛡️ Robust Error Handling**: Graceful handling of edge cases and extreme conditions
- **📊 Production Ready**: Proven reliability under stress testing scenarios

## Quality Assurance

Additional Context Menus maintains the highest quality standards through comprehensive testing:

### Test Coverage Excellence

- **37 Comprehensive Tests**: Covers real-world production scenarios
- **100% Success Rate**: All tests pass consistently (37/37 passing)
- **Edge Case Testing**: Handles extreme conditions like large files, special characters, and rapid operations
- **Performance Testing**: Stress-tested with nested functions, concurrent operations, and memory pressure
- **Configuration Testing**: Validated with invalid values, rapid changes, and extreme configurations

### Reliability Features

- **Error Boundary Protection**: Extension continues working even with malformed code or unusual file structures
- **Graceful Degradation**: Handles unsupported file types and edge cases without crashes
- **Concurrent Operation Safety**: Multiple commands can execute simultaneously without conflicts
- **Memory Efficiency**: Optimized for large codebases and complex project structures

### Development Quality

- **TypeScript Strict Mode**: Ensures type safety and catches errors at compile time
- **ESLint Compliance**: Code adheres to strict linting rules for consistency
- **Prettier Formatting**: Maintains consistent code style across the entire codebase
- **Production Testing**: Extensively tested in real-world development environments

## Architecture

Additional Context Menus follows a service-oriented architecture with clear separation of concerns:

### Core Components

- **ExtensionManager** - Coordinates extension lifecycle and component initialization
- **ContextMenuManager** - Handles command registration and menu interactions

### Services (Singleton Pattern)

- **ProjectDetectionService** - Detects Node.js projects and frameworks
- **ConfigurationService** - Manages extension settings and configuration changes
- **FileDiscoveryService** - Discovers compatible files for code operations
- **FileSaveService** - Handles "Save All" functionality with progress feedback
- **CodeAnalysisService** - Parses and analyzes JavaScript/TypeScript code using Babel parser

### Key Features

- **Smart Context Menus** - Conditionally shown based on project type and file compatibility
- **Code Copy/Move Operations** - Intelligent import handling and conflict resolution
- **Function Extraction** - AST-based function detection and copying
- **Project Auto-Detection** - Analyzes package.json to determine framework support

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to launch Extension Development Host
5. Run `npm test` to execute the test suite

### Available Commands

- `npm run compile` - Compile TypeScript using esbuild (⚡ ~1s)
- `npm run watch` - Watch mode for development with instant rebuilds
- `npm run package` - Production build with optimizations (~25KB output)
- `npm run lint` - Run ESLint on src directory
- `npm run format` - Format code using Prettier
- `npm test` - Run extension tests

## License

This extension is licensed under the [MIT License](LICENSE).

## Developer

- **Vijay Gangatharan**
- Email: <vijayanand431@gmail.com>
- [GitHub Repository](https://github.com/Vijay431/file-insights)

---

**Enjoy!** 🚀
