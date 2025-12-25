'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Minus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ExperimentListProps {
    experiments: any[]
}

export function ExperimentList({ experiments }: ExperimentListProps) {
    const supabase = createClient()
    const router = useRouter()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        await supabase.from('experiments').delete().eq('id', id)
        setDeletingId(null)
        router.refresh()
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {experiments.map((exp) => (
                <Card key={exp.id} className="relative group">
                    {/* Delete Button (Visible on hover or mobile) */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Experiment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete "{exp.name}". This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(exp.id)} className="bg-red-500 hover:bg-red-600">
                                        {deletingId === exp.id ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>

                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{exp.name}</CardTitle>
                                <CardDescription className="capitalize">{exp.category}</CardDescription>
                            </div>
                            {!exp.end_date && (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-400 mr-8">Active</span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {exp.analysis ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Impact on Health Score</span>
                                    <div className={`flex items-center font-bold ${exp.analysis.changePercent > 0 ? 'text-green-600' : exp.analysis.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                        {exp.analysis.changePercent > 0 ? <ArrowUp className="h-4 w-4 mr-1" /> :
                                            exp.analysis.changePercent < 0 ? <ArrowDown className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                                        {Math.abs(exp.analysis.changePercent)}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-muted-foreground">Baseline (avg)</p>
                                        <p className="text-lg font-medium">{exp.analysis.baselineMean}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">During (avg)</p>
                                        <p className="text-lg font-medium">{exp.analysis.treatmentMean}</p>
                                    </div>
                                </div>

                                {exp.analysis.sampleSizeTreatment < 7 && (
                                    <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                        Not enough data yet ({exp.analysis.sampleSizeTreatment} days)
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground text-sm">
                                <p>Insufficient data to analyze.</p>
                                <p className="text-xs mt-1">Need at least 3 days before & during.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
            {experiments.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                    <p>No experiments tracked yet. Add one to see if it helps!</p>
                </div>
            )}
        </div>
    )
}
