# Contributing to Additional Context Menus

Thank you for helping grow Additional Context Menus! This project is a community-driven VS Code extension maintained by Vijay Gangatharan with support from volunteer contributors. We welcome bug reports, feature proposals, documentation improvements, and tooling updates.

---

## Code of Conduct

Participation in this project is governed by the [Contributor Covenant](CODE_OF_CONDUCT.md). Please read it before starting any contribution. Harassment or abusive behaviour will not be tolerated.

---

## Ways to Contribute

- 🐛 **Report bugs** using the "Bug report" issue template.
- 💡 **Suggest features** or improvements via the "Feature request" template or GitHub discussions.
- 🛠️ **Submit pull requests** that fix issues, improve documentation, add tests, or enhance automation.
- 📣 **Share feedback** about the user experience, governance, or roadmap in discussions.

Before opening a new issue, please search existing issues to avoid duplicates.

---

## Development Prerequisites

- Node.js 16–24 (18+ recommended)
- npm (bundled with Node.js)
- Visual Studio Code 1.105.0+ with the Biome extension (`biomejs.biome`)
- Git

Install dependencies after cloning:

```bash
git clone https://github.com/Vijay431/additional-contexts-menu.git
cd additional-contexts-menu
npm install
```

---

## Project Standards

- **Language:** TypeScript (strict mode enabled)
- **Architecture:** Service-oriented (see `CLAUDE.md` for context)
- **Lint/Format:** [Biome](https://biomejs.dev/)
- **Testing:** Mocha with @vscode/test-electron
- **Versioning:** Semantic Versioning, changelog follows Keep a Changelog format

Please keep changes aligned with the existing style and tailor solutions to the extension's service architecture.

---

## Contribution Workflow

1. **Plan**
   - For significant changes, create an issue or discussion to align on scope.
   - Confirm that the feature fits the roadmap and is not already underway.

2. **Branch**
   - Use descriptive branch names: `feature/<topic>`, `fix/<issue-number>`, `docs/<area>`.
   - Keep pull requests focused and scoped to a single problem.

3. **Implement**
   - Update or add tests alongside code changes.
   - Follow existing code conventions and directory layout.
   - Update documentation when behaviour, APIs, or tooling change.

4. **Quality Gate**
   ```bash
   npm ci
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   ```
   - Use `npm run lint:fix` and `npm run format` for automatic fixes when necessary.
   - Confirm Git status is clean before submitting your pull request.

5. **Submit**
   - Fill out the pull request template completely.
   - Reference related issues using `Fixes #123` syntax when applicable.
   - Request review from maintainers (CODEOWNERS). Additional reviewers are welcome.

6. **Review**
   - Be responsive to feedback and keep discussion respectful.
   - Squash or rebase commits as requested by maintainers.

---

## Commit & PR Guidelines

- Use [Conventional Commits](https://www.conventionalcommits.org/) when possible (`feat:`, `fix:`, `docs:`, `chore:`…).
- Keep commit messages short and descriptive.
- Document breaking changes clearly in both the commit and pull request description.
- Large PRs should be split into logical chunks for easier review.

---

## Documentation & Changelog

- Update `README.md`, docs under `docs/`, and wiki pages when user-facing behaviour changes.
- Add an entry to `CHANGELOG.md` under the "Unreleased" section summarising the change and crediting contributors.
- Reference new governance policies or automation changes where appropriate.

---

## Testing Tips

- Use `npm run watch` while iterating to rebuild on changes.
- Run `npm test` before every PR to execute the optimized test suite.
- Use `npm run test:full` when modifying core functionality that touches activation or terminal behaviour.
- Clean test artifacts with `npm run test:clean` if VS Code runs become flaky.

---

## Publishing & Distribution

This extension is published to both the VS Code Marketplace and Open VSX Registry for maximum compatibility with VS Code alternatives like VSCodium, Gitpod, and Eclipse Theia.

### Dual Publishing Process

The CI/CD pipeline automatically publishes to both registries when changes are pushed to the master branch:

1. **VS Code Marketplace** - Primary distribution channel for VS Code users
2. **Open VSX Registry** - Alternative registry for open-source VS Code implementations

The workflow builds a single VSIX package that works for both registries, ensuring consistency across distribution channels. Publishing happens in parallel, with Open VSX failures isolated to prevent blocking marketplace publication.

### Publishing Scripts

| Script | Description |
|--------|-------------|
| `npm run package` | Creates the VSIX package locally |
| `npm run publish:marketplace` | Publishes to VS Code Marketplace only |
| `npm run publish:ovsx` | Publishes to Open VSX Registry only |
| `npm run publish` | Publishes to both registries (used in CI/CD) |

### Authentication Setup

For maintainers setting up publishing credentials:

1. **VS Code Marketplace**: Requires `VS_MARKETPLACE_TOKEN` GitHub secret
2. **Open VSX Registry**: Requires `OVSX_PAT` GitHub secret

See [docs/open-vsx-setup.md](docs/open-vsx-setup.md) for detailed setup instructions.

### Manual Open VSX Publishing

If automated publishing fails or you need to publish manually, follow these steps:

```bash
# 1. Install the ovsx CLI globally (if not already installed)
npm install -g ovsx

# 2. Ensure you have a clean build
npm ci
npm run vscode:prepublish

# 3. Package the extension
npm run package

# 4. Verify the package was created
ls -la *.vsix

# 5. Publish to Open VSX with your personal access token
ovsx publish additional-context-menus-*.vsix -p YOUR_OVSX_TOKEN

# Alternative: Use environment variable for token
export OVSX_PAT=your_token_here
ovsx publish additional-context-menus-*.vsix -p $OVSX_PAT
```

You can also use the retry script for more robust publishing:

```bash
node scripts/publish-ovsx-with-retry.js
```

### Troubleshooting Open VSX Publishing Issues

#### Authentication Errors

**Symptoms:** "401 Unauthorized" or "Authentication failed" errors

**Solutions:**
1. Verify `OVSX_PAT` secret is correctly set in GitHub repository settings
2. Check that the Open VSX token hasn't expired (tokens may have expiration dates)
3. Ensure the token has the necessary publishing permissions
4. Regenerate the token if needed:
   - Go to [open-vsx.org](https://open-vsx.org) → Profile → Access Tokens
   - Create a new token and update the GitHub secret

#### Network and Timeout Errors

**Symptoms:** "ETIMEDOUT", "ECONNRESET", or "Network error" messages

**Solutions:**
1. The CI/CD workflow includes retry logic with exponential backoff
2. For manual publishing, wait a few minutes and retry
3. Check [Open VSX status](https://open-vsx.org) for any service outages
4. Use the retry script: `node scripts/publish-ovsx-with-retry.js`

#### Package Validation Errors

**Symptoms:** "Invalid VSIX package" or metadata validation failures

**Solutions:**
1. Ensure all required fields are present in `package.json`:
   - `publisher`, `name`, `displayName`, `description`, `version`
   - `repository`, `license`, `icon`
2. Verify the icon file exists and is properly referenced
3. Run `npm run package` locally and inspect the generated VSIX
4. Check that the package size is within limits

#### Version Conflict Errors

**Symptoms:** "Version already exists" or version-related errors

**Solutions:**
1. Ensure the version in `package.json` is incremented
2. Check both registries to confirm the current published version
3. Never attempt to republish an existing version number
4. Use semantic versioning: `major.minor.patch`

#### Token Renewal Process

Open VSX tokens may expire. To renew:

1. Log in to [open-vsx.org](https://open-vsx.org) with your GitHub account
2. Navigate to Profile → Access Tokens
3. Generate a new Personal Access Token
4. Copy the token immediately (it won't be shown again)
5. Update the `OVSX_PAT` secret in GitHub:
   - Go to Repository → Settings → Secrets and variables → Actions
   - Update the `OVSX_PAT` secret with the new token
6. The next CI/CD run will use the updated token

### Failure Handling

The CI/CD workflow uses `continue-on-error: true` for Open VSX publishing, ensuring that:
- VS Code Marketplace publishing continues even if Open VSX fails
- Open VSX issues don't block the primary distribution channel
- Failed Open VSX publications are logged for manual follow-up

If Open VSX publishing fails in CI/CD:
1. Check the workflow logs for specific error messages
2. Attempt manual publishing using the steps above
3. Create an issue if the problem persists

### Registry URLs

After successful publishing, verify the extension appears at:
- **VS Code Marketplace**: https://marketplace.visualstudio.com/items?itemName=VijayGangatharan.additional-context-menus
- **Open VSX Registry**: https://open-vsx.org/extension/VijayGangatharan/additional-context-menus

### Verification Scripts

Use the verification scripts to confirm successful publication:

```bash
# Verify both publications
node scripts/verify-publications.js

# Verify authentication is working
node scripts/verify-auth.js
```

---

## Maintainers & Governance

- Maintainers review PRs, manage releases, and curate the roadmap.
- Contributors may be invited to become maintainers after demonstrating sustained, high-quality contributions and community stewardship.
- Decisions favour consensus. If consensus cannot be reached, the maintainer has final say while documenting rationale.

Thank you for putting your time and energy into Additional Context Menus. We appreciate every contribution that improves the experience for the community! 🚀
