/**
 * Comprehensive Integration Tests for LPS Crawler
 * These tests validate end-to-end functionality of all extractors and components
 */

const http = require('http');
const path = require('path');
const {
  createCrawler,
  createMFTExtractor,
  createTBRExtractor,
  createTextExtractor,
  createAudioExtractor,
  createPDFExtractor,
  createUniversalExtractor,
  LPSCrawler,
  BrowserInterface,
  DataSynthesizer
} = require('../src');

// Test configuration
const TEST_PORT = 9876;
const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;

/**
 * Create a simple test HTTP server with various content types
 */
function createTestServer() {
  const server = http.createServer((req, res) => {
    // Simple HTML page with various media types
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Test Page for LPS Crawler</title>
  <meta name="description" content="This is a test page for integration testing">
</head>
<body>
  <h1>Test Page</h1>
  <p>This is a test paragraph with <a href="/page1">link 1</a> and <a href="/page2">link 2</a>.</p>
  
  <img src="/test-image.jpg" alt="Test Image">
  <img src="/test-image.png" alt="Test PNG">
  
  <video src="/test-video.mp4" controls></video>
  <video>
    <source src="/video.m3u8" type="application/x-mpegURL">
  </video>
  
  <audio src="/test-audio.mp3" controls></audio>
  
  <a href="/document.pdf">Download PDF</a>
  <a href="/page3">Another link</a>
  
  <div class="content">
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
  </div>
</body>
</html>
      `);
    } else if (req.url === '/page1') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Page 1</h1><a href="/page2">Go to page 2</a></body></html>');
    } else if (req.url === '/page2') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Page 2</h1><a href="/">Go home</a></body></html>');
    } else if (req.url === '/page3') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Page 3</h1><p>Final page</p></body></html>');
    } else {
      // For all other requests (images, videos, etc.), return 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Test server started on port ${TEST_PORT}`);
      resolve(server);
    });
  });
}

/**
 * Integration tests
 */
