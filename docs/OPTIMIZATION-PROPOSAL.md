# 🚀 Proposition d'optimisation : Séparation Images / Code

## Problème actuel

```
Appel MCP chunk 1 → Code ✅ + Images ⏳ (asynchrone)
Wait 1s
Appel MCP chunk 2 → Code ✅ + Images ⏳ (asynchrone)
Wait 1s
...
Appel MCP chunk 6 → Code ✅ + Images ⏳ (asynchrone)
Wait 3s (délai de grâce)
waitForImages() → Vérifie si toutes les images sont là
```

**Problèmes :**
- Race condition : MCP peut être lent à écrire les images
- On génère potentiellement des images en double (même image référencée par plusieurs chunks)
- Complexité de la gestion d'attente

---

## 💡 Solution proposée : Pré-génération des images

### Stratégie A : Un appel parent pour toutes les images

```javascript
// PHASE 1.1 : Génération PARENT pour forcer toutes les images
log.task('📦', 'Pré-génération de toutes les images via parent node');

await this.callMCPTool('get_design_context', {
  nodeId: this.nodeId,  // Node parent
  dirForAssetWrites: this.assetsDir,
  forceCode: true,
  ...this.config.commonParams
});

// MCP génère le code parent complet avec TOUTES les images
// des enfants incluses

log.info('Attente 5s pour écriture complète des images...');
await new Promise(resolve => setTimeout(resolve, 5000));

// Vérification
const assetsFiles = fs.readdirSync(this.assetsDir).filter(isImage);
log.success(`${assetsFiles.length} images pré-générées ✅`);

// Copie IMMÉDIATE vers testDir
execSync(`cp -rv "${this.assetsDir}"/* "${this.testDir}"/`);
log.success('Images copiées dans testDir ✅');


// PHASE 1.2 : Génération des chunks (code uniquement)
log.task('🔧', 'Génération des chunks de code');

for (const node of nodes) {
  // Option A1: Appeler quand même get_design_context
  // Les images existent déjà, MCP ne les régénère pas
  const codeResult = await this.callMCPTool('get_design_context', {
    nodeId: node.id,
    dirForAssetWrites: this.assetsDir,  // Même répertoire
    forceCode: true,
    ...this.config.commonParams
  });

  // Sauvegarder le code uniquement
  this.saveFile(`chunks/${node.name}.tsx`, codeResult.content[0].text);

  // PAS d'attente pour images, elles sont déjà là !
}
```

**Avantages :**
- ✅ Toutes les images générées EN AVANCE
- ✅ Pas de race condition
- ✅ Pas de duplication d'images (MCP réutilise celles déjà écrites)
- ✅ Plus besoin de `waitForImages()` complexe
- ✅ Plus rapide : pas d'attente entre chunks

**Inconvénients potentiels :**
- ⚠️ L'appel parent génère-t-il vraiment TOUTES les images des enfants ?
- ⚠️ Faut tester si MCP réutilise bien les images déjà écrites

---

### Stratégie B : Forcer tous les nodes d'un coup

```javascript
// PHASE 1.1 : Appeler TOUS les nodes en parallèle pour images
log.task('📦', 'Pré-génération images pour tous les nodes');

// Extraire les nodes enfants AVANT
const nodes = extractNodesFromMetadata(metadata);

// Appeler tous les nodes EN PARALLÈLE
const allImagePromises = nodes.map(node =>
  this.callMCPTool('get_design_context', {
    nodeId: node.id,
    dirForAssetWrites: this.assetsDir,
    forceCode: true,
    ...this.config.commonParams
  })
);

// Attendre que TOUS les appels soient terminés
const allResults = await Promise.all(allImagePromises);

// Maintenant les images devraient être en écriture
log.info('Attente 5s pour écriture complète...');
await new Promise(resolve => setTimeout(resolve, 5000));

// Vérifier et copier
const assetsFiles = fs.readdirSync(this.assetsDir).filter(isImage);
log.success(`${assetsFiles.length} images détectées`);
execSync(`cp -rv "${this.assetsDir}"/* "${this.testDir}"/`);


// PHASE 1.2 : Sauvegarder le code (déjà récupéré)
log.task('💾', 'Sauvegarde des chunks de code');

allResults.forEach((result, i) => {
  this.saveFile(`chunks/${nodes[i].name}.tsx`, result.content[0].text);
});
```

**Avantages :**
- ✅ UN seul appel parallèle pour tout
- ✅ Plus rapide (pas d'attente 1s entre chunks)
- ✅ Images et code récupérés en même temps
- ✅ Pas de duplication

**Inconvénients potentiels :**
- ⚠️ Risque de rate limit Figma API (6 appels simultanés)
- ⚠️ Plus de mémoire utilisée (6 résultats en parallèle)

---

### Stratégie C : Désactiver l'écriture images sur chunks

```javascript
// PHASE 1.1 : Premier appel avec images
log.task('📦', 'Génération parent avec images');

await this.callMCPTool('get_design_context', {
  nodeId: this.nodeId,
  dirForAssetWrites: this.assetsDir,  // ACTIVER écriture
  forceCode: true
});

await new Promise(resolve => setTimeout(resolve, 5000));
execSync(`cp -rv "${this.assetsDir}"/* "${this.testDir}"/`);


// PHASE 1.2 : Chunks SANS génération d'images
log.task('🔧', 'Génération chunks (code uniquement)');

for (const node of nodes) {
  const codeResult = await this.callMCPTool('get_design_context', {
    nodeId: node.id,
    dirForAssetWrites: '',  // ❓ DÉSACTIVER écriture
    // OU
    // dirForAssetWrites: null,
    // OU ne pas passer le paramètre
    forceCode: true,
    ...this.config.commonParams
  });

  this.saveFile(`chunks/${node.name}.tsx`, codeResult.content[0].text);
}
```

**Avantages :**
- ✅ Contrôle total sur quand les images sont générées
- ✅ Pas de duplication
- ✅ Pas de race condition

**Inconvénients :**
- ❓ **Faut tester** si MCP supporte dirForAssetWrites vide/null
- ❓ Le code TSX va-t-il quand même référencer les images ?

---

## 🧪 Test de faisabilité

### Test 1 : L'appel parent génère-t-il toutes les images ?

```bash
# Nettoyer tmp/figma-assets
rm -rf tmp/figma-assets/*

# Appeler SEULEMENT le parent
docker exec mcp-figma-v1 node scripts/test-parent-images.js <parent-nodeId>

# Vérifier combien d'images sont générées
ls -la tmp/figma-assets/ | wc -l

# Comparer avec le nombre d'images attendues des enfants
```

**Si OUI** → Stratégie A fonctionne ✅
**Si NON** → Faut utiliser Stratégie B

---

### Test 2 : MCP réutilise-t-il les images déjà écrites ?

```bash
# Nettoyer
rm -rf tmp/figma-assets/*

# Appel 1 : parent
docker exec mcp-figma-v1 node scripts/test-call-1.js <parent>
IMAGES_COUNT_1=$(ls tmp/figma-assets/*.{png,svg} | wc -l)

# Appel 2 : enfant
docker exec mcp-figma-v1 node scripts/test-call-2.js <enfant>
IMAGES_COUNT_2=$(ls tmp/figma-assets/*.{png,svg} | wc -l)

# Vérifier si le nombre a changé
if [ $IMAGES_COUNT_2 -eq $IMAGES_COUNT_1 ]; then
  echo "✅ MCP réutilise les images existantes"
else
  echo "❌ MCP génère de nouvelles images"
fi
```

---

### Test 3 : Peut-on désactiver dirForAssetWrites ?

```javascript
// Test avec dirForAssetWrites vide
await this.callMCPTool('get_design_context', {
  nodeId: '123:456',
  dirForAssetWrites: '',  // Vide
  forceCode: true
});

// Le code TSX retourné contient-il quand même les références images ?
// Les images sont-elles écrites quelque part ?
```

---

## 📊 Recommandation

### Solution IMMÉDIATE (sans test)

Implémenter **Stratégie A** avec un délai de grâce généreux :

```javascript
async phase1_extraction() {
  // 1. Appel parent AVEC images
  log.task('📦', 'Génération parent (avec toutes les images)');
  const parentResult = await this.callMCPTool('get_design_context', {
    nodeId: this.nodeId,
    dirForAssetWrites: this.assetsDir,
    forceCode: true,
    ...this.config.commonParams
  });
  this.saveFile('parent-wrapper.tsx', parentResult.content[0].text);

  // 2. Attendre que MCP finisse d'écrire
  log.info('⏳ Attente 10s pour écriture complète des images...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 3. Copier TOUTES les images maintenant
  const assetsFiles = fs.readdirSync(this.assetsDir).filter(isImage);
  log.success(`${assetsFiles.length} images disponibles`);
  execSync(`cp -rv "${this.assetsDir}"/* "${this.testDir}"/`);
  const copiedFiles = fs.readdirSync(this.testDir).filter(isImage);
  log.success(`✅ ${copiedFiles.length} images copiées dans testDir`);

  // 4. Générer les chunks (les images sont déjà là)
  log.task('🔧', 'Génération des chunks de code');
  const nodes = extractNodes(metadata);

  for (const node of nodes) {
    const codeResult = await this.callMCPTool('get_design_context', {
      nodeId: node.id,
      dirForAssetWrites: this.assetsDir,  // Même répertoire
      forceCode: true,
      ...this.config.commonParams
    });

    this.saveFile(`chunks/${node.name}.tsx`, codeResult.content[0].text);

    // Plus besoin d'attendre pour les images !
  }

  // ✅ Plus besoin de waitForImages() !
  // Les images sont déjà dans testDir
}
```

**Bénéfices :**
- ✅ Images copiées EN AVANCE (pas de race condition)
- ✅ Plus besoin de `waitForImages()` complexe
- ✅ Logs clairs : on voit exactement combien d'images sont copiées
- ✅ Si l'appel parent ne génère pas toutes les images, elles seront générées par les chunks (et ignorées car déjà présentes)

---

## 🎯 Prochaines étapes

1. ✅ **Implémenter Stratégie A** (changement minimal, maximum de sécurité)
2. 🧪 **Tester** avec un vrai node Figma
3. 📊 **Mesurer** : Comparer le temps d'exécution avant/après
4. 🔬 **Affiner** : Réduire le délai si MCP est plus rapide que prévu

Voulez-vous que j'implémente la Stratégie A maintenant ?
