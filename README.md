# Additional Context Menus

Enhanced right-click context menus for Node.js development with file management, project detection, and code generation capabilities.

## Why This Project Exists

**Additional Context Menus** provides essential file management, project detection, and code generation services directly in VS Code's context menu. The extension is streamlined to focus on core productivity features that matter most to developers.

## Feature Highlights

- **Bulk File Renamer** – Rename multiple files at once while automatically updating import statements across your codebase
- **File Naming Convention** – Validate and convert file names to kebab-case, camelCase, or PascalCase conventions
- **File Save Operations** – Bulk save all unsaved files with progress tracking
- **Project Detection** – Auto-detects React, Angular, Express, Next.js, Svelte, Vue, and generic Node.js projects
- **Enum Generator** – Generate TypeScript enums from string literal union types
- **Environment File Generator** – Generate .env files from .env.example templates
- **Gitignore Generator** – Create .gitignore files with common patterns (Node.js, IDE, OS, etc.)

## Installation

### VS Code (Microsoft)

**From VS Code Marketplace:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Additional Context Menus"
4. Click Install

### VSCodium Users

**From Open VSX Registry:**
1. Open VSCodium
2. Go to Extensions
3. Search for "Additional Context Menus"
4. Click Install (extension will be installed from Open VSX Registry)

### Gitpod Users

**Workspace Configuration:**
Add to your `.gitpod.yml`:
```yaml
vscode:
  extensions:
    - VijayGangatharan.additional-context-menus
```

## Quick Start

1. Open a Node.js project containing `package.json`.
2. Right-click inside a `.ts`, `.tsx`, `.js`, or `.jsx` file.
3. Explore Additional Context Menus group.

Configuration options live under **Settings → Additional Context Menus**.

## Commands Reference

The extension provides eight main commands to enhance your development workflow:

- **Bulk Rename Files** – Prompts for file rename operations and executes bulk rename with import updates
- **Validate File Name Convention** – Checks if current file name follows selected naming convention
- **Rename File to Convention** – Renames file to match selected naming convention
- **Save All** – Saves all unsaved editor files with progress notifications
- **Open in Terminal** – Opens integrated terminal at current file location
- **Generate Enum from Type** – Generates TypeScript enum from selected string literal union type
- **Generate .env File** – Creates environment file from .env.example template
- **Generate .gitignore** – Creates or updates .gitignore with common patterns

## Development Status

- **Total Services**: 10 (7 business services + 3 support services)
- **Active Services**: All services are actively maintained and tested
- **Last Major Update**: Simplified extension from 75+ services to 10 focused services

## License

MIT

---

**[Back to Top](#)**
