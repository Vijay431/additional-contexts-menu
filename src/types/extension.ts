// TypeScript interfaces for the extension

export interface ProjectType {
  isNodeProject: boolean;
  frameworks: string[];
  hasTypeScript: boolean;
  supportLevel: 'full' | 'partial' | 'none';
}

export interface CompatibleFile {
  path: string;
  name: string;
  extension: string;
  isCompatible: boolean;
  lastModified: Date;
  relativePath: string;
}

export interface SaveAllResult {
  totalFiles: number;
  savedFiles: number;
  failedFiles: string[];
  skippedFiles: string[];
  success: boolean;
}

export interface CopyValidation {
  canCopy: boolean;
  targetExists: boolean;
  isCompatible: boolean;
  hasWritePermission: boolean;
  hasParseErrors: boolean;
  estimatedConflicts: number;
}

export interface MoveValidation {
  canMove: boolean;
  reason?: string;
  targetExists: boolean;
  isCompatible: boolean;
  hasWritePermission: boolean;
}

export interface CopyConflictResolution {
  handleNameConflicts: boolean;
  mergeImports: boolean;
  preserveComments: boolean;
  maintainFormatting: boolean;
}

export interface SaveAllFeedback {
  showProgress: boolean;
  showNotification: boolean;
  showFileCount: boolean;
  showFailures: boolean;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  type: 'function' | 'method' | 'arrow' | 'async' | 'component' | 'hook';
  isExported: boolean;
  hasDecorators: boolean;
  fullText: string;
}

