# 📱 Responsive Merge - Multi-Screen Fusion

> **Transform 3 Figma screens (Desktop, Tablet, Mobile) into a single responsive component with pure CSS media queries**

<div align="center">

```ascii
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Desktop (1440px)  ──┐                                     ║
║                      ├──> Responsive Merger ──> Page.tsx   ║
║  Tablet (960px)   ───┤                                     ║
║                      │    + Media Queries                  ║
║  Mobile (420px)   ───┘                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Pipeline Architecture](#pipeline-architecture)
- [Usage](#usage)
- [Output Structure](#output-structure)
- [Responsive Transformations](#responsive-transformations)
- [Puck Integration](#puck-integration)
- [API Endpoints](#api-endpoints)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **Responsive Merge** feature is a powerful tool that combines 3 separately exported Figma screens into a single responsive component. Unlike traditional responsive design where you adapt one design, this system **intelligently merges** three complete screen designs while preserving visual fidelity across all breakpoints.

### Key Features

✅ **Intelligent Component Detection** - Automatically identifies common components across breakpoints
✅ **Pure CSS Media Queries** - No Tailwind or framework dependencies
✅ **Conflict Resolution** - Detects and resolves className conflicts between breakpoints
✅ **Modular Architecture** - Generates `Page.tsx` + reusable `Subcomponents/`
✅ **Helper Function Injection** - Automatically extracts and injects shared utilities
✅ **Visual Validation** - Side-by-side comparison reports
✅ **Puck Integration** - Visual editor-ready components with drag-and-drop
✅ **Desktop-First Approach** - Prioritizes desktop layout with mobile/tablet overrides

---

## How It Works

### 1. Prerequisites

Before creating a responsive merge, you need **3 separate Figma exports**:

1. **Desktop** - Typically 1440px width
2. **Tablet** - Typically 960px width
3. **Mobile** - Typically 420px width

**Important:** Each export must be processed with `--split-components` flag to generate modular components.

```bash
# Export each screen separately
docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "https://figma.com/design/FILE?node-id=DESKTOP" \
  --split-components

docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "https://figma.com/design/FILE?node-id=TABLET" \
  --split-components

docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "https://figma.com/design/FILE?node-id=MOBILE" \
  --split-components
```

### 2. Component Matching

The system matches components across breakpoints using:

- **Exact name matching** - Components with identical names (e.g., `Header`, `Footer`)
- **Normalized names** - "title section" → "Titlesection"
- **Common components only** - Only components present in all 3 breakpoints are merged

Example:
```
Desktop: Header, Hero, Features, Footer
Tablet:  Header, Hero, Features, Footer
Mobile:  Header, Hero, Footer

→ Common: Header, Hero, Footer (Features skipped - not in mobile)
```

### 3. Merge Process

The merge happens in **4 phases**:

#### Phase 1: Detection & Validation
- Scan all 3 exports for modular components
- Identify common components
- Determine component order from Desktop `metadata.xml`
- Extract helper functions from Desktop `Component-clean.tsx`

#### Phase 2: Component Merging (AST Pipeline)
For each common component:
1. Parse Desktop, Tablet, Mobile `.tsx` files into AST
2. Run **Responsive Pipeline** (7 specialized transforms)
3. Merge classNames with conflict detection
4. Inject helper functions if needed
5. Fix image import paths (`./img/` → `../img/`)
6. Generate responsive TSX code

#### Phase 3: CSS Merging
For each component:
1. Parse Desktop, Tablet, Mobile `.css` files
2. Extract Desktop styles (baseline)
3. Calculate Tablet overrides (differences from Desktop)
4. Calculate Mobile overrides (differences from Tablet)
5. Generate media queries:
   ```css
   /* Desktop styles (default) */
   .header { height: 80px; }

   /* Tablet overrides */
   @media (max-width: 960px) {
     .header { height: 60px; }
   }

   /* Mobile overrides */
   @media (max-width: 420px) {
     .header { height: 50px; }
   }
   ```

#### Phase 4: Page Generation
1. Parse Desktop `Component-clean.tsx` structure
2. Merge with Tablet/Mobile versions
3. Replace `<div data-name="...">` with `<ComponentName />`
4. Generate `Page.tsx` with all imports
5. Generate `Page.css` with component imports
6. Compile responsive classes to pure CSS
7. Generate Puck-ready components
8. Create visual report + technical analysis

---

## Pipeline Architecture

### Responsive AST Transforms (Priority Order)

The Responsive Pipeline includes **7 specialized transforms**:

| Priority | Transform | Purpose |
|----------|-----------|---------|
| **10** | `detect-missing-elements` | Find elements missing in tablet/mobile |
| **20** | `normalize-identical-classes` | Normalize className formatting across breakpoints |
| **30** | `detect-class-conflicts` | Detect className differences (by data-name or position) |
| **40** | `merge-desktop-first` | Merge classNames (Desktop base + Tablet/Mobile overrides) |
| **50** | `add-horizontal-scroll` | Add `overflow-x: auto` to prevent layout breaks |
| **60** | `reset-dependent-properties` | Reset conflicting properties (width, height, etc.) |
| **70** | `inject-visibility-classes` | Add visibility classes (max-md:hidden, max-lg:block) |

### Transform Flow Diagram

```
Desktop AST ──┐
              ├──> Detect Missing Elements
