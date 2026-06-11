import type { RouteDTO, Route, CheckpointDTO, Checkpoint } from '../types'

type RouteDTOWithJoins = RouteDTO & {
    checkpoints_count?: Array<{ count: number }> | number
    start_point?: Array<{ lat: number; lng: number }>
}

export const routeAdapter = {
    toUI(dto: RouteDTOWithJoins): Route {
        const checkpointsCount = Array.isArray(dto.checkpoints_count)
            ? dto.checkpoints_count[0]?.count || 0
            : Number(dto.checkpoints_count) || 0

        return {
            id: dto.id,
            title: dto.title,
            description: dto.description,
            authorId: dto.author_id,
            checkpointsCount,
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
            createdAt: dto.created_at,
            startLat: dto.start_point?.[0]?.lat,
            startLng: dto.start_point?.[0]?.lng
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
