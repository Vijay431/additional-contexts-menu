import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface RemixActionGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeValidation: boolean;
  includeErrorHandling: boolean;
  includeRedirects: boolean;
  includeFormDataParsing: boolean;
  defaultActionPath: string;
  exportType: 'named' | 'default';
}

export interface FormDataField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  validationRule?: {
    type: 'minLength' | 'maxLength' | 'pattern' | 'custom';
    value?: string | number;
    message?: string;
  };
}

export interface GeneratedRemixAction {
  name: string;
  actionPath: string;
  filePath: string;
  formDataFields: FormDataField[];
  returnType: string;
  includeValidation: boolean;
  includeErrorHandling: boolean;
  includeRedirects: boolean;
  imports: string[];
  actionCode: string;
}

/**
 * Service for generating Remix actions with TypeScript typing,
 * form processing, and validation. Generates action handlers
 * with proper error handling, redirects, and success responses.
 */
export class RemixActionGeneratorService {
  private static instance: RemixActionGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RemixActionGeneratorService {
    RemixActionGeneratorService.instance ??= new RemixActionGeneratorService();
    return RemixActionGeneratorService.instance;
  }

  /**
   * Generates a Remix action based on user input
   */
  public async generateAction(
    workspacePath: string,
    config: RemixActionGeneratorConfig,
  ): Promise<GeneratedRemixAction | null> {
    // Get action name
    const actionName = await this.getActionName();
    if (!actionName) {
      return null;
    }

    // Get action path
    const actionPath = await this.getActionPath(actionName, config);
    if (!actionPath) {
      return null;
    }

    // Collect form data fields
    const formDataFields = await this.collectFormDataFields(config);
    if (!formDataFields || formDataFields.length === 0) {
      vscode.window.showWarningMessage('No form fields defined. Action generation cancelled.');
      return null;
    }

    // Get return type
    const returnType = await this.getReturnType();

    // Ask about validation
    const includeValidation = await this.askAboutValidation(config);

    // Ask about error handling
    const includeErrorHandling = await this.askAboutErrorHandling(config);

    // Ask about redirects
    const includeRedirects = await this.askAboutRedirects(config);

    // Generate imports
    const imports = this.generateImports(config, includeValidation, includeErrorHandling, includeRedirects);

    // Generate action code
    const actionCode = this.generateActionCode(
      actionName,
      formDataFields,
      returnType,
      includeValidation,
      includeErrorHandling,
      includeRedirects,
      imports,
      config,
    );

    // Calculate file path
    const filePath = this.calculateFilePath(workspacePath, actionPath);

    this.logger.info('Remix action generated', {
      name: actionName,
      path: actionPath,
      fieldsCount: formDataFields.length,
      hasValidation: includeValidation,
      hasErrorHandling: includeErrorHandling,
      hasRedirects: includeRedirects,
    });

    return {
      name: actionName,
      actionPath,
      filePath,
      formDataFields,
      returnType,
      includeValidation,
      includeErrorHandling,
      includeRedirects,
      imports,
      actionCode,
    };
  }

