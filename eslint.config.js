import tseslint from 'typescript-eslint';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  tseslint.configs.recommended,
  globalIgnores([
    'dist/**',
    'node_modules/**',
  ]),
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
    },
  },
);
