import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Generate .env File', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.generateEnvFile'),
      'generateEnvFile command should be registered',
    );
  });

  test('should execute without throwing when no workspace is open', async () => {
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.generateEnvFile')),
    );
  });

  test('should parseEnvVariables skips comments and empty lines', () => {
    const { EnvFileGeneratorService } = require('../../src/services/envFileGeneratorService');
    const svc = EnvFileGeneratorService.getInstance();
    const parseEnvVariables = (svc as any).parseEnvVariables.bind(svc);

    const content = [
      '# This is a comment',
      '',
      'NODE_ENV=production',
      'PORT=3000',
      '# Another comment',
      'DB_HOST=localhost',
    ].join('\n');

    const variables = parseEnvVariables(content);
    assert.strictEqual(variables.length, 3, 'Should extract 3 variables');
    assert.deepStrictEqual(
      variables.map((v: { name: string }) => v.name),
      ['NODE_ENV', 'PORT', 'DB_HOST'],
    );
  });

  test('should parseEnvVariables handles lines without equals sign', () => {
    const { EnvFileGeneratorService } = require('../../src/services/envFileGeneratorService');
    const svc = EnvFileGeneratorService.getInstance();
    const parseEnvVariables = (svc as any).parseEnvVariables.bind(svc);

    const content = 'GOOD_VAR=value\nINVALID_LINE\nANOTHER=ok';
    const variables = parseEnvVariables(content);
    assert.strictEqual(variables.length, 2);
    assert.strictEqual(variables[0].name, 'GOOD_VAR');
    assert.strictEqual(variables[1].name, 'ANOTHER');
  });
});
