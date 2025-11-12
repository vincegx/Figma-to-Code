import { memo, useState } from 'react'
import { ResponsiveMergeCard } from './ResponsiveMergeCard'
import { SelectionBar } from '@/components/ui/SelectionBar'
import { useSelection } from '../../../hooks/useSelection'
import { useConfirm } from '../../../hooks/useConfirm'
import { useAlert } from '../../../hooks/useAlert'
import { useTranslation } from '../../../i18n/I18nContext'
import type { ResponsiveMerge } from '../../../hooks/useResponsiveMerges'

interface ResponsiveMergesGridProps {
  merges: ResponsiveMerge[]
  onRefresh?: () => void
}

const ResponsiveMergesGrid = memo(function ResponsiveMergesGrid({ merges, onRefresh }: ResponsiveMergesGridProps) {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirm()
  const { alert, AlertDialogComponent } = useAlert()
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)

  // Use selection hook
  const selection = useSelection(merges, (merge) => merge.mergeId)

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
      const deletePromises = Array.from(selection.selectedIds).map(mergeId =>
        fetch(`/api/responsive-merges/${mergeId}`, { method: 'DELETE' })
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
        description: 'Impossible de supprimer les responsive merges',
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
        <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))' }}>
          {merges.map((merge) => (
            <ResponsiveMergeCard
              key={merge.mergeId}
              merge={merge}
              onRefresh={onRefresh}
              isSelected={selection.isSelected(merge.mergeId)}
              onToggleSelection={() => selection.toggleSelection(merge.mergeId)}
            />
          ))}
        </div>
      </div>
    </>
  )
})

export default ResponsiveMergesGrid
