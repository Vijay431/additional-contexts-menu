---
layout: default
title: 'Code Operations & Examples'
description: 'Detailed examples and workflows for Additional Context Menus code operations including function copying, code movement, and import handling.'
---

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <h1 class="page-title">Code Operations & Examples</h1>
        <p class="page-description">
            Learn how to use Additional Context Menus for efficient code operations with practical examples and workflows.
        </p>
    </div>
</section>

<!-- Copy Function Section -->
<section class="operation-section">
    <div class="container">
        <div class="operation-header">
            <h2 class="operation-title">
                <i class="fas fa-code"></i>
                Copy Function
            </h2>
            <p class="operation-desc">
                Use AST-based function detection to copy functions, methods, and React components with intelligent analysis.
            </p>
        </div>
        
        <div class="operation-examples">
            <div class="example-grid">
                <div class="example-card">
                    <div class="example-header">
                        <h3>Function Declaration</h3>
                        <span class="example-lang">TypeScript</span>
                    </div>
                    <div class="code-example">
                        <pre><code class="language-typescript">
// Place cursor anywhere in this function and right-click
function calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
}

// The entire function will be detected and copied
// including type annotations and JSDoc comments
</code></pre>
</div>
<div class="example-result">
<p><strong>Result:</strong> Entire function copied with types preserved</p>
</div>
</div>

                <div class="example-card">
                    <div class="example-header">
                        <h3>React Component</h3>
                        <span class="example-lang">TSX</span>
                    </div>
                    <div class="code-example">
                        <pre><code class="language-tsx">

// Right-click anywhere in this component
const UserProfile: React.FC<UserProfileProps> = ({ user, onEdit }) => {
const [isEditing, setIsEditing] = useState(false);

    return (
        &lt;div className="user-profile"&gt;
            &lt;h2&gt;{user.name}&lt;/h2&gt;
            &lt;p&gt;{user.email}&lt;/p&gt;
            {isEditing && &lt;EditForm user={user} onSave={onEdit} /&gt;}
        &lt;/div&gt;
    );

};

// Component with hooks and JSX will be accurately detected
</code></pre>
</div>
<div class="example-result">
<p><strong>Result:</strong> Complete React component with hooks and JSX</p>
</div>
</div>

                <div class="example-card">
                    <div class="example-header">
                        <h3>Arrow Function</h3>
                        <span class="example-lang">JavaScript</span>
                    </div>
                    <div class="code-example">
                        <pre><code class="language-javascript">

// Place cursor in arrow function body
const processUserData = async (userId) => {
try {
const userData = await fetchUser(userId);
const processedData = transformUserData(userData);
await saveProcessedData(processedData);
return processedData;
} catch (error) {
console.error('Processing failed:', error);
throw error;
}
};

// Async arrow functions are properly detected
</code></pre>
</div>
<div class="example-result">
<p><strong>Result:</strong> Async arrow function with error handling</p>
</div>
</div>
</div>
</div>
</div>

</section>

