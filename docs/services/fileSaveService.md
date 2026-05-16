---
layout: default
title: 'File Save Service'
description: 'Documentation for File Save Service - enhanced save operations with progress feedback for Additional Context Menus.'
---

<h1>File Save Service</h1>

<h2>Overview</h2>
<p>Enhanced file save operations with progress feedback, read-only handling, and configurable notifications.</p>

<h3>Key Features</h3>
<ul>
<li>Save all dirty documents with progress tracking</li>
<li>Visual progress notification for large operations (5+ files)</li>
<li>Read-only file handling (configurable skip)</li>
<li>Configurable success/failure notifications</li>
<li>Detailed error reporting with failure counts</li>
<li>Support for workspace multi-root scenarios</li>
</ul>

<h2>API Reference</h2>

<h3>saveAllFiles()</h3>
<p>Saves all dirty documents in workspace.</p>

<h3>hasUnsavedChanges()</h3>
<p>Checks for unsaved changes.</p>

<h3>getUnsavedFileCount()</h3>
<p>Returns count of unsaved files.</p>

<h2>Use Cases</h2>

<ul>
<li>Saving all modified files before commit</li>
<li>Bulk save operations before builds</li>
<li>Quick workspace save with error handling</li>
<li>Automated save operations in CI/CD workflows</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
