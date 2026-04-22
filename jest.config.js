/** @type {import('jest').Config} */
module.exports = {
  // Use jest-expo preset for React Native + Expo
  preset: 'jest-expo',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform files with babel for JS and ts-jest for TS
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        diagnostics: {
          exclude: ['**/node_modules/**'],
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform ignore patterns - critical for React Native + Expo
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '@react-native|' +
      '@react-native/.*|' +
      'react-native|' +
      '@expo|' +
      'expo|' +
      'expo-.*|' +
      '@expo/.*|' +
      '@react-navigation|' +
      'react-native-.*|' +
      '@stripe/.*|' +
      '@sentry/.*|' +
      'socket.io-client|' +
      'use-debounce|' +
      '@testing-library' +
    ')/)',
  ],

  // Path aliases matching tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // @stripe/stripe-react-native is not installed in this project — map to an
    // inline mock so jest.setup.js can call jest.mock() on it without failing
    '^@stripe/stripe-react-native$': '<rootDir>/__tests__/mocks/stripeMock.js',
    // @sentry/react-native needs native modules unavailable in Node test env
    '^@sentry/react-native$': '<rootDir>/__tests__/mocks/sentryMock.js',
    // React Native 0.79 removed NativeAnimatedHelper — map to empty stub
    '^react-native/Libraries/Animated/NativeAnimatedHelper$': '<rootDir>/__tests__/mocks/emptyMock.js',
    // NativeEventEmitter path may not exist in all RN versions
    '^react-native/Libraries/EventEmitter/NativeEventEmitter$': '<rootDir>/__tests__/mocks/emptyMock.js',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 40,
      functions: 40,
      lines: 50,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],

  // Test environment
  testEnvironment: 'node',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/e2e/',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Max workers
  maxWorkers: '50%',
};
