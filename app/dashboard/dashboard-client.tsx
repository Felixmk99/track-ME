'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Area, AreaChart, ComposedChart, Line, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Activity, Moon, TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import { format, subDays, isAfter, parseISO } from "date-fns"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { linearRegression, linearRegressionLine } from 'simple-statistics'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { differenceInDays, startOfDay, endOfDay } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type TimeRange = '7d' | '30d' | '3m' | 'all' | 'custom'

interface DashboardReviewProps {
    data: any[]
}



// ... imports

import { useLanguage } from "@/components/providers/language-provider"

export default function DashboardClient({ data: initialData }: DashboardReviewProps) {
    const { t, locale } = useLanguage()
    const [timeRange, setTimeRange] = useState<TimeRange>('30d')
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['composite_score'])
    const [showTrend, setShowTrend] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    })

    // -- 1. Process Data & Time Filtering --
    const processedData = useMemo(() => {
        if (!initialData || initialData.length === 0) return generateMockData()

        const now = new Date()
        let startDate = subDays(now, 30)
        let endDate = now

        if (timeRange === '7d') startDate = subDays(now, 7)
        if (timeRange === '30d') startDate = subDays(now, 30)
        if (timeRange === '3m') startDate = subDays(now, 90)
        if (timeRange === 'all') startDate = subDays(now, 365 * 5)

        if (timeRange === 'custom' && dateRange?.from) {
            startDate = startOfDay(dateRange.from)
            endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
        }

        return initialData
            .filter(item => {
                const itemDate = parseISO(item.date)
                return isAfter(itemDate, startDate) && (timeRange === 'custom' ? itemDate <= endDate : true)
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [initialData, timeRange, dateRange])

    // -- 2a. Extract Dynamic Metrics --
    const availableMetrics = useMemo(() => {
        const dynamicKeys = new Set<string>()
        processedData.forEach(d => {
            if (d.custom_metrics) {
                Object.keys(d.custom_metrics).forEach(k => dynamicKeys.add(k))
            }
        })

        const dynamicOptions = Array.from(dynamicKeys).sort()
        const defaults = [
            { value: 'composite_score', label: 'Track-ME Score' },
            { value: 'hrv', label: 'Heart Rate Variability' },
            { value: 'resting_heart_rate', label: 'Resting HR' },
            { value: 'exertion_score', label: 'Exertion Score' }
        ]
        const allOptions = [...defaults]
        dynamicOptions.forEach(key => {
            if (!allOptions.find(o => o.value === key)) {
                allOptions.push({ value: key, label: key })
            }
        })
        return allOptions
    }, [processedData])

    // -- 2b. Helper to get Config for ANY metric --
    const getMetricConfig = (key: string) => {
        // Known static configs
        switch (key) {
            case 'composite_score': return { label: t('dashboard.metrics.composite_score.label'), color: '#fb7185', domain: ['auto', 'auto'], unit: '', invert: true, description: t('dashboard.metrics.composite_score.description'), better: t('dashboard.metrics.composite_score.better') }
            case 'hrv': return { label: t('dashboard.metrics.hrv.label'), color: '#3b82f6', domain: ['auto', 'auto'], unit: 'ms', invert: false, description: t('dashboard.metrics.hrv.description'), better: t('dashboard.metrics.hrv.better') }
            case 'resting_heart_rate': return { label: t('dashboard.metrics.resting_heart_rate.label'), color: '#f59e0b', domain: ['auto', 'auto'], unit: 'bpm', invert: true, description: t('dashboard.metrics.resting_heart_rate.description'), better: t('dashboard.metrics.resting_heart_rate.better') }
            case 'exertion_score': return { label: t('dashboard.metrics.exertion_score.label'), color: '#10b981', domain: [0, 10], unit: '', invert: false, description: t('dashboard.metrics.exertion_score.description'), better: t('dashboard.metrics.exertion_score.better') }
        }

        // Dynamic Config
        const lower = key.toLowerCase()
        const exertionKeywords = ['exertion', 'demanding', 'active', 'activity', 'walk', 'run', 'cycle', 'sport', 'gym', 'train', 'cook', 'clean', 'social', 'work', 'focus']

        // Auto-assign colors for comparison if not standard
        // We use a palette if we don't have a specific color
        const palette = ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
        let color = '#8b5cf6'

        if (exertionKeywords.some(k => lower.includes(k))) {
            return { label: key, color: '#10b981', domain: [0, 5], unit: '', invert: false }
        }

        return { label: key, color: color, domain: [0, 5], unit: '', invert: true }
    }

    // -- 1b. Enhanced Chart Data (Trend Line) --
    // Only calculate trend for the PRIMARY metric to avoid clutter
    const chartData = useMemo(() => {
        const data = [...processedData]
        if (!showTrend || data.length < 2 || selectedMetrics.length === 0) return data

        const trendsByIndex = new Map<number, any>()

        selectedMetrics.forEach(metric => {
            const points: { t: number, v: number, i: number }[] = []
            data.forEach((d, i) => {
                const val = metric === 'composite_score'
                    ? d.custom_metrics?.composite_score
                    : (d[metric] ?? d.custom_metrics?.[metric])

                if (typeof val === 'number' && !isNaN(val)) {
                    points.push({ t: new Date(d.date).getTime(), v: val, i })
                }
            })

            if (points.length < 2) return

            // Adaptive Trend Logic
            const firstTime = points[0].t
            const lastTime = points[points.length - 1].t
            const daysDiff = (lastTime - firstTime) / (1000 * 60 * 60 * 24)

            if ((timeRange !== '3m' && timeRange !== 'all') && (daysDiff < 90)) {
                const regressionPoints = points.map(p => [p.t, p.v])
                const regression = linearRegression(regressionPoints)
                const predict = linearRegressionLine(regression)

                data.forEach((d, i) => {
                    const val = predict(new Date(d.date).getTime())
                    if (!trendsByIndex.has(i)) trendsByIndex.set(i, {})
                    trendsByIndex.get(i)![`trend_${metric}`] = val
                })
            } else {
                let windowSize = 7
                if (timeRange === 'all' || daysDiff > 180) windowSize = 30
                else if (daysDiff > 90) windowSize = 14

                for (let i = 0; i < points.length; i++) {
                    if (i >= windowSize - 1) {
                        const window = points.slice(i - windowSize + 1, i + 1)
                        const sum = window.reduce((acc, p) => acc + p.v, 0)
                        const avg = sum / windowSize

                        const dataIndex = points[i].i
                        if (!trendsByIndex.has(dataIndex)) trendsByIndex.set(dataIndex, {})
                        trendsByIndex.get(dataIndex)![`trend_${metric}`] = avg
                    }
                }
            }
        })

        return data.map((d, i) => ({
            ...d,
            ...trendsByIndex.get(i)
        }))
    }, [processedData, showTrend, selectedMetrics, timeRange])

    // -- 3. Calculate Stats for ALL selected metrics --
    const multiStats = useMemo(() => {
        if (!initialData || initialData.length === 0) return []

        return selectedMetrics.map(metric => {
            const config = getMetricConfig(metric)
            const getValue = (d: any, k: string) => d[k] ?? d.custom_metrics?.[k] ?? 0;

            // 1. Current
            const currentValues = processedData.map(d => getValue(d, metric)).filter(v => typeof v === 'number' && !isNaN(v))
            const currentAvg = currentValues.length > 0 ? currentValues.reduce((a, b) => a + b, 0) / currentValues.length : 0

            // 2. Previous Period Setup
            const now = new Date()
            let prevStart = subDays(now, 60)
            let prevEnd = subDays(now, 30)

            if (timeRange === '7d') { prevStart = subDays(now, 14); prevEnd = subDays(now, 7); }
            else if (timeRange === '30d') { prevStart = subDays(now, 60); prevEnd = subDays(now, 30); }
            else if (timeRange === '3m') { prevStart = subDays(now, 180); prevEnd = subDays(now, 90); }
            else if (timeRange === 'custom' && dateRange?.from) {
                const startElement = dateRange.from
                const endElement = dateRange.to || dateRange.from
                const duration = differenceInDays(endElement, startElement) + 1
                prevEnd = subDays(startElement, 1)
                prevStart = subDays(startElement, duration)
            }

            // 3. Calculate Prev Avg
            let trendPrevAvg = 0
            if (timeRange === 'all') {
                const pStart = subDays(now, 60)
                const pEnd = subDays(now, 30)
                const pData = initialData.filter(item => { const d = parseISO(item.date); return isAfter(d, pStart) && !isAfter(d, pEnd) })
                const pValues = pData.map(d => getValue(d, metric)).filter(v => typeof v === 'number' && !isNaN(v))
                trendPrevAvg = pValues.length > 0 ? pValues.reduce((a, b) => a + b, 0) / pValues.length : 0

                const tStart = subDays(now, 30)
                const tData = initialData.filter(item => isAfter(parseISO(item.date), tStart))
                const tValues = tData.map(d => getValue(d, metric)).filter(v => typeof v === 'number' && !isNaN(v))
                const trendCurrentAvg = tValues.length > 0 ? tValues.reduce((a, b) => a + b, 0) / tValues.length : 0 // For Trend Badge specifically

                const denominator = Math.abs(trendPrevAvg) < 0.01 ? 1 : Math.abs(trendPrevAvg)
                const diff = trendCurrentAvg - trendPrevAvg
                const pct = (diff / denominator) * 100

                let trend = 'stable'
                if (Math.abs(pct) < 1) trend = 'stable'
                else if (pct > 0) trend = config.invert ? 'worsening' : 'improving'
                else trend = config.invert ? 'improving' : 'worsening'

                return { key: metric, trend, pct: Math.abs(pct), rawPct: pct, label: config.label, unit: config.unit, avg: currentAvg }
            } else {
                const prevData = initialData.filter(item => {
                    const d = parseISO(item.date)
                    return isAfter(d, prevStart) && !isAfter(d, prevEnd)
                })
                const prevValues = prevData.map(d => getValue(d, metric)).filter(v => typeof v === 'number' && !isNaN(v))
                trendPrevAvg = prevValues.length > 0 ? prevValues.reduce((a, b) => a + b, 0) / prevValues.length : 0

                const denominator = Math.abs(trendPrevAvg) < 0.01 ? 1 : Math.abs(trendPrevAvg)
                const diff = currentAvg - trendPrevAvg
                const pct = (diff / denominator) * 100

                let trend = 'stable'
                if (Math.abs(pct) < 1) trend = 'stable'
                else if (pct > 0) trend = config.invert ? 'worsening' : 'improving'
                else trend = config.invert ? 'improving' : 'worsening'

                return { key: metric, trend, pct: Math.abs(pct), rawPct: pct, label: config.label, unit: config.unit, avg: currentAvg }
            }
        })
    }, [processedData, initialData, selectedMetrics, timeRange, dateRange])


    // ... UI Render ...
    // Header: Map multiStats to Badges
    // Chart: Map selectedMetrics to Area/Line

    // -- 4. Mock Data Generator (Visualization Only) --
    function generateMockData() {
        const data = []
        const now = new Date()
        for (let i = 30; i >= 0; i--) {
            const date = subDays(now, i)
            // Create a gentle curve
            const base = 50 + Math.sin(i / 5) * 20
            data.push({
                date: date.toISOString().split('T')[0],
                hrv: Math.round(base + Math.random() * 10 - 5),
                symptom_score: Math.max(0, Math.min(3, 1.5 + Math.cos(i / 4))),
                resting_heart_rate: 60 + Math.random() * 5,
            })
        }
        return data
    }

    return (
        <div className="space-y-6">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('dashboard.title')}</h2>
                    <p className="text-muted-foreground text-sm">
                        {t('dashboard.subtitle_prefix')} {selectedMetrics.map(m => getMetricConfig(m).label).join(', ')} {t('dashboard.subtitle_suffix')}
                    </p>
                </div>
                <div className="bg-muted/30 p-1 rounded-lg flex items-center gap-1 self-start">
                    {(['7d', '30d', '3m', 'all'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${timeRange === r
                                ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {(() => {
                                const map: Record<string, string> = { '7d': 'd7', '30d': 'd30', '3m': 'm3', 'all': 'all' }
                                return t(`dashboard.time_ranges.${map[r]}` as any)
                            })()}
                        </button>
                    ))}

                    <div className="w-px h-4 bg-border mx-1" />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-7 text-xs font-medium px-2 rounded-md transition-all hover:bg-background/50",
                                    timeRange === 'custom'
                                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm hover:bg-white dark:hover:bg-zinc-800"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>{t('common.custom')}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range, day) => {
                                    // Start a new range if one is already selected
                                    const nextRange = (dateRange?.from && dateRange?.to)
                                        ? { from: day, to: undefined }
                                        : range

                                    setDateRange(nextRange)
                                    if (nextRange?.from) setTimeRange('custom')
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Main Chart Card */}
            <Card className="border-border/50 shadow-sm relative overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex flex-wrap items-center gap-6">
                            {multiStats.map((stat, index) => (
                                <div key={stat.key} className="space-y-1">
                                    <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: getMetricConfig(stat.key).color }}>
                                        {stat.label}
                                        {(getMetricConfig(stat.key) as any).description && (
                                            <TooltipProvider>
                                                <InfoTooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 opacity-50 hover:opacity-100 cursor-help transition-opacity" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[200px] text-xs">
                                                        <p className="font-semibold mb-1">{t('dashboard.metrics.about')} {stat.label}</p>
                                                        <p className="mb-2">{(getMetricConfig(stat.key) as any).description}</p>
                                                        <p className="font-medium text-muted-foreground">{(getMetricConfig(stat.key) as any).better}</p>
                                                    </TooltipContent>
                                                </InfoTooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold tracking-tight">
                                            {stat.trend === 'stable' ? t('dashboard.status.stable') : (stat.trend === 'improving' ? t('dashboard.status.improving') : t('dashboard.status.declining'))}
                                        </span>
                                        <Badge variant="outline" className={`
                                            ${stat.trend === 'improving' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : ''}
                                            ${stat.trend === 'worsening' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400' : ''}
                                            ${stat.trend === 'stable' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                                        `}>
                                            {stat.trend !== 'stable' && stat.rawPct > 0 && <TrendingUp className="w-3 h-3 mr-1" />}
                                            {stat.trend !== 'stable' && stat.rawPct < 0 && <TrendingDown className="w-3 h-3 mr-1" />}
                                            {stat.trend === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                                            {stat.pct.toFixed(0)}%
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 self-start">
                        <div className="flex items-center space-x-2">
                            <Switch id="trend-mode" checked={showTrend} onCheckedChange={setShowTrend} />
                            <Label htmlFor="trend-mode" className="text-xs text-muted-foreground hidden md:block">{t('dashboard.trend_mode')}</Label>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs w-[200px] justify-between">
                                    {selectedMetrics.length === 1 ? getMetricConfig(selectedMetrics[0]).label : `${selectedMetrics.length} ${t('dashboard.metrics_selected')}`}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel>{t('dashboard.metrics_dropdown')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableMetrics.map((m) => {
                                    const isSelected = selectedMetrics.includes(m.value)
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={m.value}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    if (selectedMetrics.length < 2) {
                                                        setSelectedMetrics([...selectedMetrics, m.value])
                                                    }
                                                } else {
                                                    if (selectedMetrics.length > 1) {
                                                        setSelectedMetrics(selectedMetrics.filter(id => id !== m.value))
                                                    }
                                                }
                                            }}
                                        >
                                            {m.label}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>

                <CardContent className="h-[400px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                {selectedMetrics.map((metric, i) => {
                                    const config = getMetricConfig(metric)
                                    return (
                                        <linearGradient key={metric} id={`colorMetric-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={config.color} stopOpacity={0.0} />
                                        </linearGradient>
                                    )
                                })}
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />

                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#888' }}
                                minTickGap={30}
                            />

                            {/* Dynamic Y Axes */}
                            {selectedMetrics.map((metric, index) => {
                                const config = getMetricConfig(metric)
                                return (
                                    <YAxis
                                        key={metric}
                                        yAxisId={metric}
                                        orientation={index === 0 ? 'left' : 'right'}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        domain={config.domain as any}
                                        width={50}
                                        hide={index > 1}
                                    />
                                )
                            })}

                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-zinc-900 text-white text-xs p-3 rounded-lg shadow-xl border border-zinc-800">
                                                <p className="font-semibold mb-2">{label ? format(parseISO(label as string), 'EEE, MMM d') : ''}</p>
                                                <div className="flex flex-col gap-1">
                                                    {payload.map((p: any) => {
                                                        // Filter out Trend line from tooltip if needed or keep it
                                                        if (String(p.dataKey).startsWith('trend_')) {
                                                            const metricKey = String(p.dataKey).replace('trend_', '')
                                                            return (
                                                                <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-zinc-800 mt-1">
                                                                    <span>Trend ({getMetricConfig(metricKey).label}): <span className="font-bold">{Number(p.value).toFixed(1)}</span></span>
                                                                </div>
                                                            )
                                                        }
                                                        // Find config
                                                        // p.dataKey might be the metric key or accessing nested
                                                        // We can deduce from fill/stroke or just match selectedMetrics
                                                        // p.name usually holds dataKey
                                                        return (
                                                            <div key={p.name} className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span>
                                                                    {getMetricConfig(p.name).label}: <span className="font-bold">{Number(p.value).toFixed(1)}{getMetricConfig(p.name).unit}</span>
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />

                            {/* Render Metrics */}
                            {selectedMetrics.map((metric, index) => {
                                const config = getMetricConfig(metric)
                                // Primary = Area. Others = Line.
                                if (index === 0) {
                                    return (
                                        <Area
                                            key={metric}
                                            yAxisId={metric}
                                            type="monotone"
                                            dataKey={(d) => {
                                                const val = metric === 'composite_score' ? d.custom_metrics?.composite_score : (d[metric] ?? d.custom_metrics?.[metric]);
                                                return (val === null || val === undefined || isNaN(val)) ? null : val;
                                            }}
                                            name={metric}
                                            stroke={config.color}
                                            strokeOpacity={showTrend ? 0.3 : 1}
                                            fillOpacity={showTrend ? 0.1 : 1}
                                            fill={`url(#colorMetric-${metric})`}
                                            strokeWidth={3}
                                            connectNulls={true}
                                        />
                                    )
                                } else {
                                    return (
                                        <Line
                                            key={metric}
                                            yAxisId={metric}
                                            type="monotone"
                                            dataKey={(d) => {
                                                const val = metric === 'composite_score' ? d.custom_metrics?.composite_score : (d[metric] ?? d.custom_metrics?.[metric]);
                                                return (val === null || val === undefined || isNaN(val)) ? null : val;
                                            }}
                                            name={metric}
                                            stroke={config.color}
                                            strokeOpacity={showTrend ? 0.3 : 1}
                                            strokeWidth={2}
                                            dot={false}
                                            connectNulls={true}
                                        />
                                    )
                                }
                            })}

                            {showTrend && selectedMetrics.map(metric => (
                                <Line
                                    key={`trend-${metric}`}
                                    yAxisId={metric}
                                    type="monotone"
                                    dataKey={`trend_${metric}`}
                                    stroke={getMetricConfig(metric).color}
                                    strokeWidth={4}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={false}
                                    opacity={1}
                                />
                            ))}</ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>



            <div className="flex justify-center pt-8 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">{t('dashboard.charts.synced')}</span>
                </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground opacity-60 pb-8">{t('dashboard.charts.encrypted')}</p>

        </div>
    )
}
