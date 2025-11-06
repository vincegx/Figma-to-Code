# 🔍 Workflow ANCIEN Validé - Commit 218dc8e

## 📋 SOURCE: `.claude/commands/analyze-mcp.md` au commit 218dc8e

### Flux Complet

```
PHASE 1: EXTRACTION FIGMA
├─ 1.1 Préparation
│  └─ Créer testDir: src/generated/tests/node-{nodeId}-{timestamp}/
│
├─ 1.2a Nettoyer /tmp/figma-assets (OBLIGATOIRE)
│  └─ rm -rf /tmp/figma-assets/ && mkdir -p /tmp/figma-assets/
│
├─ 1.2 Appeler 4 MCP tools EN PARALLÈLE
│  ├─ get_design_context → Code React + Images écrites dans /tmp/figma-assets/
│  ├─ get_screenshot → PNG Figma
│  ├─ get_variable_defs → Variables design
│  └─ get_metadata → XML structure
│
├─ 1.2b Copier les assets depuis /tmp
│  └─ cp -r /tmp/figma-assets/* testDir/
│
└─ 1.3 Sauvegarder avec Write tool
   ├─ Component.tsx
   ├─ variables.json
   └─ metadata.xml

SI get_design_context ÉCHOUE (>25k tokens):
└─ MODE CHUNKING
   ├─ Extraire nodes depuis metadata.xml
   ├─ POUR CHAQUE nœud SÉQUENTIEL:
   │  ├─ get_design_context(nœud)
   │  └─ Sauvegarder chunks/NomNoeud.tsx
   └─ Assembler tous les chunks
```

---

## 🎯 DÉCOUVERTES CLÉS

### 1. Mode SIMPLE d'abord (90% des cas)

**Lignes 46-70 de analyze-mcp.md :**

```markdown
#### 1.2 Appeler les MCP tools EN PARALLÈLE

Utilise ces 4 outils MCP Figma **en parallèle**:

1. **`mcp__figma-desktop__get_design_context`**
   - `forceCode: true`
   - `dirForAssetWrites: /tmp/figma-assets` → Écrit assets dans tmp
   - → Code React + Tailwind complet

2. **`mcp__figma-desktop__get_screenshot`**
3. **`mcp__figma-desktop__get_variable_defs`**
4. **`mcp__figma-desktop__get_metadata`**
```

**Résultat** :
- ✅ Si get_design_context réussit → **4 appels total** → TERMINÉ
- ❌ Si get_design_context échoue → Images déjà là → Mode chunking

---

### 2. Images récupérées au PREMIER appel

**Ligne 54 - paramètre dirForAssetWrites :**

```markdown
- **`dirForAssetWrites: /tmp/figma-assets`** (tmp car problème permissions direct)
```

**Lignes 56-59 - get_design_context :**

```markdown
1. **`mcp__figma-desktop__get_design_context`**
   - `dirForAssetWrites: /tmp/figma-assets` → Écrit assets dans tmp
   - → Code React + Tailwind complet
```

**Comportement MCP observé** :
```
Appel get_design_context(parent, {dirForAssetWrites: '/tmp/figma-assets'})
├─ MCP scanne TOUT le design (parent + enfants)
├─ MCP génère TOUTES les images du design complet
├─ MCP écrit les images dans /tmp/figma-assets/ ✅
└─ MCP tente de générer le code
    ├─ SI code < 25k tokens → Retourne le code ✅ TERMINÉ
    └─ SI code > 25k tokens → Erreur "too large" ❌
        MAIS images déjà écrites dans /tmp/figma-assets/ ✅
```

**Confirmation utilisateur** (message du 5 Nov) :
> "quand je faisais mes test avec l'ancien script, j'avais remarqué qu'on
> 1/ faisait 1 appel global de tout
> 2/ pour get_design_context on avait une erreur sur la recuperation car trop gros token volume → on chunkait
> 3/ Mais au premier call j'ai remarqué que **TOUTES les images étaient récupérées**. c'est à ce moment qu'on chunkait le code"

---

### 3. Mode CHUNKING conditionnel

**Lignes 98-107 - MODE CHUNKING seulement si échec :**

