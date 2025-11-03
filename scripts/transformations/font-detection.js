/**
 * Font Detection Transform
 *
 * Converts Figma font syntax to inline styles:
 * font-['Poppins:Bold'] → style={{ fontFamily: 'Poppins', fontWeight: 700 }}
 *
 * Enhanced features:
 * - Parses fontPostScriptName for accurate weight detection
 * - Supports textStyleId for design system styles
 * - Handles font weight instability issues
 */

import traverse from '@babel/traverse'
import * as t from '@babel/types'

export const meta = {
  name: 'font-detection',
  priority: 0 // MUST RUN FIRST (before ast-cleaning removes font-[...] classes)
}

const WEIGHT_MAP = {
  'Thin': 100,
  'Hairline': 100,
  'ExtraLight': 200,
  'UltraLight': 200,
  'Light': 300,
  'Regular': 400,
  'Normal': 400,
  'Medium': 500,
  'SemiBold': 600,
  'DemiBold': 600,
  'Bold': 700,
  'ExtraBold': 800,
  'UltraBold': 800,
  'Black': 900,
  'Heavy': 900
}

/**
 * Parse font weight from PostScript name
 * More reliable than fontWeight property
 *
 * @param {string} postScriptName - e.g., "Inter-SemiBold", "Roboto-Light"
 * @returns {number|null} - Font weight value or null
 */
function parseFontWeightFromPostScript(postScriptName) {
  if (!postScriptName) return null

  // Remove font family prefix and get weight part
  const parts = postScriptName.split('-')
  if (parts.length < 2) return 400 // Default to Regular

  const weightPart = parts[parts.length - 1]

  // Check for weight keywords
  for (const [key, value] of Object.entries(WEIGHT_MAP)) {
    if (weightPart.includes(key)) {
      return value
    }
  }

  // Check for numeric weight
  const numericWeight = parseInt(weightPart)
  if (!isNaN(numericWeight) && numericWeight >= 100 && numericWeight <= 900) {
    return numericWeight
  }

  return 400 // Default to Regular
}

/**
 * Get correct font weight using multiple strategies
 *
 * @param {object} node - JSX node
 * @param {object} context - Transform context
 * @returns {number} - Font weight value
 */
function getCorrectFontWeight(node, context) {
  const attributes = node.openingElement.attributes

  // Strategy 1: Check for data-font-post-script-name
  const postScriptAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-font-post-script-name'
  )

  if (postScriptAttr && t.isStringLiteral(postScriptAttr.value)) {
    const weight = parseFontWeightFromPostScript(postScriptAttr.value.value)
    if (weight) return weight
  }

  // Strategy 2: Check for data-text-style-id and lookup in context
  const textStyleIdAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-text-style-id'
  )

  if (textStyleIdAttr && t.isStringLiteral(textStyleIdAttr.value) && context.textStyles) {
    const styleId = textStyleIdAttr.value.value
    const style = context.textStyles[styleId]
    if (style && style.fontWeight) {
      return style.fontWeight
    }
  }

  // Strategy 3: Check for data-font-weight (might be unreliable)
  const fontWeightAttr = attributes.find(
    attr => attr.name && attr.name.name === 'data-font-weight'
  )

  if (fontWeightAttr && t.isStringLiteral(fontWeightAttr.value)) {
    const weight = parseInt(fontWeightAttr.value.value)
    if (!isNaN(weight) && weight >= 100 && weight <= 900) {
      // Validate against PostScript name if available
      if (postScriptAttr) {
        console.warn(`⚠️  Font weight mismatch: data-font-weight=${weight} but PostScript suggests different`)
      }
      return weight
    }
  }

  return 400 // Default to Regular
}

export function execute(ast, context) {
  const { primaryFont } = context

  if (!primaryFont) return { fontsConverted: 0, enhancedWeights: 0 }

  let fontsConverted = 0
  let enhancedWeights = 0

  traverse.default(ast, {
    JSXElement(path) {
      const attributes = path.node.openingElement.attributes
      const classNameAttr = attributes.find(attr => attr.name && attr.name.name === 'className')

      if (!classNameAttr || !t.isStringLiteral(classNameAttr.value)) return

      const fontMatch = classNameAttr.value.value.match(/font-\['([^']+)',sans-serif\]/)
      if (!fontMatch) return

      const [fontFamily, fontStyle] = fontMatch[1].split(':')

      // First try enhanced weight detection
      let fontWeight = getCorrectFontWeight(path.node, context)

      // Fallback to style-based weight if no data attributes found
      if (fontWeight === 400 && fontStyle) {
        fontWeight = WEIGHT_MAP[fontStyle] || 400
      } else {
        enhancedWeights++ // Track when we used enhanced detection
      }

      const styleAttr = attributes.find(attr => attr.name && attr.name.name === 'style')

      if (styleAttr && t.isJSXExpressionContainer(styleAttr.value)) {
        const expression = styleAttr.value.expression
        if (t.isObjectExpression(expression)) {
          const hasFontFamily = expression.properties.some(
            prop => t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'fontFamily'
          )
          if (!hasFontFamily) {
            expression.properties.unshift(
              t.objectProperty(t.identifier('fontWeight'), t.numericLiteral(fontWeight)),
              t.objectProperty(t.identifier('fontFamily'), t.stringLiteral(`${fontFamily}, sans-serif`))
            )
          }
        }
      } else {
        const styleObj = t.objectExpression([
          t.objectProperty(t.identifier('fontFamily'), t.stringLiteral(`${fontFamily}, sans-serif`)),
          t.objectProperty(t.identifier('fontWeight'), t.numericLiteral(fontWeight))
        ])
        path.node.openingElement.attributes.push(
          t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(styleObj))
        )
      }

      fontsConverted++
    }
  })

  return { fontsConverted, enhancedWeights }
}
