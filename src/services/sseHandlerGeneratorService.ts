import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SSEHandlerGeneratorOptions {
  endpointName: string;
  outputPath: string;
  includeTypeScript: boolean;
  includeHeartbeat: boolean;
  includeReconnection: boolean;
  includeEventFiltering: boolean;
  heartbeatInterval?: number; // in seconds
  reconnectInterval?: number; // in milliseconds
  maxReconnectAttempts?: number;
  framework: 'express' | 'fastify' | 'nestjs' | 'generic';
  exportType: 'named' | 'default';
}

export interface SSEEvent {
  name: string;
  description?: string;
  dataType: string;
  properties: Array<{
    name: string;
    type: string;
    description?: string;
    optional: boolean;
  }>;
}

export interface GeneratedSSEHandler {
  handlerName: string;
  handlerCode: string;
  typesCode?: string;
  clientCode?: string;
  filePath: string;
  events: SSEEvent[];
  imports: string;
}

/**
 * Service for generating Server-Sent Events (SSE) endpoints
 * Generates event streaming handlers with reconnection, heartbeat, and filtering
 */
export class SSEHandlerGeneratorService {
  private static instance: SSEHandlerGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SSEHandlerGeneratorService {
    SSEHandlerGeneratorService.instance ??= new SSEHandlerGeneratorService();
    return SSEHandlerGeneratorService.instance;
  }

  /**
   * Main entry point: Generates SSE handler from user input
   */
  public async generateSSEHandler(
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): Promise<GeneratedSSEHandler> {
    const handlerName = `${this.pascalToCamel(options.endpointName)}SSEHandler`;

    // Generate handler code
    const handlerCode = this.generateHandlerCode(handlerName, options, events);

    // Generate TypeScript types if needed
    let typesCode: string | undefined;
    if (options.includeTypeScript) {
      typesCode = this.generateTypesCode(handlerName, events, options);
    }

    // Generate client code
    let clientCode: string | undefined;
    clientCode = this.generateClientCode(handlerName, options, events);

    // Determine file path
    const filePath = this.calculateFilePath(options.outputPath, handlerName, options);

    // Generate imports
    const imports = this.generateImports(options, events);

    this.logger.info('SSE handler generated', {
      handlerName,
      eventCount: events.length,
    });

    return {
      handlerName,
      handlerCode,
      typesCode,
      clientCode,
      filePath,
      events,
      imports,
    };
  }

  /**
   * Generates the SSE handler code
   */
  private generateHandlerCode(
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): string {
    let code = this.generateImports(options, events);
    code += '\n';

    // Add JSDoc comment
    code += this.generateHandlerJSDoc(handlerName, events);

    // Generate the handler based on framework
    switch (options.framework) {
      case 'express':
        code += this.generateExpressHandler(handlerName, options, events);
        break;
      case 'fastify':
        code += this.generateFastifyHandler(handlerName, options, events);
        break;
      case 'nestjs':
        code += this.generateNestJSHandler(handlerName, options, events);
        break;
      default:
        code += this.generateGenericHandler(handlerName, options, events);
    }

    return code;
  }

