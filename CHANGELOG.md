# Changelog

All notable changes to the "Additional Context Menus" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-05

### Added

- **🖥️ Open in Terminal in right-click menu**: `Open in Terminal` command now appears in the editor context menu (group `2_workspace@2`) in addition to its existing keyboard shortcut
- **⚙️ 6 utility commands in Command Palette**: `Show Output Channel`, `Debug Context Variables`, `Refresh Context Variables`, `Check Keybinding Conflicts`, `Enable Keybindings`, and `Disable Keybindings` are now declared in `package.json` and visible in the Command Palette
- **🎓 First-Run Walkthrough**: New `WalkthroughManager` displays a VS Code built-in Walkthrough on first install, introducing Copy Function, Copy Selection to File, and Open in Terminal features
- **🔄 Open Walkthrough Command**: `Additional Context Menus: Open Walkthrough` command allows users to reopen the walkthrough at any time via the Command Palette
- **📦 No package.json Detection**: Informational message shown when no `package.json` is found in the workspace, explaining that Node.js project detection is required
- **🛡️ ConfigValidator**: New utility validates all string-enum configuration values on activation and logs warnings with the invalid key, received value, and fallback for any unrecognized setting
- **🔌 ICommandHandler Interface**: New `src/commands/ICommandHandler.ts` exports a formal `ICommandHandler` interface that all command handler classes now explicitly implement
- **📂 Barrel Index Files**: Added `index.ts` barrel files to `src/commands/`, `src/managers/`, `src/utils/`, and `src/types/` for clean module imports
- **⚙️ tsconfig.eslint.json**: Dedicated TypeScript config for ESLint type-aware rules, decoupling lint configuration from the production build
- **🤖 CI Workflow** (`.github/workflows/ci.yml`): Runs `pnpm run lint` and `pnpm run build` on every PR targeting `main`
- **🚀 Release Workflow** (`.github/workflows/release.yml`): Automated publishing to VS Code Marketplace and Open VSX Registry on `v*` tag pushes, with VSIX verification and GitHub Pages deployment
- **🔒 Security Workflow** (`.github/workflows/security.yml`): Runs `pnpm audit`, GitHub CodeQL analysis, and dependency review on every push and weekly schedule
- **🏷️ Open VSX Badge**: README now includes an Open VSX Registry badge linking to the extension listing
- **📝 markdownDescription**: All settings in `package.json` now include `markdownDescription` fields with usage examples for the VS Code Settings UI
- **🎨 galleryBanner**: Added `galleryBanner` field to `package.json` for VS Code Marketplace branding
- **📦 ovsx Config**: Added `ovsx` configuration section to `package.json` mirroring the `vsce` section

### Changed

- **🚀 CI release pipeline**: All publish/release jobs now trigger on `v*` tag pushes (previously incorrectly conditioned on `refs/heads/main`)
- **🌿 Release builds from `main`**: `release-build` job now checks out the `main` branch (`ref: main`) to ensure releases always use the latest stable code
- **📦 Pre-release support**: Tags containing `-rc`, `-next`, `-beta`, or `-alpha` automatically publish with `--pre-release` flag to both VS Code Marketplace and Open VSX Registry
- **📄 GitHub Pages deployment**: Now depends on both `publish-vscode` and `publish-openvsx` succeeding, and is skipped entirely for pre-release tags
- **🏷️ GitHub Releases**: Pre-release tags create GitHub Releases marked as pre-release; stable tags create standard releases
- **💬 Improved Error Messages**: Function-not-found warning now lists supported function types and suggests checking cursor placement; file operation errors now include the target file path; disable confirmation now includes the re-enable command name
- **🔧 ESLint Config**: Updated `eslint.config.mjs` to use `tsconfig.eslint.json` instead of `tsconfig.json` for the `src/` configuration block
- **📚 CONTRIBUTING.md**: Restructured with a dedicated Branching Strategy section covering feature branches, Conventional Commits format, PR process, and CI workflow documentation; setup process consolidated to 5 steps with `tsconfig.eslint.json` reference
- **📖 DEVELOPER.md**: Commands table updated to note `tsconfig.eslint.json` usage in lint; project structure updated to include `tsconfig.eslint.json`; new ESLint Type-Aware Rules section added
- **📋 docs/developer-guides/adding-commands.md**: Updated to reference `ICommandHandler` interface and demonstrate barrel `index.ts` imports