Tablet AST  ──┤
              │──> Normalize ClassNames
Mobile AST  ──┘
                │
                ├──> Detect Conflicts (data-name matching)
                │
                ├──> Merge Desktop-First (base + overrides)
                │
                ├──> Add Horizontal Scroll (prevent breaks)
                │
                ├──> Reset Dependent Properties
                │
                └──> Inject Visibility Classes
                     │
                     └──> Generate Responsive TSX
```

---

## Usage

### Via Dashboard (Recommended)

1. Navigate to **Responsive Merges** page
2. Click **"New Responsive Merge"**
3. Select 3 exports:
   - **Desktop** - Select desktop export + enter width (e.g., 1440)
   - **Tablet** - Select tablet export + enter width (e.g., 960)
   - **Mobile** - Select mobile export + enter width (e.g., 420)
4. Click **"Launch Merge"**
5. Watch real-time logs in progress modal
6. View result in **Responsive Merges** list

### Via CLI

```bash
docker exec mcp-figma-v1 node scripts/responsive-merger.js \
  --desktop 1440 node-6055-2436-1762733564 \
  --tablet 960 node-6055-2654-1762712319 \
  --mobile 420 node-6055-2872-1762733537
```

**Arguments:**
- `--desktop <width> <exportId>` - Desktop export and breakpoint width
- `--tablet <width> <exportId>` - Tablet export and breakpoint width
- `--mobile <width> <exportId>` - Mobile export and breakpoint width

**Validation:**
- Breakpoint order must be: Desktop > Tablet > Mobile
- All exports must have `modular/` directory (requires `--split-components`)

---

## Output Structure

Each merge creates a folder in `src/generated/responsive-screens/`:

```
responsive-merger-{timestamp}/
├── Page.tsx                      # Main page component
├── Page.css                      # Consolidated CSS with media queries
├── Subcomponents/                # Modular components
│   ├── Header.tsx
│   ├── Header.css
│   ├── Hero.tsx
│   ├── Hero.css
│   ├── Footer.tsx
│   └── Footer.css
├── img/                          # Images (from Desktop export)
│   ├── logo.png
│   └── hero-bg.jpg
├── puck/                         # Puck editor components
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   └── Footer.tsx
│   ├── config.tsx                # Puck configuration
│   └── data.json                 # Initial Puck data
├── responsive-metadata.json      # Merge metadata + stats
├── responsive-analysis.md        # Technical analysis report
└── responsive-report.html        # Visual comparison report
```

### responsive-metadata.json

```json
{
  "timestamp": "2025-01-13T10:30:00.000Z",
  "mergeId": "responsive-merger-1736762400000",
  "type": "responsive-merge",
  "breakpoints": {
    "desktop": {
      "testId": "node-6055-2436-1762733564",
      "screenSize": "1440px",
      "width": 1440,
      "height": 900
    },
    "tablet": { /* ... */ },
    "mobile": { /* ... */ }
  },
  "mediaQueries": {
    "tablet": "@media (max-width: 960px)",
    "mobile": "@media (max-width: 420px)"
  },
  "components": ["Header", "Hero", "Features", "Footer"],
  "transformations": {
    "totalElementsProcessed": 42,
    "totalClassesMerged": 128,
    "matchingStrategy": {
      "byDataName": 35,
      "byPosition": 7
    },
    "conflicts": {
      "elementsWithConflicts": 12,
      "totalConflicts": 18
    },
    "elementsMerged": 42,
    "horizontalScrollAdded": 3,
    "resetsApplied": 8,
    "visibilityClassesInjected": 5
  }
}
```

---

## Responsive Transformations

### 1. Detect Missing Elements

**Purpose:** Identify elements that exist in Desktop but are missing in Tablet/Mobile.

**Example:**
```tsx
// Desktop has:
<div data-name="sidebar">...</div>

