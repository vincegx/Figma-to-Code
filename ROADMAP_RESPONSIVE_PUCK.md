# 🗺️ Roadmap Complète: Figma → Puck Responsive Workflow

**Date:** 2025-11-10
**Version:** 1.0
**Projet:** MCP Figma to Code - Extension Responsive Multi-Breakpoint avec Puck

---

## 📊 Contexte Validé

✅ **Component-clean.tsx garde les `data-name`** (keepDataName: true dans unified-processor.js:517)
✅ **98% des composants sont CSS-only** (même structure JSX entre breakpoints)
✅ **92.7% de matching cross-breakpoint** (51/55 composants communs)
✅ **1 seul composant nécessite component-swap** (`menu right`)
✅ **Puck supporte React 19** (`^18.0.0 || ^19.0.0`)

## 📖 Terminologie Clé

### CSS Scopé (Phase 1)
Filtrer CSS global → garder uniquement classes utilisées par chunk
- **Input:** Component-clean.css (7KB global)
- **Output:** Header.css (1.5KB scopé)
- **Objectif:** Performance (réduire taille CSS par composant)

### CSS-only Strategy (Phase 4)
Composants avec même structure JSX sur Desktop/Tablet/Mobile
- **Detection:** Structure JSX identique entre breakpoints
- **Solution:** Media queries (pas de variants React)
- **Exemple:** 50 composants (98%) - Header, Footer, AccountOverview...

### Component-swap Strategy (Phase 4)
Composants avec structure JSX différente entre breakpoints
- **Detection:** Structure JSX change (ex: menu complet → hamburger)
- **Solution:** Variants React avec props
- **Exemple:** 1 composant (2%) - MenuRight

**Tests de référence:**
- Desktop 1440px: `node-6055-2436-1762733564`
- Tablet 960px: `node-6055-2654-1762712319`
- Mobile 420px: `node-6055-2872-1762733537`

**Analyse complète:** `src/generated/tests/responsive-analysis.json`

---

## 🎯 Architecture Globale

```
Figma Designs (3 breakpoints)
    ↓ MCP extraction + AST transforms
Component-clean.tsx (with data-name) × 3
    ↓ Component Splitter
modular/ (50+ chunks) × 3
    ↓ Breakpoint Analysis
responsive-analysis.json
    ↓ Responsive Merger
merged-responsive/
    ├─ components/ (50 CSS-only + 1 component-swap)
    ├─ puck.config.tsx
    └─ responsive-map.json
    ↓ Puck Editor
Dashboard intégré (WYSIWYG editing)
```

---

# 📋 Workflow Complet (6 Phases)

## PHASE 0: Export Figma (Manuel - Utilisateur)

**Prérequis:**
- Figma Desktop app running
- MCP server accessible (port 3845)
- 3 designs Figma prêts (Desktop, Tablet, Mobile)

**Commandes:**

```bash
# 1. Desktop (1440px)
docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "https://www.figma.com/design/FILE_ID?node-id=DESKTOP-NODE" \
  --clean

# 2. Tablet (960px)
docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "https://www.figma.com/design/FILE_ID?node-id=TABLET-NODE" \
  --clean

# 3. Mobile (420px)
docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "https://www.figma.com/design/FILE_ID?node-id=MOBILE-NODE" \
  --clean
```

**Output:**

```
src/generated/tests/
├─ node-XXXX-DESKTOP-TIMESTAMP/
│  ├─ Component-clean.tsx       ← data-name préservés ✅
│  ├─ Component-clean.css       ← CSS global (~7KB)
│  ├─ Component-fixed.tsx       ← Tailwind version
│  ├─ img/                      ← Images organisées
│  ├─ metadata.xml              ← Hiérarchie Figma
│  ├─ metadata.json             ← Dashboard metadata
│  └─ report.html               ← Visual comparison
├─ node-XXXX-TABLET-TIMESTAMP/
│  └─ ... (même structure)
└─ node-XXXX-MOBILE-TIMESTAMP/
   └─ ... (même structure)
```

**Durée:** 30 minutes (3 exports × 4 MCP calls × ~2-3 min)

---

## PHASE 1: Component Splitting

**Objectif:** Découper Component-clean.tsx en composants modulaires avec CSS scopé

### Étape 1.1: Ajouter Flag `--split-components`

**Fichier:** `scripts/unified-processor.js`
**Ligne:** Après 929

```javascript
// After report generation...
console.log('\n✅ Unified processing complete!');

// NOUVEAU: Component splitting (optionnel)
if (process.argv.includes('--split-components')) {
  console.log('\n🔪 Splitting components into modular chunks...');
  try {
    const { splitComponent } = await import('./post-processing/component-splitter.js');
    await splitComponent(testDir);
  } catch (error) {
    console.error(`❌ Error splitting components: ${error.message}`);
  }
}

process.exit(0);
```

### Étape 1.2: Créer Component Splitter

**Fichier:** `scripts/post-processing/component-splitter.js`

**Fonctionnalités:**
1. Parser Component-clean.tsx avec Babel
2. Détecter sections via `data-name` attributes (enfants directs du return)
3. Générer chunks TSX individuels
4. Extraire CSS scopé (uniquement classes utilisées)

**Algorithme de détection:**

