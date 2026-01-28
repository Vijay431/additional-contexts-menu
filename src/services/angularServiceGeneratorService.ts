import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface AngularServiceMethod {
  name: string;
  description?: string;
  parameters: AngularServiceParameter[];
  returnType: string;
  isAsync: boolean;
  includeErrorHandling: boolean;
}

export interface AngularServiceParameter {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
}

export interface AngularServiceDependency {
  name: string;
  injectAs: string;
  type: 'http' | 'service' | 'custom';
}

export interface GeneratedAngularService {
  name: string;
  filePath: string;
  methods: AngularServiceMethod[];
  dependencies: AngularServiceDependency[];
  serviceCode: string;
}

/**
 * Service for generating Angular services with proper Injectable decorator,
 * TypeScript typing, and RxJS patterns. Supports HttpClient injection and
 * observable patterns.
 */
export class AngularServiceGeneratorService {
  private static instance: AngularServiceGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): AngularServiceGeneratorService {
    AngularServiceGeneratorService.instance ??= new AngularServiceGeneratorService();
    return AngularServiceGeneratorService.instance;
  }

  /**
   * Generates a new Angular service
   */
  public async generateService(document: vscode.TextDocument): Promise<GeneratedAngularService> {
    // Get service name from user
    const serviceName = await this.getServiceName();

    // Ask if service should use HttpClient
    const useHttpClient = await this.askForHttpClient();

    // Ask about methods to generate
    const includeMethods = await this.askForMethods();

    // Get methods details
    const methods = await this.getMethodsDetails(includeMethods);

    // Determine dependencies
    const dependencies = this.buildDependencies(useHttpClient, methods);

    // Generate service code
    const serviceCode = this.generateServiceCode(serviceName, dependencies, methods, useHttpClient);

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, serviceName);

    this.logger.info('Angular service generated', {
      serviceName,
      useHttpClient,
      methodsCount: methods.length,
      dependenciesCount: dependencies.length,
    });

    return {
      name: serviceName,
      filePath,
      methods,
      dependencies,
      serviceCode,
    };
  }

  /**
   * Prompts user for service name
   */
  private async getServiceName(): Promise<string> {
    const defaultName = 'DataService';
    const input = await vscode.window.showInputBox({
      prompt: 'Enter service name (e.g., UserService, ApiService)',
      placeHolder: defaultName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Service name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Service name must start with uppercase letter and contain only letters, numbers, $, or _';
        }
        if (value.endsWith('Service')) {
          return null; // Already ends with Service
        }
        return null;
      },
    });

    const name = input?.trim() || defaultName;
    return name.endsWith('Service') ? name : `${name}Service`;
  }

  /**
   * Asks user if service should use HttpClient
   */
  private async askForHttpClient(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Yes, include HttpClient',
          description: 'Service will make HTTP requests using Angular HttpClient',
          value: true,
        },
        {
          label: 'No, standalone service',
          description: 'Service will not include HttpClient',
          value: false,
        },
      ],
      {
        placeHolder: 'Should this service use HttpClient?',
        title: 'HttpClient Dependency',
      },
    );

    return choice?.value ?? false;
  }

  /**
   * Asks user which methods to include
   */
  private async askForMethods(): Promise<string[]> {
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: 'CRUD Methods',
          description: 'Generate getAll, getById, create, update, delete methods',
          value: 'crud',
          picked: true,
        },
        {
          label: 'Custom Method',
          description: 'Add a custom method with specific parameters',
          value: 'custom',
        },
      ],
      {
        placeHolder: 'Select methods to include',
        title: 'Service Methods',
        canPickMany: true,
      },
    );

    return selected?.map((s) => s.value) || [];
  }

  /**
   * Gets details for methods to be generated
   */
  private async getMethodsDetails(includeMethods: string[]): Promise<AngularServiceMethod[]> {
    const methods: AngularServiceMethod[] = [];

    if (includeMethods.includes('crud')) {
      const resourceType = await this.getResourceType();
      methods.push(
        {
          name: 'getAll',
          returnType: `Observable<${resourceType}[]>`,
          isAsync: true,
          includeErrorHandling: true,
          parameters: [],
          description: 'Get all items',
        },
        {
          name: 'getById',
          returnType: `Observable<${resourceType}>`,
          isAsync: true,
          includeErrorHandling: true,
          parameters: [
            {
              name: 'id',
              type: 'number',
              optional: false,
              description: 'Item ID',
            },
          ],
          description: 'Get item by ID',
        },
        {
          name: 'create',
          returnType: `Observable<${resourceType}>`,
          isAsync: true,
          includeErrorHandling: true,
          parameters: [
            {
              name: 'item',
              type: `${resourceType}`,
              optional: false,
              description: 'Item to create',
            },
          ],
          description: 'Create new item',
        },
        {
          name: 'update',
          returnType: `Observable<${resourceType}>`,
          isAsync: true,
          includeErrorHandling: true,
          parameters: [
            {
              name: 'id',
              type: 'number',
              optional: false,
              description: 'Item ID',
            },
            {
              name: 'item',
              type: `Partial<${resourceType}>`,
              optional: false,
              description: 'Item data to update',
            },
          ],
          description: 'Update existing item',
        },
        {
          name: 'delete',
          returnType: 'Observable<void>',
          isAsync: true,
          includeErrorHandling: true,
          parameters: [
            {
              name: 'id',
              type: 'number',
              optional: false,
              description: 'Item ID',
            },
          ],
          description: 'Delete item',
        },
      );
    }

    if (includeMethods.includes('custom')) {
      const customMethod = await this.getCustomMethodDetails();
      if (customMethod) {
        methods.push(customMethod);
      }
    }

    return methods;
  }

  /**
   * Gets resource type name from user
   */
  private async getResourceType(): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter resource type name (e.g., User, Product, Item)',
      placeHolder: 'Item',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Resource type cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Resource type must start with uppercase letter and contain only letters, numbers, $, or _';
        }
        return null;
      },
    });

    return input?.trim() || 'Item';
  }

  /**
   * Gets details for a custom method
   */
  private async getCustomMethodDetails(): Promise<AngularServiceMethod | null> {
    const methodName = await vscode.window.showInputBox({
      prompt: 'Enter method name',
      placeHolder: 'customMethod',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Method name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Method name must start with lowercase letter';
        }
        return null;
      },
    });

    if (!methodName) {
      return null;
    }

    const isAsync = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Method returns an Observable', value: true },
        { label: 'No', description: 'Method is synchronous', value: false },
      ],
      { placeHolder: 'Should this method be async (return Observable)?' },
    );

    const returnType = await vscode.window.showInputBox({
      prompt: 'Enter return type',
      placeHolder: isAsync?.value ? 'Observable<any>' : 'any',
    });

    const includeErrorHandling = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include catchError operator', value: true },
        { label: 'No', description: 'No error handling', value: false },
      ],
      { placeHolder: 'Include error handling?' },
    );

    return {
      name: methodName.trim(),
      returnType: returnType?.trim() || (isAsync?.value ? 'Observable<any>' : 'any'),
      isAsync: isAsync?.value ?? true,
      includeErrorHandling: includeErrorHandling?.value ?? true,
      parameters: [],
      description: '',
    };
  }

  /**
   * Builds the dependencies array based on user selections
   */
  private buildDependencies(
    useHttpClient: boolean,
    methods: AngularServiceMethod[],
  ): AngularServiceDependency[] {
    const dependencies: AngularServiceDependency[] = [];

    if (useHttpClient) {
      dependencies.push({
        name: 'HttpClient',
        injectAs: 'http',
        type: 'http',
      });
    }

    // Check if methods use error handling that might need additional services
    if (methods.some((m) => m.includeErrorHandling)) {
      // Error handling uses catchError from RxJS, no additional dependency needed
    }

    return dependencies;
  }

  /**
   * Generates the complete service code
   */
  private generateServiceCode(
    serviceName: string,
    dependencies: AngularServiceDependency[],
    methods: AngularServiceMethod[],
    useHttpClient: boolean,
  ): string {
    let code = this.generateImports(serviceName, dependencies, methods);
    code += '\n';
    code += this.generateInjectable(serviceName);
    code += this.generateClassBody(serviceName, dependencies, methods, useHttpClient);
    code += '}\n';

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(
    serviceName: string,
    dependencies: AngularServiceDependency[],
    methods: AngularServiceMethod[],
  ): string {
    const imports = new Set<string>();

    // Always import Injectable
    imports.add('Injectable');

    // Check if HttpClient is used
    const hasHttpClient = dependencies.some((d) => d.type === 'http');
    if (hasHttpClient) {
      imports.add('HttpClient');
      imports.add('Inject'); // For constructor injection
    }

    // Check if we need Observable
    if (methods.some((m) => m.isAsync)) {
      imports.add('Observable');
    }

    // Generate Angular imports
    let code = `import { ${Array.from(imports).join(', ')} } from '@angular/core';\n`;

    // Add HttpClient import if needed
    if (hasHttpClient) {
      code += `import { HttpClient } from '@angular/common/http';\n`;
    }

    // Add RxJS imports based on methods
    const rxjsImports = new Set<string>();

    if (methods.some((m) => m.isAsync)) {
      rxjsImports.add('Observable');
    }

    if (methods.some((m) => m.includeErrorHandling)) {
      rxjsImports.add('catchError');
      rxjsImports.add('throwError');
    }

    if (hasHttpClient) {
      rxjsImports.add('map');
      rxjsImports.add('tap');
    }

    if (rxjsImports.size > 0) {
      code += `import { ${Array.from(rxjsImports).join(', ')} } from 'rxjs';\n`;
    }

    code += '\n';

    return code;
  }

  /**
   * Generates the @Injectable decorator
   */
  private generateInjectable(serviceName: string): string {
    return `@Injectable({
  providedIn: 'root'
})
`;
  }

  /**
   * Generates the class body with constructor and methods
   */
  private generateClassBody(
    serviceName: string,
    dependencies: AngularServiceDependency[],
    methods: AngularServiceMethod[],
    useHttpClient: boolean,
  ): string {
    let code = `export class ${serviceName} {\n`;

    // Add API URL property if using HttpClient
    if (useHttpClient) {
      code += '\n';
      code += `  private apiUrl = 'https://api.example.com/items'; // Update with your API URL\n`;
    }

    // Add constructor
    code += '\n';
    code += this.generateConstructor(dependencies);

    // Add methods
    if (methods.length > 0) {
      for (const method of methods) {
        code += '\n';
        code += this.generateMethod(method, useHttpClient);
      }
    }

    code += '\n';
    code += `  constructor(private http: HttpClient) {}\n`;

    return code;
  }

  /**
   * Generates the constructor with dependency injection
   */
  private generateConstructor(dependencies: AngularServiceDependency[]): string {
    if (dependencies.length === 0) {
      return `  constructor() {}\n`;
    }

    const params = dependencies.map((dep) => `    private ${dep.injectAs}: ${dep.name}`);

    return `  constructor(\n${params.join(',\n')}\n  ) {}\n`;
  }

  /**
   * Generates a method implementation
   */
  private generateMethod(method: AngularServiceMethod, useHttpClient: boolean): string {
    let code = '';

    // Add JSDoc if description exists
    if (method.description) {
      code += `  /**\n`;
      code += `   * ${method.description}\n`;
      if (method.parameters.length > 0) {
        for (const param of method.parameters) {
          const optional = param.optional ? '?' : '';
          code += `   * @param ${param.name}${optional} ${param.description || param.type}\n`;
        }
      }
      code += `   * @returns ${method.returnType}\n`;
      code += `   */\n`;
    }

    // Method signature
    const params = method.parameters.map((p) => {
      const optional = p.optional ? '?' : '';
      return `${p.name}${optional}: ${p.type}`;
    });

    const asyncModifier = method.isAsync ? '' : '';
    code += `  ${asyncModifier}${method.name}(${params.join(', ')}): ${method.returnType}`;

    if (method.isAsync) {
      code += ' {\n';

      if (useHttpClient && method.includeErrorHandling) {
        code += this.generateHttpMethodWithErrors(method);
      } else if (useHttpClient) {
        code += this.generateHttpMethod(method);
      } else if (method.includeErrorHandling) {
        code += this.generateAsyncMethodWithErrors(method);
      } else {
        code += this.generateBasicAsyncMethod(method);
      }
    } else {
      code += ' {\n';
      code += this.generateBasicMethod(method);
    }

    code += '  }\n';

    return code;
  }

  /**
   * Generates HTTP method with error handling
   */
  private generateHttpMethodWithErrors(method: AngularServiceMethod): string {
    const methodLower = method.name.toLowerCase();
    let code = '';

    switch (methodLower) {
      case 'getall':
        code = `    return this.http.get<any[]>(this.apiUrl).pipe(\n`;
        code += `      catchError(this.handleError)\n`;
        code += `    );\n`;
        break;
      case 'getbyid':
        code = `    return this.http.get<any>(\`\${this.apiUrl}/\${id}\`).pipe(\n`;
        code += `      catchError(this.handleError)\n`;
        code += `    );\n`;
        break;
      case 'create':
        code = `    return this.http.post<any>(this.apiUrl, item).pipe(\n`;
        code += `      catchError(this.handleError)\n`;
        code += `    );\n`;
        break;
      case 'update':
        code = `    return this.http.put<any>(\`\${this.apiUrl}/\${id}\`, item).pipe(\n`;
        code += `      catchError(this.handleError)\n`;
        code += `    );\n`;
        break;
      case 'delete':
        code = `    return this.http.delete<void>(\`\${this.apiUrl}/\${id}\`).pipe(\n`;
        code += `      catchError(this.handleError)\n`;
        code += `    );\n`;
        break;
      default:
        code = `    // TODO: Implement ${method.name}\n`;
        code += `    return throwError(() => new Error('Not implemented'));\n`;
    }

    return code;
  }

  /**
   * Generates HTTP method without error handling
   */
  private generateHttpMethod(method: AngularServiceMethod): string {
    const methodLower = method.name.toLowerCase();
    let code = '';

    switch (methodLower) {
      case 'getall':
        code = `    return this.http.get<any[]>(this.apiUrl);\n`;
        break;
      case 'getbyid':
        code = `    return this.http.get<any>(\`\${this.apiUrl}/\${id}\`);\n`;
        break;
      case 'create':
        code = `    return this.http.post<any>(this.apiUrl, item);\n`;
        break;
      case 'update':
        code = `    return this.http.put<any>(\`\${this.apiUrl}/\${id}\`, item);\n`;
        break;
      case 'delete':
        code = `    return this.http.delete<void>(\`\${this.apiUrl}/\${id}\`);\n`;
        break;
      default:
        code = `    // TODO: Implement ${method.name}\n`;
        code += `    return new Observable();\n`;
    }

    return code;
  }

  /**
   * Generates async method with error handling
   */
  private generateAsyncMethodWithErrors(method: AngularServiceMethod): string {
    return (
      `    // TODO: Implement ${method.name} logic\n` +
      `    return throwError(() => new Error('Method not implemented'));\n`
    );
  }

  /**
   * Generates basic async method
   */
  private generateBasicAsyncMethod(method: AngularServiceMethod): string {
    return `    // TODO: Implement ${method.name} logic\n` + `    return new Observable();\n`;
  }

  /**
   * Generates basic synchronous method
   */
  private generateBasicMethod(method: AngularServiceMethod): string {
    return `    // TODO: Implement ${method.name} logic\n`;
  }

  /**
   * Calculates the file path for the service
   */
  private calculateFilePath(sourceFilePath: string, serviceName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const servicesDir = path.join(sourceDir, 'services');
    return path.join(servicesDir, `${this.toFileName(serviceName)}.service.ts`);
  }

  /**
   * Converts PascalCase service name to kebab-case file name
   */
  private toFileName(serviceName: string): string {
    return (
      serviceName
        // Insert hyphen before capital letters (except first)
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        // Handle consecutive capitals
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
    );
  }

  /**
   * Creates the service file at the specified path
   */
  public async createServiceFile(filePath: string, serviceCode: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write service file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(serviceCode, 'utf-8'));
    this.logger.info('Angular service file created', { filePath });
  }
}
