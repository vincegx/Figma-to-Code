/**
 * Auto Layout Transform
 *
 * Ensures complete and accurate mapping of Figma Auto Layout to CSS Flexbox
 * Handles properties that are sometimes missing or incorrectly mapped
 *
 * Based on known issues:
 * - itemSpacing not always converted to gap
 * - primaryAxisAlignItems/counterAxisAlignItems missing
 * - layoutWrap not applied
 */

import traverse from '@babel/traverse'
import * as t from '@babel/types'

export const meta = {
  name: 'auto-layout',
  priority: 5 // Early, after font-detection but before ast-cleaning
}

/**
 * Map Figma primary axis alignment to CSS justify-content
 */
const JUSTIFY_MAP = {
  'MIN': 'flex-start',
  'CENTER': 'center',
  'MAX': 'flex-end',
  'SPACE_BETWEEN': 'space-between',
  'SPACE_AROUND': 'space-around',
  'SPACE_EVENLY': 'space-evenly'
}

/**
 * Map Figma counter axis alignment to CSS align-items
 */
const ALIGN_MAP = {
  'MIN': 'flex-start',
  'CENTER': 'center',
  'MAX': 'flex-end',
  'BASELINE': 'baseline',
  'STRETCH': 'stretch'
}

/**
 * Check if element has Auto Layout indicators
 */
function hasAutoLayoutIndicators(className) {
  return className.includes('flex') ||
         className.includes('flex-col') ||
         className.includes('flex-row')
}

/**
 * Extract itemSpacing from data attributes or comments
 */
function extractItemSpacing(path) {
  const attributes = path.node.openingElement.attributes

  // Check for data-item-spacing attribute
  const itemSpacingAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-item-spacing'
  )

  if (itemSpacingAttr && t.isStringLiteral(itemSpacingAttr.value)) {
    return parseFloat(itemSpacingAttr.value.value)
  }

  // Check for data-gap attribute
  const gapAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-gap'
  )

  if (gapAttr && t.isStringLiteral(gapAttr.value)) {
    return parseFloat(gapAttr.value.value)
  }

  return null
}

/**
 * Convert itemSpacing to appropriate gap class
 */
function getGapClass(spacing) {
  const spacingMap = {
    0: 'gap-0',
    4: 'gap-1',
    8: 'gap-2',
    12: 'gap-3',
    16: 'gap-4',
    20: 'gap-5',
    24: 'gap-6',
    28: 'gap-7',
    32: 'gap-8',
    36: 'gap-9',
    40: 'gap-10',
    48: 'gap-12',
    56: 'gap-14',
    64: 'gap-16',
    72: 'gap-[72px]',
    80: 'gap-20',
    96: 'gap-24'
  }

  return spacingMap[spacing] || `gap-[${spacing}px]`
}

/**
 * Extract alignment from data attributes
 */
function extractAlignments(path) {
  const attributes = path.node.openingElement.attributes
  const alignments = {}

  // Check for data-primary-axis-align
  const primaryAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-primary-axis-align'
  )
  if (primaryAttr && t.isStringLiteral(primaryAttr.value)) {
    alignments.primaryAxis = primaryAttr.value.value
  }

  // Check for data-counter-axis-align
  const counterAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-counter-axis-align'
  )
  if (counterAttr && t.isStringLiteral(counterAttr.value)) {
    alignments.counterAxis = counterAttr.value.value
  }

  // Check for data-layout-wrap
  const wrapAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-layout-wrap'
  )
  if (wrapAttr && t.isStringLiteral(wrapAttr.value)) {
    alignments.wrap = wrapAttr.value.value === 'WRAP'
  }

  return alignments
}

/**
 * Add missing Auto Layout properties to flex containers
 */
