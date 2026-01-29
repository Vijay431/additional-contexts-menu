import * as vscode from 'vscode';

import { ExtensionConfig } from '../types/extension';
import { Logger } from '../utils/logger';

export class ConfigurationService {
  private static instance: ConfigurationService | undefined;
  private logger: Logger;
  private readonly configSection = 'additionalContextMenus';

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ConfigurationService {
    ConfigurationService.instance ??= new ConfigurationService();
    return ConfigurationService.instance;
  }

  public getConfiguration(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(this.configSection);

    return {
      enabled: config.get<boolean>('enabled', true),
      autoDetectProjects: config.get<boolean>('autoDetectProjects', true),
      supportedExtensions: config.get<string[]>('supportedExtensions', [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
      ]),
      copyCode: {
        insertionPoint: config.get<'smart' | 'end' | 'beginning'>(
          'copyCode.insertionPoint',
          'smart',
        ),
        handleImports: config.get<'merge' | 'duplicate' | 'skip'>(
          'copyCode.handleImports',
          'merge',
        ),
        preserveComments: config.get<boolean>('copyCode.preserveComments', true),
      },
      saveAll: {
        showNotification: config.get<boolean>('saveAll.showNotification', true),
        skipReadOnly: config.get<boolean>('saveAll.skipReadOnly', true),
      },
      terminal: {
        type: config.get<'integrated' | 'external' | 'system-default'>(
          'terminal.type',
          'integrated',
        ),
        externalTerminalCommand: config.get<string>('terminal.externalTerminalCommand', ''),
        openBehavior: config.get<'parent-directory' | 'workspace-root' | 'current-directory'>(
          'terminal.openBehavior',
          'parent-directory',
        ),
      },
      secretDetection: {
        enabled: config.get<boolean>('secretDetection.enabled', true),
        scanOnSave: config.get<boolean>('secretDetection.scanOnSave', false),
        showSuggestions: config.get<boolean>('secretDetection.showSuggestions', true),
        excludedPatterns: config.get<string[]>('secretDetection.excludedPatterns', []),
      },
      importSorting: {
        enabled: config.get<boolean>('importSorting.enabled', true),
        groupOrder: config.get<('external' | 'internal' | 'relative' | 'type')[]>(
          'importSorting.groupOrder',
          ['external', 'internal', 'relative', 'type'],
        ),
        sortAlphabetically: config.get<boolean>('importSorting.sortAlphabetically', true),
        groupSeparators: config.get<boolean>('importSorting.groupSeparators', true),
        separateTypeImports: config.get<boolean>('importSorting.separateTypeImports', false),
        newlinesBetweenGroups: config.get<number>('importSorting.newlinesBetweenGroups', 1),
      },
      bundleAnalysis: {
        enabled: config.get<boolean>('bundleAnalysis.enabled', true),
        autoAnalyzeAfterBuild: config.get<boolean>('bundleAnalysis.autoAnalyzeAfterBuild', false),
        showLargeModuleThreshold: config.get<number>('bundleAnalysis.showLargeModuleThreshold', 50),
        showLargeBundleThreshold: config.get<number>(
          'bundleAnalysis.showLargeBundleThreshold',
          200,
        ),
      },
      complexityAnalysis: {
        enabled: config.get<boolean>('complexityAnalysis.enabled', true),
        maxFunctionLength: config.get<number>('complexityAnalysis.maxFunctionLength', 50),
        maxCyclomaticComplexity: config.get<number>(
          'complexityAnalysis.maxCyclomaticComplexity',
          10,
        ),
        maxNestingDepth: config.get<number>('complexityAnalysis.maxNestingDepth', 4),
        maxParameters: config.get<number>('complexityAnalysis.maxParameters', 5),
        showSuggestions: config.get<boolean>('complexityAnalysis.showSuggestions', true),
      },
      snippetManager: {
        enabled: config.get<boolean>('snippetManager.enabled', true),
        storageLocation: config.get<'workspace' | 'global'>(
          'snippetManager.storageLocation',
          'workspace',
        ),
        autoDetectPlaceholders: config.get<boolean>('snippetManager.autoDetectPlaceholders', true),
        placeholderPattern: config.get<string>(
          'snippetManager.placeholderPattern',
          '\\$\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}',
        ),
      },
      commitMessageGenerator: {
        enabled: config.get<boolean>('commitMessageGenerator.enabled', true),
        includeFileListInBody: config.get<boolean>(
          'commitMessageGenerator.includeFileListInBody',
          true,
        ),
        maxSuggestions: config.get<number>('commitMessageGenerator.maxSuggestions', 3),
        defaultCommitType: config.get<'feat' | 'fix' | 'chore'>(
          'commitMessageGenerator.defaultCommitType',
          'feat',
        ),
      },
      propsGenerator: {
        enabled: config.get<boolean>('propsGenerator.enabled', true),
        inferTypesFromUsage: config.get<boolean>('propsGenerator.inferTypesFromUsage', true),
        detectOptionalFromDefaults: config.get<boolean>(
          'propsGenerator.detectOptionalFromDefaults',
          true,
        ),
        includeJSDocComments: config.get<boolean>('propsGenerator.includeJSDocComments', true),
        generateExportedInterfaces: config.get<boolean>(
          'propsGenerator.generateExportedInterfaces',
          true,
        ),
        strictTypeInference: config.get<boolean>('propsGenerator.strictTypeInference', false),
      },
      duplicateCodeDetection: {
        enabled: config.get<boolean>('duplicateCodeDetection.enabled', true),
        minBlockLines: config.get<number>('duplicateCodeDetection.minBlockLines', 5),
        minSimilarity: config.get<number>('duplicateCodeDetection.minSimilarity', 0.85),
        ignoreComments: config.get<boolean>('duplicateCodeDetection.ignoreComments', true),
        ignoreWhitespace: config.get<boolean>('duplicateCodeDetection.ignoreWhitespace', true),
        maxFileCount: config.get<number>('duplicateCodeDetection.maxFileCount', 50),
        showSuggestions: config.get<boolean>('duplicateCodeDetection.showSuggestions', true),
      },
      envVariableManager: {
        enabled: config.get<boolean>('envVariableManager.enabled', true),
        autoFormat: config.get<boolean>('envVariableManager.autoFormat', false),
        sortVariables: config.get<boolean>('envVariableManager.sortVariables', false),
        generateInterfaces: config.get<boolean>('envVariableManager.generateInterfaces', true),
        validateOnSave: config.get<boolean>('envVariableManager.validateOnSave', true),
        showValidation: config.get<boolean>('envVariableManager.showValidation', true),
        interfaceName: config.get<string>('envVariableManager.interfaceName', 'EnvConfig'),
      },
      errorPatternDetection: {
        enabled: config.get<boolean>('errorPatternDetection.enabled', true),
        includeUnhandledPromises: config.get<boolean>(
          'errorPatternDetection.includeUnhandledPromises',
          true,
        ),
        includeMissingErrorHandlers: config.get<boolean>(
          'errorPatternDetection.includeMissingErrorHandlers',
          true,
        ),
        includeRaceConditions: config.get<boolean>(
          'errorPatternDetection.includeRaceConditions',
          true,
        ),
        includeEmptyCatchBlocks: config.get<boolean>(
          'errorPatternDetection.includeEmptyCatchBlocks',
          true,
        ),
        includeForgottenAwait: config.get<boolean>(
          'errorPatternDetection.includeForgottenAwait',
          true,
        ),
        showSuggestions: config.get<boolean>('errorPatternDetection.showSuggestions', true),
      },
      fileNamingConvention: {
        enabled: config.get<boolean>('fileNamingConvention.enabled', true),
        validateOnSave: config.get<boolean>('fileNamingConvention.validateOnSave', false),
        defaultConvention: config.get<'kebab-case' | 'camelCase' | 'PascalCase'>(
          'fileNamingConvention.defaultConvention',
          'kebab-case',
        ),
        showQuickFix: config.get<boolean>('fileNamingConvention.showQuickFix', true),
        ignorePatterns: config.get<string[]>('fileNamingConvention.ignorePatterns', [
          '^\\.',
          '^test-',
          '^spec-',
        ]),
        fileExtensions: config.get<string[]>('fileNamingConvention.fileExtensions', [
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.vue',
          '.svelte',
        ]),
        severity: config.get<'error' | 'warning' | 'info'>(
          'fileNamingConvention.severity',
          'warning',
        ),
      },
      bulkFileRenamer: {
        enabled: config.get<boolean>('bulkFileRenamer.enabled', true),
        updateImports: config.get<boolean>('bulkFileRenamer.updateImports', true),
        showPreview: config.get<boolean>('bulkFileRenamer.showPreview', true),
        handleCircularDependencies: config.get<boolean>(
          'bulkFileRenamer.handleCircularDependencies',
          true,
        ),
        fileExtensions: config.get<string[]>('bulkFileRenamer.fileExtensions', [
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.vue',
          '.svelte',
        ]),
      },
      hookExtraction: {
        enabled: config.get<boolean>('hookExtraction.enabled', true),
        preserveImports: config.get<boolean>('hookExtraction.preserveImports', true),
        inferTypes: config.get<boolean>('hookExtraction.inferTypes', true),
        autoDetectHooks: config.get<boolean>('hookExtraction.autoDetectHooks', true),
        defaultHookName: config.get<string>('hookExtraction.defaultHookName', 'useCustomHook'),
        hooksDirectory: config.get<string>('hookExtraction.hooksDirectory', 'hooks'),
      },
      nestjsControllerGenerator: {
        enabled: config.get<boolean>('nestjsControllerGenerator.enabled', true),
        generateSwagger: config.get<boolean>('nestjsControllerGenerator.generateSwagger', true),
        generateValidation: config.get<boolean>(
          'nestjsControllerGenerator.generateValidation',
          true,
        ),
        includeGuards: config.get<boolean>('nestjsControllerGenerator.includeGuards', false),
        includeInterceptors: config.get<boolean>(
          'nestjsControllerGenerator.includeInterceptors',
          false,
        ),
        includeFilters: config.get<boolean>('nestjsControllerGenerator.includeFilters', false),
        defaultPathPrefix: config.get<string>(
          'nestjsControllerGenerator.defaultPathPrefix',
          'api/',
        ),
        dtoNamingConvention: config.get<'suffix' | 'separate-folder'>(
          'nestjsControllerGenerator.dtoNamingConvention',
          'suffix',
        ),
      },
      nestjsServiceGenerator: {
        enabled: config.get<boolean>('nestjsServiceGenerator.enabled', true),
        generateInterfaces: config.get<boolean>('nestjsServiceGenerator.generateInterfaces', true),
        includeErrorHandling: config.get<boolean>(
          'nestjsServiceGenerator.includeErrorHandling',
          true,
        ),
        includeTransactionSupport: config.get<boolean>(
          'nestjsServiceGenerator.includeTransactionSupport',
          false,
        ),
        defaultServicePath: config.get<string>(
          'nestjsServiceGenerator.defaultServicePath',
          'src/services',
        ),
        useClassBasedValidation: config.get<boolean>(
          'nestjsServiceGenerator.useClassBasedValidation',
          false,
        ),
      },
      nestjsModuleGenerator: {
        enabled: config.get<boolean>('nestjsModuleGenerator.enabled', true),
        generateImports: config.get<boolean>('nestjsModuleGenerator.generateImports', true),
        generateControllers: config.get<boolean>('nestjsModuleGenerator.generateControllers', true),
        generateProviders: config.get<boolean>('nestjsModuleGenerator.generateProviders', true),
        generateExports: config.get<boolean>('nestjsModuleGenerator.generateExports', true),
        addGlobalImports: config.get<boolean>('nestjsModuleGenerator.addGlobalImports', true),
        organizationPattern: config.get<'feature-based' | 'layered'>(
          'nestjsModuleGenerator.organizationPattern',
          'feature-based',
        ),
      },
      jestTestGenerator: {
        enabled: config.get<boolean>('jestTestGenerator.enabled', true),
        includeEdgeCases: config.get<boolean>('jestTestGenerator.includeEdgeCases', true),
        includeErrorCases: config.get<boolean>('jestTestGenerator.includeErrorCases', true),
        testDirectory: config.get<string>('jestTestGenerator.testDirectory', '__tests__'),
        setupType: config.get<'none' | 'basic' | 'custom'>('jestTestGenerator.setupType', 'none'),
        customSetupPath: config.get<string>('jestTestGenerator.customSetupPath', undefined),
      },
      vitestTestGenerator: {
        enabled: config.get<boolean>('vitestTestGenerator.enabled', true),
        includeEdgeCases: config.get<boolean>('vitestTestGenerator.includeEdgeCases', true),
        includeErrorCases: config.get<boolean>('vitestTestGenerator.includeErrorCases', true),
        testDirectory: config.get<string>('vitestTestGenerator.testDirectory', '__tests__'),
        setupType: config.get<'none' | 'basic' | 'custom'>('vitestTestGenerator.setupType', 'none'),
        customSetupPath: config.get<string>('vitestTestGenerator.customSetupPath', undefined),
        includeVitestUi: config.get<boolean>('vitestTestGenerator.includeVitestUi', false),
        includeCoverageComments: config.get<boolean>(
          'vitestTestGenerator.includeCoverageComments',
          false,
        ),
        mockPatterns: config.get<string[]>('vitestTestGenerator.mockPatterns', []),
      },
      coverageReporter: {
        enabled: config.get<boolean>('coverageReporter.enabled', true),
        thresholds: {
          line: config.get<number>('coverageReporter.thresholds.line', 80),
          branch: config.get<number>('coverageReporter.thresholds.branch', 75),
          function: config.get<number>('coverageReporter.thresholds.function', 80),
          statement: config.get<number>('coverageReporter.thresholds.statement', 80),
        },
        showUncoveredLines: config.get<boolean>('coverageReporter.showUncoveredLines', true),
        trackTrends: config.get<boolean>('coverageReporter.trackTrends', true),
        highlightInEditor: config.get<boolean>('coverageReporter.highlightInEditor', true),
      },
      graphqlResolverGenerator: {
        enabled: config.get<boolean>('graphqlResolverGenerator.enabled', true),
        generateDataLoaders: config.get<boolean>(
          'graphqlResolverGenerator.generateDataLoaders',
          true,
        ),
        includeErrorHandling: config.get<boolean>(
          'graphqlResolverGenerator.includeErrorHandling',
          true,
        ),
        includeAuthGuard: config.get<boolean>('graphqlResolverGenerator.includeAuthGuard', true),
        generateSubscriptions: config.get<boolean>(
          'graphqlResolverGenerator.generateSubscriptions',
          true,
        ),
        defaultResolverPath: config.get<string>(
          'graphqlResolverGenerator.defaultResolverPath',
          'src/resolvers',
        ),
        generateInterfaces: config.get<boolean>(
          'graphqlResolverGenerator.generateInterfaces',
          true,
        ),
      },
      graphqlSchemaGenerator: {
        enabled: config.get<boolean>('graphqlSchemaGenerator.enabled', true),
        includeDescriptions: config.get<boolean>(
          'graphqlSchemaGenerator.includeDescriptions',
          true,
        ),
        includeDirectives: config.get<boolean>('graphqlSchemaGenerator.includeDirectives', true),
        defaultSchemaPath: config.get<string>(
          'graphqlSchemaGenerator.defaultSchemaPath',
          'src/schema',
        ),
        federationEnabled: config.get<boolean>('graphqlSchemaGenerator.federationEnabled', false),
        federationVersion: config.get<'2.0' | '2.1'>(
          'graphqlSchemaGenerator.federationVersion',
          '2.1',
        ),
        generateInputs: config.get<boolean>('graphqlSchemaGenerator.generateInputs', true),
        generateEnums: config.get<boolean>('graphqlSchemaGenerator.generateEnums', true),
        generateInterfaces: config.get<boolean>('graphqlSchemaGenerator.generateInterfaces', true),
        generateUnions: config.get<boolean>('graphqlSchemaGenerator.generateUnions', true),
      },
      nestjsDTOGenerator: {
        enabled: config.get<boolean>('nestjsDTOGenerator.enabled', true),
        generateValidation: config.get<boolean>('nestjsDTOGenerator.generateValidation', true),
        generateSwagger: config.get<boolean>('nestjsDTOGenerator.generateSwagger', true),
        defaultDTOSuffix: config.get<string>('nestjsDTOGenerator.defaultDTOSuffix', 'Dto'),
        createBaseDTO: config.get<boolean>('nestjsDTOGenerator.createBaseDTO', false),
        includePartialDTO: config.get<boolean>('nestjsDTOGenerator.includePartialDTO', false),
        generateExampleComments: config.get<boolean>(
          'nestjsDTOGenerator.generateExampleComments',
          true,
        ),
      },
      nestjsEntityGenerator: {
        enabled: config.get<boolean>('nestjsEntityGenerator.enabled', true),
        generateRepository: config.get<boolean>('nestjsEntityGenerator.generateRepository', true),
        generateDto: config.get<boolean>('nestjsEntityGenerator.generateDto', true),
        generateValidation: config.get<boolean>('nestjsEntityGenerator.generateValidation', true),
        databaseType: config.get<'typeorm' | 'mongoose'>(
          'nestjsEntityGenerator.databaseType',
          'typeorm',
        ),
        defaultEntityPath: config.get<string>(
          'nestjsEntityGenerator.defaultEntityPath',
          'src/entities',
        ),
        generateSwagger: config.get<boolean>('nestjsEntityGenerator.generateSwagger', true),
      },
      nextjsApiRouteGenerator: {
        enabled: config.get<boolean>('nextjsApiRouteGenerator.enabled', true),
        directoryPattern: config.get<'app' | 'pages'>(
          'nextjsApiRouteGenerator.directoryPattern',
          'app',
        ),
        includeTypeScript: config.get<boolean>('nextjsApiRouteGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>(
          'nextjsApiRouteGenerator.includeErrorHandling',
          true,
        ),
        includeValidation: config.get<boolean>('nextjsApiRouteGenerator.includeValidation', true),
        defaultRoutePath: config.get<string>('nextjsApiRouteGenerator.defaultRoutePath', 'api/'),
        exportType: config.get<'named' | 'default'>('nextjsApiRouteGenerator.exportType', 'named'),
      },
      nestjsGuardGenerator: {
        enabled: config.get<boolean>('nestjsGuardGenerator.enabled', true),
        generateJwtStrategy: config.get<boolean>('nestjsGuardGenerator.generateJwtStrategy', true),
        generateRolesGuard: config.get<boolean>('nestjsGuardGenerator.generateRolesGuard', true),
        generatePermissionsGuard: config.get<boolean>(
          'nestjsGuardGenerator.generatePermissionsGuard',
          true,
        ),
        generateGlobalGuard: config.get<boolean>('nestjsGuardGenerator.generateGlobalGuard', false),
        generateDecorators: config.get<boolean>('nestjsGuardGenerator.generateDecorators', true),
        defaultGuardName: config.get<string>('nestjsGuardGenerator.defaultGuardName', 'Jwt'),
        guardDirectory: config.get<string>(
          'nestjsGuardGenerator.guardDirectory',
          'src/auth/guards',
        ),
      },
      nextjsPageScaffolder: {
        enabled: config.get<boolean>('nextjsPageScaffolder.enabled', true),
        directoryPattern: config.get<'app' | 'pages'>(
          'nextjsPageScaffolder.directoryPattern',
          'app',
        ),
        includeTypeScript: config.get<boolean>('nextjsPageScaffolder.includeTypeScript', true),
        includeMetadata: config.get<boolean>('nextjsPageScaffolder.includeMetadata', true),
        includeLayout: config.get<boolean>('nextjsPageScaffolder.includeLayout', false),
        includeLoading: config.get<boolean>('nextjsPageScaffolder.includeLoading', false),
        includeError: config.get<boolean>('nextjsPageScaffolder.includeError', false),
        includeNotFound: config.get<boolean>('nextjsPageScaffolder.includeNotFound', false),
        defaultComponentType: config.get<'server' | 'client'>(
          'nextjsPageScaffolder.defaultComponentType',
          'server',
        ),
        defaultPath: config.get<string>('nextjsPageScaffolder.defaultPath', 'app'),
      },
      nuxtjsPageGenerator: {
        enabled: config.get<boolean>('nuxtjsPageGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('nuxtjsPageGenerator.includeTypeScript', true),
        includeMetadata: config.get<boolean>('nuxtjsPageGenerator.includeMetadata', true),
        includeAsyncData: config.get<boolean>('nuxtjsPageGenerator.includeAsyncData', true),
        includeUseFetch: config.get<boolean>('nuxtjsPageGenerator.includeUseFetch', true),
        includeLayout: config.get<boolean>('nuxtjsPageGenerator.includeLayout', false),
        includeMiddleware: config.get<boolean>('nuxtjsPageGenerator.includeMiddleware', false),
        defaultPagePath: config.get<string>('nuxtjsPageGenerator.defaultPagePath', 'pages'),
      },
      nuxtComposableGenerator: {
        enabled: config.get<boolean>('nuxtComposableGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('nuxtComposableGenerator.includeTypeScript', true),
        includeAutoImports: config.get<boolean>('nuxtComposableGenerator.includeAutoImports', true),
        includeSSRSupport: config.get<boolean>('nuxtComposableGenerator.includeSSRSupport', true),
        includeContextHandling: config.get<boolean>(
          'nuxtComposableGenerator.includeContextHandling',
          true,
        ),
        generateReturnType: config.get<boolean>('nuxtComposableGenerator.generateReturnType', true),
        defaultComposableDirectory: config.get<string>(
          'nuxtComposableGenerator.defaultComposableDirectory',
          'composables',
        ),
        addJSDocComments: config.get<boolean>('nuxtComposableGenerator.addJSDocComments', true),
        includeAsyncReturnType: config.get<boolean>(
          'nuxtComposableGenerator.includeAsyncReturnType',
          true,
        ),
        generateHelpers: config.get<boolean>('nuxtComposableGenerator.generateHelpers', false),
      },
      nuxtServerRouteGenerator: {
        enabled: config.get<boolean>('nuxtServerRouteGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('nuxtServerRouteGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>(
          'nuxtServerRouteGenerator.includeErrorHandling',
          true,
        ),
        includeValidation: config.get<boolean>('nuxtServerRouteGenerator.includeValidation', true),
        includeEventStream: config.get<boolean>(
          'nuxtServerRouteGenerator.includeEventStream',
          true,
        ),
        defaultRoutePath: config.get<string>('nuxtServerRouteGenerator.defaultRoutePath', 'api/'),
        returnHandlerType: config.get<'handler' | 'eventHandler'>(
          'nuxtServerRouteGenerator.returnHandlerType',
          'handler',
        ),
      },
      openApiSpecGenerator: {
        enabled: config.get<boolean>('openApiSpecGenerator.enabled', true),
        outputFormat: config.get<'json' | 'yaml'>('openApiSpecGenerator.outputFormat', 'json'),
        includeDescriptions: config.get<boolean>('openApiSpecGenerator.includeDescriptions', true),
        includeExamples: config.get<boolean>('openApiSpecGenerator.includeExamples', true),
        excludePrivateRoutes: config.get<boolean>(
          'openApiSpecGenerator.excludePrivateRoutes',
          true,
        ),
        outputDirectory: config.get<string>('openApiSpecGenerator.outputDirectory', 'docs/openapi'),
        defaultServerUrl: config.get<string>(
          'openApiSpecGenerator.defaultServerUrl',
          'http://localhost:3000',
        ),
        includeSecuritySchemes: config.get<boolean>(
          'openApiSpecGenerator.includeSecuritySchemes',
          true,
        ),
      },
      packagejsonScriptsManager: {
        enabled: config.get<boolean>('packagejsonScriptsManager.enabled', true),
        showTemplates: config.get<boolean>('packagejsonScriptsManager.showTemplates', true),
        autoDetectPackageManager: config.get<boolean>(
          'packagejsonScriptsManager.autoDetectPackageManager',
          true,
        ),
        defaultPackageManager: config.get<'npm' | 'yarn' | 'pnpm'>(
          'packagejsonScriptsManager.defaultPackageManager',
          'npm',
        ),
      },
      performanceProfiler: {
        enabled: config.get<boolean>('performanceProfiler.enabled', true),
        minExecutionTime: config.get<number>('performanceProfiler.minExecutionTime', 10),
        minMemoryUsage: config.get<number>('performanceProfiler.minMemoryUsage', 10),
        maxNestingDepth: config.get<number>('performanceProfiler.maxNestingDepth', 4),
        analyzeAsyncOperations: config.get<boolean>(
          'performanceProfiler.analyzeAsyncOperations',
          true,
        ),
        showOptimizationSuggestions: config.get<boolean>(
          'performanceProfiler.showOptimizationSuggestions',
          true,
        ),
      },
      playwrightTestGenerator: {
        enabled: config.get<boolean>('playwrightTestGenerator.enabled', true),
        includeEdgeCases: config.get<boolean>('playwrightTestGenerator.includeEdgeCases', true),
        includeErrorCases: config.get<boolean>('playwrightTestGenerator.includeErrorCases', true),
        testDirectory: config.get<string>('playwrightTestGenerator.testDirectory', 'e2e'),
        generatePageObjects: config.get<boolean>(
          'playwrightTestGenerator.generatePageObjects',
          true,
        ),
        pageObjectsDirectory: config.get<string>(
          'playwrightTestGenerator.pageObjectsDirectory',
          'pages',
        ),
        useDataAttributes: config.get<boolean>('playwrightTestGenerator.useDataAttributes', false),
        waitingStrategy: config.get<
          'waitForLoadState' | 'waitForSelector' | 'waitForResponse' | 'mixed'
        >('playwrightTestGenerator.waitingStrategy', 'mixed'),
        includeAccessibilityTests: config.get<boolean>(
          'playwrightTestGenerator.includeAccessibilityTests',
          false,
        ),
        includeVisualRegression: config.get<boolean>(
          'playwrightTestGenerator.includeVisualRegression',
          false,
        ),
        customFixturePath: config.get<string>(
          'playwrightTestGenerator.customFixturePath',
          undefined,
        ),
      },
      prismaSchemaGenerator: {
        enabled: config.get<boolean>('prismaSchemaGenerator.enabled', true),
        includeComments: config.get<boolean>('prismaSchemaGenerator.includeComments', true),
        includeIndexes: config.get<boolean>('prismaSchemaGenerator.includeIndexes', true),
        defaultSchemaPath: config.get<string>('prismaSchemaGenerator.defaultSchemaPath', 'prisma'),
        defaultDataSourceProvider: config.get<
          'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'mongodb' | 'cockroachdb'
        >('prismaSchemaGenerator.defaultDataSourceProvider', 'postgresql'),
        generateRelations: config.get<boolean>('prismaSchemaGenerator.generateRelations', true),
        generateMigrations: config.get<boolean>('prismaSchemaGenerator.generateMigrations', false),
        idFieldType: config.get<'Int' | 'String' | 'UUID'>(
          'prismaSchemaGenerator.idFieldType',
          'Int',
        ),
      },
      prismaClientGenerator: {
        enabled: config.get<boolean>('prismaClientGenerator.enabled', true),
        outputPath: config.get<string>('prismaClientGenerator.outputPath', 'src/repositories'),
        includeTransactionMethods: config.get<boolean>(
          'prismaClientGenerator.includeTransactionMethods',
          true,
        ),
        includeErrorHandling: config.get<boolean>(
          'prismaClientGenerator.includeErrorHandling',
          true,
        ),
        includeSoftDelete: config.get<boolean>('prismaClientGenerator.includeSoftDelete', false),
        includePagination: config.get<boolean>('prismaClientGenerator.includePagination', true),
        includeCaching: config.get<boolean>('prismaClientGenerator.includeCaching', false),
        includeValidation: config.get<boolean>('prismaClientGenerator.includeValidation', false),
        generateRepositoryInterface: config.get<boolean>(
          'prismaClientGenerator.generateRepositoryInterface',
          true,
        ),
        prismaImportPath: config.get<string>(
          'prismaClientGenerator.prismaImportPath',
          '@prisma/client',
        ),
        errorHandlingType: config.get<'try-catch' | 'result-type' | 'both'>(
          'prismaClientGenerator.errorHandlingType',
          'try-catch',
        ),
      },
      expressRouteGenerator: {
        enabled: config.get<boolean>('expressRouteGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('expressRouteGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>(
          'expressRouteGenerator.includeErrorHandling',
          true,
        ),
        includeValidation: config.get<boolean>('expressRouteGenerator.includeValidation', true),
        includeAsyncAwait: config.get<boolean>('expressRouteGenerator.includeAsyncAwait', true),
        includeMiddleware: config.get<boolean>('expressRouteGenerator.includeMiddleware', true),
        includeJSDoc: config.get<boolean>('expressRouteGenerator.includeJSDoc', true),
        defaultRoutePath: config.get<string>('expressRouteGenerator.defaultRoutePath', 'api/'),
        routerPattern: config.get<'router' | 'app' | 'express-router'>(
          'expressRouteGenerator.routerPattern',
          'router',
        ),
        exportType: config.get<'named' | 'default'>('expressRouteGenerator.exportType', 'named'),
        parameterStyle: config.get<'destructured' | 'properties'>(
          'expressRouteGenerator.parameterStyle',
          'destructured',
        ),
        responsePattern: config.get<'res-send' | 'res-json' | 'res-status'>(
          'expressRouteGenerator.responsePattern',
          'res-json',
        ),
      },
      apiClientGenerator: {
        enabled: config.get<boolean>('apiClientGenerator.enabled', true),
        targetFramework: config.get<'react' | 'vue' | 'angular' | 'svelte'>(
          'apiClientGenerator.targetFramework',
          'react',
        ),
        includeTypeScript: config.get<boolean>('apiClientGenerator.includeTypeScript', true),
        generateFetchClient: config.get<boolean>('apiClientGenerator.generateFetchClient', true),
        generateAxiosClient: config.get<boolean>('apiClientGenerator.generateAxiosClient', false),
        outputDirectory: config.get<string>('apiClientGenerator.outputDirectory', 'src/api'),
        baseApiUrl: config.get<string>('apiClientGenerator.baseApiUrl', ''),
      },
      svelteActionGenerator: {
        enabled: config.get<boolean>('svelteActionGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('svelteActionGenerator.includeTypeScript', true),
        generateInterfaces: config.get<boolean>('svelteActionGenerator.generateInterfaces', true),
        includeJSDocComments: config.get<boolean>(
          'svelteActionGenerator.includeJSDocComments',
          true,
        ),
        defaultActionsDirectory: config.get<string>(
          'svelteActionGenerator.defaultActionsDirectory',
          'src/actions',
        ),
        includeUsageExamples: config.get<boolean>(
          'svelteActionGenerator.includeUsageExamples',
          true,
        ),
      },
      sveltekitPageGenerator: {
        enabled: config.get<boolean>('sveltekitPageGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('sveltekitPageGenerator.includeTypeScript', true),
        includeMetadata: config.get<boolean>('sveltekitPageGenerator.includeMetadata', true),
        includeLoadFunction: config.get<boolean>(
          'sveltekitPageGenerator.includeLoadFunction',
          true,
        ),
        includeServerLoad: config.get<boolean>('sveltekitPageGenerator.includeServerLoad', false),
        includeActions: config.get<boolean>('sveltekitPageGenerator.includeActions', true),
        includeErrorHandling: config.get<boolean>(
          'sveltekitPageGenerator.includeErrorHandling',
          false,
        ),
        defaultPagePath: config.get<string>('sveltekitPageGenerator.defaultPagePath', 'src/routes'),
      },
      sveltekitServerGenerator: {
        enabled: config.get<boolean>('sveltekitServerGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('sveltekitServerGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>(
          'sveltekitServerGenerator.includeErrorHandling',
          true,
        ),
        includeValidation: config.get<boolean>('sveltekitServerGenerator.includeValidation', true),
        defaultRoutePath: config.get<string>('sveltekitServerGenerator.defaultRoutePath', 'api/'),
        exportPattern: config.get<'named' | 'default'>(
          'sveltekitServerGenerator.exportPattern',
          'named',
        ),
      },
      svelteStoreCreator: {
        enabled: config.get<boolean>('svelteStoreCreator.enabled', true),
        includeTypeScript: config.get<boolean>('svelteStoreCreator.includeTypeScript', true),
        includeJSDocComments: config.get<boolean>('svelteStoreCreator.includeJSDocComments', true),
        defaultPersistenceType: config.get<'localStorage' | 'sessionStorage' | 'none'>(
          'svelteStoreCreator.defaultPersistenceType',
          'none',
        ),
        defaultStoresDirectory: config.get<string>(
          'svelteStoreCreator.defaultStoresDirectory',
          'src/stores',
        ),
        enablePersistenceByDefault: config.get<boolean>(
          'svelteStoreCreator.enablePersistenceByDefault',
          false,
        ),
      },
      piniaStoreGenerator: {
        enabled: config.get<boolean>('piniaStoreGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('piniaStoreGenerator.includeTypeScript', true),
        includeJSDocComments: config.get<boolean>('piniaStoreGenerator.includeJSDocComments', true),
        defaultPersistenceType: config.get<'localStorage' | 'sessionStorage' | 'none'>(
          'piniaStoreGenerator.defaultPersistenceType',
          'none',
        ),
        defaultStoresDirectory: config.get<string>(
          'piniaStoreGenerator.defaultStoresDirectory',
          'src/stores',
        ),
        enablePersistenceByDefault: config.get<boolean>(
          'piniaStoreGenerator.enablePersistenceByDefault',
          false,
        ),
      },
      zustandStoreGenerator: {
        enabled: config.get<boolean>('zustandStoreGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('zustandStoreGenerator.includeTypeScript', true),
        includeJSDocComments: config.get<boolean>(
          'zustandStoreGenerator.includeJSDocComments',
          true,
        ),
        defaultDevtoolsEnabled: config.get<boolean>(
          'zustandStoreGenerator.defaultDevtoolsEnabled',
          true,
        ),
        defaultPersistEnabled: config.get<boolean>(
          'zustandStoreGenerator.defaultPersistEnabled',
          false,
        ),
        defaultPersistenceType: config.get<'localStorage' | 'sessionStorage'>(
          'zustandStoreGenerator.defaultPersistenceType',
          'localStorage',
        ),
        defaultImmerEnabled: config.get<boolean>(
          'zustandStoreGenerator.defaultImmerEnabled',
          false,
        ),
        defaultStoresDirectory: config.get<string>(
          'zustandStoreGenerator.defaultStoresDirectory',
          'src/stores',
        ),
      },
      vueRouterGenerator: {
        enabled: config.get<boolean>('vueRouterGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('vueRouterGenerator.includeTypeScript', true),
        includeGuards: config.get<boolean>('vueRouterGenerator.includeGuards', true),
        includeLazyLoading: config.get<boolean>('vueRouterGenerator.includeLazyLoading', true),
        includeMetaFields: config.get<boolean>('vueRouterGenerator.includeMetaFields', true),
        generateNavigationHelpers: config.get<boolean>(
          'vueRouterGenerator.generateNavigationHelpers',
          true,
        ),
        defaultRoutePath: config.get<string>('vueRouterGenerator.defaultRoutePath', '/'),
        historyMode: config.get<'createWebHistory' | 'createMemoryHistory' | 'createHashHistory'>(
          'vueRouterGenerator.historyMode',
          'createWebHistory',
        ),
        exportType: config.get<'named' | 'default'>('vueRouterGenerator.exportType', 'default'),
        routeCompositionStyle: config.get<'array' | 'object'>(
          'vueRouterGenerator.routeCompositionStyle',
          'array',
        ),
      },
      typescriptInterfaceExtractor: {
        enabled: config.get<boolean>('typescriptInterfaceExtractor.enabled', true),
        includeReadonly: config.get<boolean>('typescriptInterfaceExtractor.includeReadonly', false),
        includeJSDoc: config.get<boolean>('typescriptInterfaceExtractor.includeJSDoc', false),
        exportInterface: config.get<boolean>('typescriptInterfaceExtractor.exportInterface', true),
        inferTypesFromValues: config.get<boolean>(
          'typescriptInterfaceExtractor.inferTypesFromValues',
          true,
        ),
        detectOptional: config.get<boolean>('typescriptInterfaceExtractor.detectOptional', true),
        treatNullAsOptional: config.get<boolean>(
          'typescriptInterfaceExtractor.treatNullAsOptional',
          true,
        ),
        useExplicitAny: config.get<boolean>('typescriptInterfaceExtractor.useExplicitAny', false),
        defaultInterfaceName: config.get<string>(
          'typescriptInterfaceExtractor.defaultInterfaceName',
          'MyInterface',
        ),
        outputLocation: config.get<'separate-file' | 'same-file' | 'types-directory'>(
          'typescriptInterfaceExtractor.outputLocation',
          'separate-file',
        ),
        typesDirectoryName: config.get<string>(
          'typescriptInterfaceExtractor.typesDirectoryName',
          'types',
        ),
      },
      unusedImportDetection: {
        enabled: config.get<boolean>('unusedImportDetection.enabled', true),
        detectOnSave: config.get<boolean>('unusedImportDetection.detectOnSave', false),
        showDiagnostics: config.get<boolean>('unusedImportDetection.showDiagnostics', true),
        ignoreTypeOnlyImports: config.get<boolean>(
          'unusedImportDetection.ignoreTypeOnlyImports',
          true,
        ),
        ignoreUnusedInTypes: config.get<boolean>(
          'unusedImportDetection.ignoreUnusedInTypes',
          false,
        ),
        includeDefaultImports: config.get<boolean>(
          'unusedImportDetection.includeDefaultImports',
          true,
        ),
        includeNamespaceImports: config.get<boolean>(
          'unusedImportDetection.includeNamespaceImports',
          true,
        ),
        autoFixOnSave: config.get<boolean>('unusedImportDetection.autoFixOnSave', false),
        excludePatterns: config.get<string[]>('unusedImportDetection.excludePatterns', []),
      },
      suggestionHub: {
        enabled: config.get<boolean>('suggestionHub.enabled', true),
        autoAnalyzeOnOpen: config.get<boolean>('suggestionHub.autoAnalyzeOnOpen', false),
        maxSuggestionsPerCategory: config.get<number>(
          'suggestionHub.maxSuggestionsPerCategory',
          10,
        ),
        severityFilter: config.get<('critical' | 'high' | 'medium' | 'low' | 'info')[]>(
          'suggestionHub.severityFilter',
          ['critical', 'high', 'medium', 'low', 'info'],
        ),
        categoryFilter: config.get<
          (
            | 'security'
            | 'code-quality'
            | 'performance'
            | 'maintainability'
            | 'best-practices'
            | 'error-prevention'
          )[]
        >('suggestionHub.categoryFilter', [
          'security',
          'code-quality',
          'performance',
          'maintainability',
          'best-practices',
          'error-prevention',
        ]),
        showQuickActions: config.get<boolean>('suggestionHub.showQuickActions', true),
        groupByCategory: config.get<boolean>('suggestionHub.groupByCategory', true),
        sortBy: config.get<'severity' | 'category' | 'file' | 'priority'>(
          'suggestionHub.sortBy',
          'priority',
        ),
        enableAutoFix: config.get<boolean>('suggestionHub.enableAutoFix', true),
      },
      workspaceSymbolSearch: {
        enabled: config.get<boolean>('workspaceSymbolSearch.enabled', true),
        maxResults: config.get<number>('workspaceSymbolSearch.maxResults', 100),
        fuzzyMatchThreshold: config.get<number>('workspaceSymbolSearch.fuzzyMatchThreshold', 0.5),
        defaultKinds: config.get<import('../types/extension').SymbolKind[]>(
          'workspaceSymbolSearch.defaultKinds',
          ['class', 'function', 'interface', 'method', 'variable', 'constant'],
        ),
        showPreview: config.get<boolean>('workspaceSymbolSearch.showPreview', true),
        groupResults: config.get<boolean>('workspaceSymbolSearch.groupResults', true),
      },
      symbolReferenceMapper: {
        enabled: config.get<boolean>('symbolReferenceMapper.enabled', true),
        defaultDirection: config.get<import('../types/extension').CallHierarchyDirection>(
          'symbolReferenceMapper.defaultDirection',
          'incoming',
        ),
        includeImports: config.get<boolean>('symbolReferenceMapper.includeImports', true),
        maxResults: config.get<number>('symbolReferenceMapper.maxResults', 100),
        showReferencesQuickPick: config.get<boolean>(
          'symbolReferenceMapper.showReferencesQuickPick',
          true,
        ),
        showCallHierarchyTree: config.get<boolean>(
          'symbolReferenceMapper.showCallHierarchyTree',
          true,
        ),
      },
      angularServiceGenerator: {
        enabled: config.get<boolean>('angularServiceGenerator.enabled', true),
        includeHttpClient: config.get<boolean>('angularServiceGenerator.includeHttpClient', true),
        generateCrudMethods: config.get<boolean>(
          'angularServiceGenerator.generateCrudMethods',
          true,
        ),
        includeErrorHandling: config.get<boolean>(
          'angularServiceGenerator.includeErrorHandling',
          true,
        ),
        includeJSDocComments: config.get<boolean>(
          'angularServiceGenerator.includeJSDocComments',
          true,
        ),
        defaultServicePath: config.get<string>(
          'angularServiceGenerator.defaultServicePath',
          'src/services',
        ),
        providedInRoot: config.get<boolean>('angularServiceGenerator.providedInRoot', true),
        defaultApiUrl: config.get<string>(
          'angularServiceGenerator.defaultApiUrl',
          'https://api.example.com',
        ),
      },
      architectureDiagramGenerator: {
        enabled: config.get<boolean>('architectureDiagramGenerator.enabled', true),
        outputFormat: config.get<'mermaid' | 'plantuml'>(
          'architectureDiagramGenerator.outputFormat',
          'mermaid',
        ),
        includePatterns: config.get<string[]>('architectureDiagramGenerator.includePatterns', [
          '**/*.ts',
          '**/*.tsx',
          '**/*.js',
          '**/*.jsx',
        ]),
        excludeDirectories: config.get<string[]>(
          'architectureDiagramGenerator.excludeDirectories',
          ['node_modules', 'dist', 'build', '.git', 'coverage'],
        ),
        moduleDepth: config.get<number>('architectureDiagramGenerator.moduleDepth', 2),
        includeExternalDependencies: config.get<boolean>(
          'architectureDiagramGenerator.includeExternalDependencies',
          false,
        ),
        includeFileCount: config.get<boolean>(
          'architectureDiagramGenerator.includeFileCount',
          true,
        ),
        includeStyles: config.get<boolean>('architectureDiagramGenerator.includeStyles', true),
      },
      astroPageGenerator: {
        enabled: config.get<boolean>('astroPageGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('astroPageGenerator.includeTypeScript', true),
        includeMetadata: config.get<boolean>('astroPageGenerator.includeMetadata', true),
        includeLayout: config.get<boolean>('astroPageGenerator.includeLayout', true),
        include404: config.get<boolean>('astroPageGenerator.include404', false),
        includeSSR: config.get<boolean>('astroPageGenerator.includeSSR', true),
        defaultPagePath: config.get<string>('astroPageGenerator.defaultPagePath', 'src/pages'),
      },
      astroIntegrationGenerator: {
        enabled: config.get<boolean>('astroIntegrationGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('astroIntegrationGenerator.includeTypeScript', true),
        includeLifecycleHooks: config.get<boolean>(
          'astroIntegrationGenerator.includeLifecycleHooks',
          true,
        ),
        includeConfigurationSchema: config.get<boolean>(
          'astroIntegrationGenerator.includeConfigurationSchema',
          true,
        ),
        includeMarkdownDocumentation: config.get<boolean>(
          'astroIntegrationGenerator.includeMarkdownDocumentation',
          true,
        ),
        includeTests: config.get<boolean>('astroIntegrationGenerator.includeTests', false),
        defaultIntegrationPath: config.get<string>(
          'astroIntegrationGenerator.defaultIntegrationPath',
          'integrations',
        ),
        supportedIntegrationTypes: config.get<string[]>(
          'astroIntegrationGenerator.supportedIntegrationTypes',
          ['content', 'renderer', 'framework', 'other'],
        ),
      },
      branchNamingConvention: {
        enabled: config.get<boolean>('branchNamingConvention.enabled', true),
        validateOnCheckout: config.get<boolean>('branchNamingConvention.validateOnCheckout', true),
        validateOnCreate: config.get<boolean>('branchNamingConvention.validateOnCreate', true),
        enabledPatterns: config.get<string[]>('branchNamingConvention.enabledPatterns', [
          'feature',
          'bugfix',
          'hotfix',
        ]),
        severity: config.get<'error' | 'warning' | 'info'>(
          'branchNamingConvention.severity',
          'warning',
        ),
        excludedBranches: config.get<string[]>('branchNamingConvention.excludedBranches', [
          'main',
          'master',
          'develop',
          'dev',
          'staging',
          'production',
        ]),
        customPatterns: config.get<Record<string, string>>(
          'branchNamingConvention.customPatterns',
          {},
        ),
        allowIssueNumbers: config.get<boolean>('branchNamingConvention.allowIssueNumbers', true),
        issueNumberPattern: config.get<string>(
          'branchNamingConvention.issueNumberPattern',
          '^(JIRA|GH|ABC)-[0-9]+',
        ),
        maxLength: config.get<number>('branchNamingConvention.maxLength', 100),
        minLength: config.get<number>('branchNamingConvention.minLength', 3),
        suggestBranchNames: config.get<boolean>('branchNamingConvention.suggestBranchNames', true),
      },
      bullQueueGenerator: {
        enabled: config.get<boolean>('bullQueueGenerator.enabled', true),
        includeErrorHandling: config.get<boolean>('bullQueueGenerator.includeErrorHandling', true),
        includeRetryLogic: config.get<boolean>('bullQueueGenerator.includeRetryLogic', true),
        includeEventHandlers: config.get<boolean>('bullQueueGenerator.includeEventHandlers', true),
        defaultConcurrency: config.get<number>('bullQueueGenerator.defaultConcurrency', 1),
        removeOnComplete: config.get<number | null>('bullQueueGenerator.removeOnComplete', 100),
        removeOnFail: config.get<number | null>('bullQueueGenerator.removeOnFail', 50),
        defaultQueuePath: config.get<string>('bullQueueGenerator.defaultQueuePath', 'src/queues'),
      },
      changelogGenerator: {
        enabled: config.get<boolean>('changelogGenerator.enabled', true),
        includeUnreleased: config.get<boolean>('changelogGenerator.includeUnreleased', true),
        maxCommits: config.get<number>('changelogGenerator.maxCommits', 500),
        groupByType: config.get<boolean>('changelogGenerator.groupByType', true),
        linkIssues: config.get<boolean>('changelogGenerator.linkIssues', true),
        repoUrl: config.get<string>('changelogGenerator.repoUrl'),
      },
      bookmarkManager: {
        enabled: config.get<boolean>('bookmarkManager.enabled', true),
        storageLocation: config.get<'workspace' | 'global'>(
          'bookmarkManager.storageLocation',
          'workspace',
        ),
        showInExplorer: config.get<boolean>('bookmarkManager.showInExplorer', true),
        autoBookmarkOnNavigation: config.get<boolean>(
          'bookmarkManager.autoBookmarkOnNavigation',
          false,
        ),
        defaultCategories: config.get<string[]>('bookmarkManager.defaultCategories', [
          'TODO',
          'FIXME',
          'Note',
          'Important',
        ]),
        maxBookmarksPerFile: config.get<number>('bookmarkManager.maxBookmarksPerFile', 50),
      },
    };
  }

  public isEnabled(): boolean {
    return this.getConfiguration().enabled;
  }

  public getSupportedExtensions(): string[] {
    return this.getConfiguration().supportedExtensions;
  }

  public shouldAutoDetectProjects(): boolean {
    return this.getConfiguration().autoDetectProjects;
  }

  public getCopyCodeConfig() {
    return this.getConfiguration().copyCode;
  }

  public getSaveAllConfig() {
    return this.getConfiguration().saveAll;
  }

  public getTerminalConfig() {
    return this.getConfiguration().terminal;
  }

  public getSecretDetectionConfig() {
    return this.getConfiguration().secretDetection;
  }

  public getImportSortingConfig() {
    return this.getConfiguration().importSorting;
  }

  public getBundleAnalysisConfig() {
    return this.getConfiguration().bundleAnalysis;
  }

  public getComplexityAnalysisConfig() {
    return this.getConfiguration().complexityAnalysis;
  }

  public getSnippetManagerConfig() {
    return this.getConfiguration().snippetManager;
  }

  public getCommitMessageGeneratorConfig() {
    return this.getConfiguration().commitMessageGenerator;
  }

  public getPropsGeneratorConfig() {
    return this.getConfiguration().propsGenerator;
  }

  public getDuplicateCodeDetectionConfig() {
    return this.getConfiguration().duplicateCodeDetection;
  }

  public getUnusedDependencyDetectionConfig() {
    return this.getConfiguration().unusedDependencyDetection;
  }

  public getEnvVariableManagerConfig() {
    return this.getConfiguration().envVariableManager;
  }

  public getErrorPatternDetectionConfig() {
    return this.getConfiguration().errorPatternDetection;
  }

  public getFileNamingConventionConfig() {
    return this.getConfiguration().fileNamingConvention;
  }

  public getBulkFileRenamerConfig() {
    return this.getConfiguration().bulkFileRenamer;
  }

  public getHookExtractionConfig() {
    return this.getConfiguration().hookExtraction;
  }

  public getNestjsControllerGeneratorConfig() {
    return this.getConfiguration().nestjsControllerGenerator;
  }

  public getNestjsServiceGeneratorConfig() {
    return this.getConfiguration().nestjsServiceGenerator;
  }

  public getNestjsModuleGeneratorConfig() {
    return this.getConfiguration().nestjsModuleGenerator;
  }

  public getNestjsEntityGeneratorConfig() {
    return this.getConfiguration().nestjsEntityGenerator;
  }

  public getJestTestGeneratorConfig() {
    return this.getConfiguration().jestTestGenerator;
  }

  public getVitestTestGeneratorConfig() {
    return this.getConfiguration().vitestTestGenerator;
  }

  public getCoverageReporterConfig() {
    return this.getConfiguration().coverageReporter;
  }

  public getGraphqlResolverGeneratorConfig() {
    return this.getConfiguration().graphqlResolverGenerator;
  }

  public getGraphqlSchemaGeneratorConfig() {
    return this.getConfiguration().graphqlSchemaGenerator;
  }

  public getNestjsDTOGeneratorConfig() {
    return this.getConfiguration().nestjsDTOGenerator;
  }

  public getNextjsApiRouteGeneratorConfig() {
    return this.getConfiguration().nextjsApiRouteGenerator;
  }

  public getNextjsPageScaffolderConfig() {
    return this.getConfiguration().nextjsPageScaffolder;
  }

  public getNestjsGuardGeneratorConfig() {
    return this.getConfiguration().nestjsGuardGenerator;
  }

  public getNuxtjsPageGeneratorConfig() {
    return this.getConfiguration().nuxtjsPageGenerator;
  }

  public getAstroPageGeneratorConfig() {
    return this.getConfiguration().astroPageGenerator;
  }

  public getAstroIntegrationGeneratorConfig() {
    return this.getConfiguration().astroIntegrationGenerator;
  }

  public getBranchNamingConventionConfig() {
    return this.getConfiguration().branchNamingConvention;
  }

  public getSveltekitPageGeneratorConfig() {
    return this.getConfiguration().sveltekitPageGenerator;
  }

  public getSveltekitServerGeneratorConfig() {
    return this.getConfiguration().sveltekitServerGenerator;
  }

  public getNuxtComposableGeneratorConfig() {
    return this.getConfiguration().nuxtComposableGenerator;
  }

  public getNuxtServerRouteGeneratorConfig() {
    return this.getConfiguration().nuxtServerRouteGenerator;
  }

  public getPerformanceProfilerConfig() {
    return this.getConfiguration().performanceProfiler;
  }

  public getPlaywrightTestGeneratorConfig() {
    return this.getConfiguration().playwrightTestGenerator;
  }

  public getOpenApiSpecGeneratorConfig() {
    return this.getConfiguration().openApiSpecGenerator;
  }

  public getPackagejsonScriptsManagerConfig() {
    return this.getConfiguration().packagejsonScriptsManager;
  }

  public getPrismaSchemaGeneratorConfig() {
    return this.getConfiguration().prismaSchemaGenerator;
  }

  public getPrismaClientGeneratorConfig() {
    return this.getConfiguration().prismaClientGenerator;
  }

  public getReactQueryGeneratorConfig() {
    return this.getConfiguration().reactQueryGenerator;
  }

  public getReactTestingLibraryGeneratorConfig() {
    return this.getConfiguration().reactTestingLibraryGenerator;
  }

  public getReadmeGeneratorConfig() {
    return this.getConfiguration().readmeGenerator;
  }

  public getChangelogGeneratorConfig() {
    return this.getConfiguration().changelogGenerator;
  }

  public getExpressRouteGeneratorConfig() {
    return this.getConfiguration().expressRouteGenerator;
  }

  public getVueRouterGeneratorConfig() {
    return this.getConfiguration().vueRouterGenerator;
  }

  public getApiClientGeneratorConfig() {
    return this.getConfiguration().apiClientGenerator;
  }

  public getSvelteStoreCreatorConfig() {
    return this.getConfiguration().svelteStoreCreator;
  }

  public getPiniaStoreGeneratorConfig() {
    return this.getConfiguration().piniaStoreGenerator;
  }

  public getZustandStoreGeneratorConfig() {
    return this.getConfiguration().zustandStoreGenerator;
  }

  public getTypescriptInterfaceExtractorConfig() {
    return this.getConfiguration().typescriptInterfaceExtractor;
  }

  public getZodSchemaGeneratorConfig() {
    return this.getConfiguration().zodSchemaGenerator;
  }

  public getAngularServiceGeneratorConfig() {
    return this.getConfiguration().angularServiceGenerator;
  }

  public getApiDocumentationGeneratorConfig() {
    return this.getConfiguration().apiDocumentationGenerator;
  }

  public getArchitectureDiagramGeneratorConfig() {
    return this.getConfiguration().architectureDiagramGenerator;
  }

  public getUnusedImportDetectionConfig() {
    return this.getConfiguration().unusedImportDetection;
  }

  public onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configSection)) {
        this.logger.info('Configuration changed');
        callback();
      }
    });
  }

  public getBookmarkManagerConfig() {
    return this.getConfiguration().bookmarkManager;
  }

  public async updateConfiguration<T>(
    key: string,
    value: T,
    target?: vscode.ConfigurationTarget,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(key, value, target);
    this.logger.info(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
  }
}
