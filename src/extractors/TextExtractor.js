const BaseExtractor = require('./BaseExtractor');
const logger = require('../utils/logger');

/**
 * Mathematical constants for text analysis
 * These ensure bounded, predictable outputs across all calculations
 */
const MATH_CONSTANTS = {
    // Flesch-Kincaid formula constants
    FLESCH_BASE: 206.835,
    FLESCH_SENTENCE_FACTOR: 1.015,
    FLESCH_SYLLABLE_FACTOR: 84.6,

    // Minimum samples for statistical validity
    MIN_WORDS_FOR_READABILITY: 5,
    MIN_SENTENCES_FOR_READABILITY: 1,

    // Score bounds
    FLESCH_MIN: 0,
    FLESCH_MAX: 100,
    QUALITY_SCORE_MIN: 0,
    QUALITY_SCORE_MAX: 100,
    READABILITY_SCORE_MIN: -100,
    READABILITY_SCORE_MAX: 200,

    // Floating point comparison epsilon
    EPSILON: 1e-10
};

/**
 * TextExtractor - Enterprise-grade text and metadata extraction
 * Features:
 * - Content Readability analysis (main content detection with scoring)
 * - Intelligent noise reduction (ads, nav, footers, sidebars)
 * - Structured metadata extraction (JSON-LD, OpenGraph, Twitter, Meta)
 * - Clean Markdown generation with table support
 * - Code block detection with language inference
 * - Author, date, and schema extraction
 * - Reading time estimation
 * - Content quality scoring
 * - Link classification (internal/external/resource)
 * - Multi-language detection
 * - SEO metadata extraction
 * - Semantic HTML preservation
 */
class TextExtractor extends BaseExtractor {
    constructor(browserInterface, options = {}) {
        super({
            minTextLength: 100,
            extractMetadata: true,
            extractMarkdown: true,
            extractJsonLd: true,
            extractTables: true,
            extractCodeBlocks: true,
            extractLinks: true,
            extractImages: true,
            readabilityScoreThreshold: 20,
            waitForDynamicContent: 2000,
            wordsPerMinute: 200, // For reading time calculation
            ...options
        });

        this.browser = browserInterface;
        this.extractedData = {};
    }

    async initialize(url) {
        logger.info(`[TextExtractor] Initializing for ${url}`);
        this.currentUrl = url;
        await this.browser.initialize(url);
    }

    async extract() {
        logger.info('[TextExtractor] Starting enterprise text extraction...');

        // Wait for content stabilization
        if (this.options.waitForDynamicContent > 0) {
            await new Promise(resolve => setTimeout(resolve, this.options.waitForDynamicContent));
        }

        try {
            const page = this.browser.page;

            // Extract all data in browser context
            const data = await page.evaluate((options) => {

                // === HELPER FUNCTIONS ===

                function isVisible(element) {
                    if (!element) return false;
                    const style = window.getComputedStyle(element);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }

                /**
                 * Calculate text density with proper edge case handling
                 * 
                 * Definition: textDensity = textLength / htmlLength
                 * Domain: textLength >= 0, htmlLength >= 0
                 * Range: [0, 1] typically, null for undefined states
                 * 
                 * @param {Element} element - DOM element to analyze
                 * @returns {number|null} - Density ratio or null if undefined
                 */
                function getTextDensity(element) {
                    const text = (element.innerText || '').trim();
                    const html = element.innerHTML || '';

                    const textLen = text.length;
                    const htmlLen = html.length;

                    // Handle edge cases explicitly
                    if (htmlLen === 0) {
                        // Empty HTML with no text is valid (empty element) -> density 0
                        // Empty HTML with text is invalid (impossible state) -> null
                        return textLen === 0 ? 0 : null;
                    }

                    return textLen / htmlLen;
                }

                // === METADATA EXTRACTION ===

                function extractMetadata() {
                    const metadata = {
                        standard: {},
                        openGraph: {},
                        twitter: {},
                        dublin: {},
                        article: {},
                        robots: null,
                        canonical: null,
                        alternate: [],
                        feeds: []
                    };

                    document.querySelectorAll('meta').forEach(meta => {
                        const name = meta.getAttribute('name');
                        const property = meta.getAttribute('property');
                        const content = meta.getAttribute('content');

                        if (!content) return;

                        // Standard meta tags
                        if (name) {
                            metadata.standard[name] = content;

                            // Dublin Core
                            if (name.startsWith('DC.') || name.startsWith('dc.')) {
                                metadata.dublin[name.replace(/^dc\./i, '')] = content;
                            }

                            // Robots
                            if (name.toLowerCase() === 'robots') {
                                metadata.robots = content;
                            }
                        }

                        // OpenGraph
                        if (property?.startsWith('og:')) {
                            metadata.openGraph[property.replace('og:', '')] = content;
                        }

                        // Twitter Cards
                        if (name?.startsWith('twitter:') || property?.startsWith('twitter:')) {
                            const key = (name || property).replace('twitter:', '');
                            metadata.twitter[key] = content;
                        }

                        // Article metadata
                        if (property?.startsWith('article:')) {
                            metadata.article[property.replace('article:', '')] = content;
                        }
                    });

                    // Canonical URL
                    const canonical = document.querySelector('link[rel="canonical"]');
                    if (canonical) metadata.canonical = canonical.href;

                    // Alternate languages
                    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
                        metadata.alternate.push({
                            hreflang: link.getAttribute('hreflang'),
                            href: link.href
                        });
                    });

                    // RSS/Atom feeds
                    document.querySelectorAll('link[type*="rss"], link[type*="atom"]').forEach(link => {
                        metadata.feeds.push({
                            type: link.type,
                            href: link.href,
                            title: link.title
                        });
                    });

                    return metadata;
                }

                function extractJsonLd() {
                    const results = [];
                    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                        try {
                            const data = JSON.parse(script.textContent);
                            results.push(data);
                        } catch (e) {
                            // Invalid JSON-LD
                        }
                    });
                    return results;
                }

