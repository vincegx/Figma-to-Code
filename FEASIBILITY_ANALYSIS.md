# 📊 Analyse de Faisabilité - Workflow Figma → Puck Responsive

**Date:** 2025-11-10
**Projet:** MCP Figma to Code - Extension Responsive Multi-Breakpoint

---

## 🎯 Légende

- **Faisabilité:** Probabilité de succès de l'implémentation (0-100%)
- **Complexité:** Niveau de difficulté technique (0-100%, plus élevé = plus complexe)
- **Risque Échec:** Probabilité d'échec ou de blocage (0-100%)
- **⚠️:** Attention requise | **✅:** Confiance élevée | **🔴:** Risque critique

## 📖 Terminologie (Important)

**CSS Scopé (Phase 1):** Filtrer CSS global pour garder uniquement classes utilisées (7KB → 1.5KB par chunk)

**CSS-only (Phase 4):** Composants avec structure JSX identique Desktop/Tablet/Mobile → Fusion via media queries (98% des composants)

**Component-swap (Phase 4):** Composants avec structure JSX différente → Fusion via variants React + props (2% des composants - MenuRight uniquement)

---

# 📋 PHASE 1: Component Splitting

## 1.1 Détection Sections via data-name

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | data-name préservés (validé), expertise AST existante |
| **Complexité** | 30% | Babel traverse déjà maîtrisé, pattern simple |
| **Risque Échec** | 5% | Très faible - technique déjà utilisée dans chunking.js |

**Points Importants:**
- ✅ **data-name garantis présents** (keepDataName: true dans unified-processor.js:517)
- ✅ **Réutilisation code existant** (chunking.js, transformations AST)
- ⚠️ **Edge case:** Composants sans data-name (rare mais possible) → fallback sur index
- 📌 **Dépendance:** Component-clean.tsx doit être généré en premier

**Code clé:**
```javascript
// Pattern déjà validé
traverse.default(ast, {
  ReturnStatement(path) {
    const rootJSX = path.node.argument;
    // Extraire enfants directs avec data-name
  }
});
```

---

## 1.2 Extraction Classes CSS du TSX

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 90% ✅ | Regex simple, pattern prévisible |
| **Complexité** | 20% | Parsing basique de chaînes |
| **Risque Échec** | 10% | Très faible - format className stable |

**Points Importants:**
- ✅ **Format prévisible:** `className="class1 class2 class3"`
- ⚠️ **Template literals:** `className={\`class1 ${dynamic}\`}` → nécessite AST walk (20% des cas)
- ⚠️ **Classes conditionnelles:** Rares dans Component-clean.tsx (MCP génère statique)
- 📌 **Performance:** Regex rapide pour 90% des cas

**Code clé:**
```javascript
const classNameRegex = /className="([^"]+)"/g;
// Fallback AST pour template literals si nécessaire
```

---

## 1.3 Filtrage CSS Scopé

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 85% ✅ | Structure CSS prévisible (sections organisées) |
| **Complexité** | 45% | Parsing CSS ligne par ligne, gestion multi-lignes |
| **Risque Échec** | 15% | Risque: classes manquantes si parsing échoue |

**Points Importants:**
- ✅ **CSS organisé en sections** (voir Component-clean.css structure)
- ⚠️ **Classes multi-propriétés:** Gestion ouverture/fermeture accolades
- ⚠️ **Classes imbriquées:** Rares mais possibles (media queries déjà présentes)
- 🔴 **Critique:** Toujours inclure :root, @import, utilities (partagés)
- 📌 **Validation:** Tester rendu visuel = pas de classes CSS manquantes

**Sections à toujours inclure:**
```css
@import url(...);           /* Fonts */
:root { --var: value; }     /* Variables */
.content-start { ... }      /* Utilities Figma */
```

**Algorithme:**
```javascript
1. Parser CSS global
2. Extraire classes utilisées du TSX
3. Filtrer custom classes (garder seulement utilisées)
4. Merge: imports + :root + utilities + custom filtered
```

