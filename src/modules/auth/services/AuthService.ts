import { supabase } from '@/api/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export type { User, Session, AuthError }

class AuthService {
    async getSession(): Promise<{ session: Session | null }> {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data
    }

    async getUser(): Promise<{ user: User | null }> {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
            // If session is missing, it's not a critical system error, just a guest state
            // Supabase JS v2 usually returns null user if no session, but let's be safe
            return { user: null }
        }
        return data
    }

    async signInWithPassword(email: string, password: string) {
        return await supabase.auth.signInWithPassword({
            email,
            password
        })
    }

    async signUp(email: string, password: string) {
        return await supabase.auth.signUp({
            email,
            password
        })
    }

    async signOut(): Promise<void> {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        return supabase.auth.onAuthStateChange(callback)
    }

    async getUserStats() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('xp, level, total_distance_meters, routes_completed_count, total_seconds_spent')
            .eq('id', user.id)
            .single()

        const xp = profile?.xp || 0
        const level = profile?.level || 1
        const nextLevelXP = level * 1000
        
        let title = 'Новичок'
        if (level >= 10) title = 'Артефактор'
        else if (level >= 7) title = 'Легенда'
        else if (level >= 5) title = 'Хранитель'
        else if (level >= 3) title = 'Исследователь'

        return {
            joinedDate: new Date(user.created_at || Date.now()),
            xp,
            level,
            levelTitle: title,
            nextLevelThreshold: nextLevelXP,
            totalDistance: (profile?.total_distance_meters || 0) / 1000, // km
            routesCompleted: profile?.routes_completed_count || 0,
            avgSpeed: (profile?.total_seconds_spent || 0) > 0 
                ? ((profile?.total_distance_meters || 0) / 1000) / ((profile?.total_seconds_spent || 0) / 3600)
                : 0
        }
    }

    async getProfile(): Promise<{
        display_name: string | null
        first_name: string | null
        last_name: string | null
        gender: string | null
        birth_date: string | null
    }> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { display_name: null, first_name: null, last_name: null, gender: null, birth_date: null }
        const { data } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name, gender, birth_date')
            .eq('id', user.id)
            .single()
        return {
            display_name: data?.display_name ?? null,
            first_name:   data?.first_name ?? null,
            last_name:    data?.last_name ?? null,
            gender:       data?.gender ?? null,
            birth_date:   data?.birth_date ?? null,
        }
    }

    async saveProfile(updates: {
        display_name?: string | null
        first_name?: string | null
        last_name?: string | null
        gender?: string | null
        birth_date?: string | null
    }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
        if (error) throw error
    }

    async setDisplayName(name: string): Promise<void> {
        return this.saveProfile({ display_name: name.trim() || null })
    }

    async setCurrencyPreference(code: string): Promise<void> {
        await supabase.auth.updateUser({
            data: { preferred_currency: code }
        })
    }

    async setExchangeRates(usd: number, eur: number): Promise<void> {
        await supabase.auth.updateUser({
            data: { usd_rate: usd, eur_rate: eur }
        })
    }

    async getUserActivity(limit: number = 5) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data } = await supabase
            .from('prices')
            .select(`
                id,
                price,
                created_at,
                product_id,
                products (name, unit)
            `)
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        // Type the response to avoid 'any'
        interface PriceActivity {
            id: string
            price: number
            created_at: string
            product_id: string
            products: { name: string; unit: string } | null
        }

        const typedData = data as unknown as PriceActivity[]

        return typedData?.map(item => ({
            id: item.id,
            productId: item.product_id,
            action: 'Добавил цену',
            item: item.products?.name || 'Товар',
            price: item.price,
            details: `${item.price.toLocaleString()} ₽`,
            time: new Date(item.created_at).toLocaleDateString('ru-RU'),
            fullDate: item.created_at,
            icon: '🏷️'
        })) || []
    }
}

export const instance = new AuthService()
export { instance as AuthService }
