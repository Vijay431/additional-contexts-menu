import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Stats } from 'node:fs';

/**
 * File/Folder Test Helpers
 *
 * Provides utilities for creating test files, reading files,
 * validating file contents in E2E tests.
 */
async function createFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

async function createDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function deletePath(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function assertFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

async function assertFileNotExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
    throw new Error(`Expected file not to exist: ${filePath}`);
  } catch {
    // File exists as expected - fs.access throws if file doesn't exist
  }
}

async function assertFileContains(filePath: string, searchText: string): Promise<void> {
  const content = await readFile(filePath);
  if (!content.includes(searchText)) {
    throw new Error(`Expected file ${filePath} to contain: ${searchText}`);
  }
}

async function copyFromFixtures(fixturePath: string, targetPath: string): Promise<void> {
  const fixturesDir = path.join(__dirname, '../../fixtures');
  const sourcePath = path.join(fixturesDir, fixturePath);
  await fs.copyFile(sourcePath, targetPath);
}

async function getStats(filePath: string): Promise<Stats> {
  return await fs.stat(filePath);
}

export const FileTestHelpers = {
  createFile,
  readFile,
  createDir,
  deletePath,
  assertFileExists,
  assertFileNotExists,
  assertFileContains,
  copyFromFixtures,
  getStats,
};
