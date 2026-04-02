import { createI18n } from 'vue-i18n'
import ru from '@/locales/ui_ru.json'
import en from '@/locales/ui_en.json'

const STORAGE_KEY = 'fp_locale'
const supported = ['ru', 'en'] as const
type SupportedLocale = (typeof supported)[number]

function normalizeLocale(code: string | undefined | null): SupportedLocale | null {
    if (!code) return null
    const lower = code.toLowerCase()
    const lang = lower.split('-')[0]
    if (supported.includes(lower as SupportedLocale)) return lower as SupportedLocale
    if (supported.includes(lang as SupportedLocale)) return lang as SupportedLocale
    return null
}

function detectLocale(): SupportedLocale {
    // 1) stored
    const stored = normalizeLocale(localStorage.getItem(STORAGE_KEY))
    if (stored) return stored

    // 2) navigator languages
    const nav = (navigator.languages || [navigator.language]).map(l => normalizeLocale(l)).find(Boolean)
    if (nav) return nav as SupportedLocale

    // fallback
    return 'ru'
}

export const i18n = createI18n({
    legacy: false,
    locale: detectLocale(),
    fallbackLocale: 'ru',
    messages: { ru, en }
})

export function setLocale(locale: SupportedLocale) {
    i18n.global.locale.value = locale
    localStorage.setItem(STORAGE_KEY, locale)
}

export const supportedLocales: SupportedLocale[] = [...supported]
