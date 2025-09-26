# Terminal Integration (v1.2.0+)

The terminal integration feature allows you to quickly open terminals in the right directory with a simple right-click. This feature works across Windows, macOS, and Linux with intelligent platform detection.

## 🖥️ Overview

Terminal integration provides three different ways to open terminals:

1. **Integrated Terminal** - VS Code's built-in terminal
2. **External Terminal** - Custom external terminal application
3. **System Default** - Platform's default terminal application

## 🚀 Quick Start

1. Right-click on any file in the editor
2. Select "Open in Terminal" from the context menu
3. The terminal opens in the appropriate directory based on your configuration

## ⚙️ Configuration

### Terminal Type

Configure which type of terminal to open:

```json
{
  "additionalContextMenus.terminal.type": "integrated"
}
```

**Options:**
- `"integrated"` - VS Code integrated terminal (default)
- `"external"` - Custom external terminal
- `"system-default"` - Platform's default terminal

### Directory Behavior

Choose which directory the terminal should open in:

```json
{
  "additionalContextMenus.terminal.openBehavior": "parent-directory"
}
```

**Options:**
- `"parent-directory"` - Directory containing the file (default)
- `"workspace-root"` - Root of the workspace
- `"current-directory"` - The file's directory (if file is a directory)

### External Terminal Command

For external terminals, specify a custom command:

```json
{
  "additionalContextMenus.terminal.externalTerminalCommand": "wt -d {{directory}}"
}
```

Use `{{directory}}` as a placeholder for the target directory path.

## 🖥️ Platform-Specific Behavior

### Windows

**Integrated Terminal:**
- Opens VS Code's integrated terminal with the specified directory

**System Default:**
- Automatically detects and opens Command Prompt or PowerShell
- Command: `start cmd /k "cd /d {path}"`

**External Terminal Examples:**
```json
{
  "additionalContextMenus.terminal.externalTerminalCommand": "wt -d {{directory}}"
}
```

### macOS

**Integrated Terminal:**
- Opens VS Code's integrated terminal with the specified directory

**System Default:**
- Opens Terminal.app with the specified directory
- Command: `open -a Terminal "{path}"`

**External Terminal Examples:**
```json
{
  "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"
}
```

### Linux

**Integrated Terminal:**
- Opens VS Code's integrated terminal with the specified directory

**System Default:**
- Automatically detects available terminal applications:
  - gnome-terminal
  - konsole
  - xfce4-terminal
  - xterm
- Falls back to integrated terminal if none found

**External Terminal Examples:**
```json
{
  "additionalContextMenus.terminal.externalTerminalCommand": "gnome-terminal --working-directory={{directory}}"
}
```

## 🔧 Advanced Configuration Examples

### Windows Terminal (Windows)
```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "wt -d {{directory}}"
}
```

### iTerm2 (macOS)
```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "open -a iTerm {{directory}}"
}
```

### Tilix (Linux)
```json
{
  "additionalContextMenus.terminal.type": "external",
  "additionalContextMenus.terminal.externalTerminalCommand": "tilix --working-directory={{directory}}"
}
```

### Workspace Root Terminal
```json
{
  "additionalContextMenus.terminal.openBehavior": "workspace-root",
  "additionalContextMenus.terminal.type": "integrated"
}
```

## 🛠️ Error Handling & Fallbacks

The terminal integration includes robust error handling:

### Permission Issues
- Displays helpful error messages for permission problems
- Suggests solutions for common access issues

### Invalid Paths
- Validates directory paths before attempting to open terminal
- Falls back to workspace root if target directory is invalid

### Missing External Terminals
- Automatically falls back to integrated terminal if external command fails
- Provides clear error messages about missing applications

### Platform Detection Failures
- Gracefully handles unsupported platforms
- Falls back to integrated terminal as safe default

## 🧪 Testing Terminal Functionality

### Basic Testing
1. Test with different file types (.ts, .tsx, .js, .jsx)
2. Test in different project structures (React, Angular, Express, Next.js)
3. Test with files at different directory levels

### Cross-Platform Testing
1. **Windows**: Test Command Prompt, PowerShell, Windows Terminal
2. **macOS**: Test Terminal.app, iTerm2
3. **Linux**: Test gnome-terminal, konsole, xfce4-terminal

### Configuration Testing
1. Test all three terminal types
2. Test all three directory behaviors
3. Test custom external terminal commands
4. Test with special characters in file paths

## 🚨 Troubleshooting

### Terminal Doesn't Open

**Check Configuration:**
```json
{
  "additionalContextMenus.enabled": true,
  "additionalContextMenus.terminal.type": "integrated"
}
```

**Verify Permissions:**
- Ensure VS Code has permission to execute terminal commands
- Check if external terminal application is installed and accessible

### Wrong Directory Opens

**Check Directory Behavior Setting:**
```json
{
  "additionalContextMenus.terminal.openBehavior": "parent-directory"
}
```

**Verify Workspace Structure:**
- Ensure workspace root is correctly detected
- Check if package.json exists in expected location

### External Terminal Fails

**Verify Command Syntax:**
```json
{
  "additionalContextMenus.terminal.externalTerminalCommand": "correct-command {{directory}}"
}
```

**Check Application Installation:**
- Ensure external terminal application is installed
- Verify application is in system PATH
- Test command manually in system terminal

### Platform-Specific Issues

**Windows:**
- Ensure Command Prompt or PowerShell is available
- Check Windows Terminal installation if using custom commands

**macOS:**
- Verify Terminal.app permissions
- Check iTerm2 or other terminal app permissions

**Linux:**
- Ensure at least one terminal application is installed
- Check desktop environment terminal integration

## 📊 Performance Considerations

The terminal integration is designed for optimal performance:

- **Fast Directory Resolution**: Efficient path validation and resolution
- **Minimal Resource Usage**: Terminal processes are spawned efficiently
- **Error Recovery**: Quick fallback to alternative terminal types
- **Cross-Platform Optimization**: Platform-specific optimizations for each OS

## 🔗 Related Features

- [Core Features](Core-Features) - Other context menu operations
- [Configuration](Configuration) - Complete settings reference
- [Troubleshooting](Troubleshooting) - General troubleshooting guide
- [Development Guide](Development-Guide) - Contributing terminal improvements

---

**💡 Pro Tip**: Start with integrated terminal to ensure basic functionality, then customize with external terminals based on your preferences and workflow needs.