import * as path from 'path';

import * as vscode from 'vscode';

const DOUBLE_DOT = '..';

const ensureNormalized = (targetPath: string): string => path.normalize(path.resolve(targetPath));

const isWithin = (rootPath: string, targetPath: string): boolean => {
  const relative = path.relative(rootPath, targetPath);
  if (relative === '') {
    return true;
  }

  const startsWithDoubleDot =
    relative.startsWith(DOUBLE_DOT) || relative.startsWith(`..${path.sep}`);

  return !startsWithDoubleDot && !path.isAbsolute(relative);
};

const getExtensionRoot = (): string | undefined => {
  const extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus');
  if (!extension) {
    return undefined;
  }

  return ensureNormalized(extension.extensionUri.fsPath);
};

export const isPathInsideWorkspace = (targetPath: string): boolean => {
  if (!targetPath) {
    return false;
  }

  const normalizedTarget = ensureNormalized(targetPath);

  if (!path.isAbsolute(normalizedTarget)) {
    return false;
  }

  const allowedRoots: string[] = [];
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders && workspaceFolders.length > 0) {
    allowedRoots.push(...workspaceFolders.map((folder) => ensureNormalized(folder.uri.fsPath)));
  }

  const extensionRoot = getExtensionRoot();
  if (extensionRoot) {
    allowedRoots.push(extensionRoot);
  }

  const processRoot = ensureNormalized(process.cwd());
  if (allowedRoots.length === 0 || allowedRoots.every((root) => isWithin(processRoot, root))) {
    allowedRoots.push(processRoot);
  }

  return allowedRoots.some((root) => isWithin(root, normalizedTarget));
};

export const isSafeFilePath = (targetPath: string): boolean => isPathInsideWorkspace(targetPath);
