#!/usr/bin/env tsx

/**
 * Creates a minimal extension package for VS Code testing
 * Reduces extension size from ~250MB to ~1MB by copying only essential files
 */

import * as fs from 'fs';
import * as path from 'path';

interface PackageJson {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  license?: string;
  publisher?: string;
  icon?: string;
  author?: unknown;
  repository?: unknown;
  bugs?: unknown;
  homepage?: string;
  keywords?: string[];
  categories?: string[];
  engines?: unknown;
  activationEvents?: string[];
  contributes?: unknown;
  main?: string;
  [key: string]: unknown;
}

class MinimalExtensionCreator {
  private readonly projectRoot: string;
  private readonly minimalExtensionPath: string;
  private readonly essentialFiles: string[];

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.minimalExtensionPath = path.join(this.projectRoot, '.vscode-test', 'minimal-extension');
    this.essentialFiles = ['README.md', 'LICENSE', 'logo.png'];
  }

  /**
   * Creates the minimal extension package
   */
  async create(): Promise<void> {
    try {
      console.log('🚀 Creating minimal extension package...');

      // Clean and create minimal extension directory
      await this.cleanAndCreateDirectory();

      // Copy essential files
      await this.copyEssentialFiles();

      // Create minimal package.json
      await this.createMinimalPackageJson();

      // Copy compiled extension
      await this.copyCompiledExtension();

      console.log('✅ Minimal extension package created successfully!');
      console.log(`📁 Location: ${this.minimalExtensionPath}`);

      // Show space savings
      await this.showSpaceSavings();
    } catch (error) {
      console.error('❌ Failed to create minimal extension package:', (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * Clean and create the minimal extension directory
   */
  private async cleanAndCreateDirectory(): Promise<void> {
    // Remove existing minimal extension if it exists
    if (fs.existsSync(this.minimalExtensionPath)) {
      console.log('🧹 Cleaning existing minimal extension...');
      fs.rmSync(this.minimalExtensionPath, { recursive: true, force: true });
    }

    // Create directory structure
    fs.mkdirSync(this.minimalExtensionPath, { recursive: true });
    fs.mkdirSync(path.join(this.minimalExtensionPath, 'dist'), { recursive: true });
  }

  /**
   * Copy essential files to minimal extension
   */
  private async copyEssentialFiles(): Promise<void> {
    console.log('📄 Copying essential files...');

    for (const file of this.essentialFiles) {
      const sourcePath = path.join(this.projectRoot, file);
      const targetPath = path.join(this.minimalExtensionPath, file);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`   ✓ ${file}`);
      } else {
        console.log(`   ⚠️  ${file} not found, skipping...`);
      }
    }
  }

  /**
   * Create minimal package.json with only runtime dependencies
   */
  private async createMinimalPackageJson(): Promise<void> {
    console.log('📦 Creating minimal package.json...');

    const originalPackageJson: PackageJson = JSON.parse(
      fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'),
    );

    // Create minimal package.json with only essential fields
    const minimalPackageJson = {
      name: originalPackageJson.name,
      displayName: originalPackageJson.displayName,
      description: originalPackageJson.description,
      version: originalPackageJson.version,
      license: originalPackageJson.license,
      publisher: originalPackageJson.publisher,
      icon: originalPackageJson.icon,
      author: originalPackageJson.author,
      repository: originalPackageJson.repository,
      bugs: originalPackageJson.bugs,
      homepage: originalPackageJson.homepage,
      keywords: originalPackageJson.keywords,
      categories: originalPackageJson.categories,
      engines: originalPackageJson.engines,
      activationEvents: originalPackageJson.activationEvents,
      contributes: originalPackageJson.contributes,
      main: originalPackageJson.main,
      // Note: Deliberately exclude devDependencies, scripts, and other dev-only fields
    } as PackageJson;

    fs.writeFileSync(
      path.join(this.minimalExtensionPath, 'package.json'),
      JSON.stringify(minimalPackageJson, null, 2),
    );

    console.log('   ✓ Minimal package.json created (excluded devDependencies and build scripts)');
  }

  /**
   * Copy compiled extension file
   */
  private async copyCompiledExtension(): Promise<void> {
    console.log('🔧 Copying compiled extension...');

    const distPath = path.join(this.projectRoot, 'dist');
    const minimalDistPath = path.join(this.minimalExtensionPath, 'dist');

    if (!fs.existsSync(distPath)) {
      throw new Error('dist directory not found. Please run "npm run build" first.');
    }

    // Copy main extension file
    const extensionFile = path.join(distPath, 'extension.js');
    if (fs.existsSync(extensionFile)) {
      fs.copyFileSync(extensionFile, path.join(minimalDistPath, 'extension.js'));
      console.log('   ✓ dist/extension.js');
    } else {
      throw new Error('dist/extension.js not found. Please run "npm run build" first.');
    }

    // Copy source maps if they exist (helpful for debugging)
    const sourceMapFile = path.join(distPath, 'extension.js.map');
    if (fs.existsSync(sourceMapFile)) {
      fs.copyFileSync(sourceMapFile, path.join(minimalDistPath, 'extension.js.map'));
      console.log('   ✓ dist/extension.js.map');
    }
  }

  /**
   * Show space savings comparison
   */
  private async showSpaceSavings(): Promise<void> {
    try {
      const originalSize = await this.getDirectorySize(this.projectRoot, [
        'node_modules',
        '.git',
        '.vscode-test',
        'dist/test',
      ]);
      const minimalSize = await this.getDirectorySize(this.minimalExtensionPath);

      const savings = (((originalSize - minimalSize) / originalSize) * 100).toFixed(1);

      console.log('\n📊 Space Optimization Results:');
      console.log(`   Original extension: ${this.formatBytes(originalSize)}`);
      console.log(`   Minimal extension:  ${this.formatBytes(minimalSize)}`);
      console.log(
        `   Space saved:        ${savings}% (${this.formatBytes(originalSize - minimalSize)})`,
      );
    } catch {
      console.log('   ℹ️  Space calculation skipped (calculation error)');
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string, excludeDirs: string[] = []): Promise<number> {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          totalSize += await this.getDirectorySize(itemPath, excludeDirs);
        }
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Run the script
if (require.main === module) {
  const creator = new MinimalExtensionCreator();
  creator.create().catch(console.error);
}

export default MinimalExtensionCreator;