// Mobile doesn't have sidebar
→ Logged as missing element
```

**Stats:**
- `elementsDetected` - Total elements scanned
- `elements` - List of missing element data-names

### 2. Normalize Identical Classes

**Purpose:** Ensure consistent className formatting across breakpoints.

**Example:**
```tsx
// Desktop:  className="flex gap-4  items-center"
// Tablet:   className="items-center flex gap-4"
// Mobile:   className="flex  items-center   gap-4"

→ All normalized to: "flex gap-4 items-center"
```

### 3. Detect Class Conflicts

**Purpose:** Find elements with different classNames across breakpoints.

**Matching Strategy:**
1. **By data-name** (preferred) - Match `<div data-name="header">`
2. **By position** (fallback) - Match by index in parent

**Example:**
```tsx
// Desktop: <div data-name="card" className="w-full p-4">
// Tablet:  <div data-name="card" className="w-full p-3">
// Mobile:  <div data-name="card" className="w-full p-2">

→ Conflict detected on padding
```

**Stats:**
- `matchedByDataName` - Elements matched by data-name
- `matchedByPosition` - Elements matched by position
- `elementsWithConflicts` - Total elements with className differences
- `totalConflicts` - Total className properties that differ

### 4. Merge Desktop-First

**Purpose:** Merge classNames using desktop-first approach with media query overrides.

**Strategy:**
```
Desktop classes (base, no media query)
  ↓
Calculate differences: Tablet - Desktop
  ↓
Add Tablet overrides with max-md: prefix
  ↓
Calculate differences: Mobile - Tablet
  ↓
Add Mobile overrides with max-lg: prefix
```

**Example:**
```tsx
// Desktop: className="w-96 h-80 p-4"
// Tablet:  className="w-80 h-64 p-3"
// Mobile:  className="w-full h-48 p-2"

→ Merged: "w-96 h-80 p-4 max-md:w-80 max-md:h-64 max-md:p-3 max-lg:w-full max-lg:h-48 max-lg:p-2"
```

**Note:** These responsive classes are then compiled to pure CSS by `responsive-css-compiler.js`.

**Stats:**
- `elementsMerged` - Total elements with merged classNames
- `totalClassesMerged` - Total className properties merged

### 5. Add Horizontal Scroll

**Purpose:** Prevent layout breaks on narrow screens by adding horizontal scroll.

**Targets:**
- Elements with `flex-row` layout
- Elements wider than viewport
- Grid layouts with fixed columns

**Example:**
```tsx
// Before
<div className="flex flex-row gap-4">

// After
<div className="flex flex-row gap-4 max-md:overflow-x-auto">
```

**Stats:**
- `parentsUpdated` - Elements with overflow-x added

### 6. Reset Dependent Properties

**Purpose:** Reset conflicting properties when breakpoints change dimensions.

**Resets Applied:**
- Width conflicts → Add `max-md:w-auto`
- Height conflicts → Add `max-md:h-auto`
- Flex-basis conflicts → Add `max-md:flex-basis-auto`

**Example:**
```tsx
// Desktop: w-96
// Tablet:  w-80
// Mobile:  w-full

