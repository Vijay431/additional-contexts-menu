import * as vscode from 'vscode';
import type { ContextMenuItem } from '../types/extension.js';

interface ESLintRuleSuggestion {
  rule: string;
  description: string;
  reason: string;
  severity: 'error' | 'warn' | 'off';
  config: string;
}

interface CodePattern {
  issue: string;
  rules: ESLintRuleSuggestion[];
}

const ESLINT_RULES: Record<string, CodePattern> = {
  // Console statements in production code
  console: {
    issue: 'Console statements detected',
    rules: [
      {
        rule: 'no-console',
        description: 'Disallow the use of console',
        reason: 'Console statements should be removed in production code',
        severity: 'warn',
        config: '"no-console": "warn"',
      },
    ],
  },

  // Var usage
  var: {
    issue: "Usage of 'var' keyword",
    rules: [
      {
        rule: 'no-var',
        description: 'Require the use of let or const instead of var',
        reason: 'var has function scope and can lead to confusing bugs',
        severity: 'error',
        config: '"no-var": "error"',
      },
    ],
  },

  // Any types
  any: {
    issue: "Usage of 'any' type",
    rules: [
      {
        rule: '@typescript-eslint/no-explicit-any',
        description: "Disallow the use of 'any' types",
        reason: 'Using any removes type safety benefits',
        severity: 'warn',
        config: '"@typescript-eslint/no-explicit-any": "warn"',
      },
      {
        rule: '@typescript-eslint/no-unsafe-any',
        description: 'Disallow usage of the any type',
        reason: 'Unsafe any assignments can cause runtime errors',
        severity: 'warn',
        config: '"@typescript-eslint/no-unsafe-any": "warn"',
      },
    ],
  },

  // Empty functions
  emptyFunctions: {
    issue: 'Empty function blocks detected',
    rules: [
      {
        rule: 'no-empty-function',
        description: 'Disallow empty functions',
        reason: 'Empty functions can indicate incomplete code or dead code',
        severity: 'warn',
        config: '"no-empty-function": "warn"',
      },
    ],
  },

  // Debugger statements
  debugger: {
    issue: 'Debugger statement found',
    rules: [
      {
        rule: 'no-debugger',
        description: 'Disallow the use of debugger',
        reason: 'Debugger statements should be removed in production',
        severity: 'warn',
        config: '"no-debugger": "warn"',
      },
    ],
  },

  // Nested ternary
  nestedTernary: {
    issue: 'Nested ternary operators',
    rules: [
      {
        rule: 'no-nested-ternary',
        description: 'Disallow nested ternary expressions',
        reason: 'Nested ternaries reduce code readability',
        severity: 'error',
        config: '"no-nested-ternary": "error"',
      },
    ],
  },

  // Magic numbers
  magicNumbers: {
    issue: 'Magic numbers detected',
    rules: [
      {
        rule: 'no-magic-numbers',
        description: 'Disallow magic numbers',
        reason: 'Magic numbers should be replaced with named constants',
        severity: 'warn',
        config: '"no-magic-numbers": ["warn", { "ignore": [0, 1, -1] }]',
      },
    ],
  },

  // Unused variables
  unusedVars: {
    issue: 'Unused variables detected',
    rules: [
      {
        rule: 'no-unused-vars',
        description: 'Disallow unused variables',
        reason: 'Unused variables clutter code and may indicate bugs',
        severity: 'error',
        config: '"no-unused-vars": "error"',
      },
      {
        rule: '@typescript-eslint/no-unused-vars',
        description: 'Disallow unused TypeScript variables',
        reason: 'TypeScript version with better type checking',
        severity: 'error',
        config: '"@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]',
      },
    ],
  },

  // Equality comparisons
  equality: {
    issue: 'Loose equality comparisons (== or !=)',
    rules: [
      {
        rule: 'eqeqeq',
        description: 'Require the use of === and !==',
        reason: 'Loose equality can lead to unexpected type coercion',
        severity: 'error',
        config: '"eqeqeq": ["error", "always"]',
      },
    ],
  },

  // Non-null assertions
  nonNull: {
    issue: 'Non-null assertion operator (!) usage',
    rules: [
      {
        rule: '@typescript-eslint/no-non-null-assertion',
        description: 'Disallow non-null assertions',
        reason: 'Non-null assertions can cause runtime errors',
        severity: 'warn',
        config: '"@typescript-eslint/no-non-null-assertion": "warn"',
      },
    ],
  },

  // Complex functions
  complexity: {
    issue: 'High complexity detected',
    rules: [
      {
        rule: 'complexity',
        description: 'Enforce cyclomatic complexity limits',
        reason: 'High complexity makes code harder to maintain and test',
        severity: 'warn',
        config: '"complexity": ["warn", 15]',
      },
      {
        rule: 'max-lines-per-function',
        description: 'Enforce maximum lines per function',
        reason: 'Long functions are harder to understand and maintain',
        severity: 'warn',
        config: '"max-lines-per-function": ["warn", { "max": 50, "skipBlankLines": true }]',
      },
    ],
  },

  // Promise anti-patterns
  promise: {
    issue: 'Promise anti-patterns detected',
    rules: [
      {
        rule: 'no-promise-executor-return',
        description: 'Disallow returning values from Promise executor',
        reason: 'Returned values in promise executor are not used',
        severity: 'error',
        config: '"no-promise-executor-return": "error"',
      },
      {
        rule: 'prefer-promise-reject-errors',
        description: 'Require using Error objects in Promise rejection',
        reason: 'Promise rejections should be Error objects',
        severity: 'error',
        config: '"prefer-promise-reject-errors": "error"',
      },
    ],
  },

  // Template literal consistency
  template: {
    issue: 'Inconsistent string concatenation',
    rules: [
      {
        rule: 'prefer-template',
        description: 'Require template literals over string concatenation',
        reason: 'Template literals are more readable',
        severity: 'error',
        config: '"prefer-template": "error"',
      },
    ],
  },

  // Object literal shorthand
  shorthand: {
    issue: 'Object literal can use shorthand syntax',
    rules: [
      {
        rule: 'object-shorthand',
        description: 'Require or disallow method and property shorthand syntax',
        reason: 'Shorthand syntax is more concise',
        severity: 'error',
        config: '"object-shorthand": ["error", "always"]',
      },
    ],
  },

  // Destructuring
  destructure: {
    issue: 'Can use destructuring',
    rules: [
      {
        rule: 'prefer-destructuring',
        description: 'Require destructuring from objects and arrays',
        reason: 'Destructuring makes code more readable',
        severity: 'warn',
        config: '"prefer-destructuring": ["warn", { "object": true, "array": true }]',
      },
    ],
  },
};

