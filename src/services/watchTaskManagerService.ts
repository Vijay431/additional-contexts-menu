import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type { TaskDefinition, TaskRunnerType } from '../types/extension';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

export interface WatchTaskDefinition extends TaskDefinition {
  id: string;
  name: string;
  type: TaskRunnerType;
  command: string;
  args?: string[];
  description?: string;
  category?: string;
  source: string;
  sourceFile?: string;
  isWatchTask: boolean;
  autoRestart?: boolean;
  restartDelay?: number;
}

export interface WatchTaskExecution {
  taskId: string;
  status: 'starting' | 'running' | 'stopped' | 'failed' | 'restarting';
  startTime: number;
  endTime?: number;
  duration?: number;
  exitCode?: number;
  restartCount: number;
  lastRestartTime?: number;
  pid?: number;
  terminalName: string;
}

export interface WatchTaskOutput {
  taskId: string;
  timestamp: number;
  type: 'stdout' | 'stderr';
  text: string;
}

export interface WatchTaskManagerConfig {
  enabled: boolean;
  autoDetect: boolean;
  maxOutputLines: number;
  restartOnFailure: boolean;
  maxRestartAttempts: number;
  restartDelay: number;
  statusBarEnabled: boolean;
  showTaskOutput: boolean;
  dedicatedChannels: boolean;
}

interface RunningWatchTask {
  task: WatchTaskDefinition;
  execution: WatchTaskExecution;
  terminal: vscode.Terminal;
  outputChannel: vscode.OutputChannel;
  disposable: vscode.Disposable;
  restartTimer?: NodeJS.Timeout;
}

