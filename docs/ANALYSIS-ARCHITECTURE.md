# 🔍 Analyse Architecture & Problèmes Actuels

## 📋 Résumé des 4 problèmes majeurs identifiés

### Note N°1 : Rate Limiting Figma API
**Problème** : Trop d'appels `get_design_context` risquent de déclencher le rate limit Figma
**Impact** :
- Mode chunk actuel = 1 appel parent + 6 appels enfants = **7 appels MCP**
- Figma API limite probablement le nombre d'appels / minute
- Risque d'échec en production avec gros designs

### Note N°2 : Chunking systématique inutile
**Problème** : Le code actuel force TOUJOURS le mode chunk (ligne 363 : "mode chunk systématique")
**Impact** :
- Petits designs simples = inutilement découpés en chunks
- Complexité accrue pour rien
- Plus d'appels MCP = plus de risque rate limit

### Note N°3 : Appel parent wrapper inefficace
**Problème** : En mode chunk, on appelle le parent juste pour le "wrapper"
**Impact** :
- Appel supplémentaire qui génère du code inutilisé
- Les images du parent ne sont pas exploitées
- Complexité dans la gestion images/code

### Note N°4 : Algorithme chunk/images fragile
**Problème** : Race conditions, images perdues, logique complexe
**Impact** :
- Images pas copiées → erreurs Vite
- Besoin de 4 protections pour que ça marche
- Pas robuste en production

---

## 🎯 APPROCHE DOCUMENTÉE vs IMPLÉMENTATION ACTUELLE

### Approche Documentée (analyze-mcp.md) ✅

**Logique :**
```
1. Appeler get_design_context sur le NODE PARENT
2. SI échec (>25k tokens) → Mode chunking
3. SINON → Mode simple (1 seul appel)
```

**Avantages :**
- ✅ Décision intelligente basée sur la taille réelle
- ✅ Minimum d'appels MCP
- ✅ Simple : 1 appel suffit pour 90% des cas
- ✅ Chunking = exception, pas la règle

**Process Mode Simple :**
```
get_design_context(parent) → Component.tsx + images
↓
organize-images.js
↓
unified-processor.js
↓
✅ TERMINÉ
```

**Process Mode Chunk (si nécessaire) :**
```
get_design_context(parent) → ÉCHEC (trop gros)
↓
extract-nodes metadata.xml → liste des enfants
↓
FOR EACH enfant SÉQUENTIEL:
  get_design_context(enfant) → chunk-X.tsx
  Sauvegarder IMMÉDIATEMENT
↓
assemble-chunks → Component.tsx
↓
organize-images + unified-processor
```

---

### Implémentation Actuelle (figma-cli.js) ❌

**Logique :**
```
TOUJOURS mode chunk systématique (pas de test si c'est nécessaire)
↓
1. get_design_context(parent) → parent-wrapper.tsx (inutilisé)
2. extract-nodes → liste enfants
3. FOR EACH enfant:
     get_design_context(enfant) → chunks/X.tsx
     Wait 1s
4. Wait 3s (délai de grâce)
5. waitForImages() avec 4 protections
6. assemble-chunks
7. organize-images + unified-processor
```

**Problèmes :**
- ❌ Appel parent gaspillé (code et images non utilisés)
- ❌ 7+ appels MCP au lieu de 1 dans 90% des cas
- ❌ Complexité énorme pour gérer les images
- ❌ Race conditions multiples
- ❌ Pas de logique de décision intelligente

---

## 🔬 ANALYSE DÉTAILLÉE

### 1. Rate Limiting Figma (Note N°1)

**Documentation Figma API** (basée sur comportement observé) :
- Limite probable : **~10-20 appels / minute**
- Erreur typique : "rate limit exceeded, please try again"
- Détecté dans le code ligne 400-408

**Comparaison appels :**

| Scénario | Approche Doc | Approche Actuelle |
|----------|-------------|-------------------|
| Design simple (1 node, 5 images) | **1 appel** | 7 appels (parent + 6 chunks) |
| Design moyen (10 nodes) | 1 appel (si <25k) | 11 appels |
| Design complexe (20 nodes) | 20 appels | 21 appels |

**Conclusion** : L'approche actuelle génère 7x plus d'appels inutiles

---

### 2. Décision Chunking (Note N°2)

**Comment DEVRAIT fonctionner :**

```javascript
// 1. Essayer d'abord en mode simple
try {
  const result = await get_design_context(parentNodeId);

  // Vérifier si le résultat est valide
  if (result contient du code TSX valide) {
    // ✅ MODE SIMPLE : 1 seul appel suffit
    saveFile('Component.tsx', result);
    return; // TERMINÉ
  }
} catch (error) {
  if (error.includes('too large') || error.includes('exceeded')) {
    // ⚠️ MODE CHUNK nécessaire
    log.warning('Design trop volumineux, passage en mode chunk');
    // Lancer la logique chunk
  }
}
```

