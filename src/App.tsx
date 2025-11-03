import React, { useState, useEffect } from 'react'
import './App.css'
import HomePage from './components/HomePage'
import TestDetail from './components/TestDetail'

type View = 'home' | 'detail' | 'preview'

function App() {
  const [currentView, setCurrentView] = useState<View>('home')
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  // Check URL params for preview mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const previewMode = params.get('preview')
    const testId = params.get('test')

    if (previewMode === 'true' && testId) {
      setSelectedTestId(testId)
      setCurrentView('preview')
    }
  }, [])

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId)
    setCurrentView('detail')
  }

  const handleBack = () => {
    setSelectedTestId(null)
    setCurrentView('home')
  }

  // Preview mode: just render the component without dashboard UI
  if (currentView === 'preview' && selectedTestId) {
    return <PreviewMode testId={selectedTestId} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'home' && (
        <HomePage onSelectTest={handleSelectTest} />
      )}

      {currentView === 'detail' && selectedTestId && (
        <TestDetail testId={selectedTestId} onBack={handleBack} />
      )}
    </div>
  )
}

// Preview mode component - renders ONLY the generated component
function PreviewMode({ testId }: { testId: string }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    // Dynamically import the generated component
    import(`./generated/tests/${testId}/Component-fixed.tsx`)
      .then((module) => {
        setComponent(() => module.default)
      })
      .catch((err) => {
        console.error('Failed to load component:', err)
      })
  }, [testId])

  if (!Component) {
    return <div>Loading...</div>
  }

  return <Component />
}

export default App
