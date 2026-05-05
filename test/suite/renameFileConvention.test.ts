import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Rename File to Convention', () => {
  test('should register the command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.renameFileConvention'),
      'renameFileConvention command should be registered',
    );
  });

  test('should validateFileName correctly identifies kebab-case', () => {
    const {
      FileNamingConventionService,
    } = require('../../src/services/fileNamingConventionService');
    const svc = FileNamingConventionService.getInstance();
    const result = svc.validateFileName('/project/my-component.ts', 'kebab-case');
    assert.strictEqual(result.isValid, true);
  });

  test('should validateFileName identifies PascalCase violation and suggests conversion', () => {
    const {
      FileNamingConventionService,
    } = require('../../src/services/fileNamingConventionService');
    const svc = FileNamingConventionService.getInstance();
    const result = svc.validateFileName('/project/MyComponent.ts', 'kebab-case');
    assert.strictEqual(result.isValid, false);
    assert.ok(result.suggestedName, 'Should provide a suggested name');
    assert.ok(
      result.suggestedName!.toLowerCase().includes('my'),
      'Suggested name should be derived from original',
    );
  });

  test('should validateFileName accepts camelCase', () => {
    const {
      FileNamingConventionService,
    } = require('../../src/services/fileNamingConventionService');
    const svc = FileNamingConventionService.getInstance();
    const result = svc.validateFileName('/project/myComponent.ts', 'camelCase');
    assert.strictEqual(result.isValid, true);
  });

  test('should validateFileName accepts PascalCase', () => {
    const {
      FileNamingConventionService,
    } = require('../../src/services/fileNamingConventionService');
    const svc = FileNamingConventionService.getInstance();
    const result = svc.validateFileName('/project/MyComponent.ts', 'PascalCase');
    assert.strictEqual(result.isValid, true);
  });
});
