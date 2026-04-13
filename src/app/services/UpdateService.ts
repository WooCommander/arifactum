import { changelog } from '@/data/changelog'

export interface UpdateInfo {
  version: string
  apkUrl: string
  notes: string
}

export const UpdateService = {
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!baseUrl) return null

      // Manifest is public in Supabase Storage
      const manifestUrl = `${baseUrl}/storage/v1/object/public/releases/version.json`
      
      const response = await fetch(manifestUrl, { cache: 'no-store' })
      if (!response.ok) return null

      const serverInfo: UpdateInfo = await response.json()
      const currentVersion = changelog[0]?.version

      if (serverInfo.version && currentVersion && this.isNewer(serverInfo.version, currentVersion)) {
        return serverInfo
      }
      
      return null
    } catch (e) {
      console.warn('Update check failed:', e)
      return null
    }
  },

  isNewer(server: string, current: string): boolean {
    const s = server.split('.').map(Number)
    const c = current.split('.').map(Number)
    
    for (let i = 0; i < 3; i++) {
      if ((s[i] || 0) > (c[i] || 0)) return true
      if ((s[i] || 0) < (c[i] || 0)) return false
    }
    return false
  }
}
