This file is the single source of truth for the **Additional Context Menus** VS Code extension. Update it whenever architecture, commands, or conventions change.

---

## Project Overview

- **Name:** Additional Context Menus
- **Publisher:** VijayGangatharan
- **Version:** 2.0.1
- **VS Code engine:** >=1.110.0
- **Node.js:** >=20
- **Package manager:** pnpm
- **Language:** TypeScript (strict mode)
- **Bundle tool:** esbuild (via `esbuild.config.ts`)
- **Published to:** VS Code Marketplace and Open VSX Registry

---

## Development Commands

```bash
pnpm install              # install dependencies
pnpm run build            # build extension (~1s)
pnpm run watch            # watch mode
pnpm run package          # production build
pnpm run lint             # ESLint
pnpm run lint:fix         # auto-fix lint issues
pnpm run format           # format files with Prettier
pnpm run test:unit        # run unit tests (Vitest)
pnpm run test:integration # run integration tests (Mocha + VS Code)
pnpm run publish          # publish to VS Code Marketplace
pnpm run publish:openvsx  # publish to Open VSX Registry
pnpm run lint-staged      # lint staged files
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
docs/                           # VS Code walkthrough markdown files
site/                           # Jekyll GitHub Pages site (vijay431.github.io/additional-context-menus)
test/
  __mocks__/vscode.ts           # minimal vscode mock for Vitest unit tests
  unit/                         # Vitest unit tests (infrastructure, no VS Code API)
  suite/                        # Mocha integration tests (feature-level, live VS Code)
  fixtures/                     # test fixture files (sample.ts, package.json files)
  runTests.ts                   # @vscode/test-electron launcher
vitest.config.ts                # Vitest config (aliases vscode to mock)
tsconfig.test.json              # TypeScript config for compiling integration tests
```

### GitHub Pages site (`site/`)

- **Styles:** [`site/assets/css/main.css`](site/assets/css/main.css) (global layout, design tokens, `prefers-color-scheme: dark`, responsive nav), [`site/assets/css/pages.css`](site/assets/css/pages.css) (page-specific grids/cards, installation/download/docs grids, **`code-operations.md`** operation/example/workflow/best-practices blocks).
- **Scripts:** [`site/assets/js/main.js`](site/assets/js/main.js) — mobile nav, scroll reveal, code-block copy buttons, tabs. Exposes `window.AdditionalContextMenusSite` (legacy alias `window.FileInsights`).
- **Documentation page:** [`site/documentation.md`](site/documentation.md) Commands API uses `.commands-api` … `.command-item` markup; styles are scoped under `.commands-api` in [`site/assets/css/pages.css`](site/assets/css/pages.css) so generic class names do not affect e.g. installation’s `.command-list` UL wrapper.
- **Layout:** [`site/_layouts/default.html`](site/_layouts/default.html). Markdown-only pages (e.g. `developer.md`) get a readable column via `.main-content > :not(section)`; section-based marketing pages stay full width with inner `.container`.

---

## Services

### User-Facing Features (11)

These are the commands users interact with. Each has a walkthrough doc in `docs/` and a site service doc in `site/services/`.

| Feature                   | Command ID                                    | `docs/` file                | `site/services/` doc              |
| ------------------------- | --------------------------------------------- | --------------------------- | --------------------------------- |
| Copy Function             | `additionalContextMenus.copyFunction`         | `copy-function.md`          | `copyFunction.md`                 |
| Copy Function to File     | `additionalContextMenus.copyFunctionToFile`   | `copy-function-to-file.md`  | `copyFunctionToFile.md`           |
| Move Function to File     | `additionalContextMenus.moveFunctionToFile`   | `move-function-to-file.md`  | `moveFunctionToFile.md`           |
| Copy Selection to File    | `additionalContextMenus.copySelectionToFile`  | `copy-selection-to-file.md` | `copySelectionToFile.md`          |
| Move Selection to File    | `additionalContextMenus.moveSelectionToFile`  | `move-selection-to-file.md` | `moveSelectionToFile.md`          |
| Save All                  | `additionalContextMenus.saveAll`              | `save-all.md`               | `fileSaveService.md`              |
| Open in Terminal          | `additionalContextMenus.openInTerminal`       | `open-in-terminal.md`       | `terminalService.md`              |
| Rename File to Convention | `additionalContextMenus.renameFileConvention` | `rename-file-convention.md` | `fileNamingConventionService.md`  |
| Generate Enum             | `additionalContextMenus.generateEnum`         | `generate-enum.md`          | `enumGeneratorService.md`         |
| Generate Cron Expression  | `additionalContextMenus.generateCronTimer`    | `generate-cron.md`          | `cronJobTimerGeneratorService.md` |
| Generate .env File        | `additionalContextMenus.generateEnvFile`      | `generate-env-file.md`      | `envFileGeneratorService.md`      |

### Infrastructure Services (5)

These power the features internally. They have **no standalone user-facing docs** — do not create `site/services/` pages for them.

| Service                 | Source File                               | Purpose                                                  |
| ----------------------- | ----------------------------------------- | -------------------------------------------------------- |
| CodeAnalysisService     | `src/services/codeAnalysisService.ts`     | AST-based function detection via TypeScript Compiler API |
| FileDiscoveryService    | `src/services/fileDiscoveryService.ts`    | Workspace file scanning and compatible-file filtering    |
| ConfigurationService    | `src/services/configurationService.ts`    | VS Code settings access and change events                |
| ProjectDetectionService | `src/services/projectDetectionService.ts` | Framework detection and context variable updates         |
| AccessibilityService    | `src/services/accessibilityService.ts`    | Screen reader announcements and ARIA helpers             |

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

