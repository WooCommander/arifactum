import { ref, readonly } from 'vue'
import { PriceService, type AddPriceDTO } from '../services/PriceService'
import { catalogStore } from '@/modules/catalog/store/catalogStore'

const isSubmitting = ref(false)
const error = ref<string | null>(null)

export const priceStore = {
    isSubmitting: readonly(isSubmitting),
    error: readonly(error),

    async submitPrice(dto: AddPriceDTO) {
        isSubmitting.value = true
        error.value = null
        try {
            await PriceService.addPrice(dto)
            // Notify catalog about update to refresh recent feed
            // We pass quantityUnit as the unit to display
            await catalogStore.registerPriceUpdate(dto.productId, dto.price, dto.storeName, dto.quantityUnit)
        } catch (e: any) {
            error.value = e.message || 'Ошибка при добавлении цены'
            throw e
        } finally {
            isSubmitting.value = false
        }
    },

    async getStores(query: string) {
        return PriceService.getStores(query)
    },

    reset() {
        error.value = null
        isSubmitting.value = false
    }
}
