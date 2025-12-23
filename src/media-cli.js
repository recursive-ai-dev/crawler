#!/usr/bin/env node

const { Command } = require('commander');
const { createMFTExtractor, createTBRExtractor } = require('./index');
const logger = require('./utils/logger');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pkg = require('../package.json');

const program = new Command();

program
  .name('lps-media')
  .description('LPS Crawler - Media Extraction Tool')
  .version(pkg.version);

// MFT Image extraction command
program
  .command('images')
  .description('Extract images from a website using MFT extractor')
  .requiredOption('-u, --url <url>', 'Target URL to extract images from')
  .option('-o, --output <dir>', 'Output directory for results', './output')
  .option('-d, --download-dir <dir>', 'Directory to download images', './downloads/images')
  .option('--download', 'Download images to local files')
  .option('--max-scrolls <number>', 'Maximum scroll iterations', '30')
  .option('--scroll-delay <number>', 'Delay between scrolls in ms', '1000')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--rate-limit <number>', 'Requests per second', '5')
  .option('--max-concurrent-downloads <number>', 'Max concurrent downloads', '5')
  .option('--organize-by-source', 'Organize downloads by source domain')
  .action(async (options) => {
    try {
      logger.info('Starting MFT image extraction', { url: options.url });
      
      const extractor = await createMFTExtractor({
        browser: {
          headless: options.headless,
          rateLimit: {
            maxRequests: parseInt(options.rateLimit),
            interval: 1000
          }
        },
        extractor: {
          maxScrolls: parseInt(options.maxScrolls),
          scrollDelay: parseInt(options.scrollDelay),
          downloadMedia: options.download,
          downloadDir: options.downloadDir,
          organizeByType: true,
          organizeBySource: options.organizeBySource,
          maxConcurrentDownloads: parseInt(options.maxConcurrentDownloads)
        }
      });

      // Progress tracking
      let foundCount = 0;
      extractor.on('itemFound', ({ item }) => {
        foundCount++;
        if (foundCount % 10 === 0) {
          logger.info(`Found ${foundCount} images so far...`);
        }
      });

      const results = await extractor.run(options.url);
      
      // Save results
      await fs.mkdir(options.output, { recursive: true });
      await fs.writeFile(
        path.join(options.output, 'extracted-images.json'),
        JSON.stringify(results, null, 2)
      );

      // Summary
      console.log('\n📸 Image Extraction Complete!');
      console.log(`   URL: ${options.url}`);
      console.log(`   Images found: ${results.items.length}`);
      
      if (options.download) {
        console.log(`   Images downloaded: ${results.downloaded?.stats.successful || 0}/${results.downloaded?.stats.total || 0}`);
        console.log(`   Download directory: ${options.downloadDir}`);
      }
      
      console.log(`   Results saved to: ${path.join(options.output, 'extracted-images.json')}`);
      
    } catch (error) {
      logger.error('Image extraction failed:', error);
      process.exit(1);
    }
  });

// TBR Video extraction command
program
  .command('videos')
  .description('Extract videos from a website using TBR extractor')
  .requiredOption('-u, --url <url>', 'Target URL to extract videos from')
  .option('-o, --output <dir>', 'Output directory for results', './output')
  .option('-d, --download-dir <dir>', 'Directory to download videos', './downloads/videos')
  .option('--download', 'Download videos to local files')
  .option('--observation-window <number>', 'Network monitoring duration in ms', '5000')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--rate-limit <number>', 'Requests per second', '3')
  .option('--max-concurrent-downloads <number>', 'Max concurrent downloads', '2')
  .option('--organize-by-source', 'Organize downloads by source domain')
  .action(async (options) => {
    try {
      logger.info('Starting TBR video extraction', { url: options.url });
      
      const extractor = await createTBRExtractor({
        browser: {
          headless: options.headless,
          rateLimit: {
            maxRequests: parseInt(options.rateLimit),
            interval: 1000
          }
        },
        extractor: {
          observationWindow: parseInt(options.observationWindow),
          scanShadowDOM: true,
          monitorNetwork: true,
          downloadMedia: options.download,
          downloadDir: options.downloadDir,
          organizeByType: true,
          organizeBySource: options.organizeBySource,
          maxConcurrentDownloads: parseInt(options.maxConcurrentDownloads)
        }
      });

      // Progress tracking
      let foundCount = 0;
      extractor.on('itemFound', ({ item, metadata }) => {
        foundCount++;
        logger.info(`Found video: ${metadata.source} (${item.substring(0, 50)}...)`);
      });

      const results = await extractor.run(options.url);
      
      // Save results
      await fs.mkdir(options.output, { recursive: true });
      await fs.writeFile(
        path.join(options.output, 'extracted-videos.json'),
        JSON.stringify(results, null, 2)
      );

      // Create M3U playlist
      if (results.items.length > 0) {
        const m3u = '#EXTM3U\n' + results.items.map((url, i) => 
          `#EXTINF:-1,Video ${i+1}\n${url}`
        ).join('\n');
        
        await fs.writeFile(path.join(options.output, 'playlist.m3u'), m3u);
      }

      // Summary
      console.log('\n📹 Video Extraction Complete!');
      console.log(`   URL: ${options.url}`);
      console.log(`   Videos found: ${results.items.length}`);
      console.log(`   HLS streams: ${results.grouped.hls.length}`);
      console.log(`   DASH streams: ${results.grouped.dash.length}`);
      console.log(`   Direct files: ${results.grouped.direct.length}`);
      console.log(`   Blob URLs: ${results.grouped.blob.length}`);
      
      if (options.download) {
        console.log(`   Videos downloaded: ${results.downloaded?.stats.successful || 0}/${results.downloaded?.stats.total || 0}`);
        console.log(`   Download directory: ${options.downloadDir}`);
      }
      
      console.log(`   Results saved to: ${path.join(options.output, 'extracted-videos.json')}`);
      if (results.items.length > 0) {
        console.log(`   Playlist saved to: ${path.join(options.output, 'playlist.m3u')}`);
      }
      
    } catch (error) {
      logger.error('Video extraction failed:', error);
      process.exit(1);
    }
  });

// Error handling
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name()
});

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}