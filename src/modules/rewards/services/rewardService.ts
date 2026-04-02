import { supabase } from '@/api/supabase'
import type { UserRewardDTO, RewardType } from '../types'

export const rewardService = {
  async getMyRewards(): Promise<UserRewardDTO[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async awardCompletion(routeId: string, routeTitle: string): Promise<UserRewardDTO> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // В реальности здесь должна быть логика на бэкенде или проверка подписи.
    // Пока начисляем бонус и артефакт за прохождение маршрута.
    const { data, error } = await supabase
      .from('user_rewards')
      .insert({
        user_id: user.id,
        route_id: routeId,
        type: 'artifact',
        name: `Артефакт: ${routeTitle}`,
        description: `Получен за полное прохождение маршрута "${routeTitle}"`,
        amount: 100 // Бонусные очки
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
