import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { ProjectDetectionService } from './projectDetectionService';
import { ProjectType } from '../types/extension';

export class StatusBarService {
  private static instance: StatusBarService;
  private logger: Logger;
  private configService: ConfigurationService;
  private projectDetectionService: ProjectDetectionService;
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.projectDetectionService = ProjectDetectionService.getInstance();
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'Additional Context Menus';
    this.statusBarItem.command = 'additionalContextMenus.debugContextVariables';
  }

  public static getInstance(): StatusBarService {
    if (!StatusBarService.instance) {
      StatusBarService.instance = new StatusBarService();
    }
    return StatusBarService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.debug('Initializing StatusBarService');

    // Initial update
    await this.updateStatusBar();

    // Listen for configuration changes
    this.disposables.push(
      this.configService.onConfigurationChanged(async () => {
        await this.updateStatusBar();
      })
    );

    // Listen for workspace changes
    this.disposables.push(
      this.projectDetectionService.onWorkspaceChanged(async () => {
        await this.updateStatusBar();
      })
    );

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(async () => {
        await this.updateStatusBar();
      })
    );

    this.logger.debug('StatusBarService initialized successfully');
  }

  private async updateStatusBar(): Promise<void> {
    try {
      const isEnabled = this.configService.isEnabled();
      const projectType = await this.projectDetectionService.detectProjectType();
      
      if (!isEnabled) {
        this.statusBarItem.text = '$(extensions-disabled) ACM';
        this.statusBarItem.tooltip = 'Additional Context Menus: Disabled';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      } else if (!projectType.isNodeProject) {
        this.statusBarItem.text = '$(circle-outline) ACM';
        this.statusBarItem.tooltip = 'Additional Context Menus: No Node.js project detected';
        this.statusBarItem.backgroundColor = undefined;
      } else {
        const icon = this.getProjectIcon(projectType);
        const frameworkText = this.getFrameworkText(projectType);
        
        this.statusBarItem.text = `${icon} ACM${frameworkText}`;
        this.statusBarItem.tooltip = this.getTooltipText(projectType);
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
      }

      // Show status bar only if enabled or if there are issues to highlight
      if (isEnabled || !projectType.isNodeProject) {
        this.statusBarItem.show();
      } else {
        this.statusBarItem.hide();
      }

      this.logger.debug('Status bar updated', {
        enabled: isEnabled,
        nodeProject: projectType.isNodeProject,
        frameworks: projectType.frameworks
      });

    } catch (error) {
      this.logger.error('Error updating status bar', error);
      this.statusBarItem.text = '$(error) ACM';
      this.statusBarItem.tooltip = 'Additional Context Menus: Error';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.show();
    }
  }

  private getProjectIcon(projectType: ProjectType): string {
    if (projectType.frameworks.includes('react')) {
      return '$(symbol-class)'; // React component icon
    } else if (projectType.frameworks.includes('angular')) {
      return '$(symbol-interface)'; // Angular icon
    } else if (projectType.frameworks.includes('express')) {
      return '$(server-environment)'; // Server icon
    } else if (projectType.frameworks.includes('nextjs')) {
      return '$(globe)'; // Next.js icon
    } else if (projectType.frameworks.includes('vue')) {
      return '$(symbol-method)'; // Vue icon
    } else if (projectType.frameworks.includes('svelte')) {
      return '$(symbol-event)'; // Svelte icon
    } else if (projectType.hasTypeScript) {
      return '$(file-code)'; // TypeScript icon
    } else {
      return '$(check)'; // Generic Node.js project
    }
  }

  private getFrameworkText(projectType: ProjectType): string {
    if (projectType.frameworks.length === 0) {
      return projectType.hasTypeScript ? ' TS' : ' JS';
    }
    
    // Show primary framework
    const primary = projectType.frameworks[0];
    switch (primary) {
      case 'react': return ' React';
      case 'angular': return ' Angular';
      case 'express': return ' Express';
      case 'nextjs': return ' Next.js';
      case 'vue': return ' Vue';
      case 'svelte': return ' Svelte';
      case 'nestjs': return ' Nest.js';
      default: return '';
    }
  }

  private getTooltipText(projectType: ProjectType): string {
    const lines = [
      'Additional Context Menus: Active',
      `Project Type: Node.js (${projectType.supportLevel} support)`
    ];

    if (projectType.frameworks.length > 0) {
      lines.push(`Frameworks: ${projectType.frameworks.join(', ')}`);
    }

    if (projectType.hasTypeScript) {
      lines.push('TypeScript: Detected');
    }

    lines.push('');
    lines.push('Click to debug context variables');

    return lines.join('\n');
  }

  public dispose(): void {
    this.logger.debug('Disposing StatusBarService');
    
    this.statusBarItem.dispose();
    
    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('Error disposing status bar resource', error);
      }
    });
    
    this.disposables = [];
  }
}