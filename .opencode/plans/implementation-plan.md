# Complete Implementation Plan (with Monotonous Comments)

## Overview

This document provides the complete step-by-step plan to implement all configuration
changes, file reorganization, and encoding conversion, with comprehensive
monotonous comments throughout ESLint configuration.

## Changes Summary

1. **ESLint Configuration** - Separate strict (src/) and relaxed (test/) rules
   - **NEW**: Add comprehensive monotonous comments throughout
2. **Prettier Configuration** - Add stricter rules and LF enforcement
3. **File Encoding** - Convert all files to UTF-8 and LF (126 files)
4. **.gitignore** - Reorganize with categories and comments
5. **.vscodeignore** - Reorganize with categories and comments

## Implementation Order

### Phase 1: Configuration Files (Low Risk)

These changes don't affect existing code, just configuration.

1. Update `.prettierrc`
2. Reorganize `.gitignore`
3. Reorganize `.vscodeignore`

### Phase 2: ESLint Restructuring with Monotonous Comments (Medium Risk)

Reconfigures linting rules without changing code structure.

4. Restructure `eslint.config.mjs` with monotonous comments
5. Run `pnpm lint:fix` on src/ directory only

### Phase 3: File Encoding Conversion (Low Risk)

Converts file formats without changing content.

6. Run encoding conversion script
7. Verify conversion
8. Format all files with Prettier
9. Commit all changes

## Detailed Steps

### Step 1: Update .prettierrc

**Action:** Replace current `.prettierrc` with new configuration

**New Content:**

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "embeddedLanguageFormatting": "auto"
}
```

**Verification:**

```bash
cat .prettierrc
```

### Step 2: Reorganize .gitignore

**Action:** Replace current `.gitignore` with categorized version

**New Content:** See `.opencode/plans/gitignore-reorganization-review.md`

**Verification:**

```bash
git status
```

Should not show untracked files that should be ignored.

### Step 3: Reorganize .vscodeignore

**Action:** Replace current `.vscodeignore` with categorized version

**New Content:** See `.opencode/plans/vscodeignore-reorganization-review.md`

**Verification:**

```bash
pnpm build
pnpm package
unzip -l *.vsix
```

Verify package contains only necessary files.

### Step 4: Restructure eslint.config.mjs with Monotonous Comments

**Action:** Replace current `eslint.config.mjs` with new version

**New Content:** See `.opencode/plans/eslint-changes-review.md` (full configuration)

**Monotonous Comment Style:**

```
// ============================================
// SECTION_NAME - Brief description
// ============================================
// Purpose: Why this section exists
// Rationale: Detailed explanation

// Category: RULE_CATEGORY_NAME - Purpose
// Purpose: Why these rules exist
// Rationale: Detailed explanation

'rule-name': 'error',
// Reason: Why this specific rule is configured this way
```

**Key Features:**

- Every section has header comment
- Every category has purpose comment
- Every rule has inline explanation
- Every file pattern has target comment
- Every exception has reason comment
- Consistent formatting and style

**Verification:**

```bash
pnpm lint
```

Check for new violations in src/ directory.

### Step 5: Fix Linting Issues in src/

**Action:** Auto-fix linting violations

```bash
pnpm lint:fix
```

**Expected Behavior:**

- Some files may be auto-fixed
- Manual fixes may be needed for complex issues
- Test files should not have new violations (rules are relaxed)

**Verification:**

```bash
pnpm lint
```

Should pass with no errors (warnings acceptable).

### Step 6: File Encoding Conversion

**Action:** Create and run conversion script

**Script Location:** `scripts/convert-encoding.sh`

**Script Content:**

```bash
#!/bin/bash
# Convert files to UTF-8 encoding and LF line endings

echo "Converting files to UTF-8 and LF..."

