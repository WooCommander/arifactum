<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '@/modules/auth/services/AuthService'
import FpCard from '@/design-system/components/FpCard.vue'
import { FpSkeleton } from '@/design-system'
import { CurrencyService } from '@/modules/catalog/services/CurrencyService'
import { catalogStore } from '@/modules/catalog/store/catalogStore'

const router = useRouter()
const { currentCurrency } = catalogStore
const formatPrice = computed(() => (price: number) => {
    const currency = currentCurrency.value
    return CurrencyService.format(CurrencyService.convert(price, 'RUB', currency), currency)
})

const activityData = ref<any[]>([])
const isLoading = ref(true)

onMounted(async () => {
    try {
        // Fetch more items for the full view (e.g. 50 for now)
        activityData.value = await AuthService.getUserActivity(100)
    } catch (error) {
        console.error('Failed to load activity:', error)
    } finally {
        isLoading.value = false
    }
})

const goToProduct = (id: string) => {
    if (id) {
        router.push(`/product/${id}`)
    }
}
</script>

<template>
    <div class="activity-view">
        <header class="section-header">
            <h1>Моя активность</h1>
            <p v-if="activityData.length > 0">Вы внесли {{ activityData.length }} цен</p>
        </header>

        <div v-if="isLoading" class="activity-list">
            <FpCard v-for="i in 5" :key="i" class="activity-item" style="display: flex; gap: 16px; align-items: flex-start;">
                <FpSkeleton type="circle" width="48px" height="48px" />
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between;">
                        <FpSkeleton width="30%" height="16px" />
                        <FpSkeleton width="20%" height="12px" />
                    </div>
                    <FpSkeleton width="60%" height="18px" />
                    <FpSkeleton width="25%" height="14px" />
                </div>
            </FpCard>
        </div>

        <TransitionGroup name="list" tag="div" v-else-if="activityData.length > 0" class="activity-list">
            <FpCard v-for="act in activityData" :key="act.id" class="activity-item fp-interactive" padding="sm"
                @click="goToProduct(act.productId)">
                <div class="act-icon">{{ act.icon }}</div>
                <div class="act-content">
                    <div class="act-header">
                        <span class="act-action">{{ act.action }}</span>
                        <span class="act-time">{{ act.time }}</span>
                    </div>
                    <span class="act-item">{{ act.item }}</span>
                    <span class="act-details">{{ formatPrice(act.price) }}</span>
                </div>
            </FpCard>
        </TransitionGroup>

        <div v-else class="empty-state">
            <span class="empty-icon">📝</span>
            <h3>История пуста</h3>
            <p>Ваши добавленные цены будут отображаться здесь</p>
            <FpButton size="md" @click="router.push('/search')">Найти товар</FpButton>
        </div>
    </div>
</template>

<style scoped lang="scss">
.activity-view {
    padding: var(--spacing-md) var(--spacing-sm);
    width: 100%;
}

.section-header {

    h1 {
        font-size: var(--text-h5);
        font-weight: 700;
        margin-bottom: 4px;
    }

    p {
        color: var(--color-text-secondary);
        font-size: var(--text-body-2);
    }
}

.activity-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-height: calc(100vh - 19.5rem);
    overflow-y: auto;

}

.activity-item {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-start;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-1);
        transform: translateY(-2px);
    }

    .act-icon {
        font-size: 24px;
        background: var(--color-background);
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
    }

    .act-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .act-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .act-action {
            font-weight: 700;
            font-size: var(--text-button);
            color: var(--color-primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .act-time {
            font-size: var(--text-caption);
            color: var(--color-text-disabled);
        }
    }

    .act-item {
        font-weight: 600;
        font-size: var(--text-body-1);
        color: var(--color-text-primary);
    }

    .act-details {
        font-size: var(--text-body-2);
        color: var(--color-text-secondary);
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
        font-size: var(--text-h5);
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
