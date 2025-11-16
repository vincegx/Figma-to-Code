/**
 * Props Extraction Transform
 *
 * Extracts hardcoded values (text, images, numbers) from JSX components
 * and converts them into reusable props with TypeScript interfaces.
 *
 * Example transformation:
 * Before:
 *   export default function Component() {
 *     return <p>Hello World</p>
 *   }
 *
 * After:
 *   interface ComponentProps {
 *     helloWorld?: string;
 *     className?: string;
 *   }
 *   export default function Component({ helloWorld = "Hello World", className }: ComponentProps) {
 *     return <p>{helloWorld}</p>
 *   }
 */

import traverse from '@babel/traverse'
import * as t from '@babel/types'

export const meta = {
  name: 'extract-props',
  priority: 85  // After production-cleaner (100), before final output
}

// JavaScript reserved keywords that cannot be used as identifiers
const RESERVED_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
  'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super',
  'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'enum', 'await', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static'
])

/**
 * Convert text to camelCase prop name
 * "Welcome back," → "welcomeBack"
 * "Chandler Bing" → "chandlerBing"
 * "1" → "text1"
 * "Continue" → "continueText" (reserved keyword)
 * "03 25481 9" → "text03254819"
 */
function toCamelCase(text) {
  if (!text || typeof text !== 'string') return ''

  let propName = text
    .trim()
    .replace(/[^a-z0-9\s]+/gi, '')  // Remove all non-alphanumeric except spaces
    .toLowerCase()
    .replace(/\s+(.)/g, (_, chr) => chr.toUpperCase())  // Convert spaces to camelCase
    .replace(/^./, chr => chr.toLowerCase())

  // Ensure prop name is not empty and doesn't start with a digit
  if (!propName || /^\d/.test(propName)) {
    propName = 'text' + propName
  }

  // Avoid JavaScript reserved keywords
  if (RESERVED_KEYWORDS.has(propName)) {
    propName = propName + 'Text'
  }

  return propName
}

/**
 * Clean image import name and add 'Image' suffix to avoid prop/import collisions
 * imgGroup1000001422 → group1000001422Image
 * img → imageImage
 * img1 → image1Image
 * content3 → content3Image
 * navbar → navbarImage
 */
function cleanImageName(importName) {
  let cleaned = importName
    .replace(/^img/, '')
    .replace(/^./, chr => chr.toLowerCase())

  // If name is empty or starts with digit after cleaning, prefix with 'image'
  if (!cleaned || /^\d/.test(cleaned)) {
    cleaned = 'image' + cleaned
  }

  // Add 'Image' suffix to avoid collision with import name
  // Example: import content3 from "..." → prop: content3Image
  cleaned = cleaned + 'Image'

  return cleaned
}

/**
 * Check if value should be extracted as prop
 */
function shouldExtract(value) {
  if (!value) return false
  if (typeof value === 'string' && value.trim().length < 2) return false
  if (typeof value === 'number' && [0, 1, 2, 3, 4, 5, 10, 100].includes(value)) return false
  return true
}

/**
 * Check if image is a Figma instance screenshot (should NOT be extracted as prop)
 *
 * Figma exports complex instances (SideMenu, Header) as BOTH:
 * 1. Unfolded component code with full structure
 * 2. Screenshot SVG (sidemenu.svg) of the instance
 *
 * We must skip the screenshot to preserve the full component structure.
 *
 * Detection strategy:
 * 1. Primary: Check if image name matches instance names from metadata.xml
 * 2. Fallback: Check file naming convention (simple lowercase = instance)
 *
 * @param {string} importPath - Import path (e.g., "./img/sidemenu.svg")
 * @param {string} importName - Import variable name (e.g., "imgSidemenu")
 * @param {object} context - Pipeline context with metadata
 * @returns {boolean} - True if this is an instance screenshot (skip extraction)
 */
