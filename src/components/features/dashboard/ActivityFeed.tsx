/**
 * ActivityFeed - Recent activity feed (exports + merges combined)
 * Shows last 5 operations with type icon, name, stats, and timestamp
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileCode2, Smartphone, Package, Clock } from "lucide-react"
import { useTranslation } from '../../../i18n/I18nContext'

interface ActivityItem {
  type: 'export' | 'merge'
  id: string
  name: string
  timestamp: string | number
  stats: any
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  onActivityClick: (type: 'export' | 'merge', id: string) => void
}

export function ActivityFeed({ activities, onActivityClick }: ActivityFeedProps) {
  const { t } = useTranslation()

  const formatTimestamp = (timestamp: string | number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('dashboard.activity_feed.just_now')
    if (diffMins < 60) return `${diffMins} ${t('dashboard.activity_feed.minutes_ago')}`
    if (diffHours < 24) return `${diffHours} ${t('dashboard.activity_feed.hours_ago')}`
    if (diffDays < 7) return `${diffDays} ${t('dashboard.activity_feed.days_ago')}`

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  const getActivityIcon = (type: 'export' | 'merge') => {
    return type === 'export' ? FileCode2 : Smartphone
  }

  const getActivityColor = (type: 'export' | 'merge') => {
    return type === 'export' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'
  }

  const getActivityStats = (item: ActivityItem) => {
    if (item.type === 'export') {
      return [
        { icon: Package, value: item.stats?.totalNodes || 0, label: 'nodes' }
      ]
    } else {
      return [
        { icon: Package, value: item.stats?.totalComponents || 0, label: 'components' }
      ]
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('dashboard.activity_feed.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const stats = getActivityStats(activity)

              return (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onActivityClick(activity.type, activity.id)}
                >
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={activity.type === 'export' ? 'default' : 'secondary'} className="text-[10px]">
                        {activity.type === 'export' ? t('dashboard.activity_feed.type_export') : t('dashboard.activity_feed.type_merge')}
                      </Badge>
                      <p className="font-medium truncate text-sm">{activity.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {stats.map((stat, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <stat.icon className="h-3 w-3" />
                          <span>{stat.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            {t('dashboard.activity_feed.no_activity')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
