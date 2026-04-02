import { ref, readonly, computed } from 'vue'
import type { Birthday, BirthdayInsertDTO, BirthdayUpdateDTO } from '../domain/Birthday'
import { BirthdayService } from '../services/BirthdayService'
import { authStore } from '@/modules/auth/store/authStore'
import { getDaysUntilNext } from '../lib/birthdayUtils'

const birthdays = ref<Birthday[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useBirthdaysStore = () => {
    const fetchBirthdays = async () => {
        if (!authStore.user.value) {
            birthdays.value = []
            return
        }
        
        isLoading.value = true
        error.value = null
        try {
            birthdays.value = await BirthdayService.fetchBirthdays()
        } catch (err: any) {
            console.error('Failed to fetch birthdays:', err)
            error.value = err.message || 'Ошибка загрузки дней рождений'
        } finally {
            isLoading.value = false
        }
    }

    const addBirthday = async (data: BirthdayInsertDTO) => {
        try {
            const newBirthday = await BirthdayService.createBirthday(data)
            birthdays.value.unshift(newBirthday)
            return newBirthday
        } catch (err: any) {
            console.error('Failed to add birthday:', err)
            throw err
        }
    }

    const editBirthday = async (id: string, updates: BirthdayUpdateDTO) => {
        try {
            const updated = await BirthdayService.updateBirthday(id, updates)
            const idx = birthdays.value.findIndex(b => b.id === id)
            if (idx !== -1) {
                birthdays.value[idx] = updated
            }
            return updated
        } catch (err: any) {
            console.error('Failed to edit birthday:', err)
            throw err
        }
    }

    const removeBirthday = async (id: string) => {
        try {
            await BirthdayService.deleteBirthday(id)
            birthdays.value = birthdays.value.filter(b => b.id !== id)
        } catch (err: any) {
            console.error('Failed to delete birthday:', err)
            throw err
        }
    }

    // Умная сортировка: сначала те, у кого скоро ДР (по кол-ву оставшихся дней)
    const sortedBirthdays = computed(() => {
        return [...birthdays.value].sort((a, b) => {
            const daysA = getDaysUntilNext(a.day, a.month)
            const daysB = getDaysUntilNext(b.day, b.month)
            // Добавим вторичную сортировку по имени, если дни совпадают
            if (daysA === daysB) {
                return a.name.localeCompare(b.name)
            }
            return daysA - daysB
        })
    })

    return {
        birthdays: readonly(birthdays),
        sortedBirthdays,
        isLoading: readonly(isLoading),
        error: readonly(error),
        fetchBirthdays,
        addBirthday,
        editBirthday,
        removeBirthday
    }
}
