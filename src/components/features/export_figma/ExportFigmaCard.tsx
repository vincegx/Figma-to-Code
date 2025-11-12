import { useState, useMemo, useCallback, memo } from 'react'
import { ExternalLink, Trash2, Eye, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from '../../../i18n/I18nContext'
import { useConfirm } from '../../../hooks/useConfirm'
import { useAlert } from '../../../hooks/useAlert'

interface ExportFigma {
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
    classesOptimized?: number
  }
}

interface ExportFigmaCardProps {
  exportFigma: ExportFigma
  onSelect: () => void
  onRefresh?: () => void
  isSelected?: boolean
  onToggleSelection?: () => void
}

export const ExportFigmaCard = memo(function ExportFigmaCard({ exportFigma, onSelect, onRefresh, isSelected, onToggleSelection }: ExportFigmaCardProps) {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirm()
  const { alert, AlertDialogComponent } = useAlert()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleOpenPreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `/preview?export=${exportFigma.exportId}&version=fixed`
  }, [exportFigma.exportId])

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmed = await confirm({
      title: t('home.card.delete'),
      description: t('home.card.delete_confirm'),
      confirmText: t('home.card.delete'),
      cancelText: t('common.close'),
      variant: 'destructive'
    })

    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/export_figma/${exportFigma.exportId}`, { method: 'DELETE' })
      if (response.ok) {
        // Call refresh callback instead of window.location.reload()
        // This allows proper refresh when watch.ignored is enabled
        if (onRefresh) {
          onRefresh()
        } else {
          window.location.reload()
        }
      } else {
        alert({
          title: t('common.error'),
          description: t('home.card.delete_error'),
          variant: 'destructive'
        })
        setIsDeleting(false)
      }
    } catch (error) {
      alert({
        title: t('common.error'),
        description: t('home.card.delete_error'),
        variant: 'destructive'
      })
      setIsDeleting(false)
    }
  }, [exportFigma.exportId, t, confirm, alert, onRefresh])

  const thumbnailPath = useMemo(
    () => `/src/generated/export_figma/${exportFigma.exportId}/img/figma-screenshot.png`,
    [exportFigma.exportId]
  )

  const nodeIdDisplay = useMemo(() => {
    const match = exportFigma.exportId?.match(/^node-(.+)-\d+$/)
    return match ? match[1] : exportFigma.exportId?.replace('node-', '')
  }, [exportFigma.exportId])

  const formattedDate = useMemo(() => {
    if (!exportFigma.timestamp) return ''
    const dateValue = typeof exportFigma.timestamp === 'number' && exportFigma.timestamp < 10000000000
      ? exportFigma.timestamp * 1000
      : exportFigma.timestamp
    const date = new Date(dateValue)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }, [exportFigma.timestamp])

  return (
    <>
      <ConfirmDialog />
      <AlertDialogComponent />

      <Card
        className="group cursor-pointer overflow-hidden transition-shadow duration-200 hover:shadow-lg"
        onClick={onSelect}
        style={{ contain: 'layout style paint' }}
        data-state={isSelected ? "selected" : undefined}
      >
        {/* Thumbnail */}
      <div className="relative h-52 w-full overflow-hidden bg-muted">
        <img
          src={thumbnailPath}
          alt={exportFigma.layerName || exportFigma.fileName || 'Preview'}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top transition-transform duration-200 ease-out group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement
            if (fallback) fallback.classList.remove('hidden')
          }}
        />
        <div className="absolute inset-0 hidden flex items-center justify-center text-6xl">
          🎨
        </div>

        {/* Checkbox - Always visible */}
        {onToggleSelection && (
          <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              className="h-5 w-5 bg-background border-2 shadow-sm"
            />
          </div>
        )}

        {/* Hover Overlay with Actions */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-end gap-2 bg-gradient-to-b from-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={handleOpenPreview}
            title={t('home.card.open_preview')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 w-8 p-0"
            onClick={handleDelete}
            disabled={isDeleting}
            title={t('home.card.delete')}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Node ID Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="font-mono text-[10px]">
            #{nodeIdDisplay}
          </Badge>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="p-5">
        {/* Stats Badges - First Line */}
        {exportFigma.stats && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {exportFigma.stats.totalNodes !== undefined && (
              <Badge variant="secondary" className="text-[10px]">
                {exportFigma.stats.totalNodes}
              </Badge>
            )}
            {exportFigma.stats.sectionsDetected !== undefined && exportFigma.stats.sectionsDetected > 0 && (
              <Badge variant="statSection" className="text-[10px]">
                {exportFigma.stats.sectionsDetected}
              </Badge>
            )}
            {exportFigma.stats.imagesOrganized !== undefined && exportFigma.stats.imagesOrganized > 0 && (
              <Badge variant="statImage" className="text-[10px]">
                {exportFigma.stats.imagesOrganized}
              </Badge>
            )}
            {(exportFigma.stats.totalFixes !== undefined || exportFigma.stats.classesOptimized !== undefined) && (
              <Badge variant="statFix" className="text-[10px]">
                {exportFigma.stats.totalFixes || exportFigma.stats.classesOptimized || 0}
              </Badge>
            )}
          </div>
        )}

        {/* Title + Date/ID - Second Line */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="truncate text-base font-semibold flex-1 min-w-0">
            {exportFigma.layerName || exportFigma.fileName || t('home.card.no_title')}
          </h3>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formattedDate}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {exportFigma.exportId}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleOpenPreview}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={onSelect}
          >
            <span>{t('home.card.view_details')}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  )
})
