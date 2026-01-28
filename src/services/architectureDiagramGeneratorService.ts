import * as path from 'path';
import * as vscode from 'vscode';

import {
  ArchitectureDiagramConfig,
  ArchitectureDiagramResult,
  DependencyEdge,
  ModuleNode,
} from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Architecture Diagram Generator Service
 *
 * Analyzes project structure and generates architecture diagrams showing:
 * - Module dependencies
 * - File relationships
 * - Data flow
 * - Exports to Mermaid or PlantUML formats
 */
export class ArchitectureDiagramGeneratorService {
  private static instance: ArchitectureDiagramGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ArchitectureDiagramGeneratorService {
    ArchitectureDiagramGeneratorService.instance ??= new ArchitectureDiagramGeneratorService();
    return ArchitectureDiagramGeneratorService.instance;
  }

  /**
   * Generate architecture diagram for the current workspace
   */
  public async generateDiagram(
    workspaceFolder: vscode.WorkspaceFolder,
    config: ArchitectureDiagramConfig,
  ): Promise<ArchitectureDiagramResult> {
    const startTime = Date.now();

    try {
      // Discover modules in the workspace
      const modules = await this.discoverModules(workspaceFolder, config);

      // Analyze dependencies between modules
      const dependencies = await this.analyzeDependencies(modules, config);

      // Generate diagram in the requested format
      const diagramCode = this.generateDiagramCode(modules, dependencies, config);

      const analysisDuration = Date.now() - startTime;

      this.logger.info('Architecture diagram generated', {
        moduleCount: modules.length,
        dependencyCount: dependencies.length,
        format: config.outputFormat,
        duration: analysisDuration,
      });

      return {
        workspacePath: workspaceFolder.uri.fsPath,
        modules,
        dependencies,
        diagramCode,
        format: config.outputFormat,
        analysisDuration,
      };
    } catch (error) {
      this.logger.error('Error generating architecture diagram', error);
      throw error;
    }
  }

