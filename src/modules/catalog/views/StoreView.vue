<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Edit2, Plus } from 'lucide-vue-next'
import { catalogStore } from '@/modules/catalog/store/catalogStore'
import FpCard from '@/design-system/components/FpCard.vue'
import { CurrencyService } from '@/modules/catalog/services/CurrencyService'
import FpButton from '@/design-system/components/FpButton.vue'
import { FpSkeleton } from '@/design-system'

const route = useRoute()
const router = useRouter()
const storeId = route.params.id as string
const storeName = ref('Магазин')
const isLoading = ref(true)

/*
    We reuse searchResults from catalogStore to display the list, 
    since it's just a list of products.
*/
const { searchResults, currentCurrency } = catalogStore
const formatPrice = computed(() => (price: number) => {
    const currency = currentCurrency.value
    return CurrencyService.format(CurrencyService.convert(price, 'RUB', currency), currency)
})

onMounted(async () => {
    isLoading.value = true
    try {
        storeName.value = await catalogStore.getStoreName(storeId)
        await catalogStore.loadProductsByStore(storeId)
    } finally {
        isLoading.value = false
    }
})

const goToAddPrice = () => {
    router.push({
        path: '/add-price',
        query: { storeId: storeId }
    })
}

// Editing Logic
const isEditing = ref(false)
const editName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

const startEdit = () => {
    editName.value = storeName.value
    isEditing.value = true
    // Wait for DOM update to focus
    setTimeout(() => {
        editInputRef.value?.focus()
    }, 50)
}

const cancelEdit = () => {
    isEditing.value = false
}

const saveEdit = async () => {
    if (!editName.value.trim() || editName.value === storeName.value) {
        isEditing.value = false
        return
    }

    try {
        await catalogStore.updateStoreName(storeId, editName.value)
        storeName.value = editName.value
        isEditing.value = false
    } catch (e) {
        console.error('Failed to update store name', e)
        alert('Не удалось обновить название магазина')
    }
}
</script>

<template>
    <div class="store-view">
        <div class="page-title-row">
            <div class="title-group">
                <button class="nav-btn" @click="router.back()">
                    <ArrowLeft :size="24" />
                </button>

                <template v-if="!isEditing">
                    <h1 class="page-title">{{ storeName }}</h1>
                    <button class="icon-btn edit-icon" @click="startEdit" title="Редактировать название">
                        <Edit2 :size="18" />
                    </button>
                </template>
                <div v-else class="edit-row">
                    <input v-model="editName" class="edit-input" @keyup.enter="saveEdit" ref="editInputRef" />
                    <div class="edit-actions">
                        <button class="icon-btn save" @click="saveEdit" title="Сохранить">✅</button>
                        <button class="icon-btn cancel" @click="cancelEdit" title="Отмена">❌</button>
                    </div>
                </div>
            </div>

            <button class="nav-btn add-btn" @click="goToAddPrice" title="Добавить цену">
                <Plus :size="24" />
            </button>
        </div>

        <div v-if="isLoading" class="products-grid">
            <FpCard v-for="i in 5" :key="i" class="product-card" style="display: flex; justify-content: space-between;">
                <div class="product-info" style="flex: 1;">
                    <FpSkeleton width="60%" height="20px" style="margin-bottom: 6px;" />
                    <FpSkeleton width="40%" height="14px" />
                </div>
                <div class="price-info" style="display: flex; flex-direction: column; align-items: flex-end;">
                    <FpSkeleton width="80px" height="20px" style="margin-bottom: 6px;" />
                    <FpSkeleton width="50px" height="12px" />
                </div>
            </FpCard>
        </div>

        <div v-else-if="searchResults.length === 0" class="empty-state">
            <p>Здесь пока нет товаров с ценами.</p>
            <FpButton @click="goToAddPrice">Добавить цену</FpButton>
        </div>

        <div v-else class="products-grid">
            <FpCard v-for="product in searchResults" :key="product.id" class="product-card"
                @click="router.push(`/product/${product.id}`)">
                <div class="product-info">
                    <h3>{{ product.name }}</h3>
                    <span class="category">{{ product.category }}</span>
                </div>
                <div class="price-info">
                    <span class="price">{{ product.lastPrice ? formatPrice(product.lastPrice) : 'Нет цены' }}</span>
                    <span class="date">{{ product.lastUpdateRelative }}</span>
                </div>
            </FpCard>
        </div>
    </div>
</template>

<style scoped lang="scss">
.store-view {
    padding: 0 var(--spacing-sm);
}

.ergo-header {
    background: var(--color-surface);
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--color-border);
    // Negative margin to overflow valid padding
    margin: 0 calc(-1 * var(--spacing-sm)) var(--spacing-md) calc(-1 * var(--spacing-sm));
    padding: 12px;
    ;
}

.header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.header-title-container {
    flex: 1;
    display: flex;
    justify-content: center;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: center;
}

.edit-icon {
    opacity: 0.3;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;

    &:hover {
        opacity: 1;
        color: var(--color-primary);
    }
}

.edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.edit-input {
    font-size: 1rem;
    padding: 4px 8px;
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    width: 180px;
    text-align: center;
    outline: none;
}

.edit-actions {
    display: flex;
    gap: 4px;
}

.nav-btn {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    &:active {
        background: var(--color-surface-hover);
        color: var(--color-text-primary);
    }
}

.add-btn {
    color: var(--color-primary);
}

.icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;

    &.save {
        color: var(--color-success);
    }

    &.cancel {
        color: var(--color-error);
    }
}

.products-grid {
    display: grid;
    gap: var(--spacing-md);
}

.product-card {
    display: flex !important; // Override card default if needed
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
    }
}

.product-info h3 {
    margin: 0;
    font-size: 18px; // 18px
    font-weight: 600;
}

.category {
    font-size: 14px; // 14px
    color: var(--color-text-secondary);
}

.price-info {
    text-align: right;
    display: flex;
    flex-direction: column;
}

.price {
    font-weight: 700;
    color: var(--color-success); // Ensure success color
    font-size: 18px; // 18px
}

.date {
    font-size: 1rem;
    color: var(--color-text-tertiary);
}

.empty-state {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-secondary);
}
</style>
