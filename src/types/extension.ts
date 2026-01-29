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
    hooksDirectory: string;
    useInfiniteQuery: boolean;
    includeOptimisticUpdates: boolean;
    includeCacheInvalidation: boolean;
    generateApiService: boolean;
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
  readmeGenerator: {
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
  apiClientGenerator: {
    enabled: boolean;
    targetFramework: 'react' | 'vue' | 'angular' | 'svelte';
    includeTypeScript: boolean;
    generateFetchClient: boolean;
    generateAxiosClient: boolean;
    outputDirectory: string;
    baseApiUrl?: string;
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
}

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
export type TaskRunnerType = 'npm' | 'yarn' | 'pnpm' | 'gulp' | 'grunt' | 'webpack';

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
  document: vscode.TextDocument;
  success: boolean;
}
