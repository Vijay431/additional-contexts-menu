---
layout: default
title: 'Download File Insights'
description: 'Download File Insights VS Code extension from multiple sources including VS Code Marketplace, GitHub releases, and direct installation options.'
---

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <h1 class="page-title">Download File Insights</h1>
        <p class="page-description">
            Get File Insights for VS Code from your preferred download source.
        </p>
    </div>
</section>

<!-- Download Options -->
<section class="download-options">
    <div class="container">
        <div class="download-grid">
            <!-- VS Code Marketplace -->
            <div class="download-card primary">
                <div class="download-header">
                    <i class="fas fa-store"></i>
                    <h2 class="download-title">VS Code Marketplace</h2>
                    <span class="download-badge">Recommended</span>
                </div>
                <div class="download-content">
                    <p class="download-description">
                        Official marketplace distribution with automatic updates and seamless integration.
                    </p>
                    <div class="download-features">
                        <ul>
                            <li><i class="fas fa-check"></i> Automatic updates</li>
                            <li><i class="fas fa-check"></i> One-click installation</li>
                            <li><i class="fas fa-check"></i> Integrated with VS Code</li>
                            <li><i class="fas fa-check"></i> Verified publisher</li>
                        </ul>
                    </div>
                    <div class="download-stats">
                        <div class="stat">
                            <span class="stat-label">Version</span>
                            <span class="stat-value">{{ site.extension.version }}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Publisher</span>
                            <span class="stat-value">{{ site.extension.publisher }}</span>
                        </div>
                    </div>
                </div>
                <div class="download-actions">
                    <a href="{{ site.extension.marketplace_url }}" class="btn btn-primary btn-large" target="_blank">
                        <i class="fas fa-download"></i>
                        Install from Marketplace
                    </a>
                    <p class="download-note">
                        Opens in VS Code marketplace for direct installation
                    </p>
                </div>
            </div>
            
            <!-- GitHub Releases -->
            <div class="download-card">
                <div class="download-header">
                    <i class="fab fa-github"></i>
                    <h2 class="download-title">GitHub Releases</h2>
                </div>
                <div class="download-content">
                    <p class="download-description">
                        Download VSIX packages directly from GitHub for manual installation or offline use.
                    </p>
                    <div class="download-features">
                        <ul>
                            <li><i class="fas fa-check"></i> Direct VSIX download</li>
                            <li><i class="fas fa-check"></i> All versions available</li>
                            <li><i class="fas fa-check"></i> Offline installation</li>
                            <li><i class="fas fa-check"></i> Release notes included</li>
                        </ul>
                    </div>
                    <div class="download-stats">
                        <div class="stat">
                            <span class="stat-label">Latest</span>
                            <span class="stat-value">{{ site.extension.version }}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">License</span>
                            <span class="stat-value">MIT</span>
                        </div>
                    </div>
                </div>
                <div class="download-actions">
                    <a href="{{ site.extension.github_url }}/releases/latest" class="btn btn-secondary btn-large" target="_blank">
                        <i class="fas fa-download"></i>
                        Download Latest VSIX
                    </a>
                    <p class="download-note">
                        Downloads .vsix file for manual installation
                    </p>
                </div>
            </div>
            
            <!-- Command Line -->
            <div class="download-card">
                <div class="download-header">
                    <i class="fas fa-terminal"></i>
                    <h2 class="download-title">Command Line</h2>
                </div>
                <div class="download-content">
                    <p class="download-description">
                        Install directly from command line using VS Code CLI for automation and scripts.
                    </p>
                    <div class="download-features">
                        <ul>
                            <li><i class="fas fa-check"></i> Scriptable installation</li>
                            <li><i class="fas fa-check"></i> Automated deployment</li>
                            <li><i class="fas fa-check"></i> CI/CD friendly</li>
                            <li><i class="fas fa-check"></i> Batch installation</li>
                        </ul>
                    </div>
                    <div class="code-example">
                        <pre><code>code --install-extension VijayGangatharan.file-insights</code></pre>
                    </div>
                </div>
                <div class="download-actions">
                    <button class="btn btn-outline btn-large" onclick="copyToClipboard('code --install-extension VijayGangatharan.file-insights')">
                        <i class="fas fa-copy"></i>
                        Copy Command
                    </button>
                    <p class="download-note">
                        Requires VS Code CLI to be available in PATH
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Installation Instructions -->
<section class="installation-quick">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Quick Installation</h2>
            <p class="section-description">
                Choose your preferred installation method and get started in minutes.
            </p>
        </div>
        
        <div class="installation-tabs">
            <div class="tab-buttons">
                <button class="tab-button active" data-tab="marketplace">Marketplace</button>
                <button class="tab-button" data-tab="manual">Manual</button>
                <button class="tab-button" data-tab="cli">CLI</button>
            </div>
            
            <div class="tab-content">
                <div class="tab-panel active" id="marketplace">
                    <div class="install-steps">
                        <div class="step">
                            <span class="step-number">1</span>
                            <div class="step-content">
                                <h3>Open VS Code</h3>
                                <p>Launch Visual Studio Code on your system</p>
                            </div>
                        </div>
                        <div class="step">
                            <span class="step-number">2</span>
                            <div class="step-content">
                                <h3>Open Extensions</h3>
                                <p>Press <kbd>Ctrl+Shift+X</kbd> or click the Extensions icon</p>
                            </div>
                        </div>
                        <div class="step">
                            <span class="step-number">3</span>
                            <div class="step-content">
                                <h3>Search & Install</h3>
                                <p>Search for "File Insights" and click Install</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-panel" id="manual">
                    <div class="install-steps">
                        <div class="step">
                            <span class="step-number">1</span>
                            <div class="step-content">
                                <h3>Download VSIX</h3>
                                <p>Download the .vsix file from GitHub releases</p>
                            </div>
                        </div>
                        <div class="step">
                            <span class="step-number">2</span>
                            <div class="step-content">
                                <h3>Install from VSIX</h3>
                                <p>Use Command Palette: "Extensions: Install from VSIX..."</p>
                            </div>
                        </div>
                        <div class="step">
                            <span class="step-number">3</span>
                            <div class="step-content">
                                <h3>Select File</h3>
                                <p>Choose the downloaded .vsix file and install</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-panel" id="cli">
                    <div class="install-steps">
                        <div class="step">
                            <span class="step-number">1</span>
                            <div class="step-content">
                                <h3>Open Terminal</h3>
                                <p>Open your command line interface</p>
                            </div>
                        </div>
                        <div class="step">
                            <span class="step-number">2</span>
                            <div class="step-content">
                                <h3>Run Command</h3>
                                <p>Execute the installation command</p>
                                <div class="code-block">
                                    <pre><code>code --install-extension VijayGangatharan.file-insights</code></pre>
                                </div>
                            </div>
                        </div>
                        <div class="step">
                            <span class="step-number">3</span>
                            <div class="step-content">
                                <h3>Restart VS Code</h3>
                                <p>Reload VS Code to activate the extension</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Version Information -->
