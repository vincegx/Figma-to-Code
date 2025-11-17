import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ResponsiveViewportControls } from './ResponsiveViewportControls'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Info } from 'lucide-react'
import { useTranslation } from '@/i18n/I18nContext'

type Version = 'clean' | 'fixed' | 'optimized' | 'dist'

interface PreviewNavbarProps {
  id: string
  mode: 'responsive' | 'full'
  onModeChange: (mode: 'responsive' | 'full') => void
  version?: Version
  onVersionChange?: (version: Version) => void
  detailUrl?: string
  showNavbar: boolean
  onShowNavbar: (show: boolean) => void
  viewportWidth?: number
  onViewportChange?: (width: number) => void
  showColoredBreakpoints?: boolean
  isResponsiveMerge?: boolean
}

export function PreviewNavbar({
  id,
  mode,
  onModeChange,
  version,
  onVersionChange,
  detailUrl,
  showNavbar,
  onShowNavbar,
  viewportWidth,
  onViewportChange,
  showColoredBreakpoints = false,
  isResponsiveMerge = false
}: PreviewNavbarProps) {
  const { translations } = useTranslation()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Close popover when navbar hides
  useEffect(() => {
    if (!showNavbar) {
      setIsPopoverOpen(false)
    }
  }, [showNavbar])

  return (
    <>
      {/* Invisible trigger zone at top */}
      <div
        className="fixed top-0 left-0 right-0 h-4 z-50"
        onMouseEnter={() => onShowNavbar(true)}
      />

      {/* Navbar - hidden by default, shows on hover */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300 ease-in-out
          ${showNavbar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
        onMouseEnter={() => onShowNavbar(true)}
        onMouseLeave={() => onShowNavbar(false)}
      >
        <div className="backdrop-blur-md bg-background/80 border-b border-border shadow-lg">
          <div className="container mx-auto px-4 py-3">
            {/* Top row: Navigation buttons, ID, and controls */}
            <div className="flex items-center justify-between mb-3">
              {/* Left: Navigation buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => detailUrl ? window.location.href = detailUrl : window.history.back()}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="m12 19-7-7 7-7"/>
                    <path d="M19 12H5"/>
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Home
                </button>
                {detailUrl && (
                  <button
                    onClick={() => window.location.href = detailUrl}
                    className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Detail
                  </button>
                )}
              </div>

              {/* Center: ID */}
              <div className="absolute left-1/2 -translate-x-1/2">
                <span className="text-xs text-muted-foreground font-mono">
                  {id}
                </span>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-4">
                {/* Version Button Group */}
                {version && onVersionChange && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground mr-1">Version:</Label>
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                      {isResponsiveMerge ? (
                        // Responsive merge: only Optimized and Export
                        <>
                          <button
                            type="button"
                            onClick={() => onVersionChange('optimized')}
                            className={`px-3 py-1.5 text-xs font-medium border rounded-l-md transition-colors ${
                              version === 'optimized'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            Optimized
                          </button>
                          <button
                            type="button"
                            onClick={() => onVersionChange('dist')}
                            className={`px-3 py-1.5 text-xs font-medium border rounded-r-md transition-colors ${
                              version === 'dist'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            Export
                          </button>
                        </>
                      ) : (
                        // Normal export: Fixed, Clean, Optimized, Export
                        <>
                          <button
                            type="button"
                            onClick={() => onVersionChange('fixed')}
                            className={`px-3 py-1.5 text-xs font-medium border rounded-l-md transition-colors ${
                              version === 'fixed'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            Fixed
                          </button>
                          <button
                            type="button"
                            onClick={() => onVersionChange('clean')}
                            className={`px-3 py-1.5 text-xs font-medium border-t border-b transition-colors ${
                              version === 'clean'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            Clean
                          </button>
                          <button
                            type="button"
                            onClick={() => onVersionChange('optimized')}
                            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                              version === 'optimized'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            Optimized
                          </button>
                          <button
                            type="button"
                            onClick={() => onVersionChange('dist')}
                            className={`px-3 py-1.5 text-xs font-medium border rounded-r-md transition-colors ${
                              version === 'dist'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            Export
                          </button>
                        </>
                      )}
                    </div>

                    {/* Version Info Popover */}
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7 ml-1">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-3">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium leading-none">{translations.detail.preview.version_info.title}</h4>
                            <p className="text-xs text-muted-foreground">Figma → Production</p>
                          </div>

                          {/* Pipeline Flow */}
                          <div className="grid gap-1.5">
                            {translations.detail.preview.version_info.stages.map((stage, index) => (
                              <div key={index} className="flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors hover:bg-accent">
                                <span className="text-base">{stage.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium">{stage.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{stage.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Mode Switch (responsive/full) */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="mode-switch" className="text-xs text-muted-foreground cursor-pointer">
                    {mode === 'responsive' ? '📱 Responsive' : '🖥️ Full Width'}
                  </Label>
                  <Switch
                    id="mode-switch"
                    checked={mode === 'full'}
                    onCheckedChange={(checked: boolean) => {
                      onModeChange(checked ? 'full' : 'responsive')
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom row: Responsive Controls - Only show in responsive mode */}
            {mode === 'responsive' && viewportWidth !== undefined && onViewportChange && (
              <ResponsiveViewportControls
                viewportWidth={viewportWidth}
                onViewportChange={onViewportChange}
                title="Responsive Preview"
                showColoredBreakpoints={showColoredBreakpoints}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
