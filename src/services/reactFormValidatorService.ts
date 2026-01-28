import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface FormField {
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  isRequired: boolean;
  isNullable: boolean;
  defaultValue?: string;
  validationRules?: ValidationRule[];
  description?: string;
}

export interface ValidationRule {
  type:
    | 'required'
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'email'
    | 'url'
    | 'uuid'
    | 'date'
    | 'refine';
  value?: number | string | RegExp;
  message?: string;
}

export interface ReactFormValidatorOptions {
  formName: string;
  schemaName: string;
  validationLibrary: 'zod' | 'yup' | 'none';
  includeSubmitHandler: boolean;
  includeResetHandler: boolean;
  includeFormErrors: boolean;
  includeTouchedState: boolean;
  useFormState: boolean;
  defaultValuesSource: 'props' | 'useState' | 'url';
  outputDirectory: string;
  generateTypes: boolean;
}

export interface GeneratedFormValidator {
  formName: string;
  schemaName: string;
  formComponentCode: string;
  validationSchemaCode?: string;
  typesCode?: string;
  hookCode?: string;
  formComponentPath: string;
  validationSchemaPath?: string;
  typesPath?: string;
  hookPath?: string;
  fields: FormField[];
  validationLibrary: 'zod' | 'yup' | 'none';
}

/**
 * Service for generating React form validation logic with React Hook Form integration
 */
export class ReactFormValidatorService {
  private static instance: ReactFormValidatorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactFormValidatorService {
    ReactFormValidatorService.instance ??= new ReactFormValidatorService();
    return ReactFormValidatorService.instance;
  }

  /**
   * Main entry point: Generates form validation logic from selected code or user input
   */
  public async generateFormValidator(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ReactFormValidatorOptions,
  ): Promise<GeneratedFormValidator> {
    const selectedText = document.getText(selection);

    // Parse the form fields from selection or prompt user
    const fields = selectedText.trim()
      ? this.parseFieldsFromCode(selectedText)
      : await this.promptForFields();

    if (fields.length === 0) {
      throw new Error('No form fields found or provided');
    }

    // Generate validation schema if library is specified
    let validationSchemaCode: string | undefined;
    let validationSchemaPath: string | undefined;

    if (options.validationLibrary !== 'none') {
      validationSchemaCode = this.generateValidationSchema(
        options.schemaName,
        fields,
        options.validationLibrary,
      );
      validationSchemaPath = this.calculateSchemaFilePath(document.fileName, options.schemaName);
    }

    // Generate TypeScript types if enabled
    let typesCode: string | undefined;
    let typesPath: string | undefined;

    if (options.generateTypes) {
      typesCode = this.generateTypes(options.formName, fields);
      typesPath = this.calculateTypesFilePath(document.fileName, options.formName);
    }

    // Generate the custom hook for form handling
    const hookCode = this.generateFormHook(options.formName, fields, options);
    const hookPath = this.calculateHookFilePath(document.fileName, options.formName);

    // Generate the form component
    const formComponentCode = this.generateFormComponent(options.formName, fields, options);

    // Determine file paths
    const formComponentPath = this.calculateFormComponentPath(
      document.fileName,
      options.formName,
      options,
    );

    this.logger.info('React form validator generated', {
      formName: options.formName,
      fieldCount: fields.length,
      validationLibrary: options.validationLibrary,
    });

    return {
      formName: options.formName,
      schemaName: options.schemaName,
      formComponentCode,
      validationSchemaCode,
      typesCode,
      hookCode,
      formComponentPath,
      validationSchemaPath,
      typesPath,
      hookPath,
      fields,
      validationLibrary: options.validationLibrary,
    };
  }

  /**
   * Parses form fields from selected code (interface, type, or object)
   */
  private parseFieldsFromCode(code: string): FormField[] {
    const fields: FormField[] = [];
    const trimmedCode = code.trim();

    // Try to parse as TypeScript interface
    const interfaceMatch = trimmedCode.match(/(?:export\s+)?interface\s+(\w+)\s*\{([^}]+)\}/s);
    if (interfaceMatch) {
      return this.parseFieldsFromInterfaceBody(interfaceMatch[2] ?? '');
    }

