---
layout: default
title: 'Copy Function to File'
description: 'Documentation for Copy Function to File - copy function at cursor to a target file for Additional Context Menus.'
---

<h1>Copy Function to File</h1>

<h2>Overview</h2>
<p>Copies the function at the cursor position into a selected target file using smart insertion (after imports, before exports). The original function is kept in place.</p>

<h3>Key Features</h3>
<ul>
<li>AST-based function detection at cursor position</li>
<li>File picker showing compatible files sorted by last modified</li>
<li>Smart insertion point (after imports, before exports)</li>
<li>Only the function body is transferred — no import copying</li>
</ul>

<h2>Usage</h2>
<p>Place cursor inside a function → right-click → <strong>Copy Function to File</strong> (or <code>Ctrl+Alt+Shift+E</code>) → select target file.</p>

<h2>Supported File Types</h2>
<p><code>.ts</code> <code>.tsx</code> <code>.js</code> <code>.jsx</code></p>

<h2>Use Cases</h2>
<ul>
<li>Extracting a utility function into a shared module while keeping the original</li>
<li>Duplicating a function across files</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
