import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mcp-health-check',
      configureServer(server) {
        server.middlewares.use('/api/mcp/health', async (_req, res) => {
          try {
            // Tester si le port 3845 est accessible (host.docker.internal pour accéder au Mac depuis Docker)
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 3000)

            const response = await fetch('http://host.docker.internal:3845/mcp', {
              signal: controller.signal
            })

            clearTimeout(timeout)

            // Si on reçoit une réponse (même 400), le serveur est up
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'connected', mcpStatus: response.status }))
          } catch (error) {
            // Si erreur réseau, le serveur MCP n'est pas accessible
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'disconnected', error: error.message, code: error.code }))
          }
        })
      }
    }
  ]
})