export class WatchTaskManagerService {
  private static instance: WatchTaskManagerService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;
  private runningTasks = new Map<string, RunningWatchTask>();
  private statusBarItem: vscode.StatusBarItem | undefined;
  private outputChannels = new Map<string, vscode.OutputChannel>();
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): WatchTaskManagerService {
    WatchTaskManagerService.instance ??= new WatchTaskManagerService();
    return WatchTaskManagerService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing WatchTaskManagerService');

    const config = this.getConfig();

    if (config.statusBarEnabled) {
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99,
      );
      this.statusBarItem.command = 'additionalContextMenus.showWatchTasks';
      this.updateStatusBarItem();
      this.statusBarItem.show();
    }

    this.logger.info('WatchTaskManagerService initialized successfully');
  }

  /**
   * Detect watch tasks in the workspace
   */
  public async detectWatchTasks(): Promise<WatchTaskDefinition[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [];
    }

    const watchTasks: WatchTaskDefinition[] = [];
    const rootPath = workspaceFolder.uri.fsPath;

    // Detect npm/yarn/pnpm watch scripts
    const npmTasks = await this.detectNpmWatchTasks(rootPath);
    watchTasks.push(...npmTasks);

    // Detect webpack watch tasks
    const webpackTasks = await this.detectWebpackWatchTasks(rootPath);
    watchTasks.push(...webpackTasks);

    // Detect vite watch tasks
    const viteTasks = await this.detectViteWatchTasks(rootPath);
    watchTasks.push(...viteTasks);

    // Detect nodemon tasks
    const nodemonTasks = await this.detectNodemonTasks(rootPath);
    watchTasks.push(...nodemonTasks);

    // Detect TypeScript watch tasks
    const tscTasks = await this.detectTscWatchTasks(rootPath);
    watchTasks.push(...tscTasks);

    this.logger.info('Detected watch tasks', { count: watchTasks.length });
    return watchTasks;
  }

  /**
   * Show watch tasks panel
   */
  public async showWatchTasks(): Promise<void> {
    const config = this.getConfig();
    if (!config.enabled) {
      vscode.window.showInformationMessage('Watch Task Manager is disabled in settings');
      return;
    }

    const watchTasks = await this.detectWatchTasks();

    if (watchTasks.length === 0) {
      vscode.window.showInformationMessage('No watch tasks found in workspace');
      return;
    }

    type WatchTaskItem = (vscode.QuickPickItem & { task: WatchTaskDefinition }) | vscode.QuickPickItem;

    const items: WatchTaskItem[] = watchTasks.map((task) => {
      const runningTask = this.runningTasks.get(task.id);
      const isRunning = !!runningTask;
      const statusIcon = isRunning ? '$(sync~spin)' : '$(play)';

      return {
        label: `${statusIcon} ${task.name}`,
        description: task.description || task.command,
        detail: isRunning
          ? `Status: ${runningTask.execution.status} | Restarts: ${runningTask.execution.restartCount}`
          : task.type,
        task,
      };
    });

    // Add management actions
    items.push(
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      {
        label: '$(refresh) Refresh Tasks',
        description: 'Re-detect all watch tasks',
      },
      {
        label: '$(close-all) Stop All Watch Tasks',
        description: 'Stop all running watch tasks',
      },
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a watch task (${this.runningTasks.size} running)`,
      ignoreFocusOut: true,
    });

    if (!selected) {
      return;
    }

    if ('label' in selected && typeof selected.label === 'string') {
      if (selected.label.includes('Refresh Tasks')) {
        await this.showWatchTasks();
        return;
      }

      if (selected.label.includes('Stop All')) {
        await this.stopAllWatchTasks();
        return;
      }
    }

    if ('task' in selected) {
      const task = selected.task as WatchTaskDefinition;
      if (this.runningTasks.has(task.id)) {
        await this.stopWatchTask(task.id);
      } else {
        await this.startWatchTask(task);
      }
    }
  }

  /**
   * Start a watch task
   */
  public async startWatchTask(task: WatchTaskDefinition): Promise<void> {
    if (this.runningTasks.has(task.id)) {
      vscode.window.showWarningMessage(`Watch task '${task.name}' is already running`);
      return;
    }

    const config = this.getConfig();

    // Create terminal
    const terminalName = `Watch: ${task.name}`;
    const terminalOptions: vscode.TerminalOptions = {
      name: terminalName,
    };
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (cwd) {
      terminalOptions.cwd = cwd;
    }
    const terminal = vscode.window.createTerminal(terminalOptions);

    // Create output channel
    let outputChannel: vscode.OutputChannel;
    if (config.dedicatedChannels) {
      outputChannel = vscode.window.createOutputChannel(`Watch Task: ${task.name}`);
      this.outputChannels.set(task.id, outputChannel);
    } else {
      if (!this.outputChannels.has('watch-tasks')) {
        this.outputChannels.set(
          'watch-tasks',
          vscode.window.createOutputChannel('Watch Tasks'),
        );
      }
      outputChannel = this.outputChannels.get('watch-tasks')!;
    }

    outputChannel.show(true);
    outputChannel.appendLine(`[${new Date().toISOString()}] Starting watch task: ${task.name}`);
    outputChannel.appendLine(`Command: ${task.command} ${task.args?.join(' ') ?? ''}`);
    outputChannel.appendLine('---');

    // Build command
    const command = this.buildWatchCommand(task);

    // Create execution record
    const execution: WatchTaskExecution = {
      taskId: task.id,
      status: 'starting',
      startTime: Date.now(),
      restartCount: 0,
      terminalName,
    };

    // Track running task
    const runningTask: RunningWatchTask = {
      task,
      execution,
      terminal,
      outputChannel,
      disposable: vscode.window.onDidCloseTerminal((closed) => {
        if (closed === terminal) {
          this.handleTaskTermination(task.id);
        }
      }),
    };

    this.runningTasks.set(task.id, runningTask);
    this.updateStatusBarItem();

    // Send command to terminal
    terminal.sendText(command);

    if (config.showTaskOutput) {
      terminal.show();
    }

    execution.status = 'running';
    vscode.window.showInformationMessage(`Started watch task: ${task.name}`);
    this.logger.info('Watch task started', { taskId: task.id, command });
  }

  /**
   * Stop a watch task
   */
  public async stopWatchTask(taskId: string): Promise<boolean> {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) {
      return false;
    }

    const { task, terminal, execution, restartTimer, disposable } = runningTask;

    // Clear restart timer if exists
    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    // Send Ctrl+C to stop the task
    terminal.sendText('\x03');

    execution.status = 'stopped';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    disposable.dispose();
    this.runningTasks.delete(taskId);
    this.updateStatusBarItem();

    vscode.window.showInformationMessage(`Stopped watch task: ${task.name}`);
    this.logger.info('Watch task stopped', { taskId });

    return true;
  }

  /**
   * Stop all running watch tasks
   */
  public async stopAllWatchTasks(): Promise<void> {
    const runningTaskIds = Array.from(this.runningTasks.keys());

    if (runningTaskIds.length === 0) {
      vscode.window.showInformationMessage('No running watch tasks');
      return;
    }

    for (const taskId of runningTaskIds) {
      await this.stopWatchTask(taskId);
    }

    vscode.window.showInformationMessage(`Stopped ${runningTaskIds.length} watch task(s)`);
  }

  /**
   * Restart a watch task
   */
  public async restartWatchTask(taskId: string): Promise<void> {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) {
      return;
    }

    const { task, execution } = runningTask;
    const config = this.getConfig();
    const restartDelay = task.restartDelay ?? config.restartDelay;

    execution.status = 'restarting';
    execution.lastRestartTime = Date.now();
    execution.restartCount++;

    this.logger.info('Restarting watch task', { taskId, restartCount: execution.restartCount });

    // Stop current task
    await this.stopWatchTask(taskId);

    // Wait before restarting
    await new Promise((resolve) => setTimeout(resolve, restartDelay));

    // Restart task
    await this.startWatchTask(task);
  }

  /**
   * Get running watch tasks
   */
  public getRunningWatchTasks(): WatchTaskExecution[] {
    return Array.from(this.runningTasks.values()).map((rt) => rt.execution);
  }

  /**
   * Detect npm/yarn/pnpm watch scripts
   */
  private async detectNpmWatchTasks(rootPath: string): Promise<WatchTaskDefinition[]> {
    const packageJsonPath = path.join(rootPath, 'package.json');

    try {
      await fs.access(packageJsonPath);
    } catch {
      return [];
    }

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      if (!packageJson.scripts) {
        return [];
      }

      const tasks: WatchTaskDefinition[] = [];
      const watchPatterns = [
        'watch',
        'dev',
        'start',
        'serve',
        'dev:watch',
        'watch:dev',
        'build:watch',
        'watch:build',
      ];

      const packageManager = await this.detectPackageManager(rootPath);

      for (const [name, script] of Object.entries(packageJson.scripts)) {
        const scriptStr = String(script);

        // Check if it's a watch task
        const isWatchTask =
          watchPatterns.some((pattern) => name.includes(pattern)) ||
          scriptStr.includes('--watch') ||
          scriptStr.includes('--watch-mode') ||
          scriptStr.includes('nodemon') ||
          scriptStr.includes('webpack --watch') ||
          scriptStr.includes('vite');

        if (isWatchTask) {
          tasks.push({
            id: `${packageManager}-${name}`,
            name,
            type: packageManager,
            command: `${packageManager} run`,
            args: [name],
            description: scriptStr,
            category: 'Development',
            source: 'package.json',
            sourceFile: packageJsonPath,
            isWatchTask: true,
          });
        }
      }

      return tasks;
    } catch (error) {
      this.logger.error('Error reading package.json for watch tasks', error);
      return [];
    }
  }

  /**
   * Detect webpack watch tasks
   */
  private async detectWebpackWatchTasks(rootPath: string): Promise<WatchTaskDefinition[]> {
    const webpackConfigs = [
      'webpack.config.js',
      'webpack.config.ts',
      'webpackfile.js',
      'webpack.config.dev.js',
    ];

    for (const config of webpackConfigs) {
      const configPath = path.join(rootPath, config);
      try {
        await fs.access(configPath);

        return [
          {
            id: 'webpack-watch',
            name: 'webpack:watch',
            type: 'webpack',
            command: 'npx',
            args: ['webpack', '--watch'],
            description: 'Webpack watch mode',
            category: 'Build',
            source: 'webpack.config',
            sourceFile: configPath,
            isWatchTask: true,
          },
        ];
      } catch {
        // Config not found
      }
    }

    return [];
  }

  /**
   * Detect vite watch tasks
   */
  private async detectViteWatchTasks(rootPath: string): Promise<WatchTaskDefinition[]> {
    const viteConfigs = [
      'vite.config.js',
      'vite.config.ts',
      'vite.config.mjs',
      'vite.config.cjs',
    ];

    for (const config of viteConfigs) {
      const configPath = path.join(rootPath, config);
      try {
        await fs.access(configPath);

        return [
          {
            id: 'vite-dev',
            name: 'vite:dev',
            type: 'vite',
            command: 'npx',
            args: ['vite'],
            description: 'Vite dev server',
            category: 'Development',
            source: 'vite.config',
            sourceFile: configPath,
            isWatchTask: true,
          },
        ];
      } catch {
        // Config not found
      }
    }

    return [];
  }

  /**
   * Detect nodemon tasks
   */
  private async detectNodemonTasks(rootPath: string): Promise<WatchTaskDefinition[]> {
    const nodemonConfigs = ['nodemon.json', 'nodemon.config.js'];

    let hasNodemonConfig = false;
    for (const config of nodemonConfigs) {
      const configPath = path.join(rootPath, config);
      try {
        await fs.access(configPath);
        hasNodemonConfig = true;
        break;
      } catch {
        // Config not found
      }
    }

    // Check if nodemon is in dependencies
    const packageJsonPath = path.join(rootPath, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      const hasNodemon =
        hasNodemonConfig ||
        packageJson.dependencies?.nodemon ||
        packageJson.devDependencies?.nodemon;

      if (hasNodemon) {
        return [
          {
            id: 'nodemon',
            name: 'nodemon',
            type: 'nodemon',
            command: 'npx',
            args: ['nodemon'],
            description: 'Nodemon auto-restart server',
            category: 'Development',
            source: 'nodemon',
            isWatchTask: true,
          },
        ];
      }
    } catch {
      // Error reading package.json
    }

    return [];
  }

  /**
   * Detect TypeScript watch tasks
   */
  private async detectTscWatchTasks(rootPath: string): Promise<WatchTaskDefinition[]> {
    const tsConfigs = ['tsconfig.json', 'tsconfig.build.json'];

    for (const config of tsConfigs) {
      const configPath = path.join(rootPath, config);
      try {
        await fs.access(configPath);

        return [
          {
            id: 'tsc-watch',
            name: 'tsc:watch',
            type: 'tsc',
            command: 'npx',
            args: ['tsc', '--watch'],
            description: 'TypeScript watch mode',
            category: 'Development',
            source: 'tsconfig',
            sourceFile: configPath,
            isWatchTask: true,
          },
        ];
      } catch {
        // Config not found
      }
    }

    return [];
  }

  /**
   * Build watch command
   */
  private buildWatchCommand(task: WatchTaskDefinition): string {
    const parts = [task.command];
    if (task.args) {
      parts.push(...task.args);
    }
    return parts.join(' ');
  }

  /**
   * Handle task termination
   */
  private handleTaskTermination(taskId: string): void {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) {
      return;
    }

    const { task, execution, outputChannel, disposable } = runningTask;
    const config = this.getConfig();

    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    execution.status = 'stopped';

    outputChannel.appendLine('---');
    outputChannel.appendLine(`[${new Date().toISOString()}] Watch task stopped: ${task.name}`);
    outputChannel.appendLine(`Duration: ${this.formatDuration(execution.duration)}`);
    outputChannel.appendLine(`Total restarts: ${execution.restartCount}`);

    disposable.dispose();
    this.runningTasks.delete(taskId);
    this.updateStatusBarItem();

    // Auto-restart if configured
    if (
      config.restartOnFailure &&
      execution.restartCount < config.maxRestartAttempts
    ) {
      this.logger.info('Auto-restarting watch task', { taskId, restartCount: execution.restartCount });
      const restartDelay = task.restartDelay ?? config.restartDelay;

      const timer = setTimeout(() => {
        this.startWatchTask(task);
      }, restartDelay);

      // Store timer reference for cleanup
      if (this.runningTasks.has(taskId)) {
        this.runningTasks.get(taskId)!.restartTimer = timer;
      }
    }

    this.logger.info('Watch task terminated', { taskId, duration: execution.duration });
  }

  /**
   * Detect package manager
   */
  private async detectPackageManager(
    rootPath: string,
  ): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      await fs.access(path.join(rootPath, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {
      // pnpm not found
    }

    try {
      await fs.access(path.join(rootPath, 'yarn.lock'));
      return 'yarn';
    } catch {
      // yarn not found
    }

    try {
      await fs.access(path.join(rootPath, 'package-lock.json'));
      return 'npm';
    } catch {
      // npm lock not found, default to npm
    }

    return 'npm';
  }

  /**
   * Update status bar item
   */
  private updateStatusBarItem(): void {
    if (!this.statusBarItem) {
      return;
    }

    const runningCount = this.runningTasks.size;

    if (runningCount === 0) {
      this.statusBarItem.text = '$(eye-watch) Watch';
      this.statusBarItem.tooltip = 'Watch Task Manager';
    } else {
      this.statusBarItem.text = `$(sync~spin) Watch (${runningCount})`;
      this.statusBarItem.tooltip = `Running: ${runningCount} watch task(s)\nClick to manage`;
    }

    const config = this.getConfig();
    if (config.statusBarEnabled) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get config
   */
  private getConfig(): WatchTaskManagerConfig {
    const extensionConfig = this.configService.getConfiguration();

    return {
      enabled: extensionConfig.watchTaskManager?.enabled ?? true,
      autoDetect: extensionConfig.watchTaskManager?.autoDetect ?? true,
      maxOutputLines: extensionConfig.watchTaskManager?.maxOutputLines ?? 1000,
      restartOnFailure: extensionConfig.watchTaskManager?.restartOnFailure ?? false,
      maxRestartAttempts: extensionConfig.watchTaskManager?.maxRestartAttempts ?? 3,
      restartDelay: extensionConfig.watchTaskManager?.restartDelay ?? 2000,
      statusBarEnabled: extensionConfig.watchTaskManager?.statusBarEnabled ?? true,
      showTaskOutput: extensionConfig.watchTaskManager?.showTaskOutput ?? true,
      dedicatedChannels: extensionConfig.watchTaskManager?.dedicatedChannels ?? false,
    };
  }

  public dispose(): void {
    this.logger.debug('Disposing WatchTaskManagerService');

    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];

    this.outputChannels.forEach((channel) => channel.dispose());
    this.outputChannels.clear();

    this.statusBarItem?.dispose();

    // Stop all running watch tasks
    for (const [taskId, runningTask] of this.runningTasks) {
      runningTask.disposable.dispose();
      runningTask.terminal.dispose();
      if (runningTask.restartTimer) {
        clearTimeout(runningTask.restartTimer);
      }
    }
    this.runningTasks.clear();
  }
}
