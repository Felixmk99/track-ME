'use client'

import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from '@/components/providers/language-provider'

interface PSTHChartProps {
    data: any[] // Aggregated Profile Data
    avgRecoveryDays?: number
}

export function PSTHChart({ data, avgRecoveryDays }: PSTHChartProps) {
    const { t } = useLanguage()

    // Transform data for Recharts
    // data is [{ dayOffset: -7, metrics: { step_count: { mean: 1.2 ... } } }]
    // Need flat structure: { dayOffset: -7, steps_z: 1.2, hrv_z: -0.5 ... }

    const chartData = data.map(d => ({
        dayOffset: d.dayOffset,
        steps_z: d.metrics['step_count']?.mean || 0,
        exertion_z: d.metrics['exertion_score']?.mean || 0,
        hrv_z: d.metrics['hrv']?.mean || 0,
        symptoms_z: d.metrics['composite_score']?.mean || 0
    }))

    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle>PEM Cycle Morphology (Average)</CardTitle>
                <CardDescription>
                    Superposed Epoch Analysis: The "Shape" of your crashes.
                    values are Z-Scores (Standard Deviations from Baseline).
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="dayOffset"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickCount={15}
                            label={{ value: 'Days Relative to Crash', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis
                            label={{ value: 'Deviation (σ)', angle: -90, position: 'insideLeft' }}
                            domain={[-3, 3]} // Limit to reasonable Z-scores
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            labelFormatter={(label) => `Day ${label > 0 ? '+' : ''}${label}`}
                            formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, 'σ']}
                        />
                        <Legend verticalAlign="top" height={36} />

                        {/* Baseline "Safe" Zone (-0.5 to 0.5 sigma approx or -1 to 1) */}
                        <ReferenceArea y1={-1} y2={1} fill="hsl(var(--foreground))" fillOpacity={0.05} />

                        {/* Crash Start Line */}
                        <ReferenceLine
                            x={0}
                            stroke="hsl(var(--destructive))"
                            strokeDasharray="3 3"
                            label={{ position: 'insideTopLeft', value: 'CRASH START', fill: 'hsl(var(--destructive))', fontSize: 10, fontWeight: 'bold' }}
                        />

                        {/* Recovery Line */}
                        {avgRecoveryDays !== undefined && avgRecoveryDays > 0 && (
                            <ReferenceLine
                                x={avgRecoveryDays}
                                stroke="#3b82f6"
                                strokeDasharray="3 3"
                                label={{ position: 'insideTopRight', value: 'AVG RECOVERY', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }}
                            />
                        )}

                        {/* Metrics */}
                        <Line
                            type="monotone"
                            dataKey="symptoms_z"
                            name="Symptoms"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="exertion_z"
                            name="Exertion"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="hrv_z"
                            name="HRV (Inverted)" // HRV usually dips, maybe invert for readability? Or keep distinct.
                            // If HRV dips, Z-score is negative. 
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
