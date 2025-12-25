
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OverviewChart } from '@/components/dashboard/overview-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateHealthScore } from '@/lib/analytics/composite-score'
import { Activity, Heart, TrendingUp, Zap } from 'lucide-react'
import { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch last 90 days of metrics
    const { data: rawMetrics } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(90) // Last 3 months for the chart
        .returns<Database['public']['Tables']['health_metrics']['Row'][]>()

    const metrics = rawMetrics || []

    // Process data for charts and stats
    const processedData = metrics.map(m => {
        const composite = calculateHealthScore(m)
        return {
            date: m.date,
            symptom_score: m.symptom_score,
            hrv: m.hrv,
            resting_heart_rate: m.resting_heart_rate,
            exertion_score: m.exertion_score,
            custom_metrics: m.custom_metrics,
            composite_score: composite
        } as any
    })

    // Calculate Summary Stats (Latest available day)
    const latest = processedData[processedData.length - 1]
    const previous = processedData[processedData.length - 2]

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            {metrics.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">No data found</h3>
                    <p className="text-muted-foreground mb-4">Upload your Visible export to see your health insights.</p>
                    <a href="/upload" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                        Upload Data
                    </a>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{latest?.composite_score ?? '-'}</div>
                                <p className="text-xs text-muted-foreground">
                                    0-100 Wellness Index
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Symptom Severity</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{latest?.symptom_score ?? '-'}</div>
                                <p className="text-xs text-muted-foreground">
                                    Scale 0-10 (Lower is better)
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">HRV</CardTitle>
                                <Heart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{latest?.hrv ? `${latest.hrv} ms` : '-'}</div>
                                <p className="text-xs text-muted-foreground">
                                    Heart Rate Variability
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Records</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.length}</div>
                                <p className="text-xs text-muted-foreground">
                                    Days tracked
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <OverviewChart data={processedData} />
                    </div>
                </>
            )}
        </div>
    )
}
