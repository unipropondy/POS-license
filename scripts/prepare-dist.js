const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

console.log('📦 Preparing production dist folder for Cloudflare Pages...');

// Ensure dist directory exists and copy from build
if (fs.existsSync(buildDir)) {
  fs.cpSync(buildDir, distDir, { recursive: true });
  console.log('✅ Copied build output to dist directory');
} else {
  console.error('❌ build directory does not exist! Please run build first.');
  process.exit(1);
}

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

console.log('🎉 Production dist folder is ready for Cloudflare deployment!');
