const puppeteer = require('puppeteer');
const robotsParser = require('robots-parser');
const logger = require('./utils/logger');
const RateLimiter = require('./utils/rateLimiter');

class BrowserInterface {
  constructor(options = {}) {
    this.options = {
      headless: true,
      defaultTimeout: 30000,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'LPS-Crawler/1.0 (https://github.com/yourusername/lps-crawler)',
      respectRobots: true,
      rateLimit: { maxRequests: 5, interval: 1000 },
      ...options
    };

    this.browser = null;
    this.page = null;
    this.robots = null;
    this.rateLimiter = new RateLimiter(this.options.rateLimit);
    this.sessionStats = { requests: 0, errors: 0 };
  }

  async initialize(startUrl) {
    try {
      await this.rateLimiter.checkLimit();

      if (this.options.respectRobots) {
        await this._loadRobotsTxt(startUrl);
      }

      // Reuse existing browser if available
      if (!this.browser) {
        const launchOptions = {
          headless: this.options.headless,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          defaultViewport: this.options.viewport
        };

        if (this.options.executablePath) {
          launchOptions.executablePath = this.options.executablePath;
        }

        this.browser = await puppeteer.launch(launchOptions);
        this.page = await this.browser.newPage();

        await this.page.setViewport(this.options.viewport);
        await this.page.setUserAgent(this.options.userAgent);
      }

      // Check if we need to navigate
      if (this.page.url() !== startUrl) {
        await this.page.goto(startUrl, {
          waitUntil: 'networkidle2',
          timeout: this.options.defaultTimeout
        });
        logger.info(`Browser navigated to ${startUrl}`);
      } else {
        logger.info(`Browser already on ${startUrl}`);
      }

      return true;
    } catch (error) {
      logger.error('Browser initialization failed:', error);
      throw error;
    }
  }

  async _loadRobotsTxt(url) {
    try {
      const parsedUrl = new URL(url);
      const robotsUrl = `${parsedUrl.origin}/robots.txt`;

      const response = await fetch(robotsUrl);
      const robotsTxt = await response.text();
      this.robots = robotsParser(robotsUrl, robotsTxt);

      logger.info(`Loaded robots.txt from ${robotsUrl}`);
    } catch (error) {
      logger.warn('Could not load robots.txt, continuing without it');
      this.robots = null;
    }
  }

  async interact(action) {
    await this.rateLimiter.checkLimit();

    try {
      let results = [];

      switch (action) {
        case 'SCROLL':
          results = await this._scroll();
          break;
        case 'PAGE_NEXT':
          results = await this._goToNextPage();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      this.sessionStats.requests++;
      logger.debug(`Action ${action} returned ${results.length} items`);
      return results;

    } catch (error) {
      this.sessionStats.errors++;
      logger.error(`Interaction failed for ${action}:`, error);
      throw error;
    }
  }

  async _scroll() {
    const previousHeight = await this.page.evaluate('document.body.scrollHeight');

    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.page.waitForFunction(
      `document.body.scrollHeight > ${previousHeight}`,
      { timeout: 5000 }
    ).catch(() => { }); // Timeout is acceptable

    return this._extractLinks();
  }

  async _goToNextPage() {
    const nextButton = await this.page.$('a[rel="next"], .pagination .next, [aria-label="Next"]')
      .catch(() => null);

    if (!nextButton) {
      logger.warn('No next page button found');
      return [];
    }

    const href = await this.page.evaluate(el => el.href, nextButton);

    if (this.robots && !this.robots.isAllowed(href, this.options.userAgent)) {
      logger.warn(`URL blocked by robots.txt: ${href}`);
      return [];
    }

    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      nextButton.click()
    ]);

    return this._extractLinks();
  }

  async _extractLinks() {
    return await this.page.evaluate(() => {
      const links = [];
      const elements = document.querySelectorAll('a[href]');

      elements.forEach(el => {
        const href = el.href;
        if (href && href.startsWith('http')) {
          links.push({
            url: href,
            text: el.textContent.trim().substring(0, 100),
            title: el.title || ''
          });
        }
      });

      return links;
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }

  getStats() {
    return { ...this.sessionStats };
  }
}

module.exports = BrowserInterface;