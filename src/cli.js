#!/usr/bin/env node

const { Command } = require('commander');
const LPSCrawler = require('./LPSCrawler');
const BrowserInterface = require('./BrowserInterface');
const logger = require('./utils/logger');
require('dotenv').config();

const pkg = require('../package.json');

const program = new Command();

program
  .name('lps-crawl')
  .description('Lattice-Phased Synchronicity Web Crawler')
  .version(pkg.version)
  .requiredOption('-u, --url <url>', 'Starting URL to crawl')
  .option('-m, --max-phases <number>', 'Maximum crawl phases', '50')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--no-headless', 'Run browser with UI (headed mode)')
  .option('--rate-limit <number>', 'Requests per second', '5')
  .option('--no-respect-robots', 'Ignore robots.txt')
  .option('--save-interval <number>', 'Checkpoint save interval', '10')
  .option('--download-media', 'Download media files (images/videos)')
  .option('--download-dir <dir>', 'Media download directory', './downloads')
  .option('--max-concurrent-downloads <number>', 'Max concurrent downloads', '5')
  .parse();

async function main() {
  const options = program.opts();
  
  logger.info('LPS Crawler CLI started', { url: options.url });
  
  const browser = new BrowserInterface({
    headless: Boolean(options.headless),
    rateLimit: {
      maxRequests: parseInt(options.rateLimit),
      interval: 1000
    },
    respectRobots: Boolean(options.respectRobots)
  });

  const crawler = new LPSCrawler(browser, {
    maxPhases: parseInt(options.maxPhases),
    outputDir: options.output,
    saveInterval: parseInt(options.saveInterval),
    downloadMedia: options.downloadMedia,
    downloadDir: options.downloadDir,
    maxConcurrentDownloads: parseInt(options.maxConcurrentDownloads)
  });

  // Progress tracking
  crawler.on('phaseComplete', (data) => {
    logger.info(`Phase ${data.phase} complete`, {
      tension: data.tension.toFixed(2),
      total: data.discovered
    });
  });

  crawler.on('crawlEnd', () => {
    logger.info('Crawl completed successfully');
  });

  try {
    const report = await crawler.run(options.url);
    console.log('\n=== CRAWL REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (error) {
    logger.error('Crawl failed:', error);
    process.exit(1);
  }
}

main();