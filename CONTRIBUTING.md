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

## Maintainers & Governance

- Maintainers review PRs, manage releases, and curate the roadmap.
- Contributors may be invited to become maintainers after demonstrating sustained, high-quality contributions and community stewardship.
- Decisions favour consensus. If consensus cannot be reached, the maintainer has final say while documenting rationale.

Thank you for putting your time and energy into Additional Context Menus. We appreciate every contribution that improves the experience for the community! 🚀
