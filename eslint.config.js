import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unusedImports from 'eslint-plugin-unused-imports'
import reactPlugin from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scratch', 'node_modules', 'tests', '.agents', 'Login_main.jsx', '*.serve.jsx', '=']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'unused-imports': unusedImports,
      'react': reactPlugin,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        __APP_VERSION__: 'readonly',
        __GIT_COMMIT__: 'readonly',
        __GIT_DATE__: 'readonly',
        __GIT_TIME__: 'readonly',
        __GIT_DATETIME__: 'readonly',
        __GIT_FULL_DETAIL__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', { vars: 'all', varsIgnorePattern: '^[A-Z_]', args: 'after-used', argsIgnorePattern: '^[A-Z_]' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-undef': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react/jsx-no-undef': 'error',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-compiler/react-compiler': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/use-memo': 'off',
    },
  },
  {
    files: ['server/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off',
    },
  },
])
