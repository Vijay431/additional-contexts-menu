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
        variableInterpolation: {
          enabled: config.get<boolean>('snippetManager.variableInterpolation.enabled', true),
          customVariables: config.get<Record<string, string>>(
            'snippetManager.variableInterpolation.customVariables',
            {},
          ),
        },
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
      reactQueryGenerator: {
        enabled: config.get<boolean>('reactQueryGenerator.enabled', true),
        queryKeyPrefix: config.get<string>('reactQueryGenerator.queryKeyPrefix', ''),
        includeMutationHooks: config.get<boolean>(
          'reactQueryGenerator.includeMutationHooks',
          true,
        ),
        includeInfiniteQuery: config.get<boolean>(
          'reactQueryGenerator.includeInfiniteQuery',
          false,
        ),
        staleTime: config.get<number>('reactQueryGenerator.staleTime', 0),
        cacheTime: config.get<number>('reactQueryGenerator.cacheTime', 300000),
        refetchOnWindowFocus: config.get<boolean>(
          'reactQueryGenerator.refetchOnWindowFocus',
          true,
        ),
      },
      reactContextGenerator: {
        enabled: config.get<boolean>('reactContextGenerator.enabled', true),
        contextDirectory: config.get<string>('reactContextGenerator.contextDirectory', 'contexts'),
        includeHook: config.get<boolean>('reactContextGenerator.includeHook', true),
        includeProvider: config.get<boolean>('reactContextGenerator.includeProvider', true),
        includeContextValue: config.get<boolean>(
          'reactContextGenerator.includeContextValue',
          true,
        ),
        includeDefaultValue: config.get<boolean>(
          'reactContextGenerator.includeDefaultValue',
          true,
        ),
        generateSeparateFiles: config.get<boolean>(
          'reactContextGenerator.generateSeparateFiles',
          false,
        ),
        exportType: config.get<'named' | 'default'>(
          'reactContextGenerator.exportType',
          'named',
        ),
      },
      reactTestingLibraryGenerator: {
        enabled: config.get<boolean>('reactTestingLibraryGenerator.enabled', true),
        testDirectory: config.get<string>('reactTestingLibraryGenerator.testDirectory', '__tests__'),
        includeUserInteractionTests: config.get<boolean>(
          'reactTestingLibraryGenerator.includeUserInteractionTests',
          true,
        ),
        includeAccessibilityTests: config.get<boolean>(
          'reactTestingLibraryGenerator.includeAccessibilityTests',
          true,
        ),
        includeEdgeCaseTests: config.get<boolean>(
          'reactTestingLibraryGenerator.includeEdgeCaseTests',
          true,
        ),
        includeAsyncTests: config.get<boolean>(
          'reactTestingLibraryGenerator.includeAsyncTests',
          false,
        ),
        includeSnapshotTests: config.get<boolean>(
          'reactTestingLibraryGenerator.includeSnapshotTests',
          false,
        ),
      },
      reactErrorBoundaryGenerator: {
        enabled: config.get<boolean>('reactErrorBoundaryGenerator.enabled', true),
        includeFallbackUI: config.get<boolean>(
          'reactErrorBoundaryGenerator.includeFallbackUI',
          true,
        ),
        includeErrorInfo: config.get<boolean>(
          'reactErrorBoundaryGenerator.includeErrorInfo',
          true,
        ),
        includeResetHooks: config.get<boolean>(
          'reactErrorBoundaryGenerator.includeResetHooks',
          true,
        ),
        logErrors: config.get<boolean>('reactErrorBoundaryGenerator.logErrors', true),
        showErrorDetails: config.get<boolean>(
          'reactErrorBoundaryGenerator.showErrorDetails',
          false,
        ),
      },
      reactFormValidator: {
        enabled: config.get<boolean>('reactFormValidator.enabled', true),
        outputDirectory: config.get<string>('reactFormValidator.outputDirectory', 'components/forms'),
        includeSubmitHandler: config.get<boolean>(
          'reactFormValidator.includeSubmitHandler',
          true,
        ),
        includeResetHandler: config.get<boolean>(
          'reactFormValidator.includeResetHandler',
          true,
        ),
        includeFormErrors: config.get<boolean>('reactFormValidator.includeFormErrors', true),
        includeTouchedState: config.get<boolean>(
          'reactFormValidator.includeTouchedState',
          true,
        ),
        useFormState: config.get<boolean>('reactFormValidator.useFormState', true),
        defaultValuesSource: config.get<'props' | 'useState' | 'url'>(
          'reactFormValidator.defaultValuesSource',
          'useState',
        ),
        generateTypes: config.get<boolean>('reactFormValidator.generateTypes', true),
        defaultValidationLibrary: config.get<'zod' | 'yup' | 'none'>(
          'reactFormValidator.defaultValidationLibrary',
          'zod',
        ),
      },
      reactPortalGenerator: {
        enabled: config.get<boolean>('reactPortalGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('reactPortalGenerator.includeTypeScript', true),
        includeZIndexManagement: config.get<boolean>(
          'reactPortalGenerator.includeZIndexManagement',
          true,
        ),
        includeEventPropagationHandling: config.get<boolean>(
          'reactPortalGenerator.includeEventPropagationHandling',
          true,
        ),
        includeCloseOnEscape: config.get<boolean>(
          'reactPortalGenerator.includeCloseOnEscape',
          true,
        ),
        includeCloseOnOutsideClick: config.get<boolean>(
          'reactPortalGenerator.includeCloseOnOutsideClick',
          true,
        ),
        defaultPortalType: config.get<'modal' | 'tooltip' | 'custom'>(
          'reactPortalGenerator.defaultPortalType',
          'modal',
        ),
        defaultPortalContainerId: config.get<string>(
          'reactPortalGenerator.defaultPortalContainerId',
          'portal-root',
        ),
        defaultZIndex: config.get<number>('reactPortalGenerator.defaultZIndex', 1000),
        defaultClassName: config.get<string>(
          'reactPortalGenerator.defaultClassName',
          'portal-overlay',
        ),
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
      unusedDependencyDetection: {
        enabled: config.get<boolean>('unusedDependencyDetection.enabled', true),
        scanDevDependencies: config.get<boolean>(
          'unusedDependencyDetection.scanDevDependencies',
          true,
        ),
        checkMisplacedDependencies: config.get<boolean>(
          'unusedDependencyDetection.checkMisplacedDependencies',
          true,
        ),
        maxFileCount: config.get<number>('unusedDependencyDetection.maxFileCount', 100),
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
        customSetupPath: config.get<string>('jestTestGenerator.customSetupPath', ''),
      },
      vitestTestGenerator: {
        enabled: config.get<boolean>('vitestTestGenerator.enabled', true),
        includeEdgeCases: config.get<boolean>('vitestTestGenerator.includeEdgeCases', true),
        includeErrorCases: config.get<boolean>('vitestTestGenerator.includeErrorCases', true),
        testDirectory: config.get<string>('vitestTestGenerator.testDirectory', '__tests__'),
        setupType: config.get<'none' | 'basic' | 'custom'>('vitestTestGenerator.setupType', 'none'),
        customSetupPath: config.get<string>('vitestTestGenerator.customSetupPath', ''),
        includeVitestUi: config.get<boolean>('vitestTestGenerator.includeVitestUi', false),
        includeCoverageComments: config.get<boolean>(
          'vitestTestGenerator.includeCoverageComments',
          false,
        ),
        mockPatterns: config.get<string[]>('vitestTestGenerator.mockPatterns', []),
      },
      storybookStoryGenerator: {
        enabled: config.get<boolean>('storybookStoryGenerator.enabled', true),
        includeControls: config.get<boolean>('storybookStoryGenerator.includeControls', true),
        includeArgsTypes: config.get<boolean>('storybookStoryGenerator.includeArgsTypes', true),
        storyDirectory: config.get<string>('storybookStoryGenerator.storyDirectory', '.storybook'),
        framework: config.get<'react' | 'vue' | 'svelte' | 'solid' | 'auto'>(
          'storybookStoryGenerator.framework',
          'auto',
        ),
        storyFormat: config.get<'csf' | 'mdx'>('storybookStoryGenerator.storyFormat', 'csf'),
        autoGenerateVariants: config.get<boolean>(
          'storybookStoryGenerator.autoGenerateVariants',
          true,
        ),
      },
      cucumberSpecGenerator: {
        enabled: config.get<boolean>('cucumberSpecGenerator.enabled', true),
        includeExamples: config.get<boolean>('cucumberSpecGenerator.includeExamples', true),
        includeBackground: config.get<boolean>('cucumberSpecGenerator.includeBackground', true),
        featureDirectory: config.get<string>('cucumberSpecGenerator.featureDirectory', 'features'),
        stepDefinitionsDirectory: config.get<string>(
          'cucumberSpecGenerator.stepDefinitionsDirectory',
          'steps',
        ),
        generateTypeScript: config.get<boolean>(
          'cucumberSpecGenerator.generateTypeScript',
          true,
        ),
      },
      circuitBreakerGenerator: {
        enabled: config.get<boolean>('circuitBreakerGenerator.enabled', true),
      },
      sagaPatternGenerator: {
        enabled: config.get<boolean>('sagaPatternGenerator.enabled', true),
      },
      mockDataGenerator: {
        enabled: config.get<boolean>('mockDataGenerator.enabled', true),
        exportData: config.get<boolean>('mockDataGenerator.exportData', true),
        includeTypeAnnotations: config.get<boolean>(
          'mockDataGenerator.includeTypeAnnotations',
          true,
        ),
        includeJSDoc: config.get<boolean>('mockDataGenerator.includeJSDoc', true),
        includeOptionalProperties: config.get<boolean>(
          'mockDataGenerator.includeOptionalProperties',
          true,
        ),
        includeReadonlyProperties: config.get<boolean>(
          'mockDataGenerator.includeReadonlyProperties',
          true,
        ),
        includeNullValues: config.get<boolean>('mockDataGenerator.includeNullValues', true),
        useFakerPatterns: config.get<boolean>('mockDataGenerator.useFakerPatterns', true),
        arraySize: config.get<number>('mockDataGenerator.arraySize', 3),
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
      graphqlMiddlewareGenerator: {
        enabled: config.get<boolean>('graphqlMiddlewareGenerator.enabled', true),
        middlewarePath: config.get<string>('graphqlMiddlewareGenerator.middlewarePath', 'src/middleware'),
        includeAuthMiddleware: config.get<boolean>('graphqlMiddlewareGenerator.includeAuthMiddleware', true),
        includeLoggingMiddleware: config.get<boolean>('graphqlMiddlewareGenerator.includeLoggingMiddleware', true),
        includeErrorHandling: config.get<boolean>('graphqlMiddlewareGenerator.includeErrorHandling', true),
        includeRateLimiting: config.get<boolean>('graphqlMiddlewareGenerator.includeRateLimiting', true),
        includeTypeScript: config.get<boolean>('graphqlMiddlewareGenerator.includeTypeScript', true),
        defaultMiddlewareName: config.get<string>('graphqlMiddlewareGenerator.defaultMiddlewareName', 'GraphQLMiddleware'),
        enableFieldLevel: config.get<boolean>('graphqlMiddlewareGenerator.enableFieldLevel', true),
        enableOperationLevel: config.get<boolean>('graphqlMiddlewareGenerator.enableOperationLevel', true),
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
      memoryUsageAnalyzer: {
        enabled: config.get<boolean>('memoryUsageAnalyzer.enabled', true),
        maxArraySize: config.get<number>('memoryUsageAnalyzer.maxArraySize', 1000),
        maxObjectDepth: config.get<number>('memoryUsageAnalyzer.maxObjectDepth', 5),
        checkEventListeners: config.get<boolean>(
          'memoryUsageAnalyzer.checkEventListeners',
          true,
        ),
        checkTimers: config.get<boolean>('memoryUsageAnalyzer.checkTimers', true),
        checkClosures: config.get<boolean>('memoryUsageAnalyzer.checkClosures', true),
        showSuggestions: config.get<boolean>('memoryUsageAnalyzer.showSuggestions', true),
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
          '',
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
      remixRouteGenerator: {
        enabled: config.get<boolean>('remixRouteGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('remixRouteGenerator.includeTypeScript', true),
        includeLoader: config.get<boolean>('remixRouteGenerator.includeLoader', true),
        includeAction: config.get<boolean>('remixRouteGenerator.includeAction', true),
        includeMeta: config.get<boolean>('remixRouteGenerator.includeMeta', true),
        includeErrorHandling: config.get<boolean>('remixRouteGenerator.includeErrorHandling', true),
        includeHeaders: config.get<boolean>('remixRouteGenerator.includeHeaders', false),
        includeLinks: config.get<boolean>('remixRouteGenerator.includeLinks', false),
        defaultRoutePath: config.get<string>('remixRouteGenerator.defaultRoutePath', 'routes/'),
        exportType: config.get<'named' | 'default'>('remixRouteGenerator.exportType', 'named'),
      },
      remixActionGenerator: {
        enabled: config.get<boolean>('remixActionGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('remixActionGenerator.includeTypeScript', true),
        includeValidation: config.get<boolean>('remixActionGenerator.includeValidation', true),
        includeErrorHandling: config.get<boolean>('remixActionGenerator.includeErrorHandling', true),
        includeRedirects: config.get<boolean>('remixActionGenerator.includeRedirects', true),
        includeFormDataParsing: config.get<boolean>('remixActionGenerator.includeFormDataParsing', true),
        defaultActionPath: config.get<string>('remixActionGenerator.defaultActionPath', 'routes/'),
        exportType: config.get<'named' | 'default'>('remixActionGenerator.exportType', 'named'),
      },
      expressMiddlewarePipelineBuilder: {
        enabled: config.get<boolean>('expressMiddlewarePipelineBuilder.enabled', true),
        includeTypeScript: config.get<boolean>(
          'expressMiddlewarePipelineBuilder.includeTypeScript',
          true,
        ),
        includeErrorHandling: config.get<boolean>(
          'expressMiddlewarePipelineBuilder.includeErrorHandling',
          true,
        ),
        includeJSDoc: config.get<boolean>('expressMiddlewarePipelineBuilder.includeJSDoc', true),
        defaultRoutePath: config.get<string>(
          'expressMiddlewarePipelineBuilder.defaultRoutePath',
          'api/',
        ),
        exportType: config.get<'named' | 'default'>(
          'expressMiddlewarePipelineBuilder.exportType',
          'named',
        ),
        allowCustomMiddleware: config.get<boolean>(
          'expressMiddlewarePipelineBuilder.allowCustomMiddleware',
          true,
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
      axiosClientGenerator: {
        enabled: config.get<boolean>('axiosClientGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('axiosClientGenerator.includeTypeScript', true),
        includeInterceptors: config.get<boolean>('axiosClientGenerator.includeInterceptors', true),
        includeTransformers: config.get<boolean>('axiosClientGenerator.includeTransformers', true),
        includeErrorHandling: config.get<boolean>('axiosClientGenerator.includeErrorHandling', true),
        includeRetryLogic: config.get<boolean>('axiosClientGenerator.includeRetryLogic', true),
        includeRequestCancellation: config.get<boolean>(
          'axiosClientGenerator.includeRequestCancellation',
          true,
        ),
        includeCacheAdapter: config.get<boolean>('axiosClientGenerator.includeCacheAdapter', false),
        outputDirectory: config.get<string>('axiosClientGenerator.outputDirectory', 'src/api'),
        clientClassName: config.get<string>('axiosClientGenerator.clientClassName', 'ApiClient'),
        baseApiUrl: config.get<string>('axiosClientGenerator.baseApiUrl', ''),
        timeout: config.get<number>('axiosClientGenerator.timeout', 10000),
        generateReactQueryHooks: config.get<boolean>(
          'axiosClientGenerator.generateReactQueryHooks',
          false,
        ),
        generateSwaggerTypes: config.get<boolean>('axiosClientGenerator.generateSwaggerTypes', true),
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
      jotaiAtomGenerator: {
        enabled: config.get<boolean>('jotaiAtomGenerator.enabled', true),
        atomsDirectory: config.get<string>('jotaiAtomGenerator.atomsDirectory', 'src/atoms'),
        includeTypes: config.get<boolean>('jotaiAtomGenerator.includeTypes', true),
        includeJSDoc: config.get<boolean>('jotaiAtomGenerator.includeJSDoc', true),
        includeDefaultValues: config.get<boolean>(
          'jotaiAtomGenerator.includeDefaultValues',
          true,
        ),
        makeAtomsReadOnly: config.get<boolean>('jotaiAtomGenerator.makeAtomsReadOnly', false),
        generateAtomFamilies: config.get<boolean>('jotaiAtomGenerator.generateAtomFamilies', true),
        generateAsyncAtoms: config.get<boolean>('jotaiAtomGenerator.generateAsyncAtoms', true),
        generateDerivedAtoms: config.get<boolean>(
          'jotaiAtomGenerator.generateDerivedAtoms',
          true,
        ),
        enablePersistence: config.get<boolean>('jotaiAtomGenerator.enablePersistence', false),
        defaultPersistenceStorage: config.get<'localStorage' | 'sessionStorage'>(
          'jotaiAtomGenerator.defaultPersistenceStorage',
          'localStorage',
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
      taskRunner: {
        enabled: config.get<boolean>('taskRunner.enabled', true),
        autoDetect: config.get<boolean>('taskRunner.autoDetect', true),
        showOutputPanel: config.get<boolean>('taskRunner.showOutputPanel', true),
        clearOutputOnRun: config.get<boolean>('taskRunner.clearOutputOnRun', false),
        saveOutputToFile: config.get<boolean>('taskRunner.saveOutputToFile', false),
        outputDirectory: config.get<string>('taskRunner.outputDirectory', 'logs'),
        maxOutputLines: config.get<number>('taskRunner.maxOutputLines', 200),
        showErrorParsing: config.get<boolean>('taskRunner.showErrorParsing', true),
        statusBarEnabled: config.get<boolean>('taskRunner.statusBarEnabled', true),
        supportedRunners: config.get<('npm' | 'yarn' | 'pnpm' | 'gulp' | 'grunt' | 'webpack')[]>(
          'taskRunner.supportedRunners',
          ['npm', 'yarn', 'pnpm'],
        ),
        taskListRefreshInterval: config.get<number>('taskRunner.taskListRefreshInterval', 5000),
        defaultTerminalBehavior: config.get<'show' | 'hide' | 'create-new'>(
          'taskRunner.defaultTerminalBehavior',
          'show',
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
        repoUrl: config.get<string>('changelogGenerator.repoUrl', ''),
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
      dependencyUpgradeAdvisor: {
        enabled: config.get<boolean>('dependencyUpgradeAdvisor.enabled', true),
        checkDevDependencies: config.get<boolean>('dependencyUpgradeAdvisor.checkDevDependencies', true),
        checkPreReleases: config.get<boolean>('dependencyUpgradeAdvisor.checkPreReleases', false),
        severityThreshold: config.get<'low' | 'moderate' | 'high' | 'critical'>(
          'dependencyUpgradeAdvisor.severityThreshold',
          'moderate',
        ),
        maxOutdated: config.get<number>('dependencyUpgradeAdvisor.maxOutdated', 50),
        includePeerDependencies: config.get<boolean>(
          'dependencyUpgradeAdvisor.includePeerDependencies',
          false,
        ),
      },
      dockerfileGenerator: {
        enabled: config.get<boolean>('dockerfileGenerator.enabled', true),
        includeHealthcheck: config.get<boolean>('dockerfileGenerator.includeHealthcheck', true),
        includeEntrypoint: config.get<boolean>('dockerfileGenerator.includeEntrypoint', false),
        includeEnvironment: config.get<boolean>('dockerfileGenerator.includeEnvironment', true),
        includeVolumes: config.get<boolean>('dockerfileGenerator.includeVolumes', false),
        includeExpose: config.get<boolean>('dockerfileGenerator.includeExpose', true),
        defaultNodeVersion: config.get<string>('dockerfileGenerator.defaultNodeVersion', '20-alpine'),
        includeMultiStage: config.get<boolean>('dockerfileGenerator.includeMultiStage', true),
        includeDockerignore: config.get<boolean>('dockerfileGenerator.includeDockerignore', true),
        includeDockerCompose: config.get<boolean>('dockerfileGenerator.includeDockerCompose', true),
        targetPort: config.get<number>('dockerfileGenerator.targetPort', 3000),
      },
      securityAudit: {
        enabled: config.get<boolean>('securityAudit.enabled', true),
        scanOnSave: config.get<boolean>('securityAudit.scanOnSave', true),
        includeDependencyAudit: config.get<boolean>(
          'securityAudit.includeDependencyAudit',
          true,
        ),
        includeCodePatterns: config.get<boolean>('securityAudit.includeCodePatterns', true),
        excludedPatterns: config.get<string[]>('securityAudit.excludedPatterns', []),
        severityFilter: config.get<('critical' | 'high' | 'medium' | 'low' | 'info')[]>(
          'securityAudit.severityFilter',
          ['critical', 'high', 'medium', 'low', 'info'],
        ),
        showSuggestions: config.get<boolean>('securityAudit.showSuggestions', true),
        autoFix: config.get<boolean>('securityAudit.autoFix', false),
      },
      githubActionsWorkflowGenerator: {
        enabled: config.get<boolean>('githubActionsWorkflowGenerator.enabled', true),
        defaultNodeVersion: config.get<string>('githubActionsWorkflowGenerator.defaultNodeVersion', '20'),
        enableMatrixStrategy: config.get<boolean>(
          'githubActionsWorkflowGenerator.enableMatrixStrategy',
          true,
        ),
        nodeVersions: config.get<string[]>('githubActionsWorkflowGenerator.nodeVersions', [
          '18',
          '20',
        ]),
        enableCaching: config.get<boolean>('githubActionsWorkflowGenerator.enableCaching', true),
        includeSecurityAudit: config.get<boolean>(
          'githubActionsWorkflowGenerator.includeSecurityAudit',
          true,
        ),
        includeCodeQuality: config.get<boolean>(
          'githubActionsWorkflowGenerator.includeCodeQuality',
          true,
        ),
        includeDeployJob: config.get<boolean>(
          'githubActionsWorkflowGenerator.includeDeployJob',
          false,
        ),
        deployTarget: config.get<'vercel' | 'netlify' | 'docker' | 'npm' | 'none'>(
          'githubActionsWorkflowGenerator.deployTarget',
          'none',
        ),
        packageManager: config.get<'npm' | 'yarn' | 'pnpm' | 'bun' | 'auto'>(
          'githubActionsWorkflowGenerator.packageManager',
          'auto',
        ),
      },
      grpcServiceGenerator: {
        enabled: config.get<boolean>('grpcServiceGenerator.enabled', true),
        generateProtoFile: config.get<boolean>('grpcServiceGenerator.generateProtoFile', true),
        generateServiceImplementation: config.get<boolean>(
          'grpcServiceGenerator.generateServiceImplementation',
          true,
        ),
        generateClientWrapper: config.get<boolean>(
          'grpcServiceGenerator.generateClientWrapper',
          true,
        ),
        generateTypeScriptInterfaces: config.get<boolean>(
          'grpcServiceGenerator.generateTypeScriptInterfaces',
          true,
        ),
        includeErrorHandling: config.get<boolean>('grpcServiceGenerator.includeErrorHandling', true),
        includeValidation: config.get<boolean>('grpcServiceGenerator.includeValidation', true),
        defaultProtoPath: config.get<string>('grpcServiceGenerator.defaultProtoPath', 'protos'),
        defaultServicePath: config.get<string>(
          'grpcServiceGenerator.defaultServicePath',
          'src/services',
        ),
        defaultClientPath: config.get<string>('grpcServiceGenerator.defaultClientPath', 'src/clients'),
        protoVersion: config.get<'proto3' | 'proto2'>('grpcServiceGenerator.protoVersion', 'proto3'),
        useStaticClient: config.get<boolean>('grpcServiceGenerator.useStaticClient', false),
        includeLoadBalancing: config.get<boolean>(
          'grpcServiceGenerator.includeLoadBalancing',
          false,
        ),
      },
      microserviceEventGenerator: {
        enabled: config.get<boolean>('microserviceEventGenerator.enabled', true),
        includeErrorHandling: config.get<boolean>(
          'microserviceEventGenerator.includeErrorHandling',
          true,
        ),
        defaultBrokerType: config.get<'rabbitmq' | 'kafka'>(
          'microserviceEventGenerator.defaultBrokerType',
          'rabbitmq',
        ),
        maxConcurrentMessages: config.get<number>(
          'microserviceEventGenerator.maxConcurrentMessages',
          100,
        ),
        defaultOutputPath: config.get<string>(
          'microserviceEventGenerator.defaultOutputPath',
          'src/events',
        ),
        includeTypeScript: config.get<boolean>(
          'microserviceEventGenerator.includeTypeScript',
          true,
        ),
        generateDocumentation: config.get<boolean>(
          'microserviceEventGenerator.generateDocumentation',
          true,
        ),
      },
      electronMainProcessGenerator: {
        enabled: config.get<boolean>('electronMainProcessGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('electronMainProcessGenerator.includeTypeScript', true),
        includeIPC: config.get<boolean>('electronMainProcessGenerator.includeIPC', true),
        includeSecurity: config.get<boolean>('electronMainProcessGenerator.includeSecurity', true),
        includeAutoUpdater: config.get<boolean>(
          'electronMainProcessGenerator.includeAutoUpdater',
          false,
        ),
        defaultAppName: config.get<string>('electronMainProcessGenerator.defaultAppName', 'MyApp'),
        mainWindowPath: config.get<string>('electronMainProcessGenerator.mainWindowPath', 'main.html'),
        preloadPath: config.get<string>('electronMainProcessGenerator.preloadPath', 'preload.js'),
      },
      electronPreloadGenerator: {
        enabled: config.get<boolean>('electronPreloadGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('electronPreloadGenerator.includeTypeScript', true),
        includeSandboxWarning: config.get<boolean>(
          'electronPreloadGenerator.includeSandboxWarning',
          true,
        ),
        defaultApiName: config.get<string>('electronPreloadGenerator.defaultApiName', 'electronAPI'),
        preloadPath: config.get<string>('electronPreloadGenerator.preloadPath', 'preload.js'),
      },
      electronRendererProcessGenerator: {
        enabled: config.get<boolean>('electronRendererProcessGenerator.enabled', true),
        includeTypeScript: config.get<boolean>(
          'electronRendererProcessGenerator.includeTypeScript',
          true,
        ),
        includeIPC: config.get<boolean>('electronRendererProcessGenerator.includeIPC', true),
        includeReact: config.get<boolean>('electronRendererProcessGenerator.includeReact', false),
        includeVue: config.get<boolean>('electronRendererProcessGenerator.includeVue', false),
        includeSvelte: config.get<boolean>('electronRendererProcessGenerator.includeSvelte', false),
        defaultComponentName: config.get<string>(
          'electronRendererProcessGenerator.defaultComponentName',
          'App',
        ),
        rendererPath: config.get<string>('electronRendererProcessGenerator.rendererPath', 'renderer.html'),
      },
      redisCache: {
        enabled: config.get<boolean>('redisCache.enabled', false),
        url: config.get<string>('redisCache.url', 'redis://localhost:6379'),
        maxMemory: config.get<number>('redisCache.maxMemory', 100),
        maxKeyLength: config.get<number>('redisCache.maxKeyLength', 250),
        keyPrefix: config.get<string>('redisCache.keyPrefix', 'vscode-ctx'),
        defaultTTL: config.get<number>('redisCache.defaultTTL', 3600),
        autoCleanup: config.get<boolean>('redisCache.autoCleanup', true),
        cleanupInterval: config.get<number>('redisCache.cleanupInterval', 300),
      },
      redisPubSubGenerator: {
        enabled: config.get<boolean>('redisPubSubGenerator.enabled', true),
        includeErrorHandling: config.get<boolean>('redisPubSubGenerator.includeErrorHandling', true),
        includePatternSubscription: config.get<boolean>('redisPubSubGenerator.includePatternSubscription', true),
        includeMessageValidation: config.get<boolean>('redisPubSubGenerator.includeMessageValidation', true),
        generateTypedMessages: config.get<boolean>('redisPubSubGenerator.generateTypedMessages', true),
        defaultPubSubPath: config.get<string>('redisPubSubGenerator.defaultPubSubPath', 'src/pubsub'),
      },
      solidComponentGenerator: {
        enabled: config.get<boolean>('solidComponentGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('solidComponentGenerator.includeTypeScript', true),
        includeSignals: config.get<boolean>('solidComponentGenerator.includeSignals', true),
        includeMemos: config.get<boolean>('solidComponentGenerator.includeMemos', true),
        includeLifecycleMethods: config.get<boolean>('solidComponentGenerator.includeLifecycleMethods', true),
        includeContext: config.get<boolean>('solidComponentGenerator.includeContext', true),
        defaultComponentPath: config.get<string>('solidComponentGenerator.defaultComponentPath', 'src/components'),
      },
      trpcContextGenerator: {
        enabled: config.get<boolean>('trpcContextGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('trpcContextGenerator.includeTypeScript', true),
        includeSession: config.get<boolean>('trpcContextGenerator.includeSession', true),
        includeDatabase: config.get<boolean>('trpcContextGenerator.includeDatabase', true),
        includeUser: config.get<boolean>('trpcContextGenerator.includeUser', true),
        includeRequest: config.get<boolean>('trpcContextGenerator.includeRequest', true),
        includeResponse: config.get<boolean>('trpcContextGenerator.includeResponse', true),
        contextType: config.get<'async' | 'sync'>('trpcContextGenerator.contextType', 'async'),
        dependencyInjection: config.get<'manual' | 'inversify' | 'custom'>('trpcContextGenerator.dependencyInjection', 'manual'),
        includeHelpers: config.get<boolean>('trpcContextGenerator.includeHelpers', true),
        includeValidators: config.get<boolean>('trpcContextGenerator.includeValidators', true),
      },
      conditionalExtract: {
        enabled: config.get<boolean>('conditionalExtract.enabled', true),
        maxConditions: config.get<number>('conditionalExtract.maxConditions', 3),
        maxNestingDepth: config.get<number>('conditionalExtract.maxNestingDepth', 2),
        minOperators: config.get<number>('conditionalExtract.minOperators', 3),
        showSuggestions: config.get<boolean>('conditionalExtract.showSuggestions', true),
        autoAnalyzeOnOpen: config.get<boolean>('conditionalExtract.autoAnalyzeOnOpen', false),
      },
      cronJobGenerator: {
        enabled: config.get<boolean>('cronJobGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('cronJobGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>('cronJobGenerator.includeErrorHandling', true),
        includeExecutionLogging: config.get<boolean>('cronJobGenerator.includeExecutionLogging', true),
        includeTimeZone: config.get<boolean>('cronJobGenerator.includeTimeZone', false),
        defaultTimeZone: config.get<string>('cronJobGenerator.defaultTimeZone', 'UTC'),
        defaultJobsPath: config.get<string>('cronJobGenerator.defaultJobsPath', 'jobs'),
        exportType: config.get<'named' | 'default'>('cronJobGenerator.exportType', 'named'),
        onComplete: config.get<'stop' | 'start'>('cronJobGenerator.onComplete', 'start'),
      },
      csvParserGenerator: {
        enabled: config.get<boolean>('csvParserGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('csvParserGenerator.includeTypeScript', true),
        includeStreaming: config.get<boolean>('csvParserGenerator.includeStreaming', true),
        includeTypeConversion: config.get<boolean>('csvParserGenerator.includeTypeConversion', true),
        includeErrorHandling: config.get<boolean>('csvParserGenerator.includeErrorHandling', true),
        includeJSDoc: config.get<boolean>('csvParserGenerator.includeJSDoc', true),
        defaultDelimiter: config.get<string>('csvParserGenerator.defaultDelimiter', ','),
        defaultQuoteChar: config.get<string>('csvParserGenerator.defaultQuoteChar', '"'),
        defaultEscapeChar: config.get<string>('csvParserGenerator.defaultEscapeChar', '"'),
        includeHeaderRow: config.get<boolean>('csvParserGenerator.includeHeaderRow', true),
        skipEmptyLines: config.get<boolean>('csvParserGenerator.skipEmptyLines', true),
        trimFields: config.get<boolean>('csvParserGenerator.trimFields', true),
      },
      eventEmitterGenerator: {
        enabled: config.get<boolean>('eventEmitterGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('eventEmitterGenerator.includeTypeScript', true),
        includeJSDoc: config.get<boolean>('eventEmitterGenerator.includeJSDoc', true),
        generateEventMap: config.get<boolean>('eventEmitterGenerator.generateEventMap', true),
        includeFilterSupport: config.get<boolean>('eventEmitterGenerator.includeFilterSupport', true),
        includeAsyncHandling: config.get<boolean>('eventEmitterGenerator.includeAsyncHandling', true),
        includeOnceSupport: config.get<boolean>('eventEmitterGenerator.includeOnceSupport', true),
        defaultEmitterName: config.get<string>('eventEmitterGenerator.defaultEmitterName', 'EventEmitter'),
        outputDirectory: config.get<string>('eventEmitterGenerator.outputDirectory', 'events'),
        exportType: config.get<'named' | 'default'>('eventEmitterGenerator.exportType', 'named'),
      },
      nestjsWebSocketGatewayGenerator: {
        enabled: config.get<boolean>('nestjsWebSocketGatewayGenerator.enabled', true),
        generateTypeScript: config.get<boolean>('nestjsWebSocketGatewayGenerator.generateTypeScript', true),
        includeAuthGuard: config.get<boolean>('nestjsWebSocketGatewayGenerator.includeAuthGuard', true),
        includeValidation: config.get<boolean>('nestjsWebSocketGatewayGenerator.includeValidation', true),
        includeRoomManagement: config.get<boolean>('nestjsWebSocketGatewayGenerator.includeRoomManagement', true),
        includeEventHandlers: config.get<boolean>('nestjsWebSocketGatewayGenerator.includeEventHandlers', true),
        defaultGatewayPath: config.get<string>('nestjsWebSocketGatewayGenerator.defaultGatewayPath', 'src/gateways'),
        generateGatewayEvents: config.get<boolean>('nestjsWebSocketGatewayGenerator.generateGatewayEvents', true),
        includeWebSocketServer: config.get<boolean>('nestjsWebSocketGatewayGenerator.includeWebSocketServer', true),
      },
      socketIoHandlerGenerator: {
        enabled: config.get<boolean>('socketIoHandlerGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('socketIoHandlerGenerator.includeTypeScript', true),
        includeJSDoc: config.get<boolean>('socketIoHandlerGenerator.includeJSDoc', true),
        generateTypedEvents: config.get<boolean>('socketIoHandlerGenerator.generateTypedEvents', true),
        generateTypedEmitters: config.get<boolean>('socketIoHandlerGenerator.generateTypedEmitters', true),
        generateTypedNamespaces: config.get<boolean>('socketIoHandlerGenerator.generateTypedNamespaces', false),
        includeAuthentication: config.get<boolean>('socketIoHandlerGenerator.includeAuthentication', true),
        includeRoomManagement: config.get<boolean>('socketIoHandlerGenerator.includeRoomManagement', true),
        includeMiddleware: config.get<boolean>('socketIoHandlerGenerator.includeMiddleware', true),
        includeErrorHandling: config.get<boolean>('socketIoHandlerGenerator.includeErrorHandling', true),
        defaultServerName: config.get<string>('socketIoHandlerGenerator.defaultServerName', 'socketServer'),
        defaultOutputPath: config.get<string>('socketIoHandlerGenerator.defaultOutputPath', 'src/sockets'),
        exportType: config.get<'named' | 'default'>('socketIoHandlerGenerator.exportType', 'named'),
      },
      sseHandlerGenerator: {
        enabled: config.get<boolean>('sseHandlerGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('sseHandlerGenerator.includeTypeScript', true),
        includeHeartbeat: config.get<boolean>('sseHandlerGenerator.includeHeartbeat', true),
        includeReconnection: config.get<boolean>('sseHandlerGenerator.includeReconnection', true),
        includeEventFiltering: config.get<boolean>('sseHandlerGenerator.includeEventFiltering', false),
        defaultHeartbeatInterval: config.get<number>('sseHandlerGenerator.defaultHeartbeatInterval', 30),
        defaultReconnectInterval: config.get<number>('sseHandlerGenerator.defaultReconnectInterval', 5000),
        defaultMaxReconnectAttempts: config.get<number>('sseHandlerGenerator.defaultMaxReconnectAttempts', 10),
        defaultOutputPath: config.get<string>('sseHandlerGenerator.defaultOutputPath', 'src/handlers'),
        framework: config.get<'express' | 'fastify' | 'nestjs' | 'generic'>('sseHandlerGenerator.framework', 'express'),
        exportType: config.get<'named' | 'default'>('sseHandlerGenerator.exportType', 'named'),
      },
      graphqlDirectiveGenerator: {
        enabled: config.get<boolean>('graphqlDirectiveGenerator.enabled', true),
        directivePath: config.get<string>('graphqlDirectiveGenerator.directivePath', 'src/directives'),
        includeAuthDirectives: config.get<boolean>('graphqlDirectiveGenerator.includeAuthDirectives', true),
        includeLoggingDirectives: config.get<boolean>('graphqlDirectiveGenerator.includeLoggingDirectives', true),
        includeFormattingDirectives: config.get<boolean>('graphqlDirectiveGenerator.includeFormattingDirectives', true),
        includeValidationDirectives: config.get<boolean>('graphqlDirectiveGenerator.includeValidationDirectives', true),
        includeTypeScript: config.get<boolean>('graphqlDirectiveGenerator.includeTypeScript', true),
        defaultDirectiveName: config.get<string>('graphqlDirectiveGenerator.defaultDirectiveName', 'CustomDirective'),
      },
      graphqlFederationGenerator: {
        enabled: config.get<boolean>('graphqlFederationGenerator.enabled', true),
        federationVersion: config.get<'2.0' | '2.1'>('graphqlFederationGenerator.federationVersion', '2.1'),
        includeDescriptions: config.get<boolean>('graphqlFederationGenerator.includeDescriptions', true),
        defaultSubgraphPath: config.get<string>('graphqlFederationGenerator.defaultSubgraphPath', 'src/federation'),
        generateEntityExtensions: config.get<boolean>('graphqlFederationGenerator.generateEntityExtensions', true),
        generateReferenceResolvers: config.get<boolean>('graphqlFederationGenerator.generateReferenceResolvers', true),
        generateKeyDirectives: config.get<boolean>('graphqlFederationGenerator.generateKeyDirectives', true),
        generateShareableDirectives: config.get<boolean>('graphqlFederationGenerator.generateShareableDirectives', true),
      },
      nuxtModuleGenerator: {
        enabled: config.get<boolean>('nuxtModuleGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('nuxtModuleGenerator.includeTypeScript', true),
        includeConfigOptions: config.get<boolean>('nuxtModuleGenerator.includeConfigOptions', true),
        includeLifecycleHooks: config.get<boolean>('nuxtModuleGenerator.includeLifecycleHooks', true),
        includePluginRegistration: config.get<boolean>('nuxtModuleGenerator.includePluginRegistration', true),
        includeCompositionSupport: config.get<boolean>('nuxtModuleGenerator.includeCompositionSupport', true),
        includeModuleTypes: config.get<boolean>('nuxtModuleGenerator.includeModuleTypes', true),
        defaultModulePath: config.get<string>('nuxtModuleGenerator.defaultModulePath', 'modules'),
        addJSDocComments: config.get<boolean>('nuxtModuleGenerator.addJSDocComments', true),
        generateModuleMeta: config.get<boolean>('nuxtModuleGenerator.generateModuleMeta', true),
        includeVersionValidation: config.get<boolean>('nuxtModuleGenerator.includeVersionValidation', false),
      },
      webpackConfigGenerator: {
        enabled: config.get<boolean>('webpackConfigGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('webpackConfigGenerator.includeTypeScript', true),
        includeCodeSplitting: config.get<boolean>('webpackConfigGenerator.includeCodeSplitting', true),
        includeBundleAnalysis: config.get<boolean>('webpackConfigGenerator.includeBundleAnalysis', true),
        includePerformanceTuning: config.get<boolean>('webpackConfigGenerator.includePerformanceTuning', true),
        includeOptimization: config.get<boolean>('webpackConfigGenerator.includeOptimization', true),
        includeDevServer: config.get<boolean>('webpackConfigGenerator.includeDevServer', true),
        includeLoaders: config.get<boolean>('webpackConfigGenerator.includeLoaders', true),
        includePlugins: config.get<boolean>('webpackConfigGenerator.includePlugins', true),
        defaultConfigName: config.get<string>('webpackConfigGenerator.defaultConfigName', 'webpack.config'),
        outputDirectory: config.get<string>('webpackConfigGenerator.outputDirectory', '.'),
        targetEnvironment: config.get<'web' | 'node' | 'electron' | 'auto'>(
          'webpackConfigGenerator.targetEnvironment',
          'auto',
        ),
        mode: config.get<'development' | 'production' | 'none'>('webpackConfigGenerator.mode', 'production'),
      },
      watchTaskManager: {
        enabled: config.get<boolean>('watchTaskManager.enabled', true),
        autoDetect: config.get<boolean>('watchTaskManager.autoDetect', true),
        maxOutputLines: config.get<number>('watchTaskManager.maxOutputLines', 200),
        restartOnFailure: config.get<boolean>('watchTaskManager.restartOnFailure', true),
        maxRestartAttempts: config.get<number>('watchTaskManager.maxRestartAttempts', 3),
        restartDelay: config.get<number>('watchTaskManager.restartDelay', 1000),
        statusBarEnabled: config.get<boolean>('watchTaskManager.statusBarEnabled', true),
        showTaskOutput: config.get<boolean>('watchTaskManager.showTaskOutput', true),
        dedicatedChannels: config.get<boolean>('watchTaskManager.dedicatedChannels', true),
      },
      apiCacheMiddleware: {
        enabled: config.get<boolean>('apiCacheMiddleware.enabled', true),
        includeTypeScript: config.get<boolean>('apiCacheMiddleware.includeTypeScript', true),
        includeETag: config.get<boolean>('apiCacheMiddleware.includeETag', true),
        includeStaleWhileRevalidate: config.get<boolean>('apiCacheMiddleware.includeStaleWhileRevalidate', true),
        includeCacheControl: config.get<boolean>('apiCacheMiddleware.includeCacheControl', true),
        includeVaryHeader: config.get<boolean>('apiCacheMiddleware.includeVaryHeader', true),
        defaultTTL: config.get<number>('apiCacheMiddleware.defaultTTL', 3600),
        staleTTL: config.get<number>('apiCacheMiddleware.staleTTL', 86400),
        sharedCacheMaxAge: config.get<number>('apiCacheMiddleware.sharedCacheMaxAge', 3600),
        privateCacheMaxAge: config.get<number>('apiCacheMiddleware.privateCacheMaxAge', 1800),
        defaultCachePolicy: config.get<'public' | 'private' | 'no-cache' | 'no-store'>(
          'apiCacheMiddleware.defaultCachePolicy',
          'public',
        ),
        middlewareName: config.get<string>('apiCacheMiddleware.middlewareName', 'cacheMiddleware'),
        outputDirectory: config.get<string>('apiCacheMiddleware.outputDirectory', 'src/middleware'),
        generateInvalidationHelper: config.get<boolean>('apiCacheMiddleware.generateInvalidationHelper', true),
        includeKeyGenerator: config.get<boolean>('apiCacheMiddleware.includeKeyGenerator', true),
        includeMetrics: config.get<boolean>('apiCacheMiddleware.includeMetrics', false),
      },
      dtoValidator: {
        enabled: config.get<boolean>('dtoValidator.enabled', true),
        autoDetectValidations: config.get<boolean>('dtoValidator.autoDetectValidations', true),
        includeSwagger: config.get<boolean>('dtoValidator.includeSwagger', true),
        includeJSDoc: config.get<boolean>('dtoValidator.includeJSDoc', true),
        customErrorMessages: config.get<boolean>('dtoValidator.customErrorMessages', false),
        addTransforms: config.get<boolean>('dtoValidator.addTransforms', true),
        defaultClassSuffix: config.get<string>('dtoValidator.defaultClassSuffix', 'Validator'),
      },
      fsPathResolver: {
        enabled: config.get<boolean>('fsPathResolver.enabled', true),
        includeTypeScript: config.get<boolean>('fsPathResolver.includeTypeScript', true),
        includeJSDoc: config.get<boolean>('fsPathResolver.includeJSDoc', true),
        defaultOutputDirectory: config.get<string>('fsPathResolver.defaultOutputDirectory', 'src/utils'),
        generateUtilities: config.get<boolean>('fsPathResolver.generateUtilities', true),
        utilityTypes: config.get<
          ('path-resolution' | 'path-validation' | 'path-normalization' | 'workspace-relative')[]
        >('fsPathResolver.utilityTypes', [
          'path-resolution',
          'path-validation',
          'path-normalization',
          'workspace-relative',
        ]),
      },
      kafkaConsumerGenerator: {
        enabled: config.get<boolean>('kafkaConsumerGenerator.enabled', true),
        includeErrorHandling: config.get<boolean>('kafkaConsumerGenerator.includeErrorHandling', true),
        includeRetryStrategy: config.get<boolean>('kafkaConsumerGenerator.includeRetryStrategy', true),
        includeDeserialization: config.get<boolean>('kafkaConsumerGenerator.includeDeserialization', true),
        defaultConsumerPath: config.get<string>('kafkaConsumerGenerator.defaultConsumerPath', 'src/consumers'),
      },
      kafkaProducerGenerator: {
        enabled: config.get<boolean>('kafkaProducerGenerator.enabled', true),
        includeErrorHandling: config.get<boolean>('kafkaProducerGenerator.includeErrorHandling', true),
        includeSerialization: config.get<boolean>('kafkaProducerGenerator.includeSerialization', true),
        defaultProducerPath: config.get<string>('kafkaProducerGenerator.defaultProducerPath', 'src/producers'),
      },
      rabbitmqConsumerGenerator: {
        enabled: config.get<boolean>('rabbitmqConsumerGenerator.enabled', true),
        includeErrorHandling: config.get<boolean>('rabbitmqConsumerGenerator.includeErrorHandling', true),
        includeRetryLogic: config.get<boolean>('rabbitmqConsumerGenerator.includeRetryLogic', true),
        includeDeadLetterExchange: config.get<boolean>('rabbitmqConsumerGenerator.includeDeadLetterExchange', true),
        defaultConsumerPath: config.get<string>('rabbitmqConsumerGenerator.defaultConsumerPath', 'src/consumers'),
      },
      remixLoaderGenerator: {
        enabled: config.get<boolean>('remixLoaderGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('remixLoaderGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>('remixLoaderGenerator.includeErrorHandling', true),
        includeCaching: config.get<boolean>('remixLoaderGenerator.includeCaching', true),
        includeValidation: config.get<boolean>('remixLoaderGenerator.includeValidation', true),
        databaseType: config.get<'none' | 'prisma' | 'drizzle' | 'raw-sql' | 'mongodb'>(
          'remixLoaderGenerator.databaseType',
          'none',
        ),
        cachingStrategy: config.get<'none' | 'memory' | 'redis' | 'vercel-kv' | 'cloudflare-kv'>(
          'remixLoaderGenerator.cachingStrategy',
          'none',
        ),
        defaultLoaderPath: config.get<string>('remixLoaderGenerator.defaultLoaderPath', 'routes/'),
        exportType: config.get<'named' | 'default'>('remixLoaderGenerator.exportType', 'named'),
      },
      t3StackGenerator: {
        enabled: config.get<boolean>('t3StackGenerator.enabled', true),
        outputDirectory: config.get<string>('t3StackGenerator.outputDirectory', '.'),
        includeNextjs: config.get<boolean>('t3StackGenerator.includeNextjs', true),
        includeTypeScript: config.get<boolean>('t3StackGenerator.includeTypeScript', true),
        includeTrpc: config.get<boolean>('t3StackGenerator.includeTrpc', true),
        includePrisma: config.get<boolean>('t3StackGenerator.includePrisma', true),
        includeTailwind: config.get<boolean>('t3StackGenerator.includeTailwind', true),
        includeNextAuth: config.get<boolean>('t3StackGenerator.includeNextAuth', true),
        includeZod: config.get<boolean>('t3StackGenerator.includeZod', true),
        includeTesting: config.get<boolean>('t3StackGenerator.includeTesting', true),
        defaultAppName: config.get<string>('t3StackGenerator.defaultAppName', 'my-t3-app'),
        includeDocumentation: config.get<boolean>('t3StackGenerator.includeDocumentation', true),
      },
      trpcRouterGenerator: {
        enabled: config.get<boolean>('trpcRouterGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('trpcRouterGenerator.includeTypeScript', true),
        includeZodSchemas: config.get<boolean>('trpcRouterGenerator.includeZodSchemas', true),
        includeErrorHandling: config.get<boolean>('trpcRouterGenerator.includeErrorHandling', true),
        includeMiddleware: config.get<boolean>('trpcRouterGenerator.includeMiddleware', true),
        includeContext: config.get<boolean>('trpcRouterGenerator.includeContext', true),
        includeInputValidation: config.get<boolean>('trpcRouterGenerator.includeInputValidation', true),
        includeMeta: config.get<boolean>('trpcRouterGenerator.includeMeta', true),
        exportType: config.get<'named' | 'default'>('trpcRouterGenerator.exportType', 'named'),
        procedureType: config.get<'query' | 'mutation' | 'subscription'>('trpcRouterGenerator.procedureType', 'query'),
        routerPattern: config.get<'app-router' | 'pages-router'>('trpcRouterGenerator.routerPattern', 'app-router'),
        contextType: config.get<'async' | 'sync'>('trpcRouterGenerator.contextType', 'async'),
      },
      typeormMigrationGenerator: {
        enabled: config.get<boolean>('typeormMigrationGenerator.enabled', true),
        generateDownSql: config.get<boolean>('typeormMigrationGenerator.generateDownSql', true),
        includeTransactionWrapper: config.get<boolean>('typeormMigrationGenerator.includeTransactionWrapper', true),
        includeComments: config.get<boolean>('typeormMigrationGenerator.includeComments', true),
        timestampNaming: config.get<boolean>('typeormMigrationGenerator.timestampNaming', true),
        outputDirectory: config.get<string>('typeormMigrationGenerator.outputDirectory', 'migrations'),
        dataSourceName: config.get<string>('typeormMigrationGenerator.dataSourceName', 'DataSource'),
        safeMode: config.get<boolean>('typeormMigrationGenerator.safeMode', true),
        includeRollback: config.get<boolean>('typeormMigrationGenerator.includeRollback', true),
      },
      vitePluginGenerator: {
        enabled: config.get<boolean>('vitePluginGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('vitePluginGenerator.includeTypeScript', true),
        includeBuildOptimizations: config.get<boolean>('vitePluginGenerator.includeBuildOptimizations', true),
        includeDevServer: config.get<boolean>('vitePluginGenerator.includeDevServer', true),
        includePlugins: config.get<boolean>('vitePluginGenerator.includePlugins', true),
        defaultPluginName: config.get<string>('vitePluginGenerator.defaultPluginName', 'CustomPlugin'),
        outputDirectory: config.get<string>('vitePluginGenerator.outputDirectory', 'plugins'),
        includeRollupConfig: config.get<boolean>('vitePluginGenerator.includeRollupConfig', true),
        includeViteConfig: config.get<boolean>('vitePluginGenerator.includeViteConfig', true),
      },
      prettierConfigOptimizer: {
        enabled: config.get<boolean>('prettierConfigOptimizer.enabled', true),
        autoDetectProjectPatterns: config.get<boolean>('prettierConfigOptimizer.autoDetectProjectPatterns', true),
        scanOnOpen: config.get<boolean>('prettierConfigOptimizer.scanOnOpen', false),
        maxFilesToScan: config.get<number>('prettierConfigOptimizer.maxFilesToScan', 100),
        excludedDirectories: config.get<string[]>('prettierConfigOptimizer.excludedDirectories', [
          'node_modules',
          'dist',
          'build',
          '.git',
        ]),
        configFileLocations: config.get<string[]>('prettierConfigOptimizer.configFileLocations', [
          '.prettierrc',
          '.prettierrc.json',
          '.prettierrc.yaml',
          '.prettierrc.yml',
          'prettier.config.js',
        ]),
        suggestOnInconsistency: config.get<boolean>('prettierConfigOptimizer.suggestOnInconsistency', true),
        consistencyThreshold: config.get<number>('prettierConfigOptimizer.consistencyThreshold', 0.8),
      },
      zodSchemaGenerator: {
        enabled: config.get<boolean>('zodSchemaGenerator.enabled', true),
        includeJSDoc: config.get<boolean>('zodSchemaGenerator.includeJSDoc', true),
        includeErrorMessages: config.get<boolean>('zodSchemaGenerator.includeErrorMessages', true),
        includeRefinements: config.get<boolean>('zodSchemaGenerator.includeRefinements', true),
        generateInferredType: config.get<boolean>('zodSchemaGenerator.generateInferredType', true),
        generateInputOutputTypes: config.get<boolean>('zodSchemaGenerator.generateInputOutputTypes', true),
        importZod: config.get<boolean>('zodSchemaGenerator.importZod', true),
        useConst: config.get<boolean>('zodSchemaGenerator.useConst', true),
        useDateCoerce: config.get<boolean>('zodSchemaGenerator.useDateCoerce', true),
        defaultSchemaName: config.get<string>('zodSchemaGenerator.defaultSchemaName', 'MySchema'),
        exportSchema: config.get<boolean>('zodSchemaGenerator.exportSchema', true),
      },
      memoDecoratorGenerator: {
        enabled: config.get<boolean>('memoDecoratorGenerator.enabled', true),
        defaultCacheStrategy: config.get<'map' | 'lru' | 'ttl' | 'weak'>('memoDecoratorGenerator.defaultCacheStrategy', 'map'),
        defaultTtlMs: config.get<number>('memoDecoratorGenerator.defaultTtlMs', 60000),
        defaultMaxSize: config.get<number>('memoDecoratorGenerator.defaultMaxSize', 100),
        includeJSDoc: config.get<boolean>('memoDecoratorGenerator.includeJSDoc', true),
        exportDecorator: config.get<boolean>('memoDecoratorGenerator.exportDecorator', true),
        importHelper: config.get<boolean>('memoDecoratorGenerator.importHelper', true),
        defaultDecoratorName: config.get<string>('memoDecoratorGenerator.defaultDecoratorName', 'Memoize'),
      },
      elasticsearchMappingGenerator: {
        enabled: config.get<boolean>('elasticsearchMappingGenerator.enabled', true),
        includeIndexSettings: config.get<boolean>('elasticsearchMappingGenerator.includeIndexSettings', true),
        includeAnalyzers: config.get<boolean>('elasticsearchMappingGenerator.includeAnalyzers', true),
        includeDynamicTemplates: config.get<boolean>('elasticsearchMappingGenerator.includeDynamicTemplates', true),
        defaultNumberOfShards: config.get<number>('elasticsearchMappingGenerator.defaultNumberOfShards', 1),
        defaultNumberOfReplicas: config.get<number>('elasticsearchMappingGenerator.defaultNumberOfReplicas', 1),
        defaultRefreshInterval: config.get<string>('elasticsearchMappingGenerator.defaultRefreshInterval', '1s'),
        defaultIndexName: config.get<string>('elasticsearchMappingGenerator.defaultIndexName', 'my-index'),
      },
      apiDocumentationGenerator: {
        enabled: config.get<boolean>('apiDocumentationGenerator.enabled', true),
        includePrivate: config.get<boolean>('apiDocumentationGenerator.includePrivate', false),
        includeProtected: config.get<boolean>('apiDocumentationGenerator.includeProtected', false),
        outputFormat: config.get<'markdown' | 'html'>('apiDocumentationGenerator.outputFormat', 'markdown'),
        includeExamples: config.get<boolean>('apiDocumentationGenerator.includeExamples', true),
        includeTypeDefinitions: config.get<boolean>('apiDocumentationGenerator.includeTypeDefinitions', true),
        groupByCategory: config.get<boolean>('apiDocumentationGenerator.groupByCategory', true),
        addTableOfContents: config.get<boolean>('apiDocumentationGenerator.addTableOfContents', true),
      },
      readmeGenerator: {
        enabled: config.get<boolean>('readmeGenerator.enabled', true),
      },
      dockerComposeGenerator: {
        enabled: config.get<boolean>('dockerComposeGenerator.enabled', true),
      },
      i18nKeyGenerator: {
        enabled: config.get<boolean>('i18nKeyGenerator.enabled', true),
        defaultNamespace: config.get<string>('i18nKeyGenerator.defaultNamespace', 'common'),
        outputDirectory: config.get<string>('i18nKeyGenerator.outputDirectory', './locales'),
        fileFormat: config.get<'json' | 'ts' | 'js'>('i18nKeyGenerator.fileFormat', 'json'),
        includeHelpers: config.get<boolean>('i18nKeyGenerator.includeHelpers', true),
        generateScopedHelpers: config.get<boolean>('i18nKeyGenerator.generateScopedHelpers', true),
        extractFromStrings: config.get<boolean>('i18nKeyGenerator.extractFromStrings', true),
        extractFromTemplates: config.get<boolean>('i18nKeyGenerator.extractFromTemplates', true),
        ignorePatterns: config.get<string[]>('i18nKeyGenerator.ignorePatterns', [
          '^[A-Z_]+$',
          '^\\d+$',
          '^[.,!?;:]$',
        ]),
      },
      mongoAggregationBuilder: {
        enabled: config.get<boolean>('mongoAggregationBuilder.enabled', true),
        includeTypeScript: config.get<boolean>('mongoAggregationBuilder.includeTypeScript', true),
        includeComments: config.get<boolean>('mongoAggregationBuilder.includeComments', true),
        defaultOutputPath: config.get<string>('mongoAggregationBuilder.defaultOutputPath', './aggregations'),
      },
      responseFormatterGenerator: {
        enabled: config.get<boolean>('responseFormatterGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('responseFormatterGenerator.includeTypeScript', true),
        includeJSDoc: config.get<boolean>('responseFormatterGenerator.includeJSDoc', true),
        defaultFormatterPath: config.get<string>('responseFormatterGenerator.defaultFormatterPath', 'src/utils'),
        includeMetaFields: config.get<boolean>('responseFormatterGenerator.includeMetaFields', true),
        includePagination: config.get<boolean>('responseFormatterGenerator.includePagination', true),
        includeErrorCodes: config.get<boolean>('responseFormatterGenerator.includeErrorCodes', true),
        generateMiddleware: config.get<boolean>('responseFormatterGenerator.generateMiddleware', true),
        generateUsageExamples: config.get<boolean>('responseFormatterGenerator.generateUsageExamples', true),
      },
      pdfReportGenerator: {
        enabled: config.get<boolean>('pdfReportGenerator.enabled', true),
        library: config.get<'pdfkit' | 'jsPDF'>('pdfReportGenerator.library', 'pdfkit'),
        outputDirectory: config.get<string>('pdfReportGenerator.outputDirectory', 'reports'),
        margin: config.get<number>('pdfReportGenerator.margin', 50),
        includeHeaders: config.get<boolean>('pdfReportGenerator.includeHeaders', true),
        includeFooters: config.get<boolean>('pdfReportGenerator.includeFooters', true),
        includeTables: config.get<boolean>('pdfReportGenerator.includeTables', true),
        includeCharts: config.get<boolean>('pdfReportGenerator.includeCharts', true),
        defaultFontSize: config.get<number>('pdfReportGenerator.defaultFontSize', 11),
        generateTypeScript: config.get<boolean>('pdfReportGenerator.generateTypeScript', true),
      },
      requestValidatorGenerator: {
        enabled: config.get<boolean>('requestValidatorGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('requestValidatorGenerator.includeTypeScript', true),
        defaultLibrary: config.get<'joi' | 'zod'>('requestValidatorGenerator.defaultLibrary', 'zod'),
        includeErrorHandling: config.get<boolean>('requestValidatorGenerator.includeErrorHandling', true),
        includeJSDoc: config.get<boolean>('requestValidatorGenerator.includeJSDoc', true),
        defaultMiddlewareName: config.get<string>(
          'requestValidatorGenerator.defaultMiddlewareName',
          'validateRequest',
        ),
        outputDirectory: config.get<string>('requestValidatorGenerator.outputDirectory', 'src/middleware'),
        generateUsageExamples: config.get<boolean>(
          'requestValidatorGenerator.generateUsageExamples',
          true,
        ),
        exportType: config.get<'named' | 'default'>('requestValidatorGenerator.exportType', 'named'),
        defaultErrorStatusCode: config.get<number>(
          'requestValidatorGenerator.defaultErrorStatusCode',
          400,
        ),
      },
      criticalCssExtractor: {
        enabled: config.get<boolean>('criticalCssExtractor.enabled', true),
        outputDirectory: config.get<string>('criticalCssExtractor.outputDirectory', './styles'),
        criticalFileName: config.get<string>('criticalCssExtractor.criticalFileName', 'critical.css'),
        nonCriticalFileName: config.get<string>(
          'criticalCssExtractor.nonCriticalFileName',
          'non-critical.css',
        ),
        includeMediaQueries: config.get<boolean>('criticalCssExtractor.includeMediaQueries', false),
        includeKeyframes: config.get<boolean>('criticalCssExtractor.includeKeyframes', false),
        minifyOutput: config.get<boolean>('criticalCssExtractor.minifyOutput', false),
        generateAsyncLoader: config.get<boolean>('criticalCssExtractor.generateAsyncLoader', true),
        aboveFoldThreshold: config.get<number>('criticalCssExtractor.aboveFoldThreshold', 30),
      },
      rateLimitDashboardGenerator: {
        enabled: config.get<boolean>('rateLimitDashboardGenerator.enabled', true),
        includeTypeScript: config.get<boolean>('rateLimitDashboardGenerator.includeTypeScript', true),
        includeErrorHandling: config.get<boolean>(
          'rateLimitDashboardGenerator.includeErrorHandling',
          true,
        ),
        includeJSDoc: config.get<boolean>('rateLimitDashboardGenerator.includeJSDoc', true),
        framework: config.get<'react' | 'vue' | 'angular' | 'svelte'>(
          'rateLimitDashboardGenerator.framework',
          'react',
        ),
        includeRealtimeUpdates: config.get<boolean>(
          'rateLimitDashboardGenerator.includeRealtimeUpdates',
          true,
        ),
        includeCharts: config.get<boolean>('rateLimitDashboardGenerator.includeCharts', true),
        includeExport: config.get<boolean>('rateLimitDashboardGenerator.includeExport', true),
        outputDirectory: config.get<string>(
          'rateLimitDashboardGenerator.outputDirectory',
          'src/dashboards',
        ),
        backendType: config.get<'memory' | 'redis' | 'database'>(
          'rateLimitDashboardGenerator.backendType',
          'memory',
        ),
        defaultDashboardName: config.get<string>(
          'rateLimitDashboardGenerator.defaultDashboardName',
          'RateLimitMonitor',
        ),
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

  public getMockDataGeneratorConfig() {
    return this.getConfiguration().mockDataGenerator;
  }

  public getVitestTestGeneratorConfig() {
    return this.getConfiguration().vitestTestGenerator;
  }

  public getVitePluginGeneratorConfig() {
    return this.getConfiguration().vitePluginGenerator;
  }

  public getStorybookStoryGeneratorConfig() {
    return this.getConfiguration().storybookStoryGenerator;
  }

  public getCucumberSpecGeneratorConfig() {
    return this.getConfiguration().cucumberSpecGenerator;
  }

  public getCircuitBreakerGeneratorConfig() {
    return this.getConfiguration().circuitBreakerGenerator;
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

  public getGraphqlDirectiveGeneratorConfig() {
    return this.getConfiguration().graphqlDirectiveGenerator;
  }

  public getGraphqlMiddlewareGeneratorConfig() {
    return this.getConfiguration().graphqlMiddlewareGenerator;
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

  public getMemoryUsageAnalyzerConfig() {
    return this.getConfiguration().memoryUsageAnalyzer;
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

  public getReactContextGeneratorConfig() {
    return this.getConfiguration().reactContextGenerator;
  }

  public getReactTestingLibraryGeneratorConfig() {
    return this.getConfiguration().reactTestingLibraryGenerator;
  }

  public getReactErrorBoundaryGeneratorConfig() {
    return this.getConfiguration().reactErrorBoundaryGenerator;
  }

  public getReactFormValidatorConfig() {
    return this.getConfiguration().reactFormValidator;
  }

  public getRateLimiterGeneratorConfig() {
    return this.getConfiguration().rateLimiterGenerator;
  }

  public getRequestValidatorGeneratorConfig() {
    return this.getConfiguration().requestValidatorGenerator;
  }

  public getReadmeGeneratorConfig() {
    return this.getConfiguration().readmeGenerator;
  }

  public getDockerComposeGeneratorConfig() {
    return this.getConfiguration().dockerComposeGenerator;
  }

  public getChangelogGeneratorConfig() {
    return this.getConfiguration().changelogGenerator;
  }

  public getExpressRouteGeneratorConfig() {
    return this.getConfiguration().expressRouteGenerator;
  }

  public getRemixRouteGeneratorConfig() {
    return this.getConfiguration().remixRouteGenerator;
  }

  public getRemixActionGeneratorConfig() {
    return this.getConfiguration().remixActionGenerator;
  }

  public getExpressMiddlewarePipelineBuilderConfig() {
    return this.getConfiguration().expressMiddlewarePipelineBuilder;
  }

  public getCronJobGeneratorConfig() {
    return this.getConfiguration().cronJobGenerator;
  }

  public getVueRouterGeneratorConfig() {
    return this.getConfiguration().vueRouterGenerator;
  }

  public getApiClientGeneratorConfig() {
    return this.getConfiguration().apiClientGenerator;
  }

  public getAxiosClientGeneratorConfig() {
    return this.getConfiguration().axiosClientGenerator;
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

  public getJotaiAtomGeneratorConfig() {
    return this.getConfiguration().jotaiAtomGenerator;
  }

  public getTypescriptInterfaceExtractorConfig() {
    return this.getConfiguration().typescriptInterfaceExtractor;
  }

  public getZodSchemaGeneratorConfig() {
    return this.getConfiguration().zodSchemaGenerator;
  }

  public getMemoDecoratorGeneratorConfig() {
    return this.getConfiguration().memoDecoratorGenerator;
  }

  public getRetryDecoratorGeneratorConfig() {
    return this.getConfiguration().retryDecoratorGenerator;
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

  public getResponseFormatterGeneratorConfig() {
    return this.getConfiguration().responseFormatterGenerator;
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

  public getI18nKeyGeneratorConfig() {
    return this.getConfiguration().i18nKeyGenerator;
  }

  public getDependencyUpgradeAdvisorConfig() {
    return this.getConfiguration().dependencyUpgradeAdvisor;
  }

  public getDockerfileGeneratorConfig() {
    return this.getConfiguration().dockerfileGenerator;
  }

  public getElectronMainProcessGeneratorConfig() {
    return this.getConfiguration().electronMainProcessGenerator;
  }

  public getElectronPreloadGeneratorConfig() {
    return this.getConfiguration().electronPreloadGenerator;
  }

  public getElectronRendererProcessGeneratorConfig() {
    return this.getConfiguration().electronRendererProcessGenerator;
  }

  public getGrpcServiceGeneratorConfig() {
    return this.getConfiguration().grpcServiceGenerator;
  }

  public getMicroserviceEventGeneratorConfig() {
    return this.getConfiguration().microserviceEventGenerator;
  }

  public getKafkaConsumerGeneratorConfig() {
    return this.getConfiguration().kafkaConsumerGenerator;
  }

  public getKafkaProducerGeneratorConfig() {
    return this.getConfiguration().kafkaProducerGenerator;
  }

  public getRabbitMQConsumerGeneratorConfig() {
    return this.getConfiguration().rabbitmqConsumerGenerator;
  }

  public getMongoAggregationBuilderConfig() {
    return this.getConfiguration().mongoAggregationBuilder;
  }

  public getGitHubActionsWorkflowGeneratorConfig() {
    return this.getConfiguration().githubActionsWorkflowGenerator;
  }

  public getPrettierConfigOptimizerConfig() {
    return this.getConfiguration().prettierConfigOptimizer;
  }

  public getRedisCacheConfig() {
    return this.getConfiguration().redisCache;
  }

  public getRedisPubSubGeneratorConfig() {
    return this.getConfiguration().redisPubSubGenerator;
  }

  public getSolidComponentGeneratorConfig() {
    return this.getConfiguration().solidComponentGenerator;
  }

  public getTrpcContextGeneratorConfig() {
    return this.getConfiguration().trpcContextGenerator;
  }

  public getConditionalExtractConfig() {
    return this.getConfiguration().conditionalExtract;
  }

  public getCsvParserGeneratorConfig() {
    return this.getConfiguration().csvParserGenerator;
  }

  public getSocketIoHandlerGeneratorConfig() {
    return this.getConfiguration().socketIoHandlerGenerator;
  }

  public getSSEHandlerGeneratorConfig() {
    return this.getConfiguration().sseHandlerGenerator;
  }

  public getPaginatedQueryBuilderConfig() {
    return this.getConfiguration().paginatedQueryBuilder;
  }

  public getCriticalCssExtractorConfig() {
    return this.getConfiguration().criticalCssExtractor;
  }

  public getRateLimitDashboardGeneratorConfig() {
    return this.getConfiguration().rateLimitDashboardGenerator;
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
