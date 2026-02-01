---
name: Testing Issue
about: Report test failures, test coverage issues, or suggest test improvements
title: '[TEST] '
labels: testing
assignees: ''
---

## Test Issue Type (check one)

- [ ] **Test Failure** - Test is failing
- [ ] **Missing Test** - Test is missing for a feature
- [ ] **Flaky Test** - Test passes/fails inconsistently
- [ ] **Test Coverage** - Low or missing test coverage
- [ ] **Test Performance** - Tests are too slow
- [ ] **Test Quality** - Test needs improvement
- [ ] **Test Infrastructure** - Test framework or setup issues
- [ ] **E2E Testing** - End-to-end test issues

## Test Suite Information

**Test Suite:**

- [ ] Unit Tests (test/suite/)
- [ ] E2E Tests (test/e2e/)
- [ ] Integration Tests
- [ ] Service Tests
- [ ] Command Tests
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Test File:**
`test/` path to test file

## Test Failure Details (if applicable)

**Failing Test:**

```typescript
[Provide failing test code]
```

**Error Message:**

```bash
[Paste error message or stack trace]
```

**Expected Result:**
What should test return/assert?

**Actual Result:**
What does test actually return/assert?

## Reproduction Steps

1. Run `pnpm test` or `pnpm test:full`
2. Test **\*\***\_\_\_\_**\*\*** fails with **\*\***\_\_\_\_**\*\***
3. See error

## Test Environment

- **Node.js:** Version
- **VS Code:** Version
- **OS:** Windows/macOS/Linux
- **Test Command:** Which command was run?

**Test Execution Mode:**

- [ ] Headless (`HEADLESS=true`)
- [ ] Full mode (`HEADLESS=false`)
- [ ] Minimal package (optimized)
- [ ] Full package

## Test Coverage Issue (if applicable)

**Missing Coverage:**
Which code or feature needs test coverage?

**Current Coverage:**
What's the current test coverage (if known)?

**Desired Coverage:**
What level of coverage is needed?

**Affected Component:**

- [ ] Code Analysis Service
- [ ] Configuration Service
- [ ] File Discovery Service
- [ ] File Save Service
- [ ] Terminal Service
- [ ] Project Detection Service
- [ ] Generator Services
- [ ] Extension Manager
- [ ] Context Menu Manager
- [ ] Other: **\*\***\_\_\_\_**\*\***

## Flaky Test Details (if applicable)

**Test Behavior:**
How often does the test fail?

- [ ] Always fails
- [ ] Intermittently (specify frequency)
- [ ] Only in CI
- [ ] Only locally
- [ ] Only on specific platforms

**Pattern:**
Is there a pattern to when it fails?

**Suspected Cause:**
What might be causing flakiness?

## Test Performance Issue (if applicable)

**Slow Test:**
Which test(s) are slow?

**Execution Time:**
How long do tests take?

**Expected Time:**
How long should they take?

**Bottleneck:**
Where is the performance issue?

## Test Quality Issue (if applicable)

**Test Quality Problems:**

- [ ] Test is unclear or hard to understand
- [ ] Test is brittle or fragile
- [ ] Test has poor coverage
- [ ] Test has poor assertions
- [ ] Test duplicates other tests
- [ ] Test is not maintainable
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Suggested Improvements:**
How can test quality be improved?

```typescript
[Provide improved test code]
```

## Test Infrastructure Issue (if applicable)

**Infrastructure Problems:**

- [ ] Test setup issues
- [ ] Test fixture problems
- [ ] Mock/stub issues
- [ ] Test runner issues
- [ ] Environment-specific issues
- [ ] Other: **\*\***\_\_\_\_**\*\***

**Current Setup:**
Describe test setup and configuration.

**Expected Setup:**
What should test setup be?

## Test Addition Request (if applicable)

**Feature Missing Test:**
Which feature needs test coverage?

**Test Scenarios Needed:**
List test scenarios that should be added:

1. ***
2. ***
3. ***

**Test Type:**

- [ ] Unit test
- [ ] Integration test
- [ ] E2E test
- [ ] Performance test
- [ ] Other: **\*\***\_\_\_\_**\*\***

## Proposed Test Code

If suggesting new or improved tests:

```typescript
describe('Feature Name', () => {
  test('should do something', () => {
    // Arrange
    const input = 'test input';

    // Act
    const result = functionUnderTest(input);

    // Assert
    assert.strictEqual(result, expectedOutput);
  });
});
```

## Related Code

**Code Being Tested:**

```typescript
[Provide code snippet that needs test coverage]
```

**File Path:**
`src/services/` or `src/managers/` etc.

## Additional Context

**Test History:**
Has this test ever passed?

- [ ] Yes, passed before version **\*\***\_\_\_\_**\*\***
- [ ] No, always failed

**Related Issues:**
Link to related GitHub issues or PRs.

**Test Documentation:**
Links to test documentation or guidelines.

## Priority

How critical is this test issue?

- [ ] Critical - Blocking development/CI
- [ ] High - Important for quality
- [ ] Medium - Should be addressed soon
- [ ] Low - Nice to have improvement

---

**Thank you for helping improve test quality!** 🧪
