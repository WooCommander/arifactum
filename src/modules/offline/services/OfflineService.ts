import { DbService } from './DbService'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { ref } from 'vue'

export class OfflineService {
  private static STORAGE_KEY = 'artifactum-downloaded-ids'
  private static MAX_DOWNLOADS = 5
  
  static downloadedIds = ref<string[]>(JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'))

  static isDownloaded(id: string): boolean {
    return this.downloadedIds.value.includes(id)
  }

  static async downloadRoute(route: any, checkpoints: any[]): Promise<void> {
    if (this.downloadedIds.value.length >= this.MAX_DOWNLOADS) {
      throw new Error(`Лимит достигнут! Вы можете скачать максимум ${this.MAX_DOWNLOADS} маршрутов.`)
    }

    // 1. Save data to DB
    await DbService.set('routes', route.id, route)
    await DbService.set('checkpoints', route.id, checkpoints)

    // 2. Download images
    const imageUrls = [
      route.image_url,
      ...(route.images || []),
      ...checkpoints.map(cp => cp.photo_url),
      ...checkpoints.flatMap(cp => cp.images || [])
    ].filter(Boolean)

    for (const url of imageUrls) {
      try {
        await this.cacheImage(url)
      } catch (e) {
        console.warn('Failed to cache image:', url, e)
      }
    }

    // 3. Update list
    if (!this.downloadedIds.value.includes(route.id)) {
      this.downloadedIds.value.push(route.id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.downloadedIds.value))
    }
  }

  static async removeRoute(id: string): Promise<void> {
    await DbService.delete('routes', id)
    await DbService.delete('checkpoints', id)
    
    // Note: We don't delete shared images to avoid complex dependency tracking for now
    
    this.downloadedIds.value = this.downloadedIds.value.filter(itemId => itemId !== id)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.downloadedIds.value))
  }

  private static async cacheImage(url: string): Promise<string> {
    try {
      const filename = btoa(url).substring(0, 32) + '.jpg'
      const path = `images/${filename}`

      // Check if exists
      try {
        await Filesystem.stat({
          path,
          directory: Directory.Data
        })
        return path
      } catch {
        // Not exists, download
        const response = await fetch(url)
        const blob = await response.blob()
        
        const base64 = await this.blobToBase64(blob)
        
        await Filesystem.writeFile({
          path,
          data: base64,
          directory: Directory.Data,
          recursive: true
        })
        return path
      }
    } catch (e) {
      throw e
    }
  }

  static async getLocalImageUrl(url: string): Promise<string | null> {
    if (!url) return null
    try {
      const filename = btoa(url).substring(0, 32) + '.jpg'
      const path = `images/${filename}`
      
      const res = await Filesystem.getUri({
        path,
        directory: Directory.Data
      })
      
      return Capacitor.convertFileSrc(res.uri)
    } catch {
      return url // Fallback to online
    }
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1]
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

// Global Capacitor variable for TypeScript
declare const Capacitor: any