- Previously named `copyContentToFile` / `moveContentToFile` — renamed in v2.0.0 (breaking change)
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
Markdown files live in `docs/` (root-level, not the Jekyll site).

| Step ID                     | Title                     | Markdown file               |
| --------------------------- | ------------------------- | --------------------------- |
| `step.copyFunction`         | Copy a Function           | `copy-function.md`          |
| `step.copyFunctionToFile`   | Copy Function to File     | `copy-function-to-file.md`  |
| `step.moveFunctionToFile`   | Move Function to File     | `move-function-to-file.md`  |
| `step.copySelectionToFile`  | Copy Selection to File    | `copy-selection-to-file.md` |
| `step.moveSelectionToFile`  | Move Selection to File    | `move-selection-to-file.md` |
| `step.saveAll`              | Save All Files            | `save-all.md`               |
| `step.openInTerminal`       | Open in Terminal          | `open-in-terminal.md`       |
| `step.renameFileConvention` | Rename File to Convention | `rename-file-convention.md` |

---

## Settings Reference

| Key                                                       | Type    | Default                       | Description                                                 |
| --------------------------------------------------------- | ------- | ----------------------------- | ----------------------------------------------------------- |
| `additionalContextMenus.enabled`                          | boolean | `true`                        | Enable/disable the extension                                |
| `additionalContextMenus.autoDetectProjects`               | boolean | `true`                        | Auto-detect frameworks                                      |
| `additionalContextMenus.supportedExtensions`              | array   | `[".ts",".tsx",".js",".jsx"]` | File extensions for context menus                           |
| `additionalContextMenus.copyCode.insertionPoint`          | enum    | `"smart"`                     | `smart` / `end` / `beginning`                               |
| `additionalContextMenus.copyCode.preserveComments`        | boolean | `true`                        | Preserve comments when copying                              |
| `additionalContextMenus.saveAll.showNotification`         | boolean | `true`                        | Show notification after Save All                            |
| `additionalContextMenus.saveAll.skipReadOnly`             | boolean | `true`                        | Skip read-only files                                        |
| `additionalContextMenus.terminal.type`                    | enum    | `"integrated"`                | `integrated` / `external` / `system-default`                |
| `additionalContextMenus.terminal.externalTerminalCommand` | string  | `""`                          | Custom terminal command (use `{{directory}}`)               |
| `additionalContextMenus.terminal.openBehavior`            | enum    | `"parent-directory"`          | `parent-directory` / `workspace-root` / `current-directory` |
| `additionalContextMenus.accessibility.verbosity`          | enum    | `"normal"`                    | `minimal` / `normal` / `verbose`                            |
| `additionalContextMenus.accessibility.screenReaderMode`   | boolean | `false`                       | Enhanced screen reader support                              |
| `additionalContextMenus.accessibility.keyboardNavigation` | boolean | `true`                        | Show keyboard hints in Quick Pick                           |

## Release & Versioning Strategy

### Version Line Convention (VS Code Marketplace)

VS Code Marketplace uses minor parity to distinguish stable from pre-release:

| Minor | Line        | Example tags                   | Publishes as   |
| ----- | ----------- | ------------------------------ | -------------- |
| Even  | Stable      | `v2.0.0`, `v2.2.0`, `v2.2.1`   | Stable release |
| Odd   | Pre-release | `v2.1.0-beta.1`, `v2.1.0-rc.1` | Pre-release    |

**Current lines:**

- `2.0.x` — stable (current unreleased)
- `2.1.x` — pre-release line (next, after `2.0.0` ships)
- `2.2.x` — next stable line (after pre-release graduates)

### How CI Detects Pre-release

The `setup` job checks the tag for `-rc`, `-next`, `-beta`, or `-alpha`:

```bash
if echo "$VERSION" | grep -qE '\-(rc|next|beta|alpha)'; then
  echo "is_prerelease=true"
fi
```

- Pre-release tags → both marketplaces publish with `--pre-release`; `deploy-pages` is skipped
- Stable tags → both marketplaces publish as stable; `deploy-pages` runs and GitHub Pages is updated

### Release Checklist

**Stable release (`v2.0.1`):**

1. Ensure `package.json` version is `2.0.1`
2. Push tag: `git tag v2.0.1 && git push origin v2.0.1`
3. CI publishes to VS Code Marketplace + Open VSX, deploys GitHub Pages, creates GitHub Release

**Pre-release (`v2.1.0-beta.1`):**

1. Bump `package.json` version to `2.1.0`
2. Push tag: `git tag v2.1.0-beta.1 && git push origin v2.1.0-beta.1`
3. CI publishes with `--pre-release` to both marketplaces; GitHub Pages is NOT updated

**Graduating pre-release to stable (`v2.2.0`):**

1. Bump `package.json` version to `2.2.0`
2. Push tag: `git tag v2.2.0 && git push origin v2.2.0`

---

## Steps to follow:

- All new changes should be added to the `CLAUDE.md` file
- All new changes that user viewable should be added to the `docs`, `site` and `README.md` files
- All new changes should be logged in the `CHANGELOG.md` file under unreleased section

## Test Conventions:

- **Unit tests** (`test/unit/`, run with `pnpm run test:unit`): infrastructure utilities and services where VS Code API is mocked. No live VS Code instance required.
- **Integration tests** (`test/suite/`, run with `pnpm run test:unit:integration`): feature-level tests that exercise the 11 user-facing commands end-to-end in a real VS Code Extension Development Host.
- Never add VS Code API-dependent logic to unit tests; never add pure-logic tests to the integration suite.
- On Linux CI, integration tests run under `xvfb-run -a`.
- All test descriptions must start with `"should "` (e.g. `it('should detect React', ...)`).
