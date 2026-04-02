<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { shoppingListStore } from '../state/shoppingListStore'
import { catalogStore } from '@/modules/catalog/store/catalogStore'

import FpButton from '@/design-system/components/FpButton.vue'
import FpCard from '@/design-system/components/FpCard.vue'
import FpMobilePicker from '@/design-system/components/FpMobilePicker.vue'
import FpNumberInput from '@/design-system/components/FpNumberInput.vue'
import FpConfirmationModal from '@/design-system/components/FpConfirmationModal.vue'
import { FpSkeleton } from '@/design-system'
import { FpHaptics } from '@/shared/lib/haptics'

const newItemText = ref('')
const selectedProduct = ref<any>(null)
const newItemPrice = ref(0)
const newItemQuantity = ref(1)

const editingItemId = ref<string | null>(null)
const editPrice = ref(0)
const editQuantity = ref(1)

const uncheckedItems = computed(() => shoppingListStore.uncheckedItems.value)
const checkedItems = computed(() => shoppingListStore.checkedItems.value)
const totalExpenses = computed(() => shoppingListStore.totalExpenses.value)
const { isLoading } = shoppingListStore

const searchResults = computed(() => [...catalogStore.searchResults.value])

onMounted(() => {
    shoppingListStore.loadItems()
    // Load initial products/stores for suggestions
    catalogStore.searchProducts('')
})



const onProductSelect = (product: any) => {
    selectedProduct.value = product
    newItemText.value = product.name
}

const addItem = async () => {
    if (!newItemText.value.trim()) return

    try {
        await shoppingListStore.addItem(
            newItemText.value,
            selectedProduct.value?.id,
            {
                price: newItemPrice.value || undefined,
                quantity: newItemQuantity.value || undefined,
                unit: selectedProduct.value?.unit
            }
        )

        // Reset
        newItemText.value = ''
        selectedProduct.value = null
        newItemPrice.value = 0
        newItemQuantity.value = 1
        
        FpHaptics.medium()
    } catch (e: any) {
        console.error('Failed to add item:', e)
    }
}

const toggleItem = (item: any) => {
    if (!item.isChecked) {
        // Prepare to enter price when checking
        editingItemId.value = item.id
        editPrice.value = item.price ?? 0
        editQuantity.value = item.quantity ?? 1
        FpHaptics.light()
    } else {
        shoppingListStore.toggleItem(item.id, false)
        FpHaptics.light()
    }
}

const confirmPurchase = async () => {
    if (editingItemId.value) {
        await shoppingListStore.toggleItem(editingItemId.value, true, {
            price: editPrice.value || 0,
            quantity: editQuantity.value || 1
        })
        editingItemId.value = null
        FpHaptics.success()
    }
}

const showDeleteItemModal = ref(false)
const itemToDeleteId = ref<string | null>(null)

const removeItem = (id: string) => {
    itemToDeleteId.value = id
    showDeleteItemModal.value = true
}

const confirmRemoveItem = () => {
    if (itemToDeleteId.value) {
        shoppingListStore.removeItem(itemToDeleteId.value)
        itemToDeleteId.value = null
        FpHaptics.heavy()
    }
}

const showDeleteCheckedModal = ref(false)

const deleteChecked = () => {
    showDeleteCheckedModal.value = true
}

const confirmDeleteChecked = () => {
    shoppingListStore.deleteChecked()
    FpHaptics.heavy()
}

const formatPrice = (p: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(p)
}
</script>

