---
layout: default
title: 'Code Analysis Service'
description: 'Comprehensive documentation for Code Analysis Service - AST-based function detection and code parsing for Additional Context Menus.'
---

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <h1 class="page-title">
            <i class="fas fa-code"></i>
            Code Analysis Service
        </h1>
        <p class="page-description">
            AST-based function detection using TypeScript Compiler API for accurate code analysis and parsing.
        </p>
        <div class="page-meta">
            <span class="tag"><i class="fas fa-code"></i> Service</span>
            <span class="tag"><i class="fas fa-layer-group"></i> Singleton Pattern</span>
        </div>
    </div>
</section>

<!-- Overview Section -->
<section class="service-overview">
    <div class="container">
        <h2>Overview</h2>
        <p>
            The Code Analysis Service provides accurate AST-based code parsing using TypeScript's Compiler API.
            It detects functions, arrow functions, methods, React components, and React hooks with high precision.
            This approach eliminates false positives from comments and strings while properly handling nested functions.
        </p>

        <div class="key-features">
            <h3>Key Features</h3>
            <ul>
                <li>AST-based function detection using TypeScript Compiler API</li>
                <li>Support for function declarations, arrow functions, and methods</li>
                <li>React component detection (functional components)</li>
                <li>React hooks detection (custom hooks starting with 'use')</li>
                <li>Import statement extraction from code blocks</li>
                <li>Cursor position-based function detection</li>
                <li>JSDoc and decorator preservation</li>
                <li>TypeScript type annotation support</li>
                <li>Nested function handling (returns inner-most function)</li>
                <li>No false positives in comments or strings</li>
            </ul>
        </div>

        <div class="use-cases">
            <h3>Common Use Cases</h3>
            <ul>
                <li>Finding function at cursor position for Copy Function operation</li>
                <li>Extracting imports from code for Copy/Move operations</li>
                <li>Analyzing code structure for refactoring tools</li>
                <li>Detecting React components and hooks</li>
                <li>Supporting TypeScript generics and type annotations</li>
            </ul>
        </div>
    </div>

</section>

<!-- Trade-offs Section -->
<section class="trade-offs">
    <div class="container">
        <h2>Trade-offs & Considerations</h2>

        <div class="trade-off-list">
            <div class="trade-off-item positive">
                <h3><i class="fas fa-check-circle"></i> Advantages</h3>
                <ul>
                    <li><strong>Accurate detection</strong> - Handles nested functions correctly</li>
                    <li><strong>No false positives</strong> - Won't match in comments or strings</li>
                    <li><strong>Precise positioning</strong> - Accurate line/column tracking</li>
                    <li><strong>Better React support</strong> - Improved component and hook detection</li>
                    <li><strong>Comprehensive</strong> - Handles all edge cases and complex patterns</li>
                    <li><strong>Industry standard</strong> - Uses TypeScript's own compiler API</li>
                </ul>
            </div>

            <div class="trade-off-item negative">
                <h3><i class="fas fa-exclamation-triangle"></i> Considerations</h3>
                <ul>
                    <li><strong>Bundle size increase</strong> - TypeScript Compiler API contributes to bundle size (included in core)</li>
                    <li><strong>Slightly slower</strong> - Still < 10ms per file, acceptable for most use cases</li>
                    <li><strong>More complex</strong> - Implementation is more complex than regex-based approach</li>
                </ul>
            </div>
        </div>
    </div>

</section>

