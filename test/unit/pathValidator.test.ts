import { describe, it, expect } from 'vitest';
import { isSafeFilePath } from '../../src/utils/pathValidator';

describe('isSafeFilePath', () => {
  it('should return true for a normal .ts file path', () => {
    expect(isSafeFilePath('/project/src/index.ts')).toBe(true);
  });

  it('should return true for a .tsx file', () => {
    expect(isSafeFilePath('/project/src/App.tsx')).toBe(true);
  });

  it('should return false for an empty string', () => {
    expect(isSafeFilePath('')).toBe(false);
  });

  it('should return false for a path with .. traversal (relative path)', () => {
    expect(isSafeFilePath('../etc/passwd')).toBe(false);
  });

  it('should return false for a path containing node_modules', () => {
    expect(isSafeFilePath('/project/node_modules/lodash/index.js')).toBe(false);
  });

  it('should return false for a .exe extension', () => {
    expect(isSafeFilePath('/project/run.exe')).toBe(false);
  });

  it('should return false for a .sh extension', () => {
    expect(isSafeFilePath('/project/setup.sh')).toBe(false);
  });

  it('should return false for a .bat extension', () => {
    expect(isSafeFilePath('/project/run.bat')).toBe(false);
  });

  it('should return false for a .cmd extension', () => {
    expect(isSafeFilePath('/project/run.cmd')).toBe(false);
  });

  it('should return false for a .ps1 extension', () => {
    expect(isSafeFilePath('/project/run.ps1')).toBe(false);
  });

  it('should return false for a .js extension (listed as dangerous)', () => {
    expect(isSafeFilePath('/project/run.js')).toBe(false);
  });

  it('should return false for a non-string input', () => {
    expect(isSafeFilePath(null as unknown as string)).toBe(false);
  });
});
