const { contextBridge, ipcRenderer } = require('electron')

/**
 * Preload script for Electron
 * Exposes safe APIs to the renderer process via contextBridge
 *
 * NOTE: Electron preload scripts MUST use CommonJS (require), not ES modules (import)
 * See: https://github.com/electron/electron/issues/21457
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  version: process.versions.electron,
  nodeVersion: process.versions.node,
  chromiumVersion: process.versions.chrome,

  // Environment check
  isElectron: true,

  // Navigation (if needed)
  onNavigate: (callback) => {
    ipcRenderer.on('navigate-to', (event, path) => callback(path))
  }
})

// Log that preload has loaded
console.log('🔧 Preload script loaded successfully')
console.log('📦 Electron version:', process.versions.electron)
console.log('🖥️  Platform:', process.platform)
