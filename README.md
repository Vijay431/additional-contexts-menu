# Additional Context Menus

Enhanced right-click context menus for Node.js projects with first-class support for React, Angular, Express, Next.js, TypeScript, and JavaScript workflows.

**Available on both VS Code Marketplace and Open VSX Registry** - ensuring compatibility with VS Code, VSCodium, Gitpod, Eclipse Theia, and other VS Code-compatible editors.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VijayGangatharan.additional-context-menus?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus)
[![Open VSX Registry](https://img.shields.io/open-vsx/v/VijayGangatharan/additional-context-menus?label=Open%20VSX)](https://open-vsx.org/extension/VijayGangatharan/additional-context-menus)
[![CI](https://github.com/Vijay431/additional-contexts-menu/actions/workflows/ci.yml/badge.svg)](https://github.com/Vijay431/additional-contexts-menu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

---

## Why This Project Exists

**Additional Context Menus** brings common refactoring, code sharing, and workspace automation tasks directly into the VS Code editor context menu. The extension is now a community-driven project stewarded by the original author, with contributions welcomed via collaborative governance.

---

## Feature Highlights

- **Copy Function** – Detects functions, React components, and hooks with automatic import handling.
- **Copy / Move Selection** – Transfers code between files with configurable insertion points and comment preservation.
- **Save All** – Bulk save with progress reporting and read-only detection.
- **Open in Terminal** – Cross-platform terminal integration with configurable directory behavior.
- **Project Intelligence** – Auto-detects React, Angular, Express, Next.js, and generic Node.js projects to reveal the right menus.

See [`docs/features.md`](docs/features.md) for detailed scenarios and upcoming enhancements.

---

## Installation

### VS Code (Microsoft)

**From VS Code Marketplace:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Additional Context Menus"
4. Click Install

**Command Line:**
```bash
code --install-extension VijayGangatharan.additional-context-menus
```

### VSCodium Users

**From Open VSX Registry:**
1. Open VSCodium
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Additional Context Menus"
4. Click Install (extension will be installed from Open VSX Registry)

**Command Line:**
```bash
codium --install-extension VijayGangatharan.additional-context-menus
```

### Gitpod Users

**Workspace Configuration:**
Add to your `.gitpod.yml`:
```yaml
vscode:
  extensions:
    - VijayGangatharan.additional-context-menus
```

**Manual Installation:**
1. Open your Gitpod workspace
2. Go to Extensions panel
3. Search for "Additional Context Menus"
4. Click Install (automatically uses Open VSX Registry)

### Eclipse Theia Users

**From Extensions Panel:**
1. Open Eclipse Theia
2. Navigate to Extensions view
3. Search for "Additional Context Menus"
4. Click Install (extension will be installed from Open VSX Registry)

**Note:** Eclipse Theia automatically uses the Open VSX Registry for extension installation.

## Quick Start

1. Open a Node.js project containing `package.json`.
2. Right-click inside a `.ts`, `.tsx`, `.js`, or `.jsx` file.
3. Explore the Additional Context Menus group (Copy Function, Copy Lines to File, Move Lines to File, Save All, Open in Terminal).

Configuration options live under **Settings → Additional Context Menus**. Refer to [`docs/installation.md`](docs/installation.md) for screens and recommendations.

---

## Commands Reference

The extension provides seven commands to enhance your development workflow:

- **Copy Function** – Extract functions, components, or methods to the clipboard
- **Copy Lines to File** – Duplicate selected code to another file with smart insertion
- **Move Lines to File** – Transfer code between files (copy + delete from source)
- **Save All** – Bulk save all modified files with progress reporting
- **Open in Terminal** – Launch a terminal in your file's directory
- **Enable/Disable Extension** – Toggle the extension's context menu visibility

For complete documentation including command availability, configuration options, and usage examples, see **[COMMANDS.md](COMMANDS.md)**.

---

## Community Governance

- **Maintainer:** [@Vijay431](https://github.com/Vijay431)
- **Stewards:** Active contributors acknowledged in release notes and contributor stats
- **Decisions:** Proposals are discussed through issues or discussions, accepted via consensus, and documented in the changelog.
- **Communication:**
  - Issues → bugs, security follow-ups, and feature requests
  - Discussions → ideas, help requests, roadmap debates
  - Security reports → [vijayanand431+security@gmail.com](mailto:vijayanand431+security@gmail.com)

Contributions of all kinds are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) before participating.

---

## Development Tooling

- **Node.js:** 16 ≤ version < 25 (18+ recommended)
- **Lint & Formatting:** [Biome](https://biomejs.dev/) powers both linting and formatting.
- **Type Checking:** TypeScript strict mode via `tsc`.
- **Testing:** Mocha + @vscode/test-electron (see [`test/`](test)).

### Commands

| Script | Purpose |
| ------ | ------- |
| `npm run build` | Bundle the extension using esbuild |
| `npm run watch` | Start the development watch mode |
| `npm run lint` | Run Biome lint checks |
| `npm run lint:fix` | Apply Biome lint and formatting fixes |
| `npm run format` | Format the repository with Biome |
| `npm run format:check` | Verify formatting without writing changes |
| `npm run typecheck` | Run TypeScript in `--noEmit` mode |
| `npm test` | Build minimal extension, run tests via VS Code runner |
| `npm run test:full` | Execute the full VS Code test suite |

Workspace recommendations include the Biome VS Code extension; see [`.vscode/extensions.json`](.vscode/extensions.json).

---

## Contributing Workflow

1. **Discuss:** Open an issue or discussion to scope the change if unsure.
2. **Branch:** Use `feature/<topic>` or `fix/<issue>` naming.
3. **Implement:** Follow the service-oriented architecture laid out in [`CLAUDE.md`](CLAUDE.md).
4. **Quality Gates:**
   ```bash
   npm ci
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   ```
5. **Document:** Update README/docs/changelog if behavior or tooling changes.
6. **Pull Request:** Fill in the PR template, include screenshots/logs as needed, and request review from CODEOWNERS.

Biome replaces ESLint + Prettier; please remove residual ESLint directives when touching files.

---

## Security

Report vulnerabilities privately to [vijayanand431+security@gmail.com](mailto:vijayanand431+security@gmail.com). We respond within two business days. Supported release lines are documented in [`SECURITY.md`](SECURITY.md).

---

## License

Released under the [MIT License](LICENSE). By contributing, you agree that your contributions are licensed under MIT while retaining authorship credit.
