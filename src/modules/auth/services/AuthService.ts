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

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.warn('Error fetching profile stats:', error)
            }

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
        } catch (e) {
            console.error('Failed to get user stats:', e)
            return null
        }
    }

    async getProfile(): Promise<{
        display_name: string | null
        first_name: string | null
        last_name: string | null
        gender: string | null
        birth_date: string | null
        avatar_url: string | null
    }> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { display_name: null, first_name: null, last_name: null, gender: null, birth_date: null, avatar_url: null }
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('display_name, first_name, last_name, gender, birth_date, avatar_url')
                .eq('id', user.id)
                .single()
            
            if (error && error.code !== 'PGRST116') throw error
            
            return {
                display_name: data?.display_name ?? null,
                first_name:   data?.first_name ?? null,
                last_name:    data?.last_name ?? null,
                gender:       data?.gender ?? null,
                birth_date:   data?.birth_date ?? null,
                avatar_url:   data?.avatar_url ?? null
            }
        } catch (e) {
            return { display_name: null, first_name: null, last_name: null, gender: null, birth_date: null, avatar_url: null }
        }
    }

    async saveProfile(updates: {
        display_name?: string | null
        first_name?: string | null
        last_name?: string | null
        gender?: string | null
        birth_date?: string | null
        avatar_url?: string | null
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

    async getUserActivity(limit: number = 5) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data } = await supabase
            .from('routes')
            .select('id, title, created_at')
            .eq('author_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        return data?.map(item => ({
            id: item.id,
            action: 'Создан маршрут',
            item: item.title,
            time: new Date(item.created_at).toLocaleDateString('ru-RU'),
            icon: '📍'
        })) || []
    }

    async uploadAvatar(file: File): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/${Math.random()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        await this.saveProfile({ avatar_url: publicUrl })
        return publicUrl
    }
}

export const instance = new AuthService()
export { instance as AuthService }
