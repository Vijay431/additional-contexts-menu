---
layout: default
title: 'Features & Capabilities'
description: 'Explore the comprehensive features and intelligent code operations of Additional Context Menus VS Code extension.'
---

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <h1 class="page-title">Features & Capabilities</h1>
        <p class="page-description">
            Discover the comprehensive features that make Additional Context Menus essential for Node.js development with React, Angular, Express, and Next.js.
        </p>
    </div>
</section>

<!-- Core Features Section -->
<section class="detailed-features">
    <div class="container">
        <div class="feature-section">
            <div class="feature-header">
                <h2 class="feature-category">Smart Context Menu Operations</h2>
                <p class="feature-category-desc">Intelligent code operations that understand your project structure and framework.</p>
            </div>
            
            <div class="feature-list">
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Smart Function Detection</h3>
                        <p class="feature-desc">
                            Uses intelligent pattern matching to accurately detect and copy functions, arrow functions, methods,
                            and React components with optimized performance for TypeScript and JavaScript files.
                        </p>
                        <ul class="feature-benefits">
                            <li>Detects function declarations, expressions, and arrow functions</li>
                            <li>Supports async/await and generator functions</li>
                            <li>Recognizes React functional and class components</li>
                            <li>Handles TypeScript type annotations and generics</li>
                            <li>Preserves JSDoc comments and decorators</li>
                        </ul>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-copy"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Smart Code Copy to Existing File</h3>
                        <p class="feature-desc">
                            Copy selected code or functions to existing files with intelligent import handling, 
                            conflict resolution, and smart insertion point detection.
                        </p>
                        <ul class="feature-benefits">
                            <li><strong>Smart Insertion:</strong> Automatically chooses best location</li>
                            <li><strong>Import Merging:</strong> Combines with existing imports</li>
                            <li><strong>Conflict Detection:</strong> Warns about duplicate functions</li>
                            <li><strong>Comment Preservation:</strong> Maintains code documentation</li>
                        </ul>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-cut"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Move Code to Existing File</h3>
                        <p class="feature-desc">
                            Move code between files with automatic cleanup of the source file, including removal of 
                            unused imports and proper handling of dependencies.
                        </p>
                        <ul class="feature-benefits">
                            <li>Removes code from source file after successful move</li>
                            <li>Cleans up unused imports automatically</li>
                            <li>Handles interdependent code relationships</li>
                            <li>Maintains proper file structure and formatting</li>
                        </ul>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-save"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Enhanced Save All</h3>
                        <p class="feature-desc">
                            Improved Save All functionality with progress feedback, read-only file handling,
                            and notification options for better development workflow.
                        </p>
                        <ul class="feature-benefits">
                            <li>Visual progress feedback for large workspaces</li>
                            <li>Automatically skips read-only files</li>
                            <li>Configurable success/failure notifications</li>
                            <li>Handles workspace multi-root scenarios</li>
                        </ul>
                    </div>
                </div>

                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-terminal"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Cross-Platform Terminal Integration <span class="version-badge">v1.2.0+</span></h3>
                        <p class="feature-desc">
                            Right-click "Open in Terminal" functionality with intelligent cross-platform detection
                            and configurable terminal types for seamless command-line access from any file.
                        </p>
                        <ul class="feature-benefits">
                            <li><strong>Three Terminal Types:</strong> Integrated, External, System Default</li>
                            <li><strong>Cross-Platform Support:</strong> Windows (cmd/PowerShell), macOS (Terminal.app), Linux (auto-detection)</li>
                            <li><strong>Directory Behaviors:</strong> Parent directory, workspace root, current directory</li>
                            <li><strong>Custom External Terminals:</strong> Windows Terminal, iTerm2, Tilix, and more</li>
                            <li><strong>Intelligent Fallbacks:</strong> Automatic fallback to integrated terminal on errors</li>
                            <li><strong>Path Validation:</strong> Robust error handling for permissions and invalid paths</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Professional Features Section -->
        <div class="feature-section">
            <div class="feature-header">
                <h2 class="feature-category">Project Intelligence & Framework Support</h2>
                <p class="feature-category-desc">Smart project detection and framework-specific enhancements for modern web development.</p>
            </div>
            
            <div class="feature-list">
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Automatic Project Detection</h3>
                        <p class="feature-desc">
                            Automatically detects Node.js projects and identifies frameworks by analyzing package.json dependencies 
                            to provide framework-specific context menu enhancements.
                        </p>
                        <ul class="feature-benefits">
                            <li><strong>React:</strong> Component and JSX-aware operations</li>
                            <li><strong>Angular:</strong> Service and component management</li>
                            <li><strong>Express:</strong> Route and middleware handling</li>
                            <li><strong>Next.js:</strong> Full-stack development support</li>
                            <li><strong>TypeScript:</strong> Type-aware code operations</li>
                        </ul>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Comprehensive Configuration System</h3>
                        <p class="feature-desc">
                            Extensive configuration options with real-time updates, allowing complete customization 
                            of behavior and appearance without requiring VS Code restart.
                        </p>
                        <div class="config-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Setting</th>
                                        <th>Type</th>
                                        <th>Default</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><code>additionalContextMenus.enabled</code></td>
                                        <td>Boolean</td>
                                        <td>true</td>
                                        <td>Enable/disable extension</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.autoDetectProjects</code></td>
                                        <td>Boolean</td>
                                        <td>true</td>
                                        <td>Auto-detect Node.js projects</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.supportedExtensions</code></td>
                                        <td>Array</td>
                                        <td>[".ts", ".tsx", ".js", ".jsx"]</td>
                                        <td>Supported file extensions</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.copyCode.insertionPoint</code></td>
                                        <td>String</td>
                                        <td>smart</td>
                                        <td>Code insertion strategy</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.copyCode.handleImports</code></td>
                                        <td>String</td>
                                        <td>merge</td>
                                        <td>Import handling method</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.copyCode.preserveComments</code></td>
                                        <td>Boolean</td>
                                        <td>true</td>
                                        <td>Preserve code comments</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.saveAll.showNotification</code></td>
                                        <td>Boolean</td>
                                        <td>true</td>
                                        <td>Show save notifications</td>
                                    </tr>
                                    <tr>
                                        <td><code>additionalContextMenus.saveAll.skipReadOnly</code></td>
                                        <td>Boolean</td>
                                        <td>true</td>
                                        <td>Skip read-only files</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-terminal"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Command Palette Integration</h3>
                        <p class="feature-desc">
                            Professional command palette integration with categorized commands for complete 
                            extension control and troubleshooting capabilities.
                        </p>
                        <div class="command-grid">
                            <div class="command-card">
                                <h4><i class="fas fa-code"></i> Copy Function</h4>
                                <p>Copy function at cursor position with AST detection</p>
                            </div>
                            <div class="command-card">
                                <h4><i class="fas fa-copy"></i> Copy to Existing File</h4>
                                <p>Copy selected code to another file with import handling</p>
                            </div>
                            <div class="command-card">
                                <h4><i class="fas fa-cut"></i> Move to Existing File</h4>
                                <p>Move selected code with automatic cleanup</p>
                            </div>
                            <div class="command-card">
                                <h4><i class="fas fa-save"></i> Save All</h4>
                                <p>Enhanced save all with progress feedback</p>
                            </div>
                            <div class="command-card">
                                <h4><i class="fas fa-play"></i> Additional Context Menus: Enable</h4>
                                <p>Activate the extension for enhanced context menus</p>
                            </div>
                            <div class="command-card">
                                <h4><i class="fas fa-pause"></i> Additional Context Menus: Disable</h4>
                                <p>Temporarily disable context menu enhancements</p>
                            </div>
                            <div class="command-card">
                                <h4><i class="fas fa-bug"></i> Show Output Channel</h4>
                                <p>Open debug logs for troubleshooting</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Architecture Section -->
        <div class="feature-section">
            <div class="feature-header">
                <h2 class="feature-category">Service-Oriented Architecture</h2>
                <p class="feature-category-desc">Modern architectural patterns with separation of concerns for maintainable and scalable code.</p>
            </div>
            
            <div class="architecture-grid">
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-sitemap"></i>
                    </div>
                    <h3 class="arch-title">ExtensionManager</h3>
                    <p class="arch-desc">
                        Central coordinator managing extension lifecycle, event listeners, 
                        and component initialization with proper cleanup and error handling.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-mouse-pointer"></i>
                    </div>
                    <h3 class="arch-title">ContextMenuManager</h3>
                    <p class="arch-desc">
                        Dedicated manager for context menu command registration, 
                        menu interactions, and conditional menu visibility.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <h3 class="arch-title">ProjectDetectionService</h3>
                    <p class="arch-desc">
                        Singleton service for detecting Node.js projects and identifying 
                        frameworks through package.json analysis.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-sliders-h"></i>
                    </div>
                    <h3 class="arch-title">ConfigurationService</h3>
                    <p class="arch-desc">
                        VS Code settings integration with real-time updates, 
                        type-safe configuration access, and change notifications.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3 class="arch-title">FileDiscoveryService</h3>
                    <p class="arch-desc">
                        Service for discovering compatible files in the workspace 
                        for code operations and target file selection.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-save"></i>
                    </div>
                    <h3 class="arch-title">FileSaveService</h3>
                    <p class="arch-desc">
                        Enhanced save operations with progress feedback, 
                        read-only file handling, and workspace management.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-code-branch"></i>
                    </div>
                    <h3 class="arch-title">CodeAnalysisService</h3>
                    <p class="arch-desc">
                        AST-based code parsing and analysis using Babel parser 
                        for function detection and code manipulation.
                    </p>
                </div>
                
                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-terminal"></i>
                    </div>
                    <h3 class="arch-title">TerminalService <span class="version-badge">v1.2.0+</span></h3>
                    <p class="arch-desc">
                        Cross-platform terminal integration service handling terminal type detection,
                        directory resolution, and platform-specific command execution with error handling.
                    </p>
                </div>

                <div class="architecture-card">
                    <div class="arch-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <h3 class="arch-title">Logger</h3>
                    <p class="arch-desc">
                        Centralized logging utility with output channel integration
                        for debugging and troubleshooting support.
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Keyboard Shortcuts Section -->
        <div class="feature-section">
            <div class="feature-header">
                <h2 class="feature-category">Keyboard Shortcuts & User Interface</h2>
                <p class="feature-category-desc">Optional keyboard shortcuts and enhanced visual feedback for improved productivity.</p>
            </div>
            
            <div class="feature-list">
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-keyboard"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Complete Keybinding System</h3>
                        <p class="feature-desc">
                            Optional keyboard shortcuts for all core operations with built-in conflict detection and safety features.
                            Keybindings are disabled by default to prevent conflicts with existing shortcuts.
                        </p>
                        <ul class="feature-benefits">
                            <li><strong>Copy Function:</strong> <code>Ctrl+Alt+Shift+F</code> (Windows/Linux) / <code>Cmd+Alt+Shift+F</code> (macOS)</li>
                            <li><strong>Copy Code to File:</strong> <code>Ctrl+Alt+Shift+C</code> (Windows/Linux) / <code>Cmd+Alt+Shift+C</code> (macOS)</li>
                            <li><strong>Move Code to File:</strong> <code>Ctrl+Alt+Shift+M</code> (Windows/Linux) / <code>Cmd+Alt+Shift+M</code> (macOS)</li>
                            <li><strong>Save All Files:</strong> <code>Ctrl+Alt+Shift+A</code> (Windows/Linux) / <code>Cmd+Alt+Shift+A</code> (macOS)</li>
                            <li>Built-in conflict detection and management commands</li>
                            <li>Context-aware activation (only when appropriate)</li>
                        </ul>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Status Bar Integration</h3>
                        <p class="feature-desc">
                            Real-time visual feedback in VS Code status bar showing extension state, project detection, 
                            and framework-specific indicators with interactive debug functionality.
                        </p>
                        <ul class="feature-benefits">
                            <li><strong>Framework Icons:</strong> ⚛️ React, 🅰️ Angular, 🚂 Express, ▲ Next.js</li>
                            <li><strong>Extension State:</strong> Enabled/disabled status with color coding</li>
                            <li><strong>Project Detection:</strong> Node.js project recognition feedback</li>
                            <li><strong>Interactive Debug:</strong> Click to inspect extension context variables</li>
                            <li><strong>Multi-Framework Support:</strong> Shows all detected frameworks</li>
                            <li><strong>Real-time Updates:</strong> Automatically updates on configuration changes</li>
                        </ul>
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <div class="feature-content">
                        <h3 class="feature-name">Safety & Management Features</h3>
                        <p class="feature-desc">
                            Comprehensive safety features and management commands to ensure smooth integration 
                            with existing VS Code configurations and workflows.
                        </p>
                        <ul class="feature-benefits">
                            <li><strong>Conflict Detection:</strong> Check for keybinding conflicts before enabling</li>
                            <li><strong>Debug Commands:</strong> Inspect extension state and context variables</li>
                            <li><strong>Refresh Commands:</strong> Reload project detection without restart</li>
                            <li><strong>Management Commands:</strong> Enable/disable features through command palette</li>
                            <li><strong>Safe Defaults:</strong> Conservative settings to prevent configuration conflicts</li>
                            <li><strong>Gradual Adoption:</strong> Enable features incrementally as needed</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Performance Section -->
        <div class="feature-section">
            <div class="feature-header">
                <h2 class="feature-category">Performance & Quality</h2>
                <p class="feature-category-desc">Optimized performance with professional development practices for VS Code extensions.</p>
            </div>
            
            <div class="performance-metrics">
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h3 class="metric-title">Optimized Build</h3>
                    <ul class="metric-list">
                        <li>Webpack bundling for production</li>
                        <li>Tree-shaking for minimal bundle size</li>
                        <li>Terser optimization for compressed output</li>
                        <li>Source maps for debugging support</li>
                    </ul>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3 class="metric-title">Code Quality</h3>
                    <ul class="metric-list">
                        <li>TypeScript strict mode compliance</li>
                        <li>ESLint with TypeScript and stylistic rules</li>
                        <li>Prettier code formatting</li>
                        <li>Comprehensive type definitions</li>
                    </ul>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-vial"></i>
                    </div>
                    <h3 class="metric-title">Testing</h3>
                    <ul class="metric-list">
                        <li>Mocha test framework integration</li>
                        <li>@vscode/test-electron for real VS Code testing</li>
                        <li>Comprehensive test fixtures for different project types</li>
                        <li>CI/CD automated testing pipeline</li>
                    </ul>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-heartbeat"></i>
                    </div>
                    <h3 class="metric-title">Reliability</h3>
                    <ul class="metric-list">
                        <li>Structured logging with output channel</li>
                        <li>Graceful error handling and recovery</li>
                        <li>Resource cleanup and disposal patterns</li>
                        <li>AST parsing performance optimization</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Screenshots Section -->
