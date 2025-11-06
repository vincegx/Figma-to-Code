# 🔍 Analyse Complète de la Séquence d'Appels MCP

## 📊 Séquence ACTUELLE (figma-cli.js)

```javascript
// PHASE 1: EXTRACTION

// 1️⃣ Premier appel (ligne 326)
get_metadata(nodeId) → metadata.xml
  └─ Durée: ~1-2s
  └─ Résultat: Structure XML (hiérarchie des nodes)

// 2️⃣ Appels parallèles (ligne 334-342)
Promise.all([
  get_design_context(nodeId),  // → parent-wrapper.tsx
  get_screenshot(nodeId),       // → figma-screenshot.png
  get_variable_defs(nodeId)     // → variables.json
])
  └─ Durée: ~3-5s (le plus lent)
  └─ 3 appels simultanés

// 3️⃣ Extraction nodes depuis metadata.xml (ligne 363)
extractNodes(metadata.xml) → 6 nodes enfants

// 4️⃣ Boucle sur les chunks (ligne 387-431)
FOR i=1 to 6:
  get_design_context(enfant[i]) → chunks/X.tsx
  wait 1s
  └─ Durée: ~6-12s (séquentiel)
  └─ 6 appels séquentiels

// TOTAL: 1 + 3 + 6 = 10 appels MCP
// DURÉE: ~10-20 secondes
```

---

## 🧐 ANALYSE: Chaque appel est-il NÉCESSAIRE ?

### 1️⃣ get_metadata → metadata.xml

**Contenu :**
```xml
<node id="201:14305" name="welcome" type="FRAME" width="390" height="844">
  <node id="201:14333" name="Appbar" type="FRAME" />
  <node id="201:14341" name="Group" type="GROUP" />
  ...
</node>
```

**Utilisé pour :**
- Extraire la liste des nodes enfants (si chunking)
- Analyse de la structure dans les rapports
- Calculer les dimensions du screenshot

**Nécessaire ?**
- ✅ **OUI** si mode chunk (pour extraire les enfants)
- ❌ **NON** si mode simple (1 seul appel suffit)

**Timing :**
- Peut être fait EN PREMIER (décider si chunking nécessaire)
- OU après échec de get_design_context (fallback)

---

### 2️⃣ get_design_context(parent) → parent-wrapper.tsx

**Contenu :**
```tsx
import Appbar from './chunks/Appbar';
import Frame1321314731 from './chunks/Frame 1321314731';

export default function Component() {
  return (
    <div className="bg-white relative size-full">
      <Appbar />
      <Frame1321314731 />
      ...
    </div>
  );
}
```

**Utilisé pour :**
- ❌ **Actuellement : RIEN !** Le fichier est sauvegardé mais jamais utilisé
- En mode chunk, on génère Component.tsx via `assemble-chunks` (ligne 447)

**Images générées ?**
- 🤔 **Incertain** : Si le parent contient des images, MCP les écrit-il ?
- Besoin de tester si ces images sont perdues ou réutilisées

