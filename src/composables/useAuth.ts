import { ref, readonly } from 'vue'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { AuthService } from '@/modules/auth/services/AuthService'
import { supabase } from '@/api/supabase'

const currentUser = ref<User | null>(null)
const isLoading = ref<boolean>(true)

// Initialize state
const initAuth = async () => {
    isLoading.value = true
    try {
        const { user } = await AuthService.getUser()
        currentUser.value = user
    } catch (e) {
        console.error('Auth initialization error:', e)
    } finally {
        isLoading.value = false
    }

    // Listen to auth changes
    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        currentUser.value = session?.user ?? null
    })
}

export function useAuth() {
    return {
        currentUser: readonly(currentUser),
        isLoading: readonly(isLoading),
        initAuth,
        signOut: AuthService.signOut
    }
}
