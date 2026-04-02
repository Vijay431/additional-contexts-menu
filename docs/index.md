---
layout: default
title: 'Smart Code Operations for VS Code'
description: 'Enhanced right-click context menus for Node.js development with intelligent code operations for React, Angular, Express, Next.js, TypeScript, and JavaScript projects.'
---

<!-- Hero Section -->
<section class="hero">
    <div class="container">
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">
                    <span class="hero-accent">Additional Context Menus</span>
                    <br>Smart Code Operations for VS Code
                </h1>
                <p class="hero-description">
                    Enhanced right-click context menus with intelligent code operations for React, Angular, Express, and Next.js.
                    Features smart function detection, intelligent import handling, cross-platform terminal integration (v1.2.0+), and ultra-fast esbuild compilation.
                </p>
                <div class="hero-buttons">
                    <a href="{{ site.extension.marketplace_url }}" class="btn btn-primary" target="_blank">
                        <i class="fas fa-download"></i>
                        Install from Marketplace
                    </a>
                    <a href="{{ site.extension.github_url }}" class="btn btn-secondary" target="_blank">
                        <i class="fab fa-github"></i>
                        View on GitHub
                    </a>
                </div>
            <div class="hero-stats">
                <div class="stat">
                    <span class="stat-number">{{ site.extension.version }}</span>
                    <span class="stat-label">Current Version</span>
                </div>
                <div class="stat">
                    <span class="stat-number">60KB</span>
                    <span class="stat-label">Core Bundle</span>
                </div>
                <div class="stat">
                    <span class="stat-number">26KB</span>
                    <span class="stat-label">Lazy Services</span>
                </div>
            </div>
            </div>
            <div class="hero-image">
                <div class="hero-demo">
                    <img src="{{ site.baseurl }}/assets/images/screenshots/context-menu.png"
                         alt="Additional Context Menus - Context Menu Integration"
                         class="hero-screenshot">
                    <p class="hero-caption">Intelligent context menus for Node.js development</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Features Section -->
<section class="features">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Why Choose Additional Context Menus?</h2>
            <p class="section-description">
                Intelligent code operations with AST-based analysis and framework-specific enhancements for modern web development.
            </p>
        </div>
        
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-code"></i>
                </div>
                <h3 class="feature-title">AST-Based Function Detection</h3>
                <p class="feature-description">
                    Accurately detects functions, arrow functions, methods, React components, and hooks using TypeScript's Compiler API. Handles nested functions and complex patterns without false positives from comments or strings.
                </p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-copy"></i>
                </div>
                <h3 class="feature-title">Smart Code Copy/Move</h3>
                <p class="feature-description">
                    Copy or move code between files with intelligent import handling, conflict resolution, and smart insertion points.
                </p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 class="feature-title">Framework Intelligence</h3>
                <p class="feature-description">
                    Automatic project detection for React, Angular, Express, and Next.js with framework-specific context menu enhancements.
                </p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-random"></i>
                </div>
                <h3 class="feature-title">Import Conflict Resolution</h3>
                <p class="feature-description">
                    Smart import statement handling with merge, duplicate, or skip options to prevent conflicts when copying code.
                </p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-save"></i>
                </div>
                <h3 class="feature-title">Enhanced Save All</h3>
                <p class="feature-description">
                    Improved Save All functionality with progress feedback, read-only file handling, and notification options.
                </p>
            </div>

            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-terminal"></i>
                </div>
                <h3 class="feature-title">Cross-Platform Terminal Integration <span class="version-badge">v1.2.0</span></h3>
                <p class="feature-description">
                    Right-click "Open in Terminal" with intelligent platform detection. Supports Windows, macOS, and Linux with configurable terminal types and directory behaviors.
                </p>
            </div>

            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-bolt"></i>
                </div>
                <h3 class="feature-title">Lightning Fast Performance</h3>
                <p class="feature-description">
                    esbuild-powered compilation delivers 20x faster builds (~1s), optimized bundles (60KB core + 26KB lazy), and instant development feedback.
                </p>
            </div>

            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-rocket"></i>
                </div>
                <h3 class="feature-title">Optimized Bundle <span class="version-badge">v2.0</span></h3>
                <p class="feature-description">
                    60KB core bundle with lazy-loaded generator services. Essential features load instantly, rarely-used tools load on demand.
                </p>
            </div>

            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h3 class="feature-title">Enterprise-Grade Reliability</h3>
                <p class="feature-description">
                    Production-ready reliability with robust error handling for edge cases, stress scenarios, and extreme conditions.
                </p>
            </div>

            <div class="feature-card">
                <div class="feature-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="feature-title">Quality Assurance</h3>
                <p class="feature-description">
                    Rigorous code quality standards covering error boundaries, performance, configuration edge cases, and complex file system scenarios for bulletproof operation.
                </p>
            </div>
        </div>
    </div>

</section>

<!-- Framework Support Section -->
<section class="frameworks">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Supported Frameworks</h2>
            <p class="section-description">
                Automatically detects and enhances development for popular Node.js frameworks.
            </p>
        </div>
        
        <div class="framework-grid">
            <div class="framework-card">
                <div class="framework-icon">
                    <i class="fab fa-react"></i>
                </div>
                <h3>React</h3>
                <p>Component-based development with JSX support and intelligent component operations.</p>
            </div>
            
            <div class="framework-card">
                <div class="framework-icon">
                    <i class="fas fa-atom"></i>
                </div>
                <h3>Angular</h3>
                <p>Service and component management with TypeScript-first development experience.</p>
            </div>
            
            <div class="framework-card">
                <div class="framework-icon">
                    <i class="fas fa-server"></i>
                </div>
                <h3>Express</h3>
                <p>Server-side routing and middleware with Node.js backend development support.</p>
            </div>
            
            <div class="framework-card">
                <div class="framework-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <h3>Next.js</h3>
                <p>Full-stack React framework with both client and server-side development features.</p>
            </div>
        </div>
    </div>
