import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

/**
 * Temporary Verification Test for Lint-Staged Configuration Generator Service
 *
 * This test verifies that the LintStagedConfigGeneratorService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Can generate lint-staged configuration from predefined templates
 * 4. Supports various framework templates (JavaScript, TypeScript, React, Vue, etc.)
 * 5. Generates valid JSON configuration
 */
suite('Lint-Staged Configuration Generator - Verification Test', () => {
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
    tempWorkspace = path.join(__dirname, '../temp-workspace-lintstaged');
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

  test('LintStagedConfigGeneratorService should be importable', async () => {
    // Try to import the service
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');

    assert.ok(LintStagedConfigGeneratorService, 'LintStagedConfigGeneratorService should be defined');
    assert.strictEqual(typeof LintStagedConfigGeneratorService.getInstance, 'function', 'getInstance should be a function');
  });

  test('LintStagedConfigGeneratorService should have correct interface', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');
    assert.strictEqual(typeof service.generateLintStagedConfig, 'function', 'generateLintStagedConfig method should exist');
    assert.strictEqual(
      typeof service.generateLintStagedConfigFromTemplate,
      'function',
      'generateLintStagedConfigFromTemplate method should exist',
    );
  });

  test('LintStagedConfigGeneratorService should generate JavaScript template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'js-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-js-project',
        version: '1.0.0',
      }),
    );

    // Create a sample JS file
    await fs.writeFile(path.join(projectDir, 'index.js'), 'console.log("Hello World");');

    // Open the project in VS Code
    const uri = vscode.Uri.file(projectDir);
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });

    // Wait for folder to open
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('javascript');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify JavaScript-specific patterns
    assert.ok(config['*.js'] || config['*.jsx'], 'Should have patterns for JS files');
  });

  test('LintStagedConfigGeneratorService should generate TypeScript template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'ts-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with TypeScript
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-ts-project',
        version: '1.0.0',
        devDependencies: {
          typescript: '^5.0.0',
        },
      }),
    );

    // Create a sample TS file
    await fs.writeFile(path.join(projectDir, 'index.ts'), 'console.log("Hello World");');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('typescript');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify TypeScript-specific patterns
    assert.ok(config['*.ts'] || config['*.{ts,tsx}'], 'Should have patterns for TS files');
  });

  test('LintStagedConfigGeneratorService should generate React template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'react-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with React
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-react-project',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
        },
      }),
    );

    // Create sample files
    await fs.writeFile(path.join(projectDir, 'App.jsx'), 'export default function App() { return null; }');
    await fs.writeFile(path.join(projectDir, 'App.css'), '.app {}');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('react');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify React-specific patterns
    assert.ok(config['*.{js,jsx,ts,tsx}'] || config['*.css'], 'Should have patterns for React files');
  });

  test('LintStagedConfigGeneratorService should generate Vue template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'vue-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with Vue
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-vue-project',
        version: '1.0.0',
        dependencies: {
          vue: '^3.0.0',
        },
      }),
    );

    // Create sample files
    await fs.writeFile(path.join(projectDir, 'App.vue'), '<template></template>');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('vue');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify Vue-specific patterns
    assert.ok(config['*.vue'] || config['*.{js,ts}'], 'Should have patterns for Vue files');
  });

  test('LintStagedConfigGeneratorService should generate Svelte template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'svelte-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with Svelte
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-svelte-project',
        version: '1.0.0',
        dependencies: {
          svelte: '^4.0.0',
        },
      }),
    );

    // Create sample files
    await fs.writeFile(path.join(projectDir, 'App.svelte'), '<script></script><div></div>');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('svelte');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify Svelte-specific patterns
    assert.ok(config['*.svelte'] || config['*.{js,ts}'], 'Should have patterns for Svelte files');
  });

  test('LintStagedConfigGeneratorService should generate Astro template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'astro-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with Astro
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-astro-project',
        version: '1.0.0',
        dependencies: {
          astro: '^4.0.0',
        },
      }),
    );

    // Create sample files
    await fs.writeFile(path.join(projectDir, 'index.astro'), '---\n---\n<div></div>');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('astro');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify Astro-specific patterns
    assert.ok(config['*.astro'], 'Should have patterns for Astro files');
  });

  test('LintStagedConfigGeneratorService should generate Next.js template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'nextjs-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with Next.js
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-nextjs-project',
        version: '1.0.0',
        dependencies: {
          next: '^14.0.0',
        },
      }),
    );

    // Create sample files
    await fs.writeFile(path.join(projectDir, 'page.tsx'), 'export default function Page() { return null; }');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('nextjs');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify Next.js-specific patterns
    assert.ok(config['*.{js,jsx,ts,tsx}'] || config['*.css'], 'Should have patterns for Next.js files');
  });

  test('LintStagedConfigGeneratorService should generate Nuxt template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'nuxt-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Create package.json with Nuxt
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'test-nuxt-project',
        version: '1.0.0',
        dependencies: {
          nuxt: '^3.0.0',
        },
      }),
    );

    // Create sample files
    await fs.writeFile(path.join(projectDir, 'app.vue'), '<template></template>');

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('nuxt');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Verify Nuxt-specific patterns
    assert.ok(config['*.{js,ts,vue}'] || config['*.css'], 'Should have patterns for Nuxt files');
  });

  test('LintStagedConfigGeneratorService should generate Minimal template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'minimal-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('minimal');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Minimal template should only have Prettier
    assert.ok(Object.keys(config).length > 0, 'Should have some patterns defined');
  });

  test('LintStagedConfigGeneratorService should generate Comprehensive template', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'comprehensive-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('comprehensive');

    // Verify the config file was created
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(configExists, true, 'Config file should be created');

    // Verify config content is valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Comprehensive template should include many file types
    assert.ok(
      config['*.{js,jsx,ts,tsx}'] || config['*.vue'] || config['*.svelte'] || config['*.astro'],
      'Should have patterns for multiple frameworks',
    );
  });

  test('LintStagedConfigGeneratorService should produce valid JSON', async () => {
    const { LintStagedConfigGeneratorService } = await import('../../src/services/lintStagedConfigGeneratorService');
    const service = LintStagedConfigGeneratorService.getInstance();

    // Create a simple temp project
    const projectDir = path.join(tempWorkspace, 'json-test');
    await fs.mkdir(projectDir, { recursive: true });

    // Generate lint-staged config from template
    await service.generateLintStagedConfigFromTemplate('typescript');

    // Verify the config file was created and is valid JSON
    const configPath = path.join(projectDir, '.lintstagedrc.json');
    const configContent = await fs.readFile(configPath, 'utf-8');

    // This should not throw if JSON is valid
    const config = JSON.parse(configContent);

    assert.ok(typeof config === 'object', 'Config should be an object');
    assert.ok(Object.keys(config).length > 0, 'Config should have at least one pattern');
  });
});
