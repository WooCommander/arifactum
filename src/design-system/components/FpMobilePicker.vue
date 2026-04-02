<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'
import FpInput from './FpInput.vue'

interface Item {
    id: string | number
    name: string
    [key: string]: any
}

interface Props {
    modelValue: string
    items: Item[]
    label?: string
    placeholder?: string
    allowCreate?: boolean
    createLabel?: string
    title?: string
    variant?: 'default' | 'bordered'
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    items: () => [],
    allowCreate: false,
    createLabel: 'Добавить',
    placeholder: 'Поиск...',
    title: 'Выбор',
    variant: 'default'
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'select', item: Item): void
    (e: 'create', query: string): void
    (e: 'search', query: string): void
}>()

const isOverlayOpen = ref(false)
const searchQuery = ref('')

const filteredItems = computed(() => {
    const q = searchQuery.value.toLowerCase()
    if (!q) return props.items
    return props.items.filter(i => i.name.toLowerCase().includes(q))
})

const showCreateOption = computed(() => {
    return props.allowCreate &&
        searchQuery.value.length > 0 &&
        !props.items.find(i => i.name.toLowerCase() === searchQuery.value.toLowerCase())
})

const openPicker = () => {
    searchQuery.value = ''
    isOverlayOpen.value = true
    emit('search', '')
}

const closePicker = () => {
    isOverlayOpen.value = false
}

const handleSelect = (item: Item) => {
    emit('update:modelValue', item.name)
    emit('select', item)
    closePicker()
}

const handleCreate = () => {
    emit('create', searchQuery.value)
    closePicker()
}

watch(searchQuery, (q) => {
    emit('search', q)
})

// Global hotkeys or back-button prevention can be here
</script>

<template>
    <div class="fp-mobile-picker" :class="`fp-mobile-picker--${variant}`">
        <div class="picker-trigger" @click="openPicker">
            <div v-if="label" class="trigger-label" :class="{ 'has-value': modelValue || variant === 'bordered' }">{{
                label }}</div>
            <div class="trigger-value">{{ modelValue || (label && !modelValue ? '' : placeholder) }}</div>
            <div class="chevron">
                <ChevronDown :size="20" />
            </div>
        </div>

        <Teleport to="body">
            <Transition name="picker-fade">
                <div v-if="isOverlayOpen" class="picker-overlay">
                    <div class="picker-header">
                        <button class="close-btn" @click="closePicker">
                            <X :size="24" />
                        </button>
                        <h2 class="picker-title">{{ title }}</h2>
                        <div style="width: 24px"></div>
                    </div>

                    <div class="picker-search">
                        <FpInput v-model="searchQuery" :placeholder="placeholder" ref="searchInputRef" autofocus />
                    </div>

                    <div class="picker-content">
                        <div v-if="filteredItems.length === 0 && !showCreateOption" class="empty-results">
                            Ничего не найдено
                        </div>

                        <div v-for="item in filteredItems" :key="item.id" class="picker-item"
                            @click="handleSelect(item)">
                            {{ item.name }}
                        </div>

                        <div v-if="showCreateOption" class="picker-item create-btn" @click="handleCreate">
                            <span class="plus">+</span> {{ createLabel }} "{{ searchQuery }}"
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped lang="scss">
.fp-mobile-picker {
    width: 100%;
    //margin-bottom: var(--spacing-md);
}

.picker-trigger {
    position: relative;
    align-items: flex-end;
    background-color: var(--color-surface);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    // border-bottom: 2px solid var(--color-border);
    height: 56px;
    padding: 8px 16px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
        background-color: color-mix(in srgb, var(--color-primary) 4%, transparent);
        border-bottom-color: var(--color-primary);
    }
}

.trigger-label {
    position: absolute;
    left: 16px;
    top: 16px;
    font-size: var(--text-body-1);
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
    pointer-events: none;

    &.has-value {
        top: 4px;
        font-size: var(--text-caption);
        color: var(--color-primary);
    }
}

.trigger-value {
    font-size: var(--text-body-1);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 24px;
}

.chevron {
    position: absolute;
    right: 12px;
    bottom: 12px;
    color: var(--color-text-secondary);
}

.picker-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-background);
    z-index: 2000;
    display: flex;
    flex-direction: column;
}

.picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    ;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
}

.picker-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
}

.close-btn {
    background: none;
    border: none;
    padding: 4px;
    color: var(--color-text-primary);
    cursor: pointer;
}

.picker-search {
    padding: 16px;
    background: var(--color-surface);
}

.picker-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 40px;
}

.picker-item {
    padding: 16px;
    border-bottom: 1px solid var(--color-border);
    font-size: 1.125rem;
    color: var(--color-text-primary);
    transition: background-color 0.1s;

    &:active {
        background-color: var(--color-surface-hover);
    }

    &.create-btn {
        color: var(--color-primary);
        font-weight: 600;
        background-color: color-mix(in srgb, var(--color-primary) 2%, transparent);

        .plus {
            font-size: 1.5rem;
            margin-right: 8px;
        }
    }
}

.empty-results {
    padding: 40px;
    text-align: center;
    color: var(--color-text-secondary);
}

// Bordered variant — matches FpNumberInput visual style
.fp-mobile-picker--bordered {
    .picker-trigger {
        border: 1.5px solid var(--color-border);
        border-radius: 12px;
        border-bottom: 1.5px solid var(--color-border);
        height: 48px;
        padding: 4px 12px 4px 14px;
        flex-direction: column;
        justify-content: center;
        gap: 1px;
        transition: border-color 0.2s;

        &:active {
            border-color: var(--color-primary);
            background-color: transparent;
        }
    }

    .trigger-label {
        position: static;
        font-size: 11px;
        font-weight: 500;
        color: var(--color-text-secondary);
        letter-spacing: 0.01em;
    }

    .trigger-value {
        font-size: 15px;
        font-weight: 600;
        padding-right: 20px;
    }

    .chevron {
        position: absolute;
        right: 10px;
        bottom: 50%;
        transform: translateY(50%);
    }
}

// Transitions
.picker-fade-enter-active,
.picker-fade-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.picker-fade-enter-from,
.picker-fade-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>
