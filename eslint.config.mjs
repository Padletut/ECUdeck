import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist', 'node_modules', '.next', 'site', 'src-tauri/target'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {},
  },
];
