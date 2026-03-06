/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        types: ['jest', 'node'],
        typeRoots: ['../../node_modules/@types', './node_modules/@types'],
        strict: false,
      },
      diagnostics: false,
    }],
  },
  testTimeout: 15000,
  verbose: true,
};
