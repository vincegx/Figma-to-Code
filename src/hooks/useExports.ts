/**
 * useExports - Hook to load and manage export data
 * Extracted from HomePage.tsx for reusability
 */

import { useState, useEffect } from 'react'

export interface ExportFigma {
  exportId: string
  fileName?: string
  layerName?: string
  timestamp: string | number
  nodeId: string
  stats?: {
    totalNodes?: number
    sectionsDetected?: number
    imagesOrganized?: number
    totalFixes?: number
    fontsConverted?: number
    enhancedWeights?: number
    fontsDetected?: number
    executionTime?: number
    classesFixed?: number
    overflowAdded?: boolean
    textSizesConverted?: number
    widthsAdded?: number
    nodesAnalyzed?: number
    wrappersFlattened?: number
    compositesInlined?: number
    groupsConsolidated?: number
    svgsConsolidated?: number
    gradientsFixed?: number
    shapesFixed?: number
    blendModesVerified?: number
    shadowsFixed?: number
    spreadAdded?: number
    invisibleShadowsRemoved?: number
    textTransformAdded?: number
    varsConverted?: number
    customClassesGenerated?: number
    classesOptimized?: number
    dataAttrsRemoved?: number
    inlineStylesExtracted?: number
    arbitraryClassesConverted?: number
    fontClassesGenerated?: number
    cleanClassesGenerated?: number
  }
}

export function useExports() {
  const [exports, setExports] = useState<ExportFigma[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadExports = async () => {
    try {
      // Load exports via API instead of import.meta.glob to avoid HMR reload
      const response = await fetch('/api/export_figma')

      if (!response.ok) {
        throw new Error('Failed to fetch exports')
      }

      const loadedExports = await response.json()
      setExports(loadedExports)
      setLoading(false)
    } catch (error) {
      console.error('Error loading exports:', error)
      setExports([])
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExports()
  }, [])

  return {
    exports,
    loading,
    reload: loadExports
  }
}
