const { LPSCrawler, BrowserInterface, MFTExtractor, TBRExtractor } = require('../src');

describe('LPSCrawler', () => {
  let crawler;
  let mockBrowser;

  beforeEach(() => {
    mockBrowser = {
      initialize: jest.fn(),
      interact: jest.fn(),
      close: jest.fn(),
      page: { url: () => 'https://example.com' }
    };
    
    crawler = new LPSCrawler(mockBrowser, { maxPhases: 5 });
  });

  test('should initialize with correct defaults', () => {
    expect(crawler.phase).toBe(0);
    expect(crawler.wavefrontSize).toBe(1);
    expect(crawler.discoverySet.size).toBe(0);
  });

  test('should calculate tension correctly', () => {
    const newLinks = [
      { url: 'https://example.com/1', text: 'Link 1' },
      { url: 'https://example.com/2', text: 'Link 2' }
    ];
    
    const tension = crawler.calculateTension(newLinks);
    expect(tension).toBe(2); // 2 new links / wavefront of 1
    expect(crawler.discoverySet.size).toBe(2);
  });

  test('should expand wavefront on high tension', () => {
    crawler._adaptWavefront(0.6);
    expect(crawler.wavefrontSize).toBe(2);
  });

  test('should detect stasis', () => {
    crawler.config.stasisWindow = 3;
    crawler.tensionMap = [0, 0, 0];
    crawler._checkStasis();
    expect(crawler.isStasis).toBe(true);
  });

  test('should perform phase shift', async () => {
    mockBrowser.interact.mockResolvedValue([
      { url: 'https://example.com/1', text: 'Link 1' }
    ]);

    await crawler.phaseShift();
    
    expect(mockBrowser.interact).toHaveBeenCalledWith('SCROLL');
    expect(crawler.phase).toBe(1);
    expect(crawler.discoverySet.size).toBe(1);
  });
});

describe('MFTExtractor', () => {
  let extractor;
  let mockBrowser;

  beforeEach(() => {
    mockBrowser = {
      initialize: jest.fn(),
      close: jest.fn(),
      page: {
        url: () => 'https://example.com',
        setRequestInterception: jest.fn(),
        on: jest.fn(),
        evaluate: jest.fn(),
        waitForTimeout: jest.fn(),
        $: jest.fn()
      }
    };
    
    extractor = new MFTExtractor(mockBrowser);
  });

  test('should identify media URLs correctly', () => {
    expect(extractor._isMediaUrl('https://example.com/image.jpg')).toBe(true);
    expect(extractor._isMediaUrl('https://example.com/image.png')).toBe(true);
    expect(extractor._isMediaUrl('https://example.com/page.html')).toBe(false);
  });

  test('should normalize URLs correctly', () => {
    extractor.browser.page.url = () => 'https://example.com';
    const normalized = extractor.normalizeItem('https://example.com/image.jpg?utm_source=test&cache=123');
    expect(normalized).not.toContain('utm_source');
  });
});

describe('TBRExtractor', () => {
  let extractor;
  let mockBrowser;

  beforeEach(() => {
    mockBrowser = {
      initialize: jest.fn(),
      close: jest.fn(),
      page: {
        url: () => 'https://example.com',
        setRequestInterception: jest.fn(),
        on: jest.fn(),
        evaluate: jest.fn(),
        waitForTimeout: jest.fn(),
        frames: () => []
      }
    };
    
    extractor = new TBRExtractor(mockBrowser);
  });

  test('should identify video signatures correctly', () => {
    expect(extractor._isVideoSignature('https://example.com/video.m3u8')).toBe(true);
    expect(extractor._isVideoSignature('https://example.com/video.mp4')).toBe(true);
    expect(extractor._isVideoSignature('https://example.com/manifest.mpd')).toBe(true);
    expect(extractor._isVideoSignature('blob:https://example.com/123')).toBe(true);
    expect(extractor._isVideoSignature('https://example.com/page.html')).toBe(false);
  });

  test('should export results with grouping', () => {
    extractor.extractedItems.add('https://example.com/video.m3u8');
    extractor.extractedItems.add('https://example.com/video.mp4');
    extractor.extractedItems.add('https://example.com/manifest.mpd');
    
    const results = extractor.exportResults();
    expect(results.grouped.hls).toHaveLength(1);
    expect(results.grouped.dash).toHaveLength(1);
    expect(results.grouped.direct).toHaveLength(1);
  });
});

describe('DataSynthesizer', () => {
  const DataSynthesizer = require('../src/DataSynthesizer');
  let synthesizer;
  let mockLogs;

  beforeEach(() => {
    mockLogs = [
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
    
    synthesizer = new DataSynthesizer(mockLogs);
  });

  test('should generate JSONL format', () => {
    const jsonl = synthesizer.toJSONL();
    const lines = jsonl.split('\n');
    expect(lines).toHaveLength(2);
    
    const parsed = JSON.parse(lines[0]);
    expect(parsed).toHaveProperty('instruction');
    expect(parsed).toHaveProperty('context');
    expect(parsed).toHaveProperty('response');
  });

  test('should generate Markdown format', () => {
    const md = synthesizer.toMarkdown();
    expect(md).toContain('# LPS Discovery Report');
    expect(md).toContain('## Summary');
    expect(md).toContain('### Phase 0');
  });

  test('should generate CSV format', () => {
    const csv = synthesizer.toCSV();
    const lines = csv.split('\n');
    expect(lines[0]).toContain('timestamp,phase,interaction,url,text,title');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  test('should generate raw format', () => {
    const raw = synthesizer.toRaw();
    expect(raw).toContain('https://example.com/1');
    expect(raw).toContain('https://example.com/2');
  });
});