/**
 * Analyzes code text for common patterns that could benefit from ESLint rules
 */
function analyzeCodePatterns(code: string): ESLintRuleSuggestion[] {
  const suggestions: Set<ESLintRuleSuggestion> = new Set();

  // Check for console statements
  if (/\bconsole\.(log|warn|error|debug|info)\b/.test(code)) {
    ESLINT_RULES.console.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for var usage
  if (/\bvar\s+\w+\b/.test(code)) {
    ESLINT_RULES.var.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for any types
  if (/: any\b|<any>/i.test(code)) {
    ESLINT_RULES.any.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for empty functions
  if (/\{\s*\}/.test(code) && /\bfunction\b|\([^)]*\)\s*=>/.test(code)) {
    ESLINT_RULES.emptyFunctions.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for debugger
  if (/\bdebugger\b/.test(code)) {
    ESLINT_RULES.debugger.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for nested ternary (simplified pattern)
  if (/\?.*\?.*:/s.test(code)) {
    ESLINT_RULES.nestedTernary.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for magic numbers (numbers not 0, 1, -1)
  if (/\b(?!0\b|1\b|-1\b)\d+\b/.test(code)) {
    ESLINT_RULES.magicNumbers.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for loose equality
  if (/[=!]=[^=]/.test(code)) {
    ESLINT_RULES.equality.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for non-null assertion
  if (/!.*\./.test(code)) {
    ESLINT_RULES.nonNull.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for promise anti-patterns
  if (/\bnew\s+Promise\(/.test(code)) {
    ESLINT_RULES.promise.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for string concatenation that could be template literal
  if (/['"`][^'"`]*\+\s*[^+]|[^+]\s*\+\s*['"`]/.test(code)) {
    ESLINT_RULES.template.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for object literal opportunities
  if (/\{\s*\w+\s*:\s*\w+\s*\}/.test(code)) {
    ESLINT_RULES.shorthand.rules.forEach((rule) => suggestions.add(rule));
  }

  // Check for destructuring opportunities
  if (/\b(const|let)\s+\w+\s*=\s*\w+\.\w+/.test(code)) {
    ESLINT_RULES.destructure.rules.forEach((rule) => suggestions.add(rule));
  }

  return Array.from(suggestions);
}

/**
 * Checks if ESLint is available in the workspace
 */
async function isESLintAvailable(): Promise<boolean> {
  const eslintConfigFiles = [
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.mjs',
  ];

  for (const file of eslintConfigFiles) {
    const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, file);
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      // File doesn't exist, continue
    }
  }

  // Check if eslint is in package.json
  try {
    const packageJsonUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'package.json',
    );
    const content = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJson = JSON.parse(Buffer.from(content).toString());
    return !!packageJson.devDependencies?.eslint || !!packageJson.dependencies?.eslint;
  } catch {
    return false;
  }
}

/**
 * Creates a clickable link to ESLint rule documentation
 */
function createRuleLink(rule: string): vscode.MarkdownString {
  const url = `https://eslint.org/docs/latest/rules/${rule.replace('@typescript-eslint/', 'typescript-eslint/rules/')}`;
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.appendMarkdown(`[${rule}](${url})`);
  return md;
}

/**
 * Displays ESLint rule suggestions in a quick pick
 */
async function showESLintSuggestions(suggestions: ESLintRuleSuggestion[]): Promise<void> {
  if (suggestions.length === 0) {
    await vscode.window.showInformationMessage('No ESLint rule suggestions found for this code.');
    return;
  }

  const items = suggestions.map((s) => ({
    label: s.rule,
    description: s.severity,
    detail: s.reason,
    rule: s,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: 'ESLint Rule Suggestions',
    placeHolder: 'Select a rule to view details and copy configuration',
  });

  if (!selected) {
    return;
  }

  // Create detail message
  const detail = new vscode.MarkdownString();
  detail.appendMarkdown(`## ${selected.rule.rule}\n\n`);
  detail.appendMarkdown(`**Severity:** ${selected.rule.severity}\n\n`);
  detail.appendMarkdown(`**Description:** ${selected.rule.description}\n\n`);
  detail.appendMarkdown(`**Reason:** ${selected.rule.reason}\n\n`);
  detail.appendMarkdown(`**Configuration:**\n\`\`\`json\n${selected.rule.config}\n\`\`\`\n\n`);
  detail.appendMarkdown(`**Documentation:** ${createRuleLink(selected.rule.rule)}\n\n`);

  // Show webview with details
  const panel = vscode.window.createWebviewPanel(
    'eslintRuleDetails',
    `ESLint Rule: ${selected.rule.rule}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true },
  );

  panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESLint Rule: ${selected.rule.rule}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .severity {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
        }
        .severity.error { background-color: #f14c4c; color: white; }
        .severity.warn { background-color: #ffab00; color: black; }
        .severity.off { background-color: #888; color: white; }
        .section {
            margin: 20px 0;
        }
        .label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
        }
        code {
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            padding: 0;
            background-color: transparent;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            margin-top: 10px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h1>${selected.rule.rule}</h1>

    <div class="section">
        <span class="label">Severity:</span>
        <span class="severity ${selected.rule.severity}">${selected.rule.severity}</span>
    </div>

    <div class="section">
        <span class="label">Description:</span>
        <p>${selected.rule.description}</p>
    </div>

    <div class="section">
        <span class="label">Reason:</span>
        <p>${selected.rule.reason}</p>
    </div>

    <div class="section">
        <span class="label">Configuration:</span>
        <pre><code>${selected.rule.config}</code></pre>
        <button onclick="copyConfig()">Copy Configuration</button>
    </div>

    <div class="section">
        <span class="label">Documentation:</span>
        <p><a href="https://eslint.org/docs/latest/rules/${selected.rule.rule.replace('@typescript-eslint/', 'typescript-eslint/rules/')}" class="link">View Full Documentation</a></p>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function copyConfig() {
            const config = \`${selected.rule.config}\`;
            navigator.clipboard.writeText(config);
            vscode.postMessage({ command: 'copied' });
        }
        window.addEventListener('message', event => {
            if (event.data.command === 'copied') {
                const button = document.querySelector('button');
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy Configuration', 2000);
            }
        });
    </script>
</body>
</html>
`;

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === 'copied') {
        vscode.window.showInformationMessage('Configuration copied to clipboard!');
      }
    },
    undefined,
    [],
  );
}

/**
 * Main handler for ESLint rule suggestion
 */
export async function suggestESLintRules(text: string, selection?: vscode.Range): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await vscode.window.showWarningMessage(
      'No active editor found. Please open a file to analyze.',
    );
    return;
  }

  // Check if workspace has ESLint
  if (!vscode.workspace.workspaceFolders) {
    await vscode.window.showWarningMessage('No workspace folder found. Please open a project.');
    return;
  }

  const hasESLint = await isESLintAvailable();
  if (!hasESLint) {
    const action = await vscode.window.showWarningMessage(
      'ESLint is not configured in this workspace. Would you like suggestions anyway?',
      'Show Suggestions',
      'Cancel',
    );
    if (action !== 'Show Suggestions') {
      return;
    }
  }

  // Get code to analyze
  let codeToAnalyze = text;
  if (!codeToAnalyze) {
    // Use selected text or entire document
    codeToAnalyze = selection ? editor.document.getText(selection) : editor.document.getText();
  }

  // Analyze code patterns
  const suggestions = analyzeCodePatterns(codeToAnalyze);

  // Show suggestions
  await showESLintSuggestions(suggestions);
}

/**
 * Get context menu item for ESLint rule suggester
 */
export function getESLintRuleSuggesterMenuItem(): ContextMenuItem {
  return {
    command: 'additional-contexts.suggestESLintRules',
    title: 'Suggest ESLint Rules',
    callback: suggestESLintRules,
    conditions: {
      mimeTypes: [
        'application/javascript',
        'application/typescript',
        'application/json',
        'text/javascript',
        'text/typescript',
      ],
      mustHaveSelection: false,
    },
  };
}