find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \
  -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
  -o -name ".gitignore" -o -name ".vscodeignore" -o -name ".editorconfig" \
  -o -name ".prettierrc" -o -name "package.json" -o -name "tsconfig*.json" \
  -o -name "eslint*" -o -name ".eslintrc*" \) \
  ! -path "./node_modules/*" \
  ! -path "./.git/*" \
  ! -path "./dist/*" \
  ! -path "./.vscode-test/*" \
  ! -path "./out/*" \
  ! -path "./coverage/*" \
  -exec sh -c '
    # Convert CRLF to LF
    sed -i "s/\r$//" "$1"

    # Check if UTF-8, convert if not
    encoding=$(file -i "$1" | cut -d= -f2 | tr -d " \n\r")
    if [ "$encoding" != "utf-8" ] && [ "$encoding" != "us-ascii" ]; then
      echo "Converting $1 from $encoding to UTF-8"
      iconv -f "$encoding" -t UTF-8 "$1" > "$1.tmp" 2>/dev/null && mv "$1.tmp" "$1"
    fi
  ' _ {} \;

echo "Conversion complete!"
echo ""
echo "Verification:"
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  ! -path "./node_modules/*" -exec file -i {} \; | grep -v "utf-8\|us-ascii" || echo "All files are UTF-8!"
```

**Execution:**

```bash
chmod +x scripts/convert-encoding.sh
./scripts/convert-encoding.sh
```

**Expected Output:**

```
Converting files to UTF-8 and LF...
Conversion complete!

Verification:
All files are UTF-8!
```

### Step 7: Verify Conversion

**Action:** Check for any remaining issues

```bash
# Check for non-UTF-8 files
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  ! -path "./node_modules/*" -exec file -i {} \; | grep -v "utf-8\|us-ascii"

# Check for CRLF files
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  ! -path "./node_modules/*" -exec grep -l $'\r' {} \;
```

**Expected:** Both commands return empty results.

### Step 8: Format All Files with Prettier

**Action:** Apply Prettier formatting with new config

```bash
pnpm format
```

**Expected:** Files reformatted with new rules (quotes, line endings, etc.)

### Step 9: Run Full Test Suite

**Action:** Ensure all tests pass

```bash
pnpm test:minimal
```

**Expected:** All tests pass.

### Step 10: Build Extension

**Action:** Verify build works

```bash
pnpm build
```

**Expected:** Build succeeds without errors.

### Step 11: Review Changes

**Action:** Review all changes before committing

```bash
git diff --stat
git diff
```

**Check:**

- Configuration files updated
- Source files reformatted
- Encoding changes visible in git diff
- Monotonous comments present in eslint.config.mjs
- No unexpected content changes

**Verify Monotonous Comments:**

```bash
grep -c "Purpose:" eslint.config.mjs
grep -c "Rationale:" eslint.config.mjs
grep -c "Reason:" eslint.config.mjs
```

**Expected:**

- 20+ "Purpose:" comments
- 20+ "Rationale:" comments
- 100+ "Reason:" comments

### Step 12: Commit Changes

**Action:** Commit all changes

**Commit Message:**

```
Separate linting configs and standardize file encoding

- Restructure eslint.config.mjs with separate strict/relaxed sections
  - Strict rules for src/ directories (type safety, security, best practices)
  - Relaxed rules for test/ directories (syntax and mocha structure only)
  - Add comprehensive monotonous comments throughout configuration
  - Document purpose and rationale for every section and rule
  - Explain reasoning behind each configuration decision
  - Ensure 100% comment coverage for maintainability
- Update .prettierrc with stricter formatting rules
  - Add endOfLine: 'lf' for cross-platform consistency
  - Add quoteProps, bracketSameLine, and other formatting rules
- Reorganize .gitignore with clear categories
  - Build artifacts, dependencies, testing, OS files, AI tools, docs
- Reorganize .vscodeignore with clear categories
  - Source, dependencies, dev tools, VS Code configs, artifacts, docs
- Convert all source files to UTF-8 encoding and LF line endings
  - 126 files processed (excluding node_modules, dist, .vscode-test)
