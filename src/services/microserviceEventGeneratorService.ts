import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  MicroserviceEventConfig,
  MicroserviceEvent,
  EventPublisher,
  EventSubscriber,
  EventHandler,
  GeneratedMicroserviceEvent,
} from '../types/extension';

/**
 * Service for generating event-driven microservice patterns with message brokers
 * Supports RabbitMQ and Kafka with proper TypeScript typing and error handling
 */
export class MicroserviceEventGeneratorService {
  private static instance: MicroserviceEventGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): MicroserviceEventGeneratorService {
    MicroserviceEventGeneratorService.instance ??= new MicroserviceEventGeneratorService();
    return MicroserviceEventGeneratorService.instance;
  }

  /**
   * Generates a complete event-driven microservice setup
   */
  public async generateEventSystem(
    _workspacePath: string,
    config: MicroserviceEventConfig,
  ): Promise<GeneratedMicroserviceEvent | null> {
    // Get service name
    const serviceName = await this.getServiceName();
    if (!serviceName) {
      return null;
    }

    // Select message broker
    const messageBroker = await this.selectMessageBroker(config);
    if (!messageBroker) {
      return null;
    }

    // Collect events
    const events = await this.collectEvents(config);
    if (!events || events.length === 0) {
      vscode.window.showWarningMessage('No events defined. Event system generation cancelled.');
      return null;
    }

    // Generate publishers
    const publishers = await this.generatePublishers(serviceName, events, messageBroker, config);

    // Generate subscribers
    const subscribers = await this.generateSubscribers(serviceName, events, messageBroker, config);

    // Generate handlers
    const handlers = await this.generateHandlers(serviceName, events, config);

    // Generate event types
    const eventTypesCode = this.generateEventTypes(events, serviceName);

    this.logger.info('Microservice event system generated', {
      serviceName,
      messageBroker,
      events: events.length,
      publishers: publishers.length,
      subscribers: subscribers.length,
      handlers: handlers.length,
    });

    return {
      serviceName,
      messageBroker,
      events,
      publishers,
      subscribers,
      handlers,
      eventTypesCode,
    };
  }

  /**
   * Prompts user for service name
   */
  private async getServiceName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter microservice name (e.g., user-service, order-service)',
      placeHolder: 'user-service',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Service name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Service name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user to select message broker
   */
  private async selectMessageBroker(
    config: MicroserviceEventConfig,
  ): Promise<'rabbitmq' | 'kafka' | undefined> {
    const choices = [
      { label: 'RabbitMQ', value: 'rabbitmq', description: 'Lightweight message broker with AMQP protocol' },
      { label: 'Apache Kafka', value: 'kafka', description: 'Distributed event streaming platform' },
    ];

    const selected = await vscode.window.showQuickPick(choices, {
      placeHolder: 'Select message broker',
    });

    return selected?.value as 'rabbitmq' | 'kafka' | undefined;
  }

  /**
   * Collects events from user
   */
  private async collectEvents(config: MicroserviceEventConfig): Promise<MicroserviceEvent[] | null> {
    const events: MicroserviceEvent[] = [];

    let addMore = true;
    while (addMore) {
      const event = await this.createEvent(config);
      if (event) {
        events.push(event);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another event', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another event or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return events.length > 0 ? events : null;
  }

  /**
   * Creates a single event through user interaction
   */
  private async createEvent(config: MicroserviceEventConfig): Promise<MicroserviceEvent | null> {
    // Get event name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter event name (PascalCase)',
      placeHolder: 'UserCreated',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Event name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Event name must be in PascalCase';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const eventName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter event description (optional, for JSDoc)',
      placeHolder: 'Fired when a new user is created',
    });

    // Collect event payload properties
    const payloadProperties = await this.collectPayloadProperties();

    const event: MicroserviceEvent = {
      name: eventName,
      payloadProperties,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      event.description = trimmedDescription;
    }

    return event;
  }

  /**
   * Collects payload properties for an event
   */
  private async collectPayloadProperties(): Promise<
    Array<{ name: string; type: string; description?: string; optional: boolean }>
  > {
    const properties: Array<{ name: string; type: string; description?: string; optional: boolean }> = [];

    let addMore = true;
    while (addMore) {
      const propName = await vscode.window.showInputBox({
        prompt: 'Enter payload property name (camelCase)',
        placeHolder: 'userId',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Property name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Property name must be in camelCase';
          }
          return null;
        },
      });

      if (!propName) {
        break;
      }

      const propType = await vscode.window.showInputBox({
        prompt: 'Enter property type',
        placeHolder: 'string | number | boolean | any',
        value: 'string',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Property type cannot be empty';
          }
          return null;
        },
      });

      const optionalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: 'false', description: 'Property must be present' },
          { label: 'Optional', value: 'true', description: 'Property can be omitted' },
        ],
        { placeHolder: 'Is this property required or optional?' },
      );

      const propDescription = await vscode.window.showInputBox({
        prompt: 'Enter property description (optional)',
      });

      const property = {
        name: propName.trim(),
        type: propType?.trim() || 'any',
        optional: optionalChoice?.value === 'true',
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
   * Generates event publishers
   */
  private async generatePublishers(
    serviceName: string,
    events: MicroserviceEvent[],
    messageBroker: 'rabbitmq' | 'kafka',
    config: MicroserviceEventConfig,
  ): Promise<EventPublisher[]> {
    const publishers: EventPublisher[] = [];

    for (const event of events) {
      const publisherName = `${event.name}Publisher`;
      const publisherCode = this.generatePublisherCode(serviceName, event, messageBroker, config);

      publishers.push({
        name: publisherName,
        eventName: event.name,
        code: publisherCode,
      });
    }

    return publishers;
  }

  /**
   * Generates publisher code for a single event
   */
  private generatePublisherCode(
    serviceName: string,
    event: MicroserviceEvent,
    messageBroker: 'rabbitmq' | 'kafka',
    config: MicroserviceEventConfig,
  ): string {
    let code = '';

    if (messageBroker === 'rabbitmq') {
      code = this.generateRabbitMQPublisher(serviceName, event, config);
    } else {
      code = this.generateKafkaPublisher(serviceName, event, config);
    }

    return code;
  }

  /**
   * Generates RabbitMQ publisher
   */
  private generateRabbitMQPublisher(
    serviceName: string,
    event: MicroserviceEvent,
    config: MicroserviceEventConfig,
  ): string {
    const className = `${event.name}Publisher`;
    const exchangeName = this.toKebabCase(event.name);
    const routingKey = `${this.toKebabCase(serviceName)}.${this.toKebabCase(event.name)}`;

    let code = `import { Channel, connect, Connection } from 'amqplib';\n`;
    code += `import type { ${event.name}Payload } from './event-types';\n\n`;

    code += `/**\n`;
    if (event.description) {
      code += ` * ${this.escapeString(event.description)}\n`;
    }
    code += ` * Publisher for ${event.name} events\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;
    code += `  private channel: Channel | null = null;\n`;
    code += `  private connection: Connection | null = null;\n\n`;

    code += `  constructor() {\n`;
    code += `    this.initialize();\n`;
    code += `  }\n\n`;

    code += `  private async initialize(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      this.connection = await connect(process.env.RABBITMQ_URL || 'amqp://localhost');\n`;
    code += `      this.channel = await this.connection.createChannel();\n\n`;

    code += `      // Assert exchange\n`;
    code += `      await this.channel.assertExchange('${exchangeName}', 'topic', { durable: true });\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Failed to initialize ${className}:', error);\n`;
    code += `      throw error;\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    // Publish method
    code += `  /**\n`;
    code += `   * Publish ${event.name} event\n`;
    code += `   */\n`;

    if (config.includeErrorHandling) {
      code += `  public async publish(payload: ${event.name}Payload): Promise<boolean> {\n`;
      code += `    try {\n`;
      code += `      if (!this.channel) {\n`;
      code += `        throw new Error('Channel not initialized');\n`;
      code += `      }\n\n`;

      code += `      const message = Buffer.from(JSON.stringify(payload));\n`;
      code += `      const result = this.channel.publish('${exchangeName}', '${routingKey}', message, {\n`;
      code += `        contentType: 'application/json',\n`;
      code += `        deliveryMode: 2, // Persistent\n`;
      code += `        timestamp: Date.now(),\n`;
      code += `      });\n\n`;

      code += `      if (!result) {\n`;
      code += `        console.warn(\`Failed to publish ${event.name} event\`);\n`;
      code += `        return false;\n`;
      code += `      }\n\n`;

      code += `      console.log(\`${event.name} event published\`, { routingKey: '${routingKey}', payload });\n`;
      code += `      return true;\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Error publishing ${event.name} event:\`, error);\n`;
      code += `      return false;\n`;
      code += `    }\n`;
      code += `  }\n\n`;
    } else {
      code += `  public async publish(payload: ${event.name}Payload): Promise<boolean> {\n`;
      code += `    const message = Buffer.from(JSON.stringify(payload));\n`;
      code += `    return this.channel!.publish('${exchangeName}', '${routingKey}', message);\n`;
      code += `  }\n\n`;
    }

    // Close method
    code += `  /**\n`;
    code += `   * Close connection\n`;
    code += `   */\n`;
    code += `  public async close(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      if (this.channel) {\n`;
    code += `        await this.channel.close();\n`;
    code += `      }\n`;
    code += `      if (this.connection) {\n`;
    code += `        await this.connection.close();\n`;
    code += `      }\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Error closing connection:', error);\n`;
    code += `    }\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates Kafka publisher
   */
  private generateKafkaPublisher(
    serviceName: string,
    event: MicroserviceEvent,
    config: MicroserviceEventConfig,
  ): string {
    const className = `${event.name}Publisher`;
    const topicName = this.toKebabCase(event.name);

    let code = `import { Kafka, Producer } from 'kafkajs';\n`;
    code += `import type { ${event.name}Payload } from './event-types';\n\n`;

    code += `/**\n`;
    if (event.description) {
      code += ` * ${this.escapeString(event.description)}\n`;
    }
    code += ` * Publisher for ${event.name} events\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;
    code += `  private producer: Producer;\n`;
    code += `  private kafka: Kafka;\n\n`;

    code += `  constructor() {\n`;
    code += `    this.kafka = new Kafka({\n`;
    code += `      clientId: '${this.toKebabCase(serviceName)}-producer',\n`;
    code += `      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),\n`;
    code += `    });\n\n`;
    code += `    this.producer = this.kafka.producer();\n`;
    code += `    this.initialize();\n`;
    code += `  }\n\n`;

    code += `  private async initialize(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      await this.producer.connect();\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Failed to initialize ${className}:', error);\n`;
    code += `      throw error;\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    // Publish method
    code += `  /**\n`;
    code += `   * Publish ${event.name} event\n`;
    code += `   */\n`;

    if (config.includeErrorHandling) {
      code += `  public async publish(payload: ${event.name}Payload): Promise<void> {\n`;
      code += `    try {\n`;
      code += `      await this.producer.send({\n`;
      code += `        topic: '${topicName}',\n`;
      code += `        messages: [\n`;
      code += `          {\n`;
      code += `            key: payload.id?.toString() || null,\n`;
      code += `            value: JSON.stringify(payload),\n`;
      code += `            timestamp: Date.now().toString(),\n`;
      code += `          },\n`;
      code += `        ],\n`;
      code += `      });\n\n`;

      code += `      console.log(\`${event.name} event published\`, { topic: '${topicName}', payload });\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Error publishing ${event.name} event:\`, error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
      code += `  }\n\n`;
    } else {
      code += `  public async publish(payload: ${event.name}Payload): Promise<void> {\n`;
      code += `    await this.producer.send({\n`;
      code += `      topic: '${topicName}',\n`;
      code += `      messages: [{ key: payload.id?.toString(), value: JSON.stringify(payload) }],\n`;
      code += `    });\n`;
      code += `  }\n\n`;
    }

    // Disconnect method
    code += `  /**\n`;
    code += `   * Disconnect producer\n`;
    code += `   */\n`;
    code += `  public async disconnect(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      await this.producer.disconnect();\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Error disconnecting producer:', error);\n`;
    code += `    }\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates event subscribers
   */
  private async generateSubscribers(
    serviceName: string,
    events: MicroserviceEvent[],
    messageBroker: 'rabbitmq' | 'kafka',
    config: MicroserviceEventConfig,
  ): Promise<EventSubscriber[]> {
    const subscribers: EventSubscriber[] = [];

    for (const event of events) {
      const subscriberName = `${event.name}Subscriber`;
      const subscriberCode = this.generateSubscriberCode(serviceName, event, messageBroker, config);

      subscribers.push({
        name: subscriberName,
        eventName: event.name,
        queueName: `${this.toKebabCase(serviceName)}-${this.toKebabCase(event.name)}`,
        code: subscriberCode,
      });
    }

    return subscribers;
  }

  /**
   * Generates subscriber code for a single event
   */
  private generateSubscriberCode(
    serviceName: string,
    event: MicroserviceEvent,
    messageBroker: 'rabbitmq' | 'kafka',
    config: MicroserviceEventConfig,
  ): string {
    let code = '';

    if (messageBroker === 'rabbitmq') {
      code = this.generateRabbitMQSubscriber(serviceName, event, config);
    } else {
      code = this.generateKafkaSubscriber(serviceName, event, config);
    }

    return code;
  }

  /**
   * Generates RabbitMQ subscriber
   */
  private generateRabbitMQSubscriber(
    serviceName: string,
    event: MicroserviceEvent,
    config: MicroserviceEventConfig,
  ): string {
    const className = `${event.name}Subscriber`;
    const exchangeName = this.toKebabCase(event.name);
    const queueName = `${this.toKebabCase(serviceName)}-${this.toKebabCase(event.name)}`;
    const routingKey = `${this.toKebabCase(serviceName)}.${this.toKebabCase(event.name)}`;

    let code = `import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';\n`;
    code += `import type { ${event.name}Payload } from './event-types';\n`;
    code += `import { ${event.name}Handler } from './${this.toKebabCase(event.name)}-handler';\n\n`;

    code += `/**\n`;
    code += ` * Subscriber for ${event.name} events\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;
    code += `  private channel: Channel | null = null;\n`;
    code += `  private connection: Connection | null = null;\n`;
    code += `  private handler: ${event.name}Handler;\n\n`;

    code += `  constructor() {\n`;
    code += `    this.handler = new ${event.name}Handler();\n`;
    code += `    this.initialize();\n`;
    code += `  }\n\n`;

    code += `  private async initialize(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      this.connection = await connect(process.env.RABBITMQ_URL || 'amqp://localhost');\n`;
    code += `      this.channel = await this.connection.createChannel();\n\n`;

    code += `      // Assert exchange\n`;
    code += `      await this.channel.assertExchange('${exchangeName}', 'topic', { durable: true });\n\n`;

    code += `      // Assert queue\n`;
    code += `      const queueResult = await this.channel.assertQueue('${queueName}', {\n`;
    code += `        durable: true,\n`;
    code += `        exclusive: false,\n`;
    code += `        autoDelete: false,\n`;
    code += `      });\n\n`;

    code += `      // Bind queue to exchange\n`;
    code += `      await this.channel.bindQueue(queueResult.queue, '${exchangeName}', '${routingKey}');\n\n`;

    code += `      // Set QoS\n`;
    code += `      await this.channel.preface(config.maxConcurrentMessages || 10);\n\n`;

    code += `      // Start consuming\n`;
    code += `      await this.channel.consume('${queueName}', async (msg) => {\n`;
    code += `        if (msg) {\n`;
    code += `          await this.handleMessage(msg);\n`;
    code += `        }\n`;
    code += `      }, {\n`;
    code += `        noAck: false,\n`;
    code += `      });\n\n`;

    code += `      console.log(\`${className} is listening\`);\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Failed to initialize ${className}:', error);\n`;
    code += `      throw error;\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    // Message handler
    code += `  private async handleMessage(message: ConsumeMessage): Promise<void> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      const payload: ${event.name}Payload = JSON.parse(message.content.toString());\n\n`;

      code += `      await this.handler.handle(payload);\n\n`;

      code += `      // Acknowledge message\n`;
      code += `      this.channel!.ack(message);\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Error handling ${event.name} message:\`, error);\n\n`;

      code += `      // Reject and requeue message\n`;
      code += `      this.channel!.nack(message, false, true);\n`;
      code += `    }\n`;
    } else {
      code += `    const payload: ${event.name}Payload = JSON.parse(message.content.toString());\n`;
      code += `    await this.handler.handle(payload);\n`;
      code += `    this.channel!.ack(message);\n`;
    }

    code += `  }\n\n`;

    // Close method
    code += `  /**\n`;
    code += `   * Close connection\n`;
    code += `   */\n`;
    code += `  public async close(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      if (this.channel) {\n`;
    code += `        await this.channel.close();\n`;
    code += `      }\n`;
    code += `      if (this.connection) {\n`;
    code += `        await this.connection.close();\n`;
    code += `      }\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Error closing connection:', error);\n`;
    code += `    }\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates Kafka subscriber
   */
  private generateKafkaSubscriber(
    serviceName: string,
    event: MicroserviceEvent,
    config: MicroserviceEventConfig,
  ): string {
    const className = `${event.name}Subscriber`;
    const topicName = this.toKebabCase(event.name);
    const groupId = `${this.toKebabCase(serviceName)}-${this.toKebabCase(event.name)}`;

    let code = `import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';\n`;
    code += `import type { ${event.name}Payload } from './event-types';\n`;
    code += `import { ${event.name}Handler } from './${this.toKebabCase(event.name)}-handler';\n\n`;

    code += `/**\n`;
    code += ` * Subscriber for ${event.name} events\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;
    code += `  private consumer: Consumer;\n`;
    code += `  private kafka: Kafka;\n`;
    code += `  private handler: ${event.name}Handler;\n\n`;

    code += `  constructor() {\n`;
    code += `    this.kafka = new Kafka({\n`;
    code += `      clientId: '${this.toKebabCase(serviceName)}-consumer',\n`;
    code += `      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),\n`;
    code += `      groupId: '${groupId}',\n`;
    code += `    });\n\n`;

    code += `    this.consumer = this.kafka.consumer({ groupId: '${groupId}' });\n`;
    code += `    this.handler = new ${event.name}Handler();\n`;
    code += `    this.initialize();\n`;
    code += `  }\n\n`;

    code += `  private async initialize(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      await this.consumer.connect();\n`;
    code += `      await this.consumer.subscribe({ topic: '${topicName}', fromBeginning: false });\n\n`;

    code += `      await this.consumer.run({\n`;
    code += `        eachMessage: async (payload: EachMessagePayload) => {\n`;
    code += `          await this.handleMessage(payload);\n`;
    code += `        },\n`;
    code += `      });\n\n`;

    code += `      console.log(\`${className} is listening\`);\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Failed to initialize ${className}:', error);\n`;
    code += `      throw error;\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    // Message handler
    code += `  private async handleMessage(payload: EachMessagePayload): Promise<void> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      const message: ${event.name}Payload = JSON.parse(payload.message.value.toString());\n\n`;

      code += `      await this.handler.handle(message);\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Error handling ${event.name} message:\`, error);\n`;
      code += `    }\n`;
    } else {
      code += `    const message: ${event.name}Payload = JSON.parse(payload.message.value.toString());\n`;
      code += `    await this.handler.handle(message);\n`;
    }

    code += `  }\n\n`;

    // Disconnect method
    code += `  /**\n`;
    code += `   * Disconnect consumer\n`;
    code += `   */\n`;
    code += `  public async disconnect(): Promise<void> {\n`;
    code += `    try {\n`;
    code += `      await this.consumer.disconnect();\n`;
    code += `    } catch (error) {\n`;
    code += `      console.error('Error disconnecting consumer:', error);\n`;
    code += `    }\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates event handlers
   */
  private async generateHandlers(
    serviceName: string,
    events: MicroserviceEvent[],
    config: MicroserviceEventConfig,
  ): Promise<EventHandler[]> {
    const handlers: EventHandler[] = [];

    for (const event of events) {
      const handlerName = `${event.name}Handler`;
      const handlerCode = this.generateHandlerCode(serviceName, event, config);

      handlers.push({
        name: handlerName,
        eventName: event.name,
        code: handlerCode,
      });
    }

    return handlers;
  }

  /**
   * Generates handler code for a single event
   */
  private generateHandlerCode(
    serviceName: string,
    event: MicroserviceEvent,
    config: MicroserviceEventConfig,
  ): string {
    const className = `${event.name}Handler`;

    let code = `import type { ${event.name}Payload } from './event-types';\n\n`;

    code += `/**\n`;
    if (event.description) {
      code += ` * ${this.escapeString(event.description)}\n`;
    }
    code += ` * Handler for ${event.name} events\n`;
    code += ` */\n`;
    code += `export class ${className} {\n`;

    // Handle method
    code += `  /**\n`;
    code += `   * Handle ${event.name} event\n`;
    for (const prop of event.payloadProperties) {
      code += `   * @param payload.${prop.name} - ${prop.description || prop.type}\n`;
    }
    code += `   */\n`;

    if (config.includeErrorHandling) {
      code += `  public async handle(payload: ${event.name}Payload): Promise<void> {\n`;
      code += `    try {\n`;
      code += `      console.log(\`Handling ${event.name} event:\`, payload);\n`;
      code += `      // TODO: Implement ${this.toKebabCase(event.name)} handling logic\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Error handling ${event.name}:\`, error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
      code += `  }\n`;
    } else {
      code += `  public async handle(payload: ${event.name}Payload): Promise<void> {\n`;
      code += `    console.log(\`Handling ${event.name} event:\`, payload);\n`;
      code += `    // TODO: Implement ${this.toKebabCase(event.name)} handling logic\n`;
      code += `  }\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates event types
   */
  private generateEventTypes(events: MicroserviceEvent[], serviceName: string): string {
    let code = `// Event types for ${serviceName}\n\n`;

    for (const event of events) {
      code += `/**\n`;
      if (event.description) {
        code += ` * ${this.escapeString(event.description)}\n`;
      }
      code += ` */\n`;
      code += `export interface ${event.name}Payload {\n`;

      for (const prop of event.payloadProperties) {
        const optionalMarker = prop.optional ? '?' : '';
        const comment = prop.description ? ` // ${prop.description}` : '';
        code += `  ${prop.name}${optionalMarker}: ${prop.type};${comment}\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Converts PascalCase to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Escapes string for use in comments
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Creates the event system files at the specified paths
   */
  public async createEventSystemFiles(
    basePath: string,
    serviceName: string,
    generated: GeneratedMicroserviceEvent,
  ): Promise<void> {
    const eventTypesPath = path.join(basePath, 'event-types.ts');
    const eventTypesUri = vscode.Uri.file(eventTypesPath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(basePath));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(basePath));
    }

    // Write event types file
    await vscode.workspace.fs.writeFile(eventTypesUri, Buffer.from(generated.eventTypesCode, 'utf-8'));

    this.logger.info('Event types file created', { filePath: eventTypesPath });

    // Create individual files for publishers, subscribers, and handlers
    for (const publisher of generated.publishers) {
      const publisherPath = path.join(basePath, `${this.toKebabCase(publisher.name)}.ts`);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(publisherPath),
        Buffer.from(publisher.code, 'utf-8'),
      );
      this.logger.info('Publisher file created', { filePath: publisherPath });
    }

    for (const subscriber of generated.subscribers) {
      const subscriberPath = path.join(basePath, `${this.toKebabCase(subscriber.name)}.ts`);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(subscriberPath),
        Buffer.from(subscriber.code, 'utf-8'),
      );
      this.logger.info('Subscriber file created', { filePath: subscriberPath });
    }

    for (const handler of generated.handlers) {
      const handlerPath = path.join(basePath, `${this.toKebabCase(handler.name)}.ts`);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(handlerPath),
        Buffer.from(handler.code, 'utf-8'),
      );
      this.logger.info('Handler file created', { filePath: handlerPath });
    }

    // Create index file
    const indexPath = path.join(basePath, 'index.ts');
    const indexCode = this.generateIndexFile(serviceName, generated);
    await vscode.workspace.fs.writeFile(indexPath, Buffer.from(indexCode, 'utf-8'));
    this.logger.info('Index file created', { filePath: indexPath });
  }

  /**
   * Generates index file for event system
   */
  private generateIndexFile(serviceName: string, generated: GeneratedMicroserviceEvent): string {
    let code = `// Event system for ${serviceName}\n\n`;

    code += `export * from './event-types';\n\n`;

    // Export publishers
    code += `// Publishers\n`;
    for (const publisher of generated.publishers) {
      code += `export { ${publisher.name} } from './${this.toKebabCase(publisher.name)}';\n`;
    }
    code += '\n';

    // Export subscribers
    code += `// Subscribers\n`;
    for (const subscriber of generated.subscribers) {
      code += `export { ${subscriber.name} } from './${this.toKebabCase(subscriber.name)}';\n`;
    }
    code += '\n';

    // Export handlers
    code += `// Handlers\n`;
    for (const handler of generated.handlers) {
      code += `export { ${handler.name} } from './${this.toKebabCase(handler.name)}';\n`;
    }

    return code;
  }
}
