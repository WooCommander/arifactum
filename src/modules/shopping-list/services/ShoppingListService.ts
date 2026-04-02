import { supabase } from '@/api/supabase'

export interface ShoppingListDto {
    id: string
    user_id: string
    product_id?: string
    text: string
    is_checked: boolean
    price?: number      // Фактическая цена
    quantity?: number   // Количество
    unit?: string       // Единица измерения
    created_at: string
}

class ShoppingListService {
    async getItems(): Promise<any[]> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('shopping_list')
            .select(`
                *,
                product:products (
                    prices (
                        price,
                        created_at
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (error) throw error

        // Enhance DTO with estimated_price from latest price history
        return (data || []).map((item: any) => {
            let estimatedPrice = undefined
            if (item.product?.prices?.length > 0) {
                // Get latest price
                const prices = [...item.product.prices]
                prices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                estimatedPrice = prices[0].price
            }
            return {
                ...item,
                estimated_price: estimatedPrice
            }
        })
    }

    async addItem(text: string, productId?: string, details?: { price?: number, quantity?: number, unit?: string }): Promise<ShoppingListDto | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not logged in')

        const payload: any = {
            user_id: user.id,
            text,
            product_id: productId,
            is_checked: !!(details?.price)
        }

        // Only add extra fields if they are actually provided and truthy
        // This helps avoid errors if columns don't exist in DB yet
        if (details?.price) payload.price = details.price
        if (details?.quantity) payload.quantity = details.quantity
        if (details?.unit) payload.unit = details.unit

        const { data, error } = await supabase
            .from('shopping_list')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async toggleItem(id: string, isChecked: boolean, details?: { price?: number, quantity?: number, unit?: string }): Promise<void> {
        const { error } = await supabase
            .from('shopping_list')
            .update({
                is_checked: isChecked,
                ...(details || {})
            })
            .eq('id', id)

        if (error) throw error
    }

    async updateItem(id: string, updates: Partial<ShoppingListDto>): Promise<void> {
        // Strip out fields that shouldn't be updated directly via this method if needed
        const { id: _id, user_id: _uid, created_at: _ca, ...validUpdates } = updates as any

        const { error } = await supabase
            .from('shopping_list')
            .update(validUpdates)
            .eq('id', id)

        if (error) throw error
    }

    async removeItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('shopping_list')
            .delete()
            .eq('id', id)

        if (error) throw error
    }

    async deleteChecked(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('shopping_list')
            .delete()
            .eq('user_id', user.id)
            .eq('is_checked', true)

        if (error) throw error
    }
}

export const shoppingListService = new ShoppingListService()
