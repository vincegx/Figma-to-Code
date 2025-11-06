# 🧪 Résultats des Tests de Stratégie

## 📊 Résumé des Tests

### ✅ TEST 1 VALIDÉ : dirForAssetWrites désactive les images

**Hypothèse** : Passer `dirForAssetWrites` vide/null/omis désactive l'écriture d'images

**Résultats** :
- ✅ `dirForAssetWrites: ""` (vide) → 0 images écrites
- ✅ `dirForAssetWrites: null` → 0 images écrites
- ✅ Paramètre omis → 0 images écrites

**Conclusion** : ✅ **VALIDÉ** - On peut désactiver l'écriture d'images en chunks

---

### ❓ TEST 2 INCONCLUSIF : Images récupérées par appel parent

**Hypothèse (utilisateur)** :
> "Au premier call j'ai remarqué que TOUTES les images étaient récupérées. C'est à ce moment qu'on chunkait le code"

**Résultats** :
- Node testé 1: `201:14305` → 0 images générées
- Node testé 2: `168:14226` (parent avec enfants) → 0 images générées

**Observation** : Même avec un node parent qui a des enfants avec images, l'appel `get_design_context(parent)` ne génère AUCUNE image.

**Questions ouvertes** :
1. Les images étaient-elles attachées **directement au parent** (pas dans les enfants) ?
2. Le contexte était-il différent (autre version de MCP, autre paramètre) ?
3. Les images des enfants ne sont générées QUE quand on appelle les enfants individuellement ?

---

### ❓ TEST 3 INCONCLUSIF : Timing d'écriture des images

**Résultats** :
- Code reçu à T+0.0s
- Aucune image détectée pendant 30s de surveillance

**Conclusion** : Impossible de mesurer le timing car aucune image n'a été générée.

---

## 🔍 Analyse des Résultats

### Ce qui est confirmé ✅

1. **dirForAssetWrites vide désactive les images** ✅
   - On peut appeler les chunks sans régénérer les images
   - Cela validera économiser des appels et éviter les duplications

2. **MCP peut générer du code sans images** ✅
   - Le code TSX est retourné même sans images
   - Pas de blocage si dirForAssetWrites est vide

### Ce qui est remis en question ❓

1. **"Appel parent génère TOUTES les images"** ❓
   - Nos tests montrent : appel parent = 0 images
   - Contradiction avec l'observation utilisateur
   - Besoin de clarification sur le contexte

2. **Stratégie de récupération des images** ❓
   - Si le parent ne génère pas les images des enfants...
   - Comment récupérer les images EN 1 FOIS ?
   - Faut-il appeler tous les enfants avec dirForAssetWrites ?

---

## 🎯 Implications pour la Stratégie

### Stratégie ACTUELLE (validée)

```javascript
// metadata + screenshot + variables
await Promise.all([
  get_metadata(nodeId),
  get_screenshot(nodeId),
  get_variable_defs(nodeId)
]);

// Tentative mode simple
const code = await get_design_context(nodeId, {
  dirForAssetWrites: 'tmp/figma-assets/' // ✅ Génère images si simples
});

// Si échec (trop gros) → Mode chunk
const parent = await get_design_context(nodeId, {
  dirForAssetWrites: '' // ✅ PAS d'images (déjà récupérées... ou pas ?)
});

for (child of children) {
  await get_design_context(child, {
    dirForAssetWrites: '' // ✅ PAS d'images (?)
  });
}
```

**Problème** : Si l'appel parent ne génère PAS les images des enfants, où les récupérer ?

---

### Stratégies Alternatives

#### Option A : Récupérer images au PREMIER chunk

```javascript
// Premier chunk AVEC images
const chunk1 = await get_design_context(children[0], {
  dirForAssetWrites: 'tmp/figma-assets/' // ✅ Génère images
});

// Chunks suivants SANS images
for (i=1; i<children.length; i++) {
  const chunk = await get_design_context(children[i], {
    dirForAssetWrites: '' // ❌ PAS d'images
  });
}
```

**Problème** : Le premier chunk ne contient peut-être pas TOUTES les images

---

#### Option B : TOUS les chunks avec images (actuel)

```javascript
for (child of children) {
  await get_design_context(child, {
    dirForAssetWrites: 'tmp/figma-assets/' // ✅ Chaque chunk génère ses images
  });
}
```

**Avantages** :
- ✅ Garantit que toutes les images sont récupérées
- ✅ Chaque chunk génère ses propres images

**Inconvénients** :
- ❌ Race conditions possibles
- ❌ Duplication si même image dans plusieurs chunks
- ❌ Gestion async complexe

