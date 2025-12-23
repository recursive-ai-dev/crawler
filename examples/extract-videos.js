const { createTBRExtractor } = require('../src');

/**
 * Example: Extract video sources from a video streaming site
 */
async function extractVideos() {
  console.log('📡 TBR Extractor Example - Video Source Extraction\n');

  const extractor = await createTBRExtractor({
    browser: {
      headless: false,
      rateLimit: { maxRequests: 3, interval: 1000 }
    },
    extractor: {
      observationWindow: 8000, // Wait 8 seconds for dynamic content
      scanShadowDOM: true,
      downloadMedia: true, // Enable media downloading
      downloadDir: './downloads/videos',
      organizeByType: true,
      maxConcurrentDownloads: 2
    }
  });

  // Listen to events
  extractor.on('extractionStart', ({ target }) => {
    console.log(`🚀 Starting video extraction for: ${target}`);
  });

  extractor.on('itemFound', ({ item, metadata }) => {
    console.log(`📹 Found [${metadata.source}]: ${item.substring(0, 80)}...`);
  });

  try {
    // Replace with actual video site
    const results = await extractor.run('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    
    console.log(`\n✅ Extraction complete!`);
    console.log(`   Total videos: ${results.items.length}`);
    console.log(`   HLS streams: ${results.grouped.hls.length}`);
    console.log(`   DASH streams: ${results.grouped.dash.length}`);
    console.log(`   Direct files: ${results.grouped.direct.length}`);
    
    if (results.downloaded) {
      console.log(`   Files downloaded: ${results.downloaded.stats.successful}/${results.downloaded.stats.total}`);
      console.log(`   Download directory: ./downloads/videos`);
    }
    
    // Save results
    const fs = require('fs').promises;
    await fs.mkdir('./output', { recursive: true });
    await fs.writeFile(
      './output/tbr-videos.json',
      JSON.stringify(results, null, 2)
    );
    
    // Create M3U playlist
    const m3u = '#EXTM3U\n' + results.items.map((url, i) => 
      `#EXTINF:-1,Video ${i+1}\n${url}`
    ).join('\n');
    
    await fs.writeFile('./output/playlist.m3u', m3u);
    
    console.log('\n💾 Results saved to ./output/');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  }
}

if (require.main === module) {
  extractVideos().catch(console.error);
}

module.exports = extractVideos;
