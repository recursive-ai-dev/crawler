const LPSCrawler = require('./LPSCrawler');
const BrowserInterface = require('./BrowserInterface');
const DataSynthesizer = require('./DataSynthesizer');
const {
  MFTExtractor,
  TBRExtractor,
  BaseExtractor,
  TextExtractor,
  AudioExtractor,
  PDFExtractor,
  UniversalExtractor
} = require('./extractors');

module.exports = {
  // Core crawler
  LPSCrawler,
  BrowserInterface,
  DataSynthesizer,

  // Enterprise Extractors
  MFTExtractor,      // Images (Morphogenic Fragment Tracker)
  TBRExtractor,      // Video (Temporal Buffer Resonance)
  TextExtractor,     // Text/Content
  AudioExtractor,    // Audio/Podcasts
  PDFExtractor,      // Documents/PDFs
  UniversalExtractor,// All-in-one extractor
  BaseExtractor,     // Base class for custom extractors

  // Factory functions for individual extractors
  async createCrawler(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new LPSCrawler(browser, options.crawler);
  },

  async createMFTExtractor(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new MFTExtractor(browser, options.extractor);
  },

  async createTBRExtractor(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new TBRExtractor(browser, options.extractor);
  },

  async createTextExtractor(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new TextExtractor(browser, options.extractor);
  },

  async createAudioExtractor(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new AudioExtractor(browser, options.extractor);
  },

  async createPDFExtractor(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new PDFExtractor(browser, options.extractor);
  },

  /**
   * Create a universal extractor that extracts all media types
   * @param {Object} options - Configuration options
   * @param {Object} options.browser - Browser configuration
   * @param {Object} options.extract - What to extract { text, images, video, audio, documents }
   * @returns {Object} Universal extractor instance
   */
  async createUniversalExtractor(options = {}) {
    const browser = new BrowserInterface(options.browser);
    return new UniversalExtractor(browser, options);
  }
};