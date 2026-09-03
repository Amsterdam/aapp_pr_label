import {defineConfig} from 'oxlint'


export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc'],
  categories: {
    correctness: 'error',
  },
  options: {typeAware: true},
  rules: {
    'typescript/no-unsafe-assignment': 'error',
    'typescript/no-empty-function': 'warn',
    'typescript/no-meaningless-void-operator': 'off',
    'typescript/no-useless-default-assignment': 'off',
    'eslint/no-async-promise-executor': 'warn',
    'no-process-env': 'error',
    'no-shadow': 'error',
    'no-void': ['error', {allowAsStatement: true}],
    'restrict-template-expressions': 'error',
  },
  env: {
    builtin: true,
  },
  overrides: [
    // Jest
    {
      files: ['*.test.ts', '*.test.mts'],
      rules: {
        'no-restricted-imports': 'off',
        'typescript/ban-ts-comment': 'off',
        'typescript/no-magic-numbers': 'off',
      },
    },
  ],
  ignorePatterns: [
    '!.*',
    'node_modules',
    '.git',
    '.jest',
  ],
})
