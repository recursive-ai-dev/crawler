const BaseExtractor = require('./BaseExtractor');
const logger = require('../utils/logger');
const { clamp } = require('../utils/mathUtils');

/**
 * PDFExtractor - Enterprise-grade PDF and document extraction
 * Features:
 * - PDF link detection and categorization
 * - Embedded document viewer detection
 * - Office document support (DOCX, XLSX, PPTX)
 * - Document metadata extraction
 * - Google Docs/Drive integration detection
 * - Microsoft OneDrive/SharePoint detection
 * - Pre-signed URL handling
 * - Document classification by type
 */
class PDFExtractor extends BaseExtractor {
    constructor(browserInterface, options = {}) {
        super({
            monitorNetwork: options.monitorNetwork !== false,
            extractMetadata: options.extractMetadata !== false,
            supportedFormats: {
                pdf: ['.pdf'],
                word: ['.doc', '.docx', '.odt'],
                excel: ['.xls', '.xlsx', '.ods', '.csv'],
                powerpoint: ['.ppt', '.pptx', '.odp'],
                text: ['.txt', '.rtf', '.md'],
                ebook: ['.epub', '.mobi', '.azw']
            },
            detectViewers: options.detectViewers !== false,
            followRedirects: options.followRedirects !== false,
            ...options
        });

        this.browser = browserInterface;
        this.networkUrls = new Set();
        this.documentMetadata = new Map();
    }

    async initialize(url) {
        logger.info(`[PDFExtractor] Initializing for ${url}`);
        this.currentUrl = url;
        await this.browser.initialize(url);

        if (this.options.monitorNetwork) {
            await this._instrumentNetwork();
        }
    }

