import { Capacitor } from '@capacitor/core'

export interface UpdateInfo {
    hasUpdate: boolean
    version?: string
    apkUrl?: string
    notes?: string
}

function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1
        if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1
    }
    return 0
}

export async function checkForUpdate(): Promise<UpdateInfo> {
    if (!Capacitor.isNativePlatform()) return { hasUpdate: false }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const url = `${supabaseUrl}/storage/v1/object/public/releases/version.json?t=${Date.now()}`

    try {
        const res = await fetch(url)
        if (!res.ok) return { hasUpdate: false }
        const data = await res.json()
        const hasUpdate = compareVersions(data.version, __APP_VERSION__) > 0
        return { hasUpdate, version: data.version, apkUrl: data.apkUrl, notes: data.notes }
    } catch {
        return { hasUpdate: false }
    }
}

export function installUpdate(apkUrl: string): void {
    // '_system' tells Capacitor to open in the native browser
    // Android will download the APK and prompt to install
    window.open(apkUrl, '_system')
}
