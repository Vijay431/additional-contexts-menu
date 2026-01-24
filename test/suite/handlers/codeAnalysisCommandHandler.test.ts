import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeAnalysisCommandHandler } from '../../../src/handlers/CodeAnalysisCommandHandler';

suite('CodeAnalysisCommandHandler Tests', () => {
  suite('Initialization', () => {
    test('should initialize successfully', async () => {
      const handler = new CodeAnalysisCommandHandler();
      await handler.initialize();
      handler.dispose();
      // If we get here without error, initialization succeeded
      assert.ok(true);
    });

    test('should create handler instance', () => {
      const handler = new CodeAnalysisCommandHandler();
      assert.ok(handler);
      handler.dispose();
    });

    test('should dispose properly', () => {
      const handler = new CodeAnalysisCommandHandler();
      handler.dispose();
      // If we get here without error, dispose succeeded
      assert.ok(true);
    });
  });

  suite('Command Registration', () => {
    test('should verify copy function command exists', async () => {
      // Verify the command is registered by the main extension
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('additionalContextMenus.copyFunction'));
    });
  });

  suite('Integration Tests', () => {
    test('should handle initialization lifecycle', async () => {
      const handler = new CodeAnalysisCommandHandler();
      // Test initialize -> dispose cycle
      await handler.initialize();
      assert.ok(handler);
      handler.dispose();
      assert.ok(true);
    });

    test('should support multiple handler instances', async () => {
      // Create multiple handler instances
      const handler1 = new CodeAnalysisCommandHandler();
      const handler2 = new CodeAnalysisCommandHandler();

      await handler1.initialize();
      await handler2.initialize();

      assert.ok(handler1);
      assert.ok(handler2);

      handler1.dispose();
      handler2.dispose();

      assert.ok(true);
    });
  });

  suite('Error Handling', () => {
    test('should handle multiple disposals gracefully', () => {
      const handler = new CodeAnalysisCommandHandler();
      handler.dispose();
      handler.dispose(); // Second dispose should not throw
      assert.ok(true);
    });

    test('should handle initialization without errors', async () => {
      const handler = new CodeAnalysisCommandHandler();
      // Multiple initialization calls should not throw
      await handler.initialize();
      await handler.initialize();
      handler.dispose();
      assert.ok(true);
    });
  });
});
