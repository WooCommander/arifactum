<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from 'lucide-vue-next'
import { CatalogService, type ProductDTO } from '@/modules/catalog/services/CatalogService'
import { catalogStore } from '../store/catalogStore'
import { CurrencyService } from '../services/CurrencyService'
import FpButton from '@/design-system/components/FpButton.vue'
import FpInput from '@/design-system/components/FpInput.vue'
import { FpSkeleton } from '@/design-system'

const router = useRouter()
const { currentCurrency } = catalogStore
const formatPrice = computed(() => (price: number) => {
    const currency = currentCurrency.value
    return CurrencyService.format(CurrencyService.convert(price, 'RUB', currency), currency)
})

const favorites = ref<ProductDTO[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)

const availableCategories = computed(() =>
    [...new Set(favorites.value.map(p => p.category).filter(Boolean))]
)

const filteredFavorites = computed(() => {
    let items = favorites.value

    if (selectedCategory.value) {
        items = items.filter(p => p.category === selectedCategory.value)
    }

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        items = items.filter(p => p.name.toLowerCase().includes(q))
    }

    return items
})

const toggleCategory = (cat: string) => {
    selectedCategory.value = selectedCategory.value === cat ? null : cat
}

onMounted(async () => {
    try {
        const favoriteIds = await CatalogService.getFavorites()
        if (favoriteIds.length > 0) {
            favorites.value = await CatalogService.getProductsByIds(favoriteIds)
        }
    } catch (error) {
        console.error('Failed to load favorites:', error)
    } finally {
        isLoading.value = false
    }
})

const goToProduct = (id: string) => {
    router.push(`/product/${id}`)
}

const toggleFavorite = async (productId: string) => {
    await catalogStore.toggleFavorite(productId)
    favorites.value = favorites.value.filter(p => p.id !== productId)
}
</script>

<template>
    <div class="favorites-view">
        <div class="page-title-row">
            <h1 class="page-title">Избранное</h1>
        </div>

        <div class="sticky-search-wrapper">
            <div class="search-input-group">
                <FpInput v-model="searchQuery" placeholder="Поиск в избранном..." class="flex-grow" />
            </div>

            <div class="category-filters">
                <button v-for="cat in availableCategories" :key="cat" class="category-tag"
                    :class="{ active: selectedCategory === cat }" @click="toggleCategory(cat)">
                    {{ cat }}
                </button>
            </div>
        </div>

        <div v-if="isLoading" class="standard-grid">
            <div v-for="i in 6" :key="i" class="fp-tile">
                <div class="tile-info" style="width: 100%;">
                    <FpSkeleton width="30%" height="12px" />
                    <FpSkeleton width="70%" height="16px" style="margin-top: 4px;" />
                </div>
            </div>
        </div>

        <TransitionGroup name="list" tag="div" v-else-if="filteredFavorites.length > 0" class="standard-grid">
            <div v-for="item in filteredFavorites" :key="item.id" class="fp-tile fp-interactive" @click="goToProduct(item.id)">
                <div class="tile-info">
                    <span class="subtitle">{{ item.category }}</span>
                    <h3 class="title">{{ item.name }}</h3>
                </div>

                <div class="tile-footer">
                    <div class="main-value">{{ item.lastPrice ? formatPrice(item.lastPrice) : '---' }}</div>
                    <button class="fav-btn active" @click.stop="toggleFavorite(item.id)" title="Убрать">
                        <Star :size="20" fill="currentColor" />
                    </button>
                </div>
            </div>
        </TransitionGroup>

        <div v-else class="empty-state">
            <span class="empty-icon">⭐</span>
            <h3>Пока пусто</h3>
            <p>Добавляйте товары в избранное, чтобы быстро следить за ценами</p>
            <FpButton size="md" @click="router.push('/catalog')">Перейти в каталог</FpButton>
        </div>
    </div>
</template>

<style scoped lang="scss">
.favorites-view {
    padding: 0 var(--spacing-sm);
    width: 100%;
}

.fav-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--color-warning); // Gold
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        transform: scale(1.1);
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;

    .empty-icon {
        font-size: 64px;
        margin-bottom: var(--spacing-md);
        opacity: 0.3;
    }

    h3 {
        font-size: 20px;
        margin-bottom: 8px;
    }

    p {
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-xl);
        max-width: 300px;
    }
}

.loading-state {
    display: flex;
    justify-content: center;
    padding: 60px;
}
</style>