**Actuellement :**
```javascript
// ❌ TOUJOURS mode chunk (ligne 363)
log.phase('PHASE 1: EXTRACTION MCP (mode chunk systématique)');
```

**Solutions possibles :**

#### Option A : Test "try-first"
```
1. Essayer get_design_context(parent)
2. SI succès → Mode simple (STOP)
3. SI échec → Mode chunk
```
✅ Avantages : Minimum d'appels
❌ Inconvénients : Un appel peut échouer (gaspillé si trop gros)

#### Option B : Analyse metadata AVANT
```
1. get_metadata(parent) → XML
2. Analyser la taille/complexité du XML
3. SI < seuil → Mode simple
4. SI >= seuil → Mode chunk
```
✅ Avantages : Décision intelligente AVANT
❌ Inconvénients : Seuil difficile à déterminer

#### Option C : Paramètre utilisateur
```
./figma-analyze --mode=auto|simple|chunk <url>
```
✅ Avantages : Contrôle total
❌ Inconvénients : L'utilisateur doit deviner

**Recommandation** : **Option A (try-first)** avec fallback intelligent

---

### 3. Parent Wrapper (Note N°3)

**Actuellement (lignes 334-360) :**
```javascript
// Appel parent en parallèle avec screenshot/variables
const [parentWrapperResult, screenshotResult, variablesResult] = await Promise.all([
  get_design_context(parentNodeId),  // ← GASPILLÉ en mode chunk
  get_screenshot(parentNodeId),
  get_variable_defs(parentNodeId)
]);

saveFile('parent-wrapper.tsx', parentWrapperResult);  // ← Jamais utilisé !
```

**Problèmes :**
- Le `parent-wrapper.tsx` n'est **jamais importé** dans le code final
- Les images générées par cet appel sont **potentiellement perdues**
- C'est un appel MCP **inutile** qui compte dans le rate limit

**Solutions :**

#### Si Mode Simple (1 appel suffit)
```javascript
const result = get_design_context(parentNodeId);
// Cet appel génère:
// - Component.tsx (code complet)
// - Toutes les images dans tmp/figma-assets/
// ✅ TOUT est exploité
```

#### Si Mode Chunk (design trop gros)
```javascript
// NE PAS appeler le parent pour le code
// Juste récupérer les métadonnées
const metadata = get_metadata(parentNodeId);
const screenshot = get_screenshot(parentNodeId);

// Puis chunks individuels
for (enfant) {
  get_design_context(enfant);  // Chaque enfant génère son code + images
}
```

---

### 4. Gestion Images/Code (Note N°4)

**Problèmes identifiés :**

#### A. Race Condition (MCP asynchrone)
```
MCP retourne code TSX immédiatement
MCP écrit images en ARRIÈRE-PLAN (invisible)
↓
waitForImages() peut être appelé TROP TÔT
↓
Images pas encore écrites → copie échoue → erreur Vite
```

**Fix actuel** : Délai de grâce 3s + 4 protections (fragile)

#### B. Duplication d'images
```
Chunk 1 : utilise image-A.svg
Chunk 3 : utilise aussi image-A.svg
↓
MCP génère-t-il 2 fois ou réutilise ?
→ Comportement non documenté
```

#### C. Copie en 2 temps
```
tmp/figma-assets/ → testDir/ → testDir/img/
↓
Pourquoi pas directement tmp/figma-assets/ → testDir/img/ ?
```

**Solution idéale :**

```
1. Appel MCP avec dirForAssetWrites = testDir/img/
   → Images écrites DIRECTEMENT au bon endroit

2. Attendre que le code soit retourné
   → Les images sont aussi prêtes (ou presque)

3. organize-images.js renomme sur place
   → Pas de copie nécessaire
```

**Mais** : Faut tester si MCP accepte `testDir/img/` comme cible

---

## 🎯 ARCHITECTURE RECOMMANDÉE

### Stratégie : "Try Simple First, Chunk If Needed"

