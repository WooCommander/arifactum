export interface TeamDTO {
    id: string
    created_at: string
    name: string
    leader_id: string
    invite_code: string
    avatar_url: string | null
}

export interface TeamMemberDTO {
    id: string
    team_id: string
    user_id: string
    joined_at: string
}

export interface TeamWithMembers extends TeamDTO {
    members_count: number
    is_leader: boolean
}
