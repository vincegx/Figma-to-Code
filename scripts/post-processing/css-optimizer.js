/**
 * CSS Optimizer - Production-ready CSS transformations
 *
 * Optimizations:
 * 1. Round decimal values (102.029px → 102px)
 * 2. Map colors to CSS variables (bg-custom-9dffb9 → bg-brand, only if variable exists)
 * 3. Convert to Tailwind standard classes (gap-custom-56 → gap-14, with approximations)
 * 4. Extract used classes from TSX
 * 5. Filter CSS by used classes
 */

/**
 * Round decimal values in CSS
 * @param {string} css - CSS content
 * @returns {string} CSS with rounded values
 */
export function roundDecimalValues(css) {
  // Round pixel values: 102.029px → 102px
  css = css.replace(/(\d+\.\d+)(px|rem|em|%)/g, (match, value, unit) => {
    const rounded = Math.round(parseFloat(value))
    return `${rounded}${unit}`
  })

  // Round class names with "dot": h-custom-29dot268 → h-custom-29
  css = css.replace(/(-custom-\d+)dot\d+/g, '$1')

  // Clean up calc() expressions: calc(50% + 0.3px) → calc(50%)
  css = css.replace(/calc\(([^)]+)\s*[\+\-]\s*0(?:\.\d+)?px\)/g, 'calc($1)')

  return css
}

/**
 * Extract variable mapping from :root section
 * @param {string} css - CSS content
 * @returns {object} Map of hex colors (uppercase) to variable names
 */
function extractVariableMap(css) {
  const variableMap = {}
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/s)

  if (!rootMatch) return variableMap

  const rootContent = rootMatch[1]

  // Match: --brand: #9DFFB9; or --black-700: #282828;
  const varRegex = /--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi
  let match

  while ((match = varRegex.exec(rootContent)) !== null) {
    const varName = match[1]
    const color = match[2].toUpperCase()
    variableMap[color] = varName
  }

  return variableMap
}

/**
 * Convert hex color to class name suffix
 * @param {string} hex - Hex color (e.g., "#9DFFB9")
 * @returns {string} Class name suffix (e.g., "9dffb9")
 */
function hexToClassName(hex) {
  return hex.replace('#', '').toLowerCase()
}

/**
 * Map colors to CSS variables based on :root definitions
 * Only maps colors that have a variable in :root (no auto-creation)
 * @param {string} css - CSS content
 * @returns {string} CSS with variable mappings
 */
export function mapColorsToVariables(css) {
  // Auto-detect variables from :root section
  const variableMap = extractVariableMap(css)

  if (Object.keys(variableMap).length === 0) {
    return css // No variables to map
  }

  // Replace color values in custom classes with var() references
  // Example: .bg-custom-9dffb9 { background-color: #9dffb9; }
  //       → .bg-brand { background-color: var(--brand); }

  for (const [color, varName] of Object.entries(variableMap)) {
    const hexPattern = hexToClassName(color)

    // Replace class names: .bg-custom-9dffb9 → .bg-brand
    const classRegex = new RegExp(`\\.(bg|text|border)-custom-${hexPattern}\\b`, 'gi')
    css = css.replace(classRegex, `.$1-${varName}`)

    // Replace color values in properties: #9DFFB9 → var(--brand)
    // Case-insensitive to handle both #9DFFB9 and #9dffb9
    // BUT: Skip replacement inside :root section (to avoid --brand: var(--brand))
    const lines = css.split('\n')
    let inRoot = false
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(':root')) {
        inRoot = true
      } else if (inRoot && lines[i].includes('}') && !lines[i].includes('{')) {
        inRoot = false
      } else if (!inRoot) {
        // Only replace outside :root
        const valueRegex = new RegExp(`:\\s*${color}\\b`, 'gi')
        lines[i] = lines[i].replace(valueRegex, `: var(--${varName})`)
      }
    }
    css = lines.join('\n')
  }

  return css
}

