# Changelog

All notable changes to the "Additional Context Menus" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-09-23

### Added

- **🖥️ Cross-Platform Terminal Integration**: New "Open in Terminal" functionality with comprehensive platform support
  - Right-click context menu integration for quick terminal access
  - **Three terminal types**: Integrated, External, System Default with intelligent detection
  - **Cross-platform support**: Windows (cmd/PowerShell), macOS (Terminal.app), Linux (auto-detection)
  - **Configurable directory behaviors**: Parent directory, workspace root, current directory
  - **Robust error handling**: Permission validation, path checking, graceful fallbacks
  - **Custom external terminal support**: User-configurable commands with directory placeholders

- **⚙️ Enhanced Configuration System**: New terminal-specific settings
  - `additionalContextMenus.terminal.type` - Choose terminal type (integrated/external/system-default)
  - `additionalContextMenus.terminal.externalTerminalCommand` - Custom external terminal command
  - `additionalContextMenus.terminal.openBehavior` - Directory selection behavior

- **🧪 Expanded Testing Infrastructure**: Terminal service testing and validation
  - Comprehensive terminal service test suite with cross-platform scenarios
  - Enhanced test utilities for better testing architecture
  - Error condition and configuration edge case testing

- **📚 GitHub Repository Management**: Enhanced community infrastructure
  - Updated Pull Request templates with terminal functionality testing
  - Enhanced Issue templates with terminal-specific bug reporting
  - New terminal configuration issue template
  - Comprehensive GitHub wiki with detailed guides and API reference

### Enhanced

- **🖱️ Context Menu System**: Added terminal integration to existing menu structure
  - Terminal option appears for all file types (not just Node.js projects)
  - Seamless integration with existing Copy, Move, and Save All operations
  - Consistent behavior across different project types and frameworks

- **🏗️ Service Architecture**: Added TerminalService to existing service ecosystem
  - New TerminalService singleton with full lifecycle management
  - Integration with existing ConfigurationService for settings management
  - Consistent error handling and logging patterns

- **🔧 Node.js Compatibility**: Verified and documented Node.js 16-24 compatibility across all project components
  - Updated all documentation to explicitly state Node.js version support
  - Enhanced GitHub workflows to use Node.js 20.x for tooling consistency
  - Fixed @types/node dependency version alignment
  - Updated system requirements in installation documentation

- **📚 Documentation Improvements**: Comprehensive documentation updates for consistency and accuracy
  - Fixed SECURITY.md to reference correct extension name and include Node.js compatibility information
  - Completely updated docs/installation.md with correct extension content and settings
  - Enhanced README.md, CONTRIBUTING.md, and CLAUDE.md with Node.js version requirements
  - Updated GitHub wiki with Node.js compatibility information

- **🛠️ Development Infrastructure**: Improved development environment setup
  - Updated GitHub workflows for consistent Node.js version usage (20.x for tooling)
  - Maintained comprehensive Node.js testing matrix (16.x, 18.x, 20.x, 22.x, 24.x) in CI
  - Enhanced security audit workflows with latest tooling versions
  - Verified TypeScript and esbuild configurations for broad Node.js compatibility

### Technical Improvements

- **🔧 Code Quality**: Enhanced development infrastructure
  - Updated GitHub templates for better contribution experience
  - Improved testing coverage for new terminal functionality
  - Enhanced documentation and API reference materials

- **📖 Documentation**: Comprehensive updates for v1.2.0
  - GitHub wiki with detailed terminal integration guide
  - Updated README.md with terminal features and configuration examples
  - Enhanced troubleshooting documentation for cross-platform issues

- **🌐 Cross-Platform Reliability**: Robust platform detection and handling
  - Automatic terminal application detection on Linux systems
  - Intelligent fallback mechanisms for unsupported configurations
  - Platform-specific command generation and error handling

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
