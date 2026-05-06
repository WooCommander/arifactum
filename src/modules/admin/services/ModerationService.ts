import { supabase } from '@/api/supabase'
import type { RouteDTO } from '@/modules/routes/types'

export interface ModerationRoute extends RouteDTO {
    author_name?: string
}

export const ModerationService = {
    async getPendingRoutes(): Promise<ModerationRoute[]> {
        const { data, error } = await supabase
            .from('routes')
            .select(`
                *,
                profiles (
                    display_name
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })

        if (error) throw error
        
        return (data || []).map(route => ({
            ...route,
            author_name: (route as any).profiles?.display_name || 'Неизвестный автор'
        }))
    },

    async approveRoute(id: string): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .update({ 
                status: 'published',
                // moderation_date: new Date().toISOString() // Можно добавить позже
            })
            .eq('id', id)

        if (error) throw error
    },

    async rejectRoute(id: string, reason: string): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .update({ 
                status: 'draft', // Возвращаем в черновики для исправления
                moderation_comment: reason 
            })
            .eq('id', id)

        if (error) throw error
    }
}
