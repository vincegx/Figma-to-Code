import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

/**
 * ResponsivePreviewPage - Renders only the generated responsive Page component without layout
 * Used as iframe content in Responsive Preview modes
 */
export default function ResponsivePreviewPage() {
  const { mergeId } = useParams<{ mergeId: string }>()

  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mergeId) {
      setError('Merge ID is required')
      setLoading(false)
      return
    }

    loadComponent()
  }, [mergeId])

  async function loadComponent() {
    try {
      setLoading(true)
      setError(null)

      // Load CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/src/generated/responsive-screens/${mergeId}/Page.css`
      link.id = `responsive-css-${mergeId}`
      document.head.appendChild(link)

      // Dynamically import the generated Page component
      const module = await import(`../../generated/responsive-screens/${mergeId}/Page.tsx`)
      setComponent(() => module.default)
      setLoading(false)

      // Cleanup function
      return () => {
        const existingLink = document.getElementById(`responsive-css-${mergeId}`)
        if (existingLink) {
          document.head.removeChild(existingLink)
        }
      }
    } catch (err) {
      console.error('Failed to load responsive component:', err)
      setError(err instanceof Error ? err.message : 'Failed to load component')
      setLoading(false)
    }
  }

  // Auto-resize iframe based on content height
  useEffect(() => {
    if (!Component) return

    const sendHeight = () => {
      const height = document.body.scrollHeight
      window.parent.postMessage({ type: 'iframe-resize', height }, '*')
    }

    // Send height after render
    const timer = setTimeout(sendHeight, 100)

    // Observe changes (images loading, dynamic content)
    const observer = new ResizeObserver(sendHeight)
    observer.observe(document.body)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [Component])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading responsive component...</p>
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
