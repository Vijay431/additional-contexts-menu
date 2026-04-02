---
layout: default
title: 'File Discovery Service'
description: 'Documentation for File Discovery Service - workspace file scanning and filtering for Additional Context Menus.'
---

<h1>File Discovery Service</h1>

<h2>Overview</h2>
<p>Discovers and filters files in workspace for code operations with caching for performance.</p>

<h3>Key Features</h3>
<ul>
<li>Workspace file scanning with pattern matching</li>
<li>File extension compatibility rules (.ts ↔ .tsx, .js ↔ .jsx)</li>
<li>Last-modified sorting for easy file selection</li>
<li>Result caching for improved performance</li>
<li>File system change monitoring</li>
<li>QuickPick integration for user-friendly file selection</li>
</ul>

<h2>API Reference</h2>

<h3>getCompatibleFiles()</h3>
<p>Returns compatible files for given source extension.</p>

<h3>showFileSelector()</h3>
<p>Shows QuickPick file selector.</p>

<h3>validateTargetFile()</h3>
<p>Validates file accessibility.</p>

<h3>isCompatibleExtension()</h3>
<p>Checks extension compatibility.</p>

<h2>Compatibility Rules</h2>

<ul>
<li>TypeScript (.ts/.tsx) ↔ TypeScript (.ts/.tsx)</li>
<li>JavaScript (.js/.jsx) ↔ JavaScript (.js/.jsx)</li>
<li>Cross-compatibility between TS and JS (limited)</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
