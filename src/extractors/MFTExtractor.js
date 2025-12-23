const BaseExtractor = require('./BaseExtractor');
const logger = require('../utils/logger');
const { clamp, formatBytes, calculateSuccessRate } = require('../utils/mathUtils');

/**
 * Morphogenic Fragment Tracker (MFT) - Enterprise-grade Image Extraction
 * Features:
 * - Lazy-loaded and dynamically rendered content detection
 * - Infinite scroll and pagination handling
 * - Shadow DOM scanning
 * - Network request interception
 * - Image metadata extraction (dimensions, format, alt text)
 * - Quality/resolution filtering
 * - Srcset parsing with resolution detection
 * - CDN pattern recognition
 * - SVG and canvas extraction
 * - Picture element support
 * - OpenGraph/Twitter image extraction
 * - Favicon and icon detection
 * - WebP/AVIF modern format support
 * - Image categorization (hero, thumbnail, gallery, icon)
 */
class MFTExtractor extends BaseExtractor {
  constructor(browserInterface, options = {}) {
    super({
      scrollStep: clamp(options.scrollStep || 800, 100, 2000),
      scrollDelay: clamp(options.scrollDelay || 1000, 100, 5000),
      maxScrolls: clamp(options.maxScrolls || 50, 1, 200),
      stabilizationDelay: clamp(options.stabilizationDelay || 2000, 500, 10000),
      mutationThreshold: Math.max(0, options.mutationThreshold || 0.001),
      minWidth: Math.max(0, options.minWidth || 0),
      minHeight: Math.max(0, options.minHeight || 0),
      excludeIcons: Boolean(options.excludeIcons),
      extractMetadata: options.extractMetadata !== false,
      extractSvg: options.extractSvg !== false,
      urlPatterns: [
        /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|ico|tiff?))/gi,
        /(https?:\/\/[^\s"'<>]+\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|ico|tiff?))/gi,
        /data:image\/(jpeg|png|webp|gif|svg\+xml|avif);base64,[^\s"'<>]+/gi
      ],
      lazyLoadSelectors: [
        'img[data-src]', 'img[data-srcset]', 'img[data-lazy]',
        'img[data-original]', 'img[loading="lazy"]', 'img[data-lazy-src]',
        'img[data-ll-status]', 'img.lazyload', 'img.lazy',
        'div[data-bg]', 'div[data-background]', 'div[data-background-image]',
        '[data-image]', '[data-img]', '[data-thumb]'
      ],
      paginationSelectors: [
        'a.next', 'button.next', 'button.load-more',
        'a[rel="next"]', '.pagination .next', '.pager .next',
        '.infinite-scroll-trigger', '[data-testid="load-more"]',
        '.show-more', '.view-more', '[aria-label*="next"]'
      ],
      ...options
    });

    this.browser = browserInterface;
    this.mutationDensity = new Map();
    this.visitedUrls = new Set();
    this.imageMetadata = new Map();
    this.categorizedImages = {
      hero: [],
      gallery: [],
      thumbnails: [],
      icons: [],
      backgrounds: [],
      social: [],
      other: []
    };
  }

  async initialize(url) {
    logger.info(`[MFT] Initializing for ${url}`);
    this.currentUrl = url;
    await this.browser.initialize(url);
    await this._setupNetworkInterception();
    await this._setupMutationObserver();
  }

  async _setupNetworkInterception() {
    const page = this.browser.page;

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      if (resourceType === 'image' || this._isMediaUrl(url)) {
        this.addItem(url, {
          source: 'network',
          type: 'request',
          resourceType
        });
      }
      request.continue();
    });

