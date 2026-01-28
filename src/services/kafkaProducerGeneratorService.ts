import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  KafkaProducerConfig,
  KafkaProducerTopic,
  GeneratedKafkaProducer,
} from '../types/extension';

/**
 * Service for generating Kafka producers with typed messages,
 * serialization, and delivery guarantee configurations
 */
export class KafkaProducerGeneratorService {
  private static instance: KafkaProducerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): KafkaProducerGeneratorService {
    KafkaProducerGeneratorService.instance ??= new KafkaProducerGeneratorService();
    return KafkaProducerGeneratorService.instance;
  }

  /**
   * Generates a Kafka producer based on user input
   */
  public async generateProducer(
    _workspacePath: string,
    config: KafkaProducerConfig,
  ): Promise<GeneratedKafkaProducer | null> {
    // Get producer name
    const producerName = await this.getProducerName();
    if (!producerName) {
      return null;
    }

    // Collect topics
    const topics = await this.collectTopics(config);
    if (!topics || topics.length === 0) {
      vscode.window.showWarningMessage('No topics defined. Producer generation cancelled.');
      return null;
    }

    // Get Kafka brokers
    const brokers = await this.getBrokers();
    if (!brokers) {
      return null;
    }

    // Get producer options
    const producerOptions = await this.getProducerOptions();

    // Generate imports
    const imports = this.generateImports(topics, config);

    // Generate producer code
    const producerCode = this.generateProducerCode(
      producerName,
      brokers,
      topics,
      producerOptions,
      imports,
      config,
    );

    this.logger.info('Kafka producer generated', {
      producerName,
      topicCount: topics.length,
    });

    return {
      producerName,
      brokers,
      topics,
      imports,
      producerCode,
    };
  }

  /**
   * Prompts user for producer name
   */
  private async getProducerName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter producer name (e.g., events-producer, orders-producer)',
      placeHolder: 'events-producer',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Producer name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Producer name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
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
   * Prompts user for producer options
   */
  private async getProducerOptions(): Promise<{
    compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
    enableIdempotence?: boolean;
    maxInFlightRequests?: number;
    acks?: 0 | 1 | -1 | 'all';
    timeout?: number;
    maxRetries?: number;
  }> {
    const options: {
      compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
      enableIdempotence?: boolean;
      maxInFlightRequests?: number;
      acks?: 0 | 1 | -1 | 'all';
      timeout?: number;
      maxRetries?: number;
    } = {};

    // Compression type
    const compressionChoice = await vscode.window.showQuickPick(
      [
        { label: 'none', value: 'none', description: 'No compression' },
        { label: 'gzip', value: 'gzip', description: 'Good compression ratio, moderate CPU' },
        { label: 'snappy', value: 'snappy', description: 'Fast compression, moderate ratio' },
        { label: 'lz4', value: 'lz4', description: 'Very fast, lower compression' },
        { label: 'zstd', value: 'zstd', description: 'Best compression ratio, modern algorithm' },
      ],
      { placeHolder: 'Select compression type' },
    );

    if (compressionChoice) {
      options.compressionType = compressionChoice.value as any;
    }

    // Idempotence
    const idempotenceChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Prevent duplicate messages' },
        { label: 'No', value: 'no', description: 'Allow duplicates' },
      ],
      { placeHolder: 'Enable idempotence?' },
    );

    if (idempotenceChoice?.value === 'yes') {
      options.enableIdempotence = true;
    }

    // Acks (delivery guarantee)
    const acksChoice = await vscode.window.showQuickPick(
      [
        { label: '0 (No acknowledgment)', value: '0', description: 'Fastest, no guarantee' },
        { label: '1 (Leader only)', value: '1', description: 'Balanced' },
        { label: '-1/all (All replicas)', value: '-1', description: 'Safest, slowest' },
      ],
      { placeHolder: 'Select acknowledgment level' },
    );

    if (acksChoice) {
      options.acks = acksChoice.value === '-1' ? -1 : (Number.parseInt(acksChoice.value, 10) as 0 | 1);
    }

    // Max in-flight requests
    const inFlightInput = await vscode.window.showInputBox({
      prompt: 'Maximum in-flight requests (default: 1 for idempotent)',
      placeHolder: '1',
      value: '1',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 1) {
          return 'Please enter a valid number >= 1';
        }
        return null;
      },
    });

    if (inFlightInput) {
      options.maxInFlightRequests = Number.parseInt(inFlightInput, 10);
    }

    // Timeout
    const timeoutInput = await vscode.window.showInputBox({
      prompt: 'Request timeout in milliseconds (default: 30000)',
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

    if (timeoutInput) {
      options.timeout = Number.parseInt(timeoutInput, 10);
    }

    // Max retries
    const retriesInput = await vscode.window.showInputBox({
      prompt: 'Maximum retry attempts (default: 3)',
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

    if (retriesInput) {
      options.maxRetries = Number.parseInt(retriesInput, 10);
    }

    return options;
  }

  /**
   * Collects topics from user
   */
  private async collectTopics(config: KafkaProducerConfig): Promise<KafkaProducerTopic[] | null> {
    const topics: KafkaProducerTopic[] = [];

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
  private async createTopic(config: KafkaProducerConfig): Promise<KafkaProducerTopic | null> {
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
      placeHolder: 'Sends order events',
    });

    // Collect message schema properties
    const messageProperties = await this.collectMessageProperties();

    // Get message type name
    const messageType = await this.getMessageType(topicName);

    // Check if topic should include error handling
    let includeErrorHandling = false;
    if (config.includeErrorHandling) {
      const errorHandlingChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, include try-catch', value: 'yes', description: 'Producer will have error handling' },
          { label: 'No', value: 'no', description: 'Producer will not have explicit error handling' },
        ],
        { placeHolder: 'Include error handling (try-catch)?' },
      );

      includeErrorHandling = errorHandlingChoice?.value === 'yes';
    }

    // Configure producer options for this topic
    const producerOptions = await this.configureTopicProducerOptions();

    const topic: KafkaProducerTopic = {
      name: topicName,
      messageType,
      messageProperties,
      includeErrorHandling,
      producerOptions,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      topic.description = trimmedDescription;
    }

    return topic;
  }

  /**
   * Collects message schema properties for serialization
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

      const property: { name: string; type: string; description?: string } = {
        name: propName.trim(),
        type: propType?.value || 'string',
      };

      const trimmedDescription = propDescription?.trim();
      if (trimmedDescription && trimmedDescription.length > 0) {
        property.description = trimmedDescription;
      }

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
   * Configures producer options for a specific topic
   */
  private async configureTopicProducerOptions(): Promise<{
    compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
    enableIdempotence?: boolean;
    maxInFlightRequests?: number;
    acks?: 0 | 1 | -1 | 'all';
    timeout?: number;
    maxRetries?: number;
  }> {
    const options: {
      compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
      enableIdempotence?: boolean;
      maxInFlightRequests?: number;
      acks?: 0 | 1 | -1 | 'all';
      timeout?: number;
      maxRetries?: number;
    } = {};

    // Compression type
    const compressionChoice = await vscode.window.showQuickPick(
      [
        { label: 'Use global default', value: 'default' },
        { label: 'none', value: 'none' },
        { label: 'gzip', value: 'gzip' },
        { label: 'snappy', value: 'snappy' },
        { label: 'lz4', value: 'lz4' },
        { label: 'zstd', value: 'zstd' },
      ],
      { placeHolder: 'Select compression type for this topic' },
    );

    if (compressionChoice && compressionChoice.value !== 'default') {
      options.compressionType = compressionChoice.value as any;
    }

    return options;
  }

  /**
   * Generates imports based on topics and configuration
   */
  private generateImports(topics: KafkaProducerTopic[], _config: KafkaProducerConfig): string[] {
    const imports = new Set<string>(['Kafka', 'Producer', 'ProducerConfig']);

    // Check if CompressionTypes is needed (when any topic uses compression)
    const needsCompression = topics.some((t) => t.producerOptions.compressionType);
    if (needsCompression) {
      imports.add('CompressionTypes');
    }

    return Array.from(imports);
  }

  /**
   * Generates the producer code
   */
  private generateProducerCode(
    producerName: string,
    brokers: string,
    topics: KafkaProducerTopic[],
    producerOptions: {
      compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
      enableIdempotence?: boolean;
      maxInFlightRequests?: number;
      acks?: 0 | 1 | -1 | 'all';
      timeout?: number;
      maxRetries?: number;
    },
    imports: string[],
    _config: KafkaProducerConfig,
  ): string {
    let code = '';

    // Imports
    code += `import { ${imports.join(', ')} } from 'kafkajs';\n\n`;

    // Generate TypeScript interfaces for message types
    code += this.generateMessageInterfaces(topics);

    // Kafka configuration
    code += `// Kafka configuration\n`;
    code += `const kafka = new Kafka({\n`;
    code += `  clientId: '${this.sanitizeName(producerName)}-producer',\n`;
    code += `  brokers: [${brokers.split(',').map((b) => `'${b.trim()}'`).join(', ')}],\n`;
    code += `});\n\n`;

    // Create producer with options
    code += `// Create producer\n`;
    code += `const producerConfig: ProducerConfig = {\n`;
    if (producerOptions.enableIdempotence !== undefined) {
      code += `  idempotent: ${producerOptions.enableIdempotence},\n`;
    }
    if (producerOptions.maxInFlightRequests !== undefined) {
      code += `  maxInFlightRequests: ${producerOptions.maxInFlightRequests},\n`;
    }
    if (producerOptions.acks !== undefined) {
      code += `  acks: ${producerOptions.acks},\n`;
    }
    if (producerOptions.compressionType !== undefined) {
      code += `  compression: ${producerOptions.compressionType === 'none' ? 'CompressionTypes.None' : `CompressionTypes.${this.ucfirst(producerOptions.compressionType)}`},\n`;
    }
    if (producerOptions.timeout !== undefined) {
      code += `  requestTimeout: ${producerOptions.timeout},\n`;
    }
    if (producerOptions.maxRetries !== undefined) {
      code += `  retry: {\n`;
      code += `    maxRetryAttempts: ${producerOptions.maxRetries},\n`;
      code += `    initialRetryTime: 100,\n`;
      code += `    retries: ${producerOptions.maxRetries},\n`;
      code += `  },\n`;
    }
    code += `};\n\n`;

    code += `export const ${this.ucfirst(this.sanitizeName(producerName))}Producer: Producer = kafka.producer(producerConfig);\n\n`;

    // Generate topic send functions
    for (const topic of topics) {
      code += this.generateTopicSendFunction(producerName, topic, config);
      code += '\n';
    }

    // Generate utility functions
    code += this.generateUtilityFunctions(producerName, config);

    // Generate shutdown handler
    code += this.generateShutdownHandler(producerName);

    return code;
  }

  /**
   * Generates TypeScript interfaces for message types
   */
  private generateMessageInterfaces(topics: KafkaProducerTopic[]): string {
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
   * Generates a single topic send function
   */
  private generateTopicSendFunction(
    producerName: string,
    topic: KafkaProducerTopic,
    config: KafkaProducerConfig,
  ): string {
    let code = '';

    const sendFunctionName = `send${this.ucfirst(this.sanitizeName(topic.name))}`;
    const className = this.ucfirst(this.sanitizeName(producerName));

    // JSDoc
    code += `/**\n`;
    if (topic.description) {
      code += ` * ${this.escapeString(topic.description)}\n`;
    }
    code += ` * @param message - The message to send\n`;
    code += ` */\n`;
    code += `export async function ${sendFunctionName}(message: ${topic.messageType}): Promise<void> {\n`;

    // Error handling
    if (topic.includeErrorHandling) {
      code += `  try {\n`;
      code += `    const serialized = serialize${topic.messageType}(message);\n`;
      code += `    await ${className}Producer.send({\n`;
      code += `      topic: '${topic.name}',\n`;
      code += `      messages: [serialized],\n`;
      if (topic.producerOptions.acks !== undefined) {
        code += `      acks: ${topic.producerOptions.acks},\n`;
      }
      code += `    });\n`;
      code += `    console.log(\`Message sent to topic '${topic.name}':\`, message);\n`;
      code += `  } catch (error) {\n`;
      code += `    console.error(\`Error sending message to topic '${topic.name}':\`, error);\n`;
      code += `    throw error;\n`;
      code += `  }\n`;
    } else {
      code += `  const serialized = serialize${topic.messageType}(message);\n`;
      code += `  await ${className}Producer.send({\n`;
      code += `    topic: '${topic.name}',\n`;
      code += `    messages: [serialized],\n`;
      if (topic.producerOptions.acks !== undefined) {
        code += `    acks: ${topic.producerOptions.acks},\n`;
      }
      code += `  });\n`;
      code += `  console.log(\`Message sent to topic '${topic.name}':\`, message);\n`;
    }

    code += `}\n`;

    // Add message serializer helper
    code += `\n/**\n`;
    code += ` * Serialize message for Kafka\n`;
    code += ` */\n`;
    code += `function serialize${topic.messageType}(message: ${topic.messageType}): {\n`;
    code += `  value: Buffer;\n`;
    code += `  key?: string;\n`;
    code += `} {\n`;
    if (config.includeSerialization) {
      code += `  const value = Buffer.from(JSON.stringify(message), 'utf-8');\n`;
      code += `  const key = message.id ? String(message.id) : undefined;\n`;
      code += `  return { value, key };\n`;
    } else {
      code += `  // Default: JSON serialization\n`;
      code += `  const value = Buffer.from(JSON.stringify(message), 'utf-8');\n`;
      code += `  const key = (message as any).id ? String((message as any).id) : undefined;\n`;
      code += `  return { value, key };\n`;
    }
    code += `}\n`;

    return code;
  }

  /**
   * Generates utility functions for the producer
   */
  private generateUtilityFunctions(producerName: string, _config: KafkaProducerConfig): string {
    let code = '';
    const className = this.ucfirst(this.sanitizeName(producerName));

    code += `/**\n`;
    code += ` * Connect to Kafka cluster\n`;
    code += ` */\n`;
    code += `export async function connect${className}Producer(): Promise<void> {\n`;
    code += `  await ${className}Producer.connect();\n`;
    code += `  console.log('${className} producer connected');\n`;
    code += `}\n\n`;

    code += `/**\n`;
    code += ` * Disconnect from Kafka cluster\n`;
    code += ` */\n`;
    code += `export async function disconnect${className}Producer(): Promise<void> {\n`;
    code += `  await ${className}Producer.disconnect();\n`;
    code += `  console.log('${className} producer disconnected');\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates the shutdown handler
   */
  private generateShutdownHandler(producerName: string): string {
    let code = '';
    const className = this.ucfirst(this.sanitizeName(producerName));

    code += `\n// Graceful shutdown\n`;
    code += `process.on('SIGTERM', async () => {\n`;
    code += `  await disconnect${className}Producer();\n`;
    code += `  process.exit(0);\n`;
    code += `});\n\n`;

    code += `process.on('SIGINT', async () => {\n`;
    code += `  await disconnect${className}Producer();\n`;
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
   * Creates the producer file at the specified path
   */
  public async createProducerFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write producer file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Producer file created', { filePath });
  }

  /**
   * Gets producer generation options from user
   */
  public async getProducerGenerationOptions(): Promise<KafkaProducerConfig | undefined> {
    // Ask for error handling preference
    const errorHandlingChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Include error handling in send functions' },
        { label: 'No', value: 'no', description: 'No error handling' },
      ],
      {
        placeHolder: 'Include error handling?',
      },
    );

    if (!errorHandlingChoice) {
      return undefined;
    }

    // Ask for serialization preference
    const serializationChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Include JSON serialization helpers' },
        { label: 'No', value: 'no', description: 'No serialization helpers' },
      ],
      {
        placeHolder: 'Include serialization helpers?',
      },
    );

    if (!serializationChoice) {
      return undefined;
    }

    return {
      enabled: true,
      includeErrorHandling: errorHandlingChoice.value === 'yes',
      includeSerialization: serializationChoice.value === 'yes',
      defaultProducerPath: 'src/producers',
    };
  }
}