```javascript
/**
 * Detect top-level sections with data-name
 */
function detectSections(tsxCode) {
  const ast = parse(tsxCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const sections = [];

  traverse.default(ast, {
    // Find the main component's return statement
    ReturnStatement(path) {
      const rootJSX = path.node.argument;

      // Get direct children of root element
      if (rootJSX.children) {
        rootJSX.children.forEach(child => {
          if (child.type === 'JSXElement') {
            const dataName = getDataNameAttribute(child);

            if (dataName) {
              sections.push({
                name: dataName,
                ast: child,
                jsx: generate(child).code
              });
            }
          }
        });
      }
    }
  });

  return sections;
}
```

**Algorithme CSS scopé:**

```javascript
/**
 * Generate scoped CSS for a chunk
 */
function generateScopedCSS(chunkCode, globalCSS) {
  // 1. Extract all classes used in chunk
  const usedClasses = extractClassNamesFromCode(chunkCode);
  // Result: Set(['bg-custom-fcfcfc', 'flex', 'h-custom-36', ...])

  // 2. Parse global CSS
  const cssSections = parseCssSections(globalCSS);

  // 3. Filter CSS to keep only:
  //    - @import (Google Fonts)
  //    - :root variables (always shared)
  //    - Figma utilities (.content-start, .content-end)
  //    - Custom classes used by this chunk

  let scopedCSS = '';

  // Always include imports
  if (cssSections.imports) {
    scopedCSS += cssSections.imports + '\n\n';
  }

  // Always include :root
  if (cssSections.root) {
    scopedCSS += cssSections.root + '\n\n';
  }

  // Always include utilities
  if (cssSections.utilities) {
    scopedCSS += cssSections.utilities + '\n\n';
  }

  // Filter custom classes
  scopedCSS += filterCSSClasses(cssSections.customClasses, usedClasses);

  return scopedCSS;
}

/**
 * Extract class names from TSX code
 */
function extractClassNamesFromCode(tsxCode) {
  const classes = new Set();
  const classNameRegex = /className="([^"]+)"/g;

  let match;
  while ((match = classNameRegex.exec(tsxCode)) !== null) {
    match[1].split(/\s+/).forEach(cls => {
      if (cls) classes.add(cls);
    });
  }

  return classes;
}

/**
 * Filter CSS to keep only used classes
 */
function filterCSSClasses(cssContent, usedClasses) {
  const lines = cssContent.split('\n');
  const filteredLines = [];
  let currentRule = [];
  let keepCurrentRule = false;

  for (const line of lines) {
    // Detect class definition: .className {
    const classMatch = line.match(/^\.([a-z0-9_-]+)\s*\{/);

    if (classMatch) {
      // Start new rule
      const className = classMatch[1];
      keepCurrentRule = usedClasses.has(className);
      currentRule = [line];
    } else if (line.includes('}') && currentRule.length > 0) {
      // End of rule
      currentRule.push(line);
      if (keepCurrentRule) {
        filteredLines.push(...currentRule);
      }
      currentRule = [];
    } else if (currentRule.length > 0) {
      // Inside rule
      currentRule.push(line);
    } else {
      // Keep comments, section headers
      if (line.startsWith('/*') || line.trim() === '') {
        filteredLines.push(line);
      }
    }
  }

  return filteredLines.join('\n');
}
```

**Structure du fichier complet:**

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

// Import toPascalCase from chunking.js (réutilisation)
import { toPascalCase } from '../utils/chunking.js';

export async function splitComponent(testDir) {
  console.log('🔪 Splitting Component-clean.tsx into modular chunks...\n');

  // 1. Read files
  const cleanPath = path.join(testDir, 'Component-clean.tsx');
  const cssPath = path.join(testDir, 'Component-clean.css');

  const cleanCode = fs.readFileSync(cleanPath, 'utf8');
  const globalCSS = fs.readFileSync(cssPath, 'utf8');

  // 2. Detect sections
  const sections = detectSections(cleanCode);
  console.log(`   Found ${sections.length} sections:\n`);
  sections.forEach(s => console.log(`     - ${s.name}`));

  // 3. Create modular/ directory
  const modularDir = path.join(testDir, 'modular');
  if (!fs.existsSync(modularDir)) {
    fs.mkdirSync(modularDir, { recursive: true });
  }

  // 4. Generate chunks
  for (const section of sections) {
    const chunkName = toPascalCase(section.name);

    // Generate TSX
    const chunkCode = generateChunkCode(chunkName, section.jsx);
    fs.writeFileSync(
      path.join(modularDir, `${chunkName}.tsx`),
      chunkCode
    );

    // Generate scoped CSS
    const scopedCSS = generateScopedCSS(section.jsx, globalCSS);
    fs.writeFileSync(
      path.join(modularDir, `${chunkName}.css`),
      scopedCSS
    );

    console.log(`   ✅ ${chunkName}.tsx + .css (${scopedCSS.length} bytes CSS)`);
  }

  console.log(`\n✅ Splitting complete: ${sections.length} chunks created\n`);
}

