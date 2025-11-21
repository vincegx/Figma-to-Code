/**
 * CSS Variables Transformations
 *
 * Converts Figma MCP CSS variables to clean CSS custom properties:
 * - var(--colors\/white,#ffffff) → var(--colors-white)
 * - var(--margin\/r,32px) → var(--margin-r)
 * - Handles multiple levels of escaping (\/, \\/, \\\/)
 * - Removes fallback values (they're in :root now)
 *
 * Combines logic from:
 * - post-processor-fix.js (lines 292-352)
 * - fix-css-vars-simple.js (complete file)
 */

import traverse from '@babel/traverse'
import * as t from '@babel/types'

export const meta = {
  name: 'css-vars',
  priority: 30 // After ast-cleaning and post-fixes
}

/**
 * Map to collect custom CSS classes that need to be generated
 * Format: { className: { property: 'padding', variable: '--margin-r', fallback: '32px' } }
 */
export const customCSSClasses = new Map()

/**
 * Map Tailwind prefixes to CSS properties
 */
const tailwindToCSSProperty = {
  'p': 'padding',
  'pt': 'padding-top',
  'pr': 'padding-right',
  'pb': 'padding-bottom',
  'pl': 'padding-left',
  'px': ['padding-left', 'padding-right'],
  'py': ['padding-top', 'padding-bottom'],
  'm': 'margin',
  'mt': 'margin-top',
  'mr': 'margin-right',
  'mb': 'margin-bottom',
  'ml': 'margin-left',
  'mx': ['margin-left', 'margin-right'],
  'my': ['margin-top', 'margin-bottom'],
  'gap': 'gap',
  'rounded': 'border-radius',
  'border': 'border-color',
  'bg': 'background-color',
  'text': 'color',
  'w': 'width',
  'h': 'height',
  'min-w': 'min-width',
  'max-w': 'max-width',
  'min-h': 'min-height',
  'max-h': 'max-height',
}

/**
 * Clean value for use in class name
 * #ffffff → ffffff, 32px → 32, etc.
 */
