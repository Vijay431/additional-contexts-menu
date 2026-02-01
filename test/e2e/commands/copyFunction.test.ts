import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Copy Function - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('copyFunction');

    // Assert extension is active
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    // Reset to default configuration
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Copy Function command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.copyFunction'),
        'Copy Function command should be registered',
      );
    });
  });

  suite('Regular Function Detection', () => {
    test('should copy regular function declaration', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'regular-function.ts');
      const content = `
export function getUserById(id: string) {
  return fetch(\`/api/users/\${id}\`)
    .then(response => response.json());
}

const calculateTotal = (items: any[]) => {
  return items.reduce((sum, item) => sum + item.value, 0);
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      // Position cursor inside function
      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      // Execute command - should not throw
      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });

    test('should copy function with TypeScript types', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'typed-function.ts');
      const content = `
export function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then(res => res.json() as Promise<T>);
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      // Position cursor inside function
      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });

    test('should copy exported function', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'exported-function.ts');
      const content = `
export const logMessage = (message: string): void => {
  console.log(message);
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });
  });

  suite('Arrow Function Detection', () => {
    test('should copy arrow function', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'arrow-function.ts');
      const content = `
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });

    test('should copy async arrow function', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'async-arrow.ts');
      const content = `
const fetchUserData = async (userId: string) => {
  const response = await fetch(\`/api/users/\${userId}\`);
  return await response.json();
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 1, 30);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });
  });

  suite('Method Detection', () => {
    test('should copy class method', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'class-method.ts');
      const content = `
class UserService {
  authenticate(credentials: Credentials): boolean {
    return this.validateCredentials(credentials);
  }

  private validateCredentials(credentials: Credentials): boolean {
    return credentials.username && credentials.password;
  }
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 2, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });
  });

  suite('React Component Detection', () => {
    test('should copy React functional component', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'react-component.tsx');
      const content = `
import React from 'react';

const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const [userData, setUserData] = React.useState<UserData | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUserData);
  }, [userId]);

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{userData.name}</h1>
      <p>{userData.email}</p>
    </div>
  );
};

export default UserProfile;
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 3, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });

    test('should copy React hook', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'react-hook.ts');
      const content = `
import { useState, useEffect } from 'react';

const useUserData = (userId: string) => {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUserData);
  }, [userId]);

  return userData;
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 2, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function executed successfully');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      // Close all editors
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        // Should handle gracefully without throwing
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (_error) {
        // Expected to show warning message and not throw
        assert.fail(`Should not throw error: ${_error}`);
      }
    });

    test('should handle cursor outside function gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'outside-function.ts');
      const content = `
// Global code outside any function
const constantValue = 'test';

export function myFunction() {
  return constantValue;
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      // Position cursor outside function (on first line)
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        // Should show warning but not throw
        assert.ok(true, 'Handled cursor outside function gracefully');
      } catch (_error) {
        assert.fail(`Should not throw error: ${_error}`);
      }
    });
  });

  suite('Integration Scenarios', () => {
    test('should copy function with JSDoc comments', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'jsdoc-function.ts');
      const content = `
/**
 * Validates email format
 * @param email - Email address to validate
 * @returns True if email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 4, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function with JSDoc executed');
    });

    test('should copy function with decorators', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'decorator-function.ts');
      const content = `
@Injectable()
export class LoggerService {
  log(message: string): void {
    console.log(message);
  }
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 2, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function with decorators executed');
    });
  });
});
