import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NestJSWebSocketGatewayConfig {
  enabled: boolean;
  generateTypeScript: boolean;
  includeAuthGuard: boolean;
  includeValidation: boolean;
  includeRoomManagement: boolean;
  includeEventHandlers: boolean;
  defaultGatewayPath: string;
  generateGatewayEvents: boolean;
  includeWebSocketServer: boolean;
}

export interface WebSocketEvent {
  name: string;
  description?: string;
  payloadType: string;
  returnType: string;
  isAsync: boolean;
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
    optional: boolean;
  }>;
}

export interface WebSocketRoom {
  name: string;
  description?: string;
  maxClients?: number;
  requiresAuth: boolean;
}

export interface GeneratedWebSocketGateway {
  name: string;
  gatewayCode: string;
  events: WebSocketEvent[];
  rooms: WebSocketRoom[];
  imports: string[];
  interfacesCode?: string;
  decoratorsCode?: string;
}

export interface WebSocketGatewayGenerationOptions {
  gatewayName: string;
  namespace: string;
  includeCors: boolean;
  corsOptions?: {
    origin: string | string[];
    credentials: boolean;
  };
  includeEventValidation: boolean;
  generateEventInterfaces: boolean;
  includeRoomHelpers: boolean;
  includeBroadcastHelpers: boolean;
}

/**
 * Service for generating NestJS WebSocket gateways with proper decorators,
 * TypeScript typing, event handling, and room management
 */
export class NestJSWebSocketGatewayGeneratorService {
  private static instance: NestJSWebSocketGatewayGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSWebSocketGatewayGeneratorService {
    NestJSWebSocketGatewayGeneratorService.instance ??=
      new NestJSWebSocketGatewayGeneratorService();
    return NestJSWebSocketGatewayGeneratorService.instance;
  }

  /**
   * Generates a NestJS WebSocket gateway based on user input
   */
  public async generateGateway(
    _workspacePath: string,
    config: NestJSWebSocketGatewayConfig,
  ): Promise<GeneratedWebSocketGateway | null> {
    // Get gateway name
    const gatewayName = await this.getGatewayName();
    if (!gatewayName) {
      return null;
    }

    // Get namespace
    const namespace = await this.getNamespace(gatewayName);
    if (!namespace) {
      return null;
    }

    // Collect generation options
    const options = await this.collectGenerationOptions(gatewayName);
    if (!options) {
      return null;
    }

    // Collect events
    const events = await this.collectEvents();
    if (!events) {
      return null;
    }

    // Collect rooms if room management is enabled
    let rooms: WebSocketRoom[] = [];
    if (config.includeRoomManagement) {
      const collectedRooms = await this.collectRooms();
      if (!collectedRooms) {
        return null;
      }
      rooms = collectedRooms;
    }

    // Generate imports
    const imports = this.generateImports(events, rooms, config, options);

    // Generate event interfaces if needed
    let interfacesCode: string | undefined;
    if (options.generateEventInterfaces) {
      interfacesCode = this.generateEventInterfaces(gatewayName, events);
    }

    // Generate decorators code
    let decoratorsCode: string | undefined;
    if (config.includeAuthGuard) {
      decoratorsCode = this.generateDecorators(gatewayName);
    }

    // Generate gateway code
    const gatewayCode = this.generateGatewayCode(
      gatewayName,
      namespace,
      events,
      rooms,
      imports,
      config,
      options,
    );

    this.logger.info('NestJS WebSocket gateway generated', {
      name: gatewayName,
      events: events.length,
      rooms: rooms.length,
    });

    return {
      name: gatewayName,
      gatewayCode,
      events,
      rooms,
      imports,
      ...(interfacesCode && { interfacesCode }),
      ...(decoratorsCode && { decoratorsCode }),
    };
  }

  /**
   * Prompts user for gateway name
   */
  private async getGatewayName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter gateway name (e.g., Chat, Notifications)',
      placeHolder: 'ChatGateway',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Gateway name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Gateway name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for namespace
   */
  private async getNamespace(gatewayName: string): Promise<string | undefined> {
    const defaultNamespace = this.kebabCase(gatewayName).replace('-gateway', '');
    const input = await vscode.window.showInputBox({
      prompt: 'Enter gateway namespace',
      placeHolder: defaultNamespace,
      value: defaultNamespace,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Namespace cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_-]*$/.test(value)) {
          return 'Namespace can only contain letters, numbers, slashes, hyphens, and underscores';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects generation options from user
   */
  private async collectGenerationOptions(
    gatewayName: string,
  ): Promise<WebSocketGatewayGenerationOptions | null> {
    // Ask for CORS
    const includeCors = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Enable CORS for this gateway?' },
    );

    if (!includeCors) {
      return null;
    }

    let corsOptions;
    if (includeCors.value) {
      const originInput = await vscode.window.showInputBox({
        prompt: 'Enter CORS origin (e.g., http://localhost:3000 or * for all)',
        placeHolder: '*',
      });

      if (originInput === undefined) {
        return null;
      }

      corsOptions = {
        origin: originInput.trim() || '*',
        credentials: true,
      };
    }

    // Ask for event validation
    const includeEventValidation = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include event payload validation?' },
    );

    if (!includeEventValidation) {
      return null;
    }

    // Ask for event interfaces
    const generateEventInterfaces = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Generate TypeScript interfaces for events?' },
    );

