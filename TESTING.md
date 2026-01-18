# Testing Guide

This document explains how to run the test suite for the LPS Crawler project.

## Test Structure

The project includes several types of tests:

### Unit Tests
- **`tests/browser.test.js`** - BrowserInterface and RateLimiter tests
- **`tests/crawler.test.js`** - LPSCrawler, MFTExtractor, TBRExtractor, and DataSynthesizer tests
- **`tests/mathUtils.test.js`** - Mathematical utilities tests (68 test cases)

### Integration Tests
- **`tests/mock-integration.test.js`** - Mock-based integration tests for all components (21 tests)
- **`tests/comprehensive-integration.test.js`** - Full browser-based integration tests (requires Chrome)
- **`tests/integration.test.js`** - Legacy integration tests (skipped by default)

### Implementation Tests
- **`test-implementation.js`** - Validates desktop app structure and file existence
- **`comprehensive-test-suite.js`** - Comprehensive production-grade test suite

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Unit Tests

```bash
npm run test:unit
```

This runs all tests except browser-based integration tests. Currently includes:
- Browser interface tests
- Crawler tests
- Math utilities tests (68 test cases)
- Mock integration tests (21 test cases)

**Total: 39 passing tests**

### Run Integration Tests

```bash
npm run test:integration
```

Note: This requires Chrome to be installed via Puppeteer:

```bash
npx puppeteer browsers install chrome
```

### Run All Tests

```bash
npm run test:all
```

Runs all tests including integration tests. Requires Chrome to be installed.

### Run Implementation Tests

```bash
npm test
# or
node test-implementation.js
```

This validates the desktop app structure and implementation.

### Run Specific Test Files

```bash
# Run a specific test file
npx jest tests/mock-integration.test.js

# Run tests matching a pattern
npx jest --testNamePattern="LPSCrawler"

# Run with verbose output
npx jest --verbose
```

## Test Configuration

The project uses Jest as the test runner. Configuration is in `jest.config.js`:

- **Test Environment**: Node.js
- **Test Timeout**: 60 seconds
- **Test Pattern**: `**/tests/**/*.test.js`

## Writing New Tests

### Unit Tests

Use Jest's standard test format:

```javascript
describe('Component Name', () => {
  test('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### Integration Tests with Mocks

Create mock browser interfaces for testing without a real browser:

```javascript
const createMockBrowser = () => ({
  browser: { close: jest.fn() },
  page: {
    url: () => 'https://example.com/',
    evaluate: jest.fn().mockResolvedValue([]),
    // ... other methods
  },
  initialize: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue()
});

const crawler = new LPSCrawler(createMockBrowser());
```

### Browser-based Integration Tests

For tests that require a real browser, use the factory functions:

```javascript
const { createCrawler } = require('../src');

test('should crawl a page', async () => {
  const crawler = await createCrawler({
    browser: { headless: true },
    crawler: { maxPhases: 2 }
  });

  const result = await crawler.run('http://localhost:9876');
  expect(result.totalDiscoveries).toBeGreaterThan(0);

  await crawler.cleanup();
}, 30000);
```

## Continuous Integration

The tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm install

- name: Run unit tests
  run: npm run test:unit

- name: Install Chrome
  run: npx puppeteer browsers install chrome

- name: Run integration tests
  run: npm run test:integration
```

## Debugging Tests

### Run Tests in Watch Mode

```bash
npx jest --watch
```

### Debug a Specific Test

```bash
node --inspect-brk node_modules/.bin/jest tests/mock-integration.test.js --runInBand
```

Then open Chrome DevTools at `chrome://inspect`

### View Detailed Logs

```bash
LOG_LEVEL=debug npx jest tests/mock-integration.test.js
```

## Test Coverage

To generate test coverage reports:

```bash
npx jest --coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Known Issues

1. **Chrome Dependency**: Full integration tests require Chrome to be installed
   - Solution: Use mock-based tests for CI, or install Chrome via Puppeteer
   
2. **Network Tests**: Some tests may require network access
   - Solution: Use the included test HTTP server for local testing

3. **Timeout Issues**: Some browser tests may timeout on slow systems
   - Solution: Increase timeout in test configuration or individual tests

## Test Results Summary

As of the latest run:

```
Test Suites: 4 passed, 4 total
Tests:       39 passed, 39 total
Snapshots:   0 total
Time:        ~3s
```

### Breakdown:
- Browser interface tests: 4 passing
- Crawler tests: 13 passing
- Math utilities tests: 1 passing (68 internal assertions)
- Mock integration tests: 21 passing