  /**
   * Prompts user for action name
   */
  private async getActionName(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter action name (e.g., createUser, updatePost, deleteComment)',
      placeHolder: 'createUser',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Action name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Action name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for action path
   */
  private async getActionPath(
    actionName: string,
    config: RemixActionGeneratorConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter action path (e.g., routes/users.create, routes/posts.update)',
      placeHolder: `${config.defaultActionPath}${actionName}`,
      value: `${config.defaultActionPath}${actionName}`,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Action path cannot be empty';
        }
        if (!/^[a-zA-Z0-9/_-]*$/.test(value)) {
          return 'Action path can only contain letters, numbers, slashes, hyphens, and underscores';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Collects form data fields from user
   */
  private async collectFormDataFields(
    config: RemixActionGeneratorConfig,
  ): Promise<FormDataField[] | null> {
    const fields: FormDataField[] = [];

    let addMore = true;
    while (addMore) {
      const field = await this.createFormDataField(config);
      if (field) {
        fields.push(field);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another field', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another field or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return fields.length > 0 ? fields : null;
  }

  /**
   * Creates a single form data field through user interaction
   */
  private async createFormDataField(
    config: RemixActionGeneratorConfig,
  ): Promise<FormDataField | null> {
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter field name',
      placeHolder: 'email',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Field name cannot be empty';
        }
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
          return 'Invalid field name';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const typeInput = await vscode.window.showQuickPick(
      ['string', 'number', 'boolean', 'any'],
      { placeHolder: 'Select data type' },
    );

    const requiredChoice = await vscode.window.showQuickPick(
      [
        { label: 'Required', value: 'true' },
        { label: 'Optional', value: 'false' },
      ],
      { placeHolder: 'Is this field required?' },
    );

    const required = requiredChoice?.value === 'true';

    const descriptionInput = await vscode.window.showInputBox({
      prompt: 'Enter field description (optional)',
      placeHolder: `The ${nameInput} field`,
    });

    let validationRule: FormDataField['validationRule'] | undefined;
    if (config.includeValidation && typeInput === 'string') {
      const addValidation = await vscode.window.showQuickPick(
        [
          { label: 'Add validation', value: 'yes' },
          { label: 'No validation', value: 'no' },
        ],
        { placeHolder: 'Add validation for this field?' },
      );

      if (addValidation?.value === 'yes') {
        const validationType = await vscode.window.showQuickPick<
          Required<{ label: string; value: FormDataField['validationRule']['type'] }>
        >(
          [
            { label: 'Min Length', value: 'minLength' },
            { label: 'Max Length', value: 'maxLength' },
            { label: 'Pattern', value: 'pattern' },
            { label: 'Custom', value: 'custom' },
          ],
          { placeHolder: 'Select validation type' },
        );

        if (validationType) {
          const valueInput = await vscode.window.showInputBox({
            prompt: `Enter ${validationType.value} value`,
            placeHolder: validationType.value === 'pattern' ? '^[a-z]+$' : '10',
          });

          const messageInput = await vscode.window.showInputBox({
            prompt: 'Enter validation error message (optional)',
            placeHolder: 'Invalid value',
          });

          validationRule = {
            type: validationType.value,
            value: validationType.value === 'minLength' || validationType.value === 'maxLength'
              ? Number.parseInt(valueInput || '0', 10)
              : valueInput,
            message: messageInput?.trim(),
          };
        }
      }
    }

    return {
      name: nameInput.trim(),
      type: typeInput || 'string',
      required,
      description: descriptionInput?.trim(),
      validationRule,
    };
  }

  /**
   * Gets the return type for the action
   */
  private async getReturnType(): Promise<string> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter action return type',
      placeHolder: 'ActionResponse',
      value: 'ActionResponse',
    });

    return input?.trim() || 'ActionResponse';
  }

