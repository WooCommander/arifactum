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
  async getComments(route_id: string): Promise<CommentDTO[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:profiles(full_name, avatar_url)')
      .eq('route_id', route_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Flatten join result for easier adapter usage
    return (data || []).map((c: any) => ({
      ...c,
      user_name: c.user?.full_name,
      avatar_url: c.user?.avatar_url
    }))
  },

  async addComment(route_id: string, user_id: string, content: string): Promise<CommentDTO> {
    const { data, error } = await supabase
      .from('comments')
      .insert({ route_id, user_id, content })
      .select('*, user:profiles(full_name, avatar_url)')
      .single()

    if (error) throw error
    
    const c = data as any
    return {
      ...c,
      user_name: c.user?.full_name,
      avatar_url: c.user?.avatar_url
    }
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
