# .gitignore Reorganization Review

## Current Structure

- 53 lines
- No categorization
- Mixed file types and directories

## Proposed Structure with Categories

```gitignore
# ============================================
# Build & Distribution Artifacts
# ============================================
*.vsix
dist/
out/

# ============================================
# Dependencies
# ============================================
node_modules/
.pnpm-debug.log*

# ============================================
# Testing & Coverage
# ============================================
.vscode-test/
.vscode-test-web/
coverage/

# ============================================
# Compiled Files
# ============================================
src/**/*.js
src/**/*.js.map
test/**/*.js
test/**/*.js.map
*.map

# ============================================
# Debug & Logs
# ============================================
debug.log
meta.json

# ============================================
# OS Generated Files
# ============================================
.DS_Store
Thumbs.db

# ============================================
# AI & Tool Configuration
# ============================================
.claude/
.auto-claude/
.auto-claude-security.json
.claude_settings.json
.specify/
specs/
.mcp.json

# ============================================
# Documentation & Content
# ============================================
blogs/
docs/
CLAUDE.md
CHANGELOG_RELEASE.md
TODO.md

# ============================================
# Development Tools
# ============================================
opencode.json
.automaker/
.worktrees/
logs/security/
```

## Category Descriptions

### Build & Distribution (3 entries)

- `.vsix` - VS Code extension package
- `dist/`, `out/` - Compiled output directories
- **Why:** Generated files, never commit

### Dependencies (2 entries)

- `node_modules/` - npm/pnpm dependencies
- `.pnpm-debug.log*` - pnpm debug logs
- **Why:** Too large, installed by package manager

### Testing & Coverage (3 entries)

- `.vscode-test/`, `.vscode-test-web/` - VS Code test environments
- `coverage/` - Code coverage reports
- **Why:** Generated during testing, not source code

### Compiled Files (5 entries)

- `src/**/*.js`, `src/**/*.js.map` - TypeScript compilation output
- `test/**/*.js`, `test/**/*.js.map` - Test compilation output
- `*.map` - Source maps (catch-all)
- **Why:** Prevent committing compiled files in source directories

### Debug & Logs (2 entries)

- `debug.log` - Debug output
- `meta.json` - Build metadata
- **Why:** Temporary files, not source code

### OS Generated Files (2 entries)

- `.DS_Store` - macOS Finder metadata
- `Thumbs.db` - Windows thumbnail cache
- **Why:** System-specific, not relevant to code

### AI & Tool Configuration (6 entries)

- `.claude/`, `.auto-claude/` - Claude AI workspace
- `.claude_settings.json` - Claude settings
- `.specify/`, `specs/` - Specification tool files
- `.mcp.json` - MCP configuration
- **Why:** Tool-specific, personal workspace

### Documentation & Content (5 entries)

- `blogs/`, `docs/` - External documentation
- `CLAUDE.md`, `CHANGELOG_RELEASE.md`, `TODO.md` - Draft docs
- **Why:** These should be in repository (or external), not ignored
- **NOTE:** Consider removing this category or specific items

### Development Tools (4 entries)

- `opencode.json` - OpenCode tool config
- `.automaker/`, `.worktrees/` - Git worktrees, automaker
- `logs/security/` - Security logs
- **Why:** Tool-specific, not source code

## Comparison: Before vs After

### Before (random order)

```
*.vsix
.vscode-test
.vscode-test-web
coverage
dist
node_modules
out
.pnpm-debug.log*
blogs
.specify
specs
.mcp.json
src/**/*.js
...
```

### After (categorized)

```
# Build & Distribution Artifacts
*.vsix
dist/
out/

# Dependencies
node_modules/
.pnpm-debug.log*

# Testing & Coverage
.vscode-test/
...
```

## Benefits

1. **Clarity** - Easy to understand what's ignored and why
2. **Maintainability** - Easy to add new entries to correct category
3. **Documentation** - Comments explain purpose of each group
4. **Reviewability** - Changes easier to review with context
5. **Onboarding** - New contributors understand structure faster

## Migration Path

1. Replace .gitignore with new version
2. Run `git status` to verify no untracked issues
3. If needed, manually remove files that should be ignored
4. Commit change

## Risk Assessment

**Zero Risk:**

- Same entries, just reorganized
- No new ignores added
- No existing ignores removed
- Comments only

## Questions

1. Should `CLAUDE.md`, `CHANGELOG_RELEASE.md`, `TODO.md` be ignored or committed?
   - Current: ignored
   - Recommendation: Commit these if they're useful documentation

2. Should `blogs/` and `docs/` be ignored?
   - Current: ignored
   - Recommendation: Commit docs, keep blogs ignored

3. Any other categories to add or merge?
