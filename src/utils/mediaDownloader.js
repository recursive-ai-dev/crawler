const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const { formatBytes, calculateSuccessRate, generateHashSuffix, clamp } = require('./mathUtils');

/**
 * Media Downloader with mathematically rigorous operation handling
 * 
 * Invariants:
 *   1. All statistics are type-consistent (numbers)
 *   2. File operations have proper error boundaries
 *   3. Hash collisions are minimized (64-bit entropy minimum)
 * 
 * @class MediaDownloader
 */
class MediaDownloader {
  /**
   * Hash length for filename generation (16 hex chars = 64 bits)
   * Birthday bound: ~2^32 files before 50% collision probability
   * @static
   */
  static HASH_LENGTH = 16;

  /**
   * Minimum timeout to prevent immediate failures
   * @static
   */
  static MIN_TIMEOUT_MS = 5000;

  constructor(options = {}) {
    // Apply user options first, then override with validated values
    // This ensures mathematical invariants are ALWAYS maintained
    this.options = {
      downloadDir: './downloads',
      organizeByType: true,
      organizeBySource: false,
      userAgent: 'LPS-Crawler/1.0 (Media Downloader)',
      ...options,  // User options spread BEFORE validation
      // Mathematically validated values - these MUST NOT be overridden
      // Invariant 1: maxConcurrent ∈ [1, 20]
      maxConcurrent: clamp(options.maxConcurrent ?? 5, 1, 20),
      // Invariant 2: timeout ≥ MIN_TIMEOUT_MS (5000ms)
      timeout: Math.max(MediaDownloader.MIN_TIMEOUT_MS, options.timeout ?? 30000),
      // Invariant 3: retryAttempts ∈ [1, 10]
      retryAttempts: clamp(options.retryAttempts ?? 3, 1, 10)
    };

    this.downloadQueue = [];
    this.activeDownloads = new Map();

    // All stats are numbers for type consistency
    this.downloadStats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      totalDuration: 0
    };
  }

  /**
   * Download a single media file with comprehensive error handling
   * 
   * @param {string} url - URL to download
   * @param {Object} options - Download options
   * @returns {Promise<Object>} - Download result
   */
  async downloadFile(url, options = {}) {
    const downloadId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      logger.debug(`[MediaDownloader] Starting download: ${url}`);

      // Validate URL type
      const urlValidation = this._validateUrl(url);
      if (!urlValidation.valid) {
        logger.warn(`[MediaDownloader] ${urlValidation.reason}: ${url}`);
        this.downloadStats.failed++;
        return {
          success: false,
          error: urlValidation.reason,
          url,
          downloadable: false
        };
      }

      // Generate filename with collision-resistant hash
      const filename = this._generateFilename(url, options);
      const filepath = await this._getFilepath(url, filename, options);

      // Check if file already exists
      try {
        await fs.access(filepath);
        logger.debug(`[MediaDownloader] File already exists, skipping: ${filename}`);
        this.downloadStats.skipped++;
        return { success: true, skipped: true, filepath, filename, url };
      } catch {
        // File doesn't exist, proceed with download
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });

      // Download the file
      const response = await this._fetchWithTimeout(url, {
        headers: {
          'User-Agent': this.options.userAgent,
          'Referer': options.referer || this._safeGetOrigin(url)
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get file buffer
      const buffer = await response.arrayBuffer();

      // Write to file
      await fs.writeFile(filepath, Buffer.from(buffer));

      const duration = Date.now() - startTime;
      const fileSize = buffer.byteLength;

      // Format size with proper handling
      const formattedSize = formatBytes(fileSize) || `${fileSize} bytes`;
      logger.info(`[MediaDownloader] Downloaded: ${filename} (${formattedSize}) in ${duration}ms`);

      // Update stats (all numbers)
      this.downloadStats.successful++;
      this.downloadStats.totalBytes += fileSize;
      this.downloadStats.totalDuration += duration;

      return {
        success: true,
        filepath,
        filename,
        size: fileSize,
        duration,
        url
      };

    } catch (error) {
      logger.error(`[MediaDownloader] Failed to download ${url}:`, error);
      this.downloadStats.failed++;

      return {
        success: false,
        error: error.message,
        url
      };
    } finally {
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Download multiple media files with concurrency control
   * 
   * @param {string[]} urls - URLs to download
   * @param {Object} options - Download options
   * @returns {Promise<Object[]>} - Array of download results
   */
  async downloadFiles(urls, options = {}) {
    if (!Array.isArray(urls)) {
      logger.error('[MediaDownloader] downloadFiles requires an array of URLs');
      return [];
    }

    this.downloadStats.total = urls.length;

    logger.info(`[MediaDownloader] Starting batch download of ${urls.length} files`);

    const results = [];
    const concurrency = options.maxConcurrent || this.options.maxConcurrent;
    const totalBatches = Math.ceil(urls.length / concurrency);

    // Process in batches to control concurrency
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;

      logger.debug(`[MediaDownloader] Processing batch ${batchNumber}/${totalBatches}`);

      const batchPromises = batch.map(url => this.downloadFile(url, options));
      const batchResults = await Promise.allSettled(batchPromises);

      results.push(...batchResults.map((result, idx) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // Handle rejected promises
          this.downloadStats.failed++;
          return {
            success: false,
            error: result.reason?.message || String(result.reason) || 'Unknown error',
            url: batch[idx] || 'unknown'
          };
        }
      }));
    }

    const { percentage } = calculateSuccessRate(this.downloadStats.successful, this.downloadStats.total);
    logger.info(
      `[MediaDownloader] Batch download complete: ` +
      `${this.downloadStats.successful}/${this.downloadStats.total} successful (${percentage}%)`
    );

    return results;
  }

  /**
   * Validate URL for downloadability
   * 
   * @param {string} url - URL to validate
   * @returns {{valid: boolean, reason: string}} - Validation result
   */
  _validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, reason: 'Invalid URL: empty or non-string' };
    }

    if (url.startsWith('blob:')) {
      return { valid: false, reason: 'Blob URLs cannot be downloaded directly' };
    }

    if (url.startsWith('data:')) {
      return { valid: false, reason: 'Data URLs cannot be downloaded directly' };
    }

    if (!url.match(/^https?:\/\//i)) {
      return { valid: false, reason: 'Invalid URL scheme: must be http or https' };
    }

    return { valid: true, reason: null };
  }

  /**
   * Safely get origin from URL
   * 
   * @param {string} url - URL to extract origin from
   * @returns {string} - Origin or empty string
   */
  _safeGetOrigin(url) {
    try {
      return new URL(url).origin;
    } catch {
      return '';
    }
  }

  /**
   * Generate filename with collision-resistant hash
   * 
   * @param {string} url - Source URL
   * @param {Object} options - Generation options
   * @returns {string} - Generated filename
   */
  _generateFilename(url, options = {}) {
    try {
      const urlObj = new URL(url);

      // Extract filename from URL path
      let filename = path.basename(urlObj.pathname);

      // If no extension or filename is invalid, generate one
      if (!filename || filename.length < 2 || !path.extname(filename)) {
        const ext = this._detectExtension(url, options.type);
        // Use collision-resistant hash (64 bits = 16 hex chars)
        const hash = generateHashSuffix(url, MediaDownloader.HASH_LENGTH);
        filename = `media_${hash}${ext}`;
      } else {
        // Append short hash to existing filename to prevent collisions
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        const hash = generateHashSuffix(url, 8);
        filename = `${base}_${hash}${ext}`;
      }

      // Sanitize filename (preserve extension dots)
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Add timestamp prefix if requested
      if (options.addTimestamp) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `${timestamp}_${filename}`;
      }

      return filename;

    } catch (error) {
      // Fallback for invalid URLs
      const ext = this._detectExtension(url, options.type);
      const hash = generateHashSuffix(url, MediaDownloader.HASH_LENGTH);
      return `media_${hash}${ext}`;
    }
  }

  /**
   * Get full filepath with organization
   * 
   * @param {string} url - Source URL
   * @param {string} filename - Generated filename
   * @param {Object} options - Path options
   * @returns {Promise<string>} - Full file path
   */
  async _getFilepath(url, filename, options = {}) {
    let baseDir = options.downloadDir || this.options.downloadDir;

    // Organize by media type
    if (this.options.organizeByType) {
      const mediaType = this._getMediaType(filename);
      baseDir = path.join(baseDir, mediaType);
    }

    // Organize by source domain
    if (this.options.organizeBySource) {
      try {
        const domain = new URL(url).hostname;
        baseDir = path.join(baseDir, domain);
      } catch {
        // Invalid URL, skip source organization
      }
    }

    return path.join(baseDir, filename);
  }

  /**
   * Detect file extension from URL or content type
   * 
   * @param {string} url - URL to analyze
   * @param {string} suggestedType - Optional type hint
   * @returns {string} - File extension with dot
   */
  _detectExtension(url, suggestedType) {
    const extMap = {
      'image': '.jpg',
      'video': '.mp4',
      'audio': '.mp3'
    };

    // Check URL for extension pattern
    const extMatch = url.match(/\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/);
    if (extMatch) {
      const ext = extMatch[1].toLowerCase();
      // Validate it's a known media extension
      const validExts = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif',
        'mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'm3u8', 'mpd', 'ts', 'm4v',
        'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus'
      ];
      if (validExts.includes(ext)) {
        return `.${ext}`;
      }
    }

    // Check for specific formats in URL
    if (url.includes('.m3u8')) return '.m3u8';
    if (url.includes('.mpd')) return '.mpd';
    if (url.includes('.webm')) return '.webm';
    if (url.includes('.webp')) return '.webp';

    // Use suggested type
    return extMap[suggestedType] || '.bin';
  }

  /**
   * Get media type category from filename
   * 
   * @param {string} filename - Filename to categorize
   * @returns {string} - Category name
   */
  _getMediaType(filename) {
    const ext = path.extname(filename).toLowerCase();

    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];
    const videoExts = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.flv', '.m3u8', '.mpd', '.ts', '.m4v'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus'];
    const documentExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];

    if (imageExts.includes(ext)) return 'images';
    if (videoExts.includes(ext)) return 'videos';
    if (audioExts.includes(ext)) return 'audio';
    if (documentExts.includes(ext)) return 'documents';

    return 'other';
  }

  /**
   * Fetch with timeout and abort controller
   * 
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - Fetch response
   */
  async _fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.options.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Get download statistics with computed metrics
   * 
   * All values are numbers for type consistency.
   * Success rate is provided as both numeric (rate) and formatted (percentage).
   * 
   * @returns {Object} - Statistics object
   */
  getStats() {
    const { rate, percentage } = calculateSuccessRate(
      this.downloadStats.successful,
      this.downloadStats.total
    );

    const avgSize = this.downloadStats.successful > 0
      ? this.downloadStats.totalBytes / this.downloadStats.successful
      : 0;

    const avgDuration = this.downloadStats.successful > 0
      ? this.downloadStats.totalDuration / this.downloadStats.successful
      : 0;

    return {
      ...this.downloadStats,
      successRate: rate,           // Number: 0.0 to 1.0
      successPercentage: percentage, // String: "0.0" to "100.0"
      averageSize: Math.round(avgSize),
      averageSizeFormatted: formatBytes(avgSize) || '0 Bytes',
      averageDuration: Math.round(avgDuration)
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.downloadStats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      totalDuration: 0
    };
  }
}

module.exports = MediaDownloader;