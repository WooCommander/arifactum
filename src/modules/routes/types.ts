export interface RouteDTO {
    id: string
    created_at: string
    title: string
    description: string
    author_id: string
    checkpoints_count: number
    rating_avg: number
    difficulty: 'easy' | 'medium' | 'hard'
    image_url: string | null
    images: readonly string[]
    status: 'draft' | 'pending' | 'published'
    is_public: boolean
    category?: string
    tags?: string[]
    likes_count?: number
}

export interface Route {
    id: string
    title: string
    description: string
    authorId: string
    checkpointsCount: number
    rating: number
    difficulty: 'easy' | 'medium' | 'hard'
    imageUrl: string | null
    images: readonly string[]
    status: 'draft' | 'pending' | 'published'
    isPublic: boolean
    category: string
    tags: string[]
    likesCount: number
    isLiked?: boolean
    isFavorite?: boolean
}

export interface CheckpointDTO {
    id: string
    route_id: string
    title: string
    description: string
    lat: number
    lng: number
    photo_url: string | null
    images: readonly string[]
    order_index: number
}

export interface Checkpoint {
    id: string
    routeId: string
    title: string
    description: string
    latitude: number
    longitude: number
    photoUrl: string | null
    images: readonly string[]
    order: number
}
