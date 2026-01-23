# Open VSX Registry Setup Guide

This guide explains how to set up authentication for publishing the Additional Context Menus extension to the Open VSX Registry.

## Prerequisites

- Access to the GitHub repository with admin permissions
- Open VSX Registry account (create at [open-vsx.org](https://open-vsx.org))

## Step 1: Create Open VSX Registry Account

1. Visit [open-vsx.org](https://open-vsx.org)
2. Sign in with your GitHub account
3. Navigate to your profile settings
4. Create a new Personal Access Token (PAT)
5. Copy the generated token (you won't be able to see it again)

## Step 2: Configure GitHub Repository Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set the following:
   - **Name**: `OVSX_PAT`
   - **Secret**: Paste the Personal Access Token from Open VSX Registry
5. Click **Add secret**

## Step 3: Verify Configuration

The CI/CD workflow is already configured to use the `OVSX_PAT` secret. When you push to the master branch, the workflow will:

1. Build and package the extension
2. Publish to VS Code Marketplace using `VS_MARKETPLACE_TOKEN`
3. Publish to Open VSX Registry using `OVSX_PAT`
4. Continue with marketplace publishing even if Open VSX fails (`continue-on-error: true`)

## Environment Variables in CI/CD

The workflow uses the following environment variables:

```yaml
env:
  VSCE_PAT: ${{ secrets.VS_MARKETPLACE_TOKEN }}  # VS Code Marketplace
  OVSX_PAT: ${{ secrets.OVSX_PAT }}              # Open VSX Registry
```

## Publishing Commands

The package.json includes the following publishing scripts:

- `npm run publish:marketplace` - Publishes to VS Code Marketplace only
- `npm run publish:ovsx` - Publishes to Open VSX Registry only  
- `npm run publish` - Publishes to both registries

## Troubleshooting

### Authentication Errors

If you see authentication errors:

1. Verify the `OVSX_PAT` secret is correctly set in GitHub
2. Check that the Open VSX token hasn't expired
3. Ensure the token has the necessary permissions

### Manual Publishing

If automated publishing fails, you can publish manually:

```bash
# Install ovsx CLI globally
npm install -g ovsx

# Package the extension
npm run package

# Publish to Open VSX with your token
ovsx publish additional-context-menus-*.vsix -p YOUR_OVSX_TOKEN
```

### Token Renewal

Open VSX tokens may expire. To renew:

1. Generate a new token in your Open VSX profile
2. Update the `OVSX_PAT` secret in GitHub repository settings
3. The next deployment will use the new token

## Security Considerations

- The `OVSX_PAT` token is stored securely as a GitHub secret
- The token is never logged or exposed in workflow output
- Use `continue-on-error: true` to prevent Open VSX failures from blocking marketplace publishing
- Tokens should be rotated periodically for security

## Verification

After successful publishing, verify the extension appears at:
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus
- Open VSX Registry: https://open-vsx.org/extension/VijayGangatharan/additional-context-menus