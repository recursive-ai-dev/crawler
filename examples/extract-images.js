const { createMFTExtractor } = require('../src');

/**
 * Example: Extract all images from a media-heavy website
 */
async function extractImages() {
  console.log('🎯 MFT Extractor Example - Image Extraction\n');

  const extractor = await createMFTExtractor({
    browser: {
      headless: false, // Set to true for production
      rateLimit: { maxRequests: 5, interval: 1000 }
    },
    extractor: {
      maxScrolls: 20,
      scrollDelay: 1500,
      downloadMedia: true, // Enable media downloading
      downloadDir: './downloads/images',
      organizeByType: true,
      maxConcurrentDownloads: 3
    }
  });

  // Listen to events
  extractor.on('extractionStart', ({ target }) => {
    console.log(`🚀 Starting extraction for: ${target}`);
  });

  extractor.on('itemFound', ({ item, metadata }) => {
    console.log(`📸 Found: ${item.substring(0, 80)}...`);
  });

  extractor.on('extractionComplete', ({ items, stats, downloaded }) => {
    console.log(`\n✅ Extraction complete!`);
    console.log(`   Items found: ${items.items.length}`);
    console.log(`   Duration: ${stats.duration}ms`);
    
    if (downloaded) {
      console.log(`   Files downloaded: ${downloaded.stats.successful}/${downloaded.stats.total}`);
      console.log(`   Download directory: ./downloads/images`);
    }
  });

  try {
    const results = await extractor.run('https://unsplash.com');
    
    // Save results
    const fs = require('fs').promises;
    await fs.writeFile(
      './output/mft-images.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n💾 Results saved to ./output/mft-images.json');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  }
}

if (require.main === module) {
  extractImages().catch(console.error);
}

module.exports = extractImages;
