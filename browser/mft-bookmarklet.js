/**
 * Browser-compatible MFT Extractor (Bookmarklet/Console version)
 * Extracts images and media from lazy-loaded content
 * 
 * Usage: Copy-paste into browser console or create as bookmarklet
 */

(function() {
  'use strict';
  
  class BrowserMFTExtractor {
    constructor(options = {}) {
      this.options = {
        scrollStep: 800,
        scrollDelay: 1000,
        maxScrolls: 50,
        ...options
      };
      
      this.extractedMedia = new Set();
      this.ui = null;
    }

    async run() {
      this._createUI();
      this._log('Starting MFT extraction...');
      
      let depth = 0;
      let previousCount = 0;
      
      while (depth < this.options.maxScrolls) {
        this._log(`Depth ${depth}: Scanning...`);
        
        this._extractFromCurrentView();
        this._triggerLazyLoads();
        await this._scroll();
        
        const currentCount = this.extractedMedia.size;
        const growth = currentCount - previousCount;
        
        this._updateStats(depth, currentCount, growth);
        
        if (growth === 0 && depth > 3) {
          this._log('✓ Stabilized - no new media found');
          break;
        }
        
        previousCount = currentCount;
        depth++;
        
        await this._wait(this.options.scrollDelay);
      }
      
      this._showResults();
    }

    _extractFromCurrentView() {
      // Standard img tags
      document.querySelectorAll('img').forEach(img => {
        [img.src, img.dataset.src, img.dataset.original, img.dataset.lazy].forEach(url => {
          if (url) this._addMedia(url);
        });
        
        if (img.srcset) {
          img.srcset.split(',').forEach(entry => {
            const url = entry.trim().split(' ')[0];
            if (url) this._addMedia(url);
          });
        }
      });
      
      // Background images
      document.querySelectorAll('[style*="background"]').forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (match) this._addMedia(match[1]);
        }
      });
      
      // Picture sources
      document.querySelectorAll('picture source').forEach(source => {
        if (source.srcset) {
          source.srcset.split(',').forEach(entry => {
            const url = entry.trim().split(' ')[0];
            if (url) this._addMedia(url);
          });
        }
      });
    }

    _triggerLazyLoads() {
      const selectors = [
        'img[data-src]', 'img[data-srcset]', 'img[loading="lazy"]',
        '[data-bg]', '[data-background]'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.scrollIntoView({ block: 'center', behavior: 'auto' });
          
          ['mouseenter', 'mouseover'].forEach(type => {
            el.dispatchEvent(new Event(type, { bubbles: true }));
          });
        });
      });
    }

    async _scroll() {
      window.scrollBy({ top: this.options.scrollStep, behavior: 'smooth' });
      await this._wait(300);
    }

    _addMedia(url) {
      if (url && url.startsWith('http') && this._isImageUrl(url)) {
        this.extractedMedia.add(url);
      }
    }

    _isImageUrl(url) {
      return /\.(jpg|jpeg|png|webp|gif|svg|bmp)/i.test(url);
    }

    _createUI() {
      if (this.ui) return;
      
      this.ui = document.createElement('div');
      this.ui.id = 'mft-extractor-ui';
      this.ui.innerHTML = `
        <style>
          #mft-extractor-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: #1e1e1e;
            color: #00d4ff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,212,255,0.3);
            font-family: 'Courier New', monospace;
            z-index: 999999;
            font-size: 12px;
          }
          #mft-extractor-ui h3 {
            margin: 0 0 15px 0;
            color: #00d4ff;
            font-size: 16px;
          }
          #mft-log {
            background: #0a0a0a;
            padding: 10px;
            border-radius: 5px;
            max-height: 150px;
            overflow-y: auto;
            margin-bottom: 10px;
          }
          #mft-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .stat {
            background: #0a0a0a;
            padding: 8px;
            border-radius: 5px;
          }
          .stat-label {
            font-size: 10px;
            opacity: 0.7;
          }
          .stat-value {
            font-size: 18px;
            font-weight: bold;
          }
          #mft-actions button {
            background: #00d4ff;
            color: #000;
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
            margin-top: 5px;
          }
          #mft-actions button:hover {
            background: #00a8cc;
          }
        </style>
        <h3>🎯 MFT Extractor</h3>
        <div id="mft-stats">
          <div class="stat">
            <div class="stat-label">Items Found</div>
            <div class="stat-value" id="item-count">0</div>
          </div>
          <div class="stat">
            <div class="stat-label">Depth</div>
            <div class="stat-value" id="depth-count">0</div>
          </div>
        </div>
        <div id="mft-log"></div>
        <div id="mft-actions"></div>
      `;
      
      document.body.appendChild(this.ui);
    }

    _log(message) {
      const log = this.ui.querySelector('#mft-log');
      const entry = document.createElement('div');
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
      console.log(`[MFT] ${message}`);
    }

    _updateStats(depth, count, growth) {
      document.getElementById('depth-count').textContent = depth;
      document.getElementById('item-count').textContent = count;
    }

    _showResults() {
      const actions = this.ui.querySelector('#mft-actions');
      
      actions.innerHTML = `
        <button onclick="window.mftDownloadJSON()">📥 Download JSON</button>
        <button onclick="window.mftDownloadTXT()">📄 Download TXT</button>
        <button onclick="window.mftCopyToClipboard()">📋 Copy URLs</button>
        <button onclick="window.mftClose()">✖ Close</button>
      `;
      
      window.mftDownloadJSON = () => this._download('mft-media.json', 
        JSON.stringify(Array.from(this.extractedMedia), null, 2));
      
      window.mftDownloadTXT = () => this._download('mft-media.txt', 
        Array.from(this.extractedMedia).join('\n'));
      
      window.mftCopyToClipboard = () => {
        navigator.clipboard.writeText(Array.from(this.extractedMedia).join('\n'));
        this._log('✓ Copied to clipboard!');
      };
      
      window.mftClose = () => this.ui.remove();
      
      this._log(`✓ Complete! Found ${this.extractedMedia.size} media items`);
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
  window.MFTExtractor = BrowserMFTExtractor;
  const extractor = new BrowserMFTExtractor();
  extractor.run();
})();
