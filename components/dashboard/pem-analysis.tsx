'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, Activity, Footprints, Heart, AlertCircle, Info, TrendingUp, Target, Settings2 } from "lucide-react"
import { parseISO, subDays, addDays, isSameDay, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { useLanguage } from '@/components/providers/language-provider'

interface PEMAnalysisProps {
    data: any[]
    filterRange?: { start: Date, end: Date }
}

export function PEMAnalysis({ data, filterRange }: PEMAnalysisProps) {
    const { t } = useLanguage()

    // -- Analysis Logic --
    // 1. Identify "Crash Days" (Crash == 1)
    // 2. Identify "Healthy Days" (Crash == 0 and NOT followed by a crash immediately?)
    //    Actually, "Baseline" = Days that are NOT crash days.
    // 3. For each Crash Day:
    //    - Get Day -1 (Trigger Day).
    //    - Collect metrics for Step Count, Exertion Score, HRV, Stress.
    // 4. Calculate Average of Trigger Days vs Average of Baseline Days.
    // 5. Calculate Delta %.

    // -- Analysis Logic --
    // Iterate Lags 1 to 7 days to find strongest correlations.

    const analysis = useMemo(() => {
        if (!data || data.length < 10) return null

        // Sort data ascending
        const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())


        // Helper to get val
        const getVal = (d: any, key: string) => d[key] ?? d.custom_metrics?.[key] ?? null

        // 1. PRE-CALCULATE DERIVED METRICS FOR EVERY ROW
        const derivedData = sorted.map((d, i) => {
            const getSlice = (days: number) => {
                const start = Math.max(0, i - days + 1)
                return sorted.slice(start, i + 1)
            }

            // Cumulative 3D
            const slice3d = getSlice(3)
            const sumSteps3d = slice3d.reduce((a, b) => a + (getVal(b, 'step_count') || 0), 0)
            const sumExertion3d = slice3d.reduce((a, b) => a + (getVal(b, 'exertion_score') || 0), 0)

            // ACWR (Acute 7d / Chronic 28d)
            let acwrSteps = null
            let acwrExertion = null

            if (i >= 7) {
                const slice7 = getSlice(7)
                const slice28 = getSlice(28)

                const avgSteps7 = slice7.reduce((a, b) => a + (getVal(b, 'step_count') || 0), 0) / 7
                const avgSteps28 = slice28.reduce((a, b) => a + (getVal(b, 'step_count') || 0), 0) / Math.min(i + 1, 28)

                if (avgSteps28 > 0) acwrSteps = avgSteps7 / avgSteps28

                const avgExertion7 = slice7.reduce((a, b) => a + (getVal(b, 'exertion_score') || 0), 0) / 7
                const avgExertion28 = slice28.reduce((a, b) => a + (getVal(b, 'exertion_score') || 0), 0) / Math.min(i + 1, 28)

                if (avgExertion28 > 0) acwrExertion = avgExertion7 / avgExertion28
            }

            return {
                ...d,
                derived: {
                    cumulative_steps_3d: sumSteps3d,
                    cumulative_exertion_3d: sumExertion3d,
                    acwr_steps: acwrSteps,
                    acwr_exertion: acwrExertion
                }
            }
        })

        // 2. IDENTIFY EPISODES
        const crashIndices = new Set<number>()
        const episodes: { start: number, end: number, length: number }[] = []

        let currentStart = -1

        derivedData.forEach((d, i) => {
            const isCrash = d.custom_metrics?.Crash === 1 || d.custom_metrics?.Crash === "1"
            if (isCrash) {
                crashIndices.add(i)
                if (currentStart === -1) currentStart = i
            } else {
                if (currentStart !== -1) {
                    episodes.push({ start: currentStart, end: i - 1, length: (i - 1) - currentStart + 1 })
                    currentStart = -1
                }
            }
        })
        // Handle crash at very end of data
        if (currentStart !== -1) {
            episodes.push({ start: currentStart, end: derivedData.length - 1, length: (derivedData.length - 1) - currentStart + 1 })
        }

        // FILTER EPISODES BY RANGE (if provided)
        const activeEpisodes = !filterRange ? episodes : episodes.filter(ep => {
            const epStartDate = parseISO(derivedData[ep.start].date)
            const epEndDate = parseISO(derivedData[ep.end].date)
            // Check overlap
            return (epStartDate <= filterRange.end && epEndDate >= filterRange.start)
        })

        if (activeEpisodes.length === 0) return { noCrashes: true, filterApplied: !!filterRange }

        // 3. DEFINE ZONES & CALCULATE BASELINE
        const triggerIndices = new Set<number>() // 7 days before Episode Start
        const recoveryIndices = new Set<number>() // 7 days after Episode End
        const episodeIndices = new Set<number>() // Days inside episodes

        // Note: We use ACTIVE episodes for stats, but we should probably exclude ALL episodes from Baseline to keep it pure?
        // User Request: "Restricted to selected timeframe".
        // If I exclude visible episodes from baseline, but include invisible episodes in baseline?
        // Actually, Baseline should be "Global Non-Crash". So pass ALL episodes to exclusion logic?
        // But Analysis logic iterates 'episodes'. It should iterate 'activeEpisodes'.

        const allEpisodeIndices = new Set<number>()
        episodes.forEach(ep => {
            for (let i = ep.start; i <= ep.end; i++) allEpisodeIndices.add(i)
        })


        const activeEpisodeIndices = new Set<number>() // For 'During' analysis

        activeEpisodes.forEach(ep => {
            for (let i = ep.start; i <= ep.end; i++) activeEpisodeIndices.add(i)
            for (let i = 1; i <= 7; i++) {
                if (ep.start - i >= 0) triggerIndices.add(ep.start - i)
                if (ep.end + i < derivedData.length) recoveryIndices.add(ep.end + i)
            }
        })

        // Strict Baseline: Days NOT in ANY crash, and NOT in ACTIVE trigger/recovery zones
        // (We could exclude ALL trigger/recovery zones too, but simplest is exclude ALL crashes)
        const baselineData = derivedData.filter((_, i) =>
            !allEpisodeIndices.has(i) && !triggerIndices.has(i) && !recoveryIndices.has(i)
        )

        const metrics = ['step_count', 'exertion_score', 'hrv', 'resting_heart_rate']
        const advMetrics = [...metrics, 'cumulative_steps_3d', 'cumulative_exertion_3d', 'acwr_steps', 'acwr_exertion']

        const baselineStats: Record<string, number> = {}
        advMetrics.forEach(m => {
            const isDerived = !metrics.includes(m)
            const vals = baselineData.map(d => isDerived ? d.derived[m] : getVal(d, m)).filter(v => typeof v === 'number') as number[]
            baselineStats[m] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
        })

        // Helper for Delta
        const calcDelta = (val: number, base: number) => {
            if (Math.abs(base) < 0.01) return 0
            return ((val - base) / base) * 100
        }

        // 4. ANALYZE PHASES (Use activeEpisodes)

        // A. TRIGGERS (Pre-Crash) -> Uses Advanced Metrics
        const triggerFindings: any[] = []
        advMetrics.forEach(metricKey => {
            const isDerived = !metrics.includes(metricKey)
            let bestLag = -1
            let maxDelta = 0
            let bestPreAvg = 0

            for (let lag = 1; lag <= 7; lag++) {
                // Collect values: Only from days strictly 'lag' before EPISODE START
                const triggerVals: number[] = []
                activeEpisodes.forEach(ep => {
                    const idx = ep.start - lag
                    if (idx >= 0) {
                        const row = derivedData[idx]
                        const val = isDerived ? row.derived[metricKey] : getVal(row, metricKey)
                        if (typeof val === 'number') triggerVals.push(val)
                    }
                })

                if (triggerVals.length === 0) continue
                const avg = triggerVals.reduce((a, b) => a + b, 0) / triggerVals.length
                const base = baselineStats[metricKey]
                const delta = calcDelta(avg, base)

                if (Math.abs(delta) > Math.abs(maxDelta)) {
                    maxDelta = delta
                    bestLag = lag
                    bestPreAvg = avg
                }
            }

            if (bestLag !== -1 && Math.abs(maxDelta) > 5) {
                triggerFindings.push({ key: metricKey, lag: bestLag, delta: maxDelta, val: bestPreAvg, base: baselineStats[metricKey] })
            }
        })

        // B. DURING CRASH -> Uses Basic Metrics
        const duringFindings: any[] = []
        metrics.forEach(metricKey => {
            const vals: number[] = []
            activeEpisodes.forEach(ep => {
                for (let i = ep.start; i <= ep.end; i++) {
                    const v = getVal(derivedData[i], metricKey)
                    if (typeof v === 'number') vals.push(v)
                }
            })
            if (vals.length > 0) {
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length
                const base = baselineStats[metricKey]
                if (Math.abs(calcDelta(avg, base)) > 5) {
                    duringFindings.push({ key: metricKey, delta: calcDelta(avg, base), val: avg, base })
                }
            }
        })

        // C. RECOVERY (7 Days Post) -> Uses Basic Metrics
        const recoveryFindings: any[] = []
        metrics.forEach(metricKey => {
            const vals: number[] = []
            // Collect all recovery days (1-7 days post episode)
            activeEpisodes.forEach(ep => {
                for (let i = 1; i <= 7; i++) {
                    const idx = ep.end + i
                    if (idx < derivedData.length) {
                        const v = getVal(derivedData[idx], metricKey)
                        if (typeof v === 'number') vals.push(v)
                    }
                }
            })
            if (vals.length > 0) {
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length
                const base = baselineStats[metricKey]
                if (Math.abs(calcDelta(avg, base)) > 5) {
                    recoveryFindings.push({ key: metricKey, delta: calcDelta(avg, base), val: avg, base })
                }
            }
        })


        return {
            noCrashes: false,
            triggers: triggerFindings,
            during: duringFindings,
            recovery: recoveryFindings,
            episodeCount: activeEpisodes.length,
            avgEpisodeLen: activeEpisodes.reduce((a, b) => a + b.length, 0) / activeEpisodes.length,
            filterApplied: !!filterRange
        }
    }, [data, filterRange])

    if (!analysis || analysis.noCrashes) {
        return (
            <Card className="border-l-4 border-l-green-500 bg-green-50/10">
                <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        No PEM Clusters Detected
                    </CardTitle>
                    <CardDescription>
                        {analysis?.filterApplied
                            ? "No crashes detected in the selected timeframe."
                            : "You don't have enough crash data to perform a full lifecycle analysis yet."}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    // Enrich with UI config
    const getMetricInfo = (key: string, delta: number) => {
        switch (key) {
            case 'step_count': return {
                label: t('dashboard.metrics.step_count.label') || 'Steps',
                icon: Footprints,
                color: 'text-blue-500',
                isBad: delta > 10,
                unit: '',
                desc: 'Steps'
            }
            case 'exertion_score': return {
                label: t('dashboard.metrics.exertion_score.label') || 'Exertion',
                icon: Activity,
                color: 'text-green-500',
                isBad: delta > 10,
                unit: '',
                desc: 'Exertion'
            }
            case 'hrv': return {
                label: 'HRV',
                icon: Heart,
                color: 'text-rose-500',
                isBad: delta < -5,
                unit: 'ms',
                desc: 'HRV'
            }
            case 'resting_heart_rate': return {
                label: 'Resting HR',
                icon: Heart,
                color: 'text-red-500',
                isBad: delta > 5,
                unit: 'bpm',
                desc: 'Resting HR'
            }
            // NEW ADVANCED METRICS
            case 'cumulative_steps_3d': return {
                label: '3-Day Steps',
                icon: Footprints,
                color: 'text-indigo-500',
                isBad: delta > 10,
                unit: '',
                desc: 'Legacy Load'
            }
            case 'cumulative_exertion_3d': return {
                label: '3-Day Exertion',
                icon: Activity,
                color: 'text-emerald-600',
                isBad: delta > 10,
                unit: '',
                desc: 'Legacy Load'
            }
            case 'acwr_steps': return {
                label: 'Step ACWR',
                icon: TrendingUp,
                color: 'text-orange-500',
                isBad: delta > 10, // ACWR > Baseline usually means spike
                unit: 'x',
                desc: 'Acute Spike'
            }
            case 'acwr_exertion': return {
                label: 'Exertion ACWR',
                icon: TrendingUp,
                color: 'text-orange-500',
                isBad: delta > 10,
                unit: 'x',
                desc: 'Acute Spike'
            }
            default: return { label: key, icon: Activity, color: 'text-zinc-500', isBad: false, unit: '', desc: '' }
        }
    }

    // Helper to render a section
    const renderSection = (title: string, items: any[], type: 'trigger' | 'profile' | 'recovery') => {
        if (!items.length) return null
        return (
            <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {type === 'trigger' && <TrendingUp className="w-4 h-4" />}
                    {type === 'profile' && <Target className="w-4 h-4" />}
                    {type === 'recovery' && <Settings2 className="w-4 h-4" />}
                    {title}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {items.map((m: any) => {
                        const info = getMetricInfo(m.key, m.delta)
                        const isSignificant = Math.abs(m.delta) > 10 // Highlight big shifts
                        const formatNum = (n: number) => n.toFixed(m.key.includes('acwr') ? 2 : (m.key === 'step_count' ? 0 : 1))

                        return (
                            <Card key={m.key} className={`border-l-4 ${isSignificant ? 'border-l-zinc-500' : 'border-l-zinc-300'} bg-card/50`}>
                                <CardContent className="pt-4 pb-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <info.icon className={`w-4 h-4 ${info.color}`} />
                                            {info.label}
                                        </div>
                                        {m.lag && <Badge variant="outline" className="text-[10px]">{m.lag}d Prior</Badge>}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-xl font-bold ${m.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {m.delta > 0 ? '+' : ''}{m.delta.toFixed(0)}%
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            vs Baseline
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                                        <div>
                                            <span className="block opacity-70">Observed</span>
                                            <span className="font-semibold">{formatNum(m.val)}</span>
                                        </div>
                                        <div>
                                            <span className="block opacity-70">Normal</span>
                                            <span className="font-semibold">{formatNum(m.base)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {renderSection("1. Pre-Crash Triggers (Predictors)", analysis.triggers || [], 'trigger')}
            {renderSection("2. Crash Profile (During Episode)", analysis.during || [], 'profile')}
            {renderSection("3. Recovery Trajectory (7 Days Post)", analysis.recovery || [], 'recovery')}

            <p className="text-xs text-muted-foreground text-center pt-2 max-w-2xl mx-auto">
                * Analysis based on <strong>{analysis.episodeCount} episodes</strong> (avg length {(analysis.avgEpisodeLen || 0).toFixed(1)} days).
                Baseline is calculated from days outside of crash, trigger, and recovery windows.
            </p>
        </div>
    )
}