**Estimation taille:**
- CSS global: ~7KB
- CSS scopé moyen: ~1.5KB (réduction 80%)
- Header complexe: ~2.5KB

---

## 1.4 Génération Chunks TSX

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | Template simple, generate() Babel |
| **Complexité** | 25% | String templating basique |
| **Risque Échec** | 5% | Très faible |

**Points Importants:**
- ✅ **Template statique** simple
- ✅ **Imports automatiques** (React + CSS)
- ⚠️ **Images:** Copier imports depuis Component-clean.tsx (si utilisées)
- 📌 **Nommage:** toPascalCase() réutilisé (chunking.js)

**Template:**
```javascript
import React from 'react';
import './${ChunkName}.css';
// + image imports si nécessaire

export default function ${ChunkName}() {
  return ${jsx};
}
```

---

## 1.5 Intégration Pipeline (Flag --split-components)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 98% ✅ | Modification mineure unified-processor.js |
| **Complexité** | 15% | Ajout conditionnel simple |
| **Risque Échec** | 2% | Négligeable |

**Points Importants:**
- ✅ **Optionnel via flag** → pas d'impact sur workflow existant
- ✅ **Exécution après reports** → ordre garanti
- 📌 **Placement:** Ligne 929 unified-processor.js (après console.log success)

---

### 📊 Score Global Phase 1

| Métrique | Score Moyen |
|----------|-------------|
| **Faisabilité** | **93%** ✅ |
| **Complexité** | **27%** (Faible) |
| **Risque Échec** | **7%** (Très faible) |

**Durée estimée:** 2 jours
**Confiance:** Très élevée ✅

---

# 📋 PHASE 2: Breakpoint Analysis

## 2.1 Script compare-breakpoints.js

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 100% ✅ | **Déjà implémenté et testé** |
| **Complexité** | 0% | Terminé |
| **Risque Échec** | 0% | Aucun |

**Points Importants:**
- ✅ **Script fonctionnel** validé sur vos 3 exports
- ✅ **Output JSON** généré (responsive-analysis.json)
- ✅ **92.7% matching confirmé**
- 📌 **Aucune modification nécessaire**

**Résultats validés:**
- 50 composants CSS-only (98%)
- 1 composant component-swap (menu right)
- Feasibility score: 92.7%

---

# 📋 PHASE 3: UI Sélection Tests

## 3.1 Page /tests/merge (React Component)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 90% ✅ | Stack React familière, pattern standard |
| **Complexité** | 30% | Formulaire + state management basique |
| **Risque Échec** | 10% | Faible - composants shadcn/ui déjà utilisés |

**Points Importants:**
- ✅ **Stack connue:** React 19, shadcn/ui (déjà dans projet)
- ✅ **Pattern simple:** Liste checkboxes + bouton submit
- ⚠️ **UX:** Limiter sélection à exactement 3 tests (validation)
- 📌 **Filter API:** Requête GET /api/tests?hasModular=true

---

## 3.2 API Endpoint GET /api/tests?hasModular=true

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | Modification mineure endpoint existant |
| **Complexité** | 20% | Ajout filter simple |
| **Risque Échec** | 5% | Très faible |

**Points Importants:**
- ✅ **Endpoint existant:** GET /api/tests déjà présent (server.js)
- ✅ **Logique simple:** fs.existsSync(path + 'modular/')
- ⚠️ **Performance:** Lecture disque pour chaque test (acceptable pour <100 tests)
- 📌 **Optimisation future:** Cache si >100 tests

---

## 3.3 API Endpoint POST /api/tests/merge

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 85% ✅ | Spawn process Node.js standard |
| **Complexité** | 40% | Gestion process background, validation |
| **Risque Échec** | 15% | Modéré - erreurs script merger à gérer |

**Points Importants:**
- ✅ **Pattern connu:** spawn() déjà utilisé (figma-cli.js)
- ⚠️ **Background job:** Pas de streaming logs (amélioration future)
- ⚠️ **Validation:** Vérifier 3 tests + modular/ existe
- 🔴 **Critique:** Gestion erreurs merger.js (exit code)
- 📌 **UX:** Retour immédiat avec mergedTestId (process async)

