import * as vscode from 'vscode';

import { AccessibilityService } from '../services/accessibilityService';
import {
  formatAccessibleInputPrompt,
  getAccessibleQuickPickItem,
} from '../utils/accessibilityHelper';
import { Logger } from '../utils/logger';

export interface CronSchedule {
  expression: string;
  description: string;
}

/**
 * Cron Job Timer Generator Service
 *
 * Generates cron job timer expressions for scheduled tasks.
 *
 * @description
 * This service provides an easy way to generate cron job expressions
 * for scheduled tasks. Offers preset templates for common schedules
 * and supports building custom schedules with validation.
 *
 * Preset Schedules:
 * - Every minute
 * - Every hour
 * - Daily at midnight
 * - Daily at 9am
 * - Every Monday at 9am
 * - Every 1st of month
 * - Every weekday at 9am
 * - Every 6 hours
 *
 * Custom Schedule:
 * Build your own cron expression with field-by-field input
 *
 * @example
 * const service = CronJobTimerGeneratorService.getInstance();
 * await service.generateCronExpression();
 * // User selects "Daily at 9am"
 * // Result: '0 9 * * *'
 *
 * @see ConfigurationService - Not used directly but follows patterns
 *
 * @category Code Generation
 * @subcategory Cron & Scheduling
 *
 * @author Vijay Gangatharan <vijayanand431@gmail.com>
 * @since 1.3.0
 */
