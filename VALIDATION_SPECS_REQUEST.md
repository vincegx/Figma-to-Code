# 🔍 DEMANDE DE SPÉCIFICATIONS TECHNIQUES - Figma-to-Code Validation Rules

**Contexte** : Je développe FigmaCheck, un plugin Figma qui valide les designs avant export vers code. Actuellement, j'ai implémenté 11 règles de validation basées sur des observations empiriques ("guessing"). J'ai besoin des **spécifications techniques EXACTES** de votre outil Figma-to-Code pour transformer ces règles approximatives en validations contractuelles précises.

**Objectif** : Obtenir les critères EXACTS qui causent des échecs d'export, des bugs, ou du code sous-optimal dans Figma-to-Code.

---

## 📋 MES RÈGLES ACTUELLES (à valider/préciser)

Voici les 11 règles que j'ai implémentées. Pour chacune, j'ai besoin de savoir si mes critères sont corrects, incomplets, ou erronés.

---

## 🏗️ CATÉGORIE : STRUCTURE

### ✅ Règle S1 - Limite de profondeur hiérarchique
**Mon implémentation actuelle** :
- ❌ **ERROR** si profondeur > 10 niveaux
- Raison supposée : "Figma-to-Code chunking fails when hierarchy exceeds 10 levels"

**Questions pour vous** :
1. La limite de 10 niveaux est-elle exacte ? Si non, quelle est la limite réelle ?
2. Cette limite s'applique-t-elle à tous les types de nodes (Frame, Group, Component, Instance) ou seulement certains ?
3. Y a-t-il des cas particuliers où une profondeur > 10 est acceptable ?
4. Quel est le symptôme exact de l'échec ? (erreur AST, timeout, composant incomplet, autre ?)
5. Comptez-vous la profondeur depuis la racine du document ou depuis le top-level frame sélectionné ?

---

### ✅ Règle S2 - Convention de nommage des layers
**Mon implémentation actuelle** :
- ⚠️ **WARNING** si le nom contient : `/[^a-zA-Z0-9-_/]/` (tout sauf alphanumériques, tirets, underscores, slashes)
- Raison supposée : "Special characters cause image organization failures and broken asset paths"

**Questions pour vous** :
1. Quels caractères EXACTEMENT causent des problèmes dans vos chemins d'assets ?
2. Les caractères suivants sont-ils problématiques ?
   - Espaces : `My Layer`
   - Points : `button.primary`
   - Parenthèses : `Layer (variant)`
   - Crochets : `Layer [state]`
   - Emojis : `Button 🚀`
   - Accents/Unicode : `Bouton`, `ボタン`
   - Slashes : `components/button` (actuellement je les AUTORISE)
3. Y a-t-il des différences selon le contexte (nom de component vs layer simple vs groupe) ?
4. Avez-vous des conventions de nommage recommandées (camelCase, kebab-case, PascalCase) ?

---

### ✅ Règle S3 - Frames vides
**Mon implémentation actuelle** :
- ⚠️ **WARNING** si une Frame a `children.length === 0`
- Raison supposée : "Empty frames create unnecessary wrapper components"

**Questions pour vous** :
1. Les frames vides génèrent-elles réellement des composants vides dans votre code ?
2. Si oui, est-ce bloquant ou juste du code bloat ?
3. Y a-t-il des cas où une frame vide est légitime (spacer, placeholder) ?
4. Que se passe-t-il avec une frame qui a seulement un background fill mais pas d'enfants ?

---

## 🔲 CATÉGORIE : AUTO-LAYOUT

### ✅ Règle AL1 - Auto-layout manquant
**Mon implémentation actuelle** :
- ⚠️ **WARNING** si Frame avec `children.length > 1` ET `layoutMode === 'NONE'`
- Raison supposée : "Missing auto-layout results in absolute-positioned code instead of flexbox"

**Questions pour vous** :
1. Le seuil de `> 1 enfant` est-il correct ? Ou devrait-on détecter dès 1 enfant ?
2. Y a-t-il des types de contenus où l'absence d'auto-layout est acceptable ?
   - Images overlays
   - Designs complexes avec positionnement manuel intentionnel
   - Canvas/artistic layouts
