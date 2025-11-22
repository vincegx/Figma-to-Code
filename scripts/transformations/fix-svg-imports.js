import traverse from '@babel/traverse'
import * as t from '@babel/types'
import fs from 'fs'
import path from 'path'

export const meta = {
  name: 'fix-svg-imports',
  priority: 3,
  description: 'Fix broken svg-* imports from Figma MCP (replaces with real SVG files)'
}

/**
 * Figma MCP bug: generates imports like `import { img, img1 } from "./svg-fztvs"`
 * but never creates the svg-fztvs.tsx file.
 *
 * This transform replaces these broken imports with individual imports to real SVG files.
 */
export function execute(ast, context) {
  const stats = {
    brokenImportsFixed: 0,
    svgVariablesMapped: 0
  }

  const inputDir = context.inputDir
  if (!inputDir) {
    return stats
  }

  const imgDir = path.join(inputDir, 'img')
  if (!fs.existsSync(imgDir)) {
    return stats
  }

  // Find broken svg-* import
  let brokenImport = null

  traverse.default(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value

      // Detect import from "./svg-*"
      if (source.match(/^\.\/svg-[a-z0-9]+$/)) {
        brokenImport = {
          path: path,
          source: source,
          variables: []
        }

        // Extract imported variable names
        path.node.specifiers.forEach(spec => {
          if (t.isImportSpecifier(spec)) {
            brokenImport.variables.push(spec.imported.name)
          }
        })
      }
    }
  })

  if (!brokenImport) {
    return stats
  }

  // Get all SVG files
  const svgFiles = fs.readdirSync(imgDir)
    .filter(f => f.endsWith('.svg'))
    .sort()

  if (svgFiles.length === 0) {
    return stats
  }

  // Map variables to files by usage order
  const variableToFile = mapVariablesToFiles(ast, brokenImport.variables, svgFiles)

  // Replace broken import with individual imports
  traverse.default(ast, {
    Program(path) {
      const imports = path.get('body').filter(p => p.isImportDeclaration())

      for (const importPath of imports) {
        const source = importPath.node.source.value

        if (source.match(/^\.\/svg-[a-z0-9]+$/)) {
          // Create individual imports for each variable
          for (const [varName, svgFile] of Object.entries(variableToFile)) {
            const newImport = t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(varName))],
              t.stringLiteral(`./img/${svgFile}`)
            )
            importPath.insertBefore(newImport)
            stats.svgVariablesMapped++
          }

          // Remove broken import
          importPath.remove()
          stats.brokenImportsFixed++
          break
        }
      }
    }
  })

  return stats
}

/**
 * Map variables to SVG files based on order of first usage in code
 */
function mapVariablesToFiles(ast, variables, svgFiles) {
  const mapping = {}
  const usageOrder = []
  const variableSet = new Set(variables)

  // Get order of first usage
  traverse.default(ast, {
    Identifier(path) {
      const name = path.node.name
      if (variableSet.has(name) && !usageOrder.includes(name)) {
        if (path.isReferencedIdentifier()) {
          usageOrder.push(name)
        }
      }
    }
  })

  // Map by usage order
  for (let i = 0; i < Math.min(usageOrder.length, svgFiles.length); i++) {
    mapping[usageOrder[i]] = svgFiles[i]
  }

  // Map remaining variables sequentially
  const unmapped = variables.filter(v => !mapping[v])
  const unusedFiles = svgFiles.filter(f => !Object.values(mapping).includes(f))

  for (let i = 0; i < Math.min(unmapped.length, unusedFiles.length); i++) {
    mapping[unmapped[i]] = unusedFiles[i]
  }

  return mapping
}
