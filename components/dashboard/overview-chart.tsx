'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useState } from "react"
import { format, parseISO } from "date-fns"

interface ChartData {
    date: string
    composite_score: number | null
    symptom_score: number | null
    hrv: number | null
}

export function OverviewChart({ data }: { data: ChartData[] }) {
    const [metric, setMetric] = useState("composite_score")

    const config = {
        composite_score: { label: "Health Score", color: "#10b981", domain: [0, 100] }, // Green
        symptom_score: { label: "Symptom Severity", color: "#ef4444", domain: [0, 10] }, // Red
        hrv: { label: "HRV (ms)", color: "#3b82f6", domain: ['auto', 'auto'] } // Blue
    }

    const activeConfig = config[metric as keyof typeof config]

    return (
        <Card className="col-span-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Health Trends</CardTitle>
                <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Metric" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="composite_score">Health Score</SelectItem>
                        <SelectItem value="symptom_score">Symptom Severity</SelectItem>
                        <SelectItem value="hrv">Heart Rate Variability</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(str) => format(parseISO(str), "MMM d")}
                                minTickGap={30}
                            />
                            <YAxis
                                hide={false}
                                domain={activeConfig.domain as any}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                labelFormatter={(str) => format(parseISO(str), "MMM d, yyyy")}
                            />
                            <Area
                                type="monotone"
                                dataKey={metric}
                                stroke={activeConfig.color}
                                fill={activeConfig.color}
                                fillOpacity={0.2}
                                strokeWidth={2}
                                connectNulls
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
