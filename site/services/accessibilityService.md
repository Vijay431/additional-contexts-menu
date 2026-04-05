---
layout: default
title: 'Accessibility Service'
description: 'Screen reader support and accessible announcements for Additional Context Menus extension.'
---

# Accessibility Service

Centralized accessibility management for screen reader support and accessible announcements.

## Overview

The Accessibility Service handles all accessibility-related functionality including:

- Screen reader announcements via VS Code's accessibility API
- Configurable verbosity levels for different user needs
- Keyboard navigation hints for Quick Pick dialogs
- Accessible item formatting with count information

## Configuration

### Settings

All accessibility settings are prefixed with `additionalContextMenus.accessibility.`:

| Setting              | Type    | Default    | Description                           |
| -------------------- | ------- | ---------- | ------------------------------------- |
| `verbosity`          | string  | `"normal"` | Controls announcement verbosity level |
| `screenReaderMode`   | boolean | `false`    | Enable enhanced screen reader support |
| `keyboardNavigation` | boolean | `true`     | Show keyboard navigation hints        |

### Verbosity Levels

| Level     | Behavior                                                             |
| --------- | -------------------------------------------------------------------- |
| `minimal` | Only essential announcements (errors, critical operations)           |
| `normal`  | Standard announcements for all operations (default, recommended)     |
| `verbose` | Detailed announcements including progress and contextual information |

## API Reference

### Announcement Methods

#### `announce(message: string, verbosity?: VerbosityLevel): Promise<void>`

Announce a message to screen readers using VS Code's accessibility API.

```typescript
// Basic announcement
await accessibilityService.announce('File saved successfully');

// With verbosity level
await accessibilityService.announce('Detailed progress info', 'verbose');
```

#### `announceSuccess(operation: string, detail: string): Promise<void>`

Announce a successful operation.

```typescript
await accessibilityService.announceSuccess('Copy Function', 'Function copied to utils.ts');
```

#### `announceError(operation: string, error: string): Promise<void>`

Announce a failed operation (always uses 'minimal' verbosity).

```typescript
await accessibilityService.announceError('Copy Function', 'File not found');
```

#### `announceProgress(operation: string, current: number, total: number): Promise<void>`

Announce progress for long-running operations (uses 'verbose' level).

```typescript
for (let i = 0; i < files.length; i++) {
  await accessibilityService.announceProgress('Saving files', i + 1, files.length);
}
```

### Configuration Methods

#### `getConfig(): AccessibilityConfig`

Get the current accessibility configuration.

```typescript
const config = accessibilityService.getConfig();
// { verbosity: 'normal', screenReaderMode: false, keyboardNavigation: true }
```

#### `getVerbosity(): VerbosityLevel`

Get the current verbosity level.

```typescript
const level = accessibilityService.getVerbosity(); // 'normal'
```

#### `isScreenReaderEnabled(): boolean`

Check if screen reader mode is enabled.

```typescript
if (accessibilityService.isScreenReaderEnabled()) {
  // Add extra accessibility hints
}
```

### Utility Methods

#### `formatWithCount(label: string, count: number): string`

Format a label with count information for accessibility.

```typescript
accessibilityService.formatWithCount('Files', 5); // "Files (5 items)"
accessibilityService.formatWithCount('File', 1); // "File (1 item)"
```

#### `createAccessibleQuickPickItem<T>(item: T, accessibility: { ariaLabel: string; ariaDescription?: string }): T`

Create a QuickPick item with proper ARIA labeling.

```typescript
const accessibleItem = accessibilityService.createAccessibleQuickPickItem(
  { label: 'utils.ts', description: './src/utils' },
  { ariaLabel: 'utils.ts in src/utils folder', ariaDescription: 'Modified 2 minutes ago' },
);
```

## Usage Examples

### Basic Usage with DI

```typescript
import { IAccessibilityService } from '../di/interfaces/IAccessibilityService';
import { TYPES } from '../di/types';
import { getService } from '../di/container';

class MyCommand {
  private accessibilityService: IAccessibilityService;

  constructor() {
    this.accessibilityService = getService<IAccessibilityService>(TYPES.AccessibilityService);
  }

  async execute(): Promise<void> {
    try {
      // Perform operation
      await this.doWork();

      // Announce success
      await this.accessibilityService.announceSuccess('Operation', 'Completed successfully');
    } catch (error) {
      // Announce error (always shown regardless of verbosity)
      await this.accessibilityService.announceError('Operation', error.message);
    }
  }
}
```

### Progress Announcements

```typescript
async function processFiles(files: string[]): Promise<void> {
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    await processFile(files[i]);

    // Announce progress (only shown in verbose mode)
    await accessibilityService.announceProgress('Processing files', i + 1, total);
  }
}
```

### Conditional Announcements

```typescript
// Only announce in verbose mode
if (accessibilityService.shouldAnnounce('verbose')) {
  await accessibilityService.announce('Detailed debug information', 'verbose');
}
```

## Screen Reader Compatibility

The Accessibility Service supports the following screen readers:

| Screen Reader | Platform | Support Level |
| ------------- | -------- | ------------- |
| NVDA          | Windows  | Full support  |
| VoiceOver     | macOS    | Full support  |
| Orca          | Linux    | Full support  |
| JAWS          | Windows  | Basic support |
| Narrator      | Windows  | Basic support |

## Best Practices

1. **Use appropriate verbosity**: Reserve `verbose` for detailed progress information
2. **Always announce errors**: Use `announceError()` for failure cases
3. **Provide meaningful details**: Include operation context in success announcements
4. **Test with screen readers**: Verify announcements work as expected
5. **Consider verbosity settings**: Check `shouldAnnounce()` before verbose announcements

## Related Services

- [Configuration Service](/services/configurationService.html) - Manages accessibility settings
- [Logger](/architecture/dependency-injection.html) - Debug logging for accessibility

## Navigation

- [Back to Services](/services/)
- [Features Overview](/features.html)
- [Accessibility Guide](/accessibility.html)
