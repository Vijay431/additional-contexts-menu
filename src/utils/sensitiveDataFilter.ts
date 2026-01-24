/**
 * SensitiveDataFilter - Utility class for detecting and redacting sensitive data
 *
 * This class provides pattern matching and redaction logic for common sensitive data patterns
 * including API keys, tokens, passwords, connection strings, and private keys.
 *
 * Security: Helps prevent credential leakage in logs (OWASP-A09, CWE-532)
 */

/**
 * Pattern definitions for sensitive data detection
 * Each pattern includes a regex and a description of what it matches
 */
interface SensitivePattern {
  regex: RegExp;
  description: string;
}

/**
 * Result of redaction operation
 */
interface RedactionResult {
  data: unknown;
  hasRedactions: boolean;
}

export class SensitiveDataFilter {
  private static instance: SensitiveDataFilter;
  private patterns: SensitivePattern[] = [];

  private constructor() {
    this.initializePatterns();
  }

  /**
   * Get singleton instance of SensitiveDataFilter
   */
  public static getInstance(): SensitiveDataFilter {
    if (!SensitiveDataFilter.instance) {
      SensitiveDataFilter.instance = new SensitiveDataFilter();
    }
    return SensitiveDataFilter.instance;
  }

  /**
   * Initialize regex patterns for sensitive data detection
   */
  private initializePatterns(): void {
    this.patterns = [
      // API Keys - various formats
      {
        regex: /(?:api[_-]?key|apikey|key)[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'API keys in key=value format',
      },
      {
        regex: /sk-[a-zA-Z0-9]{20,}/g,
        description: 'Stripe-style API keys (sk-*)',
      },
      {
        regex: /AIza[a-zA-Z0-9_\-]{35}/g,
        description: 'Google API keys',
      },
      {
        regex: /AKIA[0-9A-Z]{16}/g,
        description: 'AWS Access Key IDs',
      },
      {
        regex: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}/g,
        description: 'Slack bot tokens',
      },
      {
        regex: /xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}/g,
        description: 'Slack user tokens',
      },
      {
        regex: /ghp_[a-zA-Z0-9]{36}/g,
        description: 'GitHub personal access tokens',
      },
      {
        regex: /gho_[a-zA-Z0-9]{36}/g,
        description: 'GitHub OAuth tokens',
      },
      {
        regex: /ghu_[a-zA-Z0-9]{36}/g,
        description: 'GitHub user tokens',
      },
      {
        regex: /ghs_[a-zA-Z0-9]{36}/g,
        description: 'GitHub server tokens',
      },
      {
        regex: /ghr_[a-zA-Z0-9]{36}/g,
        description: 'GitHub refresh tokens',
      },
      {
        regex: /AKIA[0-9A-Z]{16}/g,
        description: 'AWS access keys',
      },
      {
        regex: /[0-9a-zA-Z/+]{40}/g,
        description: 'Generic 40-char secret keys',
      },

      // JWT Tokens
      {
        regex: /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g,
        description: 'JWT tokens',
      },

      // Bearer tokens
      {
        regex: /Bearer\s+([a-zA-Z0-9_\-\.~=]+)/gi,
        description: 'Bearer tokens',
      },

      // Passwords
      {
        regex: /(?:password|passwd|pwd)[\s=:]+['"]?([^'\s"]+)/gi,
        description: 'Passwords in key=value format',
      },
      {
        regex: /"(?:password|passwd|pwd)"\s*:\s*"([^"]+)"/gi,
        description: 'Passwords in JSON format',
      },
      {
        regex: /'(?:password|passwd|pwd)'\s*:\s*'([^']+)'/gi,
        description: 'Passwords in JSON format (single quotes)',
      },

      // Connection strings
      {
        regex: /mongodb(?:\+srv)?:\/\/[^@\s]+@[^\/\s]+/gi,
        description: 'MongoDB connection strings',
      },
      {
        regex: /postgres(?:ql)?:\/\/[^@\s]+@[^\/\s]+/gi,
        description: 'PostgreSQL connection strings',
      },
      {
        regex: /mysql:\/\/[^@\s]+@[^\/\s]+/gi,
        description: 'MySQL connection strings',
      },
      {
        regex: /redis:\/\/[:@][^@\s]+@[^\/\s]+/gi,
        description: 'Redis connection strings',
      },
      {
        regex: /Server=([^;]+);.*User\s+Id=([^;]+);.*Password=([^;]+)/gi,
        description: 'SQL Server connection strings',
      },
      {
        regex: /Data\s+Source=([^;]+);.*User\s+Id=([^;]+);.*Password=([^;]+)/gi,
        description: 'Entity Framework connection strings',
      },

      // Private keys
      {
        regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
        description: 'Private keys in PEM format',
      },
      {
        regex: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+EC\s+PRIVATE\s+KEY-----/gi,
        description: 'EC private keys in PEM format',
      },
      {
        regex: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----/gi,
        description: 'OpenSSH private keys in PEM format',
      },
      {
        regex: /-----BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----[\s\S]*?-----END\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----/gi,
        description: 'PGP private keys in PEM format',
      },

      // Tokens and secrets
      {
        regex: /token[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Generic tokens in key=value format',
      },
      {
        regex: /secret[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Generic secrets in key=value format',
      },
      {
        regex: /access[_-]?token[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Access tokens',
      },
      {
        regex: /refresh[_-]?token[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Refresh tokens',
      },
      {
        regex: /session[_-]?token[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Session tokens',
      },
      {
        regex: /auth[_-]?token[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Auth tokens',
      },
      {
        regex: /client[_-]?secret[\s=:]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
        description: 'Client secrets',
      },

      // Webhook URLs
      {
        regex: /https?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-]+@/gi,
        description: 'URLs with embedded credentials',
      },

      // Base64 encoded data (potential sensitive data)
      {
        regex: /"(?:base64|encoded|secret|key|token)":\s*"([a-zA-Z0-9+/]{40,}={0,2})"/gi,
        description: 'Base64 encoded sensitive data in JSON',
      },
    ];
  }

  /**
   * Redact sensitive data from input while preserving structure
   *
   * @param data - The data to sanitize (can be string, object, array, or primitive)
   * @returns The sanitized data with sensitive patterns replaced by [REDACTED]
   *
   * @example
   * ```ts
   * const filter = SensitiveDataFilter.getInstance();
   * filter.redact('api_key=sk-1234567890abcdef'); // Returns: 'api_key=[REDACTED]'
   * filter.redact({ password: 'secret123' }); // Returns: { password: '[REDACTED]' }
   * ```
   */
  public redact<T = unknown>(data: T): T {
    const result = this.redactRecursive(data);
    return result.data as T;
  }

  /**
   * Recursively redact sensitive data from any type
   */
  private redactRecursive(data: unknown): RedactionResult {
    // Handle null and undefined
    if (data === null || data === undefined) {
      return { data, hasRedactions: false };
    }

    // Handle primitives (number, boolean, bigint, symbol)
    if (typeof data !== 'object') {
      if (typeof data === 'string') {
        return this.redactString(data);
      }
      return { data, hasRedactions: false };
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return this.redactArray(data);
    }

    // Handle objects (including Date, RegExp, etc.)
    if (this.isPlainObject(data)) {
      return this.redactObject(data);
    }

    // Handle other object types (Date, RegExp, etc.) - convert to string and redact
    const strValue = String(data);
    const stringResult = this.redactString(strValue);
    return stringResult;
  }

  /**
   * Redact sensitive patterns from a string
   */
  private redactString(str: string): RedactionResult {
    let redacted = str;
    let hasRedactions = false;

    for (const pattern of this.patterns) {
      const matches = redacted.match(pattern.regex);
      if (matches) {
        hasRedactions = true;
        redacted = redacted.replace(pattern.regex, (match: string, ..._groups: unknown[]) => {
          // Preserve the structure but replace sensitive values
          return match.replace(
            /(?:[a-zA-Z0-9_\-]{20,}|eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+|-----BEGIN[\s\S]*?-----END[\s\S]*?-----)/g,
            '[REDACTED]'
          );
        });
      }
    }

    // Additional redaction for known sensitive field names in strings
    const sensitiveFields = ['password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey', 'access_token', 'refresh_token'];
    for (const field of sensitiveFields) {
      // Match key=value format
      const keyValueRegex = new RegExp(`(${field}[\\s=:]+['"]?)([^'\\s"]+)(['"]?)`, 'gi');
      const matches = redacted.match(keyValueRegex);
      if (matches) {
        hasRedactions = true;
        redacted = redacted.replace(keyValueRegex, `$1[REDACTED]$3`);
      }
    }

    return { data: redacted, hasRedactions };
  }

  /**
   * Redact sensitive data from an array
   */
  private redactArray(arr: unknown[]): RedactionResult {
    const result: unknown[] = [];
    let hasRedactions = false;

    for (const item of arr) {
      const itemResult = this.redactRecursive(item);
      result.push(itemResult.data);
      if (itemResult.hasRedactions) {
        hasRedactions = true;
      }
    }

    return { data: result, hasRedactions };
  }

  /**
   * Redact sensitive data from an object
   */
  private redactObject(obj: Record<string, unknown>): RedactionResult {
    const result: Record<string, unknown> = {};
    let hasRedactions = false;

    for (const [key, value] of Object.entries(obj)) {
      // Check if the key name indicates sensitive data
      const lowerKey = key.toLowerCase();
      const sensitiveKeys = [
        'password',
        'passwd',
        'pwd',
        'secret',
        'apikey',
        'api_key',
        'token',
        'access_token',
        'accesstoken',
        'refresh_token',
        'refreshtoken',
        'session_token',
        'sessiontoken',
        'auth_token',
        'authtoken',
        'bearer',
        'authorization',
        'private_key',
        'privatekey',
        'client_secret',
        'clientsecret',
        'connection_string',
        'connectionstring',
        'credentials',
      ];

      const isSensitiveKey = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));

      if (isSensitiveKey && typeof value === 'string') {
        // Completely redact sensitive fields with string values
        result[key] = '[REDACTED]';
        hasRedactions = true;
      } else {
        // Recursively redact the value
        const valueResult = this.redactRecursive(value);
        result[key] = valueResult.data;
        if (valueResult.hasRedactions) {
          hasRedactions = true;
        }
      }
    }

    return { data: result, hasRedactions };
  }

  /**
   * Check if a value is a plain object (not Date, RegExp, etc.)
   */
  private isPlainObject(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }

  /**
   * Check if a string contains sensitive data
   *
   * @param str - The string to check
   * @returns true if the string matches any sensitive pattern
   */
  public containsSensitiveData(str: string): boolean {
    const result = this.redactString(str);
    return result.hasRedactions;
  }

  /**
   * Get a list of all registered patterns
   *
   * @returns Array of pattern descriptions
   */
  public getRegisteredPatterns(): string[] {
    return this.patterns.map((p) => p.description);
  }
}

/**
 * Convenience function to redact sensitive data
 *
 * @param data - The data to sanitize
 * @returns The sanitized data
 *
 * @example
 * ```ts
 * import { redact } from './sensitiveDataFilter';
 * const safe = redact('api_key=sk-1234567890abcdef');
 * ```
 */
export function redact<T = unknown>(data: T): T {
  const filter = SensitiveDataFilter.getInstance();
  return filter.redact(data);
}