```javascript
async function analyzeAndGenerate(figmaUrl) {
  const { nodeId } = parseUrl(figmaUrl);

  // ÉTAPE 0: Métadonnées toujours nécessaires
  const metadata = await get_metadata(nodeId);
  const screenshot = await get_screenshot(nodeId);
  const variables = await get_variable_defs(nodeId);

  // ÉTAPE 1: Essayer mode SIMPLE (1 appel)
  log.info('Tentative mode SIMPLE (1 appel MCP)...');

  try {
    const result = await get_design_context(nodeId, {
      dirForAssetWrites: `${testDir}/img/`,  // Direct au bon endroit
      forceCode: true
    });

    // Vérifier si le résultat est valide
    const code = result.content[0].text;
    if (isValidReactCode(code) && code.length < 100000) {
      log.success('✅ MODE SIMPLE : Design récupéré en 1 appel');

      // Sauvegarder
      saveFile('Component.tsx', code);

      // Attendre que les images soient écrites
      await waitForImagesByCount(metadata);

      // Organiser et process
      await organizeImages(testDir);
      await unifiedProcessor(testDir);

      return; // ✅ TERMINÉ EN MODE SIMPLE
    }
  } catch (error) {
    if (error.includes('rate limit') || error.includes('too large')) {
      log.warning('⚠️ Design trop volumineux pour mode simple');
      // Continuer vers mode chunk
    } else {
      throw error; // Vraie erreur
    }
  }

  // ÉTAPE 2: Mode CHUNK (nécessaire uniquement si simple a échoué)
  log.info('Passage en MODE CHUNK...');

  const nodes = extractNodesFromMetadata(metadata);
  log.info(`${nodes.length} chunks à traiter`);

  // Génération séquentielle (éviter rate limit)
  for (const node of nodes) {
    const chunkResult = await get_design_context(node.id, {
      dirForAssetWrites: `${testDir}/img/`,
      forceCode: true
    });

    saveFile(`chunks/${node.name}.tsx`, chunkResult.content[0].text);

    // Rate limit protection
    await sleep(1000);
  }

  // Assembler
  await assembleChunks(testDir);

  // Attendre images
  await waitForImagesByCount(metadata);

  // Process
  await organizeImages(testDir);
  await unifiedProcessor(testDir);
}
```

---

## 📊 COMPARAISON APPROCHES

| Critère | Approche Actuelle | Approche Recommandée |
|---------|-------------------|---------------------|
| **Appels MCP (design simple)** | 7 appels | **1 appel** ✅ |
| **Appels MCP (design complexe)** | 21 appels | 20 appels |
| **Rate limit risk** | ❌ Élevé | ✅ Minimal |
| **Complexité code** | ❌ Très élevé | ✅ Simple |
| **Race conditions** | ❌ Multiples | ✅ Une seule |
| **Robustesse** | ❌ 4 protections nécessaires | ✅ Robuste par design |
| **Décision chunking** | ❌ Forcé (toujours) | ✅ Intelligent (si nécessaire) |
| **Parent wrapper** | ❌ Gaspillé | ✅ Utilisé (mode simple) |
| **Maintenance** | ❌ Difficile | ✅ Facile |

---

## 🔧 PLAN D'ACTION

### Phase 1 : Tests de faisabilité
1. **Test dirForAssetWrites direct vers img/**
   - Vérifier si MCP accepte `testDir/img/` comme cible
   - Si NON, garder tmp mais simplifier la copie

2. **Test déduplication images**
   - Appeler 2x le même node
   - Vérifier si MCP réécrit ou skip les images existantes

3. **Test seuil chunking**
   - Tester plusieurs designs de tailles différentes
   - Identifier le seuil où get_design_context échoue

### Phase 2 : Refactoring
1. **Implémenter "Try Simple First"**
   - Essayer mode simple avant chunk
   - Fallback intelligent si échec

2. **Supprimer parent wrapper inutile en mode chunk**
   - Appeler seulement metadata/screenshot/variables
   - Pas de get_design_context sur le parent

3. **Simplifier gestion images**
   - Copie directe tmp → testDir/img/
   - Une seule attente après tous les appels MCP

### Phase 3 : Validation
1. Tester sur 10+ designs Figma différents
2. Mesurer les appels MCP réels
3. Vérifier aucune image perdue
4. Confirmer 0 race condition

---

## ✅ BÉNÉFICES ATTENDUS

- **90% de réduction des appels MCP** pour designs simples
- **0 rate limit** pour usage normal
- **Code 3x plus simple** et maintenable
- **0 race condition** par design
- **Images 100% fiables**
- **Décision intelligente** automatique

---

## 🎯 PROCHAINES ÉTAPES

1. **Valider l'analyse** avec l'équipe
2. **Exécuter Phase 1** (tests de faisabilité)
3. **Prototyper** la nouvelle architecture
4. **Tester** sur designs réels
5. **Déployer** progressivement

---

*Document créé suite à l'analyse des Notes N°1-4 sur les problèmes architecture actuelle.*
