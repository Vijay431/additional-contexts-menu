# Generate Enum from Union Type

Select a TypeScript union type in the editor, right-click and choose **Generate Enum from Union Type**.

**Example — before (select the union type):**

```ts
type Status = 'active' | 'inactive' | 'pending';
```

**After:**

```ts
enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
```

The generated enum is copied to your clipboard, ready to paste.
