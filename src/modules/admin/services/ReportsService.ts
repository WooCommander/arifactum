import { supabase } from '@/api/supabase'

export interface Report {
    id: string
    route_id: string
    reporter_id: string
    reason: string
    status: 'pending' | 'resolved' | 'ignored'
    created_at: string
    // Доп. данные для админки
    route_title?: string
    reporter_name?: string
}

export const ReportsService = {
    async createReport(routeId: string, reason: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('reports')
            .insert({
                route_id: routeId,
                reporter_id: user.id,
                reason,
                status: 'pending'
            })

        if (error) throw error
    },

    async getActiveReports(): Promise<Report[]> {
        const { data, error } = await supabase
            .from('reports')
            .select(`
                *,
                routes ( title ),
                profiles ( display_name )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error

        return (data || []).map(item => ({
            ...item,
            route_title: (item as any).routes?.title,
            reporter_name: (item as any).profiles?.display_name
        }))
    },

    async resolveReport(id: string, status: 'resolved' | 'ignored'): Promise<void> {
        const { error } = await supabase
            .from('reports')
            .update({ status })
            .eq('id', id)

        if (error) throw error
    }
}
