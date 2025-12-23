const { createTextExtractor } = require('../src');

/**
 * Example: Extract clean text and metadata from an article
 */
async function extractText() {
    console.log('📝 Text Extractor Example\n');

    const extractor = await createTextExtractor({
        browser: {
            headless: true,
            // executablePath: '/usr/bin/google-chrome', // Uncomment if needed
            respectRobots: true
        },
        extractor: {
            extractMarkdown: true,
            extractJsonLd: true,
            minTextLength: 100
        }
    });

    extractor.on('extractionStart', ({ target }) => {
        console.log(`🚀 Starting extraction for: ${target}`);
    });

    extractor.on('itemFound', ({ item, metadata }) => {
        console.log(`\n📄 Extracted Content from: ${item}`);
        console.log('----------------------------------------');
        console.log(`Title: ${metadata.title}`);
        console.log('Metadata:', JSON.stringify(metadata.metadata, null, 2));

        if (metadata.jsonLd.length > 0) {
            console.log('JSON-LD:', JSON.stringify(metadata.jsonLd, null, 2));
        }

        console.log(`Readability Score: ${metadata.readabilityScore}`);
        console.log('\n--- Markdown Content Preview (First 500 chars) ---\n');
        console.log(metadata.content.markdown.substring(0, 500) + '...');
        console.log('\n----------------------------------------\n');
    });

    try {
        // Example: W3C Standard (Text heavy)
        const targetUrl = 'https://www.w3.org/TR/wai-aria-practices-1.1/';

        console.log(`Targeting: ${targetUrl}`);
        const results = await extractor.run(targetUrl);

        // Save results
        const fs = require('fs').promises;
        await fs.mkdir('./output', { recursive: true });
        await fs.writeFile(
            './output/text-extraction.json',
            JSON.stringify(results, null, 2)
        );

        console.log('\n💾 Results saved to ./output/text-extraction.json');

    } catch (error) {
        console.error('❌ Extraction failed:', error);
    }
}

if (require.main === module) {
    extractText().catch(console.error);
}

module.exports = extractText;
