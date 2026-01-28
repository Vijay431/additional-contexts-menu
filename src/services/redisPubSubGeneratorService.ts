import * as vscode from 'vscode';
import * as path from 'path';

import { Logger } from '../utils/logger';
import type {
  RedisPubSubConfig,
  RedisPubSubChannel,
  GeneratedRedisPubSub,
} from '../types/extension';

/**
 * Service for generating Redis pub/sub channels with typed messaging.
 * Generates publishers, subscribers, and pattern-based subscription handlers.
 */
export class RedisPubSubGeneratorService {
  private static instance: RedisPubSubGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RedisPubSubGeneratorService {
    RedisPubSubGeneratorService.instance ??= new RedisPubSubGeneratorService();
    return RedisPubSubGeneratorService.instance;
  }

  /**
   * Generates a complete Redis pub/sub setup
   */
  public async generatePubSubSystem(
    _workspacePath: string,
    config: RedisPubSubConfig,
  ): Promise<GeneratedRedisPubSub | null> {
    // Get base name for the pub/sub system
    const baseName = await this.getBaseName();
    if (!baseName) {
      return null;
    }

    // Collect channels
    const channels = await this.collectChannels(config);
    if (!channels || channels.length === 0) {
      vscode.window.showWarningMessage('No channels defined. Pub/Sub system generation cancelled.');
      return null;
    }

    // Generate message types
    const messageTypesCode = this.generateMessageTypes(baseName, channels);

    // Generate client setup code
    const clientSetupCode = this.generateClientSetup(config);

    // Generate imports
    const imports = this.generateImports(config, channels);

    // Generate publishers
    const publishers = this.generatePublishers(baseName, channels, config);

    // Generate subscribers
    const subscribers = this.generateSubscribers(baseName, channels, config);

    this.logger.info('Redis pub/sub system generated', {
      baseName,
      channels: channels.length,
      publishers: publishers.length,
      subscribers: subscribers.length,
    });

    return {
      channels,
      publishers,
      subscribers,
      messageTypesCode,
      imports,
      clientSetupCode,
    };
  }

