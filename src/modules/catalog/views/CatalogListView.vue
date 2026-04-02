<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { catalogStore } from '../store/catalogStore'
import { priceStore } from '@/modules/prices/store/priceStore'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import FpButton from '@/design-system/components/FpButton.vue'
import FpCombobox from '@/design-system/components/FpCombobox.vue'
import FpMobilePicker from '@/design-system/components/FpMobilePicker.vue'
import FpNumberInput from '@/design-system/components/FpNumberInput.vue'
import { FpSkeleton, FpPullToRefresh } from '@/design-system'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import { usePriceFormat } from '@/composables/usePriceFormat'
import { CatalogService } from '../services/CatalogService'

const router = useRouter()
const route = useRoute()
const searchQuery = ref(route.query.q as string || '')
const selectedCategory = ref<string | null>(route.query.category as string || null)
const selectedStoreId = ref<string | null>(route.query.storeId as string || null)
const selectedStoreName = ref<string | null>(null)

const { formatPrice } = usePriceFormat()
const { categories } = catalogStore

const products = computed(() => catalogStore.searchResults.value)
const isLoading = computed(() => catalogStore.isLoading.value)

// ── Inline add-price form ──
const addingPriceFor = ref<{ id: string; name: string; unit?: string; lastStore?: string; lastPrice?: number } | null>(null)
const apStoreName = ref('')
const apStoreResults = ref<{ id: string, name: string }[]>([])
const apPrice = ref(0)
const apQuantity = ref(1)
const apUnit = ref('шт')
const apSubmitting = ref(false)
const apSuccess = ref(false)

const unitItems = ['г', 'кг', 'мл', 'л', 'шт', 'уп'].map(u => ({ id: u, name: u }))

const openAddPrice = async (product: Readonly<{ id: string; name: string; unit?: string; lastStore?: string; lastPrice?: number }>) => {
  addingPriceFor.value = product
  apPrice.value = 0
  apQuantity.value = 1
  apUnit.value = product.unit || 'шт'
  apStoreName.value = product.lastStore || ''
  apSuccess.value = false
  // prefetch stores
  apStoreResults.value = await priceStore.getStores('')
  document.querySelector('.page-content')?.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelAddPrice = () => {
  addingPriceFor.value = null
}

const handleStoreSearch = async (q: string) => {
  apStoreName.value = q
  apStoreResults.value = await priceStore.getStores(q)
}

const submitPrice = async () => {
  if (!addingPriceFor.value || !apStoreName.value || !apPrice.value) return
  apSubmitting.value = true
  try {
    await priceStore.submitPrice({
      productId: addingPriceFor.value.id,
      storeName: apStoreName.value,
      price: apPrice.value,
      currency: 'RUB',
      quantity: apQuantity.value || 1,
      quantityUnit: apUnit.value
    })
    apSuccess.value = true
    setTimeout(() => {
      addingPriceFor.value = null
    }, 1200)
  } catch (e: any) {
    alert(`Ошибка: ${e.message || e}`)
  } finally {
    apSubmitting.value = false
  }
}

// ── Search & filters ──
const handleSearch = async () => {
  await catalogStore.searchProducts(searchQuery.value, {
    category: selectedCategory.value || undefined,
    storeId: selectedStoreId.value || undefined
  })
}

const handleRefresh = async (done: () => void) => {
  if (selectedStoreId.value) {
    const store = await CatalogService.getStoreDetails(selectedStoreId.value)
    selectedStoreName.value = store?.name || null
  }
  catalogStore.loadCategories()
  await handleSearch()
  done()
}

const toggleCategory = (cat: string) => {
  selectedCategory.value = selectedCategory.value === cat ? null : cat
}

const clearStoreFilter = () => {
  selectedStoreId.value = null
  selectedStoreName.value = null
  router.replace({ query: { ...route.query, storeId: undefined } })
}

// ── Scanner ──
const showScanner = ref(false)

const handleScan = async (barcode: string) => {
  showScanner.value = false
  const product = await CatalogService.getProductByBarcode(barcode)
  if (product) {
    router.push(`/product/${product.id}`)
  } else {
    router.push({ path: '/create-product', query: { barcode } })
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(handleSearch, 1000)
})
watch([selectedCategory, selectedStoreId], handleSearch)

const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(async () => {
  if (selectedStoreId.value) {
    const store = await CatalogService.getStoreDetails(selectedStoreId.value)
    selectedStoreName.value = store?.name || null
  }
  catalogStore.loadCategories()
  handleSearch()

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && catalogStore.hasMore.value && !isLoading.value) {
      catalogStore.loadMore()
    }
  }, { rootMargin: '200px' })

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