function cleanValue(value) {
  return value
    .replace(/^#/, '')           // #ffffff → ffffff
    .replace(/px$/, '')          // 32px → 32
    .replace(/[^a-z0-9]/gi, '')  // clean special chars
    .toLowerCase()
}

/**
 * Convert CSS variables in className attributes (AST-based)
 * This runs during the AST traversal phase
 *
 * NEW STRATEGY: Generate custom CSS classes with override detection
 * - If fallback === global: p-[var(--margin-r,32px)] → p-margin-r
 * - If fallback ≠ global (override): p-[var(--margin-r,48px)] → margin-r-48
 */
export function convertCSSVarsInClass(classString, globalVariables = {}) {
  let converted = classString

  // ═══════════════════════════════════════════════════════════
  // CUSTOM CSS CLASS GENERATOR: var(--any\/thing,fallback) → custom class
  // ═══════════════════════════════════════════════════════════

  // PATTERN 0: Fix invalid border-width patterns from Figma
  // border-[0px_0px_2px] → border-w-0-0-2 (custom class)
  // CSS generated: .border-w-0-0-2 { border-width: 0px 0px 2px; }
  converted = converted.replace(/border-\[([0-9px_]+)\]/g, (match, values) => {
    const parts = values.split('_')

    // Only process multi-value patterns (3 or 4 values)
    if (parts.length < 3) return match

    // Generate clean class name: border-w-0-0-2
    const cleanName = 'border-w-' + parts.join('-').replace(/px/g, '')

    // CSS value: 0px 0px 2px or 0px 0px 2px 0px
    const cssValue = parts.join(' ')

    // Store in Map for CSS generation
    customCSSClasses.set(cleanName, {
      property: 'border-width',
      value: cssValue
    })

    return cleanName
  })

  // PATTERN 1: Match special Tailwind arbitrary CSS syntax: text-[color:var(...)] or text-[length:var(...)]
  // These use CSS property:value syntax inside arbitrary values
  converted = converted.replace(/text-\[(color|length):var\(--([^,]+),([^\)]+)\)\]/g, (_match, cssType, varName, fallback) => {
    // Clean variable name
    const cleanVarName = varName
      .replace(/\\\\\\\\\//g, '-')
      .replace(/\\\\\//g, '-')
      .replace(/\\\//g, '-')
      .replace(/\//g, '-')
      .replace(/\\\(/g, '_')
      .replace(/\(/g, '_')
      .replace(/\\\)/g, '')
      .replace(/\)/g, '')
      .toLowerCase()
      .trim()

    const variable = `--${cleanVarName}`
    const fallbackValue = fallback.trim()
    const globalValue = globalVariables[variable]

    // Check if this is an override (fallback !== global)
    const isOverride = globalValue && fallbackValue !== globalValue

    // Get CSS property
    const cssProperty = cssType === 'color' ? 'color' : 'font-size'

    let customClassName
    if (isOverride) {
      // Generate variant class: textcolor-ffffff
      customClassName = `${cleanVarName}-${cleanValue(fallbackValue)}`

      // Store with override flag
      customCSSClasses.set(customClassName, {
        property: cssProperty,
        variable,
        value: fallbackValue,
        isOverride: true
      })
    } else {
      // Generate normal class: text-textcolor
      customClassName = cssType === 'color'
        ? `text-${cleanVarName}`
        : `text-size-${cleanVarName}`

      customCSSClasses.set(customClassName, {
        property: cssProperty,
        variable,
        fallback: fallbackValue
      })
    }

    return customClassName
  })

  // PATTERN 2: Match regular patterns like: p-[var(--margin-r,32px)] or border-[var(--colors-white,#fff)]
  converted = converted.replace(/([a-z-]+)-\[var\(--([^,]+),([^\)]+)\)\]/g, (match, prefix, varName, fallback) => {
    // Clean variable name: margin\/r → margin-r
    const cleanVarName = varName
      .replace(/\\\\\\\\\//g, '-')
      .replace(/\\\\\//g, '-')
      .replace(/\\\//g, '-')
      .replace(/\//g, '-')
      .replace(/\\\(/g, '_')
      .replace(/\(/g, '_')
      .replace(/\\\)/g, '')
      .replace(/\)/g, '')
      .toLowerCase()
      .trim()

    const variable = `--${cleanVarName}`
    const fallbackValue = fallback.trim()
    const globalValue = globalVariables[variable]

    // Check if this is an override (fallback !== global)
    const isOverride = globalValue && fallbackValue !== globalValue

    // Get CSS property from Tailwind prefix
    const cssProperty = tailwindToCSSProperty[prefix]

    if (!cssProperty) {
      // Unknown prefix - fallback to extracting the value (silently)
      return `${prefix}-[${fallbackValue}]`
    }

    let customClassName
    if (isOverride) {
      // Generate variant class: margin-r-48
      customClassName = `${cleanVarName}-${cleanValue(fallbackValue)}`

      // Store with override flag
      customCSSClasses.set(customClassName, {
        property: cssProperty,
        variable,
        value: fallbackValue,
        isOverride: true
      })
    } else {
      // Generate normal class: p-margin-r
      customClassName = `${prefix}-${cleanVarName}`

      customCSSClasses.set(customClassName, {
        property: cssProperty,
        variable,
        fallback: fallbackValue
      })
    }

    return customClassName
  })

  return converted
}

/**
 * Convert rgba() color to hex format
 * rgba(63, 63, 63, 1) → #3f3f3f
 */
function rgbaToHex(rgba) {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!match) return null
  const [, r, g, b] = match
  return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Main execution function for CSS variables
 */
export function execute(ast, context) {
  let varsConverted = 0
  let inlineStylesConverted = 0

  // Clear Maps to avoid memory leaks between runs
  customCSSClasses.clear()

  // Get global CSS variables from context
  const globalVariables = context.cssVariables || {}

  traverse.default(ast, {
    JSXElement(path) {
      const attributes = path.node.openingElement.attributes

      // ═════════════════════════════════════════════════════════
      // 1. Handle className attribute (existing logic)
      // ═════════════════════════════════════════════════════════
      const classNameAttr = attributes.find(
        attr => attr.name && attr.name.name === 'className'
      )

      if (classNameAttr && t.isStringLiteral(classNameAttr.value)) {
        const original = classNameAttr.value.value

        // Convert CSS vars to classes (with override detection)
        const converted = convertCSSVarsInClass(original, globalVariables)

        if (converted !== original) {
          classNameAttr.value = t.stringLiteral(converted)
          varsConverted++
        }
      }

      // ═════════════════════════════════════════════════════════
      // 2. Handle inline style attribute (NEW)
      // ═════════════════════════════════════════════════════════
      const styleAttr = attributes.find(
        attr => attr.name && attr.name.name === 'style'
      )

      if (styleAttr && t.isJSXExpressionContainer(styleAttr.value)) {
        let expression = styleAttr.value.expression

        // Handle TypeScript type assertions: { } as React.CSSProperties
        // TSAsExpression wraps the ObjectExpression
        if (t.isTSAsExpression(expression)) {
          expression = expression.expression
        }

        if (t.isObjectExpression(expression)) {
          expression.properties.forEach(prop => {
            if (t.isObjectProperty(prop) && t.isStringLiteral(prop.key)) {
              const key = prop.key.value

              // Check for CSS custom properties like --fill-0, --stroke-0
              if (key.startsWith('--') && t.isStringLiteral(prop.value)) {
                const value = prop.value.value

                // Convert rgba() to hex if needed
                const hex = rgbaToHex(value)
                if (hex) {
                  // Check if this color matches a global variable
                  for (const [varName, varValue] of Object.entries(globalVariables)) {
                    if (varValue === hex) {
                      // Replace hardcoded color with CSS variable reference
                      // "--fill-0": "rgba(63, 63, 63, 1)" → "--fill-0": "var(--textcolor)"
                      prop.value = t.stringLiteral(`var(${varName})`)
                      inlineStylesConverted++
                      break
                    }
                  }
                }
              }
            }
          })
        }
      }
    }
  })

  // Merge customCSSClasses into context (don't overwrite existing classes!)
  if (!context.customCSSClasses) {
    context.customCSSClasses = new Map()
  }

  // Copy all classes from local Map to context Map
  for (const [className, classData] of customCSSClasses) {
    context.customCSSClasses.set(className, classData)
  }

  return {
    varsConverted,
    customClassesGenerated: customCSSClasses.size,
    inlineStylesConverted
  }
}

/**
 * SAFETY NET: Catch-all regex for CSS vars that escaped AST processing
 *
 * This function handles className patterns with var() that weren't caught during AST traversal.
 * Now generates custom CSS classes with override detection.
 *
 * @param {string} code - Generated code after AST processing
 * @param {object} globalVariables - Global CSS variables for override detection
 * @returns {object} - { code: string, varsFound: number, varsFixed: number }
 */
export function applySafetyNetRegex(code, globalVariables = {}) {
  // Count className patterns with var() (in arbitrary values like p-[var(...)])
  const varsBefore = (code.match(/className="[^"]*\[[^\]]*var\(--[^\)]+\)[^\]]*\]/g) || []).length

  // PATTERN 1: Match text-[color:var(...)] or text-[length:var(...)] patterns
  let fixed = code.replace(
    /(className="[^"]*)text-\[(color|length):var\(--([^,]+),([^\)]+)\)\]([^"]*")/g,
    (_match, beforeClass, cssType, varName, fallback, afterClass) => {
      // Clean variable name
      const cleanVarName = varName
        .replace(/\\\\\\\\\//g, '-')
        .replace(/\\\\\//g, '-')
        .replace(/\\\//g, '-')
        .replace(/\//g, '-')
        .replace(/\\\(/g, '_')
        .replace(/\(/g, '_')
        .replace(/\\\)/g, '')
        .replace(/\)/g, '')
        .toLowerCase()
        .trim()

      const variable = `--${cleanVarName}`
      const fallbackValue = fallback.trim()
      const globalValue = globalVariables[variable]

      // Check if this is an override (fallback !== global)
      const isOverride = globalValue && fallbackValue !== globalValue

      // Get CSS property
      const cssProperty = cssType === 'color' ? 'color' : 'font-size'

      let customClassName
      if (isOverride) {
        // Generate variant class: textcolor-ffffff
        customClassName = `${cleanVarName}-${cleanValue(fallbackValue)}`

        customCSSClasses.set(customClassName, {
          property: cssProperty,
          variable,
          value: fallbackValue,
          isOverride: true
        })
      } else {
        // Generate normal class: text-textcolor
        customClassName = cssType === 'color'
          ? `text-${cleanVarName}`
          : `text-size-${cleanVarName}`

        customCSSClasses.set(customClassName, {
          property: cssProperty,
          variable,
          fallback: fallbackValue
        })
      }

      return `${beforeClass}${customClassName}${afterClass}`
    }
  )

  // PATTERN 2: Match regular patterns like p-[var(...)] or border-[var(...)]
  fixed = fixed.replace(
    /(className="[^"]*)([a-z-]+)-\[var\(--([^,]+),([^\)]+)\)\]([^"]*")/g,
    (_match, beforeClass, prefix, varName, fallback, afterClass) => {
      // Clean variable name
      const cleanVarName = varName
        .replace(/\\\\\\\\\//g, '-')
        .replace(/\\\\\//g, '-')
        .replace(/\\\//g, '-')
        .replace(/\//g, '-')
        .replace(/\\\(/g, '_')
        .replace(/\(/g, '_')
        .replace(/\\\)/g, '')
        .replace(/\)/g, '')
        .toLowerCase()
        .trim()

      const variable = `--${cleanVarName}`
      const fallbackValue = fallback.trim()
      const globalValue = globalVariables[variable]

      // Check if this is an override (fallback !== global)
      const isOverride = globalValue && fallbackValue !== globalValue

      // Get CSS property
      const cssProperty = tailwindToCSSProperty[prefix]

      if (!cssProperty) {
        // Unknown prefix - extract fallback
        return `${beforeClass}${prefix}-[${fallbackValue}]${afterClass}`
      }

      let customClassName
      if (isOverride) {
        // Generate variant class: margin-r-48
        customClassName = `${cleanVarName}-${cleanValue(fallbackValue)}`

        customCSSClasses.set(customClassName, {
          property: cssProperty,
          variable,
          value: fallbackValue,
          isOverride: true
        })
      } else {
        // Generate normal class: p-margin-r
        customClassName = `${prefix}-${cleanVarName}`

        customCSSClasses.set(customClassName, {
          property: cssProperty,
          variable,
          fallback: fallbackValue
        })
      }

      return `${beforeClass}${customClassName}${afterClass}`
    }
  )

  const varsAfter = (fixed.match(/className="[^"]*\[[^\]]*var\(--[^\)]+\)[^\]]*\]/g) || []).length
  const varsCaught = varsBefore - varsAfter

  return {
    code: fixed,
    varsFound: varsBefore,
    varsFixed: varsCaught
  }
}
