# LPS Crawler Desktop

A desktop GUI for the LPS Crawler, built with Electron.

## Features

### 🕷️ Web Crawler
- **Link Discovery**: Crawls websites using adaptive phase adjustment.
- **Progress Tracking**: Real-time feedback on crawl status.
- **Data Export**: Save results in JSON, CSV, and Markdown.
- **Policies**: Respects Robots.txt rules.

### 🖼️ Image Extractor  
- **Auto-Scroll**: Trigger loading of lazy-loaded images.
- **Format Support**: Handles PNG, JPG, WebP, GIF, SVG, BMP.
- **Downloads**: Bulk download capability.
- **Gallery**: Built-in image preview.

### 🎥 Video Extractor
- **Stream Detection**: Identifies HLS (.m3u8) and DASH (.mpd) streams.
- **Player Integration**: Detects Video.js, HLS.js, Shaka Player, JW Player.
- **Network Scanning**: Captures media sources from network traffic.

### 🖥️ Desktop Interface
- **Modern UI**: Clean Material Design interface.
- **Cross-platform**: Compatible with Windows, macOS, and Linux.

## Installation

### Prerequisites
- Node.js 14.0.0 or higher
- npm

### Setup
```bash
# Install dependencies
npm install

# Start desktop application
npm start
```

## Usage

### 1. Web Crawler Tab
1. Enter URL.
2. Set phases (5-100).
3. "Start Crawling".
4. Export results when done.

### 2. Image Extractor Tab
1. Enter URL.
2. Configure scrolling.
3. "Start Extraction".
4. View/Download found images.

### 3. Video Extractor Tab
1. Enter URL.
2. "Start Extraction".
3. View detected video sources.

### 4. Settings Tab
- Set download folder.
- Configure concurrency and timeouts.
- Set User Agent.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New crawl |
| Ctrl+E | Export results |
| Ctrl+, | Open settings |
| Ctrl+Q | Quit application |
| F5 | Reload |
| Ctrl+Shift+I | Dev tools |

## Project Structure

```
desktop/
├── main.js                 # Electron main process
├── preload.js             # IPC bridge
└── assets/                # Resources
```
*(The UI is served from the root `index.html` via a local server)*

## License

Apache License 2.0 - see the [LICENSE](../LICENSE) file for details.