watch(loadMoreTrigger, (el) => {
  if (observer) {
    observer.disconnect()
    if (el) observer.observe(el)
  }
})
</script>

<template>
  <div class="catalog-list-view">
    <FpPullToRefresh @refresh="handleRefresh">
    <!-- ── INLINE ADD-PRICE FORM ── -->
    <div v-if="addingPriceFor">
      <div class="ap-header">
        <button class="ap-back-btn" @click="cancelAddPrice">
          <ArrowLeft :size="20" :stroke-width="2.5" />
        </button>
        <div class="ap-header-info">
          <span class="ap-title">Добавить цену</span>
          <span class="ap-product-name">{{ addingPriceFor.name }}</span>
        </div>
      </div>

      <div v-if="apSuccess" class="ap-success">
        <div class="ap-success-icon">✓</div>
        <span>Цена добавлена!</span>
      </div>

      <div v-else class="ap-form">
        <FpCombobox v-model="apStoreName" :items="apStoreResults" label="Магазин"
          placeholder="Введите название магазина" allow-create create-label="Новый магазин"
          @update:modelValue="handleStoreSearch" @select="(s) => apStoreName = s.name"
          @create="(name) => apStoreName = name" />

        <FpNumberInput v-model="apPrice" label="Цена (₽)" :min="0" :step="0.01" />

        <div class="ap-qty-row">
          <FpNumberInput v-model="apQuantity" label="Количество" :min="0" :step="0.5" class="ap-qty-input" />
          <FpMobilePicker v-model="apUnit" label="Единица" :items="unitItems" title="Единица измерения"
            variant="bordered" class="ap-unit-input" />
        </div>

        <FpButton size="md" width="full" :disabled="!apStoreName || !apPrice || apSubmitting" @click="submitPrice">
          {{ apSubmitting ? 'Сохранение...' : 'Добавить цену' }}
        </FpButton>
      </div>
    </div>

    <!-- ── CATALOG ── -->
    <div v-else>
      <div class="catalog-header">
        <div class="page-title-row">
          <h1 class="page-title">Каталог товаров</h1>
          <FpButton size="sm"
            @click="router.push({ path: '/create-product', query: selectedCategory ? { category: selectedCategory } : {} })">
            Добавить</FpButton>
        </div>

        <div class="search-input-group">
          <FpInput v-model="searchQuery" placeholder="Поиск товара..." @keydown.enter="handleSearch" style="flex: 1;" />
          <FpButton variant="outline" size="icon" @click="showScanner = true" title="Сканировать штрих-код">
            <span style="font-size: 20px;">📷</span>
          </FpButton>
        </div>

        <div class="active-filters" v-if="selectedStoreName">
          <div class="filter-chip">
            <span class="chip-icon">🏪</span>
            <span class="chip-label">{{ selectedStoreName }}</span>
            <button class="chip-clear" @click="clearStoreFilter">✕</button>
          </div>
        </div>

        <div class="category-filters">
          <button v-for="cat in categories" :key="cat" class="category-tag"
            :class="{ active: selectedCategory === cat }" @click="toggleCategory(cat)">
            {{ cat }}
          </button>
        </div>
      </div>

      <section class="list-section">
        <div v-if="isLoading && products.length === 0" class="standard-grid">
          <div v-for="i in 6" :key="i" class="fp-tile">
            <div class="tile-info" style="width: 100%;">
              <FpSkeleton width="30%" height="12px" />
              <FpSkeleton width="70%" height="16px" style="margin-top: 4px;" />
            </div>
          </div>
        </div>

        <div v-else-if="products.length === 0" class="empty">
          <div class="empty-icon">🔍</div>
          <h3>Ничего не нашли</h3>
          <p>Попробуйте изменить запрос или категорию</p>
          <FpButton v-if="searchQuery || selectedCategory || selectedStoreId" variant="outline" size="sm"
            @click="searchQuery = ''; selectedCategory = null; clearStoreFilter()">
            Сбросить фильтры
          </FpButton>
        </div>

        <TransitionGroup name="list" tag="div" v-else class="standard-grid">
          <div v-for="product in products" :key="product.id" class="fp-tile fp-interactive"
            @click="router.push(`/product/${product.id}`)">
            <div class="tile-info">
              <span class="subtitle">{{ product.category }}</span>
              <h3 class="title">{{ product.name }}</h3>
            </div>
            <div class="tile-footer">
              <span class="main-value">{{ product.lastPrice ? formatPrice(product.lastPrice) : 'Нет цены' }}</span>
              <FpButton size="icon" variant="secondary" @click.stop="openAddPrice(product)">+</FpButton>
            </div>
          </div>
        </TransitionGroup>

        <div v-if="catalogStore.hasMore.value" class="load-more">
          <div ref="loadMoreTrigger" class="load-more-trigger"></div>
          <div v-if="isLoading" class="standard-grid">
             <div v-for="i in 2" :key="'more-'+i" class="fp-tile">
                <div class="tile-info" style="width: 100%;">
                  <FpSkeleton width="30%" height="12px" />
                  <FpSkeleton width="70%" height="16px" style="margin-top: 4px;" />
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>

    <BarcodeScanner v-if="showScanner" @scan="handleScan" @close="showScanner = false" />
    </FpPullToRefresh>
  </div>