<!-- API Reference Section -->
<section class="api-reference">
    <div class="container">
        <h2>API Reference</h2>
        <p>Public methods and interfaces available in Code Analysis Service.</p>

        <div class="api-methods">
            <!-- getInstance() -->
            <div class="api-method">
                <h3>getInstance()</h3>
                <div class="method-signature">
                    <code>public static getInstance(): CodeAnalysisService</code>
                </div>
                <p>Returns singleton instance of Code Analysis Service.</p>
                <div class="method-params">
                    <h4>Returns</h4>
                    <p><code>CodeAnalysisService</code> - The singleton instance</p>
                </div>
            </div>

            <!-- findFunctionAtPosition() -->
            <div class="api-method">
                <h3>findFunctionAtPosition()</h3>
                <div class="method-signature">
                    <code>public async findFunctionAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<FunctionInfo | null></code>
                </div>
                <p>Finds function that contains the given cursor position in document using AST analysis.</p>
                <div class="method-params">
                    <h4>Parameters</h4>
                    <ul>
                        <li><code>document</code> - The VS Code TextDocument to analyze</li>
                        <li><code>position</code> - The cursor position in the document</li>
                    </ul>
                    <h4>Returns</h4>
                    <p><code>Promise<FunctionInfo | null></code> - The function info if found, null otherwise</p>
                </div>
            </div>

            <!-- extractImports() -->
            <div class="api-method">
                <h3>extractImports()</h3>
                <div class="method-signature">
                    <code>public extractImports(code: string, languageId: string): string[]</code>
                </div>
                <p>Extracts import statements from the given code block using AST parsing.</p>
                <div class="method-params">
                    <h4>Parameters</h4>
                    <ul>
                        <li><code>code</code> - The code string to extract imports from</li>
                        <li><code>languageId</code> - The language ID (e.g., 'typescript', 'javascript')</li>
                    </ul>
                    <h4>Returns</h4>
                    <p><code>string[]</code> - Array of import statements found</p>
                </div>
            </div>
        </div>
    </div>

</section>

<!-- Supported Function Types -->
<section class="supported-types">
    <div class="container">
        <h2>Supported Function Types</h2>
        <p>The service accurately detects these function patterns:</p>

        <div class="type-grid">
            <div class="type-card">
                <h3><i class="fas fa-code"></i> Function Declarations</h3>
                <pre><code class="language-typescript">function name() {}</code></pre>
            </div>
            <div class="type-card">
                <h3><i class="fas fa-arrow-right"></i> Arrow Functions</h3>
                <pre><code class="language-typescript">const name = () => {}</code></pre>
            </div>
            <div class="type-card">
                <h3><i class="fas fa-bolt"></i> Single-Expression Arrows</h3>
                <pre><code class="language-typescript">const name = x => x</code></pre>
            </div>
            <div class="type-card">
                <h3><i class="fas fa-cube"></i> Method Declarations</h3>
                <pre><code class="language-typescript">class MyClass {

myMethod() {}
}</code></pre>

</div>
<div class="type-card">
<h3><i class="fas fa-atom"></i> Async Functions</h3>
<pre><code class="language-typescript">async function name() {}
const name = async () => {}</code></pre>
</div>
<div class="type-card">
<h3><i class="fab fa-react"></i> React Components</h3>
<pre><code class="language-typescript">const MyComponent = () => {
return &lt;div&gt;Hello&lt;/div&gt;
};</code></pre>
</div>
<div class="type-card">
<h3><i class="fas fa-magic"></i> React Hooks</h3>
<pre><code class="language-typescript">const useCustom = (initial) => {
const [state, setState] = useState(initial);
return { state, setState };
};</code></pre>
</div>
</div>
</div>

</section>

<!-- Examples Section -->
<section class="examples">
    <div class="container">
        <h2>Examples</h2>

        <div class="example-group">
            <h3>Example 1: Find Function at Cursor</h3>
            <p>Detect the function when user right-clicks inside it.</p>
            <pre><code class="language-typescript">

// Get service instance
const analysisService = CodeAnalysisService.getInstance();

// Find function at cursor
const functionInfo = await analysisService.findFunctionAtPosition(document, cursorPosition);

if (functionInfo) {
console.log(`Found ${functionInfo.type} '${functionInfo.name}' at line ${functionInfo.startLine}`);
console.log(`Function text: ${functionInfo.fullText}`);
}
</code></pre>

</div>

        <div class="example-group">
            <h3>Example 2: Extract Imports from Code</h3>
            <p>Extract import statements from a code block for analysis.</p>
            <pre><code class="language-typescript">

const code = `
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function MyComponent() {
// component code
}
`;

const imports = analysisService.extractImports(code, 'typescript');
console.log('Found imports:', imports);
// Output: [
// "import { useState } from 'react';",
// "import { useNavigate } from 'react-router-dom';"
// ]
</code></pre>

</div>

        <div class="example-group">
            <h3>Example 3: Nested Function Detection</h3>
            <p>Demonstration of nested function handling.</p>
            <pre><code class="language-typescript">

function outerFunction() {
const outerVariable = 'outer';

function innerFunction() {
const innerVariable = 'inner';
return 'inner'; // Cursor here detects 'innerFunction'
}

return innerFunction();
}

// Cursor in innerFunction returns 'innerFunction'
// Cursor in outerFunction (but not inner) returns 'outerFunction'
</code></pre>

