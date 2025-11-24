// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      '.eslintcache',
      '.cache/**',
      'coverage/**',
      'src/utils/dynamicImport.ts',
      'src/examples/parserExample.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      next: nextPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-props-no-spreading': 'off', // Changed from 'warn' to 'off'
      'react-hooks/rules-of-hooks': 'error',
      // 'react-hooks/exhaustive-deps': 'warn', // Temporarily disabled due to ESLint compatibility issue

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Import rules
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],

      // Next.js specific rules
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*'],
    languageOptions: {
      globals: {
        jest: true,
        expect: true,
        describe: true,
        it: true,
        test: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['*.js', '*.jsx'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    files: ['babel.config.js', 'jest.config.js', 'jest.setup.js', 'next.config.js'],
    languageOptions: {
      globals: {
        module: true,
        process: true,
        jest: true,
        window: true,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-useless-escape': 'off',
    },
  }
];