'use client'

import React from 'react'
import { useLanguage } from '@/components/providers/language-provider'

export function Footer() {
    const { t } = useLanguage()

    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 mt-auto">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                <p>{t('footer.built_by')}</p>
                <p className="mt-1">
                    <a href="mailto:felixmkania@gmail.com" className="hover:text-foreground transition-colors underline underline-offset-4">
                        {t('footer.contact')}
                    </a>
                </p>
            </div>
        </footer>
    )
}
