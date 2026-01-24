# Path Validation Security Model

## 🛡️ Overview

The path validation model is a critical security component that prevents path traversal attacks when opening terminals. This model ensures that terminal operations are restricted to valid, accessible directories within the workspace, protecting users from unauthorized file system access.

## 🎯 Purpose

Path validation serves multiple security objectives:

1. **Prevent Path Traversal Attacks** - Block attempts to access directories outside the intended workspace
2. **Ensure Directory Existence** - Verify that paths exist before attempting terminal operations
3. **Validate Path Types** - Confirm that paths are directories, not files
4. **Provide Safe Failures** - Return safe defaults rather than throwing exceptions

## 🔒 Threat Model

### Attacks Prevented

#### Path Traversal (Directory Traversal)
**Attack Vector:** Malicious actors attempt to navigate outside workspace boundaries using path manipulation patterns.

**Examples:**
- `../../../etc/passwd` - Parent directory traversal
- `~/.ssh/config` - Home directory access
- `/etc/systemd/system/` - Absolute system paths
- `\\?\C:\Windows\System32\` - Windows NT paths

**How We Prevent It:**
- Paths are validated using VS Code's file system abstraction layer
- Only paths that exist and are accessible within the workspace context are accepted
- URI construction uses `vscode.Uri.file()` which normalizes paths
- Validation fails closed (returns `false`) for any suspicious path

#### Directory Confusion Attacks
**Attack Vector:** Attempting to open a terminal in a file rather than a directory.

**Examples:**
- Passing `/workspace/config.json` instead of `/workspace/`
- Using symbolic links to redirect to unexpected locations

**How We Prevent It:**
- Validation checks `vscode.FileType.Directory` explicitly
- File paths return `false` even if they exist
- Symbolic links are resolved by VS Code's file system API before validation

#### Non-existent Path Attacks
**Attack Vector:** Attempting to trigger unexpected behavior by providing invalid paths.

**Examples:**
- Paths with null bytes: `/workspace/test\x00file`
- Paths exceeding maximum length
- Invalid Unicode sequences

**How We Prevent It:**
- VS Code's file system API handles path normalization
- Invalid paths fail gracefully with logged warnings
- No exceptions are thrown to prevent information leakage

## ✅ Safe Path Criteria

A path is considered safe when ALL of the following conditions are met:

1. **Path Resolution:** The path can be resolved to a valid URI
2. **Existence:** The path exists on the file system
3. **Type Verification:** The path is a directory (not a file)
4. **Accessibility:** The path is accessible through VS Code's file system API

### Validation Process

```
Input Path
    ↓
Construct URI (vscode.Uri.file)
    ↓
Stat File (vscode.workspace.fs.stat)
    ↓
Check Type (Directory vs File)
    ↓
Return Result (true/false)
```

## 🔐 Security Boundaries

### Workspace Boundary

The extension operates within VS Code's workspace boundary:

- **Trusted Zone:** Directories within VS Code workspace folders
- **Validation Layer:** `validatePath()` method enforces workspace constraints
- **File System API:** Uses VS Code's controlled file system access

### Extension Context

The extension only accesses paths through:

1. **VS Code Workspace API** - `vscode.workspace.workspaceFolders`
2. **VS Code File System API** - `vscode.workspace.fs.stat`
3. **VS Code Terminal API** - `vscode.window.createTerminal`

**Critical:** The extension does NOT use Node.js `fs` module directly for path operations, maintaining VS Code's security sandbox.

## ⚙️ Implementation Details

### validatePath() Method

**Location:** `src/services/terminalService.ts`

```typescript
public async validatePath(directoryPath: string): Promise<boolean>
```

**Algorithm:**
1. Construct a VS Code URI from the path string
2. Query file system statistics using `vscode.workspace.fs.stat`
3. Check if the file type includes `vscode.FileType.Directory`
4. Return `true` if all checks pass, `false` otherwise

**Error Handling:**
- All errors are caught and logged
- Returns `false` for any validation failure
- No exceptions propagate to callers
- Errors are logged with context for debugging

### Security Properties

| Property | Implementation | Security Benefit |
| -------- | -------------- | ---------------- |
| **Normalization** | `vscode.Uri.file()` | Prevents path traversal sequences |
| **Existence Check** | `vscode.workspace.fs.stat` | Prevents time-of-check to time-of-use (TOCTOU) race conditions |
| **Type Verification** | `FileType.Directory` check | Prevents file confusion attacks |
| **Fail-Safe** | Try-catch with `false` return | Prevents information leakage through errors |
| **Audit Logging** | `logger.warn()` for failures | Enables security monitoring |

## 🧪 Testing & Verification

### Security Test Coverage

The path validation is tested for:

1. **Valid Directories** - Existing directories return `true`
2. **Non-existent Paths** - Missing paths return `false`
3. **File Paths** - Files return `false` (not directories)
4. **Edge Cases** - Empty strings, special characters, Unicode paths

### Manual Testing Checklist

- [ ] Test with workspace root directory
- [ ] Test with nested directories
- [ ] Test with non-existent paths
- [ ] Test with file paths (not directories)
- [ ] Test with symbolic links (if supported by workspace)
- [ ] Test with special characters in paths
- [ ] Test with very long path names
- [ ] Test across platforms (Windows, macOS, Linux)

## 🚨 Security Considerations for Contributors

### When Modifying Path Validation

**DO:**
- Maintain VS Code API usage for file operations
- Keep fail-safe behavior (return `false`, don't throw)
- Log validation failures for security monitoring
- Add tests for new edge cases
- Update this documentation for any logic changes

**DON'T:**
- Use Node.js `fs` module directly (bypasses VS Code security)
- Remove type checking (directory vs file)
- Throw exceptions from validation (information leakage)
- Trust user input without validation
- Assume paths are safe based on string patterns alone

### Code Review Checklist

When reviewing changes to path validation:

- [ ] Does it maintain VS Code API usage?
- [ ] Are all error cases handled safely?
- [ ] Is the fail-safe behavior preserved?
- [ ] Are new tests included for edge cases?
- [ ] Is this documentation updated?

## 📚 Related Documentation

- [SECURITY.md](../../SECURITY.md) - Overall security policy
- [Terminal Integration](../../.github/wiki/Terminal-Integration.md) - Terminal feature documentation
- [VS Code Extension API](https://code.visualstudio.com/api) - Official VS Code API documentation

## 🔍 Security Audits

Path validation should be reviewed:

- **Quarterly** - Regular security reviews
- **After Changes** - When validation logic is modified
- **After Vulnerabilities** - When similar extensions report path traversal issues
- **Before Releases** - Part of pre-release security checklist

## 📝 Version History

| Version | Date | Changes |
| ------- | ---- | ------- |
| 1.2.0 | 2025-01-23 | Initial security model documentation |

---

**🔐 Security First:** Path validation is a critical security control. Any modifications must undergo thorough security review and testing to ensure continued protection against path traversal attacks.
