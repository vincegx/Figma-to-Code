# 🎯 Stratégie Corrigée - Workflow Optimal

## ✅ CORRECTIONS Suite aux retours

### 1. metadata + nodes TOUJOURS appelés en premier
**CORRECT** : metadata.xml et extractNodes doivent être au début, PAS après l'échec.

**Pourquoi ?**
- Permet de décider si chunking nécessaire AVANT d'appeler get_design_context
- Donne les dimensions pour le screenshot
- Nécessaire pour les rapports (même en mode simple)

---

### 2. parent-wrapper.tsx EST nécessaire en mode chunk
**CORRECT** : Le parent wrapper n'est PAS gaspillé !

**Pourquoi ?**
```javascript
// chunking.js lignes 110-125
// assemble-chunks LIT parent-wrapper.tsx pour extraire les classes CSS:

const parentWrapper = fs.readFileSync('parent-wrapper.tsx');
const divMatch = parentWrapper.match(/<div[\s\S]+?>/);
// → Extrait: <div className="bg-[#f0d9b5] py-[40px] ..." >

// Puis injecte dans Component.tsx assemblé:
`${imports}
export default function Component() {
  return (
    ${wrapperDiv}  // ← Classes CSS du parent !
      <Chunk1 />
      <Chunk2 />
    </div>
  );
}`
```

**Sans parent-wrapper.tsx en mode chunk** :
- ❌ Pas de background color du parent
- ❌ Pas de padding global
- ❌ Pas de layout CSS du conteneur principal
- ❌ Component.tsx serait juste `<div className="w-full">` (fallback)

---

### 3. Images récupérées au PREMIER appel (même si échec code)
**OBSERVATIONS de l'utilisateur** :
> "Au premier call j'ai remarqué que TOUTES les images étaient récupérées.
> C'est à ce moment qu'on chunkait le code"

**Comportement MCP observé** :
```
Appel get_design_context(parent)
├─ MCP génère TOUTES les images du design complet
├─ MCP écrit les images dans tmp/figma-assets/ ✅
└─ MCP essaie de générer le code
    ├─ SI code < 25k tokens → Retourne le code ✅
    └─ SI code > 25k tokens → Erreur "too large" ❌
        MAIS images déjà écrites ✅
```

---

### 4. dirForAssetWrites: '' pour les chunks
**CORRECT** : Les chunks ne doivent PAS régénérer les images.

**Pourquoi ?**
- Images déjà récupérées par l'appel parent
- Évite duplication et race conditions
- Chunks = code uniquement

---

## 🎯 WORKFLOW OPTIMAL CORRIGÉ