/**
 * Convert custom spacing to Tailwind standard classes
 * @param {string} css - CSS content
 * @returns {string} CSS with Tailwind standard classes
 */
export function convertToTailwindStandard(css) {
  // Tailwind spacing scale: https://tailwindcss.com/docs/customizing-spacing
  // key = Tailwind class number, value = rem value
  const spacingMap = {
    '0': 0, '0.5': 0.125, '1': 0.25, '1.5': 0.375, '2': 0.5, '2.5': 0.625,
    '3': 0.75, '3.5': 0.875, '4': 1, '5': 1.25, '6': 1.5, '7': 1.75,
    '8': 2, '9': 2.25, '10': 2.5, '11': 2.75, '12': 3, '14': 3.5,
    '16': 4, '20': 5, '24': 6, '28': 7, '32': 8, '36': 9, '40': 10,
    '44': 11, '48': 12, '52': 13, '56': 14, '60': 15, '64': 16,
    '72': 18, '80': 20, '96': 24
  }

  // Create reverse map: px → Tailwind key (with approximation tolerance)
  const pxToTailwind = {}
  for (const [key, remValue] of Object.entries(spacingMap)) {
    const px = Math.round(remValue * 16) // Convert rem to px (1rem = 16px)
    pxToTailwind[px] = key
  }

  // Helper function to find Tailwind equivalent (exact or ±2px approximation)
  function findTailwindEquivalent(px) {
    px = parseInt(px, 10)

    // Try exact match
    if (pxToTailwind[px]) {
      return pxToTailwind[px]
    }

    // Try approximation ±2px
    for (let offset = 1; offset <= 2; offset++) {
      if (pxToTailwind[px - offset]) return pxToTailwind[px - offset]
      if (pxToTailwind[px + offset]) return pxToTailwind[px + offset]
    }

    return null // No match found
  }

  // Replace gap-custom-56 → gap-14 (56px = 14 * 4px)
  // Supported classes: gap, p, px, py, pt, pb, pl, pr, m, mx, my, mt, mb, ml, mr
  const spacingClasses = ['gap', 'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr']

  spacingClasses.forEach(prefix => {
    // Match: .gap-custom-56 { gap: 56px; }
    const classRegex = new RegExp(`\\.${prefix}-custom-(\\d+)\\s*\\{`, 'g')

    css = css.replace(classRegex, (match, px) => {
      const tailwindKey = findTailwindEquivalent(px)
      if (tailwindKey) {
        return `.${prefix}-${tailwindKey} {`
      }
      return match // Keep original if no match
    })

    // Also replace property values for matched classes
    // gap: 56px; → gap: 3.5rem
    // px: 80px → padding-left/right: 5rem (handled by class rename, skip property conversion)

    // Only convert if propName is a valid CSS property (gap, not px/py/etc.)
    if (['gap', 'padding', 'margin'].includes(prefix) ||
        (prefix.startsWith('p') && prefix.length === 1) ||
        (prefix.startsWith('m') && prefix.length === 1)) {
      const propName = prefix === 'p' ? 'padding' :
                       prefix === 'm' ? 'margin' :
                       prefix

      // Match property with exact name (not optional)
      const propertyRegex = new RegExp(`\\b${propName}:\\s*(\\d+)px\\b`, 'g')

      css = css.replace(propertyRegex, (match, px) => {
        const tailwindKey = findTailwindEquivalent(px)
        if (tailwindKey && spacingMap[tailwindKey] !== undefined) {
          const remValue = spacingMap[tailwindKey]
          return `${propName}: ${remValue}rem`
        }
        return match // Keep original
      })
    }
  })

  return css
}

/**
 * Extract class names used in JSX code
 * @param {string} tsx - TSX/JSX code
 * @returns {Set<string>} Set of class names
 */
