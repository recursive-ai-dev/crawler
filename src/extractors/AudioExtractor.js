const BaseExtractor = require('./BaseExtractor');
const logger = require('../utils/logger');
const { clamp } = require('../utils/mathUtils');

/**
 * AudioExtractor - Enterprise-grade audio extraction
 * Features:
 * - Streaming audio detection (HLS, DASH audio tracks)
 * - Podcast/media player integration
 * - Audio metadata extraction (ID3, duration, bitrate)
 * - Multiple quality detection and selection
 * - Web Audio API interception
 * - Embedded SoundCloud, Spotify, Bandcamp support
 * - Audio from video sources (audio-only streams)
 */
class AudioExtractor extends BaseExtractor {
    constructor(browserInterface, options = {}) {
        super({
            observationWindow: clamp(options.observationWindow || 5000, 1000, 30000),
            monitorNetwork: options.monitorNetwork !== false,
            scanWebAudioAPI: options.scanWebAudioAPI !== false,
            extractMetadata: options.extractMetadata !== false,
            qualityPreference: ['highest', 'lowest', 'all'].includes(options.qualityPreference)
                ? options.qualityPreference
                : 'highest',
            supportedFormats: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'webm'],
            streamingFormats: ['m3u8', 'mpd'],
            ...options
        });

