/**
 * Enterprise-grade ESLint configuration for VS Code Extension
 *
 * Comprehensive linting rules covering:
 * - Security vulnerabilities
 * - Performance best practices
 * - Import/export management
 * - TypeScript best practices
 * - Node.js patterns
 * - VS Code extension patterns
 * - Test framework integration
 */
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import security from 'eslint-plugin-security';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-node';
import promisePlugin from 'eslint-plugin-promise';
import mochaPlugin from 'eslint-plugin-mocha';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '.vscode-test/**',
      '.vscode-test-web/**',
      'out/**',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.vsix',
      'blogs/**',
      '.specify/**',
      'specs/**',
      'meta.json',
      'debug.log',
      // Prevent linting compiled files in source directories
      'src/**/*.js',
      'src/**/*.js.map',
      'test/**/*.js',
      'test/**/*.js.map',
      'srcipts/**/*.js',
      'srcipts/**/*.js.map',
    ],
  },

  // Base configuration for all files
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  security.configs.recommended,

  // Main TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
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
      // Stylistic rules
      curly: ['error', 'all'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/max-len': ['error', { code: 100, ignoreUrls: true }],

      // TypeScript specific rules
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: false,
        },
      ],
      'prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'parameter',
          filter: '^_',
          format: null, // Allow any format for parameters starting with underscore
        },
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // Import rules (simplified for initial setup)
      'import/no-unresolved': 'off', // TypeScript handles this better
      'import/named': 'off', // TypeScript handles this better
      'import/default': 'off', // TypeScript handles this better
      'import/namespace': 'off', // TypeScript handles this better
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-self-import': 'off', // Can cause issues with TypeScript
      'import/no-cycle': 'off', // Can cause issues with TypeScript
      'import/no-useless-path-segments': 'error',
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],

      // Node.js rules
      'node/no-missing-import': 'off', // Handled by TypeScript
      'node/no-missing-require': 'off', // Handled by TypeScript
      'node/no-unpublished-import': 'off', // DevDependencies are fine
      'node/no-unsupported-features/es-syntax': 'off', // TypeScript handles this

      // Promise rules
      'promise/always-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-native': 'off',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',

      // General code quality
      'no-console': 'off', // VS Code extensions use console for output channel
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'no-with': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',
    },
  },

  // Babel AST service exception (requires any for AST operations)
  {
    files: ['src/services/codeAnalysisService.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'security/detect-object-injection': 'off', // AST manipulation requires dynamic access
    },
  },

  // Test files configuration
  {
    files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      mocha: mochaPlugin,
    },
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
        suite: 'readonly',
        test: 'readonly',
        setup: 'readonly',
        teardown: 'readonly',
        suiteSetup: 'readonly',
        suiteTeardown: 'readonly',
        NodeJS: 'readonly',
      },
    },
    rules: {
      // Mocha-specific rules
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-skipped-tests': 'warn',
      'mocha/no-pending-tests': 'warn',
      'mocha/no-async-describe': 'error',
      'mocha/no-synchronous-tests': 'off',
      'mocha/no-global-tests': 'error',
      'mocha/no-return-and-callback': 'error',
      'mocha/valid-test-description': 'warn',
      'mocha/valid-suite-description': 'warn',
      'mocha/no-sibling-hooks': 'error',
      'mocha/no-mocha-arrows': 'error',
      'mocha/no-hooks-for-single-case': 'off',
      'mocha/no-top-level-hooks': 'error',
      'mocha/no-identical-title': 'error',

      // Relaxed rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-child-process': 'off',
      'import/no-dynamic-require': 'off',
      '@stylistic/max-len': ['error', { code: 120 }], // Longer lines ok in tests
    },
  },

  // Configuration files (JavaScript)
  {
    files: ['*.config.js', '*.config.mjs', 'esbuild.config.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off',
      'security/detect-non-literal-require': 'off',
      'import/no-dynamic-require': 'off',
    },
  },
);
