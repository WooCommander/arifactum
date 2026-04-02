import { catalogStore } from '@/modules/catalog/store/catalogStore'
import { useBirthdaysStore } from '@/modules/birthdays/state/useBirthdaysStore'
import { useNotify } from '@/composables/useNotify'
import { getDaysUntilNext } from '@/modules/birthdays/lib/birthdayUtils'

class AppService {
    /**
     * Оркестрация: после добавления цены необходимо обновить данные каталога
     * для отображения актуального фида и статистики товара.
     */
    async onPriceAdded(productId: string, price: number, storeName: string, quantityUnit: string) {
        await catalogStore.registerPriceUpdate(productId, price, storeName, quantityUnit)
    }

    // --- Оркестрация для модуля Цен при работе с товарами и магазинами ---

    get catalogSearchResults() { return catalogStore.searchResults }
    get catalogCurrentProduct() { return catalogStore.currentProduct }
    get catalogIsSearching() { return catalogStore.isSearching }

    async searchProducts(query: string) { return catalogStore.searchProducts(query) }
    async loadProductById(id: string) { return catalogStore.loadProductById(id) }
    async createProduct(data: { name: string, category: string, unit: string }) { return catalogStore.createProduct(data) }
    clearProductSearch() { catalogStore.clearSearch() }
    async getStoreName(id: string) { return catalogStore.getStoreName(id) }

    /**
     * Инициализация поздравлений. Проверяет, есть ли у кого-то ДР сегодня.
     */
    async initBirthdayReminders() {
        const birthdayStore = useBirthdaysStore()
        const { notify } = useNotify()

        // Если данных еще нет — пробуем загрузить
        if (birthdayStore.birthdays.value.length === 0 && !birthdayStore.isLoading.value) {
            await birthdayStore.fetchBirthdays()
        }

        birthdayStore.birthdays.value.forEach(b => {
            if (getDaysUntilNext(b.day, b.month) === 0) {
                // Продляем до 10 секунд, чтобы пользователь успел порадоваться
                notify(`Сегодня день рождения у ${b.name}! 🎂 Поздравляем!`, 'birthday', 10000)
            }
        })
    }
}

export const appService = new AppService()

