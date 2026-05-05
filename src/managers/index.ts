/**
 * Managers Module
 *
 * Central export point for all manager classes.
 *
 * - ExtensionManager: Top-level lifecycle coordinator; activates and deactivates the extension.
 * - ContextMenuManager: Registers and dispatches all context menu commands; manages command visibility.
 *
 * @category Managers
 * @module managers
 */

export { ExtensionManager } from './ExtensionManager';
export { ContextMenuManager } from './ContextMenuManager';
