# 📊 Comparaison Ancien vs Nouveau Processus

## 🕰️ ANCIEN PROCESSUS (Commit 218dc8e - 4 Nov 2025)

### Phase 1 : Tentative Mode SIMPLE d'abord

```
1. Appeler EN PARALLÈLE :
   ├─ get_design_context(parent) + dirForAssetWrites
   ├─ get_screenshot(parent)
   ├─ get_variable_defs(parent)
   └─ get_metadata(parent)

2. SI get_design_context RÉUSSIT :
   ✅ Component.tsx généré
   ✅ Images dans /tmp/figma-assets/
   → Copier images
   → organize-images.js
   → TERMINÉ

3. SI get_design_context ÉCHOUE (>25k tokens) :
   ⚠️  Code trop gros
   📦 Images DÉJÀ dans /tmp/figma-assets/ (écrites pendant l'appel)
   → Copier images
   → MODE CHUNKING :
      - Extract nodes depuis metadata.xml
      - POUR CHAQUE nœud :
        * get_design_context(nœud) + dirForAssetWrites
        * Sauvegarder chunk
      - Assembler chunks
      - organize-images.js
```

**Flux des images** :
```
Premier appel get_design_context(parent)
├─ Génère le code (ou échoue si trop gros)
└─ Écrit LES IMAGES dans /tmp/figma-assets/ ✅
    (Même si le code échoue!)

Si chunking nécessaire :
├─ Images DÉJÀ récupérées ✅
└─ Chunks appellent get_design_context AVEC dirForAssetWrites
    ├─ Peut dupliquer les images (déjà là)
    └─ organize-images.js déduplique
```

---

## 🆕 NOUVEAU PROCESSUS (Actuel - Post refacto 71b0af9)

### Mode CHUNK SYSTÉMATIQUE

```
1. Appeler get_metadata(parent)
   → Toujours en premier

2. Appeler EN PARALLÈLE :
   ├─ get_design_context(parent) + dirForAssetWrites
   ├─ get_screenshot(parent)
   └─ get_variable_defs(parent)
   → parent-wrapper.tsx (pour CSS global)

3. Extract nodes depuis metadata.xml
   → TOUJOURS (pas conditionnel)

4. POUR CHAQUE nœud (TOUJOURS) :
   ├─ get_design_context(nœud) + dirForAssetWrites
   ├─ Attente 1s
   └─ Sauvegarder chunk

5. Attente 3s (délai de grâce)
   → waitForImages()
   → Copier images

6. Assembler chunks
   → organize-images.js
```

**Flux des images** :
```
Appel parent get_design_context(parent)
└─ Génère parent-wrapper.tsx (pour CSS)
   └─ Images ??? (pas clair)

PUIS pour chaque chunk :
├─ get_design_context(enfant) + dirForAssetWrites
└─ Images écrites dans /tmp/figma-assets/
   └─ Possibles duplications
   └─ Race conditions
```

---

## 🔍 DIFFÉRENCES CLÉS

| Aspect | ANCIEN (218dc8e) | NOUVEAU (71b0af9) |
|--------|------------------|-------------------|
| **Stratégie** | Try simple FIRST | Chunk SYSTÉMATIQUE |
| **Décision chunking** | Si code échoue | TOUJOURS |
| **Premier appel** | get_design_context(parent) | get_metadata(parent) |
| **Mode simple** | 4 appels (90% cas) | N'existe plus |
| **Mode chunk** | Si nécessaire | FORCÉ |
| **Images parent** | Récupérées au 1er appel | ??? (parent-wrapper) |
| **Images chunks** | SI chunking | TOUJOURS |
| **Appels MCP** | 4 (simple) / 4+N (chunk) | 10+ TOUJOURS |

---

## 💡 CE QUI A ÉTÉ PERDU dans le refacto

### 1. Mode SIMPLE (90% des cas)

**ANCIEN** :
```
get_design_context(parent) → SUCCESS
├─ Code complet dans Component.tsx ✅
├─ Images dans /tmp/figma-assets/ ✅
└─ TERMINÉ en 4 appels

Design simple → 4 appels ✅
```

**NOUVEAU** :
```
Mode chunk FORCÉ
├─ get_design_context(parent) → parent-wrapper.tsx
├─ extract-nodes → 6 nodes
├─ 6× get_design_context(chunks)
└─ assemble-chunks

Design simple → 10 appels ❌
```

