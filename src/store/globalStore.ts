import { ref, readonly } from 'vue'

const isAppLoading = ref(false)
const globalError = ref<string | null>(null)

export const globalStore = {
    isAppLoading: readonly(isAppLoading),
    globalError: readonly(globalError),

    setLoading(value: boolean) {
        isAppLoading.value = value
    },

    setError(error: string | null) {
        globalError.value = error
    }
}
