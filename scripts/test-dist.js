#!/usr/bin/env node
/**
 * Test script to regenerate dist/ for an existing export
 * Usage: node scripts/test-dist.js <exportId>
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { generateDist } from './post-processing/dist-generator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const exportId = process.argv[2]

if (!exportId) {
  console.error('Usage: node scripts/test-dist.js <exportId>')
  console.error('Example: node scripts/test-dist.js node-8087-1482-1763001284')
  process.exit(1)
}

const exportDir = path.join(__dirname, '..', 'src', 'generated', 'export_figma', exportId)

console.log(`🧪 Testing dist generation for ${exportId}...\n`)

await generateDist(exportDir, {
  type: 'single',
  componentName: 'Widget 01 -Desktop'  // This doesn't matter anymore with our fix
})

console.log(`\n✅ Test complete!`)