function isInstanceScreenshot(importPath, importName, context = {}) {
  // Strategy 1: Check against instance names from metadata.xml (most reliable)
  if (context.metadata && context.metadata.instances) {
    const instanceNames = context.metadata.instances

    // Normalize import name: imgSidemenu → sidemenu
    const normalizedImportName = importName
      .replace(/^img/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

    // Check if matches any instance name
    for (const instanceName of instanceNames) {
      const normalizedInstanceName = instanceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

      if (normalizedImportName === normalizedInstanceName) {
        return true // Matched instance from metadata.xml
      }
    }
  }

  // Strategy 2: Fallback - Check file naming convention
  // Instance screenshots: simple lowercase word (sidemenu.svg, header.svg, footer.svg)
  // Actual images: descriptive kebab-case (icon-search.svg, frame-1008.svg, group-1000001432.svg)
  const filename = importPath.split('/').pop()
  const basename = filename.replace(/\.(svg|png|jpg|jpeg|gif|webp)$/i, '')

  // Pattern: Simple lowercase word with 4+ characters (likely instance)
  // Examples that match: sidemenu, header, footer, navbar
  // Examples that DON'T match: icon-search (has dash), img (too short), frame-1008 (has dash+number)
  if (/^[a-z]{4,}$/.test(basename)) {
    return true // Likely instance screenshot (simple word)
  }

  return false // Not an instance screenshot
}

/**
 * Extract text content from JSX elements (only from main component)
 */
function extractTexts(ast, componentName) {
  const texts = []
  const textMap = new Map() // originalText → propName

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // Only extract from the main component (export default)
      if (path.node.id && path.node.id.name === componentName) {
        path.traverse({
          JSXText(innerPath) {
            const text = innerPath.node.value.trim()
            if (shouldExtract(text) && !textMap.has(text)) {
              const propName = toCamelCase(text)
              textMap.set(text, propName)
              texts.push({
                type: 'text',
                originalValue: text,
                propName,
                defaultValue: text,
                path: innerPath
              })
            }
          },

          JSXAttribute(innerPath) {
            // Extract from alt, title, placeholder attributes
            if (innerPath.node.value?.type === 'StringLiteral') {
              const attrName = innerPath.node.name.name
              if (['alt', 'title', 'placeholder', 'aria-label'].includes(attrName)) {
                const text = innerPath.node.value.value
                if (shouldExtract(text) && !textMap.has(text)) {
                  const propName = toCamelCase(text)
                  textMap.set(text, propName)
                  texts.push({
                    type: 'text',
                    originalValue: text,
                    propName,
                    defaultValue: text,
                    path: innerPath,
                    location: `attribute:${attrName}`
                  })
                }
              }
            }
          }
        })
        path.stop()
      }
    }
  })

  return texts
}

/**
 * Extract image imports and usages (only from main component)
 * EXCLUDES Figma instance screenshots to preserve full component structure
 */
function extractImages(ast, componentName, context = {}) {
  const images = []
  const imageImports = new Map() // importName → importPath

  // Step 1: Find all image imports (skip instance screenshots)
  traverse.default(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value
      if (source.match(/\.(svg|png|jpg|jpeg|gif|webp)$/i)) {
        const importName = path.node.specifiers[0]?.local.name
        if (importName) {
          // Check if this is a Figma instance screenshot
          if (!isInstanceScreenshot(source, importName, context)) {
            // Real image - add to extraction candidates
            imageImports.set(importName, source)
          }
        }
      }
    }
  })

  // Step 2: Find image usages in JSX (only in main component)
  const usedImages = new Set()
  traverse.default(ast, {
    FunctionDeclaration(path) {
      // Only extract from the main component (export default)
      if (path.node.id && path.node.id.name === componentName) {
        path.traverse({
          JSXAttribute(innerPath) {
            if (innerPath.node.name.name === 'src' && innerPath.node.value?.type === 'JSXExpressionContainer') {
              const expr = innerPath.node.value.expression
              if (expr.type === 'Identifier' && imageImports.has(expr.name)) {
                const importName = expr.name
                if (!usedImages.has(importName)) {
                  usedImages.add(importName)
                  const propName = cleanImageName(importName)
                  images.push({
                    type: 'image',
                    originalValue: importName,
                    propName,
                    importPath: imageImports.get(importName),
                    defaultValue: importName,
                    path: innerPath
                  })
                }
              }
            }
          }
        })
        path.stop()
      }
    }
  })

  return images
}

/**
 * Extract numeric literals from JSX (only from main component)
 */
