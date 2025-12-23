const fs = require('fs');
const path = require('path');

// Create a simple SVG icon that can be converted to PNG/ICO/ICNS later
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="#1976d2" rx="80"/>
  
  <!-- Spider web pattern -->
  <g stroke="white" stroke-width="4" fill="none" opacity="0.3">
    <!-- Radial lines -->
    <line x1="256" y1="100" x2="256" y2="412"/>
    <line x1="100" y1="256" x2="412" y2="256"/>
    <line x1="156" y1="156" x2="356" y2="356"/>
    <line x1="356" y1="156" x2="156" y2="356"/>
    
    <!-- Concentric circles -->
    <circle cx="256" cy="256" r="80"/>
    <circle cx="256" cy="256" r="120"/>
    <circle cx="256" cy="256" r="160"/>
  </g>
  
  <!-- Main text -->
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">
    LPS
  </text>
  
  <!-- Subtitle -->
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white" opacity="0.8">
    Crawler Pro
  </text>
</svg>`;

// Save SVG icon
fs.writeFileSync(path.join(__dirname, 'assets/icon.svg'), svgIcon);

// Create placeholder files for different formats
const placeholderText = `Placeholder icon file
Replace with actual icon in appropriate format:
- icon.png (512x512) for general use
- icon.ico (multi-resolution) for Windows  
- icon.icns (multi-resolution) for macOS

The SVG icon (icon.svg) can be converted to these formats using:
- ImageMagick: convert icon.svg -resize 512x512 icon.png
- Online converters for ICO and ICNS formats
- Professional icon creation tools

Current SVG icon shows:
- Blue gradient background
- Spider web pattern (representing web crawling)
- "LPS" text in white
- "Crawler Pro" subtitle`;

// Create placeholder files
['icon.png', 'icon.ico', 'icon.icns'].forEach(iconFile => {
  fs.writeFileSync(path.join(__dirname, 'assets', iconFile), placeholderText);
});

console.log('✅ Icon files created successfully!');
console.log('📁 SVG icon saved to: assets/icon.svg');
console.log('🎨 You can customize the SVG and convert it to other formats');
console.log('🔧 For production, replace placeholder files with actual icons');