<section class="version-info">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Version Information</h2>
            <p class="section-description">
                Current version details and release information.
            </p>
        </div>
        
        <div class="version-grid">
            <div class="version-card">
                <div class="version-header">
                    <h3 class="version-number">{{ site.extension.version }}</h3>
                    <span class="version-badge">Latest</span>
                </div>
                <div class="version-content">
                    <div class="version-details">
                        <div class="detail">
                            <span class="detail-label">Release Date:</span>
                            <span class="detail-value">July 17, 2025</span>
                        </div>
                        <div class="detail">
                            <span class="detail-label">License:</span>
                            <span class="detail-value">MIT</span>
                        </div>
                        <div class="detail">
                            <span class="detail-label">VS Code:</span>
                            <span class="detail-value">1.102.0+</span>
                        </div>
                        <div class="detail">
                            <span class="detail-label">Size:</span>
                            <span class="detail-value">~1MB</span>
                        </div>
                    </div>
                    <div class="version-features">
                        <h4>Key Features:</h4>
                        <ul>
                            <li>Repository restructuring & workflow improvements</li>
                            <li>Enhanced CI/CD workflow with deployment integration</li>
                            <li>Improved documentation and configuration</li>
                            <li>Consolidated development workflows</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="changelog-preview">
                <h3 class="changelog-title">Recent Changes</h3>
                <div class="changelog-items">
                    <div class="changelog-item">
                        <span class="changelog-version">1.1.0</span>
                        <span class="changelog-description">Repository restructuring & workflow improvements</span>
                    </div>
                    <div class="changelog-item">
                        <span class="changelog-version">1.0.0</span>
                        <span class="changelog-description">Major release with enterprise-grade architecture</span>
                    </div>
                    <div class="changelog-item">
                        <span class="changelog-version">0.1.0</span>
                        <span class="changelog-description">Updated icon and branding assets</span>
                    </div>
                </div>
                <a href="{{ site.extension.github_url }}/releases" class="btn btn-outline" target="_blank">
                    <i class="fas fa-history"></i>
                    View Full Changelog
                </a>
            </div>
        </div>
    </div>
</section>

<!-- Support Information -->
<section class="support-info">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Support & Resources</h2>
            <p class="section-description">
                Get help and find additional resources for File Insights.
            </p>
        </div>
        
        <div class="support-grid">
            <div class="support-card">
                <div class="support-icon">
                    <i class="fas fa-book"></i>
                </div>
                <h3 class="support-title">Documentation</h3>
                <p class="support-description">
                    Comprehensive guides and technical documentation.
                </p>
                <a href="{{ site.baseurl }}/documentation" class="btn btn-outline">
                    Read Docs
                </a>
            </div>
            
            <div class="support-card">
                <div class="support-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <h3 class="support-title">Installation Guide</h3>
                <p class="support-description">
                    Step-by-step installation and configuration instructions.
                </p>
                <a href="{{ site.baseurl }}/installation" class="btn btn-outline">
                    Installation Guide
                </a>
            </div>
            
            <div class="support-card">
                <div class="support-icon">
                    <i class="fas fa-bug"></i>
                </div>
                <h3 class="support-title">Issue Tracker</h3>
                <p class="support-description">
                    Report bugs or request new features on GitHub.
                </p>
                <a href="{{ site.extension.github_url }}/issues" class="btn btn-outline" target="_blank">
                    Report Issues
                </a>
            </div>
            
            <div class="support-card">
                <div class="support-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h3 class="support-title">Discussions</h3>
                <p class="support-description">
                    Join the community discussion and get help from other users.
                </p>
                <a href="{{ site.extension.github_url }}/discussions" class="btn btn-outline" target="_blank">
                    Join Discussion
                </a>
            </div>
        </div>
    </div>
</section>

<!-- JavaScript for interactivity -->
<script>
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        // Show success message
        const button = event.target.closest('button');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}

// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked button and corresponding panel
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
});
</script>
