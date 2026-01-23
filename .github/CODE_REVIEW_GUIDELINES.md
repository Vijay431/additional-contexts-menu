# Code Review Guidelines

This document outlines the code review process and standards for the Additional Context Menus VS Code extension. These guidelines help maintain code quality, ensure consistency, and provide constructive feedback to contributors.

## Purpose of Code Review

Code reviews serve multiple purposes:

- **Quality Assurance**: Catch bugs, logic errors, and potential issues before they reach users
- **Knowledge Sharing**: Help reviewers and authors learn from each other
- **Consistency**: Maintain consistent code style and architecture
- **Documentation**: Ensure code is well-documented and understandable
- **Collaboration**: Foster a collaborative and supportive development culture

## Review Process

### 1. Automated Checks

Before human review, all pull requests must pass automated checks:

- ✅ Biome linting (code quality)
- ✅ Biome formatting (code style)
- ✅ TypeScript type checking (strict mode)
- ✅ Test suite execution (all tests passing)
- ✅ Build verification (successful compilation)

**Action**: If automated checks fail, the author should fix issues before requesting review.

### 2. Reviewer Assignment

- Pull requests are automatically assigned based on the CODEOWNERS file
- Authors can request specific reviewers if needed
- At least one maintainer approval is required before merging

### 3. Review Timeline

- **Initial review**: Within 5 business days of submission
- **Follow-up reviews**: Within 3 business days of updates
- **Urgent fixes**: Prioritized for faster review (security, critical bugs)

### 4. Review Outcomes

Reviewers can:

- **Approve**: Code is ready to merge
- **Request Changes**: Issues must be addressed before merging
- **Comment**: Provide feedback without blocking merge
- **Dismiss**: Previous review is no longer valid (after significant changes)

## What to Review

### Code Quality

- [ ] **Correctness**: Does the code do what it's supposed to do?
- [ ] **Logic**: Is the logic sound and free of bugs?
- [ ] **Edge Cases**: Are edge cases and error conditions handled?
- [ ] **Performance**: Are there any obvious performance issues?
- [ ] **Security**: Are there any security vulnerabilities?

### Code Style and Structure

- [ ] **Readability**: Is the code easy to read and understand?
- [ ] **Naming**: Are variables, functions, and classes well-named?
- [ ] **Complexity**: Is the code unnecessarily complex?
- [ ] **DRY Principle**: Is there unnecessary code duplication?
- [ ] **SOLID Principles**: Does the code follow good design principles?

### Architecture and Design

- [ ] **Consistency**: Does the code follow existing patterns?
- [ ] **Service-Oriented**: Does it fit the service-oriented architecture?
- [ ] **Separation of Concerns**: Are responsibilities properly separated?
- [ ] **Extensibility**: Is the code easy to extend or modify?
- [ ] **Dependencies**: Are dependencies appropriate and minimal?

### Testing

- [ ] **Test Coverage**: Are there tests for new functionality?
- [ ] **Test Quality**: Do tests actually verify the behavior?
- [ ] **Edge Cases**: Are edge cases tested?
- [ ] **Test Clarity**: Are test names and assertions clear?
- [ ] **No Mocks Abuse**: Are mocks used appropriately (prefer real implementations)?

### Documentation

- [ ] **Code Comments**: Are complex sections explained?
- [ ] **JSDoc/TSDoc**: Are public APIs documented?
- [ ] **README Updates**: Is user-facing documentation updated?
- [ ] **CHANGELOG**: Is CHANGELOG.md updated (if applicable)?
- [ ] **Examples**: Are usage examples provided where helpful?

### VS Code Extension Best Practices

- [ ] **Activation Events**: Are activation events optimized?
- [ ] **API Usage**: Is the VS Code API used correctly?
- [ ] **Performance**: Does it minimize impact on editor performance?
- [ ] **Accessibility**: Are accessibility considerations addressed?
- [ ] **Error Handling**: Are errors handled gracefully with user-friendly messages?

### Breaking Changes

- [ ] **Identified**: Are breaking changes clearly identified?
- [ ] **Documented**: Are they documented in the PR description and CHANGELOG?
- [ ] **Justified**: Is the breaking change necessary and justified?
- [ ] **Migration Path**: Is there a clear migration path for users?
- [ ] **Version Bump**: Is the version bump appropriate (MAJOR version)?