<!-- Copy to Existing File Section -->
<section class="operation-section">
    <div class="container">
        <div class="operation-header">
            <h2 class="operation-title">
                <i class="fas fa-copy"></i>
                Copy to Existing File
            </h2>
            <p class="operation-desc">
                Copy selected code to existing files with intelligent import handling and smart insertion points.
            </p>
        </div>
        
        <div class="workflow-steps">
            <div class="step-flow">
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h3>Select Code</h3>
                        <p>Select the code you want to copy - functions, classes, or any code block</p>
                    </div>
                </div>
                
                <div class="step-arrow">→</div>
                
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h3>Right-Click</h3>
                        <p>Right-click on selection and choose "Copy to Existing File"</p>
                    </div>
                </div>
                
                <div class="step-arrow">→</div>
                
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h3>Choose Target</h3>
                        <p>Select target file from the quick pick menu of compatible files</p>
                    </div>
                </div>
                
                <div class="step-arrow">→</div>
                
                <div class="step-item">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h3>Smart Insert</h3>
                        <p>Code is inserted at the optimal location with import handling</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="import-handling">
            <h3>Import Handling Options</h3>
            <div class="import-options">
                <div class="import-option">
                    <div class="option-header">
                        <h4><i class="fas fa-compress-arrows-alt"></i> Merge (Default)</h4>
                    </div>
                    <div class="option-content">
                        <p>Combines imports from the same module into a single import statement.</p>
                        <div class="option-example">
                            <strong>Before:</strong> <code>import { useState } from 'react';</code><br>
                            <strong>After:</strong> <code>import { useState, useEffect } from 'react';</code>
                        </div>
                    </div>
                </div>
                
                <div class="import-option">
                    <div class="option-header">
                        <h4><i class="fas fa-clone"></i> Duplicate</h4>
                    </div>
                    <div class="option-content">
                        <p>Allows duplicate import statements without merging.</p>
                        <div class="option-example">
                            <strong>Result:</strong> Separate import lines for each copy operation
                        </div>
                    </div>
                </div>
                
                <div class="import-option">
                    <div class="option-header">
                        <h4><i class="fas fa-forward"></i> Skip</h4>
                    </div>
                    <div class="option-content">
                        <p>Skips import statements entirely, copying only the code.</p>
                        <div class="option-example">
                            <strong>Result:</strong> Code copied without any import statements
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Move to Existing File Section -->
<section class="operation-section">
    <div class="container">
        <div class="operation-header">
            <h2 class="operation-title">
                <i class="fas fa-cut"></i>
                Move to Existing File
            </h2>
            <p class="operation-desc">
                Move code between files with automatic cleanup of the source file and intelligent dependency management.
            </p>
        </div>
        
        <div class="move-features">
            <div class="feature-grid">
                <div class="move-feature">
                    <div class="feature-icon">
                        <i class="fas fa-broom"></i>
                    </div>
                    <h3>Automatic Cleanup</h3>
                    <p>Removes moved code from source file and cleans up unused imports automatically.</p>
                </div>
                
                <div class="move-feature">
                    <div class="feature-icon">
                        <i class="fas fa-link"></i>
                    </div>
                    <h3>Dependency Tracking</h3>
                    <p>Handles interdependent code relationships and maintains proper references.</p>
                </div>
                
                <div class="move-feature">
                    <div class="feature-icon">
                        <i class="fas fa-code"></i>
                    </div>
                    <h3>Format Preservation</h3>
                    <p>Maintains proper file structure, indentation, and code formatting.</p>
                </div>
                
                <div class="move-feature">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3>Safety Checks</h3>
                    <p>Validates move operations to prevent breaking code dependencies.</p>
                </div>
            </div>
        </div>
        
        <div class="move-example">
            <h3>Move Operation Example</h3>
            <div class="before-after">
                <div class="before">
                    <h4>Before Move</h4>
                    <div class="file-example">
                        <div class="file-header">utils.ts</div>
                        <pre><code class="language-typescript">
import { format } from 'date-fns';
import { logger } from './logger';

export function formatDate(date: Date): string {
return format(date, 'yyyy-MM-dd');
}

export function validateEmail(email: string): boolean {
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return emailRegex.test(email);
}

// Other utility functions...
</code></pre>
</div>
</div>

                <div class="after">
                    <h4>After Move (formatDate to dateUtils.ts)</h4>
                    <div class="file-example">
                        <div class="file-header">utils.ts</div>
                        <pre><code class="language-typescript">

import { logger } from './logger';

export function validateEmail(email: string): boolean {
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return emailRegex.test(email);
}

// Other utility functions...
// date-fns import removed automatically
</code></pre>
</div>

                    <div class="file-example">
                        <div class="file-header">dateUtils.ts</div>
                        <pre><code class="language-typescript">

import { format } from 'date-fns';

export function formatDate(date: Date): string {
return format(date, 'yyyy-MM-dd');
}

// Function moved with its import
</code></pre>
</div>
</div>
</div>
</div>
</div>

</section>

