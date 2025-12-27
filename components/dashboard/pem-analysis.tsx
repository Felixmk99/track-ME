'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, Activity, Footprints, Heart, AlertCircle, Info, TrendingUp, Target, Settings2 } from "lucide-react"
import { parseISO, subDays, addDays, isSameDay, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { useLanguage } from '@/components/providers/language-provider'
import { calculateBaselineStats, extractEpochs, calculateZScores, aggregateEpochs, analyzePreCrashPhase, analyzeRecoveryPhase, analyzeCrashPhase } from "@/lib/statistics/pem-cycle"
import { PSTHChart } from "@/components/charts/psth-chart"

interface PEMAnalysisProps {
    data: any[]
    filterRange?: { start: Date, end: Date } | null
}

interface CycleAnalysisResult {
    noCrashes: boolean
    filterApplied: boolean
    episodeCount?: number
    aggregatedProfile?: any[]
    phase1?: any
    phase2?: any
    phase3?: any
}

export function PEMAnalysis({ data, filterRange }: PEMAnalysisProps) {
    const { t } = useLanguage()

    const analysis: CycleAnalysisResult | null = useMemo(() => {
        if (!data || data.length < 10) return null

        // Sort data
        const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // 1. Identify Crashes & Episodes
        const crashIndices: number[] = []
        const episodeIndices = new Set<number>()

        // Find all crash starts (Day 0 of an episode)
        let inCrash = false
        sorted.forEach((d, i) => {
            const isCrash = d.custom_metrics?.Crash == 1 || d.custom_metrics?.crash == 1
            if (isCrash) {
                if (!inCrash) {
                    crashIndices.push(i) // Start of episode
                    inCrash = true
                }
                episodeIndices.add(i)
            } else {
                inCrash = false
            }
        })

        if (crashIndices.length === 0) return { noCrashes: true, filterApplied: !!filterRange }

        // 2. Define Baseline Data (Exclude crashes + buffer?)
        // Simple: Baseline = All non-crash days
        const baselineData = sorted.filter((_, i) => !episodeIndices.has(i))

        // 3. Calculate Global Stats (Mean/Std) for Z-Scores
        // Note: added composite_score and Crash flags to metrics
        const metrics = ['step_count', 'exertion_score', 'hrv', 'composite_score', 'resting_heart_rate', 'Crash', 'crash']
        const baselineStats = calculateBaselineStats(baselineData, metrics)

        // 4. Extract Epochs & Z-Scores
        // Filter crashIndices by range if needed
        const filteredCrashIndices = !filterRange ? crashIndices : crashIndices.filter(i => {
            const date = startOfDay(parseISO(sorted[i].date))
            const rangeStart = startOfDay(filterRange.start)
            const rangeEnd = endOfDay(filterRange.end)
            return date >= rangeStart && date <= rangeEnd
        })

        if (filteredCrashIndices.length === 0) return { noCrashes: true, filterApplied: !!filterRange }

        const epochs = extractEpochs(sorted, filteredCrashIndices, metrics)
        const zScoreEpochs = calculateZScores(epochs, baselineStats)
        const aggregatedProfile = aggregateEpochs(zScoreEpochs, metrics)

        // 5. Run Targeted Analysis
        const phase1 = analyzePreCrashPhase(aggregatedProfile)
        const phase2 = analyzeCrashPhase(zScoreEpochs, baselineStats)
        const phase3 = analyzeRecoveryPhase(aggregatedProfile)

        return {
            noCrashes: false,
            episodeCount: filteredCrashIndices.length,
            aggregatedProfile,
            phase1,
            phase2,
            phase3,
            filterApplied: !!filterRange
        }
    }, [data, filterRange])

    if (!analysis || analysis.noCrashes) {
        return (
            <Card className="border-l-4 border-l-green-500 bg-green-50/10 dark:bg-green-950/10">
                <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        No PEM Clusters Detected
                    </CardTitle>
                    <CardDescription>
                        {analysis?.filterApplied
                            ? "No crashes detected in the selected timeframe."
                            : "You don't have enough crash data to perform a full Cycle Analysis yet."}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 1. Visualization: The Shape of the Crash */}
            <PSTHChart
                data={analysis.aggregatedProfile || []}
                avgRecoveryDays={analysis.phase3?.avgRecoveryDays}
            />

            {/* 2. Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PRE-CRASH (Trigger) */}
                <Card className="border-l-4 border-l-orange-500 bg-card/50">
                    <CardHeader className="py-4 pb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-500 uppercase tracking-widest">
                            <TrendingUp className="w-4 h-4" />
                            Phase 1: Buildup
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {analysis.phase1?.delayedTriggerDetected ? (
                                <div className="text-base font-medium">
                                    Delayed Trigger Detected <Badge variant="destructive" className="ml-1">Acute</Badge>
                                </div>
                            ) : analysis.phase1?.cumulativeLoadDetected ? (
                                <div className="text-base font-medium">
                                    Cumulative Strain Detected
                                </div>
                            ) : (
                                <div className="text-base font-medium text-muted-foreground">
                                    No clear trigger pattern
                                </div>
                            )}

                            <p className="text-sm text-muted-foreground">
                                {analysis.phase1?.delayedTriggerDetected
                                    ? `Significant exertion spike detected ${Math.abs(analysis.phase1?.triggerLag || 0)} days before crash.`
                                    : "No acute spikes found. Monitoring for slow burnout."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* CRASH EVENT (Profile) */}
                <Card className="border-l-4 border-l-red-500 bg-card/50">
                    <CardHeader className="py-4 pb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-red-500 uppercase tracking-widest">
                            <Target className="w-4 h-4" />
                            Phase 2: The Event
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-base font-medium">
                            {analysis.phase2?.type || 'Unknown'}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Avg Duration: <strong>{(analysis.phase2?.avgDuration || 0).toFixed(1)} Days</strong>
                            <br />
                            Intensity: {(analysis.phase2?.severityAUC || 0).toFixed(1)} AUC
                        </p>
                    </CardContent>
                </Card>

                {/* RECOVERY */}
                <Card className="border-l-4 border-l-blue-500 bg-card/50">
                    <CardHeader className="py-4 pb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-500 uppercase tracking-widest">
                            <Settings2 className="w-4 h-4" />
                            Phase 3: Recovery
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Symptom Recovery:</span>
                                <span className="font-bold">Day {analysis.phase3?.avgRecoveryDays || 0}</span>
                            </div>
                            {analysis.phase3?.hysteresisDetected && (
                                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
                                    <strong className="block mb-0.5">⚠️ Hysteresis Warning</strong>
                                    HRV normalizes before you actually feel better. Don't resume activity too early.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2 max-w-2xl mx-auto">
                * Analysis based on <strong>{analysis.episodeCount} crash episodes</strong> using Superposed Epoch Analysis (SEA).
            </p>
        </div>
    )
}
