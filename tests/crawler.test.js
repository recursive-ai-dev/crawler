const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  LPSCrawler,
  BrowserInterface,
  MFTExtractor,
  TBRExtractor,
  AudioExtractor,
  PDFExtractor,
  TextExtractor,
  DataSynthesizer
} = require('../src');
const { createTestServer, closeServer } = require('./test-utils');

describe('LPSCrawler', () => {
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
    const crawler = new LPSCrawler(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }));
    assert.equal(crawler.phase, 0);
    assert.equal(crawler.wavefrontSize, 1);
    assert.equal(crawler.discoverySet.size, 0);
  });

  test('should calculate tension correctly', () => {
    const crawler = new LPSCrawler(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }));
    const newLinks = [
      { url: `${baseUrl}/link-1`, text: 'Link 1' },
      { url: `${baseUrl}/link-2`, text: 'Link 2' }
    ];

    const tension = crawler.calculateTension(newLinks);
    assert.equal(tension, 2);
    assert.equal(crawler.discoverySet.size, 2);
  });

  test('should expand wavefront on high tension', () => {
    const crawler = new LPSCrawler(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }));
    crawler._adaptWavefront(0.6);
    assert.equal(crawler.wavefrontSize, 2);
  });

  test('should detect stasis', () => {
    const crawler = new LPSCrawler(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }));
    crawler.config.stasisWindow = 3;
    crawler.tensionMap = [0, 0, 0];
    crawler._checkStasis();
    assert.equal(crawler.isStasis, true);
  });

  test('should perform phase shift with real browser', async () => {
    const browser = new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    });
    const crawler = new LPSCrawler(browser, { maxPhases: 1, saveInterval: 99 });
    await crawler.browser.initialize(baseUrl);
    await crawler.phaseShift();
    assert.ok(crawler.phase >= 1);
    assert.ok(crawler.discoverySet.size > 0);
    await crawler.browser.close();
  });
});

describe('Extractors', () => {
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

  test('MFTExtractor should detect images in DOM', async () => {
    const extractor = new MFTExtractor(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }), {
      maxScrolls: 1,
      scrollDelay: 150,
      stabilizationDelay: 300
    });
    const results = await extractor.run(baseUrl);
    assert.ok(results.items.some(item => item.includes('hero.jpg')));
  });

  test('TBRExtractor should detect video sources', async () => {
    const extractor = new TBRExtractor(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }), {
      observationWindow: 500,
      scanShadowDOM: false
    });
    const results = await extractor.run(baseUrl);
    assert.ok(results.grouped.hls.some(item => item.includes('stream.m3u8')));
    assert.ok(results.grouped.direct.some(item => item.includes('video.mp4')));
  });

  test('AudioExtractor should detect audio sources', async () => {
    const extractor = new AudioExtractor(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }), {
      observationWindow: 500
    });
    const results = await extractor.run(baseUrl);
    assert.ok(results.grouped.mp3.some(item => item.includes('audio.mp3')));
  });

  test('PDFExtractor should detect PDF links', async () => {
    const extractor = new PDFExtractor(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }));
    const results = await extractor.run(baseUrl);
    assert.ok(results.grouped.pdf.some(item => item.includes('sample.pdf')));
  });

  test('TextExtractor should generate metadata summary', async () => {
    const extractor = new TextExtractor(new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    }), {
      waitForDynamicContent: 200
    });
    const results = await extractor.run(baseUrl);
    assert.ok(results.summary.wordCount > 0);
  });
});

describe('DataSynthesizer', () => {
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

  test('should generate formats from real crawl logs', async () => {
    const browser = new BrowserInterface({
      headless: true,
      respectRobots: false,
      defaultTimeout: 5000
    });
    const crawler = new LPSCrawler(browser, {
      maxPhases: 2,
      saveInterval: 99,
      outputDir: path.join(__dirname, 'data-synth-output')
    });

    await crawler.run(baseUrl);
    const logs = crawler.extractionLog;
    assert.ok(logs.length > 0);

    const synthesizer = new DataSynthesizer(logs);
    const jsonl = synthesizer.toJSONL();
    const markdown = synthesizer.toMarkdown();
    const csv = synthesizer.toCSV();
    const raw = synthesizer.toRaw();

    assert.equal(jsonl.split('\n').length, logs.length);
    assert.ok(markdown.includes('# LPS Discovery Report'));
    assert.ok(csv.startsWith('timestamp,phase,interaction,url,text,title'));
    assert.ok(raw.includes('SCROLL') || raw.includes('PAGE_NEXT'));
  });
});
