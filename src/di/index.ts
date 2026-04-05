/**
 * Dependency Injection Module
 *
 * Central export point for the DI system.
 *
 * @category Dependency Injection
 * @module di
 */

export { TYPES, type DiToken } from './types';
export { container, initializeContainer, getService, hasService, DIContainer } from './container';
export * from './interfaces';