3. Générez-vous du CSS Grid ou seulement Flexbox ? Si Grid, l'absence d'auto-layout est-elle toujours problématique ?
4. Impact sur la complexité du code généré (nombre de lignes, propriétés CSS) ?

---

### ✅ Règle AL2 - Sizing modes conflictuels
**Mon implémentation actuelle** :
- ❌ **ERROR** si `layoutSizingHorizontal === 'FIXED'` ET `layoutGrow === 1` simultanément
- Raison supposée : "Conflicting sizing produces unpredictable flex behavior"

**Questions pour vous** :
1. Cette combinaison est-elle réellement impossible ou juste déconseillée ?
2. Quelles autres combinaisons de sizing sont problématiques ?
   - `FIXED` + `layoutGrow` (vertical) ?
   - `HUG` + `FILL` ?
   - `HUG` + `layoutGrow` ?
3. Comment gérez-vous `layoutAlign` dans ces cas ?
4. Y a-t-il des différences entre sizing horizontal et vertical ?
5. Quel code CSS est généré dans ces cas conflictuels ?

---

## 📱 CATÉGORIE : RESPONSIVE

### ✅ Règle R1 - Conflits de contraintes
**Mon implémentation actuelle** :
- ❌ **ERROR** si `constraints.horizontal === 'STRETCH'` ET `layoutSizingHorizontal === 'FIXED'`
- Raison supposée : "Conflicting constraints cause layout shifts"

**Questions pour vous** :
1. Cette combinaison cause-t-elle un échec d'export ou juste un comportement inattendu ?
2. Liste EXHAUSTIVE des combinaisons constraints + sizing problématiques :
   - `STRETCH` + `FIXED` ?
   - `STRETCH` + `HUG` ?
   - `SCALE` + `FILL` ?
   - `CENTER` + autres ?
3. Différences entre contraintes horizontales et verticales ?
4. Impact sur le code généré (media queries, responsive units) ?
5. Que générez-vous comme CSS dans ces cas ? (`position: absolute`, `width: 100%`, `flex`, autre) ?

---

### ✅ Règle R2 - Min/Max sizing manquants
**Mon implémentation actuelle** :
- ⚠️ **WARNING** si `layoutMode !== 'NONE'` ET `layoutSizingHorizontal === 'FILL'` ET pas de `minWidth`/`maxWidth`
- Raison supposée : "Missing min/max can cause layout issues at extreme viewport sizes"

**Questions pour vous** :
1. L'absence de min/max cause-t-elle réellement des problèmes ou est-ce juste une best practice ?
2. Y a-t-il des breakpoints/tailles critiques où c'est particulièrement problématique ?
3. Générez-vous du code responsive même sans min/max défini ?
4. Valeurs par défaut utilisées si non spécifié ?
5. Différences selon le contexte (mobile-first, desktop-first) ?

---

## 🖼️ CATÉGORIE : ASSETS

### ✅ Règle A1 - Export settings manquants
**Mon implémentation actuelle** :
- ⚠️ **WARNING** si node a un image fill MAIS `exportSettings.length === 0`
- Raison supposée : "Images without export settings are not included in code generation"

**Questions pour vous** :
1. Est-ce réellement bloquant ou générez-vous des assets par défaut ?
2. Quels types de nodes DOIVENT avoir export settings ?
   - Images bitmap uniquement ?
   - Vecteurs aussi ?
   - Background fills ?
   - Masks ?
   - Effects (shadows, blurs) ?
3. Format par défaut si non spécifié ?
4. Quelle résolution (@1x, @2x, @3x) est requise ?
5. Impact des compression settings ?

---

### ✅ Règle A2 - Optimisation des formats
**Mon implémentation actuelle** :
- ℹ️ **INFO** si `type === 'VECTOR'` exporté en PNG (suggère SVG)
- Raison supposée : "Vectors should be SVG for smaller file size"

**Questions pour vous** :
1. Règles EXACTES pour choisir le format optimal :
   - SVG : quels critères (type, complexité, effets) ?
   - PNG : quels cas d'usage ?
   - JPG : supporté ? Quand l'utiliser ?
   - WebP : supporté ?
