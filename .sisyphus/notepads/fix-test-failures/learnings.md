# Learnings - Fix Test Failures

## Task 2: Variable Shadowing Fix

### Issue

- Two test files had variable shadowing where `const _editor = ...` was declared but code referenced `editor`
- This caused TypeScript compilation errors: `error TS2304: Cannot find name 'editor'`

### Files Fixed

1. `test/e2e/commands/copyFunctionToFile.test.ts` - 7 occurrences (lines 82, 99, 116, 133, 150, 172, 189)
2. `test/e2e/commands/moveFunctionToFile.test.ts` - 10 occurrences (lines 49, 86, 103, 120, 137, 154, 176, 193, 278, 301)

### Approach

- Used Edit tool to replace `editor.selection` with `_editor.selection` in each occurrence
- Provided unique surrounding context to avoid multiple match errors
- Fixed each occurrence individually for precision

### Pattern

```typescript
// Before (WRONG)
const _editor = await vscode.window.showTextDocument(doc);
editor.selection = new vscode.Selection(1, 0, 1, 0);

// After (CORRECT)
const _editor = await vscode.window.showTextDocument(doc);
_editor.selection = new vscode.Selection(1, 0, 1, 0);
```

### Verification

- TypeScript compilation check: `pnpm exec tsc -p ./tsconfig.test.json`
- Filtered for TS2304 errors: `grep "error TS2304.*editor"`
- Result: 0 errors confirmed
- Full tsc check shows other pre-existing errors (unrelated to this fix)

### Key Takeaways

- Variable naming conventions matter for test file consistency
- Simple find/replace operations work well for straightforward patterns
- Providing unique context prevents Edit tool ambiguity errors
- LSP diagnostics help track remaining issues during fixes

## Task 3: Missing Import - assert Statement

### Issue

- `fileNamingConvention.test.ts` was missing the `assert` import statement
- TypeScript compilation error: `error TS2304: Cannot find name 'assert'`
- File used `assert.ok()`, `assert.fail()`, etc. without importing the module

### File Fixed

1. `test/e2e/services/fileNamingConvention.test.ts` - Added import on line 4

### Approach

- Used Edit tool to add `import * as assert from 'assert';` after line 3
- Inserted before the E2ETestSetup import line
- Used exact format: single quotes, semicolon, same style as other imports

### Pattern

```typescript
// Before (MISSING)
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';

import { E2ETestSetup } from '../utils/e2eTestSetup';

// After (CORRECT)
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as assert from 'assert';

import { E2ETestSetup } from '../utils/e2eTestSetup';
```

### Verification

- TypeScript compilation check: `tsc -p ./tsconfig.test.json 2>&1 | grep "fileNamingConvention.*error TS2304.*assert" | wc -l`
- Result: 0 errors confirmed
- Import statement properly formatted and positioned

### Key Takeaways

- Test files require explicit imports for Node.js modules like `assert`
- Consistent import ordering matters (core modules first, then local imports)
- Simple import additions follow straightforward patterns
- Pre-existing LSP errors in file are unrelated to import fix

## Task 4: Type Mismatches - enumGenerator.test.ts

### Issue

- `enumGenerator.test.ts` had type mismatches where `TextDocument` was passed instead of `TextEditor` to `selectRange` function
- Missing undefined checks before using `editor` returned from `getActiveEditor()`
- Missing 5th argument to `selectRange` function call on line 253

### Files Fixed

1. `test/e2e/services/enumGenerator.test.ts` - 3 locations (lines 213, 229, 253)

### Approach

- Used Edit tool to fix type mismatches and add undefined checks
- Changed `document` parameter to `editor` in selectRange calls
- Added `if (!editor) { throw new Error('No active editor'); }` checks
- Added missing 5th argument to selectRange call

### Pattern

```typescript
// Before (WRONG)
const editor = WorkspaceTestHelpers.getActiveEditor();
WorkspaceTestHelpers.selectRange(editor, 0, 0, 0, 0);

// After (CORRECT)
const editor = WorkspaceTestHelpers.getActiveEditor();
if (!editor) {
  throw new Error('No active editor');
}
WorkspaceTestHelpers.selectRange(editor, 0, 0, 0, 0);
```