function generateChunkCode(chunkName, jsx) {
  return `import React from 'react';
import './${chunkName}.css';

export default function ${chunkName}() {
  return ${jsx};
}
`;
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const testDir = process.argv[2];
  if (!testDir) {
    console.error('Usage: node component-splitter.js <testDir>');
    process.exit(1);
  }
  splitComponent(testDir);
}
```

### Étape 1.3: Exporter `toPascalCase` depuis chunking.js

**Fichier:** `scripts/utils/chunking.js`
**Ligne:** Après fonction existante

```javascript
// Export for reuse in component-splitter
export function toPascalCase(name) {
  // Remove spaces and special chars, keep alphanumeric
  let cleaned = name.replace(/[^a-zA-Z0-9]/g, '');

  // If starts with number, prefix with "Chunk"
  if (/^\d/.test(cleaned)) {
    cleaned = 'Chunk' + cleaned;
  }

  // Ensure first letter is uppercase
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
```

### Utilisation

```bash
# Re-run analyses avec --split-components
docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "URL-DESKTOP" \
  --clean --split-components

docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "URL-TABLET" \
  --clean --split-components

docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "URL-MOBILE" \
  --clean --split-components
```

**Output:**

```
src/generated/tests/
├─ node-6055-2436-1762733564/  (Desktop)
│  ├─ Component-clean.tsx
│  ├─ Component-clean.css
│  └─ modular/                  ← NOUVEAU !
│     ├─ Header.tsx             ← data-name="header"
│     ├─ Header.css             ← CSS scopé (1.5KB vs 7KB global)
│     ├─ MenuRight.tsx
│     ├─ MenuRight.css
│     ├─ AccountOverview.tsx
│     ├─ AccountOverview.css
│     └─ ... (50+ composants)
├─ node-6055-2654-1762712319/  (Tablet)
│  └─ modular/ (même structure)
└─ node-6055-2872-1762733537/  (Mobile)
   └─ modular/ (même structure)
```

**Durée:** 2 jours développement + tests

---

## PHASE 2: Breakpoint Analysis

**Objectif:** Analyser les 3 exports pour déterminer stratégie de fusion

**Script:** `scripts/analysis/compare-breakpoints.js` ✅ (déjà créé)

**Utilisation:**

```bash
node scripts/analysis/compare-breakpoints.js \
  src/generated/tests/node-6055-2436-1762733564 \
  src/generated/tests/node-6055-2654-1762712319 \
  src/generated/tests/node-6055-2872-1762733537
```

**Output Console:**

```
🔍 Analyzing 3 breakpoints for responsive mapping...

📊 Data-name Statistics:
   Desktop: 53 unique data-names
   Tablet:  53 unique data-names
   Mobile:  52 unique data-names

✅ Common components (present in all 3): 51

📋 Mapping Strategy Summary:
   ✅ CSS-only (same structure):     50 components
   🔄 Component-swap (diff structure): 1 components

🎯 Feasibility Assessment:
   Total unique components:     55
   Matchable across breakpoints: 51 (92.7%)
   CSS-only strategy applicable: 98.0% of matchable components

   ✅ EXCELLENT - Fusion responsive très faisable !

📄 Detailed report saved: src/generated/tests/responsive-analysis.json
```

**Output File:** `src/generated/tests/responsive-analysis.json`

```json
{
  "timestamp": "2025-11-10T00:32:21.908Z",
  "summary": {
    "totalComponents": 55,
    "commonComponents": 51,
    "cssOnlyCount": 50,
    "componentSwapCount": 1,
    "feasibilityScore": 92.7,
    "cssOnlyPercentage": 98.0
  },
  "details": {
    "cssOnly": [
      "Header", "Footer", "AccountOverview", ...
    ],
    "componentSwap": [
      {
        "name": "menu right",
        "dtMatch": true,
        "dmMatch": false,
        "tmMatch": false
      }
    ]
  }
}
```

**Durée:** ✅ Déjà implémenté

---

## PHASE 3: UI Sélection Tests

**Objectif:** Interface dashboard pour sélectionner les 3 breakpoints à fusionner

### Étape 3.1: Créer Page `/tests/merge`

**Fichier:** `src/components/pages/TestsMergePage.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Test {
  id: string;
  nodeName: string;
  timestamp: string;
  stats: {
    totalNodes: number;
  };
  // Detect width from node name or metadata
  estimatedWidth?: string;
}

export function TestsMergePage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch tests with modular/ directory
    fetch('/api/tests?hasModular=true')
      .then(r => r.json())
      .then(data => setTests(data.tests))
      .catch(err => console.error('Error loading tests:', err));
  }, []);

  const handleMerge = async () => {
    if (selected.length !== 3) {
      alert('Veuillez sélectionner exactement 3 tests (Desktop, Tablet, Mobile)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/tests/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testIds: selected })
      });

      const { mergedTestId, success } = await response.json();

      if (success) {
        navigate(`/tests/${mergedTestId}`);
      } else {
        alert('Erreur lors de la fusion');
      }
    } catch (err) {
      console.error('Merge error:', err);
      alert('Erreur lors de la fusion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Fusionner des tests responsives</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionnez exactement 3 tests (Desktop, Tablet, Mobile) pour créer un composant responsive
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            {tests.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun test avec composants modulaires trouvé.
                Générez des tests avec --split-components d'abord.
              </p>
            )}

            {tests.map(test => (
              <div key={test.id} className="flex items-center gap-3 p-3 border rounded">
                <Checkbox
                  checked={selected.includes(test.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelected([...selected, test.id]);
                    } else {
                      setSelected(selected.filter(id => id !== test.id));
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="font-medium">{test.nodeName}</div>
                  <div className="text-sm text-muted-foreground">
                    {test.id} • {test.stats.totalNodes} nodes
                    {test.estimatedWidth && ` • ${test.estimatedWidth}`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleMerge}
              disabled={selected.length !== 3 || loading}
            >
              {loading ? 'Fusion en cours...' : 'Lancer la fusion responsive'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/tests')}>
              Annuler
            </Button>
          </div>

          {selected.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              {selected.length}/3 tests sélectionnés
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Étape 3.2: Ajouter Route

**Fichier:** `src/main.tsx`

```tsx
import { TestsMergePage } from './components/pages/TestsMergePage';

// Dans <Routes>
<Route path="/tests/merge" element={<TestsMergePage />} />
```

### Étape 3.3: Ajouter Bouton dans TestsPage

**Fichier:** `src/components/pages/TestsPage.tsx`

```tsx
import { Link } from 'react-router-dom';

// Dans le header de la page
<div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold">Tests</h1>
  <Link to="/tests/merge">
    <Button variant="outline">
      <Merge className="mr-2 h-4 w-4" />
      Fusionner des tests responsives
    </Button>
  </Link>
</div>
```

### Étape 3.4: API Endpoints

**Fichier:** `server.js`

```javascript
// GET /api/tests?hasModular=true - Filter tests with modular/
app.get('/api/tests', (req, res) => {
  const testsDir = path.join(__dirname, 'src/generated/tests');

  if (!fs.existsSync(testsDir)) {
    return res.json({ tests: [] });
  }

  const tests = fs.readdirSync(testsDir)
    .filter(dir => {
      const testPath = path.join(testsDir, dir);

      // Skip if not directory
      if (!fs.statSync(testPath).isDirectory()) {
        return false;
      }

      // Filter by hasModular query param
      if (req.query.hasModular === 'true') {
        return fs.existsSync(path.join(testPath, 'modular'));
      }

      return true;
    })
    .map(dir => {
      const metadataPath = path.join(testsDir, dir, 'metadata.json');

      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Try to detect width from node name
      let estimatedWidth = null;
      if (metadata.nodeName) {
        const widthMatch = metadata.nodeName.match(/(\d{3,4})\s*px/i);
        if (widthMatch) {
          estimatedWidth = widthMatch[1] + 'px';
        }
      }

      return {
        id: dir,
        ...metadata,
        estimatedWidth
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);

  res.json({ tests });
});

// POST /api/tests/merge - Trigger responsive merge
app.post('/api/tests/merge', async (req, res) => {
  const { testIds } = req.body;

  if (!testIds || testIds.length !== 3) {
    return res.status(400).json({
      success: false,
      error: 'Exactly 3 tests required'
    });
  }

  // Validate all tests exist and have modular/
  const testsDir = path.join(__dirname, 'src/generated/tests');
  for (const testId of testIds) {
    const testPath = path.join(testsDir, testId);
    const modularPath = path.join(testPath, 'modular');

    if (!fs.existsSync(modularPath)) {
      return res.status(400).json({
        success: false,
        error: `Test ${testId} missing modular/ directory`
      });
    }
  }

  // Generate merged test ID
  const mergedTestId = `test-merged-${Date.now()}`;
  const mergedDir = path.join(testsDir, mergedTestId);

  // Execute responsive-merger.js in background
  const { spawn } = require('child_process');

  const testPaths = testIds.map(id => path.join(testsDir, id));

  const merger = spawn('node', [
    path.join(__dirname, 'scripts/responsive-merger.js'),
    ...testPaths,
    '--output', mergedDir
  ], {
    stdio: 'inherit'
  });

  merger.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Merge complete: ${mergedTestId}`);
    } else {
      console.error(`❌ Merge failed with code ${code}`);
    }
  });

  // Return immediately (merge runs in background)
  res.json({
    success: true,
    mergedTestId,
    message: 'Merge started in background'
  });
});
```

**Durée:** 2 jours développement

---

## PHASE 4: Responsive Merger

**Objectif:** Fusionner les 3 breakpoints en composants responsives

**Fichier:** `scripts/responsive-merger.js`

**Note:** Ce script est le cœur du système. Voir le code détaillé dans les étapes 4.1-4.4 ci-dessous.

### Étape 4.1: Structure principale

```javascript
#!/usr/bin/env node
/**
 * Responsive Merger
 *
 * Merges 3 breakpoints (Desktop, Tablet, Mobile) into responsive components
 * Uses responsive-analysis.json for merge strategies
 *
 * Usage:
 *   node responsive-merger.js <desktopDir> <tabletDir> <mobileDir> --output <mergedDir>
 */

import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { toPascalCase } from './utils/chunking.js';

async function mergeBreakpoints(desktopDir, tabletDir, mobileDir, outputDir) {
  console.log('🔄 Starting responsive merge...\n');

  // 1. Load analysis
  const analysisPath = path.join(process.cwd(), 'src/generated/tests/responsive-analysis.json');
  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

  console.log(`   Loaded analysis: ${analysis.summary.commonComponents} components to merge\n`);

  // 2. Create output structure
  const componentsDir = path.join(outputDir, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });

  // 3. Merge CSS-only components (98% of components)
  console.log(`✅ Merging CSS-only components (${analysis.summary.cssOnlyCount})...\n`);

  for (const componentName of analysis.details.cssOnly) {
    await mergeCSSOnlyComponent(
      componentName,
      desktopDir, tabletDir, mobileDir,
      componentsDir
    );
  }

  // 4. Merge component-swap components (2% of components)
  console.log(`\n🔄 Merging component-swap components (${analysis.summary.componentSwapCount})...\n`);

  for (const component of analysis.details.componentSwap) {
    await mergeComponentSwap(
      component.name,
      desktopDir, tabletDir, mobileDir,
      componentsDir,
      component
    );
  }

  // 5. Generate puck.config.tsx
  console.log('\n📝 Generating puck.config.tsx...\n');
  await generatePuckConfig(componentsDir, analysis);

  // 6. Generate metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    breakpoints: {
      desktop: desktopDir,
      tablet: tabletDir,
      mobile: mobileDir
    },
    summary: analysis.summary,
    componentsCount: analysis.summary.commonComponents,
    hasPuckConfig: true
  };

  fs.writeFileSync(
    path.join(outputDir, 'responsive-map.json'),
    JSON.stringify(metadata, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify({
      nodeId: 'merged',
      nodeName: 'Merged Responsive',
      timestamp: Date.now(),
      stats: {
        totalNodes: analysis.summary.commonComponents,
        cssOnlyCount: analysis.summary.cssOnlyCount,
        componentSwapCount: analysis.summary.componentSwapCount
      },
      hasPuckConfig: true
    }, null, 2)
  );

  console.log(`\n✅ Merge complete! Output: ${outputDir}`);
  console.log(`   Components: ${analysis.summary.commonComponents}`);
  console.log(`   CSS-only: ${analysis.summary.cssOnlyCount}`);
  console.log(`   Component-swap: ${analysis.summary.componentSwapCount}\n`);
}

