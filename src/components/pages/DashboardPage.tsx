/**
 * DashboardPage - Overview with KPIs and charts
 * Shows stats, timeline, and recent tests
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExports } from '../../hooks/useExports'
import { useResponsiveMerges } from '../../hooks/useResponsiveMerges'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LabelList } from "recharts"
import { Package, Image, Zap, Clock, BarChart3, TrendingUp, Activity, PieChart as PieChartIcon, FileCode2, Smartphone } from "lucide-react"
import { useTranslation } from '../../i18n/I18nContext'
import { QuickActionCard } from '../features/dashboard/QuickActionCard'
import { ActivityFeed } from '../features/dashboard/ActivityFeed'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { exports, loading: exportsLoading } = useExports()
  const { merges, loading: mergesLoading } = useResponsiveMerges()
  const loading = exportsLoading || mergesLoading

  // Combined activity (exports + merges)
  const combinedActivity = useMemo(() => {
    const exportActivities = exports.map(e => ({
      type: 'export' as const,
      id: e.exportId,
      name: e.layerName || e.fileName || t('dashboard.untitled'),
      timestamp: typeof e.timestamp === 'number' && e.timestamp < 10000000000 ? e.timestamp * 1000 : e.timestamp,
      stats: e.stats
    }))

    const mergeActivities = merges.map(m => ({
      type: 'merge' as const,
      id: m.mergeId,
      name: `Merge ${m.mergeId.substring(0, 8)}`,
      timestamp: typeof m.timestamp === 'number' && m.timestamp < 10000000000 ? m.timestamp * 1000 : m.timestamp,
      stats: m.mergeStats
    }))

    return [...exportActivities, ...mergeActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [exports, merges, t])

  // KPIs calculation (combined exports + merges)
  const kpis = useMemo(() => {
    const totalNodes = exports.reduce((acc, test) => acc + (test.stats?.totalNodes || 0), 0)
    const totalImages = exports.reduce((acc, test) => acc + (test.stats?.imagesOrganized || 0), 0)
    const totalFixes = exports.reduce((acc, test) => acc + (test.stats?.totalFixes || test.stats?.classesOptimized || 0), 0)
    const totalExecutionTime = exports.reduce((acc, test) => acc + (test.stats?.executionTime || 0), 0)

    // Add merge stats
    const totalComponents = merges.reduce((acc, merge) => acc + (merge.mergeStats?.totalComponents || 0), 0)
    const totalOperations = exports.length + merges.length

    return {
      totalOperations,
      totalTests: exports.length,
      totalMerges: merges.length,
      totalNodes,
      totalImages,
      totalComponents,
      totalFixes,
      avgExecutionTime: exports.length > 0 ? Math.round(totalExecutionTime / exports.length) : 0
    }
  }, [exports, merges])

  // Timeline data: dual-line (exports + merges per day)
  const timelineData = useMemo(() => {
    const grouped: Record<string, { exports: number; merges: number }> = {}

    // Group exports by date
    exports.forEach(test => {
      const date = new Date(typeof test.timestamp === 'number' && test.timestamp < 10000000000
        ? test.timestamp * 1000
        : test.timestamp)
      const dateKey = date.toISOString().split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = { exports: 0, merges: 0 }
      grouped[dateKey].exports += 1
    })

    // Group merges by date
    merges.forEach(merge => {
      const date = new Date(typeof merge.timestamp === 'number' && merge.timestamp < 10000000000
        ? merge.timestamp * 1000
        : merge.timestamp)
      const dateKey = date.toISOString().split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = { exports: 0, merges: 0 }
      grouped[dateKey].merges += 1
    })

    return Object.entries(grouped)
      .map(([date, counts]) => ({ date, exports: counts.exports, merges: counts.merges }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14) // Last 14 days
  }, [exports, merges])

  // Top 10 tests by nodes
  const topTestsByNodes = useMemo(() => {
    return [...exports]
      .sort((a, b) => (b.stats?.totalNodes || 0) - (a.stats?.totalNodes || 0))
      .slice(0, 10)
      .map(test => {
        const name = (test.layerName || test.fileName || t('dashboard.untitled')).substring(0, 10)
        const nodes = test.stats?.totalNodes || 0
        return {
          name,
          nodes,
          label: `${name}: ${nodes}`,
          exportId: test.exportId
        }
      })
  }, [exports, t])

  // Transformation Activity Over Time (Stacked Area Chart)
  const transformationActivityData = useMemo(() => {
    const grouped = exports.reduce((acc, test) => {
      const date = new Date(typeof test.timestamp === 'number' && test.timestamp < 10000000000
        ? test.timestamp * 1000
        : test.timestamp)
      const dateKey = date.toISOString().split('T')[0]

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          fonts: 0,
          classes: 0,
          variables: 0,
          assets: 0,
          cleanup: 0
        }
      }

      // Aggregate transformations by category
      acc[dateKey].fonts += (test.stats?.fontsConverted || 0) + (test.stats?.fontClassesGenerated || 0)
      acc[dateKey].classes += (test.stats?.classesFixed || 0) + (test.stats?.classesOptimized || 0) + (test.stats?.customClassesGenerated || 0)
      acc[dateKey].variables += test.stats?.varsConverted || 0
      acc[dateKey].assets += test.stats?.imagesOrganized || 0
      acc[dateKey].cleanup += (test.stats?.dataAttrsRemoved || 0) + (test.stats?.arbitraryClassesConverted || 0)

      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(-14) // Last 14 days
  }, [exports])

  // Transformation Breakdown (Donut Chart)
  const transformationBreakdownData = useMemo(() => {
    const totals = exports.reduce((acc, test) => {
      acc.fonts += (test.stats?.fontsConverted || 0) + (test.stats?.fontClassesGenerated || 0)
      acc.classes += (test.stats?.classesFixed || 0) + (test.stats?.classesOptimized || 0) + (test.stats?.customClassesGenerated || 0)
      acc.variables += test.stats?.varsConverted || 0
      acc.assets += test.stats?.imagesOrganized || 0
      acc.cleanup += (test.stats?.dataAttrsRemoved || 0) + (test.stats?.arbitraryClassesConverted || 0)
      return acc
    }, { fonts: 0, classes: 0, variables: 0, assets: 0, cleanup: 0 })

    return [
      { name: t('dashboard.chart_labels.fonts'), value: totals.fonts, fill: 'hsl(var(--chart-1))' },
      { name: t('dashboard.chart_labels.classes'), value: totals.classes, fill: 'hsl(var(--chart-2))' },
      { name: t('dashboard.chart_labels.variables'), value: totals.variables, fill: 'hsl(var(--chart-3))' },
      { name: t('dashboard.chart_labels.assets'), value: totals.assets, fill: 'hsl(var(--chart-4))' },
      { name: t('dashboard.chart_labels.cleanup'), value: totals.cleanup, fill: 'hsl(var(--chart-5))' }
    ].filter(item => item.value > 0) // Only show non-zero categories
  }, [exports, t])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">{t('home.loading_tests')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Intro Section */}
      <Card className="border-none bg-gradient-to-br from-primary/5 via-background to-violet-500/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.intro.title')}</h1>
              </div>
              <p className="text-muted-foreground text-base leading-relaxed mb-4">
                {t('dashboard.intro.subtitle')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {kpis.totalOperations} opérations
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  {kpis.totalNodes.toLocaleString()} nodes
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {kpis.totalFixes.toLocaleString()} fixes
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Hero Section */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <QuickActionCard
          title={t('dashboard.quick_actions.figma_export.title')}
          description={t('dashboard.quick_actions.figma_export.description')}
          icon={FileCode2}
          color="blue"
          stats={[
            { label: t('dashboard.quick_actions.figma_export.total'), value: kpis.totalTests },
            { label: t('dashboard.quick_actions.figma_export.nodes'), value: kpis.totalNodes.toLocaleString() }
          ]}
          buttonText={t('dashboard.quick_actions.figma_export.button')}
          onClick={() => navigate('/export_figma?action=new')}
        />
        <QuickActionCard
          title={t('dashboard.quick_actions.responsive_merge.title')}
          description={t('dashboard.quick_actions.responsive_merge.description')}
          icon={Smartphone}
          color="purple"
          stats={[
            { label: t('dashboard.quick_actions.responsive_merge.total'), value: kpis.totalMerges },
            { label: t('dashboard.quick_actions.responsive_merge.components'), value: kpis.totalComponents }
          ]}
          buttonText={t('dashboard.quick_actions.responsive_merge.button')}
          onClick={() => navigate('/responsive-merges?action=new')}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.kpi.total_operations')}</p>
                <p className="text-3xl font-bold tracking-tight">{kpis.totalOperations}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('header.stats.total_nodes')}</p>
                <p className="text-3xl font-bold tracking-tight">{kpis.totalNodes.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('header.stats.images')}</p>
                <p className="text-3xl font-bold tracking-tight">{kpis.totalImages.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Image className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('header.stats.total_fixes')}</p>
                <p className="text-3xl font-bold tracking-tight">{kpis.totalFixes.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.kpi.avg_time')}</p>
                <p className="text-3xl font-bold tracking-tight">{kpis.avgExecutionTime}s</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transformation Activity Chart - Full Width (EN HAUT) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <p className="text-lg font-medium">{t('dashboard.charts.transformation_activity')}</p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transformationActivityData.length > 0 ? (
            <ChartContainer config={{
              fonts: { label: t('dashboard.chart_labels.fonts'), color: "hsl(var(--chart-1))" },
              classes: { label: t('dashboard.chart_labels.classes'), color: "hsl(var(--chart-2))" },
              variables: { label: t('dashboard.chart_labels.variables'), color: "hsl(var(--chart-3))" },
              assets: { label: t('dashboard.chart_labels.assets'), color: "hsl(var(--chart-4))" },
              cleanup: { label: t('dashboard.chart_labels.cleanup'), color: "hsl(var(--chart-5))" }
            }} className="h-[300px] w-full">
              <AreaChart data={transformationActivityData} width={undefined} height={undefined}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="fonts" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="classes" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="variables" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="assets" stackId="1" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="cleanup" stackId="1" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.6} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              {t('dashboard.empty_states.no_data')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Second Row - 3 Charts Aligned: Timeline + Top 10 + Breakdown */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Activity Timeline - Dual Line */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <p className="text-lg font-medium">{t('dashboard.charts.activity_timeline')}</p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ChartContainer config={{
                exports: { label: t('dashboard.charts.exports'), color: "hsl(var(--chart-1))" },
                merges: { label: t('dashboard.charts.merges'), color: "hsl(var(--chart-4))" }
              }} className="h-[300px] w-full">
                <AreaChart data={timelineData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillExports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillMerges" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="natural"
                    dataKey="exports"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#fillExports)"
                    fillOpacity={0.4}
                  />
                  <Area
                    type="natural"
                    dataKey="merges"
                    stroke="hsl(var(--chart-4))"
                    fill="url(#fillMerges)"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                {t('dashboard.empty_states.no_data')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Tests by Nodes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <p className="text-lg font-medium">{t('dashboard.charts.top_tests')}</p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTestsByNodes.length > 0 ? (
              <ChartContainer config={{
                nodes: { label: "Nodes", color: "hsl(var(--chart-1))" }
              }} className="h-[300px] w-full">
                <BarChart data={topTestsByNodes} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="nodes" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="label"
                      position="insideLeft"
                      offset={8}
                      className="fill-white"
                      fontSize={11}
                      fontWeight={500}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                {t('dashboard.empty_states.no_data')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transformation Breakdown - Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              <p className="text-lg font-medium">{t('dashboard.charts.transformation_breakdown')}</p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transformationBreakdownData.length > 0 ? (
              <ChartContainer config={{
                fonts: { label: t('dashboard.chart_labels.fonts'), color: "hsl(var(--chart-1))" },
                classes: { label: t('dashboard.chart_labels.classes'), color: "hsl(var(--chart-2))" },
                variables: { label: t('dashboard.chart_labels.variables'), color: "hsl(var(--chart-3))" },
                assets: { label: t('dashboard.chart_labels.assets'), color: "hsl(var(--chart-4))" },
                cleanup: { label: t('dashboard.chart_labels.cleanup'), color: "hsl(var(--chart-5))" }
              }} className="h-[300px] w-full">
                <PieChart width={undefined} height={undefined}>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Pie
                    data={transformationBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  >
                    {transformationBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                {t('dashboard.empty_states.no_data')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <ActivityFeed
        activities={combinedActivity}
        onActivityClick={(type, id) => {
          if (type === 'export') {
            navigate(`/export_figma/${id}`)
          } else {
            navigate(`/responsive-merges/${id}`)
          }
        }}
      />
    </div>
  )
}