```typescript
// Before (WRONG - missing arg and wrong type)
const document = await WorkspaceTestHelpers.openFile(testFile);
WorkspaceTestHelpers.selectRange(document, 6, 8, 14);

// After (CORRECT)
const document = await WorkspaceTestHelpers.openFile(testFile);
const editor = WorkspaceTestHelpers.getActiveEditor();
if (!editor) {
  throw new Error('No active editor');
}
WorkspaceTestHelpers.selectRange(editor, 6, 8, 6, 14);
```

### Helper Function Signature (from workspaceHelpers.ts)

```typescript
export function selectRange(
  editor: vscode.TextEditor,
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): void;
```

### Verification

- TypeScript compilation check: `tsc -p ./tsconfig.test.json 2>&1 | grep "enumGenerator.*error TS" | wc -l`
- Result: 0 errors confirmed
- All three locations now properly pass TextEditor to selectRange
- All undefined checks in place before using editor

### Key Takeaways

- `getActiveEditor()` returns `TextEditor | undefined`, so undefined checks are required
- `selectRange` requires 5 arguments: editor, startLine, startChar, endLine, endChar
- Type safety requires proper parameter types (TextEditor not TextDocument)
- Error messages provide clear guidance: "Expected 5 arguments, but got 4"

## Task 5: Missing Method - chmod in fileSaveOptions.test.ts

### Issue

- `fileSaveOptions.test.ts` called non-existent `FileTestHelpers.chmod()` method
- TypeScript compilation error: `error TS2339: Property 'chmod' does not exist on type '{ createFile: ...; readFile: ...; ... }'`
- File already imported `fs` from 'node:fs/promises' which provides the `chmod` function

### Files Fixed

1. `test/e2e/services/fileSaveOptions.test.ts` - Line 135 only
   - Line 177 already correctly used `fs.chmod`

### Approach

- Used Edit tool to replace `FileTestHelpers.chmod` with `fs.chmod` on line 135
- Chose Option 2 (simpler): Use fs.chmod directly instead of adding method to FileTestHelpers
- Verified line 177 already used correct pattern (no change needed)

### Pattern

```typescript
// Before (WRONG - method doesn't exist)
await FileTestHelpers.chmod(readonlyFile, 0o444);

// After (CORRECT - fs already imported)
await fs.chmod(readonlyFile, 0o444);
```

### Existing Imports Context

```typescript
import * as fs from 'node:fs/promises'; // Line 3 - already present
```

### Verification

- TypeScript compilation check: `tsc -p ./tsconfig.test.json 2>&1 | grep "fileSaveOptions.*error TS2339.*chmod" | wc -l`
- Result: 0 errors confirmed
- Verified all chmod calls: `grep -n "chmod" test/e2e/services/fileSaveOptions.test.ts`
- Both lines (135, 177) now use `fs.chmod`

### Key Takeaways

- Use standard Node.js fs module functions directly when already imported
- No need to wrap simple operations in helper classes
- Verify all occurrences of a pattern before making changes (line 177 was already correct)
- fs.chmod syntax: `fs.chmod(filePath, mode)` where mode is octal (e.g., 0o444 for read-only)

## Task 6: Incorrect Property Access - fileSaveOptions.test.ts

### Issue

- `fileSaveOptions.test.ts` was incorrectly accessing `.document.isDirty` on results from `readFile()` function
- `readFile()` returns `string` (file contents), not an object with `.document` property
- TypeScript compilation errors: `error TS2339: Property 'document' does not exist on type 'string'`
- Lines affected: 84-88, 144-157 (originally, after fixes: 75-89, 146-160)

### Files Fixed

1. `test/e2e/services/fileSaveOptions.test.ts` - 2 test cases (lines 84-88, 144-157)

### Approach

- Restructured tests to store `vscode.TextDocument` objects in arrays before save operations
- Changed from checking `readFile().document.isDirty` to checking `doc.isDirty` directly on stored documents
- Used `vscode.workspace.openTextDocument()` to get document objects instead of `FileTestHelpers.readFile()`

### Pattern

