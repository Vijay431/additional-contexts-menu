// TypeScript interfaces for the extension

/**
 * Represents the detected type and capabilities of a project.
 *
 * This interface captures the analysis results from project detection,
 * including framework identification, TypeScript support, and overall
 * compatibility level with extension features.
 *
 * Support levels:
 * - 'full': All extension features are supported
 * - 'partial': Some features may not work correctly
 * - 'none': Project type is not compatible
 */
export interface ProjectType {
  /** Whether the project is a Node.js project (detected via package.json) */
  isNodeProject: boolean;
  /** List of detected frameworks (e.g., 'react', 'vue', 'angular', 'next') */
  frameworks: string[];
  /** Whether TypeScript is used in the project */
  hasTypeScript: boolean;
  /**
   * Overall support level for extension features
   * - 'full': All features supported
   * - 'partial': Limited feature support
   * - 'none': Not supported
   */
  supportLevel: 'full' | 'partial' | 'none';
}

/**
 * Represents a file that has been analyzed for compatibility with the extension.
 *
 * This interface captures file metadata along with compatibility analysis results,
 * allowing the extension to filter and work with appropriate file types based on
 * supported extensions and project requirements.
 */
export interface CompatibleFile {
  /** Absolute file path in the filesystem */
  path: string;
  /** Base filename without extension or directory path */
  name: string;
  /** File extension including the dot (e.g., '.ts', '.js', '.tsx') */
  extension: string;
  /** Whether the file type is compatible with extension features */
  isCompatible: boolean;
  /** Last modification timestamp of the file */
  lastModified: Date;
  /** File path relative to workspace root for display purposes */
  relativePath: string;
}

/**
 * Represents the result of a save-all operation across multiple files.
 *
 * This interface captures detailed information about the outcome of bulk save
 * operations, including success metrics and lists of files that could not be saved
 * or were skipped during the process.
 */
export interface SaveAllResult {
  /** Total number of files that were attempted to be saved */
  totalFiles: number;
  /** Number of files that were successfully saved */
  savedFiles: number;
  /** List of file paths that failed to save with error information */
  failedFiles: string[];
  /** List of file paths that were skipped (e.g., read-only files, unchanged files) */
  skippedFiles: string[];
  /** Overall success status - true if all files saved without failures */
  success: boolean;
}

/**
 * Represents the validation result for a copy operation.
 *
 * This interface captures the validation state when attempting to copy code or files,
 * including checks for target existence, compatibility, permissions, and potential
 * conflicts that may arise during the copy operation.
 */
export interface CopyValidation {
  /** Whether the copy operation can proceed based on all validation checks */
  canCopy: boolean;
  /** Whether a file or code with the target name already exists at the destination */
  targetExists: boolean;
  /** Whether the source and target file types are compatible for the operation */
  isCompatible: boolean;
  /** Whether the user has write permissions to the target destination */
  hasWritePermission: boolean;
  /** Whether the source code contains parsing errors that could affect the copy */
  hasParseErrors: boolean;
  /** Estimated number of import/export conflicts that may need resolution */
  estimatedConflicts: number;
}

/**
 * Represents the validation result for a move operation.
 *
 * This interface captures the validation state when attempting to move code or files,
 * including checks for target existence, compatibility, permissions, and providing
 * a reason when the move operation cannot be completed.
 */
export interface MoveValidation {
  /** Whether the move operation can proceed based on all validation checks */
  canMove: boolean;
  /** Human-readable explanation of why the move cannot proceed (if applicable) */
  reason?: string;
  /** Whether a file or code with the target name already exists at the destination */
  targetExists: boolean;
  /** Whether the source and target file types are compatible for the operation */
  isCompatible: boolean;
  /** Whether the user has write permissions to the target destination */
  hasWritePermission: boolean;
}

/**
 * Configuration options for resolving conflicts during copy operations.
 *
 * This interface defines user preferences for handling various types of conflicts
 * that can arise when copying code, such as duplicate names, import statements,
 * comments, and formatting concerns.
 */
export interface CopyConflictResolution {
  /** Whether to automatically handle naming conflicts by generating unique names */
  handleNameConflicts: boolean;
  /** Whether to merge import statements with existing imports in the target file */
  mergeImports: boolean;
  /** Whether to preserve original comments when copying code */
  preserveComments: boolean;
  /** Whether to maintain the original formatting of the copied code */
  maintainFormatting: boolean;
}

/**
 * Configuration options for controlling user feedback during save-all operations.
 *
 * This interface defines which types of feedback should be displayed to the user
 * when performing bulk save operations across multiple files, allowing for
 * customizable verbosity and notification preferences.
 */
export interface SaveAllFeedback {
  /** Whether to display a progress indicator during the save operation */
  showProgress: boolean;
  /** Whether to show a notification when the save-all operation completes */
  showNotification: boolean;
  /** Whether to display the count of files that were saved in the feedback */
  showFileCount: boolean;
  /** Whether to show detailed information about any files that failed to save */
  showFailures: boolean;
}

