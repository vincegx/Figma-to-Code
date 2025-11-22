#!/usr/bin/env node

/**
 * Bundle server.js for Electron production
 *
 * This script uses esbuild to bundle server.js and all its npm dependencies
 * into a single standalone file that can run without node_modules.
 */

import esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('📦 Bundling server.js for Electron...\n')

const serverPath = path.join(__dirname, '..', 'server.js')
const outputPath = path.join(__dirname, 'server-bundle.cjs')

// Check if server.js exists
if (!fs.existsSync(serverPath)) {
  console.error(`❌ Error: server.js not found at ${serverPath}`)
  process.exit(1)
}

esbuild.build({
  entryPoints: [serverPath],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: outputPath,
  format: 'cjs',
  // Replace import.meta.url with a variable that works in CJS
  define: {
    'import.meta.url': '_importMetaUrl'
  },
  banner: {
    js: "const _importMetaUrl = require('url').pathToFileURL(__filename).href;"
  },
  // External modules (Node.js built-ins and binaries)
  external: [
    // Node.js built-ins
    'fs', 'path', 'http', 'https', 'url', 'stream', 'util', 'events',
    'child_process', 'os', 'crypto', 'zlib', 'buffer', 'querystring',
    'readline', 'net', 'tls', 'dgram', 'dns', 'vm', 'assert', 'process',

    // Puppeteer uses chromium binary (can't bundle)
    'puppeteer',

    // Vite (only used in dev mode, will be tree-shaken in production)
    'vite'
  ],
  minify: false, // Keep readable for debugging
  sourcemap: false,
  logLevel: 'info',
  loader: {
    '.node': 'file' // Native modules
  },
  // Allow warnings for conditional imports
  logOverride: {
    'ignored-dynamic-import': 'silent',
    'unsupported-dynamic-import': 'silent'
  }
}).then(() => {
  console.log('\n✅ Server bundle created successfully!')
  console.log(`📂 Output: ${outputPath}`)

  // Show file size
  const stats = fs.statSync(outputPath)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`📊 Size: ${sizeMB} MB\n`)
}).catch((error) => {
  console.error('\n❌ Build failed:', error)
  process.exit(1)
})