**Impact** : 10 appels au lieu de 4 (150% d'augmentation)

---

### 2. Images récupérées EN 1 FOIS

**ANCIEN** :
```
Premier appel get_design_context(parent)
└─ MCP écrit TOUTES les images ✅
   (Même si code échoue)

Puis si chunking :
└─ Chunks appelés AVEC dirForAssetWrites
   └─ Possibles duplications mais rapide
```

**NOUVEAU** :
```
Appel parent → Images ???
Puis CHAQUE chunk AVEC dirForAssetWrites
└─ 6× appels avec écriture images
└─ Race conditions multiples
└─ Attente après chaque chunk
└─ Besoin de 4 protections
```

**Impact** : Plus lent, plus complexe, plus fragile

---

### 3. Logique de décision intelligente

**ANCIEN** :
```
TRY get_design_context(parent)
├─ SUCCESS → Mode simple (4 appels)
└─ FAIL → Mode chunk (4 + N appels)

Décision basée sur le RÉSULTAT réel
```

**NOUVEAU** :
```
TOUJOURS mode chunk (10+ appels)

Pas de tentative mode simple
```

**Impact** : Surcharge inutile pour 90% des designs

---

## ✅ CE QUI A ÉTÉ AMÉLIORÉ

### 1. parent-wrapper.tsx explicite

**ANCIEN** :
```
En mode chunk :
- Pas de parent wrapper explicite
- assemble-chunks utilisait quoi pour le CSS parent ?
```

**NOUVEAU** :
```
parent-wrapper.tsx TOUJOURS généré
└─ assemble-chunks l'utilise pour CSS global ✅
```

---

### 2. Gestion des images plus explicite

**ANCIEN** :
```
Images récupérées, mais timing flou
```

**NOUVEAU** :
```
- Délai de grâce 3s
- waitForImages() explicite
- 4 protections
→ Plus robuste (mais plus complexe)
```

---

## 🎯 STRATÉGIE OPTIMALE : Combiner le meilleur des 2

### Reprendre l'ancien flow avec améliorations du nouveau

```javascript
// ÉTAPE 1 : Métadonnées (nouveau ✅)
const [metadata, screenshot, variables] = await Promise.all([
  get_metadata(parent),
  get_screenshot(parent),
  get_variable_defs(parent)
]);

const nodes = extractNodes(metadata);
const nodeCount = nodes.length;

// ÉTAPE 2 : Tentative MODE SIMPLE (ancien ✅)
log.info('🎯 Tentative mode SIMPLE...');

try {
  const code = await get_design_context(parent, {
    dirForAssetWrites: '/tmp/figma-assets/',
    forceCode: true
  });

  // ✅ SUCCÈS MODE SIMPLE
  if (isValidCode(code) && code.length < 100000) {
    saveFile('Component.tsx', code);

    // Attendre images (ancien + améliorations nouveau)
    await sleep(3000); // Délai de grâce (nouveau ✅)
    await waitForImages(); // (nouveau ✅)
    await copyImages();

    log.success('✅ Mode SIMPLE : 4 appels');
    return; // TERMINÉ
  }

} catch (error) {
  if (error.includes('too large') || error.includes('token')) {
    log.warning('⚠️  Code trop volumineux, mode chunk');

    // 🎉 IMAGES DÉJÀ LÀ (observation ancien ✅)
    await sleep(3000);
    await waitForImages();
    await copyImages();
    log.success('Images récupérées par appel parent');
  }
}

// ÉTAPE 3 : MODE CHUNK (si nécessaire)
log.info('📦 Mode CHUNK...');

// Parent wrapper SANS images (nouveau + Test 1 ✅)
const parentWrapper = await get_design_context(parent, {
  dirForAssetWrites: '', // Test 1 ✅
  forceCode: true
});
saveFile('parent-wrapper.tsx', parentWrapper);

// Chunks SANS images (ancien + Test 1 ✅)
// Car images déjà récupérées par l'appel parent qui a échoué
for (child of nodes) {
  const chunk = await get_design_context(child, {
    dirForAssetWrites: '', // Test 1 ✅ - Pas de duplication
    forceCode: true
  });
  saveFile(`chunks/${child.name}.tsx`, chunk);
  await sleep(1000);
}

// Assembler (nouveau ✅)
await assembleChunks();
await organizeImages();
```

---

## 📊 COMPARAISON FINALE

| Scénario | ANCIEN | NOUVEAU | OPTIMAL |
|----------|--------|---------|---------|
| **Design simple** | 4 appels ✅ | 10 appels ❌ | 4 appels ✅ |
| **Design chunk** | 4 + N appels | 10 + N appels | 5 + N appels |
| **Images simple** | 1 appel ✅ | N appels ❌ | 1 appel ✅ |
| **Images chunk** | 1 appel (parent) ✅ | N appels ❌ | 1 appel (parent échoué) ✅ |
| **parent-wrapper** | ??? | ✅ Explicite | ✅ Explicite |
| **Robustesse images** | ⚠️ Timing flou | ✅ 4 protections | ✅ 1 protection (délai grâce) |

---

## 🎯 VALIDATION NÉCESSAIRE

### Ce qui doit être testé avec l'ANCIEN workflow

**Hypothèse utilisateur** :
> "Au premier call j'ai remarqué que TOUTES les images étaient récupérées"

**À tester** :
1. Lancer `/analyze-mcp` avec l'ANCIEN process (commit 218dc8e)
2. Observer si get_design_context(parent) génère les images
3. Observer ce qui se passe en cas d'échec (>25k)
4. Confirmer ou infirmer que les images sont récupérées au 1er appel

**Commande** :
```bash
git checkout 218dc8e
# Tester avec une URL Figma
/analyze-mcp <url>
# Observer les images dans /tmp/figma-assets/
```

---

*Analyse comparative entre commit 218dc8e et 71b0af9*
*Objectif : Identifier ce qui a été perdu et optimiser*
