<script setup lang="ts">
import { computed } from 'vue'
import FpCard from '@/design-system/components/FpCard.vue'
import type { CheapPlace } from '../services/AnalyticsService'
import { CurrencyService } from '@/modules/catalog/services/CurrencyService'
import { catalogStore } from '@/modules/catalog/store/catalogStore'

const { currentCurrency } = catalogStore

const formatPrice = computed(() => (price: number) => {
    const currency = currentCurrency.value
    return CurrencyService.format(CurrencyService.convert(price, 'RUB', currency), currency)
})

interface Props {
    places: CheapPlace[]
}

const props = defineProps<Props>()
</script>

<template>
    <div class="cheap-places">
        <FpCard v-for="(place, index) in props.places" :key="index" class="place-item" padding="sm">
            <div class="place-info">
                <span class="place-name">{{ place.placeName }}</span>
                <span class="place-dist" v-if="place.distance">{{ place.distance }}</span>
            </div>
            <div class="place-price">
                {{ formatPrice(place.price) }}
            </div>
        </FpCard>
    </div>
</template>

<style scoped lang="scss">
.place-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
    border-left: 4px solid var(--color-secondary);
}

.place-info {
    display: flex;
    flex-direction: column;
}

.place-name {
    font-weight: 500;
    font-size: var(--text-body-2);
}

.place-dist {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
}

.place-price {
    font-weight: bold;
    color: var(--color-primary);
}
</style>
