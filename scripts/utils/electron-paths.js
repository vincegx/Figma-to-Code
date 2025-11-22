/**
 * Electron-specific path utilities
 *
 * Handles different paths for exports depending on environment:
 * - Docker: ./src/generated/export_figma/
 * - Electron: ~/Documents/MCP Figma Exports/
 */

import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Get the base directory for Figma exports
 * @returns {string} Absolute path to exports directory
 */
export function getExportsPath() {
  const isElectron = process.env.ELECTRON_MODE === 'true'

  if (isElectron) {
    // Electron: Use user's Documents folder
    const documentsPath = path.join(os.homedir(), 'Documents')
    const exportsPath = path.join(documentsPath, 'MCP Figma Exports')

    // Create directory if it doesn't exist
    if (!fs.existsSync(exportsPath)) {
      fs.mkdirSync(exportsPath, { recursive: true })
      console.log(`📂 Created exports directory: ${exportsPath}`)
    }

    return exportsPath
  } else {
    // Docker: Use project directory
    const projectRoot = path.join(__dirname, '..', '..')
    return path.join(projectRoot, 'src', 'generated', 'export_figma')
  }
}

/**
 * Get the base directory for responsive screens
 * @returns {string} Absolute path to responsive screens directory
 */
export function getResponsiveScreensPath() {
  const isElectron = process.env.ELECTRON_MODE === 'true'

  if (isElectron) {
    // Electron: Use user's Documents folder
    const documentsPath = path.join(os.homedir(), 'Documents')
    const responsivePath = path.join(documentsPath, 'MCP Figma Exports', 'responsive-screens')

    // Create directory if it doesn't exist
    if (!fs.existsSync(responsivePath)) {
      fs.mkdirSync(responsivePath, { recursive: true })
      console.log(`📂 Created responsive screens directory: ${responsivePath}`)
    }

    return responsivePath
  } else {
    // Docker: Use project directory
    const projectRoot = path.join(__dirname, '..', '..')
    return path.join(projectRoot, 'src', 'generated', 'responsive-screens')
  }
}

/**
 * Get path to a specific export by ID
 * @param {string} exportId - Export ID (e.g., "node-123-timestamp")
 * @returns {string} Absolute path to the export directory
 */
export function getExportPath(exportId) {
  return path.join(getExportsPath(), exportId)
}

/**
 * Check if running in Electron mode
 * @returns {boolean}
 */
export function isElectronMode() {
  return process.env.ELECTRON_MODE === 'true'
}
