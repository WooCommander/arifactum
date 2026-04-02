import { ref } from 'vue'
import { teamService } from '../services/teamService'
import type { TeamWithMembers } from '../types'

const myTeams = ref<TeamWithMembers[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useTeamsStore = () => {
    async function fetchMyTeams() {
        isLoading.value = true
        error.value = null
        try {
            myTeams.value = await teamService.getMyTeams()
        } catch (e: any) {
            error.value = e.message
        } finally {
            isLoading.value = false
        }
    }

    async function createTeam(name: string) {
        try {
            await teamService.createTeam(name)
            await fetchMyTeams()
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    async function joinTeam(inviteCode: string) {
        try {
            await teamService.joinTeam(inviteCode)
            await fetchMyTeams()
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    async function leaveTeam(teamId: string) {
        try {
            await teamService.leaveTeam(teamId)
            await fetchMyTeams()
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    return {
        myTeams,
        isLoading,
        error,
        fetchMyTeams,
        createTeam,
        joinTeam,
        leaveTeam
    }
}
