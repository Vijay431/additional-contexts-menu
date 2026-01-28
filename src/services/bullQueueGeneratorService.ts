import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  BullQueueConfig,
  BullQueueJob,
  GeneratedBullQueue,
} from '../types/extension';

/**
 * Service for generating Bull queue job processors with TypeScript typing,
 * retry logic, and error handling
 */
export class BullQueueGeneratorService {
  private static instance: BullQueueGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): BullQueueGeneratorService {
    BullQueueGeneratorService.instance ??= new BullQueueGeneratorService();
    return BullQueueGeneratorService.instance;
  }

  /**
   * Generates a Bull queue processor based on user input
   */
  public async generateQueue(
    _workspacePath: string,
    config: BullQueueConfig,
  ): Promise<GeneratedBullQueue | null> {
    // Get queue name
    const queueName = await this.getQueueName();
    if (!queueName) {
      return null;
    }

    // Collect jobs
    const jobs = await this.collectJobs(config);
    if (!jobs || jobs.length === 0) {
      vscode.window.showWarningMessage('No jobs defined. Queue generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(jobs, config);

    // Generate queue code
    const queueCode = this.generateQueueCode(queueName, jobs, imports, config);

    this.logger.info('Bull queue generated', {
      name: queueName,
      jobs: jobs.length,
    });

    return {
      name: queueName,
      jobs,
      imports,
      queueCode,
    };
  }

  /**
   * Prompts user for queue name
   */
  private async getQueueName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter queue name (e.g., email, notifications, processing)',
      placeHolder: 'email',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Queue name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Queue name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects jobs from user
   */
  private async collectJobs(config: BullQueueConfig): Promise<BullQueueJob[] | null> {
    const jobs: BullQueueJob[] = [];

    let addMore = true;
    while (addMore) {
      const job = await this.createJob(config);
      if (job) {
        jobs.push(job);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another job', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another job or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return jobs.length > 0 ? jobs : null;
  }

  /**
   * Creates a single job through user interaction
   */
  private async createJob(config: BullQueueConfig): Promise<BullQueueJob | null> {
    // Get job name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter job name (camelCase)',
      placeHolder: 'sendEmail',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Job name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Job name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const jobName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter job description (optional, for JSDoc)',
      placeHolder: 'Sends an email to the user',
    });

    // Collect parameters
    const parameters = await this.collectJobParameters();

    // Check if job should handle errors
    let includeErrorHandling = false;
    if (config.includeErrorHandling) {
      const errorHandlingChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, include try-catch', value: 'yes', description: 'Job will have error handling' },
          { label: 'No', value: 'no', description: 'Job will not have explicit error handling' },
        ],
        { placeHolder: 'Include error handling (try-catch)?' },
      );

      includeErrorHandling = errorHandlingChoice?.value === 'yes';
    }

    // Configure retry logic
    let retryConfig = null;
    if (config.includeRetryLogic) {
      const retryChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, configure retries', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Configure retry logic for this job?' },
      );

      if (retryChoice?.value === 'yes') {
        retryConfig = await this.configureRetryLogic();
      }
    }

    // Configure job options
    const jobOptions = await this.configureJobOptions(config);

    const job: BullQueueJob = {
      name: jobName,
      parameters,
      includeErrorHandling,
      retryConfig: retryConfig || undefined,
      jobOptions,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      job.description = trimmedDescription;
    }

    return job;
  }

  /**
   * Collects parameters for a job
   */
  private async collectJobParameters(): Promise<Array<{ name: string; type: string; description?: string }>> {
    const parameters: Array<{ name: string; type: string; description?: string }> = [];

    let addMore = true;
    while (addMore) {
      const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name',
        placeHolder: 'recipientEmail',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Parameter name must start with lowercase letter';
          }
          return null;
        },
      });

      if (!paramName) {
        break;
      }

      const paramType = await vscode.window.showInputBox({
        prompt: 'Enter parameter type',
        placeHolder: 'string | number | boolean | any',
        value: 'string',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter type cannot be empty';
          }
          return null;
        },
      });

      const paramDescription = await vscode.window.showInputBox({
        prompt: 'Enter parameter description (optional)',
      });

      const parameter = {
        name: paramName.trim(),
        type: paramType?.trim() || 'any',
      };

      const trimmedDescription = paramDescription?.trim();
      if (trimmedDescription && trimmedDescription.length > 0) {
        parameter.description = trimmedDescription;
      }

      parameters.push(parameter);

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another parameter', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another parameter?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return parameters;
  }

  /**
   * Configures retry logic for a job
   */
  private async configureRetryLogic(): Promise<{
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
  } | null> {
    const attemptsInput = await vscode.window.showInputBox({
      prompt: 'Enter number of retry attempts',
      placeHolder: '3',
      value: '3',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid number';
        }
        return null;
      },
    });

    if (!attemptsInput) {
      return null;
    }

    const attempts = Number.parseInt(attemptsInput, 10);

    const backoffType = await vscode.window.showQuickPick(
      [
        { label: 'Exponential', value: 'exponential', description: 'Delay increases exponentially with each retry' },
        { label: 'Fixed', value: 'fixed', description: 'Fixed delay between retries' },
      ],
      { placeHolder: 'Select backoff type' },
    );

    if (!backoffType) {
      return null;
    }

    const delayInput = await vscode.window.showInputBox({
      prompt: 'Enter initial delay in milliseconds',
      placeHolder: '2000',
      value: '2000',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid number';
        }
        return null;
      },
    });

    if (!delayInput) {
      return null;
    }

    const delay = Number.parseInt(delayInput, 10);

    return {
      attempts,
      backoff: {
        type: backoffType.value as 'exponential' | 'fixed',
        delay,
      },
    };
  }

  /**
   * Configures job options
   */
  private async configureJobOptions(config: BullQueueConfig): Promise<{
    concurrency?: number;
    delay?: number;
    removeOnComplete?: number;
    removeOnFail?: number;
  }> {
    const options: {
      concurrency?: number;
      delay?: number;
      removeOnComplete?: number;
      removeOnFail?: number;
    } = {};

    // Concurrency
    const concurrencyChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Set concurrency limit for this job?' },
    );

    if (concurrencyChoice?.value === 'yes') {
      const concurrencyInput = await vscode.window.showInputBox({
        prompt: 'Enter concurrency limit',
        placeHolder: '1',
        value: config.defaultConcurrency.toString(),
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < 1) {
            return 'Please enter a valid number greater than 0';
          }
          return null;
        },
      });

      if (concurrencyInput) {
        options.concurrency = Number.parseInt(concurrencyInput, 10);
      }
    }

    // Delay
    const delayChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Add delay before job execution?' },
    );

    if (delayChoice?.value === 'yes') {
      const delayInput = await vscode.window.showInputBox({
        prompt: 'Enter delay in milliseconds',
        placeHolder: '0',
        value: '0',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < 0) {
            return 'Please enter a valid number';
          }
          return null;
        },
      });

      if (delayInput) {
        options.delay = Number.parseInt(delayInput, 10);
      }
    }

    // Remove on complete
    if (config.removeOnComplete !== null) {
      options.removeOnComplete = config.removeOnComplete;
    }

    // Remove on fail
    if (config.removeOnFail !== null) {
      options.removeOnFail = config.removeOnFail;
    }

    return options;
  }

  /**
   * Generates imports based on jobs and configuration
   */
  private generateImports(jobs: BullQueueJob[], config: BullQueueConfig): string[] {
    const imports = new Set<string>(['Queue', 'Worker', 'Job']);

    // Check for retry logic
    if (jobs.some((j) => j.retryConfig)) {
      imports.add('JobOptions');
    }

    // Check for event handlers
    if (config.includeEventHandlers) {
      imports.push('JobState', 'JobStateChangeEvent');
    }

    return Array.from(imports);
  }

  /**
   * Generates the queue code
   */
  private generateQueueCode(
    queueName: string,
    jobs: BullQueueJob[],
    imports: string[],
    config: BullQueueConfig,
  ): string {
    let code = '';

    // Imports
    code += `import { ${imports.join(', ')} } from 'bullmq';\n`;
    code += `import { Redis } from 'ioredis';\n\n`;

    // Generate TypeScript interfaces for job data
    code += this.generateJobInterfaces(queueName, jobs);

    // Queue configuration
    code += `// Create Redis connection\n`;
    code += `const connection = new Redis({\n`;
    code += `  host: process.env.REDIS_HOST || 'localhost',\n`;
    code += `  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),\n`;
    code += `  maxRetriesPerRequest: null,\n`;
    code += `});\n\n`;

    // Create queue
    code += `// Create queue\n`;
    code += `export const ${this.ucfirst(queueName)}Queue = new Queue<${this.ucfirst(queueName)}JobData>('${queueName}', {\n`;
    code += `  connection,\n`;
    code += `  defaultJobOptions: {\n`;
    code += `    removeOnComplete: ${config.removeOnComplete ?? 100},\n`;
    code += `    removeOnFail: ${config.removeOnFail ?? 50},\n`;
    code += `  },\n`;
    code += `});\n\n`;

    // Generate workers
    code += `// Create worker\n`;
    code += `export const ${this.ucfirst(queueName)}Worker = new Worker<${this.ucfirst(queueName)}JobData>(\n`;
    code += `  '${queueName}',\n`;
    code += `  async (job: Job<${this.ucfirst(queueName)}JobData>) => {\n`;
    code += `    return process${this.ucfirst(queueName)}Job(job);\n`;
    code += `  },\n`;
    code += `  {\n`;
    code += `    connection,\n`;
    code += `    concurrency: ${config.defaultConcurrency},\n`;
    code += `  },\n`;
    code += `);\n\n`;

    // Generate processor function
    code += `/**\n`;
    code += ` * Process ${queueName} job\n`;
    code += ` */\n`;
    code += `async function process${this.ucfirst(queueName)}Job(job: Job<${this.ucfirst(queueName)}JobData>): Promise<void> {\n`;
    code += `  const { name } = job;\n`;
    code += `  const data = job.data;\n\n`;
    code += `  switch (name) {\n`;

    for (const job of jobs) {
      code += `    case '${job.name}':\n`;
      code += `      await process${this.ucfirst(job.name)}(data);\n`;
      code += `      break;\n`;
    }

    code += `    default:\n`;
    code += `      throw new Error(\`Unknown job name: \${name}\`);\n`;
    code += `  }\n`;
    code += `}\n\n`;

    // Generate individual job processors
    for (const job of jobs) {
      code += this.generateJobProcessor(queueName, job, config);
      code += '\n';
    }

    // Generate event handlers if configured
    if (config.includeEventHandlers) {
      code += this.generateEventHandlers(queueName);
    }

    return code;
  }

  /**
   * Generates TypeScript interfaces for job data
   */
  private generateJobInterfaces(queueName: string, jobs: BullQueueJob[]): string {
    let code = `// Job data interface\n`;
    code += `export type ${this.ucfirst(queueName)}JobData =\n`;

    const jobTypes = jobs.map((job) => {
      return `  | { name: '${job.name}'; data: ${this.ucfirst(job.name)}Data }`;
    });

    if (jobTypes.length > 0) {
      code += jobTypes.join('\n');
    } else {
      code += `  | { name: string; data: any }`;
    }

    code += ';\n\n';

    // Generate individual job data interfaces
    for (const job of jobs) {
      code += `export interface ${this.ucfirst(job.name)}Data {\n`;
      for (const param of job.parameters) {
        const optional = param.name.endsWith('?') ? '' : ':';
        const paramName = param.name.endsWith('?') ? param.name.slice(0, -1) : param.name;
        code += `  ${paramName}${optional} ${param.type}`;
        if (param.description) {
          code += `; // ${param.description}`;
        } else {
          code += ';';
        }
        code += '\n';
      }
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates a single job processor
   */
  private generateJobProcessor(queueName: string, job: BullQueueJob, config: BullQueueConfig): string {
    let code = '';

    // JSDoc
    code += `/**\n`;
    if (job.description) {
      code += ` * ${this.escapeString(job.description)}\n`;
    }
    for (const param of job.parameters) {
      code += ` * @param data.${param.name} - ${param.description || param.type}\n`;
    }
    code += ` */\n`;
    code += `async function process${this.ucfirst(job.name)}(data: ${this.ucfirst(job.name)}Data): Promise<void> {\n`;

    // Error handling
    if (job.includeErrorHandling) {
      code += `  try {\n`;
      code += `    // TODO: Implement ${job.name} logic\n`;
      code += `    console.log(\`Processing ${job.name}:\`, data);\n`;
      code += `  } catch (error) {\n`;
      code += `    console.error(\`Error processing ${job.name}:\`, error);\n`;
      code += `    throw error; // Re-throw to trigger retry logic\n`;
      code += `  }\n`;
    } else {
      code += `  // TODO: Implement ${job.name} logic\n`;
      code += `  console.log(\`Processing ${job.name}:\`, data);\n`;
    }

    code += `}\n`;

    // Add job helper function
    code += `\n/**\n`;
    code += ` * Add a ${job.name} job to the queue\n`;
    code += ` */\n`;
    code += `export async function add${this.ucfirst(job.name)}Job(\n`;
    code += `  data: ${this.ucfirst(job.name)}Data,\n`;

    if (job.jobOptions.delay || job.retryConfig || job.jobOptions.concurrency) {
      code += `  options?: Partial<JobOptions>,\n`;
    }

    code += `): Promise<Job<${this.ucfirst(queueName)}JobData>> {\n`;

    const jobOptions: string[] = [];
    if (job.jobOptions.delay) {
      jobOptions.push(`delay: ${job.jobOptions.delay}`);
    }
    if (job.retryConfig) {
      jobOptions.push(`attempts: ${job.retryConfig.attempts}`);
      jobOptions.push(`backoff: { type: '${job.retryConfig.backoff.type}', delay: ${job.retryConfig.backoff.delay} }`);
    }
    if (job.jobOptions.concurrency) {
      jobOptions.push(`limiter: { max: ${job.jobOptions.concurrency}, duration: 1000 }`);
    }

    if (jobOptions.length > 0) {
      code += `  return ${this.ucfirst(queueName)}Queue.add('${job.name}', data, {\n`;
      code += `    ${jobOptions.join(',\n    ')}\n`;
      code += `  });\n`;
    } else {
      code += `  return ${this.ucfirst(queueName)}Queue.add('${job.name}', data);\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates event handlers
   */
  private generateEventHandlers(queueName: string): string {
    let code = '';

    code += `// Event handlers\n`;
    code += `${this.ucfirst(queueName)}Worker.on('completed', (job: Job) => {\n`;
    code += `  console.log(\`Job \${job.id} completed with result:\`, job.returnvalue);\n`;
    code += `});\n\n`;

    code += `${this.ucfirst(queueName)}Worker.on('failed', (job: Job | undefined, error: Error) => {\n`;
    code += `  console.error(\`Job \${job?.id} failed with error:\`, error.message);\n`;
    code += `});\n\n`;

    code += `${this.ucfirst(queueName)}Worker.on('progress', (job: Job, progress: number) => {\n`;
    code += `  console.log(\`Job \${job.id} progress: \${progress}%\`);\n`;
    code += `});\n\n`;

    code += `// Queue event handlers\n`;
    code += `${this.ucfirst(queueName)}Queue.on('waiting', (jobId: string) => {\n`;
    code += `  console.log(\`Job \${jobId} is waiting\`);\n`;
    code += `});\n\n`;

    code += `${this.ucfirst(queueName)}Queue.on('active', (job: Job) => {\n`;
    code += `  console.log(\`Job \${job.id} is now active\`);\n`;
    code += `});\n\n`;

    code += `// Graceful shutdown\n`;
    code += `async function close${this.ucfirst(queueName)}Queue(): Promise<void> {\n`;
    code += `  await ${this.ucfirst(queueName)}Worker.close();\n`;
    code += `  await ${this.ucfirst(queueName)}Queue.close();\n`;
    code += `  await connection.quit();\n`;
    code += `}\n\n`;

    code += `process.on('SIGTERM', async () => {\n`;
    code += `  await close${this.ucfirst(queueName)}Queue();\n`;
    code += `  process.exit(0);\n`;
    code += `});\n`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Escapes string for use in comments
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Creates the queue file at the specified path
   */
  public async createQueueFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write queue file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Queue file created', { filePath });
  }
}
