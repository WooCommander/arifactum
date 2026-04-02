import { supabase } from '@/api/supabase'
import type { RouteDTO, CheckpointDTO } from '../types'

export const routeService = {
    async getRoutes(): Promise<RouteDTO[]> {
        const { data, error } = await supabase
            .from('routes')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    async getRouteById(id: string): Promise<RouteDTO> {
        const { data, error } = await supabase
            .from('routes')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async getCheckpoints(routeId: string): Promise<CheckpointDTO[]> {
        const { data, error } = await supabase
            .from('checkpoints')
            .select('*')
            .eq('route_id', routeId)
            .order('order_index', { ascending: true })

        if (error) throw error
        return data || []
    },

    async createRoute(route: Omit<RouteDTO, 'id' | 'created_at' | 'updated_at' | 'checkpoints_count' | 'rating_avg'>): Promise<RouteDTO> {
        const { data, error } = await supabase
            .from('routes')
            .insert(route)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async createCheckpoint(checkpoint: Omit<CheckpointDTO, 'id' | 'created_at'>): Promise<CheckpointDTO> {
        const { data, error } = await supabase
            .from('checkpoints')
            .insert(checkpoint)
            .select()
            .single()

        if (error) throw error
        return data
    }
}
