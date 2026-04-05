# Copy Function

Place your cursor anywhere inside a function, then right-click and choose **Copy Function**.

The full function is copied to your clipboard, ready to paste anywhere.

**Example — before:**

```ts
// cursor is inside this function
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
```

**After:** Your clipboard contains the complete `formatDate` function, including the `const` declaration.

**Supported types:** regular functions, arrow functions, async functions, class methods, React components, and hooks.
