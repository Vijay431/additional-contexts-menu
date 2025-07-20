---
layout: default
title: 'Technical Documentation'
description: 'Comprehensive technical documentation for File Insights VS Code extension including architecture, API reference, and development guidelines.'
---

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <h1 class="page-title">Technical Documentation</h1>
        <p class="page-description">
            Comprehensive technical documentation for developers, including architecture details, API reference, and development guidelines.
        </p>
    </div>
</section>

<!-- Architecture Overview -->
<section class="architecture-overview">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Architecture Overview</h2>
            <p class="section-description">
                File Insights follows a modern, enterprise-grade architecture with clear separation of concerns.
            </p>
        </div>
        
        <div class="architecture-diagram">
            <div class="arch-layer">
                <h3 class="layer-title">Extension Layer</h3>
                <div class="layer-components">
                    <div class="component">
                        <h4>extension.ts</h4>
                        <p>Entry point - minimal, delegates to ExtensionManager</p>
                    </div>
                </div>
            </div>
            
            <div class="arch-layer">
                <h3 class="layer-title">Manager Layer</h3>
                <div class="layer-components">
                    <div class="component">
                        <h4>ExtensionManager</h4>
                        <p>Main coordinator, handles lifecycle and events</p>
                    </div>
                    <div class="component">
                        <h4>StatusBarManager</h4>
                        <p>Status bar UI management</p>
                    </div>
                </div>
            </div>
            
            <div class="arch-layer">
                <h3 class="layer-title">Service Layer</h3>
                <div class="layer-components">
                    <div class="component">
                        <h4>ConfigurationService</h4>
                        <p>VS Code settings integration</p>
                    </div>
                    <div class="component">
                        <h4>FileService</h4>
                        <p>File system operations</p>
                    </div>
                </div>
            </div>
            
            <div class="arch-layer">
                <h3 class="layer-title">Utility Layer</h3>
                <div class="layer-components">
                    <div class="component">
                        <h4>Formatter</h4>
                        <p>Size formatting logic</p>
                    </div>
                    <div class="component">
                        <h4>Logger</h4>
                        <p>Structured logging</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Component Details -->
