---
layout: default
title: 'Installation Guide'
description: 'Complete step-by-step installation guide for Additional Context Menus VS Code extension with configuration options and troubleshooting.'
---

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <h1 class="page-title">Installation Guide</h1>
        <p class="page-description">
            Get Additional Context Menus up and running in your VS Code environment with our comprehensive installation guide.
        </p>
    </div>
</section>

<!-- Installation Methods -->
<section class="installation-methods">
    <div class="container">
        <div class="method-grid">
            <!-- VS Code Marketplace -->
            <div class="method-card primary">
                <div class="method-header">
                    <i class="fas fa-store"></i>
                    <h2>VS Code Marketplace</h2>
                    <span class="method-badge">Recommended</span>
                </div>
                <div class="method-content">
                    <p class="method-description">
                        Install directly from the VS Code Marketplace for automatic updates and seamless integration.
                    </p>
                    
                    <div class="installation-steps">
                        <h3>Method 1: Extensions View</h3>
                        <ol class="step-list">
                            <li>Open Visual Studio Code</li>
                            <li>Click on the Extensions icon in the Activity Bar (or press <kbd>Ctrl+Shift+X</kbd>)</li>
                            <li>Search for <strong>"Additional Context Menus"</strong></li>
                            <li>Look for the extension by <strong>VijayGangatharan</strong></li>
                            <li>Click the <strong>Install</strong> button</li>
                        </ol>
                        
                        <h3>Method 2: Quick Open</h3>
                        <ol class="step-list">
                            <li>Press <kbd>Ctrl+P</kbd> (Windows/Linux) or <kbd>Cmd+P</kbd> (macOS)</li>
                            <li>Type: <code>ext install VijayGangatharan.additional-context-menus</code></li>
                            <li>Press <kbd>Enter</kbd></li>
                        </ol>
                        
                        <h3>Method 3: Command Palette</h3>
                        <ol class="step-list">
                            <li>Press <kbd>Ctrl+Shift+P</kbd> (Windows/Linux) or <kbd>Cmd+Shift+P</kbd> (macOS)</li>
                            <li>Type: <code>Extensions: Install Extensions</code></li>
                            <li>Search for <strong>"Additional Context Menus"</strong></li>
                            <li>Install the extension by <strong>VijayGangatharan</strong></li>
                        </ol>
                    </div>
                    
                    <div class="method-actions">
                        <a href="{{ site.extension.marketplace_url }}" class="btn btn-primary" target="_blank">
                            <i class="fas fa-external-link-alt"></i>
                            Open in Marketplace
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Manual Installation -->
            <div class="method-card">
                <div class="method-header">
                    <i class="fas fa-download"></i>
                    <h2>Manual Installation</h2>
                </div>
                <div class="method-content">
                    <p class="method-description">
                        Download and install the VSIX package manually for offline environments or specific version control.
                    </p>
                    
                    <div class="installation-steps">
                        <h3>Download & Install</h3>
                        <ol class="step-list">
                            <li>Download the latest <code>.vsix</code> file from <a href="{{ site.extension.github_url }}/releases" target="_blank">GitHub Releases</a></li>
                            <li>Open Visual Studio Code</li>
                            <li>Press <kbd>Ctrl+Shift+P</kbd> to open Command Palette</li>
                            <li>Type: <code>Extensions: Install from VSIX...</code></li>
                            <li>Select the downloaded <code>.vsix</code> file</li>
                            <li>Restart VS Code if prompted</li>
                        </ol>
                    </div>
                    
                    <div class="method-actions">
                        <a href="{{ site.extension.github_url }}/releases" class="btn btn-secondary" target="_blank">
                            <i class="fas fa-download"></i>
                            Download VSIX
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- System Requirements -->
<section class="requirements">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">System Requirements</h2>
            <p class="section-description">
                Ensure your system meets the minimum requirements for optimal performance.
            </p>
        </div>
        
        <div class="requirements-grid">
            <div class="requirement-card">
                <div class="req-icon">
                    <i class="fab fa-microsoft"></i>
                </div>
                <h3 class="req-title">Visual Studio Code</h3>
                <div class="req-details">
                    <p class="req-version">Version 1.102.0 or higher</p>
                    <p class="req-note">Latest stable version recommended</p>
                </div>
            </div>
            
            <div class="requirement-card">
                <div class="req-icon">
                    <i class="fas fa-desktop"></i>
                </div>
                <h3 class="req-title">Operating System</h3>
                <div class="req-details">
                    <ul class="req-list">
                        <li>Windows 10/11</li>
                        <li>macOS 10.15+</li>
                        <li>Linux (Ubuntu 18.04+)</li>
                    </ul>
                </div>
            </div>
            
            <div class="requirement-card">
                <div class="req-icon">
                    <i class="fab fa-node-js"></i>
                </div>
                <h3 class="req-title">Node.js Runtime</h3>
                <div class="req-details">
                    <p class="req-version">Node.js 16-24 supported</p>
                    <p class="req-note">For development and build tools</p>
                    <p class="req-note">Extension runs in VS Code host</p>
                </div>
            </div>

            <div class="requirement-card">
                <div class="req-icon">
                    <i class="fas fa-memory"></i>
                </div>
                <h3 class="req-title">System Resources</h3>
                <div class="req-details">
                    <p class="req-spec">RAM: 4GB minimum</p>
                    <p class="req-spec">Storage: ~48KB extension size</p>
                    <p class="req-note">Minimal system impact</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Post-Installation Setup -->
