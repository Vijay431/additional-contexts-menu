---
layout: default
title: 'Move Function to File'
description: 'Documentation for Move Function to File - move function at cursor to a target file for Additional Context Menus.'
---

<h1>Move Function to File</h1>

<h2>Overview</h2>
<p>Moves the function at the cursor position into a selected target file and removes it from the source. Uses smart insertion (after imports, before exports).</p>

<h3>Key Features</h3>
<ul>
<li>AST-based function detection at cursor position</li>
<li>File picker showing compatible files sorted by last modified</li>
<li>Smart insertion point (after imports, before exports)</li>
<li>Removes the function from the source file after successful transfer</li>
<li>Only the function body is transferred — no import copying</li>
</ul>

<h2>Usage</h2>
<p>Place cursor inside a function → right-click → <strong>Move Function to File</strong> (or <code>Ctrl+Alt+Shift+R</code>) → select target file.</p>

<h2>Supported File Types</h2>
<p><code>.ts</code> <code>.tsx</code> <code>.js</code> <code>.jsx</code></p>

<h2>Use Cases</h2>
<ul>
<li>Refactoring a function out of a large component into a dedicated utility file</li>
<li>Reorganising code without manual cut/paste</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
