import fs from 'fs'
import path from 'path'

/**
 * Generate design tokens from variables.json
 * Outputs: variables.css, tokens.ts, tailwind.config.js
 * @param {string} variablesPath - Path to variables.json
 * @param {string} tokensDir - Output directory for tokens
 */
export function generateTokens(variablesPath, tokensDir) {
  const variables = JSON.parse(fs.readFileSync(variablesPath, 'utf8'))

  // Normalize token names (spaces → kebab-case)
  const normalized = normalizeTokens(variables)

  // Generate 3 formats
  fs.writeFileSync(
    path.join(tokensDir, 'variables.css'),
    generateCSSTokens(normalized)
  )

  fs.writeFileSync(
    path.join(tokensDir, 'tokens.ts'),
    generateTSTokens(normalized)
  )

  fs.writeFileSync(
    path.join(tokensDir, 'tailwind.config.js'),
    generateTailwindConfig(normalized)
  )
}

/**
 * Normalize token names to kebab-case
 * @param {object} variables - Raw variables from Figma
 * @returns {object} Normalized tokens
 */
function normalizeTokens(variables) {
  const normalized = {}
  for (const [key, value] of Object.entries(variables)) {
    // "Light Text" → "light-text"
    // "NEW Color version/Main #1" → "new-color-version-main-1"
    const kebabKey = key
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/\//g, '-')
      .replace(/#/g, '')
    normalized[kebabKey] = value
  }
  return normalized
}

/**
 * Generate CSS custom properties
 * @param {object} tokens - Normalized tokens
 * @returns {string} CSS content
 */
function generateCSSTokens(tokens) {
  let css = ':root {\n'
  for (const [key, value] of Object.entries(tokens)) {
    css += `  --color-${key}: ${value};\n`
  }
  css += '}\n'
  return css
}

/**
 * Generate TypeScript constants
 * @param {object} tokens - Normalized tokens
 * @returns {string} TypeScript content
 */
function generateTSTokens(tokens) {
  const entries = Object.entries(tokens)
    .map(([key, value]) => `  ${toCamelCase(key)}: '${value}'`)
    .join(',\n')

  return `export const colors = {\n${entries}\n} as const;\n\nexport type ColorToken = keyof typeof colors;\n`
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str - Kebab-case string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Generate Tailwind config
 * @param {object} tokens - Normalized tokens
 * @returns {string} JavaScript config content
 */
function generateTailwindConfig(tokens) {
  const colors = Object.entries(tokens)
    .map(([key, value]) => `        '${key}': '${value}'`)
    .join(',\n')

  return `module.exports = {
  theme: {
    extend: {
      colors: {
${colors}
      }
    }
  }
}\n`
}