export interface ExtensionConfig {
  enabled: boolean;
  autoDetectProjects: boolean;
  supportedExtensions: string[];
  copyCode: {
    insertionPoint: 'smart' | 'end' | 'beginning';
    handleImports: 'merge' | 'duplicate' | 'skip';
    preserveComments: boolean;
  };
  saveAll: {
    showNotification: boolean;
    skipReadOnly: boolean;
  };
  terminal: {
    type: 'integrated' | 'external' | 'system-default';
    externalTerminalCommand?: string;
    openBehavior: 'parent-directory' | 'workspace-root' | 'current-directory';
  };
  secretDetection: {
    enabled: boolean;
    scanOnSave: boolean;
    showSuggestions: boolean;
    excludedPatterns: string[];
  };
  importSorting: {
    enabled: boolean;
    groupOrder: ('external' | 'internal' | 'relative' | 'type')[];
    sortAlphabetically: boolean;
    groupSeparators: boolean;
    separateTypeImports: boolean;
    newlinesBetweenGroups: number;
  };
  bundleAnalysis: {
    enabled: boolean;
    autoAnalyzeAfterBuild: boolean;
    showLargeModuleThreshold: number;
    showLargeBundleThreshold: number;
  };
  complexityAnalysis: {
    enabled: boolean;
    maxFunctionLength: number;
    maxCyclomaticComplexity: number;
    maxNestingDepth: number;
    maxParameters: number;
    showSuggestions: boolean;
  };
  snippetManager: {
    enabled: boolean;
    storageLocation: 'workspace' | 'global';
    autoDetectPlaceholders: boolean;
    placeholderPattern: string;
    variableInterpolation: {
      enabled: boolean;
      customVariables: Record<string, string>;
    };
  };
  commitMessageGenerator: {
    enabled: boolean;
    includeFileListInBody: boolean;
    maxSuggestions: number;
    defaultCommitType: CommitMessageType;
  };
  propsGenerator: {
    enabled: boolean;
    inferTypesFromUsage: boolean;
    detectOptionalFromDefaults: boolean;
    includeJSDocComments: boolean;
    generateExportedInterfaces: boolean;
    strictTypeInference: boolean;
  };
  duplicateCodeDetection: {
    enabled: boolean;
    minBlockLines: number;
    minSimilarity: number;
    ignoreComments: boolean;
    ignoreWhitespace: boolean;
    maxFileCount: number;
    showSuggestions: boolean;
  };
  unusedDependencyDetection: {
    enabled: boolean;
    scanDevDependencies: boolean;
    checkMisplacedDependencies: boolean;
    maxFileCount: number;
  };
  dependencyUpgradeAdvisor: {
    enabled: boolean;
    checkDevDependencies: boolean;
    checkPreReleases: boolean;
    severityThreshold: 'low' | 'moderate' | 'high' | 'critical';
    maxOutdated: number;
    includePeerDependencies: boolean;
  };
  electronMainProcessGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeIPC: boolean;
    includeSecurity: boolean;
    includeAutoUpdater: boolean;
    defaultAppName: string;
    mainWindowPath: string;
    preloadPath: string;
  };
  electronPreloadGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeSandboxWarning: boolean;
    defaultApiName: string;
    preloadPath: string;
  };
  electronRendererProcessGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeIPC: boolean;
    includeReact: boolean;
    includeVue: boolean;
    includeSvelte: boolean;
    defaultComponentName: string;
    rendererPath: string;
  };
  dockerfileGenerator: {
    enabled: boolean;
    includeHealthcheck: boolean;
    includeEntrypoint: boolean;
    includeEnvironment: boolean;
    includeVolumes: boolean;
    includeExpose: boolean;
    defaultNodeVersion: string;
    includeMultiStage: boolean;
    includeDockerignore: boolean;
    includeDockerCompose: boolean;
    targetPort: number;
  };
  envVariableManager: {
    enabled: boolean;
    autoFormat: boolean;
    sortVariables: boolean;
    generateInterfaces: boolean;
    validateOnSave: boolean;
    showValidation: boolean;
    interfaceName: string;
  };
  errorPatternDetection: {
    enabled: boolean;
    includeUnhandledPromises: boolean;
    includeMissingErrorHandlers: boolean;
    includeRaceConditions: boolean;
    includeEmptyCatchBlocks: boolean;
    includeForgottenAwait: boolean;
    showSuggestions: boolean;
  };
  fileNamingConvention: {
    enabled: boolean;
    validateOnSave: boolean;
    defaultConvention: 'kebab-case' | 'camelCase' | 'PascalCase';
    showQuickFix: boolean;
    ignorePatterns: string[];
    fileExtensions: string[];
    severity: 'error' | 'warning' | 'info';
  };
  bulkFileRenamer: {
    enabled: boolean;
    updateImports: boolean;
    showPreview: boolean;
    handleCircularDependencies: boolean;
    fileExtensions: string[];
  };
  hookExtraction: {
    enabled: boolean;
    preserveImports: boolean;
    inferTypes: boolean;
    autoDetectHooks: boolean;
    defaultHookName: string;
    hooksDirectory: string;
  };
  nestjsControllerGenerator: {
    enabled: boolean;
    generateSwagger: boolean;
    generateValidation: boolean;
    includeGuards: boolean;
    includeInterceptors: boolean;
    includeFilters: boolean;
    defaultPathPrefix: string;
    dtoNamingConvention: 'suffix' | 'separate-folder';
  };
  nestjsServiceGenerator: {
    enabled: boolean;
    generateInterfaces: boolean;
    includeErrorHandling: boolean;
    includeTransactionSupport: boolean;
    defaultServicePath: string;
    useClassBasedValidation: boolean;
  };
  nestjsModuleGenerator: {
    enabled: boolean;
    generateImports: boolean;
    generateControllers: boolean;
    generateProviders: boolean;
    generateExports: boolean;
    addGlobalImports: boolean;
    organizationPattern: 'feature-based' | 'layered';
  };
  nestjsEntityGenerator: {
    enabled: boolean;
    generateRepository: boolean;
    generateDto: boolean;
    generateValidation: boolean;
    databaseType: 'typeorm' | 'mongoose';
    defaultEntityPath: string;
    generateSwagger: boolean;
  };
  nestjsWebSocketGatewayGenerator: {
    enabled: boolean;
    generateTypeScript: boolean;
    includeAuthGuard: boolean;
    includeValidation: boolean;
    includeRoomManagement: boolean;
    includeEventHandlers: boolean;
    defaultGatewayPath: string;
    generateGatewayEvents: boolean;
    includeWebSocketServer: boolean;
  };
  jestTestGenerator: {
    enabled: boolean;
    includeEdgeCases: boolean;
    includeErrorCases: boolean;
    testDirectory: string;
    setupType: 'none' | 'basic' | 'custom';
    customSetupPath?: string;
  };
  vitestTestGenerator: {
    enabled: boolean;
    includeEdgeCases: boolean;
    includeErrorCases: boolean;
    testDirectory: string;
    setupType: 'none' | 'basic' | 'custom';
    customSetupPath?: string;
    includeVitestUi: boolean;
    includeCoverageComments: boolean;
    mockPatterns: string[];
  };
  storybookStoryGenerator: {
    enabled: boolean;
    includeControls: boolean;
    includeArgsTypes: boolean;
    storyDirectory: string;
    framework: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
    storyFormat: 'csf' | 'mdx';
    autoGenerateVariants: boolean;
  };
  cucumberSpecGenerator: {
    enabled: boolean;
    includeExamples: boolean;
    includeBackground: boolean;
    featureDirectory: string;
    stepDefinitionsDirectory: string;
    generateTypeScript: boolean;
  };
  circuitBreakerGenerator: {
    enabled: boolean;
  };
  sagaPatternGenerator: {
    enabled: boolean;
  };
  coverageReporter: {
    enabled: boolean;
    thresholds: {
      line: number;
      branch: number;
      function: number;
      statement: number;
    };
    showUncoveredLines: boolean;
    trackTrends: boolean;
    highlightInEditor: boolean;
  };
  graphqlResolverGenerator: {
    enabled: boolean;
    generateDataLoaders: boolean;
    includeErrorHandling: boolean;
    includeAuthGuard: boolean;
    generateSubscriptions: boolean;
    defaultResolverPath: string;
    generateInterfaces: boolean;
  };
  nestjsDTOGenerator: {
    enabled: boolean;
    generateValidation: boolean;
    generateSwagger: boolean;
    defaultDTOSuffix: string;
    createBaseDTO: boolean;
    includePartialDTO: boolean;
    generateExampleComments: boolean;
  };
  graphqlSchemaGenerator: {
    enabled: boolean;
    includeDescriptions: boolean;
    includeDirectives: boolean;
    defaultSchemaPath: string;
    federationEnabled: boolean;
    federationVersion: '2.0' | '2.1';
    generateInputs: boolean;
    generateEnums: boolean;
    generateInterfaces: boolean;
    generateUnions: boolean;
  };
  graphqlDirectiveGenerator: {
    enabled: boolean;
    directivePath: string;
    includeAuthDirectives: boolean;
    includeLoggingDirectives: boolean;
    includeFormattingDirectives: boolean;
    includeValidationDirectives: boolean;
    includeTypeScript: boolean;
    defaultDirectiveName: string;
  };
  graphqlFederationGenerator: {
    enabled: boolean;
    federationVersion: '2.0' | '2.1';
    includeDescriptions: boolean;
    defaultSubgraphPath: string;
    generateEntityExtensions: boolean;
    generateReferenceResolvers: boolean;
    generateKeyDirectives: boolean;
    generateShareableDirectives: boolean;
  };
  graphqlMiddlewareGenerator: {
    enabled: boolean;
    middlewarePath: string;
    includeAuthMiddleware: boolean;
    includeLoggingMiddleware: boolean;
    includeErrorHandling: boolean;
    includeRateLimiting: boolean;
    includeTypeScript: boolean;
    defaultMiddlewareName: string;
    enableFieldLevel: boolean;
    enableOperationLevel: boolean;
  };
  nextjsApiRouteGenerator: {
    enabled: boolean;
    directoryPattern: 'app' | 'pages';
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeValidation: boolean;
    defaultRoutePath: string;
    exportType: 'named' | 'default';
  };
  nextjsPageScaffolder: {
    enabled: boolean;
    directoryPattern: 'app' | 'pages';
    includeTypeScript: boolean;
    includeMetadata: boolean;
    includeLayout: boolean;
    includeLoading: boolean;
    includeError: boolean;
    includeNotFound: boolean;
    defaultComponentType: 'server' | 'client';
    defaultPath: string;
  };
  nestjsGuardGenerator: {
    enabled: boolean;
    generateJwtStrategy: boolean;
    generateRolesGuard: boolean;
    generatePermissionsGuard: boolean;
    generateGlobalGuard: boolean;
    generateDecorators: boolean;
    defaultGuardName: string;
    guardDirectory: string;
  };
  nuxtjsPageGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeMetadata: boolean;
    includeAsyncData: boolean;
    includeUseFetch: boolean;
    includeLayout: boolean;
    includeMiddleware: boolean;
    defaultPagePath: string;
  };
  nuxtComposableGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeAutoImports: boolean;
    includeSSRSupport: boolean;
    includeContextHandling: boolean;
    generateReturnType: boolean;
    defaultComposableDirectory: string;
    addJSDocComments: boolean;
    includeAsyncReturnType: boolean;
    generateHelpers: boolean;
  };
  nuxtServerRouteGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeValidation: boolean;
    includeEventStream: boolean;
    defaultRoutePath: string;
    returnHandlerType: 'handler' | 'eventHandler';
  };
  nuxtModuleGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeConfigOptions: boolean;
    includeLifecycleHooks: boolean;
    includePluginRegistration: boolean;
    includeCompositionSupport: boolean;
    includeModuleTypes: boolean;
    defaultModulePath: string;
    addJSDocComments: boolean;
    generateModuleMeta: boolean;
    includeVersionValidation: boolean;
  };
  openApiSpecGenerator: {
    enabled: boolean;
    outputFormat: 'json' | 'yaml';
    includeDescriptions: boolean;
    includeExamples: boolean;
    excludePrivateRoutes: boolean;
    outputDirectory: string;
    defaultServerUrl: string;
    includeSecuritySchemes: boolean;
  };
  packagejsonScriptsManager: {
    enabled: boolean;
    showTemplates: boolean;
    autoDetectPackageManager: boolean;
    defaultPackageManager: 'npm' | 'yarn' | 'pnpm';
  };
  performanceProfiler: {
    enabled: boolean;
    minExecutionTime: number;
    minMemoryUsage: number;
    maxNestingDepth: number;
    analyzeAsyncOperations: boolean;
    showOptimizationSuggestions: boolean;
  };
  memoryUsageAnalyzer: {
    enabled: boolean;
    maxArraySize: number;
    maxObjectDepth: number;
    checkEventListeners: boolean;
    checkTimers: boolean;
    checkClosures: boolean;
    showSuggestions: boolean;
  };
  playwrightTestGenerator: {
    enabled: boolean;
    includeEdgeCases: boolean;
    includeErrorCases: boolean;
    testDirectory: string;
    generatePageObjects: boolean;
    pageObjectsDirectory: string;
    useDataAttributes: boolean;
    waitingStrategy: 'waitForLoadState' | 'waitForSelector' | 'waitForResponse' | 'mixed';
    includeAccessibilityTests: boolean;
    includeVisualRegression: boolean;
    customFixturePath?: string;
  };
  prismaSchemaGenerator: {
    enabled: boolean;
    includeComments: boolean;
    includeIndexes: boolean;
    defaultSchemaPath: string;
    defaultDataSourceProvider:
      | 'postgresql'
      | 'mysql'
      | 'sqlite'
      | 'sqlserver'
      | 'mongodb'
      | 'cockroachdb';
    generateRelations: boolean;
    generateMigrations: boolean;
    idFieldType: 'Int' | 'String' | 'UUID';
  };
  prismaClientGenerator: {
    enabled: boolean;
    outputPath: string;
    includeTransactionMethods: boolean;
    includeErrorHandling: boolean;
    includeSoftDelete: boolean;
    includePagination: boolean;
    includeCaching: boolean;
    includeValidation: boolean;
    generateRepositoryInterface: boolean;
    prismaImportPath: string;
    errorHandlingType: 'try-catch' | 'result-type' | 'both';
  };
  reactQueryGenerator: {
    enabled: boolean;
    queryKeyPrefix: string;
    includeMutationHooks: boolean;
    includeInfiniteQuery: boolean;
    staleTime: number;
    cacheTime: number;
    refetchOnWindowFocus: boolean;
  };
  reactContextGenerator: {
    enabled: boolean;
    contextDirectory: string;
    includeHook: boolean;
    includeProvider: boolean;
    includeContextValue: boolean;
    includeDefaultValue: boolean;
    generateSeparateFiles: boolean;
    exportType: 'named' | 'default';
  };
  reactTestingLibraryGenerator: {
    enabled: boolean;
    testDirectory: string;
    includeUserInteractionTests: boolean;
    includeAccessibilityTests: boolean;
    includeEdgeCaseTests: boolean;
    includeAsyncTests: boolean;
    includeSnapshotTests: boolean;
    customRenderPath?: string;
  };
  reactErrorBoundaryGenerator: {
    enabled: boolean;
    includeFallbackUI: boolean;
    includeErrorInfo: boolean;
    includeResetHooks: boolean;
    logErrors: boolean;
    showErrorDetails: boolean;
  };
  reactFormValidator: {
    enabled: boolean;
    outputDirectory: string;
    includeSubmitHandler: boolean;
    includeResetHandler: boolean;
    includeFormErrors: boolean;
    includeTouchedState: boolean;
    useFormState: boolean;
    defaultValuesSource: 'props' | 'useState' | 'url';
    generateTypes: boolean;
    defaultValidationLibrary: 'zod' | 'yup' | 'none';
  };
  reactSuspenseBoundaryGenerator: {
    enabled: boolean;
    defaultBoundaryType: 'simple' | 'nested' | 'progressive';
    includeTypeScript: boolean;
    includeErrorBoundary: boolean;
    includeFallbackComponent: boolean;
    includeLoadingIndicator: boolean;
    includeSuspenseList: boolean;
    defaultBoundaryName: string;
    defaultFallbackComponentName: string;
    defaultLoadingIndicatorType: 'skeleton' | 'spinner' | 'progress' | 'custom';
    defaultNestedLevels: number;
  };
  reactPortalGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeZIndexManagement: boolean;
    includeEventPropagationHandling: boolean;
    includeCloseOnEscape: boolean;
    includeCloseOnOutsideClick: boolean;
    defaultPortalType: 'modal' | 'tooltip' | 'custom';
    defaultPortalContainerId: string;
    defaultZIndex: number;
    defaultClassName: string;
  };
  readmeGenerator: {
    enabled: boolean;
  };
  dockerComposeGenerator: {
    enabled: boolean;
  };
  expressRouteGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeValidation: boolean;
    includeAsyncAwait: boolean;
    includeMiddleware: boolean;
    includeJSDoc: boolean;
    defaultRoutePath: string;
    routerPattern: 'router' | 'app' | 'express-router';
    exportType: 'named' | 'default';
    parameterStyle: 'destructured' | 'properties';
    responsePattern: 'res-send' | 'res-json' | 'res-status';
  };
  expressMiddlewarePipelineBuilder: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeJSDoc: boolean;
    defaultRoutePath: string;
    exportType: 'named' | 'default';
    allowCustomMiddleware: boolean;
  };
  apiClientGenerator: {
    enabled: boolean;
    targetFramework: 'react' | 'vue' | 'angular' | 'svelte';
    includeTypeScript: boolean;
    generateFetchClient: boolean;
    generateAxiosClient: boolean;
    outputDirectory: string;
    baseApiUrl?: string;
  };
  axiosClientGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeInterceptors: boolean;
    includeTransformers: boolean;
    includeErrorHandling: boolean;
    includeRetryLogic: boolean;
    includeRequestCancellation: boolean;
    includeCacheAdapter: boolean;
    outputDirectory: string;
    clientClassName: string;
    baseApiUrl?: string;
    timeout?: number;
    generateReactQueryHooks: boolean;
    generateSwaggerTypes: boolean;
  };
  svelteActionGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    generateInterfaces: boolean;
    includeJSDocComments: boolean;
    defaultActionsDirectory: string;
    includeUsageExamples: boolean;
  };
  sveltekitPageGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeMetadata: boolean;
    includeLoadFunction: boolean;
    includeServerLoad: boolean;
    includeActions: boolean;
    includeErrorHandling: boolean;
    defaultPagePath: string;
  };
  sveltekitServerGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeValidation: boolean;
    defaultRoutePath: string;
    exportPattern: 'named' | 'default';
  };
  svelteStoreCreator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeJSDocComments: boolean;
    defaultPersistenceType: 'localStorage' | 'sessionStorage' | 'none';
    defaultStoresDirectory: string;
    enablePersistenceByDefault: boolean;
  };
  piniaStoreGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeJSDocComments: boolean;
    defaultPersistenceType: 'localStorage' | 'sessionStorage' | 'none';
    defaultStoresDirectory: string;
    enablePersistenceByDefault: boolean;
  };
  zustandStoreGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeJSDocComments: boolean;
    defaultDevtoolsEnabled: boolean;
    defaultPersistEnabled: boolean;
    defaultPersistenceType: 'localStorage' | 'sessionStorage';
    defaultImmerEnabled: boolean;
    defaultStoresDirectory: string;
  };
  jotaiAtomGenerator: {
    enabled: boolean;
    atomsDirectory: string;
    includeTypes: boolean;
    includeJSDoc: boolean;
    includeDefaultValues: boolean;
    makeAtomsReadOnly: boolean;
    generateAtomFamilies: boolean;
    generateAsyncAtoms: boolean;
    generateDerivedAtoms: boolean;
    enablePersistence: boolean;
    defaultPersistenceStorage: 'localStorage' | 'sessionStorage';
  };
  vueRouterGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeGuards: boolean;
    includeLazyLoading: boolean;
    includeMetaFields: boolean;
    generateNavigationHelpers: boolean;
    defaultRoutePath: string;
    historyMode: 'createWebHistory' | 'createMemoryHistory' | 'createHashHistory';
    exportType: 'named' | 'default';
    routeCompositionStyle: 'array' | 'object';
  };
  taskRunner: {
    enabled: boolean;
    autoDetect: boolean;
    showOutputPanel: boolean;
    clearOutputOnRun: boolean;
    saveOutputToFile: boolean;
    outputDirectory: string;
    maxOutputLines: number;
    showErrorParsing: boolean;
    statusBarEnabled: boolean;
    supportedRunners: ('npm' | 'yarn' | 'pnpm' | 'gulp' | 'grunt' | 'webpack')[];
    taskListRefreshInterval: number;
    defaultTerminalBehavior: 'show' | 'hide' | 'create-new';
  };
  typescriptInterfaceExtractor: {
    enabled: boolean;
    includeReadonly: boolean;
    includeJSDoc: boolean;
    exportInterface: boolean;
    inferTypesFromValues: boolean;
    detectOptional: boolean;
    treatNullAsOptional: boolean;
    useExplicitAny: boolean;
    defaultInterfaceName: string;
    outputLocation: 'separate-file' | 'same-file' | 'types-directory';
    typesDirectoryName?: string;
  };
  unusedImportDetection: {
    enabled: boolean;
    detectOnSave: boolean;
    showDiagnostics: boolean;
    ignoreTypeOnlyImports: boolean;
    ignoreUnusedInTypes: boolean;
    includeDefaultImports: boolean;
    includeNamespaceImports: boolean;
    autoFixOnSave: boolean;
    excludePatterns: string[];
  };
  suggestionHub: {
    enabled: boolean;
    autoAnalyzeOnOpen: boolean;
    maxSuggestionsPerCategory: number;
    severityFilter: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
    categoryFilter: (
      | 'security'
      | 'code-quality'
      | 'performance'
      | 'maintainability'
      | 'best-practices'
      | 'error-prevention'
    )[];
    showQuickActions: boolean;
    groupByCategory: boolean;
    sortBy: 'severity' | 'category' | 'file' | 'priority';
    enableAutoFix: boolean;
  };
  workspaceSymbolSearch: {
    enabled: boolean;
    maxResults: number;
    fuzzyMatchThreshold: number;
    defaultKinds: SymbolKind[];
    showPreview: boolean;
    groupResults: boolean;
  };
  symbolReferenceMapper: {
    enabled: boolean;
    defaultDirection: CallHierarchyDirection;
    includeImports: boolean;
    maxResults: number;
    showReferencesQuickPick: boolean;
    showCallHierarchyTree: boolean;
  };
  zodSchemaGenerator: {
    enabled: boolean;
    includeJSDoc: boolean;
    includeErrorMessages: boolean;
    includeRefinements: boolean;
    generateInferredType: boolean;
    generateInputOutputTypes: boolean;
    importZod: boolean;
    useConst: boolean;
    useDateCoerce: boolean;
    defaultSchemaName: string;
    exportSchema: boolean;
  };
  memoDecoratorGenerator: {
    enabled: boolean;
    defaultCacheStrategy: CacheStrategy;
    defaultTtlMs: number;
    defaultMaxSize: number;
    includeJSDoc: boolean;
    exportDecorator: boolean;
    importHelper: boolean;
    defaultDecoratorName: string;
  };
  retryDecoratorGenerator: {
    enabled: boolean;
    defaultMaxRetries: number;
    defaultInitialDelay: number;
    defaultBackoffType: BackoffType;
    jitterEnabled: boolean;
    includeCircuitBreaker: boolean;
    includeJSDoc: boolean;
    exportDecorator: boolean;
    importHelper: boolean;
    defaultDecoratorName: string;
  };
  elasticsearchMappingGenerator: {
    enabled: boolean;
    includeIndexSettings: boolean;
    includeAnalyzers: boolean;
    includeDynamicTemplates: boolean;
    defaultNumberOfShards: number;
    defaultNumberOfReplicas: number;
    defaultRefreshInterval: string;
    defaultIndexName: string;
  };
  angularServiceGenerator: {
    enabled: boolean;
    includeHttpClient: boolean;
    generateCrudMethods: boolean;
    includeErrorHandling: boolean;
    includeJSDocComments: boolean;
    defaultServicePath: string;
    providedInRoot: boolean;
    defaultApiUrl: string;
  };
  apiDocumentationGenerator: {
    enabled: boolean;
    includePrivate: boolean;
    includeProtected: boolean;
    outputFormat: 'markdown' | 'html';
    includeExamples: boolean;
    includeTypeDefinitions: boolean;
    groupByCategory: boolean;
    addTableOfContents: boolean;
  };
  architectureDiagramGenerator: {
    enabled: boolean;
    outputFormat: 'mermaid' | 'plantuml';
    includePatterns: string[];
    excludeDirectories: string[];
    moduleDepth: number;
    includeExternalDependencies: boolean;
    includeFileCount: boolean;
    includeStyles: boolean;
  };
  astroPageGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeMetadata: boolean;
    includeLayout: boolean;
    include404: boolean;
    includeSSR: boolean;
    defaultPagePath: string;
  };
  astroIntegrationGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeLifecycleHooks: boolean;
    includeConfigurationSchema: boolean;
    includeMarkdownDocumentation: boolean;
    includeTests: boolean;
    defaultIntegrationPath: string;
    supportedIntegrationTypes: string[];
  };
  branchNamingConvention: {
    enabled: boolean;
    validateOnCheckout: boolean;
    validateOnCreate: boolean;
    enabledPatterns: string[];
    severity: 'error' | 'warning' | 'info';
    excludedBranches: string[];
    customPatterns: Record<string, string>;
    allowIssueNumbers: boolean;
    issueNumberPattern: string;
    maxLength: number;
    minLength: number;
    suggestBranchNames: boolean;
  };
  bullQueueGenerator: {
    enabled: boolean;
    includeErrorHandling: boolean;
    includeRetryLogic: boolean;
    includeEventHandlers: boolean;
    defaultConcurrency: number;
    removeOnComplete: number | null;
    removeOnFail: number | null;
    defaultQueuePath: string;
  };
  bullBoardGenerator: {
    enabled: boolean;
    framework: 'express' | 'hapi' | 'fastify' | 'koa';
    includeJobManagement: boolean;
    includeRetryLogic: boolean;
    includeJobRemoval: boolean;
    includeJobPromotion: boolean;
    includeTypescript: boolean;
    defaultBoardPath: string;
  };
  changelogGenerator: {
    enabled: boolean;
    includeUnreleased: boolean;
    maxCommits: number;
    groupByType: boolean;
    linkIssues: boolean;
    repoUrl?: string;
  };
  bookmarkManager: {
    enabled: boolean;
    storageLocation: 'workspace' | 'global';
    showInExplorer: boolean;
    autoBookmarkOnNavigation: boolean;
    defaultCategories: string[];
    maxBookmarksPerFile: number;
  };
  i18nKeyGenerator: {
    enabled: boolean;
    baseNamespace: string;
    outputDirectory: string;
    fileFormat: 'json' | 'ts' | 'js';
    keyPrefix: string;
    includeHelpers: boolean;
    extractFromStrings: boolean;
    extractFromTemplates: boolean;
    generateNamespaces: boolean;
    generateScopedHelpers: boolean;
  };
  securityAudit: {
    enabled: boolean;
    scanOnSave: boolean;
    includeDependencyAudit: boolean;
    includeCodePatterns: boolean;
    excludedPatterns: string[];
    severityFilter: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
    showSuggestions: boolean;
    autoFix: boolean;
  };
  githubActionsWorkflowGenerator: {
    enabled: boolean;
    defaultNodeVersion: string;
    enableMatrixStrategy: boolean;
    nodeVersions: string[];
    enableCaching: boolean;
    includeSecurityAudit: boolean;
    includeCodeQuality: boolean;
    includeDeployJob: boolean;
    deployTarget: 'vercel' | 'netlify' | 'docker' | 'npm' | 'none';
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'auto';
  };
  grpcServiceGenerator: {
    enabled: boolean;
    generateProtoFile: boolean;
    generateServiceImplementation: boolean;
    generateClientWrapper: boolean;
    generateTypeScriptInterfaces: boolean;
    includeErrorHandling: boolean;
    includeValidation: boolean;
    defaultProtoPath: string;
    defaultServicePath: string;
    defaultClientPath: string;
    protoVersion: 'proto3' | 'proto2';
    useStaticClient: boolean;
    includeLoadBalancing: boolean;
  };
  microserviceEventGenerator: {
    enabled: boolean;
    includeErrorHandling: boolean;
    defaultBrokerType: 'rabbitmq' | 'kafka';
    maxConcurrentMessages: number;
    defaultOutputPath: string;
    includeTypeScript: boolean;
    generateDocumentation: boolean;
  };
  mockDataGenerator: {
    enabled: boolean;
    exportData: boolean;
    includeTypeAnnotations: boolean;
    includeJSDoc: boolean;
    includeOptionalProperties: boolean;
    includeReadonlyProperties: boolean;
    includeNullValues: boolean;
    useFakerPatterns: boolean;
    arraySize: number;
  };
  prettierConfigOptimizer: {
    enabled: boolean;
    autoDetectProjectPatterns: boolean;
    scanOnOpen: boolean;
    maxFilesToScan: number;
    excludedDirectories: string[];
    configFileLocations: string[];
    suggestOnInconsistency: boolean;
    consistencyThreshold: number;
  };
  redisCache: {
    enabled: boolean;
    url: string;
    maxMemory: number;
    maxKeyLength: number;
    keyPrefix: string;
    defaultTTL: number;
    autoCleanup: boolean;
    cleanupInterval: number;
  };
  redisPubSubGenerator: {
    enabled: boolean;
    includeErrorHandling: boolean;
    includePatternSubscription: boolean;
    includeMessageValidation: boolean;
    generateTypedMessages: boolean;
    defaultPubSubPath: string;
  };
  rateLimiterGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeJSDoc: boolean;
    backend: 'memory' | 'redis' | 'both';
    slidingWindow: boolean;
    windowSize: number;
    maxRequests: number;
    penaltyBoxEnabled: boolean;
    penaltyDuration: number;
    skipFailedRequests: boolean;
    skipSuccessfulRequests: boolean;
    defaultLimiterName: string;
    outputDirectory: string;
    middlewarePattern: 'express' | 'fastify' | 'nestjs' | 'generic';
    exportType: 'named' | 'default';
  };
  requestValidatorGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    defaultLibrary: 'joi' | 'zod';
    includeErrorHandling: boolean;
    includeJSDoc: boolean;
    defaultMiddlewareName: string;
    outputDirectory: string;
    generateUsageExamples: boolean;
    exportType: 'named' | 'default';
    defaultErrorStatusCode: number;
  };
  remixRouteGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeLoader: boolean;
    includeAction: boolean;
    includeMeta: boolean;
    includeErrorHandling: boolean;
    includeHeaders: boolean;
    includeLinks: boolean;
    defaultRoutePath: string;
    exportType: 'named' | 'default';
  };
  remixActionGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeValidation: boolean;
    includeErrorHandling: boolean;
    includeRedirects: boolean;
    includeFormDataParsing: boolean;
    defaultActionPath: string;
    exportType: 'named' | 'default';
  };
  remixLoaderGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeCaching: boolean;
    includeValidation: boolean;
    databaseType: 'none' | 'prisma' | 'drizzle' | 'raw-sql' | 'mongodb';
    cachingStrategy: 'none' | 'memory' | 'redis' | 'vercel-kv' | 'cloudflare-kv';
    defaultLoaderPath: string;
    exportType: 'named' | 'default';
  };
  solidComponentGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeSignals: boolean;
    includeMemos: boolean;
    includeLifecycleMethods: boolean;
    includeContext: boolean;
    defaultComponentPath: string;
  };
  t3StackGenerator: {
    enabled: boolean;
    outputDirectory: string;
    includeNextjs: boolean;
    includeTypeScript: boolean;
    includeTrpc: boolean;
    includePrisma: boolean;
    includeTailwind: boolean;
    includeNextAuth: boolean;
    includeZod: boolean;
    includeTesting: boolean;
    defaultAppName: string;
    includeDocumentation: boolean;
  };
  trpcRouterGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeZodSchemas: boolean;
    includeErrorHandling: boolean;
    includeMiddleware: boolean;
    includeContext: boolean;
    includeInputValidation: boolean;
    includeMeta: boolean;
    exportType: 'named' | 'default';
    procedureType: 'query' | 'mutation' | 'subscription';
    routerPattern: 'app-router' | 'pages-router';
    contextType: 'async' | 'sync';
  };
  trpcContextGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeSession: boolean;
    includeDatabase: boolean;
    includeUser: boolean;
    includeRequest: boolean;
    includeResponse: boolean;
    contextType: 'async' | 'sync';
    dependencyInjection: 'manual' | 'inversify' | 'custom';
    includeHelpers: boolean;
    includeValidators: boolean;
  };
  typeormMigrationGenerator: {
    enabled: boolean;
    generateDownSql: boolean;
    includeTransactionWrapper: boolean;
    includeComments: boolean;
    timestampNaming: boolean;
    outputDirectory: string;
    dataSourceName: string;
    safeMode: boolean;
    includeRollback: boolean;
  };
  vitePluginGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeBuildOptimizations: boolean;
    includeDevServer: boolean;
    includePlugins: boolean;
    defaultPluginName: string;
    outputDirectory: string;
    includeRollupConfig: boolean;
    includeViteConfig: boolean;
  };
  webpackConfigGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeCodeSplitting: boolean;
    includeBundleAnalysis: boolean;
    includePerformanceTuning: boolean;
    includeOptimization: boolean;
    includeDevServer: boolean;
    includeLoaders: boolean;
    includePlugins: boolean;
    defaultConfigName: string;
    outputDirectory: string;
    targetEnvironment: 'web' | 'node' | 'electron' | 'auto';
    mode: 'development' | 'production' | 'none';
  };
  watchTaskManager: {
    enabled: boolean;
    autoDetect: boolean;
    maxOutputLines: number;
    restartOnFailure: boolean;
    maxRestartAttempts: number;
    restartDelay: number;
    statusBarEnabled: boolean;
    showTaskOutput: boolean;
    dedicatedChannels: boolean;
  };
  apiCacheMiddleware: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeETag: boolean;
    includeStaleWhileRevalidate: boolean;
    includeCacheControl: boolean;
    includeVaryHeader: boolean;
    defaultTTL: number;
    staleTTL: number;
    sharedCacheMaxAge: number;
    privateCacheMaxAge: number;
    defaultCachePolicy: 'public' | 'private' | 'no-cache' | 'no-store';
    middlewareName: string;
    outputDirectory: string;
    generateInvalidationHelper: boolean;
    includeKeyGenerator: boolean;
    includeMetrics: boolean;
  };
  conditionalExtract: {
    enabled: boolean;
    maxConditions: number;
    maxNestingDepth: number;
    minOperators: number;
    showSuggestions: boolean;
    autoAnalyzeOnOpen: boolean;
  };
  cronJobGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeExecutionLogging: boolean;
    includeTimeZone: boolean;
    defaultTimeZone: string;
    defaultJobsPath: string;
    exportType: 'named' | 'default';
    onComplete?: 'stop' | 'start';
  };
  csvParserGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeStreaming: boolean;
    includeTypeConversion: boolean;
    includeErrorHandling: boolean;
    includeJSDoc: boolean;
    defaultDelimiter: string;
    defaultQuoteChar: string;
    defaultEscapeChar: string;
    includeHeaderRow: boolean;
    skipEmptyLines: boolean;
    trimFields: boolean;
  };
  dtoValidator: {
    enabled: boolean;
    autoDetectValidations: boolean;
    includeSwagger: boolean;
    includeJSDoc: boolean;
    customErrorMessages: boolean;
    addTransforms: boolean;
    defaultClassSuffix: string;
  };
  eventEmitterGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeJSDoc: boolean;
    generateEventMap: boolean;
    includeFilterSupport: boolean;
    includeAsyncHandling: boolean;
    includeOnceSupport: boolean;
    defaultEmitterName: string;
    outputDirectory: string;
    exportType: 'named' | 'default';
  };
  fsPathResolver: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeJSDoc: boolean;
    defaultOutputDirectory: string;
    generateUtilities: boolean;
    utilityTypes: ('path-resolution' | 'path-validation' | 'path-normalization' | 'workspace-relative')[];
  };
  kafkaConsumerGenerator: {
    enabled: boolean;
    includeErrorHandling: boolean;
    includeRetryStrategy: boolean;
    includeDeserialization: boolean;
    defaultConsumerPath: string;
  };
  kafkaProducerGenerator: {
    enabled: boolean;
    includeErrorHandling: boolean;
    includeSerialization: boolean;
    defaultProducerPath: string;
  };
  rabbitmqConsumerGenerator: {
    enabled: boolean;
    includeErrorHandling: boolean;
    includeRetryLogic: boolean;
    includeDeadLetterExchange: boolean;
    defaultConsumerPath: string;
  };
  mongoAggregationBuilder: {
    enabled: boolean;
    includeComments: boolean;
    includeTypeScriptTypes: boolean;
    defaultOutputPath: string;
    generatePipelineBuilder: boolean;
    generateHelperMethods: boolean;
  };
  reactVirtualListGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    listType: 'fixed-size' | 'variable-size' | 'grid';
    itemHeight: number;
    includeScrollToIndex: boolean;
    includeScrollToItem: boolean;
    generateTypes: boolean;
    overscanRowCount: number;
    direction: 'vertical' | 'horizontal';
    defaultComponentDirectory: string;
  };
  socketIoHandlerGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeJSDoc: boolean;
    generateTypedEvents: boolean;
    generateTypedEmitters: boolean;
    generateTypedNamespaces: boolean;
    includeAuthentication: boolean;
    includeRoomManagement: boolean;
    includeMiddleware: boolean;
    includeErrorHandling: boolean;
    defaultServerName: string;
    defaultOutputPath: string;
    exportType: 'named' | 'default';
  };
  sseHandlerGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeHeartbeat: boolean;
    includeReconnection: boolean;
    includeEventFiltering: boolean;
    defaultHeartbeatInterval: number;
    defaultReconnectInterval: number;
    defaultMaxReconnectAttempts: number;
    defaultOutputPath: string;
    framework: 'express' | 'fastify' | 'nestjs' | 'generic';
    exportType: 'named' | 'default';
  };
  pdfReportGenerator: {
    enabled: boolean;
    library: 'pdfkit' | 'jsPDF';
    outputDirectory: string;
    margin: number;
    includeHeaders: boolean;
    includeFooters: boolean;
    includeTables: boolean;
    includeCharts: boolean;
    defaultFontSize: number;
    generateTypeScript: boolean;
  };
  paginatedQueryBuilder: {
    enabled: boolean;
    defaultPageSize: number;
    maxPageSize: number;
    defaultStrategy: 'offset' | 'cursor';
    includeTypeScriptTypes: boolean;
    includeErrorHandling: boolean;
    includeValidation: boolean;
    outputDirectory: string;
    generateRepositoryMethods: boolean;
    generateServiceMethods: boolean;
  };
  criticalCssExtractor: {
    enabled: boolean;
    outputDirectory: string;
    criticalFileName: string;
    nonCriticalFileName: string;
    includeMediaQueries: boolean;
    includeKeyframes: boolean;
    minifyOutput: boolean;
    generateAsyncLoader: boolean;
    aboveFoldThreshold: number;
  };
  rateLimitDashboardGenerator: {
    enabled: boolean;
    includeTypeScript: boolean;
    includeErrorHandling: boolean;
    includeJSDoc: boolean;
    framework: 'react' | 'vue' | 'angular' | 'svelte';
    includeRealtimeUpdates: boolean;
    includeCharts: boolean;
    includeExport: boolean;
    outputDirectory: string;
    backendType: 'memory' | 'redis' | 'database';
    defaultDashboardName: string;
  };
}

