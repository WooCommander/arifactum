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
    }
}
