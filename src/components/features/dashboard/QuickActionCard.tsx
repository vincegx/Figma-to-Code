/**
 * QuickActionCard - Hero card for quick access to main actions
 * Used on dashboard for Figma Export and Responsive Merge
 */

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"

interface QuickActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  stats: Array<{ label: string; value: string | number }>
  color: 'blue' | 'purple'
  buttonText: string
  onClick: () => void
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  stats,
  color,
  buttonText,
  onClick
}: QuickActionCardProps) {
  const gradientColors = {
    blue: 'from-blue-500/10 to-violet-500/10',
    purple: 'from-purple-500/10 to-pink-500/10'
  }

  const iconColors = {
    blue: 'text-blue-600',
    purple: 'text-purple-600'
  }

  const buttonColors = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  }

  return (
    <Card
      className={`group overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer bg-gradient-to-br ${gradientColors[color]}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-background shadow-sm ${iconColors[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 mb-4">
          {stats.map((stat, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {stat.label}: <span className="font-semibold ml-1">{stat.value}</span>
            </Badge>
          ))}
        </div>

        {/* Action Button */}
        <Button
          className={`w-full ${buttonColors[color]} text-white transition-transform group-hover:scale-[1.02]`}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  )
}
