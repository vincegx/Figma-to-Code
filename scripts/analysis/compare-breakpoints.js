#!/usr/bin/env node
/**
 * Compare Breakpoints Analysis
 *
 * Analyzes 3 exported breakpoints to determine:
 * - Component matching via data-name
 * - Structural differences (CSS-only vs component-swap)
 * - Mapping strategy for responsive fusion
 *
 * Usage:
 *   node scripts/analysis/compare-breakpoints.js <desktopDir> <tabletDir> <mobileDir>
 */

import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract data-name attributes from Component-clean.tsx
 */
function extractDataNames(tsxCode) {
  const dataNames = new Set();
  const regex = /data-name="([^"]+)"/g;
  let match;

  while ((match = regex.exec(tsxCode)) !== null) {
    dataNames.add(match[1]);
  }

  return Array.from(dataNames).sort();
}

/**
 * Parse TSX and extract component structure map
 * Returns: Map<data-name, structureInfo>
 */
function extractComponentStructures(tsxCode) {
  const ast = parse(tsxCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const components = new Map();

  traverse.default(ast, {
    JSXElement(path) {
      const dataName = getDataNameAttribute(path.node);
      if (!dataName) return;

      // Get structure hash (normalized JSX without styling)
      const structureHash = getStructureHash(path.node);

      // Get all class names used
      const classNames = extractClassNames(path.node);

      // Count children
      const childrenCount = countJSXChildren(path.node);

      components.set(dataName, {
        structureHash,
        classNames,
        childrenCount,
        nodeType: path.node.openingElement.name.name || 'unknown',
        hasChildren: childrenCount > 0
      });
    }
  });

  return components;
}

/**
 * Get data-name attribute from JSX node
 */
function getDataNameAttribute(node) {
  if (!node.openingElement || !node.openingElement.attributes) return null;

  const attr = node.openingElement.attributes.find(
    a => a.name && a.name.name === 'data-name'
  );

  return attr && attr.value ? attr.value.value : null;
}

/**
 * Extract all className values from a JSX node (recursive)
 */
function extractClassNames(node) {
  const classes = new Set();

  function walk(n) {
    if (!n || typeof n !== 'object') return;

    // Check if this is a JSXAttribute with className
    if (n.type === 'JSXAttribute' && n.name && n.name.name === 'className' && n.value) {
      if (n.value.type === 'StringLiteral') {
        n.value.value.split(/\s+/).forEach(cls => {
          if (cls) classes.add(cls);
        });
      }
    }

    // Recursively walk all properties
    Object.keys(n).forEach(key => {
      if (Array.isArray(n[key])) {
        n[key].forEach(walk);
      } else if (typeof n[key] === 'object') {
        walk(n[key]);
      }
    });
  }

  walk(node);
  return Array.from(classes);
}

/**
 * Count JSX children (not text nodes)
 */
function countJSXChildren(node) {
  if (!node.children) return 0;
  return node.children.filter(c => c.type === 'JSXElement').length;
}

/**
 * Generate structure hash (JSX tree without styling attributes)
 */
function getStructureHash(node) {
  // Clone node and remove styling attributes
  const cloned = JSON.parse(JSON.stringify(node));

  // Remove className, style, data-name from hash
  const removeAttrs = (obj) => {
    if (!obj || typeof obj !== 'object') return;

    if (obj.type === 'JSXElement' && obj.openingElement && obj.openingElement.attributes) {
      obj.openingElement.attributes = obj.openingElement.attributes.filter(attr => {
        if (!attr.name) return true;
        const name = attr.name.name || '';
        return !['className', 'style', 'data-name', 'data-node-id'].includes(name);
      });
    }

    Object.keys(obj).forEach(key => {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(removeAttrs);
      } else if (typeof obj[key] === 'object') {
        removeAttrs(obj[key]);
      }
    });
  };

  removeAttrs(cloned);

  const normalized = JSON.stringify(cloned);
  return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8);
}

/**
 * Compare two component structures
 */
