import * as vscode from 'vscode';
import { ExtensionConfig } from '../types/extension';
import { Logger } from '../utils/logger';

export class ConfigurationService {
  private static instance: ConfigurationService;
  private logger: Logger;
  private readonly configSection = 'additionalContextMenus';

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  public getConfiguration(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(this.configSection);

    return {
      enabled: config.get<boolean>('enabled', true),
      autoDetectProjects: config.get<boolean>('autoDetectProjects', true),
      supportedExtensions: config.get<string[]>('supportedExtensions', [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
      ]),
      copyCode: {
        insertionPoint: config.get<'smart' | 'end' | 'beginning'>(
          'copyCode.insertionPoint',
          'smart'
        ),
        handleImports: config.get<'merge' | 'duplicate' | 'skip'>(
          'copyCode.handleImports',
          'merge'
        ),
        preserveComments: config.get<boolean>('copyCode.preserveComments', true),
      },
      saveAll: {
        showNotification: config.get<boolean>('saveAll.showNotification', true),
        skipReadOnly: config.get<boolean>('saveAll.skipReadOnly', true),
      },
      enableKeybindings: config.get<boolean>('enableKeybindings', false),
      showKeybindingsInMenu: config.get<boolean>('showKeybindingsInMenu', true),
      terminal: {
        type: config.get<'integrated' | 'external' | 'system-default'>('terminal.type', 'integrated'),
        externalTerminalCommand: config.get<string>('terminal.externalTerminalCommand', ''),
        openBehavior: config.get<'parent-directory' | 'workspace-root' | 'current-directory'>('terminal.openBehavior', 'parent-directory'),
      },
    };
  }

  public isEnabled(): boolean {
    return this.getConfiguration().enabled;
  }

  public getSupportedExtensions(): string[] {
    return this.getConfiguration().supportedExtensions;
  }

  public shouldAutoDetectProjects(): boolean {
    return this.getConfiguration().autoDetectProjects;
  }

  public getCopyCodeConfig() {
    return this.getConfiguration().copyCode;
  }

  public getSaveAllConfig() {
    return this.getConfiguration().saveAll;
  }

  public onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configSection)) {
        this.logger.info('Configuration changed');
        callback();
      }
    });
  }

  public async updateConfiguration<T>(
    key: string,
    value: T,
    target?: vscode.ConfigurationTarget
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(key, value, target);
    this.logger.info(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
  }
}
