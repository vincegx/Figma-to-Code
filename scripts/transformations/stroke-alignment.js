/**
 * Stroke Alignment Transform
 *
 * Handles Figma stroke alignment (INSIDE, OUTSIDE, CENTER)
 * CSS borders are always CENTER aligned, so we need workarounds
 *
 * Solutions:
 * - CENTER: Use standard border (default CSS behavior)
 * - INSIDE: Use inset box-shadow
 * - OUTSIDE: Use outline or box-shadow
 */

import traverse from '@babel/traverse'
import * as t from '@babel/types'

export const meta = {
  name: 'stroke-alignment',
  priority: 29 // After position-fixes, before tailwind-optimizer
}

/**
 * Parse border string to extract width and color
 * Example: "border-2" or "border-[#000000]" or "border-2 border-[#000000]"
 */
function parseBorderClasses(classes) {
  const borderInfo = {
    width: 1,
    color: null,
    hasBorder: false
  }

  // Check for border width
  const widthMatch = classes.find(c => c.match(/^border(-\d+)?$/))
  if (widthMatch) {
    borderInfo.hasBorder = true
    if (widthMatch === 'border') {
      borderInfo.width = 1
    } else {
      borderInfo.width = parseInt(widthMatch.split('-')[1])
    }
  }

  // Check for arbitrary border width
  const arbitraryWidthMatch = classes.find(c => c.match(/^border-\[(\d+)px\]$/))
  if (arbitraryWidthMatch) {
    borderInfo.hasBorder = true
    const match = arbitraryWidthMatch.match(/border-\[(\d+)px\]/)
    borderInfo.width = parseInt(match[1])
  }

  // Check for border color
  const colorMatch = classes.find(c => c.startsWith('border-[#') || c.match(/^border-(black|white|gray|red|blue|green)/))
  if (colorMatch) {
    if (colorMatch.startsWith('border-[#')) {
      borderInfo.color = colorMatch.match(/border-\[(#[0-9a-fA-F]+)\]/)?.[1]
    } else {
      // Map Tailwind color classes to hex (simplified)
      const colorMap = {
        'border-black': '#000000',
        'border-white': '#ffffff',
        'border-gray-500': '#6b7280',
        'border-red-500': '#ef4444',
        'border-blue-500': '#3b82f6',
        'border-green-500': '#10b981'
      }
      borderInfo.color = colorMap[colorMatch] || '#000000'
    }
  }

  return borderInfo
}

/**
 * Extract stroke alignment from data attributes
 */
function getStrokeAlignment(path) {
  const attributes = path.node.openingElement.attributes

  // Check for data-stroke-align attribute
  const strokeAlignAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-stroke-align'
  )

  if (strokeAlignAttr && t.isStringLiteral(strokeAlignAttr.value)) {
    return strokeAlignAttr.value.value // INSIDE, OUTSIDE, or CENTER
  }

  // Check data-name for hints
  const dataNameAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-name'
  )

  if (dataNameAttr && t.isStringLiteral(dataNameAttr.value)) {
    const dataName = dataNameAttr.value.value
    if (dataName.includes('stroke_inside') || dataName.includes('border_inside')) {
      return 'INSIDE'
    }
    if (dataName.includes('stroke_outside') || dataName.includes('border_outside')) {
      return 'OUTSIDE'
    }
  }

  return null
}

/**
 * Convert border to box-shadow for INSIDE stroke
 */
function convertToInsideStroke(classes, borderInfo) {
  // Remove border classes
  const filteredClasses = classes.filter(c =>
    !c.startsWith('border') &&
    !c.match(/^ring/)
  )

  // Add shadow-inner with custom value
  const color = borderInfo.color || '#000000'
  const width = borderInfo.width

  // Create custom class for the shadow
  // We'll store this in context for CSS generation
  const customClass = `stroke-inside-${width}`

  filteredClasses.push(customClass)

  return {
    classes: filteredClasses,
    customCSS: {
      className: customClass,
      styles: {
        boxShadow: `inset 0 0 0 ${width}px ${color}`
      }
    }
  }
}

/**
 * Convert border to outline for OUTSIDE stroke
 */
function convertToOutsideStroke(classes, borderInfo) {
  // Remove border classes
  const filteredClasses = classes.filter(c =>
    !c.startsWith('border')
  )

  // Add outline classes
  const color = borderInfo.color || '#000000'
  const width = borderInfo.width

  // Tailwind has outline classes, but they're limited
  // For custom widths/colors, we need custom CSS
  if (width === 1 && !borderInfo.color) {
    filteredClasses.push('outline', 'outline-1')
  } else if (width === 2 && !borderInfo.color) {
    filteredClasses.push('outline', 'outline-2')
  } else {
    // Custom class for specific width/color
    const customClass = `stroke-outside-${width}`
    filteredClasses.push(customClass)

    return {
      classes: filteredClasses,
      customCSS: {
        className: customClass,
        styles: {
          outline: `${width}px solid ${color}`,
          outlineOffset: '0px'
        }
      }
    }
  }

  return {
    classes: filteredClasses,
    customCSS: null
  }
}

/**
 * Fix stroke alignment
 */
function fixStrokeAlignment(path, context, stats) {
  const attributes = path.node.openingElement.attributes
  const classNameAttr = attributes.find(
    attr => attr.name && attr.name.name === 'className'
  )

  if (!classNameAttr || !t.isStringLiteral(classNameAttr.value)) {
    return false
  }

  const className = classNameAttr.value.value
  const classes = className.split(/\s+/)

  // Parse border information
  const borderInfo = parseBorderClasses(classes)

  if (!borderInfo.hasBorder) {
    return false
  }

  // Get stroke alignment
  const alignment = getStrokeAlignment(path)

  if (!alignment || alignment === 'CENTER') {
    // CENTER is default CSS behavior, no change needed
    return false
  }

  let result
  let modified = false

  if (alignment === 'INSIDE') {
    result = convertToInsideStroke(classes, borderInfo)
    stats.insideStrokes++
    modified = true
  } else if (alignment === 'OUTSIDE') {
    result = convertToOutsideStroke(classes, borderInfo)
    stats.outsideStrokes++
    modified = true
  }

  if (modified) {
    // Update className
    classNameAttr.value = t.stringLiteral(result.classes.join(' '))

    // Store custom CSS if needed
    if (result.customCSS && context.customCSSClasses) {
      if (!context.customCSSClasses.has(result.customCSS.className)) {
        context.customCSSClasses.set(result.customCSS.className, result.customCSS.styles)
      }
    }

    return true
  }

  return false
}

/**
 * Fix ring utilities (Tailwind's focus rings)
 * Sometimes exported incorrectly with stroke alignment
 */
function fixRingUtilities(path, stats) {
  const attributes = path.node.openingElement.attributes
  const classNameAttr = attributes.find(
    attr => attr.name && attr.name.name === 'className'
  )

  if (!classNameAttr || !t.isStringLiteral(classNameAttr.value)) {
    return false
  }

  let className = classNameAttr.value.value
  let modified = false

  // Fix ring-offset when used with borders
  if (className.includes('ring-offset') && className.includes('border')) {
    // Ring offset should be used for OUTSIDE strokes
    const alignment = getStrokeAlignment(path)
    if (alignment === 'INSIDE') {
      // Remove ring-offset for INSIDE strokes
      className = className.replace(/ring-offset-\d+/g, '').trim()
      modified = true
      stats.ringFixed++
    }
  }

  // Fix ring-inset usage
  if (className.includes('ring-inset')) {
    // ring-inset is for INSIDE strokes
    const alignment = getStrokeAlignment(path)
    if (alignment === 'OUTSIDE') {
      // Remove ring-inset for OUTSIDE strokes
      className = className.replace('ring-inset', '').trim()
      modified = true
      stats.ringFixed++
    }
  }

  if (modified) {
    classNameAttr.value = t.stringLiteral(className)
    return true
  }

  return false
}

/**
 * Main execution function
 */
export function execute(ast, context) {
  const stats = {
    insideStrokes: 0,
    outsideStrokes: 0,
    ringFixed: 0
  }

  // Initialize customCSSClasses if not present
  if (!context.customCSSClasses) {
    context.customCSSClasses = new Map()
  }

  traverse.default(ast, {
    JSXElement(path) {
      // Fix stroke alignment
      if (fixStrokeAlignment(path, context, stats)) {
        // Successfully fixed
      }

      // Fix ring utilities
      fixRingUtilities(path, stats)
    }
  })

  return stats
}