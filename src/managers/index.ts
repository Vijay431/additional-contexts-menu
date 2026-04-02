/**
 * Managers Module
 *
 * Central export point for all manager classes.
 *
 * - ExtensionManager: Top-level lifecycle coordinator; activates and deactivates the extension.
 * - ContextMenuManager: Registers and dispatches all context menu commands; manages command visibility.
 * - WalkthroughManager: Handles first-run onboarding walkthrough and completion state (added in task 6).
 *
 * @category Managers
 * @module managers
 */

export { ExtensionManager } from './ExtensionManager';
export { ContextMenuManager } from './ContextMenuManager';
export { WalkthroughManager } from './WalkthroughManager';
