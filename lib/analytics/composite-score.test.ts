import { calculateHealthScore } from './composite-score'

describe('calculateHealthScore', () => {
    it('should return null if both metrics are missing', () => {
        expect(calculateHealthScore({ symptom_score: null, hrv: null })).toBeNull()
    })

    it('should return correct score for perfect health (0 symptoms, 100 HRV)', () => {
        // 0 Symptoms = 100 normalized
        // 100 HRV = 100 normalized
        // (100 * 0.6) + (100 * 0.4) = 100
        const input: any = { symptom_score: 0, hrv: 100 }
        expect(calculateHealthScore(input)).toBe(100)
    })

    it('should return correct score for worst health (3 symptoms, 15 HRV)', () => {
        // 3 Symptoms = 0 normalized
        // 15 HRV = 0 normalized
        // (0 * 0.6) + (0 * 0.4) = 0
        const input: any = { symptom_score: 3, hrv: 15 }
        expect(calculateHealthScore(input)).toBe(0)
    })

    it('should handle only symptom score being present', () => {
        // 0 Symptoms = 100 normalized
        // Normalized by dividing by its own weight: (100 * 0.6) / 0.6 = 100
        const input: any = { symptom_score: 0, hrv: null }
        expect(calculateHealthScore(input)).toBe(100)
    })

    it('should handle only HRV being present', () => {
        // 100 HRV = 100 normalized
        // Weight is 1.0 when symptoms missing
        const input: any = { symptom_score: null, hrv: 100 }
        expect(calculateHealthScore(input)).toBe(100)
    })

    it('should calculate mixed values correctly', () => {
        // Symptoms: 1.5 (Mid) -> Normalized: (1 - 1.5/3)*100 = 50
        // HRV: 57.5 (Mid of 15-100) -> Normalized: 50
        // Score: (50 * 0.6) + (50 * 0.4) = 50
        const input: any = { symptom_score: 1.5, hrv: 57.5 }
        expect(calculateHealthScore(input)).toBeCloseTo(50, 0)
    })

    it('should clamp values outside range', () => {
        // HRV 150 -> Caps at 100 -> Norm 100
        // Symptoms 0 -> Norm 100
        const input: any = { symptom_score: 0, hrv: 150 }
        expect(calculateHealthScore(input)).toBe(100)
    })
})