function compareStructures(compA, compB) {
  if (!compA || !compB) {
    return { match: false, reason: 'missing' };
  }

  // Exact structure match
  if (compA.structureHash === compB.structureHash) {
    return { match: true, type: 'exact', strategy: 'css-only' };
  }

  // Children count match (likely same structure, different styling)
  if (compA.childrenCount === compB.childrenCount && compA.nodeType === compB.nodeType) {
    return { match: true, type: 'similar', strategy: 'css-only', confidence: 0.8 };
  }

  // Different structure
  return { match: false, reason: 'structure-diff', strategy: 'component-swap' };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS
// ═══════════════════════════════════════════════════════════════

async function analyzeBreakpoints(desktopDir, tabletDir, mobileDir) {
  console.log('🔍 Analyzing 3 breakpoints for responsive mapping...\n');

  // Read Component-clean.tsx files
  const desktopCode = fs.readFileSync(path.join(desktopDir, 'Component-clean.tsx'), 'utf8');
  const tabletCode = fs.readFileSync(path.join(tabletDir, 'Component-clean.tsx'), 'utf8');
  const mobileCode = fs.readFileSync(path.join(mobileDir, 'Component-clean.tsx'), 'utf8');

  console.log('📂 Reading files...');
  console.log(`   Desktop: ${desktopDir}`);
  console.log(`   Tablet:  ${tabletDir}`);
  console.log(`   Mobile:  ${mobileDir}\n`);

  // Extract data-names
  const desktopNames = extractDataNames(desktopCode);
  const tabletNames = extractDataNames(tabletCode);
  const mobileNames = extractDataNames(mobileCode);

  console.log('📊 Data-name Statistics:');
  console.log(`   Desktop: ${desktopNames.length} unique data-names`);
  console.log(`   Tablet:  ${tabletNames.length} unique data-names`);
  console.log(`   Mobile:  ${mobileNames.length} unique data-names\n`);

  // Find common components
  const allNames = new Set([...desktopNames, ...tabletNames, ...mobileNames]);
  const commonNames = [...allNames].filter(name =>
    desktopNames.includes(name) &&
    tabletNames.includes(name) &&
    mobileNames.includes(name)
  );

  console.log(`✅ Common components (present in all 3): ${commonNames.length}`);

  // Components unique to specific breakpoints
  const desktopOnly = desktopNames.filter(n => !tabletNames.includes(n) || !mobileNames.includes(n));
  const tabletOnly = tabletNames.filter(n => !desktopNames.includes(n) || !mobileNames.includes(n));
  const mobileOnly = mobileNames.filter(n => !desktopNames.includes(n) || !tabletNames.includes(n));

  if (desktopOnly.length > 0) {
    console.log(`\n⚠️  Desktop-only components (${desktopOnly.length}):`);
    desktopOnly.forEach(name => console.log(`     - ${name}`));
  }

  if (tabletOnly.length > 0) {
    console.log(`\n⚠️  Tablet-only components (${tabletOnly.length}):`);
    tabletOnly.forEach(name => console.log(`     - ${name}`));
  }

  if (mobileOnly.length > 0) {
    console.log(`\n⚠️  Mobile-only components (${mobileOnly.length}):`);
    mobileOnly.forEach(name => console.log(`     - ${name}`));
  }

  // Extract structures
  console.log('\n🔬 Analyzing component structures...\n');
  const desktopStructures = extractComponentStructures(desktopCode);
  const tabletStructures = extractComponentStructures(tabletCode);
  const mobileStructures = extractComponentStructures(mobileCode);

  // Compare structures
  const comparisonResults = {
    cssOnly: [],
    componentSwap: [],
    missing: []
  };

  for (const name of commonNames) {
    const desktop = desktopStructures.get(name);
    const tablet = tabletStructures.get(name);
    const mobile = mobileStructures.get(name);

    // Compare Desktop vs Tablet
    const dtCompare = compareStructures(desktop, tablet);
    // Compare Desktop vs Mobile
    const dmCompare = compareStructures(desktop, mobile);
    // Compare Tablet vs Mobile
    const tmCompare = compareStructures(tablet, mobile);

    const result = {
      name,
      desktop,
      tablet,
      mobile,
      dtCompare,
      dmCompare,
      tmCompare
    };

    // Determine overall strategy
    if (dtCompare.match && dmCompare.match && tmCompare.match) {
      // All 3 have same structure → CSS-only
      result.strategy = 'css-only';
      comparisonResults.cssOnly.push(result);
    } else if (!dtCompare.match || !dmCompare.match || !tmCompare.match) {
      // Different structures → Component-swap
      result.strategy = 'component-swap';
      comparisonResults.componentSwap.push(result);
    }
  }

  // Report
  console.log('📋 Mapping Strategy Summary:\n');
  console.log(`   ✅ CSS-only (same structure):     ${comparisonResults.cssOnly.length} components`);
  console.log(`   🔄 Component-swap (diff structure): ${comparisonResults.componentSwap.length} components`);
  console.log(`   ⚠️  Missing/partial:                 ${allNames.size - commonNames.length} components\n`);

  // Detailed breakdown
  if (comparisonResults.componentSwap.length > 0) {
    console.log('🔄 Components requiring Component-swap strategy:\n');
    comparisonResults.componentSwap.forEach(result => {
      console.log(`   📦 ${result.name}`);
      if (!result.dtCompare.match) {
        console.log(`      - Desktop ≠ Tablet (${result.dtCompare.reason})`);
      }
      if (!result.dmCompare.match) {
        console.log(`      - Desktop ≠ Mobile (${result.dmCompare.reason})`);
      }
      if (!result.tmCompare.match) {
        console.log(`      - Tablet ≠ Mobile (${result.tmCompare.reason})`);
      }
    });
    console.log('');
  }

  // Feasibility score
  const totalComponents = allNames.size;
  const matchableComponents = commonNames.length;
  const cssOnlyPercentage = ((comparisonResults.cssOnly.length / matchableComponents) * 100).toFixed(1);
  const feasibilityScore = ((matchableComponents / totalComponents) * 100).toFixed(1);

  console.log('🎯 Feasibility Assessment:\n');
  console.log(`   Total unique components:     ${totalComponents}`);
  console.log(`   Matchable across breakpoints: ${matchableComponents} (${feasibilityScore}%)`);
  console.log(`   CSS-only strategy applicable: ${cssOnlyPercentage}% of matchable components`);

  if (feasibilityScore >= 90) {
    console.log(`\n   ✅ EXCELLENT - Fusion responsive très faisable !`);
  } else if (feasibilityScore >= 70) {
    console.log(`\n   ✅ GOOD - Fusion responsive faisable avec quelques adaptations`);
  } else {
    console.log(`\n   ⚠️  MODERATE - Fusion possible mais complexe`);
  }

  // Save detailed report
  const reportPath = path.join(desktopDir, '../responsive-analysis.json');
  const report = {
    timestamp: new Date().toISOString(),
    breakpoints: {
      desktop: { dir: desktopDir, components: desktopNames.length },
      tablet: { dir: tabletDir, components: tabletNames.length },
      mobile: { dir: mobileDir, components: mobileNames.length }
    },
    summary: {
      totalComponents: totalComponents,
      commonComponents: commonNames.length,
      cssOnlyCount: comparisonResults.cssOnly.length,
      componentSwapCount: comparisonResults.componentSwap.length,
      feasibilityScore: parseFloat(feasibilityScore),
      cssOnlyPercentage: parseFloat(cssOnlyPercentage)
    },
    details: {
      cssOnly: comparisonResults.cssOnly.map(r => r.name),
      componentSwap: comparisonResults.componentSwap.map(r => ({
        name: r.name,
        dtMatch: r.dtCompare.match,
        dmMatch: r.dmCompare.match,
        tmMatch: r.tmCompare.match
      })),
      desktopOnly,
      tabletOnly,
      mobileOnly
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportPath}\n`);
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

const desktopDir = process.argv[2];
const tabletDir = process.argv[3];
const mobileDir = process.argv[4];

if (!desktopDir || !tabletDir || !mobileDir) {
  console.error('Usage: node compare-breakpoints.js <desktopDir> <tabletDir> <mobileDir>');
  process.exit(1);
}

analyzeBreakpoints(desktopDir, tabletDir, mobileDir).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