- Run Prettier formatting with new configuration
```

**Commands:**

```bash
git add .
git commit -m "Separate linting configs and standardize file encoding"
```

## Verification Checklist

After completing all steps, verify:

- [ ] `.prettierrc` updated with new rules
- [ ] `.gitignore` reorganized with categories
- [ ] `.vscodeignore` reorganized with categories
- [ ] `eslint.config.mjs` has clear sections for src/ and test/
- [ ] `eslint.config.mjs` contains comprehensive monotonous comments:
  - [ ] Section headers with purpose and rationale
  - [ ] Category descriptions for each rule group
  - [ ] Inline explanations for every rule
  - [ ] Target comments for file patterns
  - [ ] Reason comments for exceptions
- [ ] All files are UTF-8 encoded (verify with `file -i`)
- [ ] All files have LF line endings (no CRLF)
- [ ] `pnpm lint` passes
- [ ] `pnpm format` runs without errors
- [ ] `pnpm test:minimal` passes
- [ ] `pnpm build` succeeds
- [ ] Extension package contains only necessary files
- [ ] No unexpected changes in git diff

## Monotonous Comments Coverage

### What Gets Comments?

1. **Every Section Header**

   ```
   // ============================================
   // SECTION_NAME - Brief description
   // ============================================
   // Purpose: What this section does
   // Rationale: Why it's needed
   ```

2. **Every Rule Category**

   ```
   // Category: CATEGORY_NAME - Brief description
   // Purpose: Why these rules exist
   // Rationale: Detailed explanation
   ```

3. **Every Rule**

   ```
   'rule-name': 'error',
   // Reason: Specific justification for this rule
   ```

4. **Every File Pattern**

   ```
   // Target: pattern/**/*.ts
   // Purpose: What this pattern matches
   // Rationale: Why we target this pattern
   ```

5. **Every Exception**
   ```
   // Exception: File Name
   // Reason: Why this file needs exception
   ```

### Expected Comment Count

- **Section headers**: ~10 sections
- **Category descriptions**: ~15 categories
- **Rule explanations**: ~100 rules
- **Total comments**: ~125+ comments

### Comment Coverage Verification

```bash
# Count section headers
grep -c "^// =\+" eslint.config.mjs

# Count purpose comments
grep -c "Purpose:" eslint.config.mjs

# Count rationale comments
grep -c "Rationale:" eslint.config.mjs

# Count reason comments
grep -c "Reason:" eslint.config.mjs
```

## Rollback Plan

If issues occur after commit:

1. Revert commit:

   ```bash
   git revert HEAD
   ```

2. Or reset to previous commit:
   ```bash
   git reset --hard HEAD~1
   ```

## Estimated Time

- Step 1-3: 5 minutes (configuration files)
- Step 4-5: 15 minutes (ESLint restructure, comments, and fixes)
- Step 6-7: 5 minutes (conversion and verification)
- Step 8-10: 5 minutes (formatting, tests, build)
- Step 11-12: 15 minutes (review, verify comments, and commit)

**Total: ~45 minutes**

## Benefits of Monotonous Comments

### 1. Self-Documenting Configuration

- Configuration explains itself
- No external documentation needed
- Decisions are captured inline

### 2. Faster Onboarding

- New contributors understand rules quickly
- Clear purpose and rationale
- No need to ask "why is this rule here?"

### 3. Easier Maintenance

- Remember why rules are configured
- Clear justification for changes
- Easy to audit configuration

### 4. Better Code Reviews

- Configuration changes are clear
- Justifications are visible
- Reviewers understand intent

### 5. Traceable Decisions

- Every configuration decision is documented
- History is preserved in comments
- Easy to track changes over time

### 6. Consistent Documentation

- Uniform comment style
- Predictable structure
- Professional appearance

## Questions Before Execution

1. Do you want to create a backup branch before starting?
2. Should the conversion script be executed automatically or manually reviewed first?
3. Any specific files you want to exclude from conversion?
4. Do you want to see the monotonous comments in action before committing?
5. Any specific comment style preferences you want to adjust?