function extractNumbers(ast, componentName) {
  const numbers = []
  const seenNumbers = new Set()

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // Only extract from the main component (export default)
      if (path.node.id && path.node.id.name === componentName) {
        path.traverse({
          JSXExpressionContainer(innerPath) {
            const expr = innerPath.node.expression
            if (expr.type === 'NumericLiteral' && shouldExtract(expr.value)) {
              const value = expr.value
              const key = `value${value}`

              if (!seenNumbers.has(key)) {
                seenNumbers.add(key)
                numbers.push({
                  type: 'number',
                  originalValue: value,
                  propName: key,
                  defaultValue: value,
                  path: innerPath
                })
              }
            }
          }
        })
        path.stop()
      }
    }
  })

  return numbers
}

/**
 * Generate TypeScript interface for props
 * Includes both existing props (from Figma variants) and extracted props (from hardcoded values)
 */
function generateInterface(componentName, extractedProps, existingProps) {
  if (extractedProps.length === 0 && existingProps.length === 0) return ''

  const propDefinitions = []

  // Add extracted props (from hardcoded values)
  for (const prop of extractedProps) {
    let type = 'string'
    if (prop.type === 'number') type = 'number'
    if (prop.type === 'image') type = 'string'
    propDefinitions.push(`  ${prop.propName}?: ${type};`)
  }

  // Add existing props (from Figma variants - preserve types)
  for (const prop of existingProps) {
    let type = 'string'

    if (prop.type === 'boolean') {
      type = 'boolean'
    } else if (prop.type === 'number') {
      type = 'number'
    } else if (prop.type === 'union' && prop.literalTypes && prop.literalTypes.length > 0) {
      // Union type: "A" | "B" | "C"
      type = prop.literalTypes.map(v => `"${v}"`).join(' | ')
    }

    propDefinitions.push(`  ${prop.name}?: ${type};`)
  }

  return `// ========================================
// Component Props Interface
// Auto-generated from hardcoded values
// ========================================

interface ${componentName}Props {
${propDefinitions.join('\n')}
}

`
}

/**
 * Replace hardcoded values with props in AST
 */
function replaceWithProps(allProps) {
  for (const prop of allProps) {
    if (!prop.path || !prop.path.node) continue

    if (prop.type === 'text') {
      // Replace JSXText or StringLiteral with {propName}
      if (prop.location && prop.location.startsWith('attribute:')) {
        // For attributes: alt="text" → alt={propName}
        prop.path.node.value = t.jsxExpressionContainer(
          t.identifier(prop.propName)
        )
      } else {
        // For JSXText: <p>text</p> → <p>{propName}</p>
        prop.path.replaceWith(
          t.jsxExpressionContainer(
            t.identifier(prop.propName)
          )
        )
      }
    } else if (prop.type === 'image') {
      // Replace src={imgVar} → src={propName}
      prop.path.node.value = t.jsxExpressionContainer(
        t.identifier(prop.propName)
      )
    } else if (prop.type === 'number') {
      // Replace {123} → {propName}
      prop.path.replaceWith(
        t.jsxExpressionContainer(
          t.identifier(prop.propName)
        )
      )
    }
  }
}

/**
 * Get component name from AST
 */
function getComponentName(ast) {
  let componentName = 'Component'

  traverse.default(ast, {
    FunctionDeclaration(path) {
      if (path.node.id && path.parent.type === 'ExportDefaultDeclaration') {
        componentName = path.node.id.name
        path.stop()
      }
    },
    ExportDefaultDeclaration(path) {
      if (path.node.declaration.type === 'FunctionDeclaration' && path.node.declaration.id) {
        componentName = path.node.declaration.id.name
        path.stop()
      }
    }
  })

  return componentName
}

/**
 * Detect all existing props in component (preserve them during extraction)
 * Returns: Array of { name, type, hasDefault, defaultValue, literalTypes }
 */
