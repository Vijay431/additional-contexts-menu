# Move Selection to File

Select any block of code, right-click, and choose **Move Selection to File**.

The selected code is inserted into the target file and removed from the source — in one step.

**Example:**

```ts
// Select these lines in api/users.ts:
const buildQuery = (params: Record<string, string>): string => {
  return new URLSearchParams(params).toString();
};
```

After selecting `utils/query.ts`, `buildQuery` appears there and is deleted from `api/users.ts`.

**Tip:** Use **Copy Selection to File** if you want to keep the original in place.
