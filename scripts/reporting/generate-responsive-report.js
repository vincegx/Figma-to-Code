#!/usr/bin/env node
/**
 * Generate Responsive Merge HTML Report
 * Generates a report in the same style as MCP test reports
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ═══════════════════════════════════════════════════════════════
// CLI ARGUMENTS
// ═══════════════════════════════════════════════════════════════

const mergeDir = process.argv[2]

if (!mergeDir) {
  console.error('Usage: node generate-responsive-report.js <merge-directory>')
  process.exit(1)
}

console.log('📊 Generating responsive merge HTML report...')
console.log(`   Merge directory: ${mergeDir}`)

// ═══════════════════════════════════════════════════════════════
// LOAD DATA
// ═══════════════════════════════════════════════════════════════

const mergeId = path.basename(mergeDir)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const TESTS_DIR = path.join(PROJECT_ROOT, 'src', 'generated', 'tests')

// Load responsive-metadata.json
let metadata = {}
try {
  metadata = JSON.parse(fs.readFileSync(path.join(mergeDir, 'responsive-metadata.json'), 'utf-8'))
} catch (e) {
  console.error('❌ responsive-metadata.json not found')
  process.exit(1)
}

// Load Page.css for color extraction
let pageCss = ''
try {
  pageCss = fs.readFileSync(path.join(mergeDir, 'Page.css'), 'utf-8')
} catch (e) {
  console.warn('⚠️  Page.css not found')
}

// ═══════════════════════════════════════════════════════════════
// ANALYZE DATA
// ═══════════════════════════════════════════════════════════════

console.log('🔍 Analyzing merge data...')

// Extract colors from CSS
const colorRegex = /#[0-9a-fA-F]{6}/g
const colorsFound = [...new Set((pageCss.match(colorRegex) || []).map(c => c.toLowerCase()))]

// Extract fonts from CSS
const fontFamilyRegex = /font-family:\s*['"]?([^'";}]+)['"]?/g
const fontsFound = []
let fontMatch
while ((fontMatch = fontFamilyRegex.exec(pageCss)) !== null) {
  fontsFound.push(fontMatch[1].trim())
}
const uniqueFonts = [...new Set(fontsFound)]

// Build component stats
const components = (metadata.components || []).map(compName => {
  const compStats = metadata.detailedStats?.components?.[compName] || {}
  return {
    name: compName,
    elementsMerged: compStats['merge-desktop-first']?.elementsMerged || 0,
    classesMerged: compStats['merge-desktop-first']?.totalClassesMerged || 0,
    conflicts: compStats['detect-class-conflicts']?.totalConflicts || 0
  }
})

// ═══════════════════════════════════════════════════════════════
// GENERATE HTML (Same style as MCP report)
// ═══════════════════════════════════════════════════════════════

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Responsive Merge Report - ${mergeId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- Initialize theme immediately to prevent FOUC -->
  <script>
    (function() {
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
    })();
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      /* Shadcn/ui Theme Variables (Light) */
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --primary: 221.2 83.2% 53.3%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --border: 214.3 31.8% 91.4%;
      --radius: 0.5rem;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    [data-theme="dark"] {
      /* Shadcn/ui Theme Variables (Dark) */
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --card: 222.2 84% 4.9%;
      --card-foreground: 210 40% 98%;
      --primary: 217.2 91.2% 59.8%;
      --primary-foreground: 222.2 47.4% 11.2%;
      --secondary: 217.2 32.6% 17.5%;
      --secondary-foreground: 210 40% 98%;
      --muted: 217.2 32.6% 17.5%;
      --muted-foreground: 215 20.2% 65.1%;
      --border: 217.2 32.6% 17.5%;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      line-height: 1.6;
      display: flex;
      min-height: 100vh;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    /* Sidebar */
    .sidebar {
      width: 240px;
      background: hsl(var(--card));
      border-right: 1px solid hsl(var(--border));
      padding: 24px 16px;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      flex-shrink: 0;
      transition: background-color 0.3s ease, border-color 0.3s ease;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .sidebar-title {
      font-size: 14px;
      font-weight: 700;
      color: hsl(var(--foreground));
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .theme-toggle {
      background: hsl(var(--secondary));
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: hsl(var(--muted));
      transform: scale(1.05);
    }

    .nav-link {
      display: block;
      padding: 10px 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      color: hsl(var(--muted-foreground));
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .nav-link:hover {
      background: hsl(var(--secondary));
      color: hsl(var(--foreground));
    }

    .nav-link.active {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }

    /* Main content */
    .main-content {
      flex: 1;
      padding: 48px;
      overflow-y: auto;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 40px;
    }

    .page-title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      color: hsl(var(--foreground));
    }

    .page-subtitle {
      font-size: 15px;
      color: hsl(var(--muted-foreground));
    }

    .section {
      margin-bottom: 64px;
    }

    .section-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 24px;
      color: hsl(var(--foreground));
    }

    /* Breakpoints Grid */
    .breakpoints-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }

    @media (max-width: 1024px) {
      .breakpoints-grid {
        grid-template-columns: 1fr;
      }
    }

    .breakpoint-card {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s;
    }

    .breakpoint-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-4px);
    }

    .breakpoint-header {
      padding: 16px;
      background: hsl(var(--muted));
      border-bottom: 1px solid hsl(var(--border));
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .breakpoint-name {
      font-size: 16px;
      font-weight: 600;
      color: hsl(var(--foreground));
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .breakpoint-badge {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    .breakpoint-screenshot {
      width: 100%;
      height: 300px;
      object-fit: cover;
      object-position: top;
      background: hsl(var(--muted));
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 48px;
    }

    .stat-card {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s;
    }

    .stat-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: hsl(var(--secondary));
      margin-bottom: 16px;
      font-size: 24px;
      transition: all 0.3s;
    }

    .stat-card:hover .stat-icon {
      transform: scale(1.1) rotate(5deg);
    }

    .stat-value {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, hsl(var(--primary)) 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
      line-height: 1;
    }

    .stat-label {
      font-size: 13px;
      color: hsl(var(--muted-foreground));
      font-weight: 500;
    }

    /* Colors */
    .color-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .color-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 8px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .color-chip:hover {
      border-color: hsl(var(--primary));
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .color-chip-preview {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid hsl(var(--border));
      flex-shrink: 0;
    }

    .color-chip-value {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
      font-weight: 500;
      color: hsl(var(--foreground));
      text-transform: uppercase;
    }

    /* Fonts */
    .fonts-list {
      display: grid;
      gap: 12px;
    }

    .font-item {
      padding: 16px;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 8px;
      font-size: 18px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .font-item:hover {
      border-color: hsl(var(--primary));
      box-shadow: var(--shadow-sm);
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 8px;
      overflow: hidden;
    }

    thead {
      background: hsl(var(--muted));
    }

    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: hsl(var(--foreground));
      border-bottom: 1px solid hsl(var(--border));
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid hsl(var(--border));
      font-size: 14px;
      color: hsl(var(--foreground));
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: hsl(var(--muted) / 0.5);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: var(--shadow-md);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s;
      pointer-events: none;
      font-size: 14px;
      font-weight: 500;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: all;
    }

    @media (max-width: 768px) {
      .sidebar {
        display: none;
      }

      .main-content {
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">Sections</div>
      <button class="theme-toggle" id="themeToggle" title="Toggle theme">🌙</button>
    </div>
    <nav>
      <a href="#overview" class="nav-link active">Overview</a>
      <a href="#breakpoints" class="nav-link">Breakpoints</a>
      <a href="#stats" class="nav-link">Statistics</a>
      <a href="#colors" class="nav-link">Colors</a>
      <a href="#fonts" class="nav-link">Fonts</a>
      <a href="#components" class="nav-link">Components</a>
    </nav>
  </div>

  <!-- Main Content -->
  <div class="main-content">
    <!-- Header -->
    <div class="page-header" id="overview">
      <h1 class="page-title">📱 Responsive Merge Report</h1>
      <p class="page-subtitle">${mergeId} • ${new Date(metadata.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>

    <!-- Breakpoints Comparison -->
    <section class="section" id="breakpoints">
      <h2 class="section-title">🖼️ Breakpoints Comparison</h2>
      <div class="breakpoints-grid">
        <div class="breakpoint-card">
          <div class="breakpoint-header">
            <div class="breakpoint-name">
              <span>🖥️</span>
              <span>Desktop</span>
            </div>
            <div class="breakpoint-badge">${metadata.breakpoints.desktop.width}px</div>
          </div>
          <img
            src="../../../tests/${metadata.breakpoints.desktop.testId}/img/figma-screenshot.png"
            alt="Desktop screenshot"
            class="breakpoint-screenshot"
            onerror="this.style.display='none'"
          />
        </div>

        <div class="breakpoint-card">
          <div class="breakpoint-header">
            <div class="breakpoint-name">
              <span>📱</span>
              <span>Tablet</span>
            </div>
            <div class="breakpoint-badge">${metadata.breakpoints.tablet.width}px</div>
          </div>
          <img
            src="../../../tests/${metadata.breakpoints.tablet.testId}/img/figma-screenshot.png"
            alt="Tablet screenshot"
            class="breakpoint-screenshot"
            onerror="this.style.display='none'"
          />
        </div>

        <div class="breakpoint-card">
          <div class="breakpoint-header">
            <div class="breakpoint-name">
              <span>📱</span>
              <span>Mobile</span>
            </div>
            <div class="breakpoint-badge">${metadata.breakpoints.mobile.width}px</div>
          </div>
          <img
            src="../../../tests/${metadata.breakpoints.mobile.testId}/img/figma-screenshot.png"
            alt="Mobile screenshot"
            class="breakpoint-screenshot"
            onerror="this.style.display='none'"
          />
        </div>
      </div>
    </section>

    <!-- Statistics -->
    <section class="section" id="stats">
      <h2 class="section-title">📊 Merge Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🧩</div>
          <div class="stat-value">${metadata.mergeStats?.totalComponents || 0}</div>
          <div class="stat-label">Components</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📐</div>
          <div class="stat-value">${metadata.transformations?.totalElementsProcessed || 0}</div>
          <div class="stat-label">Elements Processed</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎨</div>
          <div class="stat-value">${metadata.transformations?.totalClassesMerged || 0}</div>
          <div class="stat-label">Classes Merged</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">${metadata.transformations?.conflicts?.totalConflicts || 0}</div>
          <div class="stat-label">Conflicts Resolved</div>
        </div>
      </div>
    </section>

    ${colorsFound.length > 0 ? `
    <!-- Colors -->
    <section class="section" id="colors">
      <h2 class="section-title">🎨 Color Palette</h2>
      <div class="color-chips">
        ${colorsFound.map(color => `
          <div class="color-chip" onclick="copyToClipboard('${color}')">
            <div class="color-chip-preview" style="background-color: ${color};"></div>
            <div class="color-chip-value">${color}</div>
          </div>
        `).join('')}
      </div>
    </section>
    ` : ''}

    ${uniqueFonts.length > 0 ? `
    <!-- Fonts -->
    <section class="section" id="fonts">
      <h2 class="section-title">🔤 Typography</h2>
      <div class="fonts-list">
        ${uniqueFonts.map(font => `
          <div class="font-item" style="font-family: ${font};">${font}</div>
        `).join('')}
      </div>
    </section>
    ` : ''}

    <!-- Components -->
    <section class="section" id="components">
      <h2 class="section-title">🧩 Components</h2>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Elements Merged</th>
            <th>Classes Merged</th>
            <th>Conflicts</th>
          </tr>
        </thead>
        <tbody>
          ${components.map(comp => `
            <tr>
              <td><strong>${comp.name}</strong></td>
              <td>${comp.elementsMerged}</td>
              <td>${comp.classesMerged}</td>
              <td>${comp.conflicts}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  </div>

  <!-- Toast -->
  <div id="toast" class="toast">✓ Copied to clipboard!</div>

  <script>
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    themeToggle.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

    // Set initial theme icon
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        navLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Copy to clipboard
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast();
      });
    }

    function showToast() {
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  </script>
</body>
</html>`

// ═══════════════════════════════════════════════════════════════
// WRITE HTML FILE
// ═══════════════════════════════════════════════════════════════

const outputPath = path.join(mergeDir, 'report.html')
fs.writeFileSync(outputPath, htmlContent, 'utf-8')

console.log(`✅ Report generated: ${outputPath}`)
console.log(`   📊 ${metadata.mergeStats?.totalComponents || 0} components merged`)
console.log(`   🎨 ${colorsFound.length} colors found`)
console.log(`   🔤 ${uniqueFonts.length} fonts used`)
