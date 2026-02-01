# Developer Guide

Complete guide for setting up, developing, testing, and contributing to the Additional Context Menus VS Code extension.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Packaging & Publishing](#packaging--publishing)
- [Project Structure](#project-structure)
- [Testing Infrastructure](#testing-infrastructure)
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

# 4. Run default e2e tests
pnpm test

# 5. Start development
pnpm run watch

# 6. Open in VS Code and press F5 to launch Extension Development Host
```

---

## Prerequisites

### Required Tools

| Tool        | Version                     | Purpose             | Installation                                            |
| ----------- | --------------------------- | ------------------- | ------------------------------------------------------- |
| **Node.js** | >= 20.0.0 (16-24 supported) | JavaScript runtime  | [nodejs.org](https://nodejs.org/)                       |
| **pnpm**    | 9.15.0                      | Package manager     | `npm install -g pnpm`                                   |
| **Git**     | Latest                      | Version control     | [git-scm.com](https://git-scm.com/)                     |
| **VS Code** | >= 1.102.0                  | IDE for development | [code.visualstudio.com](https://code.visualstudio.com/) |

### Verify Installation

```bash
node --version    # Should show v20.x.x or higher
pnpm --version    # Should show 9.15.0
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
- **@vscode/test-electron** - VS Code extension testing
- **Mocha** - Test framework
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

**Build output:** `dist/extension.js` (~47KB optimized bundle)

---

## Development Workflow

### Development Commands Reference

| Command                   | Description                         | Use Case                             | Performance              |
| ------------------------- | ----------------------------------- | ------------------------------------ | ------------------------ |
| `pnpm run build`          | Build extension using esbuild       | Production builds, pre-commit checks | ⚡ ~1 second             |
| `pnpm run watch`          | Watch mode for development          | Active development, rapid iteration  | 🔄 Instant rebuilds      |
| `pnpm run package`        | Production build with optimizations | Creating VSIX for publishing         | 📦 Optimized bundle      |
| `pnpm run lint`           | Run ESLint on src directory         | Code quality checks                  | 🎨 Fast analysis         |
| `pnpm run lint:fix`       | Fix ESLint issues automatically     | Quick code cleanup                   | 🔧 Auto-fix issues       |
| `pnpm run format`         | Format code using Prettier          | Consistent code style                | ✨ Fast formatting       |
| `pnpm test`               | Default optimized e2e testing       | Main development testing             | 🧪 85.5% smaller, faster |
| `pnpm run test:headless`  | Alias for `pnpm test`               | CI/CD pipelines                      | 🚀 Faster, no GUI        |
| `pnpm run test:ui`        | UI-based e2e testing (alias)        | Manual testing, debugging            | 👁️ Visual feedback       |
| `pnpm run test:full`      | Full project testing                | Complete validation                  | 🔄 Comprehensive         |
| `pnpm run create-minimal` | Create minimal extension package    | Testing with small package           | 📦 1MB vs 250MB          |
| `pnpm run publish`        | Publish to VS Code Marketplace      | Releasing to users                   | 🚀 Production deployment |

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

#### 3. Test Your Changes

- In the Extension Development Host, open a Node.js project
- Right-click in TypeScript/JavaScript files to test context menus
- Use Command Palette (`Ctrl+Shift+P`) to test commands
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
- Test your changes again

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

# Make code changes
# Add tests for new functionality
# Run tests frequently
pnpm test

# Check code quality
pnpm run lint
pnpm run format
```

#### 3. Run Tests

```bash
# Run default e2e tests
pnpm test

# Or run tests with headless mode (faster)
pnpm run test:headless

# Full test suite for validation
pnpm run test:full

# Use environment variables for flexibility
HEADLESS=false pnpm test           # Run with UI visible
SKIP_OPTIMIZATION=true pnpm run test:full  # Full setup without minimal package
```

#### 4. Build and Verify

```bash
# Production build
pnpm run build

# Create minimal extension for testing
pnpm run create-minimal

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
# Types: feat, fix, docs, style, refactor, test, chore
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

## Testing

### Testing Overview

The project uses a comprehensive e2e testing framework with **@vscode/test-electron** and **Mocha**. Tests validate extension functionality in a real VS Code environment.

### Test Structure

```
test/
├── e2e/                          # End-to-end tests
│   ├── extension-e2e.test.ts      # Main test runner
│   ├── runE2ETest.ts              # Test execution script
│   ├── index.ts                   # Test entry point
│   ├── commands/                 # Command-specific tests
│   │   ├── copyFunction.test.ts
│   │   ├── copyFunctionToFile.test.ts
│   │   ├── moveFunctionToFile.test.ts
│   │   ├── copyContentToFile.test.ts
│   │   ├── moveContentToFile.test.ts
│   │   ├── saveAll.test.ts
│   │   ├── openInTerminal.test.ts
│   │   ├── enable.test.ts
│   │   └── disable.test.ts
│   ├── services/                 # Service-level tests
│   │   ├── codeAnalysisService.test.ts
│   │   ├── configurationService.test.ts
│   │   ├── fileDiscoveryService.test.ts
│   │   ├── fileNamingConvention.test.ts
│   │   ├── fileSaveOptions.test.ts
│   │   ├── envFileGenerator.test.ts
│   │   ├── enumGenerator.test.ts
│   │   ├── cronJobTimerGenerator.test.ts
│   │   ├── projectDetectionService.test.ts
│   │   └── terminalService.test.ts
│   ├── integration/              # Integration tests
│   │   └── multiWorkspace.test.ts
│   ├── edge-cases/               # Edge case tests
│   │   └── stressTests.test.ts
│   ├── cross-platform/           # Cross-platform tests
│   │   └── pathHandling.test.ts
│   ├── core-functionality.test.ts # Core feature tests
│   └── utils/                    # Test utilities
│       ├── e2eTestSetup.ts       # Test setup helpers
│       ├── serviceTestBase.ts    # Service test base class
│       ├── fileHelpers.ts        # File manipulation utilities
│       ├── workspaceHelpers.ts   # Workspace setup helpers
│       ├── projectFixtures.ts    # Test project fixtures
│       └── commandValidator.ts  # Command validation utilities
├── suite/                        # Unit/integration test suite
│   ├── services/
│   │   └── terminalService.test.ts
│   └── utils/
│       ├── testSetup.ts
│       └── testMocks.ts
└── fixtures/                     # Test fixtures
    ├── code-samples/
    │   └── utility-functions.ts
    ├── sample-angular-service.ts
    ├── sample-express-routes.ts
    └── projects/
        └── express-api/
            └── src/routes/users.ts
```

### Running Tests

#### Default Testing (Optimized)

```bash
# Runs tests with minimal extension package (85.5% smaller)
pnpm test

# This command does:
# 1. Clean dist directory
# 2. Build extension (pnpm run build)
# 3. Create minimal extension package (pnpm run create-minimal)
# 4. Compile test files (tsc -p tsconfig.test.json)
# 5. Run e2e tests in headless mode (HEADLESS=true)

# Output location: dist/test/e2e/
```

**Why use this:** Fastest option for development, uses optimized extension package (~1MB vs ~250MB).

#### Headless Testing

```bash
# Run tests without VS Code UI (no window)
pnpm run test:headless  # Alias for pnpm test

# Or use environment variable directly
HEADLESS=true pnpm test
# Best for: CI/CD pipelines, quick feedback
```

**Use cases:**

- CI/CD pipelines
- Quick validation during development
- Running on servers without display

#### UI Testing

```bash
# Run tests with VS Code UI visible
pnpm run test:ui  # Alias for HEADLESS=false pnpm test

# Or use environment variable directly
HEADLESS=false pnpm test
# Opens actual VS Code windows during tests
# Best for: Debugging, manual testing
```

**Use cases:**

- Debugging failing tests
- Visualizing test execution
- Manual verification

#### Full Testing

```bash
# Run tests with complete extension package
pnpm run test:full

# Skips minimal extension optimization
# Uses full extension with all dev dependencies
# Environment variable: SKIP_OPTIMIZATION=true

# For headless full testing, use:
SKIP_OPTIMIZATION=true pnpm run test:full
# Or the alias: pnpm run test:headless:full
```

**Use cases:**

- Pre-release validation
- Testing with complete extension
- Backwards compatibility checks

#### CI Testing

```bash
# Optimized for CI/CD environments
pnpm run test:ci  # Alias for HEADLESS=true SKIP_OPTIMIZATION=false pnpm test

# Or use environment variables directly
HEADLESS=true SKIP_OPTIMIZATION=false pnpm test
# Balances speed and completeness
```

**Use cases:**

- GitHub Actions
- Travis CI, CircleCI, etc.
- Automated testing pipelines

#### Clean Test Artifacts

```bash
# Remove test artifacts and temporary files
pnpm run test:clean

# Removes:
# - .vscode-test/minimal-extension/
# - .vscode-test/user-data-isolated/
# - .vscode-test/user-data-dev/
```

### Writing Tests

#### Test File Structure

```typescript
// test/e2e/commands/myFeature.test.ts

import * as assert from 'assert';
import * as vscode from 'vscode';
import { after, before } from 'mocha';

suite('My Feature E2E Tests', () => {
  let extensionContext: vscode.ExtensionContext;

  before(async () => {
    // Setup before all tests
    // Load extension, create test files, etc.
  });

  after(async () => {
    // Cleanup after all tests
    // Close files, delete temp files, etc.
  });

  test('should do something when condition is met', async () => {
    // Arrange
    const expected = 'result';

    // Act
    const result = await vscode.commands.executeCommand('myExtension.myCommand');

    // Assert
    assert.strictEqual(result, expected);
  });
});
```

#### Using Test Utilities

```typescript
// Import test helpers
import {
  createTestFile,
  deleteTestFile,
  openTestFile,
  getActiveEditor,
} from '../utils/fileHelpers';
import { setupTestWorkspace } from '../utils/workspaceHelpers';
import { CommandValidator } from '../utils/commandValidator';

suite('Feature Tests', () => {
  let testFileUri: vscode.Uri;

  before(async () => {
    // Setup test workspace
    await setupTestWorkspace('react-project');

    // Create test file
    testFileUri = await createTestFile(
      'test.ts',
      `
      function testFunction() {
        return 'test';
      }
    `,
    );

    // Open test file in editor
    await openTestFile(testFileUri);
  });

  test('should validate command execution', async () => {
    const validator = new CommandValidator();

    // Execute command
    await vscode.commands.executeCommand('myExtension.myCommand');

    // Validate execution
    const result = await validator.validate('myExtension.myCommand');
    assert.strictEqual(result.success, true);
  });

  after(async () => {
    // Cleanup
    await deleteTestFile(testFileUri);
  });
});
```

### Testing Best Practices

1. **Isolate Tests** - Each test should be independent and cleanup after itself
2. **Use Describe/Suite** - Group related tests logically
3. **Arrange-Act-Assert** - Follow AAA pattern for clarity
4. **Mock External Dependencies** - Use test utilities for mocking
5. **Test Edge Cases** - Include tests for unusual scenarios
6. **Performance Testing** - Include stress tests for performance validation
7. **Cross-Platform** - Test on Windows, macOS, and Linux when possible

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

#### Compile Test Files

```bash
# Compile test files for validation
tsc -p ./tsconfig.test.json

# Ensures test files are type-safe
# Catches type errors in test code
```

### Pre-commit Checks

Before committing, run these checks:

```bash
# Complete quality check
pnpm run lint          # Check code quality
pnpm run format         # Format code
pnpm run build          # Type check and build
pnpm test               # Run tests

# Or use the combined check
pnpm run test:all
```

---

## Packaging & Publishing

### Building for Production

#### Standard Build

```bash
# Build extension with esbuild
pnpm run build

# Creates: dist/extension.js (~47KB)
# Optimizations enabled: minification, tree-shaking
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
- License (`LICENSE.md`)

### Publishing to VS Code Marketplace

#### Prerequisites

1. Create a [Visual Studio Marketplace](https://marketplace.visualstudio.com/) account
2. Create a [Personal Access Token](https://dev.azure.com/_usersSettings/tokens) with Marketplace scope
3. Add to token to `.vsce/publish` file or use `vsce login`

#### Publish Command

```bash
# Login to VS Code Marketplace
vsce login VijayGangatharan

# Publish the extension
pnpm run publish

# Or use vsce directly
vsce publish

# Publish specific version
vsce publish patch    # Increments patch version (x.x.1)
vsce publish minor     # Increments minor version (x.1.0)
vsce publish major     # Increments major version (1.0.0)
```

#### Publishing to Open VSX Registry

```bash
# Package for Open VSX
pnpm run package:openvsx

# Publish to Open VSX registry
pnpm run publish:openvsx

# Open VSX is the open-source extension registry
# Compatible with VSCodium and other VS Code forks
```

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

```bash
# Commit changes
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 2.0.1"

# Create tag
git tag v2.0.1

# Push tag
git push origin v2.0.1

# Publish extension
pnpm run publish
```

### Creating Release Notes

When publishing, provide release notes:

```bash
# Publish with notes
vsce publish minor --message "Release notes go here"

# Or use CHANGELOG.md content
vsce publish minor --message "$(cat CHANGELOG.md | head -50)"
```

---

## Project Structure

### Directory Overview

```
additional-contexts-menu/
├── .github/                    # GitHub configuration
│   ├── ISSUE_TEMPLATE/         # Issue templates
│   ├── pull_request_template.md # PR template
│   └── wiki/                   # GitHub Wiki pages
├── .husky/                     # Git hooks
├── .vscode/                    # VS Code configuration
│   ├── launch.json             # Debug configurations
│   ├── settings.json           # Workspace settings
│   └── extensions.json          # Recommended extensions
├── docs/                       # Documentation (Jekyll)
│   ├── _config.yml             # Jekyll configuration
│   ├── _layouts/               # Jekyll layouts
│   ├── assets/                 # Documentation assets
│   ├── features.md             # Feature documentation
│   ├── services/               # Service API docs
│   ├── installation.md         # Installation guide
│   └── documentation.md        # Technical documentation
├── scripts/                    # Build and utility scripts
│   ├── create-minimal-extension.ts  # Creates minimal test package
│   └── generate-changelog.js   # Changelog generator
├── src/                        # Source code
│   ├── extension.ts            # Extension entry point
│   ├── managers/               # Core managers
│   │   ├── extensionManager.ts
│   │   └── contextMenuManager.ts
│   ├── services/               # Extension services
│   │   ├── codeAnalysisService.ts
│   │   ├── configurationService.ts
│   │   ├── cronJobTimerGeneratorService.ts
│   │   ├── enumGeneratorService.ts
│   │   ├── envFileGeneratorService.ts
│   │   ├── fileDiscoveryService.ts
│   │   ├── fileNamingConventionService.ts
│   │   ├── fileSaveService.ts
│   │   ├── projectDetectionService.ts
│   │   └── terminalService.ts
│   ├── types/                  # TypeScript types
│   │   └── extension.ts
│   └── utils/                  # Utility functions
│       └── logger.ts
├── test/                       # Test files
│   ├── e2e/                    # E2E tests
│   ├── suite/                  # Unit/integration tests
│   └── fixtures/               # Test fixtures and samples
├── .editorconfig               # Editor configuration
├── .eslintrc.json              # ESLint configuration
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier configuration
├── .vscodeignore               # Files to exclude from VSIX
├── .vscode-test.mjs            # VS Code test configuration
├── CHANGELOG.md                # Version history
├── CODE_OF_CONDUCT.md          # Code of conduct
├── CONTRIBUTING.md             # Contribution guidelines
├── DEVELOPER.md                # This file
├── esbuild.config.ts           # esbuild configuration
├── eslint.config.mjs           # ESLint flat config
├── LICENSE                     # MIT License
├── logo.png                    # Extension icon
├── package.json                # NPM manifest
├── pnpm-lock.yaml              # pnpm lock file
├── README.md                   # Project documentation
├── SECURITY.md                 # Security policy
├── tsconfig.json               # TypeScript configuration
├── tsconfig.test.json          # TypeScript test configuration
└── TODO.md                     # TODO list
```

### Source Code Architecture

#### Entry Point

**`src/extension.ts`** - Extension activation and deactivation

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

**`src/managers/extensionManager.ts`** - Coordinates lifecycle and initialization

**`src/managers/contextMenuManager.ts`** - Handles command registration and menu visibility

#### Services (Singleton Pattern)

The extension uses 10 specialized services, all following singleton pattern:

| Service                        | Purpose                                                    | Key Methods                                    |
| ------------------------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| `ProjectDetectionService`      | Detects Node.js projects and frameworks                    | `detectProject()`, `getFramework()`            |
| `ConfigurationService`         | Manages extension settings                                 | `getSetting()`, `updateSetting()`              |
| `FileDiscoveryService`         | Discovers compatible files                                 | `findFiles()`, `filterFiles()`                 |
| `CodeAnalysisService`          | AST-based function detection using TypeScript Compiler API | `findFunctionAtPosition()`, `extractImports()` |
| `FileSaveService`              | Enhanced save operations                                   | `saveAll()`, `saveWithProgress()`              |
| `TerminalService`              | Cross-platform terminal integration                        | `openTerminal()`, `executeCommand()`           |
| `EnumGeneratorService`         | Generates enums from union types                           | `generateEnum()`                               |
| `EnvFileGeneratorService`      | Creates .env files                                         | `generateEnvFile()`                            |
| `CronJobTimerGeneratorService` | Generates cron expressions                                 | `generateCronExpression()`                     |
| `FileNamingConventionService`  | Enforces naming conventions                                | `checkConvention()`, `renameFile()`            |

#### Types

**`src/types/extension.ts`** - Shared TypeScript type definitions

#### Utilities

**`src/utils/logger.ts`** - Logging utility for debugging

---

## Testing Infrastructure

### Minimal Extension Package

The project uses a sophisticated testing optimization that creates a minimal extension package (~1MB instead of ~250MB).

#### How It Works

```bash
# Create minimal extension for testing
pnpm run create-minimal
```

The `create-minimal-extension.ts` script:

1. **Creates a clean directory** at `.vscode-test/minimal-extension/`
2. **Copies essential files only:**
   - `README.md`, `LICENSE`, `logo.png`
   - `dist/extension.js` and `dist/extension.js.map`
3. **Creates minimal package.json** with only runtime fields:
   - Name, version, publisher, main entry point
   - Contributes (commands, settings, menus)
   - Excludes: devDependencies, scripts, test files
4. **Saves space** by excluding:
   - `node_modules/`
   - `.git/`
   - `test/` directory
   - Build scripts and dev tools

**Space Savings:**

| Metric              | Original | Minimal | Savings         |
| ------------------- | -------- | ------- | --------------- |
| Package Size        | ~250MB   | ~1MB    | 99.6% reduction |
| Test Execution Time | ~45s     | ~15s    | 67% faster      |
| Memory Usage        | ~800MB   | ~300MB  | 63% reduction   |

#### When to Use Minimal vs Full

**Use Minimal (`pnpm test`):**

- Development and iterative testing
- CI/CD pipelines for speed
- Most test scenarios
- Feature validation

**Use Full (`pnpm test:full`):**

- Pre-release validation
- Testing with complete environment
- Backwards compatibility checks
- Integration with all dependencies

### Headless vs UI Testing

#### Headless Testing (`HEADLESS=true`)

Runs tests without launching VS Code windows:

```bash
pnpm run test:headless
```

**Advantages:**

- ⚡ Faster execution (no GUI overhead)
- 🚀 No window management
- 💻 Works on servers without display
- 🔄 Perfect for CI/CD

**Trade-offs:**

- 👁️ Cannot visually verify behavior
- 🔧 Harder to debug failures
- 📊 No visual feedback

#### UI Testing (`HEADLESS=false`)

Runs tests with actual VS Code windows:

```bash
pnpm run test:ui
```

**Advantages:**

- 👁️ Visual verification of behavior
- 🔧 Easier to debug failures
- 📊 Real-world simulation
- 🎯 Can observe test execution

**Trade-offs:**

- ⏱️ Slower execution (GUI overhead)
- 💻 Requires display environment
- 🖥️ Window management overhead

#### CI/CD Best Practice

```bash
# CI pipelines: Use headless for speed
pnpm run test:ci

# Local development: Use UI for debugging
pnpm run test:ui

# Pre-release: Use full for validation
pnpm run test:full
```

### Test Environment Configuration

#### VS Code Test Configuration

**`.vscode-test.mjs`** - Test environment setup:

```javascript
export default {
  extensionId: 'VijayGangatharan.additional-context-menus',
  extensionTestsPath: './dist/test/e2e/runE2ETest.js',
  launchArgs: [
    // Disable updates during tests
    '--disable-extensions',
    // Set user data directory
    '--user-data-dir',
    './.vscode-test/user-data-isolated',
  ],
};
```

#### Test TypeScript Configuration

**`tsconfig.test.json`** - TypeScript compilation for tests:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/test",
    "types": ["node", "mocha", "@types/vscode"]
  },
  "include": ["test/**/*"]
}
```

### Test Fixtures

The project includes test fixtures for realistic testing:

#### Code Samples

**`test/fixtures/code-samples/utility-functions.ts`** - Sample utility functions for testing

#### Sample Projects

**`test/fixtures/projects/express-api/`** - Sample Express API project for project detection tests

#### Sample Files

**`test/fixtures/sample-angular-service.ts`** - Angular service sample
**`test/fixtures/sample-express-routes.ts`** - Express routes sample

### Test Utilities

#### File Helpers

**`test/e2e/utils/fileHelpers.ts`**

```typescript
// Create test files
async createTestFile(filename: string, content: string): Promise<vscode.Uri>

// Delete test files
async deleteTestFile(uri: vscode.Uri): Promise<void>

// Open test files in editor
async openTestFile(uri: vscode.Uri): Promise<void>

// Get active editor
getActiveEditor(): vscode.TextEditor | undefined
```

#### Workspace Helpers

**`test/e2e/utils/workspaceHelpers.ts`**

```typescript
// Setup test workspace with project structure
async setupTestWorkspace(projectType: string): Promise<void>

// Cleanup workspace
async cleanupWorkspace(): Promise<void>

// Copy fixture to workspace
async copyFixture(fixtureName: string, targetPath: string): Promise<void>
```

#### Command Validator

**`test/e2e/utils/commandValidator.ts`**

```typescript
// Validate command execution
async validate(commandId: string): Promise<ValidationResult>

// Check command availability
async isAvailable(commandId: string): Promise<boolean>

// Execute command and capture output
async execute(commandId: string, args?: any[]): Promise<any>
```

#### Service Test Base

**`test/e2e/utils/serviceTestBase.ts`**

Base class for service tests with common setup/teardown:

```typescript
abstract class ServiceTestBase {
  // Setup test environment
  protected async setup(): Promise<void>;

  // Cleanup test environment
  protected async teardown(): Promise<void>;

  // Get service instance
  protected abstract getService(): any;
}
```

### Test Execution Flow

When you run `pnpm test`:

1. **Clean dist directory** - `rm -rf dist`
2. **Build extension** - `pnpm run build` (TypeScript → JavaScript)
3. **Create minimal extension** - `pnpm run create-minimal` (~1MB package)
4. **Compile test files** - `tsc -p ./tsconfig.test.json`
5. **Run e2e tests** - `node ./dist/test/e2e/runE2ETest.js`
6. **Execute test suite** - Mocha runs all test files
7. **Generate report** - Pass/fail results with detailed output

### Test Best Practices

1. **Use Minimal Extension** - Default to `pnpm test` for speed
2. **Isolate Tests** - Each test should be independent
3. **Cleanup Resources** - Always close files and delete temporary files
4. **Mock External Dependencies** - Don't test third-party code
5. **Test Edge Cases** - Include unusual scenarios
6. **Cross-Platform Testing** - Test on Windows, macOS, Linux
7. **Performance Testing** - Include stress tests
8. **Visual Verification** - Use UI mode for manual verification

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

### Debugging Tests

#### Debug Individual Test

```bash
# Run specific test file
pnpm test test/e2e/commands/copyFunction.test.ts

# Or use VS Code debugger:
# 1. Set breakpoints in test file
# 2. Go to Run and Debug
# 3. Select "Extension Tests" configuration
# 4. Press F5
```

#### Debug Headless Tests

```bash
# Run tests with --inspect flag
node --inspect dist/test/e2e/runE2ETest.js

# Then attach VS Code debugger to the process
```

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

#### Tests Failing

```bash
# Run with verbose output
pnpm test --reporter spec

# Debug specific test
node dist/test/e2e/runE2ETest.js --grep "test name"

# Use UI mode to see what's happening
pnpm run test:ui
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

#### Test Issues

**Problem:** Tests fail with "Extension not found"

**Solutions:**

```bash
# Ensure extension is built
pnpm run build

# Create minimal extension
pnpm run create-minimal

# Check minimal extension exists
ls .vscode-test/minimal-extension/

# Clean and rebuild
rm -rf dist
pnpm run build
pnpm run create-minimal
```

**Problem:** Tests are slow

**Solutions:**

```bash
# Use minimal extension (default)
pnpm test

# Use headless mode
pnpm run test:headless

# Skip slow tests
# Add .skip to test suites you want to skip
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

**Problem:** "Node version not supported"

**Solutions:**

```bash
# Check Node version
node --version

# Install correct version using nvm
nvm install 20
nvm use 20

# Or using n
sudo n 20
```

#### pnpm Version Issues

**Problem:** "pnpm version not matching package manager field"

**Solutions:**

```bash
# Check pnpm version
pnpm --version

# Install required version
npm install -g pnpm@9.15.0

# Verify installation
pnpm --version
```

### Performance Issues

#### Slow Build Times

**Problem:** Build takes longer than expected

**Solutions:**

```bash
# Use watch mode for development
pnpm run watch

# Check for large files that slow compilation
# Optimize imports and remove unused code

# Use esbuild's incremental builds
# Watch mode provides this automatically
```

#### Slow Test Execution

**Problem:** Tests take too long

**Solutions:**

```bash
# Use minimal extension (faster by 3x)
pnpm test

# Use headless mode (no GUI overhead)
pnpm run test:headless

# Run only specific test suites
node dist/test/e2e/runE2ETest.js --grep "specific test"
```

### Getting Help

If you encounter issues not covered here:

1. **Check existing issues:** https://github.com/Vijay431/additional-contexts-menu/issues
2. **Search discussions:** https://github.com/Vijay431/additional-contexts-menu/discussions
3. **Create a new issue** with:
   - OS and Node.js version
   - Steps to reproduce
   - Expected vs actual behavior
   - Output from relevant commands
   - Screenshots if applicable
4. **Contact maintainer:** vijayanand431@gmail.com

---

## Resources

### Official Documentation

- **VS Code Extension API:** https://code.visualstudio.com/api
- **Extension Testing:** https://code.visualstudio.com/api/working-with-extensions/testing-extension
- **Publishing Extensions:** https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Visual Studio Marketplace:** https://marketplace.visualstudio.com/manage

### Package Documentation

- **esbuild:** https://esbuild.github.io/
- **pnpm:** https://pnpm.io/
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Mocha:** https://mochajs.org/
- **ESLint:** https://eslint.org/docs/latest/
- **Prettier:** https://prettier.io/docs/en/

### Project Links

- **GitHub Repository:** https://github.com/Vijay431/additional-contexts-menu
- **VS Code Marketplace:** https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus
- **Issues:** https://github.com/Vijay431/additional-contexts-menu/issues
- **Discussions:** https://github.com/Vijay431/additional-contexts-menu/discussions
- **Wiki:** https://github.com/Vijay431/additional-contexts-menu/wiki
- **Documentation Site:** https://vijaygangatharan.github.io/additional-contexts-menu/

### Community Resources

- **VS Code Extensions Slack:** #vscode-extensions channel
- **Stack Overflow:** Tag with `vscode-extension`
- **Reddit:** r/vscode

### Related Tools

- **vsce:** VS Code Extension Manager - https://github.com/microsoft/vscode-vsce
- **ovsx:** Open VSX Publisher - https://github.com/eclipse/openvsx
- **@vscode/test-electron:** VS Code testing utilities

---

## Conclusion

This developer guide provides comprehensive information for setting up, developing, testing, and contributing to the Additional Context Menus extension.

### Key Takeaways:

1. **Use pnpm** for dependency management
2. **Watch mode** (`pnpm run watch`) for active development
3. **Minimal testing** (`pnpm test`) for fast iteration
4. **Quality checks** before committing (lint, format, build, test)
5. **Follow conventions** in code style and structure
6. **Ask for help** when needed - community is here to support you

### Next Steps:

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Explore [source code](src/) to understand architecture
- Review existing [tests](test/) for patterns and best practices
- Check [service documentation](docs/services/) for API references

Happy coding! 🚀
