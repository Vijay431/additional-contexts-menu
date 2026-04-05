# Generate .env File

Open the Command Palette (`Ctrl+Shift+P`) and run **Additional Context Menus: Generate .env File**.

The extension scans your project for `process.env.VARIABLE_NAME` usage and generates a `.env` template with all discovered keys.

**Example — detected in your code:**

```ts
const db = process.env.DATABASE_URL;
const port = process.env.PORT;
const secret = process.env.JWT_SECRET;
```

**Generated `.env`:**

```
DATABASE_URL=
PORT=
JWT_SECRET=
```

Fill in the values and you're ready to go.