    if (!generateEventInterfaces) {
      return null;
    }

    // Ask for room helpers
    const includeRoomHelpers = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include room helper methods?' },
    );

    if (!includeRoomHelpers) {
      return null;
    }

    // Ask for broadcast helpers
    const includeBroadcastHelpers = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include broadcast helper methods?' },
    );

    if (!includeBroadcastHelpers) {
      return null;
    }

    return {
      gatewayName,
      namespace: '',
      includeCors: includeCors.value,
      ...(corsOptions && { corsOptions }),
      includeEventValidation: includeEventValidation.value,
      generateEventInterfaces: generateEventInterfaces.value,
      includeRoomHelpers: includeRoomHelpers.value,
      includeBroadcastHelpers: includeBroadcastHelpers.value,
    };
  }

  /**
   * Collects event information from user
   */
  private async collectEvents(): Promise<WebSocketEvent[] | null> {
    const events: WebSocketEvent[] = [];

    let addMore = true;
    while (addMore) {
      const event = await this.createEvent();
      if (event) {
        events.push(event);
      }

      if (events.length > 0) {
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
      } else {
        addMore = false;
      }
    }

    return events.length > 0 ? events : null;
  }

  /**
   * Creates a single event through user interaction
   */
  private async createEvent(): Promise<WebSocketEvent | null> {
    // Get event name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter event name (e.g., message, notification)',
      placeHolder: 'message',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Event name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid event name';
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
      prompt: 'Enter event description (optional)',
      placeHolder: `Handles ${eventName} events`,
    });

    // Get payload type
    const payloadType = await vscode.window.showInputBox({
      prompt: 'Enter payload type',
      placeHolder: 'any',
    });

    // Get return type
    const returnType = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: 'void',
      value: 'void',
    });

    // Check if async
    const isAsyncChoice = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Is this event async?' },
    );

    if (!isAsyncChoice) {
      return null;
    }

    // Collect parameters
    const parameters = await this.collectEventParameters();

    return {
      name: eventName,
      description: description?.trim() || `Handles ${eventName} events`,
      payloadType: payloadType?.trim() || 'any',
      returnType: returnType?.trim() || 'void',
      isAsync: isAsyncChoice.value,
      parameters,
    };
  }

  /**
   * Collects event parameters
   */
  private async collectEventParameters(): Promise<
    Array<{ name: string; type: string; description?: string; optional: boolean }>
  > {
    const parameters: Array<{
      name: string;
      type: string;
      description?: string;
      optional: boolean;
    }> = [];

    let addMore = true;
    while (addMore) {
      const addParam = await vscode.window.showQuickPick(
        [
          { label: 'Add parameter', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add parameters to event' },
      );

      if (!addParam || addParam.value === 'done') {
        break;
      }

      const nameInput = await vscode.window.showInputBox({
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

      if (!nameInput) {
        continue;
      }

      const typeInput = await vscode.window.showInputBox({
        prompt: 'Enter parameter type',
        placeHolder: 'any',
      });

      const descInput = await vscode.window.showInputBox({
        prompt: 'Enter parameter description (optional)',
        placeHolder: `The ${nameInput} parameter`,
      });

      const optionalChoice = await vscode.window.showQuickPick(
        [{ label: 'Yes', value: true }, { label: 'No', value: false }],
        { placeHolder: 'Is this parameter optional?' },
      );

      parameters.push({
        name: nameInput.trim(),
        type: typeInput?.trim() || 'any',
        ...(descInput && { description: descInput.trim() }),
        optional: optionalChoice?.value || false,
      });
    }

    return parameters;
  }

  /**
   * Collects room information
   */
  private async collectRooms(): Promise<WebSocketRoom[] | null> {
    const rooms: WebSocketRoom[] = [];

    let addMore = true;
    while (addMore) {
      const room = await this.createRoom();
      if (room) {
        rooms.push(room);
      }

      if (rooms.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another room', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another room or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return rooms.length > 0 ? rooms : null;
  }

  /**
   * Creates a single room
   */
  private async createRoom(): Promise<WebSocketRoom | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter room name (e.g., general, private)',
      placeHolder: 'general',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Room name cannot be empty';
        }
        if (!/^[a-zA-Z0-9_-]*$/.test(value)) {
          return 'Room name can only contain letters, numbers, hyphens, and underscores';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Enter room description (optional)',
      placeHolder: `The ${nameInput} room`,
    });

    const maxClientsInput = await vscode.window.showInputBox({
      prompt: 'Enter max clients (optional, leave empty for unlimited)',
      placeHolder: '',
      validateInput: (value) => {
        if (value && value.trim().length > 0) {
          const num = Number.parseInt(value, 10);
          if (isNaN(num) || num <= 0) {
            return 'Must be a positive number';
          }
        }
        return null;
      },
    });

    const requiresAuthChoice = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Does this room require authentication?' },
    );

    if (!requiresAuthChoice) {
      return null;
    }

    return {
      name: nameInput.trim(),
      description: description?.trim() || `The ${nameInput} room`,
      ...(maxClientsInput && { maxClients: Number.parseInt(maxClientsInput, 10) }),
      requiresAuth: requiresAuthChoice.value,
    };
  }

  /**
   * Generates imports based on configuration
   */
  private generateImports(
    _events: WebSocketEvent[],
    rooms: WebSocketRoom[],
    config: NestJSWebSocketGatewayConfig,
    options: WebSocketGatewayGenerationOptions,
  ): string[] {
    const imports = new Set<string>([
      'WebSocketGateway',
      'WebSocketServer',
      'SubscribeMessage',
      'OnGatewayInit',
      'OnGatewayConnection',
      'OnGatewayDisconnect',
    ]);

    if (options.includeCors) {
      imports.add('WebSocketGateway');
    }

    if (config.includeAuthGuard) {
      imports.add('UseGuards');
    }

    if (config.includeValidation) {
      imports.add('ValidationPipe');
      imports.add('UsePipes');
    }

    if (config.includeRoomManagement || rooms.length > 0) {
      imports.add('ConnectedSocket');
    }

    return Array.from(imports);
  }

  /**
   * Generates event interfaces
   */
  private generateEventInterfaces(_gatewayName: string, events: WebSocketEvent[]): string {
    let code = '// Event Interfaces\n\n';

    for (const event of events) {
      const interfaceName = this.ucfirst(event.name);

      code += `export interface ${interfaceName}Event {\n`;

      for (const param of event.parameters) {
        const optional = param.optional ? '?' : '';
        code += `  ${param.name}${optional}: ${param.type};\n`;
      }

      if (event.parameters.length === 0) {
        code += `  // Add your payload properties here\n`;
      }

      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates custom decorators
   */
  private generateDecorators(_gatewayName: string): string {
    let code = '// Custom Decorators\n\n';
    code += `import { createParamDecorator, ExecutionContext } from '@nestjs/common';\n\n`;
    code += `export const CurrentUser = createParamDecorator(\n`;
    code += `  (data: unknown, ctx: ExecutionContext) => {\n`;
    code += `    const client = ctx.switchToWs().getClient();\n`;
    code += `    return client.data?.user;\n`;
    code += `  },\n`;
    code += `);\n`;

    return code;
  }

  /**
   * Generates the gateway code
   */
  private generateGatewayCode(
    gatewayName: string,
    namespace: string,
    events: WebSocketEvent[],
    rooms: WebSocketRoom[],
    imports: string[],
    config: NestJSWebSocketGatewayConfig,
    options: WebSocketGatewayGenerationOptions,
  ): string {
    let code = '';

    // Imports
    code += `import {\n`;
    code += `  ${imports.join(',\n  ')}\n`;
    code += `} from '@nestjs/websockets';\n`;

    if (config.includeAuthGuard) {
      code += `import { } from '@nestjs/common';\n`;
    }

    if (config.includeValidation) {
      code += `import { ValidationPipe } from '@nestjs/common';\n`;
    }

    if (config.includeWebSocketServer) {
      code += `import { Server } from 'socket.io';\n`;
    }

    code += '\n';

    // Generate interfaces file reference
    if (options.generateEventInterfaces) {
      code += `import { ${this.generateInterfaceImports(events)} } from './interfaces';\n`;
      code += '\n';
    }

    // Gateway decorator
    code += `@WebSocketGateway({\n`;
    code += `  namespace: '${namespace}',\n`;
    code += `  cors: ${options.includeCors ? JSON.stringify(options.corsOptions || { origin: '*' }) : 'false'},\n`;
    code += `})\n`;

    if (config.includeAuthGuard) {
      code += `// @UseGuards(YourAuthGuard)\n`;
    }

    if (config.includeValidation && options.includeEventValidation) {
      code += `@UsePipes(new ValidationPipe())\n`;
    }

    code += `export class ${gatewayName}Gateway\n`;
    code += `  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {\n`;

    if (config.includeWebSocketServer) {
      code += `  @WebSocketServer()\n`;
      code += `  server: Server;\n\n`;
    }

    code += `  constructor() {}\n\n`;

    // Lifecycle hooks
    code += this.generateLifecycleHooks(rooms, config);

    // Generate event handlers
    for (const event of events) {
      code += this.generateEventHandler(event, config, options);
      code += '\n';
    }

    // Generate room helpers if enabled
    if (options.includeRoomHelpers && (config.includeRoomManagement || rooms.length > 0)) {
      code += this.generateRoomHelpers(rooms, config);
    }

    // Generate broadcast helpers if enabled
    if (options.includeBroadcastHelpers) {
      code += this.generateBroadcastHelpers(namespace, config);
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generates interface imports
   */
  private generateInterfaceImports(events: WebSocketEvent[]): string {
    const interfaces = events.map((e) => `${this.ucfirst(e.name)}Event`);
    return interfaces.join(', ');
  }

  /**
   * Generates lifecycle hooks
   */
  private generateLifecycleHooks(
    rooms: WebSocketRoom[],
    config: NestJSWebSocketGatewayConfig,
  ): string {
    let code = '';

    // AfterInit
    code += `  afterInit(server: unknown) {\n`;
    code += `    console.log('${this.ucfirst(config.generateGatewayEvents ? 'WebSocket' : '')} Gateway initialized');\n`;
    code += `  }\n\n`;

    // HandleConnection
    code += `  handleConnection(client: unknown, ...args: unknown[]) {\n`;
    code += `    console.log('Client connected');\n`;

    if (config.includeAuthGuard) {
      code += `    // Validate authentication token\n`;
      code += `    // const token = client.handshake.auth.token;\n`;
      code += `    // const user = await this.validateToken(token);\n`;
      code += `    // client.data = { user };\n`;
    }

    code += `  }\n\n`;

    // HandleDisconnect
    code += `  handleDisconnect(client: unknown) {\n`;
    code += `    console.log('Client disconnected');\n`;

    if (rooms.length > 0) {
      code += `    // Leave all rooms\n`;
      code += `    // this.leaveAllRooms(client);\n`;
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates an event handler
   */
  private generateEventHandler(
    event: WebSocketEvent,
    config: NestJSWebSocketGatewayConfig,
    options: WebSocketGatewayGenerationOptions,
  ): string {
    let code = '';

    const interfaceName = `${this.ucfirst(event.name)}Event`;

    // SubscribeMessage decorator
    code += `  @SubscribeMessage('${event.name}')\n`;

    if (config.includeAuthGuard) {
      code += `  // @UseGuards(YourAuthGuard)\n`;
    }

    // Method signature
    const asyncKeyword = event.isAsync ? 'async ' : '';
    code += `  ${asyncKeyword}${event.name}(`;

    // Parameters
    const params: string[] = [];

    if (event.parameters.length > 0) {
      const hasClientParam = event.parameters.some((p) => p.name === 'client');

      if (hasClientParam) {
        for (const param of event.parameters) {
          if (param.name === 'client') {
            params.push(`@ConnectedSocket() ${param.name}: ${param.type}`);
          } else if (options.generateEventInterfaces) {
            const optional = param.optional ? '?' : '';
            params.push(`${param.name}${optional}: ${param.type}`);
          } else {
            const optional = param.optional ? '?' : '';
            params.push(`${param.name}${optional}: ${param.type}`);
          }
        }
      } else {
        params.push(`@MessageBody() data: ${options.generateEventInterfaces ? interfaceName : event.payloadType}`);

        if (config.includeRoomManagement) {
          params.push(`@ConnectedSocket() client: unknown`);
        }
      }
    } else {
      params.push(`@MessageBody() data: ${options.generateEventInterfaces ? 'unknown' : 'any'}`);

      if (config.includeRoomManagement) {
        params.push(`@ConnectedSocket() client: unknown`);
      }
    }

    if (params.length > 0) {
      code += `\n    ${params.join(',\n    ')},\n  `;
    }

    code += `): ${event.returnType} {\n`;

    // Method body
    code += `    // TODO: Implement ${event.name} event handler\n`;
    code += `    console.log('${event.name} event received:', data);\n\n`;

    if (event.isAsync) {
      code += `    try {\n`;
      code += `      // Your async logic here\n`;
      code += `      return { success: true, data: 'Event processed' };\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error('Error processing ${event.name}:', error);\n`;
      code += `      return { success: false, error: 'Processing failed' };\n`;
      code += `    }\n`;
    } else {
      code += `    return { success: true, data: 'Event processed' };\n`;
    }

    code += `  }\n`;

    return code;
  }

  /**
   * Generates room helper methods
   */
  private generateRoomHelpers(rooms: WebSocketRoom[], _config: NestJSWebSocketGatewayConfig): string {
    let code = '\n  // Room Management\n\n';

    // Join room helper
    code += `  joinRoom(client: unknown, roomName: string) {\n`;
    code += `    // client.join(roomName);\n`;
    code += `    console.log(\`Client joined room: \${roomName}\`);\n`;
    code += `  }\n\n`;

    // Leave room helper
    code += `  leaveRoom(client: unknown, roomName: string) {\n`;
    code += `    // client.leave(roomName);\n`;
    code += `    console.log(\`Client left room: \${roomName}\`);\n`;
    code += `  }\n\n`;

    // Leave all rooms helper
    code += `  leaveAllRooms(client: unknown) {\n`;
    code += `    // const rooms = client.rooms;\n`;
    code += `    // rooms.forEach((room) => client.leave(room));\n`;
    code += `  }\n\n`;

    // Get room clients helper
    code += `  getRoomClients(roomName: string): unknown[] {\n`;
    code += `    // Return all clients in the specified room\n`;
    code += `    return [];\n`;
    code += `  }\n\n`;

    // Room-specific helpers
    if (rooms.length > 0) {
      code += `  // Room-Specific Helpers\n\n`;

      for (const room of rooms) {
        const helperName = `join${this.ucfirst(room.name)}Room`;
        code += `  ${helperName}(client: unknown) {\n`;
        code += `    this.joinRoom(client, '${room.name}');\n`;
        if (room.requiresAuth) {
          code += `    // Verify user has access to this room\n`;
        }
        code += `  }\n\n`;
      }
    }

    return code;
  }

  /**
   * Generates broadcast helper methods
   */
  private generateBroadcastHelpers(_namespace: string, _config: NestJSWebSocketGatewayConfig): string {
    let code = '\n  // Broadcast Helpers\n\n';

    // Broadcast to all
    code += `  broadcastToAll(event: string, data: unknown) {\n`;
    if (_config.includeWebSocketServer) {
      code += `    this.server.emit(event, data);\n`;
    } else {
      code += `    // Emit to all connected clients\n`;
    }
    code += `  }\n\n`;

    // Broadcast to room
    code += `  broadcastToRoom(roomName: string, event: string, data: unknown) {\n`;
    if (_config.includeWebSocketServer) {
      code += `    this.server.to(roomName).emit(event, data);\n`;
    } else {
      code += `    // Emit to all clients in the specified room\n`;
    }
    code += `  }\n\n`;

    // Broadcast except sender
    code += `  broadcastExcept(client: unknown, event: string, data: unknown) {\n`;
    if (_config.includeWebSocketServer) {
      code += `    // client.broadcast.emit(event, data);\n`;
    } else {
      code += `    // Emit to all clients except the sender\n`;
    }
    code += `  }\n\n`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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

  /**
   * Creates the gateway file at the specified path
   */
  public async createGatewayFile(
    filePath: string,
    gateway: GeneratedWebSocketGateway,
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write gateway file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(gateway.gatewayCode, 'utf-8'));

    // Create interfaces file if needed
    if (gateway.interfacesCode) {
      const interfacesPath = path.join(directory, 'interfaces.ts');
      const interfacesUri = vscode.Uri.file(interfacesPath);
      await vscode.workspace.fs.writeFile(
        interfacesUri,
        Buffer.from(gateway.interfacesCode, 'utf-8'),
      );
    }

    // Create decorators file if needed
    if (gateway.decoratorsCode) {
      const decoratorsPath = path.join(directory, 'decorators.ts');
      const decoratorsUri = vscode.Uri.file(decoratorsPath);
      await vscode.workspace.fs.writeFile(
        decoratorsUri,
        Buffer.from(gateway.decoratorsCode, 'utf-8'),
      );
    }

    this.logger.info('Gateway file created', { filePath });
  }
}