→ Add resets: max-md:w-auto max-lg:w-auto
```

**Stats:**
- `totalResetsAdded` - Number of reset classes added

### 7. Inject Visibility Classes

**Purpose:** Hide/show elements based on breakpoint.

**Use Cases:**
- Desktop-only navigation
- Mobile-only hamburger menu
- Tablet-specific layouts

**Example:**
```tsx
// Element missing in mobile
→ Add: max-lg:hidden

// Element only in mobile
→ Add: hidden max-lg:block
```

**Stats:**
- `visibilityClassesInjected` - Total visibility classes added

---

## Puck Integration

### What is Puck?

[Puck](https://puckeditor.com/) is a visual editor for React. The Responsive Merge generates **Puck-ready components** for easy visual customization.

### Generated Puck Files

```
puck/
├── components/           # Puck-wrapped components
│   ├── Header.tsx
│   ├── Hero.tsx
│   └── Footer.tsx
├── config.tsx            # Puck configuration
└── data.json             # Initial Puck data
```

### Using the Puck Editor

1. Navigate to Responsive Merge detail page
2. Click **"Open in Puck Editor"** tab
3. Drag and drop components
4. Edit props in real-time
5. Save changes back to `puck/data.json`

### API Endpoints for Puck

```javascript
// Get Puck config
GET /api/responsive-merges/:mergeId/puck-config

// Get Puck data
GET /api/responsive-merges/:mergeId/puck-data

// Save Puck data
POST /api/responsive-merges/:mergeId/puck-save
Body: { data: {...} }
```

---

## API Endpoints

### Create Responsive Merge

```http
POST /api/responsive-merges
Content-Type: application/json

