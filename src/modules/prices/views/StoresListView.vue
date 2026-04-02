<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { priceStore } from '../store/priceStore'
import { useRouter } from 'vue-router'
import FpInput from '@/design-system/components/FpInput.vue'
import FpButton from '@/design-system/components/FpButton.vue'

const router = useRouter()
const searchQuery = ref('')
const stores = ref<{ id: string, name: string }[]>([])
const isLoading = ref(false)

const handleSearch = async () => {
    isLoading.value = true
    try {
        stores.value = await priceStore.getStores(searchQuery.value)
    } finally {
        isLoading.value = false
    }
}

// Watch for search query changes to unify search behavior
watch(searchQuery, () => {
    handleSearch()
})

onMounted(() => {
    handleSearch()
})

const viewStore = (storeId: string) => {
    router.push({ path: '/catalog', query: { storeId } })
}
</script>

<template>
    <div class="stores-list-view">
        <div class="page-title-row">
            <h1 class="page-title">Магазины</h1>
            <FpButton size="sm" @click="router.push('/create-store')">Добавить</FpButton>
        </div>

        <div class="sticky-search-wrapper">
            <div class="search-input-group">
                <FpInput v-model="searchQuery" placeholder="Поиск магазина..." @keydown.enter="handleSearch"
                    class="flex-grow" />
            </div>
        </div>

        <section class="list-section">
            <div v-if="isLoading && stores.length === 0" class="standard-grid">
                <!-- Skeleton Loading State -->
                <div v-for="i in 6" :key="i" class="fp-tile skeleton">
                    <div class="tile-info">
                        <div class="skeleton-line sm" style="width: 40%"></div>
                        <div class="skeleton-line lg" style="width: 70%"></div>
                    </div>
                </div>
            </div>

            <div v-else-if="stores.length === 0" class="empty">
                <div class="empty-icon">🏪</div>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить поисковый запрос</p>
            </div>

            <div v-else class="standard-grid">
                <div v-for="store in stores" :key="store.id" class="fp-tile" @click="viewStore(store.id)">
                    <div class="tile-info">
                        <span class="subtitle">Магазин</span>
                        <h3 class="title">{{ store.name }}</h3>
                    </div>
                    <div class="tile-footer">
                        <span class="extra-info">Смотреть товары</span>
                        <ChevronRight :size="18" />
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
.stores-list-view {
    padding: 0 var(--spacing-sm);
}

.empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .empty-icon {
        font-size: 48px;
        opacity: 0.3;
    }

    h3 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--color-text-primary);
    }

    p {
        margin: 0;
        font-size: 0.95rem;
    }
}
</style>
