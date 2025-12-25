export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            health_metrics: {
                Row: {
                    id: string
                    user_id: string
                    date: string
                    symptom_score: number | null
                    hrv: number | null
                    resting_heart_rate: number | null
                    exertion_score: number | null
                    custom_metrics: Json | null
                    raw_data: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    date: string
                    symptom_score?: number | null
                    hrv?: number | null
                    resting_heart_rate?: number | null
                    exertion_score?: number | null
                    raw_data?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    date?: string
                    symptom_score?: number | null
                    hrv?: number | null
                    resting_heart_rate?: number | null
                    exertion_score?: number | null
                    raw_data?: Json | null
                    created_at?: string
                }
            }
            experiments: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    start_date: string
                    end_date: string | null
                    category: 'medication' | 'supplement' | 'lifestyle' | 'other' | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    start_date: string
                    end_date?: string | null
                    category?: 'medication' | 'supplement' | 'lifestyle' | 'other' | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name: string
                    start_date?: string
                    end_date?: string | null
                    category?: 'medication' | 'supplement' | 'lifestyle' | 'other' | null
                    created_at?: string
                }
            }
        }
    }
}
