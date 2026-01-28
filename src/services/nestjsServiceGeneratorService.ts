import * as path from 'path';
import * as vscode from 'vscode';

import type {
  GeneratedService,
  NestJSServiceConfig,
  NestJSServiceDependency,
  NestJSServiceMethod,
  NestJSServiceParameter,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Service for generating NestJS services with dependency injection,
 * TypeScript interfaces, and business logic separation
 */
export class NestJSServiceGeneratorService {
  private static instance: NestJSServiceGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSServiceGeneratorService {
    NestJSServiceGeneratorService.instance ??= new NestJSServiceGeneratorService();
    return NestJSServiceGeneratorService.instance;
  }

  /**
   * Generates a NestJS service based on user input
   */
  public async generateService(
    _workspacePath: string,
    config: NestJSServiceConfig,
  ): Promise<GeneratedService | null> {
    // Get service name
    const serviceName = await this.getServiceName();
    if (!serviceName) {
      return null;
    }

    // Collect dependencies
    const dependencies = await this.collectDependencies();
    if (!dependencies) {
      return null;
    }

    // Collect methods
    const methods = await this.collectMethods(config);
    if (!methods || methods.length === 0) {
      vscode.window.showWarningMessage('No methods defined. Service generation cancelled.');
      return null;
    }

    // Generate imports
    const imports = this.generateImports(dependencies, methods, config);

    // Generate service code
    const serviceCode = this.generateServiceCode(
      serviceName,
      dependencies,
      methods,
      imports,
      config,
    );

    this.logger.info('NestJS service generated', {
      name: serviceName,
      methods: methods.length,
      dependencies: dependencies.length,
    });

    return {
      name: serviceName,
      methods,
      dependencies,
      imports,
      serviceCode,
    };
  }

  /**
   * Prompts user for service name
   */
  private async getServiceName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter service name (e.g., Users, Products, Orders)',
      placeHolder: 'Users',
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
   * Collects service dependencies from user
   */
  private async collectDependencies(): Promise<NestJSServiceDependency[] | null> {
    const dependencies: NestJSServiceDependency[] = [];

    let addMore = true;
    while (addMore) {
      const dependency = await this.createDependency();
      if (dependency) {
        dependencies.push(dependency);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another dependency', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another dependency or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return dependencies;
  }

  /**
   * Creates a single dependency through user interaction
   */
  private async createDependency(): Promise<NestJSServiceDependency | null> {
    // Choose dependency type
    const typeChoice = await vscode.window.showQuickPick<
      Required<{ label: string; description: string; value: NestJSServiceDependency['type'] }>
    >(
      [
        { label: 'Repository', description: 'Inject a TypeORM repository', value: 'repository' },
        { label: 'Service', description: 'Inject another service', value: 'service' },
        { label: 'Model', description: 'Inject a Mongoose model', value: 'model' },
        { label: 'Custom Provider', description: 'Inject a custom provider', value: 'custom' },
      ],
      { placeHolder: 'Select dependency type' },
    );

    if (!typeChoice) {
      return null;
    }

    // Get dependency name
    const nameInput = await vscode.window.showInputBox({
      prompt: `Enter ${typeChoice.label.toLowerCase()} name (e.g., UserRepository, EmailService)`,
      placeHolder: `${typeChoice.value === 'repository' ? 'User' : typeChoice.value}`,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Dependency name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Dependency name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    // Determine inject as name
    let injectAs: string;
    if (typeChoice.value === 'repository') {
      injectAs = nameInput.trim().replace(/Repository$/, '') + 'Repository';
    } else if (typeChoice.value === 'model') {
      injectAs = nameInput.trim() + 'Model';
    } else {
      injectAs = nameInput.trim();
    }

    return {
      name: nameInput.trim(),
      injectAs,
      type: typeChoice.value,
    };
  }

  /**
   * Collects methods from user
   */
  private async collectMethods(config: NestJSServiceConfig): Promise<NestJSServiceMethod[] | null> {
    const methods: NestJSServiceMethod[] = [];

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
  private async createMethod(config: NestJSServiceConfig): Promise<NestJSServiceMethod | null> {
    // Get method name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter method name (camelCase)',
      placeHolder: 'findAll',
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
      prompt: 'Enter method description (optional, for JSDoc)',
      placeHolder: `Finds all records`,
    });

    // Check if method should be async
    const isAsyncChoice = await vscode.window.showQuickPick(
      [
        { label: 'Yes (async/await)', value: 'yes', description: 'Method will be asynchronous' },
        { label: 'No (synchronous)', value: 'no', description: 'Method will be synchronous' },
      ],
      { placeHolder: 'Should this method be async?' },
    );

    if (!isAsyncChoice) {
      return null;
    }

    const isAsync = isAsyncChoice.value === 'yes';

    // Collect parameters
    const parameters = await this.collectParameters();

    // Get return type
    const returnType = await this.getReturnType(isAsync);

    // Check error handling
    let errorHandling = false;
    let transactional = false;

    if (isAsync && config.includeErrorHandling) {
      const errorHandlingChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, include try-catch', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Include error handling (try-catch)?' },
      );

      errorHandling = errorHandlingChoice?.value === 'yes';
    }

    // Check transaction support
    if (isAsync && config.includeTransactionSupport) {
      const transactionalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Yes, use @Transactional', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        { placeHolder: 'Make this method transactional?' },
      );

      transactional = transactionalChoice?.value === 'yes';
    }

    const method: NestJSServiceMethod = {
      name: methodName,
      parameters,
      returnType,
      isAsync,
      errorHandling,
      transactional,
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 0) {
      method.description = trimmedDescription;
    }

    return method;
  }

  /**
   * Collects parameters for a method
   */
  private async collectParameters(): Promise<NestJSServiceParameter[]> {
    const parameters: NestJSServiceParameter[] = [];

    let addMore = true;
    while (addMore) {
      const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name',
        placeHolder: 'id',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Parameter name must start with lowercase letter';
          }
          return null;
        },
      });

      if (!paramName) {
        break;
      }

      const paramType = await vscode.window.showInputBox({
        prompt: 'Enter parameter type',
        placeHolder: 'string | number | boolean | any',
        value: 'string',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter type cannot be empty';
          }
          return null;
        },
      });

      const paramDescription = await vscode.window.showInputBox({
        prompt: 'Enter parameter description (optional)',
      });

      const optionalChoice = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: 'required' },
          { label: 'Optional', value: 'optional' },
        ],
        { placeHolder: 'Is this parameter required?' },
      );

      const parameter: NestJSServiceParameter = {
        name: paramName.trim(),
        type: paramType?.trim() || 'any',
        optional: optionalChoice?.value === 'optional',
      };

      const trimmedDescription = paramDescription?.trim();
      if (trimmedDescription && trimmedDescription.length > 0) {
        parameter.description = trimmedDescription;
      }

      parameters.push(parameter);

      const addAnother = await vscode.window.showQuickPick(
        [
          { label: 'Add another parameter', value: 'add' },
          { label: 'Done', value: 'done' },
        ],
        { placeHolder: 'Add another parameter?' },
      );

      if (!addAnother || addAnother.value === 'done') {
        addMore = false;
      }
    }

    return parameters;
  }

  /**
   * Gets the return type for a method
   */
  private async getReturnType(_isAsync: boolean): Promise<string> {
    const defaultType = 'Promise<any>';

    const input = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: defaultType,
      value: defaultType,
    });

    return input?.trim() || defaultType;
  }

  /**
   * Generates imports based on dependencies and methods
   */
  private generateImports(
    _dependencies: NestJSServiceDependency[],
    methods: NestJSServiceMethod[],
    config: NestJSServiceConfig,
  ): string[] {
    const imports = new Set<string>(['Injectable']);

    // Check for transactional decorator
    if (methods.some((m) => m.transactional)) {
      imports.add('Transactional');
    }

    // Check if any method uses class-based validation
    if (config.useClassBasedValidation) {
      imports.add('Validate');
    }

    return Array.from(imports);
  }

  /**
   * Generates the service code
   */
  private generateServiceCode(
    serviceName: string,
    dependencies: NestJSServiceDependency[],
    methods: NestJSServiceMethod[],
    imports: string[],
    config: NestJSServiceConfig,
  ): string {
    let code = '';

    // Imports
    code += `import { ${imports.join(', ')} } from '@nestjs/common';\n`;

    if (methods.some((m) => m.transactional)) {
      code += `import { Transactional } from 'typeorm-transactional';\n`;
    }

    // Dependency imports
    for (const dep of dependencies) {
      if (dep.type === 'repository') {
        code += `import { InjectRepository } from '@nestjs/typeorm';\n`;
        code += `import { ${dep.name} } from './entities/${this.kebabCase(dep.name.replace(/Repository$/, ''))}.entity';\n`;
        break; // Only add once
      } else if (dep.type === 'model') {
        code += `import { InjectModel } from '@nestjs/mongoose';\n`;
        code += `import { ${dep.name} } from './schemas/${this.kebabCase(dep.name.replace(/Model$/, ''))}.schema';\n`;
        break; // Only add once
      }
    }

    for (const dep of dependencies) {
      if (dep.type === 'service') {
        code += `import { ${dep.name} } from './${this.kebabCase(dep.name)}.service';\n`;
      }
    }

    code += '\n';

    // Generate interfaces if configured
    if (config.generateInterfaces) {
      code += this.generateInterfaceCode(serviceName, methods);
    }

    // Service decorator
    code += `@Injectable()\n`;
    code += `export class ${serviceName}Service {\n`;

    // Constructor with dependency injection
    if (dependencies.length > 0) {
      code += '  constructor(\n';
      for (const dep of dependencies) {
        const decorator = this.getDependencyInjectionDecorator(dep);
        code += `    ${decorator} private readonly ${this.camelCase(dep.injectAs)}: ${dep.name},\n`;
      }
      code += '  ) {}\n\n';
    }

    // Generate methods
    for (const method of methods) {
      code += this.generateMethodCode(method, config);
      code += '\n';
    }

    code += '}\n';

    return code;
  }

  /**
   * Generates TypeScript interfaces for methods
   */
  private generateInterfaceCode(serviceName: string, methods: NestJSServiceMethod[]): string {
    let code = '';

    for (const method of methods) {
      // Create interface name from method name
      const interfaceName = `${serviceName}${this.ucfirst(method.name)}Args`;

      code += `interface ${interfaceName} {\n`;
      for (const param of method.parameters) {
        const optional = param.optional ? '?' : '';
        code += `  ${param.name}${optional}: ${param.type};\n`;
      }
      code += '}\n\n';
    }

    return code;
  }

  /**
   * Gets the dependency injection decorator for a dependency
   */
  private getDependencyInjectionDecorator(dep: NestJSServiceDependency): string {
    switch (dep.type) {
      case 'repository':
        return `@InjectRepository(${dep.name})`;
      case 'model':
        return `@InjectModel(${dep.name})`;
      case 'service':
        return '';
      case 'custom':
        return `@Inject('${dep.injectAs}')`;
    }
  }

  /**
   * Generates a single method
   */
  private generateMethodCode(method: NestJSServiceMethod, _config: NestJSServiceConfig): string {
    let code = '';

    // JSDoc
    if (method.description || method.parameters.length > 0) {
      code += '  /**\n';
      if (method.description) {
        code += `   * ${this.escapeString(method.description)}\n`;
      }
      for (const param of method.parameters) {
        const optional = param.optional ? ' (optional)' : '';
        code += `   * @param {${param.type}} ${param.name}${optional}`;
        if (param.description) {
          code += ` - ${this.escapeString(param.description)}`;
        }
        code += '\n';
      }
      code += '   * @returns {' + method.returnType + '}\n';
      code += '   */\n';
    }

    // Transactional decorator
    if (method.transactional) {
      code += '  @Transactional()\n';
    }

    // Method signature
    const asyncKeyword = method.isAsync ? 'async ' : '';
    code += `  ${asyncKeyword}${method.name}(`;

    // Parameters
    if (method.parameters.length > 0) {
      const params = method.parameters.map((p) => {
        const optional = p.optional ? '?' : '';
        return `${p.name}${optional}: ${p.type}`;
      });
      code += params.join(', ');
    }

    code += `): ${method.returnType} {\n`;

    // Method body
    if (method.isAsync) {
      if (method.errorHandling) {
        code += '    try {\n';
        code += `      // TODO: Implement ${method.name}\n`;
        code += '      throw new Error("Not implemented");\n';
        code += '    } catch (error) {\n';
        code += '      // Handle error appropriately\n';
        code += '      throw error;\n';
        code += '    }\n';
      } else {
        code += `    // TODO: Implement ${method.name}\n`;
        code += '    throw new Error("Not implemented");\n';
      }
    } else {
      code += `    // TODO: Implement ${method.name}\n`;
      code += '    throw new Error("Not implemented");\n';
    }

    code += '  }';

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
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
   * Creates the service file at the specified path
   */
  public async createServiceFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write service file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Service file created', { filePath });
  }
}