function detectExistingProps(ast, componentName) {
  const existingProps = []
  let existingPropsInterface = null

  // Step 1: Find existing TypeScript interface (if any)
  traverse.default(ast, {
    TSInterfaceDeclaration(path) {
      if (path.node.id.name === `${componentName}Props`) {
        existingPropsInterface = path.node.body.body
        path.stop()
      }
    },
    TSTypeAliasDeclaration(path) {
      if (path.node.id.name === `${componentName}Props`) {
        existingPropsInterface = path.node.typeAnnotation
        path.stop()
      }
    }
  })

  // Step 2: Detect props from function signature
  traverse.default(ast, {
    FunctionDeclaration(path) {
      if (path.node.id && path.node.id.name === componentName) {
        // Check if function has parameters
        if (path.node.params.length > 0) {
          const firstParam = path.node.params[0]

          // Check destructured object pattern: function Component({ prop1, prop2 = "default" })
          if (firstParam.type === 'ObjectPattern') {
            for (const prop of firstParam.properties) {
              if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                const propName = prop.key.name
                let hasDefault = false
                let defaultValue = null

                // Check if prop has default value: { prop = "default" }
                if (prop.value.type === 'AssignmentPattern') {
                  hasDefault = true
                  const right = prop.value.right

                  // Extract default value
                  if (right.type === 'StringLiteral') {
                    defaultValue = right.value
                  } else if (right.type === 'BooleanLiteral') {
                    defaultValue = right.value
                  } else if (right.type === 'NumericLiteral') {
                    defaultValue = right.value
                  } else if (right.type === 'Identifier') {
                    defaultValue = right.name // For image imports
                  }
                }

                // Try to get type info from interface
                let tsType = 'string'
                let literalTypes = null

                if (existingPropsInterface) {
                  for (const member of existingPropsInterface) {
                    if (member.type === 'TSPropertySignature' &&
                        member.key.type === 'Identifier' &&
                        member.key.name === propName) {
                      // Extract type annotation
                      const typeAnnotation = member.typeAnnotation?.typeAnnotation

                      if (typeAnnotation?.type === 'TSBooleanKeyword') {
                        tsType = 'boolean'
                      } else if (typeAnnotation?.type === 'TSNumberKeyword') {
                        tsType = 'number'
                      } else if (typeAnnotation?.type === 'TSUnionType') {
                        // Union of literal types: "A" | "B" | "C"
                        literalTypes = typeAnnotation.types
                          .filter(t => t.type === 'TSLiteralType')
                          .map(t => t.literal.value)
                        tsType = 'union'
                      }
                      break
                    }
                  }
                }

                existingProps.push({
                  name: propName,
                  type: tsType,
                  hasDefault,
                  defaultValue,
                  literalTypes
                })
              }
            }
          }
        }
        path.stop()
      }
    }
  })

  return existingProps
}

/**
 * Update function signature to accept props with defaults
 * Preserves existing props (from Figma variants) and adds extracted props
 */
function updateFunctionSignature(ast, componentName, extractedProps, existingProps) {
  traverse.default(ast, {
    FunctionDeclaration(path) {
      // Find the component function
      if (path.node.id && path.node.id.name === componentName) {
        const properties = []

        // Add extracted props (from hardcoded values)
        for (const prop of extractedProps) {
          const defaultVal = prop.type === 'number'
            ? t.numericLiteral(prop.defaultValue)
            : prop.type === 'image'
            ? t.identifier(prop.originalValue)  // Keep image import reference
            : t.stringLiteral(prop.defaultValue)

          properties.push(
            t.objectProperty(
              t.identifier(prop.propName),
              t.assignmentPattern(
                t.identifier(prop.propName),
                defaultVal
              ),
              false,  // computed
              false   // shorthand must be false when using default values
            )
          )
        }

        // Add existing props (from Figma variants - preserve defaults)
        for (const prop of existingProps) {
          if (prop.hasDefault && prop.defaultValue !== null) {
            // Prop has default value
            let defaultVal
            if (prop.type === 'boolean') {
              defaultVal = t.booleanLiteral(prop.defaultValue)
            } else if (prop.type === 'number') {
              defaultVal = t.numericLiteral(prop.defaultValue)
            } else if (typeof prop.defaultValue === 'string') {
              defaultVal = t.stringLiteral(prop.defaultValue)
            } else {
              // Image or other identifier
              defaultVal = t.identifier(prop.defaultValue)
            }

            properties.push(
              t.objectProperty(
                t.identifier(prop.name),
                t.assignmentPattern(
                  t.identifier(prop.name),
                  defaultVal
                ),
                false,
                false
              )
            )
          } else {
            // Prop without default (shorthand syntax)
            properties.push(
              t.objectProperty(
                t.identifier(prop.name),
                t.identifier(prop.name),
                false,
                true  // shorthand
              )
            )
          }
        }

        // Create props parameter
        const propsParam = t.objectPattern(properties)

        // Add TypeScript type annotation
        propsParam.typeAnnotation = t.tsTypeAnnotation(
          t.tsTypeReference(t.identifier(`${componentName}Props`))
        )

        // Update function params
        path.node.params = [propsParam]

        path.stop()
      }
    }
  })
}

