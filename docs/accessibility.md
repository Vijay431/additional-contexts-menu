# Accessibility

The Additional Context Menus VS Code extension is committed to being accessible to all developers, including those with disabilities. This document outlines the accessibility features, guidelines, and testing procedures for the extension.

## Accessibility Features

### Keyboard Navigation

All features of the extension are fully accessible via keyboard:

#### Command Palette Access

All commands are accessible through the VS Code Command Palette:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type the command name
3. Press `Enter` to execute

**Available Commands:**
- `Additional Context Menus: Copy File Path`
- `Additional Context Menus: Copy Relative Path`
- `Additional Context Menus: Open in Terminal`
- `Additional Context Menus: Reveal in File Explorer`
- And all other extension commands

#### Context Menu Access

Context menus can be accessed via keyboard:

1. Navigate to a file or folder in the Explorer using arrow keys
2. Press `Shift+F10` (Windows/Linux) or `Fn+Shift+F10` (macOS) to open the context menu
3. Use arrow keys to navigate menu items
4. Press `Enter` to select an item

#### File Picker Navigation

When the extension opens file pickers or quick pick menus:

1. Use arrow keys to navigate options
2. Type to filter/search options
3. Press `Enter` to select
4. Press `Escape` to cancel

### Screen Reader Support

The extension is compatible with screen readers through VS Code's built-in accessibility features:

#### Notification Messages

All user-facing messages use VS Code's notification APIs, which are screen reader accessible:

- **Information messages**: `vscode.window.showInformationMessage()`
- **Warning messages**: `vscode.window.showWarningMessage()`
- **Error messages**: `vscode.window.showErrorMessage()`

The extension **does not** use `console.log()` for user-facing messages, ensuring all feedback is accessible.

#### Status Bar Updates

Status bar items include text labels that are announced by screen readers.

#### Progress Indicators

Long-running operations use VS Code's progress API with descriptive text:

```typescript
vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,
  title: "Processing files...",
  cancellable: true
}, async (progress) => {
  // Operation with progress updates
});
```

### Visual Accessibility

#### High Contrast Theme Support

The extension respects VS Code's high contrast themes:

- No custom colors that override theme settings
- Icons use VS Code's theme-aware icon system
- All UI elements maintain sufficient contrast ratios

#### Icon Accessibility

All icons include text labels in the package.json configuration:

```json
{
  "command": "extension.commandName",
  "title": "Descriptive Command Title",
  "icon": "$(icon-name)"
}
```

Icons are supplementary to text labels, never the sole means of conveying information.

#### Text Alternatives

All visual content in documentation includes alternative text:

- Images have descriptive alt text
- Diagrams include text descriptions
- Screenshots are supplemented with text explanations

## Accessibility Guidelines for Contributors

When contributing to this extension, please follow these guidelines:

### 1. Keyboard Accessibility

- ✅ **Do**: Ensure all features are accessible via Command Palette
- ✅ **Do**: Use VS Code's built-in keyboard navigation
- ❌ **Don't**: Create custom UI that bypasses keyboard navigation
- ❌ **Don't**: Require mouse-only interactions

### 2. Screen Reader Compatibility

- ✅ **Do**: Use `vscode.window.showInformationMessage()` for user messages
- ✅ **Do**: Provide descriptive text for all UI elements
- ✅ **Do**: Use VS Code's notification system for feedback
- ❌ **Don't**: Use `console.log()` for user-facing messages
- ❌ **Don't**: Rely solely on visual indicators

### 3. Visual Design

- ✅ **Do**: Respect VS Code's theme settings
- ✅ **Do**: Use theme-aware colors and icons
- ✅ **Do**: Provide text labels for all icons
- ❌ **Don't**: Hard-code colors or styles
- ❌ **Don't**: Use icons without text alternatives

### 4. Documentation

- ✅ **Do**: Include alt text for all images
- ✅ **Do**: Provide text descriptions for visual content
- ✅ **Do**: Use semantic markdown headings
- ❌ **Don't**: Use images as the sole means of conveying information
- ❌ **Don't**: Use color alone to convey meaning

## Accessibility Testing

### Manual Testing Checklist

Use this checklist to verify accessibility:

#### Keyboard Navigation Testing

- [ ] All commands are accessible via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- [ ] Context menus can be opened with `Shift+F10` / `Fn+Shift+F10`
- [ ] All menu items can be navigated with arrow keys
- [ ] All dialogs and pickers can be navigated with keyboard
- [ ] Tab order is logical and predictable
- [ ] Focus indicators are visible
- [ ] No keyboard traps (can always navigate away)

#### Screen Reader Testing

Test with at least one screen reader:

- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca

Checklist:

