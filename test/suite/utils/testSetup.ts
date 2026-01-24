import * as vscode from 'vscode';
import { TerminalService } from '../../../src/services/terminalService';
import { ConfigurationService } from '../../../src/services/configurationService';
import { Logger } from '../../../src/utils/logger';
import { VSCodeMocks, MockConfigurationService, TestConfigFactory, TestDataFactory } from './testMocks';
import { ExtensionConfig } from '../../../src/types/extension';

/**
 * Test setup utilities for injecting mocks and managing test state
 */

// Store original methods for restoration
const originalMethods = new Map<string, any>();

export class TestSetup {
  private static vscMocks: VSCodeMocks;
  private static mockConfigService: MockConfigurationService;
  private static isRunningInVSCode: boolean;

  /**
   * Check if we're running inside VS Code test environment
   */
  private static checkEnvironment(): boolean {
    // Check if vscode APIs are real (not mocked) and read-only
    try {
      const workspaceDescriptor = Object.getOwnPropertyDescriptor(vscode, 'workspace');
      const windowDescriptor = Object.getOwnPropertyDescriptor(vscode, 'window');
      return workspaceDescriptor?.configurable === false || windowDescriptor?.configurable === false;
    } catch {
      return false;
    }
  }

  /**
   * Initialize test environment with mocks
   * @param config Optional configuration for the mock
   * @param forceMocks Force mocking even when running in VS Code (for unit tests)
   */
  public static setup(config?: Partial<ExtensionConfig>, forceMocks = false): void {
    // Set test mode environment variable to bypass path validation
    process.env['AUTO_CLAUDE_TEST_MODE'] = 'true';

    // Check if running inside VS Code test environment
    TestSetup.isRunningInVSCode = TestSetup.checkEnvironment();

    // Get mock instances
    TestSetup.vscMocks = VSCodeMocks.getInstance();
    TestSetup.mockConfigService = new MockConfigurationService(config);

    // Setup typical workspace
    TestSetup.vscMocks.setWorkspaceFolders(TestDataFactory.createTypicalWorkspace());
    TestSetup.vscMocks.addDirectory('/home/user/project');
    TestSetup.vscMocks.addDirectory('/home/user/project/src');
    TestSetup.vscMocks.addFile('/home/user/project/src/test.ts');

    // Mock vscode APIs if not running in VS Code, or if forcing mocks for unit tests
    const shouldMock = !TestSetup.isRunningInVSCode || forceMocks;

    if (shouldMock) {
      // Mock vscode.window methods
      TestSetup.mockVSCodeWindow();

      // Mock vscode.workspace methods
      TestSetup.mockVSCodeWorkspace();

      // Mock vscode.window terminals property
      TestSetup.mockVSCodeWindowTerminals();
    }

    // Mock ConfigurationService
    TestSetup.mockConfigurationService();

    // Suppress logger output during tests
    TestSetup.mockLogger();
  }

  /**
   * Clean up test environment and restore original methods
   * @param forceRestore Force restoration even if running in VS Code (for unit tests)
   */
  public static teardown(forceRestore = false): void {
    // Clean up test mode environment variable
    delete process.env['AUTO_CLAUDE_TEST_MODE'];

    // Reset mock state
    VSCodeMocks.reset();

    // Restore original methods if we mocked them (either not in VS Code or forced)
    const shouldRestore = !TestSetup.isRunningInVSCode || forceRestore;
    if (shouldRestore) {
      TestSetup.restoreOriginalMethods();
    }

    // Clear singleton instances
    TestSetup.clearSingletons();
  }

  /**
   * Mock VS Code window methods
   */
  private static mockVSCodeWindow(): void {
    const window = vscode.window as any;

    // Store original methods
    if (window.createTerminal) {
      originalMethods.set('window.createTerminal', window.createTerminal);
    }
    if (window.showInformationMessage) {
      originalMethods.set('window.showInformationMessage', window.showInformationMessage);
    }
    if (window.showErrorMessage) {
      originalMethods.set('window.showErrorMessage', window.showErrorMessage);
    }

    // Mock methods
    window.createTerminal = (options: vscode.TerminalOptions) => {
      return TestSetup.vscMocks.createTerminal(options);
    };

    window.showInformationMessage = (message: string) => {
      TestSetup.vscMocks.showInformationMessage(message);
    };

    window.showErrorMessage = (message: string) => {
      TestSetup.vscMocks.showErrorMessage(message);
    };
  }

  /**
   * Mock VS Code window terminals property
   */
  private static mockVSCodeWindowTerminals(): void {
    const window = vscode.window as any;

    // Store original property
    originalMethods.set('window.terminals', window.terminals);

    // Mock terminals property
    Object.defineProperty(window, 'terminals', {
      get: () => TestSetup.vscMocks.terminals,
      configurable: true
    });
  }

