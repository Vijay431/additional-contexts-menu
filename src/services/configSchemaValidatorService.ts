import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Configuration file types that can be validated
 */
export type ConfigFileType =
  | 'tsconfig'
  | 'tsconfig.json'
  | 'eslint'
  | '.eslintrc'
  | '.eslintrc.json'
  | '.eslintrc.yml'
  | '.eslintrc.yaml'
  | 'eslint.config.js'
  | 'eslint.config.mjs'
  | 'prettier'
  | '.prettierrc'
  | '.prettierrc.json'
  | '.prettierrc.yml'
  | '.prettierrc.yaml'
  | '.prettierrc.js'
  | 'prettier.config.js';

/**
 * Validation result for a configuration file
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** List of errors found */
  errors: ValidationError[];
  /** List of warnings found */
  warnings: ValidationWarning[];
  /** Suggested fixes for common issues */
  fixes: SuggestedFix[];
}

/**
 * Represents a validation error
 */
export interface ValidationError {
  /** The property path that has the error */
  property: string;
  /** Error message */
  message: string;
  /** Expected value/type */
  expected?: string;
  /** Actual value received */
  actual?: string;
  /** Line number in the file (if available) */
  line?: number;
}

/**
 * Represents a validation warning
 */
export interface ValidationWarning {
  /** The property path that has the warning */
  property: string;
  /** Warning message */
  message: string;
  /** Suggestion for improvement */
  suggestion?: string;
}

/**
 * Suggested fix for a configuration issue
 */
export interface SuggestedFix {
  /** Description of the fix */
  description: string;
  /** The fix to apply */
  fix: vscode.TextEdit;
}

/**
 * Service for validating configuration files against their JSON schemas
 */
