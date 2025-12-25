import { redirect } from 'next/navigation'
import { Database } from '@/types/database.types'
import { AddExperimentDialog } from '@/components/experiments/add-experiment-dialog'
import { ExperimentList } from '@/components/experiments/experiment-list'
import { analyzeExperiment } from '@/lib/analytics/stats-engine'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ExperimentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Parallel fetch: Experiments & Metrics
    const [excperimentsRes, metricsRes] = await Promise.all([
        supabase.from('experiments').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        supabase.from('health_metrics').select('*').eq('user_id', user.id).order('date', { ascending: true })
    ])

    const experiments = excperimentsRes.data || []
    const metrics = metricsRes.data || []

    // Analyze each experiment
    const results = experiments.map(exp => ({
        ...(exp as any),
        analysis: analyzeExperiment(exp, metrics)
    }))

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">My Experiments</h2>
                <AddExperimentDialog />
            </div>

            <div className="grid gap-4">
                <ExperimentList experiments={results} />
            </div>
        </div>
    )
}
