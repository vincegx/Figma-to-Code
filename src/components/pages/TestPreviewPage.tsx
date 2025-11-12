import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

/**
 * TestPreviewPage - Renders only the generated component without layout
 * Used as iframe content in PreviewMode
 */
export default function TestPreviewPage() {
  const { testId } = useParams<{ testId: string }>()
  const [searchParams] = useSearchParams()
  const version = searchParams.get('version') === 'fixed' ? 'fixed' : 'clean'

  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!testId) {
      setError('Test ID is required')
      setLoading(false)
      return
    }

    loadComponent()
  }, [testId, version])

  async function loadComponent() {
    try {
      setLoading(true)
      setError(null)

      // Load CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/src/generated/tests/${testId}/Component-${version}.css`
      link.id = `test-css-${testId}`
      document.head.appendChild(link)

      // Dynamically import the generated component
      const module = await import(`../../generated/tests/${testId}/Component-${version}.tsx`)
      setComponent(() => module.default)
      setLoading(false)

      // Cleanup function
      return () => {
        const existingLink = document.getElementById(`test-css-${testId}`)
        if (existingLink) {
          document.head.removeChild(existingLink)
        }
      }
    } catch (err) {
      console.error('Failed to load component:', err)
      setError(err instanceof Error ? err.message : 'Failed to load component')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading component...</p>
        </div>
      </div>
    )
  }

  if (error || !Component) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h3 className="mb-2 text-xl font-semibold">Error loading component</h3>
          <p className="text-muted-foreground">{error || 'Component not found'}</p>
        </div>
      </div>
    )
  }

  return <Component />
}
