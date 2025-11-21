/**
 * Text Consolidation Transform
 *
 * Intelligently merges split <p> tags in short text labels to reduce noise.
 * Only merges when specific UI context criteria are met.
 *
 * Example:
 *   <p className="mb-0">Add</p>
 *   <p>Money</p>
 * Becomes:
 *   <p>Add Money</p>
 *
 * Merge criteria (ALL must be true):
 * 1. First <p> has className="mb-0"
 * 2. Parent div has overflow-ellipsis overflow-hidden
 * 3. Parent div has text-center
 * 4. All <p> elements have identical styling
 * 5. Total merged text ≤ 25 characters
 */

import traverse from '@babel/traverse'
import * as t from '@babel/types'

export const meta = {
  name: 'text-consolidation',
  priority: 3 // After font-detection (0), before auto-layout (5)
}

/**
 * Check if className string contains a specific class
 */
function hasClass(className, searchClass) {
  if (!className) return false
  const classes = className.split(/\s+/)
  return classes.some(c => c.includes(searchClass))
}

/**
 * Extract text content from JSXText and JSXExpressionContainer nodes
 */
function extractTextContent(children) {
  let text = ''

  for (const child of children) {
    if (t.isJSXText(child)) {
      text += child.value.trim()
    } else if (t.isJSXExpressionContainer(child)) {
      // Handle {`text`} syntax
      if (t.isTemplateLiteral(child.expression)) {
        text += child.expression.quasis.map(q => q.value.raw).join('')
      } else if (t.isStringLiteral(child.expression)) {
        text += child.expression.value
      }
    }
  }

  return text.trim()
}

/**
 * Get className string from JSX element
 */
function getClassName(node) {
  const classNameAttr = node.openingElement.attributes.find(
    attr => t.isJSXAttribute(attr) && attr.name.name === 'className'
  )

  if (!classNameAttr) return ''

  if (t.isStringLiteral(classNameAttr.value)) {
    return classNameAttr.value.value
  }

  return ''
}

/**
 * Compare styling between two <p> elements
 * Returns true if styles are identical
 */
function haveSameStyles(p1, p2) {
  const class1 = getClassName(p1).replace(/\bmb-0\b/g, '').trim()
  const class2 = getClassName(p2).trim()

  // Classes must match (excluding mb-0 on first)
  if (class1 !== class2) return false

  // Check inline styles if present
  const style1 = p1.openingElement.attributes.find(
    attr => t.isJSXAttribute(attr) && attr.name.name === 'style'
  )
  const style2 = p2.openingElement.attributes.find(
    attr => t.isJSXAttribute(attr) && attr.name.name === 'style'
  )

  // Both should have styles or neither should
  if ((style1 && !style2) || (!style1 && style2)) return false

  return true
}

/**
 * Check if node is a <p> element
 */
function isParagraph(node) {
  return t.isJSXElement(node) &&
         t.isJSXIdentifier(node.openingElement.name) &&
         node.openingElement.name.name === 'p'
}

/**
 * Check if paragraph has mb-0 class
 */
function hasMb0Class(node) {
  const className = getClassName(node)
  return hasClass(className, 'mb-0')
}

/**
 * Get all consecutive <p> elements from children
 */
function getConsecutiveParagraphs(children) {
  const paragraphs = []

  for (const child of children) {
    if (isParagraph(child)) {
      paragraphs.push(child)
    } else if (t.isJSXText(child) && child.value.trim() === '') {
      // Ignore whitespace
      continue
    } else {
      // Non-paragraph found, stop collecting
      break
    }
  }

  return paragraphs
}

/**
 * Check if paragraphs should be merged based on all criteria
 */
function shouldMergeParagraphs(paragraphs, parentClassName) {
  if (paragraphs.length < 2) return false

  // Rule 1: First <p> must have mb-0 class
  if (!hasMb0Class(paragraphs[0])) return false

  // Rule 2: Parent must have overflow-ellipsis
  if (!hasClass(parentClassName, 'overflow-ellipsis')) return false

  // Rule 3: Parent must have text-center
  if (!hasClass(parentClassName, 'text-center')) return false

  // Rule 4: All paragraphs must have identical styling
  for (let i = 1; i < paragraphs.length; i++) {
    if (!haveSameStyles(paragraphs[0], paragraphs[i])) {
      return false
    }
  }

  // Rule 5: Total text length must be ≤ 25 characters
  const totalText = paragraphs
    .map(p => extractTextContent(p.children))
    .join(' ')

  if (totalText.length > 25) return false

  return true
}

/**
 * Merge multiple paragraphs into a single paragraph
 */
function mergeParagraphs(paragraphs) {
  const firstP = paragraphs[0]
  const mergedText = paragraphs
    .map(p => extractTextContent(p.children))
    .join(' ')

  // Remove mb-0 class from first paragraph
  const classNameAttr = firstP.openingElement.attributes.find(
    attr => t.isJSXAttribute(attr) && attr.name.name === 'className'
  )

  if (classNameAttr && t.isStringLiteral(classNameAttr.value)) {
    const newClassName = classNameAttr.value.value
      .replace(/\bmb-0\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (newClassName) {
      classNameAttr.value = t.stringLiteral(newClassName)
    } else {
      // Remove className attribute if empty
      const attrIndex = firstP.openingElement.attributes.indexOf(classNameAttr)
      firstP.openingElement.attributes.splice(attrIndex, 1)
    }
  }

  // Replace children with merged text
  firstP.children = [t.jsxText(mergedText)]

  return firstP
}

/**
 * Main execution function
 */
export function execute(ast, context) {
  const stats = {
    merged: 0,
    instances: []
  }

  traverse.default(ast, {
    JSXElement(path) {
      const node = path.node

      // Only process div elements that might contain split text
      if (!t.isJSXIdentifier(node.openingElement.name) ||
          node.openingElement.name.name !== 'div') {
        return
      }

      const parentClassName = getClassName(node)
      const children = node.children

      // Get consecutive paragraphs from the beginning of children
      const paragraphs = getConsecutiveParagraphs(children)

      if (shouldMergeParagraphs(paragraphs, parentClassName)) {
        // Get text for logging
        const originalTexts = paragraphs.map(p => extractTextContent(p.children))

        // Merge paragraphs
        const mergedP = mergeParagraphs(paragraphs)

        // Calculate indices: remove from first paragraph to last paragraph (inclusive)
        // This includes all children between them (whitespace, etc.)
        const startIndex = children.indexOf(paragraphs[0])
        const endIndex = children.indexOf(paragraphs[paragraphs.length - 1])
        const removeCount = endIndex - startIndex + 1

        // Replace all elements from first to last paragraph with the merged one
        node.children.splice(startIndex, removeCount, mergedP)

        stats.merged++
        stats.instances.push({
          original: originalTexts,
          merged: extractTextContent(mergedP.children)
        })
      }
    }
  })

  return stats
}
