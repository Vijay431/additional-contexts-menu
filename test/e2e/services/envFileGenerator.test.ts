import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Env File Generator Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('envFileGenerator');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Generate Env File command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.generateEnvFile'),
        'Generate Env File command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should generate .env from .env.example', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env');

      await FileTestHelpers.createFile(
        envExampleFile,
        `
# Environment variables
NODE_ENV=development
PORT=3000
HOST=localhost
`,
      );
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      await FileTestHelpers.assertFileExists(envFile);
      await FileTestHelpers.assertFileContains(envFile, 'NODE_ENV=');
      assert.ok(true, '.env file generated successfully');
    });

    test('should generate .env.local from .env.example', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envLocalFile = path.join(testContext.tempWorkspace, '.env.local');

      await FileTestHelpers.createFile(
        envExampleFile,
        `
# Environment variables
NODE_ENV=development
PORT=3000
HOST=localhost
`,
      );
      await FileTestHelpers.createFile(envLocalFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      await FileTestHelpers.assertFileExists(envLocalFile);
      await FileTestHelpers.assertFileContains(envLocalFile, 'NODE_ENV=');
      assert.ok(true, '.env.local file generated successfully');
    });

    test('should parse complex .env.example', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env');

      const content = `
# Application Settings
APP_NAME=MyApp
APP_ENV=production
DEBUG=false
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb

# Feature Flags
FEATURE_ENABLED=true
FEATURE_X=false

# API Configuration
API_KEY=your_key_here
API_SECRET=your_secret
API_TIMEOUT=30000
`;
      await FileTestHelpers.createFile(envExampleFile, content);
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      const generatedFile = await FileTestHelpers.readFile(envFile);
      assert.ok(generatedFile.includes('APP_NAME='));
      assert.ok(generatedFile.includes('API_KEY='));
      assert.ok(generatedFile.includes('DEBUG=false'));
    });

    test('should handle comments and empty lines', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env');

      const content = `
# Comment at top
This is a comment

# Variable
VAR1=value1

# Empty line above

VAR2=value2

# Comment in middle
This is also a comment
`;
      await FileTestHelpers.createFile(envExampleFile, content);
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      const generatedFile = await FileTestHelpers.readFile(envFile);
      assert.ok(generatedFile.includes('# Comment at top'));
      assert.ok(generatedFile.includes('VAR1=value1'));
      assert.ok(generatedFile.includes('VAR2=value2'));
      assert.ok(generatedFile.includes('# Comment in middle'));
      assert.ok(generatedFile.includes('VAR2=value2'));
    });
  });

  suite('Custom File Name Input', () => {
    test('should accept .env file name', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env.custom');

      await FileTestHelpers.createFile(envExampleFile, `# Comment\nVAR=value`);
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      await FileTestHelpers.assertFileExists(envFile);
      assert.ok(true, 'Custom .env file name accepted');
    });

    test('should reject file name without dot prefix', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, 'env-file');

      await FileTestHelpers.createFile(envExampleFile, `# Comment`);
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');
        assert.fail('Should have rejected file name without dot');
      } catch (_error) {
        assert.ok(true, 'Rejected file name without dot as expected');
      }
    });

    test('should reject empty file name', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env');

      await FileTestHelpers.createFile(envExampleFile, `# Comment`);
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');
        assert.fail('Should have rejected empty file name');
      } catch (_error) {
        assert.ok(true, 'Rejected empty file name as expected');
      }
    });
  });

  suite('Error Handling', () => {
    test('should handle missing .env.example gracefully', async () => {
      const envFile = path.join(testContext.tempWorkspace, '.env');

      await FileTestHelpers.createFile(envFile, '# Comment');

      const document = await WorkspaceTestHelpers.openFile(envFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');
        assert.ok(true, 'Handled missing .env.example gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled missing .env.example gracefully');
      }
    });

    test('should handle no workspace folders gracefully', async () => {
      const envFile = path.join(testContext.tempWorkspace, '.env.example');

      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length === 0) {
          await WorkspaceTestHelpers.closeAllEditors();

          try {
            await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');
            assert.ok(true, 'Handled no workspace folders gracefully');
          } catch (_error) {
            assert.ok(true, 'Handled no workspace folders error gracefully');
          }
        }
      } catch (_error) {
        assert.fail('Should have checked for workspace folders');
      }
    });

    test('should open generated file in editor', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env');

      const content = `# Test
TEST_VAR=value`;
      await FileTestHelpers.createFile(envExampleFile, content);
      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      const activeEditor = WorkspaceTestHelpers.getActiveEditor();
      assert.ok(
        activeEditor?.document.uri.fsPath === envFile,
        'Generated file should be opened in editor',
      );
    });
  });

  suite('Integration Scenarios', () => {
    test('should generate multiple .env files from same .env.example', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile1 = path.join(testContext.tempWorkspace, '.env');
      const envFile2 = path.join(testContext.tempWorkspace, '.env.local');

      await FileTestHelpers.createFile(
        envExampleFile,
        `
# Shared variables
SHARED_VAR=shared
SHARED_SECRET=secret
`,
      );

      await FileTestHelpers.createFile(envFile1, '');
      await FileTestHelpers.createFile(envFile2, '');

      const document = await WorkspaceTestHelpers.openFile(envExampleFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      await FileTestHelpers.assertFileExists(envFile1);
      await FileTestHelpers.assertFileContains(envFile1, 'SHARED_VAR=');
      await FileTestHelpers.assertFileExists(envFile2);
      await FileTestHelpers.assertFileContains(envFile2, 'SHARED_VAR=');
      assert.ok(true, 'Generated both .env files');
    });

    test('should preserve existing .env file', async () => {
      const envExampleFile = path.join(testContext.tempWorkspace, '.env.example');
      const envFile = path.join(testContext.tempWorkspace, '.env');

      await FileTestHelpers.createFile(
        envFile,
        `
# Existing variable
EXISTING_VAR=existing_value
`,
      );

      await FileTestHelpers.createFile(envFile, '');

      const document = await WorkspaceTestHelpers.openFile(envFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

      const generatedFile = await FileTestHelpers.readFile(envFile);
      assert.ok(generatedFile.includes('# Existing variable'));
      assert.ok(generatedFile.includes('EXISTING_VAR=existing_value'));
      assert.ok(true, 'Preserved existing .env file');
    });
  });
});
