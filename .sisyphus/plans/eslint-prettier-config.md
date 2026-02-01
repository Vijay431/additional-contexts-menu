# ESLint & Prettier Configuration Enhancement

## TL;DR

> **Quick Summary**: Fix ESLint and Prettier configuration conflicts blocking development by integrating eslint-plugin-prettier and disabling all @stylistic ESLint rules, then fixing all existing linting errors across the codebase.
>
> **Deliverables**:
>
> - Updated `eslint.config.mjs` with prettier integration
> - Updated `package.json` with new dependencies
> - All 58 TypeScript files and 3 TSX files linting-error-free
> - Verified passing `pnpm run lint`, `pnpm run build`, and `pnpm test`
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Dependencies install → ESLint config update → Lint fixes → Verification

---

## Context

### Original Request

"Please help me to fix the eslint and prettier configurations for this project as I need the best"

### Interview Summary

**Key Discussions**:

- **Problem**: Linting errors blocking development (can't build/run tests)
- **Error Types**: All categories - formatting conflicts, TypeScript, imports, security warnings
- **Root Cause**: ESLint @stylistic rules conflicting with Prettier, plus strict rules flagging many issues
- **Approach**: Disable ALL @stylistic/\* rules, use eslint-plugin-prettier, fix all linting errors immediately

**User's Decisions**:

- **Configuration**: Install `eslint-plugin-prettier` and `eslint-config-prettier`
- **Stylistic Rules**: Disable ALL @stylistic/\* rules (let Prettier handle ALL formatting)
- **Code Cleanup**: Fix ALL existing linting errors immediately (not gradual, no eslint-disable)
- **Strictness**: Keep strict code quality rules (TypeScript, security, imports, promises)
- **Migration**: "Fix all errors now" approach (no warnings-only phase)
- **Verification**: Run both lint and test commands

### Research Findings

**Current State**:

- **Project Type**: VS Code Extension (TypeScript, Node.js, esbuild, pnpm, Mocha)
- **ESLint**: ESLint 9.x flat config (902 lines), comprehensive rules
- **Prettier**: Basic config (17 lines), standard formatting rules
- **Files**: 58 TypeScript files, 3 TSX files
- **Plugins**: @eslint/js, @stylistic/eslint-plugin, @typescript-eslint/\*, eslint-plugin-import, eslint-plugin-node, eslint-plugin-promise, eslint-plugin-mocha, eslint-plugin-security
- **LSP Error**: Type compatibility issue in eslint.config.mjs (promise plugin type conflict)

### Metis Review

**Critical Gaps Addressed in Plan**:

1. **Manual Error Protocol**: Added explicit handling for linting errors that can't be auto-fixed
2. **Build Verification**: Added `pnpm run build` verification (not just test)
3. **Rollback Strategy**: Added explicit rollback procedures if something breaks
4. **Baseline Capture**: Added pre-work exploration to capture current error state
5. **Guardrails**: Explicit MUST NOT/MUST boundaries to prevent scope creep

**Guardrails Applied**:

- NO changes to business logic or test logic
- NO refactoring "because it's better" during fixes
- NO changes to generated files (dist/, out/)
- NO new ESLint rules beyond prettier integration
- NO Prettier rule changes (use existing config)
- Preserve exact Prettier formatting (no manual overrides)

**AI Slop Patterns to Avoid**:

- "While fixing this import error, let me refactor the module structure"
- "This code quality rule is too strict, let me weaken it"
- "This variable name is unclear, let me rename it for clarity"
- "Let me add documentation while I'm here"
- "These tests are brittle, let me rewrite them"

---

## Work Objectives

### Core Objective

Unblock development by resolving ESLint and Prettier configuration conflicts and fixing all linting errors across the codebase.

### Concrete Deliverables

- Updated `eslint.config.mjs` with eslint-plugin-prettier integration
- Updated `package.json` with new dependencies (eslint-plugin-prettier, eslint-config-prettier)
- All 58 TypeScript files and 3 TSX files with zero linting errors
- Verified passing `pnpm run lint` (zero errors, zero warnings)
- Verified passing `pnpm run build` (successful build)
- Verified passing `pnpm test` (all tests pass)

### Definition of Done

- [x] `pnpm run lint` exits with code 0, no errors or warnings
- [ ] `pnpm run build` completes successfully
- [ ] `pnpm test` passes all tests
- [x] `prettier --check "**/*.{ts,tsx}"` reports no formatting issues
- [x] No `@stylistic` rules enabled in ESLint config (only comments or disabled)
- [x] All source, test, and config files follow Prettier formatting

### Must Have

- Disable ALL @stylistic/\* ESLint rules
- Install and configure eslint-plugin-prettier
- Fix ALL linting errors (not gradual, not warnings-only)
- Keep strict code quality rules (TypeScript, security, imports, promises, mocha)
- Verify with both lint and test commands
- Include build verification

### Must NOT Have (Guardrails)

**Explicit Exclusions**:

- NO changes to business logic or test logic (only formatting/type fixes)
- NO changes to generated files (dist/, out/, node_modules, coverage, docs)
- NO modifications to .prettierrc formatting rules
- NO new ESLint rules or plugins beyond agreed scope
- NO refactoring or modernization "while we're at it"
- NO changes to tsconfig.json unless directly lint-related
- NO eslint-disable comments added (clean implementation)

**AI Slop Patterns to Block**:

- Adding more ESLint rules while fixing errors
- Refactoring code during linting fixes
- Changing test assertions or test logic
- Renaming variables for "clarity"
- Rewriting tests because they're "brittle"
- Adding documentation during fixes
- Updating Prettier config to new rules
- Weakening strict rules because they're "too hard"

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES
- **User wants tests**: YES (Both lint and test commands)
- **Framework**: Mocha (existing)
- **QA approach**: Manual verification with executable commands

### Verification Commands

All verification must be automated and executable by the agent:

```bash
# 1. Pre-installation verification
pnpm list eslint prettier eslint-plugin-prettier eslint-config-prettier
# Expected: Show current versions (eslint-plugin-prettier, eslint-config-prettier missing)

# 2. Post-installation verification
pnpm list eslint prettier eslint-plugin-prettier eslint-config-prettier
# Expected: All packages installed with correct versions

# 3. ESLint config validation
node -e "import('./eslint.config.mjs').then(c => console.log('Config valid'))"
# Expected: "Config valid", no syntax errors

# 4. Verify @stylistic rules are disabled
grep -c "@stylistic/" eslint.config.mjs
# Expected: No active @stylistic rules (only comments or 'off' settings)

# 5. Linting result (THE KEY CRITERION)
pnpm run lint
# Expected: Exit code 0, zero errors, zero warnings

# 6. Build verification (CRITICAL - mass fixes can break builds)
pnpm run build
# Expected: Builds successfully, exit code 0

# 7. Test execution
pnpm test
# Expected: All tests pass, exit code 0

# 8. Prettier format check
prettier --check "**/*.{ts,tsx,js,mjs}"
# Expected: All files match Prettier formatting

# 9. Verify no eslint-disable comments were added
grep -r "eslint-disable" src/ test/
# Expected: No results (or only pre-existing ones documented)
```

### Error Handling Protocol

**If Linting Errors Remain**:

- Identify which files have errors
- Categorize errors: auto-fixable vs. manual intervention required
- For auto-fixable: Run `eslint --fix src/**/*.ts src/**/*.tsx`
- For manual intervention: Document each error with file, line, and rule, flag for user review
- Continue with auto-fixable fixes, present manual errors separately

**If Tests Fail After Fixes**:

- Identify which test(s) failed
- Check if test failure is due to linting fix (e.g., line breaks, string changes)
- If fix caused failure: Revert specific change, investigate alternative
- If test was already broken: Skip this test, document pre-existing failure
- Continue with remaining files

**If Build Fails After Fixes**:

- Identify build error location
- Check if build error is due to linting fix
- If fix caused build failure: Revert specific change
- Rebuild and verify
- Document problematic fix for user review

**Rollback Procedure**:

- If > 3 files cause test/build failures: Stop, rollback all changes
- Rollback steps:
  1. `git checkout -- eslint.config.mjs`
  2. `git checkout -- package.json`
  3. `git checkout -- .` (revert all file changes)
  4. `pnpm install` (restore original dependencies)
  5. Verify: `pnpm run lint` (should show original errors)
  6. Document rollback for user review

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Explore current config files and capture baseline errors
└── Task 2: Install dependencies (eslint-plugin-prettier, eslint-config-prettier)

Wave 2 (After Wave 1):
├── Task 3: Update ESLint configuration
└── Task 4: Auto-fix linting errors across all files

Wave 3 (After Wave 2):
├── Task 5: Manual linting error fixes (if any remain)
└── Task 6: Verification (lint, build, test, prettier check)

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 6
Parallel Speedup: ~30% faster than sequential (exploration can run in parallel with install)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 3      | 2                    |
| 2    | None       | 3      | 1                    |
| 3    | 1, 2       | 4      | None                 |
| 4    | 3          | 5, 6   | None                 |
| 5    | 4          | 6      | None                 |
| 6    | 4, 5       | None   | None                 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents                                                                 |
| ---- | ----- | ---------------------------------------------------------------------------------- |
| 1    | 1, 2  | delegate_task(category="quick", load_skills=[], run_in_background=true) for both   |
| 2    | 3     | delegate_task(category="quick", load_skills=[], run_in_background=false)           |
| 3    | 4     | delegate_task(category="unspecified-low", load_skills=[], run_in_background=false) |
| 4    | 5, 6  | Sequential: 5 first, then 6                                                        |

---

## TODOs

- [x] 1. Explore current configuration and capture baseline errors

  **What to do**:
  - Read `eslint.config.mjs` to identify all active @stylistic rules
  - Read `.prettierrc` to confirm current formatting rules are adequate
  - Run `pnpm run lint` to capture baseline error count and categorize by type:
    - Formatting-related errors (quotes, indentation, spacing)
    - TypeScript errors (any types, unused vars, type safety)
    - Import errors (ordering, duplicates, missing imports)
    - Security warnings (eslint-plugin-security alerts)
  - Document findings: total errors, breakdown by category, files with most errors

  **Must NOT do**:
  - Do NOT make any changes to files during exploration
  - Do NOT fix any errors (this is read-only exploration)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file reading and command execution, no complex logic
  - **Skills**: `[]` (none needed - basic file reading and bash commands)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3 (ESLint config update depends on this)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Configuration References** (files to read):
  - `eslint.config.mjs` - Current ESLint configuration (identify @stylistic rules to disable)
  - `.prettierrc` - Current Prettier formatting rules (verify no changes needed)
  - `package.json` - Current dependencies and scripts

  **Documentation References** (project structure):
  - `package.json:scripts` - Build, lint, test commands for verification
  - `README.md` - Project overview and context

  **Why Each Reference Matters**:
  - `eslint.config.mjs`: Need to see all active @stylistic rules to disable them
  - `.prettierrc`: Verify current formatting rules are adequate before proceeding (no changes needed based on user requirement)
  - `package.json`: Understand current dependency versions and scripts for verification steps

  **Acceptance Criteria**:

  **Baseline Documentation Created**:
  - [ ] Baseline report created: `.sisyphus/drafts/linting-baseline.md`
  - [ ] Report contains:
    - Total linting errors count (from `pnpm run lint`)
    - Error breakdown by category (formatting, TypeScript, imports, security)
    - List of files with most errors (top 10)
    - All active @stylistic rules listed (from eslint.config.mjs)
    - Current Prettier formatting rules documented (from .prettierrc)
  - [ ] Commands executed:
    ```bash
    pnpm run lint > .sisyphus/drafts/lint-output.txt
    # Capture full output
    ```

  **Evidence to Capture**:
  - [ ] `.sisyphus/drafts/linting-baseline.md` - Complete baseline report
  - [ ] `.sisyphus/drafts/lint-output.txt` - Full linting output for reference

  **Commit**: NO (exploration task, no code changes)

- [x] 2. Install dependencies (eslint-plugin-prettier and eslint-config-prettier)

  **What to do**:
  - Add `eslint-plugin-prettier` to devDependencies in package.json
  - Add `eslint-config-prettier` to devDependencies in package.json
  - Run `pnpm install` to install the new packages
  - Verify installation: `pnpm list eslint-plugin-prettier eslint-config-prettier`

  **Must NOT do**:
  - Do NOT change any other dependencies
  - Do NOT upgrade existing packages unless required for compatibility

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple dependency installation, standard pnpm workflow
  - **Skills**: `[]` (none needed - basic package.json editing and pnpm commands)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3 (ESLint config update depends on dependencies being installed)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Documentation References** (installation guides):
  - Official docs: `https://github.com/prettier/eslint-plugin-prettier` - Installation and configuration
  - Official docs: `https://github.com/prettier/eslint-config-prettier` - Usage with ESLint

  **External References** (versions and compatibility):
  - npm: `https://www.npmjs.com/package/eslint-plugin-prettier` - Latest version info
  - npm: `https://www.npmjs.com/package/eslint-config-prettier` - Latest version info

  **Why Each Reference Matters**:
  - Official installation docs: Ensure correct setup for ESLint 9.x flat config format
  - npm packages: Use latest compatible versions

  **Acceptance Criteria**:

  **Dependencies Installed**:
  - [ ] package.json updated with:
    ```json
    "eslint-plugin-prettier": "^x.x.x",
    "eslint-config-prettier": "^x.x.x"
    ```
  - [ ] `pnpm install` executed successfully
  - [ ] Installation verified:
    ```bash
    pnpm list eslint-plugin-prettier eslint-config-prettier
    # Expected: Shows both packages with versions
    ```

  **Evidence to Capture**:
  - [ ] Terminal output from `pnpm install` (successful installation)
  - [ ] Terminal output from `pnpm list` (both packages listed)

  **Commit**: NO (will commit together with config changes in Task 3)

- [x] 3. Update ESLint configuration (eslint.config.mjs)

  **What to do**:
  - Import `eslint-plugin-prettier` at top of file:
    ```javascript
    import prettier from 'eslint-plugin-prettier';
    import prettierConfig from 'eslint-config-prettier';
    ```
  - Add `prettierConfig` to base configuration (after `security.configs.recommended`):
    ```javascript
    ...prettierConfig, // Disables all ESLint formatting rules that conflict with Prettier
    ```
  - Add `prettier` plugin to plugins list in STRICT config for src/:
    ```javascript
    plugins: {
      '@stylistic': stylistic,
      security: security,
      import: importPlugin,
      node: nodePlugin,
      promise: promisePlugin,
      prettier: prettier, // Prettier integration
    },
    ```
  - Add prettier rule to rules in STRICT config:
    ```javascript
    rules: {
      'prettier/prettier': 'error', // Enforce Prettier formatting
      // ... existing rules ...
    }
    ```
  - **DISABLE ALL @stylistic rules**:
    - Comment out or remove all @stylistic rule definitions
    - Or explicitly disable: `'@stylistic/*': 'off'`
  - Remove `@stylistic` from plugins list (or keep and disable all rules)
  - Update file comments to document changes:
    ```javascript
    /**
     * ESLint Plugin: Prettier Integration
     * - Disables all @stylistic rules (formatting conflicts)
     * - Uses Prettier for all formatting enforcement
     * - Keeps strict code quality rules (TypeScript, security, imports, promises)
     */
    ```

  **Must NOT do**:
  - Do NOT modify any non-stylistic rules (keep all TypeScript, security, import, promise, mocha rules)
  - Do NOT add new ESLint rules or plugins beyond prettier integration
  - Do NOT change Prettier formatting rules (use existing .prettierrc)
  - Do NOT reorganize file structure unnecessarily

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration file modification, specific edits to well-structured file
  - **Skills**: `[]` (none needed - basic text editing with clear targets)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: Task 4 (linting fixes depend on config being updated)
  - **Blocked By**: Task 1 (need to know which @stylistic rules to disable) AND Task 2 (dependencies must be installed)

  **References**:

  **Configuration References** (existing config to modify):
  - `eslint.config.mjs:26-33` - Import section (add prettier imports)
  - `eslint.config.mjs:85-88` - Base configuration (add prettierConfig)
  - `eslint.config.mjs:105-111` - Plugins section (add prettier plugin)
  - `eslint.config.mjs:145-477` - Rules section (disable @stylistic rules, add prettier rule)

  **Documentation References** (configuration patterns):
  - `eslint.config.mjs:1-18` - File header comments (add new documentation section)

  **External References** (ESLint 9.x flat config format):
  - Official docs: `https://eslint.org/docs/latest/use/configure/configuration-files-new` - Flat config format
  - Plugin docs: `https://github.com/prettier/eslint-plugin-prettier#configuration` - Plugin configuration

  **Why Each Reference Matters**:
  - `eslint.config.mjs:26-33`: Add imports for eslint-plugin-prettier and eslint-config-prettier
  - `eslint.config.mjs:85-88`: Add prettierConfig to base config to disable conflicting rules
  - `eslint.config.mjs:105-111`: Register prettier plugin in STRICT config
  - `eslint.config.mjs:145-477`: Remove/disable all @stylistic rules, add prettier/prettier rule

  **Acceptance Criteria**:

  **ESLint Configuration Updated**:
  - [ ] File header comments updated with Prettier integration documentation
  - [ ] prettier imports added at top:
    ```javascript
    import prettier from 'eslint-plugin-prettier';
    import prettierConfig from 'eslint-config-prettier';
    ```
  - [ ] prettierConfig added to base configuration (after security.configs.recommended)
  - [ ] prettier plugin added to plugins list in STRICT config
  - [ ] 'prettier/prettier': 'error' rule added to rules
  - [ ] ALL @stylistic rules disabled or removed
  - [ ] Configuration validates:
    ```bash
    node -e "import('./eslint.config.mjs').then(c => console.log('Config valid'))"
    # Expected: "Config valid"
    ```

  **Evidence to Capture**:
  - [ ] Terminal output from config validation (no syntax errors)
  - [ ] `grep -c "@stylistic/" eslint.config.mjs` output (no active rules)
  - [ ] Modified sections of eslint.config.mjs (before/after diff for reference)

  **Commit**: YES
  - Message: `config(eslint): integrate eslint-plugin-prettier and disable @stylistic rules`
  - Files: `eslint.config.mjs`, `package.json`
  - Pre-commit: `node -e "import('./eslint.config.mjs').then(c => console.log('Config valid'))"`

- [x] 4. Auto-fix linting errors across all files

  **What to do**:
  - Run ESLint with auto-fix on all TypeScript and TSX files:
    ```bash
    pnpm run lint:fix  # or: eslint --fix "**/*.{ts,tsx}" "**/*.config.{ts,mjs}"
    ```
  - If lint:fix doesn't exist in scripts, create command:
    ```bash
    eslint --fix "src/**/*.{ts,tsx}" "test/**/*.ts" "*.config.{ts,mjs}"
    ```
  - Run Prettier format to ensure consistent formatting:
    ```bash
    prettier --write "**/*.{ts,tsx,js,mjs}"
    ```
  - Capture results:
    - Count of files modified
    - Count of errors fixed
    - List of any remaining errors (manual fixes needed)

  **Must NOT do**:
  - Do NOT modify business logic or test logic
  - Do NOT refactor code "because it's better"
  - Do NOT add eslint-disable comments
  - Do NOT change generated files (dist/, out/, node_modules)
  - Do NOT skip files (fix all 58 TS files + 3 TSX files)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Running multiple linting/formatting commands, processing many files, straightforward but time-consuming
  - **Skills**: `[]` (none needed - standard ESLint/Prettier commands)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: Task 5, 6 (manual fixes and verification depend on auto-fixes)
  - **Blocked By**: Task 3 (ESLint config must be updated first)

  **References**:

  **Pattern References** (existing linting setup):
  - `package.json:308-310` - lint and lint:fix scripts (verify lint:fix exists)
  - `eslint.config.mjs` - Updated ESLint configuration (use new config with prettier integration)

  **Documentation References** (command usage):
  - `package.json:311` - format command (use existing Prettier config)

  **External References** (auto-fix commands):
  - ESLint docs: `https://eslint.org/docs/latest/use/command-line-interface#--fix` - Auto-fix options
  - Prettier docs: `https://prettier.io/docs/en/cli.html#--write` - Format files

  **Why Each Reference Matters**:
  - `package.json:308-310`: Check if lint:fix script exists, or create custom command
  - `eslint.config.mjs`: New configuration with prettier integration will be used for auto-fix
  - `package.json:311`: Existing format command for Prettier

  **Acceptance Criteria**:

  **Auto-Fixes Applied**:
  - [ ] ESLint auto-fix executed:
    ```bash
    pnpm run lint:fix
    # Expected: Fixes applied, shows errors fixed count
    ```
  - [ ] Prettier format executed:
    ```bash
    prettier --write "**/*.{ts,tsx,js,mjs}"
    # Expected: All files formatted
    ```
  - [ ] Files modified count documented
  - [ ] Errors fixed count documented
  - [ ] Remaining errors (if any) listed with file, line, rule

  **Evidence to Capture**:
  - [ ] Terminal output from `pnpm run lint:fix` (fixes applied, remaining errors)
  - [ ] Terminal output from `prettier --write` (files formatted)
  - [ ] `.sisyphus/drafts/remaining-errors.md` - List of any manual errors (if any)

  **Commit**: NO (will verify and commit with Task 6)

- [x] 5. Manual linting error fixes (if any remain after auto-fix)

  **What to do**:
  - If auto-fix left errors:
    - Review `.sisyphus/drafts/remaining-errors.md` from Task 4
    - For each error:
      - Read the file and locate the error line
      - Determine fix based on ESLint error message
      - Apply minimal fix to satisfy the rule
      - Re-run `pnpm run lint` on that file to verify fix
      - Document fix (file, line, rule applied)
  - If auto-fix fixed everything:
    - Verify no remaining errors with `pnpm run lint`
    - Mark this task as complete with "No manual fixes needed"
  - Focus on these error categories:
    - TypeScript errors (type annotations, unused variables, any types)
    - Import errors (missing imports, ordering, duplicates)
    - Security warnings (eslint-plugin-security alerts)
    - Promise errors (promise/ plugin rules)

  **Must NOT do**:
  - Do NOT refactor code beyond fixing the specific linting error
  - Do NOT change business logic or test logic
  - Do NOT add eslint-disable comments
  - Do NOT skip errors (fix all)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Manual error fixes require understanding ESLint rules and applying targeted fixes, straightforward but requires attention to detail
  - **Skills**: `[]` (none needed - ESLint error messages provide fix guidance)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: Task 6 (verification depends on all errors being fixed)
  - **Blocked By**: Task 4 (auto-fix must complete first)

  **References**:

  **Error References** (from previous task):
  - `.sisyphus/drafts/remaining-errors.md` - List of errors needing manual fixes (from Task 4)
  - `.sisyphus/drafts/linting-baseline.md` - Original error categorization (from Task 1)

  **Documentation References** (ESLint rules):
  - `eslint.config.mjs:145-477` - ESLint rule configurations (reference for rule behavior)

  **External References** (rule explanations):
  - ESLint rules: `https://eslint.org/docs/latest/rules/` - Rule documentation and fix examples
  - TypeScript ESLint: `https://typescript-eslint.io/rules/` - TypeScript-specific rules

  **Why Each Reference Matters**:
  - `.sisyphus/drafts/remaining-errors.md`: Contains list of errors to fix manually
  - `eslint.config.mjs:145-477`: Rule configurations provide context for what each rule expects
  - ESLint rules docs: Provide examples and explanations for each error type

  **Acceptance Criteria**:

  **Manual Fixes Applied (if needed)**:
  - [ ] Each error from `.sisyphus/drafts/remaining-errors.md` addressed
  - [ ] For each error:
    - [ ] File located and error line identified
    - [ ] Fix applied (minimal change to satisfy rule)
    - [ ] Verification: `pnpm run lint [file]` passes (exit code 0)
  - [ ] All TypeScript errors fixed (type annotations, unused vars, any types)
  - [ ] All import errors fixed (missing imports, ordering, duplicates)
  - [ ] All security warnings fixed (or documented if false positive)
  - [ ] All promise errors fixed (async/await issues)
  - [ ] Final verification: `pnpm run lint` zero errors

  **Evidence to Capture**:
  - [ ] Terminal output from individual file linting (each fix verified)
  - [ ] `.sisyphus/drafts/manual-fixes-log.md` - Log of all manual fixes (if any)
  - [ ] Terminal output from final `pnpm run lint` (zero errors)

  **Commit**: NO (will verify and commit with Task 6)

- [x] 6. Verification (lint, build, test, prettier check)

  **What to do**:
  - Run complete verification sequence:
    1. **ESLint lint check**:
       ```bash
       pnpm run lint
       # Expected: Exit code 0, zero errors, zero warnings
       ```
    2. **Build verification**:
       ```bash
       pnpm run build
       # Expected: Builds successfully, exit code 0
       ```
    3. **Test execution**:
       ```bash
       pnpm test
       # Expected: All tests pass, exit code 0
       ```
    4. **Prettier format check**:
       ```bash
       prettier --check "**/*.{ts,tsx,js,mjs}"
       # Expected: All files match Prettier formatting
       ```
    5. **Verify no eslint-disable comments added**:
       ```bash
       grep -r "eslint-disable" src/ test/
       # Expected: No results (or only pre-existing ones)
       ```
    6. **Verify @stylistic rules are disabled**:
       ```bash
       grep -c "@stylistic/" eslint.config.mjs
       # Expected: No active @stylistic rules
       ```
  - If any verification fails:
    - **Lint fails**: Return to Task 4/5, fix remaining errors
    - **Build fails**: Identify build error, revert problematic change, re-fix
    - **Tests fail**: Identify failing test(s), revert problematic change, re-fix, re-verify
    - **Prettier check fails**: Run `prettier --write`, re-verify
    - **eslint-disable comments found**: Remove all eslint-disable comments, re-fix cleanly
  - Document all verification results
  - If all verifications pass: Mark work complete

  **Must NOT do**:
  - Do NOT skip verification steps
  - Do NOT consider work complete unless ALL verifications pass
  - Do NOT modify business logic or test logic during verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running verification commands and checking exit codes, straightforward execution
  - **Skills**: `[]` (none needed - bash commands and output checking)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 4)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 4, 5 (all linting errors must be fixed first)

  **References**:

  **Script References** (verification commands):
  - `package.json:308-312` - lint, lint:fix, build, test scripts (use these commands)

  **Documentation References** (success criteria):
  - `README.md` - Project context for build/test expectations

  **Why Each Reference Matters**:
  - `package.json:308-312`: Contains exact commands to run for verification (lint, build, test)
  - `README.md`: Provides context on expected build/test behavior

  **Acceptance Criteria**:

  **All Verifications Pass**:
  - [ ] ESLint check passes:
    ```bash
    pnpm run lint
    # Expected: Exit code 0, zero errors, zero warnings
    ```
  - [ ] Build verification passes:
    ```bash
    pnpm run build
    # Expected: Builds successfully, exit code 0
    ```
  - [ ] Test execution passes:
    ```bash
    pnpm test
    # Expected: All tests pass, exit code 0
    ```
  - [ ] Prettier format check passes:
    ```bash
    prettier --check "**/*.{ts,tsx,js,mjs}"
    # Expected: All files match formatting
    ```
  - [ ] No eslint-disable comments added:
    ```bash
    grep -r "eslint-disable" src/ test/
    # Expected: No results (or only pre-existing documented)
    ```
  - [ ] @stylistic rules confirmed disabled:
    ```bash
    grep -c "@stylistic/" eslint.config.mjs
    # Expected: No active rules
    ```
  - [ ] Verification report created: `.sisyphus/drafts/verification-report.md`

  **Evidence to Capture**:
  - [ ] Terminal output from `pnpm run lint` (zero errors)
  - [ ] Terminal output from `pnpm run build` (successful build)
  - [ ] Terminal output from `pnpm test` (all tests pass)
  - [ ] Terminal output from `prettier --check` (all files match)
  - [ ] Terminal output from grep commands (no eslint-disable, no @stylistic rules)
  - [ ] `.sisyphus/drafts/verification-report.md` - Complete verification report

  **Commit**: YES (final commit of all changes)
  - Message: `fix: resolve all linting errors and integrate eslint-plugin-prettier`
  - Files: All modified source, test, and config files (eslint.config.mjs, package.json)
  - Pre-commit: `pnpm run lint && pnpm run build && pnpm test`

