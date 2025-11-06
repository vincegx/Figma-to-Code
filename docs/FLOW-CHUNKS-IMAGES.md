# Flow Détaillé : Chunks & Images

## Vue d'ensemble du problème

MCP Figma Desktop fonctionne en **2 processus séparés** :
- ✅ **Processus synchrone** : Génère le code TSX → retourne immédiatement
- ⏳ **Processus asynchrone** : Écrit les images sur disque → continue en arrière-plan

---

## 📊 Timeline Complète

### PHASE 1: EXTRACTION (phase1_extraction)

#### Étape 1-4 : Préparation (métadonnées, screenshot, etc.)
```
[figma-cli.js]
├─ Appel MCP get_metadata → metadata.xml
├─ Appel MCP get_screenshot → img/figma-screenshot.png
├─ Appel MCP get_variable_defs → variables.json
└─ Extraction des nodes enfants depuis metadata.xml
   Résultat: 6 nodes détectés
```

---

#### Étape 5 : Génération des chunks (SÉQUENTIEL)

```
⏱️  T=0s : Appel MCP get_design_context(chunk 1: "Appbar")
           ├─ Figma Desktop génère le code TSX
           ├─ MCP retourne IMMÉDIATEMENT le code
           │  └─> Sauvegarde: chunks/Appbar.tsx ✅
           │
           └─ EN PARALLÈLE (processus séparé, invisible pour nous):
              MCP commence à écrire les images référencées
              └─> tmp/figma-assets/85f884...svg  (en cours...)

⏱️  T=1s : Attente 1 seconde (éviter rate limit)

⏱️  T=1s : Appel MCP get_design_context(chunk 2: "Frame 1321314731")
           ├─ Figma Desktop génère le code TSX
           ├─ MCP retourne le code
           │  └─> Sauvegarde: chunks/Frame 1321314731.tsx ✅
           │
           └─ EN PARALLÈLE:
              MCP écrit les images du chunk 2
              (Pendant ce temps, le chunk 1 continue peut-être d'écrire ses images!)

⏱️  T=2s : Attente 1 seconde

⏱️  T=2s : Appel MCP get_design_context(chunk 3: "Frame 1618872337")
           ├─ Code retourné immédiatement
           │  └─> chunks/Frame 1618872337.tsx ✅
           └─ Images écrites en arrière-plan
              └─> tmp/figma-assets/5c59e90...png (écriture asynchrone)
              └─> tmp/figma-assets/c10478...png (écriture asynchrone)
              └─> tmp/figma-assets/369fbe...svg (écriture asynchrone)

... (même pattern pour chunks 4, 5, 6)

⏱️  T=6s : Tous les chunks générés ✅
           État actuel:
           - chunks/*.tsx : 6 fichiers ✅ COMPLET
           - tmp/figma-assets/ : ⚠️ ÉCRITURE ENCORE EN COURS !
```

**🔥 PROBLÈME CRITIQUE ICI :**
```
⏱️  T=6s : waitForImages() est appelé IMMÉDIATEMENT
           ↓
           Lit les chunks/*.tsx pour compter les images attendues
           Trouve: 5 images uniques référencées
           ↓
           Vérifie tmp/figma-assets/
           ❌ Seulement 2 images sur 5 présentes ! (MCP n'a pas fini)
           ↓
           Boucle d'attente: 1s, 2s, 3s...
           ✅ Après 5s: 5 images détectées
           ↓
           COPIE: tmp/figma-assets/* → testDir/
```

**MAIS AVEC LE BUG :**
```
❌ ANCIEN CODE (BUGUÉ):
   Si MCP est très lent ou si le système est chargé,
   waitForImages() peut timeout AVANT que toutes les images soient écrites.
   Résultat: AUCUNE image copiée vers testDir/
```

---

#### Étape 6 : Attente des images (waitForImages)

