# Prettier Configuration Changes Review

## Current Configuration (.prettierrc)

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

## Planned Changes

### Proposed .prettierrc

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

### New Rules Added

1. **endOfLine**: "lf"
   - Enforces LF line endings (Unix/Linux standard)
   - Consistent with .editorconfig setting
   - Prevents CRLF on Windows systems

2. **quoteProps**: "as-needed"
   - Only quote object properties when necessary
   - Cleaner code for valid identifiers
   - Example: `{ name: "test" }` vs `{ "name": "test" }`

3. **bracketSameLine**: false
   - Places JSX bracket on new line
   - Consistent with most codebases
   - Example:
     ```jsx
     <div>content</div>
     ```

4. **proseWrap**: "preserve"
   - Doesn't reformat Markdown paragraphs
   - Keeps manual line breaks in documentation

5. **htmlWhitespaceSensitivity**: "css"
   - Respects CSS display properties in HTML
   - Better for JSX components

6. **embeddedLanguageFormatting**: "auto"
   - Formats CSS-in-JS and template strings
   - Automatically detects embedded languages

## Impact Analysis

### Before vs After

**Before:**

```javascript
const obj = {
  name: 'test',
  value: 123,
};
```

**After:**

```javascript
const obj = {
  name: 'test',
  value: 123,
};
```

**Changes:**

- Removed unnecessary quotes on property names
- Ensures LF line endings (no CRLF)

## Strictness Level

### Current: 8/10

### Proposed: 9/10

**Stricter additions:**

- LF enforcement prevents platform-specific line endings
- quoteProps: as-needed enforces consistent property quoting
- bracketSameLine: false enforces consistent JSX formatting

## Benefits

1. **Cross-platform consistency** - LF endings work everywhere
2. **Cleaner code** - No unnecessary quotes on object properties
3. **Consistent JSX** - Brackets on new line for readability
4. **Markdown preservation** - Documentation formatting maintained
5. **CSS awareness** - Better HTML/JSX formatting

## Migration Path

1. Update .prettierrc
2. Run `pnpm format` to apply changes
3. Commit changes (includes line ending conversions)

## Risk Assessment

**Low Risk:**

- Prettier changes are mostly cosmetic
- No semantic code changes
- Auto-fixable with format command

**Potential Issues:**

- Some files may have extensive formatting changes
- Git diff will be large
  - Mitigation: Can review changes chunk by chunk

## Questions

1. Do you want to keep `quoteProps: "as-needed"` or prefer `"consistent"`?
2. Is `bracketSameLine: false` acceptable or do you prefer same-line brackets?
3. Any other Prettier rules you want to add?
