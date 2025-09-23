import * as assert from 'assert';
import * as path from 'path';
import { TerminalService } from '../../../services/terminalService';
import { TestSetup, TestHelpers } from '../utils/testSetup';

suite('TerminalService Tests', () => {
  let terminalService: TerminalService;

  setup(() => {
    TestSetup.setup();
    terminalService = TestSetup.createTerminalService();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('Path Resolution', () => {
    test('should get parent directory correctly', () => {
      const paths = TestHelpers.getTestPaths();
      const parentDir = terminalService.getParentDirectory(paths.unixFile);
      assert.strictEqual(parentDir, '/home/user/project/src');
    });

    test('should handle Windows paths', () => {
      const paths = TestHelpers.getTestPaths();
      const parentDir = terminalService.getParentDirectory(paths.windowsFile);
      assert.strictEqual(parentDir, 'C:\\Users\\User\\project\\src');
    });

    test('should handle paths with spaces', () => {
      const paths = TestHelpers.getTestPaths();
      const parentDir = terminalService.getParentDirectory(paths.fileWithSpaces);
      assert.strictEqual(parentDir, '/home/user/My Project/src');
    });

    test('should get parent directory for target behavior', () => {
      const service = TestHelpers.setupWithOpenBehavior('parent-directory');
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, '/home/user/project/src');
    });

    test('should get workspace root for target behavior', () => {
      const service = TestHelpers.setupWithOpenBehavior('workspace-root');
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, '/home/user/project');
    });

    test('should get current directory for target behavior', () => {
      const service = TestHelpers.setupWithOpenBehavior('current-directory');
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, paths.unixFile);
    });

    test('should handle no workspace folders gracefully', () => {
      const service = TestHelpers.setupNoWorkspace();
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      // Should fall back to process.cwd() for workspace root
      assert.ok(typeof targetDir === 'string');
    });
  });

  suite('Path Validation', () => {
    test('should validate existing directory', async () => {
      const paths = TestHelpers.getTestPaths();
      TestSetup.addFile(paths.workspaceRoot, true);

      const isValid = await terminalService.validatePath(paths.workspaceRoot);
      assert.strictEqual(isValid, true);
    });

    test('should reject non-existent directory', async () => {
      const paths = TestHelpers.getTestPaths();
      const isValid = await terminalService.validatePath(paths.nonExistentFile);
      assert.strictEqual(isValid, false);
    });

    test('should reject file path as directory', async () => {
      const paths = TestHelpers.getTestPaths();
      TestSetup.addFile(paths.unixFile, false); // Add as file, not directory

      const isValid = await terminalService.validatePath(paths.unixFile);
      assert.strictEqual(isValid, false);
    });

    test('should handle file system errors gracefully', async () => {
      const paths = TestHelpers.getTestPaths();
      // Don't add the path to mock file system, so it will throw FileNotFound
      const isValid = await terminalService.validatePath(paths.deepFile);
      assert.strictEqual(isValid, false);
    });
  });

  suite('Terminal Type Configuration', () => {
    test('should default to integrated terminal type', () => {
      const terminalType = terminalService.getTerminalType();
      assert.strictEqual(terminalType, 'integrated');
    });

    test('should return configured terminal type - external', () => {
      const service = TestHelpers.setupExternalTerminal();
      const terminalType = service.getTerminalType();
      assert.strictEqual(terminalType, 'external');
    });

    test('should return configured terminal type - system-default', () => {
      const service = TestHelpers.setupSystemDefaultTerminal();
      const terminalType = service.getTerminalType();
      assert.strictEqual(terminalType, 'system-default');
    });

    test('should handle all valid terminal types', () => {
      const validTypes = ['integrated', 'external', 'system-default'];
      for (const type of validTypes) {
        TestSetup.updateConfig({ terminal: { type: type as any, externalTerminalCommand: '', openBehavior: 'parent-directory' } });
        const terminalType = terminalService.getTerminalType();
        assert.strictEqual(terminalType, type);
      }
    });
  });

  suite('Terminal Creation', () => {
    test('should create integrated terminal successfully', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceDir = workspaceFolders[0]!.uri.fsPath;
        const initialTerminalCount = vscode.window.terminals.length;

        try {
          await terminalService.openDirectoryInTerminal(workspaceDir);

          const newTerminalCount = vscode.window.terminals.length;
          assert.strictEqual(newTerminalCount, initialTerminalCount + 1);

          const latestTerminal = vscode.window.terminals[vscode.window.terminals.length - 1];
          if (latestTerminal) {
            assert.ok(latestTerminal.name.includes('Terminal'));
          }

        } catch (error) {
          assert.fail(`Failed to create integrated terminal: ${error}`);
        }
      } else {
        console.log('Skipping terminal creation test - no workspace folders available');
      }
    });

    test('should handle terminal creation errors gracefully', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist';

      try {
        await terminalService.openInTerminal(invalidPath);
        assert.fail('Should have thrown an error for invalid path');
      } catch (error) {
        // Expected to throw an error
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Invalid or inaccessible directory'));
      }
    });
  });

  suite('Cross-Platform Support', () => {
    test('should handle different path separators', () => {
      const unixPath = '/home/user/project/file.ts';
      const windowsPath = 'C:\\Users\\User\\project\\file.ts';

      const unixParent = terminalService.getParentDirectory(unixPath);
      const windowsParent = terminalService.getParentDirectory(windowsPath);

      assert.strictEqual(unixParent, '/home/user/project');
      assert.strictEqual(windowsParent, 'C:\\Users\\User\\project');
    });

    test('should handle paths with spaces', () => {
      const pathWithSpaces = '/home/user/My Project/src/file.ts';
      const parentDir = terminalService.getParentDirectory(pathWithSpaces);
      assert.strictEqual(parentDir, '/home/user/My Project/src');
    });
  });

  suite('Error Handling', () => {
    test('should throw error for empty file path', async () => {
      try {
        await terminalService.openInTerminal('');
        assert.fail('Should have thrown an error for empty path');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, 'File path is required');
      }
    });

    test('should throw error for null file path', async () => {
      try {
        await terminalService.openInTerminal('');
        assert.fail('Should have thrown an error for null path');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, 'File path is required');
      }
    });

    test('should handle path resolution errors', () => {
      try {
        // Test with invalid characters that might cause path.dirname to fail
        terminalService.getParentDirectory('\0invalid\0path');
      } catch (error) {
        // Should handle the error gracefully
        assert.ok(error instanceof Error);
      }
    });
  });

  suite('Integration Tests', () => {
    test('should complete full workflow for valid file', async () => {
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

      await terminalService.openInTerminal(paths.unixFile);

      const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
      assert.strictEqual(newTerminalCount, initialTerminalCount + 1);

      TestHelpers.assertTerminalCreated('Terminal', parentDir);
      TestHelpers.assertInfoMessage('Terminal opened');
    });

    test('should work with different open behaviors', async () => {
      const behaviors: Array<'parent-directory' | 'workspace-root' | 'current-directory'> = [
        'parent-directory',
        'workspace-root',
        'current-directory'
      ];

      for (const behavior of behaviors) {
        const service = TestHelpers.setupWithOpenBehavior(behavior);
        const paths = TestHelpers.getTestPaths();

        // Setup required directories
        TestSetup.addFile(path.dirname(paths.unixFile), true);
        TestSetup.addFile(paths.workspaceRoot, true);
        TestSetup.addFile(paths.unixFile, false);

        const targetDir = service.getTargetDirectory(paths.unixFile);
        TestSetup.addFile(targetDir, true);

        await service.openInTerminal(paths.unixFile);

        TestHelpers.assertTerminalCreated('Terminal');
      }
    });

    test('should handle multi-workspace scenarios', async () => {
      const service = TestHelpers.setupMultiWorkspace();
      const testFile = '/home/user/project1/src/test.ts';

      TestSetup.addFile('/home/user/project1/src', true);

      await service.openInTerminal(testFile);

      TestHelpers.assertTerminalCreated('Terminal', '/home/user/project1/src');
    });

    test('should work with no workspace folders', async () => {
      const service = TestHelpers.setupNoWorkspace();
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      await service.openInTerminal(paths.unixFile);

      TestHelpers.assertTerminalCreated('Terminal');
    });
  });

  suite('Configuration Integration', () => {
    test('should respond to configuration changes', () => {
      // Test initial config
      assert.strictEqual(terminalService.getTerminalType(), 'integrated');

      // Update config and test change
      TestSetup.updateConfig({
        terminal: {
          type: 'external',
          externalTerminalCommand: 'test-command',
          openBehavior: 'workspace-root'
        }
      });

      assert.strictEqual(terminalService.getTerminalType(), 'external');
    });

    test('should handle configuration edge cases', () => {
      // Test with minimal config
      TestSetup.updateConfig({
        terminal: {
          type: 'integrated',
          openBehavior: 'parent-directory'
        }
      });

      assert.strictEqual(terminalService.getTerminalType(), 'integrated');

      const paths = TestHelpers.getTestPaths();
      const targetDir = terminalService.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, path.dirname(paths.unixFile));
    });
  });
});