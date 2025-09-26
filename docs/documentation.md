---
layout: default
title: 'Technical Documentation'
description: 'Comprehensive technical documentation for Additional Context Menus VS Code extension including architecture, API reference, and development guidelines.'
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
                Additional Context Menus follows a modern, service-oriented architecture with clear separation of concerns.
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
                        <p>Main coordinator, handles lifecycle and component initialization</p>
                    </div>
                    <div class="component">
                        <h4>ContextMenuManager</h4>
                        <p>Command registration and menu interactions</p>
                    </div>
                </div>
            </div>

            <div class="arch-layer">
                <h3 class="layer-title">Service Layer (Singleton Pattern)</h3>
                <div class="layer-components">
                    <div class="component">
                        <h4>ProjectDetectionService</h4>
                        <p>Detects Node.js projects and frameworks</p>
                    </div>
                    <div class="component">
                        <h4>ConfigurationService</h4>
                        <p>Manages extension settings and configuration</p>
                    </div>
                    <div class="component">
                        <h4>CodeAnalysisService</h4>
                        <p>Parses and analyzes JavaScript/TypeScript code</p>
                    </div>
                    <div class="component">
                        <h4>TerminalService</h4>
                        <p>Cross-platform terminal integration (v1.2.0+)</p>
                    </div>
                    <div class="component">
                        <h4>FileDiscoveryService</h4>
                        <p>Discovers compatible files for operations</p>
                    </div>
                    <div class="component">
                        <h4>FileSaveService</h4>
                        <p>Handles "Save All" with progress feedback</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Build System -->
<section class="build-system">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Build System</h2>
            <p class="section-description">
                Modern esbuild-based build system with TypeScript-first development workflow.
            </p>
        </div>

        <div class="build-details">
            <div class="build-feature">
                <h3>esbuild Configuration</h3>
                <p>Ultra-fast TypeScript compilation with comprehensive optimization:</p>
                <ul>
                    <li><strong>Build Speed:</strong> ~1 second builds (20x faster than webpack)</li>
                    <li><strong>Bundle Size:</strong> 47.86KB production bundle (95.9% reduction)</li>
                    <li><strong>Configuration:</strong> TypeScript-based esbuild.config.ts</li>
                    <li><strong>Development:</strong> Instant rebuilds with watch mode</li>
                </ul>
            </div>

            <div class="build-feature">
                <h3>TypeScript-First Scripting</h3>
                <p>All build scripts use direct TypeScript execution via tsx:</p>
                <ul>
                    <li><strong>Primary Command:</strong> <code>npm run build</code></li>
                    <li><strong>Watch Mode:</strong> <code>npm run watch</code></li>
                    <li><strong>Production Build:</strong> <code>npm run package</code></li>
                    <li><strong>Script Execution:</strong> tsx for direct TypeScript running</li>
                </ul>
            </div>
        </div>
    </div>
</section>

<!-- Commands API -->
<section class="commands-api">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Commands API</h2>
            <p class="section-description">
                Complete reference for all extension commands and their functionality.
            </p>
        </div>

        <div class="commands-grid">
            <div class="command-category">
                <h3>Main Features</h3>
                <div class="command-list">
                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.copyFunction</h4>
                        <p class="command-desc">Copy function at cursor position with smart detection</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Right-click menu + Command Palette</p>
                            <p><strong>Condition:</strong> TypeScript/JavaScript files in Node.js projects</p>
                        </div>
                    </div>

                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.copyLinesToFile</h4>
                        <p class="command-desc">Copy selected code to another file with import handling</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Right-click menu + Command Palette</p>
                            <p><strong>Condition:</strong> Text selection required</p>
                        </div>
                    </div>

                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.moveLinesToFile</h4>
                        <p class="command-desc">Move selected code to another file (copy + delete)</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Right-click menu + Command Palette</p>
                            <p><strong>Condition:</strong> Text selection required</p>
                        </div>
                    </div>

                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.saveAll</h4>
                        <p class="command-desc">Save all dirty documents with progress feedback</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Right-click menu + Command Palette</p>
                            <p><strong>Condition:</strong> Always available when extension enabled</p>
                        </div>
                    </div>

                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.openInTerminal</h4>
                        <p class="command-desc">Cross-platform terminal integration (v1.2.0+)</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Right-click menu + Command Palette</p>
                            <p><strong>Condition:</strong> Always available when extension enabled</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="command-category">
                <h3>Management Commands</h3>
                <div class="command-list">
                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.enable</h4>
                        <p class="command-desc">Enable the extension</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Command Palette only</p>
                        </div>
                    </div>

                    <div class="command-item">
                        <h4 class="command-name">additionalContextMenus.disable</h4>
                        <p class="command-desc">Disable the extension</p>
                        <div class="command-details">
                            <p><strong>Accessibility:</strong> Command Palette only</p>
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
                Guidelines for contributing to and extending Additional Context Menus.
            </p>
        </div>

        <div class="dev-sections">
            <div class="dev-section">
                <h3>Setup & Build</h3>
                <div class="code-block">
                    <pre><code>git clone https://github.com/Vijay431/additional-contexts-menu.git
cd additional-contexts-menu
npm install
npm run build
npm test</code></pre>
                </div>
            </div>

            <div class="dev-section">
                <h3>Development Commands</h3>
                <ul>
                    <li><code>npm run build</code> - Primary build using esbuild</li>
                    <li><code>npm run watch</code> - Development watch mode</li>
                    <li><code>npm run package</code> - Production build</li>
                    <li><code>npm run lint</code> - ESLint code quality check</li>
                    <li><code>npm test</code> - Run comprehensive test suite</li>
                </ul>
            </div>

            <div class="dev-section">
                <h3>Architecture Principles</h3>
                <ul>
                    <li><strong>Service-Oriented:</strong> Clear separation of concerns with singleton services</li>
                    <li><strong>TypeScript Strict:</strong> Type safety with strict mode compilation</li>
                    <li><strong>Performance-First:</strong> Optimized for large codebases and complex projects</li>
                    <li><strong>Cross-Platform:</strong> Windows, macOS, and Linux compatibility</li>
                </ul>
            </div>
        </div>
    </div>
</section>

<!-- Performance -->
<section class="performance">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Performance Metrics</h2>
            <p class="section-description">
                Key performance optimizations and benchmarks for Additional Context Menus.
            </p>
        </div>

        <div class="performance-stats">
            <div class="perf-stat">
                <h3>Build Performance</h3>
                <ul>
                    <li><strong>Build Time:</strong> ~1 second (20x faster than webpack)</li>
                    <li><strong>Bundle Size:</strong> 47.86KB (95.9% reduction)</li>
                    <li><strong>Development:</strong> Instant rebuilds</li>
                </ul>
            </div>

            <div class="perf-stat">
                <h3>Runtime Performance</h3>
                <ul>
                    <li><strong>Function Detection:</strong> <50ms response time</li>
                    <li><strong>Context Menu Response:</strong> <100ms target</li>
                    <li><strong>Memory Efficient:</strong> Optimized for large codebases</li>
                </ul>
            </div>

            <div class="perf-stat">
                <h3>Quality Metrics</h3>
                <ul>
                    <li><strong>Test Coverage:</strong> 37+ comprehensive tests</li>
                    <li><strong>Success Rate:</strong> 100% (37/37 passing)</li>
                    <li><strong>Code Quality:</strong> ESLint compliant with TypeScript strict mode</li>
                </ul>
            </div>
        </div>
    </div>
</section>