<section class="screenshots">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">See It In Action</h2>
            <p class="section-description">
                Visual examples of Additional Context Menus integration in your VS Code workspace.
            </p>
        </div>
        
        <div class="screenshot-grid">
            <div class="screenshot-item">
                <div class="screenshot-placeholder">
                    <i class="fas fa-mouse-pointer"></i>
                    <h3>Context Menu Integration</h3>
                    <p>Enhanced right-click menus with intelligent code operations</p>
                    <small>Screenshots coming soon</small>
                </div>
            </div>
            
            <div class="screenshot-item">
                <div class="screenshot-placeholder">
                    <i class="fas fa-code"></i>
                    <h3>Function Detection</h3>
                    <p>AST-based function detection and copying in action</p>
                    <small>Screenshots coming soon</small>
                </div>
            </div>
            
            <div class="screenshot-item">
                <div class="screenshot-placeholder">
                    <i class="fas fa-copy"></i>
                    <h3>Code Operations</h3>
                    <p>Copy and move operations with import handling</p>
                    <small>Screenshots coming soon</small>
                </div>
            </div>
            
            <div class="screenshot-item">
                <div class="screenshot-placeholder">
                    <i class="fas fa-project-diagram"></i>
                    <h3>Framework Detection</h3>
                    <p>Automatic project detection for React, Angular, Express, Next.js</p>
                    <small>Screenshots coming soon</small>
                </div>
            </div>
            
            <div class="screenshot-item">
                <div class="screenshot-placeholder">
                    <i class="fas fa-keyboard"></i>
                    <h3>Keyboard Shortcuts</h3>
                    <p>Optional keybindings with conflict detection and management</p>
                    <small>Screenshots coming soon</small>
                </div>
            </div>
            
            <div class="screenshot-item">
                <div class="screenshot-placeholder">
                    <i class="fas fa-chart-bar"></i>
                    <h3>Status Bar Integration</h3>
                    <p>Visual project status with framework-specific indicators</p>
                    <small>Screenshots coming soon</small>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- CTA Section -->
<section class="cta">
    <div class="container">
        <div class="cta-content">
            <h2 class="cta-title">Experience Intelligent Code Operations</h2>
            <p class="cta-description">
                Install Additional Context Menus today and enhance your development workflow with smart code operations for modern frameworks.
            </p>
            <div class="cta-buttons">
                <a href="{{ site.extension.marketplace_url }}" class="btn btn-primary btn-large" target="_blank">
                    <i class="fas fa-download"></i>
                    Install from Marketplace
                </a>
                <a href="{{ site.baseurl }}/installation" class="btn btn-secondary btn-large">
                    <i class="fas fa-book"></i>
                    Installation Guide
                </a>
                <a href="{{ site.baseurl }}/code-operations" class="btn btn-tertiary btn-large">
                    <i class="fas fa-copy"></i>
                    See Code Operations
                </a>
            </div>
        </div>
    </div>
</section>