  /**
   * Mock VS Code workspace methods
   */
  private static mockVSCodeWorkspace(): void {
    const workspace = vscode.workspace as any;

    // Store original methods
    if (workspace.workspaceFolders) {
      originalMethods.set('workspace.workspaceFolders', workspace.workspaceFolders);
    }
    if (workspace.fs?.stat) {
      originalMethods.set('workspace.fs.stat', workspace.fs.stat);
    }

    // Try to mock workspaceFolders - may fail in real VS Code environment
    try {
      Object.defineProperty(workspace, 'workspaceFolders', {
        get: () => TestSetup.vscMocks.getWorkspaceFolders(),
        configurable: true
      });
    } catch (error) {
      // Property is read-only in real VS Code, skip mocking
    }

    // Try to mock file system - may fail in real VS Code environment
    try {
      if (!workspace.fs) {
        workspace.fs = {};
      }
      workspace.fs.stat = (uri: vscode.Uri) => {
        return TestSetup.vscMocks.stat(uri);
      };
    } catch (error) {
      // Property is read-only in real VS Code, skip mocking
    }
  }

  /**
   * Mock ConfigurationService
   */
  private static mockConfigurationService(): void {
    const configServiceProto = ConfigurationService.prototype as any;

    // Store original methods
    originalMethods.set('ConfigurationService.getConfiguration', configServiceProto.getConfiguration);
    originalMethods.set('ConfigurationService.isEnabled', configServiceProto.isEnabled);
    originalMethods.set('ConfigurationService.getInstance', ConfigurationService.getInstance);

    // Mock methods
    configServiceProto.getConfiguration = function() {
      return TestSetup.mockConfigService.getConfiguration();
    };

    configServiceProto.isEnabled = function() {
      return TestSetup.mockConfigService.isEnabled();
    };

    // Mock getInstance to return our mock
    ConfigurationService.getInstance = () => {
      return TestSetup.mockConfigService as any;
    };
  }

  /**
   * Mock Logger to suppress output during tests
   */
  private static mockLogger(): void {
    const loggerProto = Logger.prototype as any;

    // Store original methods
    originalMethods.set('Logger.info', loggerProto.info);
    originalMethods.set('Logger.debug', loggerProto.debug);
    originalMethods.set('Logger.warn', loggerProto.warn);
    originalMethods.set('Logger.error', loggerProto.error);

    // Mock with no-op functions
    loggerProto.info = () => {};
    loggerProto.debug = () => {};
    loggerProto.warn = () => {};
    loggerProto.error = () => {};
  }

  /**
   * Restore all original methods
   */
  private static restoreOriginalMethods(): void {
    for (const [key, originalMethod] of originalMethods.entries()) {
      const parts = key.split('.');
      if (parts.length < 2) continue;

      const [object, method] = parts;
      if (!object || !method) continue;

      try {
        switch (object) {
          case 'window':
            if (method === 'terminals') {
              delete (vscode.window as any).terminals;
            } else if (originalMethod) {
              (vscode.window as any)[method] = originalMethod;
            }
            break;
          case 'workspace':
            if (method === 'workspaceFolders') {
              delete (vscode.workspace as any).workspaceFolders;
            } else if (method && method.startsWith('fs.')) {
              const fsMethod = method.replace('fs.', '');
              if (vscode.workspace.fs && originalMethod) {
                try {
                  (vscode.workspace.fs as any)[fsMethod] = originalMethod;
                } catch (error) {
                  // Property is read-only in real VS Code, skip restoration
                }
              }
            } else if (originalMethod) {
              (vscode.workspace as any)[method] = originalMethod;
            }
            break;
          case 'ConfigurationService':
            if (method === 'getInstance' && originalMethod) {
              (ConfigurationService as any).getInstance = originalMethod;
            } else if (originalMethod) {
              (ConfigurationService.prototype as any)[method] = originalMethod;
            }
            break;
          case 'Logger':
            if (originalMethod) {
              (Logger.prototype as any)[method] = originalMethod;
            }
            break;
        }
      } catch (error) {
        // Property is read-only or can't be restored, continue with next
      }
    }

    originalMethods.clear();
  }

  /**
   * Clear singleton instances to ensure fresh state
   */
  private static clearSingletons(): void {
    // Clear TerminalService singleton
    (TerminalService as any).instance = null;

    // Clear ConfigurationService singleton
    (ConfigurationService as any).instance = null;

    // Clear Logger singleton
    (Logger as any).instance = null;
  }

  /**
   * Get mock instances for test assertions
   */
  public static getMocks() {
    return {
      vscode: TestSetup.vscMocks,
      config: TestSetup.mockConfigService,
    };
  }

  /**
   * Update configuration for tests
   */
  public static updateConfig(updates: Partial<ExtensionConfig>): void {
    TestSetup.mockConfigService.updateConfig(updates);
  }

