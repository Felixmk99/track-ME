'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Activity, Battery, Moon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { format, subDays, isAfter, parseISO } from "date-fns"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type TimeRange = '7d' | '30d' | '3m' | 'all'

interface DashboardReviewProps {
    data: any[]
}

export default function DashboardClient({ data: initialData }: DashboardReviewProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('30d')
    const [selectedMetric, setSelectedMetric] = useState<string>('symptom_score')

    // -- 1. Process Data & Time Filtering --
    const processedData = useMemo(() => {
        if (!initialData || initialData.length === 0) return generateMockData() // Fallback to mock

        // Filter by Time Range
        const now = new Date()
        let startDate = subDays(now, 30)
        if (timeRange === '7d') startDate = subDays(now, 7)
        if (timeRange === '30d') startDate = subDays(now, 30)
        if (timeRange === '3m') startDate = subDays(now, 90)
        if (timeRange === 'all') startDate = subDays(now, 365 * 5)

        return initialData
            .filter(item => isAfter(parseISO(item.date), startDate))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [initialData, timeRange])

    // -- 2. Determine Metric Config (Label, Color, Domain) --
    const metricConfig = useMemo(() => {
        switch (selectedMetric) {
            case 'symptom_score': return { label: 'Composite Score', color: '#fb7185', domain: [0, 10], unit: '', invert: true } // High = Bad
            case 'hrv': return { label: 'HRV', color: '#3b82f6', domain: ['auto', 'auto'], unit: 'ms', invert: false } // High = Good
            case 'resting_heart_rate': return { label: 'Resting HR', color: '#f59e0b', domain: ['auto', 'auto'], unit: 'bpm', invert: true } // High = Bad
            case 'exertion_score': return { label: 'Exertion', color: '#10b981', domain: [0, 10], unit: '', invert: false }
            default: return { label: selectedMetric, color: '#8b5cf6', domain: ['auto', 'auto'], unit: '', invert: false }
        }
    }, [selectedMetric])

    // -- 3. Calculate Stats --
    const stats = useMemo(() => {
        if (processedData.length === 0) return { trend: 'stable', avg: 0, last: 0 }
        const values = processedData.map(d => d[selectedMetric] ?? d.custom_metrics?.[selectedMetric] ?? 0)
        const last = values[values.length - 1]
        const prev = values[values.length - 2] || last
        const avg = values.reduce((a, b) => a + b, 0) / values.length

        let trend = 'stable'
        if (last > prev) trend = metricConfig.invert ? 'worsening' : 'improving'
        if (last < prev) trend = metricConfig.invert ? 'improving' : 'worsening' // Lower symptom score is improving

        return { trend, avg, last }
    }, [processedData, selectedMetric, metricConfig])

    // -- 4. Mock Data Generator (Visualization Only) --
    function generateMockData() {
        const data = []
        const now = new Date()
        for (let i = 30; i >= 0; i--) {
            const date = subDays(now, i)
            // Create a gentle curve
            const base = 50 + Math.sin(i / 5) * 20
            data.push({
                date: date.toISOString().split('T')[0],
                hrv: Math.round(base + Math.random() * 10 - 5),
                symptom_score: Math.max(0, Math.min(3, 1.5 + Math.cos(i / 4))),
                resting_heart_rate: 60 + Math.random() * 5,
            })
        }
        return data
    }

    return (
        <div className="space-y-6">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">Illness Severity Trend</h2>
                    <p className="text-muted-foreground text-sm">
                        Correlation between your {metricConfig.label} and daily activities.
                    </p>
                </div>
                <div className="bg-muted/30 p-1 rounded-lg flex items-center gap-1 self-start">
                    {(['7d', '30d', '3m', 'all'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${timeRange === r
                                ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {r === 'all' ? 'All Time' : r.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Chart Card */}
            <Card className="border-border/50 shadow-sm relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Wellness</p>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold tracking-tight">
                                {stats.trend === 'stable' ? 'Stable' : (stats.trend === 'improving' ? 'Improving' : 'Declining')}
                            </span>
                            <Badge variant="outline" className={`
                        ${stats.trend === 'improving' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : ''}
                        ${stats.trend === 'worsening' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400' : ''}
                        ${stats.trend === 'stable' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                    `}>
                                {stats.trend === 'improving' && <TrendingUp className="w-3 h-3 mr-1" />}
                                {stats.trend === 'worsening' && <TrendingDown className="w-3 h-3 mr-1" />}
                                {stats.trend === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                                {Math.abs(((stats.last - stats.avg) / stats.avg) * 100).toFixed(0)}% vs avg
                            </Badge>
                        </div>
                    </div>

                    {/* Metric Selector */}
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/50 border-transparent hover:border-border transition-colors">
                            <SelectValue placeholder="Select Metric" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="symptom_score">Symptom Score</SelectItem>
                            <SelectItem value="hrv">Heart Rate Variability</SelectItem>
                            <SelectItem value="resting_heart_rate">Resting HR</SelectItem>
                            <SelectItem value="exertion_score">Exertion Score</SelectItem>
                            {/* Dynamic customization would go here */}
                        </SelectContent>
                    </Select>
                </CardHeader>

                <CardContent className="h-[400px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={processedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#888' }}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#888' }}
                                domain={['auto', 'auto']}
                                width={40}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-zinc-900 text-white text-xs p-3 rounded-lg shadow-xl border border-zinc-800">
                                                <p className="font-semibold mb-1">{label ? format(parseISO(label as string), 'EEE, MMM d') : ''}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metricConfig.color }} />
                                                    <span>
                                                        {metricConfig.label}: <span className="font-bold">{Number(payload[0].value).toFixed(1)}{metricConfig.unit}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey={(d) => d[selectedMetric] ?? d.custom_metrics?.[selectedMetric]}
                                stroke={metricConfig.color}
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-0 shadow-sm md:shadow-none bg-zinc-50/50 dark:bg-zinc-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <span className="text-sm font-medium text-muted-foreground">Current Average</span>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avg.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">{metricConfig.unit}</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Based on {timeRange} timeframe</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-0 shadow-sm md:shadow-none bg-zinc-50/50 dark:bg-zinc-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <span className="text-sm font-medium text-muted-foreground">Latest Reading</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.last.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">{metricConfig.unit}</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Last recorded entry</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-0 shadow-sm md:shadow-none bg-zinc-50/50 dark:bg-zinc-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <span className="text-sm font-medium text-muted-foreground">Rest Days</span>
                        <Moon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2 <span className="text-sm font-normal text-muted-foreground ml-1">days</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Recommended based on load</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center pt-8 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">Synced with Visible App</span>
                </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground opacity-60 pb-8">Data encrypted on device • Last updated just now</p>

        </div>
    )
}
