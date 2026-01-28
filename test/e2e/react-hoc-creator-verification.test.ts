import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

/**
 * Temporary Verification Test for React HOC Creator Service
 *
 * This test verifies that the ReactHocCreatorService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Can generate authentication HOCs
 * 4. Can generate theming HOCs
 * 5. Can generate data-fetching HOCs
 * 6. Can generate custom HOCs
 * 7. Can create HOC files
 */
suite('React HOC Creator - Verification Test', () => {
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
    tempWorkspace = path.join(__dirname, '../temp-workspace-react-hoc');
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

  test('ReactHocCreatorService should be importable', async () => {
    // Try to import the service
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    assert.ok(ReactHocCreatorService, 'ReactHocCreatorService should be defined');
    assert.strictEqual(typeof ReactHocCreatorService.getInstance, 'function', 'getInstance should be a function');
  });

  test('ReactHocCreatorService should have correct interface', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');
    const service = ReactHocCreatorService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');

    // Verify key methods exist
    const requiredMethods = [
      'generateHoc',
      'createHocFile',
      'hocFileExists',
      'getGeneratorOptions',
    ];

    for (const method of requiredMethods) {
      assert.strictEqual(
        typeof (service as any)[method],
        'function',
        `Service should have ${method} method`
      );
    }
  });

  test('ReactHocCreatorService should generate authentication HOC', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const options = {
      hocName: 'withAuthentication',
      hocType: 'authentication' as const,
      includeTypeScript: true,
      includeJSDoc: true,
      includeHooks: true,
      forwardRef: true,
      displayName: true,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.strictEqual(result.hocName, 'withAuthentication', 'HOC name should match');
    assert.ok(result.hocCode.includes('function withAuthentication'), 'Should have HOC function');
    assert.ok(result.hocCode.includes('isAuthenticated'), 'Should include auth props');
    assert.ok(result.hocCode.includes('user'), 'Should include user prop');
    assert.ok(result.hocCode.includes('login'), 'Should include login function');
    assert.ok(result.hocCode.includes('logout'), 'Should include logout function');
  });

  test('ReactHocCreatorService should generate theming HOC', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const options = {
      hocName: 'withTheme',
      hocType: 'theming' as const,
      includeTypeScript: true,
      includeJSDoc: true,
      includeHooks: false,
      forwardRef: true,
      displayName: true,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.strictEqual(result.hocName, 'withTheme', 'HOC name should match');
    assert.ok(result.hocCode.includes('function withTheme'), 'Should have HOC function');
    assert.ok(result.hocCode.includes('theme'), 'Should include theme prop');
    assert.ok(result.hocCode.includes('toggleTheme'), 'Should include toggleTheme function');
    assert.ok(result.hocCode.includes('setTheme'), 'Should include setTheme function');
  });

  test('ReactHocCreatorService should generate data-fetching HOC', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const options = {
      hocName: 'withData',
      hocType: 'data-fetching' as const,
      includeTypeScript: true,
      includeJSDoc: true,
      includeHooks: false,
      forwardRef: false,
      displayName: true,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.strictEqual(result.hocName, 'withData', 'HOC name should match');
    assert.ok(result.hocCode.includes('function withData'), 'Should have HOC function');
    assert.ok(result.hocCode.includes('useState'), 'Should include useState');
    assert.ok(result.hocCode.includes('useEffect'), 'Should include useEffect');
    assert.ok(result.hocCode.includes('data'), 'Should include data prop');
    assert.ok(result.hocCode.includes('loading'), 'Should include loading prop');
    assert.ok(result.hocCode.includes('error'), 'Should include error prop');
    assert.ok(result.hocCode.includes('refetch'), 'Should include refetch function');
  });

  test('ReactHocCreatorService should generate custom HOC', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const customProps = [
      { name: 'customValue', type: 'string', isRequired: true },
      { name: 'isEnabled', type: 'boolean', isRequired: false },
    ];

    const options = {
      hocName: 'withCustom',
      hocType: 'custom' as const,
      includeTypeScript: true,
      includeJSDoc: false,
      includeHooks: false,
      forwardRef: false,
      displayName: false,
      propsToInject: customProps,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.strictEqual(result.hocName, 'withCustom', 'HOC name should match');
    assert.ok(result.hocCode.includes('function withCustom'), 'Should have HOC function');
    assert.ok(result.hocCode.includes('customValue'), 'Should include customValue prop');
    assert.ok(result.hocCode.includes('isEnabled'), 'Should include isEnabled prop');
  });

  test('ReactHocCreatorService should generate HOC without TypeScript', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const options = {
      hocName: 'withAuth',
      hocType: 'authentication' as const,
      includeTypeScript: false,
      includeJSDoc: false,
      includeHooks: false,
      forwardRef: false,
      displayName: false,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.jsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.strictEqual(result.hasTypeScript, false, 'Should not have TypeScript');
    assert.ok(!result.hocCode.includes('interface '), 'Should not include interfaces');
    assert.ok(!result.hocCode.includes(': '), 'Should not include type annotations');
  });

  test('ReactHocCreatorService should create HOC file', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const testFile = path.join(tempWorkspace, 'hocs', 'withAuth.authentication.ts');
    const testCode = `
import React from 'react';

function withAuthentication(WrappedComponent) {
  const WithHOC = (props) => {
    const injectedProps = {
      isAuthenticated: false,
      user: null,
    };
    return <WrappedComponent {...injectedProps} {...props} />;
  };
  return WithHOC;
}

export default withAuthentication;
    `;

    const service = ReactHocCreatorService.getInstance();
    await service.createHocFile(testFile, testCode);

    // Verify file was created
    const exists = await service.hocFileExists(testFile);
    assert.ok(exists, 'HOC file should exist');

    // Read and verify content
    const content = await fs.readFile(testFile, 'utf-8');
    assert.ok(content.includes('withAuthentication'), 'File should contain HOC');
  });

  test('ReactHocCreatorService should check if HOC file exists', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const service = ReactHocCreatorService.getInstance();

    // Test non-existent file
    const nonExistentFile = path.join(tempWorkspace, 'non-existent.ts');
    const exists1 = await service.hocFileExists(nonExistentFile);
    assert.strictEqual(exists1, false, 'Non-existent file should return false');

    // Test existing file
    const existingFile = path.join(tempWorkspace, 'existing.ts');
    await fs.writeFile(existingFile, '// test');
    const exists2 = await service.hocFileExists(existingFile);
    assert.strictEqual(exists2, true, 'Existing file should return true');
  });

  test('ReactHocCreatorService should generate HOC with forwardRef', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const options = {
      hocName: 'withForwardRef',
      hocType: 'custom' as const,
      includeTypeScript: true,
      includeJSDoc: false,
      includeHooks: false,
      forwardRef: true,
      displayName: true,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.ok(result.hocCode.includes('forwardRef'), 'Should include forwardRef');
    assert.ok(result.hocCode.includes('ref={ref}'), 'Should forward ref to wrapped component');
  });

  test('ReactHocCreatorService should generate HOC with JSDoc', async () => {
    const { ReactHocCreatorService } = await import('../../src/services/reactHocCreatorService');

    const options = {
      hocName: 'withJSDoc',
      hocType: 'custom' as const,
      includeTypeScript: true,
      includeJSDoc: true,
      includeHooks: false,
      forwardRef: false,
      displayName: false,
    };

    const service = ReactHocCreatorService.getInstance();
    const result = await service.generateHoc(
      {
        fileName: '/test/test.tsx',
        getText: () => '',
      } as any,
      options,
    );

    assert.ok(result, 'Should generate result');
    assert.ok(result.hocCode.includes('/**'), 'Should include JSDoc comment');
    assert.ok(result.hocCode.includes('* @description'), 'Should include description');
    assert.ok(result.hocCode.includes('* @example'), 'Should include example');
  });
});
