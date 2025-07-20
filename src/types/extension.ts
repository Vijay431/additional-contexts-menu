// TypeScript interfaces for the extension

export interface ProjectType {
  isNodeProject: boolean;
  frameworks: string[];
  hasTypeScript: boolean;
  supportLevel: 'full' | 'partial' | 'none';
}

export interface CompatibleFile {
  path: string;
  name: string;
  extension: string;
  isCompatible: boolean;
  lastModified: Date;
  relativePath: string;
}

export interface SaveAllResult {
  totalFiles: number;
  savedFiles: number;
  failedFiles: string[];
  skippedFiles: string[];
  success: boolean;
}

export interface CopyValidation {
  canCopy: boolean;
  targetExists: boolean;
  isCompatible: boolean;
  hasWritePermission: boolean;
  hasParseErrors: boolean;
  estimatedConflicts: number;
}

export interface MoveValidation {
  canMove: boolean;
  reason?: string;
  targetExists: boolean;
  isCompatible: boolean;
  hasWritePermission: boolean;
}

export interface CopyConflictResolution {
  handleNameConflicts: boolean;
  mergeImports: boolean;
  preserveComments: boolean;
  maintainFormatting: boolean;
}

export interface SaveAllFeedback {
  showProgress: boolean;
  showNotification: boolean;
  showFileCount: boolean;
  showFailures: boolean;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  type: 'function' | 'method' | 'arrow' | 'async' | 'component' | 'hook';
  isExported: boolean;
  hasDecorators: boolean;
  fullText: string;
}

export interface ExtensionConfig {
  enabled: boolean;
  autoDetectProjects: boolean;
  supportedExtensions: string[];
  copyCode: {
    insertionPoint: 'smart' | 'end' | 'beginning';
    handleImports: 'merge' | 'duplicate' | 'skip';
    preserveComments: boolean;
  };
  saveAll: {
    showNotification: boolean;
    skipReadOnly: boolean;
  };
}
