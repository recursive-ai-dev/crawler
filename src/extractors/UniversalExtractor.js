const BaseExtractor = require('./BaseExtractor');
const TextExtractor = require('./TextExtractor');
const MFTExtractor = require('./MFTExtractor');
const TBRExtractor = require('./TBRExtractor');
const AudioExtractor = require('./AudioExtractor');
const PDFExtractor = require('./PDFExtractor');
const logger = require('../utils/logger');

/**
 * UniversalExtractor - Enterprise-grade All-in-One Extraction
 * Orchestrates multiple specialized extractors in a single efficient browser session.
 */
class UniversalExtractor extends BaseExtractor {
    constructor(browserInterface, options = {}) {
        super(options);

        this.browser = browserInterface;

        // Default to extracting everything if not specified
        this.extractOptions = {
            text: true,
            images: true,
            video: true,
            audio: true,
            documents: true,
            ...options.extract
        };

        // Configuration for child extractors
        // We enforce closeBrowser: false to maintain the session
        this.childOptions = {
            text: { ...options.text, closeBrowser: false },
            images: { ...options.images, closeBrowser: false },
            video: { ...options.video, closeBrowser: false },
            audio: { ...options.audio, closeBrowser: false },
            documents: { ...options.documents, closeBrowser: false }
        };

        this.results = {};
    }

    async initialize(url) {
        logger.info(`[Universal] Initializing shared browser session for ${url}`);
        this.currentUrl = url;
        await this.browser.initialize(url);
    }

    async extract() {
        logger.info('[Universal] Starting comprehensive media extraction...');

        // Phase 1: Text & Metadata (Least intrusive)
        if (this.extractOptions.text) {
            logger.info('[Universal] Phase 1/5: Text extraction');
            const extractor = new TextExtractor(this.browser, this.childOptions.text);
            this.results.text = await extractor.run(this.currentUrl);
        }

        // Phase 2: Documents (DOM scanning)
        if (this.extractOptions.documents) {
            logger.info('[Universal] Phase 2/5: Document extraction');
            const extractor = new PDFExtractor(this.browser, this.childOptions.documents);
            this.results.documents = await extractor.run(this.currentUrl);
        }

        // Phase 3: Audio (API scanning)
        if (this.extractOptions.audio) {
            logger.info('[Universal] Phase 3/5: Audio extraction');
            const extractor = new AudioExtractor(this.browser, this.childOptions.audio);
            this.results.audio = await extractor.run(this.currentUrl);
        }

        // Phase 4: Video (Dynamic loading)
        if (this.extractOptions.video) {
            logger.info('[Universal] Phase 4/5: Video extraction');
            const extractor = new TBRExtractor(this.browser, this.childOptions.video);
            this.results.video = await extractor.run(this.currentUrl);
        }

        // Phase 5: Images (Heavy scrolling/interaction)
        // We do this last as it modifies scroll position significantly
        if (this.extractOptions.images) {
            logger.info('[Universal] Phase 5/5: Image extraction');
            const extractor = new MFTExtractor(this.browser, this.childOptions.images);
            this.results.images = await extractor.run(this.currentUrl);
        }

        return this.exportResults();
    }

    async cleanup() {
        logger.info('[Universal] Extraction complete');
        if (this.options.closeBrowser !== false && this.browser && typeof this.browser.close === 'function') {
            await this.browser.close();
        }
    }

    exportResults() {
        const base = super.exportResults();

        const summary = {
            url: this.currentUrl,
            timestamp: new Date().toISOString(),
            extractionTypes: Object.keys(this.results),
            counts: {}
        };

        Object.entries(this.results).forEach(([type, result]) => {
            if (result?.items) {
                summary.counts[type] = result.items.length;
                // Merge items into main set for deduped stats if needed, 
                // but Universal tends to keep them separate.
                // We can add them to this.extractedItems if we want a master list.
                result.items.forEach(item => this.addItem(item, { type }));
            }
        });

        return {
            ...base,
            summary,
            results: this.results
        };
    }

    // Override to handle items from sub-extractors if needed
    normalizeItem(item) {
        return item;
    }
}

module.exports = UniversalExtractor;
