import { Dictionary } from "../types"

export const de: Dictionary = {
    common: {
        loading: "Lädt...",
        error: "Ein Fehler ist aufgetreten",
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Löschen",
        confirm: "Bestätigen",
        success: "Erfolg",
        custom: "Benutzerdefiniert"
    },
    navbar: {
        dashboard: "Dashboard",
        experiments: "Experimente",
        data: "Daten",
        upload_data: "Daten hochladen",
        settings: "Einstellungen",
        logout: "Abmelden",
        login: "Anmelden",
        signup: "Registrieren",
        profile: "Profil",
        welcome: "Willkommen"
    },
    footer: {
        built_by: "Entwickelt von Felix Kania",
        contact: "Kontakt & Ideen: felixmkania@gmail.com"
    },
    dashboard: {
        title: "Gesundheitstrends",
        subtitle_prefix: "Verlauf deiner",
        subtitle_suffix: "im Zeitverlauf.",
        trend_mode: "Trend",
        metrics_dropdown: "Metriken (Max 2)",
        metrics_selected: "Ausgewählt",
        charts: {
            synced: "Synchronisiert mit Visible App",
            encrypted: "Daten auf Gerät verschlüsselt • Gradeben aktualisiert"
        },
        status: {
            stable: "Stabil",
            improving: "Verbesserung",
            declining: "Verschlechterung",
            worsening: "Verschlechterung"
        },
        time_ranges: {
            d7: "7T",
            d30: "30T",
            m3: "3M",
            all: "Gesamt"
        },
        cards: {
            average: "Metrik Durchschnitt",
            average_sub: "Basierend auf {range} Zeitraum",
            latest: "Letzter Wert",
            latest_sub: "Zuletzt aufgezeichnet",
            rest_days: "Ruhetage",
            rest_days_sub: "Empfohlen basierend auf Belastung",
            days: "Tage"
        },
        metrics: {
            composite_score: {
                label: "Symptom Score",
                description: "Gesamtüberblick deiner Gesundheit basierend auf Symptom-Schwere.",
                better: "Niedriger ist besser"
            },
            adjusted_score: {
                label: "Track-ME Score",
                description: "Gesundheits-Score angepasst an tägliche Schritte.",
                better: "Niedriger ist besser"
            },
            hrv: {
                label: "HRV (Herzfrequenzvariabilität)",
                description: "Misst die Zeitvariation zwischen Herzschlägen. Höhere Werte zeigen bessere Erholung.",
                better: "Höher ist besser"
            },
            resting_heart_rate: {
                label: "Ruhepuls",
                description: "Dein durchschnittlicher Puls in vollständiger Ruhe.",
                better: "Niedriger ist besser"
            },
            step_count: {
                label: "Schritte",
                description: "Tägliche Schrittzahl (Apple Health).",
                better: "Höher ist besser"
            },
            exertion_score: {
                label: "Belastung",
                description: "Dein selbstberichtetes Level an physischer und mentaler Anstrengung.",
                better: "Höhere Werte zeigen mehr Aktivität"
            },
            trend: "Trend",
            about: "Über"
        }
    }
}
