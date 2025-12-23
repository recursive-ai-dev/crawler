const { createCrawler } = require('../src');

async function example() {
  const crawler = await createCrawler({
    browser: {
      headless: true,
      rateLimit: { maxRequests: 3, interval: 1000 }
    },
    crawler: {
      maxPhases: 20,
      outputDir: './example-output'
    }
  });

  crawler.on('phaseStart', ({ phase, interaction }) => {
    console.log(`🔄 Starting phase ${phase}: ${interaction}`);
  });

  const report = await crawler.run('https://example.com');
  console.log('✅ Crawl complete:', report);
}

if (require.main === module) {
  example().catch(console.error);
}