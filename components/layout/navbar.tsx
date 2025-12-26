'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/components/providers/language-provider"
import { LanguageSwitcher } from "./language-switcher"

export default function Navbar() {
    const [user, setUser] = useState<any>(null)
    const [hasData, setHasData] = useState<boolean>(false)
    const [mounted, setMounted] = useState(false)
    const { t } = useLanguage()
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        setMounted(true)
        const checkUserAndData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { count } = await supabase
                    .from('health_metrics')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)

                setHasData((count || 0) > 0)
            }
        }
        checkUserAndData()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                // Check data again on login
                supabase.from('health_metrics').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id)
                    .then(({ count }) => setHasData((count || 0) > 0))
            } else {
                setHasData(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // Helper for link styles
    const getLinkClass = (path: string) => {
        const isActive = pathname === path
        return cn(
            "mr-6 text-sm font-medium transition-colors hover:text-primary",
            isActive ? "text-foreground font-semibold" : "text-muted-foreground"
        )
    }

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
                <Link href={mounted && user ? "/dashboard" : "/"} className="mr-6 flex items-center space-x-2">
                    <Activity className="h-6 w-6 text-primary" />
                    <span className="font-bold inline-block text-lg">Track-ME</span>
                </Link>

                {/* Desktop Menu */}
                <div className="mr-4 hidden md:flex items-center">
                    {mounted && user && (
                        <>
                            {hasData && (
                                <>
                                    <Link href="/dashboard" className={getLinkClass('/dashboard')}>
                                        {t('navbar.dashboard')}
                                    </Link>
                                    <Link href="/experiments" className={getLinkClass('/experiments')}>
                                        {t('navbar.experiments')}
                                    </Link>
                                </>
                            )}
                            <Link href="/upload" className={getLinkClass('/upload')}>
                                {hasData ? t('navbar.data') : t('navbar.upload_data')}
                            </Link>
                        </>
                    )}
                </div>

                <div className="ml-auto flex items-center space-x-4">
                    <LanguageSwitcher />
                    {!mounted ? (
                        <div className="w-16 h-8" />
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                                            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'User'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem asChild>
                                            <Link href="/settings">{t('navbar.settings')}</Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={async () => {
                                        await supabase.auth.signOut()
                                        setUser(null)
                                        setHasData(false)
                                        router.push('/')
                                        router.refresh()
                                    }}>
                                        {t('navbar.logout')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className="text-sm font-medium transition-colors hover:text-primary">
                                {t('navbar.login')}
                            </Link>
                            <Button asChild size="sm">
                                <Link href="/signup">{t('navbar.signup')}</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