    // Try to parse as TypeScript type
    const typeMatch = trimmedCode.match(/(?:export\s+)?type\s+(\w+)\s*=\s*\{([^}]+)\}/s);
    if (typeMatch) {
      return this.parseFieldsFromInterfaceBody(typeMatch[2] ?? '');
    }

    // Try to parse as object literal
    const objectMatch = trimmedCode.match(/\{([^}]+)\}/s);
    if (objectMatch) {
      return this.parseFieldsFromObjectLiteral(objectMatch[1] ?? '');
    }

    return fields;
  }

  /**
   * Parses fields from interface/type body
   */
  private parseFieldsFromInterfaceBody(body: string): FormField[] {
    const fields: FormField[] = [];
    const lines = body.split(';').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('*')) {
        continue;
      }

      // Match: readonly name?: type, or name: type
      const optionalMatch = line.match(/^(\w+)\?\s*:\s*(.+)$/);
      const requiredMatch = line.match(/^(\w+)\s*:\s*(.+)$/);

      if (optionalMatch) {
        fields.push({
          name: optionalMatch[1] ?? '',
          type: optionalMatch[2]?.trim() ?? '',
          label: this.toLabelCase(optionalMatch[1] ?? ''),
          isRequired: false,
          isNullable: false,
        });
      } else if (requiredMatch) {
        fields.push({
          name: requiredMatch[1] ?? '',
          type: requiredMatch[2]?.trim() ?? '',
          label: this.toLabelCase(requiredMatch[1] ?? ''),
          isRequired: true,
          isNullable: false,
        });
      }
    }

    return fields;
  }

  /**
   * Parses fields from object literal
   */
  private parseFieldsFromObjectLiteral(body: string): FormField[] {
    const fields: FormField[] = [];
    const lines = body.split(',').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//')) {
        continue;
      }

      // Match: name: value or name: type
      const match = line.match(/(\w+)\s*:\s*(.+)/);
      if (match) {
        const name = match[1] ?? '';
        const value = match[2]?.trim() ?? '';

        // Try to infer type from value
        let type = 'unknown';
        if (value === 'true' || value === 'false') {
          type = 'boolean';
        } else if (value === 'null') {
          type = 'null';
        } else if (value === 'undefined') {
          type = 'undefined';
        } else if (!Number.isNaN(Number.parseFloat(value))) {
          type = 'number';
        } else if (value.startsWith("'") || value.startsWith('"') || value.startsWith('`')) {
          type = 'string';
        } else if (value.startsWith('[')) {
          type = 'unknown[]';
        } else if (value.startsWith('{')) {
          type = 'Record<string, unknown>';
        }

        fields.push({
          name,
          type,
          label: this.toLabelCase(name),
          isRequired: true,
          isNullable: false,
          defaultValue: value,
        });
      }
    }

    return fields;
  }

  /**
   * Prompts user to enter form fields manually
   */
  private async promptForFields(): Promise<FormField[]> {
    const fields: FormField[] = [];

    const input = await vscode.window.showInputBox({
      prompt: 'Enter form fields (format: name:type, name2:type2)',
      placeHolder: 'email:string, password:string, age:number',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Please enter at least one field';
        }
        return null;
      },
    });

    if (!input) {
      return fields;
    }

    const parts = input.split(',').map((p) => p.trim());
    for (const part of parts) {
      const match = part.match(/^(\w+):(.+)$/);
      if (match) {
        fields.push({
          name: match[1] ?? '',
          type: match[2]?.trim() ?? '',
          label: this.toLabelCase(match[1] ?? ''),
          isRequired: !match[1]?.endsWith('?'),
          isNullable: false,
        });
      }
    }

    return fields;
  }

  /**
   * Generates validation schema code
   */
  private generateValidationSchema(
    schemaName: string,
    fields: FormField[],
    library: 'zod' | 'yup',
  ): string {
    let code = '';

    if (library === 'zod') {
      code += "import { z } from 'zod';\n\n";
      code += `export const ${schemaName}Schema = z.object({\n`;
      for (const field of fields) {
        code += `  ${field.name}: ${this.getZodType(field)},\n`;
      }
      code += '});\n\n';
      code += `export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;\n`;
    } else if (library === 'yup') {
      code += "import * as yup from 'yup';\n\n";
      code += `export const ${schemaName}Schema = yup.object({\n`;
      for (const field of fields) {
        code += `  ${field.name}: ${this.getYupType(field)},\n`;
      }
      code += '});\n\n';
      code += `export type ${schemaName} = yup.InferType<typeof ${schemaName}Schema>;\n`;
    }

    return code;
  }

  /**
   * Gets Zod type for a field
   */
  private getZodType(field: FormField): string {
    let type = '';

    switch (field.type) {
      case 'string':
        type = 'z.string()';
        break;
      case 'number':
        type = 'z.number()';
        break;
      case 'boolean':
        type = 'z.boolean()';
        break;
      case 'Date':
        type = 'z.date()';
        break;
      default:
        type = 'z.any()';
    }

    // Add optional
    if (!field.isRequired) {
      type += '.optional()';
    }

    // Add nullable
    if (field.isNullable) {
      type += '.nullable()';
    }

    // Add default value
    if (field.defaultValue !== undefined) {
      type += `.default(${field.defaultValue})`;
    }

    // Add validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        switch (rule.type) {
          case 'min':
            type += field.type === 'string' ? `.min(${rule.value})` : `.min(${rule.value})`;
            break;
          case 'max':
            type += `.max(${rule.value})`;
            break;
          case 'minLength':
            type += `.min(${rule.value})`;
            break;
          case 'maxLength':
            type += `.max(${rule.value})`;
            break;
          case 'email':
            type += '.email()';
            break;
          case 'url':
            type += '.url()';
            break;
          case 'uuid':
            type += '.uuid()';
            break;
        }
      }
    }

    return type;
  }

  /**
   * Gets Yup type for a field
   */
  private getYupType(field: FormField): string {
    let type = '';

    switch (field.type) {
      case 'string':
        type = 'yup.string()';
        break;
      case 'number':
        type = 'yup.number()';
        break;
      case 'boolean':
        type = 'yup.boolean()';
        break;
      case 'Date':
        type = 'yup.date()';
        break;
      default:
        type = 'yup.mixed()';
    }

    // Add required
    if (field.isRequired) {
      type += '.required()';
    } else {
      type += '.optional()';
    }

    // Add default value
    if (field.defaultValue !== undefined) {
      type += `.default(${field.defaultValue})`;
    }

    // Add validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        switch (rule.type) {
          case 'min':
            type += field.type === 'string' ? `.min(${rule.value})` : `.min(${rule.value})`;
            break;
          case 'max':
            type += `.max(${rule.value})`;
            break;
          case 'minLength':
            type += `.min(${rule.value})`;
            break;
          case 'maxLength':
            type += `.max(${rule.value})`;
            break;
          case 'email':
            type += '.email()';
            break;
          case 'url':
            type += '.url()';
            break;
          case 'uuid':
            type += '.uuid()';
            break;
        }
      }
    }

    return type;
  }

  /**
   * Generates TypeScript types
   */
  private generateTypes(formName: string, fields: FormField[]): string {
    let code = `export interface ${formName}Values {\n`;
    for (const field of fields) {
      const optional = field.isRequired ? '' : '?';
      code += `  ${field.name}${optional}: ${field.type};\n`;
    }
    code += '}\n';
    return code;
  }

  /**
   * Generates custom hook for form handling
   */
  private generateFormHook(
    formName: string,
    fields: FormField[],
    options: ReactFormValidatorOptions,
  ): string {
    const hookName = `use${formName}Form`;
    let code = '';

    // Add imports
    code += "import { useForm } from 'react-hook-form';\n";

    if (options.validationLibrary === 'zod') {
      code += "import { zodResolver } from '@hookform/resolvers/zod';\n";
    } else if (options.validationLibrary === 'yup') {
      code += "import { yupResolver } from '@hookform/resolvers/yup';\n";
    }

    if (options.validationSchemaPath) {
      code += `import { ${options.schemaName}Schema } from './${options.schemaName}.schema';\n`;
    }

    if (options.typesPath) {
      code += `import { ${formName}Values } from './${formName}.types';\n`;
    }

    code += '\n';

    // Generate default values
    const defaultValues = this.generateDefaultValues(fields);

    // Generate hook
    code += `export function ${hookName}() {\n`;
    code += `  const form = useForm<${formName}Values>({\n`;
    code += `    defaultValues: ${defaultValues},\n`;

    if (options.validationLibrary !== 'none') {
      code += `    resolver: ${
        options.validationLibrary === 'zod' ? 'zodResolver' : 'yupResolver'
      }(${options.schemaName}Schema),\n`;
    }

    code += `    mode: 'onTouched',\n`;
    code += `  });\n\n`;

    // Add form state if enabled
    if (options.useFormState) {
      code += `  const { formState } = form;\n`;
      code += `  const { errors, isDirty, isValid, isSubmitting } = formState;\n\n`;
    }

    code += `  return {\n`;
    code += `    form,\n`;

    if (options.useFormState) {
      code += `    errors,\n`;
      code += `    isDirty,\n`;
      code += `    isValid,\n`;
      code += `    isSubmitting,\n`;
    }

    code += `  };\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates default values object
   */
  private generateDefaultValues(fields: FormField[]): string {
    const values: string[] = [];
    for (const field of fields) {
      if (field.defaultValue !== undefined) {
        values.push(`${field.name}: ${field.defaultValue}`);
      } else if (!field.isRequired) {
        values.push(`${field.name}: ''`);
      } else if (field.type === 'boolean') {
        values.push(`${field.name}: false`);
      } else if (field.type === 'number') {
        values.push(`${field.name}: 0`);
      } else {
        values.push(`${field.name}: ''`);
      }
    }
    return `{\n    ${values.join(',\n    ')}\n  }`;
  }

  /**
   * Generates the form component
   */
  private generateFormComponent(
    formName: string,
    fields: FormField[],
    options: ReactFormValidatorOptions,
  ): string {
    let code = "import React from 'react';\n";
    code += "import { useForm } from 'react-hook-form';\n";

    if (options.validationLibrary === 'zod') {
      code += "import { zodResolver } from '@hookform/resolvers/zod';\n";
    } else if (options.validationLibrary === 'yup') {
      code += "import { yupResolver } from '@hookform/resolvers/yup';\n";
    }

    if (options.validationSchemaPath) {
      code += `import { ${options.schemaName}Schema, ${options.schemaName} } from './${options.schemaName}.schema';\n`;
    }

    if (options.hookPath) {
      code += `import { use${formName}Form } from './use-${formName}-form';\n`;
    }

    if (options.typesPath) {
      code += `import { ${formName}Values } from './${formName}.types';\n`;
    }

    code += '\n';

    // Add JSDoc comment
    code += `/**\n`;
    code += ` * ${formName} form component\n`;
    code += ` * Form with validation using React Hook Form and ${options.validationLibrary === 'none' ? 'no' : options.validationLibrary}\n`;
    code += ` */\n`;

    // Generate component
    code += `export function ${formName}Form() {\n`;

    // Use custom hook if available
    if (options.hookPath) {
      const hookName = `use${formName}Form`;
      code += `  const { form, errors, isValid } = ${hookName}();\n\n`;
      code += `  const { register, handleSubmit, reset, formState: { isSubmitting } } = form;\n\n`;
    } else {
      const defaultValues = this.generateDefaultValues(fields);
      code += `  const {\n`;
      code += `    register,\n`;
      code += `    handleSubmit,\n`;
      if (options.includeResetHandler) {
        code += `    reset,\n`;
      }
      code += `    formState: { errors, isSubmitting `;
      if (options.useFormState) {
        code += `, isDirty, isValid `;
      }
      code += `},\n`;
      code += `  } = useForm<${formName}Values>({\n`;
      code += `    defaultValues: ${defaultValues},\n`;
      if (options.validationLibrary !== 'none') {
        code += `    resolver: ${
          options.validationLibrary === 'zod' ? 'zodResolver' : 'yupResolver'
        }(${options.schemaName}Schema),\n`;
      }
      code += `    mode: 'onTouched',\n`;
      code += `  });\n\n`;
    }

    // Add submit handler
    if (options.includeSubmitHandler) {
      code += `  const onSubmit = async (data: ${formName}Values) => {\n`;
      code += `    console.log('${formName} form data:', data);\n`;
      code += `    // Add your form submission logic here\n`;
      code += `  };\n\n`;
    }

    // Add reset handler
    if (options.includeResetHandler) {
      code += `  const handleReset = () => {\n`;
      code += `    reset();\n`;
      code += `  };\n\n`;
    }

    // Generate JSX
    code += `  return (\n`;
    code += `    <form onSubmit={${options.includeSubmitHandler ? 'handleSubmit(onSubmit)' : 'handleSubmit((data) => console.log(data))'}} className="${formName.toLowerCase()}-form">\n`;

    for (const field of fields) {
      code += `      <div className="form-field">\n`;
      code += `        <label htmlFor="${field.name}">${field.label}</label>\n`;
      code += `        <input\n`;
      code += `          id="${field.name}"\n`;
      code += `          type="${this.getInputType(field.type)}"\n`;
      code += `          placeholder="${field.placeholder || ''}"\n`;
      code += `          {...register('${field.name}')}\n`;
      if (options.includeFormErrors) {
        code += `          aria-invalid={errors.${field.name} ? 'true' : 'false'}\n`;
      }
      code += `        />\n`;
      if (options.includeFormErrors) {
        code += `        {errors.${field.name} && (\n`;
        code += `          <span className="error-message">{errors.${field.name}.message}</span>\n`;
        code += `        )}\n`;
      }
      code += `      </div>\n`;
    }

    code += `      <div className="form-actions">\n`;
    code += `        <button type="submit" disabled={isSubmitting}>\n`;
    code += `          {isSubmitting ? 'Submitting...' : 'Submit'}\n`;
    code += `        </button>\n`;
    if (options.includeResetHandler) {
      code += `        <button type="button" onClick={handleReset}>\n`;
      code += `          Reset\n`;
      code += `        </button>\n`;
    }
    code += `      </div>\n`;
    code += `    </form>\n`;
    code += `  );\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Gets HTML input type from TypeScript type
   */
  private getInputType(tsType: string): string {
    switch (tsType) {
      case 'string':
        return 'text';
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      case 'Date':
        return 'date';
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'url':
        return 'url';
      default:
        return 'text';
    }
  }

  /**
   * Converts camelCase to Label Case
   */
  private toLabelCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
      .trim();
  }

  /**
   * Calculates form component file path
   */
  private calculateFormComponentPath(
    sourceFilePath: string,
    formName: string,
    options: ReactFormValidatorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const outputDirectory = options.outputDirectory || 'components/forms';

    const formFileName = `${formName}Form.tsx`;
    return path.join(sourceDir, outputDirectory, formFileName);
  }

  /**
   * Calculates schema file path
   */
  private calculateSchemaFilePath(sourceFilePath: string, schemaName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const schemaFileName = `${schemaName}.schema.ts`;
    return path.join(sourceDir, 'schemas', schemaFileName);
  }

  /**
   * Calculates types file path
   */
  private calculateTypesFilePath(sourceFilePath: string, formName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const typesFileName = `${formName}.types.ts`;
    return path.join(sourceDir, 'types', typesFileName);
  }

  /**
   * Calculates hook file path
   */
  private calculateHookFilePath(sourceFilePath: string, formName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const hookFileName = `use-${formName}-form.ts`;
    return path.join(sourceDir, 'hooks', hookFileName);
  }

  /**
   * Creates a file at the specified path
   */
  public async createFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('File created', { filePath });
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
    defaultFormName?: string,
  ): Promise<ReactFormValidatorOptions | undefined> {
    // Ask for form name
    const formName = await vscode.window.showInputBox({
      prompt: 'Enter form name',
      placeHolder: 'UserForm',
      value: defaultFormName || 'UserForm',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Form name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Form name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!formName) {
      return undefined;
    }

    // Ask for schema name
    const schemaName = await vscode.window.showInputBox({
      prompt: 'Enter validation schema name',
      placeHolder: 'UserForm',
      value: formName.trim(),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Schema name cannot be empty';
        }
        return null;
      },
    });

    if (!schemaName) {
      return undefined;
    }

    // Ask for validation library
    const validationLibrary = await vscode.window.showQuickPick(
      [
        { label: 'Zod', description: 'Use Zod for validation', value: 'zod' },
        { label: 'Yup', description: 'Use Yup for validation', value: 'yup' },
        { label: 'None', description: 'No validation library', value: 'none' },
      ],
      {
        placeHolder: 'Select validation library',
      },
    );

    if (!validationLibrary) {
      return undefined;
    }

    // Ask for output directory
    const outputDirectory = await vscode.window.showInputBox({
      prompt: 'Enter output directory',
      placeHolder: 'components/forms',
      value: 'components/forms',
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

    return {
      formName: formName.trim(),
      schemaName: schemaName.trim(),
      validationLibrary: validationLibrary.value as 'zod' | 'yup' | 'none',
      includeSubmitHandler: true,
      includeResetHandler: true,
      includeFormErrors: true,
      includeTouchedState: true,
      useFormState: true,
      defaultValuesSource: 'useState',
      outputDirectory: outputDirectory.trim(),
      generateTypes: true,
    };
  }
}