**Nécessaire ?**
- ✅ **OUI** en mode SIMPLE (c'est le SEUL appel nécessaire)
- ❌ **NON** en mode chunk (on assemble manuellement)

**Conclusion :**
- **En mode simple** : C'est LE call principal qui génère tout
- **En mode chunk** : GASPILLÉ complètement

---

### 3️⃣ get_screenshot → figma-screenshot.png

**Contenu :**
- Screenshot PNG du design Figma

**Utilisé pour :**
- Validation visuelle (comparaison Figma vs Web)
- Affiché dans le rapport HTML
- Critique pour vérifier la fidélité

**Nécessaire ?**
- ✅ **OUI** toujours (validation qualité)

**Timing :**
- Peut être fait EN PARALLÈLE du code
- OU même APRÈS le code (pas bloquant)

---

### 4️⃣ get_variable_defs → variables.json

**Contenu :**
```json
{
  "colors": {
    "primary": "#472b46",
    "secondary": "#949494"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  }
}
```

**Utilisé pour :**
- Affichage dans le dashboard
- Analyse dans les rapports
- Documentation des design tokens

**Nécessaire ?**
- ⚠️ **UTILE** mais pas critique pour le code
- Le code TSX contient déjà les couleurs en dur

**Timing :**
- Peut être fait EN PARALLÈLE ou APRÈS
- Pas bloquant pour la génération du code

---

### 5️⃣ get_design_context(chunks) × 6

**Contenu :**
- Code TSX de chaque chunk individuel
- Images spécifiques à ce chunk

**Nécessaire ?**
- ✅ **OUI** seulement si mode chunk activé
- ❌ **NON** si mode simple suffit

**Problèmes actuels :**
- 6 appels séquentiels avec wait 1s = lent
- Risque rate limit si beaucoup de chunks
- Race condition sur les images

---

## 🎯 SÉQUENCES OPTIMALES

### Option A : "Try Simple First" (RECOMMANDÉE)

```javascript
// ÉTAPE 1: Essayer mode simple (optimiste)
try {
  // 1 SEUL appel pour tout récupérer
  const result = await get_design_context(parentNodeId);

  if (isValidCode(result) && result.length < 100000) {
    // ✅ SUCCÈS en mode simple
    saveFile('Component.tsx', result);

    // Appels complémentaires EN PARALLÈLE (non bloquants)
    await Promise.all([
      get_screenshot(parentNodeId),
      get_variable_defs(parentNodeId)
    ]);

    // PAS BESOIN de metadata.xml !

    return; // TERMINÉ - 1 + 2 = 3 appels total
  }
} catch (error) {
  if (error.includes('too large')) {
    // Fallback vers mode chunk
  }
}

// ÉTAPE 2: Mode chunk (seulement si étape 1 a échoué)
log.warning('Design trop volumineux, mode chunk nécessaire');

// Maintenant on a besoin de metadata
const metadata = await get_metadata(parentNodeId);
const nodes = extractNodes(metadata);

// Appels screenshot/variables pendant extraction chunks
const [screenshotResult, variablesResult] = await Promise.all([
  get_screenshot(parentNodeId),
  get_variable_defs(parentNodeId)
]);

// Chunks séquentiels
for (const node of nodes) {
  const chunk = await get_design_context(node.id);
  saveFile(`chunks/${node.name}.tsx`, chunk);
  await sleep(1000); // Rate limit protection
}

// Assembler
assembleChunks();

// TOTAL si chunk: 1 (échec) + 1 (metadata) + 2 (screenshot/vars) + 6 (chunks) = 10 appels
// TOTAL si simple: 1 (code) + 2 (screenshot/vars) = 3 appels ✅
```

**Avantages :**
- ✅ **90% des cas** : 3 appels (au lieu de 10)
- ✅ Design simple traité en ~5 secondes (au lieu de 20s)
- ✅ Minimum de rate limit risk
- ✅ metadata.xml seulement si nécessaire

**Inconvénients :**
- ⚠️ Si échec en mode simple, 1 appel "gaspillé"
- Mais c'est acceptable (1 appel vs économie de 7)

---

### Option B : "Metadata First" (CONSERVATRICE)

```javascript
// ÉTAPE 1: Récupérer metadata TOUJOURS
const metadata = await get_metadata(parentNodeId);

// ÉTAPE 2: Analyser la taille/complexité
const complexity = analyzeComplexity(metadata);
const shouldChunk = complexity.nodes > 10 || complexity.depth > 5;

// ÉTAPE 3A: Si simple (décision AVANT d'appeler)
if (!shouldChunk) {
  const [codeResult, screenshotResult, variablesResult] = await Promise.all([
    get_design_context(parentNodeId),
    get_screenshot(parentNodeId),
    get_variable_defs(parentNodeId)
  ]);

  saveFile('Component.tsx', codeResult);

  // TOTAL: 1 (metadata) + 3 (parallel) = 4 appels
}

// ÉTAPE 3B: Si chunk nécessaire
else {
  const nodes = extractNodes(metadata);

  const [screenshotResult, variablesResult] = await Promise.all([
    get_screenshot(parentNodeId),
    get_variable_defs(parentNodeId)
  ]);

  for (const node of nodes) {
    const chunk = await get_design_context(node.id);
    saveFile(`chunks/${node.name}.tsx`, chunk);
    await sleep(1000);
  }

  assembleChunks();

  // TOTAL: 1 (metadata) + 2 (screenshot/vars) + 6 (chunks) = 9 appells
}
```

**Avantages :**
- ✅ Décision intelligente AVANT d'appeler get_design_context
- ✅ Aucun appel gaspillé
- ✅ Prévisible

**Inconvénients :**
- ❌ 1 appel de plus en mode simple (4 au lieu de 3)
- ❌ Seuil de complexité difficile à déterminer
- ❌ Peut mal évaluer (metadata < 25k mais code > 25k)

---

### Option C : "Metadata + Try" (HYBRIDE)

```javascript
// ÉTAPE 1: Metadata rapide (1 appel)
const metadata = await get_metadata(parentNodeId);
const complexity = analyzeComplexity(metadata);

// ÉTAPE 2: Si clairement trop complexe, chunk direct
if (complexity.nodes > 20) {
  log.info('Design très complexe détecté, mode chunk');
  // → Aller direct en mode chunk (skip try simple)
  // TOTAL: 1 + 2 + N = 3 + N appels
}

// ÉTAPE 3: Sinon, essayer simple
else {
  try {
    const result = await get_design_context(parentNodeId);
    if (isValid(result)) {
      // ✅ Succès simple
      // TOTAL: 1 (metadata) + 1 (code) + 2 (screenshot/vars) = 4 appels
    }
  } catch {
    // → Fallback chunk
    // TOTAL: 1 + 1 (échec) + 2 + N = 4 + N appels
  }
}
```

**Avantages :**
- ✅ Optimise les cas extrêmes (très gros = pas de try)
- ✅ Optimise les cas moyens (pas sûr = try)

**Inconvénients :**
- ❌ Plus complexe à implémenter
- ❌ 4 appels minimum (au lieu de 3 en Option A)

---

## 📊 COMPARAISON

| Scénario | Actuel | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| **Design simple (1 node)** | 10 | **3** ✅ | 4 | 4 |
| **Design moyen (6 nodes)** | 10 | **3** ✅ | 4 | 4 |
| **Design complexe (20 nodes)** | 24 | 23 | **23** ✅ | **23** ✅ |
| **Design ÉNORME évident (50 nodes)** | 54 | 54 | 53 | **52** ✅ |

---

## 🎯 QUESTIONS CLÉS À RÉSOUDRE

### Q1: metadata.xml est-il vraiment nécessaire en mode simple ?

**Test :**
```bash
# Mode simple sans metadata
get_design_context(parent) → Component.tsx ✅
organize-images ✅
unified-processor → Besoin de metadata.xml ?
```

**Utilisations de metadata.xml :**
1. ✅ Extraire les nodes enfants (chunking)
2. ⚠️ Parsing dimensions pour screenshot (mais on peut les extraire du code TSX)
3. ⚠️ Générer analysis.md (informationnel, pas critique)

**Conclusion :**
- Mode simple: metadata.xml = **OPTIONNEL** (nice to have)
- Mode chunk: metadata.xml = **OBLIGATOIRE**

---

### Q2: Peut-on récupérer screenshot/variables APRÈS le code ?

**Timing actuel :**
```
Code + Screenshot + Variables EN PARALLÈLE
↓ (5s)
organize-images
↓
unified-processor
↓
capture web screenshot
↓
compare screenshots
```

**Timing optimisé :**
```
Code SEUL
↓ (2s)
organize-images
↓
unified-processor
↓
Screenshot + Variables EN PARALLÈLE (pendant processing)
↓
capture web screenshot
↓
compare screenshots
```

**Conclusion :**
- ✅ **OUI**, screenshot/variables ne bloquent PAS le processing
- Peuvent être récupérés APRÈS ou EN PARALLÈLE

---

### Q3: parent-wrapper.tsx sert-il à quelque chose ?

**Analyse code :**
```bash
$ grep -r "parent-wrapper" src/
# → AUCUN résultat !
```

**Conclusion :**
- ❌ parent-wrapper.tsx est **JAMAIS importé**
- ❌ parent-wrapper.tsx est **JAMAIS utilisé**
- En mode chunk, Component.tsx est généré par `assemble-chunks`

**Action :**
- Mode simple: parent-wrapper = Component.tsx (renommer)
- Mode chunk: NE PAS appeler get_design_context sur le parent

---

## 🎯 RECOMMANDATION FINALE

### Approche : **Option A "Try Simple First"** (3 appels pour 90% des cas)

**Séquence optimale :**

```javascript
// ÉTAPE 1: Essayer en mode SIMPLE (optimiste)
const codeResult = await get_design_context(parentNodeId);

if (isValid(codeResult)) {
  // ✅ Succès - 1 appel suffit
  saveFile('Component.tsx', codeResult);

  // Compléments en parallèle (non bloquants)
  Promise.all([
    get_screenshot(parentNodeId),
    get_variable_defs(parentNodeId)
    // Pas de metadata en mode simple !
  ]);

  // Continuer le processing
  return; // 3 appels total
}

// ÉTAPE 2: Fallback mode chunk
const metadata = await get_metadata(parentNodeId);
const nodes = extractNodes(metadata);

// Screenshots en parallèle
Promise.all([
  get_screenshot(parentNodeId),
  get_variable_defs(parentNodeId)
]);

// Chunks séquentiels
for (node of nodes) {
  const chunk = await get_design_context(node.id);
  saveFile(`chunks/${node.name}.tsx`, chunk);
  await sleep(1000);
}

// 1 + 1 + 2 + N appels si fallback
```

**Bénéfices :**
- ✅ **70% de réduction d'appels** (3 vs 10) pour designs simples
- ✅ **60% plus rapide** (5s vs 20s)
- ✅ **Minimum rate limit** (3 appels en temps normal)
- ✅ **Simple à implémenter**

---

## 🧪 TESTS NÉCESSAIRES

1. **Confirmer que metadata.xml est optionnel en mode simple**
   - Tester unified-processor sans metadata.xml
   - Vérifier génération des rapports

2. **Mesurer durée réelle de chaque appel**
   - get_metadata: ? secondes
   - get_design_context: ? secondes
   - get_screenshot: ? secondes
   - get_variable_defs: ? secondes

3. **Tester "try simple first" sur plusieurs designs**
   - Petit (1 node) → doit réussir en 1 appel
   - Moyen (5-10 nodes) → doit réussir en 1 appel ?
   - Gros (20+ nodes) → doit fallback en chunk

---

*Document d'analyse complète de tous les appels MCP et leur nécessité réelle.*