```markdown
**Si get_design_context échoue (>25k tokens) - MODE CHUNKING:**

1. Extraire liste nœuds:
   mkdir -p chunks && node scripts/utils/chunking.js extract-nodes metadata.xml

2. **POUR CHAQUE NŒUD - UN PAR UN - SÉQUENTIEL:**
   - Appel `mcp__figma-desktop__get_design_context` avec nodeId du nœud
   - IMMÉDIATEMENT après, sauvegarder chunks/NomNoeud.tsx
   - **NE PAS PASSER AU NŒUD SUIVANT AVANT D'AVOIR SAUVEGARDÉ**

3. Quand TOUS les chunks sauvegardés:
   node scripts/utils/chunking.js assemble-chunks testDir Component chunks/*.tsx
```

**Points importants** :
- ✅ Chunking **SEULEMENT SI** get_design_context échoue
- ✅ Images **DÉJÀ RÉCUPÉRÉES** par l'appel parent qui a échoué
- ✅ Chunks = **CODE UNIQUEMENT** (pas de dirForAssetWrites mentionné)
- ✅ Séquentiel (un par un) avec sauvegarde immédiate

**Note** : Pas de mention de `parent-wrapper.tsx` dans l'ancien process.

---

### 4. Copie des images depuis /tmp

**Lignes 72-96 - Attente et copie des images :**

```bash
# Compter combien d'images on attend depuis Component.tsx
expected_count=$(grep -o '/tmp/figma-assets/[^"]*\.(png|svg|jpg|jpeg|gif|webp)' \
  Component.tsx | sort -u | wc -l)

# Attendre CE nombre précis d'images (max 30s)
for i in {1..30}; do
  actual_count=$(ls /tmp/figma-assets/*.{png,svg,jpg,jpeg,gif,webp} 2>/dev/null | wc -l)
  if [ "$actual_count" -ge "$expected_count" ]; then
    break
  fi
  sleep 1
done

# Copier dans la racine (organize-images.js les déplacera vers img/)
cp -r /tmp/figma-assets/* src/generated/tests/node-{nodeId}-{timestamp}/ 2>/dev/null || true
```

**Flux des images** :
```
1. MCP écrit dans: /tmp/figma-assets/
   └─ Toutes les images du design complet
   └─ Nommées avec hash SHA1

2. Script attend que toutes les images soient écrites
   └─ Vérifie le nombre attendu depuis Component.tsx

3. Script copie: /tmp/figma-assets/* → testDir/
   └─ Images à la racine du testDir

4. organize-images.js
   └─ Déplace: testDir/*.{png,svg} → testDir/img/
   └─ Renomme avec noms Figma depuis metadata.xml
```

---

## 📊 COMPARAISON OLD vs CURRENT (figma-cli.js)

| Aspect | OLD (218dc8e) | CURRENT (figma-cli.js) |
|--------|---------------|------------------------|
| **Stratégie** | Try simple FIRST | Chunk SYSTÉMATIQUE |
| **Premier appel** | 4 outils parallel | get_metadata seul |
| **Décision chunking** | Si code échoue | TOUJOURS (forcé) |
| **Mode simple** | 4 appels (90% cas) | N'existe plus |
| **Images simple** | 1 appel récupère tout | ??? |
| **Images chunk** | Déjà là (appel échoué) | N appels (1 par chunk) |
| **parent-wrapper** | Non mentionné | Généré explicitement |
| **Appels MCP min** | **4** | **10+** |

---

## 🎯 CE QUI A ÉTÉ PERDU dans le refacto 71b0af9

### 1. Tentative mode SIMPLE

**OLD** :
```javascript
// 4 appels en parallèle
const [code, screenshot, variables, metadata] = await Promise.all([
  get_design_context(parent, {dirForAssetWrites: '/tmp/figma-assets'}),
  get_screenshot(parent),
  get_variable_defs(parent),
  get_metadata(parent)
]);

// Si ça marche → TERMINÉ (4 appels)
// Si ça échoue → Images déjà là → Mode chunk
```

**CURRENT** :
```javascript
// Jamais de tentative mode simple
// TOUJOURS chunking
```

---

### 2. Images récupérées EN 1 FOIS

**OLD** :
```
Premier appel get_design_context(parent)
└─ MCP écrit TOUTES les images ✅
   (Même si code échoue car >25k tokens)

Puis si chunking :
└─ Chunks appellent get_design_context SANS dirForAssetWrites (?)
   └─ Images déjà là, pas de duplication
```

**CURRENT** :
```
Appel parent → Images ???
Puis CHAQUE chunk AVEC dirForAssetWrites
└─ N appels avec écriture images
└─ Race conditions multiples
└─ Attentes après chaque chunk
```

---

### 3. Minimum d'appels MCP

