import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type {
  FsPathResolverGenerationResult,
  FsPathResolverOptions,
  PathNormalizationResult,
  PathResolutionResult,
  PathValidationResult,
  WorkspaceRelativePathResult,
} from '../types/extension';
import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

/**
 * FsPathResolverService - Generates cross-platform file path resolution utilities
 *
 * This service provides utilities for:
 * - Relative/absolute path conversion
 * - Path normalization
 * - Workspace-relative path helpers
 * - Path validation
 */
export class FsPathResolverService {
  private static instance: FsPathResolverService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): FsPathResolverService {
    FsPathResolverService.instance ??= new FsPathResolverService();
    return FsPathResolverService.instance;
  }

  /**
   * Resolve a path to an absolute path with validation
   */
  public async resolvePath(inputPath: string, context?: string): Promise<PathResolutionResult> {
    this.logger.debug('Resolving path', { inputPath, context });

    try {
      // Validate input path for safety
      if (!isSafeFilePath(inputPath)) {
        this.logger.warn('Unsafe file path detected', { inputPath });
        return {
          success: false,
          error: 'Path contains unsafe characters or patterns',
          confidence: 0,
          exists: false,
        };
      }

      // Resolve the path relative to context if provided
      let resolvedPath = inputPath;
      if (context && !path.isAbsolute(inputPath)) {
        resolvedPath = path.resolve(context, inputPath);
      } else {
        resolvedPath = path.resolve(inputPath);
      }

      // Check if path exists
      let exists = false;
      let isDirectory = false;
      try {
        const stats = await fs.stat(resolvedPath);
        exists = true;
        isDirectory = stats.isDirectory();
      } catch {
        // Path doesn't exist - this is okay, we're just resolving
        exists = false;
      }

      this.logger.debug('Path resolved successfully', { resolvedPath, exists, isDirectory });

      return {
        success: true,
        resolvedPath,
        confidence: exists ? 1 : 0.8,
        exists,
        isDirectory,
      };
    } catch (error) {
      this.logger.error('Error resolving path', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        exists: false,
      };
    }
  }

  /**
   * Validate a path and provide suggestions if invalid
   */
  public async validatePath(inputPath: string): Promise<PathValidationResult> {
    this.logger.debug('Validating path', { inputPath });

    try {
      // Check for unsafe patterns
      if (!isSafeFilePath(inputPath)) {
        return {
          isValid: false,
          error: 'Path contains unsafe characters or patterns',
          suggestions: ['Remove parent directory references (..)', 'Use absolute path instead'],
          confidence: 0,
        };
      }

      // Normalize the path
      const normalized = path.normalize(inputPath);

      // Check if path exists
      try {
        await fs.access(normalized);
        return {
          isValid: true,
          normalizedPath: normalized,
          confidence: 1,
        };
      } catch {
        // Path doesn't exist - provide suggestions
        const suggestions: string[] = [];

        // Try to find similar paths
        const searchDir = path.isAbsolute(normalized)
          ? path.dirname(normalized)
          : path.resolve(process.cwd(), path.dirname(normalized));

        try {
          const files = await fs.readdir(searchDir);
          const targetName = path.basename(normalized);
          const similar = files.filter((f) =>
            f.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(f.toLowerCase())
          );

          if (similar.length > 0) {
            suggestions.push(
              ...similar.slice(0, 5).map((s) => `Did you mean: ${path.join(path.dirname(normalized), s)}?`)
            );
          }
        } catch {
          // Can't search directory
        }

        return {
          isValid: false,
          normalizedPath: normalized,
          error: 'Path does not exist',
          suggestions: suggestions.length > 0 ? suggestions : ['Create the path or check for typos'],
          confidence: 0.5,
        };
      }
    } catch (error) {
      this.logger.error('Error validating path', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
      };
    }
  }

  /**
   * Normalize a path for cross-platform compatibility
   */
  public async normalizePath(inputPath: string): Promise<PathNormalizationResult> {
    this.logger.debug('Normalizing path', { inputPath });

    try {
      const normalized = path.normalize(inputPath);
      const isAbsolute = path.isAbsolute(normalized);
      const isCrossPlatform = !normalized.includes('\\') || !normalized.includes('/');

      // Detect if path was converted
      const originalSeparators = (inputPath.match(/[\/\\]/g) || []).join('');
      const converted = originalSeparators && normalized.includes(path.sep) &&
        !originalSeparators.includes(path.sep);

      this.logger.debug('Path normalized', {
        normalized,
        isAbsolute,
        isCrossPlatform,
        converted,
      });

      return {
        originalPath: inputPath,
        normalizedPath: normalized,
        separator: path.sep,
        isAbsolute,
        isCrossPlatform,
      };
    } catch (error) {
      this.logger.error('Error normalizing path', error);
      throw error;
    }
  }

  /**
   * Convert a path to be relative to the workspace root
   */
  public async getWorkspaceRelativePath(inputPath: string): Promise<WorkspaceRelativePathResult> {
    this.logger.debug('Getting workspace-relative path', { inputPath });

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        this.logger.warn('No workspace folder found');
        return {
          relativePath: inputPath,
          absolutePath: inputPath,
          workspaceRoot: '',
          isValid: false,
        };
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;
      const absolutePath = path.isAbsolute(inputPath)
        ? inputPath
        : path.resolve(workspaceRoot, inputPath);

      const relativePath = path.relative(workspaceRoot, absolutePath);

      this.logger.debug('Workspace-relative path calculated', {
        relativePath,
        absolutePath,
        workspaceRoot,
      });

      return {
        relativePath,
        absolutePath,
        workspaceRoot,
        isValid: true,
      };
    } catch (error) {
      this.logger.error('Error getting workspace-relative path', error);
      return {
        relativePath: inputPath,
        absolutePath: inputPath,
        workspaceRoot: '',
        isValid: false,
      };
    }
  }

  /**
   * Convert a relative path to an absolute path
   */
  public async resolveAbsolutePath(inputPath: string): Promise<string> {
    this.logger.debug('Resolving absolute path', { inputPath });

    if (path.isAbsolute(inputPath)) {
      return path.normalize(inputPath);
    }

    // Check if we have an active workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return path.resolve(workspaceFolder.uri.fsPath, inputPath);
    }

    // Fall back to current working directory
    return path.resolve(process.cwd(), inputPath);
  }

  /**
   * Convert an absolute path to a relative path
   */
  public async resolveRelativePath(fromPath: string, toPath: string): Promise<string> {
    this.logger.debug('Resolving relative path', { fromPath, toPath });

    try {
      const relative = path.relative(fromPath, toPath);
      this.logger.debug('Relative path resolved', { relative });
      return relative;
    } catch (error) {
      this.logger.error('Error resolving relative path', error);
      throw error;
    }
  }

  /**
   * Generate cross-platform path resolution utilities code
   */
  public async generateUtilities(
    options: FsPathResolverOptions
  ): Promise<FsPathResolverGenerationResult> {
    this.logger.info('Generating fs-path-resolver utilities', options);

    const { includeTypeScript, includeJSDoc, utilityTypes } = options;

    const utilitiesCodeParts: string[] = [];
    const exportedFunctions: string[] = [];

    // Add imports
    const imports: string[] = [];
    if (includeTypeScript) {
      imports.push("import * as path from 'path';");
      imports.push("import * as fs from 'fs/promises';");
    } else {
      imports.push("const path = require('path');");
      imports.push("const fs = require('fs/promises');");
    }
    utilitiesCodeParts.push(imports.join('\n'));
    utilitiesCodeParts.push('');

    // Generate requested utilities
    for (const utilityType of utilityTypes) {
      switch (utilityType) {
        case 'path-resolution':
          utilitiesCodeParts.push(this._generatePathResolutionUtility(includeTypeScript, includeJSDoc));
          exportedFunctions.push('resolvePath', 'resolveAbsolutePath', 'resolveRelativePath');
          break;
        case 'path-validation':
          utilitiesCodeParts.push(this._generatePathValidationUtility(includeTypeScript, includeJSDoc));
          exportedFunctions.push('validatePath', 'pathExists', 'isDirectory');
          break;
        case 'path-normalization':
          utilitiesCodeParts.push(this._generatePathNormalizationUtility(includeTypeScript, includeJSDoc));
          exportedFunctions.push('normalizePath', 'toPosix', 'toWindows');
          break;
        case 'workspace-relative':
          utilitiesCodeParts.push(this._generateWorkspaceRelativeUtility(includeTypeScript, includeJSDoc));
          exportedFunctions.push('getWorkspaceRelativePath', 'getWorkspaceRoot');
          break;
      }
      utilitiesCodeParts.push('');
    }

    // Generate TypeScript types if needed
    let typesCode: string | undefined;
    if (includeTypeScript) {
      typesCode = this._generateTypeDefinitions(utilityTypes);
    }

    // Generate usage example
    const usageExample = this._generateUsageExample(includeTypeScript, utilityTypes);

    const utilitiesCode = utilitiesCodeParts.join('\n');

    this.logger.info('Utilities generated successfully', {
      exportedFunctions: exportedFunctions.length,
      codeLength: utilitiesCode.length,
    });

    const result: FsPathResolverGenerationResult = {
      utilitiesCode,
      usageExample,
      exportedFunctions,
      generatedAt: Date.now(),
    };

    if (typesCode !== undefined) {
      result.typesCode = typesCode;
    }

    return result;
  }

  private _generatePathResolutionUtility(includeTypeScript: boolean, includeJSDoc: boolean): string {
    const typeAnnotation = includeTypeScript ? ': string' : '';
    const asyncKeyword = 'async ';

    return `
${includeJSDoc ? '/**\n * Resolve a path to an absolute path\n * @param inputPath - The path to resolve\n * @returns The resolved absolute path\n */' : ''}
${asyncKeyword}function resolvePath${typeAnnotation}(inputPath${typeAnnotation})${typeAnnotation} {
  return path.resolve(inputPath);
}

${includeJSDoc ? '/**\n * Convert a relative path to an absolute path\n * @param inputPath - The path to convert\n * @param basePath - The base path (defaults to process.cwd())\n * @returns The absolute path\n */' : ''}
${asyncKeyword}function resolveAbsolutePath${typeAnnotation}(inputPath${typeAnnotation}, basePath${typeAnnotation} = process.cwd())${typeAnnotation} {
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  return path.resolve(basePath, inputPath);
}

${includeJSDoc ? '/**\n * Get the relative path from one path to another\n * @param fromPath - The source path\n * @param toPath - The target path\n * @returns The relative path\n */' : ''}
${asyncKeyword}function resolveRelativePath${typeAnnotation}(fromPath${typeAnnotation}, toPath${typeAnnotation})${typeAnnotation} {
  return path.relative(fromPath, toPath);
}`;
  }

  private _generatePathValidationUtility(includeTypeScript: boolean, includeJSDoc: boolean): string {
    const typeAnnotation = includeTypeScript ? ': string' : '';
    const boolType = includeTypeScript ? ': Promise<boolean>' : '';
    const asyncKeyword = 'async ';

    return `
${includeJSDoc ? '/**\n * Validate that a path exists\n * @param inputPath - The path to validate\n * @returns True if the path exists\n */' : ''}
${asyncKeyword}function validatePath${typeAnnotation}(inputPath${typeAnnotation})${boolType} {
  try {
    await fs.access(inputPath);
    return true;
  } catch {
    return false;
  }
}

${includeJSDoc ? '/**\n * Check if a path exists\n * @param inputPath - The path to check\n * @returns True if the path exists\n */' : ''}
${asyncKeyword}function pathExists${typeAnnotation}(inputPath${typeAnnotation})${boolType} {
  return validatePath(inputPath);
}

${includeJSDoc ? '/**\n * Check if a path is a directory\n * @param inputPath - The path to check\n * @returns True if the path is a directory\n */' : ''}
${asyncKeyword}function isDirectory${typeAnnotation}(inputPath${typeAnnotation})${boolType} {
  try {
    const stats = await fs.stat(inputPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}`;
  }

  private _generatePathNormalizationUtility(includeTypeScript: boolean, includeJSDoc: boolean): string {
    const typeAnnotation = includeTypeScript ? ': string' : '';

    return `
${includeJSDoc ? '/**\n * Normalize a path for cross-platform compatibility\n * @param inputPath - The path to normalize\n * @returns The normalized path\n */' : ''}
function normalizePath${typeAnnotation}(inputPath${typeAnnotation})${typeAnnotation} {
  return path.normalize(inputPath);
}

${includeJSDoc ? '/**\n * Convert a path to use POSIX separators (forward slashes)\n * @param inputPath - The path to convert\n * @returns The path with POSIX separators\n */' : ''}
function toPosix${typeAnnotation}(inputPath${typeAnnotation})${typeAnnotation} {
  const isExtendedLengthPath = inputPath.startsWith('\\\\\\\\?\\\\');
  if (isExtendedLengthPath) {
    return inputPath;
  }
  return inputPath.split('\\\\').join('/');
}

${includeJSDoc ? '/**\n * Convert a path to use Windows separators (backslashes)\n * @param inputPath - The path to convert\n * @returns The path with Windows separators\n */' : ''}
function toWindows${typeAnnotation}(inputPath${typeAnnotation})${typeAnnotation} {
  const isExtendedLengthPath = inputPath.startsWith('\\\\\\\\?\\\\');
  if (isExtendedLengthPath) {
    return inputPath;
  }
  return inputPath.split('/').join('\\\\\\\\');
}`;
  }

  private _generateWorkspaceRelativeUtility(includeTypeScript: boolean, includeJSDoc: boolean): string {
    const typeAnnotation = includeTypeScript ? ': string' : '';

    return `
${includeJSDoc ? '/**\n * Get the workspace root path\n * @returns The workspace root directory path\n */' : ''}
function getWorkspaceRoot${typeAnnotation}()${typeAnnotation} {
  // In VS Code extensions, use vscode.workspace.workspaceFolders\n  // For Node.js scripts, this might need to be passed in\n  const workspaceFolders = (typeof vscode !== 'undefined' && vscode.workspace?.workspaceFolders) || process.cwd();\n  return workspaceFolders[0]?.uri.fsPath || workspaceFolders;
}

${includeJSDoc ? '/**\n * Get a path relative to the workspace root\n * @param inputPath - The path to convert\n * @returns The relative path from workspace root\n */' : ''}
function getWorkspaceRelativePath${typeAnnotation}(inputPath${typeAnnotation})${typeAnnotation} {
  const workspaceRoot = getWorkspaceRoot();
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.resolve(workspaceRoot, inputPath);
  return path.relative(workspaceRoot, absolutePath);
}`;
  }

  private _generateTypeDefinitions(utilityTypes: readonly string[]): string {
    const interfaces: string[] = [];

    if (utilityTypes.includes('path-resolution')) {
      interfaces.push(`
export interface PathResolutionOptions {
  inputPath: string;
  basePath?: string;
}`);
    }

    if (utilityTypes.includes('path-validation')) {
      interfaces.push(`
export interface PathValidationOptions {
  inputPath: string;
  checkExists?: boolean;
}`);
    }

    if (utilityTypes.includes('path-normalization')) {
      interfaces.push(`
export interface PathNormalizationOptions {
  inputPath: string;
  targetPlatform?: 'posix' | 'win32' | 'native';
}`);
    }

    if (utilityTypes.includes('workspace-relative')) {
      interfaces.push(`
export interface WorkspaceRelativeOptions {
  inputPath: string;
  workspaceRoot?: string;
}`);
    }

    return `
// Type Definitions for FS Path Resolver Utilities
${interfaces.join('\n')}
`;
  }

  private _generateUsageExample(includeTypeScript: boolean, utilityTypes: readonly string[]): string {
    const constKeyword = includeTypeScript ? 'const' : 'const';
    const exampleParts: string[] = [];

    exampleParts.push('// Usage Examples for FS Path Resolver Utilities');
    exampleParts.push('');

    if (utilityTypes.includes('path-resolution')) {
      exampleParts.push('// Path Resolution');
      exampleParts.push(`${constKeyword} absolutePath = resolvePath('./src/utils');`);
      exampleParts.push(`${constKeyword} fullPath = resolveAbsolutePath('../config', process.cwd());`);
      exampleParts.push(`${constKeyword} relativePath = resolveRelativePath('/home/user/project', '/home/user/project/src/file.ts');`);
      exampleParts.push('');
    }

    if (utilityTypes.includes('path-validation')) {
      exampleParts.push('// Path Validation');
      exampleParts.push(`${constKeyword} isValid = await validatePath('./src/index.ts');`);
      exampleParts.push(`${constKeyword} exists = await pathExists('./package.json');`);
      exampleParts.push(`${constKeyword} isDir = await isDirectory('./src');`);
      exampleParts.push('');
    }

    if (utilityTypes.includes('path-normalization')) {
      exampleParts.push('// Path Normalization');
      exampleParts.push(`${constKeyword} normalized = normalizePath('./src/../src/utils');`);
      exampleParts.push(`${constKeyword} posixPath = toPosix('src\\\\utils\\\\file.ts');`);
      exampleParts.push(`${constKeyword} windowsPath = toWindows('src/utils/file.ts');`);
      exampleParts.push('');
    }

    if (utilityTypes.includes('workspace-relative')) {
      exampleParts.push('// Workspace Relative Paths');
      exampleParts.push(`${constKeyword} wsRoot = getWorkspaceRoot();`);
      exampleParts.push(`${constKeyword} relative = getWorkspaceRelativePath('/home/user/project/src/index.ts');`);
      exampleParts.push('');
    }

    return exampleParts.join('\n');
  }
}