export function extractUsedClasses(tsx) {
  const classes = new Set()

  // Match: className="flex gap-4 bg-white"
  const classNameRegex = /className="([^"]+)"/g
  let match

  while ((match = classNameRegex.exec(tsx)) !== null) {
    const classString = match[1]
    // Split by whitespace to handle multiple classes
    classString.split(/\s+/).forEach(cls => {
      if (cls.trim()) {
        classes.add(cls.trim())
      }
    })
  }

  return classes
}

/**
 * Filter CSS to only include used classes
 * Always keeps: @import, :root, Figma utilities
 * Filters: customClasses (sections 3-8)
 * @param {string} css - CSS content
 * @param {Set<string>} usedClasses - Set of class names to keep
 * @returns {string} Filtered CSS
 */
export function filterCSSByClasses(css, usedClasses) {
  const lines = css.split('\n')
  const filteredLines = []
  let currentRule = []
  let keepCurrentRule = false
  let inImportOrRoot = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Always keep @import
    if (line.startsWith('@import')) {
      filteredLines.push(line)
      continue
    }

    // Always keep :root section
    if (line.startsWith(':root')) {
      inImportOrRoot = true
      filteredLines.push(line)
      continue
    }

    // Track :root section end
    if (inImportOrRoot && line.includes('}') && !line.includes('{')) {
      filteredLines.push(line)
      inImportOrRoot = false
      continue
    }

    // Keep :root content
    if (inImportOrRoot) {
      filteredLines.push(line)
      continue
    }

    // Always keep Figma utilities section
    if (line.includes('Figma-specific utility classes')) {
      filteredLines.push(line)
      // Keep next few lines until blank line
      while (i + 1 < lines.length) {
        i++
        filteredLines.push(lines[i])
        if (lines[i].trim() === '' && lines[i + 1]?.startsWith('/*')) {
          break
        }
      }
      continue
    }

    // Detect class definition: .className {
    // Updated regex to capture all class names (including "dot", "rgba", etc.)
    const classMatch = line.match(/^\.([a-zA-Z0-9_-]+)\s*\{/)

    if (classMatch) {
      // Save previous rule if needed
      if (keepCurrentRule && currentRule.length > 0) {
        filteredLines.push(...currentRule)
      }

      // Start new rule
      const className = classMatch[1]
      keepCurrentRule = usedClasses.has(className)
      currentRule = [line]
    } else if (line.includes('}') && currentRule.length > 0) {
      // End of rule
      currentRule.push(line)
      if (keepCurrentRule) {
        filteredLines.push(...currentRule)
      }
      currentRule = []
      keepCurrentRule = false
    } else if (currentRule.length > 0) {
      // Inside rule
      currentRule.push(line)
    } else {
      // Keep comments and section headers
      if (line.startsWith('/*') || line.trim() === '') {
        filteredLines.push(line)
      }
    }
  }

  return filteredLines.join('\n')
}

/**
 * Optimize CSS content (main entry point)
 * @param {string} css - CSS content
 * @param {object} options - Optimization options
 * @param {boolean} options.roundDecimals - Round decimal values
 * @param {boolean} options.mapVariables - Map colors to CSS variables
 * @param {boolean} options.convertTailwind - Convert to Tailwind standard
 * @param {Set<string>} options.usedClasses - Filter by used classes (optional)
 * @returns {string} Optimized CSS
 */
export function optimizeCSS(css, options = {}) {
  const {
    roundDecimals = true,
    mapVariables = true,
    convertTailwind = true,
    usedClasses = null
  } = options

  let optimized = css

  // Order matters: round → map → convert
  if (roundDecimals) {
    optimized = roundDecimalValues(optimized)
  }

  if (mapVariables) {
    optimized = mapColorsToVariables(optimized)
  }

  if (convertTailwind) {
    optimized = convertToTailwindStandard(optimized)
  }

  if (usedClasses) {
    optimized = filterCSSByClasses(optimized, usedClasses)
  }

  return optimized
}
