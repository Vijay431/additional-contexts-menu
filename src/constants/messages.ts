/**
 * Centralized message constants for user-facing notifications
 * All error, warning, and information messages displayed to users
 */

/**
 * Error messages shown to users via showErrorMessage
 */
export const MESSAGES = {
  /**
   * Extension activation failure
   */
  FAILED_TO_ACTIVATE: 'Failed to activate Additional Context Menus extension',

  /**
   * No active text editor is open
   */
  NO_ACTIVE_EDITOR: 'No active editor found',

  /**
   * Failed to copy function to clipboard
   */
  FAILED_TO_COPY_FUNCTION: 'Failed to copy function',

  /**
   * Target file cannot be written to (permissions, accessibility)
   */
  TARGET_FILE_NOT_WRITABLE: 'Target file is not accessible or writable',

  /**
   * Failed to copy selected lines to target file
   */
  FAILED_TO_COPY_LINES: 'Failed to copy lines to file',

  /**
   * Failed to move selected lines to target file
   */
  FAILED_TO_MOVE_LINES: 'Failed to move lines to file',

  /**
   * Failed to save all files (includes error message in output)
   */
  FAILED_TO_SAVE_FILES: 'Failed to save files:',

  /**
   * Failed to open terminal
   */
  FAILED_TO_OPEN_TERMINAL: 'Failed to open terminal',

  /**
   * Terminal error prefix (used with specific error messages)
   */
  TERMINAL_ERROR_PREFIX: 'Terminal Error:',

  /**
   * Permission denied when accessing directory
   */
  TERMINAL_PERMISSION_DENIED: 'Permission denied. Check if you have access to this directory.',

  /**
   * Directory not found or inaccessible
   */
  TERMINAL_DIRECTORY_NOT_FOUND: 'Directory not found or inaccessible.',

  /**
   * Generic terminal error when specific error cannot be determined
   */
  TERMINAL_GENERIC_ERROR: 'Failed to open terminal. See output channel for details.',

  /**
   * Failed to open file in editor
   * @param fileName - Name of file that failed to open
   */
  FAILED_TO_OPEN_FILE: (fileName: string): string => `Failed to open file: ${fileName}`,
} as const;

/**
 * Warning messages shown to users via showWarningMessage
 */
export const WARNING_MESSAGES = {
  /**
   * No function found at current cursor position
   */
  NO_FUNCTION_AT_CURSOR: 'No function found at cursor position',

  /**
   * No code selected to copy/move
   */
  NO_CODE_SELECTED: 'No code selected',

  /**
   * No compatible files found in workspace for copy/move operations
   */
  NO_COMPATIBLE_FILES: 'No compatible files found in workspace',
} as const;

/**
 * Information messages shown to users via showInformationMessage
 */
export const INFO_MESSAGES = {
  /**
   * Extension successfully activated (shown only in debug mode)
   */
  EXTENSION_ACTIVATED: 'Additional Context Menus extension is now active',

  /**
   * Function copied to clipboard
   * @param type - Function type (e.g., 'function', 'class', 'method')
   * @param name - Function name
   */
  FUNCTION_COPIED: (type: string, name: string): string =>
    `Copied ${type} '${name}' to clipboard`,

  /**
   * Lines copied to target file
   * @param fileName - Name of target file
   */
  LINES_COPIED: (fileName: string): string => `Lines copied to ${fileName}`,

  /**
   * Lines moved to target file
   * @param fileName - Name of target file
   */
  LINES_MOVED: (fileName: string): string => `Lines moved to ${fileName}`,

  /**
   * Extension enabled via command
   */
  EXTENSION_ENABLED: 'Additional Context Menus enabled',

  /**
   * Extension disabled via command
   */
  EXTENSION_DISABLED: 'Additional Context Menus disabled',

  /**
   * No unsaved files to save
   */
  NO_UNSAVED_FILES: 'No unsaved files found',

  /**
   * Files saved successfully
   * @param count - Number of files saved
   */
  FILES_SAVED: (count: number): string => `Saved ${count} file${count === 1 ? '' : 's'}`,

  /**
   * Partial save completion with failures
   * @param saved - Number of files saved
   * @param total - Total number of files
   * @param failed - Number of files that failed to save
   */
  FILES_PARTIALLY_SAVED: (saved: number, total: number, failed: number): string =>
    `Saved ${saved}/${total} files. ${failed} failed.`,

  /**
   * Terminal opened in directory
   * @param directoryName - Name of directory
   */
  TERMINAL_OPENED: (directoryName: string): string =>
    `Terminal opened in ${directoryName}`,
} as const;

/**
 * Output channel name for logging
 */
export const OUTPUT_CHANNEL_NAME = 'Additional Context Menus';

/**
 * Progress message for save all operation
 */
export const SAVE_ALL_PROGRESS = 'Saving all files...';

/**
 * Progress message for saving specific file
 * @param fileName - Name of file being saved
 */
export const SAVING_FILE = (fileName: string): string => `Saving ${fileName}`;

/**
 * QuickPick placeholder for file selection
 */
export const SELECT_TARGET_FILE = 'Select target file';

/**
 * QuickPick button for showing failure details
 */
export const SHOW_DETAILS_BUTTON = 'Show Details';
