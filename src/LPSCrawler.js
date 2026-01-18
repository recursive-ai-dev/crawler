const EventEmitter = require('events');
const logger = require('./utils/logger');
const DataSynthesizer = require('./DataSynthesizer');

class LPSCrawler extends EventEmitter {
  constructor(browserInterface, options = {}) {
    super();
    
    this.config = {
      maxPhases: 50,
      tensionThreshold: 0.5,
      stasisWindow: 3,
      outputDir: './output',
      saveInterval: 10,
      ...options
    };

    this.browser = browserInterface;
    this.discoverySet = new Map(); // Using Map for richer metadata
    this.wavefrontSize = 1;
    this.phase = 0;
    this.tensionMap = [];
    this.isStasis = false;
    this.extractionLog = [];
    this.startTime = Date.now();
  }

  calculateTension(newLinks) {
    const initialSize = this.discoverySet.size;
    let newDiscoveries = 0;

    for (const link of newLinks) {
      if (!this.discoverySet.has(link.url)) {
        this.discoverySet.set(link.url, {
          ...link,
          discoveredAt: Date.now(),
          phase: this.phase
        });
        
        this.extractionLog.push({
          data: link,
          phase: this.phase,
          timestamp: Date.now(),
          interaction: this.phase % 2 === 0 ? 'SCROLL' : 'PAGE_NEXT',
          wavefrontSize: this.wavefrontSize
        });
        
        newDiscoveries++;
      }
    }

    const tension = newDiscoveries / this.wavefrontSize;
    logger.debug(`Phase ${this.phase}: ${newDiscoveries} new links, tension: ${tension.toFixed(2)}`);
    
    return tension;
  }

  async phaseShift() {
    const interactionType = this.phase % 2 === 0 ? 'SCROLL' : 'PAGE_NEXT';
    
    this.emit('phaseStart', { phase: this.phase, interaction: interactionType });
    logger.info(`[Phase ${this.phase}] Executing ${interactionType}...`);

    try {
      const newElements = await this.browser.interact(interactionType);
      const tension = this.calculateTension(newElements);
      
      this.tensionMap.push(tension);
      this._adaptWavefront(tension);
      this._checkStasis();

      this.emit('phaseComplete', { 
        phase: this.phase, 
        tension, 
        discovered: this.discoverySet.size 
      });

    } catch (error) {
      logger.error(`Phase ${this.phase} failed:`, error);
      this.emit('phaseError', { phase: this.phase, error });
    }

    this.phase++;
    
    // Save state periodically
    if (this.phase % this.config.saveInterval === 0) {
      await this._saveCheckpoint();
    }
  }

  _adaptWavefront(tension) {
    if (tension > this.config.tensionThreshold) {
      this.wavefrontSize++;
      logger.info(`-> Tension high (${tension.toFixed(2)}): Expanding wavefront to ${this.wavefrontSize}`);
    } else if (tension === 0 && this.wavefrontSize > 1) {
      this.wavefrontSize--;
      logger.info(`-> Tension zero: Contracting wavefront to ${this.wavefrontSize}`);
    }
  }

  _checkStasis() {
    const recentTensions = this.tensionMap.slice(-this.config.stasisWindow);
    if (recentTensions.length >= this.config.stasisWindow && 
        recentTensions.every(t => t === 0)) {
      this.isStasis = true;
      logger.info('Stasis detected - no new discoveries in recent phases');
    }

    if (this.phase >= this.config.maxPhases) {
      this.isStasis = true;
      logger.info(`Phase limit (${this.config.maxPhases}) reached`);
    }
  }

  async run(startUrl) {
    this.emit('crawlStart', { url: startUrl });
    logger.info(`Starting LPS Discovery for ${startUrl}...`);

    try {
      await this.browser.initialize(startUrl);
      
      while (!this.isStasis) {
        await this.phaseShift();
        // Adaptive delay based on wavefront size
        await new Promise(r => setTimeout(r, 500 * this.wavefrontSize));
      }

      await this._finalize();
      return this._generateReport();

    } catch (error) {
      logger.error('Crawl failed:', error);
      this.emit('crawlError', { error });
      throw error;
    } finally {
      await this.browser.close();
      this.emit('crawlEnd');
    }
  }

  async _saveCheckpoint() {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(this.config.outputDir, { recursive: true });
      
      const checkpoint = {
        phase: this.phase,
        discoverySet: Array.from(this.discoverySet.entries()),
        tensionMap: this.tensionMap,
        timestamp: Date.now()
      };
      
      await fs.writeFile(
        `${this.config.outputDir}/checkpoint.json`,
        JSON.stringify(checkpoint, null, 2)
      );
      
      logger.debug(`Checkpoint saved at phase ${this.phase}`);
    } catch (error) {
      logger.warn('Failed to save checkpoint:', error);
    }
  }

  async _finalize() {
    logger.info(`\nStasis reached after ${this.phase} phases`);
    logger.info(`Total unique links: ${this.discoverySet.size}`);
    
    const synthesizer = new DataSynthesizer(this.extractionLog);
    
    try {
      const fs = require('fs').promises;
      await fs.mkdir(this.config.outputDir, { recursive: true });
      
      // Write all formats
      await fs.writeFile(
        `${this.config.outputDir}/output.jsonl`,
        synthesizer.toJSONL()
      );
      
      await fs.writeFile(
        `${this.config.outputDir}/report.md`,
        synthesizer.toMarkdown()
      );
      
      await fs.writeFile(
        `${this.config.outputDir}/raw.txt`,
        synthesizer.toRaw()
      );
      
      logger.info(`Outputs saved to ${this.config.outputDir}/`);
    } catch (error) {
      logger.error('Failed to write outputs:', error);
    }
  }

  _generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    return {
      duration,
      phases: this.phase,
      linksFound: this.discoverySet.size,
      totalDiscoveries: this.discoverySet.size,
      url: this.browser.page ? this.browser.page.url() : '',
      averageTension: this.tensionMap.reduce((a, b) => a + b, 0) / this.tensionMap.length,
      finalWavefrontSize: this.wavefrontSize,
      browserStats: this.browser.getStats()
    };
  }
}

module.exports = LPSCrawler;
