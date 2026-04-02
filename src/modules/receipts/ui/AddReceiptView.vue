<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { priceStore } from '@/modules/prices/store/priceStore'
import { ReceiptService } from '../services/ReceiptService'
import type { AddReceiptItemDTO } from '../domain/Receipt'
import { CatalogService } from '@/modules/catalog/services/CatalogService'
import { FpHaptics } from '@/shared/lib/haptics'
import {
  FpButton,
  FpCard,
  FpInput,
  FpMobilePicker,
  FpNumberInput
} from '@/design-system'
import { ArrowLeft, Plus, Trash2 } from 'lucide-vue-next'

const router = useRouter()

// Header form (Receipt metadata)
const storeName = ref(localStorage.getItem('lastUsedStoreName') || '')
const storeResults = ref<{ id: string, name: string }[]>([])
const purchaseDate = ref(new Date().toISOString().split('T')[0])
const isSearchingStores = ref(false)

// Receipt items
const items = ref<AddReceiptItemDTO[]>([])
const isAddingItem = ref(false)

// Form for current item being added
const currentProduct = ref<{ id: string, name: string } | null>(null)
const searchQuery = ref('')
const searchResults = ref<{ id: string, name: string, category: string }[]>([])
const itemPrice = ref(0)
const itemQuantity = ref(1)
const itemUnit = ref('шт')
const unitItems = ['г', 'кг', 'мл', 'л', 'шт', 'уп'].map(u => ({ id: u, name: u }))

let searchTimer: any

const loadStores = async (q: string) => {
    isSearchingStores.value = true
    try {
        storeResults.value = await priceStore.getStores(q)
    } finally {
        isSearchingStores.value = false
    }
}

watch(searchQuery, (val) => {
    clearTimeout(searchTimer)
    if (val.trim().length < 2) {
        searchResults.value = []
        return
    }
    searchTimer = setTimeout(async () => {
        const { items: data } = await CatalogService.searchProducts(val, {}, 1, 10)
        searchResults.value = data.map(p => ({ id: p.id, name: p.name, category: p.category }))
    }, 300)
})

const selectProduct = (p: { id: string, name: string }) => {
    currentProduct.value = p
    itemPrice.value = 0
    itemQuantity.value = 1
    searchResults.value = []
    searchQuery.value = ''
}

const clearCurrentProduct = () => {
    currentProduct.value = null
}

const appendItem = () => {
    if (!currentProduct.value || itemPrice.value <= 0 || itemQuantity.value <= 0) return

    items.value.push({
        product_id: currentProduct.value.id,
        product_name: currentProduct.value.name,
        price: itemPrice.value,
        quantity: itemQuantity.value,
        quantity_unit: itemUnit.value
    })
    
    currentProduct.value = null
    itemPrice.value = 0
    itemQuantity.value = 1
    isAddingItem.value = false
    FpHaptics.light()
}

const removeItem = (idx: number) => {
    items.value.splice(idx, 1)
}

const calculatedTotal = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const isSubmitting = ref(false)
const submitReceipt = async () => {
    if (!storeName.value || items.value.length === 0) return

    isSubmitting.value = true
    try {
        localStorage.setItem('lastUsedStoreName', storeName.value)
        
        // Prepare purchase date with time
        const d = new Date(purchaseDate.value)
        const now = new Date()
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())

        await ReceiptService.addReceipt({
            store_name: storeName.value,
            purchase_date: d.toISOString(),
            total_amount: calculatedTotal.value,
            items: items.value
        })
        FpHaptics.success()
        router.push('/receipts')
    } catch (e: any) {
        alert(e.message || 'Ошибка сохранения чека')
        console.error(e)
    } finally {
        isSubmitting.value = false
    }
}

onMounted(() => {
    loadStores('')
})
</script>