```javascript
async function analyzeAndGenerate(figmaUrl) {
  const { nodeId } = parseUrl(figmaUrl);

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 1: MÉTADONNÉES (TOUJOURS en premier)
  // ═══════════════════════════════════════════════════════════════

  log.info('📦 Récupération métadonnées...');

  const [metadata, screenshot, variables] = await Promise.all([
    get_metadata(nodeId),
    get_screenshot(nodeId),
    get_variable_defs(nodeId)
  ]);

  // Extraire les nodes enfants MAINTENANT
  const nodes = extractNodes(metadata);
  const nodeCount = nodes.length;

  log.success(`✅ ${nodeCount} node(s) détectés\n`);

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 2: DÉCISION CHUNKING (basée sur nodeCount)
  // ═══════════════════════════════════════════════════════════════

  // Heuristique : Si >10 nodes, probablement trop gros
  const likelyNeedsChunking = nodeCount > 10;

  if (likelyNeedsChunking) {
    log.warning(`⚠️  Design complexe (${nodeCount} nodes), chunking probable`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 3A: Essayer mode SIMPLE (1 appel)
  // ═══════════════════════════════════════════════════════════════

  log.info('🎯 Tentative mode SIMPLE (1 appel)...');

  try {
    const codeResult = await get_design_context(nodeId, {
      dirForAssetWrites: 'tmp/figma-assets/',
      forceCode: true,
      ...config.commonParams
    });

    const code = codeResult.content[0].text;

    // Vérifier que le code est valide
    if (isValidReactCode(code) && code.length < 100000) {
      // ✅ SUCCÈS MODE SIMPLE
      log.success('✅ Mode SIMPLE réussi !');

      saveFile('Component.tsx', code);

      // Attendre images (elles sont en cours d'écriture)
      await waitForImages(code); // Compte les imports dans le code
      await copyImages('tmp/figma-assets/', testDir + '/img/');

      log.success('✅ Test généré en mode SIMPLE');
      log.info(`   Appels MCP: 4 (metadata + screenshot + vars + code)`);

      return; // TERMINÉ - Mode simple
    }

  } catch (error) {
    if (error.includes('too large') || error.includes('token')) {
      log.warning('⚠️  Code trop volumineux, passage en mode CHUNK');
      // Continuer vers mode chunk
    } else {
      throw error; // Vraie erreur
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 3B: Mode CHUNK (si simple a échoué)
  // ═══════════════════════════════════════════════════════════════

  log.info('📦 Mode CHUNK activé');

  // 🎉 IMAGES DÉJÀ RÉCUPÉRÉES par l'appel parent qui a échoué
  log.info('⏳ Attente des images (récupérées par appel parent)...');
  await waitForImagesFromMetadata(metadata); // Compte depuis metadata.xml
  await copyImages('tmp/figma-assets/', testDir + '/img/');
  log.success(`✅ Images disponibles`);

  // ─────────────────────────────────────────────────────────────
  // 3B.1: Récupérer le parent wrapper (CSS du conteneur)
  // ─────────────────────────────────────────────────────────────

  log.info('🎨 Récupération parent wrapper (CSS global)...');

  const parentWrapperResult = await get_design_context(nodeId, {
    dirForAssetWrites: '', // ❌ Pas d'images (déjà récupérées)
    forceCode: true,
    ...config.commonParams
  });

  saveFile('parent-wrapper.tsx', parentWrapperResult.content[0].text);
  log.success('✅ Parent wrapper récupéré (classes CSS globales)\n');

  // ─────────────────────────────────────────────────────────────
  // 3B.2: Générer les chunks individuels (code uniquement)
  // ─────────────────────────────────────────────────────────────

  log.info(`🔧 Génération des ${nodes.length} chunks...`);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    log.progress(i + 1, nodes.length, node.name);

    const chunkResult = await get_design_context(node.id, {
      dirForAssetWrites: '', // ❌ Pas d'images (déjà récupérées)
      forceCode: true,
      ...config.commonParams
    });

    saveFile(`chunks/${node.name}.tsx`, chunkResult.content[0].text);

    // Rate limit protection
    if (i < nodes.length - 1) {
      await sleep(1000);
    }
  }

  log.success('✅ Tous les chunks générés\n');

  // ─────────────────────────────────────────────────────────────
  // 3B.3: Assembler Component.tsx
  // ─────────────────────────────────────────────────────────────

  log.info('🔗 Assemblage des chunks...');

  // assemble-chunks va lire parent-wrapper.tsx pour extraire les classes CSS
  execSync(`node scripts/utils/chunking.js assemble-chunks ${testDir} Component ${chunks}`);

  log.success('✅ Component.tsx assemblé avec CSS du parent\n');
  log.info(`   Appels MCP: ${3 + 1 + 1 + nodes.length} (metadata/screenshot/vars + code échec + parent + chunks)`);

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 4: POST-PROCESSING (identique dans les 2 modes)
  // ═══════════════════════════════════════════════════════════════

  await organizeImages(testDir);
  await unifiedProcessor(testDir);
  await captureScreenshot(testDir);
}
```

---

## 📊 COMPTAGE D'APPELS MCP

### Mode SIMPLE (90% des cas)
```
1. get_metadata(parent)
2. get_screenshot(parent)     } En parallèle
3. get_variable_defs(parent)  }
4. get_design_context(parent) → Code + Images

TOTAL: 4 appels ✅
```

