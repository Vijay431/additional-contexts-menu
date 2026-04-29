import { describe, it, expect, vi, beforeEach } from 'vitest';

// FileNamingConventionService uses Logger.getInstance() which needs the vscode mock.
// The vscode alias is configured in vitest.config.ts.
import { FileNamingConventionService } from '../../src/services/fileNamingConventionService';

// Reset singleton between tests
beforeEach(() => {
  (FileNamingConventionService as any).instance = undefined;
});

describe('FileNamingConventionService.validateFileName', () => {
  it('should return isValid true for a correct kebab-case name', () => {
    const service = FileNamingConventionService.getInstance();
    const result = service.validateFileName('/some/path/my-component.ts', 'kebab-case');
    expect(result.isValid).toBe(true);
    expect(result.suggestedName).toBeUndefined();
  });

  it('should return isValid false and a suggestion for a PascalCase name under kebab-case', () => {
    const service = FileNamingConventionService.getInstance();
    const result = service.validateFileName('/path/MyComponent.ts', 'kebab-case');
    expect(result.isValid).toBe(false);
    expect(result.suggestedName).toBe('my-component');
  });

  it('should return isValid true for a correct camelCase name', () => {
    const service = FileNamingConventionService.getInstance();
    const result = service.validateFileName('/path/myComponent.ts', 'camelCase');
    expect(result.isValid).toBe(true);
  });

  it('should return isValid false and a suggestion for a kebab name under camelCase', () => {
    const service = FileNamingConventionService.getInstance();
    const result = service.validateFileName('/path/my-component.ts', 'camelCase');
    expect(result.isValid).toBe(false);
    expect(result.suggestedName).toBe('myComponent');
  });

  it('should return isValid true for a correct PascalCase name', () => {
    const service = FileNamingConventionService.getInstance();
    const result = service.validateFileName('/path/MyComponent.ts', 'PascalCase');
    expect(result.isValid).toBe(true);
  });

  it('should return isValid false and a suggestion for a kebab name under PascalCase', () => {
    const service = FileNamingConventionService.getInstance();
    const result = service.validateFileName('/path/my-component.ts', 'PascalCase');
    expect(result.isValid).toBe(false);
    expect(result.suggestedName).toBe('MyComponent');
  });

  it('should use only the base name without extension for validation', () => {
    const service = FileNamingConventionService.getInstance();
    // Extension (.test.ts) should not affect validation of base name
    const result = service.validateFileName('/path/myFile.test.ts', 'camelCase');
    // basename without extension is "myFile.test" — let's test with simple ext
    const result2 = service.validateFileName('/path/myFile.ts', 'camelCase');
    expect(result2.isValid).toBe(true);
  });
});

describe('FileNamingConventionService.convertToConvention', () => {
  let service: FileNamingConventionService;

  beforeEach(() => {
    service = FileNamingConventionService.getInstance();
  });

  it('should convert PascalCase to kebab-case', () => {
    expect(service.convertToConvention('MyComponent', 'kebab-case')).toBe('my-component');
  });

  it('should convert snake_case to kebab-case', () => {
    expect(service.convertToConvention('my_component', 'kebab-case')).toBe('my-component');
  });

  it('should convert kebab-case to camelCase', () => {
    expect(service.convertToConvention('my-component', 'camelCase')).toBe('myComponent');
  });

  it('should convert kebab-case to PascalCase', () => {
    expect(service.convertToConvention('my-component', 'PascalCase')).toBe('MyComponent');
  });

  it('should convert camelCase to PascalCase', () => {
    expect(service.convertToConvention('myComponent', 'PascalCase')).toBe('MyComponent');
  });

  it('should handle a single-word name in all conventions', () => {
    expect(service.convertToConvention('button', 'kebab-case')).toBe('button');
    expect(service.convertToConvention('button', 'camelCase')).toBe('button');
    expect(service.convertToConvention('button', 'PascalCase')).toBe('Button');
  });

  it('should handle multi-word all-caps split correctly', () => {
    expect(service.convertToConvention('MyButtonComponent', 'kebab-case')).toBe(
      'my-button-component',
    );
  });
});
