This file is the single source of truth for the **Additional Context Menus** VS Code extension. Update it whenever architecture, commands, or conventions change.

---

## Project Overview

- **Name:** Additional Context Menus
- **Publisher:** VijayGangatharan
- **Version:** 2.0.0
- **VS Code engine:** >=1.110.0
- **Node.js:** >=20
- **Package manager:** pnpm
- **Language:** TypeScript (strict mode)
- **Bundle tool:** esbuild (via `esbuild.config.ts`)
- **Published to:** VS Code Marketplace and Open VSX Registry

---

## Development Commands

```bash
pnpm install             # install dependencies
pnpm run build           # build extension (~1s)
pnpm run watch           # watch mode
pnpm run package         # production build
pnpm run lint            # ESLint
pnpm run lint:fix        # auto-fix lint issues
pnpm run format          # format files with Prettier
pnpm run test:activation # test activation
pnpm run publish         # publish to VS Code Marketplace
pnpm run publish:openvsx # publish to Open VSX Registry
pnpm run lint-staged     # lint staged files
```

Press **F5** in VS Code to launch the Extension Development Host.

---

## Source Structure

```
src/
  extension.ts                  # activation entry point
  managers/
    ExtensionManager.ts         # lifecycle coordinator
    ContextMenuManager.ts       # command registration & all handlers
    WalkthroughManager.ts       # first-run walkthrough
    CommandRegistry.ts
  commands/
    BaseCommandHandler.ts
    ICommandHandler.ts
    CopyFunctionCommand.ts
    SaveAllCommand.ts
    OpenInTerminalCommand.ts
  services/
    codeAnalysisService.ts      # AST-based function detection (TypeScript Compiler API)
    configurationService.ts
    fileDiscoveryService.ts
    fileSaveService.ts
    terminalService.ts
    projectDetectionService.ts
    accessibilityService.ts
    enumGeneratorService.ts     # lazy-loaded
    envFileGeneratorService.ts  # lazy-loaded
    cronJobTimerGeneratorService.ts  # lazy-loaded
    fileNamingConventionService.ts
  di/
    container.ts                # DI container (singleton pattern)
    types.ts                    # DI token constants
    interfaces/                 # all service interfaces
  types/
    config.ts
    extension.ts
    vscode.ts
  utils/
    logger.ts
    cache.ts
    accessibilityHelper.ts
    configValidator.ts
    metrics.ts
    pathValidator.ts
```

---

## Commands

### Right-Click Menu Only (hidden from Command Palette)

| Command ID                                   | Title                         | Keybinding         | File Type Restriction |
| -------------------------------------------- | ----------------------------- | ------------------ | --------------------- |
| `additionalContextMenus.copyFunction`        | Copy Function                 | `Ctrl+Alt+Shift+F` | `.ts .tsx .js .jsx`   |
| `additionalContextMenus.copyFunctionToFile`  | Copy Function to File         | `Ctrl+Alt+Shift+E` | `.ts .tsx .js .jsx`   |
| `additionalContextMenus.moveFunctionToFile`  | Move Function to File         | `Ctrl+Alt+Shift+R` | `.ts .tsx .js .jsx`   |
| `additionalContextMenus.copySelectionToFile` | Copy Selection to File        | `Ctrl+Alt+Shift+C` | `.ts .tsx .js .jsx`   |
| `additionalContextMenus.moveSelectionToFile` | Move Selection to File        | `Ctrl+Alt+Shift+M` | `.ts .tsx .js .jsx`   |
| `additionalContextMenus.generateEnum`        | Generate Enum from Union Type | —                  | `.ts .tsx`            |
| `additionalContextMenus.generateCronTimer`   | Generate Cron Expression      | —                  | -                     |

### Command Palette Accessible

| Command ID                                        | Title                      | Keybinding         |
| ------------------------------------------------- | -------------------------- | ------------------ |
| `additionalContextMenus.saveAll`                  | Save All                   | `Ctrl+Alt+Shift+A` |
| `additionalContextMenus.openInTerminal`           | Open in Terminal           | `Ctrl+Alt+Shift+T` |
| `additionalContextMenus.enable`                   | Enable                     | —                  |
| `additionalContextMenus.disable`                  | Disable                    | —                  |
| `additionalContextMenus.showOutputChannel`        | Show Output Channel        | —                  |
| `additionalContextMenus.debugContextVariables`    | Debug Context Variables    | —                  |
| `additionalContextMenus.refreshContextVariables`  | Refresh Context Variables  | —                  |
| `additionalContextMenus.checkKeybindingConflicts` | Check Keybinding Conflicts | —                  |
| `additionalContextMenus.enableKeybindings`        | Enable Keybindings         | —                  |
| `additionalContextMenus.disableKeybindings`       | Disable Keybindings        | —                  |
| `additionalContextMenus.renameFileConvention`     | Rename File to Convention  | —                  |
| `additionalContextMenus.generateEnvFile`          | Generate .env File         | —                  |
| `additionalContextMenus.openWalkthrough`          | Open Walkthrough           | —                  |

---

