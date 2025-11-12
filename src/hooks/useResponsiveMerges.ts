/**
 * useResponsiveMerges - Hook to load and manage responsive merge data
 * Pattern adapted from useExportFigma.ts
 */

import { useState, useEffect } from 'react'

export interface ResponsiveMerge {
  mergeId: string
  timestamp: string | number
  type: 'responsive-merge'
  breakpoints: {
    desktop: {
      testId: string
      screenSize: string
      width: number
    }
    tablet: {
      testId: string
      screenSize: string
      width: number
    }
    mobile: {
      testId: string
      screenSize: string
      width: number
    }
  }
  mediaQueries: {
    tablet: string
    mobile: string
  }
  components: string[]
  mainFile: string
  mergeStats: {
    successCount: number
    errorCount: number
    totalComponents: number
  }
}

export function useResponsiveMerges() {
  const [merges, setMerges] = useState<ResponsiveMerge[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadMerges = async () => {
    try {
      // Load merges via API to avoid HMR reload
      const response = await fetch('/api/responsive-merges')

      if (!response.ok) {
        throw new Error('Failed to fetch responsive merges')
      }

      const loadedMerges = await response.json()
      setMerges(loadedMerges)
      setLoading(false)
    } catch (error) {
      console.error('Error loading responsive merges:', error)
      setMerges([])
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMerges()
  }, [])

  return {
    merges,
    loading,
    reload: loadMerges
  }
}