  /**
   * Asks user about validation
   */
  private async askAboutValidation(config: RemixActionGeneratorConfig): Promise<boolean> {
    if (!config.includeValidation) {
      return false;
    }

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include validation', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include form validation?' },
    );

    return choice?.value === 'yes';
  }

  /**
   * Asks user about error handling
   */
  private async askAboutErrorHandling(config: RemixActionGeneratorConfig): Promise<boolean> {
    if (!config.includeErrorHandling) {
      return false;
    }

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include error handling', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include error handling?' },
    );

    return choice?.value === 'yes';
  }

  /**
   * Asks user about redirects
   */
  private async askAboutRedirects(config: RemixActionGeneratorConfig): Promise<boolean> {
    if (!config.includeRedirects) {
      return false;
    }

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes, include redirects', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
      { placeHolder: 'Include redirect logic?' },
    );

    return choice?.value === 'yes';
  }

  /**
   * Generates imports based on configuration
   */
  private generateImports(
    config: RemixActionGeneratorConfig,
    includeValidation: boolean,
    includeErrorHandling: boolean,
    includeRedirects: boolean,
  ): string[] {
    const imports: string[] = [];

    // Core Remix imports
    imports.push('type { ActionFunctionArgs }');
    imports.push('from "@remix-run/node"');

    // Add json helper for responses
    imports.push('{ json }');
    imports.push('from "@remix-run/node"');

    // Add redirect if needed
    if (includeRedirects) {
      imports.push('{ redirect }');
      imports.push('from "@remix-run/node"');
    }

    return imports;
  }

  /**
   * Calculates the file path for the action
   */
  private calculateFilePath(workspacePath: string, actionPath: string): string {
    // Convert action path to file path
    // routes/users.create -> app/routes/users.create.tsx
    const fileName = actionPath.replace(/^routes\//, '') + '.tsx';

    return path.join(workspacePath, 'app', 'routes', fileName);
  }

  /**
   * Generates the action code
   */
  private generateActionCode(
    actionName: string,
    formDataFields: FormDataField[],
    returnType: string,
    includeValidation: boolean,
    includeErrorHandling: boolean,
    includeRedirects: boolean,
    imports: string[],
    config: RemixActionGeneratorConfig,
  ): string {
    let code = '';

    // Add imports
    if (imports.length > 0) {
      const importGroups = new Map<string, string[]>();
      for (let i = 0; i < imports.length; i += 2) {
        const item = imports[i];
        const from = imports[i + 1];
        if (!from) continue;

        if (!importGroups.has(from)) {
          importGroups.set(from, []);
        }
        importGroups.get(from)!.push(item);
      }

      importGroups.forEach((items, from) => {
        const joined = items.join(', ');
        code += `import ${joined} ${from};\n`;
      });
      code += '\n';
    }

    // Add TypeScript interfaces if enabled
    if (config.includeTypeScript) {
      code += this.generateTypeInterfaces(actionName, formDataFields, returnType);
    }

    // Generate action function
    code += this.generateActionFunction(
      actionName,
      formDataFields,
      returnType,
      includeValidation,
      includeErrorHandling,
      includeRedirects,
      config,
    );

    return code;
  }

  /**
   * Generates TypeScript interfaces for the action
   */
  private generateTypeInterfaces(
    actionName: string,
    formDataFields: FormDataField[],
    returnType: string,
  ): string {
    let code = '';

    // Generate action data interface
    const interfaceName = `${this.ucfirst(actionName)}ActionData`;
    code += `interface ${interfaceName} {\n`;
    code += `  success?: boolean;\n`;
    code += `  error?: string;\n`;
    code += `  errors?: Record<string, string>;\n`;
    code += `  [key: string]: unknown;\n`;
    code += `}\n\n`;

    // Generate input data interface if there are form fields
    if (formDataFields.length > 0) {
      const inputInterfaceName = `${this.ucfirst(actionName)}Input`;
      code += `interface ${inputInterfaceName} {\n`;
      for (const field of formDataFields) {
        const optional = field.required ? '' : '?';
        code += `  ${field.name}${optional}: ${field.type};\n`;
      }
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generates the action function
   */
  private generateActionFunction(
    actionName: string,
    formDataFields: FormDataField[],
    returnType: string,
    includeValidation: boolean,
    includeErrorHandling: boolean,
    includeRedirects: boolean,
    config: RemixActionGeneratorConfig,
  ): string {
    let code = '';

    // JSDoc comment
    code += `/**\n`;
    code += ` * ${this.ucfirst(actionName)} action\n`;
    code += ` * Handles form submission for ${actionName}\n`;
    code += ` */\n`;

    const dataInterface = `${this.ucfirst(actionName)}ActionData`;

    code += `export const action = `;
    if (config.includeTypeScript) {
      code += `async ({ request }: ActionFunctionArgs): Promise<ReturnType<typeof json<${dataInterface}>>> => {\n`;
    } else {
      code += `async ({ request }) => {\n`;
    }

    if (includeErrorHandling) {
      code += `  try {\n`;
      code += `    const formData = await request.formData();\n\n`;
    } else {
      code += `  const formData = await request.formData();\n\n`;
    }

    // Extract form fields
    if (formDataFields.length > 0) {
      if (includeErrorHandling) {
        code += `    `;
      }
      code += `const data = Object.fromEntries(formData) as Record<string, string>;\n`;
      if (config.includeFormDataParsing) {
        if (includeErrorHandling) {
          code += `    `;
        }
        code += `const { `;
        const fieldNames = formDataFields.map((f) => f.name);
        code += fieldNames.join(', ');
        code += ` } = data;\n\n`;
      } else {
        code += '\n';
      }
    }

    // Add validation if enabled
    if (includeValidation && formDataFields.length > 0) {
      if (includeErrorHandling) {
        code += `    `;
      }
      code += `// Validate form data\n`;
      if (includeErrorHandling) {
        code += `    `;
      }
      code += `const errors: Record<string, string> = {};\n\n`;

      for (const field of formDataFields.filter((f) => f.required || f.validationRule)) {
        if (includeErrorHandling) {
          code += `    `;
        }

        // Required validation
        if (field.required) {
          code += `if (!data.${field.name}) {\n`;
          if (includeErrorHandling) {
            code += `      `;
          }
          code += `errors.${field.name} = '${field.name} is required';\n`;
          if (includeErrorHandling) {
            code += `    `;
          }
          code += `}\n`;
        }

        // Custom validation rules
        if (field.validationRule) {
          if (includeErrorHandling) {
            code += `    `;
          }
          switch (field.validationRule.type) {
            case 'minLength':
              code += `else if (data.${field.name}.length < ${field.validationRule.value}) {\n`;
              if (includeErrorHandling) {
                code += `      `;
              }
              code += `errors.${field.name} = '${field.validationRule.message || `${field.name} is too short`}';\n`;
              if (includeErrorHandling) {
                code += `    `;
              }
              code += `}\n`;
              break;
            case 'maxLength':
              code += `else if (data.${field.name}.length > ${field.validationRule.value}) {\n`;
              if (includeErrorHandling) {
                code += `      `;
              }
              code += `errors.${field.name} = '${field.validationRule.message || `${field.name} is too long`}';\n`;
              if (includeErrorHandling) {
                code += `    `;
              }
              code += `}\n`;
              break;
            case 'pattern':
              code += `else if (!/${field.validationRule.value}/.test(data.${field.name})) {\n`;
              if (includeErrorHandling) {
                code += `      `;
              }
              code += `errors.${field.name} = '${field.validationRule.message || `${field.name} is invalid`}';\n`;
              if (includeErrorHandling) {
                code += `    `;
              }
              code += `}\n`;
              break;
            case 'custom':
              if (includeErrorHandling) {
                code += `    `;
              }
              code += `// Add custom validation for ${field.name}\n`;
              break;
          }
        }
      }

      if (includeErrorHandling) {
        code += `\n    if (Object.keys(errors).length > 0) {\n`;
        code += `      return json({ success: false, errors }, { status: 400 });\n`;
        code += `    }\n\n`;
      } else {
        code += `\n  if (Object.keys(errors).length > 0) {\n`;
        code += `    return json({ success: false, errors }, { status: 400 });\n`;
        code += `  }\n\n`;
      }
    }

    // Add action logic placeholder
    if (includeErrorHandling) {
      code += `    // TODO: Implement ${actionName} logic\n`;
      code += `    // Example: await ${actionName}(data);\n\n`;
      code += `    const result = {\n`;
      code += `      success: true,\n`;
      code += `    };\n\n`;

      if (includeRedirects) {
        code += `    // Redirect on success\n`;
        code += `    return redirect('/${actionName}');\n`;
      } else {
        code += `    return json(result);\n`;
      }

      code += `  } catch (error) {\n`;
      code += `    console.error('Error in ${actionName} action:', error);\n`;
      code += `    return json(\n`;
      code += `      {\n`;
      code += `        success: false,\n`;
      code += `        error: error instanceof Error ? error.message : 'An error occurred',\n`;
      code += `      },\n`;
      code += `      { status: 500 },\n`;
      code += `    );\n`;
      code += `  }\n`;
    } else {
      code += `  // TODO: Implement ${actionName} logic\n`;
      code += `  // Example: await ${actionName}(data);\n\n`;
      code += `  const result = {\n`;
      code += `    success: true,\n`;
      code += `  };\n\n`;

      if (includeRedirects) {
        code += `  // Redirect on success\n`;
        code += `  return redirect('/${actionName}');\n`;
      } else {
        code += `  return json(result);\n`;
      }
    }

    code += `};\n`;

    return code;
  }

  /**
   * Converts string to uppercase first letter
   */
  private ucfirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Creates the action file at the specified path
   */
  public async createActionFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write action file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));

    this.logger.info('Remix action file created', { filePath });
  }
}