<section class="component-details">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Component Details</h2>
            <p class="section-description">
                Detailed documentation for each architectural component.
            </p>
        </div>
        
        <div class="component-grid">
            <!-- ExtensionManager -->
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-name">ExtensionManager</h3>
                    <span class="component-path">src/managers/extensionManager.ts</span>
                </div>
                <div class="component-content">
                    <p class="component-description">
                        Central coordinator managing the extension lifecycle, event listener registration, 
                        and command handling with performance optimization.
                    </p>
                    
                    <h4>Key Responsibilities:</h4>
                    <ul class="responsibility-list">
                        <li>Extension activation and deactivation</li>
                        <li>Event listener registration and cleanup</li>
                        <li>Command registration and handling</li>
                        <li>Performance optimization with debounced updates</li>
                        <li>Integration with other managers and services</li>
                    </ul>
                    
                    <h4>Public Methods:</h4>
                    <div class="method-list">
                        <div class="method">
                            <code>activate(context: ExtensionContext): void</code>
                            <p>Initializes the extension and registers all components</p>
                        </div>
                        <div class="method">
                            <code>deactivate(): void</code>
                            <p>Cleans up resources and disposes of all components</p>
                        </div>
                        <div class="method">
                            <code>refresh(): void</code>
                            <p>Manually refreshes file size information</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- StatusBarManager -->
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-name">StatusBarManager</h3>
                    <span class="component-path">src/managers/statusBarManager.ts</span>
                </div>
                <div class="component-content">
                    <p class="component-description">
                        Dedicated status bar item management with configuration-aware positioning, 
                        tooltip generation, and error state handling.
                    </p>
                    
                    <h4>Key Responsibilities:</h4>
                    <ul class="responsibility-list">
                        <li>Status bar item creation and management</li>
                        <li>Dynamic positioning based on configuration</li>
                        <li>Tooltip generation with detailed information</li>
                        <li>Icon and text display management</li>
                        <li>Error state visualization</li>
                    </ul>
                    
                    <h4>Public Methods:</h4>
                    <div class="method-list">
                        <div class="method">
                            <code>updateDisplay(fileSize: number, filePath: string): void</code>
                            <p>Updates the status bar with current file information</p>
                        </div>
                        <div class="method">
                            <code>show(): void</code>
                            <p>Shows the status bar item</p>
                        </div>
                        <div class="method">
                            <code>hide(): void</code>
                            <p>Hides the status bar item</p>
                        </div>
                        <div class="method">
                            <code>dispose(): void</code>
                            <p>Disposes of the status bar item</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ConfigurationService -->
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-name">ConfigurationService</h3>
                    <span class="component-path">src/services/configurationService.ts</span>
                </div>
                <div class="component-content">
                    <p class="component-description">
                        VS Code settings integration with real-time configuration updates, 
                        type-safe access, and change notification system.
                    </p>
                    
                    <h4>Key Responsibilities:</h4>
                    <ul class="responsibility-list">
                        <li>VS Code settings integration</li>
                        <li>Real-time configuration updates</li>
                        <li>Type-safe configuration access</li>
                        <li>Configuration change notifications</li>
                        <li>Default value management</li>
                    </ul>
                    
                    <h4>Configuration Properties:</h4>
                    <div class="config-properties">
                        <div class="property">
                            <code>enabled: boolean</code>
                            <p>Extension enable/disable state</p>
                        </div>
                        <div class="property">
                            <code>displayFormat: DisplayFormat</code>
                            <p>Size display format (auto, bytes, kb, mb)</p>
                        </div>
                        <div class="property">
                            <code>statusBarPosition: StatusBarPosition</code>
                            <p>Status bar positioning (left, right)</p>
                        </div>
                        <div class="property">
                            <code>showTooltip: boolean</code>
                            <p>Tooltip display control</p>
                        </div>
                        <div class="property">
                            <code>refreshInterval: number</code>
                            <p>Update frequency in milliseconds</p>
                        </div>
                        <div class="property">
                            <code>maxFileSize: number</code>
                            <p>Maximum analyzable file size</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- FileService -->
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-name">FileService</h3>
                    <span class="component-path">src/services/fileService.ts</span>
                </div>
                <div class="component-content">
                    <p class="component-description">
                        File system operations with comprehensive error handling, 
                        file validation, and async processing capabilities.
                    </p>
                    
                    <h4>Key Responsibilities:</h4>
                    <ul class="responsibility-list">
                        <li>File system operations with error handling</li>
                        <li>File validation (scheme, type, existence)</li>
                        <li>Async file stats retrieval</li>
                        <li>Size limit enforcement</li>
                        <li>Path normalization and validation</li>
                    </ul>
                    
                    <h4>Public Methods:</h4>
                    <div class="method-list">
                        <div class="method">
                            <code>getFileSize(filePath: string): Promise&lt;number | null&gt;</code>
                            <p>Retrieves file size with error handling</p>
                        </div>
                        <div class="method">
                            <code>isValidFile(uri: vscode.Uri): boolean</code>
                            <p>Validates file URI and scheme</p>
                        </div>
                        <div class="method">
                            <code>getFileStats(filePath: string): Promise&lt;FileStats | null&gt;</code>
                            <p>Gets comprehensive file statistics</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- API Reference -->