        this.browser = browserInterface;
        this.networkUrls = new Set();
        this.audioMetadata = new Map();
        this.playerInstances = new Map();
    }

    async initialize(url) {
        logger.info(`[AudioExtractor] Initializing for ${url}`);
        this.currentUrl = url;
        await this.browser.initialize(url);

        if (this.options.monitorNetwork) {
            await this._instrumentNetwork();
        }

        await this._setupAudioMonitoring();
    }

    async _instrumentNetwork() {
        const page = this.browser.page;

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            const resourceType = request.resourceType();

            // Intercept audio requests
            if (resourceType === 'media' || this._isAudioUrl(url)) {
                this.networkUrls.add(url);
                this.addItem(url, {
                    source: 'network',
                    type: resourceType,
                    headers: request.headers()
                });
                logger.debug(`[AudioExtractor] Network audio: ${url}`);
            }
            request.continue();
        });

        // Monitor responses for content-type detection
        page.on('response', async (response) => {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            const contentLength = response.headers()['content-length'];

            if (contentType.includes('audio') ||
                contentType.includes('application/ogg') ||
                contentType.includes('application/x-mpegurl')) {
                const metadata = {
                    source: 'network-response',
                    contentType,
                    size: contentLength ? parseInt(contentLength) : null
                };
                this.audioMetadata.set(url, metadata);
                this.addItem(url, metadata);
                logger.debug(`[AudioExtractor] Audio response: ${url} (${contentType})`);
            }
        });
    }

    async _setupAudioMonitoring() {
        const page = this.browser.page;

        // Inject Web Audio API monitoring
        if (this.options.scanWebAudioAPI) {
            await page.evaluateOnNewDocument(() => {
                window._audioExtractorData = {
                    audioElements: [],
                    audioContexts: [],
                    mediaElementSources: []
                };

                // Monitor HTMLAudioElement creation
                const originalAudio = window.Audio;
                window.Audio = function (...args) {
                    const audio = new originalAudio(...args);
                    window._audioExtractorData.audioElements.push({
                        src: args[0] || null,
                        timestamp: Date.now()
                    });
                    return audio;
                };

                // Monitor AudioContext
                const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
                if (OriginalAudioContext) {
                    window.AudioContext = window.webkitAudioContext = function (...args) {
                        const ctx = new OriginalAudioContext(...args);
                        window._audioExtractorData.audioContexts.push({
                            sampleRate: ctx.sampleRate,
                            state: ctx.state,
                            timestamp: Date.now()
                        });
                        return ctx;
                    };
                }
            });
        }

        // Monitor DOM mutations for audio elements
        await page.evaluate(() => {
            window._audioMutations = [];

            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'AUDIO' || node.tagName === 'SOURCE') {
                                window._audioMutations.push({
                                    tag: node.tagName,
                                    src: node.src || node.getAttribute('src'),
                                    type: node.type || node.getAttribute('type'),
                                    timestamp: Date.now()
                                });
                            }
                            // Check for audio inside added nodes
                            if (node.querySelectorAll) {
                                node.querySelectorAll('audio, source').forEach(el => {
                                    window._audioMutations.push({
                                        tag: el.tagName,
                                        src: el.src || el.getAttribute('src'),
                                        type: el.type || el.getAttribute('type'),
                                        timestamp: Date.now()
                                    });
                                });
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'data-src']
            });
        });
    }

    async extract() {
        logger.info('[AudioExtractor] Starting audio extraction...');

        // Phase 1: Immediate DOM extraction
        await this._extractFromDOM();

        // Phase 2: Wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, this.options.observationWindow));

        // Phase 3: Extract from audio player APIs
        await this._extractFromPlayerAPIs();

        // Phase 4: Deep scan iframes and shadow DOM
        await this._deepScan();

        // Phase 5: Extract embedded platform content
        await this._extractEmbeddedPlatforms();

        // Phase 6: Extract from Web Audio API monitoring
        await this._extractWebAudioData();

        // Phase 7: Process network-captured URLs
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

        const audioData = await page.evaluate((supportedFormats) => {
            const results = [];

            function scanNode(root) {
                // Audio elements
                root.querySelectorAll('audio').forEach(audio => {
                    const data = {
                        type: 'audio-element',
                        src: audio.src || audio.currentSrc,
                        dataSrc: audio.dataset?.src,
                        dataUrl: audio.dataset?.url,
                        dataFile: audio.dataset?.file,
                        duration: audio.duration,
                        preload: audio.preload,
                        controls: audio.controls,
                        autoplay: audio.autoplay
                    };

                    if (data.src) results.push(data);
                    if (data.dataSrc) results.push({ ...data, src: data.dataSrc, type: 'audio-data-src' });
                    if (data.dataUrl) results.push({ ...data, src: data.dataUrl, type: 'audio-data-url' });
                    if (data.dataFile) results.push({ ...data, src: data.dataFile, type: 'audio-data-file' });

                    // Check source children
                    audio.querySelectorAll('source').forEach(source => {
                        if (source.src) {
                            results.push({
                                type: 'audio-source',
                                src: source.src,
                                mimeType: source.type
                            });
                        }
                    });
                });

                // Podcast player elements
                root.querySelectorAll('[data-audio], [data-track], [data-podcast], [data-episode]').forEach(el => {
                    Object.entries(el.dataset).forEach(([key, val]) => {
                        if (val && typeof val === 'string' && val.match(/https?:\/\//)) {
                            results.push({
                                type: 'podcast-data',
                                src: val,
                                dataKey: key
                            });
                        }
                    });
                });

                // Links to audio files
                supportedFormats.forEach(format => {
                    root.querySelectorAll(`a[href*=".${format}"]`).forEach(link => {
                        results.push({
                            type: 'audio-link',
                            src: link.href,
                            text: link.textContent?.trim(),
                            format
                        });
                    });
                });
            }

            // Scan main DOM
            scanNode(document);

            // Scan shadow DOM
            document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    scanNode(el.shadowRoot);
                }
            });

            return results;
        }, this.options.supportedFormats);

        audioData.forEach(data => {
            if (this._isAudioUrl(data.src)) {
                this.addItem(data.src, {
                    source: 'dom',
                    extractionType: data.type,
                    metadata: data
                });

                // Store metadata
                if (!this.audioMetadata.has(data.src)) {
                    this.audioMetadata.set(data.src, data);
                }
            }
        });
    }

    async _extractFromPlayerAPIs() {
        const page = this.browser.page;

        const playerUrls = await page.evaluate(() => {
            const urls = [];

            // Howler.js
            if (window.Howl && window._howl) {
                try {
                    Object.values(window._howl).forEach(howl => {
                        if (howl._src) {
                            urls.push({ url: howl._src, player: 'howler' });
                        }
                    });
                } catch (e) { }
            }

            // Amplitude.js
            if (window.Amplitude) {
                try {
                    const songs = window.Amplitude.getSongs?.() || [];
                    songs.forEach(song => {
                        if (song.url) urls.push({ url: song.url, player: 'amplitude' });
                    });
                } catch (e) { }
            }

            // Plyr
            if (window.Plyr) {
                try {
                    document.querySelectorAll('.plyr--audio').forEach(el => {
                        const audio = el.querySelector('audio');
                        if (audio?.src) urls.push({ url: audio.src, player: 'plyr' });
                    });
                } catch (e) { }
            }

            // MediaElement.js
            if (window.mejs) {
                try {
                    Object.values(window.mejs.players || {}).forEach(player => {
                        if (player.media?.src) {
                            urls.push({ url: player.media.src, player: 'mediaelement' });
                        }
                    });
                } catch (e) { }
            }

            // JPlayer
            if (window.jPlayer) {
                try {
                    document.querySelectorAll('.jp-audio').forEach(container => {
                        const status = $(container).data('jPlayer')?.status;
                        if (status?.src) urls.push({ url: status.src, player: 'jplayer' });
                    });
                } catch (e) { }
            }

            // Generic check for common audio player variables
            ['audioPlayer', 'musicPlayer', 'podcastPlayer', 'soundPlayer'].forEach(varName => {
                try {
                    if (window[varName]) {
                        const p = window[varName];
                        if (p.src) urls.push({ url: p.src, player: varName });
                        if (p.currentSrc) urls.push({ url: p.currentSrc, player: varName });
                        if (p._src) urls.push({ url: p._src, player: varName });
                    }
                } catch (e) { }
            });

            return urls;
        });

        playerUrls.forEach(({ url, player }) => {
            if (this._isAudioUrl(url)) {
                this.addItem(url, { source: 'player-api', player });
                this.playerInstances.set(url, player);
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
                    document.querySelectorAll('audio, source').forEach(el => {
                        if (el.src) urls.push(el.src);
                        if (el.currentSrc) urls.push(el.currentSrc);
                    });
                    return urls;
                });

                frameUrls.forEach(url => {
                    if (this._isAudioUrl(url)) {
                        this.addItem(url, { source: 'iframe', frame: frame.url() });
                    }
                });
            } catch (error) {
                logger.debug(`[AudioExtractor] Frame scan failed: ${error.message}`);
            }
        }
    }

    async _extractEmbeddedPlatforms() {
        const page = this.browser.page;

        const embeddedData = await page.evaluate(() => {
            const results = [];

            // SoundCloud embeds
            document.querySelectorAll('iframe[src*="soundcloud.com"]').forEach(iframe => {
                results.push({
                    platform: 'soundcloud',
                    embedUrl: iframe.src,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // Spotify embeds
            document.querySelectorAll('iframe[src*="spotify.com"]').forEach(iframe => {
                results.push({
                    platform: 'spotify',
                    embedUrl: iframe.src,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // Bandcamp embeds
            document.querySelectorAll('iframe[src*="bandcamp.com"]').forEach(iframe => {
                results.push({
                    platform: 'bandcamp',
                    embedUrl: iframe.src,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // Mixcloud embeds
            document.querySelectorAll('iframe[src*="mixcloud.com"]').forEach(iframe => {
                results.push({
                    platform: 'mixcloud',
                    embedUrl: iframe.src,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // Anchor.fm / Spotify for Podcasters
            document.querySelectorAll('iframe[src*="anchor.fm"]').forEach(iframe => {
                results.push({
                    platform: 'anchor',
                    embedUrl: iframe.src,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // RSS feed links (podcast feeds)
            document.querySelectorAll('link[type*="rss"], link[type*="xml"], a[href*=".rss"], a[href*="/feed"]').forEach(el => {
                const href = el.href || el.getAttribute('href');
                if (href) {
                    results.push({
                        platform: 'rss-feed',
                        feedUrl: href,
                        title: el.title || el.textContent?.trim()
                    });
                }
            });

            return results;
        });

        embeddedData.forEach(data => {
            if (data.embedUrl) {
                this.addItem(data.embedUrl, {
                    source: 'embedded-platform',
                    platform: data.platform,
                    metadata: data
                });
            }
            if (data.feedUrl) {
                this.addItem(data.feedUrl, {
                    source: 'podcast-feed',
                    metadata: data
                });
            }
        });
    }

    async _extractWebAudioData() {
        const page = this.browser.page;

        try {
            const webAudioData = await page.evaluate(() => {
                return window._audioExtractorData || {};
            });

            if (webAudioData.audioElements) {
                webAudioData.audioElements.forEach(({ src }) => {
                    if (src && this._isAudioUrl(src)) {
                        this.addItem(src, { source: 'web-audio-api' });
                    }
                });
            }

            // Get dynamically added audio
            const mutations = await page.evaluate(() => window._audioMutations || []);
            mutations.forEach(({ src }) => {
                if (src && this._isAudioUrl(src)) {
                    this.addItem(src, { source: 'dom-mutation' });
                }
            });
        } catch (error) {
            logger.debug(`[AudioExtractor] Web Audio extraction failed: ${error.message}`);
        }
    }

    _isAudioUrl(str) {
        if (!str || typeof str !== 'string') return false;

        const patterns = [
            // Direct audio files
            new RegExp(`\\.(${this.options.supportedFormats.join('|')})(\\?|$)`, 'i'),
            // Streaming audio
            /\.m3u8(\?|$)/i,
            /\.mpd(\?|$)/i,
            // CDN patterns
            /https?:\/\/[^\s]*(?:audio|music|podcast|stream|media|cdn)[^\s]*\.[^\s]+(mp3|ogg|wav|m4a)/i,
            // Audio content type indicators in URL
            /audio_only|audio-only|audioonly/i
        ];

        return patterns.some(regex => regex.test(str));
    }

    normalizeItem(url) {
        try {
            const urlObj = new URL(url, this.browser.page?.url());
            // Clean tracking params but preserve audio quality params
            ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'].forEach(param => {
                urlObj.searchParams.delete(param);
            });
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    async cleanup() {
        logger.info(`[AudioExtractor] Extraction complete: ${this.extractedItems.size} audio sources found`);
        if (this.options.closeBrowser !== false && this.browser && typeof this.browser.close === 'function') {
            await this.browser.close();
        }
    }

    /**
     * Export results grouped by type and format
     */
    exportResults() {
        const base = super.exportResults();

        // Group by audio format
        const grouped = {
            mp3: [],
            ogg: [],
            wav: [],
            flac: [],
            m4a: [],
            aac: [],
            opus: [],
            webm: [],
            streaming: [],
            embedded: [],
            other: []
        };

        this.extractedItems.forEach(url => {
            const lower = url.toLowerCase();
            if (lower.includes('.mp3')) grouped.mp3.push(url);
            else if (lower.includes('.ogg')) grouped.ogg.push(url);
            else if (lower.includes('.wav')) grouped.wav.push(url);
            else if (lower.includes('.flac')) grouped.flac.push(url);
            else if (lower.includes('.m4a')) grouped.m4a.push(url);
            else if (lower.includes('.aac')) grouped.aac.push(url);
            else if (lower.includes('.opus')) grouped.opus.push(url);
            else if (lower.includes('.webm')) grouped.webm.push(url);
            else if (lower.includes('.m3u8') || lower.includes('.mpd')) grouped.streaming.push(url);
            else if (lower.includes('spotify') || lower.includes('soundcloud') ||
                lower.includes('bandcamp') || lower.includes('mixcloud')) {
                grouped.embedded.push(url);
            }
            else grouped.other.push(url);
        });

        return {
            ...base,
            grouped,
            metadata: Object.fromEntries(this.audioMetadata),
            players: Object.fromEntries(this.playerInstances)
        };
    }
}

module.exports = AudioExtractor;
