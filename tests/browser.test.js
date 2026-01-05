const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { BrowserInterface } = require('../src');
const RateLimiter = require('../src/utils/rateLimiter');
const { createTestServer, closeServer } = require('./test-utils');

describe('BrowserInterface', () => {
  let browser;
  let server;
  let baseUrl;

  before(async () => {
    const serverInfo = await createTestServer();
    server = serverInfo.server;
    baseUrl = serverInfo.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  test('should initialize with correct defaults', () => {
    browser = new BrowserInterface({
      headless: true,
      respectRobots: false
    });

    assert.equal(browser.options.headless, true);
    assert.equal(browser.options.respectRobots, false);
    assert.equal(browser.sessionStats.requests, 0);
  });

  test('should increment request count on interaction', async () => {
    browser = new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    });

    await browser.initialize(baseUrl);
    await browser.interact('SCROLL');
    await browser.interact('PAGE_NEXT');

    const stats = browser.getStats();
    assert.ok(stats.requests >= 2);

    await browser.close();
  });
});

describe('RateLimiter', () => {
  test('should allow requests within limit', async () => {
    const limiter = new RateLimiter({ maxRequests: 5, interval: 1000 });

    for (let i = 0; i < 5; i++) {
      await limiter.checkLimit();
    }
  });

  test('should throttle requests exceeding limit', async () => {
    const limiter = new RateLimiter({ maxRequests: 2, interval: 1000 });

    await limiter.checkLimit();
    await limiter.checkLimit();

    const start = Date.now();
    await limiter.checkLimit();
    const elapsed = Date.now() - start;

    assert.ok(elapsed > 900);
  });
});
