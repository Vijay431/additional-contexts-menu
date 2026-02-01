# ESLint Configuration Changes Review (with Monotonous Comments)

## Current State

- Single `eslint.config.mjs` with mixed rules
- Minimal comments, inconsistent style
- Test files have some relaxed rules but not comprehensive
- Lines 23-292 contain configuration

## Planned Changes with Monotonous Comments

### Comment Style Guidelines

**Monotonous Comments Pattern:**

````
// ============================================
// SECTION_NAME - Brief description
// ============================================
// Sub-section description if needed

// Category: Rule Category Name
// Purpose: Why these rules exist
// ```
````

### Complete ESLint Configuration with Monotonous Comments

```javascript
/**
 * Enterprise-grade ESLint configuration for VS Code Extension
 *
 * Configuration Philosophy:
 * - Separation of concerns: Strict rules for production code, relaxed for tests
 * - Type safety: Enforce TypeScript best practices in source files
 * - Security: Detect and prevent common vulnerabilities
 * - Consistency: Uniform code style across the codebase
 * - Maintainability: Clear documentation for all configuration choices
 *
 * Configuration Structure:
 * 1. Global Ignores - Applies to all configurations
 * 2. Base Configuration - Common rules shared by all TypeScript files
 * 3. STRICT Configuration - Source files (src/) with production-grade rules
 * 4. Exception Handlers - Special cases requiring rule overrides
 * 5. RELAXED Configuration - Test files (test/) with minimal validation
 * 6. Config Files Override - JavaScript configuration files
 */
// @ts-check

// ============================================
// IMPORTS - ESLint Plugins and Configurations
// ============================================
// Purpose: Import all necessary ESLint plugins and base configurations
// Each plugin provides specific linting capabilities
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import security from 'eslint-plugin-security';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-node';
import promisePlugin from 'eslint-plugin-promise';
import mochaPlugin from 'eslint-plugin-mocha';

export default tseslint.config(
  // ============================================
  // GLOBAL IGNORES - Applies to All Configurations
  // ============================================
  // Purpose: Define patterns to exclude from linting entirely
  // These files/directories should never be linted
  // Rationale: Build outputs, dependencies, and generated files
  {
    ignores: [
      // Build and test environment directories
      '.vscode-test/**', // VS Code test environment
      '.vscode-test-web/**', // VS Code web test environment
      'out/**', // TypeScript compiled output
      'dist/**', // Distribution build output

      // Dependencies and generated content
      'node_modules/**', // npm/pnpm dependencies
      'coverage/**', // Code coverage reports

      // Package artifacts
      '*.vsix', // VS Code extension packages

      // Content directories
      'blogs/**', // Blog content
      'docs/**', // Documentation

      // AI and specification tools
      '.specify/**', // Specify tool files
      'specs/**', // Specification files

      // Generated files
      'meta.json', // Build metadata
      'debug.log', // Debug output

      // Compiled files in source directories (prevent accidental commits)
      'src/**/*.js', // TypeScript compiled JavaScript
      'src/**/*.js.map', // TypeScript source maps
      'test/**/*.js', // Test compiled JavaScript
      'test/**/*.js.map', // Test source maps
      'scripts/**/*.js', // Scripts compiled JavaScript
      'scripts/**/*.js.map', // Scripts source maps
    ],
  },

  // ============================================
  // BASE CONFIGURATION - Common to All TypeScript Files
  // ============================================
  // Purpose: Apply baseline rules to all TypeScript files
  // These rules are fundamental and apply to both src/ and test/
  // Rationale: Establish minimal quality standards
  js.configs.recommended,
  ...tseslint.configs.recommended, // TypeScript recommended rules
  ...tseslint.configs.stylistic, // TypeScript stylistic rules
  security.configs.recommended, // Security vulnerability detection

  // ============================================
  // STRICT CONFIGURATION - Source Files (src/)
  // ============================================
  // Target: src/**/*.ts, src/**/*.tsx
  // Purpose: Enforce production-grade code quality with strict type safety,
  //          security best practices, and maintainability standards
  // Rationale: Source code is shipped to users and must be robust
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],

    // ============================================
    // PLUGINS - Activate ESLint Plugins for src/
    // ============================================
    // Purpose: Enable plugins that provide additional linting rules
    // Rationale: Each plugin adds specialized linting capabilities
    plugins: {
      '@stylistic': stylistic, // Code style and formatting rules
      security: security, // Security vulnerability detection
      import: importPlugin, // Import/export management
      node: nodePlugin, // Node.js specific patterns
      promise: promisePlugin, // Promise best practices
    },

    // ============================================
    // LANGUAGE OPTIONS - Parser and Environment Settings
    // ============================================
    // Purpose: Configure TypeScript parser and global variables
    // Rationale: Enable proper type checking and VS Code extension API access
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json', // Use src tsconfig for type checking
        tsconfigRootDir: import.meta.dirname, // Root directory for tsconfig resolution
      },
      globals: {
        // Node.js globals
        console: 'readonly', // Console API for extension output channels
        process: 'readonly', // Process information
        Buffer: 'readonly', // Buffer API for binary data
        __dirname: 'readonly', // Current directory path
        __filename: 'readonly', // Current file path
      },
    },

    // ============================================
    // SETTINGS - Plugin-Specific Configurations
    // ============================================
    // Purpose: Configure plugin behavior and resolution
    // Rationale: Enable proper import resolution for Node.js modules
    settings: {
      'import/resolver': {
        node: true, // Use Node.js resolution algorithm
      },
    },

    // ============================================
    // RULES - Strict Linting Rules for Production Code
    // ============================================

    // ============================================
    // Category: STYLISTIC RULES - Code Formatting Standards
    // ============================================
    // Purpose: Enforce consistent code formatting across the codebase
    // Rationale: Uniform style improves readability and reduces merge conflicts
    rules: {
      curly: ['error', 'all'],
      // Reason: Always use braces for all control structures (improves clarity)

      '@stylistic/semi': ['error', 'always'],
      // Reason: Enforce semicolons to avoid ASI (Automatic Semicolon Insertion) issues

      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      // Reason: Single quotes for consistency, allow double quotes when single quotes in string

      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      // Reason: Trailing commas help with diffs and cleaner code

      '@stylistic/indent': ['error', 2],
      // Reason: 2 spaces is the project standard for indentation

      '@stylistic/max-len': ['error', { code: 100, ignoreUrls: true }],
      // Reason: 100 chars keeps code readable, URLs are exempt
    },
  },

  // ============================================
  // STRICT RULES CONTINUED - TypeScript Best Practices
  // ============================================
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      '@stylistic': stylistic,
      security: security,
      import: importPlugin,
      node: nodePlugin,
      promise: promisePlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      // ============================================
      // Category: TYPESCRIPT RULES - Strict Type Safety
      // ============================================
      // Purpose: Enforce TypeScript best practices and type safety
      // Rationale: Catch type-related errors at compile time

      '@typescript-eslint/no-empty-function': 'off',
      // Reason: Allow empty functions (common in interfaces and callbacks)

      '@typescript-eslint/explicit-function-return-type': 'off',
      // Reason: Let TypeScript infer return types (reduces verbosity)

      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Reason: Let TypeScript infer component/export types

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // Allow unused args starting with _
          varsIgnorePattern: '^_', // Allow unused vars starting with _
          ignoreRestSiblings: true, // Allow rest patterns even if unused
        },
      ],
      // Reason: Catch unused variables but allow intentional ignored patterns

      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: false, // Don't allow any in rest args
        },
      ],
      // Reason: Prevent any type usage to maintain type safety

      'prefer-const': 'error',
      // Reason: Use const by default, only use let when reassignment needed

      '@typescript-eslint/no-var-requires': 'error',
      // Reason: Use ES6 imports instead of CommonJS require

      '@typescript-eslint/no-require-imports': 'error',
      // Reason: Use ES6 imports for better static analysis

      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // Reason: Use ?? instead of || to distinguish null/undefined from falsy values

      '@typescript-eslint/prefer-optional-chain': 'error',
      // Reason: Use ?. instead of && for cleaner optional property access

      '@typescript-eslint/no-unnecessary-condition': 'warn',
      // Reason: Warn about conditions that are always true/false

      '@typescript-eslint/no-floating-promises': 'error',
      // Reason: Ensure promises are handled (await or .catch)

      '@typescript-eslint/await-thenable': 'error',
      // Reason: Prevent awaiting non-thenable values

      '@typescript-eslint/no-misused-promises': 'error',
      // Reason: Catch misuse of promises in callbacks, forEach, etc.

      // ============================================
      // Category: NAMING CONVENTIONS - Enforce Naming Patterns
      // ============================================
      // Purpose: Ensure consistent naming conventions across the codebase
      // Rationale: Predictable naming improves code readability

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'parameter',
          filter: '^_',
          format: null, // Allow any format for ignored parameters
        },
        // Reason: Allow intentionally ignored parameters

        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        // Reason: Variables and functions use camelCase, classes use PascalCase,
        //        constants use UPPER_CASE

        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // Reason: Types, interfaces, classes use PascalCase

        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
        // Reason: Import names follow TypeScript conventions
      ],

      // ============================================
      // Category: SECURITY RULES - Vulnerability Detection
      // ============================================
      // Purpose: Detect common security vulnerabilities
      // Rationale: Prevent potential security issues in production code

      'security/detect-object-injection': 'warn',
      // Reason: Warn about potential object injection vulnerabilities

      'security/detect-non-literal-regexp': 'warn',
      // Reason: Warn about RegExp from user input (ReDoS risk)

      'security/detect-unsafe-regex': 'error',
      // Reason: Block unsafe regular expressions (ReDoS vulnerabilities)

      'security/detect-buffer-noassert': 'error',
      // Reason: Prevent buffer overflows with unsafe assertions

      'security/detect-child-process': 'warn',
      // Reason: Warn about child_process usage (command injection risk)

      'security/detect-disable-mustache-escape': 'error',
      // Reason: Prevent disabling Mustache escaping (XSS risk)

      'security/detect-eval-with-expression': 'error',
      // Reason: Prevent eval with expressions (code injection risk)

      'security/detect-no-csrf-before-method-override': 'error',
      // Reason: Prevent CSRF vulnerabilities in Express apps

      'security/detect-non-literal-fs-filename': 'warn',
      // Reason: Warn about dynamic file paths (path traversal risk)

      'security/detect-non-literal-require': 'warn',
      // Reason: Warn about dynamic requires (module injection risk)

      'security/detect-possible-timing-attacks': 'warn',
      // Reason: Warn about timing attack vulnerabilities

      'security/detect-pseudoRandomBytes': 'error',
      // Reason: Use crypto.randomBytes instead of pseudo-random functions

      // ============================================
      // Category: IMPORT RULES - Module Organization
      // ============================================
      // Purpose: Enforce consistent import organization
      // Rationale: Organized imports improve readability and maintainability

      'import/no-unresolved': 'off',
      // Reason: TypeScript handles module resolution better

      'import/named': 'off',
      // Reason: TypeScript validates named imports

      'import/default': 'off',
      // Reason: TypeScript validates default imports

      'import/namespace': 'off',
      // Reason: TypeScript validates namespace imports

      'import/no-absolute-path': 'error',
      // Reason: Avoid absolute paths for portability

      'import/no-dynamic-require': 'error',
      // Reason: Use static imports for better static analysis

      'import/no-self-import': 'off',
      // Reason: Can cause issues with TypeScript circular dependencies

      'import/no-cycle': 'off',
      // Reason: TypeScript handles circular dependency detection

      'import/no-useless-path-segments': 'error',
      // Reason: Remove unnecessary ./ or ../ in paths

      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      // Reason: Keep type imports at top for clarity

      'import/first': 'error',
      // Reason: Imports must be at top of file

      'import/newline-after-import': 'error',
      // Reason: Add blank line after imports for separation

      'import/no-duplicates': 'error',
      // Reason: Prevent duplicate imports (consolidate into one)

      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always', // Blank line between import groups
          alphabetize: { order: 'asc' }, // Alphabetize within groups
        },
      ],
      // Reason: Organize imports logically and alphabetically

      // ============================================
      // Category: NODE.JS RULES - Platform-Specific Patterns
      // ============================================
      // Purpose: Enforce Node.js best practices
      // Rationale: Ensure proper usage of Node.js APIs

      'node/no-missing-import': 'off',
      // Reason: TypeScript handles missing import detection

      'node/no-missing-require': 'off',
      // Reason: TypeScript handles missing require detection

      'node/no-unpublished-import': 'off',
      // Reason: DevDependencies are fine for development

      'node/no-unsupported-features/es-syntax': 'off',
      // Reason: TypeScript handles ES syntax support

      // ============================================
      // Category: PROMISE RULES - Async Code Quality
      // ============================================
      // Purpose: Enforce promise best practices
      // Rationale: Prevent common async/await mistakes

      'promise/always-return': 'error',
      // Reason: Ensure promise handlers always return or throw

      'promise/no-return-wrap': 'error',
      // Reason: Don't wrap values in promises unnecessarily

      'promise/param-names': 'error',
      // Reason: Use conventional parameter names for promise handlers

      'promise/catch-or-return': 'error',
      // Reason: Ensure promises are caught or returned

      'promise/no-native': 'off',
      // Reason: Native promises are fine

      'promise/no-nesting': 'warn',
      // Reason: Warn about deeply nested promise chains

      'promise/no-promise-in-callback': 'warn',
      // Reason: Warn about promises inside callbacks (async hell)

      'promise/no-callback-in-promise': 'warn',
      // Reason: Don't mix callbacks with promises

      // ============================================
      // Category: GENERAL CODE QUALITY - Best Practices
      // ============================================
      // Purpose: Enforce JavaScript best practices
      // Rationale: Prevent common anti-patterns and bugs

      'no-console': 'off',
      // Reason: VS Code extensions use console for output channels

      'no-debugger': 'error',
      // Reason: Remove debugger statements before committing

      'no-alert': 'error',
      // Reason: Don't use alert in VS Code extensions

      'no-eval': 'error',
      // Reason: eval is dangerous and slow

      'no-implied-eval': 'error',
      // Reason: Avoid implicit eval (setTimeout with string, etc.)

      'no-new-func': 'error',
      // Reason: Don't use Function constructor (similar to eval)

      'no-script-url': 'error',
      // Reason: Don't use javascript: URLs (XSS risk)

      'no-proto': 'error',
      // Reason: Don't use __proto__ property (deprecated)

      'no-iterator': 'error',
      // Reason: Don't use __iterator__ property (deprecated)

      'no-with': 'error',
      // Reason: Don't use with statement (ambiguous and slow)

      'no-var': 'error',
      // Reason: Use let/const instead of var

      'object-shorthand': 'error',
      // Reason: Use shorthand property syntax {x} instead of {x: x}

      'prefer-arrow-callback': 'error',
      // Reason: Use arrow callbacks instead of function() for consistency

      'prefer-template': 'error',
      // Reason: Use template literals instead of string concatenation

      'prefer-spread': 'error',
      // Reason: Use spread operator instead of Array.apply

      'prefer-rest-params': 'error',
      // Reason: Use rest parameters instead of arguments

      'no-duplicate-imports': 'error',
      // Reason: Consolidate duplicate imports

      'no-useless-constructor': 'error',
      // Reason: Remove empty constructors if not needed

      'no-useless-rename': 'error',
      // Reason: Don't rename if import and local name are same

      'no-useless-computed-key': 'error',
      // Reason: Don't use computed keys for static properties
    },
  },

  // ============================================
  // EXCEPTION HANDLERS - Special Case Overrides
  // ============================================
  // Purpose: Provide rule exceptions for specific files/situations
  // Rationale: Some code patterns require rule violations by design

  // ============================================
  // Exception: Babel AST Service
  // ============================================
  // File: src/services/codeAnalysisService.ts
  // Reason: AST manipulation requires dynamic property access and any types
  {
    files: ['src/services/codeAnalysisService.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Reason: AST nodes have dynamic types that require 'any'

      'security/detect-object-injection': 'off',
      // Reason: AST traversal uses dynamic property access
    },
  },

  // ============================================
  // RELAXED CONFIGURATION - Test Files (test/)
  // ============================================
  // Target: test/**/*.ts, **/*.test.ts, **/*.spec.ts
  // Purpose: Minimal validation to allow flexible test code
  // Rationale: Tests need flexibility for mocks, fixtures, and edge cases
  {
    files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],

    // ============================================
    // PLUGINS - Activate Test-Specific Plugins
    // ============================================
    plugins: {
      mocha: mochaPlugin, // Mocha test framework rules
    },

    // ============================================
    // LANGUAGE OPTIONS - Test Environment Settings
    // ============================================
    // Purpose: Configure parser and test framework globals
    // Rationale: Enable Mocha test functions and Node.js test globals
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.test.json', // Use test-specific tsconfig
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // Mocha test framework globals
        describe: 'readonly', // Test suite definition
        it: 'readonly', // Test case definition
        before: 'readonly', // Setup hook
        beforeEach: 'readonly', // Setup hook per test
        after: 'readonly', // Teardown hook
        afterEach: 'readonly', // Teardown hook per test
        suite: 'readonly', // Alternative test suite
        test: 'readonly', // Alternative test case
        setup: 'readonly', // Alternative setup hook
        teardown: 'readonly', // Alternative teardown hook
        suiteSetup: 'readonly', // Alternative suite setup
        suiteTeardown: 'readonly', // Alternative suite teardown

        // Node.js test globals
        NodeJS: 'readonly', // NodeJS namespace
      },
    },

    // ============================================
    // RULES - Minimal Validation for Test Files
    // ============================================
    rules: {
      // ============================================
      // Category: MOCHA FRAMEWORK RULES - Test Structure Validation
      // ============================================
      // Purpose: Ensure proper Mocha test structure
      // Rationale: Catch common test organization mistakes

      'mocha/no-exclusive-tests': 'error',
      // Reason: Prevent .only from accidentally committing (skips other tests)

      'mocha/no-pending-tests': 'warn',
      // Reason: Warn about .skip (remind to implement or remove)

      'mocha/no-synchronous-tests': 'off',
      // Reason: Allow synchronous tests when needed

      'mocha/no-global-tests': 'error',
      // Reason: Tests must be inside describe/suite blocks

      'mocha/no-return-and-callback': 'error',
      // Reason: Don't mix return and callback in async tests

      'mocha/valid-test-title': 'warn',
      // Reason: Encourage descriptive test titles

      'mocha/valid-suite-title': 'warn',
      // Reason: Encourage descriptive suite titles

      'mocha/no-sibling-hooks': 'error',
      // Reason: Don't place hooks at same level as tests

      'mocha/no-mocha-arrows': 'error',
      // Reason: Don't use arrow functions for tests (this context issues)

      'mocha/no-hooks-for-single-case': 'off',
      // Reason: Allow hooks for single test case

      'mocha/no-top-level-hooks': 'error',
      // Reason: Hooks must be inside describe blocks

      'mocha/no-identical-title': 'error',
      // Reason: Prevent duplicate test titles (confusing)

      // ============================================
      // Category: TYPESCRIPT RULES - ALL DISABLED
      // ============================================
      // Purpose: Allow maximum flexibility in test code
      // Rationale: Tests need flexibility for mocks, fixtures, edge cases

      '@typescript-eslint/no-explicit-any': 'off',
      // Reason: Tests can use 'any' for mocks and dynamic data

      '@typescript-eslint/no-non-null-assertion': 'off',
      // Reason: Tests can use ! for intentional non-null assertions

      '@typescript-eslint/no-unused-expressions': 'off',
      // Reason: Allow expressions for assertions and side effects

      '@typescript-eslint/no-unused-vars': 'off',
      // Reason: Allow unused variables for defensive coding and debugging

      '@typescript-eslint/naming-convention': 'off',
      // Reason: Allow intentional prefixes (_fixture, _mock, etc.)

      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Reason: Allow defensive checks for robustness

      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      // Reason: Allow || for backward compatibility and readability

      '@typescript-eslint/prefer-optional-chain': 'off',
      // Reason: Allow && checking for clarity in tests

      '@typescript-eslint/no-floating-promises': 'off',
      // Reason: Allow unhandled promises in test setups

      '@typescript-eslint/no-require-imports': 'off',
      // Reason: Allow require for dynamic imports in tests

      '@typescript-eslint/no-var-requires': 'off',
      // Reason: Allow require statements in test helpers

      '@typescript-eslint/explicit-function-return-type': 'off',
      // Reason: No need for explicit types in tests

      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Reason: No need for explicit types in tests

      '@typescript-eslint/no-empty-function': 'off',
      // Reason: Allow empty functions in test mocks

      '@typescript-eslint/await-thenable': 'off',
      // Reason: Allow awaiting non-thenable in test edge cases

      '@typescript-eslint/no-misused-promises': 'off',
      // Reason: Allow flexible promise usage in tests

      // ============================================
      // Category: SECURITY RULES - ALL DISABLED
      // ============================================
      // Purpose: Allow security-sensitive patterns in tests
      // Rationale: Tests intentionally use dynamic access, eval, etc.

      'security/detect-non-literal-fs-filename': 'off',
      // Reason: Tests use dynamic file paths for fixtures

      'security/detect-child-process': 'off',
      // Reason: Tests can spawn child processes for testing

      'security/detect-object-injection': 'off',
      // Reason: Tests use dynamic access for flexible mocking

      'security/detect-non-literal-regexp': 'off',
      // Reason: Tests can create dynamic regex patterns

      'security/detect-unsafe-regex': 'off',
      // Reason: Test regex patterns intentionally

      'security/detect-buffer-noassert': 'off',
      // Reason: Test buffer operations intentionally

      'security/detect-disable-mustache-escape': 'off',
      // Reason: Test template rendering intentionally

      'security/detect-eval-with-expression': 'off',
      // Reason: Tests can use eval for dynamic code testing

      'security/detect-no-csrf-before-method-override': 'off',
      // Reason: Test CSRF handling intentionally

      'security/detect-non-literal-require': 'off',
      // Reason: Tests can use dynamic requires

      'security/detect-possible-timing-attacks': 'off',
      // Reason: Test timing-sensitive code intentionally

      'security/detect-pseudoRandomBytes': 'off',
      // Reason: Test random number generation intentionally

      // ============================================
      // Category: IMPORT RULES - ALL DISABLED
      // ============================================
      // Purpose: Allow flexible import organization in tests
      // Rationale: Tests have different import patterns than source code

      'import/no-dynamic-require': 'off',
      // Reason: Tests can use dynamic requires for fixtures

      'import/first': 'off',
      // Reason: Allow imports anywhere in test files

      'import/newline-after-import': 'off',
      // Reason: No need for blank lines after imports

      'import/no-duplicates': 'off',
      // Reason: Allow duplicate imports for clarity

      'import/order': 'off',
      // Reason: No import ordering requirements in tests

      'import/no-self-import': 'off',
      // Reason: Allow self imports if needed

      'import/no-cycle': 'off',
      // Reason: Allow circular dependencies in tests

      'import/consistent-type-specifier-style': 'off',
      // Reason: No type import style requirements

      'import/no-useless-path-segments': 'off',
      // Reason: Allow verbose paths for clarity

      'import/no-absolute-path': 'off',
      // Reason: Allow absolute paths in test configs

      // ============================================
      // Category: PROMISE RULES - ALL DISABLED
      // ============================================
      // Purpose: Allow flexible promise handling in tests
      // Rationale: Tests need flexibility for async testing patterns

      'promise/always-return': 'off',
      // Reason: Allow promises without returns in tests

      'promise/no-return-wrap': 'off',
      // Reason: Allow wrapping values in promises

      'promise/param-names': 'off',
      // Reason: Allow any parameter names

      'promise/catch-or-return': 'off',
      // Reason: Allow unhandled promises in tests

      'promise/no-nesting': 'off',
      // Reason: Allow deeply nested promises

      'promise/no-promise-in-callback': 'off',
      // Reason: Allow promises in callbacks

      'promise/no-callback-in-promise': 'off',
      // Reason: Allow callbacks in promises

      // ============================================
      // Category: GENERAL CODE QUALITY - ALL DISABLED
      // ============================================
      // Purpose: Allow flexibility for test-specific patterns
      // Rationale: Tests have different requirements than production code

      'no-console': 'off',
      // Reason: Tests can use console for debugging

      'no-debugger': 'off',
      // Reason: Allow debugger statements for test debugging

      'no-alert': 'off',
      // Reason: Allow alert in test UI tests

      'no-eval': 'off',
      // Reason: Allow eval for dynamic code testing

      'no-implied-eval': 'off',
      // Reason: Allow setTimeout with strings

      'no-new-func': 'off',
      // Reason: Allow Function constructor in tests

      'no-script-url': 'off',
      // Reason: Allow javascript: URLs in test URLs

      'no-proto': 'off',
      // Reason: Allow __proto__ in test edge cases

      'no-iterator': 'off',
      // Reason: Allow __iterator__ in legacy tests

      'no-with': 'off',
      // Reason: Allow with statement in test edge cases

      'no-var': 'off',
      // Reason: Allow var in test fixtures

      'object-shorthand': 'off',
      // Reason: Allow verbose object syntax

      'prefer-arrow-callback': 'off',
      // Reason: Mocha requires regular functions

      'prefer-template': 'off',
      // Reason: Allow string concatenation

      'prefer-spread': 'off',
      // Reason: Allow Array.apply for compatibility

      'prefer-rest-params': 'off',
      // Reason: Allow arguments object

      'no-duplicate-imports': 'off',
      // Reason: Allow duplicate imports

      'no-useless-constructor': 'off',
      // Reason: Allow constructors in test classes

      'no-useless-rename': 'off',
      // Reason: Allow renaming for clarity

      'no-useless-computed-key': 'off',
      // Reason: Allow computed keys in test fixtures

      'no-useless-escape': 'off',
      // Reason: Allow intentional escapes in regex patterns

      curly: 'off',
      // Reason: Allow single-line if statements

      'prefer-const': 'off',
      // Reason: Allow let for reassignment in tests

      // ============================================
      // Category: STYLISTIC RULES - RELAXED
      // ============================================
      // Purpose: Minimal formatting rules for tests
      // Rationale: Allow flexible formatting for test readability

      '@stylistic/max-len': ['error', { code: 120 }],
      // Reason: Allow longer lines in tests (120 instead of 100)

      '@stylistic/semi': 'off',
      // Reason: No semicolon enforcement

      '@stylistic/quotes': 'off',
      // Reason: No quote style enforcement

      '@stylistic/comma-dangle': 'off',
      // Reason: No comma-dangle enforcement

      '@stylistic/indent': 'off',
      // Reason: No indent enforcement
    },
  },

  // ============================================
  // CONFIGURATION FILES OVERRIDE - JavaScript Configs
  // ============================================
  // Target: *.config.js, *.config.mjs, esbuild.config.js
  // Purpose: Allow CommonJS patterns in config files
  // Rationale: Config files use require and module.exports
  {
    files: ['*.config.js', '*.config.mjs', 'esbuild.config.js'],

    // ============================================
    // LANGUAGE OPTIONS - Config File Globals
    // ============================================
    // Purpose: Provide CommonJS globals
    // Rationale: Config files use CommonJS patterns
    languageOptions: {
      globals: {
        require: 'readonly', // CommonJS require
        module: 'readonly', // CommonJS module
        exports: 'readonly', // CommonJS exports
        process: 'readonly', // Node.js process
        console: 'readonly', // Console
        __dirname: 'readonly', // Current directory
        __filename: 'readonly', // Current file
        Buffer: 'readonly', // Buffer API
        global: 'readonly', // Global object
      },
    },

    // ============================================
    // RULES - Config File Exceptions
    // ============================================
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // Reason: Config files use require

      '@typescript-eslint/no-var-requires': 'off',
      // Reason: Config files use require

      'no-undef': 'off',
      // Reason: Config globals are defined

      'security/detect-non-literal-require': 'off',
      // Reason: Config files use dynamic requires

      'import/no-dynamic-require': 'off',
      // Reason: Config files use dynamic requires
    },
  },
);
```

