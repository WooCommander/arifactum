<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catalogStore } from '@/modules/catalog/store/catalogStore'
import { priceStore } from '../store/priceStore'
import { CatalogService } from '@/modules/catalog/services/CatalogService'
import { FpHaptics } from '@/shared/lib/haptics'
import {
  FpButton,
  FpCard,
  FpInput,
  FpMobilePicker,
  FpNumberInput,
  FpSpinner
} from '@/design-system'


const route = useRoute()
const router = useRouter()

// State
const step = ref(1) // 1: Select Product, 2: Enter Details
const searchQuery = ref('')
const selectedCategory = ref<string | null>(route.query.category as string || null)
const isCreating = ref(false)
const { isLoading } = catalogStore

const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Form data
const currentProduct = ref<{ id: string, name: string, category: string, unit?: string } | null>(null)
const storeName = ref('')
const storeResults = ref<{ id: string, name: string }[]>([])
const isSearchingStores = ref(false)
const price = ref(0)
const quantity = ref(1)
const unit = ref('кг')
const isSuccess = ref(false)

// Create product state
const newProductName = ref('')
const newProductCategory = ref('')
const createMatchResults = ref<{ id: string, name: string, category: string }[]>([])
let createSearchTimer: ReturnType<typeof setTimeout> | undefined

watch(newProductName, (val) => {
  clearTimeout(createSearchTimer)
  if (val.trim().length < 2) {
    createMatchResults.value = []
    return
  }
  createSearchTimer = setTimeout(async () => {
    const { items } = await CatalogService.searchProducts(val, {}, 1, 5)
    createMatchResults.value = items.map(p => ({ id: p.id, name: p.name, category: p.category }))
  }, 300)
})

const unitItems = ['г', 'кг', 'мл', 'л', 'шт', 'уп'].map(u => ({ id: u, name: u }))
const categoryItems = computed(() => catalogStore.categories.value.map(c => ({ id: c, name: c })))

// Subscriptions
const products = computed(() => catalogStore.searchResults.value)

const filteredGridProducts = computed(() => products.value)

const calculatedUnitPrice = computed(() => {
  const p = price.value
  const q = quantity.value
  if (!p || !q) return null

  const res = (p / q) * (unit.value === 'кг' || unit.value === 'л' ? 1 : 1000)
  return {
    price: Math.round(res),
    unit: unit.value === 'кг' || unit.value === 'л' ? unit.value : (unit.value === 'шт' ? 'шт' : (unit.value === 'мл' ? 'л' : 'кг'))
  }
})

// Methods
const loadProducts = async () => {
  await catalogStore.searchProducts(searchQuery.value, {
    category: selectedCategory.value || undefined
  })
}

const toggleCategory = (cat: string) => {
  selectedCategory.value = selectedCategory.value === cat ? null : cat
}

const selectProduct = (p: { id: string, name: string }) => {
  const fullProduct = products.value.find(item => item.id === p.id)
  currentProduct.value = {
    id: p.id,
    name: p.name,
    category: fullProduct?.category || 'Разное',
    unit: fullProduct?.unit
  }
  if (fullProduct?.unit) {
    unit.value = fullProduct.unit
  }
  const lastUsedGlobal = localStorage.getItem('lastUsedStoreName')
  if (lastUsedGlobal) {
    storeName.value = lastUsedGlobal
  } else if (fullProduct?.lastStore) {
    storeName.value = fullProduct.lastStore
  }
  step.value = 2
}

const startCreation = () => {
  newProductName.value = searchQuery.value
  newProductCategory.value = selectedCategory.value || ''
  createMatchResults.value = []
  isCreating.value = true
}

const cancelCreation = () => {
  isCreating.value = false
  createMatchResults.value = []
  clearTimeout(createSearchTimer)
}

const selectExisting = (p: { id: string, name: string, category: string }) => {
  selectProduct({ id: p.id, name: p.name })
  isCreating.value = false
  createMatchResults.value = []
}

