# Security Policy

## Supported Versions

| Version | Supported | Node.js Compatibility |
| ------- | --------- | --------------------- |
| 1.3.x   | ✅        | Node.js 16-24         |
| 1.2.x   | ✅        | Node.js 16-24         |
| 1.1.x   | ⚠️        | Critical fixes only   |
| ≤1.0.x  | ❌        | Unsupported           |

## Reporting a Vulnerability

If you discover a security issue, please report it privately so we can address it responsibly.

1. Email [vijayanand431+security@gmail.com](mailto:vijayanand431+security@gmail.com) with "Security" in the subject line.
2. Provide a clear description, reproduction steps, and potential impact.
3. Expect acknowledgement within **48 hours** and a status update within **5 business days**.
4. We prefer encrypted reports; request our PGP key in your initial email if needed.

Do not create public issues for exploitable vulnerabilities.

## Response Process

- Triage: confirm severity and scope.
- Mitigation: develop fix, tests, and documentation updates.
- Coordination: credit reporters (if desired) and prepare advisories.
- Release: publish patched versions and announce via changelog and GitHub advisory.

## Safe Harbor

We encourage good-faith research:

- Avoid privacy violations and data destruction.
- Limit testing to your own environments unless you have consent.
- Report promptly and cooperate in remediation.

## Dependencies

Security updates include dependency audits. Dependabot runs weekly for npm and monthly for GitHub Actions. Automated fixes are surfaced via PRs tagged `security`.

## Staying Informed

- Subscribe to GitHub releases for security announcements.
- Monitor `CHANGELOG.md` for entries marked "Security".
- Review Dependabot PRs for dependency changes.

Thank you for helping keep Additional Context Menus secure for everyone!
