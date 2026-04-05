# Move Function to File

Place your cursor inside a function, right-click and choose **Move Function to File**.

Pick a target file — the function is inserted there and deleted from the source. No imports are copied; only the function body is transferred.

**Example:**

```ts
// components/UserCard.tsx  ← cursor is here
const truncate = (text: string, max: number): string => {
  return text.length > max ? text.slice(0, max) + '…' : text;
};
```

After selecting `utils/string.ts`, `truncate` appears in `string.ts` and is removed from `UserCard.tsx`.

**Tip:** Use **Copy Function to File** if you want to keep the original in place.