</div>
    </div>

</section>

<!-- Best Practices Section -->
<section class="best-practices">
    <div class="container">
        <h2>Best Practices</h2>

        <div class="practice-list">
            <div class="practice-item">
                <div class="practice-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="practice-content">
                    <h3>Use Singleton Pattern</h3>
                    <p>Always get service instance via <code>getInstance()</code> for consistent behavior.</p>
                </div>
            </div>

            <div class="practice-item">
                <div class="practice-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="practice-content">
                    <h3>Handle Null Results</h3>
                    <p>Always check for null return values from <code>findFunctionAtPosition()</code> and handle appropriately.</p>
                </div>
            </div>

            <div class="practice-item">
                <div class="practice-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="practice-content">
                    <h3>Combine with File Discovery</h3>
                    <p>Use with File Discovery Service to get compatible files for code operations.</p>
                </div>
            </div>

            <div class="practice-item">
                <div class="practice-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="practice-content">
                    <h3>Built-in Error Handling</h3>
                    <p>The service includes built-in error handling. Check for null returns rather than try-catch.</p>
                </div>
            </div>
        </div>
    </div>

</section>

<!-- Troubleshooting Section -->
<section class="troubleshooting">
    <div class="container">
        <h2>Troubleshooting</h2>

        <div class="troubleshooting-items">
            <div class="trouble-item">
                <h3><i class="fas fa-question-circle"></i> Issue: Function Not Detected</h3>
                <p>Function at cursor position is not being detected.</p>
                <div class="trouble-solution">
                    <h4>Solution</h4>
                    <p>Ensure cursor is inside function body (between braces). Check that function follows supported patterns. Verify the file is valid TypeScript/JavaScript syntax.</p>
                </div>
            </div>

            <div class="trouble-item">
                <h3><i class="fas fa-question-circle"></i> Issue: Unexpected Function Type</h3>
                <p>Detected function type is different than expected.</p>
                <div class="trouble-solution">
                    <h4>Solution</h4>
                    <p>The service uses AST-based detection which accurately identifies function types based on TypeScript syntax. Check the actual function declaration in your code.</p>
                </div>
            </div>

            <div class="trouble-item">
                <h3><i class="fas fa-question-circle"></i> Issue: Performance Slowdown</h3>
                <p>Function detection is taking longer than expected.</p>
                <div class="trouble-solution">
                    <h4>Solution</h4>
                    <p>AST parsing typically takes < 10ms per file. If experiencing slowdowns, check file size and complexity. Consider breaking large files into smaller modules.</p>
                </div>
            </div>
        </div>
    </div>

</section>

<!-- Technical Details -->
<section class="technical-details">
    <div class="container">
        <h2>Technical Details</h2>

        <div class="tech-grid">
            <div class="tech-item">
                <h3><i class="fab fa-js"></i> TypeScript Compiler API</h3>
                <p>Uses <code>ts.createSourceFile()</code> for parsing and <code>ts.SourceFile</code> for AST traversal.</p>
            </div>
            <div class="tech-item">
                <h3><i class="fas fa-project-diagram"></i> AST Traversal</h3>
                <p>Uses <code>ts.forEachChild()</code> for efficient recursive AST traversal.</p>
            </div>
            <div class="tech-item">
                <h3><i class="fas fa-tags"></i> SyntaxKind Identification</h3>
                <p>Uses <code>ts.SyntaxKind</code> for accurate node type identification.</p>
            </div>
            <div class="tech-item">
                <h3><i class="fas fa-tachometer-alt"></i> Performance</h3>
                <p>Parsing time: < 10ms for typical files. Memory usage: Minimal (AST released after operation).</p>
            </div>
        </div>
    </div>

</section>

<!-- Related Services Section -->
<section class="related-services">
    <div class="container">
        <h2>Related Services</h2>
        <p>Services that work together with Code Analysis Service.</p>

        <div class="related-grid">
            <a href="/services/fileDiscoveryService.html" class="related-card">
                <i class="fas fa-search"></i>
                <h3>File Discovery Service</h3>
                <p>File scanning and filtering for code operations</p>
            </a>
            <a href="/services/terminalService.html" class="related-card">
                <i class="fas fa-terminal"></i>
                <h3>Terminal Service</h3>
                <p>Cross-platform terminal integration</p>
            </a>
        </div>
    </div>

</section>
