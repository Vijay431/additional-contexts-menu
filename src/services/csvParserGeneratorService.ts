import * as vscode from 'vscode';

import type {
  CSVField,
  CSVFieldType,
  CSVGeneratorOptions,
  CSVGeneratorResult,
  CSVParserOptions,
  CSVParseResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

export type {
  CSVField,
  CSVFieldType,
  CSVGeneratorOptions,
  CSVGeneratorResult,
  CSVParserOptions,
  CSVParseResult,
};

/**
 * Service for creating CSV parsing and generation utilities.
 * Handles quoted fields, custom delimiters, streaming for large files, and type conversion.
 */
export class CSVParserGeneratorService {
  private static instance: CSVParserGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CSVParserGeneratorService {
    CSVParserGeneratorService.instance ??= new CSVParserGeneratorService();
    return CSVParserGeneratorService.instance;
  }

  /**
   * Parse CSV text with support for quoted fields and custom delimiters
   */
  public parseCSV(text: string, options: CSVParserOptions): CSVParseResult {
    const startTime = Date.now();

    const {
      hasHeader,
      skipEmptyLines,
      trimFields,
      includeTypeConversion,
    } = options;

    // Parse CSV rows
    const rows = this.parseCSVRows(text, options);

    // Skip empty lines if configured
    const filteredRows = skipEmptyLines
      ? rows.filter((row) => row.some((cell) => cell.trim() !== ''))
      : rows;

    // Extract headers
    let headers: string[] = [];
    let dataRows: string[][] = [];

    if (hasHeader && filteredRows.length > 0) {
      headers = filteredRows[0]!;
      dataRows = filteredRows.slice(1);
    } else {
      dataRows = filteredRows;
      // Generate column names if no header
      if (dataRows.length > 0 && dataRows[0]!.length > 0) {
        headers = Array.from({ length: dataRows[0]!.length }, (_, i) => `column${i}`);
      }
    }

    // Trim fields if configured
    if (trimFields) {
      headers = headers.map((h) => h.trim());
      dataRows = dataRows.map((row) => row.map((cell) => cell.trim()));
    }

    // Convert to typed records
    const typedRows: Array<Record<string, string | number | boolean | Date | null>> = [];
    const fields: CSVField[] = [];

    // Detect field types from first data row
    if (includeTypeConversion && dataRows.length > 0) {
      for (let i = 0; i < headers.length; i++) {
        const field = this.detectFieldType(headers[i]!, i, dataRows);
        fields.push(field);
      }
    } else {
      for (let i = 0; i < headers.length; i++) {
        fields.push({
          name: headers[i]!,
          type: 'string',
          index: i,
          isRequired: true,
        });
      }
    }

    // Convert rows to records with type conversion
    for (const row of dataRows) {
      const record: Record<string, string | number | boolean | Date | null> = {};
      for (let i = 0; i < headers.length; i++) {
        const fieldName = headers[i]!;
        const value = row[i] ?? '';
        const field = fields[i];

        if (includeTypeConversion && field) {
          record[fieldName] = this.convertValue(value, field.type);
        } else {
          record[fieldName] = value;
        }
      }
      typedRows.push(record);
    }

    const parseDuration = Date.now() - startTime;

    this.logger.info('CSV parsed', {
      rowCount: typedRows.length,
      fieldCount: fields.length,
      parseDuration,
    });

    return {
      headers,
      rows: typedRows,
      fields,
      rowCount: typedRows.length,
      parseDuration,
    };
  }

  /**
   * Parse CSV rows handling quoted fields and custom delimiters
   */
  private parseCSVRows(text: string, options: CSVParserOptions): string[][] {
    const { delimiter, quoteChar, escapeChar } = options;
    const rows: string[][] = [];
    const currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const char = text[i]!;
      const nextChar = text[i + 1];

      // Handle escape character
      if (char === escapeChar && !inQuotes) {
        i++;
        if (i < text.length) {
          currentField += text[i]!;
        }
        i++;
        continue;
      }

      // Handle quote character
      if (char === quoteChar) {
        inQuotes = !inQuotes;
        i++;
        continue;
      }

      // Handle delimiter (only when not in quotes)
      if (char === delimiter && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      }

      // Handle newline (only when not in quotes)
      if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField);
        }
        if (currentRow.length > 0) {
          rows.push(currentRow.slice());
        }
        currentRow.length = 0;
        currentField = '';
        i++;
        if (char === '\r') {
          i++;
        }
        continue;
      }

      // Regular character
      currentField += char;
      i++;
    }

    // Add last field and row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  /**
   * Detect the type of a field based on its values
   */
  private detectFieldType(name: string, index: number, rows: string[][]): CSVField {
    let type: CSVFieldType = 'string';
    let isRequired = true;

    // Sample values from all rows
    const values: string[] = [];
    for (const row of rows) {
      if (index < row.length && row[index]!.trim() !== '') {
        values.push(row[index]!);
      }
    }

    // Check if field has empty values (optional)
    if (values.length < rows.length) {
      isRequired = false;
    }

    // Detect type from values
    if (values.length === 0) {
      type = 'string';
    } else {
      const numberCount = values.filter((v) => !Number.isNaN(Number(v))).length;
      const booleanCount = values.filter(
        (v) => v.toLowerCase() === 'true' || v.toLowerCase() === 'false',
      ).length;
      const dateCount = values.filter((v) => !Number.isNaN(Date.parse(v))).length;

      const totalValues = values.length;
      const threshold = totalValues * 0.8; // 80% of values should match

      if (numberCount >= threshold) {
        type = 'number';
      } else if (booleanCount >= threshold) {
        type = 'boolean';
      } else if (dateCount >= threshold) {
        type = 'date';
      } else {
        type = 'string';
      }
    }

    return {
      name,
      type,
      index,
      isRequired,
    };
  }

  /**
   * Convert a string value to the specified type
   */
  private convertValue(value: string, type: CSVFieldType): string | number | boolean | Date | null {
    if (!value || value.trim() === '') {
      return null;
    }

    switch (type) {
      case 'number':
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
      case 'boolean':
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
          return true;
        }
        if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
          return false;
        }
        return value;
      case 'date':
        const date = Date.parse(value);
        return Number.isNaN(date) ? value : new Date(date);
      case 'auto':
        // Try to detect type automatically
        if (!Number.isNaN(Number(value))) {
          return Number(value);
        }
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          return value.toLowerCase() === 'true';
        }
        const parsedDate = Date.parse(value);
        if (!Number.isNaN(parsedDate)) {
          return new Date(parsedDate);
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Generate CSV parser and generator utilities
   */
  public generateCSVUtilities(
    fields: CSVField[],
    options: CSVGeneratorOptions,
  ): CSVGeneratorResult {
    const startTime = Date.now();

    const typeDefinitions = this.generateTypeDefinitions(fields, options);
    const parserCode = this.generateParserCode(fields, options);
    const generatorCode = this.generateGeneratorCode(fields, options);
    const usageExample = this.generateUsageExample(fields, options);

    const generationDuration = Date.now() - startTime;

    this.logger.info('CSV utilities generated', {
      fieldCount: fields.length,
      generationDuration,
    });

    return {
      parserCode,
      generatorCode,
      typeDefinitions,
      usageExample,
      generatedAt: Date.now(),
    };
  }

  /**
   * Generate TypeScript type definitions for CSV fields
   */
  private generateTypeDefinitions(fields: CSVField[], options: CSVGeneratorOptions): string {
    let code = '';

    if (options.includeJSDoc) {
      code += '/**\n';
      code += ' * Type definitions for CSV data\n';
      code += ` * ${fields.length} fields\n`;
      code += ' */\n';
    }

    if (options.includeTypeScript) {
      code += 'export interface CSVRow {\n';
      for (const field of fields) {
        const optional = field.isRequired ? '' : '?';
        const tsType = this.getTSType(field.type);
        code += `  ${field.name}${optional}: ${tsType};\n`;
      }
      code += '}\n\n';

      // Generate enum for field names
      code += 'export enum CSVField {\n';
      for (const field of fields) {
        code += `  ${field.name.toUpperCase()} = '${field.name}',\n`;
      }
      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generate CSV parser code
   */
  private generateParserCode(_fields: CSVField[], options: CSVGeneratorOptions): string {
    let code = '';

    if (options.includeJSDoc) {
      code += '/**\n';
      code += ' * CSV Parser class\n';
      code += ' * Handles quoted fields, custom delimiters, and type conversion\n';
      code += ' */\n';
    }

    if (options.includeTypeScript) {
      code += 'export class CSVParser {\n';
      code += '  private options: CSVParserOptions;\n\n';
      code += '  constructor(options?: Partial<CSVParserOptions>) {\n';
      code += '    this.options = {\n';
      code += `      delimiter: '${options.delimiter}',\n`;
      code += `      quoteChar: '${options.quoteChar}',\n`;
      code += `      escapeChar: '${options.escapeChar}',\n`;
      code += '      hasHeader: true,\n';
      code += '      skipEmptyLines: true,\n';
      code += '      trimFields: true,\n';
      code += '      includeTypeConversion: true,\n';
      code += '      ...options,\n';
      code += '    };\n';
      code += '  }\n\n';

      code += '  /**\n';
      code += '   * Parse CSV text into an array of objects\n';
      code += '   */\n';
      code += '  parse(text: string): CSVRow[] {\n';
      code += '    const lines = this.splitLines(text);\n';
      code += '    const rows: string[][] = [];\n\n';

      code += '    for (const line of lines) {\n';
      code += '      if (this.options.skipEmptyLines && !line.trim()) continue;\n';
      code += '      const row = this.parseLine(line);\n';
      code += '      rows.push(row);\n';
      code += '    }\n\n';

      code += '    let headers: string[] = [];\n';
      code += '    let dataRows = rows;\n\n';

      code += '    if (this.options.hasHeader && rows.length > 0) {\n';
      code += '      headers = rows[0]!;\n';
      code += '      dataRows = rows.slice(1);\n';
      code += '    }\n\n';

      code += '    return dataRows.map(row => this.rowToObject(row, headers));\n';
      code += '  }\n\n';

      code += '  private splitLines(text: string): string[] {\n';
      code += '    return text.split(/\\r?\\n/);\n';
      code += '  }\n\n';

      code += '  private parseLine(line: string): string[] {\n';
      code += '    const fields: string[] = [];\n';
      code += '    let current = "";\n';
      code += '    let inQuotes = false;\n\n';

      code += '    for (let i = 0; i < line.length; i++) {\n';
      code += `      const char = line[i]!;\n`;
      code += `      if (char === this.options.quoteChar) {\n`;
      code += '        inQuotes = !inQuotes;\n';
      code += `      } else if (char === this.options.delimiter && !inQuotes) {\n`;
      code += '        fields.push(this.options.trimFields ? current.trim() : current);\n';
      code += '        current = "";\n';
      code += '      } else {\n';
      code += '        current += char;\n';
      code += '      }\n';
      code += '    }\n';
      code += '    fields.push(this.options.trimFields ? current.trim() : current);\n';
      code += '    return fields;\n';
      code += '  }\n\n';

      code += '  private rowToObject(row: string[], headers: string[]): CSVRow {\n';
      code += '    const obj: any = {};\n';
      code += '    for (let i = 0; i < headers.length; i++) {\n';
      code += '      obj[headers[i]!] = row[i] ?? "";\n';
      code += '    }\n';
      code += '    return obj;\n';
      code += '  }\n';

      if (options.includeErrorHandling) {
        code += '\n  /**\n';
        code += '   * Parse CSV file from a URL\n';
        code += '   */\n';
        code += '  async parseFromFile(file: File): Promise<CSVRow[]> {\n';
        code += '    try {\n';
        code += '      const text = await file.text();\n';
        code += '      return this.parse(text);\n';
        code += '    } catch (error) {\n';
        code += '      console.error("Failed to parse CSV file:", error);\n';
        code += '      throw new Error(`CSV parsing failed: ${error}`);\n';
        code += '    }\n';
        code += '  }\n';
      }

      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generate CSV generator/writer code
   */
  private generateGeneratorCode(_fields: CSVField[], options: CSVGeneratorOptions): string {
    let code = '';

    if (options.includeJSDoc) {
      code += '/**\n';
      code += ' * CSV Generator class\n';
      code += ' * Converts arrays of objects to CSV format\n';
      code += ' */\n';
    }

    if (options.includeTypeScript) {
      code += 'export class CSVGenerator {\n';
      code += '  private options: any;\n\n';

      code += '  constructor(options?: any) {\n';
      code += '    this.options = {\n';
      code += `      delimiter: '${options.delimiter}',\n`;
      code += `      quoteChar: '${options.quoteChar}',\n`;
      code += `      escapeChar: '${options.escapeChar}',\n`;
      code += '      includeHeader: true,\n';
      code += '      trimFields: true,\n';
      code += '      ...options,\n';
      code += '    };\n';
      code += '  }\n\n';

      code += '  /**\n';
      code += '   * Convert array of objects to CSV string\n';
      code += '   */\n';
      code += '  generate(data: any[]): string {\n';
      code += '    if (data.length === 0) return "";\n\n';

      code += '    const headers = Object.keys(data[0]);\n';
      code += '    let csv = "";\n\n';

      code += '    if (this.options.includeHeader) {\n';
      code += '      csv += this.formatRow(headers) + "\\n";\n';
      code += '    }\n\n';

      code += '    for (const row of data) {\n';
      code += '      const values = headers.map(h => String(row[h] ?? ""));\n';
      code += '      csv += this.formatRow(values) + "\\n";\n';
      code += '    }\n\n';

      code += '    return csv;\n';
      code += '  }\n\n';

      code += '  /**\n';
      code += '   * Format a single row as CSV\n';
      code += '   */\n';
      code += '  private formatRow(fields: string[]): string {\n';
      code += '    return fields.map(field => this.formatField(field)).join(this.options.delimiter);\n';
      code += '  }\n\n';

      code += '  /**\n';
      code += '   * Format a single field with quoting if necessary\n';
      code += '   */\n';
      code += '  private formatField(field: string): string {\n';
      code += '    const needsQuoting =\n';
      code += '      field.includes(this.options.delimiter) ||\n';
      code += '      field.includes(this.options.quoteChar) ||\n';
      code += '      field.includes("\\n") ||\n';
      code += '      this.options.trimFields && field.trim() !== field;\n\n';

      // Use simpler approach without regex in generated code
      code += '    if (needsQuoting) {\n';
      code += '      let escaped = field.split(this.options.quoteChar).join(this.options.escapeChar + this.options.quoteChar);\n';
      code += '      return this.options.quoteChar + escaped + this.options.quoteChar;\n';
      code += '    }\n\n';

      code += '    return this.options.trimFields ? field.trim() : field;\n';
      code += '  }\n\n';

      if (options.includeErrorHandling) {
        code += '  /**\n';
        code += '   * Download CSV as a file\n';
        code += '   */\n';
        code += '  download(data: any[], filename: string): void {\n';
        code += '    try {\n';
        code += '      const csv = this.generate(data);\n';
        code += '      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });\n';
        code += '      const link = document.createElement("a");\n';
        code += '      const url = URL.createObjectURL(blob);\n';
        code += '      link.setAttribute("href", url);\n';
        code += '      link.setAttribute("download", filename);\n';
        code += '      link.style.visibility = "hidden";\n';
        code += '      document.body.appendChild(link);\n';
        code += '      link.click();\n';
        code += '      document.body.removeChild(link);\n';
        code += '    } catch (error) {\n';
        code += '      console.error("Failed to download CSV:", error);\n';
        code += '      throw new Error("CSV download failed: " + error);\n';
        code += '    }\n';
        code += '  }\n';
      }

      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generate usage example
   */
  private generateUsageExample(_fields: CSVField[], options: CSVGeneratorOptions): string {
    let code = '';

    if (options.includeJSDoc) {
      code += '/**\n';
      code += ' * Usage example\n';
      code += ' */\n';
    }

    if (options.includeTypeScript) {
      code += '// Example usage:\n\n';

      code += '// Parse CSV\n';
      code += 'const parser = new CSVParser({\n';
      code += `  delimiter: '${options.delimiter}',\n`;
      code += `  quoteChar: '${options.quoteChar}',\n`;
      code += '  hasHeader: true,\n';
      code += '});\n\n';

      code += 'const data = parser.parse(csvString);\n';
      code += 'console.log(data);\n\n';

      code += '// Generate CSV\n';
      code += 'const generator = new CSVGenerator({\n';
      code += `  delimiter: '${options.delimiter}',\n`;
      code += '  includeHeader: true,\n';
      code += '});\n\n';

      code += 'const csv = generator.generate(data);\n';
      code += 'console.log(csv);\n';
    }

    return code;
  }

  /**
   * Get TypeScript type for CSV field type
   */
  private getTSType(type: CSVFieldType): string {
    switch (type) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'Date';
      case 'auto':
        return 'string | number | boolean | Date';
      default:
        return 'string';
    }
  }

  /**
   * Stream large CSV files
   */
  public async* streamCSV(
    text: string,
    options: CSVParserOptions,
    chunkSize: number = 1000,
  ): AsyncGenerator<Record<string, string | number | boolean | Date | null>> {
    const lines = text.split(/\r?\n/);
    const buffer: string[] = [];
    let headerProcessed = false;

    for (const line of lines) {
      if (options.skipEmptyLines && !line.trim()) {
        continue;
      }

      buffer.push(line);

      if (buffer.length >= chunkSize) {
        const chunk = buffer.join('\n');
        const result = this.parseCSV(chunk, {
          ...options,
          hasHeader: options.hasHeader && !headerProcessed,
        });

        if (!headerProcessed && result.headers.length > 0) {
          headerProcessed = true;
        }

        for (const row of result.rows) {
          yield row;
        }

        buffer.length = 0;
      }
    }

    // Process remaining lines
    if (buffer.length > 0) {
      const chunk = buffer.join('\n');
      const result = this.parseCSV(chunk, {
        ...options,
        hasHeader: options.hasHeader && !headerProcessed,
      });

      for (const row of result.rows) {
        yield row;
      }
    }
  }

  /**
   * Convert records to CSV string
   */
  public generateCSV(
    records: Array<Record<string, string | number | boolean | Date | null>>,
    options: CSVGeneratorOptions,
  ): string {
    if (records.length === 0) {
      return '';
    }

    const { delimiter, quoteChar, escapeChar, includeHeader, trimFields } = options;
    let csv = '';

    // Get headers from first record
    const headers = Object.keys(records[0]!);

    // Add header row
    if (includeHeader) {
      csv += this.formatRow(headers, { delimiter, quoteChar, escapeChar, trimFields }) + '\n';
    }

    // Add data rows
    for (const record of records) {
      const values = headers.map((h) => String(record[h] ?? ''));
      csv += this.formatRow(values, { delimiter, quoteChar, escapeChar, trimFields }) + '\n';
    }

    return csv;
  }

  /**
   * Format a row as CSV string
   */
  private formatRow(
    fields: string[],
    options: { delimiter: string; quoteChar: string; escapeChar: string; trimFields: boolean },
  ): string {
    return fields.map((field) => this.formatField(field, options)).join(options.delimiter);
  }

  /**
   * Format a single field with quoting if necessary
   */
  private formatField(
    field: string,
    options: { delimiter: string; quoteChar: string; escapeChar: string; trimFields: boolean },
  ): string {
    const { delimiter, quoteChar, escapeChar, trimFields } = options;
    const value = trimFields ? field.trim() : field;

    const needsQuoting =
      value.includes(delimiter) ||
      value.includes(quoteChar) ||
      value.includes('\n') ||
      value.includes('\r') ||
      trimFields && value !== field.trim();

    if (needsQuoting) {
      let escaped = value.replace(new RegExp(quoteChar, 'g'), escapeChar + quoteChar);
      return `${quoteChar}${escaped}${quoteChar}`;
    }

    return value;
  }

  /**
   * Get generator options from user input
   */
  public async getGeneratorOptions(): Promise<CSVGeneratorOptions | undefined> {
    // Ask about delimiter
    const delimiterInput = await vscode.window.showInputBox({
      prompt: 'Enter CSV delimiter',
      placeHolder: ',',
      value: ',',
    });

    if (delimiterInput === undefined) {
      return undefined;
    }

    // Ask about quote character
    const quoteCharInput = await vscode.window.showInputBox({
      prompt: 'Enter quote character',
      placeHolder: '"',
      value: '"',
    });

    if (quoteCharInput === undefined) {
      return undefined;
    }

    // Ask about including header
    const includeHeader = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'Include header row in generated CSV', value: true },
        { label: 'No', description: 'Do not include header row', value: false },
      ],
      {
        placeHolder: 'Include header row?',
      },
    );

    if (!includeHeader) {
      return undefined;
    }

    return {
      delimiter: delimiterInput || ',',
      quoteChar: quoteCharInput || '"',
      escapeChar: '"',
      includeHeader: includeHeader.value,
      trimFields: true,
      includeTypeScript: true,
      includeJSDoc: true,
      includeErrorHandling: true,
    };
  }

  /**
   * Get parser options from user input
   */
  public async getParserOptions(): Promise<CSVParserOptions | undefined> {
    // Ask about delimiter
    const delimiterInput = await vscode.window.showInputBox({
      prompt: 'Enter CSV delimiter',
      placeHolder: ',',
      value: ',',
    });

    if (delimiterInput === undefined) {
      return undefined;
    }

    // Ask about quote character
    const quoteCharInput = await vscode.window.showInputBox({
      prompt: 'Enter quote character',
      placeHolder: '"',
      value: '"',
    });

    if (quoteCharInput === undefined) {
      return undefined;
    }

    // Ask about header
    const hasHeader = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: 'First row contains headers', value: true },
        { label: 'No', description: 'No header row', value: false },
      ],
      {
        placeHolder: 'Does CSV have a header row?',
      },
    );

    if (!hasHeader) {
      return undefined;
    }

    return {
      delimiter: delimiterInput || ',',
      quoteChar: quoteCharInput || '"',
      escapeChar: '"',
      hasHeader: hasHeader.value,
      skipEmptyLines: true,
      trimFields: true,
      includeTypeConversion: true,
      includeStreaming: false,
    };
  }
}