<section class="api-reference">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">API Reference</h2>
            <p class="section-description">
                Complete API documentation for types, interfaces, and enums.
            </p>
        </div>
        
        <div class="api-sections">
            <!-- Types -->
            <div class="api-section">
                <h3 class="api-section-title">Types & Interfaces</h3>
                
                <div class="api-item">
                    <h4 class="api-item-title">ExtensionConfig</h4>
                    <div class="api-code">
                        <pre><code>interface ExtensionConfig {
  enabled: boolean;
  displayFormat: DisplayFormat;
  statusBarPosition: StatusBarPosition;
  showTooltip: boolean;
  refreshInterval: number;
  maxFileSize: number;
}</code></pre>
                    </div>
                    <p class="api-description">Main configuration interface for the extension</p>
                </div>
                
                <div class="api-item">
                    <h4 class="api-item-title">FileStats</h4>
                    <div class="api-code">
                        <pre><code>interface FileStats {
  size: number;
  path: string;
  lastModified: Date;
  isFile: boolean;
  isDirectory: boolean;
}</code></pre>
                    </div>
                    <p class="api-description">File statistics information</p>
                </div>
                
                <div class="api-item">
                    <h4 class="api-item-title">LogLevel</h4>
                    <div class="api-code">
                        <pre><code>enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}</code></pre>
                    </div>
                    <p class="api-description">Logging levels for structured logging</p>
                </div>
                
                <div class="api-item">
                    <h4 class="api-item-title">DisplayFormat</h4>
                    <div class="api-code">
                        <pre><code>enum DisplayFormat {
  AUTO = 'auto',
  BYTES = 'bytes',
  KB = 'kb',
  MB = 'mb'
}</code></pre>
                    </div>
                    <p class="api-description">File size display format options</p>
                </div>
                
                <div class="api-item">
                    <h4 class="api-item-title">StatusBarPosition</h4>
                    <div class="api-code">
                        <pre><code>enum StatusBarPosition {
  LEFT = 'left',
  RIGHT = 'right'
}</code></pre>
                    </div>
                    <p class="api-description">Status bar positioning options</p>
                </div>
            </div>
            
            <!-- Commands -->
            <div class="api-section">
                <h3 class="api-section-title">Commands</h3>
                
                <div class="command-ref">
                    <div class="command-item">
                        <h4 class="command-name">fileInsights.enable</h4>
                        <p class="command-desc">Enables the File Insights extension</p>
                        <div class="command-details">
                            <p><strong>Category:</strong> File Insights</p>
                            <p><strong>Title:</strong> File Insights: Enable</p>
                        </div>
                    </div>
                    
                    <div class="command-item">
                        <h4 class="command-name">fileInsights.disable</h4>
                        <p class="command-desc">Disables the File Insights extension</p>
                        <div class="command-details">
                            <p><strong>Category:</strong> File Insights</p>
                            <p><strong>Title:</strong> File Insights: Disable</p>
                        </div>
                    </div>
                    
                    <div class="command-item">
                        <h4 class="command-name">fileInsights.refresh</h4>
                        <p class="command-desc">Manually refreshes file size information</p>
                        <div class="command-details">
                            <p><strong>Category:</strong> File Insights</p>
                            <p><strong>Title:</strong> File Insights: Refresh</p>
                        </div>
                    </div>
                    
                    <div class="command-item">
                        <h4 class="command-name">fileInsights.showDetails</h4>
                        <p class="command-desc">Shows detailed file information dialog</p>
                        <div class="command-details">
                            <p><strong>Category:</strong> File Insights</p>
                            <p><strong>Title:</strong> File Insights: Show Details</p>
                        </div>
                    </div>
                    
                    <div class="command-item">
                        <h4 class="command-name">fileInsights.showOutputChannel</h4>
                        <p class="command-desc">Opens the debug output channel</p>
                        <div class="command-details">
                            <p><strong>Category:</strong> File Insights</p>
                            <p><strong>Title:</strong> File Insights: Show Output Channel</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Development Guide -->
<section class="development-guide">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Development Guide</h2>
            <p class="section-description">
                Guidelines for contributing to and extending File Insights.
            </p>
        </div>
        
        <div class="dev-sections">
            <div class="dev-section">
                <h3 class="dev-section-title">Setup Development Environment</h3>
                
                <div class="dev-steps">
                    <div class="dev-step">
                        <h4>1. Clone Repository</h4>
                        <div class="code-block">
                            <pre><code>git clone https://github.com/Vijay431/file-insights.git
cd file-insights</code></pre>
                        </div>
                    </div>
                    
                    <div class="dev-step">
                        <h4>2. Install Dependencies</h4>
                        <div class="code-block">
                            <pre><code>npm install</code></pre>
                        </div>
                    </div>
                    
                    <div class="dev-step">
                        <h4>3. Build Extension</h4>
                        <div class="code-block">
                            <pre><code>npm run compile</code></pre>
                        </div>
                    </div>
                    
                    <div class="dev-step">
                        <h4>4. Run Tests</h4>
                        <div class="code-block">
                            <pre><code>npm test</code></pre>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="dev-section">
                <h3 class="dev-section-title">Available Commands</h3>
                
                <div class="command-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Command</th>
                                <th>Description</th>
                                <th>Usage</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>npm run compile</code></td>
                                <td>Compile TypeScript files using webpack</td>
                                <td>Development builds</td>
                            </tr>
                            <tr>
                                <td><code>npm run watch</code></td>
                                <td>Watch mode for development</td>
                                <td>Auto-recompilation</td>
                            </tr>
                            <tr>
                                <td><code>npm run package</code></td>
                                <td>Build production bundle</td>
                                <td>Production builds</td>
                            </tr>
                            <tr>
                                <td><code>npm test</code></td>
                                <td>Run VS Code extension tests</td>
                                <td>Testing</td>
                            </tr>
                            <tr>
                                <td><code>npm run lint</code></td>
                                <td>Run ESLint on source files</td>
                                <td>Code quality</td>
                            </tr>
                            <tr>
                                <td><code>npm run format</code></td>
                                <td>Format code using Prettier</td>
                                <td>Code formatting</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="dev-section">
                <h3 class="dev-section-title">Code Standards</h3>
                
                <div class="standards-grid">
                    <div class="standard-card">
                        <h4>TypeScript</h4>
                        <ul>
                            <li>Strict mode enabled</li>
                            <li>ES2022 target</li>
                            <li>No <code>any</code> types</li>
                            <li>Comprehensive type definitions</li>
                        </ul>
                    </div>
                    
                    <div class="standard-card">
                        <h4>Code Quality</h4>
                        <ul>
                            <li>ESLint with TypeScript rules</li>
                            <li>Prettier formatting</li>
                            <li>Comprehensive error handling</li>
                            <li>Structured logging</li>
                        </ul>
                    </div>
                    
                    <div class="standard-card">
                        <h4>Architecture</h4>
                        <ul>
                            <li>Separation of concerns</li>
                            <li>Manager/Service pattern</li>
                            <li>Dependency injection</li>
                            <li>Resource disposal</li>
                        </ul>
                    </div>
                    
                    <div class="standard-card">
                        <h4>Testing</h4>
                        <ul>
                            <li>@vscode/test-electron</li>
                            <li>Real VS Code API testing</li>
                            <li>Comprehensive coverage</li>
                            <li>TDD approach</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Performance Considerations -->
