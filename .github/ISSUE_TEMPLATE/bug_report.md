---
name: Bug report
about: Create a report to help us improve Additional Context Menus
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear description of the context menu issue or code operation problem.

**To Reproduce**
Steps to reproduce:

1. Open a Node.js project (React/Angular/Express/Next.js)
2. Right-click in a .ts/.tsx/.js/.jsx file
3. Try to use '...' context menu option
4. See error/unexpected behavior

**Expected behavior**
What you expected the context menu or code operation to do.

**Project Information**

- Project Type: [React/Angular/Express/Next.js/Other Node.js]
- File Type: [.ts/.tsx/.js/.jsx]
- Function/Code Context: [e.g., inside React component, Express route, function declaration]
- Package.json present: [Yes/No]

**Environment**

- OS: [Windows/macOS/Linux]
- VS Code Version: [e.g. 1.102.0]
- Extension Version: [e.g. 1.0.0]
- Node.js Version: [e.g. 18.17.0]
- TypeScript Version: [e.g. 4.9.0] (if applicable)

**Test Environment** (for reproduction)

- Workspace Type: [Single folder/Multi-root workspace/No workspace]
- Project Size: [Small (<100 files)/Medium (100-1000 files)/Large (>1000 files)]
- File Path Complexity: [Standard paths/Special characters/Very long paths]
- Concurrent Operations: [Single operation/Multiple simultaneous operations]

**Context Menu Behavior**

- [ ] Context menus don't appear at all
- [ ] Context menus appear but commands don't work
- [ ] Copy Function doesn't detect functions correctly
- [ ] Copy/Move operations fail with imports
- [ ] Save All doesn't work properly
- [ ] **Open in Terminal doesn't work** (NEW in v1.2.0)
- [ ] Other:

**Terminal Functionality Issues** (v1.2.0+)

- [ ] **Terminal doesn't open**: No response when clicking "Open in Terminal"
- [ ] **Wrong directory**: Terminal opens in incorrect location
- [ ] **Platform issues**: Cross-platform terminal problems (Windows/macOS/Linux)
- [ ] **Configuration issues**: Custom terminal commands not working
- [ ] **Permission errors**: Terminal access denied or permission problems
- [ ] **External terminal**: Custom external terminal command fails
- [ ] **System default**: System default terminal doesn't open correctly

**Edge Case Context** (if applicable)

- [ ] Issue occurs with extremely large files (1000+ functions)
- [ ] Issue occurs with special characters in file paths
- [ ] Issue occurs during rapid successive operations
- [ ] Issue occurs with deeply nested function structures
- [ ] Issue occurs with concurrent operations
- [ ] Issue occurs with malformed/unusual code syntax
- [ ] Issue occurs with complex TypeScript types/generics
- [ ] Issue occurs with complex JSX components
- [ ] Issue occurs in multi-workspace scenarios
- [ ] Issue occurs with symbolic links or unusual file system structures

**Screenshots**
If applicable, add screenshots of context menus, error messages, or code examples.

**Additional context**
Any other context about the problem, including workspace setup, project structure, or specific code patterns.