// Re-export service types
export type {
  RateLimitDashboardConfig,
  RateLimitMetric,
  GeneratedRateLimitDashboard,
  GeneratedFile,
} from '../services/rateLimitDashboardGeneratorService';

export type SecretType =
  | 'api-key'
  | 'aws-access-key'
  | 'aws-secret-key'
  | 'github-token'
  | 'jwt'
  | 'password'
  | 'private-key'
  | 'slack-token'
  | 'stripe-key'
  | 'generic-token'
  | 'database-url'
  | 'email'
  | 'ip-address';

export interface SecretMatch {
  type: SecretType;
  line: number;
  column: number;
  value: string;
  matchedText: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface SecretDetectionResult {
  hasSecrets: boolean;
  matches: SecretMatch[];
  fileScanned: string;
  scanDuration: number;
}

export interface ModuleInfo {
  name: string;
  size: number;
  path: string;
}

export interface BundleInfo {
  name: string;
  path: string;
  size: number;
  gzipSize: number;
  modules: ModuleInfo[];
}

export interface CodeSplittingSuggestion {
  type:
    | 'split-large-bundle'
    | 'lazy-load-module'
    | 'deduplicate-dependency'
    | 'enable-code-splitting';
  description: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

export interface BundleAnalysis {
  bundles: BundleInfo[];
  totalSize: number;
  totalGzipSize: number;
  modules: ModuleInfo[];
  codeSplittingSuggestions: CodeSplittingSuggestion[];
}

export interface ComplexityMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'error';
}

export interface FunctionComplexityInfo {
  name: string;
  startLine: number;
  endLine: number;
  cyclomaticComplexity: number;
  nestingDepth: number;
  linesOfCode: number;
  parameters: number;
}

export interface ComplexityAnalysisResult {
  file: string;
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: ComplexityMetric[];
  functions: FunctionComplexityInfo[];
  suggestions: string[];
  analysisDuration: number;
}

// Code Snippet Manager Types
export interface Snippet {
  id: string;
  name: string;
  description?: string;
  language: string;
  folder?: string;
  code: string;
  placeholders: SnippetPlaceholder[];
  createdAt: number;
  updatedAt: number;
}

export interface SnippetPlaceholder {
  name: string;
  defaultValue?: string;
  isTabStop: boolean;
}

export interface SnippetFolder {
  name: string;
  language?: string;
  snippets: string[];
}

export interface SnippetStorage {
  snippets: Snippet[];
  folders: SnippetFolder[];
}

// Commit Message Generator Types
export type CommitMessageType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

export interface CommitMessage {
  type: CommitMessageType;
  scope?: string;
  description: string;
  body?: string;
  emoji: string;
}

// Component Props Generator Types
export interface GeneratedProp {
  name: string;
  typeName: string;
  isRequired: boolean;
  hasDefaultValue: boolean;
  defaultValue?: string;
  usageCount: number;
}

export interface ComponentUsageAnalysis {
  componentName: string;
  props: GeneratedProp[];
  interfaceCode: string;
  usagePattern: 'controlled' | 'uncontrolled' | 'hybrid';
  hasChildren: boolean;
}

export interface PropsGeneratorConfig {
  enabled: boolean;
  inferTypesFromUsage: boolean;
  detectOptionalFromDefaults: boolean;
  includeJSDocComments: boolean;
  generateExportedInterfaces: boolean;
  strictTypeInference: boolean;
}

// Duplicate Code Detection Types
export interface CodeBlock {
  file: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  text: string;
  normalizedText: string;
  hash: string;
}

export interface DuplicateGroup {
  id: string;
  blocks: CodeBlock[];
  similarity: number;
  linesOfCode: number;
  occurrenceCount: number;
  suggestions: string[];
}

export interface DuplicateCodeDetectionResult {
  file: string;
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
  totalDuplicateLines: number;
  potentialSavings: number;
  analysisDuration: number;
}

// Environment Variable Manager Types
export interface EnvVariable {
  name: string;
  value: string;
  lineNumber: number;
  comment?: string;
}

export interface EnvFileParseResult {
  filePath: string;
  variables: EnvVariable[];
  duplicates: Array<{
    name: string;
    lines: number[];
  }>;
  errors: string[];
  parseDuration: number;
}

export interface EnvValidationResult {
  isValid: boolean;
  issueCount: number;
  issues: string[];
  variableCount: number;
  duplicateCount: number;
  validationDuration: number;
}

// Error Pattern Detection Types
export type ErrorPatternType =
  | 'unhandled-promise'
  | 'missing-error-handler'
  | 'race-condition'
  | 'empty-catch-block'
  | 'forgotten-await';

export interface ErrorPatternMatch {
  type: ErrorPatternType;
  line: number;
  column: number;
  description: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
  codeSnippet: string;
}

export interface ErrorPatternDetectionResult {
  file: string;
  matches: ErrorPatternMatch[];
  totalErrors: number;
  totalWarnings: number;
  analysisDuration: number;
  suggestions: string[];
}

// Code Coverage Reporter Types
export interface CoverageThreshold {
  line: number;
  branch: number;
  function: number;
  statement: number;
}

export interface CoverageLineInfo {
  file: string;
  line: number;
  type: 'line' | 'branch' | 'function';
}

export interface CoverageSummary {
  totalLines: number;
  coveredLines: number;
  totalBranches: number;
  coveredBranches: number;
  totalFunctions: number;
  coveredFunctions: number;
  totalStatements: number;
  coveredStatements: number;
}

export interface CoverageMetrics {
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
}

export type CoverageStatus = 'excellent' | 'good' | 'warning' | 'critical';

export interface CoverageTrend {
  previousCoverage: number;
  timestamp: number;
}

export interface CoverageReport {
  summary: CoverageSummary;
  metrics: CoverageMetrics;
  status: CoverageStatus;
  thresholds: CoverageThreshold;
  uncoveredLines: CoverageLineInfo[];
  fileCount: number;
  trend?: CoverageTrend;
  analysisDuration: number;
}

export interface CoverageData {
  fileCoverage: Map<
    string,
    {
      lineCounts: Record<number, number>;
      branchCoverage: Record<number, number>;
      functionCoverage: Record<number, number>;
    }
  >;
  lines: { total: number; covered: number };
  branches: { total: number; covered: number };
  functions: { total: number; covered: number };
  statements: { total: number; covered: number };
}

// NestJS Controller Generator Types
export interface NestJSEndpoint {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete' | 'all';
  path: string;
  description?: string;
  params: NestJSParam[];
  returnType: string;
  statusCode?: number;
}

export interface NestJSParam {
  name: string;
  type: 'body' | 'query' | 'param' | 'file' | 'files' | 'headers';
  dataType: string;
  required: boolean;
  description?: string;
}

export interface GeneratedController {
  name: string;
  basePath: string;
  endpoints: NestJSEndpoint[];
  imports: string[];
  dtoFiles: Array<{ name: string; code: string }>;
  controllerCode: string;
}

// NestJS Service Generator Types
export interface NestJSServiceConfig {
  enabled: boolean;
  generateInterfaces: boolean;
  includeErrorHandling: boolean;
  includeTransactionSupport: boolean;
  defaultServicePath: string;
  useClassBasedValidation: boolean;
}

export interface NestJSServiceMethod {
  name: string;
  description?: string;
  parameters: NestJSServiceParameter[];
  returnType: string;
  isAsync: boolean;
  errorHandling: boolean;
  transactional: boolean;
}

export interface NestJSServiceParameter {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
}

export interface NestJSServiceDependency {
  name: string;
  injectAs: string;
  type: 'repository' | 'service' | 'model' | 'custom';
}

export interface GeneratedService {
  name: string;
  methods: NestJSServiceMethod[];
  dependencies: NestJSServiceDependency[];
  imports: string[];
  serviceCode: string;
}

// GraphQL Resolver Generator Types
export interface GraphQLField {
  name: string;
  type: string;
  description?: string;
  args: GraphQLArgument[];
  isNullable: boolean;
  isArray: boolean;
}

export interface GraphQLArgument {
  name: string;
  type: string;
  description?: string;
  isNullable: boolean;
  defaultValue?: string;
}

export interface GraphQLResolver {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  fields: GraphQLField[];
  returnType: string;
  description?: string;
}

export interface GeneratedResolver {
  name: string;
  type: 'Query' | 'Mutation' | 'Subscription';
  resolvers: GraphQLResolver[];
  imports: string[];
  resolverCode: string;
  dataLoaderCode?: string;
}

// NestJS Entity Generator Types
export interface NestJSEntityConfig {
  enabled: boolean;
  generateRepository: boolean;
  generateDto: boolean;
  generateValidation: boolean;
  databaseType: 'typeorm' | 'mongoose';
  defaultEntityPath: string;
  generateSwagger: boolean;
}

export interface NestJSEntityField {
  name: string;
  type: string;
  isRequired: boolean;
  isUnique: boolean;
  isPrimary: boolean;
  isIndexed: boolean;
  defaultValue?: string;
  description?: string;
  relation?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    targetEntity: string;
    cascade?: boolean;
    eager?: boolean;
  };
}

