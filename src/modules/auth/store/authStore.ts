import { ref, readonly, computed } from 'vue'
import { AuthService, type User, type Session } from '../services/AuthService'
import { catalogStore } from '@/modules/catalog/store/catalogStore'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

export const authStore = {
    user: readonly(user),
    session: readonly(session),
    isLoading: readonly(isLoading),
    error: readonly(error),

    isAuthenticated: computed(() => !!user.value),
    currentUserId: computed(() => user.value?.id),

    async init() {
        isLoading.value = true
        try {
            const { session: currentSession } = await AuthService.getSession()
            session.value = currentSession
            user.value = currentSession?.user || null
            if (currentSession?.user?.user_metadata) {
                catalogStore.syncCurrencyFromUserMeta(currentSession.user.user_metadata)
            }
        } catch (e: any) {
            console.error('Auth init error:', e)
        } finally {
            isLoading.value = false
        }

        // Listen for auth changes to keep state in sync
        AuthService.onAuthStateChange((event, currentSession) => {
            console.log('Auth event:', event)
            session.value = currentSession
            user.value = currentSession?.user || null
            if (currentSession?.user?.user_metadata) {
                catalogStore.syncCurrencyFromUserMeta(currentSession.user.user_metadata)
            }
            isLoading.value = false
        })
    },

    async login(email: string, password: string) {
        isLoading.value = true
        error.value = null
        try {
            const { data, error: authError } = await AuthService.signInWithPassword(email, password)
            if (authError) throw authError

            session.value = data.session
            user.value = data.user
            return true
        } catch (e: any) {
            error.value = e.message
            return false
        } finally {
            isLoading.value = false
        }
    },

    async register(email: string, password: string) {
        isLoading.value = true
        error.value = null
        try {
            const { data, error: authError } = await AuthService.signUp(email, password)
            if (authError) throw authError

            // If email confirmation is off, we get session. If on, maybe null session.
            if (data.session) {
                session.value = data.session
                user.value = data.user
                return { success: true }
            } else if (data.user && !data.session) {
                return { success: true, message: 'Check email for confirmation' }
            }
            return { success: false }
        } catch (e: any) {
            error.value = e.message
            return { success: false, error: e.message }
        } finally {
            isLoading.value = false
        }
    },

    async logout() {
        // Immediate UI feedback
        user.value = null
        session.value = null
        await AuthService.signOut().catch(console.error)
    }
}
