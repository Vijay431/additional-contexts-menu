import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import { EnvFileParseResult, EnvValidationResult, EnvVariable } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Environment Variable Manager Service
 *
 * Manages .env files with validation, type safety, and auto-completion.
 * Generates TypeScript interfaces for environment variables and validates values at runtime.
 */
export class EnvVariableManagerService {
  private static instance: EnvVariableManagerService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private envFilesCache: Map<string, EnvFileParseResult> = new Map();

  // Environment variable validation patterns
  private readonly validationPatterns = {
    // Valid variable name: starts with letter, contains only letters, numbers, underscore
    variableName: /^[A-Za-z_][A-Za-z0-9_]*$/,
    // Email pattern
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // URL pattern
    url: /^https?:\/\/.+/,
    // Port number
    port: /^[1-9][0-9]{0,4}$/,
    // Boolean
    boolean: /^(true|false|1|0)$/i,
    // Number (integer or float)
    number: /^-?\d+(\.\d+)?$/,
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('envValidation');
  }

  public static getInstance(): EnvVariableManagerService {
    EnvVariableManagerService.instance ??= new EnvVariableManagerService();
    return EnvVariableManagerService.instance;
  }

  /**
   * Parse a .env file and extract all variables
   */
  public async parseEnvFile(filePath: string): Promise<EnvFileParseResult> {
    const startTime = Date.now();

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const variables: EnvVariable[] = [];
      const lines = content.split('\n');
      const errors: string[] = [];

      let lineNumber = 0;
      for (const rawLine of lines) {
        lineNumber++;
        const line = rawLine.trim();

        // Skip empty lines and comments
        if (line.length === 0 || line.startsWith('#')) {
          continue;
        }

        // Parse variable
        const parsed = this.parseEnvLine(line, lineNumber);
        if (parsed) {
          variables.push(parsed);
        }
      }

      // Check for duplicates
      const duplicates = this.findDuplicates(variables);
      for (const duplicate of duplicates) {
        errors.push(
          `Duplicate variable '${duplicate.name}' found at lines ${duplicate.lines.join(', ')}`,
        );
      }

      const result: EnvFileParseResult = {
        filePath,
        variables,
        duplicates,
        errors,
        parseDuration: Date.now() - startTime,
      };

      // Cache the result
      this.envFilesCache.set(filePath, result);

      this.logger.debug(`Parsed .env file: ${filePath}`, {
        variableCount: variables.length,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error parsing .env file: ${filePath}`, error);
      return {
        filePath,
        variables: [],
        duplicates: [],
        errors: [`Failed to read file: ${(error as Error).message}`],
        parseDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate environment variables against rules
   */
  public async validateEnvFile(
    filePath: string,
    validationRules?: Record<string, { type?: string; required?: boolean; pattern?: string }>,
  ): Promise<EnvValidationResult> {
    const startTime = Date.now();
    const parseResult = await this.parseEnvFile(filePath);
    const diagnostics: vscode.Diagnostic[] = [];
    const issues: string[] = [];

    // Read file for diagnostics
    const content = await fs.readFile(filePath, 'utf-8');

    for (const variable of parseResult.variables) {
      const lineIndex = variable.lineNumber - 1;
      const line = content.split('\n')[lineIndex] ?? '';

      // Validate variable name
      if (!this.validationPatterns.variableName.test(variable.name)) {
        const message = `Invalid variable name '${variable.name}'. Must start with a letter or underscore and contain only letters, numbers, and underscores.`;
        issues.push(message);
        diagnostics.push(
          this.createDiagnostic(
            filePath,
            line,
            lineIndex,
            variable.name,
            message,
            vscode.DiagnosticSeverity.Error,
          ),
        );
      }

      // Check against validation rules
      if (validationRules && validationRules[variable.name]) {
        const rule = validationRules[variable.name];

        // Check if required and empty
        if (rule.required && !variable.value) {
          const message = `Required variable '${variable.name}' is empty.`;
          issues.push(message);
          diagnostics.push(
            this.createDiagnostic(
              filePath,
              line,
              lineIndex,
              variable.name,
              message,
              vscode.DiagnosticSeverity.Error,
            ),
          );
        }

        // Type validation
        if (rule.type && variable.value) {
          const typeError = this.validateType(variable.name, variable.value, rule.type);
          if (typeError) {
            issues.push(typeError);
            diagnostics.push(
              this.createDiagnostic(
                filePath,
                line,
                lineIndex,
                variable.value,
                typeError,
                vscode.DiagnosticSeverity.Warning,
              ),
            );
          }
        }

        // Pattern validation
        if (rule.pattern && variable.value) {
          const pattern = new RegExp(rule.pattern);
          if (!pattern.test(variable.value)) {
            const message = `Variable '${variable.name}' does not match required pattern.`;
            issues.push(message);
            diagnostics.push(
              this.createDiagnostic(
                filePath,
                line,
                lineIndex,
                variable.value,
                message,
                vscode.DiagnosticSeverity.Warning,
              ),
            );
          }
        }
      }
    }

    // Update diagnostics
    if (diagnostics.length > 0) {
      this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
    } else {
      this.diagnosticCollection.delete(vscode.Uri.file(filePath));
    }

    const result: EnvValidationResult = {
      isValid: issues.length === 0,
      issueCount: issues.length,
      issues,
      variableCount: parseResult.variables.length,
      duplicateCount: parseResult.duplicates.length,
      validationDuration: Date.now() - startTime,
    };

    this.logger.debug(`Validated .env file: ${filePath}`, result);

    return result;
  }

  /**
   * Generate TypeScript interface for environment variables
   */
  public generateTypeScriptInterface(
    parseResult: EnvFileParseResult,
    interfaceName = 'EnvConfig',
  ): string {
    const lines: string[] = [];

    // Add header comment
    lines.push('// Auto-generated TypeScript interface for environment variables');
    lines.push('// Generated by Additional Context Menus extension');
    lines.push('');
    lines.push('export interface ' + interfaceName + ' {');
    lines.push('');

    // Group variables by category/prefix
    const groups = this.groupVariablesByPrefix(parseResult.variables);

    for (const [prefix, vars] of Object.entries(groups)) {
      if (prefix) {
        lines.push(`  // ${prefix.toUpperCase()}`);
      }

      for (const variable of vars) {
        const inferredType = this.inferType(variable.value);
        const optional = !variable.value ? '?' : '';
        const comment = variable.comment ? ` // ${variable.comment}` : '';
        lines.push(`  readonly ${variable.name}${optional}: ${inferredType};${comment}`);
      }
      lines.push('');
    }

    lines.push('}');
    lines.push('');

    // Add helper function to validate environment at runtime
    lines.push('// Runtime validation helper');
    lines.push(
      'export function validateEnv(requiredKeys: (keyof ' + interfaceName + ')[]): void {',
    );
    lines.push('  const missing = requiredKeys.filter(key => !process.env[key as string]);');
    lines.push('  if (missing.length > 0) {');
    lines.push(
      "    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);",
    );
    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Format and sort a .env file
   */
  public async formatEnvFile(
    filePath: string,
    options: {
      sortAlphabetically?: boolean;
      groupByPrefix?: boolean;
      removeComments?: boolean;
      normalizeQuotes?: boolean;
    } = {},
  ): Promise<string> {
    const parseResult = await this.parseEnvFile(filePath);

    let variables = [...parseResult.variables];

    // Sort variables
    if (options.sortAlphabetically) {
      variables.sort((a, b) => a.name.localeCompare(b.name));
    } else if (options.groupByPrefix) {
      variables.sort((a, b) => {
        const aPrefix = a.name.split('_')[0] ?? '';
        const bPrefix = b.name.split('_')[0] ?? '';
        if (aPrefix !== bPrefix) {
          return aPrefix.localeCompare(bPrefix);
        }
        return a.name.localeCompare(b.name);
      });
    }

    // Build formatted content
    const lines: string[] = [];

    if (options.groupByPrefix) {
      // Group by prefix
      const groups = this.groupVariablesByPrefix(variables);
      for (const [prefix, vars] of Object.entries(groups)) {
        if (prefix) {
          lines.push(`# ${prefix.toUpperCase()}`);
        }
        for (const variable of vars) {
          lines.push(this.formatVariable(variable, options.normalizeQuotes));
        }
        lines.push('');
      }
    } else {
      for (const variable of variables) {
        lines.push(this.formatVariable(variable, options.normalizeQuotes));
      }
    }

    return lines.join('\n');
  }

  /**
   * Get auto-completion items for .env files
   */
  public async getCompletionItems(
    filePath: string,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[]> {
    const parseResult = await this.parseEnvFile(filePath);
    const items: vscode.CompletionItem[] = [];

    // Get existing variable names for completion
    const existingNames = new Set(parseResult.variables.map((v) => v.name));

    for (const variable of parseResult.variables) {
      const item = new vscode.CompletionItem(variable.name, vscode.CompletionItemKind.Variable);
      item.detail = variable.value || '(empty)';
      item.documentation = variable.comment || '';
      items.push(item);
    }

    return items;
  }

  /**
   * Clear diagnostics for a file
   */
  public clearDiagnostics(filePath: string): void {
    this.diagnosticCollection.delete(vscode.Uri.file(filePath));
  }

  /**
   * Clear all diagnostics
   */
  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.envFilesCache.clear();
  }

  /**
   * Dispose the diagnostic collection
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }

  /**
   * Parse a single line from .env file
   */
  private parseEnvLine(line: string, lineNumber: number): EnvVariable | null {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      return null;
    }

    // Find the first equals sign
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      return null; // Not a valid variable line
    }

