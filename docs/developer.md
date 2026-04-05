---
layout: default
title: 'Developer Guide'
description: 'Complete guide for setting up, developing, and contributing to the Additional Context Menus VS Code extension.'
---

# Developer Guide

Complete guide for setting up, developing, and contributing to the Additional Context Menus VS Code extension.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)
- [Packaging & Publishing](#packaging--publishing)
- [Project Structure](#project-structure)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Quick Start

Get up and running in 5 minutes:

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/additional-contexts-menu.git
cd additional-contexts-menu

# 2. Install dependencies
pnpm install

# 3. Build the extension
pnpm run build

# 4. Start development
pnpm run watch

# 5. Open in VS Code and press F5 to launch Extension Development Host
```

---

## Prerequisites

### Required Tools

| Tool        | Version                     | Purpose             | Installation                                            |
| ----------- | --------------------------- | ------------------- | ------------------------------------------------------- |
| **Node.js** | >= 20.0.0 (20-24 supported) | JavaScript runtime  | [nodejs.org](https://nodejs.org/)                       |
| **pnpm**    | 10.x.x                      | Package manager     | `npm install -g pnpm`                                   |
| **Git**     | Latest                      | Version control     | [git-scm.com](https://git-scm.com/)                     |
| **VS Code** | >= 1.108.0                  | IDE for development | [code.visualstudio.com](https://code.visualstudio.com/) |

### Verify Installation

```bash
node --version    # Should show v20.x.x or higher
pnpm --version    # Should show 10.x.x or higher
git --version     # Should show git version 2.x.x or higher
code --version    # Should show VS Code version
```

### Recommended VS Code Extensions

- **TypeScript Importer** - Auto-import management
- **ESLint** - Code linting (built-in)
- **Prettier** - Code formatting (built-in)
- **GitLens** - Enhanced Git capabilities

---

## Project Setup

### Step 1: Fork and Clone

#### Forking (Required for contributing)

1. Visit the repository: https://github.com/Vijay431/additional-contexts-menu
2. Click the **Fork** button in the top-right corner
3. Choose your GitHub account as the destination

#### Cloning Your Fork

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/additional-contexts-menu.git

# Navigate into the project
cd additional-contexts-menu
```

#### Adding Upstream Remote

Keep your fork in sync with the original repository:

```bash
# Add the original repository as upstream
git remote add upstream https://github.com/Vijay431/additional-contexts-menu.git

# Verify remotes
git remote -v

# You should see:
# origin    https://github.com/YOUR_USERNAME/additional-contexts-menu.git (fetch)
# origin    https://github.com/YOUR_USERNAME/additional-contexts-menu.git (push)
# upstream  https://github.com/Vijay431/additional-contexts-menu.git (fetch)
# upstream  https://github.com/Vijay431/additional-contexts-menu.git (push)
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
pnpm install

# This will:
# - Read package.json for dependencies
# - Install devDependencies for development
# - Generate pnpm-lock.yaml for consistent installs
# - Set up symlinks for workspace packages
```

**What gets installed:**

- **TypeScript** - Language and compiler
- **esbuild** - Fast bundler for compilation
- **ESLint** - Linting and code quality
- **Prettier** - Code formatting
- **@types/vscode** - VS Code API type definitions

### Step 3: Verify Installation

```bash
# Check if dependencies are installed
ls node_modules

# Run a successful build
pnpm run build

# Verify build output
ls dist
# Should show: extension.js, extension.js.map
```

### Step 4: Initial Build

```bash
# Production build (optimizations enabled)
pnpm run build

# Or build with watch mode for development
pnpm run watch
```

**Build output:** `dist/extension.js` (~60KB core + 26KB lazy-loaded services)

---

## Development Workflow

### Development Commands Reference

| Command             | Description                         | Use Case                                        | Performance              |
| ------------------- | ----------------------------------- | ----------------------------------------------- | ------------------------ |
| `pnpm run build`    | Build extension using esbuild       | Production builds, pre-commit checks            | ⚡ ~1 second             |
| `pnpm run watch`    | Watch mode for development          | Active development, rapid iteration             | 🔄 Instant rebuilds      |
| `pnpm run package`  | Production build with optimizations | Creating VSIX for publishing                    | 📦 Optimized bundle      |
| `pnpm run lint`     | Run ESLint on src directory         | Code quality checks (uses tsconfig.eslint.json) | 🎨 Fast analysis         |
| `pnpm run lint:fix` | Fix ESLint issues automatically     | Quick code cleanup                              | 🔧 Auto-fix issues       |
| `pnpm run format`   | Format code using Prettier          | Consistent code style                           | ✨ Fast formatting       |
| `pnpm run publish`  | Publish to VS Code Marketplace      | Releasing to users                              | 🚀 Production deployment |

### Day-to-Day Development

#### 1. Start Development

```bash
# Terminal 1: Start watch mode
pnpm run watch

# This continuously compiles TypeScript as you save files
# Output shows compilation status and any errors
```

#### 2. Launch Extension Development Host

1. Open the project in VS Code
2. Press `F5` or go to **Run → Start Debugging**
3. A new VS Code window (Extension Development Host) will launch
4. Your extension will be loaded in this window

#### 3. Verify Your Changes

- In the Extension Development Host, open a Node.js project
- Right-click in TypeScript/JavaScript files to verify context menus
- Use Command Palette (`Ctrl+Shift+P`) to verify commands
- Check the Output panel for extension logs (select "Additional Context Menus")

#### 4. Debug Your Code

1. Set breakpoints in your TypeScript code in VS Code
2. Press `F5` to launch with debugger attached
3. The debugger will pause at breakpoints in the Extension Development Host
4. Use the Debug toolbar to step through code

#### 5. Iterate

- Make changes to your code
- Watch mode automatically recompiles
- In Extension Development Host, press `Ctrl+R` to reload window
- Verify your changes again

### Feature Development Workflow

#### 1. Create Feature Branch

```bash
# Ensure you're on main branch
git checkout main

# Pull latest changes from upstream
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

#### 2. Develop Your Feature

```bash
# Start watch mode
pnpm run watch

# Check code quality
pnpm run lint
pnpm run format
```

#### 4. Build and Verify

```bash
# Production build
pnpm run build

# Test manually in Extension Development Host
# Press F5 to launch and test
```

#### 5. Commit Changes

```bash
# Stage your changes
git add .

# Commit with conventional commit format
git commit -m "feat(feature-name): add description of your feature"

# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, chore
```

#### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Link to related issues
# Fill out PR template
```

### Syncing Your Fork

Keep your fork up-to-date with upstream:

```bash
# Switch to main branch
git checkout main

# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your main
git merge upstream/main

# Push to your fork
git push origin main

# Update your feature branch (if working on one)
git checkout feature/your-feature-name
git rebase main
```

---

## Code Quality

### Linting

#### Run ESLint

```bash
# Lint all source files
pnpm run lint

# Lint specific file
pnpm run lint src/extension.ts

# Lint specific directory
pnpm run lint src/services/
```

#### Auto-Fix Lint Issues

```bash
# Automatically fix fixable issues
pnpm run lint:fix

# This runs eslint with --fix flag
# Resolves: spacing, quotes, semicolons, unused imports, etc.
```

### Formatting

#### Format All Files

```bash
# Format all files in the project
pnpm run format

# This uses Prettier with project configuration
# Consistent style across entire codebase
```

#### Prettier Configuration

The project uses `.prettierrc` for formatting rules:

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 80
}
```

### Type Checking

#### Compile TypeScript

```bash
# Compile TypeScript for production
pnpm run build

# This uses tsconfig.json configuration
# Checks for type errors during compilation
```

#### ESLint Type-Aware Rules

ESLint uses `tsconfig.eslint.json` (not `tsconfig.json`) for type-aware lint rules. This file:

- Extends `tsconfig.json` with `noEmit: true` and `allowJs: true`
- Includes `src/**/*`, `scripts/**/*`, and `esbuild.config.ts`
- Keeps lint configuration decoupled from the production build

```bash
# Run type-aware linting
pnpm run lint
```

### Pre-commit Checks

Before committing, run these checks:

```bash
# Complete quality check
pnpm run lint          # Check code quality
pnpm run format         # Format code
pnpm run build          # Type check and build
```

---

## Packaging & Publishing

### Building for Production

#### Standard Build

```bash
# Build extension with esbuild
pnpm run build

# Creates: dist/extension.js (~60KB core + 26KB lazy services)
# Optimizations enabled: minification, tree-shaking, lazy loading
```

#### Package VSIX

```bash
# Create VSIX package for distribution
pnpm run package

# Creates: additional-context-menus-{version}.vsix
# Includes: dist/, package.json, logo.png, README.md, LICENSE
# Excludes: devDependencies, test files, .git/
```

**What's in the VSIX:**

- Compiled extension code (`dist/`)
- Package manifest (`package.json`)
- Extension icon (`logo.png`)
- Documentation (`README.md`)
- License (`LICENSE`)

### Publishing to VS Code Marketplace

#### Prerequisites

1. Create a [Visual Studio Marketplace](https://marketplace.visualstudio.com/) account
2. Create a [Personal Access Token](https://dev.azure.com/_usersSettings/tokens) with Marketplace scope
3. Store the token as `VSCE_PAT` in the repository's GitHub Actions secrets

#### Publishing to Open VSX Registry

1. Create an account on [open-vsx.org](https://open-vsx.org/)
2. Generate an access token
3. Store the token as `OVSX_PAT` in the repository's GitHub Actions secrets

Both marketplaces are published automatically by the CI pipeline when a `v*` tag is pushed. Manual publishing is not required.

### Version Management

#### Update Version

Edit `package.json`:

```json
{
  "version": "2.0.1"
}
```

#### Update Changelog

Edit `CHANGELOG.md` with release notes:

```markdown
## [2.0.1] - 2024-01-31

### Added

- New feature description

### Fixed

- Bug fix description

### Changed

- Breaking change description
```

#### Tag Release

The CI pipeline handles publishing automatically when a tag is pushed. You do not need to run `pnpm run publish` manually.

```bash
# Commit version bump and changelog
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 2.0.1"

# Push the commit to main first
git push origin main

# Create and push the tag — this triggers the full release pipeline
git tag v2.0.1
git push origin v2.0.1
```

**What happens after pushing a tag:**

1. `setup` — extracts version and detects if it's a pre-release
2. `release-build` — checks out `main` branch and builds the VSIX
3. `verifier` — validates the VSIX contents
4. `publish-vscode` + `publish-openvsx` — publish to both marketplaces (with `--pre-release` flag for pre-release tags)
5. `deploy-pages` — deploys documentation (stable releases only)
6. `create-release` — creates a GitHub Release with the VSIX attached

#### Pre-release Versions

Tags containing `-rc`, `-next`, `-beta`, or `-alpha` are treated as pre-releases:

```bash
# Pre-release tag — publishes with --pre-release flag, skips pages deployment
git tag v2.1.0-rc.1
git push origin v2.1.0-rc.1

# Stable release tag — full publish + pages deployment
git tag v2.1.0
git push origin v2.1.0
```

| Tag             | Marketplace     | GitHub Pages | GitHub Release |
| --------------- | --------------- | ------------ | -------------- |
| `v2.0.0`        | stable          | ✅ deployed  | stable         |
| `v2.1.0-rc.1`   | `--pre-release` | ❌ skipped   | pre-release    |
| `v2.1.0-beta.1` | `--pre-release` | ❌ skipped   | pre-release    |

---

## Project Structure

### Directory Overview

```markdown
additional-contexts-menu/
├── .github/ # GitHub configuration
│ ├── ISSUE_TEMPLATE/ # Issue templates
│ ├── pull_request_template.md # PR template
│ └── wiki/ # GitHub Wiki pages
├── .husky/ # Git hooks
├── .vscode/ # VS Code configuration
│ ├── launch.json # Debug configurations
│ ├── settings.json # Workspace settings
│ └── extensions.json # Recommended extensions
├── docs/ # Documentation (Jekyll / GitHub Pages)
│ ├── \_config.yml # Jekyll configuration
│ ├── \_layouts/ # Jekyll layouts
│ ├── assets/ # Documentation assets
│ ├── features.md # Feature documentation
│ ├── developer.md # This file
│ ├── services/ # Service API docs
│ ├── installation.md # Installation guide
│ └── documentation.md # Technical documentation
├── scripts/ # Build and utility scripts
│ └── generate-changelog.js # Changelog generator
├── src/ # Source code
│ ├── extension.ts # Extension entry point
│ ├── managers/ # Core managers
│ │ ├── extensionManager.ts
│ │ └── contextMenuManager.ts
│ ├── services/ # Extension services
│ │ ├── codeAnalysisService.ts
│ │ ├── configurationService.ts
│ │ ├── cronJobTimerGeneratorService.ts
│ │ ├── enumGeneratorService.ts
│ │ ├── envFileGeneratorService.ts
│ │ ├── fileDiscoveryService.ts
│ │ ├── fileNamingConventionService.ts
│ │ ├── fileSaveService.ts
│ │ ├── projectDetectionService.ts
│ │ └── terminalService.ts
│ ├── types/ # TypeScript types
│ │ └── extension.ts
│ └── utils/ # Utility functions
│ └── logger.ts
├── .editorconfig # Editor configuration
├── .gitignore # Git ignore rules
├── .prettierrc # Prettier configuration
├── .vscodeignore # Files to exclude from VSIX
├── CHANGELOG.md # Version history
├── CODE_OF_CONDUCT.md # Code of conduct
├── CONTRIBUTING.md # Contribution guidelines
├── esbuild.config.ts # esbuild configuration
├── eslint.config.mjs # ESLint flat config
├── LICENSE # MIT License
├── logo.png # Extension icon
├── package.json # NPM manifest
├── pnpm-lock.yaml # pnpm lock file
├── README.md # Project documentation
├── SECURITY.md # Security policy
├── tsconfig.json # TypeScript configuration
└── tsconfig.eslint.json # TypeScript config for ESLint (extends tsconfig.json, noEmit, includes scripts/)
```

### Source Code Architecture

#### Entry Point

**[`src/extension.ts`](https://github.com/Vijay431/additional-contexts-menu/blob/main/src/extension.ts)** - Extension activation and deactivation

```typescript
// Extension entry point
// Called when VS Code activates the extension
export function activate(context: vscode.ExtensionContext) {
  // Initialize extension manager
  const extensionManager = new ExtensionManager(context);
  extensionManager.initialize();
}

// Called when extension is deactivated
export function deactivate() {
  // Cleanup resources
}
```

#### Managers

**[`src/managers/extensionManager.ts`](https://github.com/Vijay431/additional-contexts-menu/blob/main/src/managers/extensionManager.ts)** - Coordinates lifecycle and initialization

**[`src/managers/contextMenuManager.ts`](https://github.com/Vijay431/additional-contexts-menu/blob/main/src/managers/contextMenuManager.ts)** - Handles command registration and menu visibility

#### Services (Singleton Pattern)

The extension uses 11 specialized services, all following singleton pattern:

| Service                        | Purpose                                 | Key Methods                                    |
| ------------------------------ | --------------------------------------- | ---------------------------------------------- |
| `ProjectDetectionService`      | Detects Node.js projects and frameworks | `detectProject()`, `getFramework()`            |
| `ConfigurationService`         | Manages extension settings              | `getSetting()`, `updateSetting()`              |
| `FileDiscoveryService`         | Discovers compatible files              | `findFiles()`, `filterFiles()`                 |
| `CodeAnalysisService`          | Regex-based function detection          | `findFunctionAtPosition()`, `extractImports()` |
| `FileSaveService`              | Enhanced save operations                | `saveAll()`, `saveWithProgress()`              |
| `TerminalService`              | Cross-platform terminal integration     | `openTerminal()`, `executeCommand()`           |
| `EnumGeneratorService`         | Generates enums from union types        | `generateEnum()`                               |
| `EnvFileGeneratorService`      | Creates .env files                      | `generateEnvFile()`                            |
| `CronJobTimerGeneratorService` | Generates cron expressions              | `generateCronExpression()`                     |
| `FileNamingConventionService`  | Enforces naming conventions             | `checkConvention()`, `renameFile()`            |
| `AccessibilityService`         | Screen reader support and announcements | `announce()`, `announceSuccess()`              |

See [Services Documentation]({{ site.baseurl }}/services/) for full API references.

---

## Debugging

### VS Code Debugger

#### Launch Configuration

**`.vscode/launch.json`** contains debug configurations:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

#### Using the Debugger

1. Set breakpoints in your TypeScript code
2. Press `F5` to launch Extension Development Host with debugger
3. Use Debug toolbar to:
   - Continue (`F5`)
   - Step Over (`F10`)
   - Step Into (`F11`)
   - Step Out (`Shift+F11`)
   - Restart (`Ctrl+Shift+F5`)
   - Stop (`Shift+F5`)

### Console Debugging

#### Using Logger Utility

```typescript
// In your code
import { Logger } from '../utils/logger';

const logger = new Logger('MyFeature');
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

#### Viewing Logs

1. Open Output panel (`Ctrl+Shift+U`)
2. Select "Additional Context Menus" from dropdown
3. View extension logs in real-time

#### VS Code Developer Tools

In Extension Development Host:

1. Press `Ctrl+Shift+I` to open Developer Tools
2. Check Console tab for errors
3. Check Network tab for API calls
4. Use Elements tab for DOM inspection

### Common Debugging Scenarios

#### Extension Not Loading

```bash
# Check if extension is built
ls dist/extension.js

# Check extension activation events in package.json
# Verify activationEvents: ["onStartupFinished"]

# Check for syntax errors
pnpm run build
```

#### Commands Not Executing

```bash
# Verify command registration in package.json
# Check contributes.commands section

# Verify command ID matches
# Command IDs in package.json must match executeCommand() calls

# Check context variables
# Run: Additional Context Menus: Debug Context Variables
```

---

## Troubleshooting

### Common Development Issues

#### Installation Issues

**Problem:** `pnpm install` fails

**Solutions:**

```bash
# Clear pnpm cache
pnpm store prune

# Delete node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

#### Build Issues

**Problem:** `pnpm run build` fails with TypeScript errors

**Solutions:**

```bash
# Clear dist directory
rm -rf dist

# Check TypeScript configuration
cat tsconfig.json

# Build with verbose output
tsx esbuild.config.ts --verbose

# Check for syntax errors in source files
```

#### Extension Development Host Issues

**Problem:** Extension doesn't load in Development Host

**Solutions:**

```bash
# Check Output panel for errors
# Look for "Additional Context Menus" output channel

# Check extension state
# Run: Additional Context Menus: Debug Context Variables

# Reload window
# Ctrl+Shift+P → Developer: Reload Window

# Check for conflicts
# Run: Additional Context Menus: Check Keybinding Conflicts
```

### Environment Issues

#### Node.js Version Mismatch

```bash
# Check Node version
node --version

# Install correct version using nvm
nvm install 20
nvm use 20
```

#### pnpm Version Issues

```bash
# Install required version
npm install -g pnpm@10.x.x

# Verify installation
pnpm --version
```

### Getting Help

If you encounter issues not covered here:

1. **Check existing issues:** https://github.com/Vijay431/additional-contexts-menu/issues
2. **Search discussions:** https://github.com/Vijay431/additional-contexts-menu/discussions
3. **Create a new issue** with OS, Node.js version, steps to reproduce, and command output
4. **Contact maintainer:** vijayanand431@gmail.com

---

## Resources

### Official Documentation

- **VS Code Extension API:** https://code.visualstudio.com/api
- **Publishing Extensions:** https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Visual Studio Marketplace:** https://marketplace.visualstudio.com/manage

### Package Documentation

- **esbuild:** https://esbuild.github.io/
- **pnpm:** https://pnpm.io/
- **TypeScript:** https://www.typescriptlang.org/docs/
- **ESLint:** https://eslint.org/docs/latest/
- **Prettier:** https://prettier.io/docs/en/

### Project Links

- **GitHub Repository:** https://github.com/Vijay431/additional-contexts-menu
- **VS Code Marketplace:** https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus
- **Issues:** https://github.com/Vijay431/additional-contexts-menu/issues
- **Discussions:** https://github.com/Vijay431/additional-contexts-menu/discussions
- **Services Documentation:** [{{ site.baseurl }}/services/]({{ site.baseurl }}/services/)
- **Contributing Guide:** https://github.com/Vijay431/additional-contexts-menu/blob/main/CONTRIBUTING.md

### Related Tools

- **vsce:** VS Code Extension Manager - https://github.com/microsoft/vscode-vsce
- **ovsx:** Open VSX Publisher - https://github.com/eclipse/openvsx

---

## Next Steps

- Read [CONTRIBUTING.md](https://github.com/Vijay431/additional-contexts-menu/blob/main/CONTRIBUTING.md) for contribution guidelines
- Explore [source code](https://github.com/Vijay431/additional-contexts-menu/tree/main/src) to understand architecture
- Check [Services Documentation]({{ site.baseurl }}/services/) for API references
- See [Adding Commands]({{ site.baseurl }}/developer-guides/adding-commands) for extending the extension

Happy coding! 🚀
