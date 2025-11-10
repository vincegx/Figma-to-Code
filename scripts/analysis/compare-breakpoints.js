#!/usr/bin/env node
/**
 * Compare Breakpoints Analysis (Modular Components)
 *
 * Analyzes modular components from PHASE 1 across 3 breakpoints to determine:
 * - Which modular components exist in each breakpoint
 * - Structural differences (CSS-only vs component-swap)
 * - Mapping strategy for responsive fusion
 *
 * Usage:
 *   node scripts/analysis/compare-breakpoints.js <desktopDir> <tabletDir> <mobileDir>
 *
 * Note: Expects modular/ directories created by component-splitter.js
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
 * Get list of modular component files (.tsx) from a directory
 */
function getModularComponents(breakpointDir) {
  const modularDir = path.join(breakpointDir, 'modular');

  if (!fs.existsSync(modularDir)) {
    return [];
  }

  return fs.readdirSync(modularDir)
    .filter(file => file.endsWith('.tsx'))
    .map(file => path.basename(file, '.tsx'))
    .sort();
}

/**
 * Read and parse a modular component file
 */
function readModularComponent(breakpointDir, componentName) {
  const filePath = path.join(breakpointDir, 'modular', `${componentName}.tsx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Parse TSX and extract component structure info
 */
function analyzeComponentStructure(tsxCode) {
  const ast = parse(tsxCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  let jsxStructure = null;
  let componentName = null;
  const classNames = new Set();
  let jsxElementCount = 0;

  traverse.default(ast, {
    // Get component function name
    FunctionDeclaration(path) {
      if (!componentName && path.node.id) {
        componentName = path.node.id.name;
      }
    },
    ExportDefaultDeclaration(path) {
      if (path.node.declaration && path.node.declaration.id) {
        componentName = path.node.declaration.id.name;
      }
    },
    // Get main JSX return structure
    ReturnStatement(path) {
      if (!jsxStructure && path.node.argument && path.node.argument.type === 'JSXElement') {
        jsxStructure = path.node.argument;
      }
    },
    // Count all JSX elements
    JSXElement(path) {
      jsxElementCount++;
    },
    // Extract class names
    JSXAttribute(path) {
      if (path.node.name && path.node.name.name === 'className' && path.node.value) {
        if (path.node.value.type === 'StringLiteral') {
          path.node.value.value.split(/\s+/).forEach(cls => {
            if (cls) classNames.add(cls);
          });
        }
      }
    }
  });

  if (!jsxStructure) {
    return null;
  }

  return {
    componentName,
    structureHash: getStructureHash(jsxStructure),
    jsxElementCount,
    classNames: Array.from(classNames),
    linesOfCode: tsxCode.split('\n').length,
    fileSize: Buffer.byteLength(tsxCode, 'utf8')
  };
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
 * Compare two modular component structures
 */
function compareModularComponents(compA, compB) {
  if (!compA || !compB) {
    return { match: false, reason: 'missing', strategy: 'component-swap' };
  }

  // Exact structure match (hash identical)
  if (compA.structureHash === compB.structureHash) {
    return { match: true, type: 'exact', strategy: 'css-only', confidence: 1.0 };
  }

  // Similar element count (tolerance: ±10%)
  const elementDiff = Math.abs(compA.jsxElementCount - compB.jsxElementCount);
  const avgElements = (compA.jsxElementCount + compB.jsxElementCount) / 2;
  const elementSimilarity = 1 - (elementDiff / avgElements);

  if (elementSimilarity > 0.9) {
    // Very similar structure (likely just styling differences)
    return { match: true, type: 'similar', strategy: 'css-only', confidence: elementSimilarity };
  } else if (elementSimilarity > 0.7) {
    // Moderate similarity (check further)
    return { match: true, type: 'moderate', strategy: 'css-only', confidence: elementSimilarity, warning: 'Manual verification recommended' };
  }

  // Different structure
  return { match: false, reason: 'structure-diff', strategy: 'component-swap', elementDiff };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS
// ═══════════════════════════════════════════════════════════════

async function analyzeBreakpoints(desktopDir, tabletDir, mobileDir) {
  console.log('🔍 Analyzing modular components across 3 breakpoints...\n');

  console.log('📂 Reading directories...');
  console.log(`   Desktop: ${desktopDir}`);
  console.log(`   Tablet:  ${tabletDir}`);
  console.log(`   Mobile:  ${mobileDir}\n`);

  // Get modular components from each breakpoint
  const desktopComponents = getModularComponents(desktopDir);
  const tabletComponents = getModularComponents(tabletDir);
  const mobileComponents = getModularComponents(mobileDir);

  console.log('📊 Modular Components Found:');
  console.log(`   Desktop: ${desktopComponents.length} components`);
  console.log(`   Tablet:  ${tabletComponents.length} components`);
  console.log(`   Mobile:  ${mobileComponents.length} components\n`);

  if (desktopComponents.length === 0 || tabletComponents.length === 0 || mobileComponents.length === 0) {
    console.error('❌ Error: One or more breakpoints missing modular/ directory');
    console.error('   Run component-splitter.js first with --split-components flag\n');
    process.exit(1);
  }

  // List components
  console.log('📝 Component List:');
  console.log(`   Desktop: ${desktopComponents.join(', ')}`);
  console.log(`   Tablet:  ${tabletComponents.join(', ')}`);
  console.log(`   Mobile:  ${mobileComponents.join(', ')}\n`);

  // Find common components
  const allComponents = new Set([...desktopComponents, ...tabletComponents, ...mobileComponents]);
  const commonComponents = [...allComponents].filter(name =>
    desktopComponents.includes(name) &&
    tabletComponents.includes(name) &&
    mobileComponents.includes(name)
  );

  console.log(`✅ Common components (present in all 3): ${commonComponents.length}/${allComponents.size}`);

  // Components unique to specific breakpoints
  const desktopOnly = desktopComponents.filter(n => !tabletComponents.includes(n) || !mobileComponents.includes(n));
  const tabletOnly = tabletComponents.filter(n => !desktopComponents.includes(n) || !mobileComponents.includes(n));
  const mobileOnly = mobileComponents.filter(n => !desktopComponents.includes(n) || !tabletComponents.includes(n));

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

  // Analyze structures
  console.log('\n🔬 Analyzing component structures...\n');

  const comparisonResults = {
    cssOnly: [],
    componentSwap: [],
    missing: []
  };

  for (const componentName of commonComponents) {
    // Read and analyze each component
    const desktopCode = readModularComponent(desktopDir, componentName);
    const tabletCode = readModularComponent(tabletDir, componentName);
    const mobileCode = readModularComponent(mobileDir, componentName);

    const desktopAnalysis = analyzeComponentStructure(desktopCode);
    const tabletAnalysis = analyzeComponentStructure(tabletCode);
    const mobileAnalysis = analyzeComponentStructure(mobileCode);

    // Compare structures
    const dtCompare = compareModularComponents(desktopAnalysis, tabletAnalysis);
    const dmCompare = compareModularComponents(desktopAnalysis, mobileAnalysis);
    const tmCompare = compareModularComponents(tabletAnalysis, mobileAnalysis);

    const result = {
      name: componentName,
      desktop: desktopAnalysis,
      tablet: tabletAnalysis,
      mobile: mobileAnalysis,
      dtCompare,
      dmCompare,
      tmCompare
    };

    // Determine overall strategy
    if (dtCompare.match && dmCompare.match && tmCompare.match) {
      // All 3 have same structure → CSS-only
      result.strategy = 'css-only';
      result.confidence = Math.min(dtCompare.confidence, dmCompare.confidence, tmCompare.confidence);
      comparisonResults.cssOnly.push(result);
    } else {
      // Different structures → Component-swap
      result.strategy = 'component-swap';
      comparisonResults.componentSwap.push(result);
    }
  }

  // Report
  console.log('📋 Mapping Strategy Summary:\n');
  console.log(`   ✅ CSS-only (same structure):       ${comparisonResults.cssOnly.length} components`);
  console.log(`   🔄 Component-swap (diff structure): ${comparisonResults.componentSwap.length} components`);
  console.log(`   ⚠️  Missing/partial:                 ${allComponents.size - commonComponents.length} components\n`);

  // Detailed breakdown
  if (comparisonResults.componentSwap.length > 0) {
    console.log('🔄 Components requiring Component-swap strategy:\n');
    comparisonResults.componentSwap.forEach(result => {
      console.log(`   📦 ${result.name}`);
      console.log(`      Desktop: ${result.desktop?.jsxElementCount || 0} elements`);
      console.log(`      Tablet:  ${result.tablet?.jsxElementCount || 0} elements`);
      console.log(`      Mobile:  ${result.mobile?.jsxElementCount || 0} elements`);
      if (!result.dtCompare.match) {
        console.log(`      ⚠️  Desktop ≠ Tablet (${result.dtCompare.reason})`);
      }
      if (!result.dmCompare.match) {
        console.log(`      ⚠️  Desktop ≠ Mobile (${result.dmCompare.reason})`);
      }
      if (!result.tmCompare.match) {
        console.log(`      ⚠️  Tablet ≠ Mobile (${result.tmCompare.reason})`);
      }
      console.log('');
    });
  }

  // CSS-only components with confidence levels
  if (comparisonResults.cssOnly.length > 0) {
    const lowConfidence = comparisonResults.cssOnly.filter(r => r.confidence < 0.95);
    if (lowConfidence.length > 0) {
      console.log('⚠️  CSS-only components with moderate confidence (<95%):\n');
      lowConfidence.forEach(result => {
        console.log(`   📦 ${result.name} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
        console.log(`      Desktop: ${result.desktop?.jsxElementCount || 0} elements`);
        console.log(`      Tablet:  ${result.tablet?.jsxElementCount || 0} elements`);
        console.log(`      Mobile:  ${result.mobile?.jsxElementCount || 0} elements\n`);
      });
    }
  }

  // Feasibility score
  const totalComponents = allComponents.size;
  const matchableComponents = commonComponents.length;
  const cssOnlyPercentage = matchableComponents > 0
    ? ((comparisonResults.cssOnly.length / matchableComponents) * 100).toFixed(1)
    : 0;
  const feasibilityScore = totalComponents > 0
    ? ((matchableComponents / totalComponents) * 100).toFixed(1)
    : 0;

  console.log('🎯 Feasibility Assessment:\n');
  console.log(`   Total modular components:     ${totalComponents}`);
  console.log(`   Matchable across breakpoints: ${matchableComponents} (${feasibilityScore}%)`);
  console.log(`   CSS-only strategy applicable: ${cssOnlyPercentage}% of matchable components`);

  if (feasibilityScore >= 90 && cssOnlyPercentage >= 90) {
    console.log(`\n   ✅ EXCELLENT - Fusion responsive très faisable !`);
  } else if (feasibilityScore >= 70 && cssOnlyPercentage >= 70) {
    console.log(`\n   ✅ GOOD - Fusion responsive faisable avec quelques adaptations`);
  } else if (matchableComponents === 0) {
    console.log(`\n   ❌ POOR - Aucun composant commun trouvé`);
  } else {
    console.log(`\n   ⚠️  MODERATE - Fusion possible mais complexe`);
  }

  // Save detailed report
  const reportPath = path.join(desktopDir, '../responsive-analysis.json');
  const report = {
    timestamp: new Date().toISOString(),
    analysisType: 'modular-components',
    breakpoints: {
      desktop: { dir: desktopDir, components: desktopComponents.length, list: desktopComponents },
      tablet: { dir: tabletDir, components: tabletComponents.length, list: tabletComponents },
      mobile: { dir: mobileDir, components: mobileComponents.length, list: mobileComponents }
    },
    summary: {
      totalComponents: totalComponents,
      commonComponents: commonComponents.length,
      cssOnlyCount: comparisonResults.cssOnly.length,
      componentSwapCount: comparisonResults.componentSwap.length,
      feasibilityScore: parseFloat(feasibilityScore),
      cssOnlyPercentage: parseFloat(cssOnlyPercentage)
    },
    details: {
      cssOnly: comparisonResults.cssOnly.map(r => ({
        name: r.name,
        confidence: r.confidence,
        desktopElements: r.desktop?.jsxElementCount || 0,
        tabletElements: r.tablet?.jsxElementCount || 0,
        mobileElements: r.mobile?.jsxElementCount || 0
      })),
      componentSwap: comparisonResults.componentSwap.map(r => ({
        name: r.name,
        dtMatch: r.dtCompare.match,
        dmMatch: r.dmCompare.match,
        tmMatch: r.tmCompare.match,
        desktopElements: r.desktop?.jsxElementCount || 0,
        tabletElements: r.tablet?.jsxElementCount || 0,
        mobileElements: r.mobile?.jsxElementCount || 0
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