### Mode CHUNK (designs complexes)
```
1. get_metadata(parent)
2. get_screenshot(parent)     } En parallèle
3. get_variable_defs(parent)  }
4. get_design_context(parent) → Échec code, Images récupérées ✅
5. get_design_context(parent) → parent-wrapper.tsx (CSS global)
6-N. get_design_context(enfants) → chunks/*.tsx (N appels)

TOTAL: 5 + N appels
Exemple 6 chunks: 5 + 6 = 11 appels
```

### Comparaison avec ACTUEL
```
Design simple (6 nodes):
- Actuel: 10 appels (1 metadata + 3 parallel + 1 parent + 1 + 6 chunks)
- Optimisé: 4 appels ✅ (60% de réduction)

Design complexe (6 nodes):
- Actuel: 10 appels
- Optimisé: 11 appels (1 de plus, mais justifié)
```

**Note** : L'appel supplémentaire en mode chunk (parent après échec) est **nécessaire** pour récupérer les classes CSS du conteneur parent.

---

## 🧪 QUESTIONS À VALIDER

### Q1: dirForAssetWrites vide/null fonctionne-t-il ?

**Test :**
```javascript
const result = await get_design_context(nodeId, {
  dirForAssetWrites: '',  // Option A: vide
  // dirForAssetWrites: null,  // Option B: null
  // Pas de param du tout  // Option C: omis
  forceCode: true
});
```

**Attente** : Code TSX généré SANS écriture d'images

---

### Q2: L'appel parent qui échoue écrit-il TOUTES les images ?

**Test :**
```javascript
// Nettoyer
rm -rf tmp/figma-assets/*

// Appeler parent (qui va échouer)
try {
  await get_design_context(parentNodeId);
} catch (error) {
  // Compter les images MAINTENANT
  const images = ls tmp/figma-assets/*.{png,svg}
  console.log(`Images après échec: ${images.length}`);

  // Comparer avec le nombre attendu depuis metadata
  const expectedImages = countImagesFromMetadata(metadata);
  console.log(`Images attendues: ${expectedImages}`);

  // Sont-elles toutes là ?
  if (images.length === expectedImages) {
    console.log('✅ TOUTES les images récupérées même en cas d\'échec');
  }
}
```

---

### Q3: Timing d'écriture des images en cas d'échec

**Test :**
```javascript
try {
  await get_design_context(parentNodeId);
} catch (error) {
  // Les images sont-elles TOUTES écrites maintenant ?
  // Ou faut-il attendre encore ?

  for (let i = 1; i <= 10; i++) {
    const count = countImages('tmp/figma-assets/');
    console.log(`T+${i}s: ${count} images`);
    await sleep(1000);
  }
}
```

---

## 🎯 AVANTAGES DE CETTE APPROCHE

### 1. Images récupérées EN 1 FOIS
- ✅ Appel parent récupère TOUTES les images
- ✅ Chunks ne génèrent PAS d'images
- ✅ 0 duplication, 0 race condition

### 2. CSS du parent préservé
- ✅ parent-wrapper.tsx contient les classes CSS globales
- ✅ assemble-chunks les injecte dans Component.tsx
- ✅ Background, padding, layout préservés

### 3. Décision intelligente
- ✅ metadata appelé en premier (toujours utile)
- ✅ Tentative mode simple AVANT chunk
- ✅ Fallback chunk si nécessaire

### 4. Minimum d'appels
- ✅ 4 appels pour 90% des cas (au lieu de 10)
- ✅ 5 + N appels si chunk nécessaire (justifié)

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Valider les 3 questions de test
2. Implémenter le nouveau workflow
3. Tester sur 10+ designs réels
4. Mesurer les appels MCP réels
5. Confirmer 0 image perdue

---

*Stratégie corrigée suite aux retours sur :*
- *metadata/nodes appelés en premier*
- *parent-wrapper.tsx nécessaire pour CSS*
- *Images récupérées au premier appel*
- *dirForAssetWrites vide pour chunks*