<section class="performance">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Performance Considerations</h2>
            <p class="section-description">
                Key performance optimizations and best practices implemented in File Insights.
            </p>
        </div>
        
        <div class="performance-grid">
            <div class="perf-card">
                <div class="perf-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <h3 class="perf-title">Debounced Updates</h3>
                <p class="perf-description">
                    Intelligent debouncing prevents excessive file system calls during rapid file changes,
                    with configurable intervals (100-5000ms).
                </p>
            </div>
            
            <div class="perf-card">
                <div class="perf-icon">
                    <i class="fas fa-memory"></i>
                </div>
                <h3 class="perf-title">Memory Management</h3>
                <p class="perf-description">
                    Proper resource disposal, event listener cleanup, and memory leak prevention
                    ensure minimal memory footprint.
                </p>
            </div>
            
            <div class="perf-card">
                <div class="perf-icon">
                    <i class="fas fa-compress"></i>
                </div>
                <h3 class="perf-title">Optimized Bundle</h3>
                <p class="perf-description">
                    Webpack bundling with tree-shaking, compression, and minimal dependencies
                    result in a small extension size.
                </p>
            </div>
            
            <div class="perf-card">
                <div class="perf-icon">
                    <i class="fas fa-filter"></i>
                </div>
                <h3 class="perf-title">File Filtering</h3>
                <p class="perf-description">
                    Configurable file size limits and scheme validation prevent processing
                    of unsupported or overly large files.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- Contributing -->
<section class="contributing">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Contributing</h2>
            <p class="section-description">
                Help improve File Insights by contributing code, documentation, or feedback.
            </p>
        </div>
        
        <div class="contrib-grid">
            <div class="contrib-card">
                <h3 class="contrib-title">
                    <i class="fas fa-code"></i>
                    Code Contributions
                </h3>
                <p class="contrib-description">
                    Submit bug fixes, new features, or performance improvements via pull requests.
                </p>
                <div class="contrib-steps">
                    <ol>
                        <li>Fork the repository</li>
                        <li>Create a feature branch</li>
                        <li>Make your changes</li>
                        <li>Add tests if applicable</li>
                        <li>Submit a pull request</li>
                    </ol>
                </div>
            </div>
            
            <div class="contrib-card">
                <h3 class="contrib-title">
                    <i class="fas fa-bug"></i>
                    Bug Reports
                </h3>
                <p class="contrib-description">
                    Report bugs or issues to help improve the extension's reliability.
                </p>
                <div class="contrib-steps">
                    <ol>
                        <li>Check existing issues</li>
                        <li>Create detailed bug report</li>
                        <li>Include system information</li>
                        <li>Provide reproduction steps</li>
                        <li>Add relevant screenshots</li>
                    </ol>
                </div>
            </div>
            
            <div class="contrib-card">
                <h3 class="contrib-title">
                    <i class="fas fa-book"></i>
                    Documentation
                </h3>
                <p class="contrib-description">
                    Improve documentation, add examples, or suggest clarifications.
                </p>
                <div class="contrib-steps">
                    <ol>
                        <li>Identify documentation gaps</li>
                        <li>Create improvement proposal</li>
                        <li>Write clear documentation</li>
                        <li>Add practical examples</li>
                        <li>Submit pull request</li>
                    </ol>
                </div>
            </div>
        </div>
        
        <div class="contrib-links">
            <a href="{{ site.extension.github_url }}/issues" class="btn btn-primary" target="_blank">
                <i class="fas fa-bug"></i>
                Report Issue
            </a>
            <a href="{{ site.extension.github_url }}/pulls" class="btn btn-secondary" target="_blank">
                <i class="fas fa-code-branch"></i>
                Submit PR
            </a>
            <a href="{{ site.extension.github_url }}/discussions" class="btn btn-outline" target="_blank">
                <i class="fas fa-comments"></i>
                Join Discussion
            </a>
        </div>
    </div>
</section>
