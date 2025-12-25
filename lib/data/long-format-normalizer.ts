import { Database } from "@/types/database.types";

/**
 * Normalizes "Long Format" CSV data from Visible.
 * Each row in CSV is one measurement (e.g. HRV, Symptom, etc.) for a specific date.
 * We need to PIVOT this into one object per Day.
 */
export function normalizeLongFormatData(rows: any[]) {
    const dailyRecords: Record<string, any> = {};

    rows.forEach(row => {
        const date = row['observation_date'];
        const name = row['tracker_name'];
        const value = parseFloat(row['observation_value']);

        if (!date || isNaN(value)) return;

        if (!dailyRecords[date]) {
            dailyRecords[date] = {
                date,
                hrv: null,
                resting_heart_rate: null,
                exertion_score: null,
                custom_metrics: {},
                raw_symptoms: [] // Temp array to calculate composite symptom score later
            };
        }

        const record = dailyRecords[date];

        // Map known metrics
        switch (name) {
            case 'HRV':
                record.hrv = value;
                break;
            case 'Resting HR':
                record.resting_heart_rate = Math.round(value);
                break;
            case 'Stability Score':
                // Note: Visible "Stability" is typically 0-10 or similar.
                // We map it to exertion_score or keep as custom if ambiguous.
                // Let's map to exertion_score for now as a proxy for "Activity Budget"
                record.exertion_score = value;
                break;
            default:
                // Check if it's a symptom to aggregate into "symptom_score"
                // Usually we don't know WHICH are symptoms, but if it has a category like "Pain", "Brain", "General", it's likely a symptom.
                // Visible exports usually have 'tracker_category'.
                const category = row['tracker_category'];
                const isSymptom = ['Pain', 'Brain', 'General', 'Gastrointestinal', 'Muscles', 'Heart and Lungs', 'Emotional'].includes(category);

                if (isSymptom) {
                    record.raw_symptoms.push(value);
                }

                // ALWAYS store in custom_metrics regardless, so user can track specific "Headache" trends
                record.custom_metrics[name] = value;
                break;
        }
    });

    // Final pass: Collapse dailyRecords into array and calc daily aggregates
    return Object.values(dailyRecords).map(record => {
        // Calculate daily symptom score (Average? Sum? Max?)
        // Visible usually computes a "Total Symptom Score". If it's not present in the CSV as a row, we calculate a simple average (0-3 scale).
        // However, if the user had 10 symptoms at level 1, is that worse than 1 symptom at level 3?
        // Let's use MEAN for now to stay within 0-3 scale roughly.
        let calculatedSymptomScore = null;
        if (record.raw_symptoms.length > 0) {
            const sum = record.raw_symptoms.reduce((a: number, b: number) => a + b, 0);
            calculatedSymptomScore = sum / record.raw_symptoms.length;
        }

        // Clean up temp fields
        const { raw_symptoms, ...finalRecord } = record;

        return {
            ...finalRecord,
            symptom_score: calculatedSymptomScore
        };
    });
}
