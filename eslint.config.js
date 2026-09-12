import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore the compiled output folder
  { ignores: ['dist'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Enforce the Rules of Hooks (e.g. no calling hooks inside conditions)
      ...reactHooks.configs.recommended.rules,

      // Warn if you export something from a component file that isn't a component
      // (can break React Fast Refresh in dev)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Allow empty catch blocks — we use them deliberately in auth retry logic
      // where we want to silently fail without crashing
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