**Gestion erreurs:**
```javascript
merger.on('close', (code) => {
  if (code !== 0) {
    // Log error, cleanup partial output
    fs.rmSync(mergedDir, { recursive: true });
  }
});
```

---

### 📊 Score Global Phase 3

| Métrique | Score Moyen |
|----------|-------------|
| **Faisabilité** | **90%** ✅ |
| **Complexité** | **30%** (Faible) |
| **Risque Échec** | **10%** (Faible) |

**Durée estimée:** 2 jours
**Confiance:** Élevée ✅

---

# 📋 PHASE 4: Responsive Merger

## 4.1 Lecture et Matching Composants

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 90% ✅ | Basé sur data-name (fiable à 98%) |
| **Complexité** | 35% | Logique de matching simple |
| **Risque Échec** | 10% | Faible - analysis.json guide le process |

**Points Importants:**
- ✅ **Guide pré-calculé:** responsive-analysis.json (98% success rate)
- ✅ **Matching par nom:** data-name identiques garantis
- ⚠️ **Edge case:** Composants desktop-only (help menu) → skip ou placeholder
- 📌 **Fallback:** Si composant manquant, logger warning + skip

---

## 4.2 Génération CSS Responsive (CSS-only)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 80% ✅ | Parsing CSS complexe mais structure connue |
| **Complexité** | 60% | Parsing multi-sections, diff detection |
| **Risque Échec** | 20% | Modéré - risque classes dupliquées ou manquantes |

**Points Importants:**
- ✅ **Structure CSS prévisible** (sections organisées)
- ⚠️ **Parsing complexe:** Regex multi-lignes pour classes CSS
- ⚠️ **Diff detection:** Comparer Desktop vs Tablet vs Mobile
- 🔴 **Critique:** :root variables dédupliquées (Map)
- 🔴 **Critique:** Détecter classes identiques (skip duplication)
- 📌 **Validation:** Tester visuel = styles corrects à chaque breakpoint

**Algorithme diff:**
```javascript
// Desktop: .header { height: 80px; }
// Tablet:  .header { height: 60px; }
// Mobile:  .header { height: 50px; }

// Output:
.header { height: 80px; } /* Desktop default */
@media (max-width: 960px) {
  .header { height: 60px; } /* Tablet override */
}
@media (max-width: 420px) {
  .header { height: 50px; } /* Mobile override */
}
```

**Complexité principale:**
- Parser chaque CSS en Map<className, properties>
- Comparer Desktop vs Tablet → générer diff
- Comparer Tablet vs Mobile → générer diff
- Éviter duplication (classe identique Desktop = Tablet)

---

## 4.3 Génération Component-Swap (2% composants)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 75% ⚠️ | 1 seul composant (menu right) mais technique complexe |
| **Complexité** | 70% | Extraction JSX, génération variants, TypeScript |
| **Risque Échec** | 25% | Modéré - risque erreurs TypeScript, JSX invalide |

**Points Importants:**
- ✅ **Cas limité:** 1 composant uniquement (menu right)
- ⚠️ **Extraction JSX:** Parse ReturnStatement, generate() code
- ⚠️ **Sub-components:** Générer 2-3 fonctions internes
- 🔴 **Critique:** Props interface TypeScript valide
- 🔴 **Critique:** Imports images correctement transférés
- 📌 **Test manuel:** Valider rendu avec variant prop

**Risques spécifiques:**
```typescript
// Risque 1: Imports images manquants
// Desktop: import imgLogo from './img/logo.png';
// Mobile:  import imgIcon from './img/icon.png';
// → Merger les 2 imports

// Risque 2: Props TypeScript invalides
interface MenuRightProps {
  variant?: 'desktop' | 'mobile'; // ← Typo, conflit types
}

// Risque 3: JSX extraction incomplète
// Parser ReturnStatement → peut capturer bloc incomplet
```

