import { supabase } from '@/api/supabase'

export type LeaderboardCategory = 'reputation' | 'products' | 'prices' | 'games'

export interface LeaderboardEntry {
    userId: string
    displayName: string
    score: number
    rank: number
    isCurrentUser: boolean
    productsCount: number
    pricesCount: number
    level: number
    levelTitle: string
}

function calcLevel(rep: number): { level: number; levelTitle: string } {
    if (rep >= 2500) return { level: 5, levelTitle: 'Хранитель' }
    if (rep >= 1000) return { level: 4, levelTitle: 'Мастер' }
    if (rep >= 500)  return { level: 3, levelTitle: 'Эксперт' }
    if (rep >= 100)  return { level: 2, levelTitle: 'Исследователь' }
    return { level: 1, levelTitle: 'Новичок' }
}

class LeaderboardServiceImpl {
    async getLeaderboard(category: LeaderboardCategory): Promise<LeaderboardEntry[]> {
        const { data: { user } } = await supabase.auth.getUser()
        const currentUserId = user?.id

        let rows: Array<{
            user_id: string
            display_name: string | null
            products_count: number
            prices_count: number
            score: number
        }> = []

        if (category === 'products') {
            const { data, error } = await supabase.rpc('leaderboard_products')
            if (error) throw error
            rows = (data || []).map((r: any) => ({
                user_id: r.user_id,
                display_name: r.display_name,
                products_count: Number(r.products_count),
                prices_count: Number(r.prices_count),
                score: Number(r.products_count)
            }))
        } else if (category === 'prices') {
            const { data, error } = await supabase.rpc('leaderboard_prices')
            if (error) throw error
            rows = (data || []).map((r: any) => ({
                user_id: r.user_id,
                display_name: r.display_name,
                products_count: Number(r.products_count),
                prices_count: Number(r.prices_count),
                score: Number(r.prices_count)
            }))
        } else if (category === 'games') {
            const { data, error } = await supabase.rpc('leaderboard_games')
            if (error) throw error
            rows = (data || []).map((r: any) => ({
                user_id: r.user_id,
                display_name: r.display_name,
                products_count: Number(r.products_count),
                prices_count: Number(r.prices_count),
                score: Number(r.game_score)
            }))
        } else {
            const { data, error } = await supabase.rpc('leaderboard_reputation')
            if (error) throw error
            rows = (data || []).map((r: any) => ({
                user_id: r.user_id,
                display_name: r.display_name,
                products_count: Number(r.products_count),
                prices_count: Number(r.prices_count),
                score: Number(r.reputation)
            }))
        }

        return rows.map((entry, index) => {
            const rep = entry.products_count * 20 + entry.prices_count * 5
            const { level, levelTitle } = calcLevel(rep)
            const isCurrentUser = entry.user_id === currentUserId
            const displayName = isCurrentUser
                ? (entry.display_name || 'Вы')
                : (entry.display_name || `Участник #${entry.user_id.slice(-4).toUpperCase()}`)

            return {
                userId: entry.user_id,
                displayName,
                score: entry.score,
                rank: index + 1,
                isCurrentUser,
                productsCount: entry.products_count,
                pricesCount: entry.prices_count,
                level,
                levelTitle
            }
        })
    }
}

export const LeaderboardService = new LeaderboardServiceImpl()
