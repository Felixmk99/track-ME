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
        <Card className="w-full max-w-2xl mx-auto mt-8">
            <CardContent className="p-6">
                <div
                    {...getRootProps()}
                    className={`
            border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${status === 'error' ? 'border-red-500/50 bg-red-500/5' : ''}
            ${status === 'success' ? 'border-green-500/50 bg-green-500/5' : ''}
          `}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center space-y-4">
                        {status === 'idle' && (
                            <>
                                <div className="bg-muted p-4 rounded-full">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Upload Visible Export</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Drag and drop your "Long Format" CSV file here
                                    </p>
                                </div>
                            </>
                        )}

                        {status === 'parsing' && (
                            <>
                                <FileText className="h-10 w-10 animate-pulse text-primary" />
                                <p>Parsing file...</p>
                            </>
                        )}

                        {status === 'uploading' && (
                            <>
                                <Upload className="h-10 w-10 animate-bounce text-primary" />
                                <div className="w-full max-w-xs space-y-2">
                                    <p>{message}</p>
                                    <Progress value={undefined} className="w-full" />
                                </div>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <CheckCircle className="h-10 w-10 text-green-500" />
                                <p className="text-green-600 font-medium">{message}</p>
                                <Button variant="outline" size="sm" onClick={(e) => {
                                    e.stopPropagation()
                                    setStatus('idle')
                                }}>
                                    Upload New File
                                </Button>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <AlertCircle className="h-10 w-10 text-red-500" />
                                <p className="text-red-600 font-medium">{message}</p>
                                <Button variant="outline" size="sm" onClick={(e) => {
                                    e.stopPropagation()
                                    setStatus('idle')
                                }}>
                                    Try Again
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
