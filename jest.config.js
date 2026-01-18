module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/examples/'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: [],
  globals: {
    'NODE_ENV': 'test'
  }
};
