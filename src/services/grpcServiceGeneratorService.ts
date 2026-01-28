import * as path from 'path';
import * as vscode from 'vscode';

import type {
  GeneratedGrpcService,
  GrpcEnum,
  GrpcMessage,
  GrpcMessageField,
  GrpcServiceConfig,
  GrpcServiceMethod,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating gRPC service definitions with proto files,
 * TypeScript implementations, and client wrappers
 */
export class GrpcServiceGeneratorService {
  private static instance: GrpcServiceGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): GrpcServiceGeneratorService {
    GrpcServiceGeneratorService.instance ??= new GrpcServiceGeneratorService();
    return GrpcServiceGeneratorService.instance;
  }

  /**
   * Generates a gRPC service based on user input
   */
  public async generateService(
    workspacePath: string,
    config: GrpcServiceConfig,
  ): Promise<GeneratedGrpcService | null> {
    // Get package name
    const packageName = await this.getPackageName();
    if (!packageName) {
      return null;
    }

    // Get service name
    const serviceName = await this.getServiceName();
    if (!serviceName) {
      return null;
    }

    // Collect messages
    const messages = await this.collectMessages();
    if (!messages) {
      return null;
    }

    // Collect enums
    const enums = await this.collectEnums();

    // Collect methods
    const methods = await this.collectMethods(config);
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage('No methods defined. Service generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(config);

    // Calculate file paths
    const protoFileName = `${this.kebabCase(serviceName)}.proto`;
    const protoFilePath = path.join(workspacePath, config.defaultProtoPath, protoFileName);
    const serviceFilePath = path.join(workspacePath, config.defaultServicePath, `${serviceName}Service.ts`);
    const clientFilePath = path.join(workspacePath, config.defaultClientPath, `${serviceName}Client.ts`);

    // Generate proto code
    const protoCode = this.generateProtoCode(packageName, serviceName, messages, enums, methods, config);

    // Generate service implementation code
    const serviceCode = this.generateServiceCode(serviceName, methods, messages, enums, config);

    // Generate client wrapper code
    const clientCode = this.generateClientCode(packageName, serviceName, methods, messages, enums, config);

    this.logger.info('gRPC service generated', {
      packageName,
      serviceName,
      methods: methods.length,
      messages: messages.length,
      enums: enums.length,
    });

    return {
      name: serviceName,
      packageName,
      protoFileName,
      methods,
      messages,
      enums,
      protoCode,
      serviceCode,
      clientCode,
      protoFilePath,
      serviceFilePath,
      clientFilePath,
      imports,
    };
  }

  /**
   * Prompts user for package name
   */
  private async getPackageName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter proto package name (e.g., com.example.services)',
      placeHolder: 'myapp.services',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Package name cannot be empty';
        }
        if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(value)) {
          return 'Package name must be dot-separated lowercase identifiers (e.g., myapp.services)';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for service name
   */
  private async getServiceName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter service name (e.g., UserService, ProductService)',
      placeHolder: 'UserService',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Service name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Service name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects message definitions from user
   */
  private async collectMessages(): Promise<GrpcMessage[] | null> {
    const messages: GrpcMessage[] = [];

    let addMore = true;
    while (addMore) {
      const message = await this.createMessage();
      if (message) {
        messages.push(message);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another message', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another message or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return messages.length > 0 ? messages : null;
  }

  /**
   * Creates a single message definition through user interaction
   */
  private async createMessage(): Promise<GrpcMessage | null> {
    // Get message name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter message name (PascalCase)',
      placeHolder: 'GetUserRequest',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Message name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Message name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const messageName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter message description (optional)',
    });

    // Collect fields
    const fields = await this.collectMessageFields();

    const message: GrpcMessage = {
      name: messageName,
      fields,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      message.description = trimmedDescription;
    }

    return message;
  }

  /**
   * Collects message fields from user
   */
  private async collectMessageFields(): Promise<GrpcMessageField[]> {
    const fields: GrpcMessageField[] = [];
    let fieldNumber = 1;

    let addMore = true;
    while (addMore) {
      const fieldName = await vscode.window.showInputBox({
        prompt: `Enter field name (field number: ${fieldNumber})`,
        placeHolder: 'user_id',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Field name cannot be empty';
          }
          if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
            return 'Field name must be snake_case';
          }
          return null;
        },
      });

      if (!fieldName) {
        break;
      }

      const fieldType = await this.getFieldType();

      const repeatedChoice = await vscode.window.showQuickPick(
        [
          { label: 'Single value', value: 'single' },
          { label: 'Repeated (array)', value: 'repeated' },
        ],
        { placeHolder: 'Is this field repeated?' },
      );

      const optionalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Required (proto2) / Optional (proto3)', value: 'required' },
          { label: 'Optional (proto2 only)', value: 'optional' },
        ],
        { placeHolder: 'Field option (proto2 vs proto3)?' },
      );

      const fieldDescription = await vscode.window.showInputBox({
        prompt: 'Enter field description (optional)',
      });

      const field: GrpcMessageField = {
        name: fieldName.trim(),
        type: fieldType,
        fieldNumber,
        repeated: repeatedChoice?.value === 'repeated',
        optional: optionalChoice?.value === 'optional',
      };

      const trimmedDescription = fieldDescription?.trim();
      if (trimmedDescription && trimmedDescription.length > 0) {
        field.description = trimmedDescription;
      }

      fields.push(field);
      fieldNumber++;

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another field', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another field?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return fields;
  }

  /**
   * Prompts user to select a proto field type
   */
  private async getFieldType(): Promise<string> {
    const types = [
      { label: 'double', value: 'double', description: '64-bit floating point' },
      { label: 'float', value: 'float', description: '32-bit floating point' },
      { label: 'int64', value: 'int64', description: '64-bit integer' },
      { label: 'uint64', value: 'uint64', description: '64-bit unsigned integer' },
      { label: 'int32', value: 'int32', description: '32-bit integer' },
      { label: 'uint32', value: 'uint32', description: '32-bit unsigned integer' },
      { label: 'bool', value: 'bool', description: 'Boolean' },
      { label: 'string', value: 'string', description: 'String' },
      { label: 'bytes', value: 'bytes', description: 'Byte array' },
      { label: 'Custom message type', value: 'custom', description: 'Reference to another message type' },
    ];

    const choice = await vscode.window.showQuickPick(
      types,
      { placeHolder: 'Select field type' },
    );

    if (!choice) {
      return 'string';
    }

    if (choice.value === 'custom') {
      const customType = await vscode.window.showInputBox({
        prompt: 'Enter custom message type name',
        placeHolder: 'UserMessage',
      });
      return customType?.trim() || 'string';
    }

    return choice.value;
  }

  /**
   * Collects enum definitions from user
   */
  private async collectEnums(): Promise<GrpcEnum[]> {
    const enums: GrpcEnum[] = [];

    let addMore = true;
    while (addMore) {
      const enumDef = await this.createEnum();
      if (enumDef) {
        enums.push(enumDef);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another enum', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another enum or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return enums;
  }

  /**
   * Creates a single enum definition through user interaction
   */
  private async createEnum(): Promise<GrpcEnum | null> {
    // Get enum name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter enum name (PascalCase)',
      placeHolder: 'UserStatus',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Enum name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Enum name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const enumName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter enum description (optional)',
    });

    // Collect enum values
    const values: Array<{ name: string; value: number; description?: string }> = [];
    let currentValue = 0;

    let addMore = true;
    while (addMore) {
      const valueName = await vscode.window.showInputBox({
        prompt: 'Enter enum value name (UPPER_CASE)',
        placeHolder: 'ACTIVE',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Value name cannot be empty';
          }
          if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
            return 'Value name must be UPPER_CASE';
          }
          return null;
        },
      });

      if (!valueName) {
        break;
      }

      const valueDescription = await vscode.window.showInputBox({
        prompt: 'Enter value description (optional)',
      });

      const enumValue = {
        name: valueName.trim(),
        value: currentValue,
      };

      const trimmedDescription = valueDescription?.trim();
      if (trimmedDescription && trimmedDescription.length > 0) {
        enumValue.description = trimmedDescription;
      }

      values.push(enumValue);
      currentValue++;

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another value', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another value?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    const enumDef: GrpcEnum = {
      name: enumName,
      values,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      enumDef.description = trimmedDescription;
    }

    return enumDef;
  }

  /**
   * Collects methods from user
   */
  private async collectMethods(config: GrpcServiceConfig): Promise<GrpcServiceMethod[] | null> {
    const methods: GrpcServiceMethod[] = [];

    let addMore = true;
    while (addMore) {
      const method = await this.createMethod(config);
      if (method) {
        methods.push(method);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another method', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another method or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return methods.length > 0 ? methods : null;
  }

  /**
   * Creates a single method through user interaction
   */
  private async createMethod(config: GrpcServiceConfig): Promise<GrpcServiceMethod | null> {
    // Get method name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter method name (camelCase)',
      placeHolder: 'getUser',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Method name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Method name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const methodName = nameInput.trim();

    // Get description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter method description (optional)',
    });

    // Get method type
    const methodTypeChoice = await vscode.window.showQuickPick<
      Required<{ label: string; description: string; value: GrpcServiceMethod['methodType'] }>
    >(
      [
        {
          label: 'Unary',
          description: 'Simple request/response',
          value: 'unary',
        },
        {
          label: 'Server Streaming',
          description: 'Request -> Stream of responses',
          value: 'server-streaming',
        },
        {
          label: 'Client Streaming',
          description: 'Stream of requests -> Response',
          value: 'client-streaming',
        },
        {
          label: 'Bidirectional Streaming',
          description: 'Stream of requests <-> Stream of responses',
          value: 'bidi-streaming',
        },
      ],
      { placeHolder: 'Select method type' },
    );

    if (!methodTypeChoice) {
      return null;
    }

    // Get request type
    const requestType = await vscode.window.showInputBox({
      prompt: 'Enter request message type',
      placeHolder: 'GetUserRequest',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Request type cannot be empty';
        }
        return null;
      },
    });

    if (!requestType) {
      return null;
    }

    // Get response type
    const responseType = await vscode.window.showInputBox({
      prompt: 'Enter response message type',
      placeHolder: 'GetUserResponse',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Response type cannot be empty';
        }
        return null;
      },
    });

    if (!responseType) {
      return null;
    }

    // Check error handling
    let errorHandling = false;
    if (config.includeErrorHandling) {
      const errorHandlingChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, include error handling', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include error handling?' },
      );

      errorHandling = errorHandlingChoice?.value === 'yes';
    }

    // Check validation
    let includeValidation = false;
    if (config.includeValidation) {
      const validationChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, include validation', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include request validation?' },
      );

      includeValidation = validationChoice?.value === 'yes';
    }

    const method: GrpcServiceMethod = {
      name: methodName,
      requestType: requestType.trim(),
      responseType: responseType.trim(),
      methodType: methodTypeChoice.value,
      errorHandling,
      includeValidation,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      method.description = trimmedDescription;
    }

    return method;
  }

  /**
   * Generates imports based on config
   */
  private generateImports(_config: GrpcServiceConfig): string[] {
    const imports = [
      'grpc',
      '@grpc/grpc-js',
      '@grpc/proto-loader',
    ];

    return imports;
  }

  /**
   * Generates the proto file code
   */
  private generateProtoCode(
    packageName: string,
    serviceName: string,
    messages: GrpcMessage[],
    enums: GrpcEnum[],
    methods: GrpcServiceMethod[],
    config: GrpcServiceConfig,
  ): string {
    let code = '';

    // Syntax
    code += `syntax = "${config.protoVersion}";\n\n`;

    // Package
    code += `package ${packageName};\n\n`;

    // Options
    code += 'option go_package = "./pb";\n';
    code += 'option java_multiple_files = true;\n';
    code += 'option java_outer_classname = "' + serviceName + 'Proto";\n';
    code += 'option java_package = "' + packageName + '";\n';
    code += 'option csharp_namespace = "' + packageName + '";\n\n';

    // Enums
    for (const enumDef of enums) {
      code += this.generateEnumCode(enumDef);
      code += '\n';
    }

    // Messages
    for (const message of messages) {
      code += this.generateMessageCode(message);
      code += '\n';
    }

    // Service
    code += `service ${serviceName} {\n`;
    for (const method of methods) {
      const stream = this.getMethodStreamModifier(method.methodType);
      code += `  ${stream.req}${method.requestType} ${stream.res}${method.responseType};\n`;
    }
    code += '}\n';

    return code;
  }

  /**
   * Generates enum code for proto file
   */
  private generateEnumCode(enumDef: GrpcEnum): string {
    let code = '';

    if (enumDef.description) {
      code += `// ${this.escapeString(enumDef.description)}\n`;
    }

    code += `enum ${enumDef.name} {\n`;

    for (const value of enumDef.values) {
      if (value.description) {
        code += `  // ${this.escapeString(value.description)}\n`;
      }
      code += `  ${value.name} = ${value.value};\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates message code for proto file
   */
  private generateMessageCode(message: GrpcMessage): string {
    let code = '';

    if (message.description) {
      code += `// ${this.escapeString(message.description)}\n`;
    }

    code += `message ${message.name} {\n`;

    for (const field of message.fields) {
      if (field.description) {
        code += `  // ${this.escapeString(field.description)}\n`;
      }

      const repeated = field.repeated ? 'repeated ' : '';
      const optional = field.optional ? 'optional ' : '';
      code += `  ${optional}${repeated}${field.type} ${field.name} = ${field.fieldNumber};\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Gets stream modifiers for a method type
   */
  private getMethodStreamModifier(methodType: GrpcServiceMethod['methodType']): {
    req: string;
    res: string;
  } {
    switch (methodType) {
      case 'unary':
        return { req: '', res: '' };
      case 'server-streaming':
        return { req: '', res: 'stream ' };
      case 'client-streaming':
        return { req: 'stream ', res: '' };
      case 'bidi-streaming':
        return { req: 'stream ', res: 'stream ' };
    }
  }

  /**
   * Generates the service implementation code
   */
  private generateServiceCode(
    serviceName: string,
    methods: GrpcServiceMethod[],
    messages: GrpcMessage[],
    enums: GrpcEnum[],
    config: GrpcServiceConfig,
  ): string {
    let code = '';

    // Imports
    code += "import { Server, ServerUnaryCall, ServerWritableStream, ServerReadableStream, ServerDuplexStream } from '@grpc/grpc-js';\n";
    code += "import { PackageService } from './${serviceName}_pb';\n\n";

    // Generate TypeScript interfaces for messages
    if (config.generateTypeScriptInterfaces) {
      for (const message of messages) {
        code += this.generateTypeScriptInterface(message);
      }
      code += '\n';
    }

    // Generate TypeScript enums
    if (enums.length > 0) {
      for (const enumDef of enums) {
        code += this.generateTypeScriptEnum(enumDef);
      }
      code += '\n';
    }

    // Service class
    code += `export class ${serviceName}Service {\n`;
    code += '  private server: Server;\n\n';
    code += `  constructor(server: Server) {\n`;
    code += '    this.server = server;\n';
    code += '  }\n\n';

    // Generate methods
    for (const method of methods) {
      code += this.generateServiceMethodCode(method, config);
      code += '\n';
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates TypeScript interface for a message
   */
  private generateTypeScriptInterface(message: GrpcMessage): string {
    let code = '';

    if (message.description) {
      code += `/**\n * ${this.escapeString(message.description)}\n */\n`;
    }

    code += `export interface ${message.name} {\n`;

    for (const field of message.fields) {
      const optional = !field.repeated && field.optional ? '?' : '';
      const arrayModifier = field.repeated ? '[]' : '';
      code += `  ${field.name}${optional}: ${field.type}${arrayModifier};\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates TypeScript enum
   */
  private generateTypeScriptEnum(enumDef: GrpcEnum): string {
    let code = '';

    if (enumDef.description) {
      code += `/**\n * ${this.escapeString(enumDef.description)}\n */\n`;
    }

    code += `export enum ${enumDef.name} {\n`;

    for (const value of enumDef.values) {
      code += `  ${value.name} = ${value.value},\n`;
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates a single service method
   */
  private generateServiceMethodCode(method: GrpcServiceMethod, config: GrpcServiceConfig): string {
    let code = '';

    // JSDoc
    if (method.description) {
      code += '  /**\n';
      code += `   * ${this.escapeString(method.description)}\n`;
      code += '   */\n';
    }

    // Method signature based on type
    const asyncKeyword = 'async ';
    switch (method.methodType) {
      case 'unary':
        code += `  ${asyncKeyword}${method.name}(\n`;
        code += `    call: ServerUnaryCall<${method.requestType}, ${method.responseType}>,\n`;
        code += `    callback: (error: Error | null, response: ${method.responseType}) => void\n`;
        code += '  ): Promise<void> {\n';
        break;

      case 'server-streaming':
        code += `  ${asyncKeyword}${method.name}(\n`;
        code += `    call: ServerUnaryCall<${method.requestType}, ${method.responseType}>\n`;
        code += '  ): void {\n';
        break;

      case 'client-streaming':
        code += `  ${asyncKeyword}${method.name}(\n`;
        code += `    call: ServerReadableStream<${method.requestType}, ${method.responseType}>\n`;
        code += '  ): Promise<void> {\n';
        break;

      case 'bidi-streaming':
        code += `  ${asyncKeyword}${method.name}(\n`;
        code += `    call: ServerDuplexStream<${method.requestType}, ${method.responseType}>\n`;
        code += '  ): Promise<void> {\n';
        break;
    }

    // Method body
    if (method.errorHandling) {
      code += '    try {\n';
      if (method.methodType === 'server-streaming') {
        code += `      // Handle server streaming for ${method.name}\n`;
        code += '      const response = this.createDefaultResponse();\n';
        code += '      call.write(response);\n';
        code += '      call.end();\n';
      } else {
        code += `      // TODO: Implement ${method.name}\n`;
        code += '      throw new Error("Not implemented");\n';
      }
      code += '    } catch (error) {\n';
      code += '      // Handle error and return appropriate gRPC status\n';
      code += '      callback({\n';
      code += '        code: status.INTERNAL,\n';
      code += '        details: error instanceof Error ? error.message : "Unknown error",\n';
      code += '      });\n';
      code += '    }\n';
    } else {
      code += `    // TODO: Implement ${method.name}\n`;
      code += '    throw new Error("Not implemented");\n';
    }

    code += '  }';

    return code;
  }

  /**
   * Generates the client wrapper code
   */
  private generateClientCode(
    packageName: string,
    serviceName: string,
    methods: GrpcServiceMethod[],
    messages: GrpcMessage[],
    enums: GrpcEnum[],
    config: GrpcServiceConfig,
  ): string {
    let code = '';

    // Imports
    code += "import { Client, ChannelCredentials, Metadata } from '@grpc/grpc-js';\n";
    code += "import { protoLoader } from '@grpc/proto-loader';\n";
    code += "import * as path from 'path';\n\n";

    if (config.generateTypeScriptInterfaces) {
      for (const message of messages) {
        code += this.generateTypeScriptInterface(message);
      }
      code += '\n';
    }

    if (enums.length > 0) {
      for (const enumDef of enums) {
        code += this.generateTypeScriptEnum(enumDef);
      }
      code += '\n';
    }

    // Client class
    code += `export class ${serviceName}Client {\n`;
    code += '  private client: any;\n';
    code += '  private proto: any;\n\n';

    // Constructor
    code += '  constructor(\n';
    code += '    serverAddress: string,\n';
    code += '    protoPath: string,\n';
    code += '    credentials = ChannelCredentials.createInsecure()\n';
    code += '  ) {\n';
    code += '    const packageDefinition = protoLoader.loadSync(protoPath, {\n';
    code += '      keepCase: true,\n';
    code += '      longs: String,\n';
    code += '      enums: String,\n';
    code += '      defaults: true,\n';
    code += '      oneofs: true,\n';
    code += '    });\n\n';
    code += '    this.proto = packageDefinition;\n';
    code += `    const serviceDefinition = packageDefinition[${packageName}][${serviceName}];\n`;
    code += '    this.client = new Client(\n';
    code += '      serverAddress,\n';
    code += '      credentials\n';
    code += '    );\n\n';
    code += `    // Wrap client with ${serviceName} service methods\n`;
    code += '    for (const methodName in serviceDefinition) {\n';
    code += '      if (typeof serviceDefinition[methodName] === "function") {\n';
    code += '        this.client[methodName] = this.client.makeGenericClientConstructor(\n';
    code += '          serviceDefinition,\n';
    code += `          '${serviceName}',\n`;
    code += '          {}\n';
    code += '        ).prototype[methodName];\n';
    code += '      }\n';
    code += '    }\n';
    code += '  }\n\n';

    // Generate wrapper methods
    for (const method of methods) {
      code += this.generateClientMethodCode(method, config);
      code += '\n';
    }

    // Close method
    code += '  close(): void {\n';
    code += '    this.client.close();\n';
    code += '  }\n';

    // Get metadata helper
    code += '\n';
    code += '  private createMetadata(customMetadata?: Record<string, string>): Metadata {\n';
    code += '    const metadata = new Metadata();\n';
    code += '    if (customMetadata) {\n';
    code += '      for (const [key, value] of Object.entries(customMetadata)) {\n';
    code += '        metadata.add(key, value);\n';
    code += '      }\n';
    code += '    }\n';
    code += '    return metadata;\n';
    code += '  }\n';

    code += '}\n';

    return code;
  }

  /**
   * Generates a single client wrapper method
   */
  private generateClientMethodCode(method: GrpcServiceMethod, _config: GrpcServiceConfig): string {
    let code = '';

    // JSDoc
    if (method.description) {
      code += '  /**\n';
      code += `   * ${this.escapeString(method.description)}\n`;
      code += '   */\n';
    }

    // Method signature based on type
    const asyncKeyword = 'async ';
    switch (method.methodType) {
      case 'unary':
        code += `  ${asyncKeyword}${method.method}(\n`;
        code += `    request: ${method.requestType},\n`;
        code += '    metadata?: Record<string, string>\n';
        code += `  ): Promise<${method.responseType}> {\n`;
        code += '    return new Promise((resolve, reject) => {\n';
        code += '      this.client.';
        code += `${method.method}(\n`;
        code += '        request,\n';
        code += '        this.createMetadata(metadata),\n';
        code += '        (error: Error, response: any) => {\n';
        code += '          if (error) {\n';
        code += '            return reject(error);\n';
        code += '          }\n';
        code += '          resolve(response);\n';
        code += '        }\n';
        code += '      );\n';
        code += '    });\n';
        code += '  }';
        break;

      case 'server-streaming':
        code += `  ${method.method}(\n`;
        code += `    request: ${method.requestType},\n`;
        code += '    metadata?: Record<string, string>\n';
        code += '  ): any {\n';
        code += '    const call = this.client.';
        code += `${method.method}(\n`;
        code += '      request,\n';
        code += '      this.createMetadata(metadata)\n';
        code += '    );\n';
        code += '    return call;\n';
        code += '  }';
        break;

      case 'client-streaming':
        code += `  ${asyncKeyword}${method.method}(\n`;
        code += '    metadata?: Record<string, string>\n';
        code += `  ): Promise<${method.responseType}> {\n`;
        code += '    return new Promise((resolve, reject) => {\n';
        code += '      const call = this.client.';
        code += `${method.method}(\n`;
        code += '        this.createMetadata(metadata)\n';
        code += '      );\n';
        code += '      // TODO: Implement client streaming\n';
        code += '    });\n';
        code += '  }';
        break;

      case 'bidi-streaming':
        code += `  ${method.method}(\n`;
        code += '    metadata?: Record<string, string>\n';
        code += '  ): any {\n';
        code += '    const call = this.client.';
        code += `${method.method}(\n`;
        code += '      this.createMetadata(metadata)\n';
        code += '    );\n';
        code += '    return call;\n';
        code += '  }';
        break;
    }

    return code;
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
   * Escapes string for use in comments
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }

  /**
   * Creates the proto file at the specified path
   */
  public async createProtoFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Proto file created', { filePath });
  }

  /**
   * Creates the service implementation file at the specified path
   */
  public async createServiceFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Service file created', { filePath });
  }

  /**
   * Creates the client wrapper file at the specified path
   */
  public async createClientFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Client file created', { filePath });
  }
}