  /**
   * Discover modules in the workspace based on configuration
   */
  private async discoverModules(
    workspaceFolder: vscode.WorkspaceFolder,
    config: ArchitectureDiagramConfig,
  ): Promise<ModuleNode[]> {
    const excludedDirs = new Set(
      config.excludeDirectories || ['node_modules', 'dist', 'build', '.git'],
    );

    // Find all relevant files
    const filePatterns = config.includePatterns || ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const files = await this.findFiles(workspaceFolder, filePatterns, excludedDirs);

    // Group files into modules based on directory structure
    const moduleMap = new Map<string, ModuleNode>();

    for (const file of files) {
      const relativePath = path.relative(workspaceFolder.uri.fsPath, file.fsPath);
      const dirName = path.dirname(relativePath);
      const moduleName = this.getModuleName(dirName, config.moduleDepth || 2);

      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          id: this.sanitizeId(moduleName),
          name: moduleName,
          path: dirName === '.' ? '/' : `/${dirName}`,
          files: [],
          exports: [],
          imports: [],
        });
      }

      const module = moduleMap.get(moduleName)!;
      module.files.push(relativePath);

      // Extract imports and exports from the file
      const fileContent = await vscode.workspace.fs.readFile(file);
      const content = Buffer.from(fileContent).toString('utf-8');

      const { imports, exports } = this.extractImportsAndExports(content);
      module.imports.push(...imports);
      module.exports.push(...exports);
    }

    return Array.from(moduleMap.values());
  }

  /**
   * Find files matching patterns in the workspace
   */
  private async findFiles(
    workspaceFolder: vscode.WorkspaceFolder,
    patterns: string[],
    excludedDirs: Set<string>,
  ): Promise<vscode.Uri[]> {
    const allFiles: vscode.Uri[] = [];

    for (const pattern of patterns) {
      try {
        const files = await vscode.workspace.findFiles(
          new vscode.RelativePattern(workspaceFolder, pattern),
          `**/{${Array.from(excludedDirs).join(',')}}/**`,
        );
        allFiles.push(...files);
      } catch (error) {
        this.logger.warn(`Failed to find files matching pattern: ${pattern}`, error);
      }
    }

    // Remove duplicates
    const uniqueFiles = Array.from(new Set(allFiles.map((f) => f.fsPath))).map((p) =>
      vscode.Uri.file(p),
    );

    return uniqueFiles;
  }

  /**
   * Get module name from directory path based on depth
   */
  private getModuleName(dirPath: string, depth: number): string {
    if (dirPath === '.') {
      return 'root';
    }

    const parts = dirPath.split(path.sep);
    const relevantParts = parts.slice(-depth);
    return relevantParts.join('/');
  }

  /**
   * Sanitize string for use as ID in diagram formats
   */
  private sanitizeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Extract imports and exports from a file
   */
  private extractImportsAndExports(content: string): { imports: string[]; exports: string[] } {
    const imports: string[] = [];
    const exports: string[] = [];

    const lines = content.split('\n');

    for (const line of lines) {
      // Match import statements
      const importMatch = line.match(/^import\s+(?:(?:\{[^}]*\}|\*)\s+from\s+)?['"]([^'"]+)['"]/);
      if (importMatch && importMatch[1]) {
        const importPath = importMatch[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          imports.push(importPath);
        }
      }

      // Match export statements
      const exportMatch = line.match(
        /^export\s+(?:(?:class|function|interface|type|const)\s+(\w+)|(?:default\s+))/,
      );
      if (exportMatch && exportMatch[1]) {
        exports.push(exportMatch[1]);
      }
    }

    return { imports, exports };
  }

  /**
   * Analyze dependencies between modules
   */
  private async analyzeDependencies(
    modules: ModuleNode[],
    config: ArchitectureDiagramConfig,
  ): Promise<DependencyEdge[]> {
    const dependencies: DependencyEdge[] = [];

    for (const module of modules) {
      for (const importPath of module.imports) {
        // Skip external dependencies if configured
        if (!config.includeExternalDependencies && this.isExternalDependency(importPath)) {
          continue;
        }

        // Find which module this import comes from
        const targetModule = this.findModuleForImport(importPath, modules);

        if (targetModule && targetModule.name !== module.name) {
          const existingEdge = dependencies.find(
            (d) => d.from === module.id && d.to === targetModule.id,
          );

          if (existingEdge) {
            existingEdge.weight++;
          } else {
            dependencies.push({
              from: module.id,
              to: targetModule.id,
              type: this.inferDependencyType(importPath),
              weight: 1,
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Check if import is an external dependency
   */
  private isExternalDependency(importPath: string): boolean {
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  /**
   * Find the module that corresponds to an import path
   */
  private findModuleForImport(importPath: string, modules: ModuleNode[]): ModuleNode | null {
    // Try to match the import path to a module name
    const importParts = importPath.split('/');

    for (const module of modules) {
      // Check if any part of the import path matches the module
      for (let i = 0; i < importParts.length; i++) {
        if (importParts.slice(i).join('/') === module.name) {
          return module;
        }
      }
    }

    return null;
  }

  /**
   * Infer the type of dependency based on the import path
   */
  private inferDependencyType(importPath: string): 'imports' | 'requires' | 'extends' {
    if (importPath.includes('/types/')) {
      return 'extends';
    }
    return 'imports';
  }

  /**
   * Generate diagram code in the requested format
   */
  private generateDiagramCode(
    modules: ModuleNode[],
    dependencies: DependencyEdge[],
    config: ArchitectureDiagramConfig,
  ): string {
    switch (config.outputFormat) {
      case 'mermaid':
        return this.generateMermaidDiagram(modules, dependencies, config);
      case 'plantuml':
        return this.generatePlantUMLDiagram(modules, dependencies, config);
      default:
        throw new Error(`Unsupported output format: ${config.outputFormat}`);
    }
  }

  /**
   * Generate Mermaid diagram
   */
  private generateMermaidDiagram(
    modules: ModuleNode[],
    dependencies: DependencyEdge[],
    config: ArchitectureDiagramConfig,
  ): string {
    let diagram = 'graph TD\n';

    // Add modules as nodes
    for (const module of modules) {
      const label = config.includeFileCount
        ? `${module.name}\\n(${module.files.length} files)`
        : module.name;
      diagram += `  ${module.id}["${label}"]\n`;
    }

    // Add dependencies
    for (const dep of dependencies) {
      const arrow = dep.type === 'extends' ? '--|>' : '-->';
      diagram += `  ${dep.from} ${arrow} ${dep.to}\n`;
    }

    // Add styling
    if (config.includeStyles) {
      diagram += '\n  classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;\n';
      diagram += '  classDef root fill:#e1f5fe,stroke:#0277bd,stroke-width:3px;\n';
      diagram += `  class ${modules.find((m) => m.name === 'root')?.id || ''} root;\n`;
    }

    return diagram;
  }

  /**
   * Generate PlantUML diagram
   */
  private generatePlantUMLDiagram(
    modules: ModuleNode[],
    dependencies: DependencyEdge[],
    config: ArchitectureDiagramConfig,
  ): string {
    let diagram = '@startuml\n';

    diagram += 'skinparam componentStyle rectangle\n\n';

    // Add modules as components
    for (const module of modules) {
      const label = config.includeFileCount
        ? `${module.name}\\n(${module.files.length} files)`
        : module.name;
      diagram += `["${label}"] as ${module.id}\n`;
    }

    diagram += '\n';

    // Add dependencies
    for (const dep of dependencies) {
      const arrow = dep.type === 'extends' ? '--|>' : '-->';
      diagram += `${dep.from} ${arrow} ${dep.to}\n`;
    }

    diagram += '\n@enduml';

    return diagram;
  }

  /**
   * Save diagram to a file
   */
  public async saveDiagram(
    workspaceFolder: vscode.WorkspaceFolder,
    result: ArchitectureDiagramResult,
  ): Promise<vscode.Uri> {
    const extension = result.format === 'mermaid' ? '.mmd' : '.puml';
    const fileName = `architecture-diagram${extension}`;
    const filePath = path.join(workspaceFolder.uri.fsPath, fileName);
    const uri = vscode.Uri.file(filePath);

    await vscode.workspace.fs.writeFile(uri, Buffer.from(result.diagramCode, 'utf-8'));

    this.logger.info('Architecture diagram saved', { filePath });

    return uri;
  }

  /**
   * Open diagram in a new editor
   */
  public async openDiagram(uri: vscode.Uri): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  }
}
