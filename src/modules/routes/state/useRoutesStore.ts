import { ref, readonly } from 'vue'
import type { Route, Checkpoint } from '../types'
import { routeService } from '../services/routeService'
import { routeAdapter } from '../adapters/routeAdapter'
import { authStore } from '@/modules/auth/store/authStore'
import { supabase } from '@/api/supabase'

const routes = ref<Route[]>([])
const currentRoute = ref<Route | null>(null)
const currentCheckpoints = ref<Checkpoint[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useRoutesStore = () => {
    const fetchRoutes = async (userId?: string, options?: { search?: string, category?: string, authorId?: string }) => {
        isLoading.value = true
        error.value = null
        try {
            const dtos = await routeService.getRoutes(userId, options)
            routes.value = dtos.map(routeAdapter.toUI)
        } catch (err: any) {
            console.error('Failed to fetch routes:', err)
            error.value = err.message || 'Ошибка загрузки маршрутов'
        } finally {
            isLoading.value = false
        }
    }

    const fetchRouteDetails = async (id: string) => {
        isLoading.value = true
        error.value = null
        try {
            const [routeDto, checkpointDtos] = await Promise.all([
                routeService.getRouteById(id),
                routeService.getCheckpoints(id)
            ])
            currentRoute.value = routeAdapter.toUI(routeDto)
            currentCheckpoints.value = checkpointDtos.map(routeAdapter.toCheckpointUI)
        } catch (err: any) {
            console.error('Failed to fetch route details:', err)
            error.value = err.message || 'Ошибка загрузки деталей маршрута'
        } finally {
            isLoading.value = false
        }
    }

    const clearCurrentRoute = () => {
        currentRoute.value = null
        currentCheckpoints.value = []
    }

    const deleteRoute = async (id: string) => {
        await routeService.deleteRoute(id)
        routes.value = routes.value.filter(r => r.id !== id)
    }

    const publishRoute = async (id: string): Promise<boolean> => {
        const userId = authStore.currentUserId.value
        if (!userId) throw new Error('Не авторизован')

        const profile = await routeService.getUserProfile(userId)
        const isTrusted = (profile?.level || 1) >= 5 || profile?.role === 'admin'
        const newStatus: Route['status'] = isTrusted ? 'published' : 'pending'

        await routeService.updateRouteStatus(id, newStatus)

        if (newStatus === 'published') {
            supabase.rpc('recalculate_creator_score', { p_user_id: userId }).then()
        }

        if (currentRoute.value && currentRoute.value.id === id) {
            currentRoute.value = { ...currentRoute.value, status: newStatus }
        }

        return isTrusted
    }

    return {
        routes: readonly(routes),
        currentRoute: readonly(currentRoute),
        currentCheckpoints: readonly(currentCheckpoints),
        isLoading: readonly(isLoading),
        error: readonly(error),
        fetchRoutes,
        fetchRouteDetails,
        clearCurrentRoute,
        deleteRoute,
        publishRoute
    }
}
