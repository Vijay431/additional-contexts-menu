import * as assert from 'assert';
import * as vscode from 'vscode';
import { EditorValidation } from '../../../src/utils/editorValidation';
import { TestSetup, TestHelpers } from '../utils/testSetup';

suite('EditorValidation Tests', () => {
  let editorValidation: EditorValidation;

  setup(() => {
    TestSetup.setup();
    editorValidation = EditorValidation.getInstance();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('Singleton Pattern', () => {
    test('should return same instance on multiple calls', () => {
      const instance1 = EditorValidation.getInstance();
      const instance2 = EditorValidation.getInstance();
      assert.strictEqual(instance1, instance2);
    });

    test('should return instance when called directly', () => {
      const instance = EditorValidation.getInstance();
      assert.ok(instance instanceof EditorValidation);
    });

  });

  suite('Active Editor Validation', () => {
    test('should return undefined when no active editor exists', () => {
      // Ensure no active editor
      (vscode.window as any).activeTextEditor = undefined;

      const result = editorValidation.validateActiveEditor();
      assert.strictEqual(result, undefined);
      TestHelpers.assertErrorMessage('No active editor found');
    });

    test('should return active editor when it exists', () => {
      // Create a mock text editor
      const mockEditor: vscode.TextEditor = {
        document: {
          uri: vscode.Uri.file('/home/user/project/src/test.ts'),
          fileName: '/home/user/project/src/test.ts',
          isDirty: false,
          isUntitled: false,
          languageId: 'typescript',
          version: 1,
          lineCount: 10,
          lineAt: () => null as any,
          offsetAt: () => 0,
          positionAt: () => new vscode.Position(0, 0),
          getText: () => '',
          getWordRangeAtPosition: () => undefined,
          validateRange: () => new vscode.Range(0, 0, 0, 0),
          validatePosition: () => new vscode.Position(0, 0),
          save: () => Promise.resolve(true),
          eol: vscode.EndOfLine.LF,
        } as any,
        selection: new vscode.Selection(0, 0, 0, 0),
        selections: [new vscode.Selection(0, 0, 0, 0)],
        visibleRanges: [new vscode.Range(0, 0, 10, 0)],
        options: {},
        viewColumn: vscode.ViewColumn.One,
        edit: () => Promise.resolve(false),
        insertSnippet: () => Promise.resolve(false),
        setDecorations: () => {},
        revealRange: () => {},
        show: () => {},
        hide: () => {},
      } as any;

      (vscode.window as any).activeTextEditor = mockEditor;

      const result = editorValidation.validateActiveEditor();
      assert.strictEqual(result, mockEditor);
    });

  });

  suite('Selection Validation', () => {
    test('should return undefined when selection is empty', () => {
      const mockEditor: vscode.TextEditor = {
        selection: new vscode.Selection(0, 0, 0, 0), // Empty selection
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, undefined);
      TestHelpers.assertWarningMessage('No code selected');
    });

    test('should return selection when it is not empty', () => {
      const mockSelection = new vscode.Selection(0, 0, 5, 10);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, mockSelection);
    });

    test('should handle single line selection', () => {
      const mockSelection = new vscode.Selection(2, 5, 2, 15);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, mockSelection);
      assert.strictEqual(result.start.line, 2);
      assert.strictEqual(result.end.line, 2);
    });

    test('should handle multi-line selection', () => {
      const mockSelection = new vscode.Selection(1, 0, 10, 5);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, mockSelection);
      assert.strictEqual(result.start.line, 1);
      assert.strictEqual(result.end.line, 10);
    });

  });

  suite('Combined Editor and Selection Validation', () => {
    test('should return undefined when no active editor', () => {
      (vscode.window as any).activeTextEditor = undefined;

      const result = editorValidation.validateEditorWithSelection();
      assert.strictEqual(result, undefined);
      TestHelpers.assertErrorMessage('No active editor found');
    });

    test('should return undefined when selection is empty', () => {
      const mockEditor: vscode.TextEditor = {
        selection: new vscode.Selection(0, 0, 0, 0), // Empty selection
      } as any;

      (vscode.window as any).activeTextEditor = mockEditor;

      const result = editorValidation.validateEditorWithSelection();
      assert.strictEqual(result, undefined);
    });

    test('should return editor and selection when both are valid', () => {
      const mockSelection = new vscode.Selection(0, 0, 5, 10);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      (vscode.window as any).activeTextEditor = mockEditor;

      const result = editorValidation.validateEditorWithSelection();
      assert.ok(result);
      assert.strictEqual(result!.editor, mockEditor);
      assert.strictEqual(result!.selection, mockSelection);
    });

    test('should work with realistic editor scenario', () => {
      const mockSelection = new vscode.Selection(3, 4, 8, 12);
      const mockEditor: vscode.TextEditor = {
        document: {
          uri: vscode.Uri.file('/home/user/project/src/test.ts'),
          fileName: '/home/user/project/src/test.ts',
        } as any,
        selection: mockSelection,
      } as any;

      (vscode.window as any).activeTextEditor = mockEditor;

      const result = editorValidation.validateEditorWithSelection();
      assert.ok(result);
      assert.strictEqual(result!.editor, mockEditor);
      assert.strictEqual(result!.selection.start.line, 3);
      assert.strictEqual(result!.selection.end.line, 8);
    });

  });

  suite('Target File Validation', () => {
    test('should return file path when validation passes', async () => {
      const testPath = '/home/user/project/src/test.ts';
      const validateFn = async (path: string) => path === testPath;

      const result = await editorValidation.validateTargetFile(testPath, validateFn);
      assert.strictEqual(result, testPath);
    });

    test('should return undefined when validation fails', async () => {
      const testPath = '/invalid/path/test.ts';
      const validateFn = async () => false;

      const result = await editorValidation.validateTargetFile(testPath, validateFn);
      assert.strictEqual(result, undefined);
      TestHelpers.assertErrorMessage('Target file is not accessible or writable');
    });

    test('should handle async validation function', async () => {
      const testPath = '/home/user/project/src/async.ts';
      const validateFn = async (path: string) => {
        // Simulate async validation (e.g., file system check)
        return Promise.resolve(path.endsWith('.ts'));
      };

      const result = await editorValidation.validateTargetFile(testPath, validateFn);
      assert.strictEqual(result, testPath);
    });

    test('should pass correct file path to validation function', async () => {
      const testPath = '/home/user/project/src/validate.ts';
      let receivedPath: string | undefined;

      const validateFn = async (path: string) => {
        receivedPath = path;
        return true;
      };

      await editorValidation.validateTargetFile(testPath, validateFn);
      assert.strictEqual(receivedPath, testPath);
    });

    test('should handle validation function that throws', async () => {
      const testPath = '/home/user/project/src/error.ts';
      const validateFn = async () => {
        throw new Error('Validation error');
      };

      // The validation function throws, so validateTargetFile should also throw
      try {
        await editorValidation.validateTargetFile(testPath, validateFn);
        assert.fail('Expected validateTargetFile to throw an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.strictEqual((error as Error).message, 'Validation error');
      }
    });

  });

  suite('Integration Tests', () => {
    test('should complete full validation workflow', () => {
      const mockSelection = new vscode.Selection(0, 0, 10, 0);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
        document: {
          uri: vscode.Uri.file('/home/user/project/src/fullWorkflow.ts'),
          fileName: '/home/user/project/src/fullWorkflow.ts',
        } as any,
      } as any;

      (vscode.window as any).activeTextEditor = mockEditor;

      // First validate active editor
      const editorResult = editorValidation.validateActiveEditor();
      assert.strictEqual(editorResult, mockEditor);

      // Then validate selection
      const selectionResult = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(selectionResult, mockSelection);

      // Finally validate combined
      const combinedResult = editorValidation.validateEditorWithSelection();
      assert.ok(combinedResult);
      assert.strictEqual(combinedResult!.editor, mockEditor);
      assert.strictEqual(combinedResult!.selection, mockSelection);
    });

    test('should handle multiple sequential validations', () => {
      // First validation with no editor
      (vscode.window as any).activeTextEditor = undefined;
      let result = editorValidation.validateEditorWithSelection();
      assert.strictEqual(result, undefined);

      // Setup editor with empty selection
      const mockEditor: vscode.TextEditor = {
        selection: new vscode.Selection(0, 0, 0, 0),
      } as any;
      (vscode.window as any).activeTextEditor = mockEditor;
      result = editorValidation.validateEditorWithSelection();
      assert.strictEqual(result, undefined);

      // Setup editor with valid selection
      mockEditor.selection = new vscode.Selection(0, 0, 5, 5);
      result = editorValidation.validateEditorWithSelection();
      assert.ok(result);
      assert.strictEqual(result!.editor, mockEditor);
    });

  });

  suite('Error Message Display', () => {
    test('should show appropriate error message for no active editor', () => {
      (vscode.window as any).activeTextEditor = undefined;
      editorValidation.validateActiveEditor();
      TestHelpers.assertErrorMessage('No active editor found');
    });

    test('should show appropriate error message for empty selection', () => {
      const mockEditor: vscode.TextEditor = {
        selection: new vscode.Selection(0, 0, 0, 0),
      } as any;
      editorValidation.validateSelection(mockEditor);
      TestHelpers.assertWarningMessage('No code selected');
    });

    test('should show appropriate error message for invalid target file', async () => {
      const validateFn = async () => false;
      await editorValidation.validateTargetFile('/invalid/path', validateFn);
      TestHelpers.assertErrorMessage('Target file is not accessible or writable');
    });

  });

  suite('Edge Cases', () => {
    test('should handle selection at start of document', () => {
      const mockSelection = new vscode.Selection(0, 0, 0, 5);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, mockSelection);
    });

    test('should handle selection at end of document', () => {
      const mockSelection = new vscode.Selection(99, 0, 99, 10);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, mockSelection);
    });

    test('should handle reversed selection', () => {
      // Selection where anchor is after active (reversed selection)
      const mockSelection = new vscode.Selection(5, 10, 0, 0);
      const mockEditor: vscode.TextEditor = {
        selection: mockSelection,
      } as any;

      const result = editorValidation.validateSelection(mockEditor);
      assert.strictEqual(result, mockSelection);
    });

    test('should handle empty file path for target validation', async () => {
      const validateFn = async (path: string) => path.length > 0;
      const result = await editorValidation.validateTargetFile('', validateFn);
      assert.strictEqual(result, undefined);
    });

  });

});
