# Additional Context Menus - VS Code Extension

Enhanced right-click context menus for Node.js development with intelligent code operations for React, Angular, Express, Next.js, TypeScript, and JavaScript projects.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VijayGangatharan.additional-context-menus)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

### Smart Context Menus

- 🎯 **Copy Function** - AST-based function detection and copying with intelligent import handling
- 📋 **Copy to Existing File** - Smart code copying with import conflict resolution
- ✂️ **Move to Existing File** - Intelligent code moving with automatic cleanup
- 💾 **Save All** - Enhanced save functionality with progress feedback and read-only handling

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

### Commands

Additional Context Menus provides command palette integration (accessible via `Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Additional Context Menus: Enable` - Enable the extension
- `Additional Context Menus: Disable` - Disable the extension
- `Additional Context Menus: Show Output Channel` - Open debug logs for troubleshooting

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

### [Unreleased]

- Enhanced right-click context menus for Node.js development
- Support for React, Angular, Express, Next.js projects
- TypeScript and JavaScript intelligent code operations
- Copy Function feature with AST-based function detection
- Copy to Existing File with smart import handling
- Move to Existing File with conflict resolution
- Save All functionality with progress feedback

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

- `npm run compile` - Compile TypeScript using webpack
- `npm run watch` - Watch mode for development
- `npm run package` - Production build with optimizations
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
