export type Locale = 'en' | 'de'

export interface Dictionary {
    common: {
        loading: string
        error: string
        save: string
        cancel: string
        delete: string
        confirm: string
        success: string
        custom: string
    }
    navbar: {
        dashboard: string
        experiments: string
        data: string
        upload_data: string
        settings: string
        logout: string
        login: string
        signup: string
        profile: string
        welcome: string
        missing_steps_hint: string
        missing_steps_tooltip: string
    }
    footer: {
        built_by: string
        contact: string
    }
    dashboard: {
        title: string
        subtitle_prefix: string
        subtitle_suffix: string
        trend_mode: string
        metrics_dropdown: string
        metrics_selected: string
        charts: {
            synced: string
            encrypted: string
        }
        status: {
            stable: string
            improving: string
            declining: string
            worsening: string
        }
        time_ranges: {
            d7: string
            d30: string
            m3: string
            all: string
        }
        cards: {
            average: string
            average_sub: string
            latest: string
            latest_sub: string
            rest_days: string
            rest_days_sub: string
            days: string
        }
        metrics: {
            composite_score: {
                label: string
                description: string
                better: string
            }
            adjusted_score: {
                label: string
                description: string
                better: string
            }
            hrv: {
                label: string
                description: string
                better: string
            }
            resting_heart_rate: {
                label: string
                description: string
                better: string
            }
            step_count: {
                label: string
                description: string
                better: string
            }
            exertion_score: {
                label: string
                description: string
                better: string
            }
            trend: string
            about: string
            crashes: {
                label: string
                description: string
                better: string
            }
        }
        crash_mode: string
        pem_days: string
    }
}