// CLI
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');

if (outputIndex === -1 || args.length < 4) {
  console.error('Usage: node responsive-merger.js <desktopDir> <tabletDir> <mobileDir> --output <mergedDir>');
  process.exit(1);
}

const desktopDir = args[0];
const tabletDir = args[1];
const mobileDir = args[2];
const outputDir = args[outputIndex + 1];

mergeBreakpoints(desktopDir, tabletDir, mobileDir, outputDir)
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
```

### Étape 4.2: Fusion CSS-Only (98% des composants)

```javascript
/**
 * Merge CSS-only component
 * Strategy: Keep Desktop JSX structure, merge CSS with media queries
 */
async function mergeCSSOnlyComponent(
  componentName,
  desktopDir, tabletDir, mobileDir,
  outputDir
) {
  const pascalName = toPascalCase(componentName);
  const modularDesktop = path.join(desktopDir, 'modular');
  const modularTablet = path.join(tabletDir, 'modular');
  const modularMobile = path.join(mobileDir, 'modular');

  // Read Desktop TSX (structure reference)
  const tsxPath = path.join(modularDesktop, `${pascalName}.tsx`);
  if (!fs.existsSync(tsxPath)) {
    console.log(`   ⚠️  Skipping ${pascalName} (not found in desktop)`);
    return;
  }

  const desktopTsx = fs.readFileSync(tsxPath, 'utf8');

  // Read CSS from all 3 breakpoints
  const desktopCss = readCSSFile(modularDesktop, pascalName);
  const tabletCss = readCSSFile(modularTablet, pascalName);
  const mobileCss = readCSSFile(modularMobile, pascalName);

  // Generate responsive CSS
  const responsiveCss = generateResponsiveCSS(
    desktopCss,
    tabletCss,
    mobileCss
  );

  // Write merged files
  fs.writeFileSync(
    path.join(outputDir, `${pascalName}.tsx`),
    desktopTsx // Desktop structure (same for all 3)
  );

  fs.writeFileSync(
    path.join(outputDir, `${pascalName}.css`),
    responsiveCss
  );

  console.log(`   ✅ ${pascalName}`);
}

