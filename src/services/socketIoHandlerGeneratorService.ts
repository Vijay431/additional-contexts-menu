import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigurationService } from './configurationService';
import { Logger } from '../utils/logger';

export interface SocketIOEventProperty {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string;
}

export interface SocketIOEventDefinition {
  name: string;
  payloadType: string;
  properties: SocketIOEventProperty[];
  isAsync: boolean;
  description?: string;
  acknowledgmentType?: string;
}

export interface SocketIORoomDefinition {
  name: string;
  description?: string;
  requiresAuth: boolean;
  maxClients?: number;
}

export interface SocketIOMiddlewareDefinition {
  name: string;
  type: 'authentication' | 'logging' | 'rate-limit' | 'custom';
  description?: string;
}

export interface SocketIOHandlerGeneratorOptions {
  serverName: string;
  outputDirectory: string;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  generateTypedEvents: boolean;
  generateTypedEmitters: boolean;
  generateTypedNamespaces: boolean;
  includeAuthentication: boolean;
  includeRoomManagement: boolean;
  includeMiddleware: boolean;
  includeErrorHandling: boolean;
  exportType: 'named' | 'default';
}

export interface GeneratedSocketIOHandler {
  serverName: string;
  serverCode: string;
  typesCode?: string;
  middlewareCode?: string;
  eventsCode?: string;
  clientCode?: string;
  usageExample: string;
  filePath: string;
  events: SocketIOEventDefinition[];
  rooms: SocketIORoomDefinition[];
  middlewares: SocketIOMiddlewareDefinition[];
}

/**
 * Service for generating Socket.IO event handlers with TypeScript typing,
 * typed event emitters, listeners, rooms, and middleware for authentication
 */
export class SocketIOHandlerGeneratorService {
  private static instance: SocketIOHandlerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SocketIOHandlerGeneratorService {
    SocketIOHandlerGeneratorService.instance ??= new SocketIOHandlerGeneratorService();
    return SocketIOHandlerGeneratorService.instance;
  }