/**
 * Deduplicate prop names to avoid conflicts
 * Strategy: If name collision detected:
 * - Images get "Image" suffix (e.g., sidemenu → sidemenuImage)
 * - Texts keep original name
 * - If still conflicts, add numeric suffix
 */
function deduplicatePropNames(allProps) {
  const propNameCount = new Map() // propName → count
  const propNamesByType = new Map() // propName → [types]

  // First pass: detect duplicates
  for (const prop of allProps) {
    const name = prop.propName
    propNameCount.set(name, (propNameCount.get(name) || 0) + 1)
    if (!propNamesByType.has(name)) {
      propNamesByType.set(name, [])
    }
    propNamesByType.get(name).push(prop.type)
  }

  // Second pass: rename duplicates
  const seenNames = new Set()
  for (const prop of allProps) {
    const originalName = prop.propName

    // No conflict - keep original name
    if (propNameCount.get(originalName) === 1) {
      seenNames.add(originalName)
      continue
    }

    // Conflict detected - apply strategy
    let newName = originalName

    // If this is an image and there's a text with same name, add "Image" suffix
    if (prop.type === 'image' && propNamesByType.get(originalName).includes('text')) {
      newName = originalName + 'Image'
    }
    // If this is a number and there's a text/image with same name, add "Value" suffix
    else if (prop.type === 'number' && propNamesByType.get(originalName).some(t => t !== 'number')) {
      newName = originalName + 'Value'
    }

    // If name still conflicts, add numeric suffix
    let counter = 2
    while (seenNames.has(newName)) {
      newName = originalName + counter
      counter++
    }

    seenNames.add(newName)
    prop.propName = newName
  }

  return allProps
}

/**
 * Main execution function
 */
export function execute(ast, context) {
  const startTime = Date.now()

  // Extract component name
  const componentName = getComponentName(ast)

  // Detect existing props (from Figma variants - preserve them!)
  const existingProps = detectExistingProps(ast, componentName)

  // Extract props from hardcoded values (only from main component, not helpers)
  const texts = extractTexts(ast, componentName)
  const images = extractImages(ast, componentName, context)
  const numbers = extractNumbers(ast, componentName)
  let extractedProps = [...texts, ...images, ...numbers]

  // If no props to extract and no existing props, skip
  if (extractedProps.length === 0 && existingProps.length === 0) {
    return {
      propsExtracted: 0,
      skipped: true,
      executionTime: `${Date.now() - startTime}ms`
    }
  }

  // Deduplicate extracted prop names to avoid conflicts
  extractedProps = deduplicatePropNames(extractedProps)

  // Replace hardcoded values with props
  replaceWithProps(extractedProps)

  // Update function signature (preserve existing props + add extracted props)
  updateFunctionSignature(ast, componentName, extractedProps, existingProps)

  // Generate TypeScript interface (existing props + extracted props)
  const interfaceDef = generateInterface(componentName, extractedProps, existingProps)

  // Store interface in context for later use
  if (!context.propsExtraction) context.propsExtraction = {}
  context.propsExtraction.interface = interfaceDef
  context.propsExtraction.props = [...extractedProps, ...existingProps]

  return {
    propsExtracted: extractedProps.length,
    existingPropsPreserved: existingProps.length,
    byType: {
      texts: texts.length,
      images: images.length,
      numbers: numbers.length
    },
    executionTime: `${Date.now() - startTime}ms`
  }
}
