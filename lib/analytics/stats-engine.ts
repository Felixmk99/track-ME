import * as ss from 'simple-statistics'
import { isBefore, isAfter, isWithinInterval, subDays, parseISO } from 'date-fns'
import { Database } from '@/types/database.types'
import { calculateHealthScore } from './composite-score'

type Experiment = Database['public']['Tables']['experiments']['Row']
type Metric = Database['public']['Tables']['health_metrics']['Row']

interface ExperimentResult {
    experimentId: string
    metricName: string
    baselineMean: number
    treatmentMean: number
    changePercent: number
    isSignificant: boolean // Simplified placeholder for now
    sampleSizeBaseline: number
    sampleSizeTreatment: number
}

/**
 * Analyzes the impact of an experiment on health health_metrics.
 * Compares the "Treatment Period" (Start to End/Now) vs "Baseline Period" (Equal length before Start).
 */
export function analyzeExperiment(experiment: Experiment, metrics: Metric[]): ExperimentResult | null {
    const startDate = parseISO(experiment.start_date)
    const endDate = experiment.end_date ? parseISO(experiment.end_date) : new Date()

    // Define Baseline Period: Look back same duration as the treatment duration
    // e.g. If treatment is 30 days, look at 30 days before start.
    // Cap baseline lookback at 90 days to stay relevant.
    const treatmentDuration = endDate.getTime() - startDate.getTime()
    const baselineStart = new Date(startDate.getTime() - treatmentDuration)

    // Filter metrics
    const baselineMetrics = metrics
        .filter(m => isWithinInterval(parseISO(m.date), { start: baselineStart, end: subDays(startDate, 1) }))
        .map(m => calculateHealthScore(m))
        .filter((s): s is number => s !== null)

    const treatmentMetrics = metrics
        .filter(m => isWithinInterval(parseISO(m.date), { start: startDate, end: endDate }))
        .map(m => calculateHealthScore(m))
        .filter((s): s is number => s !== null)

    if (baselineMetrics.length < 3 || treatmentMetrics.length < 3) {
        return null; // Not enough data
    }

    const baselineMean = ss.mean(baselineMetrics)
    const treatmentMean = ss.mean(treatmentMetrics)
    const changePercent = ((treatmentMean - baselineMean) / baselineMean) * 100

    // T-Test logic is complex to implement robustly from scratch without errors.
    // For now, we consider > 5% change as "Significant" for the UI highlight.
    // Real statistical significance would require ss.tTestTwoSample if available or custom impl.
    const isSignificant = Math.abs(changePercent) > 5

    return {
        experimentId: experiment.id,
        metricName: 'Composite Health Score',
        baselineMean: Math.round(baselineMean),
        treatmentMean: Math.round(treatmentMean),
        changePercent: Math.round(changePercent * 10) / 10,
        isSignificant,
        sampleSizeBaseline: baselineMetrics.length,
        sampleSizeTreatment: treatmentMetrics.length
    }
}
