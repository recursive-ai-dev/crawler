# LPS Crawler Desktop

A professional desktop GUI for the LPS Crawler, built with Electron and React.

## Features

### 🕷️ Web Crawler
- **Adaptive Link Discovery**: Intelligent crawling with tension-based phase adjustment
- **Real-time Progress**: Live progress tracking with tension indicators
- **Export Options**: Save results in JSON, CSV, and Markdown formats
- **Robots.txt Compliance**: Respects website crawling policies

### 🖼️ Image Extractor  
- **Lazy-load Detection**: Automatically triggers infinite scroll and lazy-loaded content
- **Multiple Formats**: Supports PNG, JPG, WebP, GIF, SVG, BMP
- **Bulk Download**: Download all extracted images with organized file structure
- **Preview Gallery**: Built-in image viewer with metadata display

### 🎥 Video Extractor
- **Streaming Protocols**: HLS (.m3u8) and DASH (.mpd) stream detection
- **Player Support**: Video.js, HLS.js, Shaka Player, JW Player detection
- **Network Interception**: Captures video sources from network requests
- **Smart Filtering**: Handles blob URLs and temporary streams appropriately

### 🖥️ Professional Desktop Interface
- **Modern Design**: Clean, Material Design-based interface
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Responsive**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Full keyboard navigation support

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Development Setup
```bash
# Install dependencies
npm install

# Start development mode
npm run desktop:dev

# Start production mode
npm run desktop
```

### Building for Distribution

#### Windows
```bash
npm run desktop:build:win
```

#### macOS
```bash
npm run desktop:build:mac
```

#### Linux
```bash
npm run desktop:build:linux
```

#### All Platforms
```bash
npm run desktop:build
```

## Usage

### 1. Web Crawler Tab
1. Enter the target website URL
2. Set maximum crawl phases (5-100)
3. Click "Start Crawling"
4. Monitor progress and view discovered links
5. Export results when complete

### 2. Image Extractor Tab
1. Enter the target website URL
2. Configure scroll settings:
   - Max scrolls (5-100)
   - Scroll delay (500-5000ms)
3. Optionally enable "Download images"
4. Click "Start Extraction"
5. View extracted images in the gallery

### 3. Video Extractor Tab
1. Enter the target website URL
2. Set observation window (1-15 seconds)
3. Optionally enable "Download videos"
4. Click "Start Extraction"
5. View grouped video sources by type

### 4. Settings Tab
- Configure download directories
- Set rate limits and concurrency
- Toggle headless mode and robots.txt compliance
- Customize notification preferences

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New crawl |
| Ctrl+E | Export results |
| Ctrl+, | Open settings |
| Ctrl+Q | Quit application |
| F5 | Reload current view |
| Ctrl+Shift+I | Toggle developer tools |

## Architecture

```
desktop/
├── main.js                 # Electron main process
├── preload.js             # Secure IPC bridge
├── public/
│   └── index.html         # HTML entry point
├── src/
│   ├── index.js           # React entry point
│   ├── App.js             # Main application component
│   ├── components/        # React components
│   │   ├── CrawlerPanel.js
│   │   ├── ImageExtractorPanel.js
│   │   ├── VideoExtractorPanel.js
│   │   └── SettingsPanel.js
│   ├── utils/             # Utility functions
│   └── styles/            # CSS styles
└── assets/                # App icons and resources
```

## Configuration

Settings are automatically saved to local storage and persist between sessions. Key settings include:

- **Download Directory**: Where media files are saved
- **Max Concurrent Downloads**: Parallel download limit
- **Rate Limit**: Requests per second limit
- **Headless Mode**: Browser visibility setting
- **Robots.txt Compliance**: Respect crawling policies

## Security Features

- **Context Isolation**: Renderer process is isolated from Node.js
- **Secure IPC**: Whitelisted channels for main-renderer communication
- **No Node Integration**: Renderer cannot access Node.js APIs directly
- **Content Security Policy**: Prevents injection attacks

## Development

### Adding New Features
1. Create React components in `src/components/`
2. Add IPC handlers in `main.js` if needed
3. Update preload script to expose new APIs
4. Add corresponding styles in `src/styles/`

### Testing
```bash
# Run tests for the crawler backend
npm test

# Test desktop app manually
npm run desktop:dev
```

### Debugging
- Use Chrome DevTools (F12) in development mode
- Check Electron main process logs in terminal
- Enable verbose logging in settings

## Troubleshooting

### Common Issues

1. **App won't start**
   - Check Node.js version (18.0.0+)
   - Verify all dependencies are installed
   - Check for port conflicts

2. **Browser not launching**
   - Ensure Puppeteer Chrome is installed
   - Check headless mode settings
   - Verify system permissions

3. **Downloads failing**
   - Check download directory permissions
   - Verify available disk space
   - Check network connectivity

4. **Performance issues**
   - Reduce concurrent download limit
   - Lower rate limit settings
   - Clear download directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section
- Review GitHub issues
- Create a new issue with detailed information

---

**LPS Crawler Desktop** - Professional web scraping made simple! 🕷️