## Monotonous Comment Characteristics

### 1. **Consistent Section Headers**

```
// ============================================
// SECTION_NAME - Brief description
// ============================================
```

### 2. **Explanatory Comments for Each Category**

```
// Category: RULE_CATEGORY_NAME - Purpose
// Purpose: Why these rules exist
// Rationale: Detailed explanation
```

### 3. **Inline Rule Explanations**

```
'rule-name': 'error',
// Reason: Why this rule is configured this way
```

### 4. **Target File Patterns**

```
// Target: pattern/**/*.ts
// Purpose: What this configuration applies to
// Rationale: Why this pattern is used
```

### 5. **Plugin Activation Comments**

```
// ============================================
// PLUGINS - Activate ESLint Plugins for X
// ============================================
// Purpose: Enable plugins for specific linting capabilities
// Rationale: Each plugin adds specialized rules
```

## Comparison: Before vs After

### Before (Minimal Comments)

```javascript
export default tseslint.config(
  {
    ignores: [
      '.vscode-test/**',
      'out/**',
      // ... many entries without comments
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      curly: ['error', 'all'],
      '@stylistic/semi': ['error', 'always'],
      // ... many rules without explanations
    },
  },
);
```

### After (Monotonous Comments)

```javascript
export default tseslint.config(
  // ============================================
  // GLOBAL IGNORES - Applies to All Configurations
  // ============================================
  // Purpose: Define patterns to exclude from linting entirely
  // Rationale: Build outputs, dependencies, and generated files
  {
    ignores: [
      // Build and test environment directories
      '.vscode-test/**', // VS Code test environment
      'out/**', // TypeScript compiled output
      // ... entries with inline comments
    ],
  },

  // ============================================
  // STRICT CONFIGURATION - Source Files (src/)
  // ============================================
  // Target: src/**/*.ts, src/**/*.tsx
  // Purpose: Enforce production-grade code quality
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // Category: STYLISTIC RULES - Code Formatting
      // Purpose: Enforce consistent code formatting
      curly: ['error', 'all'],
      // Reason: Always use braces (improves clarity)
      '@stylistic/semi': ['error', 'always'],
      // Reason: Enforce semicolons to avoid ASI issues
      // ... rules with inline explanations
    },
  },
);
```

## Benefits of Monotonous Comments

1. **Self-Documenting** - Configuration explains itself
2. **Onboarding** - New contributors understand rules quickly
3. **Maintenance** - Easy to remember why rules are configured
4. **Reviewability** - Changes are clear and justified
5. **Auditability** - Configuration decisions are traceable
6. **Consistency** - Uniform style throughout the file

## Comment Coverage

- **100% coverage** - Every section has header comment
- **100% coverage** - Every rule category has purpose comment
- **100% coverage** - Every rule has inline explanation
- **100% coverage** - Every file pattern has target comment
- **100% coverage** - Every exception has reason comment

## Migration Path

1. Replace eslint.config.mjs with new commented version
2. Verify no linting errors (comments don't affect execution)
3. Run tests to ensure configuration works correctly
4. Review comments for clarity and completeness