<!-- Enhanced Save All Section -->
<section class="operation-section">
    <div class="container">
        <div class="operation-header">
            <h2 class="operation-title">
                <i class="fas fa-save"></i>
                Enhanced Save All
            </h2>
            <p class="operation-desc">
                Improved Save All functionality with progress feedback, intelligent file handling, and workspace awareness.
            </p>
        </div>
        
        <div class="save-all-features">
            <div class="save-features-grid">
                <div class="save-feature">
                    <div class="feature-header">
                        <i class="fas fa-chart-line"></i>
                        <h3>Progress Feedback</h3>
                    </div>
                    <p>Visual progress bar for large workspaces with file count and status updates.</p>
                </div>
                
                <div class="save-feature">
                    <div class="feature-header">
                        <i class="fas fa-lock"></i>
                        <h3>Read-Only Handling</h3>
                    </div>
                    <p>Automatically skips read-only files with configurable notification options.</p>
                </div>
                
                <div class="save-feature">
                    <div class="feature-header">
                        <i class="fas fa-bell"></i>
                        <h3>Smart Notifications</h3>
                    </div>
                    <p>Configurable success/failure notifications with detailed save statistics.</p>
                </div>
                
                <div class="save-feature">
                    <div class="feature-header">
                        <i class="fas fa-sitemap"></i>
                        <h3>Multi-Root Support</h3>
                    </div>
                    <p>Handles workspace multi-root scenarios with proper file discovery.</p>
                </div>
            </div>
        </div>
        
        <div class="save-configuration">
            <h3>Configuration Options</h3>
            <div class="config-options">
                <div class="config-item">
                    <code>additionalContextMenus.saveAll.showNotification</code>
                    <p>Show notification after saving all files (default: true)</p>
                </div>
                <div class="config-item">
                    <code>additionalContextMenus.saveAll.skipReadOnly</code>
                    <p>Skip read-only files when saving all (default: true)</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Best Practices Section -->
<section class="best-practices">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Best Practices & Tips</h2>
            <p class="section-description">
                Maximize your productivity with these recommended workflows and best practices.
            </p>
        </div>
        
        <div class="practices-grid">
            <div class="practice-card">
                <div class="practice-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3>Project Organization</h3>
                <ul>
                    <li>Keep package.json in your workspace root for optimal project detection</li>
                    <li>Use consistent file naming conventions for better file discovery</li>
                    <li>Organize related functions in dedicated utility files</li>
                </ul>
            </div>
            
            <div class="practice-card">
                <div class="practice-icon">
                    <i class="fas fa-code-branch"></i>
                </div>
                <h3>Code Operations</h3>
                <ul>
                    <li>Use "Copy Function" for reusable utility functions</li>
                    <li>Prefer "Move" for refactoring and organizing code</li>
                    <li>Test copied/moved code to ensure proper import resolution</li>
                </ul>
            </div>
            
            <div class="practice-card">
                <div class="practice-icon">
                    <i class="fas fa-cogs"></i>
                </div>
                <h3>Configuration</h3>
                <ul>
                    <li>Set insertion point to "smart" for automatic placement</li>
                    <li>Use "merge" for import handling to avoid duplicates</li>
                    <li>Enable comment preservation for documentation</li>
                </ul>
            </div>
            
            <div class="practice-card">
                <div class="practice-icon">
                    <i class="fas fa-keyboard"></i>
                </div>
                <h3>Workflow Tips</h3>
                <ul>
                    <li>Use keyboard shortcuts for frequently used operations</li>
                    <li>Leverage the command palette for quick access</li>
                    <li>Check the output channel for troubleshooting</li>
                </ul>
            </div>
        </div>
    </div>
</section>

<!-- CTA Section -->
<section class="cta">
    <div class="container">
        <div class="cta-content">
            <h2 class="cta-title">Ready to Streamline Your Code Operations?</h2>
            <p class="cta-description">
                Start using intelligent code operations today and experience the productivity boost.
            </p>
            <div class="cta-buttons">
                <a href="{{ site.extension.marketplace_url }}" class="btn btn-primary btn-large" target="_blank">
                    <i class="fas fa-download"></i>
                    Install Extension
                </a>
                <a href="{{ site.baseurl }}/installation" class="btn btn-secondary btn-large">
                    <i class="fas fa-book"></i>
                    Installation Guide
                </a>
                <a href="{{ site.baseurl }}/frameworks" class="btn btn-tertiary btn-large">
                    <i class="fas fa-layer-group"></i>
                    Framework Support
                </a>
            </div>
        </div>
    </div>
</section>