function readCSSFile(modularDir, pascalName) {
  const cssPath = path.join(modularDir, `${pascalName}.css`);
  return fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
}
```

### Étape 4.3: Génération CSS Responsive

```javascript
/**
 * Generate responsive CSS with media queries
 */
function generateResponsiveCSS(desktopCss, tabletCss, mobileCss) {
  // Parse CSS sections
  const desktopSections = parseCssSections(desktopCss);
  const tabletSections = parseCssSections(tabletCss);
  const mobileSections = parseCssSections(mobileCss);

  let merged = '/* Auto-generated responsive CSS */\n';

  // 1. @import (Google Fonts)
  if (desktopSections.imports) {
    merged += desktopSections.imports + '\n\n';
  }

  // 2. :root variables (merge unique)
  const rootVars = mergeRootVariables([
    desktopSections.root,
    tabletSections.root,
    mobileSections.root
  ]);
  merged += rootVars + '\n\n';

  // 3. Utility classes
  if (desktopSections.utilities) {
    merged += desktopSections.utilities + '\n\n';
  }

  // 4. Desktop styles (default)
  merged += '/* Desktop styles (default) */\n';
  merged += desktopSections.customClasses + '\n\n';

  // 5. Tablet overrides
  const tabletDiff = getClassDifferences(
    desktopSections.customClasses,
    tabletSections.customClasses
  );

  if (tabletDiff.trim()) {
    merged += '/* Tablet overrides */\n';
    merged += '@media (max-width: 960px) {\n';
    merged += indentCss(tabletDiff);
    merged += '}\n\n';
  }

  // 6. Mobile overrides
  const mobileDiff = getClassDifferences(
    tabletSections.customClasses,
    mobileSections.customClasses
  );

  if (mobileDiff.trim()) {
    merged += '/* Mobile overrides */\n';
    merged += '@media (max-width: 420px) {\n';
    merged += indentCss(mobileDiff);
    merged += '}\n';
  }

  return merged;
}

/**
 * Parse CSS into sections
 */
