---
layout: default
title: 'Move Selection to File'
description: 'Documentation for Move Selection to File - move selected code to a target file for Additional Context Menus.'
---

<h1>Move Selection to File</h1>

<h2>Overview</h2>
<p>Moves the current editor selection into a selected target file and removes it from the source. Uses smart insertion and configurable import handling.</p>

<h3>Key Features</h3>
<ul>
<li>Works on any selected code block</li>
<li>File picker showing compatible files sorted by last modified</li>
<li>Smart insertion point (after imports, before exports)</li>
<li>Import merging, deduplication, or skip — configurable via settings</li>
<li>Removes the selected block from the source file after successful transfer</li>
</ul>

<h2>Usage</h2>
<p>Select code → right-click → <strong>Move Selection to File</strong> (or <code>Ctrl+Alt+Shift+M</code>) → select target file.</p>

<h2>Supported File Types</h2>
<p><code>.ts</code> <code>.tsx</code> <code>.js</code> <code>.jsx</code></p>

<h2>Use Cases</h2>
<ul>
<li>Moving constants or helpers to a dedicated module</li>
<li>Refactoring large files by extracting code blocks in one step</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
