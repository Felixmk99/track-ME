'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Locale, Dictionary } from '@/lib/i18n/types'
import { en } from '@/lib/i18n/dictionaries/en'
import { de } from '@/lib/i18n/dictionaries/de'

type LanguageProviderProps = {
    children: React.ReactNode
}

type LanguageContextType = {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
    dictionary: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [locale, setLocaleState] = useState<Locale>('en')
    const [mounted, setMounted] = useState(false)

    // Load persisted preference
    useEffect(() => {
        const saved = localStorage.getItem('track-me-locale') as Locale
        if (saved && (saved === 'en' || saved === 'de')) {
            setLocaleState(saved)
        }
        setMounted(true)
    }, [])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem('track-me-locale', newLocale)
    }

    const dictionary = locale === 'de' ? de : en

    const t = (path: string): string => {
        const keys = path.split('.')
        let current: any = dictionary
        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Translation missing for key: ${path}`)
                return path
            }
            current = current[key]
        }
        return current as string
    }

    // Prevent hydration mismatch by rendering children only after mount, 
    // or by accepting that server rendered initial EN and client might switch to DE.
    // Ideally we render children always, but let the text update. 
    // Since we are doing Client-Side only switch for now, just returning children is fine.
    // However, to avoid flash of wrong content if default is EN and user prefers DE,
    // we might see a flicker. That's acceptable for this scope.

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t, dictionary }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