  /**
   * Generates Express SSE handler
   */
  private generateExpressHandler(
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): string {
    const camelName = this.pascalToCamel(handlerName);
    let code = `${options.exportType === 'named' ? 'export' : ''} function ${handlerName}(req: any, res: any) {\n`;
    code += `  // Set SSE headers\n`;
    code += `  res.setHeader('Content-Type', 'text/event-stream');\n`;
    code += `  res.setHeader('Cache-Control', 'no-cache');\n`;
    code += `  res.setHeader('Connection', 'keep-alive');\n`;
    code += `  res.setHeader('X-Accel-Buffering', 'no');\n\n`;

    // Add client ID
    code += `  const clientId = req.query.clientId || Date.now().toString();\n`;
    code += `  console.log(\`Client connected: \${clientId}\`);\n\n`;

    // Send initial connection event
    code += `  // Send initial connection event\n`;
    code += `  res.write(\`event: connected\\ndata: { "clientId": "\${clientId}", "timestamp": "\${new Date().toISOString()}" }\\n\\n\`);\n\n`;

    // Add heartbeat if enabled
    if (options.includeHeartbeat) {
      const interval = options.heartbeatInterval || 30;
      code += `  // Heartbeat to keep connection alive\n`;
      code += `  const heartbeatInterval = setInterval(() => {\n`;
      code += `    res.write(': heartbeat\\n\\n');\n`;
      code += `  }, ${interval * 1000});\n\n`;
    }

    // Add event filtering if enabled
    if (options.includeEventFiltering) {
      code += `  // Event filtering based on client preferences\n`;
      code += `  const clientFilters = req.query.filters ? JSON.parse(req.query.filters) : {};\n`;
      code += `  const shouldSendEvent = (eventType: string, data: any) => {\n`;
      code += `    if (Object.keys(clientFilters).length === 0) return true;\n`;
      code += `    const filter = clientFilters[eventType];\n`;
      code += `    if (!filter) return true;\n`;
      code += `    // Apply filter logic\n`;
      code += `    return true;\n`;
      code += `  };\n\n`;
    }

    // Generate event senders
    for (const event of events) {
      const eventName = event.name;
      const handler = this.pascalToCamel(`send${eventName}`);
      code += `  const ${handler} = (data: ${options.includeTypeScript ? this.getEventDataType(event) : 'any'}) => {\n`;
      if (options.includeEventFiltering) {
        code += `    if (!shouldSendEvent('${eventName}', data)) return;\n`;
      }
      code += `    res.write(\`event: ${eventName}\\ndata: \${JSON.stringify(data)}\\n\\n\`);\n`;
      code += `  };\n\n`;
    }

    // Handle client disconnect
    code += `  // Handle client disconnect\n`;
    code += `  req.on('close', () => {\n`;
    if (options.includeHeartbeat) {
      code += `    clearInterval(heartbeatInterval);\n`;
    }
    code += `    console.log(\`Client disconnected: \${clientId}\`);\n`;
    code += `  });\n\n`;

    code += `  // Store client for sending events\n`;
    code += `  // You can implement a client manager here\n\n`;

    // Return the send functions
    code += `  return {\n`;
    for (const event of events) {
      const handler = this.pascalToCamel(`send${event.name}`);
      code += `    ${handler},\n`;
    }
    code += `  };\n`;
    code += `}\n`;

    // Add exported event types
    code += `\n`;
    code += `export type ${handlerName}Senders = ReturnType<typeof ${handlerName}>;\n`;

    return code;
  }

