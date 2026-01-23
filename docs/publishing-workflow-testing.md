# Publishing Workflow Testing Guide

This document provides a comprehensive testing checklist for validating the complete publishing workflow for the Additional Context Menus extension.

## Overview

The extension is published to three distribution channels:
1. **VS Code Marketplace** - Primary distribution for VS Code users
2. **Open VSX Registry** - Alternative registry for VSCodium, Gitpod, Eclipse Theia users
3. **GitHub Releases** - Direct VSIX download with release notes

## Prerequisites

Before testing the publishing workflow, ensure:

- [ ] Node.js 16+ is installed
- [ ] npm is installed and up to date
- [ ] You have access to the GitHub repository
- [ ] Required secrets are configured in GitHub:
  - `VS_MARKETPLACE_TOKEN` - VS Code Marketplace PAT
  - `OVSX_PAT` - Open VSX Registry PAT
  - `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Automated Validation

Run the automated validation script to check all configuration:

```bash
# Basic validation (local checks only)
npm run validate-workflow

# Full validation (includes registry API checks)
npm run validate-workflow:full
```

The script validates:
- Package.json configuration
- CI/CD workflow setup
- Publishing scripts
- Documentation
- Local environment
- Registry status (with --full flag)

## Manual Testing Checklist

### 1. Local Build and Package Testing

- [ ] **Build the extension**
  ```bash
  npm ci
  npm run build
  ```

- [ ] **Package the extension**
  ```bash
  npm run package
  ```
  - Verify VSIX file is created: `additional-context-menus-*.vsix`
  - Check file size is reasonable (< 1MB typically)

- [ ] **Test local installation**
  ```bash
  code --install-extension additional-context-menus-*.vsix
  ```
  - Verify extension activates correctly
  - Test context menu functionality

### 2. Open VSX Publishing Test

#### Option A: Manual Publishing (Recommended for first-time setup)

- [ ] **Set up authentication**
  ```bash
  export OVSX_PAT=your_token_here
  ```

- [ ] **Verify authentication**
  ```bash
  npm run verify-auth
  ```

- [ ] **Publish to Open VSX**
  ```bash
  npm run publish:ovsx
  ```
  Or use the interactive manual script:
  ```bash
  npm run publish:ovsx:manual
  ```

- [ ] **Verify publication**
  - Visit: https://open-vsx.org/extension/VijayGangatharan/additional-context-menus
  - Check version matches package.json
  - Verify metadata (name, description, icon) is correct

#### Option B: CI/CD Publishing

- [ ] **Trigger CI/CD pipeline**
  - Push to master branch
  - Or create a release tag

- [ ] **Monitor workflow execution**
  - Check GitHub Actions for the CI/CD workflow
  - Verify "Publish to Open VSX Registry" step succeeds

- [ ] **Verify publication**
  ```bash
  npm run verify-publications
  ```

### 3. VSCodium Installation Test

- [ ] **Install VSCodium** (if not already installed)
  - Download from: https://vscodium.com/

- [ ] **Search for extension**
  - Open VSCodium
  - Go to Extensions (Ctrl+Shift+X)
  - Search for "Additional Context Menus"
  - Verify extension appears in results

- [ ] **Install extension**
  - Click Install
  - Verify installation completes successfully

- [ ] **Test functionality**
  - Open a Node.js project
  - Right-click in a .ts/.tsx/.js/.jsx file
  - Verify context menu items appear:
    - Copy Function
    - Copy Lines to File
    - Move Lines to File
    - Save All
    - Open in Terminal

- [ ] **Test each command**
  - [ ] Copy Function - Select a function and copy
  - [ ] Copy Lines to File - Select code and copy to another file
  - [ ] Move Lines to File - Select code and move to another file
  - [ ] Save All - Save all open files
  - [ ] Open in Terminal - Open terminal in file's directory

### 4. Gitpod Installation Test

- [ ] **Create test workspace**
  - Create a `.gitpod.yml` file:
    ```yaml
    vscode:
      extensions:
        - VijayGangatharan.additional-context-menus
    ```

- [ ] **Open in Gitpod**
  - Push the configuration to a repository
  - Open the repository in Gitpod

- [ ] **Verify extension installation**
  - Check Extensions panel shows the extension
  - Verify extension is active

- [ ] **Test functionality**
  - Same tests as VSCodium above

### 5. GitHub Release Verification

- [ ] **Check release was created**
  - Visit: https://github.com/Vijay431/additional-contexts-menu/releases
  - Verify latest release exists with correct version tag

- [ ] **Verify release contents**
  - [ ] Release title matches version
  - [ ] Release notes are present and accurate
  - [ ] VSIX file is attached as asset

- [ ] **Test VSIX download**
  - Download the VSIX from the release
  - Install manually in VS Code:
    ```bash
    code --install-extension downloaded-file.vsix
    ```
  - Verify extension works correctly

### 6. Version Synchronization Test

- [ ] **Check version consistency**
  - package.json version
  - VS Code Marketplace version
  - Open VSX Registry version
  - GitHub Release tag

All versions should match after a successful publish.

### 7. Error Handling Test

- [ ] **Test Open VSX failure isolation**
  - Temporarily use invalid OVSX_PAT
  - Verify VS Code Marketplace publishing continues
  - Verify GitHub release is still created

- [ ] **Test retry logic**
  - Monitor logs for retry attempts on network errors
  - Verify exponential backoff is applied

## Troubleshooting

### Common Issues

#### Extension not appearing on Open VSX

1. Wait 5-10 minutes for registry to update
2. Check CI/CD logs for publishing errors
3. Verify OVSX_PAT is valid and not expired
4. Try manual publishing: `npm run publish:ovsx:manual`

#### GitHub Release not created

1. Check workflow has `contents: write` permission
2. Verify GITHUB_TOKEN is available
3. Check for existing release with same tag
4. Review workflow logs for errors

#### Version mismatch between registries

1. Ensure single VSIX package is used for both
2. Check for failed publishing steps in CI/CD
3. Manually publish to the out-of-sync registry

### Getting Help

- Check existing issues: https://github.com/Vijay431/additional-contexts-menu/issues
- Review CI/CD logs in GitHub Actions
- Consult Open VSX documentation: https://github.com/eclipse/openvsx/wiki

## Verification Scripts

| Script | Purpose |
|--------|---------|
| `npm run validate-workflow` | Validate local configuration |
| `npm run validate-workflow:full` | Full validation with registry checks |
| `npm run verify-auth` | Verify Open VSX authentication |
| `npm run verify-publications` | Verify both registry publications |

## Success Criteria

The publishing workflow is considered fully validated when:

1. ✅ All automated validation checks pass
2. ✅ Extension is visible on Open VSX Registry
3. ✅ Extension installs correctly in VSCodium
4. ✅ Extension installs correctly in Gitpod
5. ✅ GitHub release is created with VSIX attachment
6. ✅ All context menu commands work in alternative editors
7. ✅ Version numbers are synchronized across all channels
