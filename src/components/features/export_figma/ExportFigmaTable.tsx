import { useState, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SelectionBar } from "@/components/ui/SelectionBar"
import { MoreVertical, ExternalLink, Trash2, Eye, Loader2, Package, FileImage, Zap, Layers } from 'lucide-react'
import { useTranslation } from '../../../i18n/I18nContext'
import { useConfirm } from '../../../hooks/useConfirm'
import { useAlert } from '../../../hooks/useAlert'
import { useSelection } from '../../../hooks/useSelection'

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

interface ExportFigmaTableProps {
  exports: ExportFigma[]
  onSelectExport: (exportId: string) => void
  onRefresh?: () => void
}

const ExportFigmaTable = memo(function ExportFigmaTable({ exports, onSelectExport, onRefresh }: ExportFigmaTableProps) {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirm()
  const { alert, AlertDialogComponent } = useAlert()
  const [deletingExports, setDeletingExports] = useState<Set<string>>(new Set())
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)

  // Use selection hook
  const selection = useSelection(exports, (exportFigma) => exportFigma.exportId)

  const handleDelete = async (exportId: string) => {
    const confirmed = await confirm({
      title: t('home.card.delete'),
      description: t('home.card.delete_confirm'),
      confirmText: t('home.card.delete'),
      cancelText: t('common.close'),
      variant: 'destructive'
    })

    if (!confirmed) return

    setDeletingTests(new Set(deletingExports).add(exportId))
    try {
      const response = await fetch(`/api/export_figma/${exportId}`, { method: 'DELETE' })
      if (response.ok) {
        // Call refresh callback instead of window.location.reload()
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
        setDeletingTests(prev => {
          const next = new Set(prev)
          next.delete(exportId)
          return next
        })
      }
    } catch (error) {
      alert({
        title: t('common.error'),
        description: t('home.card.delete_error'),
        variant: 'destructive'
      })
      setDeletingTests(prev => {
        const next = new Set(prev)
        next.delete(exportId)
        return next
      })
    }
  }

  const handleDeleteSelected = async () => {
    if (selection.selectedCount === 0) return

    const confirmed = await confirm({
      title: t('home.table.delete_selected'),
      description: t('home.table.delete_selected_confirm', { count: selection.selectedCount.toString() }),
      confirmText: t('home.table.delete_selected'),
      cancelText: t('common.close'),
      variant: 'destructive'
    })

    if (!confirmed) return

    setIsDeletingMultiple(true)
    try {
      const deletePromises = Array.from(selection.selectedIds).map(exportId =>
        fetch(`/api/export_figma/${exportId}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      selection.clearSelection()
      setIsDeletingMultiple(false)
      // Call refresh callback instead of window.location.reload()
      if (onRefresh) {
        onRefresh()
      } else {
        window.location.reload()
      }
    } catch (error) {
      alert({
        title: t('common.error'),
        description: t('home.card.delete_error'),
        variant: 'destructive'
      })
      setIsDeletingMultiple(false)
    }
  }

  const handleOpenPreview = (exportId: string) => {
    window.location.href = `/preview?test=${exportId}&version=fixed`
  }

  const formatDate = (timestamp: string | number) => {
    if (!timestamp) return ''
    const dateValue = typeof timestamp === 'number' && timestamp < 10000000000
      ? timestamp * 1000
      : timestamp
    const date = new Date(dateValue)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getNodeIdDisplay = (exportId: string) => {
    const match = exportId?.match(/^node-(.+)-\d+$/)
    return match ? match[1] : exportId?.replace('node-', '')
  }

  return (
    <>
      <ConfirmDialog />
      <AlertDialogComponent />

      <div className="space-y-4">
        {/* Selection Bar */}
        <SelectionBar
          selectedCount={selection.selectedCount}
          onDelete={handleDeleteSelected}
          isDeleting={isDeletingMultiple}
        />

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selection.isAllSelected}
                  onCheckedChange={selection.toggleAll}
                  aria-label={t('home.table.select_all')}
                />
              </TableHead>
              <TableHead className="w-20">{t('home.table.preview')}</TableHead>
              <TableHead>{t('home.table.name')}</TableHead>
              <TableHead className="w-44">{t('home.table.node_id')}</TableHead>
              <TableHead className="w-48">{t('home.table.date')}</TableHead>
              <TableHead className="w-40 text-center">{t('home.table.stats')}</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t('home.no_exports.message')}
                </TableCell>
              </TableRow>
            ) : (
              exports.map((exportFigma) => {
                const thumbnailPath = `/src/generated/export_figma/${exportFigma.exportId}/img/figma-screenshot.png`
                const isDeleting = deletingExports.has(exportFigma.exportId)
                const isSelected = selection.isSelected(exportFigma.exportId)

                return (
                  <TableRow
                    key={exportFigma.exportId}
                    data-state={isSelected ? "selected" : undefined}
                    className="cursor-pointer"
                    style={{ contain: 'layout style paint' }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => selection.toggleSelection(exportFigma.exportId)}
                        aria-label={t('home.table.select_row')}
                      />
                    </TableCell>
                    <TableCell onClick={() => onSelectExport(exportFigma.exportId)}>
                      <div className="relative h-14 w-16 overflow-hidden rounded border bg-muted">
                        <img
                          src={thumbnailPath}
                          alt={exportFigma.layerName || exportFigma.fileName || 'Preview'}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover object-top transition-transform duration-200 ease-out hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.classList.remove('hidden')
                          }}
                        />
                        <div className="absolute inset-0 hidden flex items-center justify-center text-2xl">
                          🎨
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onSelectExport(exportFigma.exportId)}>
                      <div className="font-medium">
                        {exportFigma.layerName || exportFigma.fileName || t('home.card.no_title')}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {exportFigma.exportId}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onSelectExport(exportFigma.exportId)}>
                      <Badge variant="secondary" className="font-mono text-xs">
                        #{getNodeIdDisplay(exportFigma.exportId)}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => onSelectExport(exportFigma.exportId)}>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(exportFigma.timestamp)}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => onSelectExport(exportFigma.exportId)}>
                      {exportFigma.stats && (
                        <div className="flex items-center justify-center gap-3">
                          {exportFigma.stats.totalNodes !== undefined && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Package className="h-3 w-3" />
                              <span>{exportFigma.stats.totalNodes}</span>
                            </div>
                          )}
                          {exportFigma.stats.sectionsDetected !== undefined && exportFigma.stats.sectionsDetected > 0 && (
                            <div className="flex items-center gap-1 text-xs text-primary">
                              <Layers className="h-3 w-3" />
                              <span>{exportFigma.stats.sectionsDetected}</span>
                            </div>
                          )}
                          {exportFigma.stats.imagesOrganized !== undefined && exportFigma.stats.imagesOrganized > 0 && (
                            <div className="flex items-center gap-1 text-xs text-chart-4">
                              <FileImage className="h-3 w-3" />
                              <span>{exportFigma.stats.imagesOrganized}</span>
                            </div>
                          )}
                          {(exportFigma.stats.totalFixes !== undefined || exportFigma.stats.classesOptimized !== undefined) && (
                            <div className="flex items-center gap-1 text-xs text-chart-5">
                              <Zap className="h-3 w-3" />
                              <span>{exportFigma.stats.totalFixes || exportFigma.stats.classesOptimized || 0}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelectExport(exportFigma.exportId)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenPreview(exportFigma.exportId)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t('home.card.open_preview')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(exportFigma.exportId)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('home.card.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </>
  )
})

export default ExportFigmaTable
