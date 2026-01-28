import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import {
  DependencyVulnerability,
  SecurityAuditConfig,
  SecurityAuditResult,
  SecurityIssue,
  SecurityIssueType,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Security Audit Scanner Service
 *
 * Scans dependencies and code for security vulnerabilities.
 * Integrates with npm audit and detects insecure coding patterns.
 */
export class SecurityAuditScannerService {
  private static instance: SecurityAuditScannerService | undefined;
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;
  private diagnosticCollection: vscode.DiagnosticCollection;

  // Patterns for detecting insecure code patterns
  private readonly securityPatterns: Array<{
    type: SecurityIssueType;
    pattern: RegExp;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    suggestion: string;
    cwe?: string;
    references?: string[];
  }> = [
    // eval() usage - Code Injection
    {
      type: 'eval-usage',
      pattern: /\beval\s*\(/g,
      severity: 'critical',
      description: 'Use of eval() can lead to code injection vulnerabilities',
      suggestion: 'Avoid using eval(). Use safer alternatives like JSON.parse(), object property access, or template literals with proper sanitization.',
      cwe: 'CWE-95',
      references: ['https://owasp.org/www-community/attacks/Code_Injection'],
    },
    // Function() constructor
    {
      type: 'eval-usage',
      pattern: /new Function\s*\(/g,
      severity: 'critical',
      description: 'Use of Function() constructor can lead to code injection vulnerabilities',
      suggestion: 'Avoid using Function() constructor. Use arrow functions or function declarations instead.',
      cwe: 'CWE-95',
    },
    // setTimeout/setInterval with string argument
    {
      type: 'eval-usage',
      pattern: /(?:setTimeout|setInterval)\s*\(\s*['"`]/g,
      severity: 'high',
      description: 'setTimeout/setInterval with string argument acts like eval()',
      suggestion: 'Pass a function instead of a string to setTimeout/setInterval.',
      cwe: 'CWE-95',
    },
    // innerHTML assignment
    {
      type: 'eval-usage',
      pattern: /\.innerHTML\s*=\s*['"`]/g,
      severity: 'high',
      description: 'Direct innerHTML assignment can lead to cross-site scripting (XSS)',
      suggestion: 'Use textContent, createElement, or sanitize HTML before assignment. Consider using DOMPurify library.',
      cwe: 'CWE-79',
      references: ['https://owasp.org/www-community/attacks/xss/'],
    },
    // Hardcoded secrets (basic detection)
    {
      type: 'hardcoded-secret',
      pattern: /(?:api[_-]?key|apikey|api[_-]?secret|password|passwd|secret)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
      severity: 'critical',
      description: 'Hardcoded secret detected in code',
      suggestion: 'Move secrets to environment variables or secure secret management systems.',
      cwe: 'CWE-798',
      references: ['https://cwe.mitre.org/data/definitions/798.html'],
    },
    // SQL Injection patterns - basic string concatenation
    {
      type: 'sql-injection',
      pattern: /(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+.*?(?:\+\s*['"`]|`?\$\{.*?\}`?)/gi,
      severity: 'critical',
      description: 'Possible SQL injection vulnerability through string concatenation',
      suggestion: 'Use parameterized queries or prepared statements instead of string concatenation.',
      cwe: 'CWE-89',
      references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
    },
    // Command Injection patterns
    {
      type: 'command-injection',
      pattern: /(?:exec|spawn|execSync)\s*\(\s*['"`].*?\+\s*/g,
      severity: 'critical',
      description: 'Possible command injection through unsanitized user input',
      suggestion: 'Use parameterized commands or validate and sanitize all user input. Avoid shell: true option.',
      cwe: 'CWE-78',
      references: ['https://owasp.org/www-community/attacks/Command_Injection'],
    },
    // Insecure deserialization
    {
      type: 'insecure-deserialization',
      pattern: /(?:JSON\.parse|unserialize)\s*\(\s*(?:user|input|req\.body|data)\b/g,
      severity: 'high',
      description: 'Insecure deserialization of potentially untrusted data',
      suggestion: 'Validate and sanitize data before deserialization. Use libraries with safe defaults.',
      cwe: 'CWE-502',
    },
    // Weak cryptography - MD5
    {
      type: 'weak-crypto',
      pattern: /(?:createHash\s*\(\s*['"]md5['"]|md5\s*\()/gi,
      severity: 'medium',
      description: 'MD5 is a weak hashing algorithm vulnerable to collisions',
      suggestion: 'Use stronger hashing algorithms like SHA-256 or SHA-512 (e.g., createHash("sha256")).',
      cwe: 'CWE-327',
      references: ['https://cwe.mitre.org/data/definitions/327.html'],
    },
    // Weak cryptography - SHA1
    {
      type: 'weak-crypto',
      pattern: /(?:createHash\s*\(\s*['"]sha1['"]|sha1\s*\()/gi,
      severity: 'low',
      description: 'SHA1 is considered weak for security applications',
      suggestion: 'Use SHA-256 or stronger alternatives for security-sensitive applications.',
      cwe: 'CWE-327',
    },
    // Unsafe regex patterns (ReDoS)
    {
      type: 'unsafe-regex',
      pattern: /(?:\(\[\^\\\]\*\)\{2,\}|(?:\.\*|\.\+)[\+\*\{]\{2,\})/g,
      severity: 'medium',
      description: 'Regular expression may be vulnerable to ReDoS (Regular Expression Denial of Service)',
      suggestion: 'Avoid nested quantifiers and overlapping alternations. Use possessive quantifiers or atomic groups where supported.',
      cwe: 'CWE-1333',
      references: ['https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS'],
    },
    // Path traversal patterns
    {
      type: 'path-traversal',
      pattern: /(?:readFile|writeFile|unlink|readdir)\s*\(\s*(?:user|input|req\.(?:query|params|body))\s*\+/g,
      severity: 'high',
      description: 'Possible path traversal vulnerability through unsanitized file paths',
      suggestion: 'Validate and sanitize file paths. Use path.resolve() and check the result is within expected directory.',
      cwe: 'CWE-22',
      references: ['https://owasp.org/www-community/attacks/Path_Traversal'],
    },
    // XXE (XML External Entity) patterns
    {
      type: 'xxe',
      pattern: /(?:libxmljs|xml2js|fast-xml-parser)\.parse\s*\(/g,
      severity: 'high',
      description: 'XML parsing may be vulnerable to XXE attacks if not properly configured',
      suggestion: 'Disable external entities and DTDs in XML parser configuration.',
      cwe: 'CWE-611',
      references: ['https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing'],
    },
    // SSRF patterns
    {
      type: 'ssrf',
      pattern: /(?:fetch|axios|http\.request|https\.request)\s*\(\s*(?:user|input|req\.(?:query|params|body))\s*\+/g,
      severity: 'high',
      description: 'Possible Server-Side Request Forgery (SSRF) through unsanitized URLs',
      suggestion: 'Validate and whitelist allowed URLs. Block access to internal network ranges.',
      cwe: 'CWE-918',
      references: ['https://owasp.org/www-community/attacks/Server_Side_Request_Forgery'],
    },
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.outputChannel = vscode.window.createOutputChannel('Security Audit Scanner');
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('securityAuditScanner');
  }

  public static getInstance(): SecurityAuditScannerService {
    SecurityAuditScannerService.instance ??= new SecurityAuditScannerService();
    return SecurityAuditScannerService.instance;
  }

  /**
   * Perform a comprehensive security audit on a document
   */
  public async performSecurityAudit(
    document: vscode.TextDocument,
    config?: Partial<SecurityAuditConfig>,
  ): Promise<SecurityAuditResult> {
    const startTime = Date.now();
    const issues: SecurityIssue[] = [];
    const dependencyVulnerabilities: DependencyVulnerability[] = [];

    const enabledConfig = {
      includeCodePatterns: config?.includeCodePatterns ?? true,
      includeDependencyAudit: config?.includeDependencyAudit ?? true,
      severityFilter: config?.severityFilter ?? ['critical', 'high', 'medium', 'low', 'info'],
      excludedPatterns: config?.excludedPatterns ?? [],
    };

    try {
      const text = document.getText();
      const languageId = document.languageId;

      // Only support JavaScript/TypeScript files for code pattern scanning
      const supportedLanguages = [
        'javascript',
        'typescript',
        'javascriptreact',
        'typescriptreact',
        'vue',
        'svelte',
      ];

      if (
        enabledConfig.includeCodePatterns &&
        supportedLanguages.includes(languageId)
      ) {
        const codeIssues = await this.scanForSecurityPatterns(
          document,
          text,
          enabledConfig.severityFilter,
          enabledConfig.excludedPatterns,
        );
        issues.push(...codeIssues);
      }

      // Scan for dependency vulnerabilities
      if (enabledConfig.includeDependencyAudit) {
        const deps = await this.scanForDependencyVulnerabilities(document);
        dependencyVulnerabilities.push(...deps);
      }

      // Update diagnostics
      this.updateDiagnostics(document, issues);

      // Count by severity
      const totalCritical = issues.filter((i) => i.severity === 'critical').length;
      const totalHigh = issues.filter((i) => i.severity === 'high').length;
      const totalMedium = issues.filter((i) => i.severity === 'medium').length;
      const totalLow = issues.filter((i) => i.severity === 'low').length;
      const totalInfo = issues.filter((i) => i.severity === 'info').length;

      const scanDuration = Date.now() - startTime;

      // Generate summary
      const summary = this.generateSummary(
        issues,
        dependencyVulnerabilities,
        scanDuration,
      );

      this.logger.debug('Security audit completed', {
        file: document.fileName,
        issuesFound: issues.length,
        vulnerabilitiesFound: dependencyVulnerabilities.length,
        scanDuration,
      });

      return {
        file: document.fileName,
        issues,
        dependencyVulnerabilities,
        totalCritical,
        totalHigh,
        totalMedium,
        totalLow,
        totalInfo,
        scanDuration,
        summary,
      };
    } catch (error) {
      this.logger.error('Error during security audit', error);
      return {
        file: document.fileName,
        issues: [],
        dependencyVulnerabilities: [],
        totalCritical: 0,
        totalHigh: 0,
        totalMedium: 0,
        totalLow: 0,
        totalInfo: 0,
        scanDuration: Date.now() - startTime,
        summary: 'Security audit failed with an error.',
      };
    }
  }

  /**
   * Scan for security issues in code patterns
   */
  private async scanForSecurityPatterns(
    document: vscode.TextDocument,
    text: string,
    severityFilter: ('critical' | 'high' | 'medium' | 'low' | 'info')[],
    excludedPatterns: string[],
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const lines = text.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? '';

      // Skip comments
      if (this.isCommentLine(line)) {
        continue;
      }

      // Check each security pattern
      for (const securityPattern of this.securityPatterns) {
        // Check if severity is in filter
        if (!severityFilter.includes(securityPattern.severity)) {
          continue;
        }

        const regex = new RegExp(securityPattern.pattern.source, securityPattern.pattern.flags);
        let match: RegExpExecArray | null;

        // eslint-disable-next-line no-cond-assign
        while ((match = regex.exec(line)) !== null) {
          // Check if this line should be excluded
          if (this.shouldExclude(line, excludedPatterns)) {
            continue;
          }

          // Extract code snippet (get up to 50 characters for context)
          const codeSnippet = line.trim().slice(0, 50);

          issues.push({
            type: securityPattern.type,
            severity: securityPattern.severity,
            file: document.fileName,
            line: lineIndex + 1,
            column: (match.index ?? 0) + 1,
            description: securityPattern.description,
            suggestion: securityPattern.suggestion,
            codeSnippet,
            cwe: securityPattern.cwe,
            references: securityPattern.references,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Scan for dependency vulnerabilities using npm audit
   */
  private async scanForDependencyVulnerabilities(
    document: vscode.TextDocument,
  ): Promise<DependencyVulnerability[]> {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Find the nearest package.json
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) {
        return vulnerabilities;
      }

      const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
      } catch {
        // No package.json found
        return vulnerabilities;
      }

      // Run npm audit with JSON output
      const auditResult = await this.runNpmAudit(workspaceFolder.uri.fsPath);
      if (auditResult && auditResult.vulnerabilities) {
        for (const [name, vulnData] of Object.entries(auditResult.vulnerabilities)) {
          const vuln = vulnData as {
            severity: 'critical' | 'high' | 'medium' | 'low';
            vulnerableVersions: string[];
            patchedVersions: string[];
            title: string;
            url?: string;
            cwe?: string;
          };

          vulnerabilities.push({
            name,
            severity: vuln.severity,
            vulnerableVersions: vuln.vulnerableVersions,
            patchedVersions: vuln.patchedVersions,
            title: vuln.title,
            url: vuln.url,
            cwe: vuln.cwe,
          });
        }
      }
    } catch (error) {
      this.logger.debug('Failed to run npm audit', error);
    }

    return vulnerabilities;
  }

  /**
   * Run npm audit command and parse the JSON output
   */
  private runNpmAudit(
    workspacePath: string,
  ): Promise<{ vulnerabilities: Record<string, unknown> } | null> {
    return new Promise((resolve) => {
      exec(
        'npm audit --json',
        { cwd: workspacePath, timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            // npm audit returns non-zero exit code when vulnerabilities are found
            // But the output is still valid JSON
            if (stdout) {
              try {
                const result = JSON.parse(stdout);
                resolve(result);
                return;
              } catch {
                // Invalid JSON
              }
            }
            resolve(null);
            return;
          }

          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch {
            resolve(null);
          }
        },
      );
    });
  }

  /**
   * Display the security audit results
   */
  public displayResults(result: SecurityAuditResult): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('🔒 Security Audit Scanner Results');
    this.outputChannel.appendLine('='.repeat(50));
    this.outputChannel.appendLine(`File: ${result.file}`);
    this.outputChannel.appendLine(`Analysis Duration: ${result.scanDuration}ms`);
    this.outputChannel.appendLine('');

    // Summary section
    this.outputChannel.appendLine('📊 Summary:');
    this.outputChannel.appendLine('-'.repeat(50));
    this.outputChannel.appendLine(`  🔴 Critical: ${result.totalCritical}`);
    this.outputChannel.appendLine(`  🟠 High: ${result.totalHigh}`);
    this.outputChannel.appendLine(`  🟡 Medium: ${result.totalMedium}`);
    this.outputChannel.appendLine(`  🟢 Low: ${result.totalLow}`);
    this.outputChannel.appendLine(`  ℹ️  Info: ${result.totalInfo}`);
    this.outputChannel.appendLine('');

    // Dependency vulnerabilities
    if (result.dependencyVulnerabilities.length > 0) {
      this.outputChannel.appendLine(`📦 Dependency Vulnerabilities: ${result.dependencyVulnerabilities.length}`);
      this.outputChannel.appendLine('-'.repeat(50));
      for (const vuln of result.dependencyVulnerabilities) {
        const icon = this.getSeverityIcon(vuln.severity);
        this.outputChannel.appendLine(`  ${icon} ${vuln.name} (${vuln.severity})`);
        this.outputChannel.appendLine(`     ${vuln.title}`);
        if (vuln.patchedVersions.length > 0) {
          this.outputChannel.appendLine(`     Patched versions: ${vuln.patchedVersions.join(', ')}`);
        }
        if (vuln.url) {
          this.outputChannel.appendLine(`     More info: ${vuln.url}`);
        }
        this.outputChannel.appendLine('');
      }
    }

    // Code security issues
    if (result.issues.length > 0) {
      this.outputChannel.appendLine(`🛡️  Code Security Issues: ${result.issues.length}`);
      this.outputChannel.appendLine('-'.repeat(50));

      // Group by type
      const grouped = this.groupIssuesByType(result.issues);

      for (const [type, issuesOfType] of Object.entries(grouped)) {
        this.outputChannel.appendLine(`\n${this.getTypeIcon(type as SecurityIssueType)} ${this.getTypeLabel(type as SecurityIssueType)} (${issuesOfType.length})`);
        this.outputChannel.appendLine('-'.repeat(50));

        for (const issue of issuesOfType) {
          const icon = this.getSeverityIcon(issue.severity);
          this.outputChannel.appendLine(`  ${icon} Line ${issue.line}: ${issue.description}`);
          this.outputChannel.appendLine(`     Code: ${issue.codeSnippet}`);
          this.outputChannel.appendLine(`     💡 ${issue.suggestion}`);
          if (issue.cwe) {
            this.outputChannel.appendLine(`     📚 ${issue.cwe}`);
          }
          if (issue.references && issue.references.length > 0) {
            this.outputChannel.appendLine(`     🔗 ${issue.references.join(', ')}`);
          }
          this.outputChannel.appendLine('');
        }
      }
    }

    if (result.issues.length === 0 && result.dependencyVulnerabilities.length === 0) {
      this.outputChannel.appendLine('✅ No security issues found!');
    }

    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(result.summary);

    this.outputChannel.show(true);
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
   * Dispose resources
   */
  public dispose(): void {
    this.outputChannel.dispose();
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
      trimmed.startsWith('<!')
    );
  }

  /**
   * Check if a line should be excluded based on patterns
   */
  private shouldExclude(line: string, excludedPatterns: string[]): boolean {
    for (const patternStr of excludedPatterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        if (pattern.test(line)) {
          return true;
        }
      } catch {
        // Invalid regex, skip
      }
    }
    return false;
  }

  /**
   * Update VS Code diagnostics with security issues
   */
  private updateDiagnostics(document: vscode.TextDocument, issues: SecurityIssue[]): void {
    if (issues.length === 0) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = issues.map((issue) => {
      const range = new vscode.Range(
        new vscode.Position(issue.line - 1, issue.column - 1),
        new vscode.Position(issue.line - 1, issue.column - 1 + issue.codeSnippet.length),
      );

      const message = `${issue.description}\n💡 ${issue.suggestion}${issue.cwe ? `\n📚 ${issue.cwe}` : ''}`;

      const diagnostic = new vscode.Diagnostic(
        range,
        message,
        this.convertSeverity(issue.severity),
      );

      diagnostic.code = issue.cwe ?? issue.type;
      diagnostic.source = 'Security Audit';
      diagnostic.tags = [vscode.DiagnosticTag.Security];
      return diagnostic;
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Convert issue severity to VS Code diagnostic severity
   */
  private convertSeverity(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
      case 'high':
        return vscode.DiagnosticSeverity.Error;
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'low':
      case 'info':
        return vscode.DiagnosticSeverity.Information;
    }
  }

  /**
   * Generate a summary of the security audit
   */
  private generateSummary(
    issues: SecurityIssue[],
    vulnerabilities: DependencyVulnerability[],
    scanDuration: number,
  ): string {
    const totalIssues = issues.length;
    const totalVulns = vulnerabilities.length;
    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const criticalVulns = vulnerabilities.filter((v) => v.severity === 'critical').length;

    if (totalIssues === 0 && totalVulns === 0) {
      return '✅ No security issues detected. Your code and dependencies appear to be secure.';
    }

    if (criticalIssues > 0 || criticalVulns > 0) {
      return `⚠️  CRITICAL: Found ${criticalIssues} critical code issues and ${criticalVulns} critical dependency vulnerabilities. Immediate action recommended.`;
    }

    if (totalIssues > 0 || totalVulns > 0) {
      return `⚠️  Found ${totalIssues} code security issues and ${totalVulns} dependency vulnerabilities. Review and fix as soon as possible.`;
    }

    return '';
  }

  /**
   * Group issues by type
   */
  private groupIssuesByType(issues: SecurityIssue[]): Record<SecurityIssueType, SecurityIssue[]> {
    const grouped: Record<string, SecurityIssue[]> = {};

    for (const issue of issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }

    return grouped as Record<SecurityIssueType, SecurityIssue[]>;
  }

  /**
   * Get icon for security issue type
   */
  private getTypeIcon(type: SecurityIssueType): string {
    const icons: Record<SecurityIssueType, string> = {
      'eval-usage': '⚠️',
      'hardcoded-secret': '🔑',
      'sql-injection': '💉',
      'command-injection': '🖥️',
      'insecure-deserialization': '📦',
      'weak-crypto': '🔐',
      'unsafe-regex': '🔍',
      'path-traversal': '📁',
      xxe: '📄',
      ssrf: '🌐',
    };
    return icons[type] ?? '•';
  }

  /**
   * Get label for security issue type
   */
  private getTypeLabel(type: SecurityIssueType): string {
    const labels: Record<SecurityIssueType, string> = {
      'eval-usage': 'Eval/Code Injection',
      'hardcoded-secret': 'Hardcoded Secrets',
      'sql-injection': 'SQL Injection',
      'command-injection': 'Command Injection',
      'insecure-deserialization': 'Insecure Deserialization',
      'weak-crypto': 'Weak Cryptography',
      'unsafe-regex': 'Unsafe Regex (ReDoS)',
      'path-traversal': 'Path Traversal',
      xxe: 'XML External Entity (XXE)',
      ssrf: 'Server-Side Request Forgery (SSRF)',
    };
    return labels[type] ?? type;
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: 'critical' | 'high' | 'medium' | 'low'): string {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return icons[severity] ?? '•';
  }
}
