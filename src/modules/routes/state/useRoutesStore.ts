import { ref, readonly } from 'vue'
import type { Route, Checkpoint } from '../types'
import { routeService } from '../services/routeService'
import { routeAdapter } from '../adapters/routeAdapter'

const routes = ref<Route[]>([])
const currentRoute = ref<Route | null>(null)
const currentCheckpoints = ref<Checkpoint[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useRoutesStore = () => {
    const fetchRoutes = async () => {
        isLoading.value = true
        error.value = null
        try {
            const dtos = await routeService.getRoutes()
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

    return {
        routes: readonly(routes),
        currentRoute: readonly(currentRoute),
        currentCheckpoints: readonly(currentCheckpoints),
        isLoading: readonly(isLoading),
        error: readonly(error),
        fetchRoutes,
        fetchRouteDetails,
        clearCurrentRoute
    }
}
