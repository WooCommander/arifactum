import { supabase } from '@/api/supabase'

export type VoteType = 'confirm' | 'deny'

class VerificationService {
    async vote(priceId: string, voteType: VoteType): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // Guard: cannot vote on own price
        const { data: price } = await supabase
            .from('prices').select('created_by').eq('id', priceId).single()
        if (price?.created_by === user.id) return

        const { error } = await supabase
            .from('price_verifications')
            .upsert(
                { price_id: priceId, user_id: user.id, vote: voteType },
                { onConflict: 'price_id,user_id' }
            )
        if (error) throw error
    }

    async removeVote(priceId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { error } = await supabase
            .from('price_verifications')
            .delete()
            .eq('price_id', priceId)
            .eq('user_id', user.id)
        if (error) throw error
    }

    async getUserVotes(priceIds: string[]): Promise<Record<string, VoteType>> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || priceIds.length === 0) return {}
        const { data, error } = await supabase
            .from('price_verifications')
            .select('price_id, vote')
            .eq('user_id', user.id)
            .in('price_id', priceIds)
        if (error || !data) return {}
        return Object.fromEntries(data.map(v => [v.price_id, v.vote as VoteType]))
    }
}

export const instance = new VerificationService()
export { instance as VerificationService }
