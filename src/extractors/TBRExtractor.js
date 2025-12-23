const BaseExtractor = require('./BaseExtractor');
const logger = require('../utils/logger');
const { clamp, calculateSuccessRate } = require('../utils/mathUtils');

/**
 * Temporal Buffer Resonance (TBR) - Enterprise-grade Video Extraction
 * Features:
 * - Multi-quality video source detection
 * - Streaming protocol support (HLS, DASH, MSS)
 * - Player API integration (Video.js, HLS.js, Shaka, JW Player, Plyr)
 * - Shadow DOM and iframe scanning
 * - Network request interception
 * - Subtitle/caption track extraction
 * - Audio track detection
 * - Platform-specific detection (YouTube, Vimeo, Wistia, Brightcove)
 * - Live stream detection
 * - DRM/encryption indicator
 * - Thumbnail extraction
 * - Video metadata capture
 */
class TBRExtractor extends BaseExtractor {
  constructor(browserInterface, options = {}) {
    super({
      observationWindow: clamp(options.observationWindow || 5000, 1000, 30000),
      maxResonanceLevels: clamp(options.maxResonanceLevels || 5, 1, 20),
      scanShadowDOM: options.scanShadowDOM !== false,
      monitorNetwork: options.monitorNetwork !== false,
      extractSubtitles: options.extractSubtitles !== false,
      extractThumbnails: options.extractThumbnails !== false,
      extractAudioTracks: options.extractAudioTracks !== false,
      qualityPreference: ['highest', 'lowest', 'all'].includes(options.qualityPreference)
        ? options.qualityPreference
        : 'all',
      ...options
    });

    this.browser = browserInterface;
    this.activeMonitors = new Set();
    this.networkUrls = new Set();
    this.videoMetadata = new Map();
    this.subtitleTracks = [];
    this.audioTracks = [];
    this.thumbnails = new Set();
    this.platformData = new Map();
  }

  async initialize(url) {
    logger.info(`[TBR] Initializing for ${url}`);
    this.currentUrl = url;
    await this.browser.initialize(url);

    if (this.options.monitorNetwork) {
      await this._instrumentNetwork();
    }

    await this._setupDOMObserver();
  }

