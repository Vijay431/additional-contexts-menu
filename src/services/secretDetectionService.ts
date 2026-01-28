import * as vscode from 'vscode';

import { SecretDetectionResult, SecretMatch, SecretType } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Secret Detection Service
 *
 * Detects potential secrets (API keys, passwords, tokens) in code.
 * Uses regex-based pattern matching to identify common secret formats.
 * Scans for various types of secrets and provides suggestions for proper management.
 */
export class SecretDetectionService {
  private static instance: SecretDetectionService | undefined;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  // Patterns for detecting different types of secrets
  private readonly secretPatterns: Array<{
    type: SecretType;
    pattern: RegExp;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }> = [
    // AWS Access Key ID (starts with AKIA[0-9A-Z]{16})
    {
      type: 'aws-access-key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'error',
      suggestion: 'Store AWS credentials in environment variables or AWS credentials file',
    },
    // AWS Secret Access Key
    {
      type: 'aws-secret-key',
      pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
      severity: 'error',
      suggestion: 'Store AWS credentials in environment variables or AWS credentials file',
    },
    // GitHub Personal Access Token
    {
      type: 'github-token',
      pattern: /ghp_[a-zA-Z0-9]{36}/g,
      severity: 'error',
      suggestion: 'Store GitHub tokens in environment variables or use GitHub Secrets',
    },
    // GitHub OAuth App Token
    {
      type: 'github-token',
      pattern: /gho_[a-zA-Z0-9]{36}/g,
      severity: 'error',
      suggestion: 'Store GitHub tokens in environment variables or use GitHub Secrets',
    },
    // GitHub Server Token
    {
      type: 'github-token',
      pattern: /ghu_[a-zA-Z0-9]{36}/g,
      severity: 'error',
      suggestion: 'Store GitHub tokens in environment variables or use GitHub Secrets',
    },
    // Stripe API Key
    {
      type: 'stripe-key',
      pattern: /sk_(live|test)_[0-9a-zA-Z]{24,}/g,
      severity: 'error',
      suggestion: 'Store Stripe keys in environment variables',
    },
    // Stripe Publishable Key
    {
      type: 'stripe-key',
      pattern: /pk_(live|test)_[0-9a-zA-Z]{24,}/g,
      severity: 'warning',
      suggestion:
        'Stripe publishable keys can be exposed in frontend code, but consider environment variables',
    },
    // Slack Token
    {
      type: 'slack-token',
      pattern: /xox[pbar]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24}/g,
      severity: 'error',
      suggestion: 'Store Slack tokens in environment variables',
    },
    // JWT (JSON Web Token)
    {
      type: 'jwt',
      pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      severity: 'warning',
      suggestion: 'JWT tokens should not be hardcoded. Validate tokens from secure sources.',
    },
    // Private Key (RSA/PEM format)
    {
      type: 'private-key',
      pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
      severity: 'error',
      suggestion:
        'Private keys should never be in code. Use environment variables or key management services.',
    },
    // API Key with common variable names
    {
      type: 'api-key',
      pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{20,}['"]?/gi,
      severity: 'error',
      suggestion: 'Store API keys in environment variables',
    },
    // Password in common patterns
    {
      type: 'password',
      pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/gi,
      severity: 'error',
      suggestion: 'Store passwords in environment variables or secure credential stores',
    },
    // Generic token patterns
    {
      type: 'generic-token',
      pattern:
        /(?:token|auth[_-]?token|access[_-]?token|bearer)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{20,}['"]?/gi,
      severity: 'warning',
      suggestion: 'Tokens should be stored in environment variables',
    },
    // Database URL with credentials
    {
      type: 'database-url',
      pattern: /(?:mongodb|mysql|postgres|postgresql):\/\/[^:\s]+:[^@\s]+@/gi,
      severity: 'error',
      suggestion: 'Use environment variables for database connection strings',
    },
    // Email address
    {
      type: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: 'info',
      suggestion: 'Consider if email addresses need to be hardcoded or can be in configuration',
    },
    // IP Address (internal/private)
    {
      type: 'ip-address',
      pattern: /\b(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)\d{1,3}\.\d{1,3}\b/g,
      severity: 'info',
      suggestion: 'Internal IP addresses should be in configuration files',
    },
  ];

  // Patterns to exclude (false positives)
  private readonly exclusionPatterns: RegExp[] = [
    // Common UUIDs
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    // Example/placeholder values
    /^(example|placeholder|test|dummy|xxx|your-)/i,
    // Short strings that are likely not secrets
    /^.{1,10}$/,
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('secretDetection');
  }

  public static getInstance(): SecretDetectionService {
    SecretDetectionService.instance ??= new SecretDetectionService();
    return SecretDetectionService.instance;
  }

  /**
   * Scan a document for potential secrets
   */
  public async scanDocument(
    document: vscode.TextDocument,
    excludedPatterns: string[] = [],
  ): Promise<SecretDetectionResult> {
    const startTime = Date.now();
    const matches: SecretMatch[] = [];

    try {
      const text = document.getText();
      const lines = text.split('\n');

      // Check each line against secret patterns
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex] ?? '';

        // Skip comments
        if (this.isCommentLine(line)) {
          continue;
        }

        // Check each secret pattern
        for (const secretPattern of this.secretPatterns) {
          const regex = new RegExp(secretPattern.pattern.source, secretPattern.pattern.flags);
          let match: RegExpExecArray | null;

          // eslint-disable-next-line no-cond-assign
          while ((match = regex.exec(line)) !== null) {
            const matchedText = match[0] ?? '';

            // Check exclusions
            if (this.shouldExclude(matchedText, excludedPatterns)) {
              continue;
            }

            matches.push({
              type: secretPattern.type,
              line: lineIndex + 1,
              column: match.index + 1,
              value: this.maskValue(matchedText),
              matchedText,
              severity: secretPattern.severity,
              suggestion: secretPattern.suggestion,
            });
          }
        }
      }

      // Update diagnostics
      this.updateDiagnostics(document, matches);

      const scanDuration = Date.now() - startTime;
      this.logger.debug(`Secret detection scan completed in ${scanDuration}ms`, {
        file: document.fileName,
        secretsFound: matches.length,
      });

      return {
        hasSecrets: matches.length > 0,
        matches,
        fileScanned: document.fileName,
        scanDuration,
      };
    } catch (error) {
      this.logger.error('Error scanning document for secrets', error);
      return {
        hasSecrets: false,
        matches: [],
        fileScanned: document.fileName,
        scanDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get all secret types that can be detected
   */
  public getDetectableSecretTypes(): SecretType[] {
    const types = new Set<SecretType>();
    for (const pattern of this.secretPatterns) {
      types.add(pattern.type);
    }
    return Array.from(types);
  }

  /**
   * Get a description for a secret type
   */
  public getSecretTypeDescription(type: SecretType): string {
    const descriptions: Record<SecretType, string> = {
      'api-key': 'API key detected in code',
      'aws-access-key': 'AWS Access Key ID detected',
      'aws-secret-key': 'AWS Secret Access Key detected',
      'github-token': 'GitHub personal access token detected',
      jwt: 'JWT token detected',
      password: 'Password detected in code',
      'private-key': 'Private key detected',
      'slack-token': 'Slack API token detected',
      'stripe-key': 'Stripe API key detected',
      'generic-token': 'Generic access token detected',
      'database-url': 'Database connection string with credentials',
      email: 'Email address detected',
      'ip-address': 'Internal IP address detected',
    };
    return descriptions[type] ?? 'Unknown secret type';
  }

  /**
   * Clear diagnostics for a document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Clear all diagnostics
   */
  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose the diagnostic collection
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }

  /**
   * Check if a line is a comment
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('<!--')
    );
  }

  /**
   * Check if a matched value should be excluded
   */
  private shouldExclude(value: string, customExcludedPatterns: string[]): boolean {
    // Check built-in exclusion patterns
    for (const pattern of this.exclusionPatterns) {
      if (pattern.test(value)) {
        return true;
      }
    }

    // Check custom exclusion patterns
    for (const patternStr of customExcludedPatterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        if (pattern.test(value)) {
          return true;
        }
      } catch {
        // Invalid regex, skip
      }
    }

    return false;
  }

  /**
   * Mask a sensitive value for logging/display
   */
  private maskValue(value: string): string {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
  }

  /**
   * Update VS Code diagnostics with secret matches
   */
  private updateDiagnostics(document: vscode.TextDocument, matches: SecretMatch[]): void {
    if (matches.length === 0) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = matches.map((match) => {
      const range = new vscode.Range(
        new vscode.Position(match.line - 1, match.column - 1),
        new vscode.Position(match.line - 1, match.column - 1 + match.matchedText.length),
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `${this.getSecretTypeDescription(match.type)}: ${match.suggestion}`,
        this.convertSeverity(match.severity),
      );

      diagnostic.code = match.type;
      diagnostic.source = 'Secret Detection';
      return diagnostic;
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Convert secret severity to VS Code diagnostic severity
   */
  private convertSeverity(severity: 'error' | 'warning' | 'info'): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
    }
  }
}
