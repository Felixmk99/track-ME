import { Dictionary } from "../types"

export const en: Dictionary = {
    common: {
        loading: "Loading...",
        error: "An error occurred",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        confirm: "Confirm",
        success: "Success",
        custom: "Custom"
    },
    navbar: {
        dashboard: "Dashboard",
        experiments: "Experiments",
        data: "Data",
        upload_data: "Upload Data",
        settings: "Settings",
        logout: "Log out",
        login: "Log In",
        signup: "Sign Up",
        profile: "Profile",
        welcome: "Welcome",
        missing_steps_hint: "Missing Steps?",
        missing_steps_tooltip: "Upload Apple Health step data to improve your Health Score accuracy."
    },
    footer: {
        built_by: "Built by Felix Kania",
        contact: "Contact & Feature Ideas: felixmkania@gmail.com"
    },
    dashboard: {
        title: "Health Trends",
        subtitle_prefix: "Tracking your",
        subtitle_suffix: "over time.",
        trend_mode: "Trend",
        metrics_dropdown: "Metrics (Max 2)",
        metrics_selected: "Selected",
        charts: {
            synced: "Synced with Visible App",
            encrypted: "Data encrypted on device • Last updated just now"
        },
        status: {
            stable: "Stable",
            improving: "Improving",
            declining: "Worsening",
            worsening: "Worsening"
        },
        time_ranges: {
            d7: "7D",
            d30: "30D",
            m3: "3M",
            all: "All Time"
        },
        cards: {
            average: "Metric Average",
            average_sub: "Based on {range} timeframe",
            latest: "Latest Reading",
            latest_sub: "Last recorded entry",
            rest_days: "Rest Days",
            rest_days_sub: "Recommended based on load",
            days: "days"
        },
        metrics: {
            composite_score: {
                label: "Symptom Score",
                description: "Your overall health snapshot based on symptom severity and daily activity.",
                better: "Lower is better"
            },
            adjusted_score: {
                label: "Track-ME Score",
                description: "Dynamic health score adjusted for daily step count.",
                better: "Lower is better"
            },
            hrv: {
                label: "HRV",
                description: "Measures the variation in time between heartbeats. Higher values indicate better recovery.",
                better: "Higher is better"
            },
            resting_heart_rate: {
                label: "Resting HR",
                description: "Your average heart rate while at complete rest.",
                better: "Lower is better"
            },
            step_count: {
                label: "Steps",
                description: "Daily step count from Apple Health.",
                better: "Higher is better"
            },
            exertion_score: {
                label: "Exertion",
                description: "Your self-reported level of physical and mental effort.",
                better: "Higher values indicate more activity"
            },
            trend: "Trend",
            about: "About",
            crashes: {
                label: "Crashes (PEM)",
                description: "Days marked as 'Crash' in your Visible logs.",
                better: "Fewer is better"
            }
        },
        crash_mode: "PEM",
        pem_days: "PEM Days"
    }
}
