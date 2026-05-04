import { supabase } from '@/api/supabase'
import type { TeamDTO, TeamMemberDTO, TeamWithMembers } from '../types'

export const teamService = {
    async getMyTeams(): Promise<TeamWithMembers[]> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        // 1. Get IDs of teams where user is a member
        const { data: memberEntries } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
        
        const memberTeamIds = memberEntries?.map(m => m.team_id) || []

        // 2. Query teams (where user is leader OR member)
        let query = supabase
            .from('teams')
            .select(`
                *,
                team_members ( count )
            `)

        if (memberTeamIds.length > 0) {
            query = query.or(`leader_id.eq.${user.id},id.in.(${memberTeamIds.join(',')})`)
        } else {
            query = query.eq('leader_id', user.id)
        }

        const { data, error } = await query

        if (error) throw error
        
        return (data || []).map(t => ({
            ...t,
            members_count: t.team_members[0]?.count || 0,
            is_leader: t.leader_id === user.id
        }))
    },

    async createTeam(name: string): Promise<TeamDTO> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()

        const { data, error } = await supabase
            .from('teams')
            .insert({
                name,
                leader_id: user.id,
                invite_code
            })
            .select()
            .single()

        if (error) throw error

        // Leader is automatically a member
        await supabase.from('team_members').insert({
            team_id: data.id,
            user_id: user.id
        })

        return data
    },

    async joinTeam(inviteCode: string): Promise<TeamMemberDTO> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // 1. Find team by code
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id')
            .eq('invite_code', inviteCode.toUpperCase())
            .single()

        if (teamError || !team) throw new Error('Team not found or invalid code')

        // 2. Add member
        const { data, error } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: user.id
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') throw new Error('Already a member')
            throw error
        }

        return data
    },

    async leaveTeam(teamId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', user.id)

        if (error) throw error
    }
}
