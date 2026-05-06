import { supabase } from '@/api/supabase'

export interface ProjectStats {
    totalUsers: number
    totalRoutes: number
    totalCompletions: number
    activeToday: number
}

export const AdminService = {
    async getProjectStats(): Promise<ProjectStats> {
        const [users, routes, completions] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('routes').select('*', { count: 'exact', head: true }),
            supabase.from('route_completions').select('*', { count: 'exact', head: true })
        ])

        return {
            totalUsers: users.count || 0,
            totalRoutes: routes.count || 0,
            totalCompletions: completions.count || 0,
            activeToday: Math.floor((users.count || 0) * 0.1) // Placeholder
        }
    },

    async blockUser(userId: string, reason: string): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ is_blocked: true, block_reason: reason })
            .eq('id', userId)
        if (error) throw error
    },

    async unblockUser(userId: string): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ is_blocked: false, block_reason: null })
            .eq('id', userId)
        if (error) throw error
    },

    async toggleRouteBlock(routeId: string, isBlocked: boolean): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .update({ is_blocked: isBlocked })
            .eq('id', routeId)
        if (error) throw error
    },

    async searchUsers(query: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.%${query}%,first_name.ilike.%${query}%`)
            .limit(20)
        if (error) throw error
        return data
    }
}