**AVANT LE FIX** (bugué):
```javascript
⏱️  T=6s : log.task('⏳', 'Attente des images MCP')
           await this.waitForImages()
           ↓
           [waitForImages() commence]

           État tmp/figma-assets/:
           T+0s:  2/5 images (MCP écrit encore...)
           T+1s:  2/5 images
           T+2s:  3/5 images
           T+3s:  4/5 images
           T+4s:  5/5 images ✅

           ✅ Condition remplie: tmpFiles.length >= expectedCount

           execSync(`cp -r "${assetsDir}"/* "${testDir}"/`)

           ❌ MAIS: || true masque les erreurs
              Si le cp échoue → AUCUN LOG, continue silencieusement
```

**APRÈS LE FIX** (correct):
```javascript
⏱️  T=6s : log.task('⏳', 'Attente des images MCP')

           // 🆕 NOUVEAU: Délai de grâce
           log.info('Délai de grâce de 3s...')
           await new Promise(resolve => setTimeout(resolve, 3000))

⏱️  T=9s : [waitForImages() commence maintenant]

           État tmp/figma-assets/:
           T+0s:  5/5 images ✅ (MCP a eu le temps de finir)

           ✅ Condition remplie immédiatement

           try {
             execSync(`cp -rv "${assetsDir}"/* "${testDir}"/`)
             // 🆕 Verbose: affiche chaque fichier copié

             const copiedFiles = fs.readdirSync(testDir).filter(images)
             log.info(`✅ ${copiedFiles.length} image(s) copiées`)
             // 🆕 Confirme que les images SONT dans testDir
           } catch (error) {
             log.error(`Erreur: ${error.message}`)
             throw error  // 🆕 Ne masque plus l'erreur
           }
```

---

#### Étape 7 : Assemblage des chunks

```
⏱️  T=9s : log.task('🔗', 'Assemblage des chunks')

           État actuel:
           - chunks/*.tsx : 6 fichiers
           - testDir/ : 5 images hash (85f884...svg, etc.) ✅

           chunking.js assemble-chunks:
           ├─ Lit tous les chunks/*.tsx
           ├─ Génère Component.tsx (parent qui importe les chunks)
           └─> Sauvegarde: testDir/Component.tsx

           Contenu de Component.tsx:
           ```tsx
           import Appbar from './chunks/Appbar';
           import Frame1321314731 from './chunks/Frame 1321314731';
           ...

           export default function Component() {
             return (
               <div>
                 <Appbar />
                 <Frame1321314731 />
                 ...
               </div>
             );
           }
           ```
```

---

### PHASE 2: POST-PROCESSING (phase2_postProcessing)

#### Étape 1 : Organisation des images

```
⏱️  T=10s : log.task('🖼️', 'Organisation des images')

            État testDir/:
            ├─ 85f884857a1ba230e9f4bcde3461c990e89f7851.svg
            ├─ 5c59e90a3b48fbddb93be8d8bb7ba64b5e9050d7.png
            ├─ c104781f4e7f9f2f61a2c010c5025a7eb078a08b.png
            ├─ 369fbe7b97320ab5314b944af1fe061d039fc78f.svg
            ├─ 81cfbe5d2e01a060782461be9ffeab4e5e697dc2.svg
            └─ chunks/

            🆕 FALLBACK (si imageCount === 0):
            if (imageCount === 0 && assets.length > 0) {
              log.warning('Copie de rattrapage...')
              execSync(`cp -rv "${assetsDir}"/* "${testDir}"/`)
              // 🆕 Dernier filet de sécurité !
            }

            organize-images.js testDir/:

            [STEP 1] Créer img/ subfolder
            └─> testDir/img/ ✅

            [STEP 2] Déplacer les images dans img/
            ├─ mv 85f884857...svg → img/85f884857...svg
            ├─ mv 5c59e90a3...png → img/5c59e90a3...png
            ├─ mv c104781f4...png → img/c104781f4...png
            ├─ mv 369fbe7b9...svg → img/369fbe7b9...svg
            └─ mv 81cfbe5d2...svg → img/81cfbe5d2...svg

            [STEP 3] Mettre à jour les paths dans chunks/
            (Aucun changement car déjà "../img/hash.ext")

            [STEP 4] Renommer avec noms Figma
            Lit les imports dans chunks/*.tsx:
            - import img from "../img/85f884857...svg"
            - import imgGroup13213148531 from "../img/5c59e90a3...png"
            - import imgCcc2 from "../img/c104781f4...png"
            - import imgG5457 from "../img/369fbe7b9...svg"
            - import imgLayer1 from "../img/81cfbe5d2...svg"

            Renommage basé sur le nom de la variable:
            ├─ img/85f884857...svg → img/img.svg
            ├─ img/5c59e90a3...png → img/group-13213148531.png
            ├─ img/c104781f4...png → img/ccc-2.png
            ├─ img/369fbe7b9...svg → img/g-5457.svg
            └─ img/81cfbe5d2...svg → img/layer-1.svg

            [STEP 5] Convertir en ES6 imports
            Met à jour chunks/*.tsx avec les nouveaux noms:
            - import img from "../img/img.svg"
            - import imgGroup13213148531 from "../img/group-13213148531.png"
            - ...
```

#### État final après organize-images:

```
testDir/
├─ Component.tsx
├─ chunks/
│  ├─ Appbar.tsx (import img from "../img/img.svg")
│  ├─ Frame 1618872337.tsx (import imgGroup... from "../img/group-13213148531.png")
│  ├─ Group 1321314858.tsx (import imgLayer1 from "../img/layer-1.svg")
│  └─ ...
├─ img/
│  ├─ img.svg                       ← renommé depuis hash
│  ├─ group-13213148531.png         ← renommé depuis hash
│  ├─ ccc-2.png                     ← renommé depuis hash
│  ├─ g-5457.svg                    ← renommé depuis hash
│  └─ layer-1.svg                   ← renommé depuis hash
└─ metadata.xml
```

---

#### Étape 2 : Unified processor (AST transformations)

```
⏱️  T=11s : unified-processor.js

            Pour chaque chunk:
            ├─ Lit chunks/X.tsx
            ├─ Parse en AST (Babel)
            ├─ Applique 10 transformations (fonts, auto-layout, etc.)
            ├─ Génère le code optimisé
            └─> Sauvegarde: chunks-fixed/X.tsx + X.css

            État:
            chunks-fixed/
            ├─ Appbar.tsx (import img from "../img/img.svg")  ✅
            ├─ Appbar.css
            ├─ Frame1618872337.tsx (imports corrects) ✅
            └─ ...
```

---

## 🔍 Ce qui se passait AVANT (bug)

### Scénario du bug

```
T=0s   : Chunk 1 appelé → code retourné ✅, images en écriture...
T=1s   : Chunk 2 appelé → code retourné ✅, images en écriture...
T=2s   : Chunk 3 appelé → code retourné ✅, images en écriture...
T=3s   : Chunk 4 appelé → code retourné ✅, images en écriture...
T=4s   : Chunk 5 appelé → code retourné ✅, images en écriture...
T=5s   : Chunk 6 appelé → code retourné ✅, images en écriture...
T=6s   : 🔥 waitForImages() appelé IMMÉDIATEMENT
         tmp/figma-assets/ : 1/5 images (trop tôt!)
T=7s   : tmp/figma-assets/ : 2/5 images
T=8s   : tmp/figma-assets/ : 3/5 images
...
T=30s  : ⏰ TIMEOUT ! Seulement 4/5 images
         execSync("cp ...") || true  ← échoue silencieusement

T=31s  : phase2_postProcessing()
         imageCount = 0 (aucune image dans testDir !)
         "Aucune image trouvée, skip organisation"

T=32s  : unified-processor génère chunks-fixed/
         ✅ Code correct: import img from "../img/layer-1.svg"
         ❌ MAIS: img/layer-1.svg N'EXISTE PAS !

RÉSULTAT: Dashboard → Erreur Vite "Cannot resolve import"
```

---

## ✅ Ce qui se passe MAINTENANT (fixé)

### Avec les 4 protections

```
T=0-5s : Génération des 6 chunks (identique)

T=6s   : log.task('Attente des images')
         🆕 PROTECTION #1: Délai de grâce 3s
         await sleep(3000)

T=9s   : waitForImages() commence
         tmp/figma-assets/ : 5/5 images ✅ (MCP a fini)
         🆕 PROTECTION #2: Logging verbeux + throw errors
         try {
           cp -rv → affiche chaque fichier
           log.info("✅ 5 images copiées")
         } catch { throw } ← Ne masque plus les erreurs

T=10s  : phase2_postProcessing()
         imageCount = 5 ✅

         🆕 PROTECTION #3: Fallback si imageCount=0
         if (imageCount === 0 && assets > 0) {
           log.warning("Copie de rattrapage...")
           cp -rv assets/* testDir/
         }

         organize-images.js:
         - Déplace 5 images vers img/
         - Renomme avec noms Figma
         - Met à jour les imports
         ✅ SUCCÈS

T=11s  : unified-processor
         Génère chunks-fixed/ avec imports corrects
         img/layer-1.svg existe ! ✅

RÉSULTAT: Dashboard → Tout fonctionne ✅
```

---

## 📋 Résumé des protections

| Protection | Localisation | But |
|------------|--------------|-----|
| 1️⃣ Délai de grâce 3s | ligne 438-439 | Laisser MCP finir d'écrire toutes les images |
| 2️⃣ Logging verbeux | ligne 502-522 | Voir exactement ce qui est copié ou ce qui échoue |
| 3️⃣ Fallback expectedCount=0 | ligne 479-494 | Copier les images même si non détectées dans chunks |
| 4️⃣ Copie de rattrapage Phase 2 | ligne 554-568 | Dernier filet si aucune image dans testDir |

---

## 🎯 Points clés à retenir

1. **MCP est asynchrone** : Code retourné instantanément, images écrites en arrière-plan
2. **Race condition** : waitForImages() était appelé trop tôt
3. **Masquage d'erreurs** : `|| true` cachait les problèmes de copie
4. **4 protections** garantissent maintenant que les images sont TOUJOURS copiées
5. **organize-images.js** ne fait que déplacer/renommer, il ne copie JAMAIS depuis tmp/figma-assets/
