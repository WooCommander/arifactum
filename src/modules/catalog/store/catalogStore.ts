import { ref, readonly } from 'vue'
import { CatalogService } from '../services/CatalogService'
import { adaptProduct, type ProductModel } from '../adapters/CatalogAdapter'
import { AuthService } from '@/modules/auth/services/AuthService'
import { CurrencyService } from '../services/CurrencyService'
import { PRODUCT_CATEGORIES } from '../constants'
import { getCache, setCache } from '@/shared/lib/cache'

const searchResults = ref<ProductModel[]>([])
const recentUpdates = ref<ProductModel[]>([])
const currentProduct = ref<ProductModel | null>(null)
const isSearching = ref(false)
const favoriteProductIds = ref<Set<string>>(new Set())
const totalProductCount = ref(0)
const totalCategoryCount = ref(0)
const totalUserCount = ref(0)
const currentCurrency = ref<'RUB' | 'USD' | 'EUR'>(localStorage.getItem('fp_currency') as any || 'RUB')
const categories = ref<string[]>([...PRODUCT_CATEGORIES])

// Pagination State
const currentPage = ref(1)
const totalResults = ref(0)
const hasMore = ref(false)
const currentQuery = ref('')
const currentFilters = ref<{ category?: string, sort?: string, storeId?: string }>({})

// Search History
const searchHistory = ref<string[]>(JSON.parse(localStorage.getItem('fp_search_history') || '[]'))

function addToHistory(term: string) {
    if (!term.trim()) return
    const set = new Set([term, ...searchHistory.value])
    searchHistory.value = Array.from(set).slice(0, 10) // Keep last 10
    localStorage.setItem('fp_search_history', JSON.stringify(searchHistory.value))
}

function removeFromHistory(term: string) {
    searchHistory.value = searchHistory.value.filter(t => t !== term)
    localStorage.setItem('fp_search_history', JSON.stringify(searchHistory.value))
}

function clearHistory() {
    searchHistory.value = []
    localStorage.removeItem('fp_search_history')
}


