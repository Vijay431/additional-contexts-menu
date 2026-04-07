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
                <p class="feature-category-desc">All 11 commands are grouped under a single <strong>Additional Context Menus ▶</strong> submenu in the right-click menu — available in any file when the extension is enabled. Commands are organised into four groups: Function Operations, Selection Operations, Workspace, and Generation. Context-sensitive commands (e.g. Copy Function) only appear when their conditions are met.</p>
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
                            <li>Supports async/await functions</li>
                            <li>Recognizes React functional components and custom hooks</li>
                            <li>Handles TypeScript type annotations and generics</li>
                            <li>Preserves JSDoc comments</li>
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
                        <h3 class="feature-name">Copy Selection to File</h3>
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
                        <h3 class="feature-name">Move Selection to File</h3>
                        <p class="feature-desc">
                            Move code between files with automatic cleanup of the source file, including removal of 
                            unused imports and proper handling of dependencies.
                        </p>
                        <ul class="feature-benefits">
                            <li>Removes code from source file after successful move</li>
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
                        <h3 class="feature-name">Cross-Platform Terminal Integration</h3>
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
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/copy-function.gif"
                     alt="Copy Function"
                     class="screenshot-image">
                <h3>Copy Function</h3>
                <p>AST-based function detection and copying in action</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/copy-function-to-file.gif"
                     alt="Copy Function to File"
                     class="screenshot-image">
                <h3>Copy Function to File</h3>
                <p>Copy function at cursor to a target file with smart insertion</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/move-function-to-file.gif"
                     alt="Move Function to File"
                     class="screenshot-image">
                <h3>Move Function to File</h3>
                <p>Move function to a target file and remove from source</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/copy-selection-to-file.gif"
                     alt="Copy Selection to File"
                     class="screenshot-image">
                <h3>Copy Selection to File</h3>
                <p>Copy any selected code block with import handling</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/move-selection-to-file.gif"
                     alt="Move Selection to File"
                     class="screenshot-image">
                <h3>Move Selection to File</h3>
                <p>Move selected code to another file with automatic cleanup</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/save-all.gif"
                     alt="Save All"
                     class="screenshot-image">
                <h3>Save All</h3>
                <p>Enhanced bulk save with progress feedback and error handling</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/open-in-terminal.gif"
                     alt="Open in Terminal"
                     class="screenshot-image">
                <h3>Open in Terminal</h3>
                <p>Cross-platform terminal access from context menu</p>
            </div>

            <div class="screenshot-item">
                <img src="https://raw.githubusercontent.com/Vijay431/additional-contexts-menu/main/docs/images/screenshots/rename-file-convention.gif"
                     alt="Rename File to Convention"
                     class="screenshot-image">
                <h3>Rename File to Convention</h3>
                <p>Rename files and folders to kebab-case, camelCase, or PascalCase</p>
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
