import { supabase } from '@/api/supabase'

export interface CommunityLevel {
    id: string
    creator_id: string
    size: number
    dots: { color: string, r: number, c: number }[]
    solutions: Record<string, { r: number, c: number }[]>
    likes: number
    created_at: string
    profiles?: { display_name: string }
}

export interface LevelScore {
    created_at: string
}

export interface GameScoreInsert {
    game_type: string
    score: number
    difficulty: string
}

class GameService {
    async shareLevel(level: { size: number, dots: any[], solutions: any }): Promise<CommunityLevel | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data, error } = await supabase.from('community_levels').insert({
            creator_id: user.id,
            size: level.size,
            dots: level.dots,
            solutions: level.solutions
        }).select().single()

        if (error) {
            console.error('Error sharing level:', error)
            return null
        }
        return data
    }

    async getCommunityLevels(limit = 50): Promise<any[]> {
        const { data, error } = await supabase
            .from('community_levels')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error || !data) {
            console.error('Error fetching levels:', error)
            return []
        }

        const userIds = [...new Set(data.filter(d => d.creator_id).map(d => d.creator_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        const profileMap = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.display_name }), {})

        return data.map((d: any) => ({
            ...d,
            profiles: { display_name: profileMap[d.creator_id] }
        }))
    }

    async saveScore(levelId: string, score: number): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // We can do an upsert or just insert a new score. Let's just insert to keep history, or upsert best.
        // For simplicity: insert every valid run. Leaderboard will just query MAX(score) per user or we just order by score DESC.
        const { error } = await supabase.from('level_scores').insert({
            level_id: levelId,
            user_id: user.id,
            score
        })
        
        if (error) {
            console.error('Error saving score:', error)
        }
    }

    async saveGameScore(data: GameScoreInsert): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('game_scores').insert({
            user_id: user.id,
            game_type: data.game_type,
            score: data.score,
            difficulty: data.difficulty
        })

        if (error) {
            console.error('Error saving game score:', error)
        }
    }

    async getLeaderboard(levelId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('level_scores')
            .select('id, score, created_at, user_id')
            .eq('level_id', levelId)
            .order('score', { ascending: false })
            .limit(10)

        if (error || !data) {
            console.error('Error fetching leaderboard:', error)
            return []
        }

        const userIds = [...new Set(data.filter(d => d.user_id).map(d => d.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        const profileMap = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.display_name }), {})

        return data.map((d: any) => ({
            ...d,
            profiles: { display_name: profileMap[d.user_id] }
        }))
    }

    async likeLevel(levelId: string): Promise<number | null> {
        // Защита от накрутки локально
        if (localStorage.getItem('fp_liked_' + levelId)) return null

        const { data: levelData } = await supabase.from('community_levels').select('likes').eq('id', levelId).single()
        if (levelData) {
            const newLikes = (levelData.likes || 0) + 1
            const { error } = await supabase.from('community_levels').update({ likes: newLikes }).eq('id', levelId)
            if (!error) {
                localStorage.setItem('fp_liked_' + levelId, '1')
                return newLikes
            }
        }
        return null
    }
}

export const gameService = new GameService()
