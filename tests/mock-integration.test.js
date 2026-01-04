/**
 * Mock-based Integration Tests
 * These tests validate the integration between components using mocks
 * instead of requiring a real browser
 */

const {
  LPSCrawler,
  DataSynthesizer,
  MFTExtractor,
  TBRExtractor,
  TextExtractor,
  AudioExtractor,
  PDFExtractor,
  UniversalExtractor
} = require('../src');

describe('Mock-based Integration Tests', () => {
  // Mock browser interface
  const createMockBrowser = () => ({
    browser: { close: jest.fn() },
    page: {
      url: () => 'https://example.com/',
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      evaluate: jest.fn().mockResolvedValue([]),
      waitForTimeout: jest.fn().mockResolvedValue(),
      $: jest.fn().mockResolvedValue(null),
      frames: () => [],
      goto: jest.fn().mockResolvedValue()
    },
    initialize: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    interact: jest.fn().mockResolvedValue([
      { url: 'https://example.com/page1', text: 'Page 1' },
      { url: 'https://example.com/page2', text: 'Page 2' }
    ]),
    getStats: jest.fn().mockReturnValue({
      requests: 0,
      duration: 100
    }),
    sessionStats: { requests: 0 }
  });

  describe('LPSCrawler Integration', () => {
    test('should initialize with mock browser', () => {
      const browser = createMockBrowser();
      const crawler = new LPSCrawler(browser, { maxPhases: 3 });

      expect(crawler.phase).toBe(0);
      expect(crawler.wavefrontSize).toBe(1);
      expect(crawler.discoverySet.size).toBe(0);
    });

    test('should calculate tension correctly', () => {
      const browser = createMockBrowser();
      const crawler = new LPSCrawler(browser);

      const newLinks = [
        { url: 'https://example.com/1', text: 'Link 1' },
        { url: 'https://example.com/2', text: 'Link 2' }
      ];

      const tension = crawler.calculateTension(newLinks);
      expect(tension).toBe(2); // 2 new links / wavefront of 1
      expect(crawler.discoverySet.size).toBe(2);
    });

    test('should detect stasis', () => {
      const browser = createMockBrowser();
      const crawler = new LPSCrawler(browser, { stasisWindow: 2 });

      crawler.tensionMap = [0, 0];
      crawler._checkStasis();

      expect(crawler.isStasis).toBe(true);
    });

    test('should perform phase shift', async () => {
      const browser = createMockBrowser();
      const crawler = new LPSCrawler(browser);

      await crawler.phaseShift();

      expect(browser.interact).toHaveBeenCalled();
      expect(crawler.phase).toBe(1);
    });

    test('should expand wavefront on high tension', () => {
      const browser = createMockBrowser();
      const crawler = new LPSCrawler(browser);

      crawler._adaptWavefront(0.6); // High tension
      expect(crawler.wavefrontSize).toBeGreaterThan(1);
    });

    test('should generate report', () => {
      const browser = createMockBrowser();
      const crawler = new LPSCrawler(browser);

      crawler.discoverySet.set('url1', { url: 'url1' });
      crawler.discoverySet.set('url2', { url: 'url2' });
      crawler.tensionMap = [0.5, 0.3, 0.2];
      crawler.phase = 3;

      const report = crawler._generateReport();

      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('phases');
      expect(report.phases).toBe(3);
      expect(report.totalDiscoveries).toBe(2);
    });
  });

  describe('MFTExtractor Integration', () => {
    test('should identify media URLs correctly', () => {
      const browser = createMockBrowser();
      const extractor = new MFTExtractor(browser);

      expect(extractor._isMediaUrl('https://example.com/image.jpg')).toBe(true);
      expect(extractor._isMediaUrl('https://example.com/image.png')).toBe(true);
      expect(extractor._isMediaUrl('https://example.com/image.webp')).toBe(true);
      expect(extractor._isMediaUrl('https://example.com/page.html')).toBe(false);
    });

    test('should normalize URLs correctly', () => {
      const browser = createMockBrowser();
      const extractor = new MFTExtractor(browser);

      const normalized = extractor.normalizeItem('https://example.com/image.jpg?utm_source=test&cache=123');
      expect(normalized).not.toContain('utm_source');
    });

    test('should export results correctly', () => {
      const browser = createMockBrowser();
      const extractor = new MFTExtractor(browser);

      extractor.extractedItems.add('https://example.com/image1.jpg');
      extractor.extractedItems.add('https://example.com/image2.png');

      const results = extractor.exportResults();

      expect(results).toHaveProperty('items');
      expect(results).toHaveProperty('stats');
      expect(results.items.length).toBe(2);
    });
  });

  describe('TBRExtractor Integration', () => {
    test('should identify video signatures correctly', () => {
      const browser = createMockBrowser();
      const extractor = new TBRExtractor(browser);

      expect(extractor._isVideoSignature('https://example.com/video.mp4')).toBe(true);
      expect(extractor._isVideoSignature('https://example.com/video.m3u8')).toBe(true);
      expect(extractor._isVideoSignature('https://example.com/manifest.mpd')).toBe(true);
      expect(extractor._isVideoSignature('blob:https://example.com/123')).toBe(true);
      expect(extractor._isVideoSignature('https://example.com/page.html')).toBe(false);
    });

    test('should group video formats correctly', () => {
      const browser = createMockBrowser();
      const extractor = new TBRExtractor(browser);

      extractor.extractedItems.add('https://example.com/video.m3u8');
      extractor.extractedItems.add('https://example.com/video.mp4');
      extractor.extractedItems.add('https://example.com/manifest.mpd');

      const results = extractor.exportResults();

      expect(results.grouped).toBeDefined();
      expect(results.grouped.hls).toHaveLength(1);
      expect(results.grouped.dash).toHaveLength(1);
      expect(results.grouped.direct).toHaveLength(1);
    });
  });

  describe('TextExtractor Integration', () => {
    test('should initialize correctly', () => {
      const browser = createMockBrowser();
      const extractor = new TextExtractor(browser);

      expect(extractor).toBeDefined();
      expect(extractor.browser).toBe(browser);
    });
  });

  describe('AudioExtractor Integration', () => {
    test('should initialize correctly', () => {
      const browser = createMockBrowser();
      const extractor = new AudioExtractor(browser);

      expect(extractor).toBeDefined();
      expect(extractor.browser).toBe(browser);
    });
  });

  describe('PDFExtractor Integration', () => {
    test('should initialize correctly', () => {
      const browser = createMockBrowser();
      const extractor = new PDFExtractor(browser);

      expect(extractor).toBeDefined();
      expect(extractor.browser).toBe(browser);
    });
  });

  describe('UniversalExtractor Integration', () => {
    test('should initialize with correct options', () => {
      const browser = createMockBrowser();
      const extractor = new UniversalExtractor(browser, {
        extract: { text: true, images: false, video: true }
      });

      expect(extractor.extractOptions.text).toBe(true);
      expect(extractor.extractOptions.images).toBe(false);
      expect(extractor.extractOptions.video).toBe(true);
    });

    test('should default to extracting all types', () => {
      const browser = createMockBrowser();
      const extractor = new UniversalExtractor(browser);

      expect(extractor.extractOptions.text).toBe(true);
      expect(extractor.extractOptions.images).toBe(true);
      expect(extractor.extractOptions.video).toBe(true);
      expect(extractor.extractOptions.audio).toBe(true);
      expect(extractor.extractOptions.documents).toBe(true);
    });

    test('should export results with summary', () => {
      const browser = createMockBrowser();
      const extractor = new UniversalExtractor(browser);
      extractor.currentUrl = 'https://example.com/';

      // Simulate some results
      extractor.results = {
        text: { items: [], stats: { itemsFound: 0 } },
        images: { items: ['img1.jpg', 'img2.png'], stats: { itemsFound: 2 } }
      };

      const results = extractor.exportResults();

      expect(results).toHaveProperty('summary');
      expect(results.summary).toHaveProperty('url');
      expect(results.summary).toHaveProperty('extractionTypes');
      expect(results.summary).toHaveProperty('counts');
      expect(results.summary.counts.images).toBe(2);
    });
  });

  describe('DataSynthesizer Integration', () => {
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
});
