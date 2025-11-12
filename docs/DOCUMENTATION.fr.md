# Documentation MCP Figma to Code

Bienvenue dans la documentation complète de **MCP Figma to Code** - l'outil qui transforme vos designs Figma en composants React + Tailwind CSS pixel-perfect, prêts pour la production.

## Introduction

**MCP Figma to Code** est un outil destiné aux développeurs React et Tailwind CSS qui souhaitent accélérer leur workflow de développement en convertissant automatiquement des designs Figma en code production-ready.

### À qui s'adresse cet outil ?

- **Développeurs Frontend** utilisant React 19 + Tailwind CSS
- **Équipes** cherchant à réduire le temps entre design et implémentation
- **Projets** nécessitant une fidélité pixel-perfect entre maquettes et rendu web
- **Designers-Développeurs** voulant automatiser la conversion design → code

### La promesse

Donnez une URL Figma, obtenez un composant React fonctionnel avec:
- **Fidélité visuelle garantie** : Le rendu web correspond exactement au design Figma
- **Code optimisé** : 11 transformations AST pour un code propre et maintenable
- **Zero configuration** : Fonctionne immédiatement avec Docker
- **Deux modes** : Version Tailwind (-fixed) ou CSS pur (-clean) pour la production

### Workflow général

```
1. Design dans Figma → 2. Copier URL → 3. Lancer export → 4. Récupérer code React + CSS
```

Le système se charge de tout : extraction via MCP, processing AST, validation visuelle et génération de rapports.

## Quick Start

Installez et lancez votre premier export en moins de 5 minutes.

### Prérequis

Avant de commencer, installez:
- **Docker Desktop** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **Figma Desktop** (app native, pas le navigateur)
- Un compte **Figma Professional** (pour activer le MCP Server)

### Installation en 3 étapes

#### Étape 1 : Cloner le projet

```bash
git clone https://github.com/votre-repo/mcp-figma-v1.git
cd mcp-figma-v1
```

#### Étape 2 : Activer le MCP Server dans Figma