<template>
    <div class="shopping-list-view">
        <div class="page-title-row">
            <h1 class="page-title">Список покупок</h1>
            <FpButton v-if="uncheckedItems.length > 0 || checkedItems.length > 0" variant="text" size="sm"
                class="danger-text" @click="deleteChecked">
                Очистить купленное
            </FpButton>
        </div>

        <div class="sticky-search-wrapper">
            <div class="add-form">
                <div class="row main-row">
                    <FpMobilePicker v-model="newItemText" label="Что купить?" :items="searchResults"
                        placeholder="Поиск товара..." title="Выбор товара" allow-create @select="onProductSelect"
                        @create="newItemText = $event" class="flex-grow" />
                </div>
                <div class="row details-row">
                    <div class="details-inputs">
                        <FpNumberInput v-model="newItemPrice" label="Цена (рек.)" :min="0" :step="0.01" />
                        <FpNumberInput v-model="newItemQuantity" label="Кол-во" :min="1" :step="1" stepper />
                    </div>
                    <FpButton @click="addItem" :disabled="!newItemText.trim()" variant="primary" class="add-btn">
                        Добавить
                    </FpButton>
                </div>
            </div>
        </div>

        <!-- Summary Bar -->
        <section v-if="uncheckedItems.length > 0 || checkedItems.length > 0" class="summary-bar">
            <FpCard class="summary-card" :class="{ 'has-estimate': uncheckedItems.length > 0 }">
                <div class="summary-main">
                    <div class="summary-info checked" v-if="checkedItems.length > 0">
                        <span class="label">Итого куплено:</span>
                        <span class="value">{{ formatPrice(totalExpenses) }}</span>
                    </div>
                    <div class="summary-info estimate" v-if="uncheckedItems.length > 0">
                        <span class="label">Примерный итог:</span>
                        <span class="value">~{{ formatPrice(shoppingListStore.estimatedTotal.value) }}</span>
                    </div>
                </div>
                <div class="summary-stats">
                    <span>{{ checkedItems.length }} из {{ uncheckedItems.length + checkedItems.length }} товаров
                        куплено</span>
                </div>
            </FpCard>
        </section>

        <section class="list-section">
            <div v-if="isLoading" class="loading-skeletons" style="display: flex; flex-direction: column; gap: 8px;">
                <div v-for="i in 4" :key="i" style="display: flex; align-items: center; padding: 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); gap: 12px;">
                    <FpSkeleton type="circle" width="24px" height="24px" borderRadius="6px" />
                    <FpSkeleton width="60%" height="20px" />
                    <FpSkeleton width="24px" height="24px" style="margin-left: auto;" />
                </div>
            </div>

            <div v-else-if="uncheckedItems.length === 0 && checkedItems.length === 0" class="empty-state">
                Ваш список пуст.
            </div>

            <div v-else class="list-container">
                <!-- Unchecked Items -->
                <TransitionGroup name="list" tag="div" class="items-group">
                    <div v-for="item in uncheckedItems" :key="item.id" class="item-wrapper">
                        <FpSwipeable @swipe-right="toggleItem(item)" @swipe-left="removeItem(item.id)">
                            <template #left-action>
                                <span>Купить</span>
                            </template>
                            <template #right-action>
                                <span>Удалить</span>
                            </template>
                            <div class="list-item fp-interactive" :class="{ editing: editingItemId === item.id }">
                                <label class="checkbox-label">
                                    <input type="checkbox" :checked="item.isChecked" @change="toggleItem(item)" />
                                    <span class="custom-checkbox"></span>
                                    <span class="item-text">{{ item.text }}</span>
                                </label>
                                <button class="delete-btn" @click="removeItem(item.id)">×</button>
                            </div>
                        </FpSwipeable>

                        <!-- Quick Price/Qty Edit when checking -->
                        <div v-if="editingItemId === item.id" class="edit-overlay">
                            <div class="edit-fields">
                                <div class="edit-inputs-row">
                                    <FpNumberInput v-model="editPrice" label="Цена" :min="0" :step="0.01" />
                                    <FpNumberInput v-model="editQuantity" label="Кол-во" :min="1" :step="1" stepper />
                                </div>
                                <div class="edit-actions-row">
                                    <FpButton size="sm" variant="secondary" @click="editingItemId = null">Отмена</FpButton>
                                    <FpButton size="sm" @click="confirmPurchase">Ок</FpButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </TransitionGroup>

                <!-- Checked Items -->
                <div v-if="checkedItems.length > 0" class="checked-group">
                    <div class="group-header">
                        <h3>Куплено ({{ checkedItems.length }})</h3>
                        <button class="clear-btn" @click="deleteChecked()">Очистить</button>
                    </div>
                    <TransitionGroup name="list" tag="div" class="checked-items-container" style="display: flex; flex-direction: column; gap: 8px;">
                        <div v-for="item in checkedItems" :key="item.id">
                            <FpSwipeable @swipe-right="toggleItem(item)" @swipe-left="removeItem(item.id)">
                                <template #left-action>
                                    <span>Вернуть</span>
                                </template>
                                <template #right-action>
                                    <span>Удалить</span>
                                </template>
                                <div class="list-item checked fp-interactive">
                                    <label class="checkbox-label">
                                        <input type="checkbox" :checked="item.isChecked" @change="toggleItem(item)" />
                                        <span class="custom-checkbox"></span>
                                        <div class="item-info">
                                        <span class="item-text">{{ item.text }}</span>
                                        <span class="item-subtext" v-if="item.price">
                                            {{ item.quantity }} x {{ formatPrice(item.price as number) }} = {{
                                                formatPrice((item.price as number) * (item.quantity as number || 1)) }}
                                        </span>
                                    </div>
                                </label>
                                <button class="delete-btn" @click="removeItem(item.id)">×</button>
                                </div>
                            </FpSwipeable>
                        </div>
                    </TransitionGroup>
                </div>
            </div>
        </section>

        <FpConfirmationModal v-model:visible="showDeleteItemModal" title="Удалить товар?"
            message="Этот товар будет удалён из списка покупок." confirm-text="Удалить" variant="danger"
            @confirm="confirmRemoveItem" />

        <FpConfirmationModal v-model:visible="showDeleteCheckedModal" title="Очистить купленное?"
            message="Все отмеченные товары будут удалены из списка." confirm-text="Очистить" variant="danger"
            @confirm="confirmDeleteChecked" />
    </div>
