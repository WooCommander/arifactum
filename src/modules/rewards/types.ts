export type RewardType = 'bonus' | 'artifact'

export interface UserRewardDTO {
    id: string
    created_at: string
    user_id: string
    route_id?: string
    type: RewardType
    amount: number
    name: string
    description?: string
    icon_url?: string
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Artifact {
    id: string
    name: string
    description: string
    lore: string
    rarity: Rarity
    imageUrl: string
    earned_at?: string
    routeId?: string
}
