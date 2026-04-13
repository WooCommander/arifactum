import type { CommentDTO } from './socialService'

export interface UserComment {
  id: string
  userId: string
  content: string
  userName: string
  avatarUrl: string | null
  createdAt: Date
}

export const socialAdapter = {
  toCommentUI(dto: CommentDTO): UserComment {
    return {
      id: dto.id,
      userId: dto.user_id,
      content: dto.content,
      userName: dto.user_name || 'Инкогнито',
      avatarUrl: dto.avatar_url || null,
      createdAt: new Date(dto.created_at)
    }
  }
}
