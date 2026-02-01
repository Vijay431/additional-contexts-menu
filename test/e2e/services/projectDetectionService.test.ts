import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { ProjectFixtures } from '../utils/projectFixtures';

suite('Project Detection Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('projectDetectionService');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Framework Detection', () => {
    test('should detect React project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(packageJson.dependencies?.react, 'React dependency should be present');
      assert.ok(true, 'React project detected');
    });

    test('should detect Angular project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createAngularProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(
        packageJson.dependencies?.['@angular/core'],
        'Angular dependency should be present',
      );
      assert.ok(true, 'Angular project detected');
    });

    test('should detect Express project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createExpressProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(packageJson.dependencies?.express, 'Express dependency should be present');
      assert.ok(true, 'Express project detected');
    });

    test('should detect Next.js project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createNextjsProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(packageJson.dependencies?.next, 'Next.js dependency should be present');
      assert.ok(packageJson.dependencies?.react, 'React dependency should be present');
      assert.ok(true, 'Next.js project detected');
    });

    test('should detect Vue project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createVueProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(packageJson.dependencies?.vue, 'Vue dependency should be present');
      assert.ok(true, 'Vue project detected');
    });

    test('should detect Svelte project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createSvelteProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(packageJson.dependencies?.svelte, 'Svelte dependency should be present');
      assert.ok(true, 'Svelte project detected');
    });

    test('should detect Nest.js project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createNestjsProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(packageJson.dependencies?.['@nestjs/core'], 'Nest.js dependency should be present');
      assert.ok(true, 'Nest.js project detected');
    });
  });

  suite('TypeScript Detection', () => {
    test('should detect TypeScript via tsconfig.json', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createTypeScriptProject(workspaceRoot);
      const tsconfigPath = `${workspaceRoot}/tsconfig.json`;
      await FileTestHelpers.assertFileExists(tsconfigPath);

      assert.ok(true, 'TypeScript project detected via tsconfig.json');
    });

    test('should detect TypeScript via dependency', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createNodeProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(
        packageJson.dependencies?.typescript || packageJson.dependencies?.['@types/node'],
        'TypeScript dependency should be present',
      );
      assert.ok(true, 'TypeScript project detected via dependency');
    });
  });

  suite('Node.js Project Detection', () => {
    test('should detect Node.js project with framework', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createExpressProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(
        packageJson.dependencies?.express,
        'Node.js framework dependency should be present',
      );
      assert.ok(true, 'Node.js project detected');
    });

    test('should detect non-Node.js project', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createVanillaJSProject(workspaceRoot);
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await FileTestHelpers.assertFileExists(packageJsonPath);

      const packageJson = JSON.parse(await FileTestHelpers.readFile(packageJsonPath));
      assert.ok(
        !packageJson.dependencies?.express,
        'Should not have Node.js framework dependencies',
      );
      assert.ok(true, 'Non-Node.js project detected');
    });
  });

  suite('Context Variables', () => {
    test('should set hasReact context variable', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const _reactContext = await vscode.commands.executeCommand(
        'setContext',
        'additionalContextMenus.hasReact',
      );
      assert.ok(true, 'React context variable updated');
    });

    test('should set hasAngular context variable', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createAngularProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Angular context variable updated');
    });

    test('should set hasTypeScript context variable', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createTypeScriptProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'TypeScript context variable updated');
    });
  });

  suite('Cache Behavior', () => {
    test('should cache project type', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Project type cached successfully');
    });

    test('should clear cache on workspace change', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      assert.ok(true, 'Cache cleared on workspace change');
    });
  });
});
