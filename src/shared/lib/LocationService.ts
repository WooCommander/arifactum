import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'

export interface LocationCoords {
  latitude: number
  longitude: number
}

export class LocationService {
  private static readonly MOCK_COORDS: LocationCoords = {
    latitude: 55.751244,
    longitude: 37.618423
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
  static async getCurrentPosition(options?: { fallback?: [number, number] }): Promise<[number, number]> {
    if (this.isMockMode()) {
      console.log('[LocationService] Using mock location')
      if (options?.fallback) return options.fallback
      return [this.MOCK_COORDS.latitude, this.MOCK_COORDS.longitude]
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      })
      return [position.coords.latitude, position.coords.longitude]
    } catch (e) {
      console.warn('[LocationService] Failed to get real location, falling back to mock:', e)
      if (options?.fallback) return options.fallback
      return [this.MOCK_COORDS.latitude, this.MOCK_COORDS.longitude]
    }
  }

  /**
   * Подписывается на обновление позиции
   */
  static async watchPosition(
    callback: (coords: [number, number]) => void,
    fallback?: [number, number]
  ): Promise<string> {
    if (this.isMockMode()) {
      console.log('[LocationService] Starting mock location watcher')
      
      const intervalId = setInterval(() => {
        // На localhost возвращаем fallback (если передан) или дефолт
        const coords = fallback || [this.MOCK_COORDS.latitude, this.MOCK_COORDS.longitude]
        callback(coords as [number, number])
      }, 3000)

      // Возвращаем ID интервала как строку для единообразия с Capacitor
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
            callback([position.coords.latitude, position.coords.longitude])
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