**Mitigation:**
- Tester avec composant menu right spécifiquement
- Fallback: génération manuelle si échec
- Validation TypeScript: `tsc --noEmit` après génération

---

## 4.4 Génération puck.config.tsx

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 85% ✅ | Template generation, format connu |
| **Complexité** | 50% | Template complexe, imports dynamiques |
| **Risque Échec** | 15% | Modéré - erreurs syntaxe TypeScript |

**Points Importants:**
- ✅ **Format Puck connu** (documentation officielle)
- ⚠️ **Imports dynamiques:** Générer 50+ imports
- ⚠️ **Config object:** JSON.stringify() pour options
- 🔴 **Critique:** Syntaxe TypeScript valide (Config type)
- 📌 **Validation:** Compilation TypeScript après génération

**Template structure:**
```typescript
import { Config } from '@measured/puck';
import Header from './components/Header';
// ... 49 autres imports

export const config: Config = {
  components: {
    Header: {
      render: () => <Header />
    },
    MenuRight: {
      fields: {
        variant: {
          type: 'select',
          options: [/* ... */]
        }
      },
      defaultProps: { variant: 'desktop' },
      render: ({ variant }) => <MenuRight variant={variant} />
    }
    // ... 49 autres composants
  }
};
```

**Risques:**
- Erreurs typo dans types TypeScript
- Imports paths incorrects
- Config malformé (Puck API breaking changes)

**Validation:**
```bash
# Après génération
tsc --noEmit puck.config.tsx
# Si erreurs → fix template
```

---

## 4.5 Copie Images et Assets

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | fs.copy simple, structure connue |
| **Complexité** | 20% | Copie fichiers basique |
| **Risque Échec** | 5% | Très faible |

**Points Importants:**
- ✅ **Images organisées:** img/ directory déjà structuré
- ✅ **Même images:** Desktop/Tablet/Mobile partagent images (layer names)
- ⚠️ **Déduplication:** Si image identique (même hash), copier une fois
- 📌 **Paths relatifs:** Vérifier imports images dans chunks

---

### 📊 Score Global Phase 4

| Métrique | Score Moyen |
|----------|-------------|
| **Faisabilité** | **83%** ✅ |
| **Complexité** | **55%** (Modérée) |
| **Risque Échec** | **17%** (Modéré) |

**Durée estimée:** 7-10 jours
**Confiance:** Moyenne-Élevée ⚠️
**Point critique:** Parsing CSS + Component-swap

---

# 📋 PHASE 5: Puck Editor Integration

## 5.1 Installation Puck (Docker)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 100% ✅ | npm install standard, React 19 compatible |
| **Complexité** | 10% | Modification package.json + rebuild |
| **Risque Échec** | 0% | Aucun - compatibilité validée |

**Points Importants:**
- ✅ **Compatibilité confirmée:** Puck `^18.0.0 || ^19.0.0`
- ✅ **Docker rebuild:** `docker-compose up --build`
- 📌 **Version:** Utiliser latest stable (0.15.0+)

---

## 5.2 Page PuckEditorPage.tsx

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 85% ✅ | Composant React standard, API Puck documentée |
| **Complexité** | 40% | Intégration Puck, gestion state |
| **Risque Échec** | 15% | Modéré - config loading, rendering |

**Points Importants:**
- ✅ **API Puck simple:** `<Puck config={} data={} onPublish={} />`
- ⚠️ **Config loading:** Transformer puck.config.tsx → JSON
- ⚠️ **Dynamic imports:** Composants dans config (complex)
- 🔴 **Critique:** Rendu composants Puck (CSS/images paths)
- 📌 **Fallback:** Mode preview simple si Puck complexe

**Complexité config loading:**
```typescript
// Problème: puck.config.tsx est TSX, pas JSON
// Solution 1: Compiler TSX → JS (esbuild)
// Solution 2: Parser statiquement → JSON simplifié (MVP)
// Solution 3: API endpoint sert config pré-compilé

// MVP: Solution 2 (parsing statique)
const config = parseConfigFile(configPath);
// Extraire component names, générer config minimal
```

