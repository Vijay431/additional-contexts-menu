/**
 * Dependency Injection Interfaces
 *
 * Central export point for all DI interfaces.
 *
 * @category Dependency Injection
 * @module di/interfaces
 */

export { ILogger } from './ILogger';
export { IConfigurationService } from './IConfigurationService';
export { IFileDiscoveryService, type DiscoveredFile } from './IFileDiscoveryService';
export { ICodeAnalysisService, type FunctionInfo, type ImportInfo } from './ICodeAnalysisService';
export { IFileSaveService, type FileSaveResult } from './IFileSaveService';
export { ITerminalService, type TerminalType, type TerminalOpenBehavior } from './ITerminalService';
export { IProjectDetectionService, type ProjectType } from './IProjectDetectionService';
export { IEnumGeneratorService, type EnumNamingConvention } from './IEnumGeneratorService';
export { IEnvFileGeneratorService, type EnvVariable } from './IEnvFileGeneratorService';
export {
  ICronJobTimerGeneratorService,
  type CronExpression,
  type CronPreset,
} from './ICronJobTimerGeneratorService';
export {
  IFileNamingConventionService,
  type NamingConvention,
} from './IFileNamingConventionService';
export {
  IAccessibilityService,
  type VerbosityLevel,
  type AnnouncementOptions,
} from './IAccessibilityService';
