import { supabase } from '@/api/supabase'

export interface TeammateLocation {
  user_id: string
  team_id: string
  lat: number
  lng: number
  updated_at: string
  user_name?: string
  avatar_url?: string | null
}

export const locationsService = {
  /**
   * Обновить текущие координаты пользователя
   */
  async updateMyLocation(teamId: string, lat: number, lng: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('team_locations')
      .upsert({
        user_id: user.id,
        team_id: teamId,
        lat,
        lng,
        updated_at: new Date().toISOString()
      })

    if (error) console.error('Error updating location:', error)
  },

  /**
   * Подписаться на обновления координат всей команды
   */
  subscribeToTeamLocations(teamId: string, onUpdate: (locations: TeammateLocation[]) => void) {
    const channel = supabase
      .channel(`team-locations-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: public,
          table: 'team_locations',
          filter: `team_id=eq.${teamId}`
        },
        async () => {
          // When something changes, we fetch all current locations for this team
          // because it's easier to manage a full state for the map
          const { data, error } = await supabase
            .from('team_locations')
            .select(`
              *,
              profiles:user_id ( full_name, avatar_url )
            `)
            .eq('team_id', teamId)
          
          if (!error && data) {
            const formatted = data.map((item: any) => ({
              ...item,
              user_name: item.profiles?.full_name || 'Игрок',
              avatar_url: item.profiles?.avatar_url
            }))
            onUpdate(formatted)
          }
        }
      )
      .subscribe()

    // Initial fetch
    this.getTeamLocations(teamId).then(onUpdate)

    return channel
  },

  /**
   * Получить текущие координаты всех участников команды
   */
  async getTeamLocations(teamId: string): Promise<TeammateLocation[]> {
    const { data, error } = await supabase
      .from('team_locations')
      .select(`
        *,
        profiles:user_id ( full_name, avatar_url )
      `)
      .eq('team_id', teamId)

    if (error) {
      console.error('Error fetching team locations:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      ...item,
      user_name: item.profiles?.full_name || 'Игрок',
      avatar_url: item.profiles?.avatar_url
    }))
  },

  /**
   * Удалить свою локацию (при выходе из режима)
   */
  async clearMyLocation(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('team_locations')
      .delete()
      .eq('user_id', user.id)
  }
}
