#!/usr/bin/env node
/**
 * CSS + TSX Synchronization Optimizer
 *
 * Ensures class names are synchronized between CSS and TSX files.
 * Prevents desynchronization by applying the same transformations to both.
 *
 * Input:  Component-clean.tsx/css (original, unoptimized)
 * Output: Component-optimized.tsx/css (transformed, synchronized)
 *
 * Usage:
 *   import { syncOptimize } from './sync-optimizer.js'
 *   const transformMap = await syncOptimize(testDir)
 */

import fs from 'fs'
import path from 'path'

/**
 * Main orchestrator - synchronize CSS + TSX optimizations
 * @param {string} testDir - Export directory (e.g., src/generated/export_figma/node-XXX)
 * @returns {Map<string, string>} transformMap - oldClass → newClass mappings
 */
export async function syncOptimize(testDir) {
  // ===== STEP 1: Read INPUT files (clean versions) =====
  const cleanTsxPath = path.join(testDir, 'Component-clean.tsx')
  const cleanCssPath = path.join(testDir, 'Component-clean.css')

  if (!fs.existsSync(cleanTsxPath) || !fs.existsSync(cleanCssPath)) {
    throw new Error('Component-clean.tsx/css not found. Run unified-processor first.')
  }

  let tsxCode = fs.readFileSync(cleanTsxPath, 'utf8')
  let cssCode = fs.readFileSync(cleanCssPath, 'utf8')

  // ===== STEP 2: Build transformation map from CSS analysis =====
  const transformMap = await buildTransformMap(cssCode)

  // ===== STEP 3: Transform CSS =====
  let optimizedCSS = await transformCSS(cssCode, transformMap)

  // ===== STEP 4: Transform TSX with SAME map =====
  let optimizedTSX = await transformTSX(tsxCode, transformMap)

  // ===== STEP 5: Validate synchronization =====
  const validation = validateSync(optimizedTSX, optimizedCSS, transformMap)

  // ===== STEP 6: Write OUTPUT files (optimized versions) =====
  const optimizedTsxPath = path.join(testDir, 'Component-optimized.tsx')
  const optimizedCssPath = path.join(testDir, 'Component-optimized.css')

  fs.writeFileSync(optimizedTsxPath, optimizedTSX)
  fs.writeFileSync(optimizedCssPath, optimizedCSS)

  return { transformMap, validation }
}

/**
 * Build transformation map by analyzing CSS
 * Detects all class name changes that will be applied
 * @param {string} cssCode - Original CSS content
 * @returns {Map<string, string>} oldClass → newClass mappings
 */
async function buildTransformMap(cssCode) {
  const transformMap = new Map()

  // Import optimizer helpers
  const { extractVariableMap } = await import('./css-optimizer.js')

  // 1. Map color classes: bg-custom-9dffb9 → bg-brand
  const variableMap = extractVariableMap(cssCode)

  for (const [color, varName] of Object.entries(variableMap)) {
    const hexPattern = color.replace('#', '').toLowerCase()

    // Only add if the custom class exists in CSS
    if (cssCode.includes(`bg-custom-${hexPattern}`) || cssCode.includes(`text-custom-${hexPattern}`) || cssCode.includes(`border-custom-${hexPattern}`)) {
      transformMap.set(`bg-custom-${hexPattern}`, `bg-${varName}`)
      transformMap.set(`text-custom-${hexPattern}`, `text-${varName}`)
      transformMap.set(`border-custom-${hexPattern}`, `border-${varName}`)
    }
  }

  // 2. Map spacing classes: px-custom-80 → px-20
  const spacingPrefixes = ['px', 'py', 'pt', 'pb', 'pl', 'pr', 'gap', 'p', 'm']

  for (const prefix of spacingPrefixes) {
    const regex = new RegExp(`\\.${prefix}-custom-(\\d+)\\b`, 'g')
    let match

    while ((match = regex.exec(cssCode)) !== null) {
      const px = match[1]
      const tailwindKey = findTailwindEquivalent(px)

      if (tailwindKey) {
        const oldClass = `${prefix}-custom-${px}`
        const newClass = `${prefix}-${tailwindKey}`
        transformMap.set(oldClass, newClass)
      }
    }
  }

  // 3. Round decimal class names: h-custom-29dot268 → h-custom-29
  const decimalRegex = /\.([hw]|min-[hw]|max-[hw])-custom-(\d+)dot\d+\b/g
  let match

  while ((match = decimalRegex.exec(cssCode)) !== null) {
    const fullMatch = match[0].substring(1) // Remove leading dot
    const prefix = match[1]
    const intValue = match[2]
    const oldClass = fullMatch
    const newClass = `${prefix}-custom-${intValue}`

    transformMap.set(oldClass, newClass)
  }

  return transformMap
}

