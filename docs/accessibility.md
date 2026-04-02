# Accessibility Guide

## Overview

Additional Context Menus is committed to providing an accessible experience for all developers, including those using assistive technologies. This guide covers the accessibility features, configuration options, and how to get the most out of the extension with screen readers.

## Table of Contents

- [Getting Started with Screen Readers](#getting-started-with-screen-readers)
- [Keyboard Navigation](#keyboard-navigation)
- [Accessibility Configuration](#accessibility-configuration)
- [Screen Reader Features](#screen-reader-features)
- [Testing Accessibility](#testing-accessibility)
- [Known Limitations](#known-limitations)
- [Reporting Issues](#reporting-issues)

---

## Getting Started with Screen Readers

The extension is designed to work seamlessly with popular screen readers:

### Windows

- **NVDA**: Full support with ARIA labels and announcements
- **JAWS**: Compatible with standard VS Code accessibility
- **Narrator**: Basic support through VS Code's accessibility API

### macOS

- **VoiceOver**: Full support with native VoiceOver gestures
- ARIA labels provide context for all interactive elements

### Linux

- **Orca**: Compatible through VS Code's accessibility API
- **Speech Dispatcher**: Basic support available

### First-Time Setup

1. Install Additional Context Menus from the VS Code Marketplace
2. Open VS Code settings (`Ctrl+,` or `Cmd+,`)
3. Search for "accessibility"
4. Set `additionalContextMenus.accessibility.screenReaderMode` to `true`
5. Adjust verbosity level based on your preference

---

## Keyboard Navigation

All features of Additional Context Menus are fully keyboard accessible.

### Quick Pick Dialogs

Quick Pick dialogs (file selectors, schedule pickers, etc.) support:

| Key             | Action                    |
| --------------- | ------------------------- |
| `Up/Down Arrow` | Navigate through items    |
| `Home/End`      | Jump to first/last item   |
| `Page Up/Down`  | Move by page              |
| `Enter`         | Select current item       |
| `Escape`        | Cancel dialog             |
| `Type`          | Filter items (if enabled) |

When keyboard navigation hints are enabled (`additionalContextMenus.accessibility.keyboardNavigation`), the extension announces:

- Current item position (e.g., "Item 3 of 15")
- Available actions (e.g., "Press Enter to select, Escape to cancel")
- File details (name, directory, modification time)

### Input Boxes

Input boxes (enum names, file names, etc.) include:

- Clear prompt text describing the expected input
- Validation requirements in the prompt
- Specific error messages when validation fails

Example prompt:

```
Enter enum name. Validation: Must start with uppercase letter and contain only letters and numbers
```

### Context Menus

Right-click context menus are fully keyboard accessible:

1. Press `Application Key` (Windows) or `Ctrl+F10` to open context menu
2. Use arrow keys to navigate menu items
3. Press `Enter` to activate selection

---

## Accessibility Configuration

### Verbosity Levels

Control how much information is announced to screen readers:

#### Minimal

Only critical announcements are made:

- Operation errors
- Critical failures
- Required user actions

Best for: Experienced users who want minimal interruptions

#### Normal (Default)

Standard level of announcements:

- All operation completions
- Success/failure messages
- File selections

Best for: Most users, balanced feedback

#### Verbose

Detailed announcements including:

- Progress percentages for long operations
- Item counts in lists
- Detailed contextual information
- Step-by-step operation updates

Best for: New users learning the extension

### Configuration Settings

#### Screen Reader Mode

```json
{
  "additionalContextMenus.accessibility.screenReaderMode": true
}
```

When enabled:

- Enhanced ARIA labels on all Quick Pick items
- Additional announcements for operation progress
- Detailed error messages with context
- Position information in file lists

#### Keyboard Navigation Hints

```json
{
  "additionalContextMenus.accessibility.keyboardNavigation": true
}
```

When enabled:

- Keyboard hints in Quick Pick dialogs
- Item position announcements
- Action reminders (Enter to select, Escape to cancel)

#### Verbosity

```json
{
  "additionalContextMenus.accessibility.verbosity": "normal"
}
```

Options: `minimal`, `normal`, `verbose`

---

## Screen Reader Features

### File Selector Dialog

When selecting a target file, screen readers announce:

```
component.ts. File 3 of 15. Located in src/components. Last modified 2 hours ago, detail, workspace, modified at...
```

- File name with position in list
- Directory location
- Last modified time (human-readable)
- Workspace name

### Cron Expression Picker

Schedule options include detailed ARIA labels:

```
Every day at 9am. Runs daily at 9:00 AM. Expression: 0 space 9 space star space star space star
```

- Human-readable schedule description
- Exact cron expression spelled out
- How to navigate ("space" between segments)

### Operation Announcements

#### Success

```
Generate Enum succeeded. Enum 'Status' generated with 3 values
```

#### Error

```
Copy Function failed. No function found at cursor position
```

#### Progress (Verbose mode)

```
Save All: 5 of 12 complete, 42%
```

### Validation Messages

Input validation provides clear, actionable feedback:

```typescript
// Invalid input
"Error: Enum name must start with uppercase letter"

// Valid input
(null) - Input accepted, dialog closes
```

All validation messages start with "Error:" for easy identification.

---

## Testing Accessibility

### Manual Testing Checklist

Use this checklist to verify accessibility:

#### Keyboard Navigation

- [ ] All commands accessible via keyboard
- [ ] Quick Pick dialogs navigable with arrow keys
- [ ] Input boxes accessible with Tab/Shift+Tab
- [ ] Escape closes all dialogs
- [ ] Enter confirms selections

#### Screen Reader Testing

- [ ] Quick Pick items announce labels and descriptions
- [ ] File count announced in selectors
- [ ] Validation errors read clearly
- [ ] Progress announced for long operations
- [ ] Success/failure messages announced

#### ARIA Labels

- [ ] All Quick Pick items have ariaLabel
- [ ] All Quick Pick items have ariaDescription
- [ ] Labels include position information
- [ ] Labels include contextual details

### Automated Testing

Accessibility behavior can be verified by checking ARIA label presence, screen reader announcement triggers, and that configuration changes take effect as expected.

---

## Known Limitations

### Current Limitations

1. **Dynamic Content Updates**
   - Quick Pick filters don't always announce filtered count
   - Workaround: Use verbosity level "verbose" for more feedback

2. **Complex File Paths**
   - Very long paths may be truncated in announcements
   - Full path always available in tooltip on focus

3. **Multiple Selection**
   - Some dialogs only support single selection
   - Multi-select operations planned for future release

### Platform-Specific Notes

#### Windows

- NVDA provides the best experience
- JAWS may require latest version for full ARIA support

#### macOS

- VoiceOver works best with Safari-based VS Code
- Some Quick Pick navigation may require VO keys

#### Linux

- Orca support depends on system speech dispatcher
- Recommend using latest VS Code with AT-SPI 2.0

---

## Reporting Issues

### How to Report Accessibility Issues

If you encounter accessibility problems, please report them:

1. **Check Known Issues** - Review [Known Limitations](#known-limitations)
2. **Search Existing Issues** - Check [GitHub Issues](https://github.com/Vijay431/additional-contexts-menu/issues)
3. **Create Detailed Report** - Include:
   - Screen reader name and version
   - Operating system and version
   - VS Code version
   - Extension version
   - Steps to reproduce
   - Expected vs. actual behavior
   - Debug output (see below)

### Getting Debug Output

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Additional Context Menus: Show Output Channel"
3. Reproduce the issue
4. Copy output from the "Additional Context Menus" channel
5. Include in your issue report

### Accessibility-Only Issue Template

```markdown
**Accessibility Issue**

**Screen Reader**: NVDA 2023.3 / JAWS 2024 / VoiceOver / Orca
**OS**: Windows 11 / macOS 14 / Ubuntu 22.04
**VS Code**: 1.108.1
**Extension Version**: 2.1.0

**Steps to Reproduce**:

1.
2.
3.

**Expected Behavior**:
What should happen with screen reader

**Actual Behavior**:
What actually happens

**Debug Output**:
```

(Paste output from Output Channel)

```

```

---

## Future Accessibility Improvements

Planned enhancements for upcoming releases:

- [ ] Multi-select Quick Pick dialogs
- [ ] Customizable announcement sounds
- [ ] Braille display support improvements
- [ ] Reduced motion mode for animations
- [ ] High contrast mode support
- [ ] Dyslexia-friendly font options

---

## Additional Resources

- [VS Code Accessibility Documentation](https://code.visualstudio.com/docs/editor/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/TR/wai-aria-practices-1.1/)
- [NVDA User Guide](https://www.nvaccess.org/documentation/)
- [VoiceOver User Guide](https://www.apple.com/accessibility/voiceover/)

---

## Changelog

### Version 2.1.0

- Added AccessibilityService for centralized accessibility management
- Added ARIA labels to all Quick Pick items
- Added screen reader announcements for operations
- Added accessible validation messages
- Added accessibility configuration options
- Created comprehensive accessibility documentation

---

**Last Updated**: 2024-01-15
**Document Version**: 1.0.0