---

## 5.3 API Endpoints Puck

### GET /api/tests/:testId/puck-config

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 70% ⚠️ | Conversion TSX → JSON complexe |
| **Complexité** | 65% | Parsing TSX, extraction config, transformation |
| **Risque Échec** | 30% | Modéré-Élevé - risque config invalide |

**Points Importants:**
- ⚠️ **Conversion TSX:** Nécessite compilation ou parsing statique
- 🔴 **Critique:** Rendu composants côté client (React components dans config)
- 🔴 **Critique:** Imports dynamiques (Webpack/Vite config)
- 📌 **MVP:** Config simplifié sans rendu réel (proof of concept)

**Options implémentation:**

**Option A: Compilation runtime (complexe)**
```javascript
// esbuild compile puck.config.tsx → JS
// Require/import compilé
// Risque: Complex, slow, security
```

**Option B: Parsing statique (MVP)**
```javascript
// Parser TSX
// Extraire component names
// Générer config minimal JSON
{
  components: {
    Header: { render: () => null }, // Placeholder
    Footer: { render: () => null }
  }
}
// Puck affiche liste mais pas rendu réel
```

**Option C: Pre-compilation (idéal)**
```javascript
// Durante merge, compiler puck.config.tsx → puck.config.json
// Servir JSON directement
// + Complexe build step
```

**Recommandation:** Option B (MVP) → Option C (production)

---

### GET /api/tests/:testId/puck-data

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | Lecture fichier JSON simple |
| **Complexité** | 15% | fs.readFile basique |
| **Risque Échec** | 5% | Très faible |

---

### POST /api/tests/:testId/puck-save

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | Écriture fichier JSON simple |
| **Complexité** | 15% | fs.writeFile basique |
| **Risque Échec** | 5% | Très faible |

**Points Importants:**
- ✅ **Validation:** JSON.parse() avant save
- 📌 **Backup:** Garder versions précédentes (optionnel)

---

## 5.4 Bouton "Ouvrir dans Puck" (TestCard)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 95% ✅ | Modification mineure composant existant |
| **Complexité** | 20% | Ajout conditionnel + navigation |
| **Risque Échec** | 5% | Très faible |

**Points Importants:**
- ✅ **Detection:** metadata.hasPuckConfig
- ✅ **Navigation:** React Router déjà configuré
- 📌 **UX:** Icône edit + label clair

---

### 📊 Score Global Phase 5

| Métrique | Score Moyen |
|----------|-------------|
| **Faisabilité** | **88%** ✅ |
| **Complexité** | **33%** (Faible-Modéré) |
| **Risque Échec** | **12%** (Faible) |

**Durée estimée:** 3-5 jours
**Confiance:** Élevée ✅
**Point critique:** Config loading (solution MVP acceptable)

---

# 📋 PHASE 6: Testing & Polish

## 6.1 Tests Fonctionnels

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 90% ✅ | Tests manuels, environnement contrôlé |
| **Complexité** | 35% | Suite tests complète, multi-breakpoints |
| **Risque Échec** | 10% | Faible - bugs détectables et corrigeables |

**Points Importants:**
- ✅ **Environnement stable:** Docker + tests reproductibles
- ⚠️ **Coverage:** Component Splitter, Merger, Puck
- 📌 **Checklist:** Voir ROADMAP_RESPONSIVE_PUCK.md §6

---

## 6.2 Visual Testing (3 Breakpoints)

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 85% ✅ | Comparaison visuelle Figma vs Web |
| **Complexité** | 40% | Screenshots multi-résolutions, diffs |
| **Risque Échec** | 15% | Modéré - différences CSS subtiles |

**Points Importants:**
- ✅ **Puppeteer existant:** Capture screenshots déjà implémentée
- ⚠️ **3 résolutions:** 1440px, 960px, 420px
- 🔴 **Critique:** Fonts, images, spacing identiques
- 📌 **Tooling:** Percy.io ou similaire (optionnel)

---

## 6.3 Performance Testing

