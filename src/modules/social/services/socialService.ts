import { supabase } from '@/api/supabase'

export interface CommentDTO {
  id: string
  created_at: string
  user_id: string
  route_id: string
  content: string
  user_name?: string
  avatar_url?: string
}

export const socialService = {
  async getComments(_route_id: string): Promise<CommentDTO[]> {
    return []
  },

  async addComment(route_id: string, user_id: string, content: string): Promise<CommentDTO> {
    const payload = { route_id, user_id, content }
    console.log('DEBUG: Sending comment payload:', payload)

    const { data, error } = await supabase
      .from('comments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('CRITICAL: Comment save error:', error)
      // Try fallback just in case
      console.warn('Attempting fallback with author_id...')
      const { data: altData, error: altError } = await supabase
        .from('comments')
        .insert({ route_id, author_id: user_id, content })
        .select()
        .single()
      
      if (altError) {
        console.error('CRITICAL: Fallback also failed:', altError)
        throw altError
      }
      return altData as CommentDTO
    }
    
    return data as CommentDTO
  },

  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async toggleLike(route_id: string, user_id: string): Promise<boolean> {
    // Check existing
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('route_id', route_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id)
      return false
    } else {
      await supabase.from('likes').insert({ route_id, user_id })
      return true
    }
  },

  async toggleFavorite(route_id: string, user_id: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('route_id', route_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id)
      return false
    } else {
      await supabase.from('favorites').insert({ route_id, user_id })
      return true
    }
  },

  async getRouteSocialStatus(route_id: string, user_id: string) {
    const [like, favorite] = await Promise.all([
      supabase.from('likes').select('id').eq('route_id', route_id).eq('user_id', user_id).maybeSingle(),
      supabase.from('favorites').select('id').eq('route_id', route_id).eq('user_id', user_id).maybeSingle()
    ])

    return {
      isLiked: !!like.data,
      isFavorite: !!favorite.data
    }
  }
}