export interface GeneratedEntity {
  name: string;
  tableName?: string;
  databaseType: 'typeorm' | 'mongoose';
  fields: NestJSEntityField[];
  imports: string[];
  entityCode: string;
  repositoryCode?: string;
  dtoCode?: string;
}

// NestJS DTO Generator Types
export interface NestJSDTOConfig {
  enabled: boolean;
  generateValidation: boolean;
  generateSwagger: boolean;
  defaultDTOSuffix: string;
  createBaseDTO: boolean;
  includePartialDTO: boolean;
  generateExampleComments: boolean;
}

export interface NestJSDTOField {
  name: string;
  type: string;
  isOptional: boolean;
  validationRule?: {
    type:
      | 'IsString'
      | 'IsNumber'
      | 'IsBoolean'
      | 'IsEmail'
      | 'IsDate'
      | 'IsOptional'
      | 'Min'
      | 'Max'
      | 'MinLength'
      | 'MaxLength'
      | 'IsEnum'
      | 'IsArray'
      | 'IsNotEmpty';
    value?: number | string | string[];
  };
  description?: string;
  swaggerExample?: string;
  defaultValue?: string;
}

export interface NestJSDTOGenerationResult {
  entityName: string;
  createDTO: { name: string; code: string };
  updateDTO: { name: string; code: string };
  responseDTO?: { name: string; code: string };
  partialDTO?: { name: string; code: string };
  baseDTO?: { name: string; code: string };
}