### Fixed

- **🔐 Dependency Vulnerabilities**: Upgraded `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@stylistic/eslint-plugin`, `@vscode/vsce`, `ovsx`, `lint-staged`, `mocha`, and `@vscode/test-cli` to resolve 33 high/moderate vulnerabilities in dev tooling (none affected the shipped VSIX)
- **🔄 CodeAnalysisService**: Migrated from regex-based to AST-based function detection using TypeScript Compiler API
  - Improved accuracy for nested functions (returns inner-most function)
  - Eliminated false positives in comments and strings
  - Enhanced React component and hook detection
  - Bundle size increased by ~275KB (TypeScript Compiler API dependency)
  - No breaking changes to public API
  - Updated 7 documentation files to reflect AST-based approach

### Added

- **📝 Copy Function to File**: New command to copy function at cursor position to target file
- **📝 Move Function to File**: New command to move function at cursor position to target file (removes from source)
- **🖥️ Open in Terminal**: Cross-platform terminal integration with comprehensive platform support
  - Right-click context menu integration for quick terminal access
  - **Three terminal types**: Integrated, External, System Default with intelligent detection
  - **Cross-platform support**: Windows (cmd/PowerShell), macOS (Terminal.app), Linux (auto-detection)
  - **Configurable directory behaviors**: Parent directory, workspace root, current directory
  - **Robust error handling**: Permission validation, path checking, graceful fallbacks
  - **Custom external terminal support**: User-configurable commands with directory placeholders
- **📏 Rename File Convention**: Automatic file renaming to common naming conventions
  - Support for kebab-case, camelCase, and PascalCase
  - Quick action to suggest and apply file name transformations
- **💰 FUNDING.yml**: Added GitHub Sponsors configuration for community support
- **📋 NOTICE.md**: Added third-party software attribution document for transparency
- **⌨️ Keyboard Shortcuts**: Complete keybinding system with 7 shortcuts for core commands
  - `Ctrl+Alt+Shift+F` - Copy Function
  - `Ctrl+Alt+Shift+E` - Copy Function to File
  - `Ctrl+Alt+Shift+C` - Copy Selection to File
  - `Ctrl+Alt+Shift+R` - Move Function to File
  - `Ctrl+Alt+Shift+M` - Move Selection to File
  - `Ctrl+Alt+Shift+A` - Save All
  - `Ctrl+Alt+Shift+T` - Open in Terminal
- **🎯 Function Detection Context**: New `additionalContextMenus.isInFunction` context variable for smarter menu visibility
- **🔧 TerminalService**: New service for cross-platform terminal operations
  - Intelligent terminal type detection based on platform and configuration
  - Support for integrated, external, and system-default terminals
  - Configurable open behavior for different directory contexts
- **📊 EnumGeneratorService**: Generate TypeScript enums from union types
  - Automatic enum generation from selected union type definitions
  - Support for string literal types in unions
  - Quick action via command palette and context menu
- **🔐 EnvFileGeneratorService**: Create .env files from .env.example
  - Automatic .env file creation with values from example files
  - Environment variable template generation
  - Support for multiple .env.example formats
- **⏰ CronJobTimerGeneratorService**: Generate cron expressions
  - Visual cron expression builder with preset schedules
  - Support for common schedules (hourly, daily, weekly, monthly)
  - Custom cron expression generation with validation
- **📝 FileNamingConventionService**: Rename files to common conventions
  - Automatic detection of file naming pattern
  - One-click transformation to kebab-case, camelCase, or PascalCase
  - Integration with file system watchers for consistency
- **⚙️ Enhanced Configuration System**: New terminal-specific settings
  - `additionalContextMenus.terminal.type` - Choose terminal type (integrated/external/system-default)
  - `additionalContextMenus.terminal.externalTerminalCommand` - Custom external terminal command
  - `additionalContextMenus.terminal.openBehavior` - Directory selection behavior
