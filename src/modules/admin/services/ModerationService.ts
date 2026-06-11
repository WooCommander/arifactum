import { supabase } from '@/api/supabase'
import type { RouteDTO } from '@/modules/routes/types'
import { CheckpointArtifactService, type CheckpointArtifact } from '@/modules/checkpoints/services/CheckpointArtifactService'

type RouteWithAuthor = { author_id: string | null }

export type { CheckpointArtifact }

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
        const { data: route } = await supabase
            .from('routes')
            .select('author_id')
            .eq('id', id)
            .single<RouteWithAuthor>()

        const { error } = await supabase
            .from('routes')
            .update({ status: 'published' })
            .eq('id', id)

        if (error) throw error

        if (route?.author_id) {
            supabase.rpc('recalculate_creator_score', { p_user_id: route.author_id }).then()
        }
    },

    async rejectRoute(id: string, reason: string): Promise<void> {
        const { error } = await supabase
            .from('routes')
            .update({
                status: 'draft',
                moderation_comment: reason
            })
            .eq('id', id)

        if (error) throw error
    },

    getPendingArtifacts: () => CheckpointArtifactService.getPendingForModeration(),
    approveArtifact: (id: string) => CheckpointArtifactService.approve(id),
    rejectArtifact: (id: string, reason: string) => CheckpointArtifactService.reject(id, reason)
}
