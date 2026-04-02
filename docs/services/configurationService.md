---
layout: default
title: 'Configuration Service'
description: 'Comprehensive documentation for Configuration Service - VS Code settings management for Additional Context Menus.'
---

<h1>Configuration Service</h1>

<h2>Overview</h2>
<p>Manages VS Code configuration settings for the Additional Context Menus extension with type-safe access and change event handling.</p>

<h3>Key Features</h3>
<ul>
<li>Singleton pattern for global access across extension</li>
<li>Type-safe configuration retrieval with proper TypeScript types</li>
<li>Automatic default value handling</li>
<li>Configuration change event handling with filtering</li>
<li>Update methods for individual settings or full config</li>
</ul>

<h2>API Reference</h2>

<h3>getInstance()</h3>
<p>Returns singleton instance of Configuration Service.</p>

<h3>getConfiguration()</h3>
<p>Returns complete extension configuration object.</p>

<h3>isEnabled()</h3>
<p>Checks if extension is enabled.</p>

<h3>onConfigurationChanged()</h3>
<p>Registers callback for configuration changes.</p>

<h3>updateConfiguration()</h3>
<p>Updates a specific configuration setting.</p>

<h2>Configuration Options</h2>

<p><strong>additionalContextMenus.enabled</strong> - Enable/disable extension globally</p>
<p><strong>additionalContextMenus.autoDetectProjects</strong> - Automatic project detection</p>
<p><strong>additionalContextMenus.supportedExtensions</strong> - Supported file extensions</p>
<p><strong>additionalContextMenus.copyCode.*</strong> - Copy code settings</p>
<p><strong>additionalContextMenus.saveAll.*</strong> - Save all settings</p>
<p><strong>additionalContextMenus.terminal.*</strong> - Terminal settings</p>

<a href="../index.html" class="btn">Back to Services</a>
