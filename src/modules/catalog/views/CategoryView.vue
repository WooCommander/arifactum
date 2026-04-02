<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catalogStore } from '@/modules/catalog/store/catalogStore'
import { usePriceFormat } from '@/composables/usePriceFormat'
import FpButton from '@/design-system/components/FpButton.vue'
import { FpSpinner } from '@/design-system'

const route = useRoute()
const router = useRouter()
const categoryName = ref('')
const isLoading = ref(true)

const { searchResults } = catalogStore
const { formatPrice } = usePriceFormat()

const groupedProducts = computed(() => {
    const groups: Record<string, any[]> = {}

    // Sort by store name first, then product name
    const sorted = [...searchResults.value].sort((a, b) => {
        const storeA = a.lastStore || 'Неизвестно'
        const storeB = b.lastStore || 'Неизвестно'
        if (storeA !== storeB) return storeA.localeCompare(storeB)
        return a.name.localeCompare(b.name)
    })

    sorted.forEach(product => {
        const store = product.lastStore || 'Без магазина'
        if (!groups[store]) {
            groups[store] = []
        }
        groups[store].push(product)
    })

    return groups
})

const loadData = async () => {
    const name = route.params.id as string
    if (!name) return
    categoryName.value = name
    isLoading.value = true
    try {
        await catalogStore.loadProductsByCategory(name)
    } finally {
        isLoading.value = false
    }
}

onMounted(loadData)
watch(() => route.params.id, loadData)

const goToAddProduct = () => {
    router.push({
        path: '/create-product',
        query: { category: categoryName.value }
    })
}
</script>

<template>
    <div class="category-view">
        <div class="page-title-row">
            <h1 class="page-title">{{ categoryName }}</h1>
            <FpButton size="sm" @click="router.push(`/create-product?category=${categoryName}`)">Добавить</FpButton>
        </div>

        <div v-if="isLoading" class="loading">
            <FpSpinner />
        </div>

        <div v-else-if="searchResults.length === 0" class="empty-state">
            <p>В этой категории пока нет товаров.</p>
            <FpButton @click="goToAddProduct">Добавить первый товар</FpButton>
        </div>

        <div v-else class="products-container">
            <template v-if="Object.keys(groupedProducts).length > 0">
                <div v-for="(products, store) in groupedProducts" :key="store" class="store-group">
                    <h2 class="store-header">🏪 {{ store }}</h2>
                    <div class="standard-grid">
                        <div v-for="product in products" :key="product.id" class="fp-tile"
                            @click="router.push(`/product/${product.id}`)">
                            <div class="tile-info">
                                <h3 class="title">{{ product.name }}</h3>
                                <span class="subtitle">{{ product.unit }}</span>
                            </div>
                            <div class="tile-footer">
                                <span class="main-value">
                                    {{ product.lastPrice ? formatPrice(product.lastPrice) : 'Нет цены' }}</span>
                                <span class="extra-info">{{ product.lastUpdateRelative }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="standard-grid">
                    <div v-for="product in searchResults" :key="product.id" class="fp-tile"
                        @click="router.push(`/product/${product.id}`)">
                        <div class="tile-info">
                            <h3 class="title">{{ product.name }}</h3>
                            <span class="subtitle">{{ product.unit }}</span>
                        </div>
                        <div class="tile-footer">
                            <span class="main-value">{{ product.formattedPrice }}</span>
                            <span class="extra-info" v-if="product.lastStore">@ {{ product.lastStore }}</span>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped lang="scss">
.category-view {
    padding: 0 var(--spacing-sm);
}

.store-group {
    // margin-bottom: var(--spacing-lg);
}

.store-header {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-secondary);
    margin: 0 0 12px;
    padding-left: 4px;
}

.loading,
.empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
}
</style>
