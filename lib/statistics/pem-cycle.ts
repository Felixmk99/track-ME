export interface MetricData {
    date: string
    value: number
}

import { mean, standardDeviation } from 'simple-statistics'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

// Helper for baseline stats
export function calculateBaselineStats(data: any[], metrics: string[]) {
    const stats: Record<string, { mean: number, std: number }> = {}

    metrics.forEach(key => {
        const values = data.map(d => {
            const val = d[key] ?? d.custom_metrics?.[key] ?? null
            return (typeof val === 'number') ? val : null
        }).filter((v): v is number => v !== null)

        if (values.length > 1) {
            stats[key] = {
                mean: mean(values),
                std: standardDeviation(values)
            }
        } else {
            // Check for non-numeric but boolean-like if it's 'Crash'
            if (key.toLowerCase() === 'crash') {
                stats[key] = { mean: 0, std: 1 } // Safe default for flags
            } else {
                stats[key] = { mean: 0, std: 0 }
            }
        }
    })
    return stats
}

export interface CycleEpoch {
    crashDate: string
    startIndex: number // Index in the original sorted data array
    data: {
        dayOffset: number // -7 to +7 (or +14) relative to crash
        date: string
        metrics: Record<string, number | null>
        zScores: Record<string, number | null>
    }[]
}

export interface CycleAnalysisResult {
    epochs: CycleEpoch[]
    aggregatedProfile: {
        dayOffset: number
        metrics: Record<string, { mean: number, std: number, n: number }>
    }[]
    findings: {
        preCrash: {
            delayedTriggerDetected: boolean
            cumulativeLoadDetected: boolean
            triggerLag: number
            confidence: number
        }
        crashPhase: {
            type: 'Type A (Dip)' | 'Type B (Burnout)' | 'Mixed'
            avgDuration: number
            severityAUC: number
        }
        recovery: {
            avgRecoveryDays: number
            hysteresisDetected: boolean
        }
    }
}

const EPOCH_PRE_DAYS = 7
const EPOCH_POST_DAYS = 14

/**
 * Extracts event-aligned windows (Epochs) around each crash start date.
 */
export function extractEpochs(
    sortedData: any[],
    crashIndices: number[],
    metricsToAnalyze: string[]
): CycleEpoch[] {
    const epochs: CycleEpoch[] = []

    crashIndices.forEach(crashIdx => {
        const crashDate = sortedData[crashIdx].date
        const epochData = []

        // Extract window from -PRE to +POST
        for (let i = -EPOCH_PRE_DAYS; i <= EPOCH_POST_DAYS; i++) {
            const targetIdx = crashIdx + i
            if (targetIdx >= 0 && targetIdx < sortedData.length) {
                const row = sortedData[targetIdx]
                const metrics: Record<string, number | null> = {}

                metricsToAnalyze.forEach(key => {
                    const val = row[key] ?? row.custom_metrics?.[key] ?? null
                    if (typeof val === 'number') {
                        metrics[key] = val
                    } else if (val === '1' || val === 1 || val === true) {
                        metrics[key] = 1
                    } else if (val === '0' || val === 0 || val === false) {
                        metrics[key] = 0
                    } else {
                        metrics[key] = null
                    }
                })

                epochData.push({
                    dayOffset: i,
                    date: row.date,
                    metrics,
                    zScores: {}
                })
            }
        }

        if (epochData.length > 0) {
            epochs.push({
                crashDate,
                startIndex: crashIdx,
                data: epochData
            })
        }
    })

    return epochs
}

/**
 * Calculates Z-Scores
 */
export function calculateZScores(
    epochs: CycleEpoch[],
    baselineStats: Record<string, { mean: number, std: number }>
): CycleEpoch[] {
    return epochs.map(epoch => {
        const newData = epoch.data.map(day => {
            const zScores: Record<string, number | null> = {}
            for (const [key, val] of Object.entries(day.metrics)) {
                if (val !== null && baselineStats[key]) {
                    const { mean: bMean, std: bStd } = baselineStats[key]
                    if (bStd > 0) {
                        zScores[key] = (val - bMean) / bStd
                    } else {
                        // Any increase from a zero-variance baseline is 2 sigma
                        zScores[key] = val > bMean ? 2 : 0
                    }
                } else {
                    zScores[key] = 0
                }
            }
            return { ...day, zScores }
        })
        return { ...epoch, data: newData }
    })
}

/**
 * Superposed Epoch Analysis (SEA)
 */
