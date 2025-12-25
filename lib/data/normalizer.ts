
/**
 * Normalizes CSV headers and maps them to database columns.
 */
export function normalizeVisibleData(row: any) {
    // Helper to safely parse floats from strings like "10.5" or handle numbers
    const parseFloatSafe = (val: any) => {
        if (typeof val === 'number') return val
        if (!val && val !== 0) return null
        const parsed = parseFloat(val)
        return isNaN(parsed) ? null : parsed
    }

    // Helper for integers
    const parseIntSafe = (val: any) => {
        if (typeof val === 'number') return Math.round(val)
        if (!val && val !== 0) return null
        const parsed = parseInt(val, 10)
        return isNaN(parsed) ? null : parsed
    }

    // Map of STANDARD CSV headers to look for
    const standardKeys = {
        date: ['Date', 'date', 'Timestamp'],
        symptom_score: ['Symptom Severity (0-3)', 'Symptom Severity', 'Symptom Score', 'symptom_severity'],
        hrv: ['Heart Rate Variability (ms)', 'HRV', 'hrv'],
        rhr: ['Resting Heart Rate (bpm)', 'Resting Heart Rate', 'RHR', 'resting_heart_rate'],
        exertion: ['Exertion Score (0-10)', 'Exertion', 'exertion_score']
    }

    const findValue = (keys: string[]) => {
        for (const key of keys) {
            if (row[key] !== undefined) return row[key]
            const lowerKey = key.toLowerCase()
            const rowKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey)
            if (rowKey) return row[rowKey]
        }
        return null
    }

    // Date is critical
    const dateStr = findValue(standardKeys.date)
    if (!dateStr) return null // Skip rows without date

    // Extract core metrics
    const coreMetrics = {
        date: dateStr,
        symptom_score: parseFloatSafe(findValue(standardKeys.symptom_score)),
        hrv: parseFloatSafe(findValue(standardKeys.hrv)),
        resting_heart_rate: parseIntSafe(findValue(standardKeys.rhr)),
        exertion_score: parseFloatSafe(findValue(standardKeys.exertion)),
        raw_data: row
    }

    // Extract Custom Metrics
    // We want to find any numeric column that IS NOT one of the standard ones we just picked
    const custom_metrics: Record<string, number> = {}

    // Flatten standard keys to specific found keys so we can exclude them
    const usedKeys = new Set<string>()

    // Quick helper to find the actual key used in the row for a standard field
    const findUsedKey = (keys: string[]) => {
        for (const key of keys) {
            if (row[key] !== undefined) return key
            const lowerKey = key.toLowerCase()
            const rowKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey)
            if (rowKey) return rowKey
        }
        return null
    }

    Object.values(standardKeys).forEach(keyList => {
        const found = findUsedKey(keyList)
        if (found) usedKeys.add(found)
    })

    // Iterate over all row keys
    Object.keys(row).forEach(key => {
        if (usedKeys.has(key)) return; // Skip standard keys
        if (key === 'raw_data') return;

        // Check if value is numeric or parseable as number
        const val = row[key]
        const num = parseFloatSafe(val)

        // Valid numbers only. Exclude dates or empty strings that parse to NaN (handled by parseFloatSafe)
        // Also typical non-metric fields like "Notes" or "Tags" should be skipped if they are strings.
        if (num !== null && !key.toLowerCase().includes('date') && !key.toLowerCase().includes('time')) {
            custom_metrics[key] = num
        }
    })

    return {
        ...coreMetrics,
        custom_metrics: Object.keys(custom_metrics).length > 0 ? custom_metrics : null
    }
}