</template>

<style scoped lang="scss">
.catalog-list-view {
  padding: 0 var(--spacing-sm);
}

.catalog-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-background);
  margin: 0 calc(-1 * var(--spacing-sm));
  padding: 0 var(--spacing-sm) var(--spacing-sm);
  // border-bottom: 1px solid var(--color-border);
  // margin-bottom: var(--spacing-sm);
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  // padding: var(--spacing-sm) 0 var(--spacing-sm);

  .page-title {
    margin: 0;
    font-size: var(--text-h5);
    font-weight: 700;
  }
}

.search-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

// ── Tile overrides ──
.fp-tile .title {
  font-size: 16px;
}

// ── Add-price form ──
.ap-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 20px;
}

.ap-back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;

  &:active {
    background: var(--color-surface-hover);
  }
}

.ap-header-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ap-title {
  font-size: 13px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.ap-product-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ap-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ap-qty-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;

}

.ap-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: var(--color-success);
  font-size: 16px;
  font-weight: 600;
}

.ap-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  border: 2px solid var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

// ── Store filter chip ──
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0 2px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid var(--color-primary);
  border-radius: 20px;
  padding: 4px 10px 4px 8px;
  font-size: 13px;
  color: var(--color-primary);

  .chip-icon {
    font-size: 14px;
  }

  .chip-label {
    font-weight: 500;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip-clear {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: 12px;
    padding: 0 0 0 2px;
    line-height: 1;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
}

// ── Product list section ──
.list-section {
  @media (max-width: 480px) {
    max-height: calc(100vh - 18rem);
    overflow-y: auto;
  }
}

// ── Empty state ──
.empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--color-text-primary);
  }

  p {
    margin: 0 0 16px 0;
    font-size: 14px;
    max-width: 240px;
  }
}

.load-more {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
  padding-bottom: 3rem;
}
</style>
