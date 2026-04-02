import { ref, computed } from 'vue'
import { rewardService } from '../services/rewardService'
import type { UserRewardDTO } from '../types'

const rewards = ref<UserRewardDTO[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useRewardsStore = () => {
    const fetchRewards = async () => {
        isLoading.value = true
        error.value = null
        try {
            rewards.value = await rewardService.getMyRewards()
        } catch (e: any) {
            error.value = e.message
        } finally {
            isLoading.value = false
        }
    }

    const awardCompletion = async (routeId: string, routeTitle: string) => {
        try {
            await rewardService.awardCompletion(routeId, routeTitle)
            await fetchRewards()
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    const artifacts = computed(() => 
        rewards.value.filter(r => r.type === 'artifact')
    )

    const totalBonuses = computed(() => 
        rewards.value.reduce((sum, r) => sum + (r.amount || 0), 0)
    )

    return {
        rewards,
        artifacts,
        totalBonuses,
        isLoading,
        error,
        fetchRewards,
        awardCompletion
    }
}
