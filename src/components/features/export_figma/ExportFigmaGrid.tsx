import { memo, useState } from 'react'
import { ExportFigmaCard } from './ExportFigmaCard'
import { SelectionBar } from '@/components/ui/SelectionBar'
import { useSelection } from '../../../hooks/useSelection'
import { useConfirm } from '../../../hooks/useConfirm'
import { useAlert } from '../../../hooks/useAlert'
import { useTranslation } from '../../../i18n/I18nContext'

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

interface ExportFigmaGridProps {
  exports: ExportFigma[]
  onSelectExport: (exportId: string) => void
  onRefresh?: () => void
}

const ExportFigmaGrid = memo(function ExportFigmaGrid({ exports, onSelectExport, onRefresh }: ExportFigmaGridProps) {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirm()
  const { alert, AlertDialogComponent } = useAlert()
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)

  // Use selection hook
  const selection = useSelection(exports, (exportFigma) => exportFigma.exportId)

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

        {/* Grid */}
        <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
          {exports.map((exportFigma) => (
            <ExportFigmaCard
              key={exportFigma.exportId}
              exportFigma={exportFigma}
              onSelect={() => onSelectExport(exportFigma.exportId)}
              onRefresh={onRefresh}
              isSelected={selection.isSelected(exportFigma.exportId)}
              onToggleSelection={() => selection.toggleSelection(exportFigma.exportId)}
            />
          ))}
        </div>
      </div>
    </>
  )
})

export default ExportFigmaGrid
