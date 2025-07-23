## Description

Brief description of the context menu or code operation changes.

## Type of Change

- [ ] Bug fix (context menu not appearing/working)
- [ ] New context menu feature
- [ ] Code operation enhancement
- [ ] Framework support improvement
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Other (please describe):

## Framework Testing

Test your changes across different project types:

- [ ] Tested with React projects
- [ ] Tested with Angular projects
- [ ] Tested with Express projects
- [ ] Tested with Next.js projects
- [ ] Tested with TypeScript files (.ts, .tsx)
- [ ] Tested with JavaScript files (.js, .jsx)

## Context Menu Testing

Verify all context menu functionality:

- [ ] Copy Function works correctly and detects functions
- [ ] Copy to Existing File handles imports properly
- [ ] Move to Existing File cleans up source file
- [ ] Save All shows progress feedback
- [ ] Context menus appear in correct file types
- [ ] Project detection works properly (Node.js projects only)

## Edge Case Testing

Test the extension with challenging scenarios:

- [ ] Large files (1000+ functions) - extension remains responsive
- [ ] Files with special characters in paths - operations work correctly
- [ ] Rapid successive command executions - no conflicts or crashes
- [ ] Deeply nested function structures (20+ levels) - proper detection
- [ ] Concurrent operations - multiple commands execute safely
- [ ] Malformed but parseable code - graceful handling
- [ ] Complex TypeScript syntax (generics, decorators) - accurate parsing
- [ ] Complex JSX components - proper component detection
- [ ] Multi-workspace scenarios - correct project detection
- [ ] Symbolic links and unusual file structures - robust handling

## Code Operation Testing

Test the core functionality:

- [ ] AST parsing handles edge cases (arrow functions, async functions, etc.)
- [ ] Import merging works correctly (no duplicates)
- [ ] Function detection is accurate for different syntax patterns
- [ ] Code insertion points are smart and appropriate
- [ ] Comment preservation works during copy/move
- [ ] Conflict resolution handles duplicates appropriately

## Development Checklist

- [ ] Code follows TypeScript strict mode
- [ ] ESLint checks pass
- [ ] All tests pass (37/37 expected)
- [ ] Extension builds successfully (npm run compile)
- [ ] Extension packages correctly (npm run package)
- [ ] Manual testing completed
- [ ] Documentation updated (if applicable)
- [ ] No unnecessary console logs or debug code
- [ ] Error handling implemented for new features
- [ ] Performance impact considered

## Test Coverage

Ensure comprehensive test coverage is maintained:

- [ ] New functionality has corresponding tests
- [ ] Edge cases are covered in test suite
- [ ] Performance impacts are tested
- [ ] Error conditions are tested
- [ ] Test success rate remains at 100% (37/37 passing)
- [ ] Integration tests cover framework-specific scenarios

## Production Readiness

Verify the changes are ready for production deployment:

- [ ] Changes handle edge cases gracefully
- [ ] No performance degradation under stress
- [ ] Memory usage remains efficient
- [ ] Concurrent operations work safely
- [ ] Error boundaries prevent crashes
- [ ] Logging provides adequate debugging information

## Deployment Checklist

(Only for maintainers preparing releases)

- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated with new version and changes
- [ ] README.md updated (if applicable)
- [ ] GitHub release draft prepared
- [ ] VS Code Marketplace description updated (if applicable)

## Screenshots/Demos

If applicable, add screenshots or GIFs showing:

- Context menus in action
- Before/after code examples
- New functionality demonstrations

## Additional Notes

Add any additional notes for reviewers, including:

- Breaking changes
- Configuration changes
- Known limitations
- Future improvements needed
