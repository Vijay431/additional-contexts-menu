import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Additional Context Menus');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: unknown): void {
    this.log(LogLevel.ERROR, message, error);
  }

  public show(): void {
    this.outputChannel.show();
  }

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