/**
 * Represents detailed information about a detected function in source code.
 *
 * This interface captures the location, type, and content of functions identified
 * by the code analysis service, used for contextual operations and code manipulation.
 * Functions can be regular functions, class methods, arrow functions, async functions,
 * React components, or React hooks.
 */
export interface FunctionInfo {
  /** Name of the function or method */
  name: string;
  /** Line number where the function definition begins (1-indexed) */
  startLine: number;
  /** Line number where the function definition ends (1-indexed) */
  endLine: number;
  /** Column number where the function definition begins (0-indexed) */
  startColumn: number;
  /** Column number where the function definition ends (0-indexed) */
  endColumn: number;
  /**
   * Type of function construct
   * - 'function': Regular function declaration
   * - 'method': Class or object method
   * - 'arrow': Arrow function
   * - 'async': Async function (marked explicitly)
   * - 'component': React component (function returning JSX)
   * - 'hook': React custom hook (function name starting with 'use')
   */
  type: 'function' | 'method' | 'arrow' | 'async' | 'component' | 'hook';
  /** Whether the function is exported from its module */
  isExported: boolean;
  /** Whether the function has decorators (e.g., @Decorator in TypeScript/Angular) */
  hasDecorators: boolean;
  /** Full source text of the function including its body */
  fullText: string;
}

/**
 * Central configuration interface for the extension.
 *
 * This interface defines all user-configurable options that control the extension's
 * behavior, including project detection, code operations, save behavior, and terminal
 * integration. Configuration values are typically loaded from VSCode settings and
 * can be customized through the workspace settings UI.
 */
export interface ExtensionConfig {
  /**
   * Master switch for the extension.
   *
   * When false, all extension features are disabled and commands will not execute.
   * This allows users to temporarily disable the extension without uninstalling.
   */
  enabled: boolean;

  /**
   * Whether to automatically detect and analyze project types.
   *
   * When enabled, the extension scans workspace files to identify frameworks,
   * TypeScript usage, and project structure to provide optimized functionality.
   * Disabling this may improve performance in large workspaces at the cost of
   * reduced feature accuracy.
   */
  autoDetectProjects: boolean;

  /**
   * List of file extensions that the extension should process.
   *
   * Defines which file types are considered compatible with extension features.
   * Common extensions include ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json'].
   * Files with extensions not in this list will be ignored during analysis.
   */
  supportedExtensions: string[];

  /**
   * Configuration options for the copy code operation.
   *
   * Controls how code snippets are copied and inserted into target files,
   * including import handling, placement strategy, and formatting preservation.
   */
  copyCode: {
    /**
     * Strategy for determining where to insert copied code in the target file.
     *
     * - 'smart': Analyzes target file structure and inserts near related code
     * - 'end': Appends to the end of the file (after existing exports)
     * - 'beginning': Prepends to the beginning of the file (after imports)
     */
    insertionPoint: 'smart' | 'end' | 'beginning';

    /**
     * Strategy for handling import statements when copying code.
     *
     * - 'merge': Combine with existing imports, removing duplicates
     * - 'duplicate': Include all imports from copied code, even if duplicates exist
     * - 'skip': Omit imports from copied code entirely
     */
    handleImports: 'merge' | 'duplicate' | 'skip';

    /**
     * Whether to preserve comments from the copied code.
     *
     * When true, retains all original comments in the copied snippet.
     * When false, strips comments to produce cleaner code.
     */
    preserveComments: boolean;
  };

  /**
   * Configuration options for the save-all operation.
   *
   * Controls behavior when saving all files in the workspace, including
   * notification preferences and handling of read-only files.
   */
  saveAll: {
    /**
     * Whether to display a notification after the save-all operation completes.
     *
     * When true, shows a summary of files saved, skipped, or failed.
     * When false, performs the save silently without user feedback.
     */
    showNotification: boolean;

    /**
     * Whether to skip read-only files during save-all operations.
     *
     * When true, read-only files are excluded from the save operation.
     * When false, the save operation will fail if any read-only files are encountered.
     */
    skipReadOnly: boolean;
  };

  /**
   * Configuration options for terminal integration.
   *
   * Controls how and where the extension opens terminal sessions for executing
   * commands or running scripts in the workspace.
   */
  terminal: {
    /**
     * Type of terminal to use for command execution.
     *
     * - 'integrated': Use VSCode's integrated terminal
     * - 'external': Launch an external terminal window
     * - 'system-default': Use the system's default terminal application
     */
    type: 'integrated' | 'external' | 'system-default';

    /**
     * Custom command to launch external terminal (when type is 'external').
     *
     * Optional shell command for launching a specific terminal application.
     * Example: 'gnome-terminal', 'alacritty', 'xterm'
     * If not specified, uses the system's default terminal launcher.
     */
    externalTerminalCommand?: string;

    /**
     * Determines the working directory when opening a terminal.
     *
     * - 'parent-directory': Opens terminal in the parent directory of the current file
     * - 'workspace-root': Opens terminal in the workspace root directory
     * - 'current-directory': Opens terminal in the current file's directory
     */
    openBehavior: 'parent-directory' | 'workspace-root' | 'current-directory';
  };
}