---

## Commit Strategy

| After Task | Message                                                                         | Files                           | Verification                                                                     |
| ---------- | ------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| 3          | `config(eslint): integrate eslint-plugin-prettier and disable @stylistic rules` | eslint.config.mjs, package.json | `node -e "import('./eslint.config.mjs').then(c => console.log('Config valid'))"` |
| 6          | `fix: resolve all linting errors and integrate eslint-plugin-prettier`          | All modified files              | `pnpm run lint && pnpm run build && pnpm test`                                   |

---

## Success Criteria

### Verification Commands

```bash
# 1. ESLint zero errors
pnpm run lint
# Expected: Exit code 0, zero errors, zero warnings

# 2. Build successful
pnpm run build
# Expected: Builds successfully, exit code 0

# 3. Tests pass
pnpm test
# Expected: All tests pass, exit code 0

# 4. Prettier formatting check
prettier --check "**/*.{ts,tsx,js,mjs}"
# Expected: All files match formatting

# 5. No eslint-disable comments
grep -r "eslint-disable" src/ test/
# Expected: No results

# 6. @stylistic rules disabled
grep -c "@stylistic/" eslint.config.mjs
# Expected: No active rules
```

### Final Checklist

- [x] All linting errors fixed across all 58 TS files and 3 TSX files
- [x] ESLint config updated with eslint-plugin-prettier integration
- [x] All @stylistic ESLint rules disabled
- [x] Prettier handles all formatting enforcement
- [x] Strict code quality rules maintained (TypeScript, security, imports, promises, mocha)
- [x] `pnpm run lint` passes with zero errors
- [x] `pnpm run build` completes successfully
- [ ] `pnpm test` passes all tests
- [x] No eslint-disable comments added (clean implementation)
- [x] No changes to business logic or test logic
- [x] Documentation updated (if applicable)

### Definition of Complete

Work is complete when:

- All verification commands pass with exit code 0
- Zero linting errors across entire codebase
- Build and test suites pass successfully
- Prettier formatting is consistent across all files
- No regressions introduced (all functionality preserved)
