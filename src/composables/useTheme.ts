import { ref } from 'vue'
import { DeviceService } from '@/app/services/DeviceService'

const isDark = ref(false)

export function useTheme() {
    const toggleTheme = () => {
        isDark.value = !isDark.value
        applyTheme()
    }

    const applyTheme = () => {
        if (isDark.value) {
            document.body.classList.add('dark-theme')
        } else {
            document.body.classList.remove('dark-theme')
        }
        localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
        DeviceService.updateStatusBarStyle(isDark.value)
    }

    const initTheme = () => {
        const saved = localStorage.getItem('theme')
        if (saved) {
            isDark.value = saved === 'dark'
        } else {
            isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        applyTheme()
    }

    // Auto-init on usage if not global (but better call in App.vue)

    return {
        isDark,
        toggleTheme,
        initTheme
    }
}
