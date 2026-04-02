
import { supabase } from '@/api/supabase'

export interface ProductDTO {
    id: string;
    name: string;
    category: string;
    unit: string;
    barcode?: string; // New field for scanning
    priceRange?: { min: number; max: number };
    lastUpdate?: string; // ISO string
    lastStore?: string; // New field for recent feed
    lastStoreId?: string; // ID for navigation
    lastPrice?: number; // New field for recent feed
    normalizedPrice?: number; // New field for fair price comparison
    quantity?: number;
    quantityUnit?: string;
    averagePrice?: number; // New field: Average price for current month
    created_by?: string; // Owner ID
    image_url?: string;
    history?: ProductHistoryDTO[];
}

export interface ProductHistoryDTO {
    id?: string; // Add ID for deletion
    price: number;
    date: string;
    storeName: string;
    storeId: string;
    author: string;
    unit: string;
    createdBy?: string; // Add createdBy
    confirmCount: number;
    denyCount: number;
    userVote?: 'confirm' | 'deny';
    freshnessScore: number;
}

class CatalogService {
    // Mock data for MVP
    // Mock data removed
    // private mockProducts: ProductDTO[] = []

    async searchProducts(query: string, filters?: { category?: string, sort?: string, storeId?: string }, page: number = 1, limit: number = 20): Promise<{ items: ProductDTO[], total: number }> {
        // If filtering by store, resolve product IDs first
        let storeProductIds: string[] | null = null
        if (filters?.storeId) {
            const { data: priceRows } = await supabase
                .from('prices')
                .select('product_id')
                .eq('store_id', filters.storeId)
            storeProductIds = [...new Set((priceRows || []).map((p: any) => p.product_id))]
            if (storeProductIds.length === 0) return { items: [], total: 0 }
        }

        // Calculate range
        const from = (page - 1) * limit
        const to = from + limit - 1

        let queryBuilder = supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    store_id,
                    stores (name),
                    quantity,
                    quantity_unit,
                    normalized_price
                )
            `, { count: 'estimated' })
            .order('name', { ascending: true })

        if (query) {
            queryBuilder = queryBuilder.ilike('name', `%${query}%`)
        }

        if (filters?.category) {
            queryBuilder = queryBuilder.eq('category', filters.category)
        }

        if (storeProductIds) {
            queryBuilder = queryBuilder.in('id', storeProductIds)
        }

        const { data, error, count } = await queryBuilder
            .range(from, to)

        if (error) {
            console.error('Error searching products:', error)
            return { items: [], total: 0 }
        }

        return {
            items: data.map((p: any) => this.mapToDTO(p)),
            total: count || 0
        }
    }

    async getProductByBarcode(barcode: string): Promise<ProductDTO | null> {
        const { data: p, error } = await supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    store_id,
                    stores (name),
                    quantity,
                    quantity_unit,
                    normalized_price
                )
            `)
            .eq('barcode', barcode)
            .single()

        if (error || !p) return null
        return this.mapToDTO(p)
    }

    async getRecentProducts(): Promise<ProductDTO[]> {
        // 1. Get recent price updates to identify active products
        const { data: recentPrices, error: priceError } = await supabase
            .from('prices')
            .select('product_id, created_at')
            .order('created_at', { ascending: false })
            .limit(20)

        if (priceError) {
            console.error('Error fetching recent prices:', priceError)
            return []
        }

        if (!recentPrices || recentPrices.length === 0) return []

        // 2. Extract unique product IDs
        const productIds = [...new Set(recentPrices.map(p => p.product_id))]

        // 3. Fetch full product details with ALL prices for these IDs
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    store_id,
                    stores (name),
                    created_by,
                    unit,
                    quantity,
                    quantity_unit,
                    normalized_price
                )
            `)
            .in('id', productIds)

        if (productsError) {
            console.error('Error fetching products:', productsError)
            return []
        }

        // 4. Map to DTOs (this will calculate ranges correctly)
        // We preserve the order of the 'recentPrices' by sorting the result
        const productMap = new Map(products.map(p => [p.id, this.mapToDTO(p)]))

        return productIds
            .map(id => productMap.get(id))
            .filter((p): p is ProductDTO => !!p)
    }

    async getCategories(): Promise<string[]> {
        const { data, error } = await supabase
            .from('products')
            .select('category')

        if (error || !data) return []
        return [...new Set(data.map((p: any) => p.category).filter(Boolean))].sort()
    }

    async getPopularSearchTerms(): Promise<string[]> {
        const cats = await this.getCategories()
        return cats.slice(0, 5)
    }

    async getStoreDetails(id: string): Promise<{ id: string, name: string } | undefined> {
        const { data, error } = await supabase
            .from('stores')
            .select('id, name')
            .eq('id', id)
            .single()

        if (error || !data) return undefined
        return data
    }

    async getProductsByStore(storeId: string): Promise<ProductDTO[]> {
        // Get all prices for this store
        const { data: prices, error } = await supabase
            .from('prices')
            .select('product_id')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })

        if (error || !prices) return []

        const productIds = [...new Set(prices.map(p => p.product_id))]

        if (productIds.length === 0) return []

        // Fetch products
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    unit,
                    store_id,
                    store_id,
                    stores (name),
                    created_by,
                    quantity,
                    quantity_unit,
                    normalized_price
                )
            `)
            .in('id', productIds)

        if (productsError || !products) return []

        return products.map(p => this.mapToDTO(p))
    }

    async getProductsByCategory(category: string): Promise<ProductDTO[]> {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    unit,
                    store_id,
                    store_id,
                    stores (name),
                    created_by,
                    quantity,
                    quantity_unit,
                    normalized_price
                )
            `)
            .eq('category', category)
            .order('name')

        if (error || !products) return []

        return products.map(p => this.mapToDTO(p))
    }

    async registerPriceUpdate(_productId: string, _price: number, _store: string, _unit: string) {
        // In DB mode, PriceService writes to DB. CatalogService just reads.
        // But if we need to trigger a refresh or something... 
        // actually PriceService calls this?
        // Wait, PriceService adds to 'prices' table.
        // CatalogService.registerPriceUpdate was for MOCK to update the product state.
        // In DB mode, we don't need to manually update cache here if we re-fetch.
        // But the store calls this. 
        // We can make this a no-op or force a refresh.
        // For now, no-op. The store `loadRecentUpdates` will re-fetch from DB.
    }

    async getProductById(id: string): Promise<ProductDTO | undefined> {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    unit,
                    store_id,
                    stores (name),
                    created_by,
                    quantity,
                    quantity_unit,
                    normalized_price,
                    price_verifications ( user_id, vote )
                )
            `)
            .eq('id', id)
            .single()

        if (error || !data) return undefined

        const priceIds = (data.prices || []).map((p: any) => p.id)
        const { VerificationService } = await import('@/modules/prices/services/VerificationService')
        const userVotes = await VerificationService.getUserVotes(priceIds)

        return this.mapToDTO(data, userVotes)
    }

    async getProductsByIds(ids: string[]): Promise<ProductDTO[]> {
        if (!ids || ids.length === 0) return []

        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                prices (
                    id,
                    price,
                    created_at,
                    unit,
                    store_id,
                    stores (name),
                    created_by,
                    quantity,
                    quantity_unit,
                    normalized_price
                )
            `)
            .in('id', ids)

        if (error || !data) return []

        return data.map(p => this.mapToDTO(p))
    }

    async createProduct(data: { name: string, category: string, unit: string, barcode?: string }): Promise<ProductDTO> {
        // Check for duplicates (case-insensitive)
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .ilike('name', data.name)
            .single()

        if (existing) {
            throw new Error('Товар с таким названием уже существует')
        }

        const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
                name: data.name,
                category: data.category,
                unit: data.unit,
                barcode: data.barcode || null,
                created_by: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single()

        if (error) throw error

        return {
            id: newProduct.id,
            name: newProduct.name,
            category: newProduct.category,
            unit: newProduct.unit,
            image_url: newProduct.image_url,
            created_by: newProduct.created_by,
            lastUpdate: newProduct.created_at
        }
    }

    private mapToDTO(p: any, userVotes: Record<string, string> = {}): ProductDTO {
        // 1. Filter out highly untrusted prices (net score <= -3)
        let validPrices = p.prices || []
        validPrices = validPrices.filter((price: any) => {
            const verifications: Array<{ user_id: string; vote: string }> = price.price_verifications || []
            const confirmCount = verifications.filter((v: any) => v.vote === 'confirm').length
            const denyCount = verifications.filter((v: any) => v.vote === 'deny').length
            return (denyCount - confirmCount) < 3
        })

        // Find latest price from the joined prices array if available
        let lastPriceObj = null
        if (validPrices.length > 0) {
            // Sort by created_at desc
            validPrices.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            lastPriceObj = validPrices[0]
        }

        return {
            id: p.id,
            name: p.name,
            category: p.category,
            unit: p.unit,
            barcode: p.barcode,
            created_by: p.created_by,
            lastPrice: lastPriceObj?.price,
            normalizedPrice: lastPriceObj?.normalized_price,
            quantity: lastPriceObj?.quantity,
            quantityUnit: lastPriceObj?.quantity_unit,
            lastStore: lastPriceObj?.stores?.name,
            lastStoreId: lastPriceObj?.store_id,
            lastUpdate: lastPriceObj?.created_at || p.created_at,
            priceRange: this.calculatePriceRange(validPrices),
            averagePrice: this.calculateAveragePrice(validPrices),
            image_url: p.image_url,
            history: validPrices.map((price: any) => {
                const verifications: Array<{ user_id: string; vote: string }> = price.price_verifications || []
                const confirmCount = verifications.filter(v => v.vote === 'confirm').length
                const denyCount = verifications.filter(v => v.vote === 'deny').length
                const userVote = userVotes[price.id] as 'confirm' | 'deny' | undefined

                const ageHours = (Date.now() - new Date(price.created_at).getTime()) / 3_600_000
                const recencyScore = Math.max(0, 720 - ageHours) / 720 * 100
                const freshnessScore = recencyScore + confirmCount * 5 - denyCount * 3

                return {
                    id: price.id,
                    price: price.price,
                    date: price.created_at,
                    storeName: price.stores?.name || 'Неизвестно',
                    storeId: price.store_id,
                    unit: price.unit || p.unit,
                    author: 'User',
                    createdBy: price.created_by,
                    confirmCount,
                    denyCount,
                    userVote,
                    freshnessScore
                }
            })
        }
    }

    async updateProduct(id: string, updates: { name?: string, category?: string, unit?: string }) {
        const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)

        if (error) throw error
    }

    async deletePrice(id: string) {
        const { error } = await supabase
            .from('prices')
            .delete()
            .eq('id', id)

        if (error) throw error
    }

    async deleteProduct(id: string) {
        console.log(`Attempting to delete product ${id}`)

        // 1. Delete prices
        const { data: deletedPrices, error: pricesError } = await supabase
            .from('prices')
            .delete()
            .eq('product_id', id)
            .select()

        if (pricesError) {
            console.error('Error deleting product prices:', pricesError)
            throw new Error(`Ошибка при удалении цен: ${pricesError.message}`)
        }
        console.log(`Deleted ${deletedPrices?.length || 0} prices`)

        // 2. Delete product
        const { data: deletedProduct, error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .select()

        if (error) {
            console.error('Error deleting product:', error)
            throw new Error(`Ошибка при удалении товара: ${error.message}`)
        }

        if (!deletedProduct || deletedProduct.length === 0) {
            console.warn('Delete operation returned 0 rows. RLS might be blocking it.')
            throw new Error('Не удалось удалить товар. Возможно, у вас нет прав (RLS) или товар уже удален.')
        }

        console.log('Product deleted successfully')
    }

    async updateStoreName(id: string, name: string) {
        const { error } = await supabase
            .from('stores')
            .update({ name })
            .eq('id', id)

        if (error) throw error
    }

    private calculatePriceRange(prices: any[]) {
        if (!prices || prices.length === 0) return undefined
        const values = prices.map(p => p.price)
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        }
    }

    private calculateAveragePrice(prices: any[]): number | undefined {
        if (!prices || prices.length === 0) return undefined

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        // Filter prices for the current month
        const currentMonthPrices = prices.filter(p => {
            const date = new Date(p.created_at)
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear
        })

        if (currentMonthPrices.length === 0) return undefined

        // Prefer normalized_price if available, otherwise fallback to price
        const sum = currentMonthPrices.reduce((acc, p) => {
            const val = p.normalized_price || p.price
            return acc + val
        }, 0)

        return sum / currentMonthPrices.length
    }

    async getFavorites(): Promise<string[]> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', user.id)

        if (error || !data) return []
        return data.map((f: any) => f.product_id)
    }

    async toggleFavorite(productId: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not logged in')

        // Check if exists
        const { data: existing } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .single()

        if (existing) {
            // Delete
            await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId)
            return false // Not favorite anymore
        } else {
            // Insert
            await supabase
                .from('favorites')
                .insert({
                    user_id: user.id,
                    product_id: productId
                })
            return true // Is favorite now
        }
    }

    async getDashboardStats(): Promise<{ productCount: number, categoryCount: number, userCount: number }> {
        // 1. Get total products
        const { count: productCount, error: productError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })

        // 2. Get unique categories
        const { data: categories, error: categoryError } = await supabase
            .from('products')
            .select('category')

        if (productError || categoryError) {
            console.error('Error fetching dashboard stats:', productError || categoryError)
            return { productCount: 0, categoryCount: 0, userCount: 0 }
        }

        const uniqueCategories = new Set(categories?.map(p => p.category).filter(Boolean))

        // 3. Get unique users who contributed prices
        const { data: contributors } = await supabase
            .from('prices')
            .select('created_by')

        const uniqueUsers = new Set(contributors?.map(c => c.created_by).filter(Boolean))

        return {
            productCount: productCount || 0,
            categoryCount: uniqueCategories.size,
            userCount: uniqueUsers.size || 0
        }
    }

    async getPendingProductsForModeration(): Promise<Array<{ id: string, name: string, category: string, created_at: string, created_by: string, prices: Array<{ price: number, stores: { name: string } | null }> }>> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        try {
            const { data, error } = await supabase
                .from('products')
                .select('id,name,category,created_at,created_by,prices(price,stores(name))')
                .eq('is_moderated', false)
                .neq('created_by', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []) as any
        } catch (error: any) {
            const msg = String(error?.message || '')
            if (msg.includes('is_moderated')) {
                throw new Error('Колонка products.is_moderated отсутствует. Добавьте boolean is_moderated DEFAULT false, иначе модерация недоступна.')
            }
            throw error
        }
    }

    async approveProduct(productId: string): Promise<void> {
        const { data, error } = await supabase
            .from('products')
            .update({ is_moderated: true })
            .eq('id', productId)
            .select('id')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('Нет прав для одобрения этого товара')
    }

    async rejectProduct(productId: string): Promise<void> {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
        if (error) throw error
    }

    async getProductTranslation(productId: string, lang: string): Promise<{ name?: string, description?: string } | null> {
        const { data, error } = await supabase
            .from('product_translations')
            .select('name, description')
            .eq('product_id', productId)
            .eq('lang', lang)
            .single()

        if (error) return null
        return data as any
    }

    async getProductTranslations(productId: string): Promise<Array<{ lang: string, name: string, description?: string }>> {
        const { data, error } = await supabase
            .from('product_translations')
            .select('lang, name, description')
            .eq('product_id', productId)

        if (error || !data) return []
        return data as any
    }

    async upsertProductTranslation(input: { productId: string, lang: string, name: string, description?: string }) {
        const { error } = await supabase
            .from('product_translations')
            .upsert({
                product_id: input.productId,
                lang: input.lang,
                name: input.name,
                description: input.description
            }, { onConflict: 'product_id,lang' })
        if (error) throw error
    }

    async getRandomProductsForGame(count: number = 8): Promise<ProductDTO[]> {
        // Use RPC with ORDER BY random() for true randomness across the whole table
        const { data, error } = await supabase.rpc('get_random_products', { p_limit: count })

        if (error || !data) {
            // Fallback if RPC is not deployed yet
            console.warn('RPC get_random_products not found, using basic fallback')
            const { data: fallbackData } = await supabase
                .from('products')
                .select('*')
                .limit(count * 5)
            
            if (!fallbackData) return []
            return fallbackData.sort(() => 0.5 - Math.random()).slice(0, count).map(p => this.mapToDTO(p))
        }

        return (data as any[]).map(p => this.mapToDTO(p))
    }
}

export const instance = new CatalogService()
export { instance as CatalogService }
