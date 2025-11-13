import fs from 'fs'
import path from 'path'
import { toPascalCase } from '../utils/chunking.js'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'

/**
 * Extract parent component name from Component-clean.tsx
 * @param {string} exportDir - Export directory path
 * @returns {string} Parent component function name
 */
function getParentComponentNameFromSource(exportDir) {
  const cleanPath = path.join(exportDir, 'Component-clean.tsx')

  if (!fs.existsSync(cleanPath)) {
    throw new Error(`Component-clean.tsx not found in ${exportDir}`)
  }

  const content = fs.readFileSync(cleanPath, 'utf8')
  const match = content.match(/export default function (\w+)\(\)/)

  if (!match) {
    throw new Error('Could not extract component name from Component-clean.tsx')
  }

  return match[1]  // Returns actual function name (e.g., "Widget01Mobile")
}

/**
 * Generate developer-ready dist/ package
 * @param {string} exportDir - Export directory path
 * @param {object} config - Configuration
 * @param {string} config.type - 'single' | 'responsive'
 * @param {string} config.componentName - Main component name
 * @param {object} config.breakpoints - Responsive breakpoints (optional)
 */
export async function generateDist(exportDir, config) {
  const distDir = path.join(exportDir, 'dist')
  const { type, componentName, breakpoints } = config

  console.log(`  Creating dist/ structure...`)

  // 1. Create directory structure
  await createDistStructure(distDir)

  // 2. Copy components/ → dist/components/ (subcomponents only)
  const sourceComponents = path.join(exportDir, 'components')
  const extractedComponents = copyComponents(sourceComponents, distDir, config)

  // 3. Generate or copy Page.tsx
  if (type === 'single') {
    // Generate Page.tsx from parent component with imports
    generatePageFile(exportDir, distDir, config, extractedComponents)
  } else {
    // Copy existing Page.tsx for responsive merges
    copyPageFile(exportDir, distDir)
  }

  // 4. Copy assets
  await copyAssets(exportDir, distDir)

  // 5. Generate design tokens
  await generateDesignTokens(exportDir, distDir, config)

  // 6. Generate README
  await generateReadmeWrapper(exportDir, distDir, config)

  console.log(`  ✅ dist/ package created`)
}

function createDistStructure(distDir) {
  // Clean dist directory if it exists
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
  }

  // Create fresh structure
  const dirs = ['components', 'assets/img', 'tokens']
  for (const dir of dirs) {
    fs.mkdirSync(path.join(distDir, dir), { recursive: true })
  }
}

