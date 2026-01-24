import * as vscode from 'vscode';

/**
 * Enumeration of available log levels ordered by severity.
 *
 * Lower numeric values represent less severe log messages that can be
 * filtered out by setting a higher minimum log level.
 */
export enum LogLevel {
  /** Detailed debugging information for development purposes */
  DEBUG = 0,
  /** General informational messages about normal operation */
  INFO = 1,
  /** Warning messages for potentially harmful situations */
  WARN = 2,
  /** Error messages for critical issues that need attention */
  ERROR = 3,
}

/**
 * Singleton logger utility for centralized logging throughout the extension.
 *
 * Provides a VS Code output channel for viewing logs and supports multiple
 * log levels with configurable filtering. Logs are written to both the output
 * channel and the browser console in development mode for easier debugging.
 *
 * Usage:
 * ```typescript
 * const logger = Logger.getInstance();
 * logger.setLogLevel(LogLevel.DEBUG);
 * logger.info('Extension activated');
 * logger.error('Operation failed', error);
 * ```
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Additional Context Menus');
  }

  /**
   * Gets the singleton instance of the Logger.
   *
   * Creates a new instance on first call, returns the existing instance
   * on subsequent calls.
   *
   * @returns The singleton Logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Sets the minimum log level for filtering messages.
   *
   * Only messages at or above this level will be logged. For example,
   * setting to WARN will suppress DEBUG and INFO messages.
   *
   * @param level - The minimum log level to display
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Logs a debug-level message.
   *
   * Use for detailed diagnostic information during development.
   *
   * @param message - The log message to write
   * @param data - Optional additional data to log
   */
  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Logs an info-level message.
   *
   * Use for general informational messages about normal operation.
   *
   * @param message - The log message to write
   * @param data - Optional additional data to log
   */
  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Logs a warning-level message.
   *
   * Use for potentially harmful situations that don't prevent execution.
   *
   * @param message - The log message to write
   * @param data - Optional additional data to log
   */
  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Logs an error-level message.
   *
   * Use for critical issues that require attention or prevent normal operation.
   *
   * @param message - The log message to write
   * @param error - Optional error object or data to log
   */
  public error(message: string, error?: unknown): void {
    this.log(LogLevel.ERROR, message, error);
  }

  /**
   * Shows the logger output channel in the VS Code UI.
   *
   * Brings the output channel panel to the foreground so users can view logs.
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Disposes of the logger and its resources.
   *
   * Closes the output channel and cleans up resources. Call this when
   * the extension is deactivated.
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const logMessage = `[${timestamp}] [${levelName}] ${message}`;

    this.outputChannel.appendLine(logMessage);

    if (data) {
      this.outputChannel.appendLine(`Data: ${JSON.stringify(data, null, 2)}`);
    }

    // Also log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logMessage, data);
          break;
        case LogLevel.INFO:
          console.info(logMessage, data);
          break;
        case LogLevel.WARN:
          console.warn(logMessage, data);
          break;
        case LogLevel.ERROR:
          console.error(logMessage, data);
          break;
      }
    }
  }
}
