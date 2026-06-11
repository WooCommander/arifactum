import { supabase } from '@/api/supabase'
import type { RouteDTO, CheckpointDTO } from '../types'
import { OfflineService } from '@/modules/offline/services/OfflineService'
import { DbService } from '@/modules/offline/services/DbService'

export const routeService = {
    async getRoutes(userId?: string, options?: { search?: string, category?: string, authorId?: string }): Promise<RouteDTO[]> {
        let query = supabase
            .from('routes')
            .select('*, profiles(display_name, avatar_url), checkpoints_count:checkpoints(count), start_point:checkpoints(lat, lng)')
            .eq('is_blocked', false)
            .order('created_at', { ascending: false })

        if (userId) {
            // Show published routes OR those created by the current user
            query = query.or(`status.eq.published,author_id.eq.${userId}`)
        } else {
            // Guests only see published routes
            query = query.eq('status', 'published')
        }

        if (options?.category && options.category !== 'Все') {
            query = query.eq('category', options.category)
        }

        if (options?.search) {
            // Search in title OR in tags array
            query = query.or(`title.ilike.%${options.search}%,tags.cs.{"${options.search}"}`)
        }

        if (options?.authorId) {
            query = query.eq('author_id', options.authorId)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    },

    async getRouteById(id: string): Promise<RouteDTO> {
        // Check offline first
        if (OfflineService.isDownloaded(id)) {
            const local = await DbService.get('routes', id)
            if (local) return local
        }

        const { data, error } = await supabase
            .from('routes')
            .select('*, profiles(display_name, avatar_url), checkpoints_count:checkpoints(count)')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async getCheckpoints(routeId: string): Promise<CheckpointDTO[]> {
        // Check offline first
        if (OfflineService.isDownloaded(routeId)) {
            const local = await DbService.get('checkpoints', routeId)
            if (local) return local
        }

        const { data, error } = await supabase
            .from('checkpoints')
            .select('*')
            .eq('route_id', routeId)
            .order('order_index', { ascending: true })

        if (error) throw error
        return data || []
    },

    async createRoute(route: Omit<RouteDTO, 'id' | 'created_at' | 'updated_at' | 'checkpoints_count' | 'rating_avg'>): Promise<RouteDTO> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Пользователь не авторизован (сессия не найдена)')

        const { data, error } = await supabase
            .from('routes')
            .insert({ ...route, author_id: user.id })
            .select()
            .single()

        if (error) {
            console.error('Supabase createRoute error:', error)
            throw error
        }
        return data
    },

    async createCheckpoint(checkpoint: Omit<CheckpointDTO, 'id' | 'created_at'>): Promise<CheckpointDTO> {
        const { data, error } = await supabase
            .from('checkpoints')
            .insert(checkpoint)
            .select()
            .single()

        if (error) {
            console.error('Supabase createCheckpoint error:', error)
            throw error
        }
        return data
    },

    async deleteRoute(id: string): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async updateRouteStatus(id: string, status: 'draft' | 'pending' | 'published'): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .update({ status })
            .eq('id', id)

        if (error) throw error
    },

    async updateRoute(id: string, data: Partial<RouteDTO>): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .update(data)
            .eq('id', id)

        if (error) throw error
    },

    async deleteCheckpointsByRoute(routeId: string): Promise<void> {
        const { error } = await supabase
            .from('checkpoints')
            .delete()
            .eq('route_id', routeId)

        if (error) throw error
    },

    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('level, role')
            .eq('id', userId)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    },

    async incrementCompletionsCount(id: string): Promise<void> {
        const { error } = await supabase.rpc('increment_route_completions', { route_id: id })
        if (error) throw error
    }
}