    // Capture response headers for metadata
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('image')) {
        const metadata = {
          contentType,
          size: response.headers()['content-length'],
          status: response.status()
        };
        this.imageMetadata.set(url, metadata);
      }
    });
  }

  async _setupMutationObserver() {
    const page = this.browser.page;

    await page.evaluate(() => {
      window._mftMutationCount = 0;
      window._mftNewImages = [];

      const observer = new MutationObserver((mutations) => {
        window._mftMutationCount += mutations.length;

        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1) {
                if (node.tagName === 'IMG' && node.src) {
                  window._mftNewImages.push({
                    src: node.src,
                    alt: node.alt,
                    width: node.naturalWidth,
                    height: node.naturalHeight
                  });
                }
                // Check for images inside added nodes
                if (node.querySelectorAll) {
                  node.querySelectorAll('img[src]').forEach(img => {
                    window._mftNewImages.push({
                      src: img.src,
                      alt: img.alt,
                      width: img.naturalWidth,
                      height: img.naturalHeight
                    });
                  });
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'data-src', 'srcset', 'style', 'data-background']
      });
    });
  }

  async extract() {
    logger.info('[MFT] Starting enterprise image extraction...');

    let depth = 0;
    let stable = false;
    let previousCount = 0;

    // Phase 1: Extract social/meta images first
    await this._extractSocialImages();

    while (depth < this.options.maxScrolls && !stable) {
      logger.debug(`[MFT] Depth ${depth}: Extracting media...`);

      // Extract from current viewport with metadata
      await this._extractFromCurrentView();

      // Apply kinetic pulse (trigger lazy loads)
      await this._applyKineticPulse();

      // Scroll down
      await this._performScroll();

      // Check stability
      const currentCount = this.extractedItems.size;
      const growth = currentCount - previousCount;

      if (growth === 0 && depth > 3) {
        stable = true;
        logger.info(`[MFT] Stabilized at depth ${depth} with ${currentCount} items`);
      }

      previousCount = currentCount;
      depth++;

      await new Promise(resolve => setTimeout(resolve, this.options.scrollDelay));
    }

    // Phase 2: Extract from picture elements and srcset
    await this._extractResponsiveImages();

    // Phase 3: Extract SVGs if enabled
    if (this.options.extractSvg) {
      await this._extractSVGs();
    }

    // Phase 4: Extract canvas images
    await this._extractCanvasImages();

    // Phase 5: Try pagination
    await this._tryPagination();

    // Phase 6: Categorize images
    await this._categorizeImages();

    // Download media if enabled
    if (this.options.downloadMedia) {
      await this.downloadMedia();
    }

    return this.exportResults();
  }

  async _extractSocialImages() {
    const page = this.browser.page;

    const socialImages = await page.evaluate(() => {
      const images = [];

      // OpenGraph images
      document.querySelectorAll('meta[property="og:image"], meta[property="og:image:url"]').forEach(meta => {
        if (meta.content) {
          images.push({
            url: meta.content,
            type: 'opengraph',
            width: document.querySelector('meta[property="og:image:width"]')?.content,
            height: document.querySelector('meta[property="og:image:height"]')?.content
          });
        }
      });

      // Twitter Card images
      document.querySelectorAll('meta[name="twitter:image"], meta[name="twitter:image:src"]').forEach(meta => {
        if (meta.content) {
          images.push({ url: meta.content, type: 'twitter' });
        }
      });

      // Favicons and icons
      document.querySelectorAll('link[rel*="icon"]').forEach(link => {
        if (link.href) {
          images.push({
            url: link.href,
            type: 'favicon',
            sizes: link.sizes?.value
          });
        }
      });

      // Apple touch icons
      document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(link => {
        if (link.href) {
          images.push({
            url: link.href,
            type: 'apple-touch-icon',
            sizes: link.sizes?.value
          });
        }
      });

      // Schema.org images
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const extractImages = (obj) => {
            if (typeof obj === 'object' && obj !== null) {
              if (obj.image) {
                const imgs = Array.isArray(obj.image) ? obj.image : [obj.image];
                imgs.forEach(img => {
                  const url = typeof img === 'string' ? img : img.url;
                  if (url) images.push({ url, type: 'schema-org' });
                });
              }
              if (obj.logo) {
                const url = typeof obj.logo === 'string' ? obj.logo : obj.logo?.url;
                if (url) images.push({ url, type: 'logo' });
              }
              Object.values(obj).forEach(val => extractImages(val));
            }
          };
          extractImages(data);
        } catch (e) { }
      });

      return images;
    });

    socialImages.forEach(data => {
      if (data.url) {
        this.addItem(data.url, { source: 'social-meta', ...data });
        this.categorizedImages.social.push(data.url);
        if (data.width && data.height) {
          this.imageMetadata.set(data.url, { width: data.width, height: data.height, type: data.type });
        }
      }
    });
  }

  async _extractFromCurrentView() {
    const page = this.browser.page;

    const extractOptions = {
      minWidth: this.options.minWidth,
      minHeight: this.options.minHeight,
      excludeIcons: this.options.excludeIcons,
      extractMetadata: this.options.extractMetadata
    };

    const mediaData = await page.evaluate((patterns, selectors, opts) => {
      const results = [];

      function getImageData(img) {
        const rect = img.getBoundingClientRect();
        return {
          src: img.src || img.currentSrc,
          dataSrc: img.dataset?.src,
          dataOriginal: img.dataset?.original,
          alt: img.alt || '',
          title: img.title || '',
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: Math.round(rect.width),
          displayHeight: Math.round(rect.height),
          loading: img.loading,
          decoding: img.decoding,
          isLazy: img.loading === 'lazy' || img.classList.contains('lazy') || img.classList.contains('lazyload'),
          inViewport: rect.top < window.innerHeight && rect.bottom > 0,
          srcset: img.srcset || null,
          sizes: img.sizes || null,
          className: img.className
        };
      }

      // Extract from standard img tags with full metadata
      document.querySelectorAll('img').forEach(img => {
        const data = getImageData(img);

        // Apply size filters
        if (opts.excludeIcons && (data.naturalWidth < 32 || data.naturalHeight < 32)) return;
        if (opts.minWidth > 0 && data.naturalWidth < opts.minWidth) return;
        if (opts.minHeight > 0 && data.naturalHeight < opts.minHeight) return;

        if (data.src) results.push({ url: data.src, ...data, source: 'img-src' });
        if (data.dataSrc) results.push({ url: data.dataSrc, ...data, source: 'img-data-src' });
        if (data.dataOriginal) results.push({ url: data.dataOriginal, ...data, source: 'img-data-original' });

        // Parse srcset for multiple resolutions
        if (data.srcset) {
          data.srcset.split(',').forEach(entry => {
            const parts = entry.trim().split(/\s+/);
            const url = parts[0];
            const descriptor = parts[1] || '';
            if (url) {
              results.push({
                url,
                descriptor,
                ...data,
                source: 'srcset'
              });
            }
          });
        }
      });

      // Extract from lazy-load elements
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          Object.entries(el.dataset).forEach(([key, val]) => {
            if (val && val.match(/^https?:\/\//)) {
              results.push({
                url: val,
                dataAttribute: key,
                source: 'lazy-load-data'
              });
            }
          });
        });
      });

      // Extract from background images with computed styles
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundImage;

        if (bg && bg !== 'none') {
          const matches = bg.matchAll(/url\(["']?([^"')]+)["']?\)/g);
          for (const match of matches) {
            const url = match[1];
            if (url && !url.startsWith('data:image/svg')) {
              results.push({
                url,
                source: 'background-image',
                element: el.tagName,
                className: el.className
              });
            }
          }
        }
      });

      // Extract from figure elements (often contain high-quality images)
      document.querySelectorAll('figure img').forEach(img => {
        const data = getImageData(img);
        const caption = img.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
        if (data.src) {
          results.push({
            url: data.src,
            ...data,
            caption,
            source: 'figure'
          });
        }
      });

      return results;
    }, this.options.urlPatterns, this.options.lazyLoadSelectors, extractOptions);

    mediaData.forEach(data => {
      if (data.url && this._isMediaUrl(data.url)) {
        this.addItem(data.url, { source: data.source, metadata: data });

        // Store metadata
        if (this.options.extractMetadata && !this.imageMetadata.has(data.url)) {
          this.imageMetadata.set(data.url, {
            alt: data.alt,
            title: data.title,
            width: data.naturalWidth,
            height: data.naturalHeight,
            displayWidth: data.displayWidth,
            displayHeight: data.displayHeight,
            caption: data.caption
          });
        }
      }
    });
  }

  async _extractResponsiveImages() {
    const page = this.browser.page;

    const responsiveImages = await page.evaluate(() => {
      const results = [];

      // Picture elements
      document.querySelectorAll('picture').forEach(picture => {
        const sources = picture.querySelectorAll('source');
        const img = picture.querySelector('img');

        sources.forEach(source => {
          if (source.srcset) {
            source.srcset.split(',').forEach(entry => {
              const parts = entry.trim().split(/\s+/);
              const url = parts[0];
              const descriptor = parts[1] || '';
              if (url) {
                results.push({
                  url,
                  descriptor,
                  media: source.media,
                  type: source.type,
                  source: 'picture-source'
                });
              }
            });
          }
        });

        if (img?.src) {
          results.push({
            url: img.src,
            alt: img.alt,
            source: 'picture-img'
          });
        }
      });

      return results;
    });

    responsiveImages.forEach(data => {
      if (data.url && this._isMediaUrl(data.url)) {
        this.addItem(data.url, { source: data.source, metadata: data });
      }
    });
  }

  async _extractSVGs() {
    const page = this.browser.page;

    const svgData = await page.evaluate(() => {
      const results = [];

      // Inline SVGs
      document.querySelectorAll('svg').forEach((svg, idx) => {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        results.push({
          type: 'inline-svg',
          dataUrl,
          width: svg.width?.baseVal?.value || svg.getAttribute('width'),
          height: svg.height?.baseVal?.value || svg.getAttribute('height'),
          viewBox: svg.getAttribute('viewBox'),
          id: svg.id || `svg-${idx}`
        });
      });

      // SVG uses (referenced SVGs)
      document.querySelectorAll('use[href], use[xlink\\:href]').forEach(use => {
        const href = use.getAttribute('href') || use.getAttribute('xlink:href');
        if (href && href.startsWith('#')) return; // Skip internal references
        if (href) {
          results.push({
            type: 'svg-use',
            url: href
          });
        }
      });

      return results;
    });

    svgData.forEach(data => {
      const url = data.url || data.dataUrl;
      if (url) {
        this.addItem(url, { source: 'svg', ...data });
        this.categorizedImages.icons.push(url);
      }
    });
  }

  async _extractCanvasImages() {
    const page = this.browser.page;

    try {
      const canvasData = await page.evaluate(() => {
        const results = [];

        document.querySelectorAll('canvas').forEach((canvas, idx) => {
          try {
            if (canvas.width > 10 && canvas.height > 10) {
              const dataUrl = canvas.toDataURL('image/png');
              results.push({
                type: 'canvas',
                dataUrl,
                width: canvas.width,
                height: canvas.height,
                id: canvas.id || `canvas-${idx}`
              });
            }
          } catch (e) {
            // Canvas tainted or not accessible
          }
        });

        return results;
      });

      canvasData.forEach(data => {
        if (data.dataUrl) {
          this.addItem(data.dataUrl, { source: 'canvas', ...data });
        }
      });
    } catch (error) {
      logger.debug('[MFT] Canvas extraction failed:', error.message);
    }
  }

  async _categorizeImages() {
    const page = this.browser.page;

    const categorization = await page.evaluate(() => {
      const categories = {
        hero: [],
        gallery: [],
        thumbnails: [],
        icons: [],
        backgrounds: []
      };

      // Hero images (large images in header/main)
      document.querySelectorAll('header img, main > img, .hero img, .banner img, [class*="hero"] img').forEach(img => {
        if (img.naturalWidth >= 600) {
          categories.hero.push(img.src || img.currentSrc);
        }
      });

      // Gallery images
      document.querySelectorAll('.gallery img, .carousel img, .slider img, .lightbox img, [class*="gallery"] img').forEach(img => {
        categories.gallery.push(img.src || img.currentSrc);
      });

      // Thumbnails
      document.querySelectorAll('.thumb img, .thumbnail img, [class*="thumb"] img').forEach(img => {
        categories.thumbnails.push(img.src || img.currentSrc);
      });

      // Icons
      document.querySelectorAll('img').forEach(img => {
        if (img.naturalWidth <= 64 && img.naturalHeight <= 64) {
          categories.icons.push(img.src || img.currentSrc);
        }
      });

      return categories;
    });

    // Merge with existing categorization
    Object.entries(categorization).forEach(([category, urls]) => {
      urls.forEach(url => {
        if (url && !this.categorizedImages[category].includes(url)) {
          this.categorizedImages[category].push(url);
        }
      });
    });
  }

  async _applyKineticPulse() {
    const page = this.browser.page;

    try {
      await page.evaluate((selectors) => {
        // Trigger intersection observer callbacks
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            el.scrollIntoView({ block: 'center', behavior: 'auto' });

            // Dispatch events that trigger lazy loaders
            ['mouseenter', 'mouseover', 'touchstart', 'focus'].forEach(eventType => {
              const event = new Event(eventType, { bubbles: true });
              el.dispatchEvent(event);
            });

            // Also dispatch IntersectionObserver-like visibility change
            if ('IntersectionObserver' in window) {
              const rect = el.getBoundingClientRect();
              if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.setAttribute('data-visible', 'true');
              }
            }
          });
        });

        // Trigger any lazy load libraries that listen to scroll
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
      }, this.options.lazyLoadSelectors);

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      logger.debug('[MFT] Kinetic pulse failed:', error.message);
    }
  }

  async _performScroll() {
    const page = this.browser.page;

    await page.evaluate((step) => {
      window.scrollBy({ top: step, behavior: 'smooth' });
    }, this.options.scrollStep);

    // Wait for scroll to complete and lazy loads to trigger
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async _tryPagination() {
    const page = this.browser.page;

    for (const selector of this.options.paginationSelectors) {
      const button = await page.$(selector).catch(() => null);

      if (button) {
        logger.info(`[MFT] Found pagination: ${selector}`);

        try {
          const previousCount = this.extractedItems.size;
          await button.click();
          await new Promise(resolve => setTimeout(resolve, this.options.stabilizationDelay));
          await this._extractFromCurrentView();

          const newItems = this.extractedItems.size - previousCount;
          logger.info(`[MFT] Pagination added ${newItems} new items`);

          if (newItems > 0) {
            await this._tryPagination();
          }

          break;
        } catch (error) {
          logger.debug(`[MFT] Pagination click failed: ${error.message}`);
        }
      }
    }
  }

  _isMediaUrl(url) {
    if (!url || typeof url !== 'string') return false;

    // Handle data URLs
    if (url.startsWith('data:image/')) return true;

    // Check against patterns
    return this.options.urlPatterns.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(url);
    });
  }

  normalizeItem(url) {
    try {
      // Skip data URLs normalization
      if (url.startsWith('data:')) return url;

      const urlObj = new URL(url, this.browser.page?.url());
      // Remove tracking parameters
      ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'cache', 'fbclid', 'gclid'].forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  async cleanup() {
    logger.info(`[MFT] Extraction complete: ${this.extractedItems.size} media items found`);
    if (this.options.closeBrowser !== false && this.browser && typeof this.browser.close === 'function') {
      await this.browser.close();
    }
  }

  /**
   * Export results with comprehensive grouping and metadata
   */
  exportResults() {
    const base = super.exportResults();

    // Group by format
    const byFormat = {
      jpg: [],
      png: [],
      webp: [],
      gif: [],
      svg: [],
      avif: [],
      ico: [],
      dataUrl: [],
      other: []
    };

    this.extractedItems.forEach(url => {
      const lower = url.toLowerCase();
      if (lower.startsWith('data:')) byFormat.dataUrl.push(url);
      else if (lower.includes('.jpg') || lower.includes('.jpeg')) byFormat.jpg.push(url);
      else if (lower.includes('.png')) byFormat.png.push(url);
      else if (lower.includes('.webp')) byFormat.webp.push(url);
      else if (lower.includes('.gif')) byFormat.gif.push(url);
      else if (lower.includes('.svg')) byFormat.svg.push(url);
      else if (lower.includes('.avif')) byFormat.avif.push(url);
      else if (lower.includes('.ico') || lower.includes('favicon')) byFormat.ico.push(url);
      else byFormat.other.push(url);
    });

    // Calculate statistics with safe division
    const totalImages = this.extractedItems.size;
    const formatCounts = Object.fromEntries(
      Object.entries(byFormat).map(([k, v]) => [k, v.length])
    );
    const categoryCounts = Object.fromEntries(
      Object.entries(this.categorizedImages).map(([k, v]) => [k, v.length])
    );

    // Calculate format distribution percentages
    const formatDistribution = {};
    Object.entries(formatCounts).forEach(([format, count]) => {
      const { percentage } = calculateSuccessRate(count, totalImages);
      formatDistribution[format] = {
        count,
        percentage: parseFloat(percentage)
      };
    });

    return {
      ...base,
      byFormat,
      byCategory: this.categorizedImages,
      metadata: Object.fromEntries(this.imageMetadata),
      statistics: {
        total: totalImages,
        byFormat: formatCounts,
        byCategory: categoryCounts,
        formatDistribution,
        withMetadata: this.imageMetadata.size,
        metadataCoverage: totalImages > 0
          ? parseFloat(calculateSuccessRate(this.imageMetadata.size, totalImages).percentage)
          : 0
      }
    };
  }
}
module.exports = MFTExtractor;