// Nuxt Composable Generator Types
export interface NuxtComposableGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeAutoImports: boolean;
  includeSSRSupport: boolean;
  includeContextHandling: boolean;
  generateReturnType: boolean;
  defaultComposableDirectory: string;
  addJSDocComments: boolean;
  includeAsyncReturnType: boolean;
  generateHelpers: boolean;
}

export interface NuxtComposableImport {
  name: string;
  source: 'vue' | '#app' | '@nuxt/kit' | '@vueuse/core' | 'custom';
  type:
    | 'ref'
    | 'reactive'
    | 'computed'
    | 'watch'
    | 'watchEffect'
    | 'onMounted'
    | 'onUnmounted'
    | 'useAsyncData'
    | 'useFetch'
    | 'useState'
    | 'useLazyAsyncData'
    | 'custom';
  isNuxtSpecific: boolean;
}

export interface NuxtComposableReturn {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string;
}

export interface NuxtComposableFunction {
  name: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: string;
    isOptional: boolean;
    defaultValue?: string;
  }>;
  returnType: string;
  isAsync: boolean;
  body: string;
}

export interface GeneratedNuxtComposable {
  name: string;
  composableCode: string;
  filePath: string;
  imports: NuxtComposableImport[];
  returns: NuxtComposableReturn[];
  functions: NuxtComposableFunction[];
  hasSSRSupport: boolean;
  hasAsyncOperations: boolean;
}

// Qwik Loader Generator Types
export interface QwikLoaderGeneratorConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeJSDocComments: boolean;
  includeErrorHandling: boolean;
  includeStreamingSupport: boolean;
  defaultLoaderDirectory: string;
  generateRouteLoader: boolean;
  exportType: 'named' | 'default';
}

export interface QwikLoaderParam {
  name: string;
  type: 'url' | 'body' | 'query' | 'cookie' | 'header' | 'param';
  dataType: string;
  required: boolean;
  description?: string;
}

export interface QwikLoaderFunction {
  name: string;
  returnType: string;
  params: QwikLoaderParam[];
  description?: string;
  hasContextAccess: boolean;
  isStreaming: boolean;
}

export interface GeneratedQwikLoader {
  name: string;
  loaderCode: string;
  componentExample: string;
  filePath: string;
  imports: string[];
  functions: QwikLoaderFunction[];
  interfaces: string[];
}

// Performance Profiler Types
export interface PerformanceFunctionMetric {
  name: string;
  startLine: number;
  endLine: number;
  linesOfCode: number;
  complexity: number;
  estimatedExecutionTime: number;
  estimatedMemoryUsage: number;
  nestingDepth: number;
  asyncOperations: number;
  loops: number;
  recursiveCalls: number;
  antiPatterns: string[];
}

export interface PerformanceBottleneck {
  functionName: string;
  type:
    | 'high-execution-time'
    | 'high-memory-usage'
    | 'deep-nesting'
    | 'many-async-operations'
    | 'multiple-loops';
  severity: 'low' | 'medium' | 'high';
  currentValue: number;
  description: string;
  location: {
    line: number;
    column: number;
  };
}

export interface PerformanceOptimizationSuggestion {
  functionName: string;
  type:
    | 'optimize-nested-loops'
    | 'optimize-array-ops'
    | 'reduce-nesting-depth'
    | 'cache-regex-patterns'
    | 'use-async-file-ops'
    | 'optimize-json-operations'
    | 'reduce-memory-footprint';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
  before: string;
  after: string;
  codeExample?: string;
}

export interface PerformanceOverallMetrics {
  totalEstimatedExecutionTime: number;
  totalEstimatedMemoryUsage: number;
  averageExecutionTime: number;
  averageMemoryUsage: number;
}

export interface PerformanceProfilingResult {
  file: string;
  functionMetrics: PerformanceFunctionMetric[];
  bottlenecks: PerformanceBottleneck[];
  suggestions: PerformanceOptimizationSuggestion[];
  overallMetrics: PerformanceOverallMetrics;
  profilingDuration: number;
}

// API Client Generator Types
export interface ExpressRouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  functionName?: string;
  parameters: RouteParameterDefinition[];
  filePath: string;
  lineNumber: number;
}

export interface RouteParameterDefinition {
  name: string;
  type: string;
  location: 'path' | 'query' | 'body';
  required: boolean;
}

export interface ApiClientFunction {
  name: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  parameters: RouteParameterDefinition[];
  returnType: string;
  description: string;
}

export interface GeneratedApiClient {
  clientCode: string;
  functions: ApiClientFunction[];
  outputFile: string;
  framework: 'react' | 'vue' | 'angular' | 'svelte';
  language: 'typescript' | 'javascript';
}

// Task Runner Types
export type TaskRunnerType = 'npm' | 'yarn' | 'pnpm' | 'gulp' | 'grunt' | 'webpack' | 'vite' | 'nodemon' | 'tsc' | 'custom';

export type TaskStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stopped';

export interface TaskDefinition {
  id: string;
  name: string;
  type: TaskRunnerType;
  command: string;
  args?: string[];
  description?: string;
  category?: string;
  source: 'package.json' | 'gulpfile' | 'gruntfile' | 'webpack.config';
  sourceFile: string;
}

export interface TaskExecution {
  taskId: string;
  status: TaskStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  exitCode?: number;
  pid?: number;
  terminalName?: string;
  outputLines: TaskOutputLine[];
  errorCount: number;
  warningCount: number;
}

export interface TaskOutputLine {
  timestamp: number;
  text: string;
  type: 'stdout' | 'stderr' | 'info' | 'warning' | 'error';
  source?: string;
  lineNumber: number;
}

export interface TaskError {
  line: number;
  column?: number;
  file: string;
  message: string;
  type: 'error' | 'warning';
  source?: string;
  code?: string;
}

export interface TaskOutputParseResult {
  errors: TaskError[];
  warnings: TaskError[];
  outputLines: TaskOutputLine[];
}

export interface TaskRunnerDetectionResult {
  runners: TaskRunnerType[];
  packageManager: 'npm' | 'yarn' | 'pnpm';
  tasks: TaskDefinition[];
  configFiles: string[];
  detectionDuration: number;
}

export interface TaskListOptions {
  showStatus: boolean;
  showCategory: boolean;
  showSource: boolean;
  maxTasks?: number;
  filterStatus?: TaskStatus[];
  filterRunner?: TaskRunnerType[];
}

export interface TaskRunOptions {
  showOutput: boolean;
  clearPrevious: boolean;
  saveOutput: boolean;
  focusTerminal: boolean;
  maxOutputLines?: number;
  parseErrors: boolean;
  stopOnError: boolean;
}

export interface TaskHistory {
  taskId: string;
  taskName: string;
  executions: TaskExecution[];
  lastExecution: TaskExecution | null;
  totalRuns: number;
  successRate: number;
}

// TypeScript Interface Extractor Types
export interface PropertyTypeInfo {
  name: string;
  typeName: string;
  isRequired: boolean;
  isReadonly: boolean;
  hasDefault?: boolean;
  defaultValue?: string;
  description?: string;
  isNullable: boolean;
}

export interface InterfaceExtractionResult {
  interfaceName: string;
  properties: PropertyTypeInfo[];
  interfaceCode: string;
  filePath: string;
  originalCode: string;
  generatedAt: number;
}

export interface InterfaceExtractionOptions {
  interfaceName: string;
  includeReadonly: boolean;
  includeJSDoc: boolean;
  exportInterface: boolean;
  inferTypesFromValues: boolean;
  detectOptional: boolean;
  treatNullAsOptional: boolean;
  useExplicitAny: boolean;
}

// Type Narrowing Refactor Types
export interface TypeAssertionInfo {
  assertion: string;
  type: 'as' | 'angle-bracket' | 'non-null';
  targetType: string;
  line: number;
  column: number;
  codeSnippet: string;
  suggestedGuard: string;
}

export interface TypeGuardSuggestion {
  name: string;
  code: string;
  description: string;
  usage: string;
}

export interface TypeNarrowingRefactorResult {
  file: string;
  totalAssertions: number;
  assertionsByType: {
    as: number;
    angleBracket: number;
    nonNull: number;
  };
  assertions: TypeAssertionInfo[];
  typeGuards: TypeGuardSuggestion[];
  suggestions: string[];
  analysisDuration: number;
}

// Unused Import Detection Types
export type ImportType = 'named' | 'default' | 'namespace' | 'type-only';

export interface UnusedImport {
  name: string;
  module: string;
  importType: ImportType;
  line: number;
  column: number;
  isTypeImport: boolean;
  fullImportStatement: string;
}

export interface UnusedImportDetectionResult {
  file: string;
  unusedImports: UnusedImport[];
  totalUnused: number;
  byType: {
    named: number;
    default: number;
    namespace: number;
    typeOnly: number;
  };
  suggestions: string[];
  canAutoFix: boolean;
  analysisDuration: number;
}

// Unused Dependency Detection Types
export type DependencyCategory = 'dependency' | 'devDependency';

export interface DependencyInfo {
  name: string;
  version: string;
  type: DependencyCategory;
}

export interface UnusedDependencyDetectionResult {
  file: string;
  unusedDependencies: DependencyInfo[];
  misplacedDependencies: DependencyInfo[];
  totalDependencies: number;
  totalUnused: number;
  suggestions: string[];
  analysisDuration: number;
}

// Suggestion Hub Types
export type SuggestionSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SuggestionCategory =
  | 'security'
  | 'code-quality'
  | 'performance'
  | 'maintainability'
  | 'best-practices'
  | 'error-prevention';

export type SuggestionSourceType =
  | 'secret-detection'
  | 'unused-imports'
  | 'unused-dependencies'
  | 'complexity-analysis'
  | 'error-patterns'
  | 'duplicate-code'
  | 'bundle-size'
  | 'performance';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  severity: SuggestionSeverity;
  category: SuggestionCategory;
  source: SuggestionSourceType;
  file: string;
  line?: number;
  column?: number;
  canAutoFix: boolean;
  fixCommand?: string;
  codeSnippet?: string;
  priority: number;
  estimatedImpact: string;
}

export interface SuggestionGroup {
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  suggestions: Suggestion[];
  count: number;
}

