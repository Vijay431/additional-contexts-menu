// Minimal VS Code mock for unit testing
// This provides just enough to make the imports work

import * as vscode from 'vscode';

// Re-export everything from the real vscode module
export * from 'vscode';

// Create a mock instance that combines real types with test doubles
const mockVscode: any = vscode;

// Override specific methods with our mocks
export default mockVscode;