</section>

<!-- Quick Start Section -->
<section class="quick-start">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Get Started in Minutes</h2>
            <p class="section-description">
                Install Additional Context Menus and start enhancing your code operations immediately.
            </p>
        </div>
        
        <div class="quick-start-steps">
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h3>Install Extension</h3>
                    <p>Search for "Additional Context Menus" in VS Code Extensions or install directly from the marketplace.</p>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h3>Open Node.js Project</h3>
                    <p>Open any React, Angular, Express, or Next.js project. The extension automatically detects your framework.</p>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h3>Right-Click & Enhance</h3>
                    <p>Right-click in TypeScript/JavaScript files to access enhanced context menus with smart code operations.</p>
                </div>
            </div>
        </div>
        
        <div class="quick-start-demo">
            <div class="demo-code">
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-title">Right-click for enhanced menus</span>
                        <span class="code-language">TypeScript</span>
                    </div>
                    <div class="code-content">
                        <div class="code-line">
                            <span class="code-keyword">function</span> 
                            <span class="code-function">getUserData</span>
                            <span class="code-punctuation">(</span>
                            <span class="code-parameter">id: string</span>
                            <span class="code-punctuation">) {</span>
                        </div>
                        <div class="code-line code-indent">
                            <span class="code-comment">// Right-click here for Copy Function</span>
                        </div>
                        <div class="code-line code-indent">
                            <span class="code-keyword">return</span> 
                            <span class="code-variable">database</span>
                            <span class="code-punctuation">.</span>
                            <span class="code-method">getUser</span>
                            <span class="code-punctuation">(</span>
                            <span class="code-variable">id</span>
                            <span class="code-punctuation">);</span>
                        </div>
                        <div class="code-line">
                            <span class="code-punctuation">}</span>
                        </div>
                    </div>
                 </div>
             </div>
        </div>
    </div>
</section>

<!-- Services Documentation Section -->
<section class="services-docs">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Services Documentation</h2>
            <p class="section-description">
                Comprehensive documentation for all 11 services with API references, examples, and best practices.
            </p>
        </div>
        
        <div class="services-grid">
            <!-- Code Analysis -->
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-code"></i>
                </div>
                <h3 class="service-name">Code Analysis Service</h3>
                <p class="service-desc">Function detection and code parsing</p>
                <a href="/services/codeAnalysisService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3 class="service-name">File Discovery Service</h3>
                <p class="service-desc">Workspace file scanning</p>
                <a href="/services/fileDiscoveryService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            
            <!-- Configuration -->
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-cog"></i>
                </div>
                <h3 class="service-name">Configuration Service</h3>
                <p class="service-desc">Extension settings management</p>
                <a href="/services/configurationService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 class="service-name">Project Detection Service</h3>
                <p class="service-desc">Framework detection</p>
                <a href="/services/projectDetectionService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            
            <!-- File Operations -->
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-save"></i>
                </div>
                <h3 class="service-name">File Save Service</h3>
                <p class="service-desc">Enhanced save operations</p>
                <a href="/services/fileSaveService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-font"></i>
                </div>
                <h3 class="service-name">File Naming Convention</h3>
                <p class="service-desc">File naming enforcement</p>
                <a href="/services/fileNamingConventionService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <!-- Code Generation -->
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <h3 class="service-name">Cron Timer Generator</h3>
                <p class="service-desc">Cron expression generation</p>
                <a href="/services/cronJobTimerGeneratorService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-list-ol"></i>
                </div>
                <h3 class="service-name">Enum Generator</h3>
                <p class="service-desc">Union type to enum</p>
                <a href="/services/enumGeneratorService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <h3 class="service-name">Env File Generator</h3>
                <p class="service-desc">.env file creation</p>
                <a href="/services/envFileGeneratorService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <!-- Project Operations -->
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-terminal"></i>
                </div>
                <h3 class="service-name">Terminal Service</h3>
                <p class="service-desc">Cross-platform terminal</p>
                <a href="/services/terminalService.html" class="service-link">
                    View Documentation <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>

        <div class="services-cta">
            <h3>Need More Help?</h3>
            <p>Explore detailed API documentation and examples for each service.</p>
            <a href="/services/" class="btn btn-primary">
                <i class="fas fa-book"></i>
                View All Services
            </a>
        </div>
    </div>

</section>

<!-- CTA Section -->
<section class="cta">
    <div class="container">
        <div class="cta-content">
            <h2 class="cta-title">Ready to Supercharge Your Code Operations?</h2>
            <p class="cta-description">
                Join developers who trust Additional Context Menus for reliable, production-ready code operations built for enterprise development.
            </p>
            <div class="cta-buttons">
                <a href="{{ site.extension.marketplace_url }}" class="btn btn-primary btn-large" target="_blank">
                    <i class="fas fa-download"></i>
                    Install Now - Free
                </a>
                <a href="{{ site.baseurl }}/features" class="btn btn-secondary btn-large">
                    <i class="fas fa-code"></i>
                    Explore Features
                </a>
                <a href="{{ site.baseurl }}/code-operations" class="btn btn-tertiary btn-large">
                    <i class="fas fa-copy"></i>
                    See Code Operations
                </a>
            </div>
        </div>
    </div>
</section>
