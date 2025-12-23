const { createCrawler } = require('../src');

/**
 * Example: Crawler with event handling and multi-format export
 */
async function crawlWithEvents() {
  console.log('🚀 LPS Crawler Example (events + exports)\n');

  const crawler = await createCrawler({
    browser: {
      headless: true,
      userAgent: 'LPS-Crawler/2.0',
      rateLimit: { maxRequests: 5, interval: 1000 },
      respectRobots: true
    },
    crawler: {
      maxPhases: 30,
      tensionThreshold: 0.5,
      stasisWindow: 3,
      outputDir: './output/events',
      saveInterval: 5
    }
  });

  let phaseCount = 0;
  let discoveryCount = 0;

  crawler.on('crawlStart', ({ url }) => {
    console.log(`🎯 Starting crawl: ${url}`);
  });

  crawler.on('phaseStart', ({ phase, interaction }) => {
    console.log(`\n📍 Phase ${phase}: ${interaction}`);
  });

  crawler.on('phaseComplete', ({ tension, discovered }) => {
    phaseCount++;
    discoveryCount = discovered;

    const filled = Math.min(20, Math.floor(tension * 20));
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    console.log(`   Tension: [${bar}] ${tension.toFixed(2)}`);
    console.log(`   Total discoveries: ${discovered}`);
  });

  crawler.on('phaseError', ({ phase, error }) => {
    console.error(`❌ Phase ${phase} error:`, error.message);
  });

  crawler.on('crawlEnd', () => {
    console.log(`\n✅ Crawl completed!`);
    console.log(`   Total phases: ${phaseCount}`);
    console.log(`   Total discoveries: ${discoveryCount}`);
  });

  try {
    const report = await crawler.run('https://news.ycombinator.com');

    console.log('\n📊 Final Report:');
    console.log(`   Duration: ${report.duration}ms`);
    console.log(`   Unique URLs: ${report.totalDiscoveries}`);
    console.log(`   Phases executed: ${report.phases}`);
    console.log(`   Average tension: ${report.avgTension.toFixed(2)}`);

    const fs = require('fs').promises;
    const DataSynthesizer = require('../src/DataSynthesizer');
    const synthesizer = new DataSynthesizer(report.extractionLog);

    await fs.mkdir('./output/events', { recursive: true });

    await Promise.all([
      fs.writeFile('./output/events/report.json', JSON.stringify(report, null, 2)),
      fs.writeFile('./output/events/links.jsonl', synthesizer.toJSONL()),
      fs.writeFile('./output/events/report.md', synthesizer.toMarkdown()),
      fs.writeFile('./output/events/links.csv', synthesizer.toCSV()),
      fs.writeFile('./output/events/links.txt', synthesizer.toRaw())
    ]);

    console.log('\n💾 All outputs saved to ./output/events/');
  } catch (error) {
    console.error('\n❌ Crawl failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  crawlWithEvents().catch(console.error);
}

module.exports = crawlWithEvents;
