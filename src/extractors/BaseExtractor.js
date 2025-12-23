const EventEmitter = require('events');
const logger = require('../utils/logger');
const MediaDownloader = require('../utils/mediaDownloader');
const { clamp, calculateSuccessRate } = require('../utils/mathUtils');

/**
 * BaseExtractor - Abstract base class for all extractors
 * Provides common functionality for data extraction
 * 
 * All derived extractors inherit:
 * - Bounded options validation
 * - Deduplication via Set
 * - Statistics tracking with type-consistent values
 * - Media download capabilities
 */
class BaseExtractor extends EventEmitter {
  /**
   * Valid bounds for configuration options
   * @static
   */
  static OPTION_BOUNDS = {
    maxDepth: { min: 1, max: 100, default: 10 },
    timeout: { min: 5000, max: 300000, default: 30000 },
    maxConcurrentDownloads: { min: 1, max: 20, default: 5 }
  };

  constructor(options = {}) {
    super();

    const bounds = BaseExtractor.OPTION_BOUNDS;

    this.options = {
      maxDepth: clamp(
        options.maxDepth || bounds.maxDepth.default,
        bounds.maxDepth.min,
        bounds.maxDepth.max
      ),
      timeout: clamp(
        options.timeout || bounds.timeout.default,
        bounds.timeout.min,
        bounds.timeout.max
      ),
      downloadMedia: Boolean(options.downloadMedia),
      downloadDir: options.downloadDir || './downloads',
      organizeByType: options.organizeByType !== false,
      organizeBySource: Boolean(options.organizeBySource),
      maxConcurrentDownloads: clamp(
        options.maxConcurrentDownloads || bounds.maxConcurrentDownloads.default,
        bounds.maxConcurrentDownloads.min,
        bounds.maxConcurrentDownloads.max
      ),
      ...options
    };

    this.extractedItems = new Set();
    this.downloadedItems = new Map();
    this.stats = {
      startTime: null,
      endTime: null,
      itemsFound: 0,
      errors: 0,
      downloaded: 0
    };

    // Initialize media downloader if enabled
    if (this.options.downloadMedia) {
      this.mediaDownloader = new MediaDownloader({
        downloadDir: this.options.downloadDir,
        organizeByType: this.options.organizeByType,
        organizeBySource: this.options.organizeBySource,
        maxConcurrent: this.options.maxConcurrentDownloads
      });
    }
  }

  /**
   * Initialize the extractor
   * @abstract
   */
  async initialize(target) {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Extract data from target
   * @abstract
   */
  async extract() {
    throw new Error('extract() must be implemented by subclass');
  }

  /**
   * Cleanup resources
   * @abstract
   */
  async cleanup() {
    throw new Error('cleanup() must be implemented by subclass');
  }

  /**
   * Run the full extraction process
   */
  async run(target) {
    this.stats.startTime = Date.now();
    this.emit('extractionStart', { target });

    try {
      await this.initialize(target);
      const results = await this.extract();

      this.stats.endTime = Date.now();
      this.stats.itemsFound = this.extractedItems.size;

      this.emit('extractionComplete', {
        items: results,
        stats: this.stats
      });

      return results;

    } catch (error) {
      this.stats.errors++;
      logger.error('Extraction failed:', error);
      this.emit('extractionError', { error });
      throw error;

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Add item to extraction set with deduplication
   */
  addItem(item, metadata = {}) {
    const normalized = this.normalizeItem(item);

    if (!this.extractedItems.has(normalized)) {
      this.extractedItems.add(normalized);
      this.emit('itemFound', { item: normalized, metadata });
      return true;
    }

    return false;
  }

  /**
   * Normalize item for deduplication
   * @abstract
   */
  normalizeItem(item) {
    return item;
  }

  /**
   * Get extraction statistics
   */
  getStats() {
    return {
      ...this.stats,
      duration: this.stats.endTime ? this.stats.endTime - this.stats.startTime : null
    };
  }

  /**
   * Download extracted media files
   */
  async downloadMedia(items = null, options = {}) {
    if (!this.options.downloadMedia || !this.mediaDownloader) {
      logger.debug('[BaseExtractor] Media downloading disabled');
      return [];
    }

    const itemsToDownload = items || Array.from(this.extractedItems);

    if (itemsToDownload.length === 0) {
      logger.debug('[BaseExtractor] No items to download');
      return [];
    }

    logger.info(`[BaseExtractor] Downloading ${itemsToDownload.length} media files...`);

    const results = await this.mediaDownloader.downloadFiles(itemsToDownload, {
      referer: options.referer || this.currentUrl,
      ...options
    });

    // Track downloaded files
    results.forEach(result => {
      if (result.success && !result.skipped) {
        this.downloadedItems.set(result.url, result.filepath);
        this.stats.downloaded++;
      }
    });

    logger.info(`[BaseExtractor] Download complete: ${results.filter(r => r.success).length}/${results.length} files`);

    return results;
  }

  /**
   * Export results in various formats
   */
  exportResults() {
    const baseResults = {
      items: Array.from(this.extractedItems),
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };

    // Add download information if media was downloaded
    if (this.options.downloadMedia && this.downloadedItems.size > 0) {
      baseResults.downloaded = {
        files: Object.fromEntries(this.downloadedItems),
        stats: this.mediaDownloader.getStats()
      };
    }

    return baseResults;
  }
}

module.exports = BaseExtractor;
