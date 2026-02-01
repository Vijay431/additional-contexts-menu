import * as vscode from 'vscode';

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

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): CronJobTimerGeneratorService {
    CronJobTimerGeneratorService.instance ??= new CronJobTimerGeneratorService();
    return CronJobTimerGeneratorService.instance;
  }

  public async generateCronExpression(): Promise<void> {
    this.logger.info('Generate Cron Timer command triggered');

    try {
      const schedules = [
        { label: 'Every minute', expression: '* * * * *', description: 'Run every minute' },
        {
          label: 'Every hour',
          expression: '0 * * * *',
          description: 'Run at minute 0 of every hour',
        },
        {
          label: 'Every day at midnight',
          expression: '0 0 * * *',
          description: 'Run at 00:00 daily',
        },
        { label: 'Every day at 9am', expression: '0 9 * * *', description: 'Run at 09:00 daily' },
        {
          label: 'Every Monday at 9am',
          expression: '0 9 * * 1',
          description: 'Run at 09:00 every Monday',
        },
        {
          label: 'Every 1st of month at midnight',
          expression: '0 0 1 * *',
          description: 'Run at 00:00 on 1st of each month',
        },
        {
          label: 'Every weekday at 9am',
          expression: '0 9 * * 1-5',
          description: 'Run at 09:00 Mon-Fri',
        },
        { label: 'Every 6 hours', expression: '0 */6 * * *', description: 'Run every 6 hours' },
        { label: 'Custom schedule', expression: 'custom', description: 'Define your own schedule' },
      ];

      const selected = await vscode.window.showQuickPick(
        schedules.map((s) => ({
          label: s.label,
          description: s.description,
          expression: s.expression,
        })),
        {
          placeHolder: 'Select a cron schedule',
        },
      );

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
    }
  }

  private async promptForCustomSchedule(): Promise<string | undefined> {
    const minute = await vscode.window.showInputBox({
      prompt: 'Minute (0-59, * for all)',
      placeHolder: '0',
      validateInput: (value) => {
        if (value === '*') {
          return null;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0 || num > 59) {
          return 'Invalid minute (0-59)';
        }
        return null;
      },
    });

    if (!minute) {
      return undefined;
    }

    const hour = await vscode.window.showInputBox({
      prompt: 'Hour (0-23, * for all)',
      placeHolder: '0',
      validateInput: (value) => {
        if (value === '*') {
          return null;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0 || num > 23) {
          return 'Invalid hour (0-23)';
        }
        return null;
      },
    });

    if (!hour) {
      return undefined;
    }

    const dayOfMonth = await vscode.window.showInputBox({
      prompt: 'Day of month (1-31, * for all)',
      placeHolder: '*',
      validateInput: (value) => {
        if (value === '*') {
          return null;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 1 || num > 31) {
          return 'Invalid day (1-31)';
        }
        return null;
      },
    });

    if (!dayOfMonth) {
      return undefined;
    }

    const month = await vscode.window.showInputBox({
      prompt: 'Month (1-12, * for all)',
      placeHolder: '*',
      validateInput: (value) => {
        if (value === '*') {
          return null;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 1 || num > 12) {
          return 'Invalid month (1-12)';
        }
        return null;
      },
    });

    if (!month) {
      return undefined;
    }

    const dayOfWeek = await vscode.window.showInputBox({
      prompt: 'Day of week (0-6, 0=Sunday, * for all)',
      placeHolder: '*',
      validateInput: (value) => {
        if (value === '*') {
          return null;
        }
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0 || num > 6) {
          return 'Invalid day (0-6)';
        }
        return null;
      },
    });

    if (!dayOfWeek) {
      return undefined;
    }

    return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  private async insertCronExpression(expression: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const comment = `# ${this.getCronDescription(expression)}`;
    const code = `'${expression}'`;

    await editor.edit((editBuilder) => {
      const position = editor.selection.active;
      editBuilder.insert(position, `${comment}\n${code}\n`);
    });

    vscode.window.showInformationMessage(`Inserted cron expression: ${expression}`);
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
