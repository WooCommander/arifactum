/**
 * Расчет расстояния между двумя точками на сфере (формула гаверсинусов)
 * @param lat1 Широта 1
 * @param lon1 Долгота 1
 * @param lat2 Широта 2
 * @param lon2 Долгота 2
 * @returns Расстояние в метрах
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

/**
 * Проверка нахождения пользователя в радиусе точки
 * @param userLat Широта пользователя
 * @param userLon Долгота пользователя
 * @param targetLat Широта цели
 * @param targetLon Долгота цели
 * @param radius Радиус в метрах (по умолчанию 50м)
 */
export function isWithinRange(
    userLat: number,
    userLon: number,
    targetLat: number,
    targetLon: number,
    radius: number = 50
): boolean {
    const dist = getDistance(userLat, userLon, targetLat, targetLon)
    return dist <= radius
}
