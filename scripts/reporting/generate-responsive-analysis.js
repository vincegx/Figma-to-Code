#!/usr/bin/env node
/**
 * Generate Responsive Merge Technical Analysis
 *
 * Creates a markdown file with detailed technical analysis of the responsive merge:
 * - Merge information
 * - Source tests details
 * - Components processed
 * - Global transformations
 * - Per-component statistics
 * - Media queries
 * - Matching strategy
 *
 * Usage:
 *   node scripts/reporting/generate-responsive-analysis.js <merge-directory>
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ═══════════════════════════════════════════════════════════════
// CLI ARGUMENTS
// ═══════════════════════════════════════════════════════════════

const mergeDir = process.argv[2]

if (!mergeDir) {
  console.error('Usage: node generate-responsive-analysis.js <merge-directory>')
  process.exit(1)
}

console.log('📝 Generating technical analysis...')
console.log(`   Merge directory: ${mergeDir}`)

// ═══════════════════════════════════════════════════════════════
// LOAD DATA
// ═══════════════════════════════════════════════════════════════

const mergeId = path.basename(mergeDir)

// Load responsive-metadata.json
let metadata = {}
try {
  metadata = JSON.parse(fs.readFileSync(path.join(mergeDir, 'responsive-metadata.json'), 'utf-8'))
} catch (e) {
  console.error('❌ responsive-metadata.json not found')
  process.exit(1)
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ═══════════════════════════════════════════════════════════════
// GENERATE MARKDOWN
// ═══════════════════════════════════════════════════════════════

function generateMarkdown(data) {
  const lines = []

  // Header
  lines.push('# Responsive Merge Technical Analysis')
  lines.push('')
  lines.push(`> Generated on ${formatDate(new Date())}`)
  lines.push('')

  // Merge Information
  lines.push('## 📋 Merge Information')
  lines.push('')
  lines.push(`- **Merge ID:** \`${data.mergeId}\``)
  lines.push(`- **Timestamp:** ${formatDate(data.timestamp)}`)
  lines.push(`- **Breakpoints:**`)
  lines.push(`  - Desktop: ${data.breakpoints.desktop.width}px`)
  lines.push(`  - Tablet: ${data.breakpoints.tablet.width}px`)
  lines.push(`  - Mobile: ${data.breakpoints.mobile.width}px`)
  lines.push('')

  // Source Tests
  lines.push('## 🔗 Source Tests')
  lines.push('')
  lines.push('| Breakpoint | Test ID | Width | Height |')
  lines.push('|------------|---------|-------|--------|')
  lines.push(`| Desktop | \`${data.breakpoints.desktop.testId}\` | ${data.breakpoints.desktop.width}px | ${data.breakpoints.desktop.height}px |`)
  lines.push(`| Tablet | \`${data.breakpoints.tablet.testId}\` | ${data.breakpoints.tablet.width}px | ${data.breakpoints.tablet.height}px |`)
  lines.push(`| Mobile | \`${data.breakpoints.mobile.testId}\` | ${data.breakpoints.mobile.width}px | ${data.breakpoints.mobile.height}px |`)
  lines.push('')

  // Components Processed
  lines.push('## 🧩 Components Processed')
  lines.push('')
  lines.push(`- **Total Components:** ${data.mergeStats.totalComponents}`)
  lines.push(`- **Success Count:** ${data.mergeStats.successCount}`)
  lines.push(`- **Error Count:** ${data.mergeStats.errorCount}`)
  lines.push('')
  lines.push('### Component List')
  lines.push('')
  data.components.forEach((comp, i) => {
    lines.push(`${i + 1}. \`${comp}\``)
  })
  lines.push('')

  // Global Transformations
  lines.push('## ⚙️ Global Transformations')
  lines.push('')
  lines.push(`- **Elements Processed:** ${data.transformations.totalElementsProcessed}`)
  lines.push(`- **Classes Merged:** ${data.transformations.totalClassesMerged}`)
  lines.push(`- **Conflicts Resolved:** ${data.transformations.conflicts.totalConflicts}`)
  lines.push(`- **Elements with Conflicts:** ${data.transformations.conflicts.elementsWithConflicts}`)
  lines.push(`- **Horizontal Scroll Added:** ${data.transformations.horizontalScrollAdded}`)
  lines.push(`- **Resets Applied:** ${data.transformations.resetsApplied}`)
  lines.push(`- **Visibility Classes Injected:** ${data.transformations.visibilityClassesInjected}`)
  lines.push('')

  // Matching Strategy
  lines.push('### 🎯 Matching Strategy')
  lines.push('')
  lines.push(`- **By data-name:** ${data.transformations.matchingStrategy.byDataName} matches`)
  lines.push(`- **By position:** ${data.transformations.matchingStrategy.byPosition} matches`)
  lines.push('')

  // Missing Elements
  if (data.transformations.missingElements && data.transformations.missingElements.length > 0) {
    lines.push('### ⚠️ Missing Elements (Desktop only)')
    lines.push('')
    data.transformations.missingElements.forEach(elem => {
      lines.push(`- \`${elem}\``)
    })
    lines.push('')
  }

  // Per-Component Statistics
  lines.push('## 📊 Per-Component Statistics')
  lines.push('')

  if (data.detailedStats && data.detailedStats.components) {
    Object.entries(data.detailedStats.components).forEach(([compName, compStats]) => {
      lines.push(`### ${compName}`)
      lines.push('')

      // Table header
      lines.push('| Transformation | Value | Details |')
      lines.push('|----------------|-------|---------|')

      // Missing elements
      if (compStats['detect-missing-elements']) {
        const stats = compStats['detect-missing-elements']
        lines.push(`| Missing Elements | ${stats.elementsDetected} | ${stats.elements.length > 0 ? stats.elements.join(', ') : 'None'} |`)
      }

      // Normalize identical classes
      if (compStats['normalize-identical-classes']) {
        const stats = compStats['normalize-identical-classes']
        lines.push(`| Identical Classes | ${stats.totalIdenticalClasses} | ${stats.elementsProcessed} elements |`)
      }

      // Conflicts
      if (compStats['detect-class-conflicts']) {
        const stats = compStats['detect-class-conflicts']
        lines.push(`| Conflicts Detected | ${stats.totalConflicts} | ${stats.elementsWithConflicts} elements |`)
      }

      // Merge
      if (compStats['merge-desktop-first']) {
        const stats = compStats['merge-desktop-first']
        lines.push(`| Elements Merged | ${stats.elementsMerged} | ${stats.totalClassesMerged} classes |`)
        lines.push(`| Matching | By name: ${stats.matchedByDataName}, By position: ${stats.matchedByPosition} | Skipped: ${stats.skippedNoMatch} |`)
      }

      // Horizontal scroll
      if (compStats['add-horizontal-scroll']) {
        const stats = compStats['add-horizontal-scroll']
        if (stats.parentsUpdated > 0) {
          lines.push(`| Horizontal Scroll | ${stats.parentsUpdated} | ${stats.totalOverflowAdded} overflow added |`)
        }
      }

      // Resets
      if (compStats['reset-dependent-properties']) {
        const stats = compStats['reset-dependent-properties']
        if (stats.totalResetsAdded > 0) {
          const resetDetails = Object.entries(stats.resetsByRule)
            .filter(([_, count]) => count > 0)
            .map(([rule, count]) => `${rule}: ${count}`)
            .join(', ')
          lines.push(`| Resets Applied | ${stats.totalResetsAdded} | ${resetDetails} |`)
        }
      }

      // Visibility classes
      if (compStats['inject-visibility-classes']) {
        const stats = compStats['inject-visibility-classes']
        if (stats.visibilityClassesInjected > 0) {
          lines.push(`| Visibility Classes | ${stats.visibilityClassesInjected} | ${stats.elements.join(', ')} |`)
        }
      }

      lines.push('')
    })
  }

  // Page-level stats
  if (data.detailedStats && data.detailedStats.page) {
    lines.push('### 📄 Page (Global)')
    lines.push('')

    const pageStats = data.detailedStats.page

    lines.push('| Transformation | Value | Details |')
    lines.push('|----------------|-------|---------|')

    if (pageStats['detect-missing-elements']) {
      const stats = pageStats['detect-missing-elements']
      lines.push(`| Missing Elements | ${stats.elementsDetected} | ${stats.elements.length > 0 ? stats.elements.join(', ') : 'None'} |`)
    }

    if (pageStats['normalize-identical-classes']) {
      const stats = pageStats['normalize-identical-classes']
      lines.push(`| Identical Classes | ${stats.totalIdenticalClasses} | ${stats.elementsProcessed} elements |`)
    }

    if (pageStats['detect-class-conflicts']) {
      const stats = pageStats['detect-class-conflicts']
      lines.push(`| Conflicts Detected | ${stats.totalConflicts} | ${stats.elementsWithConflicts} elements |`)
    }

    if (pageStats['merge-desktop-first']) {
      const stats = pageStats['merge-desktop-first']
      lines.push(`| Elements Merged | ${stats.elementsMerged} | ${stats.totalClassesMerged} classes |`)
      lines.push(`| Matching | By name: ${stats.matchedByDataName}, By position: ${stats.matchedByPosition} | Skipped: ${stats.skippedNoMatch} |`)
    }

    if (pageStats['add-horizontal-scroll']) {
      const stats = pageStats['add-horizontal-scroll']
      if (stats.parentsUpdated > 0) {
        lines.push(`| Horizontal Scroll | ${stats.parentsUpdated} | ${stats.totalOverflowAdded} overflow added |`)
      }
    }

    if (pageStats['reset-dependent-properties']) {
      const stats = pageStats['reset-dependent-properties']
      if (stats.totalResetsAdded > 0) {
        const resetDetails = Object.entries(stats.resetsByRule)
          .filter(([_, count]) => count > 0)
          .map(([rule, count]) => `${rule}: ${count}`)
          .join(', ')
        lines.push(`| Resets Applied | ${stats.totalResetsAdded} | ${resetDetails} |`)
      }
    }

    if (pageStats['inject-visibility-classes']) {
      const stats = pageStats['inject-visibility-classes']
      if (stats.visibilityClassesInjected > 0) {
        lines.push(`| Visibility Classes | ${stats.visibilityClassesInjected} | ${stats.elements.join(', ')} |`)
      }
    }

    lines.push('')
  }

  // Media Queries
  lines.push('## 📱 Media Queries Generated')
  lines.push('')
  lines.push('```css')
  Object.entries(data.mediaQueries).forEach(([breakpoint, query]) => {
    lines.push(`/* ${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} */`)
    lines.push(query)
    lines.push('')
  })
  lines.push('```')
  lines.push('')

  // Footer
  lines.push('---')
  lines.push('')
  lines.push('*Generated by MCP Figma to Code - Responsive Merger*')

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// PREPARE DATA
// ═══════════════════════════════════════════════════════════════

const analysisData = {
  mergeId,
  timestamp: metadata.timestamp,
  breakpoints: metadata.breakpoints,
  components: metadata.components || [],
  mergeStats: metadata.mergeStats || {},
  transformations: metadata.transformations || {},
  mediaQueries: metadata.mediaQueries || {},
  detailedStats: metadata.detailedStats || {}
}

// ═══════════════════════════════════════════════════════════════
// WRITE MARKDOWN FILE
// ═══════════════════════════════════════════════════════════════

const markdownContent = generateMarkdown(analysisData)
const outputPath = path.join(mergeDir, 'technical-analysis.md')

fs.writeFileSync(outputPath, markdownContent, 'utf-8')

console.log(`✅ Technical analysis generated: ${outputPath}`)
console.log(`   📊 ${analysisData.components.length} components analyzed`)
console.log(`   ⚙️  ${analysisData.transformations.totalElementsProcessed || 0} elements processed`)