function parseCssSections(css) {
  return {
    imports: extractSection(css, /@import[^;]+;/g),
    root: extractSection(css, /:root\s*\{[^}]+\}/s),
    utilities: extractSection(css, /\/\* Figma-specific utility classes \*\/\n([\s\S]*?)(?=\n\/\*|$)/),
    customClasses: extractSection(css, /\/\* ===== [34567]\..*?\*\/[\s\S]*$/)
  };
}

function extractSection(css, regex) {
  const match = css.match(regex);
  return match ? match[0] : '';
}

/**
 * Get CSS class differences
 */
function getClassDifferences(baseClasses, targetClasses) {
  const baseMap = parseClassDefinitions(baseClasses);
  const targetMap = parseClassDefinitions(targetClasses);

  let diff = '';

  for (const [className, targetDef] of targetMap) {
    const baseDef = baseMap.get(className);

    // New class or different definition
    if (!baseDef || baseDef !== targetDef) {
      diff += targetDef + '\n';
    }
  }

  return diff;
}

function parseClassDefinitions(cssClasses) {
  const map = new Map();
  const regex = /\.([\w-]+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = regex.exec(cssClasses)) !== null) {
    const className = match[1];
    const definition = `.${className} {${match[2]}}`;
    map.set(className, definition);
  }

  return map;
}

function indentCss(css) {
  return css.split('\n')
    .map(line => line ? '  ' + line : line)
    .join('\n');
}

function mergeRootVariables(rootSections) {
  const vars = new Map();

  rootSections.forEach(section => {
    if (!section) return;

    const varPattern = /(--[a-z0-9-]+):\s*([^;]+);/g;
    let match;

    while ((match = varPattern.exec(section)) !== null) {
      vars.set(match[1], match[2]);
    }
  });

  if (vars.size === 0) return '';

  let root = ':root {\n';
  for (const [varName, value] of vars) {
    root += `  ${varName}: ${value};\n`;
  }
  root += '}';

  return root;
}
```

### Étape 4.4: Fusion Component-Swap (2% des composants)

```javascript
/**
 * Merge component-swap component
 * Strategy: Create variants with conditional rendering
 */
async function mergeComponentSwap(
  componentName,
  desktopDir, tabletDir, mobileDir,
  outputDir,
  componentInfo
) {
  const pascalName = toPascalCase(componentName);

  // Read all 3 versions
  const desktopCode = readTSXFile(desktopDir, pascalName);
  const tabletCode = readTSXFile(tabletDir, pascalName);
  const mobileCode = readTSXFile(mobileDir, pascalName);

  // Determine variants (group Desktop+Tablet if same structure)
  const variants = [];

  if (componentInfo.dtMatch) {
    // Desktop and Tablet share same structure
    variants.push({
      name: 'desktop',
      code: desktopCode,
      label: 'Desktop/Tablet'
    });
  } else {
    variants.push({
      name: 'desktop',
      code: desktopCode,
      label: 'Desktop'
    });
    variants.push({
      name: 'tablet',
      code: tabletCode,
      label: 'Tablet'
    });
  }

  variants.push({
    name: 'mobile',
    code: mobileCode,
    label: 'Mobile'
  });

  // Generate merged component
  const mergedCode = generateVariantComponent(pascalName, variants);

  // Merge CSS (same as CSS-only)
  const desktopCss = readCSSFile(path.join(desktopDir, 'modular'), pascalName);
  const tabletCss = readCSSFile(path.join(tabletDir, 'modular'), pascalName);
  const mobileCss = readCSSFile(path.join(mobileDir, 'modular'), pascalName);

  const responsiveCss = generateResponsiveCSS(desktopCss, tabletCss, mobileCss);

  fs.writeFileSync(path.join(outputDir, `${pascalName}.tsx`), mergedCode);
  fs.writeFileSync(path.join(outputDir, `${pascalName}.css`), responsiveCss);

  console.log(`   🔄 ${pascalName} (component-swap)`);
}

function readTSXFile(dir, pascalName) {
  const tsxPath = path.join(dir, 'modular', `${pascalName}.tsx`);
  return fs.existsSync(tsxPath) ? fs.readFileSync(tsxPath, 'utf8') : '';
}

/**
 * Generate component with variant props
 */
function generateVariantComponent(componentName, variants) {
  // Extract JSX from each variant
  const subComponents = variants.map(v => {
    const jsx = extractComponentJSX(v.code);
    const subName = `${componentName}${v.name.charAt(0).toUpperCase() + v.name.slice(1)}`;

    return {
      name: subName,
      jsx,
      variantName: v.name
    };
  });

  // Generate sub-component functions
  const subComponentCode = subComponents.map(sc => `
function ${sc.name}() {
  return ${sc.jsx};
}`).join('\n');

  // Generate main component
  const variantType = variants.map(v => `'${v.name}'`).join(' | ');
  const conditionals = subComponents.map((sc, i) => {
    const prefix = i === 0 ? 'if' : 'else if';
    return `  ${prefix} (variant === '${sc.variantName}') {
    return <${sc.name} />;
  }`;
  }).join('\n');

  return `import React from 'react';
import './${componentName}.css';
${subComponentCode}

interface ${componentName}Props {
  variant?: ${variantType};
}

export default function ${componentName}({ variant = '${variants[0].name}' }: ${componentName}Props) {
${conditionals}

  return null;
}
`;
}

/**
 * Extract JSX from component code
 */