  /**
   * Generates Fastify SSE handler
   */
  private generateFastifyHandler(
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): string {
    const camelName = this.pascalToCamel(handlerName);
    let code = `${options.exportType === 'named' ? 'export' : ''} async function ${handlerName}(request: FastifyRequest, reply: FastifyReply) {\n`;
    code += `  // Set SSE headers\n`;
    code += `  reply.raw.setHeader('Content-Type', 'text/event-stream');\n`;
    code += `  reply.raw.setHeader('Cache-Control', 'no-cache');\n`;
    code += `  reply.raw.setHeader('Connection', 'keep-alive');\n`;
    code += `  reply.raw.setHeader('X-Accel-Buffering', 'no');\n\n`;

    // Add client ID
    code += `  const clientId = (request.query as any).clientId || Date.now().toString();\n`;
    code += `  console.log(\`Client connected: \${clientId}\`);\n\n`;

    // Send initial connection event
    code += `  // Send initial connection event\n`;
    code += `  reply.raw.write(\`event: connected\\ndata: { "clientId": "\${clientId}", "timestamp": "\${new Date().toISOString()}" }\\n\\n\`);\n\n`;

    // Add heartbeat if enabled
    if (options.includeHeartbeat) {
      const interval = options.heartbeatInterval || 30;
      code += `  // Heartbeat to keep connection alive\n`;
      code += `  const heartbeatInterval = setInterval(() => {\n`;
      code += `    reply.raw.write(': heartbeat\\n\\n');\n`;
      code += `  }, ${interval * 1000});\n\n`;
    }

    // Generate event senders
    for (const event of events) {
      const eventName = event.name;
      const handler = this.pascalToCamel(`send${eventName}`);
      code += `  const ${handler} = (data: ${options.includeTypeScript ? this.getEventDataType(event) : 'any'}) => {\n`;
      code += `    reply.raw.write(\`event: ${eventName}\\ndata: \${JSON.stringify(data)}\\n\\n\`);\n`;
      code += `  };\n\n`;
    }

    // Handle client disconnect
    code += `  // Handle client disconnect\n`;
    code += `  request.raw.on('close', () => {\n`;
    if (options.includeHeartbeat) {
      code += `    clearInterval(heartbeatInterval);\n`;
    }
    code += `    console.log(\`Client disconnected: \${clientId}\`);\n`;
    code += `  });\n\n`;

    code += `  return {\n`;
    for (const event of events) {
      const handler = this.pascalToCamel(`send${event.name}`);
      code += `    ${handler},\n`;
    }
    code += `  };\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates NestJS SSE handler
   */
  private generateNestJSHandler(
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): string {
    const camelName = this.pascalToCamel(handlerName);
    let code = `@Sse('${this.pascalToKebab(options.endpointName)}')\n`;
    code += `${options.exportType === 'named' ? 'export' : ''} async ${handlerName}(@Req() req: Request, @Res() res: Response) {\n`;
    code += `  // Set SSE headers\n`;
    code += `  res.setHeader('Content-Type', 'text/event-stream');\n`;
    code += `  res.setHeader('Cache-Control', 'no-cache');\n`;
    code += `  res.setHeader('Connection', 'keep-alive');\n`;
    code += `  res.setHeader('X-Accel-Buffering', 'no');\n\n`;

    // Add client ID
    code += `  const clientId = (req.query as any).clientId || Date.now().toString();\n`;
    code += `  console.log(\`Client connected: \${clientId}\`);\n\n`;

    // Send initial connection event
    code += `  // Send initial connection event\n`;
    code += `  res.write(\`event: connected\\ndata: { "clientId": "\${clientId}", "timestamp": "\${new Date().toISOString()}" }\\n\\n\`);\n\n`;

    // Add heartbeat if enabled
    if (options.includeHeartbeat) {
      const interval = options.heartbeatInterval || 30;
      code += `  // Heartbeat to keep connection alive\n`;
      code += `  const heartbeatInterval = setInterval(() => {\n`;
      code += `    res.write(': heartbeat\\n\\n');\n`;
      code += `  }, ${interval * 1000});\n\n`;
    }

    // Generate event senders
    for (const event of events) {
      const eventName = event.name;
      const handler = this.pascalToCamel(`send${eventName}`);
      code += `  const ${handler} = (data: ${options.includeTypeScript ? this.getEventDataType(event) : 'any'}) => {\n`;
      code += `    res.write(\`event: ${eventName}\\ndata: \${JSON.stringify(data)}\\n\\n\`);\n`;
      code += `  };\n\n`;
    }

    // Handle client disconnect
    code += `  // Handle client disconnect\n`;
    code += `  req.on('close', () => {\n`;
    if (options.includeHeartbeat) {
      code += `    clearInterval(heartbeatInterval);\n`;
    }
    code += `    console.log(\`Client disconnected: \${clientId}\`);\n`;
    code += `  });\n\n`;

    code += `  return {\n`;
    for (const event of events) {
      const handler = this.pascalToCamel(`send${event.name}`);
      code += `    ${handler},\n`;
    }
    code += `  };\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates generic SSE handler
   */
  private generateGenericHandler(
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): string {
    let code = `${options.exportType === 'named' ? 'export' : ''} function ${handlerName}(request: any, response: any) {\n`;
    code += `  // Set SSE headers\n`;
    code += `  response.setHeader('Content-Type', 'text/event-stream');\n`;
    code += `  response.setHeader('Cache-Control', 'no-cache');\n`;
    code += `  response.setHeader('Connection', 'keep-alive');\n\n`;

    // Send initial connection event
    code += `  const clientId = Date.now().toString();\n`;
    code += `  response.write(\`event: connected\\ndata: { "clientId": "\${clientId}" }\\n\\n\`);\n\n`;

    // Add heartbeat if enabled
    if (options.includeHeartbeat) {
      const interval = options.heartbeatInterval || 30;
      code += `  // Heartbeat to keep connection alive\n`;
      code += `  const heartbeatInterval = setInterval(() => {\n`;
      code += `    response.write(': heartbeat\\n\\n');\n`;
      code += `  }, ${interval * 1000});\n\n`;
    }

    // Generate event senders
    for (const event of events) {
      const handler = this.pascalToCamel(`send${event.name}`);
      code += `  const ${handler} = (data: ${options.includeTypeScript ? this.getEventDataType(event) : 'any'}) => {\n`;
      code += `    response.write(\`event: ${event.name}\\ndata: \${JSON.stringify(data)}\\n\\n\`);\n`;
      code += `  };\n\n`;
    }

    // Handle client disconnect
    code += `  request.on('close', () => {\n`;
    if (options.includeHeartbeat) {
      code += `    clearInterval(heartbeatInterval);\n`;
    }
    code += `  });\n\n`;

    code += `  return {\n`;
    for (const event of events) {
      const handler = this.pascalToCamel(`send${event.name}`);
      code += `    ${handler},\n`;
    }
    code += `  };\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates TypeScript types for events
   */
  private generateTypesCode(
    handlerName: string,
    events: SSEEvent[],
    _options: SSEHandlerGeneratorOptions,
  ): string {
    let code = `// TypeScript types for ${handlerName}\n\n`;

    // Generate event data types
    for (const event of events) {
      code += `export interface ${event.name}Event {\n`;
      for (const prop of event.properties) {
        const optional = prop.optional ? '?' : '';
        const comment = prop.description ? ` // ${prop.description}` : '';
        code += `  ${prop.name}${optional}: ${prop.type};${comment}\n`;
      }
      code += `}\n\n`;
    }

    // Generate event map type
    code += `export type ${handlerName}Events = {\n`;
    for (const event of events) {
      code += `  '${event.name}': ${event.name}Event;\n`;
    }
    code += `};\n\n`;

    // Generate sender type
    code += `export type ${handlerName}Senders = {\n`;
    for (const event of events) {
      const handler = this.pascalToCamel(`send${event.name}`);
      code += `  ${handler}: (data: ${event.name}Event) => void;\n`;
    }
    code += `};\n`;

    return code;
  }

  /**
   * Generates client-side code for connecting to SSE
   */
  private generateClientCode(
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
    events: SSEEvent[],
  ): string {
    let code = `// Client-side code for ${handlerName}\n\n`;
    code += `interface ${handlerName}ClientOptions {\n`;
    code += `  url: string;\n`;
    if (options.includeReconnection) {
      code += `  reconnectInterval?: number;\n`;
      code += `  maxReconnectAttempts?: number;\n`;
    }
    if (options.includeEventFiltering) {
      code += `  filters?: Record<string, any>;\n`;
    }
    code += `  onMessage?: (event: MessageEvent) => void;\n`;
    code += `  onError?: (error: Event) => void;\n`;
    code += `  onOpen?: () => void;\n`;
    code += `  onClose?: () => void;\n`;
    for (const event of events) {
      code += `  on${event.name}?: (data: ${options.includeTypeScript ? event.name + 'Event' : 'any'}) => void;\n`;
    }
    code += `}\n\n`;

    code += `export class ${handlerName}Client {\n`;
    code += `  private eventSource: EventSource | null = null;\n`;
    if (options.includeReconnection) {
      code += `  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;\n`;
      code += `  private reconnectAttempts = 0;\n`;
    }
    code += `  private options: ${handlerName}ClientOptions;\n\n`;

    code += `  constructor(options: ${handlerName}ClientOptions) {\n`;
    code += `    this.options = {\n`;
    if (options.includeReconnection) {
      code += `      reconnectInterval: ${options.reconnectInterval || 5000},\n`;
      code += `      maxReconnectAttempts: ${options.maxReconnectAttempts || 10},\n`;
    }
    code += `      ...options,\n`;
    code += `    };\n`;
    code += `    this.connect();\n`;
    code += `  }\n\n`;

    code += `  private connect() {\n`;
    code += `    const url = new URL(this.options.url);\n`;
    if (options.includeEventFiltering) {
      code += `    if (this.options.filters) {\n`;
      code += `      url.searchParams.set('filters', JSON.stringify(this.options.filters));\n`;
      code += `    }\n`;
    code += `    url.searchParams.set('clientId', Date.now().toString());\n`;
    } else {
      code += `    url.searchParams.set('clientId', Date.now().toString());\n`;
    }
    code += `    \n`;
    code += `    this.eventSource = new EventSource(url.toString());\n\n`;

    code += `    this.eventSource.onopen = () => {\n`;
    code += `      console.log('SSE connection opened');\n`;
    code += `      this.options.onOpen?.();\n`;
    if (options.includeReconnection) {
      code += `      this.reconnectAttempts = 0;\n`;
    }
    code += `    };\n\n`;

    code += `    this.eventSource.onmessage = (event) => {\n`;
    code += `      this.options.onMessage?.(event);\n`;
    code += `    };\n\n`;

    code += `    this.eventSource.onerror = (error) => {\n`;
    code += `      console.error('SSE connection error:', error);\n`;
    code += `      this.options.onError?.(error);\n`;
    if (options.includeReconnection) {
      code += `      this.scheduleReconnect();\n`;
    } else {
      code += `      this.close();\n`;
    }
    code += `    };\n\n`;

    for (const event of events) {
      code += `    this.eventSource.addEventListener('${event.name}', (e: MessageEvent) => {\n`;
      code += `      const data = JSON.parse(e.data);\n`;
      code += `      this.options.on${event.name}?.(data);\n`;
      code += `    });\n\n`;
    }

    code += `  }\n\n`;

    if (options.includeReconnection) {
      code += `  private scheduleReconnect() {\n`;
      code += `    if (\n`;
      code += `      this.options.maxReconnectAttempts &&\n`;
      code += `      this.reconnectAttempts >= this.options.maxReconnectAttempts\n`;
      code += `    ) {\n`;
      code += `      console.error('Max reconnection attempts reached');\n`;
      code += `      this.close();\n`;
      code += `      return;\n`;
      code += `    }\n\n`;
      code += `    this.reconnectAttempts++;\n`;
      code += `    console.log(\`Attempting to reconnect in \${this.options.reconnectInterval}ms...\`);\n\n`;
      code += `    this.reconnectTimer = setTimeout(() => {\n`;
      code += `      this.connect();\n`;
      code += `    }, this.options.reconnectInterval);\n`;
      code += `  }\n\n`;
    }

    code += `  close() {\n`;
    if (options.includeReconnection) {
      code += `    if (this.reconnectTimer) {\n`;
      code += `      clearTimeout(this.reconnectTimer);\n`;
      code += `      this.reconnectTimer = null;\n`;
      code += `    }\n`;
    }
    code += `    if (this.eventSource) {\n`;
    code += `      this.eventSource.close();\n`;
    code += `      this.eventSource = null;\n`;
    code += `    }\n`;
    code += `    this.options.onClose?.();\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    options: SSEHandlerGeneratorOptions,
    _events: SSEEvent[],
  ): string {
    let imports = '';

    if (options.framework === 'nestjs') {
      imports += "import { Sse } from '@nestjs/common';\n";
      imports += "import { Req, Res } from '@nestjs/common';\n";
    }

    return imports;
  }

  /**
   * Generates JSDoc comment for handler
   */
  private generateHandlerJSDoc(handlerName: string, events: SSEEvent[]): string {
    let code = `/**\n`;
    code += ` * SSE Handler for ${handlerName}\n`;
    code += ` * Sends real-time events to connected clients\n`;
    code += ` *\n`;
    code += ` * Events:\n`;
    for (const event of events) {
      code += ` * @event ${event.name}${event.description ? ` - ${event.description}` : ''}\n`;
    }
    code += ` */\n`;
    return code;
  }

  /**
   * Gets the TypeScript type for event data
   */
  private getEventDataType(event: SSEEvent): string {
    if (event.properties.length > 0) {
      return event.name + 'Event';
    }
    return 'any';
  }

  /**
   * Calculates file path for the handler
   */
  private calculateFilePath(
    outputPath: string,
    handlerName: string,
    options: SSEHandlerGeneratorOptions,
  ): string {
    const extension = options.includeTypeScript ? 'ts' : 'js';
    return path.join(outputPath, `${handlerName}.${extension}`);
  }

  /**
   * Creates the handler file at the specified path
   */
  public async createHandlerFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write handler file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('SSE handler file created', { filePath });
  }

  /**
   * Creates the client file at the specified path
   */
  public async createClientFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write client file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('SSE client file created', { filePath });
  }

  /**
   * Checks if a file already exists
   */
  public async fileExists(filePath: string): Promise<boolean> {
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
    defaultEndpointName?: string,
  ): Promise<SSEHandlerGeneratorOptions | undefined> {
    // Ask for endpoint name
    const endpointName = await vscode.window.showInputBox({
      prompt: 'Enter SSE endpoint name',
      placeHolder: 'events',
      value: defaultEndpointName || 'events',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Endpoint name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(value)) {
          return 'Endpoint name must start with a letter and contain only alphanumeric characters and hyphens';
        }
        return null;
      },
    });

    if (!endpointName) {
      return undefined;
    }

    // Ask for framework
    const framework = await vscode.window.showQuickPick(
      [
        { label: 'Express', description: 'Generate Express.js handler', value: 'express' },
        { label: 'Fastify', description: 'Generate Fastify handler', value: 'fastify' },
        { label: 'NestJS', description: 'Generate NestJS controller method', value: 'nestjs' },
        { label: 'Generic', description: 'Generate framework-agnostic handler', value: 'generic' },
      ],
      {
        placeHolder: 'Select the framework',
      },
    );

    if (!framework) {
      return undefined;
    }

    // Ask for output directory
    const outputPath = await vscode.window.showInputBox({
      prompt: 'Enter output directory path',
      placeHolder: './src/handlers',
      value: './src/handlers',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Output path cannot be empty';
        }
        return null;
      },
    });

    if (!outputPath) {
      return undefined;
    }

    // Ask for features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Include TypeScript', description: 'Generate TypeScript code', picked: true },
        {
          label: 'Include Heartbeat',
          description: 'Send periodic heartbeat messages to keep connection alive',
          picked: true,
        },
        {
          label: 'Include Reconnection',
          description: 'Generate client with automatic reconnection logic',
          picked: true,
        },
        {
          label: 'Include Event Filtering',
          description: 'Allow clients to filter events on the server',
          picked: false,
        },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    const featureLabels = features.map((f) => f.label);

    // Ask for heartbeat interval if heartbeat is enabled
    let heartbeatInterval: number | undefined;
    if (featureLabels.includes('Include Heartbeat')) {
      const intervalInput = await vscode.window.showInputBox({
        prompt: 'Enter heartbeat interval (seconds)',
        placeHolder: '30',
        value: '30',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < 1) {
            return 'Heartbeat interval must be a positive number';
          }
          return null;
        },
      });
      heartbeatInterval = intervalInput ? Number.parseInt(intervalInput, 10) : 30;
    }

    // Ask for reconnect interval if reconnection is enabled
    let reconnectInterval: number | undefined;
    let maxReconnectAttempts: number | undefined;
    if (featureLabels.includes('Include Reconnection')) {
      const reconnectInput = await vscode.window.showInputBox({
        prompt: 'Enter reconnection interval (milliseconds)',
        placeHolder: '5000',
        value: '5000',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < 100) {
            return 'Reconnection interval must be at least 100ms';
          }
          return null;
        },
      });
      reconnectInterval = reconnectInput ? Number.parseInt(reconnectInput, 10) : 5000;

      const maxAttemptsInput = await vscode.window.showInputBox({
        prompt: 'Enter maximum reconnection attempts',
        placeHolder: '10',
        value: '10',
        validateInput: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < 1) {
            return 'Max reconnection attempts must be a positive number';
          }
          return null;
        },
      });
      maxReconnectAttempts = maxAttemptsInput ? Number.parseInt(maxAttemptsInput, 10) : 10;
    }

    return {
      endpointName: endpointName.trim(),
      outputPath: outputPath.trim(),
      includeTypeScript: featureLabels.includes('Include TypeScript'),
      includeHeartbeat: featureLabels.includes('Include Heartbeat'),
      includeReconnection: featureLabels.includes('Include Reconnection'),
      includeEventFiltering: featureLabels.includes('Include Event Filtering'),
      heartbeatInterval,
      reconnectInterval,
      maxReconnectAttempts,
      framework: framework.value as 'express' | 'fastify' | 'nestjs' | 'generic',
      exportType: 'named',
    };
  }

  /**
   * Converts PascalCase to camelCase
   */
  private pascalToCamel(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Converts PascalCase to kebab-case
   */
  private pascalToKebab(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }
}
