const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

console.log('📦 Preparing clean production dist folder for Cloudflare...');

// Clean dist directory before copying
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy all build output to dist
if (fs.existsSync(buildDir)) {
  fs.cpSync(buildDir, distDir, { recursive: true });
  console.log('✅ Copied fresh build output to dist directory');
} else {
  console.error('❌ build directory does not exist! Please run build first.');
  process.exit(1);
}

// Remove any .map files from dist to keep upload lightweight (< 350 KB)
function removeSourceMaps(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeSourceMaps(fullPath);
    } else if (file.endsWith('.map')) {
      fs.unlinkSync(fullPath);
    }
  }
}
removeSourceMaps(distDir);
console.log('✅ Cleaned source maps (.map files) to keep bundle lightweight');

// Ensure Cloudflare routing files exist in dist
const redirectsSrc = path.join(publicDir, '_redirects');
const redirectsDest = path.join(distDir, '_redirects');
if (fs.existsSync(redirectsSrc)) {
  fs.copyFileSync(redirectsSrc, redirectsDest);
  console.log('✅ Verified _redirects in dist for SPA routing');
}

const headersSrc = path.join(publicDir, '_headers');
const headersDest = path.join(distDir, '_headers');
if (fs.existsSync(headersSrc)) {
  fs.copyFileSync(headersSrc, headersDest);
  console.log('✅ Verified _headers in dist for caching rules');
}

// Automatically create Cloudflare-compatible dist.zip with POSIX forward slashes
try {
  const { createZip } = require('./zip-util');
  const zipDest = path.join(rootDir, 'dist.zip');
  createZip(distDir, zipDest);
  console.log('✅ Created 100% Cloudflare-compatible dist.zip archive with POSIX forward slashes');
} catch (e) {
  console.log('⚠️ Could not create dist.zip automatically:', e.message);
}

console.log('🎉 Production dist folder is ready for Cloudflare deployment!');