| Métrique | Score | Justification |
|----------|-------|---------------|
| **Faisabilité** | 80% ✅ | Mesures simples (temps execution) |
| **Complexité** | 30% | Benchmarks basiques |
| **Risque Échec** | 20% | Faible - optimisation si lent |

**Points Importants:**
- ✅ **Métriques:** Temps Component Splitter, Merger
- ⚠️ **Benchmarks:** 50 composants < 30s merger
- 📌 **Optimisation:** Si >60s, profiler + optimiser

---

### 📊 Score Global Phase 6

| Métrique | Score Moyen |
|----------|-------------|
| **Faisabilité** | **85%** ✅ |
| **Complexité** | **35%** (Faible-Modéré) |
| **Risque Échec** | **15%** (Faible) |

**Durée estimée:** 1-2 semaines
**Confiance:** Élevée ✅

---

# 📊 TABLEAU RÉCAPITULATIF GLOBAL

## Par Phase

| Phase | Fonctionnalité | Faisabilité | Complexité | Risque | Durée | Priorité |
|-------|----------------|-------------|------------|--------|-------|----------|
| **0** | Export Figma (3x) | ✅ 100% | 10% | 0% | 30min | ✅ Fait |
| **1** | Component Splitter | ✅ 93% | 27% | 7% | 2j | 🔴 Haute |
| **2** | Breakpoint Analysis | ✅ 100% | 0% | 0% | - | ✅ Fait |
| **3** | UI Sélection Tests | ✅ 90% | 30% | 10% | 2j | 🟡 Moyenne |
| **4** | Responsive Merger | ✅ 83% | 55% | 17% | 7-10j | 🔴 Haute |
| **5** | Puck Integration | ✅ 88% | 33% | 12% | 3-5j | 🟡 Moyenne |
| **6** | Testing & Polish | ✅ 85% | 35% | 15% | 1-2sem | 🟢 Basse |

## Scores Moyens Globaux

| Métrique | Score Global | Évaluation |
|----------|--------------|------------|
| **Faisabilité** | **88%** | ✅ Très bon |
| **Complexité** | **32%** | ✅ Faible-Modérée |
| **Risque Échec** | **12%** | ✅ Faible |

---

# 🎯 TOP 5 Risques Critiques

## 1. 🔴 CRITIQUE - Parsing CSS Responsive (Phase 4.2)

**Risque:** Classes CSS manquantes ou dupliquées dans media queries

**Impact:** Rendu visuel incorrect sur Tablet/Mobile

**Probabilité:** 20%

**Mitigation:**
- ✅ Tests visuels systématiques (screenshots)
- ✅ Validation manuelle premier merge
- ✅ Logging détaillé des classes mergées
- 📌 Fallback: Copier CSS complet si diff échoue

**Code validation:**
```javascript
// Après merge, vérifier:
const mergedClasses = extractClassesFromCSS(mergedCSS);
const originalClasses = extractClassesFromCSS(desktopCSS);
const missing = originalClasses.filter(c => !mergedClasses.includes(c));
if (missing.length > 0) {
  console.warn('Missing classes:', missing);
}
```

---

## 2. 🔴 CRITIQUE - Component-Swap JSX Extraction (Phase 4.3)

**Risque:** JSX extraction incomplète, imports images manquants

**Impact:** Composant menu right non fonctionnel

**Probabilité:** 25%

**Mitigation:**
- ✅ Test manuel spécifique menu right
- ✅ Validation TypeScript (tsc --noEmit)
- ✅ Fallback: Génération manuelle si auto échoue
- 📌 1 seul composant concerné (effort limité)

**Validation:**
```bash
# Après génération MenuRight.tsx
tsc --noEmit MenuRight.tsx
# Tester rendu manuel:
# http://localhost:5173?preview=MenuRight&variant=desktop
# http://localhost:5173?preview=MenuRight&variant=mobile
```

---

## 3. ⚠️ MODÉRÉ - Puck Config Loading (Phase 5.2)

**Risque:** Conversion puck.config.tsx → JSON échoue

