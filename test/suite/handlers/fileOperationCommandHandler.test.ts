import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileOperationCommandHandler } from '../../../src/handlers/FileOperationCommandHandler';

suite('FileOperationCommandHandler Tests', () => {
  suite('Initialization', () => {
    test('should initialize successfully', async () => {
      const handler = new FileOperationCommandHandler();
      await handler.initialize();
      handler.dispose();
      // If we get here without error, initialization succeeded
      assert.ok(true);
    });

    test('should create handler instance', () => {
      const handler = new FileOperationCommandHandler();
      assert.ok(handler);
      handler.dispose();
    });

    test('should dispose properly', () => {
      const handler = new FileOperationCommandHandler();
      handler.dispose();
      // If we get here without error, dispose succeeded
      assert.ok(true);
    });
  });

  suite('Command Registration', () => {
    test('should verify copy lines command exists', async () => {
      // Verify the command is registered by the main extension
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('additionalContextMenus.copyLinesToFile'));
    });

    test('should verify move lines command exists', async () => {
      // Verify the command is registered by the main extension
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('additionalContextMenus.moveLinesToFile'));
    });
  });

  suite('Integration Tests', () => {
    test('should handle initialization lifecycle', async () => {
      const handler = new FileOperationCommandHandler();
      // Test initialize -> dispose cycle
      await handler.initialize();
      assert.ok(handler);
      handler.dispose();
      assert.ok(true);
    });

    test('should support multiple handler instances', async () => {
      // Create multiple handler instances
      const handler1 = new FileOperationCommandHandler();
      const handler2 = new FileOperationCommandHandler();

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
      const handler = new FileOperationCommandHandler();
      handler.dispose();
      handler.dispose(); // Second dispose should not throw
      assert.ok(true);
    });

    test('should handle initialization without errors', async () => {
      const handler = new FileOperationCommandHandler();
      // Multiple initialization calls should not throw
      await handler.initialize();
      await handler.initialize();
      handler.dispose();
      assert.ok(true);
    });
  });
});