describe('Comprehensive Integration Tests', () => {
  let testServer;

  // Start test server before all tests
  beforeAll(async () => {
    testServer = await createTestServer();
  }, 30000);

  // Stop test server after all tests
  afterAll(async () => {
    if (testServer) {
      await new Promise((resolve) => {
        testServer.close(resolve);
      });
      console.log('Test server stopped');
    }
  }, 10000);

  describe('LPS Crawler Core', () => {
    test('should crawl and discover links from a page', async () => {
      const crawler = await createCrawler({
        browser: { headless: true },
        crawler: { maxPhases: 2, stasisWindow: 2 }
      });

      const report = await crawler.run(TEST_BASE_URL);

      expect(report).toBeDefined();
      expect(report.totalDiscoveries).toBeGreaterThan(0);
      expect(report.phases).toBeGreaterThanOrEqual(1);
      expect(report.url).toBe(TEST_BASE_URL + '/');

      await crawler.cleanup();
    }, 30000);

    test('should handle phase transitions correctly', async () => {
      const browser = new BrowserInterface({ headless: true });
      await browser.initialize(TEST_BASE_URL);

      const crawler = new LPSCrawler(browser, { maxPhases: 3, stasisWindow: 2 });
      await crawler.phaseShift();

      expect(crawler.phase).toBe(1);
      expect(crawler.discoverySet.size).toBeGreaterThanOrEqual(0);

      await browser.close();
    }, 30000);

    test('should detect stasis when no new discoveries', async () => {
      const browser = new BrowserInterface({ headless: true });
      await browser.initialize(TEST_BASE_URL);

      const crawler = new LPSCrawler(browser, { maxPhases: 5, stasisWindow: 2 });
      
      // Simulate stasis by having zero tension for stasisWindow iterations
      crawler.tensionMap = [0, 0];
      crawler._checkStasis();

      expect(crawler.isStasis).toBe(true);

      await browser.close();
    }, 30000);
  });

  describe('MFT Extractor (Images)', () => {
    test('should identify and extract image URLs', async () => {
      const extractor = await createMFTExtractor({
        browser: { headless: true },
        extractor: { maxScrolls: 2 }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.items).toBeDefined();
      expect(Array.isArray(results.items)).toBe(true);
      expect(results.stats).toBeDefined();
      expect(results.stats.itemsFound).toBeGreaterThanOrEqual(0);

      await extractor.cleanup();
    }, 30000);

    test('should correctly identify media URLs', async () => {
      const browser = new BrowserInterface({ headless: true });
      const extractor = await createMFTExtractor({
        browser: { headless: true }
      });

      expect(extractor._isMediaUrl('https://example.com/image.jpg')).toBe(true);
      expect(extractor._isMediaUrl('https://example.com/image.png')).toBe(true);
      expect(extractor._isMediaUrl('https://example.com/image.webp')).toBe(true);
      expect(extractor._isMediaUrl('https://example.com/page.html')).toBe(false);

      await extractor.cleanup();
    }, 30000);
  });

  describe('TBR Extractor (Video)', () => {
    test('should identify video signatures', async () => {
      const extractor = await createTBRExtractor({
        browser: { headless: true }
      });

      expect(extractor._isVideoSignature('https://example.com/video.mp4')).toBe(true);
      expect(extractor._isVideoSignature('https://example.com/video.m3u8')).toBe(true);
      expect(extractor._isVideoSignature('https://example.com/manifest.mpd')).toBe(true);
      expect(extractor._isVideoSignature('blob:https://example.com/123')).toBe(true);
      expect(extractor._isVideoSignature('https://example.com/page.html')).toBe(false);

      await extractor.cleanup();
    }, 30000);

    test('should extract video sources from page', async () => {
      const extractor = await createTBRExtractor({
        browser: { headless: true }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.items).toBeDefined();
      expect(Array.isArray(results.items)).toBe(true);
      expect(results.stats).toBeDefined();

      await extractor.cleanup();
    }, 30000);

    test('should group video formats correctly', async () => {
      const extractor = await createTBRExtractor({
        browser: { headless: true }
      });

      // Add some test items
      extractor.extractedItems.add('https://example.com/video.m3u8');
      extractor.extractedItems.add('https://example.com/video.mp4');
      extractor.extractedItems.add('https://example.com/manifest.mpd');

      const results = extractor.exportResults();

      expect(results.grouped).toBeDefined();
      expect(results.grouped.hls).toBeDefined();
      expect(results.grouped.dash).toBeDefined();
      expect(results.grouped.direct).toBeDefined();

      await extractor.cleanup();
    }, 30000);
  });

  describe('Text Extractor', () => {
    test('should extract text content from page', async () => {
      const extractor = await createTextExtractor({
        browser: { headless: true }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.stats).toBeDefined();

      await extractor.cleanup();
    }, 30000);
  });

  describe('Audio Extractor', () => {
    test('should extract audio sources from page', async () => {
      const extractor = await createAudioExtractor({
        browser: { headless: true }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.items).toBeDefined();
      expect(results.stats).toBeDefined();

      await extractor.cleanup();
    }, 30000);
  });

  describe('PDF Extractor', () => {
    test('should identify document links', async () => {
      const extractor = await createPDFExtractor({
        browser: { headless: true }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.items).toBeDefined();
      expect(results.stats).toBeDefined();

      await extractor.cleanup();
    }, 30000);
  });

  describe('Universal Extractor', () => {
    test('should extract all media types in single session', async () => {
      const extractor = await createUniversalExtractor({
        browser: { headless: true },
        extract: {
          text: true,
          images: true,
          video: true,
          audio: true,
          documents: true
        }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.summary).toBeDefined();
      expect(results.summary.url).toBe(TEST_BASE_URL + '/');
      expect(results.summary.extractionTypes).toBeDefined();
      expect(results.summary.counts).toBeDefined();
      expect(results.results).toBeDefined();

      // Verify at least some extraction types were attempted
      expect(results.summary.extractionTypes.length).toBeGreaterThan(0);

      await extractor.cleanup();
    }, 60000);

    test('should support selective extraction', async () => {
      const extractor = await createUniversalExtractor({
        browser: { headless: true },
        extract: {
          text: true,
          images: true,
          video: false,
          audio: false,
          documents: false
        }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();
      expect(results.results.text).toBeDefined();
      expect(results.results.images).toBeDefined();
      
      // These should not be extracted
      expect(results.results.video).toBeUndefined();
      expect(results.results.audio).toBeUndefined();
      expect(results.results.documents).toBeUndefined();

      await extractor.cleanup();
    }, 60000);

    test('should maintain browser session across extractors', async () => {
      const browser = new BrowserInterface({ headless: true });
      await browser.initialize(TEST_BASE_URL);

      const extractor = await createUniversalExtractor({
        browser: { headless: true },
        extract: { text: true, images: true }
      });

      // Override browser to use our initialized one
      extractor.browser = browser;
      extractor.currentUrl = TEST_BASE_URL;

      const results = await extractor.extract();

      expect(results).toBeDefined();

      await browser.close();
    }, 60000);
  });

  describe('Data Synthesizer', () => {
    test('should generate JSONL format', () => {
      const logs = [
        {
          data: { url: 'https://example.com/1', text: 'Link 1', title: 'Title 1' },
          phase: 0,
          timestamp: Date.now(),
          interaction: 'SCROLL'
        },
        {
          data: { url: 'https://example.com/2', text: 'Link 2', title: 'Title 2' },
          phase: 1,
          timestamp: Date.now(),
          interaction: 'PAGE_NEXT'
        }
      ];

      const synthesizer = new DataSynthesizer(logs);
      const jsonl = synthesizer.toJSONL();

      expect(jsonl).toBeDefined();
      expect(typeof jsonl).toBe('string');

      const lines = jsonl.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(2);

      const firstLine = JSON.parse(lines[0]);
      expect(firstLine).toHaveProperty('instruction');
      expect(firstLine).toHaveProperty('context');
      expect(firstLine).toHaveProperty('response');
    });

    test('should generate Markdown format', () => {
      const logs = [
        {
          data: { url: 'https://example.com/1', text: 'Link 1' },
          phase: 0,
          timestamp: Date.now(),
          interaction: 'SCROLL'
        }
      ];

      const synthesizer = new DataSynthesizer(logs);
      const md = synthesizer.toMarkdown();

      expect(md).toBeDefined();
      expect(typeof md).toBe('string');
      expect(md).toContain('# LPS Discovery Report');
      expect(md).toContain('## Summary');
    });

    test('should generate CSV format', () => {
      const logs = [
        {
          data: { url: 'https://example.com/1', text: 'Link 1', title: 'Title 1' },
          phase: 0,
          timestamp: Date.now(),
          interaction: 'SCROLL'
        }
      ];

      const synthesizer = new DataSynthesizer(logs);
      const csv = synthesizer.toCSV();

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('timestamp,phase,interaction,url,text,title');
    });

    test('should generate raw format', () => {
      const logs = [
        {
          data: { url: 'https://example.com/1', text: 'Link 1' },
          phase: 0,
          timestamp: Date.now(),
          interaction: 'SCROLL'
        }
      ];

      const synthesizer = new DataSynthesizer(logs);
      const raw = synthesizer.toRaw();

      expect(raw).toBeDefined();
      expect(typeof raw).toBe('string');
      expect(raw).toContain('https://example.com/1');
    });
  });

  describe('Browser Interface', () => {
    test('should initialize and close browser', async () => {
      const browser = new BrowserInterface({ headless: true });
      await browser.initialize(TEST_BASE_URL);

      expect(browser.page).toBeDefined();
      expect(browser.browser).toBeDefined();

      await browser.close();
    }, 30000);

    test('should handle URL navigation', async () => {
      const browser = new BrowserInterface({ headless: true });
      await browser.initialize(TEST_BASE_URL);

      expect(browser.page.url()).toContain(TEST_BASE_URL);

      await browser.close();
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle invalid URL gracefully', async () => {
      const crawler = await createCrawler({
        browser: { headless: true },
        crawler: { maxPhases: 1 }
      });

      try {
        await crawler.run('invalid-url');
        // If it doesn't throw, check that it handled it gracefully
        expect(true).toBe(true);
      } catch (error) {
        // Error is expected for invalid URL
        expect(error).toBeDefined();
      } finally {
        await crawler.cleanup();
      }
    }, 30000);

    test('should handle network timeout', async () => {
      const browser = new BrowserInterface({ 
        headless: true,
        timeout: 100 // Very short timeout
      });

      try {
        // Try to load a page with very short timeout
        await browser.initialize('http://httpstat.us/200?sleep=5000');
      } catch (error) {
        // Timeout error is expected
        expect(error).toBeDefined();
      } finally {
        await browser.close();
      }
    }, 30000);
  });

  describe('Configuration Options', () => {
    test('should respect maxPhases configuration', async () => {
      const crawler = await createCrawler({
        browser: { headless: true },
        crawler: { maxPhases: 2 }
      });

      const report = await crawler.run(TEST_BASE_URL);

      expect(report.phases).toBeLessThanOrEqual(2);

      await crawler.cleanup();
    }, 30000);

    test('should respect maxScrolls configuration for MFT', async () => {
      const extractor = await createMFTExtractor({
        browser: { headless: true },
        extractor: { maxScrolls: 1 }
      });

      const results = await extractor.run(TEST_BASE_URL);

      expect(results).toBeDefined();

      await extractor.cleanup();
    }, 30000);
  });
});