/**
 * Transform CSS with class name replacements
 * Also optimizes property values (not class names)
 * @param {string} cssCode - Original CSS
 * @param {Map<string, string>} transformMap - Class name mappings
 * @returns {string} Optimized CSS
 */
async function transformCSS(cssCode, transformMap) {
  let optimized = cssCode

  // Apply class name transformations
  for (const [oldClass, newClass] of transformMap) {
    // Replace class definitions: .oldClass { → .newClass {
    const classDefRegex = new RegExp(`\\.${escapeRegex(oldClass)}\\b`, 'g')
    optimized = optimized.replace(classDefRegex, `.${newClass}`)
  }

  // Optimize VALUES (not class names which are already done)
  optimized = roundDecimalValuesInProperties(optimized)
  optimized = await mapColorValuesToVars(optimized)

  return optimized
}

/**
 * Transform TSX with class name replacements
 * Applies same transformMap as CSS to ensure synchronization
 * @param {string} tsxCode - Original TSX
 * @param {Map<string, string>} transformMap - Class name mappings
 * @returns {string} Optimized TSX
 */
async function transformTSX(tsxCode, transformMap) {
  let optimized = tsxCode

  // Replace class names in className attributes
  for (const [oldClass, newClass] of transformMap) {
    // Pattern: className="... oldClass ..." → className="... newClass ..."
    // Must handle word boundaries to avoid partial matches

    const classNameRegex = new RegExp(
      `(className=["'][^"']*\\b)${escapeRegex(oldClass)}(\\b[^"']*)`,
      'g'
    )

    optimized = optimized.replace(classNameRegex, `$1${newClass}$2`)
  }

  return optimized
}

/**
 * Validate that TSX classes exist in CSS
 * @param {string} tsx - Optimized TSX
 * @param {string} css - Optimized CSS
 * @param {Map<string, string>} transformMap - Applied transformations
 * @returns {object} Validation results
 */
function validateSync(tsx, css, transformMap) {
  // Extract all className values from TSX
  const classNameRegex = /className=["']([^"']+)["']/g
  const tsxClasses = new Set()

  let match
  while ((match = classNameRegex.exec(tsx)) !== null) {
    const classes = match[1].split(/\s+/)
    classes.forEach(cls => {
      if (cls && cls.trim()) {
        tsxClasses.add(cls.trim())
      }
    })
  }

  // Extract all CSS class definitions
  const cssClassRegex = /^\.([a-zA-Z0-9_-]+)\s*\{/gm
  const cssClasses = new Set()

  while ((match = cssClassRegex.exec(css)) !== null) {
    cssClasses.add(match[1])
  }

  // Check for mismatches (only custom classes, not Tailwind utilities)
  const missingClasses = []

  for (const cls of tsxClasses) {
    // Skip Tailwind utility classes
    if (isTailwindUtility(cls)) continue

    // Skip arbitrary values like bg-[#fff]
    if (cls.includes('[')) continue

    // Check if custom class exists in CSS
    if (cls.startsWith('bg-') || cls.startsWith('text-') || cls.startsWith('border-') ||
        cls.startsWith('px-') || cls.startsWith('py-') || cls.startsWith('pt-') ||
        cls.startsWith('pb-') || cls.startsWith('pl-') || cls.startsWith('pr-') ||
        cls.startsWith('h-') || cls.startsWith('w-') || cls.startsWith('gap-') ||
        cls.startsWith('p-') || cls.startsWith('m-') || cls.startsWith('font-') ||
        cls.startsWith('line-') || cls.startsWith('letter-') || cls.startsWith('top-') ||
        cls.startsWith('left-') || cls.startsWith('right-') || cls.startsWith('bottom-')) {

      if (!cssClasses.has(cls)) {
        missingClasses.push(cls)
      }
    }
  }

  return {
    tsxClasses: tsxClasses.size,
    cssClasses: cssClasses.size,
    missingClasses
  }
}

/**
 * Round decimal values in CSS properties (not class names)
 * @param {string} css - CSS content
 * @returns {string} CSS with rounded values
 */
function roundDecimalValuesInProperties(css) {
  // Round pixel values in property declarations: height: 29.268px → height: 29px
  let optimized = css.replace(/:\s*(\d+\.\d+)(px|rem|em|%)/g, (match, value, unit) => {
    const rounded = Math.round(parseFloat(value))
    return `: ${rounded}${unit}`
  })

  // Clean up calc() expressions: calc(50% + 0.3px) → calc(50%)
  optimized = optimized.replace(/calc\(([^)]+)\s*[\+\-]\s*0(?:\.\d+)?px\)/g, 'calc($1)')

  return optimized
}