const createProduct = async () => {
  if (!newProductName.value) return
  try {
    const product = await catalogStore.createProduct({
      name: newProductName.value,
      category: newProductCategory.value || 'Разное',
      unit: 'г' // Default unit
    })
    selectProduct({ id: product.id, name: product.name })
    isCreating.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

const onStoreSelect = (s: any) => {
  storeName.value = s.name
}

const onStoreCreate = (name: string) => {
  storeName.value = name
}

const handleSearchStore = async (q: string) => {
  storeName.value = q
  if (q.length < 1) {
    // Load some initial stores
    const results = await priceStore.getStores('')
    storeResults.value = results
    return
  }
  isSearchingStores.value = true
  try {
    const results = await priceStore.getStores(q)
    storeResults.value = results
  } finally {
    isSearchingStores.value = false
  }
}


const submit = async () => {
  if (!currentProduct.value || !storeName.value || !price.value) return

  try {
    await priceStore.submitPrice({
      productId: currentProduct.value.id,
      storeName: storeName.value,
      price: price.value,
      currency: 'RUB',
      quantity: quantity.value || 1,
      quantityUnit: unit.value
    })
    
    // Сохраняем магазин для следующих покупок
    localStorage.setItem('lastUsedStoreName', storeName.value)

    FpHaptics.success()
    isSuccess.value = true
    setTimeout(() => {
      if (currentProduct.value) {
        router.push(`/product/${currentProduct.value.id}`)
      } else {
        router.push('/')
      }
    }, 1500)
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  catalogStore.loadCategories()
  handleSearchStore('') // Pre-fetch stores
  const id = route.params.id as string
  if (id) {
    // Direct entry
    catalogStore.loadProductById(id).then(() => {
      if (catalogStore.currentProduct.value) {
        const p = catalogStore.currentProduct.value
        currentProduct.value = { id: p.id, name: p.name, category: p.category, unit: p.unit }
        if (p.unit) unit.value = p.unit
        
        const lastUsedGlobal = localStorage.getItem('lastUsedStoreName')
        if (lastUsedGlobal) {
          storeName.value = lastUsedGlobal
        } else if (p.lastStore) {
          storeName.value = p.lastStore
        }
        
        step.value = 2
      }
    })
  } else {
    loadProducts()
  }

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

// Watch for filter changes
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(loadProducts, 1000)
})
watch(selectedCategory, loadProducts)
</script>

<template>
  <div class="add-price-view">
    <header class="ergo-header">
      <div class="header-inner">
        <!-- <button class="nav-btn" @click="step === 1 ? router.back() : step = 1">
          <ChevronLeft :size="24" :stroke-width="2.5" />
        </button> -->
        <h1 class="header-title">
          {{ step === 1 ? 'Добавить цену' : currentProduct?.name }}
        </h1>
        <div class="header-actions">
          <button v-if="step === 2" class="action-btn-done" :disabled="!storeName || !price || !quantity"
            @click="submit">
            Готово
          </button>
          <div v-else style="width: 40px"></div>
        </div>
      </div>
    </header>

    <!-- Step 1: Select Product -->
    <section v-if="step === 1" class="step-section">
      <div class="sticky-search-wrapper">
        <div class="search-input-group">
          <FpInput v-model="searchQuery" placeholder="Поиск товара..." class="flex-grow" />
        </div>

        <div class="category-filters" v-if="!isCreating">
          <button v-for="cat in catalogStore.categories.value" :key="cat" class="category-tag"
            :class="{ active: selectedCategory === cat }" @click="toggleCategory(cat)">
            {{ cat }}
          </button>
        </div>
      </div>

      <div class="products-section">
        <div v-if="isLoading && products.length === 0" class="standard-grid">
          <div v-for="i in 8" :key="i" class="fp-tile skeleton">
            <div class="tile-info">
              <div class="skeleton-line sm"></div>
              <div class="skeleton-line lg"></div>
            </div>
          </div>
        </div>

        <div v-else-if="!isCreating" class="standard-grid">
          <!-- Create New Tile -->
          <div class="fp-tile create-tile" @click="startCreation">
            <div class="tile-info">
              <span class="subtitle">Новый</span>
              <h3 class="title">+ Добавить товар</h3>
            </div>
          </div>

          <!-- Product Tiles -->
          <div v-for="item in filteredGridProducts" :key="item.id" class="fp-tile"
            @click="selectProduct({ id: item.id, name: item.name })">
            <div class="tile-info">
              <span class="subtitle">{{ item.category }}</span>
              <h3 class="title">{{ item.name }}</h3>
            </div>
          </div>
        </div>

        <div v-if="catalogStore.hasMore.value && !isCreating" class="load-more">
          <div ref="loadMoreTrigger" class="load-more-trigger"></div>
          <FpSpinner v-if="isLoading" />
        </div>

        <FpCard class="m-4" v-if="isCreating">
        <div class="creation-form">
          <h3>Новый товар</h3>
          <div class="form-grid">
            <FpInput v-model="newProductName" label="Название" @keydown.enter="createProduct" />
            <FpMobilePicker v-model="newProductCategory" label="Категория" :items="categoryItems"
              title="Выбор категории" allow-create @create="newProductCategory = $event" />
          </div>

          <div v-if="createMatchResults.length > 0" class="create-matches">
            <div class="create-matches-label">Уже есть в базе:</div>
            <div v-for="match in createMatchResults" :key="match.id" class="create-match-item"
              @click="selectExisting(match)">
              <div class="match-name">{{ match.name }}</div>
              <div class="match-category">{{ match.category }}</div>
            </div>
          </div>

          <div class="actions-row">
            <FpButton variant="outline" @click="cancelCreation">Отмена</FpButton>
            <FpButton :disabled="!newProductName" @click="createProduct">Создать</FpButton>
          </div>
        </div>
      </FpCard>
      </div>
    </section>

    <!-- Step 2: Enter Details -->
    <section v-else class="step-section">
      <FpCard>
        <div class="product-summary">
          <span class="category">{{ currentProduct?.category }}</span>
          <button class="change-btn" @click="step = 1">Изменить товар</button>
        </div>

        <div class="form-grid">
          <FpMobilePicker v-model="storeName" label="Магазин" placeholder="Где купили?" title="Выбор магазина"
            :items="storeResults" allow-create @select="onStoreSelect" @create="onStoreCreate"
            @search="handleSearchStore" />

          <div class="split-row align-bottom">
            <div class="flex-field">
              <FpNumberInput v-model="price" label="Цена (₽)" :min="0" :step="0.01" />
            </div>
            <div class="flex-field">
              <FpNumberInput v-model="quantity" label="Вес/Объем" :min="0" :step="50" />
            </div>
          </div>

          <div class="fixed-field">
            <FpMobilePicker v-model="unit" label="Ед." :items="unitItems" placeholder="г" title="Единица изм."
              variant="bordered" allow-create @create="unit = $event" />
          </div>

          <div class="calc-info" v-if="calculatedUnitPrice">
            <span class="label">Цена за {{ calculatedUnitPrice.unit }}:</span>
            <span class="value">~{{ calculatedUnitPrice.price }} ₽</span>
          </div>
        </div>

        <div v-if="isSuccess" class="success-message">
          ✅ Цена успешно добавлена!
        </div>
      </FpCard>
    </section>
  </div>
</template>

<style scoped lang="scss">
.add-price-view {
  padding: 0 var(--spacing-sm);
}

.ergo-header {
  // background: var(--color-surface);
  // position: sticky;
  // top: 0;
  // z-index: 10;
  // border-bottom: 1px solid var(--color-border);
  // margin: 0 calc(-1 * var(--spacing-sm)) var(--spacing-md) calc(-1 * var(--spacing-sm));
  padding: 12px 12px 0 12px;
  ;
}

.header-inner {
  display: flex;
  // align-items: center;
  // justify-content: space-between;
}

.header-title {
  font-size: var(--text-h5);
  font-weight: 700;
  flex: 1;
  // text-align: center;
  // margin: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.action-btn-text {
  color: var(--color-primary);
  font-weight: 600;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.action-btn-done {
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 700;
  border: none;
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 15px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.product-summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  // border-bottom: 1px solid var(--color-border);

  .category {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  .change-btn {
    color: var(--color-primary);
    background: none;
    border: none;
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.split-row {
  display: flex;
  gap: 12px;

  &.align-bottom {
    align-items: flex-end;
  }
}

.flex-field {
  flex: 1;
  min-width: 0;
  /* Prevent flex overflow */
}

.fixed-field {
  flex: 0 0 100px;
}

.calc-info {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  color: var(--color-primary);
  font-weight: 600;
}

.create-tile {
  border: 2px dashed var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);

  .title {
    color: var(--color-primary);
  }
}

.creation-form {
  padding: 16px;

  h3 {
    margin-bottom: 16px;
  }
}

.create-matches {
  margin-top: 12px;
  border: 1px solid var(--color-warning);
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-warning) 5%, transparent);
}

.create-matches-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-warning);
  padding: 8px 12px 4px;
}

.create-match-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-top: 1px solid var(--color-border);
  transition: background 0.15s;

  &:active {
    background: var(--color-surface-hover);
  }

  .match-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .match-category {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.success-message {
  text-align: center;
  margin-top: 20px;
  color: var(--color-success);
  font-weight: 600;
}

// Ergonomic adjustments for tiles without footer
.fp-tile {
  justify-content: center;
  min-height: 80px;

  .tile-info {
    text-align: center;
    width: 100%;
  }
}

.products-section {
  @media (max-width: 480px) {
    max-height: calc(100vh - 23rem);
    overflow-y: auto;
  }
}

.load-more {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
  padding-bottom: 3rem;
}

.load-more-trigger {
  height: 1px;
}
</style>
