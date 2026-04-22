// https://docs.expo.dev/guides/using-eslint/
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: null,
});

const rnGlobals = {
  setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly',
  requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
  fetch: 'readonly', FormData: 'readonly', XMLHttpRequest: 'readonly',
  __DEV__: 'readonly', ErrorUtils: 'readonly', alert: 'readonly',
  navigator: 'readonly', self: 'readonly', caches: 'readonly',
  URLSearchParams: 'readonly', crypto: 'readonly',
  require: 'readonly', console: 'readonly', process: 'readonly',
};

const jestGlobals = {
  jest: 'readonly', expect: 'readonly', describe: 'readonly',
  it: 'readonly', test: 'readonly', beforeEach: 'readonly',
  beforeAll: 'readonly', afterEach: 'readonly', afterAll: 'readonly',
};

const nodeGlobals = {
  __dirname: 'readonly', __filename: 'readonly',
  module: 'readonly', exports: 'readonly', require: 'readonly',
};

export default [
  ...compat.extends('eslint-config-expo'),

  // Jest globals for test files
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**', '**/e2e/**'],
    languageOptions: { globals: { ...jestGlobals, ...rnGlobals } },
  },

  // Service/helper files with __dirname
  { files: ['scripts/**', 'config/**'], languageOptions: { globals: nodeGlobals } },

  { ignores: ['dist/*', 'coverage/**'] },

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'constants/theme.ts', 'constants/DesignTokens.ts', 'constants/DesignSystem.ts',
      '**/*.test.*', '**/__tests__/**', 'coverage/**',
    ],
    languageOptions: { globals: rnGlobals },
    rules: {
      'no-restricted-syntax': ['warn', {
        selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
        message: 'Use design tokens from constants/theme.ts instead of raw hex colors.',
      }],
      'no-undef': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Expo packages (expo-haptics, expo-image, etc.) may not resolve in ESLint's TS resolver
      // but work fine in Metro/TypeScript. Downgrade to warn to unblock CI.
      'import/no-unresolved': 'warn',
    },
  },
];
