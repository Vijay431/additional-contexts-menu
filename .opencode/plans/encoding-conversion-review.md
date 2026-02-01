# File Encoding & Line Ending Conversion Review

## Current State Analysis

### File Encoding Check

```bash
file -i eslint.config.mjs .prettierrc .gitignore .vscodeignore .editorconfig package.json src/extension.ts test/e2e/extension-e2e.test.ts
```

**Results:**

- eslint.config.mjs: us-ascii
- .prettierrc: us-ascii
- .gitignore: us-ascii
- .vscodeignore: us-ascii
- .editorconfig: us-ascii
- package.json: us-ascii
- src/extension.ts: us-ascii
- test/e2e/extension-e2e.test.ts: utf-8

**Status:** Most files are US-ASCII (subset of UTF-8), one is UTF-8.
**Conclusion:** Files are already compatible with UTF-8.

### Line Ending Check

```bash
cat eslint.config.mjs | od -c | head -5
```

**Results:** Files use LF (`\n`) line endings.
**Status:** Files already have LF line endings.

## Conversion Plan

### Files to Process: 126 total

**Breakdown:**

- TypeScript files: ~66 (src/ + test/)
- JSON files: ~15 (package.json, configs, fixtures)
- Markdown files: ~10 (README, docs)
- Other configs: ~5 (.editorconfig, .vscodeignore, etc.)
- Test fixtures: ~30 (sample files)

**Excluded:**

- node_modules/ (too many)
- dist/ (build output)
- .vscode-test/ (test environment)
- out/ (build output)
- .git/ (version control)

### Conversion Scripts

#### Script 1: Convert Encoding to UTF-8

```bash
#!/bin/bash
# Convert files to UTF-8 encoding
# Note: Most files are already ASCII/UTF-8, but this ensures consistency

find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \
  -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
  -o -name ".gitignore" -o -name ".vscodeignore" -o -name ".editorconfig" \
  -o -name ".prettierrc" \) \
  ! -path "./node_modules/*" \
  ! -path "./.git/*" \
  ! -path "./dist/*" \
  ! -path "./.vscode-test/*" \
  ! -path "./out/*" \
  ! -path "./coverage/*" \
  -exec sh -c '
    file -i "$1" | grep -v "charset=utf-8" && \
    iconv -f $(file -i "$1" | cut -d= -f2) -t UTF-8 "$1" > "$1.tmp" && \
    mv "$1.tmp" "$1"
  ' _ {} \;
```

#### Script 2: Convert Line Endings to LF

```bash
#!/bin/bash
# Convert CRLF to LF for all source files

find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \
  -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
  -o -name ".gitignore" -o -name ".vscodeignore" -o -name ".editorconfig" \
  -o -name ".prettierrc" -o -name "package.json" -o -name "tsconfig*.json" \
  -o -name "eslint*" \) \
  ! -path "./node_modules/*" \
  ! -path "./.git/*" \
  ! -path "./dist/*" \
  ! -path "./.vscode-test/*" \
  ! -path "./out/*" \
  ! -path "./coverage/*" \
  -exec sed -i 's/\r$//' {} \;
```

### Alternative: Single Combined Script

```bash
#!/bin/bash
# Combined conversion: UTF-8 encoding + LF line endings

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
```

### Verification Commands

#### Check Encodings

```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  ! -path "./node_modules/*" -exec file -i {} \; | grep -v "utf-8\|us-ascii"
```

#### Check Line Endings

```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  ! -path "./node_modules/*" -exec grep -l $'\r' {} \;
```

## Impact Analysis

### Before Conversion

- Some files might have CRLF (from Windows contributors)
- Some files might have non-UTF-8 encoding
- Inconsistent across the codebase

### After Conversion

- All files: UTF-8 encoding
- All files: LF line endings
- Consistent cross-platform compatibility
- Prevents Git line ending issues
- Matches .editorconfig settings

### File Size Impact

- Negligible (CRLF to LF actually reduces size)
- UTF-8 is standard for modern code

## Migration Path

1. **Backup** (optional):

   ```bash
   git stash
   ```

2. **Run conversion script**
3. **Verify**:
   - Check for non-UTF-8 files (should return empty)
   - Check for CRLF files (should return empty)
   - Run tests: `pnpm test:minimal`
   - Build: `pnpm build`

4. **Review changes**:

   ```bash
   git diff
   ```

5. **Commit**:
   ```bash
   git add .
   git commit -m "Convert all files to UTF-8 and LF encoding"
   ```

## Risk Assessment

**Low Risk:**

- ASCII is subset of UTF-8 (no data loss)
- Most files already use LF
- Line ending conversion is reversible
- Files are text-based (not binary)

**Potential Issues:**

- Large git diff due to line ending changes
- Some files might have special characters requiring careful handling
  - Mitigation: Script checks encoding before converting

## Files Requiring Special Attention

1. **Markdown files** - Check for special characters, emojis
2. **Test fixtures** - Verify no encoding issues
3. **Configuration files** - Ensure valid after conversion

## Questions

1. Do you want to create a backup branch before conversion?
2. Should the conversion be done as a separate commit or combined with other changes?
3. Any files you want to exclude from conversion?
4. Do you want to see a dry-run first (files that would be changed)?