1. Ouvrez **Figma Desktop** (l'application native, pas le web)
2. Allez dans **Settings → Integrations**
3. Activez **MCP Server** (port par défaut : 3845)
4. Vérifiez que le serveur répond :

```bash
curl http://localhost:3845/mcp
# Si vous recevez une réponse (même erreur 400), c'est bon ✅
```

> **Note :** Le MCP Server ne fonctionne qu'avec Figma Desktop ouvert.

#### Étape 3 : Lancer l'application

```bash
docker-compose up --build
```

L'application démarre sur **http://localhost:5173**

### Votre premier export (2 minutes)

1. Ouvrez un fichier Figma contenant un composant ou frame
2. Sélectionnez l'élément à exporter
3. Clic droit → **Copy/Paste as → Copy link**
4. Vérifiez que l'URL contient `?node-id=X-Y`
5. Dans le dashboard (http://localhost:5173), allez sur **Export Figma**
6. Collez l'URL et cliquez sur **Lancer l'export**
7. Suivez les logs en temps réel
8. Une fois terminé, cliquez sur **View details** pour voir le résultat

**Résultat :** Vous avez maintenant un composant React avec Tailwind CSS prêt à l'emploi !

## Interface Dashboard

Le dashboard est organisé en 5 sections principales accessibles via la sidebar gauche.

![Dashboard](/docs/images/image01.png)

### Navigation principale

#### Dashboard (page d'accueil)
- **Vue d'ensemble** : Statistiques globales (exports, merges, transformations)
- **Activité récente** : Timeline des derniers exports et merges
- **Actions rapides** : Boutons pour lancer un nouvel export ou merge
- **Graphiques** : Évolution de l'activité, top exports, breakdown des transformations

#### Export Figma
- **Liste des exports** : Tous vos exports Figma avec tri et pagination
- **Deux vues** : Grille (cards avec preview) ou Liste (tableau détaillé)
- **Actions** : View details, Open preview, Delete
- **Stats** : Pour chaque export : nombre de nodes, images, fonts, fixes appliqués

#### Responsive Merges
- **Liste des merges** : Composants responsives créés en fusionnant Desktop/Tablet/Mobile
- **Actions** : View preview, Edit with Puck, Delete
- **Stats** : Nombre de composants mergés, erreurs éventuelles

#### Settings
- **MCP Connection** : URL du serveur, délai entre appels
- **Code Generation** : Mode par défaut (Fixed, Clean, Both), chunking
- **Directories** : Chemins de sortie
- **API Limits** : Seuils d'alerte (warning, critical, danger)
- **Transforms** : Activer/désactiver les transformations AST individuellement

#### Documentation
- **Navigation sticky** : Accès rapide aux sections
- **Contenu bilingue** : FR/EN selon vos préférences
- **Recherche** : Via navigation gauche (auto-scroll)

### Barre d'utilisation API (en haut)

La barre colorée en haut du dashboard affiche votre consommation quotidienne de tokens Figma :
- **Vert (SAFE)** : < 50% de la limite quotidienne
- **Jaune (WARNING)** : 50-75%
- **Orange (CRITICAL)** : 75-90%
- **Rouge (DANGER)** : > 90%

Passez la souris dessus pour voir :
- Tokens utilisés aujourd'hui
- Breakdown des appels MCP (get_design_context, get_metadata, etc.)
- Estimations min/typical/max de crédits
- Historique des 7 derniers jours

> **Limite quotidienne** : ~1,200,000 tokens/jour (plan Figma Professional)

## Export Figma

La fonctionnalité principale : convertir un design Figma en composant React.

![Liste des exports Figma](/docs/images/image02.png)

### Workflow complet

#### 1. Obtenir l'URL Figma

Dans Figma Desktop :
1. **Sélectionnez** le frame, composant ou groupe à exporter
2. **Clic droit** → Copy/Paste as → **Copy link**
3. L'URL doit ressembler à :

```
https://www.figma.com/design/FILE_KEY?node-id=123-456
```

Le paramètre `node-id` est **obligatoire**. Format accepté : `123-456` ou `123:456`

![Formulaire d'export Figma](/docs/images/image03.png)

#### 2. Lancer l'export

1. Allez sur la page **Export Figma** dans le dashboard
2. Collez l'URL dans le formulaire en haut
3. Cliquez sur **Lancer l'export**
4. Un flux de logs en temps réel s'affiche :

```
🚀 Extraction phase starting...
● Connecting to MCP server...
✓ MCP connected successfully
● Extracting metadata.xml...
✓ Metadata extracted (45 nodes)
● Extracting design context (chunk 1/5)...
...
✓ Export completed in 23s
```

5. Une fois terminé, le nouvel export apparaît dans la liste

#### 3. Explorer les résultats

Cliquez sur **View details** pour accéder à la page de détails avec 3 onglets :

![Page de détails d'un export](/docs/images/image04.png)

##### Onglet Preview
- **Aperçu visuel** : Le composant rendu dans un iframe
- **Presets responsive** : Native, Mobile (375px), Tablet (768px), Desktop (1440px), Large (1920px)
- **Slider personnalisé** : Testez n'importe quelle largeur
- **DevTools** : Inspectez les classes Tailwind avec F12

![Onglet Preview](/docs/images/image05.png)

##### Onglet Code
- **Navigation fichiers** : Arborescence de tous les fichiers générés
- **Versions** : Component-fixed.tsx (Tailwind) et Component-clean.tsx (CSS pur)
- **Chunks** : Si design complexe, voir les composants découpés
- **Syntax highlighting** : Code coloré avec react-syntax-highlighter
- **Copy button** : Copier le code en un clic

![Onglet Code](/docs/images/image07.png)

##### Onglet Report
- **Comparaison visuelle** : Figma screenshot vs Web render côte à côte
- **Métriques de fidélité** : Analyse des différences visuelles
- **Rapport technique** : Fichier analysis.md avec détails des transformations

![Onglet Report](/docs/images/image06.png)

### Modes de processing

Le système s'adapte automatiquement à la complexité du design :

#### Mode Simple
Pour les petits composants valides (< 50 nodes) :
- 4 appels MCP seulement
- Processing direct du code complet
- Rapide et efficace

#### Mode Chunk
Pour les designs complexes (> 50 nodes ou code invalide) :
- Extraction du parent wrapper (préserve layout)
- Découpage en chunks (1 chunk = 1 enfant direct)
- Processing indépendant de chaque chunk
- Assemblage final avec imports
- CSS consolidé et dédupliqué

> Le mode est choisi automatiquement. Vous n'avez rien à faire.

## Responsive Merge

Créez un composant responsive en fusionnant 3 exports pour Desktop, Tablet et Mobile.

![Liste des merges responsives](/docs/images/image08.png)

### Principe

Le système analyse les différences de classes CSS entre les 3 versions et génère automatiquement les media queries :

```css
/* Desktop-first approach */
.container { width: 1200px; } /* Desktop par défaut */

@media (max-width: 1024px) {
  .container { width: 768px; } /* Tablet */
}

@media (max-width: 768px) {
  .container { width: 100%; } /* Mobile */
}
```

### Workflow

#### 1. Créer les 3 exports Figma

Dans Figma, créez 3 frames séparés pour le même composant :
- **Desktop** : 1440px de largeur (ou votre breakpoint desktop)
- **Tablet** : 768px de largeur
- **Mobile** : 375px de largeur

Exportez chacun via la page **Export Figma** (voir section précédente).

> **Astuce :** Nommez vos frames de manière cohérente (ex: "HomePage-Desktop", "HomePage-Tablet", "HomePage-Mobile")

![Modes d'affichage grid/list](/docs/images/image09.png)

#### 2. Lancer le merge

1. Allez sur **Responsive Merges**
2. Cliquez sur **Nouveau Merge**
3. Une modale s'ouvre avec 3 sélecteurs :
   - **Desktop** : Sélectionnez votre export Desktop
   - **Tablet** : Sélectionnez votre export Tablet
   - **Mobile** : Sélectionnez votre export Mobile
4. Cliquez sur **Lancer le merge**
5. Suivez la progression (logs temps réel)

![Popup de création d'un merge responsive](/docs/images/image10.png)

#### 3. Résultat

Une fois le merge terminé, vous obtenez :
- **Un composant unique** avec media queries automatiques
- **Breakpoints optimisés** : 1024px et 768px (configurables)
- **CSS consolidé** : Dédupliqué et optimisé
- **Rapport de merge** : Détails des différences détectées

![Édition d'un merge responsive](/docs/images/image11.png)

### Utilisation du composant mergé

Le composant s'adapte automatiquement à la largeur de l'écran :

```tsx
import HomePage from './HomePage-responsive.tsx'

function App() {
  return <HomePage /> // S'adapte automatiquement Desktop/Tablet/Mobile
}
```

### Édition avec Puck (optionnel)

Cliquez sur **Edit with Puck** pour :
- Éditer visuellement le composant
- Ajuster les breakpoints
- Modifier les classes CSS
- Exporter le résultat

## Fichiers Générés

Chaque export crée un dossier `src/generated/export_figma/node-{id}-{timestamp}/` avec de nombreux fichiers. Voici leur rôle.

### Structure du dossier

```
node-9-2654-1735689600/
├── Component-fixed.tsx       # Version Tailwind CSS
├── Component-fixed.css       # Styles Tailwind
├── Component-clean.tsx       # Version CSS pur (production)
├── Component-clean.css       # Styles CSS optimisés
├── parent-wrapper.tsx        # Wrapper parent (Mode Chunk uniquement)
├── chunks/                   # Chunks originaux (Mode Chunk)
│   ├── Header.tsx
│   ├── Content.tsx
│   └── Footer.tsx
├── chunks-fixed/             # Chunks processés Tailwind
├── chunks-clean/             # Chunks processés CSS pur
├── img/                      # Images extraites
│   ├── logo.png
│   ├── hero-image.jpg
│   └── icon-menu.svg
├── metadata.xml              # Hiérarchie Figma (nodes)
├── variables.json            # Design tokens (fonts, colors)
├── metadata.json             # Métadonnées dashboard
├── analysis.md               # Rapport technique (transformations)
├── report.html               # Rapport visuel (Figma vs Web)
├── figma-render.png          # Screenshot Figma
└── web-render.png            # Screenshot Web
```

### Fichiers principaux

#### Component-fixed.tsx
**Usage :** Projets utilisant Tailwind CSS

- Utilise les classes Tailwind (`flex`, `bg-white`, `text-lg`)
- Utilise les arbitrary values (`bg-[#f0d9b5]`, `w-[480px]`)
- Inclut des attributs debug (`data-name`, `data-node-id`)
- Nécessite configuration Tailwind avec safelist (voir CSS)

#### Component-clean.tsx
**Usage :** Production sans dépendances Tailwind

- CSS pur avec classes custom (`.bg-custom-beige`, `.w-custom-480`)
- Aucun attribut debug
- Copy/paste ready : fonctionne partout
- Idéal pour intégration dans projets non-Tailwind

#### Component-fixed.css / Component-clean.css

Les fichiers CSS contiennent :
- **Variables CSS** (`:root`) : Couleurs, espacements, fonts
- **Google Fonts import** : Chargement automatique des polices utilisées
- **Utility classes Figma** : Classes helper générées par Figma
- **Custom classes** : Pour -clean.css, toutes les classes custom

**Différence principale :**
- `-fixed.css` : Nécessite Tailwind config avec safelist pour arbitrary values
- `-clean.css` : Standalone, aucune dépendance

### Fichiers metadata

#### metadata.xml
Hiérarchie complète des nodes Figma au format XML :

```xml
<node id="9:2654" name="HomePage" type="FRAME" width="1440" height="900">
  <node id="9:2655" name="Header" type="FRAME" width="1440" height="80">
    <node id="9:2656" name="Logo" type="INSTANCE" />
  </node>
</node>
```

Utilisé pour :
- Chunking (découpe selon les enfants directs)
- Organisation des images (renommage selon layer name)
- Rapports techniques

#### variables.json
Design tokens extraits de Figma :

```json
{
  "fonts": {
    "primary": "Inter",
    "secondary": "Roboto"
  },
  "colors": {
    "primary": "#0066cc",
    "background": "#ffffff"
  }
}
```

#### metadata.json
Métadonnées affichées dans le dashboard :

```json
{
  "exportId": "node-9-2654-1735689600",
  "nodeId": "9:2654",
  "nodeName": "HomePage",
  "timestamp": 1735689600000,
  "stats": {
    "totalNodes": 145,
    "imagesOrganized": 12,
    "executionTime": 23
  }
}
```

### Fichiers rapports

#### analysis.md
Rapport technique des transformations AST appliquées :

- Statistiques par transformation (items processed, execution time)
- Warnings et erreurs
- Optimisations appliquées
- Recommandations

#### report.html
Rapport visuel comparant Figma vs Web :

- Screenshots côte à côte
- Métriques de différence
- Zones de divergence (si détectées)

## Documentation

Cette documentation est accessible directement dans le dashboard avec navigation sticky et support bilingue FR/EN.

![Page de documentation](/docs/images/image12.png)

## Architecture

Comprendre comment fonctionne le système sous le capot.

### Vue d'ensemble

Le système repose sur une **pipeline en 4 phases** qui convertit un design Figma en code React optimisé :

```
Phase 1: Extraction (MCP) → Phase 2: Processing (AST) → Phase 3: Validation → Phase 4: Reports
```

Chaque phase a un rôle précis et peut fonctionner de manière indépendante.

### Phase 1 : Extraction (MCP)

**Objectif :** Récupérer toutes les données du design depuis Figma Desktop

**Technologie :** Model Context Protocol (MCP) - Un protocole pour échanger des contextes riches entre applications

**Processus :**

1. **Connexion au MCP Server**
   - Le serveur MCP tourne dans Figma Desktop (port 3845)
   - Connexion via HTTP transport depuis Docker
   - URL : `http://host.docker.internal:3845/mcp`

2. **Extraction des métadonnées**
   - Appel `get_metadata(nodeId)` → `metadata.xml`
   - Contient la hiérarchie complète des nodes
   - Utilisé pour décider du mode (Simple ou Chunk)

3. **Extraction du code**
   - **Mode Simple** : 1 appel `get_design_context(nodeId, forceCode: true)`
   - **Mode Chunk** : 1 appel pour parent + N appels pour enfants
   - Délai de 1 seconde entre chaque appel (rate limiting Figma)

4. **Extraction des assets**
   - Images : `get_design_context` avec `dirForAssetWrites`
   - Screenshot Figma : `get_screenshot(nodeId)`
   - Variables : `get_variable_defs(nodeId)`

**Résultat :** Dossier avec code React brut + assets + métadonnées

### Phase 2 : Processing (AST)

**Objectif :** Transformer le code brut en code optimisé et valide

**Technologie :** Abstract Syntax Tree (AST) via Babel

**Processus :**

1. **Parsing**
   - Le code React/JSX est parsé en AST (arbre syntaxique)
   - L'AST représente le code sous forme d'objets manipulables

2. **Transformations**
   - 11 transformations sont appliquées par ordre de priorité
   - Chaque transform modifie l'AST en place
   - Un seul traversal de l'AST pour toutes les transforms (performance)

3. **Génération**
   - L'AST modifié est converti en code React
   - Le CSS est extrait et consolidé
   - Deux outputs : -fixed (Tailwind) et -clean (CSS pur)

4. **Organisation des images**
   - Images renommées selon layer names (pas hashes)
   - Copie depuis `tmp/figma-assets` vers `img/`
   - Mise à jour des imports dans le code

**Résultat :** Code optimisé + CSS + images organisées

### Phase 3 : Validation (Visuelle)

**Objectif :** Vérifier la fidélité visuelle Figma vs Web

**Technologie :** Puppeteer + Chromium

**Processus :**

1. **Lancement du navigateur**
   - Puppeteer lance Chromium en mode headless
   - Dimensions exactes du design (depuis metadata.xml)

2. **Navigation et rendu**
   - Chargement de la preview URL
   - Attente du chargement des fonts (Google Fonts)
   - Attente du chargement des images

3. **Capture screenshot**
   - Screenshot à l'échelle 1:1
   - Format PNG pour comparaison pixel-perfect

**Résultat :** `web-render.png` pour comparaison avec `figma-render.png`

### Phase 4 : Output (Reports)

**Objectif :** Générer les rapports et métadonnées

**Processus :**

1. **metadata.json** : Métadonnées dashboard (stats, timestamp)
2. **analysis.md** : Rapport technique des transformations
3. **report.html** : Rapport visuel avec screenshots côte à côte

**Résultat :** Rapports consultables dans l'onglet Report

### Modes de processing

#### Mode Simple

**Quand :** Design petit et valide (code React généré par Figma est correct)

**Pipeline :**
```
1. get_design_context(nodeId) → Component.tsx
2. AST processing sur Component.tsx → Component-fixed.tsx + Component-clean.tsx
3. Screenshots + Reports
```

**Appels MCP :** 4 (metadata, design_context, screenshot, variables)

#### Mode Chunk

**Quand :** Design complexe (> 50 nodes) ou code invalide

**Pipeline :**
```
1. get_metadata(nodeId) → Liste des enfants directs
2. get_design_context(parentNodeId) → parent-wrapper.tsx
3. Pour chaque enfant : get_design_context(childNodeId) → chunks/Child.tsx
4. AST processing sur chaque chunk → chunks-fixed/, chunks-clean/
5. Assemblage : Import des chunks dans parent
6. CSS consolidation : Merge de tous les CSS
7. Screenshots + Reports
```

**Appels MCP :** 5 + N (N = nombre d'enfants directs)

**Avantages :**
- Gère les designs complexes sans timeout
- Permet processing parallèle des chunks
- CSS consolidé et dédupliqué
- Code plus maintenable (découpage logique)

## Transformations AST

Les 11 transformations appliquées lors du processing AST, par ordre de priorité.

### Pourquoi des transformations AST ?

Le code généré par Figma (via MCP) est souvent :
- **Verbeux** : Classes Tailwind redondantes
- **Invalide** : Propriétés CSS non standard
- **Non optimisé** : Font definitions inline, SVG imbriqués
- **Difficilement maintenable** : Pas de découpage logique

Les transformations AST résolvent ces problèmes en modifiant le code de manière **structurée** et **prévisible**.

### Liste des transformations

#### 1. Font Detection (Priorité 10)
**Rôle :** Convertir les font classes custom en inline styles

**Exemple :**
```tsx
// Avant
<div className="font-['Inter:wght@400']">Text</div>

// Après
<div style={{ fontFamily: 'Inter', fontWeight: 400 }}>Text</div>
```

**Pourquoi :** Évite les classes Tailwind invalides, simplifie le CSS

#### 2. Auto Layout (Priorité 20)
**Rôle :** Fixer les classes auto-layout de Figma

**Exemple :**
```tsx
// Avant
<div className="flex-col items-start justify-start gap-4">

// Après
<div className="flex flex-col items-start justify-start gap-4">
```

**Pourquoi :** Figma oublie parfois le `flex` de base

#### 3. AST Cleaning (Priorité 30)
**Rôle :** Retirer les classes Tailwind invalides

**Exemple :**
```tsx
// Avant
<div className="flex mix-blend-normal opacity-[1]">

// Après
<div className="flex">
```

**Pourquoi :** `mix-blend-normal` et `opacity-[1]` ne servent à rien

#### 4. SVG Icon Fixes (Priorité 40)
**Rôle :** Corriger la structure des SVG (fill, stroke, attributes)

**Exemple :**
```tsx
// Avant
<svg fill="none">
  <path fill="black" stroke="red" />
</svg>

// Après
<svg>
  <path fill="black" />
</svg>
```

**Pourquoi :** Évite les conflits fill/stroke, simplifie le rendu

#### 5. SVG Consolidation (Priorité 45)
**Rôle :** Consolider les SVG imbriqués

**Exemple :**
```tsx
// Avant
<svg><svg><path /></svg></svg>

// Après
<svg><path /></svg>
```

**Pourquoi :** Réduit la complexité, améliore les performances

#### 6. Post Fixes (Priorité 50)
**Rôle :** Corriger les gradients et formes complexes

**Exemple :**
```tsx
// Fixe les linearGradient IDs
// Fixe les border-radius avec clip-path
```

**Pourquoi :** Assure le rendu correct des effets visuels

#### 7. Position Fixes (Priorité 60)
**Rôle :** Corriger les problèmes de positionnement

**Exemple :**
```tsx
// Avant
<div className="absolute left-[-10px]"> // Hors écran

// Après
<div className="absolute left-0">
```

**Pourquoi :** Évite les éléments hors viewport

#### 8. Stroke Alignment (Priorité 70)
**Rôle :** Fixer l'alignement des strokes (inside, outside, center)

**Exemple :**
```tsx
// Avant (stroke outside non supporté)
<div style={{ strokeAlign: 'outside' }}>

// Après (box-shadow simulation)
<div style={{ boxShadow: '0 0 0 2px currentColor' }}>
```

**Pourquoi :** CSS ne supporte pas stroke alignment natif

#### 9. CSS Variables (Priorité 80)
**Rôle :** Convertir les variables CSS en valeurs réelles

**Exemple :**
```tsx
// Avant
<div style={{ color: 'var(--primary-color)' }}>

// Après
<div style={{ color: '#0066cc' }}>
```

**Pourquoi :** Simplifie le CSS, évite les dépendances variables

#### 10. Tailwind Optimizer (Priorité 90)
**Rôle :** Optimiser les arbitrary values vers classes standard

**Exemple :**
```tsx
// Avant
<div className="w-[100%] h-[100vh] bg-[#ffffff]">

// Après
<div className="w-full h-screen bg-white">
```

**Pourquoi :** Code plus lisible, bundle CSS plus petit

#### 11. Production Cleaner (Priorité 100)
**Rôle :** Nettoyer pour la production (mode -clean uniquement)

**Exemple :**
```tsx
// Avant
<div data-name="Header" data-node-id="9:2654" className="flex">

// Après (-clean)
<div className="flex">
```

**Pourquoi :** Réduit la taille HTML, retire les attributs debug

### Configuration des transformations

Vous pouvez activer/désactiver chaque transformation dans **Settings → Transforms** :

```json
{
  "transforms": {
    "font-detection": { "enabled": true },
    "auto-layout": { "enabled": true },
    "ast-cleaning": { "enabled": true },
    // ...
  },
  "continueOnError": true // Continue même si une transform échoue
}
```

## API Reference

Tous les endpoints REST et Server-Sent Events disponibles.

### Base URL

```
http://localhost:5173/api
```

### Endpoints

#### POST /api/analyze

Lance une nouvelle analyse Figma.

**Request:**
```bash
curl -X POST http://localhost:5173/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"figmaUrl": "https://www.figma.com/design/FILE?node-id=9-2654"}'
```

**Body:**
```json
{
  "figmaUrl": "https://www.figma.com/design/FILE_KEY?node-id=123-456"
}
```

**Response:**
```json
{
  "jobId": "abc123def456",
  "status": "pending"
}
```

**Erreurs possibles:**
- `400` : URL invalide (manque node-id ou format incorrect)
- `500` : Erreur serveur (MCP inaccessible, etc.)

---

#### GET /api/analyze/logs/:jobId

Flux SSE (Server-Sent Events) pour suivre les logs en temps réel.

**Request:**
```javascript
const eventSource = new EventSource('/api/analyze/logs/abc123def456')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log(data.type, data.message)
}
```

**Response (stream):**
```
data: {"type": "log", "message": "🚀 Extraction phase starting..."}
data: {"type": "log", "message": "● Connecting to MCP server..."}
data: {"type": "progress", "step": 1, "total": 4}
data: {"type": "log", "message": "✓ MCP connected successfully"}
data: {"type": "complete", "exportId": "node-9-2654-1735689600"}
```

**Types de messages:**
- `log` : Message de log classique
- `progress` : Progression (step/total)
- `complete` : Export terminé avec succès
- `error` : Erreur fatale

---

#### GET /api/analyze/status/:jobId

Statut d'un job (alternative au SSE).

**Request:**
```bash
curl http://localhost:5173/api/analyze/status/abc123def456
```

**Response:**
```json
{
  "jobId": "abc123def456",
  "status": "running", // pending | running | completed | failed
  "progress": {
    "current": 2,
    "total": 4
  },
  "exportId": null // ou "node-9-2654-1735689600" si completed
}
```

---

#### GET /api/export_figma

Liste tous les exports Figma.

**Request:**
```bash
curl http://localhost:5173/api/export_figma
```

**Response:**
```json
[
  {
    "exportId": "node-9-2654-1735689600",
    "nodeId": "9:2654",
    "nodeName": "HomePage",
    "layerName": "HomePage",
    "timestamp": 1735689600000,
    "stats": {
      "totalNodes": 145,
      "imagesOrganized": 12,
      "fontsUsed": 3,
      "totalFixes": 87,
      "executionTime": 23
    },
    "thumbnailPath": "/src/generated/export_figma/node-9-2654-1735689600/figma-render.png"
  }
]
```

---

#### GET /api/export_figma/:exportId

Détails d'un export spécifique.

**Request:**
```bash
curl http://localhost:5173/api/export_figma/node-9-2654-1735689600
```

**Response:** Même format que GET /api/export_figma mais pour un seul export

---

#### DELETE /api/export_figma/:exportId

Supprime un export et tous ses fichiers.

**Request:**
```bash
curl -X DELETE http://localhost:5173/api/export_figma/node-9-2654-1735689600
```

**Response:**
```json
{
  "success": true,
  "message": "Export deleted successfully"
}
```

---

#### GET /api/usage

Statistiques d'utilisation de l'API Figma (tokens MCP).

**Request:**
```bash
curl http://localhost:5173/api/usage
```

**Response:**
```json
{
  "today": {
    "date": "2025-01-01",
    "tokensUsed": 45230,
    "apiCalls": 12,
    "breakdown": {
      "get_design_context": 8,
      "get_metadata": 2,
      "get_screenshot": 1,
      "get_variable_defs": 1
    }
  },
  "historical": [
    { "date": "2024-12-31", "tokensUsed": 32100, "apiCalls": 9 },
    { "date": "2024-12-30", "tokensUsed": 28900, "apiCalls": 7 }
  ],
  "status": {
    "level": "SAFE", // SAFE | GOOD | WARNING | CRITICAL | DANGER
    "percentage": 3.7,
    "message": "Usage normal",
    "estimatedCredits": {
      "min": 0.02,
      "typical": 0.05,
      "max": 0.15
    }
  }
}
```

**Notes:**
- `tokensUsed` : Mesure réelle depuis les réponses MCP
- `historical` : 30 derniers jours maximum
- Limite quotidienne : ~1,200,000 tokens (plan Professional)

---

#### GET /api/mcp/health

Health check du serveur MCP.

**Request:**
```bash
curl http://localhost:5173/api/mcp/health
```

**Response:**
```json
{
  "status": "connected", // connected | disconnected
  "url": "http://host.docker.internal:3845/mcp",
  "timestamp": 1735689600000
}
```

---

#### GET /api/download/:exportId

Télécharge un export en ZIP.

**Request:**
```bash
curl -O http://localhost:5173/api/download/node-9-2654-1735689600
# Télécharge node-9-2654-1735689600.zip
```

**Response:** Fichier ZIP contenant tous les fichiers de l'export

---

### Intégration dans un workflow

Exemple : Script Node.js pour lancer un export et attendre le résultat

```javascript
const fetch = require('node-fetch')

async function exportFigma(figmaUrl) {
  // 1. Lancer l'export
  const res = await fetch('http://localhost:5173/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ figmaUrl })
  })
  const { jobId } = await res.json()

  // 2. Suivre les logs (SSE)
  const eventSource = new EventSource(`http://localhost:5173/api/analyze/logs/${jobId}`)

  return new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'complete') {
        eventSource.close()
        resolve(data.exportId)
      } else if (data.type === 'error') {
        eventSource.close()
        reject(new Error(data.message))
      } else {
        console.log(data.message) // Log progress
      }
    }
  })
}

// Usage
exportFigma('https://www.figma.com/design/FILE?node-id=9-2654')
  .then(exportId => console.log('Export terminé:', exportId))
  .catch(err => console.error('Erreur:', err))
```

## Configuration Avancée

Personnaliser le comportement du système via Settings ou variables d'environnement.

### Page Settings

Accessible via le sidebar, la page Settings permet de configurer :

#### Onglet MCP

**MCP Server URL**
- Docker : `http://host.docker.internal:3845/mcp`
- Local : `http://127.0.0.1:3845/mcp`

**Délai entre appels MCP**
- Min : 1000ms (rate limiting Figma)
- Recommandé : 1500ms pour éviter les erreurs 429

#### Onglet Generation

**Mode de génération par défaut**
- `Fixed only` : Génère uniquement Component-fixed.tsx (Tailwind)
- `Clean only` : Génère uniquement Component-clean.tsx (CSS pur)
- `Both` : Génère les deux versions (recommandé)

**Chunking**
- `Activé` : Force le mode Chunk pour tous les designs
- `Désactivé` : Mode automatique (Simple ou Chunk selon complexité)

#### Onglet Directories

**Tests output directory**
- Chemin : `src/generated/export_figma`
- Change le dossier de sortie des exports

**Temporary assets directory**
- Chemin : `tmp/figma-assets`
- Stockage temporaire des images avant organisation

#### Onglet API

**Limite quotidienne**
- Défaut : 1,200,000 tokens/jour (Figma Professional)
- Ajustez selon votre plan Figma

**Seuils d'alerte**
- Warning : 50% (orange)
- Critical : 75% (rouge)
- Danger : 90% (rouge foncé)

#### Onglet UI

**Vue par défaut**
- Grid : Vue en grille avec cards
- List : Vue en tableau

**Items par page**
- Options : 10, 20, 50, 100

**Format screenshot**
- PNG : Sans perte (défaut)
- JPG : Compressé (plus léger)

**Qualité**
- 50-100% (si JPG)

#### Onglet Docker

**Nom du container**
- Défaut : `mcp-figma-v1`
- Change le nom du container Docker

#### Onglet Transforms

Liste des 11 transformations AST avec toggle on/off pour chacune.

**Continue on error**
- `Activé` : Continue le processing même si une transform échoue
- `Désactivé` : Arrête au premier échec

### Variables d'environnement

Configurables dans `.env` ou `docker-compose.yml` :

```bash
# MCP Server
MCP_SERVER_PORT=3845
MCP_SERVER_URL=http://host.docker.internal:3845/mcp

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_HEADLESS=true

# Projet
PROJECT_ROOT=/Users/votre-user/path/to/project
NODE_ENV=development

# API
API_PORT=5173
VITE_API_URL=http://localhost:5173
```

**PROJECT_ROOT** : Chemin absolu vers le projet (important pour MCP asset writes)

### Configuration Docker

#### docker-compose.yml

```yaml
services:
  app:
    container_name: mcp-figma-v1
    build: .
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
      - ./scripts:/app/scripts
      - ./server.js:/app/server.js
      - ./src/generated:/app/src/generated
      - ./tmp:/app/tmp
      - ./data:/app/data
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - PROJECT_ROOT=/Users/votre-user/path/to/project
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Volumes importants :**
- `./src/generated` : Outputs des exports (persistance)
- `./tmp` : Assets temporaires MCP
- `./data` : Usage tracking (30 jours)

**extra_hosts :** Permet d'accéder au MCP Server de l'hôte via `host.docker.internal`

#### Dockerfile

```dockerfile
FROM node:20-alpine

# Install Chromium for Puppeteer
RUN apk add --no-cache chromium

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
```

### Configuration Tailwind (pour utiliser -fixed.tsx)

Si vous utilisez Component-fixed.tsx dans votre projet :

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/generated/export_figma/**/*.tsx' // Important !
  ],
  safelist: [
    // Safelist pour arbitrary values (ou utilisez JIT mode)
    { pattern: /^(w|h|top|left|right|bottom)-\[.+\]$/ },
    { pattern: /^(bg|text|border)-\[.+\]$/ }
  ],
  theme: {
    extend: {}
  }
}
```

**Note :** Le mode -clean.tsx ne nécessite aucune configuration Tailwind.

## Troubleshooting

Solutions aux problèmes courants.

### Le serveur MCP n'est pas accessible

**Symptômes :**
- Erreur "MCP Server connection failed"
- Timeout lors de l'extraction
- Dashboard affiche "MCP Disconnected" (pastille rouge)

**Solutions :**

1. **Vérifier que Figma Desktop est ouvert**
   ```bash
   # Le MCP Server ne fonctionne que si Figma Desktop tourne
   ps aux | grep Figma
   ```

2. **Activer le MCP Server dans Figma**
   - Ouvrez Figma Desktop
   - Settings → Integrations → MCP Server → ON
   - Port par défaut : 3845

3. **Tester la connexion**
   ```bash
   curl http://localhost:3845/mcp
   # Si réponse (même 400), le serveur répond ✅
   ```

4. **Vérifier le port**
   ```bash
   lsof -i :3845
   # Doit afficher Figma ou rien (pas autre chose)
   ```

5. **Firewall**
   - Autorisez les connexions localhost sur port 3845
   - macOS : System Preferences → Security → Firewall

6. **Redémarrer Figma Desktop**
   - Quittez complètement Figma (Cmd+Q)
   - Relancez l'application

---

### Les images ne s'affichent pas

**Symptômes :**
- Images cassées (icône 🖼️)
- Chemins d'import incorrects dans le code
- Dossier `img/` vide

**Solutions :**

1. **Vérifier que les images ont été extraites**
   ```bash
   ls tmp/figma-assets/
   # Doit contenir des fichiers .png, .jpg, .svg
   ```

2. **Relancer organize-images**
   ```bash
   docker exec mcp-figma-v1 node scripts/post-processing/organize-images.js \
     src/generated/export_figma/node-X-Y-TIMESTAMP
   ```

3. **Vérifier metadata.xml**
   - Ouvrez `metadata.xml`
   - Vérifiez que les nodes images ont un attribut `name`
   - Si `name` est vide, le renommage échoue

4. **Vérifier les permissions**
   ```bash
   # Dans Docker
   docker exec mcp-figma-v1 ls -la tmp/figma-assets
   docker exec mcp-figma-v1 ls -la src/generated/export_figma/node-X-Y-T/img
   ```

5. **Chemins d'import**
   - Les imports doivent être relatifs : `./img/logo.png`
   - Pas de chemins absolus : `/app/src/generated/...`

---

### Les fonts ne se chargent pas

**Symptômes :**
- Textes affichés avec fallback font (Arial, Times)
- Console : "Failed to load font"

**Solutions :**

1. **Vérifier variables.json**
   ```bash
   cat src/generated/export_figma/node-X-Y-T/variables.json
   # Doit contenir une clé "fonts" avec Google Fonts
   ```

2. **Vérifier l'import CSS**
   ```css
   /* En haut du fichier CSS */
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
   ```

3. **Connexion internet**
   - Google Fonts nécessite une connexion
   - Testez : `curl https://fonts.googleapis.com`

4. **Fonts custom (non Google Fonts)**
   - Si font custom, elle ne sera pas chargée automatiquement
   - Ajoutez manuellement le @font-face dans le CSS

5. **Cache navigateur**
   - Videz le cache (Cmd+Shift+R)
   - Ou ouvrez en navigation privée

---

### Le code généré n'est pas fidèle au design

**Symptômes :**
- Espacements incorrects
- Couleurs différentes
- Layout cassé

**Solutions :**

1. **Consulter report.html**
   ```bash
   open src/generated/export_figma/node-X-Y-T/report.html
   # Compare Figma vs Web visuellement
   ```

2. **Lire analysis.md**
   ```bash
   cat src/generated/export_figma/node-X-Y-T/analysis.md
   # Voir quelles transformations ont échoué
   ```

3. **Propriétés non supportées**
   - Blend modes avancés (multiply, screen, overlay)
   - Effets complexes (inner shadow multiples)
   - Stroke alignment (inside, outside)

   → Ces propriétés CSS n'existent pas ou sont limitées

4. **Désactiver certaines transformations**
   - Allez dans Settings → Transforms
   - Désactivez les transforms qui posent problème
   - Relancez l'export

5. **Utiliser Component-clean.tsx**
   - La version -clean peut avoir un rendu différent (meilleur parfois)
   - Testez les deux versions

---

### J'atteins la limite de tokens

**Symptômes :**
- Erreur "Rate limit exceeded"
- Barre d'usage rouge (> 90%)
- Exports qui échouent avec erreur 429

**Solutions :**

1. **Consulter la barre d'usage**
   - Passez la souris sur la barre en haut
   - Voir combien de tokens utilisés aujourd'hui

2. **Privilégier les petits composants**
   - Exportez des composants isolés (pas des pages entières)
   - Un composant simple = ~5,000-10,000 tokens
   - Une page complète = ~50,000-200,000 tokens

3. **Utiliser le chunking**
   - Le mode Chunk optimise les appels MCP
   - Découpe les gros designs en petits morceaux

4. **Attendre 24h**
   - La limite se réinitialise chaque jour (UTC)
   - Planifiez vos exports importants

5. **Upgrader votre plan Figma**
   - Plan Professional : ~1,200,000 tokens/jour
   - Plan Organization : limites plus élevées
   - Contactez Figma pour détails

---

### Le Docker ne démarre pas

**Symptômes :**
- `docker-compose up` échoue
- Container crash immédiatement
- Erreur "port already in use"

**Solutions :**

1. **Vérifier les logs**
   ```bash
   docker logs mcp-figma-v1
   # Lire les erreurs
   ```

2. **Port 5173 occupé**
   ```bash
   lsof -i :5173
   kill -9 <PID>
   # Ou changez le port dans docker-compose.yml
   ```

3. **Rebuild complet**
   ```bash
   docker-compose down
   docker system prune -a  # ⚠️ Supprime tout (images, volumes, cache)
   docker-compose up --build
   ```

4. **Permissions fichiers**
   ```bash
   # Vérifier que Docker a accès aux dossiers
   chmod -R 755 src/ scripts/ tmp/ data/
   ```

5. **Chromium manquant**
   ```bash
   # Si erreur "Chromium not found"
   docker exec mcp-figma-v1 which chromium
   # Doit afficher : /usr/bin/chromium
   ```

6. **NPM install échoue**
   ```bash
   # Si dépendances manquantes
   docker exec mcp-figma-v1 npm install
   ```

---

### Le preview ne s'affiche pas

**Symptômes :**
- Iframe vide dans l'onglet Preview
- Erreur "Component not found"

**Solutions :**

1. **Vérifier que le fichier existe**
   ```bash
   ls src/generated/export_figma/node-X-Y-T/Component-fixed.tsx
   ```

2. **Erreur de compilation React**
   - Ouvrez la console DevTools (F12)
   - Regardez les erreurs de compilation
   - Souvent : import manquant, syntax error

3. **Relancer Vite**
   ```bash
   docker-compose restart
   # Force Vite à recompiler
   ```

4. **Vider le cache Vite**
   ```bash
   docker exec mcp-figma-v1 rm -rf node_modules/.vite
   docker-compose restart
   ```

---

### Les logs SSE ne s'affichent pas

**Symptômes :**
- Page d'analyse reste blanche
- Aucun log ne s'affiche après "Lancer l'export"

**Solutions :**

1. **Vérifier la console**
   - F12 → Console
   - Erreur EventSource ?

2. **Proxy/VPN**
   - Certains proxies bloquent SSE
   - Désactivez temporairement

3. **Browser compatibility**
   - SSE fonctionne sur Chrome, Firefox, Safari modernes
   - Évitez IE11

4. **Tester manuellement**
   ```bash
   curl -N http://localhost:5173/api/analyze/logs/<jobId>
   # Doit streamer les logs
   ```

## FAQ

### Questions fréquentes

#### Quelle est la différence entre -fixed et -clean ?

- **-fixed.tsx** : Utilise Tailwind CSS (classes `flex`, `bg-white`, etc.) + arbitrary values (`bg-[#f0d9b5]`). Nécessite configuration Tailwind avec safelist. Idéal pour projets Tailwind.
- **-clean.tsx** : CSS pur avec classes custom (`.bg-custom-beige`). Aucune dépendance. Copy/paste ready. Idéal pour production ou projets non-Tailwind.

#### Puis-je utiliser le code sans Tailwind ?

Oui, utilisez **Component-clean.tsx** + **Component-clean.css**. Aucune dépendance Tailwind requise.

#### Les composants sont-ils responsives ?

Non par défaut. Un export Figma = une largeur fixe. Pour du responsive, utilisez **Responsive Merge** (fusionner Desktop/Tablet/Mobile).

#### Combien coûte un export en tokens ?

Dépend de la complexité :
- Petit composant (10-20 nodes) : ~5,000-10,000 tokens
- Composant moyen (50 nodes) : ~20,000-40,000 tokens
- Page complète (200+ nodes) : ~100,000-300,000 tokens

Consultez la barre d'usage en haut du dashboard.

#### Puis-je exporter des Design Systems entiers ?

Oui, mais par morceaux. Exportez chaque composant séparément pour éviter les timeouts et limites de tokens.

#### Le code est-il production-ready ?

La version **-clean** est production-ready (CSS pur, pas de debug attrs). La version **-fixed** est idéale pour développement/prototypage avec Tailwind.

#### Puis-je modifier le code généré ?

Oui, c'est du code React standard. Modifiez comme bon vous semble. Le code n'a aucune dépendance externe (sauf images).

#### Les animations Figma sont-elles exportées ?

Non. Les animations (transitions, auto-animate) ne sont pas supportées. Vous devrez les recréer avec CSS ou Framer Motion.

#### Puis-je exporter des variantes (variants) ?

Figma variants ne sont pas supportés directement. Exportez chaque variante séparément, puis créez manuellement un composant React avec props.

#### Comment debugger un export qui échoue ?

1. Consultez les logs en temps réel (SSE)
2. Lisez `analysis.md` pour voir les transformations appliquées
3. Vérifiez `report.html` pour les différences visuelles
4. Regardez les logs Docker : `docker logs mcp-figma-v1`

#### Le système fonctionne-t-il avec Figma Browser ?

Non, uniquement **Figma Desktop**. Le MCP Server n'est disponible que dans l'app native.

#### Puis-je exporter vers Vue.js ou Angular ?

Non, le système génère du **React** uniquement. Mais le CSS peut être réutilisé dans n'importe quel framework.

#### Les plugins Figma sont-ils pris en compte ?

Non. Seul le design visible (layers, styles, images) est exporté. Les données de plugins ne sont pas accessibles via MCP.

#### Puis-je automatiser les exports (CI/CD) ?

Oui, via l'API REST. Voir section **API Reference** pour exemples d'intégration. Attention : nécessite Figma Desktop lancé sur la machine.

---

## Support

Pour toute question ou problème :

- **Documentation** : Relisez les sections Troubleshooting et FAQ
- **Logs** : Consultez `docker logs mcp-figma-v1` et les fichiers `analysis.md`

---

**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2025
**License** : MIT