export interface SuggestionHubConfig {
  enabled: boolean;
  autoAnalyzeOnOpen: boolean;
  maxSuggestionsPerCategory: number;
  severityFilter: SuggestionSeverity[];
  categoryFilter: SuggestionCategory[];
  showQuickActions: boolean;
  groupByCategory: boolean;
  sortBy: 'severity' | 'category' | 'file' | 'priority';
  enableAutoFix: boolean;
}

export interface SuggestionHubResult {
  file: string;
  suggestions: Suggestion[];
  groups: SuggestionGroup[];
  summary: {
    total: number;
    bySeverity: Record<SuggestionSeverity, number>;
    byCategory: Record<SuggestionCategory, number>;
    canAutoFix: number;
  };
  analysisDuration: number;
}

export interface SuggestionFixResult {
  success: boolean;
  fixedCount: number;
  failedCount: number;
  errors: string[];
  duration: number;
}

// Workspace Symbol Search Types
export type SymbolKind =
  | 'class'
  | 'constant'
  | 'constructor'
  | 'enum'
  | 'enumMember'
  | 'event'
  | 'field'
  | 'file'
  | 'function'
  | 'interface'
  | 'key'
  | 'method'
  | 'module'
  | 'namespace'
  | 'number'
  | 'object'
  | 'operator'
  | 'package'
  | 'property'
  | 'string'
  | 'struct'
  | 'typeParameter'
  | 'variable';

