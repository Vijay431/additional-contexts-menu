---
layout: default
title: 'Terminal Service'
description: 'Documentation for Terminal Service - cross-platform terminal integration for Additional Context Menus.'
---

<h1>Terminal Service</h1>

<h2>Overview</h2>
<p>Cross-platform terminal integration for VS Code with intelligent directory selection and platform-specific terminal support.</p>

<h3>Key Features</h3>
<ul>
<li>Cross-platform terminal integration (Windows, macOS, Linux)</li>
<li>Multiple terminal type support (integrated, external, system-default)</li>
<li>Configurable directory opening behavior</li>
<li>Path validation and resolution</li>
<li>Parent directory detection</li>
</ul>

<h2>API Reference</h2>

<h3>openInTerminal()</h3>
<p>Opens terminal for given file path.</p>

<h3>getTerminalType()</h3>
<p>Returns configured terminal type.</p>

<h3>getTargetDirectory()</h3>
<p>Returns target directory based on behavior setting.</p>

<h2>Terminal Types</h2>

<ul>
<li><strong>integrated</strong> - VS Code integrated terminal</li>
<li><strong>external</strong> - Custom external terminal command</li>
<li><strong>system-default</strong> - OS default terminal</li>
</ul>

<h2>Open Behavior</h2>

<ul>
<li><strong>parent-directory</strong> - Opens folder containing file</li>
<li><strong>workspace-root</strong> - Opens project root directory</li>
<li><strong>current-directory</strong> - Opens exact file location</li>
</ul>

<a href="../index.html" class="btn">Back to Services</a>