```typescript
// Before (WRONG - readFile returns string, not object with .document)
for (const file of [file1, file2, file3]) {
  const document = await WorkspaceTestHelpers.openFile(file);
  assert.ok(document.document.isDirty, 'File should be dirty');
}

await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');
await new Promise((resolve) => setTimeout(resolve, 1000));

for (const file of [file1, file2, file3]) {
  const savedDocument = await FileTestHelpers.readFile(file);
  assert.ok(!savedDocument.document.isDirty, 'File should be saved');
}

// After (CORRECT - store documents, check isDirty directly)
const documents: vscode.TextDocument[] = [];
for (const file of [file1, file2, file3]) {
  const doc = await vscode.workspace.openTextDocument(file);
  documents.push(doc);
  await vscode.window.showTextDocument(doc);
  assert.ok(doc.isDirty, 'File should be dirty');
}

await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');
await new Promise((resolve) => setTimeout(resolve, 1000));

for (const doc of documents) {
  assert.ok(!doc.isDirty, 'File should be saved');
}
```

### Helper Function Reference

```typescript
// From fileHelpers.ts:17-19
async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

// readFile returns Promise<string> - file contents, NOT a document object
```

### Test Intent Preservation

- Original intent: Verify save operations work correctly (documents not dirty after save)
- Fix approach: Same verification, but using correct document objects instead of string file contents
- No new test logic added, just fixed property access pattern

### Verification

- TypeScript compilation check: `tsc -p ./tsconfig.test.json 2>&1 | grep "fileSaveOptions.*error TS2339.*document" | wc -l`
- Result: 0 errors confirmed
- Grep verification: `grep -n "readFile.*\.document" test/e2e/services/fileSaveOptions.test.ts` - no matches
- Both test cases now properly check document dirty state

### Key Takeaways

- `readFile()` returns string (file contents), not document objects
- `vscode.workspace.openTextDocument()` returns `TextDocument` objects with `isDirty` property
- Store document references before operations if you need to check state afterward
- Maintain test intent while fixing incorrect property access patterns
- `doc.isDirty` is the correct way to check document modification state

## Task 7: Wrong Variable Names - extension-e2e.test.ts

### Issue

- `extension-e2e.test.ts` had wrong variable names causing undefined variable errors
- Line 808: Used `cmdPromise` (undefined) instead of `cmd` (declared variable)
- Line 910: Used `promise.resolve(cmd)` (lowercase promise) instead of `Promise.resolve(cmd)` (built-in Promise class)
- TypeScript compilation errors: `error TS2304: Cannot find name 'cmdPromise'` and `error TS2304: Cannot find name 'promise'`

### Files Fixed

1. `test/e2e/extension-e2e.test.ts` - 2 locations (lines 808, 910)

### Approach

- Used Edit tool to replace wrong variable names with correct ones
- Line 808: Replaced `await cmdPromise` with `await cmd`
- Line 910: Replaced `promise.resolve(cmd)` with `Promise.resolve(cmd)`
- Did NOT change test logic (as specified in MUST NOT DO)

### Pattern

```typescript
// Before (WRONG - undefined variable)
const cmd = vscode.commands.executeCommand('additionalContextMenus.copyFunction');
promises.push(await cmdPromise);

// After (CORRECT - use declared variable)
const cmd = vscode.commands.executeCommand('additionalContextMenus.copyFunction');
promises.push(await cmd);
```

```typescript
// Before (WRONG - lowercase promise)
const cmd = vscode.commands.executeCommand('additionalContextMenus.saveAll');
savePromises.push(promise.resolve(cmd));

// After (CORRECT - built-in Promise class)
const cmd = vscode.commands.executeCommand('additionalContextMenus.saveAll');
savePromises.push(Promise.resolve(cmd));
```

### Verification

- TypeScript compilation check: `tsc -p ./tsconfig.test.json 2>&1 | grep "extension-e2e.*error TS2304" | wc -l`
- Result: 0 errors confirmed
- Grep verification: `grep -n "cmdPromise" test/e2e/extension-e2e.test.ts` - 0 matches
- Grep verification: `grep -n "promise\.resolve" test/e2e/extension-e2e.test.ts` - 0 matches
- Verified correct replacements: `grep -n "Promise\.resolve(cmd)" test/e2e/extension-e2e.test.ts` - 1 match at line 910

### Key Takeaways