export function fixAutoLayout(path, stats) {
  const attributes = path.node.openingElement.attributes
  const classNameAttr = attributes.find(
    attr => attr.name && attr.name.name === 'className'
  )

  if (!classNameAttr || !t.isStringLiteral(classNameAttr.value)) {
    return false
  }

  let className = classNameAttr.value.value
  const classes = className.split(/\s+/)
  let modified = false

  // Only process elements with flex display
  if (!hasAutoLayoutIndicators(className)) {
    return false
  }

  // 1. Add missing gap (itemSpacing)
  if (!classes.some(c => c.startsWith('gap-'))) {
    const itemSpacing = extractItemSpacing(path)
    if (itemSpacing !== null) {
      const gapClass = getGapClass(itemSpacing)
      className += ` ${gapClass}`
      modified = true
      stats.gapAdded++
    }
  }

  // 2. Add missing alignments
  const alignments = extractAlignments(path)

  // Primary axis (justify-content)
  if (alignments.primaryAxis && !classes.some(c => c.startsWith('justify-'))) {
    const justifyClass = getJustifyClass(alignments.primaryAxis)
    if (justifyClass) {
      className += ` ${justifyClass}`
      modified = true
      stats.justifyAdded++
    }
  }

  // Counter axis (align-items)
  if (alignments.counterAxis && !classes.some(c => c.startsWith('items-'))) {
    const alignClass = getAlignClass(alignments.counterAxis)
    if (alignClass) {
      className += ` ${alignClass}`
      modified = true
      stats.alignAdded++
    }
  }

  // Wrap
  if (alignments.wrap && !classes.some(c => c === 'flex-wrap')) {
    className += ' flex-wrap'
    modified = true
    stats.wrapAdded++
  }

  // 3. Fix FILL/HUG/FIXED sizing
  fixSizing(path, classes, className, stats)

  if (modified) {
    classNameAttr.value = t.stringLiteral(className.trim())
    return true
  }

  return false
}

/**
 * Get Tailwind justify class from Figma alignment
 */
function getJustifyClass(alignment) {
  const map = {
    'MIN': 'justify-start',
    'CENTER': 'justify-center',
    'MAX': 'justify-end',
    'SPACE_BETWEEN': 'justify-between',
    'SPACE_AROUND': 'justify-around',
    'SPACE_EVENLY': 'justify-evenly'
  }
  return map[alignment]
}

/**
 * Get Tailwind align class from Figma alignment
 */
function getAlignClass(alignment) {
  const map = {
    'MIN': 'items-start',
    'CENTER': 'items-center',
    'MAX': 'items-end',
    'BASELINE': 'items-baseline',
    'STRETCH': 'items-stretch'
  }
  return map[alignment]
}

/**
 * Fix FILL/HUG/FIXED sizing
 */
function fixSizing(path, classes, className, stats) {
  const attributes = path.node.openingElement.attributes

  // Check for data-sizing-horizontal
  const hSizeAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-sizing-horizontal'
  )

  if (hSizeAttr && t.isStringLiteral(hSizeAttr.value)) {
    const sizing = hSizeAttr.value.value

    if (sizing === 'FILL' && !classes.some(c => c === 'flex-1' || c === 'w-full')) {
      // In flex context, use flex-1; otherwise use w-full
      const parentIsFlex = checkParentIsFlex(path)
      className += parentIsFlex ? ' flex-1' : ' w-full'
      stats.sizingFixed++
    } else if (sizing === 'HUG' && !classes.some(c => c === 'w-auto' || c === 'w-fit')) {
      className += ' w-fit'
      stats.sizingFixed++
    }
  }

  // Check for data-sizing-vertical
  const vSizeAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-sizing-vertical'
  )

  if (vSizeAttr && t.isStringLiteral(vSizeAttr.value)) {
    const sizing = vSizeAttr.value.value

    if (sizing === 'FILL' && !classes.some(c => c === 'h-full')) {
      className += ' h-full'
      stats.sizingFixed++
    } else if (sizing === 'HUG' && !classes.some(c => c === 'h-auto' || c === 'h-fit')) {
      className += ' h-fit'
      stats.sizingFixed++
    }
  }
}

/**
 * Check if parent is a flex container
 */
function checkParentIsFlex(path) {
  const parent = path.parent
  if (!parent || !t.isJSXElement(parent)) {
    return false
  }

  const parentClassAttr = parent.openingElement.attributes.find(
    attr => attr.name && attr.name.name === 'className'
  )

  if (parentClassAttr && t.isStringLiteral(parentClassAttr.value)) {
    return hasAutoLayoutIndicators(parentClassAttr.value.value)
  }

  return false
}

/**
 * Main execution function
 */
export function execute(ast, context) {
  const stats = {
    elementsFixed: 0,
    gapAdded: 0,
    justifyAdded: 0,
    alignAdded: 0,
    wrapAdded: 0,
    sizingFixed: 0
  }

  traverse.default(ast, {
    JSXElement(path) {
      if (fixAutoLayout(path, stats)) {
        stats.elementsFixed++
      }
    }
  })

  return stats
}