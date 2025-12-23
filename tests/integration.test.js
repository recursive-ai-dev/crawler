/**
 * Integration tests for LPS Crawler
 * These tests require network access and may take longer to run
 */

const { createCrawler, createMFTExtractor, createTBRExtractor } = require('../src');

const runIntegration = process.env.RUN_INTEGRATION === '1';
const maybeDescribe = runIntegration ? describe : describe.skip;

maybeDescribe('Integration Tests', () => {
  jest.setTimeout(60000); // 60 second timeout

  describe('LPS Crawler Integration', () => {
    test('should crawl a simple page', async () => {
      const crawler = await createCrawler({
        browser: { headless: true },
        crawler: { maxPhases: 3 }
      });

      // Using a simple, reliable test page
      const report = await crawler.run('https://example.com');
      
      expect(report.totalDiscoveries).toBeGreaterThan(0);
      expect(report.phases).toBeLessThanOrEqual(3);
    });
  });

  describe('MFT Extractor Integration', () => {
    test.skip('should extract images from a page', async () => {
      // Skip by default - enable for real testing
      const extractor = await createMFTExtractor({
        browser: { headless: true },
        extractor: { maxScrolls: 5 }
      });

      const results = await extractor.run('https://unsplash.com');
      
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.stats.itemsFound).toBeGreaterThan(0);
    });
  });

  describe('TBR Extractor Integration', () => {
    test.skip('should extract video sources', async () => {
      // Skip by default - enable for real testing
      const extractor = await createTBRExtractor({
        browser: { headless: true }
      });

      const results = await extractor.run('https://www.youtube.com');
      
      expect(results.items.length).toBeGreaterThan(0);
    });
  });
});
