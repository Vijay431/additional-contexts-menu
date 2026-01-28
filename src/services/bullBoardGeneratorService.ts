import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  BullBoardConfig,
  BullBoardQueue,
  GeneratedBullBoard,
} from '../types/extension';

/**
 * Service for generating Bull Board UI for monitoring Bull queues.
 * Generates dashboard interfaces for viewing, retrying, and removing jobs from Bull queues.
 */
export class BullBoardGeneratorService {
  private static instance: BullBoardGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): BullBoardGeneratorService {
    BullBoardGeneratorService.instance ??= new BullBoardGeneratorService();
    return BullBoardGeneratorService.instance;
  }

  /**
   * Generates a Bull Board UI setup
   */
  public async generateBullBoard(
    _workspacePath: string,
    config: BullBoardConfig,
  ): Promise<GeneratedBullBoard | null> {
    // Get base name for the board
    const boardName = await this.getBoardName();
    if (!boardName) {
      return null;
    }

    // Collect queues to monitor
    const queues = await this.collectQueues(config);
    if (!queues || queues.length === 0) {
      vscode.window.showWarningMessage('No queues defined. Bull Board generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(config, queues);

    // Generate board setup code
    const boardSetupCode = this.generateBoardSetup(boardName, queues, imports, config);

    // Generate UI route handler
    const uiRouteCode = this.generateUIRoute(boardName, config);

    this.logger.info('Bull Board generated', {
      boardName,
      queues: queues.length,
    });

    return {
      boardName,
      queues,
      imports,
      boardSetupCode,
      uiRouteCode,
    };
  }

  /**
   * Prompts user for board name
   */
  private async getBoardName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter board name (e.g., admin, queues, dashboard)',
      placeHolder: 'admin',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Board name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Board name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects queues from user
   */
  private async collectQueues(config: BullBoardConfig): Promise<BullBoardQueue[] | null> {
    const queues: BullBoardQueue[] = [];

    let addMore = true;
    while (addMore) {
      const queue = await this.createQueue(config);
      if (queue) {
        queues.push(queue);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another queue', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another queue or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return queues.length > 0 ? queues : null;
  }

  /**
   * Creates a single queue through user interaction
   */
  private async createQueue(config: BullBoardConfig): Promise<BullBoardQueue | null> {
    // Get queue name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter queue name (camelCase)',
      placeHolder: 'emailQueue',
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

    if (!nameInput) {
      return null;
    }

    const queueName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter queue description (optional, for UI display)',
      placeHolder: 'Email processing queue',
    });

    // Get queue instance variable name
    const instanceInput = await vscode.window.showInputBox({
      prompt: 'Enter queue instance variable name',
      placeHolder: this.ucfirst(queueName),
      value: this.ucfirst(queueName),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Queue instance name cannot be empty';
        }
        return null;
      },
    });

    if (!instanceInput) {
      return null;
    }

    const queue: BullBoardQueue = {
      name: queueName,
      instanceName: instanceInput.trim(),
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      queue.description = trimmedDescription;
    }

    return queue;
  }

  /**
   * Generates imports based on configuration
   */
  private generateImports(config: BullBoardConfig, queues: BullBoardQueue[]): string[] {
    const imports = new Set<string>(['BullAdapter', 'createBullBoard']);

    if (config.framework === 'express') {
      imports.add('express');
      imports.add('router');
    }

    if (config.framework === 'hapi') {
      imports.add('@hapi/hapi');
    }

    if (config.framework === 'fastify') {
      imports.add('fastify');
    }

    if (config.framework === 'koa') {
      imports.add('koa');
      imports.add('koa-router');
    }

    if (config.includeTypescript) {
      imports.add('BullMQAdapter');
    }

    return Array.from(imports);
  }

  /**
   * Generates the board setup code
   */
  private generateBoardSetup(
    boardName: string,
    queues: BullBoardQueue[],
    imports: string[],
    config: BullBoardConfig,
  ): string {
    let code = '';

    // Generate imports
    code += this.generateImportStatements(queues, config);

    // Add Bull Board imports
    code += `import { ${imports.filter((i) => !['express', 'router', '@hapi/hapi', 'fastify', 'koa', 'koa-router'].includes(i)).join(', ')} from '@bull-board/express';\n`;

    if (config.framework === 'express') {
      code += `import { Router } from 'express';\n`;
    }

    if (config.framework === 'hapi') {
      code += `import Hapi from '@hapi/hapi';\n`;
    }

    if (config.framework === 'fastify') {
      code += `import Fastify from 'fastify';\n`;
    }

    if (config.framework === 'koa') {
      code += `import Koa from 'koa';\n`;
      code += `import Router from 'koa-router';\n`;
    }

    code += '\n';

    // Generate Bull Board server setup
    code += `// Create Bull Board server\n`;
    code += `const ${this.ucfirst(boardName)}BoardRouter = createBullBoard({\n`;
    code += `  queues: [\n`;

    for (const queue of queues) {
      code += `    new BullAdapter(${queue.instanceName}),\n`;
    }

    code += `  ],\n`;

    if (config.framework === 'express') {
      code += `  serverAdapter: new ExpressAdapter(),\n`;
    }

    code += `});\n\n`;

    // Set base path
    if (config.framework === 'express') {
      code += `// Set base path for the board UI\n`;
      code += `${this.ucfirst(boardName)}BoardRouter.setBasePath('/${boardName}');\n\n`;
    }

    return code;
  }

  /**
   * Generates UI route code
   */
  private generateUIRoute(boardName: string, config: BullBoardConfig): string {
    let code = '';

    switch (config.framework) {
      case 'express':
        code += `// Register Bull Board UI route\n`;
        code += `app.use('/${boardName}', ${this.ucfirst(boardName)}BoardRouter.getRouter());\n\n`;
        break;

      case 'hapi':
        code += `// Register Bull Board UI route with Hapi\n`;
        code += `server.route({\n`;
        code += `  method: 'GET',\n`;
        code += `  path: '/${boardName}/{p*}',\n`;
        code += `  handler: (request, h) => {\n`;
        code += `    return ${this.ucfirst(boardName)}BoardRouter.getRouter()(request.raw, h.response);\n`;
        code += `  },\n`;
        code += `});\n\n`;
        break;

      case 'fastify':
        code += `// Register Bull Board UI route with Fastify\n`;
        code += `fastify.register(async function (fastify) {\n`;
        code += `  fastify.all('/${boardName}/*', async (request, reply) => {\n`;
        code += `    return ${this.ucfirst(boardName)}BoardRouter.getRouter()(request.raw, reply.raw);\n`;
        code += `  });\n`;
        code += `});\n\n`;
        break;

      case 'koa':
        code += `// Register Bull Board UI route with Koa\n`;
        code += `const ${boardName}Router = new Router();\n`;
        code += `${boardName}Router.all('/${boardName}(/.*)?', async (ctx) => {\n`;
        code += `  return ${this.ucfirst(boardName)}BoardRouter.getRouter()(ctx.req, ctx.res);\n`;
        code += `});\n`;
        code += `app.use(${boardName}Router.routes()).use(${boardName}Router.allowedMethods());\n\n`;
        break;
    }

    // Add helper functions for job management
    if (config.includeJobManagement) {
      code += this.generateJobManagementHelpers(boardName, config);
    }

    return code;
  }

  /**
   * Generates import statements for existing queues
   */
  private generateImportStatements(queues: BullBoardQueue[], config: BullBoardConfig): string {
    let code = '';

    for (const queue of queues) {
      code += `import { ${queue.instanceName} } from './queues/${queue.name}';\n`;
    }

    return code + '\n';
  }

  /**
   * Generates helper functions for job management
   */
  private generateJobManagementHelpers(boardName: string, config: BullBoardConfig): string {
    let code = '';

    code += `// Job Management Helpers\n\n`;

    if (config.includeRetryLogic) {
      code += `/**\n`;
      code += ` * Retry all failed jobs in a queue\n`;
      code += ` */\n`;
      code += `export async function retryFailedJobs(queueName: string): Promise<number> {\n`;
      code += `  const queue = ${this.ucfirst(boardName)}BoardRouter.queues.find(\n`;
      code += `    (q) => q.name === queueName\n`;
      code += `  );\n\n`;
      code += `  if (!queue) {\n`;
      code += `    throw new Error(\`Queue \${queueName} not found\`);\n`;
      code += `  }\n\n`;
      code += `  const failedJobs = await queue.getJobs(['failed']);\n`;
      code += `  let retriedCount = 0;\n\n`;
      code += `  for (const job of failedJobs) {\n`;
      code += `    await job.retry();\n`;
      code += `    retriedCount++;\n`;
      code += `  }\n\n`;
      code += `  return retriedCount;\n`;
      code += `}\n\n`;
    }

    if (config.includeJobRemoval) {
      code += `/**\n`;
      code += ` * Remove all jobs from a queue\n`;
      code += ` */\n`;
      code += `export async function cleanQueue(queueName: string, type: 'completed' | 'failed' | 'all' = 'all'): Promise<number> {\n`;
      code += `  const queue = ${this.ucfirst(boardName)}BoardRouter.queues.find(\n`;
      code += `    (q) => q.name === queueName\n`;
      code += `  );\n\n`;
      code += `  if (!queue) {\n`;
      code += `    throw new Error(\`Queue \${queueName} not found\`);\n`;
      code += `  }\n\n`;
      code += `  const jobTypes = type === 'all' ? ['completed', 'failed', 'waiting', 'active'] : [type];\n`;
      code += `  let removedCount = 0;\n\n`;
      code += `  for (const jobType of jobTypes) {\n`;
      code += `    const jobs = await queue.getJobs([jobType as any]);\n`;
      code += `    for (const job of jobs) {\n`;
      code += `      await job.remove();\n`;
      code += `      removedCount++;\n`;
      code += `    }\n`;
      code += `  }\n\n`;
      code += `  return removedCount;\n`;
      code += `}\n\n`;
    }

    if (config.includeJobPromotion) {
      code += `/**\n`;
      code += ` * Promote delayed jobs to active\n`;
      code += ` */\n`;
      code += `export async function promoteDelayedJobs(queueName: string): Promise<number> {\n`;
      code += `  const queue = ${this.ucfirst(boardName)}BoardRouter.queues.find(\n`;
      code += `    (q) => q.name === queueName\n`;
      code += `  );\n\n`;
      code += `  if (!queue) {\n`;
      code += `    throw new Error(\`Queue \${queueName} not found\`);\n`;
      code += `  }\n\n`;
      code += `  const delayedJobs = await queue.getJobs(['delayed']);\n`;
      code += `  let promotedCount = 0;\n\n`;
      code += `  for (const job of delayedJobs) {\n`;
      code += `    await job.promote();\n`;
      code += `    promotedCount++;\n`;
      code += `  }\n\n`;
      code += `  return promotedCount;\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the board file at the specified path
   */
  public async createBoardFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write board file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Bull Board file created', { filePath });
  }
}
