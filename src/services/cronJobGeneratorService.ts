import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface CronJobGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeExecutionLogging: boolean;
  includeTimeZone: boolean;
  defaultTimeZone: string;
  defaultJobsPath: string;
  exportType: 'named' | 'default';
  onComplete?: 'stop' | 'start';
}

export interface CronJobTask {
  name: string;
  description?: string;
  cronExpression: string;
  isAsync: boolean;
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  includeErrorHandling: boolean;
  includeLogging: boolean;
  timeZone?: string;
}

export interface GeneratedCronJob {
  name: string;
  tasks: CronJobTask[];
  imports: string[];
  jobCode: string;
  filePath: string;
}

/**
 * Service for generating scheduled cron jobs with node-cron
 */
export class CronJobGeneratorService {
  private static instance: CronJobGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CronJobGeneratorService {
    CronJobGeneratorService.instance ??= new CronJobGeneratorService();
    return CronJobGeneratorService.instance;
  }

  /**
   * Generates a cron job file based on user input
   */
  public async generateCronJob(
    workspacePath: string,
    config: CronJobGeneratorConfig,
  ): Promise<GeneratedCronJob | null> {
    // Get job name
    const jobName = await this.getJobName();
    if (!jobName) {
      return null;
    }

    // Collect tasks
    const tasks = await this.collectTasks(config);
    if (!tasks || tasks.length === 0) {
      vscode.window.showWarningMessage('No tasks defined. Job generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(tasks, config);

    // Generate job code
    const jobCode = this.generateJobCode(jobName, tasks, imports, config);

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, jobName, config);

    this.logger.info('Cron job generated', {
      name: jobName,
      tasks: tasks.length,
    });

    return {
      name: jobName,
      tasks,
      imports,
      jobCode,
      filePath,
    };
  }

  /**
   * Prompts user for job name
   */
  private async getJobName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter cron job name (e.g., dataSync, cleanup, backup)',
      placeHolder: 'dataSync',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Job name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Job name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects tasks from user
   */
  private async collectTasks(config: CronJobGeneratorConfig): Promise<CronJobTask[] | null> {
    const tasks: CronJobTask[] = [];

    let addMore = true;
    while (addMore) {
      const task = await this.createTask(config);
      if (task) {
        tasks.push(task);
      }

      if (tasks.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another task', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another task or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return tasks.length > 0 ? tasks : null;
  }

  /**
   * Creates a single task through user interaction
   */
  private async createTask(config: CronJobGeneratorConfig): Promise<CronJobTask | null> {
    // Get task name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter task name',
      placeHolder: 'processData',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Task name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Task name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const name = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter task description (optional)',
      placeHolder: `Executes ${name} on a schedule`,
    });

    // Get cron expression
    const cronExpression = await this.getCronExpression();
    if (!cronExpression) {
      return null;
    }

    // Ask if async
    const isAsyncChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true, description: 'Make task async' },
        { label: 'No', value: false, description: 'Make task synchronous' },
      ],
      { placeHolder: 'Should this task be async?' },
    );

    if (!isAsyncChoice) {
      return null;
    }

    const isAsync = isAsyncChoice.value;

    // Collect parameters
    const parameters = await this.collectParameters();

    // Ask for error handling
    const includeErrorHandling = await this.askForFeature('error handling', config.includeErrorHandling);

    // Ask for logging
    const includeLogging = await this.askForFeature('execution logging', config.includeExecutionLogging);

    // Ask for timezone if enabled in config
    let timeZone: string | undefined;
    if (config.includeTimeZone) {
      const timeZoneInput = await vscode.window.showInputBox({
        prompt: 'Enter timezone (optional)',
        placeHolder: config.defaultTimeZone,
        value: config.defaultTimeZone,
      });
      timeZone = timeZoneInput?.trim() || undefined;
    }

    return {
      name,
      description: description?.trim() || `Executes ${name} on a schedule`,
      cronExpression,
      isAsync,
      parameters,
      includeErrorHandling,
      includeLogging,
      timeZone,
    };
  }

  /**
   * Gets cron expression from user
   */
  private async getCronExpression(): Promise<string | null> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Custom expression',
          value: 'custom',
          description: 'Enter your own cron expression',
        },
        {
          label: 'Every minute',
          value: '* * * * *',
          description: '* * * * *',
        },
        {
          label: 'Every hour',
          value: '0 * * * *',
          description: '0 * * * *',
        },
        {
          label: 'Every day at midnight',
          value: '0 0 * * *',
          description: '0 0 * * *',
        },
        {
          label: 'Every day at noon',
          value: '0 12 * * *',
          description: '0 12 * * *',
        },
        {
          label: 'Every Sunday at midnight',
          value: '0 0 * * 0',
          description: '0 0 * * 0',
        },
        {
          label: 'First day of month at midnight',
          value: '0 0 1 * *',
          description: '0 0 1 * *',
        },
        {
          label: 'Every 5 minutes',
          value: '*/5 * * * *',
          description: '*/5 * * * *',
        },
        {
          label: 'Every 30 minutes',
          value: '*/30 * * * *',
          description: '*/30 * * * *',
        },
      ],
      { placeHolder: 'Select a schedule (cron expression)' },
    );

    if (!choice) {
      return null;
    }

    if (choice.value === 'custom') {
      const customExpression = await vscode.window.showInputBox({
        prompt: 'Enter cron expression (min hour day month weekday)',
        placeHolder: '0 0 * * *',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Cron expression cannot be empty';
          }
          // Basic validation for cron format (5 parts separated by spaces)
          if (!/^(\*|([0-9]|[1-5][0-9]|\*\/[0-9]+)) (\*|([0-9]|1[0-9]|2[0-3]|\\*\/[0-9]+)) (\*|([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])) (\*|([0-6]))$/.test(value.trim())) {
            return 'Invalid cron expression format';
          }
          return null;
        },
      });
      return customExpression?.trim() || null;
    }

    return choice.value;
  }

  /**
   * Collects parameters for a task
   */
  private async collectParameters(): Promise<Array<{ name: string; type: string; description?: string }>> {
    const parameters: Array<{ name: string; type: string; description?: string }> = [];

    let addMore = true;
    while (addMore) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add parameter', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add parameters to task' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name',
        placeHolder: 'data',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Invalid parameter name';
          }
          return null;
        },
      });

      if (!paramName) {
        continue;
      }

      const paramType = await vscode.window.showQuickPick(
        ['string', 'number', 'boolean', 'any', 'object', 'unknown[]'],
        { placeHolder: 'Select parameter type' },
      );

      const paramDesc = await vscode.window.showInputBox({
        prompt: 'Enter parameter description (optional)',
        placeHolder: `The ${paramName} parameter`,
      });

      parameters.push({
        name: paramName.trim(),
        type: paramType || 'any',
        description: paramDesc?.trim() || undefined,
      });
    }

    return parameters;
  }

  /**
   * Asks user if they want to include a feature
   */
  private async askForFeature(feature: string, defaultValue: boolean): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: true, description: `Include ${feature}` },
        { label: 'No', value: false, description: `Do not include ${feature}` },
      ],
      {
        placeHolder: `Include ${feature}?`,
        ignoreFocusOut: true,
      },
    );
    return choice?.value ?? defaultValue;
  }

  /**
   * Generates imports based on tasks and config
   */
  private generateImports(tasks: CronJobTask[], config: CronJobGeneratorConfig): string[] {
    const imports: string[] = ['cron'];

    if (config.includeTypeScript) {
      imports.push('ScheduledTask');
    }

    // Add any custom imports needed by tasks
    for (const task of tasks) {
      if (task.isAsync && config.includeTypeScript) {
        if (!imports.includes('Promise')) {
          imports.push('Promise');
        }
      }
    }

    return imports;
  }

  /**
   * Generates the cron job code
   */
  private generateJobCode(
    jobName: string,
    tasks: CronJobTask[],
    imports: string[],
    config: CronJobGeneratorConfig,
  ): string {
    let code = '';

    // Imports
    if (config.includeTypeScript) {
      const typeScriptImports = imports.filter((imp) => imp === 'ScheduledTask' || imp === 'Promise');
      const nodeCronImports = imports.filter((imp) => imp === 'cron' || imp === 'ScheduledTask');

      if (nodeCronImports.length > 0) {
        code += `import { ${nodeCronImports.join(', ')} } from 'node-cron';\n`;
      }

      if (imports.includes('Promise') && !nodeCronImports.includes('Promise')) {
        code += "import { Promise } from 'node';\n";
      }
    } else {
      code += `const cron = require('node-cron');\n`;
    }

    code += '\n';

    // Generate each task
    for (const task of tasks) {
      code += this.generateTaskCode(jobName, task, config);
      code += '\n';
    }

    // Export
    if (config.exportType === 'named') {
      const tasksVar = this.camelCase(jobName) + 'Tasks';
      code += `export { ${tasksVar} };\n`;
    } else {
      const tasksVar = this.camelCase(jobName) + 'Tasks';
      code += `export default ${tasksVar};\n`;
    }

    return code;
  }

  /**
   * Generates code for a single task
   */
  private generateTaskCode(
    jobName: string,
    task: CronJobTask,
    config: CronJobGeneratorConfig,
  ): string {
    let code = '';

    // JSDoc comment
    code += `/**\n`;
    code += ` * ${task.description}\n`;
    code += ` * Schedule: ${task.cronExpression}\n`;
    if (task.timeZone) {
      code += ` * Timezone: ${task.timeZone}\n`;
    }
    if (task.parameters.length > 0) {
      for (const param of task.parameters) {
        code += ` * @param ${param.name} ${param.type}${param.description ? ' - ' + param.description : ''}\n`;
      }
    }
    code += ` */\n`;

    // Function signature
    const taskFunctionName = this.camelCase(task.name);
    const asyncPrefix = task.isAsync ? 'async ' : '';

    if (config.includeTypeScript) {
      const params = task.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
      code += `function ${asyncPrefix}${taskFunctionName}(${params}): ${task.isAsync ? 'Promise<void>' : 'void'} {\n`;
    } else {
      const params = task.parameters.map((p) => p.name).join(', ');
      code += `function ${asyncPrefix}${taskFunctionName}(${params}) {\n`;
    }

    // Error handling
    if (task.includeErrorHandling) {
      code += `  try {\n`;
      code += `    // TODO: Implement ${task.name} logic\n`;

      if (task.includeLogging) {
        const logMethod = task.isAsync ? 'await logExecution' : 'logExecution';
        code += `    ${logMethod}('${task.name}', true);\n`;
      } else {
        if (task.isAsync) {
          code += `    await execute${this.pascalCase(task.name)}();\n`;
        } else {
          code += `    execute${this.pascalCase(task.name)}();\n`;
        }
      }

      code += `  } catch (error) {\n`;
      if (task.includeLogging) {
        code += `    logExecution('${task.name}', false, error);\n`;
      }
      code += `    console.error('Error executing ${task.name}:', error);\n`;
      code += `  }\n`;
    } else {
      code += `  // TODO: Implement ${task.name} logic\n`;
      if (task.isAsync) {
        code += `  await execute${this.pascalCase(task.name)}();\n`;
      } else {
        code += `  execute${this.pascalCase(task.name)}();\n`;
      }
    }

    code += `}\n\n`;

    // Schedule the task
    const taskVar = `${this.camelCase(task.name)}Task`;

    // Build task options
    let taskOptions: string[] = [];
    if (task.timeZone) {
      taskOptions.push(`timezone: '${task.timeZone}'`);
    }

    const optionsString = taskOptions.length > 0 ? `, { ${taskOptions.join(', ')} }` : '';

    code += `const ${taskVar} = cron.schedule('${task.cronExpression}', ${taskFunctionName}${optionsString});\n`;

    // Note about starting/stopping tasks
    if (config.onComplete === 'stop') {
      code += `\n// The task will start automatically. Use ${taskVar}.stop() to stop it when needed.\n`;
    } else {
      code += `\n// The task will start automatically.\n`;
    }

    return code;
  }

  /**
   * Generates logging function if needed
   */
  private generateLoggingFunction(hasAsyncTasks: boolean): string {
    let code = `function logExecution(taskName: string, success: boolean, error?: unknown): void {\n`;
    code += `  const timestamp = new Date().toISOString();\n`;
    code += `  const status = success ? 'SUCCESS' : 'FAILED';\n`;
    code += `  const message = \`[\${timestamp}] \${taskName}: \${status}\`;\n\n`;
    code += `  console.log(message);\n\n`;
    code += `  if (error) {\n`;
    code += `    console.error('Error details:', error);\n`;
    code += `  }\n`;
    code += `}\n\n`;
    return code;
  }

  /**
   * Calculates file path for the job
   */
  private calculateFilePath(workspacePath: string, jobName: string, config: CronJobGeneratorConfig): string {
    const fileName = `${this.kebabCase(jobName)}.cron${config.includeTypeScript ? '.ts' : '.js'}`;
    return path.join(workspacePath, config.defaultJobsPath, fileName);
  }

  /**
   * Creates the job file at the specified path
   */
  public async createJobFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write job file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Cron job file created', { filePath });
  }

  /**
   * Checks if a job file already exists
   */
  public async jobFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  }

  /**
   * Converts string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_match, char) => char.toUpperCase())
      .replace(/^(.)/, (match) => match.toUpperCase());
  }

  /**
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
