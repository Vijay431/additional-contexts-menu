import * as vscode from 'vscode';
import type {
  ApiDocClass,
  ApiDocEnum,
  ApiDocFunction,
  ApiDocInterface,
  ApiDocParameter,
  ApiDocProperty,
  ApiDocTypeAlias,
  ApiDocumentationOptions,
  ApiDocumentationResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type {
  ApiDocClass,
  ApiDocEnum,
  ApiDocFunction,
  ApiDocInterface,
  ApiDocParameter,
  ApiDocProperty,
  ApiDocTypeAlias,
  ApiDocumentationOptions,
  ApiDocumentationResult,
};

/**
 * Service for generating API documentation from JSDoc comments
 */
export class ApiDocumentationGeneratorService {
  private static instance: ApiDocumentationGeneratorService | undefined;

  private constructor() {}

  static getInstance(): ApiDocumentationGeneratorService {
    if (!ApiDocumentationGeneratorService.instance) {
      ApiDocumentationGeneratorService.instance = new ApiDocumentationGeneratorService();
    }
    return ApiDocumentationGeneratorService.instance;
  }

  /**
   * Generate API documentation from the current file
   */
  async generateApiDocumentation(
    document: vscode.TextDocument,
    options: ApiDocumentationOptions,
  ): Promise<ApiDocumentationResult> {
    const startTime = Date.now();
    const fileContent = document.getText();
    const filePath = document.fileName;

    // Extract all documentation elements
    const functions = this.extractFunctions(fileContent);
    const classes = this.extractClasses(fileContent);
    const interfaces = this.extractInterfaces(fileContent);
    const typeAliases = this.extractTypeAliases(fileContent);
    const enums = this.extractEnums(fileContent);

    // Filter based on visibility options
    const filteredFunctions = this.filterFunctionsByVisibility(
      functions,
      options.includePrivate,
      options.includeProtected,
    );
    const filteredClasses = this.filterClassesByVisibility(
      classes,
      options.includePrivate,
      options.includeProtected,
    );
    const filteredInterfaces = interfaces; // Interfaces are always public

    // Generate documentation
    let documentation: string;
    if (options.outputFormat === 'markdown') {
      documentation = this.generateMarkdown(
        {
          functions: filteredFunctions,
          classes: filteredClasses,
          interfaces: filteredInterfaces,
          typeAliases,
          enums,
        },
        options,
        filePath,
      );
    } else {
      documentation = this.generateHtml(
        {
          functions: filteredFunctions,
          classes: filteredClasses,
          interfaces: filteredInterfaces,
          typeAliases,
          enums,
        },
        options,
        filePath,
      );
    }

    Logger.getInstance().info(
      `API documentation generated: ${filePath}, ${filteredFunctions.length} functions, ${filteredClasses.length} classes, ${filteredInterfaces.length} interfaces, ${options.outputFormat} format, ${Date.now() - startTime}ms`,
    );

    return {
      filePath,
      functions: filteredFunctions,
      classes: filteredClasses,
      interfaces: filteredInterfaces,
      typeAliases,
      enums,
      documentation,
      format: options.outputFormat,
      generatedAt: Date.now(),
    };
  }

  /**
   * Extract functions from source code
   */
  private extractFunctions(source: string): ApiDocFunction[] {
    const functions: ApiDocFunction[] = [];

    // Match function declarations: function name(), export function name(), export const name = () =>, etc.
    const functionRegex =
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|(?:function\s+\w+)?)|(\w+)\s*\([^)]*\)\s*[\{:]/g;

    let match: RegExpExecArray | null;
    while ((match = functionRegex.exec(source)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      if (!functionName) continue;

      // Find the line number
      const beforeMatch = source.slice(0, match.index);
      const lineStart = beforeMatch.split('\n').length;

      // Extract JSDoc
      const jsDoc = this.extractJSDoc(source, match.index);

      // Parse function signature
      const signatureMatch = source
        .slice(match.index, match.index + 200)
        .match(/(?:function|=>)\s*\(([^)]*)\)\s*(?::\s*([^{,\n]+))?/);

      const parameters = signatureMatch?.[1] ? this.parseParameters(signatureMatch[1]) : [];
      const returnType = signatureMatch?.[2]?.trim() || 'void';

      const isAsync = source.slice(Math.max(0, match.index - 50), match.index).includes('async');

      const isExported = source
        .slice(Math.max(0, match.index - 50), match.index)
        .includes('export');

      // Check visibility
      const beforeFunction = source.slice(Math.max(0, match.index - 100), match.index);
      const isPrivate = beforeFunction.includes('private');
      const isProtected = beforeFunction.includes('protected');

      const examples = this.extractExamples(jsDoc);

      const func: ApiDocFunction = {
        name: functionName,
        description: this.extractDescription(jsDoc),
        parameters,
        returnType,
        isAsync,
        isExported,
        isPrivate,
        isProtected,
        jsDoc,
        examples,
        lineStart,
        lineEnd: lineStart,
      };

      functions.push(func);
    }

    return functions;
  }

  /**
   * Extract classes from source code
   */
  private extractClasses(source: string): ApiDocClass[] {
    const classes: ApiDocClass[] = [];

    // Match class declarations
    const classRegex =
      /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;

    let match: RegExpExecArray | null;
    while ((match = classRegex.exec(source)) !== null) {
      const className = match[1];
      const extendsClause = match[2];
      const implementsClause = match[3];

      // Find the line number
      const beforeMatch = source.slice(0, match.index);
      const lineStart = beforeMatch.split('\n').length;

      // Extract JSDoc
      const jsDoc = this.extractJSDoc(source, match.index);

      // Check visibility
      const beforeClass = source.slice(Math.max(0, match.index - 50), match.index);
      const isPrivate = beforeClass.includes('private');
      const isProtected = beforeClass.includes('protected');

      // Find class body
      const classBodyMatch = source.slice(match.index).match(/\{([^{}]*)\}/s);
      const classBody = classBodyMatch?.[1] || '';

      const properties = this.extractClassProperties(classBody);
      const methods = this.extractClassMethods(classBody);

      const cls: ApiDocClass = {
        name: className,
        description: this.extractDescription(jsDoc),
        extends: extendsClause,
        implements: implementsClause ? implementsClause.split(',').map((s) => s.trim()) : undefined,
        properties,
        methods,
        isPrivate,
        isProtected,
        jsDoc,
        lineStart,
        lineEnd: lineStart,
      };

      classes.push(cls);
    }

    return classes;
  }

  /**
   * Extract interfaces from source code
   */
  private extractInterfaces(source: string): ApiDocInterface[] {
    const interfaces: ApiDocInterface[] = [];

    // Match interface declarations
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/g;

    let match: RegExpExecArray | null;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const interfaceName = match[1];
      const extendsClause = match[2];

      // Find the line number
      const beforeMatch = source.slice(0, match.index);
      const lineStart = beforeMatch.split('\n').length;

      // Extract JSDoc
      const jsDoc = this.extractJSDoc(source, match.index);

      // Find interface body
      const interfaceBodyMatch = source.slice(match.index).match(/\{([^{}]*)\}/s);
      const interfaceBody = interfaceBodyMatch?.[1] || '';

      const properties = this.extractInterfaceProperties(interfaceBody);
      const methods = this.extractInterfaceMethods(interfaceBody);

      const iface: ApiDocInterface = {
        name: interfaceName,
        description: this.extractDescription(jsDoc),
        extends: extendsClause ? extendsClause.split(',').map((s) => s.trim()) : undefined,
        properties,
        methods,
        jsDoc,
        lineStart,
        lineEnd: lineStart,
      };

      interfaces.push(iface);
    }

    return interfaces;
  }

  /**
   * Extract type aliases from source code
   */
  private extractTypeAliases(source: string): ApiDocTypeAlias[] {
    const typeAliases: ApiDocTypeAlias[] = [];

    // Match type declarations
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*([^;\n]+);?/g;

    let match: RegExpExecArray | null;
    while ((match = typeRegex.exec(source)) !== null) {
      const typeName = match[1];
      const typeDefinition = match[2]?.trim() || '';

      // Find the line number
      const beforeMatch = source.slice(0, match.index);
      const lineStart = beforeMatch.split('\n').length;

      // Extract JSDoc
      const jsDoc = this.extractJSDoc(source, match.index);

      const typeAlias: ApiDocTypeAlias = {
        name: typeName,
        type: typeDefinition,
        description: this.extractDescription(jsDoc),
        jsDoc,
        lineStart,
      };

      typeAliases.push(typeAlias);
    }

    return typeAliases;
  }

  /**
   * Extract enums from source code
   */
  private extractEnums(source: string): ApiDocEnum[] {
    const enums: ApiDocEnum[] = [];

    // Match enum declarations
    const enumRegex = /(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]+)\}/g;

    let match: RegExpExecArray | null;
    while ((match = enumRegex.exec(source)) !== null) {
      const enumName = match[1];
      const enumBody = match[2] || '';

      // Find the line number
      const beforeMatch = source.slice(0, match.index);
      const lineStart = beforeMatch.split('\n').length;

      // Extract JSDoc
      const jsDoc = this.extractJSDoc(source, match.index);

      // Parse enum members
      const members = enumBody
        .split(',')
        .map((member) => {
          const trimmed = member.trim();
          const memberMatch = trimmed.match(/(\w+)(?:\s*=\s*([^\n]+))?/);
          if (memberMatch && memberMatch[1]) {
            return {
              name: memberMatch[1],
              value: memberMatch[2]?.trim(),
            };
          }
          return null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      const enum_: ApiDocEnum = {
        name: enumName,
        description: this.extractDescription(jsDoc),
        members,
        jsDoc,
        lineStart,
      };

      enums.push(enum_);
    }

    return enums;
  }

  /**
   * Extract JSDoc comment before a given position
   */
  private extractJSDoc(source: string, position: number): string | undefined {
    const beforeMatch = source.slice(Math.max(0, position - 500), position);
    const jsDocMatch = beforeMatch.match(/\/\*\*([^*]|\*(?!\/))*\*\/\s*$/s);
    return jsDocMatch?.[0];
  }

  /**
   * Extract description from JSDoc
   */
  private extractDescription(jsDoc?: string): string | undefined {
    if (!jsDoc) return undefined;

    // Remove JSDoc markers and extract description
    const cleaned = jsDoc
      .replace(/\/\*\*|\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .join('\n');

    // Remove tags
    const description = cleaned.split(/@param|@returns|@throws|@example|@typedef|@type/i)[0].trim();

    return description || undefined;
  }

  /**
   * Extract examples from JSDoc
   */
  private extractExamples(jsDoc?: string): string[] {
    if (!jsDoc) return [];

    const examples: string[] = [];
    const exampleRegex = /@example\s+([\s\S]*?)(?=@\w|\*\/|$)/gi;

    let match: RegExpExecArray | null;
    while ((match = exampleRegex.exec(jsDoc)) !== null) {
      const example = match[1]?.trim();
      if (example) {
        examples.push(example);
      }
    }

    return examples;
  }

  /**
   * Parse function parameters from signature
   */
  private parseParameters(paramsStr: string): ApiDocParameter[] {
    const parameters: ApiDocParameter[] = [];

    if (!paramsStr.trim()) return parameters;

    const params = paramsStr.split(',').map((p) => p.trim());

    for (const param of params) {
      // Match: name, name?: type, name: type, name: type = default
      const paramMatch = param.match(/(\w+)(\?)?(?:\s*:\s*([^\s=]+))?(?:\s*=\s*([^\s]+))?/);

      if (paramMatch && paramMatch[1]) {
        const name = paramMatch[1];
        const isOptional = paramMatch[2] === '?';
        const type = paramMatch[3] || 'any';
        const defaultValue = paramMatch[4];

        parameters.push({
          name,
          type,
          isOptional,
          defaultValue,
        });
      }
    }

    return parameters;
  }

  /**
   * Extract properties from class body
   */
  private extractClassProperties(classBody: string): ApiDocProperty[] {
    const properties: ApiDocProperty[] = [];

    // Match property declarations: public name, private name, protected name, readonly name
    const propRegex =
      /(?:public|private|protected|readonly)?\s*(\w+)\s*(\?)?(?:\s*:\s*([^\n;]+))?/g;

    let match: RegExpExecArray | null;
    while ((match = propRegex.exec(classBody)) !== null) {
      const propName = match[1];
      const isOptional = match[2] === '?';
      const type = match[3] || 'any';
      const declaration = classBody.slice(Math.max(0, match.index - 20), match.index + 50);

      const isReadonly = declaration.includes('readonly');
      const isStatic = declaration.includes('static');

      properties.push({
        name: propName,
        type: type.trim(),
        isReadonly,
        isOptional,
        isStatic,
      });
    }

    return properties;
  }

  /**
   * Extract methods from class body
   */
  private extractClassMethods(classBody: string): ApiDocFunction[] {
    const methods: ApiDocFunction[] = [];

    // Match method declarations
    const methodRegex =
      /(?:public|private|protected|static)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{,\n]+))?/g;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(classBody)) !== null) {
      const methodName = match[1];
      const paramsStr = match[2] || '';
      const returnType = match[3]?.trim() || 'void';

      const declaration = classBody.slice(Math.max(0, match.index - 30), match.index + 50);

      const isAsync = declaration.includes('async');
      const isPrivate = declaration.includes('private');
      const isProtected = declaration.includes('protected');
      const isStatic = declaration.includes('static');

      // Extract JSDoc
      const jsDoc = this.extractJSDoc(classBody, match.index);
      const examples = this.extractExamples(jsDoc);

      methods.push({
        name: methodName,
        description: this.extractDescription(jsDoc),
        parameters: this.parseParameters(paramsStr),
        returnType,
        isAsync,
        isExported: !isPrivate,
        isPrivate,
        isProtected,
        jsDoc,
        examples,
        lineStart: 0,
        lineEnd: 0,
      });
    }

    return methods;
  }

  /**
   * Extract properties from interface body
   */
  private extractInterfaceProperties(interfaceBody: string): ApiDocProperty[] {
    const properties: ApiDocProperty[] = [];

    // Match property declarations
    const propRegex = /(\w+)\s*(\?)?(?:\s*:\s*([^\n;]+))?/g;

    let match: RegExpExecArray | null;
    while ((match = propRegex.exec(interfaceBody)) !== null) {
      const propName = match[1];
      const isOptional = match[2] === '?';
      const type = match[3] || 'any';

      // Skip if it looks like a method
      const line = interfaceBody.slice(Math.max(0, match.index - 10), match.index + 50);
      if (line.includes('(')) continue;

      properties.push({
        name: propName,
        type: type.trim(),
        isReadonly: false,
        isOptional,
        isStatic: false,
      });
    }

    return properties;
  }

  /**
   * Extract methods from interface body
   */
  private extractInterfaceMethods(interfaceBody: string): ApiDocFunction[] {
    const methods: ApiDocFunction[] = [];

    // Match method declarations
    const methodRegex = /(\w+)\s*\(([^)]*)\)\s*(?::\s*([^\n,]+))?/g;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(interfaceBody)) !== null) {
      const methodName = match[1];
      const paramsStr = match[2] || '';
      const returnType = match[3]?.trim() || 'void';

      methods.push({
        name: methodName,
        parameters: this.parseParameters(paramsStr),
        returnType,
        isAsync: false,
        isExported: true,
        jsDoc: undefined,
        examples: [],
        lineStart: 0,
        lineEnd: 0,
      });
    }

    return methods;
  }

  /**
   * Filter functions by visibility
   */
  private filterFunctionsByVisibility(
    functions: ApiDocFunction[],
    includePrivate: boolean,
    includeProtected: boolean,
  ): ApiDocFunction[] {
    return functions.filter((func) => {
      if (func.isPrivate && !includePrivate) return false;
      if (func.isProtected && !includeProtected) return false;
      return true;
    });
  }

  /**
   * Filter classes by visibility
   */
  private filterClassesByVisibility(
    classes: ApiDocClass[],
    includePrivate: boolean,
    includeProtected: boolean,
  ): ApiDocClass[] {
    return classes.filter((cls) => {
      if (cls.isPrivate && !includePrivate) return false;
      if (cls.isProtected && !includeProtected) return false;
      return true;
    });
  }

  /**
   * Generate Markdown documentation
   */
  private generateMarkdown(
    data: {
      functions: ApiDocFunction[];
      classes: ApiDocClass[];
      interfaces: ApiDocInterface[];
      typeAliases: ApiDocTypeAlias[];
      enums: ApiDocEnum[];
    },
    options: ApiDocumentationOptions,
    filePath: string,
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(`# API Documentation`);
    lines.push('');
    lines.push(`**File:** \`${filePath}\``);
    lines.push('');

    // Table of Contents
    if (options.addTableOfContents) {
      lines.push('## Table of Contents');
      lines.push('');

      if (data.functions.length > 0) {
        lines.push('- [Functions](#functions)');
      }
      if (data.classes.length > 0) {
        lines.push('- [Classes](#classes)');
      }
      if (data.interfaces.length > 0) {
        lines.push('- [Interfaces](#interfaces)');
      }
      if (data.typeAliases.length > 0) {
        lines.push('- [Type Aliases](#type-aliases)');
      }
      if (data.enums.length > 0) {
        lines.push('- [Enums](#enums)');
      }

      lines.push('');
    }

    // Functions
    if (data.functions.length > 0) {
      lines.push('## Functions');
      lines.push('');

      for (const func of data.functions) {
        lines.push(this.generateFunctionMarkdown(func, options));
        lines.push('');
      }
    }

    // Classes
    if (data.classes.length > 0) {
      lines.push('## Classes');
      lines.push('');

      for (const cls of data.classes) {
        lines.push(this.generateClassMarkdown(cls, options));
        lines.push('');
      }
    }

    // Interfaces
    if (options.includeTypeDefinitions && data.interfaces.length > 0) {
      lines.push('## Interfaces');
      lines.push('');

      for (const iface of data.interfaces) {
        lines.push(this.generateInterfaceMarkdown(iface, options));
        lines.push('');
      }
    }

    // Type Aliases
    if (options.includeTypeDefinitions && data.typeAliases.length > 0) {
      lines.push('## Type Aliases');
      lines.push('');

      for (const typeAlias of data.typeAliases) {
        lines.push(this.generateTypeAliasMarkdown(typeAlias));
        lines.push('');
      }
    }

    // Enums
    if (options.includeTypeDefinitions && data.enums.length > 0) {
      lines.push('## Enums');
      lines.push('');

      for (const enum_ of data.enums) {
        lines.push(this.generateEnumMarkdown(enum_));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for a function
   */
  private generateFunctionMarkdown(func: ApiDocFunction, options: ApiDocumentationOptions): string {
    const lines: string[] = [];

    lines.push(`### ${func.isAsync ? 'async ' : ''}${func.name}`);
    lines.push('');

    if (func.description) {
      lines.push(func.description);
      lines.push('');
    }

    // Signature
    const paramsStr = func.parameters
      .map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
      .join(', ');
    lines.push(`\`\`\`typescript\n${func.name}(${paramsStr}): ${func.returnType}\n\`\`\``);
    lines.push('');

    // Parameters
    if (func.parameters.length > 0) {
      lines.push('**Parameters:**');
      lines.push('');
      lines.push('| Name | Type | Required | Description |');
      lines.push('|------|------|----------|-------------|');
      for (const param of func.parameters) {
        lines.push(
          `| \`${param.name}\` | \`${param.type}\` | ${param.isOptional ? 'No' : 'Yes'} | ${param.description || '-'} |`,
        );
      }
      lines.push('');
    }

    // Return type
    lines.push(`**Returns:** \`${func.returnType}\``);
    lines.push('');

    // Examples
    if (options.includeExamples && func.examples.length > 0) {
      lines.push('**Examples:**');
      lines.push('');
      for (const example of func.examples) {
        lines.push('```typescript');
        lines.push(example);
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for a class
   */
  private generateClassMarkdown(cls: ApiDocClass, options: ApiDocumentationOptions): string {
    const lines: string[] = [];

    lines.push(`### ${cls.name}`);
    lines.push('');

    if (cls.description) {
      lines.push(cls.description);
      lines.push('');
    }

    if (cls.extends) {
      lines.push(`**Extends:** \`${cls.extends}\``);
      lines.push('');
    }

    if (cls.implements && cls.implements.length > 0) {
      lines.push(`**Implements:** ${cls.implements.map((i) => `\`${i}\``).join(', ')}`);
      lines.push('');
    }

    // Properties
    if (cls.properties.length > 0) {
      lines.push('**Properties:**');
      lines.push('');
      lines.push('| Name | Type | Readonly | Optional | Static |');
      lines.push('|------|------|----------|----------|--------|');
      for (const prop of cls.properties) {
        lines.push(
          `| \`${prop.name}\` | \`${prop.type}\` | ${prop.isReadonly ? '✓' : '-'} | ${prop.isOptional ? '✓' : '-'} | ${prop.isStatic ? '✓' : '-'} |`,
        );
      }
      lines.push('');
    }

    // Methods
    if (cls.methods.length > 0) {
      lines.push('**Methods:**');
      lines.push('');
      for (const method of cls.methods) {
        lines.push(this.generateFunctionMarkdown(method, options));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for an interface
   */
  private generateInterfaceMarkdown(
    iface: ApiDocInterface,
    _options: ApiDocumentationOptions,
  ): string {
    const lines: string[] = [];

    lines.push(`### ${iface.name}`);
    lines.push('');

    if (iface.description) {
      lines.push(iface.description);
      lines.push('');
    }

    if (iface.extends && iface.extends.length > 0) {
      lines.push(`**Extends:** ${iface.extends.map((i) => `\`${i}\``).join(', ')}`);
      lines.push('');
    }

    // Properties
    if (iface.properties.length > 0) {
      lines.push('**Properties:**');
      lines.push('');
      lines.push('| Name | Type | Optional |');
      lines.push('|------|------|----------|');
      for (const prop of iface.properties) {
        lines.push(`| \`${prop.name}\` | \`${prop.type}\` | ${prop.isOptional ? '✓' : '-'} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for a type alias
   */
  private generateTypeAliasMarkdown(typeAlias: ApiDocTypeAlias): string {
    const lines: string[] = [];

    lines.push(`### ${typeAlias.name}`);
    lines.push('');

    if (typeAlias.description) {
      lines.push(typeAlias.description);
      lines.push('');
    }

    lines.push(`\`\`\`typescript\ntype ${typeAlias.name} = ${typeAlias.type};\n\`\`\``);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate Markdown for an enum
   */
  private generateEnumMarkdown(enum_: ApiDocEnum): string {
    const lines: string[] = [];

    lines.push(`### ${enum_.name}`);
    lines.push('');

    if (enum_.description) {
      lines.push(enum_.description);
      lines.push('');
    }

    lines.push('**Members:**');
    lines.push('');
    for (const member of enum_.members) {
      const valueStr = member.value ? ` = \`${member.value}\`` : '';
      lines.push(`- \`${member.name}\`${valueStr}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate HTML documentation
   */
  private generateHtml(
    data: {
      functions: ApiDocFunction[];
      classes: ApiDocClass[];
      interfaces: ApiDocInterface[];
      typeAliases: ApiDocTypeAlias[];
      enums: ApiDocEnum[];
    },
    options: ApiDocumentationOptions,
    filePath: string,
  ): string {
    const lines: string[] = [];

    // HTML Header
    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push('  <title>API Documentation</title>');
    lines.push('  <style>');
    lines.push(
      '    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }',
    );
    lines.push('    h1, h2, h3 { color: #333; }');
    lines.push(
      '    .function, .class, .interface, .type-alias, .enum { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }',
    );
    lines.push('    table { width: 100%; border-collapse: collapse; }');
    lines.push('    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }');
    lines.push('    th { background-color: #f5f5f5; }');
    lines.push('    code { background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; }');
    lines.push(
      '    pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }',
    );
    lines.push(
      '    .toc { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 30px; }',
    );
    lines.push('    .toc ul { list-style-type: none; }');
    lines.push('    .toc li { margin: 5px 0; }');
    lines.push('    .toc a { text-decoration: none; color: #0066cc; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push('');

    // Header
    lines.push('  <h1>API Documentation</h1>');
    lines.push(`  <p><strong>File:</strong> <code>${filePath}</code></p>`);
    lines.push('');

    // Table of Contents
    if (options.addTableOfContents) {
      lines.push('  <div class="toc">');
      lines.push('    <h2>Table of Contents</h2>');
      lines.push('    <ul>');

      if (data.functions.length > 0) {
        lines.push('      <li><a href="#functions">Functions</a></li>');
      }
      if (data.classes.length > 0) {
        lines.push('      <li><a href="#classes">Classes</a></li>');
      }
      if (data.interfaces.length > 0) {
        lines.push('      <li><a href="#interfaces">Interfaces</a></li>');
      }
      if (data.typeAliases.length > 0) {
        lines.push('      <li><a href="#type-aliases">Type Aliases</a></li>');
      }
      if (data.enums.length > 0) {
        lines.push('      <li><a href="#enums">Enums</a></li>');
      }

      lines.push('    </ul>');
      lines.push('  </div>');
      lines.push('');
    }

    // Functions
    if (data.functions.length > 0) {
      lines.push('  <h2 id="functions">Functions</h2>');
      lines.push('');
      for (const func of data.functions) {
        lines.push(this.generateFunctionHtml(func, options));
        lines.push('');
      }
    }

    // Classes
    if (data.classes.length > 0) {
      lines.push('  <h2 id="classes">Classes</h2>');
      lines.push('');
      for (const cls of data.classes) {
        lines.push(this.generateClassHtml(cls, options));
        lines.push('');
      }
    }

    // Interfaces
    if (options.includeTypeDefinitions && data.interfaces.length > 0) {
      lines.push('  <h2 id="interfaces">Interfaces</h2>');
      lines.push('');
      for (const iface of data.interfaces) {
        lines.push(this.generateInterfaceHtml(iface, options));
        lines.push('');
      }
    }

    // Type Aliases
    if (options.includeTypeDefinitions && data.typeAliases.length > 0) {
      lines.push('  <h2 id="type-aliases">Type Aliases</h2>');
      lines.push('');
      for (const typeAlias of data.typeAliases) {
        lines.push(this.generateTypeAliasHtml(typeAlias));
        lines.push('');
      }
    }

    // Enums
    if (options.includeTypeDefinitions && data.enums.length > 0) {
      lines.push('  <h2 id="enums">Enums</h2>');
      lines.push('');
      for (const enum_ of data.enums) {
        lines.push(this.generateEnumHtml(enum_));
        lines.push('');
      }
    }

    // Footer
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Generate HTML for a function
   */
  private generateFunctionHtml(func: ApiDocFunction, options: ApiDocumentationOptions): string {
    const lines: string[] = [];

    lines.push('  <div class="function">');
    lines.push(`    <h3>${func.isAsync ? 'async ' : ''}${func.name}</h3>`);

    if (func.description) {
      lines.push(`    <p>${func.description}</p>`);
    }

    // Signature
    const paramsStr = func.parameters
      .map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
      .join(', ');
    lines.push('    <pre><code>');
    lines.push(`${func.name}(${paramsStr}): ${func.returnType}`);
    lines.push('    </code></pre>');

    // Parameters
    if (func.parameters.length > 0) {
      lines.push('    <h4>Parameters</h4>');
      lines.push('    <table>');
      lines.push('      <thead>');
      lines.push('        <tr>');
      lines.push('          <th>Name</th>');
      lines.push('          <th>Type</th>');
      lines.push('          <th>Required</th>');
      lines.push('          <th>Description</th>');
      lines.push('        </tr>');
      lines.push('      </thead>');
      lines.push('      <tbody>');
      for (const param of func.parameters) {
        lines.push('        <tr>');
        lines.push(`          <td><code>${param.name}</code></td>`);
        lines.push(`          <td><code>${param.type}</code></td>`);
        lines.push(`          <td>${param.isOptional ? 'No' : 'Yes'}</td>`);
        lines.push(`          <td>${param.description || '-'}</td>`);
        lines.push('        </tr>');
      }
      lines.push('      </tbody>');
      lines.push('    </table>');
    }

    // Return type
    lines.push(`    <p><strong>Returns:</strong> <code>${func.returnType}</code></p>`);

    // Examples
    if (options.includeExamples && func.examples.length > 0) {
      lines.push('    <h4>Examples</h4>');
      for (const example of func.examples) {
        lines.push('    <pre><code>');
        lines.push(example);
        lines.push('    </code></pre>');
      }
    }

    lines.push('  </div>');

    return lines.join('\n');
  }

  /**
   * Generate HTML for a class
   */
  private generateClassHtml(cls: ApiDocClass, options: ApiDocumentationOptions): string {
    const lines: string[] = [];

    lines.push('  <div class="class">');
    lines.push(`    <h3>${cls.name}</h3>`);

    if (cls.description) {
      lines.push(`    <p>${cls.description}</p>`);
    }

    if (cls.extends) {
      lines.push(`    <p><strong>Extends:</strong> <code>${cls.extends}</code></p>`);
    }

    if (cls.implements && cls.implements.length > 0) {
      lines.push(
        `    <p><strong>Implements:</strong> ${cls.implements.map((i) => `<code>${i}</code>`).join(', ')}</p>`,
      );
    }

    // Properties
    if (cls.properties.length > 0) {
      lines.push('    <h4>Properties</h4>');
      lines.push('    <table>');
      lines.push('      <thead>');
      lines.push('        <tr>');
      lines.push('          <th>Name</th>');
      lines.push('          <th>Type</th>');
      lines.push('          <th>Readonly</th>');
      lines.push('          <th>Optional</th>');
      lines.push('          <th>Static</th>');
      lines.push('        </tr>');
      lines.push('      </thead>');
      lines.push('      <tbody>');
      for (const prop of cls.properties) {
        lines.push('        <tr>');
        lines.push(`          <td><code>${prop.name}</code></td>`);
        lines.push(`          <td><code>${prop.type}</code></td>`);
        lines.push(`          <td>${prop.isReadonly ? '✓' : '-'}</td>`);
        lines.push(`          <td>${prop.isOptional ? '✓' : '-'}</td>`);
        lines.push(`          <td>${prop.isStatic ? '✓' : '-'}</td>`);
        lines.push('        </tr>');
      }
      lines.push('      </tbody>');
      lines.push('    </table>');
    }

    // Methods
    if (cls.methods.length > 0) {
      lines.push('    <h4>Methods</h4>');
      for (const method of cls.methods) {
        lines.push(this.generateFunctionHtml(method, options));
      }
    }

    lines.push('  </div>');

    return lines.join('\n');
  }

  /**
   * Generate HTML for an interface
   */
  private generateInterfaceHtml(iface: ApiDocInterface, _options: ApiDocumentationOptions): string {
    const lines: string[] = [];

    lines.push('  <div class="interface">');
    lines.push(`    <h3>${iface.name}</h3>`);

    if (iface.description) {
      lines.push(`    <p>${iface.description}</p>`);
    }

    if (iface.extends && iface.extends.length > 0) {
      lines.push(
        `    <p><strong>Extends:</strong> ${iface.extends.map((i) => `<code>${i}</code>`).join(', ')}</p>`,
      );
    }

    // Properties
    if (iface.properties.length > 0) {
      lines.push('    <h4>Properties</h4>');
      lines.push('    <table>');
      lines.push('      <thead>');
      lines.push('        <tr>');
      lines.push('          <th>Name</th>');
      lines.push('          <th>Type</th>');
      lines.push('          <th>Optional</th>');
      lines.push('        </tr>');
      lines.push('      </thead>');
      lines.push('      <tbody>');
      for (const prop of iface.properties) {
        lines.push('        <tr>');
        lines.push(`          <td><code>${prop.name}</code></td>`);
        lines.push(`          <td><code>${prop.type}</code></td>`);
        lines.push(`          <td>${prop.isOptional ? '✓' : '-'}</td>`);
        lines.push('        </tr>');
      }
      lines.push('      </tbody>');
      lines.push('    </table>');
    }

    lines.push('  </div>');

    return lines.join('\n');
  }

  /**
   * Generate HTML for a type alias
   */
  private generateTypeAliasHtml(typeAlias: ApiDocTypeAlias): string {
    const lines: string[] = [];

    lines.push('  <div class="type-alias">');
    lines.push(`    <h3>${typeAlias.name}</h3>`);

    if (typeAlias.description) {
      lines.push(`    <p>${typeAlias.description}</p>`);
    }

    lines.push('    <pre><code>');
    lines.push(`type ${typeAlias.name} = ${typeAlias.type};`);
    lines.push('    </code></pre>');

    lines.push('  </div>');

    return lines.join('\n');
  }

  /**
   * Generate HTML for an enum
   */
  private generateEnumHtml(enum_: ApiDocEnum): string {
    const lines: string[] = [];

    lines.push('  <div class="enum">');
    lines.push(`    <h3>${enum_.name}</h3>`);

    if (enum_.description) {
      lines.push(`    <p>${enum_.description}</p>`);
    }

    lines.push('    <h4>Members</h4>');
    lines.push('    <ul>');
    for (const member of enum_.members) {
      const valueStr = member.value ? ` = <code>${member.value}</code>` : '';
      lines.push(`      <li><code>${member.name}</code>${valueStr}</li>`);
    }
    lines.push('    </ul>');

    lines.push('  </div>');

    return lines.join('\n');
  }
}