- [ ] All commands are announced clearly
- [ ] Notification messages are read aloud
- [ ] Status bar updates are announced
- [ ] Progress indicators provide audio feedback
- [ ] Error messages are clearly communicated
- [ ] All UI elements have appropriate labels

#### Visual Testing

- [ ] Test with high contrast themes (both light and dark)
- [ ] Verify all icons have text labels
- [ ] Check that custom UI respects theme colors
- [ ] Ensure sufficient contrast ratios (WCAG AA: 4.5:1 for text)
- [ ] Test with different font sizes
- [ ] Verify no information is conveyed by color alone

#### Documentation Testing

- [ ] All images have descriptive alt text
- [ ] Diagrams include text descriptions
- [ ] Headings follow semantic structure
- [ ] Links have descriptive text (not "click here")
- [ ] Code examples are properly formatted
- [ ] Tables have proper headers

### Automated Testing

The extension includes automated accessibility checks:

#### Command Registration Validation

Ensures all commands are properly registered in package.json:

```typescript
// Validates that all commands have:
// - Unique command IDs
// - Descriptive titles
// - Appropriate categories
// - Command palette visibility
```

#### Notification API Usage Validation

Scans code to ensure proper notification API usage:

```typescript
// Checks for:
// - No console.log() for user messages
// - Proper use of showInformationMessage()
// - Proper use of showWarningMessage()
// - Proper use of showErrorMessage()
```

#### Context Menu When Clauses

Validates that context menus have appropriate `when` clauses:

```typescript
// Ensures context menus:
// - Only appear in relevant contexts
// - Don't clutter unrelated areas
// - Have proper visibility conditions
```

### Testing Tools

- **VS Code Accessibility Features**: Built-in accessibility checker
- **Screen Readers**: NVDA, JAWS, VoiceOver, Orca
- **Keyboard Testing**: Manual keyboard-only navigation
- **Contrast Checkers**: WebAIM Contrast Checker, Chrome DevTools
- **Automated Linting**: Custom validation scripts in CI/CD

## Known Accessibility Considerations

### Current Limitations

- The extension relies on VS Code's accessibility features; any limitations in VS Code affect the extension
- Some third-party dependencies may have their own accessibility considerations
- Complex file operations may require additional context for screen reader users

### Future Improvements

Planned accessibility enhancements:

- [ ] Add more descriptive progress messages for long operations
- [ ] Provide audio cues for completed operations (via VS Code APIs)
- [ ] Enhance documentation with more detailed screen reader instructions
- [ ] Add accessibility testing to CI/CD pipeline
- [ ] Create video tutorials with captions and transcripts

## Reporting Accessibility Issues

If you encounter accessibility barriers while using this extension:

1. **Check existing issues**: Search [GitHub Issues](https://github.com/Vijay431/additional-context-menus/issues) for similar reports
2. **Create a new issue**: Use the bug report template and include:
   - Description of the accessibility barrier
   - Assistive technology being used (screen reader, keyboard-only, etc.)
   - Steps to reproduce the issue
   - Expected accessible behavior
   - VS Code version and operating system
3. **Label appropriately**: Add the "accessibility" label to your issue

Accessibility issues are prioritized and addressed promptly.

## Accessibility Resources

### VS Code Accessibility

- [VS Code Accessibility Documentation](https://code.visualstudio.com/docs/editor/accessibility)
- [VS Code Keyboard Shortcuts](https://code.visualstudio.com/docs/getstarted/keybindings)
- [VS Code Extension API - Accessibility](https://code.visualstudio.com/api/references/extension-guidelines#accessibility)

### Web Content Accessibility Guidelines (WCAG)

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Resources](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

### Screen Readers

- [NVDA (Windows)](https://www.nvaccess.org/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS)](https://www.apple.com/accessibility/voiceover/)
- [Orca (Linux)](https://help.gnome.org/users/orca/stable/)

## Accessibility Statement

The Additional Context Menus VS Code extension is committed to ensuring digital accessibility for all users. We continually improve the user experience for everyone and apply relevant accessibility standards.

### Conformance Status

We aim to conform to WCAG 2.1 Level AA standards, as applicable to VS Code extensions.

### Feedback

We welcome feedback on the accessibility of this extension. Please contact us via:

- [GitHub Issues](https://github.com/Vijay431/additional-context-menus/issues)
- [GitHub Discussions](https://github.com/Vijay431/additional-context-menus/discussions)

### Compatibility

The extension is designed to be compatible with:

- Current versions of VS Code
- Common screen readers (NVDA, JAWS, VoiceOver, Orca)
- Keyboard-only navigation
- High contrast themes
- Custom font sizes and zoom levels

---

**Last Updated**: December 2025

For questions or suggestions about accessibility, please open an issue or discussion on GitHub.
