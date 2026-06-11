import { supabase } from '@/api/supabase'

export interface CheckpointArtifact {
    id: string
    createdAt: string
    checkpointId: string
    routeId: string
    userId: string
    photoUrl: string
    caption: string | null
    status: 'pending' | 'approved' | 'rejected'
    rejectionReason: string | null
    authorName?: string
    checkpointTitle?: string
}

export const CheckpointArtifactService = {
    async submit(checkpointId: string, routeId: string, photoUrl: string, caption?: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Не авторизован')

        const { error } = await supabase.from('checkpoint_artifacts').insert({
            checkpoint_id: checkpointId,
            route_id: routeId,
            user_id: user.id,
            photo_url: photoUrl,
            caption: caption || null
        })

        if (error) throw error
    },

    async getApprovedForCheckpoint(checkpointId: string): Promise<CheckpointArtifact[]> {
        const { data, error } = await supabase
            .from('checkpoint_artifacts')
            .select('*, profiles(display_name)')
            .eq('checkpoint_id', checkpointId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })

        if (error) throw error

        return (data || []).map(a => ({
            id: a.id,
            createdAt: a.created_at,
            checkpointId: a.checkpoint_id,
            routeId: a.route_id,
            userId: a.user_id,
            photoUrl: a.photo_url,
            caption: a.caption,
            status: a.status,
            rejectionReason: a.rejection_reason,
            authorName: (a as any).profiles?.display_name || 'Неизвестный'
        }))
    },

    async getPendingForModeration(): Promise<CheckpointArtifact[]> {
        const { data, error } = await supabase
            .from('checkpoint_artifacts')
            .select('*, profiles(display_name), checkpoints(title)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })

        if (error) throw error

        return (data || []).map(a => ({
            id: a.id,
            createdAt: a.created_at,
            checkpointId: a.checkpoint_id,
            routeId: a.route_id,
            userId: a.user_id,
            photoUrl: a.photo_url,
            caption: a.caption,
            status: a.status,
            rejectionReason: a.rejection_reason,
            authorName: (a as any).profiles?.display_name || 'Неизвестный',
            checkpointTitle: (a as any).checkpoints?.title || ''
        }))
    },

    async approve(id: string): Promise<void> {
        const { error } = await supabase
            .from('checkpoint_artifacts')
            .update({ status: 'approved' })
            .eq('id', id)
        if (error) throw error
    },

    async reject(id: string, reason: string): Promise<void> {
        const { error } = await supabase
            .from('checkpoint_artifacts')
            .update({ status: 'rejected', rejection_reason: reason })
            .eq('id', id)
        if (error) throw error
    }
}
