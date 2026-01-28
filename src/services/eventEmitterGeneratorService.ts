import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface EventProperty {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string | undefined;
}

export interface EventDefinition {
  name: string;
  payloadType: string;
  properties: EventProperty[];
  isAsync: boolean;
  description?: string | undefined;
}

export interface EventEmitterGeneratorOptions {
  emitterName: string;
  outputDirectory: string;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  generateEventMap: boolean;
  includeFilterSupport: boolean;
  includeAsyncHandling: boolean;
  includeOnceSupport: boolean;
  exportType: 'named' | 'default';
}

export interface GeneratedEventEmitter {
  emitterName: string;
  emitterCode: string;
  typesCode?: string;
  usageExample: string;
  filePath: string;
  events: EventDefinition[];
}

/**
 * Service for generating type-safe event emitter classes
 * with publish/subscribe patterns, event filtering, and async handling
 */
export class EventEmitterGeneratorService {
  private static instance: EventEmitterGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): EventEmitterGeneratorService {
    EventEmitterGeneratorService.instance ??= new EventEmitterGeneratorService();
    return EventEmitterGeneratorService.instance;
  }

  /**
   * Main entry point: Generates event emitter from selected code or user input
   */
  public async generateEventEmitter(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: EventEmitterGeneratorOptions,
  ): Promise<GeneratedEventEmitter> {
    const selectedText = document.getText(selection);

    // Parse event definitions from selection or prompt user
    const events = selectedText.trim()
      ? this.parseEventsFromCode(selectedText)
      : await this.promptForEvents();

    if (events.length === 0) {
      throw new Error('No events found or provided');
    }

    // Generate the emitter code
    const emitterCode = this.generateEmitterCode(options.emitterName, events, options);

    // Generate types if TypeScript is enabled
    let typesCode: string | undefined;
    if (options.includeTypeScript) {
      typesCode = this.generateTypesCode(options.emitterName, events, options);
    }

    // Calculate file path
    const filePath = this.calculateFilePath(document.fileName, options.emitterName, options);

    // Generate usage example
    const usageExample = this.generateUsageExample(options.emitterName, events, options);

    this.logger.info('Event emitter generated', {
      emitterName: options.emitterName,
      eventCount: events.length,
    });

    return {
      emitterName: options.emitterName,
      emitterCode,
      typesCode: typesCode ?? undefined,
      usageExample,
      filePath,
      events,
    };
  }

  /**
   * Parses events from selected code
   */
  private parseEventsFromCode(code: string): EventDefinition[] {
    const events: EventDefinition[] = [];
    const trimmedCode = code.trim();

    // Try to parse as TypeScript interface with event types
    const interfaceMatch = trimmedCode.match(
      /(?:export\s+)?interface\s+(\w+Events)\s*\{([\s\S]*?)\}/,
    );
    if (interfaceMatch && interfaceMatch[2]) {
      return this.parseEventsFromInterfaceBody(interfaceMatch[2]);
    }

    // Try to parse as event list using regex exec loop
    const eventRegex =
      /(?:export\s+)?(?:const\s+)?(\w+)\s*:\s*\{\s*payload:\s*([^;,]+)(?:;\s*description:\s*['"]([^'"]+)['"]?)?\s*\};?\s*(?:\/\/.*)?$/gm;
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-cond-assign
    while ((match = eventRegex.exec(trimmedCode)) !== null) {
      const eventName = match[1];
      const payloadType = match[2]?.trim();
      const description = match[3];
      if (eventName && payloadType) {
        events.push({
          name: eventName,
          payloadType,
          properties: [],
          isAsync: false,
          description: description ?? undefined,
        });
      }
    }

    return events;
  }

  /**
   * Parses events from interface body
   */
  private parseEventsFromInterfaceBody(body: string): EventDefinition[] {
    const events: EventDefinition[] = [];
    const lines = body.split(';').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('*')) {
        continue;
      }

      // Match: eventName: (payload: Type) => void
      const match = line.match(/(\w+)\s*:\s*\(\s*payload\s*:\s*([^)]+)\s*\)\s*=>\s*void/);
      if (match) {
        events.push({
          name: match[1],
          payloadType: match[2].trim(),
          properties: [],
          isAsync: false,
        });
      }
    }

    return events;
  }

  /**
   * Prompts user to enter event definitions
   */
  private async promptForEvents(): Promise<EventDefinition[]> {
    const events: EventDefinition[] = [];
    let addingEvents = true;

    while (addingEvents) {
      const eventName = await vscode.window.showInputBox({
        prompt: `Enter event name (${events.length + 1}) (leave empty to finish)`,
        placeHolder: 'userUpdated',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return events.length === 0 ? 'At least one event is required' : null;
          }
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
            return 'Event name can only contain letters, numbers, $, or _';
          }
          if (events.some((e) => e.name === value)) {
            return 'Event name already exists';
          }
          return null;
        },
      });

      if (!eventName || eventName.trim().length === 0) {
        if (events.length > 0) {
          addingEvents = false;
          continue;
        }
        // Add default event if none provided
        return [
          {
            name: 'dataChanged',
            payloadType: 'unknown',
            properties: [],
            isAsync: false,
          },
        ];
      }

      const payloadType = await this.getPayloadType(eventName);
      const isAsync = await this.getAsyncPreference(eventName);
      const description = await this.getEventDescription(eventName);

      const properties = await this.getEventProperties(eventName);

      events.push({
        name: eventName.trim(),
        payloadType,
        properties,
        isAsync,
        description,
      });
    }

    return events;
  }

  /**
   * Prompts user for payload type
   */
  private async getPayloadType(eventName: string): Promise<string> {
    const quickPick = await vscode.window.showQuickPick(
      [
        { label: 'void', value: 'void' },
        { label: 'string', value: 'string' },
        { label: 'number', value: 'number' },
        { label: 'boolean', value: 'boolean' },
        { label: 'unknown', value: 'unknown' },
        { label: 'Custom type...', value: 'custom' },
      ],
      {
        placeHolder: `Select payload type for ${eventName}`,
        title: 'Event Payload Type',
      },
    );

    if (!quickPick) {
      return 'unknown';
    }

    if (quickPick.value === 'custom') {
      return (
        (await vscode.window.showInputBox({
          prompt: 'Enter custom payload type',
          placeHolder: 'CustomPayloadType',
        })) || 'unknown'
      );
    }

    return quickPick.value;
  }

  /**
   * Prompts user if event is async
   */
  private async getAsyncPreference(eventName: string): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Async event handlers', value: true },
        { label: 'No - Sync event handlers', value: false },
      ],
      {
        placeHolder: `Is ${eventName} an async event?`,
        title: 'Async Event',
      },
    );

    return selected?.value ?? false;
  }

  /**
   * Prompts user for event description
   */
  private async getEventDescription(eventName: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: `Enter description for ${eventName} (optional)`,
      placeHolder: 'Fires when user data is updated',
    });
  }

  /**
   * Prompts user for event properties
   */
  private async getEventProperties(eventName: string): Promise<EventProperty[]> {
    const properties: EventProperty[] = [];
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
   * Prompts user for property type
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
   * Prompts user if property is required
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
   * Prompts user for property description
   */
  private async getPropertyDescription(propName: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: `Enter description for ${propName} (optional)`,
      placeHolder: `The ${propName} value`,
    });
  }

  /**
   * Generates the event emitter code
   */
  private generateEmitterCode(
    emitterName: string,
    events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '';

    // Add imports
    code += this.generateImports(options);
    code += '\n';

    // Add JSDoc if enabled
    if (options.includeJSDoc) {
      code += this.generateEmitterJSDoc(emitterName, events);
    }

    // Generate type definitions if TypeScript is enabled
    if (options.includeTypeScript) {
      code += this.generateEventMapType(emitterName, events);
      code += '\n';
      code += this.generateListenerType(emitterName, events, options);
      code += '\n';
      code += this.generateFilterType(emitterName, options);
      code += '\n';
    }

    // Generate the emitter class
    code += this.generateEmitterClass(emitterName, events, options);

    // Add export statement
    if (options.exportType === 'default') {
      code += `\nexport default new ${emitterName}();\n`;
    } else {
      code += `\nexport const ${this.toCamelCase(emitterName)} = new ${emitterName}();\n`;
    }

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(options: EventEmitterGeneratorOptions): string {
    if (!options.includeTypeScript) {
      return '';
    }
    return '// Type imports for event handling\n' +
           "import { EventEmitter } from 'events';\n";
  }

  /**
   * Generates JSDoc comment for the emitter
   */
  private generateEmitterJSDoc(emitterName: string, events: EventDefinition[]): string {
    let jsdoc = '/**\n';
    jsdoc += ` * ${emitterName} - Type-safe event emitter\n`;
    jsdoc += ' *\n';
    jsdoc += ' * Events:\n';

    for (const event of events) {
      const async = event.isAsync ? ' (async)' : '';
      jsdoc += ` * @event ${event.name}${async} - ${event.description || `Payload: ${event.payloadType}`}\n`;
      if (event.properties.length > 0) {
        for (const prop of event.properties) {
          const optional = prop.isRequired ? '' : ' (optional)';
          jsdoc += ` * @property {${prop.type}} ${prop.name}${optional} - ${prop.description || prop.name}\n`;
        }
      }
    }

    jsdoc += ' */\n';
    return jsdoc;
  }

  /**
   * Generates event map type
   */
  private generateEventMapType(emitterName: string, events: EventDefinition[]): string {
    let code = `interface ${emitterName}EventMap {\n`;

    for (const event of events) {
      const payloadInterface = this.generatePayloadInterfaceName(event.name);
      const payloadType = event.properties.length > 0 ? payloadInterface : event.payloadType;

      if (event.isAsync) {
        code += `  ${event.name}: ${payloadType};\n`;
      } else {
        code += `  ${event.name}: ${payloadType};\n`;
      }
    }

    code += '}\n';
    return code;
  }

  /**
   * Generates listener type
   */
  private generateListenerType(
    emitterName: string,
    _events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = `type ${emitterName}Listener = `;

    if (options.includeAsyncHandling) {
      code += '(event: keyof EventEmitterEventMap, listener: (payload: any) => void | Promise<void>) => this;\n';
    } else {
      code += '(event: keyof EventEmitterEventMap, listener: (payload: any) => void) => this;\n';
    }

    return code;
  }

  /**
   * Generates filter type
   */
  private generateFilterType(emitterName: string, _options: EventEmitterGeneratorOptions): string {
    return `type ${emitterName}Filter = <K extends keyof ${emitterName}EventMap>(
  event: K,
  payload: ${emitterName}EventMap[K]
) => boolean;\n`;
  }

  /**
   * Generates the emitter class
   */
  private generateEmitterClass(
    emitterName: string,
    events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = `class ${emitterName} extends EventEmitter {\n`;

    // Add constructor
    code += '\n';
    code += '  constructor() {\n';
    code += '    super();\n';
    code += '  }\n\n';

    // Add type-safe on method
    code += this.generateTypedOnMethod(emitterName, events, options);

    // Add type-safe emit method
    code += this.generateTypedEmitMethod(emitterName, events, options);

    // Add once method if enabled
    if (options.includeOnceSupport) {
      code += this.generateTypedOnceMethod(emitterName, events, options);
    }

    // Add off method
    code += this.generateTypedOffMethod(emitterName, events, options);

    // Add filter method if enabled
    if (options.includeFilterSupport) {
      code += this.generateFilterMethod(emitterName, events, options);
    }

    // Add event-specific methods
    code += this.generateEventSpecificMethods(emitterName, events, options);

    code += '}\n';

    return code;
  }

  /**
   * Generates typed on method
   */
  private generateTypedOnMethod(
    emitterName: string,
    _events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '  /**\n';
    code += '   * Subscribe to an event\n';
    code += '   */\n';

    if (options.includeTypeScript) {
      let methodSignature = '  on<K extends keyof ';
      methodSignature += `${emitterName}EventMap>(\n`;
      methodSignature += '    event: K,\n';
      methodSignature += '    listener: ';
      if (options.includeAsyncHandling) {
        methodSignature += '(payload: ';
        methodSignature += `${emitterName}EventMap[K]) => void | Promise<void>\n`;
      } else {
        methodSignature += `(payload: ${emitterName}EventMap[K]) => void\n`;
      }
      methodSignature += '  ): this {\n';

      code += methodSignature;
      code += '    return super.on(event as string, listener as any);\n';
      code += '  }\n\n';
    } else {
      code += '  on(event, listener) {\n';
      code += '    return super.on(event, listener);\n';
      code += '  }\n\n';
    }

    return code;
  }

  /**
   * Generates typed emit method
   */
  private generateTypedEmitMethod(
    emitterName: string,
    _events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '  /**\n';
    code += '   * Emit an event\n';
    code += '   */\n';

    if (options.includeTypeScript) {
      let methodSignature = '  emit<K extends keyof ';
      methodSignature += `${emitterName}EventMap>(\n`;
      methodSignature += '    event: K,\n';
      methodSignature += `    payload: ${emitterName}EventMap[K]\n`;
      methodSignature += '  ): boolean {\n';

      code += methodSignature;
      code += '    return super.emit(event as string, payload);\n';
      code += '  }\n\n';
    } else {
      code += '  emit(event, payload) {\n';
      code += '    return super.emit(event, payload);\n';
      code += '  }\n\n';
    }

    return code;
  }

  /**
   * Generates typed once method
   */
  private generateTypedOnceMethod(
    emitterName: string,
    _events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '  /**\n';
    code += '   * Subscribe to an event once\n';
    code += '   */\n';

    if (options.includeTypeScript) {
      let methodSignature = '  once<K extends keyof ';
      methodSignature += `${emitterName}EventMap>(\n`;
      methodSignature += '    event: K,\n';
      methodSignature += '    listener: ';
      if (options.includeAsyncHandling) {
        methodSignature += '(payload: ';
        methodSignature += `${emitterName}EventMap[K]) => void | Promise<void>\n`;
      } else {
        methodSignature += `(payload: ${emitterName}EventMap[K]) => void\n`;
      }
      methodSignature += '  ): this {\n';

      code += methodSignature;
      code += '    return super.once(event as string, listener as any);\n';
      code += '  }\n\n';
    } else {
      code += '  once(event, listener) {\n';
      code += '    return super.once(event, listener);\n';
      code += '  }\n\n';
    }

    return code;
  }

  /**
   * Generates typed off method
   */
  private generateTypedOffMethod(
    emitterName: string,
    _events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '  /**\n';
    code += '   * Unsubscribe from an event\n';
    code += '   */\n';

    if (options.includeTypeScript) {
      let methodSignature = '  off<K extends keyof ';
      methodSignature += `${emitterName}EventMap>(\n`;
      methodSignature += '    event: K,\n';
      methodSignature += '    listener: ';
      if (options.includeAsyncHandling) {
        methodSignature += '(payload: ';
        methodSignature += `${emitterName}EventMap[K]) => void | Promise<void>\n`;
      } else {
        methodSignature += `(payload: ${emitterName}EventMap[K]) => void\n`;
      }
      methodSignature += '  ): this {\n';

      code += methodSignature;
      code += '    return super.off(event as string, listener as any);\n';
      code += '  }\n\n';
    } else {
      code += '  off(event, listener) {\n';
      code += '    return super.off(event, listener);\n';
      code += '  }\n\n';
    }

    return code;
  }

  /**
   * Generates filter method
   */
  private generateFilterMethod(
    emitterName: string,
    _events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '  /**\n';
    code += '   * Add a filtered event listener\n';
    code += '   */\n';

    if (options.includeTypeScript) {
      code += '  filter<K extends keyof ';
      code += `${emitterName}EventMap>(\n`;
      code += '    event: K,\n';
      code += `    filterFn: (payload: ${emitterName}EventMap[K]) => boolean,\n`;
      code += '    listener: ';
      if (options.includeAsyncHandling) {
        code += '(payload: ';
        code += `${emitterName}EventMap[K]) => void | Promise<void>\n`;
      } else {
        code += `(payload: ${emitterName}EventMap[K]) => void\n`;
      }
      code += '  ): this {\n';
      code += '    const wrappedListener = (payload: any) => {\n';
      code += '      if (filterFn(payload)) {\n';
      if (options.includeAsyncHandling) {
        code += '        return listener(payload);\n';
      } else {
        code += '        listener(payload);\n';
      }
      code += '      }\n';
      code += '    };\n';
      code += '    return this.on(event, wrappedListener as any);\n';
      code += '  }\n\n';
    } else {
      code += '  filter(event, filterFn, listener) {\n';
      code += '    const wrappedListener = (payload) => {\n';
      code += '      if (filterFn(payload)) {\n';
      code += '        listener(payload);\n';
      code += '      }\n';
      code += '    };\n';
      code += '    return this.on(event, wrappedListener);\n';
      code += '  }\n\n';
    }

    return code;
  }

  /**
   * Generates event-specific methods
   */
  private generateEventSpecificMethods(
    emitterName: string,
    events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let code = '';

    for (const event of events) {
      const methodName = `on${this.toPascalCase(event.name)}`;
      const emitMethodName = `emit${this.toPascalCase(event.name)}`;

      // Add on-specific method
      code += `  /**\n`;
      code += `   * Subscribe to ${event.name} event\n`;
      code += `   */\n`;
      code += `  ${methodName}(`;
      if (options.includeTypeScript) {
        const payloadType = event.properties.length > 0
          ? this.generatePayloadInterfaceName(event.name)
          : event.payloadType;
        if (options.includeAsyncHandling) {
          code += `listener: (payload: ${payloadType}) => void | Promise<void>`;
        } else {
          code += `listener: (payload: ${payloadType}) => void`;
        }
      } else {
        code += 'listener';
      }
      code += `): this {\n`;
      code += `    return this.on('${event.name}' as any, listener as any);\n`;
      code += `  }\n\n`;

      // Add emit-specific method
      code += `  /**\n`;
      code += `   * Emit ${event.name} event\n`;
      code += `   */\n`;
      code += `  ${emitMethodName}(`;
      if (options.includeTypeScript) {
        const payloadType = event.properties.length > 0
          ? this.generatePayloadInterfaceName(event.name)
          : event.payloadType;
        code += `payload: ${payloadType}`;
      } else {
        code += 'payload';
      }
      code += `): boolean {\n`;
      code += `    return this.emit('${event.name}' as any, payload);\n`;
      code += `  }\n\n`;
    }

    return code;
  }

  /**
   * Generates types code file
   */
  private generateTypesCode(
    emitterName: string,
    events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
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

    return code;
  }

  /**
   * Generates payload interface name for an event
   */
  private generatePayloadInterfaceName(eventName: string): string {
    return `${this.toPascalCase(eventName)}Payload`;
  }

  /**
   * Generates usage example
   */
  private generateUsageExample(
    emitterName: string,
    events: EventDefinition[],
    options: EventEmitterGeneratorOptions,
  ): string {
    let example = `// Usage example for ${emitterName}\n\n`;

    const instanceName = options.exportType === 'default' ? emitterName : this.toCamelCase(emitterName);

    example += `import { ${instanceName} } from './${path.basename(options.outputDirectory)}/${emitterName.toLowerCase()}';\n\n`;

    // Subscribe example
    if (events.length > 0) {
      const event = events[0];
      if (event) {
        example += `// Subscribe to ${event.name} event\n`;
        example += `${instanceName}.on('${event.name}', (payload) => {\n`;
        example += `  console.log('${event.name} received:', payload);\n`;
        example += `});\n\n`;

        // Emit example
        example += `// Emit ${event.name} event\n`;
        if (event.properties.length > 0) {
          const payloadInterface = this.generatePayloadInterfaceName(event.name);
          example += `${instanceName}.emit('${event.name}', {\n`;
          for (let i = 0; i < Math.min(event.properties.length, 2); i++) {
            const prop = event.properties[i];
            if (prop) {
              example += `  ${prop.name}: ${this.getDefaultPlaceholder(prop.type)},\n`;
            }
          }
          example += `});\n\n`;
        } else if (event.payloadType !== 'void') {
          example += `${instanceName}.emit('${event.name}', ${this.getDefaultPlaceholder(event.payloadType)});\n\n`;
        } else {
          example += `${instanceName}.emit('${event.name}');\n\n`;
        }
      }
    }

    // Filter example
    if (options.includeFilterSupport && events.length > 0) {
      const event = events[0];
      if (event) {
        example += `// Filtered subscription\n`;
        example += `${instanceName}.filter('${event.name}', (payload) => {\n`;
        example += `  return payload.shouldProcess === true;\n`;
        example += `}, (payload) => {\n`;
        example += `  console.log('Filtered ${event.name}:', payload);\n`;
        example += `});\n\n`;
      }
    }

    // Once example
    if (options.includeOnceSupport && events.length > 0) {
      const event = events[0];
      if (event) {
        example += `// Subscribe once\n`;
        example += `${instanceName}.once('${event.name}', (payload) => {\n`;
        example += `  console.log('${event.name} received once:', payload);\n`;
        example += `});\n\n`;
      }
    }

    // Off example
    if (events.length > 0) {
      const event = events[0];
      if (event) {
        example += `// Unsubscribe\n`;
        example += `const listener = (payload) => {\n`;
        example += `  console.log('${event.name}:', payload);\n`;
        example += `};\n`;
        example += `${instanceName}.on('${event.name}', listener);\n`;
        example += `// Later...\n`;
        example += `${instanceName}.off('${event.name}', listener);\n`;
      }
    }

    return example;
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
   * Calculates file path for the emitter
   */
  private calculateFilePath(
    sourceFilePath: string,
    emitterName: string,
    options: EventEmitterGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const outputDir = options.outputDirectory || 'events';
    const fileName = `${emitterName.toLowerCase()}.ts`;
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
   * Creates the emitter file at the specified path
   */
  public async createEmitterFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write emitter file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Event emitter file created', { filePath });
  }

  /**
   * Checks if an emitter file already exists
   */
  public async emitterFileExists(filePath: string): Promise<boolean> {
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
    defaultEmitterName?: string,
  ): Promise<EventEmitterGeneratorOptions | undefined> {
    // Get emitter name
    const emitterName = await vscode.window.showInputBox({
      prompt: 'Enter event emitter class name',
      placeHolder: 'EventEmitter',
      value: defaultEmitterName || 'EventEmitter',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Emitter name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Emitter name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!emitterName) {
      return undefined;
    }

    // Get output directory
    const outputDirectory = await vscode.window.showInputBox({
      prompt: 'Enter output directory',
      placeHolder: 'events',
      value: 'events',
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
      emitterName: emitterName.trim(),
      outputDirectory: outputDirectory.trim(),
      includeTypeScript,
      includeJSDoc,
      generateEventMap: features.generateEventMap ?? true,
      includeFilterSupport: features.includeFilterSupport ?? true,
      includeAsyncHandling: features.includeAsyncHandling ?? true,
      includeOnceSupport: features.includeOnceSupport ?? true,
      exportType,
    };
  }

  /**
   * Prompts user for TypeScript preference
   */
  private async getTypeScriptPreference(): Promise<boolean> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Include TypeScript types', value: true },
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
    generateEventMap?: boolean;
    includeFilterSupport?: boolean;
    includeAsyncHandling?: boolean;
    includeOnceSupport?: boolean;
  }> {
    const features: {
      generateEventMap?: boolean;
      includeFilterSupport?: boolean;
      includeAsyncHandling?: boolean;
      includeOnceSupport?: boolean;
    } = {};

    const enableEventMap = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Generate event map types', value: true },
        { label: 'No', value: false },
      ],
      {
        placeHolder: 'Generate event map type definitions?',
      },
    );
    features.generateEventMap = enableEventMap?.value ?? true;

    const enableFilter = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Add event filtering support', value: true },
        { label: 'No', value: false },
      ],
      {
        placeHolder: 'Include event filtering?',
      },
    );
    features.includeFilterSupport = enableFilter?.value ?? true;

    const enableAsync = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Support async event handlers', value: true },
        { label: 'No - Sync only', value: false },
      ],
      {
        placeHolder: 'Include async handling?',
      },
    );
    features.includeAsyncHandling = enableAsync?.value ?? true;

    const enableOnce = await vscode.window.showQuickPick(
      [
        { label: 'Yes - Add once() method', value: true },
        { label: 'No', value: false },
      ],
      {
        placeHolder: 'Include once support?',
      },
    );
    features.includeOnceSupport = enableOnce?.value ?? true;

    return features;
  }

  /**
   * Prompts user for export type
   */
  private async getExportType(): Promise<'named' | 'default'> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'Named Export', description: "export const eventEmitter = new EventEmitter()", value: 'named' },
        { label: 'Default Export', description: 'export default new EventEmitter()', value: 'default' },
      ],
      {
        placeHolder: 'Select export type',
      },
    );

    return (selected?.value ?? 'named') as 'named' | 'default';
  }
}
