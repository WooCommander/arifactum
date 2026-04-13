import { supabase } from '@/api/supabase'
import type { Artifact, Rarity } from '@/modules/rewards/types'

export interface MuseumItem extends Artifact {
  isUnlocked: boolean
  discoveredAt?: string
}

export const MuseumService = {
  async getAllArtifacts(): Promise<Artifact[]> {
    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .order('rarity', { ascending: false })

    if (error) throw error
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      lore: item.lore || '',
      rarity: item.rarity as Rarity,
      imageUrl: item.image_url || '',
      routeId: item.route_id
    }))
  },

  async getUserCollection(userId: string): Promise<MuseumItem[]> {
    const [all, userArts] = await Promise.all([
      this.getAllArtifacts(),
      supabase
        .from('user_artifacts')
        .select('artifact_id, discovered_at')
        .eq('user_id', userId)
    ])

    const unlockedIds = new Set((userArts.data || []).map(ua => ua.artifact_id))
    const discoveryDates = new Map((userArts.data || []).map(ua => [ua.artifact_id, ua.discovered_at]))

    return all.map(art => ({
      ...art,
      isUnlocked: unlockedIds.has(art.id),
      discoveredAt: discoveryDates.get(art.id)
    }))
  },

  async unlockArtifact(userId: string, artifactId: string): Promise<void> {
    const { error } = await supabase
      .from('user_artifacts')
      .upsert({ 
        user_id: userId, 
        artifact_id: artifactId 
      }, { onConflict: 'user_id, artifact_id' })
      
    if (error) throw error
  },

  async unlockForRoute(userId: string, routeId: string): Promise<Artifact | null> {
    // 1. Find artifact associated with this route
    const { data: art, error } = await supabase
      .from('artifacts')
      .select('id, name')
      .eq('route_id', routeId)
      .maybeSingle()

    if (error || !art) return null

    // 2. Unlock it
    await this.unlockArtifact(userId, art.id)
    
    // 3. Get full details to return
    const all = await this.getAllArtifacts()
    return all.find(a => a.id === art.id) || null
  }
}
