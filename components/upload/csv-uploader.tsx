'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { normalizeLongFormatData } from '@/lib/data/long-format-normalizer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function CsvUploader() {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const supabase = createClient()
    const router = useRouter()

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setStatus('parsing')
        setMessage('Parsing CSV file...')

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    setStatus('uploading')
                    setMessage(`Processing ${results.data.length} measurements...`)

                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) {
                        throw new Error('You must be logged in to upload data.')
                    }

                    // PIVOT Logic: Group raw rows into Daily Records
                    const records = normalizeLongFormatData(results.data)

                    if (records.length === 0) {
                        throw new Error('No valid daily records found in CSV.')
                    }

                    setMessage(`Uploading ${records.length} days of data...`)

                    // Prepare for Supabase
                    const dbRecords = records.map(r => ({
                        user_id: user.id,
                        date: r.date,
                        hrv: r.hrv,
                        resting_heart_rate: r.resting_heart_rate,
                        exertion_score: r.exertion_score,
                        symptom_score: r.symptom_score,
                        custom_metrics: r.custom_metrics
                    }))

                    // Batch insert - Supabase handles batching well, but for huge files we might want to chunk.
                    // For typical Visible exports (365 days), one batch is fine.
                    const { error } = await supabase
                        .from('health_metrics')
                        .upsert(dbRecords as any, { onConflict: 'user_id, date' })

                    if (error) throw error

                    setStatus('success')
                    setMessage(`Successfully uploaded ${records.length} days of data!`)
                    router.refresh()

                    // Redirect to dashboard after a short delay so user sees success state
                    setTimeout(() => {
                        window.location.href = '/dashboard' // Force full reload to ensure Navbar updates state
                    }, 1500)

                } catch (err: any) {
                    console.error(err)
                    setStatus('error')
                    setMessage(err.message || 'Failed to upload data.')
                } finally {
                    setUploading(false)
                }
            },
            error: (err) => {
                setStatus('error')
                setMessage('Failed to parse CSV: ' + err.message)
            }
        })
    }, [supabase, router])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1
    })

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div
                {...getRootProps()}
                className={`
                    relative group border-2 border-dashed rounded-[2.5rem] p-8 text-center cursor-pointer transition-all duration-300 ease-in-out
                    flex flex-col items-center justify-center gap-6
                    ${isDragActive ? 'border-rose-400 bg-rose-50/50 scale-[1.01]' : 'border-zinc-200 dark:border-zinc-800 hover:border-rose-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}
                    ${status === 'error' ? 'border-red-300 bg-red-50' : ''}
                    ${status === 'success' ? 'border-green-300 bg-green-50' : ''}
                `}
            >
                <input {...getInputProps()} />

                {/* Icon Circle */}
                <div className={`
                    w-20 h-20 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-300
                    ${status === 'success' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-500'}
                    ${status === 'error' ? 'bg-red-100 text-red-500' : ''}
                `}>
                    {status === 'success' ? <CheckCircle className="w-10 h-10" /> :
                        status === 'error' ? <AlertCircle className="w-10 h-10" /> :
                            status === 'uploading' ? <Upload className="w-10 h-10 animate-bounce" /> :
                                <Upload className="w-10 h-10" />}
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">
                        {status === 'uploading' ? 'Uploading...' :
                            status === 'success' ? 'Upload Complete!' :
                                'Upload your CSV file'}
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                        {status === 'uploading' ? message :
                            status === 'success' ? message :
                                status === 'error' ? message :
                                    'Drag and drop your Visible export here, or click below to browse.'}
                    </p>
                    {status === 'idle' && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-2 opacity-50">Supports .csv files</p>
                    )}
                </div>

                {/* Action Button */}
                {status !== 'uploading' && (
                    <Button
                        size="lg"
                        variant={status === 'success' ? "outline" : "default"}
                        className={`rounded-full px-8 h-12 text-sm font-semibold shadow-lg transition-transform hover:scale-105 ${status === 'success' ? 'border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                        onClick={(e) => {
                            if (status === 'success' || status === 'error') {
                                e.stopPropagation();
                                setStatus('idle');
                                setMessage('');
                            }
                        }}
                    >
                        {status === 'success' ? 'Upload New File' :
                            status === 'error' ? 'Try Again' :
                                'Select File'}
                    </Button>
                )}

                {/* Progress Bar */}
                {status === 'uploading' && (
                    <div className="w-full max-w-xs mt-4">
                        <Progress value={undefined} className="h-2 bg-zinc-100" />
                    </div>
                )}

            </div>
        </div>
    )
}