    const name = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Extract inline comment
    let comment: string | undefined;
    const commentIndex = value.indexOf(' #');
    if (commentIndex !== -1) {
      comment = value.slice(commentIndex + 2).trim();
      value = value.slice(0, commentIndex).trim();
    }

    return {
      name,
      value,
      lineNumber,
      comment,
    };
  }

  /**
   * Find duplicate variables
   */
  private findDuplicates(variables: EnvVariable[]): Array<{
    name: string;
    lines: number[];
  }> {
    const nameMap = new Map<string, number[]>();
    const duplicates: Array<{ name: string; lines: number[] }> = [];

    for (const variable of variables) {
      const lines = nameMap.get(variable.name) ?? [];
      lines.push(variable.lineNumber);
      nameMap.set(variable.name, lines);
    }

    for (const [name, lines] of nameMap) {
      if (lines.length > 1) {
        duplicates.push({ name, lines });
      }
    }

    return duplicates;
  }

  /**
   * Group variables by prefix
   */
  private groupVariablesByPrefix(variables: EnvVariable[]): Record<string, EnvVariable[]> {
    const groups: Record<string, EnvVariable[]> = {};

    for (const variable of variables) {
      const parts = variable.name.split('_');
      const prefix = parts.length > 1 ? parts[0] : '';

      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix]?.push(variable);
    }

    return groups;
  }

  /**
   * Infer TypeScript type from value
   */
  private inferType(value: string): string {
    if (!value) {
      return 'string | undefined';
    }

    // Boolean
    if (this.validationPatterns.boolean.test(value)) {
      return 'boolean';
    }

    // Number
    if (this.validationPatterns.number.test(value)) {
      return 'number';
    }

    // URL
    if (this.validationPatterns.url.test(value)) {
      return 'string';
    }

    // Email
    if (this.validationPatterns.email.test(value)) {
      return 'string';
    }

    // Port
    if (this.validationPatterns.port.test(value)) {
      return 'string';
    }

    // Default to string
    return 'string';
  }

  /**
   * Validate a value against a type
   */
  private validateType(_name: string, value: string, type: string): string | null {
    switch (type) {
      case 'boolean':
        if (!this.validationPatterns.boolean.test(value)) {
          return `Value '${value}' is not a valid boolean. Expected: true, false, 1, or 0.`;
        }
        break;
      case 'number':
        if (!this.validationPatterns.number.test(value)) {
          return `Value '${value}' is not a valid number.`;
        }
        break;
      case 'email':
        if (!this.validationPatterns.email.test(value)) {
          return `Value '${value}' is not a valid email address.`;
        }
        break;
      case 'url':
        if (!this.validationPatterns.url.test(value)) {
          return `Value '${value}' is not a valid URL. Must start with http:// or https://.`;
        }
        break;
      case 'port':
        if (!this.validationPatterns.port.test(value)) {
          return `Value '${value}' is not a valid port number. Must be between 1 and 65535.`;
        }
        break;
    }

    return null;
  }

  /**
   * Format a variable for output
   */
  private formatVariable(variable: EnvVariable, normalizeQuotes = false): string {
    let value = variable.value ?? '';

    // Normalize quotes
    if (normalizeQuotes && value) {
      // Remove existing quotes
      value = value.replace(/^["']|["']$/g, '');
      // Add double quotes if value contains spaces or special characters
      if (/[\s'"`$\\]/.test(value)) {
        value = `"${value.replace(/"/g, '\\"')}"`;
      }
    }

    const comment = variable.comment ? ` # ${variable.comment}` : '';
    return `${variable.name}=${value}${comment}`;
  }

  /**
   * Create a diagnostic
   */
  private createDiagnostic(
    filePath: string,
    line: string,
    lineIndex: number,
    target: string,
    message: string,
    severity: vscode.DiagnosticSeverity,
  ): vscode.Diagnostic {
    const startIndex = line.indexOf(target);
    const endIndex = startIndex + target.length;

    const range = new vscode.Range(
      new vscode.Position(lineIndex, startIndex),
      new vscode.Position(lineIndex, endIndex),
    );

    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = 'Env Validation';
    return diagnostic;
  }
}
