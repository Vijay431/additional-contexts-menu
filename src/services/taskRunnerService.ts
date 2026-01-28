import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type {
  TaskDefinition,
  TaskError,
  TaskExecution,
  TaskHistory,
  TaskListOptions,
  TaskOutputLine,
  TaskOutputParseResult,
  TaskRunOptions,
  TaskRunnerDetectionResult,
  TaskRunnerType,
  TaskStatus,
} from '../types/extension';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

interface RunningTask {
  task: TaskDefinition;
  execution: TaskExecution;
  terminal: vscode.Terminal;
  disposable: vscode.Disposable;
  outputChannel: vscode.OutputChannel;
}

interface TaskQuickPickItem extends vscode.QuickPickItem {
  task: TaskDefinition;
}

interface RunnerQuickPickItem extends vscode.QuickPickItem {
  runner: TaskRunnerType;
}

export class TaskRunnerService {
  private static instance: TaskRunnerService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;
  private disposables: vscode.Disposable[] = [];
  private runningTasks = new Map<string, RunningTask>();
  private taskHistory = new Map<string, TaskHistory>();
  private outputChannels = new Map<TaskRunnerType, vscode.OutputChannel>();
  private statusBarItem: vscode.StatusBarItem | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): TaskRunnerService {
    TaskRunnerService.instance ??= new TaskRunnerService();
    return TaskRunnerService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing TaskRunnerService');

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'additionalContextMenus.showTaskList';
    this.statusBarItem.tooltip = 'Show Task List';
    this.updateStatusBarItem();

    // Auto-detect and refresh task list
    const config = this.configService.getConfiguration();
    if (config.taskRunner?.autoDetect) {
      await this.detectTaskRunners();
      this.startAutoRefresh();
    }

    this.logger.info('TaskRunnerService initialized successfully');
  }

  /**
   * Detect available task runners and tasks in the workspace
   */
  public async detectTaskRunners(): Promise<TaskRunnerDetectionResult> {
    const startTime = Date.now();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return {
        runners: [],
        packageManager: 'npm',
        tasks: [],
        configFiles: [],
        detectionDuration: 0,
      };
    }

    const config = this.configService.getConfiguration();
    const supportedRunners = config.taskRunner?.supportedRunners ?? [
      'npm',
      'yarn',
      'pnpm',
      'gulp',
      'grunt',
      'webpack',
    ];

    const runners: TaskRunnerType[] = [];
    const tasks: TaskDefinition[] = [];
    const configFiles: string[] = [];

    // Detect package manager
    const packageManager = await this.detectPackageManager();

    // Detect npm/yarn/pnpm scripts
    if (
      supportedRunners.includes('npm') ||
      supportedRunners.includes('yarn') ||
      supportedRunners.includes('pnpm')
    ) {
      const npmTasks = await this.detectNpmTasks(workspaceFolder.uri.fsPath, packageManager);
      tasks.push(...npmTasks);
      if (npmTasks.length > 0) {
        runners.push(packageManager);
      }
    }

    // Detect Gulp
    if (supportedRunners.includes('gulp')) {
      const gulpResult = await this.detectGulpTasks(workspaceFolder.uri.fsPath);
      if (gulpResult.detected) {
        runners.push('gulp');
        tasks.push(...gulpResult.tasks);
        if (gulpResult.configFile) {
          configFiles.push(gulpResult.configFile);
        }
      }
    }

    // Detect Grunt
    if (supportedRunners.includes('grunt')) {
      const gruntResult = await this.detectGruntTasks(workspaceFolder.uri.fsPath);
      if (gruntResult.detected) {
        runners.push('grunt');
        tasks.push(...gruntResult.tasks);
        if (gruntResult.configFile) {
          configFiles.push(gruntResult.configFile);
        }
      }
    }

    // Detect Webpack
    if (supportedRunners.includes('webpack')) {
      const webpackResult = await this.detectWebpackTasks(workspaceFolder.uri.fsPath);
      if (webpackResult.detected) {
        runners.push('webpack');
        tasks.push(...webpackResult.tasks);
        if (webpackResult.configFile) {
          configFiles.push(webpackResult.configFile);
        }
      }
    }

    const detectionDuration = Date.now() - startTime;

    this.logger.info('Task runners detected', {
      runners,
      packageManager,
      taskCount: tasks.length,
      detectionDuration,
    });

    return {
      runners,
      packageManager,
      tasks,
      configFiles,
      detectionDuration,
    };
  }

  /**
   * Show task list view
   */
  public async showTaskList(options?: TaskListOptions): Promise<void> {
    const config = this.configService.getConfiguration();
    if (!config.taskRunner?.enabled) {
      vscode.window.showInformationMessage('Task Runner is disabled in settings');
      return;
    }

    const detectionResult = await this.detectTaskRunners();

    if (detectionResult.tasks.length === 0) {
      vscode.window.showInformationMessage('No tasks found in workspace');
      return;
    }

    const listOptions: TaskListOptions = options ?? {
      showStatus: true,
      showCategory: true,
      showSource: true,
    };

    // Filter tasks if needed
    let filteredTasks = detectionResult.tasks;
    if (listOptions.filterRunner && listOptions.filterRunner.length > 0) {
      filteredTasks = filteredTasks.filter((t) => listOptions.filterRunner!.includes(t.type));
    }

    // Group tasks by category
    const groupedTasks = new Map<string, TaskDefinition[]>();
    for (const task of filteredTasks) {
      const category = task.category ?? 'Other';
      const tasks = groupedTasks.get(category) ?? [];
      tasks.push(task);
      groupedTasks.set(category, tasks);
    }

    // Create quick pick items
    const items: TaskQuickPickItem[] = [];
    for (const [category, tasks] of groupedTasks) {
      // Add category header
      items.push({
        label: category,
        description: '',
        kind: vscode.QuickPickItemKind.Separator,
        task: tasks[0]!,
      } as unknown as TaskQuickPickItem);

      // Add tasks in category
      for (const task of tasks) {
        const isRunning = this.runningTasks.has(task.id);
        const statusIcon = isRunning ? '$(sync~spin)' : '$(play)';
        const history = this.taskHistory.get(task.id);
        const lastRun = history?.lastExecution
          ? this.formatDuration(history.lastExecution.duration ?? 0)
          : '';

        items.push({
          label: `${statusIcon} ${task.name}`,
          description: task.description ?? task.command,
          detail: listOptions.showSource ? `${task.type} - ${task.source}` : undefined,
          task,
        });
      }
    }

    // Add action buttons
    items.push(
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
        task: filteredTasks[0]!,
      } as unknown as TaskQuickPickItem,
      {
        label: '$(refresh) Refresh Tasks',
        description: 'Re-detect all tasks in workspace',
        task: filteredTasks[0]!,
      },
      {
        label: '$(list-tree) View Task History',
        description: 'Show execution history',
        task: filteredTasks[0]!,
      },
      {
        label: '$(close-all) Stop All Tasks',
        description: 'Stop all running tasks',
        task: filteredTasks[0]!,
      },
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a task to run (${filteredTasks.length} tasks, ${this.runningTasks.size} running)`,
      ignoreFocusOut: true,
    });

    if (!selected) {
      return;
    }

    // Handle action buttons
    if (selected.label.includes('Refresh Tasks')) {
      await this.showTaskList(options);
      return;
    }

    if (selected.label.includes('View Task History')) {
      await this.showTaskHistory();
      return;
    }

    if (selected.label.includes('Stop All Tasks')) {
      await this.stopAllTasks();
      return;
    }

    // Run selected task
    await this.runTask(selected.task);
  }

  /**
   * Run a task
   */
  public async runTask(
    task: TaskDefinition,
    options?: Partial<TaskRunOptions>,
  ): Promise<TaskExecution | undefined> {
    // Check if already running
    if (this.runningTasks.has(task.id)) {
      const continueRunning = await vscode.window.showWarningMessage(
        `Task '${task.name}' is already running. Run again?`,
        'Yes',
        'No',
      );
      if (continueRunning !== 'Yes') {
        return;
      }
    }

    const config = this.configService.getConfiguration();
    const runOptions: TaskRunOptions = {
      showOutput: options?.showOutput ?? config.taskRunner?.showOutputPanel ?? true,
      clearPrevious: options?.clearPrevious ?? config.taskRunner?.clearOutputOnRun ?? true,
      saveOutput: options?.saveOutput ?? config.taskRunner?.saveOutputToFile ?? false,
      focusTerminal: options?.focusTerminal ?? true,
      maxOutputLines: options?.maxOutputLines ?? config.taskRunner?.maxOutputLines ?? 1000,
      parseErrors: options?.parseErrors ?? config.taskRunner?.showErrorParsing ?? true,
      stopOnError: options?.stopOnError ?? false,
    };

    // Create terminal name
    const terminalName = `Task: ${task.name}`;

    // Create or reuse terminal
    let terminal: vscode.Terminal;
    if (config.taskRunner?.defaultTerminalBehavior === 'create-new') {
      terminal = vscode.window.createTerminal(terminalName);
    } else {
      const existing = vscode.window.terminals.find((t) => t.name === terminalName);
      if (existing) {
        terminal = existing;
        if (runOptions.clearPrevious) {
          terminal.sendText('clear');
        }
      } else {
        terminal = vscode.window.createTerminal(terminalName);
      }
    }

    // Create output channel
    let outputChannel = this.outputChannels.get(task.type);
    if (!outputChannel) {
      outputChannel = vscode.window.createOutputChannel(`Task Runner: ${task.type}`);
      this.outputChannels.set(task.type, outputChannel);
    }

    if (runOptions.clearPrevious) {
      outputChannel.clear();
    }

    outputChannel.show(true);
    outputChannel.appendLine(`[${new Date().toISOString()}] Starting task: ${task.name}`);
    outputChannel.appendLine(`Command: ${task.command} ${task.args?.join(' ') ?? ''}`);
    outputChannel.appendLine('---');

    // Build command
    const command = this.buildTaskCommand(task);

    // Create execution record
    const execution: TaskExecution = {
      taskId: task.id,
      status: 'running',
      startTime: Date.now(),
      outputLines: [],
      errorCount: 0,
      warningCount: 0,
    };

    // Track running task
    const runningTask: RunningTask = {
      task,
      execution,
      terminal,
      disposable: vscode.window.onDidCloseTerminal((closed) => {
        if (closed === terminal) {
          this.handleTaskTermination(task.id, 0);
        }
      }),
      outputChannel,
    };

    this.runningTasks.set(task.id, runningTask);
    this.updateStatusBarItem();

    // Send command to terminal
    terminal.sendText(command);

    if (runOptions.focusTerminal) {
      terminal.show();
    }

    vscode.window.showInformationMessage(`Running task: ${task.name}`);
    this.logger.info('Task started', { taskId: task.id, command });

    // Update history
    this.updateTaskHistory(task, execution);

    return execution;
  }

  /**
   * Stop a running task
   */
  public async stopTask(taskId: string): Promise<boolean> {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) {
      return false;
    }

    const { task, terminal } = runningTask;

    // Send Ctrl+C to stop the task
    terminal.sendText('\x03');

    vscode.window.showInformationMessage(`Stopping task: ${task.name}`);
    this.logger.info('Task stopping', { taskId });

    return true;
  }

  /**
   * Stop all running tasks
   */
  public async stopAllTasks(): Promise<void> {
    const runningTaskIds = Array.from(this.runningTasks.keys());

    if (runningTaskIds.length === 0) {
      vscode.window.showInformationMessage('No running tasks');
      return;
    }

    for (const taskId of runningTaskIds) {
      await this.stopTask(taskId);
    }

    vscode.window.showInformationMessage(`Stopping ${runningTaskIds.length} task(s)`);
  }

  /**
   * Show task history
   */
  public async showTaskHistory(): Promise<void> {
    const historyArray = Array.from(this.taskHistory.values()).sort(
      (a, b) => (b.lastExecution?.startTime ?? 0) - (a.lastExecution?.startTime ?? 0),
    );

    if (historyArray.length === 0) {
      vscode.window.showInformationMessage('No task history available');
      return;
    }

    const items = historyArray.map((history) => {
      const lastExec = history.lastExecution;
      const statusIcon =
        lastExec?.status === 'completed'
          ? '$(pass)'
          : lastExec?.status === 'failed'
            ? '$(error)'
            : '$(circle-outline)';
      const duration = lastExec?.duration ? this.formatDuration(lastExec.duration) : 'N/A';
      const successRate = Math.round(history.successRate * 100);

      return {
        label: `${statusIcon} ${history.taskName}`,
        description: `Total runs: ${history.totalRuns} | Success: ${successRate}% | Last: ${duration}`,
        history,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a task to view history',
    });

    if (!selected) {
      return;
    }

    // Show detailed history
    await this.showTaskHistoryDetail(selected.history);
  }

  /**
   * Detect package manager (npm, yarn, pnpm)
   */
  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return 'npm';
    }

    // Check for lock files
    const rootPath = workspaceFolder.uri.fsPath;

    try {
      // Check for pnpm-lock.yaml
      await fs.access(path.join(rootPath, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {
      // pnpm not found
    }

    try {
      // Check for yarn.lock
      await fs.access(path.join(rootPath, 'yarn.lock'));
      return 'yarn';
    } catch {
      // yarn not found
    }

    try {
      // Check for package-lock.json
      await fs.access(path.join(rootPath, 'package-lock.json'));
      return 'npm';
    } catch {
      // npm lock not found, default to npm
    }

    return 'npm';
  }

  /**
   * Detect npm scripts
   */
  private async detectNpmTasks(
    rootPath: string,
    packageManager: 'npm' | 'yarn' | 'pnpm',
  ): Promise<TaskDefinition[]> {
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

      const tasks: TaskDefinition[] = [];

      for (const [name, script] of Object.entries(packageJson.scripts)) {
        // Determine category based on script name
        let category = 'Other';
        if (name.startsWith('dev') || name.startsWith('start') || name.startsWith('serve')) {
          category = 'Development';
        } else if (name === 'build' || name.startsWith('build:')) {
          category = 'Build';
        } else if (name === 'test' || name.startsWith('test:')) {
          category = 'Test';
        } else if (name === 'lint' || name.startsWith('lint') || name.startsWith('format')) {
          category = 'Lint & Format';
        } else if (name.startsWith('db:')) {
          category = 'Database';
        } else if (name.startsWith('clean')) {
          category = 'Utilities';
        }

        tasks.push({
          id: `${packageManager}-${name}`,
          name,
          type: packageManager,
          command: `${packageManager} run`,
          args: [name],
          description: String(script),
          category,
          source: 'package.json',
          sourceFile: packageJsonPath,
        });
      }

      return tasks;
    } catch (error) {
      this.logger.error('Error reading package.json', error);
      return [];
    }
  }

  /**
   * Detect Gulp tasks
   */
  private async detectGulpTasks(rootPath: string): Promise<{
    detected: boolean;
    tasks: TaskDefinition[];
    configFile?: string;
  }> {
    const gulpfiles = ['gulpfile.js', 'gulpfile.ts', 'gulpfile.mjs', 'gulpfile.cjs', 'Gulpfile.js'];

    for (const gulpfile of gulpfiles) {
      const gulpfilePath = path.join(rootPath, gulpfile);
      try {
        await fs.access(gulpfilePath);

        // Try to run gulp --tasks to get task list
        // For now, return a placeholder task
        return {
          detected: true,
          tasks: [
            {
              id: 'gulp-default',
              name: 'default',
              type: 'gulp',
              command: 'npx',
              args: ['gulp'],
              description: 'Run default Gulp task',
              category: 'Build',
              source: 'gulpfile',
              sourceFile: gulpfilePath,
            },
          ],
          configFile: gulpfilePath,
        };
      } catch {
        // Gulpfile not found
      }
    }

    return { detected: false, tasks: [] };
  }

  /**
   * Detect Grunt tasks
   */
  private async detectGruntTasks(rootPath: string): Promise<{
    detected: boolean;
    tasks: TaskDefinition[];
    configFile?: string;
  }> {
    const gruntfiles = [
      'Gruntfile.js',
      'gruntfile.js',
      'Gruntfile.ts',
      'gruntfile.ts',
      'Gruntfile.coffee',
    ];

    for (const gruntfile of gruntfiles) {
      const gruntfilePath = path.join(rootPath, gruntfile);
      try {
        await fs.access(gruntfilePath);

        return {
          detected: true,
          tasks: [
            {
              id: 'grunt-default',
              name: 'default',
              type: 'grunt',
              command: 'npx',
              args: ['grunt'],
              description: 'Run default Grunt task',
              category: 'Build',
              source: 'gruntfile',
              sourceFile: gruntfilePath,
            },
          ],
          configFile: gruntfilePath,
        };
      } catch {
        // Gruntfile not found
      }
    }

    return { detected: false, tasks: [] };
  }

  /**
   * Detect Webpack tasks
   */
  private async detectWebpackTasks(rootPath: string): Promise<{
    detected: boolean;
    tasks: TaskDefinition[];
    configFile?: string;
  }> {
    const webpackConfigs = [
      'webpack.config.js',
      'webpack.config.ts',
      'webpackfile.js',
      'webpack.config.babel.js',
      'webpack.config.prod.js',
      'webpack.config.dev.js',
    ];

    for (const config of webpackConfigs) {
      const configPath = path.join(rootPath, config);
      try {
        await fs.access(configPath);

        return {
          detected: true,
          tasks: [
            {
              id: 'webpack-build',
              name: 'build',
              type: 'webpack',
              command: 'npx',
              args: ['webpack', '--config', config],
              description: 'Run Webpack build',
              category: 'Build',
              source: 'webpack.config',
              sourceFile: configPath,
            },
            {
              id: 'webpack-watch',
              name: 'watch',
              type: 'webpack',
              command: 'npx',
              args: ['webpack', '--watch', '--config', config],
              description: 'Run Webpack in watch mode',
              category: 'Development',
              source: 'webpack.config',
              sourceFile: configPath,
            },
          ],
          configFile: configPath,
        };
      } catch {
        // Config not found
      }
    }

    return { detected: false, tasks: [] };
  }

  /**
   * Build task command
   */
  private buildTaskCommand(task: TaskDefinition): string {
    const parts = [task.command];
    if (task.args) {
      parts.push(...task.args);
    }
    return parts.join(' ');
  }

  /**
   * Handle task termination
   */
  private handleTaskTermination(taskId: string, exitCode: number): void {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) {
      return;
    }

    const { task, execution, outputChannel, disposable } = runningTask;

    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime!;
    execution.exitCode = exitCode;
    execution.status = exitCode === 0 ? 'completed' : exitCode === 130 ? 'stopped' : 'failed';

    outputChannel.appendLine('---');
    outputChannel.appendLine(
      `[${new Date().toISOString()}] Task ${execution.status}: ${task.name}`,
    );
    outputChannel.appendLine(`Duration: ${this.formatDuration(execution.duration)}`);
    outputChannel.appendLine(`Exit code: ${exitCode}`);

    disposable.dispose();
    this.runningTasks.delete(taskId);
    this.updateStatusBarItem();

    this.updateTaskHistory(task, execution);

    this.logger.info('Task terminated', {
      taskId,
      status: execution.status,
      exitCode,
      duration: execution.duration,
    });
  }

  /**
   * Update task history
   */
  private updateTaskHistory(task: TaskDefinition, execution: TaskExecution): void {
    let history = this.taskHistory.get(task.id);

    if (!history) {
      history = {
        taskId: task.id,
        taskName: task.name,
        executions: [],
        lastExecution: null,
        totalRuns: 0,
        successRate: 0,
      };
      this.taskHistory.set(task.id, history);
    }

    history.executions.push(execution);
    history.lastExecution = execution;
    history.totalRuns++;

    // Calculate success rate
    const completedCount = history.executions.filter((e) => e.status === 'completed').length;
    history.successRate = completedCount / history.totalRuns;
  }

  /**
   * Show task history detail
   */
  private async showTaskHistoryDetail(history: TaskHistory): Promise<void> {
    const executions = history.executions
      .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
      .slice(0, 20);

    const items = executions.map((exec) => {
      const statusIcon =
        exec.status === 'completed'
          ? '$(pass)'
          : exec.status === 'failed'
            ? '$(error)'
            : exec.status === 'running'
              ? '$(sync~spin)'
              : '$(circle-outline)';
      const time = exec.startTime ? new Date(exec.startTime).toLocaleString() : 'N/A';
      const duration = exec.duration ? this.formatDuration(exec.duration) : 'N/A';

      return {
        label: `${statusIcon} ${time}`,
        description: `Duration: ${duration} | Status: ${exec.status}`,
        execution: exec,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Execution history for: ${history.taskName}`,
      canPickMany: false,
    });

    if (selected) {
      // Show execution details
      await this.showExecutionDetail(selected.execution);
    }
  }

  /**
   * Show execution detail
   */
  private async showExecutionDetail(execution: TaskExecution): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'taskExecutionDetail',
      `Task Execution - ${execution.taskId}`,
      vscode.ViewColumn.One,
      { enableScripts: false },
    );

    const statusColor =
      execution.status === 'completed'
        ? '#4ec9b0'
        : execution.status === 'failed'
          ? '#f48771'
          : '#dcdcaa';

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Execution Detail</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 1rem;
          }
          .status {
            font-size: 2rem;
            color: ${statusColor};
            margin-bottom: 1rem;
          }
          .info {
            margin-bottom: 0.5rem;
          }
          .label {
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="status">${execution.status}</div>
        <div class="info"><span class="label">Task ID:</span> ${this.escapeHtml(execution.taskId)}</div>
        <div class="info"><span class="label">Started:</span> ${execution.startTime ? new Date(execution.startTime).toLocaleString() : 'N/A'}</div>
        <div class="info"><span class="label">Ended:</span> ${execution.endTime ? new Date(execution.endTime).toLocaleString() : 'N/A'}</div>
        <div class="info"><span class="label">Duration:</span> ${execution.duration ? this.formatDuration(execution.duration) : 'N/A'}</div>
        <div class="info"><span class="label">Exit Code:</span> ${execution.exitCode ?? 'N/A'}</div>
        <div class="info"><span class="label">Errors:</span> ${execution.errorCount}</div>
        <div class="info"><span class="label">Warnings:</span> ${execution.warningCount}</div>
        <div class="info"><span class="label">Output Lines:</span> ${execution.outputLines.length}</div>
      </body>
      </html>
    `;
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
      this.statusBarItem.text = '$(list-tree) Tasks';
      this.statusBarItem.tooltip = 'Show Task List';
    } else {
      this.statusBarItem.text = `$(sync~spin) Tasks (${runningCount})`;
      this.statusBarItem.tooltip = `Running: ${runningCount} task(s)\nClick to view`;
    }

    const config = this.configService.getConfiguration();
    if (config.taskRunner?.statusBarEnabled ?? true) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Start auto refresh timer
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    const config = this.configService.getConfiguration();
    const interval = config.taskRunner?.taskListRefreshInterval ?? 60000; // Default 1 minute

    this.refreshTimer = setInterval(() => {
      this.detectTaskRunners().catch((error) => {
        this.logger.error('Error auto-detecting task runners', error);
      });
    }, interval);
  }

  /**
   * Parse task output for errors and warnings
   */
  public parseOutput(output: string, source?: string): TaskOutputParseResult {
    const errors: TaskError[] = [];
    const warnings: TaskError[] = [];
    const lines = output.split('\n');

    const outputLines: TaskOutputLine[] = lines.map((line, index) => ({
      timestamp: Date.now(),
      text: line,
      type: 'stdout',
      source,
      lineNumber: index,
    }));

    // Common error patterns
    const errorPatterns = [
      // TypeScript/JavaScript errors
      /([^:]+):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/i,
      /Error:\s*(.+)/i,
      // ESLint errors
      /([^:]+):(\d+):(\d+):\s*(.+?)\s*\[Error\/(.+?)\]/,
      // Generic errors
      /(.+?)\s+error:\s*(.+)/i,
    ];

    // Warning patterns
    const warningPatterns = [
      /([^:]+):(\d+):(\d+)\s*-\s*warning\s+(TS\d+):\s*(.+)/i,
      /Warning:\s*(.+)/i,
      /([^:]+):(\d+):(\d+):\s*(.+?)\s*\[Warning\/(.+?)\]/,
    ];

    for (const line of lines) {
      // Check for errors
      for (const pattern of errorPatterns) {
        const match = line.match(pattern);
        if (match) {
          errors.push({
            file: match[1] || 'unknown',
            line: match[2] ? parseInt(match[2], 10) : 0,
            column: match[3] ? parseInt(match[3], 10) : undefined,
            message: match[4] || match[1] || 'Unknown error',
            type: 'error',
            source,
            code: match[4]?.match(/TS\d+/)?.[0],
          });
          break;
        }
      }

      // Check for warnings
      for (const pattern of warningPatterns) {
        const match = line.match(pattern);
        if (match) {
          warnings.push({
            file: match[1] || 'unknown',
            line: match[2] ? parseInt(match[2], 10) : 0,
            column: match[3] ? parseInt(match[3], 10) : undefined,
            message: match[4] || match[1] || 'Unknown warning',
            type: 'warning',
            source,
            code: match[4]?.match(/TS\d+/)?.[0],
          });
          break;
        }
      }
    }

    return { errors, warnings, outputLines };
  }

  /**
   * Format duration in human-readable format
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
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]!);
  }

  /**
   * Get running tasks
   */
  public getRunningTasks(): RunningTask[] {
    return Array.from(this.runningTasks.values());
  }

  /**
   * Get task history
   */
  public getTaskHistory(): TaskHistory[] {
    return Array.from(this.taskHistory.values());
  }

  public dispose(): void {
    this.logger.debug('Disposing TaskRunnerService');

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];

    this.outputChannels.forEach((channel) => channel.dispose());
    this.outputChannels.clear();

    this.statusBarItem?.dispose();

    // Stop all running tasks
    for (const [taskId, runningTask] of this.runningTasks) {
      runningTask.disposable.dispose();
      runningTask.terminal.dispose();
    }
    this.runningTasks.clear();
  }
}
