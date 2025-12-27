import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DataManagementClient from "./data-client";

export default async function DataPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Summary & Count
    // Fetch Count
    const { count } = await supabase
        .from('health_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    const hasData = (count || 0) > 0

    // 2. Fetch Recent Logs (for the table)
    // Only if hasData to save resources
    let recentLogs: any[] = []
    if (hasData) {
        const { data } = await supabase
            .from('health_metrics')
            .select('id, date, hrv, step_count, custom_metrics, exertion_score, created_at')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(50)

        recentLogs = data || []
    }

    return <DataManagementClient initialData={recentLogs} hasData={hasData} />
}