**OLD** :
```
Design simple : 4 appels ✅
├─ get_design_context → Code + Images
├─ get_screenshot → PNG
├─ get_variable_defs → Variables
└─ get_metadata → XML

Design chunk : 4 + N appels
├─ 4 appels parallèles (code échoue, images OK)
└─ N chunks (code uniquement)
```

**CURRENT** :
```
TOUS designs : 10+ appels
├─ 1 metadata
├─ 3 parallèles (parent, screenshot, vars)
├─ 1 parent-wrapper
├─ 1 attente
└─ N chunks
```

**Surcharge** : 150% d'augmentation pour designs simples

---

## ✅ STRATÉGIE OPTIMALE : Revenir à l'ancien avec améliorations

### Reprendre le flow OLD avec les fixes du NEW

```javascript
// ÉTAPE 1: Nettoyer /tmp/figma-assets (CRITIQUE)
execSync('rm -rf /tmp/figma-assets/ && mkdir -p /tmp/figma-assets/');

// ÉTAPE 2: Tentative MODE SIMPLE (4 appels parallel)
log.info('🎯 Tentative mode SIMPLE...');

try {
  const [codeResult, screenshotResult, variablesResult, metadataResult] =
    await Promise.all([
      get_design_context(nodeId, {
        dirForAssetWrites: '/tmp/figma-assets/',
        forceCode: true
      }),
      get_screenshot(nodeId),
      get_variable_defs(nodeId),
      get_metadata(nodeId)
    ]);

  const code = codeResult.content[0].text;

  // ✅ SUCCÈS MODE SIMPLE
  if (isValidCode(code) && code.length < 100000) {
    saveFile('Component.tsx', code);

    // Attendre images (amélioration NEW)
    await waitForImages(code); // Compte imports dans code
    await copyImages('/tmp/figma-assets/', testDir);

    log.success('✅ Mode SIMPLE : 4 appels');
    return; // TERMINÉ
  }

} catch (error) {
  if (error.includes('too large') || error.includes('token')) {
    log.warning('⚠️  Code trop volumineux, mode chunk');

    // 🎉 IMAGES DÉJÀ RÉCUPÉRÉES par l'appel qui a échoué
    await waitForImages(metadata); // Compte depuis metadata.xml
    await copyImages('/tmp/figma-assets/', testDir);
    log.success('Images récupérées par appel parent');
  } else {
    throw error; // Vraie erreur
  }
}

// ÉTAPE 3: MODE CHUNK (seulement si nécessaire)
log.info('📦 Mode CHUNK...');

const nodes = extractNodes(metadataResult);

// Parent wrapper pour CSS global (amélioration NEW)
const parentWrapper = await get_design_context(nodeId, {
  dirForAssetWrites: '', // Pas d'images (déjà récupérées)
  forceCode: true
});
saveFile('parent-wrapper.tsx', parentWrapper);

// Chunks SANS images
for (const node of nodes) {
  const chunk = await get_design_context(node.id, {
    dirForAssetWrites: '', // Images déjà là
    forceCode: true
  });
  saveFile(`chunks/${node.name}.tsx`, chunk);
  await sleep(1000); // Rate limit
}

// Assembler
await assembleChunks(testDir);
await organizeImages(testDir);
```

---

## 📊 RÉSULTATS ATTENDUS

### Design simple (90% des cas)
- **OLD** : 4 appels ✅
- **CURRENT** : 10 appels ❌
- **OPTIMAL** : 4 appels ✅

### Design complexe (10% des cas)
- **OLD** : 4 + N appels
- **CURRENT** : 10 + N appels
- **OPTIMAL** : 5 + N appels (1 parent wrapper supplémentaire)

---

## 🧪 VALIDATION NÉCESSAIRE

### Q1: Dans l'ancien process, dirForAssetWrites était-il utilisé pour les chunks ?

**Réponse** : NON - Pas mentionné dans analyze-mcp.md ligne 98-107

### Q2: Comment le CSS du parent était-il géré en mode chunk ?

**Réponse** : Pas de mention de parent-wrapper.tsx dans l'ancien process
→ Probablement une amélioration du NEW process

### Q3: Les images étaient-elles vraiment toutes récupérées au premier appel ?

**Réponse** : OUI - Confirmé par l'utilisateur
→ "au premier call j'ai remarqué que TOUTES les images étaient récupérées"

---

*Analyse basée sur `.claude/commands/analyze-mcp.md` au commit 218dc8e*
*Comparé avec `scripts/figma-cli.js` actuel (post 71b0af9)*
