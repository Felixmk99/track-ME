'use client'

import React from 'react'
import { useLanguage } from '@/components/providers/language-provider'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Languages, Check } from "lucide-react"

export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <span className="text-lg leading-none">
                        {locale === 'en' ? '🇺🇸' : '🇩🇪'}
                    </span>
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale('en')} className="flex justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                        <span className="text-lg leading-none">🇺🇸</span>
                        English
                    </span>
                    {locale === 'en' && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('de')} className="flex justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                        <span className="text-lg leading-none">🇩🇪</span>
                        Deutsch
                    </span>
                    {locale === 'de' && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