export interface WorkspaceSymbol {
  name: string;
  kind: SymbolKind;
  location: {
    uri: string;
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
  containerName?: string;
  workspaceFolderName: string;
  score?: number;
}

export interface SymbolSearchOptions {
  query: string;
  maxResults?: number;
  kinds?: SymbolKind[];
  includeWorkspaceName?: boolean;
}

export interface SymbolSearchResult {
  symbols: WorkspaceSymbol[];
  totalFound: number;
  groupedByWorkspace: Record<string, WorkspaceSymbol[]>;
  groupedByKind: Record<SymbolKind, WorkspaceSymbol[]>;
  searchDuration: number;
}

export interface WorkspaceSymbolSearchConfig {
  enabled: boolean;
  maxResults: number;
  fuzzyMatchThreshold: number;
  defaultKinds: SymbolKind[];
  showPreview: boolean;
  groupResults: boolean;
}

// Symbol Reference Mapper Types
export type CallHierarchyDirection = 'incoming' | 'outgoing';

export interface ReferenceLocation {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  fileName: string;
  workspaceFolder: string;
}

export interface CallHierarchyItem {
  name: string;
  kind: string;
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  detail?: string;
  fileName: string;
  workspaceFolder: string;
  direction: CallHierarchyDirection;
}

export interface ImportRelationship {
  fromFile: string;
  fromUri: string;
  importedSymbols: string[];
  modulePath: string;
  lineNumber: number;
}

export interface SymbolReferenceMapOptions {
  direction?: CallHierarchyDirection;
  includeImports?: boolean;
  maxResults?: number;
}

export interface SymbolReferenceMap {
  symbol: {
    name: string;
    kind: string;
    uri: string;
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
  references: ReferenceLocation[];
  callHierarchy: CallHierarchyItem[] | null;
  imports: ImportRelationship[];
  analysisDuration: number;
}

// Zod Schema Generator Types
export interface ZodSchemaProperty {
  name: string;
  tsType: string;
  isRequired: boolean;
  isReadonly: boolean;
  hasDefault?: boolean;
  defaultValue?: string;
  description?: string;
  isNullable: boolean;
}

export interface ZodSchemaGenerationResult {
  schemaName: string;
  properties: ZodSchemaProperty[];
  schemaCode: string;
  filePath: string;
  originalCode: string;
  generatedAt: number;
}

export interface ZodSchemaGenerationOptions {
  schemaName: string;
  exportSchema: boolean;
  includeJSDoc: boolean;
  includeErrorMessages: boolean;
  includeRefinements: boolean;
  generateInferredType: boolean;
  generateInputOutputTypes: boolean;
  importZod: boolean;
  useConst: boolean;
  useDateCoerce: boolean;
}

// API Documentation Generator Types
export interface ApiDocFunction {
  name: string;
  description?: string;
  parameters: ApiDocParameter[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  isPrivate?: boolean;
  isProtected?: boolean;
  jsDoc?: string;
  examples: string[];
  lineStart: number;
  lineEnd: number;
}

export interface ApiDocParameter {
  name: string;
  type: string;
  description?: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface ApiDocClass {
  name: string;
  description?: string;
  extends?: string;
  implements?: string[];
  properties: ApiDocProperty[];
  methods: ApiDocFunction[];
  isPrivate?: boolean;
  isProtected?: boolean;
  jsDoc?: string;
  lineStart: number;
  lineEnd: number;
}

export interface ApiDocProperty {
  name: string;
  type: string;
  description?: string;
  isReadonly: boolean;
  isOptional: boolean;
  isStatic: boolean;
}

export interface ApiDocInterface {
  name: string;
  description?: string;
  extends?: string[];
  properties: ApiDocProperty[];
  methods: ApiDocFunction[];
  jsDoc?: string;
  lineStart: number;
  lineEnd: number;
}

export interface ApiDocTypeAlias {
  name: string;
  type: string;
  description?: string;
  jsDoc?: string;
  lineStart: number;
}

export interface ApiDocEnum {
  name: string;
  description?: string;
  members: Array<{
    name: string;
    value?: string;
    description?: string;
  }>;
  jsDoc?: string;
  lineStart: number;
}

export interface ApiDocumentationResult {
  filePath: string;
  functions: ApiDocFunction[];
  classes: ApiDocClass[];
  interfaces: ApiDocInterface[];
  typeAliases: ApiDocTypeAlias[];
  enums: ApiDocEnum[];
  documentation: string;
  format: 'markdown' | 'html';
  generatedAt: number;
}

export interface ApiDocumentationOptions {
  includePrivate: boolean;
  includeProtected: boolean;
  outputFormat: 'markdown' | 'html';
  includeExamples: boolean;
  includeTypeDefinitions: boolean;
  groupByCategory: boolean;
  addTableOfContents: boolean;
  title?: string;
}

// Bull Queue Generator Types
export interface BullQueueJob {
  name: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  includeErrorHandling: boolean;
  retryConfig?: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
  };
  jobOptions: {
    concurrency?: number;
    delay?: number;
    removeOnComplete?: number;
    removeOnFail?: number;
  };
}

export interface GeneratedBullQueue {
  name: string;
  jobs: BullQueueJob[];
  imports: string[];
  queueCode: string;
}

export interface BullQueueConfig {
  enabled: boolean;
  includeErrorHandling: boolean;
  includeRetryLogic: boolean;
  includeEventHandlers: boolean;
  defaultConcurrency: number;
  removeOnComplete: number | null;
  removeOnFail: number | null;
  defaultQueuePath: string;
}

// Bull Board Generator Types
export interface BullBoardQueue {
  name: string;
  instanceName: string;
  description?: string;
}

export interface GeneratedBullBoard {
  boardName: string;
  queues: BullBoardQueue[];
  imports: string[];
  boardSetupCode: string;
  uiRouteCode: string;
}

export interface BullBoardConfig {
  enabled: boolean;
  framework: 'express' | 'hapi' | 'fastify' | 'koa';
  includeJobManagement: boolean;
  includeRetryLogic: boolean;
  includeJobRemoval: boolean;
  includeJobPromotion: boolean;
  includeTypescript: boolean;
  defaultBoardPath: string;
}

// Architecture Diagram Generator Types
export interface ModuleNode {
  id: string;
  name: string;
  path: string;
  files: string[];
  exports: string[];
  imports: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'imports' | 'requires' | 'extends';
  weight: number;
}

export interface ArchitectureDiagramConfig {
  outputFormat: 'mermaid' | 'plantuml';
  includePatterns?: string[];
  excludeDirectories?: string[];
  moduleDepth?: number;
  includeExternalDependencies?: boolean;
  includeFileCount?: boolean;
  includeStyles?: boolean;
}

export interface ArchitectureDiagramResult {
  workspacePath: string;
  modules: ModuleNode[];
  dependencies: DependencyEdge[];
  diagramCode: string;
  format: 'mermaid' | 'plantuml';
  analysisDuration: number;
}

// Code Bookmark Manager Types
export interface CodeBookmark {
  id: string;
  filePath: string;
  lineNumber: number;
  description: string;
  category?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkCategory {
  name: string;
  color?: string;
  icon?: string;
}

export interface BookmarkStorage {
  bookmarks: CodeBookmark[];
  categories: BookmarkCategory[];
}

export interface BookmarkSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  filePath?: string;
}

export interface BookmarkNavigationResult {
  bookmark: CodeBookmark;
  document: any;
  success: boolean;
}

// I18n Key Generator Types
export interface I18nKeyGeneratorConfig {
  enabled: boolean;
  baseNamespace: string;
  outputDirectory: string;
  fileFormat: 'json' | 'ts' | 'js';
  keyPrefix: string;
  includeHelpers: boolean;
  extractFromStrings: boolean;
  extractFromTemplates: boolean;
  generateNamespaces: boolean;
  generateScopedHelpers: boolean;
}

// Security Audit Scanner Types
export type SecurityIssueType =
  | 'eval-usage'
  | 'hardcoded-secret'
  | 'sql-injection'
  | 'command-injection'
  | 'insecure-deserialization'
  | 'weak-crypto'
  | 'unsafe-regex'
  | 'path-traversal'
  | 'xxe'
  | 'ssrf';

export interface SecurityIssue {
  type: SecurityIssueType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  column: number;
  description: string;
  suggestion: string;
  codeSnippet: string;
  cwe?: string;
  references?: string[];
}

export interface DependencyVulnerability {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  vulnerableVersions: string[];
  patchedVersions: string[];
  title: string;
  url?: string;
  cwe?: string;
}

export interface SecurityAuditResult {
  file: string;
  issues: SecurityIssue[];
  dependencyVulnerabilities: DependencyVulnerability[];
  totalCritical: number;
  totalHigh: number;
  totalMedium: number;
  totalLow: number;
  totalInfo: number;
  scanDuration: number;
  summary: string;
}

export interface SecurityAuditConfig {
  enabled: boolean;
  scanOnSave: boolean;
  includeDependencyAudit: boolean;
  includeCodePatterns: boolean;
  excludedPatterns: string[];
  severityFilter: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
  showSuggestions: boolean;
  autoFix: boolean;
}

export interface OutdatedDependencyInfo {
  name: string;
  version: string;
  latest: string;
  wanted?: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  homepage?: string;
  url?: string;
}

export interface BreakingChange {
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  type: 'major' | 'minor' | 'patch';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  affectedFeatures: string[];
  migrationGuide?: string;
}

export interface UpgradeSuggestion {
  type: 'safe' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  commands: string[];
}

export interface DependencyUpgradeAdvisorResult {
  file: string;
  outdatedDependencies: OutdatedDependencyInfo[];
  breakingChanges: BreakingChange[];
  suggestions: UpgradeSuggestion[];
  totalOutdated: number;
  totalBreaking: number;
  analysisDuration: number;
}

// Electron Main Process Generator Types
export interface ElectronMainProcessConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeIPC: boolean;
  includeSecurity: boolean;
  includeAutoUpdater: boolean;
  defaultAppName: string;
  mainWindowPath: string;
  preloadPath: string;
}

export interface ElectronMainProcessMethod {
  name: string;
  description?: string;
  parameters: ElectronMainProcessParameter[];
  returnType: string;
  isAsync: boolean;
  category: 'app' | 'window' | 'ipc' | 'security' | 'lifecycle';
}

export interface ElectronMainProcessParameter {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface GeneratedMainProcess {
  name: string;
  filePath: string;
  methods: ElectronMainProcessMethod[];
  imports: string[];
  processCode: string;
  config: ElectronMainProcessConfig;
}

// Electron Preload Generator Types
export interface ElectronPreloadConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeSandboxWarning: boolean;
  defaultApiName: string;
  preloadPath: string;
}

export interface ElectronPreloadMethod {
  name: string;
  description?: string;
  returnType: string;
  isAsync: boolean;
  category: 'app' | 'window' | 'system' | 'ipc' | 'file' | 'custom';
}

export interface ElectronPreloadApi {
  name: string;
  methods: ElectronPreloadMethod[];
}

export interface GeneratedPreload {
  name: string;
  filePath: string;
  methods: ElectronPreloadMethod[];
  imports: string[];
  preloadCode: string;
  config: ElectronPreloadConfig;
}

// Electron Renderer Process Generator Types
export interface ElectronRendererProcessConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeIPC: boolean;
  includeReact: boolean;
  includeVue: boolean;
  includeSvelte: boolean;
  defaultComponentName: string;
  rendererPath: string;
}

export interface ElectronRendererComponent {
  name: string;
  description?: string;
  template: ElectronRendererTemplate;
  script: ElectronRendererScript;
  style: ElectronRendererStyle;
  imports: string[];
  ipcHandlers: ElectronRendererIPCHandler[];
}

export interface ElectronRendererTemplate {
  type: 'html' | 'jsx' | 'svelte';
  content: string;
}

export interface ElectronRendererScript {
  language: 'typescript' | 'javascript';
  content: string;
}

export interface ElectronRendererStyle {
  type: 'css' | 'scss' | 'none';
  content: string;
}

export interface ElectronRendererIPCHandler {
  channel: string;
  methodName: string;
  parameters: Array<{
    name: string;
    type: string;
    optional: boolean;
  }>;
  returnType: string;
  description?: string;
}

export interface GeneratedRendererProcess {
  name: string;
  filePath: string;
  component: ElectronRendererComponent;
  imports: string[];
  templateCode: string;
  scriptCode: string;
  styleCode: string;
  preloadCode: string;
  config: ElectronRendererProcessConfig;
}

// gRPC Service Generator Types
export interface GrpcServiceConfig {
  enabled: boolean;
  generateProtoFile: boolean;
  generateServiceImplementation: boolean;
  generateClientWrapper: boolean;
  generateTypeScriptInterfaces: boolean;
  includeErrorHandling: boolean;
  includeValidation: boolean;
  defaultProtoPath: string;
  defaultServicePath: string;
  defaultClientPath: string;
  protoVersion: 'proto3' | 'proto2';
  useStaticClient: boolean;
  includeLoadBalancing: boolean;
}

export interface GrpcServiceMethod {
  name: string;
  description?: string;
  requestType: string;
  responseType: string;
  methodType: 'unary' | 'server-streaming' | 'client-streaming' | 'bidi-streaming';
  parameters?: GrpcServiceParameter[];
  errorHandling: boolean;
  includeValidation: boolean;
}

export interface GrpcServiceParameter {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
  isRepeated: boolean;
}

export interface GrpcMessage {
  name: string;
  description?: string;
  fields: GrpcMessageField[];
}

export interface GrpcMessageField {
  name: string;
  type: string;
  fieldNumber: number;
  optional: boolean;
  repeated: boolean;
  description?: string;
}

export interface GrpcEnum {
  name: string;
  description?: string;
  values: Array<{ name: string; value: number; description?: string }>;
}

export interface GeneratedGrpcService {
  name: string;
  packageName: string;
  protoFileName: string;
  methods: GrpcServiceMethod[];
  messages: GrpcMessage[];
  enums: GrpcEnum[];
  protoCode: string;
  serviceCode: string;
  clientCode: string;
  protoFilePath: string;
  serviceFilePath: string;
  clientFilePath: string;
  imports: string[];
}

// Memory Usage Analyzer Types
export interface MemoryAllocationInfo {
  type:
    | 'array-allocation'
    | 'object-allocation'
    | 'buffer-allocation'
    | 'closure-allocation'
    | 'repeated-allocation';
  functionName: string;
  line: number;
  size: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface MemoryLeakInfo {
  type:
    | 'event-listener-leak'
    | 'timer-leak'
    | 'global-variable-leak'
    | 'dom-reference-leak'
    | 'detached-dom-leak';
  line: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
  codeExample?: string;
}

export interface MemoryPatternType {
  type:
    | 'caching'
    | 'object-pooling'
    | 'lazy-loading'
    | 'streaming'
    | 'chunking'
    | 'deep-copy'
    | 'string-concatenation-loop';
  category: 'optimization' | 'anti-pattern';
  description: string;
  impact: 'positive' | 'negative';
  suggestion?: string;
}

export interface MemoryOptimizationSuggestion {
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  codeExample?: string;
  estimatedImpact: string;
}

export interface MemoryUsageOverallMetrics {
  totalAllocations: number;
  highRiskAllocations: number;
  leakCount: number;
  patternCount: number;
}

export interface MemoryUsageAnalysisResult {
  file: string;
  allocations: MemoryAllocationInfo[];
  leaks: MemoryLeakInfo[];
  patterns: MemoryPatternType[];
  suggestions: MemoryOptimizationSuggestion[];
  overallMetrics: MemoryUsageOverallMetrics;
  analysisDuration: number;
}

// Microservice Event Generator Types
export interface MicroserviceEventConfig {
  enabled: boolean;
  includeErrorHandling: boolean;
  defaultBrokerType: 'rabbitmq' | 'kafka';
  maxConcurrentMessages: number;
  defaultOutputPath: string;
  includeTypeScript: boolean;
  generateDocumentation: boolean;
}

export interface MicroserviceEvent {
  name: string;
  description?: string;
  payloadProperties: Array<{
    name: string;
    type: string;
    description?: string;
    optional: boolean;
  }>;
}

export interface EventPublisher {
  name: string;
  eventName: string;
  code: string;
}

export interface EventSubscriber {
  name: string;
  eventName: string;
  queueName: string;
  code: string;
}

export interface EventHandler {
  name: string;
  eventName: string;
  code: string;
}

export interface GeneratedMicroserviceEvent {
  serviceName: string;
  messageBroker: 'rabbitmq' | 'kafka';
  events: MicroserviceEvent[];
  publishers: EventPublisher[];
  subscribers: EventSubscriber[];
  handlers: EventHandler[];
  eventTypesCode: string;
}

// Mock Data Generator Types
export interface MockDataProperty {
  name: string;
  tsType: string;
  isRequired: boolean;
  isReadonly: boolean;
  isNullable: boolean;
  isArray: boolean;
  description?: string;
}

export interface MockDataGeneratorResult {
  dataStructureName: string;
  properties: MockDataProperty[];
  mockData: Record<string, unknown>;
  mockDataCode: string;
  filePath: string;
  originalCode: string;
  generatedAt: number;
}

export interface MockDataGeneratorOptions {
  dataStructureName: string;
  exportData: boolean;
  useConst: boolean;
  includeTypeAnnotations: boolean;
  includeJSDoc: boolean;
  includeOptionalProperties: boolean;
  includeReadonlyProperties: boolean;
  includeNullValues: boolean;
  useFakerPatterns: boolean;
  arraySize: number;
}

// Prettier Config Optimizer Types
export interface FormattingPattern {
  name: string;
  description: string;
  currentValue: unknown;
  detectedValue: unknown;
  consistency: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StyleConsistencyReport {
  overallScore: number;
  totalFiles: number;
  consistentFiles: number;
  inconsistentFiles: number;
  patterns: FormattingPattern[];
  fileBreakdown: Array<{
    filePath: string;
    inconsistencies: string[];
    confidence: number;
  }>;
}

export interface ConfigSuggestion {
  rule: string;
  currentValue: unknown;
  suggestedValue: unknown;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  previewBefore: string;
  previewAfter: string;
}

export interface PrettierConfigOptimizationResult {
  workspacePath: string;
  existingConfig: Record<string, unknown> | null;
  detectedPatterns: FormattingPattern[];
  consistencyReport: StyleConsistencyReport;
  suggestedConfig: ConfigSuggestion[];
  optimizedConfig: Record<string, unknown>;
  analysisDuration: number;
  filesAnalyzed: number;
}

export interface PrettierConfigPreview {
  filePath: string;
  originalContent: string;
  formattedContent: string;
  diff: string;
  hasChanges: boolean;
}

// Redis Cache Management Types
export interface CacheOperationResult {
  success: boolean;
  key?: string;
  value?: unknown;
  error?: string;
  ttl?: number;
}

export interface CacheStats {
  totalKeys: number;
  memoryUsage: number;
  hitRate: number;
  operationsCount: number;
}

export interface CacheConfig {
  url: string;
  maxMemory: number;
  maxKeyLength: number;
  keyPrefix: string;
  defaultTTL: number;
  autoCleanup: boolean;
  cleanupInterval: number;
}

export interface CacheEntry {
  key: string;
  value: unknown;
  ttl?: number;
  createdAt: number;
  expiresAt?: number;
  tags?: string[];
}

export interface CacheDecoratorOptions {
  keyPrefix?: string;
  ttl?: number;
  tags?: string[];
  condition?: (...args: unknown[]) => boolean;
}

export interface CacheInvalidationOptions {
  byKey?: string[];
  byTag?: string[];
  byPattern?: string;
}

// NestJS WebSocket Gateway Generator Types
export interface NestJSWebSocketGatewayConfig {
  enabled: boolean;
  generateTypeScript: boolean;
  includeAuthGuard: boolean;
  includeValidation: boolean;
  includeRoomManagement: boolean;
  includeEventHandlers: boolean;
  defaultGatewayPath: string;
  generateGatewayEvents: boolean;
  includeWebSocketServer: boolean;
}

export interface WebSocketEvent {
  name: string;
  description?: string;
  payloadType: string;
  returnType: string;
  isAsync: boolean;
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
    optional: boolean;
  }>;
}

export interface WebSocketRoom {
  name: string;
  description?: string;
  maxClients?: number;
  requiresAuth: boolean;
}

export interface GeneratedWebSocketGateway {
  name: string;
  gatewayCode: string;
  events: WebSocketEvent[];
  rooms: WebSocketRoom[];
  imports: string[];
  interfacesCode?: string;
  decoratorsCode?: string;
}

export interface WebSocketGatewayGenerationOptions {
  gatewayName: string;
  namespace: string;
  includeCors: boolean;
  corsOptions?: {
    origin: string | string[];
    credentials: boolean;
  };
  includeEventValidation: boolean;
  generateEventInterfaces: boolean;
  includeRoomHelpers: boolean;
  includeBroadcastHelpers: boolean;
}

// Conditional Extract Types
export interface ComplexConditional {
  type: 'if-statement' | 'ternary';
  condition: string;
  line: number;
  column: number;
  complexity: number;
  nestingDepth: number;
  conditionCount: number;
  operators: string[];
  suggestedPredicateName: string;
}

export interface ConditionalExtractResult {
  file: string;
  conditionals: ComplexConditional[];
  suggestions: string[];
  analysisDuration: number;
}

// CSV Parser and Generator Types
export type CSVFieldType = 'string' | 'number' | 'boolean' | 'date' | 'auto';

export interface CSVField {
  name: string;
  type: CSVFieldType;
  index: number;
  isRequired: boolean;
  description?: string;
}

export interface CSVParserOptions {
  delimiter: string;
  quoteChar: string;
  escapeChar: string;
  hasHeader: boolean;
  skipEmptyLines: boolean;
  trimFields: boolean;
  includeTypeConversion: boolean;
  includeStreaming: boolean;
}

export interface CSVGeneratorOptions {
  delimiter: string;
  quoteChar: string;
  escapeChar: string;
  includeHeader: boolean;
  trimFields: boolean;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  includeErrorHandling: boolean;
}

export interface CSVParseResult {
  headers: string[];
  rows: Array<Record<string, string | number | boolean | Date | null>>;
  fields: CSVField[];
  rowCount: number;
  parseDuration: number;
}

export interface CSVGeneratorResult {
  parserCode: string;
  generatorCode: string;
  typeDefinitions: string;
  usageExample: string;
  generatedAt: number;
}

// DTO Validator Types
export interface DTOValidatorProperty {
  name: string;
  type: string;
  isRequired: boolean;
  isReadonly: boolean;
  isNullable: boolean;
  isArray: boolean;
  description?: string;
  defaultValue?: string;
}

export interface DTOValidatorField {
  name: string;
  type: string;
  isOptional: boolean;
  validationRules: Array<{
    type:
      | 'IsString'
      | 'IsNumber'
      | 'IsBoolean'
      | 'IsEmail'
      | 'IsDate'
      | 'IsOptional'
      | 'Min'
      | 'Max'
      | 'MinLength'
      | 'MaxLength'
      | 'IsEnum'
      | 'IsArray'
      | 'IsNotEmpty'
      | 'IsPhoneNumber'
      | 'IsUrl'
      | 'IsUUID'
      | 'Matches'
      | 'IsPositive'
      | 'IsNegative'
      | 'IsInt'
      | 'IsFloat'
      | 'IsAlpha'
      | 'IsAlphanumeric'
      | 'IsAscii'
      | 'IsBase64'
      | 'IsByteLength'
      | 'IsCreditCard'
      | 'IsCurrency'
      | 'IsISO8601'
      | 'IsJSON'
      | 'IsLatitude'
      | 'IsLongitude'
      | 'IsMilitaryTime';
    value?: number | string | RegExp;
    message?: string;
  }>;
  description?: string;
  swaggerExample?: string;
  defaultValue?: string;
}

export interface DTOValidatorGenerationResult {
  className: string;
  properties: DTOValidatorProperty[];
  fields: DTOValidatorField[];
  classCode: string;
  filePath: string;
  originalInterface: string;
  generatedAt: number;
}

export interface DTOValidatorOptions {
  className: string;
  exportClass: boolean;
  includeValidation: boolean;
  includeSwagger: boolean;
  includeJSDoc: boolean;
  customErrorMessage: boolean;
  autoDetectValidations: boolean;
  addTransforms: boolean;
}

// FS Path Resolver Types
export interface PathResolutionResult {
  success: boolean;
  resolvedPath?: string;
  alternatives?: string[];
  error?: string;
  confidence: number;
  isDirectory?: boolean;
  exists: boolean;
}

export interface PathValidationResult {
  isValid: boolean;
  normalizedPath?: string;
  error?: string;
  suggestions?: string[];
  confidence: number;
}

export interface PathNormalizationResult {
  originalPath: string;
  normalizedPath: string;
  separator: string;
  isAbsolute: boolean;
  isCrossPlatform: boolean;
}

export interface WorkspaceRelativePathResult {
  relativePath: string;
  absolutePath: string;
  workspaceRoot: string;
  isValid: boolean;
}

export interface FsPathResolverGenerationResult {
  utilitiesCode: string;
  typesCode?: string;
  usageExample: string;
  exportedFunctions: string[];
  generatedAt: number;
}

export interface FsPathResolverOptions {
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  outputDirectory: string;
  generateUtilities: boolean;
  utilityTypes: ('path-resolution' | 'path-validation' | 'path-normalization' | 'workspace-relative')[];
}

// Kafka Consumer Generator Types
export interface KafkaConsumerTopic {
  name: string;
  description?: string;
  messageType: string;
  messageProperties: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  includeErrorHandling: boolean;
  retryStrategy?: {
    maxRetries: number;
    initialRetryDelay: number;
    backoffMultiplier: number;
    maxRetryDelay: number;
  };
  consumerOptions: {
    fromBeginning?: boolean;
    autoCommit?: boolean;
    sessionId?: string;
    partitionAssignmentStrategy?: string;
  };
}

export interface GeneratedKafkaConsumer {
  groupName: string;
  groupId: string;
  brokers: string;
  topics: KafkaConsumerTopic[];
  imports: string[];
  consumerCode: string;
}

export interface KafkaConsumerConfig {
  enabled: boolean;
  includeErrorHandling: boolean;
  includeRetryStrategy: boolean;
  includeDeserialization: boolean;
  defaultConsumerPath: string;
}

// Kafka Producer Generator Types
export interface KafkaProducerTopic {
  name: string;
  description?: string;
  messageType: string;
  messageProperties: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  includeErrorHandling: boolean;
  producerOptions: {
    compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
    enableIdempotence?: boolean;
    maxInFlightRequests?: number;
    acks?: 0 | 1 | -1 | 'all';
    timeout?: number;
    maxRetries?: number;
  };
}

export interface GeneratedKafkaProducer {
  producerName: string;
  brokers: string;
  topics: KafkaProducerTopic[];
  imports: string[];
  producerCode: string;
}

export interface KafkaProducerConfig {
  enabled: boolean;
  includeErrorHandling: boolean;
  includeSerialization: boolean;
  defaultProducerPath: string;
}

// RabbitMQ Consumer Generator Types
export interface RabbitMQQueue {
  name: string;
  description?: string;
  routingKey: string;
  exchange: string;
  exchangeType: 'direct' | 'topic' | 'fanout' | 'headers';
  messageType: string;
  messageProperties: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  includeErrorHandling: boolean;
  consumerOptions: {
    prefetch?: number;
    durable?: boolean;
    requeue?: boolean;
    timeout?: number;
    maxRetries?: number;
  };
}

export interface GeneratedRabbitMQConsumer {
  consumerName: string;
  connectionString: string;
  queues: RabbitMQQueue[];
  imports: string[];
  consumerCode: string;
}

export interface RabbitMQConsumerConfig {
  enabled: boolean;
  includeErrorHandling: boolean;
  includeRetryLogic: boolean;
  includeDeadLetterExchange: boolean;
  defaultConsumerPath: string;
}

// Memo Decorator Generator Types
export type CacheStrategy = 'map' | 'lru' | 'ttl' | 'weak';

export interface MemoDecoratorGenerationOptions {
  cacheStrategy: CacheStrategy;
  decoratorName: string;
  exportDecorator: boolean;
  includeJSDoc: boolean;
  importHelper: boolean;
  ttlMs: number;
  maxSize: number;
}

export interface MemoDecoratorGenerationResult {
  functionName: string;
  decoratorCode: string;
  decoratedFunctionCode: string;
  originalCode: string;
  generatedAt: number;
}

// Retry Decorator Generator Types
export type BackoffType = 'exponential' | 'linear' | 'fixed' | 'custom';

export interface RetryDecoratorGenerationOptions {
  maxRetries: number;
  initialDelay: number;
  backoffType: BackoffType;
  jitterEnabled: boolean;
  includeCircuitBreaker: boolean;
  retryableErrors: string[];
  retryableStatusCodes: number[];
  decoratorName: string;
  exportDecorator: boolean;
  includeJSDoc: boolean;
  importHelper: boolean;
}

export interface RetryDecoratorGenerationResult {
  functionName: string;
  decoratorCode: string;
  decoratedFunctionCode: string;
  originalCode: string;
  generatedAt: number;
}

// Response Formatter Generator Types
export interface ResponseFormatterConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  defaultFormatterPath: string;
  includeMetaFields: boolean;
  includePagination: boolean;
  includeErrorCodes: boolean;
  generateMiddleware: boolean;
  generateUsageExamples: boolean;
}

export interface ResponseFormatterField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ResponseFormatterGenerationResult {
  formatterName: string;
  formatterType: 'class' | 'functions' | 'middleware';
  dataFields: ResponseFormatterField[];
  metaFields: ResponseFormatterField[];
  formatterCode: string;
}

// Redis Pub/Sub Generator Types
export interface RedisPubSubConfig {
  enabled: boolean;
  includeErrorHandling: boolean;
  includePatternSubscription: boolean;
  includeMessageValidation: boolean;
  generateTypedMessages: boolean;
  defaultPubSubPath: string;
}

export interface RedisPubSubChannel {
  name: string;
  description?: string;
  messageType: string;
  messageProperties: Array<{
    name: string;
    type: string;
    description?: string;
    optional: boolean;
  }>;
  includePublisher: boolean;
  includeSubscriber: boolean;
  includePatternSubscriber?: boolean;
  pattern?: string;
}

export interface GeneratedRedisPubSub {
  channels: RedisPubSubChannel[];
  publishers: Array<{
    name: string;
    channelName: string;
    code: string;
  }>;
  subscribers: Array<{
    name: string;
    channelName: string;
    pattern?: string;
    code: string;
  }>;
  messageTypesCode: string;
  imports: string[];
  clientSetupCode: string;
}

// Infinite Scroll Generator Types
export interface InfiniteScrollGeneratorOptions {
  componentName: string;
  componentDirectory: string;
  includeTypeScript: boolean;
  includeIntersectionObserver: boolean;
  includeLoadingState: boolean;
  includeErrorHandling: boolean;
  includeFetchMore: boolean;
  generateHook: boolean;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export interface InfiniteScrollProperty {
  name: string;
  type: string;
  isRequired: boolean;
  isReadonly: boolean;
  description?: string;
}

export interface GeneratedInfiniteScrollComponent {
  componentName: string;
  hookName: string;
  componentCode: string;
  hookCode?: string;
  componentFilePath: string;
  hookFilePath?: string;
  properties: InfiniteScrollProperty[];
}

// Saga Pattern Generator Types
export interface SagaStep {
  name: string;
  description?: string;
  isAsync: boolean;
  returnType: string;
  parameters: string[];
  hasCompensation: boolean;
  compensationName?: string;
  compensationParameters?: string[];
}

export interface SagaOrchestratorOptions {
  orchestratorName: string;
  includeTypeScript: boolean;
  stateManagement: 'memory' | 'redis' | 'database';
  includeLogging: boolean;
  includeMetrics: boolean;
  includeTimeout: boolean;
  includeRetry: boolean;
  defaultTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SagaOrchestratorGenerationResult {
  orchestratorName: string;
  orchestratorCode: string;
  filePath: string;
  steps: SagaStep[];
  hasTypeScript: boolean;
}

// SQL Query Builder Types
export interface SQLQueryBuilderConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeJSDoc: boolean;
  defaultDialect: 'postgresql' | 'mysql' | 'sqlite' | 'mssql';
  parameterStyle: 'positional' | 'named' | 'numeric';
  generateWhereClauses: boolean;
  generateJoinClauses: boolean;
  includeValidation: boolean;
}

export interface SQLQueryField {
  name: string;
  type: string;
  isRequired: boolean;
  isNullable: boolean;
  isArray: boolean;
  description?: string;
}

export interface SQLQueryJoin {
  type: 'inner' | 'left' | 'right' | 'full';
  table: string;
  on: string;
  alias?: string;
}

export interface SQLQueryWhere {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value?: string | number | boolean | null;
  logic?: 'AND' | 'OR';
}

export interface SQLQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  distinct?: boolean;
}

export interface GeneratedSQLQueries {
  tableName: string;
  selectQuery: string;
  insertQuery: string;
  updateQuery: string;
  deleteQuery: string;
  selectQueryType?: string;
  insertQueryType?: string;
  updateQueryType?: string;
  deleteQueryType?: string;
  parameterTypes?: string;
  fields: SQLQueryField[];
  joins: SQLQueryJoin[];
  whereClauses: SQLQueryWhere[];
  queryOptions: SQLQueryOptions;
}

export interface SQLQueryBuilderGenerationOptions {
  tableName: string;
  interfaceName: string;
  includeJSDoc: boolean;
  includeTypeScript: boolean;
  dialect: 'postgresql' | 'mysql' | 'sqlite' | 'mssql';
  parameterStyle: 'positional' | 'named' | 'numeric';
  generateSelect: boolean;
  generateInsert: boolean;
  generateUpdate: boolean;
  generateDelete: boolean;
  generateTypes: boolean;
  exportQueries: boolean;
  includeJoins: boolean;
  includeWhere: boolean;
  includeValidation: boolean;
}

export interface SQLQueryBuilderGenerationResult {
  interfaceName: string;
  tableName: string;
  queries: GeneratedSQLQueries;
  queriesCode: string;
  filePath: string;
  originalCode: string;
  generatedAt: number;
}

// Type Assertion Generator Types
export interface TypeNarrowingPattern {
  type: 'typeof' | 'instanceof' | 'in' | 'equality' | 'nullish' | 'truthiness';
  variable: string;
  targetType?: string;
  checkExpression: string;
  line: number;
  column: number;
  codeSnippet: string;
  suggestedGuardName: string;
}

export interface GeneratedTypeGuard {
  name: string;
  code: string;
  description: string;
  usage: string;
  patterns: TypeNarrowingPattern[];
}

export interface GeneratedAssertion {
  name: string;
  code: string;
  description: string;
  usage: string;
  errorType?: string;
}

export interface TypeAssertionGenerationOptions {
  includeTypeGuards: boolean;
  includeAssertions: boolean;
  includeJSDoc: boolean;
  exportFunctions: boolean;
  generateRuntimeChecks: boolean;
  guardNamingConvention: 'is' | 'has' | 'assert' | 'custom';
  customGuardPrefix?: string;
}

export interface TypeAssertionGenerationResult {
  file: string;
  generatedCode: string;
  typeGuards: GeneratedTypeGuard[];
  assertions: GeneratedAssertion[];
  patterns: TypeNarrowingPattern[];
  generationDuration: number;
}

// Enum Creator Types
export interface StringLiteralUnion {
  typeName: string;
  values: string[];
}

export interface EnumCreatorOptions {
  enumName: string;
  includeValidationUtils: boolean;
  includeReverseMapping: boolean;
  includeTypeGuards: boolean;
  useStringLiteral: boolean;
  exportEnum: boolean;
  includeJSDoc: boolean;
}

export interface EnumCreatorResult {
  enumName: string;
  enumCode: string;
  validationCode?: string;
  reverseMappingCode?: string;
  typeGuardCode?: string;
  filePath: string;
  originalCode: string;
  generatedAt: number;
}
