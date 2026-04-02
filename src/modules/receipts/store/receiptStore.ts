import { ref } from 'vue'
import { ReceiptService } from '../services/ReceiptService'
import type { Receipt } from '../domain/Receipt'

const receipts = ref<Receipt[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadReceipts = async () => {
    isLoading.value = true
    error.value = null
    try {
        receipts.value = await ReceiptService.getReceipts()
    } catch (e: any) {
        error.value = e.message
        console.error('Failed to load receipts', e)
    } finally {
        isLoading.value = false
    }
}

const deleteReceipt = async (id: string) => {
    await ReceiptService.deleteReceipt(id)
    receipts.value = receipts.value.filter(r => r.id !== id)
}

export const receiptStore = {
    receipts,
    isLoading,
    error,
    loadReceipts,
    deleteReceipt
}
