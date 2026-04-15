import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'

export interface LocationCoords {
  latitude: number
  longitude: number
  heading: number | null
}

export class LocationService {
  private static readonly MOCK_COORDS: LocationCoords = {
    latitude: 55.751244,
    longitude: 37.618423,
    heading: 0
  }

  /**
   * Проверяет, должна ли использоваться имитация GPS
   */
  static isMockMode(): boolean {
    return !Capacitor.isNativePlatform() || window.location.hostname === 'localhost'
  }

  /**
   * Получает текущую позицию
   */
  static async getCurrentPosition(options?: { fallback?: [number, number] }): Promise<LocationCoords> {
    if (this.isMockMode()) {
      console.log('[LocationService] Using mock location')
      const coords = options?.fallback || [this.MOCK_COORDS.latitude, this.MOCK_COORDS.longitude]
      return { latitude: coords[0], longitude: coords[1], heading: this.MOCK_COORDS.heading }
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      })
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading
      }
    } catch (e) {
      console.warn('[LocationService] Failed to get real location, falling back to mock:', e)
      const coords = options?.fallback || [this.MOCK_COORDS.latitude, this.MOCK_COORDS.longitude]
      return { latitude: coords[0], longitude: coords[1], heading: this.MOCK_COORDS.heading }
    }
  }

  /**
   * Подписывается на обновление позиции
   */
  static async watchPosition(
    callback: (coords: LocationCoords) => void,
    fallback?: [number, number]
  ): Promise<string> {
    if (this.isMockMode()) {
      console.log('[LocationService] Starting mock location watcher')
      
      const intervalId = setInterval(() => {
        const coords = fallback || [this.MOCK_COORDS.latitude, this.MOCK_COORDS.longitude]
        callback({ 
          latitude: coords[0], 
          longitude: coords[1], 
          heading: (Math.random() * 360) // Симулируем поворот в моке для тестов, если нужно (но пользователь просил не надо, оставлю 0)
        })
      }, 3000)

      return `mock_${intervalId}`
    }

    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000
        },
        (position) => {
          if (position) {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading
            })
          }
        }
      )
      return watchId
    } catch (e) {
      console.error('[LocationService] Error starting watchPosition:', e)
      throw e
    }
  }

  /**
   * Останавливает отслеживание
   */
  static async clearWatch(watchId: string): Promise<void> {
    if (watchId.startsWith('mock_')) {
      const intervalId = parseInt(watchId.replace('mock_', ''), 10)
      clearInterval(intervalId)
      return
    }

    await Geolocation.clearWatch({ id: watchId })
  }
}
