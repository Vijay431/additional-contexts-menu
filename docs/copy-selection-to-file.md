# Copy Selection to File

Select any block of code in a TypeScript or JavaScript file, right-click, and choose **Copy Selection to File**.

The extension will:

- Show a file picker listing all compatible files in your project
- Insert the selected code at the smart insertion point (after imports, before exports)
- Merge or skip duplicate import statements automatically

**Example:**

```ts
// Select these lines:
const API_BASE = 'https://api.example.com';
const TIMEOUT_MS = 5000;
```

After selecting `config/constants.ts`, both constants appear in that file at the correct position.

**Tip:** Use **Move Selection to File** to cut and paste in one step.
