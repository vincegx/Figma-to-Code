/**
 * AnalysisForm - Formulaire pour lancer une nouvelle analyse Figma
 * Affiche les logs en temps réel avec react-lazylog
 */

import { useState, useEffect, useRef } from 'react'
import { LazyLog } from 'react-lazylog'

interface AnalysisFormProps {
  onAnalysisComplete?: () => void
}

export default function AnalysisForm({ onAnalysisComplete }: AnalysisFormProps) {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Validation de l'URL Figma
  const validateFigmaUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Veuillez saisir une URL Figma'
    }

    // Vérifier que c'est une URL Figma
    if (!url.includes('figma.com')) {
      return 'L\'URL doit contenir "figma.com"'
    }

    // Vérifier que c'est une URL de design
    if (!url.includes('figma.com/design/')) {
      return 'L\'URL doit être au format : https://www.figma.com/design/...'
    }

    // Vérifier la présence du paramètre node-id
    if (!url.includes('node-id=')) {
      return 'L\'URL doit contenir le paramètre "node-id=" (ex: ?node-id=168-14226)'
    }

    // Vérifier le format du node-id (nombre-nombre ou nombre:nombre)
    const nodeIdMatch = url.match(/node-id=([0-9]+[-:][0-9]+)/)
    if (!nodeIdMatch) {
      return 'Le paramètre node-id doit être au format "123-456" ou "123:456"'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Valider l'URL
    const error = validateFigmaUrl(figmaUrl)
    if (error) {
      setUrlError(error)
      return
    }

    setUrlError(null)

    setIsAnalyzing(true)
    setIsComplete(false)
    setLogs('🚀 Lancement de l\'analyse...\n\n')

    try {
      // Start analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figmaUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du lancement de l\'analyse')
      }

      // Connect to SSE stream for logs
      const newJobId = data.jobId
      setJobId(newJobId)

      const eventSource = new EventSource(`/api/analyze/logs/${newJobId}`)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data)

        if (message.type === 'log') {
          setLogs((prev) => prev + message.message)
        } else if (message.type === 'done') {
          setIsComplete(true)
          setIsSuccess(message.success)
          setIsAnalyzing(false)
          eventSource.close()

          // Reload page to show new test with fresh images
          if (message.success) {
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          }
        } else if (message.type === 'error') {
          setLogs((prev) => prev + message.message)
          setIsComplete(true)
          setIsSuccess(false)
          setIsAnalyzing(false)
          eventSource.close()
        }
      }

      eventSource.onerror = () => {
        setLogs((prev) => prev + '\n✗ Erreur de connexion au serveur\n')
        setIsComplete(true)
        setIsSuccess(false)
        setIsAnalyzing(false)
        eventSource.close()
      }
    } catch (error: any) {
      setLogs((prev) => prev + `\n✗ Erreur: ${error.message}\n`)
      setIsComplete(true)
      setIsSuccess(false)
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setJobId(null)
    setLogs('')
    setIsAnalyzing(false)
    setIsComplete(false)
    setIsSuccess(false)
    setFigmaUrl('')
    setUrlError(null)
  }

  // Réinitialiser l'erreur quand l'utilisateur modifie l'URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFigmaUrl(e.target.value)
    if (urlError) {
      setUrlError(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        🚀 Nouvel export Figma
      </h2>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <input
              type="text"
              value={figmaUrl}
              onChange={handleUrlChange}
              placeholder="https://www.figma.com/design/...?node-id=X-Y"
              disabled={isAnalyzing}
              className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${
                urlError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-purple-500'
              }`}
            />
            <button
              type="submit"
              disabled={isAnalyzing || !figmaUrl.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  En cours...
                </>
              ) : (
                <>
                  <span>Lancer l'export</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {urlError && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{urlError}</p>
            </div>
          )}
        </div>
      </form>

      {/* Terminal Logs */}
      {jobId && (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          {/* Terminal Header */}
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-sm font-mono text-gray-300">
                {isAnalyzing && (
                  <span className="text-green-400">● En cours...</span>
                )}
                {isComplete && isSuccess && (
                  <span className="text-green-400">✓ Terminé avec succès</span>
                )}
                {isComplete && !isSuccess && (
                  <span className="text-red-400">✗ Échec</span>
                )}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-white transition-colors"
              title="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Logs Display with react-lazylog */}
          <div className="bg-black">
            <LazyLog
              text={logs}
              height={320}
              follow={true}
              selectableLines={true}
              enableSearch={true}
              caseInsensitive={true}
              extraLines={1}
              stream={isAnalyzing}
              style={{
                backgroundColor: '#000000',
                color: '#e5e7eb',
                fontSize: '13px',
                fontFamily: '"Fira Code", "Courier New", monospace',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Footer Actions */}
          {isComplete && (
            <div className="bg-gray-800 px-4 py-3 border-t border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {isSuccess
                  ? 'Le nouveau test va apparaître dans la liste'
                  : 'Vérifiez les logs ci-dessus pour plus de détails'}
              </span>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors"
              >
                Nouvel export
              </button>
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      {!jobId && (
        <p className="text-sm text-gray-500 mt-3">
          💡 Collez l'URL complète de votre design Figma avec le paramètre <code className="bg-gray-100 px-1 rounded">node-id</code>
        </p>
      )}
    </div>
  )
}
