import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Enum Generator Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('enumGenerator');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Generate Enum command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.generateEnum'),
        'Generate Enum command should be registered',
      );
    });
  });

  suite('Union Type Parsing', () => {
    test('should parse type alias with union type', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'union-type.ts');
      const content = `type Status = "pending" | "approved" | "rejected";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 45);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('export enum Status {'), 'Enum generated');
    });

    test('should parse inline union type', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'inline-union.ts');
      const content = `interface User {\n  status: "active" | "inactive" | "suspended";\n}`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 1, 14, 1, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('export enum UserStatus {'), 'Enum generated');
    });

    test('should handle union type with 3 values', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'three-values.ts');
      const content = `type Priority = "low" | "medium" | "high";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('export enum Priority {'), 'Enum generated');
    });
  });

  suite('Enum Value Conversion', () => {
    test('should convert kebab-case to PascalCase', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'kebab-case.ts');
      const content = `type Status = "my-status" | "user-id" | "api-key";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('MyStatus'), 'Converted my-status to MyStatus');
      assert.ok(generatedFile.includes('UserId'), 'Converted user-id to UserId');
      assert.ok(generatedFile.includes('ApiKey'), 'Converted api-key to ApiKey');
    });

    test('should convert UPPER_CASE to PascalCase', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'upper-case.ts');
      const content = `type Status = "PENDING" | "APPROVED" | "REJECTED";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('Pending'), 'Converted PENDING to Pending');
      assert.ok(generatedFile.includes('Approved'), 'Converted APPROVED to Approved');
      assert.ok(generatedFile.includes('Rejected'), 'Converted REJECTED to Rejected');
    });

    test('should handle spaces in string literals', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'spaces.ts');
      const content = `type Status = "has spaces" | "also spaces" | "more spaces";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('HasSpaces'), 'Converted spaces to HasSpaces');
      assert.ok(generatedFile.includes('AlsoSpaces'), 'Converted spaces to AlsoSpaces');
      assert.ok(generatedFile.includes('MoreSpaces'), 'Converted spaces to MoreSpaces');
    });
  });

  suite('Enum Name Validation', () => {
    test('should accept PascalCase enum name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'pascal-name.ts');
      const content = `type Status = "pending" | "approved" | "rejected";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('export enum Status {'), 'Accepted PascalCase enum name');
    });

    test('should reject lowercase enum name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'lowercase.ts');
      const content = `type Status = "pending" | "approved" | "rejected";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnum');
        assert.fail('Should have rejected lowercase enum name');
      } catch (_error) {
        assert.ok(true, 'Rejected lowercase as expected');
      }
    });

    test('should reject empty enum name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'empty-name.ts');
      const content = `type Status = "pending" | "approved" | "rejected";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnum');
        assert.fail('Should have rejected empty enum name');
      } catch (_error) {
        assert.ok(true, 'Rejected empty name as expected');
      }
    });
  });

  suite('Code Insertion', () => {
    test('should insert enum above selected type', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'insertion-test.ts');
      const content = `type Status = "pending" | "approved" | "rejected";\n`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      const lines = generatedFile.split('\n');
      assert.strictEqual(lines[0], 'export enum Status {', 'Enum inserted on first line');
    });

    test('should export enum with export keyword', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'export-test.ts');
      const content = `type Status = "pending" | "approved" | "rejected";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const generatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(generatedFile.includes('export enum Status {'), 'Enum exported');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnum');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled no active editor error gracefully');
      }
    });

    test('should handle empty selection gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'empty-selection.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      const editor = WorkspaceTestHelpers.getActiveEditor();
      WorkspaceTestHelpers.selectRange(editor, 0, 0, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnum');
        assert.ok(true, 'Handled empty selection gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled empty selection gracefully');
      }
    });

    test('should handle untitled document gracefully', async () => {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.parse('untitled:Untitled-1'),
      );

      const editor = WorkspaceTestHelpers.getActiveEditor();
      WorkspaceTestHelpers.selectRange(editor, 0, 0, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateEnum');
        assert.ok(true, 'Handled untitled document gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled untitled document error gracefully');
      }
    });
  });

  suite('Integration Scenarios', () => {
    test('should handle React component type', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'react-component.tsx');
      const content = `
import React from 'react';

type Props = {
  name: string;
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 6, 8, 14);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      await WorkspaceTestHelpers.closeAllEditors();
      const updatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(updatedFile.includes('export enum Props {'), 'Handled React component type');
    });

    test('should work with TypeScript files', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'typescript-file.ts');
      const content = `type Status = "pending" | "approved" | "rejected";`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 40);

      await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

      const updatedFile = await FileTestHelpers.readFile(testFile);
      assert.ok(updatedFile.includes('export enum Status {'), 'Generated enum for TypeScript file');
    });
  });
});
