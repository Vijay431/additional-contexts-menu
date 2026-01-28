import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  RabbitMQConsumerConfig,
  RabbitMQQueue,
  GeneratedRabbitMQConsumer,
} from '../types/extension';

/**
 * Service for generating RabbitMQ consumers with prefetch,
 * ACK handling, retry logic, and dead letter exchanges
 */
export class RabbitMQConsumerGeneratorService {
  private static instance: RabbitMQConsumerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RabbitMQConsumerGeneratorService {
    RabbitMQConsumerGeneratorService.instance ??= new RabbitMQConsumerGeneratorService();
    return RabbitMQConsumerGeneratorService.instance;
  }

  /**
   * Generates a RabbitMQ consumer based on user input
   */
  public async generateConsumer(
    _workspacePath: string,
    config: RabbitMQConsumerConfig,
  ): Promise<GeneratedRabbitMQConsumer | null> {
    // Get consumer name
    const consumerName = await this.getConsumerName();
    if (!consumerName) {
      return null;
    }

    // Collect queues
    const queues = await this.collectQueues(config);
    if (!queues || queues.length === 0) {
      vscode.window.showWarningMessage('No queues defined. Consumer generation cancelled.');
      return null;
    }

    // Get connection string
    const connectionString = await this.getConnectionString();
    if (!connectionString) {
      return null;
    }

    // Generate imports
    const imports = this.generateImports(queues, config);

    // Generate consumer code
    const consumerCode = this.generateConsumerCode(
      consumerName,
      connectionString,
      queues,
      imports,
      config,
    );

    this.logger.info('RabbitMQ consumer generated', {
      consumerName,
      queueCount: queues.length,
    });

    return {
      consumerName,
      connectionString,
      queues,
      imports,
      consumerCode,
    };
  }

  /**
   * Prompts user for consumer name
   */
  private async getConsumerName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter consumer name (e.g., order-processor, user-events)',
      placeHolder: 'order-processor',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Consumer name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Consumer name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for RabbitMQ connection string
   */
  private async getConnectionString(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter RabbitMQ connection string (e.g., amqp://guest:guest@localhost:5672)',
      placeHolder: 'amqp://guest:guest@localhost:5672',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Connection string cannot be empty';
        }
        if (!value.startsWith('amqp://') && !value.startsWith('amqps://')) {
          return 'Connection string must start with amqp:// or amqps://';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects queues from user
   */
  private async collectQueues(config: RabbitMQConsumerConfig): Promise<RabbitMQQueue[] | null> {
    const queues: RabbitMQQueue[] = [];

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
  private async createQueue(config: RabbitMQConsumerConfig): Promise<RabbitMQQueue | null> {
    // Get queue name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter queue name',
      placeHolder: 'orders',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Queue name cannot be empty';
        }
        if (!/^[a-z][a-z0-9._-]*$/.test(value)) {
          return 'Queue name must start with lowercase letter and contain only lowercase letters, numbers, dots, underscores, and hyphens';
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
      prompt: 'Enter queue description (optional, for JSDoc)',
      placeHolder: 'Processes order messages',
    });

    // Get exchange name
    const exchange = await vscode.window.showInputBox({
      prompt: 'Enter exchange name',
      placeHolder: 'orders-exchange',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Exchange name cannot be empty';
        }
        return null;
      },
    });

    if (!exchange) {
      return null;
    }

    // Get exchange type
    const exchangeTypeChoice = await vscode.window.showQuickPick(
      [
        { label: 'direct', value: 'direct', description: 'Routes messages to queues based on exact routing key match' },
        { label: 'topic', value: 'topic', description: 'Routes messages based on pattern matching of routing key' },
        { label: 'fanout', value: 'fanout', description: 'Broadcasts messages to all bound queues' },
        { label: 'headers', value: 'headers', description: 'Routes messages based on message headers' },
      ],
      { placeHolder: 'Select exchange type' },
    );

    const exchangeType = (exchangeTypeChoice?.value || 'direct') as 'direct' | 'topic' | 'fanout' | 'headers';

