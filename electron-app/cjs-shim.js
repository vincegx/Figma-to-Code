/**
 * CJS Shim for import.meta
 *
 * This file is injected by esbuild to polyfill import.meta in CommonJS bundles.
 * It provides import.meta.url based on __filename.
 */

// Create import.meta polyfill
export const importMetaUrl = typeof __filename !== 'undefined'
  ? `file://${__filename}`
  : ''
