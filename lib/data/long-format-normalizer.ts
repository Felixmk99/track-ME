import { Database } from "@/types/database.types";

/**
 * Normalizes "Long Format" CSV data from Visible.
 * Each row in CSV is one measurement (e.g. HRV, Symptom, etc.) for a specific date.
 * We need to PIVOT this into one object per Day.
 */
export function normalizeLongFormatData(rows: any[]) {
    const dailyRecords: Record<string, any> = {};

    // Helper to find key case-insensitively
    const findKey = (row: any, candidates: string[]) => {
        const keys = Object.keys(row);
        for (const candidate of candidates) {
            const found = keys.find(k => k.toLowerCase().trim() === candidate.toLowerCase());
            if (found) return found;
        }
        return null;
    };

    // Detect keys from first row if possible, or just look per row (slightly slower but safer)
    if (rows.length === 0) return [];

    // console.log("First row raw:", rows[0]); // Debug

    rows.forEach(row => {
        const dateKey = findKey(row, ['observation_date', 'date', 'day']);
        const nameKey = findKey(row, ['tracker_name', 'name', 'metric', 'type']);
        const valueKey = findKey(row, ['observation_value', 'value', 'score', 'rating']);
        const categoryKey = findKey(row, ['tracker_category', 'category', 'group']);

        const date = dateKey ? row[dateKey] : null;
        const name = nameKey ? row[nameKey] : null;
        const valueStr = valueKey ? row[valueKey] : null;
        const value = parseFloat(valueStr);
        const category = categoryKey ? row[categoryKey] : 'Other';

        if (!date || isNaN(value)) return;

        if (!dailyRecords[date]) {
            dailyRecords[date] = {
                date,
                hrv: null,
                resting_heart_rate: null,
                exertion_score: null,
                custom_metrics: {},
                raw_symptoms: [],
                raw_exertion: []
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
                record.exertion_score = value;
                break;
            default:
                // Define Exertion Types
                // We include both the "Ideal" names and the actual Visible CSV names
                const exertionTypes = [
                    "Cognitive Exertion",
                    "Emotional Exertion",
                    "Physical Exertion",
                    "Social Exertion",
                    // visible csv specific names:
                    "Mentally demanding",
                    "Emotionally stressful",
                    "Physically active",
                    "Socially demanding"
                ];

                const isExertion = exertionTypes.includes(name || '');

                if (isExertion) {
                    if (!isNaN(value)) {
                        record.raw_exertion.push(value);
                    }
                } else {
                    // Identify Symptoms based on strict Category Allowlist
                    const symptomCategories = [
                        "Custom",
                        "General",
                        "Brain",
                        "Heart and Lungs",
                        "Pain",
                        "Muscles",
                        "Sensory",
                        "Gastrointestinal"
                    ];

                    // Use case-insensitive check just in case, though usually they match exactly
                    const isSymptom = symptomCategories.some(c => c.toLowerCase() === (category || '').toLowerCase());

                    if (isSymptom && !isNaN(value)) {
                        record.raw_symptoms.push(value);
                    }
                }

                // Store everything in custom_metrics for flexibility, UNLESS it's a Funcap category
                if (name && value !== undefined && !isNaN(value)) {
                    // Filter out Funcap values from custom_metrics based on Category (requested by user)
                    // If category starts with 'Funcap_', skip it.
                    if (category && category.toLowerCase().startsWith('funcap_')) {
                        // Skip
                    } else {
                        record.custom_metrics[name] = value;
                    }
                }
                break;
        }
    });

    // Final pass: Collapse dailyRecords into array and calc daily aggregates
    return Object.values(dailyRecords).map(record => {
        // Calculate Composite Score: Sum(Symptoms) - Sum(Exertion)

        const symptomSum = record.raw_symptoms.reduce((a: number, b: number) => a + b, 0);
        const exertionSum = record.raw_exertion.reduce((a: number, b: number) => a + b, 0);

        // If we have neither, score is null. If we have either, calculate.
        let compositeScore = null;
        if (record.raw_symptoms.length > 0) {
            compositeScore = symptomSum;
        }

        // Backfill Exertion Score if explicit "Stability Score" wasn't found but we have raw exertion values
        if (record.exertion_score === null && record.raw_exertion.length > 0) {
            record.exertion_score = exertionSum;
        }

        // Clean up temp fields
        const { raw_symptoms, raw_exertion, ...finalRecord } = record;

        return {
            ...finalRecord,
            composite_score: compositeScore, // Use new name to avoid DB constraint conflict on legacy 'symptom_score' column
            symptom_score: null // Explicitly null the legacy column
        };
    });
}