export class CronJobTimerGeneratorService {
  private static instance: CronJobTimerGeneratorService | undefined;
  private logger: Logger;
  private accessibilityService: AccessibilityService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.accessibilityService = AccessibilityService.getInstance();
  }

  public static getInstance(): CronJobTimerGeneratorService {
    CronJobTimerGeneratorService.instance ??= new CronJobTimerGeneratorService();
    return CronJobTimerGeneratorService.instance;
  }

  public async generateCronExpression(): Promise<void> {
    this.logger.info('Generate Cron Timer command triggered');

    try {
      const schedules = [
        getAccessibleQuickPickItem(
          {
            label: 'Every minute',
            expression: '* * * * *',
            description: 'Run every minute',
          },
          {
            ariaLabel:
              'Every minute. Runs the cron job every minute. Expression: star space star space star space star space star',
            ariaDescription: 'Run every minute',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every hour',
            expression: '0 * * * *',
            description: 'Run at minute 0 of every hour',
          },
          {
            ariaLabel:
              'Every hour. Runs at the start of each hour. Expression: 0 space star space star space star space star',
            ariaDescription: 'Run at minute 0 of every hour',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every day at midnight',
            expression: '0 0 * * *',
            description: 'Run at 00:00 daily',
          },
          {
            ariaLabel:
              'Every day at midnight. Runs daily at 00:00. Expression: 0 space 0 space star space star space star',
            ariaDescription: 'Run at 00:00 daily',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every day at 9am',
            expression: '0 9 * * *',
            description: 'Run at 09:00 daily',
          },
          {
            ariaLabel:
              'Every day at 9am. Runs daily at 9:00 AM. Expression: 0 space 9 space star space star space star',
            ariaDescription: 'Run at 09:00 daily',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every Monday at 9am',
            expression: '0 9 * * 1',
            description: 'Run at 09:00 every Monday',
          },
          {
            ariaLabel:
              'Every Monday at 9am. Runs weekly on Monday at 9:00 AM. Expression: 0 space 9 space star space star space 1',
            ariaDescription: 'Run at 09:00 every Monday',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every 1st of month at midnight',
            expression: '0 0 1 * *',
            description: 'Run at 00:00 on 1st of each month',
          },
          {
            ariaLabel:
              'Every 1st of month at midnight. Runs monthly on the first day at midnight. Expression: 0 space 0 space 1 space star space star',
            ariaDescription: 'Run at 00:00 on 1st of each month',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every weekday at 9am',
            expression: '0 9 * * 1-5',
            description: 'Run at 09:00 Mon-Fri',
          },
          {
            ariaLabel:
              'Every weekday at 9am. Runs Monday through Friday at 9:00 AM. Expression: 0 space 9 space star space star space 1 dash 5',
            ariaDescription: 'Run at 09:00 Monday through Friday',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Every 6 hours',
            expression: '0 */6 * * *',
            description: 'Run every 6 hours',
          },
          {
            ariaLabel:
              'Every 6 hours. Runs every 6 hours. Expression: 0 space slash 6 space star space star space star',
            ariaDescription: 'Run every 6 hours',
          },
        ),
        getAccessibleQuickPickItem(
          {
            label: 'Custom schedule',
            expression: 'custom',
            description: 'Define your own schedule',
          },
          {
            ariaLabel:
              'Custom schedule. Create your own cron expression by specifying minute, hour, day of month, month, and day of week',
            ariaDescription: 'Define your own schedule',
          },
        ),
      ];

      const selected = await vscode.window.showQuickPick(schedules, {
        placeHolder: 'Select a cron schedule',
      });

      if (!selected) {
        return;
      }

      let cronExpression: string;

      if (selected.expression === 'custom') {
        const customExpression = await this.promptForCustomSchedule();
        if (!customExpression) {
          return;
        }
        cronExpression = customExpression;
      } else {
        cronExpression = selected.expression;
        await this.accessibilityService.announce(
          `Selected schedule: ${selected.label}. Expression: ${cronExpression}`,
          'normal',
        );
      }

      if (!cronExpression) {
        return;
      }

      await this.insertCronExpression(cronExpression);
    } catch (error) {
      this.logger.error('Error generating cron expression', error);
      vscode.window.showErrorMessage(
        `Failed to generate cron expression: ${(error as Error).message}`,
      );
      await this.accessibilityService.announceError('Generate Cron', (error as Error).message);
    }
  }

  private async promptForCustomSchedule(): Promise<string | undefined> {
    const minute = await vscode.window.showInputBox({
      prompt: formatAccessibleInputPrompt('Minute', 'Enter 0-59 or star for all minutes'),
      placeHolder: '0',
      validateInput: (value) => {
        if (value === '*') {
          return undefined;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0 || num > 59) {
          return 'Error: Invalid minute. Must be 0-59 or star';
        }
        return undefined;
      },
    });

    if (!minute) {
      return undefined;
    }

    const hour = await vscode.window.showInputBox({
      prompt: formatAccessibleInputPrompt('Hour', 'Enter 0-23 or star for all hours'),
      placeHolder: '0',
      validateInput: (value) => {
        if (value === '*') {
          return undefined;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0 || num > 23) {
          return 'Error: Invalid hour. Must be 0-23 or star';
        }
        return undefined;
      },
    });

    if (!hour) {
      return undefined;
    }

    const dayOfMonth = await vscode.window.showInputBox({
      prompt: formatAccessibleInputPrompt('Day of month', 'Enter 1-31 or star for all days'),
      placeHolder: '*',
      validateInput: (value) => {
        if (value === '*') {
          return undefined;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 1 || num > 31) {
          return 'Error: Invalid day. Must be 1-31 or star';
        }
        return undefined;
      },
    });

    if (!dayOfMonth) {
      return undefined;
    }

    const month = await vscode.window.showInputBox({
      prompt: formatAccessibleInputPrompt('Month', 'Enter 1-12 or star for all months'),
      placeHolder: '*',
      validateInput: (value) => {
        if (value === '*') {
          return undefined;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 1 || num > 12) {
          return 'Error: Invalid month. Must be 1-12 or star';
        }
        return undefined;
      },
    });

    if (!month) {
      return undefined;
    }

    const dayOfWeek = await vscode.window.showInputBox({
      prompt: formatAccessibleInputPrompt(
        'Day of week',
        'Enter 0-6 where 0 is Sunday, or star for all days',
      ),
      placeHolder: '*',
      validateInput: (value) => {
        if (value === '*') {
          return undefined;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0 || num > 6) {
          return 'Error: Invalid day. Must be 0-6 or star';
        }
        return undefined;
      },
    });

    if (!dayOfWeek) {
      return undefined;
    }

    const cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
    await this.accessibilityService.announce(
      `Custom cron expression created: ${cronExpression}`,
      'normal',
    );

    return cronExpression;
  }

  private async insertCronExpression(expression: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      await this.accessibilityService.announceError('Insert Cron', 'No active editor found');
      return;
    }

    const comment = `# ${this.getCronDescription(expression)}`;
    const code = `'${expression}'`;

    await editor.edit((editBuilder) => {
      const position = editor.selection.active;
      editBuilder.insert(position, `${comment}\n${code}\n`);
    });

    const description = this.getCronDescription(expression);
    vscode.window.showInformationMessage(
      `Inserted cron expression: ${expression} - ${description}`,
    );
    await this.accessibilityService.announceSuccess(
      'Insert Cron Expression',
      `Expression ${expression} inserted: ${description}`,
    );
    this.logger.info(`Cron expression inserted: ${expression}`);
  }

  private getCronDescription(expression: string): string {
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      return 'Custom cron schedule';
    }

    const [min, hour, dom, month, dow] = parts;

    if (expression === '* * * * *') {
      return 'Run every minute';
    }
    if (expression === '0 * * * *') {
      return 'Run every hour at minute 0';
    }
    if (expression === '0 0 * * *') {
      return 'Run daily at midnight';
    }
    if (min === '0' && dom === '*' && month === '*' && dow === '*') {
      return `Run daily at ${hour}:00`;
    }
    if (dow !== '*') {
      return `Run on day ${dow} at ${hour ?? '0'}:${min ?? '0'}`;
    }

    return expression;
  }
}
