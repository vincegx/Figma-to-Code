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
            // Tester si le port 3845 est accessible
            const response = await fetch('http://127.0.0.1:3845/mcp')
            // Si on reçoit une réponse (même 400), le serveur est up
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'connected', mcpStatus: response.status }))
          } catch (error) {
            // Si erreur réseau, le serveur MCP n'est pas accessible
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'disconnected', error: error.message }))
          }
        })
      }
    }
  ]
})