<template>
  <div class="add-receipt-view">
    <header class="ergo-header">
      <div class="header-inner">
        <button class="nav-btn" @click="router.back()">
          <ArrowLeft :size="24" />
        </button>
        <h1 class="header-title">Новый чек</h1>
        <div class="header-actions">
          <button class="action-btn-done" :disabled="!storeName || items.length === 0 || isSubmitting" @click="submitReceipt">
            {{ isSubmitting ? '...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </header>

    <div class="content">
      <!-- Метаданные чека -->
      <FpCard class="meta-card">
        <div class="form-grid">
            <FpMobilePicker
                v-model="storeName"
                label="Магазин"
                placeholder="Где купили?"
                title="Выбор магазина"
                :items="storeResults"
                allow-create
                @select="storeName = $event.name"
                @create="storeName = $event"
                @search="loadStores"
            />
            
            <div class="field-group">
                <label class="field-label">Дата покупки</label>
                <input type="date" v-model="purchaseDate" class="fp-date-input" />
            </div>
        </div>
      </FpCard>

      <!-- Список добавленных товаров -->
      <div v-if="items.length > 0" class="added-items">
        <h3 class="section-title">В чеке ({{ items.length }})</h3>
        <FpCard v-for="(item, idx) in items" :key="idx" class="item-card" padding="sm">
            <div class="item-info">
                <span class="item-name">{{ item.product_name }}</span>
                <span class="item-qty">{{ item.quantity }} {{ item.quantity_unit }} × {{ item.price }} ₽</span>
            </div>
            <div class="item-right">
                <span class="item-total">{{ Math.round(item.price * item.quantity) }} ₽</span>
                <button class="remove-btn" @click="removeItem(idx)"><Trash2 :size="16" /></button>
            </div>
        </FpCard>
        
        <div class="receipt-total">
            <span>Итого:</span>
            <span class="total-sum">{{ Math.round(calculatedTotal) }} ₽</span>
        </div>
      </div>

      <!-- Кнопка и форма добавления товара -->
      <div class="add-item-section">
        <FpButton v-if="!isAddingItem" variant="outline" width="full" @click="isAddingItem = true; searchQuery = ''">
            <Plus :size="20" class="mr-2" /> Добавить товар
        </FpButton>

        <FpCard v-else class="add-item-form">
            <div class="form-header">
                <h3>Новая позиция</h3>
                <button class="close-btn" @click="isAddingItem = false; clearCurrentProduct()">✕</button>
            </div>

            <!-- Поиск товара -->
            <div v-if="!currentProduct" class="search-product">
                <FpInput v-model="searchQuery" placeholder="Поиск товара..." />
                
                <div v-if="searchResults.length > 0" class="search-results">
                    <div v-for="res in searchResults" :key="res.id" class="search-result-item" @click="selectProduct(res)">
                        <span class="res-name">{{ res.name }}</span>
                        <span class="res-cat">{{ res.category }}</span>
                    </div>
                </div>
                <div v-else-if="searchQuery.length >= 2" class="search-empty">
                    Товар не найден. Сначала добавьте его в каталог или воспользуйтесь обычным добавлением цены.
                </div>
            </div>

            <!-- Ввод цены и количества -->
            <div v-else class="item-details-form">
                <div class="selected-product">
                    <span class="prod-name">{{ currentProduct.name }}</span>
                    <button class="change-btn" @click="clearCurrentProduct">Изменить</button>
                </div>

                <div class="split-row mt-3">
                    <div class="flex-field">
                        <FpNumberInput v-model="itemPrice" label="Цена (₽)" :min="0" :step="0.01" />
                    </div>
                    <div class="flex-field">
                        <FpNumberInput v-model="itemQuantity" label="Кол-во" :min="0" :step="1" stepper />
                    </div>
                    <div class="fixed-field">
                        <FpMobilePicker
                            v-model="itemUnit"
                            label="Ед."
                            :items="unitItems"
                            placeholder="г"
                            title="Единица"
                            allow-create
                            @create="itemUnit = $event"
                        />
                    </div>
                </div>

                <FpButton width="full" class="mt-4" :disabled="!itemPrice || !itemQuantity" @click="appendItem">
                    В чек
                </FpButton>
            </div>
        </FpCard>
      </div>

    </div>
  </div>
</template>

<style scoped lang="scss">
.add-receipt-view {
  padding: 0 var(--spacing-sm) 40px;
}

.ergo-header {
  padding: 12px 12px 0 12px;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: var(--text-h5);
  font-weight: 700;
  margin: 0;
  flex: 1;
}

.nav-btn {
  background: none;
  border: none;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;

  &:hover {
      background: var(--color-surface-hover);
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

.content {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fp-date-input {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
  font-family: inherit;
  transition: all 0.2s;
  
  &:focus {
      outline: none;
      border-color: var(--color-primary);
  }
}

.section-title {
    font-size: var(--text-h6);
    margin: 0 0 12px 4px;
    font-weight: 700;
}

.added-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.item-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.item-name {
    font-weight: 600;
    color: var(--color-text-primary);
}

.item-qty {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
}

.item-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.item-total {
    font-weight: 700;
    color: var(--color-primary);
}

.remove-btn {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    color: var(--color-error);
    border: none;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    cursor: pointer;

    &:hover {
        background: color-mix(in srgb, var(--color-error) 20%, transparent);
    }
}

.receipt-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    border-radius: 12px;
    font-size: 20px;
    font-weight: 800;

    .total-sum {
        color: var(--color-primary);
    }
}

.add-item-form {
    border: 2px dashed var(--color-primary);

    .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
            margin: 0;
            color: var(--color-primary);
            font-size: 16px;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 20px;
            color: var(--color-text-secondary);
            cursor: pointer;
        }
    }
}

.search-results {
    margin-top: 8px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
}

.search-result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: var(--color-surface-hover);
    }

    .res-name {
        font-weight: 600;
    }

    .res-cat {
        font-size: 12px;
        color: var(--color-text-secondary);
    }
}

.search-empty {
    margin-top: 12px;
    font-size: 13px;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 12px;
}

.selected-product {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);

    .prod-name {
        font-weight: 700;
        font-size: 16px;
    }

    .change-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-size: 13px;
        text-decoration: underline;
        cursor: pointer;
    }
}

.split-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.flex-field {
  flex: 1;
  min-width: 0;
}

.fixed-field {
  flex: 0 0 80px;
}

.mt-3 {
    margin-top: 12px;
}
.mt-4 {
    margin-top: 16px;
}
.mr-2 {
    margin-right: 8px;
}
</style>
