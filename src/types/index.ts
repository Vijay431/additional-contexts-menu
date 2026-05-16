/**
 * Types Module
 *
 * Central export point for all shared TypeScript types and interfaces.
 *
 * - config.ts: Strongly-typed configuration interfaces (ExtensionConfiguration, CopyCodeConfig,
 *   TerminalConfig, etc.), default values, config key constants, and type-guard/validation helpers.
 * - extension.ts: Domain types used across the extension (ExtensionConfig, ProjectType,
 *   CompatibleFile, FunctionInfo, SaveAllResult, etc.).
 * - vscode.ts: Re-exports of VS Code API types to reduce direct vscode module coupling.
 *
 * @category Types
 * @module types
 */

export {
  type CopyCodeConfig,
  type SaveAllConfig,
  type TerminalConfig,
  type KeybindingsConfig,
  type AccessibilityConfig,
  type ExtensionConfiguration,
  CONFIG_KEYS,
  DEFAULT_CONFIG,
  isCopyCodeConfig,
  isSaveAllConfig,
  isTerminalConfig,
  isValidInsertionPoint,
  isValidTerminalType,
  isValidOpenBehavior,
  isValidVerbosity,
} from './config';

export {
  type ExtensionConfig,
  type ProjectType,
  type CompatibleFile,
  type SaveAllResult,
  type CopyValidation,
  type MoveValidation,
  type CopyConflictResolution,
  type SaveAllFeedback,
  type FunctionInfo,
} from './extension';

export { vscode } from './vscode';