## Key Design Decisions

### Copy Function / Copy Function to File / Move Function to File

- Only works on `.ts`, `.tsx`, `.js`, `.jsx` files — enforced in both `package.json` `when` clauses (keybindings + context menu) and at runtime via `isSupportedFileType()` in `ContextMenuManager`
- Uses `codeAnalysisService.findFunctionAtPosition()` for AST-based detection
- **Copy Function to File** and **Move Function to File** insert only the raw function text — no import copying. Uses `insertFunctionIntoFile()` (smart insertion point: after imports, before exports)
- **Copy Selection to File** and **Move Selection to File** do copy imports (merge strategy configurable via settings)

### Copy Selection to File / Move Selection to File

- Previously named `copyContentToFile` / `moveContentToFile` — renamed in v2.1.0 (breaking change)
- Old command IDs no longer exist

### Function Detection (`codeAnalysisService.ts`)

- `findFunctionNodeContainingPosition`: for `VariableStatement` nodes (e.g. `const foo = () => {}`), extracts the inner `ArrowFunction`/`FunctionExpression` initializer — never casts `VariableStatement` to `FunctionLike`
- `extractFunctionInfo`: when the node's parent chain is `VariableDeclaration → VariableDeclarationList → VariableStatement`, uses the `VariableStatement` as the text boundary to capture the full `const foo = () => {}` declaration
- `getFunctionName`: reads name from `node.parent` (`VariableDeclaration`) for arrow/function expressions

### Lazy Loading

- `enumGeneratorService`, `envFileGeneratorService`, `cronJobTimerGeneratorService` are loaded at runtime from `dist/lazy/` via `require()` — not bundled in the core bundle

### Context Variable

- `additionalContextMenus.isInFunction` — set on every cursor move; controls visibility of Copy/Move Function to File in the context menu

---

## Walkthrough Steps

Walkthrough ID: `additionalContextMenus.gettingStarted`
Markdown files live in `walkthrough/`.

| Step ID                     | Title                         | Markdown file               |
| --------------------------- | ----------------------------- | --------------------------- |
| `step.copyFunction`         | Copy a Function               | `copy-function.md`          |
| `step.copyFunctionToFile`   | Copy Function to File         | `copy-function-to-file.md`  |
| `step.moveFunctionToFile`   | Move Function to File         | `move-function-to-file.md`  |
| `step.copySelectionToFile`  | Copy Selection to File        | `copy-selection-to-file.md` |
| `step.moveSelectionToFile`  | Move Selection to File        | `move-selection-to-file.md` |
| `step.saveAll`              | Save All Files                | `save-all.md`               |
| `step.openInTerminal`       | Open in Terminal              | `open-in-terminal.md`       |
| `step.generateEnum`         | Generate Enum from Union Type | `generate-enum.md`          |
| `step.generateCronTimer`    | Generate Cron Expression      | `generate-cron.md`          |
| `step.renameFileConvention` | Rename File to Convention     | `rename-file-convention.md` |
| `step.generateEnvFile`      | Generate .env File            | `generate-env-file.md`      |

---

## Settings Reference

| Key                                                       | Type    | Default                       | Description                                                 |
| --------------------------------------------------------- | ------- | ----------------------------- | ----------------------------------------------------------- |
| `additionalContextMenus.enabled`                          | boolean | `true`                        | Enable/disable the extension                                |
| `additionalContextMenus.autoDetectProjects`               | boolean | `true`                        | Auto-detect frameworks                                      |
| `additionalContextMenus.supportedExtensions`              | array   | `[".ts",".tsx",".js",".jsx"]` | File extensions for context menus                           |
| `additionalContextMenus.copyCode.insertionPoint`          | enum    | `"smart"`                     | `smart` / `end` / `beginning`                               |
| `additionalContextMenus.copyCode.handleImports`           | enum    | `"merge"`                     | `merge` / `duplicate` / `skip`                              |
| `additionalContextMenus.copyCode.preserveComments`        | boolean | `true`                        | Preserve comments when copying                              |
| `additionalContextMenus.saveAll.showNotification`         | boolean | `true`                        | Show notification after Save All                            |
| `additionalContextMenus.saveAll.skipReadOnly`             | boolean | `true`                        | Skip read-only files                                        |
| `additionalContextMenus.terminal.type`                    | enum    | `"integrated"`                | `integrated` / `external` / `system-default`                |
| `additionalContextMenus.terminal.externalTerminalCommand` | string  | `""`                          | Custom terminal command (use `{{directory}}`)               |
| `additionalContextMenus.terminal.openBehavior`            | enum    | `"parent-directory"`          | `parent-directory` / `workspace-root` / `current-directory` |
| `additionalContextMenus.accessibility.verbosity`          | enum    | `"normal"`                    | `minimal` / `normal` / `verbose`                            |
| `additionalContextMenus.accessibility.screenReaderMode`   | boolean | `false`                       | Enhanced screen reader support                              |
| `additionalContextMenus.accessibility.keyboardNavigation` | boolean | `true`                        | Show keyboard hints in Quick Pick                           |
