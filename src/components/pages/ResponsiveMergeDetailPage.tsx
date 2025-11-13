/**
 * ResponsiveMergeDetailPage - Vue détaillée d'un merge responsive
 *
 * 4 onglets :
 * 1. Preview - iframe vers Puck preview (rendu responsive)
 * 2. Report - Rapport HTML de comparaison des 3 breakpoints
 * 3. Code - Code source des composants mergés
 * 4. Technical - Analyse technique du merge
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n/I18nContext'
import { useSidebar } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailPageHero, HeroBadge, HeroAction, HeroStat } from '../common/DetailPageHero'
import { CodeFile } from '../common/CodeViewer'
import { ReportViewer } from '../common/ReportViewer'
import { TechnicalAnalysisViewer } from '../common/TechnicalAnalysisViewer'
import { ResponsiveViewportControls } from '../common/ResponsiveViewportControls'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Eye,
  Download,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Package,
  Layers,
  Code as CodeIcon,
  AlertTriangle
} from 'lucide-react'

type Tab = 'preview' | 'report' | 'code' | 'technical'

interface ResponsiveMetadata {
  timestamp: string
  mergeId: string
  breakpoints: {
    desktop: {
      testId: string
      screenSize: string
      width: number
      height: number
    }
    tablet: {
      testId: string
      screenSize: string
      width: number
      height: number
    }
    mobile: {
      testId: string
      screenSize: string
      width: number
      height: number
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
  transformations: {
    totalElementsProcessed: number
    totalClassesMerged: number
    conflicts: {
      elementsWithConflicts: number
      totalConflicts: number
    }
  }
}

export default function ResponsiveMergeDetailPage() {
  const { mergeId } = useParams<{ mergeId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setOpen } = useSidebar()
  const [activeTab, setActiveTab] = useState<Tab>('preview')
  const [metadata, setMetadata] = useState<ResponsiveMetadata | null>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Auto-collapse sidebar on mount
  useEffect(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (mergeId) {
      loadMergeData()
    }
  }, [mergeId])

  const loadMergeData = async () => {
    try {
      setLoading(true)

      // Load merge data via API
      const response = await fetch(`/api/responsive-merges/${mergeId}/data`)

      if (!response.ok) {
        throw new Error('Failed to fetch merge data')
      }

      const data = await response.json()

      setMetadata(data.metadata || {})
      setAnalysis(data.analysis || '')

      setLoading(false)
    } catch (err) {
      console.error('Error loading merge:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">{t('detail.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            {t('detail.error.title')}
          </h3>
          <p className="mb-6 text-muted-foreground">{error || 'Merge not found'}</p>
          <Button onClick={() => navigate('/responsive-merges')}>
            {t('detail.error.back')}
          </Button>
        </div>
      </div>
    )
  }

  // Prepare badges (seulement le mergeId)
  const badges: HeroBadge[] = [
    { label: mergeId || 'unknown', variant: 'outline' }
  ]

  // Prepare actions
  const actions: HeroAction[] = [
    {
      label: 'Preview',
      href: `/preview?responsive=${mergeId}`,
      icon: Eye,
      variant: 'default'
    },
    {
      label: 'Download',
      href: `/api/responsive-merges/${mergeId}/download`,
      icon: Download,
      variant: 'outline',
      download: `${mergeId}.zip`,
      className: 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
    },
    {
      label: 'Source Tests',
      icon: ExternalLink,
      variant: 'secondary',
      className: 'bg-foreground/90 text-background hover:bg-foreground font-semibold',
      dropdownItems: [
        {
          label: `Desktop (${metadata.breakpoints.desktop.testId})`,
          href: `/export_figma/${metadata.breakpoints.desktop.testId}`,
          icon: Monitor,
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        {
          label: `Tablet (${metadata.breakpoints.tablet.testId})`,
          href: `/export_figma/${metadata.breakpoints.tablet.testId}`,
          icon: Tablet,
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        {
          label: `Mobile (${metadata.breakpoints.mobile.testId})`,
          href: `/export_figma/${metadata.breakpoints.mobile.testId}`,
          icon: Smartphone,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      ]
    }
  ]

  // Prepare stats
  const stats: HeroStat[] = [
    {
      label: 'Components',
      value: metadata.mergeStats.totalComponents,
      icon: Package,
      visible: true
    },
    {
      label: 'Elements',
      value: metadata.transformations.totalElementsProcessed,
      icon: Layers,
      visible: true
    },
    {
      label: 'Classes',
      value: metadata.transformations.totalClassesMerged,
      icon: CodeIcon,
      visible: true
    },
    {
      label: 'Conflicts',
      value: metadata.transformations.conflicts.totalConflicts,
      icon: AlertTriangle,
      visible: metadata.transformations.conflicts.totalConflicts > 0
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section using shared component */}
      <DetailPageHero
        title="Responsive Merge"
        badges={badges}
        timestamp={metadata.timestamp}
        actions={actions}
        stats={stats}
        additionalMetadata={
          /* Breakpoints info - en dessous de la date */
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              Desktop: {metadata.breakpoints.desktop.width}px
            </Badge>
            <Badge variant="outline" className="font-mono text-xs flex items-center gap-1">
              <Tablet className="h-3 w-3" />
              Tablet: {metadata.breakpoints.tablet.width}px
            </Badge>
            <Badge variant="outline" className="font-mono text-xs flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Mobile: {metadata.breakpoints.mobile.width}px
            </Badge>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as Tab)} className="w-full max-w-full">
        <div className="bg-card px-6 py-4 max-w-full">
          <TabsList>
            <TabsTrigger value="preview">
              {t('detail.tabs.preview')}
            </TabsTrigger>
            <TabsTrigger value="report">
              {t('detail.tabs.report')}
            </TabsTrigger>
            <TabsTrigger value="code">
              {t('detail.tabs.code')}
            </TabsTrigger>
            <TabsTrigger value="technical">
              {t('detail.tabs.technical')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <main className={activeTab === 'preview' ? 'w-full max-w-full' : 'w-full max-w-full px-6 py-8'}>
          <TabsContent value="preview" className="mt-0 max-w-full">
            <PreviewTab mergeId={mergeId!} />
          </TabsContent>

          <TabsContent value="report" className="mt-0 max-w-full">
            <ReportViewer
              reportPath={`/src/generated/responsive-screens/${mergeId}/report.html`}
            />
          </TabsContent>

          <TabsContent value="code" className="mt-0 max-w-full">
            <CodeTab mergeId={mergeId!} components={metadata.components} />
          </TabsContent>

          <TabsContent value="technical" className="mt-0 max-w-full">
            <TechnicalAnalysisViewer analysis={analysis} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  )
}

