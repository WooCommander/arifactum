import { supabase } from '@/api/supabase'

export type LeaderboardCategory = 'xp' | 'distance' | 'routes'

export interface LeaderboardEntry {
    userId: string
    displayName: string
    avatarUrl: string | null
    score: number
    rank: number
    isCurrentUser: boolean
    xp: number
    distance: number
    routesCount: number
    level: number
    levelTitle: string
}


class LeaderboardServiceImpl {
    async getLeaderboard(category: LeaderboardCategory): Promise<LeaderboardEntry[]> {
        const { data: { user } } = await supabase.auth.getUser()
        const currentUserId = user?.id

        let orderBy = 'xp'
        if (category === 'distance') orderBy = 'total_distance_meters'
        if (category === 'routes') orderBy = 'routes_completed_count'

        const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, first_name, avatar_url, xp, level, total_distance_meters, routes_completed_count')
            .order(orderBy, { ascending: false })
            .limit(50)

        if (error) throw error

        return (data || []).map((entry, index) => {
            const isCurrentUser = entry.id === currentUserId
            
            // Fallback for name
            const name = entry.display_name || entry.first_name || (isCurrentUser ? 'Вы' : `Участник #${entry.id.slice(-4).toUpperCase()}`)

            let score = entry.xp || 0
            if (category === 'distance') score = (entry.total_distance_meters || 0) / 1000 // Convert to km
            if (category === 'routes') score = entry.routes_completed_count || 0

            // Reuse same logic for titles
            let title = 'Новичок'
            const level = entry.level || 1
            if (level >= 10) title = 'Артефактор'
            else if (level >= 7) title = 'Легенда'
            else if (level >= 5) title = 'Хранитель'
            else if (level >= 3) title = 'Исследователь'

            return {
                userId: entry.id,
                displayName: name,
                avatarUrl: entry.avatar_url,
                score,
                rank: index + 1,
                isCurrentUser,
                xp: entry.xp || 0,
                distance: (entry.total_distance_meters || 0) / 1000,
                routesCount: entry.routes_completed_count || 0,
                level,
                levelTitle: title
            }
        })
    }
}

export const LeaderboardService = new LeaderboardServiceImpl()
export { LeaderboardService as default }
