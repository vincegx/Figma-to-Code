import { app, BrowserWindow, Menu, shell, dialog } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let serverProcess

/**
 * Starts the Express server from the parent directory
 */
function startServer() {
  console.log('🚀 Starting Express server...')

  // Detect if we're in a packaged app
  const isPackaged = app.isPackaged
  const nodeEnv = isPackaged ? 'production' : (process.env.NODE_ENV || 'development')

  // Use bundle in production, original server in dev
  // In packaged app, server-bundle.cjs is extracted to app.asar.unpacked
  const serverPath = isPackaged
    ? path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'server-bundle.cjs')
    : path.join(__dirname, '..', 'server.js')

  console.log(`📦 App packaged: ${isPackaged}`)
  console.log(`🔧 NODE_ENV: ${nodeEnv}`)
  console.log(`📄 Server: ${path.basename(serverPath)}`)

  // Set correct working directory (app.asar.unpacked in production)
  const cwd = isPackaged
    ? path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), '..')
    : path.join(__dirname, '..')

  serverProcess = spawn('node', [serverPath], {
    cwd,
    env: {
      ...process.env,
      ELECTRON_MODE: 'true',
      NODE_ENV: nodeEnv
    },
    stdio: ['inherit', 'pipe', 'pipe']
  })

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`)
  })

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`)
  })

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`)
  })
}

/**
 * Creates the main application window
 */
function createWindow() {
  console.log('🪟 Creating main window...')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'MCP Figma to Code',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    backgroundColor: '#ffffff',
    show: false // Don't show until ready
  })

  // Always load from Express server (which serves static files from dist/)
  // The server is started before window creation and runs on port 5173
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173'

  console.log(`📡 Loading URL: ${startUrl}`)
  console.log(`🔧 Mode: ${process.env.NODE_ENV || 'production'}`)

  mainWindow.loadURL(startUrl)

  // Show window when ready to avoid flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    console.log('✅ Application ready')
  })

  // Open DevTools automatically (can be toggled via menu)
  mainWindow.webContents.openDevTools()

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Creates the application menu
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Analyze Figma URL',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/analyze')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/your-repo/docs')
          }
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About MCP Figma to Code',
              message: 'MCP Figma to Code v1.0.0',
              detail: 'Transform Figma designs into pixel-perfect React + Tailwind components'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Application ready event
 */
app.whenReady().then(() => {
  console.log('🎯 Electron app ready')

  // Start Express server
  startServer()

  // Wait for server to be ready (2 seconds should be enough)
  setTimeout(() => {
    createWindow()
    createMenu()
  }, 2000)

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

/**
 * Quit when all windows are closed
 */
app.on('window-all-closed', () => {
  // Kill server process
  if (serverProcess) {
    console.log('🛑 Stopping server...')
    serverProcess.kill()
  }

  // On macOS, keep app running unless explicitly quit
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * Before quit - cleanup
 */
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})
