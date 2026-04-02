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
                            Uses AST-based parsing via TypeScript Compiler API to accurately detect functions, arrow functions, methods,
                            and React components. Handles nested functions and provides millisecond response times with no false positives.
                        </p>
                        <ul class="feature-benefits">
                            <li>Detects function declarations, expressions, and arrow functions</li>
                            <li>Supports async/await and generator functions</li>
                            <li>Recognizes React functional and class components</li>
                            <li>Handles TypeScript type annotations and generics</li>
                            <li>Preserves JSDoc comments and decorators</li>
                            <li>Nested function support (returns inner-most function)</li>
                            <li>No false positives in comments or strings</li>
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

</section>

<!-- New Services Documentation Section (v1.3.0+) removed - Services do not exist in codebase -->

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
                <img src="{{ site.baseurl }}/assets/images/screenshots/context-menu.png"
                     alt="Context Menu Integration"
                     class="screenshot-image">
                <h3>Context Menu Integration</h3>
                <p>Enhanced right-click menus with intelligent code operations</p>
            </div>

            <div class="screenshot-item">
                <img src="{{ site.baseurl }}/assets/images/screenshots/copy-function.png"
                     alt="Function Detection"
                     class="screenshot-image">
                <h3>Function Detection</h3>
                <p>AST-based function detection and copying in action</p>
            </div>

            <div class="screenshot-item">
                <img src="{{ site.baseurl }}/assets/images/screenshots/copy-to-file.png"
                     alt="Code Operations"
                     class="screenshot-image">
                <h3>Code Operations</h3>
                <p>Copy and move operations with import handling</p>
            </div>

            <div class="screenshot-item">
                <img src="{{ site.baseurl }}/assets/images/screenshots/enum-generator.png"
                     alt="Code Generation"
                     class="screenshot-image">
                <h3>Code Generation</h3>
                <p>Generate enums, env files, and cron expressions</p>
            </div>

            <div class="screenshot-item">
                <img src="{{ site.baseurl }}/assets/images/screenshots/terminal-integration.png"
                     alt="Terminal Integration"
                     class="screenshot-image">
                <h3>Terminal Integration</h3>
                <p>Cross-platform terminal access from context menu</p>
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