function copyComponents(sourceDir, distDir, config) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`components/ directory not found at ${sourceDir}`)
  }

  const files = fs.readdirSync(sourceDir)
  const componentFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.css'))

  // Get parent component name (to exclude it for single exports)
  const parentComponentName = config.type === 'single'
    ? getParentComponentNameFromSource(sourceDir.replace('/components', ''))
    : null

  const extractedComponents = []
  let copiedCount = 0

  for (const file of componentFiles) {
    // Skip image-manifest.json (metadata file)
    if (file === 'image-manifest.json') {
      continue
    }

    // Skip parent component for single exports (will be transformed into Page.tsx)
    if (parentComponentName && file.startsWith(parentComponentName + '.')) {
      console.log(`    ⏩ Skipping parent component: ${file} (will generate Page.tsx)`)
      continue
    }

    // Track extracted component names (only .tsx files)
    if (file.endsWith('.tsx')) {
      extractedComponents.push(file.replace('.tsx', ''))
    }

    let content = fs.readFileSync(path.join(sourceDir, file), 'utf8')

    // Fix import paths: ./img/ → ../assets/img/
    content = content.replace(/from ['"]\.\/img\//g, 'from \'../assets/img/')
    content = content.replace(/from ['"]\.\.\/img\//g, 'from \'../assets/img/')

    // TODO: Extract props if needed (Phase 5 - optional)

    fs.writeFileSync(path.join(distDir, 'components', file), content)
    copiedCount++
  }

  console.log(`    ✓ Copied ${copiedCount} reusable component files`)
  return extractedComponents
}

/**
 * Generate Page.tsx for single exports (transform parent component)
 */
function generatePageFile(exportDir, distDir, config, extractedComponents) {
  const parentComponentName = getParentComponentNameFromSource(exportDir)

  // ALWAYS use Component-clean.tsx as source (parent is never split into components/)
  const parentTsxPath = path.join(exportDir, 'Component-clean.tsx')
  const parentCssPath = path.join(exportDir, 'Component-clean.css')

  if (!fs.existsSync(parentTsxPath)) {
    console.log(`    ⚠️  Component-clean.tsx not found`)
    return
  }

  const parentCode = fs.readFileSync(parentTsxPath, 'utf8')

  // Transform parent component → Page.tsx with imports
  const pageCode = transformToPageComponent(parentCode, parentComponentName, extractedComponents)

  // Fix import paths: ./img/ → ./assets/img/
  const fixedPageCode = pageCode
    .replace(/from ['"]\.\/img\//g, 'from \'./assets/img/')
    .replace(/from ['"]\.\.\/img\//g, 'from \'./assets/img/')

  // Save to dist root (not dist/components/)
  fs.writeFileSync(path.join(distDir, 'Page.tsx'), fixedPageCode)

  // Generate Page.css with component imports
  if (fs.existsSync(parentCssPath)) {
    const cssContent = fs.readFileSync(parentCssPath, 'utf8')

    // Generate @import statements for extracted components
    const componentImports = extractedComponents
      .map(name => `@import './components/${name}.css';`)
      .join('\n')

    // Combine imports + parent CSS
    const finalCss = componentImports + '\n\n' + cssContent

    fs.writeFileSync(path.join(distDir, 'Page.css'), finalCss)
  }

  console.log(`    ✓ Generated Page.tsx with ${extractedComponents.length} component imports`)
}

/**
 * Transform parent component to Page component with imports
 * Replaces div[data-name] with component calls (reuses responsive-merger logic)
 */
function transformToPageComponent(sourceCode, parentName, extractedComponents) {
  // Parse source code into AST
  const ast = parse(sourceCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  })

  const componentsToImport = new Set()

  // Build mapping: data-name (case-insensitive) → component name
  const dataNameMap = new Map()
  for (const componentName of extractedComponents) {
    dataNameMap.set(componentName.toLowerCase(), componentName)
  }

  // Traverse and replace div[data-name] with component calls
  traverse.default(ast, {
    JSXElement(path) {
      const openingElement = path.node.openingElement

      // Check if it's a div with data-name attribute
      if (openingElement.name.type === 'JSXIdentifier' && openingElement.name.name === 'div') {
        const dataNameAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' &&
                  attr.name &&
                  attr.name.name === 'data-name' &&
                  attr.value &&
                  attr.value.type === 'StringLiteral'
        )

        if (dataNameAttr) {
          const dataName = dataNameAttr.value.value
          const pascalDataName = toPascalCase(dataName)
          const componentName = dataNameMap.get(pascalDataName.toLowerCase())

          if (componentName) {
            // Replace div with self-closing component tag
            componentsToImport.add(componentName)

            path.replaceWith({
              type: 'JSXElement',
              openingElement: {
                type: 'JSXOpeningElement',
                name: { type: 'JSXIdentifier', name: componentName },
                attributes: [],
                selfClosing: true
              },
              closingElement: null,
              children: []
            })

            console.log(`    🔄 Replaced data-name="${dataName}" with <${componentName} />`)
          }
        }
      }
    }
  })

  // Generate transformed code
  const output = generate.default(ast, { retainLines: false, compact: false })
  let finalCode = output.code

  // Add component imports after React import
  const imports = Array.from(componentsToImport)
    .map(name => `import ${name} from './components/${name}';`)
    .join('\n')

  finalCode = finalCode.replace(
    /import React from ['"]react['"];/,
    `import React from 'react';\nimport './Page.css';\n${imports}`
  )

  // Remove CSS import (already added above)
  finalCode = finalCode.replace(`import './${parentName}.css';`, '')
  finalCode = finalCode.replace(`import "./${parentName}.css";`, '')

  // Rename main function to Page
  finalCode = finalCode.replace(/export default function \w+\(\)/, 'export default function Page()')

  // Clean up excessive blank lines
  finalCode = finalCode.replace(/\n{3,}/g, '\n\n')

  return finalCode
}

function copyPageFile(exportDir, distDir) {
  // Copy Page.tsx and Page.css for responsive merges
  const pageTsx = path.join(exportDir, 'Page.tsx')
  const pageCss = path.join(exportDir, 'Page.css')

  if (fs.existsSync(pageTsx)) {
    let content = fs.readFileSync(pageTsx, 'utf8')
    // Save to dist root (not dist/components/)
    fs.writeFileSync(path.join(distDir, 'Page.tsx'), content)
  }

  if (fs.existsSync(pageCss)) {
    let content = fs.readFileSync(pageCss, 'utf8')
    // Save to dist root (not dist/components/)
    fs.writeFileSync(path.join(distDir, 'Page.css'), content)
  }

  console.log(`    ✓ Copied Page.tsx and Page.css`)
}

function copyAssets(exportDir, distDir) {
  const imgSource = path.join(exportDir, 'img')
  if (fs.existsSync(imgSource)) {
    // Recursive copy using cpSync (Node 16.7+)
    fs.cpSync(imgSource, path.join(distDir, 'assets/img'), { recursive: true })
    const count = fs.readdirSync(imgSource).length
    console.log(`    ✓ Copied ${count} images`)
  }
}

async function generateDesignTokens(exportDir, distDir, config) {
  let variablesPath = path.join(exportDir, 'variables.json')

  // For responsive merges, get variables.json from Desktop export
  if (config.type === 'responsive') {
    const metadataPath = path.join(exportDir, 'responsive-metadata.json')
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
      const desktopTestId = metadata.breakpoints?.desktop?.testId

      if (desktopTestId) {
        const desktopVariablesPath = path.join(
          exportDir,
          '..',
          '..',
          'export_figma',
          desktopTestId,
          'variables.json'
        )

        if (fs.existsSync(desktopVariablesPath)) {
          variablesPath = desktopVariablesPath
        }
      }
    }
  }

  if (!fs.existsSync(variablesPath)) {
    console.log(`    ⚠️  variables.json not found, skipping tokens`)
    return
  }

  const { generateTokens } = await import('./generate-design-tokens.js')
  generateTokens(variablesPath, path.join(distDir, 'tokens'))
  console.log(`    ✓ Generated design tokens (3 formats)`)
}

async function generateReadmeWrapper(exportDir, distDir, config) {
  const { generateReadme } = await import('../reporting/generate-readme.js')
  const metadataPath = path.join(exportDir, 'metadata.json')

  let metadata = {}
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
  } else {
    // For responsive merges, might not have metadata.json at root
    metadata = {
      nodeName: config.componentName,
      timestamp: Date.now()
    }
  }

  generateReadme(distDir, metadata, config)
  console.log(`    ✓ Generated README.md`)
}
