import { Database } from "@/types/database.types";

type HealthMetric = Database['public']['Tables']['health_metrics']['Row'];

/**
 * Calculates a Composite Health Score (0-100) based on available metrics.
 * 
 * Logic:
 * - Symptom Score (0-3): Lower is better. 0 = Best, 3 = Worst.
 * - HRV (ms): Higher is better. 
 */
export function calculateHealthScore(metric: Partial<HealthMetric>): number | null {
    const { symptom_score, hrv } = metric;

    if (symptom_score === null && hrv === null) return null;

    let components = 0;
    let totalScore = 0;

    // 1. Symptom Score Component (Weighted 60%)
    // Range 0 (Good) to 3 (Bad) -> Convert to 100 (Good) to 0 (Bad)
    if (symptom_score !== null && symptom_score !== undefined) {
        // Determine max scale. Visible uses 0-3.
        // Normalized = (1 - (Score / Max)) * 100
        const maxScore = 3;
        // Clamp score just in case
        const clampedScore = Math.min(Math.max(symptom_score, 0), maxScore);
        const normalizedSymptoms = (1 - (clampedScore / maxScore)) * 100;

        totalScore += normalizedSymptoms * 0.6;
        components += 0.6;
    }

    // 2. HRV Component (Weighted 40%)
    // Range ~15 (Bad) to ~100 (Good).
    if (hrv !== null && hrv !== undefined) {
        const minHRV = 15;
        const maxHRV = 100; // Cap at 100 for normalization
        const clampedHRV = Math.min(Math.max(hrv, minHRV), maxHRV);
        const normalizedHRV = ((clampedHRV - minHRV) / (maxHRV - minHRV)) * 100;

        // Adjust weight if symptoms area available or not
        const weight = (symptom_score !== null && symptom_score !== undefined) ? 0.4 : 1.0;
        totalScore += normalizedHRV * weight;
        components += weight;
    }

    if (components === 0) return null;

    return Math.round(totalScore / components);
}

/**
 * Trends Calculator
 * Returns the % change between current and previous period.
 */
export function calculateTrend(current: number, previous: number): number {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
}