function extractComponentJSX(code) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  let jsx = null;

  traverse.default(ast, {
    ReturnStatement(path) {
      if (path.node.argument) {
        jsx = generate.default(path.node.argument).code;
      }
    }
  });

  return jsx || '<div>Error: JSX not found</div>';
}
```

### Étape 4.5: Génération puck.config.tsx

```javascript
/**
 * Generate Puck configuration
 */
async function generatePuckConfig(componentsDir, analysis) {
  const componentFiles = fs.readdirSync(componentsDir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.basename(f, '.tsx'));

  // Generate imports
  const imports = componentFiles.map(name =>
    `import ${name} from './components/${name}';`
  ).join('\n');

  // Generate component configs
  const configs = [];

  // CSS-only components (simple render)
  for (const name of analysis.details.cssOnly) {
    const pascalName = toPascalCase(name);

    if (componentFiles.includes(pascalName)) {
      configs.push(`    ${pascalName}: {
      render: () => <${pascalName} />
    }`);
    }
  }

  // Component-swap components (with variant field)
  for (const component of analysis.details.componentSwap) {
    const pascalName = toPascalCase(component.name);

    if (!componentFiles.includes(pascalName)) continue;

    const variants = [];
    if (component.dtMatch) {
      variants.push({ label: 'Desktop/Tablet', value: 'desktop' });
    } else {
      variants.push({ label: 'Desktop', value: 'desktop' });
      variants.push({ label: 'Tablet', value: 'tablet' });
    }
    variants.push({ label: 'Mobile', value: 'mobile' });

    configs.push(`    ${pascalName}: {
      fields: {
        variant: {
          type: 'select',
          options: ${JSON.stringify(variants, null, 10).replace(/\n/g, '\n          ')}
        }
      },
      defaultProps: { variant: '${variants[0].value}' },
      render: ({ variant }) => <${pascalName} variant={variant} />
    }`);
  }

  const configCode = `import { Config } from '@measured/puck';
${imports}

export const config: Config = {
  components: {
${configs.join(',\n')}
  }
};
`;

  fs.writeFileSync(
    path.join(path.dirname(componentsDir), 'puck.config.tsx'),
    configCode
  );

  console.log(`   ✅ puck.config.tsx generated (${componentFiles.length} components)`);
}
```

**Utilisation:**

```bash
node scripts/responsive-merger.js \
  src/generated/tests/node-6055-2436-1762733564 \
  src/generated/tests/node-6055-2654-1762712319 \
  src/generated/tests/node-6055-2872-1762733537 \
  --output src/generated/tests/test-merged-1762734000
