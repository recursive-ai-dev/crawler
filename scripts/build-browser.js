/**
 * Build script for creating minified bookmarklet versions
 */

const fs = require('fs').promises;
const path = require('path');

async function minifyCode(code) {
  // Simple minification - remove comments and extra whitespace
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*/g, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}();,:])\s*/g, '$1') // Remove spaces around operators
    .trim();
}

async function createBookmarklet(filePath) {
  const code = await fs.readFile(filePath, 'utf-8');
  const minified = await minifyCode(code);
  
  // Encode for bookmarklet
  const bookmarklet = `javascript:${encodeURIComponent(minified)}`;
  
  return {
    minified,
    bookmarklet
  };
}

async function build() {
  console.log('🔨 Building browser bookmarklets...\n');
  
  const browserDir = path.join(__dirname, '..', 'browser');
  const distDir = path.join(__dirname, '..', 'dist', 'browser');
  
  await fs.mkdir(distDir, { recursive: true });
  
  // Build MFT bookmarklet
  console.log('📦 Building MFT extractor...');
  const mft = await createBookmarklet(path.join(browserDir, 'mft-bookmarklet.js'));
  await fs.writeFile(path.join(distDir, 'mft-extractor.min.js'), mft.minified);
  await fs.writeFile(path.join(distDir, 'mft-bookmarklet.txt'), mft.bookmarklet);
  console.log(`   ✓ Saved to dist/browser/mft-extractor.min.js`);
  console.log(`   ✓ Bookmarklet saved to dist/browser/mft-bookmarklet.txt`);
  
  // Build TBR bookmarklet
  console.log('📦 Building TBR extractor...');
  const tbr = await createBookmarklet(path.join(browserDir, 'tbr-bookmarklet.js'));
  await fs.writeFile(path.join(distDir, 'tbr-extractor.min.js'), tbr.minified);
  await fs.writeFile(path.join(distDir, 'tbr-bookmarklet.txt'), tbr.bookmarklet);
  console.log(`   ✓ Saved to dist/browser/tbr-extractor.min.js`);
  console.log(`   ✓ Bookmarklet saved to dist/browser/tbr-bookmarklet.txt`);
  
  // Create HTML demo page
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LPS Crawler - Browser Extractors</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 50px auto;
      padding: 20px;
      background: #0a0a0a;
      color: #fff;
    }
    h1 { color: #00d4ff; }
    h2 { color: #ff00ff; margin-top: 40px; }
    .bookmarklet {
      background: #1e1e1e;
      border: 2px solid #00d4ff;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .bookmarklet h3 { margin-top: 0; }
    .btn {
      display: inline-block;
      background: #00d4ff;
      color: #000;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 10px 10px 10px 0;
      cursor: move;
    }
    .btn:hover { background: #00a8cc; }
    code {
      background: #0a0a0a;
      padding: 2px 6px;
      border-radius: 3px;
      color: #ff00ff;
    }
    pre {
      background: #0a0a0a;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>🚀 LPS Crawler - Browser Extractors</h1>
  <p>Drag these bookmarklets to your bookmarks bar to use them on any webpage!</p>
  
  <div class="bookmarklet">
    <h3>🎯 MFT Image Extractor</h3>
    <p>Extracts all images from lazy-loaded and infinite scroll content.</p>
    <a href="${mft.bookmarklet}" class="btn">📸 MFT Extractor</a>
    <p><strong>Features:</strong></p>
    <ul>
      <li>Automatic scroll detection</li>
      <li>Lazy-load trigger</li>
      <li>Shadow DOM support</li>
      <li>Export to JSON/TXT</li>
    </ul>
  </div>
  
  <div class="bookmarklet">
    <h3>📡 TBR Video Extractor</h3>
    <p>Extracts video sources from complex players (HLS, DASH, MP4, etc.)</p>
    <a href="${tbr.bookmarklet}" class="btn">📹 TBR Extractor</a>
    <p><strong>Features:</strong></p>
    <ul>
      <li>Network interception</li>
      <li>Player API detection (Video.js, HLS.js, Shaka, JW Player)</li>
      <li>Streaming protocol support (HLS, DASH)</li>
      <li>M3U playlist export</li>
    </ul>
  </div>
  
  <h2>💻 Console Usage</h2>
  <p>You can also copy-paste the scripts directly into the browser console:</p>
  
  <h3>MFT Extractor</h3>
  <pre><code>// Load and run MFT extractor
fetch('https://yoursite.com/dist/browser/mft-extractor.min.js')
  .then(r => r.text())
  .then(eval);</code></pre>
  
  <h3>TBR Extractor</h3>
  <pre><code>// Load and run TBR extractor
fetch('https://yoursite.com/dist/browser/tbr-extractor.min.js')
  .then(r => r.text())
  .then(eval);</code></pre>
  
  <h2>📚 Documentation</h2>
  <p>For more information, visit the <a href="https://github.com/yourusername/lps-crawler" style="color: #00d4ff;">GitHub repository</a>.</p>
</body>
</html>`;
  
  await fs.writeFile(path.join(distDir, 'index.html'), htmlContent);
  console.log('📄 Demo page created: dist/browser/index.html');
  
  console.log('\n✅ Build complete!');
  console.log('\n📖 To use the bookmarklets:');
  console.log('   1. Open dist/browser/index.html in a browser');
  console.log('   2. Drag the bookmarklet buttons to your bookmarks bar');
  console.log('   3. Click them on any webpage to extract content');
}

if (require.main === module) {
  build().catch(console.error);
}

module.exports = build;