                // === AUTHOR & DATE EXTRACTION ===

                function extractAuthorship() {
                    const authorship = {
                        author: null,
                        authors: [],
                        publishDate: null,
                        modifiedDate: null,
                        publisher: null
                    };

                    // Check JSON-LD first
                    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                        try {
                            const data = JSON.parse(script.textContent);
                            if (data.author) {
                                const authors = Array.isArray(data.author) ? data.author : [data.author];
                                authors.forEach(a => {
                                    const name = typeof a === 'string' ? a : a.name;
                                    if (name && !authorship.authors.includes(name)) {
                                        authorship.authors.push(name);
                                    }
                                });
                            }
                            if (data.datePublished) authorship.publishDate = data.datePublished;
                            if (data.dateModified) authorship.modifiedDate = data.dateModified;
                            if (data.publisher?.name) authorship.publisher = data.publisher.name;
                        } catch (e) { }
                    });

                    // Check meta tags
                    const authorMeta = document.querySelector('meta[name="author"]');
                    if (authorMeta?.content) {
                        if (!authorship.authors.includes(authorMeta.content)) {
                            authorship.authors.push(authorMeta.content);
                        }
                    }

                    // Check common author elements
                    const authorSelectors = [
                        '[rel="author"]', '.author', '.byline', '.writer',
                        '[itemprop="author"]', '.post-author', '.article-author',
                        '.entry-author', '.meta-author'
                    ];

                    authorSelectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            const text = el.textContent?.trim();
                            if (text && text.length < 100 && !authorship.authors.includes(text)) {
                                authorship.authors.push(text.replace(/^by\s+/i, ''));
                            }
                        });
                    });

                    // Check date elements
                    const dateSelectors = [
                        'time[datetime]', '[itemprop="datePublished"]',
                        '.publish-date', '.post-date', '.entry-date',
                        '.article-date', '.meta-date'
                    ];

                    dateSelectors.forEach(selector => {
                        if (!authorship.publishDate) {
                            const el = document.querySelector(selector);
                            if (el) {
                                authorship.publishDate = el.getAttribute('datetime') ||
                                    el.getAttribute('content') ||
                                    el.textContent?.trim();
                            }
                        }
                    });

                    authorship.author = authorship.authors[0] || null;
                    return authorship;
                }

                // === READABILITY SCORING ===

                /**
                 * Calculate readability score with bounded output
                 * 
                 * Mathematical guarantees:
                 * - Output is in range [READABILITY_SCORE_MIN, READABILITY_SCORE_MAX]
                 * - All component contributions are individually bounded
                 * - Floating-point comparisons use epsilon tolerance
                 * 
                 * @param {Element} element - DOM element to score
                 * @returns {number} - Bounded readability score
                 */
                function getReadabilityScore(element) {
                    // Use local constants (browser context doesn't have access to module scope)
                    const SCORE_MIN = -100;
                    const SCORE_MAX = 200;
                    const EPSILON = 1e-10;

                    // Clamp helper
                    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

                    // Floating-point safe comparison: a > b
                    const greaterThan = (a, b) => (a - b) > EPSILON;

                    let positiveScore = 0;
                    let negativeScore = 0;

                    const tagName = element.tagName?.toLowerCase() || '';
                    const className = (typeof element.className === 'string' ? element.className : '') || '';
                    const id = element.id || '';

                    // Tag weight (bounded: 0-30)
                    const tagWeights = {
                        'article': 30, 'main': 25, 'section': 10,
                        'div': 5, 'p': 3, 'pre': 3
                    };
                    positiveScore += tagWeights[tagName] || 0;

                    // Positive class/ID patterns (bounded: 0-25 each)
                    const positivePatterns = /article|body|content|entry|hentry|h-entry|main|page|post|text|blog|story|prose|single/i;
                    // Negative patterns (bounded: 0-50 each)
                    const negativePatterns = /hidden|banner|combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-|branding|popup|social|share|nav|buttons|recommend|related|widget|promo|newsletter/i;

                    if (positivePatterns.test(className)) positiveScore += 25;
                    if (positivePatterns.test(id)) positiveScore += 25;
                    if (negativePatterns.test(className)) negativeScore += 50;
                    if (negativePatterns.test(id)) negativeScore += 50;

                    // Role check (bounded: +30 or -50)
                    const role = element.getAttribute?.('role') || '';
                    if (['complementary', 'navigation', 'banner', 'contentinfo'].includes(role)) {
                        negativeScore += 50;
                    }
                    if (role === 'main' || role === 'article') {
                        positiveScore += 30;
                    }

                    // Content analysis
                    const text = element.innerText || '';
                    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

                    // Text length bonus (capped at 50)
                    positiveScore += Math.min(Math.floor(wordCount / 10), 50);

                    // Punctuation density (capped at 20)
                    const punctuation = (text.match(/[.,!?;:]/g) || []).length;
                    positiveScore += Math.min(punctuation, 20);

                    // Paragraph count bonus (capped at 30)
                    const paragraphs = element.querySelectorAll('p').length;
                    positiveScore += Math.min(paragraphs * 3, 30);

                    // Text density bonus (capped at 30)
                    const density = getTextDensity(element);
                    if (density !== null) {
                        if (greaterThan(density, 0.3)) positiveScore += 20;
                        if (greaterThan(density, 0.5)) positiveScore += 10;
                    }

                    // Calculate total and clamp to valid range
                    const totalScore = positiveScore - negativeScore;
                    return clamp(totalScore, SCORE_MIN, SCORE_MAX);
                }

                function findMainContent() {
                    const candidates = [];
                    const elements = document.querySelectorAll('article, main, [role="main"], [role="article"], .post-content, .article-content, .entry-content, .content, section, div');

                    elements.forEach(element => {
                        if (!isVisible(element)) return;
                        const text = element.innerText || '';
                        if (text.length < 100) return;

                        const score = getReadabilityScore(element);
                        if (score > 0) {
                            candidates.push({ element, score });
                        }
                    });

                    candidates.sort((a, b) => b.score - a.score);
                    return candidates.length > 0 ? candidates[0].element : document.body;
                }

                // === TABLE EXTRACTION ===

                function extractTables(root) {
                    const tables = [];

                    root.querySelectorAll('table').forEach((table, idx) => {
                        const tableData = {
                            index: idx,
                            caption: table.querySelector('caption')?.textContent?.trim(),
                            headers: [],
                            rows: [],
                            markdown: ''
                        };

                        // Extract headers
                        const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
                        if (headerRow) {
                            headerRow.querySelectorAll('th, td').forEach(cell => {
                                tableData.headers.push(cell.textContent?.trim() || '');
                            });
                        }

                        // Extract body rows
                        const bodyRows = table.querySelectorAll('tbody tr, tr');
                        bodyRows.forEach((row, rowIdx) => {
                            if (rowIdx === 0 && !table.querySelector('thead')) return;
                            const cells = [];
                            row.querySelectorAll('td, th').forEach(cell => {
                                cells.push(cell.textContent?.trim() || '');
                            });
                            if (cells.length > 0) {
                                tableData.rows.push(cells);
                            }
                        });

                        // Generate markdown
                        if (tableData.headers.length > 0) {
                            tableData.markdown = `| ${tableData.headers.join(' | ')} |\n`;
                            tableData.markdown += `| ${tableData.headers.map(() => '---').join(' | ')} |\n`;
                            tableData.rows.forEach(row => {
                                tableData.markdown += `| ${row.join(' | ')} |\n`;
                            });
                        }

                        if (tableData.headers.length > 0 || tableData.rows.length > 0) {
                            tables.push(tableData);
                        }
                    });

                    return tables;
                }

                // === CODE BLOCK EXTRACTION ===

                function extractCodeBlocks(root) {
                    const codeBlocks = [];
                    const languagePatterns = {
                        javascript: /\b(function|const|let|var|=>|import|export|class)\b/,
                        python: /\b(def|import|from|class|if __name__|print\()\b/,
                        java: /\b(public|private|class|void|static|import)\b.*[{;]/,
                        csharp: /\b(using|namespace|class|public|private|void)\b/,
                        html: /<[a-z][\s\S]*>/i,
                        css: /[.#][\w-]+\s*{|@media|@import/,
                        sql: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|CREATE)\b/i,
                        bash: /^\s*(#!\/bin\/|sudo|apt|npm|yarn|cd |ls |mkdir)/m,
                        json: /^\s*[{\[]/,
                        xml: /^\s*<\?xml|<[\w-]+[^>]*>/,
                        typescript: /:\s*(string|number|boolean|any)\b|interface\s+\w+/,
                        go: /\b(func|package|import|type|struct)\b/,
                        rust: /\b(fn|let|mut|impl|struct|enum|pub)\b/,
                        php: /<\?php|\$\w+\s*=/
                    };

                    function inferLanguage(code) {
                        for (const [lang, pattern] of Object.entries(languagePatterns)) {
                            if (pattern.test(code)) return lang;
                        }
                        return null;
                    }

                    root.querySelectorAll('pre, code').forEach((el, idx) => {
                        const isPre = el.tagName === 'PRE';
                        const code = el.textContent?.trim() || '';

                        if (code.length < 10) return;

                        // Check for language class
                        const classLang = el.className.match(/language-(\w+)|lang-(\w+)|(\w+)-code/);
                        let language = classLang ? (classLang[1] || classLang[2] || classLang[3]) : null;

                        // Infer language if not specified
                        if (!language) {
                            language = inferLanguage(code);
                        }

                        codeBlocks.push({
                            index: idx,
                            language,
                            code,
                            isBlock: isPre,
                            lines: code.split('\n').length
                        });
                    });

                    return codeBlocks;
                }

                // === LINK EXTRACTION ===

                function extractLinks(root, pageUrl) {
                    const links = {
                        internal: [],
                        external: [],
                        resources: [],
                        anchors: []
                    };

                    const pageHostname = new URL(pageUrl).hostname;

                    root.querySelectorAll('a[href]').forEach(a => {
                        const href = a.href;
                        const text = a.textContent?.trim() || '';

                        if (!href) return;

                        try {
                            const linkUrl = new URL(href);

                            // Anchor links
                            if (href.startsWith('#') || (linkUrl.pathname === location.pathname && linkUrl.hash)) {
                                links.anchors.push({ href, text });
                                return;
                            }

                            const linkData = {
                                href,
                                text: text.substring(0, 200),
                                title: a.title || null,
                                rel: a.rel || null
                            };

                            // Resource links
                            if (href.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz)$/i)) {
                                links.resources.push(linkData);
                            }
                            // Internal vs external
                            else if (linkUrl.hostname === pageHostname) {
                                links.internal.push(linkData);
                            } else {
                                links.external.push(linkData);
                            }
                        } catch (e) {
                            // Invalid URL
                        }
                    });

                    return links;
                }

                // === IMAGE EXTRACTION ===

                function extractImages(root) {
                    const images = [];

                    root.querySelectorAll('img').forEach((img, idx) => {
                        const src = img.src || img.dataset?.src;
                        if (!src) return;

                        images.push({
                            index: idx,
                            src,
                            alt: img.alt || '',
                            title: img.title || '',
                            width: img.naturalWidth || img.width,
                            height: img.naturalHeight || img.height,
                            loading: img.loading,
                            caption: img.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
                        });
                    });

                    return images;
                }

                // === MARKDOWN CONVERSION ===

                function toMarkdown(element, deep = false) {
                    let md = '';
                    const children = Array.from(element.childNodes);

                    children.forEach(child => {
                        if (child.nodeType === 3) { // Text
                            const text = child.textContent.replace(/\s+/g, ' ');
                            if (text.trim()) md += text;
                        } else if (child.nodeType === 1) { // Element
                            if (!isVisible(child)) return;

                            if (deep) {
                                const className = (typeof child.className === 'string' ? child.className : '') || '';
                                const id = child.id || '';
                                const role = child.getAttribute?.('role') || '';
                                const tagName = child.tagName.toLowerCase();

                                if (['script', 'style', 'noscript', 'meta', 'link', 'button', 'form', 'input', 'select', 'textarea'].includes(tagName)) return;

                                const negative = /hidden|banner|combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-|branding|popup|social|share|nav|buttons|recommend|newsletter|promo/i;
                                if (negative.test(className) || negative.test(id)) return;
                                if (['navigation', 'complementary', 'banner', 'contentinfo'].includes(role)) return;
                            }

                            const tag = child.tagName.toLowerCase();

                            switch (tag) {
                                case 'h1': md += `\n\n# ${toMarkdown(child, true).trim()}\n\n`; break;
                                case 'h2': md += `\n\n## ${toMarkdown(child, true).trim()}\n\n`; break;
                                case 'h3': md += `\n\n### ${toMarkdown(child, true).trim()}\n\n`; break;
                                case 'h4': md += `\n\n#### ${toMarkdown(child, true).trim()}\n\n`; break;
                                case 'h5': md += `\n\n##### ${toMarkdown(child, true).trim()}\n\n`; break;
                                case 'h6': md += `\n\n###### ${toMarkdown(child, true).trim()}\n\n`; break;
                                case 'p':
                                    const pContent = toMarkdown(child, true).trim();
                                    if (pContent) md += `\n\n${pContent}\n\n`;
                                    break;
                                case 'strong': case 'b':
                                    const strong = toMarkdown(child, true).trim();
                                    if (strong) md += `**${strong}**`;
                                    break;
                                case 'em': case 'i':
                                    const em = toMarkdown(child, true).trim();
                                    if (em) md += `*${em}*`;
                                    break;
                                case 'u':
                                    md += `<u>${toMarkdown(child, true).trim()}</u>`;
                                    break;
                                case 's': case 'strike': case 'del':
                                    md += `~~${toMarkdown(child, true).trim()}~~`;
                                    break;
                                case 'a':
                                    const linkText = toMarkdown(child, true).trim();
                                    const href = child.href;
                                    if (linkText && href) md += `[${linkText}](${href})`;
                                    break;
                                case 'ul':
                                    md += '\n';
                                    child.querySelectorAll(':scope > li').forEach(li => {
                                        md += `- ${toMarkdown(li, true).trim()}\n`;
                                    });
                                    md += '\n';
                                    break;
                                case 'ol':
                                    md += '\n';
                                    child.querySelectorAll(':scope > li').forEach((li, i) => {
                                        md += `${i + 1}. ${toMarkdown(li, true).trim()}\n`;
                                    });
                                    md += '\n';
                                    break;
                                case 'blockquote':
                                    const quote = toMarkdown(child, true).trim();
                                    if (quote) {
                                        md += '\n\n' + quote.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
                                    }
                                    break;
                                case 'code':
                                    if (child.parentElement?.tagName !== 'PRE') {
                                        md += `\`${child.textContent?.trim() || ''}\``;
                                    }
                                    break;
                                case 'pre':
                                    const codeEl = child.querySelector('code');
                                    const code = codeEl?.textContent || child.textContent || '';
                                    const langClass = (codeEl?.className || child.className || '').match(/language-(\w+)/);
                                    const lang = langClass ? langClass[1] : '';
                                    md += `\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
                                    break;
                                case 'br':
                                    md += '\n';
                                    break;
                                case 'hr':
                                    md += '\n\n---\n\n';
                                    break;
                                case 'img':
                                    const alt = child.alt || '';
                                    const src = child.src || '';
                                    if (src) md += `\n\n![${alt}](${src})\n\n`;
                                    break;
                                case 'figure':
                                    const figImg = child.querySelector('img');
                                    const figCap = child.querySelector('figcaption');
                                    if (figImg) {
                                        md += `\n\n![${figImg.alt || ''}](${figImg.src || ''})`;
                                        if (figCap) md += `\n*${figCap.textContent?.trim()}*`;
                                        md += '\n\n';
                                    }
                                    break;
                                case 'table':
                                    const headers = [];
                                    const rows = [];
                                    const thead = child.querySelector('thead tr') || child.querySelector('tr');
                                    if (thead) {
                                        thead.querySelectorAll('th, td').forEach(cell => {
                                            headers.push(cell.textContent?.trim() || '');
                                        });
                                    }
                                    child.querySelectorAll('tbody tr, tr').forEach((row, i) => {
                                        if (i === 0 && !child.querySelector('thead')) return;
                                        const cells = [];
                                        row.querySelectorAll('td, th').forEach(cell => {
                                            cells.push(cell.textContent?.trim() || '');
                                        });
                                        if (cells.length > 0) rows.push(cells);
                                    });
                                    if (headers.length > 0) {
                                        md += `\n\n| ${headers.join(' | ')} |\n`;
                                        md += `| ${headers.map(() => '---').join(' | ')} |\n`;
                                        rows.forEach(row => {
                                            md += `| ${row.join(' | ')} |\n`;
                                        });
                                        md += '\n';
                                    }
                                    break;
                                case 'div': case 'section': case 'article': case 'main': case 'span':
                                case 'aside': case 'header': case 'footer': case 'nav':
                                    md += toMarkdown(child, true);
                                    break;
                                default:
                                    md += toMarkdown(child, true);
                            }
                        }
                    });

                    return md;
                }

                // === CONTENT QUALITY ANALYSIS ===

                /**
                 * Improved syllable counting using linguistic rules
                 * 
                 * Algorithm:
                 * 1. Count vowel groups (consecutive vowels = 1 syllable)
                 * 2. Subtract silent 'e' at end
                 * 3. Handle special patterns
                 * 4. Minimum 1 syllable per word
                 * 
                 * @param {string} word - Word to count syllables for
                 * @returns {number} - Syllable count (>= 1)
                 */
                function countSyllables(word) {
                    if (!word || typeof word !== 'string') return 1;

                    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
                    if (cleanWord.length === 0) return 0;
                    if (cleanWord.length <= 3) return 1;

                    const vowels = 'aeiouy';
                    let count = 0;
                    let prevVowel = false;

                    for (const char of cleanWord) {
                        const isVowel = vowels.includes(char);
                        if (isVowel && !prevVowel) count++;
                        prevVowel = isVowel;
                    }

                    // Adjust for silent 'e'
                    if (cleanWord.endsWith('e') && !cleanWord.endsWith('le')) {
                        count = Math.max(1, count - 1);
                    }

                    // Handle '-le' ending (e.g., "table")
                    if (cleanWord.endsWith('le') && cleanWord.length > 2) {
                        const beforeLe = cleanWord[cleanWord.length - 3];
                        if (!vowels.includes(beforeLe)) count++;
                    }

                    return Math.max(1, count);
                }

                /**
                 * Analyze content quality with mathematically rigorous metrics
                 * 
                 * Mathematical guarantees:
                 * - fleschReadingEase: null if insufficient data, otherwise [0, 100]
                 * - qualityScore: always in [0, 100]
                 * - readingTimeMinutes: null for empty content, otherwise >= 1
                 * - All averages handle division by zero properly
                 * 
                 * @param {string} text - Text content to analyze
                 * @param {Element} element - Source DOM element
                 * @returns {Object} - Quality metrics
                 */
                function analyzeContentQuality(text, element) {
                    // Constants for this analysis
                    const MIN_WORDS_FOR_FLESCH = 5;
                    const MIN_SENTENCES_FOR_FLESCH = 1;
                    const FLESCH_BASE = 206.835;
                    const FLESCH_SENTENCE_FACTOR = 1.015;
                    const FLESCH_SYLLABLE_FACTOR = 84.6;
                    const QUALITY_MIN = 0;
                    const QUALITY_MAX = 100;

                    // Clamp helper
                    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

                    // Parse text
                    const words = text.split(/\s+/).filter(w => w.length > 0);
                    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
                    const paragraphs = element.querySelectorAll('p').length;

                    const wordCount = words.length;
                    const sentenceCount = sentences.length;

                    // Calculate averages with safe division
                    const avgWordsPerSentence = sentenceCount > 0
                        ? wordCount / sentenceCount
                        : null;

                    const avgSentenceLength = sentenceCount > 0
                        ? sentences.reduce((sum, s) => sum + s.length, 0) / sentenceCount
                        : null;

                    // Improved syllable count
                    const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

                    // Flesch-Kincaid with proper validity checks
                    let fleschReadingEase = null;
                    let fleschValid = false;

                    if (wordCount >= MIN_WORDS_FOR_FLESCH && sentenceCount >= MIN_SENTENCES_FOR_FLESCH) {
                        const avgSentenceWords = wordCount / sentenceCount;
                        const avgSyllablesPerWord = syllables / wordCount;

                        const rawFlesch = FLESCH_BASE
                            - (FLESCH_SENTENCE_FACTOR * avgSentenceWords)
                            - (FLESCH_SYLLABLE_FACTOR * avgSyllablesPerWord);

                        fleschReadingEase = Math.round(clamp(rawFlesch, 0, 100));
                        fleschValid = true;
                    }

                    // Content quality score with symmetric bounds [0, 100]
                    let qualityScore = 50;

                    // Word count bonuses (capped)
                    if (wordCount > 300) qualityScore += 10;
                    if (wordCount > 700) qualityScore += 10;
                    if (wordCount > 1500) qualityScore += 5;

                    // Paragraph structure bonus (max +15)
                    if (paragraphs >= 3) qualityScore += 10;
                    if (paragraphs >= 7) qualityScore += 5;

                    // Sentence variety bonus (max +10)
                    if (avgWordsPerSentence !== null &&
                        avgWordsPerSentence >= 10 &&
                        avgWordsPerSentence <= 25) {
                        qualityScore += 10;
                    }

                    // Flesch score bonus - reward readable content
                    if (fleschReadingEase !== null && fleschReadingEase >= 50) {
                        qualityScore += 5;
                    }

                    // Clamp quality score to valid range [0, 100]
                    qualityScore = clamp(qualityScore, QUALITY_MIN, QUALITY_MAX);

                    // Reading time with proper null semantics
                    const readingTimeMinutes = wordCount > 0
                        ? Math.ceil(wordCount / options.wordsPerMinute)
                        : null;

                    return {
                        wordCount,
                        sentenceCount,
                        paragraphCount: paragraphs,
                        syllableCount: syllables,
                        avgWordsPerSentence: avgWordsPerSentence !== null
                            ? Math.round(avgWordsPerSentence * 10) / 10
                            : null,
                        avgSentenceLength: avgSentenceLength !== null
                            ? Math.round(avgSentenceLength * 10) / 10
                            : null,
                        fleschReadingEase,
                        fleschValid,
                        qualityScore,
                        readingTimeMinutes,
                        // Include validity metadata
                        _meta: {
                            minWordsForFlesch: MIN_WORDS_FOR_FLESCH,
                            minSentencesForFlesch: MIN_SENTENCES_FOR_FLESCH,
                            qualityScoreRange: [QUALITY_MIN, QUALITY_MAX]
                        }
                    };
                }

                // === LANGUAGE DETECTION ===

                function detectLanguage() {
                    // Check html lang attribute
                    const htmlLang = document.documentElement.lang;
                    if (htmlLang) return htmlLang;

                    // Check meta tags
                    const langMeta = document.querySelector('meta[name="language"], meta[http-equiv="content-language"]');
                    if (langMeta?.content) return langMeta.content;

                    // Check og:locale
                    const ogLocale = document.querySelector('meta[property="og:locale"]');
                    if (ogLocale?.content) return ogLocale.content;

                    return null;
                }

                // === HEADING STRUCTURE ===

                function extractHeadingStructure(root) {
                    const headings = [];
                    root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
                        headings.push({
                            level: parseInt(h.tagName[1]),
                            text: h.textContent?.trim(),
                            id: h.id || null
                        });
                    });
                    return headings;
                }

                // === MAIN EXECUTION ===

                const pageUrl = window.location.href;
                const metadata = extractMetadata();
                const jsonLd = options.extractJsonLd ? extractJsonLd() : [];
                const authorship = extractAuthorship();
                const language = detectLanguage();
                const mainElement = findMainContent();
                const readabilityScore = getReadabilityScore(mainElement);

                const mainContentText = mainElement.innerText || '';
                const mainContentHtml = mainElement.innerHTML;
                const markdown = options.extractMarkdown ? toMarkdown(mainElement, true) : '';

                const tables = options.extractTables ? extractTables(mainElement) : [];
                const codeBlocks = options.extractCodeBlocks ? extractCodeBlocks(mainElement) : [];
                const links = options.extractLinks ? extractLinks(mainElement, pageUrl) : null;
                const images = options.extractImages ? extractImages(mainElement) : [];
                const headings = extractHeadingStructure(mainElement);
                const quality = analyzeContentQuality(mainContentText, mainElement);

                return {
                    url: pageUrl,
                    title: document.title,
                    language,
                    metadata,
                    jsonLd,
                    authorship,
                    content: {
                        text: mainContentText,
                        html: mainContentHtml,
                        markdown: markdown.replace(/\n{3,}/g, '\n\n').trim()
                    },
                    structure: {
                        headings,
                        tables,
                        codeBlocks,
                        images
                    },
                    links,
                    quality,
                    readabilityScore
                };

            }, this.options);

            // Store extracted data
            this.extractedData = data;

            // Add to items for export
            this.addItem(this.currentUrl, {
                type: 'text-content',
                ...data
            });

            logger.info(`[TextExtractor] Extraction complete: ${data.quality.wordCount} words, quality score: ${data.quality.qualityScore}`);

            return this.exportResults();

        } catch (error) {
            logger.error('[TextExtractor] Extraction failed:', error);
            throw error;
        }
    }

    /**
     * Get extracted content in different formats
     */
    getContent(format = 'markdown') {
        if (!this.extractedData?.content) return null;

        switch (format) {
            case 'markdown': return this.extractedData.content.markdown;
            case 'text': return this.extractedData.content.text;
            case 'html': return this.extractedData.content.html;
            default: return this.extractedData.content;
        }
    }

    /**
     * Get metadata summary
     */
    getMetadataSummary() {
        if (!this.extractedData) return null;

        return {
            title: this.extractedData.title,
            description: this.extractedData.metadata?.standard?.description ||
                this.extractedData.metadata?.openGraph?.description,
            author: this.extractedData.authorship?.author,
            publishDate: this.extractedData.authorship?.publishDate,
            language: this.extractedData.language,
            wordCount: this.extractedData.quality?.wordCount,
            readingTime: this.extractedData.quality?.readingTimeMinutes,
            qualityScore: this.extractedData.quality?.qualityScore
        };
    }

    normalizeItem(url) {
        try {
            const urlObj = new URL(url);
            ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid', 'gclid'].forEach(param => {
                urlObj.searchParams.delete(param);
            });
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    exportResults() {
        const base = super.exportResults();

        return {
            ...base,
            summary: this.getMetadataSummary(),
            data: this.extractedData
        };
    }

    async cleanup() {
        logger.info(`[TextExtractor] Cleanup complete.`);
        if (this.options.closeBrowser !== false && this.browser && typeof this.browser.close === 'function') {
            await this.browser.close();
        }
    }
}

module.exports = TextExtractor;
