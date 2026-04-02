<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { receiptStore } from '../store/receiptStore'
import { FpButton, FpCard, FpSpinner } from '@/design-system'
import { FileText, Plus, ShoppingBag, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const { receipts, isLoading, loadReceipts, deleteReceipt } = receiptStore

onMounted(() => {
    loadReceipts()
})

const stats = computed(() => {
    const now = new Date()
    
    // Начало текущего месяца
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Начало текущей недели (понедельник)
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const startOfWeek = new Date(now.setDate(diff))
    startOfWeek.setHours(0,0,0,0)

    let totalMonth = 0
    let totalWeek = 0
    
    receipts.value.forEach(r => {
        const d = new Date(r.purchase_date)
        if (d >= startOfMonth) totalMonth += r.total_amount
        if (d >= startOfWeek) totalWeek += r.total_amount
    })

    return { totalMonth, totalWeek }
})

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    }).format(price)
}

const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот чек?')) {
        await deleteReceipt(id)
    }
}
</script>

<template>
  <div class="receipts-view">
    <header class="ergo-header">
      <div class="header-inner">
        <h1 class="header-title">Мои Чеки</h1>
      </div>
    </header>

    <div class="stats-row">
      <FpCard class="stat-card">
        <div class="stat-label">За неделю</div>
        <div class="stat-value">{{ formatPrice(stats.totalWeek) }}</div>
      </FpCard>
      <FpCard class="stat-card">
        <div class="stat-label">За месяц</div>
        <div class="stat-value">{{ formatPrice(stats.totalMonth) }}</div>
      </FpCard>
    </div>

    <div class="action-bar">
      <FpButton width="full" @click="router.push('/receipts/add')">
        <Plus :size="20" class="mr-2" /> Добавить чек
      </FpButton>
    </div>

    <div v-if="isLoading && receipts.length === 0" class="loading-state">
      <FpSpinner />
    </div>

    <div v-else-if="receipts.length === 0" class="empty-state">
      <FileText :size="48" class="empty-icon" />
      <p>У вас пока нет сохраненных чеков.</p>
    </div>

    <div v-else class="receipts-list">
      <FpCard v-for="receipt in receipts" :key="receipt.id" class="receipt-card" padding="sm">
        <div class="receipt-header">
            <div class="store-info">
                <ShoppingBag :size="18" class="store-icon" />
                <span class="store-name">{{ receipt.store_name }}</span>
            </div>
            <div class="receipt-actions">
                <span class="date">{{ new Date(receipt.purchase_date).toLocaleDateString('ru-RU') }}</span>
                <button class="delete-btn" @click.stop="handleDelete(receipt.id)">
                    <Trash2 :size="16" />
                </button>
            </div>
        </div>

        <div class="receipt-items" v-if="receipt.items && receipt.items.length > 0">
            <div v-for="item in receipt.items" :key="item.id" class="receipt-item">
                <div class="item-main">
                    <span class="item-name">{{ item.product_name }}</span>
                    <span class="item-qty">{{ item.quantity }} {{ item.quantity_unit }}</span>
                </div>
                <div class="item-price">{{ formatPrice(item.total_item_price) }}</div>
            </div>
        </div>

        <div class="receipt-footer">
            <span class="total-label">Итого:</span>
            <span class="total-value">{{ formatPrice(receipt.total_amount) }}</span>
        </div>
      </FpCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.receipts-view {
  padding: 0 var(--spacing-sm) 80px;
}

.ergo-header {
  padding: 12px 12px 0 12px;
}

.header-title {
  font-size: var(--text-h5);
  font-weight: 700;
  margin: 0;
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.stat-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-md);
  text-align: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);

  .stat-label {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 800;
    color: var(--color-primary);
  }
}

.action-bar {
  margin: var(--spacing-md) 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--color-text-secondary);
  text-align: center;

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }
}

.receipts-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.receipt-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;

  .store-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: var(--color-text-primary);

    .store-icon {
        color: var(--color-primary);
    }
  }

  .receipt-actions {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .date {
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
  }

  .delete-btn {
      background: none;
      border: none;
      color: var(--color-text-tertiary);
      cursor: pointer;
      padding: 4px;

      &:hover {
          color: var(--color-error);
      }
  }
}

.receipt-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
  }
}

.receipt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-body-2);

  .item-main {
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

  .item-price {
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.receipt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--color-border);
  padding-top: 12px;
  font-weight: 800;
  font-size: 18px;

  .total-value {
    color: var(--color-primary);
  }
}
</style>
