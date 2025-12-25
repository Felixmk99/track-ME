'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, differenceInDays, parseISO, isAfter, isBefore } from "date-fns"
import { Plus, Trash, Pill, Activity, Moon, Utensils, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"

type Experiment = {
    id: string
    name: string
    category: 'medication' | 'supplement' | 'lifestyle' | 'other'
    start_date: string
    end_date: string | null
    created_at: string
}

export default function ExperimentsClient({ initialExperiments }: { initialExperiments: Experiment[] }) {
    const [experiments, setExperiments] = useState<Experiment[]>(initialExperiments)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'lifestyle',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: ''
    })

    const activeExperiments = experiments.filter(e => !e.end_date || isAfter(parseISO(e.end_date), new Date()))
    const pastExperiments = experiments.filter(e => e.end_date && isBefore(parseISO(e.end_date), new Date()))

    const handleCreate = async () => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No user")

            const { data, error } = await supabase.from('experiments').insert({
                user_id: user.id,
                name: formData.name,
                category: formData.category,
                start_date: formData.start_date,
                end_date: formData.end_date || null
            } as any).select().single()

            if (error) throw error

            setExperiments([data, ...experiments])
            setIsDialogOpen(false)
            setFormData({ name: '', category: 'lifestyle', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '' })
            router.refresh()
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirmed = window.confirm("Are you sure you want to delete this experiment?")
        if (!confirmed) return

        const { error } = await supabase.from('experiments').delete().eq('id', id)
        if (!error) {
            setExperiments(experiments.filter(e => e.id !== id))
            router.refresh()
        }
    }

    const getIcon = (category: string) => {
        switch (category) {
            case 'medication': return <Pill className="w-5 h-5 text-rose-500" />
            case 'supplement': return <Utensils className="w-5 h-5 text-emerald-500" /> // Using utensils for supplement/diet roughly
            case 'lifestyle': return <Moon className="w-5 h-5 text-indigo-500" />
            default: return <Activity className="w-5 h-5 text-blue-500" />
        }
    }

    return (
        <div className="space-y-12">

            {/* Header */}
            <div>
                <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">Health Dashboard</p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-5xl font-serif text-foreground leading-tight">
                        Manage your <br />
                        <span className="text-rose-400 italic">experiments</span>
                    </h1>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-full px-6">
                                <Plus className="w-4 h-4 mr-2" /> New Experiment
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Log New Experiment</DialogTitle>
                                <DialogDescription>Track a new intervention to measure its impact on your health.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Experiment Name</Label>
                                    <Input
                                        placeholder="e.g. Low Dose Naltrexone"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={v => setFormData({ ...formData, category: v as any })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lifestyle">Lifestyle (Pacing, Rest)</SelectItem>
                                            <SelectItem value="medication">Medication</SelectItem>
                                            <SelectItem value="supplement">Supplement</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date (Optional)</Label>
                                        <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={isLoading || !formData.name}>
                                    {isLoading ? 'Creating...' : 'Start Experiment'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Currently Active */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Currently Active</h3>

                {activeExperiments.length > 0 ? (
                    <div className="grid gap-6">
                        {activeExperiments.map(exp => {
                            const daysActive = differenceInDays(new Date(), parseISO(exp.start_date))

                            return (
                                <Card key={exp.id} className="bg-zinc-50/50 dark:bg-zinc-900/30 border-0 shadow-sm overflow-hidden relative group">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(exp.id)}>
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <CardContent className="p-8">
                                        <div className="flex flex-col md:flex-row gap-8">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wide">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                        Active • Day {daysActive}
                                                    </div>
                                                    {exp.end_date && (
                                                        <span className="text-xs text-muted-foreground">Ends {format(parseISO(exp.end_date), 'MMM d')}</span>
                                                    )}
                                                </div>

                                                <div>
                                                    <h2 className="text-3xl font-serif text-foreground mb-2">{exp.name}</h2>
                                                    <p className="text-muted-foreground max-w-xl">
                                                        Tracking impact on Symptom Score and HRV.
                                                    </p>
                                                </div>

                                                <div className="flex gap-8 pt-4">
                                                    <div className="flex items-center gap-2">
                                                        {getIcon(exp.category)}
                                                        <span className="text-sm font-medium capitalize">{exp.category}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-5 h-5 text-rose-400" />
                                                        <span className="text-sm font-medium">Tracking Vitals</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress / Status Block */}
                                            <div className="w-full md:w-80 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center space-y-4">
                                                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                                    <span>Progress</span>
                                                    <span>Running</span>
                                                </div>
                                                <Progress value={30} className="h-2" />
                                                <Button className="w-full bg-zinc-900 text-white text-xs h-10 gap-2">
                                                    View Daily Logs
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground bg-zinc-50/50">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-foreground">No active experiments</h3>
                        <p className="text-sm">Start a new experiment to track how interventions affect your health.</p>
                    </div>
                )}
            </div>

            {/* Past Experiments */}
            <div className="space-y-4">
                <div className="flex justify-between items-end border-b pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Past Experiments</h3>
                    <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View Archive</span>
                </div>

                {pastExperiments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pastExperiments.map(exp => (
                            <Card key={exp.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group relative">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(exp.id)}>
                                        <Trash className="w-3 h-3" />
                                    </Button>
                                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <CardContent className="p-6 space-y-4">
                                    <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                                        {getIcon(exp.category)}
                                    </div>

                                    <div>
                                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-muted-foreground uppercase tracking-wide">Ended {format(parseISO(exp.end_date!), 'MMM d')}</span>
                                        <h3 className="text-xl font-serif mt-3 mb-1">{exp.name}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            Completed experiment tracking {exp.category} intervention.
                                        </p>
                                    </div>

                                    {/* Mock Outcome */}
                                    <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-green-50 text-green-700 rounded-md w-fit">
                                        <ArrowUpRight className="w-3 h-3" />
                                        Positive Trend
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground opacity-50">
                        No past experiments found.
                    </div>
                )}
            </div>

        </div>
    )
}
