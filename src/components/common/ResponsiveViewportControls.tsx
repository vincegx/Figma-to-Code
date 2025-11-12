/**
 * ResponsiveViewportControls - Contrôles de viewport responsive réutilisables
 *
 * Affiche des presets de breakpoints (Mobile, Tablet, Desktop) et un slider
 * pour tester la responsivité d'un composant.
 */

import { Monitor, Tablet, Smartphone, Maximize, LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { useMemo } from 'react'

export interface BreakpointPreset {
  name: string
  width: number
  icon?: LucideIcon
  color?: string // Couleur hex pour le mode coloré (ex: '#10b981')
}

export interface ResponsiveViewportControlsProps {
  /** Largeur actuelle du viewport en pixels */
  viewportWidth: number
  /** Callback appelé quand la largeur change */
  onViewportChange: (width: number) => void
  /** Classes CSS additionnelles (optionnel) */
  className?: string
  /** Titre affiché en haut des contrôles (optionnel) */
  title?: string
  /** Presets personnalisés (optionnel) - si non fourni, utilise Mobile/Tablet/Desktop par défaut */
  customPresets?: BreakpointPreset[]
  /** Afficher les couleurs coordonnées entre boutons et slider (défaut: true) */
  showColoredBreakpoints?: boolean
  /** Afficher le badge "Native" à côté de la taille (optionnel) */
  showNativeBadge?: boolean
  /** Label du badge Native (optionnel, défaut: "Native") */
  nativeLabel?: string
}

const defaultPresets: BreakpointPreset[] = [
  { name: 'Mobile', width: 420, icon: Smartphone, color: '#10b981' }, // green-500
  { name: 'Tablet', width: 960, icon: Tablet, color: '#f97316' },      // orange-500
  { name: 'Desktop', width: 1440, icon: Monitor, color: '#3b82f6' }     // blue-500
]

export function ResponsiveViewportControls({
  viewportWidth,
  onViewportChange,
  className = '',
  title = 'Responsive Test',
  customPresets,
  showColoredBreakpoints = true, // PAR DÉFAUT ACTIVÉ
  showNativeBadge = false,
  nativeLabel = 'Native'
}: ResponsiveViewportControlsProps) {
  const presets = customPresets || defaultPresets

  // Générer le gradient du slider (calculé une seule fois)
  const sliderGradient = useMemo(() => {
    if (!showColoredBreakpoints || presets.length < 2) return undefined

    const sorted = [...presets].sort((a, b) => a.width - b.width)
    const minWidth = 320
    const maxWidth = 1920

    const gradientStops: string[] = []

    sorted.forEach((preset, index) => {
      const percentage = ((preset.width - minWidth) / (maxWidth - minWidth)) * 100
      const color = preset.color || '#6366f1'

      if (index === 0) {
        gradientStops.push(`${color} 0%`)
        gradientStops.push(`${color} ${percentage}%`)
      } else if (index === sorted.length - 1) {
        gradientStops.push(`${color} ${percentage}%`)
        gradientStops.push(`${color} 100%`)
      } else {
        gradientStops.push(`${color} ${percentage}%`)
      }
    })

    return `linear-gradient(to right, ${gradientStops.join(', ')})`
  }, [showColoredBreakpoints, presets])

  return (
    <Card className={`p-3 sm:p-4 ${className}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
        <div className="flex items-center gap-2">
          {showNativeBadge && (
            <Badge variant="default" className="gap-1 text-xs">
              <Maximize className="h-3 w-3" />
              {nativeLabel}
            </Badge>
          )}
          <Badge variant="secondary" className="font-mono text-xs">
            {viewportWidth}px
          </Badge>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const Icon = preset.icon || Monitor
          const isActive = viewportWidth === preset.width

          // Boutons toujours colorés quand showColoredBreakpoints est true
          let buttonStyle: React.CSSProperties = {}
          let buttonClass = 'flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition-all'

          if (showColoredBreakpoints && preset.color) {
            buttonStyle = {
              backgroundColor: preset.color,
              color: 'white',
              opacity: isActive ? 1 : 0.7
            }
            buttonClass += ' hover:opacity-100'
          } else {
            if (isActive) {
              buttonClass += ' bg-primary text-primary-foreground'
            } else {
              buttonClass += ' bg-muted hover:bg-muted/80'
            }
          }

          return (
            <button
              key={preset.name}
              onClick={() => onViewportChange(preset.width)}
              className={buttonClass}
              style={buttonStyle}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">{preset.name}</span>
              <span className="text-xs opacity-90">
                {preset.width}
              </span>
            </button>
          )
        })}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="relative h-2">
          {/* Barre de gradient FIXE en dessous */}
          {showColoredBreakpoints && sliderGradient && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: sliderGradient,
                height: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 0
              }}
            />
          )}
          {/* Slider par-dessus avec background transparent */}
          <div className="relative" style={{ zIndex: 1 }}>
            <Slider
              value={[viewportWidth]}
              onValueChange={(value: number[]) => onViewportChange(value[0])}
              min={320}
              max={1920}
              step={1}
              className="w-full slider-transparent"
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>320px</span>
          <span>1920px</span>
        </div>
      </div>

      {/* CSS pour rendre le track du slider transparent */}
      <style>{`
        .slider-transparent [data-orientation="horizontal"] {
          background: transparent !important;
        }
        .slider-transparent [role="slider"] {
          background: white;
          border: 2px solid hsl(var(--primary));
          z-index: 2;
        }
      `}</style>
    </Card>
  )
}
