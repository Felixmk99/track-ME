'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileCode, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { parseISO, format } from 'date-fns'

export function XmlUploader() {
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
        setMessage('Parsing Apple Health XML (this may take a moment)...')

        const reader = new FileReader()

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string
                if (!text) throw new Error('File is empty')

                // REGEX Parsing Logic (from Python reference)
                // <Record type="HKQuantityTypeIdentifierStepCount" ... startDate="2023-01-01 00:00:00 +0100" ... value="123">
                const stepPattern = /<Record.*?type="HKQuantityTypeIdentifierStepCount".*?startDate="([^"]+)".*?value="([^"]+)".*?>/g

                const stepData: Record<string, number> = {}
                let match
                let count = 0

                // Loop through all matches
                while ((match = stepPattern.exec(text)) !== null) {
                    const startDateStr = match[1] // "2023-01-01 00:00:00 +0100"
                    const valueStr = match[2]

                    const date = startDateStr.split(' ')[0] // "2023-01-01"
                    const value = parseInt(valueStr, 10)

                    if (date && !isNaN(value)) {
                        stepData[date] = (stepData[date] || 0) + value
                    }
                    count++
                }

                if (Object.keys(stepData).length === 0) {
                    throw new Error('No step count records found in this XML file.')
                }

                setStatus('uploading')
                setMessage(`Found ${count} records. Aggregating into ${Object.keys(stepData).length} days...`)

                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('User not authenticated')

                // Prepare DB Records
                const dbRecords = Object.entries(stepData).map(([date, steps]) => ({
                    user_id: user.id,
                    date: date,
                    step_count: steps
                }))

                // ---------------------------------------------------------
                // SAFE UPSERT STRATEGY
                // We don't want to overwrite existing HRV/Symptoms if we only have Steps.
                // But Supabase 'upsert' replaces the whole row if we don't be careful?
                // Actually, standard SQL UPSERT needs all columns or it sets others to null if not specified? 
                // NO: Supabase Upsert basically does INSERT ... ON CONFLICT UPDATE ...
                // If we providing ONLY step_count, the other columns might be set to NULL if we are not careful?
                // WAIT: Postgres 'ON CONFLICT DO UPDATE SET step_count = excluded.step_count' is what we want.
                // Supabase JS .upsert({ ... }, { onConflict: '...' }) does a full replace of the row typically?
                // Let's check documentation or assume safest path: Fetch existing, merge, then upsert.
                // ---------------------------------------------------------

                // Batch processing (chunks of 20 for fetch-merge-upsert safety)
                const BATCH_SIZE = 20
                for (let i = 0; i < dbRecords.length; i += BATCH_SIZE) {
                    const batch = dbRecords.slice(i, i + BATCH_SIZE)
                    const dates = batch.map(b => b.date)

                    // 1. Fetch existing rows for these dates
                    const { data: existingRows } = await supabase
                        .from('health_metrics')
                        .select('*')
                        .in('date', dates)
                        .eq('user_id', user.id)

                    const existingMap = new Map((existingRows || []).map((r: any) => [r.date, r]))

                    // 2. Merge - STRICT FILTER: Only keep days that already exist
                    const mergedBatch = batch.map(newRecord => {
                        const existing = existingMap.get(newRecord.date)

                        // IF NO EXISTING VISIBLE DATA, SKIP THIS DAY
                        if (!existing) return null

                        // Remove ID and CreatedAt to avoid conflicts/PK errors on Upsert
                        const { id, created_at, ...rest } = existing

                        return {
                            ...rest, // Keep old data
                            user_id: user.id,
                            date: newRecord.date,
                            step_count: newRecord.step_count
                        }
                    }).filter(Boolean) // Remove nulls

                    if (mergedBatch.length === 0) continue

                    // 3. Upsert
                    const { error } = await supabase
                        .from('health_metrics')
                        .upsert(mergedBatch as any, { onConflict: 'user_id, date' })

                    if (error) throw error

                    // Update UI progress
                    setMessage(`Uploading ${Math.min(i + BATCH_SIZE, dbRecords.length)}... (Matched ${mergedBatch.length} days)`)
                }

                setStatus('success')
                setMessage(`Successfully uploaded ${Object.keys(stepData).length} days of step data!`)

                setTimeout(() => {
                    window.location.href = '/dashboard'
                }, 1500)

            } catch (err: any) {
                console.error("XML Parse/Upload Error:", err)
                setStatus('error')
                setMessage(err.message || "Failed to process XML file.")
            }
        }

        reader.readAsText(file)

    }, [supabase, router])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/xml': ['.xml'], 'application/xml': ['.xml'] },
        maxFiles: 1
    })

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div
                {...getRootProps()}
                className={`
                    relative group border-2 border-dashed rounded-[2.5rem] p-8 text-center cursor-pointer transition-all duration-300 ease-in-out
                    flex flex-col items-center justify-center gap-6
                    ${isDragActive ? 'border-blue-400 bg-blue-50/50 scale-[1.01]' : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}
                    ${status === 'error' ? 'border-red-300 bg-red-50' : ''}
                    ${status === 'success' ? 'border-green-300 bg-green-50' : ''}
                `}
            >
                <input {...getInputProps()} />

                {/* Icon Circle */}
                <div className={`
                    w-20 h-20 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-300
                    ${status === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-500'}
                    ${status === 'error' ? 'bg-red-100 text-red-500' : ''}
                `}>
                    {status === 'success' ? <CheckCircle className="w-10 h-10" /> :
                        status === 'error' ? <AlertCircle className="w-10 h-10" /> :
                            status === 'uploading' || status === 'parsing' ? <Upload className="w-10 h-10 animate-bounce" /> :
                                <FileCode className="w-10 h-10" />}
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">
                        {status === 'parsing' ? 'Parshing XML...' :
                            status === 'uploading' ? 'Uploading...' :
                                status === 'success' ? 'Upload Complete!' :
                                    'Upload Apple Health Export'}
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                        {status === 'parsing' || status === 'uploading' || status === 'success' || status === 'error' ? message :
                            'Drag and drop export.xml. We only extract steps for days with existing Visible data.'}
                    </p>
                    {status === 'idle' && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-2 opacity-50">Supports .xml files</p>
                    )}
                </div>

                {/* Action Button */}
                {status !== 'uploading' && status !== 'parsing' && (
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
            </div>
        </div>
    )
}
