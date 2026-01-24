import * as vscode from 'vscode';

/**
 * Validation result for operations that can fail
 */
export type ValidationResult<T> = {
  isValid: true;
  value: T;
} | {
  isValid: false;
  error?: string;
};

/**
 * Centralized editor validation utility
 * Provides common validation methods for VS Code editor operations
 */
export class EditorValidation {
  private static instance: EditorValidation;

  private constructor() {
    // Singleton pattern
  }

  /**
   * Get the singleton instance of EditorValidation
   */
  public static getInstance(): EditorValidation {
    if (!EditorValidation.instance) {
      EditorValidation.instance = new EditorValidation();
    }
    return EditorValidation.instance;
  }

  /**
   * Validate that there is an active text editor
   * Shows an error message to the user if validation fails
   *
   * @returns The active text editor if valid, undefined otherwise
   */
  public validateActiveEditor(): vscode.TextEditor | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return undefined;
    }
    return editor;
  }

  /**
   * Validate that there is a non-empty selection in the active editor
   * Shows a warning message to the user if validation fails
   *
   * @param editor The text editor to validate
   * @returns The selection if valid, undefined otherwise
   */
  public validateSelection(editor: vscode.TextEditor): vscode.Selection | undefined {
    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('No code selected');
      return undefined;
    }
    return selection;
  }

  /**
   * Validate that there is an active editor with a non-empty selection
   * Combines both validations for convenience
   *
   * @returns An object with editor and selection if both are valid, undefined otherwise
   */
  public validateEditorWithSelection(): {
    editor: vscode.TextEditor;
    selection: vscode.Selection;
  } | undefined {
    const editor = this.validateActiveEditor();
    if (!editor) {
      return undefined;
    }

    const selection = this.validateSelection(editor);
    if (!selection) {
      return undefined;
    }

    return { editor, selection };
  }

  /**
   * Validate a target file path for read/write operations
   * Shows an error message if validation fails
   *
   * @param filePath The file path to validate
   * @param validateFn Async function that performs the actual validation
   * @returns The file path if valid, undefined otherwise
   */
  public async validateTargetFile(
    filePath: string,
    validateFn: (path: string) => Promise<boolean>,
  ): Promise<string | undefined> {
    const isValid = await validateFn(filePath);
    if (!isValid) {
      vscode.window.showErrorMessage('Target file is not accessible or writable');
      return undefined;
    }
    return filePath;
  }
}
