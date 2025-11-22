/**
 * Wrapper for server.js that works with CommonJS bundle
 *
 * This file is bundled instead of server.js directly.
 * It defines import.meta.url polyfill for CommonJS.
 */

// Polyfill import.meta for CommonJS
const importMeta = {
  url: `file://${__filename}`
}

// Monkey-patch fileURLToPath to handle our polyfill
import { fileURLToPath } from 'url'
const originalFileURLToPath = fileURLToPath
global.fileURLToPath = (url) => {
  if (typeof url === 'string') {
    return originalFileURLToPath(url)
  }
  // If it's import.meta.url, return __filename
  return __filename
}

// Import and run the server
import('../server.js').catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
