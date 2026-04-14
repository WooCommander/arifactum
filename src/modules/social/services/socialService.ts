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
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .insert({ route_id, user_id, content })
      .select()
      .single()

    if (commentError) throw commentError
    
    // Пытаемся получить имя автора отдельным простым запросом, чтобы избежать ошибки джоина
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user_id)
      .single()

    const c = commentData as any
    const p = profileData as any
    
    return {
      id: c.id,
      created_at: c.created_at,
      user_id: c.user_id,
      route_id: c.route_id,
      content: c.content,
      user_name: p?.full_name || 'Аноним',
      avatar_url: p?.avatar_url || null
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
