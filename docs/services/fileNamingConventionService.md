---
layout: default
title: 'File Naming Convention Service'
description: 'Documentation for File Naming Convention Service - naming enforcement and conversion for Additional Context Menus.'
---

<h1>File Naming Convention Service</h1>

<h2>Overview</h2>
<p>Enforces and converts file naming conventions with validation, renaming, and bulk operation support.</p>

<h3>Key Features</h3>
<ul>
<li>Convention validation for single files and directories</li>
<li>Automatic conversion to selected convention</li>
<li>Bulk rename operations with dry-run mode</li>
<li>Multiple naming convention support (7 conventions)</li>
<li>Diagnostic display for violations in VS Code</li>
<li>Smart name conversion algorithms</li>
<li>Conflict detection (file exists check)</li>
</ul>

<h2>Supported Naming Conventions</h2>

<ul>
<li><strong>kebab-case:</strong> my-component-name.ts</li>
<li><strong>camelCase:</strong> myComponentName.ts</li>
<li><strong>PascalCase:</strong> MyComponentName.ts</li>
<li><strong>snake_case:</strong> my_component_name.ts</li>
<li><strong>UPPER_CASE:</strong> MY_COMPONENT_NAME.ts</li>
<li><strong>Train-Case:</strong> Train-Case-Name.ts</li>
<li><strong>dot.case:</strong> dot.case.name.ts</li>
</ul>

<h2>API Reference</h2>

<h3>validateFileName()</h3>
<p>Validates single file name against convention.</p>

<h3>validateDirectory()</h3>
<p>Validates directory files against convention.</p>

<h3>renameFile()</h3>
<p>Renames single file to follow convention.</p>

<h3>bulkRenameFiles()</h3>
<p>Renames all files in directory to follow convention.</p>

<h3>showRenameSuggestions()</h3>
<p>Shows rename suggestions QuickPick to user.</p>

<h2>Use Cases</h2>

<ul>
<li>Enforcing project naming standards</li>
<li>Migrating to new naming convention</li>
<li>Bulk file organization</li>
<li>Code consistency across team</li>
<li>Automated file renaming for large projects</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
