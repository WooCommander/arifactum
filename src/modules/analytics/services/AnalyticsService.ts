
import { supabase } from '@/api/supabase'

export interface PricePoint {
    date: string
    price: number
}

export interface CheapPlace {
    placeName: string
    price: number
    distance?: string
}

class AnalyticsService {
    async getPriceHistory(productId: string, period: '7d' | '30d' | '90d' = '30d'): Promise<PricePoint[]> {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data, error } = await supabase
            .from('prices')
            .select('price, created_at')
            .eq('product_id', productId)
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: true })

        if (error || !data) return []

        return data.map(p => ({
            date: new Date(p.created_at).toLocaleDateString('ru-RU'),
            price: p.price
        }))
    }

    async getBestPlaces(productId: string): Promise<CheapPlace[]> {
        const { data, error } = await supabase
            .from('prices')
            .select('price, stores(name)')
            .eq('product_id', productId)
            .order('price', { ascending: true })
            .limit(30)

        if (error || !data) return []

        // Min price per store
        const storeMap = new Map<string, number>()
        for (const p of data) {
            const storeName = (p.stores as any)?.name || 'Неизвестно'
            if (!storeMap.has(storeName) || storeMap.get(storeName)! > p.price) {
                storeMap.set(storeName, p.price)
            }
        }

        return Array.from(storeMap.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, 5)
            .map(([placeName, price]) => ({ placeName, price }))
    }
}

export const instance = new AnalyticsService()
export { instance as AnalyticsService }