```

**Output:**

```
src/generated/tests/test-merged-1762734000/
├─ components/
│  ├─ Header.tsx              ← CSS-only
│  ├─ Header.css              ← Media queries
│  ├─ MenuRight.tsx           ← Component-swap (variants)
│  ├─ MenuRight.css
│  ├─ AccountOverview.tsx
│  ├─ AccountOverview.css
│  └─ ... (50 composants)
├─ puck.config.tsx            ← Puck config
├─ responsive-map.json        ← Metadata
└─ metadata.json              ← Dashboard metadata
```

**Durée:** 7-10 jours développement

---

## PHASE 5: Puck Editor Integration

**Objectif:** Intégrer éditeur Puck dans dashboard

### Étape 5.1: Installer Puck (Docker)

**Fichier:** `package.json`

```json
{
  "dependencies": {
    "@measured/puck": "^0.15.0"
  }
}
```

**Rebuild Docker:**

```bash
docker-compose down
docker-compose up --build
```

### Étape 5.2: Créer Page Puck Editor

**Fichier:** `src/components/pages/PuckEditorPage.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Puck } from '@measured/puck';
import '@measured/puck/puck.css';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PuckEditorPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPuckData();
  }, [testId]);

  async function loadPuckData() {
    try {
      // Load config
      const configRes = await fetch(`/api/tests/${testId}/puck-config`);
      if (!configRes.ok) throw new Error('Config not found');
      const configData = await configRes.json();

      // Load saved data
      const dataRes = await fetch(`/api/tests/${testId}/puck-data`);
      const savedData = dataRes.ok ? await dataRes.json() : null;

      setConfig(configData);
      setData(savedData || { content: [], root: {} });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const handlePublish = async (publishedData) => {
    try {
      await fetch(`/api/tests/${testId}/puck-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishedData)
      });

      alert('✅ Design saved!');
    } catch (err) {
      alert('❌ Error saving: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg">Loading Puck editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={() => navigate('/tests')}>
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Puck
        config={config}
        data={data}
        onPublish={handlePublish}
      />
    </div>
  );
}
```

### Étape 5.3: Ajouter Route

**Fichier:** `src/main.tsx`

```tsx
import { PuckEditorPage } from './components/pages/PuckEditorPage';

// Dans <Routes>
<Route path="/tests/:testId/puck-editor" element={<PuckEditorPage />} />
```

### Étape 5.4: API Endpoints

**Fichier:** `server.js`

```javascript
// GET /api/tests/:testId/puck-config
// Convert puck.config.tsx to JSON for client
app.get('/api/tests/:testId/puck-config', async (req, res) => {
  const configPath = path.join(
    __dirname,
    'src/generated/tests',
    req.params.testId,
    'puck.config.tsx'
  );

  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: 'Puck config not found' });
  }

  // For MVP: Read and transform to JSON
  // Production: Use esbuild or similar to compile TSX

  try {
    // Simple approach: Read config file and extract component list
    const configCode = fs.readFileSync(configPath, 'utf8');

    // Extract component names from imports
    const importMatches = configCode.match(/import (\w+) from/g);
    const components = importMatches
      ? importMatches.map(m => m.match(/import (\w+)/)[1])
      : [];

    // Generate simple config (MVP - no actual component rendering)
    const config = {
      components: {}
    };

    components.forEach(name => {
      config.components[name] = {
        render: ({ children }) => ({ type: 'div', props: { children } })
      };
    });

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:testId/puck-data
app.get('/api/tests/:testId/puck-data', (req, res) => {
  const dataPath = path.join(
    __dirname,
    'src/generated/tests',
    req.params.testId,
    'puck-data.json'
  );

  if (fs.existsSync(dataPath)) {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } else {
    res.status(404).json(null);
  }
});

// POST /api/tests/:testId/puck-save
app.post('/api/tests/:testId/puck-save', (req, res) => {
  const dataPath = path.join(
    __dirname,
    'src/generated/tests',
    req.params.testId,
    'puck-data.json'
  );

  try {
    fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Étape 5.5: Ajouter Bouton "Ouvrir dans Puck"

**Fichier:** `src/components/features/tests/TestCard.tsx`

```tsx
// Detect if test has Puck config
const hasPuckConfig = test.hasPuckConfig || false;

// Add button
{hasPuckConfig && (
  <Button
    variant="secondary"
    size="sm"
    onClick={() => navigate(`/tests/${test.id}/puck-editor`)}
  >
    <Edit className="mr-2 h-4 w-4" />
    Ouvrir dans Puck
  </Button>
)}
```

**Durée:** 3-5 jours développement

---

## PHASE 6: Testing & Polish

### Tests à effectuer

#### 6.1 Component Splitter
- ✅ Tous les composants avec `data-name` détectés
- ✅ CSS scopé contient toutes les classes nécessaires
- ✅ Composants standalone rendus correctement
- ✅ Pas de CSS manquant ou dupliqué inutilement

#### 6.2 Responsive Merger
- ✅ Media queries générées correctement
- ✅ Breakpoints (960px, 420px) corrects
- ✅ Component-swap variants fonctionnels
- ✅ :root variables dédupliquées
- ✅ CSS optimisé (pas de doublons)

#### 6.3 Puck Editor
- ✅ Config chargé sans erreur
- ✅ Composants listés dans sidebar
- ✅ Save/Load fonctionne
- ✅ Preview temps réel

#### 6.4 Visual Testing
- ✅ Test Desktop (1440px) identique à Figma
- ✅ Test Tablet (960px) identique à Figma
- ✅ Test Mobile (420px) identique à Figma
- ✅ Transitions fluides entre breakpoints
- ✅ Pas de layout shifts

**Durée:** 1-2 semaines

---

# 📊 Timeline Global

| Phase | Tâche | Durée | Statut |
|-------|-------|-------|--------|
| **Phase 0** | Export Figma (3 breakpoints) | 30 min | ✅ Fait |
| **Phase 1** | Component Splitter + CSS scopé | 2 jours | ⏳ À faire |
| **Phase 2** | Breakpoint Analysis | - | ✅ Fait |
| **Phase 3** | UI Dashboard (/tests/merge) | 2 jours | ⏳ À faire |
| **Phase 4** | Responsive Merger | 7-10 jours | ⏳ À faire |
| **Phase 5** | Puck Integration | 3-5 jours | ⏳ À faire |
| **Phase 6** | Testing & Polish | 1-2 semaines | ⏳ À faire |
| **TOTAL** | - | **~4-5 semaines** | - |

---

# 🎯 Prochaines Actions

## Option A: Démarrer Phase 1 (Component Splitter)
**Recommandé** - Fondation du workflow

**Actions:**
1. Créer `scripts/post-processing/component-splitter.js`
2. Modifier `scripts/unified-processor.js` (ajouter flag)
3. Exporter `toPascalCase` depuis `utils/chunking.js`
4. Tester sur les 3 exports existants

**Avantages:**
- Testable immédiatement
- Pas de dépendances sur Phase 3-4
- Valeur immédiate (composants modulaires)

## Option B: Prototype Responsive Merger (Phase 4)
Tester l'algorithme de fusion sur 5 composants

## Option C: Générer Architecture Complète
Créer tous les fichiers vides avec interfaces TypeScript

---

# 📝 Notes Importantes

## Docker
- Puck installé via `npm install @measured/puck` dans le container
- Rebuild nécessaire: `docker-compose up --build`
- Port mapping 5173 déjà configuré

## Compatibilité
- ✅ Puck supporte React 19
- ✅ `data-name` préservés dans Component-clean.tsx
- ✅ keepDataName: true dans unified-processor.js

## Analyse Validée
- **92.7%** de matching cross-breakpoint
- **98%** CSS-only (simple media queries)
- **2%** component-swap (`menu right` uniquement)

## Réutilisation Code
- `toPascalCase()` depuis chunking.js
- Logique AST depuis transformations existantes
- Pipeline déjà mature et testé

---

# 🔗 Fichiers de Référence

- **Analyse complète:** `src/generated/tests/responsive-analysis.json`
- **Tests validés:**
  - Desktop: `node-6055-2436-1762733564`
  - Tablet: `node-6055-2654-1762712319`
  - Mobile: `node-6055-2872-1762733537`
- **Script analyse:** `scripts/analysis/compare-breakpoints.js`
- **Documentation projet:** `CLAUDE.md`

---

**Dernière mise à jour:** 2025-11-10
**Version:** 1.0
