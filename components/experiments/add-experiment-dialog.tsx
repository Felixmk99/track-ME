'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus } from 'lucide-react'

export function AddExperimentDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [category, setCategory] = useState('medication')

    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async () => {
        if (!name || !startDate) return
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            await supabase.from('experiments').insert({
                user_id: user.id,
                name,
                start_date: startDate,
                category: category as any
            } as any)

            setOpen(false)
            setName('')
            setStartDate('')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Experiment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Experiment</DialogTitle>
                    <DialogDescription>
                        Track a new medication, supplement, or lifestyle change.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="e.g. Low Dose Naltrexone"
                            className="col-span-3"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start" className="text-right">
                            Start Date
                        </Label>
                        <Input
                            id="start"
                            type="date"
                            className="col-span-3"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="medication">Medication</SelectItem>
                                <SelectItem value="supplement">Supplement</SelectItem>
                                <SelectItem value="lifestyle">Lifestyle</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Experiment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
