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
                    <i class="fas fa-memory"></i>
                </div>
                <h3 class="req-title">System Resources</h3>
                <div class="req-details">
                    <p class="req-spec">RAM: 4GB minimum</p>
                    <p class="req-spec">Storage: 1MB extension size</p>
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
                Configure File Insights to match your development workflow preferences.
            </p>
        </div>
        
        <div class="setup-steps">
            <div class="setup-step">
                <div class="step-header">
                    <span class="step-number">1</span>
                    <h3 class="step-title">Verify Installation</h3>
                </div>
                <div class="step-content">
                    <p>After installation, open any file in VS Code. You should see the file size displayed in the status bar (bottom-right by default).</p>
                    <div class="verification-image">
                        <img src="https://88tynjcpeunoim0x.public.blob.vercel-storage.com/image/vscode-file_insights-extension/status-bar.png" 
                             alt="Status Bar Verification" 
                             class="setup-screenshot">
                    </div>
                </div>
            </div>
            
            <div class="setup-step">
                <div class="step-header">
                    <span class="step-number">2</span>
                    <h3 class="step-title">Access Commands</h3>
                </div>
                <div class="step-content">
                    <p>Open the Command Palette (<kbd>Ctrl+Shift+P</kbd>) and type "File Insights" to see all available commands:</p>
                    <div class="command-showcase">
                        <img src="https://88tynjcpeunoim0x.public.blob.vercel-storage.com/image/vscode-file_insights-extension/vscode-command.png" 
                             alt="Command Palette" 
                             class="setup-screenshot">
                    </div>
                </div>
            </div>
            
            <div class="setup-step">
                <div class="step-header">
                    <span class="step-number">3</span>
                    <h3 class="step-title">Configure Settings</h3>
                </div>
                <div class="step-content">
                    <p>Customize File Insights through VS Code settings (<kbd>Ctrl+,</kbd>) by searching for "fileInsights":</p>
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
                                    <td><code>fileInsights.enabled</code></td>
                                    <td>Enable/disable the extension</td>
                                    <td><code>true</code></td>
                                </tr>
                                <tr>
                                    <td><code>fileInsights.displayFormat</code></td>
                                    <td>Size display format (auto, bytes, kb, mb)</td>
                                    <td><code>auto</code></td>
                                </tr>
                                <tr>
                                    <td><code>fileInsights.statusBarPosition</code></td>
                                    <td>Status bar position (left, right)</td>
                                    <td><code>right</code></td>
                                </tr>
                                <tr>
                                    <td><code>fileInsights.showTooltip</code></td>
                                    <td>Show detailed tooltips</td>
                                    <td><code>true</code></td>
                                </tr>
                                <tr>
                                    <td><code>fileInsights.refreshInterval</code></td>
                                    <td>Refresh interval in milliseconds</td>
                                    <td><code>500</code></td>
                                </tr>
                                <tr>
                                    <td><code>fileInsights.maxFileSize</code></td>
                                    <td>Maximum file size to analyze (bytes)</td>
                                    <td><code>1073741824</code></td>
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
                    <i class="fas fa-bolt"></i>
                    Performance Focused
                </h3>
                <p class="config-description">
                    Optimized for large files and minimal resource usage.
                </p>
                <div class="config-code">
                    <pre><code>{
  "fileInsights.refreshInterval": 1000,
  "fileInsights.maxFileSize": 536870912,
  "fileInsights.showTooltip": false,
  "fileInsights.displayFormat": "auto"
}</code></pre>
                </div>
            </div>
            
            <div class="config-card">
                <h3 class="config-title">
                    <i class="fas fa-info-circle"></i>
                    Detailed Information
                </h3>
                <p class="config-description">
                    Maximum information display with detailed tooltips.
                </p>
                <div class="config-code">
                    <pre><code>{
  "fileInsights.showTooltip": true,
  "fileInsights.displayFormat": "bytes",
  "fileInsights.refreshInterval": 250,
  "fileInsights.statusBarPosition": "left"
}</code></pre>
                </div>
            </div>
            
            <div class="config-card">
                <h3 class="config-title">
                    <i class="fas fa-eye"></i>
                    Minimal Display
                </h3>
                <p class="config-description">
                    Clean interface with essential information only.
                </p>
                <div class="config-code">
                    <pre><code>{
  "fileInsights.displayFormat": "auto",
  "fileInsights.showTooltip": false,
  "fileInsights.statusBarPosition": "right",
  "fileInsights.refreshInterval": 750
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
                Common issues and solutions for File Insights installation and usage.
            </p>
        </div>
        
        <div class="troubleshooting-grid">
            <div class="trouble-card">
                <div class="trouble-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Extension Not Showing</h3>
                </div>
                <div class="trouble-content">
                    <p class="trouble-problem">File size is not displayed in the status bar after installation.</p>
                    <div class="trouble-solutions">
                        <h4>Solutions:</h4>
                        <ol>
                            <li>Ensure you have opened a file (not just a folder)</li>
                            <li>Check if the extension is enabled: <code>File Insights: Enable</code></li>
                            <li>Verify the file is not exceeding the size limit (1GB default)</li>
                            <li>Try refreshing with <code>File Insights: Refresh</code></li>
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
                            <li>Increase refresh interval: <code>fileInsights.refreshInterval</code></li>
                            <li>Reduce max file size: <code>fileInsights.maxFileSize</code></li>
                            <li>Disable tooltips: <code>fileInsights.showTooltip: false</code></li>
                            <li>Check output logs: <code>File Insights: Show Output Channel</code></li>
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
                Now that you have File Insights installed, explore its full potential.
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
                    Help improve File Insights by contributing or sharing feedback.
                </p>
                <a href="{{ site.extension.github_url }}" class="btn btn-outline" target="_blank">
                    Contribute
                </a>
            </div>
        </div>
    </div>
</section>