  /**
   * Collects basic generation options from user
   */
  public async collectOptions(): Promise<SocketIOHandlerGeneratorOptions | null> {
    const configService = ConfigurationService.getInstance();
    const config = configService.getSocketIoHandlerGeneratorConfig();

    // Get server name
    const serverName = await vscode.window.showInputBox({
      prompt: 'Enter the Socket.IO server name',
      value: config.defaultServerName,
      placeHolder: 'e.g., socketServer',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Server name is required';
        }
        return null;
      },
    });

    if (!serverName) {
      return null; // User cancelled
    }

    // Get output directory
    const outputDirectory = await vscode.window.showInputBox({
      prompt: 'Enter the output directory for the Socket.IO handler',
      value: config.defaultOutputPath,
      placeHolder: 'e.g., src/sockets',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Output directory is required';
        }
        return null;
      },
    });

    if (!outputDirectory) {
      return null; // User cancelled
    }

    return {
      serverName,
      outputDirectory,
      includeTypeScript: config.includeTypeScript,
      includeJSDoc: config.includeJSDoc,
      generateTypedEvents: config.generateTypedEvents,
      generateTypedEmitters: config.generateTypedEmitters,
      generateTypedNamespaces: config.generateTypedNamespaces,
      includeAuthentication: config.includeAuthentication,
      includeRoomManagement: config.includeRoomManagement,
      includeMiddleware: config.includeMiddleware,
      includeErrorHandling: config.includeErrorHandling,
      exportType: config.exportType,
    };
  }

  /**
   * Main entry point: Generates Socket.IO handler from user input
   */
  public async generateSocketIOHandler(
    document: vscode.TextDocument,
    options: SocketIOHandlerGeneratorOptions,
  ): Promise<GeneratedSocketIOHandler> {
    // Collect event definitions
    const events = await this.collectEvents();

    if (!events) {
      throw new Error('Event collection cancelled');
    }

    // Collect rooms if room management is enabled
    let rooms: SocketIORoomDefinition[] = [];
    if (options.includeRoomManagement) {
      const collectedRooms = await this.collectRooms();
      if (collectedRooms) {
        rooms = collectedRooms;
      }
    }

    // Collect middlewares if middleware is enabled
    let middlewares: SocketIOMiddlewareDefinition[] = [];
    if (options.includeMiddleware) {
      const collectedMiddlewares = await this.collectMiddlewares();
      if (collectedMiddlewares) {
        middlewares = collectedMiddlewares;
      }
    }

    // Generate server code
    const serverCode = this.generateServerCode(options.serverName, events, rooms, middlewares, options);

    // Generate types code if TypeScript is enabled
    let typesCode: string | undefined;
    if (options.includeTypeScript) {
      typesCode = this.generateTypesCode(options.serverName, events, options);
    }

    // Generate middleware code
    let middlewareCode: string | undefined;
    if (middlewares.length > 0) {
      middlewareCode = this.generateMiddlewareCode(middlewares, options);
    }

    // Generate events code
    let eventsCode: string | undefined;
    if (events.length > 0) {
      eventsCode = this.generateEventsCode(options.serverName, events, options);
    }

    // Generate client code
    let clientCode: string | undefined;
    if (options.generateTypedEmitters) {
      clientCode = this.generateClientCode(options.serverName, events, options);
    }

    // Calculate file path
    const filePath = this.calculateFilePath(document.fileName, options.serverName, options);

    // Generate usage example
    const usageExample = this.generateUsageExample(options.serverName, events, options);

    this.logger.info('Socket.IO handler generated', {
      serverName: options.serverName,
      eventCount: events.length,
      roomCount: rooms.length,
      middlewareCount: middlewares.length,
    });

    return {
      serverName: options.serverName,
      serverCode,
      typesCode: typesCode ?? undefined,
      middlewareCode: middlewareCode ?? undefined,
      eventsCode: eventsCode ?? undefined,
      clientCode: clientCode ?? undefined,
      usageExample,
      filePath,
      events,
      rooms,
      middlewares,
    };
  }

  /**
   * Collects event definitions from user
   */
  private async collectEvents(): Promise<SocketIOEventDefinition[] | null> {
    const events: SocketIOEventDefinition[] = [];

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
  private async createEvent(): Promise<SocketIOEventDefinition | null> {
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

    const description = await vscode.window.showInputBox({
      prompt: 'Enter event description (optional)',
      placeHolder: `Handles ${eventName} events`,
    });

    const payloadType = await this.getPayloadType(eventName);

    const isAsync = await this.getAsyncPreference(eventName);

    const acknowledgmentType = await this.getAcknowledgmentPreference(eventName);

    const properties = await this.getEventProperties(eventName);

    return {
      name: eventName,
      payloadType,
      properties,
      isAsync,
      description: description ?? undefined,
      acknowledgmentType: acknowledgmentType ?? undefined,
    };
  }

  /**
   * Gets payload type from user
   */
  private async getPayloadType(eventName: string): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'any', value: 'any' },
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'void', value: 'void' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: `Select payload type for ${eventName}`,
        title: 'Event Payload Type',
      },
    );

    if (!quickPick) {
      return 'any';
    }

    if (quickPick.value === 'custom') {
      return (
        (await vscode.window.showInputBox({
          prompt: 'Enter custom payload type',
          placeHolder: 'CustomPayloadType',
        })) || 'any'
      );
    }

    return quickPick.value;
  }

  /**
   * Gets async preference from user
   */
  private async getAsyncPreference(eventName: string): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Async event handler', value: true },
        { label: 'No - Sync event handler', value: false },
      ],
      {
        placeHolder: `Is ${eventName} an async event?`,
        title: 'Async Event',
      },
    );

    return selected?.value ?? false;
  }

  /**
   * Gets acknowledgment type from user
   */
  private async getAcknowledgmentPreference(eventName: string): Promise<string | undefined> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'No acknowledgment', value: undefined },
        { label: 'void', value: 'void' },
        { label: 'boolean', value: 'boolean' },
        { label: 'string', value: 'string' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: `Select acknowledgment type for ${eventName}`,
        title: 'Acknowledgment Type',
      },
    );

    if (!selected || selected.value === undefined) {
      return undefined;
    }

    if (selected.value === 'custom') {
      return await vscode.window.showInputBox({
        prompt: 'Enter custom acknowledgment type',
        placeHolder: 'CustomAckType',
      });
    }

    return selected.value;
  }

  /**
   * Gets event properties from user
   */
  private async getEventProperties(eventName: string): Promise<SocketIOEventProperty[]> {
    const properties: SocketIOEventProperty[] = [];
    const addProperties = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Define properties', value: true },
        { label: 'No - Use simple payload type', value: false },
      ],
      {
        placeHolder: `Define payload properties for ${eventName}?`,
      },
    );

    if (!addProperties?.value) {
      return properties;
    }

    let addingProperties = true;
    while (addingProperties) {
      const propName = await vscode.window.showInputBox({
        prompt: `Enter property name (${properties.length + 1}) (leave empty to finish)`,
        placeHolder: 'userId',
      });

      if (!propName || propName.trim().length === 0) {
        addingProperties = false;
        continue;
      }

      const propType = await this.getPropertyType(propName);
      const isRequired = await this.getPropertyRequirement(propName);
      const description = await this.getPropertyDescription(propName);

      properties.push({
        name: propName.trim(),
        type: propType,
        isRequired,
        description,
      });
    }

    return properties;
  }

  /**
   * Gets property type from user
   */
  private async getPropertyType(propName: string): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'array', value: 'unknown[]' },
        { label: 'object', value: 'Record<string, unknown>' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: `Select type for ${propName}`,
      },
    );

    if (!quickPick) {
      return 'unknown';
    }

    if (quickPick.value === 'custom') {
      return (
        (await vscode.window.showInputBox({
          prompt: 'Enter custom type',
          placeHolder: 'CustomType',
        })) || 'unknown'
      );
    }

    return quickPick.value;
  }

  /**
   * Gets property requirement from user
   */
  private async getPropertyRequirement(propName: string): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: true },
        { label: 'Optional', value: false },
      ],
      {
        placeHolder: `Is ${propName} required?`,
      },
    );

    return selected?.value ?? true;
  }

  /**
   * Gets property description from user
   */
  private async getPropertyDescription(propName: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: `Enter description for ${propName} (optional)`,
      placeHolder: `The ${propName} value`,
    });
  }

  /**
   * Collects room definitions from user
   */
  private async collectRooms(): Promise<SocketIORoomDefinition[] | null> {
    const rooms: SocketIORoomDefinition[] = [];

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
  private async createRoom(): Promise<SocketIORoomDefinition | null> {
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

    const requiresAuthChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Requires authentication', value: true },
        { label: 'No - Public room', value: false },
      ],
      { placeHolder: 'Does this room require authentication?' },
    );

    if (!requiresAuthChoice) {
      return null;
    }

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

    return {
      name: nameInput.trim(),
      description: description?.trim() || undefined,
      requiresAuth: requiresAuthChoice.value,
      ...(maxClientsInput && { maxClients: Number.parseInt(maxClientsInput, 10) }),
    };
  }

  /**
   * Collects middleware definitions from user
   */
  private async collectMiddlewares(): Promise<SocketIOMiddlewareDefinition[] | null> {
    const middlewares: SocketIOMiddlewareDefinition[] = [];

    let addMore = true;
    while (addMore) {
      const middleware = await this.createMiddleware();
      if (middleware) {
        middlewares.push(middleware);
      }

      if (middlewares.length > 0) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Add another middleware', value: 'add' },
            { label: 'Finish', value: 'finish' },
          ],
          { placeHolder: 'Add another middleware or finish?' },
        );

        if (!choice || choice.value === 'finish') {
          addMore = false;
        }
      } else {
        addMore = false;
      }
    }

    return middlewares.length > 0 ? middlewares : null;
  }

  /**
   * Creates a single middleware
   */
  private async createMiddleware(): Promise<SocketIOMiddlewareDefinition | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter middleware name',
      placeHolder: 'authMiddleware',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Middleware name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid middleware name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const typeChoice = await vscode.window.showQuickPick(
      [
        { label: 'Authentication', value: 'authentication' },
        { label: 'Logging', value: 'logging' },
        { label: 'Rate Limiting', value: 'rate-limit' },
        { label: 'Custom', value: 'custom' },
      ],
      { placeHolder: 'Select middleware type' },
    );

    if (!typeChoice) {
      return null;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Enter middleware description (optional)',
      placeHolder: `The ${nameInput} middleware`,
    });

    return {
      name: nameInput.trim(),
      type: typeChoice.value as 'authentication' | 'logging' | 'rate-limit' | 'custom',
      description: description?.trim() || undefined,
    };
  }

  /**
   * Generates server code
   */
  private generateServerCode(
    serverName: string,
    events: SocketIOEventDefinition[],
    rooms: SocketIORoomDefinition[],
    middlewares: SocketIOMiddlewareDefinition[],
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(serverName, options);
    code += '\n';

    // Add JSDoc if enabled
    if (options.includeJSDoc) {
      code += this.generateServerJSDoc(serverName, events, rooms);
    }

    // Generate type definitions if TypeScript is enabled
    if (options.includeTypeScript) {
      code += this.generateServerEventMap(serverName, events);
      code += '\n';
      code += this.generateServerSocketDataType(serverName, options);
      code += '\n';
    }

    // Generate the server class
    code += this.generateServerClass(serverName, events, rooms, middlewares, options);

    // Add export statement
    if (options.exportType === 'default') {
      code += `\nexport default new ${serverName}();\n`;
    } else {
      code += `\nexport const ${this.toCamelCase(serverName)} = new ${serverName}();\n`;
    }

    return code;
  }

  /**
   * Generates imports
   */
  private generateImports(serverName: string, options: SocketIOHandlerGeneratorOptions): string {
    let imports = "import { Server as SocketIOServer, Socket } from 'socket.io';\n";

    if (options.includeTypeScript) {
      imports += '\n// Type imports for Socket.IO\n';
      imports += `import type { DefaultEventsMap } from 'socket.io';\n`;
    }

    return imports;
  }

  /**
   * Generates JSDoc for server
   */
  private generateServerJSDoc(
    serverName: string,
    events: SocketIOEventDefinition[],
    rooms: SocketIORoomDefinition[],
  ): string {
    let jsdoc = '/**\n';
    jsdoc += ` * ${serverName} - Socket.IO server with typed events\n`;
    jsdoc += ' *\n';

    if (events.length > 0) {
      jsdoc += ' * Events:\n';
      for (const event of events) {
        const async = event.isAsync ? ' (async)' : '';
        const ack = event.acknowledgmentType ? ` -> ${event.acknowledgmentType}` : '';
        jsdoc += ` * @event ${event.name}${async}${ack} - ${event.description || `Payload: ${event.payloadType}`}\n`;
        if (event.properties.length > 0) {
          for (const prop of event.properties) {
            const optional = prop.isRequired ? '' : ' (optional)';
            jsdoc += ` * @property {${prop.type}} ${prop.name}${optional} - ${prop.description || prop.name}\n`;
          }
        }
      }
    }

    if (rooms.length > 0) {
      jsdoc += ' *\n';
      jsdoc += ' * Rooms:\n';
      for (const room of rooms) {
        const auth = room.requiresAuth ? ' (requires auth)' : '';
        jsdoc += ` * @room ${room.name}${auth} - ${room.description || room.name}\n`;
      }
    }

    jsdoc += ' */\n';
    return jsdoc;
  }

  /**
   * Generates server event map type
   */
  private generateServerEventMap(serverName: string, events: SocketIOEventDefinition[]): string {
    let code = `interface ${serverName}EventsMap {\n`;

    for (const event of events) {
      const payloadInterface = this.generatePayloadInterfaceName(event.name);
      const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;

      if (event.acknowledgmentType) {
        code += `  '${event.name}': (payload: ${payloadType}) => ${event.acknowledgmentType};\n`;
      } else {
        code += `  '${event.name}': (payload: ${payloadType}) => void;\n`;
      }
    }

    code += '}\n';
    return code;
  }

  /**
   * Generates server socket data type
   */
  private generateServerSocketDataType(
    serverName: string,
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = `interface ${serverName}SocketData {\n`;

    if (options.includeAuthentication) {
      code += `  userId?: string;\n`;
      code += `  userName?: string;\n`;
      code += `  isAuthenticated?: boolean;\n`;
    }

    code += `  [key: string]: unknown;\n`;
    code += '}\n';

    return code;
  }

  /**
   * Generates the server class
   */
  private generateServerClass(
    serverName: string,
    events: SocketIOEventDefinition[],
    rooms: SocketIORoomDefinition[],
    middlewares: SocketIOMiddlewareDefinition[],
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = `class ${serverName} {\n`;

    if (options.includeTypeScript) {
      code += `  private io: SocketIOServer<${serverName}EventsMap, ${serverName}EventsMap, DefaultEventsMap, ${serverName}SocketData>;\n\n`;
    } else {
      code += `  private io: SocketIOServer;\n\n`;
    }

    // Add constructor
    code += '  constructor(httpServer?: any) {\n';
    code += `    this.io = new SocketIOServer(httpServer || 3000, {\n`;
    code += `      cors: { origin: '*' },\n`;
    code += `    });\n\n`;
    code += `    this.setupMiddleware();\n`;
    code += `    this.setupEventHandlers();\n`;
    code += `  }\n\n`;

    // Add middleware setup
    if (middlewares.length > 0) {
      code += this.generateMiddlewareSetupMethod(middlewares, options);
    }

    // Add event handlers setup
    code += this.generateEventHandlersSetupMethod(events, options);

    // Add connection handler
    code += this.generateConnectionHandler(rooms, options);

    // Add event handler methods
    for (const event of events) {
      code += this.generateEventHandlerMethod(event, options);
    }

    // Add room helper methods if enabled
    if (options.includeRoomManagement && rooms.length > 0) {
      code += this.generateRoomHelperMethods(rooms, options);
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates middleware setup method
   */
  private generateMiddlewareSetupMethod(
    middlewares: SocketIOMiddlewareDefinition[],
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '  private setupMiddleware(): void {\n';

    for (const middleware of middlewares) {
      code += `    this.io.use(this.${this.toCamelCase(middleware.name)});\n`;
    }

    code += '  }\n\n';

    // Add individual middleware methods
    for (const middleware of middlewares) {
      code += this.generateMiddlewareMethod(middleware, options);
    }

    return code;
  }

  /**
   * Generates individual middleware method
   */
  private generateMiddlewareMethod(
    middleware: SocketIOMiddlewareDefinition,
    _options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '';

    if (_options.includeJSDoc) {
      code += `  /**\n`;
      code += `   * ${middleware.description || `${middleware.name} middleware`}\n`;
      code += `   */\n`;
    }

    if (_options.includeTypeScript) {
      code += `  private ${this.toCamelCase(middleware.name)}(`;
      code += `socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ${_options.includeAuthentication ? 'any' : 'unknown'}>, `;
      code += `next: (err?: Error) => void`;
      code += `): void {\n`;
    } else {
      code += `  private ${this.toCamelCase(middleware.name)}(socket, next): void {\n`;
    }

    code += `    // TODO: Implement ${middleware.name} middleware\n`;

    switch (middleware.type) {
      case 'authentication':
        code += `    // const token = socket.handshake.auth.token;\n`;
        code += `    // const user = await this.validateToken(token);\n`;
        code += `    // if (!user) {\n`;
        code += `    //   return next(new Error('Authentication failed'));\n`;
        code += `    // }\n`;
        code += `    // socket.data.userId = user.id;\n`;
        break;
      case 'logging':
        code += `    console.log('Socket connecting:', socket.id);\n`;
        break;
      case 'rate-limit':
        code += `    // const ip = socket.handshake.address;\n`;
        code += `    // if (await this.isRateLimited(ip)) {\n`;
        code += `    //   return next(new Error('Rate limit exceeded'));\n`;
        code += `    // }\n`;
        break;
    }

    code += `    next();\n`;
    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates event handlers setup method
   */
  private generateEventHandlersSetupMethod(
    _events: SocketIOEventDefinition[],
    _options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '  private setupEventHandlers(): void {\n';
    code += `    this.io.on('connection', (socket) => {\n`;
    code += `      this.handleConnection(socket);\n`;
    code += `    });\n`;
    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates connection handler
   */
  private generateConnectionHandler(
    rooms: SocketIORoomDefinition[],
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '';

    if (options.includeJSDoc) {
      code += `  /**\n`;
      code += `   * Handles new socket connections\n`;
      code += `   */\n`;
    }

    if (options.includeTypeScript) {
      code += `  private handleConnection(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ${options.includeAuthentication ? 'any' : 'unknown'}>): void {\n`;
    } else {
      code += `  private handleConnection(socket): void {\n`;
    }

    code += `    console.log('Client connected:', socket.id);\n\n`;

    // Add automatic room joining if room management is enabled
    if (options.includeRoomManagement && rooms.length > 0) {
      code += `    // Auto-join rooms\n`;
      for (const room of rooms) {
        if (!room.requiresAuth) {
          code += `    socket.join('${room.name}');\n`;
        }
      }
      code += '\n';
    }

    code += `    // Setup event listeners for this socket\n`;
    code += `    socket.on('disconnect', () => this.handleDisconnect(socket));\n\n`;
    code += `    // Register event handlers\n`;
    code += `    // Event handlers will be registered here\n`;
    code += `  }\n\n`;

    // Add disconnect handler
    if (options.includeJSDoc) {
      code += `  /**\n`;
      code += `   * Handles socket disconnections\n`;
      code += `   */\n`;
    }

    if (options.includeTypeScript) {
      code += `  private handleDisconnect(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ${options.includeAuthentication ? 'any' : 'unknown'}>): void {\n`;
    } else {
      code += `  private handleDisconnect(socket): void {\n`;
    }

    code += `    console.log('Client disconnected:', socket.id);\n`;
    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates event handler method
   */
  private generateEventHandlerMethod(
    event: SocketIOEventDefinition,
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    const methodName = `handle${this.toPascalCase(event.name)}`;
    let code = '';

    if (options.includeJSDoc) {
      code += `  /**\n`;
      code += `   * Handles ${event.name} event\n`;
      if (event.description) {
        code += `   * ${event.description}\n`;
      }
      code += `   */\n`;
    }

    const asyncKeyword = event.isAsync ? 'async ' : '';
    const payloadInterface = this.generatePayloadInterfaceName(event.name);
    const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;

    if (options.includeTypeScript) {
      code += `  ${asyncKeyword}${methodName}(`;
      code += `socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ${options.includeAuthentication ? 'any' : 'unknown'}>, `;
      code += `payload: ${payloadType}`;
      if (event.acknowledgmentType) {
        code += `, callback: (${event.acknowledgmentType === 'void' ? '' : `result: ${event.acknowledgmentType}`}) => void`;
      }
      code += `): ${event.isAsync ? 'Promise<void>' : 'void'} {\n`;
    } else {
      code += `  ${asyncKeyword}${methodName}(socket, payload${event.acknowledgmentType ? ', callback' : ''}): ${event.isAsync ? 'Promise<void>' : 'void'} {\n`;
    }

    code += `    console.log('${event.name} event received:', payload);\n\n`;

    if (event.isAsync) {
      code += `    try {\n`;
      code += `      // TODO: Implement ${event.name} handler logic\n`;
      if (event.acknowledgmentType) {
        code += `      if (callback) callback(${this.getDefaultReturnValue(event.acknowledgmentType)});\n`;
      }
      code += `    } catch (error) {\n`;
      code += `      console.error('Error in ${event.name}:', error);\n`;
      if (event.acknowledgmentType) {
        code += `      if (callback) callback({ error: 'Processing failed' });\n`;
      }
      code += `    }\n`;
    } else {
      code += `    // TODO: Implement ${event.name} handler logic\n`;
      if (event.acknowledgmentType) {
        code += `    if (callback) callback(${this.getDefaultReturnValue(event.acknowledgmentType)});\n`;
      }
    }

    code += `  }\n\n`;

    return code;
  }

  /**
   * Generates room helper methods
   */
  private generateRoomHelperMethods(
    rooms: SocketIORoomDefinition[],
    _options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '\n  // Room Management\n\n';

    // Join room method
    code += `  joinRoom(socketId: string, roomName: string): void {\n`;
    code += `    const socket = this.io.sockets.sockets.get(socketId);\n`;
    code += `    if (socket) {\n`;
    code += `      socket.join(roomName);\n`;
    code += `      console.log(\`Socket \${socketId} joined room: \${roomName}\`);\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    // Leave room method
    code += `  leaveRoom(socketId: string, roomName: string): void {\n`;
    code += `    const socket = this.io.sockets.sockets.get(socketId);\n`;
    code += `    if (socket) {\n`;
    code += `      socket.leave(roomName);\n`;
    code += `      console.log(\`Socket \${socketId} left room: \${roomName}\`);\n`;
    code += `    }\n`;
    code += `  }\n\n`;

    // Broadcast to room
    code += `  broadcastToRoom(roomName: string, event: string, data: unknown): void {\n`;
    code += `    this.io.to(roomName).emit(event, data);\n`;
    code += `  }\n\n`;

    // Room-specific helpers
    if (rooms.length > 0) {
      code += `  // Room-Specific Helpers\n\n`;
      for (const room of rooms) {
        const helperName = `join${this.toPascalCase(room.name)}Room`;
        code += `  ${helperName}(socketId: string): void {\n`;
        code += `    this.joinRoom(socketId, '${room.name}');\n`;
        if (room.requiresAuth) {
          code += `    // Verify user has access to this room\n`;
        }
        code += `  }\n\n`;
      }
    }

    return code;
  }

  /**
   * Generates types code file
   */
  private generateTypesCode(
    serverName: string,
    events: SocketIOEventDefinition[],
    _options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '// Event payload types\n\n';

    for (const event of events) {
      if (event.properties.length > 0) {
        const interfaceName = this.generatePayloadInterfaceName(event.name);
        code += `export interface ${interfaceName} {\n`;

        for (const prop of event.properties) {
          const optional = prop.isRequired ? '' : '?';
          const comment = prop.description ? ` // ${prop.description}` : '';
          code += `  ${prop.name}${optional}: ${prop.type};${comment}\n`;
        }

        code += '}\n\n';
      }
    }

    // Generate typed events map for client
    code += '// Client-side typed events\n';
    code += `export interface ${serverName}ClientEvents {\n`;
    for (const event of events) {
      const payloadInterface = this.generatePayloadInterfaceName(event.name);
      const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;
      if (event.acknowledgmentType) {
        code += `  '${event.name}': (payload: ${payloadType}, callback: (result: ${event.acknowledgmentType}) => void) => void;\n`;
      } else {
        code += `  '${event.name}': (payload: ${payloadType}) => void;\n`;
      }
    }
    code += '}\n\n';

    // Generate server to client events
    code += `export interface ${serverName}ServerEvents {\n`;
    for (const event of events) {
      const payloadInterface = this.generatePayloadInterfaceName(event.name);
      const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;
      code += `  '${event.name}': (payload: ${payloadType}) => void;\n`;
    }
    code += '}\n';

    return code;
  }

  /**
   * Generates middleware code file
   */
  private generateMiddlewareCode(
    middlewares: SocketIOMiddlewareDefinition[],
    _options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '// Socket.IO middleware functions\n\n';

    for (const middleware of middlewares) {
      if (_options.includeJSDoc) {
        code += `/**\n`;
        code += ` * ${middleware.description || `${middleware.name} middleware`}\n`;
        code += ` */\n`;
      }

      if (_options.includeTypeScript) {
        code += `export const ${middleware.name} = (\n`;
        code += `  socket: any,\n`;
        code += `  next: (err?: Error) => void\n`;
        code += `): void => {\n`;
      } else {
        code += `export const ${middleware.name} = (socket, next) => {\n`;
      }

      code += `  // TODO: Implement ${middleware.name} middleware\n`;
      code += `  next();\n`;
      code += `};\n\n`;
    }

    return code;
  }

  /**
   * Generates events code file
   */
  private generateEventsCode(
    serverName: string,
    events: SocketIOEventDefinition[],
    _options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '// Event handler functions\n\n';

    for (const event of events) {
      const methodName = `handle${this.toPascalCase(event.name)}`;
      const asyncKeyword = event.isAsync ? 'async ' : '';
      const payloadInterface = this.generatePayloadInterfaceName(event.name);
      const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;

      if (_options.includeJSDoc) {
        code += `/**\n`;
        code += ` * Handles ${event.name} event\n`;
        if (event.description) {
          code += ` * ${event.description}\n`;
        }
        code += ` */\n`;
      }

      code += `export const ${methodName} = ${asyncKeyword}(`;
      code += `socket: any, `;
      code += `payload: ${payloadType}`;
      if (event.acknowledgmentType) {
        code += `, callback?: (result: ${event.acknowledgmentType}) => void`;
      }
      code += `): ${event.isAsync ? 'Promise<void>' : 'void'} => {\n`;
      code += `  console.log('${event.name} event received:', payload);\n`;
      code += `  // TODO: Implement ${event.name} handler\n`;
      code += `};\n\n`;
    }

    return code;
  }

  /**
   * Generates client code
   */
  private generateClientCode(
    serverName: string,
    events: SocketIOEventDefinition[],
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let code = '';

    // Add imports
    code += `import { io, Socket } from 'socket.io-client';\n`;

    if (options.includeTypeScript && events.length > 0) {
      code += `import type { ${serverName}ClientEvents, ${serverName}ServerEvents } from './types';\n`;
    }

    code += '\n';

    // Generate typed client class
    if (options.includeJSDoc) {
      code += `/**\n`;
      code += ` * Typed Socket.IO client for ${serverName}\n`;
      code += ` */\n`;
    }

    if (options.includeTypeScript) {
      code += `export class ${serverName}Client {\n`;
      code += `  private socket: Socket<${serverName}ServerEvents, ${serverName}ClientEvents>;\n\n`;
      code += `  constructor(url: string) {\n`;
      code += `    this.socket = io(url);\n`;
      code += `    this.setupEventListeners();\n`;
      code += `  }\n\n`;
      code += `  private setupEventListeners(): void {\n`;
      code += `    // Setup event listeners\n`;
      for (const event of events) {
        code += `    this.socket.on('${event.name}', (data) => {\n`;
        code += `      console.log('${event.name} received:', data);\n`;
        code += `    });\n`;
      }
      code += `  }\n\n`;

      // Generate event emitter methods
      for (const event of events) {
        const payloadInterface = this.generatePayloadInterfaceName(event.name);
        const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;
        const methodName = `emit${this.toPascalCase(event.name)}`;

        code += `  ${methodName}(payload: ${payloadType}): void {\n`;
        if (event.acknowledgmentType) {
          code += `    this.socket.emit('${event.name}', payload, (result) => {\n`;
          code += `      console.log('${event.name} acknowledged:', result);\n`;
          code += `    });\n`;
        } else {
          code += `    this.socket.emit('${event.name}', payload);\n`;
        }
        code += `  }\n\n`;
      }

      code += `  disconnect(): void {\n`;
      code += `    this.socket.disconnect();\n`;
      code += `  }\n`;

      code += `}\n\n`;

      // Export default instance
      if (options.exportType === 'default') {
        code += `export default new ${serverName}Client('http://localhost:3000');\n`;
      } else {
        code += `export const ${this.toCamelCase(serverName)}Client = new ${serverName}Client('http://localhost:3000');\n`;
      }
    } else {
      code += `class ${serverName}Client {\n`;
      code += `  constructor(url) {\n`;
      code += `    this.socket = io(url);\n`;
      code += `  }\n\n`;
      code += `  emit(eventName, data) {\n`;
      code += `    this.socket.emit(eventName, data);\n`;
      code += `  }\n\n`;
      code += `  on(eventName, callback) {\n`;
      code += `    this.socket.on(eventName, callback);\n`;
      code += `  }\n\n`;
      code += `  disconnect() {\n`;
      code += `    this.socket.disconnect();\n`;
      code += `  }\n`;
      code += `}\n\n`;
      code += `export default new ${serverName}Client('http://localhost:3000');\n`;
    }

    return code;
  }

  /**
   * Generates usage example
   */
  private generateUsageExample(
    serverName: string,
    events: SocketIOEventDefinition[],
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    let example = `// Usage example for ${serverName}\n\n`;

    const instanceName =
      options.exportType === 'default' ? serverName : this.toCamelCase(serverName);

    // Server setup
    example += `// Server setup\n`;
    example += `import { ${instanceName} } from './${path.basename(options.outputDirectory)}/${serverName.toLowerCase()}';\n`;
    example += `import { createServer } from 'http';\n\n`;
    example += `const httpServer = createServer();\n`;
    example += `const server = new ${serverName}(httpServer);\n`;
    example += `httpServer.listen(3000);\n\n`;

    // Client usage
    if (options.generateTypedEmitters) {
      const clientInstanceName =
        options.exportType === 'default' ? `${serverName}Client` : `${this.toCamelCase(serverName)}Client`;
      example += `// Client usage\n`;
      example += `import { ${clientInstanceName} } from './client';\n\n`;

      if (events.length > 0) {
        const event = events[0];
        if (event) {
          const methodName = `emit${this.toPascalCase(event.name)}`;
          example += `// Emit ${event.name} event\n`;
          if (event.properties.length > 0) {
            const payloadInterface = this.generatePayloadInterfaceName(event.name);
            example += `${clientInstanceName}.${methodName}({\n`;
            for (let i = 0; i < Math.min(event.properties.length, 2); i++) {
              const prop = event.properties[i];
              if (prop) {
                example += `  ${prop.name}: ${this.getDefaultPlaceholder(prop.type)},\n`;
              }
            }
            example += `});\n\n`;
          } else if (event.payloadType !== 'void') {
            example += `${clientInstanceName}.${methodName}(${this.getDefaultPlaceholder(event.payloadType)});\n\n`;
          } else {
            example += `${clientInstanceName}.${methodName}();\n\n`;
          }

          example += `// Listen to ${event.name} event\n`;
          example += `${clientInstanceName}.socket.on('${event.name}', (data) => {\n`;
          example += `  console.log('${event.name} received:', data);\n`;
          example += `});\n\n`;
        }
      }
    }

    // Room usage example
    if (options.includeRoomManagement && events.length > 0) {
      example += `// Room management\n`;
      example += `// Join a room\n`;
      example += `socket.emit('join-room', { roomName: 'general' });\n\n`;
      example += `// Broadcast to room\n`;
      example += `${instanceName}.broadcastToRoom('general', 'notification', {\n`;
      example += `  message: 'Hello, room!'\n`;
      example += `});\n`;
    }

    return example;
  }

  /**
   * Gets default return value based on type
   */
  private getDefaultReturnValue(type: string): string {
    switch (type) {
      case 'void':
        return 'undefined';
      case 'string':
        return "''";
      case 'number':
        return '0';
      case 'boolean':
        return 'true';
      default:
        return '{}';
    }
  }

  /**
   * Gets default placeholder based on type
   */
  private getDefaultPlaceholder(type: string): string {
    switch (type) {
      case 'string':
        return "''";
      case 'number':
        return '0';
      case 'boolean':
        return 'false';
      case 'void':
        return 'undefined';
      case 'array':
      case 'unknown[]':
        return '[]';
      case 'object':
      case 'Record<string, unknown>':
        return '{}';
      default:
        return 'null';
    }
  }

  /**
   * Generates payload interface name for an event
   */
  private generatePayloadInterfaceName(eventName: string): string {
    return `${this.toPascalCase(eventName)}Payload`;
  }

  /**
   * Calculates file path for the handler
   */
  private calculateFilePath(
    sourceFilePath: string,
    serverName: string,
    options: SocketIOHandlerGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const outputDir = options.outputDirectory || 'socket-handlers';
    const fileName = `${serverName.toLowerCase()}.ts`;
    return path.join(sourceDir, outputDir, fileName);
  }

  /**
   * Converts a string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s/g, '');
  }

  /**
   * Converts a string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Creates the handler file at the specified path
   */
  public async createHandlerFile(filePath: string, handler: GeneratedSocketIOHandler): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write handler file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(handler.serverCode, 'utf-8'));

    // Write types file if exists
    if (handler.typesCode) {
      const typesPath = path.join(directory, 'types.ts');
      const typesUri = vscode.Uri.file(typesPath);
      await vscode.workspace.fs.writeFile(typesUri, Buffer.from(handler.typesCode, 'utf-8'));
    }

    // Write middleware file if exists
    if (handler.middlewareCode) {
      const middlewarePath = path.join(directory, 'middleware.ts');
      const middlewareUri = vscode.Uri.file(middlewarePath);
      await vscode.workspace.fs.writeFile(middlewareUri, Buffer.from(handler.middlewareCode, 'utf-8'));
    }

    // Write events file if exists
    if (handler.eventsCode) {
      const eventsPath = path.join(directory, 'events.ts');
      const eventsUri = vscode.Uri.file(eventsPath);
      await vscode.workspace.fs.writeFile(eventsUri, Buffer.from(handler.eventsCode, 'utf-8'));
    }

    // Write client file if exists
    if (handler.clientCode) {
      const clientPath = path.join(directory, 'client.ts');
      const clientUri = vscode.Uri.file(clientPath);
      await vscode.workspace.fs.writeFile(clientUri, Buffer.from(handler.clientCode, 'utf-8'));
    }

    this.logger.info('Socket.IO handler files created', { filePath });
  }

  /**
   * Checks if a handler file already exists
   */
  public async handlerFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generation options from user
   */
  public async getGeneratorOptions(
    defaultServerName?: string,
  ): Promise<SocketIOHandlerGeneratorOptions | undefined> {
    // Get server name
    const serverName = await vscode.window.showInputBox({
      prompt: 'Enter Socket.IO server class name',
      placeHolder: 'ChatServer',
      value: defaultServerName || 'SocketIOServer',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Server name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Server name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!serverName) {
      return undefined;
    }

    // Get output directory
    const outputDirectory = await vscode.window.showInputBox({
      prompt: 'Enter output directory',
      placeHolder: 'socket-handlers',
      value: 'socket-handlers',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!outputDirectory) {
      return undefined;
    }

    // Get TypeScript preference
    const includeTypeScript = await this.getTypeScriptPreference();

    // Get JSDoc preference
    const includeJSDoc = await this.getJSDocPreference();

    // Get additional features
    const features = await this.getAdditionalFeatures();

    // Get export type
    const exportType = await this.getExportType();

    return {
      serverName: serverName.trim(),
      outputDirectory: outputDirectory.trim(),
      includeTypeScript,
      includeJSDoc,
      generateTypedEvents: features.generateTypedEvents ?? true,
      generateTypedEmitters: features.generateTypedEmitters ?? true,
      generateTypedNamespaces: features.generateTypedNamespaces ?? false,
      includeAuthentication: features.includeAuthentication ?? true,
      includeRoomManagement: features.includeRoomManagement ?? true,
      includeMiddleware: features.includeMiddleware ?? true,
      includeErrorHandling: features.includeErrorHandling ?? true,
      exportType,
    };
  }

  /**
   * Prompts user for TypeScript preference
   */
  private async getTypeScriptPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include TypeScript typing', value: true },
        { label: 'No - Use plain JavaScript', value: false },
      ],
      {
        placeHolder: 'Include TypeScript typing?',
        title: 'TypeScript Support',
      },
    );

    return selected?.value ?? true;
  }

  /**
   * Prompts user for JSDoc preference
   */
  private async getJSDocPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include JSDoc comments', value: true },
        { label: 'No - Skip JSDoc comments', value: false },
      ],
      {
        placeHolder: 'Include JSDoc documentation?',
        title: 'JSDoc Comments',
      },
    );

    return selected?.value ?? true;
  }

  /**
   * Prompts user for additional features
   */
  private async getAdditionalFeatures(): Promise<{
    generateTypedEvents?: boolean;
    generateTypedEmitters?: boolean;
    generateTypedNamespaces?: boolean;
    includeAuthentication?: boolean;
    includeRoomManagement?: boolean;
    includeMiddleware?: boolean;
    includeErrorHandling?: boolean;
  }> {
    const features: {
      generateTypedEvents?: boolean;
      generateTypedEmitters?: boolean;
      generateTypedNamespaces?: boolean;
      includeAuthentication?: boolean;
      includeRoomManagement?: boolean;
      includeMiddleware?: boolean;
      includeErrorHandling?: boolean;
    } = {};

    const typedEvents = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Generate typed event definitions?' },
    );
    features.generateTypedEvents = typedEvents?.value ?? true;

    const typedEmitters = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Generate typed client emitters?' },
    );
    features.generateTypedEmitters = typedEmitters?.value ?? true;

    const typedNamespaces = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Generate typed namespaces?' },
    );
    features.generateTypedNamespaces = typedNamespaces?.value ?? false;

    const auth = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include authentication support?' },
    );
    features.includeAuthentication = auth?.value ?? true;

    const rooms = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include room management?' },
    );
    features.includeRoomManagement = rooms?.value ?? true;

    const middleware = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include middleware support?' },
    );
    features.includeMiddleware = middleware?.value ?? true;

    const errorHandling = await vscode.window.showQuickPick(
      [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      { placeHolder: 'Include error handling?' },
    );
    features.includeErrorHandling = errorHandling?.value ?? true;

    return features;
  }

  /**
   * Prompts user for export type
   */
  private async getExportType(): Promise<'named' | 'default'> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Named Export', description: "export const socketIOServer = new SocketIOServer()", value: 'named' },
        { label: 'Default Export', description: 'export default new SocketIOServer()', value: 'default' },
      ],
      {
        placeHolder: 'Select export type',
      },
    );

    return (selected?.value ?? 'named') as 'named' | 'default';
  }
}
