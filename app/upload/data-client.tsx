'use client'

import { useState } from 'react'
import { CsvUploader } from "@/components/upload/csv-uploader"
import { XmlUploader } from "@/components/upload/xml-uploader"
import { Lock, Trash2, Calendar, FileText, Smartphone, Activity } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface DataEntry {
    id: string
    date: string
    hrv: number | null
    symptom_score: number | null
    custom_metrics: any
    exertion_score: number | null
    created_at: string
}

export default function DataManagementClient({ initialData, hasData: initialHasData }: { initialData: DataEntry[], hasData: boolean }) {
    const [dataLog, setDataLog] = useState<DataEntry[]>(initialData)
    const [hasData, setHasData] = useState(initialHasData)
    const supabase = createClient()
    const router = useRouter()

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return

        const { error } = await supabase.from('health_metrics').delete().eq('id', id)

        if (!error) {
            const newData = dataLog.filter(item => item.id !== id)
            setDataLog(newData)
            if (newData.length === 0) {
                setHasData(false)
                router.refresh()
            }
        }
    }

    const handleDeleteAll = async () => {
        if (!confirm('WARNING: This will delete ALL your uploaded health data. This action cannot be undone. Are you sure?')) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('health_metrics').delete().eq('user_id', user.id)

        if (!error) {
            setDataLog([])
            setHasData(false)
            router.refresh()
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header Section */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full py-1.5 px-4 inline-flex items-center gap-2 shadow-sm">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Private & Local Processing</span>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            {hasData ? 'Manage Data' : <>Import your <span className="text-rose-400">Visible</span> data</>}
                        </h1>
                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            {hasData
                                ? "Upload new files to append data or manage existing entries."
                                : "Visualize your energy envelope and symptom patterns securely."
                            }
                        </p>
                    </div>
                </div>

                {/* Upload Section */}
                <Tabs defaultValue="visible" className="w-full max-w-3xl mx-auto">
                    <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-full p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <TabsTrigger value="visible" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500 data-[state=active]:shadow-sm transition-all duration-300">
                            <Activity className="w-4 h-4 mr-2" />
                            Visible App (CSV)
                        </TabsTrigger>
                        <TabsTrigger
                            value="apple"
                            disabled={!hasData}
                            className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-500 data-[state=active]:shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Smartphone className="w-4 h-4 mr-2" />
                            Apple Health Steps (XML)
                            {!hasData && <span className="ml-2 text-[10px] text-zinc-500">(Requires Health Data)</span>}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="visible" className="mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                        <CsvUploader />
                    </TabsContent>
                    <TabsContent value="apple" className="mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                        <XmlUploader />
                    </TabsContent>
                </Tabs>

                {/* Data Log Section - Only if Has Data */}
                {hasData && (
                    <div className="space-y-6 pt-8 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Data Log
                            </h3>
                            <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                                Delete All Data
                            </Button>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-zinc-50 dark:bg-zinc-950 border-b">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Date</th>
                                            <th className="px-6 py-3 font-medium">HRV</th>
                                            <th className="px-6 py-3 font-medium">Steps</th>
                                            <th className="px-6 py-3 font-medium">Comp. Score</th>
                                            <th className="px-6 py-3 font-medium">Exertion</th>
                                            <th className="px-6 py-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {dataLog.length > 0 ? (
                                            dataLog.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                                        {format(parseISO(entry.date), 'MMM d, yyyy')}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">{entry.hrv ? `${entry.hrv} ms` : '-'}</td>
                                                    <td className="px-6 py-4 text-muted-foreground">{(entry as any).step_count ? (entry as any).step_count.toLocaleString() : '-'}</td>
                                                    <td className="px-6 py-4">
                                                        {(() => {
                                                            const score = entry.custom_metrics?.composite_score ?? entry.symptom_score;
                                                            if (score === null || score === undefined) return '-';
                                                            return (
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${score > 5 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                                    {Number(score).toFixed(1)}
                                                                </span>
                                                            )
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">{entry.exertion_score ?? '-'}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                            onClick={() => handleDelete(entry.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                                    No recent entries found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination Hint */}
                            {dataLog.length >= 50 && (
                                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 text-center text-xs text-muted-foreground border-t">
                                    Showing recent 50 entries.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Trust (Only if no data, otherwise cluttered) */}
                {!hasData && (
                    <div className="flex justify-center items-center gap-2 text-[10px] text-muted-foreground opacity-70">
                        <div className="w-3 h-3 rounded-full bg-sky-500/20 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        </div>
                        Your health data is processed 100% locally in your browser.
                    </div>
                )}
            </div>
        </div>
    )
}