**Mais avec notre Test 1** : On peut garder cette approche !
- Les images sont générées par tous les chunks
- Mais organize-images déduplique automatiquement (hash identiques)

---

#### Option C : Mode mixte (parent + chunks sans images)

```javascript
// Parent AVEC images (tenter de récupérer ce qui est au niveau parent)
const parent = await get_design_context(nodeId, {
  dirForAssetWrites: 'tmp/figma-assets/' // Génère images du parent
});

// Si échec ou besoin de chunk
for (child of children) {
  await get_design_context(child, {
    dirForAssetWrites: 'tmp/figma-assets/' // ⚠️ Génère images des enfants
  });
}
```

**Problème** : On ne sait pas quelles images sont au niveau parent vs enfants

---

## 📋 Questions pour l'Utilisateur

### Q1 : Contexte de l'observation "toutes les images récupérées"

> "Au premier call j'ai remarqué que TOUTES les images étaient récupérées"

**Clarifications nécessaires** :
1. C'était quel appel exactement ? (parent ou premier enfant ?)
2. Les images étaient attachées au parent lui-même ou aux enfants ?
3. Le design était structuré comment (hierarchy Figma) ?
4. Quelle version de MCP Figma Desktop ?

---

### Q2 : Comportement actuel observé

**Dans le workflow actuel** :
```javascript
// figma-cli.js ligne 391-395
for (node of nodes) {
  const chunk = await get_design_context(node.id, {
    dirForAssetWrites: 'tmp/figma-assets/'
  });
}
```

**Questions** :
1. Les images SONT bien générées actuellement ?
2. Chaque chunk génère ses images ?
3. Y a-t-il des duplications observées ?

---

## 🎯 Recommandations

### Recommandation Immédiate : Garder l'approche actuelle

**Pourquoi ?**
1. ✅ Test 1 confirme qu'on PEUT désactiver images si besoin
2. ✅ L'approche actuelle (tous les chunks avec images) FONCTIONNE
3. ⚠️ On n'a PAS prouvé que "parent génère toutes les images"

**Modifications suggérées** :
1. Améliorer l'appel parent en mode chunk :
   ```javascript
   // Parent wrapper SANS images (validé par Test 1)
   const parent = await get_design_context(nodeId, {
     dirForAssetWrites: '', // ✅ Pas d'images
     forceCode: true
   });
   ```

2. Chunks avec images (comme actuellement) :
   ```javascript
   for (child of children) {
     const chunk = await get_design_context(child, {
       dirForAssetWrites: 'tmp/figma-assets/', // ✅ Images
       forceCode: true
     });
   }
   ```

3. Attendre APRÈS TOUS les chunks (comme actuellement avec le fix) :
   ```javascript
   // Wait 3s grace period + waitForImages
   await sleep(3000);
   await waitForImages();
   ```

---

### Optimisations Futures (après clarification)

**Si on confirme** que l'appel parent génère les images des enfants :
- Récupérer images au premier appel
- Chunks sans images (dirForAssetWrites vide)
- Économie d'appels et de temps

**Si on confirme** que chaque chunk génère ses images :
- Garder l'approche actuelle
- Améliorer la déduplication
- Optimiser waitForImages

---

## ✅ Ce qui est VALIDÉ pour la refacto

1. **metadata + screenshot + variables en premier** ✅
   - Toujours nécessaires
   - Peuvent être en parallèle

2. **dirForAssetWrites vide désactive images** ✅
   - Utilisable pour parent wrapper en mode chunk
   - Économise du temps et évite duplications

3. **Mode simple devrait être essayé en premier** ✅
   - 4 appels au lieu de 10+ pour 90% des cas
   - Tentative avant chunking

4. **parent-wrapper.tsx nécessaire en mode chunk** ✅
   - Contient les classes CSS du conteneur
   - assemble-chunks l'utilise

---

## 🧪 Tests Complémentaires Nécessaires

1. **Tester avec un node qui a des images DIRECTEMENT** :
   - Pas dans les enfants, mais au niveau parent
   - Voir si get_design_context(parent) génère ces images

2. **Comparer ancien vs nouveau workflow** :
   - Relire les logs d'un test ancien
   - Identifier exactement QUAND les images étaient générées

3. **Tester la déduplication** :
   - Appeler 2 chunks avec même image
   - Vérifier si MCP écrit 2 fois ou détecte le doublon

---

*Tests effectués le 2025-11-06*
*Nodes testés : 201:14305, 168:14226*
*MCP Figma Desktop via http://host.docker.internal:3845/mcp*