/**
 * TAB 1: Preview - iframe vers Puck preview avec contrôles responsive
 */
interface PreviewTabProps {
  mergeId: string
}

function PreviewTab({ mergeId }: PreviewTabProps) {
  const { t } = useTranslation()
  const [viewportWidth, setViewportWidth] = useState<number>(1440)
  const [iframeHeight, setIframeHeight] = useState<number>(800)
  const [metadata, setMetadata] = useState<ResponsiveMetadata | null>(null)

  useEffect(() => {
    // Load metadata to get breakpoint dimensions
    fetch(`/src/generated/responsive-screens/${mergeId}/responsive-metadata.json`)
      .then(res => res.json())
      .then(data => {
        setMetadata(data)
        setViewportWidth(data.breakpoints.desktop.width)
        setIframeHeight(data.breakpoints.desktop.height || 800)
      })
      .catch(err => {
        console.error('Failed to load responsive metadata:', err)
      })
  }, [mergeId])

  // Listen for iframe resize messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'iframe-resize' && typeof e.data.height === 'number') {
        setIframeHeight(e.data.height)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div>
      {/* Responsive Controls - Sticky */}
      <div className="sticky top-0 z-10 bg-muted/50 py-4 backdrop-blur">
        <div className="w-full px-4 sm:px-6">
          <ResponsiveViewportControls
            viewportWidth={viewportWidth}
            onViewportChange={setViewportWidth}
            title={t('detail.preview.responsive_test')}
          />
        </div>
      </div>

      {/* Preview iframe with viewport control */}
      <div
        className="flex justify-center items-start overflow-auto py-8"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage: `
            linear-gradient(to right, rgb(209 213 219 / 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(209 213 219 / 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          minHeight: 'calc(100vh - 300px)'
        }}
      >
        <div
          className="bg-white shadow-lg overflow-hidden"
          style={{
            width: `${viewportWidth}px`,
            minHeight: `${iframeHeight}px`
          }}
        >
          <iframe
            src={`/responsive-merges/${mergeId}/preview`}
            className="w-full border-0"
            style={{ height: `${iframeHeight}px` }}
            title="Responsive Preview"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * TAB 2: Code - Navigation entre les fichiers du merge (SANS les fichiers Puck)
 */
interface CodeTabProps {
  mergeId: string
  components: string[]
}

function CodeTab({ mergeId, components }: CodeTabProps) {
  const [mainPageFiles, setMainPageFiles] = useState<CodeFile[]>([])
  const [componentFiles, setComponentFiles] = useState<CodeFile[]>([])
  const [category, setCategory] = useState<'mainPage' | 'components'>('mainPage')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCodeFiles()
  }, [mergeId, components])

  useEffect(() => {
    // Reset selected index when category changes
    setSelectedIndex(0)
  }, [category])

  const loadCodeFiles = async () => {
    try {
      setLoading(true)
      const mainFiles: CodeFile[] = []
      const compFiles: CodeFile[] = []

      // Main Page files
      try {
        const pageModule = await import(`../../generated/responsive-screens/${mergeId}/Page.tsx?raw`)
        mainFiles.push({ name: 'Page.tsx', content: pageModule.default, type: 'tsx', icon: '📄' })
      } catch (e) {
        console.warn('No Page.tsx')
      }

      try {
        const cssModule = await import(`../../generated/responsive-screens/${mergeId}/Page.css?raw`)
        mainFiles.push({ name: 'Page.css', content: cssModule.default, type: 'css', icon: '🎨' })
      } catch (e) {
        console.warn('No Page.css')
      }

      // Component files (sorted alphabetically)
      const sortedComponents = [...components].sort()

      for (const compName of sortedComponents) {
        // Try new path (components/), fallback to old path (Subcomponents/) for backward compatibility
        try {
          let tsxModule
          try {
            tsxModule = await import(`../../generated/responsive-screens/${mergeId}/components/${compName}.tsx?raw`)
          } catch {
            // Fallback for old merges with Subcomponents/
            tsxModule = await import(`../../generated/responsive-screens/${mergeId}/Subcomponents/${compName}.tsx?raw`)
          }
          compFiles.push({ name: `${compName}.tsx`, content: tsxModule.default, type: 'tsx', icon: '🧩' })
        } catch (e) {
          console.warn(`No components/${compName}.tsx or Subcomponents/${compName}.tsx`)
        }

        try {
          let cssModule
          try {
            cssModule = await import(`../../generated/responsive-screens/${mergeId}/components/${compName}.css?raw`)
          } catch {
            // Fallback for old merges with Subcomponents/
            cssModule = await import(`../../generated/responsive-screens/${mergeId}/Subcomponents/${compName}.css?raw`)
          }
          compFiles.push({ name: `${compName}.css`, content: cssModule.default, type: 'css', icon: '🎨' })
        } catch (e) {
          console.warn(`No components/${compName}.css or Subcomponents/${compName}.css`)
        }
      }

      setMainPageFiles(mainFiles)
      setComponentFiles(compFiles)
      setLoading(false)
    } catch (err) {
      console.error('Error loading code files:', err)
      setLoading(false)
    }
  }

  // Get files for current category
  const currentFiles = category === 'mainPage' ? mainPageFiles : componentFiles

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">Loading code files...</div>
  }

  if (currentFiles.length === 0) {
    return <div className="p-10 text-center text-muted-foreground">No files available</div>
  }

  const selectedFile = currentFiles[selectedIndex]

  // Determine language for syntax highlighter
  const getLanguage = (type: string) => {
    switch (type) {
      case 'tsx':
      case 'jsx':
        return 'typescript'
      case 'css':
        return 'css'
      case 'json':
        return 'json'
      case 'xml':
        return 'xml'
      case 'js':
        return 'javascript'
      default:
        return 'typescript'
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls - Category & File Selection */}
      <Card>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Selector - Left */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Category:</span>
            <Tabs value={category} onValueChange={(value: string) => setCategory(value as 'mainPage' | 'components')} className="w-auto">
              <TabsList>
                <TabsTrigger value="mainPage" className="gap-1.5">
                  <span>📄</span>
                  <span className="hidden sm:inline">Main Page</span>
                </TabsTrigger>
                <TabsTrigger value="components" className="gap-1.5">
                  <span>🧩</span>
                  <span className="hidden sm:inline">Components</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* File Selector - Right */}
          <div className="flex flex-1 items-center gap-3 sm:max-w-md">
            <span className="text-sm font-medium text-muted-foreground">File:</span>
            <Select value={selectedIndex.toString()} onValueChange={(val) => setSelectedIndex(parseInt(val))}>
              <SelectTrigger className="flex-1">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span>{selectedFile.icon}</span>
                    <span className="truncate">{selectedFile.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {currentFiles.map((file, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{file.icon}</span>
                      <span>{file.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Code Viewer */}
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{selectedFile.icon}</span>
            <span className="text-sm font-semibold">{selectedFile.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {selectedFile.content.split('\n').length} lines
          </span>
        </div>

        {/* Code */}
        <ScrollArea className="h-[65vh]">
          <SyntaxHighlighter
            language={getLanguage(selectedFile.type)}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '13px',
              lineHeight: '1.5',
              minHeight: '65vh'
            }}
            showLineNumbers
          >
            {selectedFile.content}
          </SyntaxHighlighter>
        </ScrollArea>
      </Card>
    </div>
  )
}
