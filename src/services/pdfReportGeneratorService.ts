import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

/**
 * Service for generating PDF report templates from data structures
 * Creates styled PDFs with headers, footers, tables, and charts
 */
export class PdfReportGeneratorService {
  private static instance: PdfReportGeneratorService | undefined;
  private readonly logger: Logger;
  private readonly configurationService: ConfigurationService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configurationService = ConfigurationService.getInstance();
  }

  static getInstance(): PdfReportGeneratorService {
    if (!PdfReportGeneratorService.instance) {
      PdfReportGeneratorService.instance = new PdfReportGeneratorService();
    }
    return PdfReportGeneratorService.instance;
  }

  /**
   * Generate a PDF report template from the current file/selection
   */
  async generatePdfReport(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Please open a file first.');
        return;
      }

      const extensionConfig = this.configurationService.getConfig();
      const pdfConfig = (extensionConfig as any).pdfReportGenerator;

      if (!pdfConfig?.enabled) {
        void vscode.window.showWarningMessage('PDF Report Generator is not enabled.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating PDF Report Template...',
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ increment: 0 });

          // Extract data structure from current file
          const dataStructure = await this.extractDataStructure(editor, token);
          if (token.isCancellationRequested) {
            return;
          }
          progress.report({ increment: 30 });

          // Generate PDF template code
          const templateCode = this.generateTemplateCode(dataStructure, pdfConfig);
          if (token.isCancellationRequested) {
            return;
          }
          progress.report({ increment: 60 });

          // Write to file
          await this.writeTemplateFile(editor.document.uri, templateCode, pdfConfig);
          if (token.isCancellationRequested) {
            return;
          }
          progress.report({ increment: 100 });

          this.logger.info('PDF report template generated successfully');
        },
      );
    } catch (error) {
      this.logger.error('Error generating PDF report template', error);
      void vscode.window.showErrorMessage(
        `Failed to generate PDF report template: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract data structure from the current file
   */
  private async extractDataStructure(
    editor: vscode.TextEditor,
    token: vscode.CancellationToken,
  ): Promise<any> {
    const document = editor.document;
    const selectedText = editor.selection.isEmpty
      ? document.getText()
      : document.getText(editor.selection);

    const info = {
      fileName: path.basename(document.fileName),
      interfaces: [] as any[],
      classes: [] as any[],
      enums: [] as any[],
      types: [] as any[],
      properties: [] as any[],
    };

    if (token.isCancellationRequested) {
      return info;
    }

    // Parse TypeScript/JavaScript for interfaces, classes, and types
    const lines = selectedText.split('\n');
    let currentBraceLevel = 0;
    let currentEntity: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmedLine = line.trim();

      if (token.isCancellationRequested) {
        break;
      }

      // Track brace levels
      currentBraceLevel += (line.match(/{/g) || []).length;
      currentBraceLevel -= (line.match(/}/g) || []).length;

      // Detect interface declaration
      const interfaceMatch = trimmedLine.match(/^export\s+interface\s+(\w+)\s*(?:extends\s+(\w+(?:\s*,\s*\w+)*))?\s*{/);
      if (interfaceMatch && currentBraceLevel === 1) {
        currentEntity = {
          name: interfaceMatch[1] ?? '',
          type: 'interface',
          extends: interfaceMatch[2] !== undefined ? interfaceMatch[2].split(/\s*,\s*/).filter(Boolean) : [],
          properties: [],
          startLine: i + 1,
        };
        info.interfaces.push(currentEntity);
        continue;
      }

      // Detect class declaration
      const classMatch = trimmedLine.match(/^export\s+class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+(\w+(?:\s*,\s*\w+)*))?\s*{/);
      if (classMatch && currentBraceLevel === 1) {
        currentEntity = {
          name: classMatch[1] ?? '',
          type: 'class',
          extends: classMatch[2] !== undefined ? [classMatch[2]] : [],
          implements: classMatch[3] !== undefined ? classMatch[3].split(/\s*,\s*/).filter(Boolean) : [],
          properties: [],
          methods: [],
          startLine: i + 1,
        };
        info.classes.push(currentEntity);
        continue;
      }

      // Detect type alias
      const typeMatch = trimmedLine.match(/^export\s+type\s+(\w+)\s*=\s*([^;]+);/);
      if (typeMatch) {
        info.types.push({
          name: typeMatch[1] ?? '',
          definition: typeMatch[2]?.trim() ?? '',
          line: i + 1,
        });
        continue;
      }

      // Detect enum declaration
      const enumMatch = trimmedLine.match(/^export\s+enum\s+(\w+)\s*{/);
      if (enumMatch && currentBraceLevel === 1) {
        currentEntity = {
          name: enumMatch[1] ?? '',
          type: 'enum',
          values: [],
          startLine: i + 1,
        };
        info.enums.push(currentEntity);
        continue;
      }

      // Parse properties inside entities
      if (currentEntity && currentBraceLevel > 0) {
        if (currentEntity.type === 'enum') {
          // Parse enum values
          const enumValueMatch = trimmedLine.match(/^(\w+)\s*(?:=\s*([^,]+))?/);
          if (enumValueMatch && trimmedLine !== '{') {
            currentEntity.values.push({
              name: enumValueMatch[1] ?? '',
              value: enumValueMatch[2]?.trim(),
            });
          }
        } else {
          // Parse class/interface properties
          const propertyMatch = trimmedLine.match(
            /^(?:(readonly|public|private|protected)\s+)?(?:static\s+)?(\w+)(\?)?(?:\s*:\s*([^;=]+))?(?:\s*=\s*([^;]+))?;?/,
          );
          if (propertyMatch) {
            const property: any = {
              name: propertyMatch[2] ?? '',
              type: propertyMatch[4] ?? 'any',
              optional: propertyMatch[3] === '?',
              readonly: propertyMatch[1] === 'readonly',
            };

            if (propertyMatch[5] !== undefined) {
              property.defaultValue = propertyMatch[5].trim();
            }

            if (currentEntity.properties) {
              currentEntity.properties.push(property);
            }

            info.properties.push(property);
          }

          // Parse class methods
          if (currentEntity.type === 'class') {
            const methodMatch = trimmedLine.match(
              /^(?:(public|private|protected)\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/,
            );
            if (methodMatch && !trimmedLine.includes('class ')) {
              const method: any = {
                name: methodMatch[2] ?? '',
                parameters: this.parseParameters(methodMatch[3] ?? ''),
                returnType: methodMatch[4]?.trim() ?? 'void',
                async: trimmedLine.includes('async '),
              };
              if (currentEntity.methods) {
                currentEntity.methods.push(method);
              }
            }
          }
        }
      }

      // Close entity when brace level returns to 0
      if (currentBraceLevel === 0 && currentEntity) {
        currentEntity.endLine = i + 1;
        currentEntity = null;
      }
    }

    return info;
  }

  /**
   * Parse function parameters
   */
  private parseParameters(paramsStr: string): any[] {
    if (!paramsStr.trim()) {
      return [];
    }

    const parameters: any[] = [];
    const params = paramsStr.split(',').map((p) => p.trim());

    for (const param of params) {
      const match = param.match(/^(\w+)(\?)?(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
      if (match) {
        const paramInfo: any = {
          name: match[1] ?? '',
          type: match[3]?.trim() ?? 'any',
          optional: match[2] === '?',
        };

        if (match[4] !== undefined) {
          paramInfo.defaultValue = match[4].trim();
        }

        parameters.push(paramInfo);
      }
    }

    return parameters;
  }

  /**
   * Generate PDF template code
   */
  private generateTemplateCode(dataStructure: any, config: any): string {
    const usePdfKit = config?.library === 'pdfkit';
    const className = this.toPascalCase(dataStructure.fileName.replace(/\.(ts|js|tsx|jsx)$/, ''));

    const lines: string[] = [];

    // Add imports
    lines.push(usePdfKit ? `import PDFDocument from 'pdfkit';` : `import { jsPDF } from 'jspdf';`);
    lines.push(`import * as fs from 'fs';`);
    lines.push(`import { join } from 'path';`);
    lines.push('');

    // Add type imports if interfaces exist
    if (dataStructure.interfaces.length > 0) {
      lines.push(`// Types`);
      for (const iface of dataStructure.interfaces) {
        lines.push(`interface ${iface.name} {`);
        for (const prop of iface.properties) {
          const readonly = prop.readonly ? 'readonly ' : '';
          const optional = prop.optional ? '?' : '';
          lines.push(`  ${readonly}${prop.name}${optional}: ${prop.type};`);
        }
        lines.push(`}`);
      }
      lines.push('');
    }

    // Add class definition
    lines.push(`/**`);
    lines.push(` * PDF Report Generator for ${className}`);
    lines.push(` * Generates styled PDF reports with headers, footers, tables, and charts`);
    lines.push(` */`);
    lines.push(`export class ${className}PdfReport {`);
    lines.push(`  private doc${usePdfKit ? ': PDFDocument' : ': jsPDF'};`);
    lines.push(`  private filePath: string;`);
    lines.push(`  private margin = ${config?.margin ?? 50};`);
    lines.push(`  private currentY = ${config?.margin ?? 50};`);
    lines.push('');

    // Constructor
    lines.push(`  constructor(fileName: string, outputDir: string = './reports') {`);
    lines.push(usePdfKit
      ? `    this.doc = new PDFDocument({ size: 'LETTER', margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin } });`
      : `    this.doc = new jsPDF({ unit: 'pt', format: 'letter' });`
    );
    lines.push(`    this.filePath = join(outputDir, fileName);`);
    lines.push(`  }`);
    lines.push('');

    // Add header method
    lines.push(`  /**`);
    lines.push(`   * Add header to the PDF`);
    lines.push(`   */`);
    lines.push(`  addHeader(title: string, subtitle?: string): void {`);
    if (usePdfKit) {
      lines.push(`    this.doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });`);
      lines.push(`    this.currentY += 30;`);
      lines.push(`    if (subtitle) {`);
      lines.push(`      this.doc.fontSize(12).font('Helvetica').fillColor('gray').text(subtitle, { align: 'center' });`);
      lines.push(`      this.currentY += 20;`);
      lines.push(`    }`);
      lines.push(`    this.doc.moveTo(this.margin, this.currentY).lineTo(this.doc.page.width - this.margin, this.currentY).stroke();`);
      lines.push(`    this.currentY += 20;`);
    } else {
      lines.push(`    const pageWidth = this.doc.internal.pageSize.getWidth();`);
      lines.push(`    this.doc.setFontSize(20).setFont('helvetica', 'bold').setText(title, pageWidth / 2, 40, { align: 'center' });`);
      lines.push(`    if (subtitle) {`);
      lines.push(`      this.doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(128, 128, 128).setText(subtitle, pageWidth / 2, 60, { align: 'center' });`);
      lines.push(`    }`);
      lines.push(`    this.doc.setDrawColor(0, 0, 0).line(this.margin, 75, pageWidth - this.margin, 75);`);
      lines.push(`    this.currentY = 90;`);
    }
    lines.push(`  }`);
    lines.push('');

    // Add footer method
    lines.push(`  /**`);
    lines.push(`   * Add footer to the PDF with page numbers`);
    lines.push(`   */`);
    lines.push(`  addFooter(text?: string): void {`);
    if (usePdfKit) {
      lines.push(`    const pages = this.doc.bufferedPageRange();`);
      lines.push(`    for (let i = 0; i < pages.count; i++) {`);
      lines.push(`      this.doc.switchToPage(i);`);
      lines.push(`      const pageNumber = i + 1;`);
      lines.push(`      this.doc.fontSize(10).fillColor('gray').text(`);
      lines.push(`        text ? \`\${text} - Page \${pageNumber}\` : \`Page \${pageNumber}\`,`);
      lines.push(`        this.doc.page.margins.left,`);
      lines.push(`        this.doc.page.height - this.doc.page.margins.bottom,`);
      lines.push(`        { align: 'center' }`);
      lines.push(`      );`);
      lines.push(`    }`);
    } else {
      lines.push(`    const pages = this.doc.internal.getNumberOfPages();`);
      lines.push(`    const pageHeight = this.doc.internal.pageSize.getHeight();`);
      lines.push(`    for (let i = 1; i <= pages; i++) {`);
      lines.push(`      this.doc.setPage(i);`);
      lines.push(`      this.doc.setFontSize(10).setTextColor(128, 128, 128);`);
      lines.push(`      const footerText = text ? \`\${text} - Page \${i}\` : \`Page \${i}\`;`);
      lines.push(`      this.doc.setText(footerText, this.doc.internal.pageSize.getWidth() / 2, pageHeight - 20, { align: 'center' });`);
      lines.push(`    }`);
    }
    lines.push(`  }`);
    lines.push('');

    // Add table method
    lines.push(`  /**`);
    lines.push(`   * Add a table to the PDF`);
    lines.push(`   */`);
    lines.push(`  addTable(headers: string[], rows: string[][]): void {`);
    if (usePdfKit) {
      lines.push(`    const columnWidth = (this.doc.page.width - 2 * this.margin) / headers.length;`);
      lines.push(`    let y = this.currentY;`);
      lines.push('');
      lines.push(`    // Draw headers`);
      lines.push(`    this.doc.font('Helvetica-Bold').fontSize(10);`);
      lines.push(`    headers.forEach((header, i) => {`);
      lines.push(`      this.doc.text(header, this.margin + i * columnWidth, y, { width: columnWidth - 10, align: 'left' });`);
      lines.push(`    });`);
      lines.push(`    y += 20;`);
      lines.push('');
      lines.push(`    // Draw rows`);
      lines.push(`    this.doc.font('Helvetica').fontSize(9);`);
      lines.push(`    rows.forEach((row) => {`);
      lines.push(`      row.forEach((cell, i) => {`);
      lines.push(`        this.doc.text(cell, this.margin + i * columnWidth, y, { width: columnWidth - 10, align: 'left' });`);
      lines.push(`      });`);
      lines.push(`      y += 18;`);
      lines.push(`    });`);
      lines.push('');
      lines.push(`    this.currentY = y;`);
    } else {
      lines.push(`    const pageWidth = this.doc.internal.pageSize.getWidth();`);
      lines.push(`    const columnWidth = (pageWidth - 2 * this.margin) / headers.length;`);
      lines.push(`    let y = this.currentY;`);
      lines.push('');
      lines.push(`    // Draw headers`);
      lines.push(`    this.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(0, 0, 0);`);
      lines.push(`    headers.forEach((header, i) => {`);
      lines.push(`      this.doc.text(header, this.margin + i * columnWidth, y);`);
      lines.push(`    });`);
      lines.push(`    y += 20;`);
      lines.push('');
      lines.push(`    // Draw rows`);
      lines.push(`    this.doc.setFont('helvetica', 'normal').setFontSize(9);`);
      lines.push(`    rows.forEach((row) => {`);
      lines.push(`      row.forEach((cell, i) => {`);
      lines.push(`      this.doc.text(cell, this.margin + i * columnWidth, y);`);
      lines.push(`      });`);
      lines.push(`      y += 18;`);
      lines.push(`    });`);
      lines.push('');
      lines.push(`    this.currentY = y;`);
    }
    lines.push(`  }`);
    lines.push('');

    // Add chart placeholder method
    lines.push(`  /**`);
    lines.push(`   * Add a chart placeholder (for integration with charting libraries)`);
    lines.push(`   */`);
    lines.push(`  addChart(title: string, data: { label: string; value: number }[]): void {`);
    if (usePdfKit) {
      lines.push(`    // This is a placeholder - integrate with chart libraries like chart-to-pdf or chart.js`);
      lines.push(`    this.doc.fontSize(12).font('Helvetica-Bold').text(title, { align: 'center' });`);
      lines.push(`    this.currentY += 20;`);
      lines.push(`    data.forEach((item) => {`);
      lines.push(`      this.doc.fontSize(10).font('Helvetica').text(\`\${item.label}: \${item.value}\`, { align: 'left' });`);
      lines.push(`      this.currentY += 15;`);
      lines.push(`    });`);
    } else {
      lines.push(`    // This is a placeholder - integrate with chart libraries or SVG to PDF`);
      lines.push(`    const pageWidth = this.doc.internal.pageSize.getWidth();`);
      lines.push(`    this.doc.setFontSize(12).setFont('helvetica', 'bold').text(title, pageWidth / 2, this.currentY, { align: 'center' });`);
      lines.push(`    this.currentY += 20;`);
      lines.push(`    data.forEach((item) => {`);
      lines.push(`      this.doc.setFontSize(10).setFont('helvetica', 'normal').text(\`\${item.label}: \${item.value}\`, this.margin, this.currentY);`);
      lines.push(`      this.currentY += 15;`);
      lines.push(`    });`);
    }
    lines.push(`  }`);
    lines.push('');

    // Add text method
    lines.push(`  /**`);
    lines.push(`   * Add text content to the PDF`);
    lines.push(`   */`);
    lines.push(`  addText(text: string, options?: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right' }): void {`);
    if (usePdfKit) {
      lines.push(`    const size = options?.size ?? 11;`);
      lines.push(`    const font = options?.bold ? 'Helvetica-Bold' : 'Helvetica';`);
      lines.push(`    this.doc.fontSize(size).font(font).text(text, { align: options?.align ?? 'left' });`);
      lines.push(`    this.currentY += size + 4;`);
    } else {
      lines.push(`    const size = options?.size ?? 11;`);
      lines.push(`    this.doc.setFontSize(size).setFont('helvetica', options?.bold ? 'bold' : 'normal');`);
      lines.push(`    const pageWidth = this.doc.internal.pageSize.getWidth();`);
      lines.push(`    const x = options?.align === 'center' ? pageWidth / 2 : options?.align === 'right' ? pageWidth - this.margin : this.margin;`);
      lines.push(`    this.doc.text(text, x, this.currentY, { align: options?.align ?? 'left' });`);
      lines.push(`    this.currentY += size + 4;`);
    }
    lines.push(`  }`);
    lines.push('');

    // Add page break method
    lines.push(`  /**`);
    lines.push(`   * Add a page break`);
    lines.push(`   */`);
    lines.push(`  addPageBreak(): void {`);
    lines.push(`    this.doc.addPage();`);
    lines.push(`    this.currentY = this.margin;`);
    lines.push(`  }`);
    lines.push('');

    // Add save method
    lines.push(`  /**`);
    lines.push(`   * Save the PDF to file`);
    lines.push(`   */`);
    lines.push(`  async save(): Promise<string> {`);
    lines.push(`    return new Promise((resolve, reject) => {`);
    if (usePdfKit) {
      lines.push(`      this.doc.pipe(fs.createWriteStream(this.filePath)).on('finish', () => resolve(this.filePath)).on('error', reject);`);
      lines.push(`      this.doc.end();`);
    } else {
      lines.push(`      try {`);
      lines.push(`        this.doc.save(this.filePath);`);
      lines.push(`        resolve(this.filePath);`);
      lines.push(`      } catch (error) {`);
      lines.push(`        reject(error);`);
      lines.push(`      }`);
    }
    lines.push(`    });`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');

    // Add usage example
    lines.push(`// Usage Example:`);
    lines.push(`/*`);
    lines.push(`const report = new ${className}PdfReport('report.pdf');`);
    lines.push(`report.addHeader('${className} Report', 'Generated on ' + new Date().toLocaleDateString());`);
    lines.push(`report.addText('Executive Summary', { bold: true, size: 14 });`);
    lines.push(`report.addText('This report provides a comprehensive overview of the data.');`);
    lines.push(`report.addPageBreak();`);
    lines.push(`report.addTable(['Column 1', 'Column 2'], [['Data 1', 'Data 2'], ['Data 3', 'Data 4']]);`);
    lines.push(`report.addChart('Sample Chart', [{ label: 'A', value: 10 }, { label: 'B', value: 20 }]);`);
    lines.push(`report.addFooter('Confidential');`);
    lines.push(`await report.save();`);
    lines.push(`*/`);

    return lines.join('\n');
  }

  /**
   * Write the template file to disk
   */
  private async writeTemplateFile(sourceUri: vscode.Uri, content: string, config: any): Promise<void> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    const outputDir = path.join(workspaceFolder.uri.fsPath, config?.outputDirectory ?? 'reports');

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create output directory', error);
    }

    const fileName = path.basename(sourceUri.path).replace(/\.(ts|js|tsx|jsx)$/, '-report.ts');
    const filePath = path.join(outputDir, fileName);

    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), encoder.encode(content));

    // Open the generated file
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage(`PDF report template generated: ${filePath}`);
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase())
      .replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
  }
}
