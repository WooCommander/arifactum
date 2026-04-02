export function setCache<T>(key: string, data: T): void {
    try {
        localStorage.setItem(`fp_cache_${key}`, JSON.stringify(data))
    } catch (e) {
        console.warn(`Failed to save cache for key: ${key}`, e)
    }
}

export function getCache<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(`fp_cache_${key}`)
        return item ? JSON.parse(item) : null
    } catch (e) {
        console.warn(`Failed to read cache for key: ${key}`, e)
        return null
    }
}

export function removeCache(key: string): void {
    try {
        localStorage.removeItem(`fp_cache_${key}`)
    } catch (e) {
        console.warn(`Failed to remove cache for key: ${key}`, e)
    }
}