  /**
   * Setup workspace folders for tests
   */
  public static setWorkspaceFolders(folders: string[]): void {
    const workspaceFolders = folders.map((path, index) =>
      TestDataFactory.createWorkspaceFolder(path, `project${index}`)
    );
    TestSetup.vscMocks.setWorkspaceFolders(workspaceFolders);
  }

  /**
   * Add files and directories to mock file system
   */
  public static addFile(path: string, isDirectory = false): void {
    TestSetup.vscMocks.addFile(path, isDirectory);
  }

  /**
   * Create a fresh TerminalService instance for testing
   */
  public static createTerminalService(): TerminalService {
    // Clear existing singleton
    (TerminalService as any).instance = null;

    // Get new instance which will use mocked dependencies
    const service = TerminalService.getInstance();

    // Initialize it
    service.initialize();

    return service;
  }
}

/**
 * Test helper functions for common test scenarios
 */
export class TestHelpers {
  /**
   * Create test scenario with integrated terminal configuration
   */
  public static setupIntegratedTerminal(): TerminalService {
    TestSetup.setup(TestConfigFactory.createForTerminalType('integrated'), true);
    return TestSetup.createTerminalService();
  }

  /**
   * Create test scenario with external terminal configuration
   */
  public static setupExternalTerminal(command = 'gnome-terminal --working-directory={{directory}}'): TerminalService {
    TestSetup.setup(TestConfigFactory.createWithExternalTerminal(command), true);
    return TestSetup.createTerminalService();
  }

  /**
   * Create test scenario with system default terminal
   */
  public static setupSystemDefaultTerminal(): TerminalService {
    TestSetup.setup(TestConfigFactory.createForTerminalType('system-default'), true);
    return TestSetup.createTerminalService();
  }

  /**
   * Create test scenario with specific open behavior
   */
  public static setupWithOpenBehavior(behavior: 'parent-directory' | 'workspace-root' | 'current-directory'): TerminalService {
    TestSetup.setup(TestConfigFactory.createForOpenBehavior(behavior), true);
    return TestSetup.createTerminalService();
  }

  /**
   * Create test scenario with no workspace folders
   */
  public static setupNoWorkspace(): TerminalService {
    TestSetup.setup(undefined, true);
    TestSetup.setWorkspaceFolders([]);
    return TestSetup.createTerminalService();
  }

  /**
   * Create test scenario with multiple workspace folders
   */
  public static setupMultiWorkspace(): TerminalService {
    TestSetup.setup(undefined, true);
    TestSetup.setWorkspaceFolders(['/home/user/project1', '/home/user/project2']);
    TestSetup.addFile('/home/user/project1', true);
    TestSetup.addFile('/home/user/project2', true);
    return TestSetup.createTerminalService();
  }

  /**
   * Get test file paths for different scenarios
   */
  public static getTestPaths() {
    return {
      unixFile: '/home/user/project/src/file.ts',
      windowsFile: 'C:\\Users\\User\\project\\src\\file.ts',
      fileWithSpaces: '/home/user/My Project/src/file with spaces.ts',
      deepFile: '/home/user/project/src/components/ui/Button/Button.tsx',
      workspaceRoot: '/home/user/project',
      nonExistentFile: '/non/existent/path/file.ts',
      invalidPath: '\0invalid\0path',
    };
  }

  /**
   * Assert terminal was created with expected options
   */
  public static assertTerminalCreated(expectedName?: string, expectedCwd?: string): void {
    const mocks = TestSetup.getMocks();
    const terminal = mocks.vscode.getLastCreatedTerminal();

    if (!terminal) {
      throw new Error('Expected terminal to be created, but none was found');
    }

    if (expectedName && !terminal.name.includes(expectedName)) {
      throw new Error(`Expected terminal name to contain '${expectedName}', but got '${terminal.name}'`);
    }

    if (expectedCwd && terminal.creationOptions.cwd !== expectedCwd) {
      throw new Error(`Expected terminal cwd to be '${expectedCwd}', but got '${terminal.creationOptions.cwd}'`);
    }
  }

  /**
   * Assert information message was shown
   */
  public static assertInfoMessage(expectedMessage?: string): void {
    const mocks = TestSetup.getMocks();
    const message = mocks.vscode.getLastInfoMessage();

    if (!message) {
      throw new Error('Expected information message to be shown, but none was found');
    }

    if (expectedMessage && !message.includes(expectedMessage)) {
      throw new Error(`Expected message to contain '${expectedMessage}', but got '${message}'`);
    }
  }

  /**
   * Assert error message was shown
   */
  public static assertErrorMessage(expectedMessage?: string): void {
    const mocks = TestSetup.getMocks();
    const message = mocks.vscode.getLastErrorMessage();

    if (!message) {
      throw new Error('Expected error message to be shown, but none was found');
    }

    if (expectedMessage && !message.includes(expectedMessage)) {
      throw new Error(`Expected message to contain '${expectedMessage}', but got '${message}'`);
    }
  }
}