export const catalogStore = {
    searchResults: readonly(searchResults),
    recentUpdates: readonly(recentUpdates),
    currentProduct: readonly(currentProduct),
    isSearching: readonly(isSearching),
    currentPage: readonly(currentPage),
    hasMore: readonly(hasMore),
    isLoading: readonly(isSearching), // Alias for compatibility
    error: ref<string | null>(null), // Add error state
    favoriteProductIds: readonly(favoriteProductIds), // Expose read-only
    searchHistory: readonly(searchHistory),
    totalProductCount: readonly(totalProductCount),
    totalCategoryCount: readonly(totalCategoryCount),
    totalUserCount: readonly(totalUserCount),
    currentCurrency: readonly(currentCurrency),
    categories: readonly(categories),
    addToHistory,
    removeFromHistory,
    clearHistory,

    isFavorite(productId: string) {
        return favoriteProductIds.value.has(productId)
    },

    async loadFavorites() {
        const cached = getCache<string[]>('favorite_ids')
        if (cached) favoriteProductIds.value = new Set(cached)

        const ids = await CatalogService.getFavorites()
        favoriteProductIds.value = new Set(ids)
        setCache('favorite_ids', ids)
    },

    async toggleFavorite(productId: string) {
        try {
            const isFav = await CatalogService.toggleFavorite(productId)
            if (isFav) {
                favoriteProductIds.value.add(productId)
            } else {
                favoriteProductIds.value.delete(productId)
            }
            // Trigger reactivity explicitly if needed (Set is reactive in Vue 3 ref, but mutation needs care)
            // Ideally:
            const newSet = new Set(favoriteProductIds.value)
            if (isFav) newSet.add(productId); else newSet.delete(productId)
            favoriteProductIds.value = newSet
            setCache('favorite_ids', Array.from(newSet))
        } catch (e) {
            console.error('Failed to toggle favorite', e)
        }
    },


    async loadRecentProducts() {
        isSearching.value = true
        const cached = getCache<ProductModel[]>('recent_products')
        if (cached) recentUpdates.value = cached

        try {
            const results = await CatalogService.getRecentProducts()
            recentUpdates.value = results.map(adaptProduct)
            setCache('recent_products', recentUpdates.value)
        } finally {
            isSearching.value = false
        }
    },

    async registerPriceUpdate(productId: string, _price: number, _storeName: string, _unit: string) {
        // Validation/Logging could happen here
        await catalogStore.loadRecentProducts()
        // Also refresh specific product if it's the current one
        if (currentProduct.value && currentProduct.value.id === productId) {
            await catalogStore.loadProductById(productId)
        }
    },

    async searchProducts(query: string, filters?: { category?: string, sort?: string, storeId?: string }, isLoadMore = false) {
        if (!isLoadMore) {
            isSearching.value = true
            currentPage.value = 1
            searchResults.value = []
            currentQuery.value = query
            currentFilters.value = filters || {}

            if (query) {
                addToHistory(query)
            }
        }

        try {
            const { items, total } = await CatalogService.searchProducts(
                currentQuery.value,
                currentFilters.value,
                currentPage.value,
                20 // Limit
            )

            const adapted = items.map(adaptProduct)

            if (isLoadMore) {
                searchResults.value = [...searchResults.value, ...adapted]
            } else {
                searchResults.value = adapted
            }

            totalResults.value = total
            hasMore.value = searchResults.value.length < total
        } finally {
            isSearching.value = false
        }
    },

    async loadCategories() {
        try {
            const cats = await CatalogService.getCategories()
            if (cats.length > 0) categories.value = cats
        } catch (e) {
            console.error('Failed to load categories', e)
        }
    },

    async loadDashboardStats() {
        try {
            const stats = await CatalogService.getDashboardStats()
            totalProductCount.value = stats.productCount
            totalCategoryCount.value = stats.categoryCount
            totalUserCount.value = stats.userCount
        } catch (e) {
            console.error('Failed to load dashboard stats', e)
        }
    },

    setCurrency(code: 'RUB' | 'USD' | 'EUR') {
        currentCurrency.value = code
        localStorage.setItem('fp_currency', code)
        AuthService.setCurrencyPreference(code).catch(() => { })
    },

    syncCurrencyFromUserMeta(meta: Record<string, any>) {
        const preferred = meta?.preferred_currency
        if (preferred && ['RUB', 'USD', 'EUR'].includes(preferred)) {
            currentCurrency.value = preferred as 'RUB' | 'USD' | 'EUR'
            localStorage.setItem('fp_currency', preferred)
        }
        const usd = Number(meta?.usd_rate)
        const eur = Number(meta?.eur_rate)
        if (usd > 0 || eur > 0) {
            CurrencyService.setRates(usd || 0, eur || 0)
        }
    },

    async loadProductById(id: string) {
        const dto = await CatalogService.getProductById(id)
        if (dto) {
            currentProduct.value = adaptProduct(dto)
        } else {
            currentProduct.value = null
        }
    },

    clearSearch() {
        searchResults.value = []
    },

    async createProduct(data: { name: string, category: string, unit: string, barcode?: string }): Promise<ProductModel> {
        isSearching.value = true
        try {
            const dto = await CatalogService.createProduct(data)
            const adapted = adaptProduct(dto)
            currentProduct.value = adapted
            return adapted
        } finally {
            isSearching.value = false
        }
    },

    async updateProduct(id: string, updates: { name?: string, category?: string, unit?: string }) {
        await CatalogService.updateProduct(id, updates)
        if (currentProduct.value && currentProduct.value.id === id) {
            await catalogStore.loadProductById(id)
        }
    },

    async loadMore() {
        if (!hasMore.value || isSearching.value) return
        currentPage.value++
        await catalogStore.searchProducts(currentQuery.value, currentFilters.value, true)
    },

    async updateStoreName(id: string, name: string) {
        await CatalogService.updateStoreName(id, name)
        // Refresh product to see updated store name in history
        if (currentProduct.value) {
            await catalogStore.loadProductById(currentProduct.value.id)
        }
    },

    async deletePrice(id: string) {
        await CatalogService.deletePrice(id)
        if (currentProduct.value) {
            await catalogStore.loadProductById(currentProduct.value.id)
        }
    },

    async deleteProduct(id: string) {
        await CatalogService.deleteProduct(id)
        currentProduct.value = null
        // Remove from local state
        searchResults.value = searchResults.value.filter(p => p.id !== id)
        recentUpdates.value = recentUpdates.value.filter(p => p.id !== id)
    },

    async loadProductsByStore(storeId: string) {
        isSearching.value = true
        try {
            const dtos = await CatalogService.getProductsByStore(storeId)
            searchResults.value = dtos.map(adaptProduct)
        } finally {
            isSearching.value = false
        }
    },

    async loadProductsByCategory(category: string) {
        isSearching.value = true
        try {
            const dtos = await CatalogService.getProductsByCategory(category)
            searchResults.value = dtos.map(adaptProduct)
        } finally {
            isSearching.value = false
        }
    },

    async getStoreName(id: string): Promise<string> {
        const store = await CatalogService.getStoreDetails(id)
        return store?.name || 'Магазин'
    }
}

