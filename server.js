/**
 * Backend API Server
 * Gère l'exécution des analyses Figma et stream les logs en temps réel
 */

import express from 'express'
import { spawn } from 'child_process'
import { createServer as createViteServer } from 'vite'
import { createServer as createHttpServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5173

// Middleware
app.use(express.json())

// Store active analysis jobs
const activeJobs = new Map()

/**
 * POST /api/analyze
 * Lance une analyse Figma
 */
app.post('/api/analyze', async (req, res) => {
  const { figmaUrl } = req.body

  if (!figmaUrl) {
    return res.status(400).json({ error: 'URL Figma requise' })
  }

  // Validate Figma URL format
  if (!figmaUrl.includes('figma.com')) {
    return res.status(400).json({ error: 'URL Figma invalide' })
  }

  // Generate unique job ID
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Create job metadata
  const job = {
    id: jobId,
    url: figmaUrl,
    status: 'running',
    startTime: Date.now(),
    logs: [],
    clients: []
  }

  activeJobs.set(jobId, job)

  // Start the analysis process
  const cliPath = path.join(__dirname, 'scripts', 'figma-cli.js')
  const child = spawn('node', [cliPath, figmaUrl], {
    cwd: __dirname,
    env: {
      ...process.env,
      FORCE_COLOR: '1' // Keep ANSI colors for react-lazylog
    }
  })

  job.process = child

  // Capture stdout
  child.stdout.on('data', (data) => {
    const log = data.toString()
    job.logs.push(log)

    // Broadcast to all connected clients
    job.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`)
    })
  })

  // Capture stderr
  child.stderr.on('data', (data) => {
    const log = data.toString()
    job.logs.push(log)

    // Broadcast to all connected clients
    job.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`)
    })
  })

  // Handle process exit
  child.on('close', (code) => {
    job.status = code === 0 ? 'completed' : 'failed'
    job.endTime = Date.now()
    job.exitCode = code

    const finalMessage = code === 0
      ? '\n✓ Analyse terminée avec succès\n'
      : `\n✗ Analyse échouée (code: ${code})\n`

    job.logs.push(finalMessage)

    // Broadcast completion to all clients
    job.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'done', message: finalMessage, success: code === 0 })}\n\n`)
    })

    // Don't close connections, let clients handle it
  })

  // Handle process errors
  child.on('error', (error) => {
    job.status = 'failed'
    job.error = error.message
    job.endTime = Date.now()

    const errorMessage = `\n✗ Erreur: ${error.message}\n`
    job.logs.push(errorMessage)

    // Broadcast error to all clients
    job.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`)
    })
  })

  res.json({
    jobId,
    status: 'started',
    message: 'Analyse lancée avec succès'
  })
})

/**
 * GET /api/analyze/logs/:jobId
 * Stream les logs d'une analyse via Server-Sent Events (SSE)
 */
app.get('/api/analyze/logs/:jobId', (req, res) => {
  const { jobId } = req.params
  const job = activeJobs.get(jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job non trouvé' })
  }

  // Configure SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send existing logs
  job.logs.forEach(log => {
    res.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`)
  })

  // Add client to broadcast list
  job.clients.push(res)

  // Send initial status if job already completed
  if (job.status === 'completed') {
    res.write(`data: ${JSON.stringify({ type: 'done', success: true })}\n\n`)
  } else if (job.status === 'failed') {
    res.write(`data: ${JSON.stringify({ type: 'done', success: false })}\n\n`)
  }

  // Handle client disconnect
  req.on('close', () => {
    const index = job.clients.indexOf(res)
    if (index !== -1) {
      job.clients.splice(index, 1)
    }

    // Clean up job if no clients and completed
    if (job.clients.length === 0 && (job.status === 'completed' || job.status === 'failed')) {
      setTimeout(() => {
        activeJobs.delete(jobId)
      }, 60000) // Keep for 1 minute after last client disconnects
    }
  })
})

/**
 * GET /api/analyze/status/:jobId
 * Récupère le statut d'une analyse
 */
app.get('/api/analyze/status/:jobId', (req, res) => {
  const { jobId } = req.params
  const job = activeJobs.get(jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job non trouvé' })
  }

  res.json({
    jobId: job.id,
    status: job.status,
    url: job.url,
    startTime: job.startTime,
    endTime: job.endTime,
    exitCode: job.exitCode,
    logsCount: job.logs.length
  })
})

/**
 * DELETE /api/tests/:testId
 * Supprime un test et son dossier
 */
app.delete('/api/tests/:testId', async (req, res) => {
  const { testId } = req.params

  if (!testId || !testId.startsWith('node-')) {
    return res.status(400).json({ error: 'Test ID invalide' })
  }

  try {
    const { rm } = await import('fs/promises')
    const testPath = path.join(__dirname, 'src', 'generated', 'tests', testId)

    // Supprimer le dossier et tout son contenu
    await rm(testPath, { recursive: true, force: true })

    res.json({
      success: true,
      message: 'Test supprimé avec succès',
      testId
    })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    res.status(500).json({
      error: 'Erreur lors de la suppression du test',
      message: error.message
    })
  }
})

/**
 * GET /api/mcp/health
 * Vérifie la connexion au serveur MCP
 */
app.get('/api/mcp/health', async (req, res) => {
  try {
    // Try to connect to MCP server
    const mcpHost = process.env.MCP_HOST || 'host.docker.internal'
    const mcpPort = process.env.MCP_SERVER_PORT || 3845

    // Simple TCP connection test
    const net = await import('net')
    const socket = new net.Socket()

    socket.setTimeout(2000)

    socket.connect(mcpPort, mcpHost, () => {
      socket.destroy()
      res.json({ status: 'connected', message: 'MCP server is reachable' })
    })

    socket.on('error', () => {
      socket.destroy()
      res.status(503).json({ status: 'disconnected', message: 'MCP server is not reachable' })
    })

    socket.on('timeout', () => {
      socket.destroy()
      res.status(503).json({ status: 'disconnected', message: 'MCP server timeout' })
    })
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message })
  }
})

/**
 * Start Vite dev server and API server
 */
async function startServer() {
  try {
    // IMPORTANT: Create HTTP server FIRST
    const httpServer = createHttpServer(app)

    // Create Vite server in middleware mode
    // Pass httpServer to HMR config for WebSocket support
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer  // FIX: Pass HTTP server for WebSocket
        }
      },
      appType: 'spa'
    })

    // Use Vite's middleware AFTER API routes
    app.use(vite.middlewares)

    // Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
      console.log(`📡 API endpoints available:`)
      console.log(`   POST /api/analyze`)
      console.log(`   GET  /api/analyze/logs/:jobId`)
      console.log(`   GET  /api/analyze/status/:jobId`)
      console.log(`   GET  /api/mcp/health`)
      console.log(`\n💡 Open http://localhost:${PORT} in your browser`)
    })

    // Handle server shutdown gracefully
    process.on('SIGTERM', () => {
      console.log('\n👋 SIGTERM received, closing server...')
      httpServer.close(() => {
        console.log('✓ Server closed')
        process.exit(0)
      })
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
