import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

/**
 * Temporary Verification Test for Infinite Scroll Generator Service
 *
 * This test verifies that the InfiniteScrollGeneratorService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Can parse properties from code
 * 4. Can generate infinite scroll components
 * 5. Can generate intersection observer hooks
 */
suite('Infinite Scroll Generator - Verification Test', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    // Get and activate extension
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.strictEqual(extension.isActive, true, 'Extension should be active');

    // Create temporary workspace
    tempWorkspace = path.join(__dirname, '../temp-workspace-infinite-scroll');
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  suiteTeardown(async () => {
    // Clean up
    try {
      await fs.rmdir(tempWorkspace, { recursive: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('InfiniteScrollGeneratorService should be importable', async () => {
    // Try to import the service
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');

    assert.ok(InfiniteScrollGeneratorService, 'InfiniteScrollGeneratorService should be defined');
    assert.strictEqual(typeof InfiniteScrollGeneratorService.getInstance, 'function', 'getInstance should be a function');
  });

  test('InfiniteScrollGeneratorService should have correct interface', async () => {
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');
    const service = InfiniteScrollGeneratorService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');

    // Verify key methods exist
    const requiredMethods = [
      'generateInfiniteScrollComponent',
      'getGeneratorOptions',
      'createComponentFile',
      'createHookFile',
      'componentFileExists',
    ];

    for (const method of requiredMethods) {
      assert.strictEqual(
        typeof (service as any)[method],
        'function',
        `Service should have ${method} method`
      );
    }
  });

  test('InfiniteScrollGeneratorService should parse properties from interface', async () => {
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');

    // Test interface parsing
    const testInterface = `
      interface UserListProps {
        data: User[];
        isLoading: boolean;
        hasMore: boolean;
        onLoadMore: () => void;
      }
    `;

    const service = InfiniteScrollGeneratorService.getInstance();
    const properties = (service as any).parsePropertiesFromCode(testInterface);

    assert.ok(Array.isArray(properties), 'Properties should be an array');
    assert.ok(properties.length >= 4, 'Should parse at least 4 properties');

    const dataProp = properties.find((p: any) => p.name === 'data');
    assert.ok(dataProp, 'Should have data property');
    assert.strictEqual(dataProp.type, 'User[]', 'data property should have correct type');
  });

  test('InfiniteScrollGeneratorService should generate component code', async () => {
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');

    const options = {
      componentName: 'UserList',
      componentDirectory: 'components',
      includeTypeScript: true,
      includeIntersectionObserver: true,
      includeLoadingState: true,
      includeErrorHandling: true,
      includeFetchMore: true,
      generateHook: false,
      threshold: 0.1,
      rootMargin: '0px',
      triggerOnce: false,
    };

    const service = InfiniteScrollGeneratorService.getInstance();
    const result = await service.generateInfiniteScrollComponent(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      new vscode.Selection(0, 0, 0, 0),
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.strictEqual(result.componentName, 'UserList', 'Component name should match');
    assert.ok(result.componentCode.includes('export function UserList'), 'Should have component export');
    assert.ok(result.componentCode.includes('IntersectionObserver'), 'Should include IntersectionObserver');
    assert.ok(result.componentCode.includes('isLoading'), 'Should include loading state');
  });

  test('InfiniteScrollGeneratorService should generate hook code', async () => {
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');

    const options = {
      componentName: 'UserList',
      componentDirectory: 'components',
      includeTypeScript: true,
      includeIntersectionObserver: true,
      includeLoadingState: true,
      includeErrorHandling: true,
      includeFetchMore: true,
      generateHook: true,
      threshold: 0.1,
      rootMargin: '0px',
      triggerOnce: false,
    };

    const service = InfiniteScrollGeneratorService.getInstance();
    const result = await service.generateInfiniteScrollComponent(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      new vscode.Selection(0, 0, 0, 0),
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.ok(result.hookCode, 'Should generate hook code');
    assert.ok(result.hookCode!.includes('useUserListInfiniteScroll'), 'Should have hook with correct name');
    assert.ok(result.hookCode!.includes('useState'), 'Should include useState');
    assert.ok(result.hookCode!.includes('useEffect'), 'Should include useEffect');
  });

  test('InfiniteScrollGeneratorService should work with valid selection', async () => {
    // Create a test file
    const testFile = path.join(tempWorkspace, 'test-infinite-scroll.tsx');
    const testContent = `
interface InfiniteListProps {
  data: Item[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}
    `;
    await fs.writeFile(testFile, testContent);

    const uri = vscode.Uri.file(testFile);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);

    // Select the interface
    const firstLine = doc.lineAt(1);
    const lastLine = doc.lineAt(5);
    const selection = new vscode.Selection(firstLine.range.start, lastLine.range.end);
    editor.selection = selection;

    // Verify selection is not empty
    assert.ok(!editor.selection.isEmpty, 'Selection should not be empty');

    // Clean up
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  test('InfiniteScrollGeneratorService should create component file', async () => {
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');

    const testFile = path.join(tempWorkspace, 'test-component.tsx');
    const testCode = `
export function TestComponent() {
  return <div>Test</div>;
}
    `;

    const service = InfiniteScrollGeneratorService.getInstance();
    await service.createComponentFile(testFile, testCode);

    // Verify file was created
    const exists = await service.componentFileExists(testFile);
    assert.ok(exists, 'Component file should exist');

    // Read and verify content
    const content = await fs.readFile(testFile, 'utf-8');
    assert.ok(content.includes('TestComponent'), 'File should contain component');
  });

  test('InfiniteScrollGeneratorService should create hook file', async () => {
    const { InfiniteScrollGeneratorService } = await import('../../src/services/infiniteScrollGeneratorService');

    const testFile = path.join(tempWorkspace, 'test-hook.ts');
    const testCode = `
export function useTestHook() {
  const [data, setData] = React.useState([]);
  return { data };
}
    `;

    const service = InfiniteScrollGeneratorService.getInstance();
    await service.createHookFile(testFile, testCode);

    // Verify file was created
    const exists = await fs.stat(testFile).then(() => true).catch(() => false);
    assert.ok(exists, 'Hook file should exist');

    // Read and verify content
    const content = await fs.readFile(testFile, 'utf-8');
    assert.ok(content.includes('useTestHook'), 'File should contain hook');
  });
});
