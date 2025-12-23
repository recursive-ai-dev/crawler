# LPS Crawler Desktop

A comprehensive web scraping and media extraction tool featuring a desktop GUI. It provides advanced crawling capabilities and media extraction for text, images, video, audio, and documents.

## Core Features

### 📝 TextExtractor - Text & Metadata
- **Readability Analysis** - Calculates Flesch-Kincaid scores and reading time.
- **Content Filtering** - Removes noise like ads, navigation, and footers.
- **Metadata** - Extracts JSON-LD, OpenGraph, Twitter Cards, and Dublin Core data.
- **Markdown Export** - Converts HTML to clean markdown, preserving tables and code blocks.
- **Code Detection** - Identifies programming languages in code blocks.
- **Quality Metrics** - Analyzes content quality based on word count and structure.

### 🖼️ MFTExtractor - Image Extraction
- **Dynamic Content** - Handles lazy-loading and infinite scroll automatically.
- **Network Capture** - Intercepts image requests (XHR/Fetch) alongside DOM scanning.
- **Format Support** - Extracts SVGs, canvas content, `srcset`, and responsive `picture` elements.
- **Smart Filtering** - Filters images by size and type; categorizes into heroes, thumbnails, icons, etc.

### 🎬 TBRExtractor - Video Extraction
- **Streaming Support** - Detects HLS (.m3u8), DASH (.mpd), and MSS streams.
- **Start-of-the-Art Players** - Integrates with Video.js, HLS.js, Shaka, JW Player, Plyr, etc.
- **Deep Scanning** - Scans Shadow DOM and iframes for embedded players.
- **Asset Extraction** - Captures subtitles (VTT/SRT), audio tracks, and thumbnails.
- **Platform Support** - Detects embedded videos from YouTube, Vimeo, Twitch, and more.

### 🔊 AudioExtractor - Audio Extraction
- **Streaming Audio** - Supports HLS/DASH audio streams.
- **Player Monitoring** - Monitors AudioContext and HTMLAudioElement activity.
- **Podcasts & Music** - Detects RSS feeds and embedded players (SoundCloud, Spotify, etc.).
- **Formats** - Supports MP3, OGG, WAV, FLAC, M4A, AAC, and OPUS.

### 📑 PDFExtractor - Document Extraction
- **Formats** - Extracts PDF, Word, Excel, PowerPoint, and eBook formats.
- **Cloud Viewers** - Detects documents in Google Docs, OneDrive, SharePoint, and Dropbox viewers.
- **Embedded Viewers** - handling for PDF.js and canvas-based viewers.

### 🔄 Universal Extractor
- **Single-Pass Extraction** - Runs all extractors in a single browser session for efficiency.
- **Resource Management** - Optimizes memory and CPU usage during comprehensive scans.

## Installation

```bash
cd lps-crawler-desktop
npm install
# Ensures all dependencies including Electron and Puppeteer are ready
```

## Usage

### Desktop Application
Run the full GUI application:
```bash
npm start
# or
node start-desktop.js
```

### Web Interface
Run only the web server (accessible via browser):
```bash
node serve-gui.js
# Open http://localhost:3001
```

### Programmatic API

```javascript
const { 
  createTextExtractor,
  createMFTExtractor,
  createTBRExtractor,
  createUniversalExtractor
} = require('./src');

// Extract all media types from a URL
const universal = await createUniversalExtractor({
  extract: { text: true, images: true, video: true, audio: true, documents: true }
});
const result = await universal.run('https://example.com');
console.log(`Found ${result.summary.counts.images} images`);
```

## Project Structure

```
├── start-desktop.js     # Desktop launcher
├── desktop/main.js      # Electron main process
├── serve-gui.js         # GUI server
├── index.html           # GUI interface
└── src/
    ├── index.js              # Factory exports
    ├── BrowserInterface.js   # Puppeteer wrapper
    ├── LPSCrawler.js         # Core crawler logic
    ├── extractors/           # Specialized extractors
    │   ├── TextExtractor.js
    │   ├── MFTExtractor.js
    │   ├── TBRExtractor.js
    │   ├── AudioExtractor.js
    │   ├── PDFExtractor.js
    │   └── UniversalExtractor.js
    └── utils/
        ├── mathUtils.js      # Rigorous math functions
        ├── mediaDownloader.js
        └── rateLimiter.js
```

## License

Apache License 2.0 - see the [LICENSE](LICENSE) file for details.