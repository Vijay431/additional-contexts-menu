import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

import * as vscode from 'vscode';

import {
  BreakingChange,
  OutdatedDependencyInfo,
  UpgradeSuggestion,
  DependencyUpgradeAdvisorResult,
} from '../types/extension';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Dependency Upgrade Advisor Service
 *
 * Analyzes package.json for outdated dependencies and provides upgrade recommendations.
 * Shows breaking changes and suggests compatible version combinations.
 */
export class DependencyUpgradeAdvisorService {
  private static instance: DependencyUpgradeAdvisorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): DependencyUpgradeAdvisorService {
    DependencyUpgradeAdvisorService.instance ??= new DependencyUpgradeAdvisorService();
    return DependencyUpgradeAdvisorService.instance;
  }

  /**
   * Analyze dependencies for available upgrades
   */
  public async analyzeUpgrades(config?: {
    checkDevDependencies?: boolean;
    checkPreReleases?: boolean;
    severityThreshold?: 'low' | 'moderate' | 'high' | 'critical';
    maxOutdated?: number;
    includePeerDependencies?: boolean;
  }): Promise<DependencyUpgradeAdvisorResult> {
    const startTime = Date.now();
    const checkDevDependencies = config?.checkDevDependencies ?? true;
    const checkPreReleases = config?.checkPreReleases ?? false;
    const severityThreshold = config?.severityThreshold ?? 'moderate';
    const maxOutdated = config?.maxOutdated ?? 50;
    const includePeerDependencies = config?.includePeerDependencies ?? false;

    try {
      // Find package.json
      const packageJsonPath = await this.findPackageJson();
      if (!packageJsonPath) {
        return this.createEmptyResult(startTime, 'No package.json found');
      }

      // Parse package.json
      const packageJson = await this.parsePackageJson(packageJsonPath);

      // Get outdated dependencies
      const outdated = await this.getOutdatedDependencies(
        packageJsonPath,
        checkDevDependencies,
        checkPreReleases,
        maxOutdated,
      );

      // Analyze for breaking changes
      const breakingChanges = await this.analyzeBreakingChanges(
        outdated,
        severityThreshold,
      );

      // Generate upgrade suggestions
      const suggestions = this.generateUpgradeSuggestions(
        outdated,
        breakingChanges,
        packageJson,
      );

      const analysisDuration = Date.now() - startTime;

      this.logger.info(`Dependency upgrade analysis completed in ${analysisDuration}ms`, {
        totalDependencies: outdated.length,
        breakingChanges: breakingChanges.length,
      });

      return {
        file: packageJsonPath,
        outdatedDependencies: outdated,
        breakingChanges,
        suggestions,
        totalOutdated: outdated.length,
        totalBreaking: breakingChanges.length,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error analyzing dependency upgrades', error);
      return this.createEmptyResult(
        startTime,
        'Failed to analyze dependencies',
        [String(error)],
      );
    }
  }

  /**
   * Find the package.json file in the workspace
   */
  private async findPackageJson(): Promise<string | null> {
    if (!vscode.workspace.workspaceFolders) {
      return null;
    }

    for (const folder of vscode.workspace.workspaceFolders) {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        return packageJsonPath;
      } catch {
        // package.json doesn't exist, continue to next folder
      }
    }

    return null;
  }

  /**
   * Parse package.json file
   */
  private async parsePackageJson(filePath: string): Promise<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get outdated dependencies using npm outdated
   */
  private async getOutdatedDependencies(
    packageJsonPath: string,
    includeDev: boolean,
    includePre: boolean,
    maxCount: number,
  ): Promise<OutdatedDependencyInfo[]> {
    const projectRoot = path.dirname(packageJsonPath);
    const outdated: OutdatedDependencyInfo[] = [];

    try {
      // Build npm outdated command
      let cmd = 'npm outdated --json';
      if (!includeDev) {
        cmd += ' --production';
      }
      if (includePre) {
        cmd += ' --long';
      }

      const { stdout } = await execAsync(cmd, {
        cwd: projectRoot,
        timeout: 30000,
      });

      // Parse output
      const outdatedData = JSON.parse(stdout || '{}');

      for (const [name, info] of Object.entries(outdatedData) as [
        string,
        any,
      ][]) {
        if (outdated.length >= maxCount) {
          break;
        }

        const current = info.current;
        const latest = info.latest || info.wanted;
        const wanted = info.wanted;

        // Determine dependency type
        let type: 'dependency' | 'devDependency' | 'peerDependency' =
          'dependency';

        // Try to determine type by parsing package.json
        try {
          const packageJson = await this.parsePackageJson(packageJsonPath);
          if (packageJson.devDependencies?.[name]) {
            type = 'devDependency';
          } else if (packageJson.peerDependencies?.[name]) {
            type = 'peerDependency';
          }
        } catch {
          // Use default type
        }

        outdated.push({
          name,
          version: current,
          latest,
          wanted,
          type,
          homepage: info.homepage,
          url: info.url,
        });
      }
    } catch (error: any) {
      // npm outdated returns exit code 1 when outdated packages exist
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout);
          for (const [name, info] of Object.entries(outdatedData) as [
            string,
            any,
          ][]) {
            if (outdated.length >= maxCount) {
              break;
            }

            const current = info.current;
            const latest = info.latest || info.wanted;

            let type: 'dependency' | 'devDependency' | 'peerDependency' =
              'dependency';

            try {
              const packageJson = await this.parsePackageJson(packageJsonPath);
              if (packageJson.devDependencies?.[name]) {
                type = 'devDependency';
              } else if (packageJson.peerDependencies?.[name]) {
                type = 'peerDependency';
              }
            } catch {
              // Use default type
            }

            outdated.push({
              name,
              version: current,
              latest,
              wanted: info.wanted,
              type,
            });
          }
        } catch {
          // Failed to parse, return empty array
        }
      }
    }

    return outdated;
  }

  /**
   * Analyze packages for potential breaking changes
   */
  private async analyzeBreakingChanges(
    outdated: OutdatedDependencyInfo[],
    severityThreshold: string,
  ): Promise<BreakingChange[]> {
    const breakingChanges: BreakingChange[] = [];

    for (const dep of outdated) {
      const change = await this.detectBreakingChanges(dep, severityThreshold);
      if (change) {
        breakingChanges.push(change);
      }
    }

    return breakingChanges;
  }

  /**
   * Detect breaking changes for a specific dependency
   */
  private async detectBreakingChanges(
    dep: OutdatedDependencyInfo,
    threshold: string,
  ): Promise<BreakingChange | null> {
    try {
      const current = this.parseVersion(dep.version);
      const latest = this.parseVersion(dep.latest);

      if (!current || !latest) {
        return null;
      }

      // Major version change indicates potential breaking changes
      if (latest.major > current.major) {
        const severity = this.assessSeverity(current, latest);

        if (this.shouldIncludeSeverity(severity, threshold)) {
          return {
            packageName: dep.name,
            currentVersion: dep.version,
            targetVersion: dep.latest,
            type: 'major',
            severity,
            description: `Major version upgrade from ${current.major}.${current.minor}.${current.patch} to ${latest.major}.${latest.minor}.${latest.patch} may introduce breaking changes.`,
            affectedFeatures: this.guessAffectedFeatures(dep.name, current, latest),
            migrationGuide: `https://www.npmjs.com/package/${dep.name}`,
          };
        }
      }

      // Minor version with potential changes
      if (latest.minor > current.minor && latest.major === current.major) {
        return {
          packageName: dep.name,
          currentVersion: dep.version,
          targetVersion: dep.latest,
          type: 'minor',
          severity: 'low',
          description: `Minor version upgrade from ${current.major}.${current.minor}.${current.patch} to ${latest.major}.${latest.minor}.${latest.patch}. New features and bug fixes.`,
          affectedFeatures: [],
          migrationGuide: `https://www.npmjs.com/package/${dep.name}`,
        };
      }
    } catch {
      // Failed to detect breaking changes
    }

    return null;
  }

  /**
   * Parse semver version
   */
  private parseVersion(versionString: string): {
    major: number;
    minor: number;
    patch: number;
  } | null {
    // Remove prefix/suffix (e.g., ^, ~, -beta.1)
    const cleaned = versionString.replace(/^[\^~]/, '').split(/[-+]/)[0];

    const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return null;
    }

    return {
      major: parseInt(match[1] ?? '0', 10),
      minor: parseInt(match[2] ?? '0', 10),
      patch: parseInt(match[3] ?? '0', 10),
    };
  }

  /**
   * Assess severity of a version change
   */
  private assessSeverity(
    current: { major: number; minor: number; patch: number },
    latest: { major: number; minor: number; patch: number },
  ): 'low' | 'moderate' | 'high' | 'critical' {
    const majorDiff = latest.major - current.major;

    if (majorDiff >= 2) {
      return 'critical';
    } else if (majorDiff === 1) {
      return 'high';
    } else if (latest.minor - current.minor > 5) {
      return 'moderate';
    }

    return 'low';
  }

  /**
   * Check if severity should be included based on threshold
   */
  private shouldIncludeSeverity(
    severity: string,
    threshold: string,
  ): boolean {
    const levels = ['low', 'moderate', 'high', 'critical'];
    const severityIndex = levels.indexOf(severity);
    const thresholdIndex = levels.indexOf(threshold);

    return severityIndex >= thresholdIndex;
  }

  /**
   * Guess affected features based on package name and versions
   */
  private guessAffectedFeatures(
    packageName: string,
    current: { major: number; minor: number; patch: number },
    latest: { major: number; minor: number; patch: number },
  ): string[] {
    const features: string[] = [];

    // Common patterns for known packages
    if (packageName === 'react') {
      if (latest.major > current.major) {
        features.push(
          'Component lifecycle methods',
          'Context API',
          'Concurrent features',
        );
      }
    } else if (packageName === 'typescript') {
      if (latest.major > current.major) {
        features.push('Type syntax', 'Compiler options', 'Decorators');
      }
    } else if (packageName === 'express') {
      if (latest.major > current.major) {
        features.push('Middleware API', 'Router configuration', 'Error handling');
      }
    }

    return features;
  }

  /**
   * Generate upgrade suggestions
   */
  private generateUpgradeSuggestions(
    outdated: OutdatedDependencyInfo[],
    breakingChanges: BreakingChange[],
    packageJson: any,
  ): UpgradeSuggestion[] {
    const suggestions: UpgradeSuggestion[] = [];

    if (outdated.length === 0) {
      suggestions.push({
        type: 'info',
        title: 'All dependencies are up to date',
        description: 'No updates are needed at this time.',
        commands: [],
      });
      return suggestions;
    }

    // Suggest upgrading non-breaking updates first
    const safeUpdates = outdated.filter(
      (dep) =>
        !breakingChanges.some((bc) => bc.packageName === dep.name && bc.type === 'major'),
    );

    if (safeUpdates.length > 0) {
      const packages = safeUpdates.slice(0, 10).map((d) => d.name);
      suggestions.push({
        type: 'safe',
        title: `Safe upgrades available (${safeUpdates.length} packages)`,
        description: `These packages can be upgraded without breaking changes: ${packages.join(', ')}${safeUpdates.length > 10 ? '...' : ''}`,
        commands: [`npm update ${packages.join(' ')}`],
      });
    }

    // Suggest major upgrades with caution
    const majorUpgrades = breakingChanges.filter((bc) => bc.type === 'major');

    if (majorUpgrades.length > 0) {
      const critical = majorUpgrades.filter((bc) => bc.severity === 'critical');
      const high = majorUpgrades.filter((bc) => bc.severity === 'high');

      if (critical.length > 0) {
        suggestions.push({
          type: 'warning',
          title: `Critical major upgrades required (${critical.length} packages)`,
          description: `These packages have critical version jumps and may require significant code changes: ${critical.map((bc) => bc.packageName).join(', ')}`,
          commands: critical.map(
            (bc) => `npm install ${bc.packageName}@${bc.targetVersion}`,
          ),
        });
      }

      if (high.length > 0) {
        suggestions.push({
          type: 'warning',
          title: `Major upgrades available (${high.length} packages)`,
          description: `These packages have major version updates: ${high.map((bc) => bc.packageName).join(', ')}`,
          commands: high.map(
            (bc) => `npm install ${bc.packageName}@${bc.targetVersion}`,
          ),
        });
      }
    }

    // Suggest testing after upgrades
    if (outdated.length > 0) {
      suggestions.push({
        type: 'info',
        title: 'Post-upgrade recommendations',
        description: 'After upgrading dependencies, run your test suite to ensure compatibility.',
        commands: ['npm test', 'npm run build', 'npm run lint'],
      });
    }

    return suggestions;
  }

  /**
   * Create an empty result
   */
  private createEmptyResult(
    startTime: number,
    message: string,
    errors: string[] = [],
  ): DependencyUpgradeAdvisorResult {
    return {
      file: '',
      outdatedDependencies: [],
      breakingChanges: [],
      suggestions: [
        {
          type: 'info',
          title: message,
          description: errors.length > 0 ? errors.join('\n') : '',
          commands: [],
        },
      ],
      totalOutdated: 0,
      totalBreaking: 0,
      analysisDuration: Date.now() - startTime,
    };
  }

  /**
   * Display results in output channel
   */
  public displayResults(result: DependencyUpgradeAdvisorResult): void {
    const outputChannel = vscode.window.createOutputChannel(
      'Dependency Upgrade Advisor',
    );
    outputChannel.clear();

    outputChannel.appendLine('Dependency Upgrade Advisor Report');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine(
      `Analysis completed in ${result.analysisDuration}ms`,
    );
    outputChannel.appendLine('');

    // Summary
    outputChannel.appendLine('Summary:');
    outputChannel.appendLine(
      `  Outdated Dependencies: ${result.totalOutdated}`,
    );
    outputChannel.appendLine(
      `  Potential Breaking Changes: ${result.totalBreaking}`,
    );
    outputChannel.appendLine('');

    // Outdated dependencies
    if (result.outdatedDependencies.length > 0) {
      outputChannel.appendLine('Outdated Dependencies:');
      outputChannel.appendLine('-'.repeat(60));

      for (const dep of result.outdatedDependencies) {
        outputChannel.appendLine(
          `  • ${dep.name} (${dep.version} → ${dep.latest})`,
        );
        if (dep.type !== 'dependency') {
          outputChannel.appendLine(`    Type: ${dep.type}`);
        }
      }
      outputChannel.appendLine('');
    }

    // Breaking changes
    if (result.breakingChanges.length > 0) {
      outputChannel.appendLine('Potential Breaking Changes:');
      outputChannel.appendLine('-'.repeat(60));

      for (const change of result.breakingChanges) {
        outputChannel.appendLine(
          `  • ${change.packageName} (${change.currentVersion} → ${change.targetVersion})`,
        );
        outputChannel.appendLine(`    Severity: ${change.severity.toUpperCase()}`);
        if (change.description) {
          outputChannel.appendLine(`    ${change.description}`);
        }
        if (change.affectedFeatures.length > 0) {
          outputChannel.appendLine(
            `    Affected: ${change.affectedFeatures.join(', ')}`,
          );
        }
        if (change.migrationGuide) {
          outputChannel.appendLine(`    Guide: ${change.migrationGuide}`);
        }
        outputChannel.appendLine('');
      }
    }

    // Suggestions
    if (result.suggestions.length > 0) {
      outputChannel.appendLine('Upgrade Suggestions:');
      outputChannel.appendLine('-'.repeat(60));

      for (const suggestion of result.suggestions) {
        outputChannel.appendLine(
          `  [${suggestion.type.toUpperCase()}] ${suggestion.title}`,
        );
        if (suggestion.description) {
          outputChannel.appendLine(`    ${suggestion.description}`);
        }
        if (suggestion.commands.length > 0) {
          outputChannel.appendLine('    Commands:');
          for (const cmd of suggestion.commands) {
            outputChannel.appendLine(`      ${cmd}`);
          }
        }
        outputChannel.appendLine('');
      }
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(60));

    outputChannel.show();
  }
}
