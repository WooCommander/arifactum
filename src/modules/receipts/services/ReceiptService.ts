import { supabase } from '@/api/supabase'
import { PriceService } from '@/modules/prices/services/PriceService'
import type { AddReceiptDTO, Receipt } from '../domain/Receipt'

class ReceiptService {
    async addReceipt(dto: AddReceiptDTO): Promise<string> {
        const userStr = (await supabase.auth.getUser()).data.user?.id
        if (!userStr) throw new Error('User not found')

        // 1. Создаем чек
        const { data: receipt, error: receiptError } = await supabase
            .from('receipts')
            .insert({
                user_id: userStr,
                store_name: dto.store_name,
                total_amount: dto.total_amount,
                purchase_date: dto.purchase_date
            })
            .select('id')
            .single()

        if (receiptError || !receipt) throw receiptError || new Error('Failed to create receipt')

        const receiptId = receipt.id

        // 2. Добавляем элементы чека
        const itemsToInsert = dto.items.map(item => ({
            receipt_id: receiptId,
            product_id: item.product_id,
            product_name: item.product_name,
            price: item.price,
            quantity: item.quantity,
            quantity_unit: item.quantity_unit,
            total_item_price: item.price * item.quantity
        }))

        const { error: itemsError } = await supabase
            .from('receipt_items')
            .insert(itemsToInsert)

        if (itemsError) {
            // Rollback if necessary, but Supabase doesn't easily support transactions from JS client without RPC.
            console.error('Adding items failed', itemsError)
        }

        // 3. Отправляем все цены в общую базу продуктов
        for (const item of dto.items) {
            try {
                await PriceService.addPrice({
                    productId: item.product_id,
                    storeName: dto.store_name,
                    price: item.price,
                    currency: 'RUB', // Hardcoded as in other places, or could be passed
                    quantity: item.quantity,
                    quantityUnit: item.quantity_unit
                })
            } catch (e) {
                console.error(`Failed to add price to global db for product ${item.product_name}`, e)
            }
        }

        return receiptId
    }

    async getReceipts(): Promise<Receipt[]> {
        const { data, error } = await supabase
            .from('receipts')
            .select(`
                *,
                items:receipt_items(*)
            `)
            .order('purchase_date', { ascending: false })

        if (error) throw error

        return data as Receipt[]
    }
    
    async deleteReceipt(id: string): Promise<void> {
        const { error } = await supabase
            .from('receipts')
            .delete()
            .eq('id', id)
            
        if (error) throw error
    }
}

export const instance = new ReceiptService()
export { instance as ReceiptService }
