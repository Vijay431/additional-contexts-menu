import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ProjectDetectionService } from '../../services/projectDetectionService';

suite('ProjectDetectionService Tests', () => {
  let projectDetectionService: ProjectDetectionService;
  let tempDir: string;

  setup(async () => {
    projectDetectionService = ProjectDetectionService.getInstance();
    tempDir = path.join(__dirname, '../temp-test-projects');
    await fs.ensureDir(tempDir);
  });

  teardown(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    projectDetectionService.clearCache();
  });

  test('Should detect React project correctly', async () => {
    const projectPath = path.join(tempDir, 'react-project');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/react-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);
    await fs.writeFile(path.join(projectPath, 'tsconfig.json'), '{}');

    // Mock workspace folder
    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'react-project',
      index: 0,
    };

    const projectType = await projectDetectionService.detectProjectType(workspaceFolder);

    assert.strictEqual(projectType.isNodeProject, true);
    assert.strictEqual(projectType.hasTypeScript, true);
    assert.strictEqual(projectType.supportLevel, 'full');
    assert.ok(projectType.frameworks.includes('react'));
  });

  test('Should detect Angular project correctly', async () => {
    const projectPath = path.join(tempDir, 'angular-project');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/angular-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);
    await fs.writeFile(path.join(projectPath, 'tsconfig.json'), '{}');

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'angular-project',
      index: 0,
    };

    const projectType = await projectDetectionService.detectProjectType(workspaceFolder);

    assert.strictEqual(projectType.isNodeProject, true);
    assert.strictEqual(projectType.hasTypeScript, true);
    assert.strictEqual(projectType.supportLevel, 'full');
    assert.ok(projectType.frameworks.includes('angular'));
  });

  test('Should detect Express project correctly', async () => {
    const projectPath = path.join(tempDir, 'express-project');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/express-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);
    await fs.writeFile(path.join(projectPath, 'tsconfig.json'), '{}');

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'express-project',
      index: 0,
    };

    const projectType = await projectDetectionService.detectProjectType(workspaceFolder);

    assert.strictEqual(projectType.isNodeProject, true);
    assert.strictEqual(projectType.hasTypeScript, true);
    assert.strictEqual(projectType.supportLevel, 'full');
    assert.ok(projectType.frameworks.includes('express'));
  });

  test('Should detect Next.js project correctly', async () => {
    const projectPath = path.join(tempDir, 'nextjs-project');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/nextjs-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);
    await fs.writeFile(path.join(projectPath, 'tsconfig.json'), '{}');

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'nextjs-project',
      index: 0,
    };

    const projectType = await projectDetectionService.detectProjectType(workspaceFolder);

    assert.strictEqual(projectType.isNodeProject, true);
    assert.strictEqual(projectType.hasTypeScript, true);
    assert.strictEqual(projectType.supportLevel, 'full');
    assert.ok(projectType.frameworks.includes('nextjs'));
    assert.ok(projectType.frameworks.includes('react'));
  });

  test('Should detect non-Node.js project correctly', async () => {
    const projectPath = path.join(tempDir, 'python-project');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/non-nodejs-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'python-project',
      index: 0,
    };

    const projectType = await projectDetectionService.detectProjectType(workspaceFolder);

    assert.strictEqual(projectType.isNodeProject, false);
    assert.strictEqual(projectType.hasTypeScript, false);
    assert.strictEqual(projectType.supportLevel, 'none');
    assert.strictEqual(projectType.frameworks.length, 0);
  });

  test('Should handle project without package.json', async () => {
    const projectPath = path.join(tempDir, 'no-package-project');
    await fs.ensureDir(projectPath);

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'no-package-project',
      index: 0,
    };

    const projectType = await projectDetectionService.detectProjectType(workspaceFolder);

    assert.strictEqual(projectType.isNodeProject, false);
    assert.strictEqual(projectType.hasTypeScript, false);
    assert.strictEqual(projectType.supportLevel, 'none');
    assert.strictEqual(projectType.frameworks.length, 0);
  });

  test('Should cache project detection results', async () => {
    const projectPath = path.join(tempDir, 'cache-test-project');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/react-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'cache-test-project',
      index: 0,
    };

    // First call
    const startTime = Date.now();
    const result1 = await projectDetectionService.detectProjectType(workspaceFolder);
    const firstCallTime = Date.now() - startTime;

    // Second call (should be cached)
    const startTime2 = Date.now();
    const result2 = await projectDetectionService.detectProjectType(workspaceFolder);
    const secondCallTime = Date.now() - startTime2;

    // Results should be identical
    assert.deepStrictEqual(result1, result2);

    // Second call should be significantly faster (cached)
    assert.ok(secondCallTime < firstCallTime);
  });

  test('Should clear cache when requested', async () => {
    const projectPath = path.join(tempDir, 'clear-cache-test');
    await fs.ensureDir(projectPath);

    const packageJsonContent = await fs.readFile(
      path.join(__dirname, '../fixtures/react-package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(projectPath, 'package.json'), packageJsonContent);

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(projectPath),
      name: 'clear-cache-test',
      index: 0,
    };

    // Cache the result
    await projectDetectionService.detectProjectType(workspaceFolder);

    // Clear cache
    projectDetectionService.clearCache();

    // Should work after cache clear
    const result = await projectDetectionService.detectProjectType(workspaceFolder);
    assert.strictEqual(result.isNodeProject, true);
  });
});
