import { globalStore } from '@/store/globalStore'
// Will import module services here
import { AuthService } from '@/modules/auth/services/AuthService'

class GlobalService {
    // Expose module services
    public readonly auth = AuthService

    // Global State helpers
    public get isLoading() {
        return globalStore.isAppLoading.value
    }

    public setLoading(value: boolean) {
        globalStore.setLoading(value)
    }

    public handleError(error: unknown) {
        console.error('Global Error:', error)
        globalStore.setError(String(error))
    }
}

export const AppService = new GlobalService()