<section class="post-installation">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Post-Installation Setup</h2>
            <p class="section-description">
                Configure Additional Context Menus to match your development workflow preferences.
            </p>
        </div>
        
        <div class="setup-steps">
            <div class="setup-step">
                <div class="step-header">
                    <span class="step-number">1</span>
                    <h3 class="step-title">Verify Installation</h3>
                </div>
                <div class="step-content">
                    <p>After installation, open a Node.js project in VS Code. Right-click in any TypeScript or JavaScript file to see the new context menu options.</p>
                    <div class="verification-note">
                        <p><strong>Note:</strong> Context menus appear in Node.js projects with package.json files and in supported file types (.ts, .tsx, .js, .jsx).</p>
                    </div>
                </div>
            </div>
            
            <div class="setup-step">
                <div class="step-header">
                    <span class="step-number">2</span>
                    <h3 class="step-title">Access Commands</h3>
                </div>
                <div class="step-content">
                    <p>Open the Command Palette (<kbd>Ctrl+Shift+P</kbd>) and type "Additional Context Menus" to see all available commands:</p>
                    <div class="command-list">
                        <ul>
                            <li><strong>Copy Function</strong> - Copy function at cursor position</li>
                            <li><strong>Copy Lines to File</strong> - Copy selected code to another file</li>
                            <li><strong>Move Lines to File</strong> - Move selected code to another file</li>
                            <li><strong>Save All</strong> - Save all open files</li>
                            <li><strong>Open in Terminal</strong> - Open terminal in file directory</li>
                            <li><strong>Additional Context Menus: Enable/Disable</strong> - Toggle extension</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="setup-step">
                <div class="step-header">
                    <span class="step-number">3</span>
                    <h3 class="step-title">Configure Settings</h3>
                </div>
                <div class="step-content">
                    <p>Customize Additional Context Menus through VS Code settings (<kbd>Ctrl+,</kbd>) by searching for "additionalContextMenus":</p>
                    <div class="settings-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Setting</th>
                                    <th>Description</th>
                                    <th>Default</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>additionalContextMenus.enabled</code></td>
                                    <td>Enable/disable the extension</td>
                                    <td><code>true</code></td>
                                </tr>
                                <tr>
                                    <td><code>additionalContextMenus.autoDetectProjects</code></td>
                                    <td>Auto-detect Node.js projects</td>
                                    <td><code>true</code></td>
                                </tr>
                                <tr>
                                    <td><code>additionalContextMenus.supportedExtensions</code></td>
                                    <td>Supported file extensions</td>
                                    <td><code>[".ts", ".tsx", ".js", ".jsx"]</code></td>
                                </tr>
                                <tr>
                                    <td><code>additionalContextMenus.copyCode.insertionPoint</code></td>
                                    <td>Code insertion strategy</td>
                                    <td><code>smart</code></td>
                                </tr>
                                <tr>
                                    <td><code>additionalContextMenus.terminal.type</code></td>
                                    <td>Terminal type (integrated/external/system-default)</td>
                                    <td><code>integrated</code></td>
                                </tr>
                                <tr>
                                    <td><code>additionalContextMenus.saveAll.showNotification</code></td>
                                    <td>Show save notifications</td>
                                    <td><code>true</code></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Configuration Examples -->
