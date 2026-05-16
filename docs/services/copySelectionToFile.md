---
layout: default
title: 'Copy Selection to File'
description: 'Documentation for Copy Selection to File - copy selected code to a target file for Additional Context Menus.'
---

<h1>Copy Selection to File</h1>

<h2>Overview</h2>
<p>Copies the current editor selection into a selected target file with smart insertion and configurable import handling. The original selection is kept in place.</p>

<h3>Key Features</h3>
<ul>
<li>Works on any selected code block</li>
<li>File picker showing compatible files sorted by last modified</li>
<li>Smart insertion point (after imports, before exports)</li>
<li>Import merging, deduplication, or skip — configurable via settings</li>
<li>Preserves comments in the copied block</li>
</ul>

<h2>Usage</h2>
<p>Select code → right-click → <strong>Copy Selection to File</strong> (or <code>Ctrl+Alt+Shift+C</code>) → select target file.</p>

<h2>Supported File Types</h2>
<p><code>.ts</code> <code>.tsx</code> <code>.js</code> <code>.jsx</code></p>

<h2>Use Cases</h2>
<ul>
<li>Copying constants or type definitions to a shared file</li>
<li>Duplicating a code block across files</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