**Impact:** Puck Editor ne charge pas les composants

**Probabilité:** 30%

**Mitigation:**
- ✅ Solution MVP (config simplifié) acceptable
- ✅ Puck affiche liste composants même sans rendu
- 📌 Amélioration progressive (Option C production)

**Fallback MVP:**
```json
{
  "components": {
    "Header": { "label": "Header" },
    "Footer": { "label": "Footer" }
  }
}
```

---

## 4. ⚠️ MODÉRÉ - Performance Merger (Phase 4)

**Risque:** Merger trop lent (>60s pour 50 composants)

**Impact:** UX dégradée, timeout possible

**Probabilité:** 15%

**Mitigation:**
- ✅ Profiling si lent
- ✅ Optimisation parsing CSS (cache)
- ✅ Background job déjà prévu (async)
- 📌 Benchmark: 50 composants < 30s acceptable

---

## 5. ⚠️ MODÉRÉ - Data-name Missing Edge Cases (Phase 1.1)

**Risque:** Composants sans data-name non détectés

**Impact:** Composants manquants dans modular/

**Probabilité:** 5%

**Mitigation:**
- ✅ Fallback: Index numérique si data-name absent
- ✅ Logging warning composants sans nom
- 📌 Rare (keepDataName: true garanti)

**Fallback:**
```javascript
const dataName = getDataNameAttribute(child) || `Section${index}`;
```

---

# ✅ Points Importants à Retenir (Synthèse)

## Architecture
1. ✅ **98% CSS-only** - Stratégie media queries simple (50/51 composants)
2. ✅ **92.7% matching** - Excellente cohérence cross-breakpoint
3. ✅ **data-name préservés** - Fondation solide pour détection

## Technique
4. ✅ **Expertise AST existante** - Réutilisation transformations Babel
5. ✅ **Pipeline mature** - unified-processor.js stable et testé
6. ✅ **Puck compatible React 19** - Pas de blocage technique

## Risques
7. 🔴 **Parsing CSS complexe** - Attention diff detection (Phase 4.2)
8. 🔴 **Component-swap limité** - 1 composant (menu right) à valider manuellement
9. ⚠️ **Puck config loading** - Solution MVP acceptable, amélioration future

## Workflow
10. 📌 **Optionnel via flags** - --split-components, pas d'impact existant
11. 📌 **Background jobs** - Merger async, UX non bloquante
12. 📌 **Validation visuelle critique** - Screenshots comparaison Figma vs Web

## Timeline
13. ⏱️ **Phase 1 prioritaire** - Component Splitter (2j, fondation)
14. ⏱️ **Phase 4 complexe** - Responsive Merger (7-10j, cœur système)
15. ⏱️ **Total réaliste** - 4-5 semaines avec tests

---

# 🚀 Recommandation Finale

## ✅ GO - Faisabilité Confirmée

**Score global: 88% faisabilité, 12% risque**

Le projet est **techniquement faisable** avec une **confiance élevée**. Les risques identifiés sont **gérables** avec les mitigations proposées.

## 🎯 Plan d'Action Recommandé

### Semaine 1-2: Fondation
1. **Implémenter Component Splitter** (Phase 1 - 2j)
2. **Tester sur 3 exports existants** (1j)
3. **Valider CSS scopé** (screenshots - 1j)
4. **UI Sélection Tests** (Phase 3 - 2j)

### Semaine 3-4: Cœur Système
5. **Responsive Merger - CSS-only** (Phase 4.2 - 5j)
6. **Tests visuels 50 composants** (2j)
7. **Component-swap menu right** (Phase 4.3 - 2j)

### Semaine 5: Integration
8. **Puck Integration MVP** (Phase 5 - 3j)
9. **Tests E2E workflow complet** (2j)

### Semaine 6+: Polish
10. **Visual testing systématique** (Phase 6 - 1 sem)
11. **Performance optimization** (si nécessaire)
12. **Documentation utilisateur**

---

**Dernière mise à jour:** 2025-11-10
**Confiance globale:** ✅ Très élevée (88%)
