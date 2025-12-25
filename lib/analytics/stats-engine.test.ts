import { analyzeExperiment } from './stats-engine'
import { calculateHealthScore } from './composite-score'

// Mock dependencies if needed, but here we integration test with the pure function logic
// We'll create a helper to generate dummy metrics
const generateMetrics = (count: number, startDay: string, baseScore: number) => {
    const msPerDay = 86400000
    const start = new Date(startDay).getTime()

    return Array.from({ length: count }).map((_, i) => {
        const date = new Date(start + i * msPerDay).toISOString().split('T')[0]
        return {
            id: 'test',
            user_id: 'user',
            date,
            symptom_score: null,
            hrv: baseScore, // Simplified: use HRV as proxy for Health Score
            resting_heart_rate: 60,
            exertion_score: 0,
            custom_metrics: null,
            raw_data: null,
            created_at: new Date().toISOString()
        }
    })
}

describe('analyzeExperiment', () => {
    it('should detect improvement when health score increases', () => {
        // Baseline: 30 days of bad health (HRV 20 ~ Score ~6)
        const baseline = generateMetrics(30, '2023-01-01', 20)
        // Treatment: 30 days of good health (HRV 100 ~ Score 100)
        const treatment = generateMetrics(30, '2023-01-31', 100)

        const allMetrics: any[] = [...baseline, ...treatment]

        const experiment: any = {
            id: 'exp1',
            start_date: '2023-01-31',
            end_date: '2023-03-02'
        }

        const result = analyzeExperiment(experiment, allMetrics)

        expect(result).not.toBeNull()
        expect(result?.baselineMean).toBeLessThan(result?.treatmentMean!)
        expect(result?.isSignificant).toBe(true)
        expect(result?.changePercent).toBeGreaterThan(0)
    })

    it('should return null if insufficient data', () => {
        const metrics = generateMetrics(2, '2023-01-01', 50)
        const experiment: any = {
            start_date: '2023-01-02',
            end_date: '2023-01-05'
        }

        // Not enough baseline days
        expect(analyzeExperiment(experiment, metrics)).toBeNull()
    })
})
