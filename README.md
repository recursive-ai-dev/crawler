# LPS Crawler Desktop

A **production-grade, enterprise-level** web scraping and media extraction tool with a desktop GUI. Capable of advanced crawling, comprehensive media extraction for **text, images, video, audio, and documents**.

## 🚀 Enterprise Features

### 📝 TextExtractor - Enterprise Text Extraction
- **Content Readability Analysis** - Intelligent main content detection with scoring
- **Noise Reduction** - Automatic filtering of ads, navigation, footers, sidebars
- **Structured Metadata** - JSON-LD, OpenGraph, Twitter Cards, Dublin Core
- **Markdown Generation** - Clean markdown with table and code block support
- **Code Detection** - Language inference for 14+ programming languages
- **Author/Date Extraction** - Schema.org, meta tags, and DOM heuristics
- **Reading Time Estimation** - Flesch-Kincaid readability scoring
- **Quality Analysis** - Word count, sentence structure, content scoring
- **Link Classification** - Internal, external, resource categorization
- **Multi-language Detection** - HTML lang, meta tags, OpenGraph locale

### 🖼️ MFTExtractor - Enterprise Image Extraction
- **Lazy-load Detection** - IntersectionObserver, scroll-triggered loading
- **Infinite Scroll** - Automatic scrolling with stabilization detection
- **Network Interception** - Capture images from XHR/fetch requests
- **Image Metadata** - Dimensions, alt text, format, captions
- **Quality Filtering** - Minimum size thresholds, icon exclusion
- **Srcset Parsing** - Multiple resolution detection
- **SVG Extraction** - Inline SVGs converted to data URLs
- **Canvas Capture** - Canvas element content extraction
- **Picture Elements** - Responsive image source detection
- **Social Images** - OpenGraph, Twitter, favicons, Schema.org
- **Categorization** - Hero, gallery, thumbnails, icons, backgrounds

### 🎬 TBRExtractor - Enterprise Video Extraction
- **Multi-Quality Detection** - All available quality levels
- **Streaming Protocols** - HLS (.m3u8), DASH (.mpd), MSS
- **Player API Integration** - Video.js, HLS.js, Shaka, DASH.js, JW Player, Plyr, Flowplayer
- **Shadow DOM Scanning** - Deep extraction from web components
- **Network Interception** - Capture streaming manifest requests
- **Subtitle Extraction** - VTT, SRT, TTML caption tracks
- **Audio Track Detection** - Multiple audio language tracks
- **Platform Detection** - YouTube, Vimeo, Wistia, Dailymotion, Twitch, Facebook
- **Thumbnail Extraction** - Video posters and preview images
- **Iframe Scanning** - Cross-origin embedded video detection

### 🔊 AudioExtractor - Enterprise Audio Extraction
- **Streaming Audio** - HLS/DASH audio-only streams
- **Player Integration** - Howler.js, Amplitude.js, Plyr, MediaElement.js, JPlayer
- **Web Audio API** - AudioContext and HTMLAudioElement monitoring
- **Platform Embeds** - SoundCloud, Spotify, Bandcamp, Mixcloud, Anchor
- **Podcast Detection** - RSS feed discovery, episode links
- **Format Support** - MP3, OGG, WAV, FLAC, M4A, AAC, OPUS, WebM
- **Network Capture** - Audio requests from XHR/fetch
- **Metadata Extraction** - Content-type, duration, bitrate

### 📑 PDFExtractor - Enterprise Document Extraction
- **Document Links** - PDF, Word, Excel, PowerPoint, eBooks
- **Viewer Detection** - PDF.js embedded viewer extraction
- **Cloud Platforms** - Google Docs, OneDrive, SharePoint, Dropbox, Box, Scribd, SlideShare
- **Pre-signed URLs** - AWS S3, Azure Blob, GCP signed URL handling
- **Download Buttons** - Common download UI pattern detection
- **Data Attributes** - PDF URLs in JavaScript configurations
- **Format Support** - PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, EPUB, MOBI

## Installation

```bash
cd lps-crawler-desktop
npm install
npm install electron puppeteer winston robots-parser
```

## Usage

### Desktop Mode (Recommended)
```bash
npm start
# or
node start-desktop.js
```

### Web Mode (Browser Only)
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
  createAudioExtractor,
  createPDFExtractor,
  createUniversalExtractor
} = require('./src');

// Extract text content
const textExtractor = await createTextExtractor();
const textResult = await textExtractor.run('https://example.com/article');
console.log(textResult.data.content.markdown);

// Extract all images
const imageExtractor = await createMFTExtractor({
  extractor: { minWidth: 100, excludeIcons: true }
});
const images = await imageExtractor.run('https://example.com/gallery');

// Extract videos with subtitles
const videoExtractor = await createTBRExtractor({
  extractor: { extractSubtitles: true, extractThumbnails: true }
});
const videos = await videoExtractor.run('https://example.com/video-page');

// Extract ALL media types at once
const universal = await createUniversalExtractor({
  extract: { text: true, images: true, video: true, audio: true, documents: true }
});
const everything = await universal.run('https://example.com');
```

## Structure

```
├── start-desktop.js     # Main launcher (checks prerequisites, starts Electron)
├── desktop/main.js      # Electron main process
├── serve-gui.js         # Local HTTP server for the GUI
├── index.html           # Main GUI entry point
└── src/
    ├── index.js         # Main exports with factory functions
    ├── BrowserInterface.js   # Puppeteer browser management
    ├── LPSCrawler.js    # Multi-phase recursive crawler
    ├── DataSynthesizer.js    # Data processing utilities
    └── extractors/
        ├── BaseExtractor.js      # Abstract base class
        ├── TextExtractor.js      # Enterprise text extraction
        ├── MFTExtractor.js       # Enterprise image extraction
        ├── TBRExtractor.js       # Enterprise video extraction
        ├── AudioExtractor.js     # Enterprise audio extraction
        └── PDFExtractor.js       # Enterprise document extraction
```

## Enterprise Capabilities Summary

| Media Type | Extractor | Key Features |
|------------|-----------|--------------|
| **Text** | TextExtractor | Readability analysis, Markdown generation, code detection, quality scoring |
| **Images** | MFTExtractor | Lazy-load, infinite scroll, SVG/canvas, srcset, categorization |
| **Video** | TBRExtractor | HLS/DASH, player APIs, subtitles, platform detection, quality levels |
| **Audio** | AudioExtractor | Streaming, player APIs, podcasts, embedded platforms |
| **Documents** | PDFExtractor | PDF extraction, cloud platforms, viewer detection |
| **All Media** | UniversalExtractor | Combined extraction of all media types |

## License

Education and commercial use allowed.