## How to Provide Feedback

### Be Constructive and Respectful

- ✅ **Do**: "Consider extracting this logic into a separate function for better testability"
- ❌ **Don't**: "This code is terrible"

### Be Specific

- ✅ **Do**: "Line 42: This variable name `x` is unclear. Consider renaming to `fileCount`"
- ❌ **Don't**: "The naming is bad"

### Explain Your Reasoning

- ✅ **Do**: "Using `const` instead of `let` here prevents accidental reassignment and makes the intent clearer"
- ❌ **Don't**: "Use const"

### Distinguish Between Required and Optional

- **Required changes**: Use "must", "should", or "needs to"
  - Example: "This needs error handling for the case where the file doesn't exist"
- **Suggestions**: Use "consider", "what about", or "nit"
  - Example: "Nit: Consider adding a blank line here for readability"

### Ask Questions

- "Can you explain the reasoning behind this approach?"
- "Have you considered using X instead of Y?"
- "What happens if this value is null?"

### Acknowledge Good Work

- "Nice refactoring!"
- "Great test coverage!"
- "This is much clearer than the previous implementation"

## Review Checklist

Use this checklist when reviewing pull requests:

### Before Starting Review

- [ ] Read the PR description and understand the goal
- [ ] Check that automated checks are passing
- [ ] Review related issues or discussions
- [ ] Pull the branch locally if needed for testing

### During Review

- [ ] Review code changes line by line
- [ ] Check for potential bugs or logic errors
- [ ] Verify test coverage and quality
- [ ] Ensure documentation is updated
- [ ] Check for breaking changes
- [ ] Verify accessibility considerations
- [ ] Test the changes locally (if significant)

### Before Approving

- [ ] All concerns have been addressed or discussed
- [ ] Tests are passing
- [ ] Documentation is complete
- [ ] CHANGELOG is updated (if applicable)
- [ ] No obvious issues remain

## For Authors: Responding to Reviews

### Be Open to Feedback

- Remember that reviews are about the code, not about you personally
- Consider feedback carefully, even if you initially disagree
- Ask for clarification if feedback is unclear

### Respond to All Comments

- Address each comment, even if just to acknowledge it
- Explain your reasoning if you disagree with a suggestion
- Mark conversations as resolved once addressed

### Make Changes Incrementally

- Push commits that address specific feedback
- Use clear commit messages (e.g., "Address review feedback: improve error handling")
- Avoid force-pushing unless necessary (preserves review context)

### Request Re-Review

- After addressing feedback, request re-review from the same reviewers
- Summarize what changes you made in a comment
- Highlight any areas where you need additional input

## Special Cases

### Urgent Fixes

For critical bugs or security issues:

- Label the PR as "urgent" or "security"
- Notify reviewers directly
- Expedited review process (within 24 hours)
- May require only one approval for critical security fixes

### Large Pull Requests

For large changes:

- Consider breaking into smaller PRs if possible
- Provide a detailed description and context
- Highlight key areas that need careful review
- Schedule a synchronous review session if needed

### Experimental or RFC Pull Requests

For experimental changes or requests for comments:

- Label as "RFC" or "experimental"
- Focus review on approach and design rather than implementation details
- Discuss in GitHub Discussions first if appropriate

## Merge Strategies

### Squash and Merge (Preferred)

- Use for most pull requests
- Creates a clean, linear history
- Combine all commits into one with a clear message

### Rebase and Merge

- Use for pull requests with well-crafted commit history
- Preserves individual commits
- Maintains a linear history

### Merge Commit

- Rarely used
- Preserves full branch history
- Can create a more complex history

## After Merging

- [ ] Delete the feature branch
- [ ] Close related issues (if applicable)
- [ ] Update project board or tracking system
- [ ] Thank the contributor
- [ ] Monitor for any issues in the next release

## Resources

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) - Community standards
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines) - Official VS Code extension best practices

## Questions?

If you have questions about the review process, please:

- Ask in the pull request comments
- Start a discussion in GitHub Discussions
- Reach out to maintainers

---

Thank you for helping maintain the quality of this project! 🙏
