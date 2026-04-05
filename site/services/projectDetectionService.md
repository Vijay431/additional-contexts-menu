---
layout: default
title: 'Project Detection Service'
description: 'Documentation for Project Detection Service - framework detection and extension recommendations for Additional Context Menus.'
---

<h1>Project Detection Service</h1>

<h2>Overview</h2>
<p>Automatic project type and framework detection with extension recommendations and .vscode/settings.json auto-update support.</p>

<h3>Key Features</h3>
<ul>
<li>Framework detection (React, Angular, Express, Next.js, Vue, Svelte, Nest.js)</li>
<li>TypeScript detection (tsconfig.json, @types/node dependency)</li>
<li>Context variable updates for menu visibility</li>
<li>Extension recommendation system</li>
<li>.vscode/settings.json auto-update</li>
<li>Workspace change handling</li>
<li>Detection caching for performance</li>
</ul>

<h2>Detected Frameworks</h2>

<h3>React</h3>
<p>Presence of 'react' dependency in package.json</p>

<h3>Angular</h3>
<p>Presence of '@angular/core' dependency in package.json</p>

<h3>Express</h3>
<p>Presence of 'express' dependency in package.json</p>

<h3>Next.js</h3>
<p>Presence of 'next' dependency in package.json</p>

<h3>Vue.js</h3>
<p>Presence of 'vue' dependency in package.json</p>

<h3>Svelte</h3>
<p>Presence of 'svelte' dependency in package.json</p>

<h3>Nest.js</h3>
<p>Presence of '@nestjs/core' dependency in package.json</p>

<h3>TypeScript</h3>
<p>Presence of tsconfig.json or '@types/node' dependency</p>

<h2>Extension Recommendations</h2>

<p><strong>TypeScript projects:</strong> dbaeumer.vscode-eslint, esbenp.prettier-vscode</p>
<p><strong>Angular projects:</strong> Angular.ng-template, dbaeumer.vscode-eslint</p>
<p><strong>React projects:</strong> dbaeumer.vscode-eslint, esbenp.prettier-vscode</p>
<p><strong>Next.js projects:</strong> dbaeumer.vscode-eslint, bradlc.vscode-tailwindcss</p>
<p><strong>Vue projects:</strong> Vue.volar, dbaeumer.vscode-eslint</p>
<p><strong>Svelte projects:</strong> svelte.svelte-vscode, dbaeumer.vscode-eslint</p>

<h2>API Reference</h2>

<h3>detectProjectType()</h3>
<p>Detects project type and framework information.</p>

<h3>updateContextVariables()</h3>
<p>Updates VS Code context variables for menu visibility.</p>

<h3>clearCache()</h3>
<p>Clears project detection cache.</p>

<h2>Use Cases</h2>

<ul>
<li>Automatic project detection on workspace open</li>
<li>Framework-aware menu display</li>
<li>Recommended extensions suggestions</li>
<li>IDE configuration automation</li>
<li>Multi-framework project detection</li>
</ul>

<h2>Configuration Options</h2>

<p><strong>additionalContextMenus.projectDetection.autoUpdateSettings</strong> - Auto-update .vscode/settings.json</p>
<p><strong>additionalContextMenus.autoDetectProjects</strong> - Enable project detection</p>

<a href="../index.html" class="btn">Back to Services</a>
