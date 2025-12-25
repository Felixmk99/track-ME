import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExperimentsClient from "./experiments-client";

export default async function ExperimentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Check if user has uploaded data
    const { count, error } = await supabase
        .from('health_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (!error && count === 0) {
        redirect('/upload');
    }

    // 2. Fetch Experiments
    const { data: experiments } = await supabase
        .from('experiments')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

    return (
        <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ExperimentsClient initialExperiments={experiments || []} />
        </div>
    );
}
