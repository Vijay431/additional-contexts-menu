# Changelog

All notable changes to the "Additional Context Menus" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-07-24

### Added

- **⌨️ Keyboard Shortcuts System**: Complete keybinding support with conflict detection
  - New `enableKeybindings` setting (default: false) to enable/disable keyboard shortcuts
  - New `showKeybindingsInMenu` setting (default: true) to control shortcut visibility in context menus
  - Default keybindings for all core commands:
    - `Ctrl+Alt+Shift+F` (`Cmd+Alt+Shift+F` on Mac) - Copy Function
    - `Ctrl+Alt+Shift+C` (`Cmd+Alt+Shift+C` on Mac) - Copy Code to File
    - `Ctrl+Alt+Shift+M` (`Cmd+Alt+Shift+M` on Mac) - Move Code to File
    - `Ctrl+Alt+Shift+A` (`Cmd+Alt+Shift+A` on Mac) - Save All Files
  - Keybinding conflict detection and management commands
  - Built-in safety with disabled-by-default setting to prevent conflicts

- **📊 Status Bar Integration**: Visual project status indicators
  - Framework-specific icons for React (⚛️), Angular (🅰️), Express (🚂), and Next.js (▲)
  - Real-time project detection status display
  - Extension state indicators (enabled/disabled, Node.js project detection)
  - Clickable status bar with debug functionality
  - Color-coded status (prominent for active projects, warning for disabled)

- **🔧 Enhanced Command System**: New debug and management commands
  - `Additional Context Menus: Debug Context Variables` - Inspect extension state
  - `Additional Context Menus: Refresh Context Variables` - Reload project detection
  - `Additional Context Menus: Check Keybinding Conflicts` - Detect potential conflicts
  - `Additional Context Menus: Enable Keybindings` - Enable keyboard shortcuts
  - `Additional Context Menus: Disable Keybindings` - Disable keyboard shortcuts

### Enhanced

- **⚙️ Configuration Management**: Expanded settings for better user control
  - Enhanced keybinding management with safety warnings
  - Improved project detection feedback through status bar
  - Better visual feedback for extension state changes

### Technical Improvements

- **🏗️ Architecture**: Added StatusBarService for centralized status management
- **🔄 Real-time Updates**: Status bar updates automatically on configuration and workspace changes
- **🛡️ Safety Features**: Keybindings disabled by default to prevent conflicts with existing shortcuts

## [1.0.0] - 2025-07-23

### Fixed

- **Critical Test Infrastructure**: Fixed path resolution bug in test runner that prevented extension discovery during automated testing
- **Extension Activation**: Resolved extension activation failures in test environments due to incorrect extensionDevelopmentPath calculation

### Added

- **🧪 Comprehensive Test Suite**: Expanded from 19 to 37 tests (94.7% increase) with enterprise-grade edge case coverage
- **🔧 Error Boundary Testing**: Added robust tests for extreme conditions including:
  - Large files with 1000+ functions
  - Special characters in file paths  
  - Rapid successive command executions
  - UTF-8 edge cases and unusual content
- **⚡ Performance & Stress Testing**: Added comprehensive tests for:
  - Deeply nested function structures (20+ levels)
  - Concurrent Save All operations
  - Memory pressure scenarios with large data sets
- **⚙️ Configuration Edge Case Testing**: Added tests for:
  - Rapid configuration changes
  - Invalid configuration values
  - Extreme configuration values (100+ extensions)
- **📁 Multi-workspace & File System Testing**: Added tests for:
  - Nested project structures
  - Very long file paths (10+ directory levels)
  - Files without extensions
  - Symbolic links and shortcuts
- **🧠 AST Parsing & Concurrent Operations Testing**: Added tests for:
  - Complex TypeScript syntax (generics, decorators, private fields)
  - JSX with complex props and nested components
  - Concurrent copy operations without conflicts
  - Malformed but parseable JavaScript edge cases

### Quality Assurance

- **✅ 100% Test Success Rate**: All 37 tests pass consistently (37/37 passing)
- **🔧 Code Quality**: Fixed all ESLint errors including regex escaping and missing braces
- **💅 Code Formatting**: Applied Prettier formatting across all test files
- **🏗️ Production Ready**: Enhanced error handling and graceful degradation for edge cases

### Developer Experience

- **📊 Comprehensive Coverage**: Tests now cover real-world production scenarios
- **🛡️ Robust Error Handling**: Extension handles extreme conditions gracefully without crashes
- **🔍 Better Debugging**: Enhanced logging and error reporting for complex scenarios
- **⚡ Reliable Performance**: Proven stability under stress testing conditions

## [1.0.0] - 2025-07-23

### Added

- Enhanced right-click context menus for Node.js development
- Support for React, Angular, Express, Next.js projects
- TypeScript and JavaScript intelligent code operations
- Copy Function feature with AST-based function detection
- Copy to Existing File with smart import handling
- Move to Existing File with conflict resolution
- Save All functionality with progress feedback
- Automatic Node.js project detection
- Configurable extension settings
- Smart code insertion with context awareness
- Import statement merging and deduplication
- Read-only file handling in Save All
- Extension enable/disable commands
- Output channel for debugging and logging

### Performance Improvements

- **Build System Migration**: Migrated from webpack to esbuild for dramatically improved performance
- **Build Speed**: 20x faster builds (~19 seconds → ~1 second)
- **Bundle Size**: 95.9% size reduction (601KB → 24.75KB production bundle)
- **Development Experience**: Near-instant rebuilds in watch mode
- **Bundle Analysis**: Added comprehensive bundle composition analysis script
- **Dependency Optimization**: Removed 99 unnecessary webpack-related packages

### Features

- **Smart Context Menus**: Conditionally shown based on project type and file compatibility
- **Function Extraction**: AST-based function detection and copying with proper syntax highlighting
- **Code Operations**: Intelligent copy/move operations with import conflict resolution
- **Project Detection**: Automatic detection of React, Angular, Express, and Next.js projects
- **Configuration**: Extensive settings for customizing behavior
- **Progress Feedback**: Visual feedback for long-running operations

### Configuration Options

- Enable/disable extension
- Auto-detect Node.js projects
- Supported file extensions (.ts, .tsx, .js, .jsx)
- Code insertion point (smart, end, beginning)
- Import handling (merge, duplicate, skip)
- Comment preservation
- Save All notifications
- Read-only file handling

### Commands

- `additionalContextMenus.copyFunction` - Copy Function
- `additionalContextMenus.copyCodeToFile` - Copy to Existing File
- `additionalContextMenus.moveCodeToFile` - Move to Existing File
- `additionalContextMenus.saveAll` - Save All
- `additionalContextMenus.enable` - Enable extension
- `additionalContextMenus.disable` - Disable extension
- `additionalContextMenus.showOutputChannel` - Show Output Channel

### Technical Changes

- Replaced webpack build system with esbuild for superior performance
- Added esbuild configuration with VS Code extension optimizations
- Implemented bundle analysis with metafile generation
- Removed unused dependencies (webpack, terser-webpack-plugin, ts-loader, recast)
- Updated all build scripts to use esbuild
- Added bundle size monitoring and performance reporting
- Maintained full VS Code extension compatibility
- Preserved all existing functionality with comprehensive test coverage

## [0.0.0] - Initial Development

### Added

- Initial project setup
- Core extension architecture
- Service-oriented design pattern
- TypeScript configuration
- Testing framework setup
- Build and packaging configuration
- ESLint and Prettier setup
- esbuild bundling (migrated from webpack)
- VS Code extension manifest
