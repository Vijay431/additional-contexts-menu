import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FileDiscoveryService } from '../../services/fileDiscoveryService';
import { CompatibleFile } from '../../types/extension';

suite('FileDiscoveryService Tests', () => {
  let fileDiscoveryService: FileDiscoveryService;
  let tempDir: string;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  setup(async () => {
    fileDiscoveryService = FileDiscoveryService.getInstance();
    tempDir = path.join(__dirname, '../temp-workspace');
    await fs.ensureDir(tempDir);

    mockWorkspaceFolder = {
      uri: vscode.Uri.file(tempDir),
      name: 'test-workspace',
      index: 0,
    };

    // Mock vscode.workspace.workspaceFolders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [mockWorkspaceFolder],
      configurable: true,
    });
  });

  teardown(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    fileDiscoveryService.clearCache();
  });

  async function createTestFiles() {
    // Create TypeScript files
    await fs.writeFile(
      path.join(tempDir, 'component.tsx'),
      'export default function Component() {}'
    );
    await fs.writeFile(path.join(tempDir, 'service.ts'), 'export class Service {}');
    await fs.writeFile(path.join(tempDir, 'utils.ts'), 'export function utils() {}');

    // Create JavaScript files
    await fs.writeFile(path.join(tempDir, 'script.js'), 'function script() {}');
    await fs.writeFile(
      path.join(tempDir, 'component.jsx'),
      'export default function Component() {}'
    );

    // Create subdirectory with files
    await fs.ensureDir(path.join(tempDir, 'src'));
    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'export * from "./app";');
    await fs.writeFile(path.join(tempDir, 'src', 'app.tsx'), 'export default function App() {}');

    // Create files that should be ignored
    await fs.ensureDir(path.join(tempDir, 'node_modules'));
    await fs.writeFile(path.join(tempDir, 'node_modules', 'ignored.ts'), 'ignored file');

    // Create other file types
    await fs.writeFile(path.join(tempDir, 'styles.css'), '.test {}');
    await fs.writeFile(path.join(tempDir, 'readme.md'), '# Test');
  }

  test('Should find compatible TypeScript files for .ts extension', async () => {
    await createTestFiles();

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.ts');

    assert.ok(compatibleFiles.length >= 4); // At least 4 .ts/.tsx files

    const fileNames = compatibleFiles.map((f) => path.basename(f.path));
    assert.ok(fileNames.includes('service.ts'));
    assert.ok(fileNames.includes('utils.ts'));
    assert.ok(fileNames.includes('component.tsx'));
    assert.ok(fileNames.includes('index.ts'));
    assert.ok(fileNames.includes('app.tsx'));

    // Should not include JavaScript files
    assert.ok(!fileNames.includes('script.js'));
    assert.ok(!fileNames.includes('component.jsx'));

    // Should not include ignored files from node_modules
    assert.ok(!fileNames.includes('ignored.ts'));
  });

  test('Should find compatible JavaScript files for .js extension', async () => {
    await createTestFiles();

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.js');

    assert.ok(compatibleFiles.length >= 2); // At least 2 .js/.jsx files

    const fileNames = compatibleFiles.map((f) => path.basename(f.path));
    assert.ok(fileNames.includes('script.js'));
    assert.ok(fileNames.includes('component.jsx'));

    // Should not include TypeScript files
    assert.ok(!fileNames.includes('service.ts'));
    assert.ok(!fileNames.includes('component.tsx'));
  });

  test('Should include relative paths correctly', async () => {
    await createTestFiles();

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.ts');

    const srcFiles = compatibleFiles.filter((f) => f.relativePath.includes('src'));
    assert.ok(srcFiles.length >= 2);

    const indexFile = compatibleFiles.find((f) => f.name === 'index.ts');
    assert.ok(indexFile);
    assert.strictEqual(indexFile.relativePath, path.join('src', 'index.ts'));
  });

  test('Should sort files by modification time', async () => {
    await createTestFiles();

    // Create a new file after a small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
    await fs.writeFile(path.join(tempDir, 'newer-file.ts'), 'export const newer = true;');

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.ts');

    // First file should be the newest one
    assert.strictEqual(path.basename(compatibleFiles[0]!.path), 'newer-file.ts');
  });

  test('Should validate file extension compatibility correctly', () => {
    // TypeScript compatibility
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.ts'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.tsx'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.tsx', '.ts'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.tsx', '.tsx'), true);

    // JavaScript compatibility
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.js', '.js'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.js', '.jsx'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.jsx', '.js'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.jsx', '.jsx'), true);

    // Cross-language incompatibility
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.js'), false);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.js', '.ts'), false);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.tsx', '.jsx'), false);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.jsx', '.tsx'), false);

    // Other extensions
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.css', '.css'), true);
    assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.css', '.scss'), false);
  });

  test('Should validate target file existence and permissions', async () => {
    await createTestFiles();

    const existingFile = path.join(tempDir, 'service.ts');
    const nonExistentFile = path.join(tempDir, 'non-existent.ts');

    const existingFileValid = await fileDiscoveryService.validateTargetFile(existingFile);
    const nonExistentFileValid = await fileDiscoveryService.validateTargetFile(nonExistentFile);

    assert.strictEqual(existingFileValid, true);
    assert.strictEqual(nonExistentFileValid, false);
  });

  test('Should handle empty workspace gracefully', async () => {
    // Mock empty workspace
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: undefined,
      configurable: true,
    });

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.ts');

    assert.strictEqual(compatibleFiles.length, 0);
  });

  test('Should cache file discovery results', async () => {
    await createTestFiles();

    // First call
    const startTime = Date.now();
    const result1 = await fileDiscoveryService.getCompatibleFiles('.ts');
    const firstCallTime = Date.now() - startTime;

    // Second call (should be cached)
    const startTime2 = Date.now();
    const result2 = await fileDiscoveryService.getCompatibleFiles('.ts');
    const secondCallTime = Date.now() - startTime2;

    // Results should be identical
    assert.deepStrictEqual(result1, result2);

    // Second call should be significantly faster (cached)
    assert.ok(secondCallTime < firstCallTime);
  });

  test('Should clear cache when requested', async () => {
    await createTestFiles();

    // Cache the result
    await fileDiscoveryService.getCompatibleFiles('.ts');

    // Clear cache
    fileDiscoveryService.clearCache();

    // Should work after cache clear
    const result = await fileDiscoveryService.getCompatibleFiles('.ts');
    assert.ok(result.length > 0);
  });

  test('Should format file list for quick pick correctly', async () => {
    await createTestFiles();

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.ts');

    // Use reflection to access private method for testing
    const formatFileList = (
      fileDiscoveryService as unknown as { formatFileList: (files: CompatibleFile[]) => unknown[] }
    ).formatFileList.bind(fileDiscoveryService);
    const quickPickItems = formatFileList(compatibleFiles);

    assert.ok(quickPickItems.length > 0);

    const firstItem = quickPickItems[0]! as { label: string; description: string; detail: string; filePath: string };
    assert.ok(firstItem.label); // Should have a label (filename)
    assert.ok(firstItem.description !== undefined); // Should have description (directory)
    assert.ok(firstItem.detail); // Should have detail (workspace info)
    assert.ok(firstItem.filePath); // Should have full file path

    // Check that the file path is absolute
    assert.ok(path.isAbsolute(firstItem.filePath));

    // Ensure all items have the required properties
    quickPickItems.forEach((item: unknown) => {
      const typedItem = item as { label: string; filePath: string };
      assert.ok(typedItem.label);
      assert.ok(typedItem.filePath);
    });
  });

  test('Should handle files with same name in different directories', async () => {
    await createTestFiles();

    // Create files with same name in different directories
    await fs.ensureDir(path.join(tempDir, 'components'));
    await fs.ensureDir(path.join(tempDir, 'services'));

    await fs.writeFile(
      path.join(tempDir, 'components', 'index.ts'),
      'export * from "./component";'
    );
    await fs.writeFile(path.join(tempDir, 'services', 'index.ts'), 'export * from "./service";');

    const compatibleFiles = await fileDiscoveryService.getCompatibleFiles('.ts');

    const indexFiles = compatibleFiles.filter((f) => f.name === 'index.ts');
    assert.ok(indexFiles.length >= 3); // At least 3 index.ts files

    // Each should have different relative paths
    const relativePaths = indexFiles.map((f) => f.relativePath);
    const uniquePaths = new Set(relativePaths);
    assert.strictEqual(relativePaths.length, uniquePaths.size);
  });
});
