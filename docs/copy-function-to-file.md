# Copy Function to File

Place your cursor inside a function, right-click and choose **Copy Function to File**.

Pick a target file from the list — the function is inserted after the imports in that file. No imports are copied; only the function body is transferred.

**Example:**

```ts
// utils/date.ts  ← cursor is here
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
```

After running the command and selecting `helpers/display.ts`, the function appears in `display.ts` at the smart insertion point.

**Tip:** Use **Move Function to File** if you want to remove it from the source at the same time.
