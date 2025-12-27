'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Area, AreaChart, ComposedChart, Line, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Activity, Moon, TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import { format, subDays, isAfter, parseISO } from "date-fns"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from "@/components/ui/switch"
import Link from 'next/link'
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
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['adjusted_score'])
    const [isCompareMode, setIsCompareMode] = useState(false)
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

        // 1. Filter Data First
        const filtered = initialData
            .filter(item => {
                const itemDate = parseISO(item.date)
                return isAfter(itemDate, startDate) && (timeRange === 'custom' ? itemDate <= endDate : true)
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // 2. Calculate Step Stats for Normalization (Dynamic Min/Max)
        const stepValues = filtered
            .map(d => d.step_count)
            .filter(v => typeof v === 'number' && !isNaN(v))

        const minSteps = stepValues.length ? Math.min(...stepValues) : 0
        const maxSteps = stepValues.length ? Math.max(...stepValues) : 1 // avoid div by 0

        // 3. Map with Adjusted Score


        // 3. Map with Adjusted Score
        return filtered.map(d => {
            // Composite from Visible
            const baseScore = d.custom_metrics?.composite_score ?? 0

            // Step Factor (0-3 scale)
            let stepFactor = 0
            if (typeof d.step_count === 'number' && !isNaN(d.step_count) && stepValues.length > 0) {
                if (maxSteps === minSteps) {
                    stepFactor = 0 // No variance
                } else {
                    // Normalize 0-1 then scale to 3
                    // Higher steps = Higher factor
                    stepFactor = ((d.step_count - minSteps) / (maxSteps - minSteps)) * 3
                }
            }

            // Exertion (if available, usually 'Stability Score' or sum of exertion tags if we saved it)
            // Note: Our DB schema has 'exertion_score' column.
            const exertionScore = d.exertion_score ?? 0

            // Final Score: Symptom Sum (Bad) - Exertion (Good/Reflects Capacity) - Steps (Good/Reflects Capacity)
            // High Score = Bad.
            // High Exertion = Good (implies ability to do things). -> Subtract it.
            // High Steps = Good. -> Subtract it.

            let adjustedScore = baseScore - exertionScore - stepFactor
            if (adjustedScore < 0) adjustedScore = 0

            // IF we have no step data at all (e.g. stepValues is empty), then adjustedScore should JUST be baseScore.
            // stepFactor logic above handles this by initializing to 0.
            // However, if logic is broken:
            // The issue might be that `baseScore` is not available if custom_metrics is null?
            // Or 'adjusted_score' is becoming NaN?

            return {
                ...d,
                adjusted_score: adjustedScore,
                step_factor: stepFactor,
                // Ensure composite_score is accessible at root level for charts if needed
                composite_score: baseScore
            }
        })

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
            { value: 'adjusted_score', label: 'Track-ME Score' },
            { value: 'composite_score', label: 'Symptom Score (Visible)' },
            { value: 'hrv', label: 'Heart Rate Variability' },
            { value: 'resting_heart_rate', label: 'Resting HR' },
            { value: 'step_count', label: 'Steps' },
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

            case 'adjusted_score': return { label: t('dashboard.metrics.adjusted_score.label'), color: '#fb7185', domain: ['auto', 'auto'], unit: '', invert: true, description: t('dashboard.metrics.adjusted_score.description'), better: t('dashboard.metrics.adjusted_score.better') }
            case 'composite_score': return { label: t('dashboard.metrics.composite_score.label'), color: '#f472b6', domain: ['auto', 'auto'], unit: '', invert: true, description: t('dashboard.metrics.composite_score.description'), better: t('dashboard.metrics.composite_score.better') }
            case 'hrv': return { label: t('dashboard.metrics.hrv.label'), color: '#3b82f6', domain: ['auto', 'auto'], unit: 'ms', invert: false, description: t('dashboard.metrics.hrv.description'), better: t('dashboard.metrics.hrv.better') }
            case 'resting_heart_rate': return { label: t('dashboard.metrics.resting_heart_rate.label'), color: '#f59e0b', domain: ['auto', 'auto'], unit: 'bpm', invert: true, description: t('dashboard.metrics.resting_heart_rate.description'), better: t('dashboard.metrics.resting_heart_rate.better') }
            case 'step_count': return { label: t('dashboard.metrics.step_count.label'), color: '#06b6d4', domain: ['auto', 'auto'], unit: '', invert: false, description: t('dashboard.metrics.step_count.description'), better: t('dashboard.metrics.step_count.better') }
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
    // -- 1b. Enhanced Chart Data (Trend Line) --
    const chartData = useMemo(() => {
        const data = [...processedData]
        if (!showTrend || data.length < 2 || selectedMetrics.length === 0) return data

        const trendsByIndex = new Map<number, any>()

        selectedMetrics.forEach(metric => {
            const points: { t: number, v: number, i: number }[] = []
            data.forEach((d, i) => {
                const val = (d[metric] !== undefined)
                    ? d[metric]
                    : (d.custom_metrics?.[metric])

                if (typeof val === 'number' && !isNaN(val)) {
                    points.push({ t: new Date(d.date).getTime(), v: val, i })
                }
            })

            if (points.length < 2) return

            // User requested: Trend line must start all the way on the left.
            // Moving Average naturally has a lag (missing start).
            // Linear Regression covers the full range naturally.
            // We'll use Linear Regression for ALL timeframes to ensure edge-to-edge visibility.
            // If the user later requests "curved" trends for long periods, we can use LOESS, but for now Regression fixes the "gap" issue.

            const regressionPoints = points.map(p => [p.t, p.v])
            const regression = linearRegression(regressionPoints)
            const predict = linearRegressionLine(regression)

            data.forEach((d, i) => {
                const val = predict(new Date(d.date).getTime())
                if (!trendsByIndex.has(i)) trendsByIndex.set(i, {})
                trendsByIndex.get(i)![`trend_${metric}`] = val
            })
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
            const getValue = (d: any, k: string) => {
                const v = d[k] ?? d.custom_metrics?.[k]
                return (v === undefined || v === null) ? null : v
            }

            // 1. Current Period Data (Use processedData directly as it contains computed metrics like adjusted_score)
            // 'processedData' is already filtered to the selected timeRange/dateRange and sorted.
            const currentValues = processedData
                .map(d => getValue(d, metric))
                .filter(v => typeof v === 'number' && !isNaN(v)) as number[]

            const currentAvg = currentValues.length > 0 ? currentValues.reduce((a, b) => a + b, 0) / currentValues.length : 0

            // Helper: Compute Metric for Previous Data (which is raw initialData)
            // We use the CURRENT view's step normalization (min/max) to ensure fair comparison.
            // Recalculate stats from processedData for safety within this scope
            const stepValues = processedData
                .map(d => d.step_count)
                .filter(v => typeof v === 'number' && !isNaN(v)) as number[]
            const minSteps = stepValues.length > 0 ? Math.min(...stepValues) : 0
            const maxSteps = stepValues.length > 0 ? Math.max(...stepValues) : 0

            const getComputedValue = (d: any, key: string) => {
                if (key === 'adjusted_score') {
                    // Replicate logic from processedData EXACTLY
                    const base = d.custom_metrics?.composite_score ?? 0
                    let stepFactor = 0

                    const sVal = d.step_count
                    if (typeof sVal === 'number' && !isNaN(sVal) && stepValues.length > 0) {
                        if (maxSteps === minSteps) {
                            stepFactor = 0
                        } else {
                            const normalized = (sVal - minSteps) / (maxSteps - minSteps)
                            stepFactor = normalized * 3
                        }
                    }
                    return Math.max(0, base - stepFactor)
                }
                return getValue(d, key)
            }

            // 2. Previous Period Data Setup
            let prevStart: Date
            let prevEnd: Date
            const now = new Date()

            // Derive Current Start/End from processedData to allow precise previous calculation
            // Fallback to logic if processedData is empty
            let cStart: Date
            let cEnd: Date

            if (processedData.length > 0) {
                cStart = startOfDay(parseISO(processedData[0].date))
                cEnd = endOfDay(parseISO(processedData[processedData.length - 1].date))
            } else {
                cEnd = endOfDay(now)
                if (timeRange === '7d') cStart = subDays(now, 7)
                else if (timeRange === '30d') cStart = subDays(now, 30)
                else if (timeRange === '3m') cStart = subDays(now, 90)
                else if (timeRange === 'all') cStart = subDays(now, 30)
                else cStart = subDays(now, 30)
                // Custom is handled by processedData check mostly, keeping fallbacks safe
            }

            if (timeRange === 'all') {
                prevEnd = subDays(cStart, 1)
                prevStart = new Date(0)
            } else {
                const duration = differenceInDays(cEnd, cStart) + 1
                prevEnd = subDays(cStart, 1)
                prevStart = subDays(cStart, duration)
            }

            const pStart = startOfDay(prevStart)
            const pEnd = endOfDay(prevEnd)

            const prevData = initialData.filter(item => {
                const d = parseISO(item.date)
                return d >= pStart && d <= pEnd
            })
            // Use getComputedValue here!
            const prevValues = prevData.map(d => getComputedValue(d, metric)).filter(v => typeof v === 'number' && !isNaN(v)) as number[]

            // 3. Calculate "Period Change" (Linear Regression on Current Data)
            // "Percentage of how the data changed in the timeframe that you can see"
            let periodTrendPct = 0
            let periodTrendStatus = 'stable'

            if (currentValues.length >= 2) {
                // Map to [x, y] for regression. x = index.
                const dataPoints = currentValues.map((val, idx) => [idx, val])
                const { m, b } = linearRegression(dataPoints)

                // Start Value (y at x=0)
                const startVal = b
                // End Value (y at x=n-1)
                const endVal = m * (currentValues.length - 1) + b

                // Avoid division by zero-ish numbers
                const safeStart = Math.abs(startVal) < 0.01 ? 0.01 : startVal

                // Calculate percentage change over the period
                // Note: If startVal is very small, this can explode.
                // Logic: (End - Start) / Start
                periodTrendPct = ((endVal - startVal) / safeStart) * 100

                if (Math.abs(periodTrendPct) < 1) periodTrendStatus = 'stable'
                else if (periodTrendPct > 0) periodTrendStatus = config.invert ? 'worsening' : 'improving'
                else periodTrendStatus = config.invert ? 'improving' : 'worsening'
            }

            // 4. Calculate "Comparison Change" (Current Avg vs Previous Avg)
            let compareTrendPct = 0
            let compareTrendStatus = 'insufficient_data'

            if (prevValues.length > 0) {
                const trendPrevAvg = prevValues.reduce((a, b) => a + b, 0) / prevValues.length
                const denominator = Math.abs(trendPrevAvg) < 1 ? 1 : Math.abs(trendPrevAvg)
                const diff = currentAvg - trendPrevAvg
                compareTrendPct = (diff / denominator) * 100

                if (Math.abs(compareTrendPct) < 1) compareTrendStatus = 'stable'
                else if (compareTrendPct > 0) compareTrendStatus = config.invert ? 'worsening' : 'improving'
                else compareTrendStatus = config.invert ? 'improving' : 'worsening'
            }

            return {
                key: metric,
                label: config.label,
                unit: config.unit,
                avg: currentAvg,

                // Badge 1: Period Trend (Change within selected view)
                periodTrendPct,
                periodTrendStatus,

                // Badge 2: Comparison Trend (Change vs History)
                compareTrendPct,
                compareTrendStatus,
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
                    {(['7d', '30d', '3m', 'all'] as TimeRange[]).map((r) => {
                        const rangeMap: Record<string, string> = { '7d': 'd7', '30d': 'd30', '3m': 'm3', 'all': 'all' }
                        const labelKey = 'dashboard.time_ranges.' + rangeMap[r]
                        return (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                    timeRange === r
                                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t(labelKey as any)}
                            </button>
                        )
                    })}

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
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xl font-bold tracking-tight mr-2">
                                            {stat.periodTrendStatus === 'stable' ? t('dashboard.status.stable') :
                                                (stat.periodTrendStatus === 'improving' ? t('dashboard.status.improving') : t('dashboard.status.declining'))}
                                        </span>

                                        {/* Badge 1: Period Trend (Visible Range) */}
                                        <Badge variant="outline" className={cn(
                                            stat.periodTrendStatus === 'improving' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
                                            stat.periodTrendStatus === 'worsening' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
                                            stat.periodTrendStatus === 'stable' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                                        )}>
                                            <span className="text-[10px] mr-1 opacity-70">Trend:</span>
                                            {stat.periodTrendStatus === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                                            {stat.periodTrendStatus !== 'stable' && stat.periodTrendPct > 0 && <TrendingUp className="w-3 h-3 mr-1" />}
                                            {stat.periodTrendStatus !== 'stable' && stat.periodTrendPct < 0 && <TrendingDown className="w-3 h-3 mr-1" />}
                                            {Math.abs(stat.periodTrendPct).toFixed(0)}%
                                        </Badge>

                                        {/* Badge 2: Comparison Trend (vs Previous) */}
                                        <Badge variant="outline" className={cn(
                                            stat.compareTrendStatus === 'improving' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
                                            stat.compareTrendStatus === 'worsening' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
                                            stat.compareTrendStatus === 'stable' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
                                            stat.compareTrendStatus === 'insufficient_data' && "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                                        )}>
                                            <span className="text-[10px] mr-1 opacity-70">vs Prev:</span>
                                            {stat.compareTrendStatus === 'insufficient_data' ? (
                                                <span className="text-[10px]">No Data</span>
                                            ) : (
                                                <>
                                                    {stat.compareTrendStatus === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                                                    {stat.compareTrendStatus !== 'stable' && stat.compareTrendPct > 0 && <TrendingUp className="w-3 h-3 mr-1" />}
                                                    {stat.compareTrendStatus !== 'stable' && stat.compareTrendPct < 0 && <TrendingDown className="w-3 h-3 mr-1" />}
                                                    {Math.abs(stat.compareTrendPct).toFixed(0)}%
                                                </>
                                            )}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                    <div className="flex items-center gap-4 self-start">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="compare-mode"
                                checked={isCompareMode}
                                onCheckedChange={(checked) => {
                                    setIsCompareMode(checked)
                                    // If turning off compare mode, enforce single selection
                                    if (!checked && selectedMetrics.length > 1) {
                                        setSelectedMetrics([selectedMetrics[0]])
                                    }
                                }}
                            />
                            <Label htmlFor="compare-mode" className="text-xs text-muted-foreground hidden md:block">Compare</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch id="trend-mode" checked={showTrend} onCheckedChange={setShowTrend} />
                            <Label htmlFor="trend-mode" className="text-xs text-muted-foreground hidden md:block">{t('dashboard.trend_mode')}</Label>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs w-[200px] justify-between">
                                    {selectedMetrics.length === 1
                                        ? getMetricConfig(selectedMetrics[0]).label
                                        : (selectedMetrics.length + " " + t('dashboard.metrics_selected'))
                                    }
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel>{isCompareMode ? t('dashboard.metrics_dropdown') : 'Select Metric'}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableMetrics.map((m) => {
                                    const isSelected = selectedMetrics.includes(m.value)
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={m.value}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                                if (isCompareMode) {
                                                    // Multi-select Mode (Max 2)
                                                    if (checked) {
                                                        if (selectedMetrics.length < 2) {
                                                            setSelectedMetrics([...selectedMetrics, m.value])
                                                        }
                                                    } else {
                                                        if (selectedMetrics.length > 1) {
                                                            setSelectedMetrics(selectedMetrics.filter(id => id !== m.value))
                                                        }
                                                    }
                                                } else {
                                                    // Single-select Mode
                                                    if (checked) {
                                                        // Replace current selection with new one
                                                        setSelectedMetrics([m.value])
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

                <CardContent className="h-[400px] w-full pt-4 relative">
                    {/* Step Data Warning Overlay */}
                    {selectedMetrics.includes('step_count') && processedData.every(d => !d.step_count) && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-[1px] rounded-b-xl">
                            <div className="bg-background border border-border shadow-lg rounded-xl p-6 max-w-sm text-center">
                                <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-footprints"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 11 3.8 11 8c0 2.85-2.92 5.5-3.8 7.18L7 16z" /><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 13 7.8 13 12c0 2.85 2.92 5.5 3.8 7.18L17 20z" /></svg>
                                </div>
                                <h3 className="font-semibold text-lg mb-2">No Step Data Found</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Upload your Apple Health data to see your daily steps and adjusted health score.
                                </p>
                                <Button asChild size="sm">
                                    <Link href="/upload">Upload Data</Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                {selectedMetrics.map((metric, i) => {
                                    const config = getMetricConfig(metric)
                                    return (
                                        <linearGradient key={metric} id={'colorMetric-' + metric} x1="0" y1="0" x2="0" y2="1">
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
                                                const val = d[metric] ?? d.custom_metrics?.[metric];
                                                return (val === null || val === undefined || isNaN(val)) ? null : val;
                                            }}
                                            name={metric}
                                            stroke={config.color}
                                            strokeOpacity={showTrend ? 0.3 : 1}
                                            fillOpacity={showTrend ? 0.1 : 1}
                                            fill={'url(#colorMetric-' + metric + ')'}
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
                                                const val = d[metric] ?? d.custom_metrics?.[metric];
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
                                    key={'trend-' + metric}
                                    yAxisId={metric}
                                    type="monotone"
                                    dataKey={'trend_' + metric}
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
