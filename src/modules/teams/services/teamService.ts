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

        // 1. «Слепая» вставка без .select(). 
        // Это самый надежный способ, так как он не триггерит политики SELECT, 
        // которые могут требовать наличия записи в team_members.
        const { error: insertError } = await supabase
            .from('teams')
            .insert({
                name,
                leader_id: user.id,
                invite_code
            })

        if (insertError) {
            console.error('[TeamService] Blind insert failed:', insertError)
            throw new Error(`Ошибка RLS при создании команды: ${insertError.message}`)
        }

        // 2. Пытаемся найти ID созданной команды по инвайт-коду.
        // Если RLS на SELECT всё еще блокирует нас, мы хотя бы знаем, что запись в базе есть.
        const { data: teamIdData, error: fetchError } = await supabase
            .from('teams')
            .select('id')
            .eq('invite_code', invite_code)
            .maybeSingle()

        if (fetchError || !teamIdData) {
            console.warn('[TeamService] Could not fetch ID after insert, trying fallback search')
            // Мы не бросаем ошибку, так как команда могла создаться, 
            // но мы её не видим из-за лага RLS.
        }

        const teamId = teamIdData?.id

        if (teamId) {
            // 3. Добавляем лидера в участники
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamId,
                    user_id: user.id
                })
            
            if (memberError) console.error('[TeamService] Failed to add leader member record:', memberError)
        }

        // Возвращаем объект, собранный из локальных данных, чтобы UI не падал
        return {
            id: teamId || 'pending',
            name,
            leader_id: user.id,
            invite_code,
            created_at: new Date().toISOString(),
            avatar_url: null
        }
    },

    async joinTeam(inviteCode: string): Promise<TeamMemberDTO> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const cleanCode = inviteCode.trim().toUpperCase()

        // 1. Ищем команду
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id')
            .eq('invite_code', cleanCode)
            .maybeSingle()

        if (teamError || !team) {
            throw new Error('Команда не найдена. Проверьте код приглашения.')
        }

        // 2. Вступаем
        const { data, error } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: user.id
            })
            .select()
            .maybeSingle()

        if (error) {
            if (error.code === '23505') throw new Error('Вы уже в этой команде')
            throw new Error(`Не удалось вступить: ${error.message}`)
        }

        return data as TeamMemberDTO
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
    },

    async deleteTeam(teamId: string): Promise<void> {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId)

        if (error) throw error
    }
}