2. Y a-t-il un seuil de complexité pour les vecteurs (nombre de points) au-delà duquel PNG est préférable ?
3. Impact des effets Figma (shadows, blurs, masks) sur le choix du format ?
4. Support des SVG avec embedded images ?
5. Gestion des vector networks complexes ?

---

## 🔤 CATÉGORIE : FONTS

### ✅ Règle F1 - Fonts manquantes
**Mon implémentation actuelle** :
- ❌ **ERROR** si `node.hasMissingFont === true`
- Raison supposée : "Missing fonts cause text rendering failures"

**Questions pour vous** :
1. Comportement exact lors d'une font manquante :
   - Erreur bloquante ?
   - Fallback automatique (vers quelle font) ?
   - Warning dans les logs ?
2. Impact sur les font weights/styles spécifiques (Regular, Bold, Italic) ?
3. Différence entre font manquante et font non loadée ?
4. Gestion des font families avec fallbacks définis ?

---

### ✅ Règle F2 - Non-web-fonts
**Mon implémentation actuelle** :
- ⚠️ **WARNING** si font family PAS dans cette liste :
  ```
  Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Source Sans Pro,
  Raleway, PT Sans, Merriweather, Nunito, Playfair Display, Ubuntu,
  Work Sans, Noto Sans, Fira Sans, DM Sans, Manrope, Public Sans, Space Grotesk
  ```
- Raison supposée : "Non-web fonts require embedding or fallback to system fonts"

**Questions pour vous** :
1. Liste EXHAUSTIVE des fonts que vous considérez comme "web-safe" ou "auto-embedded" ?
2. Support de Google Fonts, Adobe Fonts, custom fonts ?
3. Gestion des variable fonts ?
4. Comment gérez-vous les font weights spécifiques (100, 200, 300...900) ?
5. Fallback stack généré si font non disponible ?
6. Impact sur la performance (font loading, FOUT, FOIT) ?

---

## ❓ RÈGLES MANQUANTES - Que devrais-je ajouter ?

**Voici des validations potentielles non implémentées. Sont-elles nécessaires ?**

### 🎨 Couleurs
- Format des couleurs (RGB, HEX, HSL) ?
- Opacité minimale/maximale ?
- Gradients complexes supportés ?
- Blend modes non supportés ?

### 📏 Dimensions
- Taille de texte min/max ?
- Dimensions de frame min/max ?
- Border radius extrêmes ?
- Stroke width limites ?

### ✨ Effets
- Effects non supportés (certains blurs, shadows) ?
- Backdrop filters ?
- Plugin effects ?
- Masks complexes ?

### 🧩 Components
- Component variants mal configurées ?
- Instance overrides problématiques ?
- Detached instances ?
- Boolean operations complexes ?

### 🔗 Autres
- Rotations non standard (angles != 0/90/180/270) ?
- Clips et overflow ?
- Blend modes exotiques ?
- Opacity à 0 (layers invisibles) ?

---

## 📊 FORMAT DE RÉPONSE SOUHAITÉ

Pour chaque règle, merci de fournir :

```yaml
règle_id: "structure-hierarchy-depth"
validation_exacte:
  critère: "Profondeur > X niveaux"
  valeur_X: 12  # Valeur exacte
  types_nodes_concernés: ["FRAME", "GROUP", "COMPONENT"]
  exclusions: ["Instances de components flatten"]
impact_export:
  type: "ERROR" | "WARNING" | "INFO"
  symptôme: "Description précise de l'échec"
  code_généré_problématique: |
    // Exemple de code généré qui pose problème
spécifications_techniques:
  - "Détail technique 1"
  - "Détail technique 2"
cas_edge:
  - description: "Cas particulier 1"
    comportement: "Ce qui se passe"
recommandation: "Ce que vous recommandez aux designers"
```

---

## 🎯 LIVRABLE ATTENDU

Un document structuré (Markdown, JSON, YAML) contenant :

1. ✅ **Validation de mes 11 règles actuelles** (correctes, à ajuster, à supprimer)
2. ➕ **Règles manquantes** à ajouter
3. 📐 **Spécifications techniques précises** pour chaque règle
4. 🧪 **Cas edge et exemples concrets**
5. 💡 **Recommandations** pour les designers

---

**Merci d'analyser le codebase Figma-to-Code et de me fournir ces spécifications contractuelles précises !** 🙏
