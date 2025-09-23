---
name: Terminal Configuration Issue
about: Issues with terminal integration and configuration (v1.2.0+)
title: '[TERMINAL] '
labels: terminal, configuration
assignees: ''
---

**Terminal Configuration Issue**
Describe the terminal functionality problem you're experiencing.

**Configuration Details**

Current terminal settings (found in VS Code settings or settings.json):

```json
{
  "additionalContextMenus.terminal.type": "",
  "additionalContextMenus.terminal.externalTerminalCommand": "",
  "additionalContextMenus.terminal.openBehavior": ""
}
```

**Expected Terminal Behavior**
What you expected to happen when using "Open in Terminal".

**Actual Terminal Behavior**
What actually happened instead.

**Platform Information**

- OS: [Windows 10/11, macOS version, Linux distribution]
- Default Terminal: [Command Prompt/PowerShell/Terminal.app/gnome-terminal/konsole/etc.]
- VS Code Terminal: [What terminal appears in VS Code integrated terminal]
- External Terminal Preference: [If using external terminal, which one]

**Terminal Type Testing**

Please test all three terminal types and indicate results:

- [ ] **Integrated Terminal**: ✅ Works / ❌ Fails - [Description]
- [ ] **External Terminal**: ✅ Works / ❌ Fails - [Description]
- [ ] **System Default**: ✅ Works / ❌ Fails - [Description]

**Directory Behavior Testing**

Test different directory behaviors:

- [ ] **Parent Directory**: ✅ Works / ❌ Fails - [Description]
- [ ] **Workspace Root**: ✅ Works / ❌ Fails - [Description]
- [ ] **Current Directory**: ✅ Works / ❌ Fails - [Description]

**Error Messages**

If applicable, include any error messages from:
- VS Code Developer Console (Help > Toggle Developer Tools > Console)
- Additional Context Menus Output Channel (View > Output > Additional Context Menus)
- System error dialogs

```
[Paste error messages here]
```

**Custom External Terminal Command** (if applicable)

If using external terminal, provide your custom command:

```
additionalContextMenus.terminal.externalTerminalCommand: "your-command-here"
```

**File Structure Context**

- Workspace Type: [Single folder/Multi-root workspace]
- File Path: [Path where you right-clicked, especially if it has special characters]
- Project Root: [Location of package.json relative to the file]

**Steps to Reproduce**

1. Open VS Code in [project type]
2. Configure terminal settings to [specific configuration]
3. Right-click on [file type] in [location]
4. Select "Open in Terminal"
5. Observe [actual behavior]

**Workarounds Found** (if any)

Any workarounds or alternative configurations that work for you.

**Additional Context**

Any other relevant information about your development environment, terminal preferences, or specific use case.