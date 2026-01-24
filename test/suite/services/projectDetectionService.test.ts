import * as assert from 'assert';
import * as fs from 'fs/promises';
import { TestSetup } from '../utils/testSetup';

suite('ProjectDetectionService Tests', () => {
  let projectDetectionService: any;

  setup(() => {
    TestSetup.setup();
    projectDetectionService = TestSetup.createProjectDetectionService();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('Context Variable Updates', () => {
    test('should set all context variables in parallel', async () => {
      // Mock file system for React + TypeScript project
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              react: '^18.0.0',
              'react-dom': '^18.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      // Stub fs.readFile
      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();
        const calls = mocks.vscode.getExecuteCommandCalls();

        // Verify all 6 context variables were set
        assert.strictEqual(calls.length, 6, 'Should have 6 executeCommand calls');

        // Check specific context values
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
      } finally {
        // Restore original fs.readFile
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should correctly detect Angular project', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              '@angular/core': '^16.0.0',
              '@angular/common': '^16.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should correctly detect Express project', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              express: '^4.18.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), false);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should correctly detect Next.js project', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              next: '^14.0.0',
              react: '^18.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should handle non-Node.js project correctly', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            name: 'python-project',
            dependencies: {}
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), false);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should handle missing package.json', async () => {
      const mockFsReadFile = async (_filePath: string) => {
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        // All should be false when no package.json
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), false);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });
  });

  suite('Cache Management', () => {
    test('should cache project type detection result', async () => {
      let readFileCallCount = 0;

      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          readFileCallCount++;
          return JSON.stringify({
            dependencies: {
              react: '^18.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        // Clear executeCommand calls between tests
        const mocks = TestSetup.getMocks();

        // First call - should read package.json
        await projectDetectionService.updateContextVariables();
        const firstCallCount = readFileCallCount;
        mocks.vscode.clearExecuteCommandCalls();

        // Second call - should use cache
        await projectDetectionService.updateContextVariables();

        // Verify cache was used (no additional file reads)
        assert.strictEqual(readFileCallCount, firstCallCount, 'Should use cache on second call');

        // Context variables should still be set correctly
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should clear cache when requested', async () => {
      let readFileCallCount = 0;

      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          readFileCallCount++;
          return JSON.stringify({
            dependencies: {
              react: '^18.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        const mocks = TestSetup.getMocks();

        // First call
        await projectDetectionService.updateContextVariables();
        const firstCallCount = readFileCallCount;
        mocks.vscode.clearExecuteCommandCalls();

        // Clear cache
        projectDetectionService.clearCache();

        // Second call - should read package.json again
        await projectDetectionService.updateContextVariables();

        // Verify cache was cleared (additional file read)
        assert.strictEqual(readFileCallCount, firstCallCount + 1, 'Should read file again after cache clear');
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });
  });

  suite('Parallel Execution', () => {
    test('should execute all setContext calls in parallel', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              react: '^18.0.0',
              express: '^4.18.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        const startTime = Date.now();
        await projectDetectionService.updateContextVariables();
        const endTime = Date.now();

        const mocks = TestSetup.getMocks();
        const calls = mocks.vscode.getExecuteCommandCalls();

        // Verify all 6 calls were made
        assert.strictEqual(calls.length, 6, 'Should have 6 executeCommand calls');

        // Verify the calls were for the correct context keys
        const contextKeys = calls.map(c => c.key);
        assert.ok(contextKeys.includes('additionalContextMenus.isNodeProject'));
        assert.ok(contextKeys.includes('additionalContextMenus.hasReact'));
        assert.ok(contextKeys.includes('additionalContextMenus.hasAngular'));
        assert.ok(contextKeys.includes('additionalContextMenus.hasExpress'));
        assert.ok(contextKeys.includes('additionalContextMenus.hasNextjs'));
        assert.ok(contextKeys.includes('additionalContextMenus.hasTypeScript'));

        // The execution should be fast due to parallel execution
        // (This is a rough check - in reality, the timing depends on the test environment)
        const executionTime = endTime - startTime;
        assert.ok(executionTime < 1000, `Execution should be fast, took ${executionTime}ms`);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should handle multiple frameworks correctly', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              react: '^18.0.0',
              express: '^4.18.0',
              next: '^14.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        // Verify multiple frameworks are detected
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });
  });

  suite('Integration Tests', () => {
    test('should complete full context update workflow', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            dependencies: {
              react: '^18.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        // Clear any previous calls
        const mocks = TestSetup.getMocks();
        mocks.vscode.clearExecuteCommandCalls();

        // Execute context update
        await projectDetectionService.updateContextVariables();

        // Verify all context variables were set
        const calls = mocks.vscode.getExecuteCommandCalls();
        assert.strictEqual(calls.length, 6, 'All 6 context variables should be set');

        // Verify the correct values
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), true);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should handle TypeScript detection via tsconfig.json', async () => {
      let accessCalled = false;

      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              react: '^18.0.0'
            }
          });
        }
        throw new Error('File not found');
      };

      const mockFsAccess = async (filePath: string) => {
        accessCalled = true;
        if (filePath.includes('tsconfig.json')) {
          return;
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      const originalAccess = fs.access;
      (fs as any).readFile = mockFsReadFile;
      (fs as any).access = mockFsAccess;

      try {
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        // Verify TypeScript was detected via tsconfig.json
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), true);
        assert.ok(accessCalled, 'fs.access should have been called');
      } finally {
        (fs as any).readFile = originalReadFile;
        (fs as any).access = originalAccess;
      }
    });
  });

  suite('Error Handling', () => {
    test('should handle invalid package.json gracefully', async () => {
      const mockFsReadFile = async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return 'invalid json {{{';
        }
        throw new Error('File not found');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        // Should not throw, but set all to false
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        // All should be false when package.json is invalid
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasAngular'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasExpress'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasNextjs'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasTypeScript'), false);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });

    test('should handle file system errors gracefully', async () => {
      const mockFsReadFile = async (_filePath: string) => {
        throw new Error('EACCES: permission denied');
      };

      const originalReadFile = fs.readFile;
      (fs as any).readFile = mockFsReadFile;

      try {
        // Should not throw
        await projectDetectionService.updateContextVariables();

        const mocks = TestSetup.getMocks();

        // Should default to false values on error
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.isNodeProject'), false);
        assert.strictEqual(mocks.vscode.getContextValue('additionalContextMenus.hasReact'), false);
      } finally {
        (fs as any).readFile = originalReadFile;
      }
    });
  });
});