export function aggregateEpochs(epochs: CycleEpoch[], metrics: string[]) {
    const aggregation: Record<number, { count: number, sums: Record<string, number>, sqSums: Record<string, number> }> = {}

    for (let i = -EPOCH_PRE_DAYS; i <= EPOCH_POST_DAYS; i++) {
        aggregation[i] = { count: 0, sums: {}, sqSums: {} }
        metrics.forEach(m => {
            aggregation[i].sums[m] = 0
            aggregation[i].sqSums[m] = 0
        })
    }

    epochs.forEach(epoch => {
        epoch.data.forEach(day => {
            if (aggregation[day.dayOffset]) {
                const node = aggregation[day.dayOffset]
                metrics.forEach(m => {
                    const val = day.zScores[m]
                    if (val !== null && !isNaN(val)) {
                        node.sums[m] += val
                        node.sqSums[m] += (val * val)
                    }
                })
                node.count++
            }
        })
    })

    const result = []
    for (let i = -EPOCH_PRE_DAYS; i <= EPOCH_POST_DAYS; i++) {
        const node = aggregation[i]
        const metricsResult: Record<string, any> = {}

        metrics.forEach(m => {
            if (node.count > 0) {
                const meanVal = node.sums[m] / node.count
                const variance = (node.sqSums[m] / node.count) - (meanVal * meanVal)
                metricsResult[m] = {
                    mean: meanVal,
                    std: Math.sqrt(Math.max(0, variance)),
                    n: node.count
                }
            } else {
                metricsResult[m] = { mean: 0, std: 0, n: 0 }
            }
        })
        result.push({ dayOffset: i, metrics: metricsResult })
    }
    return result
}

/**
 * Phase 1 Analysis: Detect Triggers
 */
export function analyzePreCrashPhase(aggregatedProfile: any[]) {
    const exertionProfile = aggregatedProfile.filter(d => d.dayOffset < 0).map(d => ({
        offset: d.dayOffset,
        mean: d.metrics['exertion_score']?.mean || 0
    }))

    const acuteSpike = exertionProfile.find(d => d.offset >= -2 && d.mean > 1.5)
    const cumulativeAvg = exertionProfile.filter(d => d.offset >= -5).reduce((a, b) => a + b.mean, 0) / (exertionProfile.filter(d => d.offset >= -5).length || 1)

    return {
        delayedTriggerDetected: !!acuteSpike,
        cumulativeLoadDetected: cumulativeAvg > 0.5,
        triggerLag: acuteSpike ? acuteSpike.offset : (cumulativeAvg > 0.5 ? -1 : 0),
        confidence: acuteSpike ? 0.8 : (cumulativeAvg > 0.5 ? 0.6 : 0)
    }
}

/**
 * Phase 3 Analysis: Recovery & Hysteresis
 */
export function analyzeRecoveryPhase(aggregatedProfile: any[]) {
    const findRecoveryDay = (metric: string) => {
        const post = aggregatedProfile.filter(d => d.dayOffset > 0)
        for (const day of post) {
            if (metric === 'hrv') {
                if (day.metrics[metric]?.mean > -0.5) return day.dayOffset
            } else {
                if (day.metrics[metric]?.mean < 0.5) return day.dayOffset
            }
        }
        return 14
    }

    const symptomRecovery = findRecoveryDay('composite_score')
    const hrvRecovery = findRecoveryDay('hrv')

    return {
        avgRecoveryDays: symptomRecovery,
        hysteresisDetected: hrvRecovery < symptomRecovery
    }
}

/**
 * Phase 2 Analysis: The Event
 */
export function analyzeCrashPhase(epochs: CycleEpoch[], baselineStats: Record<string, { mean: number, std: number }>) {
    const crashes = epochs.map(epoch => {
        let duration = 0
        let severitySum = 0
        let peakSeverity = 0

        for (let i = 0; i <= 14; i++) {
            const day = epoch.data.find(d => d.dayOffset === i)
            if (!day) break

            const isLabeled = day.metrics['Crash'] === 1 || day.metrics['crash'] === 1
            const z = day.zScores['composite_score'] || 0

            if (isLabeled) duration++

            if (isLabeled || z > 0.5) {
                severitySum += z
                if (z > peakSeverity) peakSeverity = z
            }

            if (i > 0 && !isLabeled && z <= 0.5) break
        }
        return { duration, severitySum, peakSeverity }
    })

    if (crashes.length === 0) return { type: 'Mixed', avgDuration: 0, severityAUC: 0 }

    const avgDuration = crashes.reduce((a, b) => a + b.duration, 0) / crashes.length
    const avgSeverity = crashes.reduce((a, b) => a + b.peakSeverity, 0) / crashes.length

    let type: 'Type A (Dip)' | 'Type B (Burnout)' | 'Mixed' = 'Mixed'
    if (avgDuration < 3 && avgSeverity > 1.5) type = 'Type A (Dip)'
    else if (avgDuration >= 3) type = 'Type B (Burnout)'

    return {
        type,
        avgDuration,
        severityAUC: crashes.reduce((a, b) => a + b.severitySum, 0) / crashes.length
    }
}