  async _instrumentNetwork() {
    const page = this.browser.page;

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      if (this._isVideoSignature(url) || resourceType === 'media') {
        this.networkUrls.add(url);
        this.addItem(url, {
          source: 'network',
          type: resourceType,
          method: request.method()
        });
        logger.debug(`[TBR] Network: ${url}`);
      }

      // Capture subtitle requests
      if (url.match(/\.(vtt|srt|sub|ass|ttml|dfxp)/i)) {
        this.subtitleTracks.push({
          url,
          format: url.match(/\.(\w+)$/)?.[1],
          source: 'network'
        });
      }

      request.continue();
    });

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const contentLength = response.headers()['content-length'];

      // Video content types
      const videoTypes = [
        'video/', 'application/dash+xml', 'application/vnd.apple.mpegurl',
        'application/x-mpegurl', 'video/mp2t'
      ];

      if (videoTypes.some(t => contentType.includes(t))) {
        const metadata = {
          source: 'network-response',
          contentType,
          size: contentLength ? parseInt(contentLength) : null,
          status: response.status()
        };
        this.videoMetadata.set(url, metadata);
        this.addItem(url, metadata);
        logger.debug(`[TBR] Response: ${url}`);
      }
    });
  }

  async _setupDOMObserver() {
    const page = this.browser.page;

    await page.evaluate(() => {
      window._tbrMutations = [];

      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1 && (node.tagName === 'VIDEO' || node.tagName === 'SOURCE')) {
                window._tbrMutations.push({
                  type: 'video-added',
                  tag: node.tagName,
                  src: node.src,
                  timestamp: Date.now()
                });
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'data-src', 'poster']
      });
    });
  }

  async extract() {
    logger.info('[TBR] Starting enterprise video extraction...');

    // Phase 1: Immediate DOM extraction
    await this._extractFromDOM();

    // Phase 2: Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, this.options.observationWindow));

    // Phase 3: Deep extraction from shadow DOM and iframes
    await this._deepScan();

    // Phase 4: Extract from JavaScript player APIs
    await this._extractFromPlayerAPIs();

    // Phase 5: Platform-specific extraction
    await this._extractPlatformVideos();

    // Phase 6: Extract subtitles/captions
    if (this.options.extractSubtitles) {
      await this._extractSubtitles();
    }

    // Phase 7: Extract audio tracks
    if (this.options.extractAudioTracks) {
      await this._extractAudioTracks();
    }

    // Phase 8: Extract thumbnails/posters
    if (this.options.extractThumbnails) {
      await this._extractThumbnails();
    }

    // Phase 9: Get any network-captured URLs
    this.networkUrls.forEach(url => {
      this.addItem(url, { source: 'network-capture' });
    });

    // Download media if enabled
    if (this.options.downloadMedia) {
      await this.downloadMedia();
    }

    return this.exportResults();
  }

  async _extractFromDOM() {
    const page = this.browser.page;

    const videoData = await page.evaluate((scanShadow) => {
      const results = [];

      function scanNode(root) {
        // Video elements
        root.querySelectorAll('video').forEach(video => {
          const videoInfo = {
            src: video.src || video.currentSrc,
            poster: video.poster,
            duration: video.duration,
            width: video.videoWidth || video.width,
            height: video.videoHeight || video.height,
            readyState: video.readyState,
            paused: video.paused,
            muted: video.muted,
            autoplay: video.autoplay,
            loop: video.loop,
            preload: video.preload,
            crossOrigin: video.crossOrigin,
            type: 'video-element'
          };

          if (videoInfo.src) results.push(videoInfo);

          // Check for data attributes
          Object.keys(video.dataset).forEach(key => {
            const value = video.dataset[key];
            if (value && (value.includes('.mp4') || value.includes('.m3u8') ||
              value.includes('.mpd') || value.includes('http'))) {
              results.push({
                url: value,
                type: `video-data-${key}`,
                poster: video.poster
              });
            }
          });

          // Check for multiple sources
          video.querySelectorAll('source').forEach(source => {
            if (source.src) {
              results.push({
                url: source.src,
                type: 'source-element',
                mimeType: source.type,
                media: source.media,
                poster: video.poster
              });
            }
          });

          // Check for tracks (subtitles, captions)
          video.querySelectorAll('track').forEach(track => {
            results.push({
              url: track.src,
              type: 'track',
              kind: track.kind,
              label: track.label,
              srclang: track.srclang,
              isDefault: track.default
            });
          });
        });

        // Check for video URLs in data attributes
        root.querySelectorAll('[data-video], [data-video-url], [data-video-src], [data-stream], [data-hls], [data-dash]').forEach(el => {
          Object.entries(el.dataset).forEach(([key, val]) => {
            if (val && typeof val === 'string' && val.match(/https?:\/\//)) {
              results.push({ url: val, type: 'data-attribute', attribute: key });
            }
          });
        });

        // Embed and object tags
        root.querySelectorAll('embed[src], object[data]').forEach(el => {
          const src = el.src || el.data;
          if (src) results.push({ url: src, type: 'embed-object' });
        });
      }

      // Scan main DOM
      scanNode(document);

      // Scan shadow DOM
      if (scanShadow) {
        document.querySelectorAll('*').forEach(el => {
          if (el.shadowRoot) {
            scanNode(el.shadowRoot);
          }
        });
      }

      return results;
    }, this.options.scanShadowDOM);

    videoData.forEach(data => {
      const url = data.url || data.src;
      if (url && (this._isVideoSignature(url) || data.type === 'track')) {
        this.addItem(url, { source: 'dom', extractionType: data.type, metadata: data });

        // Store poster/thumbnail
        if (data.poster) {
          this.thumbnails.add(data.poster);
        }

        // Store video metadata
        if (!this.videoMetadata.has(url)) {
          this.videoMetadata.set(url, data);
        }
      }
    });
  }

  async _deepScan() {
    const page = this.browser.page;

    // Scan iframes
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const frameUrls = await frame.evaluate(() => {
          const urls = [];
          document.querySelectorAll('video, source').forEach(el => {
            if (el.src) urls.push({ url: el.src, poster: el.poster });
            if (el.currentSrc) urls.push({ url: el.currentSrc });
          });
          return urls;
        });

        frameUrls.forEach(data => {
          if (this._isVideoSignature(data.url)) {
            this.addItem(data.url, { source: 'iframe', frame: frame.url() });
            if (data.poster) this.thumbnails.add(data.poster);
          }
        });
      } catch (error) {
        logger.debug(`[TBR] Frame scan failed: ${error.message}`);
      }
    }
  }

  async _extractFromPlayerAPIs() {
    const page = this.browser.page;

    const playerUrls = await page.evaluate(() => {
      const urls = [];

      // Video.js
      if (window.videojs) {
        try {
          const players = window.videojs.players || window.videojs.getPlayers?.() || {};
          Object.values(players).forEach(player => {
            if (player) {
              if (player.currentSrc?.()) {
                urls.push({
                  url: player.currentSrc(),
                  player: 'videojs',
                  duration: player.duration?.(),
                  qualities: player.qualityLevels?.()?.map(q => ({
                    height: q.height,
                    width: q.width,
                    bitrate: q.bitrate
                  })) || []
                });
              }
              // Get all sources
              const sources = player.currentSources?.() || [];
              sources.forEach(s => {
                if (s.src) urls.push({ url: s.src, player: 'videojs', type: s.type });
              });
            }
          });
        } catch (e) { }
      }

      // HLS.js
      if (window.Hls && window.Hls.DefaultConfig) {
        document.querySelectorAll('video').forEach(video => {
          try {
            if (video.hls) {
              const hls = video.hls;
              if (hls.url) urls.push({ url: hls.url, player: 'hlsjs', type: 'hls' });
              // Get quality levels
              const levels = hls.levels || [];
              levels.forEach((level, idx) => {
                if (level.url?.[0]) {
                  urls.push({
                    url: level.url[0],
                    player: 'hlsjs',
                    quality: { height: level.height, width: level.width, bitrate: level.bitrate },
                    levelIndex: idx
                  });
                }
              });
              // Get audio tracks
              const audioTracks = hls.audioTracks || [];
              audioTracks.forEach(track => {
                urls.push({ url: track.url, player: 'hlsjs', type: 'audio-track', name: track.name });
              });
            }
          } catch (e) { }
        });
      }

      // DASH.js
      if (window.dashjs) {
        try {
          const players = window.dashjs.MediaPlayer?.getAllInstances?.() || [];
          players.forEach(player => {
            const source = player.getSource?.();
            if (source) urls.push({ url: source, player: 'dashjs', type: 'dash' });
          });
        } catch (e) { }
      }

      // Shaka Player
      if (window.shaka) {
        document.querySelectorAll('video').forEach(video => {
          try {
            if (video.player && video.player.getManifestUri) {
              const uri = video.player.getManifestUri();
              if (uri) urls.push({ url: uri, player: 'shaka' });

              // Get variant tracks (quality levels)
              const tracks = video.player.getVariantTracks?.() || [];
              tracks.forEach(track => {
                urls.push({
                  player: 'shaka',
                  quality: { height: track.height, width: track.width, bitrate: track.bandwidth },
                  language: track.language
                });
              });
            }
          } catch (e) { }
        });
      }

      // JW Player
      if (window.jwplayer) {
        try {
          const instances = window.jwplayer.api?.instances ||
            (typeof jwplayer === 'function' ? [jwplayer()] : []);
          instances.forEach(instance => {
            try {
              const playlist = instance.getPlaylist?.();
              if (playlist) {
                playlist.forEach(item => {
                  if (item.file) urls.push({ url: item.file, player: 'jwplayer' });
                  if (item.sources) {
                    item.sources.forEach(source => {
                      if (source.file) urls.push({
                        url: source.file,
                        player: 'jwplayer',
                        label: source.label,
                        type: source.type
                      });
                    });
                  }
                  // Captions
                  if (item.tracks) {
                    item.tracks.forEach(track => {
                      if (track.file) urls.push({
                        url: track.file,
                        player: 'jwplayer',
                        type: 'caption',
                        label: track.label
                      });
                    });
                  }
                });
              }
              // Get current quality levels
              const levels = instance.getQualityLevels?.() || [];
              levels.forEach(level => {
                if (level.bitrate) {
                  urls.push({ player: 'jwplayer', quality: { label: level.label, bitrate: level.bitrate } });
                }
              });
            } catch (e) { }
          });
        } catch (e) { }
      }

      // Plyr
      if (window.Plyr) {
        document.querySelectorAll('.plyr').forEach(el => {
          try {
            const video = el.querySelector('video');
            if (video?.src) urls.push({ url: video.src, player: 'plyr' });
            if (video?.plyr?.source?.sources) {
              video.plyr.source.sources.forEach(s => {
                if (s.src) urls.push({ url: s.src, player: 'plyr', size: s.size });
              });
            }
          } catch (e) { }
        });
      }

      // Flowplayer
      if (window.flowplayer) {
        try {
          const instances = window.flowplayer.instances || [];
          instances.forEach(fp => {
            const src = fp.video?.src;
            if (src) urls.push({ url: src, player: 'flowplayer' });
          });
        } catch (e) { }
      }

      // Brightcove
      if (window.bc || document.querySelector('.video-js')) {
        document.querySelectorAll('.video-js').forEach(el => {
          try {
            const dataSrc = el.dataset?.videoId || el.dataset?.playerId;
            if (dataSrc) urls.push({
              player: 'brightcove',
              videoId: el.dataset?.videoId,
              accountId: el.dataset?.account
            });
          } catch (e) { }
        });
      }

      // Generic window variables
      ['player', 'videoPlayer', 'mediaPlayer', 'streamPlayer'].forEach(varName => {
        try {
          const p = window[varName];
          if (p) {
            if (p.src) urls.push({ url: p.src, player: varName });
            if (p.currentSrc) urls.push({ url: p.currentSrc, player: varName });
            if (p.source) urls.push({ url: p.source, player: varName });
          }
        } catch (e) { }
      });

      return urls;
    });

    playerUrls.forEach(data => {
      if (data.url && this._isVideoSignature(data.url)) {
        this.addItem(data.url, { source: 'player-api', player: data.player, quality: data.quality });
      }
      // Store platform data
      if (data.player && (data.videoId || data.accountId)) {
        this.platformData.set(data.player, data);
      }
    });
  }

  async _extractPlatformVideos() {
    const page = this.browser.page;

    const platforms = await page.evaluate(() => {
      const found = [];

      // YouTube embeds
      document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').forEach(iframe => {
        const match = iframe.src.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/);
        if (match) {
          found.push({
            platform: 'youtube',
            videoId: match[1],
            embedUrl: iframe.src,
            width: iframe.width,
            height: iframe.height
          });
        }
      });

      // YouTube player
      if (window.YT && window.YT.get) {
        try {
          const players = window.YT.get();
          Object.values(players).forEach(player => {
            const videoData = player.getVideoData?.();
            if (videoData) {
              found.push({
                platform: 'youtube',
                videoId: videoData.video_id,
                title: videoData.title
              });
            }
          });
        } catch (e) { }
      }

      // Vimeo embeds
      document.querySelectorAll('iframe[src*="player.vimeo.com"]').forEach(iframe => {
        const match = iframe.src.match(/player\.vimeo\.com\/video\/(\d+)/);
        if (match) {
          found.push({
            platform: 'vimeo',
            videoId: match[1],
            embedUrl: iframe.src
          });
        }
      });

      // Vimeo player API
      if (window.Vimeo && window.Vimeo.Player) {
        document.querySelectorAll('iframe[src*="vimeo"]').forEach(async (iframe) => {
          try {
            const player = new window.Vimeo.Player(iframe);
            const videoId = await player.getVideoId();
            if (videoId) {
              found.push({ platform: 'vimeo', videoId: String(videoId) });
            }
          } catch (e) { }
        });
      }

      // Wistia embeds
      document.querySelectorAll('[class*="wistia"], iframe[src*="wistia"]').forEach(el => {
        const match = el.className?.match(/wistia_embed wistia_async_(\w+)/) ||
          el.src?.match(/wistia\.com\/embed\/iframe\/(\w+)/);
        if (match) {
          found.push({
            platform: 'wistia',
            videoId: match[1],
            type: el.tagName === 'IFRAME' ? 'iframe' : 'inline'
          });
        }
      });

      // Wistia API
      if (window._wq) {
        try {
          window._wq.push({
            id: '_all', onReady: (video) => {
              found.push({
                platform: 'wistia',
                videoId: video.hashedId(),
                duration: video.duration()
              });
            }
          });
        } catch (e) { }
      }

      // Dailymotion
      document.querySelectorAll('iframe[src*="dailymotion.com"]').forEach(iframe => {
        const match = iframe.src.match(/dailymotion\.com\/embed\/video\/(\w+)/);
        if (match) {
          found.push({ platform: 'dailymotion', videoId: match[1], embedUrl: iframe.src });
        }
      });

      // Twitch
      document.querySelectorAll('iframe[src*="twitch.tv"]').forEach(iframe => {
        found.push({ platform: 'twitch', embedUrl: iframe.src });
      });

      // Facebook Video
      document.querySelectorAll('iframe[src*="facebook.com/plugins/video"]').forEach(iframe => {
        found.push({ platform: 'facebook', embedUrl: iframe.src });
      });

      return found;
    });

    platforms.forEach(data => {
      const embedUrl = data.embedUrl || `https://${data.platform}.com/video/${data.videoId}`;
      this.addItem(embedUrl, { source: 'platform', platform: data.platform, metadata: data });
      this.platformData.set(`${data.platform}-${data.videoId}`, data);
    });
  }

  async _extractSubtitles() {
    const page = this.browser.page;

    const subtitles = await page.evaluate(() => {
      const tracks = [];

      // From track elements
      document.querySelectorAll('video track').forEach(track => {
        if (track.src) {
          tracks.push({
            url: track.src,
            kind: track.kind || 'subtitles',
            label: track.label,
            srclang: track.srclang,
            default: track.default,
            source: 'track-element'
          });
        }
      });

      // From data attributes
      document.querySelectorAll('[data-captions], [data-subtitles], [data-tracks]').forEach(el => {
        const data = el.dataset.captions || el.dataset.subtitles || el.dataset.tracks;
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            items.forEach(item => {
              if (item.src || item.file || item.url) {
                tracks.push({
                  url: item.src || item.file || item.url,
                  label: item.label,
                  srclang: item.language || item.srclang,
                  source: 'data-attribute'
                });
              }
            });
          } catch (e) {
            // Not JSON, might be direct URL
            if (data.match(/https?:\/\//)) {
              tracks.push({ url: data, source: 'data-attribute' });
            }
          }
        }
      });

      // VTT/SRT links
      document.querySelectorAll('a[href*=".vtt"], a[href*=".srt"], a[href*=".sub"]').forEach(a => {
        tracks.push({
          url: a.href,
          label: a.textContent?.trim(),
          source: 'link'
        });
      });

      return tracks;
    });

    subtitles.forEach(track => {
      this.subtitleTracks.push(track);
      this.addItem(track.url, { source: 'subtitle', type: 'caption', metadata: track });
    });
  }

  async _extractAudioTracks() {
    const page = this.browser.page;

    const audioTracks = await page.evaluate(() => {
      const tracks = [];

      document.querySelectorAll('video').forEach(video => {
        // HTMLMediaElement audioTracks
        if (video.audioTracks?.length > 0) {
          for (let i = 0; i < video.audioTracks.length; i++) {
            const track = video.audioTracks[i];
            tracks.push({
              id: track.id,
              kind: track.kind,
              label: track.label,
              language: track.language,
              enabled: track.enabled
            });
          }
        }
      });

      return tracks;
    });

    this.audioTracks = audioTracks;
  }

  async _extractThumbnails() {
    const page = this.browser.page;

    const thumbnails = await page.evaluate(() => {
      const posters = new Set();

      // Video poster attributes
      document.querySelectorAll('video[poster]').forEach(video => {
        if (video.poster) posters.add(video.poster);
      });

      // Common thumbnail data attributes
      document.querySelectorAll('[data-poster], [data-thumbnail], [data-preview]').forEach(el => {
        const url = el.dataset.poster || el.dataset.thumbnail || el.dataset.preview;
        if (url && url.match(/^https?:\/\//)) posters.add(url);
      });

      // og:video:thumbnail
      const ogThumb = document.querySelector('meta[property="og:video:thumbnail"]');
      if (ogThumb?.content) posters.add(ogThumb.content);

      // Twitter player image
      const twitterImg = document.querySelector('meta[name="twitter:image"]');
      if (twitterImg?.content) posters.add(twitterImg.content);

      return Array.from(posters);
    });

    thumbnails.forEach(url => this.thumbnails.add(url));
  }

  _isVideoSignature(str) {
    if (!str || typeof str !== 'string') return false;

    const patterns = [
      // Streaming manifests
      /https?:\/\/[^\s]+\.(m3u8|mpd|ism(?:\/Manifest)?)(\?[^\s]*)?/i,
      // Video files
      /https?:\/\/[^\s]+\.(mp4|webm|mkv|ts|mov|avi|flv|wmv|m4v|3gp)(\?[^\s]*)?/i,
      // Blob URLs
      /blob:https?:\/\/[^\s]+/i,
      // Data URLs
      /data:(?:video|application).*?base64,[^\s]+/i,
      // CDN/streaming patterns
      /https?:\/\/[^\s]*(?:cdn|stream|video|media|vod|hls|dash)[^\s]*\/[^\s]+/i,
      // Segment patterns
      /https?:\/\/[^\s]+(?:segment|chunk|frag)[^\s]+\.(ts|m4s|mp4)/i
    ];

    return patterns.some(regex => regex.test(str));
  }

  normalizeItem(url) {
    try {
      const urlObj = new URL(url, this.browser.page?.url());
      // Clean tracking params but preserve streaming params
      ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid', 'gclid'].forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  async cleanup() {
    logger.info(`[TBR] Extraction complete: ${this.extractedItems.size} video sources found`);
    if (this.options.closeBrowser !== false && this.browser && typeof this.browser.close === 'function') {
      await this.browser.close();
    }
  }

  /**
   * Export results with comprehensive grouping
   */
  exportResults() {
    const base = super.exportResults();

    // Group by video format
    const grouped = {
      hls: [],
      dash: [],
      direct: [],
      blob: [],
      embedded: [],
      other: []
    };

    this.extractedItems.forEach(url => {
      const lower = url.toLowerCase();
      if (lower.includes('.m3u8')) grouped.hls.push(url);
      else if (lower.includes('.mpd')) grouped.dash.push(url);
      else if (lower.match(/\.(mp4|webm|mkv|mov|avi|flv)/)) grouped.direct.push(url);
      else if (lower.startsWith('blob:')) grouped.blob.push(url);
      else if (lower.includes('youtube') || lower.includes('vimeo') ||
        lower.includes('wistia') || lower.includes('dailymotion')) {
        grouped.embedded.push(url);
      }
      else grouped.other.push(url);
    });

    return {
      ...base,
      grouped,
      metadata: Object.fromEntries(this.videoMetadata),
      subtitles: this.subtitleTracks,
      audioTracks: this.audioTracks,
      thumbnails: Array.from(this.thumbnails),
      platforms: Object.fromEntries(this.platformData)
    };
  }
}

module.exports = TBRExtractor;
