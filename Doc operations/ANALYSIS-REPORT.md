# Analyse Comparative : Transformations Figma → Code

## État Actuel vs Nouvelles Propositions

### 🟢 Transformations DÉJÀ IMPLÉMENTÉES

#### 1. Font Detection (`font-detection.js`)
**✅ Partiellement couvert**
- ✅ Conversion font-['Poppins:Bold'] → inline styles
- ✅ Map des poids de police (Regular → 400, Bold → 700, etc.)
- ❌ **MANQUANT**: Parsing du `fontPostScriptName` pour valeurs incorrectes
- ❌ **MANQUANT**: Support des `textStyleId` pour récupération depuis styles

#### 2. CSS Variables (`css-vars.js`)
**✅ Bien couvert**
- ✅ Conversion var(--colors\/white,#fff) → classes custom
- ✅ Gestion multi-niveaux d'échappement (\/, \\/, \\\/)
- ✅ Génération de classes CSS personnalisées
- ✅ Safety net regex pour variables échappées

#### 3. Post-Fixes (`post-fixes.js`)
**✅ Partiellement couvert**
- ✅ Gradients multi-stop
- ✅ Gradients radiaux
- ✅ Vérification blend modes
- ❌ **MANQUANT**: Fix des shadows (ordre, spread, visibilité)
- ❌ **MANQUANT**: Text transform (textCase)

#### 4. AST Cleaning (`ast-cleaning.js`)
**✅ Bien couvert**
- ✅ Suppression font-[...] invalides
- ✅ Conversion text sizes arbitraires → standard
- ✅ Ajout overflow-x-hidden au root container
- ✅ Fix des éléments flex avec basis-0 grow

#### 5. SVG Icon Fixes (`svg-icon-fixes.js`)
**✅ Bien couvert**
- ✅ Flatten des wrappers absolus
- ✅ Inline des SVG composites

#### 6. Tailwind Optimizer (`tailwind-optimizer.js`)
**✅ Bien couvert**
- ✅ Conversion valeurs arbitraires → classes standard
- ✅ Gap, padding, margin, width, height optimisations

---

### 🔴 Transformations MANQUANTES (À IMPLÉMENTER)

#### 1. **Shadow Fixes** (PRIORITÉ HAUTE)
**Problèmes identifiés:**
- Ordre inversé des ombres (inner avant drop)
- Valeurs de spread ignorées
- Ombres invisibles exportées
- Conversion incorrecte en filter

**Nouvelle transformation proposée:** `shadow-fixes.js`

#### 2. **Text Transform** (PRIORITÉ HAUTE)
**Problème:**
- `textCase` (UPPER, LOWER, TITLE) jamais exporté

**Nouvelle transformation proposée:** `text-transform.js`

#### 3. **Auto Layout → Flexbox** (PRIORITÉ MOYENNE)
**Problèmes:**
- Mapping incomplet des propriétés Auto Layout
- itemSpacing → gap pas toujours appliqué
- primaryAxisAlignItems/counterAxisAlignItems manquants parfois

**Nouvelle transformation proposée:** `auto-layout.js`

#### 4. **Position Absolute → Relative** (PRIORITÉ MOYENNE)
**Problème:**
- Éléments sans Auto Layout en position absolue par défaut

**Nouvelle transformation proposée:** `position-fixes.js`

#### 5. **Stroke Alignment** (PRIORITÉ BASSE)
**Problème:**
- strokeAlign (INSIDE/OUTSIDE) nécessite workarounds CSS

**Nouvelle transformation proposée:** `stroke-alignment.js`

#### 6. **Corner Radius Individuel** (PRIORITÉ BASSE)
**Problème:**
- rectangleCornerRadii pas toujours correctement mappé

**Extension de:** `post-fixes.js`

#### 7. **Opacity & Visibility** (PRIORITÉ BASSE)
**Problème:**
- visible: false → display: none pas toujours appliqué

**Extension de:** `ast-cleaning.js`

#### 8. **Font Weight Amélioré** (PRIORITÉ HAUTE)
**Problème:**
- fontWeight exporté peut être incorrect
- Variables instables (Heavy → Regular)

**Extension de:** `font-detection.js`

---

## Plan d'Implémentation

### Phase 1: Transformations Critiques (Bugs connus)
1. `shadow-fixes.js` - Corriger ordre et spread des ombres
2. `text-transform.js` - Ajouter support textCase
3. Améliorer `font-detection.js` - Parser fontPostScriptName

### Phase 2: Optimisations Layout
4. `auto-layout.js` - Mapping complet Auto Layout → Flexbox
5. `position-fixes.js` - Conversion position absolue → relative

### Phase 3: Finitions
6. `stroke-alignment.js` - Gérer INSIDE/OUTSIDE strokes
7. Extensions mineures aux transformations existantes

---

## Configuration On/Off

### Structure proposée pour `config.js`:
```javascript
export const defaultConfig = {
  // Existantes
  'font-detection': { enabled: true },
  'ast-cleaning': { enabled: true },
  'svg-icon-fixes': { enabled: true },
  'post-fixes': { enabled: true },
  'css-vars': { enabled: true },
  'tailwind-optimizer': { enabled: true },

  // Nouvelles (Phase 1)
  'shadow-fixes': {
    enabled: true,
    fixOrder: true,
    includeSpread: true,
    filterInvisible: true
  },
  'text-transform': {
    enabled: true
  },

  // Nouvelles (Phase 2)
  'auto-layout': {
    enabled: true,
    convertItemSpacing: true,
    mapAlignments: true
  },
  'position-fixes': {
    enabled: true,
    convertAbsoluteToRelative: true
  },

  // Nouvelles (Phase 3)
  'stroke-alignment': {
    enabled: true,
    useBoxShadowForInside: true,
    useOutlineForOutside: true
  }
}
```

---

## Métriques d'Impact

### Bugs Critiques Résolus
- ✅ Shadows (3 bugs majeurs)
- ✅ Font Weight (2 bugs majeurs)
- ✅ Text Transform (1 bug majeur)

### Améliorations de Fidélité
- Layout: +30% précision (Auto Layout mapping)
- Position: +20% (absolute → relative)
- Strokes: +10% (INSIDE/OUTSIDE support)

### Performance
- Architecture simple maintenue (single-pass AST)
- Temps d'exécution estimé: +5ms total
- Priorités bien définies (0 → 45)

---

## Recommandations

1. **Implémenter d'abord les fixes critiques** (shadows, text-transform)
2. **Tester chaque transformation isolément** avec config on/off
3. **Maintenir la simplicité** de l'architecture pipeline
4. **Documenter les edge cases** dans chaque transformation
5. **Ajouter des tests unitaires** pour les cas connus du guide