  /**
   * Prompts user for base name
   */
  private async getBaseName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter base name for pub/sub system (e.g., notifications, events)',
      placeHolder: 'notifications',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Base name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Base name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects channels from user
   */
  private async collectChannels(config: RedisPubSubConfig): Promise<RedisPubSubChannel[] | null> {
    const channels: RedisPubSubChannel[] = [];

    let addMore = true;
    while (addMore) {
      const channel = await this.createChannel(config);
      if (channel) {
        channels.push(channel);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another channel', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another channel or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return channels.length > 0 ? channels : null;
  }

  /**
   * Creates a single channel through user interaction
   */
  private async createChannel(config: RedisPubSubConfig): Promise<RedisPubSubChannel | null> {
    // Get channel name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter channel name (camelCase)',
      placeHolder: 'userCreated',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Channel name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Channel name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const channelName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter channel description (optional, for JSDoc)',
      placeHolder: 'Published when a new user is created',
    });

    // Get message type name
    const messageTypeInput = await vscode.window.showInputBox({
      prompt: 'Enter message type name (PascalCase)',
      placeHolder: 'UserCreatedMessage',
      value: this.ucfirst(channelName) + 'Message',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Message type name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Message type name must be in PascalCase';
        }
        return null;
      },
    });

    if (!messageTypeInput) {
      return null;
    }

    const messageType = messageTypeInput.trim();

    // Collect message properties
    const messageProperties = await this.collectMessageProperties();

    // Check if publisher should be included
    const publisherChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Generate publisher for this channel' },
        { label: 'No', value: 'no', description: 'Skip publisher generation' },
      ],
      { placeHolder: 'Generate publisher for this channel?' },
    );

    const includePublisher = publisherChoice?.value === 'yes';

    // Check if subscriber should be included
    const subscriberChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', value: 'yes', description: 'Generate subscriber for this channel' },
        { label: 'No', value: 'no', description: 'Skip subscriber generation' },
      ],
      { placeHolder: 'Generate subscriber for this channel?' },
    );

    const includeSubscriber = subscriberChoice?.value === 'yes';

    const channel: RedisPubSubChannel = {
      name: channelName,
      messageType,
      messageProperties,
      includePublisher,
      includeSubscriber,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      channel.description = trimmedDescription;
    }

    // Check if pattern-based subscription should be included
    if (config.includePatternSubscription && includeSubscriber) {
      const patternChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes', value: 'yes', description: 'Add pattern-based subscription' },
          { label: 'No', value: 'no', description: 'Standard subscription only' },
        ],
        { placeHolder: 'Add pattern-based subscription?' },
      );

      if (patternChoice?.value === 'yes') {
        const pattern = await vscode.window.showInputBox({
          prompt: 'Enter subscription pattern (e.g., users:*, events:*)',
          placeHolder: `${channelName}:*`,
        });

        if (pattern && pattern.trim().length > 0) {
          channel.pattern = pattern.trim();
          channel.includePatternSubscriber = true;
        }
      }
    }

    return channel;
  }

  /**
   * Collects message properties for a channel
   */
  private async collectMessageProperties(): Promise<
    Array<{ name: string; type: string; description?: string; optional: boolean }>
  > {
    const properties: Array<{ name: string; type: string; description?: string; optional: boolean }> = [];

    let addMore = true;
    while (addMore) {
      const propName = await vscode.window.showInputBox({
        prompt: 'Enter property name (camelCase)',
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

      const property: {
        name: string;
        type: string;
        optional: boolean;
        description?: string;
      } = {
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
   * Generates message types
   */
  private generateMessageTypes(baseName: string, channels: RedisPubSubChannel[]): string {
    let code = `// Message types for ${baseName} pub/sub system\n\n`;

    for (const channel of channels) {
      code += `/**\n`;
      if (channel.description) {
        code += ` * ${this.escapeString(channel.description)}\n`;
      }
      code += ` */\n`;
      code += `export interface ${channel.messageType} {\n`;

      for (const prop of channel.messageProperties) {
        const optionalMarker = prop.optional ? '?' : '';
        const comment = prop.description ? ` // ${prop.description}` : '';
        code += `  ${prop.name}${optionalMarker}: ${prop.type};${comment}\n`;
      }

      code += `}\n\n`;
    }

    // Add union type of all messages
    code += `// Union type of all messages\n`;
    code += `export type ${this.ucfirst(baseName)}Message =\n`;
    const messageTypes = channels.map((ch) => `  | ${ch.messageType}`);
    if (messageTypes.length > 0) {
      code += messageTypes.join('\n');
    } else {
      code += `  | Record<string, unknown>`;
    }
    code += ';\n';

    return code;
  }

  /**
   * Generates client setup code
   */
  private generateClientSetup(config: RedisPubSubConfig): string {
    let code = `import { Redis } from 'ioredis';\n\n`;

    code += `/**\n`;
    code += ` * Redis client for pub/sub operations\n`;
    code += ` */\n`;
    code += `export const createRedisClient = (): Redis => {\n`;
    code += `  return new Redis({\n`;
    code += `    host: process.env.REDIS_HOST || 'localhost',\n`;
    code += `    port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),\n`;
    code += `    password: process.env.REDIS_PASSWORD,\n`;

    if (config.includeErrorHandling) {
      code += `    retryStrategy: (times: number) => {\n`;
      code += `      const delay = Math.min(times * 50, 2000);\n`;
      code += `      return delay;\n`;
      code += `    },\n`;
      code += `    maxRetriesPerRequest: 3,\n`;
    }

    code += `  });\n`;
    code += `};\n\n`;

    code += `// Create a shared Redis client\n`;
    code += `export const redisClient = createRedisClient();\n\n`;

    if (config.includeErrorHandling) {
      code += `// Error handling\n`;
      code += `redisClient.on('error', (error: Error) => {\n`;
      code += `  console.error('Redis client error:', error);\n`;
      code += `});\n\n`;
    }

    return code;
  }

  /**
   * Generates imports
   */
  private generateImports(config: RedisPubSubConfig, channels: RedisPubSubChannel[]): string[] {
    const imports = new Set<string>(['Redis', 'ioredis']);

    // Check for pattern subscriptions
    const hasPatternSubscriptions = channels.some(
      (ch) => config.includePatternSubscription && ch.includePatternSubscriber,
    );

    if (hasPatternSubscriptions) {
      imports.add('RedisExtensions');
    }

    return Array.from(imports);
  }

  /**
   * Generates publishers
   */
  private generatePublishers(
    baseName: string,
    channels: RedisPubSubChannel[],
    config: RedisPubSubConfig,
  ): Array<{ name: string; channelName: string; code: string }> {
    const publishers: Array<{ name: string; channelName: string; code: string }> = [];

    for (const channel of channels) {
      if (!channel.includePublisher) {
        continue;
      }

      const publisherName = `${this.ucfirst(channel.name)}Publisher`;
      const publisherCode = this.generatePublisherCode(baseName, channel, config);

      publishers.push({
        name: publisherName,
        channelName: channel.name,
        code: publisherCode,
      });
    }

    return publishers;
  }

  /**
   * Generates publisher code for a single channel
   */
  private generatePublisherCode(
    _baseName: string,
    channel: RedisPubSubChannel,
    config: RedisPubSubConfig,
  ): string {
    let code = `import type { ${channel.messageType} } from './message-types';\n`;
    code += `import { redisClient } from './redis-client';\n\n`;

    code += `/**\n`;
    if (channel.description) {
      code += ` * ${this.escapeString(channel.description)}\n`;
    }
    code += ` * Publisher for ${channel.name} channel\n`;
    code += ` */\n`;
    code += `export class ${this.ucfirst(channel.name)}Publisher {\n`;
    code += `  private readonly channel = '${this.toKebabCase(channel.name)}';\n\n`;

    code += `  /**\n`;
    code += `   * Publish message to ${channel.name} channel\n`;

    for (const prop of channel.messageProperties) {
      code += `   * @param message.${prop.name} - ${prop.description || prop.type}\n`;
    }
    code += `   */\n`;

    if (config.includeErrorHandling) {
      code += `  public async publish(message: ${channel.messageType}): Promise<number> {\n`;
      code += `    try {\n`;
      code += `      const serialized = JSON.stringify(message);\n`;
      code += `      const result = await redisClient.publish(this.channel, serialized);\n\n`;

      if (config.includeMessageValidation) {
        code += `      if (result === 0) {\n`;
        code += `        console.warn(\`No subscribers listening to channel: \${this.channel}\`);\n`;
        code += `      }\n\n`;
      }

      code += `      return result;\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Failed to publish to \${this.channel}:\`, error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
      code += `  }\n`;
    } else {
      code += `  public async publish(message: ${channel.messageType}): Promise<number> {\n`;
      code += `    const serialized = JSON.stringify(message);\n`;
      code += `    return await redisClient.publish(this.channel, serialized);\n`;
      code += `  }\n`;
    }

    code += `}\n`;

    // Add helper function for publishing
    code += `\n/**\n`;
    code += ` * Helper function to publish ${channel.name} message\n`;
    code += ` */\n`;
    code += `export async function publish${this.ucfirst(channel.name)}(\n`;
    code += `  message: ${channel.messageType},\n`;
    code += `): Promise<number> {\n`;
    code += `  const publisher = new ${this.ucfirst(channel.name)}Publisher();\n`;
    code += `  return await publisher.publish(message);\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates subscribers
   */
  private generateSubscribers(
    baseName: string,
    channels: RedisPubSubChannel[],
    config: RedisPubSubConfig,
  ): Array<{ name: string; channelName: string; pattern?: string; code: string }> {
    const subscribers: Array<{ name: string; channelName: string; pattern?: string; code: string }> = [];

    for (const channel of channels) {
      if (!channel.includeSubscriber) {
        continue;
      }

      // Generate standard subscriber
      const subscriberName = `${this.ucfirst(channel.name)}Subscriber`;
      const subscriberCode = this.generateSubscriberCode(baseName, channel, config, false);

      subscribers.push({
        name: subscriberName,
        channelName: channel.name,
        code: subscriberCode,
      });

      // Generate pattern-based subscriber if configured
      if (config.includePatternSubscription && channel.includePatternSubscriber && channel.pattern) {
        const patternSubscriberName = `${this.ucfirst(channel.name)}PatternSubscriber`;
        const patternSubscriberCode = this.generateSubscriberCode(baseName, channel, config, true);

        subscribers.push({
          name: patternSubscriberName,
          channelName: channel.name,
          pattern: channel.pattern,
          code: patternSubscriberCode,
        });
      }
    }

    return subscribers;
  }

  /**
   * Generates subscriber code for a single channel
   */
  private generateSubscriberCode(
    _baseName: string,
    channel: RedisPubSubChannel,
    config: RedisPubSubConfig,
    isPatternBased: boolean,
  ): string {
    const suffix = isPatternBased ? 'Pattern' : '';
    const channelTarget = isPatternBased ? (channel.pattern || `${channel.name}:*`) : this.toKebabCase(channel.name);

    let code = `import { Redis } from 'ioredis';\n`;
    code += `import type { ${channel.messageType} } from './message-types';\n\n`;

    code += `/**\n`;
    code += ` * Subscriber for ${channel.name} channel`;
    if (isPatternBased) {
      code += ` (pattern-based)`;
    }
    code += `\n`;
    code += ` */\n`;
    code += `export class ${this.ucfirst(channel.name)}${suffix}Subscriber {\n`;
    code += `  private subscriber: Redis;\n`;
    code += `  private channel: string;\n\n`;

    if (isPatternBased) {
      code += `  constructor() {\n`;
      code += `    this.subscriber = new Redis({\n`;
      code += `      host: process.env.REDIS_HOST || 'localhost',\n`;
      code += `      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),\n`;
      code += `      password: process.env.REDIS_PASSWORD,\n`;
      code += `    });\n`;
      code += `    this.channel = '${channelTarget}';\n`;
      code += `  }\n\n`;
    } else {
      code += `  constructor() {\n`;
      code += `    this.subscriber = new Redis({\n`;
      code += `      host: process.env.REDIS_HOST || 'localhost',\n`;
      code += `      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),\n`;
      code += `      password: process.env.REDIS_PASSWORD,\n`;
      code += `    });\n`;
      code += `    this.channel = '${channelTarget}';\n`;
      code += `  }\n\n`;
    }

    code += `  /**\n`;
    code += `   * Subscribe to ${channel.name} channel\n`;
    code += `   */\n`;
    code += `  public async subscribe(\n`;
    code += `    handler: (message: ${channel.messageType}, channel: string) => void | Promise<void>,\n`;
    code += `  ): Promise<void> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      code += `      await this.subscriber.subscribe(this.channel);\n\n`;
      code += `      this.subscriber.on('message', (channel: string, data: Buffer) => {\n`;
      code += `        try {\n`;
      code += `          const message: ${channel.messageType} = JSON.parse(data.toString());\n`;
      code += `          void handler(message, channel);\n`;
      code += `        } catch (error) {\n`;
      code += `          console.error(\`Error processing message from \${channel}:\`, error);\n`;
      code += `        }\n`;
      code += `      });\n\n`;
      code += `      console.log(\`Subscribed to channel: \${this.channel}\`);\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Failed to subscribe to \${this.channel}:\`, error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
    } else {
      code += `    await this.subscriber.subscribe(this.channel);\n\n`;
      code += `    this.subscriber.on('message', (channel: string, data: Buffer) => {\n`;
      code += `      const message: ${channel.messageType} = JSON.parse(data.toString());\n`;
      code += `      void handler(message, channel);\n`;
      code += `    });\n`;
    }

    code += `  }\n\n`;

    // Pattern-specific method
    if (isPatternBased) {
      code += `  /**\n`;
      code += `   * Subscribe to channels matching pattern: ${channelTarget}\n`;
      code += `   */\n`;
      code += `  public async psubscribe(\n`;
      code += `    handler: (message: ${channel.messageType}, channel: string, pattern: string) => void | Promise<void>,\n`;
      code += `  ): Promise<void> {\n`;

      if (config.includeErrorHandling) {
        code += `    try {\n`;
        code += `      await this.subscriber.psubscribe(this.channel);\n\n`;
        code += `      this.subscriber.on('pmessage', (pattern: string, channel: string, data: Buffer) => {\n`;
        code += `        try {\n`;
        code += `          const message: ${channel.messageType} = JSON.parse(data.toString());\n`;
        code += `          void handler(message, channel, pattern);\n`;
        code += `        } catch (error) {\n`;
        code += `          console.error(\`Error processing pmessage from \${channel}:\`, error);\n`;
        code += `        }\n`;
        code += `      });\n\n`;
        code += `      console.log(\`Subscribed to pattern: \${this.channel}\`);\n`;
        code += `    } catch (error) {\n`;
        code += `      console.error(\`Failed to subscribe to pattern \${this.channel}:\`, error);\n`;
        code += `      throw error;\n`;
        code += `    }\n`;
      } else {
        code += `    await this.subscriber.psubscribe(this.channel);\n\n`;
        code += `    this.subscriber.on('pmessage', (pattern: string, channel: string, data: Buffer) => {\n`;
        code += `      const message: ${channel.messageType} = JSON.parse(data.toString());\n`;
        code += `      void handler(message, channel, pattern);\n`;
        code += `    });\n`;
      }

      code += `  }\n\n`;
    }

    code += `  /**\n`;
    code += `   * Unsubscribe from channel\n`;
    code += `   */\n`;
    code += `  public async unsubscribe(): Promise<void> {\n`;

    if (config.includeErrorHandling) {
      code += `    try {\n`;
      if (isPatternBased) {
        code += `      await this.subscriber.punsubscribe(this.channel);\n`;
      } else {
        code += `      await this.subscriber.unsubscribe(this.channel);\n`;
      }
      code += `      await this.subscriber.quit();\n`;
      code += `      console.log(\`Unsubscribed from \${this.channel}\`);\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error(\`Failed to unsubscribe from \${this.channel}:\`, error);\n`;
      code += `    }\n`;
    } else {
      if (isPatternBased) {
        code += `    await this.subscriber.punsubscribe(this.channel);\n`;
      } else {
        code += `    await this.subscriber.unsubscribe(this.channel);\n`;
      }
      code += `    await this.subscriber.quit();\n`;
    }

    code += `  }\n`;
    code += `}\n`;

    // Add helper function for subscribing
    code += `\n/**\n`;
    code += ` * Helper function to subscribe to ${channel.name} channel`;
    if (isPatternBased) {
      code += ` pattern`;
    }
    code += `\n`;
    code += ` */\n`;

    if (isPatternBased) {
      code += `export async function subscribeTo${this.ucfirst(channel.name)}Pattern(\n`;
      code += `  handler: (message: ${channel.messageType}, channel: string, pattern: string) => void | Promise<void>,\n`;
      code += `): Promise<void> {\n`;
      code += `  const subscriber = new ${this.ucfirst(channel.name)}PatternSubscriber();\n`;
      code += `  return await subscriber.psubscribe(handler);\n`;
      code += `}\n`;
    } else {
      code += `export async function subscribeTo${this.ucfirst(channel.name)}(\n`;
      code += `  handler: (message: ${channel.messageType}, channel: string) => void | Promise<void>,\n`;
      code += `): Promise<void> {\n`;
      code += `  const subscriber = new ${this.ucfirst(channel.name)}Subscriber();\n`;
      code += `  return await subscriber.subscribe(handler);\n`;
      code += `}\n`;
    }

    return code;
  }

  /**
   * Creates the pub/sub files at the specified paths
   */
  public async createPubSubFiles(
    basePath: string,
    generated: GeneratedRedisPubSub,
  ): Promise<void> {
    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(basePath));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(basePath));
    }

    // Write message types file
    const messageTypesPath = path.join(basePath, 'message-types.ts');
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(messageTypesPath),
      Buffer.from(generated.messageTypesCode, 'utf-8'),
    );
    this.logger.info('Message types file created', { filePath: messageTypesPath });

    // Write client setup file
    const clientSetupPath = path.join(basePath, 'redis-client.ts');
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(clientSetupPath),
      Buffer.from(generated.clientSetupCode, 'utf-8'),
    );
    this.logger.info('Redis client file created', { filePath: clientSetupPath });

    // Create individual files for publishers
    for (const publisher of generated.publishers) {
      const publisherPath = path.join(basePath, `${this.toKebabCase(publisher.name)}.ts`);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(publisherPath),
        Buffer.from(publisher.code, 'utf-8'),
      );
      this.logger.info('Publisher file created', { filePath: publisherPath });
    }

    // Create individual files for subscribers
    for (const subscriber of generated.subscribers) {
      const subscriberPath = path.join(basePath, `${this.toKebabCase(subscriber.name)}.ts`);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(subscriberPath),
        Buffer.from(subscriber.code, 'utf-8'),
      );
      this.logger.info('Subscriber file created', { filePath: subscriberPath });
    }

    // Create index file
    const indexCode = this.generateIndexFile(generated);
    const indexPath = path.join(basePath, 'index.ts');
    await vscode.workspace.fs.writeFile(vscode.Uri.file(indexPath), Buffer.from(indexCode, 'utf-8'));
    this.logger.info('Index file created', { filePath: indexPath });
  }

  /**
   * Generates index file for pub/sub system
   */
  private generateIndexFile(generated: GeneratedRedisPubSub): string {
    let code = `// Redis Pub/Sub System\n\n`;

    code += `export * from './message-types';\n`;
    code += `export * from './redis-client';\n\n`;

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

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts camelCase to kebab-case
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
}