</template>

<style scoped lang="scss">
.shopping-list-view {
    padding: 0 var(--spacing-sm);
}

.page-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // padding: var(--spacing-sm) 0;

    .page-title {
        margin: 0;
        font-size: var(--text-h5);
        font-weight: 700;
    }
}

.ergo-header {
    background: var(--color-surface);
    position: sticky;
    top: 0;
    z-index: 100;
    // border-bottom: 1px solid var(--color-border);
    // margin: 0 calc(-1 * var(--spacing-sm)) var(--spacing-md) calc(-1 * var(--spacing-sm));
    padding: 12px;

}

.header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 600;
}

.nav-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &:active {
        background: var(--color-surface-hover);
    }
}

.add-section {
    margin-bottom: var(--spacing-md);
}

.add-form {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
    }

    .flex-grow {
        flex: 1;
    }

    .details-row {
        flex-direction: column;
        gap: 8px;
    }

    .details-inputs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        :deep(.fp-number-input) {
            flex: 1;
            min-width: 0;
        }
    }

    .add-btn {
        width: 100%;
    }
}

.input-row {
    display: flex;
    gap: 8px;

    .flex-grow {
        flex: 1;
    }
}

.summary-bar {
    margin-top: var(--spacing-md);
}

.summary-card {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-variant));
    color: var(--color-on-primary);
    padding: var(--spacing-md);

    .summary-main {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 8px;
    }

    .summary-info {
        display: flex;
        justify-content: space-between;
        align-items: baseline;

        .label {
            font-size: var(--text-caption);
            opacity: 0.9;
        }

        .value {
            font-size: var(--text-h5);
            font-weight: 800;
        }

        &.estimate {
            padding-top: 8px;
            border-top: 1px solid color-mix(in srgb, var(--color-on-primary) 20%, transparent);

            .value {
                color: color-mix(in srgb, var(--color-on-primary) 90%, transparent);
            }
        }
    }

    .summary-stats {
        font-size: var(--text-caption);
        opacity: 0.8;
    }
}

.list-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.item-wrapper {
    position: relative;
    margin-bottom: 8px;
}

.list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all 0.2s;

    &:hover {
        border-color: var(--color-primary);
    }

    &.editing {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 10%, transparent);
    }

    &.checked {
        opacity: 0.7;
        background: var(--color-background);

        .item-text {
            text-decoration: line-through;
            color: var(--color-text-secondary);
        }
    }
}

.edit-overlay {
    margin-top: 4px;
    padding: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-2);
    z-index: 10;

    .edit-fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .edit-inputs-row {
        display: flex;
        gap: 8px;

        :deep(.fp-number-input) {
            flex: 1;
            min-width: 0;
        }
    }

    .edit-actions-row {
        display: flex;
        gap: 8px;

        :deep(.fp-btn) {
            flex: 1;
        }
    }
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    flex: 1;

    input {
        display: none;
    }

    .custom-checkbox {
        width: 24px;
        height: 24px;
        border: 2px solid var(--color-primary);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &::after {
            content: '✓';
            color: white;
            opacity: 0;
            transition: 0.2s;
        }
    }

    input:checked+.custom-checkbox {
        background: var(--color-primary);

        &::after {
            opacity: 1;
        }
    }
}

.item-info {
    display: flex;
    flex-direction: column;
}

.item-subtext {
    font-size: var(--text-caption);
    color: var(--color-primary);
    font-weight: 600;
}

.delete-btn {
    background: none;
    border: none;
    color: var(--color-text-disabled);
    font-size: 20px;
    cursor: pointer;

    &:hover {
        color: var(--color-error);
    }
}

.checked-group {
    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        h3 {
            font-size: var(--text-caption);
            text-transform: uppercase;
            color: var(--color-text-secondary);
        }
    }
}

.clear-btn {
    background: none;
    border: none;
    color: var(--color-primary);
    font-size: var(--text-caption);
    cursor: pointer;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-secondary);
}

.loading {
    text-align: center;
    padding: 2rem;
}
</style>
