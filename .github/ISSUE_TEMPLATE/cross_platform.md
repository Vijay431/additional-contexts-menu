---
name: Cross-Platform Issue
about: Report an issue specific to Windows, macOS, Linux, or cross-platform compatibility
title: '[PLATFORM] '
labels: cross-platform
assignees: ''
---

## Platform Type (check one)

- [ ] **Windows** - Windows-specific issue
- [ ] **macOS** - macOS-specific issue
- [ ] **Linux** - Linux-specific issue
- [ ] **Cross-Platform** - Works differently on different platforms
- [ ] **Platform Detection** - Issue detecting platform

## Issue Type

- [ ] Bug - Platform-specific bug
- [ ] Feature - Platform-specific feature request
- [ ] Enhancement - Platform-specific improvement
- [ ] Terminal - Terminal platform issue
- [ ] Path Handling - File path platform issue

## Platform Details

**Issue Occurs On:**

- [ ] Windows (version: **\*\***\_\_\_\_**\*\***)
- [ ] macOS (version: **\*\***\_\_\_\_**\*\***)
- [ ] Linux (distro: **\*\***\_\_\_\_**\*\***)
- [ ] Multiple platforms

**Works On:**

- [ ] Windows (version: **\*\***\_\_\_\_**\*\***)
- [ ] macOS (version: **\*\***\_\_\_\_**\*\***)
- [ ] Linux (distro: **\*\***\_\_\_\_**\*\***)
- [ ] None (broken on all)

## Issue Description

Describe the platform-specific issue.

**Summary:**
Brief description of the problem.

**Platform-Specific Behavior:**
How does behavior differ between platforms?

## Reproduction Steps

1. On **\*\***\_\_\_\_**\*\*** platform
2. Open **\*\***\_\_\_\_**\*\*** file
3. Execute **\*\***\_\_\_\_**\*\*** command
4. See platform-specific issue

## Code Example

**Relevant Code:**

```typescript
[Provide code snippet related to issue]
```

## Error Messages

**Platform Error:**

```bash
[Paste platform-specific error messages]
```

**VS Code Output Channel:**

```
[Paste output from "Additional Context Menus" output channel]
```

## Platform-Specific Details

### Windows (if applicable)

**Windows Version:** (e.g., Windows 10, Windows 11)

**Terminal:**

- [ ] Command Prompt (cmd)
- [ ] PowerShell
- [ ] Windows Terminal
- [ ] Git Bash
- [ ] Other: **\*\***\_\_\_\_**\*\***

**File System:**

- [ ] NTFS
- [ ] ReFS
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Path Separator:** `\` (backslash) or `/` (forward slash)

**Specific Issues:**

- [ ] Path handling
- [ ] Permission errors
- [ ] Terminal integration
- [ ] Other: **\*\***\_\_\_\_**\*\***

### macOS (if applicable)

**macOS Version:** (e.g., macOS 14 Sonoma, macOS 13 Ventura)

**Terminal:**

- [ ] Terminal.app
- [ ] iTerm2
- [ ] zsh
- [ ] bash
- [ ] Other: **\*\***\_\_\_\_**\*\***

**File System:**

- [ ] APFS
- [ ] HFS+
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Specific Issues:**

- [ ] Permission issues
- [ ] Gatekeeper/Notarization
- [ ] Terminal integration
- [ ] Other: **\*\***\_\_\_\_**\*\***

### Linux (if applicable)

**Linux Distribution:** (e.g., Ubuntu 22.04, Fedora 38, Arch Linux)

**Desktop Environment:**

- [ ] GNOME
- [ ] KDE Plasma
- [ ] Xfce
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Terminal:**

- [ ] gnome-terminal
- [ ] konsole
- [ ] xfce4-terminal
- [ ] xterm
- [ ] Other: **\*\***\_\_\_\_**\*\***

**File System:**

- [ ] ext4
- [ ] btrfs
- [ ] xfs
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Specific Issues:**

- [ ] Path handling
- [ ] Permission issues
- [ ] Terminal integration
- [ ] Other: **\*\***\_\_\_\_**\*\***

## Path Handling Issues (if applicable)

**Example Path:**

```
[Provide example file path that causes issues]
```

**Expected Path:**

```
[What should the path be]
```

**Actual Path:**

```
[What the path actually is]
```

**Platform Differences:**
Describe how paths differ between platforms.

## Terminal Integration Issues (if applicable)

**Terminal Type:**

- [ ] Integrated Terminal
- [ ] External Terminal
- [ ] System Default Terminal

**Terminal Command:**
What terminal command is being executed?

```bash
[Terminal command]
```

**Expected Behavior:**
What should happen?

**Actual Behavior:**
What actually happens?

## Environment

- **VS Code:** Version (e.g., 1.102.0)
- **Extension:** Version (e.g., 2.0.0)
- **Node.js:** Version
- **OS Version:** Specify exact version
- **Desktop Environment:** (Linux only)

## Additional Information

**Platform-Specific Config:**
Any platform-specific configuration?

**Workarounds:**
Are there any workarounds?

**Related Issues:**
Link to related platform-specific issues.

## Priority

How critical is this platform-specific issue?

- [ ] Critical - Extension unusable on this platform
- [ ] High - Significant functionality broken
- [ ] Medium - Minor inconvenience
- [ ] Low - Minor platform quirk

---

**Thank you for helping improve cross-platform support!** 🌐