    // Get routing key
    const routingKey = await vscode.window.showInputBox({
      prompt: 'Enter routing key',
      placeHolder: 'order.created',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Routing key cannot be empty';
        }
        return null;
      },
    });

    if (!routingKey) {
      return null;
    }

    // Collect message schema properties
    const messageProperties = await this.collectMessageProperties();

    // Get message type name
    const messageType = await this.getMessageType(queueName);

    // Check if queue handler should include error handling
    let includeErrorHandling = false;
    if (config.includeErrorHandling) {
      const errorHandlingChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, include try-catch', value: 'yes', description: 'Handler will have error handling' },
          { label: 'No', value: 'no', description: 'Handler will not have explicit error handling' },
        ],
        { placeHolder: 'Include error handling (try-catch)?' },
      );

      includeErrorHandling = errorHandlingChoice?.value === 'yes';
    }

    // Configure consumer options
    const consumerOptions = await this.configureConsumerOptions(config);

    const trimmedDescription = description?.trim();
    const queue: RabbitMQQueue = {
      name: queueName,
      exchange: exchange.trim(),
      exchangeType,
      routingKey: routingKey.trim(),
      messageType,
      messageProperties,
      includeErrorHandling,
      consumerOptions,
      ...(trimmedDescription && trimmedDescription.length > 0 && { description: trimmedDescription }),
    };

    return queue;
  }

  /**
   * Collects message schema properties for type safety
   */
  private async collectMessageProperties(): Promise<Array<{ name: string; type: string; description?: string }>> {
    const properties: Array<{ name: string; type: string; description?: string }> = [];

    let addMore = true;
    while (addMore) {
      const propName = await vscode.window.showInputBox({
        prompt: 'Enter property name',
        placeHolder: 'orderId',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Property name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Property name must start with lowercase letter';
          }
          return null;
        },
      });

      if (!propName) {
        break;
      }

      const propType = await vscode.window.showQuickPick(
        [
          { label: 'string', value: 'string' },
          { label: 'number', value: 'number' },
          { label: 'boolean', value: 'boolean' },
          { label: 'Date', value: 'Date' },
          { label: 'object', value: 'object' },
          { label: 'any', value: 'any' },
        ],
        {
          placeHolder: 'Select property type',
        },
      );

      const propDescription = await vscode.window.showInputBox({
        prompt: 'Enter property description (optional)',
      });

      const trimmedDescription = propDescription?.trim();
      const property = {
        name: propName.trim(),
        type: propType?.value || 'string',
        ...(trimmedDescription && trimmedDescription.length > 0 && { description: trimmedDescription }),
      };

      properties.push(property);

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another property', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another property?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return properties.length > 0 ? properties : [{ name: 'data', type: 'any', description: 'Message payload' }];
  }

  /**
   * Gets message type name for the queue
   */
  private async getMessageType(queueName: string): Promise<string> {
    const defaultTypeName = this.ucfirst(queueName).replace(/-/g, '') + 'Message';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter message type name',
      placeHolder: defaultTypeName,
      value: defaultTypeName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Type name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Type name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim() || defaultTypeName;
  }

  /**
   * Configures consumer options for a queue
   */
  private async configureConsumerOptions(config: RabbitMQConsumerConfig): Promise<{
    prefetch?: number;
    durable?: boolean;
    requeue?: boolean;
    timeout?: number;
    maxRetries?: number;
  }> {
    const options: {
      prefetch?: number;
      durable?: boolean;
      requeue?: boolean;
      timeout?: number;
      maxRetries?: number;
    } = {};

    // Prefetch count
    const prefetchInput = await vscode.window.showInputBox({
      prompt: 'Enter prefetch count (number of unacknowledged messages)',
      placeHolder: '10',
      value: '10',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 1) {
          return 'Please enter a valid number >= 1';
        }
        return null;
      },
    });

    if (prefetchInput) {
      options.prefetch = Number.parseInt(prefetchInput, 10);
    }

    // Durable queue
    const durableChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Queue survives broker restart' },
        { label: 'No', value: 'no', description: 'Queue is transient' },
      ],
      { placeHolder: 'Make queue durable?' },
    );

    if (durableChoice?.value === 'yes') {
      options.durable = true;
    }

    // Requeue on failure
    const requeueChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Requeue message on failure' },
        { label: 'No', value: 'no', description: 'Do not requeue (send to DLX if configured)' },
      ],
      { placeHolder: 'Requeue messages on failure?' },
    );

    if (requeueChoice) {
      options.requeue = requeueChoice.value === 'yes';
    }

    // Timeout
    const timeoutInput = await vscode.window.showInputBox({
      prompt: 'Enter message timeout in milliseconds (optional)',
      placeHolder: '30000',
    });

    if (timeoutInput) {
      const timeout = Number.parseInt(timeoutInput, 10);
      if (!Number.isNaN(timeout) && timeout > 0) {
        options.timeout = timeout;
      }
    }

    // Max retries
    if (config.includeRetryLogic) {
      const maxRetriesInput = await vscode.window.showInputBox({
        prompt: 'Enter maximum number of retries',
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

      if (maxRetriesInput) {
        options.maxRetries = Number.parseInt(maxRetriesInput, 10);
      }
    }

    return options;
  }

  /**
   * Generates imports based on queues and configuration
   */
  private generateImports(_queues: RabbitMQQueue[], _config: RabbitMQConsumerConfig): string[] {
    const imports = new Set<string>([
      'connect',
      'Channel',
      'Connection',
      'Message',
    ]);

    // Add dead letter exchange imports if configured
    // (handled in code generation)

    return Array.from(imports);
  }

  /**
   * Generates the consumer code
   */
  private generateConsumerCode(
    consumerName: string,
    connectionString: string,
    queues: RabbitMQQueue[],
    imports: string[],
    config: RabbitMQConsumerConfig,
  ): string {
    let code = '';

    // Imports
    code += `import { ${imports.join(', ')} } from 'amqplib';\n\n`;

    // Generate TypeScript interfaces for message types
    code += this.generateMessageInterfaces(queues);

    // Consumer class
    const className = this.ucfirst(this.sanitizeName(consumerName));
    code += `/**\n`;
    code += ` * RabbitMQ Consumer for ${this.escapeString(consumerName)}\n`;
    code += ` */\n`;
    code += `export class ${className}Consumer {\n`;
    code += `  private connection: Connection | null = null;\n`;
    code += `  private channel: Channel | null = null;\n\n`;

    // Constructor
    code += `  constructor() {}\n\n`;

    // Connect method
    code += `  /**\n`;
    code += `   * Connect to RabbitMQ and setup channel\n`;
    code += `   */\n`;
    code += `  async connect(): Promise<void> {\n`;
    code += `    this.connection = await connect('${connectionString}');\n`;
    code += `    this.channel = await this.connection.createChannel();\n\n`;

    // Set prefetch
    const prefetchCount = queues[0].consumerOptions?.prefetch ?? 10;
    code += `    // Set prefetch to limit unacknowledged messages\n`;
    code += `    await this.channel.prefetch(${prefetchCount});\n\n`;

    code += `    // Setup exchanges and queues\n`;
    for (const queue of queues) {
      code += `    await this.setup${this.ucfirst(this.sanitizeName(queue.name))}Queue();\n`;
    }
    code += `  }\n\n`;

    // Setup queue methods
    for (const queue of queues) {
      code += this.generateQueueSetupMethod(className, queue, config);
      code += '\n';
    }

    // Start consuming method
    code += `  /**\n`;
    code += `   * Start consuming messages\n`;
    code += `   */\n`;
    code += `  async start(): Promise<void> {\n`;
    code += `    if (!this.channel) {\n`;
    code += `      throw new Error('Channel not initialized. Call connect() first.');\n`;
    code += `    }\n\n`;

    for (const queue of queues) {
      code += `    await this.consume${this.ucfirst(this.sanitizeName(queue.name))}();\n`;
    }
    code += `  }\n\n`;

    // Consume methods
    for (const queue of queues) {
      code += this.generateConsumeMethod(className, queue, config);
      code += '\n';
    }

    // Message handlers
    for (const queue of queues) {
      code += this.generateMessageHandler(queue);
      code += '\n';
    }

    // Close method
    code += `  /**\n`;
    code += `   * Close connection\n`;
    code += `   */\n`;
    code += `  async close(): Promise<void> {\n`;
    code += `    if (this.channel) {\n`;
    code += `      await this.channel.close();\n`;
    code += `    }\n`;
    code += `    if (this.connection) {\n`;
    code += `      await this.connection.close();\n`;
    code += `    }\n`;
    code += `  }\n`;
    code += `}\n\n`;

    // Generate instance and helper functions
    code += `// Consumer instance\n`;
    code += `const consumer = new ${className}Consumer();\n\n`;

    // Start function
    code += `/**\n`;
    code += ` * Start the consumer\n`;
    code += ` */\n`;
    code += `export async function start${className}Consumer(): Promise<void> {\n`;
    code += `  await consumer.connect();\n`;
    code += `  await consumer.start();\n`;
    code += `  console.log('${className} consumer started');\n`;
    code += `}\n\n`;

    // Stop function
    code += `/**\n`;
    code += ` * Stop the consumer\n`;
    code += ` */\n`;
    code += `export async function stop${className}Consumer(): Promise<void> {\n`;
    code += `  await consumer.close();\n`;
    code += `  console.log('${className} consumer stopped');\n`;
    code += `}\n\n`;

    // Error handlers
    code += this.generateErrorHandlers(className);

    return code;
  }

  /**
   * Generates TypeScript interfaces for message types
   */
  private generateMessageInterfaces(queues: RabbitMQQueue[]): string {
    let code = `// Message type interfaces\n`;

    for (const queue of queues) {
      code += `export interface ${queue.messageType} {\n`;
      for (const prop of queue.messageProperties) {
        code += `  ${prop.name}: ${prop.type}`;
        if (prop.description) {
          code += `; // ${prop.description}`;
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
   * Generates queue setup method
   */
  private generateQueueSetupMethod(
    className: string,
    queue: RabbitMQQueue,
    config: RabbitMQConsumerConfig,
  ): string {
    let code = '';
    const methodName = `setup${this.ucfirst(this.sanitizeName(queue.name))}Queue`;

    code += `  /**\n`;
    if (queue.description) {
      code += `   * ${this.escapeString(queue.description)}\n`;
    }
    code += `   */\n`;
    code += `  private async ${methodName}(): Promise<void> {\n`;
    code += `    if (!this.channel) {\n`;
    code += `      throw new Error('Channel not initialized');\n`;
    code += `    }\n\n`;

    // Assert exchange
    code += `    // Assert exchange\n`;
    code += `    await this.channel.assertExchange('${queue.exchange}', '${queue.exchangeType}', {\n`;
    code += `      durable: ${queue.consumerOptions?.durable ? 'true' : 'false'},\n`;
    code += `    });\n\n`;

    // Assert queue
    code += `    // Assert queue\n`;
    code += `    await this.channel.assertQueue('${queue.name}', {\n`;
    code += `      durable: ${queue.consumerOptions?.durable ? 'true' : 'false'},\n`;
    if (config.includeDeadLetterExchange) {
      const dlxName = `${queue.name}-dlx`;
      code += `      deadLetterExchange: '${dlxName}',\n`;
    }
    code += `    });\n\n`;

    // Bind queue
    code += `    // Bind queue to exchange\n`;
    code += `    await this.channel.bindQueue('${queue.name}', '${queue.exchange}', '${queue.routingKey}');\n\n`;

    // Setup dead letter exchange if configured
    if (config.includeDeadLetterExchange) {
      const dlxName = `${queue.name}-dlx`;
      const dlqName = `${queue.name}-dlq`;
      code += `    // Setup dead letter exchange\n`;
      code += `    await this.channel.assertExchange('${dlxName}', '${queue.exchangeType}', {\n`;
      code += `      durable: ${queue.consumerOptions?.durable ? 'true' : 'false'},\n`;
      code += `    });\n`;
      code += `    await this.channel.assertQueue('${dlqName}', {\n`;
      code += `      durable: ${queue.consumerOptions?.durable ? 'true' : 'false'},\n`;
      code += `    });\n`;
      code += `    await this.channel.bindQueue('${dlqName}', '${dlxName}', '${queue.routingKey}');\n\n`;
    }

    code += `    console.log('Queue ${queue.name} setup complete');\n`;
    code += `  }\n`;

    return code;
  }

  /**
   * Generates consume method
   */
  private generateConsumeMethod(
    className: string,
    queue: RabbitMQQueue,
    config: RabbitMQConsumerConfig,
  ): string {
    let code = '';
    const methodName = `consume${this.ucfirst(this.sanitizeName(queue.name))}`;
    const handlerName = `handle${this.ucfirst(this.sanitizeName(queue.name))}`;

    code += `  /**\n`;
    code += `   * Start consuming from ${queue.name}\n`;
    code += `   */\n`;
    code += `  private async ${methodName}(): Promise<void> {\n`;
    code += `    if (!this.channel) {\n`;
    code += `      throw new Error('Channel not initialized');\n`;
    code += `    }\n\n`;

    code += `    await this.channel.consume('${queue.name}', async (msg) => {\n`;
    code += `      if (!msg) {\n`;
    code += `        return;\n`;
    code += `      }\n\n`;

    code += `      try {\n`;
    code += `        const content = msg.content.toString();\n`;
    code += `        const message: ${queue.messageType} = JSON.parse(content);\n\n`;

    if (config.includeRetryLogic && queue.consumerOptions?.maxRetries) {
      code += `        const retryCount = msg.properties.headers?.['x-retry-count'] || 0;\n`;
      code += `        if (retryCount >= ${queue.consumerOptions.maxRetries}) {\n`;
      code += `          console.error('Max retries exceeded for ${queue.name}');\n`;
      code += `          this.channel?.nack(msg, false, false);\n`;
      code += `          return;\n`;
      code += `        }\n\n`;
    }

    code += `        await this.${handlerName}(message);\n\n`;
    code += `        // Acknowledge message\n`;
    code += `        this.channel!.ack(msg);\n`;
    code += `      } catch (error) {\n`;
    code += `        console.error('Error processing message:', error);\n`;
    code += `        const requeue = ${queue.consumerOptions?.requeue ? 'true' : 'false'};\n`;
    code += `        this.channel!.nack(msg, false, requeue);\n`;
    code += `      }\n`;
    if (queue.consumerOptions?.timeout) {
      code += `    }, {\n`;
      code += `      noAck: false,\n`;
      code += `    });\n`;
    } else {
      code += `    });\n`;
    }
    code += `  }\n`;

    return code;
  }

  /**
   * Generates message handler
   */
  private generateMessageHandler(queue: RabbitMQQueue): string {
    let code = '';
    const handlerName = `handle${this.ucfirst(this.sanitizeName(queue.name))}`;

    code += `  /**\n`;
    if (queue.description) {
      code += `   * ${this.escapeString(queue.description)}\n`;
    }
    for (const prop of queue.messageProperties) {
      code += `   * @param message.${prop.name} - ${prop.description || prop.type}\n`;
    }
    code += `   */\n`;
    code += `  private async ${handlerName}(message: ${queue.messageType}): Promise<void> {\n`;

    if (queue.includeErrorHandling) {
      code += `    try {\n`;
      code += `      // TODO: Implement ${queue.name} processing logic\n`;
      code += `      console.log('Processing ${queue.name}:', message);\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error('Error in ${handlerName}:', error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
    } else {
      code += `    // TODO: Implement ${queue.name} processing logic\n`;
      code += `    console.log('Processing ${queue.name}:', message);\n`;
    }

    code += `  }\n`;

    return code;
  }

  /**
   * Generates error handlers
   */
  private generateErrorHandlers(className: string): string {
    let code = '';

    code += `// Error handlers\n`;
    code += `process.on('SIGTERM', async () => {\n`;
    code += `  await stop${className}Consumer();\n`;
    code += `  process.exit(0);\n`;
    code += `});\n\n`;

    code += `process.on('SIGINT', async () => {\n`;
    code += `  await stop${className}Consumer();\n`;
    code += `  process.exit(0);\n`;
    code += `});\n\n`;

    code += `process.on('uncaughtException', async (error) => {\n`;
    code += `  console.error('Uncaught exception:', error);\n`;
    code += `  await stop${className}Consumer();\n`;
    code += `  process.exit(1);\n`;
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
   * Sanitizes name for use in identifiers
   */
  private sanitizeName(str: string): string {
    return str.replace(/-/g, '').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Escapes string for use in comments
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Creates the consumer file at the specified path
   */
  public async createConsumerFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write consumer file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Consumer file created', { filePath });
  }

  /**
   * Gets consumer generation options from user
   */
  public async getConsumerGenerationOptions(): Promise<RabbitMQConsumerConfig | undefined> {
    // Ask for error handling preference
    const errorHandlingChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Include error handling in handlers' },
        { label: 'No', value: 'no', description: 'No error handling' },
      ],
      {
        placeHolder: 'Include error handling?',
      },
    );

    if (!errorHandlingChoice) {
      return undefined;
    }

    // Ask for retry logic preference
    const retryChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Include retry logic with max retries' },
        { label: 'No', value: 'no', description: 'No retry logic' },
      ],
      {
        placeHolder: 'Include retry logic?',
      },
    );

    if (!retryChoice) {
      return undefined;
    }

    // Ask for dead letter exchange preference
    const dlxChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Include dead letter exchange setup' },
        { label: 'No', value: 'no', description: 'No dead letter exchange' },
      ],
      {
        placeHolder: 'Include dead letter exchange?',
      },
    );

    if (!dlxChoice) {
      return undefined;
    }

    return {
      enabled: true,
      includeErrorHandling: errorHandlingChoice.value === 'yes',
      includeRetryLogic: retryChoice.value === 'yes',
      includeDeadLetterExchange: dlxChoice.value === 'yes',
      defaultConsumerPath: 'src/consumers',
    };
  }
}