    async _instrumentNetwork() {
        const page = this.browser.page;

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();

            if (this._isDocumentUrl(url)) {
                this.networkUrls.add(url);
                this.addItem(url, {
                    source: 'network-request',
                    resourceType: request.resourceType()
                });
                logger.debug(`[PDFExtractor] Network document: ${url}`);
            }
            request.continue();
        });

        page.on('response', async (response) => {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            const contentDisposition = response.headers()['content-disposition'] || '';

            // Check for document content types
            const docContentTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument',
                'application/vnd.ms-excel',
                'application/vnd.ms-powerpoint',
                'application/epub+zip',
                'text/csv'
            ];

            const isDocument = docContentTypes.some(type => contentType.includes(type)) ||
                contentDisposition.includes('.pdf') ||
                contentDisposition.includes('attachment');

            if (isDocument) {
                const metadata = {
                    source: 'network-response',
                    contentType,
                    contentDisposition,
                    size: response.headers()['content-length']
                };
                this.documentMetadata.set(url, metadata);
                this.addItem(url, metadata);
                logger.debug(`[PDFExtractor] Document response: ${url}`);
            }
        });
    }

    async extract() {
        logger.info('[PDFExtractor] Starting document extraction...');

        // Phase 1: Extract direct links from DOM
        await this._extractFromDOM();

        // Phase 2: Extract from embedded viewers
        if (this.options.detectViewers) {
            await this._extractFromViewers();
        }

        // Phase 3: Extract from cloud platform embeds
        await this._extractCloudDocuments();

        // Phase 4: Extract from data attributes and scripts
        await this._extractFromDataAttributes();

        // Phase 5: Process network-captured URLs
        this.networkUrls.forEach(url => {
            this.addItem(url, { source: 'network-capture' });
        });

        // Download documents if enabled
        if (this.options.downloadMedia) {
            await this.downloadMedia();
        }

        return this.exportResults();
    }

    async _extractFromDOM() {
        const page = this.browser.page;

        const allFormats = Object.values(this.options.supportedFormats).flat();

        const documentData = await page.evaluate((formats) => {
            const results = [];

            // Direct links to documents
            formats.forEach(ext => {
                document.querySelectorAll(`a[href*="${ext}"], a[href*="${ext.toUpperCase()}"]`).forEach(link => {
                    results.push({
                        type: 'direct-link',
                        src: link.href,
                        text: link.textContent?.trim(),
                        title: link.title,
                        format: ext.replace('.', '')
                    });
                });
            });

            // Object and embed tags (PDF embeds)
            document.querySelectorAll('object[data*=".pdf"], embed[src*=".pdf"]').forEach(el => {
                const src = el.data || el.src;
                if (src) {
                    results.push({
                        type: 'embedded-object',
                        src,
                        width: el.width,
                        height: el.height,
                        format: 'pdf'
                    });
                }
            });

            // Iframe document embeds
            document.querySelectorAll('iframe').forEach(iframe => {
                const src = iframe.src || '';
                if (formats.some(ext => src.includes(ext))) {
                    results.push({
                        type: 'iframe-embed',
                        src,
                        width: iframe.width,
                        height: iframe.height
                    });
                }
            });

            // Download buttons with document links
            document.querySelectorAll('[download], [data-download], .download-btn, .download-link').forEach(el => {
                const href = el.href || el.dataset?.href || el.dataset?.url;
                if (href && formats.some(ext => href.toLowerCase().includes(ext))) {
                    results.push({
                        type: 'download-button',
                        src: href,
                        text: el.textContent?.trim()
                    });
                }
            });

            return results;
        }, allFormats);

        documentData.forEach(data => {
            if (this._isDocumentUrl(data.src)) {
                this.addItem(data.src, {
                    source: 'dom',
                    extractionType: data.type,
                    metadata: data
                });
                this.documentMetadata.set(data.src, data);
            }
        });
    }

    async _extractFromViewers() {
        const page = this.browser.page;

        const viewerData = await page.evaluate(() => {
            const results = [];

            // PDF.js viewer
            if (window.PDFViewerApplication) {
                try {
                    const pdfDocument = window.PDFViewerApplication.pdfDocument;
                    const url = window.PDFViewerApplication.url;
                    if (url) {
                        results.push({
                            viewer: 'pdfjs',
                            url,
                            pages: pdfDocument?.numPages
                        });
                    }
                } catch (e) { }
            }

            // Check for PDF.js in iframes
            document.querySelectorAll('iframe[src*="pdf.js"], iframe[src*="pdfjs"]').forEach(iframe => {
                // Try to extract the actual PDF URL from the viewer URL
                try {
                    const viewerUrl = new URL(iframe.src);
                    const pdfFile = viewerUrl.searchParams.get('file') ||
                        viewerUrl.searchParams.get('pdf') ||
                        viewerUrl.searchParams.get('url');
                    if (pdfFile) {
                        results.push({
                            viewer: 'pdfjs-iframe',
                            url: pdfFile,
                            viewerUrl: iframe.src
                        });
                    }
                } catch (e) { }
            });

            // canvas-based PDF viewers
            document.querySelectorAll('canvas[data-page], canvas.pdfPage, canvas.pdf-page').forEach(canvas => {
                const container = canvas.closest('[data-pdf], [data-url], [data-src]');
                if (container) {
                    const url = container.dataset.pdf || container.dataset.url || container.dataset.src;
                    if (url) {
                        results.push({
                            viewer: 'canvas-pdf',
                            url
                        });
                    }
                }
            });

            return results;
        });

        viewerData.forEach(data => {
            if (data.url) {
                this.addItem(data.url, {
                    source: 'pdf-viewer',
                    viewer: data.viewer,
                    metadata: data
                });
            }
        });
    }

    async _extractCloudDocuments() {
        const page = this.browser.page;

        const cloudData = await page.evaluate(() => {
            const results = [];

            // Google Drive/Docs embeds
            document.querySelectorAll('iframe[src*="docs.google.com"], iframe[src*="drive.google.com"]').forEach(iframe => {
                const src = iframe.src;

                // Extract document ID from Google Docs URL
                const docIdMatch = src.match(/\/d\/([a-zA-Z0-9_-]+)/);
                const docId = docIdMatch ? docIdMatch[1] : null;

                results.push({
                    platform: 'google-docs',
                    embedUrl: src,
                    documentId: docId,
                    // Construct direct download URL
                    downloadUrl: docId ? `https://docs.google.com/document/d/${docId}/export?format=pdf` : null,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // Google Docs links
            document.querySelectorAll('a[href*="docs.google.com"], a[href*="drive.google.com"]').forEach(link => {
                const href = link.href;
                const docIdMatch = href.match(/\/d\/([a-zA-Z0-9_-]+)/);
                const docId = docIdMatch ? docIdMatch[1] : null;

                results.push({
                    platform: 'google-docs',
                    linkUrl: href,
                    documentId: docId,
                    text: link.textContent?.trim()
                });
            });

            // Microsoft OneDrive/SharePoint embeds
            document.querySelectorAll('iframe[src*="onedrive"], iframe[src*="sharepoint"]').forEach(iframe => {
                results.push({
                    platform: 'microsoft-onedrive',
                    embedUrl: iframe.src,
                    width: iframe.width,
                    height: iframe.height
                });
            });

            // Dropbox embeds
            document.querySelectorAll('iframe[src*="dropbox.com"]').forEach(iframe => {
                results.push({
                    platform: 'dropbox',
                    embedUrl: iframe.src
                });
            });

            // Box.com embeds
            document.querySelectorAll('iframe[src*="box.com"]').forEach(iframe => {
                results.push({
                    platform: 'box',
                    embedUrl: iframe.src
                });
            });

            // Scribd embeds
            document.querySelectorAll('iframe[src*="scribd.com"]').forEach(iframe => {
                results.push({
                    platform: 'scribd',
                    embedUrl: iframe.src
                });
            });

            // SlideShare embeds
            document.querySelectorAll('iframe[src*="slideshare.net"]').forEach(iframe => {
                results.push({
                    platform: 'slideshare',
                    embedUrl: iframe.src
                });
            });

            // Issuu embeds
            document.querySelectorAll('div[data-issuu], iframe[src*="issuu.com"]').forEach(el => {
                results.push({
                    platform: 'issuu',
                    embedUrl: el.src || el.dataset?.issuuUrl
                });
            });

            return results;
        });

        cloudData.forEach(data => {
            const url = data.embedUrl || data.linkUrl || data.downloadUrl;
            if (url) {
                this.addItem(url, {
                    source: 'cloud-platform',
                    platform: data.platform,
                    metadata: data
                });
            }
        });
    }

    async _extractFromDataAttributes() {
        const page = this.browser.page;

        const allFormats = Object.values(this.options.supportedFormats).flat();

        const dataAttrResults = await page.evaluate((formats) => {
            const results = [];

            // Elements with document-related data attributes
            document.querySelectorAll('[data-pdf], [data-document], [data-file], [data-src], [data-url]').forEach(el => {
                Object.entries(el.dataset).forEach(([key, val]) => {
                    if (val && typeof val === 'string') {
                        const isDoc = val.match(/https?:\/\//) &&
                            formats.some(ext => val.toLowerCase().includes(ext));
                        if (isDoc) {
                            results.push({
                                type: 'data-attribute',
                                src: val,
                                attribute: `data-${key}`,
                                element: el.tagName
                            });
                        }
                    }
                });
            });

            // Script tags with document configuration
            document.querySelectorAll('script').forEach(script => {
                const content = script.textContent || '';

                // Look for PDF URLs in script content
                const pdfMatches = content.match(/["'](https?:\/\/[^"']+\.pdf[^"']*)["']/gi);
                if (pdfMatches) {
                    pdfMatches.forEach(match => {
                        const url = match.replace(/['"]/g, '');
                        results.push({
                            type: 'script-config',
                            src: url
                        });
                    });
                }
            });

            return results;
        }, allFormats);

        dataAttrResults.forEach(data => {
            if (this._isDocumentUrl(data.src)) {
                this.addItem(data.src, {
                    source: 'data-extraction',
                    extractionType: data.type,
                    metadata: data
                });
            }
        });
    }

    _isDocumentUrl(str) {
        if (!str || typeof str !== 'string') return false;

        const allFormats = Object.values(this.options.supportedFormats).flat();
        const formatPattern = allFormats.join('|').replace(/\./g, '\\.');

        const patterns = [
            // Direct document file extensions
            new RegExp(`(${formatPattern})(\\?|#|$)`, 'i'),
            // Cloud platform patterns
            /docs\.google\.com|drive\.google\.com/i,
            /onedrive|sharepoint/i,
            /dropbox\.com.*\.(pdf|doc|xls|ppt)/i,
            /box\.com.*file/i,
            /scribd\.com\/doc/i,
            // CDN patterns with document indicators
            /https?:\/\/[^\s]*(?:documents?|files?|downloads?|assets?)[^\s]*\.(pdf|doc|xls|ppt)/i
        ];

        return patterns.some(regex => regex.test(str));
    }

    normalizeItem(url) {
        try {
            const urlObj = new URL(url, this.browser.page?.url());
            // Clean tracking params but preserve document-specific params
            ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid', 'gclid'].forEach(param => {
                urlObj.searchParams.delete(param);
            });
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    async cleanup() {
        logger.info(`[PDFExtractor] Extraction complete: ${this.extractedItems.size} documents found`);
        if (this.options.closeBrowser !== false && this.browser && typeof this.browser.close === 'function') {
            await this.browser.close();
        }
    }

    /**
     * Export results grouped by document type
     */
    exportResults() {
        const base = super.exportResults();

        // Group by document type
        const grouped = {
            pdf: [],
            word: [],
            excel: [],
            powerpoint: [],
            text: [],
            ebook: [],
            cloud: [],
            other: []
        };

        this.extractedItems.forEach(url => {
            const lower = url.toLowerCase();

            if (lower.includes('.pdf')) grouped.pdf.push(url);
            else if (lower.match(/\.(doc|docx|odt)/)) grouped.word.push(url);
            else if (lower.match(/\.(xls|xlsx|ods|csv)/)) grouped.excel.push(url);
            else if (lower.match(/\.(ppt|pptx|odp)/)) grouped.powerpoint.push(url);
            else if (lower.match(/\.(txt|rtf|md)/)) grouped.text.push(url);
            else if (lower.match(/\.(epub|mobi|azw)/)) grouped.ebook.push(url);
            else if (lower.match(/docs\.google|drive\.google|onedrive|sharepoint|dropbox|box\.com|scribd|slideshare/)) {
                grouped.cloud.push(url);
            }
            else grouped.other.push(url);
        });

        return {
            ...base,
            grouped,
            metadata: Object.fromEntries(this.documentMetadata)
        };
    }
}

module.exports = PDFExtractor;
