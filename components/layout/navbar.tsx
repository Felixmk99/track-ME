import Link from "next/link"
import { Activity } from "lucide-react"

export default function Navbar() {
    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <Activity className="h-6 w-6" />
                    <span className="font-bold inline-block">Visible Analytics</span>
                </Link>
                <div className="mr-4 hidden md:flex">
                    <Link
                        href="/dashboard"
                        className="mr-6 text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/experiments"
                        className="mr-6 text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        Experiments
                    </Link>
                    <Link
                        href="/upload"
                        className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        Upload Data
                    </Link>
                </div>
                <div className="ml-auto flex items-center space-x-4">
                    {/* Auth placeholder */}
                    <Link
                        href="/login"
                        className="text-sm font-medium transition-colors hover:text-primary"
                    >
                        Login
                    </Link>
                </div>
            </div>
        </nav>
    )
}