- Built-in JavaScript/TypeScript classes must use correct case: `Promise` not `promise`
- Variable names must match exactly what's declared in scope
- Simple find/replace works well for straightforward variable name fixes
- Test logic preservation is important - only fix what's broken
- Use grep to verify all instances of wrong patterns are eliminated

## Task 8: Array Typing Issues - extension-e2e.test.ts

### Issue

- `extension-e2e.test.ts` had untyped arrays causing TypeScript compilation errors
- Line 698: `const documents = [];` inferred as `never[]`, causing error when pushing `vscode.TextDocument` objects
- Line 1485: `const documents = [];` inferred as `never[]`, causing error when pushing `{ doc, editor }` objects
- TypeScript compilation errors: `error TS2345: Argument of type 'X' is not assignable to parameter of type 'never'`

### Files Fixed

1. `test/e2e/extension-e2e.test.ts` - 2 arrays (lines 698, 1485)

### Approach

- Used Edit tool to add proper type annotations to both arrays
- Line 698: Added type `vscode.TextDocument[]` for array that holds TextDocument objects
- Line 1485: Created type alias `DocAndEditor` and used `DocAndEditor[]` for array that holds `{ doc, editor }` objects
- Renamed second array to `documentPairs` to match its type and avoid naming conflicts

### Pattern

```typescript
// Before (WRONG - inferred as never[])
const documents = [];
for (const fileName of ['file1.ts', 'file2.js', 'file3.tsx']) {
  const document = await vscode.workspace.openTextDocument(filePath);
  documents.push(document); // ERROR: Type never[]
}

// After (CORRECT - explicit type)
const documents: vscode.TextDocument[] = [];
for (const fileName of ['file1.ts', 'file2.js', 'file3.tsx']) {
  const document = await vscode.workspace.openTextDocument(filePath);
  documents.push(document); // OK
}
```

```typescript
// Before (WRONG - inferred as never[])
const documents = [];
for (const file of files) {
  const doc = await vscode.workspace.openTextDocument(filePath);
  documents.push({ doc, editor: await vscode.window.showTextDocument(doc) }); // ERROR
}

// After (CORRECT - type alias and new name)
type DocAndEditor = { doc: vscode.TextDocument; editor: vscode.TextEditor };
const documentPairs: DocAndEditor[] = [];
for (const file of files) {
  const doc = await vscode.workspace.openTextDocument(filePath);
  documentPairs.push({ doc, editor: await vscode.window.showTextDocument(doc) }); // OK
}
```

### Verification

- TypeScript compilation check: `tsc -p ./tsconfig.test.json 2>&1 | grep "extension-e2e.*error TS2345" | wc -l`
- Result: 0 errors confirmed
- Grep verification: `grep -n "const documents = \[\]" test/e2e/extension-e2e.test.ts` - 0 matches
- Verified both arrays now have proper type annotations

### Key Takeaways

- TypeScript infers empty arrays as `never[]` unless type is explicitly specified
- Use explicit type annotations for arrays to prevent inference errors
- Type aliases improve readability for complex object structures
- Renaming variables when types differ avoids confusion and conflicts
- Arrays holding different object types need appropriate type definitions

## Task 9: Destructuring Pattern Fix

### Pattern: VS Code API Tuple Destructuring
**Issue:** `vscode.languages.getDiagnostics()` returns `[Uri, Diagnostic[]][]` (array of tuples), not objects

**Incorrect Pattern:**
```typescript
const diagnostics = vscode.languages.getDiagnostics();
const fileDiagnostic = diagnostics.find((d) => d.uri.fsPath === testFile);
assert.ok(fileDiagnostic?.range?.length, 'Should have diagnostic');
```

**Correct Pattern:**
```typescript
const diagnostics = vscode.languages.getDiagnostics();
const fileDiagnostic = diagnostics.find(([uri, _diags]) => uri.fsPath === testFile);
const hasDiagnostics = fileDiagnostic?.[1]?.length > 0;
assert.ok(hasDiagnostics, 'Should have diagnostic');
```

**Key Points:**
- Destructure tuples directly in find callback: `([uri, _diags]) => ...`
- Access tuple elements by index: `fileDiagnostic?.[1]` for diagnostics array
- Use `?.` optional chaining for safe access to tuple elements