/**
 * Map color values to CSS variables (not class names)
 * @param {string} css - CSS content
 * @returns {string} CSS with var() references
 */
async function mapColorValuesToVars(css) {
  // Import variable extraction
  const { extractVariableMap } = await import('./css-optimizer.js')
  const variableMap = extractVariableMap(css)

  if (Object.keys(variableMap).length === 0) {
    return css
  }

  // Replace color values in properties (skip :root section)
  const lines = css.split('\n')
  let inRoot = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(':root')) {
      inRoot = true
    } else if (inRoot && lines[i].includes('}') && !lines[i].includes('{')) {
      inRoot = false
    } else if (!inRoot) {
      // Replace hex colors with var() references
      for (const [color, varName] of Object.entries(variableMap)) {
        const valueRegex = new RegExp(`:\\s*${color}\\b`, 'gi')
        lines[i] = lines[i].replace(valueRegex, `: var(--${varName})`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Find Tailwind equivalent for pixel value (with ±2px tolerance)
 * @param {string|number} px - Pixel value
 * @returns {string|null} Tailwind scale value or null
 */
function findTailwindEquivalent(px) {
  const pxNum = parseInt(px)

  // Tailwind spacing scale (in pixels, assuming 1rem = 16px)
  const spacingMap = {
    '0': 0, '1': 4, '2': 8, '3': 12, '4': 16, '5': 20, '6': 24,
    '7': 28, '8': 32, '9': 36, '10': 40, '11': 44, '12': 48,
    '14': 56, '16': 64, '20': 80, '24': 96, '28': 112, '32': 128,
    '36': 144, '40': 160, '44': 176, '48': 192, '52': 208, '56': 224,
    '60': 240, '64': 256, '72': 288, '80': 320, '96': 384
  }

  // Find exact match or ±2px approximation
  for (const [key, value] of Object.entries(spacingMap)) {
    if (Math.abs(value - pxNum) <= 2) {
      return key
    }
  }

  return null
}

/**
 * Check if class name is a Tailwind utility (not custom)
 * @param {string} className - Class name to check
 * @returns {boolean} True if Tailwind utility
 */
function isTailwindUtility(className) {
  const tailwindPrefixes = [
    'flex', 'grid', 'block', 'inline', 'hidden', 'absolute', 'relative',
    'fixed', 'sticky', 'static', 'items-', 'justify-', 'content-',
    'self-', 'overflow-', 'rounded-', 'border-w-', 'opacity-',
    'shadow-', 'z-', 'order-', 'col-', 'row-', 'basis-', 'grow', 'shrink',
    'translate-', 'rotate-', 'scale-', 'skew-', 'origin-',
    'cursor-', 'select-', 'resize-', 'list-', 'appearance-',
    'pointer-events-', 'user-select-', 'will-change-', 'filter',
    'backdrop-', 'transition-', 'duration-', 'ease-', 'delay-',
    'animate-', 'object-', 'mix-blend-', 'isolation-',
    'box-border', 'box-content', 'container', 'aspect-',
    'columns-', 'break-', 'decoration-', 'underline', 'overline',
    'line-through', 'no-underline', 'uppercase', 'lowercase', 'capitalize',
    'normal-case', 'truncate', 'whitespace-', 'break-words', 'break-all',
    'hyphens-', 'content-', 'sr-only', 'not-sr-only', 'forced-color-adjust-',
    'min-h-', 'max-h-', 'min-w-', 'max-w-', 'size-', 'inset-'
  ]

  return tailwindPrefixes.some(prefix => className.startsWith(prefix))
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const testDir = process.argv[2]

  if (!testDir) {
    console.error('Usage: node sync-optimizer.js <testDir>')
    process.exit(1)
  }

  syncOptimize(testDir)
    .then(() => {
      process.exit(0)
    })
    .catch(err => {
      console.error('❌ Error:', err.message)
      console.error(err.stack)
      process.exit(1)
    })
}