- **🧪 Expanded Testing Infrastructure**: Comprehensive E2E test suite with 53 test cases
  - Terminal service testing with cross-platform scenarios
  - Enhanced test utilities for better testing architecture
  - Error condition and configuration edge case testing
  - Service-specific test suites for all new services
  - Command-specific test suites for all user-facing commands

### Changed (Breaking Changes)

- **🔄 Command Renaming**:
  - `copyCodeToFile` → `copySelectionToFile` (BREAKING - command ID changed)
  - `moveCodeToFile` → `moveSelectionToFile` (BREAKING - command ID changed)
- **📦 Version bump to 2.0.0**: Major version due to breaking command changes and feature removal

### Removed

- **❌ StatusBarService**: Removed status bar integration (was in v1.1.0)
  - Removed visual project status indicators
  - Removed real-time project detection status display
  - Removed clickable status bar with debug functionality

### Enhanced

- **🖱️ Context Menu System**: Improved command visibility and organization
  - Terminal option appears for all file types (not just Node.js projects)
  - Seamless integration with existing Copy, Move, and Save All operations
  - Consistent behavior across different project types and frameworks
  - Function detection context for smarter menu items
- **🏗️ Service Architecture**: Expanded service ecosystem
  - Added 4 new services (TerminalService, EnumGeneratorService, EnvFileGeneratorService, CronJobTimerGeneratorService)
  - New FileNamingConventionService for file operations
  - Consistent error handling and logging patterns across all services
  - Singleton pattern implementation for all services
- **🔧 Node.js Compatibility**: Verified Node.js 16-24 compatibility
  - Updated all documentation to explicitly state Node.js version support
  - Enhanced GitHub workflows to use Node.js 20.x for tooling consistency
  - Fixed @types/node dependency version alignment
  - Updated system requirements in installation documentation
- **📚 Documentation Improvements**: Comprehensive documentation updates
  - GitHub wiki with detailed service documentation
  - API reference for all services and commands
  - Updated README.md with new features and configuration examples
  - Enhanced troubleshooting documentation for cross-platform issues
- **🛠️ Development Infrastructure**: Improved development environment
  - Updated GitHub workflows for consistent Node.js version usage (20.x for tooling)
  - Maintained comprehensive Node.js testing matrix (16.x, 18.x, 20.x, 22.x, 24.x) in CI
  - Enhanced security audit workflows with latest tooling versions
  - Verified TypeScript and esbuild configurations for broad Node.js compatibility
- **🔧 Build Process Modernization**: Upgraded entire build workflow
  - **Primary build command**: `pnpm run build` now uses tsx with TypeScript config execution
  - **Updated CI workflows**: All automation now uses 'build' script instead of 'compile'
  - **Development workflow**: Enhanced watch mode and production build processes
  - **TypeScript-first scripting**: All build scripts use direct TypeScript execution via tsx
- **📊 Performance Improvements**: Build system optimization
  - Enhanced build performance reporting with detailed metrics and target verification
  - Bundle size monitoring with lazy-loaded services (60KB core + 26KB lazy)
  - Improved development experience with faster builds and better error reporting

### Technical Improvements

- **🔧 Code Quality**: Enhanced development infrastructure
  - Updated GitHub templates for better contribution experience
  - Improved testing coverage for new terminal functionality
  - Enhanced documentation and API reference materials
- **📖 Documentation**: Comprehensive updates
  - GitHub wiki with detailed terminal integration guide
  - Updated README.md with terminal features and configuration examples
  - Enhanced troubleshooting documentation for cross-platform issues
- **🌐 Cross-Platform Reliability**: Robust platform detection and handling
  - Automatic terminal application detection on Linux systems
  - Intelligent fallback mechanisms for unsupported configurations
  - Platform-specific command generation and error handling
- **📋 Build Command Migration**: Systematic update from 'compile' to 'build' across all documentation and workflows
- **🏗️ Configuration Architecture**: Modular esbuild configuration with environment-specific optimizations
- **🔄 CI/CD Pipeline Updates**: GitHub Actions workflows updated for improved build consistency

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

- **🧪 Comprehensive Test Suite**: Expanded from 19 to 53 tests (178.9% increase) with enterprise-grade edge case coverage
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

- **✅ 100% Test Success Rate**: All 53 tests pass consistently (53/53 passing)
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
