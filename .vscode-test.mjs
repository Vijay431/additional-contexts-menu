import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'dist/test/suite/*.test.js',
  mochaOptions: {
    ui: 'tdd',
    timeout: 20000,
  },
});
