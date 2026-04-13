import type { RouteDTO, Route, CheckpointDTO, Checkpoint } from '../types'

export const routeAdapter = {
    toUI(dto: RouteDTO): Route {
        return {
            id: dto.id,
            title: dto.title,
            description: dto.description,
            authorId: dto.author_id,
            checkpointsCount: dto.checkpoints_count,
            rating: dto.rating_avg,
            difficulty: dto.difficulty,
            imageUrl: dto.image_url,
            images: dto.images || [],
            status: dto.status || 'draft',
            isPublic: dto.is_public,
            category: dto.category || 'Прочее',
            tags: dto.tags || [],
            likesCount: dto.likes_count || 0
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
