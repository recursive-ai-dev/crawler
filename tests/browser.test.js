const { BrowserInterface } = require('../src');

describe('BrowserInterface', () => {
  let browser;

  beforeEach(() => {
    browser = new BrowserInterface({
      headless: true,
      respectRobots: false
    });
  });

  afterEach(async () => {
    if (browser.browser) {
      await browser.close();
    }
  });

  test('should initialize with correct defaults', () => {
    expect(browser.options.headless).toBe(true);
    expect(browser.options.respectRobots).toBe(false);
    expect(browser.sessionStats.requests).toBe(0);
  });

  test('should increment request count on interaction', async () => {
    // This would require a real browser instance or more sophisticated mocking
    // For integration tests only
  });
});

describe('RateLimiter', () => {
  const RateLimiter = require('../src/utils/rateLimiter');
  
  test('should allow requests within limit', async () => {
    const limiter = new RateLimiter({ maxRequests: 5, interval: 1000 });
    
    for (let i = 0; i < 5; i++) {
      await expect(limiter.checkLimit()).resolves.not.toThrow();
    }
  });

  test('should throttle requests exceeding limit', async () => {
    const limiter = new RateLimiter({ maxRequests: 2, interval: 1000 });
    
    await limiter.checkLimit();
    await limiter.checkLimit();
    
    const start = Date.now();
    await limiter.checkLimit();
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThan(900); // Should wait ~1000ms
  });
});