export class ConfigSchemaValidatorService {
  private readonly logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Validates the currently active configuration file
   */
  async validateCurrentFile(): Promise<ValidationResult> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('No active editor found');
    }

    const fileName = editor.document.fileName;
    const configType = this.detectConfigType(fileName);

    if (!configType) {
      throw new Error(
        'Unsupported configuration file type. Supported types: tsconfig.json, eslint config files, prettier config files',
      );
    }

    return this.validateFile(editor.document, configType);
  }

  /**
   * Validates a configuration file document
   */
  async validateFile(
    document: vscode.TextDocument,
    configType: ConfigFileType,
  ): Promise<ValidationResult> {
    const content = document.getText();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fixes: SuggestedFix[] = [];

    try {
      // Parse the configuration file
      const config = this.parseConfig(content, configType);

      if (config === null) {
        return {
          isValid: false,
          errors: [
            {
              property: 'root',
              message: 'Failed to parse configuration file',
            },
          ],
          warnings: [],
          fixes: [],
        };
      }

      // Validate based on config type
      if (configType.startsWith('tsconfig')) {
        this.validateTsConfig(config, errors, warnings, fixes);
      } else if (configType.startsWith('eslint')) {
        this.validateEslintConfig(config, errors, warnings, fixes);
      } else if (configType.startsWith('prettier')) {
        this.validatePrettierConfig(config, errors, warnings, fixes);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixes: fixes.length > 0 ? fixes : [],
      };
    } catch (error) {
      this.logger.error('Error validating configuration file', error);

      return {
        isValid: false,
        errors: [
          {
            property: 'root',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
        warnings: [],
        fixes: [],
      };
    }
  }

  /**
   * Detects the configuration file type from the filename
   */
  private detectConfigType(fileName: string): ConfigFileType | null {
    const baseName = fileName.split('/').pop() || fileName.split('\\').pop() || '';

    // TypeScript config
    if (baseName === 'tsconfig.json' || baseName === 'tsconfig') {
      return baseName as ConfigFileType;
    }

    // ESLint configs
    if (
      baseName === '.eslintrc' ||
      baseName === '.eslintrc.json' ||
      baseName === '.eslintrc.yml' ||
      baseName === '.eslintrc.yaml' ||
      baseName === 'eslint.config.js' ||
      baseName === 'eslint.config.mjs'
    ) {
      return baseName as ConfigFileType;
    }

    // Prettier configs
    if (
      baseName === '.prettierrc' ||
      baseName === '.prettierrc.json' ||
      baseName === '.prettierrc.yml' ||
      baseName === '.prettierrc.yaml' ||
      baseName === '.prettierrc.js' ||
      baseName === 'prettier.config.js'
    ) {
      return baseName as ConfigFileType;
    }

    return null;
  }

  /**
   * Parses the configuration file content
   */
  private parseConfig(content: string, configType: ConfigFileType): unknown {
    try {
      // Handle YAML-like configs (simple JSON parsing for now)
      if (configType.endsWith('.yml') || configType.endsWith('.yaml')) {
        // For YAML, we'd need a YAML parser. For now, try JSON
        try {
          return JSON.parse(content);
        } catch {
          // If JSON parsing fails, return null
          this.logger.warn('YAML parsing not fully supported, attempting JSON parse');
          return null;
        }
      }

      // Handle JS configs (simplified - just parse JSON-like structure)
      if (configType.endsWith('.js') || configType.endsWith('.mjs')) {
        // For JS configs, we'd need to evaluate or parse differently
        // For now, try to extract JSON from module.exports or export default
        const jsonMatch = content.match(/module\.exports\s*=\s*({[\s\S]*});?/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1]);
        }
        const exportMatch = content.match(/export default\s*({[\s\S]*});?/);
        if (exportMatch && exportMatch[1]) {
          return JSON.parse(exportMatch[1]);
        }
        this.logger.warn('JS config parsing is limited');
        return null;
      }

      // Handle JSON configs
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Error parsing configuration', error);
      return null;
    }
  }

  /**
   * Validates TypeScript configuration
   */
  private validateTsConfig(
    config: unknown,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    _fixes: SuggestedFix[],
  ): void {
    if (typeof config !== 'object' || config === null) {
      errors.push({
        property: 'root',
        message: 'tsconfig.json must be a JSON object',
      });
      return;
    }

    const tsconfig = config as Record<string, unknown>;

    // Check for required compilerOptions
    if (!tsconfig['compilerOptions']) {
      warnings.push({
        property: 'compilerOptions',
        message: 'Missing compilerOptions',
        suggestion: 'Add compilerOptions to configure TypeScript compilation',
      });
    } else {
      if (typeof tsconfig['compilerOptions'] !== 'object' || tsconfig['compilerOptions'] === null) {
        errors.push({
          property: 'compilerOptions',
          message: 'compilerOptions must be an object',
        });
      } else {
        const compilerOptions = tsconfig['compilerOptions'] as Record<string, unknown>;

        // Check for common issues
        if (compilerOptions['target'] && typeof compilerOptions['target'] === 'string') {
          const validTargets = ['ES3', 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', 'ES2021', 'ES2022', 'ESNext'];
          if (!validTargets.includes(compilerOptions['target'])) {
            errors.push({
              property: 'compilerOptions.target',
              message: `Invalid target value: ${compilerOptions['target']}`,
              expected: validTargets.join(', '),
              actual: String(compilerOptions['target']),
            });
          }
        }

        if (compilerOptions['module'] && typeof compilerOptions['module'] === 'string') {
          const validModules = ['None', 'CommonJS', 'AMD', 'System', 'UMD', 'ES6', 'ES2015', 'ES2020', 'ES2022', 'ESNext', 'Node16', 'NodeNext', 'Preserve'];
          if (!validModules.includes(compilerOptions['module'])) {
            errors.push({
              property: 'compilerOptions.module',
              message: `Invalid module value: ${compilerOptions['module']}`,
              expected: validModules.join(', '),
              actual: String(compilerOptions['module']),
            });
          }
        }

        // Check for inconsistent settings
        if (compilerOptions['strict'] === false) {
          warnings.push({
            property: 'compilerOptions.strict',
            message: 'strict mode is disabled',
            suggestion: 'Enabling strict mode provides stronger type checking',
          });
        }

        if (compilerOptions['esModuleInterop'] === false) {
          warnings.push({
            property: 'compilerOptions.esModuleInterop',
            message: 'esModuleInterop is disabled',
            suggestion: 'Enabling esModuleInterop improves import compatibility',
          });
        }

        if (compilerOptions['skipLibCheck'] === undefined) {
          warnings.push({
            property: 'compilerOptions.skipLibCheck',
            message: 'skipLibCheck is not set',
            suggestion: 'Setting skipLibCheck to true can improve compilation time',
          });
        }

        // Check for deprecated options
        if (compilerOptions['noUnusedLocals'] === true && compilerOptions['noUnusedParameters'] === undefined) {
          warnings.push({
            property: 'compilerOptions.noUnusedParameters',
            message: 'noUnusedLocals is set but noUnusedParameters is not',
            suggestion: 'Consider also enabling noUnusedParameters for complete unused code checking',
          });
        }
      }
    }

    // Check extends references
    if (tsconfig['extends']) {
      if (typeof tsconfig['extends'] !== 'string' && !Array.isArray(tsconfig['extends'])) {
        errors.push({
          property: 'extends',
          message: 'extends must be a string or array of strings',
        });
      }
    }

    // Check include/exclude
    if (tsconfig['include'] && !Array.isArray(tsconfig['include'])) {
      errors.push({
        property: 'include',
        message: 'include must be an array of glob patterns',
      });
    }

    if (tsconfig['exclude'] && !Array.isArray(tsconfig['exclude'])) {
      errors.push({
        property: 'exclude',
        message: 'exclude must be an array of glob patterns',
      });
    }

    // Check for baseUrl without paths
    if (tsconfig['compilerOptions'] && typeof tsconfig['compilerOptions'] === 'object') {
      const compilerOptions = tsconfig['compilerOptions'] as Record<string, unknown>;
      if (compilerOptions['baseUrl'] && !compilerOptions['paths']) {
        warnings.push({
          property: 'compilerOptions.paths',
          message: 'baseUrl is set without paths',
          suggestion: 'Consider adding paths for module aliasing',
        });
      }
    }
  }

  /**
   * Validates ESLint configuration
   */
  private validateEslintConfig(
    config: unknown,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    _fixes: SuggestedFix[],
  ): void {
    if (typeof config !== 'object' || config === null) {
      errors.push({
        property: 'root',
        message: 'ESLint config must be a JSON object',
      });
      return;
    }

    const eslintConfig = config as Record<string, unknown>;

    // Check for env/eslintEnv
    const hasEnv = eslintConfig['env'] !== undefined;
    const hasGlobs = eslintConfig['globs'] !== undefined;
    const hasRules = eslintConfig['rules'] !== undefined;

    if (!hasEnv && !hasGlobs && !hasRules && eslintConfig['extends'] === undefined) {
      warnings.push({
        property: 'root',
        message: 'Configuration appears to be empty',
        suggestion: 'Add extends, rules, or env to configure ESLint behavior',
      });
    }

    // Validate rules object
    if (eslintConfig['rules'] && typeof eslintConfig['rules'] !== 'object') {
      errors.push({
        property: 'rules',
        message: 'rules must be an object',
      });
    }

    // Validate env
    if (eslintConfig['env'] && typeof eslintConfig['env'] !== 'object') {
      errors.push({
        property: 'env',
        message: 'env must be an object',
      });
    }

    // Validate extends
    if (eslintConfig['extends']) {
      if (typeof eslintConfig['extends'] !== 'string' && !Array.isArray(eslintConfig['extends'])) {
        errors.push({
          property: 'extends',
          message: 'extends must be a string or array of strings',
        });
      } else {
        const extendsArray = Array.isArray(eslintConfig['extends'])
          ? eslintConfig['extends']
          : [eslintConfig['extends']];

        extendsArray.forEach((extendValue) => {
          if (typeof extendValue !== 'string') {
            errors.push({
              property: 'extends',
              message: 'Each extends entry must be a string',
              actual: String(extendValue),
            });
          }
        });
      }
    }

    // Check for parser options
    if (eslintConfig['parserOptions'] && typeof eslintConfig['parserOptions'] !== 'object') {
      errors.push({
        property: 'parserOptions',
        message: 'parserOptions must be an object',
      });
    }

    // Validate plugins
    if (eslintConfig['plugins']) {
      if (!Array.isArray(eslintConfig['plugins'])) {
        errors.push({
          property: 'plugins',
          message: 'plugins must be an array',
        });
      } else {
        eslintConfig['plugins'].forEach((plugin) => {
          if (typeof plugin !== 'string') {
            errors.push({
              property: 'plugins',
              message: 'Each plugin must be a string',
              actual: String(plugin),
            });
          }
        });
      }
    }

    // Check for common misconfigurations
    if (eslintConfig['rules'] && typeof eslintConfig['rules'] === 'object') {
      const rules = eslintConfig['rules'] as Record<string, unknown>;

      // Check for rules set to "off" that should be removed
      const offRules = Object.entries(rules).filter(([_, value]) => value === 'off' || value === 0);
      if (offRules.length > 5) {
        warnings.push({
          property: 'rules',
          message: `${offRules.length} rules are disabled`,
          suggestion: 'Consider removing disabled rules to reduce configuration clutter',
        });
      }

      // Check for rule severity inconsistencies
      const ruleEntries = Object.entries(rules);
      ruleEntries.forEach(([ruleName, ruleConfig]) => {
        if (Array.isArray(ruleConfig)) {
          if (ruleConfig.length === 0) {
            errors.push({
              property: `rules.${ruleName}`,
              message: 'Rule array configuration is empty',
            });
          } else {
            const severity = ruleConfig[0];
            if (typeof severity !== 'number' && typeof severity !== 'string') {
              errors.push({
                property: `rules.${ruleName}`,
                message: 'Rule severity must be a number or string',
                expected: '0, 1, 2, "off", "warn", or "error"',
                actual: String(severity),
              });
            } else if (typeof severity === 'number' && (severity < 0 || severity > 2)) {
              errors.push({
                property: `rules.${ruleName}`,
                message: 'Rule severity number must be 0, 1, or 2',
                actual: String(severity),
              });
            } else if (typeof severity === 'string' && !['off', 'warn', 'error'].includes(severity)) {
              errors.push({
                property: `rules.${ruleName}`,
                message: 'Rule severity string must be "off", "warn", or "error"',
                actual: severity,
              });
            }
          }
        }
      });
    }

    // Suggest using flat config if using legacy config
    if (eslintConfig['rules'] && eslintConfig['extends'] && !eslintConfig['globs']) {
      warnings.push({
        property: 'root',
        message: 'Using legacy ESLint configuration',
        suggestion: 'Consider migrating to ESLint flat config (eslint.config.js)',
      });
    }
  }

  /**
   * Validates Prettier configuration
   */
  private validatePrettierConfig(
    config: unknown,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    _fixes: SuggestedFix[],
  ): void {
    if (typeof config !== 'object' || config === null) {
      errors.push({
        property: 'root',
        message: 'Prettier config must be a JSON object',
      });
      return;
    }

    const prettierConfig = config as Record<string, unknown>;

    // Check for empty config
    if (Object.keys(prettierConfig).length === 0) {
      warnings.push({
        property: 'root',
        message: 'Configuration is empty',
        suggestion: 'Add options to configure Prettier behavior',
      });
    }

    // Validate known options
    const validOptions = [
      'printWidth',
      'tabWidth',
      'useTabs',
      'semi',
      'singleQuote',
      'quoteProps',
      'jsxSingleQuote',
      'trailingComma',
      'bracketSpacing',
      'bracketSameLine',
      'arrowParens',
      'proseWrap',
      'htmlWhitespaceSensitivity',
      'endOfLine',
      'embeddedLanguageFormatting',
      'singleAttributePerLine',
      'overrides',
      'plugins',
    ];

    Object.keys(prettierConfig).forEach((key) => {
      if (!validOptions.includes(key)) {
        warnings.push({
          property: key,
          message: `Unknown Prettier option: ${key}`,
          suggestion: 'This option may be deprecated or invalid',
        });
      }
    });

    // Validate printWidth
    if (prettierConfig['printWidth'] !== undefined) {
      if (typeof prettierConfig['printWidth'] !== 'number') {
        errors.push({
          property: 'printWidth',
          message: 'printWidth must be a number',
          expected: 'number (default: 80)',
          actual: typeof prettierConfig['printWidth'],
        });
      } else if (prettierConfig['printWidth'] < 0) {
        errors.push({
          property: 'printWidth',
          message: 'printWidth must be positive',
          actual: String(prettierConfig['printWidth']),
        });
      } else if (prettierConfig['printWidth'] > 200) {
        warnings.push({
          property: 'printWidth',
          message: 'printWidth is very large',
          suggestion: 'Consider using a smaller value for better readability',
        });
      }
    }

    // Validate tabWidth
    if (prettierConfig['tabWidth'] !== undefined) {
      if (typeof prettierConfig['tabWidth'] !== 'number') {
        errors.push({
          property: 'tabWidth',
          message: 'tabWidth must be a number',
          expected: 'number (default: 2)',
          actual: typeof prettierConfig['tabWidth'],
        });
      } else if (prettierConfig['tabWidth'] < 0) {
        errors.push({
          property: 'tabWidth',
          message: 'tabWidth must be positive',
          actual: String(prettierConfig['tabWidth']),
        });
      }
    }

    // Validate boolean options
    const booleanOptions = ['useTabs', 'semi', 'singleQuote', 'jsxSingleQuote', 'bracketSpacing', 'bracketSameLine'];
    booleanOptions.forEach((option) => {
      if (prettierConfig[option] !== undefined && typeof prettierConfig[option] !== 'boolean') {
        errors.push({
          property: option,
          message: `${option} must be a boolean`,
          expected: 'true or false',
          actual: typeof prettierConfig[option],
        });
      }
    });

    // Validate trailingComma
    if (prettierConfig['trailingComma'] !== undefined) {
      const validValues = ['none', 'es5', 'all'];
      if (!validValues.includes(prettierConfig['trailingComma'] as string)) {
        errors.push({
          property: 'trailingComma',
          message: `Invalid trailingComma value`,
          expected: validValues.join(', '),
          actual: String(prettierConfig['trailingComma']),
        });
      }
    }

    // Validate arrowParens
    if (prettierConfig['arrowParens'] !== undefined) {
      const validValues = ['always', 'avoid'];
      if (!validValues.includes(prettierConfig['arrowParens'] as string)) {
        errors.push({
          property: 'arrowParens',
          message: `Invalid arrowParens value`,
          expected: validValues.join(', '),
          actual: String(prettierConfig['arrowParens']),
        });
      }
    }

    // Validate endOfLine
    if (prettierConfig['endOfLine'] !== undefined) {
      const validValues = ['lf', 'crlf', 'cr', 'auto'];
      if (!validValues.includes(prettierConfig['endOfLine'] as string)) {
        errors.push({
          property: 'endOfLine',
          message: `Invalid endOfLine value`,
          expected: validValues.join(', '),
          actual: String(prettierConfig['endOfLine']),
        });
      }
    }

    // Check for inconsistent settings
    if (prettierConfig['useTabs'] === true && prettierConfig['tabWidth'] === 4) {
      warnings.push({
        property: 'tabWidth',
        message: 'tabWidth is set to 4 with useTabs',
        suggestion: 'tabWidth is typically 2 when using tabs',
      });
    }

    if (prettierConfig['singleQuote'] === true && prettierConfig['jsxSingleQuote'] === false) {
      warnings.push({
        property: 'jsxSingleQuote',
        message: 'jsxSingleQuote differs from singleQuote',
        suggestion: 'Consider keeping these consistent',
      });
    }

    // Check for overrides
    if (prettierConfig['overrides'] && !Array.isArray(prettierConfig['overrides'])) {
      errors.push({
        property: 'overrides',
        message: 'overrides must be an array',
      });
    }

    // Check for plugins
    if (prettierConfig['plugins'] && !Array.isArray(prettierConfig['plugins'])) {
      errors.push({
        property: 'plugins',
        message: 'plugins must be an array',
      });
    }
  }
}
