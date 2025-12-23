#!/usr/bin/env node

/**
 * Clean build artifacts and output directories
 */

const fs = require('fs').promises;
const path = require('path');

async function removeDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`✓ Removed: ${dirPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`✗ Failed to remove ${dirPath}:`, error.message);
    }
  }
}

async function clean() {
  console.log('🧹 Cleaning build artifacts...\n');
  
  const dirsToClean = [
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, '..', 'output'),
    path.join(__dirname, '..', 'example-output'),
    path.join(__dirname, '..', 'node_modules', '.cache')
  ];
  
  for (const dir of dirsToClean) {
    await removeDir(dir);
  }
  
  console.log('\n✅ Clean complete!');
}

if (require.main === module) {
  clean().catch(console.error);
}

module.exports = clean;
