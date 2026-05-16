---
layout: default
title: 'Copy Function'
description: 'Documentation for Copy Function - AST-based function copying to clipboard for Additional Context Menus.'
---

<h1>Copy Function</h1>

<h2>Overview</h2>
<p>Copies the function at the cursor position to the clipboard using AST-based detection via the TypeScript Compiler API.</p>

<h3>Key Features</h3>
<ul>
<li>AST-based function detection (no false positives in comments or strings)</li>
<li>Supports function declarations, arrow functions, async functions, class methods</li>
<li>React component and custom hook detection</li>
<li>Preserves JSDoc comments and decorators</li>
<li>Handles nested functions (returns inner-most function at cursor)</li>
</ul>

<h2>Usage</h2>
<p>Place cursor anywhere inside a function → right-click → <strong>Copy Function</strong> (or <code>Ctrl+Alt+Shift+F</code>).</p>
<p>The full function text is written to the clipboard.</p>

<h2>Supported File Types</h2>
<p><code>.ts</code> <code>.tsx</code> <code>.js</code> <code>.jsx</code></p>

<h2>Use Cases</h2>
<ul>
<li>Quickly copying a utility function to paste elsewhere</li>
<li>Sharing a function snippet without manual selection</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
