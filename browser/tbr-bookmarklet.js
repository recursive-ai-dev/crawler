/**
 * Browser-compatible TBR Extractor (Bookmarklet/Console version)
 * Extracts video sources from complex players and streaming protocols
 * 
 * Usage: Copy-paste into browser console or create as bookmarklet
 */

(function() {
  'use strict';
  
  class BrowserTBRExtractor {
    constructor(options = {}) {
      this.options = {
        observationWindow: 5000,
        ...options
      };
      
      this.videoArchive = new Set();
      this.ui = null;
      this.originalFetch = null;
      this.originalXHR = null;
    }

    async run() {
      this._createUI();
      this._log('Starting TBR extraction...');
      
      // Instrument network
      this._instrumentNetwork();
      
      // Extract from DOM
      this._log('Phase 1: DOM extraction...');
      this._extractFromDOM();
      
      // Wait for network activity
      this._log(`Phase 2: Monitoring network (${this.options.observationWindow}ms)...`);
      await this._wait(this.options.observationWindow);
      
      // Extract from player APIs
      this._log('Phase 3: Player API extraction...');
      this._extractFromPlayerAPIs();
      
      // Restore network
      this._restoreNetwork();
      
      this._showResults();
    }

    _instrumentNetwork() {
      const self = this;
      
      // Intercept fetch
      this.originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (self._isVideoSignature(url)) {
          self.videoArchive.add(self._normalizeUrl(url));
          self._log(`🌐 Fetch: ${url.substring(0, 60)}...`);
        }
        return self.originalFetch.apply(this, args);
      };

      // Intercept XHR
      const OriginalXHR = XMLHttpRequest;
      window.XMLHttpRequest = new Proxy(OriginalXHR, {
        construct(target) {
          const instance = new target();
          const originalOpen = instance.open;
          
          instance.open = function(method, url, ...rest) {
            if (self._isVideoSignature(url)) {
              self.videoArchive.add(self._normalizeUrl(url));
              self._log(`🌐 XHR: ${url.substring(0, 60)}...`);
            }
            return originalOpen.call(this, method, url, ...rest);
          };
          
          return instance;
        }
      });
      
      this.originalXHR = OriginalXHR;
    }

    _restoreNetwork() {
      if (this.originalFetch) {
        window.fetch = this.originalFetch;
      }
      if (this.originalXHR) {
        window.XMLHttpRequest = this.originalXHR;
      }
    }

    _extractFromDOM() {
      // Video elements
      document.querySelectorAll('video').forEach(video => {
        [video.src, video.currentSrc].forEach(url => {
          if (url) this._addVideo(url, 'video-element');
        });
        
        Object.keys(video.dataset).forEach(key => {
          const value = video.dataset[key];
          if (this._isVideoSignature(value)) {
            this._addVideo(value, `video-data-${key}`);
          }
        });
      });
      
      // Source elements
      document.querySelectorAll('source').forEach(source => {
        if (source.src) this._addVideo(source.src, 'source-element');
      });
      
      // Scan shadow DOM
      document.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          el.shadowRoot.querySelectorAll('video, source').forEach(v => {
            if (v.src) this._addVideo(v.src, 'shadow-dom');
          });
        }
      });
      
      // Scan iframes (same-origin only)
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.querySelectorAll('video, source').forEach(v => {
            if (v.src) this._addVideo(v.src, 'iframe');
          });
        } catch (e) {
          // Cross-origin iframe
        }
      });
    }

    _extractFromPlayerAPIs() {
      // Video.js
      if (window.videojs?.players) {
        Object.values(window.videojs.players).forEach((player, idx) => {
          try {
            const src = player.currentSrc?.();
            if (src) this._addVideo(src, `videojs-${idx}`);
          } catch (e) {}
        });
      }
      
      // HLS.js
      document.querySelectorAll('video').forEach(video => {
        if (video.hls?.url) {
          this._addVideo(video.hls.url, 'hlsjs');
        }
      });
      
      // Shaka Player
      document.querySelectorAll('video').forEach(video => {
        try {
          if (video.player?.getManifestUri) {
            const uri = video.player.getManifestUri();
            if (uri) this._addVideo(uri, 'shaka');
          }
        } catch (e) {}
      });
      
      // JW Player
      if (window.jwplayer?.api?.instances) {
        window.jwplayer.api.instances.forEach((instance, idx) => {
          try {
            const playlist = instance.getPlaylist();
            playlist?.forEach(item => {
              if (item.file) this._addVideo(item.file, `jwplayer-${idx}`);
              item.sources?.forEach(source => {
                if (source.file) this._addVideo(source.file, `jwplayer-${idx}`);
              });
            });
          } catch (e) {}
        });
      }
      
      // Generic player variables
      ['player', 'videoPlayer', 'mediaPlayer', '_player'].forEach(varName => {
        try {
          if (window[varName]?.src) {
            this._addVideo(window[varName].src, varName);
          }
        } catch (e) {}
      });
    }

    _addVideo(url, source) {
      if (url && this._isVideoSignature(url)) {
        this.videoArchive.add(this._normalizeUrl(url));
        this._log(`📹 Found: ${url.substring(0, 60)}... [${source}]`);
      }
    }

    _isVideoSignature(str) {
      if (!str || typeof str !== 'string') return false;
      
      const patterns = [
        /\.(m3u8|mpd|ism)/i,
        /\.(mp4|webm|mkv|ts|mov|avi)/i,
        /blob:https?:\/\//i,
        /data:video/i,
        /stream|video|media|cdn/i
      ];

      return patterns.some(regex => regex.test(str));
    }

    _normalizeUrl(url) {
      try {
        const urlObj = new URL(url, window.location.origin);
        ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(p => 
          urlObj.searchParams.delete(p)
        );
        return urlObj.toString();
      } catch {
        return url;
      }
    }

    _createUI() {
      if (this.ui) return;
      
      this.ui = document.createElement('div');
      this.ui.id = 'tbr-extractor-ui';
      this.ui.innerHTML = `
        <style>
          #tbr-extractor-ui {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 400px;
            background: #1e1e1e;
            color: #ff00ff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(255,0,255,0.3);
            font-family: 'Courier New', monospace;
            z-index: 999999;
            font-size: 12px;
          }
          #tbr-extractor-ui h3 {
            margin: 0 0 15px 0;
            color: #ff00ff;
            font-size: 16px;
          }
          #tbr-log {
            background: #0a0a0a;
            padding: 10px;
            border-radius: 5px;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 10px;
          }
          #tbr-stats {
            background: #0a0a0a;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #ff00ff;
          }
          #tbr-actions button {
            background: #ff00ff;
            color: #000;
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
            margin-top: 5px;
          }
          #tbr-actions button:hover {
            background: #cc00cc;
          }
        </style>
        <h3>📡 TBR Video Extractor</h3>
        <div id="tbr-stats">
          <div>Videos Found: <span class="stat-value" id="video-count">0</span></div>
        </div>
        <div id="tbr-log"></div>
        <div id="tbr-actions"></div>
      `;
      
      document.body.appendChild(this.ui);
    }

    _log(message) {
      const log = this.ui.querySelector('#tbr-log');
      const entry = document.createElement('div');
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
      console.log(`[TBR] ${message}`);
      
      document.getElementById('video-count').textContent = this.videoArchive.size;
    }

    _showResults() {
      const actions = this.ui.querySelector('#tbr-actions');
      
      // Group by format
      const grouped = {
        hls: [],
        dash: [],
        direct: [],
        blob: [],
        other: []
      };
      
      this.videoArchive.forEach(url => {
        if (url.includes('.m3u8')) grouped.hls.push(url);
        else if (url.includes('.mpd')) grouped.dash.push(url);
        else if (url.match(/\.(mp4|webm|mkv|mov)/)) grouped.direct.push(url);
        else if (url.startsWith('blob:')) grouped.blob.push(url);
        else grouped.other.push(url);
      });
      
      actions.innerHTML = `
        <button onclick="window.tbrDownloadJSON()">📥 Download JSON</button>
        <button onclick="window.tbrDownloadM3U()">📄 Download M3U Playlist</button>
        <button onclick="window.tbrCopyToClipboard()">📋 Copy URLs</button>
        <button onclick="window.tbrClose()">✖ Close</button>
      `;
      
      window.tbrDownloadJSON = () => this._download('tbr-videos.json', 
        JSON.stringify({ videos: Array.from(this.videoArchive), grouped }, null, 2));
      
      window.tbrDownloadM3U = () => {
        const m3u = '#EXTM3U\n' + Array.from(this.videoArchive).map((url, i) => 
          `#EXTINF:-1,Video ${i+1}\n${url}`
        ).join('\n');
        this._download('tbr-videos.m3u', m3u);
      };
      
      window.tbrCopyToClipboard = () => {
        navigator.clipboard.writeText(Array.from(this.videoArchive).join('\n'));
        this._log('✓ Copied to clipboard!');
      };
      
      window.tbrClose = () => {
        this._restoreNetwork();
        this.ui.remove();
      };
      
      this._log(`✓ Complete! Found ${this.videoArchive.size} video sources`);
      this._log(`  HLS: ${grouped.hls.length}, DASH: ${grouped.dash.length}, Direct: ${grouped.direct.length}`);
    }

    _download(filename, content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      this._log(`✓ Downloaded ${filename}`);
    }

    _wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Auto-run
  window.TBRExtractor = BrowserTBRExtractor;
  const extractor = new BrowserTBRExtractor();
  extractor.run();
})();