<section class="configuration-examples">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Configuration Examples</h2>
            <p class="section-description">
                Common configuration scenarios for different development workflows.
            </p>
        </div>
        
        <div class="config-grid">
            <div class="config-card">
                <h3 class="config-title">
                    <i class="fas fa-code"></i>
                    Developer Focused
                </h3>
                <p class="config-description">
                    Optimized for React/TypeScript development workflows.
                </p>
                <div class="config-code">
                    <pre><code>{
  "additionalContextMenus.enabled": true,
  "additionalContextMenus.autoDetectProjects": true,
  "additionalContextMenus.copyCode.insertionPoint": "smart",
  "additionalContextMenus.copyCode.handleImports": "merge",
  "additionalContextMenus.terminal.type": "integrated"
}</code></pre>
                </div>
            </div>

            <div class="config-card">
                <h3 class="config-title">
                    <i class="fas fa-terminal"></i>
                    Terminal Power User
                </h3>
                <p class="config-description">
                    Custom terminal integration with external applications.
                </p>
                <div class="config-code">
                    <pre><code>{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "wt -d {{directory}}",
  "additionalContextMenus.terminal.openBehavior": "parent-directory",
  "additionalContextMenus.copyCode.preserveComments": true
}</code></pre>
                </div>
            </div>

            <div class="config-card">
                <h3 class="config-title">
                    <i class="fas fa-cog"></i>
                    Team Settings
                </h3>
                <p class="config-description">
                    Recommended settings for team development environments.
                </p>
                <div class="config-code">
                    <pre><code>{
  "additionalContextMenus.enabled": true,
  "additionalContextMenus.saveAll.showNotification": false,
  "additionalContextMenus.copyCode.insertionPoint": "smart",
  "additionalContextMenus.copyCode.handleImports": "merge",
  "additionalContextMenus.supportedExtensions": [".ts", ".tsx", ".js", ".jsx"]
}</code></pre>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Troubleshooting -->
<section class="troubleshooting">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Troubleshooting</h2>
            <p class="section-description">
                Common issues and solutions for Additional Context Menus installation and usage.
            </p>
        </div>
        
        <div class="troubleshooting-grid">
            <div class="trouble-card">
                <div class="trouble-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Context Menus Not Appearing</h3>
                </div>
                <div class="trouble-content">
                    <p class="trouble-problem">Right-click context menus don't show Additional Context Menus options.</p>
                    <div class="trouble-solutions">
                        <h4>Solutions:</h4>
                        <ol>
                            <li>Ensure you're in a Node.js project with package.json</li>
                            <li>Verify file type is supported (.ts, .tsx, .js, .jsx)</li>
                            <li>Check if the extension is enabled: <code>Additional Context Menus: Enable</code></li>
                            <li>Try refreshing context variables from Command Palette</li>
                        </ol>
                    </div>
                </div>
            </div>
            
            <div class="trouble-card">
                <div class="trouble-header">
                    <i class="fas fa-cog"></i>
                    <h3>Configuration Issues</h3>
                </div>
                <div class="trouble-content">
                    <p class="trouble-problem">Settings changes are not taking effect.</p>
                    <div class="trouble-solutions">
                        <h4>Solutions:</h4>
                        <ol>
                            <li>Ensure settings are in the correct JSON format</li>
                            <li>Check for typos in setting names</li>
                            <li>Reload VS Code window: <code>Developer: Reload Window</code></li>
                            <li>Reset to default settings and reconfigure</li>
                        </ol>
                    </div>
                </div>
            </div>
            
            <div class="trouble-card">
                <div class="trouble-header">
                    <i class="fas fa-performance"></i>
                    <h3>Performance Issues</h3>
                </div>
                <div class="trouble-content">
                    <p class="trouble-problem">VS Code feels slower after installing the extension.</p>
                    <div class="trouble-solutions">
                        <h4>Solutions:</h4>
                        <ol>
                            <li>Disable extension temporarily: <code>Additional Context Menus: Disable</code></li>
                            <li>Check for large files that may slow AST parsing</li>
                            <li>Verify Node.js version compatibility (16-24 supported)</li>
                            <li>Check output logs: <code>Additional Context Menus: Show Output Channel</code></li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="trouble-support">
            <h3>Still Need Help?</h3>
            <p>If you're still experiencing issues, please:</p>
            <div class="support-actions">
                <a href="{{ site.extension.github_url }}/issues" class="btn btn-primary" target="_blank">
                    <i class="fas fa-bug"></i>
                    Report an Issue
                </a>
                <a href="{{ site.extension.github_url }}/discussions" class="btn btn-secondary" target="_blank">
                    <i class="fas fa-comments"></i>
                    Join Discussion
                </a>
            </div>
        </div>
    </div>
</section>

<!-- Next Steps -->
<section class="next-steps">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Next Steps</h2>
            <p class="section-description">
                Now that you have Additional Context Menus installed, explore its full potential.
            </p>
        </div>
        
        <div class="next-steps-grid">
            <div class="next-step-card">
                <div class="next-icon">
                    <i class="fas fa-list"></i>
                </div>
                <h3 class="next-title">Explore Features</h3>
                <p class="next-description">
                    Learn about all the advanced features and configuration options available.
                </p>
                <a href="{{ site.baseurl }}/features" class="btn btn-outline">
                    View Features
                </a>
            </div>
            
            <div class="next-step-card">
                <div class="next-icon">
                    <i class="fas fa-book"></i>
                </div>
                <h3 class="next-title">Read Documentation</h3>
                <p class="next-description">
                    Dive deeper into the technical documentation and architecture details.
                </p>
                <a href="{{ site.baseurl }}/documentation" class="btn btn-outline">
                    Read Docs
                </a>
            </div>
            
            <div class="next-step-card">
                <div class="next-icon">
                    <i class="fas fa-heart"></i>
                </div>
                <h3 class="next-title">Support the Project</h3>
                <p class="next-description">
                    Help improve Additional Context Menus by contributing or sharing feedback.
                </p>
                <a href="{{ site.extension.github_url }}" class="btn btn-outline" target="_blank">
                    Contribute
                </a>
            </div>
        </div>
    </div>
</section>