{
  "desktop": {
    "size": "1440",
    "exportId": "node-6055-2436-1762733564"
  },
  "tablet": {
    "size": "960",
    "exportId": "node-6055-2654-1762712319"
  },
  "mobile": {
    "size": "420",
    "exportId": "node-6055-2872-1762733537"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "merge-1736762400000",
  "mergeId": "responsive-merger-1736762400000",
  "message": "Merge responsive lancé avec succès"
}
```

### Get Merge Logs (SSE Stream)

```http
GET /api/responsive-merges/logs/:jobId
```

**SSE Events:**
```json
// Log event
{ "type": "log", "message": "🔍 Validating breakpoints\n" }

// Done event
{ "type": "done", "success": true }

// Error event
{ "type": "error", "message": "Error message" }
```

### List All Merges

```http
GET /api/responsive-merges
```

**Response:**
```json
[
  {
    "mergeId": "responsive-merger-1736762400000",
    "timestamp": 1736762400000,
    "components": ["Header", "Hero", "Footer"],
    "breakpoints": { /* ... */ }
  }
]
```

### Get Merge Data

```http
GET /api/responsive-merges/:mergeId/data
```

**Response:**
```json
{
  "metadata": { /* responsive-metadata.json */ },
  "analysis": "# Technical Analysis\n..."
}
```

### Delete Merge

```http
DELETE /api/responsive-merges/:mergeId
```

### Download Merge (ZIP)

```http
GET /api/responsive-merges/:mergeId/download
```

Returns ZIP archive with all files.

---

## Technical Details

### CSS Compilation

Responsive classes like `max-md:w-80` are **compiled to pure CSS** by `responsive-css-compiler.js`:

```tsx
// Input (TSX)
<div className="w-96 max-md:w-80 max-lg:w-full" />

// Output (CSS)
.w-custom-96 { width: 24rem; }

@media (max-width: 960px) {
  .max-md-w-custom-80 { width: 20rem; }
}

@media (max-width: 420px) {
  .max-lg-w-custom-full { width: 100%; }
}
```

**Supported Prefixes:**
- `max-md:` → Tablet and below (≤960px)
- `max-lg:` → Mobile and below (≤420px)

### Helper Function Injection

Helper functions from Desktop `Component-clean.tsx` are **automatically extracted and injected** into subcomponents that use them.

**Example:**
```tsx
// Desktop Component-clean.tsx
function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`
}

// Subcomponents/PriceCard.tsx uses {formatCurrency(price)}
→ Helper is automatically injected into PriceCard.tsx
```

**Import Path Fixes:**
- `./img/logo.png` → `../img/logo.png` (subcomponents are nested)

### Component Order Preservation

Component order is extracted from Desktop `metadata.xml` hierarchy to preserve visual layout:

```xml
<frame name="HomePage">
  <frame name="Header" />
  <frame name="Hero Section" />  ← "Hero Section" → "Herosection"
  <frame name="Footer" />
</frame>

→ Order: Header, Herosection, Footer
```

---

## Troubleshooting

### "Missing modular/ directory"

**Problem:** Export was not split into modular components.

**Solution:**
```bash
# Re-export with --split-components flag
docker exec mcp-figma-v1 node scripts/figma-cli.js \
  "FIGMA_URL" \
  --split-components
```

### "No common components found"

**Problem:** Component names don't match across breakpoints.

**Solution:**
- Ensure Figma layer names are identical across screens
- Check component naming normalization (spaces, hyphens)
- Verify all breakpoints have the same components

### "Invalid breakpoint order"

**Problem:** Breakpoint widths not in descending order.

**Solution:**
```bash
# Correct order: Desktop > Tablet > Mobile
--desktop 1440 ... \
--tablet 960 ... \
--mobile 420 ...

# NOT: --desktop 960 --tablet 1440 (wrong!)
```

### CSS Classes Not Compiling

**Problem:** Responsive classes not generating CSS.

**Solution:**
- Check `responsive-css-compiler.js` is running
- Verify `Page.css` includes compiled classes
- Look for errors in merge logs

### Puck Editor Not Loading

**Problem:** Components not appearing in Puck.

**Solution:**
- Check `puck/config.tsx` exists
- Verify `puck/data.json` is valid JSON
- Check browser console for errors

### Images Not Loading

**Problem:** Images broken in subcomponents.

**Solution:**
- Images are copied from Desktop export only
- Subcomponents use `../img/` path
- Verify `img/` directory exists in merge output

---

## Related Scripts

| Script | Purpose |
|--------|---------|
| [responsive-merger.js](../scripts/responsive-merger.js) | Main orchestrator |
| [responsive-pipeline.js](../scripts/responsive-pipeline.js) | AST transform pipeline |
| [responsive-css-compiler.js](../scripts/responsive-css-compiler.js) | Compile responsive classes to CSS |
| [puck-generator.js](../scripts/puck-generator.js) | Generate Puck components |
| [generate-responsive-report.js](../scripts/reporting/generate-responsive-report.js) | Visual comparison report |
| [generate-responsive-analysis.js](../scripts/reporting/generate-responsive-analysis.js) | Technical analysis |

## Related Components

| Component | Purpose |
|-----------|---------|
| [MergeDialog.tsx](../src/components/features/responsive-merges/MergeDialog.tsx) | Merge creation UI |
| [ResponsiveMergesPage.tsx](../src/components/pages/ResponsiveMergesPage.tsx) | Merge list page |
| [ResponsiveMergeDetailPage.tsx](../src/components/pages/ResponsiveMergeDetailPage.tsx) | Merge detail view |
| [ResponsivePreviewPage.tsx](../src/components/pages/ResponsivePreviewPage.tsx) | Responsive preview |
| [PuckEditorPage.tsx](../src/components/pages/PuckEditorPage.tsx) | Puck editor |
| [PuckRenderPage.tsx](../src/components/pages/PuckRenderPage.tsx) | Puck render view |

---

## Next Steps

- **[Try Responsive Merge](http://localhost:5173/responsive-merges)** - Create your first merge
- **[Explore Puck Editor](http://localhost:5173/puck-editor)** - Visual customization
- **[Read Architecture Guide](ARCHITECTURE.md)** - Understand the full pipeline
- **[View API Reference](API.md)** - Integration endpoints

---

<div align="center">

**[⬆ Back to Top](#-responsive-merge---multi-screen-fusion)**

Made with ❤️ for responsive design

</div>
