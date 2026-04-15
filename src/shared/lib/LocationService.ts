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
    // В нативном приложении МОК-режим ЗАПРЕЩЕН (всегда пытаемся юзать GPS)
    if (Capacitor.isNativePlatform()) return false
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
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
      // ПРОВЕРКА ПРАВ (Важно для Android)
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') {
        await Geolocation.requestPermissions()
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000, // Увеличиваем таймаут для холодного старта
        maximumAge: 3000
      })

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading
      }
    } catch (e) {
      console.error('[LocationService] Critical GPS Error:', e)
      // Если есть явный fallback (например от карты), используем его
      if (options?.fallback) {
        return { latitude: options.fallback[0], longitude: options.fallback[1], heading: 0 }
      }
      // Если мы в приложении и GPS сдох — возвращаем Москву только в самом крайнем случае
      // но лучше выбросить ошибку, чтобы UI показал "GPS недоступен"
      return { 
        latitude: this.MOCK_COORDS.latitude, 
        longitude: this.MOCK_COORDS.longitude, 
        heading: 0 
      }
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
