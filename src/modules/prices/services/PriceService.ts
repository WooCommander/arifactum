import { supabase } from '@/api/supabase'

export interface AddPriceDTO {
    productId: string
    storeName: string
    price: number
    currency: 'UZS' | 'RUB'
    quantity: number      // New: Amount (e.g. 900)
    quantityUnit: string  // New: Unit (e.g. 'ml')
}

class PriceService {
    async addPrice(dto: AddPriceDTO): Promise<void> {
        // 1. Find or Create Store
        let storeId: string | undefined

        // Try to find existing
        const { data: existingStore } = await supabase
            .from('stores')
            .select('id')
            .ilike('name', dto.storeName)
            .single()

        if (existingStore) {
            storeId = existingStore.id
        } else {
            // Create new
            const { data: newStore, error: storeError } = await supabase
                .from('stores')
                .insert({
                    name: dto.storeName,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                })
                .select('id')
                .single()

            if (storeError) {
                console.error('Error creating store:', storeError)
                throw storeError
            }
            storeId = newStore.id
        }

        // 2. Normalize Price (Calculate price per 1 base unit)
        // Base units: kg, l, pcs
        let normalizedPrice: number | null = null
        const q = Number(dto.quantity)
        const u = dto.quantityUnit.toLowerCase()

        if (q > 0) {
            if (u === 'g' || u === 'г') {
                // Convert g to kg
                normalizedPrice = dto.price / (q / 1000)
            } else if (u === 'ml' || u === 'мл') {
                // Convert ml to l
                normalizedPrice = dto.price / (q / 1000)
            } else if (u === 'kg' || u === 'кг') {
                normalizedPrice = dto.price / q
            } else if (u === 'l' || u === 'л') {
                normalizedPrice = dto.price / q
            } else {
                // pcs or unknown, just price / quantity
                normalizedPrice = dto.price / q
            }
        }

        // 3. Insert Price
        const { error: priceError } = await supabase
            .from('prices')
            .insert({
                product_id: dto.productId,
                store_id: storeId,
                price: dto.price,
                currency: dto.currency,
                quantity: dto.quantity,
                quantity_unit: dto.quantityUnit,
                normalized_price: normalizedPrice ? Math.round(normalizedPrice) : null,
                // We store the unit user entered, but normalized_price is implicitly per base unit (kg/l)
                // or we could add normalized_unit column. For MVP, usually kg/l implies normalized.

                created_by: (await supabase.auth.getUser()).data.user?.id
            })

        if (priceError) {
            console.error('Error adding price:', priceError)
            throw priceError
        }
    }

    async getStores(query: string = '', limit: number = 50): Promise<{ id: string, name: string }[]> {
        let queryBuilder = supabase
            .from('stores')
            .select('id, name')
            .order('name')
            .limit(limit)

        if (query) {
            queryBuilder = queryBuilder.ilike('name', `%${query}%`)
        }

        const { data, error } = await queryBuilder

        if (error) {
            console.error('Error fetching stores:', error)
            return []
        }

        return data || []
    }
}

export const instance = new PriceService()
export { instance as PriceService }
