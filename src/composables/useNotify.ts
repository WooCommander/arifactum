import { ref } from 'vue'
import { FpHaptics } from '@/shared/lib/haptics'

export type NotifyType = 'success' | 'info' | 'error' | 'warning' | 'birthday'

export interface FpNotif {
    id: string
    type: NotifyType
    message: string
}

const notifications = ref<FpNotif[]>([])
let _id = 0

export function useNotify() {
    const notify = (message: string, type: NotifyType = 'info', duration = 3000) => {
        const id = String(++_id)
        notifications.value.push({ id, type, message })

        if (type === 'success') FpHaptics.success()
        else if (type === 'error') FpHaptics.error()
        else if (type === 'warning') FpHaptics.warning()
        else if (type === 'birthday') {
            FpHaptics.light()
            setTimeout(() => FpHaptics.light(), 100)
        }
        else FpHaptics.light()

        if (duration > 0) {
            setTimeout(() => dismiss(id), duration)
        }
    }

    const dismiss = (id: string) => {
        const idx = notifications.value.findIndex(n => n.id === id)
        if (idx !== -1) notifications.value.splice(idx, 1)
    }

    return { notifications, notify, dismiss }
}
