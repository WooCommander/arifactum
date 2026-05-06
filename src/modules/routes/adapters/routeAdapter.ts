import type { RouteDTO, Route, CheckpointDTO, Checkpoint } from '../types'

export const routeAdapter = {
    toUI(dto: RouteDTO): Route {
        return {
            id: dto.id,
            title: dto.title,
            description: dto.description,
            authorId: dto.author_id,
            checkpointsCount: typeof dto.checkpoints_count === 'object' 
                ? (dto.checkpoints_count as any)?.[0]?.count || 0 
                : (Number(dto.checkpoints_count) || 0),
            rating: dto.rating_avg,
            difficulty: dto.difficulty,
            imageUrl: dto.image_url,
            images: dto.images || [],
            status: dto.status || 'draft',
            isPublic: dto.is_public,
            category: dto.category || 'Прочее',
            tags: dto.tags || [],
            likesCount: dto.likes_count || 0,
            completionsCount: dto.completions_count || 0,
            authorName: dto.profiles?.display_name || 'Неизвестный автор',
            authorAvatar: dto.profiles?.avatar_url,
            createdAt: dto.created_at
        }
    },

    toCheckpointUI(dto: CheckpointDTO): Checkpoint {
        return {
            id: dto.id,
            routeId: dto.route_id,
            title: dto.title,
            description: dto.description,
            latitude: dto.lat,
            longitude: dto.lng,
            photoUrl: dto.photo_url,
            images: dto.images || [],
            order: dto.order_index
        }
    }
}
