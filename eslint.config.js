export default [
  // Ignore generated and external trees
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'reports/**',
      'archived/**',
      '**/*.d.ts',
      'examples/web-terminal/public/**',
      'test-project/**'
    ]
  },

  // Base JS and TS recommendations
  (await import('@eslint/js')).default.configs.recommended,
  ...(await import('typescript-eslint')).default.configs.recommended,

  // Project-wide tweaks
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...(await import('globals')).default.node,
        ...(await import('globals')).default.es2021
      }
    },
    rules: {
      'no-console': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-empty': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ]
    }
  },

  // Tests, examples, scripts: be extra lenient
  {
    files: ['tests/**', 'test/**', 'examples/**', 'src/examples/**', 'scripts/**'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-misleading-character-class': 'off',
      'no-empty': 'off',
      'no-unused-expressions': 'off'
    }
  }
  ,
  // File-specific tweaks
  {
    files: ['src/modules/ttyRenderer.ts'],
    rules: {
      'no-control-regex': 'off'
    }
  }
];
