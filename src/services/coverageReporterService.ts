import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

import {
  CoverageData,
  CoverageLineInfo,
  CoverageReport,
  CoverageThreshold,
  CoverageTrend,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Coverage Reporter Service
 *
 * Integrates with coverage tools to display line-by-line coverage in editor.
 * Highlights uncovered lines, generates coverage reports, and tracks coverage trends.
 * Supports Istanbul, NYC, c8, Jest, Vitest, and other coverage tools that output standard formats.
 */
export class CoverageReporterService {
  private static instance: CoverageReporterService | undefined;
  private logger: Logger;
  private coverageDataCache: Map<string, CoverageData> = new Map();
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationTypeCovered: ReturnType<typeof vscode.window.createTextEditorDecorationType>;
  private decorationTypeUncovered: ReturnType<typeof vscode.window.createTextEditorDecorationType>;
  private decorationTypePartial: ReturnType<typeof vscode.window.createTextEditorDecorationType>;
  private outputChannel: vscode.OutputChannel;

  // Supported coverage file paths
  private readonly coveragePaths = [
    'coverage/coverage-final.json',
    'coverage/coverage.json',
    'coverage/lcov.info',
    '.nyc_output/out.json',
    'coverage/lcov.info',
  ];

  private constructor() {
    this.logger = Logger.getInstance();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('coverageReporter');

    // Create decoration types for coverage visualization
    this.decorationTypeCovered = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(64, 176, 103, 0.2)', // Green for covered
      isWholeLine: true,
      overviewRulerColor: 'rgba(64, 176, 103, 0.8)',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });

    this.decorationTypeUncovered = vscode.TextEditorDecorationType({
      backgroundColor: 'rgba(226, 71, 71, 0.2)', // Red for uncovered
      isWholeLine: true,
      overviewRulerColor: 'rgba(226, 71, 71, 0.8)',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });

    this.decorationTypePartial = vscode.TextEditorDecorationType({
      backgroundColor: 'rgba(234, 172, 53, 0.2)', // Yellow for partially covered
      isWholeLine: true,
      overviewRulerColor: 'rgba(234, 172, 53, 0.8)',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });

    this.outputChannel = vscode.window.createOutputChannel('Coverage Reporter');
  }

  public static getInstance(): CoverageReporterService {
    CoverageReporterService.instance ??= new CoverageReporterService();
    return CoverageReporterService.instance;
  }

  /**
   * Main entry point to generate coverage report
   */
  public async generateCoverageReport(config?: {
    thresholds?: CoverageThreshold;
    includeUncoveredLines?: boolean;
    generateTrend?: boolean;
  }): Promise<CoverageReport | null> {
    const startTime = Date.now();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return null;
    }

    try {
      // Find and parse coverage data
      const coverageData = await this.findAndParseCoverageData(workspaceFolder.uri.fsPath);

      if (!coverageData) {
        vscode.window.showInformationMessage(
          'No coverage data found. Run tests with coverage first.',
        );
        return null;
      }

      // Calculate overall coverage metrics
      const totalLines = coverageData.lines.total;
      const coveredLines = coverageData.lines.covered;
      const totalBranches = coverageData.branches.total;
      const coveredBranches = coverageData.branches.covered;
      const totalFunctions = coverageData.functions.total;
      const coveredFunctions = coverageData.functions.covered;
      const totalStatements = coverageData.statements.covered;
      const coveredStatements = coverageData.statements.covered;

      const lineCoverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
      const branchCoverage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;
      const functionCoverage = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
      const statementCoverage =
        totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;

      // Determine overall status based on thresholds
      const thresholds = config?.thresholds || this.getDefaultThresholds();
      const status = this.determineOverallStatus(
        lineCoverage,
        branchCoverage,
        functionCoverage,
        statementCoverage,
        thresholds,
      );

      // Collect uncovered lines if requested
      const uncoveredLines: CoverageLineInfo[] = [];
      if (config?.includeUncoveredLines) {
        for (const [file, fileData] of coverageData.fileCoverage) {
          for (const [lineNum, count] of Object.entries(fileData.lineCounts)) {
            if (count === 0) {
              uncoveredLines.push({
                file,
                line: Number.parseInt(lineNum, 10),
                type: 'line',
              });
            }
          }
        }
      }

      // Get trend data if requested
      let trend: CoverageTrend | undefined;
      if (config?.generateTrend) {
        trend = await this.loadTrendData(workspaceFolder.uri.fsPath);
      }

      const reportBase = {
        summary: {
          totalLines,
          coveredLines,
          totalBranches,
          coveredBranches,
          totalFunctions,
          coveredFunctions,
          totalStatements,
          coveredStatements,
        },
        metrics: {
          lineCoverage: Math.round(lineCoverage * 100) / 100,
          branchCoverage: Math.round(branchCoverage * 100) / 100,
          functionCoverage: Math.round(functionCoverage * 100) / 100,
          statementCoverage: Math.round(statementCoverage * 100) / 100,
        },
        status,
        thresholds,
        uncoveredLines: uncoveredLines.slice(0, 1000), // Limit to prevent memory issues
        fileCount: coverageData.fileCoverage.size,
        analysisDuration: Date.now() - startTime,
      };

      const report: CoverageReport = trend ? { ...reportBase, trend } : reportBase;

      this.logger.info('Coverage report generated', {
        lineCoverage: report.metrics.lineCoverage,
        status,
        fileCount: report.fileCount,
      });

      return report;
    } catch (error) {
      this.logger.error('Error generating coverage report', error);
      vscode.window.showErrorMessage(
        `Failed to generate coverage report: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Display coverage report in output channel
   */
  public displayCoverageReport(report: CoverageReport): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('Coverage Report');
    this.outputChannel.appendLine('═'.repeat(60));
    this.outputChannel.appendLine('');

    // Status
    const statusEmoji =
      report.status === 'excellent'
        ? '🎉'
        : report.status === 'good'
          ? '👍'
          : report.status === 'warning'
            ? '⚠️'
            : '🔴';
    this.outputChannel.appendLine(`Overall Status: ${statusEmoji} ${report.status.toUpperCase()}`);
    this.outputChannel.appendLine('');

    // Metrics
    this.outputChannel.appendLine('Coverage Metrics:');
    this.outputChannel.appendLine(
      `  Line Coverage:      ${report.metrics.lineCoverage.toFixed(2)}%`,
    );
    this.outputChannel.appendLine(
      `  Branch Coverage:    ${report.metrics.branchCoverage.toFixed(2)}%`,
    );
    this.outputChannel.appendLine(
      `  Function Coverage:  ${report.metrics.functionCoverage.toFixed(2)}%`,
    );
    this.outputChannel.appendLine(
      `  Statement Coverage: ${report.metrics.statementCoverage.toFixed(2)}%`,
    );
    this.outputChannel.appendLine('');

    // Thresholds
    this.outputChannel.appendLine('Thresholds:');
    this.outputChannel.appendLine(`  Line:      ${report.thresholds.line}%`);
    this.outputChannel.appendLine(`  Branch:    ${report.thresholds.branch}%`);
    this.outputChannel.appendLine(`  Function:  ${report.thresholds.function}%`);
    this.outputChannel.appendLine(`  Statement: ${report.thresholds.statement}%`);
    this.outputChannel.appendLine('');

    // Summary
    this.outputChannel.appendLine('Summary:');
    this.outputChannel.appendLine(`  Files Analyzed: ${report.fileCount}`);
    this.outputChannel.appendLine(`  Total Lines: ${report.summary.totalLines}`);
    this.outputChannel.appendLine(`  Covered Lines: ${report.summary.coveredLines}`);
    this.outputChannel.appendLine(
      `  Uncovered Lines: ${report.summary.totalLines - report.summary.coveredLines}`,
    );
    this.outputChannel.appendLine('');

    // Trend
    if (report.trend) {
      this.outputChannel.appendLine('Coverage Trend:');
      this.outputChannel.appendLine(`  Previous: ${report.trend.previousCoverage.toFixed(2)}%`);
      this.outputChannel.appendLine(`  Current: ${report.metrics.lineCoverage.toFixed(2)}%`);
      const change = report.metrics.lineCoverage - report.trend.previousCoverage;
      const changeEmoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
      this.outputChannel.appendLine(
        `  Change: ${changeEmoji} ${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
      );
      this.outputChannel.appendLine('');
    }

    // Uncovered lines
    if (report.uncoveredLines.length > 0) {
      this.outputChannel.appendLine(
        `Uncovered Lines (showing first ${Math.min(report.uncoveredLines.length, 100)}):`,
      );
      for (const line of report.uncoveredLines.slice(0, 100)) {
        this.outputChannel.appendLine(`  ${line.file}:${line.line}`);
      }
      if (report.uncoveredLines.length > 100) {
        this.outputChannel.appendLine(`  ... and ${report.uncoveredLines.length - 100} more`);
      }
      this.outputChannel.appendLine('');
    }

    this.outputChannel.appendLine('═'.repeat(60));
    this.outputChannel.appendLine(`Report generated in ${report.analysisDuration}ms`);
    this.outputChannel.show();
  }

  /**
   * Highlight coverage in the current editor
   */
  public async highlightCoverageInEditor(document: vscode.TextDocument): Promise<void> {
    const coverageData = await this.getCoverageForFile(document.fileName);

    if (!coverageData) {
      this.clearEditorHighlights();
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
      return;
    }

    const coveredRanges: vscode.Range[] = [];
    const uncoveredRanges: vscode.Range[] = [];
    const partialRanges: vscode.Range[] = [];

    for (let i = 0; i < document.lineCount; i++) {
      const lineNum = i + 1;
      const count = coverageData.lineCounts[lineNum];

      if (count === undefined) {
        continue; // Not executable code
      }

      const range = new vscode.Range(i, 0, i, document.lineAt(i).text.length);

      if (count > 0) {
        coveredRanges.push(range);
      } else {
        uncoveredRanges.push(range);
      }
    }

    editor.setDecorations(this.decorationTypeCovered, coveredRanges);
    editor.setDecorations(this.decorationTypeUncovered, uncoveredRanges);
    editor.setDecorations(this.decorationTypePartial, partialRanges);
  }

  /**
   * Clear all coverage highlights
   */
  public clearEditorHighlights(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(this.decorationTypeCovered, []);
      editor.setDecorations(this.decorationTypeUncovered, []);
      editor.setDecorations(this.decorationTypePartial, []);
    }
  }

  /**
   * Find and parse coverage data from workspace
   */
  private async findAndParseCoverageData(workspacePath: string): Promise<CoverageData | null> {
    // Try each possible coverage path
    for (const relativePath of this.coveragePaths) {
      const fullPath = path.join(workspacePath, relativePath);

      try {
        await fs.access(fullPath);

        if (relativePath.endsWith('.json')) {
          return await this.parseJsonCoverage(fullPath);
        } else if (relativePath.endsWith('lcov.info') || relativePath.endsWith('.info')) {
          return await this.parseLcovCoverage(fullPath);
        }
      } catch {
        // File doesn't exist or can't be accessed, try next
        continue;
      }
    }

    // Also check for common npm test outputs
    const testOutputPath = path.join(workspacePath, 'test', 'coverage', 'coverage-final.json');
    try {
      await fs.access(testOutputPath);
      return await this.parseJsonCoverage(testOutputPath);
    } catch {
      // Not found
    }

    return null;
  }

  /**
   * Parse JSON coverage format (Istanbul/NYC/c8)
   */
  private async parseJsonCoverage(filePath: string): Promise<CoverageData | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const coverageJson = JSON.parse(content);

      const fileCoverage = new Map<
        string,
        {
          lineCounts: Record<number, number>;
          branchCoverage: Record<number, number>;
          functionCoverage: Record<number, number>;
        }
      >();

      let totalLines = 0;
      let coveredLines = 0;
      let totalBranches = 0;
      let coveredBranches = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalStatements = 0;
      let coveredStatements = 0;

      for (const [filePath, fileData] of Object.entries(coverageJson)) {
        const data = fileData as {
          l?: Record<string, number>;
          b?: Record<string, number[]>;
          f?: Record<string, number>;
          s?: Record<string, number>;
        };

        const lineCounts: Record<number, number> = {};
        const branchCoverage: Record<number, number> = {};
        const functionCoverage: Record<number, number> = {};

        // Process line coverage
        if (data.l) {
          for (const [lineNum, count] of Object.entries(data.l)) {
            const line = Number.parseInt(lineNum, 10);
            lineCounts[line] = count;
            totalLines++;
            if (count > 0) {
              coveredLines++;
            }
          }
        }

        // Process branch coverage
        if (data.b) {
          for (const [branchId, branches] of Object.entries(data.b)) {
            const branchNum = Number.parseInt(branchId, 10);
            for (const count of branches) {
              totalBranches++;
              if (count > 0) {
                coveredBranches++;
              }
            }
            branchCoverage[branchNum] = branches.filter((c) => c > 0).length / branches.length;
          }
        }

        // Process function coverage
        if (data.f) {
          for (const [funcId, count] of Object.entries(data.f)) {
            const funcNum = Number.parseInt(funcId, 10);
            totalFunctions++;
            if (count > 0) {
              coveredFunctions++;
            }
            functionCoverage[funcNum] = count;
          }
        }

        // Process statement coverage
        if (data.s) {
          for (const count of Object.values(data.s)) {
            totalStatements++;
            if (count > 0) {
              coveredStatements++;
            }
          }
        }

        fileCoverage.set(filePath, {
          lineCounts,
          branchCoverage,
          functionCoverage,
        });
      }

      return {
        fileCoverage,
        lines: { total: totalLines, covered: coveredLines },
        branches: { total: totalBranches, covered: coveredBranches },
        functions: { total: totalFunctions, covered: coveredFunctions },
        statements: { total: totalStatements, covered: coveredStatements },
      };
    } catch (error) {
      this.logger.error('Error parsing JSON coverage', error);
      return null;
    }
  }

  /**
   * Parse LCOV format
   */
  private async parseLcovCoverage(filePath: string): Promise<CoverageData | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      const fileCoverage = new Map<
        string,
        {
          lineCounts: Record<number, number>;
          branchCoverage: Record<number, number>;
          functionCoverage: Record<number, number>;
        }
      >();

      let currentFile: string | null = null;
      let currentLineCounts: Record<number, number> = {};
      let totalLines = 0;
      let coveredLines = 0;

      for (const line of lines) {
        if (line.startsWith('SF:')) {
          // Save previous file data
          if (currentFile && Object.keys(currentLineCounts).length > 0) {
            fileCoverage.set(currentFile, {
              lineCounts: currentLineCounts,
              branchCoverage: {},
              functionCoverage: {},
            });
          }

          // Start new file
          currentFile = line.substring(3);
          currentLineCounts = {};
        } else if (line.startsWith('DA:')) {
          // Data line: DA:<line_number>,<execution_count>
          const parts = line.substring(3).split(',');
          if (parts.length === 2) {
            const lineNum = Number.parseInt(parts[0] ?? '0', 10);
            const count = Number.parseInt(parts[1] ?? '0', 10);
            currentLineCounts[lineNum] = count;
            totalLines++;
            if (count > 0) {
              coveredLines++;
            }
          }
        } else if (line === 'end_of_record') {
          // Save file data
          if (currentFile && Object.keys(currentLineCounts).length > 0) {
            fileCoverage.set(currentFile, {
              lineCounts: currentLineCounts,
              branchCoverage: {},
              functionCoverage: {},
            });
          }
          currentFile = null;
          currentLineCounts = {};
        }
      }

      return {
        fileCoverage,
        lines: { total: totalLines, covered: coveredLines },
        branches: { total: 0, covered: 0 },
        functions: { total: 0, covered: 0 },
        statements: { total: totalLines, covered: coveredLines },
      };
    } catch (error) {
      this.logger.error('Error parsing LCOV coverage', error);
      return null;
    }
  }

  /**
   * Get coverage data for a specific file
   */
  private async getCoverageForFile(filePath: string): Promise<{
    lineCounts: Record<number, number>;
    branchCoverage: Record<number, number>;
    functionCoverage: Record<number, number>;
  } | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return null;
    }

    // Check cache first
    for (const [basePath, data] of this.coverageDataCache.entries()) {
      if (filePath.startsWith(basePath) || data.fileCoverage.has(filePath)) {
        return data.fileCoverage.get(filePath) || null;
      }
    }

    // Load and cache coverage data
    const coverageData = await this.findAndParseCoverageData(workspaceFolder.uri.fsPath);
    if (coverageData) {
      this.coverageDataCache.set(workspaceFolder.uri.fsPath, coverageData);
      return coverageData.fileCoverage.get(filePath) || null;
    }

    return null;
  }

  /**
   * Determine overall status based on coverage and thresholds
   */
  private determineOverallStatus(
    lineCoverage: number,
    branchCoverage: number,
    functionCoverage: number,
    statementCoverage: number,
    thresholds: CoverageThreshold,
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    const minCoverage = Math.min(
      (lineCoverage / thresholds.line) * 100,
      (branchCoverage / thresholds.branch) * 100,
      (functionCoverage / thresholds.function) * 100,
      (statementCoverage / thresholds.statement) * 100,
    );

    if (minCoverage >= 100) return 'excellent';
    if (minCoverage >= 90) return 'good';
    if (minCoverage >= 75) return 'warning';
    return 'critical';
  }

  /**
   * Get default thresholds
   */
  private getDefaultThresholds(): CoverageThreshold {
    return {
      line: 80,
      branch: 75,
      function: 80,
      statement: 80,
    };
  }

  /**
   * Load trend data from previous runs
   */
  private async loadTrendData(workspacePath: string): Promise<CoverageTrend | undefined> {
    const trendFilePath = path.join(workspacePath, '.vscode', 'coverage-trend.json');

    try {
      const content = await fs.readFile(trendFilePath, 'utf-8');
      const trendData = JSON.parse(content) as CoverageTrend;

      // Update trend with current data
      const updatedTrend: CoverageTrend = {
        previousCoverage: trendData.previousCoverage,
        timestamp: Date.now(),
      };

      // Save updated trend
      await fs.writeFile(trendFilePath, JSON.stringify(updatedTrend, null, 2));

      return updatedTrend;
    } catch {
      // No trend data exists yet
      return undefined;
    }
  }

  /**
   * Save current coverage as trend data
   */
  public async saveTrendData(coverage: number): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const trendDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
    await fs.mkdir(trendDir, { recursive: true });

    const trendFilePath = path.join(trendDir, 'coverage-trend.json');
    const trendData: CoverageTrend = {
      previousCoverage: coverage,
      timestamp: Date.now(),
    };

    await fs.writeFile(trendFilePath, JSON.stringify(trendData, null, 2));
  }

  /**
   * Toggle coverage highlighting
   */
  public async toggleCoverageHighlighting(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    await this.highlightCoverageInEditor(editor.document);
  }

  /**
   * Clear all diagnostics
   */
  public clearDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.decorationTypeCovered.dispose();
    this.decorationTypeUncovered.dispose();
    this.decorationTypePartial.dispose();
    this.outputChannel.dispose();
    this.clearEditorHighlights();
  }
}
