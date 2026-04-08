---
name: Configuration Issue
about: Report problems with extension settings, environment setup, or configuration
title: '[CONFIG] '
labels: configuration
assignees: ''
---

## Configuration Issue Type (check one)

- [ ] **Settings Problem** - Issue with VS Code settings
- [ ] **Extension Settings** - Issue with additionalContextMenus.\* settings
- [ ] **Terminal Configuration** - Terminal-specific settings issue
- [ ] **Environment Setup** - Problem setting up development environment
- [ ] **Keybinding Configuration** - Keyboard shortcuts issue
- [ ] **Configuration Not Applied** - Settings not taking effect
- [ ] **Invalid Configuration** - Configuration causing errors
- [ ] **Default Configuration** - Question about default settings

## Issue Description

Describe the configuration problem.

**Summary:**
Brief description of configuration issue.

**Expected Behavior:**
What should happen with correct configuration?

**Actual Behavior:**
What is actually happening?

## Configuration Details

### Extension Settings

**Current VS Code Settings (settings.json):**

```json
{
  "additionalContextMenus.enabled": true,
  "additionalContextMenus.autoDetectProjects": true,
  "additionalContextMenus.supportedExtensions": [".ts", ".tsx", ".js", ".jsx"],
  "additionalContextMenus.copyCode.insertionPoint": "smart",
  "additionalContextMenus.copyCode.preserveComments": true,
  "additionalContextMenus.saveAll.showNotification": true,
  "additionalContextMenus.saveAll.skipReadOnly": true,
  "additionalContextMenus.terminal.type": "integrated",
  "additionalContextMenus.terminal.externalTerminalCommand": "",
  "additionalContextMenus.terminal.openBehavior": "parent-directory",
  "additionalContextMenus.enableKeybindings": false,
  "additionalContextMenus.showKeybindingsInMenu": true
}
```

**Settings Not Working:**
Which specific settings are not working?

- [ ] `additionalContextMenus.enabled`
- [ ] `additionalContextMenus.autoDetectProjects`
- [ ] `additionalContextMenus.supportedExtensions`
- [ ] `additionalContextMenus.copyCode.*`
- [ ] `additionalContextMenus.saveAll.*`
- [ ] `additionalContextMenus.terminal.*`
- [ ] `additionalContextMenus.enableKeybindings`
- [ ] Other: **\*\***\_\_\_\_**\*\***

### Terminal Configuration (if applicable)

**Terminal Type:**

- [ ] `integrated`
- [ ] `external`
- [ ] `system-default`

**Terminal Command:**

```
[Paste your externalTerminalCommand if using external terminal]
```

**Directory Behavior:**

- [ ] `parent-directory`
- [ ] `workspace-root`
- [ ] `current-directory`

**Terminal Issues:**

- [ ] Terminal doesn't open
- [ ] Opens wrong directory
- [ ] Custom command fails
- [ ] Wrong terminal type selected
- [ ] Other: **\*\***\_\_\_\_**\*\***

### Keybinding Configuration (if applicable)

**Keyboard Shortcuts:**

```
[Paste your keybindings.json if relevant]
```

**Keybinding Issues:**

- [ ] Keybindings not registered
- [ ] Keybinding conflicts
- [ ] Keybinding doesn't work
- [ ] Need custom keybinding
- [ ] Other: **\*\***\_\_\_\_**\*\***

## Environment

- **VS Code:** Version (e.g., 1.102.0)
- **Extension:** Version (e.g., 2.0.0)
- **OS:** Windows/macOS/Linux
- **Node.js:** Version
- **VS Code Settings Location:**
  - [ ] User Settings
  - [ ] Workspace Settings
  - [ ] Remote/SSH Settings

## Reproduction Steps

1. Change setting to **\*\***\_\_\_\_**\*\***
2. Reload VS Code / Restart
3. Try to use **\*\***\_\_\_\_**\*\*** feature
4. Configuration doesn't take effect

## Error Messages

```bash
[Paste any error messages from VS Code]
```

**Output Channel:**

```
[Paste output from "Additional Context Menus" output channel]
```

## Configuration Validation

**Configuration Validation Steps:**

- [ ] Restarted VS Code after changing settings
- [ ] Verified settings.json syntax
- [ ] Checked for typos in setting names
- [ ] Tested with default settings
- [ ] Checked for conflicting settings

## Previous Configuration

**Did it work before?**

- [ ] Yes, worked with extension version **\*\***\_\_\_\_**\*\***
- [ ] No, never worked

**Recent Changes:**
Have you recently changed anything?

- [ ] Updated VS Code
- [ ] Updated extension
- [ ] Changed settings
- [ ] Installed new extension
- [ ] Changed project structure

## Desired Configuration

**What You Want:**
Describe your desired configuration behavior.

**Proposed Solution:**
How should this configuration work?

**Use Case:**
Why do you need this configuration?

## Additional Information

**Workspace Settings:**
If using workspace settings, provide workspace.json:

```json
[Provide workspace settings]
```

**VS Code Settings UI:**
Screenshots of settings UI if relevant.

**Related Documentation:**
Links to documentation that you've already consulted.

## Priority

How critical is this configuration issue?

- [ ] Critical - Extension completely unusable
- [ ] High - Major feature not working
- [ ] Medium - Important settings not working
- [ ] Low - Minor configuration issue

---

**Thank you for reporting configuration issues!** ⚙️
