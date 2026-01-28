import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  KafkaConsumerConfig,
  KafkaConsumerTopic,
  GeneratedKafkaConsumer,
} from '../types/extension';

/**
 * Service for generating Kafka consumer groups with typed handlers,
 * message deserialization, and error handling strategies
 */
export class KafkaConsumerGeneratorService {
  private static instance: KafkaConsumerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): KafkaConsumerGeneratorService {
    KafkaConsumerGeneratorService.instance ??= new KafkaConsumerGeneratorService();
    return KafkaConsumerGeneratorService.instance;
  }

  /**
   * Generates a Kafka consumer group based on user input
   */
  public async generateConsumer(
    _workspacePath: string,
    config: KafkaConsumerConfig,
  ): Promise<GeneratedKafkaConsumer | null> {
    // Get consumer group name
    const groupName = await this.getGroupName();
    if (!groupName) {
      return null;
    }

    // Collect topics
    const topics = await this.collectTopics(config);
    if (!topics || topics.length === 0) {
      vscode.window.showWarningMessage('No topics defined. Consumer generation cancelled.');
      return null;
    }

    // Get Kafka brokers
    const brokers = await this.getBrokers();
    if (!brokers) {
      return null;
    }

    // Get consumer group ID
    const groupId = await this.getGroupId(groupName);
    if (!groupId) {
      return null;
    }

    // Generate imports
    const imports = this.generateImports(topics, config);

    // Generate consumer code
    const consumerCode = this.generateConsumerCode(
      groupName,
      groupId,
      brokers,
      topics,
      imports,
      config,
    );

    this.logger.info('Kafka consumer generated', {
      groupName,
      topicCount: topics.length,
    });

    return {
      groupName,
      groupId,
      brokers,
      topics,
      imports,
      consumerCode,
    };
  }

  /**
   * Prompts user for consumer group name
   */
  private async getGroupName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter consumer group name (e.g., order-processor, user-events)',
      placeHolder: 'order-processor',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Group name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Group name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for Kafka brokers
   */
  private async getBrokers(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter Kafka brokers (comma-separated, e.g., localhost:9092)',
      placeHolder: 'localhost:9092',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Brokers cannot be empty';
        }
        const brokers = value.split(',').map((b) => b.trim());
        for (const broker of brokers) {
          if (!/^[\w.-]+:\d+$/.test(broker)) {
            return `Invalid broker format: ${broker}. Expected format: host:port`;
          }
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for consumer group ID
   */
  private async getGroupId(groupName: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter consumer group ID',
      placeHolder: groupName,
      value: groupName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Group ID cannot be empty';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects topics from user
   */
  private async collectTopics(config: KafkaConsumerConfig): Promise<KafkaConsumerTopic[] | null> {
    const topics: KafkaConsumerTopic[] = [];

    let addMore = true;
    while (addMore) {
      const topic = await this.createTopic(config);
      if (topic) {
        topics.push(topic);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another topic', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another topic or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return topics.length > 0 ? topics : null;
  }

  /**
   * Creates a single topic through user interaction
   */
  private async createTopic(config: KafkaConsumerConfig): Promise<KafkaConsumerTopic | null> {
    // Get topic name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter topic name',
      placeHolder: 'orders',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Topic name cannot be empty';
        }
        if (!/^[a-z][a-z0-9._-]*$/.test(value)) {
          return 'Topic name must start with lowercase letter and contain only lowercase letters, numbers, dots, underscores, and hyphens';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const topicName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter topic description (optional, for JSDoc)',
      placeHolder: 'Processes order events',
    });

    // Collect message schema properties
    const messageProperties = await this.collectMessageProperties();

    // Get message type name
    const messageType = await this.getMessageType(topicName);

    // Check if topic handler should include error handling
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

    // Configure retry strategy
    let retryStrategy = null;
    if (config.includeRetryStrategy) {
      const retryChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, configure retries', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Configure retry strategy for this topic?' },
      );

      if (retryChoice?.value === 'yes') {
        retryStrategy = await this.configureRetryStrategy();
      }
    }

    // Configure consumer options
    const consumerOptions = await this.configureConsumerOptions(config);

    const trimmedDescription = description?.trim();
    const topic: KafkaConsumerTopic = {
      name: topicName,
      messageType,
      messageProperties,
      includeErrorHandling,
      ...(retryStrategy && { retryStrategy }),
      consumerOptions,
      ...(trimmedDescription && trimmedDescription.length > 0 && { description: trimmedDescription }),
    };

    return topic;
  }

  /**
   * Collects message schema properties for deserialization
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

    return properties;
  }

  /**
   * Gets message type name for the topic
   */
  private async getMessageType(topicName: string): Promise<string> {
    const defaultTypeName = this.ucfirst(topicName).replace(/-/g, '') + 'Message';
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
   * Configures retry strategy for a topic
   */
  private async configureRetryStrategy(): Promise<{
    maxRetries: number;
    initialRetryDelay: number;
    backoffMultiplier: number;
    maxRetryDelay: number;
  } | null> {
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

    if (!maxRetriesInput) {
      return null;
    }

    const maxRetries = Number.parseInt(maxRetriesInput, 10);

    const initialDelayInput = await vscode.window.showInputBox({
      prompt: 'Enter initial retry delay in milliseconds',
      placeHolder: '1000',
      value: '1000',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid number';
        }
        return null;
      },
    });

    if (!initialDelayInput) {
      return null;
    }

    const initialRetryDelay = Number.parseInt(initialDelayInput, 10);

    const backoffMultiplierInput = await vscode.window.showInputBox({
      prompt: 'Enter backoff multiplier (e.g., 2 for exponential backoff)',
      placeHolder: '2',
      value: '2',
      validateInput: (value) => {
        const num = Number.parseFloat(value);
        if (Number.isNaN(num) || num < 1) {
          return 'Please enter a valid number >= 1';
        }
        return null;
      },
    });

    if (!backoffMultiplierInput) {
      return null;
    }

    const backoffMultiplier = Number.parseFloat(backoffMultiplierInput);

    const maxDelayInput = await vscode.window.showInputBox({
      prompt: 'Enter maximum retry delay in milliseconds',
      placeHolder: '30000',
      value: '30000',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid number';
        }
        return null;
      },
    });

    if (!maxDelayInput) {
      return null;
    }

    const maxRetryDelay = Number.parseInt(maxDelayInput, 10);

    return {
      maxRetries,
      initialRetryDelay,
      backoffMultiplier,
      maxRetryDelay,
    };
  }

  /**
   * Configures consumer options for a topic
   */
  private async configureConsumerOptions(_config: KafkaConsumerConfig): Promise<{
    fromBeginning?: boolean;
    autoCommit?: boolean;
    sessionId?: string;
    partitionAssignmentStrategy?: string;
  }> {
    const options: {
      fromBeginning?: boolean;
      autoCommit?: boolean;
      sessionId?: string;
      partitionAssignmentStrategy?: string;
    } = {};

    // From beginning
    const fromBeginningChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Start consuming from the beginning of the topic' },
        { label: 'No', value: 'no', description: 'Start consuming from the latest offset' },
      ],
      { placeHolder: 'Start from beginning?' },
    );

    if (fromBeginningChoice?.value === 'yes') {
      options.fromBeginning = true;
    }

    // Auto commit
    const autoCommitChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Enable auto commit?' },
    );

    if (autoCommitChoice?.value === 'yes') {
      options.autoCommit = true;
    }

    return options;
  }

  /**
   * Generates imports based on topics and configuration
   */
  private generateImports(topics: KafkaConsumerTopic[], config: KafkaConsumerConfig): string[] {
    const imports = new Set<string>(['Kafka', 'Consumer', 'EachMessagePayload']);

    // Check for retry strategy
    if (topics.some((t) => t.retryStrategy)) {
      // No additional imports needed for retry logic
    }

    // Check for specific deserializers
    if (config.includeDeserialization) {
      imports.add('KafkaMessage');
    }

    return Array.from(imports);
  }

  /**
   * Generates the consumer code
   */
  private generateConsumerCode(
    groupName: string,
    groupId: string,
    brokers: string,
    topics: KafkaConsumerTopic[],
    imports: string[],
    config: KafkaConsumerConfig,
  ): string {
    let code = '';

    // Imports
    code += `import { ${imports.join(', ')} } from 'kafkajs';\n\n`;

    // Generate TypeScript interfaces for message types
    code += this.generateMessageInterfaces(topics);

    // Kafka configuration
    code += `// Kafka configuration\n`;
    code += `const kafka = new Kafka({\n`;
    code += `  clientId: '${this.sanitizeName(groupName)}-consumer',\n`;
    code += `  brokers: [${brokers.split(',').map((b) => `'${b.trim()}'`).join(', ')}],\n`;
    code += `});\n\n`;

    // Create consumer
    code += `// Create consumer\n`;
    code += `export const ${this.ucfirst(this.sanitizeName(groupName))}Consumer = kafka.consumer({\n`;
    code += `  groupId: '${groupId}',\n`;
    code += `});\n\n`;

    // Generate topic handlers
    for (const topic of topics) {
      code += this.generateTopicHandler(groupName, topic, config);
      code += '\n';
    }

    // Generate consumer run function
    code += this.generateConsumerRunFunction(groupName, topics, config);

    // Generate shutdown handler
    code += this.generateShutdownHandler(groupName);

    return code;
  }

  /**
   * Generates TypeScript interfaces for message types
   */
  private generateMessageInterfaces(topics: KafkaConsumerTopic[]): string {
    let code = `// Message type interfaces\n`;

    for (const topic of topics) {
      code += `export interface ${topic.messageType} {\n`;
      for (const prop of topic.messageProperties) {
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
   * Generates a single topic handler
   */
  private generateTopicHandler(
    groupName: string,
    topic: KafkaConsumerTopic,
    config: KafkaConsumerConfig,
  ): string {
    let code = '';

    const handlerName = `handle${this.ucfirst(this.sanitizeName(topic.name))}`;

    // JSDoc
    code += `/**\n`;
    if (topic.description) {
      code += ` * ${this.escapeString(topic.description)}\n`;
    }
    for (const prop of topic.messageProperties) {
      code += ` * @param message.${prop.name} - ${prop.description || prop.type}\n`;
    }
    code += ` */\n`;
    code += `async function ${handlerName}(message: ${topic.messageType}): Promise<void> {\n`;

    // Error handling
    if (topic.includeErrorHandling) {
      code += `  try {\n`;
      code += `    // TODO: Implement ${topic.name} processing logic\n`;
      code += `    console.log(\`Processing ${topic.name}:\`, message);\n`;
      code += `  } catch (error) {\n`;
      code += `    console.error(\`Error processing ${topic.name}:\`, error);\n`;
      if (topic.retryStrategy) {
        code += `    // Retry logic is handled at the consumer level\n`;
      } else {
        code += `    throw error; // Re-throw to trigger retry if configured\n`;
      }
      code += `  }\n`;
    } else {
      code += `  // TODO: Implement ${topic.name} processing logic\n`;
      code += `  console.log(\`Processing ${topic.name}:\`, message);\n`;
    }

    code += `}\n`;

    // Add message deserializer helper
    code += `\n/**\n`;
    code += ` * Deserialize message from Kafka\n`;
    code += ` */\n`;
    code += `function deserialize${topic.messageType}(value: Buffer): ${topic.messageType} {\n`;
    if (config.includeDeserialization) {
      code += `  const messageStr = value.toString('utf-8');\n`;
      code += `  return JSON.parse(messageStr) as ${topic.messageType};\n`;
    } else {
      code += `  // Default: assume JSON\n`;
      code += `  const messageStr = value.toString('utf-8');\n`;
      code += `  return JSON.parse(messageStr) as ${topic.messageType};\n`;
    }
    code += `}\n`;

    return code;
  }

  /**
   * Generates the consumer run function
   */
  private generateConsumerRunFunction(
    groupName: string,
    topics: KafkaConsumerTopic[],
    _config: KafkaConsumerConfig,
  ): string {
    let code = '';
    const className = this.ucfirst(this.sanitizeName(groupName));

    code += `/**\n`;
    code += ` * Start consuming messages\n`;
    code += ` */\n`;
    code += `export async function run${className}Consumer(): Promise<void> {\n`;
    code += `  await ${className}Consumer.connect();\n`;
    code += `  await ${className}Consumer.subscribe({\n`;
    code += `    topics: [${topics.map((t) => `'${t.name}'`).join(', ')}],\n`;
    code += `    fromBeginning: ${topics.some((t) => t.consumerOptions?.fromBeginning) ? 'true' : 'false'},\n`;
    code += `  });\n\n`;

    code += `  await ${className}Consumer.run({\n`;
    code += `    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {\n`;
    code += `      try {\n`;
    code += `        // Route to appropriate handler based on topic\n`;
    code += `        switch (topic) {\n`;

    for (const topic of topics) {
      const handlerName = `handle${this.ucfirst(this.sanitizeName(topic.name))}`;
      const messageType = topic.messageType;
      const deserializer = `deserialize${messageType}`;

      code += `          case '${topic.name}':\n`;
      code += `            const message${messageType} = ${deserializer}(message.value);\n`;
      code += `            await ${handlerName}(message${messageType});\n`;
      code += `            break;\n`;
    }

    code += `          default:\n`;
    code += `            console.warn(\`Unknown topic: \${topic}\`);\n`;
    code += `        }\n`;
    code += `      } catch (error) {\n`;
    code += `        console.error(\`Error processing message from topic \${topic}:\`, error);\n`;
    code += `        // Implement retry logic or dead letter queue here\n`;
    code += `      }\n`;
    code += `    },\n`;
    code += `  });\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates the shutdown handler
   */
  private generateShutdownHandler(groupName: string): string {
    let code = '';
    const className = this.ucfirst(this.sanitizeName(groupName));

    code += `\n// Graceful shutdown\n`;
    code += `export async function stop${className}Consumer(): Promise<void> {\n`;
    code += `  console.log('Stopping ${className} consumer...');\n`;
    code += `  await ${className}Consumer.disconnect();\n`;
    code += `  console.log('${className} consumer stopped');\n`;
    code += `}\n\n`;

    code += `// Handle process termination\n`;
    code += `process.on('SIGTERM', async () => {\n`;
    code += `  await stop${className}Consumer();\n`;
    code += `  process.exit(0);\n`;
    code += `});\n\n`;

    code += `process.on('SIGINT', async () => {\n`;
    code += `  await stop${className}Consumer();\n`;
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
  public async getConsumerGenerationOptions(): Promise<KafkaConsumerConfig | undefined> {
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

    // Ask for retry strategy preference
    const retryChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Include retry strategy configuration' },
        { label: 'No', value: 'no', description: 'No retry strategy' },
      ],
      {
        placeHolder: 'Include retry strategy?',
      },
    );

    if (!retryChoice) {
      return undefined;
    }

    return {
      enabled: true,
      includeErrorHandling: errorHandlingChoice.value === 'yes',
      includeRetryStrategy: retryChoice.value === 'yes',
      includeDeserialization: true,
      defaultConsumerPath: 'src/consumers',
    };
  }
}
